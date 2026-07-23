/** Server-safe Replit deck metadata (no React / no "use client"). */

export type ReplitRoleHint = "engineer" | "operations" | "finance";

export type ReplitCardSeed = {
  id: string;
  label: string;
  hint: string;
};

export type ReplitDeckSeed = {
  name: string;
  tag: string;
  roleHint: ReplitRoleHint;
  cards: ReplitCardSeed[];
};

const s = (id: string, label: string, hint: string): ReplitCardSeed => ({ id, label, hint });

const deck = (
  name: string,
  tag: string,
  roleHint: ReplitRoleHint,
  cards: ReplitCardSeed[]
): ReplitDeckSeed => ({ name, tag, roleHint, cards });

export const REPLIT_DECK_SEEDS: ReplitDeckSeed[] = [
  deck("Boiler equipment", "REPLIT · EQUIPMENT", "engineer", [
    s("BoilerPressureFace", "Boiler pressure face", "P1_PIT01 · operating band"),
    s("BoilerThermalFace", "Boiler thermal face", "P1_TIT01/02 · raw trend"),
    s("BoilerLevelTank", "Boiler level tank", "P1_LIT01 · raw scale"),
    s("BoilerValvesFlow", "Boiler valves & flow", "P1_FCV03Z · P1_FT01"),
  ]),
  deck("Turbine equipment", "REPLIT · EQUIPMENT", "engineer", [
    s("TurbineRotorFace", "Turbine rotor face", "P2_SIT01 · rpm"),
    s("TurbineVibSpectrumFace", "Turbine vibration spectrum", "P2_VT* · seeded bins"),
    s("TurbineVibTrend", "Turbine vibration trend", "P2_VT01e · recent window"),
    s("TurbineState", "Turbine state", "P2_On · P2_Auto"),
  ]),
  deck("Steam generator", "REPLIT · EQUIPMENT", "engineer", [
    s("GeneratorOutputFace", "Generator output face", "P4_ST_PO · MW"),
    s("GeneratorLoadFace", "Generator load face", "P4_ST_LD · demand"),
    s("SteamCondition", "Steam condition", "P4_ST_PT01 · P4_ST_TT01 raw"),
    s("SteamFeedTrend", "Steam feed trend", "P4_ST_FD · recent window"),
  ]),
  deck("Hydro equipment", "REPLIT · EQUIPMENT", "engineer", [
    s("HydroPowerFace", "Hydro power face", "P4_HT_PO · MW"),
    s("HydroGaugeFace", "Hydro contribution gauge", "Hydro share of generation"),
    s("HydroTrend", "Hydro power trend", "P4_HT_PO · recent window"),
    s("HydroVsSteamFace", "Hydro vs steam", "P4_HT_PO · P4_ST_PO"),
  ]),
  deck("Water treatment", "REPLIT · EQUIPMENT", "engineer", [
    s("WaterLevelTank", "Water level tank", "P3_LIT01 · raw scale"),
    s("WaterLimits", "Water operating limits", "P3_LIT01 · band position"),
    s("WaterValve", "Water valve face", "P3_LCV01D · demand"),
    s("WaterLevelTrend", "Water level trend", "P3_LIT01 · recent window"),
  ]),
  deck("Ops set 1", "REPLIT · OPS", "operations", [
    s("AreaHealthArcs", "Area health arcs", "Boiler · turbine · gen · water"),
    s("ThroughputTimelineOps", "Generation hero timeline", "Shift MWh · actual vs target"),
    s("QualityRingsOps", "Attention-rate rings", "Normal vs attention share"),
    s("AttentionFeed", "Plant attention feed", "Prioritized area findings"),
    s("ShiftBarsOps", "Shift energy bars", "Actual vs planned MWh"),
    s("OeeSpeedometer", "Plant effectiveness", "Availability · output · cadence"),
  ]),
  deck("Ops set 2", "REPLIT · OPS", "operations", [
    s("ProcessFunnelOps", "Plant process pipeline", "Demand → steam → turbine → MW"),
    s("HourlyEnergyBars", "Hourly energy bars", "MWh by hour"),
    s("StageEfficiency", "Stage efficiency", "Conversion across plant stages"),
    s("AttentionPareto", "Attention by area", "Pause/watch reasons"),
    s("YieldTrend", "Target attainment trend", "Delivered vs planned energy"),
    s("CadenceGauges", "Tag cadence gauges", "Sample interval health"),
  ]),
  deck("Ops set 3", "REPLIT · OPS", "operations", [
    s("ThermalHeatmapOps", "Thermal heatmap", "Raw temperature signal field"),
    s("VibChartOps", "Vibration chart", "P2_VT* trend"),
    s("AreaReliability", "Area reliability", "Four-area status"),
    s("FaultRadar", "Attention radar", "Signal families under watch"),
    s("OutageWindows", "Pause windows", "Replay and attention intervals"),
    s("EnergyUsageBars", "Auxiliary energy bars", "Demo plant energy proxy"),
  ]),
  deck("Ops set 4", "REPLIT · OPS", "operations", [
    s("YieldDonut", "Target attainment donut", "Shift MWh completion"),
    s("CostPerMwhDemo", "Demo cost per MWh", "Synthetic assumptions"),
    s("AreaVsTargetBullets", "Area vs target", "Contribution bullets"),
    s("WasteAttentionTrend", "Attention trend", "Off-normal share over time"),
    s("ShiftScorecard", "Shift scorecard", "Output · cadence · attention"),
    s("OutputHeatMatrix", "Output heat matrix", "MWh intensity by interval"),
  ]),
  deck("Generation rotor I", "REPLIT · GENERATION", "engineer", [
    s("RotorFaceplate", "Rotating machine faceplate", "P2_SIT01 · RUN/AUTO"),
    s("GenPowerChart", "Generation power chart", "Steam and hydro MW"),
    s("BearingTemp", "Bearing temperature", "Seeded engineering preview"),
    s("AmbientTemp", "Ambient temperature", "Seeded engineering preview"),
  ]),
  deck("Generation rotor II", "REPLIT · GENERATION", "engineer", [
    s("RotorTemp", "Rotor temperature", "Seeded engineering preview"),
    s("StatorTemp", "Stator temperature", "P4_ST_TT01 · raw scale"),
    s("EnergyStat", "Shift energy", "MWh from generation"),
    s("TargetGauge", "Generation target gauge", "Shift attainment"),
  ]),
  deck("Role response I", "REPLIT · RESPONSES", "engineer", [
    s("EngineerFinding", "Engineer key finding", "Evidence-led attention summary"),
    s("DeviceStrip", "Plant device strip", "Four-area live status"),
    s("RangeBars", "Operating range bars", "Current position vs band"),
    s("IdleGenStrip", "Idle plant status", "Question-ready live overview"),
  ]),
  deck("Role response II", "REPLIT · RESPONSES", "operations", [
    s("OpsShiftDonut", "Operations shift donut", "MWh completion"),
    s("RateChart", "Generation rate chart", "Actual vs target MW"),
    s("AreaUtil", "Area utilization", "Boiler · turbine · gen · water"),
  ]),
  deck("Role response III", "REPLIT · RESPONSES", "finance", [
    s("FinanceValueHero", "Demo value hero", "Synthetic shift value"),
    s("CostMix", "Demo cost mix", "Energy · labor · fixed assumptions"),
    s("MarginTrend", "Demo margin trend", "Synthetic projection"),
  ]),
];
