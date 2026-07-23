import { PipedreamClient } from "@pipedream/sdk";
import { requireOutboundConfig, type OutboundEnv } from "./config";

let client: PipedreamClient | null = null;

export function getPipedreamClient(): PipedreamClient {
  const cfg = requireOutboundConfig();
  if (!client) {
    client = new PipedreamClient({
      projectId: cfg.projectId,
      projectEnvironment: cfg.projectEnvironment as OutboundEnv,
      clientId: cfg.clientId,
      clientSecret: cfg.clientSecret,
    });
  }
  return client;
}

export type SafeAccount = {
  id: string;
  name?: string | null;
  appSlug?: string | null;
};

/** List connected accounts for the demo operator — Slack only. */
export async function listSlackAccounts(): Promise<SafeAccount[]> {
  const cfg = requireOutboundConfig();
  const pd = getPipedreamClient();
  // Prefer accounts.list — listByExternalUser 404s on some Connect project shapes.
  const page = await pd.accounts.list({
    externalUserId: cfg.externalUserId,
    app: "slack",
  });
  const rows: Array<{ id: string; name?: string; app?: { nameSlug?: string } }> = [];
  if (page && typeof (page as { [Symbol.asyncIterator]?: unknown })[Symbol.asyncIterator] === "function") {
    for await (const item of page as AsyncIterable<{ id: string; name?: string; app?: { nameSlug?: string } }>) {
      rows.push(item);
    }
  } else {
    const data = (page as { data?: typeof rows }).data;
    if (Array.isArray(data)) rows.push(...data);
  }
  return rows.map((a) => ({
    id: a.id,
    name: a.name ?? null,
    appSlug: a.app?.nameSlug || "slack",
  }));
}

export async function createConnectLink(appSlug = "slack"): Promise<{
  token: string;
  expiresAt?: string | null;
  connectLinkUrl: string;
}> {
  const cfg = requireOutboundConfig();
  const pd = getPipedreamClient();
  const origins = cfg.allowedOrigins.length
    ? cfg.allowedOrigins
    : ["http://localhost:3000", "http://localhost:3001"];

  const tokenRes = await pd.tokens.create({
    externalUserId: cfg.externalUserId,
    allowedOrigins: origins,
  });

  const token = tokenRes.token;
  // Always force Slack-only Connect Link (SDK URL may omit app=)
  const base =
    tokenRes.connectLinkUrl ||
    `https://pipedream.com/_static/connect.html?token=${encodeURIComponent(token)}&connectLink=true`;
  const connectUrl = new URL(base);
  connectUrl.searchParams.set("connectLink", "true");
  connectUrl.searchParams.set("app", appSlug);
  if (!connectUrl.searchParams.get("token")) {
    connectUrl.searchParams.set("token", token);
  }

  return {
    token,
    expiresAt: tokenRes.expiresAt ? String(tokenRes.expiresAt) : null,
    connectLinkUrl: connectUrl.toString(),
  };
}

export async function disconnectAccount(accountId: string): Promise<void> {
  requireOutboundConfig();
  const pd = getPipedreamClient();
  await pd.accounts.delete(accountId);
}

/**
 * Deterministic Slack send via Connect Actions (button-gated allowlist).
 * Working prop for Connect Slack app: `conversation` (channel id), not `channel`.
 * Pipedream may return HTTP 200 with `error` in the body — treat that as failure.
 */
export async function runSlackSendMessage(opts: {
  accountId: string;
  channel: string;
  text: string;
}): Promise<{ ok: true; raw: unknown; messageTs?: string; channel?: string } | { ok: false; error: string; uncertain?: boolean }> {
  const cfg = requireOutboundConfig();
  const pd = getPipedreamClient();
  try {
    const result = await pd.actions.run({
      id: cfg.slackSendActionId,
      externalUserId: cfg.externalUserId,
      configuredProps: {
        slack: { authProvisionId: opts.accountId },
        conversation: opts.channel,
        text: opts.text,
      },
    });
    const raw = result as Record<string, unknown>;
    const embeddedError =
      (raw?.error as { message?: string } | undefined)?.message ||
      (
        (raw?.os as Array<{ k?: string; err?: { message?: string } }> | undefined)?.find((o) => o.k === "error")
          ?.err?.message
      );
    if (embeddedError) {
      return { ok: false, error: embeddedError };
    }

    const exports = (raw?.exports || {}) as Record<string, unknown>;
    const messageTs =
      (exports?.ts as string | undefined) ||
      (exports?.message_ts as string | undefined) ||
      ((exports?.message as { ts?: string } | undefined)?.ts) ||
      ((exports?.$return_value as { ts?: string } | undefined)?.ts);
    const channel =
      (exports?.channel as string | undefined) ||
      ((exports?.message as { channel?: string } | undefined)?.channel) ||
      ((exports?.$return_value as { channel?: string } | undefined)?.channel) ||
      opts.channel;
    return { ok: true, raw: result, messageTs, channel };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const uncertain = /timeout|ECONNRESET|network|503|502/i.test(msg);
    return { ok: false, error: msg, uncertain };
  }
}

