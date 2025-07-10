"use client";

import React from "react";
import {
  LineChart,
  BarChart,
  PieChart,
  AreaChart,
  ChartPresets,
  createChart,
  CommonConfigs
} from "@/components/ui/charts";
import { ChartDataPoint, ChartSeries } from "@/types/charts";

type ChartType = "line" | "area" | "bar" | "pie";

interface ChartData {
  [key: string]: any;
}

interface AnalyticsChartProps {
  title: string;
  description?: string;
  data: ChartData[];
  type?: ChartType;
  dataKey: string | string[];
  xAxisKey?: string;
  height?: number;
  colors?: string[];
  exportable?: boolean;
  showInteractions?: boolean;
  showTrendLine?: boolean;
  showAnimations?: boolean;
  preset?: keyof typeof ChartPresets;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export const AnalyticsChart = React.memo(({
  title,
  description,
  data,
  type = "line",
  dataKey,
  xAxisKey = "name",
  height = 300,
  colors = COLORS,
  exportable = true,
  showInteractions = true,
  showTrendLine = false,
  showAnimations = true,
  preset,
}: AnalyticsChartProps) => {
  // Convert data keys to series format
  const series = React.useMemo(() => {
    const keys = Array.isArray(dataKey) ? dataKey : [dataKey];
    return keys.map((key, index) => ({
      key,
      name: key,
      color: colors[index % colors.length]
    }));
  }, [dataKey, colors]);

  // Chart configuration
  const chartConfig = React.useMemo(() => ({
    ...CommonConfigs.dashboard,
    height,
    colors,
    animations: showAnimations
  }), [height, colors, showAnimations]);

  // Common chart props
  const commonProps = {
    data: data as ChartDataPoint[],
    config: chartConfig,
    series,
    title,
    subtitle: description,
    exportable,
    xAxis: {
      dataKey: xAxisKey,
      tickFormatter: undefined
    },
    yAxis: {
      tickFormatter: undefined
    },
    tooltip: {
      shared: true,
      trigger: 'hover' as const
    },
    legend: {
      position: 'bottom' as const
    },
    grid: {
      show: true,
      strokeDasharray: '3 3'
    }
  };

  // Use preset if provided
  if (preset) {
    const presetConfig = createChart(preset, commonProps);
    return React.createElement(getChartComponent(type), {
      ...presetConfig,
      ...commonProps
    });
  }

  // Render chart based on type
  switch (type) {
    case "line":
      return (
        <LineChart
          {...commonProps}
          showTrendLine={showTrendLine}
          showDots={false}
          showActiveDots={showInteractions}
          strokeWidth={2}
          type="monotone"
        />
      );

    case "area":
      return (
        <AreaChart
          {...commonProps}
          stackMode="normal"
          showGradient={true}
          fillOpacity={0.6}
          type="monotone"
        />
      );

    case "bar":
      return (
        <BarChart
          {...commonProps}
          layout="vertical"
          showValues={false}
          showDataLabels={false}
          barSize={undefined}
        />
      );

    case "pie":
      return (
        <PieChart
          {...commonProps}
          dataKey={typeof dataKey === "string" ? dataKey : dataKey[0]}
          nameKey={xAxisKey}
          showPercentages={true}
          showLegend={true}
          showDataLabels={true}
          variant="pie"
        />
      );

    default:
      return null;
  }
});

// Helper function to get chart component
function getChartComponent(type: ChartType) {
  switch (type) {
    case "line": return LineChart;
    case "area": return AreaChart;
    case "bar": return BarChart;
    case "pie": return PieChart;
    default: return LineChart;
  }
}

AnalyticsChart.displayName = "AnalyticsChart";