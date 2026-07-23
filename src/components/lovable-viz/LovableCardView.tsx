"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { CardLiveContext, ChartHeightContext } from "./card-live-context";
import { InteractiveCardBody } from "./chart-chrome";
import { DECKS } from "./PlantVisualDeck";
import { LOVABLE_CARD_META } from "./card-meta";
import type { CardBinding } from "@/lib/plant-tower";
import {
  cardSupportsHistorianRange,
  DEFAULT_HISTORIAN_RANGE,
  HISTORIAN_LIVE_POLL_MS,
  HISTORIAN_RANGE_PRESETS,
  historianPillLabel,
  historianSeriesWindow,
  historianWindowLabel,
  type HistorianRangeKey,
} from "@/lib/historian-range";

/** Chart body height — same for 1 box and 2-wide (wide ≠ tall). */
export function chartHeightForSpan(_span?: 1 | 2) {
  return 228;
}

const cardByType = Object.fromEntries(
  DECKS.flatMap((d) => d.cards.map((c) => [c.id, { ...c, roleHint: d.roleHint, deckName: d.name }]))
);

function formatPrimary(binding: CardBinding): string {
  if (binding.unit === "USD") return `$${Math.round(binding.primary).toLocaleString()}`;
  if (!Number.isFinite(binding.primary)) return "—";
  const n = binding.primary.toFixed(
    binding.unit === "%" || binding.unit === "rpm" || binding.unit === "% steam" ? 1 : 2
  );
  return binding.unit ? `${n} ${binding.unit}` : n;
}

/** Top-right live value only — no LIVE label, no tag caption. */
function LiveValue({ binding }: { binding: CardBinding }) {
  const prev = useRef<number | null>(null);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    const n = Number(binding.primary);
    if (!Number.isFinite(n)) return;
    if (prev.current != null && Math.abs(n - prev.current) > 0.0001) {
      setFlash(true);
      const t = window.setTimeout(() => setFlash(false), 600);
      prev.current = n;
      return () => window.clearTimeout(t);
    }
    prev.current = n;
  }, [binding.primary]);

  return (
    <div
      className={`shrink-0 text-right text-lg font-semibold leading-tight tabular text-foreground ${flash ? "count-flash" : ""}`}
      data-live-value="true"
    >
      {formatPrimary(binding)}
    </div>
  );
}

function HistorianLivePlay({
  live,
  busy,
  onToggle,
}: {
  live: boolean;
  busy?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      data-testid="historian-live"
      data-live={live ? "1" : "0"}
      aria-pressed={live}
      aria-label={live ? "Pause live chart" : "Play live chart"}
      title={live ? "Pause live" : "Play live"}
      disabled={busy}
      onClick={onToggle}
      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition disabled:opacity-50 ${
        live
          ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-700"
          : "border-border bg-surface text-muted-foreground hover:border-primary/30"
      }`}
    >
      {live ? (
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <rect x="1.5" y="1.5" width="2.5" height="7" rx="0.5" fill="currentColor" />
          <rect x="6" y="1.5" width="2.5" height="7" rx="0.5" fill="currentColor" />
        </svg>
      ) : (
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <path d="M3 1.5v7l6-3.5-6-3.5z" fill="currentColor" />
        </svg>
      )}
    </button>
  );
}

function HistorianRangePills({
  range,
  onChange,
  busy,
  live,
  onToggleLive,
}: {
  range: HistorianRangeKey;
  onChange: (r: HistorianRangeKey) => void;
  busy?: boolean;
  live: boolean;
  onToggleLive: () => void;
}) {
  return (
    <div
      className="mb-2 flex flex-wrap items-center gap-1"
      role="group"
      aria-label="Historian time range"
      data-testid="historian-range"
      data-range={range}
      data-live={live ? "1" : "0"}
    >
      <HistorianLivePlay live={live} busy={busy} onToggle={onToggleLive} />
      {HISTORIAN_RANGE_PRESETS.map((key) => (
        <button
          key={key}
          type="button"
          data-testid={`historian-range-${key}`}
          aria-pressed={range === key}
          disabled={busy && !live}
          onClick={() => onChange(key)}
          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold transition disabled:opacity-50 ${
            range === key
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border bg-surface text-muted-foreground hover:border-primary/30"
          }`}
        >
          {historianPillLabel(key)}
        </button>
      ))}
      <span className="ml-1 text-[10px] text-muted-foreground" data-testid="historian-range-label">
        {live ? `Live · ${historianWindowLabel(range)}` : historianWindowLabel(range)}
      </span>
    </div>
  );
}

type SeriesPayload = {
  series?: Array<{ t: string; v: number }>;
  pointCount?: number;
  windowStartMs?: number;
  windowEndMs?: number;
  minutes?: number;
  error?: string;
};

