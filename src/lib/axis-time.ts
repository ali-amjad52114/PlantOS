/**
 * Chart axis time labels — delegates to the shared UTC→PT contract in format-time.
 * Prefer importing from `@/lib/format-time` for new code; this path stays for existing imports.
 */
export { formatAxisTime, parseClickHouseTimeMs, type AxisTimeOptions } from "./format-time";
