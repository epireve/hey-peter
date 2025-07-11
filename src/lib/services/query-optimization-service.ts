import { logger } from '@/lib/services';
/**
 * Query Optimization Service
 * 
 * Provides intelligent query optimization, caching strategies, and performance monitoring
 * for database operations in the HeyPeter Academy LMS.
 */

import { supabase } from '@/lib/supabase';
import { dbConnectionPool } from './database-connection-pool';
import { performanceMonitor } from '@/lib/utils/performance-monitor';
import { SupabaseClient } from '@supabase/supabase-js';

interface QueryOptimizationConfig {
  enableQueryCache: boolean;
  defaultCacheTTL: number;
  enableQueryPlan: boolean;
  enablePerformanceLogging: boolean;
  slowQueryThreshold: number;
  maxRetries: number;
  retryDelay: number;
}

interface OptimizedQueryOptions {
  table: string;
  select?: string;
  filters?: Array<{
    column: string;
    operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'is';
    value: any;
  }>;
  orderBy?: {
    column: string;
    ascending?: boolean;
  };
  limit?: number;
  offset?: number;
  useIndex?: string[];
  cacheable?: boolean;
  cacheKey?: string;
  cacheTTL?: number;
  enableOptimization?: boolean;
}

interface QueryPerformanceMetrics {
  queryId: string;
  table: string;
  executionTime: number;
  rowsReturned: number;
  cacheHit: boolean;
  indexUsed: string[];
  optimizationApplied: string[];
  timestamp: Date;
}

interface IndexRecommendation {
  table: string;
  columns: string[];
  type: 'btree' | 'hash' | 'gin' | 'gist';
  reasoning: string;
  expectedImprovement: number;
  priority: 'high' | 'medium' | 'low';
}

export class QueryOptimizationService {
  private config: QueryOptimizationConfig;
  private queryMetrics: Map<string, QueryPerformanceMetrics[]> = new Map();
  private indexRecommendations: Map<string, IndexRecommendation[]> = new Map();
  private queryCache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();

  constructor(config: Partial<QueryOptimizationConfig> = {}) {
    this.config = {
      enableQueryCache: config.enableQueryCache ?? true,
      defaultCacheTTL: config.defaultCacheTTL ?? 300000, // 5 minutes
      enableQueryPlan: config.enableQueryPlan ?? true,
      enablePerformanceLogging: config.enablePerformanceLogging ?? true,
      slowQueryThreshold: config.slowQueryThreshold ?? 1000, // 1 second
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
    };
  }

  /**
   * Execute an optimized query with automatic performance tracking
   */
  async executeOptimizedQuery<T = any>(options: OptimizedQueryOptions): Promise<{
    data: T | null;
    error: any;
    metrics: QueryPerformanceMetrics;
  }> {
    const queryId = this.generateQueryId(options);
    const startTime = performance.now();

    try {
      // Check cache first
      if (this.config.enableQueryCache && options.cacheable) {
        const cacheKey = options.cacheKey || this.generateCacheKey(options);
        const cached = this.getFromCache(cacheKey);
        if (cached) {
          const metrics: QueryPerformanceMetrics = {
            queryId,
            table: options.table,
            executionTime: performance.now() - startTime,
            rowsReturned: Array.isArray(cached) ? cached.length : 1,
            cacheHit: true,
            indexUsed: [],
            optimizationApplied: ['cache'],
            timestamp: new Date(),
          };

          this.recordMetrics(queryId, metrics);
          return { data: cached, error: null, metrics };
        }
      }

      // Apply query optimization
      const optimizedOptions = await this.optimizeQuery(options);
      
      // Execute query with connection pooling
      const result = await dbConnectionPool.executeQuery(
        async (client: SupabaseClient) => {
          return await this.executeSupabaseQuery(client, optimizedOptions);
        },
        {
          priority: 'normal',
          cacheable: options.cacheable,
          cacheKey: options.cacheKey,
          cacheTTL: options.cacheTTL || this.config.defaultCacheTTL,
          tags: ['optimized-query', options.table],
        }
      );

      const executionTime = performance.now() - startTime;
      const metrics: QueryPerformanceMetrics = {
        queryId,
        table: options.table,
        executionTime,
        rowsReturned: Array.isArray(result.data) ? result.data?.length || 0 : result.data ? 1 : 0,
        cacheHit: false,
        indexUsed: optimizedOptions.indexUsed || [],
        optimizationApplied: this.getAppliedOptimizations(options, optimizedOptions),
        timestamp: new Date(),
      };

      // Log slow queries
      if (executionTime > this.config.slowQueryThreshold) {
        logger.warn(`[Query Optimization] Slow query detected:`, {
          queryId,
          table: options.table,
          executionTime,
          options,
        });
      }

      // Cache result if applicable
      if (this.config.enableQueryCache && options.cacheable && result.data && !result.error) {
        const cacheKey = options.cacheKey || this.generateCacheKey(options);
        const cacheTTL = options.cacheTTL || this.config.defaultCacheTTL;
        this.setCache(cacheKey, result.data, cacheTTL);
      }

      this.recordMetrics(queryId, metrics);
      return { ...result, metrics };

    } catch (error) {
      const metrics: QueryPerformanceMetrics = {
        queryId,
        table: options.table,
        executionTime: performance.now() - startTime,
        rowsReturned: 0,
        cacheHit: false,
        indexUsed: [],
        optimizationApplied: [],
        timestamp: new Date(),
      };

      this.recordMetrics(queryId, metrics);
      return { data: null, error, metrics };
    }
  }

