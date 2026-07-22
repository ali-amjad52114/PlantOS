import type { ClickHouseClient } from "@clickhouse/client";
import { readFileSync } from "fs";
import { join } from "path";

const tagPath = join(process.cwd(), "data", "plant", "tag_map.json");

export type ReplayControl = {
  playing: boolean;
  speed: number;
  updated_at?: string;
};

function tagIds(): string[] {
  const tags = JSON.parse(readFileSync(tagPath, "utf8")) as Array<{ id: string }>;
  return tags.map((t) => t.id);
}

export async function ensureReplayControl(ch: ClickHouseClient) {
  await ch.command({
    query: `
      CREATE TABLE IF NOT EXISTS plant_replay_control (
        id UInt8,
        playing UInt8,
        speed Float32,
        updated_at DateTime
      ) ENGINE = ReplacingMergeTree(updated_at)
      ORDER BY id
    `,
  });
  const existing = await ch.query({
    query: `SELECT playing, speed FROM plant_replay_control FINAL WHERE id = 1 LIMIT 1`,
    format: "JSONEachRow",
  });
  const rows = (await existing.json()) as Array<{ playing: number; speed: number }>;
  if (rows.length === 0) {
    await ch.insert({
      table: "plant_replay_control",
      values: [{ id: 1, playing: 1, speed: 1, updated_at: new Date().toISOString().slice(0, 19).replace("T", " ") }],
      format: "JSONEachRow",
    });
  }
}

export async function getReplayControl(ch: ClickHouseClient): Promise<ReplayControl> {
  await ensureReplayControl(ch);
  const r = await ch.query({
    query: `SELECT playing, speed, updated_at FROM plant_replay_control FINAL WHERE id = 1 LIMIT 1`,
    format: "JSONEachRow",
  });
  const row = ((await r.json()) as any[])[0];
  return {
    playing: Boolean(row?.playing),
    speed: Number(row?.speed ?? 1),
    updated_at: row?.updated_at,
  };
}

export async function setReplayControl(
  ch: ClickHouseClient,
  patch: Partial<{ playing: boolean; speed: number }>
): Promise<ReplayControl> {
  const cur = await getReplayControl(ch);
  const next = {
    playing: patch.playing ?? cur.playing,
    speed: Math.min(8, Math.max(0.25, patch.speed ?? cur.speed)),
  };
  await ch.insert({
    table: "plant_replay_control",
    values: [
      {
        id: 1,
        playing: next.playing ? 1 : 0,
        speed: next.speed,
        updated_at: new Date().toISOString().slice(0, 19).replace("T", " "),
      },
    ],
    format: "JSONEachRow",
  });
  return { ...next, updated_at: new Date().toISOString() };
}

export async function resetReplay(ch: ClickHouseClient) {
  await ch.command({ query: `ALTER TABLE plant_readings DELETE WHERE source = 'live'` });
  await setReplayControl(ch, { playing: true });
  return { ok: true };
}

/** Advance live feed by copying next history stamps with current wall-clock timestamps. */
export async function tickReplay(
  ch: ClickHouseClient,
  opts?: { force?: boolean; batchOverride?: number }
) {
  await ensureReplayControl(ch);
  const control = await getReplayControl(ch);
  if (!control.playing && !opts?.force) {
    return { skipped: true, reason: "paused", inserted: 0, control };
  }

  const ids = tagIds();
  const curQ = await ch.query({
    query: `SELECT max(original_ts) AS cursor FROM plant_readings WHERE source = 'live'`,
    format: "JSONEachRow",
  });
  let cursor = ((await curQ.json()) as any[])[0]?.cursor as string | null;

  const boundsQ = await ch.query({
    query: `SELECT min(ts) AS mn, max(ts) AS mx FROM plant_readings WHERE source = 'history'`,
    format: "JSONEachRow",
  });
  const bounds = ((await boundsQ.json()) as any[])[0];
  if (!cursor || cursor < bounds.mn) cursor = bounds.mn;

  const batch = opts?.batchOverride ?? Math.max(1, Math.round(12 * control.speed));
  const nextQ = await ch.query({
    query: `SELECT DISTINCT ts FROM plant_readings WHERE source = 'history' AND ts > {cursor:DateTime} ORDER BY ts ASC LIMIT {lim:UInt32}`,
    query_params: { cursor, lim: batch },
    format: "JSONEachRow",
  });
  let stamps = (await nextQ.json()) as Array<{ ts: string }>;
  let loopId = 0;
  if (stamps.length === 0) {
    loopId = 1;
    const restart = await ch.query({
      query: `SELECT DISTINCT ts FROM plant_readings WHERE source = 'history' ORDER BY ts ASC LIMIT {lim:UInt32}`,
      query_params: { lim: batch },
      format: "JSONEachRow",
    });
    stamps = (await restart.json()) as Array<{ ts: string }>;
  }

  // Idempotency: never re-insert original_ts already present as live (dual-writer / overlap safe).
  if (stamps.length) {
    const already = await ch.query({
      query: `
        SELECT DISTINCT original_ts AS ts
        FROM plant_readings
        WHERE source = 'live'
          AND original_ts IN ({stamps:Array(DateTime)})
      `,
      query_params: { stamps: stamps.map((s) => s.ts) },
      format: "JSONEachRow",
    });
    const have = new Set(((await already.json()) as Array<{ ts: string }>).map((r) => String(r.ts)));
    stamps = stamps.filter((s) => !have.has(String(s.ts)));
  }

  if (stamps.length === 0) {
    return {
      skipped: true,
      reason: "idempotent_skip",
      inserted: 0,
      loopId,
      lastOriginal: null,
      control,
    };
  }

  const now = new Date();
  const rows: Array<{
    ts: string;
    tag: string;
    value: number;
    area: string;
    source: string;
    original_ts: string;
    loop_id: number;
  }> = [];

  for (let i = 0; i < stamps.length; i++) {
    const ots = stamps[i].ts;
    const liveTs = new Date(now.getTime() - (stamps.length - 1 - i) * 5000);
    const liveTsStr = liveTs.toISOString().slice(0, 19).replace("T", " ");
    const vals = await ch.query({
      query: `SELECT tag, value, area FROM plant_readings WHERE source = 'history' AND ts = {ts:DateTime} AND tag IN ({tags:Array(String)})`,
      query_params: { ts: ots, tags: ids },
      format: "JSONEachRow",
    });
    for (const v of (await vals.json()) as any[]) {
      rows.push({
        ts: liveTsStr,
        tag: v.tag,
        value: Number(v.value),
        area: v.area,
        source: "live",
        original_ts: ots,
        loop_id: loopId,
      });
    }
  }

  if (rows.length) {
    await ch.insert({ table: "plant_readings", values: rows, format: "JSONEachRow" });
  }

  return {
    skipped: false,
    inserted: rows.length,
    loopId,
    lastOriginal: stamps.at(-1)?.ts ?? null,
    control,
  };
}
