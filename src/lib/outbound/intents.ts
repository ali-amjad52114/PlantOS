/**
 * Lightweight intent ledger for outbound side effects.
 * File-backed so Next restarts don't lose single-flight state in local/dev.
 * Failures here must never affect plant chat or ClickHouse plant reads.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";

export type OutboundIntentStatus =
  | "drafted"
  | "approved"
  | "executing"
  | "succeeded"
  | "failed"
  | "uncertain"
  | "cancelled"
  | "reverted";

export type OutboundIntent = {
  intentId: string;
  connector: "slack";
  actionKey: "slack.send_message" | "slack.undo_message";
  status: OutboundIntentStatus;
  title: string;
  body: string;
  channelId: string;
  channelLabel: string;
  accountId?: string;
  runId?: string;
  receipt?: {
    messageTs?: string;
    channel?: string;
    rawSummary?: string;
    fileIds?: string[];
  };
  /** Number of chart PNGs saved under data/outbound/images/{intentId} */
  imageCount?: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

const DIR = join(process.cwd(), "data", "outbound");
const FILE = join(DIR, "intents.json");

function loadAll(): Record<string, OutboundIntent> {
  try {
    if (!existsSync(FILE)) return {};
    return JSON.parse(readFileSync(FILE, "utf8")) as Record<string, OutboundIntent>;
  } catch {
    return {};
  }
}

function saveAll(map: Record<string, OutboundIntent>) {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(FILE, JSON.stringify(map, null, 2), "utf8");
}

export function createIntent(input: {
  title: string;
  body: string;
  channelId: string;
  channelLabel: string;
}): OutboundIntent {
  const now = new Date().toISOString();
  const intent: OutboundIntent = {
    intentId: randomUUID(),
    connector: "slack",
    actionKey: "slack.send_message",
    status: "drafted",
    title: input.title,
    body: input.body,
    channelId: input.channelId,
    channelLabel: input.channelLabel,
    createdAt: now,
    updatedAt: now,
  };
  const all = loadAll();
  all[intent.intentId] = intent;
  saveAll(all);
  return intent;
}

export function getIntent(intentId: string): OutboundIntent | null {
  return loadAll()[intentId] ?? null;
}

export function updateIntent(
  intentId: string,
  patch: Partial<OutboundIntent>
): OutboundIntent | null {
  const all = loadAll();
  const cur = all[intentId];
  if (!cur) return null;
  const next = {
    ...cur,
    ...patch,
    intentId: cur.intentId,
    updatedAt: new Date().toISOString(),
  };
  all[intentId] = next;
  saveAll(all);
  return next;
}

/** Reserve for execution — returns false if already terminal/executing success path. */
export function reserveIntent(intentId: string, accountId: string, runId?: string): OutboundIntent | null {
  const cur = getIntent(intentId);
  if (!cur) return null;
  if (cur.status === "succeeded" || cur.status === "reverted") return cur;
  if (cur.status === "executing" && cur.runId && runId && cur.runId !== runId) {
    return cur;
  }
  return updateIntent(intentId, {
    status: "executing",
    accountId,
    runId: runId ?? cur.runId,
  });
}
