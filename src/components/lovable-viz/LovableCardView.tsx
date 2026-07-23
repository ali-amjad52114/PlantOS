"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { CardLiveContext } from "./card-live-context";
import { InteractiveCardBody } from "./chart-chrome";
import { DECKS } from "./PlantVisualDeck";
import { LOVABLE_CARD_META } from "./card-meta";
import type { CardBinding } from "@/lib/plant-tower";

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
}: {
  type: string;
  label?: string | null;
  hint?: string | null;
  binding?: CardBinding | null;
  /** Tighter min-height for canvas pins. */
  compact?: boolean;
}) {
  const card = cardByType[type];
  if (!card) {
    return (
      <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        Unknown Lovable card: {type}
      </div>
    );
  }

  return (
    <CardLiveContext.Provider value={binding ?? null}>
      <article
        data-lovable-card={type}
        data-interactive-card="true"
        className="card-surface relative flex flex-col overflow-visible p-4 rise"
        style={{ background: card.bg, minHeight: compact ? 200 : 300 }}
      >
        {/* Top: title + hint left, live value right */}
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground">{label ?? card.label}</div>
            <div className="text-[11px] text-muted-foreground">{hint ?? card.hint}</div>
          </div>
          {binding ? <LiveValue binding={binding} /> : null}
        </div>
        {/* Bottom: full-width interactive chart */}
        <div className="relative h-56 min-h-0 w-full min-w-0 flex-1 overflow-visible">
          <InteractiveCardBody type={type} />
        </div>
      </article>
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
