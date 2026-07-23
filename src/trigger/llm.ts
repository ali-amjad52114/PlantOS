import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createProviderRegistry, type LanguageModel } from "ai";

/**
 * Experiment switch for PlantOS LLMs.
 *
 * Trigger dashboard env:
 * - `claude_api` — Anthropic key (your name)
 * - `OPEN_AI` / `OPENAI_API_KEY` — OpenAI key
 * - `PLANTOS_LLM` — `claude` | `openai` (optional override)
 *
 * Default: Claude when `claude_api` is set, otherwise OpenAI.
 */
export type PlantLlmProvider = "claude" | "openai";

const claudeKey = () => process.env.claude_api || process.env.ANTHROPIC_API_KEY;
const openaiKey = () => process.env.OPEN_AI || process.env.OPENAI_API_KEY;

export const openai = createOpenAI({
  apiKey: openaiKey(),
});

export const anthropic = createAnthropic({
  apiKey: claudeKey(),
});

export const plantRegistry = createProviderRegistry({
  openai,
  anthropic,
});

export function resolvePlantLlmProvider(): PlantLlmProvider {
  const forced = (process.env.PLANTOS_LLM || "").toLowerCase();
  if (forced === "claude" || forced === "anthropic") return "claude";
  if (forced === "openai") return "openai";
  if (claudeKey()) return "claude";
  return "openai";
}

export function hasPlantLlmKey(provider: PlantLlmProvider = resolvePlantLlmProvider()): boolean {
  return provider === "claude" ? Boolean(claudeKey()) : Boolean(openaiKey());
}

/** Chat / route model for the active provider. */
export function plantChatModel(): LanguageModel {
  const provider = resolvePlantLlmProvider();
  if (provider === "claude") {
    // Fast/cheap for tool-calling experiments; swap to claude-sonnet-4-5 if you want quality.
    return anthropic("claude-haiku-4-5");
  }
  return openai("gpt-4.1-mini");
}

/** prompts.define model id (provider:model). */
export function plantPromptModelId(): string {
  return resolvePlantLlmProvider() === "claude"
    ? "anthropic:claude-haiku-4-5"
    : "openai:gpt-4.1-mini";
}
