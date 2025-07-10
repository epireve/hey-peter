"use client";

import React, { useCallback, useState, useMemo } from 'react';
import { 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  ReferenceLine,
  Cell,
  LabelList,
  ResponsiveContainer
} from 'recharts';
import { BaseChart, withChartErrorBoundary } from './BaseChart';
import { BarChartProps } from '@/types/charts';
import { ChartConfigUtils, ChartFormatUtils } from '@/lib/utils/chart-config';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  BarChart4, 
  SortAsc, 
  SortDesc, 
  Filter,
  Eye,
  EyeOff,
  Palette
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnhancedBarChartProps extends BarChartProps {
  showLabels?: boolean;
  showValues?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  colorMode?: 'single' | 'series' | 'gradient' | 'conditional';
  conditionalColors?: Array<{
    condition: (value: any) => boolean;
    color: string;
  }>;
  gradientColors?: [string, string];
  stackOffset?: 'none' | 'expand' | 'diverging';
  showSeriesToggle?: boolean;
  showPatterns?: boolean;
  patternFills?: string[];
  onBarClick?: (data: any, index: number) => void;
  onBarHover?: (data: any, index: number) => void;
  customBarRadius?: number;
  showDataLabels?: boolean;
  dataLabelPosition?: 'top' | 'middle' | 'bottom' | 'insideTop' | 'insideBottom';
  animationDuration?: number;
  maxBarSize?: number;
  minBarSize?: number;
  categoryGap?: number;
  barGap?: number;
  responsive?: {
    mobile?: Partial<BarChartProps>;
    tablet?: Partial<BarChartProps>;
    desktop?: Partial<BarChartProps>;
  };
}

