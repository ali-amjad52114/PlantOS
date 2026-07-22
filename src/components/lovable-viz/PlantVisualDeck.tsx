import { useEffect, useMemo, useState, type ReactElement } from "react";
import { REPLIT_DECKS } from "./replit-visuals";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { useCountUp, useLiveNumber, fmt } from "./animations";

/* ------------------------------------------------------------------
   Data
------------------------------------------------------------------ */
const wave = Array.from({ length: 40 }, (_, i) => ({
  d: i,
  v: 60 + Math.sin(i / 3) * 30 + Math.cos(i / 5) * 12 + i * 1.2,
}));
const bars = Array.from({ length: 14 }, (_, i) => ({
  d: i,
  v: 20 + Math.abs(Math.sin(i * 0.9)) * 60 + Math.random() * 10,
}));
const donut = [
  { name: "Steam", value: 72 },
  { name: "Hydro", value: 18 },
  { name: "Other", value: 7 },
  { name: "Reserve", value: 3 },
];
const radar = [
  { k: "Cost", v: 82 },
  { k: "Margin", v: 74 },
  { k: "Uptime", v: 91 },
  { k: "Target", v: 78 },
  { k: "Safety", v: 88 },
];
const funnel = [
  { l: "Demand", v: 100 },
  { l: "Steam", v: 72 },
  { l: "Turbine", v: 58 },
  { l: "MW out", v: 44 },
];

/* ------------------------------------------------------------------
   Deck config
------------------------------------------------------------------ */
type Card = {
  id: string;
  label: string;
  hint: string;
  render: () => ReactElement;
  bg: string;
};

const CH1 = "var(--primary)";
const CH2 = "var(--accent)";
const CH3 = "var(--chart-3)";
const CH4 = "var(--chart-4)";
const CH5 = "var(--chart-5)";

/* ---------- individual visuals ---------- */

