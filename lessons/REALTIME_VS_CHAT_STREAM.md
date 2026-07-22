# Lesson: Do not conflate Trigger Realtime with chat.agent stream progress

**Date:** 2026-07-22  
**Context:** PlantOS Tracks A–C + Ask-agent UX bug (duplicate “Building visualization…”, progress felt non-realtime)  
**Related:** `TRIPPOINT_FORENSIC_AUDIT.md`, `BROWSER_E2E_LEARNINGS.md`, skills `trigger-realtime-and-frontend`, `trigger-authoring-chat-agent`, examples `realtime-csv-importer`, `clickhouse-chat-agent`

## What happened

The owner reported Ask-agent progress looked broken (duplicate visualization status) and “not realtime,” after we had claimed Track B Realtime was done.

We had correctly wired **Realtime** for `plant-investigate` (`tasks.trigger` + scoped PAT + `useRealtimeRun` + `metadata.set`).

We had **not** given Ask-agent the same kind of live progress affordance. Ask agent uses `chat.agent` + `useTriggerChatTransport` + streaming tool parts. Calling that “Realtime done” was wrong.

## Root mistake

**Scope conflation:** one word (“Realtime”) was applied to two different Trigger surfaces.

| Surface | Correct skill / example | Correct UI mechanism |
|---------|-------------------------|----------------------|
| Investigate / background run | `trigger-realtime-and-frontend`, `realtime-csv-importer` | `useRealtimeRun` + run `metadata` progress % |
| Ask agent / chat | `trigger-authoring-chat-agent`, `clickhouse-chat-agent` | Chat message stream + tool parts (`data-progress` optional) |

References and skills were available. They were not re-checked at the **path boundary** when the owner complained.

## Contributing failures (same family as TripPoint)

1. **Proof bias** — Playwright READY + viz counted as success; that is completion proof, not progress-UX proof.
2. **Labels ≠ behavior** — “Building visualization…” appeared twice; a spinner is not a progress system.
3. **Example copy without hardening** — clickhouse-chat-agent also renders per-`renderVisualization` part; we didn’t handle double tool calls.
4. **No skill re-read on bug report** — should have opened realtime vs chat-agent skills first and stated the gap before patching.

## Rules (mandatory going forward)

1. **Name the path in every status line.**  
   Write: `Investigate = useRealtimeRun` · `Ask agent = chat stream`. Never say “Realtime done” for the whole app.

2. **Re-open the matching skill before fixing a progress bug.**  
   Progress on a triggered task → realtime skill. Progress inside Ask agent → chat-agent skill / chat example.

3. **Browser-check the affordance, not only the terminal state.**  
   For Ask agent: exactly one live progress UI while streaming; no duplicate tool status rows; then READY + viz.

4. **When the owner says a word from a skill (“realtime”), map it to that skill before coding.**  
   Do not invent a meaning from the last track you finished.

5. **Keep proofs path-scoped.**  
   `proof-realtime-investigate` does not prove Ask-agent progress. `browser-e2e-agent-only` does not prove Investigate Realtime metadata.

## Corrected PlantOS split (as of this lesson)

- **Investigate via Trigger / Route / Parallel parents:** Trigger Realtime (`useRealtimeRun`, metadata %).
- **Ask agent:** live **chat stream** progress bar derived from tool/message parts **and** Trigger `data-*` parts (`data-investigation-step` transient, `data-plant-tower` durable Lovable tower). Not `useRealtimeRun` unless we explicitly subscribe the agent run later.

## Owner-visible one-liner

> Skills were followed for Track B investigate Realtime; Ask-agent was mislabeled as covered. That was a sequencing/attention failure, not a missing reference.
