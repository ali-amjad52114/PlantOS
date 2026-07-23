/** Historian window presets — PLAN_HISTORIAN_RANGE */

import { parseClickHouseTimeMs } from "@/lib/format-time";

/** Default is a short live window; longer ranges only when the user picks them. */
export type HistorianRangeKey = "1m" | "1h" | "12h" | "24h";

export const HISTORIAN_RANGE_PRESETS: HistorianRangeKey[] = ["1m", "1h", "12h", "24h"];

/** Clean recent view (dense spark) until user picks 1h/12h/24h. */
export const DEFAULT_HISTORIAN_RANGE: HistorianRangeKey = "1m";

/**
 * Same routing as InteractiveCardBody — keep in sync.
 * Used to decide which cards get play + 1m/1h/12h/24h controls.
 */
export type InteractiveChartKind = "items" | "pie" | "bar" | "line" | "series";

export function interactiveChartKind(type: string): InteractiveChartKind {
  // Time-window cards win over Feed/Attention/… item-list cues (e.g. SteamFeedTrend).
  if (
    /Trend|Timeline|Throughput|Forecast|RateChart|VibChart|SCurve|StreamCompare/i.test(type) &&
    !/Spectrum|Pareto|Scorecard/i.test(type)
  ) {
    if (/Bar|Volume|Hourly|EnergyBars|Usage/i.test(type)) return "bar";
    return "line";
  }
  if (
    /Alert|Feed|Closest|Condition|Attention|RangeBars|Device|Util|Reliability|Scorecard|State|UnitHealth/i.test(
      type
    )
  ) {
    return "items";
  }
  if (/Mix|Donut|Pie|Source|CostMix|ValueByArea|YieldDonut|OpsShiftDonut|QualityBreakdown/i.test(type)) {
    return "pie";
  }
  if (/Bar|Volume|Spectrum|Comparison|ShiftBars|EnergyBars|Hourly|Pareto|Usage|Vibration/i.test(type)) {
    return "bar";
  }
  if (/Vs|Compare|Signal|Demand|Trend|Timeline|Throughput|Forecast|SCurve|RateChart|VibChart/i.test(type)) {
    return "line";
  }
  return "series";
}

/**
 * Frequency bins / category comparisons — chart axes are not a historian time window.
 */
function isNonTimeAxisChart(type: string): boolean {
  if (/Spectrum|Pareto/i.test(type)) return true;
  if (/ShiftBars/i.test(type)) return true;
  if (/Comparison$/i.test(type) && !/Trend|Timeline|Throughput/i.test(type)) return true;
  return false;
}

/** Name cues that mean the plot is a time window (play + range belong here). */
const TIME_SERIES_NAME =
  /Trend|Timeline|Throughput|Forecast|Chart|EnergyBars|Volume|VsDemand|Vs|Hourly|RateChart|VibChart|SCurve|StreamCompare|InferenceStreams|MarginTrend|WasteAttention|YieldTrend|GenPower|SteamFeed|HydroTrend|WaterLevelTrend|TurbineVibTrend|BoilerThermal|OutputVs|ProductionVolume|HydroEnergy|EnergyValue|ShiftThroughput|ThroughputTimeline|GeneratorOutput|TurbineSpeed|TurbineRotor|BoilerPressure|TargetAttainment|PowerAndTarget/i;

