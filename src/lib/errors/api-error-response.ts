/**
 * Type-safe API Error Responses
 * Provides consistent error response formatting for API routes
 */

import { NextResponse } from 'next/server';
import { AppError, isAppError, ErrorCode } from './app-error';
import { errorUtils, SerializedError } from './error-utils';

/**
 * API Response wrapper types
 */
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: SerializedError;
  meta?: {
    requestId: string;
    timestamp: string;
    version?: string;
  };
}

/**
 * Paginated response type
 */
export interface PaginatedAPIResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

/**
 * Create success response
 */
export function successResponse<T>(
  data: T,
  options?: {
    status?: number;
    headers?: Record<string, string>;
    meta?: Record<string, any>;
  }
): NextResponse<APIResponse<T>> {
  const response: APIResponse<T> = {
    success: true,
    data,
    meta: {
      requestId: generateRequestId(),
      timestamp: new Date().toISOString(),
      ...options?.meta
    }
  };

  return NextResponse.json(response, {
    status: options?.status || 200,
    headers: options?.headers
  });
}

/**
 * Create paginated success response
 */
export function paginatedResponse<T>(
  data: T[],
  pagination: PaginatedAPIResponse<T>['pagination'],
  options?: {
    headers?: Record<string, string>;
    meta?: Record<string, any>;
  }
): NextResponse<PaginatedAPIResponse<T>> {
  const response: PaginatedAPIResponse<T> = {
    success: true,
    data,
    pagination,
    meta: {
      requestId: generateRequestId(),
      timestamp: new Date().toISOString(),
      ...options?.meta
    }
  };

  return NextResponse.json(response, {
    status: 200,
    headers: options?.headers
  });
}

/**
 * Create error response
 */
export function errorResponse(
  error: Error | AppError,
  options?: {
    requestId?: string;
    headers?: Record<string, string>;
    includeStack?: boolean;
  }
): NextResponse<APIResponse> {
  const requestId = options?.requestId || generateRequestId();
  const serializedError = errorUtils.serialize(
    error,
    requestId,
    options?.includeStack
  );

  const response: APIResponse = {
    success: false,
    error: serializedError,
    meta: {
      requestId,
      timestamp: new Date().toISOString()
    }
  };

  // Log error
  errorUtils.log(error, { requestId, source: 'api-response' });

  return NextResponse.json(response, {
    status: serializedError.statusCode,
    headers: {
      'X-Request-ID': requestId,
      ...options?.headers
    }
  });
}

/**
 * Standard error responses
 */
export const standardErrors = {
  badRequest: (message: string = 'Bad request', details?: any) =>
    errorResponse(new AppError(message, {
      code: ErrorCode.INVALID_INPUT,
      statusCode: 400,
      details
    })),

  unauthorized: (message: string = 'Authentication required') =>
    errorResponse(new AppError(message, {
      code: ErrorCode.UNAUTHORIZED,
      statusCode: 401
    })),

  forbidden: (message: string = 'Access denied') =>
    errorResponse(new AppError(message, {
      code: ErrorCode.INSUFFICIENT_PERMISSIONS,
      statusCode: 403
    })),

  notFound: (resource: string = 'Resource') =>
    errorResponse(new AppError(`${resource} not found`, {
      code: ErrorCode.RECORD_NOT_FOUND,
      statusCode: 404
    })),

  conflict: (message: string = 'Resource conflict', details?: any) =>
    errorResponse(new AppError(message, {
      code: ErrorCode.DUPLICATE_RECORD,
      statusCode: 409,
      details
    })),

  validation: (errors: Record<string, string[]>) =>
    errorResponse(new AppError('Validation failed', {
      code: ErrorCode.VALIDATION_ERROR,
      statusCode: 422,
      details: { validationErrors: errors }
    })),

  tooManyRequests: (retryAfter?: number) =>
    errorResponse(new AppError('Too many requests', {
      code: ErrorCode.RATE_LIMIT_EXCEEDED,
      statusCode: 429,
      details: { retryAfter }
    })),

  serverError: (message: string = 'Internal server error') =>
    errorResponse(new AppError(message, {
      code: ErrorCode.INTERNAL_ERROR,
      statusCode: 500
    })),

  serviceUnavailable: (message: string = 'Service unavailable', retryAfter?: number) =>
    errorResponse(new AppError(message, {
      code: ErrorCode.SERVICE_UNAVAILABLE,
      statusCode: 503,
      details: { retryAfter }
    }))
};

