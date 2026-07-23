import { readFileSync, existsSync } from "fs";
import { runs } from "@trigger.dev/sdk";

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    if (process.env[m[1]] !== undefined) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    process.env[m[1]] = v;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

const id = process.argv[2] || "run_cmrx994ho1o4v0in1v5091sxv";

async function main() {
  const a = await runs.retrieve(id);
  await new Promise((r) => setTimeout(r, 4000));
  const b = await runs.retrieve(id);
  console.log("t0", a.status, a.metadata?.tickIndex, a.metadata?.insertedRows);
  console.log("t1", b.status, b.metadata?.tickIndex, b.metadata?.insertedRows);
  const dt = Number(b.metadata?.tickIndex ?? -1) - Number(a.metadata?.tickIndex ?? -1);
  console.log("tickDelta", dt);
  if (b.status === "EXECUTING" && dt < 1) {
    console.error("FAIL: tickIndex did not advance in ~4s");
    process.exit(1);
  }
  console.log("OK session ticking");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
