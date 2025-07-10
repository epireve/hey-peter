"use client";

import React, { useCallback, useState, useMemo } from 'react';
import { 
  LineChart as RechartsLineChart, 
  Line, 
  XAxis, 
  YAxis, 
  ReferenceLine,
  ReferenceArea,
  Brush,
  ResponsiveContainer
} from 'recharts';
import { BaseChart, withChartErrorBoundary } from './BaseChart';
import { LineChartProps } from '@/types/charts';
import { ChartConfigUtils, ChartFormatUtils } from '@/lib/utils/chart-config';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  TrendingUp, 
  Activity,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnhancedLineChartProps extends LineChartProps {
  showDataPoints?: boolean;
  showArea?: boolean;
  showTrendLine?: boolean;
  showBrush?: boolean;
  showZoomControls?: boolean;
  showSeriesToggle?: boolean;
  smoothing?: number;
  referenceLines?: Array<{
    value: number;
    label?: string;
    color?: string;
    strokeDasharray?: string;
  }>;
  referenceAreas?: Array<{
    x1: any;
    x2: any;
    y1?: number;
    y2?: number;
    fill?: string;
    label?: string;
  }>;
  annotations?: Array<{
    x: any;
    y: number;
    text: string;
    color?: string;
  }>;
  onBrushChange?: (domain: [number, number] | null) => void;
  onZoom?: (domain: [number, number] | null) => void;
  syncId?: string;
}

