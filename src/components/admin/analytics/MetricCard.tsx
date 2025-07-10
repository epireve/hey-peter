"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  badge?: {
    text: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  };
  progress?: {
    value: number;
    max?: number;
    color?: string;
  };
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  className?: string;
}

export function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  badge,
  progress,
  trend,
  className,
}: MetricCardProps) {
  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="flex items-center space-x-2">
          {badge && (
            <Badge variant={badge.variant || "secondary"}>
              {badge.text}
            </Badge>
          )}
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        
        {progress && (
          <div className="mt-3">
            <Progress 
              value={progress.value} 
              max={progress.max || 100}
              className="h-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{progress.value}%</span>
              <span>{progress.max || 100}%</span>
            </div>
          </div>
        )}
        
        {trend && (
          <div className="mt-2 flex items-center text-xs">
            <span
              className={cn(
                "font-medium",
                trend.isPositive ? "text-green-600" : "text-red-600"
              )}
            >
              {trend.isPositive ? "+" : "-"}{Math.abs(trend.value)}%
            </span>
            <span className="ml-1 text-muted-foreground">
              {trend.label || "from last month"}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}