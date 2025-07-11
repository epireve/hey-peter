import { logger } from '@/lib/services';
/**
 * Stale-while-revalidate (SWR) pattern implementation
 * Provides fresh data experience while maintaining performance through background updates
 */

import { CacheEntry, CacheStorage, StaleWhileRevalidateConfig } from './types';
import { performanceMonitor } from '@/lib/utils/performance-monitor';

export interface SWROptions<T> {
  /** Cache key */
  key: string;
  /** Data fetcher function */
  fetcher: () => Promise<T>;
  /** Cache storage instance */
  storage: CacheStorage;
  /** SWR configuration */
  config?: Partial<StaleWhileRevalidateConfig>;
  /** Whether to dedupe concurrent requests */
  dedupe?: boolean;
  /** Error retry configuration */
  retry?: {
    attempts: number;
    delay: number;
    backoff?: 'linear' | 'exponential';
  };
  /** Revalidation conditions */
  revalidateIf?: (entry: CacheEntry<T>) => boolean;
  /** Success callback */
  onSuccess?: (data: T) => void;
  /** Error callback */
  onError?: (error: Error) => void;
  /** Revalidation callback */
  onRevalidate?: (isRevalidating: boolean) => void;
}

export interface SWRResult<T> {
  /** Current data (may be stale) */
  data: T | null;
  /** Loading state */
  isLoading: boolean;
  /** Revalidating state */
  isRevalidating: boolean;
  /** Error state */
  error: Error | null;
  /** Whether data is stale */
  isStale: boolean;
  /** Whether cache hit occurred */
  cacheHit: boolean;
  /** Manually trigger revalidation */
  revalidate: () => Promise<void>;
  /** Clear cache for this key */
  clear: () => Promise<void>;
}

/**
 * Stale-while-revalidate cache manager
 */
export class SWRManager {
  private storage: CacheStorage;
  private config: StaleWhileRevalidateConfig;
  private revalidationQueue = new Map<string, Promise<any>>();
  private revalidationTimers = new Map<string, NodeJS.Timeout>();
  private requestDeduplication = new Map<string, Promise<any>>();

  constructor(
    storage: CacheStorage,
    config: Partial<StaleWhileRevalidateConfig> = {}
  ) {
    this.storage = storage;
    this.config = {
      maxStaleTime: 24 * 60 * 60 * 1000, // 24 hours
      revalidateTimeout: 30 * 1000, // 30 seconds
      serveStaleOnError: true,
      maxConcurrentRevalidations: 5,
      minRevalidationInterval: 1000, // 1 second
      ...config
    };
  }

  /**
   * Get data with SWR pattern
   */
  async get<T>(options: SWROptions<T>): Promise<SWRResult<T>> {
    const startTime = Date.now();
    const {
      key,
      fetcher,
      config = {},
      dedupe = true,
      retry = { attempts: 3, delay: 1000, backoff: 'exponential' },
      revalidateIf,
      onSuccess,
      onError,
      onRevalidate
    } = options;

    const effectiveConfig = { ...this.config, ...config };

    try {
      // Check cache first
      const cached = await this.storage.get<T>(key);
      const now = Date.now();
      
      let data: T | null = null;
      let isStale = false;
      let cacheHit = false;
      let error: Error | null = null;
      let isRevalidating = false;

      if (cached) {
        data = cached.data;
        cacheHit = true;
        
        // Check if data is stale
        const age = now - cached.timestamp;
        isStale = age > effectiveConfig.maxStaleTime;
        
        // Check if we need to revalidate
        const shouldRevalidate = isStale || 
          (revalidateIf && revalidateIf(cached)) ||
          cached.revalidating === true;

        if (shouldRevalidate && !this.isRevalidating(key)) {
          isRevalidating = true;
          onRevalidate?.(true);
          
          // Start background revalidation
          this.startBackgroundRevalidation(key, fetcher, {
            retry,
            onSuccess: (newData) => {
              onSuccess?.(newData);
              onRevalidate?.(false);
            },
            onError: (revalidationError) => {
              if (!effectiveConfig.serveStaleOnError) {
                error = revalidationError;
              }
              onError?.(revalidationError);
              onRevalidate?.(false);
            }
          });
        }

        // Return stale data if available and not expired beyond max stale time
        if (data && (!isStale || effectiveConfig.serveStaleOnError)) {
          return {
            data,
            isLoading: false,
            isRevalidating,
            error,
            isStale,
            cacheHit,
            revalidate: () => this.revalidate(key, fetcher, retry),
            clear: () => this.clear(key)
          };
        }
      }

      // No cache or cache is too stale, fetch fresh data
      const freshData = await this.fetchWithRetry(key, fetcher, retry, dedupe);
      data = freshData;

      // Cache the fresh data
      const cacheEntry: CacheEntry<T> = {
        data: freshData,
        timestamp: now,
        ttl: effectiveConfig.maxStaleTime,
        metadata: {
          fetchTime: Date.now() - startTime,
          source: 'fresh'
        }
      };

      await this.storage.set(key, cacheEntry);
      onSuccess?.(freshData);

      return {
        data,
        isLoading: false,
        isRevalidating: false,
        error: null,
        isStale: false,
        cacheHit: false,
        revalidate: () => this.revalidate(key, fetcher, retry),
        clear: () => this.clear(key)
      };

    } catch (fetchError) {
      error = fetchError as Error;
      onError?.(error);

      // Try to serve stale data on error
      if (effectiveConfig.serveStaleOnError) {
        const cached = await this.storage.get<T>(key);
        if (cached) {
          return {
            data: cached.data,
            isLoading: false,
            isRevalidating: false,
            error,
            isStale: true,
            cacheHit: true,
            revalidate: () => this.revalidate(key, fetcher, retry),
            clear: () => this.clear(key)
          };
        }
      }

      // No stale data available, return error state
      return {
        data: null,
        isLoading: false,
        isRevalidating: false,
        error,
        isStale: false,
        cacheHit: false,
        revalidate: () => this.revalidate(key, fetcher, retry),
        clear: () => this.clear(key)
      };
    }
  }

