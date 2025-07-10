"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ResponsiveContainer, Tooltip, Legend, CartesianGrid } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Download, 
  RefreshCw, 
  AlertCircle, 
  Info, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  MoreHorizontal
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  BaseChartProps, 
  ChartConfig, 
  ChartTheme, 
  ChartInteractionEvent,
  ChartExportOptions 
} from '@/types/charts';
import { 
  ChartConfigUtils, 
  ChartFormatUtils, 
  ChartExportUtils, 
  ChartAccessibilityUtils 
} from '@/lib/utils/chart-config';
import { cn } from '@/lib/utils';

interface BaseChartComponentProps extends BaseChartProps {
  children: React.ReactNode;
  chartType: string;
  onExport?: (options: ChartExportOptions) => void;
  onRefresh?: () => void;
  showExportButton?: boolean;
  showRefreshButton?: boolean;
  showErrorDetails?: boolean;
  customActions?: React.ReactNode;
  containerClassName?: string;
  headerClassName?: string;
  contentClassName?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'stable';
    label?: string;
  };
  insights?: string[];
  lastUpdated?: Date;
}

export const BaseChart: React.FC<BaseChartComponentProps> = ({
  data,
  config: userConfig,
  tooltip,
  legend,
  grid,
  className,
  title,
  subtitle,
  loading = false,
  error,
  exportable = false,
  children,
  chartType,
  onExport,
  onRefresh,
  showExportButton = true,
  showRefreshButton = false,
  showErrorDetails = false,
  customActions,
  containerClassName,
  headerClassName,
  contentClassName,
  trend,
  insights,
  lastUpdated,
  onDataPointClick,
  onDataPointHover
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [theme, setTheme] = useState<ChartTheme>();

  // Merge config with defaults
  const config = ChartConfigUtils.mergeConfig(userConfig);

  // Initialize theme
  useEffect(() => {
    setTheme(ChartConfigUtils.createTheme(config.theme || 'light'));
  }, [config.theme]);

  // Handle container resize
  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current) {
        const { width, height } = chartRef.current.getBoundingClientRect();
        setContainerSize({ width, height });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Get responsive dimensions
  const responsiveDimensions = ChartConfigUtils.getResponsiveDimensions(
    containerSize.width,
    config
  );

  // Handle export
  const handleExport = useCallback(async (format: 'png' | 'jpg' | 'pdf' | 'svg' | 'csv' | 'json') => {
    if (!chartRef.current) return;

    try {
      if (format === 'csv') {
        ChartExportUtils.exportAsCSV(data, `${title || 'chart'}-data`);
      } else if (format === 'json') {
        ChartExportUtils.exportAsJSON(data, `${title || 'chart'}-data`);
      } else if (onExport) {
        onExport({ format, filename: title || 'chart' });
      } else {
        await ChartExportUtils.exportAsImage(chartRef.current, {
          format: format as 'png' | 'jpg',
          fileName: title || 'chart'
        });
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  }, [data, title, onExport]);

  // Custom tooltip component
  const CustomTooltip = useCallback(({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const tooltipConfig = tooltip || {};
    const { labelFormatter, formatter } = tooltipConfig;

    return (
      <div className="bg-background border rounded-lg shadow-lg p-3 min-w-[150px]">
        <div className="text-sm font-medium text-foreground mb-2">
          {labelFormatter ? labelFormatter(label) : label}
        </div>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-muted-foreground">{entry.name}</span>
              </div>
              <span className="text-sm font-medium text-foreground">
                {formatter ? formatter(entry.value, entry.name, entry)[0] : entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }, [tooltip]);

  // Custom legend component
  const CustomLegend = useCallback(({ payload }: any) => {
    if (!payload || !payload.length) return null;

    const legendConfig = legend || {};
    if (legendConfig.hide) return null;

    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-muted-foreground">
              {legendConfig.formatter ? legendConfig.formatter(entry.value) : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }, [legend]);

  // Handle data point interactions
  const handleDataPointInteraction = useCallback((event: ChartInteractionEvent) => {
    if (event.type === 'click' && onDataPointClick) {
      onDataPointClick(event.data, event.index);
    } else if (event.type === 'hover' && onDataPointHover) {
      onDataPointHover(event.data, event.index);
    }
  }, [onDataPointClick, onDataPointHover]);

  // Generate accessibility description
  const accessibilityDescription = ChartAccessibilityUtils.generateDescription(data, chartType);

  // Render loading state
  if (loading) {
    return (
      <Card className={cn("w-full", containerClassName)}>
        <CardHeader className={headerClassName}>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
        </CardHeader>
        <CardContent className={contentClassName}>
          <Skeleton className="w-full h-[300px]" />
        </CardContent>
      </Card>
    );
  }

  // Render error state
  if (error) {
    return (
      <Card className={cn("w-full", containerClassName)}>
        <CardHeader className={headerClassName}>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                {title || 'Chart Error'}
              </CardTitle>
              {subtitle && <CardDescription>{subtitle}</CardDescription>}
            </div>
            {showRefreshButton && onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className={contentClassName}>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-sm text-muted-foreground mb-2">
              Failed to load chart data
            </p>
            {showErrorDetails && (
              <p className="text-xs text-muted-foreground">{error}</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render empty state
  if (!data || data.length === 0) {
    return (
      <Card className={cn("w-full", containerClassName)}>
        <CardHeader className={headerClassName}>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{title || 'No Data'}</CardTitle>
              {subtitle && <CardDescription>{subtitle}</CardDescription>}
            </div>
            {showRefreshButton && onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className={contentClassName}>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Info className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              No data available to display
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={cn("w-full", containerClassName)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardHeader className={headerClassName}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle>{title}</CardTitle>
              {trend && (
                <Badge variant="secondary" className="ml-2">
                  {trend.direction === 'up' && <TrendingUp className="h-3 w-3 mr-1 text-green-600" />}
                  {trend.direction === 'down' && <TrendingDown className="h-3 w-3 mr-1 text-red-600" />}
                  {trend.direction === 'stable' && <Minus className="h-3 w-3 mr-1 text-gray-600" />}
                  {ChartFormatUtils.formatPercentage(trend.value)}
                </Badge>
              )}
            </div>
            {subtitle && <CardDescription>{subtitle}</CardDescription>}
            {lastUpdated && (
              <p className="text-xs text-muted-foreground mt-1">
                Last updated: {ChartFormatUtils.formatDate(lastUpdated)}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {customActions}
            {showRefreshButton && onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
            {(exportable || showExportButton) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport('png')}>
                    Export as PNG
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('jpg')}>
                    Export as JPG
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('csv')}>
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('json')}>
                    Export as JSON
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {insights && insights.length > 0 && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Key Insights</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {insights.map((insight, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardHeader>

      <CardContent className={cn("pb-6", contentClassName)}>
        <div 
          ref={chartRef}
          className={cn("w-full", className)}
          role="img"
          aria-label={accessibilityDescription}
        >
          <ResponsiveContainer
            width={responsiveDimensions.width}
            height={responsiveDimensions.height}
          >
            <div style={{ position: 'relative' }}>
              {children}
              
              {/* Render grid if configured */}
              {grid && !grid.hide && (
                <CartesianGrid 
                  strokeDasharray={grid.strokeDasharray || "3 3"}
                  horizontal={grid.horizontal !== false}
                  vertical={grid.vertical !== false}
                  stroke={theme?.grid}
                />
              )}

              {/* Render tooltip if configured */}
              {tooltip && !tooltip.hide && (
                <Tooltip
                  content={<CustomTooltip />}
                  trigger={tooltip.trigger || 'hover'}
                  shared={tooltip.shared}
                  position={tooltip.position}
                />
              )}

              {/* Render legend if configured */}
              {legend && !legend.hide && (
                <Legend
                  content={<CustomLegend />}
                  verticalAlign={legend.verticalAlign || 'bottom'}
                  align={legend.align || 'center'}
                />
              )}
            </div>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

// Higher-order component for chart error boundaries
export const withChartErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>
) => {
  const WrappedComponent = (props: P) => {
    const [hasError, setHasError] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      const handleError = (event: ErrorEvent) => {
        setHasError(true);
        setError(event.message);
      };

      window.addEventListener('error', handleError);
      return () => window.removeEventListener('error', handleError);
    }, []);

    if (hasError) {
      return (
        <Card className="w-full">
          <CardContent className="py-8">
            <div className="flex flex-col items-center justify-center text-center">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <p className="text-sm text-muted-foreground mb-2">
                Something went wrong with the chart
              </p>
              <p className="text-xs text-muted-foreground">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setHasError(false)}
                className="mt-4"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return <Component {...props} />;
  };

  WrappedComponent.displayName = `withChartErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

export default BaseChart;