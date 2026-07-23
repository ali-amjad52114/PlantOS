/**
 * chatAnswerReady unit checks — PLAN_ANSWER_BEFORE_CANVAS
 * Run: npx tsx scripts/test-chat-answer-ready.mjs
 */
import assert from "node:assert/strict";
import { chatAnswerReady } from "../src/lib/chat-answer-ready.ts";

assert.equal(
  chatAnswerReady({
    status: "streaming",
    messages: [
      { id: "u1", role: "user", parts: [{ type: "text", text: "q" }] },
      { id: "a1", role: "assistant", parts: [{ type: "text", text: "hello" }] },
    ],
    sinceUserMessageId: "u1",
  }),
  false,
  "streaming blocks"
);

assert.equal(
  chatAnswerReady({
    status: "ready",
    messages: [
      { id: "u1", role: "user", parts: [{ type: "text", text: "q" }] },
      {
        id: "a1",
        role: "assistant",
        parts: [{ type: "data-plant-tower", text: "" }],
      },
    ],
    sinceUserMessageId: "u1",
  }),
  false,
  "tower-only is not an answer"
);

assert.equal(
  chatAnswerReady({
    status: "ready",
    messages: [
      { id: "u1", role: "user", parts: [{ type: "text", text: "q" }] },
      {
        id: "a1",
        role: "assistant",
        parts: [{ type: "text", text: "  Plant looks steady.  " }],
      },
    ],
    sinceUserMessageId: "u1",
  }),
  true,
  "ready + text passes"
);

console.log(JSON.stringify({ ok: true }, null, 2));