/**
 * Response helpers
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T,
  options?: {
    defaultError?: AppError;
    includeStack?: boolean;
  }
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof NextResponse) {
        return error;
      }
      
      return errorResponse(
        options?.defaultError || error as Error,
        {
          includeStack: options?.includeStack
        }
      );
    }
  }) as T;
}

/**
 * Validate request body with type safety
 */
export async function validateRequestBody<T>(
  request: Request,
  schema: {
    parse: (data: unknown) => T;
  }
): Promise<T> {
  try {
    const body = await request.json();
    return schema.parse(body);
  } catch (error: any) {
    // Handle Zod validation errors
    if (error.errors) {
      const validationErrors: Record<string, string[]> = {};
      
      error.errors.forEach((err: any) => {
        const path = err.path.join('.');
        if (!validationErrors[path]) {
          validationErrors[path] = [];
        }
        validationErrors[path].push(err.message);
      });
      
      throw new AppError('Invalid request body', {
        code: ErrorCode.VALIDATION_ERROR,
        statusCode: 422,
        details: { validationErrors }
      });
    }
    
    throw new AppError('Invalid request body', {
      code: ErrorCode.INVALID_INPUT,
      statusCode: 400,
      details: { error: error.message }
    });
  }
}

/**
 * Extract and validate query parameters
 */
export function validateQueryParams<T>(
  searchParams: URLSearchParams,
  schema: {
    parse: (data: unknown) => T;
  }
): T {
  try {
    const params = Object.fromEntries(searchParams.entries());
    return schema.parse(params);
  } catch (error: any) {
    throw new AppError('Invalid query parameters', {
      code: ErrorCode.VALIDATION_ERROR,
      statusCode: 400,
      details: { error: error.message }
    });
  }
}

/**
 * Generate request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create typed API route handler
 */
export function createAPIRoute<TBody = any, TQuery = any, TResponse = any>(
  config: {
    bodySchema?: { parse: (data: unknown) => TBody };
    querySchema?: { parse: (data: unknown) => TQuery };
    handler: (params: {
      body?: TBody;
      query?: TQuery;
      request: Request;
      params?: Record<string, string>;
    }) => Promise<TResponse>;
  }
) {
  return withErrorHandling(async (
    request: Request,
    context?: { params?: Record<string, string> }
  ): Promise<NextResponse<APIResponse<TResponse>>> => {
    const requestId = generateRequestId();
    
    try {
      // Validate body if schema provided
      const body = config.bodySchema 
        ? await validateRequestBody(request, config.bodySchema)
        : undefined;

      // Validate query if schema provided
      const url = new URL(request.url);
      const query = config.querySchema
        ? validateQueryParams(url.searchParams, config.querySchema)
        : undefined;

      // Execute handler
      const result = await config.handler({
        body,
        query,
        request,
        params: context?.params
      });

      return successResponse(result, {
        headers: { 'X-Request-ID': requestId }
      });
    } catch (error) {
      return errorResponse(error as Error, { requestId });
    }
  });
}

/**
 * Middleware for consistent error handling in API routes
 */
export function apiErrorMiddleware(
  handler: (req: Request, res: Response) => Promise<Response>
) {
  return async (req: Request, res: Response): Promise<Response> => {
    try {
      return await handler(req, res);
    } catch (error) {
      if (error instanceof Response) {
        return error;
      }
      
      const appError = isAppError(error) 
        ? error as AppError 
        : new AppError((error as Error).message);
        
      return errorResponse(appError);
    }
  };
}