/**
 * Enhanced Error Handler Middleware
 * Integrates with the centralized error handling system
 */

import { NextRequest, NextResponse } from 'next/server';
import { loggingService, LogCategory } from '../services/logging-service';
import { errorTrackingService } from '../services/error-tracking-service';
import { 
  AppError, 
  isAppError, 
  createError, 
  errorUtils,
  errorResponse,
  type ErrorContext as BaseErrorContext
} from '../errors';

export interface ErrorContext extends BaseErrorContext {
  requestId: string;
  userId?: string;
  method: string;
  url: string;
  userAgent?: string;
  ip?: string;
  timestamp: string;
  headers?: Record<string, string>;
  body?: any;
  query?: any;
}

export interface MiddlewareOptions {
  enableLogging?: boolean;
  enableTracking?: boolean;
  includeStackInResponse?: boolean;
  logSuccessfulRequests?: boolean;
  trackPerformanceMetrics?: boolean;
}

class EnhancedServerErrorHandler {
  private static defaultOptions: Required<MiddlewareOptions> = {
    enableLogging: true,
    enableTracking: true,
    includeStackInResponse: process.env.NODE_ENV === 'development',
    logSuccessfulRequests: true,
    trackPerformanceMetrics: true
  };

  /**
   * Generate unique request ID
   */
  static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extract error context from request
   */
  static extractErrorContext(request: NextRequest, requestId: string): ErrorContext {
    const url = request.url;
    const method = request.method;
    const userAgent = request.headers.get('user-agent') || undefined;
    const ip = request.headers.get('x-forwarded-for') || 
              request.headers.get('x-real-ip') || 
              'unknown';

    // Extract headers (filter sensitive ones)
    const headers: Record<string, string> = {};
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    
    request.headers.forEach((value, key) => {
      if (!sensitiveHeaders.includes(key.toLowerCase())) {
        headers[key] = value;
      } else {
        headers[key] = '[REDACTED]';
      }
    });

    return {
      requestId,
      method,
      url,
      userAgent,
      ip,
      timestamp: new Date().toISOString(),
      headers,
      environment: process.env.NODE_ENV || 'development'
    };
  }