/** Decorative / gauge / faceplate fallthroughs — not historian windows. */
const NON_HISTORIAN_SERIES =
  /Orbit|Radar|Funnel|Heatmap|HeatMatrix|Map$|Ring$|Gauge|Tank|Face$|Faceplate|Grid|Bubbles|Bands|Strip|Interval|Produced|Confidence|Oee|Sample|TagUpdate|AreaActivity|UtilityFlow|ThermalMap|ThermalSignature|PlantValue|ComponentTemps|HydroUnit|Agent|Anomaly|QualityRings|CostMix|ShiftBands|ProcessFunnel|StageEfficiency|Cadence|FaultRadar|Outage|EnergyStat|TargetGauge|EngineerFinding|IdleGen|FinanceValue|AmbientTemp|BearingTemp|RotorTemp|StatorTemp|BoilerLevel|WaterValve|WaterLimits|TurbineState|SteamCondition|HydroGauge|AreaHealth|AreaReliability|AttentionFeed|DeviceStrip|RangeBars|UnitHealth|ClosestToLimit|ActiveAlerts|ShiftAlerts|AssetRadar|PlantHealth|OutputHeat|ThermalHeat|QualityBreakdown|ValueByArea|FinanceFunnel|ShiftScorecard|OpsShift|YieldDonut|CostPerMwh|AreaUtil|OffNormalRate|HydroVsSteamFace|BoilerPressureFace|BoilerThermalFace|BoilerValvesFlow|TurbineRotorFace|GeneratorOutputFace|HydroPowerFace|GeneratorLoadFace|AreaVsTargetBullets/i;

/** Play + range pills: time-axis charts only (Lovable + Replit). */
export function cardSupportsHistorianRange(type: string): boolean {
  const kind = interactiveChartKind(type);
  if (kind === "items" || kind === "pie") return false;
  if (isNonTimeAxisChart(type)) return false;
  // Faceplates / gauges / decorative — even if the id contains Output/Pressure/…
  if (NON_HISTORIAN_SERIES.test(type)) return false;

  if (TIME_SERIES_NAME.test(type)) return true;
  if (kind === "line") return true;
  if (kind === "bar" && /Hourly|Energy|Volume|Usage|Bars$/i.test(type)) return true;

  // Remaining series kinds only if not decorative (already filtered)
  if (kind === "series") return true;
  return false;
}

/** @deprecated Prefer cardSupportsHistorianRange — Set-like shim for older callers. */
export const HISTORIAN_RANGE_CARD_TYPES = {
  has: (type: string) => cardSupportsHistorianRange(type),
  /** Approximate size for diagnostics — not a frozen allowlist anymore. */
  get size() {
    return -1;
  },
};

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

/** Primary CH tag for series refetch — best-effort by card name. */
export function trendTagForHistorianCard(type: string): string | null {
  if (!cardSupportsHistorianRange(type)) return null;

  if (/TurbineSpeed|TurbineRotor|RotorFace|SIT01/i.test(type)) return "P2_SIT01";
  if (/Vib|Bearing/i.test(type)) return "P2_VT01e";
  if (/BoilerPressure|BoilerThermal|PIT01/i.test(type)) return "P1_PIT01";
  if (/BoilerLevel|WaterLevel|WaterLimits|LIT01/i.test(type)) return "P3_LIT01";
  if (/BoilerValves|FT01/i.test(type) && /Boiler|Valve|Flow/i.test(type)) return "P1_FT01";
  if (/Hydro|HT_PO/i.test(type) && !/Steam|VsSteam|EnergyBars/i.test(type)) return "P4_HT_PO";
  if (/Load|Demand|ST_LD/i.test(type)) return "P4_ST_LD";
  if (/SteamFeed|ST_FD/i.test(type)) return "P4_ST_FD";
  if (/SteamCondition|ST_PT/i.test(type)) return "P4_ST_PT01";
  if (/StatorTemp|ST_TT/i.test(type)) return "P4_ST_TT01";

  // Default plant pulse — generator MW (covers most throughput / value / output charts)
  return "P4_ST_PO";
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

/** Poll interval for card-level historian live play — once per second while play is on. */
export const HISTORIAN_LIVE_POLL_MS = 1000;

/** Parse series timestamp to epoch ms — naive CH datetimes are UTC. */
export function seriesTsToMs(ts: string | number | Date | null | undefined): number | null {
  return parseClickHouseTimeMs(ts);
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
