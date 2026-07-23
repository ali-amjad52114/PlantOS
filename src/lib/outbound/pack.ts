import type { CanvasPin } from "@/lib/canvas-pins";
import type { CardBinding } from "@/lib/plant-tower";
import {
  captionLinesForPin,
  insightFromCard,
  type ChartCaption,
} from "@/lib/outbound/caption";

/** One chart in a multi-connector outbound pack (Slack uses subset; Google uses full). */
export type OutboundPackChart = {
  chartId: string;
  title: string;
  /** Four high-level explanation lines (Gmail/Docs/Sheets Summary/Slides). */
  lines: [string, string, string, string];
  /** Raw series for Sheets Raw tab. */
  seriesRows: Array<{ t: string; v: number; unit?: string }>;
  /** Optional PNG filename once captured. */
  filename?: string;
};

export type OutboundPack = {
  title: string;
  generatedAt: string;
  charts: OutboundPackChart[];
};

function padFour(a: string, b: string, c?: string, d?: string): [string, string, string, string] {
  return [
    a.trim() || "PlantOS chart shared from canvas.",
    b.trim() || "See the chart for the current plant picture.",
    (c || "This view is a live PlantOS canvas snapshot.").trim(),
    (d || "Use it as an ops checkpoint — not a substitute for alarm response.").trim(),
  ];
}

/** Expand Slack's 2-line caption into a 4-line Google/email pack explanation. */
export function fourLinesFromCaption(
  caption: ChartCaption,
  opts?: { hint?: string; type?: string }
): [string, string, string, string] {
  const hint = (opts?.hint || "").trim();
  const type = (opts?.type || "").trim();
  const line3 = hint
    ? `Chart focus: ${hint}.`
    : type
      ? `PlantOS card type: ${type}.`
      : "Pulled from the live PlantOS canvas.";
  const line4 =
    "Treat this as a shared ops snapshot — verify against live alarms before acting.";
  return padFour(caption.line1, caption.line2, line3, line4);
}

function seriesRowsFromBinding(binding?: CardBinding | null): Array<{ t: string; v: number; unit?: string }> {
  if (!binding) return [];
  const unit = binding.unit;
  if (binding.series?.length) {
    return binding.series.slice(0, 500).map((p) => ({
      t: String(p.t),
      v: Number(p.v),
      unit,
    }));
  }
  if (binding.items?.length) {
    return binding.items.slice(0, 50).map((it) => ({
      t: it.label,
      v: Number(it.value),
      unit: it.unit || unit,
    }));
  }
  if (binding.primary != null && Number.isFinite(Number(binding.primary))) {
    return [{ t: "primary", v: Number(binding.primary), unit }];
  }
  return [];
}

/** Build pack metadata from canvas pins (no PNGs yet). Fail-soft; skips bad pins. */
export function buildPackFromPins(title: string, pins: CanvasPin[], limit = 4): OutboundPack {
  const charts: OutboundPackChart[] = [];
  for (const pin of pins.slice(0, limit)) {
    try {
      if (pin.payload.kind === "card") {
        const c = pin.payload.card;
        const insight = insightFromCard({
          label: c.label || c.type,
          hint: c.hint,
          type: c.type,
          binding: c.binding,
        });
        charts.push({
          chartId: pin.id,
          title: insight.title,
          lines: fourLinesFromCaption(insight, { hint: c.hint, type: c.type }),
          seriesRows: seriesRowsFromBinding(c.binding),
        });
        continue;
      }
      const cap = captionLinesForPin(pin);
      charts.push({
        chartId: pin.id,
        title: cap.title,
        lines: fourLinesFromCaption(cap),
        seriesRows: [],
      });
    } catch {
      /* skip pin */
    }
  }
  return {
    title: title.slice(0, 200) || "PlantOS share",
    generatedAt: new Date().toISOString(),
    charts,
  };
}

/** Merge captured PNG filenames onto pack charts by index. */
export function attachFilenamesToPack(
  pack: OutboundPack,
  filenames: string[]
): OutboundPack {
  return {
    ...pack,
    charts: pack.charts.map((c, i) => ({
      ...c,
      filename: filenames[i] || c.filename,
    })),
  };
}

/** Plain-text body shared by Gmail + Docs narrative. */
export function formatPackNarrative(pack: OutboundPack): string {
  const parts = [`${pack.title}`, `Generated: ${pack.generatedAt}`, ""];
  pack.charts.forEach((c, i) => {
    parts.push(`${i + 1}. ${c.title}`);
    c.lines.forEach((line) => parts.push(`   ${line}`));
    parts.push("");
  });
  return parts.join("\n").trim();
}
