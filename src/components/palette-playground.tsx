"use client";

import { Palette, X } from "lucide-react";
import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

/** Exact presets from reference/Loveable Cards/src/routes/index.tsx */
export type PaletteVars = {
  background: string;
  surface: string;
  foreground: string;
  muted: string;
  border: string;
  primary: string;
  accent: string;
  chart3: string;
  chart4: string;
  chart5: string;
};

export const LOVABLE_PALETTE_PRESETS: {
  name: string;
  swatches: string[];
  vars: PaletteVars;
}[] = [
  {
    name: "Indigo Mint",
    swatches: ["#6366f1", "#22d3ac", "#a78bfa", "#f8fafc"],
    vars: {
      background: "oklch(0.985 0.003 260)",
      surface: "oklch(1 0 0)",
      foreground: "oklch(0.18 0.02 265)",
      muted: "oklch(0.96 0.005 260)",
      border: "oklch(0.92 0.006 260)",
      primary: "oklch(0.55 0.22 275)",
      accent: "oklch(0.78 0.14 175)",
      chart3: "oklch(0.7 0.17 300)",
      chart4: "oklch(0.75 0.15 220)",
      chart5: "oklch(0.78 0.15 45)",
    },
  },
  {
    name: "Sunset Coral",
    swatches: ["#f97316", "#ec4899", "#facc15", "#fff7ed"],
    vars: {
      background: "oklch(0.98 0.008 60)",
      surface: "oklch(1 0 0)",
      foreground: "oklch(0.2 0.03 30)",
      muted: "oklch(0.96 0.01 60)",
      border: "oklch(0.92 0.012 50)",
      primary: "oklch(0.68 0.19 40)",
      accent: "oklch(0.7 0.2 350)",
      chart3: "oklch(0.82 0.16 90)",
      chart4: "oklch(0.7 0.15 20)",
      chart5: "oklch(0.72 0.15 320)",
    },
  },
  {
    name: "Forest Sage",
    swatches: ["#059669", "#84cc16", "#0d9488", "#f0fdf4"],
    vars: {
      background: "oklch(0.985 0.008 150)",
      surface: "oklch(1 0 0)",
      foreground: "oklch(0.2 0.03 155)",
      muted: "oklch(0.96 0.01 150)",
      border: "oklch(0.92 0.012 150)",
      primary: "oklch(0.6 0.16 155)",
      accent: "oklch(0.78 0.17 130)",
      chart3: "oklch(0.7 0.14 190)",
      chart4: "oklch(0.78 0.13 100)",
      chart5: "oklch(0.72 0.14 60)",
    },
  },
  {
    name: "Midnight Neon",
    swatches: ["#22d3ee", "#a855f7", "#f472b6", "#0f172a"],
    vars: {
      background: "oklch(0.18 0.02 265)",
      surface: "oklch(0.23 0.025 265)",
      foreground: "oklch(0.97 0.01 260)",
      muted: "oklch(0.27 0.02 265)",
      border: "oklch(0.32 0.02 265)",
      primary: "oklch(0.78 0.16 210)",
      accent: "oklch(0.72 0.22 320)",
      chart3: "oklch(0.75 0.2 340)",
      chart4: "oklch(0.78 0.17 175)",
      chart5: "oklch(0.82 0.18 90)",
    },
  },
  {
    name: "Paper Mono",
    swatches: ["#111827", "#6b7280", "#f59e0b", "#fafaf9"],
    vars: {
      background: "oklch(0.98 0.003 90)",
      surface: "oklch(1 0 0)",
      foreground: "oklch(0.16 0.005 260)",
      muted: "oklch(0.95 0.004 90)",
      border: "oklch(0.9 0.005 90)",
      primary: "oklch(0.28 0.02 260)",
      accent: "oklch(0.78 0.16 75)",
      chart3: "oklch(0.55 0.02 260)",
      chart4: "oklch(0.7 0.02 260)",
      chart5: "oklch(0.82 0.14 60)",
    },
  },
];

const PRESET_KEY = "plantos.lovable.palette.preset";
const THEME_BUTTON_POSITION_KEY = "plantos.lovable.palette.trigger-position";
const THEME_BUTTON_VIEWPORT_GUTTER = 8;

type ThemeButtonPosition = {
  x: number;
  y: number;
};

