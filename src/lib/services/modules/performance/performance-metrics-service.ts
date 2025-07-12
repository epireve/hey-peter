/**
 * Performance Metrics Service Module
 * 
 * This module handles general performance metrics tracking including:
 * - Component render times
 * - API response times  
 * - Database query performance
 * - Navigation timing
 * - User interaction response times
 */

import { 
  IPerformanceMetricsService, 
  ServiceDependencies, 
  ServiceContainer, 
  withErrorHandling,
  ServiceError,
  MetricType,
  PerformanceEntry
} from '../../interfaces/service-interfaces';

export class PerformanceMetricsService implements IPerformanceMetricsService {
  readonly serviceName = 'PerformanceMetricsService';
  readonly version = '1.0.0';
  
  private readonly supabase;
  private readonly logger;
  private entries: PerformanceEntry[] = [];
  private maxEntries = 10000;
  private sessionId: string;
  private userId?: string;
  private observers: Record<string, PerformanceObserver> = {};

  private readonly thresholds = {
    slowRender: 16, // 16ms for 60fps
    slowAPI: 1000, // 1 second
    slowQuery: 100, // 100ms
    slowNavigation: 2000, // 2 seconds
    slowInteraction: 200 // 200ms
  };

  constructor(dependencies?: ServiceDependencies) {
    const deps = dependencies || ServiceContainer.getInstance().getDependencies();
    this.supabase = deps.supabase;
    this.logger = deps.logger;
    this.sessionId = this.generateSessionId();
    
    this.initializeUserId();
    this.initializePerformanceTracking();
  }

