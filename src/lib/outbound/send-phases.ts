/** Pure labels for outbound send progress UI (Slack / Google). */

export type SendPhase =
  | "idle"
  | "capturing"
  | "start"
  | "uploading"
  | "sending"
  | "succeeded"
  | "already_succeeded"
  | "failed"
  | "uncertain"
  | "undoing"
  | "reverted"
  | "missing_intent"
  | "config_error"
  | "no_account"
  | "undo_failed";

export function phaseLabel(phase: SendPhase): string {
  switch (phase) {
    case "capturing":
      return "Capturing…";
    case "start":
      return "Starting…";
    case "uploading":
      return "Uploading…";
    case "sending":
      return "Sending…";
    case "undoing":
      return "Undoing…";
    case "succeeded":
    case "already_succeeded":
      return "Sent";
    case "reverted":
      return "Undone";
    case "failed":
    case "uncertain":
    case "missing_intent":
    case "config_error":
    case "no_account":
    case "undo_failed":
      return "Failed";
    default:
      return phase;
  }
}

export function isInFlightPhase(phase: SendPhase, busy: boolean) {
  return (
    busy ||
    phase === "capturing" ||
    phase === "start" ||
    phase === "uploading" ||
    phase === "sending" ||
    phase === "undoing"
  );
}

export function isTerminalSuccess(phase: SendPhase) {
  return phase === "succeeded" || phase === "already_succeeded";
}

export function isTerminalFailure(phase: SendPhase) {
  return (
    phase === "failed" ||
    phase === "uncertain" ||
    phase === "missing_intent" ||
    phase === "config_error" ||
    phase === "no_account" ||
    phase === "undo_failed"
  );
}
