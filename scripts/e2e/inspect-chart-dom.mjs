import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => {
  if (m.type() === "error") console.log("CONSOLE:", m.text());
});

await page.goto("http://localhost:3001/test/lovable-interactive", {
  waitUntil: "domcontentloaded",
  timeout: 120000,
});
await page.waitForSelector("[data-interactive-card='true']", { timeout: 60000 });
await page.waitForTimeout(1500);

const info = await page.evaluate(() => {
  const card = document.querySelector('[data-lovable-card="EnergyValueTrend"]');
  const mark = card?.querySelector("[data-interactive], [data-chart-mark]");
  const svg = card?.querySelector("svg");
  const html = mark?.innerHTML?.slice(0, 1500) || card?.innerHTML?.slice(0, 1500) || "NO CARD";
  return {
    cardFound: !!card,
    markAttrs: mark
      ? {
          interactive: mark.getAttribute("data-interactive"),
          chartMark: mark.getAttribute("data-chart-mark"),
          testId: mark.getAttribute("data-testid"),
          w: mark.getBoundingClientRect().width,
          h: mark.getBoundingClientRect().height,
        }
      : null,
    svg: svg
      ? { w: svg.getBoundingClientRect().width, h: svg.getBoundingClientRect().height, childCount: svg.childElementCount }
      : null,
    axisCount: card?.querySelectorAll(".recharts-cartesian-axis").length ?? 0,
    surfaceCount: card?.querySelectorAll(".recharts-surface").length ?? 0,
    html,
  };
});

console.log(JSON.stringify(info, null, 2));
await browser.close();
