import { logger, metadata, prompts } from "@trigger.dev/sdk";
import { chat } from "@trigger.dev/sdk/ai";
import { createClient, type ClickHouseClient } from "@clickhouse/client";
import { stepCountIs, streamText, tool } from "ai";
import type { InferUITools, UIMessage } from "ai";
import { z } from "zod";
import { catalogPromptSection, normalizeSpec, validateSpec } from "../lib/catalog";
import type { PlantChatDataTypes, PlantRole } from "../lib/plant-chat-types";
import { plantClientDataSchema } from "../lib/plant-chat-types";
import { CHAT_PRELOAD_CHART_SOFT_MAX } from "../lib/chat-visual-budget";
import { engineerSnapshot, financeSnapshot, operationsSnapshot } from "../lib/plant-services";
import { getReplayControl, tickReplay } from "../lib/replay";
import { rankSelectVisuals, visualCatalogPromptSection } from "../lib/visual-catalog";
import { visualPriorityGate } from "../lib/visual-priority";
import {
  plantChatModel,
  plantPromptModelId,
  plantRegistry,
  resolvePlantLlmProvider,
} from "./llm";

let clickhouse: ClickHouseClient | undefined;

function getClickHouse(): ClickHouseClient {
  if (!clickhouse) {
    const url = process.env.CLICKHOUSE_URL;
    if (!url) throw new Error("CLICKHOUSE_URL is not set in Trigger environment variables");
    clickhouse = createClient({ url, database: "plantos" });
  }
  return clickhouse;
}

/** Per-run turn clock for audit elapsedMs (init in onBoot). */
const turnClock = chat.local<{ startedAt: number }>({ id: "plantos-turn-clock" });
const turnRole = chat.local<{ role: PlantRole }>({ id: "plantos-turn-role" });

function writeStep(data: PlantChatDataTypes["investigation-step"]) {
  chat.response.write({
    type: "data-investigation-step",
    id: data.id,
    data,
    transient: true,
  });
}

function writeSelectedTower(
  role: PlantRole,
  selection: ReturnType<typeof rankSelectVisuals>
) {
  const tower = {
    role,
    deck: selection.deck,
    deckName: selection.deckName,
    cards: selection.cards,
    source: "selected" as const,
    question: undefined as string | undefined,
    findingsKeys: selection.findingsKeys,
  };
  chat.response.write({
    type: "data-plant-tower",
    data: tower,
  });
  chat.response.write({
    type: "data-visual-selection",
    data: {
      cardTypes: selection.cardTypes,
      findingsKeys: selection.findingsKeys,
      rationale: selection.rationale,
    },
    transient: true,
  });
  return tower;
}

const investigateEngineer = tool({
  description:
    "Run the PlantOS Engineer investigation: current generator/turbine/boiler state, normal-range attention list, and recent trends from ClickHouse. Does not pick charts — call selectVisuals next.",
  inputSchema: z.object({}),
  execute: async () => {
    writeStep({
      id: "engineer-investigate",
      label: "Querying turbine / generator / boiler tags",
      status: "running",
      role: "engineer",
    });
    const visual = await engineerSnapshot();
    writeStep({
      id: "engineer-investigate",
      label: "Engineer investigation complete",
      status: "complete",
      elapsedMs: visual.elapsedMs,
      role: "engineer",
    });
    return visual;
  },
});

const investigateOperations = tool({
  description:
    "Run the PlantOS Operations investigation: current production rate, shift progress vs target, capacity, forecast, and bottleneck area. Does not pick charts — call selectVisuals next.",
  inputSchema: z.object({}),
  execute: async () => {
    writeStep({
      id: "operations-investigate",
      label: "Computing shift production vs target",
      status: "running",
      role: "operations",
    });
    const visual = await operationsSnapshot();
    writeStep({
      id: "operations-investigate",
      label: "Operations investigation complete",
      status: "complete",
      elapsedMs: visual.elapsedMs,
      role: "operations",
    });
    return visual;
  },
});

