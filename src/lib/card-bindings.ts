import type { CardBinding } from "@/lib/plant-tower";
import { formatAxisTime } from "@/lib/axis-time";

type EngSnap = {
  productionMW?: number | null;
  turbineSpeed?: number | null;
  boilerPressure?: number | null;
  steamFlow?: number | null;
  dataSource?: string;
  attention?: Array<{
    tag: string;
    label: string;
    value: number;
    unit: string;
    outside?: boolean;
    score?: number;
  }>;
  trends?: {
    P4_ST_PO?: Array<{ ts?: string; value?: number }>;
    P2_SIT01?: Array<{ ts?: string; value?: number }>;
  };
  latest?: Array<{ tag: string; value: number; area?: string }>;
};

type OpsSnap = {
  currentRateMW?: number;
  shiftProductionMWh?: number;
  shiftTargetMWh?: number;
  projectedShiftMWh?: number;
  percentOfTarget?: number;
  capacityUtilizationPct?: number;
  bottleneckArea?: string;
  plantCapacityMW?: number;
  dataSource?: string;
  synthetic?: boolean;
};

type FinSnap = {
  productionValueUSD?: number;
  operatingCostUSD?: number;
  marginUSD?: number;
  costPerMWh?: number;
  plannedRevenue?: number;
  varianceVsPlanUSD?: number;
  costBreakdown?: { variableEnergy?: number; labourAndFixed?: number };
  disclaimer?: string;
  dataSource?: string;
  synthetic?: boolean;
};

export type SnapshotBundle = {
  engineer: EngSnap | any;
  operations: OpsSnap | any;
  finance: FinSnap | any;
};

function seriesFrom(
  rows: Array<{ ts?: string; value?: number }> | undefined
): Array<{ t: string; v: number }> {
  return (rows || []).slice(-60).map((r) => ({
    t: formatAxisTime(r.ts),
    v: Number(r.value),
  }));
}

function attentionItems(eng: EngSnap, outsideOnly = false) {
  const list = eng.attention || [];
  return list
    .filter((a: NonNullable<EngSnap["attention"]>[number]) => (outsideOnly ? a.outside : true))
    .slice(0, 6)
    .map((a: NonNullable<EngSnap["attention"]>[number]) => ({
      label: a.label,
      value: Number(a.value),
      unit: a.unit,
      tone: a.outside ? ("danger" as const) : ("muted" as const),
    }));
}

