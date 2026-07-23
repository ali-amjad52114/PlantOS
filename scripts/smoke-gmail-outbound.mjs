/**
 * Smoke: send one Gmail via Pipedream Connect.
 * Usage: node scripts/smoke-gmail-outbound.mjs
 */
import { readFileSync, existsSync } from "fs";
import { PipedreamClient } from "@pipedream/sdk";

function loadEnv(p) {
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnv(".env.local");

const to = (process.env.PLANTOS_GMAIL_TO || "").trim();
if (!to) {
  console.error("FAIL | PLANTOS_GMAIL_TO missing in .env.local");
  process.exit(1);
}

const pd = new PipedreamClient({
  projectId: process.env.PIPEDREAM_PROJECT_ID,
  projectEnvironment: process.env.PIPEDREAM_PROJECT_ENVIRONMENT || "development",
  clientId: process.env.PIPEDREAM_CLIENT_ID,
  clientSecret: process.env.PIPEDREAM_CLIENT_SECRET,
});

const uid = process.env.PLANTOS_PD_EXTERNAL_USER_ID || "plantos:demo:operator";
const page = await pd.accounts.list({ externalUserId: uid, app: "gmail" });
let accountId = null;
for await (const a of page) {
  accountId = a.id;
  break;
}
if (!accountId) {
  console.error("FAIL | no Gmail account connected");
  process.exit(1);
}

const subject = `PlantOS Gmail smoke ${new Date().toISOString()}`;
const body = [
  "PlantOS Gmail smoke test",
  "",
  "1. Shift throughput",
  "   Actual is running above the target line over this window.",
  "   Latest reading ~348 MW; trend holding steady.",
  "   Chart focus: vs target line.",
  "   Ops snapshot only — verify live alarms before acting.",
  "",
  "If you see this, Gmail outbound auth works.",
].join("\n");

const rawMime = [
  `To: ${to}`,
  `Subject: ${subject}`,
  "MIME-Version: 1.0",
  'Content-Type: text/plain; charset="UTF-8"',
  "",
  body,
].join("\r\n");

const raw = Buffer.from(rawMime)
  .toString("base64")
  .replace(/\+/g, "-")
  .replace(/\//g, "_")
  .replace(/=+$/, "");

try {
  const sent = await pd.proxy.post({
    externalUserId: uid,
    accountId,
    url: "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    body: { raw },
  });
  const err =
    (typeof sent?.error === "string" && sent.error) ||
    sent?.error?.message ||
    null;
  console.log(
    JSON.stringify(
      {
        toDomain: "@" + to.split("@").slice(-1)[0],
        accountTail: String(accountId).slice(-6),
        id: sent?.id || null,
        labelIds: sent?.labelIds || null,
        error: err,
        rawSlice: JSON.stringify(sent).slice(0, 500),
      },
      null,
      2
    )
  );
  if (err || !sent?.id) {
    process.exit(1);
  }
  console.log("PASS_GMAIL | check inbox (+ spam) for:", subject);
} catch (e) {
  console.error("FAIL", e?.statusCode, String(e?.message || e).slice(0, 500));
  process.exit(1);
}
