import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { shadcnComponentDefinitions } from "@json-render/shadcn/catalog";
import { z } from "zod";
import { LOVABLE_CARD_META } from "@/components/lovable-viz/card-meta";
import { visualPriorityPromptRules } from "@/lib/visual-priority";

/** Rows of data points: one record per x-axis entry. */
const chartData = z
  .array(z.record(z.string(), z.union([z.string(), z.number(), z.null()])))
  .describe("Data rows, one object per x-axis entry");

const series = z
  .array(
    z.object({
      dataKey: z.string().describe("Key in each data row holding this series' numeric value"),
      label: z.string().nullish().describe("Human-readable series name for legend/tooltip"),
    })
  )
  .describe("One entry per plotted series");

const cartesianChartProps = z.object({
  data: chartData,
  xKey: z.string().describe("Key in each data row to use for the x-axis"),
  series,
  title: z.string().nullable(),
});

export const chartComponentDefinitions = {
  BarChart: {
    props: cartesianChartProps.extend({
      stacked: z.boolean().nullable().describe("Stack the series instead of grouping"),
    }),
    description:
      "Bar chart for comparing values across categories or discrete time buckets. Supports multiple series, optionally stacked.",
  },
  LineChart: {
    props: cartesianChartProps,
    description: "Line chart for trends over a continuous or ordered x-axis (dates, hours).",
  },
  AreaChart: {
    props: cartesianChartProps.extend({
      stacked: z.boolean().nullable().describe("Stack the series to show a total"),
    }),
    description: "Area chart for trends where the magnitude/total matters. Supports stacking.",
  },
  PieChart: {
    props: z.object({
      data: chartData,
      nameKey: z.string().describe("Key in each data row holding the slice name"),
      valueKey: z.string().describe("Key in each data row holding the slice value"),
      title: z.string().nullable(),
    }),
    description:
      "Pie/donut chart for a share-of-total breakdown across a small number (<=8) of categories.",
  },
  Stat: {
    props: z.object({
      label: z.string(),
      value: z.string().describe("The headline value, pre-formatted (e.g. '1.4M', '$23.50')"),
      caption: z.string().nullable().describe("Small print under the value, e.g. a comparison"),
    }),
    description: "A single big-number stat. Use a Grid of Stats for a KPI row.",
  },
} as const;

const analogProps = z.object({
  label: z.string(),
  value: z.number(),
  min: z.number().nullable().describe("Scale minimum"),
  max: z.number().nullable().describe("Scale maximum"),
  unit: z.string().nullable(),
});

const symbolProps = z.object({
  label: z.string(),
  state: z.enum(["on", "off", "fault", "unknown"]).nullable(),
  value: z.number().nullable(),
  unit: z.string().nullable(),
});

/** Ignition-inspired plant visuals (Charts + Display + Symbols). Props-only; no tag binding. */
export const plantVizComponentDefinitions = {
  Gauge: {
    props: analogProps,
    description:
      "Semi-circular industrial gauge with needle. Use for MW, rpm, pressure when a dial reads better than a plain Stat.",
  },
  SimpleGauge: {
    props: analogProps,
    description: "Compact horizontal bar gauge for a single analog value vs min/max.",
  },
  TimeSeriesChart: {
    props: cartesianChartProps,
    description:
      "Ignition-style time series trend (same as LineChart). Prefer for tag history over time.",
  },
  PowerChart: {
    props: cartesianChartProps.extend({
      stacked: z.boolean().nullable(),
    }),
    description: "Power/production trend emphasis (renders as AreaChart).",
  },
  XyChart: {
    props: cartesianChartProps,
    description: "XY / scatter-style cartesian trend (renders as LineChart).",
  },
  CylindricalTank: {
    props: analogProps,
    description: "Vertical tank fill level. value between min/max fills the cylinder.",
  },
  Thermometer: {
    props: analogProps,
    description: "Thermometer for temperature-like analogs.",
  },
  LinearScale: {
    props: analogProps,
    description: "Horizontal scale with a moving indicator mark.",
  },
  MovingAnalogIndicator: {
    props: analogProps,
    description: "Moving analog indicator on a linear scale (same family as LinearScale).",
  },
  LedDisplay: {
    props: analogProps,
    description: "7-segment style LED numeric readout for a live value.",
  },
  Sparkline: {
    props: z.object({
      label: z.string(),
      data: chartData.describe("Rows with numeric field v or value"),
      unit: z.string().nullable(),
    }),
    description: "Tiny inline trend sparkline for a series of points.",
  },
  Motor: {
    props: symbolProps,
    description: "Motor equipment symbol. Color by state on|off|fault|unknown.",
  },
  Pump: {
    props: symbolProps,
    description: "Pump equipment symbol. Color by state.",
  },
  Valve: {
    props: symbolProps,
    description: "Valve equipment symbol. Color by state.",
  },
  Vessel: {
    props: symbolProps,
    description: "Vessel symbol; optional value 0-100 fills the vessel.",
  },
  Sensor: {
    props: symbolProps,
    description: "Sensor symbol. Color by state; optional value readout.",
  },
} as const;

const lovableCardProps = z.object({
  label: z.string().nullable().describe("Override card title; null uses PlantOS default"),
  hint: z.string().nullable().describe("Override subtitle; null uses PlantOS default"),
});

