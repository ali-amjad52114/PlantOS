# PlantOS outbound — Google suite (planned)

Extends the Slack-first outbound pattern. Same isolation: feature flag, Pipedream Connect, Trigger tasks, intent ledger. **Not implemented yet** — this is the safe design target.

## Product flow (Share bar)

| Button | Artifact | Content |
|--------|----------|---------|
| **Gmail** | Email to operator-chosen recipient(s) | Same narrative pack as Docs: ~4 takeaway lines per chart + chart PNGs attached (or linked from Drive) |
| **Sheets** | New spreadsheet (or append to fixed demo sheet) | **Tab `Raw`**: series / metric rows for each chart. **Tab `Summary`**: title + 4-line explanation per chart |
| **Docs** | New Google Doc report | Screenshot per chart + 4-line explanation each (same copy as Gmail body) |
| **Slides** | New presentation | One slide per chart: image left/full + explanation bullets |

Shared capture pipeline with Slack: canvas PNGs + insight captions (expand Slack’s 2 lines → **4 lines** for Google pack).

## Safety (non-negotiable)

1. **Off by default** — `PLANTOS_OUTBOUND_ENABLED` + per-connector flags (`PLANTOS_OUTBOUND_GMAIL`, `_SHEETS`, `_DOCS`, `_SLIDES`) or single `PLANTOS_OUTBOUND_GOOGLE=true`.
2. **Button-gated only** — never expose Google actions as free plant-agent / chat MCP tools.
3. **Connect Link per app** — `gmail`, `google_sheets`, `google_docs`, `google_slides` (or Drive if files land there first). Demo operator id only (`PLANTOS_PD_EXTERNAL_USER_ID`).
4. **Allowlisted destinations** — env-fixed recipient / folder / Drive parent id in v1 (same spirit as `PLANTOS_SLACK_CHANNEL_ID`). No arbitrary client-supplied destinations until authz exists.
5. **Intent ledger** — draft → approve → executing → succeeded|failed|uncertain; single-flight; no silent retries that duplicate emails/docs.
6. **Fail-soft** — Google errors never block plant chat, canvas, or ClickHouse reads.
7. **Secrets** — Pipedream + Google tokens only in `.env.local` / Trigger dashboard; never `NEXT_PUBLIC_`.
8. **Scopes least-privilege** — send mail / create file in a demo folder only; prefer Drive file create in a known folder over full Drive.

## Suggested build order

1. **Shared pack builder** — `buildOutboundPack(pins)` → `{ charts: [{ png, title, lines[4], seriesRows[] }] }` used by all connectors.
2. **Sheets** — easiest structured proof (Raw + Summary tabs).
3. **Docs** — report = Summary prose + embedded images (images via Drive upload then Doc insert, or Docs API inline).
4. **Gmail** — body = Docs narrative; attachments = PNGs (and optional Sheets/Doc links).
5. **Slides** — one slide/chart from the same pack.

Each connector = own Trigger task (`outbound-sheets-send`, etc.) mirroring `outbound-slack-send`.

## Env sketch (placeholders)

```
PLANTOS_OUTBOUND_GOOGLE=false
PLANTOS_GOOGLE_DRIVE_FOLDER_ID=
PLANTOS_GMAIL_TO=
# optional fixed spreadsheet template id
PLANTOS_SHEETS_TEMPLATE_ID=
```

## Isolation paths (when built)

- `src/lib/outbound/pack.ts` — shared pack + 4-line insights + raw series export  
- `src/trigger/outbound-{gmail,sheets,docs,slides}.ts`  
- Share bar: replace stubs with Connect + preview + confirm (same UX as Slack)
