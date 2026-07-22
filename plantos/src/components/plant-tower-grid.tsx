"use client";

import { LovableCardView } from "@/components/lovable-viz/LovableCardView";
import type { PlantTowerPayload } from "@/lib/plant-tower";

export function PlantTowerGrid({ tower }: { tower: PlantTowerPayload }) {
  return (
    <div className="my-2 space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
        <span className="font-medium text-emerald-300">
          {tower.deckName} · {tower.role}
        </span>
        <span className="uppercase tracking-wide text-zinc-500">
          Deck {tower.deck} · durable tower
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {tower.cards.map((c) => (
          <LovableCardView key={c.type} type={c.type} label={c.label} hint={c.hint} />
        ))}
      </div>
    </div>
  );
}
