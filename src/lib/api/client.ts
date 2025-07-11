/**
 * Type-Safe API Client for HeyPeter Academy LMS
 * 
 * A comprehensive API client that provides:
 * - Type-safe endpoint definitions
 * - Request/response interceptors  
 * - Automatic retry with exponential backoff
 * - Request cancellation support
 * - Caching layer integration
 * - Error handling with custom error system
 * - Authentication token management
 * - Development vs production configurations
 * - Logging integration
 */

import { logger } from '@/lib/services/logger';
import { AppError, ErrorCode } from '@/lib/errors/app-error';
import { APIResponse, ApiError } from '@/lib/errors/api-error-response';
import { ApiResponse } from '@/types/api';

// =============================================================================
// Configuration Types
// =============================================================================

export interface ApiClientConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  retryMultiplier: number;
  maxRetryDelay: number;
  enableCache: boolean;
  cacheTimeout: number;
  enableLogging: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  headers?: Record<string, string>;
  interceptors?: {
    request?: RequestInterceptor[];
    response?: ResponseInterceptor[];
  };
  authConfig?: {
    tokenKey: string;
    refreshTokenKey: string;
    authHeaderPrefix: string;
    autoRefresh: boolean;
  };
}

export interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  params?: Record<string, any>;
  data?: any;
  headers?: Record<string, string>;
  timeout?: number;
  retryAttempts?: number;
  enableCache?: boolean;
  cacheKey?: string;
  cacheTimeout?: number;
  signal?: AbortSignal;
  metadata?: Record<string, any>;
}

export interface CacheEntry {
  data: any;
  timestamp: number;
  expiresAt: number;
  etag?: string;
}

export interface RequestInterceptor {
  (config: RequestConfig): Promise<RequestConfig> | RequestConfig;
}

export interface ResponseInterceptor {
  onFulfilled?: (response: ApiResponse) => Promise<ApiResponse> | ApiResponse;
  onRejected?: (error: any) => Promise<any> | any;
}

// =============================================================================
// HTTP Client Implementation
// =============================================================================

export class ApiClient {
  private config: ApiClientConfig;
  private cache: Map<string, CacheEntry> = new Map();
  private activeRequests: Map<string, Promise<any>> = new Map();
  private abortControllers: Map<string, AbortController> = new Map();
  private authToken: string | null = null;
  private refreshToken: string | null = null;
  private isRefreshing = false;
  private refreshPromise: Promise<void> | null = null;
  private clientLogger = logger.child({ service: 'api-client' });

  constructor(config: Partial<ApiClientConfig> = {}) {
    this.config = {
      baseURL: process.env.NODE_ENV === 'production' 
        ? process.env.NEXT_PUBLIC_API_URL || '/api'
        : '/api',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      retryMultiplier: 2,
      maxRetryDelay: 10000,
      enableCache: true,
      cacheTimeout: 300000, // 5 minutes
      enableLogging: true,
      logLevel: process.env.NODE_ENV === 'production' ? 'error' : 'debug',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      authConfig: {
        tokenKey: 'accessToken',
        refreshTokenKey: 'refreshToken',
        authHeaderPrefix: 'Bearer',
        autoRefresh: true,
      },
      ...config,
    };

    // Initialize auth tokens from storage
    this.initializeAuth();

    // Setup cache cleanup
    this.setupCacheCleanup();
  }

  // =============================================================================
  // Authentication Management
  // =============================================================================

  private initializeAuth(): void {
    if (typeof window !== 'undefined') {
      this.authToken = localStorage.getItem(this.config.authConfig!.tokenKey);
      this.refreshToken = localStorage.getItem(this.config.authConfig!.refreshTokenKey);
    }
  }

  setAuthToken(token: string, refreshToken?: string): void {
    this.authToken = token;
    if (refreshToken) {
      this.refreshToken = refreshToken;
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(this.config.authConfig!.tokenKey, token);
      if (refreshToken) {
        localStorage.setItem(this.config.authConfig!.refreshTokenKey, refreshToken);
      }
    }
  }

