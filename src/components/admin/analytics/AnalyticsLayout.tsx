"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AnalyticsLayoutProps {
  children: ReactNode;
  className?: string;
  sidebar?: ReactNode;
  header?: ReactNode;
}

export function AnalyticsLayout({ children, className, sidebar, header }: AnalyticsLayoutProps) {
  return (
    <div className={cn("min-h-screen bg-background", className)}>
      {header && (
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          {header}
        </header>
      )}
      
      <div className="flex">
        {sidebar && (
          <aside className="w-64 border-r bg-card min-h-screen">
            {sidebar}
          </aside>
        )}
        
        <main className="flex-1 overflow-x-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

interface AnalyticsGridProps {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
  className?: string;
}

export function AnalyticsGrid({ children, columns = 4, className }: AnalyticsGridProps) {
  const gridClasses = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
    5: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
    6: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
  };

  return (
    <div className={cn("grid gap-4", gridClasses[columns], className)}>
      {children}
    </div>
  );
}

interface AnalyticsCardGridProps {
  children: ReactNode;
  className?: string;
}

export function AnalyticsCardGrid({ children, className }: AnalyticsCardGridProps) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-7", className)}>
      {children}
    </div>
  );
}

interface AnalyticsSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}

export function AnalyticsSection({ 
  title, 
  description, 
  children, 
  className, 
  actions 
}: AnalyticsSectionProps) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center space-x-2">
            {actions}
          </div>
        )}
      </div>
      {children}
    </section>
  );
}

interface ResponsiveChartContainerProps {
  children: ReactNode;
  className?: string;
  minHeight?: string;
}

export function ResponsiveChartContainer({ 
  children, 
  className, 
  minHeight = "300px" 
}: ResponsiveChartContainerProps) {
  return (
    <div 
      className={cn("w-full overflow-x-auto", className)}
      style={{ minHeight }}
    >
      {children}
    </div>
  );
}