const investigateFinance = tool({
  description:
    "Run the PlantOS Finance investigation: production value, operating cost, cost/MWh, margin, variance vs plan. Uses labeled synthetic assumptions. Does not pick charts — call selectVisuals next.",
  inputSchema: z.object({}),
  execute: async () => {
    writeStep({
      id: "finance-investigate",
      label: "Computing energy value and margin",
      status: "running",
      role: "finance",
    });
    const visual = await financeSnapshot();
    writeStep({
      id: "finance-investigate",
      label: "Finance investigation complete",
      status: "complete",
      elapsedMs: visual.elapsedMs,
      role: "finance",
    });
    return visual;
  },
});

const selectVisuals = tool({
  description:
    "REQUIRED after investigate* for plant questions. Ranks the PlantOS visual catalog for THIS user question and streams a slim Lovable/Replit tower (≤2 cards) plus findingsKeys for the metric strip. Pass the exact user question. Optional preferredTypes are hints only.",
  inputSchema: z.object({
    question: z.string().describe("The user's question verbatim"),
    summary: z
      .string()
      .optional()
      .describe("Short investigation summary with key metric names/numbers"),
    preferredTypes: z
      .array(z.string())
      .optional()
      .describe("Optional card type hints; tool re-ranks against the catalog"),
  }),
  execute: async ({ question, summary, preferredTypes }) => {
    const role = turnRole.role ?? "engineer";
    const selection = rankSelectVisuals({
      question,
      role,
      summary,
      preferredTypes,
      limit: CHAT_PRELOAD_CHART_SOFT_MAX,
    });
    writeSelectedTower(role, selection);
    writeStep({
      id: "select-visuals",
      label: `Selected ${selection.cardTypes.join(", ")}`,
      status: "complete",
      role,
    });
    return {
      ok: true,
      ...selection,
      note: "Tower streamed. Do not restate numbers. One-sentence takeaway only. Do not call renderVisualization unless the user asked for another chart.",
    };
  },
});

const getLivePlantStatus = tool({
  description: "Get live replay feed status: playing/paused, speed, live row count, latest live timestamp.",
  inputSchema: z.object({}),
  execute: async () => {
    const ch = getClickHouse();
    const control = await getReplayControl(ch);
    const r = await ch.query({
      query: `SELECT max(ts) AS max_ts, count() AS c FROM plant_readings WHERE source='live'`,
      format: "JSONEachRow",
    });
    const live = ((await r.json()) as any[])[0];
    return { control, live };
  },
});

const advanceReplay = tool({
  description:
    "Advance the live plant replay by inserting the next batch of HAI history rows with current timestamps (demo feed).",
  inputSchema: z.object({
    force: z.boolean().optional().describe("Advance even if paused"),
  }),
  execute: async ({ force }) => tickReplay(getClickHouse(), { force }),
});

const renderVisualization = tool({
  description:
    "OPTIONAL extra visual. Prefer Lovable card types (GeneratorOutput, HydroEnergyBars, …); " +
    "if none fit use a Replit card; then Ignition (Gauge/TimeSeriesChart); generic LineChart/Stat only as last resort. " +
    "Call only when the user explicitly asks for another view/chart beyond investigate findings. " +
    "At most ONE leaf visual. Named cards usually need only optional label/hint — do not invent shadcn+chart layouts.",
  inputSchema: z.object({
    spec: z.object({
      root: z.string().describe("Key of the root element"),
      elements: z.record(
        z.string(),
        z.object({
          type: z.string().describe("Prefer a Lovable card type from the system prompt"),
          props: z.record(z.string(), z.unknown()),
          children: z.array(z.string()).optional().describe("Keys of child elements"),
        })
      ),
    }),
  }),
  execute: async ({ spec }) => {
    const normalized = normalizeSpec(spec);
    if (!normalized) {
      return { ok: false, errors: ['spec must be an object of the form { root: "<key>", elements: { ... } }'] };
    }
    const result = validateSpec(normalized);
    if (!result.ok) {
      console.warn("renderVisualization spec rejected:", result.errors);
      return { ok: false, errors: result.errors };
    }
    const priority = visualPriorityGate(normalized);
    if (!priority.ok) {
      console.warn("renderVisualization priority rejected:", priority.errors);
      return { ok: false, errors: priority.errors };
    }
    return {
      ok: true,
      family: priority.family,
      note: "Rendered to the user. Don't repeat the data as text — add at most a one-sentence takeaway. Do not call renderVisualization again unless the user asked for more charts.",
    };
  },
});

