"use client";

import type { ReactNode } from "react";
import { PreBuiltCatalog } from "@/components/pre-built-catalog";
import { RunProgress } from "@/components/run-progress";
import type { InvestigateProgress } from "@/hooks/useRealtimeInvestigate";

export function ShellOverflow({
  routeQuestion,
  onRouteQuestion,
  triggering,
  onRoute,
  onParallel,
  onSingle,
  onToggleEvidence,
  onToggleAssumptions,
  showEvidence,
  showAssumptions,
  showPrebuilt,
  onTogglePrebuilt,
  rtProgress,
  routeNote,
  rtRunId,
  evidence,
  assumptions,
}: {
  routeQuestion: string;
  onRouteQuestion: (v: string) => void;
  triggering: boolean;
  onRoute: () => void;
  onParallel: () => void;
  onSingle: () => void;
  onToggleEvidence: () => void;
  onToggleAssumptions: () => void;
  showEvidence: boolean;
  showAssumptions: boolean;
  showPrebuilt: boolean;
  onTogglePrebuilt: () => void;
  rtProgress: InvestigateProgress;
  routeNote: string | null;
  rtRunId?: string;
  evidence?: ReactNode;
  assumptions?: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <label className="block text-xs text-muted-foreground">
          Route / parallel question
          <textarea
            value={routeQuestion}
            onChange={(e) => onRouteQuestion(e.target.value)}
            rows={2}
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-emerald-500/40"
          />
        </label>
        <div className="flex flex-wrap content-start gap-2">
          <OverflowBtn onClick={onRoute} disabled={triggering} tone="primary">
            {triggering ? "Triggering…" : "Route & investigate"}
          </OverflowBtn>
          <OverflowBtn onClick={onParallel} disabled={triggering} tone="sky">
            All roles parallel
          </OverflowBtn>
          <OverflowBtn onClick={onSingle} disabled={triggering}>
            Single role
          </OverflowBtn>
          <OverflowBtn onClick={onToggleEvidence} active={showEvidence}>
            Evidence
          </OverflowBtn>
          <OverflowBtn onClick={onToggleAssumptions} active={showAssumptions}>
            Assumptions
          </OverflowBtn>
          <OverflowBtn onClick={onTogglePrebuilt} active={showPrebuilt}>
            Pre-built catalog
          </OverflowBtn>
        </div>
      </div>

      <RunProgress progress={rtProgress} />
      {routeNote && <p className="text-xs text-emerald-400/90">{routeNote}</p>}
      {rtRunId && <p className="font-mono text-[10px] text-muted-foreground">runId: {rtRunId}</p>}

      {showEvidence && evidence}
      {showAssumptions && assumptions}

      {showPrebuilt && (
        <div className="max-h-[50vh] overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-3">
          <PreBuiltCatalog />
        </div>
      )}
    </div>
  );
}

function OverflowBtn({
  children,
  onClick,
  disabled,
  tone,
  active,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "primary" | "sky" | "default";
  active?: boolean;
}) {
  const base =
    "rounded-full px-3.5 py-1.5 text-sm transition disabled:opacity-50 border border-white/10";
  const styles =
    tone === "primary"
      ? "bg-emerald-500 text-primary-foreground border-transparent"
      : tone === "sky"
        ? "bg-sky-600 text-white border-transparent"
        : active
          ? "bg-white/15 text-foreground"
          : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground";
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${base} ${styles}`}>
      {children}
    </button>
  );
}
