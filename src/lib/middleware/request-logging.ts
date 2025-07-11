import { NextRequest, NextResponse } from 'next/server';
import { loggingService, LogCategory } from '../services/logging-service';

export interface RequestLogData {
  requestId: string;
  method: string;
  url: string;
  userAgent?: string;
  ip: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  statusCode?: number;
  responseSize?: number;
  userId?: string;
  sessionId?: string;
  referer?: string;
  query?: Record<string, string | string[]>;
  headers?: Record<string, string>;
}

class RequestLoggingMiddleware {
  private static readonly SENSITIVE_HEADERS = [
    'authorization',
    'cookie',
    'x-api-key',
    'x-auth-token'
  ];

  private static readonly SENSITIVE_QUERY_PARAMS = [
    'password',
    'token',
    'api_key',
    'auth_token'
  ];

  static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static extractClientIP(request: NextRequest): string {
    return (
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-client-ip') ||
      'unknown'
    );
  }

  static sanitizeHeaders(headers: Headers): Record<string, string> {
    const sanitized: Record<string, string> = {};
    
    headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (this.SENSITIVE_HEADERS.includes(lowerKey)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    });

    return sanitized;
  }

  static sanitizeQuery(searchParams: URLSearchParams): Record<string, string | string[]> {
    const sanitized: Record<string, string | string[]> = {};
    
    searchParams.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (this.SENSITIVE_QUERY_PARAMS.includes(lowerKey)) {
        sanitized[key] = '[REDACTED]';
      } else {
        const existing = sanitized[key];
        if (existing) {
          if (Array.isArray(existing)) {
            existing.push(value);
          } else {
            sanitized[key] = [existing, value];
          }
        } else {
          sanitized[key] = value;
        }
      }
    });

    return sanitized;
  }

  static extractUserContext(request: NextRequest): { userId?: string; sessionId?: string } {
    const userId = request.headers.get('x-user-id') || undefined;
    const sessionId = request.headers.get('x-session-id') || undefined;
    
    // Try to extract from authorization header if available
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // This is a simplified example - in practice you'd decode the JWT
      // For now, we'll just use a hash of the token as session ID
      const token = authHeader.substring(7);
      const sessionFromToken = token.substring(0, 8);
      return { userId, sessionId: sessionId || sessionFromToken };
    }

    return { userId, sessionId };
  }

  static createRequestLogData(request: NextRequest, requestId: string): RequestLogData {
    const url = new URL(request.url);
    const { userId, sessionId } = this.extractUserContext(request);

    return {
      requestId,
      method: request.method,
      url: request.url,
      userAgent: request.headers.get('user-agent') || undefined,
      ip: this.extractClientIP(request),
      startTime: Date.now(),
      userId,
      sessionId,
      referer: request.headers.get('referer') || undefined,
      query: this.sanitizeQuery(url.searchParams),
      headers: this.sanitizeHeaders(request.headers)
    };
  }

  static logRequest(logData: RequestLogData): void {
    const { requestId, method, url, ip, userId, userAgent } = logData;

    loggingService.info(
      LogCategory.API,
      `${method} ${url}`,
      {
        requestId,
        ip,
        userId,
        userAgent,
        type: 'request_start'
      }
    );

    // Log user action for tracking
    if (userId) {
      loggingService.logUserAction(
        `API request: ${method} ${url}`,
        {
          requestId,
          ip,
          userAgent
        }
      );
    }
  }

  static logResponse(logData: RequestLogData, response: NextResponse): void {
    const endTime = Date.now();
    const duration = endTime - logData.startTime;
    const statusCode = response.status;
    
    // Get response size if available
    const contentLength = response.headers.get('content-length');
    const responseSize = contentLength ? parseInt(contentLength, 10) : undefined;

    const updatedLogData = {
      ...logData,
      endTime,
      duration,
      statusCode,
      responseSize
    };

    // Determine log level based on status code
    const logLevel = statusCode >= 500 ? 'error' : 
                    statusCode >= 400 ? 'warn' : 'info';

    const logMessage = `${logData.method} ${logData.url} - ${statusCode} (${duration}ms)`;

    // Log using appropriate level
    if (logLevel === 'error') {
      loggingService.error(
        LogCategory.API,
        logMessage,
        updatedLogData
      );
    } else if (logLevel === 'warn') {
      loggingService.warn(
        LogCategory.API,
        logMessage,
        updatedLogData
      );
    } else {
      loggingService.info(
        LogCategory.API,
        logMessage,
        {
          ...updatedLogData,
          type: 'request_complete'
        }
      );
    }

    // Log performance metrics for slow requests
    if (duration > 1000) { // More than 1 second
      loggingService.logPerformanceMetric(
        'api_response_time',
        duration,
        'ms',
        {
          requestId: logData.requestId,
          method: logData.method,
          url: logData.url,
          statusCode
        }
      );
    }
  }

  static logError(logData: RequestLogData, error: Error): void {
    const endTime = Date.now();
    const duration = endTime - logData.startTime;

    loggingService.error(
      LogCategory.API,
      `${logData.method} ${logData.url} - ERROR (${duration}ms): ${error.message}`,
      {
        ...logData,
        endTime,
        duration,
        error: error.message,
        type: 'request_error'
      },
      error
    );
  }

  // Middleware wrapper that adds request logging
  static withRequestLogging<T>(
    handler: (req: NextRequest, context: T & { requestId: string; logData: RequestLogData }) => Promise<NextResponse>
  ) {
    return async (req: NextRequest, context: T): Promise<NextResponse> => {
      const requestId = this.generateRequestId();
      const logData = this.createRequestLogData(req, requestId);

      // Log the incoming request
      this.logRequest(logData);

      try {
        // Execute the handler with enhanced context
        const enhancedContext = { 
          ...context, 
          requestId, 
          logData 
        };
        
        const response = await handler(req, enhancedContext);

        // Add request ID to response headers
        response.headers.set('X-Request-ID', requestId);

        // Log the response
        this.logResponse(logData, response);

        return response;
      } catch (error) {
        // Log the error
        this.logError(logData, error as Error);
        throw error; // Re-throw to be handled by error middleware
      }
    };
  }

  // Method to create request context for use in handlers
  static createRequestContext(request: NextRequest, requestId?: string) {
    const id = requestId || this.generateRequestId();
    const logData = this.createRequestLogData(request, id);
    
    return {
      requestId: id,
      logData,
      ip: logData.ip,
      userAgent: logData.userAgent,
      userId: logData.userId,
      sessionId: logData.sessionId
    };
  }
}

// Helper function for easy use
export const withRequestLogging = RequestLoggingMiddleware.withRequestLogging;

// Helper to create request context
export const createRequestContext = RequestLoggingMiddleware.createRequestContext;

export { RequestLoggingMiddleware };
export default RequestLoggingMiddleware;