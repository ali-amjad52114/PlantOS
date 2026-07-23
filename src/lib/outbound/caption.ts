import type { CanvasPin } from "@/lib/canvas-pins";
import type { CardBinding } from "@/lib/plant-tower";

/** Caption for a chart shared to Slack. */
export type ChartCaption = {
  /** Short file title in Slack (not the explanation). */
  title: string;
  /** First explanation line — high-level takeaway. */
  line1: string;
  /** Second explanation line — latest reading / trend detail. */
  line2: string;
};

/** Slack comment: two visible explanation lines (blank line between). */
export function formatCaptionComment(caption: ChartCaption): string {
  const l1 = caption.line1.trim() || "PlantOS chart shared from canvas.";
  const l2 = caption.line2.trim() || "See the chart below for the current picture.";
  return `${l1}\n\n${l2}`;
}

function fmt(n: number, unit?: string): string {
  const abs = Math.abs(n);
  const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  const body = n.toFixed(digits);
  return unit ? `${body} ${unit}` : body;
}

function avg(vals: number[]): number {
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function trendWord(vals: number[]): "rising" | "easing" | "holding steady" {
  if (vals.length < 4) return "holding steady";
  const third = Math.max(2, Math.floor(vals.length / 3));
  const early = avg(vals.slice(0, third));
  const late = avg(vals.slice(-third));
  const base = Math.max(Math.abs(early), 1e-6);
  const pct = ((late - early) / base) * 100;
  if (pct > 3) return "rising";
  if (pct < -3) return "easing";
  return "holding steady";
}

/**
 * High-level “what is this chart telling me” from live binding data.
 * Matches the dual-line compare used in InteractiveLineChart (secondary ≈ 92–96% of actual).
 */
export function insightFromCard(input: {
  label: string;
  hint?: string;
  type?: string;
  binding?: CardBinding | null;
}): ChartCaption {
  const title = (input.label || input.type || "Chart").trim().slice(0, 80);
  const hint = (input.hint || "").trim();
  const type = input.type || "";
  const b = input.binding;
  const unit = b?.unit;

  const vsTarget = /target|vs\b|compare|throughput|attain/i.test(`${hint} ${type} ${title}`);

  if (b?.kind === "list" && b.items?.length) {
    const danger = b.items.filter((it) => it.tone === "danger" || it.tone === "warning");
    const top = [...b.items].sort((a, c) => Math.abs(c.value) - Math.abs(a.value))[0];
    const outside =
      unit === "outside" && Number.isFinite(b.primary)
        ? Math.round(b.primary)
        : danger.length;
    if (outside > 0 || /alert|attention|outside/i.test(`${title} ${hint}`)) {
      return {
        title,
        line1: outside > 0
          ? `${outside} item${outside === 1 ? "" : "s"} need attention on this board right now.`
          : `${title} is flagging items that need a look.`,
        line2: top
          ? `Biggest signal: ${top.label} at ${fmt(top.value, top.unit || unit)}.`
          : "Open the chart for the ranked list.",
      };
    }
    return {
      title,
      line1: `${title} breaks the picture into ${b.items.length} pieces.`,
      line2: top
        ? `Largest share right now: ${top.label} (${fmt(top.value, top.unit || unit)}).`
        : `Headline value: ${fmt(b.primary, unit)}.`,
    };
  }

  const series = (b?.series || [])
    .map((p) => Number(p.v))
    .filter((v) => Number.isFinite(v));
  const latest =
    b?.primary != null && Number.isFinite(Number(b.primary))
      ? Number(b.primary)
      : series.length
        ? series[series.length - 1]
        : null;

  if (series.length >= 4 && latest != null) {
    const trend = trendWord(series);
    // Same synthetic compare line the UI draws for dual-line charts
    const secondary = series.map((v, i) => v * (0.92 + (i % 5) * 0.01));
    const above = series.filter((v, i) => v >= secondary[i]).length;
    const abovePct = above / series.length;
    const mean = avg(series);

    if (vsTarget) {
      const posture =
        abovePct >= 0.65
          ? "running above the target line"
          : abovePct <= 0.35
            ? "running below the target line"
            : "tracking close to the target line";
      return {
        title,
        line1: `Actual ${title.toLowerCase()} is ${posture} over this window.`,
        line2: `Latest reading ${fmt(latest, unit)}; trend is ${trend} (window avg ~${fmt(mean, unit)}).`,
      };
    }

    return {
      title,
      line1: `${title} is ${trend} over the visible window.`,
      line2: `Latest reading ${fmt(latest, unit)}; window average about ${fmt(mean, unit)}.`,
    };
  }

  if (latest != null) {
    const caption = (b?.caption || "").trim();
    return {
      title,
      line1: hint
        ? `${title} snapshot (${hint}).`
        : `${title} is the live PlantOS reading for this metric.`,
      line2: caption
        ? `${caption} · now ${fmt(latest, unit)}.`
        : `Current value: ${fmt(latest, unit)}.`,
    };
  }

  return {
    title,
    line1: hint ? `${title} — ${hint}.` : `${title} chart from the PlantOS canvas.`,
    line2: "See the image below for the current plant picture.",
  };
}

/** Build a short title + two high-level takeaway lines from a canvas pin. */
export function captionLinesForPin(pin: CanvasPin): ChartCaption {
  if (pin.payload.kind === "card") {
    const c = pin.payload.card;
    return insightFromCard({
      label: c.label || c.type,
      hint: c.hint,
      type: c.type,
      binding: c.binding,
    });
  }

  if (pin.payload.kind === "finding") {
    const it = pin.payload.item;
    const title = (it.label || it.tag || "Finding").trim().slice(0, 80);
    const value = fmt(Number(it.value), it.unit);
    return {
      title,
      line1: it.outside
        ? `${title} is outside its normal band right now.`
        : `${title} is inside its normal band right now.`,
      line2: `Current value: ${value}.`,
    };
  }

  if (pin.payload.kind === "viz") {
    const title = (pin.payload.spec.root || "Visualization").slice(0, 80);
    return {
      title,
      line1: `PlantOS visualization for ${title}.`,
      line2: "See the chart below for the current picture.",
    };
  }

  return {
    title: "PlantOS chart",
    line1: "PlantOS chart shared from canvas.",
    line2: "See the chart below for the current picture.",
  };
}
