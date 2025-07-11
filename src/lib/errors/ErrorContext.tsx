'use client';

import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { AppError, isAppError } from './app-error';
import { errorUtils } from './error-utils';
import { errorTrackingService } from '../services/error-tracking-service';
import { initializeGlobalErrorHandler } from './global-error-handler';

interface ErrorState {
  errors: Array<{
    id: string;
    error: AppError;
    timestamp: Date;
    dismissed: boolean;
  }>;
  isRecovering: boolean;
}

interface ErrorContextType {
  errors: ErrorState['errors'];
  captureError: (error: Error | AppError, options?: ErrorCaptureOptions) => string;
  dismissError: (errorId: string) => void;
  clearErrors: () => void;
  recoverFromError: (error: AppError) => Promise<void>;
  handleAsyncError: <T>(promise: Promise<T>) => Promise<T | undefined>;
}

interface ErrorCaptureOptions {
  notify?: boolean;
  context?: Record<string, any>;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  recoverable?: boolean;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

interface ErrorProviderProps {
  children: React.ReactNode;
  onError?: (error: AppError, context?: Record<string, any>) => void;
  maxErrors?: number;
  autoDismissTimeout?: number;
}

export function ErrorProvider({ 
  children, 
  onError,
  maxErrors = 10,
  autoDismissTimeout = 10000 
}: ErrorProviderProps) {
  const [errorState, setErrorState] = useState<ErrorState>({
    errors: [],
    isRecovering: false
  });

  // Initialize global error handler
  useEffect(() => {
    const handler = initializeGlobalErrorHandler({
      onError: (error, context) => {
        const appError = isAppError(error) ? error : errorUtils.parseAPIError(error);
        captureError(appError, { context, notify: true });
      }
    });

    return () => {
      // Cleanup if needed
    };
  }, []);

  /**
   * Capture and handle an error
   */
  const captureError = useCallback((
    error: Error | AppError,
    options: ErrorCaptureOptions = {}
  ): string => {
    const appError = isAppError(error) ? error : errorUtils.parseAPIError(error);
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Log error
    errorUtils.log(appError, options.context);

    // Track error if it's not operational or high severity
    if (!appError.isOperational || appError.severity === 'critical' || appError.severity === 'high') {
      errorTrackingService.captureException(appError, {
        extra: options.context
      });
    }

    // Add to state
    setErrorState(prev => {
      const newError = {
        id: errorId,
        error: appError,
        timestamp: new Date(),
        dismissed: false
      };

      // Limit number of errors stored
      const errors = [newError, ...prev.errors].slice(0, maxErrors);

      return { ...prev, errors };
    });

    // Show notification if requested
    if (options.notify !== false) {
      showErrorNotification(appError, errorId);
    }

    // Call custom error handler
    if (onError) {
      onError(appError, options.context);
    }

    // Auto-dismiss after timeout for non-critical errors
    if (appError.severity !== 'critical' && appError.severity !== 'high') {
      setTimeout(() => {
        dismissError(errorId);
      }, autoDismissTimeout);
    }

    return errorId;
  }, [onError, maxErrors, autoDismissTimeout]);

  /**
   * Show error notification
   */
  const showErrorNotification = (error: AppError, errorId: string) => {
    const message = errorUtils.getUserFriendlyMessage(error);
    const recovery = errorUtils.getRecoveryStrategy(error);

    const toastOptions = {
      id: errorId,
      duration: error.severity === 'critical' ? Infinity : 5000,
      action: recovery.canRecover ? {
        label: 'Recover',
        onClick: () => recoverFromError(error)
      } : undefined
    };

    switch (error.severity) {
      case 'critical':
      case 'high':
        toast.error(message, toastOptions);
        break;
      case 'medium':
        toast.warning(message, toastOptions);
        break;
      default:
        toast.info(message, toastOptions);
    }
  };

  /**
   * Dismiss an error
   */
  const dismissError = useCallback((errorId: string) => {
    setErrorState(prev => ({
      ...prev,
      errors: prev.errors.map(e => 
        e.id === errorId ? { ...e, dismissed: true } : e
      )
    }));
    toast.dismiss(errorId);
  }, []);

  /**
   * Clear all errors
   */
  const clearErrors = useCallback(() => {
    setErrorState(prev => ({
      ...prev,
      errors: []
    }));
  }, []);

  /**
   * Recover from an error
   */
  const recoverFromError = useCallback(async (error: AppError) => {
    const recovery = errorUtils.getRecoveryStrategy(error);
    
    if (!recovery.canRecover) {
      return;
    }

    setErrorState(prev => ({ ...prev, isRecovering: true }));

    try {
      if (recovery.delay) {
        await new Promise(resolve => setTimeout(resolve, recovery.delay));
      }

      if (recovery.action) {
        await recovery.action();
      }

      // Clear the error after successful recovery
      const errorEntry = errorState.errors.find(e => e.error === error);
      if (errorEntry) {
        dismissError(errorEntry.id);
      }

      if (recovery.message) {
        toast.success(recovery.message);
      }
    } catch (recoveryError) {
      // Recovery failed
      captureError(
        recoveryError as Error,
        { 
          notify: true,
          context: { 
            originalError: error.code,
            recoveryAttempt: true 
          }
        }
      );
    } finally {
      setErrorState(prev => ({ ...prev, isRecovering: false }));
    }
  }, [errorState.errors, dismissError, captureError]);

  /**
   * Handle async errors with automatic capture
   */
  const handleAsyncError = useCallback(async <T,>(
    promise: Promise<T>
  ): Promise<T | undefined> => {
    try {
      return await promise;
    } catch (error) {
      captureError(error as Error, { notify: true });
      return undefined;
    }
  }, [captureError]);

  const value: ErrorContextType = {
    errors: errorState.errors.filter(e => !e.dismissed),
    captureError,
    dismissError,
    clearErrors,
    recoverFromError,
    handleAsyncError
  };

  return (
    <ErrorContext.Provider value={value}>
      {children}
    </ErrorContext.Provider>
  );
}

/**
 * Hook to use error context
 */
export function useError() {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
}

/**
 * Hook to handle errors in a component
 */
export function useErrorHandler() {
  const { captureError, handleAsyncError } = useError();

  const handleError = useCallback((error: Error | AppError, options?: ErrorCaptureOptions) => {
    return captureError(error, options);
  }, [captureError]);

  const handleAsyncOperation = useCallback(async <T,>(
    operation: () => Promise<T>,
    errorOptions?: ErrorCaptureOptions
  ): Promise<T | undefined> => {
    try {
      return await operation();
    } catch (error) {
      captureError(error as Error, errorOptions);
      return undefined;
    }
  }, [captureError]);

  return {
    handleError,
    handleAsyncError,
    handleAsyncOperation
  };
}

/**
 * Hook for form error handling
 */
export function useFormErrorHandler(formName: string) {
  const { captureError } = useError();

  const handleFormError = useCallback((
    error: Error | AppError,
    fieldErrors?: Record<string, string[]>
  ) => {
    return captureError(error, {
      notify: true,
      context: {
        form: formName,
        fieldErrors,
        type: 'form_error'
      }
    });
  }, [captureError, formName]);

  return { handleFormError };
}

/**
 * Hook for API error handling
 */
export function useAPIErrorHandler() {
  const { captureError } = useError();

  const handleAPIError = useCallback((
    error: Error | AppError,
    endpoint: string,
    method: string = 'GET'
  ) => {
    const appError = isAppError(error) ? error : errorUtils.parseAPIError(error, endpoint);
    
    return captureError(appError, {
      notify: true,
      context: {
        endpoint,
        method,
        type: 'api_error'
      }
    });
  }, [captureError]);

  return { handleAPIError };
}