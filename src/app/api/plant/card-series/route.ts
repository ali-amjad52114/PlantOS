import { NextResponse } from "next/server";
import {
  cardSupportsHistorianRange,
  historianRangeMinutes,
  historianSeriesWindow,
  historianWindowLabel,
  normalizeHistorianRange,
  seriesTsToMs,
  trendTagForHistorianCard,
  type HistorianRangeKey,
} from "@/lib/historian-range";
import { trend } from "@/lib/plant-services";

/** Keep ISO (or CH datetime) strings — chart formats ticks; needed for time-scale domain. */
function toSeriesTs(raw: unknown): string {
  if (raw == null) return new Date().toISOString();
  if (raw instanceof Date) return raw.toISOString();
  const s = String(raw).trim();
  if (!s) return new Date().toISOString();
  return s;
}

/** Synthetic series when CH is empty — denser for short windows, full span. */
function syntheticSeries(key: HistorianRangeKey): Array<{ t: string; v: number }> {
  const minutes = historianRangeMinutes(key);
  const n = key === "1m" ? 20 : key === "1h" ? 36 : key === "12h" ? 72 : 120;
  const out: Array<{ t: string; v: number }> = [];
  const now = Date.now();
  const stepMs = (minutes * 60 * 1000) / Math.max(n - 1, 1);
  for (let i = 0; i < n; i++) {
    const ts = new Date(now - (n - 1 - i) * stepMs).toISOString();
    const v =
      140 +
      Math.sin(i / (key === "1m" ? 2.4 : key === "1h" ? 5 : 11)) * (key === "1m" ? 2.8 : 6) +
      (i / n) * 2;
    out.push({ t: ts, v: Number(v.toFixed(2)) });
  }
  return out;
}

/**
 * GET /api/plant/card-series?type=GeneratorOutput&range=1m|1h|12h|24h&live=0|1
 * Also accepts legacy `hours=1|12|24` and `range=5m` (maps to 1m).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = String(url.searchParams.get("type") || "");
  const range = normalizeHistorianRange(
    url.searchParams.get("range") ?? url.searchParams.get("hours")
  );
  const live =
    url.searchParams.get("live") === "1" ||
    url.searchParams.get("live") === "true";
  const minutes = historianRangeMinutes(range);

  if (!type || !cardSupportsHistorianRange(type)) {
    return NextResponse.json(
      { error: "type must be an allowlisted historian card" },
      { status: 400 }
    );
  }

  const tag = trendTagForHistorianCard(type);
  if (!tag) {
    return NextResponse.json({ error: "no tag for type" }, { status: 400 });
  }

  try {
    const rows = (await trend(tag, minutes, "minute")) as Array<{
      ts?: string;
      value?: number;
    }>;
    let series = (rows || []).map((r) => ({
      t: toSeriesTs(r.ts),
      v: Number(r.value),
    }));
    let dataSource = "clickhouse";
    if (!series.length) {
      series = syntheticSeries(range);
      dataSource = "synthetic";
    }

    const window = historianSeriesWindow(range, series, { live });
    let dataSpanMinutes = 0;
    if (series.length >= 2) {
      const first = seriesTsToMs(series[0].t);
      const last = seriesTsToMs(series[series.length - 1].t);
      if (first != null && last != null && last >= first) {
        dataSpanMinutes = Math.round((last - first) / 60_000);
      }
    }

    return NextResponse.json({
      type,
      tag,
      range,
      minutes,
      live,
      label: historianWindowLabel(range),
      pointCount: series.length,
      dataSource,
      dataSpanMinutes,
      windowStart: new Date(window.startMs).toISOString(),
      windowEnd: new Date(window.endMs).toISOString(),
      windowStartMs: window.startMs,
      windowEndMs: window.endMs,
      series,
    });
  } catch (e: unknown) {
    const series = syntheticSeries(range);
    const window = historianSeriesWindow(range, series, { live });
    return NextResponse.json({
      type,
      tag,
      range,
      minutes,
      live,
      label: historianWindowLabel(range),
      pointCount: series.length,
      dataSource: "synthetic",
      dataSpanMinutes: minutes,
      windowStart: new Date(window.startMs).toISOString(),
      windowEnd: new Date(window.endMs).toISOString(),
      windowStartMs: window.startMs,
      windowEndMs: window.endMs,
      series,
      warning: String(e instanceof Error ? e.message : e),
    });
  }
}