  /**
   * Execute optimized queries for common analytics patterns
   */
  async executeAnalyticsQuery<T = any>(
    queryType: 'student_metrics' | 'teacher_metrics' | 'revenue_metrics' | 'usage_metrics',
    filters: Record<string, any> = {},
    options: Partial<OptimizedQueryOptions> = {}
  ): Promise<{ data: T | null; error: any; metrics: QueryPerformanceMetrics }> {
    const analyticsQueries = {
      student_metrics: {
        table: 'mv_student_performance_summary',
        select: '*',
        cacheable: true,
        cacheTTL: 600000, // 10 minutes
        enableOptimization: true,
      },
      teacher_metrics: {
        table: 'mv_teacher_utilization_summary',
        select: '*',
        cacheable: true,
        cacheTTL: 600000, // 10 minutes
        enableOptimization: true,
      },
      revenue_metrics: {
        table: 'hour_purchases',
        select: `
          id,
          student_id,
          price_paid,
          payment_status,
          created_at,
          students!inner(id, full_name)
        `,
        filters: [
          { column: 'payment_status', operator: 'eq', value: 'completed' }
        ],
        cacheable: true,
        cacheTTL: 300000, // 5 minutes
      },
      usage_metrics: {
        table: 'mv_daily_analytics_summary',
        select: '*',
        cacheable: true,
        cacheTTL: 900000, // 15 minutes
        enableOptimization: true,
      },
    };

    const queryConfig = analyticsQueries[queryType];
    if (!queryConfig) {
      throw new Error(`Unknown analytics query type: ${queryType}`);
    }

    // Apply filters
    const queryFilters = [...(queryConfig.filters || [])];
    Object.entries(filters).forEach(([column, value]) => {
      if (value !== undefined && value !== null) {
        queryFilters.push({ column, operator: 'eq', value });
      }
    });

    return this.executeOptimizedQuery<T>({
      ...queryConfig,
      ...options,
      filters: queryFilters,
      cacheKey: `analytics:${queryType}:${JSON.stringify(filters)}`,
    });
  }

