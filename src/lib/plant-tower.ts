import { LOVABLE_CARD_META } from "@/components/lovable-viz/card-meta";

export type PlantRole = "engineer" | "operations" | "finance";

export type PlantTowerCardRef = {
  type: string;
  label: string;
  hint: string;
};

export type PlantTowerPayload = {
  role: PlantRole;
  deck: number;
  deckName: string;
  cards: PlantTowerCardRef[]; // exactly 4
  source: "role-default";
};

/** Interim defaults until question→card maps exist. */
const DEFAULT_DECK_BY_ROLE: Record<PlantRole, number> = {
  engineer: 7, // Turbine hall
  operations: 9, // Shift command
  finance: 1, // Energy value
};

export function defaultPlantTower(role: PlantRole): PlantTowerPayload {
  const deck = DEFAULT_DECK_BY_ROLE[role];
  const cards = LOVABLE_CARD_META.filter((c) => c.deck === deck).slice(0, 4);
  if (cards.length !== 4) {
    throw new Error(`Default deck ${deck} for ${role} must have exactly 4 cards`);
  }
  return {
    role,
    deck,
    deckName: cards[0].deckName,
    cards: cards.map((c) => ({ type: c.type, label: c.label, hint: c.hint })),
    source: "role-default",
  };
}
