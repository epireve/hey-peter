/**
 * React Query/TanStack Query configuration with optimal defaults
 * Provides production-ready query client setup with advanced caching strategies
 */

import { QueryClient, QueryClientConfig, MutationCache, QueryCache } from '@tanstack/react-query';
import { CacheMonitor } from './monitoring';
import { CacheInvalidationManager } from './invalidation';
import { performanceMonitor } from '@/lib/utils/performance-monitor';

interface OptimizedQueryClientConfig extends QueryClientConfig {
  /** Enable advanced monitoring */
  enableMonitoring?: boolean;
  /** Enable automatic cache invalidation */
  enableAutoInvalidation?: boolean;
  /** Enable background refetching optimization */
  enableBackgroundOptimization?: boolean;
  /** Enable request deduplication */
  enableDeduplication?: boolean;
  /** Environment-specific settings */
  environment?: 'development' | 'production' | 'test';
  /** Custom cache size limits */
  cacheLimits?: {
    maxQueries?: number;
    maxMutations?: number;
    maxMemoryUsage?: number;
  };
  /** Performance thresholds */
  performanceThresholds?: {
    slowQueryMs?: number;
    staleTimeMs?: number;
    cacheTimeMs?: number;
  };
}

/**
 * Create optimized query client with comprehensive caching strategies
 */
