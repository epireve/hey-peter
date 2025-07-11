/**
 * Global Error Handler
 * Captures and handles unhandled errors and promise rejections
 */

import { AppError, createError, isAppError } from './app-error';
import { errorUtils } from './error-utils';
import { errorTrackingService } from '../services/error-tracking-service';
import { loggingService, LogCategory } from '../services/logging-service';

export interface GlobalErrorHandlerOptions {
  enableLogging?: boolean;
  enableTracking?: boolean;
  enableConsoleOverride?: boolean;
  onError?: (error: Error | AppError, context?: Record<string, any>) => void;
  excludePatterns?: RegExp[];
}

class GlobalErrorHandler {
  private initialized = false;
  private options: Required<GlobalErrorHandlerOptions>;
  private originalHandlers: {
    error?: OnErrorEventHandler;
    unhandledRejection?: (event: PromiseRejectionEvent) => void;
    consoleError?: typeof console.error;
  } = {};

  constructor(options: GlobalErrorHandlerOptions = {}) {
    this.options = {
      enableLogging: true,
      enableTracking: true,
      enableConsoleOverride: process.env.NODE_ENV === 'production',
      onError: () => {},
      excludePatterns: [],
      ...options
    };
  }

  /**
   * Initialize global error handlers
   */
  public initialize(): void {
    if (this.initialized || typeof window === 'undefined') {
      return;
    }

    this.setupWindowErrorHandler();
    this.setupUnhandledRejectionHandler();
    
    if (this.options.enableConsoleOverride) {
      this.setupConsoleErrorOverride();
    }

    this.initialized = true;

    loggingService.info(
      LogCategory.SYSTEM,
      'Global error handler initialized',
      {
        options: {
          enableLogging: this.options.enableLogging,
          enableTracking: this.options.enableTracking,
          enableConsoleOverride: this.options.enableConsoleOverride
        }
      }
    );
  }

  /**
   * Clean up error handlers
   */
  public destroy(): void {
    if (!this.initialized) {
      return;
    }

    // Restore original handlers
    if (this.originalHandlers.error) {
      window.onerror = this.originalHandlers.error;
    }

    if (this.originalHandlers.unhandledRejection) {
      window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
    }

    if (this.originalHandlers.consoleError) {
      console.error = this.originalHandlers.consoleError;
    }

    this.initialized = false;
  }

  /**
   * Setup window error handler
   */
  private setupWindowErrorHandler(): void {
    this.originalHandlers.error = window.onerror;

    window.onerror = (
      message: string | Event,
      source?: string,
      lineno?: number,
      colno?: number,
      error?: Error
    ): boolean => {
      // Create error if not provided
      const actualError = error || new Error(
        typeof message === 'string' ? message : 'Unknown error'
      );

      // Check if should be excluded
      if (this.shouldExcludeError(actualError)) {
        return false;
      }

      const context = {
        type: 'window.error',
        source,
        lineno,
        colno,
        ...errorUtils.createErrorContext()
      };

      this.handleError(actualError, context);

      // Prevent default browser error handling in production
      return process.env.NODE_ENV === 'production';
    };

    // Also handle error events
    window.addEventListener('error', (event: ErrorEvent) => {
      if (event.error && !this.shouldExcludeError(event.error)) {
        const context = {
          type: 'error-event',
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          ...errorUtils.createErrorContext()
        };

        this.handleError(event.error, context);
      }
    });
  }

