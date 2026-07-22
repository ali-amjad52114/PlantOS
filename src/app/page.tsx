"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  triggerPlantInvestigate,
  triggerPlantParallelInvestigate,
  triggerPlantReplayBurst,
  triggerPlantRouteInvestigate,
} from "@/app/actions";
import { PlantChat } from "@/components/plant-chat";
import { PlantShell, type ShellMode } from "@/components/plant-shell";
import { ReplayHealth } from "@/components/replay-health";
import { ShellOverflow } from "@/components/shell-overflow";
import { VisualStage, agentRoleForMode } from "@/components/visual-stage";
import { useRealtimeInvestigate } from "@/hooks/useRealtimeInvestigate";
import { useRealtimeReplay } from "@/hooks/useRealtimeReplay";
import type { PlantTowerPayload } from "@/lib/plant-tower";

type AgentRole = "engineer" | "operations" | "finance";

const SUGGESTED_ROUTE = {
  engineer: "What is the current status of the generators and turbine?",
  operations: "Are we meeting today's production target? What is the bottleneck?",
  finance: "What is today's production worth, and what has it cost?",
} as const;

const MODE_PROMPTS: Partial<Record<ShellMode, string>> = {
  overview: "Give me a plant-wide status overview from live ClickHouse tags.",
  engineer: SUGGESTED_ROUTE.engineer,
  finance: SUGGESTED_ROUTE.finance,
  operations: SUGGESTED_ROUTE.operations,
  maintenance: "Which tags are closest to limits and need maintenance attention?",
  safety: "Are any boiler, turbine, or water tags outside normal operating ranges?",
};

export default function PlantOSPage() {
  const [mode, setMode] = useState<ShellMode>("overview");
  const [role, setRole] = useState<AgentRole>("engineer");
  const [data, setData] = useState<any>(null);
  const [tower, setTower] = useState<PlantTowerPayload | null>(null);
  const [live, setLive] = useState<any>(null);
  const [triggering, setTriggering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEvidence, setShowEvidence] = useState(false);
  const [showAssumptions, setShowAssumptions] = useState(false);
  const [showPrebuilt, setShowPrebuilt] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<"chat" | "visuals">("chat");
  const [agentVisuals, setAgentVisuals] = useState<Partial<Record<AgentRole, any>>>({});
  const [towersByRole, setTowersByRole] = useState<Partial<Record<AgentRole, PlantTowerPayload>>>({});
  const [rtRunId, setRtRunId] = useState<string | undefined>();
  const [rtToken, setRtToken] = useState<string | undefined>();
  const [replayRunId, setReplayRunId] = useState<string | undefined>();
  const [replayToken, setReplayToken] = useState<string | undefined>();
  const [routeQuestion, setRouteQuestion] = useState<string>(SUGGESTED_ROUTE.engineer);
  const [routeNote, setRouteNote] = useState<string | null>(null);

  const rtProgress = useRealtimeInvestigate(rtRunId, rtToken);
  const replayProgress = useRealtimeReplay(replayRunId, replayToken);
  const agentRole = agentRoleForMode(mode);

  const refreshLive = useCallback(async () => {
    try {
      const r = await fetch("/api/plant/live");
      setLive(await r.json());
    } catch {}
  }, []);

  useEffect(() => {
    refreshLive();
    const id = setInterval(() => {
      refreshLive();
    }, 10000);
    return () => clearInterval(id);
  }, [refreshLive]);

  useEffect(() => {
    if (replayProgress.status === "running" || replayProgress.status === "complete") {
      void refreshLive();
    }
  }, [
    replayProgress.status,
    replayProgress.insertedRows,
    replayProgress.tickIndex,
    refreshLive,
  ]);

  useEffect(() => {
    if (rtProgress.status !== "complete" || !rtProgress.output) return;
    const out = rtProgress.output;

    if (out.mode === "parallel" && out.roles) {
      const next: Partial<Record<AgentRole, any>> = {};
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
      setAgentVisuals((prev) => ({ ...prev, [r]: out.visual }));
      setData(out.visual);
      setRole(r);
      setMode(r);
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
    setAgentVisuals((prev) => ({ ...prev, [r]: payload }));
    setData(payload);
    setRole(r);
    if (r === "engineer" || r === "finance" || r === "operations") {
      setMode(r);
    }
    setMobileTab("visuals");
  }, []);

  const onTower = useCallback((t: PlantTowerPayload) => {
    setTower(t);
    setTowersByRole((prev) => ({ ...prev, [t.role]: t }));
    setMobileTab("visuals");
  }, []);

  function onModeChange(next: ShellMode) {
    setMode(next);
    const ar = agentRoleForMode(next);
    setRole(ar);
    setData(agentVisuals[ar] || null);
    setTower(towersByRole[ar] || null);
    setRouteQuestion(SUGGESTED_ROUTE[ar]);
  }

  const view = data || agentVisuals[agentRole];
  const stageTower = tower || towersByRole[agentRole] || null;
  const feedActive = Boolean(live?.feedActive);
  const feedLabel = feedActive ? "LIVE" : live?.control?.playing ? "STALE" : "PAUSED";
  const liveMeta = useMemo(() => {
    const age = live?.liveAgeSec != null ? `${Math.round(live.liveAgeSec)}s` : "—";
    return `${String(live?.live?.c ?? 0)} rows · ${age}`;
  }, [live]);

  const replayControls = (
    <>
      <button
        type="button"
        onClick={() => replay("start")}
        className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-white/10 hover:text-foreground"
      >
        Start
      </button>
      <button
        type="button"
        onClick={() => replay("pause")}
        className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-white/10 hover:text-foreground"
      >
        Pause
      </button>
      <button
        type="button"
        onClick={() => replay("reset")}
        className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-white/10 hover:text-foreground"
      >
        Reset
      </button>
      {[1, 2, 4].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => replay("speed", s)}
          className={`rounded-full border px-2 py-1 text-[11px] ${
            Number(live?.control?.speed) === s
              ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
              : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10"
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
                <pre className="overflow-auto rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-muted-foreground">
                  {JSON.stringify(view.evidence, null, 2)}
                </pre>
              ) : null
            }
            assumptions={
              showAssumptions && view ? (
                <pre className="overflow-auto rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-muted-foreground">
                  {JSON.stringify(view.assumptions, null, 2)}
                </pre>
              ) : null
            }
          />
        </div>
      }
      chat={
        <PlantChat
          key={agentRole}
          role={agentRole}
          onToolVisual={onToolVisual}
          onTower={onTower}
          hideTowersInChat
          shell
          suggestedOverride={MODE_PROMPTS[mode]}
        />
      }
      stage={
        <VisualStage
          mode={mode}
          agentRole={agentRole}
          tower={stageTower}
          roleData={view}
          live={live}
        />
      }
    />
  );
}
