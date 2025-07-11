/**
 * Resource Monitoring Service Module
 * 
 * This module handles system resource monitoring including:
 * - Memory usage tracking
 * - CPU usage monitoring
 * - Network request tracking
 * - Resource leak detection
 * - Performance bottleneck identification
 */

import { 
  IResourceMonitoringService, 
  ServiceDependencies, 
  ServiceContainer, 
  withErrorHandling,
  ServiceError
} from '../../interfaces/service-interfaces';

export interface ResourceUsage {
  timestamp: Date;
  memoryUsage: number; // MB
  cpuUsage: number; // percentage
  networkRequests: number;
  activeConnections: number;
  cacheHitRate: number; // percentage
  errorRate: number; // percentage
  metadata?: Record<string, any>;
}

export interface ResourceLeak {
  component: string;
  type: 'memory' | 'cpu' | 'network';
  growth: number; // rate of growth
  severity: 'low' | 'medium' | 'high';
  detectedAt: Date;
  description: string;
  recommendations: string[];
}

export interface PerformanceBottleneck {
  component: string;
  type: 'cpu' | 'memory' | 'network' | 'database';
  impact: 'low' | 'medium' | 'high';
  detectedAt: Date;
  description: string;
  affectedOperations: string[];
  recommendations: string[];
}

export class ResourceMonitoringService implements IResourceMonitoringService {
  readonly serviceName = 'ResourceMonitoringService';
  readonly version = '1.0.0';
  
  private readonly supabase;
  private readonly logger;
  private resourceHistory: ResourceUsage[] = [];
  private maxHistorySize = 1000;
  private monitoringInterval?: NodeJS.Timeout;
  private isMonitoring = false;

  // Thresholds for resource monitoring
  private readonly thresholds = {
    highMemoryUsage: 500, // MB
    criticalMemoryUsage: 1000, // MB
    highCpuUsage: 80, // percentage
    criticalCpuUsage: 95, // percentage
    highNetworkRequests: 100, // per minute
    lowCacheHitRate: 70, // percentage
    highErrorRate: 5 // percentage
  };

  constructor(dependencies?: ServiceDependencies) {
    const deps = dependencies || ServiceContainer.getInstance().getDependencies();
    this.supabase = deps.supabase;
    this.logger = deps.logger;
    
    this.startMonitoring();
  }