  /**
   * Setup unhandled promise rejection handler
   */
  private setupUnhandledRejectionHandler(): void {
    this.handleUnhandledRejection = this.handleUnhandledRejection.bind(this);
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  /**
   * Handle unhandled promise rejection
   */
  private handleUnhandledRejection(event: PromiseRejectionEvent): void {
    const error = this.normalizeRejectionReason(event.reason);

    if (this.shouldExcludeError(error)) {
      return;
    }

    const context = {
      type: 'unhandledrejection',
      promise: event.promise,
      ...errorUtils.createErrorContext()
    };

    this.handleError(error, context);

    // Prevent default browser handling in production
    if (process.env.NODE_ENV === 'production') {
      event.preventDefault();
    }
  }

  /**
   * Setup console.error override
   */
  private setupConsoleErrorOverride(): void {
    this.originalHandlers.consoleError = console.error;

    console.error = (...args: any[]): void => {
      // Call original console.error
      this.originalHandlers.consoleError!.apply(console, args);

      // Extract error from arguments
      const error = this.extractErrorFromConsoleArgs(args);
      
      if (error && !this.shouldExcludeError(error)) {
        const context = {
          type: 'console.error',
          args: args.slice(1),
          ...errorUtils.createErrorContext()
        };

        this.handleError(error, context);
      }
    };
  }

  /**
   * Main error handling logic
   */
  private handleError(error: Error | AppError, context: Record<string, any>): void {
    // Ensure we have an AppError
    const appError = this.normalizeError(error);

    // Log error
    if (this.options.enableLogging) {
      errorUtils.log(appError, context);
    }

    // Track error
    if (this.options.enableTracking) {
      errorTrackingService.captureException(appError, {
        tags: ['global-handler', context.type],
        extra: context
      });
    }

    // Call custom handler
    this.options.onError(appError, context);

    // Add breadcrumb
    errorTrackingService.addBreadcrumb(
      'Error',
      `Global error captured: ${appError.message}`,
      {
        errorType: appError.name,
        errorCode: isAppError(appError) ? appError.code : undefined,
        source: context.type
      },
      'error'
    );
  }

  /**
   * Normalize rejection reason to Error
   */
  private normalizeRejectionReason(reason: any): Error {
    if (reason instanceof Error) {
      return reason;
    }

    if (typeof reason === 'string') {
      return new Error(reason);
    }

    if (reason && typeof reason === 'object') {
      // Try to extract meaningful error info
      const message = reason.message || reason.error || reason.toString();
      const error = new Error(message);
      
      // Copy additional properties
      Object.assign(error, reason);
      
      return error;
    }

    return new Error(`Unhandled promise rejection: ${String(reason)}`);
  }

  /**
   * Extract error from console.error arguments
   */
  private extractErrorFromConsoleArgs(args: any[]): Error | null {
    // Check if first argument is an error
    if (args[0] instanceof Error) {
      return args[0];
    }

    // Check for React error patterns
    const message = args[0];
    if (typeof message === 'string') {
      // React error boundary pattern
      if (message.includes('Error:') || message.includes('Uncaught')) {
        return new Error(message);
      }

      // React warning patterns that might indicate errors
      if (message.includes('Warning:') && message.includes('error')) {
        return new Error(message);
      }
    }

    return null;
  }

  /**
   * Normalize error to AppError
   */
  private normalizeError(error: Error | AppError): AppError {
    if (isAppError(error)) {
      return error;
    }

    // Check for common error patterns
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return createError.network(error.message);
    }

    if (message.includes('timeout')) {
      return createError.timeout(error.message);
    }

    if (message.includes('unauthorized') || message.includes('401')) {
      return createError.auth(error.message);
    }

    if (message.includes('forbidden') || message.includes('403')) {
      return createError.authorization(error.message);
    }

    if (message.includes('not found') || message.includes('404')) {
      return createError.notFound();
    }

    // Default to internal error
    return createError.api(error.message, 500, {
      originalError: error.stack
    });
  }

  /**
   * Check if error should be excluded
   */
  private shouldExcludeError(error: Error): boolean {
    const message = error.message || '';
    
    // Common errors to exclude
    const commonExclusions = [
      /ResizeObserver loop limit exceeded/,
      /Non-Error promise rejection captured/,
      /Network request failed/,
      /Load failed/,
      /Script error/,
      /chrome-extension:/,
      /moz-extension:/,
      /safari-extension:/
    ];

    const allExclusions = [...commonExclusions, ...this.options.excludePatterns];

    return allExclusions.some(pattern => pattern.test(message));
  }
}

// Create singleton instance
let globalErrorHandler: GlobalErrorHandler | null = null;

/**
 * Initialize global error handler
 */
export function initializeGlobalErrorHandler(
  options?: GlobalErrorHandlerOptions
): GlobalErrorHandler {
  if (!globalErrorHandler) {
    globalErrorHandler = new GlobalErrorHandler(options);
    globalErrorHandler.initialize();
  }
  return globalErrorHandler;
}

/**
 * Get global error handler instance
 */
export function getGlobalErrorHandler(): GlobalErrorHandler | null {
  return globalErrorHandler;
}

/**
 * Destroy global error handler
 */
export function destroyGlobalErrorHandler(): void {
  if (globalErrorHandler) {
    globalErrorHandler.destroy();
    globalErrorHandler = null;
  }
}

// Auto-initialize in browser environment
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  // Initialize with default options
  initializeGlobalErrorHandler();
}

export default GlobalErrorHandler;