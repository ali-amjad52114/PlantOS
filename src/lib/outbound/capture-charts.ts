"use client";

import { toPng } from "html-to-image";
import type { ChartCaption } from "@/lib/outbound/caption";

export type CapturedChartImage = {
  filename: string;
  /** raw base64 without data: URL prefix */
  base64: string;
  contentType: "image/png";
  caption: ChartCaption;
};

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

/**
 * Snapshot up to `limit` canvas chart nodes for Slack upload.
 * Fail-soft: returns whatever captured successfully within the time budget.
 */
export async function captureCanvasChartImages(limit = 4): Promise<CapturedChartImage[]> {
  if (typeof document === "undefined") return [];
  const nodes = [
    ...document.querySelectorAll<HTMLElement>("[data-outbound-capture='chart']"),
  ].slice(0, limit);

  const out: CapturedChartImage[] = [];
  const started = Date.now();
  const overallBudgetMs = 18_000;
  const perChartMs = 6_000;

  for (let i = 0; i < nodes.length; i++) {
    if (Date.now() - started > overallBudgetMs) break;
    const node = nodes[i];
    const caption: ChartCaption = {
      line1: (node.getAttribute("data-outbound-line1") || `Chart ${i + 1} from PlantOS.`).slice(0, 180),
      line2: (node.getAttribute("data-outbound-line2") || "See the chart below for the latest trend.").slice(
        0,
        180
      ),
      title: (node.getAttribute("data-outbound-title") || `Chart ${i + 1}`).slice(0, 80),
    };
    try {
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const dataUrl = await withTimeout(
        toPng(node, {
          cacheBust: true,
          pixelRatio: 1.5,
          backgroundColor: "#ffffff",
          skipFonts: true,
          filter: (el) => {
            if (!(el instanceof HTMLElement)) return true;
            const testId = el.getAttribute("data-testid");
            if (testId === "canvas-pin-drag") return false;
            return true;
          },
        }),
        perChartMs,
        `chart-${i + 1}`
      );
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
      if (base64.length < 80) continue;
      out.push({
        filename: `plantos-chart-${i + 1}.png`,
        base64,
        contentType: "image/png",
        caption,
      });
    } catch {
      /* skip failed / timed-out node */
    }
  }
  return out;
}
