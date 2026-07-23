# Plan — First ask → canvas (2 charts); follow-ups stay in chat

**Status:** PASS  
**Scope:** Placement only — where charts appear for the first vs later asks in the **same chat session**. No new agents, Trigger tools, or card catalog redesign.  
**Branch:** continue on current working branch (`feat/replit-all-visuals` or active).  
**Canonical for agents:** this file + `.cursor/rules/first-ask-canvas.mdc`.

## Goal
When the user asks the **first question in a chat session**, put the **narrative/blurb in chat** and land **exactly two question-relevant charts on the canvas**. For **every later question in that same chat**, keep **blurb + chart(s) in chat**; the user moves to canvas only if they choose (existing move-on-pin).

## Product lock (read first — do not reinterpret)
1. **First ask in a chat** = the first user turn that produces an answer in that `chatId` / session. Not “only starter Q1,” and not “first ask of the day.” A **New chat** resets this so the next ask is first again.
2. **First ask placement:**
   - Chat: text / findings blurb only — **no** pinable chart stack for that turn’s mapped/agent cards.
   - Canvas: **exactly 2** charts, both **from that question’s map** (or agent tower — see DO), CH-bound when the ask is a mapped starter.
3. **Follow-up asks (2nd, 3rd, … in same chat):**
   - Chat: blurb **and** chart(s) together (pinable / moveable as today).
   - Canvas: **do not** auto-append charts for follow-ups. Existing pins stay; live bind may refresh **bindings** of already-pinned cards only (same rule as `PLAN_CHAT_CANVAS_PINS`).
4. **Relevant, not random:** use the existing `question-card-maps` for that mode+q. Take the **first two** `cardTypes` in the map as the first-ask canvas pair. Do **not** invent unrelated cards, fill with gallery leftovers, or land all 4 map cards on first ask.
5. Pins remain individual grid pins (span 1|2); move-on-pin still removes from chat when the user moves a follow-up chart.
6. Trigger wait / CH bind timing stays owned by `PLAN_TRIGGER_WAIT_STATE.md` — do not dump first-ask cards before Trigger idle (existing hang fallback OK).

## DO
1. Track per chat session whether the **first ask has already completed** (e.g. `firstAskDone` keyed by `chatId`, or derive from “has this session already revealed a first-ask canvas pair”). Reset on New chat / new `chatId`.
2. On **first mapped ask** (`resolveQuestionIndex` hits a map): after Trigger idle + CH bind, land **only the first 2 cards** of that tower as canvas pins. Do **not** render those cards (or the rest of that tower) as pinables in chat for that turn.
3. On **follow-up asks** (same chat): show tower / viz / findings in chat as today; **skip** `applyBoundTowerPins` / auto canvas land for the new tower. Optional: still fetch CH for narrative/tools if existing path needs it — but **no auto canvas pins**.
4. Free-form first ask (no question map): if the agent emits a `data-plant-tower` with cards, auto-land **at most 2** of those cards on canvas and hide them from chat for that turn; if no tower, blurb only — **do not invent** cards.
5. Keep chat copy / takeaway for first ask; hide only the chart surfaces for that turn.
6. Prove with Playwright before claiming done (see Test). Update this plan Status → PASS only after `ok: true`.
7. Cross-link from `PLAN_CHAT_CANVAS_PINS.md`: first-vs-follow-up placement is owned by **this** plan.

## DO NOT
1. Do not auto-land 4 cards (or a glued tower) on first ask.
2. Do not auto-land charts on canvas for follow-up questions in the same chat.
3. Do not pick cards unrelated to the asked question / its map.
4. Do not change Trigger tools, investigate semantics, or add new agents.
5. Do not break move-on-pin, span cycle, reorder, zoom, or dismiss/no-resurrect rules.
6. Do not redesign the shell, personas, or card catalog.
7. Do not claim done without the proof script exit + JSON artifact below.
8. Do not treat “first question in the product” as global — it is **per chat session**.

## Build order (stop when DoD passes)
1. Session flag: first ask vs follow-up.
2. First-ask path: bind → pin **2** mapped cards → suppress those charts in chat for that turn.
3. Follow-up path: charts in chat only; no auto canvas land.
4. E2E proof script + mark plan PASS.

## Measure of success (DoD)
- [x] **First ask** (new chat → starter Q): chat shows blurb/text; canvas has **exactly 2** pins whose card types match the **first two** types in that mode+q map; those charts are **not** still in chat.
- [x] **Second ask** (same chat → another starter or typed ask): new chart(s) appear **in chat**; canvas pin count does **not** jump solely because of that follow-up auto-land.
- [x] Cards are from the question map (relevant), not arbitrary gallery picks.
- [x] New chat → first ask again uses canvas-2 behavior.
- [x] Touched placement code typechecks (pre-existing unrelated `outbound-share-bar` tsc noise excluded).
- [x] Playwright proof → `ok: true` (artifact path below).

## Proof
- Script: `scripts/browser-e2e-first-ask-canvas.mjs`
- Artifact: `data/browser-e2e/first-ask-canvas-result.json`
- Prefer `/?e2eCanvas=1` **plus** a small e2e hook if needed to simulate “first ask done” / second ask without OpenAI — but the proof must still assert **placement** rules (2 on canvas / follow-up in chat). If a fixture-only path is used, document the fixture contract in the script header.

## Test (required before reporting done)
**Runtime:** `http://localhost:3001` (+ Trigger if live Ask is used).

Script must:
1. Open app, select Engineer (or documented persona).
2. **First ask** path → assert canvas pin count === 2 and chat has no pinable copies of those first-ask cards; record card types.
3. **Second ask** path (same chat) → assert new visual appears under chat pinables; canvas count unchanged by auto-land (or only changed if user/fixture explicitly moved — default: unchanged).
4. Write JSON + optional screenshots; exit 0 only when `ok: true`.

**Agent report rule:** Paste script exit + path to `first-ask-canvas-result.json`. Do **not** say complete without that.

## Out of scope (later)
- Letting the model choose arbitrary chart types beyond the map / emitted tower.
- Syncing first-ask pins across personas/tabs.
- Changing the 4-card map catalog size (maps may stay 4; first ask only **uses** 2).

## Files likely touched
- `src/app/page.tsx` — first-ask vs follow-up land / suppress
- `src/components/plant-chat.tsx` — hide first-ask charts in chat; keep follow-up charts
- `src/lib/canvas-pins.ts` — helper to land exactly 2 cards from a tower (if useful)
- `src/lib/question-card-maps.ts` — read-only use of first two `cardTypes` (no catalog redesign required)
- `scripts/browser-e2e-first-ask-canvas.mjs` — proof
- `lessons/PLAN_CHAT_CANVAS_PINS.md` — one-line ownership cross-link

## Lessons / plans to respect
- [`PLAN_CHAT_CANVAS_PINS.md`](./PLAN_CHAT_CANVAS_PINS.md) — grid pins, move-on-pin, no free-float.
- [`PLAN_TRIGGER_WAIT_STATE.md`](./PLAN_TRIGGER_WAIT_STATE.md) — wait UI; no early CH dump.
- [`PLAN_QUESTION_CARD_CH_BIND.md`](./PLAN_QUESTION_CARD_CH_BIND.md) — maps + CH bindings remain source of truth for relevance.
- [`BROWSER_E2E_LEARNINGS.md`](./BROWSER_E2E_LEARNINGS.md) — prove in Playwright, not by eyeballing copy.
