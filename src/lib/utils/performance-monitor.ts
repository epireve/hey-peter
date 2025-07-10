/**
 * Performance monitoring utilities for tracking component render times and API calls
 */

import React from "react";

interface PerformanceEntry {
  name: string;
  type: "render" | "api" | "query";
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private entries: PerformanceEntry[] = [];
  private maxEntries = 1000;
  private isEnabled = process.env.NODE_ENV === "development";

  /**
   * Track component render time
   */
  trackRender(componentName: string, callback: () => void): void {
    if (!this.isEnabled) {
      callback();
      return;
    }

    const start = performance.now();
    callback();
    const duration = performance.now() - start;

    this.addEntry({
      name: componentName,
      type: "render",
      duration,
      timestamp: Date.now(),
    });

    if (duration > 16) {
      // Longer than one frame (60fps)
      console.warn(
        `[Performance] Slow render detected in ${componentName}: ${duration.toFixed(2)}ms`
      );
    }
  }

  /**
   * Track API call duration
   */
  async trackAPI<T>(
    apiName: string,
    apiCall: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    if (!this.isEnabled) {
      return apiCall();
    }

    const start = performance.now();
    try {
      const result = await apiCall();
      const duration = performance.now() - start;

      this.addEntry({
        name: apiName,
        type: "api",
        duration,
        timestamp: Date.now(),
        metadata,
      });

      if (duration > 1000) {
        // Longer than 1 second
        console.warn(
          `[Performance] Slow API call detected for ${apiName}: ${duration.toFixed(2)}ms`,
          metadata
        );
      }

      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.addEntry({
        name: apiName,
        type: "api",
        duration,
        timestamp: Date.now(),
        metadata: { ...metadata, error: true },
      });
      throw error;
    }
  }

  /**
   * Track database query duration
   */
  async trackQuery<T>(
    queryName: string,
    query: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    if (!this.isEnabled) {
      return query();
    }

    const start = performance.now();
    try {
      const result = await query();
      const duration = performance.now() - start;

      this.addEntry({
        name: queryName,
        type: "query",
        duration,
        timestamp: Date.now(),
        metadata,
      });

      if (duration > 100) {
        // Longer than 100ms
        console.warn(
          `[Performance] Slow query detected for ${queryName}: ${duration.toFixed(2)}ms`,
          metadata
        );
      }

      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.addEntry({
        name: queryName,
        type: "query",
        duration,
        timestamp: Date.now(),
        metadata: { ...metadata, error: true },
      });
      throw error;
    }
  }

  /**
   * Get performance statistics
   */
  getStats(type?: PerformanceEntry["type"]) {
    const filteredEntries = type
      ? this.entries.filter((e) => e.type === type)
      : this.entries;

    if (filteredEntries.length === 0) {
      return null;
    }

    const durations = filteredEntries.map((e) => e.duration);
    const sorted = [...durations].sort((a, b) => a - b);

    return {
      count: filteredEntries.length,
      total: durations.reduce((sum, d) => sum + d, 0),
      average: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      min: Math.min(...durations),
      max: Math.max(...durations),
    };
  }

  /**
   * Get slowest operations
   */
  getSlowest(count = 10, type?: PerformanceEntry["type"]) {
    const filteredEntries = type
      ? this.entries.filter((e) => e.type === type)
      : this.entries;

    return filteredEntries
      .sort((a, b) => b.duration - a.duration)
      .slice(0, count)
      .map((entry) => ({
        ...entry,
        duration: `${entry.duration.toFixed(2)}ms`,
      }));
  }

  /**
   * Clear all entries
   */
  clear() {
    this.entries = [];
  }

  /**
   * Export performance data
   */
  export() {
    return {
      entries: this.entries,
      stats: {
        all: this.getStats(),
        render: this.getStats("render"),
        api: this.getStats("api"),
        query: this.getStats("query"),
      },
      slowest: {
        all: this.getSlowest(10),
        render: this.getSlowest(10, "render"),
        api: this.getSlowest(10, "api"),
        query: this.getSlowest(10, "query"),
      },
    };
  }

  private addEntry(entry: PerformanceEntry) {
    this.entries.push(entry);

    // Keep only the most recent entries
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for tracking render performance
export function useRenderTracking(componentName: string) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  const renderStart = performance.now();
  
  // Track on unmount
  React.useEffect(() => {
    return () => {
      const duration = performance.now() - renderStart;
      (performanceMonitor as any).addEntry({
        name: componentName,
        type: "render",
        duration,
        timestamp: Date.now(),
      });
    };
  }, [componentName, renderStart]);
}

// HOC for tracking component performance
export function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  return React.memo((props: P) => {
    useRenderTracking(componentName);
    return React.createElement(Component, props);
  });
}

// Hook for tracking expensive computations
export function useTrackedMemo<T>(
  factory: () => T,
  deps: React.DependencyList,
  name: string
): T {
  return React.useMemo(() => {
    if (process.env.NODE_ENV !== "development") {
      return factory();
    }

    const start = performance.now();
    const result = factory();
    const duration = performance.now() - start;

    if (duration > 10) {
      console.warn(
        `[Performance] Slow computation in ${name}: ${duration.toFixed(2)}ms`
      );
    }

    return result;
  }, deps);
}