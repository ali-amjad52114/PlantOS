/**
 * Smoke: flag-off digests/alerts + start plant-replay-session.
 * Loads .env then .env.local. Requires `npm run dev:trigger`.
 */
import { readFileSync, existsSync } from "fs";
import { runs, tasks } from "@trigger.dev/sdk";

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

async function waitDone(runId: string, ms = 60_000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    const run = await runs.retrieve(runId);
    if (
      run.status === "COMPLETED" ||
      run.status === "FAILED" ||
      run.status === "CRASHED" ||
      run.status === "SYSTEM_FAILURE" ||
      run.status === "CANCELED"
    ) {
      return run;
    }
    await new Promise((r) => setTimeout(r, 800));
  }
  throw new Error(`timeout waiting for ${runId}`);
}

async function main() {
  if (!process.env.TRIGGER_SECRET_KEY) {
    throw new Error("TRIGGER_SECRET_KEY missing");
  }

  const alertHandle = await tasks.trigger("plant-alert-watch", undefined);
  const alertRun = await waitDone(alertHandle.id, 30_000);
  console.log("alert", alertRun.status, JSON.stringify(alertRun.output));

  const digestHandle = await tasks.trigger("plant-shift-digest", undefined);
  const digestRun = await waitDone(digestHandle.id, 30_000);
  console.log("digest", digestRun.status, JSON.stringify(digestRun.output));

  const session = await tasks.trigger("plant-replay-session", { reason: "smoke-verify" });
  console.log("session started", session.id);
  // Wait ~5s and check metadata tickIndex advancing
  await new Promise((r) => setTimeout(r, 5000));
  const mid = await runs.retrieve(session.id);
  console.log(
    "session mid",
    mid.status,
    "tickIndex",
    mid.metadata?.tickIndex,
    "insertedRows",
    mid.metadata?.insertedRows
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
