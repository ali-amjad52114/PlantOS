# Plan — Answer in chat before canvas charts

**Status:** PASS  
**Scope:** Timing only — when first-ask (and bound) canvas charts may appear relative to the chat answer. No new agents, Trigger tools, or card redesign.  
**Branch:** continue on current working branch.  
**Canonical for agents:** this file + `.cursor/rules/answer-before-canvas.mdc`.  
**Related:** [`PLAN_FIRST_ASK_CANVAS.md`](./PLAN_FIRST_ASK_CANVAS.md), [`PLAN_TRIGGER_WAIT_STATE.md`](./PLAN_TRIGGER_WAIT_STATE.md).

## Why this happens (diagnosis — do not “fix” this away)

Today canvas cards are **not gated on the chat answer**. They are gated on **Trigger chat going idle** (and a hang escape hatch):

1. User asks → `askQuestion` sets `awaitingBindRef` and shows the Trigger wait UI on the canvas.
2. Agent runs tools (ClickHouse investigate, optional `data-plant-tower`) while `useChat` status is `submitted` / `streaming` (`busy === true`).
3. When `busy` flips **true → false**, `onAgentBusyChange` immediately calls `revealBoundTower()` in `page.tsx`.
4. `revealBoundTower` fetches `/api/plant/bound-tower` and **lands the first-ask charts on the canvas right away**.
5. Separately, a **12s hang timeout** can call the same `revealBoundTower()` even while the agent is still working — so charts can appear while chat still has no takeaway.

So the canvas path is: **“Trigger idle (or 12s) → CH bind → pins.”**  
It does **not** check: “assistant message has visible answer text in chat.”

That race feels fake: numbers/charts show up as if the system already knew, then the prose catches up. Charts can also land from the hang path before any answer exists.

Chat charts are already suppressed on first ask (`allowChatCharts` / `hideChatCharts`). The bug is **canvas too early**, not “charts still in chat.”

## Goal
For a first ask (and any ask that auto-lands bound charts on the canvas): **show the answer blurb in chat first**, then land the canvas charts. Until the answer is visible, keep the Trigger wait / binding state on the canvas — do not paint Lovable pins early.

## Product lock
1. Order must feel causal: **question → wait → chat answer → then canvas charts** (first ask: exactly 2 mapped cards, per first-ask plan).
2. Do **not** land auto canvas pins solely because `busy` became false.
3. Do **not** land auto canvas pins from the hang timeout until the answer gate passes (or the user/session explicitly abandons — see DO NOT).
4. Follow-up asks still keep charts in chat; this plan does not change that placement rule.
5. Wait UI remains Trigger-native (`PLAN_TRIGGER_WAIT_STATE`); binding phase may stay visible until pins land **after** the answer gate.

## Answer gate (definition)
Treat the chat answer as ready when **all** are true:
- `useChat` status is idle/`ready` (not `submitted` / `streaming`), **and**
- There is an **assistant** message for this turn with **non-empty text** (trimmed) — the takeaway/blurb the user reads.

Optional hardening (if flaky): require the text part to appear **after** the latest user message for this ask.

Do **not** treat tool-only output (findings/tower parts without prose) as the answer.

## DO
1. Introduce a small pure helper, e.g. `chatAnswerReady({ messages, status, sinceUserMessageId? })` → boolean.
2. Change `revealBoundTower` / first-ask land so auto canvas pin land runs only when **answer gate** is true (in addition to existing first-vs-follow-up rules).
3. On `busy` true→false: if answer not ready yet, **wait** (subscribe to messages/status) and reveal when gate passes — do not no-op forever.
4. Hang timeout (~12s): may show a soft warning, but **must not** land charts before the answer gate. Prefer extending wait UI over dumping cards.
5. Keep first-ask: still exactly 2 mapped cards on canvas; still hide those charts from chat.
6. Prove with Playwright before claiming done (see Test).
7. Cross-link from `PLAN_FIRST_ASK_CANVAS.md` and `PLAN_TRIGGER_WAIT_STATE.md` that **answer-before-canvas** owns this timing.

## DO NOT
1. Do not restore “dump CH cards at 1.6s / 12s while the answer is still missing.”
2. Do not invent fake streaming of chart values to fake causality.
3. Do not change Trigger tools, investigate SQL, or question→card maps.
4. Do not put first-ask charts back into chat.
5. Do not claim done without the proof artifact below.
6. Do not redesign the shell or pin grid.

## Build order
1. Helper: `chatAnswerReady`.
2. Gate `revealBoundTower` / land behind helper; queue reveal when busy ends early.
3. Neutralize hang-timeout card dump before answer.
4. E2E proof + mark PASS.

## Measure of success (DoD)
- [x] After first ask starts, canvas has **no** new auto-landed pins until chat shows assistant text for that turn.
- [x] Once assistant text is visible, first-ask canvas gets **exactly 2** mapped cards (existing first-ask rules).
- [x] Hang / slow Trigger does **not** paint those pins before chat text.
- [x] Follow-up placement unchanged (charts in chat; no auto canvas land).
- [x] Playwright proof → `ok: true`.

## Proof
- Script: `scripts/browser-e2e-answer-before-canvas.mjs`
- Artifact: `data/browser-e2e/answer-before-canvas-result.json`
- Fixture idea (`?e2eAnswerGate=1`): simulate “bound tower ready” **before** injecting assistant text → assert pin count still 0; then inject blurb → assert pins land (2). No OpenAI required if fully simulated.

## Test (required before reporting done)
1. Open app with e2e gate fixture.
2. Start first-ask simulation with CH payload available but **no** assistant text → assert canvas auto pins === 0.
3. Inject / reveal assistant blurb → assert canvas pins === 2 and types match map.
4. Write JSON; exit 0 only when `ok: true`.

**Agent report rule:** Paste script exit + artifact path. Do not say complete without that.

## Files likely touched
- `src/app/page.tsx` — gate `revealBoundTower` / hang path
- `src/components/plant-chat.tsx` — signal answer-ready / message ids if needed
- `src/lib/chat-answer-ready.ts` (or similar) — pure gate
- `scripts/browser-e2e-answer-before-canvas.mjs`
- Cross-links in first-ask + trigger-wait plans

## Lessons to respect
- [`BROWSER_E2E_LEARNINGS.md`](./BROWSER_E2E_LEARNINGS.md) — prove timing in Playwright, not by eyeballing.
- [`PLAN_FIRST_ASK_CANVAS.md`](./PLAN_FIRST_ASK_CANVAS.md) — placement stays; this plan only fixes **when**.
- [`PLAN_TRIGGER_WAIT_STATE.md`](./PLAN_TRIGGER_WAIT_STATE.md) — wait UI until answer+bind, not fake plant story.
