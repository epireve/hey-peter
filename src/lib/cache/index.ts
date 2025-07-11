/**
 * Comprehensive caching system for Hey Peter Academy LMS
 * Centralizes all caching strategies and utilities
 */

// Core types and interfaces
export * from './types';

// Storage adapters
export * from './storage/browser-storage';
export * from './storage/redis-cache';

// Caching strategies
export * from './stale-while-revalidate';
export * from './invalidation';
export * from './warming';
export * from './monitoring';

// Service worker integration
export * from './service-worker';

// React Query configuration
export * from './query-client-config';

// Advanced cache hooks
export * from '../hooks/useAdvancedCache';

// Re-export the original optimized query hook
export { useOptimizedQuery, usePaginatedQuery, useInfiniteOptimizedQuery } from '../hooks/useOptimizedQuery';

import { CacheStorageConfig, CacheConfig } from './types';
import { createBrowserStorage, UserPreferencesCache } from './storage/browser-storage';
import { createRedisCache } from './storage/redis-cache';
import { CacheMonitor } from './monitoring';
import { CacheInvalidationManager } from './invalidation';
import { CacheWarmingManager } from './warming';
import { SWRManager } from './stale-while-revalidate';
import { serviceWorkerManager } from './service-worker';
import { createOptimizedQueryClient, OptimizedQueryProvider } from './query-client-config';

/**
 * Comprehensive cache system configuration
 */
export interface CacheSystemConfig {
  /** Browser storage configuration */
  browserStorage?: CacheStorageConfig;
  /** Redis cache configuration */
  redisCache?: CacheStorageConfig;
  /** Service worker configuration */
  serviceWorker?: {
    enabled: boolean;
    swPath?: string;
    scope?: string;
  };
  /** Monitoring configuration */
  monitoring?: {
    enabled: boolean;
    maxOperations?: number;
    maxEvents?: number;
    metricsInterval?: number;
  };
  /** Invalidation configuration */
  invalidation?: {
    enabled: boolean;
    autoInvalidation?: boolean;
  };
  /** Cache warming configuration */
  warming?: {
    enabled: boolean;
    warmOnStartup?: boolean;
    warmOnAuth?: boolean;
    warmOnRouteChange?: boolean;
  };
  /** React Query configuration */
  reactQuery?: {
    enableMonitoring?: boolean;
    enableAutoInvalidation?: boolean;
    environment?: 'development' | 'production' | 'test';
  };
}

/**
 * Main cache system class that coordinates all caching strategies
 */
export class CacheSystem {
  private config: CacheSystemConfig;
  private browserStorage?: any;
  private redisCache?: any;
  private monitor?: CacheMonitor;
  private invalidationManager?: CacheInvalidationManager;
  private warmingManager?: CacheWarmingManager;
  private swrManager?: SWRManager;
  private userPreferences?: UserPreferencesCache;
  private isInitialized = false;

  constructor(config: CacheSystemConfig = {}) {
    this.config = {
      browserStorage: {
        type: 'localStorage',
        options: {
          prefix: 'hpa_cache_',
          compression: { enabled: true, algorithm: 'gzip', threshold: 1024 },
          maxEntries: 1000
        }
      },
      serviceWorker: {
        enabled: typeof window !== 'undefined' && 'serviceWorker' in navigator,
        swPath: '/sw.js',
        scope: '/'
      },
      monitoring: {
        enabled: true,
        maxOperations: 5000,
        maxEvents: 2000,
        metricsInterval: 60000
      },
      invalidation: {
        enabled: true,
        autoInvalidation: true
      },
      warming: {
        enabled: true,
        warmOnStartup: true,
        warmOnAuth: true,
        warmOnRouteChange: false
      },
      reactQuery: {
        enableMonitoring: true,
        enableAutoInvalidation: true,
        environment: process.env.NODE_ENV === 'production' ? 'production' : 'development'
      },
      ...config
    };
  }

