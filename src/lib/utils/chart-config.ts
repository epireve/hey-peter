import { format, parseISO, isValid } from 'date-fns';
import { logger } from '@/lib/services';
import { 
  ChartConfig, 
  ChartTheme, 
  ChartDataPoint, 
  ChartSeries,
  ChartValueFormatter,
  ChartDateFormatter,
  ChartNumberFormatter,
  CHART_COLORS,
  DEFAULT_CHART_CONFIG,
  CHART_BREAKPOINTS,
  AnalyticsChartData,
  TrendAnalysisData,
  DistributionData
} from '@/types/charts';

/**
 * Chart configuration utilities
 */
export class ChartConfigUtils {
  /**
   * Merge chart configs with defaults
   */
  static mergeConfig(config: Partial<ChartConfig> = {}): ChartConfig {
    return {
      ...DEFAULT_CHART_CONFIG,
      ...config,
      margin: {
        ...DEFAULT_CHART_CONFIG.margin,
        ...config.margin
      }
    };
  }

  /**
   * Get responsive chart dimensions
   */
  static getResponsiveDimensions(containerWidth: number, config: ChartConfig) {
    const { height = 300 } = config;
    let responsiveHeight = height;

    if (containerWidth <= CHART_BREAKPOINTS.mobile) {
      responsiveHeight = height * 0.8;
    } else if (containerWidth <= CHART_BREAKPOINTS.tablet) {
      responsiveHeight = height * 0.9;
    }

    return {
      width: '100%',
      height: responsiveHeight
    };
  }

  /**
   * Generate color palette for series
   */
  static generateColorPalette(seriesCount: number, colorScheme: keyof typeof CHART_COLORS = 'primary'): string[] {
    const colors = CHART_COLORS[colorScheme];
    const palette: string[] = [];

    for (let i = 0; i < seriesCount; i++) {
      palette.push(colors[i % colors.length]);
    }

    return palette;
  }

  /**
   * Create chart theme
   */
  static createTheme(mode: 'light' | 'dark'): ChartTheme {
    const lightTheme: ChartTheme = {
      colors: {
        primary: CHART_COLORS.primary,
        secondary: CHART_COLORS.pastel,
        accent: CHART_COLORS.vibrant,
        neutral: CHART_COLORS.monochrome
      },
      background: '#ffffff',
      text: '#1f2937',
      grid: '#e5e7eb',
      axis: '#6b7280',
      tooltip: {
        background: '#ffffff',
        text: '#1f2937',
        border: '#e5e7eb'
      }
    };

    const darkTheme: ChartTheme = {
      colors: {
        primary: CHART_COLORS.primary,
        secondary: CHART_COLORS.pastel,
        accent: CHART_COLORS.vibrant,
        neutral: CHART_COLORS.monochrome.slice().reverse()
      },
      background: '#1f2937',
      text: '#f9fafb',
      grid: '#374151',
      axis: '#9ca3af',
      tooltip: {
        background: '#374151',
        text: '#f9fafb',
        border: '#4b5563'
      }
    };

    return mode === 'light' ? lightTheme : darkTheme;
  }

  /**
   * Auto-generate chart series from data
   */
  static autoGenerateSeries(data: ChartDataPoint[], excludeKeys: string[] = ['name', 'date', 'timestamp']): ChartSeries[] {
    if (!data || data.length === 0) return [];

    const firstItem = data[0];
    const keys = Object.keys(firstItem).filter(key => !excludeKeys.includes(key));
    const colors = this.generateColorPalette(keys.length);

    return keys.map((key, index) => ({
      key,
      name: this.formatSeriesName(key),
      color: colors[index]
    }));
  }

  /**
   * Format series name for display
   */
  static formatSeriesName(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
      .trim();
  }

  /**
   * Validate chart data
   */
  static validateData(data: ChartDataPoint[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!Array.isArray(data)) {
      errors.push('Data must be an array');
      return { valid: false, errors };
    }

    if (data.length === 0) {
      errors.push('Data array cannot be empty');
      return { valid: false, errors };
    }

    // Check for consistent keys across all data points
    const firstItemKeys = Object.keys(data[0]);
    data.forEach((item, index) => {
      const itemKeys = Object.keys(item);
      const missingKeys = firstItemKeys.filter(key => !itemKeys.includes(key));
      if (missingKeys.length > 0) {
        errors.push(`Data point at index ${index} is missing keys: ${missingKeys.join(', ')}`);
      }
    });

    return { valid: errors.length === 0, errors };
  }

  /**
   * Detect chart type based on data
   */
  static detectChartType(data: ChartDataPoint[]): 'line' | 'bar' | 'pie' | 'area' {
    if (!data || data.length === 0) return 'bar';

    const firstItem = data[0];
    const keys = Object.keys(firstItem);
    const numericKeys = keys.filter(key => typeof firstItem[key] === 'number');

    // If there's a date/time field, suggest line chart
    if (keys.some(key => key.includes('date') || key.includes('time'))) {
      return 'line';
    }

    // If there are only 2 keys (name and value), suggest pie chart
    if (keys.length === 2 && numericKeys.length === 1) {
      return 'pie';
    }

    // If there are multiple numeric values, suggest area chart
    if (numericKeys.length > 1) {
      return 'area';
    }

    // Default to bar chart
    return 'bar';
  }
}