/** Lovable + Replit PlantOS cards from card-meta (priority: Lovable, then Replit). */
export const lovableCardComponentDefinitions = Object.fromEntries(
  LOVABLE_CARD_META.map((meta) => [
    meta.type,
    {
      props: lovableCardProps,
      description:
        meta.family === "replit"
          ? `Replit-derived PlantOS card (tier 2): ${meta.description}`
          : `Lovable PlantOS card (tier 1 — preferred): ${meta.description}`,
    },
  ])
);

/** Full shadcn catalog from @json-render/shadcn + PlantOS charts + Ignition + Lovable cards. */
export const catalog = defineCatalog(schema, {
  components: {
    ...shadcnComponentDefinitions,
    ...chartComponentDefinitions,
    ...plantVizComponentDefinitions,
    ...lovableCardComponentDefinitions,
  },
  actions: {},
});

export const CATALOG_COMPONENT_NAMES = Object.keys(catalog.data.components).sort();

export type VisualizationSpec = {
  root: string;
  elements: Record<
    string,
    {
      type: string;
      props: Record<string, unknown>;
      children?: string[];
    }
  >;
};

function formatComponentBlock(name: string, def: { description?: string; props: z.ZodType }) {
  const jsonSchema = z.toJSONSchema(def.props, { io: "input" });
  delete jsonSchema.$schema;
  return `### ${name}\n${def.description ?? ""}\nProps schema: ${JSON.stringify(jsonSchema)}`;
}

export function catalogPromptSection(): string {
  const lovable = LOVABLE_CARD_META.filter((c) => c.family === "lovable");
  const replit = LOVABLE_CARD_META.filter((c) => c.family === "replit");
  const comps = catalog.data.components as Record<
    string,
    { description?: string; props: z.ZodType }
  >;

  const tier1 = lovable
    .map((c) => formatComponentBlock(c.type, comps[c.type] ?? { props: lovableCardProps, description: c.description }))
    .join("\n\n");
  const tier2 = replit
    .map((c) => formatComponentBlock(c.type, comps[c.type] ?? { props: lovableCardProps, description: c.description }))
    .join("\n\n");
  const tier3 = Object.keys(plantVizComponentDefinitions)
    .map((name) => formatComponentBlock(name, comps[name]))
    .join("\n\n");
  const tier4Core = ["LineChart", "BarChart", "AreaChart", "PieChart", "Stat", "Card", "Grid", "Stack", "Heading", "Text"];
  const tier4 = tier4Core
    .filter((name) => comps[name])
    .map((name) => formatComponentBlock(name, comps[name]))
    .join("\n\n");

  return `${visualPriorityPromptRules()}

The spec is a flat element map:
{ "root": "<key of root element>", "elements": { "<key>": { "type": "<ComponentName>", "props": { ... }, "children": ["<child key>", ...] } } }

- Every key referenced in "children" or "root" must exist in "elements".
- Layout/containers that take children include Card, Stack, Grid, Tabs, Collapsible, Dialog, Drawer (and similar). Leaf components omit children or pass [].
- Chat density: by default emit **one** chart or a few small stats — never a wall of charts. Multi-chart Grids only when the user asks for many views.
- Role hints: Engineer → GeneratorOutput / TurbineSpeed / BoilerPressure / Hydro* Lovable cards. Operations → UnitHealthGrid / ThroughputTimeline / OeeRing. Finance → EnergyValueTrend / PowerSourceMix / TargetAttainment / ValueByArea.
- Avoid form controls unless the user is configuring something — PlantOS is read-only.
- Props marked nullable may be omitted or null.
- Named Lovable/Replit cards take seed/live bindings in the UI — you usually only pass optional label/hint overrides (no inline series required).
- Generic charts (tier 4) need data rows inlined in props.

## Tier 1 — Lovable (USE THESE FIRST)

${tier1}

## Tier 2 — Replit (only if no Lovable card fits)

${tier2}

## Tier 3 — Ignition plant-viz (only if no Lovable/Replit card fits)

${tier3}

## Tier 4 — Generic / other (last resort)

${tier4}`;
}


export function normalizeSpec(input: unknown): VisualizationSpec | null {
  const looksLikeSpec = (v: unknown): v is VisualizationSpec =>
    typeof v === "object" &&
    v !== null &&
    typeof (v as VisualizationSpec).root === "string" &&
    typeof (v as VisualizationSpec).elements === "object" &&
    (v as VisualizationSpec).elements !== null;

  if (looksLikeSpec(input)) return input;
  const inner = (input as { spec?: unknown } | null)?.spec;
  if (looksLikeSpec(inner)) return inner;
  return null;
}

export function validateSpec(spec: VisualizationSpec): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const components = catalog.data.components as Record<
    string,
    { props: z.ZodObject<Record<string, z.ZodType>> }
  >;

  if (!spec.elements[spec.root]) {
    errors.push(`root "${spec.root}" is not a key in elements`);
  }

  for (const [key, element] of Object.entries(spec.elements)) {
    const definition = components[element.type];
    if (!definition) {
      errors.push(
        `elements.${key}: unknown component type "${element.type}" (available: ${Object.keys(components).join(", ")})`
      );
      continue;
    }

    const props: Record<string, unknown> = { ...element.props };
    for (const [propName, propSchema] of Object.entries(definition.props.shape)) {
      if (!(propName in props) && propSchema.safeParse(null).success) {
        props[propName] = null;
      }
    }

    const parsed = definition.props.safeParse(props);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push(`elements.${key} (${element.type}) props.${issue.path.join(".")}: ${issue.message}`);
      }
    }

    for (const child of element.children ?? []) {
      if (!spec.elements[child]) {
        errors.push(`elements.${key}: child "${child}" is not a key in elements`);
      }
    }
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true };
}
