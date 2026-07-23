import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => {
  if (m.type() === "error") console.log("CONSOLE:", m.text());
});

const url = process.argv[2] || "http://localhost:3001/test/minimal-interactive";
console.log("GOTO", url);
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 180000 });
await page.waitForSelector("[data-probe='series-only'], [data-interactive-card='true']", {
  timeout: 120000,
});
await page.waitForTimeout(2000);

const info = await page.evaluate(() => {
  const probe = document.querySelector("[data-probe='series-only']");
  const card = document.querySelector('[data-lovable-card="EnergyValueTrend"]') || probe;
  const root = probe || card;
  const svg = root?.querySelector("svg");
  const classes = [...(root?.querySelectorAll("[class]") || [])]
    .map((el) => el.getAttribute("class"))
    .filter((c) => c && /recharts|axis|tooltip/.test(c))
    .slice(0, 40);
  return {
    probeHtml: probe?.innerHTML?.slice(0, 2000) || null,
    axis: root?.querySelectorAll(".recharts-cartesian-axis").length ?? 0,
    ticks: root?.querySelectorAll(".recharts-cartesian-axis-tick").length ?? 0,
    surface: root?.querySelectorAll(".recharts-surface").length ?? 0,
    svg: svg
      ? {
          w: svg.getBoundingClientRect().width,
          h: svg.getBoundingClientRect().height,
          outer: svg.outerHTML.slice(0, 500),
        }
      : null,
    classes,
    cards: document.querySelectorAll("[data-interactive-card='true']").length,
  };
});

console.log(JSON.stringify(info, null, 2));
await page.screenshot({
  path: "c:/AI/Projects/Clickhouse/data/browser-e2e/minimal-interactive.png",
  fullPage: true,
});
await browser.close();
