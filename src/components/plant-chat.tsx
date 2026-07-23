"use client";

import { useChat } from "@ai-sdk/react";
import { useTriggerChatTransport } from "@trigger.dev/sdk/chat/react";
import type { UIMessage } from "ai";
import { Loader2, MessageSquarePlus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type MutableRefObject } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { mintChatAccessToken, startChatSession } from "@/app/actions";
import { PinableVisual } from "@/components/canvas-pin-board";
import { FinanceBars, SparkTrend, TargetBars } from "@/components/charts";
import { FindingsBody } from "@/components/plant-chat-findings";
import { LovableCardView } from "@/components/lovable-viz/LovableCardView";
import { PlantTowerGrid } from "@/components/plant-tower-grid";
import { Visualization } from "@/components/visualization";
import {
  getChatFirstAskDone,
  newChatId,
  removeChatSession,
  resolveChatIdForMode,
  sessionsForMode,
  setActiveChatId,
  upsertChatSession,
  type StoredChat,
} from "@/lib/chat-sessions";
import { cardDraftFromTower, chatPinSourceKey, questionTowerHideKey, type CanvasPinDraft } from "@/lib/canvas-pins";
import { chatAnswerReady } from "@/lib/chat-answer-ready";
import { normalizeSpec } from "@/lib/catalog";
import {
  CHAT_DEFAULT_CHART_LIMIT,
  CHAT_DEFAULT_READING_LIMIT,
} from "@/lib/chat-visual-budget";
import type { PlantTowerPayload } from "@/lib/plant-tower";
import {
  deriveTriggerWaitView,
  type TriggerWaitSignals,
  type TriggerWaitView,
} from "@/lib/trigger-wait-phases";
import type { plantAgent } from "@/trigger/plant-agent";

type Role = "engineer" | "operations" | "finance";

const TOOL_TO_ROLE: Record<string, Role> = {
  "tool-investigateEngineer": "engineer",
  "tool-investigateOperations": "operations",
  "tool-investigateFinance": "finance",
};

export type PopulateProgress = {
  percentage: number;
  label: string;
  steps: Array<{ id: string; label: string; done: boolean; active: boolean }>;
};

export function PlantChat({
  role,
  mode,
  onToolVisual,
  onTower,
  hideTowersInChat = false,
  shell = false,
  suggestedQuestions,
  populateProgress = null,
  pendingQuestion = null,
  onPendingQuestionConsumed,
  askBridgeRef,
  onStarterQuestion,
  onStreamProgress,
  onAgentBusyChange,
  onAgentError,
  onPinVisual,
  onTriggerWait,
  fixtureTower = null,
  movedPinKeys,
  autoHiddenTowerKey = null,
  allowChatCharts = false,
  onFollowUpChatAsk,
  onChatSessionReset,
  onActiveChatChange,
  e2eFirstAsk = false,
  e2eFirstAskBlurb = false,
  e2eFollowUpTower = null,
  sessionFirstAskDone = false,
  chatAnswerReadyFlag = false,
  onChatAnswerGate,
  e2eAnswerGate = false,
  e2eAnswerGateBlurb = false,
  onE2eSimFirstAsk,
  onE2eSimFollowUp,
  onE2eAnswerGatePrepare,
  onE2eAnswerGateAnswer,
}: {
  role: Role;
  /** Persona this chat pane belongs to — sessions are filtered by this. */
  mode: string;
  onToolVisual: (role: Role, payload: any) => void;
  onTower?: (tower: PlantTowerPayload) => void;
  hideTowersInChat?: boolean;
  shell?: boolean;
  suggestedQuestions: [string, string, string];
  populateProgress?: PopulateProgress | null;
  pendingQuestion?: string | null;
  onPendingQuestionConsumed?: () => void;
  askBridgeRef?: MutableRefObject<((q: string) => void) | null>;
  /** Prefer over local submit for mapped starter chips (CH bind + narrative). */
  onStarterQuestion?: (question: string) => void;
  /** Bubble Trigger stream progress to the visual stage (right). */
  onStreamProgress?: (progress: PopulateProgress | null) => void;
  onAgentBusyChange?: (busy: boolean, chatMode: string) => void;
  onAgentError?: (message: string, chatMode: string) => void;
  /** Pin a chat visual onto the right canvas (PLAN_CHAT_CANVAS_PINS). */
  onPinVisual?: (draft: CanvasPinDraft) => void;
  /** Ambient Trigger wait signals for the canvas overlay. */
  onTriggerWait?: (signals: TriggerWaitSignals, chatMode: string) => void;
  /** E2E / demo: pinable tower without waiting on the agent. */
  fixtureTower?: PlantTowerPayload | null;
  /** Keys of chat visuals already moved onto the canvas. */
  movedPinKeys?: ReadonlySet<string>;
  /** First-ask auto-landed tower key (`mode:qN` or `role-default-first`) — hide in chat. */
  autoHiddenTowerKey?: string | null;
  /**
   * False during first ask (and until a follow-up starts): hide towers/viz in chat.
   * True after a follow-up ask begins — new messages may show charts.
   */
  allowChatCharts?: boolean;
  /** Typed Ask in chat after first ask completed — enable follow-up chart-in-chat. */
  onFollowUpChatAsk?: () => void;
  /** New chat / session switch — reset first-ask placement. */
  onChatSessionReset?: () => void;
  /** Persona chat became active — load that chat's first-ask flag (isolated per mode). */
  onActiveChatChange?: (info: {
    mode: string;
    chatId: string;
    firstAskDone: boolean;
  }) => void;
  e2eFirstAsk?: boolean;
  e2eFirstAskBlurb?: boolean;
  e2eFollowUpTower?: PlantTowerPayload | null;
  sessionFirstAskDone?: boolean;
  chatAnswerReadyFlag?: boolean;
  onChatAnswerGate?: (ready: boolean, chatMode: string) => void;
  e2eAnswerGate?: boolean;
  e2eAnswerGateBlurb?: boolean;
  onE2eSimFirstAsk?: () => void | Promise<void>;
  onE2eSimFollowUp?: () => void | Promise<void>;
  onE2eAnswerGatePrepare?: () => void | Promise<void>;
  onE2eAnswerGateAnswer?: () => void | Promise<void>;
}) {
  const [sessions, setSessions] = useState<StoredChat[]>([]);
  const [chatId, setChatId] = useState(() => newChatId());
  const [hydrated, setHydrated] = useState(false);
  /** Fresh Trigger chatId reserved for the current shell ask (null until rotated). */
  const [pendingChatId, setPendingChatId] = useState<string | null>(null);
  const rotatedForPending = useRef<string | null>(null);

  useEffect(() => {
    const resolved = resolveChatIdForMode(mode);
    setSessions(resolved.sessions);
    setChatId(resolved.chatId);
    setHydrated(true);
    rotatedForPending.current = null;
    setPendingChatId(null);
  }, [mode]);

  useEffect(() => {
    if (!hydrated || !pendingQuestion) {
      if (!pendingQuestion) {
        rotatedForPending.current = null;
        setPendingChatId(null);
      }
      return;
    }
    if (rotatedForPending.current === pendingQuestion) return;
    rotatedForPending.current = pendingQuestion;
    const id = newChatId();
    upsertChatSession({
      id,
      title: pendingQuestion.slice(0, 72),
      mode,
      role,
      updatedAt: Date.now(),
    });
    setSessions(sessionsForMode(mode));
    setPendingChatId(id);
    setChatId(id);
  }, [hydrated, pendingQuestion, mode, role]);

  function selectChat(id: string) {
    setActiveChatId(mode, id);
    setChatId(id);
  }

  function refreshSessions() {
    setSessions(sessionsForMode(mode));
  }

  if (!hydrated) {
    return (
      <div className="card-surface flex h-full min-h-0 flex-col items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        Loading {mode} chats…
      </div>
    );
  }

  // Hold the question until the new chatId is mounted — never submit on a poisoned prior session.
  const readyPending =
    pendingQuestion && pendingChatId && chatId === pendingChatId ? pendingQuestion : null;

  return (
    <ChatSession
      key={`${mode}:${chatId}`}
      chatId={chatId}
      role={role}
      mode={mode}
      sessions={sessions}
      refreshSessions={refreshSessions}
      onSelectChat={selectChat}
      onToolVisual={onToolVisual}
      onTower={onTower}
      hideTowersInChat={hideTowersInChat}
      shell={shell}
      suggestedQuestions={suggestedQuestions}
      populateProgress={populateProgress}
      pendingQuestion={readyPending}
      onPendingQuestionConsumed={onPendingQuestionConsumed}
      askBridgeRef={askBridgeRef}
      onStarterQuestion={onStarterQuestion}
      onStreamProgress={onStreamProgress}
      onAgentBusyChange={onAgentBusyChange}
      onAgentError={onAgentError}
      onPinVisual={onPinVisual}
      onTriggerWait={onTriggerWait}
      fixtureTower={fixtureTower}
      movedPinKeys={movedPinKeys}
      autoHiddenTowerKey={autoHiddenTowerKey}
      allowChatCharts={allowChatCharts}
      onFollowUpChatAsk={onFollowUpChatAsk}
      e2eFirstAsk={e2eFirstAsk}
      e2eFirstAskBlurb={e2eFirstAskBlurb}
      e2eFollowUpTower={e2eFollowUpTower}
      sessionFirstAskDone={sessionFirstAskDone}
      chatAnswerReadyFlag={chatAnswerReadyFlag}
      onChatAnswerGate={onChatAnswerGate}
      e2eAnswerGate={e2eAnswerGate}
      e2eAnswerGateBlurb={e2eAnswerGateBlurb}
      onE2eSimFirstAsk={onE2eSimFirstAsk}
      onE2eSimFollowUp={onE2eSimFollowUp}
      onE2eAnswerGatePrepare={onE2eAnswerGatePrepare}
      onE2eAnswerGateAnswer={onE2eAnswerGateAnswer}
      onChatSessionReset={onChatSessionReset}
      onActiveChatChange={onActiveChatChange}
    />
  );
}

