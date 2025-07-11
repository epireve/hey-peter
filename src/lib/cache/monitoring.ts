/**
 * Cache monitoring and metrics system
 * Provides comprehensive insights into cache performance and usage patterns
 */

import { CacheMetrics, CacheOperation, CacheEvent, CacheEventListener } from './types';
import { performanceMonitor } from '@/lib/utils/performance-monitor';

export interface CacheMonitorConfig {
  /** Whether to enable monitoring */
  enabled: boolean;
  /** Maximum number of operations to track */
  maxOperations: number;
  /** Maximum number of events to track */
  maxEvents: number;
  /** Metrics collection interval in ms */
  metricsInterval: number;
  /** Whether to track detailed operation timing */
  trackTiming: boolean;
  /** Whether to track cache hit/miss ratios */
  trackHitRatio: boolean;
  /** Whether to track memory usage */
  trackMemoryUsage: boolean;
  /** Custom metrics to track */
  customMetrics?: string[];
}

export interface CacheHealthMetrics {
  /** Overall cache health score (0-100) */
  healthScore: number;
  /** Individual health indicators */
  indicators: {
    hitRate: { score: number; status: 'good' | 'warning' | 'critical'; message: string };
    responseTime: { score: number; status: 'good' | 'warning' | 'critical'; message: string };
    memoryUsage: { score: number; status: 'good' | 'warning' | 'critical'; message: string };
    errorRate: { score: number; status: 'good' | 'warning' | 'critical'; message: string };
  };
  /** Recommendations for improvement */
  recommendations: string[];
  /** Timestamp of health check */
  timestamp: number;
}

export interface CachePerformanceReport {
  /** Report generation time */
  generatedAt: number;
  /** Time period covered */
  period: {
    start: number;
    end: number;
    duration: number;
  };
  /** Performance summary */
  summary: {
    totalOperations: number;
    totalHits: number;
    totalMisses: number;
    hitRate: number;
    avgResponseTime: number;
    totalErrors: number;
    errorRate: number;
  };
  /** Top performing cache keys */
  topKeys: Array<{
    key: string;
    hits: number;
    hitRate: number;
    avgResponseTime: number;
  }>;
  /** Worst performing cache keys */
  slowestKeys: Array<{
    key: string;
    avgResponseTime: number;
    totalOperations: number;
  }>;
  /** Cache size trends */
  sizeTrends: Array<{
    timestamp: number;
    totalEntries: number;
    totalSize: number;
  }>;
  /** Performance trends */
  performanceTrends: Array<{
    timestamp: number;
    hitRate: number;
    avgResponseTime: number;
    errorRate: number;
  }>;
}

/**
 * Cache monitoring and metrics collector
 */
export class CacheMonitor {
  private config: CacheMonitorConfig;
  private operations: CacheOperation[] = [];
  private events: CacheEvent[] = [];
  private metrics: CacheMetrics;
  private listeners = new Set<CacheEventListener>();
  private metricsTimer?: NodeJS.Timeout;
  private startTime: number;

  constructor(config: Partial<CacheMonitorConfig> = {}) {
    this.config = {
      enabled: true,
      maxOperations: 10000,
      maxEvents: 5000,
      metricsInterval: 60000, // 1 minute
      trackTiming: true,
      trackHitRatio: true,
      trackMemoryUsage: true,
      ...config
    };

    this.startTime = Date.now();
    this.metrics = this.initializeMetrics();

    if (this.config.enabled) {
      this.startMetricsCollection();
    }
  }

  /**
   * Record a cache operation
   */
  recordOperation(operation: Omit<CacheOperation, 'timestamp'>): void {
    if (!this.config.enabled) return;

    const fullOperation: CacheOperation = {
      ...operation,
      timestamp: Date.now()
    };

    this.operations.push(fullOperation);
    this.updateMetricsFromOperation(fullOperation);

    // Maintain operation history size
    if (this.operations.length > this.config.maxOperations) {
      this.operations = this.operations.slice(-this.config.maxOperations);
    }

    // Emit event
    this.emitEvent({
      type: operation.type as any,
      key: operation.key,
      timestamp: fullOperation.timestamp,
      data: operation,
      metadata: operation.metadata
    });
  }

  /**
   * Record a cache event
   */
  recordEvent(event: Omit<CacheEvent, 'timestamp'>): void {
    if (!this.config.enabled) return;

    const fullEvent: CacheEvent = {
      ...event,
      timestamp: Date.now()
    };

    this.events.push(fullEvent);

    // Maintain event history size
    if (this.events.length > this.config.maxEvents) {
      this.events = this.events.slice(-this.config.maxEvents);
    }

    this.emitEvent(fullEvent);
  }

