/**
 * Default density for visuals shown **in chat**.
 * Canvas / pin board can still hold more; do not bombard the thread unless the user asks.
 */
export const CHAT_DEFAULT_CHART_LIMIT = 1;
export const CHAT_DEFAULT_READING_LIMIT = 4;

/** Soft ceiling for preloaded / typical plant questions (charts OR readings). */
export const CHAT_PRELOAD_CHART_SOFT_MAX = 2;
export const CHAT_PRELOAD_READING_SOFT_MAX = 4;

/**
 * Wide canvas asks (parallel brief OR multi-visual starters) — up to four charts.
 * Chat still stays sparse.
 */
export const WIDE_CANVAS_CHART_MAX = 4;

/** @deprecated use WIDE_CANVAS_CHART_MAX */
export const PARALLEL_BRIEF_CHART_MAX = WIDE_CANVAS_CHART_MAX;

/** Engineer Q1 — four named hydro/feed visuals (question-card-maps). */
export const ENGINEER_HYDRO_FEED_TYPES = [
  "HydroUnit",
  "HydroEnergyBars",
  "ComponentTemps",
  "PowerAndTarget",
] as const;

/** Detect plant-wide parallel / all-roles deep briefs. */
export function isParallelBriefQuestion(question: string): boolean {
  const q = question.toLowerCase();
  return (
    /parallel\s+investigate/.test(q) ||
    /deep\s+brief/.test(q) ||
    /plant-wide/.test(q) ||
    (/engineer/.test(q) && /ops|operations/.test(q) && /finance/.test(q)) ||
    /all\s+roles|across\s+(engineer|roles)/.test(q)
  );
}

/** Engineer starter that lists hydro unit + steam/hydro + temps + power/target. */
export function isEngineerHydroFeedQuestion(question: string): boolean {
  const q = question.toLowerCase();
  return (
    /hydro\s+unit/.test(q) &&
    /(steam.*hydro|hydro.*steam|steam versus hydro)/.test(q) &&
    /component\s+temp/.test(q) &&
    /(power.*target|shift\s+target)/.test(q)
  );
}

/** Any ask that clearly requests 3+ distinct visual topics. */
export function isMultiVisualQuestion(question: string): boolean {
  if (isParallelBriefQuestion(question) || isEngineerHydroFeedQuestion(question)) return true;
  const q = question.toLowerCase();
  const cues = [
    /hydro\s+unit/,
    /steam.*hydro|hydro.*mw|energy\s+bars/,
    /component\s+temp/,
    /power.*(?:versus|vs).*target|shift\s+target/,
    /boiler\s+pressure/,
    /turbine\s+speed/,
    /generator\s+output/,
    /vibration|bearing/,
    /throughput|timeline/,
    /margin|cost\s+per|production\s+worth/,
  ];
  return cues.filter((r) => r.test(q)).length >= 3;
}

/** Optional preferred card types for known multi-visual starters. */
export function preferredTypesForQuestion(question: string): string[] | undefined {
  if (isEngineerHydroFeedQuestion(question)) return [...ENGINEER_HYDRO_FEED_TYPES];
  return undefined;
}

/** Chart count for selectVisuals / first-ask land. */
export function chartLimitForQuestion(question: string): number {
  return isMultiVisualQuestion(question) ? WIDE_CANVAS_CHART_MAX : CHAT_PRELOAD_CHART_SOFT_MAX;
}
