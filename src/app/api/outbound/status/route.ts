import { NextResponse } from "next/server";
import {
  isGoogleConnectorEnabled,
  isOutboundEnabled,
  outboundPublicConfig,
  requireOutboundConfig,
  type GoogleConnector,
} from "@/lib/outbound/config";
import { createConnectLink, disconnectAccount, listSlackAccounts } from "@/lib/outbound/pipedream";
import { listGoogleAccounts } from "@/lib/outbound/pipedream-google";

export const runtime = "nodejs";

const GOOGLE_APPS: Record<GoogleConnector, string> = {
  gmail: "gmail",
  sheets: "google_sheets",
  docs: "google_docs",
  slides: "google_slides",
};

/** Public outbound status — fail-soft when disabled. Slack listing unchanged. */
export async function GET() {
  try {
    const pub = outboundPublicConfig();
    if (!pub.enabled) {
      return NextResponse.json({
        enabled: false,
        connected: false,
        accounts: [],
        channelLabel: pub.channelLabel,
        google: pub.google,
      });
    }
    requireOutboundConfig();
    const accounts = await listSlackAccounts();

    const googleConnected: Partial<Record<GoogleConnector, boolean>> = {};
    if (pub.google.enabled) {
      for (const c of ["gmail", "sheets", "docs", "slides"] as GoogleConnector[]) {
        if (!isGoogleConnectorEnabled(c)) {
          googleConnected[c] = false;
          continue;
        }
        try {
          const ga = await listGoogleAccounts(c);
          googleConnected[c] = ga.length > 0;
        } catch {
          googleConnected[c] = false;
        }
      }
    }

    return NextResponse.json({
      enabled: true,
      connected: accounts.length > 0,
      accounts,
      channelLabel: pub.channelLabel,
      channelId: pub.channelId,
      google: { ...pub.google, connected: googleConnected },
      externalUserId: process.env.PLANTOS_PD_EXTERNAL_USER_ID || "plantos:demo:operator",
    });
  } catch (e) {
    return NextResponse.json(
      {
        enabled: isOutboundEnabled(),
        connected: false,
        accounts: [],
        error: e instanceof Error ? e.message : String(e),
        google: outboundPublicConfig().google,
        channelLabel: outboundPublicConfig().channelLabel,
      },
      { status: 200 }
    );
  }
}

/**
 * Mint Connect Link — Slack by default; Google when body.app is allowlisted.
 * external user id is always server-derived.
 */
export async function POST(request: Request) {
  try {
    if (!isOutboundEnabled()) {
      return NextResponse.json({ error: "Outbound disabled" }, { status: 503 });
    }
    const body = (await request.json().catch(() => ({}))) as {
      action?: string;
      accountId?: string;
      app?: string;
      connector?: GoogleConnector;
    };
    if (body.action === "disconnect" && body.accountId) {
      await disconnectAccount(body.accountId);
      return NextResponse.json({ ok: true });
    }

    let appSlug = "slack";
    if (body.connector && isGoogleConnectorEnabled(body.connector)) {
      appSlug = GOOGLE_APPS[body.connector];
    } else if (body.app === "slack" || !body.app) {
      appSlug = "slack";
    } else if (
      body.app &&
      ["gmail", "google_sheets", "google_docs", "google_slides"].includes(body.app)
    ) {
      // Only allow Google app slugs when Google master is on
      const map: Record<string, GoogleConnector> = {
        gmail: "gmail",
        google_sheets: "sheets",
        google_docs: "docs",
        google_slides: "slides",
      };
      const c = map[body.app];
      if (!c || !isGoogleConnectorEnabled(c)) {
        return NextResponse.json({ error: "Google connector disabled" }, { status: 403 });
      }
      appSlug = body.app;
    } else {
      return NextResponse.json({ error: "Unsupported app" }, { status: 400 });
    }

    const link = await createConnectLink(appSlug);
    return NextResponse.json({
      connectLinkUrl: link.connectLinkUrl,
      expiresAt: link.expiresAt,
      app: appSlug,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
