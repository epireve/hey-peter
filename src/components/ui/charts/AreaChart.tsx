"use client";

import React, { useCallback, useState, useMemo } from 'react';
import { 
  AreaChart as RechartsAreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  ReferenceLine,
  ReferenceArea,
  Brush,
  ResponsiveContainer
} from 'recharts';
import { BaseChart, withChartErrorBoundary } from './BaseChart';
import { AreaChartProps } from '@/types/charts';
import { ChartConfigUtils, ChartFormatUtils } from '@/lib/utils/chart-config';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  Layers, 
  BarChart3, 
  TrendingUp,
  Eye,
  EyeOff,
  RotateCcw,
  ZoomIn,
  Mountain,
  Waves
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnhancedAreaChartProps extends AreaChartProps {
  stackMode?: 'none' | 'normal' | 'percent' | 'expand';
  showDots?: boolean;
  showActiveDots?: boolean;
  showGradient?: boolean;
  gradientIntensity?: number;
  smoothing?: 'monotone' | 'linear' | 'step' | 'stepBefore' | 'stepAfter';
  showBaseline?: boolean;
  baselineValue?: number;
  showFill?: boolean;
  fillOpacity?: number;
  strokeWidth?: number;
  showSeriesToggle?: boolean;
  showBrush?: boolean;
  showZoomControls?: boolean;
  enableHover?: boolean;
  hoverEffect?: 'highlight' | 'expand' | 'glow';
  connectNulls?: boolean;
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
  thresholds?: Array<{
    value: number;
    color?: string;
    label?: string;
    above?: boolean;
  }>;
  onAreaClick?: (data: any, index: number) => void;
  onAreaHover?: (data: any, index: number) => void;
  onBrushChange?: (domain: [number, number] | null) => void;
  onZoom?: (domain: [number, number] | null) => void;
  syncId?: string;
  showPatterns?: boolean;
  patternType?: 'dots' | 'lines' | 'grid' | 'diagonal';
  animationDuration?: number;
  animationEasing?: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';
}

