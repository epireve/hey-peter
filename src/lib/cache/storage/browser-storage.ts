/**
 * Browser storage adapters for caching user preferences and application data
 */

import { CacheEntry, CacheStorage, CacheStorageConfig } from '../types';

interface CompressionOptions {
  enabled: boolean;
  algorithm: 'gzip' | 'lz4' | 'brotli';
  threshold: number;
}

/**
 * Base browser storage adapter with compression support
 */
abstract class BaseBrowserStorage implements CacheStorage {
  protected prefix: string;
  protected compression: CompressionOptions;
  protected maxSize: number;

  constructor(
    prefix: string = 'hpa_cache_',
    compression: CompressionOptions = {
      enabled: false,
      algorithm: 'gzip',
      threshold: 1024, // 1KB
    },
    maxSize: number = 100
  ) {
    this.prefix = prefix;
    this.compression = compression;
    this.maxSize = maxSize;
  }

  protected abstract getStorage(): Storage | null;
  protected abstract isAvailable(): boolean;

  protected getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  protected async compress(data: string): Promise<string> {
    if (!this.compression.enabled || data.length < this.compression.threshold) {
      return data;
    }

    try {
      // Simple compression using TextEncoder/TextDecoder
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      const compressed = encoder.encode(data);
      return btoa(String.fromCharCode(...compressed));
    } catch {
      return data; // Fallback to uncompressed
    }
  }

  protected async decompress(data: string): Promise<string> {
    if (!this.compression.enabled) {
      return data;
    }

    try {
      const decoded = atob(data);
      const bytes = new Uint8Array(decoded.length);
      for (let i = 0; i < decoded.length; i++) {
        bytes[i] = decoded.charCodeAt(i);
      }
      const decoder = new TextDecoder();
      return decoder.decode(bytes);
    } catch {
      return data; // Fallback to original data
    }
  }

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    if (!this.isAvailable()) return null;

    const storage = this.getStorage();
    if (!storage) return null;

    try {
      const stored = storage.getItem(this.getKey(key));
      if (!stored) return null;

      const decompressed = await this.decompress(stored);
      const entry: CacheEntry<T> = JSON.parse(decompressed);

      // Check if entry has expired
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
    if (!this.isAvailable()) return;

    const storage = this.getStorage();
    if (!storage) return;

    try {
      const serialized = JSON.stringify(entry);
      const compressed = await this.compress(serialized);
      
      // Check storage quota and clean if necessary
      await this.ensureSpace(compressed.length);
      
      storage.setItem(this.getKey(key), compressed);
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        await this.cleanup();
        try {
          const serialized = JSON.stringify(entry);
          const compressed = await this.compress(serialized);
          storage.setItem(this.getKey(key), compressed);
        } catch {
          console.warn(`Failed to cache ${key}: Storage quota exceeded`);
        }
      } else {
        console.error(`Error setting cache entry for key ${key}:`, error);
      }
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!this.isAvailable()) return false;

    const storage = this.getStorage();
    if (!storage) return false;

    try {
      const fullKey = this.getKey(key);
      const existed = storage.getItem(fullKey) !== null;
      storage.removeItem(fullKey);
      return existed;
    } catch (error) {
      console.error(`Error deleting cache entry for key ${key}:`, error);
      return false;
    }
  }

  async clear(): Promise<void> {
    if (!this.isAvailable()) return;

    const storage = this.getStorage();
    if (!storage) return;

    try {
      const keys = await this.keys();
      keys.forEach(key => storage.removeItem(this.getKey(key)));
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  async keys(pattern?: string): Promise<string[]> {
    if (!this.isAvailable()) return [];

    const storage = this.getStorage();
    if (!storage) return [];

    try {
      const keys: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && key.startsWith(this.prefix)) {
          const cacheKey = key.substring(this.prefix.length);
          if (!pattern || cacheKey.includes(pattern)) {
            keys.push(cacheKey);
          }
        }
      }
      return keys;
    } catch (error) {
      console.error('Error getting cache keys:', error);
      return [];
    }
  }

  async size(): Promise<number> {
    if (!this.isAvailable()) return 0;

    const storage = this.getStorage();
    if (!storage) return 0;

    try {
      let totalSize = 0;
      const keys = await this.keys();
      
      for (const key of keys) {
        const item = storage.getItem(this.getKey(key));
        if (item) {
          totalSize += item.length * 2; // UTF-16 encoding
        }
      }
      
      return totalSize;
    } catch (error) {
      console.error('Error calculating cache size:', error);
      return 0;
    }
  }

  async has(key: string): Promise<boolean> {
    if (!this.isAvailable()) return false;

    const storage = this.getStorage();
    if (!storage) return false;

    return storage.getItem(this.getKey(key)) !== null;
  }

  private async ensureSpace(requiredSize: number): Promise<void> {
    const storage = this.getStorage();
    if (!storage) return;

    try {
      // Try to store a test item to check available space
      const testKey = `${this.prefix}__test__`;
      storage.setItem(testKey, 'x'.repeat(requiredSize));
      storage.removeItem(testKey);
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        await this.cleanup();
      }
    }
  }

  private async cleanup(): Promise<void> {
    const storage = this.getStorage();
    if (!storage) return;

    try {
      const keys = await this.keys();
      const entries: Array<{ key: string; timestamp: number }> = [];

      // Collect entries with timestamps
      for (const key of keys) {
        const entry = await this.get(key);
        if (entry) {
          entries.push({ key, timestamp: entry.timestamp });
        }
      }

      // Sort by timestamp (oldest first) and remove oldest entries
      entries.sort((a, b) => a.timestamp - b.timestamp);
      const toRemove = Math.max(1, Math.floor(entries.length * 0.2)); // Remove 20%

      for (let i = 0; i < toRemove; i++) {
        await this.delete(entries[i].key);
      }
    } catch (error) {
      console.error('Error during cache cleanup:', error);
    }
  }
}

