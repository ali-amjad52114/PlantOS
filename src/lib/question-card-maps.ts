import type { ShellMode } from "@/components/plant-shell";
import { LOVABLE_CARD_META } from "@/components/lovable-viz/card-meta";
import { MODE_QUESTIONS } from "@/lib/shell-prompts";
import type { PlantRole } from "@/lib/plant-tower";

export type QuestionIndex = 0 | 1 | 2;

export type QuestionCardMap = {
  mode: ShellMode;
  q: QuestionIndex;
  question: string;
  deck: number;
  deckName: string;
  role: PlantRole;
  cardTypes: [string, string, string, string];
};

function agentRoleForMode(mode: ShellMode): PlantRole {
  if (mode === "finance") return "finance";
  if (mode === "operations") return "operations";
  return "engineer";
}

function metaFor(type: string) {
  const m = LOVABLE_CARD_META.find((c) => c.type === type);
  if (!m) throw new Error(`Unknown card type in question map: ${type}`);
  return m;
}

function entry(
  mode: ShellMode,
  q: QuestionIndex,
  deck: number,
  deckName: string,
  cardTypes: [string, string, string, string]
): QuestionCardMap {
  cardTypes.forEach((t) => metaFor(t));
  return {
    mode,
    q,
    question: MODE_QUESTIONS[mode][q],
    deck,
    deckName,
    role: agentRoleForMode(mode),
    cardTypes,
  };
}

/** Eval fixtures only — golden expected card types for the 15 starter strings.
 * Runtime selection uses `rankSelectVisuals` / `selectVisuals` (not these maps).
 */
export const QUESTION_CARD_MAPS: QuestionCardMap[] = [
  // Overview
  entry("overview", 0, 7, "Plant-wide live", [
    "GeneratorOutput",
    "TurbineSpeed",
    "BoilerPressure",
    "ClosestToLimit",
  ]),
  entry("overview", 1, 10, "Closest to limits", [
    "ClosestToLimit",
    "AssetRadar",
    "ActiveAlerts",
    "UnitHealthGrid",
  ]),
  entry("overview", 2, 7, "Gen · turbine · boiler", [
    "GeneratorOutput",
    "TurbineSpeed",
    "BoilerPressure",
    "ThroughputTimeline",
  ]),
  // Engineer — Q1 = Lovable visual 11 (Hydro & feed = Replit wind pack → plant data)
  entry("engineer", 0, 11, "Hydro & feed", [
    "HydroUnit",
    "HydroEnergyBars",
    "ComponentTemps",
    "PowerAndTarget",
  ]),
  entry("engineer", 1, 10, "Attention", [
    "ClosestToLimit",
    "AssetRadar",
    "BearingVibration",
    "ThermalSignature",
  ]),
  entry("engineer", 2, 7, "Boiler · steam trends", [
    "BoilerPressure",
    "GeneratorOutput",
    "ThroughputTimeline",
    "ClosestToLimit",
  ]),
  // Operations
  entry("operations", 0, 9, "Shift command", [
    "ShiftComparison",
    "AreaUtilization",
    "ShiftAlerts",
    "ShiftThroughput",
  ]),
  entry("operations", 1, 9, "Capacity util", [
    "ShiftThroughput",
    "AreaUtilization",
    "ProductionVolume",
    "TargetAttainment",
  ]),
  entry("operations", 2, 9, "Shift vs target", [
    "ShiftComparison",
    "TargetAttainment",
    "ShiftThroughput",
    "ShiftAlerts",
  ]),
  // Finance — Q1 = Lovable visual 1 (Energy value) exact 4-card deck
  entry("finance", 0, 1, "Energy value", [
    "EnergyValueTrend",
    "PowerSourceMix",
    "TargetAttainment",
    "ProductionVolume",
  ]),
  entry("finance", 1, 12, "Margin vs plan", [
    "TargetAttainment",
    "EnergyValueTrend",
    "ForecastTrajectory",
    "FinanceFunnelDetail",
  ]),
  entry("finance", 2, 3, "Cost breakdown", [
    "CostMixBubbles",
    "EnergyValueTrend",
    "ValueByArea",
    "ShiftBands",
  ]),
  // Maintenance — Q1 = Lovable visual 5 (Plant floor) exact 4-card deck
  entry("maintenance", 0, 5, "Plant floor", [
    "UnitHealthGrid",
    "ThroughputTimeline",
    "QualityBreakdown",
    "ActiveAlerts",
  ]),
  entry("maintenance", 1, 10, "Highest deviation", [
    "ClosestToLimit",
    "BearingVibration",
    "ThermalSignature",
    "AssetRadar",
  ]),
  entry("maintenance", 2, 10, "Prioritize checks", [
    "UnitHealthGrid",
    "ClosestToLimit",
    "ActiveAlerts",
    "TurbineRotorCard",
  ]),
  // Safety — Q1 = Lovable visual 12 (Value by area) exact 4-card deck
  entry("safety", 0, 12, "Value by area", [
    "ValueByArea",
    "PlantValueMap",
    "FinanceFunnelDetail",
    "ForecastTrajectory",
  ]),
  entry("safety", 1, 10, "Nearest limits", [
    "ClosestToLimit",
    "AssetRadar",
    "ActiveAlerts",
    "ThermalSignature",
  ]),
  entry("safety", 2, 4, "Band violations", [
    "ActiveAlerts",
    "ClosestToLimit",
    "UnitHealthGrid",
    "AnomalyMap",
  ]),
];

export function getQuestionMap(mode: ShellMode, q: QuestionIndex): QuestionCardMap {
  const found = QUESTION_CARD_MAPS.find((m) => m.mode === mode && m.q === q);
  if (!found) throw new Error(`No question card map for ${mode} q=${q}`);
  return found;
}

export function resolveQuestionIndex(mode: ShellMode, question: string): QuestionIndex | null {
  const qs = MODE_QUESTIONS[mode];
  const idx = qs.findIndex((q) => q === question.trim());
  if (idx === 0 || idx === 1 || idx === 2) return idx;
  return null;
}

export function cardMetaForType(type: string) {
  return metaFor(type);
}
