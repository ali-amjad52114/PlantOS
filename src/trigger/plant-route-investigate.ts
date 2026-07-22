import { createOpenAI } from "@ai-sdk/openai";
import { logger, metadata, task } from "@trigger.dev/sdk";
import { generateObject } from "ai";
import { z } from "zod";
import { plantInvestigate } from "./plant-investigate";

type Role = "engineer" | "operations" | "finance";

const openai = createOpenAI({
  apiKey: process.env.OPEN_AI || process.env.OPENAI_API_KEY,
});

const routingSchema = z.object({
  role: z.enum(["engineer", "operations", "finance"]),
  reason: z.string(),
});

/**
 * Deterministic keyword fallback (demo-safe if LLM unavailable).
 * Mirrors the spirit of routing-questions.ts without hard-failing the demo.
 */
function routeByKeywords(question: string): { role: Role; reason: string; method: "keywords" } {
  const q = question.toLowerCase();
  if (/cost|margin|revenue|worth|finance|dollar|\$|mwh.*value|operating cost/.test(q)) {
    return {
      role: "finance",
      reason: "Keywords match finance (value/cost/margin).",
      method: "keywords",
    };
  }
  if (/target|shift|bottleneck|capacity|forecast|operations|ops|meeting.*production/.test(q)) {
    return {
      role: "operations",
      reason: "Keywords match operations (target/shift/bottleneck).",
      method: "keywords",
    };
  }
  if (/turbine|generator|boiler|tag|pressure|temperature|engineer|status|sensor/.test(q)) {
    return {
      role: "engineer",
      reason: "Keywords match engineer (equipment/sensor status).",
      method: "keywords",
    };
  }
  return {
    role: "engineer",
    reason: "Default to engineer when role is ambiguous.",
    method: "keywords",
  };
}

async function routeQuestion(question: string): Promise<{
  role: Role;
  reason: string;
  method: "llm" | "keywords";
}> {
  const hasKey = Boolean(process.env.OPEN_AI || process.env.OPENAI_API_KEY);
  if (!hasKey) return routeByKeywords(question);

  try {
    const { object } = await generateObject({
      model: openai("gpt-4.1-mini"),
      schema: routingSchema,
      temperature: 0.1,
      prompt: `You are a PlantOS traffic controller. Route the user question to exactly one role.

Roles:
- engineer: equipment health, turbine/generator/boiler, sensors, tags, normal ranges, trends
- operations: production rate, shift targets, capacity, forecast, bottlenecks
- finance: production value, operating cost, margin, $/MWh, variance vs plan

Question: ${question}

Return JSON with role and a short reason.`,
    });
    return { ...object, method: "llm" };
  } catch (err) {
    logger.warn("LLM routing failed; using keyword fallback", {
      error: err instanceof Error ? err.message : String(err),
    });
    return routeByKeywords(question);
  }
}

/**
 * Building-effective-agents Routing pattern:
 * classify question → specialist (plant-investigate) via triggerAndWait.
 * Skill: check Result.ok (never treat wait result as output).
 */
export const plantRouteInvestigate = task({
  id: "plant-route-investigate",
  maxDuration: 300,
  run: async (payload: { question: string }) => {
    metadata.set("status", "routing").set("progress", {
      step: "route",
      label: "Routing question to role specialist",
      percentage: 15,
    });

    const routing = await routeQuestion(payload.question);
    logger.info("Routed PlantOS question", routing);

    metadata.set("progress", {
      step: "investigate",
      label: `Running ${routing.role} investigation`,
      percentage: 45,
      role: routing.role,
      method: routing.method,
    });

    // Skill CRITICAL: triggerAndWait returns Result — check .ok
    const child = await plantInvestigate.triggerAndWait({
      role: routing.role,
      question: payload.question,
    });

    if (!child.ok) {
      metadata.set("status", "failed").set("progress", {
        step: "failed",
        label: `${routing.role} investigation failed`,
        percentage: 100,
      });
      throw new Error(
        typeof child.error === "object" && child.error && "message" in child.error
          ? String((child.error as { message?: string }).message)
          : `plant-investigate failed for ${routing.role}`
      );
    }

    metadata.set("status", "complete").set("progress", {
      step: "complete",
      label: `Routed to ${routing.role} (${routing.method})`,
      percentage: 100,
      role: routing.role,
      method: routing.method,
    });

    return {
      mode: "routed" as const,
      role: routing.role,
      question: payload.question,
      visual: child.output.visual,
      source: child.output.source,
      routing: {
        role: routing.role,
        reason: routing.reason,
        method: routing.method,
      },
    };
  },
});
