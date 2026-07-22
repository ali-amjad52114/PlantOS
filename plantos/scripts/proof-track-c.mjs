import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve("c:/AI/Projects/Clickhouse/plantos/.env");
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

async function waitDone(runId, label) {
  const seen = [];
  for await (const run of runs.subscribeToRun(runId)) {
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
      console.log(label, "meta", key);
    }
    if (
      run.status === "COMPLETED" ||
      run.status === "FAILED" ||
      run.status === "CRASHED"
    ) {
      return { run, seen };
    }
  }
  throw new Error("subscribe ended without terminal status");
}

console.log("--- ROUTE ---");
const routeHandle = await tasks.trigger("plant-route-investigate", {
  question: "What is today's production worth, and what has it cost?",
});
const route = await waitDone(routeHandle.id, "route");
console.log(
  JSON.stringify({
    runId: routeHandle.id,
    final: route.run.status,
    mode: route.run.output?.mode,
    role: route.run.output?.role,
    method: route.run.output?.routing?.method,
    hasVisual: Boolean(route.run.output?.visual),
  })
);

console.log("--- PARALLEL ---");
const parallelHandle = await tasks.trigger("plant-parallel-investigate", {
  question: "Plant-wide parallel proof",
});
const parallel = await waitDone(parallelHandle.id, "parallel");
const roles = parallel.run.output?.roles || {};
console.log(
  JSON.stringify({
    runId: parallelHandle.id,
    final: parallel.run.status,
    mode: parallel.run.output?.mode,
    okCount: parallel.run.output?.okCount,
    engineerOk: Boolean(roles.engineer?.ok),
    operationsOk: Boolean(roles.operations?.ok),
    financeOk: Boolean(roles.finance?.ok),
  })
);
