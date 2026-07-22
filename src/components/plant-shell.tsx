"use client";

import type { ReactNode } from "react";
import { MoreHorizontal, X } from "lucide-react";
import { LovablePaletteControls } from "@/components/palette-playground";

export type ShellMode =
  | "overview"
  | "engineer"
  | "finance"
  | "maintenance"
  | "safety"
  | "operations";

export const SHELL_MODES: { id: ShellMode; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "engineer", label: "Engineer" },
  { id: "finance", label: "Finance" },
  { id: "maintenance", label: "Maintenance" },
  { id: "safety", label: "Safety" },
  { id: "operations", label: "Operations" },
];

export function PlantShell({
  mode,
  onModeChange,
  feedActive,
  feedLabel,
  liveMeta,
  replayControls,
  overflowOpen,
  onOverflowToggle,
  overflowPanel,
  chat,
  stage,
  mobileTab,
  onMobileTab,
  error,
  liveFeedStrip,
}: {
  mode: ShellMode;
  onModeChange: (m: ShellMode) => void;
  feedActive: boolean;
  feedLabel: string;
  liveMeta: string;
  replayControls: ReactNode;
  overflowOpen: boolean;
  onOverflowToggle: () => void;
  overflowPanel: ReactNode;
  chat: ReactNode;
  stage: ReactNode;
  mobileTab: "chat" | "visuals";
  onMobileTab: (t: "chat" | "visuals") => void;
  error?: string | null;
  liveFeedStrip?: ReactNode;
}) {
  return (
    <div className="shell-bg noise-bg flex min-h-screen flex-col bg-background text-foreground">
      <header className="glass-bar sticky top-0 z-30">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                <div className="h-3 w-3 rotate-45 rounded-sm bg-primary-foreground/80" />
              </div>
              <div>
                <div className="text-[15px] font-semibold tracking-tight">
                  Plant<span className="text-muted-foreground">OS</span>
                  <span className="ml-0.5 text-primary">AI</span>
                </div>
                <p className="font-display text-[13px] leading-tight text-muted-foreground">
                  One plant. One truth.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <div
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                feedActive
                  ? "border-[color:var(--success)]/30 bg-[color:var(--success)]/15 text-[color:var(--success)]"
                  : "border-border bg-muted text-muted-foreground"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  feedActive ? "pulse-live bg-[color:var(--success)]" : "bg-muted-foreground"
                }`}
              />
              {feedLabel}
            </div>
            <p className="hidden text-[11px] text-muted-foreground md:block">{liveMeta}</p>
            <div className="hidden items-center gap-1 sm:flex">{replayControls}</div>
            <LovablePaletteControls />
            <button
              type="button"
              onClick={onOverflowToggle}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="More actions"
            >
              {overflowOpen ? <X className="h-4 w-4" /> : <MoreHorizontal className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-[1600px] px-4 pb-3 lg:px-6">
          <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface p-1">
            {SHELL_MODES.map((m) => {
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onModeChange(m.id)}
                  className={`shrink-0 rounded-lg px-3.5 py-2 text-sm transition ${
                    active
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-foreground/70 hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex items-center gap-1 sm:hidden">{replayControls}</div>
        </div>
      </header>

      {liveFeedStrip}

      {overflowOpen && (
        <div className="border-b border-border bg-surface-2">
          <div className="mx-auto max-w-[1600px] px-4 py-4 lg:px-6">{overflowPanel}</div>
        </div>
      )}

      {error && (
        <div className="mx-auto w-full max-w-[1600px] px-4 pt-3 lg:px-6">
          <p className="rounded-xl border border-[color:var(--danger)]/30 bg-[color:var(--danger)]/10 px-3 py-2 text-sm text-[color:var(--danger)]">
            {error}
          </p>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-4 p-4 lg:px-6 lg:py-5">
        <div className="mb-0 flex gap-1 rounded-xl border border-border bg-surface p-1 lg:hidden">
          {(["chat", "visuals"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onMobileTab(t)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm capitalize ${
                mobileTab === t
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-foreground/70 hover:bg-muted"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(340px,2fr)_minmax(0,3fr)]">
          <section
            className={`min-h-[52vh] lg:min-h-0 ${
              mobileTab === "chat" ? "flex" : "hidden lg:flex"
            } flex-col`}
          >
            {chat}
          </section>
          <section
            className={`min-h-[52vh] lg:min-h-0 ${
              mobileTab === "visuals" ? "flex" : "hidden lg:flex"
            } flex-col`}
          >
            {stage}
          </section>
        </div>

        <footer className="border-t border-border pt-3 text-[11px] text-muted-foreground">
          One plant. One truth. Different intelligence for every role. · Read-only · Demo assumptions
          labeled
        </footer>
      </div>
    </div>
  );
}
