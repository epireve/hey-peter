"use client";

import React, { useCallback, useState, useMemo } from 'react';
import { 
  ComposedChart as RechartsComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  ReferenceLine,
  Brush,
  ResponsiveContainer
} from 'recharts';
import { BaseChart, withChartErrorBoundary } from './BaseChart';
import { ComposedChartProps } from '@/types/charts';
import { ChartConfigUtils } from '@/lib/utils/chart-config';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  BarChart3, 
  TrendingUp, 
  Layers,
  Eye,
  EyeOff,
  RotateCcw,
  ZoomIn
} from 'lucide-react';

interface EnhancedComposedChartProps extends ComposedChartProps {
  lineConfig?: {
    series: string[];
    strokeWidth?: number;
    dot?: boolean;
    activeDot?: boolean;
    type?: 'monotone' | 'linear' | 'step';
  };
  barConfig?: {
    series: string[];
    barSize?: number;
    barGap?: number;
  };
  areaConfig?: {
    series: string[];
    fillOpacity?: number;
    stackId?: string;
  };
  dualAxis?: boolean;
  leftAxisSeries?: string[];
  rightAxisSeries?: string[];
  leftAxisLabel?: string;
  rightAxisLabel?: string;
  showSeriesToggle?: boolean;
  showBrush?: boolean;
  showZoomControls?: boolean;
  enableSync?: boolean;
  syncId?: string;
  onBrushChange?: (domain: [number, number] | null) => void;
  onZoom?: (domain: [number, number] | null) => void;
  referenceLines?: Array<{
    value: number;
    label?: string;
    color?: string;
    strokeDasharray?: string;
    axis?: 'left' | 'right';
  }>;
  animations?: boolean;
  animationDuration?: number;
}

