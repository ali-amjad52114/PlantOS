"use client";

import { analogRatio, type AnalogProps } from "../types";

/** Semi-circular gauge — value drives needle angle. */
export function GaugeView({
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
  // SVG: needle from -120deg to +120deg
  const angle = -120 + t * 240;
  const rad = (angle * Math.PI) / 180;
  const cx = 100;
  const cy = 100;
  const r = 72;
  const nx = cx + r * Math.sin(rad);
  const ny = cy - r * Math.cos(rad);

  return (
    <div className="w-full max-w-xs rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
      <p className="mb-1 text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <svg viewBox="0 0 200 130" className="mx-auto h-36 w-full">
        <path
          d="M 28 100 A 72 72 0 0 1 172 100"
          fill="none"
          stroke="#27272a"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d="M 28 100 A 72 72 0 0 1 172 100"
          fill="none"
          stroke="#34d399"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${t * 226} 226`}
        />
        <line
          x1={cx}
          y1={cy}
          x2={nx}
          y2={ny}
          stroke="#fafafa"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="transition-all duration-500"
        />
        <circle cx={cx} cy={cy} r="5" fill="#34d399" />
      </svg>
      <p className="text-center text-2xl font-semibold tabular-nums text-zinc-100">
        {Number.isFinite(v) ? v.toFixed(1) : "—"}
        {unit ? <span className="ml-1 text-sm font-normal text-zinc-500">{unit}</span> : null}
      </p>
      <p className="text-center text-[10px] text-zinc-600">
        {lo} – {hi}
      </p>
    </div>
  );
}
