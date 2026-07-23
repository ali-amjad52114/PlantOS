import { schedules, logger, metadata } from "@trigger.dev/sdk";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { engineerSnapshot } from "../lib/plant-services";
import { flagOn, sendPlainSlackMessage } from "../lib/outbound/plain-slack";

const STATE_DIR = join(process.cwd(), "data", "outbound");
const STATE_FILE = join(STATE_DIR, "alert-fingerprints.json");

type FingerprintMap = Record<string, string>; // fingerprint -> firstSeen ISO

function loadFingerprints(): FingerprintMap {
  try {
    if (!existsSync(STATE_FILE)) return {};
    return JSON.parse(readFileSync(STATE_FILE, "utf8")) as FingerprintMap;
  } catch {
    return {};
  }
}

function saveFingerprints(map: FingerprintMap) {
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(map, null, 2), "utf8");
}

/**
 * Watch tags vs normal bands; Slack once per new breach fingerprint.
 * Off unless PLANT_ALERTS_ENABLED=true (also needs outbound enabled).
 */
export const plantAlertWatch = schedules.task({
  id: "plant-alert-watch",
  // Every 5 minutes
  cron: "*/5 * * * *",
  maxDuration: 120,
  run: async () => {
    if (!flagOn(process.env.PLANT_ALERTS_ENABLED)) {
      metadata.set("status", "disabled").set("reason", "PLANT_ALERTS_ENABLED off");
      logger.info("plant-alert-watch skipped — flag off");
      return { ok: true as const, skipped: true as const, reason: "flag_off" };
    }

    metadata.set("status", "scanning");
    const snap = await engineerSnapshot();
    const outside = (snap.attention || []).filter((a: { outside?: boolean }) => a.outside);

    const prev = loadFingerprints();
    const active = new Set<string>();
    const novel: Array<{ tag: string; label: string; value: number; unit: string }> = [];

    for (const a of outside) {
      const side =
        a.value < a.normalMin ? "low" : a.value > a.normalMax ? "high" : "out";
      const fp = `${a.tag}:${side}`;
      active.add(fp);
      if (!prev[fp]) {
        novel.push({
          tag: a.tag,
          label: a.label,
          value: a.value,
          unit: a.unit,
        });
        prev[fp] = new Date().toISOString();
      }
    }

    // Drop fingerprints that cleared (so a re-breach alerts again later)
    for (const key of Object.keys(prev)) {
      if (!active.has(key)) delete prev[key];
    }
    saveFingerprints(prev);

    metadata
      .set("outsideCount", outside.length)
      .set("novelCount", novel.length)
      .set("fingerprints", Object.keys(prev).length);

    if (novel.length === 0) {
      metadata.set("status", "ok_no_new");
      logger.info("plant-alert-watch: no new breaches", { outside: outside.length });
      return { ok: true as const, skipped: true as const, reason: "no_new_breach", outside: outside.length };
    }

    const lines = novel.map(
      (n) => `• ${n.label || n.tag}: ${Number(n.value).toFixed(2)} ${n.unit || ""}`.trim()
    );
    const body = [
      `PlantOS alert — ${novel.length} new band breach${novel.length === 1 ? "" : "es"}:`,
      ...lines,
      "",
      `(Demo HAI feed · ${outside.length} currently outside band)`,
    ].join("\n");

    const sent = await sendPlainSlackMessage({
      title: `PlantOS alert · ${novel.length} new`,
      body,
    });

    if (!sent.ok) {
      metadata.set("status", "send_failed").set("error", sent.error);
      logger.warn("plant-alert-watch send failed", sent);
      return { ok: false as const, error: sent.error, novel };
    }

    metadata.set("status", "sent").set("intentId", sent.intentId).set("runId", sent.runId);
    logger.info("plant-alert-watch sent", { intentId: sent.intentId, novel: novel.length });
    return { ok: true as const, intentId: sent.intentId, novel };
  },
});