  /**
   * Get current metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Get cache health assessment
   */
  getHealthMetrics(): CacheHealthMetrics {
    const now = Date.now();
    const recentOps = this.operations.filter(op => now - op.timestamp < 300000); // Last 5 minutes

    // Calculate health indicators
    const hitRate = this.metrics.hitRate;
    const avgResponseTime = this.metrics.avgResponseTime;
    const errorRate = this.metrics.efficiency.invalidations / Math.max(1, this.metrics.hits + this.metrics.misses);
    const memoryUsage = this.metrics.totalSize;

    const indicators = {
      hitRate: this.assessHitRate(hitRate),
      responseTime: this.assessResponseTime(avgResponseTime),
      memoryUsage: this.assessMemoryUsage(memoryUsage),
      errorRate: this.assessErrorRate(errorRate)
    };

    const healthScore = this.calculateHealthScore(indicators);
    const recommendations = this.generateRecommendations(indicators);

    return {
      healthScore,
      indicators,
      recommendations,
      timestamp: now
    };
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(
    startTime?: number,
    endTime?: number
  ): CachePerformanceReport {
    const now = Date.now();
    const start = startTime || (now - 24 * 60 * 60 * 1000); // Last 24 hours
    const end = endTime || now;

    const periodOperations = this.operations.filter(
      op => op.timestamp >= start && op.timestamp <= end
    );

    // Calculate summary
    const totalOperations = periodOperations.length;
    const hits = periodOperations.filter(op => op.type === 'get' && op.success).length;
    const misses = periodOperations.filter(op => op.type === 'get' && !op.success).length;
    const errors = periodOperations.filter(op => !op.success).length;

    const hitRate = totalOperations > 0 ? (hits / totalOperations) * 100 : 0;
    const errorRate = totalOperations > 0 ? (errors / totalOperations) * 100 : 0;
    const avgResponseTime = periodOperations.reduce((sum, op) => sum + op.duration, 0) / Math.max(1, totalOperations);

    // Analyze top and worst performing keys
    const keyStats = this.analyzeKeyPerformance(periodOperations);
    const topKeys = keyStats.slice(0, 10);
    const slowestKeys = [...keyStats]
      .sort((a, b) => b.avgResponseTime - a.avgResponseTime)
      .slice(0, 10);

    // Generate trends (simplified - in practice, you'd store historical data)
    const sizeTrends = this.generateSizeTrends(start, end);
    const performanceTrends = this.generatePerformanceTrends(start, end);

    return {
      generatedAt: now,
      period: {
        start,
        end,
        duration: end - start
      },
      summary: {
        totalOperations,
        totalHits: hits,
        totalMisses: misses,
        hitRate,
        avgResponseTime,
        totalErrors: errors,
        errorRate
      },
      topKeys,
      slowestKeys,
      sizeTrends,
      performanceTrends
    };
  }

  /**
   * Subscribe to cache events
   */
  subscribe(listener: CacheEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get operations filtered by criteria
   */
  getOperations(filter?: {
    type?: CacheOperation['type'];
    key?: string;
    success?: boolean;
    since?: number;
    limit?: number;
  }): CacheOperation[] {
    let filtered = [...this.operations];

    if (filter) {
      if (filter.type) {
        filtered = filtered.filter(op => op.type === filter.type);
      }
      if (filter.key) {
        filtered = filtered.filter(op => op.key.includes(filter.key!));
      }
      if (filter.success !== undefined) {
        filtered = filtered.filter(op => op.success === filter.success);
      }
      if (filter.since) {
        filtered = filtered.filter(op => op.timestamp >= filter.since!);
      }
      if (filter.limit) {
        filtered = filtered.slice(-filter.limit);
      }
    }

    return filtered;
  }

  /**
   * Get events filtered by criteria
   */
  getEvents(filter?: {
    type?: CacheEvent['type'];
    key?: string;
    since?: number;
    limit?: number;
  }): CacheEvent[] {
    let filtered = [...this.events];

    if (filter) {
      if (filter.type) {
        filtered = filtered.filter(event => event.type === filter.type);
      }
      if (filter.key) {
        filtered = filtered.filter(event => event.key.includes(filter.key!));
      }
      if (filter.since) {
        filtered = filtered.filter(event => event.timestamp >= filter.since!);
      }
      if (filter.limit) {
        filtered = filtered.slice(-filter.limit);
      }
    }

    return filtered;
  }

  /**
   * Clear all monitoring data
   */
  clear(): void {
    this.operations = [];
    this.events = [];
    this.metrics = this.initializeMetrics();
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = undefined;
    }
    this.config.enabled = false;
  }

  private initializeMetrics(): CacheMetrics {
    return {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalEntries: 0,
      totalSize: 0,
      avgResponseTime: 0,
      efficiency: {
        staleHits: 0,
        freshHits: 0,
        evictions: 0,
        invalidations: 0
      }
    };
  }

  private updateMetricsFromOperation(operation: CacheOperation): void {
    if (operation.type === 'get') {
      if (operation.success) {
        this.metrics.hits++;
      } else {
        this.metrics.misses++;
      }
      
      this.metrics.hitRate = (this.metrics.hits / (this.metrics.hits + this.metrics.misses)) * 100;
    }

    // Update average response time
    const totalOps = this.metrics.hits + this.metrics.misses;
    if (totalOps > 0) {
      this.metrics.avgResponseTime = 
        (this.metrics.avgResponseTime * (totalOps - 1) + operation.duration) / totalOps;
    }

    // Update efficiency metrics based on operation metadata
    if (operation.metadata?.stale) {
      this.metrics.efficiency.staleHits++;
    } else if (operation.success && operation.type === 'get') {
      this.metrics.efficiency.freshHits++;
    }

    if (operation.type === 'delete') {
      this.metrics.efficiency.evictions++;
    }
  }

  private emitEvent(event: CacheEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in cache event listener:', error);
      }
    });
  }

  private startMetricsCollection(): void {
    this.metricsTimer = setInterval(() => {
      this.collectPeriodicMetrics();
    }, this.config.metricsInterval);
  }

  private collectPeriodicMetrics(): void {
    // This would collect additional metrics like memory usage, cache size, etc.
    // For now, we'll just emit a periodic event
    this.recordEvent({
      type: 'hit',
      key: 'metrics-collection',
      data: { metrics: this.metrics }
    });
  }

  private assessHitRate(hitRate: number): CacheHealthMetrics['indicators']['hitRate'] {
    if (hitRate >= 80) {
      return { score: 100, status: 'good', message: 'Excellent hit rate' };
    } else if (hitRate >= 60) {
      return { score: 75, status: 'warning', message: 'Hit rate could be improved' };
    } else {
      return { score: 25, status: 'critical', message: 'Poor hit rate - check cache strategy' };
    }
  }

  private assessResponseTime(avgResponseTime: number): CacheHealthMetrics['indicators']['responseTime'] {
    if (avgResponseTime <= 50) {
      return { score: 100, status: 'good', message: 'Excellent response time' };
    } else if (avgResponseTime <= 200) {
      return { score: 75, status: 'warning', message: 'Response time could be improved' };
    } else {
      return { score: 25, status: 'critical', message: 'Slow response time - check cache performance' };
    }
  }

  private assessMemoryUsage(totalSize: number): CacheHealthMetrics['indicators']['memoryUsage'] {
    const maxSize = 100 * 1024 * 1024; // 100MB threshold
    const usage = (totalSize / maxSize) * 100;

    if (usage <= 70) {
      return { score: 100, status: 'good', message: 'Memory usage is optimal' };
    } else if (usage <= 90) {
      return { score: 60, status: 'warning', message: 'Memory usage is high' };
    } else {
      return { score: 20, status: 'critical', message: 'Memory usage is critical - consider cache cleanup' };
    }
  }

  private assessErrorRate(errorRate: number): CacheHealthMetrics['indicators']['errorRate'] {
    if (errorRate <= 0.01) {
      return { score: 100, status: 'good', message: 'Very low error rate' };
    } else if (errorRate <= 0.05) {
      return { score: 75, status: 'warning', message: 'Error rate is acceptable but could be lower' };
    } else {
      return { score: 25, status: 'critical', message: 'High error rate - investigate cache issues' };
    }
  }

  private calculateHealthScore(indicators: CacheHealthMetrics['indicators']): number {
    const scores = Object.values(indicators).map(indicator => indicator.score);
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }

  private generateRecommendations(indicators: CacheHealthMetrics['indicators']): string[] {
    const recommendations: string[] = [];

    if (indicators.hitRate.status !== 'good') {
      recommendations.push('Consider adjusting cache TTL or warming strategies to improve hit rate');
    }

    if (indicators.responseTime.status !== 'good') {
      recommendations.push('Optimize cache storage or consider using faster storage backend');
    }

    if (indicators.memoryUsage.status !== 'good') {
      recommendations.push('Implement cache size limits or more aggressive eviction policies');
    }

    if (indicators.errorRate.status !== 'good') {
      recommendations.push('Investigate and fix sources of cache errors');
    }

    if (recommendations.length === 0) {
      recommendations.push('Cache is performing well - consider advanced optimizations');
    }

    return recommendations;
  }

  private analyzeKeyPerformance(operations: CacheOperation[]): Array<{
    key: string;
    hits: number;
    hitRate: number;
    avgResponseTime: number;
  }> {
    const keyStats = new Map<string, {
      hits: number;
      total: number;
      totalResponseTime: number;
    }>();

    operations.forEach(op => {
      if (!keyStats.has(op.key)) {
        keyStats.set(op.key, { hits: 0, total: 0, totalResponseTime: 0 });
      }

      const stats = keyStats.get(op.key)!;
      stats.total++;
      stats.totalResponseTime += op.duration;

      if (op.type === 'get' && op.success) {
        stats.hits++;
      }
    });

    return Array.from(keyStats.entries()).map(([key, stats]) => ({
      key,
      hits: stats.hits,
      hitRate: (stats.hits / stats.total) * 100,
      avgResponseTime: stats.totalResponseTime / stats.total
    }));
  }

  private generateSizeTrends(start: number, end: number): CachePerformanceReport['sizeTrends'] {
    // Simplified - in practice, you'd maintain historical size data
    const now = Date.now();
    return [
      {
        timestamp: start,
        totalEntries: Math.floor(this.metrics.totalEntries * 0.8),
        totalSize: Math.floor(this.metrics.totalSize * 0.8)
      },
      {
        timestamp: now,
        totalEntries: this.metrics.totalEntries,
        totalSize: this.metrics.totalSize
      }
    ];
  }

  private generatePerformanceTrends(start: number, end: number): CachePerformanceReport['performanceTrends'] {
    // Simplified - in practice, you'd maintain historical performance data
    const now = Date.now();
    return [
      {
        timestamp: start,
        hitRate: Math.max(0, this.metrics.hitRate - 10),
        avgResponseTime: this.metrics.avgResponseTime * 1.2,
        errorRate: 0.02
      },
      {
        timestamp: now,
        hitRate: this.metrics.hitRate,
        avgResponseTime: this.metrics.avgResponseTime,
        errorRate: 0.01
      }
    ];
  }
}

