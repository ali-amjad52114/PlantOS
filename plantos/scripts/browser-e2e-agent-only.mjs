import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";

const OUT = resolve("c:/AI/Projects/Clickhouse/data/browser-e2e");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
page.setDefaultTimeout(60000);

const events = [];
page.on("console", (msg) => {
  if (msg.type() === "error") events.push({ type: "console_error", text: msg.text() });
});

await page.goto("http://localhost:3001/", { waitUntil: "networkidle" });
await page.getByRole("button", { name: /^engineer/i }).click();

// Clear-ish: click Ask agent with empty input → uses suggested placeholder submit
await page.getByRole("button", { name: "Ask agent" }).click();

let lastStatus = "";
let sawThinking = false;
let sawTool = false;
let sawAssistantText = false;
let sawError = false;
let errorText = "";
let finalSnippet = "";

for (let i = 0; i < 90; i++) {
  const main = await page.locator("main").innerText();
  const statusEl = page.locator("text=Trigger.dev chat.agent").locator("..");
  const statusLine = await statusEl.innerText().catch(() => "");
  lastStatus = statusLine;

  if (/Thinking/i.test(main)) sawThinking = true;
  if (/Engineer investigation|Operations investigation|Building visualization|Live plant status/i.test(main)) {
    sawTool = true;
  }
  // assistant bubble / markdown — not the suggested placeholder alone
  if (/role=engineer/i.test(main) && !/Ask via Trigger agent/i.test(main)) {
    // user message appeared
  }
  if (
    /productionMW|turbine speed|boiler|Based on|ClickHouse|investigation complete|MW/i.test(main) &&
    /\[role=engineer\]/i.test(main)
  ) {
    // weak
  }
  // After user message, look for non-user content growth
  if (/\[role=engineer\]/.test(main)) {
    const after = main.split(/\[role=engineer\]/)[1] || "";
    if (/Engineer investigation|Building visualization|production|turbine|I |The /i.test(after)) {
      sawAssistantText = true;
    }
  }

  if (/Agent error:/i.test(main)) {
    sawError = true;
    errorText = (main.match(/Agent error:[^\n]*/)?.[0] || "").slice(0, 300);
    break;
  }

  // Terminal-ish: status ready again after streaming and we saw tools/text
  if (/READY/i.test(statusLine) && (sawTool || sawAssistantText) && i > 8) {
    finalSnippet = main.slice(0, 600).replace(/\s+/g, " ");
    break;
  }
  if (/READY/i.test(statusLine) && i > 25 && !sawTool && !sawAssistantText) {
    finalSnippet = main.slice(0, 600).replace(/\s+/g, " ");
    break;
  }

  await page.waitForTimeout(1000);
}

await page.screenshot({ path: resolve(OUT, "07-agent-longwait.png"), fullPage: true });
const body = await page.locator("main").innerText();
finalSnippet = finalSnippet || body.slice(0, 800).replace(/\s+/g, " ");

const result = {
  lastStatus,
  sawThinking,
  sawTool,
  sawAssistantText,
  sawError,
  errorText,
  consoleErrors: events,
  ok: !sawError && (sawTool || sawAssistantText),
  softOnlySubmitted: /SUBMITTED|STREAMING/i.test(lastStatus) && !sawTool && !sawAssistantText,
  finalSnippet,
};
writeFileSync(resolve(OUT, "agent-result.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
await browser.close();
process.exit(result.ok ? 0 : 2);