  async isHealthy(): Promise<boolean> {
    try {
      return typeof performance !== 'undefined';
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * Record a performance metric
   */
  async recordMetric(entry: PerformanceEntry): Promise<void> {
    try {
      // Enhance entry with session data
      const enhancedEntry: PerformanceEntry = {
        ...entry,
        sessionId: this.sessionId,
        userId: this.userId || entry.userId,
        timestamp: entry.timestamp || Date.now(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        url: typeof window !== 'undefined' ? window.location.href : entry.url
      };

      this.entries.push(enhancedEntry);
      
      // Maintain max entries limit
      if (this.entries.length > this.maxEntries) {
        this.entries = this.entries.slice(-this.maxEntries);
      }

      // Check for performance issues
      this.checkPerformanceThresholds(enhancedEntry);

      // Store in database if in production
      if (process.env.NODE_ENV === 'production') {
        await this.storeMetric(enhancedEntry);
      }

      this.logger.debug('Performance metric recorded', {
        name: entry.name,
        type: entry.type,
        duration: entry.duration
      });
    } catch (error) {
      this.logger.error('Failed to record performance metric', { entry, error });
    }
  }

  /**
   * Get performance metrics with filtering
   */
  async getMetrics(filters: {
    type?: MetricType;
    timeRange?: { start: Date; end: Date };
    userId?: string;
    sessionId?: string;
  }): Promise<PerformanceEntry[]> {
    try {
      this.logger.info('Fetching performance metrics', { filters });

      let query = this.supabase
        .from('performance_metrics')
        .select('*')
        .order('timestamp', { ascending: false });

      if (filters.type) {
        query = query.eq('type', filters.type);
      }

      if (filters.timeRange) {
        query = query
          .gte('timestamp', filters.timeRange.start.getTime())
          .lte('timestamp', filters.timeRange.end.getTime());
      }

      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }

      if (filters.sessionId) {
        query = query.eq('session_id', filters.sessionId);
      }

      const { data, error } = await query;

      if (error) {
        // Check if it's a table not found error
        if (error.code === '42P01') {
          this.logger.warn('Performance metrics table does not exist. Returning empty results.');
          return [];
        }
        throw this.createServiceError('FETCH_METRICS_ERROR', 'Failed to fetch metrics', error);
      }

      const metrics = data?.map(m => this.transformMetric(m)) || [];

      this.logger.info('Successfully fetched performance metrics', {
        count: metrics.length,
        filters
      });

      return metrics;
    } catch (error) {
      this.logger.error('Failed to get performance metrics', { filters, error });
      throw error;
    }
  }

  /**
   * Get performance metrics summary
   */
  async getMetricsSummary(timeRange: { start: Date; end: Date }): Promise<{
    averageResponseTime: number;
    totalRequests: number;
    errorRate: number;
    slowestRequests: PerformanceEntry[];
    topErrors: Array<{ message: string; count: number }>;
  }> {
    try {
      this.logger.info('Calculating metrics summary', { timeRange });

      const metrics = await this.getMetrics({ timeRange });

      const summary = {
        averageResponseTime: 0,
        totalRequests: metrics.length,
        errorRate: 0,
        slowestRequests: [] as PerformanceEntry[],
        topErrors: [] as Array<{ message: string; count: number }>
      };

      if (metrics.length === 0) {
        return summary;
      }

      // Calculate average response time
      const totalDuration = metrics.reduce((sum, metric) => sum + metric.duration, 0);
      summary.averageResponseTime = totalDuration / metrics.length;

      // Calculate error rate
      const errorMetrics = metrics.filter(m => m.type === 'error' || m.errorDetails);
      summary.errorRate = (errorMetrics.length / metrics.length) * 100;

      // Get slowest requests (top 10)
      summary.slowestRequests = metrics
        .filter(m => m.type === 'api' || m.type === 'query')
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 10);

      // Get top errors
      const errorCounts: Record<string, number> = {};
      errorMetrics.forEach(metric => {
        const errorMessage = metric.errorDetails?.message || 'Unknown error';
        errorCounts[errorMessage] = (errorCounts[errorMessage] || 0) + 1;
      });

      summary.topErrors = Object.entries(errorCounts)
        .map(([message, count]) => ({ message, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      this.logger.info('Successfully calculated metrics summary', {
        timeRange,
        totalMetrics: metrics.length,
        averageResponseTime: summary.averageResponseTime,
        errorRate: summary.errorRate
      });

      return summary;
    } catch (error) {
      this.logger.error('Failed to calculate metrics summary', { timeRange, error });
      throw error;
    }
  }

  /**
   * Get performance trends
   */
  async getPerformanceTrends(
    timeRange: { start: Date; end: Date },
    interval: 'hour' | 'day' = 'hour'
  ): Promise<{
    trends: Array<{
      timestamp: Date;
      averageResponseTime: number;
      requestCount: number;
      errorRate: number;
    }>;
    insights: Array<{
      type: 'improvement' | 'degradation' | 'anomaly';
      message: string;
      value: number;
      timestamp: Date;
    }>;
  }> {
    try {
      this.logger.info('Calculating performance trends', { timeRange, interval });

      const metrics = await this.getMetrics({ timeRange });

      // Group metrics by time intervals
      const intervalMs = interval === 'hour' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
      const timeGroups: Record<string, PerformanceEntry[]> = {};

      metrics.forEach(metric => {
        const intervalStart = Math.floor(metric.timestamp / intervalMs) * intervalMs;
        const key = intervalStart.toString();
        
        if (!timeGroups[key]) {
          timeGroups[key] = [];
        }
        
        timeGroups[key].push(metric);
      });

      // Calculate trends
      const trends = Object.entries(timeGroups)
        .map(([timestamp, entries]) => {
          const totalDuration = entries.reduce((sum, entry) => sum + entry.duration, 0);
          const errorCount = entries.filter(e => e.type === 'error' || e.errorDetails).length;
          
          return {
            timestamp: new Date(parseInt(timestamp)),
            averageResponseTime: entries.length > 0 ? totalDuration / entries.length : 0,
            requestCount: entries.length,
            errorRate: entries.length > 0 ? (errorCount / entries.length) * 100 : 0
          };
        })
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      // Generate insights
      const insights = this.generatePerformanceInsights(trends);

      this.logger.info('Successfully calculated performance trends', {
        timeRange,
        trendPoints: trends.length,
        insights: insights.length
      });

      return { trends, insights };
    } catch (error) {
      this.logger.error('Failed to calculate performance trends', { timeRange, error });
      throw error;
    }
  }

  /**
   * Record component render time
   */
  recordRenderTime(componentName: string, duration: number, metadata?: Record<string, any>): void {
    this.recordMetric({
      name: componentName,
      type: 'render',
      duration,
      timestamp: Date.now(),
      metadata: {
        ...metadata,
        component: componentName,
        renderType: 'component'
      }
    });
  }

  /**
   * Record API call performance
   */
  recordApiCall(
    endpoint: string,
    method: string,
    duration: number,
    status: number,
    metadata?: Record<string, any>
  ): void {
    this.recordMetric({
      name: `${method} ${endpoint}`,
      type: 'api',
      duration,
      timestamp: Date.now(),
      metadata: {
        ...metadata,
        endpoint,
        method,
        status,
        isError: status >= 400
      },
      errorDetails: status >= 400 ? {
        message: `HTTP ${status} error`,
        stack: `${method} ${endpoint}`
      } : undefined
    });
  }

  /**
   * Record database query performance
   */
  recordDatabaseQuery(
    query: string,
    duration: number,
    tableName: string,
    operation: string,
    metadata?: Record<string, any>
  ): void {
    this.recordMetric({
      name: `${operation} ${tableName}`,
      type: 'query',
      duration,
      timestamp: Date.now(),
      metadata: {
        ...metadata,
        query,
        tableName,
        operation,
        queryType: 'database'
      }
    });
  }

  /**
   * Record navigation timing
   */
  recordNavigation(pageName: string, duration: number, metadata?: Record<string, any>): void {
    this.recordMetric({
      name: `Navigate to ${pageName}`,
      type: 'navigation',
      duration,
      timestamp: Date.now(),
      metadata: {
        ...metadata,
        pageName,
        navigationType: 'page'
      }
    });
  }

  /**
   * Record user interaction response time
   */
  recordInteraction(
    interactionType: string,
    elementType: string,
    duration: number,
    metadata?: Record<string, any>
  ): void {
    this.recordMetric({
      name: `${interactionType} ${elementType}`,
      type: 'interaction',
      duration,
      timestamp: Date.now(),
      metadata: {
        ...metadata,
        interactionType,
        elementType,
        userAction: true
      }
    });
  }

  // Private helper methods

  private generateSessionId(): string {
    return `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async initializeUserId(): Promise<void> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (user) {
        this.userId = user.id;
      }
    } catch (error) {
      this.logger.debug('Could not get user ID for performance tracking:', error);
    }
  }

  private initializePerformanceTracking(): void {
    if (typeof window === 'undefined') return;

    this.initializeNavigationTracking();
    this.initializeLongTaskTracking();
    this.initializeResourceTracking();
  }

  private initializeNavigationTracking(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (entry.entryType === 'navigation') {
          this.recordNavigation('page', entry.duration, {
            domContentLoaded: entry.domContentLoadedEventEnd,
            loadComplete: entry.loadEventEnd,
            redirectCount: entry.redirectCount
          });
        }
      });
    });

    try {
      observer.observe({ entryTypes: ['navigation'] });
      this.observers.navigation = observer;
    } catch (error) {
      this.logger.debug('Navigation tracking not supported:', error);
    }
  }

  private initializeLongTaskTracking(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        this.recordMetric({
          name: 'Long Task',
          type: 'render',
          duration: entry.duration,
          timestamp: entry.startTime,
          metadata: {
            taskType: 'long-task',
            attribution: entry.attribution?.map((attr: any) => ({
              name: attr.name,
              containerType: attr.containerType,
              containerName: attr.containerName
            }))
          }
        });
      });
    });

    try {
      observer.observe({ entryTypes: ['longtask'] });
      this.observers.longtask = observer;
    } catch (error) {
      this.logger.debug('Long task tracking not supported:', error);
    }
  }

  private initializeResourceTracking(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (entry.entryType === 'resource') {
          this.recordMetric({
            name: entry.name,
            type: 'bundle_load',
            duration: entry.duration,
            timestamp: entry.startTime,
            metadata: {
              resourceType: entry.initiatorType,
              transferSize: entry.transferSize,
              encodedBodySize: entry.encodedBodySize,
              decodedBodySize: entry.decodedBodySize,
              cacheStatus: entry.transferSize === 0 ? 'cache' : 'network'
            }
          });
        }
      });
    });

    try {
      observer.observe({ entryTypes: ['resource'] });
      this.observers.resource = observer;
    } catch (error) {
      this.logger.debug('Resource tracking not supported:', error);
    }
  }

  private checkPerformanceThresholds(entry: PerformanceEntry): void {
    const thresholds = {
      render: this.thresholds.slowRender,
      api: this.thresholds.slowAPI,
      query: this.thresholds.slowQuery,
      navigation: this.thresholds.slowNavigation,
      interaction: this.thresholds.slowInteraction
    };

    const threshold = thresholds[entry.type];
    if (threshold && entry.duration > threshold) {
      this.logger.warn('Performance threshold exceeded', {
        name: entry.name,
        type: entry.type,
        duration: entry.duration,
        threshold,
        metadata: entry.metadata
      });
    }
  }

  private generatePerformanceInsights(trends: Array<{
    timestamp: Date;
    averageResponseTime: number;
    requestCount: number;
    errorRate: number;
  }>): Array<{
    type: 'improvement' | 'degradation' | 'anomaly';
    message: string;
    value: number;
    timestamp: Date;
  }> {
    const insights: Array<{
      type: 'improvement' | 'degradation' | 'anomaly';
      message: string;
      value: number;
      timestamp: Date;
    }> = [];

    if (trends.length < 2) return insights;

    // Compare first and last periods
    const firstPeriod = trends[0];
    const lastPeriod = trends[trends.length - 1];

    // Response time trend
    const responseTimeChange = ((lastPeriod.averageResponseTime - firstPeriod.averageResponseTime) / firstPeriod.averageResponseTime) * 100;
    if (Math.abs(responseTimeChange) > 20) { // 20% threshold
      insights.push({
        type: responseTimeChange > 0 ? 'degradation' : 'improvement',
        message: `Response time ${responseTimeChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(responseTimeChange).toFixed(1)}%`,
        value: responseTimeChange,
        timestamp: lastPeriod.timestamp
      });
    }

    // Error rate trend
    const errorRateChange = lastPeriod.errorRate - firstPeriod.errorRate;
    if (Math.abs(errorRateChange) > 2) { // 2% threshold
      insights.push({
        type: errorRateChange > 0 ? 'degradation' : 'improvement',
        message: `Error rate ${errorRateChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(errorRateChange).toFixed(1)}%`,
        value: errorRateChange,
        timestamp: lastPeriod.timestamp
      });
    }

    // Detect anomalies
    const responseTimes = trends.map(t => t.averageResponseTime);
    const average = responseTimes.reduce((sum, val) => sum + val, 0) / responseTimes.length;
    const variance = responseTimes.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / responseTimes.length;
    const stdDev = Math.sqrt(variance);

    trends.forEach((trend, index) => {
      if (Math.abs(trend.averageResponseTime - average) > 2 * stdDev) {
        insights.push({
          type: 'anomaly',
          message: `Unusual response time detected: ${trend.averageResponseTime.toFixed(0)}ms`,
          value: trend.averageResponseTime,
          timestamp: trend.timestamp
        });
      }
    });

    return insights;
  }

  private async storeMetric(entry: PerformanceEntry): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('performance_metrics')
        .insert({
          name: entry.name,
          type: entry.type,
          duration: entry.duration,
          timestamp: entry.timestamp,
          metadata: entry.metadata,
          user_id: entry.userId,
          session_id: entry.sessionId,
          user_agent: entry.userAgent,
          url: entry.url,
          error_details: entry.errorDetails
        });

      if (error) {
        this.logger.error('Failed to store performance metric:', error);
      }
    } catch (error) {
      this.logger.error('Failed to store performance metric:', error);
    }
  }

  private transformMetric(data: any): PerformanceEntry {
    return {
      name: data.name,
      type: data.type,
      duration: data.duration,
      timestamp: data.timestamp,
      metadata: data.metadata,
      userId: data.user_id,
      sessionId: data.session_id,
      userAgent: data.user_agent,
      url: data.url,
      errorDetails: data.error_details
    };
  }

  private createServiceError(code: string, message: string, details?: any): ServiceError {
    return {
      code,
      message,
      details,
      timestamp: new Date(),
      service: this.serviceName
    };
  }

  async dispose(): Promise<void> {
    this.logger.info('Disposing performance metrics service');
    
    // Disconnect all observers
    Object.values(this.observers).forEach(observer => {
      observer?.disconnect();
    });
    
    this.observers = {};
    this.entries = [];
  }
}

// Create and export singleton instance
export const performanceMetricsService = withErrorHandling(new PerformanceMetricsService());