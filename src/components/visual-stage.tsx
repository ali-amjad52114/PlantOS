"use client";

import { Loader2 } from "lucide-react";
import { OverviewPanel } from "@/components/overview-panel";
import type { PopulateProgress } from "@/components/plant-chat";
import { PlantTowerGrid } from "@/components/plant-tower-grid";
import { RoleVisual } from "@/components/plant-chat";
import type { ShellMode } from "@/components/plant-shell";
import type { PlantTowerPayload } from "@/lib/plant-tower";
import { MODE_QUESTIONS } from "@/lib/shell-prompts";

type AgentRole = "engineer" | "operations" | "finance";

export function agentRoleForMode(mode: ShellMode): AgentRole {
  if (mode === "finance") return "finance";
  if (mode === "operations") return "operations";
  return "engineer";
}

export function VisualStage({
  mode,
  agentRole,
  tower,
  roleData,
  live,
  overview,
  overviewLoading,
  onAskQuestion,
  liveMoving,
  stageProgress = null,
  awaitingQuestion = null,
}: {
  mode: ShellMode;
  agentRole: AgentRole;
  tower: PlantTowerPayload | null;
  roleData: any;
  live: any;
  overview: any;
  overviewLoading?: boolean;
  onAskQuestion?: (question: string) => void;
  liveMoving?: boolean;
  /** While Trigger.dev is running — show this instead of cards. */
  stageProgress?: PopulateProgress | null;
  awaitingQuestion?: string | null;
}) {
  const title =
    mode === "overview"
      ? "Plant overview"
      : mode === "maintenance"
        ? "Maintenance"
        : mode === "safety"
          ? "Safety"
          : `${agentRole[0].toUpperCase()}${agentRole.slice(1)} intelligence`;

  const waiting = Boolean(stageProgress);
  const hasPersonaContent = Boolean(tower || roleData);
  const questions = MODE_QUESTIONS[mode];
  const boundTower = tower?.source === "question-map" ? tower : tower;

  return (
    <div className="card-surface flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Visual stage</p>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        </div>
        <div className="text-right text-[11px] text-muted-foreground">
          <p>Live max {live?.live?.max_ts ?? "—"}</p>
          <p>
            {String(live?.live?.c ?? 0)} rows
            {live?.liveAgeSec != null ? ` · ${Math.round(live.liveAgeSec)}s` : ""}
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {waiting && stageProgress ? (
          <StageWaitingPanel progress={stageProgress} question={awaitingQuestion} />
        ) : mode === "overview" ? (
          <div className="space-y-4">
            <div className="rise">
              <OverviewPanel
                snapshot={overview}
                live={live}
                loading={overviewLoading}
                liveMoving={liveMoving}
              />
            </div>
            {boundTower && (
              <div className="rise border-t border-border pt-4">
                <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Question cards · ClickHouse bound
                </p>
                <PlantTowerGrid tower={boundTower} />
              </div>
            )}
          </div>
        ) : hasPersonaContent ? (
          <>
            {tower && (
              <div className="rise">
                <PlantTowerGrid tower={tower} />
              </div>
            )}
            {/* Keep stage on the mapped Lovable visual during demos — don't bury it under RoleVisual. */}
            {roleData &&
              tower?.source !== "question-map" &&
              (agentRole === "engineer" ||
                agentRole === "finance" ||
                agentRole === "operations") && (
                <div className="rise border-t border-border pt-4">
                  <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Investigation detail
                  </p>
                  <RoleVisual role={agentRole} data={roleData} />
                </div>
              )}
          </>
        ) : (
          <EmptyPersonaStage
            mode={mode}
            questions={questions}
            onAskQuestion={onAskQuestion}
          />
        )}
      </div>
    </div>
  );
}

function StageWaitingPanel({
  progress,
  question,
}: {
  progress: PopulateProgress;
  question?: string | null;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(progress.percentage)));
  return (
    <div className="rise flex h-full min-h-[320px] flex-col justify-center rounded-2xl border border-border bg-surface-2/60 px-5 py-8">
      <div className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Trigger.dev running
      </div>
      <h3 className="text-xl font-semibold tracking-tight">Waiting for the live query</h3>
      <p className="mt-2 max-w-lg text-sm text-muted-foreground">
        Cards stay hidden until the agent finishes — so you&apos;re not looking at a premature or
        falsified snapshot.
      </p>
      {question && (
        <p className="mt-3 max-w-lg rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground/90">
          {question}
        </p>
      )}

      <div className="mt-6 max-w-lg">
        <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
          <span className="font-medium text-foreground">{progress.label}</span>
          <span className="tabular text-muted-foreground">{pct}%</span>
        </div>
        <div className="mb-3 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
          {progress.steps.map((s) => (
            <span
              key={s.id}
              className={
                s.done
                  ? "text-primary"
                  : s.active
                    ? "text-foreground/80"
                    : "text-muted-foreground/50"
              }
            >
              {s.done ? "✓ " : s.active ? "● " : "○ "}
              {s.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyPersonaStage({
  mode,
  questions,
  onAskQuestion,
}: {
  mode: ShellMode;
  questions: [string, string, string];
  onAskQuestion?: (question: string) => void;
}) {
  const label = mode[0].toUpperCase() + mode.slice(1);
  return (
    <div className="rise flex h-full min-h-[320px] flex-col justify-center rounded-2xl border border-dashed border-border bg-surface-2/60 px-5 py-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label} · not populated yet
      </p>
      <h3 className="mt-2 text-xl font-semibold tracking-tight">Ask to fill this stage</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {mode === "finance"
          ? "Q1 → Lovable Visual 1 (Energy value)."
          : mode === "maintenance"
            ? "Q1 → Lovable Visual 5 (Plant floor)."
            : mode === "safety"
              ? "Q1 → Lovable Visual 12 (Value by area)."
              : mode === "engineer"
                ? "Q1 → Lovable Visual 11 (Hydro & feed · Replit wind pack)."
                : "Each starter maps to a Lovable visual deck with ClickHouse after Trigger finishes."}
      </p>
      <div className="mt-5 grid gap-2">
        {questions.map((q, i) => (
          <button
            key={q}
            type="button"
            onClick={() => onAskQuestion?.(q)}
            className="rounded-xl border border-border bg-surface px-4 py-3 text-left text-sm transition hover:border-primary/40 hover:bg-primary/5"
          >
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-primary">
              Question {i + 1}
            </span>
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
