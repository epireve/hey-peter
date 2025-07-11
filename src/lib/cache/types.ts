/**
 * Comprehensive caching types and interfaces for the Hey Peter Academy LMS
 */

export interface CacheConfig {
  /** Cache time to live in milliseconds */
  ttl: number;
  /** Stale time in milliseconds */
  staleTime: number;
  /** Maximum number of cache entries */
  maxSize?: number;
  /** Whether to persist cache across sessions */
  persist?: boolean;
  /** Cache storage type */
  storage?: 'memory' | 'localStorage' | 'sessionStorage' | 'indexedDB';
  /** Cache key prefix */
  prefix?: string;
  /** Whether to compress cached data */
  compress?: boolean;
}

export interface CacheEntry<T = any> {
  /** Cached data */
  data: T;
  /** Timestamp when cached */
  timestamp: number;
  /** Time to live in milliseconds */
  ttl: number;
  /** Cache version for invalidation */
  version?: string;
  /** Metadata about the cache entry */
  metadata?: Record<string, any>;
  /** Whether this entry is currently being revalidated */
  revalidating?: boolean;
}

export interface CacheKey {
  /** Primary key segments */
  segments: (string | number)[];
  /** Optional tags for bulk invalidation */
  tags?: string[];
  /** Cache namespace */
  namespace?: string;
}

export interface CacheMetrics {
  /** Total cache hits */
  hits: number;
  /** Total cache misses */
  misses: number;
  /** Hit rate percentage */
  hitRate: number;
  /** Total cache entries */
  totalEntries: number;
  /** Total cache size in bytes */
  totalSize: number;
  /** Average response time in ms */
  avgResponseTime: number;
  /** Cache efficiency metrics */
  efficiency: {
    staleHits: number;
    freshHits: number;
    evictions: number;
    invalidations: number;
  };
}

export interface CacheOperation {
  /** Operation type */
  type: 'get' | 'set' | 'delete' | 'clear' | 'invalidate';
  /** Cache key */
  key: string;
  /** Whether operation was successful */
  success: boolean;
  /** Operation duration in ms */
  duration: number;
  /** Timestamp of operation */
  timestamp: number;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

export interface CacheStorage {
  /** Get value from cache */
  get<T>(key: string): Promise<CacheEntry<T> | null>;
  /** Set value in cache */
  set<T>(key: string, entry: CacheEntry<T>): Promise<void>;
  /** Delete specific key from cache */
  delete(key: string): Promise<boolean>;
  /** Clear all cache entries */
  clear(): Promise<void>;
  /** Get all keys matching pattern */
  keys(pattern?: string): Promise<string[]>;
  /** Get cache size in bytes */
  size(): Promise<number>;
  /** Check if key exists */
  has(key: string): Promise<boolean>;
}

export interface CacheInvalidationRule {
  /** Rule identifier */
  id: string;
  /** Cache key pattern to match */
  pattern: string | RegExp;
  /** Invalidation trigger */
  trigger: 'time' | 'event' | 'mutation' | 'dependency';
  /** Rule configuration */
  config: {
    /** For time-based: interval in ms */
    interval?: number;
    /** For event-based: event names */
    events?: string[];
    /** For mutation-based: mutation keys */
    mutations?: string[];
    /** For dependency-based: dependency keys */
    dependencies?: string[];
  };
  /** Whether rule is active */
  active: boolean;
}

export interface CacheWarmingRule {
  /** Rule identifier */
  id: string;
  /** Cache keys to warm */
  keys: string[] | (() => string[]);
  /** Warming strategy */
  strategy: 'immediate' | 'lazy' | 'scheduled' | 'predictive';
  /** Trigger conditions */
  triggers: {
    /** Application startup */
    startup?: boolean;
    /** User authentication */
    userAuth?: boolean;
    /** Route navigation */
    routeChange?: string[];
    /** Time-based schedule */
    schedule?: string; // cron-like expression
    /** Custom events */
    events?: string[];
  };
  /** Priority level */
  priority: 'low' | 'medium' | 'high' | 'critical';
  /** Whether rule is active */
  active: boolean;
}

export interface StaleWhileRevalidateConfig {
  /** Maximum stale time in milliseconds */
  maxStaleTime: number;
  /** Revalidation timeout in milliseconds */
  revalidateTimeout: number;
  /** Whether to serve stale data on error */
  serveStaleOnError: boolean;
  /** Background revalidation concurrency limit */
  maxConcurrentRevalidations: number;
  /** Minimum time between revalidations */
  minRevalidationInterval: number;
}

export interface CacheStorageConfig {
  /** Storage adapter type */
  type: 'memory' | 'localStorage' | 'sessionStorage' | 'indexedDB' | 'redis';
  /** Storage-specific options */
  options?: {
    /** For IndexedDB: database name */
    dbName?: string;
    /** For IndexedDB: store name */
    storeName?: string;
    /** For Redis: connection options */
    redis?: {
      host?: string;
      port?: number;
      password?: string;
      db?: number;
    };
    /** For memory: max entries */
    maxEntries?: number;
    /** Compression settings */
    compression?: {
      enabled: boolean;
      algorithm?: 'gzip' | 'lz4' | 'brotli';
      threshold?: number; // minimum size in bytes to compress
    };
  };
}

export interface CacheEvent {
  /** Event type */
  type: 'hit' | 'miss' | 'set' | 'delete' | 'evict' | 'invalidate' | 'warm';
  /** Cache key involved */
  key: string;
  /** Event timestamp */
  timestamp: number;
  /** Additional event data */
  data?: any;
  /** Event metadata */
  metadata?: Record<string, any>;
}

export type CacheEventListener = (event: CacheEvent) => void;

export interface CacheManager {
  /** Get cached data */
  get<T>(key: string | CacheKey): Promise<T | null>;
  /** Set cached data */
  set<T>(key: string | CacheKey, data: T, config?: Partial<CacheConfig>): Promise<void>;
  /** Delete cached data */
  delete(key: string | CacheKey): Promise<boolean>;
  /** Invalidate cache entries by pattern or tags */
  invalidate(pattern: string | string[]): Promise<number>;
  /** Clear all cache */
  clear(): Promise<void>;
  /** Warm cache with predefined data */
  warm(keys: string[]): Promise<void>;
  /** Get cache metrics */
  getMetrics(): Promise<CacheMetrics>;
  /** Subscribe to cache events */
  subscribe(listener: CacheEventListener): () => void;
  /** Configure cache behavior */
  configure(config: Partial<CacheConfig>): void;
}