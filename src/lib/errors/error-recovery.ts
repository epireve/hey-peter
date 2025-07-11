/**
 * Error Recovery Strategies
 * Implements automatic retry and recovery mechanisms for various error types
 */

import { AppError, ErrorCode, isAppError } from './app-error';
import { errorTrackingService } from '../services/error-tracking-service';

export interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoff?: 'linear' | 'exponential';
  jitter?: boolean;
  onRetry?: (attempt: number, error: Error) => void;
  shouldRetry?: (error: Error, attempt: number) => boolean;
}

export interface CircuitBreakerOptions {
  threshold?: number;
  timeout?: number;
  resetTimeout?: number;
  onOpen?: () => void;
  onClose?: () => void;
  onHalfOpen?: () => void;
}

export interface RecoveryResult<T> {
  success: boolean;
  data?: T;
  error?: AppError;
  attempts: number;
  duration: number;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  delay: 1000,
  backoff: 'exponential',
  jitter: true,
  onRetry: () => {},
  shouldRetry: (error: Error) => {
    if (isAppError(error)) {
      // Retry on network errors, timeouts, and 5xx errors
      return [
        ErrorCode.NETWORK_ERROR,
        ErrorCode.TIMEOUT_ERROR,
        ErrorCode.SERVICE_UNAVAILABLE
      ].includes(error.code) || error.statusCode >= 500;
    }
    return true;
  }
};

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RecoveryResult<T>> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  const startTime = Date.now();
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      const data = await operation();
      return {
        success: true,
        data,
        attempts: attempt,
        duration: Date.now() - startTime
      };
    } catch (error) {
      lastError = error as Error;

      // Check if should retry
      if (!config.shouldRetry(lastError, attempt) || attempt === config.maxAttempts) {
        break;
      }

      // Calculate delay
      const delay = calculateDelay(attempt, config);
      
      // Call retry callback
      config.onRetry(attempt, lastError);

      // Log retry attempt
      errorTrackingService.addBreadcrumb(
        'Retry',
        `Retrying operation (attempt ${attempt}/${config.maxAttempts})`,
        {
          error: lastError.message,
          delay,
          backoff: config.backoff
        }
      );

      // Wait before retrying
      await sleep(delay);
    }
  }

  return {
    success: false,
    error: isAppError(lastError) ? lastError : new AppError(
      lastError?.message || 'Operation failed after retries',
      { originalError: lastError }
    ),
    attempts: config.maxAttempts,
    duration: Date.now() - startTime
  };
}

/**
 * Circuit breaker pattern implementation
 */
export class CircuitBreaker<T> {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failures = 0;
  private successCount = 0;
  private lastFailureTime?: number;
  private readonly options: Required<CircuitBreakerOptions>;

  constructor(options: CircuitBreakerOptions = {}) {
    this.options = {
      threshold: 5,
      timeout: 60000, // 1 minute
      resetTimeout: 30000, // 30 seconds
      onOpen: () => {},
      onClose: () => {},
      onHalfOpen: () => {},
      ...options
    };
  }

  async execute(operation: () => Promise<T>): Promise<T> {
    // Check if circuit should be half-open
    if (this.state === 'open' && this.shouldAttemptReset()) {
      this.state = 'half-open';
      this.options.onHalfOpen();
    }

    // If circuit is open, fail fast
    if (this.state === 'open') {
      throw new AppError('Circuit breaker is open', {
        code: ErrorCode.SERVICE_UNAVAILABLE,
        statusCode: 503,
        details: {
          failures: this.failures,
          lastFailureTime: this.lastFailureTime
        }
      });
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    
    if (this.state === 'half-open') {
      this.successCount++;
      
      // Close circuit after successful operations in half-open state
      if (this.successCount >= 3) {
        this.state = 'closed';
        this.successCount = 0;
        this.options.onClose();
      }
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    this.successCount = 0;

    if (this.failures >= this.options.threshold) {
      this.state = 'open';
      this.options.onOpen();
      
      // Schedule automatic reset
      setTimeout(() => {
        if (this.state === 'open') {
          this.state = 'half-open';
          this.options.onHalfOpen();
        }
      }, this.options.resetTimeout);
    }
  }

  private shouldAttemptReset(): boolean {
    return this.lastFailureTime 
      ? Date.now() - this.lastFailureTime > this.options.timeout 
      : true;
  }

  getState(): string {
    return this.state;
  }

  reset(): void {
    this.state = 'closed';
    this.failures = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
  }
}

/**
 * Fallback mechanism
 */
export async function withFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T> | T,
  options?: {
    onFallback?: (error: Error) => void;
    shouldFallback?: (error: Error) => boolean;
  }
): Promise<T> {
  try {
    return await primary();
  } catch (error) {
    const shouldUseFallback = options?.shouldFallback 
      ? options.shouldFallback(error as Error)
      : true;

    if (shouldUseFallback) {
      if (options?.onFallback) {
        options.onFallback(error as Error);
      }

      errorTrackingService.addBreadcrumb(
        'Fallback',
        'Using fallback mechanism',
        {
          error: (error as Error).message
        }
      );

      return await fallback();
    }

    throw error;
  }
}

/**
 * Timeout wrapper
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new AppError(errorMessage, {
        code: ErrorCode.TIMEOUT_ERROR,
        statusCode: 408,
        details: { timeoutMs }
      }));
    }, timeoutMs);
  });

  return Promise.race([operation(), timeoutPromise]);
}

/**
 * Batch retry for multiple operations
 */
export async function batchRetry<T, R>(
  items: T[],
  operation: (item: T) => Promise<R>,
  options?: RetryOptions & {
    concurrency?: number;
    continueOnError?: boolean;
  }
): Promise<Array<RecoveryResult<R>>> {
  const concurrency = options?.concurrency || 5;
  const results: Array<RecoveryResult<R>> = [];

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchPromises = batch.map(item =>
      retryWithBackoff(() => operation(item), options)
    );

    const batchResults = await Promise.allSettled(batchPromises);
    
    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else if (options?.continueOnError) {
        results.push({
          success: false,
          error: isAppError(result.reason) 
            ? result.reason 
            : new AppError(result.reason.message),
          attempts: options.maxAttempts || DEFAULT_RETRY_OPTIONS.maxAttempts,
          duration: 0
        });
      } else {
        throw result.reason;
      }
    }
  }

  return results;
}

