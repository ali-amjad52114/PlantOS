# Plan — Historian live (play) + rolling window

**Status:** PASS  
**Scope:** Per-card play/live on allowlisted historian series cards. Rolling past window for whatever range is selected (1m / 1h / 12h / 24h). Fix X-axis so the selected duration is the chart domain even when CH data is sparse.  
**Depends on:** `PLAN_HISTORIAN_RANGE.md` (presets + allowlist stay).  
**Canonical for agents:** this file + update to `.cursor/rules/historian-range.mdc`.

## Goal
1. **Play button** on allowlisted cards — click → chart is live; series refreshes from ClickHouse.
2. **Axis matches range** — selecting 1h always uses a ~60-minute X domain (data may only cover part of it).
3. **Live + any range** — show the past window for that preset and slide forward as new points arrive.

## Product lock
1. Play is **opt-in** (default off). Pause stops polling; current series stays.
2. Live uses the **currently selected** range — not hardcoded to 1h.
3. Rolling window = `windowEnd − range` → `windowEnd`, where `windowEnd` advances with latest CH `ts` (and polls while live).
4. Do **not** invent fake history to fill the left side — empty region is fine; domain still spans the full range.
5. Live refresh must **not** reset the user’s selected range pill.
6. Only allowlisted historian cards get play + range (same allowlist).

## Root cause (1h looked like ~8m)
Query asked for last N minutes from `max(ts)`, but the chart **auto-fit X to available points**. Sparse demo/replay data (~8 minutes) made the axis labels span only that stretch. Fix: numeric time scale + fixed domain from range minutes.

## DO
1. Play/pause control next to range pills (`data-testid="historian-live"`).
2. While live: poll `/api/plant/card-series` (~2s) for that card type + range.
3. API returns ISO series timestamps + `windowStart` / `windowEnd` (ms or ISO) for the selected minutes.
4. Chart X: `type="number"` + `domain={[start, end]}` + `formatAxisTime` ticks when `seriesWindow` is set.
5. `trend()` subquery `max(ts)` must use the same `source IN ('live','history')` filter as the outer query.
6. E2E: play toggles live; with 1h selected, response/domain minutes ≈ 60; pause stops updates.

## DO NOT
1. Do not require global plant Start/replay for card live (card play is independent).
2. Do not put play on non-allowlisted cards.
3. Do not invent multi-hour synthetic fill when CH is sparse (domain only).
4. Do not claim done without Playwright artifact `ok: true`.

## Proof
- Script: `scripts/browser-e2e-historian-live.mjs`
- Artifact: `data/browser-e2e/historian-live-result.json`

## Measure of success (DoD)
- [x] Allowlisted card shows play control; default not live.
- [x] Play → `data-live="1"` and series refreshes (point/window end can move).
- [x] 1h (or any range) exposes window span matching selected minutes on the binding/API.
- [x] Pause → live off; range selection unchanged.
- [x] Existing historian-range E2E still passes.