function LiveArea() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={wave} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="v-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={CH1} stopOpacity={0.85} />
            <stop offset="100%" stopColor={CH1} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={CH1}
          strokeWidth={2.5}
          fill="url(#v-area)"
          isAnimationActive
          animationDuration={1400}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function LiveBars() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={bars} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="v-bar" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={CH2} />
            <stop offset="100%" stopColor={CH1} />
          </linearGradient>
        </defs>
        <Bar dataKey="v" fill="url(#v-bar)" radius={[6, 6, 0, 0]} animationDuration={1200} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function Donut() {
  return (
    <div className="relative h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={donut}
            dataKey="value"
            innerRadius="55%"
            outerRadius="85%"
            paddingAngle={3}
            stroke="none"
            animationDuration={1400}
          >
            {donut.map((_, i) => (
              <Cell key={i} fill={[CH1, CH2, CH3, CH4][i]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-2xl font-semibold tabular">
            <CU value={248} />k
          </div>
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Energy $</div>
        </div>
      </div>
    </div>
  );
}

function Gauge({ value = 74, color = CH1 }: { value?: number; color?: string }) {
  const c = 2 * Math.PI * 42;
  const dash = (value / 100) * c;
  const n = useCountUp(value, 1200);
  return (
    <div className="relative grid h-full w-full place-items-center">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r="42" stroke="var(--muted)" strokeWidth="10" fill="none" />
        <circle
          cx="50"
          cy="50"
          r="42"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${dash} ${c}`}
          style={{ transition: "stroke-dasharray 1.4s cubic-bezier(0.2,0.7,0.2,1)" }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-semibold tabular">{Math.round(n)}%</div>
        <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Of target</div>
      </div>
    </div>
  );
}

function PulseNumber({ base, prefix = "", suffix = "" }: { base: number; prefix?: string; suffix?: string }) {
  const live = useLiveNumber(base, 0.006, 1800);
  const n = useCountUp(live, 900);
  return (
    <div className="flex h-full flex-col justify-center">
      <div className="text-5xl font-semibold leading-none tabular">
        {prefix}
        {fmt(n, { decimals: 0 })}
        {suffix}
      </div>
      <div className="mt-3 h-14">
        <LiveArea />
      </div>
    </div>
  );
}

function CU({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const n = useCountUp(value, 1100);
  return <>{fmt(n, { decimals })}</>;
}

function DotsGrid() {
  const cells = 96;
  return (
    <div className="grid h-full w-full grid-cols-12 gap-1.5">
      {Array.from({ length: cells }).map((_, i) => {
        const on = (i * 37) % 100 < 62;
        const c = [CH1, CH2, CH3, CH4, CH5][i % 5];
        return (
          <div
            key={i}
            className="aspect-square rounded-sm fade-scale"
            style={{
              background: on ? c : "var(--muted)",
              opacity: on ? 0.3 + ((i * 13) % 70) / 100 : 0.4,
              animationDelay: `${(i % 24) * 25}ms`,
            }}
          />
        );
      })}
    </div>
  );
}

function Funnel() {
  return (
    <svg viewBox="0 0 200 120" className="h-full w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="fnl" x1="0" x2="1">
          <stop offset="0%" stopColor={CH1} />
          <stop offset="100%" stopColor={CH2} />
        </linearGradient>
        <clipPath id="fnl-c">
          <rect x="0" y="0" width="200" height="120">
            <animate attributeName="width" from="0" to="200" dur="1.4s" fill="freeze" />
          </rect>
        </clipPath>
      </defs>
      {(() => {
        const w = 200, h = 120, step = w / (funnel.length - 1);
        const top = funnel.map((f, i) => `${i * step},${(1 - f.v / 100) * h * 0.5 + 4}`).join(" ");
        const bot = funnel
          .map((f, i) => `${i * step},${h - ((1 - f.v / 100) * h * 0.5 + 4)}`)
          .reverse()
          .join(" ");
        return <polygon points={`${top} ${bot}`} fill="url(#fnl)" clipPath="url(#fnl-c)" />;
      })()}
    </svg>
  );
}

function RadarViz() {
  return (
    <div className="relative h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={radar} outerRadius="72%">
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis dataKey="k" tick={{ fill: "var(--muted-foreground)", fontSize: 9 }} />
          <Radar dataKey="v" stroke={CH1} fill={CH1} fillOpacity={0.45} animationDuration={1400} />
        </RadarChart>
      </ResponsiveContainer>
      <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full spin-slow" style={{ opacity: 0.3 }}>
        <defs>
          <linearGradient id="rsweep" x1="0" x2="1">
            <stop offset="0%" stopColor={CH1} stopOpacity="0" />
            <stop offset="100%" stopColor={CH1} stopOpacity="0.7" />
          </linearGradient>
        </defs>
        <path d="M50,50 L50,5 A45,45 0 0,1 92,64 Z" fill="url(#rsweep)" />
      </svg>
    </div>
  );
}

function Heatmap() {
  const cols = 14;
  const rows = 8;
  return (
    <div
      className="grid h-full w-full gap-[3px]"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}
    >
      {Array.from({ length: cols * rows }).map((_, i) => {
        const x = i % cols;
        const y = Math.floor(i / cols);
        const v = (Math.sin(x / 2) + Math.cos(y / 1.6) + 2) / 4;
        return (
          <div
            key={i}
            className="rounded-sm fade-scale"
            style={{
              background: `color-mix(in oklab, ${CH2} ${Math.round(v * 100)}%, var(--muted))`,
              animationDelay: `${(x + y) * 40}ms`,
            }}
          />
        );
      })}
    </div>
  );
}

function Bubbles() {
  const items = [
    { s: 110, x: "10%", y: "18%", c: CH1, label: "Energy", v: 42 },
    { s: 86, x: "58%", y: "8%", c: CH2, label: "Labour", v: 28 },
    { s: 70, x: "18%", y: "58%", c: CH3, label: "Fixed", v: 18 },
    { s: 62, x: "62%", y: "52%", c: CH4, label: "Other", v: 12 },
  ];
  return (
    <div className="relative h-full w-full">
      {items.map((b, i) => (
        <div
          key={i}
          className="absolute grid place-items-center rounded-full text-white shadow-md fade-scale"
          style={{
            width: b.s,
            height: b.s,
            left: b.x,
            top: b.y,
            background: `linear-gradient(135deg, ${b.c}, ${items[(i + 1) % 4].c})`,
            animationDelay: `${i * 120}ms`,
          }}
        >
          <span
            className="pointer-events-none absolute inset-0 rounded-full ping-ring"
            style={{ background: b.c, opacity: 0.3, animationDelay: `${i * 400}ms` }}
          />
          <div className="relative text-center">
            <div className="text-lg font-semibold tabular"><CU value={b.v} />%</div>
            <div className="text-[9px] opacity-90">{b.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function WaveformStack() {
  const rows = 5;
  return (
    <div className="flex h-full w-full flex-col justify-between gap-1.5">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex flex-1 items-center gap-[3px]">
          {Array.from({ length: 40 }).map((_, i) => {
            const h = 20 + Math.abs(Math.sin(i * 0.5 + r)) * 80;
            return (
              <div
                key={i}
                className="flex-1 rounded-sm bar-grow"
                style={{
                  height: `${h}%`,
                  background: [CH1, CH2, CH3, CH4, CH5][r],
                  opacity: 0.55 + (i % 5) * 0.08,
                  animationDelay: `${i * 20 + r * 60}ms`,
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

function OrbitRings() {
  return (
    <div className="relative grid h-full w-full place-items-center">
      {[90, 70, 50].map((r, i) => (
        <div
          key={i}
          className="absolute rounded-full border spin-slow"
          style={{
            width: `${r}%`,
            height: `${r}%`,
            borderColor: `color-mix(in oklab, ${[CH1, CH2, CH3][i]} 60%, transparent)`,
            borderWidth: 2,
            animationDuration: `${8 + i * 4}s`,
            animationDirection: i % 2 ? "reverse" : "normal",
          }}
        >
          <div
            className="absolute h-3 w-3 -translate-x-1/2 rounded-full"
            style={{ left: "50%", top: -6, background: [CH1, CH2, CH3][i], boxShadow: `0 0 14px ${[CH1, CH2, CH3][i]}` }}
          />
        </div>
      ))}
      <div className="relative z-10 grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg">
        <Sparkles className="h-6 w-6" />
      </div>
    </div>
  );
}

function StreamLines() {
  const paths = [
    "M0 80 Q 50 20 100 60 T 200 40",
    "M0 60 Q 50 100 100 40 T 200 80",
    "M0 100 Q 50 40 100 90 T 200 50",
  ];
  return (
    <svg viewBox="0 0 200 120" className="h-full w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sl" x1="0" x2="1">
          <stop offset="0%" stopColor={CH1} stopOpacity="0.15" />
          <stop offset="100%" stopColor={CH2} />
        </linearGradient>
      </defs>
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="url(#sl)"
          strokeWidth={2.5}
          strokeDasharray="500"
          strokeDashoffset="500"
          className="draw-stroke"
          style={{ animationDelay: `${i * 200}ms`, opacity: 0.7 + i * 0.1 }}
        />
      ))}
      {paths.map((d, i) => (
        <circle key={`c${i}`} r="4" fill={CH1}>
          <animateMotion dur={`${3 + i}s`} repeatCount="indefinite" path={d} />
        </circle>
      ))}
    </svg>
  );
}

function ProgressRings() {
  const items = [
    { label: "Goal", v: 82, c: CH1 },
    { label: "Team", v: 64, c: CH2 },
    { label: "Ship", v: 91, c: CH3 },
  ];
  return (
    <div className="flex h-full w-full items-center justify-around gap-2">
      {items.map((it, i) => {
        const c = 2 * Math.PI * 30;
        const n = useCountUp(it.v, 1100 + i * 100);
        return (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="relative h-20 w-20">
              <svg viewBox="0 0 80 80" className="-rotate-90">
                <circle cx="40" cy="40" r="30" stroke="var(--muted)" strokeWidth="6" fill="none" />
                <circle
                  cx="40"
                  cy="40"
                  r="30"
                  stroke={it.c}
                  strokeWidth="6"
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={`${(it.v / 100) * c} ${c}`}
                  style={{ transition: "stroke-dasharray 1.4s cubic-bezier(0.2,0.7,0.2,1)" }}
                />
              </svg>
              <div className="absolute inset-0 grid place-items-center text-sm font-semibold tabular">
                {Math.round(n)}%
              </div>
            </div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{it.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function ConstellationDots() {
  const pts = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        x: 5 + Math.random() * 90,
        y: 5 + Math.random() * 90,
        r: 1 + Math.random() * 3,
        c: [CH1, CH2, CH3, CH4][i % 4],
        delay: i * 90,
      })),
    []
  );
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" preserveAspectRatio="none">
      {pts.map((p, i) =>
        pts.slice(i + 1, i + 3).map((q, j) => (
          <line
            key={`${i}-${j}`}
            x1={p.x}
            y1={p.y}
            x2={q.x}
            y2={q.y}
            stroke={CH1}
            strokeOpacity="0.15"
            strokeWidth="0.4"
          />
        ))
      )}
      {pts.map((p, i) => (
        <g key={i} className="fade-scale" style={{ animationDelay: `${p.delay}ms`, transformOrigin: `${p.x}px ${p.y}px` }}>
          <circle cx={p.x} cy={p.y} r={p.r + 2} fill={p.c} opacity="0.2" />
          <circle cx={p.x} cy={p.y} r={p.r} fill={p.c}>
            <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" begin={`${i * 0.1}s`} repeatCount="indefinite" />
          </circle>
        </g>
      ))}
    </svg>
  );
}

/* ---------- equipment visuals ---------- */

const MACHINES = Array.from({ length: 12 }, (_, i) => {
  const statuses = ["run", "run", "run", "fault", "run", "idle", "run", "maint", "run", "run", "run", "maint"] as const;
  return {
    id: `M-${String(i + 1).padStart(2, "0")}`,
    status: statuses[i],
    temp: 60 + Math.round(Math.sin(i * 1.3) * 15 + 15),
    eff: 88 + Math.round(Math.abs(Math.cos(i * 0.7)) * 10),
  };
});

const STATUS_COLOR: Record<string, string> = {
  run: "var(--success)",
  fault: "var(--danger)",
  idle: CH4,
  maint: "var(--warning)",
};

function MachineGrid() {
  return (
    <div className="grid h-full w-full grid-cols-4 grid-rows-3 gap-1.5">
      {MACHINES.map((m, i) => {
        const c = STATUS_COLOR[m.status];
        const spark = Array.from({ length: 10 }, (_, k) => 40 + Math.abs(Math.sin(i + k * 0.6)) * 40);
        const max = Math.max(...spark);
        return (
          <div
            key={m.id}
            className="fade-scale relative flex min-h-0 flex-col justify-between overflow-hidden rounded-md border px-1.5 py-1 text-[9px] leading-tight"
            style={{
              animationDelay: `${i * 40}ms`,
              borderColor: `color-mix(in oklab, ${c} 45%, transparent)`,
              background: `color-mix(in oklab, ${c} 8%, var(--surface))`,
              boxShadow: `inset 0 0 12px color-mix(in oklab, ${c} 15%, transparent)`,
            }}
          >
            <div className="flex items-center justify-between font-mono">
              <span className="font-semibold">{m.id}</span>
              <span style={{ color: c }} className="text-[8px] font-bold uppercase">
                {m.status === "run" ? "RUN" : m.status === "fault" ? "FAULT" : m.status === "idle" ? "IDLE" : "MAINT"}
              </span>
            </div>
            <svg viewBox="0 0 60 16" className="h-3 w-full" preserveAspectRatio="none">
              <polyline
                points={spark.map((v, k) => `${(k / 9) * 60},${16 - (v / max) * 14}`).join(" ")}
                fill="none"
                stroke={c}
                strokeWidth="1.2"
                className="draw-stroke"
                strokeDasharray="120"
                strokeDashoffset="120"
                style={{ animationDelay: `${i * 60}ms` }}
              />
            </svg>
            <div className="flex items-center gap-1 font-mono text-[8px]">
              <span className="h-1 w-1 rounded-full pulse-live" style={{ background: c }} />
              <span>{m.temp}°</span>
              <span className="ml-auto">{m.eff}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const throughput = Array.from({ length: 40 }, (_, i) => ({
  t: i,
  actual: 460 + Math.sin(i / 2) * 22 + Math.random() * 18,
  target: 485,
}));

function ThroughputTimeline() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={throughput} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="tt" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={CH1} stopOpacity={0.7} />
            <stop offset="100%" stopColor={CH1} stopOpacity={0} />
          </linearGradient>
        </defs>
        <ReferenceLine y={485} stroke={CH2} strokeDasharray="4 4" strokeOpacity={0.6} />
        <Area type="monotone" dataKey="actual" stroke={CH1} strokeWidth={2} fill="url(#tt)" animationDuration={1600} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function QualityRings() {
  const items = [
    { l: "First Pass", v: 96, c: "var(--success)" },
    { l: "Rework", v: 3, c: "var(--warning)" },
    { l: "Scrap", v: 1, c: "var(--danger)" },
  ];
  return (
    <div className="grid h-full w-full grid-cols-[auto_1fr] items-center gap-4">
      <div className="relative aspect-square h-full max-h-full shrink-0">

        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          {items.map((it, i) => {
            const r = 42 - i * 10;
            const c = 2 * Math.PI * r;
            return (
              <g key={i}>
                <circle cx="50" cy="50" r={r} stroke="var(--muted)" strokeWidth="6" fill="none" opacity="0.4" />
                <circle
                  cx="50"
                  cy="50"
                  r={r}
                  stroke={it.c}
                  strokeWidth="6"
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={`${(it.v / 100) * c} ${c}`}
                  style={{ transition: "stroke-dasharray 1.4s cubic-bezier(0.2,0.7,0.2,1)", filter: `drop-shadow(0 0 6px ${it.c})` }}
                />
              </g>
            );
          })}
        </svg>
      </div>
      <div className="flex flex-col gap-2 pr-1 text-[11px]">
        {items.map((it) => (
          <div key={it.l} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: it.c, boxShadow: `0 0 6px ${it.c}` }} />
            <span className="text-muted-foreground">{it.l}</span>
            <span className="ml-auto font-mono font-semibold tabular">{it.v}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AlertFeed() {
  const alerts = [
    { id: "P2_VT", msg: "Vibration near band edge", tone: "danger", time: "09:35" },
    { id: "P4_ST", msg: "MW below shift pace", tone: "warning", time: "09:35" },
    { id: "P1_LIT", msg: "Drum level drifting high", tone: "info", time: "09:34" },
    { id: "P3_LT", msg: "Water level approaching LL", tone: "danger", time: "09:33" },
  ];
  const toneMap: Record<string, string> = { danger: "var(--danger)", warning: "var(--warning)", info: CH2 };
  return (
    <div className="flex h-full flex-col gap-1.5 overflow-hidden">
      {alerts.map((a, i) => {
        const c = toneMap[a.tone];
        return (
          <div
            key={i}
            className="rise flex items-center gap-2 rounded-md border px-2 py-1.5 text-[11px]"
            style={{
              animationDelay: `${i * 100}ms`,
              borderColor: `color-mix(in oklab, ${c} 40%, transparent)`,
              background: `color-mix(in oklab, ${c} 8%, var(--surface))`,
            }}
          >
            <span className="pulse-live h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: c }} />
            <span className="font-mono font-semibold" style={{ color: c }}>{a.id}</span>
            <span className="min-w-0 flex-1 truncate">{a.msg}</span>
            <span className="font-mono text-[9px] text-muted-foreground">{a.time}</span>
          </div>
        );
      })}
    </div>
  );
}

function ShiftBars() {
  const data = [
    { line: "Line A", planned: 1200, actual: 1310 },
    { line: "Line B", planned: 1100, actual: 940 },
    { line: "Line C", planned: 1150, actual: 1250 },
    { line: "Line D", planned: 950, actual: 820 },
  ];
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <Bar dataKey="planned" fill={CH4} radius={[4, 4, 0, 0]} animationDuration={1200} />
        <Bar dataKey="actual" fill={CH1} radius={[4, 4, 0, 0]} animationDuration={1400} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function BigNumber({ value, unit, decimals = 0, sub, color = CH1 }: { value: number; unit: string; decimals?: number; sub?: string; color?: string }) {
  const live = useLiveNumber(value, 0.004, 1800);
  const n = useCountUp(live, 900);
  const spark = Array.from({ length: 24 }, (_, i) => 40 + Math.sin(i / 2) * 15 + Math.random() * 6);
  const max = Math.max(...spark);
  return (
    <div className="flex h-full flex-col justify-between">
      <div>
        <div className="flex items-baseline gap-2 font-mono">
          <span className="text-4xl font-bold tabular" style={{ color }}>
            {fmt(n, { decimals })}
          </span>
          <span className="text-sm font-medium text-muted-foreground">{unit}</span>
        </div>
        {sub && <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>}
      </div>
      <svg viewBox="0 0 100 30" className="h-10 w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`bn-${color}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.5" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline
          points={spark.map((v, i) => `${(i / 23) * 100},${30 - (v / max) * 24}`).join(" ")}
          fill="none"
          stroke={color}
          strokeWidth="1.4"
          style={{ filter: `drop-shadow(0 0 4px ${color})` }}
        />
      </svg>
    </div>
  );
}

function ProcessSignals() {
  const data = Array.from({ length: 30 }, (_, i) => ({
    t: i,
    output: 240 + Math.sin(i / 3) * 20 + i * 1.5,
    demand: 260 + Math.cos(i / 4) * 8,
  }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <Line type="monotone" dataKey="output" stroke={CH1} strokeWidth={2.5} dot={false} style={{ filter: `drop-shadow(0 0 4px ${CH1})` }} animationDuration={1600} />
        <Line type="monotone" dataKey="demand" stroke={CH2} strokeWidth={2} dot={false} animationDuration={1600} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function ConditionBars() {
  const items = [
    { l: "Generator load", v: 92 },
    { l: "Turbine speed", v: 87 },
    { l: "Boiler pressure", v: 89 },
    { l: "Water supply", v: 94 },
  ];
  return (
    <div className="flex h-full flex-col justify-around gap-2">
      {items.map((it, i) => (
        <div key={it.l} className="flex items-center gap-2 text-[11px]">
          <span className="w-24 shrink-0 text-foreground/80">{it.l}</span>
          <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="absolute inset-y-0 left-0 rounded-full bar-grow"
              style={{
                width: `${it.v}%`,
                background: `linear-gradient(90deg, ${CH2}, ${CH1})`,
                animationDelay: `${i * 100}ms`,
                boxShadow: `0 0 8px ${CH1}`,
              }}
            />
          </div>
          <span className="w-8 text-right font-mono font-semibold">{it.v}%</span>
        </div>
      ))}
    </div>
  );
}

function TurbineRotor() {
  const [speed, setSpeed] = useState(3598);
  useEffect(() => {
    const id = setInterval(() => setSpeed(3580 + Math.round(Math.random() * 40)), 1500);
    return () => clearInterval(id);
  }, []);
  const n = useCountUp(speed, 800);
  return (
    <div className="relative grid h-full w-full place-items-center">
      <svg viewBox="0 0 120 120" className="h-full w-full">
        <defs>
          <linearGradient id="rot-g" x1="0" x2="1">
            <stop offset="0%" stopColor={CH1} />
            <stop offset="100%" stopColor={CH2} />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r="52" fill="none" stroke="var(--muted)" strokeWidth="2" />
        <circle cx="60" cy="60" r="52" fill="none" stroke="url(#rot-g)" strokeWidth="2" strokeDasharray="220 100" style={{ filter: `drop-shadow(0 0 6px ${CH1})` }} />
        <g style={{ transformOrigin: "60px 60px", animation: "spin-slow 1.4s linear infinite" }}>
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <ellipse
              key={a}
              cx="60"
              cy="30"
              rx="6"
              ry="22"
              fill="url(#rot-g)"
              opacity="0.85"
              style={{ transformOrigin: "60px 60px", transform: `rotate(${a}deg)` }}
            />
          ))}
        </g>
        <circle cx="60" cy="60" r="12" fill="var(--surface)" stroke={CH1} strokeWidth="2" />
      </svg>
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-center">
        <div className="font-mono text-xl font-bold tabular" style={{ color: CH1 }}>
          {fmt(n)}
        </div>
        <div className="text-[9px] uppercase tracking-widest text-muted-foreground">rpm</div>
      </div>
    </div>
  );
}

function ThermalMap() {
  const cols = 16, rows = 8;
  return (
    <div
      className="grid h-full w-full gap-[2px]"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}
    >
      {Array.from({ length: cols * rows }).map((_, i) => {
        const x = i % cols;
        const y = Math.floor(i / cols);
        const heat = (Math.sin(x / 2.5) + Math.cos(y / 1.4) + 2) / 4;
        const c = heat > 0.7 ? "var(--danger)" : heat > 0.5 ? "var(--warning)" : heat > 0.3 ? CH1 : CH2;
        return (
          <div
            key={i}
            className="fade-scale rounded-[2px]"
            style={{
              background: `color-mix(in oklab, ${c} ${Math.round(heat * 100)}%, var(--muted))`,
              animationDelay: `${(x + y) * 30}ms`,
              boxShadow: heat > 0.7 ? `0 0 4px ${c}` : "none",
            }}
          />
        );
      })}
    </div>
  );
}

function PipeFlow() {
  const pipes = [
    { d: "M0 30 L200 30", label: "Steam", c: CH1, dur: 2 },
    { d: "M0 60 L200 60", label: "Water", c: CH2, dur: 2.6 },
    { d: "M0 90 L200 90", label: "Fuel", c: CH4, dur: 3.2 },
  ];
  return (
    <div className="relative h-full w-full">
      <svg viewBox="0 0 200 120" className="h-full w-full" preserveAspectRatio="none">
        {pipes.map((p, i) => (
          <g key={i}>
            <path d={p.d} stroke="var(--muted)" strokeWidth="8" strokeLinecap="round" />
            <path
              d={p.d}
              stroke={p.c}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray="20 12"
              style={{ filter: `drop-shadow(0 0 4px ${p.c})`, animation: `flow-dash ${p.dur}s linear infinite` }}
              opacity="0.9"
            />
            <circle r="4" fill={p.c} style={{ filter: `drop-shadow(0 0 6px ${p.c})` }}>
              <animateMotion dur={`${p.dur * 1.4}s`} repeatCount="indefinite" path={p.d} />
            </circle>
          </g>
        ))}
      </svg>
      <div className="absolute right-1 top-1 space-y-1 text-[9px]">
        {pipes.map((p) => (
          <div key={p.label} className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.c }} />
            <span className="text-muted-foreground">{p.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VibrationSpectrum() {
  const [bins, setBins] = useState<number[]>(() => Array.from({ length: 32 }, () => Math.random()));
  useEffect(() => {
    const id = setInterval(() => setBins(Array.from({ length: 32 }, (_, i) => 0.2 + Math.abs(Math.sin(i / 3 + Date.now() / 400)) * 0.6 + Math.random() * 0.2)), 250);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex h-full w-full items-end gap-[3px]">
      {bins.map((v, i) => {
        const alert = v > 0.75;
        return (
          <div
            key={i}
            className="flex-1 rounded-t-sm"
            style={{
              height: `${v * 100}%`,
              background: alert ? "var(--danger)" : `linear-gradient(180deg, ${CH1}, ${CH2})`,
              boxShadow: alert ? `0 0 6px var(--danger)` : "none",
              transition: "height 220ms ease-out",
            }}
          />
        );
      })}
    </div>
  );
}

function OEEBig() {
  const live = useLiveNumber(83.5, 0.003, 2200);
  const n = useCountUp(live, 900);
  const c = 2 * Math.PI * 40;
  return (
    <div className="relative grid h-full w-full place-items-center">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r="40" stroke="var(--muted)" strokeWidth="8" fill="none" />
        <circle
          cx="50" cy="50" r="40" fill="none" strokeWidth="8" strokeLinecap="round"
          stroke={`var(--success)`}
          strokeDasharray={`${(n / 100) * c} ${c}`}
          style={{ filter: `drop-shadow(0 0 8px var(--success))` }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="font-mono text-3xl font-bold tabular" style={{ color: "var(--success)" }}>{n.toFixed(1)}%</div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">OEE</div>
      </div>
    </div>
  );
}

/* ---------- hydro / generation visuals (Replit wind pack → HAI tags) ---------- */

function WindTurbine() {
  return (
    <div className="relative grid h-full w-full place-items-center overflow-hidden">
      <svg viewBox="0 0 200 200" className="h-full w-full">
        <defs>
          <radialGradient id="wt-glow" cx="50%" cy="35%" r="55%">
            <stop offset="0%" stopColor={CH1} stopOpacity="0.25" />
            <stop offset="100%" stopColor={CH1} stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="80" r="60" fill="url(#wt-glow)" />
        <circle cx="100" cy="80" r="55" fill="none" stroke="var(--border)" strokeDasharray="2 3" opacity="0.6" />
        <path d="M96 200 L94 90 L106 90 L104 200 Z" fill="var(--foreground)" opacity="0.85" />
        <rect x="88" y="72" width="24" height="14" rx="4" fill="var(--foreground)" opacity="0.9" />
        <g style={{ transformOrigin: "100px 79px", animation: "spin-slow 3.5s linear infinite" }}>
          {[0, 120, 240].map((a) => (
            <path
              key={a}
              d="M100 79 Q 104 40 100 -5 Q 96 40 100 79 Z"
              fill="var(--foreground)"
              opacity="0.9"
              style={{ transformOrigin: "100px 79px", transform: `rotate(${a}deg)` }}
            />
          ))}
        </g>
        <circle cx="100" cy="79" r="4" fill={CH1} style={{ filter: `drop-shadow(0 0 6px ${CH1})` }} />
      </svg>
    </div>
  );
}

function TempChips() {
  const items = [
    { v: 69.7, l: "Bearing", c: CH1 },
    { v: 23.6, l: "Ambient", c: CH2 },
    { v: 52.6, l: "Rotor", c: CH4 },
    { v: 39.8, l: "Stator", c: "var(--success)" },
  ];
  return (
    <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-2">
      {items.map((it, i) => {
        const live = useLiveNumber(it.v, 0.01, 1800);
        return (
          <div
            key={it.l}
            className="fade-scale flex min-h-0 flex-col justify-between overflow-hidden rounded-lg border p-2"
            style={{ animationDelay: `${i * 80}ms`, borderColor: `color-mix(in oklab, ${it.c} 40%, transparent)` }}
          >
            <div className="flex items-baseline gap-1 font-mono">
              <span className="text-xl font-bold tabular">{live.toFixed(1)}</span>
              <span className="text-[10px] text-muted-foreground">°C</span>
            </div>
            <div
              className="rounded px-1.5 py-0.5 text-center text-[9px] font-bold uppercase tracking-widest text-white"
              style={{ background: it.c, boxShadow: `0 0 12px color-mix(in oklab, ${it.c} 50%, transparent)` }}
            >
              {it.l}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HalfGauge() {
  const live = useLiveNumber(64.6, 0.01, 1800);
  const n = useCountUp(live, 800);
  const pct = Math.min(1, n / 100);
  const r = 40;
  const c = Math.PI * r;
  // Needle stays in the arc; value lives below so it never collides.
  const needleLen = 26;
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-0.5">
      <svg viewBox="0 0 120 72" className="h-[68%] w-full shrink-0">
        <defs>
          <linearGradient id="hg" x1="0" x2="1">
            <stop offset="0%" stopColor={CH2} />
            <stop offset="100%" stopColor={CH1} />
          </linearGradient>
        </defs>
        <path
          d={`M 20 58 A ${r} ${r} 0 0 1 100 58`}
          stroke="var(--muted)"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={`M 20 58 A ${r} ${r} 0 0 1 100 58`}
          stroke="url(#hg)"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${pct * c} ${c}`}
          style={{
            filter: `drop-shadow(0 0 6px ${CH1})`,
            transition: "stroke-dasharray 1.4s cubic-bezier(0.2,0.7,0.2,1)",
          }}
        />
        <g
          style={{
            transformOrigin: "60px 58px",
            transform: `rotate(${-90 + pct * 180}deg)`,
            transition: "transform 1.4s cubic-bezier(0.2,0.7,0.2,1)",
          }}
        >
          <line
            x1="60"
            y1="58"
            x2="60"
            y2={58 - needleLen}
            stroke="var(--foreground)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="60" cy="58" r="3.5" fill="var(--foreground)" />
        </g>
      </svg>
      <div className="shrink-0 text-center leading-none">
        <div className="font-mono text-base font-bold tabular" style={{ color: CH1 }}>
          {n.toFixed(1)}
        </div>
        <div className="text-[8px] uppercase tracking-widest text-muted-foreground">MW</div>
      </div>
    </div>
  );
}

function WindEnergyBars() {
  // Replit wind chart shape → steam MW bars + hydro MW line (plant tags)
  const data = Array.from({ length: 22 }, (_, i) => ({
    t: i,
    steam: 220 + Math.abs(Math.sin(i / 2)) * 90 + Math.random() * 12,
    hydro: 8 + Math.sin(i / 3) * 3 + Math.random() * 1.5,
  }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="we-b" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={CH1} stopOpacity="0.95" />
            <stop offset="100%" stopColor={CH1} stopOpacity="0.4" />
          </linearGradient>
        </defs>
        <Bar dataKey="steam" fill="url(#we-b)" radius={[3, 3, 0, 0]} animationDuration={1200} />
        <Line type="monotone" dataKey="hydro" stroke="white" strokeWidth={1.6} dot={false} style={{ filter: "drop-shadow(0 0 4px white)" }} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function TargetProgress() {
  const target = 150000;
  const live = useLiveNumber(147732, 0.002, 2000);
  const pct = Math.min(1, live / target);
  return (
    <div className="flex h-full flex-col justify-center gap-2">
      <div className="grid grid-cols-3 gap-1 text-[8px] uppercase tracking-widest text-muted-foreground">
        <div>
          <div className="font-mono text-xs font-bold text-foreground tabular">{(target / 1000).toFixed(0)}k</div>
          Target
        </div>
        <div className="text-center">
          <div className="font-mono text-xs font-bold tabular" style={{ color: CH1 }}>{(live - target).toFixed(0)}</div>
          Delta
        </div>
        <div className="text-right">
          <div className="font-mono text-xs font-bold text-foreground tabular">{(pct * 100).toFixed(1)}%</div>
          Complete
        </div>
      </div>
      <div className="relative h-2.5 overflow-hidden rounded-full bg-muted">
        <div className="absolute inset-y-0 left-0 rounded-full bar-grow" style={{ width: `${pct * 100}%`, background: `linear-gradient(90deg, ${CH2}, ${CH1})`, boxShadow: `0 0 10px ${CH1}` }} />
        <div className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background" style={{ left: `${pct * 100}%`, background: CH1, boxShadow: `0 0 10px ${CH1}` }} />
      </div>
      <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
        <span>0</span><span className="pulse-live" style={{ color: CH1 }}>● live</span><span>{target.toLocaleString()}</span>
      </div>
    </div>
  );
}

/* ---------- borrower / soft dashboard visuals ---------- */

function SemiDonutLegend() {
  const items = [
    { l: "Gen", v: 18.6, c: CH1 },
    { l: "Turb", v: 3.9, c: CH5 },
    { l: "Boil", v: 3.2, c: "var(--success)" },
    { l: "Water", v: 0.8, c: "var(--muted-foreground)" },
  ];
  const live = useCountUp(26.5, 1200);
  return (
    <div className="grid h-full w-full grid-cols-2 items-center gap-3">
      <div className="relative">
        <svg viewBox="0 0 120 80" className="h-full w-full">
          <defs>
            <linearGradient id="sd-g" x1="0" x2="1">
              <stop offset="0%" stopColor="var(--danger)" />
              <stop offset="50%" stopColor={CH5} />
              <stop offset="100%" stopColor="var(--success)" />
            </linearGradient>
          </defs>
          <path d="M 12 68 A 48 48 0 0 1 108 68" stroke="var(--muted)" strokeWidth="10" fill="none" strokeLinecap="round" />
          <path d="M 12 68 A 48 48 0 0 1 108 68" stroke="url(#sd-g)" strokeWidth="10" fill="none" strokeLinecap="round"
            strokeDasharray="150" strokeDashoffset="30" style={{ transition: "stroke-dashoffset 1.4s" }} />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-2">
          <div className="font-mono text-xl font-bold tabular">${live.toFixed(1)}k</div>
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Shift value</div>
        </div>
      </div>
      <div className="space-y-1.5">
        {items.map((it, i) => (
          <div key={it.l} className="rise flex items-center gap-2 text-[11px]" style={{ animationDelay: `${i * 80}ms` }}>
            <span className="h-2 w-2 rounded-full" style={{ background: it.c }} />
            <span className="font-semibold">{it.l}</span>
            <span className="flex-1 border-b border-dashed border-border" />
            <span className="font-mono font-semibold">${it.v.toFixed(1)}k</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RiverStream() {
  const bands = [
    { c: "var(--success)", d: "M0 60 C 60 55 120 45 200 30 L200 45 C 120 58 60 65 0 72 Z" },
    { c: CH5, d: "M0 72 C 60 70 120 62 200 50 L200 68 C 120 78 60 84 0 88 Z" },
    { c: "var(--danger)", d: "M0 88 C 60 90 120 92 200 78 L200 100 C 120 108 60 112 0 108 Z" },
  ];
  const marks = [
    { x: "10%", top: "22%", bot: "78%" },
    { x: "50%", top: "42%", bot: "67%" },
    { x: "88%", top: "60%", bot: "57%" },
  ];
  return (
    <div className="relative h-full w-full">
      <svg viewBox="0 0 200 120" preserveAspectRatio="none" className="h-full w-full">
        <defs>
          {bands.map((b, i) => (
            <linearGradient key={i} id={`rs-${i}`} x1="0" x2="1">
              <stop offset="0%" stopColor={b.c} stopOpacity="0.25" />
              <stop offset="100%" stopColor={b.c} stopOpacity="0.9" />
            </linearGradient>
          ))}
          <clipPath id="rs-clip">
            <rect x="0" y="0" width="200" height="120">
              <animate attributeName="width" from="0" to="200" dur="1.4s" fill="freeze" />
            </rect>
          </clipPath>
        </defs>
        <g clipPath="url(#rs-clip)">
          {bands.map((b, i) => (
            <path key={i} d={b.d} fill={`url(#rs-${i})`} />
          ))}
        </g>
      </svg>
      {marks.map((m, i) => (
        <div key={i} className="absolute inset-y-0 border-l border-dashed border-border" style={{ left: m.x }}>
          <div className="absolute -translate-x-1/2 rounded bg-surface px-1.5 py-0.5 text-[9px] font-mono font-semibold shadow-sm" style={{ top: 0, left: 0 }}>{m.top}</div>
          <div className="absolute -translate-x-1/2 rounded bg-surface px-1.5 py-0.5 text-[9px] font-mono font-semibold shadow-sm" style={{ bottom: 0, left: 0 }}>{m.bot}</div>
        </div>
      ))}
    </div>
  );
}

function SCurveTrend() {
  const series = [
    { name: "Actual MW", c: CH1, data: Array.from({ length: 12 }, (_, i) => 20 + 70 / (1 + Math.exp(-(i - 6) / 1.4))) },
    { name: "Plan", c: CH5, data: Array.from({ length: 12 }, (_, i) => 30 + 40 / (1 + Math.exp(-(i - 7) / 1.6))) },
    { name: "Forecast", c: "var(--muted-foreground)", data: Array.from({ length: 12 }, (_, i) => 28 + 25 / (1 + Math.exp(-(i - 8) / 2))) },
  ];
  const merged = series[0].data.map((_, i) => {
    const row: Record<string, number> = { t: i };
    series.forEach((s) => (row[s.name] = s.data[i]));
    return row;
  });
  return (
    <div className="grid h-full w-full grid-cols-[1fr_auto] items-stretch gap-3">
      <div className="relative min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={merged} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            {series.map((s) => (
              <Line key={s.name} type="monotone" dataKey={s.name} stroke={s.c} strokeWidth={2.5} dot={false} animationDuration={1600} />
            ))}
          </LineChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute left-[45%] top-0 h-full w-px border-l border-dashed border-border" />
        <div className="absolute left-[45%] top-1 -translate-x-1/2 rounded-md bg-foreground px-2 py-0.5 text-[10px] font-mono font-semibold text-background shadow">45 <span style={{ color: "var(--success)" }}>+1.2%</span></div>
      </div>
      <div className="flex flex-col justify-center gap-1.5">
        {series.map((s) => (
          <div
            key={s.name}
            className="rounded-full border px-2 py-0.5 text-[10px] font-semibold shadow-sm"
            style={{ borderColor: s.c, color: s.c, background: `color-mix(in oklab, ${s.c} 12%, var(--surface))` }}
          >
            {s.name}
          </div>
        ))}
      </div>
    </div>
  );
}

function HeatBlobs() {
  const blobs = [
    { x: "20%", y: "30%", c: "var(--danger)", s: 130 },
    { x: "55%", y: "25%", c: CH5, s: 150 },
    { x: "70%", y: "60%", c: "var(--success)", s: 140 },
    { x: "30%", y: "70%", c: CH2, s: 120 },
    { x: "50%", y: "50%", c: CH1, s: 100 },
  ];
  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg">
      {blobs.map((b, i) => (
        <div
          key={i}
          className="fade-scale absolute rounded-full blur-2xl"
          style={{
            width: b.s,
            height: b.s,
            left: b.x,
            top: b.y,
            background: b.c,
            opacity: 0.7,
            transform: "translate(-50%, -50%)",
            animationDelay: `${i * 120}ms`,
          }}
        />
      ))}
      <div className="absolute bottom-2 right-2 space-y-1 rounded-md bg-surface/80 px-2 py-1.5 text-[10px] backdrop-blur">
        {[{ l: "<60%", c: "var(--danger)" }, { l: "<40%", c: CH5 }, { l: "<20%", c: "var(--success)" }].map((x) => (
          <div key={x.l} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: x.c }} />
            <span className="font-mono">{x.l}</span>
          </div>
        ))}
      </div>
      <div className="absolute left-3 top-3 rounded-lg bg-foreground/95 px-3 py-2 text-background shadow-lg">
        <div className="text-[10px] uppercase tracking-widest opacity-70">Generator area</div>
        <div className="font-mono text-lg font-bold" style={{ color: "var(--success)" }}>$13.3k</div>
        <div className="text-[9px] opacity-70">Est. shift value</div>
      </div>
    </div>
  );
}

/* ---------- decks ---------- */

/** PlantOS-worded decks (Lovable visuals). Question→card wiring comes later. */
export const DECKS: { name: string; tag: string; roleHint: string; cards: Card[] }[] = [
  {
    name: "Energy value",
    tag: "Finance · live $ from production",
    roleHint: "finance",
    cards: [
      { id: "EnergyValueTrend", label: "Shift energy value", hint: "$ from P4_ST_PO × price", bg: `linear-gradient(135deg, color-mix(in oklab, ${CH1} 14%, var(--surface)), var(--surface))`, render: () => <PulseNumber base={248420} prefix="$" /> },
      { id: "PowerSourceMix", label: "Steam vs hydro mix", hint: "ST_PO vs HT_PO share", bg: `linear-gradient(135deg, color-mix(in oklab, ${CH2} 12%, var(--surface)), var(--surface))`, render: () => <Donut /> },
      { id: "TargetAttainment", label: "Target attainment", hint: "MWh vs shift target", bg: `linear-gradient(135deg, color-mix(in oklab, ${CH3} 12%, var(--surface)), var(--surface))`, render: () => <Gauge value={74} color={CH3} /> },
      { id: "ProductionVolume", label: "Production volume", hint: "Recent MW pulse", bg: `linear-gradient(135deg, color-mix(in oklab, ${CH4} 12%, var(--surface)), var(--surface))`, render: () => <LiveBars /> },
    ],
  },
  {
    name: "Throughput funnel",
    tag: "Ops · flow from demand to delivered",
    roleHint: "operations",
    cards: [
      { id: "ProcessFunnel", label: "Process funnel", hint: "Demand → steam → MW", bg: `linear-gradient(135deg, color-mix(in oklab, ${CH1} 12%, var(--surface)), var(--surface))`, render: () => <Funnel /> },
      { id: "AreaActivityGrid", label: "Area activity", hint: "Boiler · turbine · water · gen", bg: `linear-gradient(135deg, color-mix(in oklab, ${CH2} 12%, var(--surface)), var(--surface))`, render: () => <DotsGrid /> },
      { id: "StreamCompare", label: "Stream compare", hint: "Tag families side-by-side", bg: `linear-gradient(135deg, color-mix(in oklab, ${CH3} 12%, var(--surface)), var(--surface))`, render: () => <WaveformStack /> },
      { id: "TagUpdateRate", label: "Tag update rate", hint: "Live sample velocity", bg: `linear-gradient(135deg, color-mix(in oklab, ${CH4} 12%, var(--surface)), var(--surface))`, render: () => <PulseNumber base={1842} suffix="" /> },
    ],
  },
  {
    name: "Cost & risk posture",
    tag: "Finance · margin and risk bands",
    roleHint: "finance",
    cards: [
      { id: "PlantHealthRadar", label: "Plant health radar", hint: "Cost · margin · uptime · target", bg: `linear-gradient(135deg, color-mix(in oklab, ${CH1} 12%, var(--surface)), var(--surface))`, render: () => <RadarViz /> },
      { id: "OutputHeatmap", label: "Output heatmap", hint: "Intensity by hour/shift", bg: `linear-gradient(135deg, color-mix(in oklab, ${CH2} 12%, var(--surface)), var(--surface))`, render: () => <Heatmap /> },
      { id: "CostMixBubbles", label: "Cost mix", hint: "Energy · labour · fixed", bg: `linear-gradient(135deg, color-mix(in oklab, ${CH3} 12%, var(--surface)), var(--surface))`, render: () => <Bubbles /> },
      { id: "ShiftBands", label: "Shift bands", hint: "On-target · watch · short", bg: `linear-gradient(135deg, color-mix(in oklab, ${CH4} 12%, var(--surface)), var(--surface))`, render: () => <ProgressRings /> },
    ],
  },
  {
    name: "Agent signals",
    tag: "Investigate · model & anomaly cues",
    roleHint: "engineer",
    cards: [
      { id: "AgentOrbit", label: "Agent orbit", hint: "Engineer · ops · finance agents", bg: `linear-gradient(135deg, color-mix(in oklab, ${CH1} 14%, var(--surface)), var(--surface))`, render: () => <OrbitRings /> },
      { id: "InferenceStreams", label: "Inference streams", hint: "Live investigate signals", bg: `linear-gradient(135deg, color-mix(in oklab, ${CH2} 12%, var(--surface)), var(--surface))`, render: () => <StreamLines /> },
      { id: "AnomalyMap", label: "Anomaly map", hint: "Tags watched for drift", bg: `linear-gradient(135deg, color-mix(in oklab, ${CH3} 12%, var(--surface)), var(--surface))`, render: () => <ConstellationDots /> },
      { id: "ConfidenceScore", label: "Confidence", hint: "Route / finding confidence", bg: `linear-gradient(135deg, color-mix(in oklab, ${CH4} 12%, var(--surface)), var(--surface))`, render: () => <Gauge value={92} color={CH2} /> },
    ],
  },
  {
    name: "Plant floor",
    tag: "Ops · unit health grid",
    roleHint: "operations",
    cards: [
      { id: "UnitHealthGrid", label: "Unit health grid", hint: "RUN · FAULT · IDLE · MAINT", bg: `linear-gradient(135deg, color-mix(in oklab, ${CH1} 14%, var(--surface)), var(--surface))`, render: () => <MachineGrid /> },
      { id: "ThroughputTimeline", label: "Throughput timeline", hint: "Actual vs target rate", bg: `linear-gradient(135deg, color-mix(in oklab, ${CH2} 12%, var(--surface)), var(--surface))`, render: () => <ThroughputTimeline /> },
      { id: "QualityBreakdown", label: "Quality breakdown", hint: "First pass · rework · scrap", bg: `linear-gradient(135deg, color-mix(in oklab, var(--success) 12%, var(--surface)), var(--surface))`, render: () => <QualityRings /> },
      { id: "ActiveAlerts", label: "Active alerts", hint: "Open attention items", bg: `linear-gradient(135deg, color-mix(in oklab, var(--danger) 10%, var(--surface)), var(--surface))`, render: () => <AlertFeed /> },
    ],
  },
  {
    name: "OEE scoreboard",
    tag: "Ops · effectiveness KPIs",
    roleHint: "operations",
    cards: [
      { id: "OeeRing", label: "Overall equipment effectiveness", hint: "vs plant goal", bg: `linear-gradient(135deg, color-mix(in oklab, var(--success) 14%, var(--surface)), var(--surface))`, render: () => <OEEBig /> },
      { id: "EnergyProduced", label: "Energy produced today", hint: "MWh on pace", bg: `linear-gradient(135deg, color-mix(in oklab, ${CH1} 12%, var(--surface)), var(--surface))`, render: () => <BigNumber value={15197} unit="MWh" color={CH1} sub="Shift throughput" /> },
      { id: "OffNormalRate", label: "Off-normal rate", hint: "Attention share", bg: `linear-gradient(135deg, color-mix(in oklab, var(--warning) 12%, var(--surface)), var(--surface))`, render: () => <BigNumber value={1.0} decimals={1} unit="%" color={"var(--warning)"} sub="Tags outside normal band" /> },
      { id: "SampleInterval", label: "Sample interval", hint: "Replay / live cadence", bg: `linear-gradient(135deg, color-mix(in oklab, ${CH2} 12%, var(--surface)), var(--surface))`, render: () => <BigNumber value={1.0} decimals={1} unit="s" color={CH2} sub="HAI 1 Hz source" /> },
    ],
  },
  {
    name: "Turbine hall",
    tag: "Engineer · generator · turbine · boiler",
    roleHint: "engineer",
    cards: [
      { id: "GeneratorOutput", label: "Generator output", hint: "P4_ST_PO MW", bg: `linear-gradient(135deg, color-mix(in oklab, var(--success) 14%, var(--surface)), var(--surface))`, render: () => <BigNumber value={302.4} decimals={1} unit="MW" color={"var(--success)"} sub="Steam turbine power" /> },
      { id: "TurbineSpeed", label: "Turbine speed", hint: "P2_SIT01 rpm", bg: `linear-gradient(135deg, color-mix(in oklab, ${CH2} 14%, var(--surface)), var(--surface))`, render: () => <TurbineRotor /> },
      { id: "BoilerPressure", label: "Boiler pressure", hint: "P1_PIT01", bg: `linear-gradient(135deg, color-mix(in oklab, var(--warning) 12%, var(--surface)), var(--surface))`, render: () => <BigNumber value={1.07} decimals={2} unit="bar" color={"var(--warning)"} sub="Normal 0.5–2.0 bar" /> },
      { id: "ClosestToLimit", label: "Closest to limit", hint: "Load · speed · pressure · water", bg: `linear-gradient(135deg, color-mix(in oklab, ${CH3} 14%, var(--surface)), var(--surface))`, render: () => <ConditionBars /> },
    ],
  },
  {
    name: "Process signals",
    tag: "Engineer · streams & spectra",
    roleHint: "engineer",
    cards: [
      { id: "OutputVsDemand", label: "Output vs demand", hint: "Last 30 minutes", bg: `linear-gradient(135deg, color-mix(in oklab, ${CH1} 14%, var(--surface)), var(--surface))`, render: () => <ProcessSignals /> },
      { id: "UtilityFlow", label: "Utility flow", hint: "Steam · water · fuel", bg: `linear-gradient(135deg, color-mix(in oklab, ${CH2} 12%, var(--surface)), var(--surface))`, render: () => <PipeFlow /> },
      { id: "ThermalMap", label: "Thermal map", hint: "Temp field proxy", bg: `linear-gradient(135deg, color-mix(in oklab, var(--danger) 10%, var(--surface)), var(--surface))`, render: () => <ThermalMap /> },
      { id: "VibrationSpectrum", label: "Vibration spectrum", hint: "P2_VT* bins", bg: `linear-gradient(135deg, color-mix(in oklab, ${CH3} 12%, var(--surface)), var(--surface))`, render: () => <VibrationSpectrum /> },
    ],
  },
  {
    name: "Shift command",
    tag: "Ops · shift performance",
    roleHint: "operations",
    cards: [
      { id: "ShiftComparison", label: "Shift comparison", hint: "Planned vs actual MWh", bg: `linear-gradient(135deg, color-mix(in oklab, ${CH1} 14%, var(--surface)), var(--surface))`, render: () => <ShiftBars /> },
      { id: "AreaUtilization", label: "Area utilization", hint: "Four plant areas", bg: `linear-gradient(135deg, color-mix(in oklab, ${CH2} 12%, var(--surface)), var(--surface))`, render: () => <ProgressRings /> },
      { id: "ShiftAlerts", label: "Shift alerts", hint: "Prioritized attention", bg: `linear-gradient(135deg, color-mix(in oklab, var(--danger) 10%, var(--surface)), var(--surface))`, render: () => <AlertFeed /> },
      { id: "ShiftThroughput", label: "Shift throughput", hint: "vs target line", bg: `linear-gradient(135deg, color-mix(in oklab, ${CH3} 12%, var(--surface)), var(--surface))`, render: () => <ThroughputTimeline /> },
    ],
  },
  {
    name: "Reliability",
    tag: "Engineer · condition monitoring",
    roleHint: "engineer",
    cards: [
      { id: "AssetRadar", label: "Asset radar", hint: "Five subsystems", bg: `linear-gradient(135deg, color-mix(in oklab, ${CH1} 14%, var(--surface)), var(--surface))`, render: () => <RadarViz /> },
      { id: "BearingVibration", label: "Bearing vibration", hint: "Spike watch", bg: `linear-gradient(135deg, color-mix(in oklab, var(--warning) 12%, var(--surface)), var(--surface))`, render: () => <VibrationSpectrum /> },
      { id: "ThermalSignature", label: "Thermal signature", hint: "Zone heat map", bg: `linear-gradient(135deg, color-mix(in oklab, var(--danger) 10%, var(--surface)), var(--surface))`, render: () => <ThermalMap /> },
      { id: "TurbineRotorCard", label: "Turbine rotor", hint: "P2_SIT01 live rpm", bg: `linear-gradient(135deg, color-mix(in oklab, ${CH2} 14%, var(--surface)), var(--surface))`, render: () => <TurbineRotor /> },
    ],
  },
  {
    name: "Hydro & feed",
    tag: "Engineer · hydro unit + feed",
    roleHint: "engineer",
    cards: [
      { id: "HydroUnit", label: "Hydro unit", hint: "P4_HT_PO faceplate", bg: `linear-gradient(135deg, color-mix(in oklab, ${CH1} 14%, var(--surface)), var(--surface))`, render: () => <WindTurbine /> },
      { id: "HydroEnergyBars", label: "Steam · hydro MW", hint: "P4_ST_PO bars · P4_HT_PO line", bg: `linear-gradient(135deg, color-mix(in oklab, ${CH2} 12%, var(--surface)), var(--surface))`, render: () => <WindEnergyBars /> },
      { id: "ComponentTemps", label: "Component temps", hint: "Bearing · ambient · rotor · stator", bg: `linear-gradient(135deg, color-mix(in oklab, ${CH1} 10%, var(--surface)), var(--surface))`, render: () => <TempChips /> },
      { id: "PowerAndTarget", label: "Power · target", hint: "P4_ST_PO vs shift target", bg: `linear-gradient(135deg, color-mix(in oklab, var(--success) 12%, var(--surface)), var(--surface))`, render: () => (
        <div className="grid h-full grid-cols-[108px_1fr] items-stretch gap-2">
          <div className="min-h-0 overflow-hidden"><HalfGauge /></div>
          <div className="min-w-0 min-h-0"><TargetProgress /></div>
        </div>
      ) },
    ],
  },
  {
    name: "Value by area",
    tag: "Finance · portfolio-style plant value",
    roleHint: "finance",
    cards: [
      { id: "ValueByArea", label: "Value by area", hint: "Boiler · turbine · gen · water $", bg: `linear-gradient(135deg, color-mix(in oklab, ${CH1} 10%, var(--surface)), var(--surface))`, render: () => <SemiDonutLegend /> },
      { id: "PlantValueMap", label: "Plant value map", hint: "Density by area", bg: `linear-gradient(135deg, color-mix(in oklab, ${CH5} 10%, var(--surface)), var(--surface))`, render: () => <HeatBlobs /> },
      { id: "FinanceFunnelDetail", label: "Value funnel detail", hint: "Opened · engaged · booked $", bg: `linear-gradient(135deg, color-mix(in oklab, ${CH2} 10%, var(--surface)), var(--surface))`, render: () => (
        <div className="grid h-full grid-rows-[auto_1fr] gap-2">
          <BorrowerKPIs />
          <div className="min-h-0"><RiverStream /></div>
        </div>
      ) },
      { id: "ForecastTrajectory", label: "Forecast trajectory", hint: "Actual vs plan S-curve", bg: `linear-gradient(135deg, color-mix(in oklab, var(--success) 10%, var(--surface)), var(--surface))`, render: () => <SCurveTrend /> },
    ],
  },
  ...REPLIT_DECKS,
];

function BorrowerKPIs() {
  const items = [
    { v: 27.8, unit: "k$", l: "Booked", c: CH1 },
    { v: 67, unit: "%", l: "On target", c: CH5 },
    { v: 24, unit: "%", l: "At risk", c: "var(--success)" },
  ];
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {items.map((it, i) => {
        const live = useLiveNumber(it.v, 0.008, 2000);
        const n = useCountUp(live, 900);
        return (
          <div key={it.l} className="fade-scale flex flex-col justify-center rounded-md border border-border bg-surface/70 px-2 py-1" style={{ animationDelay: `${i * 100}ms` }}>
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{it.l}</div>
            <div className="flex items-baseline gap-0.5 font-mono">
              <span className="text-base font-bold tabular" style={{ color: it.c }}>{it.unit === "%" ? n.toFixed(0) : n.toFixed(1)}</span>
              <span className="text-[10px] text-muted-foreground">{it.unit}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------
   Deck component
------------------------------------------------------------------ */

export function PlantVisualDeck() {
  const [idx, setIdx] = useState(0);
  const deck = DECKS[idx];

  // auto-advance
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % DECKS.length), 9000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* Left nav rail */}
      <aside className="col-span-12 md:col-span-3 xl:col-span-2">
        <div className="card-surface flex h-full flex-col p-3">
          <div className="mb-3 px-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            PlantOS decks
          </div>
          <div className="flex flex-1 flex-col gap-2">
            {DECKS.map((d, i) => {
              const active = i === idx;
              return (
                <button
                  key={d.name}
                  onClick={() => setIdx(i)}
                  className={`group relative overflow-hidden rounded-xl border p-3 text-left transition ${
                    active
                      ? "border-primary/40 bg-gradient-to-br from-primary/12 to-accent/10"
                      : "border-border bg-surface hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`grid h-7 w-7 place-items-center rounded-lg text-[11px] font-semibold ${
                        active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/70"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className={`text-sm font-medium leading-tight ${active ? "text-foreground" : "text-foreground/80"}`}>
                        {d.name}
                      </div>
                      <div className="truncate text-[11px] text-muted-foreground">{d.roleHint} · {d.tag}</div>
                    </div>
                    {active && <span className="pulse-live h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  {active && (
                    <div className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-gradient-to-r from-primary to-accent bar-grow" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <button
              onClick={() => setIdx((i) => (i - 1 + DECKS.length) % DECKS.length)}
              className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-muted"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-[11px] tabular text-muted-foreground">
              {idx + 1} / {DECKS.length}
            </span>
            <button
              onClick={() => setIdx((i) => (i + 1) % DECKS.length)}
              className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-muted"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Right 2x2 card grid */}
      <section className="col-span-12 md:col-span-9 xl:col-span-10">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Deck {idx + 1} · {deck.roleHint}
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {deck.name}{" "}
              <span className="text-base font-normal text-muted-foreground">— {deck.tag}</span>
            </h2>
          </div>
        </div>
        <div key={deck.name} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {deck.cards.map((c, i) => (
            <article
              key={c.id}
              className="card-surface relative overflow-hidden p-4 rise"
              style={{ animationDelay: `${i * 90}ms`, background: c.bg, minHeight: 260 }}
            >
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <div className="text-sm font-semibold">{c.label}</div>
                  <div className="text-[11px] text-muted-foreground">{c.hint}</div>
                </div>
                <span className="flex items-center gap-1.5 rounded-full bg-surface/70 px-2 py-0.5 text-[10px] font-semibold text-foreground/70 backdrop-blur">
                  <span className="pulse-live h-1.5 w-1.5 rounded-full bg-[color:var(--success)]" />
                  Live
                </span>
              </div>
              <div className="relative h-44">{c.render()}</div>
              <div
                className="pointer-events-none absolute -right-10 -bottom-10 h-32 w-32 rounded-full opacity-40 blur-3xl"
                style={{ background: `radial-gradient(circle, ${CH2}, transparent 70%)` }}
              />
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
