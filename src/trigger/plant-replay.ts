import { schedules, task, logger, metadata, wait } from "@trigger.dev/sdk";
import { createClient, type ClickHouseClient } from "@clickhouse/client";
import { getReplayControl, tickReplay } from "../lib/replay";

const REPLAY_QUEUE = { name: "plant-replay", concurrencyLimit: 1 } as const;

/** Cron safety net: a few ticks if no long session is holding the queue. */
const CRON_DENSE_TICKS = 6;
/** Start session: ~1s cadence while playing (cap wall time via maxDuration). */
const SESSION_GAP_SEC = 1;
const SESSION_MAX_TICKS = 60 * 45; // ~45 min at 1s

function clickhouse(): ClickHouseClient {
  const url = process.env.CLICKHOUSE_URL;
  if (!url) throw new Error("CLICKHOUSE_URL missing");
  return createClient({ url, database: "plantos" });
}

type DenseResult = {
  ticks: number;
  insertedRows: number;
  lastOriginal: string | null;
  stoppedEarly?: string;
};

async function runTickLoop(opts: {
  reason: string;
  maxTicks: number;
  gapSec: number;
  /** Smaller batches = faster ticks (session aims ~1s wall). */
  batchOverride?: number;
}): Promise<DenseResult> {
  const { reason, maxTicks, gapSec, batchOverride } = opts;
  const ch = clickhouse();
  let insertedRows = 0;
  let lastOriginal: string | null = null;
  let ticks = 0;

  metadata
    .set("status", "starting")
    .set("reason", reason)
    .set("progress", { percentage: 0, label: "Replay starting…", step: "start" });

  const control0 = await getReplayControl(ch);
  metadata.set("playing", control0.playing).set("speed", control0.speed);

  if (!control0.playing) {
    metadata
      .set("status", "paused")
      .set("progress", { percentage: 100, label: "Paused — no ticks", step: "paused" })
      .set("insertedRows", 0)
      .set("lastOriginal", null);
    return { ticks: 0, insertedRows: 0, lastOriginal: null, stoppedEarly: "paused" };
  }

  for (let i = 0; i < maxTicks; i++) {
    const mid = await getReplayControl(ch);
    if (!mid.playing) {
      metadata
        .set("status", "paused")
        .set("playing", false)
        .set("speed", mid.speed)
        .set("progress", {
          percentage: Math.min(99, Math.round(((i + 1) / Math.max(maxTicks, 1)) * 100)),
          label: "Paused",
          step: "paused",
        })
        .set("tickIndex", i)
        .set("tickCount", maxTicks)
        .set("insertedRows", insertedRows)
        .set("lastOriginal", lastOriginal);
      return { ticks, insertedRows, lastOriginal, stoppedEarly: "paused" };
    }

    metadata
      .set("status", "replaying")
      .set("playing", true)
      .set("speed", mid.speed)
      .set("tickIndex", i)
      .set("tickCount", maxTicks)
      .set("progress", {
        percentage: Math.min(99, Math.round((i / Math.max(maxTicks, 1)) * 100)),
        label: `Tick ${i + 1}`,
        step: "tick",
      });

    const result = await tickReplay(ch, batchOverride != null ? { batchOverride } : undefined);
    ticks += 1;
    insertedRows += result.inserted ?? 0;
    if (result.lastOriginal) lastOriginal = result.lastOriginal;

    metadata
      .set("status", result.skipped ? "skipped" : "ok")
      .set("insertedRows", insertedRows)
      .set("lastOriginal", lastOriginal)
      .set("lastSkipReason", result.skipped ? result.reason ?? "skipped" : null)
      .set("progress", {
        percentage: Math.min(99, Math.round(((i + 1) / Math.max(maxTicks, 1)) * 100)),
        label: result.skipped
          ? `Tick ${i + 1}: ${result.reason ?? "skipped"}`
          : `Tick ${i + 1}: +${result.inserted ?? 0} rows`,
        step: "tick",
      });

    logger.info("Plant replay tick", { reason, i, result });

    if (i < maxTicks - 1) {
      const waitSec = Math.max(1, Math.round(gapSec / Math.max(0.25, mid.speed)));
      metadata.set("nextWaitSec", waitSec);
      await wait.for({ seconds: waitSec });
    }
  }

  metadata
    .set("status", "complete")
    .set("progress", {
      percentage: 100,
      label: `Done · ${insertedRows} rows · ${ticks} ticks`,
      step: "complete",
    })
    .set("insertedRows", insertedRows)
    .set("lastOriginal", lastOriginal);

  return { ticks, insertedRows, lastOriginal };
}

/** Cron spine: short dense burst if queue is free (session holds the queue while Start plays). */
export const plantReplay = schedules.task({
  id: "plant-replay-tick",
  cron: "* * * * *",
  queue: REPLAY_QUEUE,
  run: async () =>
    runTickLoop({
      reason: "schedule",
      maxTicks: CRON_DENSE_TICKS,
      gapSec: SESSION_GAP_SEC,
    }),
});

/**
 * On-demand ~1s session (Start button). Same queue as cron so writers never overlap.
 */
export const plantReplaySession = task({
  id: "plant-replay-session",
  queue: REPLAY_QUEUE,
  maxDuration: 60 * 50,
  run: async (payload?: { reason?: string }) =>
    runTickLoop({
      reason: payload?.reason ?? "session",
      maxTicks: SESSION_MAX_TICKS,
      gapSec: SESSION_GAP_SEC,
      batchOverride: 1,
    }),
});

/** @deprecated Prefer plant-replay-session; kept as alias for older callers. */
export const plantReplayBurst = task({
  id: "plant-replay-burst",
  queue: REPLAY_QUEUE,
  maxDuration: 60 * 50,
  run: async (payload?: { reason?: string }) =>
    runTickLoop({
      reason: payload?.reason ?? "burst",
      maxTicks: SESSION_MAX_TICKS,
      gapSec: SESSION_GAP_SEC,
      batchOverride: 1,
    }),
});
