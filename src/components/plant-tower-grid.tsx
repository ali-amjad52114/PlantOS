"use client";

import { LovableCardView } from "@/components/lovable-viz/LovableCardView";
import { CHAT_DEFAULT_CHART_LIMIT } from "@/lib/chat-visual-budget";
import type { PlantTowerPayload } from "@/lib/plant-tower";

export function PlantTowerGrid({
  tower,
  maxCards = CHAT_DEFAULT_CHART_LIMIT,
}: {
  tower: PlantTowerPayload;
  /** Chat defaults to one chart; pass a higher cap only when the user asked for more. */
  maxCards?: number;
}) {
  const bound = tower.source === "question-map";
  const cards = tower.cards.slice(0, Math.max(1, maxCards));
  return (
    <div className="my-2 space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {tower.deckName}
            {tower.mode ? ` · ${tower.mode}` : ` · ${tower.role}`}
          </p>
        </div>
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {bound
            ? `Q${(tower.questionIndex ?? 0) + 1} · ${tower.elapsedMs ?? "—"}ms`
            : "durable tower"}
        </span>
      </div>
      {tower.question && (
        <p className="text-[11px] text-muted-foreground">{tower.question}</p>
      )}
      <div className={`grid gap-3 ${cards.length > 1 ? "sm:grid-cols-2" : ""}`}>
        {cards.map((c) => (
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
