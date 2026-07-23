/**
 * Persist chart PNGs + captions for an intent (shared by Next + Trigger.dev local worker).
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import type { ChartCaption } from "./caption";

export type StoredChartImage = {
  filename: string;
  contentType: "image/png";
  path: string;
  caption: ChartCaption;
};

const root = () => join(process.cwd(), "data", "outbound", "images");

export function saveIntentImages(
  intentId: string,
  images: Array<{
    filename: string;
    base64: string;
    contentType?: string;
    caption?: ChartCaption;
  }>
): StoredChartImage[] {
  const dir = join(root(), intentId);
  mkdirSync(dir, { recursive: true });
  const stored: StoredChartImage[] = [];
  const captions: Record<string, ChartCaption> = {};

  for (const img of images.slice(0, 4)) {
    const safe =
      img.filename.replace(/[^a-zA-Z0-9._-]/g, "_") || `chart-${stored.length + 1}.png`;
    const path = join(dir, safe);
    writeFileSync(path, Buffer.from(img.base64, "base64"));
    const caption: ChartCaption = {
      title: (img.caption?.title || safe.replace(/\.png$/i, "")).slice(0, 80),
      line1: (img.caption?.line1 || `${safe.replace(/\.png$/i, "")} chart from PlantOS.`).slice(0, 180),
      line2: (img.caption?.line2 || "See the chart below for the latest trend.").slice(0, 180),
    };
    captions[safe] = caption;
    stored.push({ filename: safe, contentType: "image/png", path, caption });
  }

  writeFileSync(join(dir, "captions.json"), JSON.stringify(captions, null, 2), "utf8");
  return stored;
}

export function loadIntentImages(intentId: string): Array<{
  filename: string;
  contentType: "image/png";
  buffer: Buffer;
  caption: ChartCaption;
}> {
  const dir = join(root(), intentId);
  if (!existsSync(dir)) return [];

  let captions: Record<string, ChartCaption> = {};
  try {
    const raw = readFileSync(join(dir, "captions.json"), "utf8");
    captions = JSON.parse(raw) as Record<string, ChartCaption>;
  } catch {
    captions = {};
  }

  const files = readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".png"))
    .sort();

  return files.map((filename, i) => ({
    filename,
    contentType: "image/png" as const,
    buffer: readFileSync(join(dir, filename)),
    caption: captions[filename] || {
      title: filename.replace(/\.png$/i, ""),
      line1: `Chart ${i + 1} from PlantOS.`,
      line2: "See the chart below for the latest trend.",
    },
  }));
}
