/**
 * Custom Application Error Classes
 * Provides type-safe, extensible error handling throughout the application
 */

export enum ErrorCode {
  // Authentication Errors (1000-1099)
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
  // Validation Errors (1100-1199)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  
  // API Errors (1200-1299)
  API_ERROR = 'API_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Database Errors (1300-1399)
  DATABASE_ERROR = 'DATABASE_ERROR',
  DUPLICATE_RECORD = 'DUPLICATE_RECORD',
  RECORD_NOT_FOUND = 'RECORD_NOT_FOUND',
  CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION',
  
  // Business Logic Errors (1400-1499)
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  INSUFFICIENT_HOURS = 'INSUFFICIENT_HOURS',
  SCHEDULING_CONFLICT = 'SCHEDULING_CONFLICT',
  ENROLLMENT_LIMIT_EXCEEDED = 'ENROLLMENT_LIMIT_EXCEEDED',
  
  // System Errors (1500-1599)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  DEPENDENCY_ERROR = 'DEPENDENCY_ERROR',
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  timestamp: string;
  environment: string;
  url?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  [key: string]: any;
}

export interface ErrorMetadata {
  code: ErrorCode;
  statusCode: number;
  severity: ErrorSeverity;
  isOperational: boolean;
  shouldNotify: boolean;
  context?: ErrorContext;
  details?: any;
  originalError?: Error;
}

/**
 * Base Application Error Class
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly severity: ErrorSeverity;
  public readonly isOperational: boolean;
  public readonly shouldNotify: boolean;
  public readonly context?: ErrorContext;
  public readonly details?: any;
  public readonly originalError?: Error;
  public readonly timestamp: string;

  constructor(
    message: string,
    metadata: Partial<ErrorMetadata> = {}
  ) {
    super(message);
    
    this.name = this.constructor.name;
    this.code = metadata.code || ErrorCode.INTERNAL_ERROR;
    this.statusCode = metadata.statusCode || 500;
    this.severity = metadata.severity || ErrorSeverity.MEDIUM;
    this.isOperational = metadata.isOperational !== false;
    this.shouldNotify = metadata.shouldNotify !== false;
    this.context = metadata.context;
    this.details = metadata.details;
    this.originalError = metadata.originalError;
    this.timestamp = new Date().toISOString();
    
    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  public toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      severity: this.severity,
      timestamp: this.timestamp,
      details: this.details,
      ...(process.env.NODE_ENV === 'development' && {
        stack: this.stack,
        context: this.context,
      }),
    };
  }
}

/**
 * Authentication Error
 */
export class AuthError extends AppError {
  constructor(
    message: string = 'Authentication failed',
    code: ErrorCode = ErrorCode.UNAUTHORIZED,
    details?: any
  ) {
    super(message, {
      code,
      statusCode: 401,
      severity: ErrorSeverity.HIGH,
      shouldNotify: false,
      details
    });
  }
}

/**
 * Authorization Error
 */
export class AuthorizationError extends AppError {
  constructor(
    message: string = 'Insufficient permissions',
    details?: any
  ) {
    super(message, {
      code: ErrorCode.INSUFFICIENT_PERMISSIONS,
      statusCode: 403,
      severity: ErrorSeverity.MEDIUM,
      shouldNotify: false,
      details
    });
  }
}

/**
 * Validation Error
 */
export class ValidationError extends AppError {
  public readonly validationErrors: Record<string, string[]>;

  constructor(
    message: string = 'Validation failed',
    validationErrors: Record<string, string[]> = {},
    details?: any
  ) {
    super(message, {
      code: ErrorCode.VALIDATION_ERROR,
      statusCode: 400,
      severity: ErrorSeverity.LOW,
      shouldNotify: false,
      details: { ...details, validationErrors }
    });
    
    this.validationErrors = validationErrors;
  }
}

/**
 * API Error
 */
export class APIError extends AppError {
  constructor(
    message: string = 'API request failed',
    statusCode: number = 500,
    code: ErrorCode = ErrorCode.API_ERROR,
    details?: any
  ) {
    super(message, {
      code,
      statusCode,
      severity: statusCode >= 500 ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM,
      details
    });
  }
}

/**
 * Network Error
 */
export class NetworkError extends APIError {
  constructor(
    message: string = 'Network request failed',
    details?: any
  ) {
    super(message, 0, ErrorCode.NETWORK_ERROR, details);
  }
}

/**
 * Timeout Error
 */
export class TimeoutError extends APIError {
  constructor(
    message: string = 'Request timeout',
    details?: any
  ) {
    super(message, 408, ErrorCode.TIMEOUT_ERROR, details);
  }
}

/**
 * Rate Limit Error
 */
export class RateLimitError extends APIError {
  public readonly retryAfter?: number;

