/**
 * Visit /test/lovable-interactive and assert EVERY card is interactive.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";

const OUT = resolve("c:/AI/Projects/Clickhouse/data/browser-e2e");
mkdirSync(OUT, { recursive: true });

const results = [];
function note(step, ok, detail) {
  results.push({ step, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} | ${step} | ${detail}`);
}

async function tooltipVisible(page) {
  const tip = page.locator("[data-testid='lovable-tooltip']");
  const n = await tip.count();
  if (n === 0) return false;
  return tip.first().isVisible().catch(() => false);
}

async function triggerTooltip(page, surface) {
  const box = await surface.boundingBox();
  if (!box || box.width < 8 || box.height < 8) return false;

  const points = [
    [0.45, 0.45],
    [0.55, 0.4],
    [0.65, 0.5],
    [0.35, 0.55],
  ];
  for (const [fx, fy] of points) {
    const x = box.x + box.width * fx;
    const y = box.y + box.height * fy;
    await page.mouse.move(x, y);
    await page.waitForTimeout(120);
    if (await tooltipVisible(page)) return true;
  }
  // Force a small drag across the plot (Recharts listens to mousemove).
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.45, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(150);
  return tooltipVisible(page);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);

try {
  await page.goto("http://localhost:3001/test/lovable-interactive", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForSelector("[data-interactive-card='true']");
  // Let ResizeObserver / chart measure settle
  await page.waitForTimeout(800);

  const cards = page.locator("[data-interactive-card='true']");
  const total = await cards.count();
  note("cards_found", total >= 48, `count=${total}`);

  let pass = 0;
  let tipOk = 0;
  let tipTried = 0;
  const failures = [];

  for (let i = 0; i < total; i++) {
    const card = cards.nth(i);
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(40);
    const type = (await card.getAttribute("data-lovable-card")) || `card-${i}`;

    const hasAxes = (await card.locator(".recharts-cartesian-axis").count()) > 0;
    const hasPie =
      (await card.locator(".recharts-pie, .recharts-pie-sector, [data-interactive='pie']").count()) > 0 &&
      (await card.locator("svg").count()) > 0;
    const hasItems =
      (await card.locator("[data-interactive='items'], [data-testid='interactive-item']").count()) > 0;
    const marked = (await card.locator("[data-interactive]").count()) > 0;
    const ok = marked && (hasAxes || hasPie || hasItems);
    if (ok) pass += 1;
    else failures.push(`${type}: axes=${hasAxes} pie=${hasPie} items=${hasItems} mark=${marked}`);

    if (hasAxes || hasPie) {
      tipTried += 1;
      const surface = card.locator(".recharts-surface, svg").first();
      await surface.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
      const shown = await triggerTooltip(page, surface);
      if (shown) tipOk += 1;
      else failures.push(`${type}: tooltip missing on hover`);
    }
  }

  await page.screenshot({
    path: resolve(OUT, "lovable-interactive-all.png"),
    fullPage: true,
  });

  const allOk = total > 0 && pass === total;
  const tipsGood = tipTried === 0 || tipOk / tipTried >= 0.85;
  note("all_interactive", allOk, `${pass}/${total}`);
  note("tooltips", tipsGood, `${tipOk}/${tipTried}`);
  if (failures.length) note("failures", false, failures.slice(0, 25).join(" || "));

  writeFileSync(
    resolve(OUT, "lovable-interactive-results.json"),
    JSON.stringify({ results, total, pass, tipTried, tipOk, failures }, null, 2)
  );

  process.exitCode = allOk && tipsGood ? 0 : 1;
} catch (e) {
  note("runner", false, String(e?.message || e));
  process.exitCode = 1;
} finally {
  await browser.close();
}