/**
 * React hook for cache monitoring
 */
export function useCacheMonitoring(config?: Partial<CacheMonitorConfig>) {
  const [monitor] = React.useState(() => new CacheMonitor(config));
  const [metrics, setMetrics] = React.useState(monitor.getMetrics());
  const [health, setHealth] = React.useState<CacheHealthMetrics | null>(null);

  React.useEffect(() => {
    const unsubscribe = monitor.subscribe(() => {
      setMetrics(monitor.getMetrics());
    });

    // Update health metrics periodically
    const healthInterval = setInterval(() => {
      setHealth(monitor.getHealthMetrics());
    }, 30000); // Every 30 seconds

    // Initial health check
    setHealth(monitor.getHealthMetrics());

    return () => {
      unsubscribe();
      clearInterval(healthInterval);
    };
  }, [monitor]);

  const generateReport = React.useCallback((start?: number, end?: number) => {
    return monitor.generatePerformanceReport(start, end);
  }, [monitor]);

  const recordOperation = React.useCallback((operation: Omit<CacheOperation, 'timestamp'>) => {
    monitor.recordOperation(operation);
  }, [monitor]);

  const recordEvent = React.useCallback((event: Omit<CacheEvent, 'timestamp'>) => {
    monitor.recordEvent(event);
  }, [monitor]);

  return {
    monitor,
    metrics,
    health,
    generateReport,
    recordOperation,
    recordEvent
  };
}

/**
 * Cache performance dashboard component data provider
 */
export function useCacheDashboard(monitor: CacheMonitor) {
  const [dashboardData, setDashboardData] = React.useState({
    metrics: monitor.getMetrics(),
    health: monitor.getHealthMetrics(),
    recentOperations: monitor.getOperations({ limit: 100 }),
    recentEvents: monitor.getEvents({ limit: 50 })
  });

  React.useEffect(() => {
    const updateDashboard = () => {
      setDashboardData({
        metrics: monitor.getMetrics(),
        health: monitor.getHealthMetrics(),
        recentOperations: monitor.getOperations({ limit: 100 }),
        recentEvents: monitor.getEvents({ limit: 50 })
      });
    };

    const unsubscribe = monitor.subscribe(updateDashboard);
    
    // Update dashboard periodically
    const interval = setInterval(updateDashboard, 5000); // Every 5 seconds

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [monitor]);

  return dashboardData;
}

// Import React for hooks
import React from 'react';