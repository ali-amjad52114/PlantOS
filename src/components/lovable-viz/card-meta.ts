/** Flat catalog of Lovable→PlantOS cards. Question wiring comes later. */
import { REPLIT_DECK_SEEDS } from "./replit-decks-data";

export type CardFamily = "lovable" | "replit";

export type LovableCardMeta = {
  type: string;
  label: string;
  hint: string;
  deck: number;
  deckName: string;
  roleHint: "engineer" | "operations" | "finance";
  description: string;
  /** Visual priority family: lovable first, then replit. */
  family: CardFamily;
  /** Optional selector hints; primary corpus is `visual-catalog` enrichment. */
  answers?: string[];
  metrics?: string[];
  shape?: string;
};

const BASE_LOVABLE_CARD_META: LovableCardMeta[] = [
  // Deck 1 — Energy value (finance)
  { type: "EnergyValueTrend", label: "Shift energy value", hint: "$ from P4_ST_PO × price", deck: 1, deckName: "Energy value", roleHint: "finance", family: "lovable", description: "Live $ energy value with mini trend. Finance." },
  { type: "PowerSourceMix", label: "Steam vs hydro mix", hint: "ST_PO vs HT_PO share", deck: 1, deckName: "Energy value", roleHint: "finance", family: "lovable", description: "Donut mix of steam vs hydro power share. Finance." },
  { type: "TargetAttainment", label: "Target attainment", hint: "MWh vs shift target", deck: 1, deckName: "Energy value", roleHint: "finance", family: "lovable", description: "Ring gauge for shift target attainment %. Finance." },
  { type: "ProductionVolume", label: "Production volume", hint: "Recent MW pulse", deck: 1, deckName: "Energy value", roleHint: "finance", family: "lovable", description: "Bar pulse of recent production volume. Finance." },
  // Deck 2 — Throughput funnel (ops)
  { type: "ProcessFunnel", label: "Process funnel", hint: "Demand → steam → MW", deck: 2, deckName: "Throughput funnel", roleHint: "operations", family: "lovable", description: "Funnel from demand to MW out. Operations." },
  { type: "AreaActivityGrid", label: "Area activity", hint: "Boiler · turbine · water · gen", deck: 2, deckName: "Throughput funnel", roleHint: "operations", family: "lovable", description: "Dot grid of area activity. Operations." },
  { type: "StreamCompare", label: "Stream compare", hint: "Tag families side-by-side", deck: 2, deckName: "Throughput funnel", roleHint: "operations", family: "lovable", description: "Waveform stack comparing streams. Operations." },
  { type: "TagUpdateRate", label: "Tag update rate", hint: "Live sample velocity", deck: 2, deckName: "Throughput funnel", roleHint: "operations", family: "lovable", description: "Big number for tag/sample velocity. Operations." },
  // Deck 3 — Cost & risk (finance)
  { type: "PlantHealthRadar", label: "Plant health radar", hint: "Cost · margin · uptime · target", deck: 3, deckName: "Cost & risk posture", roleHint: "finance", family: "lovable", description: "Radar of cost/margin/uptime/target. Finance." },
  { type: "OutputHeatmap", label: "Output heatmap", hint: "Intensity by hour/shift", deck: 3, deckName: "Cost & risk posture", roleHint: "finance", family: "lovable", description: "Heatmap of output intensity. Finance." },
  { type: "CostMixBubbles", label: "Cost mix", hint: "Energy · labour · fixed", deck: 3, deckName: "Cost & risk posture", roleHint: "finance", family: "lovable", description: "Bubble mix of energy/labour/fixed cost. Finance." },
  { type: "ShiftBands", label: "Shift bands", hint: "On-target · watch · short", deck: 3, deckName: "Cost & risk posture", roleHint: "finance", family: "lovable", description: "Progress rings for shift bands. Finance." },
  // Deck 4 — Agent signals
  { type: "AgentOrbit", label: "Agent orbit", hint: "Engineer · ops · finance agents", deck: 4, deckName: "Agent signals", roleHint: "engineer", family: "lovable", description: "Orbit rings for agent activity. Engineer." },
  { type: "InferenceStreams", label: "Inference streams", hint: "Live investigate signals", deck: 4, deckName: "Agent signals", roleHint: "engineer", family: "lovable", description: "Streaming inference lines. Engineer." },
  { type: "AnomalyMap", label: "Anomaly map", hint: "Tags watched for drift", deck: 4, deckName: "Agent signals", roleHint: "engineer", family: "lovable", description: "Constellation anomaly map. Engineer." },
  { type: "ConfidenceScore", label: "Confidence", hint: "Route / finding confidence", deck: 4, deckName: "Agent signals", roleHint: "engineer", family: "lovable", description: "Confidence gauge for findings. Engineer." },
  // Deck 5 — Plant floor
  { type: "UnitHealthGrid", label: "Unit health grid", hint: "RUN · FAULT · IDLE · MAINT", deck: 5, deckName: "Plant floor", roleHint: "operations", family: "lovable", description: "Machine/unit health grid. Operations." },
  { type: "ThroughputTimeline", label: "Throughput timeline", hint: "Actual vs target rate", deck: 5, deckName: "Plant floor", roleHint: "operations", family: "lovable", description: "Throughput area chart vs target. Operations." },
  { type: "QualityBreakdown", label: "Quality breakdown", hint: "First pass · rework · scrap", deck: 5, deckName: "Plant floor", roleHint: "operations", family: "lovable", description: "Nested quality rings. Operations." },
  { type: "ActiveAlerts", label: "Active alerts", hint: "Open attention items", deck: 5, deckName: "Plant floor", roleHint: "operations", family: "lovable", description: "Alert feed list. Operations." },
  // Deck 6 — OEE
  { type: "OeeRing", label: "Overall equipment effectiveness", hint: "vs plant goal", deck: 6, deckName: "OEE scoreboard", roleHint: "operations", family: "lovable", description: "Big OEE ring. Operations." },
  { type: "EnergyProduced", label: "Energy produced today", hint: "MWh on pace", deck: 6, deckName: "OEE scoreboard", roleHint: "operations", family: "lovable", description: "Big MWh produced number. Operations." },
  { type: "OffNormalRate", label: "Off-normal rate", hint: "Attention share", deck: 6, deckName: "OEE scoreboard", roleHint: "operations", family: "lovable", description: "Off-normal % BigNumber. Operations." },
  { type: "SampleInterval", label: "Sample interval", hint: "Replay / live cadence", deck: 6, deckName: "OEE scoreboard", roleHint: "operations", family: "lovable", description: "Sample interval BigNumber. Operations." },
  // Deck 7 — Turbine hall
  { type: "GeneratorOutput", label: "Generator output", hint: "P4_ST_PO MW", deck: 7, deckName: "Turbine hall", roleHint: "engineer", family: "lovable", description: "Generator MW BigNumber (P4_ST_PO). Engineer." },
  { type: "TurbineSpeed", label: "Turbine speed", hint: "P2_SIT01 rpm", deck: 7, deckName: "Turbine hall", roleHint: "engineer", family: "lovable", description: "Spinning turbine rotor rpm. Engineer." },
  { type: "BoilerPressure", label: "Boiler pressure", hint: "P1_PIT01", deck: 7, deckName: "Turbine hall", roleHint: "engineer", family: "lovable", description: "Boiler pressure BigNumber. Engineer." },
  { type: "ClosestToLimit", label: "Closest to limit", hint: "Load · speed · pressure · water", deck: 7, deckName: "Turbine hall", roleHint: "engineer", family: "lovable", description: "Condition bars near limits. Engineer." },
  // Deck 8 — Process signals
  { type: "OutputVsDemand", label: "Output vs demand", hint: "Last 30 minutes", deck: 8, deckName: "Process signals", roleHint: "engineer", family: "lovable", description: "Dual line output vs demand. Engineer." },
  { type: "UtilityFlow", label: "Utility flow", hint: "Steam · water · fuel", deck: 8, deckName: "Process signals", roleHint: "engineer", family: "lovable", description: "Animated pipe utility flow. Engineer." },
  { type: "ThermalMap", label: "Thermal map", hint: "Temp field proxy", deck: 8, deckName: "Process signals", roleHint: "engineer", family: "lovable", description: "Thermal heatmap grid. Engineer." },
  { type: "VibrationSpectrum", label: "Vibration spectrum", hint: "P2_VT* bins", deck: 8, deckName: "Process signals", roleHint: "engineer", family: "lovable", description: "FFT-style vibration bars. Engineer." },
  // Deck 9 — Shift command
  { type: "ShiftComparison", label: "Shift comparison", hint: "Planned vs actual MWh", deck: 9, deckName: "Shift command", roleHint: "operations", family: "lovable", description: "Planned vs actual shift bars. Operations." },
  { type: "AreaUtilization", label: "Area utilization", hint: "Four plant areas", deck: 9, deckName: "Shift command", roleHint: "operations", family: "lovable", description: "Area utilization rings. Operations." },
  { type: "ShiftAlerts", label: "Shift alerts", hint: "Prioritized attention", deck: 9, deckName: "Shift command", roleHint: "operations", family: "lovable", description: "Shift alert feed. Operations." },
  { type: "ShiftThroughput", label: "Shift throughput", hint: "vs target line", deck: 9, deckName: "Shift command", roleHint: "operations", family: "lovable", description: "Shift throughput timeline. Operations." },
  // Deck 10 — Reliability
  { type: "AssetRadar", label: "Asset radar", hint: "Five subsystems", deck: 10, deckName: "Reliability", roleHint: "engineer", family: "lovable", description: "Asset subsystem radar. Engineer." },
  { type: "BearingVibration", label: "Bearing vibration", hint: "Spike watch", deck: 10, deckName: "Reliability", roleHint: "engineer", family: "lovable", description: "Bearing vibration spectrum. Engineer." },
  { type: "ThermalSignature", label: "Thermal signature", hint: "Zone heat map", deck: 10, deckName: "Reliability", roleHint: "engineer", family: "lovable", description: "Thermal signature map. Engineer." },
  { type: "TurbineRotorCard", label: "Turbine rotor", hint: "P2_SIT01 live rpm", deck: 10, deckName: "Reliability", roleHint: "engineer", family: "lovable", description: "Turbine rotor rpm visual. Engineer." },
  // Deck 11 — Hydro & feed
  { type: "HydroUnit", label: "Hydro unit", hint: "P4_HT_PO faceplate", deck: 11, deckName: "Hydro & feed", roleHint: "engineer", family: "lovable", description: "Hydro unit faceplate visual. Engineer." },
  { type: "HydroEnergyBars", label: "Steam · hydro MW", hint: "P4_ST_PO bars · P4_HT_PO line", deck: 11, deckName: "Hydro & feed", roleHint: "engineer", family: "lovable", description: "Steam MW bars with hydro MW overlay. Engineer." },
  { type: "ComponentTemps", label: "Component temps", hint: "Bearing · ambient · rotor · stator", deck: 11, deckName: "Hydro & feed", roleHint: "engineer", family: "lovable", description: "Component temperature chips. Engineer." },
  { type: "PowerAndTarget", label: "Power · target", hint: "P4_ST_PO vs shift target", deck: 11, deckName: "Hydro & feed", roleHint: "engineer", family: "lovable", description: "Half gauge + target progress. Engineer." },
  // Deck 12 — Value by area (finance)
  { type: "ValueByArea", label: "Value by area", hint: "Boiler · turbine · gen · water $", deck: 12, deckName: "Value by area", roleHint: "finance", family: "lovable", description: "Semi-donut value by plant area. Finance." },
  { type: "PlantValueMap", label: "Plant value map", hint: "Density by area", deck: 12, deckName: "Value by area", roleHint: "finance", family: "lovable", description: "Heat-blob plant value map. Finance." },
  { type: "FinanceFunnelDetail", label: "Value funnel detail", hint: "Booked · on target · at risk", deck: 12, deckName: "Value by area", roleHint: "finance", family: "lovable", description: "Finance KPIs + river stream. Finance." },
  { type: "ForecastTrajectory", label: "Forecast trajectory", hint: "Actual vs plan S-curve", deck: 12, deckName: "Value by area", roleHint: "finance", family: "lovable", description: "S-curve actual vs plan forecast. Finance." },
];

const REPLIT_CARD_META: LovableCardMeta[] = REPLIT_DECK_SEEDS.flatMap((deck, deckIndex) =>
  deck.cards.map((card) => ({
    type: card.id,
    label: card.label,
    hint: card.hint,
    deck: 13 + deckIndex,
    deckName: deck.name,
    roleHint: deck.roleHint,
    family: "replit" as const,
    description: `${card.label}. ${deck.roleHint} Replit-derived visual with PlantOS-worded seed data.`,
  }))
);

export const LOVABLE_CARD_META: LovableCardMeta[] = [
  ...BASE_LOVABLE_CARD_META,
  ...REPLIT_CARD_META,
];

export const LOVABLE_CARD_TYPES = LOVABLE_CARD_META.map((c) => c.type);
