"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChartHeightContext } from "@/components/lovable-viz/card-live-context";
import { DECKS } from "@/components/lovable-viz/PlantVisualDeck";

const SHOWCASE_IDS = [
  "HydroEnergyBars",
  "ThroughputTimeline",
  "TargetAttainment",
  "PlantHealthRadar",
  "PowerSourceMix",
  "GeneratorOutput",
] as const;

type ShowcaseCard = {
  id: string;
  label: string;
  hint: string;
  bg: string;
  render: () => React.ReactElement;
};

function resolveCards(): ShowcaseCard[] {
  const byId = new Map<string, ShowcaseCard>();
  for (const deck of DECKS) {
    for (const card of deck.cards) {
      byId.set(card.id, card);
    }
  }
  return SHOWCASE_IDS.map((id) => byId.get(id)).filter(Boolean) as ShowcaseCard[];
}

function PreviewCard({
  card,
  className,
  chartH = 148,
}: {
  card: ShowcaseCard;
  className?: string;
  chartH?: number;
}) {
  return (
    <article
      className={`landing-preview-card group overflow-hidden rounded-2xl border border-border/70 bg-surface shadow-[0_20px_50px_-28px_oklch(0.2_0.04_265_/_0.45)] backdrop-blur-sm ${className ?? ""}`}
      style={{ backgroundImage: card.bg }}
    >
      <header className="flex items-start justify-between gap-3 border-b border-border/50 px-3.5 py-2.5">
        <div className="min-w-0 text-left">
          <h3 className="truncate text-[13px] font-semibold tracking-tight text-foreground">
            {card.label}
          </h3>
          <p className="truncate font-mono text-[10px] text-muted-foreground">{card.hint}</p>
        </div>
        <span className="mt-0.5 shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary">
          Live
        </span>
      </header>
      <ChartHeightContext.Provider value={chartH}>
        <div className="px-1.5 pb-2 pt-1" style={{ height: chartH + 8 }}>
          {card.render()}
        </div>
      </ChartHeightContext.Provider>
    </article>
  );
}

export function LandingHero() {
  const cards = useMemo(() => resolveCards(), []);
  const [hydro, throughput, target, radar, mix, generator] = cards;
  // Deck demos use Math.random / locale formatting — paint charts after mount to avoid SSR mismatch.
  const [chartsReady, setChartsReady] = useState(false);
  useEffect(() => {
    setChartsReady(true);
  }, []);

  return (
    <main className="landing-shell relative flex min-h-screen flex-col overflow-hidden text-foreground">
      <div className="landing-orb landing-orb-a" aria-hidden />
      <div className="landing-orb landing-orb-b" aria-hidden />
      <div className="landing-orb landing-orb-c" aria-hidden />
      <div className="landing-grid" aria-hidden />

      <header className="relative z-20 flex items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
        <div className="flex items-center gap-2.5">
          <div className="plantos-cat-logo relative h-9 w-9 overflow-hidden rounded-lg border border-border/80 bg-white shadow-sm">
            <Image
              src="/plantos-cat.webp"
              alt=""
              width={36}
              height={36}
              className="h-full w-full object-cover object-[50%_38%]"
              priority
            />
            <span className="plantos-eye-shine plantos-eye-left" aria-hidden />
            <span className="plantos-eye-shine plantos-eye-right" aria-hidden />
          </div>
          <span className="text-lg font-bold tracking-[-0.035em]">
            Plant<span className="text-foreground/55">OS</span>
            <span className="ml-1 text-primary">AI</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <p className="hidden text-xs font-medium text-muted-foreground md:block">
            ClickHouse · Trigger.dev
          </p>
          <Link
            href="/panel"
            className="relative z-40 rounded-full border border-border bg-surface/80 px-3.5 py-1.5 text-xs font-semibold text-foreground/80 backdrop-blur transition hover:border-primary/30 hover:text-foreground"
          >
            Open panel
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid w-full max-w-[1240px] flex-1 items-center gap-10 px-5 pb-14 pt-2 sm:px-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-8 lg:px-10 lg:pb-16 lg:pt-0">
        <div className="landing-rise landing-rise-1 relative z-30 max-w-xl text-left">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/85">
            Industrial intelligence
          </p>
          <h1 className="font-display text-[clamp(2.6rem,6.5vw,4.6rem)] leading-[0.94] tracking-[-0.03em] text-foreground">
            Plant<span className="text-foreground/45">OS</span>
            <span className="text-primary"> AI</span>
          </h1>
          <p className="mt-5 max-w-[34ch] text-[15px] leading-relaxed text-muted-foreground sm:text-base">
            Ask across engineer, ops, and finance — live tags from ClickHouse,
            durable agents on Trigger, charts that land on your canvas.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="/panel"
              className="landing-start group relative z-40 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-9 py-3.5 text-[15px] font-semibold text-primary-foreground shadow-[0_12px_32px_-12px_color-mix(in_oklab,var(--primary)_55%,transparent)] transition duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Start
              <span aria-hidden className="transition duration-300 group-hover:translate-x-0.5">
                →
              </span>
            </a>
            <span className="text-xs text-muted-foreground">Enter the live plant panel</span>
          </div>

          <ul className="mt-10 flex flex-wrap gap-2">
            {["Parallel investigate", "Specialist agent", "Historian live"].map((t) => (
              <li
                key={t}
                className="rounded-full border border-border/80 bg-surface/70 px-3 py-1 text-[11px] font-medium text-foreground/70 backdrop-blur"
              >
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="landing-rise landing-rise-3 relative z-10 mx-auto w-full max-w-[560px] pointer-events-none lg:mx-0 lg:max-w-none">
          <div className="landing-stage-glow" aria-hidden />

          <div className="relative mx-auto aspect-[1.05/1] w-full max-w-[520px] overflow-hidden lg:max-w-none lg:aspect-[1.12/1] lg:overflow-visible">
            {!chartsReady ? (
              <div className="absolute inset-6 animate-pulse rounded-[2rem] border border-border/50 bg-surface/40" />
            ) : (
              <>
            {hydro && (
              <PreviewCard
                card={hydro}
                chartH={132}
                className="landing-float landing-float-a absolute left-[2%] top-[4%] z-20 w-[72%] sm:w-[68%]"
              />
            )}
            {target && (
              <PreviewCard
                card={target}
                chartH={118}
                className="landing-float landing-float-b absolute right-[-2%] top-[18%] z-30 w-[48%] sm:w-[44%]"
              />
            )}
            {throughput && (
              <PreviewCard
                card={throughput}
                chartH={120}
                className="landing-float landing-float-c absolute bottom-[18%] left-[-2%] z-20 w-[58%] sm:w-[54%]"
              />
            )}
            {radar && (
              <PreviewCard
                card={radar}
                chartH={128}
                className="landing-float landing-float-d absolute bottom-[2%] right-[4%] z-10 w-[52%] sm:w-[48%]"
              />
            )}
            {generator && (
              <PreviewCard
                card={generator}
                chartH={88}
                className="landing-float landing-float-e absolute left-[38%] top-[42%] z-40 w-[36%] sm:w-[32%]"
              />
            )}
            {mix && (
              <div className="pointer-events-none absolute -right-1 top-[-2%] z-0 hidden w-[28%] opacity-70 lg:block">
                <PreviewCard card={mix} chartH={100} className="landing-float landing-float-f scale-95" />
              </div>
            )}
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
