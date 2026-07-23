"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { formatAxisTime, parseClickHouseTimeMs } from "@/lib/format-time";
import { interactiveChartKind } from "@/lib/historian-range";
import { useCardLive, useChartHeight } from "./card-live-context";

/** Extra bottom room for angled "Jul 22 20:00" ticks (Trigger-style). */
export const chartMargin = { top: 10, right: 10, left: 2, bottom: 52 };

/** Solid colors — CSS variables often fail as SVG tick fills in Recharts. */
const TICK = { fill: "#64748b", fontSize: 10 } as const;
const GRID = "#cbd5e1";
const AXIS_LINE = "#94a3b8";
const STROKE = "#0d9488";
const FILL_A = "#14b8a6";
const FILL_B = "#38bdf8";
const PIE_COLORS = ["#0d9488", "#38bdf8", "#f59e0b", "#a78bfa"];
const CHART_H = 228;

const DEFAULT_SEED = Array.from({ length: 32 }, (_, i) => {
  const d = new Date(Date.now() - (31 - i) * 60_000);
  return {
    t: formatAxisTime(d),
    v: 55 + Math.sin(i / 2.6) * 18 + Math.cos(i / 5) * 7 + i * 0.4,
  };
});

/** Shared cartesian axes — angled date/time x labels like Trigger runs charts. */
const xAxisProps = {
  dataKey: "t" as const,
  tick: TICK,
  tickLine: { stroke: AXIS_LINE, strokeWidth: 1 },
  axisLine: { stroke: AXIS_LINE, strokeWidth: 1 },
  angle: -45,
  textAnchor: "end" as const,
  height: 56,
  minTickGap: 18,
  interval: "preserveStartEnd" as const,
  dy: 6,
};

const yAxisProps = {
  tick: TICK,
  tickLine: { stroke: AXIS_LINE, strokeWidth: 1 },
  axisLine: { stroke: AXIS_LINE, strokeWidth: 1 },
  width: 44,
  domain: ["auto", "auto"] as [string, string],
  tickFormatter: (v: number) =>
    Number.isFinite(v) ? (Math.abs(v) >= 100 ? String(Math.round(v)) : v.toFixed(1)) : String(v),
};

type TipProps = {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: readonly any[];
  label?: string | number;
};

/** Custom tooltip body — must be passed as Tooltip `content`, not as a chart child wrapper. */
function tipContent(unit: string | undefined, valueDecimals: number) {
  return function TipBody({ active, payload, label }: TipProps) {
    if (!active || !payload?.length) return null;
    return (
      <div
        data-testid="lovable-tooltip"
        className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] shadow-lg"
      >
        <div className="mb-0.5 font-mono text-slate-500">{label}</div>
        {payload.map((p) => {
          const raw = p.value;
          const n = typeof raw === "number" ? raw.toFixed(valueDecimals) : String(raw ?? "—");
          return (
            <div
              key={String(p.dataKey)}
              className="font-mono font-semibold tabular text-slate-900"
              style={{ color: (p.color as string) || STROKE }}
            >
              {String(p.name ?? p.dataKey)}: {n}
              {unit ? ` ${unit}` : ""}
            </div>
          );
        })}
      </div>
    );
  };
}

/**
 * Fill parent and measure width+height for Recharts.
 * Avoid ResponsiveContainer — it often paints nothing when layout width is still 0.
 * Canvas span drives min height via ChartHeightContext (1 box vs 2-wide).
 */
function ChartShell({
  children,
  mark,
  testId,
}: {
  children: (size: { width: number; height: number }) => ReactNode;
  mark: string;
  testId: string;
}) {
  const minHeight = useChartHeight(CHART_H);
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 320, height: minHeight });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      const r = el.getBoundingClientRect();
      const w = Math.floor(r.width);
      const h = Math.floor(r.height);
      setSize((prev) => {
        const next = {
          width: w > 0 ? Math.max(w, 160) : prev.width,
          // Prefer measured box; never smaller than the span-driven minHeight.
          height: Math.max(h > 0 ? h : minHeight, minHeight),
        };
        if (next.width === prev.width && next.height === prev.height) return prev;
        return next;
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const t = window.setTimeout(measure, 50);
    return () => {
      ro.disconnect();
      window.clearTimeout(t);
    };
  }, [minHeight]);

  return (
    <div
      ref={ref}
      className="w-full min-w-0"
      style={{ height: minHeight, minHeight }}
      data-interactive={mark}
      data-testid={testId}
      data-chart-mark="true"
    >
      {children(size)}
    </div>
  );
}

function parseSeriesMs(t: string | number): number | null {
  return parseClickHouseTimeMs(t);
}

