"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown, ChevronRight } from "lucide-react";

interface MobileAnalyticsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  progress?: {
    value: number;
    max?: number;
    color?: string;
  };
  badge?: {
    text: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  };
  actions?: {
    label: string;
    onClick: () => void;
  }[];
  className?: string;
  compact?: boolean;
}

export function MobileAnalyticsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  progress,
  badge,
  actions,
  className,
  compact = false,
}: MobileAnalyticsCardProps) {
  const TrendIcon = trend?.isPositive ? TrendingUp : TrendingDown;

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className={cn("pb-3", compact && "pb-2")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
            <CardTitle className={cn("text-sm font-medium", compact && "text-xs")}>
              {title}
            </CardTitle>
          </div>
          {badge && (
            <Badge variant={badge.variant || "secondary"} className="text-xs">
              {badge.text}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className={cn("pt-0", compact && "pb-3")}>
        <div className="space-y-3">
          {/* Main Value */}
          <div className="flex items-baseline justify-between">
            <div className={cn("text-2xl font-bold", compact && "text-xl")}>
              {value}
            </div>
            {trend && (
              <div className="flex items-center text-xs">
                <TrendIcon className={cn(
                  "h-3 w-3 mr-1",
                  trend.isPositive ? "text-green-600" : "text-red-600"
                )} />
                <span className={cn(
                  "font-medium",
                  trend.isPositive ? "text-green-600" : "text-red-600"
                )}>
                  {trend.isPositive ? "+" : ""}{trend.value}%
                </span>
              </div>
            )}
          </div>

          {/* Description */}
          {description && !compact && (
            <CardDescription className="text-xs">{description}</CardDescription>
          )}

          {/* Progress Bar */}
          {progress && (
            <div className="space-y-1">
              <Progress 
                value={progress.value} 
                max={progress.max || 100}
                className="h-1.5"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{progress.value}%</span>
                <span>Target: {progress.max || 100}%</span>
              </div>
            </div>
          )}

          {/* Trend Label */}
          {trend?.label && !compact && (
            <p className="text-xs text-muted-foreground">{trend.label}</p>
          )}

          {/* Actions */}
          {actions && !compact && (
            <div className="flex flex-wrap gap-2 pt-2">
              {actions.map((action, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  onClick={action.onClick}
                  className="h-7 px-2 text-xs"
                >
                  {action.label}
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface MobileAnalyticsGridProps {
  children: React.ReactNode;
  columns?: 1 | 2;
  className?: string;
}

export function MobileAnalyticsGrid({ 
  children, 
  columns = 2, 
  className 
}: MobileAnalyticsGridProps) {
  return (
    <div className={cn(
      "grid gap-3",
      columns === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2",
      className
    )}>
      {children}
    </div>
  );
}