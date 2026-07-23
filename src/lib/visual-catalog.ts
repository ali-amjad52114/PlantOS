/**
 * Compact visual catalog + deterministic ranker.
 * Any question → best Lovable/Replit/Ignition cards + findings keys (no per-question maps).
 */
import { LOVABLE_CARD_META } from "@/components/lovable-viz/card-meta";
import {
  CHAT_DEFAULT_READING_LIMIT,
  CHAT_PRELOAD_CHART_SOFT_MAX,
} from "@/lib/chat-visual-budget";
import type { PlantRole } from "@/lib/plant-tower";

export type CardShape =
  | "trend"
  | "gauge"
  | "mix"
  | "list"
  | "funnel"
  | "radar"
  | "heatmap"
  | "grid"
  | "faceplate"
  | "bars"
  | "number"
  | "symbol";

export type SelectorFamily = "lovable" | "replit" | "ignition";

export type SelectorCard = {
  type: string;
  family: SelectorFamily;
  roleHint: PlantRole;
  answers: string[];
  metrics: string[];
  shape: CardShape;
  description: string;
  label: string;
  hint: string;
  deck: number;
  deckName: string;
};

type Enrichment = {
  answers: string[];
  metrics: string[];
  shape: CardShape;
};

/** Intent/metric tags per Lovable card type (selector corpus). */
const LOVABLE_ENRICHMENT: Record<string, Enrichment> = {
  EnergyValueTrend: {
    answers: ["production worth", "energy value", "revenue", "today value", "shift value", "$"],
    metrics: ["productionValueUSD", "P4_ST_PO"],
    shape: "trend",
  },
  PowerSourceMix: {
    answers: ["steam vs hydro", "power mix", "source share", "generation mix"],
    metrics: ["P4_ST_PO", "P4_HT_PO"],
    shape: "mix",
  },
  TargetAttainment: {
    answers: ["target", "attainment", "vs plan", "margin vs plan", "planned revenue", "shift target", "%"],
    metrics: ["percentOfTarget", "plannedRevenue", "marginUSD"],
    shape: "gauge",
  },
  ProductionVolume: {
    answers: ["production volume", "MW pulse", "output volume", "throughput volume"],
    metrics: ["P4_ST_PO", "shiftProductionMWh"],
    shape: "bars",
  },
  ProcessFunnel: {
    answers: ["process funnel", "demand to mw", "throughput funnel"],
    metrics: ["currentRateMW", "shiftProductionMWh"],
    shape: "funnel",
  },
  AreaActivityGrid: {
    answers: ["area activity", "plant areas", "boiler turbine water gen"],
    metrics: ["areaUtilization"],
    shape: "grid",
  },
  StreamCompare: {
    answers: ["stream compare", "tag families", "side by side streams"],
    metrics: ["tagSeries"],
    shape: "trend",
  },
  TagUpdateRate: {
    answers: ["tag update", "sample velocity", "feed rate"],
    metrics: ["sampleInterval"],
    shape: "number",
  },
  PlantHealthRadar: {
    answers: ["plant health", "cost margin uptime", "risk posture"],
    metrics: ["marginUSD", "costPerMWh", "percentOfTarget"],
    shape: "radar",
  },
  OutputHeatmap: {
    answers: ["output heatmap", "intensity by hour", "shift intensity"],
    metrics: ["shiftProductionMWh"],
    shape: "heatmap",
  },
  CostMixBubbles: {
    answers: [
      "cost mix",
      "operating cost",
      "energy labour fixed",
      "cost breakdown",
      "variable vs fixed",
      "variable energy",
      "labour and fixed",
      "break down operating cost",
    ],
    metrics: ["operatingCostUSD", "costBreakdown"],
    shape: "mix",
  },
  ShiftBands: {
    answers: ["shift bands", "on target watch short", "band status"],
    metrics: ["percentOfTarget"],
    shape: "gauge",
  },
  AgentOrbit: {
    answers: ["agent activity", "orbit", "multi agent"],
    metrics: ["agentSignals"],
    shape: "radar",
  },
  InferenceStreams: {
    answers: ["inference", "investigate signals", "live streams"],
    metrics: ["agentSignals"],
    shape: "trend",
  },
  AnomalyMap: {
    answers: ["anomaly", "drift", "band violations", "outside normal", "safety"],
    metrics: ["attention", "outside"],
    shape: "grid",
  },
  ConfidenceScore: {
    answers: ["confidence", "finding confidence"],
    metrics: ["confidence"],
    shape: "gauge",
  },
  UnitHealthGrid: {
    answers: ["unit health", "equipment health", "run fault idle", "maintenance", "plant floor"],
    metrics: ["unitHealth"],
    shape: "grid",
  },
  ThroughputTimeline: {
    answers: ["throughput", "actual vs target", "rate timeline", "production rate"],
    metrics: ["currentRateMW", "percentOfTarget"],
    shape: "trend",
  },
  QualityBreakdown: {
    answers: ["quality", "first pass rework scrap"],
    metrics: ["quality"],
    shape: "mix",
  },
  ActiveAlerts: {
    answers: ["alerts", "attention items", "open alerts", "prioritize", "safety"],
    metrics: ["attention", "outside"],
    shape: "list",
  },
  OeeRing: {
    answers: ["oee", "equipment effectiveness"],
    metrics: ["oee"],
    shape: "gauge",
  },
  EnergyProduced: {
    answers: ["energy produced", "mwh today", "energy today"],
    metrics: ["shiftProductionMWh"],
    shape: "number",
  },
  OffNormalRate: {
    answers: ["off normal", "attention share", "abnormal rate"],
    metrics: ["attention", "outside"],
    shape: "number",
  },
  SampleInterval: {
    answers: ["sample interval", "cadence", "replay interval"],
    metrics: ["sampleInterval"],
    shape: "number",
  },
  GeneratorOutput: {
    answers: ["generator", "status", "mw output", "P4_ST_PO", "plant-wide", "overview"],
    metrics: ["P4_ST_PO"],
    shape: "number",
  },
  TurbineSpeed: {
    answers: ["turbine", "speed", "rpm", "P2_SIT01", "status", "health"],
    metrics: ["P2_SIT01"],
    shape: "gauge",
  },
  BoilerPressure: {
    answers: ["boiler", "pressure", "P1_PIT01", "steam", "trends"],
    metrics: ["P1_PIT01"],
    shape: "number",
  },
  ClosestToLimit: {
    answers: [
      "closest to limit",
      "nearest limits",
      "operating limits",
      "attention",
      "deviation",
      "maintenance",
      "maintenance attention",
      "need maintenance",
      "safety",
      "outside band",
      "which tags",
      "tags closest",
    ],
    metrics: ["attention", "outside", "normalMin", "normalMax"],
    shape: "list",
  },
  OutputVsDemand: {
    answers: ["output vs demand", "load", "last 30 minutes"],
    metrics: ["P4_ST_PO", "P4_ST_LD"],
    shape: "trend",
  },
  UtilityFlow: {
    answers: ["utility flow", "steam water fuel", "pipe flow"],
    metrics: ["utilityFlow"],
    shape: "faceplate",
  },
  ThermalMap: {
    answers: ["thermal", "temperature map", "heat"],
    metrics: ["temperature"],
    shape: "heatmap",
  },
  VibrationSpectrum: {
    answers: ["vibration", "fft", "P2_VT", "spectrum"],
    metrics: ["P2_VT"],
    shape: "bars",
  },
  ShiftComparison: {
    answers: ["shift comparison", "planned vs actual", "meeting target", "shift production"],
    metrics: ["shiftProductionMWh", "percentOfTarget"],
    shape: "bars",
  },
  AreaUtilization: {
    answers: ["area utilization", "capacity", "bottleneck", "plant areas"],
    metrics: ["capacityUtilizationPct", "bottleneckArea"],
    shape: "gauge",
  },
  ShiftAlerts: {
    answers: ["shift alerts", "prioritized attention", "ops alerts"],
    metrics: ["attention"],
    shape: "list",
  },
  ShiftThroughput: {
    answers: ["shift throughput", "vs target", "capacity utilization", "mw rate"],
    metrics: ["currentRateMW", "percentOfTarget"],
    shape: "trend",
  },
  AssetRadar: {
    answers: ["asset radar", "subsystems", "reliability", "health", "highest deviation"],
    metrics: ["unitHealth", "attention"],
    shape: "radar",
  },
  BearingVibration: {
    answers: ["bearing", "vibration spike", "maintenance deviation"],
    metrics: ["P2_VT"],
    shape: "bars",
  },
  ThermalSignature: {
    answers: ["thermal signature", "zone heat", "maintenance"],
    metrics: ["temperature"],
    shape: "heatmap",
  },
  TurbineRotorCard: {
    answers: ["turbine rotor", "rpm live", "prioritize checks"],
    metrics: ["P2_SIT01"],
    shape: "faceplate",
  },
  HydroUnit: {
    answers: ["hydro", "P4_HT_PO", "hydro unit", "generator status"],
    metrics: ["P4_HT_PO"],
    shape: "faceplate",
  },
  HydroEnergyBars: {
    answers: ["steam hydro", "generation bars", "hydro energy", "status overview"],
    metrics: ["P4_ST_PO", "P4_HT_PO"],
    shape: "bars",
  },
  ComponentTemps: {
    answers: ["component temps", "bearing ambient rotor stator"],
    metrics: ["temperature"],
    shape: "grid",
  },
  PowerAndTarget: {
    answers: ["power target", "mw vs shift target", "generator status"],
    metrics: ["P4_ST_PO", "percentOfTarget"],
    shape: "gauge",
  },
  ValueByArea: {
    answers: ["value by area", "area dollars", "where value"],
    metrics: ["productionValueUSD"],
    shape: "mix",
  },
  PlantValueMap: {
    answers: ["plant value map", "value density", "area value"],
    metrics: ["productionValueUSD"],
    shape: "heatmap",
  },
  FinanceFunnelDetail: {
    answers: ["margin", "planned revenue", "value funnel", "booked on target at risk", "margin vs plan"],
    metrics: ["marginUSD", "plannedRevenue", "varianceVsPlanUSD", "productionValueUSD"],
    shape: "funnel",
  },
  ForecastTrajectory: {
    answers: ["forecast", "actual vs plan", "s-curve", "margin vs plan", "planned revenue"],
    metrics: ["plannedRevenue", "projectedShiftValue", "varianceVsPlanUSD"],
    shape: "trend",
  },
};

