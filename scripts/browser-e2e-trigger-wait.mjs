/**
 * Trigger ambient wait — lessons/PLAN_TRIGGER_WAIT_STATE.md
 * Proves wait panel is top-aligned and Ask does not crash the shell.
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
  pageErrors: [],
  consoleErrors: [],
  screenshots: [],
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
page.setDefaultTimeout(60000);

page.on("pageerror", (err) => {
  result.pageErrors.push(String(err?.message || err));
});
page.on("console", (msg) => {
  if (msg.type() === "error") result.consoleErrors.push(msg.text());
});

try {
  const health = await page.goto("http://localhost:3001/", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  result.steps.homeStatus = health?.status() ?? null;
  if (!health || health.status() >= 400) {
    throw new Error(`App not healthy: ${health?.status()}`);
  }

  // Shell mode label is "Engineer" (see plant-shell MODE_NAV).
  await page.getByRole("button", { name: /^Engineer$/i }).click();
  await page.waitForTimeout(800);

  // Prefer visuals tab so the stage wait overlay is visible
  const visuals = page.getByRole("button", { name: /^visuals$/i });
  if (await visuals.count()) {
    await visuals.first().click().catch(() => {});
  }
  await page.waitForTimeout(300);

  const q2 = page.getByRole("button", {
    name: /What is the current status of the generators and turbine/i,
  });
  await q2.first().click();
  result.steps.asked = true;

  const overlay = page.getByTestId("trigger-wait-overlay");
  await overlay.waitFor({ state: "visible", timeout: 15000 });
  result.steps.overlayVisible = true;

  const waitCard = page.getByTestId("trigger-wait-state");
  await waitCard.waitFor({ state: "visible" });

  const geometry = await page.evaluate(() => {
    const overlayEl = document.querySelector('[data-testid="trigger-wait-overlay"]');
    const card = document.querySelector('[data-testid="trigger-wait-state"] > div');
    if (!overlayEl || !card) return null;
    const o = overlayEl.getBoundingClientRect();
    const c = card.getBoundingClientRect();
    return {
      overlayTop: Math.round(o.top),
      cardTop: Math.round(c.top),
      cardBottom: Math.round(c.bottom),
      overlayHeight: Math.round(o.height),
      // card should sit in the upper third of the overlay
      inUpperThird: c.top < o.top + o.height * 0.35,
    };
  });
  result.steps.geometry = geometry;
  if (!geometry?.inUpperThird) {
    throw new Error(
      `Wait card not top-aligned: cardTop=${geometry?.cardTop} overlayTop=${geometry?.overlayTop} h=${geometry?.overlayHeight}`
    );
  }

  await page.screenshot({ path: resolve(OUT, "trigger-wait-01-top.png") });
  result.screenshots.push("trigger-wait-01-top.png");

  // Stay on wait long enough to catch runtime errors; advance if phases move
  const headline = waitCard.locator("p").filter({ hasText: /.+/ }).first();
  result.steps.initialText = (await waitCard.innerText()).slice(0, 240);

  await page.waitForTimeout(5000);
  result.steps.after5sText = (await waitCard.innerText()).slice(0, 240);
  result.steps.stillVisible = (await overlay.count()) > 0;

  // Shell must not be a Next error page
  const body = await page.locator("body").innerText();
  if (/Application error|Unhandled Runtime Error|Module not found/i.test(body)) {
    throw new Error("Shell showing Next/runtime error page");
  }

  if (result.pageErrors.length) {
    throw new Error(`pageerror: ${result.pageErrors[0]}`);
  }

  // Soft: console errors from our app (ignore known third-party noise)
  const serious = result.consoleErrors.filter(
    (t) =>
      !/favicon|Download the React DevTools|pipedream\/sdk\/server/i.test(t) &&
      /Error|TypeError|ReferenceError|Cannot read/i.test(t)
  );
  result.steps.seriousConsole = serious.slice(0, 5);
  if (serious.length) {
    throw new Error(`console error: ${serious[0]}`);
  }

  await page.screenshot({ path: resolve(OUT, "trigger-wait-02-later.png") });
  result.screenshots.push("trigger-wait-02-later.png");

  result.ok = true;
} catch (e) {
  result.error = String(e?.message || e);
  await page.screenshot({ path: resolve(OUT, "trigger-wait-FAIL.png"), fullPage: true }).catch(() => {});
  result.screenshots.push("trigger-wait-FAIL.png");
} finally {
  writeFileSync(resolve(OUT, "trigger-wait-result.json"), JSON.stringify(result, null, 2));
  await browser.close();
}

console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
