"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
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
    binding.unit === "%" || binding.unit === "rpm" ? 1 : 2
  );
  return binding.unit && binding.unit !== "USD" ? `${n} ${binding.unit}` : n;
}

/** Live CH chip — does not replace the Lovable/Replit visual. */
function LiveChOverlay({ binding }: { binding: CardBinding }) {
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
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 rounded-b-md bg-gradient-to-t from-background/95 via-background/80 to-transparent px-2 pb-2 pt-6">
      <div
        className={`inline-flex max-w-full items-baseline gap-1.5 rounded-md border border-[color:var(--success)]/30 bg-[color:var(--success)]/10 px-2 py-1 ${
          flash ? "count-flash" : ""
        }`}
      >
        <span className="text-[9px] font-semibold uppercase tracking-wider text-[color:var(--success)]">
          CH
        </span>
        <span className="truncate text-sm font-semibold tabular text-foreground">
          {formatPrimary(binding)}
        </span>
      </div>
      {binding.caption && (
        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{binding.caption}</p>
      )}
      {binding.synthetic && (
        <p className="text-[10px] font-medium text-[color:var(--warning)]">
          Synthetic $ · MW from ClickHouse
        </p>
      )}
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
    <article
      className="card-surface relative overflow-hidden p-4 rise"
      style={{ background: card.bg, minHeight: 260 }}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-foreground">{label ?? card.label}</div>
          <div className="text-[11px] text-muted-foreground">{hint ?? card.hint}</div>
          {meta && (
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-primary">
              Lovable Visual {meta.deck} · {meta.deckName}
            </div>
          )}
        </div>
        <span
          className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold backdrop-blur ${
            bound
              ? "bg-[color:var(--success)]/15 text-[color:var(--success)]"
              : "bg-surface/70 text-foreground/70"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              bound ? "pulse-live bg-[color:var(--success)]" : "bg-muted-foreground"
            }`}
          />
          {bound ? "ClickHouse" : "Live"}
        </span>
      </div>
      {/* Always keep the Lovable/Replit visual — CH numbers overlay, never replace. */}
      <div className="relative h-44">
        {card.render()}
        {bound && binding ? <LiveChOverlay binding={binding} /> : null}
      </div>
    </article>
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