  async isHealthy(): Promise<boolean> {
    try {
      // Check if we can access performance APIs
      const canMonitor = typeof performance !== 'undefined' && 
                        typeof navigator !== 'undefined';
      
      return canMonitor;
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * Record resource usage snapshot
   */
  async recordResourceUsage(params: {
    memoryUsage: number;
    cpuUsage: number;
    networkRequests: number;
    timestamp: Date;
  }): Promise<void> {
    try {
      const resourceUsage: ResourceUsage = {
        timestamp: params.timestamp,
        memoryUsage: params.memoryUsage,
        cpuUsage: params.cpuUsage,
        networkRequests: params.networkRequests,
        activeConnections: await this.getActiveConnections(),
        cacheHitRate: await this.getCacheHitRate(),
        errorRate: await this.getErrorRate(),
        metadata: {
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
          url: typeof window !== 'undefined' ? window.location.href : undefined
        }
      };

      this.resourceHistory.push(resourceUsage);
      
      // Maintain history size
      if (this.resourceHistory.length > this.maxHistorySize) {
        this.resourceHistory = this.resourceHistory.slice(-this.maxHistorySize);
      }

      // Check for performance issues
      await this.checkResourceThresholds(resourceUsage);

      // Store in database if in production
      if (process.env.NODE_ENV === 'production') {
        await this.storeResourceUsage(resourceUsage);
      }

      this.logger.debug('Resource usage recorded', {
        memoryUsage: resourceUsage.memoryUsage,
        cpuUsage: resourceUsage.cpuUsage,
        networkRequests: resourceUsage.networkRequests
      });
    } catch (error) {
      this.logger.error('Failed to record resource usage', { params, error });
    }
  }

  /**
   * Get resource usage trends
   */
  async getResourceTrends(timeRange: { start: Date; end: Date }): Promise<{
    memory: Array<{ timestamp: Date; usage: number }>;
    cpu: Array<{ timestamp: Date; usage: number }>;
    network: Array<{ timestamp: Date; requests: number }>;
  }> {
    try {
      this.logger.info('Getting resource trends', { timeRange });

      const { data, error } = await this.supabase
        .from('resource_usage')
        .select('*')
        .gte('timestamp', timeRange.start.toISOString())
        .lte('timestamp', timeRange.end.toISOString())
        .order('timestamp', { ascending: true });

      if (error) {
        throw this.createServiceError('FETCH_TRENDS_ERROR', 'Failed to fetch resource trends', error);
      }

      const trends = {
        memory: [] as Array<{ timestamp: Date; usage: number }>,
        cpu: [] as Array<{ timestamp: Date; usage: number }>,
        network: [] as Array<{ timestamp: Date; requests: number }>
      };

      data?.forEach(record => {
        const timestamp = new Date(record.timestamp);
        trends.memory.push({ timestamp, usage: record.memory_usage });
        trends.cpu.push({ timestamp, usage: record.cpu_usage });
        trends.network.push({ timestamp, requests: record.network_requests });
      });

      this.logger.info('Successfully retrieved resource trends', {
        timeRange,
        dataPoints: data?.length || 0
      });

      return trends;
    } catch (error) {
      this.logger.error('Failed to get resource trends', { timeRange, error });
      throw error;
    }
  }

  /**
   * Detect resource leaks
   */
  async detectResourceLeaks(): Promise<{
    memoryLeaks: Array<{ component: string; growth: number }>;
    cpuHogs: Array<{ component: string; usage: number }>;
  }> {
    try {
      this.logger.info('Detecting resource leaks');

      const leaks = {
        memoryLeaks: [] as Array<{ component: string; growth: number }>,
        cpuHogs: [] as Array<{ component: string; usage: number }>
      };

      // Analyze memory trends
      const memoryLeaks = await this.analyzeMemoryLeaks();
      leaks.memoryLeaks = memoryLeaks;

      // Analyze CPU usage patterns
      const cpuHogs = await this.analyzeCpuUsage();
      leaks.cpuHogs = cpuHogs;

      this.logger.info('Resource leak detection completed', {
        memoryLeaks: leaks.memoryLeaks.length,
        cpuHogs: leaks.cpuHogs.length
      });

      return leaks;
    } catch (error) {
      this.logger.error('Failed to detect resource leaks', { error });
      throw error;
    }
  }

  /**
   * Get current resource usage
   */
  async getCurrentResourceUsage(): Promise<ResourceUsage> {
    try {
      const memoryUsage = await this.getMemoryUsage();
      const cpuUsage = await this.getCpuUsage();
      const networkRequests = await this.getNetworkRequests();

      return {
        timestamp: new Date(),
        memoryUsage,
        cpuUsage,
        networkRequests,
        activeConnections: await this.getActiveConnections(),
        cacheHitRate: await this.getCacheHitRate(),
        errorRate: await this.getErrorRate()
      };
    } catch (error) {
      this.logger.error('Failed to get current resource usage', { error });
      throw error;
    }
  }

  /**
   * Get resource usage statistics
   */
  async getResourceStats(timeRange: { start: Date; end: Date }): Promise<{
    avgMemoryUsage: number;
    peakMemoryUsage: number;
    avgCpuUsage: number;
    peakCpuUsage: number;
    totalNetworkRequests: number;
    avgCacheHitRate: number;
    avgErrorRate: number;
    resourceEfficiency: number;
  }> {
    try {
      this.logger.info('Calculating resource statistics', { timeRange });

      const trends = await this.getResourceTrends(timeRange);
      
      const stats = {
        avgMemoryUsage: 0,
        peakMemoryUsage: 0,
        avgCpuUsage: 0,
        peakCpuUsage: 0,
        totalNetworkRequests: 0,
        avgCacheHitRate: 0,
        avgErrorRate: 0,
        resourceEfficiency: 0
      };

      if (trends.memory.length > 0) {
        stats.avgMemoryUsage = trends.memory.reduce((sum, item) => sum + item.usage, 0) / trends.memory.length;
        stats.peakMemoryUsage = Math.max(...trends.memory.map(item => item.usage));
      }

      if (trends.cpu.length > 0) {
        stats.avgCpuUsage = trends.cpu.reduce((sum, item) => sum + item.usage, 0) / trends.cpu.length;
        stats.peakCpuUsage = Math.max(...trends.cpu.map(item => item.usage));
      }

      if (trends.network.length > 0) {
        stats.totalNetworkRequests = trends.network.reduce((sum, item) => sum + item.requests, 0);
      }

      // Get cache hit rate and error rate from stored data
      const { data: usageData } = await this.supabase
        .from('resource_usage')
        .select('cache_hit_rate, error_rate')
        .gte('timestamp', timeRange.start.toISOString())
        .lte('timestamp', timeRange.end.toISOString());

      if (usageData && usageData.length > 0) {
        stats.avgCacheHitRate = usageData.reduce((sum, item) => sum + (item.cache_hit_rate || 0), 0) / usageData.length;
        stats.avgErrorRate = usageData.reduce((sum, item) => sum + (item.error_rate || 0), 0) / usageData.length;
      }

      // Calculate resource efficiency (higher is better)
      stats.resourceEfficiency = this.calculateResourceEfficiency(stats);

      this.logger.info('Successfully calculated resource statistics', {
        timeRange,
        avgMemoryUsage: stats.avgMemoryUsage,
        avgCpuUsage: stats.avgCpuUsage,
        resourceEfficiency: stats.resourceEfficiency
      });

      return stats;
    } catch (error) {
      this.logger.error('Failed to calculate resource stats', { timeRange, error });
      throw error;
    }
  }

  /**
   * Identify performance bottlenecks
   */
  async identifyBottlenecks(): Promise<PerformanceBottleneck[]> {
    try {
      this.logger.info('Identifying performance bottlenecks');

      const bottlenecks: PerformanceBottleneck[] = [];
      const currentUsage = await this.getCurrentResourceUsage();

      // Check memory bottlenecks
      if (currentUsage.memoryUsage > this.thresholds.highMemoryUsage) {
        bottlenecks.push({
          component: 'Memory',
          type: 'memory',
          impact: currentUsage.memoryUsage > this.thresholds.criticalMemoryUsage ? 'high' : 'medium',
          detectedAt: new Date(),
          description: `High memory usage detected: ${currentUsage.memoryUsage}MB`,
          affectedOperations: ['Page rendering', 'Data processing', 'Component updates'],
          recommendations: [
            'Optimize memory usage by reducing object creation',
            'Implement proper cleanup in useEffect hooks',
            'Consider lazy loading for large datasets',
            'Use React.memo for expensive components'
          ]
        });
      }

      // Check CPU bottlenecks
      if (currentUsage.cpuUsage > this.thresholds.highCpuUsage) {
        bottlenecks.push({
          component: 'CPU',
          type: 'cpu',
          impact: currentUsage.cpuUsage > this.thresholds.criticalCpuUsage ? 'high' : 'medium',
          detectedAt: new Date(),
          description: `High CPU usage detected: ${currentUsage.cpuUsage}%`,
          affectedOperations: ['UI rendering', 'Data calculations', 'Event handling'],
          recommendations: [
            'Optimize expensive calculations',
            'Use Web Workers for heavy computations',
            'Implement debouncing for frequent operations',
            'Consider code splitting to reduce bundle size'
          ]
        });
      }

      // Check network bottlenecks
      if (currentUsage.networkRequests > this.thresholds.highNetworkRequests) {
        bottlenecks.push({
          component: 'Network',
          type: 'network',
          impact: 'medium',
          detectedAt: new Date(),
          description: `High network request rate: ${currentUsage.networkRequests} requests/min`,
          affectedOperations: ['API calls', 'Data fetching', 'Real-time updates'],
          recommendations: [
            'Implement request batching',
            'Use caching strategies',
            'Consider GraphQL to reduce over-fetching',
            'Optimize API endpoints'
          ]
        });
      }

      // Check cache performance
      if (currentUsage.cacheHitRate < this.thresholds.lowCacheHitRate) {
        bottlenecks.push({
          component: 'Cache',
          type: 'database',
          impact: 'medium',
          detectedAt: new Date(),
          description: `Low cache hit rate: ${currentUsage.cacheHitRate}%`,
          affectedOperations: ['Data retrieval', 'API responses', 'Database queries'],
          recommendations: [
            'Optimize caching strategy',
            'Implement proper cache invalidation',
            'Use CDN for static assets',
            'Consider database query optimization'
          ]
        });
      }

      this.logger.info('Performance bottleneck analysis completed', {
        bottlenecks: bottlenecks.length
      });

      return bottlenecks;
    } catch (error) {
      this.logger.error('Failed to identify performance bottlenecks', { error });
      throw error;
    }
  }

  // Private helper methods

  private startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(async () => {
      try {
        const currentUsage = await this.getCurrentResourceUsage();
        await this.recordResourceUsage({
          memoryUsage: currentUsage.memoryUsage,
          cpuUsage: currentUsage.cpuUsage,
          networkRequests: currentUsage.networkRequests,
          timestamp: new Date()
        });
      } catch (error) {
        this.logger.error('Monitoring cycle failed', { error });
      }
    }, 60000); // Monitor every minute
  }

  private async getMemoryUsage(): Promise<number> {
    try {
      if (typeof performance !== 'undefined' && 'memory' in performance) {
        const memory = (performance as any).memory;
        return Math.round(memory.usedJSHeapSize / 1024 / 1024); // Convert to MB
      }
      
      // Fallback estimation
      return 0;
    } catch (error) {
      this.logger.debug('Cannot get memory usage', { error });
      return 0;
    }
  }

  private async getCpuUsage(): Promise<number> {
    try {
      // CPU usage is difficult to measure directly in browsers
      // We'll use a simple heuristic based on frame rate
      
      if (typeof performance !== 'undefined' && performance.now) {
        const start = performance.now();
        
        // Perform a small CPU-intensive task
        let sum = 0;
        for (let i = 0; i < 100000; i++) {
          sum += Math.random();
        }
        
        const end = performance.now();
        const duration = end - start;
        
        // Estimate CPU usage based on task duration
        // This is a rough approximation
        return Math.min(100, Math.round(duration / 10));
      }
      
      return 0;
    } catch (error) {
      this.logger.debug('Cannot get CPU usage', { error });
      return 0;
    }
  }

  private async getNetworkRequests(): Promise<number> {
    try {
      if (typeof performance !== 'undefined' && performance.getEntriesByType) {
        const entries = performance.getEntriesByType('resource');
        const oneMinuteAgo = Date.now() - 60000;
        
        return entries.filter(entry => entry.startTime > oneMinuteAgo).length;
      }
      
      return 0;
    } catch (error) {
      this.logger.debug('Cannot get network requests', { error });
      return 0;
    }
  }

  private async getActiveConnections(): Promise<number> {
    try {
      if (typeof navigator !== 'undefined' && 'connection' in navigator) {
        const connection = (navigator as any).connection;
        return connection.downlink || 0;
      }
      
      return 0;
    } catch (error) {
      this.logger.debug('Cannot get active connections', { error });
      return 0;
    }
  }

  private async getCacheHitRate(): Promise<number> {
    try {
      // Get cache hit rate from recent API calls
      const { data, error } = await this.supabase
        .from('performance_metrics')
        .select('metadata')
        .eq('type', 'api')
        .gte('timestamp', Date.now() - 300000) // Last 5 minutes
        .limit(100);

      if (error) return 0;

      if (data && data.length > 0) {
        const cachedCount = data.filter(record => 
          record.metadata?.cacheHit === true
        ).length;
        
        return Math.round((cachedCount / data.length) * 100);
      }
      
      return 0;
    } catch (error) {
      this.logger.debug('Cannot get cache hit rate', { error });
      return 0;
    }
  }

  private async getErrorRate(): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('performance_metrics')
        .select('type, error_details')
        .gte('timestamp', Date.now() - 300000) // Last 5 minutes
        .limit(100);

      if (error) return 0;

      if (data && data.length > 0) {
        const errorCount = data.filter(record => 
          record.type === 'error' || record.error_details
        ).length;
        
        return Math.round((errorCount / data.length) * 100);
      }
      
      return 0;
    } catch (error) {
      this.logger.debug('Cannot get error rate', { error });
      return 0;
    }
  }

  private async analyzeMemoryLeaks(): Promise<Array<{ component: string; growth: number }>> {
    const leaks: Array<{ component: string; growth: number }> = [];
    
    if (this.resourceHistory.length < 10) return leaks;

    // Analyze memory growth trends
    const recentHistory = this.resourceHistory.slice(-10);
    const memoryGrowth = recentHistory[recentHistory.length - 1].memoryUsage - recentHistory[0].memoryUsage;
    const timeSpan = recentHistory[recentHistory.length - 1].timestamp.getTime() - recentHistory[0].timestamp.getTime();
    const growthRate = memoryGrowth / (timeSpan / 60000); // MB per minute

    if (growthRate > 5) { // Growing more than 5MB per minute
      leaks.push({
        component: 'Application',
        growth: growthRate
      });
    }

    return leaks;
  }

  private async analyzeCpuUsage(): Promise<Array<{ component: string; usage: number }>> {
    const cpuHogs: Array<{ component: string; usage: number }> = [];
    
    if (this.resourceHistory.length < 5) return cpuHogs;

    // Analyze recent CPU usage
    const recentHistory = this.resourceHistory.slice(-5);
    const avgCpuUsage = recentHistory.reduce((sum, item) => sum + item.cpuUsage, 0) / recentHistory.length;

    if (avgCpuUsage > this.thresholds.highCpuUsage) {
      cpuHogs.push({
        component: 'Application',
        usage: avgCpuUsage
      });
    }

    return cpuHogs;
  }

  private calculateResourceEfficiency(stats: {
    avgMemoryUsage: number;
    avgCpuUsage: number;
    avgCacheHitRate: number;
    avgErrorRate: number;
  }): number {
    // Calculate efficiency score (0-100)
    let efficiency = 100;
    
    // Penalize high resource usage
    if (stats.avgMemoryUsage > 200) {
      efficiency -= Math.min(30, (stats.avgMemoryUsage - 200) / 10);
    }
    
    if (stats.avgCpuUsage > 50) {
      efficiency -= Math.min(30, (stats.avgCpuUsage - 50) / 2);
    }
    
    // Reward high cache hit rate
    if (stats.avgCacheHitRate > 80) {
      efficiency += Math.min(10, (stats.avgCacheHitRate - 80) / 2);
    }
    
    // Penalize high error rate
    if (stats.avgErrorRate > 1) {
      efficiency -= Math.min(20, stats.avgErrorRate * 5);
    }
    
    return Math.max(0, Math.round(efficiency));
  }

  private async checkResourceThresholds(usage: ResourceUsage): Promise<void> {
    const alerts = [];

    if (usage.memoryUsage > this.thresholds.criticalMemoryUsage) {
      alerts.push({
        type: 'memory',
        severity: 'critical',
        message: `Critical memory usage: ${usage.memoryUsage}MB`,
        value: usage.memoryUsage,
        threshold: this.thresholds.criticalMemoryUsage
      });
    } else if (usage.memoryUsage > this.thresholds.highMemoryUsage) {
      alerts.push({
        type: 'memory',
        severity: 'high',
        message: `High memory usage: ${usage.memoryUsage}MB`,
        value: usage.memoryUsage,
        threshold: this.thresholds.highMemoryUsage
      });
    }

    if (usage.cpuUsage > this.thresholds.criticalCpuUsage) {
      alerts.push({
        type: 'cpu',
        severity: 'critical',
        message: `Critical CPU usage: ${usage.cpuUsage}%`,
        value: usage.cpuUsage,
        threshold: this.thresholds.criticalCpuUsage
      });
    } else if (usage.cpuUsage > this.thresholds.highCpuUsage) {
      alerts.push({
        type: 'cpu',
        severity: 'high',
        message: `High CPU usage: ${usage.cpuUsage}%`,
        value: usage.cpuUsage,
        threshold: this.thresholds.highCpuUsage
      });
    }

    // Log alerts
    for (const alert of alerts) {
      this.logger.warn('Resource threshold exceeded', alert);
    }
  }

  private async storeResourceUsage(usage: ResourceUsage): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('resource_usage')
        .insert({
          timestamp: usage.timestamp.toISOString(),
          memory_usage: usage.memoryUsage,
          cpu_usage: usage.cpuUsage,
          network_requests: usage.networkRequests,
          active_connections: usage.activeConnections,
          cache_hit_rate: usage.cacheHitRate,
          error_rate: usage.errorRate,
          metadata: usage.metadata
        });

      if (error) {
        this.logger.error('Failed to store resource usage:', error);
      }
    } catch (error) {
      this.logger.error('Failed to store resource usage:', error);
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
    this.logger.info('Disposing resource monitoring service');
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    
    this.isMonitoring = false;
    this.resourceHistory = [];
  }
}

// Create and export singleton instance
export const resourceMonitoringService = withErrorHandling(new ResourceMonitoringService());