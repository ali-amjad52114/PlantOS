"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  triggerPlantInvestigate,
  triggerPlantParallelInvestigate,
  triggerPlantReplayBurst,
  triggerPlantRouteInvestigate,
} from "@/app/actions";
import { LiveFeedStrip } from "@/components/live-feed-strip";
import { PlantChat, type PopulateProgress } from "@/components/plant-chat";
import { PlantShell, type ShellMode } from "@/components/plant-shell";
import { ReplayHealth } from "@/components/replay-health";
import { ShellOverflow } from "@/components/shell-overflow";
import { VisualStage, agentRoleForMode } from "@/components/visual-stage";
import { useRealtimeInvestigate } from "@/hooks/useRealtimeInvestigate";
import { useRealtimeReplay } from "@/hooks/useRealtimeReplay";
import type { PlantTowerPayload } from "@/lib/plant-tower";
import { resolveQuestionIndex } from "@/lib/question-card-maps";
import { MODE_QUESTIONS } from "@/lib/shell-prompts";

type AgentRole = "engineer" | "operations" | "finance";

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

  const refreshLive = useCallback(async () => {
    try {
      const r = await fetch("/api/plant/live");
      setLive(await r.json());
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
      const json = await r.json();
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
        const payload = await r.json();
        if (cancelled || payload?.error) return;
        setTower(payload);
        setTowersByMode((prev) => ({ ...prev, [mode]: payload }));
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
    const current = modeRef.current;
    const storeMode: ShellMode =
      current === "overview" ? (t.role as ShellMode) : current;
    // Prefer ClickHouse question-map towers over agent role-default seed decks.
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

    // Unmapped ask: Trigger finished — apply held agent visuals, drop waiting panel.
    if (pending.q == null) {
      const heldTower = heldTowerRef.current;
      heldTowerRef.current = null;
      if (heldTower) {
        const storeMode: ShellMode =
          modeRef.current === "overview" ? (heldTower.role as ShellMode) : modeRef.current;
        setTower(heldTower);
        setTowersByMode((prev) => ({ ...prev, [storeMode]: heldTower }));
        flushHeldVisual(storeMode);
      } else {
        flushHeldVisual(modeRef.current === "overview" ? "engineer" : modeRef.current);
      }
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
      const payload = await r.json();
      if (payload?.error) throw new Error(payload.error);

      heldTowerRef.current = null;
      setTower(payload);
      setTowersByMode((prev) => ({ ...prev, [pending.mode]: payload }));
      flushHeldVisual(pending.mode);

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
      const friendly = /quota|insufficient_quota|billing/i.test(message)
        ? "OpenAI quota exceeded — add credits or update OPEN_AI. Showing ClickHouse cards anyway."
        : message;
      setError(friendly);
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
    }, 50000);
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

    // Hide prior cards immediately — nothing until Trigger finishes.
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
  }

  const view = mode === "overview" ? null : data ?? agentVisuals[mode] ?? null;
  const stageTower = tower ?? towersByMode[mode] ?? null;
  const feedLabel = feedActive ? "LIVE" : live?.control?.playing ? "STALE" : "PAUSED";
  const liveMoving = playing || feedActive || replayProgress.status === "running";
  const liveMeta = useMemo(() => {
    const age = live?.liveAgeSec != null ? `${Math.round(live.liveAgeSec)}s` : "—";
    return `${String(live?.live?.c ?? 0)} rows · ${age}`;
  }, [live]);

  const replayControls = (
    <>
      <button
        type="button"
        onClick={() => {
          setMobileTab("visuals");
          void replay("start");
        }}
        className={`rounded-xl px-3 py-2 text-sm font-medium ${
          playing
            ? "border border-[color:var(--success)]/40 bg-[color:var(--success)]/15 text-[color:var(--success)]"
            : "border border-transparent bg-primary text-primary-foreground shadow-sm shadow-primary/30"
        }`}
      >
        {playing ? "Playing…" : "Start live"}
      </button>
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
      {[1, 2, 4].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => replay("speed", s)}
          className={`rounded-xl border px-2.5 py-2 text-sm ${
            Number(live?.control?.speed) === s
              ? "border-primary/40 bg-primary/10 font-medium text-primary"
              : "border-border bg-surface text-muted-foreground hover:bg-muted"
          }`}
        >
          {s}x
        </button>
      ))}
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
      liveFeedStrip={
        <LiveFeedStrip
          playing={playing || replayProgress.status === "running"}
          feedActive={feedActive}
          live={live}
          overviewMw={overview?.productionMW}
          replayProgress={replayProgress}
        />
      }
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
          hideTowersInChat
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
        />
      }
    />
  );
}
