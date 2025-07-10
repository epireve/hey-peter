"use client";

import React, { useCallback, useState, useMemo } from 'react';
import { 
  RadarChart as RechartsRadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  ResponsiveContainer 
} from 'recharts';
import { BaseChart, withChartErrorBoundary } from './BaseChart';
import { RadarChartProps } from '@/types/charts';
import { ChartConfigUtils } from '@/lib/utils/chart-config';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  RadarIcon, 
  Eye, 
  EyeOff, 
  Target, 
  Activity,
  Hexagon,
  Circle
} from 'lucide-react';

interface EnhancedRadarChartProps extends RadarChartProps {
  showDots?: boolean;
  showGrid?: boolean;
  gridType?: 'polygon' | 'circle';
  showRadialLines?: boolean;
  fillOpacity?: number;
  strokeWidth?: number;
  showSeriesToggle?: boolean;
  enableHover?: boolean;
  hoverEffect?: 'highlight' | 'expand' | 'glow';
  showValues?: boolean;
  valueFormatter?: (value: number) => string;
  showLegend?: boolean;
  legendPosition?: 'top' | 'bottom' | 'left' | 'right';
  angleOffset?: number;
  maxValue?: number;
  minValue?: number;
  levels?: number;
  showAxisLabels?: boolean;
  axisLabelFormatter?: (value: string) => string;
  comparisonMode?: boolean;
  benchmarkData?: any[];
  onRadarClick?: (data: any, index: number) => void;
  onRadarHover?: (data: any, index: number) => void;
  customAxisTicks?: number[];
  showAreaFill?: boolean;
  gradientFill?: boolean;
  patternFill?: boolean;
}

