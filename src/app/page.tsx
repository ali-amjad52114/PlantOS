"use client";

import { useCallback, useEffect, useState } from "react";
import {
  triggerPlantInvestigate,
  triggerPlantParallelInvestigate,
  triggerPlantReplayBurst,
  triggerPlantRouteInvestigate,
} from "@/app/actions";
import { PlantChat, RoleVisual } from "@/components/plant-chat";
import { PreBuiltCatalog } from "@/components/pre-built-catalog";
import { ReplayHealth } from "@/components/replay-health";
import { RunProgress } from "@/components/run-progress";
import { useRealtimeInvestigate } from "@/hooks/useRealtimeInvestigate";
import { useRealtimeReplay } from "@/hooks/useRealtimeReplay";

type Role = "engineer" | "operations" | "finance";
type MainView = "plant" | "prebuilt";

const SUGGESTED_ROUTE = {
  engineer: "What is the current status of the generators and turbine?",
  operations: "Are we meeting today's production target? What is the bottleneck?",
  finance: "What is today's production worth, and what has it cost?",
} as const;

export default function PlantOSPage() {
  const [mainView, setMainView] = useState<MainView>("plant");
  const [role, setRole] = useState<Role>("engineer");
  const [data, setData] = useState<any>(null);
  const [live, setLive] = useState<any>(null);
  const [triggering, setTriggering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEvidence, setShowEvidence] = useState(false);
  const [showAssumptions, setShowAssumptions] = useState(false);
  const [agentVisuals, setAgentVisuals] = useState<Partial<Record<Role, any>>>({});
  const [rtRunId, setRtRunId] = useState<string | undefined>();
  const [rtToken, setRtToken] = useState<string | undefined>();
  const [replayRunId, setReplayRunId] = useState<string | undefined>();
  const [replayToken, setReplayToken] = useState<string | undefined>();
  const [routeQuestion, setRouteQuestion] = useState<string>(SUGGESTED_ROUTE.engineer);
  const [routeNote, setRouteNote] = useState<string | null>(null);

  const rtProgress = useRealtimeInvestigate(rtRunId, rtToken);
  const replayProgress = useRealtimeReplay(replayRunId, replayToken);

  const refreshLive = useCallback(async () => {
    try {
      const r = await fetch("/api/plant/live");
      setLive(await r.json());
    } catch {}
  }, []);

  // Observe-only: Trigger plant-replay-tick / burst owns writes (Phase 0+3 — no browser tick writer).
  useEffect(() => {
    refreshLive();
    const id = setInterval(() => {
      refreshLive();
    }, 10000);
    return () => clearInterval(id);
  }, [refreshLive]);

  // Refresh CH live badge when Realtime replay metadata advances
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

  // When Trigger investigate / route / parallel completes, paint visuals
  useEffect(() => {
    if (rtProgress.status !== "complete" || !rtProgress.output) return;
    const out = rtProgress.output;

    if (out.mode === "parallel" && out.roles) {
      const next: Partial<Record<Role, any>> = {};
      for (const r of ["engineer", "operations", "finance"] as Role[]) {
        if (out.roles[r]?.ok && out.roles[r]?.visual) {
          next[r] = out.roles[r]!.visual;
        }
      }
      setAgentVisuals((prev) => ({ ...prev, ...next }));
      const primary = (out.role as Role) || "engineer";
      setRole(primary);
      setData(next[primary] ?? out.visual ?? null);
      setRouteNote(`Parallel · ${out.okCount ?? 0}/3 roles ready`);
      return;
    }

    if (out.visual && out.role) {
      const r = out.role as Role;
      setAgentVisuals((prev) => ({ ...prev, [r]: out.visual }));
      setData(out.visual);
      setRole(r);
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
    // Phase 3: Start flips control-plane then fires Trigger burst (Realtime-visible).
    // No browser tick loop — denser writes stay inside Trigger queue concurrency 1.
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
        role,
        question: `Realtime investigate ${role}`,
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
        question: routeQuestion.trim() || SUGGESTED_ROUTE[role],
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

  const onToolVisual = useCallback((r: Role, payload: any) => {
    setAgentVisuals((prev) => ({ ...prev, [r]: payload }));
    setData(payload);
    setRole(r);
  }, []);

  const view = data || agentVisuals[role];
  const feedActive = Boolean(live?.feedActive);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-zinc-800 pb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">PlantOS</p>
            <h1 className="text-3xl font-semibold tracking-tight">One plant. One truth.</h1>
            <p className="mt-1 text-sm text-zinc-400">
              HAI → ClickHouse → chat.agent + Realtime + route/parallel roles
            </p>
          </div>
          <div className="text-right text-sm">
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${
                feedActive
                  ? "border-emerald-700/50 bg-emerald-950/40 text-emerald-300"
                  : "border-zinc-700 bg-zinc-900 text-zinc-400"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${feedActive ? "animate-pulse bg-emerald-400" : "bg-zinc-500"}`} />
              {feedActive ? "LIVE" : live?.control?.playing ? "STALE" : "PAUSED"}
            </div>
            <p className="mt-2 text-zinc-400">Live max: {live?.live?.max_ts ?? "—"}</p>
            <p className="text-zinc-400">
              Live rows: {String(live?.live?.c ?? 0)} · age{" "}
              {live?.liveAgeSec != null ? `${Math.round(live.liveAgeSec)}s` : "—"}
            </p>
          </div>
        </header>

        <div className="mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-zinc-500">Replay</span>
            <button
              onClick={() => replay("start")}
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs ring-1 ring-zinc-700"
            >
              Start
            </button>
            <button
              onClick={() => replay("pause")}
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs ring-1 ring-zinc-700"
            >
              Pause
            </button>
            <button
              onClick={() => replay("reset")}
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs ring-1 ring-zinc-700"
            >
              Reset
            </button>
            {[0.5, 1, 2, 4].map((s) => (
              <button
                key={s}
                onClick={() => replay("speed", s)}
                className={`rounded-md px-3 py-1.5 text-xs ring-1 ${
                  Number(live?.control?.speed) === s
                    ? "bg-emerald-700 ring-emerald-500"
                    : "bg-zinc-900 ring-zinc-700"
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
          <ReplayHealth progress={replayProgress} />
          {replayRunId && (
            <p className="mt-1 text-[10px] font-mono text-zinc-600">replay runId: {replayRunId}</p>
          )}
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => setMainView("plant")}
            className={`rounded-md px-4 py-2 text-sm ${
              mainView === "plant" ? "bg-emerald-600 text-white" : "bg-zinc-900 text-zinc-300 ring-1 ring-zinc-700"
            }`}
          >
            Plant
          </button>
          <button
            onClick={() => setMainView("prebuilt")}
            className={`rounded-md px-4 py-2 text-sm ${
              mainView === "prebuilt" ? "bg-emerald-600 text-white" : "bg-zinc-900 text-zinc-300 ring-1 ring-zinc-700"
            }`}
          >
            Pre-built
          </button>
        </div>

        {mainView === "prebuilt" ? (
          <PreBuiltCatalog />
        ) : (
          <>
        <div className="mb-4 flex flex-wrap gap-2">
          {(["engineer", "operations", "finance"] as Role[]).map((r) => (
            <button
              key={r}
              onClick={() => {
                setRole(r);
                setData(agentVisuals[r] || null);
                setRouteQuestion(SUGGESTED_ROUTE[r]);
              }}
              className={`rounded-md px-4 py-2 text-sm capitalize ${
                role === r ? "bg-emerald-600 text-white" : "bg-zinc-900 text-zinc-300 ring-1 ring-zinc-700"
              }`}
            >
              {r}
              {agentVisuals[r] ? " · ✓" : ""}
            </button>
          ))}
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          <PlantChat role={role} onToolVisual={onToolVisual} />
          <div className="space-y-3">
            <label className="block text-xs uppercase tracking-wide text-zinc-500">
              Route / parallel question
              <textarea
                value={routeQuestion}
                onChange={(e) => setRouteQuestion(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={askViaRoute}
                disabled={triggering}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {triggering ? "Triggering…" : "Route & investigate"}
              </button>
              <button
                onClick={askViaParallel}
                disabled={triggering}
                className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                All roles parallel
              </button>
              <button
                onClick={askViaTrigger}
                disabled={triggering}
                className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-100 ring-1 ring-zinc-600 disabled:opacity-50"
              >
                Single role (Realtime)
              </button>
              <button onClick={() => setShowEvidence((v) => !v)} className="rounded-md bg-zinc-900 px-4 py-2 text-sm ring-1 ring-zinc-700">
                Evidence
              </button>
              <button
                onClick={() => setShowAssumptions((v) => !v)}
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm ring-1 ring-zinc-700"
              >
                Assumptions
              </button>
            </div>
            <RunProgress progress={rtProgress} />
            {routeNote && <p className="text-xs text-emerald-400/90">{routeNote}</p>}
            {rtRunId && <p className="text-[10px] font-mono text-zinc-600">runId: {rtRunId}</p>}
            <p className="text-xs text-zinc-500">
              Track C: routing + `batchTriggerAndWait` (not Promise.all). Chat.agent unchanged.
            </p>
          </div>
        </div>

        {error && <p className="mb-4 text-red-400">{error}</p>}

        <RoleVisual role={role} data={view} />

        {showEvidence && view?.evidence && (
          <pre className="mt-4 overflow-auto rounded-lg border border-zinc-800 bg-black/40 p-3 text-xs text-zinc-300">
            {JSON.stringify(view.evidence, null, 2)}
          </pre>
        )}
        {showAssumptions && view && (
          <pre className="mt-4 overflow-auto rounded-lg border border-zinc-800 bg-black/40 p-3 text-xs text-zinc-300">
            {JSON.stringify(view.assumptions, null, 2)}
          </pre>
        )}
          </>
        )}

        <footer className="mt-10 border-t border-zinc-800 pt-4 text-xs text-zinc-500">
          One plant. One truth. Different intelligence for every role. · Read-only · Demo assumptions labeled
        </footer>
      </div>
    </main>
  );
}
