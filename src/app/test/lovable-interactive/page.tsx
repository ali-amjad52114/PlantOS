"use client";

import { DECKS } from "@/components/lovable-viz/PlantVisualDeck";
import { InteractiveCardBody } from "@/components/lovable-viz/chart-chrome";

/** Dev/test surface: every Lovable+Replit card with forced interactive body. */
export default function LovableInteractiveTestPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <h1 className="mb-2 text-2xl font-semibold">Lovable interactive proof</h1>
      <p className="mb-6 text-sm text-slate-600">
        Every card below must expose axes/tooltip (charts) or exact-value rows (lists).
      </p>
      <div className="space-y-10">
        {DECKS.map((deck, di) => (
          <section key={deck.name} data-deck={deck.name}>
            <h2 className="mb-3 text-lg font-semibold">
              Deck {di + 1}: {deck.name}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {deck.cards.map((c) => (
                <article
                  key={c.id}
                  data-lovable-card={c.id}
                  data-interactive-card="true"
                  className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                  style={{ minHeight: 280 }}
                >
                  <div className="mb-2 text-sm font-semibold">{c.label}</div>
                  <div className="mb-2 text-[11px] text-slate-500">{c.hint}</div>
                  <div className="h-52">
                    <InteractiveCardBody type={c.id} />
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
