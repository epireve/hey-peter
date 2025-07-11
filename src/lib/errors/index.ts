/**
 * Centralized Error Handling System
 * 
 * This module provides a comprehensive error handling system with:
 * - Custom error classes with proper typing
 * - Error serialization and logging utilities
 * - Global error handlers for unhandled errors
 * - React error boundaries and context providers
 * - Type-safe API error responses
 * - Error recovery strategies
 * - User-friendly error messages
 * 
 * Usage:
 * ```tsx
 * import { 
 *   AppError, 
 *   createError, 
 *   ErrorProvider, 
 *   useError,
 *   withErrorBoundary,
 *   errorResponse
 * } from '@/lib/errors';
 * 
 * // Create custom errors
 * const error = createError.validation('Invalid email', { email: ['Invalid format'] });
 * 
 * // Use in components
 * function MyComponent() {
 *   const { captureError } = useError();
 *   
 *   const handleError = () => {
 *     captureError(new Error('Something went wrong'));
 *   };
 * }
 * 
 * // Use in API routes
 * export async function POST(request: Request) {
 *   try {
 *     // ... your logic
 *   } catch (error) {
 *     return errorResponse(error);
 *   }
 * }
 * ```
 */

// Core error classes
export {
  AppError,
  AuthError,
  AuthorizationError,
  ValidationError,
  APIError,
  NetworkError,
  TimeoutError,
  RateLimitError,
  DatabaseError,
  NotFoundError,
  DuplicateError,
  BusinessRuleError,
  ConfigurationError,
  ServiceUnavailableError,
  ErrorCode,
  ErrorSeverity,
  ErrorContext,
  ErrorMetadata,
  isAppError,
  isAuthError,
  isValidationError,
  isAPIError,
  isDatabaseError,
  isBusinessRuleError,
  createError
} from './app-error';

// Error utilities
export {
  errorUtils,
  serializeError,
  logError,
  withErrorHandling,
  parseDatabaseError,
  parseAPIError,
  getUserFriendlyMessage,
  getRecoveryStrategy,
  handleBatchOperation,
  createErrorContext,
  type SerializedError,
  type RecoveryStrategy,
  type BatchErrorResult
} from './error-utils';

// Global error handler
export {
  initializeGlobalErrorHandler,
  getGlobalErrorHandler,
  destroyGlobalErrorHandler,
  type GlobalErrorHandlerOptions
} from './global-error-handler';

// React error context
export {
  ErrorProvider,
  useError,
  useErrorHandler,
  useFormErrorHandler,
  useAPIErrorHandler,
  useComponentTracking,
  useAPITracking,
  type ErrorCaptureOptions
} from './ErrorContext';

// Error boundaries
export {
  ErrorBoundary,
  withErrorBoundary,
  useErrorBoundary,
  DashboardErrorBoundary,
  FormErrorBoundary,
  ApiErrorBoundary,
  ChartErrorBoundary,
  type ErrorBoundaryProps,
  type ErrorFallbackProps
} from './ErrorBoundary';

// API error responses
export {
  successResponse,
  paginatedResponse,
  errorResponse,
  standardErrors,
  withErrorHandling as withAPIErrorHandling,
  validateRequestBody,
  validateQueryParams,
  createAPIRoute,
  apiErrorMiddleware,
  type APIResponse,
  type PaginatedAPIResponse
} from './api-error-response';

// Error recovery strategies
export {
  retryWithBackoff,
  CircuitBreaker,
  withFallback,
  withTimeout,
  batchRetry,
  StaleWhileRevalidateCache,
  createResilientFunction,
  type RetryOptions,
  type CircuitBreakerOptions,
  type RecoveryResult
} from './error-recovery';

// User-friendly messages
export {
  getUserErrorMessage,
  getDetailedErrorInfo,
  formatErrorForDisplay,
  getContextualHelp,
  type ErrorMessageConfig
} from './user-messages';

/**
 * Quick setup helper for initializing error handling
 */
export function initializeErrorHandling(options?: {
  enableGlobalHandler?: boolean;
  globalHandlerOptions?: any;
}) {
  const { enableGlobalHandler = true, globalHandlerOptions = {} } = options || {};
  
  if (enableGlobalHandler && typeof window !== 'undefined') {
    initializeGlobalErrorHandler(globalHandlerOptions);
  }
  
  return {
    initialized: true,
    globalHandler: enableGlobalHandler
  };
}

/**
 * Common error patterns for quick access
 */
export const commonErrors = {
  // Authentication errors
  unauthorized: (message?: string) => createError.auth(message),
  sessionExpired: () => createError.auth('Session expired', { 
    code: ErrorCode.SESSION_EXPIRED 
  }),
  insufficientPermissions: (resource?: string) => 
    createError.authorization(
      resource ? `Access denied to ${resource}` : undefined
    ),

  // Validation errors
  validationFailed: (errors: Record<string, string[]>) => 
    createError.validation('Validation failed', errors),
  missingField: (field: string) => 
    createError.validation(`${field} is required`, {
      [field]: ['This field is required']
    }),
  invalidFormat: (field: string, format: string) => 
    createError.validation(`Invalid ${field} format`, {
      [field]: [`Must be a valid ${format}`]
    }),

  // API errors
  notFound: (resource?: string) => createError.notFound(resource),
  duplicate: (resource?: string, field?: string) => 
    createError.duplicate(resource, field),
  networkError: () => createError.network(),
  timeout: () => createError.timeout(),
  serverError: (message?: string) => createError.api(message, 500),

  // Business logic errors
  insufficientHours: (required: number, available: number) => 
    createError.businessRule(
      `Insufficient hours: ${required} required, ${available} available`,
      { required, available }
    ),
  schedulingConflict: (timeSlot: string) => 
    createError.businessRule(
      `Time slot ${timeSlot} is not available`,
      { timeSlot }
    ),
  enrollmentLimitExceeded: (limit: number) => 
    createError.businessRule(
      `Class is full (${limit} students maximum)`,
      { limit }
    )
};

/**
 * Error handling best practices
 */
export const errorHandlingBestPractices = {
  // Always use specific error types
  useSpecificErrors: true,
  
  // Log errors with context
  logWithContext: true,
  
  // Provide recovery strategies
  enableRecovery: true,
  
  // Show user-friendly messages
  friendlyMessages: true,
  
  // Track errors for analysis
  trackErrors: true
};

/**
 * Development helpers
 */
export const devHelpers = {
  // Test error scenarios
  throwTestError: (type: keyof typeof createError = 'api') => {
    const testErrors = {
      auth: () => createError.auth('Test auth error'),
      validation: () => createError.validation('Test validation', { 
        email: ['Invalid email'] 
      }),
      network: () => createError.network('Test network error'),
      api: () => createError.api('Test API error'),
      database: () => createError.database('Test database error'),
      notFound: () => createError.notFound('Test Resource'),
      businessRule: () => createError.businessRule('Test business rule violation')
    };
    
    throw testErrors[type]();
  },

  // Log error information
  logErrorInfo: (error: Error) => {
    console.group('Error Information');
    console.log('Type:', error.constructor.name);
    console.log('Message:', error.message);
    if (isAppError(error)) {
      console.log('Code:', error.code);
      console.log('Status:', error.statusCode);
      console.log('Severity:', error.severity);
      console.log('Operational:', error.isOperational);
    }
    console.log('Stack:', error.stack);
    console.groupEnd();
  }
};

// Export the development helpers only in development
if (process.env.NODE_ENV === 'development') {
  (window as any).errorHandling = {
    ...devHelpers,
    createError,
    commonErrors
  };
}