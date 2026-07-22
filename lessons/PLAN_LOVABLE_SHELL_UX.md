# Learning — Lovable shell UX lock (chat + personas + real Overview)

**Status:** PASS (implemented on `feat/replit-all-visuals`)

## Goal
Match Lovable Indigo Mint look; left chat with stored sessions + progress; top personas; Overview = real ClickHouse only; other personas empty until ask (3 starter questions).

## DO
1. Port Lovable tokens/fonts into `globals.css` + `layout.tsx`.
2. Chat list (localStorage) + populate progress + ask stream progress in left pane.
3. Overview stage bound to `/api/plant/engineer` (real tags/trends).
4. Persona stages empty until tower/roleData; 3 clickable questions per mode.
5. Mode order: Overview · Engineer · Finance · Maintenance · Safety · Operations.

## DO NOT
1. Seed Lovable towers as Overview defaults.
2. Pre-fill Engineer/Finance/Ops stages before the user asks.
3. Invent maintenance/safety backend agents (engineer tools + prompts only).

## DoD
- [x] Lovable color language on shell
- [x] Overview real CH metrics + trends
- [x] Empty personas + 3 questions
- [x] Chat progress on populate and ask
- [x] `tsc --noEmit` clean
