/**
 * Outbound send progress labels — proves Sent / in-flight mapping.
 * Run: npx tsx scripts/test-outbound-send-phases.mjs
 */
import assert from "node:assert/strict";
import {
  phaseLabel,
  isInFlightPhase,
  isTerminalSuccess,
  isTerminalFailure,
} from "../src/lib/outbound/send-phases.ts";

assert.equal(phaseLabel("capturing"), "Capturing…");
assert.equal(phaseLabel("uploading"), "Uploading…");
assert.equal(phaseLabel("sending"), "Sending…");
assert.equal(phaseLabel("succeeded"), "Sent");
assert.equal(phaseLabel("already_succeeded"), "Sent");
assert.equal(phaseLabel("failed"), "Failed");
assert.equal(isInFlightPhase("sending", false), true);
assert.equal(isInFlightPhase("idle", false), false);
assert.equal(isTerminalSuccess("succeeded"), true);
assert.equal(isTerminalFailure("uncertain"), true);

console.log(
  JSON.stringify(
    {
      ok: true,
      labels: {
        capturing: phaseLabel("capturing"),
        sending: phaseLabel("sending"),
        sent: phaseLabel("succeeded"),
      },
    },
    null,
    2
  )
);
