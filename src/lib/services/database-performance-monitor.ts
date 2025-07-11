import { logger } from '@/lib/services';
/**
 * Database Performance Monitor Service
 * 
 * Comprehensive database performance monitoring, alerting, and optimization
 * recommendations for the HeyPeter Academy LMS.
 */

import { supabase } from '@/lib/supabase';
import { dbConnectionPool } from './database-connection-pool';
import { queryOptimizationService } from './query-optimization-service';
import { performanceMonitor } from '@/lib/utils/performance-monitor';

interface DatabaseMetrics {
  connectionStats: {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    maxConnections: number;
    connectionUsagePercent: number;
  };
  queryStats: {
    totalQueries: number;
    slowQueries: number;
    averageResponseTime: number;
    cacheHitRate: number;
    errorRate: number;
  };
  tableStats: Array<{
    tableName: string;
    tableSize: string;
    indexSize: string;
    totalSize: string;
    rowCount: number;
    sequentialScans: number;
    indexScans: number;
    scanRatio: number;
  }>;
  indexStats: Array<{
    tableName: string;
    indexName: string;
    indexSize: string;
    indexScans: number;
    tuplesRead: number;
    tuplesFetched: number;
    usageRatio: number;
  }>;
  slowQueries: Array<{
    queryText: string;
    totalCalls: number;
    totalTime: number;
    averageTime: number;
    maxTime: number;
  }>;
}

interface PerformanceAlert {
  id: string;
  type: 'slow_query' | 'high_connections' | 'low_cache_hit' | 'unused_index' | 'table_bloat';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  details: Record<string, any>;
  recommendation: string;
  createdAt: Date;
  acknowledged: boolean;
}

interface OptimizationRecommendation {
  id: string;
  type: 'add_index' | 'remove_index' | 'query_optimization' | 'table_maintenance' | 'configuration';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  expectedImprovement: string;
  implementation: string;
  estimatedEffort: 'low' | 'medium' | 'high';
  createdAt: Date;
}

interface PerformanceTrend {
  timestamp: Date;
  averageResponseTime: number;
  queryCount: number;
  errorCount: number;
  connectionCount: number;
  cacheHitRate: number;
}

export class DatabasePerformanceMonitor {
  private alerts: Map<string, PerformanceAlert> = new Map();
  private recommendations: Map<string, OptimizationRecommendation> = new Map();
  private trends: PerformanceTrend[] = [];
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout;
  
  private readonly thresholds = {
    slowQueryMs: 1000,
    highConnectionPercent: 80,
    lowCacheHitPercent: 70,
    lowIndexUsageScans: 100,
    highSequentialScanRatio: 80,
  };

