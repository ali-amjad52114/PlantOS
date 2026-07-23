import { logger, metadata, prompts } from "@trigger.dev/sdk";
import { chat } from "@trigger.dev/sdk/ai";
import { createClient, type ClickHouseClient } from "@clickhouse/client";
import { stepCountIs, streamText, tool } from "ai";
import type { InferUITools, UIMessage } from "ai";
import { z } from "zod";
import { catalogPromptSection, normalizeSpec, validateSpec } from "../lib/catalog";
import type { PlantChatDataTypes, PlantRole } from "../lib/plant-chat-types";
import { plantClientDataSchema } from "../lib/plant-chat-types";
import { defaultPlantTower } from "../lib/plant-tower";
import { engineerSnapshot, financeSnapshot, operationsSnapshot } from "../lib/plant-services";
import { getReplayControl, tickReplay } from "../lib/replay";
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

function writeStep(data: PlantChatDataTypes["investigation-step"]) {
  chat.response.write({
    type: "data-investigation-step",
    id: data.id,
    data,
    transient: true,
  });
}

function writeTower(role: PlantRole) {
  const tower = defaultPlantTower(role);
  chat.response.write({
    type: "data-plant-tower",
    data: tower,
  });
  return tower;
}

const investigateEngineer = tool({
  description:
    "Run the PlantOS Engineer investigation: current generator/turbine/boiler state, normal-range attention list, and recent trends from ClickHouse.",
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
    writeTower("engineer");
    return visual;
  },
});

const investigateOperations = tool({
  description:
    "Run the PlantOS Operations investigation: current production rate, shift progress vs target, capacity, forecast, and bottleneck area.",
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
    writeTower("operations");
    return visual;
  },
});

const investigateFinance = tool({
  description:
    "Run the PlantOS Finance investigation: production value, operating cost, cost/MWh, margin, variance vs plan. Uses labeled synthetic assumptions.",
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
    writeTower("finance");
    return visual;
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
  getLivePlantStatus,
  advanceReplay,
  renderVisualization,
};

function toolsForClientData(clientData: z.infer<typeof plantClientDataSchema> | undefined) {
  const role: PlantRole = clientData?.role ?? "engineer";
  const allowAdvance = clientData?.allowAdvanceReplay === true;
  const shared = {
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
  }),
  content: `You are PlantOS, an industrial plant intelligence orchestrator over a continuously replaying HAI normal-operation dataset stored in ClickHouse.

Role context:
- The active role arrives as typed **clientData.role** (engineer | operations | finance). Do not expect a [role=…] prefix in the user message.
- Only the matching investigate* tool is available this turn — call it for plant questions in that role.
- Live feed questions → call getLivePlantStatus. advanceReplay is only available when explicitly enabled; prefer not to tick the plant yourself.

Presenting results — **chat visual budget (strict by default)**:
- **Visual priority (required):** Lovable cards → Replit cards → Ignition plant-viz → generic charts/shadcn. Never invent custom AI cards when a named catalog card fits.
- Do **not** bombard the chat with charts or data blocks. Typical / preloaded plant questions need at most **1 chart** and about **4 readings** (never more than 2 charts or 4 readings unless the user clearly asks for a broader pack).
- Calling the role investigate tool streams a Lovable plant tower; the **chat UI shows only one chart** from it by default. Do not describe the tower as a markdown table.
- The UI already renders a compact findings list (capped ~4 readings) from the tool output — do **not** restate tag values, ranges, or long explanations.
- **Do not** call renderVisualization unless the user **explicitly** asks for a chart, another view, or more visuals. When you do: **once**, prefer a **single Lovable card** type as the root (label/hint only). Fall back to Replit, then Ignition, then generic — in that order.
- If the user asks for many charts or a full dashboard, then you may add more — that is the exception.
- After tools, reply with **only** a short recommendation (1 sentence, or at most 3 tight bullets). No preamble ("I'll investigate…"), no paragraphs, no repeating numbers already shown in the findings UI.
- Production and finance dollar figures are SYNTHETIC DEMO ASSUMPTIONS — say so briefly when discussing money.
- Never invent tag values. If a tool fails, report the error.
- Dataset: HAI normal-op (train1), production signal tag P4_ST_PO (steam turbine power MW).

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
    },
    onChatStart: async () => {
      const resolved = await systemPrompt.resolve({
        componentReference: catalogPromptSection(),
      });
      chat.prompt.set(resolved);
    },
    onTurnStart: async ({ writer, clientData, turn }) => {
      const role: PlantRole = clientData?.role ?? "engineer";
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
