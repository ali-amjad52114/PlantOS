/**
 * Static verify for plan items #5/#6 flags + structural presence.
 * Does not require Slack secrets.
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const root = process.cwd();
let failed = 0;

function ok(label: string, cond: boolean, detail?: string) {
  if (cond) console.log(`OK  ${label}`);
  else {
    failed += 1;
    console.error(`FAIL ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

const replay = readFileSync(join(root, "src/trigger/plant-replay.ts"), "utf8");
ok("#1 plant-replay-session task", replay.includes('id: "plant-replay-session"'));
ok("#1 SESSION_GAP_SEC = 1", /SESSION_GAP_SEC\s*=\s*1/.test(replay));
ok("#1 no plant-card-live", !existsSync(join(root, "src/trigger/plant-card-live.ts")));

const cardCtx = readFileSync(join(root, "src/components/lovable-viz/card-live-context.tsx"), "utf8");
const cardView = readFileSync(join(root, "src/components/lovable-viz/LovableCardView.tsx"), "utf8");
ok("#2 ReplayTickContext", cardCtx.includes("ReplayTickContext"));
ok("#2 LovableCardView uses replayTick", cardView.includes("useReplayTick") && cardView.includes("replayTick"));

const agent = readFileSync(join(root, "src/trigger/plant-agent.ts"), "utf8");
ok("#7 investigateParallel", agent.includes("investigateParallel") && agent.includes("plantParallelInvestigate.triggerAndWait"));
ok("#7 no Promise.all of waits", !/Promise\.all\(\s*\[\s*plantParallelInvestigate\.triggerAndWait/.test(agent));
ok("#8 consultEngineer AgentChat", agent.includes("consultEngineer") && agent.includes('AgentChat') && agent.includes('plantos-engineer'));
ok("#8 specialist file", existsSync(join(root, "src/trigger/plant-engineer-agent.ts")));

const alert = readFileSync(join(root, "src/trigger/plant-alert-watch.ts"), "utf8");
const digest = readFileSync(join(root, "src/trigger/plant-shift-digest.ts"), "utf8");
const envEx = readFileSync(join(root, ".env.outbound.example"), "utf8");
ok("#6 alert task + flag", alert.includes('id: "plant-alert-watch"') && alert.includes("PLANT_ALERTS_ENABLED"));
ok("#5 digest task + flag", digest.includes('id: "plant-shift-digest"') && digest.includes("PLANT_DIGEST_ENABLED"));
ok("#5/#6 env example", envEx.includes("PLANT_ALERTS_ENABLED") && envEx.includes("PLANT_DIGEST_ENABLED"));
ok("#5 no LLM in digest", !/openai|anthropic|streamText|generateText/i.test(digest));
ok("#6 no plant-card-live / HITL", !agent.includes("confirmCanvasLand"));

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nAll static verifies passed");