/** Full tool map for UIMessage typing; runtime tools are a per-role subset. */
const allTools = {
  investigateEngineer,
  investigateOperations,
  investigateFinance,
  selectVisuals,
  getLivePlantStatus,
  advanceReplay,
  renderVisualization,
};

function toolsForClientData(clientData: z.infer<typeof plantClientDataSchema> | undefined) {
  const role: PlantRole = clientData?.role ?? "engineer";
  const allowAdvance = clientData?.allowAdvanceReplay === true;
  const shared = {
    selectVisuals,
    getLivePlantStatus,
    renderVisualization,
    ...(allowAdvance ? { advanceReplay } : {}),
  };
  if (role === "operations") return { ...shared, investigateOperations };
  if (role === "finance") return { ...shared, investigateFinance };
  return { ...shared, investigateEngineer };
}

function toolNamesFromParts(parts: unknown[] | undefined): string[] {
  if (!parts?.length) return [];
  const names: string[] = [];
  for (const part of parts as Array<{ type?: string }>) {
    const t = part.type ?? "";
    if (t.startsWith("tool-")) names.push(t.slice("tool-".length));
  }
  return names;
}

function towerDeckFromParts(parts: unknown[] | undefined): number | undefined {
  if (!parts?.length) return undefined;
  for (const part of parts as Array<{ type?: string; data?: { deck?: number } }>) {
    if (part.type === "data-plant-tower" && typeof part.data?.deck === "number") {
      return part.data.deck;
    }
  }
  return undefined;
}

export type PlantChatUIMessage = UIMessage<
  unknown,
  PlantChatDataTypes,
  InferUITools<typeof allTools>
>;

const systemPrompt = prompts.define({
  id: "plantos-orchestrator",
  description: "PlantOS role-aware plant intelligence orchestrator",
  model: plantPromptModelId(),
  variables: z.object({
    componentReference: z.string(),
    visualCatalog: z.string(),
  }),
  content: `You are PlantOS, an industrial plant intelligence orchestrator over a continuously replaying HAI normal-operation dataset stored in ClickHouse.

Role context:
- The active role arrives as typed **clientData.role** (engineer | operations | finance). Do not expect a [role=…] prefix in the user message.
- Only the matching investigate* tool is available this turn — call it for plant questions in that role.
- Live feed questions → call getLivePlantStatus. advanceReplay is only available when explicitly enabled; prefer not to tick the plant yourself.

Presenting results — **chat visual budget + selector (strict)**:
- **Visual priority:** Lovable → Replit → Ignition → generic. Never invent custom AI cards when a catalog card fits.
- After investigate*, you **MUST** call **selectVisuals once** with the user's question (and a short summary of metric names). That tool ranks the catalog and streams the tower + findingsKeys — do not skip it.
- Do **not** bombard the chat: selectVisuals returns ≤2 cards; the UI shows ≤1 in chat and ≤4 findings readings.
- Do **not** describe the tower as a markdown table or restate findings numbers.
- **Do not** call renderVisualization unless the user **explicitly** asks for another chart/view. When you do: one Lovable leaf preferred.
- After tools, reply with **only** a short recommendation (1 sentence, or at most 3 tight bullets). No preamble.
- Production and finance dollar figures are SYNTHETIC DEMO ASSUMPTIONS — say so briefly when discussing money.
- Never invent tag values. If a tool fails, report the error.
- Dataset: HAI normal-op (train1), production signal tag P4_ST_PO (steam turbine power MW).

{{visualCatalog}}

## renderVisualization spec reference (only when user asks for an extra chart)

{{componentReference}}`,
});

