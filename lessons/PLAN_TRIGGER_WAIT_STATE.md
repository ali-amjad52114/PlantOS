# Plan — Trigger.dev ambient wait state (canvas)

**Status:** SHIPPED (ambient wait + receipt on Ask canvas)  
**Scope:** Replace the canvas “waiting / preparing” UI with a Trigger-native ambient progress + fold-up receipt. UX only on the Ask → stage path.  
**Branch:** continue on current working branch (`feat/replit-all-visuals` or whatever is active).  
**Canonical for agents:** this file + `.cursor/rules/trigger-wait-state.mdc`.

## Goal
While an Engineers (or other persona) starter question is in flight, the **right canvas** shows that PlantOS is running on **Trigger.dev** — calmly, not as a plant “investigation story.” One plain-language phase at a time, with the real Trigger primitive named underneath. When the turn finishes, collapse into a **one-line receipt** that can expand to run detail. Then (existing behavior) bind CH / land Lovable pins — do not dump cards before Trigger finishes.

## Product lock (read first)
- This is a **Trigger depth** story, not a plant-findings story. No “investigating turbine tags” as the hero line unless it is literally a durable tool name under a Trigger primitive subtitle.
- Pattern from the agreed mock:
  - **Now:** growing list of every phase that has run; each completed row keeps its **own duration** on the right; active row shows a live timer that resets when the previous phase ends.
- **Done trail:** keep **all** completed phases (do not drop older ones).
- **Receipt:** full timed list stays visible + one-line Trigger summary (`Handled by Trigger · …`) with optional **Run detail** expand.
- Drive phases from **real signals only** (chat transport status, stream parts, agent metadata we already emit). Do **not** fake parallel “3 child runs” on the Ask chat path — that belongs to `plant-parallel-investigate`, not `plantos-agent` Ask.
- Keep canvas pin board rules from `PLAN_CHAT_CANVAS_PINS.md` (grid 1 | 2-wide, no free-float, no early CH dump before Trigger idle).
- Existing hang fallback (show CH cards if Trigger stalls) may remain, but the wait UI must still look Trigger-native until that fallback fires.

## Phase ladder (Ask / `plantos-agent` only — map signals → copy)

Use only phases that actually fire. Skip any phase whose signal never appears.

| Order | Plain headline (UI) | Primitive subtitle (mono) | Primary signal |
|------:|---------------------|---------------------------|----------------|
| 1 | Opening a durable session | `chat.createStartSessionAction` · realtime token | Session start / token mint / first submitted |
| 2 | Worker picking up the turn | chat status `submitted` → `streaming` | `useChat` status |
| 3 | Booting the agent | `onChatStart` · role-scoped tools | `data-turn-audit` status `started` (+ toolNames) |
| 4 | Running the model | `streamText` · `toStreamTextOptions` | metadata `phase: run` / streaming with no tool yet / `llmProvider` |
| 5 | Executing a durable tool | `tool:<name>` · worker-side | active `tool-*` part (not output-available) |
| 6 | Writing the turn | `onTurnComplete` · turn audit | `data-turn-audit` status `complete` (+ elapsedMs) |
| 7 | Binding live cards | post-run ClickHouse bind | app `revealBoundTower` / bind in progress (after Trigger idle) |

Receipt summary fields (when available): turn count, tool names used, `elapsedMs`, role, optional run/session id if already in hand — keep to one line until expanded.

## DO
1. Replace `StageWaitingPanel` (or extract a small dedicated component under `src/components/`) with the ambient wait + receipt UI described above.
2. Derive wait state from existing Ask plumbing in `page.tsx` / `plant-chat.tsx`:
   - `onStreamProgress` / message parts / busy edge
   - Prefer **live** labels from real parts over coarse remapped “Think / Investigate / Tower / Answer.”
3. Map stream + status → the phase ladder table; keep max **1 active** + **all done** visible with per-step timings.
4. On Trigger turn complete (busy true→false after `sawBusy`), show receipt briefly, then proceed with existing CH bind + pin land (do not resurrect the 1.6s early bind).
5. Style: calm, compact, fits existing shell tokens (surface / border / muted / mono). Match the mock’s hierarchy (headline / primitive / timer / bar / receipt) without importing Tabler CDN or new design systems unless already in-repo.
6. `prefers-reduced-motion`: no infinite spinner spin; bar may jump.
7. Update this plan’s Status when shipped; leave a short note in `PLAN_CHAT_CANVAS_PINS.md` that wait UX is owned by **this** plan (cross-link only).

## DO NOT
1. Do not invent phases, fake child runs, or simulated progress timers that ignore the stream.
2. Do not show plant tag values, SQL, or findings lists inside the wait panel.
3. Do not add new Trigger tasks, tools, or change `plant-agent` investigate semantics unless required to expose a missing signal (prefer UI-only first).
4. Do not subscribe to unrelated runs (replay burst, outbound Slack) in this panel.
5. Do not restore “dump Lovable cards at 1.6s while Trigger still runs.”
6. Do not rebuild the whole shell, chat transcript, or pin grid.
7. Do not add a Measure of success / DoD / checkbox proof gate in this plan — ship the UX; proof is optional later if asked.
8. Do not overwhelm: no full metadata dump, no long step lists, no second progress UI competing on the same canvas.

## Build order
1. Define a small pure mapper: `(chatStatus, message parts, optional metadata) → { active, done[], elapsedMs, receipt }`.
2. Build the wait/receipt presentational component (active + done trail + bar + receipt expand).
3. Wire it into the stage overlay used while `stageProgress` / awaiting bind is set; feed it real Ask signals.
4. Align copy with the phase ladder; drop dead phases.
5. Confirm cards still land only after Trigger idle (+ existing hang fallback).
6. Cross-link from canvas pins plan; mark this plan Status when done.

## Files likely touched
- `src/components/visual-stage.tsx` — swap waiting panel
- New small: `src/components/trigger-wait-state.tsx` (or similar) + optional `src/lib/trigger-wait-phases.ts` mapper
- `src/app/page.tsx` — pass richer wait props if needed (busy, parts summary, audit, elapsed)
- `src/components/plant-chat.tsx` — only if a cleaner progress/audit callback is required
- `lessons/PLAN_TRIGGER_WAIT_STATE.md` (this file)
- `.cursor/rules/trigger-wait-state.mdc`

## Lessons / rules to respect
- [`PLAN_CHAT_CANVAS_PINS.md`](./PLAN_CHAT_CANVAS_PINS.md) — canvas pins + no early card dump
- Trigger chat agent skill — do not break `chat.toStreamTextOptions` / session actions
- [`REALTIME_VS_CHAT_STREAM.md`](./REALTIME_VS_CHAT_STREAM.md) if present — Ask wait is chat-stream + agent metadata, not necessarily `useRealtimeRun` unless you already have a run id

## Agent report rule
When implementing, say what phases are wired to which signals and confirm the early CH bind remains off. Do **not** invent a DoD checklist for this plan.