/** Bind a card type to CH snapshot fields. Returns null only if type unknown. */
export function bindCardType(type: string, snaps: SnapshotBundle): CardBinding {
  const { engineer: eng, operations: ops, finance: fin } = snaps;
  const mw = Number(eng.productionMW ?? ops.currentRateMW ?? 0);
  const rpm = Number(eng.turbineSpeed ?? 0);
  const pressure = Number(eng.boilerPressure ?? 0);
  const steam = Number(eng.steamFlow ?? 0);
  const p4 = seriesFrom(eng.trends?.P4_ST_PO);
  const p2 = seriesFrom(eng.trends?.P2_SIT01);
  const outside = (eng.attention || []).filter(
    (a: NonNullable<EngSnap["attention"]>[number]) => a.outside
  ).length;

  switch (type) {
    case "GeneratorOutput":
      return {
        kind: "metric",
        primary: mw,
        unit: "MW",
        caption: "P4_ST_PO · live",
        series: p4,
      };
    case "TurbineSpeed":
    case "TurbineRotorCard":
      return {
        kind: "metric",
        primary: rpm,
        unit: "rpm",
        caption: "P2_SIT01 · live",
        series: p2,
      };
    case "BoilerPressure":
      return {
        kind: "metric",
        primary: pressure,
        unit: "",
        caption: `P1_PIT01 · steam flow ${steam.toFixed(1)}`,
        series: p4,
      };
    case "ThroughputTimeline":
    case "ShiftThroughput":
    case "ProductionVolume":
      return {
        kind: "series",
        primary: mw,
        unit: "MW",
        caption: "P4_ST_PO trend",
        series: p4.length ? p4 : [{ t: "now", v: mw }],
      };
    case "ClosestToLimit":
    case "ActiveAlerts":
    case "ShiftAlerts":
      return {
        kind: "list",
        primary: outside,
        unit: "outside",
        caption: outside ? `${outside} outside band` : "All in band",
        items: attentionItems(eng, type === "ActiveAlerts" || type === "ShiftAlerts"),
      };
    case "AssetRadar":
    case "PlantHealthRadar":
    case "UnitHealthGrid":
    case "AnomalyMap": {
      const areas = ["boiler", "turbine", "generator", "water_treatment"] as const;
      const latest = eng.latest || [];
      const items = areas.map((area) => {
        const tags = latest.filter(
          (r: NonNullable<EngSnap["latest"]>[number]) => r.area === area
        );
        const att = (eng.attention || []).filter((a: NonNullable<EngSnap["attention"]>[number]) =>
          tags.some((t: NonNullable<EngSnap["latest"]>[number]) => t.tag === a.tag)
        );
        const bad = att.filter((a: NonNullable<EngSnap["attention"]>[number]) => a.outside).length;
        return {
          label: area.replace("_", " "),
          value: tags.length ? Math.max(0, 100 - bad * 25) : 50,
          unit: "%",
          tone: bad ? ("warning" as const) : ("ok" as const),
        };
      });
      return {
        kind: "list",
        primary: items.reduce((s, i) => s + i.value, 0) / Math.max(items.length, 1),
        unit: "health",
        caption: "Area posture from live tags",
        items,
      };
    }
    case "BearingVibration":
    case "ThermalSignature": {
      const vib = eng.latest?.find(
        (r: NonNullable<EngSnap["latest"]>[number]) =>
          r.tag === "P2_VT01e" || r.tag === "P2_VXT02"
      );
      const val = Number(vib?.value ?? eng.attention?.[0]?.value ?? 0);
      return {
        kind: "metric",
        primary: val,
        unit: vib?.tag === "P2_VT01e" ? "mm/s" : "",
        caption: vib?.tag ?? "Closest attention tag",
        items: attentionItems(eng).slice(0, 4),
      };
    }
    case "ShiftComparison":
    case "TargetAttainment":
      return {
        kind: "metric",
        primary: Number(ops.percentOfTarget ?? 0),
        unit: "%",
        caption: `Shift ${Number(ops.shiftProductionMWh ?? 0).toFixed(0)} / ${Number(ops.shiftTargetMWh ?? 0).toFixed(0)} MWh · synthetic clock`,
        items: [
          {
            label: "Actual MWh",
            value: Number(ops.shiftProductionMWh ?? 0),
            unit: "MWh",
          },
          {
            label: "Target MWh",
            value: Number(ops.shiftTargetMWh ?? 0),
            unit: "MWh",
          },
          {
            label: "Projected",
            value: Number(ops.projectedShiftMWh ?? 0),
            unit: "MWh",
          },
          {
            label: "Bottleneck",
            value: 0,
            unit: String(ops.bottleneckArea ?? "none"),
          },
        ],
      };
    case "AreaUtilization":
      return {
        kind: "metric",
        primary: Number(ops.capacityUtilizationPct ?? 0),
        unit: "%",
        caption: `${mw.toFixed(1)} MW / ${Number(ops.plantCapacityMW ?? 350)} MW capacity`,
        series: p4,
      };
    case "EnergyValueTrend":
      return {
        kind: "metric",
        primary: Number(fin.productionValueUSD ?? 0),
        unit: "USD",
        caption: "Production value · synthetic $/MWh on live MW",
        series: p4,
        synthetic: true,
      };
    case "PowerSourceMix": {
      const latest = eng.latest || [];
      const st = Number(
        latest.find((r: NonNullable<EngSnap["latest"]>[number]) => r.tag === "P4_ST_PO")?.value ??
          mw
      );
      const ht = Number(
        latest.find((r: NonNullable<EngSnap["latest"]>[number]) => r.tag === "P4_HT_PO")?.value ?? 0
      );
      const total = st + ht || 1;
      return {
        kind: "list",
        primary: (st / total) * 100,
        unit: "% steam",
        caption: "P4_ST_PO vs P4_HT_PO share · live",
        items: [
          { label: "Steam", value: st, unit: "MW", tone: "ok" as const },
          { label: "Hydro", value: ht, unit: "MW", tone: "muted" as const },
          {
            label: "Steam share",
            value: (st / total) * 100,
            unit: "%",
          },
        ],
      };
    }
    case "HydroUnit": {
      const latest = eng.latest || [];
      const ht = Number(
        latest.find((r: NonNullable<EngSnap["latest"]>[number]) => r.tag === "P4_HT_PO")?.value ?? 0
      );
      return {
        kind: "metric",
        primary: ht,
        unit: "MW",
        caption: "P4_HT_PO · hydro unit live",
        series: p4,
      };
    }
    case "HydroEnergyBars": {
      const latest = eng.latest || [];
      const ht = Number(
        latest.find((r: NonNullable<EngSnap["latest"]>[number]) => r.tag === "P4_HT_PO")?.value ?? 0
      );
      return {
        kind: "series",
        primary: mw,
        unit: "MW",
        caption: `P4_ST_PO trend · hydro ${ht.toFixed(1)} MW`,
        series: p4.length ? p4 : [{ t: "now", v: mw }],
      };
    }
    case "ComponentTemps": {
      const latest = eng.latest || [];
      const pick = (tag: string) => {
        const v = Number(
          latest.find((r: NonNullable<EngSnap["latest"]>[number]) => r.tag === tag)?.value ?? NaN
        );
        return Number.isFinite(v) ? v : null;
      };
      // Prefer real temp tags; never promote vibration/raw vib into °C.
      const stator = pick("P4_ST_TT01");
      const boilerT = pick("P1_TIT01") ?? pick("P1_TIT02");
      const temp =
        stator != null && stator > 0 && stator < 500
          ? stator
          : boilerT != null && boilerT > 0 && boilerT < 500
            ? boilerT
            : null;
      return {
        kind: "list",
        primary: temp ?? rpm,
        unit: temp != null ? "°C" : "rpm",
        caption: temp != null ? "Stator / boiler temp · live" : "Turbine rpm · live (no temp tag)",
        items: [
          { label: "Stator", value: stator ?? 0, unit: "°C" },
          { label: "Boiler TIT", value: boilerT ?? 0, unit: "°C" },
          { label: "Boiler press", value: pressure, unit: "" },
          { label: "Turbine rpm", value: rpm, unit: "rpm" },
        ],
      };
    }
    case "PowerAndTarget":
      return {
        kind: "metric",
        primary: Number(ops.percentOfTarget ?? 0),
        unit: "%",
        caption: `${mw.toFixed(1)} MW · shift ${Number(ops.percentOfTarget ?? 0).toFixed(0)}% of target`,
        series: p4,
        items: [
          { label: "Live MW", value: mw, unit: "MW" },
          {
            label: "Shift MWh",
            value: Number(ops.shiftProductionMWh ?? 0),
            unit: "MWh",
          },
          {
            label: "Target MWh",
            value: Number(ops.shiftTargetMWh ?? 0),
            unit: "MWh",
          },
        ],
      };
    case "QualityBreakdown": {
      const att = eng.attention || [];
      const out = att.filter((a: NonNullable<EngSnap["attention"]>[number]) => a.outside).length;
      const watch = Math.max(0, att.length - out);
      const ok = Math.max(0, 100 - out * 12 - watch * 4);
      return {
        kind: "list",
        primary: ok,
        unit: "% first-pass",
        caption: "Band posture proxy from live attention tags",
        items: [
          { label: "In band", value: ok, unit: "%", tone: "ok" as const },
          { label: "Watch", value: watch, unit: "tags", tone: "warning" as const },
          { label: "Outside", value: out, unit: "tags", tone: out ? ("danger" as const) : ("muted" as const) },
        ],
      };
    }
    case "CostMixBubbles":
      return {
        kind: "list",
        primary: Number(fin.operatingCostUSD ?? 0),
        unit: "USD",
        caption: "Operating cost · synthetic rates",
        synthetic: true,
        items: [
          {
            label: "Variable energy",
            value: Number(fin.costBreakdown?.variableEnergy ?? 0),
            unit: "USD",
          },
          {
            label: "Labour + fixed",
            value: Number(fin.costBreakdown?.labourAndFixed ?? 0),
            unit: "USD",
          },
          {
            label: "Cost / MWh",
            value: Number(fin.costPerMWh ?? 0),
            unit: "USD",
          },
        ],
      };
    case "ForecastTrajectory":
    case "FinanceFunnelDetail":
    case "ValueByArea":
    case "PlantValueMap":
    case "ShiftBands":
      return {
        kind: "metric",
        primary: Number(fin.marginUSD ?? 0),
        unit: "USD",
        caption: fin.disclaimer || "Margin · synthetic finance on live MW",
        synthetic: true,
        items: [
          {
            label: "Value",
            value: Number(fin.productionValueUSD ?? 0),
            unit: "USD",
          },
          {
            label: "Cost",
            value: Number(fin.operatingCostUSD ?? 0),
            unit: "USD",
          },
          {
            label: "Margin",
            value: Number(fin.marginUSD ?? 0),
            unit: "USD",
          },
          {
            label: "Δ vs plan",
            value: Number(fin.varianceVsPlanUSD ?? 0),
            unit: "USD",
          },
        ],
      };
    default:
      return {
        kind: "metric",
        primary: mw,
        unit: "MW",
        caption: `Fallback bind · ${type}`,
        series: p4,
      };
  }
}
