"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  triggerPlantInvestigate,
  triggerPlantParallelInvestigate,
  triggerPlantReplayBurst,
  triggerPlantRouteInvestigate,
} from "@/app/actions";
import { PlantChat, type PopulateProgress } from "@/components/plant-chat";
import { PlantShell, type ShellMode } from "@/components/plant-shell";
import { ReplayHealth } from "@/components/replay-health";
import { ShellOverflow } from "@/components/shell-overflow";
import { VisualStage, agentRoleForMode } from "@/components/visual-stage";
import { ReplayTickContext } from "@/components/lovable-viz/card-live-context";
import { useRealtimeInvestigate } from "@/hooks/useRealtimeInvestigate";
import { useRealtimeReplay } from "@/hooks/useRealtimeReplay";
import {
  clearDismissedForBoundQuestion,
  chatPinSourceKey,
  createPin,
  expandTowerIntoCardPins,
  FIRST_ASK_CANVAS_CARD_COUNT,
  isAutoBoundCanvasPin,
  questionTowerHideKey,
  replaceFirstAskCanvasPins,
  upsertBoundTowerAsCards,
  type CanvasPin,
  type CanvasPinDraft,
} from "@/lib/canvas-pins";
import {
  deriveTriggerWaitView,
  initialTriggerWaitView,
  type TriggerWaitSignals,
  type TriggerWaitView,
} from "@/lib/trigger-wait-phases";
import { defaultPlantTower, type PlantTowerPayload } from "@/lib/plant-tower";
import { resolveQuestionIndex } from "@/lib/question-card-maps";
import { MODE_QUESTIONS } from "@/lib/shell-prompts";
import { markChatFirstAskDone } from "@/lib/chat-sessions";

type AgentRole = "engineer" | "operations" | "finance";

type PersonaBag = {
  canvasPins: CanvasPin[];
  movedChatPinKeys: string[];
  firstAskDone: boolean;
  allowChatCharts: boolean;
  autoHiddenTowerKey: string | null;
  dismissedPinIds: string[];
};