function ChatSession({
  chatId,
  role,
  mode,
  sessions,
  refreshSessions,
  onSelectChat,
  onToolVisual,
  onTower,
  hideTowersInChat,
  shell,
  suggestedQuestions,
  populateProgress,
  pendingQuestion,
  onPendingQuestionConsumed,
  askBridgeRef,
  onStarterQuestion,
  onStreamProgress,
  onAgentBusyChange,
  onAgentError,
  onPinVisual,
  onTriggerWait,
  fixtureTower,
  movedPinKeys,
  autoHiddenTowerKey,
  allowChatCharts,
  onFollowUpChatAsk,
  e2eFirstAsk,
  e2eFirstAskBlurb,
  e2eFollowUpTower,
  sessionFirstAskDone,
  chatAnswerReadyFlag,
  onChatAnswerGate,
  e2eAnswerGate,
  e2eAnswerGateBlurb,
  onE2eSimFirstAsk,
  onE2eSimFollowUp,
  onE2eAnswerGatePrepare,
  onE2eAnswerGateAnswer,
  onChatSessionReset,
  onActiveChatChange,
}: {
  chatId: string;
  role: Role;
  mode: string;
  sessions: StoredChat[];
  refreshSessions: () => void;
  onSelectChat: (id: string) => void;
  onToolVisual: (role: Role, payload: any) => void;
  onTower?: (tower: PlantTowerPayload) => void;
  hideTowersInChat?: boolean;
  shell?: boolean;
  suggestedQuestions: [string, string, string];
  populateProgress?: PopulateProgress | null;
  pendingQuestion?: string | null;
  onPendingQuestionConsumed?: () => void;
  askBridgeRef?: MutableRefObject<((q: string) => void) | null>;
  onStarterQuestion?: (question: string) => void;
  onStreamProgress?: (progress: PopulateProgress | null) => void;
  onAgentBusyChange?: (busy: boolean, chatMode: string) => void;
  onAgentError?: (message: string, chatMode: string) => void;
  onPinVisual?: (draft: CanvasPinDraft) => void;
  onTriggerWait?: (signals: TriggerWaitSignals, chatMode: string) => void;
  fixtureTower?: PlantTowerPayload | null;
  movedPinKeys?: ReadonlySet<string>;
  autoHiddenTowerKey?: string | null;
  allowChatCharts?: boolean;
  onFollowUpChatAsk?: () => void;
  e2eFirstAsk?: boolean;
  e2eFirstAskBlurb?: boolean;
  e2eFollowUpTower?: PlantTowerPayload | null;
  sessionFirstAskDone?: boolean;
  chatAnswerReadyFlag?: boolean;
  onChatAnswerGate?: (ready: boolean, chatMode: string) => void;
  e2eAnswerGate?: boolean;
  e2eAnswerGateBlurb?: boolean;
  onE2eSimFirstAsk?: () => void | Promise<void>;
  onE2eSimFollowUp?: () => void | Promise<void>;
  onE2eAnswerGatePrepare?: () => void | Promise<void>;
  onE2eAnswerGateAnswer?: () => void | Promise<void>;
  onChatSessionReset?: () => void;
  onActiveChatChange?: (info: {
    mode: string;
    chatId: string;
    firstAskDone: boolean;
  }) => void;
}) {
  const transport = useTriggerChatTransport<typeof plantAgent>({
    task: "plantos-agent",
    accessToken: ({ chatId: id }) => mintChatAccessToken(id),
    startSession: ({ chatId: id, clientData }) => startChatSession({ chatId: id, clientData }),
    clientData: { role },
  });

  const { messages, sendMessage, stop, status, error } = useChat({
    id: chatId,
    transport: transport as any,
  });
  const [input, setInput] = useState("");
  const busy = status === "submitted" || status === "streaming";
  /** Message ids from before the first follow-up — keep their charts off chat forever. */
  const [firstAskFrozenMessageIds, setFirstAskFrozenMessageIds] = useState<Set<string>>(
    () => new Set()
  );
  const prevAllowChatCharts = useRef(Boolean(allowChatCharts));

  useEffect(() => {
    onActiveChatChange?.({
      mode,
      chatId,
      firstAskDone: getChatFirstAskDone(chatId),
    });
  }, [mode, chatId, onActiveChatChange]);

  useEffect(() => {
    if (!allowChatCharts) {
      setFirstAskFrozenMessageIds(new Set());
      prevAllowChatCharts.current = false;
      return;
    }
    if (!prevAllowChatCharts.current) {
      setFirstAskFrozenMessageIds(new Set(messages.map((m) => m.id)));
    }
    prevAllowChatCharts.current = true;
  }, [allowChatCharts, messages]);

  const onToolVisualRef = useRef(onToolVisual);
  onToolVisualRef.current = onToolVisual;
  const onTowerRef = useRef(onTower);
  onTowerRef.current = onTower;
  const pushedToolOutputs = useRef(new Set<string>());
  const pushedTowers = useRef(new Set<string>());
  const pendingHandled = useRef<string | null>(null);

  useEffect(() => {
    for (const m of messages) {
      if (m.role !== "assistant") continue;
      for (const part of m.parts as any[]) {
        const mappedRole = TOOL_TO_ROLE[part.type];
        if (mappedRole && part.state === "output-available" && part.output != null) {
          const key = `${m.id}:${part.toolCallId ?? part.type}:${mappedRole}`;
          if (!pushedToolOutputs.current.has(key)) {
            pushedToolOutputs.current.add(key);
            onToolVisualRef.current(mappedRole, part.output);
          }
        }
        if (part.type === "data-plant-tower" && part.data && onTowerRef.current) {
          const tkey = `${m.id}:tower:${part.data.deck}:${part.data.role}`;
          if (!pushedTowers.current.has(tkey)) {
            pushedTowers.current.add(tkey);
            onTowerRef.current(part.data as PlantTowerPayload);
          }
        }
      }
    }
  }, [messages]);

  function rememberSession(title: string) {
    upsertChatSession({
      id: chatId,
      title: title.slice(0, 72),
      mode,
      role,
      updatedAt: Date.now(),
    });
    refreshSessions();
  }

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const kick = () => {
      onFollowUpChatAsk?.();
      rememberSession(trimmed);
      sendMessage({ text: trimmed });
      setInput("");
    };
    if (busy) {
      stop();
      window.setTimeout(kick, 350);
      return;
    }
    kick();
  }

  useEffect(() => {
    if (askBridgeRef) askBridgeRef.current = submit;
    return () => {
      if (askBridgeRef) askBridgeRef.current = null;
    };
  });

  useEffect(() => {
    if (!pendingQuestion) {
      pendingHandled.current = null;
      return;
    }
    if (pendingHandled.current === pendingQuestion) return;
    if (busy) return;
    pendingHandled.current = pendingQuestion;
    submit(pendingQuestion);
    onPendingQuestionConsumed?.();
  }, [pendingQuestion, busy]);

  const streamProgress = deriveAgentStreamProgress(messages, status);
  const streamProgressKey = streamProgress
    ? `${streamProgress.percentage}|${streamProgress.label}|${streamProgress.steps
        .map((s) => `${s.id}:${s.done ? 1 : 0}${s.active ? 1 : 0}`)
        .join(",")}`
    : "";
  const lastStreamKey = useRef<string>("");
  const lastBusy = useRef<boolean | null>(null);
  const waitStartedRef = useRef<number | null>(null);
  const [chatTick, setChatTick] = useState(0);

  useEffect(() => {
    if (!busy) return;
    if (waitStartedRef.current == null) waitStartedRef.current = Date.now();
    const id = window.setInterval(() => setChatTick((n) => n + 1), 250);
    return () => window.clearInterval(id);
  }, [busy]);

  const chatWaitView: TriggerWaitView | null = busy
    ? deriveTriggerWaitView({
        chatStatus: status,
        parts: (([...messages].reverse().find((m) => m.role === "assistant")?.parts ??
          []) as TriggerWaitSignals["parts"]),
        elapsedMs: waitStartedRef.current
          ? Math.max(0, Date.now() - waitStartedRef.current)
          : 0,
        chatId,
      })
    : null;
  void chatTick; // refresh labels while busy

  const lastUserMessageId = [...messages].reverse().find((m) => m.role === "user")?.id;

  useEffect(() => {
    if (lastBusy.current === busy) return;
    lastBusy.current = busy;
    onAgentBusyChange?.(busy, mode);
  }, [busy, mode, onAgentBusyChange]);

  useEffect(() => {
    if (!onChatAnswerGate) return;
    const sinceUserMessageId = [...messages].reverse().find((m) => m.role === "user")?.id;
    const ready = chatAnswerReady({
      messages: messages as Array<{ id: string; role: string; parts?: Array<{ type: string; text?: string }> }>,
      status,
      sinceUserMessageId,
    });
    onChatAnswerGate(ready, mode);
  }, [messages, status, mode, onChatAnswerGate]);

  useEffect(() => {
    if (lastStreamKey.current === streamProgressKey) return;
    lastStreamKey.current = streamProgressKey;
    onStreamProgress?.(streamProgress);
  }, [streamProgressKey, streamProgress, onStreamProgress]);

  useEffect(() => {
    if (!onTriggerWait) return;
    if (busy && waitStartedRef.current == null) waitStartedRef.current = Date.now();
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    const parts = (lastAssistant?.parts ?? []) as TriggerWaitSignals["parts"];
    const elapsedMs = waitStartedRef.current
      ? Math.max(0, Date.now() - waitStartedRef.current)
      : 0;
    onTriggerWait(
      {
        chatStatus: status,
        parts,
        elapsedMs,
        chatId,
      },
      mode
    );
    if (!busy && waitStartedRef.current != null && status === "ready") {
      window.setTimeout(() => {
        waitStartedRef.current = null;
      }, 2000);
    }
  }, [messages, status, busy, chatId, mode, onTriggerWait]);

  const lastErrorMsg = useRef<string | null>(null);
  useEffect(() => {
    if (!error?.message) return;
    if (lastErrorMsg.current === error.message) return;
    lastErrorMsg.current = error.message;
    onAgentError?.(error.message, mode);
  }, [error, mode, onAgentError]);

  function startNewChat() {
    const id = newChatId();
    upsertChatSession({
      id,
      title: "New chat",
      mode,
      role,
      updatedAt: Date.now(),
    });
    refreshSessions();
    onChatSessionReset?.();
    onSelectChat(id);
  }

  function deleteChat(id: string) {
    removeChatSession(id);
    const remaining = sessionsForMode(mode);
    refreshSessions();
    if (id === chatId) {
      if (remaining[0]) onSelectChat(remaining[0].id);
      else onSelectChat(newChatId());
    }
  }

  return (
    <div
      className={
        shell
          ? "card-surface flex h-full min-h-0 flex-col overflow-hidden"
          : "rounded-lg border border-border bg-surface"
      }
    >
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[132px] shrink-0 flex-col border-r-2 border-border bg-surface-2/70 sm:w-[148px]">
          <div className="border-b border-border px-2 py-2">
            <button
              type="button"
              onClick={startNewChat}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-2 py-2 text-[11px] font-medium text-primary-foreground"
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
              New chat
            </button>
          </div>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-1.5">
            {sessions.length === 0 && (
              <p className="px-1 py-2 text-[11px] text-muted-foreground">
                No {mode} chats yet — starters here stay under this persona only
              </p>
            )}
            {sessions.map((s) => {
              const active = s.id === chatId;
              return (
                <div
                  key={s.id}
                  className={`group flex items-start gap-1 rounded-lg border px-1.5 py-1.5 ${
                    active
                      ? "border-primary/35 bg-primary/10"
                      : "border-transparent hover:border-border hover:bg-surface"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectChat(s.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="truncate text-[11px] font-medium leading-tight">{s.title}</div>
                    <div className="mt-0.5 truncate text-[10px] capitalize text-muted-foreground">
                      {s.mode}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteChat(s.id)}
                    className="rounded p-0.5 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-danger"
                    aria-label="Delete chat"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-center border-b border-border px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">
              Ask Agent
            </span>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm">
            {e2eFirstAsk && (
              <div
                className="flex flex-wrap gap-2"
                data-testid="e2e-first-ask-controls"
                data-session-first-ask-done={sessionFirstAskDone ? "1" : "0"}
              >
                <button
                  type="button"
                  data-testid="e2e-sim-first-ask"
                  onClick={() => void onE2eSimFirstAsk?.()}
                  className="rounded-lg border border-border bg-surface-2 px-2 py-1 text-[11px] font-medium"
                >
                  E2E first ask
                </button>
                <button
                  type="button"
                  data-testid="e2e-sim-follow-up"
                  onClick={() => void onE2eSimFollowUp?.()}
                  className="rounded-lg border border-border bg-surface-2 px-2 py-1 text-[11px] font-medium"
                >
                  E2E follow-up
                </button>
              </div>
            )}
            {e2eAnswerGate && (
              <div
                className="flex flex-wrap gap-2"
                data-testid="e2e-answer-gate-controls"
                data-answer-ready={chatAnswerReadyFlag ? "1" : "0"}
              >
                <button
                  type="button"
                  data-testid="e2e-answer-gate-prepare"
                  onClick={() => void onE2eAnswerGatePrepare?.()}
                  className="rounded-lg border border-border bg-surface-2 px-2 py-1 text-[11px] font-medium"
                >
                  E2E idle w/o answer
                </button>
                <button
                  type="button"
                  data-testid="e2e-answer-gate-answer"
                  onClick={() => void onE2eAnswerGateAnswer?.()}
                  className="rounded-lg border border-border bg-surface-2 px-2 py-1 text-[11px] font-medium"
                >
                  E2E inject answer
                </button>
              </div>
            )}
            {e2eAnswerGateBlurb && (
              <p
                data-testid="e2e-answer-gate-blurb"
                className="rounded-xl border border-border/70 bg-surface-2/50 px-3 py-2.5 text-[13px] leading-relaxed text-foreground/90"
              >
                Hydro feed and energy look steady — canvas charts should land only after this answer.
              </p>
            )}
            {e2eFirstAskBlurb && (
              <p
                data-testid="e2e-first-ask-blurb"
                className="rounded-xl border border-border/70 bg-surface-2/50 px-3 py-2.5 text-[13px] leading-relaxed text-foreground/90"
              >
                Plant status looks steady on hydro feed and energy bars — charts for this first ask are on
                the canvas.
              </p>
            )}
            {e2eFollowUpTower && onPinVisual && (
              <div className="space-y-2" data-testid="e2e-follow-up-source">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Follow-up charts · stay in chat
                </p>
                {e2eFollowUpTower.cards.map((card) => {
                  const draft = cardDraftFromTower(e2eFollowUpTower, card, "e2e-follow-up");
                  return (
                    <PinableVisual
                      key={card.type}
                      testId={`e2e-follow-up-card-${card.type}`}
                      draft={draft}
                      onPin={onPinVisual}
                      moved={movedPinKeys?.has(chatPinSourceKey(draft)) ?? false}
                    >
                      <LovableCardView
                        type={card.type}
                        label={card.label}
                        hint={card.hint}
                        binding={card.binding}
                        compact
                      />
                    </PinableVisual>
                  );
                })}
              </div>
            )}
            {fixtureTower && onPinVisual && (
              <div className="space-y-2" data-testid="canvas-fixture-source">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Fixture cards · pin individually
                </p>
                {fixtureTower.cards.map((card) => {
                  const draft = cardDraftFromTower(fixtureTower, card);
                  return (
                  <PinableVisual
                    key={card.type}
                    testId={`canvas-fixture-card-${card.type}`}
                    draft={draft}
                    onPin={onPinVisual}
                    moved={movedPinKeys?.has(chatPinSourceKey(draft)) ?? false}
                  >
                    <LovableCardView
                      type={card.type}
                      label={card.label}
                      hint={card.hint}
                      binding={card.binding}
                      compact
                    />
                  </PinableVisual>
                  );
                })}
              </div>
            )}
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {mode[0].toUpperCase() + mode.slice(1)} chats only. Pick a starter to populate this
                  persona&apos;s stage — pin visuals from chat onto the canvas on the right.
                </p>
                <div className="grid gap-2">
                  {suggestedQuestions.map((q, i) => (
                    <button
                      key={q}
                      type="button"
                      disabled={busy}
                      onClick={() => (onStarterQuestion ? onStarterQuestion(q) : submit(q))}
                      className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-left text-sm transition hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50"
                    >
                      <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-primary">
                        Question {i + 1}
                      </span>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className="space-y-2">
                <Message
                  message={m}
                  hideTowers={hideTowersInChat}
                  onPinVisual={onPinVisual}
                  movedPinKeys={movedPinKeys}
                  autoHiddenTowerKey={autoHiddenTowerKey}
                  hideChatCharts={
                    !allowChatCharts || firstAskFrozenMessageIds.has(m.id)
                  }
                />
                {busy &&
                  chatWaitView &&
                  m.role === "user" &&
                  m.id === lastUserMessageId && (
                    <ChatTurnProgress view={chatWaitView} />
                  )}
              </div>
            ))}
            {busy && chatWaitView && !lastUserMessageId && (
              <ChatTurnProgress view={chatWaitView} />
            )}
            {error && (
              <p className="rounded-lg border border-[color:var(--danger)]/30 bg-[color:var(--danger)]/10 px-3 py-2 text-xs text-[color:var(--danger)]">
                {/quota|insufficient_quota|billing/i.test(error.message)
                  ? "OpenAI quota was exceeded on an earlier run — credits are OK now; click New chat and ask again. Cards still load from ClickHouse."
                  : /an error occurred/i.test(error.message)
                    ? "Prior chat session stuck after an OpenAI failure. Click New chat (or ask again — we open a fresh session). Cards still load from ClickHouse."
                    : `Agent error: ${error.message}`}
              </p>
            )}
          </div>

          <form
            className="flex gap-2 border-t border-border p-3"
            onSubmit={(e) => {
              e.preventDefault();
              submit(input || suggestedQuestions[0]);
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={suggestedQuestions[0]}
              className="flex-1 rounded-full border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            />
            {busy ? (
              <button
                type="button"
                onClick={() => stop()}
                className="rounded-full bg-muted px-4 py-2 text-sm"
              >
                Stop
              </button>
            ) : (
              <button
                type="submit"
                className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                Ask
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

/** Compact Trigger progress under the question that was just asked. */
function ChatTurnProgress({ view }: { view: TriggerWaitView }) {
  const pct = Math.max(0, Math.min(100, view.percentage));
  const elapsed = `${(view.elapsedMs / 1000).toFixed(1)}s`;
  return (
    <div
      data-testid="chat-turn-progress"
      className="mr-auto max-w-[92%] rounded-xl border border-border/80 bg-surface-2/60 px-3 py-2.5"
      aria-live="polite"
    >
      <div className="mb-1.5 flex items-center gap-2">
        <Loader2 className="h-3.5 w-3.5 shrink-0 text-primary motion-safe:animate-spin" />
        <p className="min-w-0 flex-1 truncate text-[12px] font-medium text-foreground">
          {view.active?.headline || "Working on Trigger…"}
        </p>
        <span className="shrink-0 font-mono text-[10px] tabular text-muted-foreground">{elapsed}</span>
      </div>
      {view.active?.primitive ? (
        <p className="mb-1.5 truncate font-mono text-[10px] text-muted-foreground">
          {view.active.primitive}
        </p>
      ) : null}
      {view.done.length > 0 ? (
        <div className="mb-1.5 flex flex-col gap-0.5">
          {view.done.map((s) => (
            <p key={s.id} className="truncate text-[10px] text-muted-foreground">
              ✓ {s.headline}
            </p>
          ))}
        </div>
      ) : null}
      <div className="h-0.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

type StreamProgress = PopulateProgress;

function deriveAgentStreamProgress(
  messages: UIMessage[],
  status: string
): StreamProgress | null {
  const busy = status === "submitted" || status === "streaming";
  if (!busy) return null;

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const parts = (lastAssistant?.parts ?? []) as any[];

  const inv = parts.find(
    (p) =>
      p.type === "tool-investigateEngineer" ||
      p.type === "tool-investigateOperations" ||
      p.type === "tool-investigateFinance" ||
      p.type === "tool-investigateParallel" ||
      p.type === "tool-consultEngineer"
  );
  const live = parts.find((p) => p.type === "tool-getLivePlantStatus");
  const selectViz = parts.find((p) => p.type === "tool-selectVisuals");
  const vizParts = parts.filter((p) => p.type === "tool-renderVisualization");
  const viz = vizParts[vizParts.length - 1];
  const textParts = parts.filter((p) => p.type === "text" && String(p.text || "").trim());
  const stepParts = parts.filter((p) => p.type === "data-investigation-step");
  const towerParts = parts.filter((p) => p.type === "data-plant-tower");
  const auditParts = parts.filter((p) => p.type === "data-turn-audit");
  const latestStep = stepParts[stepParts.length - 1] as
    | { data?: { label?: string; status?: string } }
    | undefined;
  const latestAudit = auditParts[auditParts.length - 1] as
    | {
        data?: {
          status?: string;
          role?: string;
          turn?: number;
          elapsedMs?: number;
          towerDeck?: number;
          toolNames?: string[];
        };
      }
    | undefined;
  const hasTower = towerParts.length > 0;

  const invDone = inv?.state === "output-available";
  const invActive = Boolean(inv) && !invDone;
  const selectDone = selectViz?.state === "output-available";
  const selectActive = Boolean(selectViz) && !selectDone;
  const vizSpec =
    viz && viz.state !== "input-streaming" ? normalizeSpec(viz.input?.spec) : null;
  const vizOk = Boolean(vizSpec) && viz?.output?.ok !== false;
  const vizActive = Boolean(viz) && !vizOk;
  const textActive = textParts.length > 0;

  let percentage = 8;
  let label = "Thinking…";
  if (status === "submitted" && !inv && !viz) {
    percentage = 12;
    label = "Thinking…";
  }
  if (latestAudit?.data?.status === "started" && latestAudit.data.role) {
    percentage = 18;
    label = `Turn ${latestAudit.data.turn ?? 0} · ${latestAudit.data.role} tools ready`;
  }
  if (latestStep?.data?.status === "running" && latestStep.data.label) {
    percentage = 30;
    label = latestStep.data.label;
  }
  if (invActive || (live && live.state !== "output-available")) {
    percentage = inv?.type === "tool-investigateParallel" ? 42 : 35;
    label =
      inv?.type === "tool-investigateParallel"
        ? "Parallel fan-out: engineer + ops + finance…"
        : inv?.type === "tool-consultEngineer"
          ? "Consulting engineer specialist…"
          : inv?.type === "tool-investigateOperations"
            ? "Running operations investigation…"
            : inv?.type === "tool-investigateFinance"
              ? "Running finance investigation…"
              : live && live.state !== "output-available"
                ? "Checking live plant status…"
                : "Running engineer investigation…";
    if (latestStep?.data?.status === "running" && latestStep.data.label) {
      label = latestStep.data.label;
    }
  }
  if (invDone && !hasTower && !viz && !selectDone) {
    percentage = 55;
    label =
      inv?.type === "tool-investigateParallel"
        ? "Parallel brief ready — selecting visuals…"
        : inv?.type === "tool-consultEngineer"
          ? "Specialist done — selecting visuals…"
          : "Investigation complete — preparing tower…";
  }
  if (selectActive) {
    percentage = 65;
    label = "Ranking catalog visuals…";
  }
  if (hasTower) {
    percentage = 78;
    label = "Plant tower ready";
  }
  if (vizActive) {
    percentage = viz?.output?.ok === false ? 72 : 68;
    label = viz?.output?.ok === false ? "Refining visualization…" : "Building visualization…";
  }
  if (vizOk) {
    percentage = Math.max(percentage, 88);
    label = "Visualization ready";
  }
  if (textActive) {
    percentage = Math.max(percentage, 94);
    label = "Writing takeaway…";
  }
  if (latestAudit?.data?.status === "complete") {
    percentage = Math.max(percentage, 96);
    const a = latestAudit.data;
    label = `Turn ${a.turn ?? 0} · ${a.role ?? "?"} · deck ${a.towerDeck ?? "—"} · ${a.elapsedMs ?? "?"}ms`;
  }

  const steps = [
    {
      id: "think",
      label: "Think",
      done: Boolean(inv || viz || textActive || stepParts.length),
      active: status === "submitted" && !inv && !viz && !stepParts.length,
    },
    {
      id: "investigate",
      label:
        inv?.type === "tool-investigateParallel"
          ? "Parallel"
          : inv?.type === "tool-consultEngineer"
            ? "Specialist"
            : "Investigate",
      done: invDone || Boolean(live && live.state === "output-available") || hasTower,
      active:
        invActive ||
        (Boolean(live) && live.state !== "output-available") ||
        latestStep?.data?.status === "running",
    },
    {
      id: "viz",
      label: "Tower",
      done: hasTower || vizOk || selectDone,
      active: (!hasTower && invDone) || vizActive || selectActive,
    },
    {
      id: "answer",
      label: "Answer",
      done: false,
      active: textActive && (hasTower || vizOk),
    },
  ];

  return { percentage, label, steps };
}

function isToolPart(type: string) {
  return type.startsWith("tool-");
}

function Message({
  message,
  hideTowers,
  onPinVisual,
  movedPinKeys,
  autoHiddenTowerKey,
  hideChatCharts = false,
}: {
  message: UIMessage;
  hideTowers?: boolean;
  onPinVisual?: (draft: CanvasPinDraft) => void;
  movedPinKeys?: ReadonlySet<string>;
  autoHiddenTowerKey?: string | null;
  /** First-ask policy: hide towers/viz for this message (blurb only). */
  hideChatCharts?: boolean;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl bg-primary px-3 py-2 text-[13px] leading-snug text-primary-foreground">
          {message.parts.map((part, i) =>
            part.type === "text" ? <span key={i}>{part.text}</span> : null
          )}
        </div>
      </div>
    );
  }

  let lastVizIndex = -1;
  let lastTowerIndex = -1;
  let lastToolIndex = -1;
  let findingsKeys: string[] | null = null;
  message.parts.forEach((p, i) => {
    if (p.type === "tool-renderVisualization") lastVizIndex = i;
    if (p.type === "data-plant-tower") {
      lastTowerIndex = i;
      const keys = (p as { data?: { findingsKeys?: string[] } }).data?.findingsKeys;
      if (keys?.length) findingsKeys = keys;
    }
    if (p.type === "data-visual-selection") {
      const keys = (p as { data?: { findingsKeys?: string[] } }).data?.findingsKeys;
      if (keys?.length) findingsKeys = keys;
    }
    if (p.type === "tool-selectVisuals") {
      const out = (p as { output?: { findingsKeys?: string[] } }).output;
      if (out?.findingsKeys?.length) findingsKeys = out.findingsKeys;
    }
    if (isToolPart(p.type)) lastToolIndex = i;
  });

  return (
    <div className="space-y-2 text-sm text-foreground/90">
      {message.parts.map((part, i) => {
        if (part.type === "tool-renderVisualization" && i !== lastVizIndex) return null;
        if (part.type === "data-plant-tower") {
          if (hideTowers || i !== lastTowerIndex) return null;
        }
        if (part.type === "data-investigation-step") return null;
        if (part.type === "data-visual-selection") return null;
        // Drop "I'll investigate…" preamble — keep only the takeaway after tools.
        if (part.type === "text" && lastToolIndex >= 0 && i < lastToolIndex) return null;
        const key = (part as any).toolCallId ?? `${part.type}-${i}`;
        return (
          <MessagePart
            key={key}
            part={part}
            messageId={message.id}
            onPinVisual={onPinVisual}
            movedPinKeys={movedPinKeys}
            autoHiddenTowerKey={autoHiddenTowerKey}
            hideChatCharts={hideChatCharts}
            findingsKeys={findingsKeys}
          />
        );
      })}
    </div>
  );
}

function MessagePart({
  part,
  messageId,
  onPinVisual,
  movedPinKeys,
  autoHiddenTowerKey,
  hideChatCharts = false,
  findingsKeys,
}: {
  part: UIMessage["parts"][number];
  messageId: string;
  onPinVisual?: (draft: CanvasPinDraft) => void;
  movedPinKeys?: ReadonlySet<string>;
  autoHiddenTowerKey?: string | null;
  hideChatCharts?: boolean;
  findingsKeys?: string[] | null;
}) {
  if (part.type === "text") {
    const text = String(part.text || "").trim();
    if (!text) return null;
    return (
      <div className="chat-md max-w-none rounded-xl border border-border/70 bg-surface-2/50 px-3.5 py-3 text-[13px] leading-relaxed text-foreground/90">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => (
              <p className="mb-2.5 last:mb-0 leading-relaxed">{children}</p>
            ),
            ul: ({ children }) => (
              <ul className="my-2 list-disc space-y-2 pl-4 marker:text-muted-foreground">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="my-2 list-decimal space-y-2 pl-4 marker:text-muted-foreground">{children}</ol>
            ),
            li: ({ children }) => (
              <li className="leading-relaxed pl-0.5 [&>p]:mb-0">{children}</li>
            ),
            strong: ({ children }) => (
              <strong className="font-semibold text-foreground">{children}</strong>
            ),
            h1: ({ children }) => (
              <h3 className="mb-1.5 mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground first:mt-0">
                {children}
              </h3>
            ),
            h2: ({ children }) => (
              <h3 className="mb-1.5 mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground first:mt-0">
                {children}
              </h3>
            ),
            h3: ({ children }) => (
              <h3 className="mb-1.5 mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground first:mt-0">
                {children}
              </h3>
            ),
            code: ({ children }) => (
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">{children}</code>
            ),
          }}
        >
          {text}
        </ReactMarkdown>
      </div>
    );
  }

  if (part.type === "data-plant-tower") {
    const tower = (part as { data?: PlantTowerPayload }).data;
    if (!tower?.cards?.length) return null;
    // First ask: charts live on the canvas only — never echo the agent tower in chat.
    if (hideChatCharts) return null;
    if (
      autoHiddenTowerKey &&
      questionTowerHideKey(tower) === autoHiddenTowerKey
    ) {
      return null;
    }
    const chatCards = tower.cards.slice(0, CHAT_DEFAULT_CHART_LIMIT);
    const slimTower = { ...tower, cards: chatCards };
    if (!onPinVisual) return <PlantTowerGrid tower={slimTower} />;
    return (
      <div className="space-y-2">
        {chatCards.map((card) => {
          const draft = cardDraftFromTower(tower, card, messageId);
          return (
          <PinableVisual
            key={card.type}
            draft={draft}
            onPin={onPinVisual}
            moved={movedPinKeys?.has(chatPinSourceKey(draft)) ?? false}
          >
            <LovableCardView
              type={card.type}
              label={card.label}
              hint={card.hint}
              binding={card.binding}
              compact
            />
          </PinableVisual>
          );
        })}
      </div>
    );
  }

  if (part.type === "tool-renderVisualization") {
    const p = part as any;
    const input = p.input as { spec?: unknown } | undefined;
    const output = p.output as { ok?: boolean } | undefined;
    const spec = p.state === "input-streaming" ? null : normalizeSpec(input?.spec);
    if (!spec) return null;
    if (output && output.ok === false) return null;
    if (hideChatCharts) return null;
    const draft: CanvasPinDraft = {
      kind: "viz",
      sourceMessageId: messageId,
      payload: { kind: "viz", spec },
    };
    if (!onPinVisual) return <Visualization spec={spec} />;
    return (
      <PinableVisual
        draft={draft}
        onPin={onPinVisual}
        moved={movedPinKeys?.has(chatPinSourceKey(draft)) ?? false}
      >
        <Visualization spec={spec} />
      </PinableVisual>
    );
  }

  if (part.type === "tool-investigateEngineer") {
    return (
      <InvestigateBlock
        label="Engineer"
        spinning={(part as any).state !== "output-available"}
        output={(part as any).output}
        kind="engineer"
        messageId={messageId}
        onPinVisual={onPinVisual}
        movedPinKeys={movedPinKeys}
        findingsKeys={findingsKeys}
        blurbOnly={hideChatCharts}
      />
    );
  }
  if (part.type === "tool-investigateOperations") {
    return (
      <InvestigateBlock
        label="Operations"
        spinning={(part as any).state !== "output-available"}
        output={(part as any).output}
        kind="operations"
        messageId={messageId}
        onPinVisual={onPinVisual}
        movedPinKeys={movedPinKeys}
        findingsKeys={findingsKeys}
        blurbOnly={hideChatCharts}
      />
    );
  }
  if (part.type === "tool-investigateFinance") {
    return (
      <InvestigateBlock
        label="Finance"
        spinning={(part as any).state !== "output-available"}
        output={(part as any).output}
        kind="finance"
        messageId={messageId}
        onPinVisual={onPinVisual}
        movedPinKeys={movedPinKeys}
        findingsKeys={findingsKeys}
        blurbOnly={hideChatCharts}
      />
    );
  }
  if (part.type === "tool-selectVisuals") {
    if (hideChatCharts) return null;
    const spinning = (part as any).state !== "output-available";
    const out = (part as any).output as { cardTypes?: string[]; rationale?: string } | undefined;
    return (
      <ToolStatus
        label={
          spinning
            ? "Selecting visuals…"
            : `Visuals · ${(out?.cardTypes ?? []).join(", ") || "ready"}`
        }
        spinning={spinning}
      />
    );
  }
  if (part.type === "tool-getLivePlantStatus") {
    return (
      <ToolStatus label="Live plant status" spinning={(part as any).state !== "output-available"} />
    );
  }
  if (part.type === "tool-advanceReplay") {
    return <ToolStatus label="Advancing replay" spinning={(part as any).state !== "output-available"} />;
  }

  return null;
}

function InvestigateBlock({
  label,
  spinning,
  output,
  kind,
  messageId,
  onPinVisual,
  movedPinKeys,
  findingsKeys,
  blurbOnly = false,
}: {
  label: string;
  spinning?: boolean;
  output?: any;
  kind: "engineer" | "operations" | "finance";
  messageId?: string;
  onPinVisual?: (draft: CanvasPinDraft) => void;
  movedPinKeys?: ReadonlySet<string>;
  findingsKeys?: string[] | null;
  /** First ask: compact findings strip only — no pinable cards (those go on canvas). */
  blurbOnly?: boolean;
}) {
  if (spinning || !output) {
    return (
      <div className="overflow-hidden rounded-xl border border-border/80 bg-surface">
        <div className="flex items-center gap-1.5 border-b border-border/60 bg-surface-2/60 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {spinning ? <Loader2 className="size-3 animate-spin" /> : <span className="text-primary">✓</span>}
          {label} findings
        </div>
        {spinning ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">Querying ClickHouse…</p>
        ) : (
          <FindingsBody kind={kind} data={output} findingsKeys={findingsKeys} />
        )}
      </div>
    );
  }

  // First ask: keep a compact readings strip in chat; never "pin each" / Move-to-canvas stacks.
  if (blurbOnly) {
    return (
      <div className="overflow-hidden rounded-xl border border-border/80 bg-surface">
        <div className="flex items-center gap-1.5 border-b border-border/60 bg-surface-2/60 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <span className="text-primary">✓</span>
          {label} findings
        </div>
        <FindingsBody kind={kind} data={output} findingsKeys={findingsKeys} />
      </div>
    );
  }

  if (kind === "engineer" && Array.isArray(output.attention) && onPinVisual) {
    return (
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label} findings — pin each tag
        </p>
        {output.attention.slice(0, CHAT_DEFAULT_READING_LIMIT).map((a: any) => {
          const draft: CanvasPinDraft = {
            kind: "finding",
            sourceMessageId: messageId,
            payload: {
              kind: "finding",
              item: {
                tag: String(a.tag),
                label: String(a.label ?? a.tag),
                value: Number(a.value),
                unit: a.unit,
                normalMin: a.normalMin,
                normalMax: a.normalMax,
                outside: Boolean(a.outside),
              },
            },
          };
          return (
            <PinableVisual
              key={a.tag}
              draft={draft}
              onPin={onPinVisual}
              moved={movedPinKeys?.has(chatPinSourceKey(draft)) ?? false}
            >
              <div className="rounded-lg border border-border/60 bg-surface px-3 py-2">
                <code className="font-mono text-[11px] font-semibold">{a.tag}</code>
                <p className="text-[11px] text-muted-foreground">{a.label}</p>
                <p className="mt-1 tabular text-sm">
                  {Number(a.value).toFixed(2)} {a.unit || ""}
                  {a.outside ? " · watch" : ""}
                </p>
              </div>
            </PinableVisual>
          );
        })}
      </div>
    );
  }

  // Ops / finance: keep compact strip, still one pinable unit (metrics strip)
  const body = (
    <div className="overflow-hidden rounded-xl border border-border/80 bg-surface">
      <div className="flex items-center gap-1.5 border-b border-border/60 bg-surface-2/60 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <span className="text-primary">✓</span>
        {label} findings
      </div>
      <FindingsBody kind={kind} data={output} findingsKeys={findingsKeys} />
    </div>
  );
  if (!onPinVisual) return body;
  const findingsDraft: CanvasPinDraft = {
    kind: "findings",
    sourceMessageId: messageId,
    payload: { kind: "findings", findings: { label, kind, data: output } },
  };
  return (
    <PinableVisual
      draft={findingsDraft}
      onPin={onPinVisual}
      moved={movedPinKeys?.has(chatPinSourceKey(findingsDraft)) ?? false}
    >
      {body}
    </PinableVisual>
  );
}

function ToolStatus({ label, spinning }: { label: string; spinning?: boolean }) {
  return (
    <div className="my-1 flex items-center gap-1.5 text-xs text-muted-foreground">
      {spinning ? <Loader2 className="size-3 animate-spin" /> : <span>✓</span>}
      {label}
    </div>
  );
}

export function RoleVisual({ role, data }: { role: Role; data: any }) {
  if (!data) return null;
  if (role === "engineer") {
    return (
      <section className="grid gap-4 md:grid-cols-3">
        <Card title="Generator / turbine power" value={`${Number(data.productionMW).toFixed(2)} MW`} />
        <Card title="Turbine speed" value={`${Number(data.turbineSpeed).toFixed(1)} rpm`} />
        <Card title="Boiler pressure" value={`${Number(data.boilerPressure).toFixed(3)}`} />
        <div className="card-surface md:col-span-2 p-4">
          <h3 className="mb-2 text-sm font-medium">P4_ST_PO trend (ClickHouse)</h3>
          <SparkTrend data={data.trends?.P4_ST_PO || []} unit="MW" />
        </div>
        <div className="card-surface p-4">
          <h3 className="mb-2 text-sm font-medium">Closest to limits</h3>
          <ul className="space-y-1 text-sm">
            {(data.attention || []).map((a: any) => (
              <li key={a.tag} className={a.outside ? "text-[color:var(--warning)]" : "text-muted-foreground"}>
                {a.label}: {Number(a.value).toFixed(2)} {a.unit}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            Query {data.elapsedMs} ms · {data.dataSource}
          </p>
        </div>
      </section>
    );
  }
  if (role === "operations") {
    return (
      <section className="grid gap-4 md:grid-cols-3">
        <Card title="Current rate" value={`${Number(data.currentRateMW).toFixed(2)} MW`} />
        <Card title="Shift vs target" value={`${Number(data.percentOfTarget).toFixed(1)}%`} />
        <Card title="Capacity util." value={`${Number(data.capacityUtilizationPct).toFixed(1)}%`} />
        <div className="card-surface md:col-span-2 p-4">
          <h3 className="mb-2 text-sm font-medium">Shift MWh vs target (synthetic clock)</h3>
          <TargetBars
            current={Number(data.shiftProductionMWh)}
            target={Number(data.shiftTargetMWh)}
            projected={Number(data.projectedShiftMWh)}
          />
        </div>
        <div className="card-surface p-4 text-sm">
          <p>
            Bottleneck: <span className="text-[color:var(--warning)]">{data.bottleneckArea}</span>
          </p>
          <p className="mt-2 text-xs text-muted-foreground">{data.bottleneckRule}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Hours into shift (demo clock): {Number(data.hoursElapsed).toFixed(2)}
          </p>
        </div>
      </section>
    );
  }
  return (
    <section className="grid gap-4 md:grid-cols-3">
      <Card title="Production value" value={`$${Number(data.productionValueUSD).toFixed(0)}`} />
      <Card title="Operating cost" value={`$${Number(data.operatingCostUSD).toFixed(0)}`} />
      <Card title="Margin" value={`$${Number(data.marginUSD).toFixed(0)}`} />
      <div className="card-surface md:col-span-2 p-4">
        <h3 className="mb-2 text-sm font-medium">Finance stack (synthetic rates)</h3>
        <FinanceBars
          value={Number(data.productionValueUSD)}
          cost={Number(data.operatingCostUSD)}
          margin={Number(data.marginUSD)}
          planned={Number(data.plannedRevenue)}
        />
      </div>
      <div className="card-surface p-4 text-sm">
        <p>Cost / MWh: ${Number(data.costPerMWh).toFixed(2)}</p>
        <p className="mt-1">Δ vs plan (prorated): ${Number(data.varianceVsPlanUSD).toFixed(0)}</p>
        <p className="mt-2 text-xs text-[color:var(--warning)]">{data.disclaimer}</p>
      </div>
    </section>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="card-surface p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="mt-2 text-2xl font-semibold tabular">{value}</p>
    </div>
  );
}
