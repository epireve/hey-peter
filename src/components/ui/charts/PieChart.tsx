"use client";

import React, { useCallback, useState, useMemo, useRef } from 'react';
import { 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  Sector,
  Legend as RechartsLegend
} from 'recharts';
import { BaseChart, withChartErrorBoundary } from './BaseChart';
import { PieChartProps } from '@/types/charts';
import { ChartConfigUtils, ChartFormatUtils } from '@/lib/utils/chart-config';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  PieChart as PieChartIcon, 
  Doughnut, 
  Eye, 
  EyeOff,
  RotateCcw,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnhancedPieChartProps extends PieChartProps {
  variant?: 'pie' | 'donut' | 'semi-circle' | 'quarter-circle';
  showLabels?: boolean;
  showValues?: boolean;
  showPercentages?: boolean;
  showLegend?: boolean;
  legendPosition?: 'top' | 'bottom' | 'left' | 'right';
  animationDuration?: number;
  animationEasing?: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';
  enableHover?: boolean;
  enableClick?: boolean;
  hoverOffset?: number;
  clickOffset?: number;
  centerLabel?: {
    show: boolean;
    title?: string;
    value?: string | number;
    formatter?: (value: any) => string;
  };
  showTooltip?: boolean;
  customTooltip?: boolean;
  sortBy?: 'value' | 'name' | 'none';
  sortOrder?: 'asc' | 'desc';
  minSliceAngle?: number;
  maxSlices?: number;
  showOthersSlice?: boolean;
  othersLabel?: string;
  rotationAngle?: number;
  enableRotation?: boolean;
  gradientColors?: boolean;
  patternFills?: boolean;
  showDataLabels?: boolean;
  dataLabelPosition?: 'inside' | 'outside' | 'center';
  labelConnectorLines?: boolean;
  customLabelRender?: (entry: any) => string;
  onSliceClick?: (data: any, index: number) => void;
  onSliceHover?: (data: any, index: number) => void;
  responsive?: {
    mobile?: {
      innerRadius?: number;
      outerRadius?: number;
      showLabels?: boolean;
    };
    tablet?: {
      innerRadius?: number;
      outerRadius?: number;
      showLabels?: boolean;
    };
  };
}