function useChartData(seed: Array<{ t: string | number; v: number }> = DEFAULT_SEED) {
  const bound = useCardLive();
  const window = bound?.seriesWindow;
  const withSeconds = Boolean(window && window.minutes <= 1);
  if (bound?.series?.length) {
    if (window && Number.isFinite(window.startMs) && Number.isFinite(window.endMs)) {
      const data = bound.series
        .map((p) => {
          const ms = parseSeriesMs(p.t);
          if (ms == null) return null;
          return { t: ms, v: Number(p.v) };
        })
        .filter((p): p is { t: number; v: number } => p != null);
      return {
        data,
        unit: bound.unit,
        items: bound.items,
        primary: bound.primary,
        live: true as const,
        timeDomain: [window.startMs, window.endMs] as [number, number],
        withSeconds,
      };
    }
    return {
      data: bound.series.map((p) => ({
        t: formatAxisTime(p.t, { withSeconds }),
        v: Number(p.v),
      })),
      unit: bound.unit,
      items: bound.items,
      primary: bound.primary,
      live: true as const,
      timeDomain: null as [number, number] | null,
      withSeconds,
    };
  }
  return {
    data: seed.map((p) => ({ t: formatAxisTime(p.t), v: Number(p.v) })),
    unit: bound?.unit,
    items: bound?.items,
    primary: bound?.primary,
    live: false as const,
    timeDomain: null as [number, number] | null,
    withSeconds: false,
  };
}

function timeXAxisProps(domain: [number, number], withSeconds: boolean) {
  return {
    ...xAxisProps,
    type: "number" as const,
    domain,
    allowDataOverflow: true,
    tickFormatter: (v: number) => formatAxisTime(v, { withSeconds }),
  };
}

function tipContentForChart(
  unit: string | undefined,
  valueDecimals: number,
  timeScale: boolean,
  withSeconds: boolean
) {
  const base = tipContent(unit, valueDecimals);
  if (!timeScale) return base;
  return function TipBody(props: TipProps) {
    const label =
      typeof props.label === "number"
        ? formatAxisTime(props.label, { withSeconds })
        : props.label;
    return base({ ...props, label });
  };
}

/** Guaranteed interactive area chart — axes + hover tooltip. */
export function InteractiveSeriesChart({
  unit: unitProp,
  seed = DEFAULT_SEED,
}: {
  unit?: string;
  seed?: Array<{ t: string | number; v: number }>;
}) {
  const { data, unit, timeDomain, withSeconds } = useChartData(seed);
  const u = unitProp || unit || "MW";
  const xProps = timeDomain ? timeXAxisProps(timeDomain, withSeconds) : xAxisProps;
  return (
    <ChartShell mark="series" testId="interactive-series">
      {({ width, height }) => (
        <AreaChart width={width} height={height} data={data} margin={chartMargin}>
          <defs>
            <linearGradient id="plantos-interactive-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={FILL_A} stopOpacity={0.55} />
              <stop offset="100%" stopColor={FILL_A} stopOpacity={0} />
            </linearGradient>
          </defs>
          {/* Recharts only sees direct children — do NOT wrap axes/tooltip in custom components */}
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} strokeOpacity={0.7} />
          <XAxis {...xProps} />
          <YAxis {...yAxisProps} />
          <Tooltip
            allowEscapeViewBox={{ x: true, y: true }}
            isAnimationActive={false}
            wrapperStyle={{ zIndex: 60, outline: "none", pointerEvents: "none" }}
            cursor={{ stroke: STROKE, strokeOpacity: 0.4, strokeDasharray: "4 4" }}
            content={tipContentForChart(u, 2, Boolean(timeDomain), withSeconds)}
          />
          <Area
            type="monotone"
            dataKey="v"
            name="Value"
            stroke={STROKE}
            strokeWidth={2.4}
            fill="url(#plantos-interactive-area)"
            activeDot={{ r: 5, strokeWidth: 0, fill: STROKE }}
            isAnimationActive={false}
          />
        </AreaChart>
      )}
    </ChartShell>
  );
}