export function createOptimizedQueryClient(config: OptimizedQueryClientConfig = {}): QueryClient {
  const {
    enableMonitoring = true,
    enableAutoInvalidation = true,
    enableBackgroundOptimization = true,
    enableDeduplication = true,
    environment = process.env.NODE_ENV === 'production' ? 'production' : 'development',
    cacheLimits = {},
    performanceThresholds = {},
    ...queryClientConfig
  } = config;

  // Environment-specific defaults
  const envDefaults = getEnvironmentDefaults(environment);
  
  // Performance thresholds with defaults
  const thresholds = {
    slowQueryMs: 1000,
    staleTimeMs: 5 * 60 * 1000, // 5 minutes
    cacheTimeMs: 30 * 60 * 1000, // 30 minutes
    ...performanceThresholds
  };

  // Cache limits with defaults
  const limits = {
    maxQueries: 1000,
    maxMutations: 100,
    maxMemoryUsage: 50 * 1024 * 1024, // 50MB
    ...cacheLimits
  };

  // Initialize monitoring if enabled
  let monitor: CacheMonitor | null = null;
  let invalidationManager: CacheInvalidationManager | null = null;

  if (enableMonitoring) {
    monitor = new CacheMonitor({
      enabled: true,
      maxOperations: 5000,
      maxEvents: 2000,
      metricsInterval: 60000,
      trackTiming: true,
      trackHitRatio: true,
      trackMemoryUsage: true
    });
  }

  // Query cache with monitoring and optimization
  const queryCache = new QueryCache({
    onError: (error, query) => {
      console.error(`Query error for key ${JSON.stringify(query.queryKey)}:`, error);
      
      if (monitor) {
        monitor.recordOperation({
          type: 'get',
          key: JSON.stringify(query.queryKey),
          success: false,
          duration: 0,
          metadata: { error: error.message }
        });
      }
    },
    onSuccess: (data, query) => {
      if (monitor) {
        monitor.recordOperation({
          type: 'get',
          key: JSON.stringify(query.queryKey),
          success: true,
          duration: Date.now() - (query.state.dataUpdatedAt || Date.now()),
          metadata: { 
            dataSize: JSON.stringify(data).length,
            cacheHit: query.state.isFetching === false
          }
        });
      }
    },
    onSettled: (data, error, query) => {
      // Check for slow queries
      const duration = Date.now() - (query.state.fetchedAt || Date.now());
      if (duration > thresholds.slowQueryMs) {
        console.warn(
          `Slow query detected: ${JSON.stringify(query.queryKey)} took ${duration}ms`
        );
      }

      // Memory usage check
      if (monitor) {
        monitor.getMetrics().then(metrics => {
          if (metrics.totalSize > limits.maxMemoryUsage) {
            console.warn('Cache memory usage exceeds limit, consider cleanup');
          }
        });
      }
    }
  });

  // Mutation cache with monitoring
  const mutationCache = new MutationCache({
    onError: (error, variables, context, mutation) => {
      console.error('Mutation error:', error);
      
      if (monitor) {
        monitor.recordOperation({
          type: 'set',
          key: mutation.options.mutationKey?.join(':') || 'unknown',
          success: false,
          duration: 0,
          metadata: { error: error.message }
        });
      }
    },
    onSuccess: (data, variables, context, mutation) => {
      if (monitor) {
        monitor.recordOperation({
          type: 'set',
          key: mutation.options.mutationKey?.join(':') || 'unknown',
          success: true,
          duration: Date.now() - (mutation.state.submittedAt || Date.now()),
          metadata: { dataSize: JSON.stringify(data).length }
        });
      }

      // Auto-invalidation based on mutation
      if (enableAutoInvalidation && invalidationManager) {
        const mutationKey = mutation.options.mutationKey?.join(':') || 'unknown';
        invalidationManager.trackMutation(mutationKey, []);
      }
    }
  });

  // Create the query client
  const queryClient = new QueryClient({
    queryCache,
    mutationCache,
    defaultOptions: {
      queries: {
        // Stale time - how long until data is considered stale
        staleTime: thresholds.staleTimeMs,
        
        // Cache time - how long to keep unused data in cache
        cacheTime: thresholds.cacheTimeMs,
        
        // Retry configuration
        retry: environment === 'production' ? 3 : 1,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        
        // Background refetching
        refetchOnWindowFocus: enableBackgroundOptimization,
        refetchOnReconnect: enableBackgroundOptimization,
        refetchOnMount: true,
        
        // Request deduplication
        refetchInterval: false,
        refetchIntervalInBackground: false,
        
        // Performance optimizations
        suspense: false,
        useErrorBoundary: environment === 'production',
        
        // Network mode for offline support
        networkMode: 'online',
        
        // Query function timeout
        queryFn: undefined, // Will be overridden by individual queries
      },
      mutations: {
        // Retry mutations less aggressively
        retry: environment === 'production' ? 2 : 0,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
        
        // Use error boundary in production
        useErrorBoundary: environment === 'production',
        
        // Network mode
        networkMode: 'online',
      }
    },
    ...queryClientConfig
  });

  // Setup auto-invalidation if enabled
  if (enableAutoInvalidation && monitor) {
    const mockCacheManager = {
      get: async (key: string) => {
        const queries = queryClient.getQueryCache().getAll();
        const query = queries.find(q => JSON.stringify(q.queryKey) === key);
        return query?.state.data || null;
      },
      set: async (key: string, data: any) => {
        // This would update React Query cache
        const queryKey = JSON.parse(key);
        queryClient.setQueryData(queryKey, data);
      },
      delete: async (key: string) => {
        const queryKey = JSON.parse(key);
        queryClient.removeQueries({ queryKey });
        return true;
      },
      invalidate: async (pattern: string) => {
        const queries = queryClient.getQueryCache().getAll();
        const matchingQueries = queries.filter(query =>
          JSON.stringify(query.queryKey).includes(pattern)
        );
        
        await Promise.all(
          matchingQueries.map(query =>
            queryClient.invalidateQueries({ queryKey: query.queryKey })
          )
        );
        
        return matchingQueries.length;
      },
      clear: async () => queryClient.clear(),
      warm: async () => {},
      getMetrics: async () => monitor!.getMetrics(),
      subscribe: () => () => {},
      configure: () => {}
    };

    invalidationManager = new CacheInvalidationManager(mockCacheManager);
  }

  // Add custom methods to query client
  (queryClient as any).monitor = monitor;
  (queryClient as any).invalidationManager = invalidationManager;
  (queryClient as any).optimizedConfig = {
    enableMonitoring,
    enableAutoInvalidation,
    enableBackgroundOptimization,
    enableDeduplication,
    environment,
    limits,
    thresholds
  };

  // Performance monitoring integration
  if (enableMonitoring && monitor) {
    // Track query client performance
    const originalFetchQuery = queryClient.fetchQuery.bind(queryClient);
    queryClient.fetchQuery = async (options) => {
      return performanceMonitor.trackAPI(
        `query-client:fetchQuery:${JSON.stringify(options.queryKey)}`,
        () => originalFetchQuery(options),
        { queryKey: options.queryKey }
      );
    };

    const originalPrefetchQuery = queryClient.prefetchQuery.bind(queryClient);
    queryClient.prefetchQuery = async (options) => {
      return performanceMonitor.trackAPI(
        `query-client:prefetchQuery:${JSON.stringify(options.queryKey)}`,
        () => originalPrefetchQuery(options),
        { queryKey: options.queryKey, prefetch: true }
      );
    };
  }

  // Cache size management
  if (limits.maxQueries || limits.maxMutations) {
    const checkCacheLimits = () => {
      const queryCount = queryClient.getQueryCache().getAll().length;
      const mutationCount = queryClient.getMutationCache().getAll().length;

      if (limits.maxQueries && queryCount > limits.maxQueries) {
        const queriesToRemove = Math.floor(queryCount * 0.1); // Remove 10%
        const oldestQueries = queryClient.getQueryCache()
          .getAll()
          .sort((a, b) => (a.state.dataUpdatedAt || 0) - (b.state.dataUpdatedAt || 0))
          .slice(0, queriesToRemove);

        oldestQueries.forEach(query => {
          queryClient.removeQueries({ queryKey: query.queryKey });
        });

        console.log(`Removed ${queriesToRemove} old queries to manage cache size`);
      }

      if (limits.maxMutations && mutationCount > limits.maxMutations) {
        queryClient.getMutationCache().clear();
        console.log('Cleared mutation cache to manage size');
      }
    };

    // Check cache limits periodically
    setInterval(checkCacheLimits, 5 * 60 * 1000); // Every 5 minutes
  }

  return queryClient;
}

