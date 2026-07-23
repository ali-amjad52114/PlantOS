"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import type { TriggerWaitView } from "@/lib/trigger-wait-phases";

export function TriggerWaitState({
  view,
  question,
  startedAt,
}: {
  view: TriggerWaitView;
  question?: string | null;
  /** Epoch ms when the ask started — drives the live timer. */
  startedAt?: number | null;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    if (view.mode !== "active" || !startedAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(id);
  }, [view.mode, startedAt]);

  useEffect(() => {
    setDetailOpen(false);
  }, [view.mode, view.receipt?.elapsedMs, view.active?.id]);

  const elapsedMs =
    view.mode === "receipt"
      ? view.elapsedMs
      : startedAt
        ? Math.max(0, now - startedAt)
        : view.elapsedMs;
  const elapsedLabel = `${(elapsedMs / 1000).toFixed(1)}s`;
  const pct = Math.max(0, Math.min(100, view.percentage));

  return (
    <div
      data-testid="trigger-wait-state"
      className="rise w-full shrink-0 px-1 pt-1"
    >
      <div className="mx-auto w-full max-w-md rounded-xl border border-border bg-surface p-4 shadow-sm">
        {question ? (
          <p className="mb-3 line-clamp-2 text-[12px] text-muted-foreground">{question}</p>
        ) : null}

        {view.mode === "active" ? (
          <>
            {view.done.length > 0 ? (
              <div className="mb-2.5 flex flex-col gap-1">
                {view.done.map((p) => (
                  <p
                    key={p.id}
                    className="flex items-center gap-2 text-[12px] text-muted-foreground"
                  >
                    <Check className="h-3.5 w-3.5 shrink-0 text-[color:var(--success)]" aria-hidden />
                    <span className="truncate">{p.headline}</span>
                  </p>
                ))}
              </div>
            ) : null}

            {view.active ? (
              <div className="flex items-start gap-3">
                <Loader2
                  className="mt-0.5 h-5 w-5 shrink-0 text-primary motion-safe:animate-spin"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium leading-snug text-foreground">
                    {view.active.headline}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] leading-snug text-muted-foreground">
                    {view.active.primitive}
                  </p>
                </div>
                <span className="shrink-0 pt-0.5 font-mono text-[11px] tabular text-muted-foreground">
                  {elapsedLabel}
                </span>
              </div>
            ) : null}
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Check className="h-4 w-4 shrink-0 text-[color:var(--success)]" aria-hidden />
            <span className="text-[13px] font-medium text-foreground">Handled by Trigger</span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {[
                view.receipt?.turn != null ? `turn ${view.receipt.turn}` : null,
                view.receipt?.toolNames?.length
                  ? `${view.receipt.toolNames.length} tool${view.receipt.toolNames.length === 1 ? "" : "s"}`
                  : null,
                elapsedLabel,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
            {view.receipt?.detailLines?.length ? (
              <button
                type="button"
                onClick={() => setDetailOpen((o) => !o)}
                className="ml-auto inline-flex h-7 items-center gap-1 rounded-lg border border-border px-2 text-[11px] text-foreground hover:bg-muted"
              >
                {detailOpen ? (
                  <>
                    Hide detail <ChevronUp className="h-3 w-3" />
                  </>
                ) : (
                  <>
                    Run detail <ChevronDown className="h-3 w-3" />
                  </>
                )}
              </button>
            ) : null}
          </div>
        )}

        <div className="mt-3.5 h-0.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-[width] duration-500 ease-out motion-reduce:transition-none"
            style={{ width: `${pct}%` }}
          />
        </div>

        {view.mode === "receipt" && detailOpen && view.receipt ? (
          <div className="mt-2.5 border-t border-border pt-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
            {view.receipt.detailLines.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
