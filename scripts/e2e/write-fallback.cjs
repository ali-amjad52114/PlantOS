const { createClient } = require("@clickhouse/client");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const env = fs.readFileSync(path.join(root, ".env"), "utf8");
const url = (env.match(/^CLICKHOUSE_URL=(.*)$/m) || [])[1];
if (!url) throw new Error("CLICKHOUSE_URL missing");

(async () => {
  const ch = createClient({ url, database: "plantos" });
  const r = await ch.query({
    query: "SELECT tag, value, ts, area FROM plant_readings ORDER BY ts DESC LIMIT 1 BY tag",
    format: "JSONEachRow",
  });
  const rows = await r.json();
  const payload = JSON.stringify({ rows, generated: true }, null, 2);
  for (const dir of [path.join(root, "data/fallback"), path.join(root, "../data/fallback")]) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "latest_window.json"), payload);
  }
  console.log("fallback rows", rows.length);

  // smoke tick
  const { tickReplay, getReplayControl } = require("./src/lib/replay.ts");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
