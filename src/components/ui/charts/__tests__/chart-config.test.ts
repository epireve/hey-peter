import {
  ChartConfigUtils,
  ChartFormatUtils,
  ChartDataUtils,
  ChartExportUtils,
  ChartAccessibilityUtils
} from '@/lib/utils/chart-config';
import { ChartDataPoint } from '@/types/charts';

describe('ChartConfigUtils', () => {
  describe('mergeConfig', () => {
    it('merges config with defaults', () => {
      const config = ChartConfigUtils.mergeConfig({
        colors: ['#ff0000'],
        height: 400
      });

      expect(config.colors).toEqual(['#ff0000']);
      expect(config.height).toBe(400);
      expect(config.width).toBe('100%');
      expect(config.responsive).toBe(true);
    });

    it('merges margin config', () => {
      const config = ChartConfigUtils.mergeConfig({
        margin: { top: 50 }
      });

      expect(config.margin?.top).toBe(50);
      expect(config.margin?.right).toBe(30);
      expect(config.margin?.bottom).toBe(20);
      expect(config.margin?.left).toBe(20);
    });
  });

  describe('getResponsiveDimensions', () => {
    it('returns full dimensions for desktop', () => {
      const dimensions = ChartConfigUtils.getResponsiveDimensions(1200, { height: 300 });
      
      expect(dimensions.width).toBe('100%');
      expect(dimensions.height).toBe(300);
    });

    it('adjusts height for mobile', () => {
      const dimensions = ChartConfigUtils.getResponsiveDimensions(500, { height: 300 });
      
      expect(dimensions.width).toBe('100%');
      expect(dimensions.height).toBe(240); // 300 * 0.8
    });

    it('adjusts height for tablet', () => {
      const dimensions = ChartConfigUtils.getResponsiveDimensions(700, { height: 300 });
      
      expect(dimensions.width).toBe('100%');
      expect(dimensions.height).toBe(270); // 300 * 0.9
    });
  });

  describe('generateColorPalette', () => {
    it('generates color palette for series', () => {
      const colors = ChartConfigUtils.generateColorPalette(3);
      
      expect(colors).toHaveLength(3);
      expect(colors[0]).toBe('#3B82F6');
      expect(colors[1]).toBe('#10B981');
      expect(colors[2]).toBe('#F59E0B');
    });

    it('repeats colors for large series count', () => {
      const colors = ChartConfigUtils.generateColorPalette(12);
      
      expect(colors).toHaveLength(12);
      expect(colors[0]).toBe(colors[10]); // Should repeat
    });
  });

  describe('autoGenerateSeries', () => {
    const mockData = [
      { name: 'A', value1: 100, value2: 200 },
      { name: 'B', value1: 150, value2: 250 }
    ];

    it('auto-generates series from data', () => {
      const series = ChartConfigUtils.autoGenerateSeries(mockData);
      
      expect(series).toHaveLength(2);
      expect(series[0].key).toBe('value1');
      expect(series[1].key).toBe('value2');
    });

    it('excludes specified keys', () => {
      const series = ChartConfigUtils.autoGenerateSeries(mockData, ['name', 'value1']);
      
      expect(series).toHaveLength(1);
      expect(series[0].key).toBe('value2');
    });
  });

  describe('validateData', () => {
    it('validates correct data', () => {
      const data = [{ name: 'A', value: 100 }];
      const result = ChartConfigUtils.validateData(data);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects non-array data', () => {
      const result = ChartConfigUtils.validateData({} as any);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Data must be an array');
    });

    it('rejects empty data', () => {
      const result = ChartConfigUtils.validateData([]);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Data array cannot be empty');
    });
  });

  describe('detectChartType', () => {
    it('detects line chart for time series', () => {
      const data = [{ date: '2023-01-01', value: 100 }];
      const type = ChartConfigUtils.detectChartType(data);
      
      expect(type).toBe('line');
    });

    it('detects pie chart for simple data', () => {
      const data = [{ name: 'A', value: 100 }];
      const type = ChartConfigUtils.detectChartType(data);
      
      expect(type).toBe('pie');
    });

    it('detects area chart for multiple values', () => {
      const data = [{ name: 'A', value1: 100, value2: 200 }];
      const type = ChartConfigUtils.detectChartType(data);
      
      expect(type).toBe('area');
    });
  });
});

