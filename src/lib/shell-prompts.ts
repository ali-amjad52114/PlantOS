import type { ShellMode } from "@/components/plant-shell";

/** Three clickable starter questions per persona / overview. */
export const MODE_QUESTIONS: Record<ShellMode, [string, string, string]> = {
  overview: [
    "Deep brief across engineer, ops, and finance — plant-wide status from live ClickHouse (use parallel investigate).",
    "Which tags are closest to their operating limits right now?",
    "Summarize generator, turbine, and boiler health from live data.",
  ],
  engineer: [
    "Show the hydro unit, steam versus hydro MW, component temperatures, and power versus shift target from live ClickHouse.",
    "Which tags are closest to limits and need attention?",
    "Show boiler pressure and steam flow trends from ClickHouse.",
  ],
  finance: [
    "What is today's production worth, and what has it cost?",
    "How does margin compare to the planned revenue for this shift?",
    "Break down operating cost into variable energy vs labour and fixed.",
  ],
  maintenance: [
    "Deep dive boiler and turbine vibration / reliability as the engineer specialist — prioritize maintenance checks from live tags.",
    "What equipment shows the highest deviation from normal range?",
    "Prioritize maintenance checks from live boiler, turbine, and generator tags.",
  ],
  safety: [
    "Are any boiler, turbine, or water tags outside normal operating ranges?",
    "Which safety-relevant tags are nearest their limits right now?",
    "Flag any live readings that violate normalMin/normalMax bands.",
  ],
  operations: [
    "Are we meeting today's production target? What is the bottleneck?",
    "What is current MW rate vs plant capacity utilization?",
    "Compare shift production so far to the shift target.",
  ],
};