/**
 * LocalStorage adapter for persistent caching
 */
export class LocalStorageAdapter extends BaseBrowserStorage {
  protected getStorage(): Storage | null {
    return typeof window !== 'undefined' ? window.localStorage : null;
  }

  protected isAvailable(): boolean {
    if (typeof window === 'undefined') return false;
    
    try {
      const test = '__test__';
      window.localStorage.setItem(test, test);
      window.localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * SessionStorage adapter for session-based caching
 */
export class SessionStorageAdapter extends BaseBrowserStorage {
  protected getStorage(): Storage | null {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  }

  protected isAvailable(): boolean {
    if (typeof window === 'undefined') return false;
    
    try {
      const test = '__test__';
      window.sessionStorage.setItem(test, test);
      window.sessionStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * In-memory storage adapter for temporary caching
 */
export class MemoryStorageAdapter implements CacheStorage {
  private cache = new Map<string, string>();
  private prefix: string;
  private maxSize: number;

  constructor(prefix: string = 'hpa_cache_', maxSize: number = 100) {
    this.prefix = prefix;
    this.maxSize = maxSize;
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    try {
      const stored = this.cache.get(this.getKey(key));
      if (!stored) return null;

      const entry: CacheEntry<T> = JSON.parse(stored);

      // Check if entry has expired
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
      // Ensure we don't exceed max size
      if (this.cache.size >= this.maxSize) {
        const firstKey = this.cache.keys().next().value;
        if (firstKey) {
          this.cache.delete(firstKey);
        }
      }

      const serialized = JSON.stringify(entry);
      this.cache.set(this.getKey(key), serialized);
    } catch (error) {
      console.error(`Error setting cache entry for key ${key}:`, error);
    }
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(this.getKey(key));
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async keys(pattern?: string): Promise<string[]> {
    const keys: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith(this.prefix)) {
        const cacheKey = key.substring(this.prefix.length);
        if (!pattern || cacheKey.includes(pattern)) {
          keys.push(cacheKey);
        }
      }
    }
    return keys;
  }

  async size(): Promise<number> {
    let totalSize = 0;
    for (const value of this.cache.values()) {
      totalSize += value.length * 2; // UTF-16 encoding
    }
    return totalSize;
  }

  async has(key: string): Promise<boolean> {
    return this.cache.has(this.getKey(key));
  }
}

/**
 * Factory function to create appropriate storage adapter
 */
export function createBrowserStorage(config: CacheStorageConfig): CacheStorage {
  const { type, options = {} } = config;

  switch (type) {
    case 'localStorage':
      return new LocalStorageAdapter(
        options.prefix,
        options.compression,
        options.maxEntries
      );
    
    case 'sessionStorage':
      return new SessionStorageAdapter(
        options.prefix,
        options.compression,
        options.maxEntries
      );
    
    case 'memory':
    default:
      return new MemoryStorageAdapter(
        options.prefix,
        options.maxEntries
      );
  }
}

/**
 * User preferences caching utility
 */
export class UserPreferencesCache {
  private storage: CacheStorage;
  private userId?: string;

  constructor(storage: CacheStorage) {
    this.storage = storage;
  }

  setUserId(userId: string) {
    this.userId = userId;
  }

  private getUserKey(key: string): string {
    return this.userId ? `user:${this.userId}:${key}` : `global:${key}`;
  }

  async getPreference<T>(key: string, defaultValue?: T): Promise<T | null> {
    try {
      const entry = await this.storage.get<T>(this.getUserKey(key));
      return entry?.data ?? defaultValue ?? null;
    } catch (error) {
      console.error(`Error getting preference ${key}:`, error);
      return defaultValue ?? null;
    }
  }

  async setPreference<T>(key: string, value: T, ttl: number = 30 * 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data: value,
        timestamp: Date.now(),
        ttl,
        metadata: { type: 'user_preference' }
      };
      
      await this.storage.set(this.getUserKey(key), entry);
    } catch (error) {
      console.error(`Error setting preference ${key}:`, error);
    }
  }

  async removePreference(key: string): Promise<boolean> {
    try {
      return await this.storage.delete(this.getUserKey(key));
    } catch (error) {
      console.error(`Error removing preference ${key}:`, error);
      return false;
    }
  }

  async clearUserPreferences(): Promise<void> {
    if (!this.userId) return;

    try {
      const keys = await this.storage.keys(`user:${this.userId}:`);
      await Promise.all(keys.map(key => this.storage.delete(key)));
    } catch (error) {
      console.error('Error clearing user preferences:', error);
    }
  }

  async getAllPreferences(): Promise<Record<string, any>> {
    if (!this.userId) return {};

    try {
      const keys = await this.storage.keys(`user:${this.userId}:`);
      const preferences: Record<string, any> = {};

      await Promise.all(
        keys.map(async (key) => {
          const entry = await this.storage.get(key);
          if (entry) {
            const prefKey = key.replace(`user:${this.userId}:`, '');
            preferences[prefKey] = entry.data;
          }
        })
      );

      return preferences;
    } catch (error) {
      console.error('Error getting all preferences:', error);
      return {};
    }
  }
}