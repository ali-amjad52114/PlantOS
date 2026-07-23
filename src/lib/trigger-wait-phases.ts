/** Ask-path Trigger wait phases — lessons/PLAN_TRIGGER_WAIT_STATE.md */

export type TriggerWaitPhaseId =
  | "session"
  | "worker"
  | "boot"
  | "model"
  | "tool"
  | "turnWrite"
  | "binding";

export type TriggerWaitPhase = {
  id: TriggerWaitPhaseId;
  headline: string;
  primitive: string;
};

export type TriggerWaitReceipt = {
  turn?: number;
  role?: string;
  toolNames: string[];
  elapsedMs: number;
  chatId?: string;
  detailLines: string[];
};

export type TriggerWaitView = {
  mode: "active" | "receipt";
  active: TriggerWaitPhase | null;
  /** All completed phases in order (never drop older ones). */
  done: TriggerWaitPhase[];
  /** 0–100 ambient bar. */
  percentage: number;
  elapsedMs: number;
  receipt: TriggerWaitReceipt | null;
};

export type TriggerWaitSignals = {
  /** AI SDK / useChat status */
  chatStatus: string;
  /** Latest assistant message parts (tool-*, data-*, text). */
  parts: ReadonlyArray<{ type?: string; state?: string; data?: Record<string, unknown> }>;
  /** App is binding CH cards after Trigger idle. */
  binding?: boolean;
  /** Wall clock for elapsed (ms since ask). */
  elapsedMs?: number;
  chatId?: string;
};

const LADDER: TriggerWaitPhase[] = [
  {
    id: "session",
    headline: "Opening a durable session",
    primitive: "chat.createStartSessionAction · realtime token",
  },
  {
    id: "worker",
    headline: "Worker picking up the turn",
    primitive: "chat status submitted → streaming",
  },
  {
    id: "boot",
    headline: "Booting the agent",
    primitive: "onChatStart · role-scoped tools",
  },
  {
    id: "model",
    headline: "Running the model",
    primitive: "streamText · toStreamTextOptions",
  },
  {
    id: "tool",
    headline: "Executing a durable tool",
    primitive: "tool · worker-side",
  },
  {
    id: "turnWrite",
    headline: "Writing the turn",
    primitive: "onTurnComplete · turn audit",
  },
  {
    id: "binding",
    headline: "Binding live cards",
    primitive: "post-run ClickHouse bind",
  },
];

function toolNameFromType(type: string) {
  return type.startsWith("tool-") ? type.slice("tool-".length) : type;
}

function inspectParts(parts: TriggerWaitSignals["parts"]) {
  let auditStarted: { turn?: number; role?: string; toolNames?: string[] } | null = null;
  let auditComplete: {
    turn?: number;
    role?: string;
    toolNames?: string[];
    elapsedMs?: number;
    towerDeck?: number;
  } | null = null;
  const toolNames = new Set<string>();
  let activeTool: string | null = null;
  let completedTool = false;
  let latestStepLabel: string | null = null;

  for (const part of parts) {
    const type = part.type ?? "";
    if (type === "data-turn-audit" && part.data) {
      const d = part.data as {
        status?: string;
        turn?: number;
        role?: string;
        toolNames?: string[];
        elapsedMs?: number;
        towerDeck?: number;
      };
      if (d.status === "started") {
        auditStarted = {
          turn: d.turn,
          role: d.role,
          toolNames: d.toolNames,
        };
      }
      if (d.status === "complete") {
        auditComplete = {
          turn: d.turn,
          role: d.role,
          toolNames: d.toolNames,
          elapsedMs: d.elapsedMs,
          towerDeck: d.towerDeck,
        };
      }
    }
    if (type === "data-investigation-step" && part.data) {
      const d = part.data as { label?: string; status?: string };
      if (d.label) latestStepLabel = d.label;
    }
    if (type.startsWith("tool-")) {
      const name = toolNameFromType(type);
      toolNames.add(name);
      if (part.state === "output-available") completedTool = true;
      else if (part.state && part.state !== "output-available") activeTool = name;
      else if (!part.state) activeTool = activeTool ?? name;
    }
  }

  return {
    auditStarted,
    auditComplete,
    toolNames: [...toolNames],
    activeTool,
    completedTool,
    latestStepLabel,
  };
}

function phaseById(id: TriggerWaitPhaseId, toolName?: string | null): TriggerWaitPhase {
  const base = LADDER.find((p) => p.id === id)!;
  if (id === "tool" && toolName) {
    const friendly =
      toolName === "investigateParallel"
        ? "Fan-out engineer + ops + finance"
        : toolName === "consultEngineer"
          ? "Consulting engineer specialist"
          : toolName === "selectVisuals"
            ? "Selecting catalog visuals"
            : toolName;
    return {
      ...base,
      headline: `Executing ${friendly}`,
      primitive: `tool:${toolName} · worker-side`,
    };
  }
  if (id === "boot") {
    return base;
  }
  return base;
}

