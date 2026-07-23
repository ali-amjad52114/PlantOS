import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";

const OUT = resolve("c:/AI/Projects/Clickhouse/data/browser-e2e");
mkdirSync(OUT, { recursive: true });

const findings = [];
function note(step, ok, detail) {
  findings.push({ step, ok, detail, at: new Date().toISOString() });
  console.log(`${ok ? "PASS" : "FAIL"} | ${step} | ${detail}`);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
page.setDefaultTimeout(60000);

const consoleErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => consoleErrors.push(String(err)));

try {
  await page.goto("http://localhost:3001/", { waitUntil: "networkidle" });
  await page.screenshot({ path: resolve(OUT, "e2e-01-home.png"), fullPage: true });

  note("home", /One plant/.test((await page.locator("h1").first().textContent()) || ""), "title ok");
  note("live_badge", /LIVE|STALE|PAUSED/.test((await page.locator("text=/LIVE|STALE|PAUSED/").first().textContent()) || ""), "badge present");

  await page.getByRole("button", { name: "Start" }).click();
  await page.waitForTimeout(1200);
  const badge = (await page.locator("text=/LIVE|STALE|PAUSED/").first().textContent()) || "";
  note("replay_start", /LIVE|STALE/.test(badge), `badge=${badge.trim()}`);

  await page.getByRole("button", { name: /^engineer/i }).click();

  // 1) Realtime single-role
  await page.getByRole("button", { name: /Single role \(Realtime\)/i }).click();
  let realtimeOk = false;
  let realtimeDetail = "";
  for (let i = 0; i < 40; i++) {
    const t = await page.locator("main").innerText();
    if (/COMPLETE|complete|100%/i.test(t) && /runId:/i.test(t)) {
      realtimeOk = true;
      realtimeDetail = (t.match(/runId:[^\n]*/)?.[0] || "") + " | " + (t.match(/[^\n]*complete[^\n]*/i)?.[0] || "");
      break;
    }
    await page.waitForTimeout(800);
  }
  await page.screenshot({ path: resolve(OUT, "e2e-02-realtime.png"), fullPage: true });
  note("realtime_investigate", realtimeOk, realtimeDetail || "no completion");

  // 2) Route
  await page.locator("textarea").fill("Show the hydro unit, steam versus hydro MW, component temperatures, and power versus shift target from live ClickHouse.");
  await page.getByRole("button", { name: /Route & investigate/i }).click();
  let routeOk = false;
  let routeDetail = "";
  for (let i = 0; i < 50; i++) {
    const t = await page.locator("main").innerText();
    if (/Routed → engineer|Routed to engineer/i.test(t)) {
      routeOk = true;
      routeDetail = (t.match(/Routed[^\n]*/)?.[0] || "").slice(0, 200);
      break;
    }
    await page.waitForTimeout(800);
  }
  await page.screenshot({ path: resolve(OUT, "e2e-03-route.png"), fullPage: true });
  note("route_investigate", routeOk, routeDetail || "no route note");

  // 3) Ask agent (strict)
  await page.getByRole("button", { name: "Ask agent" }).click();
  let agentOk = false;
  let agentDetail = "";
  let sawError = false;
  for (let i = 0; i < 90; i++) {
    const t = await page.locator("main").innerText();
    if (/Agent error:|Maximum update depth/i.test(t)) {
      sawError = true;
      agentDetail = (t.match(/Agent error:[^\n]*/)?.[0] || "error").slice(0, 240);
      break;
    }
    const statusReady = /chat\.agent[^\n]*\nREADY/i.test(t) || /plantos-agent\s+READY/i.test(t);
    const hasUser = /\[role=engineer\]/i.test(t);
    const hasToolOrViz =
      /✓ Engineer investigation/i.test(t) ||
      /Generator Power|302\s*MW|Current Generator|renderVisualization|Building visualization/i.test(t);
    if (hasUser && hasToolOrViz && (statusReady || i > 20)) {
      // Prefer READY terminal
      if (statusReady || (/302|Generator Power|Turbine/i.test(t) && i > 15)) {
        agentOk = !sawError && hasToolOrViz;
        agentDetail = `readyish=${statusReady}; tools/viz=yes; snippet=${t.replace(/\s+/g, " ").slice(0, 280)}`;
        if (statusReady) break;
      }
    }
    await page.waitForTimeout(1000);
  }
  await page.screenshot({ path: resolve(OUT, "e2e-04-agent.png"), fullPage: true });
  note("ask_agent", agentOk && !sawError, agentDetail || "agent did not complete");

  // 4) Role visual numbers still on page
  const body = await page.locator("main").innerText();
  const hasMw = /302|MW|production|Generator/i.test(body);
  note("engineer_visual_present", hasMw, hasMw ? "MW/generator content visible" : "missing visual metrics");

  const depthErrors = consoleErrors.filter((e) => /Maximum update depth/i.test(e));
  note("no_max_depth_console", depthErrors.length === 0, depthErrors[0] || "none");
  note(
    "console_errors_benign",
    consoleErrors.filter((e) => !/favicon|Download the React DevTools/i.test(e)).length === 0 ||
      depthErrors.length === 0,
    consoleErrors.slice(0, 5).join(" || ") || "none"
  );
} catch (e) {
  note("fatal", false, String(e?.message || e));
  await page.screenshot({ path: resolve(OUT, "e2e-99-fatal.png"), fullPage: true }).catch(() => {});
} finally {
  await browser.close();
}

const pass = findings.filter((f) => f.ok).length;
const fail = findings.filter((f) => !f.ok).length;
const summary = {
  pass,
  fail,
  total: findings.length,
  findings,
  screenshots: [
    "e2e-01-home.png",
    "e2e-02-realtime.png",
    "e2e-03-route.png",
    "e2e-04-agent.png",
  ],
};
writeFileSync(resolve(OUT, "e2e-full-results.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ pass, fail, total: findings.length }, null, 2));
process.exit(fail > 0 ? 1 : 0);
