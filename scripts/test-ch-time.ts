/**
 * Prove CH naive UTC → Pacific axis labels.
 * Run: npx tsx scripts/test-ch-time.ts
 */
import {
  formatAxisTime,
  formatPacificTimestamp,
  parseClickHouseTimeMs,
} from "../src/lib/format-time";

const naiveUtc = "2026-07-23 07:52:00";
const ms = parseClickHouseTimeMs(naiveUtc);
if (ms == null) throw new Error("parse failed");

const expectedUtcMs = Date.parse("2026-07-23T07:52:00.000Z");
if (ms !== expectedUtcMs) {
  throw new Error(`Expected UTC ms ${expectedUtcMs}, got ${ms}`);
}

const axis = formatAxisTime(naiveUtc);
const axisSec = formatAxisTime(naiveUtc, { withSeconds: true });
const pacific = formatPacificTimestamp(naiveUtc);

// PT in July is UTC-7 → 00:52
if (!/Jul 23 00:52$/.test(axis)) {
  throw new Error(`Expected axis "Jul 23 00:52", got "${axis}"`);
}
if (!/Jul 23 00:52:00$/.test(axisSec)) {
  throw new Error(`Expected axis with seconds "Jul 23 00:52:00", got "${axisSec}"`);
}
if (!/12:52:00\s*AM/i.test(pacific)) {
  throw new Error(`Expected pacific ~12:52:00 AM, got "${pacific}"`);
}

// Must not treat naive as local (which would stay 07:52 on a PT machine)
if (/07:52/.test(axis)) {
  throw new Error(`Axis still showing UTC wall clock: ${axis}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      naiveUtc,
      axis,
      axisSec,
      pacific,
      ms,
    },
    null,
    2
  )
);
