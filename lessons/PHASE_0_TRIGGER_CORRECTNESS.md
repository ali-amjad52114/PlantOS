# Phase 0 — Trigger correctness (no bloat)

**Status:** PASS (package complete). Next: Phase 1 streamed visuals — separate agent run.  
**Context:** External Trigger critique + `REALTIME_VS_CHAT_STREAM.md` + product lock.

## Goal
One authoritative replay writer, current SDK imports, Deterministic/HTTP path not pretending to be Trigger, zero new product surface.

## DO
1. Replace `@trigger.dev/sdk/v3` → `@trigger.dev/sdk` in task files (`plant-investigate`, `plant-replay`, route, parallel).
2. **Single replay writer:** Trigger `plant-replay-tick` (and agent `advanceReplay` / Reset one-shot) only. Browser **observes** via `/api/plant/live` poll — no automatic `POST … tick`.
3. Harden `tickReplay`: concurrencyLimit 1 on the schedule task; skip `original_ts` batches already present as `source='live'` (idempotent insert).
4. Keep Start/Pause/Reset/Speed as control-plane only (they must not become a second continuous writer).
5. Remove HTTP investigate button from primary UI — Trigger Realtime only for investigate.
6. Update `PLANTOS_STATUS.md` with Phase 0 proof.
7. Capture learnings below.

## DO NOT
1. Do **not** start Phase 1 (custom data parts / Lovable card streaming) in this package.
2. Do **not** add `withClientData`, dynamic tools, lifecycle hooks, chat actions, or Realtime replay UI chrome.
3. Do **not** rewrite `chat.agent`, Ask-agent stream UX, or Lovable card catalog.
4. Do **not** add a second background ticker in the browser “just for LIVE feel.”
5. Do **not** delete history data or run destructive CH cleanup beyond preventing new duplicates.
6. Do **not** expand roles, pages, or dependencies.

## Measure of success (DoD)
- [x] No `from "@trigger.dev/sdk/v3"` under `plantos/src/trigger/`
- [x] `page.tsx` polls live status only; no interval calling replay `tick`
- [x] `plant-replay-tick` uses `@trigger.dev/sdk` + `queue: { concurrencyLimit: 1 }`
- [x] Re-entrant `tickReplay` skips `original_ts` already present as live
- [x] `tsc --noEmit` clean
- [x] Investigate = Trigger Realtime / Route / Parallel only (HTTP fallback button removed)
- [x] Status board notes Phase 0 PASS

## Out of scope → later packages
| Phase | Theme |
|-------|--------|
| 1 | Chat custom data parts → Lovable card towers in durable history |
| 2 | Louder parallel progress into chat root |
| 3 | Realtime metadata on replay runs / denser Trigger ticks |
| 4+ | clientData, dynamic tools, hooks, actions |

## Learning (capture)
- Dual writers (browser tick + cron) are a Trigger *demo smell*: looks like “we use schedules” while the UI is the real clock — and it duplicates ClickHouse live rows.
- Claiming Deterministic/HTTP Ask as Trigger orchestration is false; remove or label honestly.
- Do not conflate schedule ownership with Realtime UI (`REALTIME_VS_CHAT_STREAM.md`).
- **Phase 0 tradeoff:** continuous browser tick removed → LIVE cadence follows cron (~1 min) unless Reset one-shots. Faster LIVE without dual writers belongs in Phase 3, not a second browser writer.