/**
 * Cache with stale-while-revalidate pattern
 */
export class StaleWhileRevalidateCache<T> {
  private cache = new Map<string, {
    data: T;
    timestamp: number;
    updating?: Promise<T>;
  }>();

  constructor(
    private ttl: number,
    private staleTime: number = ttl * 2
  ) {}

  async get(
    key: string,
    fetcher: () => Promise<T>,
    options?: {
      onStale?: () => void;
      onError?: (error: Error) => void;
    }
  ): Promise<T> {
    const cached = this.cache.get(key);
    const now = Date.now();

    // No cache or completely stale
    if (!cached || now - cached.timestamp > this.staleTime) {
      try {
        const data = await fetcher();
        this.cache.set(key, { data, timestamp: now });
        return data;
      } catch (error) {
        if (cached) {
          // Return stale data on error
          if (options?.onError) {
            options.onError(error as Error);
          }
          return cached.data;
        }
        throw error;
      }
    }

    // Fresh cache
    if (now - cached.timestamp < this.ttl) {
      return cached.data;
    }

    // Stale cache - return immediately and update in background
    if (options?.onStale) {
      options.onStale();
    }

    // Check if already updating
    if (!cached.updating) {
      cached.updating = fetcher()
        .then(data => {
          this.cache.set(key, { data, timestamp: Date.now() });
          return data;
        })
        .catch(error => {
          if (options?.onError) {
            options.onError(error);
          }
          return cached.data;
        })
        .finally(() => {
          cached.updating = undefined;
        });
    }

    return cached.data;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

/**
 * Helper functions
 */
function calculateDelay(attempt: number, config: Required<RetryOptions>): number {
  let delay: number;

  if (config.backoff === 'exponential') {
    delay = config.delay * Math.pow(2, attempt - 1);
  } else {
    delay = config.delay * attempt;
  }

  if (config.jitter) {
    // Add random jitter (±25%)
    const jitter = delay * 0.25 * (Math.random() * 2 - 1);
    delay += jitter;
  }

  return Math.round(delay);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create resilient function with multiple strategies
 */
export function createResilientFunction<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options?: {
    retry?: RetryOptions;
    circuitBreaker?: CircuitBreakerOptions;
    timeout?: number;
    fallback?: (...args: Parameters<T>) => ReturnType<T>;
  }
): T {
  const circuitBreaker = options?.circuitBreaker 
    ? new CircuitBreaker(options.circuitBreaker)
    : null;

  return (async (...args: Parameters<T>) => {
    let operation = () => fn(...args);

    // Wrap with timeout if specified
    if (options?.timeout) {
      const originalOperation = operation;
      operation = () => withTimeout(originalOperation(), options.timeout!);
    }

    // Wrap with circuit breaker if specified
    if (circuitBreaker) {
      const originalOperation = operation;
      operation = () => circuitBreaker.execute(originalOperation);
    }

    // Wrap with retry if specified
    if (options?.retry) {
      const result = await retryWithBackoff(operation, options.retry);
      
      if (result.success) {
        return result.data;
      }
      
      // Try fallback if available
      if (options?.fallback) {
        return options.fallback(...args);
      }
      
      throw result.error;
    }

    // Execute with fallback if specified
    if (options?.fallback) {
      return withFallback(operation, () => options.fallback!(...args));
    }

    return operation();
  }) as T;
}