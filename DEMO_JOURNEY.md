# PlantOS demo journey (Gate 11)

Two independent deterministic journeys (no LLM required). Run with app on `:3001`.

## Journey A — Engineer → Operations

```bash
curl -s http://localhost:3001/api/plant/live
curl -s -X POST http://localhost:3001/api/plant/replay -H "Content-Type: application/json" -d "{\"action\":\"start\"}"
curl -s -X POST http://localhost:3001/api/plant/replay -H "Content-Type: application/json" -d "{\"action\":\"tick\"}"
curl -s http://localhost:3001/api/plant/engineer
curl -s http://localhost:3001/api/plant/operations
```

Expect: `feedActive` true after tick; engineer `productionMW` number; ops `bottleneckArea` string; `elapsedMs` present.

## Journey B — Finance + controls

```bash
curl -s -X POST http://localhost:3001/api/plant/replay -H "Content-Type: application/json" -d "{\"action\":\"speed\",\"speed\":2}"
curl -s -X POST http://localhost:3001/api/plant/replay -H "Content-Type: application/json" -d "{\"action\":\"tick\"}"
curl -s http://localhost:3001/api/plant/finance
curl -s -X POST http://localhost:3001/api/plant/replay -H "Content-Type: application/json" -d "{\"action\":\"pause\"}"
curl -s http://localhost:3001/
```

Expect: finance USD fields + `disclaimer`; pause sets `playing:false`; HTML contains PlantOS + chat.agent.

## Agent path (optional)

Requires `ANTHROPIC_API_KEY` in Trigger dashboard + `npm run dev:trigger`.
Open UI → Ask agent with an Engineer question → tool progress from real `plantos-agent` tools.
