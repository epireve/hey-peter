/**
 * Standardized API Response Format
 * Based on Database & API Layer analysis
 */

export interface StandardApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: string;
    requestId: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      hasMore: boolean;
    };
  };
}

export interface PaginatedResponse<T> extends StandardApiResponse<T[]> {
  metadata: {
    timestamp: string;
    requestId: string;
    pagination: {
      page: number;
      limit: number;
      total: number;
      hasMore: boolean;
    };
  };
}

/**
 * Success response helper
 */
export function createSuccessResponse<T>(
  data: T,
  metadata?: Partial<StandardApiResponse<T>['metadata']>
): StandardApiResponse<T> {
  return {
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
      ...metadata,
    },
  };
}

/**
 * Error response helper
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: any
): StandardApiResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
    },
  };
}

/**
 * Paginated response helper
 */
export function createPaginatedResponse<T>(
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
  }
): PaginatedResponse<T> {
  return {
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
      pagination: {
        ...pagination,
        hasMore: pagination.page * pagination.limit < pagination.total,
      },
    },
  };
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Common error codes
 */
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  INSUFFICIENT_HOURS: 'INSUFFICIENT_HOURS',
  SCHEDULE_CONFLICT: 'SCHEDULE_CONFLICT',
  ENROLLMENT_LIMIT: 'ENROLLMENT_LIMIT',
} as const;

/**
 * Response wrapper for Next.js API routes
 */
export function apiResponse<T>(
  response: StandardApiResponse<T>,
  status: number = 200
): Response {
  return new Response(JSON.stringify(response), {
    status: response.success ? status : getErrorStatus(response.error?.code),
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': response.metadata?.requestId || generateRequestId(),
    },
  });
}

/**
 * Get HTTP status code from error code
 */
function getErrorStatus(errorCode?: string): number {
  switch (errorCode) {
    case ErrorCodes.VALIDATION_ERROR:
      return 400;
    case ErrorCodes.UNAUTHORIZED:
      return 401;
    case ErrorCodes.FORBIDDEN:
      return 403;
    case ErrorCodes.NOT_FOUND:
      return 404;
    case ErrorCodes.RATE_LIMITED:
      return 429;
    case ErrorCodes.DATABASE_ERROR:
    case ErrorCodes.INTERNAL_ERROR:
      return 500;
    default:
      return 500;
  }
}