const PieChartComponent: React.FC<EnhancedPieChartProps> = ({
  data,
  config,
  dataKey,
  nameKey = 'name',
  innerRadius = 0,
  outerRadius = 80,
  startAngle = 0,
  endAngle = 360,
  paddingAngle = 0,
  cornerRadius = 0,
  labelLine = false,
  label = false,
  className,
  title,
  subtitle,
  loading,
  error,
  exportable,
  onDataPointClick,
  onDataPointHover,
  variant = 'pie',
  showLabels = true,
  showValues = false,
  showPercentages = true,
  showLegend = true,
  legendPosition = 'bottom',
  animationDuration = 800,
  animationEasing = 'ease-out',
  enableHover = true,
  enableClick = true,
  hoverOffset = 5,
  clickOffset = 10,
  centerLabel,
  showTooltip = true,
  customTooltip = false,
  sortBy = 'value',
  sortOrder = 'desc',
  minSliceAngle = 0,
  maxSlices = 10,
  showOthersSlice = true,
  othersLabel = 'Others',
  rotationAngle = 0,
  enableRotation = false,
  gradientColors = false,
  patternFills = false,
  showDataLabels = true,
  dataLabelPosition = 'outside',
  labelConnectorLines = true,
  customLabelRender,
  onSliceClick,
  onSliceHover,
  responsive,
  ...baseProps
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hiddenSlices, setHiddenSlices] = useState<Set<string>>(new Set());
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentRotation, setCurrentRotation] = useState(rotationAngle);
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  // Process data based on variant
  const processedData = useMemo(() => {
    let processed = [...data];

    // Filter out hidden slices
    if (hiddenSlices.size > 0) {
      processed = processed.filter(item => !hiddenSlices.has(item[nameKey]));
    }

    // Sort data
    if (sortBy !== 'none') {
      processed.sort((a, b) => {
        if (sortBy === 'value') {
          const aVal = a[dataKey];
          const bVal = b[dataKey];
          return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        } else if (sortBy === 'name') {
          const aName = a[nameKey];
          const bName = b[nameKey];
          return sortOrder === 'asc' ? aName.localeCompare(bName) : bName.localeCompare(aName);
        }
        return 0;
      });
    }

    // Handle max slices and others slice
    if (maxSlices && processed.length > maxSlices && showOthersSlice) {
      const mainSlices = processed.slice(0, maxSlices - 1);
      const otherSlices = processed.slice(maxSlices - 1);
      const othersValue = otherSlices.reduce((sum, item) => sum + item[dataKey], 0);
      
      processed = [
        ...mainSlices,
        {
          [nameKey]: othersLabel,
          [dataKey]: othersValue,
          isOthers: true
        }
      ];
    }

    // Filter out slices below minimum angle
    if (minSliceAngle > 0) {
      const totalValue = processed.reduce((sum, item) => sum + item[dataKey], 0);
      const minValue = (minSliceAngle / 360) * totalValue;
      processed = processed.filter(item => item[dataKey] >= minValue);
    }

    // Calculate percentages
    const totalValue = processed.reduce((sum, item) => sum + item[dataKey], 0);
    return processed.map(item => ({
      ...item,
      percentage: (item[dataKey] / totalValue) * 100
    }));
  }, [data, dataKey, nameKey, hiddenSlices, sortBy, sortOrder, maxSlices, showOthersSlice, othersLabel, minSliceAngle]);

  // Get chart dimensions based on variant
  const getChartDimensions = useCallback(() => {
    switch (variant) {
      case 'donut':
        return {
          innerRadius: innerRadius || 40,
          outerRadius: outerRadius || 80,
          startAngle: 0,
          endAngle: 360
        };
      case 'semi-circle':
        return {
          innerRadius: innerRadius || 0,
          outerRadius: outerRadius || 80,
          startAngle: -90,
          endAngle: 90
        };
      case 'quarter-circle':
        return {
          innerRadius: innerRadius || 0,
          outerRadius: outerRadius || 80,
          startAngle: 0,
          endAngle: 90
        };
      default:
        return {
          innerRadius: innerRadius || 0,
          outerRadius: outerRadius || 80,
          startAngle: startAngle || 0,
          endAngle: endAngle || 360
        };
    }
  }, [variant, innerRadius, outerRadius, startAngle, endAngle]);

  const chartDimensions = getChartDimensions();

  // Handle slice interactions
  const handleSliceClick = useCallback((data: any, index: number) => {
    if (!enableClick) return;
    
    setActiveIndex(activeIndex === index ? null : index);
    onSliceClick?.(data, index);
    onDataPointClick?.(data, index);
  }, [enableClick, activeIndex, onSliceClick, onDataPointClick]);

  const handleSliceHover = useCallback((data: any, index: number, isEntering: boolean) => {
    if (!enableHover) return;
    
    setHoveredIndex(isEntering ? index : null);
    if (isEntering) {
      onSliceHover?.(data, index);
      onDataPointHover?.(data, index);
    }
  }, [enableHover, onSliceHover, onDataPointHover]);

  // Toggle slice visibility
  const toggleSlice = useCallback((sliceName: string) => {
    setHiddenSlices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sliceName)) {
        newSet.delete(sliceName);
      } else {
        newSet.add(sliceName);
      }
      return newSet;
    });
  }, []);

  // Rotation animation
  const startRotation = useCallback(() => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    const duration = 3000;
    const startTime = Date.now();
    const startRotation = currentRotation;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const newRotation = startRotation + (360 * progress);
      
      setCurrentRotation(newRotation % 360);
      
      if (progress < 1) {
        animationRef.current = setTimeout(animate, 16);
      } else {
        setIsAnimating(false);
      }
    };
    
    animate();
  }, [isAnimating, currentRotation]);

  const stopRotation = useCallback(() => {
    if (animationRef.current) {
      clearTimeout(animationRef.current);
      animationRef.current = null;
    }
    setIsAnimating(false);
  }, []);

  // Custom label renderer
  const renderCustomLabel = useCallback((entry: any) => {
    if (!showDataLabels) return null;
    
    let labelText = '';
    if (customLabelRender) {
      labelText = customLabelRender(entry);
    } else {
      const parts = [];
      if (showLabels) parts.push(entry[nameKey]);
      if (showValues) parts.push(ChartFormatUtils.formatNumber(entry[dataKey]));
      if (showPercentages) parts.push(`${entry.percentage.toFixed(1)}%`);
      labelText = parts.join(' - ');
    }
    
    return labelText;
  }, [showDataLabels, customLabelRender, showLabels, showValues, showPercentages, nameKey, dataKey]);

  // Active shape renderer for hover effect
  const renderActiveShape = useCallback((props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload } = props;
    
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + hoverOffset}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        {centerLabel?.show && (
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-sm font-medium"
          >
            {centerLabel.title && (
              <tspan x={cx} dy="-0.5em" className="text-xs text-muted-foreground">
                {centerLabel.title}
              </tspan>
            )}
            <tspan x={cx} dy="1em" className="text-lg font-bold">
              {centerLabel.formatter 
                ? centerLabel.formatter(payload[dataKey])
                : ChartFormatUtils.formatNumber(payload[dataKey])
              }
            </tspan>
          </text>
        )}
      </g>
    );
  }, [hoverOffset, centerLabel, dataKey]);

  // Generate gradients
  const generateGradients = useCallback(() => {
    if (!gradientColors) return null;
    
    return (
      <defs>
        {processedData.map((entry, index) => {
          const color = config?.colors?.[index % (config?.colors?.length || 1)] || '#8884d8';
          return (
            <linearGradient key={index} id={`gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity={0.8} />
              <stop offset="100%" stopColor={color} stopOpacity={0.2} />
            </linearGradient>
          );
        })}
      </defs>
    );
  }, [gradientColors, processedData, config]);

  // Custom actions
  const customActions = (
    <div className="flex items-center gap-2">
      <Badge variant="secondary" className="text-xs">
        {variant === 'pie' && <PieChartIcon className="h-3 w-3 mr-1" />}
        {variant === 'donut' && <Doughnut className="h-3 w-3 mr-1" />}
        {variant.charAt(0).toUpperCase() + variant.slice(1)}
      </Badge>
      
      {enableRotation && (
        <Button
          variant="outline"
          size="sm"
          onClick={isAnimating ? stopRotation : startRotation}
          disabled={false}
        >
          {isAnimating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
      )}
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCurrentRotation(0)}
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
    </div>
  );

  // Legend component
  const legendContent = showLegend ? (
    <div className={cn(
      "flex gap-2 mt-4",
      legendPosition === 'top' && "order-first",
      legendPosition === 'bottom' && "order-last",
      legendPosition === 'left' && "flex-col",
      legendPosition === 'right' && "flex-col"
    )}>
      {processedData.map((entry, index) => (
        <div
          key={entry[nameKey]}
          className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded"
          onClick={() => toggleSlice(entry[nameKey])}
        >
          <div
            className={cn(
              "w-3 h-3 rounded-full",
              hiddenSlices.has(entry[nameKey]) && "opacity-30"
            )}
            style={{
              backgroundColor: config?.colors?.[index % (config?.colors?.length || 1)] || '#8884d8'
            }}
          />
          <span className={cn(
            "text-sm",
            hiddenSlices.has(entry[nameKey]) && "line-through opacity-50"
          )}>
            {entry[nameKey]}
          </span>
          <span className="text-xs text-muted-foreground">
            ({entry.percentage.toFixed(1)}%)
          </span>
          {hiddenSlices.has(entry[nameKey]) ? (
            <EyeOff className="h-3 w-3 text-muted-foreground" />
          ) : (
            <Eye className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
      ))}
    </div>
  ) : null;

  // Center label for donut charts
  const centerLabelContent = centerLabel?.show && variant === 'donut' ? (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="text-center">
        {centerLabel.title && (
          <div className="text-xs text-muted-foreground mb-1">
            {centerLabel.title}
          </div>
        )}
        <div className="text-2xl font-bold">
          {centerLabel.formatter && centerLabel.value
            ? centerLabel.formatter(centerLabel.value)
            : centerLabel.value
          }
        </div>
      </div>
    </div>
  ) : null;

  // Calculate insights
  const insights = useMemo(() => {
    if (!processedData || processedData.length === 0) return [];

    const insights: string[] = [];
    const totalValue = processedData.reduce((sum, item) => sum + item[dataKey], 0);
    const maxSlice = processedData.reduce((max, item) => 
      item[dataKey] > max[dataKey] ? item : max, processedData[0]);
    
    insights.push(`Total: ${ChartFormatUtils.formatNumber(totalValue)}`);
    insights.push(`Largest slice: ${maxSlice[nameKey]} (${maxSlice.percentage.toFixed(1)}%)`);
    
    if (hiddenSlices.size > 0) {
      insights.push(`${hiddenSlices.size} slice(s) hidden`);
    }

    return insights;
  }, [processedData, dataKey, nameKey, hiddenSlices]);

  return (
    <BaseChart
      {...baseProps}
      data={processedData}
      config={config}
      className={className}
      title={title}
      subtitle={subtitle}
      loading={loading}
      error={error}
      exportable={exportable}
      chartType="pie"
      customActions={customActions}
      insights={insights}
      onDataPointClick={handleSliceClick}
      onDataPointHover={handleSliceHover}
    >
      <div className="relative">
        <RechartsPieChart
          margin={config?.margin}
        >
          {generateGradients()}
          <Pie
            data={processedData}
            cx="50%"
            cy="50%"
            labelLine={labelConnectorLines && labelLine}
            label={showDataLabels ? renderCustomLabel : false}
            outerRadius={chartDimensions.outerRadius}
            innerRadius={chartDimensions.innerRadius}
            startAngle={chartDimensions.startAngle + currentRotation}
            endAngle={chartDimensions.endAngle + currentRotation}
            paddingAngle={paddingAngle}
            dataKey={dataKey}
            nameKey={nameKey}
            animationDuration={animationDuration}
            animationEasing={animationEasing}
            activeIndex={hoveredIndex}
            activeShape={enableHover ? renderActiveShape : undefined}
            onMouseEnter={(data, index) => handleSliceHover(data, index, true)}
            onMouseLeave={(data, index) => handleSliceHover(data, index, false)}
            onClick={handleSliceClick}
          >
            {processedData.map((entry, index) => {
              const color = config?.colors?.[index % (config?.colors?.length || 1)] || '#8884d8';
              const fill = gradientColors ? `url(#gradient-${index})` : color;
              
              return (
                <Cell
                  key={`cell-${index}`}
                  fill={fill}
                  stroke={activeIndex === index ? '#000' : 'none'}
                  strokeWidth={activeIndex === index ? 2 : 0}
                />
              );
            })}
          </Pie>
        </RechartsPieChart>
        
        {centerLabelContent}
      </div>

      {legendContent}
    </BaseChart>
  );
};

// DonutChart variant
export const DonutChart: React.FC<EnhancedPieChartProps> = (props) => {
  return (
    <PieChartComponent
      {...props}
      variant="donut"
      innerRadius={props.innerRadius || 40}
    />
  );
};

// Semi-circle chart variant
export const SemiCircleChart: React.FC<EnhancedPieChartProps> = (props) => {
  return (
    <PieChartComponent
      {...props}
      variant="semi-circle"
      startAngle={-90}
      endAngle={90}
    />
  );
};

// Gauge chart variant (quarter circle)
export const GaugeChart: React.FC<EnhancedPieChartProps & {
  value: number;
  max: number;
  min?: number;
  showNeedle?: boolean;
  gaugeColor?: string;
  backgroundColor?: string;
}> = ({
  value,
  max,
  min = 0,
  showNeedle = true,
  gaugeColor = '#8884d8',
  backgroundColor = '#f0f0f0',
  ...props
}) => {
  const percentage = ((value - min) / (max - min)) * 100;
  
  const gaugeData = [
    { name: 'Value', value: percentage, fill: gaugeColor },
    { name: 'Remaining', value: 100 - percentage, fill: backgroundColor }
  ];

  return (
    <PieChartComponent
      {...props}
      data={gaugeData}
      variant="semi-circle"
      innerRadius={60}
      outerRadius={80}
      startAngle={-90}
      endAngle={90}
      centerLabel={{
        show: true,
        title: 'Value',
        value: value,
        formatter: (val) => ChartFormatUtils.formatNumber(val)
      }}
    />
  );
};

export const PieChart = withChartErrorBoundary(PieChartComponent);
export default PieChart;