async function readJson(res: Response) {
  const text = await res.text();
  const ct = res.headers.get("content-type") || "";
  if (!res.ok) {
    throw new Error(
      ct.includes("application/json")
        ? (() => {
            try {
              const j = JSON.parse(text);
              return String(j?.error || j?.message || text.slice(0, 200));
            } catch {
              return text.slice(0, 200) || `HTTP ${res.status}`;
            }
          })()
        : `HTTP ${res.status}: expected JSON, got ${ct || "non-JSON"} (${text.slice(0, 60).replace(/\s+/g, " ")})`
    );
  }
  if (!ct.includes("application/json") && text.trimStart().startsWith("<")) {
    throw new Error(`Expected JSON from ${res.url}, got HTML`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON from ${res.url}: ${text.slice(0, 80).replace(/\s+/g, " ")}`);
  }
}

const SUGGESTED_ROUTE = {
  engineer: MODE_QUESTIONS.engineer[0],
  operations: MODE_QUESTIONS.operations[0],
  finance: MODE_QUESTIONS.finance[0],
} as const;

export default function PlantOSPage() {
  const [mode, setMode] = useState<ShellMode>("overview");
  const [role, setRole] = useState<AgentRole>("engineer");
  const [data, setData] = useState<any>(null);
  const [tower, setTower] = useState<PlantTowerPayload | null>(null);
  const [live, setLive] = useState<any>(null);
  const [overview, setOverview] = useState<any>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [populateProgress, setPopulateProgress] = useState<PopulateProgress | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEvidence, setShowEvidence] = useState(false);
  const [showAssumptions, setShowAssumptions] = useState(false);
  const [showPrebuilt, setShowPrebuilt] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<"chat" | "visuals">("chat");
  const [agentVisuals, setAgentVisuals] = useState<Partial<Record<ShellMode, any>>>({});
  const [towersByMode, setTowersByMode] = useState<Partial<Record<ShellMode, PlantTowerPayload>>>({});
  const [rtRunId, setRtRunId] = useState<string | undefined>();
  const [rtToken, setRtToken] = useState<string | undefined>();
  const [replayRunId, setReplayRunId] = useState<string | undefined>();
  const [replayToken, setReplayToken] = useState<string | undefined>();
  const [routeQuestion, setRouteQuestion] = useState<string>(MODE_QUESTIONS.overview[0]);
  const [routeNote, setRouteNote] = useState<string | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [stageProgress, setStageProgress] = useState<PopulateProgress | null>(null);
  const [awaitingQuestion, setAwaitingQuestion] = useState<string | null>(null);
  const [awaitingMode, setAwaitingMode] = useState<ShellMode | null>(null);
  const [canvasPins, setCanvasPins] = useState<CanvasPin[]>([]);
  /** Chat visuals that were moved onto the canvas (no longer shown in chat). */
  const [movedChatPinKeys, setMovedChatPinKeys] = useState<Set<string>>(() => new Set());
  const [triggerWait, setTriggerWait] = useState<TriggerWaitView | null>(null);
  const [waitStartedAt, setWaitStartedAt] = useState<number | null>(null);
  const [chBinding, setChBinding] = useState(false);
  const waitSignalsRef = useRef<TriggerWaitSignals | null>(null);
  const chBindingRef = useRef(false);
  chBindingRef.current = chBinding;
  const [e2eCanvas, setE2eCanvas] = useState(false);
  const [e2eFirstAsk, setE2eFirstAsk] = useState(false);
  const [e2eAnswerGate, setE2eAnswerGate] = useState(false);
  /** Per chat session: first ask already placed (or completed without cards). */
  const sessionFirstAskDoneRef = useRef(false);
  const [sessionFirstAskDone, setSessionFirstAskDone] = useState(false);
  /** Hide this question-map tower in chat after first-ask auto-land (`mode:qN`). */
  const [autoHiddenTowerKey, setAutoHiddenTowerKey] = useState<string | null>(null);
  /**
   * First ask: charts stay off chat. Flip true when a follow-up ask starts
   * so new messages can show charts (first-ask message ids stay suppressed in chat).
   */
  const [allowChatCharts, setAllowChatCharts] = useState(false);
  /** PLAN_ANSWER_BEFORE_CANVAS — chat takeaway visible + stream idle. */
  const chatAnswerReadyRef = useRef(false);
  const [chatAnswerReadyFlag, setChatAnswerReadyFlag] = useState(false);
  /** Busy ended (or hang) but answer not ready yet — reveal when gate opens. */
  const revealWhenAnswerReadyRef = useRef(false);
  /** E2E: follow-up charts shown in chat only (no auto canvas). */
  const [e2eFollowUpTower, setE2eFollowUpTower] = useState<PlantTowerPayload | null>(null);
  const [e2eFirstAskBlurb, setE2eFirstAskBlurb] = useState(false);
  const [e2eAnswerGateBlurb, setE2eAnswerGateBlurb] = useState(false);
  /** Pins the user removed — live CH refresh must not resurrect them. */
  const dismissedPinIdsRef = useRef<Set<string>>(new Set());
  /** Per-persona canvas / first-ask bag — chats and placement are NOT shared across modes. */
  const personaBagRef = useRef<Partial<Record<ShellMode, PersonaBag>>>({});
  const canvasPinsRef = useRef<CanvasPin[]>([]);
  canvasPinsRef.current = canvasPins;
  const movedKeysRef = useRef<Set<string>>(movedChatPinKeys);
  movedKeysRef.current = movedChatPinKeys;
  const allowChatChartsRef = useRef(allowChatCharts);
  allowChatChartsRef.current = allowChatCharts;
  const autoHiddenTowerKeyRef = useRef(autoHiddenTowerKey);
  autoHiddenTowerKeyRef.current = autoHiddenTowerKey;
  /** Active Trigger/UI chat id for the current persona (from PlantChat). */
  const activeChatIdRef = useRef<string | null>(null);
  const askBridgeRef = useRef<((q: string) => void) | null>(null);
  const modeRef = useRef<ShellMode>(mode);
  modeRef.current = mode;
  /** Starter ask in flight — hide stage until Trigger finishes (then bind CH if mapped). */
  const awaitingBindRef = useRef<{
    mode: ShellMode;
    q: number | null;
    question: string;
    sawBusy: boolean;
  } | null>(null);
  const heldVisualRef = useRef<{ role: AgentRole; payload: any } | null>(null);
  const heldTowerRef = useRef<PlantTowerPayload | null>(null);

  const rtProgress = useRealtimeInvestigate(rtRunId, rtToken);
  const replayProgress = useRealtimeReplay(replayRunId, replayToken);
  const agentRole = agentRoleForMode(mode);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      setE2eCanvas(params.get("e2eCanvas") === "1");
      setE2eFirstAsk(params.get("e2eFirstAsk") === "1");
      setE2eAnswerGate(params.get("e2eAnswerGate") === "1");
    } catch {
      setE2eCanvas(false);
      setE2eFirstAsk(false);
      setE2eAnswerGate(false);
    }
  }, []);

  const snapshotPersonaBag = useCallback((m: ShellMode) => {
    personaBagRef.current[m] = {
      // Do not persist canvas pins — switching persona must not resurrect graphs.
      canvasPins: [],
      movedChatPinKeys: [...movedKeysRef.current],
      firstAskDone: sessionFirstAskDoneRef.current,
      allowChatCharts: allowChatChartsRef.current,
      autoHiddenTowerKey: autoHiddenTowerKeyRef.current,
      dismissedPinIds: [...dismissedPinIdsRef.current],
    };
  }, []);

  const restorePersonaBag = useCallback((m: ShellMode) => {
    const bag = personaBagRef.current[m];
    // Always enter a persona on an empty canvas. Charts only after Ask in this focus.
    setCanvasPins([]);
    setMovedChatPinKeys(new Set());
    setAutoHiddenTowerKey(null);
    setAllowChatCharts(false);
    // Placement resets with the empty canvas so the next Ask can land charts again.
    sessionFirstAskDoneRef.current = false;
    setSessionFirstAskDone(false);
    if (!bag) {
      dismissedPinIdsRef.current = new Set();
      return;
    }
    dismissedPinIdsRef.current = new Set(bag.dismissedPinIds);
  }, []);

  const applyChatPlacementFlags = useCallback((chatId: string | null, firstAskDone: boolean) => {
    activeChatIdRef.current = chatId;
    // Canvas was cleared on persona focus — do not re-arm "first ask done" from chat
    // storage while the board is empty, or leftover flags would block canvas landing
    // and leave the user with an empty stage after Ask.
    if (canvasPinsRef.current.length === 0) {
      sessionFirstAskDoneRef.current = false;
      setSessionFirstAskDone(false);
      setAllowChatCharts(false);
      if (!firstAskDone) {
        setAutoHiddenTowerKey(null);
      }
      return;
    }
    sessionFirstAskDoneRef.current = firstAskDone;
    setSessionFirstAskDone(firstAskDone);
    setAllowChatCharts(false);
    // Follow-up charts only after a later ask in THIS chat — not because another persona asked.
    if (!firstAskDone) {
      setAutoHiddenTowerKey(null);
    }
  }, []);

  const onActiveChatChange = useCallback(
    ({ chatId, firstAskDone }: { chatId: string; firstAskDone: boolean }) => {
      applyChatPlacementFlags(chatId, firstAskDone);
    },
    [applyChatPlacementFlags]
  );

  const resetChatSessionFirstAsk = useCallback(() => {
    sessionFirstAskDoneRef.current = false;
    setSessionFirstAskDone(false);
    setAutoHiddenTowerKey(null);
    setAllowChatCharts(false);
    chatAnswerReadyRef.current = false;
    setChatAnswerReadyFlag(false);
    revealWhenAnswerReadyRef.current = false;
    setE2eFollowUpTower(null);
    setE2eFirstAskBlurb(false);
    setE2eAnswerGateBlurb(false);
    // New chat in this persona: clear this persona's auto-landed pins only.
    setCanvasPins((prev) => prev.filter((p) => !isAutoBoundCanvasPin(p)));
    const id = activeChatIdRef.current;
    if (id) markChatFirstAskDone(id, false);
  }, []);

  const landFirstAskTower = useCallback((tower: PlantTowerPayload) => {
    setCanvasPins((prev) =>
      replaceFirstAskCanvasPins(prev, tower, dismissedPinIdsRef.current, FIRST_ASK_CANVAS_CARD_COUNT)
    );
    setAutoHiddenTowerKey(questionTowerHideKey(tower));
    const id = activeChatIdRef.current;
    if (id) markChatFirstAskDone(id, true);
  }, []);

  const markChatVisualMoved = useCallback((draft: CanvasPinDraft) => {
    setMovedChatPinKeys((prev) => {
      const next = new Set(prev);
      next.add(chatPinSourceKey(draft));
      return next;
    });
  }, []);

  const pinVisual = useCallback(
    (draft: CanvasPinDraft) => {
      markChatVisualMoved(draft);
      setCanvasPins((prev) => {
        if (draft.payload.kind === "tower") {
          return expandTowerIntoCardPins(prev, draft.payload.tower, draft.sourceMessageId);
        }
        // Explicit pin from chat — allow this id again if it was dismissed.
        if (draft.payload.kind === "card" && draft.payload.meta?.questionIndex != null) {
          const mode = draft.payload.meta.mode ?? draft.payload.meta.role ?? "";
          const id = `bound_${mode}_q${draft.payload.meta.questionIndex}_${draft.payload.card.type}`;
          dismissedPinIdsRef.current.delete(id);
        }
        return [...prev, createPin(draft, prev)];
      });
      setMobileTab("visuals");
    },
    [markChatVisualMoved]
  );

  const dropPinDraft = useCallback(
    (draft: CanvasPinDraft) => {
      markChatVisualMoved(draft);
      setCanvasPins((prev) => {
        if (draft.payload.kind === "tower") {
          return expandTowerIntoCardPins(prev, draft.payload.tower, draft.sourceMessageId);
        }
        return [...prev, createPin(draft, prev)];
      });
    },
    [markChatVisualMoved]
  );

  const onCanvasPinsChange = useCallback((next: CanvasPin[]) => {
    setCanvasPins((prev) => {
      for (const p of prev) {
        if (!next.some((n) => n.id === p.id)) {
          dismissedPinIdsRef.current.add(p.id);
        }
      }
      return next;
    });
  }, []);

  /** E2E / demo fixture for pin board only — not used for first-ask placement proof. */
  const fixtureTower = useMemo(
    () => (e2eCanvas && !e2eFirstAsk ? defaultPlantTower("engineer") : null),
    [e2eCanvas, e2eFirstAsk]
  );

  const refreshLive = useCallback(async () => {
    try {
      const r = await fetch("/api/plant/live");
      setLive(await readJson(r));
    } catch {}
  }, []);

  const refreshOverview = useCallback(async (showProgress = false) => {
    if (showProgress) {
      setOverviewLoading(true);
      setPopulateProgress({
        percentage: 12,
        label: "Connecting to plant feed…",
        steps: [
          { id: "feed", label: "Feed", done: false, active: true },
          { id: "tags", label: "Tags", done: false, active: false },
          { id: "trends", label: "Trends", done: false, active: false },
          { id: "ready", label: "Ready", done: false, active: false },
        ],
      });
    }
    try {
      if (showProgress) {
        setPopulateProgress({
          percentage: 38,
          label: "Fetching live ClickHouse snapshot…",
          steps: [
            { id: "feed", label: "Feed", done: true, active: false },
            { id: "tags", label: "Tags", done: false, active: true },
            { id: "trends", label: "Trends", done: false, active: false },
            { id: "ready", label: "Ready", done: false, active: false },
          ],
        });
      }
      const r = await fetch("/api/plant/engineer");
      const json = await readJson(r);
      if (showProgress) {
        setPopulateProgress({
          percentage: 78,
          label: "Loading generator & turbine trends…",
          steps: [
            { id: "feed", label: "Feed", done: true, active: false },
            { id: "tags", label: "Tags", done: true, active: false },
            { id: "trends", label: "Trends", done: false, active: true },
            { id: "ready", label: "Ready", done: false, active: false },
          ],
        });
      }
      setOverview(json);
      if (showProgress) {
        setPopulateProgress({
          percentage: 100,
          label: "Overview ready from ClickHouse",
          steps: [
            { id: "feed", label: "Feed", done: true, active: false },
            { id: "tags", label: "Tags", done: true, active: false },
            { id: "trends", label: "Trends", done: true, active: false },
            { id: "ready", label: "Ready", done: true, active: false },
          ],
        });
        window.setTimeout(() => setPopulateProgress(null), 900);
      }
    } catch (e: any) {
      setOverview({ error: String(e?.message || e) });
      if (showProgress) setPopulateProgress(null);
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshLive();
    void refreshOverview(true);
  }, [refreshLive, refreshOverview]);

  const playing = Boolean(live?.control?.playing);
  const feedActive = Boolean(live?.feedActive);

  // Fast poll while Start is playing so numbers visibly move (~1s with session ticks).
  useEffect(() => {
    const ms = playing || feedActive ? 1000 : 10000;
    const id = setInterval(() => {
      void refreshLive();
      void refreshOverview(false);
    }, ms);
    return () => clearInterval(id);
  }, [playing, feedActive, refreshLive, refreshOverview]);

  // Re-bind selected cards from CH while the feed is moving.
  const boundCardTypesKey =
    tower?.cards?.length && (tower.source === "selected" || tower.source === "question-map")
      ? tower.cards.map((c) => c.type).join(",")
      : null;
  const towerBindRef = useRef(tower);
  towerBindRef.current = tower;
  useEffect(() => {
    if (!playing && replayProgress.status !== "running") return;
    if (!boundCardTypesKey) return;
    let cancelled = false;
    const pull = async () => {
      const t = towerBindRef.current;
      if (!t?.cards?.length) return;
      try {
        const r = await fetch("/api/plant/bound-tower", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cardTypes: t.cards.map((c) => c.type),
            role: t.role,
            mode,
            question: t.question,
            findingsKeys: t.findingsKeys,
            deck: t.deck,
            deckName: t.deckName,
          }),
        });
        const payload = await readJson(r);
        if (cancelled || payload?.error) return;
        setTower(payload);
        setTowersByMode((prev) => ({ ...prev, [mode]: payload }));
        setCanvasPins((prev) =>
          upsertBoundTowerAsCards(prev, payload as PlantTowerPayload, dismissedPinIdsRef.current, {
            addMissing: false,
          })
        );
      } catch {
        /* ignore */
      }
    };
    void pull();
    const id = setInterval(() => void pull(), 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [
    playing,
    replayProgress.status,
    replayProgress.insertedRows,
    replayProgress.tickIndex,
    mode,
    boundCardTypesKey,
  ]);

  useEffect(() => {
    if (replayProgress.status === "running" || replayProgress.status === "complete") {
      void refreshLive();
      void refreshOverview(false);
    }
  }, [
    replayProgress.status,
    replayProgress.insertedRows,
    replayProgress.tickIndex,
    refreshLive,
    refreshOverview,
  ]);

  useEffect(() => {
    if (rtProgress.status !== "complete" || !rtProgress.output) return;
    const out = rtProgress.output;

    if (out.mode === "parallel" && out.roles) {
      const next: Partial<Record<ShellMode, any>> = {};
      for (const r of ["engineer", "operations", "finance"] as AgentRole[]) {
        if (out.roles[r]?.ok && out.roles[r]?.visual) {
          next[r] = out.roles[r]!.visual;
        }
      }
      setAgentVisuals((prev) => ({ ...prev, ...next }));
      const primary = (out.role as AgentRole) || "engineer";
      setRole(primary);
      setMode(primary);
      setData(next[primary] ?? out.visual ?? null);
      setRouteNote(`Parallel · ${out.okCount ?? 0}/3 roles ready`);
      return;
    }

    if (out.visual && out.role) {
      const r = out.role as AgentRole;
      const targetMode = (modeRef.current === "overview" ? r : modeRef.current) as ShellMode;
      setAgentVisuals((prev) => ({ ...prev, [targetMode]: out.visual }));
      setData(out.visual);
      setRole(r);
      if (modeRef.current === "overview") setMode(r);
      if (out.mode === "routed" && out.routing) {
        setRouteNote(`Routed → ${out.routing.role} (${out.routing.method}): ${out.routing.reason}`);
      } else {
        setRouteNote(null);
      }
    }
  }, [rtProgress.status, rtProgress.output]);

  async function replay(action: "start" | "pause" | "reset" | "speed", speed?: number) {
    setError(null);
    await fetch("/api/plant/replay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, speed }),
    });
    if (action === "start") {
      try {
        const { runId, publicAccessToken } = await triggerPlantReplayBurst({
          reason: "ui-start",
        });
        setReplayRunId(runId);
        setReplayToken(publicAccessToken);
      } catch (e: any) {
        setError(String(e.message || e));
      }
    }
    await refreshLive();
    await refreshOverview(false);
  }

  async function askViaTrigger() {
    setTriggering(true);
    setError(null);
    setRouteNote(null);
    try {
      const { runId, publicAccessToken } = await triggerPlantInvestigate({
        role: agentRole,
        question: `Realtime investigate ${agentRole}`,
      });
      setRtRunId(runId);
      setRtToken(publicAccessToken);
    } catch (e: any) {
      setError(String(e.message || e));
    } finally {
      setTriggering(false);
    }
  }

  async function askViaRoute() {
    setTriggering(true);
    setError(null);
    setRouteNote(null);
    try {
      const { runId, publicAccessToken } = await triggerPlantRouteInvestigate({
        question: routeQuestion.trim() || SUGGESTED_ROUTE[agentRole],
      });
      setRtRunId(runId);
      setRtToken(publicAccessToken);
    } catch (e: any) {
      setError(String(e.message || e));
    } finally {
      setTriggering(false);
    }
  }

  async function askViaParallel() {
    setTriggering(true);
    setError(null);
    setRouteNote(null);
    try {
      const { runId, publicAccessToken } = await triggerPlantParallelInvestigate({
        question: routeQuestion.trim() || "Plant-wide view for all roles",
      });
      setRtRunId(runId);
      setRtToken(publicAccessToken);
    } catch (e: any) {
      setError(String(e.message || e));
    } finally {
      setTriggering(false);
    }
  }

  const onToolVisual = useCallback((r: AgentRole, payload: any) => {
    // Hold investigation visuals until Trigger finishes + CH cards bind.
    if (awaitingBindRef.current) {
      heldVisualRef.current = { role: r, payload };
      return;
    }
    const current = modeRef.current;
    // Keep persona tab; store visuals under the active mode (maintenance/safety stay put).
    const storeMode: ShellMode =
      current === "overview" ? r : current;
    setAgentVisuals((prev) => ({ ...prev, [storeMode]: payload }));
    setData(payload);
    setRole(r);
    if (current === "overview") setMode(r);
    setMobileTab("visuals");
  }, []);

  const onTower = useCallback((t: PlantTowerPayload) => {
    // Do not flash mid-run towers while waiting on Trigger.
    if (awaitingBindRef.current) {
      heldTowerRef.current = t;
      return;
    }
    // role-default towers stay in chat for pinning; selected towers update stage.
    if (t.source === "role-default") return;
    const current = modeRef.current;
    const storeMode: ShellMode =
      current === "overview" ? (t.role as ShellMode) : current;
    setTowersByMode((prev) => ({ ...prev, [storeMode]: t }));
    setTower(t);
    setMobileTab("visuals");
  }, []);

  const revealBoundTower = useCallback(async () => {
    const pending = awaitingBindRef.current;
    if (!pending) return;
    awaitingBindRef.current = null;
    setChBinding(true);
    setTriggerWait((prev) => {
      const signals = waitSignalsRef.current;
      if (!signals) {
        return (
          prev ??
          deriveTriggerWaitView({
            chatStatus: "ready",
            parts: [],
            binding: true,
            elapsedMs: waitStartedAt ? Date.now() - waitStartedAt : 0,
          })
        );
      }
      return deriveTriggerWaitView({
        ...signals,
        binding: true,
        elapsedMs: waitStartedAt ? Date.now() - waitStartedAt : signals.elapsedMs,
      });
    });

    const flushHeldVisual = (storeMode: ShellMode) => {
      const held = heldVisualRef.current;
      heldVisualRef.current = null;
      if (held) {
        setRole(held.role);
        setAgentVisuals((prev) => ({ ...prev, [storeMode]: held.payload }));
        setData(held.payload);
      }
    };

    const storeMode: ShellMode =
      pending.mode === "overview" ? "engineer" : pending.mode;
    const heldForBind = heldTowerRef.current;
    heldTowerRef.current = null;

    setStageProgress({
      percentage: 92,
      label: "Binding live ClickHouse cards…",
      steps: [{ id: "binding", label: "Bind CH", done: false, active: true }],
    });

    try {
      const role =
        pending.mode === "finance"
          ? "finance"
          : pending.mode === "operations"
            ? "operations"
            : "engineer";
      const r = await fetch("/api/plant/bound-tower", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardTypes: heldForBind?.cards?.map((c) => c.type),
          role: heldForBind?.role ?? role,
          mode: pending.mode,
          question: pending.question,
          findingsKeys: heldForBind?.findingsKeys,
          deck: heldForBind?.deck,
          deckName: heldForBind?.deckName,
        }),
      });
      const payload = await readJson(r);
      if (payload?.error) throw new Error(payload.error);

      setTower(payload);
      setTowersByMode((prev) => ({ ...prev, [pending.mode]: payload }));

      const isFirst = !sessionFirstAskDoneRef.current;
      sessionFirstAskDoneRef.current = true;
      setSessionFirstAskDone(true);
      const chatId = activeChatIdRef.current;
      if (chatId) markChatFirstAskDone(chatId, true);
      if (isFirst) {
        landFirstAskTower(payload as PlantTowerPayload);
      } else {
        setCanvasPins((prev) =>
          upsertBoundTowerAsCards(
            prev,
            payload as PlantTowerPayload,
            dismissedPinIdsRef.current,
            { addMissing: false }
          )
        );
      }

      flushHeldVisual(storeMode);
      setError(null);
      setChBinding(false);

      const signals = waitSignalsRef.current;
      let receipt = deriveTriggerWaitView({
        chatStatus: "ready",
        parts: signals?.parts ?? [],
        binding: false,
        elapsedMs: waitStartedAt ? Date.now() - waitStartedAt : signals?.elapsedMs,
        chatId: signals?.chatId,
      });
      if (receipt.mode !== "receipt") {
        receipt = {
          mode: "receipt",
          active: null,
          done: [],
          percentage: 100,
          elapsedMs: receipt.elapsedMs,
          receipt: {
            toolNames: [],
            elapsedMs: receipt.elapsedMs,
            chatId: signals?.chatId,
            detailLines: [
              "chat.createStartSessionAction · realtime token",
              "streamText · toStreamTextOptions",
              "selectVisuals · catalog rank",
              "post-run ClickHouse bind",
            ],
          },
        };
      }
      setTriggerWait(receipt);

      setStageProgress({
        percentage: 100,
        label: "Cards ready from ClickHouse",
        steps: [{ id: "binding", label: "Bind CH", done: true, active: false }],
      });
      window.setTimeout(() => {
        setStageProgress(null);
        setAwaitingQuestion(null);
        setAwaitingMode(null);
        setTriggerWait(null);
        setWaitStartedAt(null);
      }, 1200);
      setMobileTab("visuals");
    } catch (e: any) {
      setError(String(e?.message || e));
      setChBinding(false);
      setStageProgress(null);
      setAwaitingQuestion(null);
      setAwaitingMode(null);
      setTriggerWait(null);
      setWaitStartedAt(null);
      heldVisualRef.current = null;
      if (heldForBind?.cards?.length && !sessionFirstAskDoneRef.current) {
        sessionFirstAskDoneRef.current = true;
        setSessionFirstAskDone(true);
        landFirstAskTower(heldForBind);
      }
    }
  }, [landFirstAskTower, waitStartedAt]);

  const onTriggerWait = useCallback((signals: TriggerWaitSignals, chatMode: string) => {
    if (!awaitingBindRef.current || awaitingBindRef.current.mode !== chatMode) return;
    waitSignalsRef.current = signals;
    const view = deriveTriggerWaitView({
      ...signals,
      binding: chBindingRef.current,
      elapsedMs: waitStartedAt ? Date.now() - waitStartedAt : signals.elapsedMs,
    });
    setTriggerWait(view);
  }, [waitStartedAt]);

  const onStreamProgress = useCallback((progress: PopulateProgress | null) => {
    if (!awaitingBindRef.current) return;
    if (!progress) return;
    // Keep a coarse stageProgress for any legacy consumers; canvas uses triggerWait.
    const percentage = Math.min(88, progress.percentage);
    setStageProgress({
      percentage,
      label: progress.label,
      steps: progress.steps,
    });
  }, []);

  const revealInFlight = useRef(false);

  const tryRevealBoundTower = useCallback(() => {
    if (!awaitingBindRef.current) return;
    if (!chatAnswerReadyRef.current) {
      // Stream idle (or hang) but takeaway not visible yet — wait for answer gate.
      revealWhenAnswerReadyRef.current = true;
      return;
    }
    if (revealInFlight.current) return;
    revealWhenAnswerReadyRef.current = false;
    revealInFlight.current = true;
    void revealBoundTower().finally(() => {
      revealInFlight.current = false;
    });
  }, [revealBoundTower]);

  const onChatAnswerGate = useCallback(
    (ready: boolean, chatMode: string) => {
      if (awaitingBindRef.current && awaitingBindRef.current.mode !== chatMode) return;
      chatAnswerReadyRef.current = ready;
      setChatAnswerReadyFlag(ready);
      if (ready && revealWhenAnswerReadyRef.current) {
        tryRevealBoundTower();
      }
    },
    [tryRevealBoundTower]
  );

  const onAgentBusyChange = useCallback(
    (busy: boolean, chatMode: string) => {
      const pending = awaitingBindRef.current;
      if (!pending || pending.mode !== chatMode) return;
      if (busy) {
        awaitingBindRef.current = { ...pending, sawBusy: true };
        chatAnswerReadyRef.current = false;
        setChatAnswerReadyFlag(false);
        return;
      }
      // Trigger idle — only land canvas after chat answer is ready.
      if (pending.sawBusy) {
        tryRevealBoundTower();
      }
    },
    [tryRevealBoundTower]
  );

  const onAgentError = useCallback(
    (_message: string, chatMode: string) => {
      const pending = awaitingBindRef.current;
      if (!pending || pending.mode !== chatMode) return;
      // Queue reveal; still require answer gate (do not dump cards on error alone).
      tryRevealBoundTower();
    },
    [tryRevealBoundTower]
  );

  // Hang: keep waiting UI (progress bar) — do not dump CH cards before the chat answer exists.
  useEffect(() => {
    if (!awaitingMode || !awaitingQuestion) return;
    const t = window.setTimeout(() => {
      if (!awaitingBindRef.current) return;
      revealWhenAnswerReadyRef.current = true;
    }, 12000);
    return () => window.clearTimeout(t);
  }, [awaitingMode, awaitingQuestion]);

  function onModeChange(next: ShellMode) {
    const prev = modeRef.current;
    if (prev !== next) {
      snapshotPersonaBag(prev);
    }
    setMode(next);
    const ar = agentRoleForMode(next);
    setRole(ar);
    setPendingQuestion(null);
    setRouteQuestion(MODE_QUESTIONS[next][0]);
    // Don't wipe an in-flight bind if user peeks another tab mid-run.
    if (!awaitingBindRef.current) {
      setStageProgress(null);
      setAwaitingQuestion(null);
      setAwaitingMode(null);
      setTriggerWait(null);
      setWaitStartedAt(null);
      setChBinding(false);
    }
    if (prev !== next) {
      restorePersonaBag(next);
    }
    // Never carry a prior tower onto the stage when changing persona.
    setData(null);
    setTower(null);
    if (next === "overview") {
      return;
    }
  }

  function askQuestion(question: string) {
    setError(null);
    setMobileTab("visuals");
    // Follow-up in this session → charts may appear in chat (first-ask visuals stay suppressed).
    if (sessionFirstAskDoneRef.current) {
      setAllowChatCharts(true);
    } else {
      // First ask of this chat: clear leftover auto pins so canvas cannot show a prior persona's charts.
      setCanvasPins((prev) => prev.filter((p) => !isAutoBoundCanvasPin(p)));
      setAutoHiddenTowerKey(null);
      setAllowChatCharts(false);
    }
    chatAnswerReadyRef.current = false;
    setChatAnswerReadyFlag(false);
    revealWhenAnswerReadyRef.current = false;
    const idx = resolveQuestionIndex(mode, question);

    // Fresh ask may land bound cards again even if user deleted them earlier.
    if (idx != null) {
      clearDismissedForBoundQuestion(dismissedPinIdsRef.current, mode, idx);
    }

    // Hide prior bound tower while Trigger runs — canvas waits on stream progress, then binds CH.
    setTower(null);
    setData(null);
    setTowersByMode((prev) => {
      const next = { ...prev };
      delete next[mode];
      return next;
    });
    setAgentVisuals((prev) => {
      const next = { ...prev };
      delete next[mode];
      return next;
    });
    heldVisualRef.current = null;
    heldTowerRef.current = null;

    awaitingBindRef.current = {
      mode,
      q: idx,
      question,
      sawBusy: false,
    };
    setAwaitingQuestion(question);
    setAwaitingMode(mode);
    setChBinding(false);
    waitSignalsRef.current = null;
    const started = Date.now();
    setWaitStartedAt(started);
    setTriggerWait(initialTriggerWaitView(0));
    setStageProgress({
      percentage: 8,
      label: "Starting Trigger.dev agent…",
      steps: [{ id: "session", label: "Session", done: false, active: true }],
    });

    setPendingQuestion(question);
    // Cards land only after Trigger finishes (onAgentBusyChange) — or the hang timeout below.
  }

  const runE2eSimFirstAsk = useCallback(async () => {
    setError(null);
    setMode("engineer");
    const r = await fetch("/api/plant/bound-tower?mode=engineer&q=0");
    const payload = await readJson(r);
    if (payload?.error) throw new Error(payload.error);
    setTower(payload);
    setTowersByMode((prev) => ({ ...prev, engineer: payload }));
    sessionFirstAskDoneRef.current = true;
    setSessionFirstAskDone(true);
    landFirstAskTower(payload as PlantTowerPayload);
    setE2eFirstAskBlurb(true);
    setE2eFollowUpTower(null);
    setMobileTab("visuals");
  }, [landFirstAskTower]);

  const runE2eSimFollowUp = useCallback(async () => {
    const r = await fetch("/api/plant/bound-tower?mode=engineer&q=1");
    const payload = await readJson(r);
    if (payload?.error) throw new Error(payload.error);
    // Follow-up: charts in chat only — do not auto-land on canvas.
    setE2eFollowUpTower(payload as PlantTowerPayload);
  }, []);

  /** E2E answer-gate: start await + mark Trigger idle without answer → must not land pins. */
  const runE2eAnswerGatePrepare = useCallback(async () => {
    setError(null);
    setMode("engineer");
    setCanvasPins([]);
    dismissedPinIdsRef.current.clear();
    sessionFirstAskDoneRef.current = false;
    setSessionFirstAskDone(false);
    setAutoHiddenTowerKey(null);
    setAllowChatCharts(false);
    chatAnswerReadyRef.current = false;
    setChatAnswerReadyFlag(false);
    setE2eAnswerGateBlurb(false);
    setE2eFirstAskBlurb(false);
    setE2eFollowUpTower(null);

    awaitingBindRef.current = {
      mode: "engineer",
      q: 0,
      question: MODE_QUESTIONS.engineer[0],
      sawBusy: true,
    };
    setAwaitingQuestion(MODE_QUESTIONS.engineer[0]);
    setAwaitingMode("engineer");
    setWaitStartedAt(Date.now());
    setTriggerWait(initialTriggerWaitView(0));
    setMobileTab("visuals");

    // Simulate Trigger idle while answer is still missing.
    tryRevealBoundTower();
  }, [tryRevealBoundTower]);

  /** E2E answer-gate: inject blurb + open gate → pins land. */
  const runE2eAnswerGateAnswer = useCallback(() => {
    setE2eAnswerGateBlurb(true);
    chatAnswerReadyRef.current = true;
    setChatAnswerReadyFlag(true);
    revealWhenAnswerReadyRef.current = true;
    tryRevealBoundTower();
  }, [tryRevealBoundTower]);

  const view = mode === "overview" ? null : data ?? agentVisuals[mode] ?? null;
  const stageTower = tower ?? towersByMode[mode] ?? null;
  const feedLabel = feedActive ? "LIVE" : live?.control?.playing ? "STALE" : "PAUSED";
  const liveMoving = playing || feedActive || replayProgress.status === "running";
  const replayTickKey =
    (replayProgress.insertedRows ?? 0) * 10_000 +
    (replayProgress.tickIndex ?? 0) +
    (replayProgress.status === "running" ? 1 : 0);
  const liveMeta = useMemo(() => {
    const age = live?.liveAgeSec != null ? `${Math.round(live.liveAgeSec)}s` : "—";
    return `${String(live?.live?.c ?? 0)} rows · ${age}`;
  }, [live]);

  const replaySpeed = [1, 2, 4].includes(Number(live?.control?.speed))
    ? Number(live?.control?.speed)
    : 1;

  const replayControls = (
    <>
      {!playing && (
        <button
          type="button"
          onClick={() => {
            setMobileTab("visuals");
            void replay("start");
          }}
          className="rounded-xl border border-transparent bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm shadow-primary/30"
        >
          Start live
        </button>
      )}
      {playing && (
        <button
          type="button"
          onClick={() => replay("pause")}
          className="rounded-xl border border-border bg-surface px-3 py-2 text-sm hover:bg-muted"
        >
          Pause
        </button>
      )}
      <button
        type="button"
        onClick={() => replay("reset")}
        className="rounded-xl border border-border bg-surface px-3 py-2 text-sm hover:bg-muted"
      >
        Reset
      </button>
      <details className="group relative">
        <summary
          className="flex cursor-pointer list-none items-center gap-1 rounded-xl border border-border bg-surface px-2.5 py-2 text-sm font-medium hover:bg-muted [&::-webkit-details-marker]:hidden"
          aria-label="Replay speed"
        >
          {replaySpeed}x
          <span className="text-[10px] text-muted-foreground transition group-open:rotate-180">
            ▾
          </span>
        </summary>
        <div className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-20 rounded-xl border border-border bg-surface p-1 shadow-xl">
          {[1, 2, 4].map((speed) => (
            <button
              key={speed}
              type="button"
              onClick={(event) => {
                void replay("speed", speed);
                event.currentTarget.closest("details")?.removeAttribute("open");
              }}
              className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${
                replaySpeed === speed
                  ? "bg-primary/10 font-semibold text-primary"
                  : "text-foreground/75 hover:bg-muted"
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </details>
    </>
  );

  return (
    <ReplayTickContext.Provider value={replayTickKey}>
    <PlantShell
      mode={mode}
      onModeChange={onModeChange}
      feedActive={feedActive}
      feedLabel={feedLabel}
      liveMeta={liveMeta}
      replayControls={replayControls}
      overflowOpen={overflowOpen}
      onOverflowToggle={() => setOverflowOpen((v) => !v)}
      error={error}
      mobileTab={mobileTab}
      onMobileTab={setMobileTab}
      overflowPanel={
        <div className="space-y-3">
          <ReplayHealth progress={replayProgress} />
          <ShellOverflow
            routeQuestion={routeQuestion}
            onRouteQuestion={setRouteQuestion}
            triggering={triggering}
            onRoute={askViaRoute}
            onParallel={askViaParallel}
            onSingle={askViaTrigger}
            onToggleEvidence={() => setShowEvidence((v) => !v)}
            onToggleAssumptions={() => setShowAssumptions((v) => !v)}
            showEvidence={showEvidence}
            showAssumptions={showAssumptions}
            showPrebuilt={showPrebuilt}
            onTogglePrebuilt={() => setShowPrebuilt((v) => !v)}
            rtProgress={rtProgress}
            routeNote={routeNote}
            rtRunId={rtRunId}
            evidence={
              showEvidence && view?.evidence ? (
                <pre className="overflow-auto rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                  {JSON.stringify(view.evidence, null, 2)}
                </pre>
              ) : null
            }
            assumptions={
              showAssumptions && view ? (
                <pre className="overflow-auto rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                  {JSON.stringify(view.assumptions, null, 2)}
                </pre>
              ) : null
            }
          />
        </div>
      }
      chat={
        <PlantChat
          key={mode}
          role={agentRole}
          mode={mode}
          onToolVisual={onToolVisual}
          onTower={onTower}
          hideTowersInChat={false}
          shell
          suggestedQuestions={MODE_QUESTIONS[mode]}
          populateProgress={populateProgress}
          pendingQuestion={pendingQuestion}
          onPendingQuestionConsumed={() => setPendingQuestion(null)}
          askBridgeRef={askBridgeRef}
          onStarterQuestion={askQuestion}
          onStreamProgress={onStreamProgress}
          onTriggerWait={onTriggerWait}
          onAgentBusyChange={onAgentBusyChange}
          onAgentError={onAgentError}
          onPinVisual={pinVisual}
          movedPinKeys={movedChatPinKeys}
          fixtureTower={fixtureTower}
          autoHiddenTowerKey={autoHiddenTowerKey}
          allowChatCharts={allowChatCharts}
          onFollowUpChatAsk={() => {
            if (sessionFirstAskDoneRef.current) setAllowChatCharts(true);
          }}
          onChatSessionReset={resetChatSessionFirstAsk}
          onActiveChatChange={onActiveChatChange}
          e2eFirstAsk={e2eFirstAsk}
          e2eFirstAskBlurb={e2eFirstAskBlurb}
          e2eFollowUpTower={e2eFollowUpTower}
          sessionFirstAskDone={sessionFirstAskDone}
          chatAnswerReadyFlag={chatAnswerReadyFlag}
          onChatAnswerGate={onChatAnswerGate}
          e2eAnswerGate={e2eAnswerGate}
          e2eAnswerGateBlurb={e2eAnswerGateBlurb}
          onE2eSimFirstAsk={runE2eSimFirstAsk}
          onE2eSimFollowUp={runE2eSimFollowUp}
          onE2eAnswerGatePrepare={runE2eAnswerGatePrepare}
          onE2eAnswerGateAnswer={runE2eAnswerGateAnswer}
        />
      }
      stage={
        <VisualStage
          mode={mode}
          agentRole={agentRole}
          tower={stageTower}
          roleData={view}
          live={live}
          overview={overview}
          overviewLoading={overviewLoading}
          onAskQuestion={askQuestion}
          liveMoving={liveMoving}
          stageProgress={awaitingMode === mode ? stageProgress : null}
          triggerWait={awaitingMode === mode ? triggerWait : null}
          waitStartedAt={awaitingMode === mode ? waitStartedAt : null}
          awaitingQuestion={awaitingMode === mode ? awaitingQuestion : null}
          canvasPins={canvasPins}
          onCanvasPinsChange={onCanvasPinsChange}
          onDropPinDraft={dropPinDraft}
        />
      }
    />
    </ReplayTickContext.Provider>
  );
}
