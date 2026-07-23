"use client";

import type { ReactNode, DragEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { Pin, X } from "lucide-react";
import { LovableCardView } from "@/components/lovable-viz/LovableCardView";
import { FindingsBody } from "@/components/plant-chat-findings";
import { PlantTowerGrid } from "@/components/plant-tower-grid";
import { Visualization } from "@/components/visualization";
import {
  CANVAS_DND_MIME,
  createPin,
  type CanvasPin,
  type CanvasPinDraft,
} from "@/lib/canvas-pins";

const MIN_W = 220;
const MIN_H = 160;

export function CanvasPinBoard({
  pins,
  onPinsChange,
  onDropDraft,
  className,
  emptyHint,
  overviewSlot,
}: {
  pins: CanvasPin[];
  onPinsChange: (next: CanvasPin[]) => void;
  onDropDraft: (draft: CanvasPinDraft, at: { x: number; y: number }) => void;
  className?: string;
  emptyHint?: string;
  /** Shown only when the canvas has no pins (e.g. Overview live panel). */
  overviewSlot?: ReactNode;
}) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const pinsRef = useRef(pins);
  pinsRef.current = pins;
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (!focusedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFocusedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusedId]);

  const focused = focusedId ? pins.find((p) => p.id === focusedId) : null;

  function localPoint(clientX: number, clientY: number) {
    const el = surfaceRef.current;
    if (!el) return { x: 16, y: 16 };
    const r = el.getBoundingClientRect();
    return {
      x: Math.max(0, clientX - r.left),
      y: Math.max(0, clientY - r.top),
    };
  }

  function onDragOver(e: DragEvent) {
    if (![...e.dataTransfer.types].includes(CANVAS_DND_MIME)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDragOver(true);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const raw = e.dataTransfer.getData(CANVAS_DND_MIME);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw) as CanvasPinDraft;
      onDropDraft(draft, localPoint(e.clientX, e.clientY));
    } catch {
      /* ignore */
    }
  }

  function removePin(id: string) {
    onPinsChange(pinsRef.current.filter((p) => p.id !== id));
    if (focusedId === id) setFocusedId(null);
  }

  function movePin(id: string, x: number, y: number) {
    onPinsChange(pinsRef.current.map((p) => (p.id === id ? { ...p, x, y } : p)));
  }

  function resizePin(id: string, w: number, h: number) {
    onPinsChange(
      pinsRef.current.map((p) =>
        p.id === id
          ? { ...p, w: Math.max(MIN_W, Math.round(w)), h: Math.max(MIN_H, Math.round(h)) }
          : p
      )
    );
  }

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${className ?? ""}`}>
      <div
        ref={surfaceRef}
        data-testid="canvas-pin-board"
        onDragOver={onDragOver}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`relative min-h-0 flex-1 overflow-hidden bg-surface-2/30 ${
          dragOver ? "ring-2 ring-inset ring-primary/50 bg-primary/5" : ""
        }`}
      >
        {pins.length === 0 && overviewSlot ? (
          <div className="absolute inset-0 overflow-auto p-4">{overviewSlot}</div>
        ) : null}
        {pins.length === 0 && !overviewSlot && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center px-8 text-center text-sm text-muted-foreground">
            {emptyHint ??
              "This canvas holds your charts. Pin or drag visuals from chat — then move, resize, zoom, or remove them here."}
          </p>
        )}
        {pins.map((pin) => (
          <CanvasPinCard
            key={pin.id}
            pin={pin}
            dimmed={Boolean(focusedId) && focusedId !== pin.id}
            onRemove={() => removePin(pin.id)}
            onMove={(x, y) => movePin(pin.id, x, y)}
            onResize={(w, h) => resizePin(pin.id, w, h)}
            onFocus={() => setFocusedId(pin.id)}
          />
        ))}
      </div>

      {focused && (
        <div
          data-testid="canvas-pin-focus"
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
          onClick={() => setFocusedId(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-5xl overflow-auto rounded-2xl border border-border bg-surface p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              data-testid="canvas-pin-focus-close"
              aria-label="Close zoom"
              onClick={() => setFocusedId(null)}
              className="absolute right-3 top-3 z-10 rounded-full border border-border bg-surface-2 p-1.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            <PinBody pin={focused} />
          </div>
        </div>
      )}
    </div>
  );
}

function CanvasPinCard({
  pin,
  dimmed,
  onRemove,
  onMove,
  onResize,
  onFocus,
}: {
  pin: CanvasPin;
  dimmed?: boolean;
  onRemove: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (w: number, h: number) => void;
  onFocus: () => void;
}) {
  const modeRef = useRef<"idle" | "move" | "resize">("idle");
  const startRef = useRef({ x: 0, y: 0, px: 0, py: 0, w: 0, h: 0 });
  const movedRef = useRef(false);

  useEffect(() => {
    const onMoveWin = (e: MouseEvent) => {
      const mode = modeRef.current;
      if (mode === "idle") return;
      const s = startRef.current;
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) movedRef.current = true;
      if (mode === "move") {
        onMove(Math.max(0, s.px + dx), Math.max(0, s.py + dy));
      } else if (mode === "resize") {
        onResize(s.w + dx, s.h + dy);
      }
    };
    const onUpWin = () => {
      if (modeRef.current === "move" && !movedRef.current) onFocus();
      modeRef.current = "idle";
    };
    window.addEventListener("mousemove", onMoveWin);
    window.addEventListener("mouseup", onUpWin);
    return () => {
      window.removeEventListener("mousemove", onMoveWin);
      window.removeEventListener("mouseup", onUpWin);
    };
  }, [onFocus, onMove, onResize]);

  const w = pin.w ?? 360;
  const h = pin.h ?? 280;

  return (
    <div
      data-testid="canvas-pin"
      data-pin-id={pin.id}
      style={{ left: pin.x, top: pin.y, width: w, height: h }}
      className={`absolute z-20 flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-md transition-opacity ${
        dimmed ? "opacity-30" : "opacity-100"
      }`}
      onMouseDown={(e) => {
        if (e.button !== 0) return;
        const t = e.target as HTMLElement;
        if (t.closest("[data-pin-chrome]") || t.closest("[data-pin-resize]")) return;
        e.preventDefault();
        modeRef.current = "move";
        movedRef.current = false;
        startRef.current = {
          x: e.clientX,
          y: e.clientY,
          px: pin.x,
          py: pin.y,
          w,
          h,
        };
      }}
    >
      <div
        data-pin-chrome
        className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-surface-2/80 px-2 py-1"
      >
        <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {pin.payload.kind === "card"
            ? pin.payload.card.label || pin.payload.card.type
            : pin.payload.kind === "finding"
              ? pin.payload.item.tag
              : pin.kind}
          <span className="ml-2 font-normal normal-case tracking-normal text-muted-foreground/80">
            {Math.round(w)}×{Math.round(h)}
          </span>
        </span>
        <button
          type="button"
          data-testid="canvas-pin-remove"
          aria-label="Remove pin"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-[color:var(--danger)]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-2 text-left" style={{ pointerEvents: "none" }}>
        <PinBody pin={pin} />
      </div>
      <div
        data-pin-resize
        data-testid="canvas-pin-resize"
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          e.stopPropagation();
          modeRef.current = "resize";
          movedRef.current = true;
          startRef.current = {
            x: e.clientX,
            y: e.clientY,
            px: pin.x,
            py: pin.y,
            w,
            h,
          };
        }}
        className="absolute bottom-0 right-0 z-10 h-4 w-4 cursor-se-resize"
        title="Resize"
      >
        <span className="absolute bottom-1 right-1 h-2.5 w-2.5 border-b-2 border-r-2 border-muted-foreground/70" />
      </div>
    </div>
  );
}

function PinBody({ pin }: { pin: CanvasPin }) {
  if (pin.payload.kind === "card") {
    const c = pin.payload.card;
    return (
      <LovableCardView
        type={c.type}
        label={c.label}
        hint={c.hint}
        binding={c.binding}
        compact
      />
    );
  }
  if (pin.payload.kind === "viz") {
    return <Visualization spec={pin.payload.spec} />;
  }
  if (pin.payload.kind === "finding") {
    const a = pin.payload.item;
    return (
      <div className="rounded-xl border border-border bg-surface p-3">
        <p className="font-mono text-[11px] font-semibold">{a.tag}</p>
        <p className="text-[11px] text-muted-foreground">{a.label}</p>
        <p className="mt-2 text-lg font-semibold tabular">
          {Number(a.value).toFixed(2)} {a.unit || ""}
        </p>
        {a.normalMin != null && a.normalMax != null ? (
          <p className="mt-1 text-[11px] text-muted-foreground">
            normal {a.normalMin}–{a.normalMax}
            {a.outside ? " · watch" : ""}
          </p>
        ) : null}
      </div>
    );
  }
  // Legacy whole-tower / findings (should not be created anymore)
  if (pin.payload.kind === "tower") {
    return <PlantTowerGrid tower={pin.payload.tower} />;
  }
  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="border-b border-border px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {pin.payload.findings.label} findings
      </div>
      <FindingsBody kind={pin.payload.findings.kind} data={pin.payload.findings.data} />
    </div>
  );
}

export function PinableVisual({
  draft,
  onPin,
  children,
  testId,
}: {
  draft: CanvasPinDraft;
  onPin?: (draft: CanvasPinDraft) => void;
  children: ReactNode;
  testId?: string;
}) {
  function onDragStart(e: DragEvent) {
    e.dataTransfer.setData(CANVAS_DND_MIME, JSON.stringify(draft));
    e.dataTransfer.effectAllowed = "copy";
  }

  return (
    <div
      data-testid={testId ?? "pinable-visual"}
      draggable
      onDragStart={onDragStart}
      className="relative rounded-xl border border-border/80 bg-surface"
    >
      <div className="flex items-center justify-end gap-1 border-b border-border/60 px-2 py-1">
        <span className="mr-auto text-[10px] uppercase tracking-wide text-muted-foreground">
          Drag to canvas
        </span>
        <button
          type="button"
          data-testid="pin-to-canvas"
          onClick={() => onPin?.(draft)}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-foreground hover:border-primary/40 hover:bg-primary/5"
        >
          <Pin className="h-3 w-3" />
          Pin
        </button>
      </div>
      <div className="p-2">{children}</div>
    </div>
  );
}

export { createPin };