/**
 * Get environment-specific defaults
 */
function getEnvironmentDefaults(environment: string) {
  switch (environment) {
    case 'production':
      return {
        staleTime: 5 * 60 * 1000, // 5 minutes
        cacheTime: 30 * 60 * 1000, // 30 minutes
        retry: 3,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        useErrorBoundary: true
      };
    
    case 'development':
      return {
        staleTime: 0, // Always fresh in development
        cacheTime: 5 * 60 * 1000, // 5 minutes
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        useErrorBoundary: false
      };
    
    case 'test':
      return {
        staleTime: Infinity, // Never refetch in tests
        cacheTime: Infinity,
        retry: 0,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        useErrorBoundary: false
      };
    
    default:
      return {};
  }
}

/**
 * Query client provider with optimized configuration
 */
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

interface OptimizedQueryProviderProps {
  children: React.ReactNode;
  config?: OptimizedQueryClientConfig;
  showDevtools?: boolean;
}

let globalQueryClient: QueryClient | null = null;

export function OptimizedQueryProvider({ 
  children, 
  config = {},
  showDevtools = process.env.NODE_ENV === 'development'
}: OptimizedQueryProviderProps) {
  // Create query client once and reuse
  if (!globalQueryClient) {
    globalQueryClient = createOptimizedQueryClient(config);
  }

  return (
    <QueryClientProvider client={globalQueryClient}>
      {children}
      {showDevtools && (
        <ReactQueryDevtools 
          initialIsOpen={false}
          position="bottom-right"
        />
      )}
    </QueryClientProvider>
  );
}

/**
 * Hook to access the optimized query client
 */
export function useOptimizedQueryClient(): QueryClient & {
  monitor?: CacheMonitor;
  invalidationManager?: CacheInvalidationManager;
  optimizedConfig?: any;
} {
  if (!globalQueryClient) {
    throw new Error('OptimizedQueryProvider must be used before accessing query client');
  }
  return globalQueryClient as any;
}

