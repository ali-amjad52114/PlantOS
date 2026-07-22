# PlantOS — Controlling Product Lock

**This is the single controlling MVP specification.**  
Abnormal-incident investigation is stretch only — not overnight MVP.

## Locked decisions

- Dataset: HAI **normal-operation** data only for the core demo.
- Roles: **Engineer**, **Operations**, **Finance** (no electrician/maintenance yet).
- Live plant: **continuous looping replay** of normal data with current timestamps.
- Production + finance figures: **synthetic assumptions**, labeled in UI and docs.
- No abnormal-event / alarm / RCA in MVP.
- No plant controls, setpoints writes, or alarm acknowledgements.
- One-page interface; visual responses over walls of text.
- ClickHouse = primary data layer; Trigger.dev **`chat.agent()`** = orchestration (LLM keys in Trigger dashboard).
- Overnight: Gates 0→10 unsupervised; no human approval between roles.

## Thesis

> One continuously running plant, one ClickHouse data layer, three role-specific interfaces over the same live state.

## Auto decisions (no human overnight)

- If no clean generator-output tag exists: redefine production from the best proven tag; document in assumptions; continue.
- On Gate N PASS: immediately start Gate N+1 through Gate 10.

## Stretch (after submission / morning)

- Abnormal investigation, maintenance role, work orders, Postgres OLTP bonus, demo video polish, public submit checklist.