const AreaChartComponent: React.FC<EnhancedAreaChartProps> = ({
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
  stackId,
  fillOpacity = 0.6,
  type = 'linear',
  stackMode = 'none',
  showDots = false,
  showActiveDots = true,
  showGradient = true,
  gradientIntensity = 0.8,
  smoothing = 'monotone',
  showBaseline = false,
  baselineValue = 0,
  showFill = true,
  strokeWidth = 2,
  showSeriesToggle = false,
  showBrush = false,
  showZoomControls = false,
  enableHover = true,
  hoverEffect = 'highlight',
  connectNulls = false,
  referenceLines = [],
  referenceAreas = [],
  thresholds = [],
  onAreaClick,
  onAreaHover,
  onBrushChange,
  onZoom,
  syncId,
  showPatterns = false,
  patternType = 'dots',
  animationDuration = 1000,
  animationEasing = 'ease-out',
  ...baseProps
}) => {
  const [zoomDomain, setZoomDomain] = useState<[number, number] | null>(null);
  const [brushDomain, setBrushDomain] = useState<[number, number] | null>(null);
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
  const [hoveredSeries, setHoveredSeries] = useState<string | null>(null);
  const [activeDataPoint, setActiveDataPoint] = useState<any>(null);

  // Auto-generate series if not provided
  const chartSeries = useMemo(() => {
    if (series) return series;
    return ChartConfigUtils.autoGenerateSeries(data, [xAxis?.dataKey || 'name']);
  }, [series, data, xAxis]);

  // Filter visible series
  const visibleSeries = chartSeries.filter(s => !hiddenSeries.has(s.key));

  // Generate stack IDs based on stack mode
  const getStackId = useCallback((seriesIndex: number) => {
    switch (stackMode) {
      case 'normal':
      case 'percent':
      case 'expand':
        return 'stack';
      case 'none':
      default:
        return undefined;
    }
  }, [stackMode]);

  // Generate gradient definitions
  const generateGradients = useCallback(() => {
    if (!showGradient) return null;
    
    return (
      <defs>
        {visibleSeries.map((series, index) => {
          const color = series.color || config?.colors?.[index] || '#8884d8';
          return (
            <linearGradient key={series.key} id={`gradient-${series.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={gradientIntensity} />
              <stop offset="95%" stopColor={color} stopOpacity={0.1} />
            </linearGradient>
          );
        })}
      </defs>
    );
  }, [showGradient, visibleSeries, config, gradientIntensity]);

  // Generate pattern definitions
  const generatePatterns = useCallback(() => {
    if (!showPatterns) return null;
    
    return (
      <defs>
        {visibleSeries.map((series, index) => {
          const color = series.color || config?.colors?.[index] || '#8884d8';
          const patternId = `pattern-${series.key}`;
          
          switch (patternType) {
            case 'dots':
              return (
                <pattern key={patternId} id={patternId} patternUnits="userSpaceOnUse" width="4" height="4">
                  <rect width="4" height="4" fill={color} fillOpacity={0.1} />
                  <circle cx="2" cy="2" r="1" fill={color} />
                </pattern>
              );
            case 'lines':
              return (
                <pattern key={patternId} id={patternId} patternUnits="userSpaceOnUse" width="4" height="4">
                  <rect width="4" height="4" fill={color} fillOpacity={0.1} />
                  <path d="M 0,4 l 4,-4 M -1,1 l 2,-2 M 3,5 l 2,-2" stroke={color} strokeWidth="1" />
                </pattern>
              );
            case 'grid':
              return (
                <pattern key={patternId} id={patternId} patternUnits="userSpaceOnUse" width="8" height="8">
                  <rect width="8" height="8" fill={color} fillOpacity={0.1} />
                  <path d="M 8 0 L 0 0 0 8" fill="none" stroke={color} strokeWidth="1" />
                </pattern>
              );
            case 'diagonal':
              return (
                <pattern key={patternId} id={patternId} patternUnits="userSpaceOnUse" width="4" height="4">
                  <rect width="4" height="4" fill={color} fillOpacity={0.1} />
                  <path d="M 0,4 l 4,-4 M -1,1 l 2,-2 M 3,5 l 2,-2" stroke={color} strokeWidth="1" />
                </pattern>
              );
            default:
              return null;
          }
        })}
      </defs>
    );
  }, [showPatterns, visibleSeries, config, patternType]);

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

  // Handle area interactions
  const handleAreaClick = useCallback((data: any, index: number) => {
    onAreaClick?.(data, index);
    onDataPointClick?.(data, index);
  }, [onAreaClick, onDataPointClick]);

  const handleAreaHover = useCallback((data: any, index: number, seriesKey: string) => {
    setHoveredSeries(seriesKey);
    setActiveDataPoint(data);
    onAreaHover?.(data, index);
    onDataPointHover?.(data, index);
  }, [onAreaHover, onDataPointHover]);

  const handleAreaLeave = useCallback(() => {
    setHoveredSeries(null);
    setActiveDataPoint(null);
  }, []);

  // Get area fill based on configuration
  const getAreaFill = useCallback((series: any, index: number) => {
    if (showPatterns) {
      return `url(#pattern-${series.key})`;
    }
    if (showGradient) {
      return `url(#gradient-${series.key})`;
    }
    return series.color || config?.colors?.[index] || '#8884d8';
  }, [showPatterns, showGradient, config]);

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
      
      <Badge variant="secondary" className="text-xs">
        {stackMode === 'none' && <Activity className="h-3 w-3 mr-1" />}
        {stackMode === 'normal' && <Layers className="h-3 w-3 mr-1" />}
        {stackMode === 'percent' && <BarChart3 className="h-3 w-3 mr-1" />}
        {stackMode === 'expand' && <Mountain className="h-3 w-3 mr-1" />}
        {stackMode === 'none' ? 'Areas' : 'Stacked'}
      </Badge>
      
      {showGradient && (
        <Badge variant="secondary" className="text-xs">
          <Waves className="h-3 w-3 mr-1" />
          Gradient
        </Badge>
      )}
      
      {showPatterns && (
        <Badge variant="secondary" className="text-xs">
          Pattern
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
    
    if (stackMode !== 'none') {
      insights.push(`Areas are stacked in ${stackMode} mode`);
    }
    
    if (visibleSeries.length > 0) {
      const firstSeries = visibleSeries[0];
      const values = data.map(item => item[firstSeries.key]).filter(val => typeof val === 'number');
      if (values.length > 1) {
        const trend = values[values.length - 1] - values[0];
        const trendPercent = ((trend / values[0]) * 100).toFixed(1);
        insights.push(`${firstSeries.name || firstSeries.key} ${trend > 0 ? 'increased' : 'decreased'} by ${trendPercent}% over the period`);
      }
    }
    
    if (hiddenSeries.size > 0) {
      insights.push(`${hiddenSeries.size} series hidden`);
    }
    
    if (thresholds.length > 0) {
      insights.push(`${thresholds.length} threshold(s) configured`);
    }

    return insights;
  }, [data, stackMode, visibleSeries, hiddenSeries, thresholds]);

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
      chartType="area"
      customActions={customActions}
      insights={insights}
      onDataPointClick={handleAreaClick}
      onDataPointHover={handleAreaHover}
    >
      <RechartsAreaChart
        data={data}
        syncId={syncId}
        margin={config?.margin}
        stackOffset={stackMode === 'percent' || stackMode === 'expand' ? 'expand' : undefined}
      >
        {generateGradients()}
        {generatePatterns()}

        <XAxis
          dataKey={xAxis?.dataKey || 'name'}
          type={xAxis?.type || 'category'}
          domain={zoomDomain || xAxis?.domain}
          tickFormatter={xAxis?.tickFormatter}
          hide={xAxis?.hide}
        />
        <YAxis
          type={yAxis?.type || 'number'}
          domain={stackMode === 'percent' || stackMode === 'expand' ? [0, 100] : yAxis?.domain}
          tickFormatter={yAxis?.tickFormatter || (stackMode === 'percent' ? (value: number) => `${value}%` : undefined)}
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

        {/* Threshold Lines */}
        {thresholds.map((threshold, index) => (
          <ReferenceLine
            key={`threshold-${index}`}
            y={threshold.value}
            stroke={threshold.color || '#ff0000'}
            strokeDasharray="3 3"
            label={threshold.label}
          />
        ))}

        {/* Baseline */}
        {showBaseline && (
          <ReferenceLine
            y={baselineValue}
            stroke="#666"
            strokeDasharray="2 2"
            label="Baseline"
          />
        )}

        {/* Data Areas */}
        {visibleSeries.map((series, index) => {
          const isHovered = hoveredSeries === series.key;
          const isOtherHovered = hoveredSeries && hoveredSeries !== series.key;
          
          return (
            <Area
              key={series.key}
              dataKey={series.key}
              name={series.name || series.key}
              type={type}
              stackId={getStackId(index)}
              stroke={series.color || config?.colors?.[index] || '#8884d8'}
              strokeWidth={isHovered ? strokeWidth + 1 : strokeWidth}
              strokeOpacity={isOtherHovered ? 0.3 : 1}
              fill={showFill ? getAreaFill(series, index) : 'none'}
              fillOpacity={isHovered && hoverEffect === 'highlight' ? fillOpacity + 0.2 : fillOpacity}
              dot={showDots}
              activeDot={showActiveDots}
              connectNulls={connectNulls}
              animationDuration={animationDuration}
              animationEasing={animationEasing}
              onMouseEnter={(data, index) => handleAreaHover(data, index, series.key)}
              onMouseLeave={handleAreaLeave}
              onClick={(data, index) => handleAreaClick(data, index)}
            />
          );
        })}

        {/* Brush for zooming */}
        {showBrush && (
          <Brush
            dataKey={xAxis?.dataKey || 'name'}
            height={30}
            stroke="#8884d8"
            onChange={handleBrushChange}
          />
        )}
      </RechartsAreaChart>

      {/* Series Toggle */}
      {seriesToggle}
    </BaseChart>
  );
};

// Stacked AreaChart variant
export const StackedAreaChart: React.FC<EnhancedAreaChartProps> = (props) => {
  return (
    <AreaChartComponent
      {...props}
      stackMode="normal"
    />
  );
};

// Percentage AreaChart variant
export const PercentageAreaChart: React.FC<EnhancedAreaChartProps> = (props) => {
  return (
    <AreaChartComponent
      {...props}
      stackMode="percent"
    />
  );
};

// Streamgraph variant (stacked area with flowing baseline)
export const StreamgraphChart: React.FC<EnhancedAreaChartProps> = (props) => {
  return (
    <AreaChartComponent
      {...props}
      stackMode="expand"
      showBaseline={false}
      smoothing="monotone"
    />
  );
};

// Threshold AreaChart with conditional coloring
export const ThresholdAreaChart: React.FC<EnhancedAreaChartProps & {
  thresholdValue: number;
  aboveThresholdColor?: string;
  belowThresholdColor?: string;
}> = ({
  thresholdValue,
  aboveThresholdColor = '#10b981',
  belowThresholdColor = '#ef4444',
  ...props
}) => {
  const thresholds = [
    {
      value: thresholdValue,
      color: '#666',
      label: 'Threshold'
    }
  ];

  return (
    <AreaChartComponent
      {...props}
      thresholds={thresholds}
      config={{
        ...props.config,
        colors: [aboveThresholdColor, belowThresholdColor]
      }}
    />
  );
};

export const AreaChart = withChartErrorBoundary(AreaChartComponent);
export default AreaChart;