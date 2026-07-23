/**
 * Canvas pins proof — lessons/PLAN_CHAT_CANVAS_PINS.md
 * 2-column grid: span 1 | 2-wide; reorder by drag-swap.
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

  const pinButtons = page.getByTestId("pin-to-canvas");
  await pinButtons.nth(0).click();
  await page.waitForTimeout(400);

  const pins = page.getByTestId("canvas-pin");
  let count = await pins.count();
  result.steps.pinCountAfterFirst = count;
  if (count !== 1) throw new Error(`Expected 1 pin, got ${count}`);

  const span0 = await pins.first().getAttribute("data-span");
  result.steps.spanDefault = span0;
  if (span0 !== "1") throw new Error(`Expected default span 1, got ${span0}`);

  await page.screenshot({ path: resolve(OUT, "canvas-01-pinned.png") });
  result.screenshots.push("canvas-01-pinned.png");

  // Cycle size: 1 → 2 → 1
  const resizeBtn = page.getByTestId("canvas-pin-resize").first();
  await resizeBtn.click();
  await page.waitForTimeout(200);
  const span2 = await pins.first().getAttribute("data-span");
  result.steps.spanAfterFirstCycle = span2;
  if (span2 !== "2") throw new Error(`Expected span 2 after resize, got ${span2}`);

  await page.screenshot({ path: resolve(OUT, "canvas-02b-resized.png") });
  result.screenshots.push("canvas-02b-resized.png");

  // Reset to 1 for tidy reorder layout, then pin a second chart
  await resizeBtn.click();
  await page.waitForTimeout(150);
  result.steps.spanAfterSecondCycle = await pins.first().getAttribute("data-span");
  if (result.steps.spanAfterSecondCycle !== "1") {
    throw new Error("Expected span back to 1 after second cycle");
  }

  const pinBtnCount = await pinButtons.count();
  if (pinBtnCount < 2) throw new Error("Need at least 2 fixture pin sources for reorder");
  await pinButtons.nth(1).click();
  await page.waitForTimeout(400);
  count = await pins.count();
  result.steps.pinCountAfterSecond = count;
  if (count !== 2) throw new Error(`Expected 2 pins, got ${count}`);

  const orderBefore = await pins.evaluateAll((els) =>
    els.map((el) => el.getAttribute("data-pin-id"))
  );
  result.steps.orderBefore = orderBefore;

  // HTML5 DnD reorder — synthetic DragEvent + mutable DataTransfer (mouse dragTo won't set MIME)
  const fromId = orderBefore[0];
  const toId = orderBefore[1];
  await page.evaluate(
    ({ fromId: a, toId: b }) => {
      const source = document.querySelector(
        `[data-testid="canvas-pin"][data-pin-id="${a}"] [data-testid="canvas-pin-drag"]`
      );
      const target = document.querySelector(`[data-testid="canvas-pin"][data-pin-id="${b}"]`);
      if (!source || !target) throw new Error("missing reorder source/target");
      const store = {};
      const dataTransfer = {
        dropEffect: "move",
        effectAllowed: "all",
        files: [],
        items: [],
        types: [],
        setData(type, val) {
          store[type] = String(val);
          if (!this.types.includes(type)) this.types.push(type);
        },
        getData(type) {
          return store[type] || "";
        },
        clearData() {
          for (const k of Object.keys(store)) delete store[k];
          this.types.length = 0;
        },
        setDragImage() {},
      };
      const fire = (el, type) => {
        const ev = new Event(type, { bubbles: true, cancelable: true });
        Object.defineProperty(ev, "dataTransfer", { value: dataTransfer });
        el.dispatchEvent(ev);
      };
      fire(source, "dragstart");
      fire(target, "dragenter");
      fire(target, "dragover");
      fire(target, "drop");
      fire(source, "dragend");
    },
    { fromId, toId }
  );
  await page.waitForTimeout(400);

  const orderAfter = await pins.evaluateAll((els) =>
    els.map((el) => el.getAttribute("data-pin-id"))
  );
  result.steps.orderAfter = orderAfter;
  if (
    orderBefore[0] === orderAfter[0] &&
    orderBefore[1] === orderAfter[1]
  ) {
    throw new Error("Pin order did not swap after drag-to-reorder");
  }
  if (orderAfter[0] !== orderBefore[1] || orderAfter[1] !== orderBefore[0]) {
    throw new Error(
      `Expected swapped order ${orderBefore[1]},${orderBefore[0]} got ${orderAfter.join(",")}`
    );
  }

  await page.screenshot({ path: resolve(OUT, "canvas-02-moved.png") });
  result.screenshots.push("canvas-02-moved.png");

  // Zoom via explicit control
  await page.getByTestId("canvas-pin-zoom").first().click();
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
