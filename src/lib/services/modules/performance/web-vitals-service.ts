/**
 * Web Vitals Service Module
 * 
 * This module handles Core Web Vitals tracking and analysis including:
 * - LCP (Largest Contentful Paint)
 * - FID (First Input Delay)
 * - CLS (Cumulative Layout Shift)
 * - TTFB (Time to First Byte)
 * - FCP (First Contentful Paint)
 * - TTI (Time to Interactive)
 */

import { 
  IWebVitalsService, 
  ServiceDependencies, 
  ServiceContainer, 
  withErrorHandling,
  ServiceError,
  WebVitalType
} from '../../interfaces/service-interfaces';

export interface WebVitalEntry {
  id: string;
  name: WebVitalType;
  value: number;
  delta: number;
  timestamp: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  url: string;
  sessionId: string;
  userId?: string;
  metadata?: Record<string, any>;
}

interface PerformanceBenchmark {
  metric: string;
  good: number;
  needsImprovement: number;
  poor: number;
}

export class WebVitalsService implements IWebVitalsService {
  readonly serviceName = 'WebVitalsService';
  readonly version = '1.0.0';
  
  private readonly supabase;
  private readonly logger;
  private webVitalEntries: WebVitalEntry[] = [];
  private maxEntries = 1000;
  private sessionId: string;
  private userId?: string;
  private observers: Record<string, PerformanceObserver> = {};

  private readonly benchmarks: Record<WebVitalType, PerformanceBenchmark> = {
    LCP: { metric: 'Largest Contentful Paint', good: 2500, needsImprovement: 4000, poor: Infinity },
    FID: { metric: 'First Input Delay', good: 100, needsImprovement: 300, poor: Infinity },
    CLS: { metric: 'Cumulative Layout Shift', good: 0.1, needsImprovement: 0.25, poor: Infinity },
    TTFB: { metric: 'Time to First Byte', good: 600, needsImprovement: 1500, poor: Infinity },
    FCP: { metric: 'First Contentful Paint', good: 1800, needsImprovement: 3000, poor: Infinity },
    TTI: { metric: 'Time to Interactive', good: 3800, needsImprovement: 7300, poor: Infinity }
  };

  constructor(dependencies?: ServiceDependencies) {
    const deps = dependencies || ServiceContainer.getInstance().getDependencies();
    this.supabase = deps.supabase;
    this.logger = deps.logger;
    this.sessionId = this.generateSessionId();
    
    this.initializeUserId();
    this.initializeWebVitalsTracking();
  }

