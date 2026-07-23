"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Mail, MessageSquare, Presentation, FileSpreadsheet, FileText, Radio } from "lucide-react";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import {
  cancelOutboundIntent,
  readOutboundIntent,
  startOutboundSlackSend,
  undoOutboundSlack,
} from "@/app/actions-outbound";
import { triggerPlantShiftDigestDemo } from "@/app/actions";
import { startOutboundGoogleSend } from "@/app/actions-outbound-google";
import { captureCanvasChartImages } from "@/lib/outbound/capture-charts";
import type { OutboundPack } from "@/lib/outbound/pack";
import type { GoogleConnector } from "@/lib/outbound/config";
import {
  isInFlightPhase,
  isTerminalFailure,
  isTerminalSuccess,
  phaseLabel,
  type SendPhase,
} from "@/lib/outbound/send-phases";

type StatusPayload = {
  enabled: boolean;
  connected?: boolean;
  accounts?: Array<{ id: string; name?: string | null }>;
  channelLabel?: string;
  error?: string;
  google?: {
    enabled?: boolean;
    gmail?: boolean;
    sheets?: boolean;
    docs?: boolean;
    slides?: boolean;
    gmailTo?: string;
    connected?: Partial<Record<GoogleConnector, boolean>>;
  };
};

type ShareDraft = {
  title: string;
  body: string;
  pack?: OutboundPack;
  googleBody?: string;
};

type PreviewTarget = "slack" | GoogleConnector;

