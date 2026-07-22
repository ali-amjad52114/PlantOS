# PlantOS — Multi-Agent Execution Plan

**Goal:** Ship a working PlantOS MVP for the ClickHouse × Trigger.dev hackathon.  
**Thesis:** One running plant. One live data layer. A different visual interface for every role.  
**Deadline pressure:** Prefer small green gates over long unsupervised runs.

---

## 0. Anti-betrayal rules (mandatory)

These exist because long agent runs can burn hours without shippable output.

1. **Timebox every agent:** max **45 minutes** wall clock per assignment, then STOP and write a status file.
2. **Binary gates only:** a phase is PASS or FAIL. “Mostly done” = FAIL.
3. **Proof over prose:** every PASS requires commands/files/query results listed under DoD.
4. **One writer per path:** agents never edit the same directory at the same time.
5. **No stretch features** until MVP gates 1–6 are green.
6. **Stop on first hard block** (missing credentials, HAI download blocked, CH insert fails). Write `STATUS.md` and wait — do not invent fake plant data silently.
7. **Do not refactor working code** unless the current gate requires it.
8. **Commit-worthy increments:** each PASS leaves the repo runnable for that phase’s demo script.

### Global DO

- Use HAI **normal-operation** data only for live replay.
- ClickHouse as primary DB; Trigger.dev **`chat.agent()`** for the chat path.
- Three roles: Engineer, Operations, Finance.
- Read-only plant UX (no controls that write to equipment).
- Mark synthetic production/finance assumptions in UI + README.
- Keep visual blocks from a **fixed catalog** (agent chooses among them).

### Global DO NOT

- Do not add electrician/maintenance roles yet.
- Do not add PLC/HMI control, setpoints writes, alarm ack, work orders.
- Do not replace ClickHouse with another OLAP store.
- Do not use random generative layouts / unbounded UI.
- Do not polish video, marketing copy, or stretch features before Gate 6.
- Do not spend >45m on docs, diagrams, or “architecture beauty.”
- Do not fabricate HAI rows if download fails — report FAIL.
- Do not run more than **2 agents in parallel**, and only on **disjoint paths**.

---

## 1. Agents (roles)

| Agent | Owns (paths) | Never touches |
|-------|----------------|---------------|
| **A — Data** | `data/`, `scripts/etl/`, `schemas/`, ClickHouse DDL/load | `src/app`, `src/components`, `src/trigger` chat UI |
| **B — Live** | `src/trigger/replay*`, ingest tasks, feed status API | Visual catalog, Next page chrome |
| **C — Product UI** | `src/app`, `src/components/plantos/**`, visual blocks | ClickHouse load scripts, HAI raw files |
| **D — Agent** | `src/trigger/*agent*`, tools, prompts, role routing | ETL scripts, CSS redesign |
| **O — Orchestrator** (this chat) | `PLANTOS_STATUS.md`, phase order, merges, gate checks | Does not re-implement agent work unless a gate fails |

Parallel allowed only as:

- **Wave 1:** A alone  
- **Wave 2:** B alone (needs A PASS)  
- **Wave 3:** C + D in parallel (needs B PASS; C owns UI, D owns `src/trigger` agent only)  
- **Wave 4:** O integrates + tests gates 5–6  

---

## 2. Phases & Definition of Done

### Gate 0 — Repo skeleton  
**Owner:** O  
**Timebox:** 30m  

**DO**
- Create Next.js app at repo root (or `apps/plantos` — pick one and stick).
- Add `.env.example` with `TRIGGER_*`, `CLICKHOUSE_*`, `ANTHROPIC_API_KEY`.
- Add `PLANTOS_STATUS.md` checklist.
- Wire Trigger project ref `proj_chhoeiuksrbzqtmfiuxd`.
- Keep `reference/` untouched as reference only.

**DO NOT**
- Build chat UI yet.
- Load full HAI yet.

**PASS when**
- [ ] `package.json` exists and `pnpm install` (or npm) succeeds  
- [ ] `trigger.config.ts` exists with project ref  
- [ ] `pnpm exec tsc --noEmit` or equivalent smoke passes OR documented skip with reason  
- [ ] `.env.example` committed; real secrets only in `.env` (gitignored)  

**FAIL if** scaffold incomplete after 30m → stop and report.

---

### Gate 1 — HAI understood + tag map  
**Owner:** A  
**Timebox:** 45m  

**DO**
- Download HAI (cite source URL in `data/HAI_SOURCE.md`).
- Identify normal-operation files.
- Produce `data/plant/tag_map.json` with ≤40 tags covering Boiler, Turbine, Generator, Water treatment.
- Each tag: `id`, `label`, `area`, `unit`, `normalMin`, `normalMax`, `description`.
- Produce `data/plant/hierarchy.json` (areas → equipment → tags).

**DO NOT**
- Clean/upload all years of data in this gate.
- Invent tags not present in HAI.

**PASS when**
- [ ] Raw HAI (or subset) exists under `data/hai/raw/`  
- [ ] `tag_map.json` has ≥12 and ≤40 tags, all 4 areas represented  
- [ ] `hierarchy.json` links water→boiler→turbine→power  
- [ ] `data/HAI_SOURCE.md` states license/attribution  

**FAIL if** download blocked → document blocker; do not fake CSV.

---

### Gate 2 — ClickHouse loaded (history)  
**Owner:** A  
**Timebox:** 45m  

**DO**
- Create tables (e.g. `plant_readings`, `plant_tags`, `plant_assumptions`).
- Load cleaned normal-operation slice sufficient for ≥1 shift comparison (prefer full normal set if time allows; minimum = continuous ≥4 hours at native resolution).
- Record proof in `data/PROOF_CLICKHOUSE.md`: row count, min/max ts, distinct tags, sample query times.