const BarChartComponent: React.FC<EnhancedBarChartProps> = ({
  data,
  config,
  series,
  xAxis,
  yAxis,
  tooltip,
  legend,
  grid,
  className,
  title,
  subtitle,
  loading,
  error,
  exportable,
  onDataPointClick,
  onDataPointHover,
  layout = 'vertical',
  barSize,
  barGap,
  barCategoryGap,
  showLabels = false,
  showValues = false,
  sortable = false,
  filterable = false,
  colorMode = 'series',
  conditionalColors = [],
  gradientColors,
  stackOffset = 'none',
  showSeriesToggle = false,
  showPatterns = false,
  patternFills = [],
  onBarClick,
  onBarHover,
  customBarRadius = 0,
  showDataLabels = false,
  dataLabelPosition = 'top',
  animationDuration = 1000,
  maxBarSize,
  minBarSize,
  categoryGap,
  responsive,
  ...baseProps
}) => {
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);
  const [sortBy, setSortBy] = useState<string>('');
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);
  const [filterValue, setFilterValue] = useState<string>('');

  // Auto-generate series if not provided
  const chartSeries = useMemo(() => {
    if (series) return series;
    return ChartConfigUtils.autoGenerateSeries(data, [xAxis?.dataKey || 'name']);
  }, [series, data, xAxis]);

  // Filter visible series
  const visibleSeries = chartSeries.filter(s => !hiddenSeries.has(s.key));

  // Process data with sorting and filtering
  const processedData = useMemo(() => {
    let processed = [...data];

    // Apply filtering
    if (filterable && filterValue) {
      processed = processed.filter(item => 
        Object.values(item).some(value => 
          String(value).toLowerCase().includes(filterValue.toLowerCase())
        )
      );
    }

    // Apply sorting
    if (sortable && sortBy && sortOrder) {
      processed.sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        const aStr = String(aVal);
        const bStr = String(bVal);
        return sortOrder === 'asc' 
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr);
      });
    }

    return processed;
  }, [data, sortable, sortBy, sortOrder, filterable, filterValue]);

  // Handle sorting
  const handleSort = useCallback((key: string) => {
    if (sortBy === key) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
  }, [sortBy]);

  // Toggle series visibility
  const toggleSeries = useCallback((seriesKey: string) => {
    setHiddenSeries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(seriesKey)) {
        newSet.delete(seriesKey);
      } else {
        newSet.add(seriesKey);
      }
      return newSet;
    });
  }, []);

  // Get bar color based on color mode
  const getBarColor = useCallback((entry: any, seriesIndex: number, dataIndex: number) => {
    switch (colorMode) {
      case 'single':
        return config?.colors?.[0] || '#8884d8';
      
      case 'series':
        return config?.colors?.[seriesIndex] || '#8884d8';
      
      case 'gradient':
        if (gradientColors) {
          const ratio = dataIndex / (processedData.length - 1);
          // Simple gradient interpolation
          const r1 = parseInt(gradientColors[0].slice(1, 3), 16);
          const g1 = parseInt(gradientColors[0].slice(3, 5), 16);
          const b1 = parseInt(gradientColors[0].slice(5, 7), 16);
          const r2 = parseInt(gradientColors[1].slice(1, 3), 16);
          const g2 = parseInt(gradientColors[1].slice(3, 5), 16);
          const b2 = parseInt(gradientColors[1].slice(5, 7), 16);
          
          const r = Math.round(r1 + (r2 - r1) * ratio);
          const g = Math.round(g1 + (g2 - g1) * ratio);
          const b = Math.round(b1 + (b2 - b1) * ratio);
          
          return `rgb(${r}, ${g}, ${b})`;
        }
        return config?.colors?.[seriesIndex] || '#8884d8';
      
      case 'conditional':
        for (const condition of conditionalColors) {
          if (condition.condition(entry)) {
            return condition.color;
          }
        }
        return config?.colors?.[seriesIndex] || '#8884d8';
      
      default:
        return config?.colors?.[seriesIndex] || '#8884d8';
    }
  }, [colorMode, config, processedData.length, gradientColors, conditionalColors]);

  // Handle bar interactions
  const handleBarClick = useCallback((data: any, index: number) => {
    onBarClick?.(data, index);
    onDataPointClick?.(data, index);
  }, [onBarClick, onDataPointClick]);

  const handleBarHover = useCallback((data: any, index: number) => {
    onBarHover?.(data, index);
    onDataPointHover?.(data, index);
  }, [onBarHover, onDataPointHover]);

  // Custom actions
  const customActions = (
    <div className="flex items-center gap-2">
      {sortable && (
        <div className="flex items-center gap-1">
          {visibleSeries.map(series => (
            <Button
              key={series.key}
              variant="outline"
              size="sm"
              onClick={() => handleSort(series.key)}
              className="text-xs"
            >
              {sortBy === series.key && sortOrder === 'asc' && <SortAsc className="h-3 w-3 mr-1" />}
              {sortBy === series.key && sortOrder === 'desc' && <SortDesc className="h-3 w-3 mr-1" />}
              Sort {series.name || series.key}
            </Button>
          ))}
        </div>
      )}
      
      {layout === 'vertical' ? (
        <Badge variant="secondary" className="text-xs">
          <BarChart3 className="h-3 w-3 mr-1" />
          Vertical
        </Badge>
      ) : (
        <Badge variant="secondary" className="text-xs">
          <BarChart4 className="h-3 w-3 mr-1" />
          Horizontal
        </Badge>
      )}
      
      {colorMode !== 'series' && (
        <Badge variant="secondary" className="text-xs">
          <Palette className="h-3 w-3 mr-1" />
          {colorMode}
        </Badge>
      )}
    </div>
  );

  // Series toggle controls
  const seriesToggle = showSeriesToggle ? (
    <div className="flex flex-wrap gap-2 mt-4">
      {chartSeries.map(series => (
        <Button
          key={series.key}
          variant={hiddenSeries.has(series.key) ? "outline" : "secondary"}
          size="sm"
          onClick={() => toggleSeries(series.key)}
          className="text-xs"
        >
          {hiddenSeries.has(series.key) ? (
            <EyeOff className="h-3 w-3 mr-1" />
          ) : (
            <Eye className="h-3 w-3 mr-1" />
          )}
          {series.name || series.key}
        </Button>
      ))}
    </div>
  ) : null;

  // Filter control
  const filterControl = filterable ? (
    <div className="flex items-center gap-2 mb-4">
      <Filter className="h-4 w-4 text-muted-foreground" />
      <input
        type="text"
        placeholder="Filter data..."
        value={filterValue}
        onChange={(e) => setFilterValue(e.target.value)}
        className="px-3 py-1 border rounded-md text-sm"
      />
    </div>
  ) : null;

  // Calculate insights
  const insights = useMemo(() => {
    if (!processedData || processedData.length === 0) return [];

    const insights: string[] = [];
    const firstSeries = visibleSeries[0];
    
    if (firstSeries) {
      const values = processedData.map(item => item[firstSeries.key]).filter(val => typeof val === 'number');
      if (values.length > 0) {
        const max = Math.max(...values);
        const min = Math.min(...values);
        const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
        
        insights.push(`${firstSeries.name || firstSeries.key}: Max ${ChartFormatUtils.formatNumber(max)}, Min ${ChartFormatUtils.formatNumber(min)}, Avg ${ChartFormatUtils.formatNumber(avg)}`);
      }
    }

    if (sortOrder) {
      insights.push(`Data sorted by ${sortBy} in ${sortOrder}ending order`);
    }

    if (filterValue) {
      insights.push(`Filtered to ${processedData.length} items matching "${filterValue}"`);
    }

    return insights;
  }, [processedData, visibleSeries, sortOrder, sortBy, filterValue]);

  // Custom label component
  const CustomLabel = ({ value, x, y, width, height }: any) => {
    if (!showDataLabels) return null;
    
    const labelY = dataLabelPosition === 'top' ? y - 5 : 
                   dataLabelPosition === 'bottom' ? y + height + 15 :
                   dataLabelPosition === 'middle' ? y + height / 2 :
                   dataLabelPosition === 'insideTop' ? y + 5 :
                   y + height - 5;
    
    return (
      <text
        x={x + width / 2}
        y={labelY}
        textAnchor="middle"
        fill="#666"
        fontSize={12}
        fontWeight="medium"
      >
        {ChartFormatUtils.formatNumber(value)}
      </text>
    );
  };

  return (
    <BaseChart
      {...baseProps}
      data={processedData}
      config={config}
      tooltip={tooltip}
      legend={legend}
      grid={grid}
      className={className}
      title={title}
      subtitle={subtitle}
      loading={loading}
      error={error}
      exportable={exportable}
      chartType="bar"
      customActions={customActions}
      insights={insights}
      onDataPointClick={handleBarClick}
      onDataPointHover={handleBarHover}
    >
      {filterControl}
      
      <RechartsBarChart
        data={processedData}
        layout={layout}
        margin={config?.margin}
        barSize={barSize}
        barGap={barGap}
        barCategoryGap={barCategoryGap || categoryGap}
        maxBarSize={maxBarSize}
      >
        <XAxis
          dataKey={layout === 'vertical' ? xAxis?.dataKey || 'name' : undefined}
          type={layout === 'vertical' ? 'category' : 'number'}
          domain={layout === 'horizontal' ? xAxis?.domain : undefined}
          tickFormatter={xAxis?.tickFormatter}
          hide={xAxis?.hide}
        />
        <YAxis
          dataKey={layout === 'horizontal' ? yAxis?.dataKey || 'name' : undefined}
          type={layout === 'vertical' ? 'number' : 'category'}
          domain={layout === 'vertical' ? yAxis?.domain : undefined}
          tickFormatter={yAxis?.tickFormatter}
          hide={yAxis?.hide}
          orientation={yAxis?.orientation || 'left'}
        />

        {/* Data Bars */}
        {visibleSeries.map((series, seriesIndex) => (
          <Bar
            key={series.key}
            dataKey={series.key}
            name={series.name || series.key}
            fill={series.color || config?.colors?.[seriesIndex] || '#8884d8'}
            radius={customBarRadius}
            stackId={series.stack}
            onClick={handleBarClick}
            onMouseEnter={(data, index) => {
              setHoveredBar(series.key);
              handleBarHover(data, index);
            }}
            onMouseLeave={() => setHoveredBar(null)}
          >
            {/* Conditional colors or patterns */}
            {colorMode === 'conditional' && processedData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getBarColor(entry, seriesIndex, index)}
              />
            ))}
            
            {colorMode === 'gradient' && processedData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getBarColor(entry, seriesIndex, index)}
              />
            ))}

            {/* Data labels */}
            {showDataLabels && (
              <LabelList
                content={CustomLabel}
                position={dataLabelPosition}
              />
            )}
          </Bar>
        ))}
      </RechartsBarChart>

      {/* Series Toggle */}
      {seriesToggle}
    </BaseChart>
  );
};

