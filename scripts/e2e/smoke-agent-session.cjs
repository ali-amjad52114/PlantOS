/**
 * Smoke-test plantos-agent chat session start (preload) via SDK.
 * Requires TRIGGER_SECRET_KEY + OPEN_AI (dashboard or env) + CLICKHOUSE_URL.
 */
const fs = require("fs");
const path = require("path");

const env = fs.readFileSync(path.join(__dirname, "../.env"), "utf8");
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const { chat } = require("@trigger.dev/sdk/ai");

const start = chat.createStartSessionAction("plantos-agent");

(async () => {
  const chatId = `plantos-proof-${Date.now()}`;
  const result = await start({ chatId });
  console.log(JSON.stringify({ chatId, keys: Object.keys(result || {}), result }, null, 2));
})().catch((e) => {
  console.error("SESSION_FAIL", e.message || e);
  process.exit(1);
});