/**
 * Map Ask chat signals → ambient wait view (1 active + full done trail, or receipt).
 */
export function deriveTriggerWaitView(signals: TriggerWaitSignals): TriggerWaitView {
  const elapsedMs = Math.max(0, signals.elapsedMs ?? 0);
  const status = signals.chatStatus || "ready";
  const busy = status === "submitted" || status === "streaming";
  const { auditStarted, auditComplete, toolNames, activeTool, completedTool, latestStepLabel } =
    inspectParts(signals.parts);
  const binding = Boolean(signals.binding);

  const reached: TriggerWaitPhaseId[] = ["session"];
  if (busy || status === "submitted" || auditStarted || auditComplete || binding) {
    reached.push("worker");
  }
  if (auditStarted || auditComplete || activeTool || completedTool || binding) {
    reached.push("boot");
  }
  if (
    status === "streaming" ||
    activeTool ||
    completedTool ||
    auditComplete ||
    binding
  ) {
    reached.push("model");
  }
  if (activeTool || completedTool || (auditComplete && toolNames.length > 0) || binding) {
    reached.push("tool");
  }
  if (auditComplete || binding) {
    reached.push("turnWrite");
  }
  if (binding) {
    reached.push("binding");
  }

  // Receipt when Trigger is idle and we finished a turn, and we're not mid-bind.
  // Binding stays on "active" ladder until CH bind clears.
  if (!busy && auditComplete && !binding) {
    const detailLines = [
      "chat.createStartSessionAction · realtime token",
      "chat status submitted → streaming",
      "onChatStart · role-scoped tools",
      "streamText · toStreamTextOptions",
      ...(toolNames.length
        ? toolNames.map((n) => `tool:${n} · worker-side`)
        : ["tool · worker-side"]),
      "onTurnComplete · turn audit",
      ...(signals.chatId ? [`session ${signals.chatId}`] : []),
      auditComplete.role ? `role:${auditComplete.role}` : "",
      typeof auditComplete.turn === "number" ? `turn ${auditComplete.turn}` : "",
    ].filter(Boolean);

    const toolForCopy = activeTool || toolNames[toolNames.length - 1] || null;
    const allDone = reached.map((id) => phaseById(id, toolForCopy));

    return {
      mode: "receipt",
      active: null,
      done: allDone,
      percentage: 100,
      elapsedMs: auditComplete.elapsedMs ?? elapsedMs,
      receipt: {
        turn: auditComplete.turn,
        role: auditComplete.role,
        toolNames: auditComplete.toolNames?.length ? auditComplete.toolNames : toolNames,
        elapsedMs: auditComplete.elapsedMs ?? elapsedMs,
        chatId: signals.chatId,
        detailLines,
      },
    };
  }

  const toolForCopy = activeTool || toolNames[toolNames.length - 1] || null;

  const activeId = reached[reached.length - 1]!;
  const active = phaseById(activeId, toolForCopy);
  // Keep every completed phase visible — timings are attached in the UI layer.
  const done = reached.slice(0, -1).map((id) => phaseById(id, toolForCopy));

  const index = LADDER.findIndex((p) => p.id === activeId);
  const percentage = Math.min(96, Math.round(((index + 1) / LADDER.length) * 100));

  // Enrich boot primitive with tool list when audit started
  let activeOut = active;
  if (activeId === "boot" && auditStarted?.toolNames?.length) {
    activeOut = {
      ...active,
      primitive: `onChatStart · tools: ${auditStarted.toolNames.join(", ")}`,
    };
  }
  if (activeId === "model" && auditStarted?.role) {
    activeOut = {
      ...active,
      primitive: `streamText · toStreamTextOptions · role:${auditStarted.role}`,
    };
  }
  if (activeId === "tool" && latestStepLabel) {
    activeOut = {
      ...activeOut,
      headline: latestStepLabel,
      primitive: toolForCopy ? `tool:${toolForCopy} · ${latestStepLabel}` : activeOut.primitive,
    };
  }

  return {
    mode: "active",
    active: activeOut,
    done,
    percentage: binding ? Math.max(percentage, 92) : percentage,
    elapsedMs,
    receipt: null,
  };
}

export function initialTriggerWaitView(elapsedMs = 0): TriggerWaitView {
  return {
    mode: "active",
    active: phaseById("session"),
    done: [],
    percentage: Math.round((1 / LADDER.length) * 100),
    elapsedMs,
    receipt: null,
  };
}
