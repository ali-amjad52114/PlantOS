import { LOVABLE_CARD_META } from "@/components/lovable-viz/card-meta";

/**
 * Platform visual priority (must follow for every answer):
 * 1. Lovable cards → 2. Replit cards → 3. Ignition plant-viz → 4. generic charts / shadcn / ad-hoc
 * Never invent custom “AI cards” when a catalog card can show the same idea.
 */

export type VisualFamily = "lovable" | "replit" | "ignition" | "generic";

export type SpecLike = {
  root: string;
  elements: Record<
    string,
    { type: string; props: Record<string, unknown>; children?: string[] }
  >;
};

/** Layout / chrome — ignored when scoring a spec’s visual family. */
export const LAYOUT_COMPONENT_TYPES = new Set([
  "Card",
  "Stack",
  "Grid",
  "Tabs",
  "Collapsible",
  "Dialog",
  "Drawer",
  "Sheet",
  "Separator",
  "ScrollArea",
  "AspectRatio",
  "Heading",
  "Text",
  "Paragraph",
  "Badge",
  "Alert",
  "Progress",
  "Table",
  "Button",
  "Input",
  "Checkbox",
  "Label",
  "Select",
  "Textarea",
  "Switch",
  "Slider",
  "RadioGroup",
]);

export const LOVABLE_CARD_TYPES = new Set(
  LOVABLE_CARD_META.filter((c) => c.family === "lovable").map((c) => c.type)
);

export const REPLIT_CARD_TYPES = new Set(
  LOVABLE_CARD_META.filter((c) => c.family === "replit").map((c) => c.type)
);

/** Ignition-inspired plant-viz (must stay in sync with plantVizComponentDefinitions in catalog.ts). */
export const IGNITION_COMPONENT_TYPES = new Set([
  "Gauge",
  "SimpleGauge",
  "TimeSeriesChart",
  "PowerChart",
  "XyChart",
  "CylindricalTank",
  "Thermometer",
  "LinearScale",
  "MovingAnalogIndicator",
  "LedDisplay",
  "Sparkline",
  "Motor",
  "Pump",
  "Valve",
  "Vessel",
  "Sensor",
]);

export function classifyVisualType(type: string): VisualFamily | "layout" {
  if (LAYOUT_COMPONENT_TYPES.has(type)) return "layout";
  if (LOVABLE_CARD_TYPES.has(type)) return "lovable";
  if (REPLIT_CARD_TYPES.has(type)) return "replit";
  if (IGNITION_COMPONENT_TYPES.has(type)) return "ignition";
  return "generic";
}

export function leafVisualTypes(spec: SpecLike): string[] {
  const types: string[] = [];
  for (const el of Object.values(spec.elements)) {
    if (classifyVisualType(el.type) !== "layout") types.push(el.type);
  }
  return [...new Set(types)];
}

export function bestFamilyInSpec(spec: SpecLike): VisualFamily {
  const types = leafVisualTypes(spec);
  if (types.some((t) => classifyVisualType(t) === "lovable")) return "lovable";
  if (types.some((t) => classifyVisualType(t) === "replit")) return "replit";
  if (types.some((t) => classifyVisualType(t) === "ignition")) return "ignition";
  return "generic";
}

/**
 * Soft gate: reject specs that only use generic/ad-hoc charts when named cards exist.
 * Agent should pick a Lovable (then Replit, then Ignition) type instead.
 */
export function visualPriorityGate(
  spec: SpecLike
): { ok: true; family: VisualFamily } | { ok: false; errors: string[]; family: VisualFamily } {
  const family = bestFamilyInSpec(spec);
  if (family !== "generic") return { ok: true, family };

  const examples = LOVABLE_CARD_META.filter((c) => c.family === "lovable")
    .slice(0, 8)
    .map((c) => c.type)
    .join(", ");

  return {
    ok: false,
    family,
    errors: [
      "Visual priority violation: do not invent generic charts (LineChart/BarChart/Stat/shadcn Card layouts) when a catalog card fits. " +
        "Order: (1) Lovable cards, (2) Replit cards, (3) Ignition plant-viz (Gauge, TimeSeriesChart, …), (4) generic only if nothing fits. " +
        `Try a Lovable type such as: ${examples}.`,
    ],
  };
}

export function visualPriorityPromptRules(): string {
  return `## Visual component priority (REQUIRED for every answer)

Always pick visuals in this order — never skip ahead to invent your own cards:

1. **Lovable** PlantOS cards (decks 1–12) — preferred; they look best.
2. **Replit**-derived PlantOS cards (decks 13+) — only if no Lovable card fits the question.
3. **Ignition**-inspired plant-viz (\`Gauge\`, \`TimeSeriesChart\`, \`PowerChart\`, tanks, symbols, …) — only if neither Lovable nor Replit fits.
4. **Generic / other** (\`LineChart\`, \`BarChart\`, \`AreaChart\`, \`PieChart\`, \`Stat\`, raw shadcn Card/Text layouts) — last resort only.

Do **not** compose one-off “AI cards” from shadcn + generic charts when a named Lovable or Replit card can show the same idea. Prefer question→card maps and role towers (already Lovable) over \`renderVisualization\` with ad-hoc charts.`;
}
