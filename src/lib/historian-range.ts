/** Historian window presets — PLAN_HISTORIAN_RANGE */

/** Default is a short live window; longer ranges only when the user picks them. */
export type HistorianRangeKey = "1m" | "1h" | "12h" | "24h";

export const HISTORIAN_RANGE_PRESETS: HistorianRangeKey[] = ["1m", "1h", "12h", "24h"];

/** Clean recent view (dense spark) until user picks 1h/12h/24h. */
export const DEFAULT_HISTORIAN_RANGE: HistorianRangeKey = "1m";

/** Cards with real ClickHouse tag trends — only these get range pills. */
export const HISTORIAN_RANGE_CARD_TYPES = new Set<string>([
  "GeneratorOutput",
  "ThroughputTimeline",
  "ShiftThroughput",
  "ProductionVolume",
  "HydroEnergyBars",
  "EnergyValueTrend",
  "OutputVsDemand",
  "ForecastTrajectory",
  "TurbineSpeed",
  "TurbineRotorCard",
  "BoilerPressure",
]);

export function cardSupportsHistorianRange(type: string): boolean {
  return HISTORIAN_RANGE_CARD_TYPES.has(type);
}

export function normalizeHistorianRange(raw: unknown): HistorianRangeKey {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "1m" || s === "5m" || s === "5") return "1m"; // 5m legacy → 1m default
  if (s === "1h" || s === "1") return "1h";
  if (s === "12h" || s === "12") return "12h";
  if (s === "24h" || s === "24") return "24h";
  // Legacy numeric hours query param
  const n = Number(raw);
  if (n === 12) return "12h";
  if (n === 24) return "24h";
  if (n === 1) return "1h";
  return DEFAULT_HISTORIAN_RANGE;
}

export function historianRangeMinutes(key: HistorianRangeKey): number {
  switch (key) {
    case "1m":
      return 1;
    case "1h":
      return 60;
    case "12h":
      return 12 * 60;
    case "24h":
      return 24 * 60;
  }
}

/** Primary CH tag for series refetch. */
export function trendTagForHistorianCard(type: string): string | null {
  switch (type) {
    case "TurbineSpeed":
    case "TurbineRotorCard":
      return "P2_SIT01";
    case "GeneratorOutput":
    case "ThroughputTimeline":
    case "ShiftThroughput":
    case "ProductionVolume":
    case "HydroEnergyBars":
    case "EnergyValueTrend":
    case "OutputVsDemand":
    case "ForecastTrajectory":
    case "BoilerPressure":
      return "P4_ST_PO";
    default:
      return null;
  }
}

export function historianWindowLabel(key: HistorianRangeKey): string {
  switch (key) {
    case "1m":
      return "Last 1 minute";
    case "1h":
      return "Last 1 hour";
    case "12h":
      return "Last 12 hours";
    case "24h":
      return "Last 24 hours";
  }
}

export function historianPillLabel(key: HistorianRangeKey): string {
  return key;
}

/** Poll interval for card-level historian live play. */
export const HISTORIAN_LIVE_POLL_MS = 2000;

/** Parse series timestamp to epoch ms (ISO, CH datetime, or already-formatted axis label). */
export function seriesTsToMs(ts: string | number | Date | null | undefined): number | null {
  if (ts == null || ts === "") return null;
  if (typeof ts === "number" && Number.isFinite(ts)) return ts;
  if (ts instanceof Date) {
    const n = ts.getTime();
    return Number.isNaN(n) ? null : n;
  }
  const raw = String(ts).trim();
  if (/^\d+$/.test(raw)) {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  const normalized = /^\d{4}-\d{2}-\d{2} /.test(raw) ? raw.replace(" ", "T") : raw;
  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) return parsed.getTime();
  return null;
}

/**
 * Fixed chart domain for a historian range.
 * Anchor on latest series ts (replay-friendly). Live mode still uses that anchor —
 * polling advances max(ts) as new points arrive so the window rolls forward.
 */
export function historianSeriesWindow(
  key: HistorianRangeKey,
  series: Array<{ t: string; v: number }>,
  opts?: { live?: boolean; nowMs?: number }
): { startMs: number; endMs: number; minutes: number; live?: boolean } {
  const minutes = historianRangeMinutes(key);
  const spanMs = minutes * 60_000;
  const nowMs = opts?.nowMs ?? Date.now();
  let endMs = 0;
  for (const p of series) {
    const ms = seriesTsToMs(p.t);
    if (ms != null && ms > endMs) endMs = ms;
  }
  if (endMs <= 0) endMs = nowMs;
  return {
    startMs: endMs - spanMs,
    endMs,
    minutes,
    live: opts?.live,
  };
}

/** @deprecated use HistorianRangeKey */
export type HistorianRangeHours = 1 | 12 | 24;
