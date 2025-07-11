import { logger } from '@/lib/services';
/**
 * Advanced caching hook that integrates all caching strategies
 * Built on top of the existing useOptimizedQuery hook
 */

import { useQuery, useQueryClient, useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import React from "react";
import { performanceMonitor } from "@/lib/utils/performance-monitor";
import { CacheMonitor } from "@/lib/cache/monitoring";
import { SWRManager, useSWR } from "@/lib/cache/stale-while-revalidate";
import { CacheInvalidationManager } from "@/lib/cache/invalidation";
import { CacheWarmingManager } from "@/lib/cache/warming";
import { createBrowserStorage, UserPreferencesCache } from "@/lib/cache/storage/browser-storage";
import { CacheStorageConfig, CacheConfig, CacheEntry } from "@/lib/cache/types";

interface AdvancedCacheOptions<T> {
  queryKey: string[];
  queryFn: () => Promise<T>;
  staleTime?: number;
  cacheTime?: number;
  refetchInterval?: number;
  enabled?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  
  // Advanced caching options
  cacheStrategy?: 'react-query' | 'browser-storage' | 'hybrid' | 'swr';
  cacheTags?: string[];
  cacheConfig?: Partial<CacheConfig>;
  warmingPriority?: 'low' | 'medium' | 'high' | 'critical';
  swrConfig?: {
    maxStaleTime?: number;
    revalidateOnFocus?: boolean;
    revalidateOnReconnect?: boolean;
    errorRetryCount?: number;
    dedupe?: boolean;
  };
  invalidateOn?: string[];
  prefetchRelated?: string[][];
  optimisticUpdate?: (oldData: T | undefined, newData: any) => T;
  
  // Performance options
  backgroundRefresh?: boolean;
  persistOffline?: boolean;
  compressionEnabled?: boolean;
  
  // Monitoring options
  enableMonitoring?: boolean;
  trackPerformance?: boolean;
}

interface AdvancedCacheResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isStale: boolean;
  isFetching: boolean;
  isRevalidating: boolean;
  cacheHit: boolean;
  
  // Advanced methods
  refetch: () => Promise<void>;
  invalidate: () => Promise<void>;
  warmCache: () => Promise<void>;
  clearCache: () => Promise<void>;
  updateCache: (updater: (old: T | undefined) => T) => void;
  prefetchRelated: () => Promise<void>;
  
  // Metrics
  cacheMetrics: {
    hitRate: number;
    responseTime: number;
    lastUpdated: number;
  };
}

/**
 * Advanced cache hook context
 */
interface CacheContext {
  monitor: CacheMonitor;
  swrManager: SWRManager;
  invalidationManager: CacheInvalidationManager;
  warmingManager: CacheWarmingManager;
  userPreferences: UserPreferencesCache;
  storage: any;
}

// Global cache context
let globalCacheContext: CacheContext | null = null;

