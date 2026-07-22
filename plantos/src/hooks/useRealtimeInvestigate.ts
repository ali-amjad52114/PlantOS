"use client";

import { useRealtimeRun } from "@trigger.dev/react-hooks";

type Role = "engineer" | "operations" | "finance";

export type InvestigateRunOutput = {
  mode?: "single" | "routed" | "parallel";
  role?: Role;
  question?: string;
  visual?: any;
  source?: string;
  routing?: { role: Role; reason: string; method: string };
  roles?: Partial<
    Record<
      Role,
      {
        ok: boolean;
        visual?: any;
        source?: string;
        error?: string;
        runId?: string;
      }
    >
  >;
  okCount?: number;
};

export type InvestigateProgress = {
  status: "idle" | "loading" | "queued" | "running" | "complete" | "failed";
  percentage: number;
  label: string;
  runStatus?: string;
  error?: string;
  output?: InvestigateRunOutput;
};

/**
 * Mirrors realtime-csv-importer useRealtimeCSVValidator.
 * Skill: enabled guard, scoped accessToken, skipColumns for payload.
 * Untyped task: works for plant-investigate / route / parallel parents.
 */
export function useRealtimeInvestigate(
  runId?: string,
  accessToken?: string
): InvestigateProgress {
  const { run, error } = useRealtimeRun(runId, {
    accessToken: accessToken ?? "",
    enabled: Boolean(runId && accessToken),
    skipColumns: ["payload"],
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
    return { status: "loading", percentage: 0, label: "Connecting to run…" };
  }

  const progress = run.metadata?.progress as
    | { percentage?: number; label?: string; step?: string }
    | undefined;

  if (run.status === "COMPLETED") {
    return {
      status: "complete",
      percentage: 100,
      label: progress?.label ?? "Complete",
      runStatus: run.status,
      output: run.output as InvestigateRunOutput | undefined,
    };
  }

  if (run.status === "FAILED" || run.status === "CRASHED" || run.status === "SYSTEM_FAILURE") {
    return {
      status: "failed",
      percentage: progress?.percentage ?? 0,
      label: progress?.label ?? "Failed",
      runStatus: run.status,
      error:
        typeof run.error === "object" && run.error && "message" in run.error
          ? String((run.error as { message?: string }).message)
          : String(run.error ?? "failed"),
    };
  }

  if (run.status === "QUEUED" || run.status === "DELAYED" || run.status === "PENDING_VERSION") {
    return {
      status: "queued",
      percentage: progress?.percentage ?? 5,
      label: progress?.label ?? "Queued…",
      runStatus: run.status,
    };
  }

  return {
    status: "running",
    percentage: progress?.percentage ?? 10,
    label: progress?.label ?? `Run ${run.status}`,
    runStatus: run.status,
  };
}
