/**
 * Performance monitoring utilities for code splitting and bundle analysis
 */

interface BundleMetrics {
  bundleSize: number;
  chunkCount: number;
  loadTime: number;
  memoryUsage?: {
    used: number;
    total: number;
    limit: number;
  };
}

interface ComponentLoadMetrics {
  componentName: string;
  loadTime: number;
  chunkSize?: number;
  errorCount: number;
  cacheHit: boolean;
}

class PerformanceMonitor {
  private metrics: ComponentLoadMetrics[] = [];
  private bundleMetrics: BundleMetrics[] = [];
  private loadStartTimes: Map<string, number> = new Map();

  // Start timing a component load
  startComponentLoad(componentName: string): void {
    this.loadStartTimes.set(componentName, performance.now());
  }

  // End timing a component load
  endComponentLoad(componentName: string, error?: boolean): void {
    const startTime = this.loadStartTimes.get(componentName);
    if (!startTime) return;

    const loadTime = performance.now() - startTime;
    this.loadStartTimes.delete(componentName);

    const existingMetric = this.metrics.find(m => m.componentName === componentName);
    if (existingMetric) {
      existingMetric.loadTime = (existingMetric.loadTime + loadTime) / 2; // Average
      if (error) existingMetric.errorCount++;
    } else {
      this.metrics.push({
        componentName,
        loadTime,
        errorCount: error ? 1 : 0,
        cacheHit: loadTime < 50 // Assume cache hit if very fast
      });
    }
  }

