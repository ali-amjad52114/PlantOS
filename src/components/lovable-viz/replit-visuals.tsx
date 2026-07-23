"use client";

import type { ReactElement } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Line as RechartsLine,
  LineChart,
  ResponsiveContainer,
} from "recharts";
import { useCardLive } from "./card-live-context";
import { chartMargin, LovableAxes, LovableTooltip, useBoundSeries } from "./chart-chrome";
import { REPLIT_DECK_SEEDS, type ReplitCardSeed } from "./replit-decks-data";

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

const palette = ["#34d399", "#38bdf8", "#fb923c", "#a78bfa"];

const lineSeed = Array.from({ length: 28 }, (_, i) => ({
  t: i,
  v: 55 + Math.sin(i / 2.4) * 22 + Math.cos(i / 5) * 8 + i * 0.35,
}));

const barSeed = [
  { t: "Boiler", v: 72 },
  { t: "Turbine", v: 88 },
  { t: "Gen", v: 64 },
  { t: "Water", v: 93 },
  { t: "Steam", v: 79 },
  { t: "Hydro", v: 57 },
];

function Bars({ color = palette[0], horizontal = false }: { color?: string; horizontal?: boolean }) {
  const bound = useBoundSeries(barSeed);
  const data =
    bound.items?.length
      ? bound.items.slice(0, 6).map((it) => ({ t: it.label, v: Number(it.value) }))
      : bound.live
        ? bound.data.map((p, i) => ({ t: barSeed[i % barSeed.length]?.t ?? p.t, v: p.v }))
        : barSeed;
  const unit = bound.unit || (bound.items?.[0]?.unit ?? "%");

  if (horizontal) {
    const max = Math.max(...data.map((d) => Math.abs(d.v)), 1);
    return (
      <div className="space-y-2 pt-2">
        {data.map((row, i) => (
          <div key={`${row.t}-${i}`} className="flex items-center gap-2" title={`${row.t}: ${row.v}`}>
            <span className="w-14 truncate text-[8px] uppercase text-muted-foreground">{row.t}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.min(100, (Math.abs(row.v) / max) * 100)}%`, background: color }}
              />
            </div>
            <span className="w-14 text-right font-mono text-[9px] tabular">
              {row.v.toFixed(unit === "%" ? 0 : 2)}
              {unit ? ` ${unit}` : ""}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={chartMargin}>
        <LovableAxes xKey="t" />
        <LovableTooltip unit={unit} />
        <Bar dataKey="v" name="Value" fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function TrendLine({ color = palette[1], second = false }: { color?: string; second?: boolean }) {
  const bound = useBoundSeries(lineSeed);
  const data = bound.live
    ? bound.data.map((p) => ({ t: p.t, primary: p.v }))
    : lineSeed.map((p, i) => ({
        t: p.t,
        primary: p.v,
        secondary: second ? 48 + Math.cos(i / 3) * 12 + i * 0.2 : undefined,
      }));
  const unit = bound.unit || "MW";

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={chartMargin}>
        <LovableAxes />
        <LovableTooltip unit={unit} />
        <RechartsLine
          type="monotone"
          dataKey="primary"
          name="Primary"
          stroke={color}
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
        {!bound.live && second && (
          <RechartsLine
            type="monotone"
            dataKey="secondary"
            name="Secondary"
            stroke={palette[2]}
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}

function AreaTrend({ color = palette[0] }: { color?: string }) {
  const bound = useBoundSeries(lineSeed);
  const unit = bound.unit || "MW";
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={bound.data} margin={chartMargin}>
        <defs>
          <linearGradient id="replit-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.75} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <LovableAxes />
        <LovableTooltip unit={unit} />
        <Area
          type="monotone"
          dataKey="v"
          name="Value"
          stroke={color}
          strokeWidth={2}
          fill="url(#replit-area)"
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function Ring({ value = 78, color = palette[0] }: { value?: number; color?: string }) {
  const bound = useCardLive();
  const live =
    bound && Number.isFinite(bound.primary)
      ? bound.unit === "%"
        ? Number(bound.primary)
        : Math.min(100, Math.max(0, Number(bound.primary)))
      : value;
  const label = bound?.unit === "%" ? `${live.toFixed(0)}%` : bound ? `${Number(bound.primary).toFixed(1)}${bound.unit ? ` ${bound.unit}` : ""}` : `${live}%`;
  return (
    <div className="grid h-full place-items-center">
      <div
        className="grid h-32 w-32 place-items-center rounded-full"
        style={{
          background: `conic-gradient(${color} ${Math.min(100, Math.max(0, live)) * 3.6}deg, rgba(255,255,255,.06) 0)`,
        }}
      >
        <div className="grid h-24 w-24 place-items-center rounded-full bg-[#111416] text-center shadow-inner">
          <div>
            <div className="font-mono text-xl font-semibold tabular">{label}</div>
            <div className="text-[8px] uppercase tracking-widest text-muted-foreground">
              {bound?.caption?.slice(0, 28) || "within band"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Tank({ color = palette[1], level = 68 }: { color?: string; level?: number }) {
  const bound = useCardLive();
  const live = bound && Number.isFinite(bound.primary) ? Number(bound.primary) : level;
  const pct =
    bound?.unit === "%"
      ? Math.min(100, Math.max(0, live))
      : Math.min(100, Math.max(8, (Math.abs(live) % 100) || level));
  return (
    <div className="flex h-full items-center justify-center gap-5">
      <div className="relative h-36 w-24 overflow-hidden rounded-b-3xl rounded-t-lg border-2 border-white/15 bg-black/20">
        <div
          className="absolute inset-x-0 bottom-0 transition-all"
          style={{ height: `${pct}%`, background: `linear-gradient(180deg, ${color}80, ${color})` }}
        />
        {[25, 50, 75].map((n) => (
          <span
            key={n}
            className="absolute left-2 right-2 border-t border-dashed border-white/25"
            style={{ bottom: `${n}%` }}
          />
        ))}
      </div>
      <div className="space-y-2 text-xs">
        <div className="font-mono text-3xl font-light tabular">
          {live.toFixed(bound?.unit === "%" || !bound ? 0 : 2)}
          <span className="text-sm text-muted-foreground">{bound?.unit ? ` ${bound.unit}` : "%"}</span>
        </div>
        <div className="font-mono text-[9px] text-muted-foreground">
          {bound?.caption || "P1_LIT01 · RAW SCALE"}
        </div>
        <span className="inline-flex rounded-full bg-emerald-400/10 px-2 py-1 text-[9px] text-emerald-300">
          {bound ? "LIVE BIND" : "NORMAL BAND"}
        </span>
      </div>
    </div>
  );
}

function Rotor() {
  const bound = useCardLive();
  const rpm = bound && Number.isFinite(bound.primary) ? Number(bound.primary) : 815;
  return (
    <div className="grid h-full place-items-center">
      <div className="relative grid h-32 w-32 place-items-center rounded-full border border-orange-300/25 bg-orange-400/5 shadow-[0_0_45px_rgba(251,146,60,.12)]">
        {[0, 120, 240].map((r) => (
          <div
            key={r}
            className="absolute h-2 w-24 origin-center rounded-full bg-gradient-to-r from-transparent via-orange-300/60 to-transparent"
            style={{ transform: `rotate(${r}deg)` }}
          />
        ))}
        <div className="z-10 grid h-16 w-16 place-items-center rounded-full border border-orange-300/40 bg-[#161412] text-center">
          <div>
            <div className="font-mono text-lg tabular">{rpm.toFixed(0)}</div>
            <div className="text-[8px] text-orange-300">{bound?.unit || "RPM"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Heatmap() {
  const bound = useBoundSeries(lineSeed);
  const cells = bound.live
    ? bound.data.slice(0, 48).map((p) => p.v)
    : Array.from({ length: 48 }, (_, i) => 28 + ((i * 17) % 65));
  const max = Math.max(...cells.map(Math.abs), 1);
  return (
    <div className="grid h-full grid-cols-8 gap-1 p-2">
      {cells.map((v, i) => (
        <div
          key={i}
          title={`${bound.live ? bound.data[i]?.t ?? i : i}: ${Number(v).toFixed(2)}${bound.unit ? ` ${bound.unit}` : ""}`}
          className="rounded-sm"
          style={{
            background: `color-mix(in srgb, ${palette[i % 4]} ${18 + (Math.abs(v) / max) * 70}%, #16181b)`,
          }}
        />
      ))}
    </div>
  );
}

