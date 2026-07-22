const { createClient } = require("@clickhouse/client");
const fs = require("fs");
const path = require("path");

const env = fs.readFileSync(path.join(__dirname, "../plantos/.env"), "utf8");
const url = (env.match(/^CLICKHOUSE_URL=(.*)$/m) || [])[1];
if (!url) throw new Error("CLICKHOUSE_URL missing");

(async () => {
  const ch = createClient({ url, database: "plantos" });
  const r = await ch.query({
    query: `
      SELECT tag, argMax(value, ts) AS value, max(ts) AS ts, any(area) AS area
      FROM plant_readings
      GROUP BY tag
    `,
    format: "JSONEachRow",
  });
  const rows = await r.json();
  const payload = JSON.stringify({ rows, generated: true }, null, 2);
  for (const dir of [
    path.join(__dirname, "../data/fallback"),
    path.join(__dirname, "../plantos/data/fallback"),
  ]) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "latest_window.json"), payload);
  }
  console.log("fallback rows", rows.length);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
