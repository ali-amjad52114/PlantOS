# Plan — Port ALL Replit Plant-Insight visuals into PlantOS cards

**Status:** COMPLETE — verified 2026-07-22
**Source plan:** Cursor plan `replit_cards_port`
**Decision (locked):** Bring **every** visual. Nothing skipped for “duplicate” or “wrong domain.” Overlaps with existing Lovable decks become **additional card types**. Manufacturing and wind copy are **rewritten into PlantOS/HAI language** while keeping chart/faceplate shapes.

---

## Handoff — instructions for another Cursor session

Use this section as the **entire brief** for a parallel agent. That agent owns only this plan. Do not disturb unrelated PlantOS/Trigger work.

### Paste this prompt into the other session

```text
Implement lessons/PLAN_REPLIT_ALL_VISUALS.md completely.

Rules:
1. Read the whole file. Follow DO / DO NOT / DoD exactly.
2. Port ALL visuals from the four Replit apps listed in the plan (equipment, ops sets, wind, plant-os response/idle). Do not skip any visual.
3. Rewrite all UI copy to PlantOS/HAI wording (tag_map + rewrite maps in the plan). No manufacturing/wind marketing strings.
4. Integrate into existing lovable-viz catalog (card-meta + PlantVisualDeck + Pre-built). Split modules under lovable-viz/ if needed.
5. Keep Lovable decks 1–12 unchanged; new cards get new type ids (*Face / Ops / etc.).
6. Props/seed data only — no live ClickHouse bind; no new pages/routes; no chat.agent / Trigger / replay changes.
7. Work on branch feat/replit-all-visuals (create if missing). Do not commit unrelated files.
8. When done: tsc --noEmit clean, Pre-built shows new decks, check off DoD in this lesson, update docs/PLANTOS_STATUS.md, report PASS with file list.

Repo root is the Next.js app (not plantos/). Reference sources live under reference/Replit/Plant-Insight/artifacts/ (gitignored locally — read from disk).
```

### Isolation (so this session is not disturbed)

| Do | Do not |
|----|--------|
| Branch: `feat/replit-all-visuals` | Commit on `master` while other work is in flight |
| Touch only files in the **File touch list** (+ new `src/components/lovable-viz/replit-*.tsx` modules) | Edit `src/trigger/**`, `src/app/page.tsx`, `src/app/actions.ts`, replay/chat agent, Phase 3/4a code |
| Read Replit under `reference/Replit/...` | Copy the whole Replit monorepo into `src/` |
| Commit only card/catalog/lesson/status changes | `git add -A` blindly |

### Suggested order for the other session

1. Package A — Decks 13–17 (20 equipment cards)  
2. Package B — Decks 18–21 (ops sets, every panel)  
3. Package C — Deck 22+ (wind → generation wording)  
4. Package D — Decks 23–24 (plant-os response/idle)  
5. Package E — Pre-built sections, `tsc`, status board, DoD checkboxes  

### Done means

All DoD checkboxes in this file checked; status board updated; branch ready to merge when the main session asks.

---

## Goal
Port all Replit Plant-Insight visuals (equipment, ops sets, wind, plant-os response cards) into the PlantOS Lovable card catalog with PlantOS/HAI wording. Register in Pre-built gallery. No new product pages; no live ClickHouse bind in this pass.

## Sources (all four apps)

| App | Path | What we take |
|-----|------|----------------|
| Equipment | `reference/Replit/Plant-Insight/artifacts/plant-equipment` | All 20 cards + 5 towers |
| Ops | `reference/Replit/Plant-Insight/artifacts/ops-dashboard` | Visual Sets 1–4 panels + HeroKPI + ProductionPipeline shapes |
| Wind | `reference/Replit/Plant-Insight/artifacts/wind-dashboard` | Turbine, WindEnergyChart, TemperatureCard×N, StatCard, GaugeCard |
| Plant-os | `reference/Replit/Plant-Insight/artifacts/plant-os` | Idle status cards, Engineer/Ops/Finance response visuals |

**Not ported as product chrome:** hub iframes, palette/color pickers as user-facing tools, full Replit app shells, API server, question→card maps.

**Integration surface:** `src/components/lovable-viz/` (`PlantVisualDeck.tsx`, `card-meta.ts`, `LovableCardView.tsx`, Pre-built).

## PlantOS wording rules (every card)

- Use `data/plant/tag_map.json` + product lock voice.
- Ban/replace: Caldwell Refinery, units/hr, defect/scrap as manufacturing defaults, “New Energy Fan System,” offshore-grid marketing, unlabeled $ without demo disclaimer.
- **Ops set rewrite map** (shape kept, words changed):
  - Units produced → **Shift MWh / energy produced**
  - Defect rate → **Off-normal / attention rate**
  - Cycle time → **Sample interval / tag cadence**
  - RAW→QC pipeline → **Demand → steam → turbine → MW out** (or boiler→turbine→gen→water)
  - Downtime Pareto → **Attention / pause reasons by area**
  - Cost/unit → **Demo $/MWh** (assumptions labeled)
  - Machine grid → **Area / unit health** (boiler · turbine · gen · water)
- **Wind rewrite map:**
  - Wind turbine art → **Hydro / rotating machine faceplate** (or “site generation rotor”)
  - Wind speed series → **Aux / hydro power trend** (`P4_HT_PO` language)
  - Emissions Saved → **Demo avoided cost / margin proxy** (labeled synthetic) or **Target attainment**
  - Nacelle/pitch status → **RUN / AUTO / feed status** plant discretes
- Keep props-only / seed data; `// CH bind:` comments where Replit had them. Live CH bind = later package.

## Catalog expansion

Existing Lovable: **Decks 1–12 (48 cards)** stay as-is.

