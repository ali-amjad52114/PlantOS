import { NextResponse } from "next/server";
import { isOutboundEnabled, outboundPublicConfig, requireOutboundConfig } from "@/lib/outbound/config";
import { createConnectLink, disconnectAccount, listSlackAccounts } from "@/lib/outbound/pipedream";

export const runtime = "nodejs";

/** Public outbound status — fail-soft when disabled. */
export async function GET() {
  try {
    const pub = outboundPublicConfig();
    if (!pub.enabled) {
      return NextResponse.json({
        enabled: false,
        connected: false,
        accounts: [],
        channelLabel: pub.channelLabel,
        stubs: pub.stubs,
      });
    }
    requireOutboundConfig();
    const accounts = await listSlackAccounts();
    return NextResponse.json({
      enabled: true,
      connected: accounts.length > 0,
      accounts,
      channelLabel: pub.channelLabel,
      channelId: pub.channelId,
      stubs: pub.stubs,
      externalUserId: process.env.PLANTOS_PD_EXTERNAL_USER_ID || "plantos:demo:operator",
    });
  } catch (e) {
    return NextResponse.json(
      {
        enabled: isOutboundEnabled(),
        connected: false,
        accounts: [],
        error: e instanceof Error ? e.message : String(e),
        stubs: outboundPublicConfig().stubs,
        channelLabel: outboundPublicConfig().channelLabel,
      },
      { status: 200 }
    );
  }
}

/** Mint Connect Link for Slack only — external user id is server-derived. */
export async function POST(request: Request) {
  try {
    if (!isOutboundEnabled()) {
      return NextResponse.json({ error: "Outbound disabled" }, { status: 503 });
    }
    const body = (await request.json().catch(() => ({}))) as { action?: string; accountId?: string };
    if (body.action === "disconnect" && body.accountId) {
      await disconnectAccount(body.accountId);
      return NextResponse.json({ ok: true });
    }
    const link = await createConnectLink("slack");
    return NextResponse.json({
      connectLinkUrl: link.connectLinkUrl,
      expiresAt: link.expiresAt,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
