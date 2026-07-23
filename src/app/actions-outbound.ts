"use server";

import { auth, tasks } from "@trigger.dev/sdk";
import { isOutboundEnabled, requireOutboundConfig } from "@/lib/outbound/config";
import { createIntent, getIntent, updateIntent } from "@/lib/outbound/intents";
import { saveIntentImages } from "@/lib/outbound/images";
import type { outboundSlackSend, outboundSlackUndo } from "@/trigger/outbound-slack";
import type { outboundEnvProbe } from "@/trigger/outbound-env-probe";

async function mintRunToken(runId: string) {
  const publicAccessToken = await auth.createPublicToken({
    scopes: { read: { runs: [runId] } },
    expirationTime: "1h",
  });
  return { runId, publicAccessToken };
}

export async function getOutboundUiConfig() {
  try {
    if (!isOutboundEnabled()) {
      return { enabled: false as const };
    }
    const cfg = requireOutboundConfig();
    return {
      enabled: true as const,
      channelLabel: cfg.channelLabel,
      channelId: cfg.channelId,
    };
  } catch {
    return { enabled: false as const };
  }
}

/** Approve + trigger Slack send. Never accepts Pipedream action ids from the client. */
export async function startOutboundSlackSend(input: {
  title: string;
  body: string;
  intentId?: string;
  /** Optional chart PNGs (base64, no data-URL prefix). Max 4. */
  images?: Array<{
    filename: string;
    base64: string;
    caption?: { title?: string; line1: string; line2: string };
  }>;
}) {
  if (!isOutboundEnabled()) {
    return { ok: false as const, error: "Outbound is disabled" };
  }
  let cfg;
  try {
    cfg = requireOutboundConfig();
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
  }

  const title = (input.title || "PlantOS update").slice(0, 200);
  const body = (input.body || "").slice(0, 3500);
  if (!body.trim()) {
    return { ok: false as const, error: "Message body is empty" };
  }

  let intent = input.intentId ? getIntent(input.intentId) : null;
  if (intent && (intent.status === "succeeded" || intent.status === "reverted" || intent.status === "executing")) {
    // Never reuse a finished/in-flight intent — always start a fresh send.
    intent = null;
  }
  if (!intent) {
    intent = createIntent({
      title,
      body,
      channelId: cfg.channelId,
      channelLabel: cfg.channelLabel,
    });
  }

  const images = (input.images || [])
    .filter((img) => img?.base64 && img.base64.length > 80)
    .slice(0, 4)
    .map((img, i) => ({
      filename: (img.filename || `plantos-chart-${i + 1}.png`).replace(/[^a-zA-Z0-9._-]/g, "_"),
      base64: img.base64,
      contentType: "image/png" as const,
      caption: {
        title: (img.caption?.title || `Chart ${i + 1}`).slice(0, 80),
        line1: (img.caption?.line1 || `Chart ${i + 1} from PlantOS.`).slice(0, 180),
        line2: (img.caption?.line2 || "See the chart below for the latest trend.").slice(0, 180),
      },
    }));

  let imageCount = 0;
  if (images.length > 0) {
    try {
      imageCount = saveIntentImages(intent.intentId, images).length;
    } catch (e) {
      // Text-only fallback — never block send on capture persistence
      imageCount = 0;
      console.warn(
        "[outbound] failed to persist chart images",
        e instanceof Error ? e.message : e
      );
    }
  }

  updateIntent(intent.intentId, {
    status: "approved",
    title,
    body,
    channelId: cfg.channelId,
    channelLabel: cfg.channelLabel,
    imageCount,
  });

  try {
    const handle = await tasks.trigger<typeof outboundSlackSend>(
      "outbound-slack-send",
      { intentId: intent.intentId },
      { idempotencyKey: `outbound-slack:${intent.intentId}` }
    );
    updateIntent(intent.intentId, { runId: handle.id });
    const token = await mintRunToken(handle.id);
    return {
      ok: true as const,
      intentId: intent.intentId,
      imageCount,
      ...token,
      channelLabel: cfg.channelLabel,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    updateIntent(intent.intentId, { status: "failed", error: msg });
    return { ok: false as const, error: msg, intentId: intent.intentId };
  }
}

export async function cancelOutboundIntent(intentId: string) {
  const intent = getIntent(intentId);
  if (!intent) return { ok: false as const, error: "not_found" };
  if (intent.status === "executing" || intent.status === "succeeded") {
    return { ok: false as const, error: "too_late" };
  }
  updateIntent(intentId, { status: "cancelled" });
  return { ok: true as const };
}

export async function undoOutboundSlack(intentId: string) {
  if (!isOutboundEnabled()) {
    return { ok: false as const, error: "Outbound is disabled" };
  }
  const intent = getIntent(intentId);
  if (!intent?.receipt?.messageTs) {
    return { ok: false as const, error: "Nothing to undo (no message receipt)" };
  }
  try {
    const handle = await tasks.trigger<typeof outboundSlackUndo>(
      "outbound-slack-undo",
      { intentId },
      { idempotencyKey: `outbound-slack-undo:${intentId}` }
    );
    const token = await mintRunToken(handle.id);
    return { ok: true as const, intentId, ...token };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function readOutboundIntent(intentId: string) {
  const intent = getIntent(intentId);
  if (!intent) return { ok: false as const, error: "not_found" };
  return {
    ok: true as const,
    intent: {
      intentId: intent.intentId,
      status: intent.status,
      channelLabel: intent.channelLabel,
      error: intent.error,
      receipt: intent.receipt,
      title: intent.title,
      imageCount: intent.imageCount,
    },
  };
}

/** Confirm Trigger.dev worker has outbound env keys (no secret values returned). */
export async function probeOutboundTriggerEnv() {
  try {
    const handle = await tasks.trigger<typeof outboundEnvProbe>("outbound-env-probe", undefined);
    const token = await mintRunToken(handle.id);
    return { ok: true as const, ...token };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
  }
}