/** Guaranteed interactive bar chart. */
export function InteractiveBarChart({
  unit: unitProp,
  seed = DEFAULT_SEED,
}: {
  unit?: string;
  seed?: Array<{ t: string | number; v: number }>;
}) {
  const { data, unit, timeDomain, withSeconds } = useChartData(seed);
  const u = unitProp || unit || "MW";
  const xProps = timeDomain ? timeXAxisProps(timeDomain, withSeconds) : xAxisProps;
  // Time-scale + dense live series (e.g. 1m with 100+ points): default Bar width
  // collapses to ~0px so the plot looks empty while axes still render. Cap bar size.
  const denseTime = Boolean(timeDomain && data.length > 24);

  return (
    <ChartShell mark="bars" testId="interactive-bars">
      {({ width, height }) => {
        const plotW = Math.max(120, width - 56);
        const barSize = denseTime
          ? Math.max(2, Math.min(14, Math.floor((plotW / Math.max(data.length, 1)) * 0.85)))
          : undefined;
        // Extremely dense: Area is readable; bars would still be hairlines.
        if (denseTime && data.length > 60) {
          return (
            <AreaChart width={width} height={height} data={data} margin={chartMargin}>
              <defs>
                <linearGradient id="plantos-dense-bar-area" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={FILL_A} stopOpacity={0.55} />
                  <stop offset="100%" stopColor={FILL_A} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} strokeOpacity={0.7} />
              <XAxis {...xProps} />
              <YAxis {...yAxisProps} />
              <Tooltip
                allowEscapeViewBox={{ x: true, y: true }}
                isAnimationActive={false}
                wrapperStyle={{ zIndex: 60, outline: "none", pointerEvents: "none" }}
                cursor={{ stroke: STROKE, strokeOpacity: 0.4, strokeDasharray: "4 4" }}
                content={tipContentForChart(u, 2, Boolean(timeDomain), withSeconds)}
              />
              <Area
                type="monotone"
                dataKey="v"
                name="Value"
                stroke={STROKE}
                strokeWidth={2.2}
                fill="url(#plantos-dense-bar-area)"
                activeDot={{ r: 4, strokeWidth: 0, fill: STROKE }}
                isAnimationActive={false}
              />
            </AreaChart>
          );
        }
        return (
          <BarChart width={width} height={height} data={data} margin={chartMargin}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} strokeOpacity={0.7} />
            <XAxis {...xProps} />
            <YAxis {...yAxisProps} />
            <Tooltip
              allowEscapeViewBox={{ x: true, y: true }}
              isAnimationActive={false}
              wrapperStyle={{ zIndex: 60, outline: "none", pointerEvents: "none" }}
              cursor={{ stroke: STROKE, strokeOpacity: 0.4, strokeDasharray: "4 4" }}
              content={tipContentForChart(u, 2, Boolean(timeDomain), withSeconds)}
            />
            <Bar
              dataKey="v"
              name="Value"
              fill={STROKE}
              radius={[5, 5, 0, 0]}
              isAnimationActive={false}
              barSize={barSize}
              maxBarSize={18}
            />
          </BarChart>
        );
      }}
    </ChartShell>
  );
}

/** Dual-line interactive chart. */
export function InteractiveLineChart({
  unit: unitProp,
  seed = DEFAULT_SEED,
}: {
  unit?: string;
  seed?: Array<{ t: string | number; v: number }>;
}) {
  const { data, unit, timeDomain, withSeconds } = useChartData(seed);
  const u = unitProp || unit || "MW";
  const xProps = timeDomain ? timeXAxisProps(timeDomain, withSeconds) : xAxisProps;
  const dual = data.map((d, i) => ({
    ...d,
    secondary: d.v * (0.92 + (i % 5) * 0.01),
  }));
  return (
    <ChartShell mark="lines" testId="interactive-lines">
      {({ width, height }) => (
        <LineChart width={width} height={height} data={dual} margin={chartMargin}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} strokeOpacity={0.7} />
          <XAxis {...xProps} />
          <YAxis {...yAxisProps} />
          <Tooltip
            allowEscapeViewBox={{ x: true, y: true }}
            isAnimationActive={false}
            wrapperStyle={{ zIndex: 60, outline: "none", pointerEvents: "none" }}
            cursor={{ stroke: STROKE, strokeOpacity: 0.4, strokeDasharray: "4 4" }}
            content={tipContentForChart(u, 2, Boolean(timeDomain), withSeconds)}
          />
          <Line
            type="monotone"
            dataKey="v"
            name="Primary"
            stroke={STROKE}
            strokeWidth={2.4}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 0 }}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="secondary"
            name="Compare"
            stroke={FILL_B}
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      )}
    </ChartShell>
  );
}

