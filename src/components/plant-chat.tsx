"use client";

import { useChat } from "@ai-sdk/react";
import { useTriggerChatTransport } from "@trigger.dev/sdk/chat/react";
import type { UIMessage } from "ai";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { mintChatAccessToken, startChatSession } from "@/app/actions";
import { FinanceBars, SparkTrend, TargetBars } from "@/components/charts";
import { PlantTowerGrid } from "@/components/plant-tower-grid";
import { Visualization } from "@/components/visualization";
import { normalizeSpec } from "@/lib/catalog";
import type { PlantTowerPayload } from "@/lib/plant-tower";
import type { plantAgent } from "@/trigger/plant-agent";

type Role = "engineer" | "operations" | "finance";

const SUGGESTED: Record<Role, string> = {
  engineer: "What is the current status of the generators and turbine?",
  operations: "Are we meeting today's production target? What is the bottleneck?",
  finance: "What is today's production worth, and what has it cost?",
};

const TOOL_TO_ROLE: Record<string, Role> = {
  "tool-investigateEngineer": "engineer",
  "tool-investigateOperations": "operations",
  "tool-investigateFinance": "finance",
};

export function PlantChat({
  role,
  onToolVisual,
  onTower,
  hideTowersInChat = false,
  shell = false,
  suggestedOverride,
}: {
  role: Role;
  onToolVisual: (role: Role, payload: any) => void;
  onTower?: (tower: PlantTowerPayload) => void;
  hideTowersInChat?: boolean;
  shell?: boolean;
  suggestedOverride?: string;
}) {
  const transport = useTriggerChatTransport<typeof plantAgent>({
    task: "plantos-agent",
    accessToken: ({ chatId }) => mintChatAccessToken(chatId),
    startSession: ({ chatId, clientData }) => startChatSession({ chatId, clientData }),
    // Phase 4a: typed role — not a [role=…] message prefix
    clientData: { role },
  });

  const { messages, sendMessage, stop, status, error } = useChat({
    transport: transport as any,
  });
  const [input, setInput] = useState("");
  const busy = status === "submitted" || status === "streaming";
  const suggested = suggestedOverride ?? SUGGESTED[role];

  // Guard: useChat can return a new `messages` reference every render while streaming.
  // Calling onToolVisual → parent setState without dedupe caused max update depth.
  const onToolVisualRef = useRef(onToolVisual);
  onToolVisualRef.current = onToolVisual;
  const onTowerRef = useRef(onTower);
  onTowerRef.current = onTower;
  const pushedToolOutputs = useRef(new Set<string>());
  const pushedTowers = useRef(new Set<string>());

  useEffect(() => {
    for (const m of messages) {
      if (m.role !== "assistant") continue;
      for (const part of m.parts as any[]) {
        const mappedRole = TOOL_TO_ROLE[part.type];
        if (mappedRole && part.state === "output-available" && part.output != null) {
          const key = `${m.id}:${part.toolCallId ?? part.type}:${mappedRole}`;
          if (!pushedToolOutputs.current.has(key)) {
            pushedToolOutputs.current.add(key);
            onToolVisualRef.current(mappedRole, part.output);
          }
        }
        if (part.type === "data-plant-tower" && part.data && onTowerRef.current) {
          const tkey = `${m.id}:tower:${part.data.deck}:${part.data.role}`;
          if (!pushedTowers.current.has(tkey)) {
            pushedTowers.current.add(tkey);
            onTowerRef.current(part.data as PlantTowerPayload);
          }
        }
      }
    }
  }, [messages]);

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    sendMessage({ text: trimmed });
    setInput("");
  }

  const streamProgress = deriveAgentStreamProgress(messages, status);

  return (
    <div
      className={
        shell
          ? "card-surface flex h-full min-h-0 flex-col overflow-hidden"
          : "rounded-lg border border-zinc-800 bg-zinc-900/40"
      }
    >
      <div
        className={`flex items-center justify-between px-4 py-3 text-xs ${
          shell ? "border-b border-white/5 text-muted-foreground" : "border-b border-zinc-800 text-zinc-400"
        }`}
      >
        <span>
          {shell ? (
            <>
              Ask agent · <span className="text-emerald-400/90 capitalize">{role}</span>
            </>
          ) : (
            <>
              Trigger.dev chat.agent · clientData.role=
              <span className="text-emerald-400/90">{role}</span>
            </>
          )}
        </span>
        <span className="uppercase tracking-wide">{status}</span>
      </div>

      {streamProgress && <AgentStreamProgress progress={streamProgress} shell={shell} />}

      <div
        className={`min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm ${
          shell ? "" : "max-h-96"
        }`}
      >
        {messages.length === 0 && (
          <p className={shell ? "text-muted-foreground" : "text-zinc-500"}>
            {shell
              ? `Suggested: ${suggested}`
              : `Ask via Trigger agent (OPEN_AI in dashboard). Suggested: ${suggested}`}
          </p>
        )}
        {messages.map((m) => (
          <Message key={m.id} message={m} hideTowers={hideTowersInChat} />
        ))}
        {error && <p className="text-xs text-red-400">Agent error: {error.message}</p>}
      </div>

      <form
        className={`flex gap-2 p-3 ${shell ? "border-t border-white/5" : "border-t border-zinc-800"}`}
        onSubmit={(e) => {
          e.preventDefault();
          submit(input || suggested);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={suggested}
          className={
            shell
              ? "flex-1 rounded-full border border-white/10 bg-black/30 px-4 py-2.5 text-sm outline-none focus:border-emerald-500/40"
              : "flex-1 rounded-md bg-zinc-950 px-3 py-2 text-sm ring-1 ring-zinc-700 outline-none focus:ring-emerald-600"
          }
        />
        {busy ? (
          <button
            type="button"
            onClick={() => stop()}
            className={
              shell
                ? "rounded-full bg-white/10 px-4 py-2 text-sm"
                : "rounded-md bg-zinc-700 px-3 py-2 text-sm"
            }
          >
            Stop
          </button>
        ) : (
          <button
            type="submit"
            className={
              shell
                ? "rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-primary-foreground"
                : "rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white"
            }
          >
            Ask
          </button>
        )}
      </form>
    </div>
  );
}

type StreamProgress = {
  percentage: number;
  label: string;
  steps: Array<{ id: string; label: string; done: boolean; active: boolean }>;
};

/** Live checklist from streaming message parts (chat stream realtime — not useRealtimeRun). */
function deriveAgentStreamProgress(
  messages: UIMessage[],
  status: string
): StreamProgress | null {
  const busy = status === "submitted" || status === "streaming";
  if (!busy) return null;

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const parts = (lastAssistant?.parts ?? []) as any[];

  const inv = parts.find(
    (p) =>
      p.type === "tool-investigateEngineer" ||
      p.type === "tool-investigateOperations" ||
      p.type === "tool-investigateFinance"
  );
  const live = parts.find((p) => p.type === "tool-getLivePlantStatus");
  const vizParts = parts.filter((p) => p.type === "tool-renderVisualization");
  const viz = vizParts[vizParts.length - 1];
  const textParts = parts.filter((p) => p.type === "text" && String(p.text || "").trim());
  const stepParts = parts.filter((p) => p.type === "data-investigation-step");
  const towerParts = parts.filter((p) => p.type === "data-plant-tower");
  const auditParts = parts.filter((p) => p.type === "data-turn-audit");
  const latestStep = stepParts[stepParts.length - 1] as
    | { data?: { label?: string; status?: string } }
    | undefined;
  const latestAudit = auditParts[auditParts.length - 1] as
    | {
        data?: {
          status?: string;
          role?: string;
          turn?: number;
          elapsedMs?: number;
          towerDeck?: number;
          toolNames?: string[];
        };
      }
    | undefined;
  const hasTower = towerParts.length > 0;

  const invDone = inv?.state === "output-available";
  const invActive = Boolean(inv) && !invDone;
  const vizSpec =
    viz && viz.state !== "input-streaming" ? normalizeSpec(viz.input?.spec) : null;
  const vizOk = Boolean(vizSpec) && viz?.output?.ok !== false;
  const vizActive = Boolean(viz) && !vizOk;
  const textActive = textParts.length > 0;

  let percentage = 8;
  let label = "Thinking…";
  if (status === "submitted" && !inv && !viz) {
    percentage = 12;
    label = "Thinking…";
  }
  if (latestAudit?.data?.status === "started" && latestAudit.data.role) {
    percentage = 18;
    label = `Turn ${latestAudit.data.turn ?? 0} · ${latestAudit.data.role} tools ready`;
  }
  if (latestStep?.data?.status === "running" && latestStep.data.label) {
    percentage = 30;
    label = latestStep.data.label;
  }
  if (invActive || (live && live.state !== "output-available")) {
    percentage = 35;
    label =
      inv?.type === "tool-investigateOperations"
        ? "Running operations investigation…"
        : inv?.type === "tool-investigateFinance"
          ? "Running finance investigation…"
          : live && live.state !== "output-available"
            ? "Checking live plant status…"
            : "Running engineer investigation…";
  }
  if (invDone && !hasTower && !viz) {
    percentage = 55;
    label = "Investigation complete — preparing tower…";
  }
  if (hasTower) {
    percentage = 78;
    label = "Plant tower ready";
  }
  if (vizActive) {
    percentage = viz?.output?.ok === false ? 72 : 68;
    label = viz?.output?.ok === false ? "Refining visualization…" : "Building visualization…";
  }
  if (vizOk) {
    percentage = Math.max(percentage, 88);
    label = "Visualization ready";
  }
  if (textActive) {
    percentage = Math.max(percentage, 94);
    label = "Writing takeaway…";
  }
  if (latestAudit?.data?.status === "complete") {
    percentage = Math.max(percentage, 96);
    const a = latestAudit.data;
    label = `Turn ${a.turn ?? 0} · ${a.role ?? "?"} · deck ${a.towerDeck ?? "—"} · ${a.elapsedMs ?? "?"}ms`;
  }

  const steps = [
    {
      id: "think",
      label: "Think",
      done: Boolean(inv || viz || textActive || stepParts.length),
      active: status === "submitted" && !inv && !viz && !stepParts.length,
    },
    {
      id: "investigate",
      label: "Investigate",
      done: invDone || Boolean(live && live.state === "output-available") || hasTower,
      active: invActive || (Boolean(live) && live.state !== "output-available") || latestStep?.data?.status === "running",
    },
    {
      id: "viz",
      label: "Tower",
      done: hasTower || vizOk,
      active: (!hasTower && invDone) || vizActive,
    },
    {
      id: "answer",
      label: "Answer",
      done: false,
      active: textActive && (hasTower || vizOk),
    },
  ];

  return { percentage, label, steps };
}

function AgentStreamProgress({
  progress,
  shell,
}: {
  progress: StreamProgress;
  shell?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(progress.percentage)));
  return (
    <div
      className={
        shell
          ? "border-b border-white/5 bg-black/20 px-4 py-2"
          : "border-b border-zinc-800 bg-zinc-950/60 px-3 py-2"
      }
    >
      <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
        <span className={shell ? "text-foreground/90" : "text-zinc-300"}>{progress.label}</span>
        <span className="tabular-nums text-muted-foreground">{pct}%</span>
      </div>
      <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
        {progress.steps.map((s) => (
          <span
            key={s.id}
            className={
              s.done ? "text-emerald-400" : s.active ? "text-foreground/80" : "text-muted-foreground/50"
            }
          >
            {s.done ? "✓ " : s.active ? "● " : "○ "}
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function Message({ message, hideTowers }: { message: UIMessage; hideTowers?: boolean }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl bg-emerald-600/90 px-3 py-2 text-sm text-primary-foreground">
          {message.parts.map((part, i) => (part.type === "text" ? <span key={i}>{part.text}</span> : null))}
        </div>
      </div>
    );
  }

  let lastVizIndex = -1;
  let lastTowerIndex = -1;
  message.parts.forEach((p, i) => {
    if (p.type === "tool-renderVisualization") lastVizIndex = i;
    if (p.type === "data-plant-tower") lastTowerIndex = i;
  });

  return (
    <div className="space-y-1 text-sm text-foreground/90">
      {message.parts.map((part, i) => {
        if (part.type === "tool-renderVisualization" && i !== lastVizIndex) return null;
        if (part.type === "data-plant-tower") {
          if (hideTowers || i !== lastTowerIndex) return null;
        }
        if (part.type === "data-investigation-step") return null;
        const key = (part as any).toolCallId ?? `${part.type}-${i}`;
        return <MessagePart key={key} part={part} />;
      })}
    </div>
  );
}

function MessagePart({ part }: { part: UIMessage["parts"][number] }) {
  if (part.type === "text") {
    return (
      <div className="prose-sm max-w-none text-zinc-300">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.text}</ReactMarkdown>
      </div>
    );
  }

  if (part.type === "data-plant-tower") {
    const tower = (part as { data?: PlantTowerPayload }).data;
    if (!tower?.cards?.length) return null;
    return <PlantTowerGrid tower={tower} />;
  }

  if (part.type === "tool-renderVisualization") {
    const p = part as any;
    const input = p.input as { spec?: unknown } | undefined;
    const output = p.output as { ok?: boolean } | undefined;
    const spec = p.state === "input-streaming" ? null : normalizeSpec(input?.spec);
    // Progress bar owns the "building" label — avoid a second spinner row here.
    if (!spec) return null;
    if (output && output.ok === false) return null;
    return <Visualization spec={spec} />;
  }

  if (part.type === "tool-investigateEngineer") {
    return <ToolStatus label="Engineer investigation" spinning={(part as any).state !== "output-available"} />;
  }
  if (part.type === "tool-investigateOperations") {
    return <ToolStatus label="Operations investigation" spinning={(part as any).state !== "output-available"} />;
  }
  if (part.type === "tool-investigateFinance") {
    return <ToolStatus label="Finance investigation" spinning={(part as any).state !== "output-available"} />;
  }
  if (part.type === "tool-getLivePlantStatus") {
    return <ToolStatus label="Live plant status" spinning={(part as any).state !== "output-available"} />;
  }
  if (part.type === "tool-advanceReplay") {
    return <ToolStatus label="Advancing replay" spinning={(part as any).state !== "output-available"} />;
  }

  return null;
}

function ToolStatus({ label, spinning }: { label: string; spinning?: boolean }) {
  return (
    <div className="my-1 flex items-center gap-1.5 text-xs text-zinc-500">
      {spinning ? <Loader2 className="size-3 animate-spin" /> : <span>✓</span>}
      {label}
    </div>
  );
}

export function RoleVisual({ role, data }: { role: Role; data: any }) {
  if (!data) return null;
  if (role === "engineer") {
    return (
      <section className="grid gap-4 md:grid-cols-3">
        <Card title="Generator / turbine power" value={`${Number(data.productionMW).toFixed(2)} MW`} />
        <Card title="Turbine speed" value={`${Number(data.turbineSpeed).toFixed(1)} rpm`} />
        <Card title="Boiler pressure" value={`${Number(data.boilerPressure).toFixed(3)}`} />
        <div className="md:col-span-2 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
          <h3 className="mb-2 text-sm font-medium text-zinc-300">P4_ST_PO trend (ClickHouse)</h3>
          <SparkTrend data={data.trends?.P4_ST_PO || []} unit="MW" />
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
          <h3 className="mb-2 text-sm font-medium text-zinc-300">Closest to limits</h3>
          <ul className="space-y-1 text-sm">
            {(data.attention || []).map((a: any) => (
              <li key={a.tag} className={a.outside ? "text-amber-300" : "text-zinc-400"}>
                {a.label}: {Number(a.value).toFixed(2)} {a.unit}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-zinc-500">
            Query {data.elapsedMs} ms · {data.dataSource}
          </p>
        </div>
      </section>
    );
  }
  if (role === "operations") {
    return (
      <section className="grid gap-4 md:grid-cols-3">
        <Card title="Current rate" value={`${Number(data.currentRateMW).toFixed(2)} MW`} />
        <Card title="Shift vs target" value={`${Number(data.percentOfTarget).toFixed(1)}%`} />
        <Card title="Capacity util." value={`${Number(data.capacityUtilizationPct).toFixed(1)}%`} />
        <div className="md:col-span-2 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
          <h3 className="mb-2 text-sm font-medium text-zinc-300">Shift MWh vs target (synthetic clock)</h3>
          <TargetBars
            current={Number(data.shiftProductionMWh)}
            target={Number(data.shiftTargetMWh)}
            projected={Number(data.projectedShiftMWh)}
          />
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-sm">
          <p>
            Bottleneck: <span className="text-amber-300">{data.bottleneckArea}</span>
          </p>
          <p className="mt-2 text-xs text-zinc-500">{data.bottleneckRule}</p>
          <p className="mt-2 text-xs text-zinc-500">Hours into shift (demo clock): {Number(data.hoursElapsed).toFixed(2)}</p>
        </div>
      </section>
    );
  }
  return (
    <section className="grid gap-4 md:grid-cols-3">
      <Card title="Production value" value={`$${Number(data.productionValueUSD).toFixed(0)}`} />
      <Card title="Operating cost" value={`$${Number(data.operatingCostUSD).toFixed(0)}`} />
      <Card title="Margin" value={`$${Number(data.marginUSD).toFixed(0)}`} />
      <div className="md:col-span-2 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
        <h3 className="mb-2 text-sm font-medium text-zinc-300">Finance stack (synthetic rates)</h3>
        <FinanceBars
          value={Number(data.productionValueUSD)}
          cost={Number(data.operatingCostUSD)}
          margin={Number(data.marginUSD)}
          planned={Number(data.plannedRevenue)}
        />
      </div>
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-sm">
        <p>Cost / MWh: ${Number(data.costPerMWh).toFixed(2)}</p>
        <p className="mt-1">Δ vs plan (prorated): ${Number(data.varianceVsPlanUSD).toFixed(0)}</p>
        <p className="mt-2 text-xs text-amber-200/80">{data.disclaimer}</p>
      </div>
    </section>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="card-surface p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
