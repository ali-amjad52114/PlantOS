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

  // Wait for shell hydration (nav ready).
  await page.getByRole("button", { name: /^Engineer$/i }).waitFor({ state: "visible" });
  await page.waitForTimeout(1500);

  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find(
      (el) => el.textContent.trim() === "Engineer"
    );
    if (!b) throw new Error("Engineer nav missing");
    b.click();
  });

  const ask = page.locator("button").filter({ hasText: /hydro unit|steam versus hydro/i });
  await ask.first().waitFor({ state: "visible", timeout: 20000 });
  await ask.first().click();
  result.steps.asked = true;

  const overlay = page.getByTestId("trigger-wait-overlay");
  await overlay.waitFor({ state: "visible", timeout: 15000 });
  result.steps.overlayVisible = true;

  const waitCard = page.getByTestId("trigger-wait-state");
  await waitCard.waitFor({ state: "visible" });

  const geometry = await page.evaluate(() => {
    const overlayEl = document.querySelector('[data-testid="trigger-wait-overlay"]');
    const card = document.querySelector('[data-testid="trigger-wait-state"]');
    if (!overlayEl || !card) return null;
    const o = overlayEl.getBoundingClientRect();
    const c = card.getBoundingClientRect();
    return {
      overlayTop: Math.round(o.top),
      cardTop: Math.round(c.top),
      offsetFromOverlayTop: Math.round(c.top - o.top),
      overlayHeight: Math.round(o.height),
      inUpperThird: c.top < o.top + o.height * 0.35,
    };
  });
  result.steps.geometry = geometry;
  if (!geometry?.inUpperThird) {
    throw new Error(
      `Wait card not top-aligned: offset=${geometry?.offsetFromOverlayTop} h=${geometry?.overlayHeight}`
    );
  }

  await page.screenshot({ path: resolve(OUT, "trigger-wait-01-top.png") });
  result.screenshots.push("trigger-wait-01-top.png");
  result.steps.initialText = (await waitCard.innerText()).slice(0, 280);

  // Watch for runtime failure during Trigger turn (up to ~14s; hang fallback is 12s).
  let sawPhaseAdvance = false;
  const startText = result.steps.initialText;
  for (let i = 0; i < 14; i++) {
    await page.waitForTimeout(1000);
    if (result.pageErrors.length) {
      throw new Error(`pageerror: ${result.pageErrors.join(" | ")}`);
    }
    const body = await page.locator("body").innerText();
    if (/Application error|Unhandled Runtime Error|Module not found/i.test(body)) {
      throw new Error("Shell showing Next/runtime error page");
    }
    if (/TypeError:|ReferenceError:|Cannot read propert/i.test(body)) {
      throw new Error(`Visible JS error in body: ${body.match(/TypeError:[^\n]+|ReferenceError:[^\n]+|Cannot read[^\n]+/)?.[0]}`);
    }
    if (await waitCard.count()) {
      const t = await waitCard.innerText();
      if (t !== startText) sawPhaseAdvance = true;
      result.steps.latestText = t.slice(0, 280);
    } else {
      result.steps.overlayDismissedAtSec = i + 1;
      break;
    }
  }
  result.steps.sawPhaseAdvance = sawPhaseAdvance;

  const serious = result.consoleErrors.filter(
    (t) =>
      !/favicon|Download the React DevTools|pipedream|hydrat|Netlify|websocket/i.test(t) &&
      /Error|TypeError|ReferenceError|Cannot read/i.test(t)
  );
  result.steps.seriousConsole = serious.slice(0, 5);
  if (serious.length) {
    throw new Error(`console error: ${serious[0]}`);
  }
  if (result.pageErrors.length) {
    throw new Error(`pageerror: ${result.pageErrors.join(" | ")}`);
  }

  await page.screenshot({ path: resolve(OUT, "trigger-wait-02-later.png") });
  result.screenshots.push("trigger-wait-02-later.png");

  result.ok = true;
} catch (e) {
  result.error = String(e?.message || e);
  await page
    .screenshot({ path: resolve(OUT, "trigger-wait-FAIL.png"), fullPage: true })
    .catch(() => {});
  result.screenshots.push("trigger-wait-FAIL.png");
} finally {
  writeFileSync(resolve(OUT, "trigger-wait-result.json"), JSON.stringify(result, null, 2));
  await browser.close();
}

console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
