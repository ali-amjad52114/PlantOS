import {
  cardSupportsHistorianRange,
  interactiveChartKind,
  trendTagForHistorianCard,
} from "../src/lib/historian-range";
import { REPLIT_DECK_SEEDS } from "../src/components/lovable-viz/replit-decks-data";

const LOVABLE = [
  "EnergyValueTrend",
  "PowerSourceMix",
  "TargetAttainment",
  "ProductionVolume",
  "ProcessFunnel",
  "AreaActivityGrid",
  "StreamCompare",
  "TagUpdateRate",
  "PlantHealthRadar",
  "OutputHeatmap",
  "CostMixBubbles",
  "ShiftBands",
  "AgentOrbit",
  "InferenceStreams",
  "AnomalyMap",
  "ConfidenceScore",
  "UnitHealthGrid",
  "ThroughputTimeline",
  "QualityBreakdown",
  "ActiveAlerts",
  "OeeRing",
  "EnergyProduced",
  "OffNormalRate",
  "SampleInterval",
  "GeneratorOutput",
  "TurbineSpeed",
  "BoilerPressure",
  "ClosestToLimit",
  "OutputVsDemand",
  "UtilityFlow",
  "ThermalMap",
  "VibrationSpectrum",
  "ShiftComparison",
  "AreaUtilization",
  "ShiftAlerts",
  "ShiftThroughput",
  "AssetRadar",
  "BearingVibration",
  "ThermalSignature",
  "TurbineRotorCard",
  "HydroUnit",
  "HydroEnergyBars",
  "ComponentTemps",
  "PowerAndTarget",
  "ValueByArea",
  "PlantValueMap",
  "FinanceFunnelDetail",
  "ForecastTrajectory",
];

const types = [
  ...LOVABLE,
  ...REPLIT_DECK_SEEDS.flatMap((d) => d.cards.map((c) => c.id)),
];

const yes: string[] = [];
const no: string[] = [];
for (const type of types) {
  const ok = cardSupportsHistorianRange(type);
  const line = `${type} [${interactiveChartKind(type)}] ${ok ? trendTagForHistorianCard(type) : "-"}`;
  (ok ? yes : no).push(line);
}
console.log(`WITH PLAY (${yes.length})`);
for (const x of yes) console.log(" ", x);
console.log(`WITHOUT (${no.length})`);
for (const x of no) console.log(" ", x);
