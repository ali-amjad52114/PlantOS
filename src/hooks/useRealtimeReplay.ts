"use client";

import { useRealtimeRun } from "@trigger.dev/react-hooks";

export type ReplayProgress = {
  status: "idle" | "loading" | "queued" | "running" | "complete" | "failed";
  percentage: number;
  label: string;
  runStatus?: string;
  error?: string;
  insertedRows?: number;
  lastOriginal?: string | null;
  speed?: number;
  playing?: boolean;
  tickIndex?: number;
  tickCount?: number;
};

/**
 * Phase 3 — subscribe to plant-replay-burst (or any replay run) via Realtime.
 * Skill: enabled guard, scoped accessToken, skipColumns for payload/output.
 */
export function useRealtimeReplay(runId?: string, accessToken?: string): ReplayProgress {
  const { run, error } = useRealtimeRun(runId, {
    accessToken: accessToken ?? "",
    enabled: Boolean(runId && accessToken),
    skipColumns: ["payload", "output"],
  });

  if (!runId || !accessToken) {
    return { status: "idle", percentage: 0, label: "Idle" };
  }

  if (error) {
    return {
      status: "failed",
      percentage: 0,
      label: "Realtime error",
      error: error.message,
    };
  }

  if (!run) {
    return { status: "loading", percentage: 0, label: "Connecting to replay…" };
  }

  const progress = run.metadata?.progress as
    | { percentage?: number; label?: string; step?: string }
    | undefined;
  const insertedRows =
    typeof run.metadata?.insertedRows === "number" ? run.metadata.insertedRows : undefined;
  const lastOriginal =
    run.metadata?.lastOriginal === undefined
      ? undefined
      : (run.metadata.lastOriginal as string | null);
  const speed = typeof run.metadata?.speed === "number" ? run.metadata.speed : undefined;
  const playing =
    typeof run.metadata?.playing === "boolean" ? run.metadata.playing : undefined;
  const tickIndex =
    typeof run.metadata?.tickIndex === "number" ? run.metadata.tickIndex : undefined;
  const tickCount =
    typeof run.metadata?.tickCount === "number" ? run.metadata.tickCount : undefined;

  const meta = {
    insertedRows,
    lastOriginal,
    speed,
    playing,
    tickIndex,
    tickCount,
  };

  if (run.status === "COMPLETED") {
    return {
      status: "complete",
      percentage: 100,
      label: progress?.label ?? "Replay complete",
      runStatus: run.status,
      ...meta,
    };
  }

  if (run.status === "FAILED" || run.status === "CRASHED" || run.status === "SYSTEM_FAILURE") {
    return {
      status: "failed",
      percentage: progress?.percentage ?? 0,
      label: progress?.label ?? "Replay failed",
      runStatus: run.status,
      error:
        typeof run.error === "object" && run.error && "message" in run.error
          ? String((run.error as { message?: string }).message)
          : String(run.error ?? "failed"),
      ...meta,
    };
  }

  if (run.status === "QUEUED" || run.status === "DELAYED" || run.status === "PENDING_VERSION") {
    return {
      status: "queued",
      percentage: progress?.percentage ?? 5,
      label: progress?.label ?? "Replay queued…",
      runStatus: run.status,
      ...meta,
    };
  }

  return {
    status: "running",
    percentage: progress?.percentage ?? 10,
    label: progress?.label ?? `Replay ${run.status}`,
    runStatus: run.status,
    ...meta,
  };
}
