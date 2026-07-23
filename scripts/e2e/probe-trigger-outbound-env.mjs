/**
 * Trigger outbound-env-probe and wait for output via Trigger API / public token + poll run.
 * Uses Next server action through a tiny dynamic import isn't available here —
 * call tasks.trigger from a one-off using TRIGGER_SECRET_KEY in env.
 */
import { readFileSync } from "fs";

for (const file of [".env.local", ".env"]) {
  try {
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      if (!line || line.startsWith("#")) continue;
      const i = line.indexOf("=");
      if (i < 0) continue;
      const k = line.slice(0, i).trim();
      const v = line.slice(i + 1).trim();
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {
    /* ignore */
  }
}

const { tasks, runs, configure } = await import("@trigger.dev/sdk/v3").catch(() =>
  import("@trigger.dev/sdk")
);

if (process.env.TRIGGER_SECRET_KEY) {
  // ensure secret is present for local trigger
}

const handle = await tasks.trigger("outbound-env-probe", {});
console.log("triggered", handle.id);

const started = Date.now();
while (Date.now() - started < 90_000) {
  const run = await runs.retrieve(handle.id);
  const status = run.status;
  console.log("status", status);
  if (status === "COMPLETED") {
    console.log(JSON.stringify(run.output, null, 2));
    process.exit(0);
  }
  if (status === "FAILED" || status === "CRASHED" || status === "SYSTEM_FAILURE" || status === "CANCELED") {
    console.error("run failed", status, run.error);
    process.exit(1);
  }
  await new Promise((r) => setTimeout(r, 2000));
}
console.error("timeout waiting for probe");
process.exit(1);
