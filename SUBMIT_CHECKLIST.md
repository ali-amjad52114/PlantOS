# Submission checklist (Gate 12)

## Done in-repo
- [x] Controlling product lock (`PRODUCT_LOCK.md`)
- [x] Status board with proof (`PLANTOS_STATUS.md`)
- [x] App runbook (`plantos/README.md`)
- [x] Demo journey doc (`DEMO_JOURNEY.md`)
- [x] HAI source + ClickHouse proof (`data/HAI_SOURCE.md`, `data/PROOF_CLICKHOUSE.md`)
- [x] Fallback snapshot (`data/fallback/latest_window.json`)
- [x] Trigger `chat.agent` (`plantos-agent`) + replay cron + deterministic task

## Human / account steps remaining
- [ ] Ensure `OPEN_AI` is set in Trigger.dev dashboard Dev env (PlantOS agent uses OpenAI; also accepts `OPENAI_API_KEY`)
- [ ] Ensure `CLICKHOUSE_URL` is also set in Trigger dashboard (local `.env` covers `trigger.dev` CLI)
- [ ] `git init` + push public GitHub repo (omit `.env`, secrets, large raw CSV if needed — document download)
- [ ] Optional: `npx trigger.dev@4.5.6 deploy` for cloud workers
- [ ] Optional: deploy Next to Vercel with env vars
- [ ] Record 5-min demo video
- [ ] Submit on Luma / hackathon form

## Reproduce locally
```bash
cd plantos
npm install
npm run dev -- -p 3001
npm run dev:trigger   # other terminal
```
Open http://localhost:3001
