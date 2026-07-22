import { schedules, logger, metadata } from "@trigger.dev/sdk";
import { createClient } from "@clickhouse/client";
import { tickReplay } from "../lib/replay";

/** Sole continuous live writer. Browser observes via /api/plant/live — does not tick. */
export const plantReplay = schedules.task({
  id: "plant-replay-tick",
  cron: "* * * * *",
  queue: { concurrencyLimit: 1 },
  run: async () => {
    const url = process.env.CLICKHOUSE_URL;
    if (!url) throw new Error("CLICKHOUSE_URL missing");
    const ch = createClient({ url, database: "plantos" });
    metadata.set("status", "replaying");
    const result = await tickReplay(ch);
    metadata
      .set("status", result.skipped ? "skipped" : "ok")
      .set("insertedRows", result.inserted ?? 0)
      .set("lastOriginal", result.lastOriginal ?? null);
    logger.info("Plant replay tick", result);
    return result;
  },
});
