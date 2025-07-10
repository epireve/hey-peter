"use client";

import React, { useCallback, useState, useMemo } from 'react';
import { 
  ScatterChart as RechartsScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  ZAxis,
  ReferenceLine,
  ReferenceArea,
  Cell,
  ResponsiveContainer
} from 'recharts';
import { BaseChart, withChartErrorBoundary } from './BaseChart';
import { ScatterChartProps } from '@/types/charts';
import { ChartConfigUtils, ChartFormatUtils } from '@/lib/utils/chart-config';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Scatter as ScatterIcon, 
  Target, 
  TrendingUp,
  Eye,
  EyeOff,
  Filter,
  Zap
} from 'lucide-react';

interface EnhancedScatterChartProps extends ScatterChartProps {
  showTrendLine?: boolean;
  trendLineColor?: string;
  enableBrushing?: boolean;
  enableZooming?: boolean;
  showCorrelation?: boolean;
  correlationLine?: boolean;
  pointSize?: number;
  pointOpacity?: number;
  showPointLabels?: boolean;
  pointLabelKey?: string;
  colorByValue?: boolean;
  colorKey?: string;
  colorScale?: string[];
  sizeByValue?: boolean;
  sizeKey?: string;
  sizeRange?: [number, number];
  showQuadrants?: boolean;
  quadrantLines?: {
    x?: number;
    y?: number;
    labels?: string[];
  };
  showGrid?: boolean;
  gridOpacity?: number;
  enableHover?: boolean;
  hoverEffect?: 'highlight' | 'expand' | 'glow';
  showSeriesToggle?: boolean;
  clustered?: boolean;
  clusterColors?: string[];
  outlierDetection?: boolean;
  outlierColor?: string;
  showConfidenceInterval?: boolean;
  confidenceLevel?: number;
  onPointClick?: (data: any, index: number) => void;
  onPointHover?: (data: any, index: number) => void;
  onBrushEnd?: (domain: any) => void;
  customTooltip?: boolean;
  tooltipContent?: (data: any) => React.ReactNode;
  animations?: boolean;
  animationDuration?: number;
}

