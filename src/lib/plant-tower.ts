import { LOVABLE_CARD_META } from "@/components/lovable-viz/card-meta";

export type PlantRole = "engineer" | "operations" | "finance";

export type CardBinding = {
  kind: "metric" | "series" | "list";
  primary: number;
  unit?: string;
  caption?: string;
  series?: Array<{ t: string; v: number }>;
  /** Fixed X domain for historian cards — span selected range even if series is sparse. */
  seriesWindow?: {
    startMs: number;
    endMs: number;
    minutes: number;
    live?: boolean;
  };
  items?: Array<{
    label: string;
    value: number;
    unit?: string;
    tone?: "ok" | "warning" | "danger" | "muted";
  }>;
  synthetic?: boolean;
};

export type PlantTowerCardRef = {
  type: string;
  label: string;
  hint: string;
  binding?: CardBinding | null;
};

export type PlantTowerPayload = {
  role: PlantRole;
  deck: number;
  deckName: string;
  /** 1–4 cards; chat shows ≤1, first-ask canvas ≤2. */
  cards: PlantTowerCardRef[];
  source: "role-default" | "question-map" | "selected";
  mode?: string;
  questionIndex?: number;
  question?: string;
  dataSource?: string;
  elapsedMs?: number;
  /** Keys for the findings strip (≤4). */
  findingsKeys?: string[];
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