  /**
   * Start performance monitoring
   */
  async startMonitoring(intervalMs: number = 60000): Promise<void> {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    logger.info('[DB Performance Monitor] Starting monitoring...');

    // Initial metrics collection
    await this.collectMetrics();

    // Set up periodic monitoring
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectMetrics();
        await this.analyzePerformance();
        await this.generateRecommendations();
        this.cleanupOldData();
      } catch (error) {
        logger.error('[DB Performance Monitor] Error during monitoring cycle:', error);
      }
    }, intervalMs);
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    this.isMonitoring = false;
    logger.info('[DB Performance Monitor] Monitoring stopped');
  }

  /**
   * Get comprehensive database metrics
   */
  async getDatabaseMetrics(): Promise<DatabaseMetrics> {
    try {
      // Get connection statistics
      const { data: connectionStats } = await dbConnectionPool.executeQuery(
        async (client) => {
          return await client.rpc('get_connection_stats');
        },
        { priority: 'low', tags: ['monitoring', 'connection-stats'] }
      );

      // Get table performance statistics
      const { data: tableStats } = await dbConnectionPool.executeQuery(
        async (client) => {
          return await client.rpc('analyze_table_performance');
        },
        { priority: 'low', tags: ['monitoring', 'table-stats'] }
      );

      // Get index usage statistics
      const { data: indexStats } = await dbConnectionPool.executeQuery(
        async (client) => {
          return await client.rpc('get_index_usage_stats');
        },
        { priority: 'low', tags: ['monitoring', 'index-stats'] }
      );

      // Get slow query statistics
      const { data: slowQueries } = await dbConnectionPool.executeQuery(
        async (client) => {
          return await client.rpc('get_slow_queries', { threshold_ms: this.thresholds.slowQueryMs });
        },
        { priority: 'low', tags: ['monitoring', 'slow-queries'] }
      );

      // Get query optimization service stats
      const queryOptStats = queryOptimizationService.getPerformanceSummary();
      const poolStats = dbConnectionPool.getStats();

      const metrics: DatabaseMetrics = {
        connectionStats: connectionStats?.[0] || {
          totalConnections: poolStats.totalConnections,
          activeConnections: poolStats.activeConnections,
          idleConnections: poolStats.idleConnections,
          maxConnections: 100,
          connectionUsagePercent: 0,
        },
        queryStats: {
          totalQueries: queryOptStats.totalQueries,
          slowQueries: queryOptStats.slowQueries,
          averageResponseTime: queryOptStats.averageExecutionTime,
          cacheHitRate: queryOptStats.cacheHitRate,
          errorRate: poolStats.totalErrors > 0 ? (poolStats.totalErrors / (poolStats.totalAcquired || 1)) * 100 : 0,
        },
        tableStats: tableStats || [],
        indexStats: indexStats || [],
        slowQueries: slowQueries || [],
      };

      return metrics;
    } catch (error) {
      logger.error('[DB Performance Monitor] Failed to get database metrics:', error);
      throw error;
    }
  }

  /**
   * Get performance alerts
   */
  getAlerts(severity?: PerformanceAlert['severity']): PerformanceAlert[] {
    let alerts = Array.from(this.alerts.values());
    
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }

    return alerts.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity] || 
             b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  /**
   * Get optimization recommendations
   */
  getRecommendations(priority?: OptimizationRecommendation['priority']): OptimizationRecommendation[] {
    let recommendations = Array.from(this.recommendations.values());
    
    if (priority) {
      recommendations = recommendations.filter(rec => rec.priority === priority);
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority] || 
             b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  /**
   * Get performance trends
   */
  getPerformanceTrends(hours: number = 24): PerformanceTrend[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.trends
      .filter(trend => trend.timestamp >= cutoff)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  /**
   * Run performance health check
   */
  async runHealthCheck(): Promise<{
    overall: 'healthy' | 'warning' | 'critical';
    checks: Array<{
      name: string;
      status: 'pass' | 'warning' | 'fail';
      message: string;
      details?: any;
    }>;
  }> {
    const checks = [];
    let warningCount = 0;
    let failCount = 0;

    try {
      const metrics = await this.getDatabaseMetrics();

      // Check connection usage
      const connectionUsage = metrics.connectionStats.connectionUsagePercent;
      if (connectionUsage > this.thresholds.highConnectionPercent) {
        checks.push({
          name: 'Connection Usage',
          status: 'fail',
          message: `High connection usage: ${connectionUsage}%`,
          details: metrics.connectionStats,
        });
        failCount++;
      } else if (connectionUsage > this.thresholds.highConnectionPercent * 0.7) {
        checks.push({
          name: 'Connection Usage',
          status: 'warning',
          message: `Moderate connection usage: ${connectionUsage}%`,
          details: metrics.connectionStats,
        });
        warningCount++;
      } else {
        checks.push({
          name: 'Connection Usage',
          status: 'pass',
          message: `Connection usage is healthy: ${connectionUsage}%`,
        });
      }

      // Check cache hit rate
      const cacheHitRate = metrics.queryStats.cacheHitRate;
      if (cacheHitRate < this.thresholds.lowCacheHitPercent) {
        checks.push({
          name: 'Cache Hit Rate',
          status: 'warning',
          message: `Low cache hit rate: ${cacheHitRate.toFixed(1)}%`,
          details: { cacheHitRate, threshold: this.thresholds.lowCacheHitPercent },
        });
        warningCount++;
      } else {
        checks.push({
          name: 'Cache Hit Rate',
          status: 'pass',
          message: `Cache hit rate is good: ${cacheHitRate.toFixed(1)}%`,
        });
      }

      // Check slow queries
      const slowQueryCount = metrics.queryStats.slowQueries;
      if (slowQueryCount > 10) {
        checks.push({
          name: 'Slow Queries',
          status: 'fail',
          message: `High number of slow queries: ${slowQueryCount}`,
          details: { slowQueryCount, threshold: 10 },
        });
        failCount++;
      } else if (slowQueryCount > 5) {
        checks.push({
          name: 'Slow Queries',
          status: 'warning',
          message: `Some slow queries detected: ${slowQueryCount}`,
          details: { slowQueryCount, threshold: 5 },
        });
        warningCount++;
      } else {
        checks.push({
          name: 'Slow Queries',
          status: 'pass',
          message: `Slow query count is acceptable: ${slowQueryCount}`,
        });
      }

      // Check response time
      const avgResponseTime = metrics.queryStats.averageResponseTime;
      if (avgResponseTime > this.thresholds.slowQueryMs) {
        checks.push({
          name: 'Response Time',
          status: 'fail',
          message: `High average response time: ${avgResponseTime.toFixed(2)}ms`,
          details: { avgResponseTime, threshold: this.thresholds.slowQueryMs },
        });
        failCount++;
      } else if (avgResponseTime > this.thresholds.slowQueryMs * 0.5) {
        checks.push({
          name: 'Response Time',
          status: 'warning',
          message: `Elevated response time: ${avgResponseTime.toFixed(2)}ms`,
          details: { avgResponseTime, threshold: this.thresholds.slowQueryMs * 0.5 },
        });
        warningCount++;
      } else {
        checks.push({
          name: 'Response Time',
          status: 'pass',
          message: `Response time is good: ${avgResponseTime.toFixed(2)}ms`,
        });
      }

      // Check table scan ratios
      const tablesWithHighSeqScans = metrics.tableStats.filter(
        table => table.scanRatio < (100 - this.thresholds.highSequentialScanRatio)
      );
      
      if (tablesWithHighSeqScans.length > 0) {
        checks.push({
          name: 'Table Scan Efficiency',
          status: 'warning',
          message: `${tablesWithHighSeqScans.length} tables have high sequential scan ratios`,
          details: tablesWithHighSeqScans.map(t => ({ table: t.tableName, scanRatio: t.scanRatio })),
        });
        warningCount++;
      } else {
        checks.push({
          name: 'Table Scan Efficiency',
          status: 'pass',
          message: 'Table scan ratios are efficient',
        });
      }

      // Determine overall status
      let overall: 'healthy' | 'warning' | 'critical';
      if (failCount > 0) {
        overall = 'critical';
      } else if (warningCount > 0) {
        overall = 'warning';
      } else {
        overall = 'healthy';
      }

      return { overall, checks };

    } catch (error) {
      logger.error('[DB Performance Monitor] Health check failed:', error);
      return {
        overall: 'critical',
        checks: [{
          name: 'Health Check',
          status: 'fail',
          message: 'Failed to perform health check',
          details: { error: error.message },
        }],
      };
    }
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport(): Promise<{
    summary: {
      overallHealth: 'healthy' | 'warning' | 'critical';
      totalQueries: number;
      averageResponseTime: number;
      cacheHitRate: number;
      alertCount: number;
      recommendationCount: number;
    };
    topSlowQueries: Array<{ query: string; avgTime: number; callCount: number }>;
    topTables: Array<{ table: string; size: string; scans: number }>;
    unusedIndexes: Array<{ table: string; index: string; size: string }>;
    recommendations: OptimizationRecommendation[];
    alerts: PerformanceAlert[];
  }> {
    const metrics = await this.getDatabaseMetrics();
    const healthCheck = await this.runHealthCheck();
    const alerts = this.getAlerts();
    const recommendations = this.getRecommendations();

    // Identify top slow queries
    const topSlowQueries = metrics.slowQueries
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, 10)
      .map(q => ({
        query: q.queryText.substring(0, 100) + (q.queryText.length > 100 ? '...' : ''),
        avgTime: q.averageTime,
        callCount: q.totalCalls,
      }));

    // Identify top tables by size
    const topTables = metrics.tableStats
      .sort((a, b) => parseInt(b.totalSize.replace(/[^0-9]/g, '')) - parseInt(a.totalSize.replace(/[^0-9]/g, '')))
      .slice(0, 10)
      .map(t => ({
        table: t.tableName,
        size: t.totalSize,
        scans: t.sequentialScans,
      }));

    // Identify unused indexes
    const unusedIndexes = metrics.indexStats
      .filter(idx => idx.indexScans < this.thresholds.lowIndexUsageScans)
      .sort((a, b) => a.indexScans - b.indexScans)
      .slice(0, 10)
      .map(idx => ({
        table: idx.tableName,
        index: idx.indexName,
        size: idx.indexSize,
      }));

    return {
      summary: {
        overallHealth: healthCheck.overall,
        totalQueries: metrics.queryStats.totalQueries,
        averageResponseTime: metrics.queryStats.averageResponseTime,
        cacheHitRate: metrics.queryStats.cacheHitRate,
        alertCount: alerts.length,
        recommendationCount: recommendations.length,
      },
      topSlowQueries,
      topTables,
      unusedIndexes,
      recommendations,
      alerts,
    };
  }

  // Private methods

  private async collectMetrics(): Promise<void> {
    try {
      const metrics = await this.getDatabaseMetrics();
      const queryOptStats = queryOptimizationService.getPerformanceSummary();
      const poolStats = dbConnectionPool.getStats();

      // Record trend data
      const trend: PerformanceTrend = {
        timestamp: new Date(),
        averageResponseTime: metrics.queryStats.averageResponseTime,
        queryCount: metrics.queryStats.totalQueries,
        errorCount: poolStats.totalErrors,
        connectionCount: metrics.connectionStats.totalConnections,
        cacheHitRate: metrics.queryStats.cacheHitRate,
      };

      this.trends.push(trend);

      // Keep only last 24 hours of trends
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      this.trends = this.trends.filter(t => t.timestamp >= cutoff);

    } catch (error) {
      logger.error('[DB Performance Monitor] Failed to collect metrics:', error);
    }
  }

  private async analyzePerformance(): Promise<void> {
    try {
      const metrics = await this.getDatabaseMetrics();

      // Check for high connection usage
      if (metrics.connectionStats.connectionUsagePercent > this.thresholds.highConnectionPercent) {
        this.createAlert({
          type: 'high_connections',
          severity: 'high',
          title: 'High Database Connection Usage',
          message: `Connection usage is at ${metrics.connectionStats.connectionUsagePercent}%`,
          details: metrics.connectionStats,
          recommendation: 'Consider implementing connection pooling or increasing max connections',
        });
      }

      // Check for low cache hit rate
      if (metrics.queryStats.cacheHitRate < this.thresholds.lowCacheHitPercent) {
        this.createAlert({
          type: 'low_cache_hit',
          severity: 'medium',
          title: 'Low Cache Hit Rate',
          message: `Cache hit rate is ${metrics.queryStats.cacheHitRate.toFixed(1)}%`,
          details: { cacheHitRate: metrics.queryStats.cacheHitRate },
          recommendation: 'Review query caching strategy and consider increasing cache TTL for stable data',
        });
      }

      // Check for slow queries
      const criticalSlowQueries = metrics.slowQueries.filter(q => q.averageTime > this.thresholds.slowQueryMs * 2);
      if (criticalSlowQueries.length > 0) {
        this.createAlert({
          type: 'slow_query',
          severity: 'critical',
          title: 'Critical Slow Queries Detected',
          message: `${criticalSlowQueries.length} queries are taking over ${this.thresholds.slowQueryMs * 2}ms`,
          details: { slowQueries: criticalSlowQueries },
          recommendation: 'Optimize these queries immediately or add appropriate indexes',
        });
      }

      // Check for unused indexes
      const unusedIndexes = metrics.indexStats.filter(idx => 
        idx.indexScans < this.thresholds.lowIndexUsageScans && 
        !idx.indexName.endsWith('_pkey') // Exclude primary keys
      );
      
      if (unusedIndexes.length > 5) {
        this.createAlert({
          type: 'unused_index',
          severity: 'low',
          title: 'Multiple Unused Indexes Detected',
          message: `${unusedIndexes.length} indexes appear to be unused`,
          details: { unusedIndexes },
          recommendation: 'Consider removing unused indexes to improve write performance',
        });
      }

    } catch (error) {
      logger.error('[DB Performance Monitor] Failed to analyze performance:', error);
    }
  }

  private async generateRecommendations(): Promise<void> {
    try {
      const metrics = await this.getDatabaseMetrics();
      const indexRecommendations = await queryOptimizationService.analyzeQueryPatterns();

      // Generate index recommendations
      for (const indexRec of indexRecommendations) {
        this.createRecommendation({
          type: 'add_index',
          priority: indexRec.priority as 'low' | 'medium' | 'high',
          title: `Add Index on ${indexRec.table}`,
          description: `${indexRec.reasoning}. Suggested columns: ${indexRec.columns.join(', ')}`,
          expectedImprovement: `${indexRec.expectedImprovement}% performance improvement`,
          implementation: `CREATE INDEX CONCURRENTLY idx_${indexRec.table}_${indexRec.columns.join('_')} ON ${indexRec.table}(${indexRec.columns.join(', ')});`,
          estimatedEffort: 'low',
        });
      }

      // Generate table maintenance recommendations
      const largeTables = metrics.tableStats
        .filter(table => parseInt(table.totalSize.replace(/[^0-9]/g, '')) > 1000000) // > 1GB
        .filter(table => table.scanRatio < 50); // Low index usage

      for (const table of largeTables) {
        this.createRecommendation({
          type: 'table_maintenance',
          priority: 'medium',
          title: `Optimize Large Table: ${table.tableName}`,
          description: `Table ${table.tableName} is ${table.totalSize} with low index usage (${table.scanRatio}% index scans)`,
          expectedImprovement: 'Significant query performance improvement',
          implementation: `ANALYZE ${table.tableName}; Consider partitioning or archiving old data.`,
          estimatedEffort: 'high',
        });
      }

      // Generate query optimization recommendations
      const queryOptStats = queryOptimizationService.getPerformanceSummary();
      if (queryOptStats.slowQueries > 10) {
        this.createRecommendation({
          type: 'query_optimization',
          priority: 'high',
          title: 'Multiple Slow Queries Need Optimization',
          description: `${queryOptStats.slowQueries} queries are performing slowly. Review query patterns and add appropriate indexes.`,
          expectedImprovement: '50-80% reduction in query response times',
          implementation: 'Review slow query logs and apply query optimization techniques',
          estimatedEffort: 'medium',
        });
      }

    } catch (error) {
      logger.error('[DB Performance Monitor] Failed to generate recommendations:', error);
    }
  }

  private createAlert(alertData: Omit<PerformanceAlert, 'id' | 'createdAt' | 'acknowledged'>): void {
    const id = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const alert: PerformanceAlert = {
      id,
      ...alertData,
      createdAt: new Date(),
      acknowledged: false,
    };

    // Don't create duplicate alerts
    const existingAlert = Array.from(this.alerts.values()).find(
      a => a.type === alert.type && a.severity === alert.severity && !a.acknowledged
    );

    if (!existingAlert) {
      this.alerts.set(id, alert);
      logger.warn(`[DB Performance Monitor] Alert created: ${alert.title}`);
    }
  }

  private createRecommendation(recData: Omit<OptimizationRecommendation, 'id' | 'createdAt'>): void {
    const id = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Don't create duplicate recommendations
    const existingRec = Array.from(this.recommendations.values()).find(
      r => r.type === recData.type && r.title === recData.title
    );

    if (!existingRec) {
      const recommendation: OptimizationRecommendation = {
        id,
        ...recData,
        createdAt: new Date(),
      };

      this.recommendations.set(id, recommendation);
    }
  }

  private cleanupOldData(): void {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Clean up old acknowledged alerts
    for (const [id, alert] of this.alerts) {
      if (alert.acknowledged && alert.createdAt < oneWeekAgo) {
        this.alerts.delete(id);
      }
    }

    // Clean up old recommendations
    for (const [id, recommendation] of this.recommendations) {
      if (recommendation.createdAt < oneDayAgo) {
        this.recommendations.delete(id);
      }
    }
  }
}

// Export singleton instance
export const dbPerformanceMonitor = new DatabasePerformanceMonitor();

// Auto-start monitoring in production
if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
  dbPerformanceMonitor.startMonitoring(300000); // 5 minutes
}