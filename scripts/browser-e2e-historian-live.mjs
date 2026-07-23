/**
 * Historian live play — rolling window for selected range
 * lessons/PLAN_HISTORIAN_LIVE.md
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";

const OUT = resolve("data/browser-e2e");
mkdirSync(OUT, { recursive: true });

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
  await page.goto("http://localhost:3001/?e2eCanvas=1", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /^Engineer$/i }).click();
  await page.waitForTimeout(1500);

  await page.getByTestId("canvas-fixture-source").waitFor({ state: "visible" });

  const genCard = page.locator('[data-lovable-card="GeneratorOutput"]').first();
  await genCard.waitFor({ state: "visible" });

  const play = genCard.getByTestId("historian-live");
  await play.waitFor({ state: "visible" });

  const liveOff = await play.getAttribute("data-live");
  result.steps.defaultLive = liveOff;
  if (liveOff !== "0") throw new Error(`Expected live off by default, got ${liveOff}`);

  await genCard.getByTestId("historian-range-1h").click();
  await page.waitForTimeout(1000);

  const range = genCard.getByTestId("historian-range");
  if ((await range.getAttribute("data-range")) !== "1h") {
    throw new Error("Expected range 1h after click");
  }

  // Wait for window attrs from series fetch
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-lovable-card="GeneratorOutput"]');
    return el?.getAttribute("data-window-minutes") === "60";
  });

  const minutes = await genCard.getAttribute("data-window-minutes");
  const startMs = Number(await genCard.getAttribute("data-window-start-ms"));
  const endMs = Number(await genCard.getAttribute("data-window-end-ms"));
  const spanMin = (endMs - startMs) / 60_000;
  result.steps.windowMinutes = minutes;
  result.steps.windowSpanMinutes = spanMin;
  if (minutes !== "60") throw new Error(`Expected data-window-minutes=60, got ${minutes}`);
  if (Math.abs(spanMin - 60) > 0.05) {
    throw new Error(`Expected ~60m axis domain, got ${spanMin}`);
  }

  // API must advertise full window even if dataSpan is shorter
  const api = await page.evaluate(async () => {
    const r = await fetch("/api/plant/card-series?type=GeneratorOutput&range=1h&live=0");
    return r.json();
  });
  result.steps.apiMinutes = api.minutes;
  result.steps.apiDataSpanMinutes = api.dataSpanMinutes;
  result.steps.apiWindowSpan =
    typeof api.windowEndMs === "number" && typeof api.windowStartMs === "number"
      ? (api.windowEndMs - api.windowStartMs) / 60_000
      : null;
  if (api.minutes !== 60) throw new Error(`API minutes expected 60, got ${api.minutes}`);
  if (Math.abs(result.steps.apiWindowSpan - 60) > 0.05) {
    throw new Error(`API window span expected 60, got ${result.steps.apiWindowSpan}`);
  }

  await play.click();
  await page.waitForTimeout(500);
  if ((await play.getAttribute("data-live")) !== "1") {
    throw new Error("Expected live on after play");
  }
  if ((await genCard.getAttribute("data-historian-live")) !== "1") {
    throw new Error("Expected data-historian-live=1");
  }
  const labelLive = await genCard.getByTestId("historian-range-label").innerText();
  result.steps.labelLive = labelLive;
  if (!/Live/i.test(labelLive) || !/1 hour/i.test(labelLive)) {
    throw new Error(`Expected Live · Last 1 hour label, got ${labelLive}`);
  }

  // Range must survive live toggle
  if ((await range.getAttribute("data-range")) !== "1h") {
    throw new Error("Live toggle must not wipe selected range");
  }

  // Switch to 12h while live — rolling window length follows selection
  await genCard.getByTestId("historian-range-12h").click();
  await page.waitForTimeout(1000);
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-lovable-card="GeneratorOutput"]');
    return (
      el?.getAttribute("data-window-minutes") === "720" &&
      el?.getAttribute("data-historian-live") === "1"
    );
  });
  result.steps.live12hMinutes = await genCard.getAttribute("data-window-minutes");

  await play.click();
  await page.waitForTimeout(400);
  if ((await play.getAttribute("data-live")) !== "0") {
    throw new Error("Expected live off after pause");
  }
  if ((await range.getAttribute("data-range")) !== "12h") {
    throw new Error("Pause must keep selected range");
  }

  await page.screenshot({ path: resolve(OUT, "historian-live-01.png") });
  result.screenshots.push("historian-live-01.png");
  result.ok = true;
} catch (e) {
  result.error = String(e?.message || e);
  await page
    .screenshot({ path: resolve(OUT, "historian-live-FAIL.png"), fullPage: true })
    .catch(() => {});
  result.screenshots.push("historian-live-FAIL.png");
} finally {
  writeFileSync(resolve(OUT, "historian-live-result.json"), JSON.stringify(result, null, 2));
  await browser.close();
}

console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
