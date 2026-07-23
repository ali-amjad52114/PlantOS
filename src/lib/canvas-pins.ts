/** Chat → canvas pin board types (see lessons/PLAN_CHAT_CANVAS_PINS.md). */

import type { VisualizationSpec } from "@/lib/catalog";
import type {
  PlantTowerCardRef,
  PlantTowerPayload,
} from "@/lib/plant-tower";

export type CanvasPinKind = "card" | "viz" | "finding" | "tower" | "findings";

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
  x: number;
  y: number;
  w?: number;
  h?: number;
};

export const CANVAS_DND_MIME = "application/x-plantos-canvas-pin";

export type CanvasPinDraft = {
  kind: CanvasPinKind;
  payload: CanvasPinPayload;
  sourceMessageId?: string;
};

export const CARD_PIN_W = 300;
export const CARD_PIN_H = 320;
export const CARD_PIN_GAP = 16;

export function newPinId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `pin_${crypto.randomUUID()}`;
  }
  return `pin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Cascade for a single new pin — does not reshuffle existing pins. */
export function nextCascadePosition(existing: CanvasPin[]) {
  const i = existing.length;
  return {
    x: 16 + (i % 3) * 24,
    y: 16 + (i % 4) * 24,
  };
}

function defaultSize(kind: CanvasPinKind): { w: number; h: number } {
  if (kind === "card" || kind === "finding") return { w: CARD_PIN_W, h: CARD_PIN_H };
  if (kind === "viz") return { w: 320, h: 260 };
  return { w: CARD_PIN_W, h: CARD_PIN_H };
}

export function createPin(
  draft: CanvasPinDraft,
  existing: CanvasPin[],
  at?: { x: number; y: number }
): CanvasPin {
  const pos = at ?? nextCascadePosition(existing);
  const size = defaultSize(draft.kind);
  return {
    id: newPinId(),
    sourceMessageId: draft.sourceMessageId,
    kind: draft.kind,
    payload: draft.payload,
    x: pos.x,
    y: pos.y,
    w: size.w,
    h: size.h,
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
 * Land / refresh a bound tower as **four independent card pins**.
 * Updates bindings in place — never moves or resizes existing pins.
 */
export function upsertBoundTowerAsCards(
  existing: CanvasPin[],
  tower: PlantTowerPayload
): CanvasPin[] {
  let next = [...existing];
  // Drop legacy whole-tower pin for this question if present.
  const legacyId = `bound_${tower.mode ?? tower.role}_q${tower.questionIndex ?? 0}`;
  next = next.filter((p) => p.id !== legacyId);

  tower.cards.forEach((card, i) => {
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
    const col = i % 2;
    const row = Math.floor(i / 2);
    next.push({
      id,
      kind: "card",
      payload,
      x: 16 + col * (CARD_PIN_W + CARD_PIN_GAP),
      y: 16 + row * (CARD_PIN_H + CARD_PIN_GAP),
      w: CARD_PIN_W,
      h: CARD_PIN_H,
    });
  });
  return next;
}

/** @deprecated use upsertBoundTowerAsCards */
export function upsertBoundTowerPin(existing: CanvasPin[], tower: PlantTowerPayload): CanvasPin[] {
  return upsertBoundTowerAsCards(existing, tower);
}

/** Expand a tower draft into individual card pins (e.g. accidental whole-tower pin). */
export function expandTowerIntoCardPins(
  existing: CanvasPin[],
  tower: PlantTowerPayload,
  sourceMessageId?: string,
  at?: { x: number; y: number }
): CanvasPin[] {
  let next = [...existing];
  const origin = at ?? nextCascadePosition(existing);
  tower.cards.forEach((card, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const draft = cardDraftFromTower(tower, card, sourceMessageId);
    next.push({
      ...createPin(draft, next, {
        x: origin.x + col * (CARD_PIN_W + CARD_PIN_GAP),
        y: origin.y + row * (CARD_PIN_H + CARD_PIN_GAP),
      }),
    });
  });
  return next;
}