const RadarChartComponent: React.FC<EnhancedRadarChartProps> = ({
  data,
  config,
  series,
  tooltip,
  legend,
  className,
  title,
  subtitle,
  loading,
  error,
  exportable,
  onDataPointClick,
  onDataPointHover,
  polarGridConfig,
  polarAngleAxis,
  polarRadiusAxis,
  showDots = true,
  showGrid = true,
  gridType = 'polygon',
  showRadialLines = true,
  fillOpacity = 0.6,
  strokeWidth = 2,
  showSeriesToggle = false,
  enableHover = true,
  hoverEffect = 'highlight',
  showValues = false,
  valueFormatter,
  showLegend = true,
  legendPosition = 'bottom',
  angleOffset = 0,
  maxValue,
  minValue = 0,
  levels = 5,
  showAxisLabels = true,
  axisLabelFormatter,
  comparisonMode = false,
  benchmarkData = [],
  onRadarClick,
  onRadarHover,
  customAxisTicks,
  showAreaFill = true,
  gradientFill = false,
  patternFill = false,
  ...baseProps
}) => {
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
  const [hoveredSeries, setHoveredSeries] = useState<string | null>(null);

  // Auto-generate series if not provided
  const chartSeries = useMemo(() => {
    if (series) return series;
    return ChartConfigUtils.autoGenerateSeries(data, [polarAngleAxis?.dataKey || 'name']);
  }, [series, data, polarAngleAxis]);

  // Filter visible series
  const visibleSeries = chartSeries.filter(s => !hiddenSeries.has(s.key));

  // Combine main data with benchmark data if in comparison mode
  const combinedData = useMemo(() => {
    if (!comparisonMode || !benchmarkData.length) return data;
    
    return data.map((item, index) => {
      const benchmark = benchmarkData[index] || {};
      return { ...item, ...benchmark };
    });
  }, [data, benchmarkData, comparisonMode]);

  // Calculate radar metrics
  const radarMetrics = useMemo(() => {
    if (!data || data.length === 0 || !visibleSeries.length) return null;

    const metrics: any = {};
    
    visibleSeries.forEach(series => {
      const values = data.map(item => item[series.key]).filter(val => typeof val === 'number');
      if (values.length > 0) {
        metrics[series.key] = {
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((sum, val) => sum + val, 0) / values.length,
          total: values.reduce((sum, val) => sum + val, 0)
        };
      }
    });

    return metrics;
  }, [data, visibleSeries]);

  // Generate gradient definitions
  const generateGradients = useCallback(() => {
    if (!gradientFill) return null;
    
    return (
      <defs>
        {visibleSeries.map((series, index) => {
          const color = series.color || config?.colors?.[index] || '#8884d8';
          return (
            <radialGradient key={series.key} id={`radar-gradient-${series.key}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={color} stopOpacity={0.8} />
              <stop offset="100%" stopColor={color} stopOpacity={0.1} />
            </radialGradient>
          );
        })}
      </defs>
    );
  }, [gradientFill, visibleSeries, config]);

  // Generate pattern definitions
  const generatePatterns = useCallback(() => {
    if (!patternFill) return null;
    
    return (
      <defs>
        {visibleSeries.map((series, index) => {
          const color = series.color || config?.colors?.[index] || '#8884d8';
          const patternId = `radar-pattern-${series.key}`;
          
          return (
            <pattern key={patternId} id={patternId} patternUnits="userSpaceOnUse" width="8" height="8">
              <rect width="8" height="8" fill={color} fillOpacity={0.1} />
              <circle cx="4" cy="4" r="1" fill={color} />
            </pattern>
          );
        })}
      </defs>
    );
  }, [patternFill, visibleSeries, config]);

  // Handle radar interactions
  const handleRadarClick = useCallback((data: any, index: number) => {
    onRadarClick?.(data, index);
    onDataPointClick?.(data, index);
  }, [onRadarClick, onDataPointClick]);

  const handleRadarHover = useCallback((data: any, index: number, seriesKey: string) => {
    setHoveredSeries(seriesKey);
    onRadarHover?.(data, index);
    onDataPointHover?.(data, index);
  }, [onRadarHover, onDataPointHover]);

  const handleRadarLeave = useCallback(() => {
    setHoveredSeries(null);
  }, []);

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

  // Get radar fill based on configuration
  const getRadarFill = useCallback((series: any, index: number) => {
    if (patternFill) {
      return `url(#radar-pattern-${series.key})`;
    }
    if (gradientFill) {
      return `url(#radar-gradient-${series.key})`;
    }
    return series.color || config?.colors?.[index] || '#8884d8';
  }, [patternFill, gradientFill, config]);

  // Custom actions
  const customActions = (
    <div className="flex items-center gap-2">
      <Badge variant="secondary" className="text-xs">
        <RadarIcon className="h-3 w-3 mr-1" />
        {gridType === 'polygon' ? 'Polygon' : 'Circle'}
      </Badge>
      
      {comparisonMode && (
        <Badge variant="secondary" className="text-xs">
          <Target className="h-3 w-3 mr-1" />
          Comparison
        </Badge>
      )}
      
      {gradientFill && (
        <Badge variant="secondary" className="text-xs">
          <Activity className="h-3 w-3 mr-1" />
          Gradient
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
    if (!radarMetrics) return [];

    const insights: string[] = [];
    
    Object.entries(radarMetrics).forEach(([key, metrics]: [string, any]) => {
      const series = visibleSeries.find(s => s.key === key);
      if (series) {
        insights.push(`${series.name || key}: Avg ${metrics.avg.toFixed(1)}, Range ${metrics.min}-${metrics.max}`);
      }
    });

    if (comparisonMode) {
      insights.push('Comparison mode enabled with benchmark data');
    }

    return insights;
  }, [radarMetrics, visibleSeries, comparisonMode]);

  return (
    <BaseChart
      {...baseProps}
      data={combinedData}
      config={config}
      tooltip={tooltip}
      legend={legend}
      className={className}
      title={title}
      subtitle={subtitle}
      loading={loading}
      error={error}
      exportable={exportable}
      chartType="radar"
      customActions={customActions}
      insights={insights}
      onDataPointClick={handleRadarClick}
      onDataPointHover={handleRadarHover}
    >
      <RechartsRadarChart
        data={combinedData}
        margin={config?.margin}
      >
        {generateGradients()}
        {generatePatterns()}

        <PolarGrid
          gridType={gridType}
          radialLines={showRadialLines}
        />
        
        <PolarAngleAxis
          dataKey={polarAngleAxis?.dataKey || 'name'}
          tick={showAxisLabels}
          tickFormatter={axisLabelFormatter}
          className="text-xs"
        />
        
        <PolarRadiusAxis
          angle={polarRadiusAxis?.angle || 90}
          domain={[minValue, maxValue]}
          tick={showValues}
          tickFormatter={valueFormatter}
          className="text-xs"
        />

        {/* Data Radars */}
        {visibleSeries.map((series, index) => {
          const isHovered = hoveredSeries === series.key;
          const isOtherHovered = hoveredSeries && hoveredSeries !== series.key;
          
          return (
            <Radar
              key={series.key}
              dataKey={series.key}
              name={series.name || series.key}
              stroke={series.color || config?.colors?.[index] || '#8884d8'}
              strokeWidth={isHovered ? strokeWidth + 1 : strokeWidth}
              strokeOpacity={isOtherHovered ? 0.3 : 1}
              fill={showAreaFill ? getRadarFill(series, index) : 'none'}
              fillOpacity={isHovered && hoverEffect === 'highlight' ? fillOpacity + 0.2 : fillOpacity}
              dot={showDots}
              onMouseEnter={(data, index) => handleRadarHover(data, index, series.key)}
              onMouseLeave={handleRadarLeave}
              onClick={(data, index) => handleRadarClick(data, index)}
            />
          );
        })}
      </RechartsRadarChart>

      {/* Series Toggle */}
      {seriesToggle}
    </BaseChart>
  );
};

// Performance RadarChart variant
export const PerformanceRadarChart: React.FC<EnhancedRadarChartProps & {
  performanceMetrics: string[];
  targetValues?: Record<string, number>;
  showTargetRing?: boolean;
}> = ({
  performanceMetrics,
  targetValues = {},
  showTargetRing = false,
  ...props
}) => {
  const enhancedData = props.data.map(item => {
    const enhanced = { ...item };
    if (showTargetRing) {
      performanceMetrics.forEach(metric => {
        enhanced[`${metric}_target`] = targetValues[metric] || 100;
      });
    }
    return enhanced;
  });

  const enhancedSeries = [
    ...(props.series || []),
    ...(showTargetRing ? performanceMetrics.map(metric => ({
      key: `${metric}_target`,
      name: `${metric} Target`,
      color: '#cccccc'
    })) : [])
  ];

  return (
    <RadarChartComponent
      {...props}
      data={enhancedData}
      series={enhancedSeries}
      showDots={false}
      fillOpacity={0.1}
    />
  );
};

// Skill Assessment RadarChart
export const SkillAssessmentRadarChart: React.FC<EnhancedRadarChartProps & {
  skillCategories: string[];
  studentData: any[];
  averageData?: any[];
  showAverage?: boolean;
}> = ({
  skillCategories,
  studentData,
  averageData = [],
  showAverage = false,
  ...props
}) => {
  const combinedData = props.data.map((item, index) => {
    const combined = { ...item };
    if (showAverage && averageData[index]) {
      skillCategories.forEach(skill => {
        combined[`${skill}_avg`] = averageData[index][skill] || 0;
      });
    }
    return combined;
  });

  const enhancedSeries = [
    ...(props.series || []),
    ...(showAverage ? skillCategories.map(skill => ({
      key: `${skill}_avg`,
      name: `${skill} Average`,
      color: '#94a3b8'
    })) : [])
  ];

  return (
    <RadarChartComponent
      {...props}
      data={combinedData}
      series={enhancedSeries}
      comparisonMode={showAverage}
      gradientFill={true}
    />
  );
};

export const RadarChart = withChartErrorBoundary(RadarChartComponent);
export default RadarChart;