"use client";

import { useEffect, useRef, useState } from "react";
import type { ReplayProgress } from "@/hooks/useRealtimeReplay";

/** Prominent proof strip: ClickHouse live feed is advancing (not a frozen demo). */
export function LiveFeedStrip({
  playing,
  feedActive,
  live,
  overviewMw,
  replayProgress,
}: {
  playing: boolean;
  feedActive: boolean;
  live: any;
  overviewMw?: number | null;
  replayProgress: ReplayProgress;
}) {
  const [tick, setTick] = useState(0);
  const prevMw = useRef<number | null>(null);
  const [mwFlash, setMwFlash] = useState(false);
  const [lastDelta, setLastDelta] = useState<number | null>(null);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [playing]);

  useEffect(() => {
    if (overviewMw == null || Number.isNaN(Number(overviewMw))) return;
    const n = Number(overviewMw);
    if (prevMw.current != null && Math.abs(n - prevMw.current) > 0.01) {
      setLastDelta(n - prevMw.current);
      setMwFlash(true);
      const t = window.setTimeout(() => setMwFlash(false), 700);
      prevMw.current = n;
      return () => window.clearTimeout(t);
    }
    prevMw.current = n;
  }, [overviewMw]);

  if (!playing && replayProgress.status === "idle") return null;

  const age =
    live?.liveAgeSec != null ? `${Math.round(live.liveAgeSec)}s ago` : "—";
  const rows = String(live?.live?.c ?? "—");
  const maxTs = live?.live?.max_ts ?? "—";
  const moving = feedActive || replayProgress.status === "running";

  return (
    <div
      className={`mx-auto w-full max-w-[1600px] px-4 pt-3 lg:px-6 ${
        moving ? "rise" : ""
      }`}
    >
      <div
        className={`card-surface flex flex-wrap items-center gap-3 border px-4 py-3 ${
          moving
            ? "border-[color:var(--success)]/40 bg-[color:var(--success)]/10"
            : "border-border bg-surface"
        }`}
      >
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
            moving
              ? "bg-[color:var(--success)] text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              moving ? "pulse-live bg-primary-foreground" : "bg-muted-foreground"
            }`}
          />
          {moving ? "LIVE FEED MOVING" : "REPLAY IDLE"}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold tracking-tight">
            ClickHouse plant_readings · source=live
            {moving ? " · values advancing from Trigger replay" : ""}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Not a static screenshot — wall-clock inserts from HAI history via Trigger.dev
            {tick > 0 ? ` · UI clock ${tick}s` : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-4 text-right">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Generator MW
            </div>
            <div
              className={`font-display text-2xl tabular leading-none ${
                mwFlash ? "count-flash text-primary" : ""
              }`}
            >
              {overviewMw != null ? Number(overviewMw).toFixed(2) : "—"}
              {lastDelta != null && mwFlash && (
                <span className="ml-2 text-sm font-sans font-semibold text-primary">
                  {lastDelta > 0 ? "↑" : "↓"}
                  {Math.abs(lastDelta).toFixed(2)}
                </span>
              )}
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground">
            <div>
              age <span className="tabular font-medium text-foreground">{age}</span>
            </div>
            <div>
              rows <span className="tabular font-medium text-foreground">{rows}</span>
            </div>
            <div className="max-w-[11rem] truncate font-mono" title={String(maxTs)}>
              {String(maxTs)}
            </div>
          </div>
          {(replayProgress.status === "running" ||
            replayProgress.insertedRows != null) && (
            <div className="text-[11px] text-muted-foreground">
              <div className="font-medium text-foreground">{replayProgress.label}</div>
              {replayProgress.insertedRows != null && (
                <div className="tabular">inserted {replayProgress.insertedRows}</div>
              )}
              {replayProgress.tickIndex != null && replayProgress.tickCount != null && (
                <div className="tabular">
                  tick {replayProgress.tickIndex + 1}/{replayProgress.tickCount}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
