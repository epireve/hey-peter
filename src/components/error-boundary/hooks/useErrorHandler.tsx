'use client';

import { useCallback, useState } from 'react';
import { errorTrackingService } from '@/lib/services/error-tracking-service';
import { error } from '@/lib/services';
import { toast } from 'sonner';

interface ErrorHandlerOptions {
  fallbackAction?: () => void;
  showToast?: boolean;
  toastMessage?: string;
  rethrow?: boolean;
  context?: Record<string, any>;
}

export function useErrorHandler() {
  const [error, setError] = useState<Error | null>(null);
  const [isError, setIsError] = useState(false);

  const resetError = useCallback(() => {
    setError(null);
    setIsError(false);
  }, []);

  const handleError = useCallback((
    error: Error | unknown,
    options: ErrorHandlerOptions = {}
  ) => {
    const {
      fallbackAction,
      showToast = true,
      toastMessage,
      rethrow = false,
      context = {}
    } = options;

    // Ensure we have an Error object
    const errorObj = error instanceof Error 
      ? error 
      : new Error(String(error));

    // Track the error
    const errorId = errorTrackingService.captureException(errorObj, {
      tags: ['user-error-handler'],
      extra: {
        ...context,
        handlerOptions: {
          showToast,
          toastMessage,
          rethrow
        }
      }
    });

    // Update state
    setError(errorObj);
    setIsError(true);

    // Show toast notification if enabled
    if (showToast) {
      toast.error(toastMessage || errorObj.message || 'An error occurred', {
        description: `Error ID: ${errorId}`,
        action: fallbackAction ? {
          label: 'Retry',
          onClick: fallbackAction
        } : undefined
      });
    }

    // Execute fallback action
    if (fallbackAction) {
      try {
        fallbackAction();
      } catch (fallbackError) {
        error('Fallback action failed:', { error: fallbackError });
      }
    }

    // Add breadcrumb
    errorTrackingService.addBreadcrumb(
      'Error Handler',
      'Error handled by useErrorHandler',
      {
        errorId,
        errorMessage: errorObj.message,
        showToast,
        hasCallback: !!fallbackAction
      },
      'error'
    );

    // Rethrow if requested (useful for error boundaries)
    if (rethrow) {
      throw errorObj;
    }

    return errorId;
  }, []);

  const handleAsyncError = useCallback(async <T,>(
    promise: Promise<T>,
    options: ErrorHandlerOptions = {}
  ): Promise<T | null> => {
    try {
      return await promise;
    } catch (error) {
      handleError(error, options);
      return null;
    }
  }, [handleError]);

  return {
    error,
    isError,
    resetError,
    handleError,
    handleAsyncError
  };
}