"use client";

import { LovableCardView } from "@/components/lovable-viz/LovableCardView";
import type { PlantTowerPayload } from "@/lib/plant-tower";

export function PlantTowerGrid({ tower }: { tower: PlantTowerPayload }) {
  const bound = tower.source === "question-map";
  return (
    <div className="my-2 space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
        <span className="font-medium text-primary">
          {tower.deckName} · {tower.mode ?? tower.role}
        </span>
        <span className="uppercase tracking-wide text-muted-foreground">
          Deck {tower.deck}
          {bound
            ? ` · Q${(tower.questionIndex ?? 0) + 1} · ${tower.dataSource ?? "ch"} · ${tower.elapsedMs ?? "—"}ms`
            : " · durable tower"}
        </span>
      </div>
      {tower.question && (
        <p className="text-[11px] text-muted-foreground">{tower.question}</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {tower.cards.map((c) => (
          <LovableCardView
            key={`${c.type}-${c.label}`}
            type={c.type}
            label={c.label}
            hint={c.hint}
            binding={c.binding}
          />
        ))}
      </div>
    </div>
  );
}