function clampThemeButtonPosition(
  position: ThemeButtonPosition,
  button: HTMLButtonElement
): ThemeButtonPosition {
  return {
    x: Math.min(
      Math.max(THEME_BUTTON_VIEWPORT_GUTTER, position.x),
      Math.max(THEME_BUTTON_VIEWPORT_GUTTER, window.innerWidth - button.offsetWidth - THEME_BUTTON_VIEWPORT_GUTTER)
    ),
    y: Math.min(
      Math.max(THEME_BUTTON_VIEWPORT_GUTTER, position.y),
      Math.max(THEME_BUTTON_VIEWPORT_GUTTER, window.innerHeight - button.offsetHeight - THEME_BUTTON_VIEWPORT_GUTTER)
    ),
  };
}

function FloatingThemeButton({ onOpen }: { onOpen: () => void }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const lastDragEndedAtRef = useRef(0);
  const [position, setPosition] = useState<ThemeButtonPosition | null>(null);
  const [dragging, setDragging] = useState(false);

  const savePosition = useCallback((next: ThemeButtonPosition) => {
    try {
      localStorage.setItem(THEME_BUTTON_POSITION_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;
    try {
      const raw = localStorage.getItem(THEME_BUTTON_POSITION_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<ThemeButtonPosition>;
      if (Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
        setPosition(
          clampThemeButtonPosition(
            { x: Number(saved.x), y: Number(saved.y) },
            button
          )
        );
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const keepInViewport = () => {
      const button = buttonRef.current;
      if (!button) return;
      setPosition((current) => {
        if (!current) return current;
        const next = clampThemeButtonPosition(current, button);
        savePosition(next);
        return next;
      });
    };
    window.addEventListener("resize", keepInViewport);
    return () => window.removeEventListener("resize", keepInViewport);
  }, [savePosition]);

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: rect.left,
      originY: rect.top,
      moved: false,
    };
    setPosition({ x: rect.left, y: rect.top });
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    const button = buttonRef.current;
    if (!drag || !button || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) >= 4) drag.moved = true;
    setPosition(
      clampThemeButtonPosition(
        { x: drag.originX + dx, y: drag.originY + dy },
        button
      )
    );
  };

  const finishDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (drag.moved) lastDragEndedAtRef.current = Date.now();
    dragRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setPosition((current) => {
      if (current) savePosition(current);
      return current;
    });
  };

  const style: CSSProperties | undefined = position
    ? {
        left: position.x,
        top: position.y,
        right: "auto",
        bottom: "auto",
        touchAction: "none",
      }
    : { touchAction: "none" };

  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label="Open theme settings; drag to reposition"
      title="Drag to move · Click to open Theme"
      onClick={() => {
        if (Date.now() - lastDragEndedAtRef.current < 350) return;
        onOpen();
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      style={style}
      className={`fixed bottom-6 right-6 z-[190] flex select-none items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/30 transition hover:scale-105 ${
        dragging ? "cursor-grabbing scale-105" : "cursor-grab"
      }`}
    >
      <Palette className="h-4 w-4" />
      Theme
    </button>
  );
}

export function applyPalette(vars: PaletteVars) {
  const r = document.documentElement.style;
  r.setProperty("--background", vars.background);
  r.setProperty("--surface", vars.surface);
  r.setProperty("--surface-2", vars.muted);
  r.setProperty("--card", vars.surface);
  r.setProperty("--card-foreground", vars.foreground);
  r.setProperty("--foreground", vars.foreground);
  r.setProperty("--muted", vars.muted);
  r.setProperty(
    "--muted-foreground",
    `color-mix(in oklab, ${vars.foreground} 55%, ${vars.background})`
  );
  r.setProperty("--border", vars.border);
  r.setProperty("--primary", vars.primary);
  r.setProperty("--primary-foreground", "oklch(0.99 0 0)");
  r.setProperty("--accent", vars.accent);
  r.setProperty("--chart-1", vars.primary);
  r.setProperty("--chart-2", vars.accent);
  r.setProperty("--chart-3", vars.chart3);
  r.setProperty("--chart-4", vars.chart4);
  r.setProperty("--chart-5", vars.chart5);
}

export function PalettePlayground({
  open,
  onClose,
  activePreset,
  setActivePreset,
}: {
  open: boolean;
  onClose: () => void;
  activePreset: number;
  setActivePreset: (i: number) => void;
}) {
  const [custom, setCustom] = useState({
    primary: "#6366f1",
    accent: "#22d3ac",
    background: "#f8fafc",
    surface: "#ffffff",
    foreground: "#0f172a",
  });

  const applyCustom = (next: typeof custom) => {
    setCustom(next);
    const r = document.documentElement.style;
    r.setProperty("--primary", next.primary);
    r.setProperty("--accent", next.accent);
    r.setProperty("--background", next.background);
    r.setProperty("--surface", next.surface);
    r.setProperty("--card", next.surface);
    r.setProperty("--foreground", next.foreground);
    r.setProperty("--card-foreground", next.foreground);
    r.setProperty(
      "--muted-foreground",
      `color-mix(in oklab, ${next.foreground} 55%, ${next.background})`
    );
    r.setProperty("--muted", `color-mix(in oklab, ${next.foreground} 6%, ${next.surface})`);
    r.setProperty("--border", `color-mix(in oklab, ${next.foreground} 12%, ${next.surface})`);
    r.setProperty("--chart-1", next.primary);
    r.setProperty("--chart-2", next.accent);
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-[200] bg-foreground/20 backdrop-blur-sm transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed right-0 top-0 z-[210] flex h-full w-full max-w-[380px] flex-col gap-5 overflow-y-auto border-l border-border bg-surface p-5 shadow-2xl transition-transform ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Playground
            </div>
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Palette className="h-5 w-5 text-primary" /> Palette
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold text-muted-foreground">Presets</div>
          <div className="grid grid-cols-1 gap-2">
            {LOVABLE_PALETTE_PRESETS.map((p, i) => (
              <button
                key={p.name}
                type="button"
                onClick={() => setActivePreset(i)}
                className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                  activePreset === i
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border hover:bg-muted"
                }`}
              >
                <div className="flex -space-x-1.5">
                  {p.swatches.map((s, si) => (
                    <span
                      key={si}
                      className="h-6 w-6 rounded-full border-2 border-surface"
                      style={{ background: s }}
                    />
                  ))}
                </div>
                <div className="flex-1 text-sm font-medium">{p.name}</div>
                {activePreset === i && (
                  <span className="text-[10px] font-semibold text-primary">ACTIVE</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold text-muted-foreground">Custom colors</div>
          <div className="space-y-2">
            {(
              [
                ["Primary", "primary"],
                ["Accent", "accent"],
                ["Background", "background"],
                ["Surface / Card", "surface"],
                ["Text", "foreground"],
              ] as const
            ).map(([label, key]) => (
              <label
                key={key}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
              >
                <span className="text-sm">{label}</span>
                <div className="flex items-center gap-2">
                  <span className="rounded-md border border-border px-2 py-0.5 font-mono text-xs">
                    {custom[key]}
                  </span>
                  <input
                    type="color"
                    value={custom[key]}
                    onChange={(e) => applyCustom({ ...custom, [key]: e.target.value })}
                    className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent"
                  />
                </div>
              </label>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Tip: pick a preset first, then fine-tune with the pickers. Charts, buttons, and the
            shell all follow the tokens live.
          </p>
        </div>
      </aside>
    </>
  );
}

/**
 * Palette trigger stays in the header; overlay/drawer/FAB portal to document.body.
 * Lovable mounts the playground at page root. Nesting fixed z-index under sticky
 * header (z-30) traps it below cards that use transform (.rise).
 */
export function LovablePaletteControls({
  showHeaderTrigger = true,
}: {
  showHeaderTrigger?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [activePreset, setActivePreset] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(PRESET_KEY) ?? "0");
      if (Number.isFinite(saved) && saved >= 0 && saved < LOVABLE_PALETTE_PRESETS.length) {
        setActivePreset(saved);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    applyPalette(LOVABLE_PALETTE_PRESETS[activePreset].vars);
    try {
      localStorage.setItem(PRESET_KEY, String(activePreset));
    } catch {
      /* ignore */
    }
  }, [activePreset]);

  const layer =
    mounted &&
    createPortal(
      <PalettePlayground
        open={open}
        onClose={() => setOpen(false)}
        activePreset={activePreset}
        setActivePreset={setActivePreset}
      />,
      document.body
    );

  return (
    <>
      {showHeaderTrigger && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm hover:bg-muted"
        >
          <Palette className="h-4 w-4" /> Palette
        </button>
      )}
      <FloatingThemeButton onOpen={() => setOpen(true)} />
      {layer}
    </>
  );
}