function Feed() {
  const bound = useCardLive();
  const rows = bound?.items?.length
    ? bound.items.map((it) => ({
        text: `${it.label}: ${it.value.toFixed(2)}${it.unit ? ` ${it.unit}` : ""}${
          it.tone === "danger" ? " · out of band" : ""
        }`,
        tone: it.tone,
      }))
    : [
        { text: "Boiler pressure nearing watch band", tone: undefined },
        { text: "Steam demand changed", tone: undefined },
        { text: "Generator output below target", tone: undefined },
        { text: "Water loop stable", tone: undefined },
      ];
  return (
    <div className="space-y-2 pt-2">
      {rows.map((row, i) => (
        <div
          key={`${row.text}-${i}`}
          className="flex items-center gap-2 rounded-lg border border-white/7 bg-white/[.025] p-2"
        >
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{
              background:
                row.tone === "danger"
                  ? "var(--danger)"
                  : row.tone === "warning"
                    ? "var(--warning)"
                    : palette[(i + 2) % 4],
            }}
          />
          <span className="min-w-0 flex-1 truncate text-[10px]">{row.text}</span>
          <span className="font-mono text-[8px] text-muted-foreground">{bound ? "live" : `${i + 1}m`}</span>
        </div>
      ))}
    </div>
  );
}