const LineChartComponent: React.FC<EnhancedLineChartProps> = ({
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
  connectNulls = false,
  strokeWidth = 2,
  dot = false,
  activeDot = true,
  type = 'monotone',
  showDataPoints = false,
  showArea = false,
  showTrendLine = false,
  showBrush = false,
  showZoomControls = false,
  showSeriesToggle = false,
  smoothing = 0,
  referenceLines = [],
  referenceAreas = [],
  annotations = [],
  onBrushChange,
  onZoom,
  syncId,
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

  // Calculate trend line data
  const trendLineData = useMemo(() => {
    if (!showTrendLine || !data || data.length < 2) return null;

    const firstSeries = visibleSeries[0];
    if (!firstSeries) return null;

    const points = data.map((item, index) => ({
      x: index,
      y: item[firstSeries.key]
    })).filter(point => typeof point.y === 'number');

    if (points.length < 2) return null;

    // Simple linear regression
    const n = points.length;
    const sumX = points.reduce((sum, point) => sum + point.x, 0);
    const sumY = points.reduce((sum, point) => sum + point.y, 0);
    const sumXY = points.reduce((sum, point) => sum + point.x * point.y, 0);
    const sumXX = points.reduce((sum, point) => sum + point.x * point.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return data.map((item, index) => ({
      ...item,
      trendLine: slope * index + intercept
    }));
  }, [showTrendLine, data, visibleSeries]);

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

  // Handle line hover
  const handleLineHover = useCallback((seriesKey: string, isHovered: boolean) => {
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
      {showTrendLine && (
        <Badge variant="secondary" className="text-xs">
          <TrendingUp className="h-3 w-3 mr-1" />
          Trend
        </Badge>
      )}
      {showDataPoints && (
        <Badge variant="secondary" className="text-xs">
          <Activity className="h-3 w-3 mr-1" />
          Points
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

  // Calculate insights
  const insights = useMemo(() => {
    if (!data || data.length === 0) return [];

    const insights: string[] = [];
    const firstSeries = visibleSeries[0];
    
    if (firstSeries) {
      const values = data.map(item => item[firstSeries.key]).filter(val => typeof val === 'number');
      if (values.length > 1) {
        const trend = values[values.length - 1] - values[0];
        const trendPercent = ((trend / values[0]) * 100).toFixed(1);
        insights.push(`${firstSeries.name || firstSeries.key} ${trend > 0 ? 'increased' : 'decreased'} by ${trendPercent}% over the period`);
      }
    }

    if (showTrendLine && trendLineData) {
      insights.push('Trend line shows the overall direction of the data');
    }

    return insights;
  }, [data, visibleSeries, showTrendLine, trendLineData]);

  const chartData = trendLineData || data;

  return (
    <BaseChart
      {...baseProps}
      data={chartData}
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
      chartType="line"
      customActions={customActions}
      insights={insights}
      onDataPointClick={onDataPointClick}
      onDataPointHover={onDataPointHover}
    >
      <RechartsLineChart
        data={chartData}
        syncId={syncId}
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
          type={yAxis?.type || 'number'}
          domain={yAxis?.domain}
          tickFormatter={yAxis?.tickFormatter}
          hide={yAxis?.hide}
          orientation={yAxis?.orientation || 'left'}
        />

        {/* Reference Areas */}
        {referenceAreas.map((area, index) => (
          <ReferenceArea
            key={index}
            x1={area.x1}
            x2={area.x2}
            y1={area.y1}
            y2={area.y2}
            fill={area.fill || 'rgba(255, 255, 255, 0.1)'}
            fillOpacity={0.3}
          />
        ))}

        {/* Reference Lines */}
        {referenceLines.map((line, index) => (
          <ReferenceLine
            key={index}
            y={line.value}
            stroke={line.color || '#8884d8'}
            strokeDasharray={line.strokeDasharray || '5 5'}
            label={line.label}
          />
        ))}

        {/* Data Lines */}
        {visibleSeries.map((series, index) => {
          const isHovered = hoveredSeries === series.key;
          const isOtherHovered = hoveredSeries && hoveredSeries !== series.key;

          return (
            <Line
              key={series.key}
              dataKey={series.key}
              name={series.name || series.key}
              type={type}
              stroke={series.color || config?.colors?.[index] || '#8884d8'}
              strokeWidth={isHovered ? strokeWidth + 1 : strokeWidth}
              strokeOpacity={isOtherHovered ? 0.3 : 1}
              dot={showDataPoints || dot}
              activeDot={activeDot}
              connectNulls={connectNulls}
              onMouseEnter={() => handleLineHover(series.key, true)}
              onMouseLeave={() => handleLineHover(series.key, false)}
              onClick={(data, index) => onDataPointClick?.(data, index)}
            />
          );
        })}

        {/* Trend Line */}
        {showTrendLine && trendLineData && (
          <Line
            dataKey="trendLine"
            name="Trend"
            type="linear"
            stroke="#ff7300"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            activeDot={false}
            connectNulls
          />
        )}

        {/* Brush for zooming */}
        {showBrush && (
          <Brush
            dataKey={xAxis?.dataKey || 'name'}
            height={30}
            stroke="#8884d8"
            onChange={handleBrushChange}
          />
        )}
      </RechartsLineChart>

      {/* Series Toggle */}
      {seriesToggle}
    </BaseChart>
  );
};

// Enhanced LineChart with multiple interaction modes
export const InteractiveLineChart: React.FC<EnhancedLineChartProps & {
  interactionMode?: 'hover' | 'click' | 'both';
  crosshair?: boolean;
  highlightOnHover?: boolean;
}> = ({
  interactionMode = 'hover',
  crosshair = false,
  highlightOnHover = true,
  ...props
}) => {
  const [activePoint, setActivePoint] = useState<any>(null);

  const handleMouseMove = useCallback((state: any) => {
    if (interactionMode === 'hover' || interactionMode === 'both') {
      setActivePoint(state.activePayload?.[0]);
    }
  }, [interactionMode]);

  const handleClick = useCallback((state: any) => {
    if (interactionMode === 'click' || interactionMode === 'both') {
      setActivePoint(state.activePayload?.[0]);
      props.onDataPointClick?.(state.activePayload?.[0]?.payload, state.activeTooltipIndex);
    }
  }, [interactionMode, props]);

  return (
    <LineChartComponent
      {...props}
      onDataPointClick={handleClick}
      onDataPointHover={handleMouseMove}
      activeDot={highlightOnHover ? { r: 6, stroke: '#8884d8', strokeWidth: 2 } : props.activeDot}
    />
  );
};

// Multi-axis LineChart for different scales
export const MultiAxisLineChart: React.FC<EnhancedLineChartProps & {
  leftAxisSeries?: string[];
  rightAxisSeries?: string[];
  leftAxisLabel?: string;
  rightAxisLabel?: string;
}> = ({
  leftAxisSeries = [],
  rightAxisSeries = [],
  leftAxisLabel,
  rightAxisLabel,
  ...props
}) => {
  const chartSeries = props.series || ChartConfigUtils.autoGenerateSeries(props.data);
  
  const leftSeries = chartSeries.filter(s => leftAxisSeries.includes(s.key));
  const rightSeries = chartSeries.filter(s => rightAxisSeries.includes(s.key));

  return (
    <BaseChart
      {...props}
      chartType="multi-axis-line"
    >
      <RechartsLineChart
        data={props.data}
        margin={props.config?.margin}
      >
        <XAxis
          dataKey={props.xAxis?.dataKey || 'name'}
          type={props.xAxis?.type || 'category'}
        />
        <YAxis
          yAxisId="left"
          orientation="left"
          label={{ value: leftAxisLabel, angle: -90, position: 'insideLeft' }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          label={{ value: rightAxisLabel, angle: 90, position: 'insideRight' }}
        />

        {leftSeries.map((series, index) => (
          <Line
            key={series.key}
            yAxisId="left"
            dataKey={series.key}
            name={series.name || series.key}
            type={props.type}
            stroke={series.color || props.config?.colors?.[index] || '#8884d8'}
            strokeWidth={props.strokeWidth}
            dot={props.dot}
            activeDot={props.activeDot}
            connectNulls={props.connectNulls}
          />
        ))}

        {rightSeries.map((series, index) => (
          <Line
            key={series.key}
            yAxisId="right"
            dataKey={series.key}
            name={series.name || series.key}
            type={props.type}
            stroke={series.color || props.config?.colors?.[index + leftSeries.length] || '#82ca9d'}
            strokeWidth={props.strokeWidth}
            dot={props.dot}
            activeDot={props.activeDot}
            connectNulls={props.connectNulls}
          />
        ))}
      </RechartsLineChart>
    </BaseChart>
  );
};

export const LineChart = withChartErrorBoundary(LineChartComponent);
export default LineChart;