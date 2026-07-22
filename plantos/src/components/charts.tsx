"use client";

import {
  Area,
  AreaChart as RechartsAreaChart,
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart as RechartsLineChart,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";

type ChartRow = Record<string, string | number | null>;
type Series = { dataKey: string; label?: string | null };

const COLORS = ["#34d399", "#60a5fa", "#fbbf24", "#f472b6", "#a78bfa"];

function seriesColor(index: number): string {
  return COLORS[index % COLORS.length];
}

function ChartFrame({ title, children }: { title?: string | null; children: React.ReactNode }) {
  return (
    <div className="w-full space-y-2">
      {title && <h4 className="text-sm font-medium text-zinc-200">{title}</h4>}
      {children}
    </div>
  );
}

export function BarChartView({
  data,
  xKey,
  series,
  title,
  stacked,
}: {
  data: ChartRow[];
  xKey: string;
  series: Series[];
  title?: string | null;
  stacked?: boolean | null;
}) {
  return (
    <ChartFrame title={title}>
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart data={data}>
            <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey={xKey} tick={{ fill: "#a1a1aa", fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "#71717a", fontSize: 11 }} tickLine={false} axisLine={false} width={48} />
            <Tooltip contentStyle={{ background: "#09090b", border: "1px solid #3f3f46" }} />
            {series.length > 1 && <Legend />}
            {series.map((s, i) => (
              <Bar
                key={s.dataKey}
                dataKey={s.dataKey}
                name={s.label ?? s.dataKey}
                fill={seriesColor(i)}
                radius={4}
                stackId={stacked ? "stack" : undefined}
              />
            ))}
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

export function LineChartView({
  data,
  xKey,
  series,
  title,
}: {
  data: ChartRow[];
  xKey: string;
  series: Series[];
  title?: string | null;
}) {
  return (
    <ChartFrame title={title}>
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsLineChart data={data}>
            <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey={xKey} tick={{ fill: "#a1a1aa", fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "#71717a", fontSize: 11 }} tickLine={false} axisLine={false} width={48} />
            <Tooltip contentStyle={{ background: "#09090b", border: "1px solid #3f3f46" }} />
            {series.length > 1 && <Legend />}
            {series.map((s, i) => (
              <Line
                key={s.dataKey}
                dataKey={s.dataKey}
                name={s.label ?? s.dataKey}
                type="monotone"
                stroke={seriesColor(i)}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

export function AreaChartView({
  data,
  xKey,
  series,
  title,
  stacked,
}: {
  data: ChartRow[];
  xKey: string;
  series: Series[];
  title?: string | null;
  stacked?: boolean | null;
}) {
  return (
    <ChartFrame title={title}>
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsAreaChart data={data}>
            <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey={xKey} tick={{ fill: "#a1a1aa", fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "#71717a", fontSize: 11 }} tickLine={false} axisLine={false} width={48} />
            <Tooltip contentStyle={{ background: "#09090b", border: "1px solid #3f3f46" }} />
            {series.length > 1 && <Legend />}
            {series.map((s, i) => (
              <Area
                key={s.dataKey}
                dataKey={s.dataKey}
                name={s.label ?? s.dataKey}
                type="monotone"
                stroke={seriesColor(i)}
                fill={seriesColor(i)}
                fillOpacity={0.25}
                strokeWidth={2}
                stackId={stacked ? "stack" : undefined}
              />
            ))}
          </RechartsAreaChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

export function PieChartView({
  data,
  nameKey,
  valueKey,
  title,
}: {
  data: ChartRow[];
  nameKey: string;
  valueKey: string;
  title?: string | null;
}) {
  return (
    <ChartFrame title={title}>
      <div className="mx-auto h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart>
            <Tooltip contentStyle={{ background: "#09090b", border: "1px solid #3f3f46" }} />
            <Pie data={data} dataKey={valueKey} nameKey={nameKey} innerRadius="45%">
              {data.map((row, i) => (
                <Cell key={String(row[nameKey])} fill={seriesColor(i)} />
              ))}
            </Pie>
            <Legend />
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

export function StatView({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption?: string | null;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight text-zinc-100">{value}</div>
      {caption && <div className="mt-1 text-xs text-zinc-500">{caption}</div>}
    </div>
  );
}

/** Deterministic-role helpers (non-agent path) */
export function SparkTrend({
  data,
  color = "#34d399",
  unit = "",
}: {
  data: Array<{ ts: string; value: number }>;
  color?: string;
  unit?: string;
}) {
  const points = (data || []).slice(-120).map((d) => ({
    t: String(d.ts).slice(11, 19),
    v: Number(d.value),
  }));
  if (points.length < 2) {
    return <p className="text-xs text-zinc-500">No trend points yet</p>;
  }
  return (
    <LineChartView
      data={points}
      xKey="t"
      series={[{ dataKey: "v", label: unit || "value" }]}
      title={null}
    />
  );
}

export function TargetBars({
  current,
  target,
  projected,
}: {
  current: number;
  target: number;
  projected: number;
}) {
  return (
    <BarChartView
      data={[
        { name: "So far", v: current },
        { name: "Target", v: target },
        { name: "Forecast", v: projected },
      ]}
      xKey="name"
      series={[{ dataKey: "v", label: "MWh" }]}
      title={null}
    />
  );
}

export function FinanceBars({
  value,
  cost,
  margin,
  planned,
}: {
  value: number;
  cost: number;
  margin: number;
  planned: number;
}) {
  return (
    <BarChartView
      data={[
        { name: "Value", v: value },
        { name: "Cost", v: cost },
        { name: "Margin", v: margin },
        { name: "Plan", v: planned },
      ]}
      xKey="name"
      series={[{ dataKey: "v", label: "USD" }]}
      title={null}
    />
  );
}
