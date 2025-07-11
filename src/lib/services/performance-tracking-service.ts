import { loggingService, LogCategory } from './logging-service';
import { errorTrackingService } from './error-tracking-service';

import { logger } from '@/lib/services';
export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: string;
  context?: Record<string, any>;
  threshold?: number;
  category: PerformanceCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  tags?: string[];
}

export enum PerformanceCategory {
  RENDERING = 'rendering',
  API_RESPONSE = 'api_response',
  DATABASE_QUERY = 'database_query',
  BUNDLE_SIZE = 'bundle_size',
  MEMORY_USAGE = 'memory_usage',
  CPU_USAGE = 'cpu_usage',
  NETWORK = 'network',
  USER_INTERACTION = 'user_interaction',
  PAGE_LOAD = 'page_load',
  CUSTOM = 'custom'
}

export interface PerformanceThreshold {
  name: string;
  category: PerformanceCategory;
  warning: number;
  critical: number;
  unit: string;
}

export interface PerformanceAlert {
  id: string;
  metricId: string;
  threshold: PerformanceThreshold;
  actualValue: number;
  severity: 'warning' | 'critical';
  timestamp: string;
  context?: Record<string, any>;
  resolved: boolean;
}

export interface PerformanceReport {
  period: { start: string; end: string };
  summary: {
    totalMetrics: number;
    alerts: number;
    avgResponseTime: number;
    slowestEndpoints: Array<{ endpoint: string; avgTime: number }>;
    performanceScore: number;
  };
  categories: Record<PerformanceCategory, {
    count: number;
    avgValue: number;
    violations: number;
  }>;
  trends: Array<{
    timestamp: string;
    category: PerformanceCategory;
    avgValue: number;
  }>;
}

class PerformanceTrackingService {
  private metrics: PerformanceMetric[] = [];
  private alerts: PerformanceAlert[] = [];
  private maxMetricsBuffer = 1000;
  private observer?: PerformanceObserver;

  // Default performance thresholds
  private defaultThresholds: PerformanceThreshold[] = [
    { name: 'api_response_time', category: PerformanceCategory.API_RESPONSE, warning: 1000, critical: 3000, unit: 'ms' },
    { name: 'database_query_time', category: PerformanceCategory.DATABASE_QUERY, warning: 500, critical: 2000, unit: 'ms' },
    { name: 'page_load_time', category: PerformanceCategory.PAGE_LOAD, warning: 2000, critical: 5000, unit: 'ms' },
    { name: 'first_contentful_paint', category: PerformanceCategory.RENDERING, warning: 1500, critical: 3000, unit: 'ms' },
    { name: 'largest_contentful_paint', category: PerformanceCategory.RENDERING, warning: 2500, critical: 4000, unit: 'ms' },
    { name: 'cumulative_layout_shift', category: PerformanceCategory.RENDERING, warning: 0.1, critical: 0.25, unit: 'score' },
    { name: 'first_input_delay', category: PerformanceCategory.USER_INTERACTION, warning: 100, critical: 300, unit: 'ms' },
    { name: 'bundle_size', category: PerformanceCategory.BUNDLE_SIZE, warning: 500, critical: 1000, unit: 'kb' },
    { name: 'memory_usage', category: PerformanceCategory.MEMORY_USAGE, warning: 50, critical: 100, unit: 'mb' }
  ];

  private thresholds: Map<string, PerformanceThreshold> = new Map();

  constructor() {
    // Initialize thresholds
    this.defaultThresholds.forEach(threshold => {
      this.thresholds.set(threshold.name, threshold);
    });

    // Setup browser performance monitoring
    if (typeof window !== 'undefined') {
      this.setupBrowserMonitoring();
    }
  }

  private setupBrowserMonitoring(): void {
    // Monitor Web Vitals
    this.setupWebVitalsMonitoring();
    
    // Monitor navigation timing
    this.setupNavigationTimingMonitoring();
    
    // Monitor resource loading
    this.setupResourceTimingMonitoring();
    
    // Monitor long tasks
    this.setupLongTaskMonitoring();
    
    // Monitor memory usage
    this.setupMemoryMonitoring();
  }