function Process() {
  const bound = useCardLive();
  const stages = bound?.items?.length
    ? bound.items.slice(0, 5).map((it, i) => ({
        label: it.label,
        value: Number(it.value),
        unit: it.unit || "",
        color: palette[i % 4],
      }))
    : ["Demand", "Boiler", "Steam", "Turbine", "MW out"].map((x, i) => ({
        label: x,
        value: [92, 88, 84, 81, 79][i],
        unit: "%",
        color: palette[i % 4],
      }));
  return (
    <div className="flex h-full items-center justify-between gap-1">
      {stages.map((stage, i) => (
        <div key={stage.label} className="contents">
          <div className="grid h-20 flex-1 place-items-center rounded-xl border border-white/10 bg-white/[.035] text-center">
            <div>
              <div className="font-mono text-lg tabular" style={{ color: stage.color }}>
                {stage.value.toFixed(stage.unit === "%" ? 0 : 1)}
                {stage.unit ? (stage.unit === "%" ? "%" : "") : ""}
              </div>
              <div className="truncate px-1 text-[8px] uppercase text-muted-foreground">{stage.label}</div>
            </div>
          </div>
          {i < stages.length - 1 && <span className="text-muted-foreground">›</span>}
        </div>
      ))}
    </div>
  );
}

function DeviceStrip() {
  const bound = useCardLive();
  const cells = bound?.items?.length
    ? bound.items.slice(0, 4).map((it) => ({
        label: it.label,
        value: Number(it.value),
        unit: it.unit || "",
        tone: it.tone,
      }))
    : [
        { label: "Boiler", value: 0.97, unit: "bar", tone: undefined as string | undefined },
        { label: "Turbine", value: 815, unit: "rpm", tone: undefined },
        { label: "Generator", value: 279, unit: "MW", tone: undefined },
        { label: "Water", value: 68, unit: "%", tone: undefined },
      ];
  return (
    <div className="grid h-full grid-cols-2 gap-2">
      {cells.map((cell) => (
        <div
          key={cell.label}
          className="flex flex-col justify-between rounded-xl border border-white/10 bg-white/[.03] p-3"
        >
          <div className="flex items-center justify-between">
            <span className="truncate text-xs font-medium">{cell.label}</span>
            <span
              className="h-2 w-2 rounded-full shadow-[0_0_8px_#34d399]"
              style={{
                background: cell.tone === "danger" ? "var(--danger)" : "#34d399",
                boxShadow: cell.tone === "danger" ? "0 0 8px var(--danger)" : undefined,
              }}
            />
          </div>
          <div className="font-mono text-2xl tabular">
            {cell.value.toFixed(cell.unit === "rpm" || cell.unit === "%" ? 0 : 2)}
            <span className="ml-1 text-[9px] text-muted-foreground">{cell.unit}</span>
          </div>
          <div className="text-[8px] uppercase text-muted-foreground">
            {bound ? "Live bind" : "Live seed · nominal"}
          </div>
        </div>
      ))}
    </div>
  );
}

