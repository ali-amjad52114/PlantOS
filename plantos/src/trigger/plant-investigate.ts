import { task, logger, metadata } from "@trigger.dev/sdk";
import { engineerSnapshot, financeSnapshot, operationsSnapshot } from "../lib/plant-services";

/** Deterministic investigation task (no LLM). Progress via Realtime metadata (csv-importer pattern). */
export const plantInvestigate = task({
  id: "plant-investigate",
  maxDuration: 300,
  run: async (payload: { role: "engineer" | "operations" | "finance"; question?: string }) => {
    logger.info("PlantOS deterministic investigation", payload);

    metadata
      .set("status", "started")
      .set("progress", {
        step: "start",
        label: `Starting ${payload.role} investigation`,
        percentage: 5,
        role: payload.role,
      });

    metadata.set("progress", {
      step: "query",
      label: "Querying ClickHouse plant readings",
      percentage: 40,
      role: payload.role,
    });

    const visual =
      payload.role === "engineer"
        ? await engineerSnapshot()
        : payload.role === "operations"
          ? await operationsSnapshot()
          : await financeSnapshot();

    metadata.set("progress", {
      step: "build",
      label: "Building role visual payload",
      percentage: 85,
      role: payload.role,
    });

    const result = {
      role: payload.role,
      question: payload.question,
      visual,
      source: "deterministic+clickhouse" as const,
    };

    metadata
      .set("status", "complete")
      .set("progress", {
        step: "complete",
        label: `${payload.role} investigation complete`,
        percentage: 100,
        role: payload.role,
        elapsedMs: visual.elapsedMs,
      });

    return result;
  },
});
