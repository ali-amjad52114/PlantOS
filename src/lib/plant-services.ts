import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { getClickHouse } from "./clickhouse";

const plantDir = join(process.cwd(), "data", "plant");
const fallbackPath = join(process.cwd(), "data", "fallback", "latest_window.json");

const assumptions = JSON.parse(readFileSync(join(plantDir, "assumptions.json"), "utf8"));
const tags = JSON.parse(readFileSync(join(plantDir, "tag_map.json"), "utf8")) as Array<any>;

const SHIFT_HOURS = assumptions.production.shiftHours as number;

function loadFallbackRows(): Array<{ tag: string; value: number; ts: string; area?: string }> | null {
  if (!existsSync(fallbackPath)) return null;
  try {
    const j = JSON.parse(readFileSync(fallbackPath, "utf8"));
    return (j.rows || []).map((r: any) => ({
      tag: r.tag,
      value: Number(r.value),
      ts: String(r.ts),
      area: r.area,
    }));
  } catch {
    return null;
  }
}

/** Prefer live source; fall back to any source, then local fallback snapshot. */
export async function latestByTags(tagList: string[]) {
  try {
    const ch = getClickHouse();
    const liveFirst = await ch.query({
      query: `
        SELECT tag, argMax(value, ts) AS value, max(ts) AS latest_ts, anyLast(area) AS area
        FROM plant_readings
        WHERE tag IN ({tags:Array(String)}) AND source = 'live'
        GROUP BY tag
      `,
      query_params: { tags: tagList },
      format: "JSONEachRow",
    });
    let rows = (await liveFirst.json()) as Array<{ tag: string; value: number; latest_ts: string; area: string }>;
    const missing = tagList.filter((t) => !rows.some((r) => r.tag === t));
    if (missing.length) {
      const anySrc = await ch.query({
        query: `
          SELECT tag, argMax(value, ts) AS value, max(ts) AS latest_ts, anyLast(area) AS area
          FROM plant_readings
          WHERE tag IN ({tags:Array(String)})
          GROUP BY tag
        `,
        query_params: { tags: missing },
        format: "JSONEachRow",
      });
      rows = rows.concat(
        (await anySrc.json()) as Array<{ tag: string; value: number; latest_ts: string; area: string }>
      );
    }
    return rows.map((r) => ({ tag: r.tag, value: r.value, ts: r.latest_ts, area: r.area, source: "clickhouse" as const }));
  } catch {
    const fb = loadFallbackRows();
    if (!fb) throw new Error("ClickHouse unavailable and no fallback snapshot");
    return tagList
      .map((t) => {
        const r = fb.find((x) => x.tag === t);
        return r ? { tag: r.tag, value: r.value, ts: r.ts, area: r.area || "unknown", source: "fallback" as const } : null;
      })
      .filter(Boolean) as Array<{ tag: string; value: number; ts: string; area: string; source: "fallback" }>;
  }
}

export async function trend(tag: string, hoursOrMinutes: number = 1, unit: "hour" | "minute" = "hour") {
  try {
    const ch = getClickHouse();
    if (unit === "minute") {
      const minutes = Math.max(1, Math.floor(hoursOrMinutes));
      const result = await ch.query({
        query: `
          SELECT ts, value FROM plant_readings
          WHERE tag = {tag:String}
            AND source IN ('live', 'history')
            AND ts >= (
              SELECT max(ts) - INTERVAL {minutes:UInt32} MINUTE
              FROM plant_readings
              WHERE tag = {tag:String} AND source IN ('live', 'history')
            )
          ORDER BY ts
          LIMIT 500
        `,
        query_params: { tag, minutes },
        format: "JSONEachRow",
      });
      return await result.json();
    }
    const hours = Math.max(1, Math.floor(hoursOrMinutes));
    const result = await ch.query({
      query: `
        SELECT ts, value FROM plant_readings
        WHERE tag = {tag:String}
          AND source IN ('live', 'history')
          AND ts >= (
            SELECT max(ts) - INTERVAL {hours:UInt32} HOUR
            FROM plant_readings
            WHERE tag = {tag:String} AND source IN ('live', 'history')
          )
        ORDER BY ts
        LIMIT 500
      `,
      query_params: { tag, hours },
      format: "JSONEachRow",
    });
    return await result.json();
  } catch {
    return [];
  }
}

