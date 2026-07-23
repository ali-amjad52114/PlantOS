/**
 * Gate for auto canvas pin land — PLAN_ANSWER_BEFORE_CANVAS.
 * Charts must not appear until the chat takeaway text is visible and the stream is idle.
 */

export type ChatAnswerMessage = {
  id: string;
  role: string;
  parts?: Array<{ type: string; text?: string }>;
};

export function chatAnswerReady(opts: {
  messages: ChatAnswerMessage[];
  /** useChat status — submitted/streaming means answer not finished. */
  status: string;
  /** Only count assistant text after this user message (this ask). */
  sinceUserMessageId?: string | null;
}): boolean {
  const status = String(opts.status || "");
  if (status === "submitted" || status === "streaming") return false;

  const messages = opts.messages ?? [];
  let from = 0;
  if (opts.sinceUserMessageId) {
    const idx = messages.findIndex((m) => m.id === opts.sinceUserMessageId);
    if (idx >= 0) from = idx;
  }

  const slice = messages.slice(from);
  const userIdx = slice.findIndex((m) => m.role === "user");
  const afterUser = userIdx >= 0 ? slice.slice(userIdx + 1) : slice;

  for (const m of afterUser) {
    if (m.role !== "assistant") continue;
    for (const part of m.parts ?? []) {
      if (part.type === "text" && String(part.text ?? "").trim().length > 0) {
        return true;
      }
    }
  }
  return false;
}
