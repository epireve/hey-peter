/**
 * Database Connection Pool Service
 * 
 * Provides optimized database connection pooling and query management
 * for improved performance and resource utilization.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { performanceMonitor } from '@/lib/utils/performance-monitor';

interface ConnectionPoolConfig {
  maxConnections: number;
  minConnections: number;
  acquireTimeoutMs: number;
  idleTimeoutMs: number;
  maxLifetimeMs: number;
  healthCheckIntervalMs: number;
  retryAttempts: number;
  retryDelayMs: number;
}

interface PoolStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  pendingRequests: number;
  totalAcquired: number;
  totalReleased: number;
  totalErrors: number;
  avgAcquireTime: number;
  avgQueryTime: number;
}

interface Connection {
  id: string;
  client: SupabaseClient;
  isActive: boolean;
  createdAt: Date;
  lastUsedAt: Date;
  queryCount: number;
  errorCount: number;
}

interface QueryOptions {
  timeout?: number;
  priority?: 'low' | 'normal' | 'high';
  tags?: string[];
  cacheable?: boolean;
  cacheKey?: string;
  cacheTTL?: number;
}

interface CachedResult<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class DatabaseConnectionPool {
  private config: ConnectionPoolConfig;
  private connections: Map<string, Connection> = new Map();
  private pendingRequests: Array<{
    resolve: (connection: Connection) => void;
    reject: (error: Error) => void;
    priority: number;
    timestamp: number;
  }> = [];
  private stats: PoolStats = {
    totalConnections: 0,
    activeConnections: 0,
    idleConnections: 0,
    pendingRequests: 0,
    totalAcquired: 0,
    totalReleased: 0,
    totalErrors: 0,
    avgAcquireTime: 0,
    avgQueryTime: 0,
  };
  private queryCache: Map<string, CachedResult> = new Map();
  private healthCheckInterval?: NodeJS.Timeout;
  private isInitialized = false;

  constructor(config: Partial<ConnectionPoolConfig> = {}) {
    this.config = {
      maxConnections: config.maxConnections || 20,
      minConnections: config.minConnections || 5,
      acquireTimeoutMs: config.acquireTimeoutMs || 10000,
      idleTimeoutMs: config.idleTimeoutMs || 30000,
      maxLifetimeMs: config.maxLifetimeMs || 3600000, // 1 hour
      healthCheckIntervalMs: config.healthCheckIntervalMs || 60000, // 1 minute
      retryAttempts: config.retryAttempts || 3,
      retryDelayMs: config.retryDelayMs || 1000,
    };
  }

  /**
   * Initialize the connection pool
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create minimum connections
      for (let i = 0; i < this.config.minConnections; i++) {
        await this.createConnection();
      }

      // Start health check interval
      this.startHealthCheck();
      
      this.isInitialized = true;
      // Pool initialized successfully
    } catch (error) {
      // Initialization failed
      throw error;
    }
  }

  /**
   * Execute a query with connection pooling
   */
  async executeQuery<T = any>(
    queryFn: (client: SupabaseClient) => Promise<T>,
    options: QueryOptions = {}
  ): Promise<T> {
    const startTime = performance.now();
    const { priority = 'normal', timeout = 30000, cacheable = false, cacheKey, cacheTTL = 300000 } = options;

    // Check cache first
    if (cacheable && cacheKey) {
      const cached = this.getFromCache<T>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    let connection: Connection | null = null;
    
    try {
      // Acquire connection
      connection = await this.acquireConnection(priority, timeout);
      
      // Execute query with performance tracking
      const result = await performanceMonitor.trackQuery(
        `pool.query.${queryFn.name || 'anonymous'}`,
        async () => {
          if (!connection) throw new Error('No connection available');
          
          connection.lastUsedAt = new Date();
          connection.queryCount++;
          
          return await queryFn(connection.client);
        },
        { 
          connectionId: connection.id,
          priority,
          ...options.tags && { tags: options.tags }
        }
      );

      // Cache result if requested
      if (cacheable && cacheKey && cacheTTL) {
        this.setCache(cacheKey, result, cacheTTL);
      }

      // Update stats
      const queryTime = performance.now() - startTime;
      this.updateQueryStats(queryTime);

      return result;
    } catch (error) {
      if (connection) {
        connection.errorCount++;
      }
      this.stats.totalErrors++;
      // Query execution failed
      throw error;
    } finally {
      if (connection) {
        this.releaseConnection(connection);
      }
    }
  }

  /**
   * Execute multiple queries in parallel with pooling
   */
  async executeParallelQueries<T = any>(
    queries: Array<{
      fn: (client: SupabaseClient) => Promise<T>;
      options?: QueryOptions;
    }>,
    options: { maxConcurrency?: number } = {}
  ): Promise<T[]> {
    const { maxConcurrency = this.config.maxConnections } = options;
    const results: T[] = [];
    const errors: Error[] = [];

    // Execute queries in batches
    for (let i = 0; i < queries.length; i += maxConcurrency) {
      const batch = queries.slice(i, i + maxConcurrency);
      
      const batchPromises = batch.map(async ({ fn, options }) => {
        try {
          return await this.executeQuery(fn, options);
        } catch (error) {
          errors.push(error as Error);
          throw error;
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push(null as any);
        }
      }
    }

    if (errors.length > 0) {
      // Some queries failed in parallel execution
    }

    return results;
  }

  /**
   * Execute a transaction with retry logic
   */
  async executeTransaction<T>(
    transactionFn: (client: SupabaseClient) => Promise<T>,
    options: QueryOptions & { retryAttempts?: number } = {}
  ): Promise<T> {
    const { retryAttempts = this.config.retryAttempts } = options;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        return await this.executeQuery(async (client) => {
          // Note: Supabase handles transactions differently
          // This is a simplified approach - in production, use proper transaction methods
          return await transactionFn(client);
        }, {
          ...options,
          tags: [...(options.tags || []), `transaction`, `attempt-${attempt}`]
        });
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < retryAttempts) {
          const delay = this.config.retryDelayMs * attempt;
          // Transaction attempt failed, retrying
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Transaction failed after all retry attempts');
  }

  /**
   * Get pool statistics
   */
  getStats(): PoolStats {
    this.updatePoolStats();
    return { ...this.stats };
  }

  /**
   * Get detailed connection information
   */
  getConnectionDetails(): Array<{
    id: string;
    isActive: boolean;
    createdAt: Date;
    lastUsedAt: Date;
    queryCount: number;
    errorCount: number;
    ageMs: number;
  }> {
    const now = new Date();
    return Array.from(this.connections.values()).map(conn => ({
      id: conn.id,
      isActive: conn.isActive,
      createdAt: conn.createdAt,
      lastUsedAt: conn.lastUsedAt,
      queryCount: conn.queryCount,
      errorCount: conn.errorCount,
      ageMs: now.getTime() - conn.createdAt.getTime(),
    }));
  }

  /**
   * Clear query cache
   */
  clearCache(pattern?: string): void {
    if (pattern) {
      for (const [key] of this.queryCache) {
        if (key.includes(pattern)) {
          this.queryCache.delete(key);
        }
      }
    } else {
      this.queryCache.clear();
    }
  }

  /**
   * Gracefully shutdown the pool
   */
  async shutdown(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Wait for pending requests to complete or timeout
    const shutdownTimeout = 10000; // 10 seconds
    const startTime = Date.now();

    while (this.stats.activeConnections > 0 && (Date.now() - startTime) < shutdownTimeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Close all connections
    for (const connection of this.connections.values()) {
      await this.closeConnection(connection);
    }

    this.connections.clear();
    this.queryCache.clear();
    this.isInitialized = false;

    // Pool shutdown completed
  }

  // Private methods

  private async createConnection(): Promise<Connection> {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      
      const client = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
        },
        db: {
          schema: 'public',
        },
        global: {
          headers: {
            'x-connection-pool': 'true',
          },
        },
      });

      const connection: Connection = {
        id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        client,
        isActive: false,
        createdAt: new Date(),
        lastUsedAt: new Date(),
        queryCount: 0,
        errorCount: 0,
      };

      this.connections.set(connection.id, connection);
      this.stats.totalConnections++;

      return connection;
    } catch (error) {
      // Failed to create connection
      throw error;
    }
  }

  private async acquireConnection(priority: string, timeoutMs: number): Promise<Connection> {
    const startTime = performance.now();

    // Try to find an idle connection
    for (const connection of this.connections.values()) {
      if (!connection.isActive) {
        connection.isActive = true;
        this.stats.totalAcquired++;
        
        const acquireTime = performance.now() - startTime;
        this.updateAcquireStats(acquireTime);
        
        return connection;
      }
    }

    // Create new connection if under limit
    if (this.connections.size < this.config.maxConnections) {
      const connection = await this.createConnection();
      connection.isActive = true;
      this.stats.totalAcquired++;
      
      const acquireTime = performance.now() - startTime;
      this.updateAcquireStats(acquireTime);
      
      return connection;
    }

    // Wait for a connection to become available
    return new Promise((resolve, reject) => {
      const priorityValue = priority === 'high' ? 3 : priority === 'normal' ? 2 : 1;
      
      const request = {
        resolve,
        reject,
        priority: priorityValue,
        timestamp: Date.now(),
      };

      this.pendingRequests.push(request);
      this.pendingRequests.sort((a, b) => b.priority - a.priority || a.timestamp - b.timestamp);

      // Set timeout
      setTimeout(() => {
        const index = this.pendingRequests.indexOf(request);
        if (index !== -1) {
          this.pendingRequests.splice(index, 1);
          reject(new Error(`Connection acquire timeout after ${timeoutMs}ms`));
        }
      }, timeoutMs);
    });
  }

  private releaseConnection(connection: Connection): void {
    connection.isActive = false;
    this.stats.totalReleased++;

    // Serve pending requests
    if (this.pendingRequests.length > 0) {
      const request = this.pendingRequests.shift()!;
      connection.isActive = true;
      this.stats.totalAcquired++;
      request.resolve(connection);
    }
  }

  private async closeConnection(connection: Connection): Promise<void> {
    try {
      // Supabase clients don't have an explicit close method
      // The connection will be cleaned up automatically
      this.connections.delete(connection.id);
      this.stats.totalConnections--;
    } catch (error) {
      // Error closing connection
    }
  }

  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, this.config.healthCheckIntervalMs);
  }

  private async performHealthCheck(): Promise<void> {
    const now = new Date();
    const connectionsToClose: Connection[] = [];

    for (const connection of this.connections.values()) {
      // Check if connection is too old
      if (now.getTime() - connection.createdAt.getTime() > this.config.maxLifetimeMs) {
        connectionsToClose.push(connection);
        continue;
      }

      // Check if connection has been idle too long
      if (!connection.isActive && 
          now.getTime() - connection.lastUsedAt.getTime() > this.config.idleTimeoutMs) {
        connectionsToClose.push(connection);
        continue;
      }

      // Check if connection has too many errors
      if (connection.errorCount > 10) {
        connectionsToClose.push(connection);
        continue;
      }
    }

    // Close unhealthy connections
    for (const connection of connectionsToClose) {
      if (!connection.isActive) {
        await this.closeConnection(connection);
      }
    }

    // Ensure minimum connections
    while (this.connections.size < this.config.minConnections) {
      try {
        await this.createConnection();
      } catch (error) {
        // Failed to maintain minimum connections
        break;
      }
    }

    // Clean up expired cache entries
    this.cleanupCache();
  }

  private updatePoolStats(): void {
    this.stats.activeConnections = Array.from(this.connections.values())
      .filter(conn => conn.isActive).length;
    this.stats.idleConnections = this.connections.size - this.stats.activeConnections;
    this.stats.pendingRequests = this.pendingRequests.length;
  }

  private updateAcquireStats(acquireTime: number): void {
    if (this.stats.totalAcquired === 1) {
      this.stats.avgAcquireTime = acquireTime;
    } else {
      this.stats.avgAcquireTime = (
        (this.stats.avgAcquireTime * (this.stats.totalAcquired - 1)) + acquireTime
      ) / this.stats.totalAcquired;
    }
  }

  private updateQueryStats(queryTime: number): void {
    const totalQueries = Array.from(this.connections.values())
      .reduce((sum, conn) => sum + conn.queryCount, 0);
    
    if (totalQueries === 1) {
      this.stats.avgQueryTime = queryTime;
    } else {
      this.stats.avgQueryTime = (
        (this.stats.avgQueryTime * (totalQueries - 1)) + queryTime
      ) / totalQueries;
    }
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.queryCache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.queryCache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache<T>(key: string, data: T, ttl: number): void {
    this.queryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.queryCache) {
      if (now - cached.timestamp > cached.ttl) {
        this.queryCache.delete(key);
      }
    }
  }
}

// Export singleton instance
export const dbConnectionPool = new DatabaseConnectionPool({
  maxConnections: process.env.NODE_ENV === 'production' ? 20 : 10,
  minConnections: process.env.NODE_ENV === 'production' ? 5 : 2,
  acquireTimeoutMs: 10000,
  idleTimeoutMs: 30000,
  maxLifetimeMs: 3600000,
  healthCheckIntervalMs: 60000,
  retryAttempts: 3,
  retryDelayMs: 1000,
});

// Initialize the pool when the module is loaded
if (typeof window === 'undefined') {
  // Only initialize on server side
  dbConnectionPool.initialize().catch(() => {
    // Initialization error handled
  });
}