export async function engineerSnapshot() {
  const t0 = Date.now();
  const ids = tags.filter((t) => ["boiler", "turbine", "generator"].includes(t.area)).map((t) => t.id);
  const latest = await latestByTags(ids);
  const byId = Object.fromEntries(latest.map((r) => [r.tag, r]));
  const meta = Object.fromEntries(tags.map((t) => [t.id, t]));
  const attention = latest
    .map((r) => {
      const m = meta[r.tag];
      if (!m) return null;
      const mid = (m.normalMin + m.normalMax) / 2 || 1;
      const span = Math.abs(m.normalMax - m.normalMin) || 1;
      const dist = Math.abs(r.value - mid) / span;
      const outside = r.value < m.normalMin || r.value > m.normalMax;
      return {
        tag: r.tag,
        label: m.label,
        value: r.value,
        unit: m.unit,
        normalMin: m.normalMin,
        normalMax: m.normalMax,
        outside,
        score: outside ? 1 + dist : dist,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 5);
  const genTrend = await trend("P4_ST_PO", 1);
  const turbTrend = await trend("P2_SIT01", 1);
  return {
    role: "engineer" as const,
    elapsedMs: Date.now() - t0,
    productionMW: byId["P4_ST_PO"]?.value ?? null,
    turbineSpeed: byId["P2_SIT01"]?.value ?? null,
    boilerPressure: byId["P1_PIT01"]?.value ?? null,
    steamFlow: byId["P1_FT01"]?.value ?? null,
    latest,
    attention,
    trends: { P4_ST_PO: genTrend, P2_SIT01: turbTrend },
    assumptions: { synthetic: true, note: assumptions.disclaimer },
    evidence: latest.slice(0, 12),
    dataSource: latest[0]?.source ?? "unknown",
  };
}

export async function operationsSnapshot() {
  const t0 = Date.now();
  const prod = assumptions.production;
  let rate = 0;
  let latest_ts: string | null = null;
  let avg = 0;
  let dataSource: "clickhouse" | "fallback" = "clickhouse";
  try {
    const ch = getClickHouse();
    const rateQ = await ch.query({
      query: `
        SELECT argMax(value, ts) AS rate, max(ts) AS latest_ts
        FROM plant_readings
        WHERE tag = 'P4_ST_PO' AND source = 'live'
      `,
      format: "JSONEachRow",
    });
    let rateRow = ((await rateQ.json()) as any[])[0];
    if (rateRow?.rate == null) {
      const anyQ = await ch.query({
        query: `SELECT argMax(value, ts) AS rate, max(ts) AS latest_ts FROM plant_readings WHERE tag = 'P4_ST_PO'`,
        format: "JSONEachRow",
      });
      rateRow = ((await anyQ.json()) as any[])[0];
    }
    rate = Number(rateRow?.rate ?? 0);
    latest_ts = rateRow?.latest_ts ?? null;
    const avgQ = await ch.query({
      query: `
        SELECT avg(value) AS avg_mw
        FROM plant_readings
        WHERE tag = 'P4_ST_PO'
          AND ts >= (SELECT max(ts) - INTERVAL {h:UInt32} HOUR FROM plant_readings WHERE tag = 'P4_ST_PO')
      `,
      query_params: { h: SHIFT_HOURS },
      format: "JSONEachRow",
    });
    avg = Number(((await avgQ.json()) as any[])[0]?.avg_mw ?? 0);
  } catch {
    dataSource = "fallback";
    const latest = await latestByTags(["P4_ST_PO"]);
    rate = Number(latest[0]?.value ?? 0);
    latest_ts = latest[0]?.ts ?? null;
    avg = rate;
  }

  // Demo shift clock: hours into an 8h shift from wall clock modulo (labeled synthetic)
  const hoursElapsed = (Date.now() / 3600000) % SHIFT_HOURS;
  const hoursRemaining = SHIFT_HOURS - hoursElapsed;
  const shiftSoFar = avg * hoursElapsed;
  const projected = shiftSoFar + rate * hoursRemaining;

  const latest = await latestByTags(tags.map((t) => t.id));
  const meta = Object.fromEntries(tags.map((t) => [t.id, t]));
  const areaHits: Record<string, number> = {};
  for (const r of latest) {
    const m = meta[r.tag];
    if (!m) continue;
    if (r.value < m.normalMin || r.value > m.normalMax) areaHits[m.area] = (areaHits[m.area] || 0) + 1;
  }
  const bottleneck = Object.entries(areaHits).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "none";

  return {
    role: "operations" as const,
    elapsedMs: Date.now() - t0,
    currentRateMW: rate,
    shiftProductionMWh: shiftSoFar,
    shiftTargetMWh: prod.shiftTargetMWh,
    dailyTargetMWh: prod.dailyTargetMWh,
    plantCapacityMW: prod.plantCapacityMW,
    projectedShiftMWh: projected,
    percentOfTarget: (shiftSoFar / prod.shiftTargetMWh) * 100,
    hoursElapsed,
    hoursRemaining,
    bottleneckArea: bottleneck,
    bottleneckRule: "Area with the most tags currently outside normalMin/normalMax",
    assumptions: prod,
    synthetic: true,
    evidence: [{ tag: "P4_ST_PO", value: rate, ts: latest_ts }],
    capacityUtilizationPct: (rate / prod.plantCapacityMW) * 100,
    dataSource,
  };
}

export async function financeSnapshot() {
  const t0 = Date.now();
  const ops = await operationsSnapshot();
  const fin = assumptions.finance;
  const hoursElapsed = ops.hoursElapsed;
  const productionValue = ops.shiftProductionMWh * fin.electricityValuePerMWh;
  const variable = ops.shiftProductionMWh * fin.energyFuelCostPerMWh;
  const fixed = (fin.labourCostPerHour + fin.fixedOperatingCostPerHour) * hoursElapsed;
  const operatingCost = variable + fixed;
  const costPerMWh = operatingCost / Math.max(ops.shiftProductionMWh, 0.001);
  const margin = productionValue - operatingCost;
  const planned = fin.plannedRevenuePerShift;
  return {
    role: "finance" as const,
    elapsedMs: Date.now() - t0,
    productionValueUSD: productionValue,
    operatingCostUSD: operatingCost,
    costBreakdown: { variableEnergy: variable, labourAndFixed: fixed },
    costPerMWh,
    marginUSD: margin,
    plannedRevenue: planned,
    varianceVsPlanUSD: productionValue - planned * (hoursElapsed / SHIFT_HOURS),
    projectedShiftValue: ops.projectedShiftMWh * fin.electricityValuePerMWh,
    assumptions: fin,
    synthetic: true,
    disclaimer: assumptions.disclaimer,
    linkedProduction: { rateMW: ops.currentRateMW, shiftMWh: ops.shiftProductionMWh },
    evidence: ops.evidence,
    dataSource: ops.dataSource,
  };
}