const ScatterChartComponent: React.FC<EnhancedScatterChartProps> = ({
  data,
  config,
  series,
  xAxis,
  yAxis,
  xAxisKey,
  yAxisKey,
  zAxisKey,
  shape = 'circle',
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
  showTrendLine = false,
  trendLineColor = '#ff7300',
  enableBrushing = false,
  enableZooming = false,
  showCorrelation = false,
  correlationLine = false,
  pointSize = 4,
  pointOpacity = 0.8,
  showPointLabels = false,
  pointLabelKey,
  colorByValue = false,
  colorKey,
  colorScale = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#ff0000'],
  sizeByValue = false,
  sizeKey,
  sizeRange = [20, 400],
  showQuadrants = false,
  quadrantLines,
  showGrid = true,
  gridOpacity = 0.3,
  enableHover = true,
  hoverEffect = 'expand',
  showSeriesToggle = false,
  clustered = false,
  clusterColors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300'],
  outlierDetection = false,
  outlierColor = '#ff0000',
  showConfidenceInterval = false,
  confidenceLevel = 0.95,
  onPointClick,
  onPointHover,
  onBrushEnd,
  customTooltip = false,
  tooltipContent,
  animations = true,
  animationDuration = 1000,
  ...baseProps
}) => {
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
  const [hoveredPoint, setHoveredPoint] = useState<any>(null);
  const [selectedPoints, setSelectedPoints] = useState<Set<number>>(new Set());
  const [brushDomain, setBrushDomain] = useState<any>(null);
  const [zoomDomain, setZoomDomain] = useState<any>(null);

  // Auto-generate series if not provided
  const chartSeries = useMemo(() => {
    if (series) return series;
    return [{ key: 'default', name: 'Data Points', color: '#8884d8' }];
  }, [series]);

  // Filter visible series
  const visibleSeries = chartSeries.filter(s => !hiddenSeries.has(s.key));

  // Process data for scatter plot
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    return data.map((item, index) => {
      const processed = {
        ...item,
        _index: index,
        x: item[xAxisKey],
        y: item[yAxisKey],
        z: zAxisKey ? item[zAxisKey] : pointSize
      };

      // Add color based on value
      if (colorByValue && colorKey) {
        const value = item[colorKey];
        const colorIndex = Math.floor((value / Math.max(...data.map(d => d[colorKey]))) * (colorScale.length - 1));
        processed._color = colorScale[colorIndex] || colorScale[0];
      }

      // Add size based on value
      if (sizeByValue && sizeKey) {
        const value = item[sizeKey];
        const maxValue = Math.max(...data.map(d => d[sizeKey]));
        const minValue = Math.min(...data.map(d => d[sizeKey]));
        const normalizedValue = (value - minValue) / (maxValue - minValue);
        processed._size = sizeRange[0] + normalizedValue * (sizeRange[1] - sizeRange[0]);
      }

      return processed;
    });
  }, [data, xAxisKey, yAxisKey, zAxisKey, colorByValue, colorKey, colorScale, sizeByValue, sizeKey, sizeRange, pointSize]);

  // Calculate trend line
  const trendLineData = useMemo(() => {
    if (!showTrendLine || processedData.length < 2) return null;

    const xValues = processedData.map(d => d.x).filter(v => typeof v === 'number');
    const yValues = processedData.map(d => d.y).filter(v => typeof v === 'number');
    
    if (xValues.length !== yValues.length || xValues.length < 2) return null;

    // Simple linear regression
    const n = xValues.length;
    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);

    return [
      { x: minX, y: slope * minX + intercept },
      { x: maxX, y: slope * maxX + intercept }
    ];
  }, [showTrendLine, processedData]);

  // Calculate correlation coefficient
  const correlationCoefficient = useMemo(() => {
    if (!showCorrelation || processedData.length < 2) return null;

    const xValues = processedData.map(d => d.x).filter(v => typeof v === 'number');
    const yValues = processedData.map(d => d.y).filter(v => typeof v === 'number');
    
    if (xValues.length !== yValues.length || xValues.length < 2) return null;

    const n = xValues.length;
    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
    const sumYY = yValues.reduce((sum, y) => sum + y * y, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }, [showCorrelation, processedData]);

  // Detect outliers using IQR method
  const outliers = useMemo(() => {
    if (!outlierDetection || processedData.length < 4) return new Set();

    const xValues = processedData.map(d => d.x).filter(v => typeof v === 'number').sort((a, b) => a - b);
    const yValues = processedData.map(d => d.y).filter(v => typeof v === 'number').sort((a, b) => a - b);

    const getOutliers = (values: number[]) => {
      const q1 = values[Math.floor(values.length * 0.25)];
      const q3 = values[Math.floor(values.length * 0.75)];
      const iqr = q3 - q1;
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;
      
      return values.filter(v => v < lowerBound || v > upperBound);
    };

    const xOutliers = getOutliers(xValues);
    const yOutliers = getOutliers(yValues);

    const outlierIndices = new Set<number>();
    
    processedData.forEach((item, index) => {
      if (xOutliers.includes(item.x) || yOutliers.includes(item.y)) {
        outlierIndices.add(index);
      }
    });

    return outlierIndices;
  }, [outlierDetection, processedData]);

  // Handle point interactions
  const handlePointClick = useCallback((data: any, index: number) => {
    setSelectedPoints(prev => {
      const newSet = new Set(prev);
      if (newSet.has(data._index)) {
        newSet.delete(data._index);
      } else {
        newSet.add(data._index);
      }
      return newSet;
    });
    
    onPointClick?.(data, index);
    onDataPointClick?.(data, index);
  }, [onPointClick, onDataPointClick]);

  const handlePointHover = useCallback((data: any, index: number) => {
    setHoveredPoint(data);
    onPointHover?.(data, index);
    onDataPointHover?.(data, index);
  }, [onPointHover, onDataPointHover]);

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

  // Custom point renderer
  const CustomPoint = useCallback((props: any) => {
    const { payload, cx, cy } = props;
    const isOutlier = outliers.has(payload._index);
    const isSelected = selectedPoints.has(payload._index);
    const isHovered = hoveredPoint?._index === payload._index;

    let size = payload._size || pointSize;
    if (isHovered && hoverEffect === 'expand') {
      size *= 1.5;
    }

    let color = payload._color || config?.colors?.[0] || '#8884d8';
    if (isOutlier) {
      color = outlierColor;
    }

    return (
      <circle
        cx={cx}
        cy={cy}
        r={size}
        fill={color}
        fillOpacity={pointOpacity}
        stroke={isSelected ? '#000' : color}
        strokeWidth={isSelected ? 2 : 1}
        style={{
          cursor: 'pointer',
          filter: isHovered && hoverEffect === 'glow' ? 'drop-shadow(0 0 6px currentColor)' : 'none'
        }}
        onMouseEnter={() => handlePointHover(payload, payload._index)}
        onMouseLeave={() => setHoveredPoint(null)}
        onClick={() => handlePointClick(payload, payload._index)}
      />
    );
  }, [
    outliers, selectedPoints, hoveredPoint, hoverEffect, pointSize, pointOpacity, 
    config, outlierColor, handlePointHover, handlePointClick
  ]);

  // Custom actions
  const customActions = (
    <div className="flex items-center gap-2">
      <Badge variant="secondary" className="text-xs">
        <ScatterIcon className="h-3 w-3 mr-1" />
        {processedData.length} points
      </Badge>
      
      {showTrendLine && (
        <Badge variant="secondary" className="text-xs">
          <TrendingUp className="h-3 w-3 mr-1" />
          Trend
        </Badge>
      )}
      
      {showCorrelation && correlationCoefficient !== null && (
        <Badge variant="secondary" className="text-xs">
          <Target className="h-3 w-3 mr-1" />
          R: {correlationCoefficient.toFixed(3)}
        </Badge>
      )}
      
      {outlierDetection && (
        <Badge variant="secondary" className="text-xs">
          <Zap className="h-3 w-3 mr-1" />
          {outliers.size} outliers
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
    const insights: string[] = [];
    
    if (correlationCoefficient !== null) {
      const strength = Math.abs(correlationCoefficient);
      const direction = correlationCoefficient > 0 ? 'positive' : 'negative';
      const strengthDesc = strength > 0.7 ? 'strong' : strength > 0.3 ? 'moderate' : 'weak';
      insights.push(`${strengthDesc} ${direction} correlation (r=${correlationCoefficient.toFixed(3)})`);
    }
    
    if (outliers.size > 0) {
      insights.push(`${outliers.size} outlier(s) detected`);
    }
    
    if (selectedPoints.size > 0) {
      insights.push(`${selectedPoints.size} point(s) selected`);
    }

    return insights;
  }, [correlationCoefficient, outliers, selectedPoints]);

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
      chartType="scatter"
      customActions={customActions}
      insights={insights}
      onDataPointClick={handlePointClick}
      onDataPointHover={handlePointHover}
    >
      <RechartsScatterChart
        data={processedData}
        margin={config?.margin}
      >
        <XAxis
          dataKey="x"
          type="number"
          domain={zoomDomain?.x || xAxis?.domain}
          tickFormatter={xAxis?.tickFormatter}
          hide={xAxis?.hide}
          label={{ value: xAxis?.label, position: 'insideBottom', offset: -5 }}
        />
        <YAxis
          dataKey="y"
          type="number"
          domain={zoomDomain?.y || yAxis?.domain}
          tickFormatter={yAxis?.tickFormatter}
          hide={yAxis?.hide}
          label={{ value: yAxis?.label, angle: -90, position: 'insideLeft' }}
        />
        {zAxisKey && (
          <ZAxis
            dataKey="z"
            type="number"
            range={sizeRange}
          />
        )}

        {/* Quadrant lines */}
        {showQuadrants && quadrantLines && (
          <>
            {quadrantLines.x !== undefined && (
              <ReferenceLine
                x={quadrantLines.x}
                stroke="#666"
                strokeDasharray="5 5"
                label="Vertical"
              />
            )}
            {quadrantLines.y !== undefined && (
              <ReferenceLine
                y={quadrantLines.y}
                stroke="#666"
                strokeDasharray="5 5"
                label="Horizontal"
              />
            )}
          </>
        )}

        {/* Trend line */}
        {showTrendLine && trendLineData && (
          <ReferenceLine
            segment={trendLineData}
            stroke={trendLineColor}
            strokeWidth={2}
            strokeDasharray="5 5"
          />
        )}

        {/* Data points */}
        {visibleSeries.map((series, index) => (
          <Scatter
            key={series.key}
            data={processedData}
            fill={series.color || config?.colors?.[index] || '#8884d8'}
            shape={CustomPoint}
            animationDuration={animations ? animationDuration : 0}
          />
        ))}
      </RechartsScatterChart>

      {/* Series Toggle */}
      {seriesToggle}
    </BaseChart>
  );
};

// Bubble Chart variant
export const BubbleChart: React.FC<EnhancedScatterChartProps> = (props) => {
  return (
    <ScatterChartComponent
      {...props}
      sizeByValue={true}
      sizeRange={[50, 500]}
      pointOpacity={0.7}
    />
  );
};

// Correlation Matrix ScatterChart
export const CorrelationScatterChart: React.FC<EnhancedScatterChartProps> = (props) => {
  return (
    <ScatterChartComponent
      {...props}
      showCorrelation={true}
      showTrendLine={true}
      correlationLine={true}
    />
  );
};

export const ScatterChart = withChartErrorBoundary(ScatterChartComponent);
export default ScatterChart;