  clearAuthToken(): void {
    this.authToken = null;
    this.refreshToken = null;

    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.config.authConfig!.tokenKey);
      localStorage.removeItem(this.config.authConfig!.refreshTokenKey);
    }
  }

  private async refreshAuthToken(): Promise<void> {
    if (!this.refreshToken || this.isRefreshing) {
      if (this.refreshPromise) {
        await this.refreshPromise;
      }
      return;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performTokenRefresh();
    
    try {
      await this.refreshPromise;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private async performTokenRefresh(): Promise<void> {
    try {
      const response = await this.request<{
        access_token: string;
        refresh_token: string;
      }>({
        method: 'POST',
        url: '/auth/refresh',
        data: { refresh_token: this.refreshToken },
        retryAttempts: 1,
        enableCache: false,
      });

      if (response.success && response.data) {
        this.setAuthToken(response.data.access_token, response.data.refresh_token);
        this.clientLogger.info('Auth token refreshed successfully');
      } else {
        throw new AppError('Token refresh failed', {
          code: ErrorCode.AUTHENTICATION_ERROR,
          statusCode: 401,
        });
      }
    } catch (error) {
      this.clientLogger.error('Token refresh failed', error);
      this.clearAuthToken();
      throw error;
    }
  }

  // =============================================================================
  // Request/Response Interceptors
  // =============================================================================

  private async applyRequestInterceptors(config: RequestConfig): Promise<RequestConfig> {
    let finalConfig = { ...config };

    if (this.config.interceptors?.request) {
      for (const interceptor of this.config.interceptors.request) {
        finalConfig = await interceptor(finalConfig);
      }
    }

    return finalConfig;
  }

  private async applyResponseInterceptors(
    response: ApiResponse,
    error?: any
  ): Promise<ApiResponse> {
    if (this.config.interceptors?.response) {
      for (const interceptor of this.config.interceptors.response) {
        if (error && interceptor.onRejected) {
          try {
            response = await interceptor.onRejected(error);
          } catch (interceptorError) {
            throw interceptorError;
          }
        } else if (!error && interceptor.onFulfilled) {
          response = await interceptor.onFulfilled(response);
        }
      }
    }

    return response;
  }

  // =============================================================================
  // Cache Management
  // =============================================================================

  private getCacheKey(config: RequestConfig): string {
    if (config.cacheKey) {
      return config.cacheKey;
    }

    const { method, url, params, data } = config;
    const key = `${method}:${url}:${JSON.stringify(params)}:${JSON.stringify(data)}`;
    return btoa(key).replace(/[^a-zA-Z0-9]/g, '');
  }

  private getCachedResponse(cacheKey: string): any | null {
    const entry = this.cache.get(cacheKey);
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(cacheKey);
      return null;
    }

    return entry.data;
  }

  private setCachedResponse(cacheKey: string, data: any, timeout?: number): void {
    const now = Date.now();
    const expiresAt = now + (timeout || this.config.cacheTimeout);

    this.cache.set(cacheKey, {
      data,
      timestamp: now,
      expiresAt,
    });
  }

  private setupCacheCleanup(): void {
    // Clean up expired cache entries every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.expiresAt) {
          this.cache.delete(key);
        }
      }
    }, 300000);
  }

  // =============================================================================
  // Request Deduplication
  // =============================================================================

  private getRequestKey(config: RequestConfig): string {
    const { method, url, params, data } = config;
    return `${method}:${url}:${JSON.stringify(params)}:${JSON.stringify(data)}`;
  }

  private async deduplicateRequest<T>(
    requestKey: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    const activeRequest = this.activeRequests.get(requestKey);
    
    if (activeRequest) {
      this.clientLogger.debug('Deduplicating request', { requestKey });
      return activeRequest;
    }

    const promise = requestFn();
    this.activeRequests.set(requestKey, promise);

    try {
      const result = await promise;
      return result;
    } finally {
      this.activeRequests.delete(requestKey);
    }
  }

  // =============================================================================
  // Retry Logic with Exponential Backoff
  // =============================================================================

  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    attempts: number,
    delay: number
  ): Promise<T> {
    let lastError: any;

    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on client errors (4xx except 429)
        if (error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 429) {
          throw error;
        }

        // Don't retry on the last attempt
        if (i === attempts - 1) {
          throw error;
        }

        // Calculate delay with exponential backoff
        const retryDelay = Math.min(
          delay * Math.pow(this.config.retryMultiplier, i),
          this.config.maxRetryDelay
        );

        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 0.1 * retryDelay;
        const finalDelay = retryDelay + jitter;

        this.clientLogger.debug('Retrying request', {
          attempt: i + 1,
          delay: finalDelay,
          error: error.message,
        });

        await new Promise(resolve => setTimeout(resolve, finalDelay));
      }
    }

    throw lastError;
  }

  // =============================================================================
  // Core Request Method
  // =============================================================================

  async request<T = any>(config: RequestConfig): Promise<ApiResponse<T>> {
    const startTime = performance.now();
    let finalConfig = await this.applyRequestInterceptors(config);

    // Add auth headers if token exists
    if (this.authToken) {
      finalConfig.headers = {
        ...finalConfig.headers,
        Authorization: `${this.config.authConfig!.authHeaderPrefix} ${this.authToken}`,
      };
    }

    const requestKey = this.getRequestKey(finalConfig);
    const cacheKey = this.getCacheKey(finalConfig);
    
    // Check cache first (for GET requests)
    if (finalConfig.method === 'GET' && this.config.enableCache && finalConfig.enableCache !== false) {
      const cachedResponse = this.getCachedResponse(cacheKey);
      if (cachedResponse) {
        this.clientLogger.debug('Serving from cache', { cacheKey });
        return cachedResponse;
      }
    }

    // Deduplicate identical requests
    if (finalConfig.method === 'GET') {
      return this.deduplicateRequest(requestKey, () => this.executeRequest(finalConfig, cacheKey, startTime));
    }

    return this.executeRequest(finalConfig, cacheKey, startTime);
  }

  private async executeRequest<T>(
    config: RequestConfig,
    cacheKey: string,
    startTime: number
  ): Promise<ApiResponse<T>> {
    const url = `${this.config.baseURL}${config.url}`;
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Setup abort controller
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), config.timeout || this.config.timeout);
    
    // Store abort controller for potential cancellation
    this.abortControllers.set(requestId, abortController);

    try {
      const response = await this.retryWithBackoff(
        () => this.performRequest(config, url, abortController.signal),
        config.retryAttempts || this.config.retryAttempts,
        config.retryDelay || this.config.retryDelay
      );

      // Cache successful GET responses
      if (config.method === 'GET' && response.success && this.config.enableCache) {
        this.setCachedResponse(cacheKey, response, config.cacheTimeout);
      }

      // Apply response interceptors
      const finalResponse = await this.applyResponseInterceptors(response);

      // Log successful request
      const duration = performance.now() - startTime;
      this.clientLogger.info('Request completed', {
        method: config.method,
        url: config.url,
        status: response.success ? 'success' : 'error',
        duration: `${duration.toFixed(2)}ms`,
        requestId,
      });

      return finalResponse;

    } catch (error: any) {
      // Handle auth errors with token refresh
      if (error.statusCode === 401 && this.config.authConfig?.autoRefresh && this.refreshToken) {
        try {
          await this.refreshAuthToken();
          
          // Retry original request with new token
          config.headers = {
            ...config.headers,
            Authorization: `${this.config.authConfig!.authHeaderPrefix} ${this.authToken}`,
          };
          
          return this.performRequest(config, url, abortController.signal);
        } catch (refreshError) {
          this.clientLogger.error('Token refresh failed, redirecting to login', refreshError);
          throw error;
        }
      }

      // Apply error response interceptors
      await this.applyResponseInterceptors({} as ApiResponse, error);

      // Log error
      const duration = performance.now() - startTime;
      this.clientLogger.error('Request failed', {
        method: config.method,
        url: config.url,
        error: error.message,
        statusCode: error.statusCode,
        duration: `${duration.toFixed(2)}ms`,
        requestId,
      });

      throw error;

    } finally {
      clearTimeout(timeoutId);
      this.abortControllers.delete(requestId);
    }
  }

  private async performRequest(
    config: RequestConfig,
    url: string,
    signal: AbortSignal
  ): Promise<ApiResponse> {
    const requestInit: RequestInit = {
      method: config.method,
      headers: {
        ...this.config.headers,
        ...config.headers,
      },
      signal,
    };

    // Add query parameters for GET requests
    if (config.method === 'GET' && config.params) {
      const searchParams = new URLSearchParams();
      Object.entries(config.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      url += `?${searchParams.toString()}`;
    }

    // Add body for non-GET requests
    if (config.method !== 'GET' && config.data) {
      requestInit.body = JSON.stringify(config.data);
    }

    const response = await fetch(url, requestInit);

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    let responseData: any;
    
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    // Handle HTTP errors
    if (!response.ok) {
      throw new AppError(
        responseData?.message || responseData?.error || `HTTP ${response.status}`,
        {
          code: this.mapStatusToErrorCode(response.status),
          statusCode: response.status,
          details: responseData,
        }
      );
    }

    return {
      success: true,
      data: responseData.data || responseData,
      timestamp: new Date().toISOString(),
    };
  }

  private mapStatusToErrorCode(status: number): ErrorCode {
    switch (status) {
      case 400:
        return ErrorCode.INVALID_INPUT;
      case 401:
        return ErrorCode.UNAUTHORIZED;
      case 403:
        return ErrorCode.INSUFFICIENT_PERMISSIONS;
      case 404:
        return ErrorCode.RECORD_NOT_FOUND;
      case 409:
        return ErrorCode.DUPLICATE_RECORD;
      case 422:
        return ErrorCode.VALIDATION_ERROR;
      case 429:
        return ErrorCode.RATE_LIMIT_EXCEEDED;
      case 500:
        return ErrorCode.INTERNAL_ERROR;
      case 503:
        return ErrorCode.SERVICE_UNAVAILABLE;
      default:
        return ErrorCode.INTERNAL_ERROR;
    }
  }

  // =============================================================================
  // Convenience Methods
  // =============================================================================

  async get<T>(
    url: string,
    params?: Record<string, any>,
    config?: Partial<RequestConfig>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: 'GET',
      url,
      params,
      ...config,
    });
  }

  async post<T>(
    url: string,
    data?: any,
    config?: Partial<RequestConfig>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: 'POST',
      url,
      data,
      ...config,
    });
  }

  async put<T>(
    url: string,
    data?: any,
    config?: Partial<RequestConfig>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: 'PUT',
      url,
      data,
      ...config,
    });
  }

  async patch<T>(
    url: string,
    data?: any,
    config?: Partial<RequestConfig>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: 'PATCH',
      url,
      data,
      ...config,
    });
  }

  async delete<T>(
    url: string,
    config?: Partial<RequestConfig>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: 'DELETE',
      url,
      ...config,
    });
  }

  // =============================================================================
  // Request Cancellation
  // =============================================================================

  cancelRequest(requestId: string): void {
    const controller = this.abortControllers.get(requestId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(requestId);
    }
  }

  cancelAllRequests(): void {
    for (const [requestId, controller] of this.abortControllers.entries()) {
      controller.abort();
    }
    this.abortControllers.clear();
  }

  // =============================================================================
  // Configuration Methods
  // =============================================================================

  setConfig(config: Partial<ApiClientConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): ApiClientConfig {
    return { ...this.config };
  }

  // =============================================================================
  // Utility Methods
  // =============================================================================

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): {
    size: number;
    hitRate: number;
    entries: Array<{ key: string; size: number; age: number }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      size: JSON.stringify(entry.data).length,
      age: now - entry.timestamp,
    }));

    return {
      size: this.cache.size,
      hitRate: 0, // TODO: Implement hit rate tracking
      entries,
    };
  }
}

