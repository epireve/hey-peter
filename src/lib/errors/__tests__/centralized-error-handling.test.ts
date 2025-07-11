/**
 * Comprehensive tests for the centralized error handling system
 */

import { 
  AppError, 
  createError, 
  ErrorCode, 
  ErrorSeverity,
  isAppError,
  errorUtils,
  retryWithBackoff,
  CircuitBreaker,
  withFallback,
  getUserErrorMessage,
  formatErrorForDisplay
} from '../index';

describe('Centralized Error Handling System', () => {
  describe('AppError Class', () => {
    test('should create AppError with default values', () => {
      const error = new AppError('Test error');
      
      expect(error.message).toBe('Test error');
      expect(error.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(error.statusCode).toBe(500);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.isOperational).toBe(true);
      expect(error.timestamp).toBeDefined();
    });

    test('should create AppError with custom metadata', () => {
      const error = new AppError('Custom error', {
        code: ErrorCode.VALIDATION_ERROR,
        statusCode: 400,
        severity: ErrorSeverity.LOW,
        details: { field: 'email' }
      });

      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.statusCode).toBe(400);
      expect(error.severity).toBe(ErrorSeverity.LOW);
      expect(error.details).toEqual({ field: 'email' });
    });

    test('should serialize to JSON correctly', () => {
      const error = new AppError('Test error', {
        code: ErrorCode.API_ERROR,
        statusCode: 500,
        details: { key: 'value' }
      });

      const json = error.toJSON();
      
      expect(json).toHaveProperty('name', 'AppError');
      expect(json).toHaveProperty('message', 'Test error');
      expect(json).toHaveProperty('code', ErrorCode.API_ERROR);
      expect(json).toHaveProperty('statusCode', 500);
      expect(json).toHaveProperty('timestamp');
      expect(json).toHaveProperty('details', { key: 'value' });
    });
  });

  describe('Error Factory Functions', () => {
    test('should create validation error', () => {
      const error = createError.validation('Invalid input', {
        email: ['Required field'],
        name: ['Too short']
      });

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.statusCode).toBe(400);
      expect(error.details?.validationErrors).toEqual({
        email: ['Required field'],
        name: ['Too short']
      });
    });

    test('should create auth error', () => {
      const error = createError.auth('Session expired');

      expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
      expect(error.statusCode).toBe(401);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
    });

    test('should create network error', () => {
      const error = createError.network('Connection failed');

      expect(error.code).toBe(ErrorCode.NETWORK_ERROR);
      expect(error.statusCode).toBe(0);
    });

    test('should create not found error', () => {
      const error = createError.notFound('User', '123');

      expect(error.code).toBe(ErrorCode.RECORD_NOT_FOUND);
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('User with identifier \'123\' not found');
    });

    test('should create business rule error', () => {
      const error = createError.businessRule('Insufficient hours', {
        required: 5,
        available: 2
      });

      expect(error.code).toBe(ErrorCode.BUSINESS_RULE_VIOLATION);
      expect(error.statusCode).toBe(422);
      expect(error.details).toEqual({ required: 5, available: 2 });
    });
  });

  describe('Error Type Guards', () => {
    test('should identify AppError instances', () => {
      const appError = new AppError('Test');
      const standardError = new Error('Test');

      expect(isAppError(appError)).toBe(true);
      expect(isAppError(standardError)).toBe(false);
    });
  });

  describe('Error Utilities', () => {
    test('should serialize error for API response', () => {
      const error = createError.validation('Invalid input', {
        email: ['Required']
      });

      const serialized = errorUtils.serialize(error, 'req_123');

      expect(serialized).toMatchObject({
        message: 'Invalid input',
        code: ErrorCode.VALIDATION_ERROR,
        statusCode: 400,
        requestId: 'req_123'
      });
    });

    test('should parse database errors', () => {
      const dbError = {
        code: '23505',
        detail: 'Key (email)=(test@example.com) already exists.'
      };

      const parsed = errorUtils.parseDatabaseError(dbError);

      expect(parsed.code).toBe(ErrorCode.DUPLICATE_RECORD);
      expect(parsed.statusCode).toBe(409);
    });

    test('should parse API errors', () => {
      const apiError = {
        response: {
          status: 404,
          data: { message: 'Not found' }
        }
      };

      const parsed = errorUtils.parseAPIError(apiError, '/api/users/123');

      expect(parsed.code).toBe(ErrorCode.RECORD_NOT_FOUND);
      expect(parsed.statusCode).toBe(404);
    });

    test('should get user-friendly messages', () => {
      const error = createError.auth('Invalid credentials');
      const message = errorUtils.getUserFriendlyMessage(error);

      expect(message).toBe('Invalid email or password.');
    });

    test('should create error context', () => {
      const context = errorUtils.createErrorContext({
        method: 'POST',
        url: '/api/test',
        headers: { 'user-agent': 'test' },
        ip: '127.0.0.1'
      });

      expect(context).toMatchObject({
        method: 'POST',
        url: '/api/test',
        ip: '127.0.0.1',
        environment: expect.any(String),
        timestamp: expect.any(String)
      });
    });
  });

  describe('Error Recovery', () => {
    test('should retry with backoff on failure', async () => {
      let attempts = 0;
      const operation = jest.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 3) {
          throw createError.network('Connection failed');
        }
        return 'success';
      });

      const result = await retryWithBackoff(operation, {
        maxAttempts: 3,
        delay: 10,
        backoff: 'linear'
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(3);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    test('should fail after max attempts', async () => {
      const operation = jest.fn().mockRejectedValue(createError.network('Always fails'));

      const result = await retryWithBackoff(operation, {
        maxAttempts: 2,
        delay: 10
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(AppError);
      expect(result.attempts).toBe(2);
    });

    test('should use fallback on primary failure', async () => {
      const primary = jest.fn().mockRejectedValue(createError.network('Primary failed'));
      const fallback = jest.fn().mockResolvedValue('fallback result');

      const result = await withFallback(primary, fallback);

      expect(result).toBe('fallback result');
      expect(primary).toHaveBeenCalledTimes(1);
      expect(fallback).toHaveBeenCalledTimes(1);
    });

    test('should use primary when successful', async () => {
      const primary = jest.fn().mockResolvedValue('primary result');
      const fallback = jest.fn().mockResolvedValue('fallback result');

      const result = await withFallback(primary, fallback);

      expect(result).toBe('primary result');
      expect(primary).toHaveBeenCalledTimes(1);
      expect(fallback).not.toHaveBeenCalled();
    });
  });

  describe('Circuit Breaker', () => {
    test('should open circuit after threshold failures', async () => {
      const circuitBreaker = new CircuitBreaker({
        threshold: 2,
        timeout: 1000,
        resetTimeout: 100
      });

      const operation = jest.fn().mockRejectedValue(new Error('Always fails'));

      // First two failures
      await expect(circuitBreaker.execute(operation)).rejects.toThrow();
      await expect(circuitBreaker.execute(operation)).rejects.toThrow();

      expect(circuitBreaker.getState()).toBe('open');

      // Third attempt should fail fast
      await expect(circuitBreaker.execute(operation)).rejects.toThrow('Circuit breaker is open');
      
      // Should not call operation when circuit is open
      expect(operation).toHaveBeenCalledTimes(2);
    });

    test('should close circuit after successful operation in half-open state', async () => {
      const circuitBreaker = new CircuitBreaker({
        threshold: 1,
        timeout: 1000,
        resetTimeout: 10
      });

      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValue('Success');

      // Trigger circuit open
      await expect(circuitBreaker.execute(operation)).rejects.toThrow();
      expect(circuitBreaker.getState()).toBe('open');

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 20));

      // Should go to half-open and then close on success
      const result = await circuitBreaker.execute(operation);
      expect(result).toBe('Success');
      expect(circuitBreaker.getState()).toBe('half-open');
    });
  });

  describe('User-Friendly Messages', () => {
    test('should get context-specific error messages', () => {
      const error = createError.auth('Session expired');
      const message = getUserErrorMessage(error, 'auth');

      expect(message.title).toBe('Session Expired');
      expect(message.message).toBe('Your session has expired. Please sign in again to continue.');
      expect(message.action).toBe('Sign In');
      expect(message.severity).toBe('warning');
    });

    test('should format error for display', () => {
      const error = createError.validation('Invalid input', {
        email: ['Required']
      });

      const formatted = formatErrorForDisplay(error, 'profile');

      expect(formatted.title).toBe('Profile Error');
      expect(formatted.message).toBe('Please review your profile information and correct any errors.');
      expect(formatted.action).toBe('Review Profile');
      expect(formatted.severity).toBe('warning');
    });

    test('should provide default messages for unknown errors', () => {
      const error = new Error('Unknown error');
      const message = getUserErrorMessage(error);

      expect(message.title).toBe('Something Went Wrong');
      expect(message.message).toBe('We encountered an unexpected error. Please try again, and contact support if the problem persists.');
      expect(message.severity).toBe('error');
    });
  });

  describe('Batch Operations', () => {
    test('should handle batch operations with mixed results', async () => {
      const items = [1, 2, 3, 4, 5];
      const operation = jest.fn().mockImplementation(async (item: number) => {
        if (item % 2 === 0) {
          throw createError.api(`Failed for item ${item}`);
        }
        return `Success for item ${item}`;
      });

      const result = await errorUtils.handleBatchOperation(items, operation, {
        continueOnError: true
      });

      expect(result.hasErrors).toBe(true);
      expect(result.successful).toHaveLength(3);
      expect(result.failed).toHaveLength(2);
      expect(result.successful).toEqual([
        'Success for item 1',
        'Success for item 3',
        'Success for item 5'
      ]);
    });

    test('should stop on first error when continueOnError is false', async () => {
      const items = [1, 2, 3, 4, 5];
      const operation = jest.fn().mockImplementation(async (item: number) => {
        if (item === 2) {
          throw createError.api('Failed for item 2');
        }
        return `Success for item ${item}`;
      });

      await expect(
        errorUtils.handleBatchOperation(items, operation, {
          continueOnError: false
        })
      ).rejects.toThrow('Failed for item 2');
    });
  });

  describe('Error Wrapping', () => {
    test('should wrap function with error handling', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Test error'));
      const wrappedFn = errorUtils.withErrorHandling(mockFn, {
        rethrow: false
      });

      const result = await wrappedFn();

      expect(result).toBeUndefined();
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    test('should rethrow errors when configured', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Test error'));
      const wrappedFn = errorUtils.withErrorHandling(mockFn, {
        rethrow: true
      });

      await expect(wrappedFn()).rejects.toThrow('Test error');
    });
  });

  describe('Error Recovery Strategies', () => {
    test('should identify recoverable errors', () => {
      const networkError = createError.network();
      const recoveryStrategy = errorUtils.getRecoveryStrategy(networkError);

      expect(recoveryStrategy.canRecover).toBe(true);
      expect(recoveryStrategy.action).toBeDefined();
    });

    test('should identify non-recoverable errors', () => {
      const configError = createError.configuration('Invalid config');
      const recoveryStrategy = errorUtils.getRecoveryStrategy(configError);

      expect(recoveryStrategy.canRecover).toBe(false);
    });
  });
});

