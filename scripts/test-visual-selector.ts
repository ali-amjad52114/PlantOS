/** Golden tests for catalog visual ranker. Run: npx tsx scripts/test-visual-selector.ts */
import { rankSelectVisuals } from "../src/lib/visual-catalog";
import { QUESTION_CARD_MAPS } from "../src/lib/question-card-maps";
import type { PlantRole } from "../src/lib/plant-tower";

const FREEFORM = [
  {
    role: "finance" as PlantRole,
    question: "How does margin compare to the planned revenue for this shift?",
    expectAny: ["TargetAttainment", "ForecastTrajectory", "FinanceFunnelDetail", "EnergyValueTrend"],
    forbid: ["ClosestToLimit", "AssetRadar", "BearingVibration"],
    findingsAny: ["marginUSD", "plannedRevenue", "varianceVsPlanUSD"],
  },
  {
    role: "finance" as PlantRole,
    question: "Show me whether we are ahead or behind plan on dollars this shift",
    expectAny: ["ForecastTrajectory", "FinanceFunnelDetail", "TargetAttainment", "EnergyValueTrend"],
    forbid: ["ClosestToLimit"],
    findingsAny: ["marginUSD", "plannedRevenue", "varianceVsPlanUSD"],
  },
  {
    role: "engineer" as PlantRole,
    question: "Which tags are closest to limits and need attention?",
    expectAny: ["ClosestToLimit", "AssetRadar", "BearingVibration", "ThermalSignature", "ActiveAlerts"],
    forbid: ["CostMixBubbles"],
  },
];

let failed = 0;

for (const c of FREEFORM) {
  const r = rankSelectVisuals({ question: c.question, role: c.role, limit: 2 });
  const hit = c.expectAny.some((t) => r.cardTypes.includes(t));
  const bad = (c.forbid || []).filter((t) => r.cardTypes.includes(t));
  const findOk = !c.findingsAny || c.findingsAny.some((k) => r.findingsKeys.includes(k));
  if (!hit || bad.length || !findOk) {
    failed++;
    console.error("FAIL freeform", c.question.slice(0, 70), {
      cardTypes: r.cardTypes,
      findingsKeys: r.findingsKeys,
      scores: r.scores.slice(0, 4),
    });
  } else {
    console.log("OK freeform", r.cardTypes.join("+"), "findings=", r.findingsKeys.join(","));
  }
}

/** Soft overlap: at least one fixture card appears in top-2 for each of the 15 starters. */
for (const map of QUESTION_CARD_MAPS) {
  const r = rankSelectVisuals({
    question: map.question,
    role: map.role,
    limit: 2,
  });
  const overlap = map.cardTypes.filter((t) => r.cardTypes.includes(t));
  if (overlap.length === 0) {
    // Soft warning — fixtures are eval targets, not hard locks; still fail if finance margin is wrong.
    console.warn("WARN no overlap with fixture", map.mode, `q${map.q}`, {
      expected: map.cardTypes,
      got: r.cardTypes,
    });
  } else {
    console.log("OK fixture", map.mode, `q${map.q}`, overlap.join("+"));
  }
}

const margin = rankSelectVisuals({
  question: "How does margin compare to the planned revenue for this shift?",
  role: "finance",
  limit: 2,
});
if (margin.cardTypes.includes("ClosestToLimit") || margin.cardTypes.includes("AssetRadar")) {
  failed++;
  console.error("FAIL margin question selected engineer cards", margin.cardTypes);
}

if (failed) {
  console.error(`${failed} hard failure(s)`);
  process.exit(1);
}
console.log("Visual selector golden checks passed");
