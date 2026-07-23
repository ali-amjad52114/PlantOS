"use client";

import { CHAT_DEFAULT_READING_LIMIT } from "@/lib/chat-visual-budget";

export function FindingsBody({
  kind,
  data,
}: {
  kind: "engineer" | "operations" | "finance";
  data: any;
}) {
  if (kind === "engineer") {
    const rows = Array.isArray(data.attention)
      ? data.attention.slice(0, CHAT_DEFAULT_READING_LIMIT)
      : [];
    if (!rows.length) {
      return <p className="px-3 py-2 text-xs text-muted-foreground">No attention tags returned.</p>;
    }
    return (
      <ul className="divide-y divide-border/50">
        {rows.map((a: any) => {
          const outside = Boolean(a.outside);
          return (
            <li key={a.tag} className="flex items-start gap-2 px-3 py-2">
              <span
                className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  outside
                    ? "bg-[color:var(--danger)]/15 text-[color:var(--danger)]"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {outside ? "Watch" : "OK"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <code className="font-mono text-[11px] font-semibold text-foreground">{a.tag}</code>
                  <span className="text-[11px] text-muted-foreground">{a.label}</span>
                </div>
                <p className="mt-0.5 tabular text-[12px] text-foreground/85">
                  {fmtNum(a.value)} {a.unit || ""}
                  <span className="text-muted-foreground">
                    {" "}
                    · normal {fmtNum(a.normalMin)}–{fmtNum(a.normalMax)}
                  </span>
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  if (kind === "operations") {
    const metrics = [
      { k: "Rate", v: `${fmtNum(data.currentRateMW)} MW` },
      { k: "vs target", v: `${fmtNum(data.percentOfTarget)}%` },
      { k: "Capacity", v: `${fmtNum(data.capacityUtilizationPct)}%` },
      { k: "Bottleneck", v: String(data.bottleneckArea || "—") },
    ];
    return <MetricStrip metrics={metrics} />;
  }

  const metrics = [
    { k: "Value", v: `$${fmtNum(data.productionValueUSD, 0)}` },
    { k: "Cost", v: `$${fmtNum(data.operatingCostUSD, 0)}` },
    { k: "Margin", v: `$${fmtNum(data.marginUSD, 0)}` },
  ];
  return (
    <div>
      <MetricStrip metrics={metrics} />
      {data.disclaimer ? (
        <p className="border-t border-border/50 px-3 py-1.5 text-[10px] text-muted-foreground">
          {String(data.disclaimer)}
        </p>
      ) : null}
    </div>
  );
}

function MetricStrip({ metrics }: { metrics: Array<{ k: string; v: string }> }) {
  return (
    <div className="grid grid-cols-2 gap-px bg-border/40 sm:grid-cols-4">
      {metrics.map((m) => (
        <div key={m.k} className="bg-surface px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{m.k}</p>
          <p className="mt-0.5 truncate text-[13px] font-semibold tabular text-foreground">{m.v}</p>
        </div>
      ))}
    </div>
  );
}

function fmtNum(n: unknown, digits = 2) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toFixed(digits);
}
