"use client";

import type { ReactNode } from "react";
import { DECKS } from "./PlantVisualDeck";
import { LOVABLE_CARD_META } from "./card-meta";

const cardByType = Object.fromEntries(
  DECKS.flatMap((d) => d.cards.map((c) => [c.id, { ...c, roleHint: d.roleHint, deckName: d.name }]))
);

export function LovableCardView({
  type,
  label,
  hint,
}: {
  type: string;
  label?: string | null;
  hint?: string | null;
}) {
  const card = cardByType[type];
  const meta = LOVABLE_CARD_META.find((m) => m.type === type);
  if (!card) {
    return (
      <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-4 text-sm text-zinc-400">
        Unknown Lovable card: {type}
      </div>
    );
  }
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
            <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
              Deck {meta.deck} · {meta.roleHint}
            </div>
          )}
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-surface/70 px-2 py-0.5 text-[10px] font-semibold text-foreground/70 backdrop-blur">
          <span className="pulse-live h-1.5 w-1.5 rounded-full bg-[color:var(--success)]" />
          Live
        </span>
      </div>
      <div className="relative h-44">{card.render()}</div>
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
