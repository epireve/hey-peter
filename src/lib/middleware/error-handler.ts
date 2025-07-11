import { NextRequest, NextResponse } from 'next/server';
import { loggingService, LogCategory } from '../services/logging-service';
import { errorTrackingService } from '../services/error-tracking-service';

export interface APIError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
  isOperational?: boolean;
}

export interface ErrorContext {
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

class ServerErrorHandler {
  // Create custom error classes
  static createAPIError(
    message: string,
    statusCode: number = 500,
    code?: string,
    details?: any,
    isOperational: boolean = true
  ): APIError {
    const error = new Error(message) as APIError;
    error.statusCode = statusCode;
    error.code = code;
    error.details = details;
    error.isOperational = isOperational;
    return error;
  }

  // Generate unique request ID
  static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Extract error context from request
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
      headers
    };
  }

  // Handle different types of errors
  static handleError(error: Error | APIError, context: ErrorContext): NextResponse {
    const apiError = error as APIError;
    const statusCode = apiError.statusCode || 500;
    const isOperational = apiError.isOperational !== false;

    // Log error with appropriate level
    const logLevel = statusCode >= 500 ? 'error' : 'warn';
    const logCategory = this.getLogCategory(context.url);

    // Create error details for logging
    const errorDetails = {
      requestId: context.requestId,
      statusCode,
      code: apiError.code,
      method: context.method,
      url: context.url,
      userAgent: context.userAgent,
      ip: context.ip,
      isOperational,
      details: apiError.details
    };

    // Log to logging service
    loggingService.error(
      logCategory,
      error.message,
      errorDetails,
      error
    );

    // Track error for analysis
    errorTrackingService.captureException(error, {
      tags: ['api', 'server'],
      extra: errorDetails,
      requestId: context.requestId,
      url: context.url
    });

    // Create response based on environment and error type
    const isDevelopment = process.env.NODE_ENV === 'development';
    const responseBody = this.createErrorResponse(error, context, isDevelopment);

    return NextResponse.json(responseBody, { 
      status: statusCode,
      headers: {
        'X-Request-ID': context.requestId,
        'Content-Type': 'application/json'
      }
    });
  }

  private static getLogCategory(url: string): LogCategory {
    if (url.includes('/api/auth')) return LogCategory.AUTHENTICATION;
    if (url.includes('/api/analytics')) return LogCategory.ANALYTICS;
    if (url.includes('/api/scheduling')) return LogCategory.SCHEDULING;
    if (url.includes('/api/hours')) return LogCategory.HOURS;
    return LogCategory.API;
  }

  private static createErrorResponse(error: Error | APIError, context: ErrorContext, includeStack: boolean) {
    const apiError = error as APIError;
    const statusCode = apiError.statusCode || 500;

    const baseResponse = {
      error: {
        message: error.message,
        code: apiError.code || 'INTERNAL_ERROR',
        statusCode,
        requestId: context.requestId,
        timestamp: context.timestamp
      }
    };

    // Add additional details in development
    if (includeStack) {
      (baseResponse.error as any).stack = error.stack;
      (baseResponse.error as any).details = apiError.details;
    }

    return baseResponse;
  }

  // Middleware wrapper for API routes
  static withErrorHandler(handler: (req: NextRequest, context: any) => Promise<NextResponse>) {
    return async (req: NextRequest, context: any): Promise<NextResponse> => {
      const requestId = this.generateRequestId();
      const errorContext = this.extractErrorContext(req, requestId);

      try {
        // Log incoming request
        loggingService.logAPICall(
          req.method,
          req.url,
          undefined,
          undefined,
          { requestId }
        );

        // Add request ID to context for handler to use
        const enhancedContext = { ...context, requestId };

        const startTime = Date.now();
        const response = await handler(req, enhancedContext);
        const duration = Date.now() - startTime;

        // Log successful response
        loggingService.logAPICall(
          req.method,
          req.url,
          response.status,
          duration,
          { requestId }
        );

        // Add request ID to response headers
        response.headers.set('X-Request-ID', requestId);

        return response;
      } catch (error) {
        // Handle any errors that occur in the handler
        return this.handleError(error as Error, errorContext);
      }
    };
  }

  // Database error handler
  static handleDatabaseError(error: any, operation: string, context?: Record<string, any>): APIError {
    let message = 'Database operation failed';
    let statusCode = 500;
    let code = 'DATABASE_ERROR';

    // Handle specific database errors
    if (error.code) {
      switch (error.code) {
        case '23505': // Unique violation
          message = 'Record already exists';
          statusCode = 409;
          code = 'DUPLICATE_RECORD';
          break;
        case '23503': // Foreign key violation
          message = 'Referenced record not found';
          statusCode = 400;
          code = 'INVALID_REFERENCE';
          break;
        case '23502': // Not null violation
          message = 'Required field is missing';
          statusCode = 400;
          code = 'MISSING_REQUIRED_FIELD';
          break;
        case '42P01': // Undefined table
          message = 'Database table not found';
          statusCode = 500;
          code = 'TABLE_NOT_FOUND';
          break;
        default:
          message = `Database error: ${error.message}`;
      }
    }

    // Log database error
    loggingService.logDatabaseQuery(
      operation,
      undefined,
      error,
      context
    );

    return this.createAPIError(message, statusCode, code, { operation, originalError: error.message });
  }

  // Validation error handler
  static handleValidationError(errors: any[], context?: Record<string, any>): APIError {
    const message = 'Request validation failed';
    const details = {
      validationErrors: errors,
      ...context
    };

    loggingService.warn(
      LogCategory.API,
      'Request validation failed',
      details
    );

    return this.createAPIError(message, 400, 'VALIDATION_ERROR', details);
  }

  // Authentication error handler
  static handleAuthError(message: string = 'Authentication required', context?: Record<string, any>): APIError {
    loggingService.warn(
      LogCategory.AUTHENTICATION,
      'Authentication failed',
      context
    );

    return this.createAPIError(message, 401, 'AUTHENTICATION_ERROR', context);
  }

  // Authorization error handler
  static handleAuthorizationError(message: string = 'Insufficient permissions', context?: Record<string, any>): APIError {
    loggingService.warn(
      LogCategory.SECURITY,
      'Authorization failed',
      context
    );

    return this.createAPIError(message, 403, 'AUTHORIZATION_ERROR', context);
  }

  // Rate limiting error handler
  static handleRateLimitError(limit: number, windowMs: number, context?: Record<string, any>): APIError {
    const message = `Rate limit exceeded: ${limit} requests per ${windowMs}ms`;
    
    loggingService.warn(
      LogCategory.SECURITY,
      'Rate limit exceeded',
      { limit, windowMs, ...context }
    );

    return this.createAPIError(message, 429, 'RATE_LIMIT_EXCEEDED', { limit, windowMs });
  }
}

// Export error classes and handler
export { ServerErrorHandler };

// Common error creators
export const createValidationError = (errors: any[], context?: Record<string, any>) =>
  ServerErrorHandler.handleValidationError(errors, context);

export const createAuthError = (message?: string, context?: Record<string, any>) =>
  ServerErrorHandler.handleAuthError(message, context);

export const createAuthorizationError = (message?: string, context?: Record<string, any>) =>
  ServerErrorHandler.handleAuthorizationError(message, context);

export const createDatabaseError = (error: any, operation: string, context?: Record<string, any>) =>
  ServerErrorHandler.handleDatabaseError(error, operation, context);

export const createRateLimitError = (limit: number, windowMs: number, context?: Record<string, any>) =>
  ServerErrorHandler.handleRateLimitError(limit, windowMs, context);

export const createAPIError = (message: string, statusCode?: number, code?: string, details?: any) =>
  ServerErrorHandler.createAPIError(message, statusCode, code, details);

// Middleware function for easy use
export const withErrorHandler = ServerErrorHandler.withErrorHandler;

export default ServerErrorHandler;