"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { SparkTrend } from "@/components/charts";
import { DECKS } from "./PlantVisualDeck";
import { LOVABLE_CARD_META } from "./card-meta";
import type { CardBinding } from "@/lib/plant-tower";

const cardByType = Object.fromEntries(
  DECKS.flatMap((d) => d.cards.map((c) => [c.id, { ...c, roleHint: d.roleHint, deckName: d.name }]))
);

function BindingBody({ binding }: { binding: CardBinding }) {
  const prev = useRef<number | null>(null);
  const [flash, setFlash] = useState(0);

  useEffect(() => {
    const n = Number(binding.primary);
    if (!Number.isFinite(n)) return;
    if (prev.current != null && Math.abs(n - prev.current) > 0.0001) {
      setFlash((f) => f + 1);
    }
    prev.current = n;
  }, [binding.primary]);

  const primary =
    binding.unit === "USD"
      ? `$${Math.round(binding.primary).toLocaleString()}`
      : Number.isFinite(binding.primary)
        ? binding.primary.toFixed(binding.unit === "%" || binding.unit === "rpm" ? 1 : 2)
        : "—";

  return (
    <div className="flex h-full flex-col gap-2">
      <div>
        <div
          key={flash}
          className={`text-2xl font-semibold tracking-tight tabular ${flash ? "count-flash" : ""}`}
        >
          {primary}
          {binding.unit && binding.unit !== "USD" ? (
            <span className="ml-1 text-sm font-medium text-muted-foreground">{binding.unit}</span>
          ) : null}
        </div>
        {binding.caption && (
          <p className="mt-1 text-[11px] text-muted-foreground">{binding.caption}</p>
        )}
        {binding.synthetic && (
          <p className="mt-1 text-[10px] font-medium text-[color:var(--warning)]">
            Synthetic rates · MW from ClickHouse
          </p>
        )}
      </div>
      {binding.series && binding.series.length >= 2 && (
        <div className="min-h-0 flex-1">
          <SparkTrend
            data={binding.series.map((p) => ({ ts: p.t, value: p.v }))}
            unit={binding.unit === "USD" ? "" : binding.unit || ""}
          />
        </div>
      )}
      {binding.items && binding.items.length > 0 && (
        <ul className="space-y-1 overflow-auto text-xs">
          {binding.items.map((it) => (
            <li
              key={it.label}
              className={`flex items-center justify-between gap-2 rounded-md px-2 py-1 ${
                it.tone === "danger"
                  ? "bg-[color:var(--danger)]/10"
                  : it.tone === "warning"
                    ? "bg-[color:var(--warning)]/10"
                    : "bg-muted/50"
              }`}
            >
              <span className="truncate">{it.label}</span>
              <span className="tabular shrink-0">
                {it.unit &&
                !["none", "boiler", "turbine", "generator", "water treatment"].includes(
                  String(it.unit)
                )
                  ? `${Number(it.value).toFixed(2)} ${it.unit}`
                  : it.unit && Number(it.value) === 0
                    ? it.unit
                    : `${Number(it.value).toFixed(2)}${it.unit ? ` ${it.unit}` : ""}`}
              </span>
            </li>
          ))}
        </ul>
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
            <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
              Deck {meta.deck} · {meta.roleHint}
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
      <div className="relative h-44">
        {bound && binding ? <BindingBody binding={binding} /> : card.render()}
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
