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

const pd = new PipedreamClient({
  projectId: process.env.PIPEDREAM_PROJECT_ID,
  projectEnvironment: process.env.PIPEDREAM_PROJECT_ENVIRONMENT,
  clientId: process.env.PIPEDREAM_CLIENT_ID,
  clientSecret: process.env.PIPEDREAM_CLIENT_SECRET,
});

const uid = process.env.PLANTOS_PD_EXTERNAL_USER_ID;
const channel = process.env.PLANTOS_SLACK_CHANNEL_ID;
const page = await pd.accounts.list({ externalUserId: uid, app: "slack" });
let accountId;
for await (const a of page) {
  accountId = a.id;
  break;
}
console.log("account", accountId, "channel", channel?.slice(-4));

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

const meta = await pd.proxy.post({
  externalUserId: uid,
  accountId,
  url: "https://slack.com/api/files.getUploadURLExternal",
  body: {},
  params: { filename: "plantos-smoke.png", length: String(png.length) },
});
console.log("getUploadURL params", JSON.stringify(meta).slice(0, 400));

let meta2 = meta;
if (!meta?.ok) {
  meta2 = await pd.proxy.post({
    externalUserId: uid,
    accountId,
    url: "https://slack.com/api/files.getUploadURLExternal",
    body: { filename: "plantos-smoke.png", length: png.length },
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  console.log("getUploadURL form", JSON.stringify(meta2).slice(0, 400));
}

if (!meta2?.ok) {
  // try GET with params
  meta2 = await pd.proxy.get({
    externalUserId: uid,
    accountId,
    url: "https://slack.com/api/files.getUploadURLExternal",
    params: { filename: "plantos-smoke.png", length: String(png.length) },
  });
  console.log("getUploadURL get", JSON.stringify(meta2).slice(0, 400));
}

if (!meta2?.ok) process.exit(1);

const put = await fetch(meta2.upload_url, {
  method: "POST",
  headers: { "Content-Type": "application/octet-stream" },
  body: png,
});
console.log("put", put.status, await put.text().catch(() => ""));

const complete = await pd.proxy.post({
  externalUserId: uid,
  accountId,
  url: "https://slack.com/api/files.completeUploadExternal",
  body: {
    files: [{ id: meta2.file_id, title: "PlantOS smoke chart" }],
    channel_id: channel,
    initial_comment: "PlantOS chart-upload smoke " + Date.now(),
  },
});
console.log("complete body", JSON.stringify(complete).slice(0, 800));

if (!complete?.ok) {
  const complete2 = await pd.proxy.post({
    externalUserId: uid,
    accountId,
    url: "https://slack.com/api/files.completeUploadExternal",
    body: {},
    params: {
      files: JSON.stringify([{ id: meta2.file_id, title: "PlantOS smoke chart" }]),
      channel_id: channel,
      initial_comment: "PlantOS chart-upload smoke params " + Date.now(),
    },
  });
  console.log("complete params", JSON.stringify(complete2).slice(0, 800));
}