# Phase 3 — Replay Realtime + denser Trigger ticks

**Status:** PASS  
**Depends on:** Phase 0 PASS (single writer), Phase 1 PASS (orthogonal)  
**Context:** Phase 0 tradeoff — LIVE cadence followed cron (~1 min). Critique: make the Trigger writer denser and observable via Realtime metadata.

## Goal
Keep **one continuous writer** (Trigger). Make ticks denser inside Trigger runs, and surface run health (status, cursor, inserted, speed) in the UI via `useRealtimeRun` — same pattern as investigate. No browser tick writer.

## DO
1. Harden `plant-replay-tick` schedule: denser ticks inside one cron run (`wait.for` between sub-ticks), shared queue `concurrencyLimit: 1`.
2. Rich `metadata.set` each sub-tick: status, progress, tickIndex, insertedRows, lastOriginal / cursor, playing, speed.
3. Add on-demand `plant-replay-burst` task (same dense loop) for Start → immediate freshness + Realtime subscribe handle.
4. Server action mints scoped PAT (`read.runs`) for the burst/run; frontend `useRealtimeReplay` + compact Replay health chrome.
5. Start still flips control-plane `playing`; then triggers burst (does **not** open a second continuous writer in the browser).
6. Pause mid-burst: re-check control between sub-ticks and stop early.
7. Lesson + status board; `tsc --noEmit` clean.

## DO NOT
1. Do **not** restore browser interval `POST … tick` (Phase 0 invariant).
2. Do **not** start Phase 2 (parallel chat.stream.writer) or Phase 4 (clientData, dynamic tools, hooks, actions).
3. Do **not** rewrite chat.agent, Lovable catalog, or investigate Route/Parallel UI.
4. Do **not** subscribe to every cron run from the browser without a handle (no unbounded run listing).
5. Do **not** dual-write live rows from Next API except Reset one-shot / rare manual `tick` ops already allowed in Phase 0.
6. Do **not** add new pages, roles, or dependencies.

## Measure of success (DoD)
- [x] Schedule denser ticks with `wait.for` + pause-aware early exit
- [x] Shared queue concurrencyLimit 1 for schedule + burst
- [x] Metadata includes status / progress / inserted / cursor / speed
- [x] Start → `triggerPlantReplayBurst` → Realtime UI shows replay health
- [x] Browser still observe-only for `/api/plant/live` (no tick loop)
- [x] `tsc --noEmit` clean
- [x] Status board Phase 3 PASS

## Out of scope
| Phase | Theme |
|-------|--------|
| 2 | Louder parallel progress into chat root |
| 4+ | clientData, dynamic tools, hooks, actions |

## Learning
- Dense LIVE without dual writers = multiple `tickReplay` calls + `wait.for` inside one Trigger run, not a browser clock.
- Realtime for replay needs an explicit run handle (Start → burst). Cron stays the spine; UI does not list all schedule runs.
- Shared named queue (`plant-replay`, concurrency 1) keeps schedule + burst from overlapping writers.
- Speed shortens wait gaps (`9 / speed`) while batch size still scales inside `tickReplay`.
