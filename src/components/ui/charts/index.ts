// Base Chart Components
export { default as BaseChart, withChartErrorBoundary } from './BaseChart';

// Chart Components
export { 
  default as LineChart, 
  InteractiveLineChart, 
  MultiAxisLineChart 
} from './LineChart';

export { 
  default as BarChart, 
  StackedBarChart, 
  GroupedBarChart, 
  HorizontalBarChart 
} from './BarChart';

export { 
  default as PieChart, 
  DonutChart, 
  SemiCircleChart, 
  GaugeChart 
} from './PieChart';

export { 
  default as AreaChart, 
  StackedAreaChart, 
  PercentageAreaChart, 
  StreamgraphChart,
  ThresholdAreaChart 
} from './AreaChart';

export { 
  default as RadarChart, 
  PerformanceRadarChart, 
  SkillAssessmentRadarChart 
} from './RadarChart';

export { 
  default as ScatterChart, 
  BubbleChart, 
  CorrelationScatterChart 
} from './ScatterChart';

export { 
  default as ComposedChart, 
  FinancialChart, 
  PerformanceDashboardChart 
} from './ComposedChart';

// Chart Types and Utilities
export * from '@/types/charts';
export * from '@/lib/utils/chart-config';

// Chart Presets and Quick Components
export const ChartPresets = {
  // Analytics Dashboard Charts
  EnrollmentTrend: {
    type: 'line',
    config: {
      colors: ['#10b981', '#3b82f6', '#ef4444'],
      animations: true
    },
    showDots: false,
    showArea: true,
    showTrendLine: true
  },
  
  StudentProgress: {
    type: 'bar',
    config: {
      colors: ['#8b5cf6', '#06b6d4', '#f59e0b'],
      animations: true
    },
    layout: 'vertical',
    showValues: true,
    sortable: true
  },
  
  CourseDistribution: {
    type: 'pie',
    config: {
      colors: ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16'],
      animations: true
    },
    showPercentages: true,
    showLegend: true,
    variant: 'donut'
  },
  
  AttendancePattern: {
    type: 'area',
    config: {
      colors: ['#10b981', '#f59e0b', '#ef4444'],
      animations: true
    },
    stackMode: 'normal',
    showGradient: true,
    fillOpacity: 0.7
  },
  
  TeacherPerformance: {
    type: 'radar',
    config: {
      colors: ['#3b82f6', '#10b981'],
      animations: true
    },
    showDots: true,
    showValues: true,
    gradientFill: true
  },
  
  CorrelationAnalysis: {
    type: 'scatter',
    config: {
      colors: ['#8b5cf6', '#06b6d4'],
      animations: true
    },
    showTrendLine: true,
    showCorrelation: true,
    outlierDetection: true
  },
  
  FinancialOverview: {
    type: 'composed',
    config: {
      colors: ['#10b981', '#3b82f6', '#ef4444', '#f59e0b'],
      animations: true
    },
    dualAxis: true,
    showBrush: true,
    showZoomControls: true
  }
};

// Quick Chart Factory
export const createChart = (type: keyof typeof ChartPresets, props: any) => {
  const preset = ChartPresets[type];
  return {
    ...preset,
    ...props,
    config: {
      ...preset.config,
      ...props.config
    }
  };
};

// Chart Theme Presets
export const ChartThemes = {
  light: {
    background: '#ffffff',
    text: '#1f2937',
    grid: '#e5e7eb',
    axis: '#6b7280',
    colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
  },
  dark: {
    background: '#1f2937',
    text: '#f9fafb',
    grid: '#374151',
    axis: '#9ca3af',
    colors: ['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa']
  },
  corporate: {
    background: '#ffffff',
    text: '#1e293b',
    grid: '#e2e8f0',
    axis: '#64748b',
    colors: ['#0f172a', '#1e293b', '#334155', '#475569', '#64748b']
  },
  vibrant: {
    background: '#ffffff',
    text: '#1f2937',
    grid: '#e5e7eb',
    axis: '#6b7280',
    colors: ['#dc2626', '#ea580c', '#d97706', '#ca8a04', '#16a34a']
  }
};

