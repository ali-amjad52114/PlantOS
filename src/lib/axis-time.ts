/** Axis / tooltip time labels — Trigger-style: "Jul 22 20:00" */

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function fromParts(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getDate()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/**
 * Format a ClickHouse / ISO / Date value for chart x-axes.
 * Pattern matches ops dashboards: "Jul 21 20:00" (no seconds).
 */
export function formatAxisTime(ts: string | number | Date | null | undefined): string {
  if (ts == null || ts === "") return "";
  if (typeof ts === "string" && /^[A-Z][a-z]{2} \d{1,2} \d{2}:\d{2}$/.test(ts.trim())) {
    return ts.trim();
  }

  let d: Date | null = null;
  if (ts instanceof Date) {
    d = ts;
  } else if (typeof ts === "number" && Number.isFinite(ts)) {
    d = new Date(ts);
  } else {
    const raw = String(ts).trim();
    // "2026-07-22 20:21:07" → treat as local wall clock
    const normalized = /^\d{4}-\d{2}-\d{2} /.test(raw)
      ? raw.replace(" ", "T")
      : raw;
    const parsed = new Date(normalized);
    if (!Number.isNaN(parsed.getTime())) d = parsed;
    else {
      // Already-sliced "20:21:07" / "20:21" from older bindings
      const hm = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
      if (hm) {
        const now = new Date();
        now.setHours(Number(hm[1]), Number(hm[2]), 0, 0);
        return fromParts(now);
      }
    }
  }

  if (!d || Number.isNaN(d.getTime())) return String(ts);
  return fromParts(d);
}