  /**
   * Manually revalidate a cache key
   */
  async revalidate<T>(
    key: string,
    fetcher: () => Promise<T>,
    retry?: SWROptions<T>['retry']
  ): Promise<void> {
    if (this.isRevalidating(key)) {
      return this.revalidationQueue.get(key);
    }

    const revalidationPromise = this.performRevalidation(key, fetcher, retry);
    this.revalidationQueue.set(key, revalidationPromise);

    try {
      await revalidationPromise;
    } finally {
      this.revalidationQueue.delete(key);
    }
  }

  /**
   * Clear cache for a specific key
   */
  async clear(key: string): Promise<void> {
    await this.storage.delete(key);
    this.cancelRevalidation(key);
  }

  /**
   * Clear all cache and stop all revalidations
   */
  async clearAll(): Promise<void> {
    await this.storage.clear();
    
    // Cancel all revalidations
    this.revalidationQueue.clear();
    this.revalidationTimers.forEach(timer => clearTimeout(timer));
    this.revalidationTimers.clear();
    this.requestDeduplication.clear();
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalKeys: number;
    revalidatingKeys: number;
    queuedRevalidations: number;
    cacheSize: number;
  }> {
    const keys = await this.storage.keys();
    
    return {
      totalKeys: keys.length,
      revalidatingKeys: this.revalidationQueue.size,
      queuedRevalidations: this.revalidationTimers.size,
      cacheSize: await this.storage.size()
    };
  }

  private async startBackgroundRevalidation<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: {
      retry?: SWROptions<T>['retry'];
      onSuccess?: (data: T) => void;
      onError?: (error: Error) => void;
    }
  ): Promise<void> {
    // Check revalidation limits
    if (this.revalidationQueue.size >= this.config.maxConcurrentRevalidations) {
      logger.warn('SWR: Maximum concurrent revalidations reached, skipping');
      return;
    }

    // Minimum interval between revalidations
    const timer = setTimeout(() => {
      this.revalidationTimers.delete(key);
      this.revalidate(key, fetcher, options.retry)
        .then(() => {
          // Revalidation successful, get fresh data
          this.storage.get<T>(key).then(cached => {
            if (cached) {
              options.onSuccess?.(cached.data);
            }
          });
        })
        .catch(options.onError);
    }, this.config.minRevalidationInterval);

    this.revalidationTimers.set(key, timer);
  }

  private async performRevalidation<T>(
    key: string,
    fetcher: () => Promise<T>,
    retry?: SWROptions<T>['retry']
  ): Promise<void> {
    try {
      // Mark as revalidating
      const existing = await this.storage.get<T>(key);
      if (existing) {
        existing.revalidating = true;
        await this.storage.set(key, existing);
      }

      const freshData = await this.fetchWithRetry(key, fetcher, retry, false);
      const now = Date.now();

      const cacheEntry: CacheEntry<T> = {
        data: freshData,
        timestamp: now,
        ttl: this.config.maxStaleTime,
        revalidating: false,
        metadata: {
          fetchTime: now - (existing?.timestamp || now),
          source: 'revalidation'
        }
      };

      await this.storage.set(key, cacheEntry);
    } catch (error) {
      // Mark revalidation as complete even on error
      const existing = await this.storage.get<T>(key);
      if (existing) {
        existing.revalidating = false;
        await this.storage.set(key, existing);
      }
      throw error;
    }
  }

  private async fetchWithRetry<T>(
    key: string,
    fetcher: () => Promise<T>,
    retry: SWROptions<T>['retry'] = { attempts: 3, delay: 1000 },
    dedupe: boolean = true
  ): Promise<T> {
    if (dedupe && this.requestDeduplication.has(key)) {
      return this.requestDeduplication.get(key);
    }

    const fetchPromise = performanceMonitor.trackAPI(
      `swr:${key}`,
      async () => {
        let lastError: Error;
        
        for (let attempt = 1; attempt <= retry.attempts; attempt++) {
          try {
            return await fetcher();
          } catch (error) {
            lastError = error as Error;
            
            if (attempt < retry.attempts) {
              const delay = retry.backoff === 'exponential' 
                ? retry.delay * Math.pow(2, attempt - 1)
                : retry.delay;
                
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }
        
        throw lastError!;
      },
      { key, retryAttempts: retry.attempts }
    );

    if (dedupe) {
      this.requestDeduplication.set(key, fetchPromise);
      
      fetchPromise.finally(() => {
        this.requestDeduplication.delete(key);
      });
    }

    return fetchPromise;
  }

  private isRevalidating(key: string): boolean {
    return this.revalidationQueue.has(key) || this.revalidationTimers.has(key);
  }

  private cancelRevalidation(key: string): void {
    // Cancel queued revalidation
    this.revalidationQueue.delete(key);
    
    // Cancel timer
    const timer = this.revalidationTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.revalidationTimers.delete(key);
    }
    
    // Cancel deduplicated request
    this.requestDeduplication.delete(key);
  }
}