const IGNITION_CARDS: SelectorCard[] = [
  {
    type: "TimeSeriesChart",
    family: "ignition",
    roleHint: "engineer",
    answers: ["trend over time", "history", "tag history"],
    metrics: ["series"],
    shape: "trend",
    description: "Ignition-style time series trend.",
    label: "Time series",
    hint: "Tag history",
    deck: 0,
    deckName: "Ignition",
  },
  {
    type: "Gauge",
    family: "ignition",
    roleHint: "engineer",
    answers: ["dial", "gauge reading", "analog"],
    metrics: ["primary"],
    shape: "gauge",
    description: "Semi-circular industrial gauge.",
    label: "Gauge",
    hint: "Analog dial",
    deck: 0,
    deckName: "Ignition",
  },
  {
    type: "LedDisplay",
    family: "ignition",
    roleHint: "engineer",
    answers: ["numeric readout", "led", "live value"],
    metrics: ["primary"],
    shape: "number",
    description: "LED numeric readout.",
    label: "LED display",
    hint: "Live value",
    deck: 0,
    deckName: "Ignition",
  },
];

const FAMILY_WEIGHT: Record<SelectorFamily, number> = {
  lovable: 12,
  replit: 6,
  ignition: 2,
};

const STOP = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "to",
  "of",
  "for",
  "this",
  "that",
  "is",
  "are",
  "what",
  "how",
  "does",
  "do",
  "from",
  "with",
  "vs",
  "on",
  "in",
  "at",
  "be",
  "by",
  "me",
  "my",
  "we",
  "our",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9$_%]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

