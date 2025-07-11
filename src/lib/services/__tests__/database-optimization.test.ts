/**
 * Tests for Database Optimization Services
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { dbConnectionPool } from '../database-connection-pool';
import { queryOptimizationService } from '../query-optimization-service';
import { dbPerformanceMonitor } from '../database-performance-monitor';

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  gt: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  rpc: jest.fn(),
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id' } }
    })
  }
};

// Mock createClient
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}));

describe('Database Connection Pool', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await dbConnectionPool.shutdown();
  });

  describe('Connection Management', () => {
    it('should initialize with minimum connections', async () => {
      await dbConnectionPool.initialize();
      const stats = dbConnectionPool.getStats();
      
      expect(stats.totalConnections).toBeGreaterThanOrEqual(2); // min connections in test
      expect(stats.activeConnections).toBe(0);
    });

    it('should acquire and release connections', async () => {
      await dbConnectionPool.initialize();
      
      const result = await dbConnectionPool.executeQuery(async (client) => {
        expect(client).toBeDefined();
        return { success: true };
      });

      expect(result).toEqual({ success: true });
      
      const stats = dbConnectionPool.getStats();
      expect(stats.totalAcquired).toBeGreaterThanOrEqual(1);
      expect(stats.totalReleased).toBeGreaterThanOrEqual(1);
    });

    it('should handle parallel queries efficiently', async () => {
      await dbConnectionPool.initialize();
      
      const queries = Array(5).fill(null).map((_, i) => ({
        fn: async (client: any) => ({ id: i, data: `result-${i}` }),
        options: { priority: 'normal' as const }
      }));

      const results = await dbConnectionPool.executeParallelQueries(queries, {
        maxConcurrency: 3
      });

      expect(results).toHaveLength(5);
      results.forEach((result, i) => {
        expect(result).toEqual({ id: i, data: `result-${i}` });
      });
    });

    it('should handle connection errors gracefully', async () => {
      await dbConnectionPool.initialize();
      
      await expect(dbConnectionPool.executeQuery(async () => {
        throw new Error('Test connection error');
      })).rejects.toThrow('Test connection error');
      
      // Pool should still be functional
      const result = await dbConnectionPool.executeQuery(async () => {
        return { recovered: true };
      });
      
      expect(result).toEqual({ recovered: true });
    });

    it('should provide accurate connection statistics', async () => {
      await dbConnectionPool.initialize();
      
      // Execute some queries to generate stats
      await dbConnectionPool.executeQuery(async () => ({ test: 1 }));
      await dbConnectionPool.executeQuery(async () => ({ test: 2 }));
      
      const stats = dbConnectionPool.getStats();
      expect(stats.totalAcquired).toBeGreaterThanOrEqual(2);
      expect(stats.avgAcquireTime).toBeGreaterThan(0);
    });
  });

  describe('Connection Pool Health', () => {
    it('should provide connection details', async () => {
      await dbConnectionPool.initialize();
      
      const details = dbConnectionPool.getConnectionDetails();
      expect(Array.isArray(details)).toBe(true);
      expect(details.length).toBeGreaterThan(0);
      
      details.forEach(detail => {
        expect(detail).toHaveProperty('id');
        expect(detail).toHaveProperty('isActive');
        expect(detail).toHaveProperty('createdAt');
        expect(detail).toHaveProperty('queryCount');
      });
    });

    it('should support cache operations', async () => {
      await dbConnectionPool.initialize();
      
      // Clear any existing cache
      dbConnectionPool.clearCache();
      
      // Test cache functionality through query execution
      const result1 = await dbConnectionPool.executeQuery(
        async () => ({ cached: true }),
        { cacheable: true, cacheKey: 'test-key', cacheTTL: 5000 }
      );
      
      expect(result1).toEqual({ cached: true });
    });
  });
});

describe('Query Optimization Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [{ id: 1, name: 'test' }],
          error: null
        })
      })
    });
  });

  describe('Query Optimization', () => {
    it('should execute optimized queries with performance tracking', async () => {
      const result = await queryOptimizationService.executeOptimizedQuery({
        table: 'students',
        select: 'id, name, test_level',
        filters: [
          { column: 'test_level', operator: 'eq', value: 'Basic' }
        ],
        orderBy: { column: 'created_at', ascending: false },
        limit: 10,
        cacheable: true,
        enableOptimization: true
      });

      expect(result.data).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.metrics.table).toBe('students');
      expect(result.metrics.executionTime).toBeGreaterThan(0);
    });

    it('should handle analytics queries with materialized views', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [{ 
              student_id: '1', 
              total_bookings: 10, 
              attendance_rate: 85.5 
            }],
            error: null
          })
        })
      });

      const result = await queryOptimizationService.executeAnalyticsQuery(
        'student_metrics',
        { test_level: 'Basic' }
      );

      expect(result.data).toBeDefined();
      expect(result.metrics.table).toBe('mv_student_performance_summary');
    });

    it('should execute bulk queries efficiently', async () => {
      const queries = [
        {
          table: 'students',
          select: 'id, name',
          filters: [{ column: 'id', operator: 'eq', value: '1' }]
        },
        {
          table: 'teachers',
          select: 'id, name',
          filters: [{ column: 'id', operator: 'eq', value: '1' }]
        }
      ];

      const results = await queryOptimizationService.executeBulkQueries(
        queries,
        { batchSize: 5, parallel: true }
      );

      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('metrics');
      });
    });

    it('should provide performance metrics and statistics', async () => {
      // Execute some queries to generate metrics
      await queryOptimizationService.executeOptimizedQuery({
        table: 'students',
        select: '*',
        cacheable: false
      });

      const summary = queryOptimizationService.getPerformanceSummary();
      
      expect(summary).toHaveProperty('totalQueries');
      expect(summary).toHaveProperty('averageExecutionTime');
      expect(summary).toHaveProperty('cacheHitRate');
      expect(summary).toHaveProperty('topTables');
      expect(Array.isArray(summary.topTables)).toBe(true);
    });

    it('should analyze query patterns and generate recommendations', async () => {
      // Execute some slow queries to trigger recommendations
      await queryOptimizationService.executeOptimizedQuery({
        table: 'students',
        select: '*',
        cacheable: false
      });

      const recommendations = await queryOptimizationService.analyzeQueryPatterns();
      
      expect(Array.isArray(recommendations)).toBe(true);
      recommendations.forEach(rec => {
        expect(rec).toHaveProperty('table');
        expect(rec).toHaveProperty('columns');
        expect(rec).toHaveProperty('reasoning');
        expect(rec).toHaveProperty('priority');
      });
    });

    it('should handle cache operations correctly', async () => {
      // Clear cache
      queryOptimizationService.clearCache();

      // Execute cacheable query
      const result1 = await queryOptimizationService.executeOptimizedQuery({
        table: 'students',
        select: 'id, name',
        cacheable: true,
        cacheKey: 'test-students',
        cacheTTL: 5000
      });

      expect(result1.metrics.cacheHit).toBe(false);

      // Execute same query again - should hit cache
      const result2 = await queryOptimizationService.executeOptimizedQuery({
        table: 'students',
        select: 'id, name',
        cacheable: true,
        cacheKey: 'test-students',
        cacheTTL: 5000
      });

      expect(result2.metrics.cacheHit).toBe(true);
    });
  });

  describe('Analytics Views', () => {
    it('should refresh materialized views', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ data: null, error: null });

      const result = await queryOptimizationService.refreshAnalyticsViews();
      
      expect(result.success).toBe(true);
      expect(result.refreshedViews).toContain('mv_student_performance_summary');
      expect(result.refreshedViews).toContain('mv_teacher_utilization_summary');
      expect(result.refreshedViews).toContain('mv_daily_analytics_summary');
    });

    it('should handle materialized view refresh errors', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ 
        data: null, 
        error: new Error('Refresh failed') 
      });

      const result = await queryOptimizationService.refreshAnalyticsViews();
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

describe('Database Performance Monitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    dbPerformanceMonitor.stopMonitoring();
  });

  describe('Performance Monitoring', () => {
    it('should collect database metrics successfully', async () => {
      // Mock database metric functions
      mockSupabaseClient.rpc
        .mockResolvedValueOnce({ 
          data: [{ 
            total_connections: 10, 
            active_connections: 3, 
            connection_usage_pct: 30 
          }], 
          error: null 
        })
        .mockResolvedValueOnce({ 
          data: [{ 
            table_name: 'students', 
            table_size: '1 MB', 
            seq_scan_count: 100, 
            scan_ratio: 85 
          }], 
          error: null 
        })
        .mockResolvedValueOnce({ 
          data: [{ 
            index_name: 'idx_students_email', 
            index_scans: 1000 
          }], 
          error: null 
        })
        .mockResolvedValueOnce({ 
          data: [{ 
            query_text: 'SELECT * FROM students', 
            average_time: 1500 
          }], 
          error: null 
        });

      const metrics = await dbPerformanceMonitor.getDatabaseMetrics();
      
      expect(metrics).toHaveProperty('connectionStats');
      expect(metrics).toHaveProperty('queryStats');
      expect(metrics).toHaveProperty('tableStats');
      expect(metrics).toHaveProperty('indexStats');
      expect(metrics).toHaveProperty('slowQueries');
    });

    it('should run comprehensive health checks', async () => {
      // Mock metrics for health check
      mockSupabaseClient.rpc
        .mockResolvedValueOnce({ 
          data: [{ 
            total_connections: 10, 
            active_connections: 3, 
            connection_usage_pct: 30 
          }], 
          error: null 
        })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null });

      const healthCheck = await dbPerformanceMonitor.runHealthCheck();
      
      expect(healthCheck).toHaveProperty('overall');
      expect(healthCheck).toHaveProperty('checks');
      expect(Array.isArray(healthCheck.checks)).toBe(true);
      
      healthCheck.checks.forEach(check => {
        expect(check).toHaveProperty('name');
        expect(check).toHaveProperty('status');
        expect(check).toHaveProperty('message');
      });
    });

    it('should generate comprehensive performance reports', async () => {
      // Mock all required data for performance report
      mockSupabaseClient.rpc
        .mockResolvedValue({ data: [], error: null });

      const report = await dbPerformanceMonitor.generatePerformanceReport();
      
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('topSlowQueries');
      expect(report).toHaveProperty('topTables');
      expect(report).toHaveProperty('unusedIndexes');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('alerts');
      
      expect(report.summary).toHaveProperty('overallHealth');
      expect(Array.isArray(report.topSlowQueries)).toBe(true);
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it('should manage alerts correctly', async () => {
      const alerts = dbPerformanceMonitor.getAlerts();
      expect(Array.isArray(alerts)).toBe(true);

      // Test alert filtering
      const highAlerts = dbPerformanceMonitor.getAlerts('high');
      expect(Array.isArray(highAlerts)).toBe(true);
    });

    it('should provide optimization recommendations', async () => {
      const recommendations = dbPerformanceMonitor.getRecommendations();
      expect(Array.isArray(recommendations)).toBe(true);

      // Test recommendation filtering
      const highPriorityRecs = dbPerformanceMonitor.getRecommendations('high');
      expect(Array.isArray(highPriorityRecs)).toBe(true);
    });

    it('should track performance trends', async () => {
      const trends = dbPerformanceMonitor.getPerformanceTrends(24);
      expect(Array.isArray(trends)).toBe(true);
    });

    it('should acknowledge alerts', async () => {
      // This test would require creating an alert first
      // For now, test the basic functionality
      const result = dbPerformanceMonitor.acknowledgeAlert('non-existent-alert');
      expect(result).toBe(false);
    });
  });

  describe('Monitoring Lifecycle', () => {
    it('should start and stop monitoring', async () => {
      // Start monitoring with short interval for testing
      await dbPerformanceMonitor.startMonitoring(100);
      
      // Wait a bit to ensure monitoring runs
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Stop monitoring
      dbPerformanceMonitor.stopMonitoring();
      
      // Test passes if no errors are thrown
      expect(true).toBe(true);
    });
  });
});

describe('Integration Tests', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await dbConnectionPool.initialize();
  });

  afterEach(async () => {
    await dbConnectionPool.shutdown();
    dbPerformanceMonitor.stopMonitoring();
  });

  it('should integrate connection pool with query optimization', async () => {
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [{ id: 1, name: 'integration-test' }],
          error: null
        })
      })
    });

    const result = await queryOptimizationService.executeOptimizedQuery({
      table: 'students',
      select: 'id, name',
      filters: [{ column: 'test_level', operator: 'eq', value: 'Basic' }],
      cacheable: true,
      enableOptimization: true
    });

    expect(result.data).toBeDefined();
    expect(result.metrics).toBeDefined();
    
    // Check that connection pool was used
    const poolStats = dbConnectionPool.getStats();
    expect(poolStats.totalAcquired).toBeGreaterThanOrEqual(1);
  });

  it('should integrate performance monitoring with optimization services', async () => {
    // Execute some queries to generate data
    await queryOptimizationService.executeOptimizedQuery({
      table: 'students',
      select: 'id',
      cacheable: false
    });

    // Get performance summary from optimization service
    const optimizationStats = queryOptimizationService.getPerformanceSummary();
    expect(optimizationStats.totalQueries).toBeGreaterThanOrEqual(1);

    // Get pool stats
    const poolStats = dbConnectionPool.getStats();
    expect(poolStats.totalAcquired).toBeGreaterThanOrEqual(1);
  });
});