  /**
   * Initialize the cache system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('Cache system already initialized');
      return;
    }

    try {
      console.log('Initializing comprehensive cache system...');

      // Initialize browser storage
      if (this.config.browserStorage) {
        this.browserStorage = createBrowserStorage(this.config.browserStorage);
        this.userPreferences = new UserPreferencesCache(this.browserStorage);
        console.log('✓ Browser storage initialized');
      }

      // Initialize Redis cache (if configured)
      if (this.config.redisCache) {
        this.redisCache = createRedisCache(this.config.redisCache);
        console.log('✓ Redis cache initialized');
      }

      // Initialize monitoring
      if (this.config.monitoring?.enabled) {
        this.monitor = new CacheMonitor(this.config.monitoring);
        console.log('✓ Cache monitoring initialized');
      }

      // Initialize SWR manager
      const primaryStorage = this.browserStorage || this.redisCache;
      if (primaryStorage) {
        this.swrManager = new SWRManager(primaryStorage);
        console.log('✓ SWR manager initialized');
      }

      // Initialize invalidation manager
      if (this.config.invalidation?.enabled && primaryStorage && this.monitor) {
        const mockCacheManager = this.createCacheManagerAdapter(primaryStorage);
        this.invalidationManager = new CacheInvalidationManager(mockCacheManager);
        console.log('✓ Cache invalidation initialized');
      }

      // Initialize warming manager
      if (this.config.warming?.enabled && primaryStorage) {
        this.warmingManager = new CacheWarmingManager(primaryStorage, this.config.warming);
        console.log('✓ Cache warming initialized');
      }

      // Initialize service worker
      if (this.config.serviceWorker?.enabled) {
        await this.initializeServiceWorker();
        console.log('✓ Service worker initialized');
      }

      this.isInitialized = true;
      console.log('🚀 Cache system fully initialized');

      // Warm critical data on startup
      if (this.config.warming?.warmOnStartup && this.warmingManager) {
        await this.warmingManager.executeWarming('startup');
        console.log('✓ Critical data warmed');
      }

    } catch (error) {
      console.error('Failed to initialize cache system:', error);
      throw error;
    }
  }

  /**
   * Get the browser storage instance
   */
  getBrowserStorage() {
    return this.browserStorage;
  }

  /**
   * Get the Redis cache instance
   */
  getRedisCache() {
    return this.redisCache;
  }

  /**
   * Get the monitoring instance
   */
  getMonitor() {
    return this.monitor;
  }

  /**
   * Get the invalidation manager
   */
  getInvalidationManager() {
    return this.invalidationManager;
  }

  /**
   * Get the warming manager
   */
  getWarmingManager() {
    return this.warmingManager;
  }

  /**
   * Get the SWR manager
   */
  getSWRManager() {
    return this.swrManager;
  }

  /**
   * Get the user preferences cache
   */
  getUserPreferences() {
    return this.userPreferences;
  }

  /**
   * Set user ID for personalized caching
   */
  setUserId(userId: string): void {
    if (this.userPreferences) {
      this.userPreferences.setUserId(userId);
    }

    // Trigger user authentication warming
    if (this.config.warming?.warmOnAuth && this.warmingManager) {
      this.warmingManager.executeWarming('auth', { userId });
    }
  }

