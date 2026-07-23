"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { CardLiveContext, ChartHeightContext } from "./card-live-context";
import { InteractiveCardBody } from "./chart-chrome";
import { DECKS } from "./PlantVisualDeck";
import { LOVABLE_CARD_META } from "./card-meta";
import type { CardBinding } from "@/lib/plant-tower";

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
  if (!card) {
    return (
      <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        Unknown Lovable card: {type}
      </div>
    );
  }

  const bodyH = chartHeight ?? (compact ? 228 : undefined);

  return (
    <CardLiveContext.Provider value={binding ?? null}>
      <ChartHeightContext.Provider value={bodyH ?? null}>
        <article
          data-lovable-card={type}
          data-interactive-card="true"
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
            {binding ? <LiveValue binding={binding} /> : null}
          </div>
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