**DO NOT**
- Build UI.
- Start replay loop yet.

**PASS when** (via ClickHouse MCP or client)
- [ ] `SELECT count() FROM plant_readings` returns > 0 (write exact number)  
- [ ] `min(ts)`, `max(ts)` recorded  
- [ ] Every tag in `tag_map.json` has ≥1 row  
- [ ] Query “latest generator output” returns a row in <2s  

**FAIL if** insert auth missing → stop; ask for DB password / use MCP write path if available.

---

### Gate 3 — Live replay into ClickHouse  
**Owner:** B  
**Timebox:** 45m  

**DO**
- Trigger task (or script) that replays a normal window with **current** timestamps into `plant_readings_live` (or same table with `source='live'`).
- Loop when finished; interval ~2–5s.
- Control API or task payloads: start / pause / reset / speed.
- Fallback snapshot file under `data/fallback/latest_window.json`.

**DO NOT**
- Build role visuals yet.
- Change tag_map unless a bug blocks replay.

**PASS when**
- [ ] After 60s of replay, `max(ts)` advances (prove with two queries)  
- [ ] Pause stops advancement  
- [ ] Reset restores cursor  
- [ ] Fallback file exists and loads  

**FAIL if** writes not possible via available credentials → document; keep read-only history demo path.

---

### Gate 4 — Assumptions + SQL answers (no UI polish)  
**Owner:** A + B (A owns assumptions JSON; B owns query helpers)  
**Timebox:** 45m  

**DO**
- `data/plant/assumptions.json`: production unit, shift/daily targets, capacity, $/MWh, fuel/labour/fixed costs — all marked `synthetic: true`.
- SQL or typed query module answering the Gate-10 questions from the plan.
- Script `scripts/validate-queries.ts` prints answers + elapsed ms.

**DO NOT**
- Build chat agent yet.
- Hide assumptions.

**PASS when**
- [ ] Validation script runs and prints 8+ answers with timings  
- [ ] Each answer cites table + time window  
- [ ] Assumptions file loaded and echoed in output  

---

### Gate 5 — One `chat.agent` + fixed visual catalog  
**Owner:** D (agent) + C (blocks) in parallel after Gate 4  
**Timebox:** 45m each  

**D — DO**
- Single `chat.agent` for all roles.
- Tools: list/describe/query ClickHouse (read-only), `renderVisualization` against **fixed catalog only**.
- Role passed in session metadata.
- Progress steps emitted per role (engineer/ops/finance checklists from plan §15).

**D — DO NOT**
- Multiple agents per role.
- Free-form HTML from the model.

**C — DO**
- One main page: PlantOS, live badge, latest ts, production rate, role buttons, chat, drawers.
- Implement catalog components listed in plan §16 (minimum viable stubs OK if data-bound).

**C — DO NOT**
- Extra routes/tabs.
- Equipment control widgets.

**PASS when**
- [ ] Engineer question returns **visual blocks** (not paragraph-only)  
- [ ] Ops question returns different block set  
- [ ] Finance question returns different block set  
- [ ] Investigation steps visible during run  
- [ ] Evidence drawer shows supporting rows for one metric  
- [ ] Assumptions drawer shows synthetic flags  

**FAIL if** only markdown text answers → FAIL (misses hackathon brief).

---

### Gate 6 — MVP acceptance (Final MVP test)  
**Owner:** O  
**Timebox:** 45m  

**PASS when all true**
- [ ] HAI normal data in ClickHouse (count recorded)  
- [ ] Live replay updates screen + CH  
- [ ] One Trigger.dev agent handles all questions  
- [ ] Engineer → equipment condition visuals  
- [ ] Operations → production vs target visuals  
- [ ] Finance → value/cost visuals  
- [ ] Same plant for all roles  
- [ ] Calculations traceable (evidence + assumptions)  
- [ ] App remains one page and stable for a 5-minute demo script  

**Anything else = stretch — forbidden until Gate 6 PASS.**

---

## 3. Status protocol (every agent)

At end of timebox or gate, update `PLANTOS_STATUS.md`:

```md
## Gate N — PASS|FAIL|IN_PROGRESS
- Agent:
- Started:
- Ended:
- Proof:
  - commands:
  - artifacts:
- Blockers:
- Next:
```

If FAIL: **do not start next gate**. Orchestrator decides recover vs narrow scope.

---

## 4. Overnight / multi-agent launch order

1. O: Gate 0  
2. A: Gate 1 → 2  
3. B: Gate 3  
4. A+B: Gate 4  
5. C ∥ D: Gate 5  
6. O: Gate 6  

If only one agent available: same order, serial.

---

## 5. Credentials & services (known)

| Service | Status | Notes |
|---------|--------|-------|
| ClickHouse Cloud MCP | Working | Org `building one`, service `My first service` / `3366db2a-20be-4540-9fd5-60cd1204f019` |
| ClickHouse SQL via API key | Management only | Need service DB password OR MCP for queries; inserts may need password/client |
| Trigger.dev | Working | Project `builder` / `proj_chhoeiuksrbzqtmfiuxd`, env `tr_dev_…` |

Secrets live in `.env` only — never commit.

---

## 6. Hackathon constraints (do not violate)

- Meaningful ClickHouse + Trigger.dev (`chat.agent`)  
- Visual responses > walls of text  
- Code in build window; MIT/Apache-2.0 public repo  
- Demo ≤5 minutes later (not Gate 6 scope)  

---

## 7. Success slogan (keep in UI footer)

**One plant. One truth. Different intelligence for every role.**