export async function runSlackDeleteMessage(opts: {
  accountId: string;
  channel: string;
  ts: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const cfg = requireOutboundConfig();
  const pd = getPipedreamClient();
  try {
    // Prefer Connect proxy — more reliable than guessing delete action props.
    const proxy = (await pd.proxy.post({
      externalUserId: cfg.externalUserId,
      accountId: opts.accountId,
      url: "https://slack.com/api/chat.delete",
      body: { channel: opts.channel, ts: opts.ts },
    })) as { ok?: boolean; error?: string };
    if (proxy && proxy.ok === false) {
      return { ok: false, error: proxy.error || "chat.delete failed" };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

type SlackUploadUrlResponse = {
  ok?: boolean;
  error?: string;
  upload_url?: string;
  file_id?: string;
};

type SlackCompleteUploadResponse = {
  ok?: boolean;
  error?: string;
  files?: Array<{
    id?: string;
    shares?: {
      public?: Record<string, Array<{ ts?: string }>>;
      private?: Record<string, Array<{ ts?: string }>>;
    };
  }>;
};

/**
 * Upload chart PNGs via Slack external upload API (files:write).
 * Each image is completed separately so it can carry its own 2-line caption.
 * Binary POST to upload_url goes direct to Slack — not through Pipedream.
 */
export async function uploadSlackImages(opts: {
  accountId: string;
  channel: string;
  images: Array<{
    filename: string;
    buffer: Buffer;
    title?: string;
    /** Slack initial_comment shown with this file */
    comment?: string;
  }>;
}): Promise<
  | { ok: true; fileIds: string[]; messageTs?: string; raw?: unknown }
  | { ok: false; error: string; uncertain?: boolean; fileIds?: string[] }
> {
  const cfg = requireOutboundConfig();
  const pd = getPipedreamClient();
  const images = opts.images.slice(0, 4);
  if (images.length === 0) {
    return { ok: false, error: "no_images" };
  }

  const fileIds: string[] = [];
  let messageTs: string | undefined;
  let lastRaw: unknown;

  try {
    for (const img of images) {
      const meta = (await pd.proxy.post({
        externalUserId: cfg.externalUserId,
        accountId: opts.accountId,
        url: "https://slack.com/api/files.getUploadURLExternal",
        // Slack + Pipedream Connect: required fields must be query params (JSON body is ignored).
        body: {},
        params: {
          filename: img.filename,
          length: String(img.buffer.length),
        },
      })) as SlackUploadUrlResponse;

      if (!meta?.ok || !meta.upload_url || !meta.file_id) {
        return {
          ok: false,
          error: meta?.error || "files.getUploadURLExternal failed",
          fileIds,
        };
      }

      const put = await fetch(meta.upload_url, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: new Uint8Array(img.buffer),
      });
      if (!put.ok) {
        const detail = await put.text().catch(() => "");
        return {
          ok: false,
          error: `upload_url HTTP ${put.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`,
          fileIds,
        };
      }

      const title = img.title || img.filename.replace(/\.png$/i, "");
      const complete = (await pd.proxy.post({
        externalUserId: cfg.externalUserId,
        accountId: opts.accountId,
        url: "https://slack.com/api/files.completeUploadExternal",
        body: {
          files: [{ id: meta.file_id, title }],
          channel_id: opts.channel,
          ...(img.comment ? { initial_comment: img.comment } : {}),
        },
      })) as SlackCompleteUploadResponse;

      if (!complete?.ok) {
        return {
          ok: false,
          error: complete?.error || "files.completeUploadExternal failed",
          fileIds,
        };
      }

      fileIds.push(meta.file_id);
      lastRaw = complete;
      if (!messageTs) {
        for (const f of complete.files || []) {
          const pubs =
            f.shares?.public?.[opts.channel] || f.shares?.private?.[opts.channel] || [];
          if (pubs[0]?.ts) {
            messageTs = pubs[0].ts;
            break;
          }
        }
      }
    }

    return { ok: true, fileIds, messageTs, raw: lastRaw };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const uncertain = /timeout|ECONNRESET|network|503|502/i.test(msg);
    return { ok: false, error: msg, uncertain, fileIds };
  }
}
