import { NextResponse } from "next/server";
import { getClickHouse } from "@/lib/clickhouse";
import { getReplayControl, resetReplay, setReplayControl, tickReplay } from "@/lib/replay";

export async function GET() {
  const ch = getClickHouse();
  const control = await getReplayControl(ch);
  const live = await ch.query({
    query: `SELECT max(ts) AS max_ts, count() AS c FROM plant_readings WHERE source='live'`,
    format: "JSONEachRow",
  });
  const liveRow = ((await live.json()) as any[])[0];
  const ageSec = liveRow?.max_ts
    ? Math.max(0, (Date.now() - new Date(String(liveRow.max_ts).replace(" ", "T") + "Z").getTime()) / 1000)
    : null;
  return NextResponse.json({
    control,
    live: liveRow,
    feedActive: control.playing && ageSec !== null && ageSec < 120,
    liveAgeSec: ageSec,
  });
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    action: "start" | "pause" | "reset" | "speed" | "tick";
    speed?: number;
  };
  const ch = getClickHouse();
  if (body.action === "start") {
    return NextResponse.json({ control: await setReplayControl(ch, { playing: true }) });
  }
  if (body.action === "pause") {
    return NextResponse.json({ control: await setReplayControl(ch, { playing: false }) });
  }
  if (body.action === "speed") {
    return NextResponse.json({ control: await setReplayControl(ch, { speed: body.speed ?? 1 }) });
  }
  if (body.action === "reset") {
    await resetReplay(ch);
    const tick = await tickReplay(ch, { force: true, batchOverride: 6 });
    return NextResponse.json({ ok: true, tick });
  }
  if (body.action === "tick") {
    // Kept for Reset bootstrap / rare manual ops — continuous ticks owned by Trigger schedule only.
    const tick = await tickReplay(ch);
    return NextResponse.json(tick);
  }
  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
