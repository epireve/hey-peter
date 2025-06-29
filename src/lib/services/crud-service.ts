import { supabase } from "@/lib/supabase";

export interface CRUDOptions {
  table: string;
  select?: string;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  cache?: {
    enabled: boolean;
    ttl?: number; // Time to live in milliseconds
  };
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
}

export interface FilterOptions {
  column: string;
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "like" | "ilike" | "in";
  value: any;
}

// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number }>();

export class CRUDService<T = any> {
  private table: string;
  private defaultSelect: string;
  private cacheEnabled: boolean;
  private cacheTTL: number;

  constructor(options: CRUDOptions) {
    this.table = options.table;
    this.defaultSelect = options.select || "*";
    this.cacheEnabled = options.cache?.enabled || false;
    this.cacheTTL = options.cache?.ttl || 5 * 60 * 1000; // 5 minutes default
  }

  private getCacheKey(method: string, params?: any): string {
    return `${this.table}:${method}:${JSON.stringify(params || {})}`;
  }

  private getFromCache(key: string): any | null {
    if (!this.cacheEnabled) return null;

    const cached = cache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.cacheTTL;
    if (isExpired) {
      cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: any): void {
    if (!this.cacheEnabled) return;
    cache.set(key, { data, timestamp: Date.now() });
  }

  private clearCache(): void {
    // Clear all cache entries for this table
    const keysToDelete: string[] = [];
    cache.forEach((_, key) => {
      if (key.startsWith(`${this.table}:`)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => cache.delete(key));
  }

  async getAll(options?: {
    filters?: FilterOptions[];
    orderBy?: { column: string; ascending?: boolean };
    pagination?: PaginationOptions;
  }): Promise<{ data: T[] | null; error: any; count?: number }> {
    const cacheKey = this.getCacheKey("getAll", options);
    const cached = this.getFromCache(cacheKey);
    if (cached) return { data: cached, error: null };

    try {
      let query = supabase.from(this.table).select(this.defaultSelect, { count: "exact" });

      // Apply filters
      if (options?.filters) {
        options.filters.forEach(filter => {
          query = query[filter.operator](filter.column, filter.value);
        });
      }

      // Apply ordering
      if (options?.orderBy) {
        query = query.order(options.orderBy.column, { 
          ascending: options.orderBy.ascending ?? true 
        });
      }

      // Apply pagination
      if (options?.pagination) {
        const { page, pageSize } = options.pagination;
        const start = (page - 1) * pageSize;
        const end = start + pageSize - 1;
        query = query.range(start, end);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      this.setCache(cacheKey, data);
      return { data, error: null, count: count || 0 };
    } catch (error) {
      return { data: null, error };
    }
  }

  async getById(id: string | number): Promise<{ data: T | null; error: any }> {
    const cacheKey = this.getCacheKey("getById", { id });
    const cached = this.getFromCache(cacheKey);
    if (cached) return { data: cached, error: null };

    try {
      const { data, error } = await supabase
        .from(this.table)
        .select(this.defaultSelect)
        .eq("id", id)
        .single();

      if (error) throw error;

      this.setCache(cacheKey, data);
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async create(payload: Partial<T>): Promise<{ data: T | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from(this.table)
        .insert(payload)
        .select(this.defaultSelect)
        .single();

      if (error) throw error;

      this.clearCache(); // Invalidate cache on create
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async update(id: string | number, payload: Partial<T>): Promise<{ data: T | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from(this.table)
        .update(payload)
        .eq("id", id)
        .select(this.defaultSelect)
        .single();

      if (error) throw error;

      this.clearCache(); // Invalidate cache on update
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async delete(id: string | number): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from(this.table)
        .delete()
        .eq("id", id);

      if (error) throw error;

      this.clearCache(); // Invalidate cache on delete
      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  async deleteMany(ids: (string | number)[]): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from(this.table)
        .delete()
        .in("id", ids);

      if (error) throw error;

      this.clearCache(); // Invalidate cache on bulk delete
      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  // Real-time subscription
  subscribe(
    callback: (payload: any) => void,
    events: ("INSERT" | "UPDATE" | "DELETE")[] = ["INSERT", "UPDATE", "DELETE"]
  ) {
    const subscription = supabase
      .channel(`${this.table}_changes`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: this.table,
        },
        (payload) => {
          if (events.includes(payload.eventType as any)) {
            this.clearCache(); // Invalidate cache on real-time changes
            callback(payload);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }
}

// Retry wrapper for API calls
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    delay?: number;
    onRetry?: (error: any, attempt: number) => void;
  } = {}
): Promise<T> {
  const { maxRetries = 3, delay = 1000, onRetry } = options;
  
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries) {
        onRetry?.(error, attempt);
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }
  
  throw lastError;
}