  /**
   * Handle different types of errors using centralized error system
   */
  static handleError(
    error: Error | AppError, 
    context: ErrorContext, 
    options: MiddlewareOptions = {}
  ): NextResponse {
    const opts = { ...this.defaultOptions, ...options };
    
    // Convert to AppError if needed
    const appError = isAppError(error) ? error : this.normalizeError(error, context);

    // Log error using centralized utilities
    if (opts.enableLogging) {
      errorUtils.log(appError, context, context.requestId);
    }

    // Track error for analysis
    if (opts.enableTracking) {
      errorTrackingService.captureException(appError, {
        tags: ['api', 'server', 'middleware'],
        extra: {
          requestId: context.requestId,
          method: context.method,
          url: context.url,
          userAgent: context.userAgent,
          ip: context.ip
        },
        requestId: context.requestId,
        url: context.url
      });
    }

    // Create error response using centralized system
    return errorResponse(appError, {
      requestId: context.requestId,
      includeStack: opts.includeStackInResponse,
      headers: {
        'X-Request-ID': context.requestId,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Normalize error to AppError
   */
  private static normalizeError(error: Error, context: ErrorContext): AppError {
    // Check for common error patterns
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return createError.network(error.message, { originalError: error });
    }

    if (message.includes('timeout')) {
      return createError.timeout(error.message, { originalError: error });
    }

    if (message.includes('unauthorized') || message.includes('401')) {
      return createError.auth(error.message, { originalError: error });
    }

    if (message.includes('forbidden') || message.includes('403')) {
      return createError.authorization(error.message, { originalError: error });
    }

    if (message.includes('not found') || message.includes('404')) {
      return createError.notFound('Resource', { originalError: error });
    }

    if (message.includes('validation')) {
      return createError.validation(error.message, {}, { originalError: error });
    }

    // Default to internal error
    return createError.api(error.message, 500, { originalError: error });
  }

  /**
   * Enhanced middleware wrapper for API routes
   */
  static withErrorHandler(
    handler: (req: NextRequest, context: any) => Promise<NextResponse>,
    options: MiddlewareOptions = {}
  ) {
    return async (req: NextRequest, context: any): Promise<NextResponse> => {
      const opts = { ...this.defaultOptions, ...options };
      const requestId = this.generateRequestId();
      const errorContext = this.extractErrorContext(req, requestId);

      try {
        // Log incoming request
        if (opts.logSuccessfulRequests) {
          loggingService.logAPICall(
            req.method,
            req.url,
            undefined,
            undefined,
            { requestId }
          );
        }

        // Add request ID to context for handler to use
        const enhancedContext = { ...context, requestId };

        const startTime = Date.now();
        const response = await handler(req, enhancedContext);
        const duration = Date.now() - startTime;

        // Log successful response
        if (opts.logSuccessfulRequests) {
          loggingService.logAPICall(
            req.method,
            req.url,
            response.status,
            duration,
            { requestId }
          );
        }

        // Track performance metrics
        if (opts.trackPerformanceMetrics) {
          errorTrackingService.capturePerformanceIssue(
            'api_response_time',
            duration,
            1000, // 1 second threshold
            {
              method: req.method,
              url: req.url,
              statusCode: response.status,
              requestId
            }
          );
        }

        // Add request ID to response headers
        response.headers.set('X-Request-ID', requestId);

        return response;
      } catch (error) {
        // Handle any errors that occur in the handler
        return this.handleError(error as Error, errorContext, opts);
      }
    };
  }

  /**
   * Database error handler using centralized system
   */
  static handleDatabaseError(
    error: any, 
    operation: string, 
    context?: Record<string, any>
  ): AppError {
    const databaseError = errorUtils.parseDatabaseError(error);
    
    // Log database error
    loggingService.logDatabaseQuery(
      operation,
      undefined,
      error,
      context
    );

    return databaseError;
  }

  /**
   * Validation error handler using centralized system
   */
  static handleValidationError(
    errors: Record<string, string[]>, 
    context?: Record<string, any>
  ): AppError {
    const validationError = createError.validation(
      'Request validation failed',
      errors,
      context
    );

    loggingService.warn(
      LogCategory.API,
      'Request validation failed',
      { validationErrors: errors, ...context }
    );

    return validationError;
  }

  /**
   * Authentication error handler using centralized system
   */
  static handleAuthError(
    message: string = 'Authentication required', 
    context?: Record<string, any>
  ): AppError {
    const authError = createError.auth(message, context);

    loggingService.warn(
      LogCategory.AUTHENTICATION,
      'Authentication failed',
      context
    );

    return authError;
  }

  /**
   * Authorization error handler using centralized system
   */
  static handleAuthorizationError(
    message: string = 'Insufficient permissions', 
    context?: Record<string, any>
  ): AppError {
    const authzError = createError.authorization(message, context);

    loggingService.warn(
      LogCategory.SECURITY,
      'Authorization failed',
      context
    );

    return authzError;
  }

  /**
   * Rate limiting error handler using centralized system
   */
  static handleRateLimitError(
    limit: number, 
    windowMs: number, 
    context?: Record<string, any>
  ): AppError {
    const rateLimitError = createError.rateLimit(
      `Rate limit exceeded: ${limit} requests per ${windowMs}ms`,
      Math.ceil(windowMs / 1000),
      { limit, windowMs, ...context }
    );
    
    loggingService.warn(
      LogCategory.SECURITY,
      'Rate limit exceeded',
      { limit, windowMs, ...context }
    );

    return rateLimitError;
  }

  /**
   * Business rule error handler
   */
  static handleBusinessRuleError(
    message: string,
    context?: Record<string, any>
  ): AppError {
    const businessError = createError.businessRule(message, context);

    loggingService.warn(
      LogCategory.API,
      'Business rule violation',
      { message, ...context }
    );

    return businessError;
  }

  /**
   * Get log category based on URL
   */
  private static getLogCategory(url: string): LogCategory {
    if (url.includes('/api/auth')) return LogCategory.AUTHENTICATION;
    if (url.includes('/api/analytics')) return LogCategory.ANALYTICS;
    if (url.includes('/api/scheduling')) return LogCategory.SCHEDULING;
    if (url.includes('/api/hours')) return LogCategory.HOURS;
    if (url.includes('/api/students')) return LogCategory.SYSTEM;
    if (url.includes('/api/teachers')) return LogCategory.SYSTEM;
    return LogCategory.API;
  }
}

// Export enhanced error handler
export { EnhancedServerErrorHandler };

// Common error creators using centralized system
export const createValidationError = (
  errors: Record<string, string[]>, 
  context?: Record<string, any>
) => EnhancedServerErrorHandler.handleValidationError(errors, context);

export const createAuthError = (
  message?: string, 
  context?: Record<string, any>
) => EnhancedServerErrorHandler.handleAuthError(message, context);

export const createAuthorizationError = (
  message?: string, 
  context?: Record<string, any>
) => EnhancedServerErrorHandler.handleAuthorizationError(message, context);

export const createDatabaseError = (
  error: any, 
  operation: string, 
  context?: Record<string, any>
) => EnhancedServerErrorHandler.handleDatabaseError(error, operation, context);

export const createRateLimitError = (
  limit: number, 
  windowMs: number, 
  context?: Record<string, any>
) => EnhancedServerErrorHandler.handleRateLimitError(limit, windowMs, context);

export const createBusinessRuleError = (
  message: string,
  context?: Record<string, any>
) => EnhancedServerErrorHandler.handleBusinessRuleError(message, context);

// Enhanced middleware function for easy use
export const withErrorHandler = EnhancedServerErrorHandler.withErrorHandler;

export default EnhancedServerErrorHandler;