  // Record bundle metrics
  recordBundleMetrics(): void {
    if (typeof window === 'undefined') return;

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const loadTime = navigation.loadEventEnd - navigation.navigationStart;

    const bundleMetric: BundleMetrics = {
      bundleSize: this.estimateBundleSize(),
      chunkCount: this.getChunkCount(),
      loadTime,
    };

    // Add memory usage if available
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      bundleMetric.memoryUsage = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit
      };
    }

    this.bundleMetrics.push(bundleMetric);
  }

  // Estimate bundle size from loaded scripts
  private estimateBundleSize(): number {
    if (typeof window === 'undefined') return 0;

    const scripts = Array.from(document.scripts);
    let totalSize = 0;

    scripts.forEach(script => {
      if (script.src && script.src.includes('chunk')) {
        // Estimate based on typical chunk sizes
        if (script.src.includes('vendor')) totalSize += 500000; // ~500KB
        else if (script.src.includes('admin')) totalSize += 200000; // ~200KB
        else if (script.src.includes('student')) totalSize += 150000; // ~150KB
        else if (script.src.includes('teacher')) totalSize += 150000; // ~150KB
        else if (script.src.includes('analytics')) totalSize += 100000; // ~100KB
        else totalSize += 50000; // ~50KB for other chunks
      }
    });

    return totalSize;
  }

  // Count loaded chunks
  private getChunkCount(): number {
    if (typeof window === 'undefined') return 0;

    return Array.from(document.scripts)
      .filter(script => script.src && script.src.includes('chunk'))
      .length;
  }

  // Get performance report
  getPerformanceReport(): {
    componentMetrics: ComponentLoadMetrics[];
    bundleMetrics: BundleMetrics[];
    summary: {
      averageComponentLoadTime: number;
      slowestComponent: string;
      fastestComponent: string;
      totalErrorCount: number;
      cacheHitRate: number;
      estimatedBundleSavings: string;
    };
  } {
    const componentMetrics = [...this.metrics];
    const bundleMetrics = [...this.bundleMetrics];

    // Calculate summary statistics
    const loadTimes = componentMetrics.map(m => m.loadTime);
    const averageComponentLoadTime = loadTimes.length > 0 
      ? loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length 
      : 0;

    const slowestComponent = componentMetrics.reduce((prev, current) => 
      current.loadTime > prev.loadTime ? current : prev, 
      componentMetrics[0]
    )?.componentName || 'None';

    const fastestComponent = componentMetrics.reduce((prev, current) => 
      current.loadTime < prev.loadTime ? current : prev, 
      componentMetrics[0]
    )?.componentName || 'None';

    const totalErrorCount = componentMetrics.reduce((sum, m) => sum + m.errorCount, 0);
    const cacheHitRate = componentMetrics.length > 0 
      ? componentMetrics.filter(m => m.cacheHit).length / componentMetrics.length 
      : 0;

    return {
      componentMetrics,
      bundleMetrics,
      summary: {
        averageComponentLoadTime,
        slowestComponent,
        fastestComponent,
        totalErrorCount,
        cacheHitRate,
        estimatedBundleSavings: this.calculateBundleSavings()
      }
    };
  }

  // Calculate estimated bundle savings from code splitting
  private calculateBundleSavings(): string {
    const estimatedSavings = {
      recharts: 200,      // KB
      xlsx: 100,          // KB
      reactTable: 80,     // KB
      dateFns: 50,        // KB
      icons: 30,          // KB
      adminComponents: 150, // KB
      studentComponents: 120, // KB
      teacherComponents: 120, // KB
      analyticsComponents: 100, // KB
    };

    const totalSavings = Object.values(estimatedSavings).reduce((a, b) => a + b, 0);
    return `~${totalSavings}KB`;
  }

  // Log performance metrics to console (development only)
  logMetrics(): void {
    if (process.env.NODE_ENV !== 'development') return;

    const report = this.getPerformanceReport();
    
    console.group('🚀 Performance Metrics');
    console.log('📊 Component Load Times:', report.componentMetrics);
    console.log('📦 Bundle Metrics:', report.bundleMetrics);
    console.log('📈 Summary:', report.summary);
    console.groupEnd();
  }

  // Monitor Core Web Vitals
  measureCoreWebVitals(): void {
    if (typeof window === 'undefined') return;

    // Largest Contentful Paint (LCP)
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      console.log('LCP:', lastEntry.startTime);
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay (FID)
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach(entry => {
        console.log('FID:', entry.processingStart - entry.startTime);
      });
    }).observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach(entry => {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      });
      console.log('CLS:', clsValue);
    }).observe({ entryTypes: ['layout-shift'] });
  }

  // Monitor chunk loading
  monitorChunkLoads(): void {
    if (typeof window === 'undefined') return;

    // Monitor script loads
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (element.tagName === 'SCRIPT' && element.getAttribute('src')?.includes('chunk')) {
              const chunkName = this.extractChunkName(element.getAttribute('src') || '');
              console.log(`📦 Chunk loaded: ${chunkName}`);
            }
          }
        });
      });
    });

    observer.observe(document.head, { childList: true });
  }

  // Extract chunk name from script src
  private extractChunkName(src: string): string {
    const match = src.match(/([^\/]+)\.chunk\.js$/);
    return match ? match[1] : 'unknown';
  }

  // Clear metrics
  clearMetrics(): void {
    this.metrics = [];
    this.bundleMetrics = [];
    this.loadStartTimes.clear();
  }

  // Export metrics for analysis
  exportMetrics(): string {
    const report = this.getPerformanceReport();
    return JSON.stringify(report, null, 2);
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Higher-order component to automatically track component load times
export function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  const WrappedComponent = (props: P) => {
    const name = componentName || Component.displayName || Component.name;
    
    React.useEffect(() => {
      performanceMonitor.startComponentLoad(name);
      
      return () => {
        performanceMonitor.endComponentLoad(name);
      };
    }, [name]);

    return React.createElement(Component, props);
  };

  WrappedComponent.displayName = `withPerformanceTracking(${
    Component.displayName || Component.name
  })`;

  return WrappedComponent;
}

// Hook for component-level performance tracking
export function usePerformanceTracking(componentName: string) {
  React.useEffect(() => {
    performanceMonitor.startComponentLoad(componentName);
    
    return () => {
      performanceMonitor.endComponentLoad(componentName);
    };
  }, [componentName]);
}

// Initialize performance monitoring
export function initializePerformanceMonitoring(): void {
  if (typeof window === 'undefined') return;

  // Start monitoring when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      performanceMonitor.recordBundleMetrics();
      performanceMonitor.measureCoreWebVitals();
      performanceMonitor.monitorChunkLoads();
    });
  } else {
    performanceMonitor.recordBundleMetrics();
    performanceMonitor.measureCoreWebVitals();
    performanceMonitor.monitorChunkLoads();
  }

  // Log metrics after 5 seconds
  setTimeout(() => {
    performanceMonitor.logMetrics();
  }, 5000);
}

export default performanceMonitor;