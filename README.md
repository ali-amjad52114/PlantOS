# PlantOS

One continuously running plant. One ClickHouse truth. Three role-specific interfaces (Engineer / Operations / Finance). Orchestrated with Trigger.dev `chat.agent()`.

## Repo layout

| Path | Purpose |
|------|---------|
| `src/`, `public/`, `package.json` | Next.js app (repo root — Vercel-ready) |
| `docs/` | Product lock, demo journey, submit checklist, status board, build plan |
| `lessons/` | Phase briefs and engineering learnings |
| `data/` | Plant tag maps, assumptions, HAI notes, proofs, fallbacks |
| `scripts/` | ETL / seed Python + `scripts/e2e/` browser proofs |
| `reference/` | Local visual references (not deployed) |

## What is real

- **HAI 20.07** normal-operation `train1` loaded into ClickHouse Cloud (`plantos.plant_readings`, ~1.49M history rows, 24 tags). See [`data/HAI_SOURCE.md`](data/HAI_SOURCE.md) and [`data/PROOF_CLICKHOUSE.md`](data/PROOF_CLICKHOUSE.md).
- Production signal: **`P4_ST_PO`** (steam turbine power MW).
- Deterministic role APIs: `/api/plant/engineer|operations|finance`.
- Live replay via Trigger (`plant-replay-tick` / `plant-replay-burst`) with Start / Pause / Reset / Speed.
- Trigger.dev: `plantos-agent` (`chat.agent`), investigate / route / parallel tasks.

Finance/production **dollar and target numbers are synthetic demo assumptions** — labeled in UI (`data/plant/assumptions.json`).

## Quick start

```bash
cp .env.example .env   # set CLICKHOUSE_URL + TRIGGER_SECRET_KEY
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

Set **`OPEN_AI`** and **`CLICKHOUSE_URL`** in the **Trigger.dev dashboard → Environment Variables** (Dev).

## Docs

- [`docs/PRODUCT_LOCK.md`](docs/PRODUCT_LOCK.md) — controlling product lock
- [`docs/DEMO_JOURNEY.md`](docs/DEMO_JOURNEY.md) — demo path
- [`docs/PLANTOS_STATUS.md`](docs/PLANTOS_STATUS.md) — status board
- [`docs/SUBMIT_CHECKLIST.md`](docs/SUBMIT_CHECKLIST.md) — hackathon submit
- [`docs/BUILD_PLAN.md`](docs/BUILD_PLAN.md) — original refined build plan
- [`lessons/`](lessons/) — phase DO/DON'T/DoD briefs

## Thesis

> One plant. One truth. Different intelligence for every role.
