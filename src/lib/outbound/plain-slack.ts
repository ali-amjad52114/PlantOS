/**
 * Shared plain-text Slack send for scheduled digests/alerts.
 * Reuses intent ledger + outbound-slack-send. No images / no LLM.
 */

import { tasks } from "@trigger.dev/sdk";
import { isOutboundEnabled, requireOutboundConfig } from "@/lib/outbound/config";
import { createIntent, updateIntent } from "@/lib/outbound/intents";
import type { outboundSlackSend } from "@/trigger/outbound-slack";

export async function sendPlainSlackMessage(input: {
  title: string;
  body: string;
}): Promise<{ ok: true; intentId: string; runId: string } | { ok: false; error: string; skipped?: boolean }> {
  if (!isOutboundEnabled()) {
    return { ok: false, error: "outbound_disabled", skipped: true };
  }
  let cfg;
  try {
    cfg = requireOutboundConfig();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e), skipped: true };
  }

  const title = (input.title || "PlantOS").slice(0, 200);
  const body = (input.body || "").slice(0, 3500).trim();
  if (!body) return { ok: false, error: "empty_body" };

  const intent = createIntent({
    title,
    body,
    channelId: cfg.channelId,
    channelLabel: cfg.channelLabel,
  });
  updateIntent(intent.intentId, { status: "approved" });

  try {
    const handle = await tasks.trigger<typeof outboundSlackSend>(
      "outbound-slack-send",
      { intentId: intent.intentId },
      { idempotencyKey: `outbound-slack:${intent.intentId}` }
    );
    updateIntent(intent.intentId, { runId: handle.id });
    return { ok: true, intentId: intent.intentId, runId: handle.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    updateIntent(intent.intentId, { status: "failed", error: msg });
    return { ok: false, error: msg };
  }
}

export function flagOn(raw: string | undefined): boolean {
  const v = (raw || "").toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}
