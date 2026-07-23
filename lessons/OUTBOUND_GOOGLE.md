# PlantOS outbound — Google suite

Extends Slack-first outbound. **Google is off unless `PLANTOS_OUTBOUND_GOOGLE=true`.** Slack, chat, canvas, and ClickHouse paths are unchanged when Google is off.

## Isolation

| Layer | Rule |
|-------|------|
| Flags | Master `PLANTOS_OUTBOUND_ENABLED` + `PLANTOS_OUTBOUND_GOOGLE` + optional per-connector flags |
| Code | `pipedream-google.ts`, `actions-outbound-google.ts`, `trigger/outbound-google.ts`, `pack.ts` — not imported by `plant-agent` |
| Slack | `pipedream.ts` / `outbound-slack.ts` / `startOutboundSlackSend` unchanged in behavior |
| UI | Google buttons show **Off** until Google flag is on; Slack button keeps working |

## Enable

1. Keep Slack working as today.
2. In `.env.local` + Trigger dashboard add:
   ```
   PLANTOS_OUTBOUND_GOOGLE=true
   PLANTOS_GMAIL_TO=you@example.com
   PLANTOS_GOOGLE_DRIVE_FOLDER_ID=   # optional demo folder
   ```
3. Restart Next + Trigger.
4. Share bar → Connect Gmail / Sheets / Docs / Slides (Pipedream Connect Link per app).
5. Pin charts → confirm send.

## Artifacts

| Connector | Output |
|-----------|--------|
| **Sheets** | Spreadsheet with **Summary** (4 lines/chart) + **Raw** (series rows) |
| **Docs** | Doc with 4-line narrative per chart |
| **Gmail** | Email to `PLANTOS_GMAIL_TO` with same narrative + PNG attachments when capture works |
| **Slides** | Presentation (one slide slot per chart); open link from Share bar |

## Safety

- Destinations from **server env only** (no client-supplied to-address / folder).
- Intent ledger + Trigger tasks; fail-soft; no plant-agent tools.
- Feature off ⇒ Google buttons disabled; Slack unaffected.