// Common Chart Configurations
export const CommonConfigs = {
  responsive: {
    width: '100%',
    height: 300,
    margin: { top: 20, right: 30, bottom: 20, left: 20 },
    responsive: true
  },
  
  dashboard: {
    width: '100%',
    height: 250,
    margin: { top: 10, right: 20, bottom: 10, left: 20 },
    responsive: true,
    animations: true
  },
  
  detailed: {
    width: '100%',
    height: 400,
    margin: { top: 30, right: 40, bottom: 30, left: 40 },
    responsive: true,
    animations: true
  },
  
  compact: {
    width: '100%',
    height: 200,
    margin: { top: 10, right: 15, bottom: 10, left: 15 },
    responsive: true,
    animations: false
  }
};

// Accessibility helpers
export const AccessibilityHelpers = {
  generateDescription: (chartType: string, dataLength: number, seriesCount: number) => {
    return `${chartType} chart with ${dataLength} data points and ${seriesCount} data series`;
  },
  
  generateKeyboardInstructions: () => {
    return 'Use arrow keys to navigate chart elements, Enter to select, Escape to exit';
  },
  
  generateSummaryTable: (data: any[], columns: string[]) => {
    return data.map(row => 
      columns.map(col => row[col] || '').join(' | ')
    ).join('\n');
  }
};

// Data transformation helpers
export const DataTransformers = {
  timeSeriesFormatter: (data: any[], dateKey: string, valueKey: string) => {
    return data.map(item => ({
      ...item,
      [dateKey]: new Date(item[dateKey]).toLocaleDateString(),
      [valueKey]: Number(item[valueKey])
    }));
  },
  
  percentageFormatter: (data: any[], valueKey: string) => {
    const total = data.reduce((sum, item) => sum + item[valueKey], 0);
    return data.map(item => ({
      ...item,
      percentage: ((item[valueKey] / total) * 100).toFixed(1)
    }));
  },
  
  groupByCategory: (data: any[], categoryKey: string, valueKey: string) => {
    const groups: Record<string, any[]> = {};
    data.forEach(item => {
      const category = item[categoryKey];
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
    });
    
    return Object.entries(groups).map(([category, items]) => ({
      category,
      value: items.reduce((sum, item) => sum + item[valueKey], 0),
      count: items.length
    }));
  },
  
  normalizeData: (data: any[], valueKey: string) => {
    const values = data.map(item => item[valueKey]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    
    return data.map(item => ({
      ...item,
      [`${valueKey}_normalized`]: range === 0 ? 0 : (item[valueKey] - min) / range
    }));
  }
};

// Chart validation helpers
export const ChartValidators = {
  validateData: (data: any[]) => {
    if (!Array.isArray(data)) {
      return { valid: false, error: 'Data must be an array' };
    }
    
    if (data.length === 0) {
      return { valid: false, error: 'Data array cannot be empty' };
    }
    
    return { valid: true, error: null };
  },
  
  validateSeries: (series: any[], data: any[]) => {
    if (!Array.isArray(series) || series.length === 0) {
      return { valid: false, error: 'Series must be a non-empty array' };
    }
    
    const dataKeys = data.length > 0 ? Object.keys(data[0]) : [];
    const invalidKeys = series.filter(s => !dataKeys.includes(s.key));
    
    if (invalidKeys.length > 0) {
      return { 
        valid: false, 
        error: `Series keys not found in data: ${invalidKeys.map(s => s.key).join(', ')}` 
      };
    }
    
    return { valid: true, error: null };
  },
  
  validateConfig: (config: any) => {
    if (config && typeof config !== 'object') {
      return { valid: false, error: 'Config must be an object' };
    }
    
    if (config?.colors && !Array.isArray(config.colors)) {
      return { valid: false, error: 'Colors must be an array' };
    }
    
    return { valid: true, error: null };
  }
};

// Export utilities for backward compatibility
export { 
  ChartConfigUtils, 
  ChartFormatUtils, 
  ChartDataUtils, 
  ChartExportUtils, 
  ChartAccessibilityUtils 
} from '@/lib/utils/chart-config';