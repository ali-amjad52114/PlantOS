"use client";

import { Loader2 } from "lucide-react";
import { CanvasPinBoard } from "@/components/canvas-pin-board";
import { OverviewPanel } from "@/components/overview-panel";
import type { PopulateProgress } from "@/components/plant-chat";
import type { ShellMode } from "@/components/plant-shell";
import type { CanvasPin, CanvasPinDraft } from "@/lib/canvas-pins";
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
  live,
  overview,
  overviewLoading,
  onAskQuestion,
  liveMoving,
  stageProgress = null,
  awaitingQuestion = null,
  canvasPins = [],
  onCanvasPinsChange,
  onDropPinDraft,
}: {
  mode: ShellMode;
  agentRole: AgentRole;
  tower?: PlantTowerPayload | null;
  roleData?: any;
  live: any;
  overview: any;
  overviewLoading?: boolean;
  onAskQuestion?: (question: string) => void;
  liveMoving?: boolean;
  stageProgress?: PopulateProgress | null;
  awaitingQuestion?: string | null;
  canvasPins?: CanvasPin[];
  onCanvasPinsChange?: (next: CanvasPin[]) => void;
  onDropPinDraft?: (draft: CanvasPinDraft, at: { x: number; y: number }) => void;
}) {
  const title =
    mode === "overview"
      ? "Plant overview"
      : mode === "maintenance"
        ? "Maintenance"
        : mode === "safety"
          ? "Safety"
          : `${agentRole[0].toUpperCase()}${agentRole.slice(1)}`;

  const waiting = Boolean(stageProgress);
  const questions = MODE_QUESTIONS[mode];
  const showBoard = Boolean(onCanvasPinsChange && onDropPinDraft);
  const showStarters = showBoard && !waiting && mode !== "overview" && canvasPins.length === 0;

  return (
    <div className="card-surface flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Canvas</p>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        </div>
        <div className="text-right text-[11px] text-muted-foreground">
          <p>
            {canvasPins.length} chart{canvasPins.length === 1 ? "" : "s"} · move · resize · zoom
          </p>
          <p>
            Live max {live?.live?.max_ts ?? "—"}
            {live?.liveAgeSec != null ? ` · ${Math.round(live.liveAgeSec)}s` : ""}
          </p>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col">
        {showBoard ? (
          <CanvasPinBoard
            pins={canvasPins}
            onPinsChange={onCanvasPinsChange!}
            onDropDraft={onDropPinDraft!}
            emptyHint={
              mode === "overview"
                ? undefined
                : "Pin or drag charts from chat onto this canvas — move, resize, zoom, or remove them here."
            }
            overviewSlot={
              mode === "overview" ? (
                <OverviewPanel
                  snapshot={overview}
                  live={live}
                  loading={overviewLoading}
                  liveMoving={liveMoving}
                />
              ) : null
            }
          />
        ) : null}

        {waiting && stageProgress ? (
          <div className="absolute inset-0 z-30 bg-background/70 p-4 backdrop-blur-[2px]">
            <StageWaitingPanel progress={stageProgress} question={awaitingQuestion} />
          </div>
        ) : null}

        {showStarters ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-4">
            <div className="pointer-events-auto max-w-lg">
              <EmptyPersonaStage
                mode={mode}
                questions={questions}
                onAskQuestion={onAskQuestion}
              />
            </div>
          </div>
        ) : null}
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
    <div className="rise flex h-full min-h-[240px] flex-col justify-center rounded-2xl border border-border bg-surface/95 px-5 py-8">
      <div className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Preparing canvas
      </div>
      <h3 className="text-xl font-semibold tracking-tight">Charts land on the canvas</h3>
      <p className="mt-2 max-w-lg text-sm text-muted-foreground">
        When ready, the bound visual is pinned here so you can move, resize, and zoom it.
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
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${pct}%` }} />
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
    <div className="rise rounded-2xl border border-dashed border-border bg-surface/95 px-5 py-8 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label} · empty canvas
      </p>
      <h3 className="mt-2 text-xl font-semibold tracking-tight">Ask to create charts</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Answers pin onto this canvas. Drag more from chat anytime — then move, resize, zoom, or remove.
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
