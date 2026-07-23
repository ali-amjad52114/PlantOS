"use client";

import type { ReactNode, DragEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { GripVertical, Maximize2, Pin, X, ZoomIn } from "lucide-react";
import { LovableCardView, chartHeightForSpan } from "@/components/lovable-viz/LovableCardView";
import { FindingsBody } from "@/components/plant-chat-findings";
import { PlantTowerGrid } from "@/components/plant-tower-grid";
import { Visualization } from "@/components/visualization";
import {
  CANVAS_DND_MIME,
  CANVAS_REORDER_MIME,
  createPin,
  cycleSpan,
  normalizeSpan,
  setPinSpan,
  sortedPins,
  swapPinOrder,
  type CanvasPin,
  type CanvasPinDraft,
  type CanvasSpan,
} from "@/lib/canvas-pins";
import { captionLinesForPin } from "@/lib/outbound/caption";

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
  onDropDraft: (draft: CanvasPinDraft) => void;
  className?: string;
  emptyHint?: string;
  overviewSlot?: ReactNode;
}) {
  const pinsRef = useRef(pins);
  pinsRef.current = pins;
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  useEffect(() => {
    if (!focusedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFocusedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusedId]);

  const focused = focusedId ? pins.find((p) => p.id === focusedId) : null;
  const ordered = sortedPins(pins);

  function onDragOver(e: DragEvent) {
    const types = [...e.dataTransfer.types];
    if (!types.includes(CANVAS_DND_MIME) && !types.includes(CANVAS_REORDER_MIME)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = types.includes(CANVAS_REORDER_MIME) ? "move" : "copy";
    setDragOver(true);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    setDropTargetId(null);
    const reorderId = e.dataTransfer.getData(CANVAS_REORDER_MIME);
    if (reorderId) {
      // Dropped on empty board area — keep order
      return;
    }
    const raw = e.dataTransfer.getData(CANVAS_DND_MIME);
    if (!raw) return;
    try {
      onDropDraft(JSON.parse(raw) as CanvasPinDraft);
    } catch {
      /* ignore */
    }
  }

  function removePin(id: string) {
    onPinsChange(pinsRef.current.filter((p) => p.id !== id));
    if (focusedId === id) setFocusedId(null);
  }

  function cycleSize(id: string) {
    const pin = pinsRef.current.find((p) => p.id === id);
    if (!pin) return;
    onPinsChange(setPinSpan(pinsRef.current, id, cycleSpan(normalizeSpan(pin.span))));
  }

  function onPinDropReorder(targetId: string, e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    setDropTargetId(null);
    const fromId = e.dataTransfer.getData(CANVAS_REORDER_MIME);
    if (fromId && fromId !== targetId) {
      onPinsChange(swapPinOrder(pinsRef.current, fromId, targetId));
      return;
    }
    const raw = e.dataTransfer.getData(CANVAS_DND_MIME);
    if (raw) {
      try {
        onDropDraft(JSON.parse(raw) as CanvasPinDraft);
      } catch {
        /* ignore */
      }
    }
  }

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${className ?? ""}`}>
      <div
        data-testid="canvas-pin-board"
        onDragOver={onDragOver}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`min-h-0 flex-1 overflow-auto p-3 ${
          dragOver ? "bg-primary/5 ring-2 ring-inset ring-primary/40" : "bg-surface-2/30"
        }`}
      >
        {pins.length === 0 && overviewSlot ? <div className="h-full">{overviewSlot}</div> : null}
        {pins.length === 0 && !overviewSlot && (
          <p className="flex h-full min-h-[240px] items-center justify-center px-8 text-center text-sm text-muted-foreground">
            {emptyHint ??
              "Pin charts from chat. Each chart sits in a grid slot: 1 box or 2 wide."}
          </p>
        )}
        {pins.length > 0 && (
          <div
            data-testid="canvas-grid"
            className="grid auto-rows-auto grid-cols-1 content-start items-start gap-3 sm:grid-cols-2"
          >
            {ordered.map((pin) => (
              <CanvasGridCell
                key={pin.id}
                pin={pin}
                highlight={dropTargetId === pin.id}
                onRemove={() => removePin(pin.id)}
                onCycleSize={() => cycleSize(pin.id)}
                onFocus={() => setFocusedId(pin.id)}
                onDragOverCell={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDropTargetId(pin.id);
                }}
                onDragLeaveCell={() => setDropTargetId((id) => (id === pin.id ? null : id))}
                onDropOnCell={(e) => onPinDropReorder(pin.id, e)}
              />
            ))}
          </div>
        )}
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

function CanvasGridCell({
  pin,
  highlight,
  onRemove,
  onCycleSize,
  onFocus,
  onDragOverCell,
  onDragLeaveCell,
  onDropOnCell,
}: {
  pin: CanvasPin;
  highlight?: boolean;
  onRemove: () => void;
  onCycleSize: () => void;
  onFocus: () => void;
  onDragOverCell: (e: DragEvent) => void;
  onDragLeaveCell: () => void;
  onDropOnCell: (e: DragEvent) => void;
}) {
  const span: CanvasSpan = pin.span === 2 ? 2 : 1;
  const spanClass =
    span === 2 ? "col-span-1 row-span-1 sm:col-span-2" : "col-span-1 row-span-1";
  const caption = captionLinesForPin(pin);

  return (
    <div
      data-testid="canvas-pin"
      data-pin-id={pin.id}
      data-span={span}
      data-card-type={
        pin.payload.kind === "card" ? pin.payload.card.type : pin.payload.kind
      }
      onDragOver={onDragOverCell}
      onDragLeave={onDragLeaveCell}
      onDrop={onDropOnCell}
      className={`flex h-fit flex-col self-start overflow-hidden rounded-xl border bg-surface shadow-sm ${spanClass} ${
        highlight ? "border-primary ring-2 ring-primary/30" : "border-border"
      }`}
    >
      <div
        draggable
        data-testid="canvas-pin-drag"
        onDragStart={(e) => {
          e.dataTransfer.setData(CANVAS_REORDER_MIME, pin.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        className="flex shrink-0 cursor-grab items-center gap-1.5 border-b border-border bg-surface-2/90 px-2 py-1.5 active:cursor-grabbing"
        title="Drag to swap place with another chart"
      >
        <GripVertical className="mr-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <button
          type="button"
          data-testid="canvas-pin-resize"
          title="Cycle size: 1 box ↔ 2 wide"
          onClick={(e) => {
            e.stopPropagation();
            onCycleSize();
          }}
          className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          data-testid="canvas-pin-zoom"
          title="Zoom"
          onClick={(e) => {
            e.stopPropagation();
            onFocus();
          }}
          aria-label="Zoom chart"
          className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
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
      <div
        className="shrink-0 p-2"
        data-outbound-capture="chart"
        data-outbound-title={caption.title}
        data-outbound-line1={caption.line1}
        data-outbound-line2={caption.line2}
      >
        <PinBody pin={pin} />
      </div>
    </div>
  );
}

function PinBody({ pin }: { pin: CanvasPin }) {
  if (pin.payload.kind === "card") {
    const c = pin.payload.card;
    const span: CanvasSpan = pin.span === 2 ? 2 : 1;
    return (
      <LovableCardView
        type={c.type}
        label={c.label}
        hint={c.hint}
        binding={c.binding}
        compact
        chartHeight={chartHeightForSpan(span)}
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
  moved = false,
}: {
  draft: CanvasPinDraft;
  onPin?: (draft: CanvasPinDraft) => void;
  children: ReactNode;
  testId?: string;
  /** When true, this chat visual was moved to the canvas — do not render a copy. */
  moved?: boolean;
}) {
  if (moved) return null;

  function onDragStart(e: DragEvent) {
    e.dataTransfer.setData(CANVAS_DND_MIME, JSON.stringify(draft));
    e.dataTransfer.effectAllowed = "move";
  }

  return (
    <div
      data-testid={testId ?? "pinable-visual"}
      className="relative rounded-xl border border-border/80 bg-surface"
    >
      <div
        draggable
        onDragStart={onDragStart}
        className="flex cursor-grab items-center justify-end gap-1 border-b border-border/60 bg-surface-2/50 px-2 py-1.5 active:cursor-grabbing"
        title="Move onto the canvas"
      >
        <GripVertical className="mr-auto h-3.5 w-3.5 text-muted-foreground" />
        <span className="mr-auto text-[10px] uppercase tracking-wide text-muted-foreground">
          Move to canvas
        </span>
        <button
          type="button"
          data-testid="pin-to-canvas"
          onClick={() => onPin?.(draft)}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] font-medium text-foreground hover:border-primary/40 hover:bg-primary/5"
        >
          <Pin className="h-3 w-3" />
          Move
        </button>
      </div>
      <div className="p-2">{children}</div>
    </div>
  );
}

export { createPin };
