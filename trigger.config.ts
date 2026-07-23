import { defineConfig } from "@trigger.dev/sdk/v3";

import { additionalFiles } from "@trigger.dev/build/extensions/core";

export default defineConfig({
  project: "proj_chhoeiuksrbzqtmfiuxd",
  runtime: "node",
  logLevel: "info",
  maxDuration: 3600,
  retries: { enabledInDev: true, default: { maxAttempts: 3 } },
  dirs: ["./src/trigger"],
  build: {
    extensions: [
      additionalFiles({
        files: ["./data/plant/**", "./data/fallback/latest_window.json"],
      }),
    ],
  },
});
