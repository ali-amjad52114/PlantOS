/**
 * Smoke: Google outbound config + optional Sheets create via Pipedream.
 * Never prints secret values.
 *
 * Usage: node scripts/smoke-google-outbound.mjs
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
loadEnv(".env.outbound.example");

function on(raw) {
  const v = (raw || "").toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

const report = {
  outboundEnabled: on(process.env.PLANTOS_OUTBOUND_ENABLED),
  googleEnabled: on(process.env.PLANTOS_OUTBOUND_GOOGLE),
  hasPipedream:
    Boolean(process.env.PIPEDREAM_CLIENT_ID) &&
    Boolean(process.env.PIPEDREAM_CLIENT_SECRET) &&
    Boolean(process.env.PIPEDREAM_PROJECT_ID || process.env.NEXT_PUBLIC_PIPEDREAM_PROJECT_ID),
  gmailToSet: Boolean((process.env.PLANTOS_GMAIL_TO || "").trim()),
  gmailToDomain: (() => {
    const t = (process.env.PLANTOS_GMAIL_TO || "").trim();
    const at = t.lastIndexOf("@");
    return at > 0 ? t.slice(at) : null;
  })(),
  driveFolderSet: Boolean((process.env.PLANTOS_GOOGLE_DRIVE_FOLDER_ID || "").trim()),
  driveFolderTail: (process.env.PLANTOS_GOOGLE_DRIVE_FOLDER_ID || "").trim().slice(-6) || null,
  externalUserId: process.env.PLANTOS_PD_EXTERNAL_USER_ID || null,
  envSource: existsSync(".env.local") ? ".env.local(+example fallback)" : ".env.outbound.example only",
};

console.log("CONFIG", JSON.stringify(report, null, 2));

if (!report.hasPipedream || !report.outboundEnabled) {
  console.error("FAIL | need PLANTOS_OUTBOUND_ENABLED=true and Pipedream creds in .env.local");
  process.exit(1);
}

if (!report.googleEnabled) {
  console.error("FAIL | set PLANTOS_OUTBOUND_GOOGLE=true in .env.local (and Trigger dashboard)");
  process.exit(1);
}

const pd = new PipedreamClient({
  projectId: process.env.PIPEDREAM_PROJECT_ID || process.env.NEXT_PUBLIC_PIPEDREAM_PROJECT_ID,
  projectEnvironment: process.env.PIPEDREAM_PROJECT_ENVIRONMENT || "development",
  clientId: process.env.PIPEDREAM_CLIENT_ID,
  clientSecret: process.env.PIPEDREAM_CLIENT_SECRET,
});

const uid = process.env.PLANTOS_PD_EXTERNAL_USER_ID || "plantos:demo:operator";
const apps = [
  ["sheets", "google_sheets"],
  ["docs", "google_docs"],
  ["slides", "google_slides"],
  ["gmail", "gmail"],
];

const connected = {};
for (const [name, app] of apps) {
  try {
    const page = await pd.accounts.list({ externalUserId: uid, app });
    let id = null;
    if (page && typeof page[Symbol.asyncIterator] === "function") {
      for await (const a of page) {
        id = a.id;
        break;
      }
    } else if (Array.isArray(page?.data) && page.data[0]) {
      id = page.data[0].id;
    }
    connected[name] = id ? { ok: true, accountTail: String(id).slice(-6) } : { ok: false };
  } catch (e) {
    connected[name] = { ok: false, error: String(e?.message || e).slice(0, 120) };
  }
}
console.log("CONNECTED", JSON.stringify(connected, null, 2));

const sheetsAccount = connected.sheets?.ok
  ? (
      await (async () => {
        const page = await pd.accounts.list({ externalUserId: uid, app: "google_sheets" });
        for await (const a of page) return a.id;
        return null;
      })()
    )
  : null;

if (!sheetsAccount) {
  console.log(
    "SKIP_SHEETS_CREATE | Connect Google Sheets from the Share bar first, then re-run this smoke."
  );
  process.exit(0);
}

const title = `PlantOS smoke ${new Date().toISOString()}`;
try {
  const created = await pd.proxy.post({
    externalUserId: uid,
    accountId: sheetsAccount,
    url: "https://sheets.googleapis.com/v4/spreadsheets",
    body: {
      properties: { title },
      sheets: [
        { properties: { title: "Summary", index: 0 } },
        { properties: { title: "Raw", index: 1 } },
      ],
    },
  });
  const spreadsheetId = created?.spreadsheetId;
  if (!spreadsheetId) {
    console.error("FAIL_CREATE", JSON.stringify(created).slice(0, 400));
    process.exit(1);
  }

  await pd.proxy.post({
    externalUserId: uid,
    accountId: sheetsAccount,
    url: `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    body: {
      valueInputOption: "RAW",
      data: [
        {
          range: "Summary!A1",
          values: [
            ["Chart", "Line1", "Line2", "Line3", "Line4"],
            [
              "Shift throughput",
              "Smoke: actual above target in window.",
              "Latest reading ~348 MW.",
              "Chart focus: vs target line.",
              "Ops snapshot only — verify live alarms.",
            ],
          ],
        },
        {
          range: "Raw!A1",
          values: [
            ["Chart", "t", "v", "unit"],
            ["Shift throughput", "t0", "340", "MW"],
            ["Shift throughput", "t1", "348", "MW"],
          ],
        },
      ],
    },
  });

  const folder = (process.env.PLANTOS_GOOGLE_DRIVE_FOLDER_ID || "").trim();
  let moved = false;
  if (folder) {
    try {
      await pd.proxy.post({
        externalUserId: uid,
        accountId: sheetsAccount,
        url: `https://www.googleapis.com/drive/v3/files/${spreadsheetId}?addParents=${encodeURIComponent(folder)}&removeParents=root`,
        body: {},
      });
      moved = true;
    } catch (e) {
      console.log("MOVE_FOLDER_WARN", String(e?.message || e).slice(0, 160));
    }
  }

  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  console.log(
    "PASS_SHEETS",
    JSON.stringify({
      spreadsheetTail: String(spreadsheetId).slice(-8),
      url,
      movedToFolder: moved,
    })
  );
} catch (e) {
  console.error("FAIL_SHEETS", String(e?.message || e).slice(0, 300));
  process.exit(1);
}
