# Plan: Ignition Visualization Cards → PlantOS

**Goal:** Bring the **36** Ignition `samplequickstart` visualization components (Charts + Display + Symbols only) into PlantOS as simple data-driven cards the Ask-agent can compose.

**Model (locked):** picture + ClickHouse numbers → AI glues cards → dashboard.  
**Not in scope:** Ignition tag binding, OPC, Designer projects, navigation/containers/inputs.

**Controlling product lock:** `PRODUCT_LOCK.md` (visual over walls of text; three roles; read-only).

---

## Scope inventory (exact)

Source:  
`C:\Program Files\Inductive Automation\Ignition\data\projects\samplequickstart\...\Component Views\`

| Batch | Components (count) |
|-------|-------------------|
| **A — Charts** | Chart Range Selector, Gauge, Pie, Power Chart, Simple Gauge, Time Series Chart, XY Chart (**7**) |
| **B — Display (plant-critical)** | Cylindrical Tank, Thermometer, Linear Scale, Moving Analog Indicator, LED Display, Sparkline, Progress, Label, Table, Dashboard (**10**) |
| **C — Symbols** | Motor, Pump, Sensor, Valve, Vessel (**5**) |
| **D — Display (secondary)** | Icon, Image, Markdown, Map, Alarm Journal Table, Alarm Status Table, Equipment Schedule, Tree, Tag Browse Tree, Audio, Barcode, Inline Frame, PDF Viewer, Video Player (**14**) |

**Total: 36.**  
Ship **A → B → C first** (22). **D** only if time; several are low value for PlantOS (PDF/Video/Audio/IFrame/Tag Browse).

---

## Architecture (do not reinvent)

```text
Ignition thumbnail / behavior (reference only)
        ↓
React component (props: value, min, max, label, …)
        ↓
catalog.ts  +  registry.tsx   (LLM can call it)
        ↓
Pre-built tab demo (sample props)
        ↓