describe('ChartFormatUtils', () => {
  describe('formatNumber', () => {
    it('formats large numbers', () => {
      expect(ChartFormatUtils.formatNumber(1000000)).toBe('1.0M');
      expect(ChartFormatUtils.formatNumber(1500)).toBe('1.5K');
      expect(ChartFormatUtils.formatNumber(500)).toBe('500');
    });

    it('handles invalid numbers', () => {
      expect(ChartFormatUtils.formatNumber(NaN)).toBe('0');
      expect(ChartFormatUtils.formatNumber('invalid' as any)).toBe('0');
    });
  });

  describe('formatPercentage', () => {
    it('formats percentages', () => {
      expect(ChartFormatUtils.formatPercentage(75)).toBe('75.0%');
      expect(ChartFormatUtils.formatPercentage(100)).toBe('100.0%');
    });

    it('handles string inputs', () => {
      expect(ChartFormatUtils.formatPercentage('50')).toBe('50.0%');
      expect(ChartFormatUtils.formatPercentage('invalid')).toBe('0%');
    });
  });

  describe('formatCurrency', () => {
    it('formats currency', () => {
      expect(ChartFormatUtils.formatCurrency(1000)).toBe('$1,000');
      expect(ChartFormatUtils.formatCurrency(1234.56)).toBe('$1,234.56');
    });

    it('handles invalid currency', () => {
      expect(ChartFormatUtils.formatCurrency('invalid')).toBe('$0');
    });
  });

  describe('formatDate', () => {
    it('formats date objects', () => {
      const date = new Date('2023-01-15');
      expect(ChartFormatUtils.formatDate(date)).toBe('Jan 15');
    });

    it('formats date strings', () => {
      expect(ChartFormatUtils.formatDate('2023-01-15')).toBe('Jan 15');
    });

    it('handles invalid dates', () => {
      expect(ChartFormatUtils.formatDate('invalid')).toBe('invalid');
    });
  });

  describe('formatDuration', () => {
    it('formats durations', () => {
      expect(ChartFormatUtils.formatDuration(30)).toBe('30m');
      expect(ChartFormatUtils.formatDuration(60)).toBe('1h');
      expect(ChartFormatUtils.formatDuration(90)).toBe('1h 30m');
    });
  });
});

describe('ChartDataUtils', () => {
  describe('transformAnalyticsData', () => {
    it('transforms analytics data', () => {
      const data = [
        { date: '2023-01-01', value: 100, category: 'A', metadata: { extra: 'info' } }
      ];
      
      const result = ChartDataUtils.transformAnalyticsData(data);
      
      expect(result[0].date).toBe('Jan 01');
      expect(result[0].value).toBe(100);
      expect(result[0].category).toBe('A');
      expect(result[0].extra).toBe('info');
    });
  });

  describe('aggregateByPeriod', () => {
    const mockData = [
      { date: '2023-01-01', value: 100 },
      { date: '2023-01-02', value: 150 },
      { date: '2023-01-03', value: 200 }
    ];

    it('aggregates by day', () => {
      const result = ChartDataUtils.aggregateByPeriod(mockData, 'date', 'value', 'day');
      
      expect(result).toHaveLength(3);
      expect(result[0].value).toBe(100);
      expect(result[1].value).toBe(150);
      expect(result[2].value).toBe(200);
    });

    it('aggregates by month', () => {
      const result = ChartDataUtils.aggregateByPeriod(mockData, 'date', 'value', 'month');
      
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(450); // Sum of all values
    });
  });

  describe('calculateMovingAverage', () => {
    const mockData = [
      { date: '2023-01-01', value: 100 },
      { date: '2023-01-02', value: 200 },
      { date: '2023-01-03', value: 300 }
    ];

    it('calculates moving average', () => {
      const result = ChartDataUtils.calculateMovingAverage(mockData, 'value', 2);
      
      expect(result[0].value_ma).toBe(100);
      expect(result[1].value_ma).toBe(150); // (100 + 200) / 2
      expect(result[2].value_ma).toBe(250); // (200 + 300) / 2
    });
  });

  describe('calculateStats', () => {
    const mockData = [
      { value: 100 },
      { value: 200 },
      { value: 300 },
      { value: 400 }
    ];

    it('calculates statistics', () => {
      const stats = ChartDataUtils.calculateStats(mockData, 'value');
      
      expect(stats.min).toBe(100);
      expect(stats.max).toBe(400);
      expect(stats.mean).toBe(250);
      expect(stats.median).toBe(250);
      expect(stats.sum).toBe(1000);
      expect(stats.count).toBe(4);
    });
  });

  describe('sortData', () => {
    const mockData = [
      { name: 'C', value: 100 },
      { name: 'A', value: 300 },
      { name: 'B', value: 200 }
    ];

    it('sorts data ascending', () => {
      const result = ChartDataUtils.sortData(mockData, 'value', 'asc');
      
      expect(result[0].value).toBe(100);
      expect(result[1].value).toBe(200);
      expect(result[2].value).toBe(300);
    });

    it('sorts data descending', () => {
      const result = ChartDataUtils.sortData(mockData, 'value', 'desc');
      
      expect(result[0].value).toBe(300);
      expect(result[1].value).toBe(200);
      expect(result[2].value).toBe(100);
    });
  });
});

