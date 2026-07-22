import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { shadcnComponentDefinitions } from "@json-render/shadcn/catalog";
import { z } from "zod";

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

/** Lovable VisualDeck cards (PlantOS wording). 12 decks × 4 = 48. Question wiring TBD. */
export const lovableCardComponentDefinitions = Object.fromEntries(
  (
    [
      ["EnergyValueTrend", "Live $ energy value with mini trend. Finance deck 1."],
      ["PowerSourceMix", "Donut steam vs hydro share. Finance deck 1."],
      ["TargetAttainment", "Ring gauge shift target %. Finance deck 1."],
      ["ProductionVolume", "Bar pulse production volume. Finance deck 1."],
      ["ProcessFunnel", "Funnel demand→steam→MW. Ops deck 2."],
      ["AreaActivityGrid", "Dot grid area activity. Ops deck 2."],
      ["StreamCompare", "Waveform stream compare. Ops deck 2."],
      ["TagUpdateRate", "Tag/sample velocity number. Ops deck 2."],
      ["PlantHealthRadar", "Radar cost/margin/uptime/target. Finance deck 3."],
      ["OutputHeatmap", "Output intensity heatmap. Finance deck 3."],
      ["CostMixBubbles", "Cost mix bubbles. Finance deck 3."],
      ["ShiftBands", "Shift band progress rings. Finance deck 3."],
      ["AgentOrbit", "Agent orbit rings. Engineer deck 4."],
      ["InferenceStreams", "Inference stream lines. Engineer deck 4."],
      ["AnomalyMap", "Anomaly constellation map. Engineer deck 4."],
      ["ConfidenceScore", "Finding confidence gauge. Engineer deck 4."],
      ["UnitHealthGrid", "Unit health grid. Ops deck 5."],
      ["ThroughputTimeline", "Throughput vs target timeline. Ops deck 5/9."],
      ["QualityBreakdown", "Quality nested rings. Ops deck 5."],
      ["ActiveAlerts", "Active alert feed. Ops deck 5."],
      ["OeeRing", "OEE ring. Ops deck 6."],
      ["EnergyProduced", "Energy produced MWh. Ops deck 6."],
      ["OffNormalRate", "Off-normal rate %. Ops deck 6."],
      ["SampleInterval", "Sample interval. Ops deck 6."],
      ["GeneratorOutput", "Generator MW (P4_ST_PO). Engineer deck 7."],
      ["TurbineSpeed", "Turbine rotor rpm (P2_SIT01). Engineer deck 7."],
      ["BoilerPressure", "Boiler pressure (P1_PIT01). Engineer deck 7."],
      ["ClosestToLimit", "Condition bars near limits. Engineer deck 7."],
      ["OutputVsDemand", "Output vs demand lines. Engineer deck 8."],
      ["UtilityFlow", "Steam/water/fuel pipe flow. Engineer deck 8."],
      ["ThermalMap", "Thermal heatmap. Engineer deck 8/10."],
      ["VibrationSpectrum", "Vibration FFT bars. Engineer deck 8/10."],
      ["ShiftComparison", "Planned vs actual shift bars. Ops deck 9."],
      ["AreaUtilization", "Area utilization rings. Ops deck 9."],
      ["ShiftAlerts", "Shift alert feed. Ops deck 9."],
      ["ShiftThroughput", "Shift throughput timeline. Ops deck 9."],
      ["AssetRadar", "Asset subsystem radar. Engineer deck 10."],
      ["BearingVibration", "Bearing vibration spectrum. Engineer deck 10."],
      ["ThermalSignature", "Thermal signature map. Engineer deck 10."],
      ["TurbineRotorCard", "Turbine rotor visual. Engineer deck 10."],
      ["HydroUnit", "Hydro unit faceplate (P4_HT_PO). Engineer deck 11."],
      ["HydroEnergyBars", "Hydro energy bars. Engineer deck 11."],
      ["ComponentTemps", "Component temp chips. Engineer deck 11."],
      ["PowerAndTarget", "Half gauge + target progress. Engineer deck 11."],
      ["ValueByArea", "Value by plant area donut. Finance deck 12."],
      ["PlantValueMap", "Plant value heat map. Finance deck 12."],
      ["FinanceFunnelDetail", "Finance KPIs + funnel stream. Finance deck 12."],
      ["ForecastTrajectory", "Actual vs plan S-curve. Finance deck 12."],
    ] as const
  ).map(([name, description]) => [
    name,
    { props: lovableCardProps, description: `Lovable PlantOS card: ${description}` },
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

export function catalogPromptSection(): string {
  const components = Object.entries(catalog.data.components)
    .map(([name, def]) => {
      const jsonSchema = z.toJSONSchema(def.props as z.ZodType, { io: "input" });
      delete jsonSchema.$schema;
      return `### ${name}\n${(def as { description?: string }).description ?? ""}\nProps schema: ${JSON.stringify(jsonSchema)}`;
    })
    .join("\n\n");

  return `The spec is a flat element map:
{ "root": "<key of root element>", "elements": { "<key>": { "type": "<ComponentName>", "props": { ... }, "children": ["<child key>", ...] } } }

- Every key referenced in "children" or "root" must exist in "elements".
- Layout/containers that take children include Card, Stack, Grid, Tabs, Collapsible, Dialog, Drawer (and similar). Leaf components omit children or pass [].
- Prefer display components for plant answers: Card, Grid, Stat, Gauge, SimpleGauge, CylindricalTank, Thermometer, LedDisplay, Sparkline, Motor/Pump/Valve/Vessel/Sensor, charts (LineChart/TimeSeriesChart/PowerChart/PieChart), Table, Alert, Badge, Progress, Heading, Text.
- Lovable PlantOS cards (EnergyValueTrend, GeneratorOutput, TurbineSpeed, …): use when composing role towers; question→card maps will be provided — prefer those named cards over inventing layouts.
- For Engineer: GeneratorOutput/TurbineSpeed/BoilerPressure/Process signals cards + gauges. For Operations: UnitHealthGrid/ThroughputTimeline/OeeRing. For Finance: EnergyValueTrend/PowerSourceMix/TargetAttainment/ValueByArea.
- Avoid form controls (Input, Checkbox, …) unless the user is configuring something — PlantOS is read-only.
- Props marked nullable may be omitted or null.
- Inline the data rows in chart/table props — components don't fetch anything.

Available components:

${components}`;
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
