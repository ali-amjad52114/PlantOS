# PlantOS Status Board

**Last update:** Replit ALL visuals catalog port

## Runtime identity
- Checkout: `c:\AI\Projects\Clickhouse` (app at **repo root**)
- App: **http://localhost:3001** (`npm run dev -- -p 3001`)
- ClickHouse: `l8cacnn03w.us-east1.gcp.clickhouse.cloud` DB `plantos`
- Trigger project: `proj_chhoeiuksrbzqtmfiuxd`
- LLM: **`OPEN_AI`** in Trigger.dev dashboard (OpenAI `gpt-4.1-mini`)
- Layout: `docs/` · `lessons/` · `data/` · `scripts/` · `src/` (Next app)

## Gate board

| Gate | Status | Proof |
|------|--------|-------|
| 0–9 | **PASS** | Prior overnight (HAI CH load, replay, deterministic APIs, role UI) |
| 10 Trigger agent | **PASS** | Track A chat-agent align |
| 11 Demo journey ×2 | **PASS** | Deterministic + investigate + route/parallel |
| 12 Public release | **PARTIAL** | Runbook ready; public push still human |

## Track C proof (routing + parallel)

| Check | Result |
|-------|--------|
| Patterns from `building-effective-agents` | Routing + Parallelization only |
| `plant-route-investigate` | LLM route → `triggerAndWait` + `.ok` check; keyword fallback |
| `plant-parallel-investigate` | `batchTriggerAndWait` ×3 roles (not `Promise.all`) |
| UI | Route & investigate · All roles parallel · Realtime progress |
| `tsc --noEmit` | Clean |
| Route proof | `run_cmrw7bfcx5r2x0iofqox8a1fo` → finance via **llm**, visual true |
| Parallel proof | `run_cmrw7bkic5nnq0pn83ymu8jvd` → **3/3** roles ok |
| Do **not** | Rework chat.agent; Promise.all waits; evaluator-optimizer; UploadThing |

## Track B (still good)
- Investigate Realtime: `tasks.trigger` + scoped PAT + `useRealtimeRun`

## Wake checklist
1. `npm run dev -- -p 3001` (repo root)
2. `npm run dev:trigger`
3. Dashboard env: **`OPEN_AI`** + **`CLICKHOUSE_URL`**
4. Open http://localhost:3001 → mode nav · Ask agent (left) · visual stage (right) · ⋯ overflow for Route/Parallel/Pre-built

## Main shell redesign

**Last update:** Premium chat | stage shell with Overview · Engineer · Finance · Operations · Maintenance · Safety.

| Check | Status |
|-------|--------|
| Top mode nav + glass bar | **PASS** |
| Left chat / right visual stage | **PASS** |
| Overflow: Route · Parallel · Pre-built · Evidence | **PASS** |
| `tsc` | **PASS** |

**See:** `lessons/PLAN_MAIN_SHELL_REDESIGN.md`

## Thesis
One plant. One truth. Different intelligence for every role.

## Phase 4a — clientData + dynamic tools

**Last update:** Typed `clientData.role`; per-role investigate tools; `advanceReplay` gated; turn-audit via lifecycle hooks.

| Check | Status |
|-------|--------|
| `withClientData` + schema | **PASS** |
| No `[role=…]` message prefix | **PASS** |
| Dynamic tools per role (`advanceReplay` off by default) | **PASS** |
| Turn audit (`data-turn-audit` + metadata) | **PASS** |
| `tsc` | **PASS** |
| Runtime smoke (app + LIVE) | **PASS** |

**See:** `lessons/PHASE_4A_CLIENTDATA_DYNAMIC_TOOLS.md`

**Next package:** Phase 4b (chat actions) or Phase 2 (parallel into chat).

## Phase 3 — Replay Realtime + denser ticks

**Last update:** Schedule + burst share queue concurrency 1; dense sub-ticks with `wait.for`; Start → Realtime replay health (inserted / cursor / speed).

| Check | Status |
|-------|--------|
| Dense `wait.for` ticks + pause early-exit | **PASS** |
| Shared `plant-replay` queue concurrencyLimit 1 | **PASS** |
| Start → `plant-replay-burst` + `useRealtimeReplay` | **PASS** |
| Browser observe-only (no tick writer) | **PASS** |
| `tsc` | **PASS** |

**See:** `lessons/PHASE_3_REPLAY_REALTIME.md`

**Next package:** Phase 2 — louder parallel progress into chat (or Phase 4+ if prioritized).

## Phase 1 — Streamed plant tower

**Last update:** Investigate tools emit `data-investigation-step` + durable `data-plant-tower` (role-default 4 Lovable cards). Ask-agent renders tower in chat history.

| Check | Status |
|-------|--------|
| `chat.withUIMessage` + typed data parts | **PASS** |
| Tower in chat message parts (2×2 Lovable) | **PASS** |
| Question→card maps | TBD (human) — role defaults only |
| `tsc` | **PASS** |

**See:** `lessons/PHASE_1_STREAMED_PLANT_TOWER.md`

## Phase 0 — Trigger correctness

**Last update:** SDK imports fixed; single continuous replay writer (schedule); idempotent live inserts; HTTP fallback removed.

| Check | Status |
|-------|--------|
| No `@trigger.dev/sdk/v3` in `src/trigger` | **PASS** |
| Browser observe-only live poll (no 10s tick writer) | **PASS** |
| `plant-replay-tick` concurrencyLimit 1 + idempotent `original_ts` skip | **PASS** |
| Investigate path = Trigger Realtime only (no HTTP pretend) | **PASS** |

**See:** `lessons/PHASE_0_TRIGGER_CORRECTNESS.md` · Phase 3 closed denser LIVE without restoring browser writer.

## Lovable PlantOS cards

**Last update:** All 12 decks × 4 cards (48) registered with PlantOS wording. Question→card maps TBD (human).

| Decks | Role hint | Examples |
|------|-----------|----------|
| 1, 3, 12 | finance | EnergyValueTrend, TargetAttainment, ValueByArea |
| 2, 5, 6, 9 | operations | UnitHealthGrid, OeeRing, ShiftComparison |
| 4, 7, 8, 10, 11 | engineer | GeneratorOutput, TurbineSpeed, VibrationSpectrum |

**See:** Pre-built → “Lovable decks” · `src/components/lovable-viz/`

## Replit ALL visuals

**Status:** **PASS** — props-only catalog expansion; no runtime, Trigger, replay, or page changes.

| Package | Decks | Cards | Result |
|---------|-------|------:|--------|
| Equipment faceplates | 13–17 | 20 | **PASS** |
| Operations sets | 18–21 | 24 | **PASS** |
| Generation rotor pack | 22–23 | 8 | **PASS** |
| Role response + idle | 24–26 | 10 | **PASS** |
| Total new | 13–26 | 62 | **PASS** |

PlantOS/HAI wording replaces manufacturing and wind marketing language. Seed previews are intentionally not live-bound to ClickHouse. `tsc --noEmit` is clean.

**See:** `lessons/PLAN_REPLIT_ALL_VISUALS.md` · Pre-built → “PlantOS visual decks”.

## Plant viz cards (Ignition-inspired)

Still available (Batches A–C). See Pre-built → “Plant viz”.