  async isHealthy(): Promise<boolean> {
    try {
      return typeof window !== 'undefined' && 'PerformanceObserver' in window;
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * Record a web vital measurement
   */
  async recordWebVital(type: WebVitalType, value: number, metadata?: Record<string, any>): Promise<void> {
    try {
      const entry: WebVitalEntry = {
        id: this.generateId(),
        name: type,
        value,
        delta: value,
        timestamp: Date.now(),
        rating: this.getRating(type, value),
        url: typeof window !== 'undefined' ? window.location.href : '',
        sessionId: this.sessionId,
        userId: this.userId,
        metadata
      };

      this.webVitalEntries.push(entry);
      
      // Maintain max entries limit
      if (this.webVitalEntries.length > this.maxEntries) {
        this.webVitalEntries = this.webVitalEntries.slice(-this.maxEntries);
      }

      // Store in database if in production
      if (process.env.NODE_ENV === 'production') {
        await this.storeWebVital(entry);
      }

      this.logger.debug('Web vital recorded', { type, value, rating: entry.rating });
    } catch (error) {
      this.logger.error('Failed to record web vital', { type, value, error });
    }
  }

  /**
   * Get web vitals summary for a time range
   */
  async getWebVitals(timeRange: { start: Date; end: Date }): Promise<{
    LCP: { average: number; p75: number; p95: number };
    FID: { average: number; p75: number; p95: number };
    CLS: { average: number; p75: number; p95: number };
    TTFB: { average: number; p75: number; p95: number };
    FCP: { average: number; p75: number; p95: number };
    TTI: { average: number; p75: number; p95: number };
  }> {
    try {
      this.logger.info('Getting web vitals summary', { timeRange });

      const { data: vitals, error } = await this.supabase
        .from('web_vitals')
        .select('*')
        .gte('timestamp', timeRange.start.getTime())
        .lte('timestamp', timeRange.end.getTime())
        .order('timestamp', { ascending: false });

      if (error) {
        throw this.createServiceError('FETCH_VITALS_ERROR', 'Failed to fetch web vitals', error);
      }

      const summary = {
        LCP: { average: 0, p75: 0, p95: 0 },
        FID: { average: 0, p75: 0, p95: 0 },
        CLS: { average: 0, p75: 0, p95: 0 },
        TTFB: { average: 0, p75: 0, p95: 0 },
        FCP: { average: 0, p75: 0, p95: 0 },
        TTI: { average: 0, p75: 0, p95: 0 }
      };

      // Group by metric type
      const metricGroups: Record<WebVitalType, number[]> = {
        LCP: [],
        FID: [],
        CLS: [],
        TTFB: [],
        FCP: [],
        TTI: []
      };

      vitals?.forEach(vital => {
        if (metricGroups[vital.name as WebVitalType]) {
          metricGroups[vital.name as WebVitalType].push(vital.value);
        }
      });

      // Calculate statistics for each metric
      Object.keys(metricGroups).forEach(metric => {
        const values = metricGroups[metric as WebVitalType];
        if (values.length > 0) {
          const sorted = values.sort((a, b) => a - b);
          summary[metric as WebVitalType] = {
            average: values.reduce((sum, val) => sum + val, 0) / values.length,
            p75: this.getPercentile(sorted, 75),
            p95: this.getPercentile(sorted, 95)
          };
        }
      });

      this.logger.info('Successfully calculated web vitals summary', {
        timeRange,
        totalVitals: vitals?.length || 0
      });

      return summary;
    } catch (error) {
      this.logger.error('Failed to get web vitals summary', { timeRange, error });
      throw error;
    }
  }

  /**
   * Check if current web vitals meet thresholds
   */
  async checkWebVitalThresholds(): Promise<{
    healthy: boolean;
    alerts: Array<{ metric: WebVitalType; value: number; threshold: number }>;
  }> {
    try {
      this.logger.info('Checking web vital thresholds');

      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const recentVitals = await this.getWebVitals({ start: oneHourAgo, end: now });
      const alerts: Array<{ metric: WebVitalType; value: number; threshold: number }> = [];

      // Check each vital against thresholds
      Object.keys(recentVitals).forEach(metric => {
        const vitalType = metric as WebVitalType;
        const stats = recentVitals[vitalType];
        const benchmark = this.benchmarks[vitalType];

        // Use P75 value for threshold checking
        if (stats.p75 > benchmark.needsImprovement) {
          alerts.push({
            metric: vitalType,
            value: stats.p75,
            threshold: benchmark.needsImprovement
          });
        }
      });

      const healthy = alerts.length === 0;

      this.logger.info('Web vital threshold check completed', {
        healthy,
        alertCount: alerts.length
      });

      return { healthy, alerts };
    } catch (error) {
      this.logger.error('Failed to check web vital thresholds', { error });
      return { healthy: false, alerts: [] };
    }
  }

  /**
   * Get web vitals trends
   */
  async getWebVitalTrends(timeRange: { start: Date; end: Date }, interval: 'hour' | 'day' = 'hour'): Promise<{
    trends: Array<{
      timestamp: Date;
      LCP: number;
      FID: number;
      CLS: number;
      TTFB: number;
      FCP: number;
      TTI: number;
    }>;
    improvements: Array<{
      metric: WebVitalType;
      change: number;
      trend: 'improving' | 'degrading' | 'stable';
    }>;
  }> {
    try {
      this.logger.info('Getting web vitals trends', { timeRange, interval });

      const { data: vitals, error } = await this.supabase
        .from('web_vitals')
        .select('*')
        .gte('timestamp', timeRange.start.getTime())
        .lte('timestamp', timeRange.end.getTime())
        .order('timestamp', { ascending: true });

      if (error) {
        throw this.createServiceError('FETCH_TRENDS_ERROR', 'Failed to fetch trends', error);
      }

      // Group by time intervals
      const intervalMs = interval === 'hour' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
      const timeGroups: Record<string, Array<{ name: WebVitalType; value: number }>> = {};

      vitals?.forEach(vital => {
        const intervalStart = Math.floor(vital.timestamp / intervalMs) * intervalMs;
        const key = intervalStart.toString();
        
        if (!timeGroups[key]) {
          timeGroups[key] = [];
        }
        
        timeGroups[key].push({
          name: vital.name as WebVitalType,
          value: vital.value
        });
      });

      // Calculate averages for each time interval
      const trends = Object.entries(timeGroups)
        .map(([timestamp, values]) => {
          const averages = {
            timestamp: new Date(parseInt(timestamp)),
            LCP: 0,
            FID: 0,
            CLS: 0,
            TTFB: 0,
            FCP: 0,
            TTI: 0
          };

          // Group by metric and calculate averages
          const metricGroups: Record<WebVitalType, number[]> = {
            LCP: [],
            FID: [],
            CLS: [],
            TTFB: [],
            FCP: [],
            TTI: []
          };

          values.forEach(v => {
            if (metricGroups[v.name]) {
              metricGroups[v.name].push(v.value);
            }
          });

          Object.keys(metricGroups).forEach(metric => {
            const vals = metricGroups[metric as WebVitalType];
            if (vals.length > 0) {
              averages[metric as WebVitalType] = vals.reduce((sum, val) => sum + val, 0) / vals.length;
            }
          });

          return averages;
        })
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      // Calculate improvements
      const improvements: Array<{
        metric: WebVitalType;
        change: number;
        trend: 'improving' | 'degrading' | 'stable';
      }> = [];

      if (trends.length >= 2) {
        const firstPeriod = trends[0];
        const lastPeriod = trends[trends.length - 1];

        Object.keys(this.benchmarks).forEach(metric => {
          const vitalType = metric as WebVitalType;
          const oldValue = firstPeriod[vitalType];
          const newValue = lastPeriod[vitalType];
          
          if (oldValue > 0 && newValue > 0) {
            const change = ((newValue - oldValue) / oldValue) * 100;
            let trend: 'improving' | 'degrading' | 'stable' = 'stable';
            
            if (Math.abs(change) > 5) { // 5% threshold
              trend = change < 0 ? 'improving' : 'degrading';
            }
            
            improvements.push({
              metric: vitalType,
              change,
              trend
            });
          }
        });
      }

      this.logger.info('Successfully calculated web vitals trends', {
        timeRange,
        trendPoints: trends.length,
        improvements: improvements.length
      });

      return { trends, improvements };
    } catch (error) {
      this.logger.error('Failed to get web vitals trends', { timeRange, error });
      throw error;
    }
  }

  // Private helper methods

  private generateSessionId(): string {
    return `vitals_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async initializeUserId(): Promise<void> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (user) {
        this.userId = user.id;
      }
    } catch (error) {
      this.logger.debug('Could not get user ID for web vitals tracking:', error);
    }
  }

  private initializeWebVitalsTracking(): void {
    if (typeof window === 'undefined') return;

    this.trackLCP();
    this.trackFID();
    this.trackCLS();
    this.trackTTFB();
    this.trackFCP();
    this.trackTTI();
  }

  private trackLCP(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as any;
      
      this.recordWebVital('LCP', lastEntry.startTime, {
        element: lastEntry.element?.tagName,
        url: lastEntry.url
      });
    });

    try {
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.LCP = observer;
    } catch (error) {
      this.logger.debug('LCP tracking not supported:', error);
    }
  }

  private trackFID(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        this.recordWebVital('FID', entry.processingStart - entry.startTime, {
          eventType: entry.name,
          target: entry.target?.tagName
        });
      });
    });

    try {
      observer.observe({ entryTypes: ['first-input'] });
      this.observers.FID = observer;
    } catch (error) {
      this.logger.debug('FID tracking not supported:', error);
    }
  }

  private trackCLS(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    let clsValue = 0;
    let clsEntries: any[] = [];

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          const firstSessionEntry = clsEntries[0];
          const lastSessionEntry = clsEntries[clsEntries.length - 1];

          if (!firstSessionEntry || entry.startTime - lastSessionEntry.startTime < 1000) {
            clsEntries.push(entry);
            clsValue += entry.value;
          } else {
            clsEntries = [entry];
            clsValue = entry.value;
          }

          this.recordWebVital('CLS', clsValue, {
            entryCount: clsEntries.length,
            sources: entry.sources?.map((s: any) => s.node?.tagName)
          });
        }
      });
    });

    try {
      observer.observe({ entryTypes: ['layout-shift'] });
      this.observers.CLS = observer;
    } catch (error) {
      this.logger.debug('CLS tracking not supported:', error);
    }
  }

  private trackTTFB(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (entry.entryType === 'navigation') {
          this.recordWebVital('TTFB', entry.responseStart - entry.requestStart, {
            domainLookupTime: entry.domainLookupEnd - entry.domainLookupStart,
            connectTime: entry.connectEnd - entry.connectStart,
            requestTime: entry.responseStart - entry.requestStart
          });
        }
      });
    });

    try {
      observer.observe({ entryTypes: ['navigation'] });
      this.observers.TTFB = observer;
    } catch (error) {
      this.logger.debug('TTFB tracking not supported:', error);
    }
  }

  private trackFCP(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (entry.name === 'first-contentful-paint') {
          this.recordWebVital('FCP', entry.startTime);
        }
      });
    });

    try {
      observer.observe({ entryTypes: ['paint'] });
      this.observers.FCP = observer;
    } catch (error) {
      this.logger.debug('FCP tracking not supported:', error);
    }
  }

  private trackTTI(): void {
    if (typeof window === 'undefined') return;

    // TTI is complex to calculate, using a simplified approach
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigationEntry = performance.getEntriesByType('navigation')[0] as any;
        if (navigationEntry) {
          const tti = navigationEntry.domContentLoadedEventEnd;
          this.recordWebVital('TTI', tti, {
            domContentLoaded: navigationEntry.domContentLoadedEventEnd,
            loadComplete: navigationEntry.loadEventEnd
          });
        }
      }, 0);
    });
  }

  private getRating(metric: WebVitalType, value: number): 'good' | 'needs-improvement' | 'poor' {
    const benchmark = this.benchmarks[metric];
    if (value <= benchmark.good) return 'good';
    if (value <= benchmark.needsImprovement) return 'needs-improvement';
    return 'poor';
  }

  private getPercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
  }

  private async storeWebVital(entry: WebVitalEntry): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('web_vitals')
        .insert({
          id: entry.id,
          name: entry.name,
          value: entry.value,
          delta: entry.delta,
          timestamp: entry.timestamp,
          rating: entry.rating,
          url: entry.url,
          session_id: entry.sessionId,
          user_id: entry.userId,
          metadata: entry.metadata
        });

      if (error) {
        this.logger.error('Failed to store web vital:', error);
      }
    } catch (error) {
      this.logger.error('Failed to store web vital:', error);
    }
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
    this.logger.info('Disposing web vitals service');
    
    // Disconnect all observers
    Object.values(this.observers).forEach(observer => {
      observer?.disconnect();
    });
    
    this.observers = {};
    this.webVitalEntries = [];
  }
}

// Create and export singleton instance
export const webVitalsService = withErrorHandling(new WebVitalsService());