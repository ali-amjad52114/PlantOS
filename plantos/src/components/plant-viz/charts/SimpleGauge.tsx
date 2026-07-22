"use client";

import { analogRatio, type AnalogProps } from "../types";

/** Compact horizontal bar gauge. */
export function SimpleGaugeView({
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
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
        <p className="text-lg font-semibold tabular-nums text-zinc-100">
          {Number.isFinite(v) ? v.toFixed(1) : "—"}
          {unit ? <span className="ml-1 text-xs font-normal text-zinc-500">{unit}</span> : null}
        </p>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
          style={{ width: `${t}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-zinc-600">
        <span>{lo}</span>
        <span>{hi}</span>
      </div>
    </div>
  );
}
