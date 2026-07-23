# Plan — Historian range (1h / 12h / 24h) on cards that make sense

**Status:** PASS  
**Scope:** Time-window presets on **series-capable** Lovable cards only. UX + ClickHouse query window. No new agents, Trigger tools, or full calendar historian.  
**Branch:** continue on current working branch.  
**Canonical for agents:** this file + `.cursor/rules/historian-range.mdc`.  
**Mockup (review):** [`reference/historian-range-mockup/index.html`](../reference/historian-range-mockup/index.html)

## Goal
Let the user switch a chart’s window among **1h · 12h · 24h** so the pin behaves like a light historian — without pretending every card is a time series.

## Product lock
1. Presets: **1m (default)** · **1h** · **12h** · **24h**. New cards open on the short **1m** live window (clean, dense recent spark). Longer windows only after the user clicks them. No custom calendar in this package.
2. Control lives **on the card** (canvas pin and chat pinable), matching the mockup — not a global shell filter.
3. Range applies to **that card’s series** (and its live primary still shows latest). Switching range re-fetches / rebinds series; does not reshuffle pin order/span.
4. Only cards where a time axis **makes sense** (see allowlist below). List / radar / snapshot-only cards stay unchanged — **no** fake range pills.
5. Longer windows must **downsample** (ClickHouse already `LIMIT 500` on trends) so 24h does not flood the UI.
6. Missing history → empty/sparse series + honest caption (do not invent points).
7. Live feed refresh may update values **within the selected window**; changing range is user-driven.

## Which cards make sense (allowlist v1)

Include when the card already binds a **ClickHouse tag trend** (`series` from `P4_ST_PO` / `P2_SIT01` or explicit `kind: "series"`):

| Card types (v1) | Why |
|-----------------|-----|
| `GeneratorOutput`, `ThroughputTimeline`, `ShiftThroughput`, `ProductionVolume`, `HydroEnergyBars`, `EnergyValueTrend`, `OutputVsDemand`, `ForecastTrajectory` (if series-backed) | Clear time series / trend |
| `TurbineSpeed`, `TurbineRotorCard`, `BoilerPressure` | Metric + spark/trend from tag history |

**Exclude (do not add pills):**  
`ClosestToLimit`, `ActiveAlerts`, `ShiftAlerts`, `AssetRadar`, `PlantHealthRadar`, `UnitHealthGrid`, `AnomalyMap`, pure finance KPI tiles without CH series, attention lists, donuts/mix cards with no time axis.

If unsure for a type: **exclude** until it has a real tag series in `card-bindings.ts`.

## DO
1. Add `HistorianRangeHours = 1 | 12 | 24` + default `1`.
2. Extend trend fetch (`plant-services.trend` / bound-tower path) to accept `hours` (already partially there — wire through API + bindings).
3. Per-pin (or per-card-instance) selected range in UI state; on change, refetch series for that card’s tag(s) and update binding.series only.
4. Render **1h / 12h / 24h** control only when `cardSupportsHistorianRange(type)` (allowlist helper).
5. Match mockup hierarchy: compact pills under the card title, chart body updates.
6. Canvas pins: store `rangeHours` on the pin (or parallel map keyed by pin id) so live refresh keeps the user’s choice.
7. Prove with Playwright on one allowlisted card (fixture or bound) — switching 1→12→24 changes series length / window label; excluded card has **no** pills.
8. Keep first-ask / answer-before-canvas / pin board rules intact.

## DO NOT
1. Do not put range pills on every Lovable card.
2. Do not build a global “plant historian” page or arbitrary date pickers.
3. Do not load unbounded raw points for 24h — keep cap / aggregation.
4. Do not change Trigger agents or invent synthetic multi-year data.
5. Do not claim done without the proof script below.

## Build order
1. Allowlist helper + types.
2. API/query: `hours` through bound-tower or small `/api/plant/trend?tag=&hours=`.
3. UI pills on `LovableCardView` / pin chrome for allowlisted types only.
4. Wire one card end-to-end (e.g. `GeneratorOutput`), then roll allowlist.
5. E2E proof + mark PASS.

## Measure of success (DoD)
- [x] Allowlisted card shows **1m / 1h / 12h / 24h**; default **1m**.
- [x] Switching range updates the chart from ClickHouse (or documented fixture) for that window.
- [x] Non-allowlisted card has **no** range control.
- [x] Pin layout / first-ask / move-on-pin unchanged.
- [x] Playwright → `ok: true`.

## Proof
- Script: `scripts/browser-e2e-historian-range.mjs`
- Artifact: `data/browser-e2e/historian-range-result.json`
- Prefer `/?e2eCanvas=1` or a thin `?e2eHistorian=1` with one series card + mocked/CH trend.

## Test (required before reporting done)
1. Open fixture with an allowlisted series card on canvas/chat.
2. Assert range control visible; default `data-range="1"` (or equivalent).
3. Click 12h → assert selected state + series/window changed (point count or label).
4. Open / find a non-series card → assert no range control.
5. Write JSON; exit 0 only when `ok: true`.

**Agent report rule:** Paste script exit + artifact path. Do not say complete without that.

## Out of scope (later)
- Custom from/to dates, 7d / 30d / 2y, compare periods, export CSV.
- Per-tag multi-series historian drawer.

## Files likely touched
- `src/lib/plant-services.ts` — trend hours
- `src/lib/card-bindings.ts` / `src/app/api/plant/bound-tower` or new trend route
- `src/components/lovable-viz/LovableCardView.tsx` (+ small range control)
- `src/lib/canvas-pins.ts` / `page.tsx` — optional `rangeHours` on pins
- `src/lib/historian-range.ts` — allowlist + types
- `scripts/browser-e2e-historian-range.mjs`
- Reference mockup stays documentation-only

## Lessons / plans to respect
- [`reference/historian-range-mockup/`](../reference/historian-range-mockup/) — visual target for the control.
- [`PLAN_CHAT_CANVAS_PINS.md`](./PLAN_CHAT_CANVAS_PINS.md) — pins stay independent; refresh bindings only.
- [`PLAN_QUESTION_CARD_CH_BIND.md`](./PLAN_QUESTION_CARD_CH_BIND.md) — CH is source of truth.
- [`BROWSER_E2E_LEARNINGS.md`](./BROWSER_E2E_LEARNINGS.md) — prove in Playwright.