/**
 * React hook for SWR pattern
 */
export function useSWR<T>(
  key: string | null,
  fetcher: (() => Promise<T>) | null,
  options: Partial<SWROptions<T>> = {}
): SWRResult<T> & { mutate: (data?: T) => Promise<void> } {
  const [state, setState] = React.useState<SWRResult<T>>({
    data: null,
    isLoading: true,
    isRevalidating: false,
    error: null,
    isStale: false,
    cacheHit: false,
    revalidate: async () => {},
    clear: async () => {}
  });

  const swrManager = React.useMemo(() => {
    const storage = options.storage || new (require('./storage/browser-storage').MemoryStorageAdapter)();
    return new SWRManager(storage, options.config);
  }, [options.storage, options.config]);

  const fetchData = React.useCallback(async () => {
    if (!key || !fetcher) {
      setState(prev => ({ ...prev, isLoading: false, data: null }));
      return;
    }

    try {
      const result = await swrManager.get({
        key,
        fetcher,
        ...options,
        onRevalidate: (isRevalidating) => {
          setState(prev => ({ ...prev, isRevalidating }));
          options.onRevalidate?.(isRevalidating);
        }
      });

      setState(result);
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error as Error,
        isLoading: false,
        isRevalidating: false
      }));
    }
  }, [key, fetcher, swrManager, options]);

  const mutate = React.useCallback(async (data?: T) => {
    if (!key) return;

    if (data !== undefined) {
      // Optimistic update
      setState(prev => ({ ...prev, data, isStale: false }));
      
      // Update cache
      const cacheEntry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: swrManager['config'].maxStaleTime,
        metadata: { source: 'mutation' }
      };
      
      await swrManager['storage'].set(key, cacheEntry);
    } else {
      // Revalidate
      await state.revalidate();
    }
  }, [key, swrManager, state.revalidate]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...state,
    mutate
  };
}

/**
 * SWR configuration provider
 */
export const SWRConfigContext = React.createContext<Partial<StaleWhileRevalidateConfig>>({});

export function SWRConfigProvider({ 
  children, 
  config 
}: { 
  children: React.ReactNode; 
  config: Partial<StaleWhileRevalidateConfig>;
}) {
  return (
    <SWRConfigContext.Provider value={config}>
      {children}
    </SWRConfigContext.Provider>
  );
}

/**
 * Hook to use SWR config from context
 */
export function useSWRConfig(): Partial<StaleWhileRevalidateConfig> {
  return React.useContext(SWRConfigContext);
}

/**
 * Preload data for a key
 */
export function preload<T>(
  key: string,
  fetcher: () => Promise<T>,
  storage: CacheStorage,
  config?: Partial<StaleWhileRevalidateConfig>
): Promise<void> {
  const manager = new SWRManager(storage, config);
  return manager.get({ key, fetcher, storage }).then(() => void 0);
}

/**
 * Batch preload multiple keys
 */
export async function preloadBatch<T>(
  items: Array<{ key: string; fetcher: () => Promise<T> }>,
  storage: CacheStorage,
  config?: Partial<StaleWhileRevalidateConfig>
): Promise<void> {
  const manager = new SWRManager(storage, config);
  
  // Process in batches to avoid overwhelming the system
  const batchSize = 5;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    await Promise.allSettled(
      batch.map(({ key, fetcher }) => 
        manager.get({ key, fetcher, storage })
      )
    );
  }
}

// Import React for hooks
import React from 'react';