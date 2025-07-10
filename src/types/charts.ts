export interface ChartDataPoint {
  [key: string]: any;
}

export interface ChartConfig {
  colors?: string[];
  height?: number;
  width?: string | number;
  margin?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  responsive?: boolean;
  animations?: boolean;
  theme?: 'light' | 'dark';
}

export interface ChartSeries {
  key: string;
  name?: string;
  color?: string;
  type?: 'line' | 'bar' | 'area';
  fill?: boolean;
  stack?: string;
  yAxisId?: string;
  hide?: boolean;
}

export interface ChartAxis {
  dataKey?: string;
  type?: 'number' | 'category';
  domain?: [number, number] | string[];
  label?: string;
  tickFormatter?: (value: any) => string;
  hide?: boolean;
  orientation?: 'left' | 'right' | 'top' | 'bottom';
}

export interface ChartTooltipConfig {
  formatter?: (value: any, name: string, props: any) => [string, string];
  labelFormatter?: (value: any) => string;
  hide?: boolean;
  shared?: boolean;
  trigger?: 'hover' | 'click' | 'none';
  position?: { x?: number; y?: number };
}

export interface ChartLegendConfig {
  position?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  hide?: boolean;
  formatter?: (value: string) => string;
}

export interface ChartGridConfig {
  show?: boolean;
  strokeDasharray?: string;
  horizontal?: boolean;
  vertical?: boolean;
}

export interface BaseChartProps {
  data: ChartDataPoint[];
  config?: ChartConfig;
  series?: ChartSeries[];
  xAxis?: ChartAxis;
  yAxis?: ChartAxis;
  tooltip?: ChartTooltipConfig;
  legend?: ChartLegendConfig;
  grid?: ChartGridConfig;
  className?: string;
  onDataPointClick?: (data: any, index: number) => void;
  onDataPointHover?: (data: any, index: number) => void;
  exportable?: boolean;
  title?: string;
  subtitle?: string;
  loading?: boolean;
  error?: string;
}

export interface LineChartProps extends BaseChartProps {
  connectNulls?: boolean;
  strokeWidth?: number;
  dot?: boolean;
  activeDot?: boolean;
  type?: 'linear' | 'monotone' | 'step' | 'stepBefore' | 'stepAfter';
}

export interface BarChartProps extends BaseChartProps {
  layout?: 'horizontal' | 'vertical';
  barSize?: number;
  barGap?: number;
  barCategoryGap?: number;
}

export interface PieChartProps extends Omit<BaseChartProps, 'series' | 'xAxis' | 'yAxis'> {
  dataKey: string;
  nameKey?: string;
  innerRadius?: number;
  outerRadius?: number;
  startAngle?: number;
  endAngle?: number;
  paddingAngle?: number;
  cornerRadius?: number;
  labelLine?: boolean;
  label?: boolean | ((entry: any) => string);
}

export interface AreaChartProps extends BaseChartProps {
  stackId?: string;
  fillOpacity?: number;
  type?: 'linear' | 'monotone' | 'step' | 'stepBefore' | 'stepAfter';
}

export interface RadarChartProps extends Omit<BaseChartProps, 'xAxis' | 'yAxis'> {
  polarGridConfig?: {
    show?: boolean;
    gridType?: 'polygon' | 'circle';
    radialLines?: boolean;
  };
  polarAngleAxis?: {
    dataKey: string;
    tick?: boolean;
    tickFormatter?: (value: any) => string;
  };
  polarRadiusAxis?: {
    angle?: number;
    domain?: [number, number];
    tickFormatter?: (value: any) => string;
  };
}

export interface ScatterChartProps extends BaseChartProps {
  xAxisKey: string;
  yAxisKey: string;
  zAxisKey?: string;
  shape?: 'circle' | 'cross' | 'diamond' | 'square' | 'star' | 'triangle' | 'wye';
}

export interface ComposedChartProps extends BaseChartProps {
  children?: React.ReactNode;
  syncId?: string;
}

export interface ChartExportOptions {
  format: 'png' | 'jpg' | 'pdf' | 'svg';
  quality?: number;
  width?: number;
  height?: number;
  backgroundColor?: string;
  filename?: string;
}

export interface ChartTheme {
  colors: {
    primary: string[];
    secondary: string[];
    accent: string[];
    neutral: string[];
  };
  background: string;
  text: string;
  grid: string;
  axis: string;
  tooltip: {
    background: string;
    text: string;
    border: string;
  };
}

// Predefined color schemes
export const CHART_COLORS = {
  primary: [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
  ],
  pastel: [
    '#A7F3D0', '#BFDBFE', '#FDE68A', '#FECACA', '#DDD6FE',
    '#A5F3FC', '#D9F99D', '#FED7AA', '#FBCFE8', '#C7D2FE'
  ],
  vibrant: [
    '#1E40AF', '#059669', '#D97706', '#DC2626', '#7C3AED',
    '#0891B2', '#65A30D', '#EA580C', '#DB2777', '#4F46E5'
  ],
  monochrome: [
    '#1F2937', '#374151', '#6B7280', '#9CA3AF', '#D1D5DB',
    '#E5E7EB', '#F3F4F6', '#F9FAFB', '#111827', '#030712'
  ]
};

// Default chart configurations
export const DEFAULT_CHART_CONFIG: ChartConfig = {
  colors: CHART_COLORS.primary,
  height: 300,
  width: '100%',
  margin: { top: 20, right: 30, bottom: 20, left: 20 },
  responsive: true,
  animations: true,
  theme: 'light'
};

export const DEFAULT_TOOLTIP_CONFIG: ChartTooltipConfig = {
  shared: true,
  trigger: 'hover'
};

export const DEFAULT_LEGEND_CONFIG: ChartLegendConfig = {
  position: 'bottom',
  align: 'center'
};

export const DEFAULT_GRID_CONFIG: ChartGridConfig = {
  show: true,
  strokeDasharray: '3 3',
  horizontal: true,
  vertical: true
};

// Utility types for chart data formatting
export type ChartDataFormatter<T = any> = (data: T[]) => ChartDataPoint[];
export type ChartValueFormatter = (value: any) => string | number;
export type ChartDateFormatter = (date: Date | string) => string;
export type ChartNumberFormatter = (value: number) => string;

// Analytics-specific chart types
export interface AnalyticsChartData {
  date: string;
  value: number;
  category?: string;
  metadata?: Record<string, any>;
}

export interface TrendAnalysisData {
  period: string;
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
}

export interface DistributionData {
  category: string;
  value: number;
  percentage: number;
  color?: string;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  target?: number;
  unit?: string;
  format?: 'number' | 'percentage' | 'currency' | 'time';
}

export interface ComparisonData {
  category: string;
  series1: number;
  series2: number;
  series1Name?: string;
  series2Name?: string;
}

// Chart component status
export interface ChartStatus {
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

// Chart interaction events
export interface ChartInteractionEvent {
  type: 'click' | 'hover' | 'brush' | 'zoom';
  data: any;
  index: number;
  event: React.MouseEvent | React.TouchEvent;
}

// Chart responsive breakpoints
export const CHART_BREAKPOINTS = {
  mobile: 640,
  tablet: 768,
  desktop: 1024,
  wide: 1280
};

// Chart accessibility options
export interface ChartAccessibilityOptions {
  description?: string;
  summary?: string;
  keyboardNavigation?: boolean;
  screenReaderSupport?: boolean;
  highContrast?: boolean;
}