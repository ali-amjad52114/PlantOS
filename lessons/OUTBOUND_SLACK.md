# PlantOS outbound share (Slack-first)

Isolated feature behind `PLANTOS_OUTBOUND_ENABLED`. When off or misconfigured, chat/canvas/ClickHouse paths are unchanged and the Share bar does not appear.

## Enable (local)

1. Copy [`.env.outbound.example`](../.env.outbound.example) values into `.env.local` and Trigger.dev dashboard env.
2. Set Pipedream OAuth client + project id; environment `development` or `production`.
3. Set `PLANTOS_SLACK_CHANNEL_ID` to a real channel id the connected Slack bot can post to.
4. Set `PLANTOS_OUTBOUND_ENABLED=true`.
5. Restart Next (`npm run dev`) and Trigger (`npm run dev:trigger`).

## Demo flow

1. Open PlantOS → canvas Share bar appears.
2. **Connect Slack** → Pipedream Connect Link (app=slack only).
3. Pin charts → **Send to Slack** → preview → Confirm.
4. Confirm captures up to 4 canvas chart PNGs (with a 2-line caption each: title + hint/value). Trigger posts a short opener, then uploads each chart with its caption as Slack `initial_comment`. Text-only fallback if capture/upload fails.
5. Progress shows on the bar (`capturing` → `uploading` / `sending`). Undo deletes the message when a receipt `ts` exists (file-only shares may not undo).

## Isolation

- Code: `src/lib/outbound/*`, `src/app/api/outbound/*`, `src/app/actions-outbound.ts`, `src/trigger/outbound-slack.ts`, `src/components/outbound-share-bar.tsx`
- Does **not** modify `plant-agent` tools or chat transport.
- Intent ledger: `data/outbound/intents.json` (gitignored).