Ask-agent renderVisualization composes cards with ClickHouse data
```

**Already present (do not duplicate):** Stat, LineChart, AreaChart, BarChart, PieChart, Table, Card/Grid/Stack, shadcn Alert/Progress/etc.  
Map Ignition **Pie / Table / Progress / Time Series / XY** to existing charts where possible; only add new ones when behavior differs (Gauge, Tank, Thermometer, Symbols, LED, Sparkline, …).

---

## Multi-agent ownership

| Agent | Owns | Never touches |
|-------|------|----------------|
| **V1 — Charts** | New chart/gauge components under `plantos/src/components/plant-viz/`; catalog/registry entries for Batch A | page chrome, Trigger tasks, ClickHouse SQL |
| **V2 — Display plant** | Tank, thermometer, scales, LED, sparkline, faceplate-style Label; Batch B | Ignition install files, nav/forms |
| **V3 — Symbols** | Motor/Pump/Sensor/Valve/Vessel SVG; Batch C | Agent prompts rewrite, Track A/B/C rewrite |
| **V4 — Wire + Pre-built** | `pre-built-catalog.tsx` demos; `catalogPromptSection` guidance; smoke that specs validate | Inventing new product roles |
| **Lead** | Merge order, DoD checks, browser proof, status board | Parallel edits on same file |

**Parallel rules:**  
- Max **2** agents at once on **disjoint paths** (`plant-viz/charts/*` vs `plant-viz/symbols/*`).  
- Only **V4** edits `pre-built-catalog.tsx` and shared `catalog.ts` / `registry.tsx` in a final integration pass **or** V1–V3 add only their keys via small PRs and Lead merges.  
- Prefer: V1 and V3 in parallel → V2 → V4 wire → Lead proof.

---

## Global DO

1. Props-only: `value`, `min`, `max`, `unit`, `label`, `state` (e.g. on/off), optional `color`.  
2. Visual must **change when props change** (needle, fill level, color).  
3. Register in `catalog.ts` + `registry.tsx` with a clear description for the LLM.  
4. Add a **Pre-built** demo with sample numbers.  
5. Use Ignition `thumbnail.png` / Designer view as **visual reference only**.  
6. Keep dark PlantOS styling (zinc/emerald), not Ignition’s default theme clone.  
7. Prefer SVG + CSS transitions; no new heavy deps unless necessary.  
8. After each batch: `tsc --noEmit` clean.  
9. Update `PLANTOS_STATUS.md` with batch proof.

---

## Global DO NOT

1. **No** Ignition tag binding, OPC-UA, Vision windows, or Designer export runtime.  
2. **No** Inputs / Navigation / Containers / Embedding / Framework gallery ports.  
3. **No** rewriting `chat.agent`, Realtime investigate, or route/parallel (Tracks A–C).  
4. **No** free-form HTML from the LLM — catalog components only.  
5. **No** claiming “animated live tags” — animation = prop-driven visual update.  
6. **No** scope creep into electrician/maintenance roles or abnormal-incident MVP.  
7. **No** editing the same file in two agents at once.  
8. **No** copying Ignition proprietary module binaries into the repo.

---

## Batches & definition of done

### Batch 0 — Contract (Lead, ~30 min)
**Do:** Freeze prop conventions + file layout `plantos/src/components/plant-viz/{charts,display,symbols}/`.  
**DoD:**
- [ ] One-pager prop convention written in this plan (below)  
- [ ] Empty folders + `index.ts` barrel  
- [ ] Agents assigned  

### Prop convention
```ts
// Minimum for analog visuals
{ label: string; value: number; min?: number; max?: number; unit?: string }
// Discrete symbols
{ label: string; state?: "on" | "off" | "fault" | "unknown"; value?: number }
```

### Batch A — Charts (V1)
**Do:** Gauge, Simple Gauge; map Pie/Time Series/XY/Power Chart to existing or thin wrappers; Range Selector only if trivial.  
**DoD:**
- [ ] Each new type in catalog + registry  
- [ ] Pre-built section shows each with changing sample values  
- [ ] `validateSpec` passes for demo specs  
- [ ] `tsc --noEmit` clean  

### Batch B — Display plant-critical (V2)
**Do:** Tank, Thermometer, Linear Scale, Moving Analog Indicator, LED, Sparkline, Progress (reuse shadcn if enough), Label, Table (reuse), Dashboard = Card+Grid composition helper if needed.  
**DoD:** same as Batch A for each new component  

### Batch C — Symbols (V3)
**Do:** Motor, Pump, Sensor, Valve, Vessel — simple SVG, color by `state`.  
**DoD:** same checklist  

### Batch D — Secondary Display (optional)
**Do only if A–C green:** Icon, Image, Markdown; **skip or stub** Audio, Video, PDF, IFrame, Tag Browse, Alarm tables unless demo-critical.  
**DoD:** listed explicitly in status as SHIPPED vs SKIPPED with reason  

### Batch E — Agent glue (V4 + Lead)
**Do:** Prompt notes: prefer plant viz for Engineer (gauge/tank/symbol), Ops (sparkline/progress/target), Finance (Stat/Bar/existing).  
**DoD:**
- [ ] Ask-agent can emit a spec using ≥1 new plant-viz component  
- [ ] Browser: Pre-built shows new cards  
- [ ] Browser: one Engineer Ask-agent turn renders a composed viz (no max-depth)  
- [ ] `lessons/` or status notes path boundaries (Realtime vs chat stream unchanged)  

---

## Definition of done (project-level)

**PASS only if all are true:**

1. **36 accounted for:** each of the 36 is either **SHIPPED** in catalog/Pre-built or **SKIPPED** with one-line reason (e.g. “PDF Viewer — not plant KPI”).  
2. **A+B+C shipped** (22) at minimum — gauges/tank/thermo/LED/sparkline/symbols working.  
3. Props-only; visuals respond to data; no tag binding.  
4. Ask-agent catalog includes descriptions; one browser proof of composition.  
5. `tsc --noEmit` clean; app still loads on `:3001`.  
6. Tracks A/B/C behavior not regressed (Investigate Realtime + Ask agent still work).  

**FAIL if:** “mostly done,” stubs without Pre-built demo, or LLM cannot discover components via catalog prompt.

---

## Effort (with this understanding)

| Milestone | Wall clock |
|-----------|------------|
| A+B+C (22 plant viz) | ~1–2 days focused |
| D selective | +0.5–1 day |
| Full 36 including low-value media/alarm/tag browse | ~2–3 days |

---

## Proof commands

```bash
cd plantos
npx tsc --noEmit
# UI: http://localhost:3001 → Pre-built → scroll plant-viz section
# UI: Ask agent Engineer question → expect gauge/tank/stat composition
node scripts/browser-e2e-agent-only.mjs
```

---

## Owner checkpoint report (use after each batch)

```text
Current goal:
Visible behavior changed:
Files touched:
What works now:
What remains:
Tests / browser evidence:
Owner decision required:
Next batch:
```

---

## Immediate next step (after you approve)

Start **Batch 0 + Batch A** (gauges + chart mapping) only — no Batch D until A–C PASS.

---

## Execution log

| Date | Batch | Result |
|------|-------|--------|
| 2026-07-22 | 0 + A + B + C | **PASS** — plant-viz components + catalog/registry + Pre-built “Plant viz” section; `tsc` clean. Batch D skipped (documented). |
