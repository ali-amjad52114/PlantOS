"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { CardLiveContext } from "./card-live-context";
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

/** Left live read — value only, no CH / ClickHouse labels. */
function LiveRead({ binding }: { binding: CardBinding }) {
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
    <div className="flex h-full min-h-0 w-[7.25rem] shrink-0 flex-col justify-end border-r border-border/60 pr-2.5">
      <div className={flash ? "count-flash" : ""}>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Live</div>
        <div className="mt-0.5 break-words text-lg font-semibold leading-tight tabular text-foreground">
          {formatPrimary(binding)}
        </div>
        {binding.caption && (
          <p className="mt-1 line-clamp-3 text-[9px] leading-snug text-muted-foreground">
            {binding.caption}
          </p>
        )}
        {binding.synthetic && (
          <p className="mt-1 text-[9px] font-medium text-[color:var(--warning)]">Synthetic $</p>
        )}
      </div>
    </div>
  );
}

export function LovableCardView({
  type,
  label,
  hint,
  binding,
}: {
  type: string;
  label?: string | null;
  hint?: string | null;
  binding?: CardBinding | null;
}) {
  const card = cardByType[type];
  const meta = LOVABLE_CARD_META.find((m) => m.type === type);
  if (!card) {
    return (
      <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        Unknown Lovable card: {type}
      </div>
    );
  }

  const bound = Boolean(binding);

  return (
    <CardLiveContext.Provider value={binding ?? null}>
      <article
        className="card-surface relative overflow-hidden p-4 rise"
        style={{ background: card.bg, minHeight: 260 }}
      >
        <div className="mb-3">
          <div className="text-sm font-semibold text-foreground">{label ?? card.label}</div>
          <div className="text-[11px] text-muted-foreground">{hint ?? card.hint}</div>
          {meta && (
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-primary">
              Lovable Visual {meta.deck} · {meta.deckName}
            </div>
          )}
        </div>
        <div className={`flex h-44 gap-0 ${bound ? "items-stretch" : ""}`}>
          {bound && binding ? <LiveRead binding={binding} /> : null}
          <div className="relative min-h-0 min-w-0 flex-1">{card.render()}</div>
        </div>
      </article>
    </CardLiveContext.Provider>
  );
}

/** Registry map: each Lovable card type → json-render component. */
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
