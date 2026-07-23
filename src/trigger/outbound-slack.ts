import { task, logger, metadata } from "@trigger.dev/sdk";
import { requireOutboundConfig } from "@/lib/outbound/config";
import { getIntent, reserveIntent, updateIntent } from "@/lib/outbound/intents";
import { loadIntentImages } from "@/lib/outbound/images";
import {
  listSlackAccounts,
  runSlackDeleteMessage,
  runSlackSendMessage,
  uploadSlackImages,
} from "@/lib/outbound/pipedream";
import { formatCaptionComment } from "@/lib/outbound/caption";

/**
 * Isolated outbound Slack task — never imported by plant-agent.
 * Retries are enabled for the task, but we no-op after a recorded success.
 */
export const outboundSlackSend = task({
  id: "outbound-slack-send",
  maxDuration: 180,
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
  },
  run: async (payload: { intentId: string }) => {
    metadata.set("outbound", { phase: "start", intentId: payload.intentId });

    const intent = getIntent(payload.intentId);
    if (!intent) {
      metadata.set("outbound", { phase: "missing_intent", intentId: payload.intentId });
      return { ok: false as const, error: "intent_not_found" };
    }

    if (intent.status === "succeeded") {
      metadata.set("outbound", { phase: "already_succeeded", intentId: payload.intentId });
      return { ok: true as const, skipped: true as const, receipt: intent.receipt };
    }
    if (intent.status === "cancelled") {
      return { ok: false as const, error: "cancelled" };
    }

    let cfg;
    try {
      cfg = requireOutboundConfig();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      updateIntent(payload.intentId, { status: "failed", error: msg });
      metadata.set("outbound", { phase: "config_error", error: msg });
      return { ok: false as const, error: msg };
    }

    const accounts = await listSlackAccounts();
    const account = accounts[0];
    if (!account) {
      const msg = "No Slack account connected. Use Connect Slack first.";
      updateIntent(payload.intentId, { status: "failed", error: msg });
      metadata.set("outbound", { phase: "no_account", error: msg });
      return { ok: false as const, error: msg };
    }

    const reserved = reserveIntent(payload.intentId, account.id);
    if (!reserved || reserved.status === "succeeded") {
      return { ok: true as const, skipped: true as const, receipt: reserved?.receipt };
    }

    const text = `*${intent.title}*\n${intent.body}`.trim();
    const images = loadIntentImages(payload.intentId);

    // Prefer one Slack file per chart, each with a 2-line caption.
    // Fall back to text-only message if no images or upload fails.
    if (images.length > 0) {
      metadata.set("outbound", {
        phase: "uploading",
        intentId: payload.intentId,
        channel: intent.channelLabel,
        imageCount: images.length,
      });

      // Short opener so the channel has context before the charts land.
      const opener = await runSlackSendMessage({
        accountId: account.id,
        channel: intent.channelId,
        text: `*${intent.title}*\n${images.length} chart${images.length === 1 ? "" : "s"} from PlantOS`,
      });

      const upload = await uploadSlackImages({
        accountId: account.id,
        channel: intent.channelId,
        images: images.map((img) => ({
          filename: img.filename,
          buffer: img.buffer,
          title: img.caption.title,
          comment: formatCaptionComment(img.caption),
        })),
      });

      if (upload.ok) {
        const receipt = {
          messageTs: opener.ok ? opener.messageTs : upload.messageTs,
          channel: intent.channelId,
          rawSummary: `slack files uploaded (${upload.fileIds.length})`,
          fileIds: upload.fileIds,
        };
        updateIntent(payload.intentId, {
          status: "succeeded",
          accountId: account.id,
          receipt,
          error: undefined,
        });
        metadata.set("outbound", {
          phase: "succeeded",
          intentId: payload.intentId,
          fileIds: upload.fileIds,
          channel: cfg.channelLabel,
        });
        return { ok: true as const, receipt, via: "files" as const };
      }

      logger.warn("outbound slack image upload failed; falling back to text", {
        error: upload.error,
        uncertain: upload.uncertain,
      });
      metadata.set("outbound", {
        phase: "upload_fallback",
        error: upload.error,
        imageCount: images.length,
      });
      // If upload looked uncertain, do not also post text (risk of duplicate later)
      if (upload.uncertain) {
        updateIntent(payload.intentId, { status: "uncertain", error: upload.error });
        return { ok: false as const, error: upload.error, uncertain: true as const };
      }
    }

    metadata.set("outbound", {
      phase: "sending",
      intentId: payload.intentId,
      channel: intent.channelLabel,
    });

    const result = await runSlackSendMessage({
      accountId: account.id,
      channel: intent.channelId,
      text,
    });

    if (!result.ok) {
      const status = result.uncertain ? "uncertain" : "failed";
      updateIntent(payload.intentId, { status, error: result.error });
      metadata.set("outbound", { phase: status, error: result.error });
      logger.warn("outbound slack send failed", { error: result.error, uncertain: result.uncertain });
      if (result.uncertain) {
        return { ok: false as const, error: result.error, uncertain: true as const };
      }
      throw new Error(result.error);
    }

    const receipt = {
      messageTs: result.messageTs,
      channel: result.channel || intent.channelId,
      rawSummary: images.length > 0 ? "slack text sent (image upload failed)" : "slack message sent",
    };
    updateIntent(payload.intentId, {
      status: "succeeded",
      accountId: account.id,
      receipt,
      error: undefined,
    });
    metadata.set("outbound", {
      phase: "succeeded",
      intentId: payload.intentId,
      messageTs: receipt.messageTs ?? null,
      channel: cfg.channelLabel,
    });
    return { ok: true as const, receipt, via: "text" as const };
  },
});

export const outboundSlackUndo = task({
  id: "outbound-slack-undo",
  maxDuration: 60,
  retry: { maxAttempts: 1 },
  run: async (payload: { intentId: string }) => {
    const intent = getIntent(payload.intentId);
    if (!intent?.accountId) {
      return { ok: false as const, error: "nothing_to_undo" };
    }
    if (intent.status === "reverted") {
      return { ok: true as const, skipped: true as const };
    }

    // File-only shares may not have messageTs — undo is best-effort for text receipts.
    if (!intent.receipt?.messageTs) {
      updateIntent(payload.intentId, {
        error: "Undo unavailable for file-only shares (no message ts)",
      });
      return { ok: false as const, error: "no_message_ts" };
    }

    metadata.set("outbound", { phase: "undoing", intentId: payload.intentId });
    const del = await runSlackDeleteMessage({
      accountId: intent.accountId,
      channel: intent.receipt.channel || intent.channelId,
      ts: intent.receipt.messageTs,
    });
    if (!del.ok) {
      updateIntent(payload.intentId, { error: del.error });
      metadata.set("outbound", { phase: "undo_failed", error: del.error });
      return { ok: false as const, error: del.error };
    }
    updateIntent(payload.intentId, { status: "reverted", error: undefined });
    metadata.set("outbound", { phase: "reverted", intentId: payload.intentId });
    return { ok: true as const };
  },
});