  /**
   * Handle route changes for cache warming
   */
  onRouteChange(route: string): void {
    if (this.config.warming?.warmOnRouteChange && this.warmingManager) {
      this.warmingManager.executeWarming('route', { currentRoute: route });
    }
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidateByPattern(pattern: string | RegExp): Promise<string[]> {
    if (!this.invalidationManager) {
      console.warn('Invalidation manager not initialized');
      return [];
    }

    return this.invalidationManager.invalidate(pattern);
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<string[]> {
    if (!this.invalidationManager) {
      console.warn('Invalidation manager not initialized');
      return [];
    }

    return this.invalidationManager.invalidateByTags(tags);
  }

  /**
   * Get comprehensive cache statistics
   */
  async getStats(): Promise<{
    browserStorage?: any;
    redisCache?: any;
    monitoring?: any;
    invalidation?: any;
    warming?: any;
    serviceWorker?: any;
  }> {
    const stats: any = {};

    if (this.browserStorage) {
      stats.browserStorage = {
        size: await this.browserStorage.size(),
        keys: (await this.browserStorage.keys()).length
      };
    }

    if (this.redisCache) {
      stats.redisCache = await this.redisCache.getStats();
    }

    if (this.monitor) {
      stats.monitoring = {
        metrics: this.monitor.getMetrics(),
        health: this.monitor.getHealthMetrics()
      };
    }

    if (this.invalidationManager) {
      stats.invalidation = this.invalidationManager.getStats();
    }

    if (this.warmingManager) {
      stats.warming = await this.warmingManager.getStats();
    }

    if (this.config.serviceWorker?.enabled) {
      stats.serviceWorker = await serviceWorkerManager.getCacheStats();
    }

    return stats;
  }

  /**
   * Clear all caches
   */
  async clearAll(): Promise<void> {
    const promises: Promise<any>[] = [];

    if (this.browserStorage) {
      promises.push(this.browserStorage.clear());
    }

    if (this.redisCache) {
      promises.push(this.redisCache.clear());
    }

    if (this.swrManager) {
      promises.push(this.swrManager.clearAll());
    }

    await Promise.all(promises);
    console.log('All caches cleared');
  }

  /**
   * Shutdown the cache system
   */
  async shutdown(): Promise<void> {
    if (this.monitor) {
      this.monitor.stop();
    }

    console.log('Cache system shut down');
  }

  private async initializeServiceWorker(): Promise<void> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    try {
      await serviceWorkerManager.register();
    } catch (error) {
      console.error('Service worker registration failed:', error);
    }
  }

  private createCacheManagerAdapter(storage: any) {
    return {
      get: async (key: string) => storage.get(key),
      set: async (key: string, data: any, config?: any) => {
        const entry = {
          data,
          timestamp: Date.now(),
          ttl: config?.ttl || 300000,
          metadata: config?.metadata
        };
        return storage.set(key, entry);
      },
      delete: async (key: string) => storage.delete(key),
      invalidate: async (pattern: string) => {
        const keys = await storage.keys(pattern);
        await Promise.all(keys.map((key: string) => storage.delete(key)));
        return keys.length;
      },
      clear: async () => storage.clear(),
      warm: async () => {},
      getMetrics: async () => this.monitor?.getMetrics() || {},
      subscribe: () => () => {},
      configure: () => {}
    };
  }
}

// Global cache system instance
let globalCacheSystem: CacheSystem | null = null;

/**
 * Get or create the global cache system instance
 */
export function getCacheSystem(config?: CacheSystemConfig): CacheSystem {
  if (!globalCacheSystem) {
    globalCacheSystem = new CacheSystem(config);
  }
  return globalCacheSystem;
}

/**
 * Initialize the global cache system
 */
export async function initializeCacheSystem(config?: CacheSystemConfig): Promise<CacheSystem> {
  const cacheSystem = getCacheSystem(config);
  await cacheSystem.initialize();
  return cacheSystem;
}

/**
 * React hook to use the cache system
 */
export function useCacheSystem() {
  const [system] = React.useState(() => getCacheSystem());
  const [stats, setStats] = React.useState<any>(null);
  const [isInitialized, setIsInitialized] = React.useState(false);

  React.useEffect(() => {
    const initialize = async () => {
      try {
        await system.initialize();
        setIsInitialized(true);
        
        // Update stats periodically
        const updateStats = async () => {
          const newStats = await system.getStats();
          setStats(newStats);
        };
        
        updateStats();
        const interval = setInterval(updateStats, 30000); // Every 30 seconds
        
        return () => clearInterval(interval);
      } catch (error) {
        console.error('Failed to initialize cache system:', error);
      }
    };

    initialize();
  }, [system]);

  const setUserId = React.useCallback((userId: string) => {
    system.setUserId(userId);
  }, [system]);

  const onRouteChange = React.useCallback((route: string) => {
    system.onRouteChange(route);
  }, [system]);

  const invalidateByPattern = React.useCallback((pattern: string | RegExp) => {
    return system.invalidateByPattern(pattern);
  }, [system]);

  const invalidateByTags = React.useCallback((tags: string[]) => {
    return system.invalidateByTags(tags);
  }, [system]);

  const clearAll = React.useCallback(() => {
    return system.clearAll();
  }, [system]);

  return {
    system,
    isInitialized,
    stats,
    setUserId,
    onRouteChange,
    invalidateByPattern,
    invalidateByTags,
    clearAll
  };
}

/**
 * Cache system provider component
 */
interface CacheSystemProviderProps {
  children: React.ReactNode;
  config?: CacheSystemConfig;
}

export function CacheSystemProvider({ children, config }: CacheSystemProviderProps) {
  const cacheSystem = useCacheSystem();

  return (
    <OptimizedQueryProvider config={config?.reactQuery}>
      {children}
    </OptimizedQueryProvider>
  );
}

// Import React for hooks
import React from 'react';