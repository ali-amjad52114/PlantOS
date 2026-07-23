/**
 * Isolated Google outbound tasks — never imported by plant-agent.
 * Failures here must not affect Slack outbound or plant chat.
 */

import { task, logger, metadata } from "@trigger.dev/sdk";
import {
  requireGoogleOutboundConfig,
  type GoogleConnector,
} from "@/lib/outbound/config";
import { getIntent, reserveIntent, updateIntent } from "@/lib/outbound/intents";
import { loadIntentPack } from "@/lib/outbound/pack-store";
import {
  createGoogleDocFromPack,
  createGoogleSheetFromPack,
  createGoogleSlidesFromPack,
  listGoogleAccounts,
  sendGmailPack,
} from "@/lib/outbound/pipedream-google";

async function runGoogleConnector(
  connector: GoogleConnector,
  intentId: string
): Promise<{ ok: boolean; error?: string; url?: string }> {
  metadata.set("outbound", { phase: "start", connector, intentId });

  const intent = getIntent(intentId);
  if (!intent) return { ok: false, error: "intent_not_found" };
  if (intent.status === "succeeded") {
    metadata.set("outbound", { phase: "already_succeeded", intentId });
    return { ok: true, url: intent.receipt?.url };
  }
  if (intent.status === "cancelled") return { ok: false, error: "cancelled" };

  let cfg;
  try {
    cfg = requireGoogleOutboundConfig(connector);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    updateIntent(intentId, { status: "failed", error: msg });
    metadata.set("outbound", { phase: "config_error", error: msg });
    return { ok: false, error: msg };
  }

  const accounts = await listGoogleAccounts(connector);
  const account = accounts[0];
  if (!account) {
    const msg = `No ${connector} account connected. Use Connect on the Share bar first.`;
    updateIntent(intentId, { status: "failed", error: msg });
    metadata.set("outbound", { phase: "no_account", error: msg });
    return { ok: false, error: msg };
  }

  const reserved = reserveIntent(intentId, account.id);
  if (!reserved || reserved.status === "succeeded") {
    return { ok: true, url: reserved?.receipt?.url };
  }

  const pack = loadIntentPack(intentId);
  if (!pack || pack.charts.length === 0) {
    const msg = "Outbound pack missing — capture charts and retry.";
    updateIntent(intentId, { status: "failed", error: msg });
    metadata.set("outbound", { phase: "failed", error: msg });
    return { ok: false, error: msg };
  }

  metadata.set("outbound", {
    phase: "sending",
    connector,
    intentId,
    chartCount: pack.charts.length,
  });

  try {
    if (connector === "sheets") {
      const res = await createGoogleSheetFromPack({ accountId: account.id, pack });
      if (!res.ok) throw new Error(res.error);
      updateIntent(intentId, {
        status: "succeeded",
        accountId: account.id,
        receipt: {
          rawSummary: "google sheet created",
          url: res.url,
          spreadsheetId: res.spreadsheetId,
        },
        error: undefined,
      });
      metadata.set("outbound", { phase: "succeeded", url: res.url, connector });
      return { ok: true, url: res.url };
    }

    if (connector === "docs") {
      const res = await createGoogleDocFromPack({ accountId: account.id, pack });
      if (!res.ok) throw new Error(res.error);
      updateIntent(intentId, {
        status: "succeeded",
        accountId: account.id,
        receipt: {
          rawSummary: "google doc created",
          url: res.url,
          documentId: res.documentId,
        },
        error: undefined,
      });
      metadata.set("outbound", { phase: "succeeded", url: res.url, connector });
      return { ok: true, url: res.url };
    }

    if (connector === "slides") {
      const res = await createGoogleSlidesFromPack({ accountId: account.id, pack });
      if (!res.ok) throw new Error(res.error);
      updateIntent(intentId, {
        status: "succeeded",
        accountId: account.id,
        receipt: {
          rawSummary: "google slides created",
          url: res.url,
          presentationId: res.presentationId,
        },
        error: undefined,
      });
      metadata.set("outbound", { phase: "succeeded", url: res.url, connector });
      return { ok: true, url: res.url };
    }

    // gmail
    const res = await sendGmailPack({
      accountId: account.id,
      pack,
      intentId,
    });
    if (!res.ok) throw new Error(res.error);
    updateIntent(intentId, {
      status: "succeeded",
      accountId: account.id,
      receipt: {
        rawSummary: `gmail sent to ${cfg.gmailTo}`,
        url: undefined,
      },
      error: undefined,
    });
    metadata.set("outbound", { phase: "succeeded", connector: "gmail", to: cfg.gmailTo });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const uncertain = /timeout|ECONNRESET|network|503|502/i.test(msg);
    updateIntent(intentId, { status: uncertain ? "uncertain" : "failed", error: msg });
    metadata.set("outbound", { phase: uncertain ? "uncertain" : "failed", error: msg });
    logger.warn("outbound google failed", { connector, error: msg });
    if (!uncertain) throw e;
    return { ok: false, error: msg };
  }
}

export const outboundSheetsSend = task({
  id: "outbound-sheets-send",
  maxDuration: 180,
  retry: { maxAttempts: 2, factor: 2, minTimeoutInMs: 1000, maxTimeoutInMs: 10000 },
  run: async (payload: { intentId: string }) => runGoogleConnector("sheets", payload.intentId),
});

export const outboundDocsSend = task({
  id: "outbound-docs-send",
  maxDuration: 180,
  retry: { maxAttempts: 2, factor: 2, minTimeoutInMs: 1000, maxTimeoutInMs: 10000 },
  run: async (payload: { intentId: string }) => runGoogleConnector("docs", payload.intentId),
});

export const outboundGmailSend = task({
  id: "outbound-gmail-send",
  maxDuration: 180,
  retry: { maxAttempts: 2, factor: 2, minTimeoutInMs: 1000, maxTimeoutInMs: 10000 },
  run: async (payload: { intentId: string }) => runGoogleConnector("gmail", payload.intentId),
});

export const outboundSlidesSend = task({
  id: "outbound-slides-send",
  maxDuration: 180,
  retry: { maxAttempts: 2, factor: 2, minTimeoutInMs: 1000, maxTimeoutInMs: 10000 },
  run: async (payload: { intentId: string }) => runGoogleConnector("slides", payload.intentId),
});
