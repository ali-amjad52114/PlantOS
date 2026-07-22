"use client";

import { Visualization } from "@/components/visualization";
import { PlantVisualDeck } from "@/components/lovable-viz";
import { LOVABLE_CARD_TYPES } from "@/components/lovable-viz/card-meta";
import { CATALOG_COMPONENT_NAMES, type VisualizationSpec } from "@/lib/catalog";

const sampleTrend = [
  { t: "14:00", mw: 286 },
  { t: "14:15", mw: 298 },
  { t: "14:30", mw: 305 },
  { t: "14:45", mw: 301 },
  { t: "15:00", mw: 312 },
];

const sampleBars = [
  { name: "Actual", mwh: 1480 },
  { name: "Target", mwh: 1600 },
  { name: "Forecast", mwh: 1550 },
];

const samplePie = [
  { name: "Energy", value: 42 },
  { name: "Labour", value: 28 },
  { name: "Fixed", value: 30 },
];

function leaf(name: string, props: Record<string, unknown>): VisualizationSpec {
  return { root: "root", elements: { root: { type: name, props } } };
}

const sparkData = [
  { v: 280 },
  { v: 290 },
  { v: 305 },
  { v: 298 },
  { v: 312 },
  { v: 308 },
];

/** Ignition-inspired plant cards (Batches A–C). */
const PLANT_VIZ_DEMOS: Array<{ name: string; blurb: string; spec: VisualizationSpec }> = [
  {
    name: "Gauge",
    blurb: "Semi-circular dial",
    spec: leaf("Gauge", { label: "Turbine power", value: 302.2, min: 0, max: 350, unit: "MW" }),
  },
  {
    name: "SimpleGauge",
    blurb: "Bar gauge",
    spec: leaf("SimpleGauge", { label: "Capacity util.", value: 86, min: 0, max: 100, unit: "%" }),
  },
  {
    name: "TimeSeriesChart",
    blurb: "Alias of LineChart",
    spec: leaf("TimeSeriesChart", {
      title: "P4_ST_PO",
      data: sampleTrend,
      xKey: "t",
      series: [{ dataKey: "mw", label: "MW" }],
    }),
  },
  {
    name: "PowerChart",
    blurb: "Alias of AreaChart",
    spec: leaf("PowerChart", {
      title: "Power",
      data: sampleTrend,
      xKey: "t",
      series: [{ dataKey: "mw", label: "MW" }],
      stacked: false,
    }),
  },
  {
    name: "XyChart",
    blurb: "Alias of LineChart",
    spec: leaf("XyChart", {
      title: "XY trend",
      data: sampleTrend,
      xKey: "t",
      series: [{ dataKey: "mw", label: "MW" }],
    }),
  },
  {
    name: "CylindricalTank",
    blurb: "Tank level",
    spec: leaf("CylindricalTank", { label: "Feedwater", value: 68, min: 0, max: 100, unit: "%" }),
  },
  {
    name: "Thermometer",
    blurb: "Temperature",
    spec: leaf("Thermometer", { label: "Steam temp", value: 420, min: 0, max: 600, unit: "C" }),
  },
  {
    name: "LinearScale",
    blurb: "Moving mark",
    spec: leaf("LinearScale", { label: "Pressure", value: 1.08, min: 0, max: 2, unit: "bar" }),
  },
  {
    name: "MovingAnalogIndicator",
    blurb: "Linear indicator",
    spec: leaf("MovingAnalogIndicator", { label: "Flow", value: 132, min: 0, max: 200, unit: "t/h" }),
  },
  {
    name: "LedDisplay",
    blurb: "LED readout",
    spec: leaf("LedDisplay", { label: "P4_ST_PO", value: 302.2, min: null, max: null, unit: "MW" }),
  },
  {
    name: "Sparkline",
    blurb: "Mini trend",
    spec: leaf("Sparkline", { label: "Recent MW", data: sparkData, unit: "MW" }),
  },
  {
    name: "Motor",
    blurb: "Symbol",
    spec: leaf("Motor", { label: "FW pump motor", state: "on", value: null, unit: null }),
  },
  {
    name: "Pump",
    blurb: "Symbol",
    spec: leaf("Pump", { label: "Condensate pump", state: "on", value: 82, unit: "%" }),
  },
  {
    name: "Valve",
    blurb: "Symbol",
    spec: leaf("Valve", { label: "Steam valve", state: "off", value: null, unit: null }),
  },
  {
    name: "Vessel",
    blurb: "Symbol + fill",
    spec: leaf("Vessel", { label: "Drum", state: "on", value: 55, unit: "%" }),
  },
  {
    name: "Sensor",
    blurb: "Symbol",
    spec: leaf("Sensor", { label: "TT-101", state: "on", value: 276, unit: "C" }),
  },
];

