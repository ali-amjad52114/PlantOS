import { task, logger } from "@trigger.dev/sdk";

/**
 * Smoke probe: reports which outbound env keys are present in the Trigger worker.
 * Never logs secret values.
 */
export const outboundEnvProbe = task({
  id: "outbound-env-probe",
  maxDuration: 30,
  retry: { maxAttempts: 1 },
  run: async () => {
    const keys = [
      "PLANTOS_OUTBOUND_ENABLED",
      "PIPEDREAM_CLIENT_ID",
      "PIPEDREAM_CLIENT_SECRET",
      "PIPEDREAM_PROJECT_ID",
      "PIPEDREAM_PROJECT_ENVIRONMENT",
      "PLANTOS_PD_EXTERNAL_USER_ID",
      "PLANTOS_SLACK_CHANNEL_ID",
      "PLANTOS_SLACK_CHANNEL_LABEL",
    ] as const;

    const present: Record<string, boolean> = {};
    for (const k of keys) {
      const v = process.env[k];
      present[k] = Boolean(v && String(v).trim().length > 0);
    }

    const enabledRaw = (process.env.PLANTOS_OUTBOUND_ENABLED || "").toLowerCase();
    const enabledFlag = enabledRaw === "1" || enabledRaw === "true" || enabledRaw === "yes";
    const envName = process.env.PIPEDREAM_PROJECT_ENVIRONMENT || null;
    const channelEnds = process.env.PLANTOS_SLACK_CHANNEL_ID
      ? String(process.env.PLANTOS_SLACK_CHANNEL_ID).slice(-4)
      : null;
    const externalUserId = process.env.PLANTOS_PD_EXTERNAL_USER_ID || null;

    const missing = keys.filter((k) => !present[k]);
    const ok = missing.length === 0 && enabledFlag;

    logger.info("outbound env probe", { ok, missing, enabledFlag, envName, channelEnds });

    return {
      ok,
      enabledFlag,
      envName,
      channelEnds,
      externalUserId,
      present,
      missing,
    };
  },
});
