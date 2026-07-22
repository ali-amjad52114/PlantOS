# PlantOS

One continuously running plant. One ClickHouse truth. Three role-specific interfaces (Engineer / Operations / Finance). Orchestrated with Trigger.dev `chat.agent()`.

## What is real

- **HAI 20.07** normal-operation `train1` loaded into ClickHouse Cloud (`plantos.plant_readings`, ~1.49M history rows, 24 tags). See `../data/HAI_SOURCE.md` and `../data/PROOF_CLICKHOUSE.md`.
- Production signal: **`P4_ST_PO`** (steam turbine power MW) — documented auto-redefine (no separate generator MW column).
- Deterministic role APIs query ClickHouse: `/api/plant/engineer|operations|finance`.
- Live replay copies history rows forward with wall-clock timestamps (`source=live`), with Start / Pause / Reset / Speed controls.
- Trigger.dev tasks: `plantos-agent` (`chat.agent`), `plant-replay-tick` (cron), `plant-investigate` (deterministic).

Finance/production **dollar and target numbers are synthetic demo assumptions** — labeled in UI (`data/plant/assumptions.json`).

## Quick start

```bash
cd plantos
cp ../.env .env   # if needed — must include CLICKHOUSE_URL + TRIGGER_SECRET_KEY
npm install
npm run dev -- -p 3001
# separate terminal:
npm run dev:trigger
```

Open http://localhost:3001

### Required env

```env
CLICKHOUSE_URL=https://default:<password>@<host>:8443
TRIGGER_SECRET_KEY=tr_dev_...
TRIGGER_PROJECT_REF=proj_chhoeiuksrbzqtmfiuxd
```

### LLM for chat.agent

PlantOS agent uses **OpenAI** (`gpt-4.1-mini`). Set **`OPEN_AI`** in the **Trigger.dev dashboard → Project → Environment Variables** (Dev) — that is the name this project reads (also accepts `OPENAI_API_KEY`). Also set **`CLICKHOUSE_URL`** there so tools can query the plant DB.

Without the dashboard LLM key, use **Deterministic ask (no LLM)** on the page — same ClickHouse numbers, no agent.

## Demo path (5 minutes)

1. Confirm LIVE badge / live max timestamp advances (replay ticks every ~10s from the UI, plus Trigger cron when `dev:trigger` is running).
2. Engineer → Deterministic ask → cards + trend chart + evidence.
3. Operations → shift vs target bars + bottleneck.
4. Finance → value/cost/margin + assumptions disclaimer.
5. Ask agent (requires Trigger LLM) → tool progress from real `chat.agent` tool calls.

## Fallback

If ClickHouse is unreachable, services load `data/fallback/latest_window.json` (regenerate with `node scripts/write-fallback.cjs`).

## Thesis

> One plant. One truth. Different intelligence for every role.
