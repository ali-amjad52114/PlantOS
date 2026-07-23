import { schedules, task, logger, metadata } from "@trigger.dev/sdk";
import { engineerSnapshot, financeSnapshot, operationsSnapshot } from "../lib/plant-services";
import { flagOn, sendPlainSlackMessage } from "../lib/outbound/plain-slack";

async function buildAndSendDigest(opts: { force?: boolean; reason: string }) {
  if (!opts.force && !flagOn(process.env.PLANT_DIGEST_ENABLED)) {
    metadata.set("status", "disabled").set("reason", "PLANT_DIGEST_ENABLED off");
    logger.info("plant-shift-digest skipped — flag off", { reason: opts.reason });
    return { ok: true as const, skipped: true as const, reason: "flag_off" };
  }

  metadata.set("status", "building").set("reason", opts.reason);
  const [eng, ops, fin] = await Promise.all([
    engineerSnapshot(),
    operationsSnapshot(),
    financeSnapshot(),
  ]);

  const fmt = (n: unknown, d = 1) =>
    n == null || !Number.isFinite(Number(n)) ? "—" : Number(n).toFixed(d);

  const outside = (eng.attention || []).filter((a: { outside?: boolean }) => a.outside).length;
  const body = [
    "PlantOS shift digest (demo HAI feed)",
    opts.force ? "(Triggered from UI — live demo)" : "(Scheduled digest)",
    "",
    `Engineer: gen ${fmt(eng.productionMW)} MW · turbine ${fmt(eng.turbineSpeed)} · boiler ${fmt(eng.boilerPressure)} · ${outside} outside band`,
    `Ops: rate ${fmt(ops.currentRateMW)} MW · ${fmt(ops.percentOfTarget, 0)}% of shift target · bottleneck ${ops.bottleneckArea} · source ${ops.dataSource}`,
    `Finance (synthetic): value $${fmt(fin.productionValueUSD, 0)} · margin $${fmt(fin.marginUSD, 0)} · cost/MWh $${fmt(fin.costPerMWh, 2)}`,
    "",
    `Generated ${new Date().toISOString()}`,
  ].join("\n");

  metadata.set("status", "sending");
  const sent = await sendPlainSlackMessage({
    title: "PlantOS shift digest",
    body,
  });

  if (!sent.ok) {
    metadata.set("status", "send_failed").set("error", sent.error);
    logger.warn("plant-shift-digest send failed", sent);
    return { ok: false as const, error: sent.error, skipped: sent.skipped };
  }

  metadata.set("status", "sent").set("intentId", sent.intentId).set("runId", sent.runId);
  logger.info("plant-shift-digest sent", { intentId: sent.intentId, reason: opts.reason });
  return { ok: true as const, intentId: sent.intentId, runId: sent.runId };
}

/**
 * Cron digest — off unless PLANT_DIGEST_ENABLED=true.
 */
export const plantShiftDigest = schedules.task({
  id: "plant-shift-digest",
  cron: "0 */8 * * *",
  maxDuration: 180,
  run: async () => buildAndSendDigest({ force: false, reason: "schedule" }),
});

/**
 * One-click live demo from the UI — always attempts send (still needs outbound Slack).
 */
export const plantShiftDigestDemo = task({
  id: "plant-shift-digest-demo",
  maxDuration: 180,
  run: async () => buildAndSendDigest({ force: true, reason: "ui-demo" }),
});
