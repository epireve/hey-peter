import { supabase } from "@/lib/supabase";
import { SupabaseClient } from "@supabase/supabase-js";
import { performanceMonitor } from "@/lib/utils/performance-monitor";
import { validateColumnName, validateOperator, sanitizeInput } from "@/lib/utils/security";

export interface CRUDOptions {
  table: string;
  select?: string;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  cache?: {
    enabled: boolean;
    ttl?: number; // Time to live in milliseconds
  };
  supabaseClient?: SupabaseClient; // Optional custom client
  allowedColumns?: string[]; // Security: whitelist of allowed columns
  allowedOrderColumns?: string[]; // Security: whitelist of columns that can be used for ordering
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

// Export cache for testing purposes only
export { cache };

export class CRUDService<T = any> {
  private table: string;
  private defaultSelect: string;
  private cacheEnabled: boolean;
  private cacheTTL: number;
  private supabaseClient: SupabaseClient;
  private allowedColumns: string[];
  private allowedOrderColumns: string[];

  constructor(options: CRUDOptions) {
    this.table = sanitizeInput(options.table);
    this.defaultSelect = options.select || "*";
    this.cacheEnabled = options.cache?.enabled || false;
    this.cacheTTL = options.cache?.ttl || 5 * 60 * 1000; // 5 minutes default
    this.supabaseClient = options.supabaseClient || supabase;
    this.allowedColumns = options.allowedColumns || [];
    this.allowedOrderColumns = options.allowedOrderColumns || this.allowedColumns;
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

    return performanceMonitor.trackQuery(
      `${this.table}.getAll`,
      async () => {
        try {
          let query = this.supabaseClient.from(this.table).select(this.defaultSelect, { count: "exact" });

      // Apply filters with security validation
      if (options?.filters) {
        for (const filter of options.filters) {
          // Validate operator
          if (!validateOperator(filter.operator)) {
            throw new Error(`Invalid operator: ${filter.operator}`);
          }
          
          // Validate column name if allowedColumns is configured
          if (this.allowedColumns.length > 0) {
            const validColumn = validateColumnName(filter.column, this.allowedColumns);
            if (!validColumn) {
              throw new Error(`Invalid or unauthorized column: ${filter.column}`);
            }
            filter.column = validColumn;
          }
          
          // Sanitize filter value
          if (typeof filter.value === 'string') {
            filter.value = sanitizeInput(filter.value);
          }
          
          query = query[filter.operator](filter.column, filter.value);
        }
      }

      // Apply ordering with security validation
      if (options?.orderBy) {
        // Validate order column if allowedOrderColumns is configured
        if (this.allowedOrderColumns.length > 0) {
          const validColumn = validateColumnName(options.orderBy.column, this.allowedOrderColumns);
          if (!validColumn) {
            throw new Error(`Invalid or unauthorized order column: ${options.orderBy.column}`);
          }
          options.orderBy.column = validColumn;
        }
        
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
      },
      { filters: options?.filters, pagination: options?.pagination }
    );
  }

  async getById(id: string | number): Promise<{ data: T | null; error: any }> {
    const cacheKey = this.getCacheKey("getById", { id });
    const cached = this.getFromCache(cacheKey);
    if (cached) return { data: cached, error: null };

    return performanceMonitor.trackQuery(
      `${this.table}.getById`,
      async () => {
        try {
          const { data, error } = await this.supabaseClient
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
      },
      { id }
    );
  }

  async create(payload: Partial<T>): Promise<{ data: T | null; error: any }> {
    return performanceMonitor.trackQuery(
      `${this.table}.create`,
      async () => {
        try {
          const { data, error } = await this.supabaseClient
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
    );
  }

  async update(id: string | number, payload: Partial<T>): Promise<{ data: T | null; error: any }> {
    return performanceMonitor.trackQuery(
      `${this.table}.update`,
      async () => {
        try {
          const { data, error } = await this.supabaseClient
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
      },
      { id }
    );
  }

  async delete(id: string | number): Promise<{ error: any }> {
    try {
      const { error } = await this.supabaseClient
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
      const { error } = await this.supabaseClient
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
    const subscription = this.supabaseClient
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