const ComposedChartComponent: React.FC<EnhancedComposedChartProps> = ({
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
  children,
  syncId,
  lineConfig,
  barConfig,
  areaConfig,
  dualAxis = false,
  leftAxisSeries = [],
  rightAxisSeries = [],
  leftAxisLabel,
  rightAxisLabel,
  showSeriesToggle = false,
  showBrush = false,
  showZoomControls = false,
  enableSync = false,
  onBrushChange,
  onZoom,
  referenceLines = [],
  animations = true,
  animationDuration = 1000,
  ...baseProps
}) => {
  const [zoomDomain, setZoomDomain] = useState<[number, number] | null>(null);
  const [brushDomain, setBrushDomain] = useState<[number, number] | null>(null);
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
  const [hoveredSeries, setHoveredSeries] = useState<string | null>(null);

  // Auto-generate series if not provided
  const chartSeries = useMemo(() => {
    if (series) return series;
    return ChartConfigUtils.autoGenerateSeries(data, [xAxis?.dataKey || 'name']);
  }, [series, data, xAxis]);

  // Filter visible series
  const visibleSeries = chartSeries.filter(s => !hiddenSeries.has(s.key));

  // Categorize series by chart type
  const categorizedSeries = useMemo(() => {
    const lines = lineConfig?.series || [];
    const bars = barConfig?.series || [];
    const areas = areaConfig?.series || [];
    
    return {
      lines: visibleSeries.filter(s => lines.includes(s.key)),
      bars: visibleSeries.filter(s => bars.includes(s.key)),
      areas: visibleSeries.filter(s => areas.includes(s.key)),
      other: visibleSeries.filter(s => 
        !lines.includes(s.key) && 
        !bars.includes(s.key) && 
        !areas.includes(s.key)
      )
    };
  }, [visibleSeries, lineConfig, barConfig, areaConfig]);

  // Determine axis assignment
  const axisAssignment = useMemo(() => {
    if (!dualAxis) {
      return {
        left: visibleSeries.map(s => s.key),
        right: []
      };
    }

    return {
      left: visibleSeries.filter(s => leftAxisSeries.includes(s.key)).map(s => s.key),
      right: visibleSeries.filter(s => rightAxisSeries.includes(s.key)).map(s => s.key)
    };
  }, [dualAxis, visibleSeries, leftAxisSeries, rightAxisSeries]);

  // Handle brush change
  const handleBrushChange = useCallback((domain: any) => {
    if (domain && domain.startIndex !== domain.endIndex) {
      const newDomain: [number, number] = [domain.startIndex, domain.endIndex];
      setBrushDomain(newDomain);
      onBrushChange?.(newDomain);
    } else {
      setBrushDomain(null);
      onBrushChange?.(null);
    }
  }, [onBrushChange]);

  // Handle zoom
  const handleZoom = useCallback((domain: [number, number] | null) => {
    setZoomDomain(domain);
    onZoom?.(domain);
  }, [onZoom]);

  // Reset zoom and brush
  const resetView = useCallback(() => {
    setZoomDomain(null);
    setBrushDomain(null);
    onBrushChange?.(null);
    onZoom?.(null);
  }, [onBrushChange, onZoom]);

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

  // Handle series interactions
  const handleSeriesHover = useCallback((seriesKey: string, isHovered: boolean) => {
    setHoveredSeries(isHovered ? seriesKey : null);
  }, []);

  // Custom actions
  const customActions = (
    <div className="flex items-center gap-2">
      {showZoomControls && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleZoom(brushDomain)}
            disabled={!brushDomain}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={resetView}
            disabled={!zoomDomain && !brushDomain}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </>
      )}
      
      {categorizedSeries.lines.length > 0 && (
        <Badge variant="secondary" className="text-xs">
          <TrendingUp className="h-3 w-3 mr-1" />
          {categorizedSeries.lines.length} Lines
        </Badge>
      )}
      
      {categorizedSeries.bars.length > 0 && (
        <Badge variant="secondary" className="text-xs">
          <BarChart3 className="h-3 w-3 mr-1" />
          {categorizedSeries.bars.length} Bars
        </Badge>
      )}
      
      {categorizedSeries.areas.length > 0 && (
        <Badge variant="secondary" className="text-xs">
          <Layers className="h-3 w-3 mr-1" />
          {categorizedSeries.areas.length} Areas
        </Badge>
      )}
      
      {dualAxis && (
        <Badge variant="secondary" className="text-xs">
          <Activity className="h-3 w-3 mr-1" />
          Dual Axis
        </Badge>
      )}
    </div>
  );

  // Series toggle controls
  const seriesToggle = showSeriesToggle ? (
    <div className="space-y-2 mt-4">
      {Object.entries(categorizedSeries).map(([type, seriesList]) => 
        seriesList.length > 0 && (
          <div key={type} className="flex flex-wrap gap-2">
            <span className="text-xs font-medium text-muted-foreground capitalize px-2 py-1">
              {type}:
            </span>
            {seriesList.map(series => (
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
        )
      )}
    </div>
  ) : null;

  // Calculate insights
  const insights = useMemo(() => {
    const insights: string[] = [];
    
    if (categorizedSeries.lines.length > 0) {
      insights.push(`${categorizedSeries.lines.length} line series showing trends`);
    }
    
    if (categorizedSeries.bars.length > 0) {
      insights.push(`${categorizedSeries.bars.length} bar series showing values`);
    }
    
    if (categorizedSeries.areas.length > 0) {
      insights.push(`${categorizedSeries.areas.length} area series showing distributions`);
    }
    
    if (dualAxis) {
      insights.push(`Left axis: ${axisAssignment.left.length} series, Right axis: ${axisAssignment.right.length} series`);
    }
    
    if (hiddenSeries.size > 0) {
      insights.push(`${hiddenSeries.size} series hidden`);
    }

    return insights;
  }, [categorizedSeries, dualAxis, axisAssignment, hiddenSeries]);

  return (
    <BaseChart
      {...baseProps}
      data={data}
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
      chartType="composed"
      customActions={customActions}
      insights={insights}
      onDataPointClick={onDataPointClick}
      onDataPointHover={onDataPointHover}
    >
      <RechartsComposedChart
        data={data}
        syncId={enableSync ? syncId : undefined}
        margin={config?.margin}
      >
        <XAxis
          dataKey={xAxis?.dataKey || 'name'}
          type={xAxis?.type || 'category'}
          domain={zoomDomain || xAxis?.domain}
          tickFormatter={xAxis?.tickFormatter}
          hide={xAxis?.hide}
        />
        
        <YAxis
          yAxisId="left"
          orientation="left"
          domain={yAxis?.domain}
          tickFormatter={yAxis?.tickFormatter}
          hide={yAxis?.hide && !dualAxis}
          label={leftAxisLabel ? { value: leftAxisLabel, angle: -90, position: 'insideLeft' } : undefined}
        />
        
        {dualAxis && (
          <YAxis
            yAxisId="right"
            orientation="right"
            label={rightAxisLabel ? { value: rightAxisLabel, angle: 90, position: 'insideRight' } : undefined}
          />
        )}

        {/* Reference Lines */}
        {referenceLines.map((line, index) => (
          <ReferenceLine
            key={index}
            yAxisId={line.axis === 'right' ? 'right' : 'left'}
            y={line.value}
            stroke={line.color || '#8884d8'}
            strokeDasharray={line.strokeDasharray || '5 5'}
            label={line.label}
          />
        ))}

        {/* Areas */}
        {categorizedSeries.areas.map((series, index) => {
          const isHovered = hoveredSeries === series.key;
          const isOtherHovered = hoveredSeries && hoveredSeries !== series.key;
          const yAxisId = axisAssignment.right.includes(series.key) ? 'right' : 'left';

          return (
            <Area
              key={series.key}
              yAxisId={yAxisId}
              dataKey={series.key}
              name={series.name || series.key}
              type="monotone"
              stackId={areaConfig?.stackId}
              stroke={series.color || config?.colors?.[index] || '#8884d8'}
              strokeOpacity={isOtherHovered ? 0.3 : 1}
              fill={series.color || config?.colors?.[index] || '#8884d8'}
              fillOpacity={isHovered ? (areaConfig?.fillOpacity || 0.6) + 0.2 : (areaConfig?.fillOpacity || 0.6)}
              animationDuration={animations ? animationDuration : 0}
              onMouseEnter={() => handleSeriesHover(series.key, true)}
              onMouseLeave={() => handleSeriesHover(series.key, false)}
            />
          );
        })}

        {/* Bars */}
        {categorizedSeries.bars.map((series, index) => {
          const isHovered = hoveredSeries === series.key;
          const isOtherHovered = hoveredSeries && hoveredSeries !== series.key;
          const yAxisId = axisAssignment.right.includes(series.key) ? 'right' : 'left';

          return (
            <Bar
              key={series.key}
              yAxisId={yAxisId}
              dataKey={series.key}
              name={series.name || series.key}
              fill={series.color || config?.colors?.[index] || '#8884d8'}
              fillOpacity={isOtherHovered ? 0.3 : 1}
              barSize={barConfig?.barSize}
              animationDuration={animations ? animationDuration : 0}
              onMouseEnter={() => handleSeriesHover(series.key, true)}
              onMouseLeave={() => handleSeriesHover(series.key, false)}
            />
          );
        })}

        {/* Lines */}
        {categorizedSeries.lines.map((series, index) => {
          const isHovered = hoveredSeries === series.key;
          const isOtherHovered = hoveredSeries && hoveredSeries !== series.key;
          const yAxisId = axisAssignment.right.includes(series.key) ? 'right' : 'left';

          return (
            <Line
              key={series.key}
              yAxisId={yAxisId}
              dataKey={series.key}
              name={series.name || series.key}
              type={lineConfig?.type || 'monotone'}
              stroke={series.color || config?.colors?.[index] || '#8884d8'}
              strokeWidth={isHovered ? (lineConfig?.strokeWidth || 2) + 1 : (lineConfig?.strokeWidth || 2)}
              strokeOpacity={isOtherHovered ? 0.3 : 1}
              dot={lineConfig?.dot || false}
              activeDot={lineConfig?.activeDot || true}
              animationDuration={animations ? animationDuration : 0}
              onMouseEnter={() => handleSeriesHover(series.key, true)}
              onMouseLeave={() => handleSeriesHover(series.key, false)}
            />
          );
        })}

        {/* Custom children */}
        {children}

        {/* Brush for zooming */}
        {showBrush && (
          <Brush
            dataKey={xAxis?.dataKey || 'name'}
            height={30}
            stroke="#8884d8"
            onChange={handleBrushChange}
          />
        )}
      </RechartsComposedChart>

      {/* Series Toggle */}
      {seriesToggle}
    </BaseChart>
  );
};

// Financial Chart variant (candlestick-like)
export const FinancialChart: React.FC<EnhancedComposedChartProps & {
  priceData: string[];
  volumeData: string[];
  showMovingAverage?: boolean;
  movingAveragePeriod?: number;
}> = ({
  priceData,
  volumeData,
  showMovingAverage = false,
  movingAveragePeriod = 20,
  ...props
}) => {
  const lineConfig = {
    series: priceData,
    strokeWidth: 2,
    dot: false,
    activeDot: true,
    type: 'monotone' as const
  };

  const barConfig = {
    series: volumeData,
    barSize: 20
  };

  return (
    <ComposedChartComponent
      {...props}
      dualAxis={true}
      leftAxisSeries={priceData}
      rightAxisSeries={volumeData}
      leftAxisLabel="Price"
      rightAxisLabel="Volume"
      lineConfig={lineConfig}
      barConfig={barConfig}
    />
  );
};

// Performance Dashboard variant
export const PerformanceDashboardChart: React.FC<EnhancedComposedChartProps & {
  targets: string[];
  actuals: string[];
  trends: string[];
}> = ({
  targets,
  actuals,
  trends,
  ...props
}) => {
  const barConfig = {
    series: [...targets, ...actuals],
    barSize: 30
  };

  const lineConfig = {
    series: trends,
    strokeWidth: 3,
    dot: true,
    activeDot: true,
    type: 'monotone' as const
  };

  return (
    <ComposedChartComponent
      {...props}
      barConfig={barConfig}
      lineConfig={lineConfig}
      showSeriesToggle={true}
    />
  );
};

export const ComposedChart = withChartErrorBoundary(ComposedChartComponent);
export default ComposedChart;