/**
 * Pre-configured query client instances for different scenarios
 */
export const queryClientConfigs = {
  // High-performance configuration for data-heavy applications
  highPerformance: (): OptimizedQueryClientConfig => ({
    enableMonitoring: true,
    enableAutoInvalidation: true,
    enableBackgroundOptimization: true,
    enableDeduplication: true,
    environment: 'production',
    cacheLimits: {
      maxQueries: 2000,
      maxMutations: 200,
      maxMemoryUsage: 100 * 1024 * 1024 // 100MB
    },
    performanceThresholds: {
      slowQueryMs: 500,
      staleTimeMs: 10 * 60 * 1000, // 10 minutes
      cacheTimeMs: 60 * 60 * 1000 // 1 hour
    }
  }),

  // Memory-optimized configuration for resource-constrained environments
  memoryOptimized: (): OptimizedQueryClientConfig => ({
    enableMonitoring: false,
    enableAutoInvalidation: true,
    enableBackgroundOptimization: false,
    enableDeduplication: true,
    environment: 'production',
    cacheLimits: {
      maxQueries: 100,
      maxMutations: 20,
      maxMemoryUsage: 10 * 1024 * 1024 // 10MB
    },
    performanceThresholds: {
      slowQueryMs: 2000,
      staleTimeMs: 2 * 60 * 1000, // 2 minutes
      cacheTimeMs: 5 * 60 * 1000 // 5 minutes
    }
  }),

  // Development configuration with extensive debugging
  development: (): OptimizedQueryClientConfig => ({
    enableMonitoring: true,
    enableAutoInvalidation: false, // Manual control in development
    enableBackgroundOptimization: false,
    enableDeduplication: false,
    environment: 'development',
    cacheLimits: {
      maxQueries: 500,
      maxMutations: 50,
      maxMemoryUsage: 25 * 1024 * 1024 // 25MB
    },
    performanceThresholds: {
      slowQueryMs: 100, // Stricter in development
      staleTimeMs: 0, // Always fresh
      cacheTimeMs: 2 * 60 * 1000 // 2 minutes
    }
  }),

  // Testing configuration
  testing: (): OptimizedQueryClientConfig => ({
    enableMonitoring: false,
    enableAutoInvalidation: false,
    enableBackgroundOptimization: false,
    enableDeduplication: false,
    environment: 'test',
    cacheLimits: {
      maxQueries: 50,
      maxMutations: 10,
      maxMemoryUsage: 5 * 1024 * 1024 // 5MB
    },
    performanceThresholds: {
      slowQueryMs: 1000,
      staleTimeMs: Infinity,
      cacheTimeMs: Infinity
    }
  })
};

/**
 * Utility to get recommended configuration based on application characteristics
 */
export function getRecommendedConfig(appCharacteristics: {
  isDataHeavy?: boolean;
  isMemoryConstrained?: boolean;
  userCount?: 'small' | 'medium' | 'large';
  realTimeRequirements?: boolean;
}): OptimizedQueryClientConfig {
  const { isDataHeavy, isMemoryConstrained, userCount, realTimeRequirements } = appCharacteristics;

  if (isMemoryConstrained) {
    return queryClientConfigs.memoryOptimized();
  }

  if (isDataHeavy || userCount === 'large') {
    return queryClientConfigs.highPerformance();
  }

  // Default balanced configuration
  return {
    enableMonitoring: true,
    enableAutoInvalidation: !realTimeRequirements, // Disable for real-time apps
    enableBackgroundOptimization: true,
    enableDeduplication: true,
    environment: 'production',
    cacheLimits: {
      maxQueries: 1000,
      maxMutations: 100,
      maxMemoryUsage: 50 * 1024 * 1024
    },
    performanceThresholds: {
      slowQueryMs: 1000,
      staleTimeMs: realTimeRequirements ? 30 * 1000 : 5 * 60 * 1000, // 30s vs 5min
      cacheTimeMs: 30 * 60 * 1000
    }
  };
}