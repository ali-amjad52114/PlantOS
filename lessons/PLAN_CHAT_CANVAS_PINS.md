# Plan — Chat → canvas pin board (2-column grid slots)

**Status:** PASS (grid slots — see `data/browser-e2e/canvas-pins-result.json`)  
**Scope:** UX only — pin visuals from chat onto the right stage. No new agents, actions, or Trigger tools.  
**Branch:** continue on `feat/replit-all-visuals` (or current working branch).

## Goal
User talks in chat; visuals appear there. User can **pin** a visual to the right canvas (drag preferred, Pin button OK as fallback), **reorder** pins in grid slots, **cycle size** (1 box ↔ 2-wide), **remove** with X, **zoom** via Zoom. Canvas is a curated **2-column slot grid** — not free-floating absolute positions.

## Product lock (read first)
- Chat = stream. **Right stage = one canvas** (not canvas + a second Lovable section).
- Charts are **individual pins** (one Lovable card / one finding / one viz) — never a glued 4-card tower that moves as one.
- Canvas layout = **two columns**. Chart footprints:
  - **1 box** — half row (default)
  - **2 wide** — full row (two horizontal boxes)
- Pin or drag **one chart** from chat onto the canvas (**move**, not copy — source leaves chat); charts snap into order/slots rather than floating pixel coords.
- Drag a pin onto another pin to **swap order**; resize control **cycles** 1 ↔ 2.
- Live CH refresh updates card **bindings only** — does not reshuffle order/span of other pins; never resurrects dismissed pins.
- Compact findings UI in chat stays (do not revert to bulky prose).
- **Ask wait UX** (Trigger ambient progress + receipt on the canvas) is owned by [`PLAN_TRIGGER_WAIT_STATE.md`](./PLAN_TRIGGER_WAIT_STATE.md) — not by this pins plan.
- **First ask vs follow-up placement** (2 charts on canvas for first ask; later asks keep charts in chat) is owned by [`PLAN_FIRST_ASK_CANVAS.md`](./PLAN_FIRST_ASK_CANVAS.md) — not by this pins plan.

## DO
1. `CanvasPin`: `{ id, sourceMessageId?, kind, payload, order, span }` with `span: 1 | 2`.
2. Own `canvasPins: CanvasPin[]` in `page.tsx` (React state). Optional `localStorage` only if trivial — not required for DoD.
3. Show visuals **in chat** again for pin sources. Keep chat readable (findings panel + short takeaway).
4. Each pin-able chat visual: **Pin** control + drag handle (HTML5 DnD; no heavy board library).
5. Right stage: CSS `grid` with `grid-template-columns: 1fr 1fr`; drop appends at next `order` with `span: 1`.
6. On canvas: drag handle to reorder (swap); resize button cycles span; **X** removes; Zoom opens focus overlay (Esc or X closes).
7. Do **not** render a second “Lovable / question cards” panel under the canvas.
8. Prove with Playwright (`scripts/browser-e2e-canvas-pins.mjs`) including span cycle + reorder. Update DoD only after proof.

## DO NOT
1. Do not build actions, workflows, export, share, multi-user, or auth.
2. Do not add new Trigger tasks, tools, or change investigate/replay semantics.
3. Do not add `@dnd-kit` / react-grid-layout / a full whiteboard SDK unless HTML5 DnD fails in Chromium.
4. Do not redesign the whole shell, personas, or Lovable card catalog.
5. Do not remove question→CH bind / live feed / Start–Pause–Reset.
6. Do not invent fake plant values; pins only re-render existing payloads/specs.
7. Do not claim “done” in chat without running the test below and attaching pass evidence.
8. Do not persist pins to a database.
9. Do not return to free-float absolute `x/y` positioning.

## Build order (stop when DoD passes — no gold-plating)
1. State + Pin → pin in grid slot.
2. Drop from chat → canvas.
3. Cycle span + reorder + X.
4. Zoom/focus.
5. E2E proof script.

## Measure of success (DoD)
- [x] Right stage is **one canvas** (no separate Lovable panel under it).
- [x] After an Ask / Pin, charts appear **on the canvas** in the 2-column grid.
- [x] User can **Move** or drag from chat onto the canvas (source leaves chat; no duplicate).
- [x] User can **reorder** by dragging a pin onto another (order swaps).
- [x] User can **cycle size** 1 ↔ 2-wide via resize control (`data-span`).
- [x] **X** removes a pin; chat message remains; live refresh does not resurrect dismissed pins.
- [x] **Zoom** → focus UI; dismiss returns to board.
- [x] Starter-question CH bind / live strip still works (bound towers land as canvas pins).
- [x] `npx tsc --noEmit` clean.
- [x] Playwright proof script exits `ok: true` (includes span cycle + reorder).

## Proof
- `node scripts/browser-e2e-canvas-pins.mjs` → `ok: true`
- Artifact: `data/browser-e2e/canvas-pins-result.json`
- Screenshots: `canvas-01-pinned.png` … `canvas-04-removed.png` (+ resize/reorder)
- Fixture path: `/?e2eCanvas=1` (no OpenAI required)

## Test (required before reporting done)
**Runtime:** `http://localhost:3001` + Trigger `npx trigger.dev@4.5.6 dev` if Ask-agent is needed. For UI-only, use `/?e2eCanvas=1`.

Add / keep `scripts/browser-e2e-canvas-pins.mjs` that:
1. Opens the app, waits for shell, clicks Engineers.
2. Ensures pin sources (fixture).
3. Pins → asserts pin count ≥ 1, default `data-span="1"`.
4. Cycles resize → asserts span 2, then back to 1.
5. Pins a second chart; drag-reorder → asserts DOM/order swap.
6. Opens Zoom focus → asserts focus UI; closes it.
7. Clicks X → pin count decreases.
8. Writes `data/browser-e2e/canvas-pins-result.json` + PNGs.

**Agent report rule:** Paste script exit + path to `canvas-pins-result.json`. Do **not** say the feature is complete without that.

## Out of scope (later)
- Arbitrary pixel sizes, free-float, z-order UI, undo stack.
- Syncing pins across personas/tabs.
- “Send pin to action” / agent steering from canvas.

## Files likely touched
- `src/app/page.tsx` — pin state + handlers
- `src/components/plant-chat.tsx` — show visuals, Pin/drag source
- `src/components/visual-stage.tsx` — stage chrome
- `src/components/canvas-pin-board.tsx` — grid board
- `src/lib/canvas-pins.ts` — types + helpers
- `scripts/browser-e2e-canvas-pins.mjs`

## Lessons to respect
- [`BROWSER_E2E_LEARNINGS.md`](./BROWSER_E2E_LEARNINGS.md) — Playwright proof; don’t trust UI copy alone.
- [`PLAN_MAIN_SHELL_REDESIGN.md`](./PLAN_MAIN_SHELL_REDESIGN.md) — keep chat | stage composition; don’t add button clutter.
- [`REALTIME_VS_CHAT_STREAM.md`](./REALTIME_VS_CHAT_STREAM.md) — canvas pins are UI state, not Realtime run metadata.
