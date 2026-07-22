# Phase 4a — Typed clientData + dynamic tools (+ turn audit)

**Status:** PASS  
**Depends on:** Phase 0–1, 3 PASS (Phase 2 still deferred)  
**Context:** Critique “cleaner agent architecture” — first Phase 4 package only. Chat actions → Phase 4b.

## Goal
Role context and tool surface become first-class Trigger chat features: typed `clientData.role` (no `[role=…]` message hack), per-role dynamic tools, and lightweight turn audit via lifecycle hooks. Same product surface.

## DO
1. `chat.withClientData` schema: `{ role, allowAdvanceReplay? }`.
2. Frontend `useTriggerChatTransport({ clientData: { role } })`; send plain question text (no role prefix).
3. Dynamic `tools: ({ clientData }) => …`:
   - Always: `getLivePlantStatus`, `renderVisualization`
   - Role: only that role’s `investigate*` tool
   - `advanceReplay` only when `allowAdvanceReplay === true` (default off)
4. Lifecycle: `onBoot` + `chat.local` turn clock; `onTurnStart` / `onBeforeTurnComplete` / `onTurnComplete` log + metadata + transient `data-turn-audit`.
5. System prompt: role comes from clientData; do not require `[role=]` in the user text.
6. Lesson + status board; `tsc --noEmit` clean.

## DO NOT
1. Do **not** implement chat actions (Phase 4b).
2. Do **not** start Phase 2 (parallel chat.stream.writer into root).
3. Do **not** rewrite Lovable catalog, Route/Parallel, or replay writer rules.
4. Do **not** restore browser tick writer.
5. Do **not** add new pages, three chat subagents, or new dependencies.
6. Do **not** trust browser `clientData` for auth identity (role is UX routing only for this demo).

## Measure of success (DoD)
- [x] Agent uses `withClientData` + role schema
- [x] PlantChat passes `clientData.role`; messages have no `[role=…]` prefix
- [x] Tools resolve per role; `advanceReplay` absent unless explicitly allowed
- [x] `onTurnStart` / `onTurnComplete` emit turn audit (metadata + transient data part)
- [x] Chat UI surfaces turn-audit briefly in stream progress
- [x] `tsc --noEmit` clean
- [x] Status board Phase 4a PASS
- [x] Runtime smoke: live API up; Trigger worker indexed; no type errors

## Out of scope
| Package | Theme |
|---------|--------|
| 4b | Chat actions (time range / focus asset without full model turn) |
| 2 | Louder parallel progress into chat |

## Learning
- Role as `clientData` beats string prefixes: tools/prompt stay clean and Zod-validated per turn.
- Dynamic `tools: ({ clientData }) => …` is the right place to hide `advanceReplay` so the model cannot tick the plant by accident.
- Write complete-turn UI audit in `onBeforeTurnComplete` (has `writer`); `onTurnComplete` is for metadata/logging after the stream closes.
- Keep a full `allTools` map for `InferUITools` typing even when the runtime set is a subset.
