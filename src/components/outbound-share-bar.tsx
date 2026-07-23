"use client";

import { useEffect, useState } from "react";
import { Loader2, Mail, MessageSquare, Presentation, FileSpreadsheet, FileText } from "lucide-react";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import {
  cancelOutboundIntent,
  readOutboundIntent,
  startOutboundSlackSend,
  undoOutboundSlack,
} from "@/app/actions-outbound";
import { captureCanvasChartImages } from "@/lib/outbound/capture-charts";

type StatusPayload = {
  enabled: boolean;
  connected?: boolean;
  accounts?: Array<{ id: string; name?: string | null }>;
  channelLabel?: string;
  error?: string;
};

type ShareDraft = {
  title: string;
  body: string;
};

export function OutboundShareBar({ draft }: { draft: ShareDraft | null }) {
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intentId, setIntentId] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [rtToken, setRtToken] = useState<string | null>(null);
  const [phase, setPhase] = useState<string>("idle");
  const [captureHint, setCaptureHint] = useState<string | null>(null);
  const [hasMessageTs, setHasMessageTs] = useState(false);

  async function refreshStatus() {
    try {
      const res = await fetch("/api/outbound/status");
      const json = (await res.json()) as StatusPayload;
      setStatus(json);
    } catch {
      setStatus({ enabled: false });
    }
  }

  useEffect(() => {
    void refreshStatus();
  }, []);

  const { run } = useRealtimeRun(runId ?? undefined, {
    accessToken: rtToken ?? "",
    enabled: Boolean(runId && rtToken),
    skipColumns: ["payload"],
  });

  useEffect(() => {
    const outbound = (run?.metadata as { outbound?: { phase?: string; error?: string } } | undefined)
      ?.outbound;
    if (outbound?.phase) setPhase(outbound.phase);
    if (outbound?.error) setError(outbound.error);
    if (
      outbound?.phase === "succeeded" ||
      outbound?.phase === "failed" ||
      outbound?.phase === "uncertain"
    ) {
      setBusy(false);
    }
    if (outbound?.phase === "reverted") {
      setBusy(false);
      setPhase("reverted");
    }
  }, [run?.metadata]);

  useEffect(() => {
    if (phase !== "succeeded" || !intentId) {
      setHasMessageTs(false);
      return;
    }
    void readOutboundIntent(intentId).then((res) => {
      if (res.ok) setHasMessageTs(Boolean(res.intent.receipt?.messageTs));
    });
  }, [phase, intentId]);

  if (!status?.enabled) return null;

  const inFlight =
    busy ||
    phase === "sending" ||
    phase === "uploading" ||
    phase === "start" ||
    phase === "undoing" ||
    phase === "capturing";
  const canUndo = phase === "succeeded" && Boolean(intentId) && hasMessageTs;

  async function connectSlack() {
    setError(null);
    try {
      const res = await fetch("/api/outbound/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = (await res.json()) as { connectLinkUrl?: string; error?: string };
      if (!res.ok || !json.connectLinkUrl) {
        setError(json.error || "Could not create Connect link");
        return;
      }
      window.open(json.connectLinkUrl, "_blank", "noopener,noreferrer");
      // Poll briefly for connection
      for (let i = 0; i < 8; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        await refreshStatus();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function onSendClick() {
    setError(null);
    if (!status?.connected) {
      await connectSlack();
      return;
    }
    setPreviewOpen(true);
  }

  async function confirmSend() {
    if (!draft?.body?.trim()) {
      setError("No message to send — pin or load a chart first.");
      return;
    }
    setPreviewOpen(false);
    setBusy(true);
    setPhase("capturing");
    setError(null);
    setCaptureHint(null);

    let images: Array<{ filename: string; base64: string }> = [];
    try {
      images = await captureCanvasChartImages(4);
      setCaptureHint(
        images.length > 0
          ? `Captured ${images.length} chart image${images.length === 1 ? "" : "s"}`
          : "No chart images captured — sending text only"
      );
    } catch {
      setCaptureHint("Chart capture failed — sending text only");
    }

    setPhase("start");
    const res = await startOutboundSlackSend({
      title: draft.title || "PlantOS update",
      body: draft.body,
      images,
      // Always new intent — avoids "Already sent" after a prior attempt
    });
    if (!res.ok) {
      setBusy(false);
      setPhase("failed");
      setError(res.error);
      if (res.intentId) setIntentId(res.intentId);
      return;
    }
    setIntentId(res.intentId);
    setRunId(res.runId);
    setRtToken(res.publicAccessToken);
    setPhase(res.imageCount && res.imageCount > 0 ? "uploading" : "sending");
    setError(null);
  }

  async function onCancelPreview() {
    setPreviewOpen(false);
    if (intentId) await cancelOutboundIntent(intentId);
  }

  async function onUndo() {
    if (!intentId) return;
    setBusy(true);
    setPhase("undoing");
    const res = await undoOutboundSlack(intentId);
    if (!res.ok) {
      setBusy(false);
      setError(res.error);
      return;
    }
    setRunId(res.runId);
    setRtToken(res.publicAccessToken);
  }

  async function refreshIntent() {
    if (!intentId) return;
    const res = await readOutboundIntent(intentId);
    if (res.ok) {
      setPhase(res.intent.status);
      if (res.intent.error) setError(res.intent.error);
    }
  }

  return (
    <div className="shrink-0 border-t border-border bg-surface/80 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Share
        </span>
        <button
          type="button"
          disabled={inFlight}
          onClick={() => void onSendClick()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
        >
          {inFlight ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5" />}
          {status.connected ? "Send to Slack" : "Connect Slack"}
        </button>
        <StubButton icon={<Mail className="h-3.5 w-3.5" />} label="Email" />
        <StubButton icon={<Presentation className="h-3.5 w-3.5" />} label="PPT" />
        <StubButton icon={<FileSpreadsheet className="h-3.5 w-3.5" />} label="Excel" />
        <StubButton icon={<FileText className="h-3.5 w-3.5" />} label="Word" />

        <div className="ml-auto flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          {status.connected ? (
            <span className="text-[color:var(--success)]">Slack connected</span>
          ) : (
            <span>Slack not connected</span>
          )}
          {phase !== "idle" && <span className="tabular">· {phase}</span>}
          {canUndo && (
            <button
              type="button"
              disabled={inFlight}
              onClick={() => void onUndo()}
              className="rounded border border-border px-2 py-0.5 text-[11px] hover:bg-muted disabled:opacity-50"
            >
              Undo
            </button>
          )}
          {intentId && (phase === "failed" || phase === "uncertain") && (
            <button
              type="button"
              className="rounded border border-border px-2 py-0.5 text-[11px] hover:bg-muted"
              onClick={() => void refreshIntent()}
            >
              Refresh status
            </button>
          )}
        </div>
      </div>

      {captureHint && !error && (
        <p className="mt-1.5 text-[11px] text-muted-foreground" role="status">
          {captureHint}
        </p>
      )}

      {error && (
        <p className="mt-1.5 text-[11px] text-[color:var(--danger)]" role="status">
          {error}
        </p>
      )}

      {previewOpen && (
        <div className="mt-2 rounded-lg border border-border bg-background p-3 text-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Send to {status.channelLabel || "Slack"}
          </p>
          <p className="mt-1 font-medium">{draft?.title || "PlantOS update"}</p>
          <p className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
            {draft?.body || "(empty)"}
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Up to 4 charts attach as PNGs, each with two short explanation lines above the image.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => void confirmSend()}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              Confirm send
            </button>
            <button
              type="button"
              onClick={() => void onCancelPreview()}
              className="rounded-lg border border-border px-3 py-1.5 text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StubButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      disabled
      title="Coming soon"
      className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border px-2.5 py-1.5 text-xs text-muted-foreground opacity-60"
    >
      {icon}
      {label}
      <span className="text-[9px] uppercase">Soon</span>
    </button>
  );
}
