/**
 * Nested engineer specialist for Ask Agent (#8).
 * Single-turn AgentChat target — engineer tools only.
 */
import { logger, metadata, prompts } from "@trigger.dev/sdk";
import { chat } from "@trigger.dev/sdk/ai";
import { stepCountIs, streamText, tool } from "ai";
import { z } from "zod";
import { engineerSnapshot } from "../lib/plant-services";
import { plantChatModel, plantPromptModelId, plantRegistry, resolvePlantLlmProvider } from "./llm";

const investigateEngineer = tool({
  description:
    "Run the PlantOS Engineer investigation against ClickHouse (generator/turbine/boiler, attention list, trends).",
  inputSchema: z.object({}),
  execute: async () => engineerSnapshot(),
});

const tools = { investigateEngineer };

const systemPrompt = prompts.define({
  id: "plantos-engineer-specialist",
  description: "PlantOS nested engineer specialist",
  model: plantPromptModelId(),
  variables: z.object({}),
  content: `You are the PlantOS engineer specialist. You receive a delegated deep-dive from the orchestrator.

Rules:
- Call investigateEngineer for plant data. Never invent tag values.
- Answer with a short technical brief (3–6 bullets or a tight paragraph). Focus on vibration, reliability, boiler/turbine/generator, band violations.
- Do not pick charts or call selectVisuals — the parent orchestrator will handle visuals.
- Production dollars are out of scope; stay on engineering signals.`,
});

export const plantEngineerAgent = chat.agent({
  id: "plantos-engineer",
  idleTimeoutInSeconds: 180,
  tools,
  onChatStart: async () => {
    const resolved = await systemPrompt.resolve({});
    chat.prompt.set(resolved);
  },
  onTurnStart: async ({ turn }) => {
    metadata.set("specialist", "engineer").set("turn", turn);
    logger.info("plantos-engineer turn start", { turn });
  },
  run: async ({ messages, tools: resolvedTools, signal }) => {
    const provider = resolvePlantLlmProvider();
    const model = plantChatModel();
    metadata.set("phase", "run").set("llmProvider", provider);
    return streamText({
      ...chat.toStreamTextOptions({ registry: plantRegistry, tools: resolvedTools }),
      model,
      messages: messages?.length
        ? messages
        : [{ role: "user", content: "(no message)" }],
      tools: resolvedTools,
      stopWhen: stepCountIs(6),
      abortSignal: signal,
    });
  },
});
