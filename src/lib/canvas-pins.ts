/** Chat → canvas pins — 2-column grid slots (see lessons/PLAN_CHAT_CANVAS_PINS.md). */

import type { VisualizationSpec } from "@/lib/catalog";
import type {
  PlantTowerCardRef,
  PlantTowerPayload,
} from "@/lib/plant-tower";

export type CanvasPinKind = "card" | "viz" | "finding" | "tower" | "findings";

/**
 * How many grid boxes a chart occupies on a 2-column canvas:
 * - `1` — one box (half row)
 * - `2` — two horizontal boxes (full row)
 */
export type CanvasSpan = 1 | 2;

export type CardPinMeta = {
  deck?: number;
  deckName?: string;
  mode?: string;
  questionIndex?: number;
  role?: string;
  source?: string;
};

export type FindingItemPayload = {
  tag: string;
  label: string;
  value: number;
  unit?: string;
  normalMin?: number;
  normalMax?: number;
  outside?: boolean;
};

/** @deprecated whole-tower / whole-findings — prefer card / finding */
export type FindingsPinPayload = {
  label: string;
  kind: "engineer" | "operations" | "finance";
  data: unknown;
};

export type CanvasPinPayload =
  | { kind: "card"; card: PlantTowerCardRef; meta?: CardPinMeta }
  | { kind: "viz"; spec: VisualizationSpec }
  | { kind: "finding"; item: FindingItemPayload }
  | { kind: "tower"; tower: PlantTowerPayload }
  | { kind: "findings"; findings: FindingsPinPayload };

export type CanvasPin = {
  id: string;
  sourceMessageId?: string;
  kind: CanvasPinKind;
  payload: CanvasPinPayload;
  /** Flow order on the 2-column grid (lower = earlier). */
  order: number;
  /** Slot footprint: 1 | 2-wide. */
  span: CanvasSpan;
  /** @deprecated free-float — ignored by grid canvas */
  x?: number;
  y?: number;
  w?: number;
  h?: number;
};

export const CANVAS_DND_MIME = "application/x-plantos-canvas-pin";
export const CANVAS_REORDER_MIME = "application/x-plantos-canvas-reorder";

export type CanvasPinDraft = {
  kind: CanvasPinKind;
  payload: CanvasPinPayload;
  sourceMessageId?: string;
};

export function newPinId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `pin_${crypto.randomUUID()}`;
  }
  return `pin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function nextOrder(existing: CanvasPin[]) {
  if (!existing.length) return 0;
  return Math.max(...existing.map((p) => p.order)) + 1;
}

export function normalizeSpan(span: number | undefined): CanvasSpan {
  return span === 2 ? 2 : 1;
}

export function spanLabel(span: CanvasSpan) {
  return span === 2 ? "2 wide" : "1 box";
}

export function cycleSpan(span: CanvasSpan): CanvasSpan {
  return span === 1 ? 2 : 1;
}

export function gridStyleForSpan(span: CanvasSpan): { gridColumn: string; gridRow: string } {
  if (span === 2) return { gridColumn: "span 2", gridRow: "span 1" };
  return { gridColumn: "span 1", gridRow: "span 1" };
}

export function createPin(draft: CanvasPinDraft, existing: CanvasPin[]): CanvasPin {
  return {
    id: newPinId(),
    sourceMessageId: draft.sourceMessageId,
    kind: draft.kind,
    payload: draft.payload,
    order: nextOrder(existing),
    span: 1,
  };
}

export function cardDraftFromTower(
  tower: PlantTowerPayload,
  card: PlantTowerCardRef,
  sourceMessageId?: string
): CanvasPinDraft {
  return {
    kind: "card",
    sourceMessageId,
    payload: {
      kind: "card",
      card,
      meta: {
        deck: tower.deck,
        deckName: tower.deckName,
        mode: tower.mode,
        questionIndex: tower.questionIndex,
        role: tower.role,
        source: tower.source,
      },
    },
  };
}

export function boundCardPinId(tower: PlantTowerPayload, cardType: string) {
  const mode = tower.mode ?? tower.role;
  const q = tower.questionIndex ?? 0;
  return `bound_${mode}_q${q}_${cardType}`;
}

/**
 * Land / refresh a bound tower as independent card pins on the grid.
 * Updates bindings only — never changes order/span; never resurrects dismissed ids.
 */
export function upsertBoundTowerAsCards(
  existing: CanvasPin[],
  tower: PlantTowerPayload,
  dismissedIds?: ReadonlySet<string>
): CanvasPin[] {
  let next = [...existing];
  const legacyId = `bound_${tower.mode ?? tower.role}_q${tower.questionIndex ?? 0}`;
  next = next.filter((p) => p.id !== legacyId);

  tower.cards.forEach((card) => {
    const id = boundCardPinId(tower, card.type);
    const payload: CanvasPinPayload = {
      kind: "card",
      card,
      meta: {
        deck: tower.deck,
        deckName: tower.deckName,
        mode: tower.mode,
        questionIndex: tower.questionIndex,
        role: tower.role,
        source: tower.source,
      },
    };
    const idx = next.findIndex((p) => p.id === id);
    if (idx >= 0) {
      next[idx] = { ...next[idx], kind: "card", payload };
      return;
    }
    if (dismissedIds?.has(id)) return;

    next.push({
      id,
      kind: "card",
      payload,
      order: nextOrder(next),
      span: 1,
    });
  });
  return next;
}

export function clearDismissedForBoundQuestion(
  dismissed: Set<string>,
  mode: string,
  questionIndex: number
) {
  const prefix = `bound_${mode}_q${questionIndex}_`;
  for (const id of [...dismissed]) {
    if (id.startsWith(prefix)) dismissed.delete(id);
  }
}

/** @deprecated */
export function upsertBoundTowerPin(
  existing: CanvasPin[],
  tower: PlantTowerPayload,
  dismissedIds?: ReadonlySet<string>
): CanvasPin[] {
  return upsertBoundTowerAsCards(existing, tower, dismissedIds);
}

export function expandTowerIntoCardPins(
  existing: CanvasPin[],
  tower: PlantTowerPayload,
  sourceMessageId?: string
): CanvasPin[] {
  let next = [...existing];
  for (const card of tower.cards) {
    const draft = cardDraftFromTower(tower, card, sourceMessageId);
    next = [...next, createPin(draft, next)];
  }
  return next;
}

/** Swap flow order of two pins (grid reorder). */
export function swapPinOrder(pins: CanvasPin[], aId: string, bId: string): CanvasPin[] {
  const a = pins.find((p) => p.id === aId);
  const b = pins.find((p) => p.id === bId);
  if (!a || !b || aId === bId) return pins;
  return pins.map((p) => {
    if (p.id === aId) return { ...p, order: b.order };
    if (p.id === bId) return { ...p, order: a.order };
    return p;
  });
}

export function setPinSpan(pins: CanvasPin[], id: string, span: CanvasSpan): CanvasPin[] {
  const next = normalizeSpan(span);
  return pins.map((p) => (p.id === id ? { ...p, span: next } : p));
}

export function sortedPins(pins: CanvasPin[]) {
  return [...pins].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}
