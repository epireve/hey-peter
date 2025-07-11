/**
 * Error Handling Utilities
 * Provides helper functions for error serialization, logging, and handling
 */

import { 
  AppError, 
  ErrorCode, 
  ErrorSeverity, 
  isAppError,
  createError 
} from './app-error';
import { loggingService, LogCategory } from '../services/logging-service';
import { errorTrackingService } from '../services/error-tracking-service';

/**
 * Error serialization for API responses
 */
export interface SerializedError {
  message: string;
  code: string;
  statusCode: number;
  timestamp: string;
  requestId?: string;
  details?: any;
  stack?: string;
}

/**
 * Serialize error for API response
 */
export function serializeError(
  error: Error | AppError,
  requestId?: string,
  includeStack: boolean = process.env.NODE_ENV === 'development'
): SerializedError {
  if (isAppError(error)) {
    return {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      timestamp: error.timestamp,
      requestId,
      details: error.details,
      ...(includeStack && { stack: error.stack })
    };
  }

  // Handle standard errors
  return {
    message: error.message || 'An unexpected error occurred',
    code: ErrorCode.INTERNAL_ERROR,
    statusCode: 500,
    timestamp: new Date().toISOString(),
    requestId,
    ...(includeStack && { stack: error.stack })
  };
}

/**
 * Log error with appropriate context
 */
export function logError(
  error: Error | AppError,
  context?: Record<string, any>,
  requestId?: string
): void {
  const isOperational = isAppError(error) ? error.isOperational : false;
  const severity = isAppError(error) ? error.severity : ErrorSeverity.HIGH;
  const category = determineLogCategory(error, context);

  const errorDetails = {
    code: isAppError(error) ? error.code : ErrorCode.INTERNAL_ERROR,
    statusCode: isAppError(error) ? error.statusCode : 500,
    isOperational,
    severity,
    requestId,
    ...context
  };

  // Log to logging service
  if (severity === ErrorSeverity.CRITICAL || !isOperational) {
    loggingService.fatal(category, error.message, errorDetails, error);
  } else if (severity === ErrorSeverity.HIGH) {
    loggingService.error(category, error.message, errorDetails, error);
  } else if (severity === ErrorSeverity.MEDIUM) {
    loggingService.warn(category, error.message, errorDetails);
  } else {
    loggingService.info(category, error.message, errorDetails);
  }

  // Track in error tracking service for non-operational errors
  if (!isOperational || severity >= ErrorSeverity.HIGH) {
    errorTrackingService.captureException(error, {
      tags: [category, severity],
      requestId,
      extra: errorDetails
    });
  }
}

/**
 * Determine log category based on error type and context
 */
function determineLogCategory(error: Error | AppError, context?: Record<string, any>): LogCategory {
  if (context?.category) return context.category;
  
  if (isAppError(error)) {
    switch (error.code) {
      case ErrorCode.UNAUTHORIZED:
      case ErrorCode.INVALID_CREDENTIALS:
      case ErrorCode.SESSION_EXPIRED:
        return LogCategory.AUTHENTICATION;
      
      case ErrorCode.INSUFFICIENT_PERMISSIONS:
        return LogCategory.SECURITY;
      
      case ErrorCode.DATABASE_ERROR:
      case ErrorCode.DUPLICATE_RECORD:
      case ErrorCode.RECORD_NOT_FOUND:
        return LogCategory.DATABASE;
      
      case ErrorCode.API_ERROR:
      case ErrorCode.NETWORK_ERROR:
      case ErrorCode.TIMEOUT_ERROR:
        return LogCategory.API;
      
      case ErrorCode.SCHEDULING_CONFLICT:
        return LogCategory.SCHEDULING;
      
      case ErrorCode.INSUFFICIENT_HOURS:
        return LogCategory.HOURS;
      
      default:
        return LogCategory.SYSTEM;
    }
  }
  
  return LogCategory.SYSTEM;
}

/**
 * Wrap async function with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options?: {
    defaultError?: AppError;
    logContext?: Record<string, any>;
    rethrow?: boolean;
  }
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      logError(error as Error, options?.logContext);
      
      if (options?.rethrow !== false) {
        throw options?.defaultError || error;
      }
      
      return undefined;
    }
  }) as T;
}

/**
 * Parse database errors and convert to app errors
 */
export function parseDatabaseError(error: any): AppError {
  if (!error.code) {
    return createError.database(error.message, error);
  }

  switch (error.code) {
    case '23505': // Unique violation
      const field = error.detail?.match(/Key \(([^)]+)\)/)?.[1];
      return createError.duplicate('Record', field);
    
    case '23503': // Foreign key violation
      return createError.database('Referenced record not found', error);
    
    case '23502': // Not null violation
      const column = error.column;
      return createError.validation(
        'Required field is missing',
        { [column]: ['This field is required'] }
      );
    
    case '42P01': // Undefined table
      return createError.configuration('Database table not found', { table: error.table });
    
    case 'ECONNREFUSED':
      return createError.serviceUnavailable('Database connection failed');
    
    default:
      return createError.database(error.message || 'Database operation failed', error);
  }
}

/**
 * Parse API/fetch errors and convert to app errors
 */
export function parseAPIError(error: any, url?: string): AppError {
  // Network errors
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return createError.network('Network request failed', { url });
  }

  // Timeout errors
  if (error.name === 'AbortError' || error.message.includes('timeout')) {
    return createError.timeout('Request timed out', { url });
  }

  // Response errors
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;

    if (status === 401) {
      return createError.auth(data?.message || 'Authentication required');
    }

    if (status === 403) {
      return createError.authorization(data?.message || 'Access denied');
    }

    if (status === 404) {
      return createError.notFound('Resource', url);
    }

    if (status === 429) {
      const retryAfter = error.response.headers?.['retry-after'];
      return createError.rateLimit(
        data?.message || 'Too many requests',
        retryAfter ? parseInt(retryAfter) : undefined
      );
    }

    if (status >= 500) {
      return createError.serviceUnavailable(
        data?.message || 'Server error',
        undefined,
        { status, url }
      );
    }

    return createError.api(
      data?.message || error.message || 'Request failed',
      status,
      { url, response: data }
    );
  }

  return createError.api(error.message || 'Request failed', 500, { url });
}

