# Plan — Chat → canvas pin board (drag, move, zoom)

**Status:** PASS (DoD proven — see `data/browser-e2e/canvas-pins-result.json`)  
**Scope:** UX only — pin visuals from chat onto the right stage. No new agents, actions, or Trigger tools.  
**Branch:** continue on `feat/replit-all-visuals` (or current working branch).

## Goal
User talks in chat; visuals appear there. User can **pin** a visual to the right canvas (drag preferred, Pin button OK as fallback), **move** pins on the canvas, **remove** with X, **click** to zoom/focus. Canvas is a curated board — not an auto-dump of every agent tower.

## Product lock (read first)
- Chat = stream. **Right stage = one canvas** (not canvas + a second Lovable section).
- Charts are **individual pins** (one Lovable card / one finding / one viz) — never a glued 4-card tower that moves as one.
- Pin or drag **one chart** from chat onto the canvas; move, resize, zoom, remove independently.
- Live CH refresh updates card **bindings only** — does not reshuffle positions/sizes of other pins.
- Compact findings UI in chat stays (do not revert to bulky prose).

## DO
1. Define a small `CanvasPin` type: `{ id, sourceMessageId?, kind, payload, x, y, w?, h? }` with `kind`: `tower` | `viz` | `findings`.
2. Own `canvasPins: CanvasPin[]` in `page.tsx` (React state). Optional `localStorage` only if it stays trivial — not required for DoD.
3. Show visuals **in chat** again for pin sources (towers / viz / findings). Keep chat readable (findings panel + short takeaway).
4. Each pin-able chat visual: **Pin** control + drag handle (HTML5 DnD is enough; no new heavy board library unless DnD is broken).
5. Right stage (`visual-stage` or thin wrapper): droppable surface; on drop / Pin → append pin at drop coords or a simple cascade position.
6. On canvas: drag to move; **resize** via corner handle; **X** removes pin; click opens focus/zoom overlay (Esc or X closes). Dim siblings while focused.
7. Do **not** render a second “Lovable / question cards” panel under the canvas — charts only exist as canvas pins.
8. Prove with Playwright (`scripts/browser-e2e-canvas-pins.mjs`) including resize. Update DoD only after proof.

## DO NOT
1. Do not build actions, workflows, export, share, multi-user, or auth.
2. Do not add new Trigger tasks, tools, or change investigate/replay semantics.
3. Do not add `@dnd-kit` / react-grid-layout / a full whiteboard SDK unless HTML5 DnD fails in Chromium — prefer the smallest thing that works.
4. Do not redesign the whole shell, personas, or Lovable card catalog.
5. Do not remove question→CH bind / live feed / Start–Pause–Reset.
6. Do not invent fake plant values; pins only re-render existing payloads/specs.
7. Do not claim “done” in chat without running the test below and attaching pass evidence.
8. Do not persist pins to a database.

## Build order (stop when DoD passes — no gold-plating)
1. State + Pin button → pin appears on canvas (no drag yet).
2. Drop from chat → canvas.
3. Move on canvas + X.
4. Click focus/zoom.
5. E2E proof script.

## Measure of success (DoD)
- [x] Right stage is **one canvas** (no separate Lovable panel under it).
- [x] After an Ask / Pin, charts appear **on the canvas**.
- [x] User can **Pin** or drag from chat onto the canvas.
- [x] User can **drag-move** a pin; position sticks after mouseup.
- [x] User can **resize** width×height via the corner handle.
- [x] **X** removes a pin; chat message remains.
- [x] **Click** pin → zoom/focus UI; dismiss returns to board.
- [x] Starter-question CH bind / live strip still works (bound towers land as canvas pins).
- [x] `npx tsc --noEmit` clean.
- [x] Playwright proof script exits `ok: true` (includes resize).

## Proof
- `node scripts/browser-e2e-canvas-pins.mjs` → `ok: true`
- Artifact: `data/browser-e2e/canvas-pins-result.json`
- Screenshots: `canvas-01-pinned.png` … `canvas-04-removed.png` (+ resize)
- Fixture path: `/?e2eCanvas=1` (no OpenAI required)

## Test (required before reporting done)
**Runtime:** `http://localhost:3001` + Trigger `npx trigger.dev@4.5.6 dev` if Ask-agent is needed for a real tower. For UI-only pin/move/zoom, a **fixture pin** injected in the script is allowed so agents do not block on OpenAI.

Add `scripts/browser-e2e-canvas-pins.mjs` that:
1. Opens the app, waits for shell.
2. Ensures at least one pin source (fixture **or** real chat visual).
3. Pins / drops onto canvas → asserts pin count ≥ 1.
4. Moves pin → asserts `x/y` (or style) changed.
5. Opens focus → asserts focus UI; closes it.
6. Clicks X → pin count decreases.
7. Writes `data/browser-e2e/canvas-pins-result.json` + 2–4 PNGs.

**Agent report rule:** Paste script exit + path to `canvas-pins-result.json`. Do **not** say the feature is complete without that. If blocked (no Trigger / no visual), say BLOCKED with the failing step — do not mark DoD checked.

## Out of scope (later)
- Snap-to-grid, resize handles, z-order UI, undo stack.
- Syncing pins across personas/tabs.
- “Send pin to action” / agent steering from canvas.

## Files likely touched
- `src/app/page.tsx` — pin state + handlers
- `src/components/plant-chat.tsx` — show visuals, Pin/drag source
- `src/components/visual-stage.tsx` — droppable board + pin chrome
- New small: `src/lib/canvas-pins.ts` (types + helpers only)
- `scripts/browser-e2e-canvas-pins.mjs`

## Lessons to respect
- [`BROWSER_E2E_LEARNINGS.md`](./BROWSER_E2E_LEARNINGS.md) — Playwright proof; don’t trust UI copy alone.
- [`PLAN_MAIN_SHELL_REDESIGN.md`](./PLAN_MAIN_SHELL_REDESIGN.md) — keep chat | stage composition; don’t add button clutter.
- [`REALTIME_VS_CHAT_STREAM.md`](./REALTIME_VS_CHAT_STREAM.md) — canvas pins are UI state, not Realtime run metadata.
