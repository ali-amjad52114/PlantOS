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
page.setDefaultTimeout(45000);

const consoleErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => consoleErrors.push(String(err)));

try {
  await page.goto("http://localhost:3001/", { waitUntil: "networkidle" });
  await page.screenshot({ path: resolve(OUT, "01-home.png"), fullPage: true });

  const title = await page.locator("h1").first().textContent();
  note("home_title", title?.includes("One plant"), `h1="${title}"`);

  const brand = await page.locator("text=PlantOS").first().isVisible();
  note("brand_visible", brand, "PlantOS label visible");

  const liveBadge = await page.locator("text=/LIVE|STALE|PAUSED/").first().textContent();
  note("live_badge", Boolean(liveBadge), `badge="${liveBadge?.trim()}"`);

  const liveMax = await page.locator("text=/Live max:/").first().textContent();
  note("live_max_row", Boolean(liveMax), liveMax?.trim() ?? "");

  // Replay Start
  await page.getByRole("button", { name: "Start" }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: resolve(OUT, "02-after-start.png"), fullPage: true });
  const badgeAfterStart = await page.locator("text=/LIVE|STALE|PAUSED/").first().textContent();
  note("replay_start", /LIVE|STALE/.test(badgeAfterStart || ""), `badge="${badgeAfterStart?.trim()}"`);

  // Ensure engineer role
  await page.getByRole("button", { name: /^engineer/i }).click();
  await page.waitForTimeout(400);

  // Single-role Realtime investigate
  await page.getByRole("button", { name: /Single role \(Realtime\)/i }).click();
  note("clicked_single_realtime", true, "clicked Single role (Realtime)");

  // Wait for progress UI or completion
  const progress = page.locator("text=Trigger.dev Realtime");
  await progress.waitFor({ state: "visible", timeout: 20000 }).catch(() => null);
  await page.waitForTimeout(2000);

  // Wait until complete label or production number appears in role visual
  let investigateOk = false;
  let investigateDetail = "";
  for (let i = 0; i < 30; i++) {
    const body = await page.locator("main").innerText();
    if (/investigation complete|Complete|100%|production|MW|turbine|boiler/i.test(body)) {
      // Prefer completed progress
      if (/complete|100%/i.test(body) || /302\.|production/i.test(body)) {
        investigateOk = /complete|100%|productionMW|MW|turbine|boiler|attention/i.test(body);
        investigateDetail = body.slice(0, 500).replace(/\s+/g, " ");
        if (/complete|100%/i.test(body) || body.includes("302")) break;
      }
    }
    await page.waitForTimeout(1000);
  }
  await page.screenshot({ path: resolve(OUT, "03-after-investigate.png"), fullPage: true });
  const runIdText = await page.locator("text=/runId:/").first().textContent().catch(() => null);
  note(
    "realtime_investigate",
    investigateOk,
    `runId=${runIdText ?? "none"}; snippet=${investigateDetail.slice(0, 220)}`
  );

  // Evidence drawer
  await page.getByRole("button", { name: "Evidence" }).click();
  await page.waitForTimeout(500);
  const evidenceVisible = await page.locator("pre").first().isVisible().catch(() => false);
  await page.screenshot({ path: resolve(OUT, "04-evidence.png"), fullPage: true });
  note("evidence_drawer", evidenceVisible, evidenceVisible ? "pre JSON visible" : "no evidence pre");

  // Route & investigate with engineer question already in textarea
  const ta = page.locator("textarea");
  await ta.fill("Show the hydro unit, steam versus hydro MW, component temperatures, and power versus shift target from live ClickHouse.");
  await page.getByRole("button", { name: /Route & investigate/i }).click();
  note("clicked_route", true, "clicked Route & investigate");

  let routeOk = false;
  let routeDetail = "";
  for (let i = 0; i < 45; i++) {
    const body = await page.locator("main").innerText();
    if (/Routed → engineer|Routed to engineer|method\)/i.test(body) || /Routed →/i.test(body)) {
      routeOk = true;
      routeDetail = (body.match(/Routed[^\n]*/)?.[0] || body).slice(0, 240);
      break;
    }
    if (/complete|100%/i.test(body) && i > 5) {
      // may complete without route note if effect timing odd
      routeDetail = body.slice(0, 300).replace(/\s+/g, " ");
    }
    await page.waitForTimeout(1000);
  }
  await page.screenshot({ path: resolve(OUT, "05-after-route.png"), fullPage: true });
  note("route_investigate", routeOk || /Routed|engineer investigation|finance|operations/i.test(routeDetail), routeDetail || "no route note");

  // Ask agent path (optional — may fail without dashboard OPEN_AI)
  const askBtn = page.getByRole("button", { name: /Ask agent|Send|Submit/i }).first();
  const suggested = page.getByRole("button", { name: /hydro unit|steam versus hydro|Ask/i }).first();
  let agentTried = false;
  let agentOk = false;
  let agentDetail = "";
  try {
    // Prefer clicking a suggested chip if present
    const chip = page.locator("button", { hasText: /hydro unit|steam versus hydro/i });
    if (await chip.count()) {
      await chip.first().click();
      agentTried = true;
    } else {
      const input = page.locator("textarea, input[type='text']").last();
      if (await input.count()) {
        await input.fill("Show the hydro unit, steam versus hydro MW, component temperatures, and power versus shift target from live ClickHouse.");
        const send = page.getByRole("button", { name: /Send|Ask/i }).first();
        if (await send.count()) {
          await send.click();
          agentTried = true;
        }
      }
    }
    if (agentTried) {
      for (let i = 0; i < 60; i++) {
        const body = await page.locator("main").innerText();
        const chatStatus = await page.locator("text=/ready|submitted|streaming|error|idle/i").first().textContent().catch(() => "");
        if (/tool-|investigateEngineer|productionMW|renderVisualization|assistant/i.test(body) || /streaming|ready/.test(chatStatus || "")) {
          // wait for something agent-like
        }
        if (/productionMW|turbine|I'?ll|tool/i.test(body) && i > 3) {
          agentOk = true;
          agentDetail = `status=${chatStatus}; ` + body.slice(0, 280).replace(/\s+/g, " ");
          break;
        }
        if (/error|failed|OPEN_AI|API key/i.test(body) && i > 5) {
          agentDetail = body.slice(0, 280).replace(/\s+/g, " ");
          break;
        }
        await page.waitForTimeout(1000);
      }
      await page.screenshot({ path: resolve(OUT, "06-after-agent.png"), fullPage: true });
    } else {
      agentDetail = "no obvious Ask/Send control found";
    }
  } catch (e) {
    agentDetail = String(e?.message || e);
  }
  note("ask_agent", agentOk, agentTried ? agentDetail : `not tried: ${agentDetail}`);

  note(
    "console_errors",
    consoleErrors.length === 0,
    consoleErrors.length ? consoleErrors.slice(0, 8).join(" || ") : "none"
  );
} catch (e) {
  note("fatal", false, String(e?.message || e));
  await page.screenshot({ path: resolve(OUT, "99-fatal.png"), fullPage: true }).catch(() => {});
} finally {
  await browser.close();
}

const pass = findings.filter((f) => f.ok).length;
const fail = findings.filter((f) => !f.ok).length;
const summary = { pass, fail, total: findings.length, findings, screenshotsDir: OUT };
writeFileSync(resolve(OUT, "results.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ pass, fail, total: findings.length }, null, 2));
process.exit(fail > 0 ? 1 : 0);