/**
 * Create user-friendly error messages
 */
export function getUserFriendlyMessage(error: Error | AppError): string {
  if (!isAppError(error)) {
    return 'An unexpected error occurred. Please try again later.';
  }

  // Map error codes to user-friendly messages
  const friendlyMessages: Partial<Record<ErrorCode, string>> = {
    [ErrorCode.UNAUTHORIZED]: 'Please sign in to continue.',
    [ErrorCode.INVALID_CREDENTIALS]: 'Invalid email or password.',
    [ErrorCode.SESSION_EXPIRED]: 'Your session has expired. Please sign in again.',
    [ErrorCode.INSUFFICIENT_PERMISSIONS]: 'You don\'t have permission to perform this action.',
    [ErrorCode.VALIDATION_ERROR]: 'Please check your input and try again.',
    [ErrorCode.NETWORK_ERROR]: 'Connection failed. Please check your internet connection.',
    [ErrorCode.TIMEOUT_ERROR]: 'The request took too long. Please try again.',
    [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please wait a moment and try again.',
    [ErrorCode.DUPLICATE_RECORD]: 'This item already exists.',
    [ErrorCode.RECORD_NOT_FOUND]: 'The requested item could not be found.',
    [ErrorCode.INSUFFICIENT_HOURS]: 'You don\'t have enough hours for this booking.',
    [ErrorCode.SCHEDULING_CONFLICT]: 'This time slot is not available.',
    [ErrorCode.SERVICE_UNAVAILABLE]: 'Service is temporarily unavailable. Please try again later.',
  };

  return friendlyMessages[error.code] || error.message || 'An error occurred. Please try again.';
}

/**
 * Error recovery strategies
 */
export interface RecoveryStrategy {
  canRecover: boolean;
  action?: () => void | Promise<void>;
  message?: string;
  delay?: number;
}

export function getRecoveryStrategy(error: Error | AppError): RecoveryStrategy {
  if (!isAppError(error)) {
    return { canRecover: false };
  }

  switch (error.code) {
    case ErrorCode.SESSION_EXPIRED:
      return {
        canRecover: true,
        action: () => window.location.href = '/auth/signin',
        message: 'Redirecting to sign in...'
      };

    case ErrorCode.NETWORK_ERROR:
      return {
        canRecover: true,
        action: () => window.location.reload(),
        message: 'Retrying connection...',
        delay: 3000
      };

    case ErrorCode.RATE_LIMIT_EXCEEDED:
      const retryAfter = (error as any).retryAfter;
      return {
        canRecover: true,
        message: `Please wait ${retryAfter || 60} seconds before trying again.`,
        delay: (retryAfter || 60) * 1000
      };

    case ErrorCode.SERVICE_UNAVAILABLE:
      return {
        canRecover: true,
        action: () => window.location.reload(),
        message: 'Service will be available shortly...',
        delay: 5000
      };

    default:
      return { canRecover: false };
  }
}

/**
 * Batch error handling for multiple operations
 */
export interface BatchErrorResult<T> {
  successful: T[];
  failed: Array<{ item: any; error: AppError }>;
  hasErrors: boolean;
}

export async function handleBatchOperation<T, R>(
  items: T[],
  operation: (item: T) => Promise<R>,
  options?: {
    continueOnError?: boolean;
    maxConcurrent?: number;
  }
): Promise<BatchErrorResult<R>> {
  const results: BatchErrorResult<R> = {
    successful: [],
    failed: [],
    hasErrors: false
  };

  const maxConcurrent = options?.maxConcurrent || 5;
  const continueOnError = options?.continueOnError !== false;

  // Process in batches
  for (let i = 0; i < items.length; i += maxConcurrent) {
    const batch = items.slice(i, i + maxConcurrent);
    const promises = batch.map(async (item, index) => {
      try {
        const result = await operation(item);
        results.successful.push(result);
      } catch (error) {
        results.hasErrors = true;
        results.failed.push({
          item,
          error: isAppError(error) ? error as AppError : createError.api(
            (error as Error).message
          )
        });

        if (!continueOnError) {
          throw error;
        }
      }
    });

    await Promise.all(promises);
  }

  return results;
}

/**
 * Create error context for tracking
 */
export function createErrorContext(req?: {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  ip?: string;
}): Record<string, any> {
  const context: Record<string, any> = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  };

  if (req) {
    context.method = req.method;
    context.url = req.url;
    context.ip = req.ip;
    
    // Filter sensitive headers
    if (req.headers) {
      const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
      context.headers = Object.entries(req.headers).reduce((acc, [key, value]) => {
        acc[key] = sensitiveHeaders.includes(key.toLowerCase()) ? '[REDACTED]' : value;
        return acc;
      }, {} as Record<string, string>);
    }
  }

  if (typeof window !== 'undefined') {
    context.userAgent = navigator.userAgent;
    context.url = window.location.href;
  }

  return context;
}

/**
 * Export all utilities
 */
export const errorUtils = {
  serialize: serializeError,
  log: logError,
  withErrorHandling,
  parseDatabaseError,
  parseAPIError,
  getUserFriendlyMessage,
  getRecoveryStrategy,
  handleBatchOperation,
  createErrorContext
};