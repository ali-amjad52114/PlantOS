"use client";

import { useEffect, useRef, useState } from "react";
import { SparkTrend } from "@/components/charts";
import { formatPacificTimestamp } from "@/lib/format-time";

type OverviewSnapshot = {
  productionMW?: number | null;
  turbineSpeed?: number | null;
  boilerPressure?: number | null;
  steamFlow?: number | null;
  elapsedMs?: number;
  dataSource?: string;
  attention?: Array<{
    tag: string;
    label: string;
    value: number;
    unit: string;
    outside?: boolean;
  }>;
  trends?: {
    P4_ST_PO?: Array<{ ts?: string; value?: number }>;
    P2_SIT01?: Array<{ ts?: string; value?: number }>;
  };
  error?: string;
};

function fmt(n: number | null | undefined, digits = 2) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return Number(n).toFixed(digits);
}

export function OverviewPanel({
  snapshot,
  live,
  loading,
  liveMoving,
}: {
  snapshot: OverviewSnapshot | null;
  live: any;
  loading?: boolean;
  liveMoving?: boolean;
}) {
  if (loading && !snapshot) {
    return (
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card-surface h-24 animate-pulse bg-muted/60" />
        ))}
      </div>
    );
  }

  if (snapshot?.error) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
        Overview failed: {snapshot.error}
      </div>
    );
  }

  if (!snapshot) {
    return (
      <p className="text-sm text-muted-foreground">Waiting for ClickHouse plant snapshot…</p>
    );
  }

  const outside = (snapshot.attention || []).filter((a) => a.outside).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span>
          ClickHouse · {snapshot.dataSource ?? "unknown"} · {snapshot.elapsedMs ?? "—"} ms
          {liveMoving ? " · refreshing while Start is playing" : ""}
        </span>
        <span>
          {formatPacificTimestamp(live?.live?.max_ts)} PT · {String(live?.live?.c ?? 0)} rows
          {live?.liveAgeSec != null ? ` · ${Math.round(live.liveAgeSec)}s ago` : ""}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Generator output"
          value={`${fmt(snapshot.productionMW)} MW`}
          raw={snapshot.productionMW}
          hint="P4_ST_PO · live"
          tone="primary"
          liveMoving={liveMoving}
        />
        <MetricCard
          title="Turbine speed"
          value={`${fmt(snapshot.turbineSpeed, 1)} rpm`}
          raw={snapshot.turbineSpeed}
          hint="P2_SIT01 · live"
          tone="accent"
          liveMoving={liveMoving}
        />
        <MetricCard
          title="Boiler pressure"
          value={fmt(snapshot.boilerPressure, 3)}
          raw={snapshot.boilerPressure}
          hint="P1_PIT01 · live"
          tone="warning"
          liveMoving={liveMoving}
        />
        <MetricCard
          title="Steam flow"
          value={fmt(snapshot.steamFlow, 2)}
          raw={snapshot.steamFlow}
          hint="P1_FT01 · live"
          tone="chart"
          liveMoving={liveMoving}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="card-surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Generator trend (P4_ST_PO)</h3>
            <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-[color:var(--success)]">
              ClickHouse
            </span>
          </div>
          <SparkTrend data={snapshot.trends?.P4_ST_PO || []} unit="MW" />
        </div>

        <div className="card-surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Closest to limits</h3>
            <span className="text-[11px] text-muted-foreground">
              {outside > 0 ? `${outside} outside band` : "All in band"}
            </span>
          </div>
          <ul className="space-y-2 text-sm">
            {(snapshot.attention || []).slice(0, 5).map((a) => (
              <li
                key={a.tag}
                className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 ${
                  a.outside ? "bg-warning/10 text-foreground" : "bg-muted/50 text-foreground/80"
                }`}
              >
                <span className="truncate">{a.label}</span>
                <span className="tabular shrink-0 text-xs font-medium">
                  {fmt(a.value)} {a.unit}
                </span>
              </li>
            ))}
            {(snapshot.attention || []).length === 0 && (
              <li className="text-muted-foreground">No attention tags in snapshot.</li>
            )}
          </ul>
        </div>
      </div>

      <div className="card-surface p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Turbine speed trend (P2_SIT01)</h3>
          <span className="text-[11px] text-muted-foreground">Last hour from ClickHouse</span>
        </div>
        <SparkTrend data={snapshot.trends?.P2_SIT01 || []} unit="rpm" />
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  raw,
  hint,
  tone,
  liveMoving,
}: {
  title: string;
  value: string;
  raw?: number | null;
  hint: string;
  tone: "primary" | "accent" | "warning" | "chart";
  liveMoving?: boolean;
}) {
  const prev = useRef<number | null>(null);
  const [flash, setFlash] = useState(0);

  useEffect(() => {
    if (raw == null || Number.isNaN(Number(raw))) return;
    const n = Number(raw);
    if (prev.current != null && Math.abs(n - prev.current) > 0.0001) {
      setFlash((f) => f + 1);
    }
    prev.current = n;
  }, [raw]);

  const wash =
    tone === "primary"
      ? "color-mix(in oklab, var(--primary) 12%, var(--surface))"
      : tone === "accent"
        ? "color-mix(in oklab, var(--accent) 14%, var(--surface))"
        : tone === "warning"
          ? "color-mix(in oklab, var(--warning) 12%, var(--surface))"
          : "color-mix(in oklab, var(--chart-3) 12%, var(--surface))";

  return (
    <div className="card-surface rise p-4" style={{ background: wash }}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12px] font-medium text-foreground/70">{title}</p>
        <span className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-[color:var(--success)]">
          <span className="pulse-live h-1.5 w-1.5 rounded-full bg-[color:var(--success)]" />
          {liveMoving ? "Moving" : "Live"}
        </span>
      </div>
      <p
        key={flash}
        className={`mt-2 text-2xl font-semibold tracking-tight tabular ${flash ? "count-flash" : ""}`}
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}
