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

const { tasks, runs } = await import("@trigger.dev/sdk");

async function waitDone(runId) {
  for await (const run of runs.subscribeToRun(runId)) {
    if (
      run.status === "COMPLETED" ||
      run.status === "FAILED" ||
      run.status === "CRASHED"
    ) {
      return run;
    }
  }
  throw new Error("no terminal status");
}

console.log("--- investigate engineer ---");
const inv = await tasks.trigger("plant-investigate", {
  role: "engineer",
  question: "E2E engineer verification",
});
const invRun = await waitDone(inv.id);
const visual = invRun.output?.visual;
console.log(
  JSON.stringify({
    ok: invRun.status === "COMPLETED" && typeof visual?.productionMW === "number",
    runId: inv.id,
    status: invRun.status,
    progressLabel: invRun.metadata?.progress?.label,
    progressPct: invRun.metadata?.progress?.percentage,
    productionMW: visual?.productionMW,
    turbineSpeed: visual?.turbineSpeed,
    boilerPressure: visual?.boilerPressure,
    steamFlow: visual?.steamFlow,
    attentionCount: Array.isArray(visual?.attention) ? visual.attention.length : null,
    elapsedMs: visual?.elapsedMs,
    hasEvidence: Boolean(visual?.evidence),
    source: invRun.output?.source,
  })
);

console.log("--- route engineer question ---");
const route = await tasks.trigger("plant-route-investigate", {
  question: "What is the current status of the generators and turbine?",
});
const routeRun = await waitDone(route.id);
console.log(
  JSON.stringify({
    ok:
      routeRun.status === "COMPLETED" &&
      routeRun.output?.role === "engineer" &&
      Boolean(routeRun.output?.visual),
    runId: route.id,
    status: routeRun.status,
    role: routeRun.output?.role,
    method: routeRun.output?.routing?.method,
    reason: routeRun.output?.routing?.reason,
    productionMW: routeRun.output?.visual?.productionMW,
  })
);
