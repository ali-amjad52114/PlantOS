"use server";

/**
 * Google outbound server actions — isolated from Slack actions.
 * Never imported by plant-agent.
 */

import { auth, tasks } from "@trigger.dev/sdk";
import {
  isGoogleConnectorEnabled,
  requireGoogleOutboundConfig,
  type GoogleConnector,
} from "@/lib/outbound/config";
import { createIntent, getIntent, updateIntent } from "@/lib/outbound/intents";
import { saveIntentImages } from "@/lib/outbound/images";
import { saveIntentPack } from "@/lib/outbound/pack-store";
import { attachFilenamesToPack, type OutboundPack } from "@/lib/outbound/pack";
import type {
  outboundDocsSend,
  outboundGmailSend,
  outboundSheetsSend,
  outboundSlidesSend,
} from "@/trigger/outbound-google";

async function mintRunToken(runId: string) {
  const publicAccessToken = await auth.createPublicToken({
    scopes: { read: { runs: [runId] } },
    expirationTime: "1h",
  });
  return { runId, publicAccessToken };
}

/** Approve + trigger a Google connector send. Destinations come from server env only. */
export async function startOutboundGoogleSend(input: {
  connector: GoogleConnector;
  title: string;
  body: string;
  pack: OutboundPack;
  images?: Array<{ filename: string; base64: string }>;
}) {
  const connector = input.connector;
  if (!isGoogleConnectorEnabled(connector)) {
    return { ok: false as const, error: `Google ${connector} outbound is disabled` };
  }

  let cfg;
  try {
    cfg = requireGoogleOutboundConfig(connector);
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
  }

  const title = (input.title || input.pack.title || "PlantOS Google share").slice(0, 200);
  const body = (input.body || "").slice(0, 8000);
  const pack: OutboundPack = {
    ...input.pack,
    title,
    charts: (input.pack.charts || []).slice(0, 4),
  };
  if (!pack.charts.length) {
    return { ok: false as const, error: "Pack has no charts — pin charts first" };
  }

  const destinationLabel =
    connector === "gmail"
      ? cfg.gmailTo
      : connector === "sheets"
        ? "Google Sheets"
        : connector === "docs"
          ? "Google Docs"
          : "Google Slides";

  const intent = createIntent({
    title,
    body,
    channelId: cfg.driveFolderId || cfg.gmailTo || connector,
    channelLabel: destinationLabel,
    connector,
  });

  const images = (input.images || [])
    .filter((img) => img?.base64 && img.base64.length > 80)
    .slice(0, 4)
    .map((img, i) => ({
      filename: (img.filename || `plantos-chart-${i + 1}.png`).replace(/[^a-zA-Z0-9._-]/g, "_"),
      base64: img.base64,
      contentType: "image/png" as const,
    }));

  let imageCount = 0;
  try {
    if (images.length) {
      const stored = saveIntentImages(intent.intentId, images);
      imageCount = stored.length;
      const withFiles = attachFilenamesToPack(
        pack,
        stored.map((s) => s.filename)
      );
      saveIntentPack(intent.intentId, withFiles);
    } else {
      saveIntentPack(intent.intentId, pack);
    }
  } catch (e) {
    updateIntent(intent.intentId, {
      status: "failed",
      error: e instanceof Error ? e.message : String(e),
    });
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : String(e),
      intentId: intent.intentId,
    };
  }

  updateIntent(intent.intentId, {
    status: "approved",
    imageCount,
  });

  try {
    const handle =
      connector === "sheets"
        ? await tasks.trigger<typeof outboundSheetsSend>(
            "outbound-sheets-send",
            { intentId: intent.intentId },
            { idempotencyKey: `outbound-sheets:${intent.intentId}` }
          )
        : connector === "docs"
          ? await tasks.trigger<typeof outboundDocsSend>(
              "outbound-docs-send",
              { intentId: intent.intentId },
              { idempotencyKey: `outbound-docs:${intent.intentId}` }
            )
          : connector === "gmail"
            ? await tasks.trigger<typeof outboundGmailSend>(
                "outbound-gmail-send",
                { intentId: intent.intentId },
                { idempotencyKey: `outbound-gmail:${intent.intentId}` }
              )
            : await tasks.trigger<typeof outboundSlidesSend>(
                "outbound-slides-send",
                { intentId: intent.intentId },
                { idempotencyKey: `outbound-slides:${intent.intentId}` }
              );
    updateIntent(intent.intentId, { runId: handle.id });
    const token = await mintRunToken(handle.id);
    return {
      ok: true as const,
      intentId: intent.intentId,
      connector,
      imageCount,
      destinationLabel,
      ...token,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    updateIntent(intent.intentId, { status: "failed", error: msg });
    return { ok: false as const, error: msg, intentId: intent.intentId };
  }
}

export async function readOutboundGoogleReceipt(intentId: string) {
  const intent = getIntent(intentId);
  if (!intent) return { ok: false as const, error: "not_found" };
  return {
    ok: true as const,
    connector: intent.connector,
    status: intent.status,
    error: intent.error,
    receipt: intent.receipt,
  };
}
