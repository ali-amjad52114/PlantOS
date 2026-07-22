"use client";

import { analogRatio, type AnalogProps } from "../types";

export function CylindricalTankView({
  label,
  value,
  min = 0,
  max = 100,
  unit,
}: AnalogProps) {
  const lo = min ?? 0;
  const hi = max ?? 100;
  const v = Number(value);
  const t = analogRatio(v, lo, hi);
  const fillH = 100 * t;
  const y = 20 + (100 - fillH);

  return (
    <div className="w-full max-w-[140px] rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
      <p className="mb-2 text-center text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <svg viewBox="0 0 80 140" className="mx-auto h-40 w-full">
        <rect x="18" y="20" width="44" height="100" rx="4" fill="#18181b" stroke="#3f3f46" strokeWidth="2" />
        <rect
          x="18"
          y={y}
          width="44"
          height={fillH}
          fill="#34d399"
          opacity="0.85"
          className="transition-all duration-500"
        />
        <ellipse cx="40" cy="20" rx="22" ry="6" fill="#27272a" stroke="#3f3f46" strokeWidth="1" />
        <ellipse cx="40" cy="120" rx="22" ry="6" fill="#27272a" stroke="#3f3f46" strokeWidth="1" />
      </svg>
      <p className="text-center text-sm font-semibold tabular-nums">
        {Number.isFinite(v) ? v.toFixed(1) : "—"}
        {unit ? ` ${unit}` : "%"}
      </p>
    </div>
  );
}

export function ThermometerView({
  label,
  value,
  min = 0,
  max = 100,
  unit,
}: AnalogProps) {
  const lo = min ?? 0;
  const hi = max ?? 100;
  const v = Number(value);
  const t = analogRatio(v, lo, hi);
  const fillH = 90 * t;
  const y = 15 + (90 - fillH);

  return (
    <div className="w-full max-w-[100px] rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
      <p className="mb-2 text-center text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <svg viewBox="0 0 40 140" className="mx-auto h-40">
        <rect x="14" y="10" width="12" height="100" rx="6" fill="#18181b" stroke="#3f3f46" />
        <rect
          x="14"
          y={y}
          width="12"
          height={fillH}
          fill="#f87171"
          className="transition-all duration-500"
        />
        <circle cx="20" cy="120" r="14" fill="#f87171" stroke="#3f3f46" />
      </svg>
      <p className="text-center text-sm font-semibold tabular-nums">
        {Number.isFinite(v) ? v.toFixed(1) : "—"}
        {unit ? ` ${unit}` : "°"}
      </p>
    </div>
  );
}

export function LinearScaleView({
  label,
  value,
  min = 0,
  max = 100,
  unit,
}: AnalogProps) {
  const lo = min ?? 0;
  const hi = max ?? 100;
  const v = Number(value);
  const t = analogRatio(v, lo, hi) * 100;

  return (
    <div className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
      <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <div className="relative h-6 rounded bg-zinc-800">
        <div
          className="absolute top-0 h-full w-0.5 bg-emerald-400 transition-all duration-500"
          style={{ left: `calc(${t}% - 1px)` }}
        />
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-zinc-600" />
      </div>
      <p className="mt-2 text-sm font-semibold tabular-nums">
        {Number.isFinite(v) ? v.toFixed(1) : "—"}
        {unit ? ` ${unit}` : ""}
        <span className="ml-2 text-[10px] font-normal text-zinc-600">
          {lo}–{hi}
        </span>
      </p>
    </div>
  );
}

export function MovingAnalogIndicatorView(props: AnalogProps) {
  return <LinearScaleView {...props} />;
}

export function LedDisplayView({
  label,
  value,
  unit,
}: AnalogProps) {
  const v = Number(value);
  return (
    <div className="rounded-lg border border-zinc-800 bg-black p-3 font-mono">
      <p className="mb-1 text-[10px] uppercase tracking-widest text-zinc-500">{label}</p>
      <p className="text-3xl tabular-nums text-emerald-400">
        {Number.isFinite(v) ? v.toFixed(1) : "----"}
        {unit ? <span className="ml-2 text-sm text-emerald-700">{unit}</span> : null}
      </p>
    </div>
  );
}

export function SparklineView({
  label,
  data,
  unit,
}: {
  label: string;
  data: Array<Record<string, string | number | null>>;
  xKey?: string | null;
  yKey?: string | null;
  unit?: string | null;
}) {
  const yKey = "v";
  const pts = (data || [])
    .map((d, i) => ({ i, v: Number(d.v ?? d.value ?? Object.values(d).find((x) => typeof x === "number") ?? 0) }))
    .filter((p) => Number.isFinite(p.v));
  if (pts.length < 2) {
    return (
      <div className="rounded-lg border border-zinc-800 p-3 text-xs text-zinc-500">
        {label}: no sparkline data
      </div>
    );
  }
  const min = Math.min(...pts.map((p) => p.v));
  const max = Math.max(...pts.map((p) => p.v));
  const w = 200;
  const h = 48;
  const path = pts
    .map((p, idx) => {
      const x = (idx / (pts.length - 1)) * w;
      const y = h - ((p.v - min) / (max - min || 1)) * (h - 4) - 2;
      return `${idx === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  const last = pts[pts.length - 1]!.v;

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-zinc-500">{label}</span>
        <span className="tabular-nums text-zinc-200">
          {last.toFixed(1)}
          {unit ? ` ${unit}` : ""}
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-12 w-full">
        <path d={path} fill="none" stroke="#34d399" strokeWidth="2" />
      </svg>
    </div>
  );
}
