"use client";

import { logger } from '@/lib/services';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnalyticsChart } from "@/components/admin/dashboard/AnalyticsChart";
import { cn } from "@/lib/utils";
import { MoreHorizontal, Maximize2, Download } from "lucide-react";
import { useState } from "react";

interface ResponsiveChartProps {
  title: string;
  description?: string;
  data: any[];
  type?: "line" | "area" | "bar" | "pie";
  dataKey: string | string[];
  xAxisKey?: string;
  colors?: string[];
  className?: string;
  showFullscreen?: boolean;
  showDownload?: boolean;
  badge?: {
    text: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  };
  actions?: React.ReactNode;
}

export function ResponsiveChart({
  title,
  description,
  data,
  type = "line",
  dataKey,
  xAxisKey = "name",
  colors,
  className,
  showFullscreen = false,
  showDownload = false,
  badge,
  actions,
}: ResponsiveChartProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleDownload = () => {
    // In a real implementation, this would trigger chart download
    logger.info("Download chart:", title);
  };

  const chartHeight = isFullscreen ? 600 : 300;

  return (
    <Card className={cn(
      "w-full transition-all duration-200",
      isFullscreen && "fixed inset-4 z-50 shadow-2xl",
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {badge && (
              <Badge variant={badge.variant || "secondary"} className="text-xs">
                {badge.text}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center space-x-1">
            {actions}
            
            {showDownload && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                className="h-7 w-7 p-0"
              >
                <Download className="h-3 w-3" />
              </Button>
            )}
            
            {showFullscreen && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFullscreen}
                className="h-7 w-7 p-0"
              >
                <Maximize2 className="h-3 w-3" />
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        {description && (
          <CardDescription className="text-xs">{description}</CardDescription>
        )}
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="relative">
          <AnalyticsChart
            title=""
            data={data}
            type={type}
            dataKey={dataKey}
            xAxisKey={xAxisKey}
            colors={colors}
            height={chartHeight}
          />
          
          {isFullscreen && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleFullscreen}
              className="absolute top-2 right-2 z-10"
            >
              Close
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface ChartGridProps {
  children: React.ReactNode;
  columns?: 1 | 2;
  className?: string;
}

export function ChartGrid({ children, columns = 2, className }: ChartGridProps) {
  return (
    <div className={cn(
      "grid gap-4",
      columns === 1 ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2",
      className
    )}>
      {children}
    </div>
  );
}

interface MobileChartProps extends ResponsiveChartProps {
  compact?: boolean;
}

export function MobileChart({ compact = false, ...props }: MobileChartProps) {
  const height = compact ? 200 : 300;
  
  return (
    <Card className={cn(
      "w-full",
      compact && "border-0 shadow-none bg-transparent",
      props.className
    )}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">{props.title}</CardTitle>
        {props.description && (
          <CardDescription className="text-xs">{props.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <AnalyticsChart
          title=""
          data={props.data}
          type={props.type}
          dataKey={props.dataKey}
          xAxisKey={props.xAxisKey}
          colors={props.colors}
          height={height}
        />
      </CardContent>
    </Card>
  );
}