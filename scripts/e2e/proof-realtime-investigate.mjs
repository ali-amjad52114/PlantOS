import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env");
for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (!m) continue;
  const k = m[1].trim();
  let v = m[2].trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  if (!process.env[k]) process.env[k] = v;
}

const { tasks, auth, runs } = await import("@trigger.dev/sdk");

const handle = await tasks.trigger("plant-investigate", {
  role: "engineer",
  question: "Track B realtime proof",
});

const publicAccessToken = await auth.createPublicToken({
  scopes: { read: { runs: [handle.id] } },
  expirationTime: "1h",
});

console.log(
  JSON.stringify({
    runId: handle.id,
    tokenPrefix: publicAccessToken.slice(0, 12),
    tokenLen: publicAccessToken.length,
  })
);

const seen = [];
for await (const run of runs.subscribeToRun(handle.id)) {
  const prog = run.metadata?.progress;
  const snap = {
    status: run.status,
    step: prog?.step,
    pct: prog?.percentage,
    label: prog?.label,
  };
  const key = JSON.stringify(snap);
  if (!seen.includes(key)) {
    seen.push(key);
    console.log("meta", key);
  }
  if (
    run.status === "COMPLETED" ||
    run.status === "FAILED" ||
    run.status === "CRASHED"
  ) {
    console.log(
      JSON.stringify({
        final: run.status,
        hasVisual: Boolean(run.output?.visual),
        role: run.output?.role,
        source: run.output?.source,
        progressSteps: seen.length,
      })
    );
    break;
  }
}