  constructor(
    message: string = 'Rate limit exceeded',
    retryAfter?: number,
    details?: any
  ) {
    super(message, 429, ErrorCode.RATE_LIMIT_EXCEEDED, {
      ...details,
      retryAfter
    });
    
    this.retryAfter = retryAfter;
  }
}

/**
 * Database Error
 */
export class DatabaseError extends AppError {
  constructor(
    message: string = 'Database operation failed',
    code: ErrorCode = ErrorCode.DATABASE_ERROR,
    originalError?: Error
  ) {
    super(message, {
      code,
      statusCode: 500,
      severity: ErrorSeverity.HIGH,
      originalError,
      details: {
        operation: originalError?.message
      }
    });
  }
}

/**
 * Not Found Error
 */
export class NotFoundError extends AppError {
  constructor(
    resource: string = 'Resource',
    identifier?: string | number
  ) {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
      
    super(message, {
      code: ErrorCode.RECORD_NOT_FOUND,
      statusCode: 404,
      severity: ErrorSeverity.LOW,
      shouldNotify: false,
      details: { resource, identifier }
    });
  }
}

/**
 * Duplicate Record Error
 */
export class DuplicateError extends DatabaseError {
  constructor(
    resource: string = 'Record',
    field?: string
  ) {
    const message = field
      ? `${resource} with this ${field} already exists`
      : `${resource} already exists`;
      
    super(message, ErrorCode.DUPLICATE_RECORD);
    this.statusCode = 409;
  }
}

/**
 * Business Rule Error
 */
export class BusinessRuleError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.BUSINESS_RULE_VIOLATION,
    details?: any
  ) {
    super(message, {
      code,
      statusCode: 422,
      severity: ErrorSeverity.MEDIUM,
      details
    });
  }
}

/**
 * Configuration Error
 */
export class ConfigurationError extends AppError {
  constructor(
    message: string = 'Configuration error',
    details?: any
  ) {
    super(message, {
      code: ErrorCode.CONFIGURATION_ERROR,
      statusCode: 500,
      severity: ErrorSeverity.CRITICAL,
      isOperational: false,
      details
    });
  }
}

/**
 * Service Unavailable Error
 */
export class ServiceUnavailableError extends AppError {
  public readonly retryAfter?: number;

  constructor(
    message: string = 'Service temporarily unavailable',
    retryAfter?: number,
    details?: any
  ) {
    super(message, {
      code: ErrorCode.SERVICE_UNAVAILABLE,
      statusCode: 503,
      severity: ErrorSeverity.HIGH,
      details: { ...details, retryAfter }
    });
    
    this.retryAfter = retryAfter;
  }
}

/**
 * Type guards for error checking
 */
export const isAppError = (error: any): error is AppError => {
  return error instanceof AppError;
};

export const isAuthError = (error: any): error is AuthError => {
  return error instanceof AuthError;
};

export const isValidationError = (error: any): error is ValidationError => {
  return error instanceof ValidationError;
};

export const isAPIError = (error: any): error is APIError => {
  return error instanceof APIError;
};

export const isDatabaseError = (error: any): error is DatabaseError => {
  return error instanceof DatabaseError;
};

export const isBusinessRuleError = (error: any): error is BusinessRuleError => {
  return error instanceof BusinessRuleError;
};

/**
 * Error factory functions
 */
export const createError = {
  auth: (message?: string, details?: any) => new AuthError(message, ErrorCode.UNAUTHORIZED, details),
  authorization: (message?: string, details?: any) => new AuthorizationError(message, details),
  validation: (message?: string, errors?: Record<string, string[]>, details?: any) => 
    new ValidationError(message, errors, details),
  api: (message?: string, statusCode?: number, details?: any) => 
    new APIError(message, statusCode, ErrorCode.API_ERROR, details),
  network: (message?: string, details?: any) => new NetworkError(message, details),
  timeout: (message?: string, details?: any) => new TimeoutError(message, details),
  rateLimit: (message?: string, retryAfter?: number, details?: any) => 
    new RateLimitError(message, retryAfter, details),
  database: (message?: string, originalError?: Error) => 
    new DatabaseError(message, ErrorCode.DATABASE_ERROR, originalError),
  notFound: (resource?: string, identifier?: string | number) => 
    new NotFoundError(resource, identifier),
  duplicate: (resource?: string, field?: string) => new DuplicateError(resource, field),
  businessRule: (message: string, details?: any) => 
    new BusinessRuleError(message, ErrorCode.BUSINESS_RULE_VIOLATION, details),
  configuration: (message?: string, details?: any) => new ConfigurationError(message, details),
  serviceUnavailable: (message?: string, retryAfter?: number, details?: any) => 
    new ServiceUnavailableError(message, retryAfter, details),
};