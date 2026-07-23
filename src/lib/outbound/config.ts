/**
 * Outbound share config — isolated from chat/agent.
 * When disabled or misconfigured, PlantOS core stays unaffected.
 */

export type OutboundEnv = "development" | "production";

export function isOutboundEnabled(): boolean {
  const flag = (process.env.PLANTOS_OUTBOUND_ENABLED || "").toLowerCase();
  if (flag !== "1" && flag !== "true" && flag !== "yes") return false;
  return Boolean(
    process.env.PIPEDREAM_CLIENT_ID &&
      process.env.PIPEDREAM_CLIENT_SECRET &&
      (process.env.PIPEDREAM_PROJECT_ID || process.env.NEXT_PUBLIC_PIPEDREAM_PROJECT_ID)
  );
}

/** Public-safe status for the UI (no secrets). */
export function outboundPublicConfig() {
  const enabled = isOutboundEnabled();
  return {
    enabled,
    channelLabel: process.env.PLANTOS_SLACK_CHANNEL_LABEL || process.env.PLANTOS_SLACK_CHANNEL_ID || "#plantos-demo",
    channelId: process.env.PLANTOS_SLACK_CHANNEL_ID || "",
    stubs: ["gmail.send_email", "gdrive.create_pptx", "gdrive.create_xlsx", "gdrive.create_docx"] as const,
  };
}

export function requireOutboundConfig() {
  if (!isOutboundEnabled()) {
    throw new Error("Outbound is disabled or Pipedream credentials are missing");
  }
  const projectId = process.env.PIPEDREAM_PROJECT_ID || process.env.NEXT_PUBLIC_PIPEDREAM_PROJECT_ID;
  const clientId = process.env.PIPEDREAM_CLIENT_ID;
  const clientSecret = process.env.PIPEDREAM_CLIENT_SECRET;
  const projectEnvironment = (process.env.PIPEDREAM_PROJECT_ENVIRONMENT ||
    process.env.PIPEDREAM_ENVIRONMENT ||
    "development") as OutboundEnv;
  const externalUserId = process.env.PLANTOS_PD_EXTERNAL_USER_ID || "plantos:demo:operator";
  const channelId = process.env.PLANTOS_SLACK_CHANNEL_ID;
  const channelLabel =
    process.env.PLANTOS_SLACK_CHANNEL_LABEL || channelId || "#plantos-demo";

  if (!projectId || !clientId || !clientSecret) {
    throw new Error("Pipedream project/client credentials incomplete");
  }
  if (!channelId) {
    throw new Error("PLANTOS_SLACK_CHANNEL_ID is required when outbound is enabled");
  }
  if (projectEnvironment !== "development" && projectEnvironment !== "production") {
    throw new Error("PIPEDREAM_PROJECT_ENVIRONMENT must be development or production");
  }

  return {
    projectId,
    clientId,
    clientSecret,
    projectEnvironment,
    externalUserId,
    channelId,
    channelLabel,
    allowedOrigins: parseOrigins(process.env.PIPEDREAM_ALLOWED_ORIGINS),
    /** Allowlisted Connect action keys — never accept from the browser. */
    slackSendActionId: process.env.PLANTOS_SLACK_SEND_ACTION_ID || "slack-send-message-to-channel",
    slackDeleteActionId: process.env.PLANTOS_SLACK_DELETE_ACTION_ID || "slack-delete-message",
    mcpHost: process.env.PIPEDREAM_MCP_HOST || "https://remote.mcp.pipedream.net",
  };
}

function parseOrigins(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    /* comma-separated */
  }
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