/** Interactive donut with legend + hover. */
export function InteractivePieChart({ unit: unitProp }: { unit?: string }) {
  const bound = useCardLive();
  const chartH = useChartHeight(CHART_H);
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 200, height: chartH });
  const data =
    bound?.items?.length && bound.items.length >= 2
      ? bound.items.slice(0, 4).map((it) => ({
          name: it.label,
          value: Math.max(0.01, Math.abs(Number(it.value))),
        }))
      : [
          { name: "Steam", value: 72 },
          { name: "Hydro", value: 18 },
          { name: "Other", value: 7 },
          { name: "Reserve", value: 3 },
        ];
  const u = unitProp || bound?.unit || "%";

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const w = Math.floor(r.width);
      const h = Math.floor(r.height);
      setBox((prev) => {
        const next = {
          width: w > 0 ? Math.max(w, 120) : prev.width,
          height: Math.max(h > 0 ? h : chartH, chartH),
        };
        if (next.width === prev.width && next.height === prev.height) return prev;
        return next;
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const t = window.setTimeout(measure, 50);
    return () => {
      ro.disconnect();
      window.clearTimeout(t);
    };
  }, [chartH]);

  const side = Math.min(box.width, box.height);
  return (
    <div
      className="grid w-full grid-cols-[1fr_auto] items-center gap-2"
      style={{ height: chartH, minHeight: chartH }}
      data-interactive="pie"
      data-testid="interactive-pie"
      data-chart-mark="true"
    >
      <div ref={ref} className="h-full min-h-0 min-w-0">
        <PieChart width={box.width} height={box.height}>
          <Tooltip
            allowEscapeViewBox={{ x: true, y: true }}
            isAnimationActive={false}
            wrapperStyle={{ zIndex: 60, outline: "none", pointerEvents: "none" }}
            content={tipContent(u, 1)}
          />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={side * 0.22}
            outerRadius={side * 0.36}
            paddingAngle={2}
            stroke="none"
            isAnimationActive={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </div>
      <div className="flex flex-col gap-1.5 pr-1 text-[10px]">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-1.5" title={`${d.name}: ${d.value}`}>
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
            />
            <span className="max-w-[4.5rem] truncate text-slate-500">{d.name}</span>
            <span className="ml-auto font-mono font-semibold tabular">{Number(d.value).toFixed(0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Interactive list with exact values (alerts / condition / mix). */
export function InteractiveItemsList() {
  const bound = useCardLive();
  const items = bound?.items?.length
    ? bound.items
    : [
        { label: "Generator load", value: 92, unit: "%", tone: undefined as string | undefined },
        { label: "Turbine speed", value: 87, unit: "%", tone: undefined },
        { label: "Boiler pressure", value: 89, unit: "%", tone: undefined },
        { label: "Water supply", value: 94, unit: "%", tone: undefined },
      ];
  return (
    <div className="flex h-full min-h-[11rem] flex-col justify-around gap-2" data-interactive="items">
      {items.map((it, i) => {
        const danger = it.tone === "danger";
        return (
          <div
            key={`${it.label}-${i}`}
            className="flex items-center gap-2 rounded-md border border-slate-200/80 bg-white/70 px-2 py-1.5 text-[11px]"
            title={`${it.label}: ${it.value}${it.unit ? ` ${it.unit}` : ""}`}
            data-testid="interactive-item"
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: danger ? "#ef4444" : STROKE }}
            />
            <span className="min-w-0 flex-1 truncate">{it.label}</span>
            <span
              className="font-mono text-[11px] font-semibold tabular"
              style={danger ? { color: "#ef4444" } : undefined}
            >
              {Number(it.value).toFixed(it.unit === "%" ? 0 : 2)}
              {it.unit ? ` ${it.unit}` : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Pick interactive body for a Lovable/Replit card type.
 * Every branch returns axes+tooltip or exact-value rows — never decorative-only.
 * Kind routing lives in historian-range.interactiveChartKind (shared with play/range pills).
 */
export function InteractiveCardBody({ type }: { type: string }) {
  const kind = interactiveChartKind(type);
  if (kind === "items") return <InteractiveItemsList />;
  if (kind === "pie") return <InteractivePieChart />;
  if (kind === "bar") return <InteractiveBarChart />;
  if (kind === "line") return <InteractiveLineChart />;
  return <InteractiveSeriesChart />;
}

/** @deprecated — Recharts ignores wrapped axes; prefer inlined XAxis/YAxis via xAxisProps */
export function LovableAxes({ xKey = "t", yWidth = 40 }: { xKey?: string; yWidth?: number }) {
  return (
    <>
      <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} strokeOpacity={0.7} />
      <XAxis {...xAxisProps} dataKey={xKey} />
      <YAxis {...yAxisProps} width={yWidth} />
    </>
  );
}

/** @deprecated — pass tipContent into Tooltip content= instead */
export function LovableTooltip({
  unit,
  valueDecimals = 2,
}: {
  unit?: string;
  valueDecimals?: number;
}) {
  return (
    <Tooltip
      allowEscapeViewBox={{ x: true, y: true }}
      isAnimationActive={false}
      wrapperStyle={{ zIndex: 60, outline: "none", pointerEvents: "none" }}
      content={tipContent(unit, valueDecimals)}
    />
  );
}

/** @deprecated */
export function useBoundSeries(seed: Array<{ t: string | number; v: number }>) {
  return useChartData(seed);
}
