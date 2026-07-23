/**
 * Answer before canvas — lessons/PLAN_ANSWER_BEFORE_CANVAS.md
 *
 * Fixture (?e2eAnswerGate=1):
 * 1. "E2E idle w/o answer" → Trigger idle queued, no assistant text → canvas pins stay 0
 * 2. "E2E inject answer" → blurb visible + gate opens → exactly 2 first-ask pins land
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";

const OUT = resolve("data/browser-e2e");
mkdirSync(OUT, { recursive: true });

const EXPECTED = ["HydroUnit", "HydroEnergyBars"];

const result = {
  ok: false,
  steps: {},
  error: null,
  screenshots: [],
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
page.setDefaultTimeout(60000);

try {
  await page.goto("http://localhost:3001/?e2eAnswerGate=1", {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("button", { name: /^Engineer$/i }).click();
  await page.waitForTimeout(1200);

  await page.getByTestId("e2e-answer-gate-controls").waitFor({ state: "visible" });

  await page.getByTestId("e2e-answer-gate-prepare").click();
  await page.waitForTimeout(1200);

  let pins = page.getByTestId("canvas-pin");
  let count = await pins.count();
  result.steps.pinsAfterIdleWithoutAnswer = count;
  if (count !== 0) {
    throw new Error(`Expected 0 canvas pins before answer, got ${count}`);
  }
  result.steps.noPinsBeforeAnswer = true;

  await page.screenshot({ path: resolve(OUT, "answer-gate-01-waiting.png") });
  result.screenshots.push("answer-gate-01-waiting.png");

  await page.getByTestId("e2e-answer-gate-answer").click();
  await page.waitForTimeout(2000);

  await page.getByTestId("e2e-answer-gate-blurb").waitFor({ state: "visible" });
  result.steps.blurbVisible = true;

  count = await pins.count();
  result.steps.pinsAfterAnswer = count;
  if (count !== 2) {
    throw new Error(`Expected 2 canvas pins after answer, got ${count}`);
  }

  const types = await pins.evaluateAll((els) =>
    els.map((el) => el.getAttribute("data-card-type"))
  );
  result.steps.canvasCardTypes = types;
  for (const t of EXPECTED) {
    if (!types.includes(t)) {
      throw new Error(`Expected ${t} on canvas, got ${types.join(",")}`);
    }
  }

  await page.screenshot({ path: resolve(OUT, "answer-gate-02-landed.png") });
  result.screenshots.push("answer-gate-02-landed.png");

  result.ok = true;
} catch (e) {
  result.error = String(e?.message || e);
  await page
    .screenshot({ path: resolve(OUT, "answer-gate-FAIL.png"), fullPage: true })
    .catch(() => {});
  result.screenshots.push("answer-gate-FAIL.png");
} finally {
  writeFileSync(resolve(OUT, "answer-before-canvas-result.json"), JSON.stringify(result, null, 2));
  await browser.close();
}

console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