export function OutboundShareBar({ draft }: { draft: ShareDraft | null }) {
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTarget, setPreviewTarget] = useState<PreviewTarget>("slack");
  const [error, setError] = useState<string | null>(null);
  const [intentId, setIntentId] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [rtToken, setRtToken] = useState<string | null>(null);
  const [phase, setPhase] = useState<SendPhase>("idle");
  const [activeTarget, setActiveTarget] = useState<PreviewTarget | null>(null);
  const [captureHint, setCaptureHint] = useState<string | null>(null);
  const [hasMessageTs, setHasMessageTs] = useState(false);
  const [artifactUrl, setArtifactUrl] = useState<string | null>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [digestBusy, setDigestBusy] = useState(false);
  const [digestNote, setDigestNote] = useState<string | null>(null);
  const [digestRunId, setDigestRunId] = useState<string | null>(null);
  const [digestToken, setDigestToken] = useState<string | null>(null);

  const { run: digestRun } = useRealtimeRun(digestRunId ?? undefined, {
    accessToken: digestToken ?? "",
    enabled: Boolean(digestRunId && digestToken),
    skipColumns: ["payload"],
  });

  useEffect(() => {
    if (!digestRun) return;
    const meta = digestRun.metadata as { status?: string; error?: string } | undefined;
    if (digestRun.status === "COMPLETED") {
      const out = digestRun.output as { ok?: boolean; error?: string; skipped?: boolean } | undefined;
      if (out?.ok && !out.skipped) {
        setDigestNote("Shift digest sent to Slack");
      } else if (out?.skipped || meta?.status === "disabled") {
        setDigestNote("Digest skipped — check outbound config");
      } else {
        setDigestNote(out?.error || meta?.error || "Digest finished with an error");
      }
      setDigestBusy(false);
    }
    if (
      digestRun.status === "FAILED" ||
      digestRun.status === "CRASHED" ||
      digestRun.status === "SYSTEM_FAILURE"
    ) {
      setDigestNote("Digest run failed — check Trigger logs");
      setDigestBusy(false);
    }
    if (meta?.status === "building" || meta?.status === "sending") {
      setDigestNote(meta.status === "building" ? "Building digest…" : "Sending to Slack…");
    }
  }, [digestRun]);

  async function onDemoDigest() {
    setError(null);
    setDigestNote(null);
    setDigestBusy(true);
    try {
      const { runId: dRunId, publicAccessToken } = await triggerPlantShiftDigestDemo();
      setDigestRunId(dRunId);
      setDigestToken(publicAccessToken);
      setDigestNote("Digest run started…");
    } catch (e) {
      setDigestBusy(false);
      setDigestNote(e instanceof Error ? e.message : String(e));
    }
  }

  function clearEphemeralTimer() {
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current);
      clearTimerRef.current = null;
    }
  }

  function scheduleClearAfterSent() {
    clearEphemeralTimer();
    clearTimerRef.current = setTimeout(() => {
      setPhase("idle");
      setActiveTarget(null);
      setCaptureHint(null);
      setBusy(false);
    }, 3200);
  }

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
    return () => clearEphemeralTimer();
  }, []);

  const { run } = useRealtimeRun(runId ?? undefined, {
    accessToken: rtToken ?? "",
    enabled: Boolean(runId && rtToken),
    skipColumns: ["payload"],
  });

  useEffect(() => {
    const outbound = (
      run?.metadata as { outbound?: { phase?: string; error?: string; url?: string } } | undefined
    )?.outbound;

    if (outbound?.phase) {
      setPhase(outbound.phase as SendPhase);
    }
    if (outbound?.error) setError(outbound.error);
    if (outbound?.url) setArtifactUrl(outbound.url);

    if (
      outbound?.phase === "succeeded" ||
      outbound?.phase === "already_succeeded" ||
      outbound?.phase === "failed" ||
      outbound?.phase === "uncertain" ||
      outbound?.phase === "reverted"
    ) {
      setBusy(false);
    }

    // Realtime fallback if metadata is thin but run finished.
    if (!outbound?.phase && run?.status === "COMPLETED") {
      setPhase("succeeded");
      setBusy(false);
    }
    if (
      !outbound?.phase &&
      (run?.status === "FAILED" ||
        run?.status === "CRASHED" ||
        run?.status === "SYSTEM_FAILURE")
    ) {
      setPhase("failed");
      setBusy(false);
      setError((prev) => prev || `Run ${run.status}`);
    }
  }, [run?.metadata, run?.status]);

  useEffect(() => {
    if (isTerminalSuccess(phase)) {
      scheduleClearAfterSent();
    }
    // Failures stay visible until the next send; don't auto-wipe errors.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (!isTerminalSuccess(phase) || !intentId || previewTarget !== "slack") {
      if (previewTarget !== "slack") setHasMessageTs(false);
      return;
    }
    void readOutboundIntent(intentId).then((res) => {
      if (res.ok) {
        setHasMessageTs(Boolean(res.intent.receipt?.messageTs));
        if (res.intent.receipt && "url" in (res.intent.receipt as object)) {
          const url = (res.intent.receipt as { url?: string }).url;
          if (url) setArtifactUrl(url);
        }
      }
    });
  }, [phase, intentId, previewTarget]);

  if (!status?.enabled) return null;

  const g = status.google;
  const inFlight = isInFlightPhase(phase, busy);
  const canUndo =
    activeTarget === "slack" &&
    isTerminalSuccess(phase) &&
    Boolean(intentId) &&
    hasMessageTs;

  async function connectApp(connector?: GoogleConnector) {
    setError(null);
    try {
      const res = await fetch("/api/outbound/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(connector ? { connector } : {}),
      });
      const json = (await res.json()) as { connectLinkUrl?: string; error?: string };
      if (!res.ok || !json.connectLinkUrl) {
        setError(json.error || "Could not create Connect link");
        return;
      }
      window.open(json.connectLinkUrl, "_blank", "noopener,noreferrer");
      for (let i = 0; i < 8; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        await refreshStatus();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function onSlackClick() {
    setError(null);
    setArtifactUrl(null);
    if (!status?.connected) {
      await connectApp();
      return;
    }
    setPreviewTarget("slack");
    setPreviewOpen(true);
  }

  async function onGoogleClick(connector: GoogleConnector) {
    setError(null);
    setArtifactUrl(null);
    if (!g?.enabled || !g[connector]) {
      setError(`Google ${connector} is disabled (set PLANTOS_OUTBOUND_GOOGLE=true)`);
      return;
    }
    if (!g.connected?.[connector]) {
      await connectApp(connector);
      return;
    }
    if (!draft?.pack?.charts?.length) {
      setError("Pin charts first — Google share needs a canvas pack.");
      return;
    }
    setPreviewTarget(connector);
    setPreviewOpen(true);
  }

  async function captureImages() {
    setPhase("capturing");
    setCaptureHint(null);
    try {
      const images = await captureCanvasChartImages(4);
      setCaptureHint(
        images.length > 0
          ? `Captured ${images.length} chart image${images.length === 1 ? "" : "s"}`
          : "No chart images captured — continuing without PNGs"
      );
      return images;
    } catch {
      setCaptureHint("Chart capture failed — continuing without PNGs");
      return [] as Array<{ filename: string; base64: string }>;
    }
  }

  async function confirmSend() {
    if (!draft?.body?.trim() && previewTarget === "slack") {
      setError("No message to send — pin or load a chart first.");
      return;
    }
    clearEphemeralTimer();
    setPreviewOpen(false);
    setBusy(true);
    setError(null);
    setActiveTarget(previewTarget);
    setArtifactUrl(null);

    const images = await captureImages();
    setPhase("start");

    if (previewTarget === "slack") {
      const res = await startOutboundSlackSend({
        title: draft?.title || "PlantOS update",
        body: draft?.body || "",
        images,
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
      return;
    }

    if (!draft?.pack) {
      setBusy(false);
      setPhase("failed");
      setError("Missing pack metadata");
      return;
    }

    const res = await startOutboundGoogleSend({
      connector: previewTarget,
      title: draft.title || draft.pack.title,
      body: draft.googleBody || draft.body,
      pack: draft.pack,
      images,
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
    setPhase("sending");
  }

  async function onCancelPreview() {
    setPreviewOpen(false);
    if (intentId) await cancelOutboundIntent(intentId);
  }

  async function onUndo() {
    if (!intentId) return;
    clearEphemeralTimer();
    setBusy(true);
    setActiveTarget("slack");
    setPhase("undoing");
    const res = await undoOutboundSlack(intentId);
    if (!res.ok) {
      setBusy(false);
      setPhase("undo_failed");
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
      setPhase(res.intent.status as SendPhase);
      if (res.intent.error) setError(res.intent.error);
      const url = (res.intent.receipt as { url?: string } | undefined)?.url;
      if (url) setArtifactUrl(url);
    }
  }

  const previewLabel =
    previewTarget === "slack"
      ? status.channelLabel || "Slack"
      : previewTarget === "gmail"
        ? `Gmail (${g?.gmailTo || "set PLANTOS_GMAIL_TO"})`
        : previewTarget === "sheets"
          ? "Google Sheets"
          : previewTarget === "docs"
            ? "Google Docs"
            : "Google Slides";

  function targetSendState(target: PreviewTarget) {
    if (activeTarget !== target || phase === "idle") return null;
    return {
      phase,
      label: phaseLabel(phase),
      spinning: isInFlightPhase(phase, busy),
      ok: isTerminalSuccess(phase),
      bad: isTerminalFailure(phase),
    };
  }

  return (
    <div className="shrink-0 rounded-xl border-2 border-border bg-surface/80 px-3 py-2">
      <div className="grid grid-cols-5 items-start gap-2">
        <div className="flex min-w-0 flex-col items-center gap-1">
          <button
            type="button"
            disabled={inFlight}
            onClick={() => void onSlackClick()}
            data-testid="outbound-send-slack"
            className={`inline-flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border-2 bg-background px-2.5 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-50 ${
              status.connected ? "border-emerald-300/70" : "border-border"
            }`}
          >
            {targetSendState("slack")?.spinning ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <MessageSquare className="h-3.5 w-3.5" />
            )}
            {status.connected ? "Send to Slack" : "Connect Slack"}
          </button>
          <TargetStatus
            connected={Boolean(status.connected)}
            send={targetSendState("slack")}
          />
        </div>

        <GoogleShareButton
          enabled={Boolean(g?.gmail)}
          connected={Boolean(g?.connected?.gmail)}
          inFlight={inFlight}
          send={targetSendState("gmail")}
          icon={<Mail className="h-3.5 w-3.5" />}
          label="Gmail"
          testId="outbound-send-gmail"
          onClick={() => void onGoogleClick("gmail")}
        />
        <GoogleShareButton
          enabled={Boolean(g?.sheets)}
          connected={Boolean(g?.connected?.sheets)}
          inFlight={inFlight}
          send={targetSendState("sheets")}
          icon={<FileSpreadsheet className="h-3.5 w-3.5" />}
          label="Sheets"
          testId="outbound-send-sheets"
          onClick={() => void onGoogleClick("sheets")}
        />
        <GoogleShareButton
          enabled={Boolean(g?.docs)}
          connected={Boolean(g?.connected?.docs)}
          inFlight={inFlight}
          send={targetSendState("docs")}
          icon={<FileText className="h-3.5 w-3.5" />}
          label="Docs"
          testId="outbound-send-docs"
          onClick={() => void onGoogleClick("docs")}
        />
        <GoogleShareButton
          enabled={Boolean(g?.slides)}
          connected={Boolean(g?.connected?.slides)}
          inFlight={inFlight}
          send={targetSendState("slides")}
          icon={<Presentation className="h-3.5 w-3.5" />}
          label="Slides"
          testId="outbound-send-slides"
          onClick={() => void onGoogleClick("slides")}
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={digestBusy || inFlight || !status.enabled}
          onClick={() => void onDemoDigest()}
          data-testid="outbound-demo-digest"
          className="inline-flex items-center gap-1.5 rounded-lg border-2 border-sky-300/70 bg-background px-2.5 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-50"
          title="Send a live plant shift digest to Slack (demo)"
        >
          {digestBusy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Radio className="h-3.5 w-3.5" />
          )}
          {digestBusy ? "Sending digest…" : "Demo shift digest → Slack"}
        </button>
        {digestNote ? (
          <span className="text-[11px] text-muted-foreground">{digestNote}</span>
        ) : (
          <span className="text-[11px] text-muted-foreground">
            One-click plant summary for the live demo
          </span>
        )}
      </div>

      {(artifactUrl || canUndo || isTerminalFailure(phase)) && (
        <div className="mt-2 flex flex-wrap items-center justify-end gap-2 text-[11px] text-muted-foreground">
          {artifactUrl && (
            <a
              href={artifactUrl}
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-foreground"
            >
              Open file
            </a>
          )}
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
          {intentId && isTerminalFailure(phase) && (
            <button
              type="button"
              className="rounded border border-border px-2 py-0.5 text-[11px] hover:bg-muted"
              onClick={() => void refreshIntent()}
            >
              Refresh status
            </button>
          )}
        </div>
      )}

      {captureHint && !error && phase !== "idle" && (
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
            Send to {previewLabel}
          </p>
          <p className="mt-1 font-medium">{draft?.title || "PlantOS update"}</p>
          <p className="mt-1 max-h-28 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
            {previewTarget === "slack"
              ? draft?.body || "(empty)"
              : draft?.googleBody || draft?.body || "(empty)"}
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {previewTarget === "slack"
              ? "Up to 4 charts as PNGs with two takeaway lines each."
              : previewTarget === "sheets"
                ? "Creates a spreadsheet: Summary (4 lines/chart) + Raw (series rows)."
                : previewTarget === "gmail"
                  ? "Emails 4-line explanations per chart; PNGs attached when capture works."
                  : previewTarget === "docs"
                    ? "Creates a Doc report with 4-line explanations per chart."
                    : "Creates a Slides deck (one slide per chart)."}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              data-testid="outbound-confirm-send"
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

type SendUi = {
  phase: SendPhase;
  label: string;
  spinning: boolean;
  ok: boolean;
  bad: boolean;
} | null;

function GoogleShareButton({
  enabled,
  connected,
  inFlight,
  send,
  icon,
  label,
  testId,
  onClick,
}: {
  enabled: boolean;
  connected: boolean;
  inFlight: boolean;
  send: SendUi;
  icon: React.ReactNode;
  label: string;
  testId: string;
  onClick: () => void;
}) {
  const button = !enabled ? (
    <button
      type="button"
      disabled
      title="Enable with PLANTOS_OUTBOUND_GOOGLE=true"
      className="inline-flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border-2 border-dashed border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground opacity-60"
    >
      {icon}
      Connect {label}
    </button>
  ) : (
    <button
      type="button"
      disabled={inFlight}
      data-testid={testId}
      onClick={onClick}
      className={`inline-flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border-2 bg-background px-2.5 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-50 ${
        connected ? "border-emerald-300/70" : "border-border"
      }`}
    >
      {send?.spinning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
      {connected ? `Send to ${label}` : `Connect ${label}`}
    </button>
  );

  return (
    <div className="flex min-w-0 flex-col items-center gap-1">
      {button}
      <TargetStatus connected={enabled && connected} send={send} />
    </div>
  );
}

function TargetStatus({ connected, send }: { connected: boolean; send: SendUi }) {
  if (send) {
    return (
      <span
        className={`inline-flex items-center gap-1 text-[10px] font-medium ${
          send.ok
            ? "text-emerald-700"
            : send.bad
              ? "text-[color:var(--danger)]"
              : "text-muted-foreground"
        }`}
        role="status"
        data-testid="outbound-send-progress"
        data-phase={send.phase}
      >
        {send.spinning ? (
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
        ) : (
          <span
            aria-hidden="true"
            className={
              send.ok
                ? "h-1.5 w-1.5 rounded-full bg-emerald-500"
                : send.bad
                  ? "h-1.5 w-1.5 rounded-full bg-[color:var(--danger)]"
                  : "h-1.5 w-1.5 rounded-full bg-amber-400"
            }
          />
        )}
        {send.label}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
      <span
        aria-hidden="true"
        className={
          connected
            ? "h-1.5 w-1.5 rounded-full bg-emerald-500"
            : "h-1.5 w-1.5 rounded-full border border-muted-foreground/70"
        }
      />
      {connected ? "Connected" : "Not connected"}
    </span>
  );
}
