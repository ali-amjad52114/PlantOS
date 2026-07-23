/**
 * Outbound share config — isolated from chat/agent.
 * When disabled or misconfigured, PlantOS core stays unaffected.
 *
 * Slack and Google are independently gated so enabling Google never
 * changes Slack behavior, and Google code paths stay dormant when off.
 */

export type OutboundEnv = "development" | "production";

function flagOn(raw: string | undefined): boolean {
  const v = (raw || "").toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function hasPipedreamCreds(): boolean {
  return Boolean(
    process.env.PIPEDREAM_CLIENT_ID &&
      process.env.PIPEDREAM_CLIENT_SECRET &&
      (process.env.PIPEDREAM_PROJECT_ID || process.env.NEXT_PUBLIC_PIPEDREAM_PROJECT_ID)
  );
}

/** Master outbound kill switch + Pipedream credentials. */
export function isOutboundEnabled(): boolean {
  if (!flagOn(process.env.PLANTOS_OUTBOUND_ENABLED)) return false;
  return hasPipedreamCreds();
}

/** Google suite master switch (still requires isOutboundEnabled()). */
export function isGoogleOutboundEnabled(): boolean {
  if (!isOutboundEnabled()) return false;
  return flagOn(process.env.PLANTOS_OUTBOUND_GOOGLE);
}

export type GoogleConnector = "gmail" | "sheets" | "docs" | "slides";

/** Per-connector Google flags — default on when GOOGLE master is on, unless explicitly false. */
export function isGoogleConnectorEnabled(connector: GoogleConnector): boolean {
  if (!isGoogleOutboundEnabled()) return false;
  const key =
    connector === "gmail"
      ? "PLANTOS_OUTBOUND_GMAIL"
      : connector === "sheets"
        ? "PLANTOS_OUTBOUND_SHEETS"
        : connector === "docs"
          ? "PLANTOS_OUTBOUND_DOCS"
          : "PLANTOS_OUTBOUND_SLIDES";
  const raw = process.env[key];
  if (raw === undefined || raw === "") return true;
  return flagOn(raw);
}

/** Public-safe status for the UI (no secrets). */
export function outboundPublicConfig() {
  const enabled = isOutboundEnabled();
  const google = isGoogleOutboundEnabled();
  return {
    enabled,
    channelLabel: process.env.PLANTOS_SLACK_CHANNEL_LABEL || process.env.PLANTOS_SLACK_CHANNEL_ID || "#plantos-demo",
    channelId: process.env.PLANTOS_SLACK_CHANNEL_ID || "",
    google: {
      enabled: google,
      gmail: google && isGoogleConnectorEnabled("gmail"),
      sheets: google && isGoogleConnectorEnabled("sheets"),
      docs: google && isGoogleConnectorEnabled("docs"),
      slides: google && isGoogleConnectorEnabled("slides"),
      gmailTo: process.env.PLANTOS_GMAIL_TO || "",
      driveFolderConfigured: Boolean(process.env.PLANTOS_GOOGLE_DRIVE_FOLDER_ID),
    },
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

/** Google-only config — does not alter Slack requireOutboundConfig(). */
export function requireGoogleOutboundConfig(connector: GoogleConnector) {
  if (!isGoogleConnectorEnabled(connector)) {
    throw new Error(`Google outbound connector "${connector}" is disabled`);
  }
  // Reuse Pipedream project creds; Slack channel still required by master outbound today.
  const base = requireOutboundConfig();
  const gmailTo = (process.env.PLANTOS_GMAIL_TO || "").trim();
  const driveFolderId = (process.env.PLANTOS_GOOGLE_DRIVE_FOLDER_ID || "").trim();

  if (connector === "gmail" && !gmailTo) {
    throw new Error("PLANTOS_GMAIL_TO is required for Gmail outbound");
  }

  return {
    ...base,
    gmailTo,
    driveFolderId: driveFolderId || null,
    sheetsTemplateId: (process.env.PLANTOS_SHEETS_TEMPLATE_ID || "").trim() || null,
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