// Stacked BarChart variant
export const StackedBarChart: React.FC<EnhancedBarChartProps & {
  stackMode?: 'normal' | 'percent';
  showStackLabels?: boolean;
}> = ({
  stackMode = 'normal',
  showStackLabels = false,
  ...props
}) => {
  const stackedSeries = props.series?.map(series => ({
    ...series,
    stack: 'stack1'
  }));

  return (
    <BarChartComponent
      {...props}
      series={stackedSeries}
      stackOffset={stackMode === 'percent' ? 'expand' : 'none'}
      showDataLabels={showStackLabels}
    />
  );
};

// Grouped BarChart variant
export const GroupedBarChart: React.FC<EnhancedBarChartProps & {
  groupGap?: number;
  showGroupLabels?: boolean;
}> = ({
  groupGap = 10,
  showGroupLabels = false,
  ...props
}) => {
  return (
    <BarChartComponent
      {...props}
      barCategoryGap={groupGap}
      showDataLabels={showGroupLabels}
    />
  );
};

// Horizontal BarChart variant
export const HorizontalBarChart: React.FC<EnhancedBarChartProps> = (props) => {
  return (
    <BarChartComponent
      {...props}
      layout="horizontal"
    />
  );
};

export const BarChart = withChartErrorBoundary(BarChartComponent);
export default BarChart;