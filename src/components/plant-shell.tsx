"use client";

import type { ReactNode } from "react";
import { MoreHorizontal, X } from "lucide-react";

export type ShellMode =
  | "overview"
  | "engineer"
  | "finance"
  | "operations"
  | "maintenance"
  | "safety";

export const SHELL_MODES: { id: ShellMode; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "engineer", label: "Engineer" },
  { id: "finance", label: "Finance" },
  { id: "operations", label: "Operations" },
  { id: "maintenance", label: "Maintenance" },
  { id: "safety", label: "Safety" },
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
}) {
  return (
    <div className="shell-bg flex min-h-screen flex-col text-foreground">
      <header className="glass-bar sticky top-0 z-40">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 lg:px-6">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-emerald-400/90">
              PlantOS
            </p>
            <h1 className="truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              One plant. One truth.
            </h1>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
                feedActive
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-white/10 bg-white/5 text-muted-foreground"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  feedActive ? "pulse-live bg-emerald-400" : "bg-zinc-500"
                }`}
              />
              {feedLabel}
            </div>
            <p className="hidden text-[11px] text-muted-foreground md:block">{liveMeta}</p>
            <div className="hidden items-center gap-1 sm:flex">{replayControls}</div>
            <button
              type="button"
              onClick={onOverflowToggle}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
              aria-label="More actions"
            >
              {overflowOpen ? <X className="h-4 w-4" /> : <MoreHorizontal className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-[1600px] px-4 pb-3 lg:px-6">
          <div className="flex gap-1 overflow-x-auto rounded-full border border-white/10 bg-black/20 p-1">
            {SHELL_MODES.map((m) => {
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onModeChange(m.id)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm transition ${
                    active
                      ? "bg-emerald-500 text-primary-foreground shadow-[0_0_24px_rgba(16,185,129,0.25)]"
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  }`}
                >
                  {m.id === "overview" ? "Overview · SCADA" : m.label}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex items-center gap-1 sm:hidden">{replayControls}</div>
        </div>
      </header>

      {overflowOpen && (
        <div className="border-b border-white/10 bg-black/40">
          <div className="mx-auto max-w-[1600px] px-4 py-4 lg:px-6">{overflowPanel}</div>
        </div>
      )}

      {error && (
        <div className="mx-auto w-full max-w-[1600px] px-4 pt-3 lg:px-6">
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-4 py-4 lg:px-6 lg:py-5">
        <div className="mb-3 flex gap-1 rounded-full border border-white/10 bg-black/20 p-1 lg:hidden">
          {(["chat", "visuals"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onMobileTab(t)}
              className={`flex-1 rounded-full px-3 py-1.5 text-sm capitalize ${
                mobileTab === t
                  ? "bg-white/10 text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(320px,2fr)_minmax(0,3fr)] lg:gap-5">
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

        <footer className="mt-4 border-t border-white/5 pt-3 text-[11px] text-muted-foreground">
          One plant. One truth. Different intelligence for every role. · Read-only · Demo assumptions
          labeled
        </footer>
      </div>
    </div>
  );
}
