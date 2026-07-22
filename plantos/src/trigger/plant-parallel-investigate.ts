import { logger, metadata, task } from "@trigger.dev/sdk";
import { plantInvestigate } from "./plant-investigate";

type Role = "engineer" | "operations" | "finance";

/**
 * Building-effective-agents Parallelization pattern:
 * fan out Engineer / Ops / Finance via batchTriggerAndWait (same plant, three lenses).
 *
 * Skill CRITICAL: never wrap triggerAndWait in Promise.all —
 * use batchTriggerAndWait instead.
 */
export const plantParallelInvestigate = task({
  id: "plant-parallel-investigate",
  maxDuration: 300,
  run: async (payload: { question?: string }) => {
    const question = payload.question ?? "Plant-wide parallel investigate for all roles";

    metadata.set("status", "started").set("progress", {
      step: "fanout",
      label: "Fan-out: engineer + operations + finance",
      percentage: 10,
    });

    // Same-task batch — mirrors parallel-llm-calls / skill fan-out guidance
    const { runs } = await plantInvestigate.batchTriggerAndWait([
      { payload: { role: "engineer", question } },
      { payload: { role: "operations", question } },
      { payload: { role: "finance", question } },
    ]);

    const rolesOrder: Role[] = ["engineer", "operations", "finance"];
    const roles: Partial<
      Record<
        Role,
        {
          ok: boolean;
          visual?: unknown;
          source?: string;
          error?: string;
          runId?: string;
        }
      >
    > = {};

    let okCount = 0;
    for (let i = 0; i < rolesOrder.length; i++) {
      const role = rolesOrder[i];
      const run = runs[i];
      if (run?.ok) {
        okCount += 1;
        roles[role] = {
          ok: true,
          visual: run.output.visual,
          source: run.output.source,
          runId: run.id,
        };
      } else {
        roles[role] = {
          ok: false,
          error:
            run && !run.ok
              ? typeof run.error === "object" && run.error && "message" in run.error
                ? String((run.error as { message?: string }).message)
                : "failed"
              : "missing run",
          runId: run?.id,
        };
      }
    }

    logger.info("Parallel PlantOS investigate finished", { okCount, roles: Object.keys(roles) });

    if (okCount === 0) {
      metadata.set("status", "failed").set("progress", {
        step: "failed",
        label: "All role investigations failed",
        percentage: 100,
      });
      throw new Error("All parallel plant-investigate runs failed");
    }

    // Prefer engineer visual for the main panel; UI also stores all roles
    const primaryRole: Role =
      (roles.engineer?.ok && "engineer") ||
      (roles.operations?.ok && "operations") ||
      (roles.finance?.ok && "finance") ||
      "engineer";

    metadata.set("status", "complete").set("progress", {
      step: "complete",
      label: `Parallel complete · ${okCount}/3 roles`,
      percentage: 100,
      okCount,
    });

    return {
      mode: "parallel" as const,
      question,
      role: primaryRole,
      visual: roles[primaryRole]?.visual,
      source: "deterministic+clickhouse+parallel",
      roles,
      okCount,
    };
  },
});