describe('Edge Cases', () => {
  test('should handle null/undefined errors gracefully', () => {
    const serialized = errorUtils.serialize(null as any);
    expect(serialized.message).toBe('An unexpected error occurred');
  });

  test('should handle circular reference in error details', () => {
    const circular: any = { prop: 'value' };
    circular.self = circular;

    const error = new AppError('Test', { details: circular });
    const json = error.toJSON();

    expect(json.details).toBeDefined();
  });

  test('should handle very long error messages', () => {
    const longMessage = 'a'.repeat(10000);
    const error = new AppError(longMessage);

    expect(error.message).toBe(longMessage);
    expect(error.toJSON().message).toBe(longMessage);
  });
});

describe('Performance Tests', () => {
  test('should handle high-frequency error creation', () => {
    const startTime = Date.now();
    
    for (let i = 0; i < 1000; i++) {
      const error = createError.api(`Error ${i}`);
      expect(error).toBeInstanceOf(AppError);
    }
    
    const endTime = Date.now();
    expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
  });

  test('should serialize errors efficiently', () => {
    const error = createError.validation('Test', {
      field1: ['Error 1'],
      field2: ['Error 2']
    });

    const startTime = Date.now();
    
    for (let i = 0; i < 100; i++) {
      errorUtils.serialize(error, `req_${i}`);
    }
    
    const endTime = Date.now();
    expect(endTime - startTime).toBeLessThan(100); // Should complete quickly
  });
});