/** One demo per catalog component (shadcn + charts). */
const DEMOS: Array<{ name: string; blurb: string; spec: VisualizationSpec }> = [
  {
    name: "Heading",
    blurb: "Page/section titles",
    spec: leaf("Heading", { text: "PlantOS heading", level: "h3" }),
  },
  {
    name: "Text",
    blurb: "Body copy",
    spec: leaf("Text", { text: "Read-only normal-op plant intelligence.", variant: "muted" }),
  },
  {
    name: "Badge",
    blurb: "Status chip",
    spec: leaf("Badge", { text: "LIVE", variant: "default" }),
  },
  {
    name: "Alert",
    blurb: "Banner message",
    spec: leaf("Alert", {
      title: "Demo assumption",
      message: "Finance figures are synthetic and labeled.",
      type: "info",
    }),
  },
  {
    name: "Progress",
    blurb: "Percent bar",
    spec: leaf("Progress", { value: 72, max: 100, label: "Shift vs target" }),
  },
  {
    name: "Skeleton",
    blurb: "Loading placeholder",
    spec: leaf("Skeleton", { width: "100%", height: "48px", rounded: true }),
  },
  {
    name: "Spinner",
    blurb: "Loading spinner",
    spec: leaf("Spinner", { size: "md", label: "Querying ClickHouse…" }),
  },
  {
    name: "Avatar",
    blurb: "Initials / photo",
    spec: leaf("Avatar", { name: "Plant Operator", src: null, size: "md" }),
  },
  {
    name: "Image",
    blurb: "Image or placeholder",
    spec: leaf("Image", { alt: "Plant schematic placeholder", src: null, width: 320, height: 120 }),
  },
  {
    name: "Separator",
    blurb: "Divider",
    spec: {
      root: "stack",
      elements: {
        stack: { type: "Stack", props: { gap: "sm", direction: "vertical" }, children: ["a", "sep", "b"] },
        a: { type: "Text", props: { text: "Above", variant: "caption" } },
        sep: { type: "Separator", props: { orientation: "horizontal" } },
        b: { type: "Text", props: { text: "Below", variant: "caption" } },
      },
    },
  },
  {
    name: "Tooltip",
    blurb: "Hover help",
    spec: leaf("Tooltip", { text: "P4_ST_PO", content: "Steam turbine power output (MW)" }),
  },
  {
    name: "Popover",
    blurb: "Click popover",
    spec: leaf("Popover", { trigger: "Assumptions", content: "Synthetic rates — not company financials." }),
  },
  {
    name: "Stat",
    blurb: "PlantOS KPI number",
    spec: leaf("Stat", { label: "Production", value: "302 MW", caption: "P4_ST_PO · sample" }),
  },
  {
    name: "Card + Grid",
    blurb: "KPI strip layout",
    spec: {
      root: "card",
      elements: {
        card: { type: "Card", props: { title: "Engineer KPIs", description: "Sample" }, children: ["grid"] },
        grid: { type: "Grid", props: { columns: 3, gap: "md" }, children: ["s1", "s2", "s3"] },
        s1: { type: "Stat", props: { label: "Power", value: "302 MW", caption: null } },
        s2: { type: "Stat", props: { label: "Turbine", value: "814 rpm", caption: null } },
        s3: { type: "Stat", props: { label: "Boiler", value: "1.08", caption: "bar" } },
      },
    },
  },
  {
    name: "Stack",
    blurb: "Vertical/horizontal layout",
    spec: {
      root: "stack",
      elements: {
        stack: {
          type: "Stack",
          props: { direction: "vertical", gap: "sm" },
          children: ["h", "t"],
        },
        h: { type: "Heading", props: { text: "Stack demo", level: "h4" } },
        t: { type: "Text", props: { text: "Children flow in a stack.", variant: "body" } },
      },
    },
  },
  {
    name: "Table",
    blurb: "Evidence rows",
    spec: leaf("Table", {
      columns: ["Tag", "Value", "Unit"],
      rows: [
        ["P4_ST_PO", "302.2", "MW"],
        ["P4_ST_TT", "814", "rpm"],
      ],
      caption: "Sample tags",
    }),
  },
  {
    name: "LineChart",
    blurb: "Time trend",
    spec: leaf("LineChart", {
      title: "Power trend",
      data: sampleTrend,
      xKey: "t",
      series: [{ dataKey: "mw", label: "MW" }],
    }),
  },
  {
    name: "AreaChart",
    blurb: "Filled trend",
    spec: leaf("AreaChart", {
      title: "Power area",
      data: sampleTrend,
      xKey: "t",
      series: [{ dataKey: "mw", label: "MW" }],
      stacked: false,
    }),
  },
  {
    name: "BarChart",
    blurb: "Category compare",
    spec: leaf("BarChart", {
      title: "Shift MWh",
      data: sampleBars,
      xKey: "name",
      series: [{ dataKey: "mwh", label: "MWh" }],
      stacked: false,
    }),
  },
  {
    name: "PieChart",
    blurb: "Share of total",
    spec: leaf("PieChart", {
      title: "Cost mix",
      data: samplePie,
      nameKey: "name",
      valueKey: "value",
    }),
  },
  {
    name: "Accordion",
    blurb: "Collapsible sections",
    spec: leaf("Accordion", {
      type: "single",
      items: [
        { title: "Engineer", content: "Equipment health and trends." },
        { title: "Operations", content: "Targets and bottlenecks." },
        { title: "Finance", content: "Value, cost, margin (synthetic)." },
      ],
    }),
  },
  {
    name: "Collapsible",
    blurb: "Single expand block",
    spec: {
      root: "c",
      elements: {
        c: {
          type: "Collapsible",
          props: { title: "Evidence drawer", defaultOpen: true },
          children: ["body"],
        },
        body: { type: "Text", props: { text: "Query detail would go here.", variant: "muted" } },
      },
    },
  },
  {
    name: "Tabs",
    blurb: "Tab navigation (panels via children)",
    spec: {
      root: "tabs",
      elements: {
        tabs: {
          type: "Tabs",
          props: {
            tabs: [
              { label: "Overview", value: "ov" },
              { label: "Trends", value: "tr" },
            ],
            defaultValue: "ov",
            value: null,
          },
          children: ["p1", "p2"],
        },
        p1: { type: "Text", props: { text: "Overview panel", variant: "body" } },
        p2: { type: "Text", props: { text: "Trends panel", variant: "body" } },
      },
    },
  },
  {
    name: "Carousel",
    blurb: "Horizontal cards",
    spec: leaf("Carousel", {
      items: [
        { title: "Boiler", description: "Steam generation" },
        { title: "Turbine", description: "Power conversion" },
        { title: "Generator", description: "Electrical output" },
      ],
    }),
  },
  {
    name: "Dialog",
    blurb: "Modal (needs openPath state to show)",
    spec: {
      root: "d",
      elements: {
        d: {
          type: "Dialog",
          props: {
            title: "Confirm",
            description: "Sample dialog — wire openPath in interactive UIs.",
            openPath: "ui.dialogOpen",
          },
          children: ["body"],
        },
        body: { type: "Text", props: { text: "Dialog body", variant: "muted" } },
      },
    },
  },
  {
    name: "Drawer",
    blurb: "Bottom sheet (needs openPath)",
    spec: {
      root: "d",
      elements: {
        d: {
          type: "Drawer",
          props: {
            title: "Assumptions",
            description: "Sample drawer",
            openPath: "ui.drawerOpen",
          },
          children: ["body"],
        },
        body: { type: "Text", props: { text: "Drawer body", variant: "muted" } },
      },
    },
  },
  {
    name: "Button",
    blurb: "Action button",
    spec: leaf("Button", { label: "Investigate", variant: "primary", disabled: false }),
  },
  {
    name: "Link",
    blurb: "Anchor",
    spec: leaf("Link", { label: "Open ClickHouse docs", href: "https://clickhouse.com/docs" }),
  },
  {
    name: "ButtonGroup",
    blurb: "Segmented control",
    spec: leaf("ButtonGroup", {
      buttons: [
        { label: "Engineer", value: "eng" },
        { label: "Ops", value: "ops" },
        { label: "Finance", value: "fin" },
      ],
      selected: "eng",
    }),
  },
  {
    name: "Toggle",
    blurb: "Toggle button",
    spec: leaf("Toggle", { label: "LIVE", pressed: true, variant: "outline" }),
  },
  {
    name: "ToggleGroup",
    blurb: "Toggle set",
    spec: leaf("ToggleGroup", {
      type: "single",
      value: "1x",
      items: [
        { label: "1x", value: "1x" },
        { label: "2x", value: "2x" },
        { label: "4x", value: "4x" },
      ],
    }),
  },
  {
    name: "DropdownMenu",
    blurb: "Menu",
    spec: leaf("DropdownMenu", {
      label: "Role",
      value: "engineer",
      items: [
        { label: "Engineer", value: "engineer" },
        { label: "Operations", value: "operations" },
        { label: "Finance", value: "finance" },
      ],
    }),
  },
  {
    name: "Pagination",
    blurb: "Pages",
    spec: leaf("Pagination", { totalPages: 5, page: 2 }),
  },
  {
    name: "Input",
    blurb: "Text field (forms)",
    spec: leaf("Input", {
      label: "Tag filter",
      name: "tag",
      type: "text",
      placeholder: "P4_ST_PO",
      value: null,
      checks: null,
      validateOn: null,
    }),
  },
  {
    name: "Textarea",
    blurb: "Multi-line (forms)",
    spec: leaf("Textarea", {
      label: "Question",
      name: "q",
      placeholder: "Ask about the plant…",
      rows: 3,
      value: null,
      checks: null,
      validateOn: null,
    }),
  },
  {
    name: "Select",
    blurb: "Dropdown (forms)",
    spec: leaf("Select", {
      label: "Area",
      name: "area",
      options: ["Boiler", "Turbine", "Generator"],
      placeholder: "Pick area",
      value: null,
      checks: null,
      validateOn: null,
    }),
  },
  {
    name: "Checkbox",
    blurb: "Checkbox (forms)",
    spec: leaf("Checkbox", {
      label: "Show synthetic finance",
      name: "synth",
      checked: true,
      checks: null,
      validateOn: null,
    }),
  },
  {
    name: "Radio",
    blurb: "Radio group (forms)",
    spec: leaf("Radio", {
      label: "Speed",
      name: "speed",
      options: ["0.5x", "1x", "2x"],
      value: "1x",
      checks: null,
      validateOn: null,
    }),
  },
  {
    name: "Switch",
    blurb: "Switch (forms)",
    spec: leaf("Switch", {
      label: "Replay playing",
      name: "playing",
      checked: true,
      checks: null,
      validateOn: null,
    }),
  },
  {
    name: "Slider",
    blurb: "Range (forms)",
    spec: leaf("Slider", { label: "Speed", min: 0.5, max: 4, step: 0.5, value: 2 }),
  },
];