function buildLovableSelectorCards(): SelectorCard[] {
  return LOVABLE_CARD_META.map((meta) => {
    const enrich =
      meta.family === "lovable"
        ? LOVABLE_ENRICHMENT[meta.type]
        : {
            answers: [meta.label, meta.hint, meta.deckName, meta.roleHint],
            metrics: tokenize(meta.hint).filter((t) => t.startsWith("p") || t.includes("_")),
            shape: "faceplate" as CardShape,
          };
    return {
      type: meta.type,
      family: meta.family,
      roleHint: meta.roleHint,
      answers: enrich?.answers ?? [meta.label, meta.description],
      metrics: enrich?.metrics ?? [],
      shape: enrich?.shape ?? "trend",
      description: meta.description,
      label: meta.label,
      hint: meta.hint,
      deck: meta.deck,
      deckName: meta.deckName,
    };
  });
}

let _catalog: SelectorCard[] | null = null;

export function getVisualCatalog(): SelectorCard[] {
  if (!_catalog) _catalog = [...buildLovableSelectorCards(), ...IGNITION_CARDS];
  return _catalog;
}

/** Compact rows for agent prompts (not full props schemas). */
export function visualCatalogPromptSection(): string {
  const rows = getVisualCatalog()
    .filter((c) => c.family === "lovable" || c.family === "replit")
    .map(
      (c) =>
        `- ${c.type} [${c.family}/${c.roleHint}/${c.shape}] answers=${c.answers.slice(0, 4).join("|")} · ${c.description}`
    )
    .join("\n");
  return `## Visual catalog (selectVisuals ranks these — prefer Lovable)\n${rows}`;
}

