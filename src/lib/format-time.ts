/**
 * Single timezone contract for PlantOS:
 * - ClickHouse naive datetimes are UTC (append Z when missing offset).
 * - All human-facing labels render in America/Los_Angeles (PT).
 * Charts, overview, and captions must go through these helpers — do not re-parse CH times ad hoc.
 */

export const PLANT_DISPLAY_TZ = "America/Los_Angeles";

const HAS_TZ = /(?:Z|[+-]\d{2}:?\d{2})$/i;

/**
 * Parse a ClickHouse / ISO / epoch value to epoch milliseconds.
 * Naive "YYYY-MM-DD HH:MM:SS" (no Z/offset) is treated as UTC — never as local wall clock.
 */
export function parseClickHouseTimeMs(
  value: string | number | Date | null | undefined
): number | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    const n = value.getTime();
    return Number.isNaN(n) ? null : n;
  }
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const raw = String(value).trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  // Already axis-formatted PT labels cannot be round-tripped safely.
  if (/^[A-Z][a-z]{2} \d{1,2} \d{2}:\d{2}(:\d{2})?$/.test(raw)) return null;

  let normalized = raw.includes(" ") && !raw.includes("T") ? raw.replace(" ", "T") : raw;
  // Bare date-time from CH JSON → UTC
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(normalized) && !HAS_TZ.test(normalized)) {
    normalized = `${normalized}Z`;
  }

  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

function axisParts(ms: number, withSeconds: boolean) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: PLANT_DISPLAY_TZ,
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: withSeconds ? "2-digit" : undefined,
    hourCycle: "h23",
  });
  const bag: Record<string, string> = {};
  for (const p of fmt.formatToParts(new Date(ms))) {
    if (p.type !== "literal") bag[p.type] = p.value;
  }
  const hh = bag.hour ?? "00";
  const mm = bag.minute ?? "00";
  const time = withSeconds ? `${hh}:${mm}:${bag.second ?? "00"}` : `${hh}:${mm}`;
  return `${bag.month} ${bag.day} ${time}`;
}

const PACIFIC_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: PLANT_DISPLAY_TZ,
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
});

/** Overview / captions — e.g. "Jul 23, 12:52:22 AM" in PT. */
export function formatPacificTimestamp(value: unknown): string {
  if (value == null || value === "") return "—";
  const ms = parseClickHouseTimeMs(
    value instanceof Date || typeof value === "number" || typeof value === "string"
      ? value
      : String(value)
  );
  if (ms == null) return String(value);
  return PACIFIC_TIME_FORMATTER.format(new Date(ms));
}

export type AxisTimeOptions = {
  /** Include seconds — use for ≤1m historian windows so ticks don’t collide. */
  withSeconds?: boolean;
};

/**
 * Chart axis / tooltip labels in PT.
 * Default: "Jul 23 00:52". With seconds: "Jul 23 00:52:08".
 */
export function formatAxisTime(
  ts: string | number | Date | null | undefined,
  opts?: AxisTimeOptions
): string {
  if (ts == null || ts === "") return "";
  const ms = parseClickHouseTimeMs(ts);
  if (ms == null) {
    // Pass through only if already a display string we can't re-parse.
    const raw = String(ts).trim();
    return raw;
  }
  return axisParts(ms, Boolean(opts?.withSeconds));
}
