import { prompts } from "@trigger.dev/sdk";
import { chat } from "@trigger.dev/sdk/ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createClient, type ClickHouseClient } from "@clickhouse/client";
import { createProviderRegistry, stepCountIs, streamText, tool } from "ai";
import type { InferUITools, UIMessage } from "ai";
import { z } from "zod";
import { catalogPromptSection, normalizeSpec, validateSpec } from "../lib/catalog";
import type { PlantChatDataTypes } from "../lib/plant-chat-types";
import { defaultPlantTower } from "../lib/plant-tower";
import { engineerSnapshot, financeSnapshot, operationsSnapshot } from "../lib/plant-services";
import { getReplayControl, tickReplay } from "../lib/replay";

/** Dashboard env is named OPEN_AI (also accepts standard OPENAI_API_KEY). */
const openai = createOpenAI({
  apiKey: process.env.OPEN_AI || process.env.OPENAI_API_KEY,
});

let clickhouse: ClickHouseClient | undefined;

function getClickHouse(): ClickHouseClient {
  if (!clickhouse) {
    const url = process.env.CLICKHOUSE_URL;
    if (!url) throw new Error("CLICKHOUSE_URL is not set in Trigger environment variables");
    clickhouse = createClient({ url, database: "plantos" });
  }
  return clickhouse;
}

function writeStep(data: PlantChatDataTypes["investigation-step"]) {
  chat.response.write({
    type: "data-investigation-step",
    id: data.id,
    data,
    transient: true,
  });
}

function writeTower(role: "engineer" | "operations" | "finance") {
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
    "Render charts, tables and stat cards for the user, instead of describing data as text. " +
    "Pass a json-render spec built from the components listed in the system prompt, with the " +
    "data rows inlined. Use for supplemental charts after investigation; a Lovable plant tower is " +
    "already streamed automatically when investigate* tools run.",
  inputSchema: z.object({
    spec: z.object({
      root: z.string().describe("Key of the root element"),
      elements: z.record(
        z.string(),
        z.object({
          type: z.string().describe("A component name from the system prompt"),
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
    return {
      ok: true,
      note: "Rendered to the user. Don't repeat the data as text — add at most a one-sentence takeaway.",
    };
  },
});

const tools = {
  investigateEngineer,
  investigateOperations,
  investigateFinance,
  getLivePlantStatus,
  advanceReplay,
  renderVisualization,
};

export type PlantChatUIMessage = UIMessage<
  unknown,
  PlantChatDataTypes,
  InferUITools<typeof tools>
>;

const registry = createProviderRegistry({ openai });

const systemPrompt = prompts.define({
  id: "plantos-orchestrator",
  description: "PlantOS role-aware plant intelligence orchestrator",
  model: "openai:gpt-4.1-mini",
  variables: z.object({
    componentReference: z.string(),
  }),
  content: `You are PlantOS, an industrial plant intelligence orchestrator over a continuously replaying HAI normal-operation dataset stored in ClickHouse.

Roles and tools:
- Engineer questions → call investigateEngineer
- Operations / production / target / bottleneck → call investigateOperations
- Finance / value / cost / margin → call investigateFinance
- Live feed questions → call getLivePlantStatus (and advanceReplay only if asked to tick the plant)

Presenting results:
- Calling investigateEngineer / investigateOperations / investigateFinance **automatically streams a 4-card Lovable plant tower** into the chat (durable). Do not describe that tower as a markdown table.
- Optionally call renderVisualization **once** for an extra chart/table if the tower is not enough.
- After tools, add at most a one-or-two-sentence takeaway. Never dump raw tag tables as markdown.
- Production and finance dollar figures are SYNTHETIC DEMO ASSUMPTIONS — say so briefly when discussing money.
- Never invent tag values. If a tool fails, report the error.
- Dataset: HAI normal-op (train1), production signal tag P4_ST_PO (steam turbine power MW).

## renderVisualization spec reference (optional supplemental)

{{componentReference}}`,
});

export const plantAgent = chat
  .withUIMessage<PlantChatUIMessage>()
  .agent({
    id: "plantos-agent",
    idleTimeoutInSeconds: 300,
    tools,
    onChatStart: async () => {
      const resolved = await systemPrompt.resolve({
        componentReference: catalogPromptSection(),
      });
      chat.prompt.set(resolved);
    },
    onTurnStart: async ({ writer }) => {
      writer.write({
        type: "data-investigation-step",
        id: "turn-start",
        data: {
          id: "turn-start",
          label: "Starting plant investigation turn",
          status: "running",
        },
        transient: true,
      });
    },
    run: async ({ messages, tools: resolvedTools, signal }) => {
      if (!messages?.length) {
        console.warn("plantos-agent: empty messages on run — skipping streamText");
        return streamText({
          ...chat.toStreamTextOptions({ registry, tools: resolvedTools }),
          model: openai("gpt-4.1-mini"),
          messages: [{ role: "user", content: "(no user message yet)" }],
          tools: resolvedTools,
          stopWhen: stepCountIs(1),
          abortSignal: signal,
        });
      }
      return streamText({
        ...chat.toStreamTextOptions({ registry, tools: resolvedTools }),
        model: openai("gpt-4.1-mini"),
        messages,
        tools: resolvedTools,
        stopWhen: stepCountIs(12),
        abortSignal: signal,
      });
    },
  });