function Finance() {
  const bound = useCardLive();
  const cost =
    bound?.items?.find((i) => /cost\s*\/\s*mwh|cost per/i.test(i.label))?.value ??
    (bound?.unit === "USD" && Number.isFinite(bound.primary) ? Number(bound.primary) : 68);
  const { data } = useBoundSeries(lineSeed);
  return (
    <div className="grid h-full grid-cols-2 gap-3">
      <div className="flex flex-col justify-between rounded-xl bg-emerald-400/10 p-4">
        <span className="text-[9px] uppercase text-emerald-300">
          {bound?.synthetic ? "Synthetic demo" : bound ? "Live bind" : "Synthetic demo"}
        </span>
        <strong className="font-mono text-3xl tabular">
          ${Number(cost).toFixed(0)}
          <span className="text-sm font-normal">/MWh</span>
        </strong>
        <span className="text-[9px] text-muted-foreground">
          {bound?.caption?.slice(0, 40) || "Illustrative cost assumption"}
        </span>
      </div>
      <div className="flex min-h-0 flex-col justify-between rounded-xl border border-white/10 p-2">
        <div className="min-h-0 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <LovableAxes />
              <LovableTooltip unit={bound?.unit || "USD"} />
              <Area type="monotone" dataKey="v" name="Margin" stroke={palette[0]} fill={palette[0]} fillOpacity={0.25} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <span className="text-[8px] uppercase text-muted-foreground">Margin proxy trend</span>
      </div>
    </div>
  );
}

function renderVisual(type: string) {
  if (/Tank|Level/.test(type)) return <Tank />;
  if (/Rotor|Gauge|Speedometer|Donut|Ring/.test(type))
    return /Rotor/.test(type) ? (
      <Rotor />
    ) : (
      <Ring value={type.length % 2 ? 84 : 76} color={palette[type.length % 4]} />
    );
  if (/Heat|Matrix|Thermal|Spectrum/.test(type)) return <Heatmap />;
  if (/Feed|Attention/.test(type)) return <Feed />;
  if (/Process|Funnel|Pipeline/.test(type)) return <Process />;
  if (/Device|AreaHealth|Reliability|Scorecard|State|Range/.test(type)) return <DeviceStrip />;
  if (/Cost|Finance|Margin|Value/.test(type)) return <Finance />;
  if (/Timeline|Throughput|Output|Power|Energy/.test(type))
    return <AreaTrend color={palette[type.length % 4]} />;
  if (/Trend|Chart|Vib/.test(type)) return <TrendLine second color={palette[type.length % 4]} />;
  return <Bars horizontal={type.length % 2 === 0} color={palette[type.length % 4]} />;
}

function cards(seeds: ReplitCardSeed[]): ReplitVisualCard[] {
  return seeds.map((seed, i) => ({
    ...seed,
    bg: `radial-gradient(circle at ${75 - (i % 3) * 20}% 10%, ${palette[i % 4]}18, transparent 48%), #111315`,
    render: () => renderVisual(seed.id),
  }));
}

export const REPLIT_DECKS: ReplitVisualDeck[] = REPLIT_DECK_SEEDS.map((d) => ({
  name: d.name,
  tag: d.tag,
  roleHint: d.roleHint,
  cards: cards(d.cards),
}));
