"use client";

import { defineRegistry } from "@json-render/react";
import { shadcnComponents } from "@json-render/shadcn";
import {
  AreaChartView,
  BarChartView,
  LineChartView,
  PieChartView,
  StatView,
} from "@/components/charts";
import { GaugeView, SimpleGaugeView } from "@/components/plant-viz/charts";
import {
  CylindricalTankView,
  LedDisplayView,
  LinearScaleView,
  MovingAnalogIndicatorView,
  SparklineView,
  ThermometerView,
} from "@/components/plant-viz/display";
import { MotorView, PumpView, SensorView, ValveView, VesselView } from "@/components/plant-viz/symbols";
import { buildLovableRegistryEntries } from "@/components/lovable-viz";
import { catalog } from "./catalog";

export const { registry } = defineRegistry(catalog, {
  components: {
    ...shadcnComponents,
    BarChart: ({ props }) => <BarChartView {...props} />,
    LineChart: ({ props }) => <LineChartView {...props} />,
    AreaChart: ({ props }) => <AreaChartView {...props} />,
    PieChart: ({ props }) => <PieChartView {...props} />,
    Stat: ({ props }) => <StatView {...props} />,
    // Ignition-inspired Charts
    Gauge: ({ props }) => <GaugeView {...props} />,
    SimpleGauge: ({ props }) => <SimpleGaugeView {...props} />,
    TimeSeriesChart: ({ props }) => <LineChartView {...props} />,
    PowerChart: ({ props }) => <AreaChartView {...props} />,
    XyChart: ({ props }) => <LineChartView {...props} />,
    // Display
    CylindricalTank: ({ props }) => <CylindricalTankView {...props} />,
    Thermometer: ({ props }) => <ThermometerView {...props} />,
    LinearScale: ({ props }) => <LinearScaleView {...props} />,
    MovingAnalogIndicator: ({ props }) => <MovingAnalogIndicatorView {...props} />,
    LedDisplay: ({ props }) => <LedDisplayView {...props} />,
    Sparkline: ({ props }) => <SparklineView {...props} />,
    // Symbols
    Motor: ({ props }) => <MotorView {...props} />,
    Pump: ({ props }) => <PumpView {...props} />,
    Valve: ({ props }) => <ValveView {...props} />,
    Vessel: ({ props }) => <VesselView {...props} />,
    Sensor: ({ props }) => <SensorView {...props} />,
    // Lovable PlantOS cards (48)
    ...buildLovableRegistryEntries(),
  },
});
