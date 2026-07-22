import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "proj_chhoeiuksrbzqtmfiuxd",
  runtime: "node",
  logLevel: "info",
  maxDuration: 3600,
  retries: { enabledInDev: true, default: { maxAttempts: 3 } },
  dirs: ["./src/trigger"],
});