function getCacheContext(): CacheContext {
  if (!globalCacheContext) {
    const storageConfig: CacheStorageConfig = {
      type: 'localStorage',
      options: {
        prefix: 'hpa_advanced_cache_',
        compression: {
          enabled: true,
          algorithm: 'gzip',
          threshold: 1024
        },
        maxEntries: 1000
      }
    };

    const storage = createBrowserStorage(storageConfig);
    const monitor = new CacheMonitor({ enabled: true });
    const swrManager = new SWRManager(storage);
    
    // Create a mock cache manager for invalidation
    const mockCacheManager = {
      get: async (key: string) => storage.get(key),
      set: async (key: string, data: any, config?: any) => {
        const entry: CacheEntry<any> = {
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
        return Promise.all(keys.map(key => storage.delete(key))).then(() => keys.length);
      },
      clear: async () => storage.clear(),
      warm: async () => {},
      getMetrics: async () => monitor.getMetrics(),
      subscribe: () => () => {},
      configure: () => {}
    };

    const invalidationManager = new CacheInvalidationManager(mockCacheManager);
    const warmingManager = new CacheWarmingManager(storage);
    const userPreferences = new UserPreferencesCache(storage);

    globalCacheContext = {
      monitor,
      swrManager,
      invalidationManager,
      warmingManager,
      userPreferences,
      storage
    };
  }

  return globalCacheContext;
}

/**
 * Advanced cache hook that provides comprehensive caching capabilities
 */
export function useAdvancedCache<T>(options: AdvancedCacheOptions<T>): AdvancedCacheResult<T> {
  const {
    queryKey,
    queryFn,
    cacheStrategy = 'hybrid',
    cacheTags = [],
    swrConfig = {},
    invalidateOn = [],
    prefetchRelated = [],
    enableMonitoring = true,
    trackPerformance = true,
    backgroundRefresh = true,
    persistOffline = true,
    ...reactQueryOptions
  } = options;

  const queryClient = useQueryClient();
  const cacheContext = getCacheContext();
  const cacheKeyString = queryKey.join(':');
  
  // State for cache metrics
  const [cacheMetrics, setCacheMetrics] = useState({
    hitRate: 0,
    responseTime: 0,
    lastUpdated: 0
  });

  // Choose caching strategy
  const strategy = useMemo(() => {
    switch (cacheStrategy) {
      case 'swr':
        return 'swr';
      case 'browser-storage':
        return 'browser-storage';
      case 'hybrid':
        return 'hybrid';
      default:
        return 'react-query';
    }
  }, [cacheStrategy]);

  // SWR implementation
  const swrResult = useSWR(
    strategy === 'swr' || strategy === 'hybrid' ? cacheKeyString : null,
    strategy === 'swr' || strategy === 'hybrid' ? queryFn : null,
    {
      storage: cacheContext.storage,
      config: {
        maxStaleTime: swrConfig.maxStaleTime || 300000,
        revalidateTimeout: 30000,
        serveStaleOnError: true,
        maxConcurrentRevalidations: 3,
        minRevalidationInterval: 1000
      },
      dedupe: swrConfig.dedupe ?? true,
      retry: {
        attempts: swrConfig.errorRetryCount || 3,
        delay: 1000,
        backoff: 'exponential'
      },
      onSuccess: options.onSuccess,
      onError: options.onError,
      onRevalidate: (isRevalidating) => {
        if (enableMonitoring) {
          cacheContext.monitor.recordEvent({
            type: isRevalidating ? 'hit' : 'miss',
            key: cacheKeyString,
            data: { revalidating: isRevalidating }
          });
        }
      }
    }
  );

  // React Query implementation
  const trackedQueryFn = useCallback(async () => {
    const startTime = Date.now();
    
    try {
      const result = await performanceMonitor.trackAPI(
        `advanced-cache:${cacheKeyString}`,
        queryFn,
        { queryKey, strategy }
      );

      const responseTime = Date.now() - startTime;

      // Record cache operation
      if (enableMonitoring) {
        cacheContext.monitor.recordOperation({
          type: 'get',
          key: cacheKeyString,
          success: true,
          duration: responseTime,
          metadata: { strategy, tags: cacheTags }
        });
      }

      // Update metrics
      setCacheMetrics(prev => ({
        ...prev,
        responseTime,
        lastUpdated: Date.now()
      }));

      return result;
    } catch (error) {
      if (enableMonitoring) {
        cacheContext.monitor.recordOperation({
          type: 'get',
          key: cacheKeyString,
          success: false,
          duration: Date.now() - startTime,
          metadata: { strategy, error: error.message }
        });
      }
      throw error;
    }
  }, [queryKey, queryFn, cacheKeyString, strategy, enableMonitoring, cacheTags]);

  const reactQueryResult = useQuery({
    queryKey,
    queryFn: trackedQueryFn,
    enabled: (strategy === 'react-query' || strategy === 'hybrid') && options.enabled !== false,
    staleTime: options.staleTime || 300000,
    cacheTime: options.cacheTime || 600000,
    refetchInterval: options.refetchInterval,
    onSuccess: options.onSuccess,
    onError: options.onError,
    // Advanced React Query options
    refetchOnWindowFocus: swrConfig.revalidateOnFocus ?? true,
    refetchOnReconnect: swrConfig.revalidateOnReconnect ?? true,
    retry: swrConfig.errorRetryCount || 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Determine which result to use
  const activeResult = strategy === 'swr' ? swrResult : reactQueryResult;
  const isStale = strategy === 'swr' ? swrResult.isStale : false;
  const cacheHit = strategy === 'swr' ? swrResult.cacheHit : !reactQueryResult.isFetching && !!reactQueryResult.data;

  // Cache invalidation setup
  useEffect(() => {
    if (invalidateOn.length > 0) {
      invalidateOn.forEach(trigger => {
        cacheContext.invalidationManager.trackMutation(trigger, [cacheKeyString]);
      });
    }

    if (cacheTags.length > 0) {
      // Register cache tags for this query
      cacheTags.forEach(tag => {
        cacheContext.invalidationManager.trackMutation(`tag:${tag}`, [cacheKeyString]);
      });
    }
  }, [invalidateOn, cacheTags, cacheKeyString]);

  // Background refresh for hybrid strategy
  useEffect(() => {
    if (strategy === 'hybrid' && backgroundRefresh && activeResult.data) {
      const interval = setInterval(() => {
        if (strategy === 'swr') {
          swrResult.revalidate();
        } else {
          reactQueryResult.refetch();
        }
      }, options.staleTime || 300000);

      return () => clearInterval(interval);
    }
  }, [strategy, backgroundRefresh, activeResult.data, options.staleTime]);

  // Cache warming
  const warmCache = useCallback(async () => {
    try {
      await cacheContext.warmingManager.warmKeys(
        [cacheKeyString],
        { [cacheKeyString]: queryFn },
        options.warmingPriority || 'medium'
      );
    } catch (error) {
      logger.error('Cache warming failed:', error);
    }
  }, [cacheKeyString, queryFn, options.warmingPriority]);

  // Prefetch related queries
  const prefetchRelatedQueries = useCallback(async () => {
    try {
      await Promise.all(
        prefetchRelated.map(relatedKey =>
          queryClient.prefetchQuery({
            queryKey: relatedKey,
            queryFn: () => queryFn(), // You'd want different functions for related queries
            staleTime: options.staleTime || 300000
          })
        )
      );
    } catch (error) {
      logger.error('Related query prefetching failed:', error);
    }
  }, [prefetchRelated, queryClient, queryFn, options.staleTime]);

  // Cache management methods
  const invalidate = useCallback(async () => {
    if (strategy === 'swr') {
      await swrResult.clear();
    } else {
      await queryClient.invalidateQueries({ queryKey });
    }
    
    if (enableMonitoring) {
      cacheContext.monitor.recordEvent({
        type: 'invalidate',
        key: cacheKeyString,
        data: { manual: true }
      });
    }
  }, [strategy, queryKey, cacheKeyString, enableMonitoring]);

  const clearCache = useCallback(async () => {
    if (strategy === 'swr') {
      await swrResult.clear();
    } else {
      queryClient.removeQueries({ queryKey });
    }
    
    if (enableMonitoring) {
      cacheContext.monitor.recordEvent({
        type: 'delete',
        key: cacheKeyString,
        data: { manual: true }
      });
    }
  }, [strategy, queryKey, cacheKeyString, enableMonitoring]);

  const updateCache = useCallback((updater: (old: T | undefined) => T) => {
    if (strategy === 'swr') {
      const currentData = swrResult.data;
      const newData = updater(currentData);
      swrResult.mutate(newData);
    } else {
      queryClient.setQueryData(queryKey, updater);
    }
  }, [strategy, queryKey]);

  const refetch = useCallback(async () => {
    if (strategy === 'swr') {
      await swrResult.revalidate();
    } else {
      await reactQueryResult.refetch();
    }
  }, [strategy]);

  // Update cache hit rate
  useEffect(() => {
    if (cacheHit) {
      setCacheMetrics(prev => ({
        ...prev,
        hitRate: Math.min(100, prev.hitRate + 1)
      }));
    }
  }, [cacheHit]);

  return {
    data: activeResult.data,
    isLoading: activeResult.isLoading,
    isError: activeResult.error !== null,
    error: activeResult.error,
    isStale,
    isFetching: strategy === 'swr' ? false : reactQueryResult.isFetching,
    isRevalidating: strategy === 'swr' ? swrResult.isRevalidating : false,
    cacheHit,
    
    // Advanced methods
    refetch,
    invalidate,
    warmCache,
    clearCache,
    updateCache,
    prefetchRelated: prefetchRelatedQueries,
    
    // Metrics
    cacheMetrics
  };
}

/**
 * Hook for cache warming strategies
 */
export function useCacheWarming() {
  const cacheContext = getCacheContext();
  
  const warmCriticalData = useCallback(async (userId?: string) => {
    await cacheContext.warmingManager.executeWarming('startup', { userId });
  }, []);

  const warmUserData = useCallback(async (userId: string) => {
    await cacheContext.warmingManager.executeWarming('auth', { userId });
  }, []);

  const warmRouteData = useCallback(async (route: string) => {
    await cacheContext.warmingManager.executeWarming('route', { currentRoute: route });
  }, []);

  return {
    warmCriticalData,
    warmUserData,
    warmRouteData,
    stats: cacheContext.warmingManager.getStats()
  };
}

/**
 * Hook for cache invalidation
 */
export function useCacheInvalidation() {
  const cacheContext = getCacheContext();
  
  const invalidateByPattern = useCallback(async (pattern: string | RegExp) => {
    return cacheContext.invalidationManager.invalidate(pattern);
  }, []);

  const invalidateByTags = useCallback(async (tags: string[]) => {
    return cacheContext.invalidationManager.invalidateByTags(tags);
  }, []);

  const trackMutation = useCallback((mutationKey: string, affectedKeys: string[]) => {
    cacheContext.invalidationManager.trackMutation(mutationKey, affectedKeys);
  }, []);

  return {
    invalidateByPattern,
    invalidateByTags,
    trackMutation,
    stats: cacheContext.invalidationManager.getStats()
  };
}

/**
 * Hook for cache monitoring
 */
export function useCacheMonitoringHook() {
  const cacheContext = getCacheContext();
  const [metrics, setMetrics] = useState(cacheContext.monitor.getMetrics());
  const [health, setHealth] = useState(cacheContext.monitor.getHealthMetrics());

  useEffect(() => {
    const unsubscribe = cacheContext.monitor.subscribe(() => {
      setMetrics(cacheContext.monitor.getMetrics());
    });

    const healthInterval = setInterval(() => {
      setHealth(cacheContext.monitor.getHealthMetrics());
    }, 30000);

    return () => {
      unsubscribe();
      clearInterval(healthInterval);
    };
  }, []);

  const generateReport = useCallback((start?: number, end?: number) => {
    return cacheContext.monitor.generatePerformanceReport(start, end);
  }, []);

  return {
    metrics,
    health,
    generateReport,
    monitor: cacheContext.monitor
  };
}

/**
 * Hook for user preferences caching
 */
export function useUserPreferences(userId?: string) {
  const cacheContext = getCacheContext();
  
  useEffect(() => {
    if (userId) {
      cacheContext.userPreferences.setUserId(userId);
    }
  }, [userId]);

  const getPreference = useCallback(async <T>(key: string, defaultValue?: T) => {
    return cacheContext.userPreferences.getPreference(key, defaultValue);
  }, []);

  const setPreference = useCallback(async <T>(key: string, value: T) => {
    return cacheContext.userPreferences.setPreference(key, value);
  }, []);

  const removePreference = useCallback(async (key: string) => {
    return cacheContext.userPreferences.removePreference(key);
  }, []);

  const getAllPreferences = useCallback(async () => {
    return cacheContext.userPreferences.getAllPreferences();
  }, []);

  return {
    getPreference,
    setPreference,
    removePreference,
    getAllPreferences
  };
}

/**
 * Advanced mutation hook with cache integration
 */
export function useAdvancedMutation<TData, TVariables>({
  mutationFn,
  invalidateTags = [],
  invalidateQueries = [],
  optimisticUpdate,
  onSuccess,
  onError,
  ...options
}: {
  mutationFn: (variables: TVariables) => Promise<TData>;
  invalidateTags?: string[];
  invalidateQueries?: string[][];
  optimisticUpdate?: (variables: TVariables) => { queryKey: string[]; updater: (old: any) => any };
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
} & any) {
  
  const queryClient = useQueryClient();
  const cacheContext = getCacheContext();

  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      // Optimistic update
      if (optimisticUpdate) {
        const { queryKey, updater } = optimisticUpdate(variables);
        const previousData = queryClient.getQueryData(queryKey);
        queryClient.setQueryData(queryKey, updater);
        return { previousData, queryKey };
      }
    },
    onSuccess: (data, variables, context) => {
      // Invalidate cache tags
      if (invalidateTags.length > 0) {
        cacheContext.invalidationManager.invalidateByTags(invalidateTags);
      }

      // Invalidate specific queries
      if (invalidateQueries.length > 0) {
        invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey });
        });
      }

      onSuccess?.(data, variables);
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.previousData && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }

      onError?.(error, variables);
    },
    ...options
  });
}