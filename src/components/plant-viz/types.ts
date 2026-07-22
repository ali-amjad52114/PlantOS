/** Shared props for Ignition-inspired plant visuals (props-only, no tag binding). */

export type AnalogProps = {
  label: string;
  value: number;
  min?: number | null;
  max?: number | null;
  unit?: string | null;
};

export type SymbolState = "on" | "off" | "fault" | "unknown";

export type SymbolProps = {
  label: string;
  state?: SymbolState | null;
  value?: number | null;
  unit?: string | null;
};

export function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export function analogRatio(value: number, min = 0, max = 100): number {
  if (max === min) return 0;
  return clamp01((value - min) / (max - min));
}
