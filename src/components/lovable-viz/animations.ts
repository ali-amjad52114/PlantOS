import { useEffect, useRef, useState } from "react";

/** Animated count-up from 0 to `value`. */
export function useCountUp(value: number, duration = 1200) {
  const [n, setN] = useState(0);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(0);
  const toRef = useRef(value);

  useEffect(() => {
    fromRef.current = n;
    toRef.current = value;
    startRef.current = null;
    let raf = 0;
    const tick = (t: number) => {
      if (startRef.current === null) startRef.current = t;
      const p = Math.min(1, (t - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(fromRef.current + (toRef.current - fromRef.current) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return n;
}

/** Number that drifts slightly over time to feel "live". */
export function useLiveNumber(base: number, driftPct = 0.004, intervalMs = 2200) {
  const [v, setV] = useState(base);
  useEffect(() => {
    setV(base);
    const id = setInterval(() => {
      setV((prev) => {
        const drift = base * driftPct * (Math.random() - 0.5) * 2;
        // pull gently back toward base
        const next = prev + drift + (base - prev) * 0.15;
        return next;
      });
    }, intervalMs);
    return () => clearInterval(id);
  }, [base, driftPct, intervalMs]);
  return v;
}

/** Formats a number similarly to the existing $/comma pattern. */
export function fmt(n: number, opts?: { currency?: boolean; decimals?: number }) {
  const dec = opts?.decimals ?? 0;
  const s = n.toLocaleString(undefined, {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
  return opts?.currency ? `$${s}` : s;
}
