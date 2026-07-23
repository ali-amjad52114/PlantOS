/**
 * Canvas pins proof — lessons/PLAN_CHAT_CANVAS_PINS.md
 * Uses ?e2eCanvas=1 fixture so OpenAI/Trigger are not required.
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
page.setDefaultTimeout(45000);

try {
  await page.goto("http://localhost:3001/?e2eCanvas=1", { waitUntil: "domcontentloaded" });
  // Shell mode label is "Engineers" (see plant-shell MODE_NAV).
  await page.getByRole("button", { name: /^Engineers$/i }).click();
  await page.waitForTimeout(1500);

  const fixture = page.getByTestId("canvas-fixture-source");
  await fixture.waitFor({ state: "visible" });
  result.steps.fixtureVisible = true;

  // Pin a single card (not a 4-card tower).
  await page.getByTestId("pin-to-canvas").first().click();
  await page.waitForTimeout(400);

  const pins = page.getByTestId("canvas-pin");
  const countAfterPin = await pins.count();
  result.steps.pinCount = countAfterPin;
  if (countAfterPin !== 1) throw new Error(`Expected 1 individual card pin, got ${countAfterPin}`);

  await page.screenshot({ path: resolve(OUT, "canvas-01-pinned.png") });
  result.screenshots.push("canvas-01-pinned.png");

  const pin = pins.first();
  await page.getByText(/empty canvas/i).waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(200);
  const before = await pin.evaluate((el) => ({
    left: el.style.left,
    top: el.style.top,
  }));

  const box = await pin.boundingBox();
  if (!box) throw new Error("No pin bounding box");
  // Drag from card body (below chrome), not the resize corner.
  await page.mouse.move(box.x + Math.min(80, box.width / 3), box.y + 40);
  await page.mouse.down();
  await page.mouse.move(box.x + 140, box.y + 120, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(400);

  const after = await pin.evaluate((el) => ({
    left: el.style.left,
    top: el.style.top,
  }));
  result.steps.moveBefore = before;
  result.steps.moveAfter = after;
  if (before.left === after.left && before.top === after.top) {
    throw new Error("Pin position did not change after drag");
  }

  await page.screenshot({ path: resolve(OUT, "canvas-02-moved.png") });
  result.screenshots.push("canvas-02-moved.png");

  // Resize via SE handle
  const sizeBefore = await pin.evaluate((el) => ({
    w: el.style.width,
    h: el.style.height,
  }));
  const handle = page.getByTestId("canvas-pin-resize").first();
  const hb = await handle.boundingBox();
  if (!hb) throw new Error("No resize handle");
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  await page.mouse.move(hb.x + 80, hb.y + 60, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  const sizeAfter = await pin.evaluate((el) => ({
    w: el.style.width,
    h: el.style.height,
  }));
  result.steps.resizeBefore = sizeBefore;
  result.steps.resizeAfter = sizeAfter;
  if (sizeBefore.w === sizeAfter.w && sizeBefore.h === sizeAfter.h) {
    throw new Error("Pin size did not change after resize");
  }

  await page.screenshot({ path: resolve(OUT, "canvas-02b-resized.png") });
  result.screenshots.push("canvas-02b-resized.png");

  // Click pin body (not X) to focus — click center of pin
  const box2 = await pin.boundingBox();
  await page.mouse.click(box2.x + box2.width / 2, box2.y + box2.height / 2);
  await page.waitForTimeout(300);
  const focus = page.getByTestId("canvas-pin-focus");
  await focus.waitFor({ state: "visible" });
  result.steps.focusOpen = true;

  await page.screenshot({ path: resolve(OUT, "canvas-03-focus.png") });
  result.screenshots.push("canvas-03-focus.png");

  await page.getByTestId("canvas-pin-focus-close").click();
  await page.waitForTimeout(200);
  result.steps.focusClosed = (await focus.count()) === 0;

  const beforeRemove = await pins.count();
  await page.getByTestId("canvas-pin-remove").first().click();
  await page.waitForTimeout(300);
  const afterRemove = await pins.count();
  result.steps.removeBefore = beforeRemove;
  result.steps.removeAfter = afterRemove;
  if (afterRemove >= beforeRemove) throw new Error("Pin was not removed");

  await page.screenshot({ path: resolve(OUT, "canvas-04-removed.png") });
  result.screenshots.push("canvas-04-removed.png");

  result.ok = true;
} catch (e) {
  result.error = String(e?.message || e);
  await page.screenshot({ path: resolve(OUT, "canvas-FAIL.png"), fullPage: true }).catch(() => {});
  result.screenshots.push("canvas-FAIL.png");
} finally {
  writeFileSync(resolve(OUT, "canvas-pins-result.json"), JSON.stringify(result, null, 2));
  await browser.close();
}

console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
