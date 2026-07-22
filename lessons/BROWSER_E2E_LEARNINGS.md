# PlantOS Browser E2E Learnings

**Date:** 2026-07-22  
**Runtime:** `http://localhost:3001` + Trigger worker `20260722.9`  
**Method:** Playwright Chromium (headless) — not ActionLayer  
**Scripts:** `plantos/scripts/browser-e2e-engineer.mjs`, `plantos/scripts/browser-e2e-agent-only.mjs`  
**Artifacts:** `data/browser-e2e/` (`results.json`, `agent-result.json`, `01-*.png` … `07-*.png`)

## Verdict

| Path | Result |
|------|--------|
| UI load + LIVE badge + replay Start | **PASS** |
| Engineer **Single role (Realtime)** investigate | **PASS** (`run_cmrw8uw2t69up0pn51279y81s`) |
| Evidence drawer | **PASS** |
| **Route & investigate** → engineer (llm) | **PASS** |
| **Ask agent** (`chat.agent` + viz) | **PASS** (after fix) — READY, Engineer investigation + viz text, no max-depth error |

### Fix (2026-07-22 later)

Root cause: `PlantChat` `useEffect([messages, onToolVisual])` re-fired on every streaming `messages` identity change and called `onToolVisual` → parent `setState` unboundedly.

Change: dedupe by `messageId:toolCallId:role` + `onToolVisualRef` (see `plantos/src/components/plant-chat.tsx`).

Re-proof: `node scripts/browser-e2e-agent-only.mjs` → `ok: true`, status READY, `sawError: false`, console clean.

### Ask-agent progress UX (2026-07-22)

**User report:** duplicate “Building visualization…” and progress didn’t feel realtime.

**Clarification:** Track B `useRealtimeRun` covers **Investigate via Trigger**, not Ask-agent chat chips. Chat progress is the **message stream**.

**Full write-up:** [`REALTIME_VS_CHAT_STREAM.md`](./REALTIME_VS_CHAT_STREAM.md) (why the mistake happened + mandatory rules).

**Fix:**
- Collapse to the **latest** `renderVisualization` tool part (hide superseded building chips).
- Hide mid-build viz spinners in the transcript; show a **live % progress bar** + Think → Investigate → Visualize → Answer from stream state.
- Prompt: call `renderVisualization` once per turn unless `ok:false`.

Re-proof agent: READY, viz present, no max-depth / no agent error.

---

## What worked (observed in browser)

1. **Home** shows PlantOS brand + “One plant. One truth.”
2. **LIVE** badge present; live max timestamp and row counts update (e.g. ~89k→91k rows during the run).
3. **Replay Start** keeps live state (badge stayed LIVE).
4. **Single role (Realtime)** shows Trigger Realtime progress, completes, paints Engineer visual (`Engineer · ✓`).
5. **Evidence** opens a JSON `<pre>` drawer.
6. **Route & investigate** shows note like `Routed to engineer (llm)` and completes.
7. First-pass script reported **12/12 PASS**, but Ask-agent was a **false positive** (matched “turbine” in page copy while status was only `submitted`).

---

## What failed (Ask agent)

Longer agent-only run:

| Signal | Observed |
|--------|----------|
| Status | ended **ERROR** |
| Thinking… | yes |
| Tool chip “Engineer investigation” | yes |
| “Building visualization…” | yes |
| Fatal UI error | `Maximum update depth exceeded` (React nested setState / `useEffect` loop) |
| Console | repeated max-update-depth errors |

**Interpretation:** Agent session starts and tools begin (`investigateEngineer` → `renderVisualization`), then the React tree blows up before a stable viz + assistant answer remains on screen.

**Likely cause (not fixed in this run):** `PlantChat` `useEffect` walks `messages` and calls `onToolVisual` → parent `setData` / `setAgentVisuals` → re-render while streaming keeps changing `messages` → effect re-fires → infinite updates. Same class of bug as “setState in effect without guarding on prior value / run id.”

---

## TripPoint lesson alignment

| Lesson | This run |
|--------|----------|
| Browser evidence required for completion | Applied — we used Playwright, not only Trigger CLI |
| Do not treat green scripts as journey proof | First script’s Ask-agent PASS was wrong; second run caught it |
| Labels ≠ behavior | “Building visualization…” appeared, then crashed — label without finished mode |
| One runtime identity | Confirmed `:3001` + Trigger worker |

---

## Owner-visible checkpoint

```text
Current goal: Browser-prove Engineer journey
Visible behavior changed: none (test-only; Playwright + learnings doc)
Active URL: http://localhost:3001
What works now: LIVE/replay, Realtime investigate, Evidence, Route→engineer
What remains broken: Ask agent infinite update loop after tool/viz start
Tests actually run: Playwright engineer E2E + agent-only long wait
Browser evidence: data/browser-e2e/*.png + results.json + agent-result.json
Product decisions made: none
Owner decision required: fix PlantChat onToolVisual loop before claiming Gate 11 agent path
Next checkpoint: patch chat effect, re-run agent-only until READY with viz and no error
```

---

## How to re-run

```bash
cd plantos
node scripts/browser-e2e-engineer.mjs
node scripts/browser-e2e-agent-only.mjs
```

Requires `npm run dev -- -p 3001` and `npm run dev:trigger` already up.
