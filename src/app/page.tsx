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
import { useRealtimeInvestigate } from "@/hooks/useRealtimeInvestigate";
import { useRealtimeReplay } from "@/hooks/useRealtimeReplay";
import {
  cardDraftFromTower,
  createPin,
  expandTowerIntoCardPins,
  upsertBoundTowerAsCards,
  type CanvasPin,
  type CanvasPinDraft,
} from "@/lib/canvas-pins";
import { defaultPlantTower, type PlantTowerPayload } from "@/lib/plant-tower";
import { resolveQuestionIndex } from "@/lib/question-card-maps";
import { MODE_QUESTIONS } from "@/lib/shell-prompts";

type AgentRole = "engineer" | "operations" | "finance";

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
  const [e2eCanvas, setE2eCanvas] = useState(false);
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
      setE2eCanvas(new URLSearchParams(window.location.search).get("e2eCanvas") === "1");
    } catch {
      setE2eCanvas(false);
    }
  }, []);

  const pinVisual = useCallback((draft: CanvasPinDraft) => {
    setCanvasPins((prev) => {
      if (draft.payload.kind === "tower") {
        return expandTowerIntoCardPins(prev, draft.payload.tower, draft.sourceMessageId);
      }
      return [...prev, createPin(draft, prev)];
    });
    setMobileTab("visuals");
  }, []);

  const dropPinDraft = useCallback((draft: CanvasPinDraft, at: { x: number; y: number }) => {
    setCanvasPins((prev) => {
      if (draft.payload.kind === "tower") {
        return expandTowerIntoCardPins(prev, draft.payload.tower, draft.sourceMessageId, at);
      }
      return [...prev, createPin(draft, prev, at)];
    });
  }, []);

  const fixtureTower = useMemo(
    () => (e2eCanvas ? defaultPlantTower("engineer") : null),
    [e2eCanvas]
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

  // Fast poll while Start is playing so numbers visibly move.
  useEffect(() => {
    const ms = playing || feedActive ? 2000 : 10000;
    const id = setInterval(() => {
      void refreshLive();
      void refreshOverview(false);
    }, ms);
    return () => clearInterval(id);
  }, [playing, feedActive, refreshLive, refreshOverview]);

  // Re-bind persona question cards from CH while the feed is moving.
  const boundQ = tower?.source === "question-map" ? tower.questionIndex : null;
  useEffect(() => {
    if (!playing && replayProgress.status !== "running") return;
    if (boundQ == null) return;
    let cancelled = false;
    const pull = async () => {
      try {
        const r = await fetch(`/api/plant/bound-tower?mode=${mode}&q=${boundQ}`);
        const payload = await readJson(r);
        if (cancelled || payload?.error) return;
        setTower(payload);
        setTowersByMode((prev) => ({ ...prev, [mode]: payload }));
        setCanvasPins((prev) => upsertBoundTowerAsCards(prev, payload as PlantTowerPayload));
      } catch {
        /* ignore */
      }
    };
    void pull();
    const id = setInterval(() => void pull(), 2500);
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
    boundQ,
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
    // PLAN_CHAT_CANVAS_PINS: agent role-default towers stay in chat for user pinning.
    if (t.source === "role-default") return;
    const current = modeRef.current;
    const storeMode: ShellMode =
      current === "overview" ? (t.role as ShellMode) : current;
    setTowersByMode((prev) => {
      const existing = prev[storeMode];
      if (existing?.source === "question-map" && t.source === "role-default") return prev;
      return { ...prev, [storeMode]: t };
    });
    setTower((prev) => {
      if (prev?.source === "question-map" && t.source === "role-default") return prev;
      return t;
    });
    setMobileTab("visuals");
  }, []);

  const revealBoundTower = useCallback(async () => {
    const pending = awaitingBindRef.current;
    if (!pending) return;
    awaitingBindRef.current = null;

    const flushHeldVisual = (storeMode: ShellMode) => {
      const held = heldVisualRef.current;
      heldVisualRef.current = null;
      if (held) {
        setRole(held.role);
        setAgentVisuals((prev) => ({ ...prev, [storeMode]: held.payload }));
        setData(held.payload);
      }
    };

    // Unmapped ask: Trigger finished — apply held agent visuals; towers stay in chat for pin.
    if (pending.q == null) {
      heldTowerRef.current = null;
      flushHeldVisual(modeRef.current === "overview" ? "engineer" : modeRef.current);
      setStageProgress(null);
      setAwaitingQuestion(null);
      setAwaitingMode(null);
      return;
    }

    setStageProgress({
      percentage: 92,
      label: "Trigger complete — binding ClickHouse cards…",
      steps: [
        { id: "trigger", label: "Trigger", done: true, active: false },
        { id: "investigate", label: "Investigate", done: true, active: false },
        { id: "bind", label: "Bind CH", done: false, active: true },
        { id: "ready", label: "Ready", done: false, active: false },
      ],
    });

    try {
      const r = await fetch(`/api/plant/bound-tower?mode=${pending.mode}&q=${pending.q}`);
      const payload = await readJson(r);
      if (payload?.error) throw new Error(payload.error);

      heldTowerRef.current = null;
      setTower(payload);
      setTowersByMode((prev) => ({ ...prev, [pending.mode]: payload }));
      setCanvasPins((prev) => upsertBoundTowerAsCards(prev, payload as PlantTowerPayload));
      flushHeldVisual(pending.mode);
      setError(null);

      setStageProgress({
        percentage: 100,
        label: "Cards ready from ClickHouse",
        steps: [
          { id: "trigger", label: "Trigger", done: true, active: false },
          { id: "investigate", label: "Investigate", done: true, active: false },
          { id: "bind", label: "Bind CH", done: true, active: false },
          { id: "ready", label: "Ready", done: true, active: false },
        ],
      });
      window.setTimeout(() => {
        setStageProgress(null);
        setAwaitingQuestion(null);
        setAwaitingMode(null);
      }, 500);
      setMobileTab("visuals");
    } catch (e: any) {
      setError(String(e?.message || e));
      setStageProgress(null);
      setAwaitingQuestion(null);
      setAwaitingMode(null);
      heldVisualRef.current = null;
      heldTowerRef.current = null;
    }
  }, []);

  const onStreamProgress = useCallback((progress: PopulateProgress | null) => {
    if (!awaitingBindRef.current) return;
    if (!progress) return;
    const percentage = Math.min(88, progress.percentage);
    const label = progress.label;
    const steps: PopulateProgress["steps"] = [
      {
        id: "trigger",
        label: "Trigger",
        done: percentage >= 18,
        active: percentage < 18,
      },
      {
        id: "investigate",
        label: "Investigate",
        done: percentage >= 55,
        active: percentage >= 18 && percentage < 55,
      },
      {
        id: "bind",
        label: "Bind CH",
        done: false,
        active: percentage >= 55,
      },
      { id: "ready", label: "Ready", done: false, active: false },
    ];
    setStageProgress((prev) => {
      if (
        prev &&
        prev.percentage === percentage &&
        prev.label === label &&
        prev.steps.length === steps.length &&
        prev.steps.every(
          (s, i) =>
            s.id === steps[i].id &&
            s.done === steps[i].done &&
            s.active === steps[i].active
        )
      ) {
        return prev;
      }
      return { percentage, label, steps };
    });
  }, []);

  const revealInFlight = useRef(false);
  const onAgentBusyChange = useCallback(
    (busy: boolean, chatMode: string) => {
      const pending = awaitingBindRef.current;
      if (!pending || pending.mode !== chatMode) return;
      if (busy) {
        awaitingBindRef.current = { ...pending, sawBusy: true };
        return;
      }
      // Only reveal after this ask actually ran on Trigger (busy flipped true → false).
      if (pending.sawBusy && !revealInFlight.current) {
        revealInFlight.current = true;
        void revealBoundTower().finally(() => {
          revealInFlight.current = false;
        });
      }
    },
    [revealBoundTower]
  );

  const onAgentError = useCallback(
    (message: string, chatMode: string) => {
      // Don't paint the whole shell red — cards can still demo from ClickHouse.
      const pending = awaitingBindRef.current;
      if (!pending || pending.mode !== chatMode || revealInFlight.current) return;
      revealInFlight.current = true;
      void revealBoundTower().finally(() => {
        revealInFlight.current = false;
      });
    },
    [revealBoundTower]
  );

  // If Trigger/OpenAI hangs, don't leave the stage empty forever.
  useEffect(() => {
    if (!awaitingMode || !awaitingQuestion) return;
    const t = window.setTimeout(() => {
      if (!awaitingBindRef.current || revealInFlight.current) return;
      setError(
        "Agent still waiting on Trigger/OpenAI — showing ClickHouse cards so the demo can continue."
      );
      revealInFlight.current = true;
      void revealBoundTower().finally(() => {
        revealInFlight.current = false;
      });
    }, 12000);
    return () => window.clearTimeout(t);
  }, [awaitingMode, awaitingQuestion, revealBoundTower]);

  function onModeChange(next: ShellMode) {
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
    }
    if (next === "overview") {
      setData(null);
      setTower(towersByMode.overview ?? null);
      return;
    }
    setData(agentVisuals[next] ?? null);
    setTower(towersByMode[next] ?? null);
  }

  function askQuestion(question: string) {
    setError(null);
    setMobileTab("visuals");
    const idx = resolveQuestionIndex(mode, question);

    // Hide prior cards briefly while we show progress, then bind CH (no OpenAI required).
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
    setStageProgress({
      percentage: 8,
      label: "Starting Trigger.dev agent…",
      steps: [
        { id: "trigger", label: "Trigger", done: false, active: true },
        { id: "investigate", label: "Investigate", done: false, active: false },
        { id: "bind", label: "Bind CH", done: false, active: false },
        { id: "ready", label: "Ready", done: false, active: false },
      ],
    });

    setPendingQuestion(question);

    // ClickHouse bind does not need the LLM — reveal cards quickly so demos aren't stuck on Thinking.
    if (idx != null) {
      window.setTimeout(() => {
        const pending = awaitingBindRef.current;
        if (!pending || pending.question !== question || revealInFlight.current) return;
        setStageProgress({
          percentage: 75,
          label: "Binding live ClickHouse cards…",
          steps: [
            { id: "trigger", label: "Trigger", done: true, active: false },
            { id: "investigate", label: "Investigate", done: false, active: true },
            { id: "bind", label: "Bind CH", done: false, active: true },
            { id: "ready", label: "Ready", done: false, active: false },
          ],
        });
        revealInFlight.current = true;
        void revealBoundTower().finally(() => {
          revealInFlight.current = false;
        });
      }, 1600);
    }
  }

  const view = mode === "overview" ? null : data ?? agentVisuals[mode] ?? null;
  const stageTower = tower ?? towersByMode[mode] ?? null;
  const feedLabel = feedActive ? "LIVE" : live?.control?.playing ? "STALE" : "PAUSED";
  const liveMoving = playing || feedActive || replayProgress.status === "running";
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
      <button
        type="button"
        onClick={() => replay("pause")}
        className="rounded-xl border border-border bg-surface px-3 py-2 text-sm hover:bg-muted"
      >
        Pause
      </button>
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
          onAgentBusyChange={onAgentBusyChange}
          onAgentError={onAgentError}
          onPinVisual={pinVisual}
          fixtureTower={fixtureTower}
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
          awaitingQuestion={awaitingMode === mode ? awaitingQuestion : null}
          canvasPins={canvasPins}
          onCanvasPinsChange={setCanvasPins}
          onDropPinDraft={dropPinDraft}
        />
      }
    />
  );
}
