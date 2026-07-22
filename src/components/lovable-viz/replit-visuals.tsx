import type { ReactElement } from "react";

export type ReplitVisualCard = {
  id: string;
  label: string;
  hint: string;
  bg: string;
  render: () => ReactElement;
};

export type ReplitVisualDeck = {
  name: string;
  tag: string;
  roleHint: "engineer" | "operations" | "finance";
  cards: ReplitVisualCard[];
};

type Seed = { id: string; label: string; hint: string };

const palette = ["#34d399", "#38bdf8", "#fb923c", "#a78bfa"];
const values = [72, 88, 64, 93, 79, 57];

function Bars({ color = palette[0], horizontal = false }: { color?: string; horizontal?: boolean }) {
  return (
    <div className={horizontal ? "space-y-2 pt-2" : "flex h-full items-end gap-1.5 pt-3"}>
      {values.map((v, i) =>
        horizontal ? (
          <div key={i} className="flex items-center gap-2">
            <span className="w-12 text-[8px] uppercase text-muted-foreground">{["Boiler", "Turbine", "Gen", "Water", "Steam", "Hydro"][i]}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full" style={{ width: `${v}%`, background: color }} /></div>
            <span className="w-7 text-right font-mono text-[9px]">{v}%</span>
          </div>
        ) : (
          <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${v}%`, background: `linear-gradient(${color}, ${color}35)` }} />
        )
      )}
    </div>
  );
}

function Line({ color = palette[1], second = false }: { color?: string; second?: boolean }) {
  return (
    <svg viewBox="0 0 240 110" className="h-full w-full" role="img" aria-label="Seed trend preview">
      {[20, 45, 70, 95].map((y) => <line key={y} x1="4" x2="236" y1={y} y2={y} stroke="currentColor" opacity=".08" />)}
      <path d="M4 83 C28 76 38 45 62 55 S98 92 121 67 S158 27 181 42 S213 65 236 29" fill="none" stroke={color} strokeWidth="3" />
      {second && <path d="M4 92 C31 80 49 75 72 77 S112 52 139 58 S184 44 236 49" fill="none" stroke={palette[2]} strokeWidth="2" strokeDasharray="5 4" />}
    </svg>
  );
}

function Ring({ value = 78, color = palette[0] }: { value?: number; color?: string }) {
  return (
    <div className="grid h-full place-items-center">
      <div className="grid h-32 w-32 place-items-center rounded-full" style={{ background: `conic-gradient(${color} ${value * 3.6}deg, rgba(255,255,255,.06) 0)` }}>
        <div className="grid h-24 w-24 place-items-center rounded-full bg-[#111416] text-center shadow-inner">
          <div><div className="text-2xl font-semibold">{value}%</div><div className="text-[8px] uppercase tracking-widest text-muted-foreground">within band</div></div>
        </div>
      </div>
    </div>
  );
}

function Tank({ color = palette[1], level = 68 }: { color?: string; level?: number }) {
  return (
    <div className="flex h-full items-center justify-center gap-5">
      <div className="relative h-36 w-24 overflow-hidden rounded-b-3xl rounded-t-lg border-2 border-white/15 bg-black/20">
        <div className="absolute inset-x-0 bottom-0 transition-all" style={{ height: `${level}%`, background: `linear-gradient(180deg, ${color}80, ${color})` }} />
        {[25, 50, 75].map((n) => <span key={n} className="absolute left-2 right-2 border-t border-dashed border-white/25" style={{ bottom: `${n}%` }} />)}
      </div>
      <div className="space-y-2 text-xs"><div className="text-3xl font-light">{level}<span className="text-sm text-muted-foreground">%</span></div><div className="font-mono text-[9px] text-muted-foreground">P1_LIT01 · RAW SCALE</div><span className="inline-flex rounded-full bg-emerald-400/10 px-2 py-1 text-[9px] text-emerald-300">NORMAL BAND</span></div>
    </div>
  );
}

function Rotor() {
  return (
    <div className="grid h-full place-items-center">
      <div className="relative grid h-32 w-32 place-items-center rounded-full border border-orange-300/25 bg-orange-400/5 shadow-[0_0_45px_rgba(251,146,60,.12)]">
        {[0, 120, 240].map((r) => <div key={r} className="absolute h-2 w-24 origin-center rounded-full bg-gradient-to-r from-transparent via-orange-300/60 to-transparent" style={{ transform: `rotate(${r}deg)` }} />)}
        <div className="z-10 grid h-16 w-16 place-items-center rounded-full border border-orange-300/40 bg-[#161412] text-center"><div><div className="text-lg">815</div><div className="text-[8px] text-orange-300">RPM</div></div></div>
      </div>
    </div>
  );
}

function Heatmap() {
  return <div className="grid h-full grid-cols-8 gap-1 p-2">{Array.from({ length: 48 }, (_, i) => <div key={i} className="rounded-sm" style={{ background: `color-mix(in srgb, ${palette[i % 4]} ${28 + ((i * 17) % 65)}%, #16181b)` }} />)}</div>;
}

function Feed() {
  return <div className="space-y-2 pt-2">{["Boiler pressure nearing watch band", "Steam demand changed", "Generator output below target", "Water loop stable"].map((x, i) => <div key={x} className="flex items-center gap-2 rounded-lg border border-white/7 bg-white/[.025] p-2"><span className="h-2 w-2 rounded-full" style={{ background: palette[(i + 2) % 4] }} /><span className="flex-1 text-[10px]">{x}</span><span className="font-mono text-[8px] text-muted-foreground">{i + 1}m</span></div>)}</div>;
}

function Process() {
  return <div className="flex h-full items-center justify-between gap-1">{["Demand", "Boiler", "Steam", "Turbine", "MW out"].map((x, i) => <div key={x} className="contents"><div className="grid h-20 flex-1 place-items-center rounded-xl border border-white/10 bg-white/[.035] text-center"><div><div className="text-lg" style={{ color: palette[i % 4] }}>{[92, 88, 84, 81, 79][i]}%</div><div className="text-[8px] uppercase text-muted-foreground">{x}</div></div></div>{i < 4 && <span className="text-muted-foreground">›</span>}</div>)}</div>;
}

function DeviceStrip() {
  return <div className="grid h-full grid-cols-2 gap-2">{["Boiler", "Turbine", "Generator", "Water"].map((x, i) => <div key={x} className="flex flex-col justify-between rounded-xl border border-white/10 bg-white/[.03] p-3"><div className="flex items-center justify-between"><span className="text-xs font-medium">{x}</span><span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" /></div><div className="text-2xl">{[0.97, 815, 279, 68][i]}<span className="ml-1 text-[9px] text-muted-foreground">{["bar", "rpm", "MW", "%"][i]}</span></div><div className="text-[8px] uppercase text-muted-foreground">Live seed · nominal</div></div>)}</div>;
}

function Finance() {
  return <div className="grid h-full grid-cols-2 gap-3"><div className="flex flex-col justify-between rounded-xl bg-emerald-400/10 p-4"><span className="text-[9px] uppercase text-emerald-300">Synthetic demo</span><strong className="text-3xl">$68<span className="text-sm font-normal">/MWh</span></strong><span className="text-[9px] text-muted-foreground">Illustrative cost assumption</span></div><div className="flex flex-col justify-between rounded-xl border border-white/10 p-3"><Line color={palette[0]} /><span className="text-[8px] uppercase text-muted-foreground">Margin proxy trend</span></div></div>;
}

function renderVisual(type: string) {
  if (/Tank|Level/.test(type)) return <Tank />;
  if (/Rotor|Gauge|Speedometer|Donut|Ring/.test(type)) return /Rotor/.test(type) ? <Rotor /> : <Ring value={type.length % 2 ? 84 : 76} color={palette[type.length % 4]} />;
  if (/Heat|Matrix|Thermal|Spectrum/.test(type)) return <Heatmap />;
  if (/Feed|Attention/.test(type)) return <Feed />;
  if (/Process|Funnel|Pipeline/.test(type)) return <Process />;
  if (/Device|AreaHealth|Reliability|Scorecard|State|Range/.test(type)) return <DeviceStrip />;
  if (/Cost|Finance|Margin|Value/.test(type)) return <Finance />;
  if (/Trend|Chart|Timeline|Throughput|Output|Power|Energy|Vib/.test(type)) return <Line second />;
  return <Bars horizontal={type.length % 2 === 0} color={palette[type.length % 4]} />;
}

function cards(seeds: Seed[]): ReplitVisualCard[] {
  return seeds.map((seed, i) => ({ ...seed, bg: `radial-gradient(circle at ${75 - (i % 3) * 20}% 10%, ${palette[i % 4]}18, transparent 48%), #111315`, render: () => renderVisual(seed.id) }));
}

const deck = (name: string, tag: string, roleHint: ReplitVisualDeck["roleHint"], seeds: Seed[]): ReplitVisualDeck => ({ name, tag, roleHint, cards: cards(seeds) });
const s = (id: string, label: string, hint: string): Seed => ({ id, label, hint });

export const REPLIT_DECKS: ReplitVisualDeck[] = [
  deck("Boiler equipment", "REPLIT · EQUIPMENT", "engineer", [s("BoilerPressureFace", "Boiler pressure face", "P1_PIT01 · operating band"), s("BoilerThermalFace", "Boiler thermal face", "P1_TIT01/02 · raw trend"), s("BoilerLevelTank", "Boiler level tank", "P1_LIT01 · raw scale"), s("BoilerValvesFlow", "Boiler valves & flow", "P1_FCV03Z · P1_FT01")]),
  deck("Turbine equipment", "REPLIT · EQUIPMENT", "engineer", [s("TurbineRotorFace", "Turbine rotor face", "P2_SIT01 · rpm"), s("TurbineVibSpectrumFace", "Turbine vibration spectrum", "P2_VT* · seeded bins"), s("TurbineVibTrend", "Turbine vibration trend", "P2_VT01e · recent window"), s("TurbineState", "Turbine state", "P2_On · P2_Auto")]),
  deck("Steam generator", "REPLIT · EQUIPMENT", "engineer", [s("GeneratorOutputFace", "Generator output face", "P4_ST_PO · MW"), s("GeneratorLoadFace", "Generator load face", "P4_ST_LD · demand"), s("SteamCondition", "Steam condition", "P4_ST_PT01 · P4_ST_TT01 raw"), s("SteamFeedTrend", "Steam feed trend", "P4_ST_FD · recent window")]),
  deck("Hydro equipment", "REPLIT · EQUIPMENT", "engineer", [s("HydroPowerFace", "Hydro power face", "P4_HT_PO · MW"), s("HydroGaugeFace", "Hydro contribution gauge", "Hydro share of generation"), s("HydroTrend", "Hydro power trend", "P4_HT_PO · recent window"), s("HydroVsSteamFace", "Hydro vs steam", "P4_HT_PO · P4_ST_PO")]),
  deck("Water treatment", "REPLIT · EQUIPMENT", "engineer", [s("WaterLevelTank", "Water level tank", "P3_LIT01 · raw scale"), s("WaterLimits", "Water operating limits", "P3_LIT01 · band position"), s("WaterValve", "Water valve face", "P3_LCV01D · demand"), s("WaterLevelTrend", "Water level trend", "P3_LIT01 · recent window")]),
  deck("Ops set 1", "REPLIT · OPS", "operations", [s("AreaHealthArcs", "Area health arcs", "Boiler · turbine · gen · water"), s("ThroughputTimelineOps", "Generation hero timeline", "Shift MWh · actual vs target"), s("QualityRingsOps", "Attention-rate rings", "Normal vs attention share"), s("AttentionFeed", "Plant attention feed", "Prioritized area findings"), s("ShiftBarsOps", "Shift energy bars", "Actual vs planned MWh"), s("OeeSpeedometer", "Plant effectiveness", "Availability · output · cadence")]),
  deck("Ops set 2", "REPLIT · OPS", "operations", [s("ProcessFunnelOps", "Plant process pipeline", "Demand → steam → turbine → MW"), s("HourlyEnergyBars", "Hourly energy bars", "MWh by hour"), s("StageEfficiency", "Stage efficiency", "Conversion across plant stages"), s("AttentionPareto", "Attention by area", "Pause/watch reasons"), s("YieldTrend", "Target attainment trend", "Delivered vs planned energy"), s("CadenceGauges", "Tag cadence gauges", "Sample interval health")]),
  deck("Ops set 3", "REPLIT · OPS", "operations", [s("ThermalHeatmapOps", "Thermal heatmap", "Raw temperature signal field"), s("VibChartOps", "Vibration chart", "P2_VT* trend"), s("AreaReliability", "Area reliability", "Four-area status"), s("FaultRadar", "Attention radar", "Signal families under watch"), s("OutageWindows", "Pause windows", "Replay and attention intervals"), s("EnergyUsageBars", "Auxiliary energy bars", "Demo plant energy proxy")]),
  deck("Ops set 4", "REPLIT · OPS", "operations", [s("YieldDonut", "Target attainment donut", "Shift MWh completion"), s("CostPerMwhDemo", "Demo cost per MWh", "Synthetic assumptions"), s("AreaVsTargetBullets", "Area vs target", "Contribution bullets"), s("WasteAttentionTrend", "Attention trend", "Off-normal share over time"), s("ShiftScorecard", "Shift scorecard", "Output · cadence · attention"), s("OutputHeatMatrix", "Output heat matrix", "MWh intensity by interval")]),
  deck("Generation rotor I", "REPLIT · GENERATION", "engineer", [s("RotorFaceplate", "Rotating machine faceplate", "P2_SIT01 · RUN/AUTO"), s("GenPowerChart", "Generation power chart", "Steam and hydro MW"), s("BearingTemp", "Bearing temperature", "Seeded engineering preview"), s("AmbientTemp", "Ambient temperature", "Seeded engineering preview")]),
  deck("Generation rotor II", "REPLIT · GENERATION", "engineer", [s("RotorTemp", "Rotor temperature", "Seeded engineering preview"), s("StatorTemp", "Stator temperature", "P4_ST_TT01 · raw scale"), s("EnergyStat", "Shift energy", "MWh from generation"), s("TargetGauge", "Generation target gauge", "Shift attainment")]),
  deck("Role response I", "REPLIT · RESPONSES", "engineer", [s("EngineerFinding", "Engineer key finding", "Evidence-led attention summary"), s("DeviceStrip", "Plant device strip", "Four-area live status"), s("RangeBars", "Operating range bars", "Current position vs band"), s("IdleGenStrip", "Idle plant status", "Question-ready live overview")]),
  deck("Role response II", "REPLIT · RESPONSES", "operations", [s("OpsShiftDonut", "Operations shift donut", "MWh completion"), s("RateChart", "Generation rate chart", "Actual vs target MW"), s("AreaUtil", "Area utilization", "Boiler · turbine · gen · water")]),
  deck("Role response III", "REPLIT · RESPONSES", "finance", [s("FinanceValueHero", "Demo value hero", "Synthetic shift value"), s("CostMix", "Demo cost mix", "Energy · labor · fixed assumptions"), s("MarginTrend", "Demo margin trend", "Synthetic projection")]),
];

