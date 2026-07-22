# Phase 1 — Streamed plant tower (Trigger data parts)

**Status:** PASS  
**Depends on:** Phase 0 PASS  
**Context:** Critique Priority 1 + Lovable card library + `REALTIME_VS_CHAT_STREAM.md`

## Goal
Make Trigger chat orchestration **visibly generate** the visual answer: stream investigation steps, then persist a **4-card Lovable tower** in durable chat history (refresh-safe within session). No question→card map yet (defaults by role).

## DO
1. Typed `data-*` parts via `chat.withUIMessage` (`investigation-step` transient, `plant-tower` persisted).
2. On each role investigation tool: write step(s) + emit default 4-card tower for that role.
3. Frontend renders `data-plant-tower` as 2×2 `LovableCardView`; fold steps into Ask-agent progress.
4. Keep existing `renderVisualization` / RoleVisual paths — tower is additive primary visual in chat.
5. Default towers (until human question wiring):
   - engineer → Turbine hall (deck 7)
   - operations → Shift command (deck 9)
   - finance → Energy value (deck 1)
6. Lesson + status update; `tsc` clean.

## DO NOT
1. Phase 2+ (parallel chat.stream.writer, clientData, dynamic tools, actions, hooks audit).
2. Rewrite page chrome, Route/Parallel Realtime, or Lovable catalog contents.
3. Invent free-form LLM HTML or new card components.
4. Wire specific demo questions yet (user owns that).
5. Bring back browser replay tick writer.
6. Bloat with three subagents or new pages.

## Measure of success (DoD)
- [x] `plant-agent` built with `chat.withUIMessage` + typed data parts
- [x] Investigate tools emit `data-investigation-step` (transient) + `data-plant-tower` (persisted)
- [x] Ask-agent UI shows tower 2×2 from message parts
- [x] Progress reflects investigation-step parts without duplicate tower rows
- [x] `tsc --noEmit` clean
- [x] Status board Phase 1 PASS

## Learning
- Ask-agent visual product = durable `data-plant-tower` parts, not only parent `RoleVisual` tool JSON.
- Keep Investigate Realtime (`useRealtimeRun`) separate from chat data parts.
- Role-default towers are interim; question→4-card maps replace `defaultPlantTower()` later without new components.
