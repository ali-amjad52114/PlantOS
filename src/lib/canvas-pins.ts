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

/** Stable key so chat can hide a visual after it is moved onto the canvas. */
export function chatPinSourceKey(draft: CanvasPinDraft): string {
  const src = draft.sourceMessageId ?? "nosrc";
  const p = draft.payload;
  if (p.kind === "card") return `card:${src}:${p.card.type}`;
  if (p.kind === "finding") return `finding:${src}:${p.item.tag}`;
  if (p.kind === "viz") return `viz:${src}:${p.spec.root || "root"}`;
  if (p.kind === "tower") {
    const mode = p.tower.mode ?? p.tower.role ?? "role";
    return `tower:${src}:${mode}:q${p.tower.questionIndex ?? 0}:d${p.tower.deck}`;
  }
  if (p.kind === "findings") return `findings:${src}:${p.findings.kind}`;
  return `${draft.kind}:${src}`;
}

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
 * @param opts.maxCards — only consider the first N cards (first-ask = 2).
 * @param opts.addMissing — if false, only refresh bindings on pins already on the board.
 */
export function upsertBoundTowerAsCards(
  existing: CanvasPin[],
  tower: PlantTowerPayload,
  dismissedIds?: ReadonlySet<string>,
  opts?: { maxCards?: number; addMissing?: boolean }
): CanvasPin[] {
  let next = [...existing];
  const legacyId = `bound_${tower.mode ?? tower.role}_q${tower.questionIndex ?? 0}`;
  next = next.filter((p) => p.id !== legacyId);

  const addMissing = opts?.addMissing !== false;
  const cards =
    opts?.maxCards != null ? tower.cards.slice(0, opts.maxCards) : tower.cards;

  cards.forEach((card) => {
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
    if (!addMissing) return;
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

/** First ask may land up to this many charts (parallel brief uses 4; typical asks select 2). */
export const FIRST_ASK_CANVAS_CARD_COUNT = 4;

/** Pins created by first-ask / bound-tower auto-land (safe to replace on a new first ask). */
export function isAutoBoundCanvasPin(pin: CanvasPin): boolean {
  if (pin.kind === "card" && pin.payload.kind === "card") {
    const src = pin.payload.meta?.source;
    if (src === "selected" || src === "question-map" || src === "role-default") return true;
    if (pin.id.startsWith("bound_")) return true;
  }
  return false;
}

/** Drop prior auto-landed cards, then land ≤maxCards from the new tower. */
export function replaceFirstAskCanvasPins(
  existing: CanvasPin[],
  tower: PlantTowerPayload,
  dismissedIds?: ReadonlySet<string>,
  maxCards = FIRST_ASK_CANVAS_CARD_COUNT
): CanvasPin[] {
  const cleared = existing.filter((p) => !isAutoBoundCanvasPin(p));
  return upsertBoundTowerAsCards(cleared, tower, dismissedIds, {
    maxCards,
    addMissing: true,
  });
}

export function questionTowerHideKey(
  tower: Pick<PlantTowerPayload, "mode" | "role" | "questionIndex" | "source" | "deck" | "cards">
) {
  if (tower.source === "selected") {
    const types = (tower.cards ?? []).map((c) => c.type).join("+");
    return `selected:${tower.role}:d${tower.deck ?? 0}:${types}`;
  }
  if (tower.source === "role-default") {
    return `role-default:${tower.role}:d${tower.deck ?? 0}`;
  }
  const mode = tower.mode ?? tower.role;
  return `${mode}:q${tower.questionIndex ?? 0}`;
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