| New decks | Source | Cards |
|-----------|--------|-------|
| **13** Boiler equipment | Replit BoilerTower (all 4) | BoilerPressureFace, BoilerThermalFace, BoilerLevelTank, BoilerValvesFlow |
| **14** Turbine equipment | TurbineTower | TurbineRotorFace, TurbineVibSpectrumFace, TurbineVibTrend, TurbineState |
| **15** Steam gen equipment | SteamGeneratorTower | GeneratorOutputFace, GeneratorLoadFace, SteamCondition, SteamFeedTrend |
| **16** Hydro equipment | HydroTower | HydroPowerFace, HydroGaugeFace, HydroTrend, HydroVsSteamFace |
| **17** Water treatment | WaterTreatmentTower | WaterLevelTank, WaterLimits, WaterValve, WaterLevelTrend |
| **18** Ops set 1 (plant-worded) | VisualSet1 panels | AreaHealthArcs, ThroughputTimelineOps, QualityRingsOps, AttentionFeed, ShiftBarsOps, OeeSpeedometer |
| **19** Ops set 2 | VisualSet2 | ProcessFunnelOps, HourlyEnergyBars, StageEfficiency, AttentionPareto, YieldTrend, CadenceGauges |
| **20** Ops set 3 | VisualSet3 | ThermalHeatmapOps, VibChartOps, AreaReliability, FaultRadar, OutageWindows, EnergyUsageBars |
| **21** Ops set 4 | VisualSet4 | YieldDonut, CostPerMwhDemo, AreaVsTargetBullets, WasteAttentionTrend, ShiftScorecard, OutputHeatMatrix |
| **22+** Generation rotor pack | Wind components | RotorFaceplate, GenPowerChart, BearingTemp, AmbientTemp, RotorTemp, StatorTemp, EnergyStat, TargetGauge (split into 4-card decks; keep every visual) |
| **23–24** Role response faceplates | plant-os | EngineerFinding + DeviceStrip + RangeBars; OpsShiftDonut + RateChart + AreaUtil; FinanceValueHero + CostMix + MarginTrend; IdleGenStrip |

Preference: **keep every panel** even if a deck has 5–6 cards for an ops set. Exact type names finalized at implement time so Pre-built stays consistent. Target: **~48 existing + ~40–55 new** card types.

## DO

1. Port every visual from the four apps above.
2. Apply PlantOS/HAI wording on every title/hint/label.
3. Register in `card-meta` + `PlantVisualDeck` (split modules ok: `replit-equipment.tsx`, `replit-ops.tsx`, `replit-gen.tsx`).
4. Show in Pre-built gallery with clear section headers.
5. Props-only / seed data; CH-bind comments where useful.
6. `tsc --noEmit` clean; update `docs/PLANTOS_STATUS.md`.

## DO NOT

1. Do **not** skip wind or ops sets.
2. Do **not** leave manufacturing/wind marketing copy in the UI.
3. Do **not** vendor the whole Replit monorepo into `src/`.
4. Do **not** add new routes/pages or hub iframes.
5. Do **not** rewrite chat.agent or question→card maps in this work.
6. Do **not** live-bind ClickHouse in this pass.
7. Do **not** restore browser tick writer.

## Implementation packages

### Package A — Equipment (Decks 13–17)
Port all 20 Replit equipment cards with PlantOS titles/hints. Distinct `*Face` / new ids so Lovable 1–12 remain.

### Package B — Ops sets (Decks 18–21)
Port every panel inside Set1–Set4 + pipeline/hero KPI shapes. Full PlantOS rewrite per map above.

### Package C — Wind → generation pack (Deck 22+)
Port every wind component visual; rewrite labels to plant/hydro/demo-finance language.

### Package D — plant-os response / idle cards (Deck 23–24)
Port Engineer / Operations / Finance response visuals and idle status cards as catalog cards (not a second chat app).

### Package E — Gallery + proof
Pre-built sections; `tsc --noEmit`; status board PASS.

## File touch list

- `src/components/lovable-viz/PlantVisualDeck.tsx` (+ optional split modules)
- `src/components/lovable-viz/card-meta.ts`
- `src/components/pre-built-catalog.tsx`
- `lessons/PLAN_REPLIT_ALL_VISUALS.md` (this file)
- `docs/PLANTOS_STATUS.md`

## Measure of success (DoD)

- [x] Inventory maps every Replit visual → PlantOS card type
- [x] All equipment + ops set panels + wind components + plant-os response/idle visuals render in Pre-built
- [x] Zero remaining Replit UI strings that violate wording rules (spot-check)
- [x] `tsc --noEmit` clean
- [x] Status board notes Replit ALL visuals PASS

## Execution inventory

| Source | PlantOS decks | Mapped card types |
|--------|---------------|------------------:|
| Boiler, turbine, steam generator, hydro, water towers | 13–17 | 20 |
| Ops VisualSet1–4 (hero/pipeline shapes included) | 18–21 | 24 |
| Wind component pack rewritten as generation rotor | 22–23 | 8 |
| Engineer, Operations, Finance responses + idle strip | 24–26 | 10 |
| **Total new** | **13–26** | **62** |

The exact source-to-type mapping is the ordered `REPLIT_DECKS` inventory in `src/components/lovable-viz/replit-visuals.tsx`; metadata is derived from that single source to prevent catalog drift.

## Learning

- Keeping Replit cards in a separate module preserved Lovable decks 1–12 and made completeness countable.
- A single ordered inventory can drive both the visual carousel and json-render metadata, preventing label/type mismatches.
- Source layouts can be retained while replacing domain semantics; decorative manufacturing/wind metrics must never masquerade as HAI evidence.