const covered = new Set<string>();
for (const d of DEMOS) {
  for (const token of d.name.replace(/[()]/g, " ").split(/\s+/)) {
    if (CATALOG_COMPONENT_NAMES.includes(token)) covered.add(token);
  }
}
covered.add("Card");
covered.add("Grid");
for (const t of LOVABLE_CARD_TYPES) covered.add(t);

const missing = CATALOG_COMPONENT_NAMES.filter((n) => !covered.has(n));

export function PreBuiltCatalog() {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Pre-built visualization catalog</h2>
        <p className="mt-1 max-w-3xl text-sm text-zinc-400">
          Full <code className="text-zinc-300">@json-render/shadcn</code> set + PlantOS charts + Lovable PlantOS cards.
          Ask-agent can assemble these via <code className="text-zinc-300">renderVisualization</code>. Sample data only —
          question→card wiring comes later.
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          Registered: <span className="text-zinc-300">{CATALOG_COMPONENT_NAMES.length}</span> components
          {missing.length > 0 ? ` · demos missing name chips only: ${missing.join(", ")}` : " · all have demos below"}
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {CATALOG_COMPONENT_NAMES.map((name) => (
          <div
            key={name}
            className="rounded-md border border-zinc-800 bg-zinc-900/50 px-2 py-1.5 text-xs text-zinc-200"
          >
            {name}
          </div>
        ))}
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-400">
          Lovable decks (PlantOS wording · 12 × 4 cards)
        </h3>
        <p className="mb-4 max-w-3xl text-xs text-zinc-500">
          All cards are in the catalog above. Browse decks here; you will assign which cards pair with which demo
          questions later.
        </p>
        <div className="rounded-lg border border-emerald-900/40 bg-zinc-900/20 p-4">
          <PlantVisualDeck />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-400">
          Plant viz (Ignition-inspired · props only)
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PLANT_VIZ_DEMOS.map((demo) => (
            <div key={demo.name} className="rounded-lg border border-emerald-900/40 bg-zinc-900/30 p-4">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h4 className="text-sm font-medium text-emerald-300">{demo.name}</h4>
                <p className="text-xs text-zinc-500">{demo.blurb}</p>
              </div>
              <Visualization spec={demo.spec} />
            </div>
          ))}
        </div>
      </div>

      <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Full catalog demos</h3>

      <div className="space-y-8">
        {DEMOS.map((demo) => (
          <div key={demo.name} className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-medium text-emerald-300">{demo.name}</h3>
              <p className="text-xs text-zinc-500">{demo.blurb}</p>
            </div>
            <div className="min-h-[2rem]">
              <Visualization spec={demo.spec} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
