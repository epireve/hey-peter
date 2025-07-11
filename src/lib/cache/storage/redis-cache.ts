/**
 * Redis-compatible caching service for server-side operations
 * Supports both Redis and in-memory fallback for development
 */

import { CacheEntry, CacheStorage, CacheStorageConfig } from '../types';

interface RedisLikeClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  del(key: string): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  exists(key: string): Promise<number>;
  flushall(): Promise<string>;
  ttl(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  mget(keys: string[]): Promise<(string | null)[]>;
  mset(keyValues: string[]): Promise<string>;
  incr(key: string): Promise<number>;
  decr(key: string): Promise<number>;
  sadd(key: string, ...members: string[]): Promise<number>;
  smembers(key: string): Promise<string[]>;
  srem(key: string, ...members: string[]): Promise<number>;
  zadd(key: string, score: number, member: string): Promise<number>;
  zrange(key: string, start: number, stop: number): Promise<string[]>;
  zrem(key: string, ...members: string[]): Promise<number>;
}

/**
 * In-memory Redis-compatible implementation for development/testing
 */
class MemoryRedisClient implements RedisLikeClient {
  private data = new Map<string, { value: string; expiry?: number }>();

  async get(key: string): Promise<string | null> {
    const entry = this.data.get(key);
    if (!entry) return null;
    
    if (entry.expiry && Date.now() > entry.expiry) {
      this.data.delete(key);
      return null;
    }
    
    return entry.value;
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    const expiry = ttl ? Date.now() + (ttl * 1000) : undefined;
    this.data.set(key, { value, expiry });
  }

  async del(key: string): Promise<number> {
    return this.data.delete(key) ? 1 : 0;
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return Array.from(this.data.keys()).filter(key => regex.test(key));
  }

  async exists(key: string): Promise<number> {
    const entry = this.data.get(key);
    if (!entry) return 0;
    
    if (entry.expiry && Date.now() > entry.expiry) {
      this.data.delete(key);
      return 0;
    }
    
    return 1;
  }

  async flushall(): Promise<string> {
    this.data.clear();
    return 'OK';
  }

  async ttl(key: string): Promise<number> {
    const entry = this.data.get(key);
    if (!entry) return -2; // Key doesn't exist
    if (!entry.expiry) return -1; // Key exists but no expiry
    
    const remaining = Math.ceil((entry.expiry - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const entry = this.data.get(key);
    if (!entry) return 0;
    
    entry.expiry = Date.now() + (seconds * 1000);
    return 1;
  }

  async mget(keys: string[]): Promise<(string | null)[]> {
    return Promise.all(keys.map(key => this.get(key)));
  }

  async mset(keyValues: string[]): Promise<string> {
    for (let i = 0; i < keyValues.length; i += 2) {
      const key = keyValues[i];
      const value = keyValues[i + 1];
      if (key && value !== undefined) {
        await this.set(key, value);
      }
    }
    return 'OK';
  }

  async incr(key: string): Promise<number> {
    const current = await this.get(key);
    const value = current ? parseInt(current, 10) + 1 : 1;
    await this.set(key, value.toString());
    return value;
  }

  async decr(key: string): Promise<number> {
    const current = await this.get(key);
    const value = current ? parseInt(current, 10) - 1 : -1;
    await this.set(key, value.toString());
    return value;
  }

  // Set operations (simplified)
  async sadd(key: string, ...members: string[]): Promise<number> {
    const existing = await this.get(key);
    const set = new Set(existing ? JSON.parse(existing) : []);
    const initialSize = set.size;
    
    members.forEach(member => set.add(member));
    await this.set(key, JSON.stringify(Array.from(set)));
    
    return set.size - initialSize;
  }

  async smembers(key: string): Promise<string[]> {
    const value = await this.get(key);
    return value ? JSON.parse(value) : [];
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    const existing = await this.get(key);
    if (!existing) return 0;
    
    const set = new Set(JSON.parse(existing));
    const initialSize = set.size;
    
    members.forEach(member => set.delete(member));
    await this.set(key, JSON.stringify(Array.from(set)));
    
    return initialSize - set.size;
  }

  // Sorted set operations (simplified)
  async zadd(key: string, score: number, member: string): Promise<number> {
    const existing = await this.get(key);
    const sortedSet = existing ? JSON.parse(existing) : [];
    
    const existingIndex = sortedSet.findIndex((item: any) => item.member === member);
    if (existingIndex >= 0) {
      sortedSet[existingIndex].score = score;
      await this.set(key, JSON.stringify(sortedSet));
      return 0;
    } else {
      sortedSet.push({ score, member });
      sortedSet.sort((a: any, b: any) => a.score - b.score);
      await this.set(key, JSON.stringify(sortedSet));
      return 1;
    }
  }

  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    const value = await this.get(key);
    if (!value) return [];
    
    const sortedSet = JSON.parse(value);
    return sortedSet.slice(start, stop + 1).map((item: any) => item.member);
  }

  async zrem(key: string, ...members: string[]): Promise<number> {
    const existing = await this.get(key);
    if (!existing) return 0;
    
    const sortedSet = JSON.parse(existing);
    const initialLength = sortedSet.length;
    
    const filtered = sortedSet.filter((item: any) => !members.includes(item.member));
    await this.set(key, JSON.stringify(filtered));
    
    return initialLength - filtered.length;
  }
}

/**
 * Redis-compatible cache storage implementation
 */
export class RedisCacheStorage implements CacheStorage {
  private client: RedisLikeClient;
  private prefix: string;
  private defaultTtl: number;

