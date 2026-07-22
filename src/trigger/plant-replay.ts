import { schedules, task, logger, metadata, wait } from "@trigger.dev/sdk";
import { createClient, type ClickHouseClient } from "@clickhouse/client";
import { getReplayControl, tickReplay } from "../lib/replay";

const REPLAY_QUEUE = { name: "plant-replay", concurrencyLimit: 1 } as const;

/** Sub-ticks per dense run (~1 min wall with ~9s gaps at 1x). */
const DENSE_TICKS = 6;

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

/**
 * Denser LIVE without a second writer: multiple idempotent ticks + durable waits
 * inside one Trigger run. Metadata is Realtime-visible between waits.
 */
async function runDenseTicks(reason: string): Promise<DenseResult> {
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

  for (let i = 0; i < DENSE_TICKS; i++) {
    const mid = await getReplayControl(ch);
    if (!mid.playing) {
      metadata
        .set("status", "paused")
        .set("playing", false)
        .set("speed", mid.speed)
        .set("progress", {
          percentage: Math.round(((i + 1) / DENSE_TICKS) * 100),
          label: "Paused mid-burst",
          step: "paused",
        })
        .set("tickIndex", i)
        .set("insertedRows", insertedRows)
        .set("lastOriginal", lastOriginal);
      return { ticks, insertedRows, lastOriginal, stoppedEarly: "paused" };
    }

    const pct = Math.round((i / DENSE_TICKS) * 100);
    metadata
      .set("status", "replaying")
      .set("playing", true)
      .set("speed", mid.speed)
      .set("tickIndex", i)
      .set("tickCount", DENSE_TICKS)
      .set("progress", {
        percentage: pct,
        label: `Tick ${i + 1}/${DENSE_TICKS}`,
        step: "tick",
      });

    const result = await tickReplay(ch);
    ticks += 1;
    insertedRows += result.inserted ?? 0;
    if (result.lastOriginal) lastOriginal = result.lastOriginal;

    metadata
      .set("status", result.skipped ? "skipped" : "ok")
      .set("insertedRows", insertedRows)
      .set("lastOriginal", lastOriginal)
      .set("lastSkipReason", result.skipped ? result.reason ?? "skipped" : null)
      .set("progress", {
        percentage: Math.round(((i + 1) / DENSE_TICKS) * 100),
        label: result.skipped
          ? `Tick ${i + 1}: ${result.reason ?? "skipped"}`
          : `Tick ${i + 1}: +${result.inserted ?? 0} rows`,
        step: "tick",
      });

    logger.info("Plant replay sub-tick", { reason, i, result });

    if (i < DENSE_TICKS - 1) {
      const gapSec = Math.max(2, Math.round(9 / Math.max(0.25, mid.speed)));
      metadata.set("nextWaitSec", gapSec);
      await wait.for({ seconds: gapSec });
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

/** Cron spine: denser ticks once per minute; sole continuous writer. */
export const plantReplay = schedules.task({
  id: "plant-replay-tick",
  cron: "* * * * *",
  queue: REPLAY_QUEUE,
  run: async () => runDenseTicks("schedule"),
});

/**
 * On-demand dense burst (Start button). Same queue as schedule so writers never overlap.
 * Returns a run handle the UI can subscribe to with Realtime.
 */
export const plantReplayBurst = task({
  id: "plant-replay-burst",
  queue: REPLAY_QUEUE,
  run: async (payload?: { reason?: string }) =>
    runDenseTicks(payload?.reason ?? "burst"),
});