export type SelectVisualsInput = {
  question: string;
  role: PlantRole;
  summary?: string;
  /** Optional model hints; still re-ranked. */
  preferredTypes?: string[];
  /** Max cards to return (canvas soft max default). */
  limit?: number;
};

export type SelectVisualsResult = {
  cardTypes: string[];
  findingsKeys: string[];
  rationale: string;
  scores: Array<{ type: string; score: number; family: SelectorFamily }>;
  deck: number;
  deckName: string;
  cards: Array<{ type: string; label: string; hint: string }>;
};

function scoreCard(
  card: SelectorCard,
  tokens: string[],
  role: PlantRole,
  preferred: Set<string>
): number {
  let score = FAMILY_WEIGHT[card.family];
  if (card.roleHint === role) score += 8;
  else if (
    (role === "engineer" && card.roleHint === "operations") ||
    (role === "operations" && card.roleHint === "engineer")
  ) {
    score += 1;
  } else {
    score -= 4;
  }

  const hay = tokenize(
    [...card.answers, ...card.metrics, card.label, card.hint, card.description, card.deckName].join(
      " "
    )
  );
  const haySet = new Set(hay);
  for (const t of tokens) {
    if (haySet.has(t)) score += 3;
    else if (hay.some((h) => h.includes(t) || t.includes(h))) score += 1;
  }

  // Phrase boost: multi-word answers
  const qLower = tokens.join(" ");
  for (const phrase of card.answers) {
    const p = phrase.toLowerCase();
    if (p.length > 3 && qLower.includes(p.replace(/\s+/g, " "))) score += 10;
    const phraseTokens = tokenize(phrase);
    if (phraseTokens.length >= 2 && phraseTokens.every((pt) => tokens.includes(pt))) {
      score += 6;
    }
  }

  if (preferred.has(card.type)) score += 15;
  return score;
}

