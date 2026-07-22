# Plan — Question → unique cards → ClickHouse bind

**Status:** PASS

## Goal
3 starter questions per persona map to unique 4-card towers; on click, bind real ClickHouse snapshot values into those cards (no seed drift).

## DO
1. `question-card-maps.ts` — 18 maps (6 modes × 3 questions).
2. `card-bindings.ts` + `GET /api/plant/bound-tower`.
3. Tower payload supports `binding` + `source: "question-map"`.
4. `LovableCardView` renders CH bindings; badge ClickHouse.
5. Question chips fetch bound tower then submit chat narrative.

## DO NOT
1. Seed `useLiveNumber` on mapped cards.
2. New card types outside `card-meta`.
3. Rewrite Trigger agents / add maint-safety backends.
4. Bind entire gallery catalog.
5. Palette/shell redesign in this package.

## DoD
- [x] 18 maps; no identical 4-tuples within a mode
- [x] Click starter → CH-bound cards on stage
- [x] Persona restore of last bound tower
- [x] Finance $ labeled synthetic; MW from CH
- [x] `tsc --noEmit` clean

## Proof
- `GET /api/plant/bound-tower?mode=engineer&q=0` → `source=question-map`, `dataSource=clickhouse`, 4 cards with bindings
- Finance / operations maps return distinct card sets