export function LovableCardView({
  type,
  label,
  hint,
  binding,
  compact = false,
  chartHeight,
}: {
  type: string;
  label?: string | null;
  hint?: string | null;
  binding?: CardBinding | null;
  /** Tighter layout for canvas pins. */
  compact?: boolean;
  /** Explicit chart pixel height (canvas span 1 | 2). */
  chartHeight?: number;
}) {
  const card = cardByType[type];
  const supportsRange = cardSupportsHistorianRange(type);
  const [rangeKey, setRangeKey] = useState<HistorianRangeKey>(DEFAULT_HISTORIAN_RANGE);
  const [live, setLive] = useState(false);
  const [seriesOverride, setSeriesOverride] = useState<CardBinding["series"] | null>(null);
  const [seriesWindow, setSeriesWindow] = useState<CardBinding["seriesWindow"] | null>(null);
  const [rangeBusy, setRangeBusy] = useState(false);
  const [pointCount, setPointCount] = useState<number | null>(null);
  const fetchGen = useRef(0);

  const applySeries = useCallback(
    (json: SeriesPayload, key: HistorianRangeKey, isLive: boolean) => {
      const series = json.series ?? [];
      setSeriesOverride(series);
      setPointCount(json.pointCount ?? series.length);
      if (
        typeof json.windowStartMs === "number" &&
        typeof json.windowEndMs === "number" &&
        Number.isFinite(json.windowStartMs) &&
        Number.isFinite(json.windowEndMs)
      ) {
        setSeriesWindow({
          startMs: json.windowStartMs,
          endMs: json.windowEndMs,
          minutes: json.minutes ?? historianSeriesWindow(key, series).minutes,
          live: isLive,
        });
      } else {
        setSeriesWindow(historianSeriesWindow(key, series, { live: isLive }));
      }
    },
    []
  );

  const fetchSeries = useCallback(
    async (key: HistorianRangeKey, isLive: boolean, opts?: { silent?: boolean }) => {
      const gen = ++fetchGen.current;
      if (!opts?.silent) setRangeBusy(true);
      try {
        const res = await fetch(
          `/api/plant/card-series?type=${encodeURIComponent(type)}&range=${encodeURIComponent(key)}&live=${isLive ? "1" : "0"}`
        );
        const json = (await res.json()) as SeriesPayload;
        if (gen !== fetchGen.current) return;
        if (!res.ok || json.error) return;
        applySeries(json, key, isLive);
      } catch {
        /* keep prior series */
      } finally {
        if (gen === fetchGen.current && !opts?.silent) setRangeBusy(false);
      }
    },
    [applySeries, type]
  );

  useEffect(() => {
    if (!supportsRange) {
      setSeriesOverride(null);
      setSeriesWindow(null);
      setPointCount(null);
      return;
    }
    void fetchSeries(rangeKey, live);
  }, [supportsRange, rangeKey, live, fetchSeries]);

  useEffect(() => {
    if (!supportsRange || !live) return;
    const id = window.setInterval(() => {
      void fetchSeries(rangeKey, true, { silent: true });
    }, HISTORIAN_LIVE_POLL_MS);
    return () => window.clearInterval(id);
  }, [supportsRange, live, rangeKey, fetchSeries]);

  if (!card) {
    return (
      <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        Unknown Lovable card: {type}
      </div>
    );
  }

  const bodyH = chartHeight ?? (compact ? 228 : undefined);
  const effectiveBinding: CardBinding | null | undefined =
    supportsRange && seriesOverride
      ? {
          kind: binding?.kind ?? "series",
          primary:
            binding?.primary ??
            seriesOverride[seriesOverride.length - 1]?.v ??
            0,
          unit: binding?.unit ?? "MW",
          caption: `${live ? "Live · " : ""}${historianWindowLabel(rangeKey)}${
            pointCount != null ? ` · ${pointCount} pts` : ""
          }`,
          series: seriesOverride,
          seriesWindow: seriesWindow ?? undefined,
          items: binding?.items,
          synthetic: binding?.synthetic,
        }
      : binding
        ? {
            ...binding,
            series: seriesOverride ?? binding.series,
            seriesWindow: seriesWindow ?? binding.seriesWindow,
          }
        : binding;

  return (
    <CardLiveContext.Provider value={effectiveBinding ?? null}>
      <ChartHeightContext.Provider value={bodyH ?? null}>
        <article
          data-lovable-card={type}
          data-interactive-card="true"
          data-historian={supportsRange ? "1" : "0"}
          data-historian-live={supportsRange && live ? "1" : "0"}
          data-window-minutes={
            supportsRange && seriesWindow ? String(seriesWindow.minutes) : undefined
          }
          data-window-start-ms={
            supportsRange && seriesWindow ? String(seriesWindow.startMs) : undefined
          }
          data-window-end-ms={
            supportsRange && seriesWindow ? String(seriesWindow.endMs) : undefined
          }
          className={`card-surface relative flex flex-col rise ${
            compact ? "overflow-hidden p-3" : "overflow-visible p-4"
          }`}
          style={{ background: card.bg, minHeight: compact ? undefined : 300 }}
        >
          <div className={`flex shrink-0 items-start justify-between gap-3 ${compact ? "mb-2" : "mb-3"}`}>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">{label ?? card.label}</div>
              <div className="text-[11px] text-muted-foreground">{hint ?? card.hint}</div>
            </div>
            {effectiveBinding ? <LiveValue binding={effectiveBinding} /> : null}
          </div>
          {supportsRange ? (
            <HistorianRangePills
              range={rangeKey}
              busy={rangeBusy}
              live={live}
              onChange={setRangeKey}
              onToggleLive={() => setLive((v) => !v)}
            />
          ) : null}
          <div
            className={`relative w-full min-w-0 shrink-0 ${
              compact ? "overflow-hidden" : "h-56 min-h-0 flex-1 overflow-visible"
            }`}
            style={bodyH ? { height: bodyH } : undefined}
          >
            <InteractiveCardBody type={type} />
          </div>
        </article>
      </ChartHeightContext.Provider>
    </CardLiveContext.Provider>
  );
}

/** Registry map: each Lovable/Replit card type → json-render component. */
export function buildLovableRegistryEntries() {
  const entries: Record<
    string,
    (args: { props: { label?: string | null; hint?: string | null } }) => ReactNode
  > = {};
  for (const meta of LOVABLE_CARD_META) {
    entries[meta.type] = ({ props }) => (
      <LovableCardView type={meta.type} label={props.label} hint={props.hint} />
    );
  }
  return entries;
}
