# Plan — PlantOS main page redesign (premium shell)

**Status:** PASS  

## Goal
Replace the cheap stacked-button page with one premium composition: brand + LIVE/replay, mode nav, chat | visuals.

## DO
1. Shell: top bar + mode nav + CSS grid chat (~40%) | stage (~60%).
2. Modes: Overview · Engineer · Finance · Operations · Maintenance · Safety.
3. Visual stage: Overview SCADA/default towers; role towers + RoleVisual for agent answers.
4. Declutter: Route / Parallel / Pre-built / Evidence / Assumptions in overflow.
5. Polish tokens + PlantChat chrome; keep Phase 3/4a behavior.
6. Maintenance/Safety: UI modes with engineer agent fallback + honest placeholder stage.
7. `tsc` clean; status board note.

## DO NOT
1. Rewrite chat.agent tools or Trigger tasks.
2. Add maintenance/safety backend agents.
3. Purple generic AI theme; browser tick writer; Replit monorepo vendoring.
4. Pack stats strips into first viewport.

## DoD
- [x] First viewport = brand + modes + chat | stage
- [x] Agent answers paint right stage
- [x] Overview shows SCADA/overview visuals
- [x] Overflow holds secondary actions
- [x] `tsc --noEmit` clean

## Learning
- Premium shell = one composition (glass bar + segmented modes + chat|stage), not more buttons.
- Towers belong on the visual stage; chat keeps progress + text (`hideTowersInChat` + `onTower`).
- Maintenance/Safety can exist as nav modes with engineer agent fallback before dedicated agents exist.