export const plantAgent = chat
  .withUIMessage<PlantChatUIMessage>()
  .withClientData({ schema: plantClientDataSchema })
  .agent({
    id: "plantos-agent",
    idleTimeoutInSeconds: 300,
    tools: ({ clientData }) => toolsForClientData(clientData),
    onBoot: async () => {
      turnClock.init({ startedAt: 0 });
      turnRole.init({ role: "engineer" });
    },
    onChatStart: async () => {
      const resolved = await systemPrompt.resolve({
        componentReference: catalogPromptSection(),
        visualCatalog: visualCatalogPromptSection(),
      });
      chat.prompt.set(resolved);
    },
    onTurnStart: async ({ writer, clientData, turn }) => {
      const role: PlantRole = clientData?.role ?? "engineer";
      turnRole.role = role;
      turnClock.startedAt = Date.now();
      const available = Object.keys(toolsForClientData(clientData));
      metadata.set("role", role).set("turn", turn).set("phase", "turn-start");
      logger.info("plantos turn start", { turn, role, tools: available });
      writer.write({
        type: "data-turn-audit",
        id: `turn-${turn}-start`,
        data: {
          turn,
          role,
          toolNames: available,
          status: "started",
        },
        transient: true,
      });
      writer.write({
        type: "data-investigation-step",
        id: "turn-start",
        data: {
          id: "turn-start",
          label: `Starting ${role} investigation turn`,
          status: "running",
          role,
        },
        transient: true,
      });
    },
    onBeforeTurnComplete: async ({ writer, clientData, turn, responseMessage }) => {
      const role: PlantRole = clientData?.role ?? "engineer";
      const parts = (responseMessage as { parts?: unknown[] } | undefined)?.parts;
      const toolNames = toolNamesFromParts(parts);
      const towerDeck = towerDeckFromParts(parts);
      const startedAt = turnClock.startedAt || Date.now();
      const elapsedMs = Math.max(0, Date.now() - startedAt);
      writer.write({
        type: "data-turn-audit",
        id: `turn-${turn}-complete`,
        data: {
          turn,
          role,
          toolNames,
          towerDeck,
          elapsedMs,
          status: "complete",
        },
        transient: true,
      });
    },
    onTurnComplete: async ({ clientData, turn, responseMessage }) => {
      const role: PlantRole = clientData?.role ?? "engineer";
      const parts = (responseMessage as { parts?: unknown[] } | undefined)?.parts;
      const toolNames = toolNamesFromParts(parts);
      const towerDeck = towerDeckFromParts(parts);
      const startedAt = turnClock.startedAt || Date.now();
      const elapsedMs = Math.max(0, Date.now() - startedAt);
      metadata
        .set("role", role)
        .set("turn", turn)
        .set("phase", "turn-complete")
        .set("toolNames", toolNames)
        .set("towerDeck", towerDeck ?? null)
        .set("elapsedMs", elapsedMs);
      logger.info("plantos turn complete", { turn, role, toolNames, towerDeck, elapsedMs });
    },
    run: async ({ messages, tools: resolvedTools, signal, clientData }) => {
      const role = clientData?.role ?? "engineer";
      const provider = resolvePlantLlmProvider();
      const model = plantChatModel();
      metadata.set("role", role).set("phase", "run").set("llmProvider", provider);
      logger.info("plantos-agent model", { provider, role });
      if (!messages?.length) {
        console.warn("plantos-agent: empty messages on run — skipping streamText");
        return streamText({
          ...chat.toStreamTextOptions({ registry: plantRegistry, tools: resolvedTools }),
          model,
          messages: [{ role: "user", content: "(no user message yet)" }],
          tools: resolvedTools,
          stopWhen: stepCountIs(1),
          abortSignal: signal,
        });
      }
      return streamText({
        ...chat.toStreamTextOptions({ registry: plantRegistry, tools: resolvedTools }),
        model,
        messages,
        tools: resolvedTools,
        stopWhen: stepCountIs(12),
        abortSignal: signal,
      });
    },
  });