  /**
   * Execute bulk optimized queries with batching
   */
  async executeBulkQueries<T = any>(
    queries: OptimizedQueryOptions[],
    options: { batchSize?: number; parallel?: boolean } = {}
  ): Promise<Array<{ data: T | null; error: any; metrics: QueryPerformanceMetrics }>> {
    const { batchSize = 10, parallel = true } = options;
    const results: Array<{ data: T | null; error: any; metrics: QueryPerformanceMetrics }> = [];

    if (parallel) {
      // Execute queries in parallel batches
      for (let i = 0; i < queries.length; i += batchSize) {
        const batch = queries.slice(i, i + batchSize);
        const batchPromises = batch.map(query => this.executeOptimizedQuery<T>(query));
        const batchResults = await Promise.allSettled(batchPromises);
        
        for (const result of batchResults) {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            results.push({
              data: null,
              error: result.reason,
              metrics: {
                queryId: 'failed',
                table: 'unknown',
                executionTime: 0,
                rowsReturned: 0,
                cacheHit: false,
                indexUsed: [],
                optimizationApplied: [],
                timestamp: new Date(),
              },
            });
          }
        }
      }
    } else {
      // Execute queries sequentially
      for (const query of queries) {
        const result = await this.executeOptimizedQuery<T>(query);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Get query performance metrics
   */
  getQueryMetrics(
    table?: string,
    timeRange?: { start: Date; end: Date }
  ): QueryPerformanceMetrics[] {
    let allMetrics: QueryPerformanceMetrics[] = [];
    
    for (const metrics of this.queryMetrics.values()) {
      allMetrics = allMetrics.concat(metrics);
    }

    if (table) {
      allMetrics = allMetrics.filter(m => m.table === table);
    }

    if (timeRange) {
      allMetrics = allMetrics.filter(m => 
        m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
      );
    }

    return allMetrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get performance summary statistics
   */
  getPerformanceSummary(table?: string): {
    totalQueries: number;
    averageExecutionTime: number;
    cacheHitRate: number;
    slowQueries: number;
    topTables: Array<{ table: string; queryCount: number; avgTime: number }>;
    recommendations: IndexRecommendation[];
  } {
    const metrics = this.getQueryMetrics(table);
    
    const totalQueries = metrics.length;
    const averageExecutionTime = totalQueries > 0 
      ? metrics.reduce((sum, m) => sum + m.executionTime, 0) / totalQueries 
      : 0;
    const cacheHits = metrics.filter(m => m.cacheHit).length;
    const cacheHitRate = totalQueries > 0 ? (cacheHits / totalQueries) * 100 : 0;
    const slowQueries = metrics.filter(m => m.executionTime > this.config.slowQueryThreshold).length;

    // Calculate top tables by query count and average time
    const tableStats = new Map<string, { count: number; totalTime: number }>();
    for (const metric of metrics) {
      const existing = tableStats.get(metric.table) || { count: 0, totalTime: 0 };
      existing.count++;
      existing.totalTime += metric.executionTime;
      tableStats.set(metric.table, existing);
    }

    const topTables = Array.from(tableStats.entries())
      .map(([table, stats]) => ({
        table,
        queryCount: stats.count,
        avgTime: stats.totalTime / stats.count,
      }))
      .sort((a, b) => b.queryCount - a.queryCount)
      .slice(0, 10);

    // Get all index recommendations
    const recommendations: IndexRecommendation[] = [];
    for (const tableRecs of this.indexRecommendations.values()) {
      recommendations.push(...tableRecs);
    }

    return {
      totalQueries,
      averageExecutionTime,
      cacheHitRate,
      slowQueries,
      topTables,
      recommendations,
    };
  }

  /**
   * Analyze query patterns and generate index recommendations
   */
  async analyzeQueryPatterns(): Promise<IndexRecommendation[]> {
    const metrics = this.getQueryMetrics();
    const recommendations: IndexRecommendation[] = [];

    // Analyze slow queries by table
    const slowQueriesByTable = new Map<string, QueryPerformanceMetrics[]>();
    for (const metric of metrics.filter(m => m.executionTime > this.config.slowQueryThreshold)) {
      const existing = slowQueriesByTable.get(metric.table) || [];
      existing.push(metric);
      slowQueriesByTable.set(metric.table, existing);
    }

    // Generate recommendations for tables with frequent slow queries
    for (const [table, slowMetrics] of slowQueriesByTable) {
      if (slowMetrics.length >= 5) { // Threshold for recommendation
        const avgTime = slowMetrics.reduce((sum, m) => sum + m.executionTime, 0) / slowMetrics.length;
        
        // Suggest composite indexes for complex queries
        if (this.needsCompositeIndex(table)) {
          recommendations.push({
            table,
            columns: this.suggestCompositeIndexColumns(table),
            type: 'btree',
            reasoning: `Table ${table} has ${slowMetrics.length} slow queries with average execution time of ${avgTime.toFixed(2)}ms`,
            expectedImprovement: Math.min(80, avgTime / 100), // Estimate improvement percentage
            priority: avgTime > 2000 ? 'high' : avgTime > 1000 ? 'medium' : 'low',
          });
        }

        // Suggest partial indexes for filtered queries
        if (this.needsPartialIndex(table)) {
          recommendations.push({
            table,
            columns: this.suggestPartialIndexColumns(table),
            type: 'btree',
            reasoning: `Table ${table} frequently queries with status filters`,
            expectedImprovement: 60,
            priority: 'medium',
          });
        }
      }
    }

    // Store recommendations
    for (const rec of recommendations) {
      const existing = this.indexRecommendations.get(rec.table) || [];
      existing.push(rec);
      this.indexRecommendations.set(rec.table, existing);
    }

    return recommendations;
  }

  /**
   * Refresh materialized views for analytics
   */
  async refreshAnalyticsViews(): Promise<{ success: boolean; refreshedViews: string[]; error?: any }> {
    try {
      const { error } = await dbConnectionPool.executeQuery(
        async (client: SupabaseClient) => {
          return await client.rpc('refresh_analytics_views');
        },
        {
          priority: 'low',
          tags: ['maintenance', 'analytics-refresh'],
        }
      );

      if (error) throw error;

      const refreshedViews = [
        'mv_student_performance_summary',
        'mv_teacher_utilization_summary',
        'mv_daily_analytics_summary',
      ];

      // Clear related cache entries
      this.clearCacheByPattern('analytics');

      return { success: true, refreshedViews };
    } catch (error) {
      logger.error('[Query Optimization] Failed to refresh analytics views:', error);
      return { success: false, refreshedViews: [], error };
    }
  }

  /**
   * Clear query cache
   */
  clearCache(pattern?: string): void {
    if (pattern) {
      this.clearCacheByPattern(pattern);
    } else {
      this.queryCache.clear();
    }
  }

  // Private methods

  private async optimizeQuery(options: OptimizedQueryOptions): Promise<OptimizedQueryOptions> {
    if (!options.enableOptimization) return options;

    const optimized = { ...options };

    // Apply table-specific optimizations
    switch (options.table) {
      case 'students':
        optimized.useIndex = this.suggestStudentIndexes(options);
        break;
      case 'bookings':
        optimized.useIndex = this.suggestBookingIndexes(options);
        break;
      case 'hour_transactions':
        optimized.useIndex = this.suggestHourTransactionIndexes(options);
        break;
      case 'classes':
        optimized.useIndex = this.suggestClassIndexes(options);
        break;
    }

    // Optimize SELECT clause
    if (!optimized.select || optimized.select === '*') {
      optimized.select = this.suggestSelectClause(options.table);
    }

    // Optimize ORDER BY for pagination
    if (optimized.limit && !optimized.orderBy) {
      optimized.orderBy = { column: 'created_at', ascending: false };
    }

    return optimized;
  }

  private async executeSupabaseQuery(client: SupabaseClient, options: OptimizedQueryOptions): Promise<{ data: any; error: any }> {
    let query = client.from(options.table).select(options.select || '*');

    // Apply filters
    if (options.filters) {
      for (const filter of options.filters) {
        query = query[filter.operator](filter.column, filter.value);
      }
    }

    // Apply ordering
    if (options.orderBy) {
      query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending ?? true });
    }

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 1000) - 1);
    }

    return await query;
  }

  private suggestStudentIndexes(options: OptimizedQueryOptions): string[] {
    const indexes = [];
    
    const filters = options.filters || [];
    const hasTestLevelFilter = filters.some(f => f.column === 'test_level');
    const hasStatusFilter = filters.some(f => f.column === 'status');
    const hasDateFilter = filters.some(f => f.column.includes('date'));

    if (hasTestLevelFilter && hasStatusFilter) {
      indexes.push('idx_students_test_level_status');
    }
    if (hasDateFilter) {
      indexes.push('idx_students_enrollment_date_level');
    }

    return indexes;
  }

  private suggestBookingIndexes(options: OptimizedQueryOptions): string[] {
    const indexes = [];
    
    const filters = options.filters || [];
    const hasStudentFilter = filters.some(f => f.column === 'student_id');
    const hasStatusFilter = filters.some(f => f.column === 'status');
    const hasDateFilter = filters.some(f => f.column.includes('date') || f.column.includes('time'));

    if (hasStudentFilter && hasDateFilter && hasStatusFilter) {
      indexes.push('idx_bookings_student_date_status');
    }
    if (hasDateFilter && hasStatusFilter) {
      indexes.push('idx_bookings_time_range_performance');
    }

    return indexes;
  }

  private suggestHourTransactionIndexes(options: OptimizedQueryOptions): string[] {
    const indexes = [];
    
    const filters = options.filters || [];
    const hasStudentFilter = filters.some(f => f.column === 'student_id');
    const hasTypeFilter = filters.some(f => f.column === 'transaction_type');
    const hasDateFilter = filters.some(f => f.column === 'created_at');

    if (hasStudentFilter && hasDateFilter && hasTypeFilter) {
      indexes.push('idx_hour_transactions_analytics');
    }

    return indexes;
  }

  private suggestClassIndexes(options: OptimizedQueryOptions): string[] {
    const indexes = [];
    
    const filters = options.filters || [];
    const hasTeacherFilter = filters.some(f => f.column === 'teacher_id');
    const hasCapacityFilter = filters.some(f => f.column === 'capacity' || f.column === 'current_enrollment');

    if (hasTeacherFilter && hasCapacityFilter) {
      indexes.push('idx_classes_teacher_capacity');
    }

    return indexes;
  }

  private suggestSelectClause(table: string): string {
    const essentialColumns = {
      students: 'id, user_id, full_name, test_level, remaining_hours, created_at',
      bookings: 'id, student_id, class_id, booking_date, start_time, status',
      classes: 'id, course_id, teacher_id, capacity, current_enrollment, start_date',
      hour_transactions: 'id, student_id, transaction_type, hours_amount, created_at',
      teachers: 'id, user_id, full_name, hourly_rate, availability',
    };

    return essentialColumns[table as keyof typeof essentialColumns] || '*';
  }

  private needsCompositeIndex(table: string): boolean {
    const metrics = this.getQueryMetrics(table);
    const slowQueries = metrics.filter(m => m.executionTime > this.config.slowQueryThreshold);
    return slowQueries.length >= 5;
  }

  private needsPartialIndex(table: string): boolean {
    // Tables that frequently filter by status or active flags
    const statusTables = ['students', 'bookings', 'hour_purchases', 'leave_requests'];
    return statusTables.includes(table);
  }

  private suggestCompositeIndexColumns(table: string): string[] {
    const commonComposites = {
      students: ['test_level', 'enrollment_date', 'remaining_hours'],
      bookings: ['student_id', 'booking_date', 'status'],
      hour_transactions: ['student_id', 'created_at', 'transaction_type'],
      classes: ['teacher_id', 'start_date', 'capacity'],
    };

    return commonComposites[table as keyof typeof commonComposites] || ['id', 'created_at'];
  }

  private suggestPartialIndexColumns(table: string): string[] {
    const partialIndexes = {
      students: ['status'],
      bookings: ['status'],
      hour_purchases: ['is_active', 'payment_status'],
      leave_requests: ['status'],
    };

    return partialIndexes[table as keyof typeof partialIndexes] || ['status'];
  }

  private generateQueryId(options: OptimizedQueryOptions): string {
    const hash = this.hashString(JSON.stringify(options));
    return `query_${options.table}_${hash.slice(0, 8)}`;
  }

  private generateCacheKey(options: OptimizedQueryOptions): string {
    const keyData = {
      table: options.table,
      select: options.select,
      filters: options.filters,
      orderBy: options.orderBy,
      limit: options.limit,
      offset: options.offset,
    };
    return `cache_${this.hashString(JSON.stringify(keyData))}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private getFromCache(key: string): any | null {
    const cached = this.queryCache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.queryCache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: any, ttl: number): void {
    this.queryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  private clearCacheByPattern(pattern: string): void {
    for (const [key] of this.queryCache) {
      if (key.includes(pattern)) {
        this.queryCache.delete(key);
      }
    }
  }

  private getAppliedOptimizations(original: OptimizedQueryOptions, optimized: OptimizedQueryOptions): string[] {
    const optimizations = [];

    if (optimized.useIndex && optimized.useIndex.length > 0) {
      optimizations.push('index-suggestion');
    }
    if (optimized.select !== original.select) {
      optimizations.push('select-optimization');
    }
    if (optimized.orderBy && !original.orderBy) {
      optimizations.push('order-optimization');
    }

    return optimizations;
  }

  private recordMetrics(queryId: string, metrics: QueryPerformanceMetrics): void {
    if (!this.config.enablePerformanceLogging) return;

    const existing = this.queryMetrics.get(queryId) || [];
    existing.push(metrics);
    
    // Keep only the last 100 metrics per query
    if (existing.length > 100) {
      existing.splice(0, existing.length - 100);
    }
    
    this.queryMetrics.set(queryId, existing);
  }
}

// Export singleton instance
export const queryOptimizationService = new QueryOptimizationService({
  enableQueryCache: process.env.NODE_ENV === 'production',
  defaultCacheTTL: 300000, // 5 minutes
  enableQueryPlan: process.env.NODE_ENV === 'development',
  enablePerformanceLogging: true,
  slowQueryThreshold: 1000, // 1 second
  maxRetries: 3,
  retryDelay: 1000,
});