  constructor(client: RedisLikeClient, prefix: string = 'hpa:', defaultTtl: number = 3600) {
    this.client = client;
    this.prefix = prefix;
    this.defaultTtl = defaultTtl;
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    try {
      const data = await this.client.get(this.getKey(key));
      if (!data) return null;

      const entry: CacheEntry<T> = JSON.parse(data);
      
      // Double-check expiry (Redis should handle this, but just in case)
      const now = Date.now();
      if (entry.timestamp + entry.ttl < now) {
        await this.delete(key);
        return null;
      }

      return entry;
    } catch (error) {
      console.error(`Error getting cache entry for key ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    try {
      const data = JSON.stringify(entry);
      const ttlSeconds = Math.ceil(entry.ttl / 1000);
      await this.client.set(this.getKey(key), data, ttlSeconds);
    } catch (error) {
      console.error(`Error setting cache entry for key ${key}:`, error);
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.client.del(this.getKey(key));
      return result > 0;
    } catch (error) {
      console.error(`Error deleting cache entry for key ${key}:`, error);
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = await this.keys();
      if (keys.length > 0) {
        await Promise.all(keys.map(key => this.client.del(this.getKey(key))));
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  async keys(pattern?: string): Promise<string[]> {
    try {
      const searchPattern = pattern 
        ? `${this.prefix}*${pattern}*`
        : `${this.prefix}*`;
      
      const keys = await this.client.keys(searchPattern);
      return keys.map(key => key.substring(this.prefix.length));
    } catch (error) {
      console.error('Error getting cache keys:', error);
      return [];
    }
  }

  async size(): Promise<number> {
    try {
      const keys = await this.keys();
      
      if (keys.length === 0) return 0;
      
      const values = await this.client.mget(keys.map(key => this.getKey(key)));
      return values.reduce((total, value) => {
        return total + (value ? value.length * 2 : 0); // UTF-16 encoding
      }, 0);
    } catch (error) {
      console.error('Error calculating cache size:', error);
      return 0;
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(this.getKey(key));
      return result > 0;
    } catch (error) {
      console.error(`Error checking cache key existence for ${key}:`, error);
      return false;
    }
  }
}

/**
 * Advanced Redis cache operations
 */
export class AdvancedRedisCache extends RedisCacheStorage {
  /**
   * Atomic increment operation
   */
  async increment(key: string, delta: number = 1): Promise<number> {
    const redisKey = this.getKey(key);
    
    if (delta === 1) {
      return this.client.incr(redisKey);
    } else if (delta === -1) {
      return this.client.decr(redisKey);
    } else {
      // For other deltas, we need to use a more complex approach
      const current = await this.client.get(redisKey);
      const newValue = (current ? parseInt(current, 10) : 0) + delta;
      await this.client.set(redisKey, newValue.toString());
      return newValue;
    }
  }

  /**
   * Set operations for managing cache tags
   */
  async addToSet(key: string, ...members: string[]): Promise<number> {
    return this.client.sadd(this.getKey(key), ...members);
  }

  async getSetMembers(key: string): Promise<string[]> {
    return this.client.smembers(this.getKey(key));
  }

  async removeFromSet(key: string, ...members: string[]): Promise<number> {
    return this.client.srem(this.getKey(key), ...members);
  }

  /**
   * Sorted set operations for ranking/scoring
   */
  async addToSortedSet(key: string, score: number, member: string): Promise<number> {
    return this.client.zadd(this.getKey(key), score, member);
  }

  async getSortedSetRange(key: string, start: number = 0, stop: number = -1): Promise<string[]> {
    return this.client.zrange(this.getKey(key), start, stop);
  }

  async removeFromSortedSet(key: string, ...members: string[]): Promise<number> {
    return this.client.zrem(this.getKey(key), ...members);
  }

  /**
   * Batch operations
   */
  async mget<T>(keys: string[]): Promise<(CacheEntry<T> | null)[]> {
    try {
      const redisKeys = keys.map(key => this.getKey(key));
      const values = await this.client.mget(redisKeys);
      
      return values.map(value => {
        if (!value) return null;
        try {
          return JSON.parse(value) as CacheEntry<T>;
        } catch {
          return null;
        }
      });
    } catch (error) {
      console.error('Error in batch get operation:', error);
      return keys.map(() => null);
    }
  }

  async mset<T>(entries: Array<{ key: string; entry: CacheEntry<T> }>): Promise<void> {
    try {
      const keyValues: string[] = [];
      
      for (const { key, entry } of entries) {
        keyValues.push(this.getKey(key));
        keyValues.push(JSON.stringify(entry));
      }
      
      await this.client.mset(keyValues);
      
      // Set TTL for each key separately (Redis MSET doesn't support TTL)
      await Promise.all(
        entries.map(({ key, entry }) => {
          const ttlSeconds = Math.ceil(entry.ttl / 1000);
          return this.client.expire(this.getKey(key), ttlSeconds);
        })
      );
    } catch (error) {
      console.error('Error in batch set operation:', error);
    }
  }

  /**
   * Cache warming with priority
   */
  async warmCache(warmingData: Array<{ key: string; priority: number; loader: () => Promise<any> }>): Promise<void> {
    // Sort by priority (higher first)
    const sorted = warmingData.sort((a, b) => b.priority - a.priority);
    
    // Process in batches to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < sorted.length; i += batchSize) {
      const batch = sorted.slice(i, i + batchSize);
      
      await Promise.allSettled(
        batch.map(async ({ key, loader }) => {
          try {
            const exists = await this.has(key);
            if (!exists) {
              const data = await loader();
              const entry: CacheEntry<any> = {
                data,
                timestamp: Date.now(),
                ttl: this.defaultTtl * 1000,
                metadata: { warmed: true }
              };
              await this.set(key, entry);
            }
          } catch (error) {
            console.error(`Failed to warm cache for key ${key}:`, error);
          }
        })
      );
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalKeys: number;
    totalSize: number;
    hitRate?: number;
    memoryUsage?: number;
  }> {
    try {
      const keys = await this.keys();
      const totalSize = await this.size();
      
      return {
        totalKeys: keys.length,
        totalSize,
        // Note: Hit rate would require additional tracking
        // Memory usage would require Redis INFO command
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        totalKeys: 0,
        totalSize: 0
      };
    }
  }
}

/**
 * Factory function to create Redis cache instances
 */
export function createRedisCache(config: CacheStorageConfig): AdvancedRedisCache {
  let client: RedisLikeClient;

  if (config.options?.redis) {
    // In a real implementation, you would create an actual Redis client here
    // For now, we'll use the memory implementation as fallback
    console.warn('Redis configuration provided but using memory fallback. Implement actual Redis client integration.');
    client = new MemoryRedisClient();
  } else {
    // Use in-memory implementation for development
    client = new MemoryRedisClient();
  }

  const prefix = config.options?.prefix || 'hpa:';
  const defaultTtl = 3600; // 1 hour

  return new AdvancedRedisCache(client, prefix, defaultTtl);
}

/**
 * Redis connection manager for production environments
 */
export class RedisConnectionManager {
  private static instance: RedisConnectionManager;
  private client: RedisLikeClient | null = null;
  private config: CacheStorageConfig['options'] = {};

  static getInstance(): RedisConnectionManager {
    if (!RedisConnectionManager.instance) {
      RedisConnectionManager.instance = new RedisConnectionManager();
    }
    return RedisConnectionManager.instance;
  }

  async connect(config: CacheStorageConfig['options'] = {}): Promise<RedisLikeClient> {
    if (this.client) {
      return this.client;
    }

    this.config = config;

    try {
      if (config.redis) {
        // In production, implement actual Redis connection
        // const Redis = require('ioredis');
        // this.client = new Redis(config.redis);
        
        console.log('Redis connection would be established here in production');
        this.client = new MemoryRedisClient(); // Fallback for now
      } else {
        this.client = new MemoryRedisClient();
      }

      console.log('Cache client connected successfully');
      return this.client;
    } catch (error) {
      console.error('Failed to connect to cache:', error);
      this.client = new MemoryRedisClient(); // Always fallback to memory
      return this.client;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      // In production: await this.client.quit();
      this.client = null;
      console.log('Cache client disconnected');
    }
  }

  getClient(): RedisLikeClient | null {
    return this.client;
  }

  isConnected(): boolean {
    return this.client !== null;
  }
}