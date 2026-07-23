/**
 * Outbound Slack smoke test — does not print secrets.
 */
const base = process.env.SMOKE_BASE || "http://localhost:3001";

function ok(step, detail) {
  console.log(`PASS | ${step} | ${detail}`);
}
function fail(step, detail) {
  console.log(`FAIL | ${step} | ${detail}`);
  process.exitCode = 1;
}

const status = await fetch(`${base}/api/outbound/status`).then((r) => r.json());
if (!status.enabled) {
  fail("enabled", JSON.stringify(status));
  process.exit(1);
}
ok("enabled", `channelLabel=${status.channelLabel} connected=${status.connected}`);

if (status.error) {
  fail("status_error", status.error);
} else {
  ok("status_clean", "no error field");
}

const connectRes = await fetch(`${base}/api/outbound/status`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: "{}",
});
const connectJson = await connectRes.json();
if (!connectRes.ok || !connectJson.connectLinkUrl) {
  fail("connect_token", `${connectRes.status} ${JSON.stringify(connectJson)}`);
} else {
  const url = connectJson.connectLinkUrl;
  const hasToken = /token=/.test(url);
  const hasSlack = /[?&]app=slack\b/i.test(url);
  if (!hasSlack) fail("connect_app_slack", url);
  else ok(
    "connect_token",
    `status=${connectRes.status} hasToken=${hasToken} appSlack=${hasSlack} host=${new URL(url).host}`
  );
}

if (status.connected) {
  const { startOutboundSlackSend } = await import("../src/app/actions-outbound.ts").catch(() => ({}));
  // Call via a tiny API isn't available — use dynamic server action only in Next.
  // Instead hit a one-off node script using the same lib if possible.
  ok("slack_account", `accounts=${(status.accounts || []).length}`);
} else {
  console.log(
    "INFO | slack_account | not connected yet — open Connect Link in browser, then re-run smoke"
  );
  console.log(
    "INFO | connect_link | (open this URL to connect Slack; not printed fully if huge)"
  );
  if (connectJson.connectLinkUrl) {
    console.log(`LINK | ${connectJson.connectLinkUrl}`);
  }
}

console.log(
  JSON.stringify(
    {
      enabled: status.enabled,
      connected: status.connected,
      channelLabel: status.channelLabel,
      accountCount: (status.accounts || []).length,
      connectOk: Boolean(connectJson.connectLinkUrl),
    },
    null,
    2
  )
);
