"use client";

import { PlantTowerGrid } from "@/components/plant-tower-grid";
import { RoleVisual } from "@/components/plant-chat";
import type { ShellMode } from "@/components/plant-shell";
import { defaultPlantTower } from "@/lib/plant-tower";
import type { PlantTowerPayload } from "@/lib/plant-tower";

type AgentRole = "engineer" | "operations" | "finance";

export function agentRoleForMode(mode: ShellMode): AgentRole {
  if (mode === "finance") return "finance";
  if (mode === "operations") return "operations";
  return "engineer";
}

export function VisualStage({
  mode,
  agentRole,
  tower,
  roleData,
  live,
}: {
  mode: ShellMode;
  agentRole: AgentRole;
  tower: PlantTowerPayload | null;
  roleData: any;
  live: any;
}) {
  const overviewTower = defaultPlantTower("engineer");
  const showPlaceholder = mode === "maintenance" || mode === "safety";
  const activeTower =
    tower ??
    (mode === "overview"
      ? overviewTower
      : mode === "engineer" || mode === "finance" || mode === "operations"
        ? defaultPlantTower(agentRole)
        : null);

  return (
    <div className="card-surface flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 px-4 py-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Visual stage</p>
          <h2 className="text-sm font-semibold text-foreground">
            {mode === "overview"
              ? "SCADA overview"
              : mode === "maintenance"
                ? "Maintenance"
                : mode === "safety"
                  ? "Safety"
                  : `${agentRole} intelligence`}
          </h2>
        </div>
        <div className="text-right text-[11px] text-muted-foreground">
          <p>Live max {live?.live?.max_ts ?? "—"}</p>
          <p>
            {String(live?.live?.c ?? 0)} rows
            {live?.liveAgeSec != null ? ` · ${Math.round(live.liveAgeSec)}s` : ""}
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {showPlaceholder && (
          <div className="rise rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-6 text-sm text-muted-foreground">
            <p className="font-medium text-foreground/90">
              {mode === "maintenance" ? "Maintenance view" : "Safety view"}
            </p>
            <p className="mt-1">
              Nav is live; dedicated cards come next. Chat uses engineer tools with role-specific
              prompts — no invented tags.
            </p>
          </div>
        )}

        {activeTower && (
          <div className="rise">
            <PlantTowerGrid tower={activeTower} />
          </div>
        )}

        {roleData && (mode === "engineer" || mode === "finance" || mode === "operations") && (
          <div className="rise border-t border-white/5 pt-4">
            <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Investigation detail
            </p>
            <RoleVisual role={agentRole} data={roleData} />
          </div>
        )}

        {!activeTower && !roleData && !showPlaceholder && (
          <p className="text-sm text-muted-foreground">Ask the agent to generate a plant tower.</p>
        )}
      </div>
    </div>
  );
}
