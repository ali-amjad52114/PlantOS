# PlantOS Status Board

**Last update:** Track C routing + parallel (building-effective-agents)

## Runtime identity
- Checkout: `c:\AI\Projects\Clickhouse`
- App: `plantos/` @ **http://localhost:3001**
- ClickHouse: `l8cacnn03w.us-east1.gcp.clickhouse.cloud` DB `plantos`
- Trigger project: `proj_chhoeiuksrbzqtmfiuxd`
- LLM: **`OPEN_AI`** in Trigger.dev dashboard (OpenAI `gpt-4.1-mini`)

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
1. `cd plantos && npm run dev -- -p 3001`
2. `cd plantos && npm run dev:trigger`
3. Dashboard env: **`OPEN_AI`** + **`CLICKHOUSE_URL`**
4. Open http://localhost:3001 → **Route & investigate** / **All roles parallel** / Ask agent

## Thesis
One plant. One truth. Different intelligence for every role.

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

**Next package:** Phase 1 — streamed visual / Lovable card data parts (`lessons/PHASE_0_TRIGGER_CORRECTNESS.md`).

## Lovable PlantOS cards

**Last update:** All 12 decks × 4 cards (48) registered with PlantOS wording. Question→card maps TBD (human).

| Decks | Role hint | Examples |
|------|-----------|----------|
| 1, 3, 12 | finance | EnergyValueTrend, TargetAttainment, ValueByArea |
| 2, 5, 6, 9 | operations | UnitHealthGrid, OeeRing, ShiftComparison |
| 4, 7, 8, 10, 11 | engineer | GeneratorOutput, TurbineSpeed, VibrationSpectrum |

**See:** Pre-built → “Lovable decks” · `plantos/src/components/lovable-viz/`

## Plant viz cards (Ignition-inspired)

Still available (Batches A–C). See Pre-built → “Plant viz”.

