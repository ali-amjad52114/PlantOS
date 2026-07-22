import { NextResponse } from "next/server";
import { getClickHouse } from "@/lib/clickhouse";
import { getReplayControl } from "@/lib/replay";

export async function GET() {
  const ch = getClickHouse();
  const control = await getReplayControl(ch);
  const r = await ch.query({
    query: `SELECT max(ts) AS max_ts, count() AS c FROM plant_readings WHERE source='live'`,
    format: "JSONEachRow",
  });
  const live = (await r.json())[0] as { max_ts: string; c: string };
  const h = await ch.query({
    query: `SELECT max(ts) AS max_ts, count() AS c FROM plant_readings WHERE source='history'`,
    format: "JSONEachRow",
  });
  const history = (await h.json())[0];
  const ageSec = live?.max_ts
    ? Math.max(0, (Date.now() - new Date(String(live.max_ts).replace(" ", "T") + "Z").getTime()) / 1000)
    : null;
  const feedActive = Boolean(control.playing && ageSec !== null && ageSec < 120);
  return NextResponse.json({ live, history, feedActive, liveAgeSec: ageSec, control });
}
