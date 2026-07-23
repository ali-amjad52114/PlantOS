/**
 * Historian range — default 5m; optional 1h/12h/24h
 * lessons/PLAN_HISTORIAN_RANGE.md
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

  const genCard = page.locator('[data-lovable-card="GeneratorOutput"]');
  await genCard.first().waitFor({ state: "visible" });

  const range = genCard.first().getByTestId("historian-range");
  await range.waitFor({ state: "visible" });

  const defaultRange = await range.getAttribute("data-range");
  result.steps.defaultRange = defaultRange;
  if (defaultRange !== "1m") throw new Error(`Expected default range 1m, got ${defaultRange}`);

  const label1m = await genCard.first().getByTestId("historian-range-label").innerText();
  result.steps.label1m = label1m;
  if (!/1 minute/i.test(label1m)) throw new Error(`Expected 1 minute label, got ${label1m}`);

  await genCard.first().getByTestId("historian-range-1h").click();
  await page.waitForTimeout(800);
  if ((await range.getAttribute("data-range")) !== "1h") {
    throw new Error("Expected range 1h after click");
  }

  await genCard.first().getByTestId("historian-range-12h").click();
  await page.waitForTimeout(800);
  if ((await range.getAttribute("data-range")) !== "12h") {
    throw new Error("Expected range 12h after click");
  }

  const closest = page.locator('[data-lovable-card="ClosestToLimit"]');
  if ((await closest.count()) > 0) {
    const excludedRange = await closest.first().getByTestId("historian-range").count();
    if (excludedRange !== 0) throw new Error("ClosestToLimit must not show historian range");
    result.steps.excludedCardOk = true;
  }

  await page.screenshot({ path: resolve(OUT, "historian-range-01.png") });
  result.screenshots.push("historian-range-01.png");
  result.ok = true;
} catch (e) {
  result.error = String(e?.message || e);
  await page
    .screenshot({ path: resolve(OUT, "historian-range-FAIL.png"), fullPage: true })
    .catch(() => {});
  result.screenshots.push("historian-range-FAIL.png");
} finally {
  writeFileSync(resolve(OUT, "historian-range-result.json"), JSON.stringify(result, null, 2));
  await browser.close();
}

console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