describe('ChartExportUtils', () => {
  describe('exportAsCSV', () => {
    const mockData = [
      { name: 'A', value: 100 },
      { name: 'B', value: 200 }
    ];

    // Mock URL.createObjectURL and document.createElement
    const mockCreateObjectURL = jest.fn(() => 'blob:url');
    const mockClick = jest.fn();
    const mockAppendChild = jest.fn();
    const mockRemoveChild = jest.fn();

    beforeEach(() => {
      Object.defineProperty(global, 'URL', {
        value: { createObjectURL: mockCreateObjectURL },
        writable: true
      });

      Object.defineProperty(document, 'createElement', {
        value: jest.fn(() => ({
          click: mockClick,
          download: '',
          href: ''
        })),
        writable: true
      });

      Object.defineProperty(document.body, 'appendChild', {
        value: mockAppendChild,
        writable: true
      });

      Object.defineProperty(document.body, 'removeChild', {
        value: mockRemoveChild,
        writable: true
      });
    });

    it('exports data as CSV', () => {
      ChartExportUtils.exportAsCSV(mockData);
      
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
    });
  });

  describe('exportAsJSON', () => {
    const mockData = [
      { name: 'A', value: 100 },
      { name: 'B', value: 200 }
    ];

    it('exports data as JSON', () => {
      const mockCreateObjectURL = jest.fn(() => 'blob:url');
      const mockClick = jest.fn();

      Object.defineProperty(global, 'URL', {
        value: { createObjectURL: mockCreateObjectURL },
        writable: true
      });

      Object.defineProperty(document, 'createElement', {
        value: jest.fn(() => ({
          click: mockClick,
          download: '',
          href: ''
        })),
        writable: true
      });

      Object.defineProperty(document.body, 'appendChild', {
        value: jest.fn(),
        writable: true
      });

      Object.defineProperty(document.body, 'removeChild', {
        value: jest.fn(),
        writable: true
      });

      ChartExportUtils.exportAsJSON(mockData);
      
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
    });
  });
});

describe('ChartAccessibilityUtils', () => {
  describe('generateDescription', () => {
    it('generates chart description', () => {
      const mockData = [
        { name: 'A', value: 100 },
        { name: 'B', value: 200 }
      ];

      const description = ChartAccessibilityUtils.generateDescription(mockData, 'line');
      
      expect(description).toContain('line chart');
      expect(description).toContain('2 data points');
    });
  });

  describe('generateSummaryTable', () => {
    it('generates summary table', () => {
      const mockData = [
        { name: 'A', value: 100 },
        { name: 'B', value: 200 }
      ];

      const table = ChartAccessibilityUtils.generateSummaryTable(mockData);
      
      expect(table).toContain('Chart Data Summary');
      expect(table).toContain('name | value');
      expect(table).toContain('A | 100');
      expect(table).toContain('B | 200');
    });
  });
});