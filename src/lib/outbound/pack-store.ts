/**
 * Persist outbound pack JSON next to chart images for an intent.
 * Shared by Next + Trigger local worker. Failures must stay local to outbound.
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import type { OutboundPack } from "./pack";

const root = () => join(process.cwd(), "data", "outbound", "images");

export function saveIntentPack(intentId: string, pack: OutboundPack): void {
  const dir = join(root(), intentId);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "pack.json"), JSON.stringify(pack, null, 2), "utf8");
}

export function loadIntentPack(intentId: string): OutboundPack | null {
  const path = join(root(), intentId, "pack.json");
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as OutboundPack;
  } catch {
    return null;
  }
}