/**
 * Chart formatting utilities
 */
export class ChartFormatUtils {
  /**
   * Format numbers for display
   */
  static formatNumber: ChartNumberFormatter = (value: number): string => {
    if (typeof value !== 'number' || isNaN(value)) return '0';

    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }

    return value.toLocaleString();
  };

  /**
   * Format percentages
   */
  static formatPercentage: ChartValueFormatter = (value: any): string => {
    const num = typeof value === 'number' ? value : parseFloat(value);
    return isNaN(num) ? '0%' : `${num.toFixed(1)}%`;
  };

  /**
   * Format currency
   */
  static formatCurrency: ChartValueFormatter = (value: any): string => {
    const num = typeof value === 'number' ? value : parseFloat(value);
    return isNaN(num) ? '$0' : `$${num.toLocaleString()}`;
  };

  /**
   * Format dates
   */
  static formatDate: ChartDateFormatter = (date: Date | string): string => {
    let dateObj: Date;

    if (typeof date === 'string') {
      dateObj = parseISO(date);
    } else {
      dateObj = date;
    }

    if (!isValid(dateObj)) {
      return String(date);
    }

    return format(dateObj, 'MMM dd');
  };

  /**
   * Format time
   */
  static formatTime: ChartDateFormatter = (date: Date | string): string => {
    let dateObj: Date;

    if (typeof date === 'string') {
      dateObj = parseISO(date);
    } else {
      dateObj = date;
    }

    if (!isValid(dateObj)) {
      return String(date);
    }

    return format(dateObj, 'HH:mm');
  };

  /**
   * Format duration in minutes
   */
  static formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (remainingMinutes === 0) {
      return `${hours}h`;
    }

    return `${hours}h ${remainingMinutes}m`;
  };

  /**
   * Create custom tooltip formatter
   */
  static createTooltipFormatter(
    formatType: 'number' | 'percentage' | 'currency' | 'duration' | 'custom',
    customFormatter?: (value: any) => string
  ) {
    return (value: any, name: string) => {
      let formattedValue: string;

      switch (formatType) {
        case 'number':
          formattedValue = this.formatNumber(value);
          break;
        case 'percentage':
          formattedValue = this.formatPercentage(value);
          break;
        case 'currency':
          formattedValue = this.formatCurrency(value);
          break;
        case 'duration':
          formattedValue = this.formatDuration(value);
          break;
        case 'custom':
          formattedValue = customFormatter ? customFormatter(value) : String(value);
          break;
        default:
          formattedValue = String(value);
      }

      return [formattedValue, name];
    };
  }

  /**
   * Create custom label formatter
   */
  static createLabelFormatter(formatType: 'date' | 'time' | 'custom', customFormatter?: (value: any) => string) {
    return (value: any) => {
      switch (formatType) {
        case 'date':
          return this.formatDate(value);
        case 'time':
          return this.formatTime(value);
        case 'custom':
          return customFormatter ? customFormatter(value) : String(value);
        default:
          return String(value);
      }
    };
  }
}

/**
 * Chart data transformation utilities
 */
export class ChartDataUtils {
  /**
   * Transform analytics data for charts
   */
  static transformAnalyticsData(data: AnalyticsChartData[]): ChartDataPoint[] {
    return data.map(item => ({
      date: ChartFormatUtils.formatDate(item.date),
      value: item.value,
      category: item.category,
      ...item.metadata
    }));
  }

  /**
   * Transform trend analysis data
   */
  static transformTrendData(data: TrendAnalysisData[]): ChartDataPoint[] {
    return data.map(item => ({
      period: item.period,
      current: item.current,
      previous: item.previous,
      change: item.change,
      changePercent: item.changePercent,
      trend: item.trend
    }));
  }

  /**
   * Transform distribution data for pie charts
   */
  static transformDistributionData(data: DistributionData[]): ChartDataPoint[] {
    return data.map(item => ({
      name: item.category,
      value: item.value,
      percentage: item.percentage,
      fill: item.color
    }));
  }

  /**
   * Aggregate data by time period
   */
  static aggregateByPeriod(
    data: ChartDataPoint[], 
    dateKey: string, 
    valueKey: string, 
    period: 'day' | 'week' | 'month' | 'quarter' | 'year'
  ): ChartDataPoint[] {
    const grouped = new Map<string, number[]>();

    data.forEach(item => {
      const date = parseISO(item[dateKey]);
      if (!isValid(date)) return;

      let periodKey: string;
      switch (period) {
        case 'day':
          periodKey = format(date, 'yyyy-MM-dd');
          break;
        case 'week':
          periodKey = format(date, 'yyyy-\'W\'ww');
          break;
        case 'month':
          periodKey = format(date, 'yyyy-MM');
          break;
        case 'quarter':
          periodKey = format(date, 'yyyy-\'Q\'Q');
          break;
        case 'year':
          periodKey = format(date, 'yyyy');
          break;
        default:
          periodKey = format(date, 'yyyy-MM-dd');
      }

      if (!grouped.has(periodKey)) {
        grouped.set(periodKey, []);
      }
      grouped.get(periodKey)!.push(item[valueKey]);
    });

    return Array.from(grouped.entries()).map(([period, values]) => ({
      period,
      value: values.reduce((sum, val) => sum + val, 0),
      count: values.length,
      average: values.reduce((sum, val) => sum + val, 0) / values.length
    }));
  }