/** Role metric registry → findings strip keys (≤4). */
export function selectFindingsKeys(question: string, role: PlantRole): string[] {
  const q = question.toLowerCase();
  const tokens = new Set(tokenize(question));

  if (role === "finance") {
    if (
      q.includes("margin") ||
      q.includes("planned") ||
      q.includes("plan") ||
      q.includes("revenue") ||
      tokens.has("variance")
    ) {
      return ["marginUSD", "plannedRevenue", "varianceVsPlanUSD", "productionValueUSD"].slice(
        0,
        CHAT_DEFAULT_READING_LIMIT
      );
    }
    if (q.includes("cost") || q.includes("labour") || q.includes("fixed") || q.includes("variable")) {
      return ["operatingCostUSD", "variableEnergy", "labourAndFixed", "costPerMWh"].slice(
        0,
        CHAT_DEFAULT_READING_LIMIT
      );
    }
    return ["productionValueUSD", "operatingCostUSD", "marginUSD"].slice(
      0,
      CHAT_DEFAULT_READING_LIMIT
    );
  }

  if (role === "operations") {
    if (q.includes("bottleneck") || q.includes("capacity") || q.includes("utilization")) {
      return ["currentRateMW", "capacityUtilizationPct", "bottleneckArea", "percentOfTarget"].slice(
        0,
        CHAT_DEFAULT_READING_LIMIT
      );
    }
    return ["currentRateMW", "percentOfTarget", "capacityUtilizationPct", "bottleneckArea"].slice(
      0,
      CHAT_DEFAULT_READING_LIMIT
    );
  }

  // engineer (+ overview/maintenance/safety mapped to engineer tools)
  if (
    q.includes("limit") ||
    q.includes("attention") ||
    q.includes("deviation") ||
    q.includes("outside") ||
    q.includes("safety") ||
    q.includes("maintenance")
  ) {
    return ["attention"].slice(0, CHAT_DEFAULT_READING_LIMIT);
  }
  return ["attention"].slice(0, CHAT_DEFAULT_READING_LIMIT);
}

export function rankSelectVisuals(input: SelectVisualsInput): SelectVisualsResult {
  const limit = Math.max(1, Math.min(input.limit ?? CHAT_PRELOAD_CHART_SOFT_MAX, 4));
  const text = `${input.question} ${input.summary ?? ""}`;
  const tokens = tokenize(text);
  const preferred = new Set(input.preferredTypes ?? []);
  const catalog = getVisualCatalog();

  const scored = catalog
    .map((card) => ({
      card,
      score: scoreCard(card, tokens, input.role, preferred),
    }))
    .sort((a, b) => b.score - a.score);

  const picked: SelectorCard[] = [];
  for (const row of scored) {
    if (picked.length >= limit) break;
    if (row.score < 6 && picked.length > 0) break;
    if (picked.some((p) => p.type === row.card.type)) continue;
    picked.push(row.card);
  }

  if (!picked.length) {
    const fallback = catalog.filter((c) => c.family === "lovable" && c.roleHint === input.role);
    picked.push(...fallback.slice(0, limit));
  }

  const findingsKeys = selectFindingsKeys(input.question, input.role);
  const primary = picked[0];
  const rationale = `Selected ${picked.map((p) => p.type).join(", ")} for “${input.question.slice(0, 80)}” (role=${input.role}; priority Lovable→Replit→Ignition).`;

  return {
    cardTypes: picked.map((p) => p.type),
    findingsKeys,
    rationale,
    scores: scored.slice(0, 8).map((s) => ({
      type: s.card.type,
      score: s.score,
      family: s.card.family,
    })),
    deck: primary?.deck ?? 0,
    deckName: primary?.deckName ?? "Selected",
    cards: picked.map((p) => ({ type: p.type, label: p.label, hint: p.hint })),
  };
}
