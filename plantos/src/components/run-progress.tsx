"use client";

import type { InvestigateProgress } from "@/hooks/useRealtimeInvestigate";

export function RunProgress({ progress }: { progress: InvestigateProgress }) {
  if (progress.status === "idle") return null;

  const pct = Math.max(0, Math.min(100, Math.round(progress.percentage)));
  const tone =
    progress.status === "failed"
      ? "border-red-800/60 text-red-300"
      : progress.status === "complete"
        ? "border-emerald-800/60 text-emerald-300"
        : "border-zinc-700 text-zinc-300";

  return (
    <div className={`rounded-lg border bg-zinc-900/50 p-3 text-sm ${tone}`}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{progress.label}</span>
        <span className="text-xs uppercase tracking-wide text-zinc-500">
          {progress.runStatus ?? progress.status}
          {progress.status !== "failed" ? ` · ${pct}%` : ""}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full transition-all duration-300 ${
            progress.status === "failed" ? "bg-red-500" : "bg-emerald-500"
          }`}
          style={{ width: `${progress.status === "failed" ? 100 : pct}%` }}
        />
      </div>
      {progress.error && <p className="mt-2 text-xs text-red-400">{progress.error}</p>}
      <p className="mt-2 text-[10px] text-zinc-600">Trigger.dev Realtime · useRealtimeRun</p>
    </div>
  );
}