  private setupWebVitalsMonitoring(): void {
    // First Contentful Paint
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          this.recordMetric('first_contentful_paint', entry.startTime, PerformanceCategory.RENDERING, {
            entryType: entry.entryType
          });
        }
      });
    }).observe({ entryTypes: ['paint'] });

    // Largest Contentful Paint
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        this.recordMetric('largest_contentful_paint', lastEntry.startTime, PerformanceCategory.RENDERING, {
          element: (lastEntry as any).element?.tagName,
          size: (lastEntry as any).size
        });
      }
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // Cumulative Layout Shift
    let clsValue = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as any[]) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
      this.recordMetric('cumulative_layout_shift', clsValue, PerformanceCategory.RENDERING);
    }).observe({ entryTypes: ['layout-shift'] });

    // First Input Delay
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        this.recordMetric('first_input_delay', entry.processingStart - entry.startTime, PerformanceCategory.USER_INTERACTION, {
          eventType: entry.name,
          target: entry.target?.tagName
        });
      });
    }).observe({ entryTypes: ['first-input'] });
  }

  private setupNavigationTimingMonitoring(): void {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          // DNS lookup time
          this.recordMetric('dns_lookup', navigation.domainLookupEnd - navigation.domainLookupStart, PerformanceCategory.NETWORK);
          
          // Connection time
          this.recordMetric('connection_time', navigation.connectEnd - navigation.connectStart, PerformanceCategory.NETWORK);
          
          // Server response time
          this.recordMetric('server_response_time', navigation.responseEnd - navigation.requestStart, PerformanceCategory.API_RESPONSE);
          
          // DOM content loaded
          this.recordMetric('dom_content_loaded', navigation.domContentLoadedEventEnd - navigation.navigationStart, PerformanceCategory.PAGE_LOAD);
          
          // Page load time
          this.recordMetric('page_load_time', navigation.loadEventEnd - navigation.navigationStart, PerformanceCategory.PAGE_LOAD);
        }
      }, 0);
    });
  }

  private setupResourceTimingMonitoring(): void {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: PerformanceResourceTiming) => {
        const duration = entry.responseEnd - entry.startTime;
        const resourceType = this.getResourceType(entry.name);
        
        this.recordMetric(`resource_load_${resourceType}`, duration, PerformanceCategory.NETWORK, {
          url: entry.name,
          size: entry.transferSize,
          cached: entry.transferSize === 0
        });
      });
    }).observe({ entryTypes: ['resource'] });
  }

  private setupLongTaskMonitoring(): void {
    if ('PerformanceObserver' in window) {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          this.recordMetric('long_task', entry.duration, PerformanceCategory.USER_INTERACTION, {
            startTime: entry.startTime,
            attribution: (entry as any).attribution
          });
        });
      }).observe({ entryTypes: ['longtask'] });
    }
  }

  private setupMemoryMonitoring(): void {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        this.recordMetric('memory_used', memory.usedJSHeapSize / 1024 / 1024, PerformanceCategory.MEMORY_USAGE, {
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit
        });
      }, 30000); // Every 30 seconds
    }
  }

  private getResourceType(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'js': return 'script';
      case 'css': return 'stylesheet';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'webp':
      case 'svg': return 'image';
      case 'woff':
      case 'woff2':
      case 'ttf':
      case 'otf': return 'font';
      default: return 'other';
    }
  }

  // Record a performance metric
  recordMetric(
    name: string,
    value: number,
    category: PerformanceCategory,
    context?: Record<string, any>,
    unit: string = 'ms'
  ): void {
    const id = this.generateMetricId();
    const timestamp = new Date().toISOString();
    const threshold = this.thresholds.get(name);
    
    let severity: PerformanceMetric['severity'] = 'low';
    if (threshold) {
      if (value >= threshold.critical) {
        severity = 'critical';
      } else if (value >= threshold.warning) {
        severity = 'high';
      } else if (value >= threshold.warning * 0.7) {
        severity = 'medium';
      }
    }

    const metric: PerformanceMetric = {
      id,
      name,
      value,
      unit,
      timestamp,
      context,
      threshold: threshold?.warning,
      category,
      severity,
      tags: context?.tags
    };

    this.metrics.push(metric);

    // Maintain buffer size
    if (this.metrics.length > this.maxMetricsBuffer) {
      this.metrics = this.metrics.slice(-this.maxMetricsBuffer);
    }

    // Log performance metric
    loggingService.logPerformanceMetric(name, value, unit, {
      category,
      severity,
      ...context
    });

    // Check for threshold violations
    if (threshold && (value >= threshold.warning)) {
      this.handleThresholdViolation(metric, threshold);
    }

    // Store metric in database for analysis
    this.storeMetric(metric);
  }

  private generateMetricId(): string {
    return `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private handleThresholdViolation(metric: PerformanceMetric, threshold: PerformanceThreshold): void {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const severity = metric.value >= threshold.critical ? 'critical' : 'warning';

    const alert: PerformanceAlert = {
      id: alertId,
      metricId: metric.id,
      threshold,
      actualValue: metric.value,
      severity,
      timestamp: metric.timestamp,
      context: metric.context,
      resolved: false
    };

    this.alerts.push(alert);

    // Log alert
    const logLevel = severity === 'critical' ? 'error' : 'warn';
    const message = `Performance ${severity}: ${metric.name} (${metric.value}${metric.unit}) exceeded ${threshold[severity]} threshold`;

    if (logLevel === 'error') {
      loggingService.error(LogCategory.PERFORMANCE, message, {
        alertId,
        metricId: metric.id,
        threshold: threshold[severity],
        actualValue: metric.value,
        ...metric.context
      });
    } else {
      loggingService.warn(LogCategory.PERFORMANCE, message, {
        alertId,
        metricId: metric.id,
        threshold: threshold[severity],
        actualValue: metric.value,
        ...metric.context
      });
    }

    // Track performance issue
    errorTrackingService.capturePerformanceIssue(
      metric.name,
      metric.value,
      threshold[severity],
      {
        category: metric.category,
        severity,
        alertId
      }
    );
  }

  private async storeMetric(metric: PerformanceMetric): Promise<void> {
    try {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();

      await supabase
        .from('performance_metrics')
        .insert({
          id: metric.id,
          name: metric.name,
          value: metric.value,
          unit: metric.unit,
          category: metric.category,
          severity: metric.severity,
          context: metric.context,
          threshold: metric.threshold,
          tags: metric.tags,
          timestamp: metric.timestamp
        });
    } catch (error) {
      logger.error('Failed to store performance metric:', error);
    }
  }

  // API response time tracking
  trackAPIResponse(endpoint: string, method: string, duration: number, statusCode: number, context?: Record<string, any>): void {
    this.recordMetric('api_response_time', duration, PerformanceCategory.API_RESPONSE, {
      endpoint,
      method,
      statusCode,
      ...context
    });
  }

  // Database query tracking
  trackDatabaseQuery(query: string, duration: number, context?: Record<string, any>): void {
    this.recordMetric('database_query_time', duration, PerformanceCategory.DATABASE_QUERY, {
      query: query.substring(0, 100), // Truncate for privacy
      ...context
    });
  }

  // Custom metric tracking
  trackCustomMetric(name: string, value: number, unit: string, context?: Record<string, any>): void {
    this.recordMetric(name, value, PerformanceCategory.CUSTOM, context, unit);
  }

  // Bundle size tracking
  trackBundleSize(bundleName: string, size: number): void {
    this.recordMetric('bundle_size', size / 1024, PerformanceCategory.BUNDLE_SIZE, {
      bundleName
    }, 'kb');
  }

  // Set custom threshold
  setThreshold(name: string, category: PerformanceCategory, warning: number, critical: number, unit: string): void {
    this.thresholds.set(name, {
      name,
      category,
      warning,
      critical,
      unit
    });
  }

  // Get performance report
  async getPerformanceReport(startDate?: Date, endDate?: Date): Promise<PerformanceReport> {
    const start = startDate || new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    const end = endDate || new Date();

    try {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();

      const { data: metrics } = await supabase
        .from('performance_metrics')
        .select('*')
        .gte('timestamp', start.toISOString())
        .lte('timestamp', end.toISOString());

      if (!metrics) return this.getEmptyReport(start, end);

      // Calculate summary
      const totalMetrics = metrics.length;
      const alerts = metrics.filter(m => m.severity === 'high' || m.severity === 'critical').length;
      const apiResponseMetrics = metrics.filter(m => m.name === 'api_response_time');
      const avgResponseTime = apiResponseMetrics.length > 0 
        ? apiResponseMetrics.reduce((sum, m) => sum + m.value, 0) / apiResponseMetrics.length 
        : 0;

      // Calculate slowest endpoints
      const endpointGroups = new Map<string, number[]>();
      apiResponseMetrics.forEach(metric => {
        const endpoint = metric.context?.endpoint || 'unknown';
        if (!endpointGroups.has(endpoint)) {
          endpointGroups.set(endpoint, []);
        }
        endpointGroups.get(endpoint)!.push(metric.value);
      });

      const slowestEndpoints = Array.from(endpointGroups.entries())
        .map(([endpoint, times]) => ({
          endpoint,
          avgTime: times.reduce((sum, time) => sum + time, 0) / times.length
        }))
        .sort((a, b) => b.avgTime - a.avgTime)
        .slice(0, 10);

      // Calculate performance score (0-100)
      const performanceScore = this.calculatePerformanceScore(metrics);

      // Calculate categories breakdown
      const categories: Record<PerformanceCategory, { count: number; avgValue: number; violations: number }> = {} as any;
      Object.values(PerformanceCategory).forEach(category => {
        const categoryMetrics = metrics.filter(m => m.category === category);
        categories[category] = {
          count: categoryMetrics.length,
          avgValue: categoryMetrics.length > 0 
            ? categoryMetrics.reduce((sum, m) => sum + m.value, 0) / categoryMetrics.length 
            : 0,
          violations: categoryMetrics.filter(m => m.severity === 'high' || m.severity === 'critical').length
        };
      });

      // Generate trends (simplified)
      const trends = this.generatePerformanceTrends(metrics, start, end);

      return {
        period: { start: start.toISOString(), end: end.toISOString() },
        summary: {
          totalMetrics,
          alerts,
          avgResponseTime,
          slowestEndpoints,
          performanceScore
        },
        categories,
        trends
      };
    } catch (error) {
      logger.error('Failed to generate performance report:', error);
      return this.getEmptyReport(start, end);
    }
  }

  private calculatePerformanceScore(metrics: PerformanceMetric[]): number {
    if (metrics.length === 0) return 100;

    const weights = {
      low: 1,
      medium: 0.8,
      high: 0.5,
      critical: 0.2
    };

    const totalWeight = metrics.reduce((sum, metric) => sum + weights[metric.severity], 0);
    const maxPossibleWeight = metrics.length * weights.low;

    return Math.round((totalWeight / maxPossibleWeight) * 100);
  }

  private generatePerformanceTrends(metrics: PerformanceMetric[], start: Date, end: Date): Array<{ timestamp: string; category: PerformanceCategory; avgValue: number }> {
    // This is a simplified implementation
    const trends: Array<{ timestamp: string; category: PerformanceCategory; avgValue: number }> = [];
    const hours = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60));

    for (let i = 0; i < Math.min(hours, 24); i++) {
      const hourStart = new Date(start.getTime() + i * 60 * 60 * 1000);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);

      Object.values(PerformanceCategory).forEach(category => {
        const hourMetrics = metrics.filter(m => {
          const metricTime = new Date(m.timestamp);
          return metricTime >= hourStart && metricTime < hourEnd && m.category === category;
        });

        if (hourMetrics.length > 0) {
          const avgValue = hourMetrics.reduce((sum, m) => sum + m.value, 0) / hourMetrics.length;
          trends.push({
            timestamp: hourStart.toISOString(),
            category,
            avgValue
          });
        }
      });
    }

    return trends;
  }

  private getEmptyReport(start: Date, end: Date): PerformanceReport {
    const categories: Record<PerformanceCategory, { count: number; avgValue: number; violations: number }> = {} as any;
    Object.values(PerformanceCategory).forEach(category => {
      categories[category] = { count: 0, avgValue: 0, violations: 0 };
    });

    return {
      period: { start: start.toISOString(), end: end.toISOString() },
      summary: {
        totalMetrics: 0,
        alerts: 0,
        avgResponseTime: 0,
        slowestEndpoints: [],
        performanceScore: 100
      },
      categories,
      trends: []
    };
  }

  // Get current metrics
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  // Get current alerts
  getAlerts(): PerformanceAlert[] {
    return [...this.alerts];
  }

  // Clear metrics buffer
  clearMetrics(): void {
    this.metrics = [];
  }

  // Resolve alert
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      loggingService.info(LogCategory.PERFORMANCE, `Performance alert resolved: ${alertId}`);
    }
  }
}

// Export singleton instance
export const performanceTrackingService = new PerformanceTrackingService();
export default performanceTrackingService;