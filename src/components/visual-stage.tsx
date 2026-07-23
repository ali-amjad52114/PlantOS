"use client";

import { CanvasPinBoard } from "@/components/canvas-pin-board";
import { OverviewPanel } from "@/components/overview-panel";
import { OutboundShareBar } from "@/components/outbound-share-bar";
import { TriggerWaitState } from "@/components/trigger-wait-state";
import type { PopulateProgress } from "@/components/plant-chat";
import type { ShellMode } from "@/components/plant-shell";
import type { CanvasPin, CanvasPinDraft } from "@/lib/canvas-pins";
import type { TriggerWaitView } from "@/lib/trigger-wait-phases";
import type { PlantTowerPayload } from "@/lib/plant-tower";
import { formatPacificTimestamp } from "@/lib/format-time";
import { MODE_QUESTIONS } from "@/lib/shell-prompts";
import { buildPackFromPins, formatPackNarrative } from "@/lib/outbound/pack";

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
  triggerWait = null,
  waitStartedAt = null,
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
  triggerWait?: TriggerWaitView | null;
  waitStartedAt?: number | null;
  awaitingQuestion?: string | null;
  canvasPins?: CanvasPin[];
  onCanvasPinsChange?: (next: CanvasPin[]) => void;
  onDropPinDraft?: (draft: CanvasPinDraft) => void;
}) {
  const title =
    mode === "overview"
      ? "Plant overview"
      : mode === "maintenance"
        ? "Maintenance"
        : mode === "safety"
          ? "Safety"
          : `${agentRole[0].toUpperCase()}${agentRole.slice(1)}`;

  const waiting = Boolean(triggerWait || stageProgress);
  const questions = MODE_QUESTIONS[mode];
  const showBoard = Boolean(onCanvasPinsChange && onDropPinDraft);
  const showStarters = showBoard && !waiting && mode !== "overview" && canvasPins.length === 0;

  const shareDraft = (() => {
    if (canvasPins.length > 0) {
      const packTitle = `${title} · ${canvasPins.length} chart${canvasPins.length === 1 ? "" : "s"}`;
      const pack = buildPackFromPins(packTitle, canvasPins, 4);
      const lines = canvasPins.slice(0, 6).map((p, i) => {
        if (p.payload.kind === "card") {
          const c = p.payload.card;
          const primary =
            c.binding?.primary != null && Number.isFinite(Number(c.binding.primary))
              ? ` — ${Number(c.binding.primary).toFixed(2)}${c.binding.unit ? ` ${c.binding.unit}` : ""}`
              : "";
          return `${i + 1}. ${c.label || c.type}${c.hint ? ` (${c.hint})` : ""}${primary}`;
        }
        if (p.payload.kind === "finding") {
          const it = p.payload.item;
          return `${i + 1}. ${it.label}: ${it.value}${it.unit ? ` ${it.unit}` : ""}`;
        }
        if (p.payload.kind === "viz") {
          return `${i + 1}. Viz: ${p.payload.spec.root || "chart"}`;
        }
        return `${i + 1}. ${p.kind} pin`;
      });
      return {
        title: packTitle,
        body: `${lines.join("\n")}\n\nLatest reading: ${formatPacificTimestamp(live?.live?.max_ts)} PT`,
        pack,
        googleBody: formatPackNarrative(pack),
      };
    }
    if (mode === "overview" && overview) {
      return {
        title: "Plant overview",
        body: `PlantOS overview snapshot at ${formatPacificTimestamp(live?.live?.max_ts)} PT.`,
      };
    }
    return {
      title: `${title} update`,
      body: awaitingQuestion
        ? `Question: ${awaitingQuestion}`
        : "PlantOS canvas share (add charts to include metrics).",
    };
  })();

  return (
    <div className="card-surface flex h-full min-h-0 flex-col overflow-hidden">
      <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-border px-4 py-2.5">
        <span aria-hidden="true" />
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground">
          Canvas
        </p>
        <p className="justify-self-end text-right text-[11px] text-muted-foreground">
          {formatPacificTimestamp(live?.live?.max_ts)} PT
          {live?.liveAgeSec != null ? ` · ${Math.round(live.liveAgeSec)}s ago` : ""}
        </p>
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
                : "Pin or drag charts from chat. Each sits in a grid slot — 1 box or 2 wide."
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

        {waiting && triggerWait ? (
          <div
            data-testid="trigger-wait-overlay"
            className="absolute inset-0 z-30 flex flex-col justify-start bg-background/70 p-4 pt-3 backdrop-blur-[2px]"
          >
            <TriggerWaitState
              view={triggerWait}
              question={awaitingQuestion}
              startedAt={waitStartedAt}
            />
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

      <OutboundShareBar draft={shareDraft} />
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
        Answers pin into grid slots. Drag to reorder, cycle size (1 ↔ 2-wide), zoom, or remove.
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