// =============================================================================
// Default Client Instance
// =============================================================================

export const apiClient = new ApiClient();

// =============================================================================
// Request Interceptor Helpers
// =============================================================================

export const requestInterceptors = {
  // Add correlation ID to requests
  addCorrelationId: (): RequestInterceptor => (config) => {
    const correlationId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      ...config,
      headers: {
        ...config.headers,
        'X-Correlation-ID': correlationId,
      },
    };
  },

  // Add request timestamp
  addTimestamp: (): RequestInterceptor => (config) => ({
    ...config,
    headers: {
      ...config.headers,
      'X-Request-Timestamp': new Date().toISOString(),
    },
  }),

  // Add client info
  addClientInfo: (): RequestInterceptor => (config) => ({
    ...config,
    headers: {
      ...config.headers,
      'X-Client-Version': process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      'X-Client-Platform': typeof window !== 'undefined' ? 'web' : 'server',
    },
  }),
};

// =============================================================================
// Response Interceptor Helpers
// =============================================================================

export const responseInterceptors = {
  // Log response times
  logResponseTime: (): ResponseInterceptor => ({
    onFulfilled: (response) => {
      const requestTime = response.timestamp;
      const now = new Date().toISOString();
      logger.debug('Response time logged', {
        requestTime,
        responseTime: now,
      });
      return response;
    },
  }),

  // Transform error responses
  transformErrors: (): ResponseInterceptor => ({
    onRejected: (error) => {
      if (error.statusCode === 422) {
        // Transform validation errors
        const validationErrors = error.details?.validationErrors || {};
        throw new AppError('Validation failed', {
          code: ErrorCode.VALIDATION_ERROR,
          statusCode: 422,
          details: { validationErrors },
        });
      }
      throw error;
    },
  }),
};