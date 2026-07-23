"use client";

import { InteractiveCardBody, InteractiveSeriesChart } from "@/components/lovable-viz/chart-chrome";

/** Minimal proof — no DECKS import, one of each interactive body type. */
const TYPES = [
  "EnergyValueTrend",
  "PowerSourceMix",
  "ProductionVolume",
  "ActiveAlerts",
  "OeeRing",
  "OutputVsDemand",
  "CostMixBubbles",
  "ClosestToLimit",
];

export default function MinimalInteractivePage() {
  return (
    <main className="min-h-screen bg-white p-6 text-slate-900">
      <h1 className="mb-4 text-xl font-semibold">Minimal interactive proof</h1>
      <div className="mb-8 h-52 w-full max-w-md border border-slate-200 p-2" data-probe="series-only">
        <InteractiveSeriesChart />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TYPES.map((type) => (
          <article
            key={type}
            data-lovable-card={type}
            data-interactive-card="true"
            className="rounded-xl border border-slate-200 p-3"
            style={{ minHeight: 280 }}
          >
            <div className="mb-2 text-sm font-semibold">{type}</div>
            <div className="h-52">
              <InteractiveCardBody type={type} />
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
