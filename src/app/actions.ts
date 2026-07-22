"use server";

import { auth, tasks } from "@trigger.dev/sdk";
import { chat } from "@trigger.dev/sdk/ai";
import type { plantInvestigate } from "@/trigger/plant-investigate";
import type { plantParallelInvestigate } from "@/trigger/plant-parallel-investigate";
import type { plantRouteInvestigate } from "@/trigger/plant-route-investigate";
import type { plantReplayBurst } from "@/trigger/plant-replay";

export const startChatSession = chat.createStartSessionAction("plantos-agent");

export async function mintChatAccessToken(chatId: string) {
  return auth.createPublicToken({
    scopes: {
      read: { sessions: chatId },
      write: { sessions: chatId },
    },
    expirationTime: "1h",
  });
}

async function mintRunToken(runId: string) {
  const publicAccessToken = await auth.createPublicToken({
    scopes: {
      read: {
        runs: [runId],
      },
    },
    expirationTime: "1h",
  });
  return { runId, publicAccessToken };
}

/** Trigger plant-investigate from the server; return Realtime subscribe credentials. */
export async function triggerPlantInvestigate(payload: {
  role: "engineer" | "operations" | "finance";
  question?: string;
}) {
  const handle = await tasks.trigger<typeof plantInvestigate>("plant-investigate", payload);
  return mintRunToken(handle.id);
}

/** Track C routing: classify question → role specialist. */
export async function triggerPlantRouteInvestigate(payload: { question: string }) {
  const handle = await tasks.trigger<typeof plantRouteInvestigate>(
    "plant-route-investigate",
    payload
  );
  return mintRunToken(handle.id);
}

/** Track C parallel: fan-out all three roles via batchTriggerAndWait parent. */
export async function triggerPlantParallelInvestigate(payload?: { question?: string }) {
  const handle = await tasks.trigger<typeof plantParallelInvestigate>(
    "plant-parallel-investigate",
    payload ?? {}
  );
  return mintRunToken(handle.id);
}

/** Phase 3: denser on-demand replay burst + Realtime subscribe credentials. */
export async function triggerPlantReplayBurst(payload?: { reason?: string }) {
  const handle = await tasks.trigger<typeof plantReplayBurst>("plant-replay-burst", {
    reason: payload?.reason ?? "ui-start",
  });
  return mintRunToken(handle.id);
}
