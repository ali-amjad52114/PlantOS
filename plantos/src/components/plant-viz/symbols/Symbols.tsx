"use client";

import type { SymbolProps, SymbolState } from "../types";

function stateColor(state: SymbolState | null | undefined): string {
  switch (state) {
    case "on":
      return "#34d399";
    case "fault":
      return "#f87171";
    case "off":
      return "#52525b";
    default:
      return "#a1a1aa";
  }
}

function SymbolFrame({
  label,
  state,
  value,
  unit,
  children,
}: SymbolProps & { children: React.ReactNode }) {
  const c = stateColor(state ?? "unknown");
  return (
    <div className="w-full max-w-[140px] rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-center">
      <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center">{children}</div>
      <p className="text-xs font-medium text-zinc-200">{label}</p>
      <p className="text-[10px] uppercase tracking-wide" style={{ color: c }}>
        {state ?? "unknown"}
      </p>
      {value != null && Number.isFinite(Number(value)) && (
        <p className="mt-1 text-xs tabular-nums text-zinc-400">
          {Number(value).toFixed(1)}
          {unit ? ` ${unit}` : ""}
        </p>
      )}
    </div>
  );
}

export function MotorView(props: SymbolProps) {
  const c = stateColor(props.state ?? "unknown");
  return (
    <SymbolFrame {...props}>
      <svg viewBox="0 0 64 64" className="h-14 w-14">
        <circle cx="32" cy="32" r="22" fill="none" stroke={c} strokeWidth="4" />
        <circle cx="32" cy="32" r="8" fill={c} />
        <line x1="32" y1="10" x2="32" y2="18" stroke={c} strokeWidth="3" />
        <line x1="32" y1="46" x2="32" y2="54" stroke={c} strokeWidth="3" />
        <line x1="10" y1="32" x2="18" y2="32" stroke={c} strokeWidth="3" />
        <line x1="46" y1="32" x2="54" y2="32" stroke={c} strokeWidth="3" />
      </svg>
    </SymbolFrame>
  );
}

export function PumpView(props: SymbolProps) {
  const c = stateColor(props.state ?? "unknown");
  return (
    <SymbolFrame {...props}>
      <svg viewBox="0 0 64 64" className="h-14 w-14">
        <circle cx="32" cy="36" r="18" fill="none" stroke={c} strokeWidth="3" />
        <path d="M20 36 Q32 18 44 36" fill="none" stroke={c} strokeWidth="3" />
        <rect x="28" y="8" width="8" height="14" fill={c} />
      </svg>
    </SymbolFrame>
  );
}

export function ValveView(props: SymbolProps) {
  const c = stateColor(props.state ?? "unknown");
  return (
    <SymbolFrame {...props}>
      <svg viewBox="0 0 64 64" className="h-14 w-14">
        <path d="M12 32 L32 16 L52 32 L32 48 Z" fill="none" stroke={c} strokeWidth="3" />
        <line x1="32" y1="16" x2="32" y2="8" stroke={c} strokeWidth="3" />
        <line x1="24" y1="8" x2="40" y2="8" stroke={c} strokeWidth="3" />
      </svg>
    </SymbolFrame>
  );
}

export function VesselView(props: SymbolProps) {
  const c = stateColor(props.state ?? "unknown");
  const fill = props.value != null ? Math.max(0, Math.min(1, Number(props.value) / 100)) : 0.45;
  return (
    <SymbolFrame {...props}>
      <svg viewBox="0 0 64 64" className="h-14 w-14">
        <rect x="16" y="12" width="32" height="44" rx="6" fill="none" stroke={c} strokeWidth="3" />
        <rect
          x="16"
          y={12 + 44 * (1 - fill)}
          width="32"
          height={44 * fill}
          fill={c}
          opacity="0.35"
          className="transition-all duration-500"
        />
      </svg>
    </SymbolFrame>
  );
}

export function SensorView(props: SymbolProps) {
  const c = stateColor(props.state ?? "unknown");
  return (
    <SymbolFrame {...props}>
      <svg viewBox="0 0 64 64" className="h-14 w-14">
        <circle cx="32" cy="28" r="14" fill="none" stroke={c} strokeWidth="3" />
        <rect x="28" y="42" width="8" height="14" fill={c} />
        <circle cx="32" cy="28" r="4" fill={c} />
      </svg>
    </SymbolFrame>
  );
}
