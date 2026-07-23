/**
 * First-ask canvas placement — lessons/PLAN_FIRST_ASK_CANVAS.md
 *
 * Fixture contract (?e2eFirstAsk=1, no OpenAI required):
 * 1. Click "E2E first ask" → CH-bound engineer q=0; canvas gets first 2 map cards;
 *    blurb in chat; those charts are not pinable in chat.
 * 2. Click "E2E follow-up" → engineer q=1 cards appear as chat pinables;
 *    canvas pin count unchanged (no auto-land).
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";

const OUT = resolve("data/browser-e2e");
mkdirSync(OUT, { recursive: true });

const EXPECTED_FIRST = ["HydroUnit", "HydroEnergyBars"];

const result = {
  ok: false,
  steps: {},
  error: null,
  screenshots: [],
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
page.setDefaultTimeout(60000);

try {
  await page.goto("http://localhost:3001/?e2eFirstAsk=1", {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("button", { name: /^Engineer$/i }).click();
  await page.waitForTimeout(1200);

  await page.getByTestId("e2e-first-ask-controls").waitFor({ state: "visible" });
  await page.getByTestId("e2e-sim-first-ask").click();
  await page.waitForTimeout(1500);

  const blurb = page.getByTestId("e2e-first-ask-blurb");
  await blurb.waitFor({ state: "visible" });
  result.steps.blurbInChat = true;

  const pins = page.getByTestId("canvas-pin");
  const pinCount = await pins.count();
  result.steps.canvasPinCountAfterFirst = pinCount;
  if (pinCount !== 2) throw new Error(`Expected 2 canvas pins after first ask, got ${pinCount}`);

  const types = await pins.evaluateAll((els) =>
    els.map((el) => el.getAttribute("data-card-type"))
  );
  result.steps.canvasCardTypes = types;
  for (const t of EXPECTED_FIRST) {
    if (!types.includes(t)) {
      throw new Error(`Expected canvas card ${t} from engineer q=0 map, got ${types.join(",")}`);
    }
  }

  // First-ask charts must not remain as chat pinables of those types
  for (const t of EXPECTED_FIRST) {
    const inChat = await page.getByTestId(`canvas-fixture-card-${t}`).count();
    const follow = await page.getByTestId(`e2e-follow-up-card-${t}`).count();
    if (inChat + follow > 0) {
      throw new Error(`First-ask card ${t} still visible as chat pinable`);
    }
  }
  result.steps.firstAskChartsNotInChat = true;

  const lovableLabel = await page.getByText(/Lovable Visual/i).count();
  result.steps.lovableVisualLabelCount = lovableLabel;
  if (lovableLabel > 0) {
    throw new Error("Lovable Visual deck label must not appear in chat");
  }

  await page.screenshot({ path: resolve(OUT, "first-ask-01-canvas.png") });
  result.screenshots.push("first-ask-01-canvas.png");

  const beforeFollow = pinCount;
  await page.getByTestId("e2e-sim-follow-up").click();
  await page.waitForTimeout(1500);

  await page.getByTestId("e2e-follow-up-source").waitFor({ state: "visible" });
  const followPinables = await page.locator('[data-testid^="e2e-follow-up-card-"]').count();
  result.steps.followUpChatPinables = followPinables;
  if (followPinables < 1) throw new Error("Expected follow-up charts in chat");

  const afterFollow = await pins.count();
  result.steps.canvasPinCountAfterFollowUp = afterFollow;
  if (afterFollow !== beforeFollow) {
    throw new Error(
      `Canvas pin count changed on follow-up auto-land: ${beforeFollow} → ${afterFollow}`
    );
  }
  result.steps.followUpNoAutoLand = true;

  await page.screenshot({ path: resolve(OUT, "first-ask-02-follow-up.png") });
  result.screenshots.push("first-ask-02-follow-up.png");

  // New chat resets first-ask: clear and re-run first ask → still 2 types (may stack if pins kept)
  await page.getByRole("button", { name: /New chat/i }).click();
  await page.waitForTimeout(400);
  // After reset, simulate first ask again — should land another pair only if previous cleared;
  // plan DoD: "New chat → first ask again uses canvas-2 behavior" (placement rule), not clear pins.
  await page.getByTestId("e2e-sim-first-ask").click();
  await page.waitForTimeout(1200);
  // Upsert uses stable bound ids — count stays 2 (bindings refresh), not 4.
  const afterNewChatFirst = await pins.count();
  result.steps.canvasPinCountAfterNewChatFirstAsk = afterNewChatFirst;
  if (afterNewChatFirst !== 2) {
    throw new Error(
      `After New chat + first ask, expected 2 upserted pins (stable ids), got ${afterNewChatFirst}`
    );
  }
  result.steps.newChatFirstAskOk = true;

  result.ok = true;
} catch (e) {
  result.error = String(e?.message || e);
  await page.screenshot({ path: resolve(OUT, "first-ask-FAIL.png"), fullPage: true }).catch(() => {});
  result.screenshots.push("first-ask-FAIL.png");
} finally {
  writeFileSync(resolve(OUT, "first-ask-canvas-result.json"), JSON.stringify(result, null, 2));
  await browser.close();
}

console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