  /**
   * Calculate moving average
   */
  static calculateMovingAverage(data: ChartDataPoint[], valueKey: string, windowSize: number): ChartDataPoint[] {
    if (windowSize <= 0 || windowSize > data.length) {
      return data;
    }

    return data.map((item, index) => {
      const start = Math.max(0, index - windowSize + 1);
      const end = index + 1;
      const window = data.slice(start, end);
      const average = window.reduce((sum, d) => sum + d[valueKey], 0) / window.length;

      return {
        ...item,
        [`${valueKey}_ma`]: average
      };
    });
  }

  /**
   * Filter data by date range
   */
  static filterByDateRange(
    data: ChartDataPoint[], 
    dateKey: string, 
    startDate: Date, 
    endDate: Date
  ): ChartDataPoint[] {
    return data.filter(item => {
      const date = parseISO(item[dateKey]);
      return isValid(date) && date >= startDate && date <= endDate;
    });
  }

  /**
   * Sort data by key
   */
  static sortData(data: ChartDataPoint[], key: string, order: 'asc' | 'desc' = 'asc'): ChartDataPoint[] {
    return [...data].sort((a, b) => {
      if (order === 'asc') {
        return a[key] > b[key] ? 1 : -1;
      } else {
        return a[key] < b[key] ? 1 : -1;
      }
    });
  }

  /**
   * Group data by category
   */
  static groupByCategory(data: ChartDataPoint[], categoryKey: string): Map<string, ChartDataPoint[]> {
    const groups = new Map<string, ChartDataPoint[]>();

    data.forEach(item => {
      const category = item[categoryKey];
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(item);
    });

    return groups;
  }

  /**
   * Calculate statistics for a dataset
   */
  static calculateStats(data: ChartDataPoint[], valueKey: string) {
    const values = data.map(item => item[valueKey]).filter(val => typeof val === 'number');
    
    if (values.length === 0) {
      return { min: 0, max: 0, mean: 0, median: 0, sum: 0, count: 0 };
    }

    const sorted = values.sort((a, b) => a - b);
    const sum = values.reduce((acc, val) => acc + val, 0);
    const mean = sum / values.length;
    const median = sorted.length % 2 === 0 
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2 
      : sorted[Math.floor(sorted.length / 2)];

    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean,
      median,
      sum,
      count: values.length
    };
  }
}

/**
 * Chart export utilities
 */
export class ChartExportUtils {
  /**
   * Export chart as image
   */
  static async exportAsImage(
    chartElement: HTMLElement, 
    options: {
      format: 'png' | 'jpg';
      quality?: number;
      width?: number;
      height?: number;
      fileName?: string;
    }
  ): Promise<void> {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      const { width = 800, height = 600, format = 'png', quality = 1, fileName = 'chart' } = options;
      
      canvas.width = width;
      canvas.height = height;

      // This is a simplified implementation
      // In a real implementation, you would use libraries like html2canvas
      const link = document.createElement('a');
      link.download = `${fileName}.${format}`;
      link.href = canvas.toDataURL(`image/${format}`, quality);
      link.click();
    } catch (error) {
      logger.error('Failed to export chart:', error);
      throw error;
    }
  }

  /**
   * Export chart data as CSV
   */
  static exportAsCSV(data: ChartDataPoint[], fileName: string = 'chart-data'): void {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => row[header]).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName}.csv`;
    link.click();
  }

  /**
   * Export chart data as JSON
   */
  static exportAsJSON(data: ChartDataPoint[], fileName: string = 'chart-data'): void {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName}.json`;
    link.click();
  }
}

/**
 * Chart accessibility utilities
 */
export class ChartAccessibilityUtils {
  /**
   * Generate chart description for screen readers
   */
  static generateDescription(data: ChartDataPoint[], chartType: string): string {
    const dataLength = data.length;
    const firstItem = data[0];
    const keys = Object.keys(firstItem);
    const numericKeys = keys.filter(key => typeof firstItem[key] === 'number');

    return `${chartType} chart with ${dataLength} data points showing ${numericKeys.join(', ')}`;
  }

  /**
   * Generate chart summary table for accessibility
   */
  static generateSummaryTable(data: ChartDataPoint[]): string {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const tableRows = data.map(row => 
      headers.map(header => row[header]).join(' | ')
    ).join('\n');

    return `Chart Data Summary:\n${headers.join(' | ')}\n${tableRows}`;
  }
}