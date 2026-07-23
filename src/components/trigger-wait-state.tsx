"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import type { TriggerWaitView } from "@/lib/trigger-wait-phases";

function formatDuration(ms: number) {
  return `${(Math.max(0, ms) / 1000).toFixed(1)}s`;
}

type FrozenStep = {
  id: string;
  headline: string;
  primitive: string;
  durationMs: number;
};

/**
 * Full task list with per-step timing:
 * - every completed task stays on the list with its frozen duration (right side)
 * - the active task shows a live timer that started when the previous task ended
 * - older tasks are never removed
 */
export function TriggerWaitState({
  view,
  question,
  startedAt,
}: {
  view: TriggerWaitView;
  question?: string | null;
  startedAt?: number | null;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [detailOpen, setDetailOpen] = useState(false);
  const [frozen, setFrozen] = useState<FrozenStep[]>([]);
  const segmentStartedAtRef = useRef<number | null>(null);
  const lastActiveIdRef = useRef<string | null>(null);
  const askKeyRef = useRef<number | null>(null);
  const frozenIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (view.mode !== "active" || !startedAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(id);
  }, [view.mode, startedAt]);

  // New ask → reset timing ledger
  useEffect(() => {
    if (startedAt == null) return;
    if (askKeyRef.current === startedAt) return;
    askKeyRef.current = startedAt;
    setFrozen([]);
    frozenIdsRef.current = new Set();
    lastActiveIdRef.current = null;
    segmentStartedAtRef.current = startedAt;
    setDetailOpen(false);
  }, [startedAt]);

  useEffect(() => {
    const t = Date.now();
    if (segmentStartedAtRef.current == null) {
      segmentStartedAtRef.current = startedAt ?? t;
    }

    const activeId = view.active?.id ?? null;
    const missingDone = view.done.filter((d) => !frozenIdsRef.current.has(d.id));

    // Close out any newly completed steps (including ladder jumps that skip UI frames)
    if (missingDone.length > 0) {
      const budget = Math.max(0, t - (segmentStartedAtRef.current ?? t));
      const each = Math.max(40, Math.floor(budget / missingDone.length));
      const remainder = Math.max(0, budget - each * missingDone.length);
      const additions: FrozenStep[] = missingDone.map((d, i) => ({
        id: d.id,
        headline: d.headline,
        primitive: d.primitive,
        durationMs: each + (i === missingDone.length - 1 ? remainder : 0),
      }));
      for (const a of additions) frozenIdsRef.current.add(a.id);
      setFrozen((prev) => {
        const byId = new Map(prev.map((s) => [s.id, s]));
        for (const a of additions) byId.set(a.id, a);
        // Preserve ladder order from view.done
        const ordered: FrozenStep[] = [];
        for (const d of view.done) {
          const hit = byId.get(d.id);
          if (hit) {
            ordered.push({
              ...hit,
              headline: d.headline,
              primitive: d.primitive,
            });
          }
        }
        // Keep any stray frozen not in done (shouldn't happen)
        for (const s of prev) {
          if (!ordered.some((o) => o.id === s.id)) ordered.push(s);
        }
        return ordered;
      });
      segmentStartedAtRef.current = t;
    } else {
      // Refresh copy on already-frozen done rows
      setFrozen((prev) =>
        prev.map((s) => {
          const match = view.done.find((d) => d.id === s.id);
          return match
            ? { ...s, headline: match.headline, primitive: match.primitive }
            : s;
        })
      );
    }

    if (activeId && activeId !== lastActiveIdRef.current) {
      lastActiveIdRef.current = activeId;
      // Live timer for this step starts now (or ask start if first)
      if (segmentStartedAtRef.current == null) {
        segmentStartedAtRef.current = startedAt ?? t;
      }
    }

    if (view.mode === "receipt" && activeId == null && lastActiveIdRef.current) {
      lastActiveIdRef.current = null;
    }
  }, [view.active?.id, view.done, view.mode, startedAt]);

  const segmentStart = segmentStartedAtRef.current ?? startedAt ?? now;
  const activeLiveMs = Math.max(0, now - segmentStart);
  const pct = Math.max(0, Math.min(100, view.percentage));
  const totalMs =
    view.mode === "receipt"
      ? view.elapsedMs
      : startedAt
        ? Math.max(0, now - startedAt)
        : view.elapsedMs;

  return (
    <div data-testid="trigger-wait-state" className="rise w-full shrink-0 px-1 pt-1">
      <div className="mx-auto w-full max-w-md rounded-xl border border-border bg-surface p-4 shadow-sm">
        {question ? (
          <p className="mb-3 line-clamp-2 text-[12px] text-muted-foreground">{question}</p>
        ) : null}

        <div className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto">
          {frozen.map((s) => (
            <div key={s.id} className="flex items-start gap-2 text-[12px]">
              <Check
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--success)]"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-muted-foreground">{s.headline}</p>
                {s.primitive ? (
                  <p className="truncate font-mono text-[10px] text-muted-foreground/80">
                    {s.primitive}
                  </p>
                ) : null}
              </div>
              <span className="shrink-0 font-mono text-[11px] tabular text-muted-foreground">
                {formatDuration(s.durationMs)}
              </span>
            </div>
          ))}

          {view.mode === "active" && view.active ? (
            <div className="flex items-start gap-2">
              <Loader2
                className="mt-0.5 h-4 w-4 shrink-0 text-primary motion-safe:animate-spin"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium leading-snug text-foreground">
                  {view.active.headline}
                </p>
                <p className="mt-0.5 font-mono text-[11px] leading-snug text-muted-foreground">
                  {view.active.primitive}
                </p>
              </div>
              <span className="shrink-0 pt-0.5 font-mono text-[11px] tabular text-foreground">
                {formatDuration(activeLiveMs)}
              </span>
            </div>
          ) : null}

          {view.mode === "receipt" ? (
            <div className="mt-1 flex flex-wrap items-center gap-2 border-t border-border pt-2">
              <Check className="h-4 w-4 shrink-0 text-[color:var(--success)]" aria-hidden />
              <span className="text-[13px] font-medium text-foreground">Handled by Trigger</span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {[
                  view.receipt?.turn != null ? `turn ${view.receipt.turn}` : null,
                  view.receipt?.toolNames?.length
                    ? `${view.receipt.toolNames.length} tool${view.receipt.toolNames.length === 1 ? "" : "s"}`
                    : null,
                  `total ${formatDuration(totalMs)}`,
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
          ) : null}
        </div>

        <div className="mt-3.5 h-0.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-[width] duration-500 ease-out motion-reduce:transition-none"
            style={{ width: `${pct}%` }}
          />
        </div>

        {view.mode === "active" ? (
          <p className="mt-2 text-right font-mono text-[10px] tabular text-muted-foreground">
            total {formatDuration(totalMs)}
          </p>
        ) : null}

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
