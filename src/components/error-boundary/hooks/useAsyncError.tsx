'use client';

import { useCallback, useState } from 'react';

// Hook to throw errors from async functions that can be caught by error boundaries
export function useAsyncError() {
  const [, setError] = useCallback(
    () => {
      const stateSetter = useState<Error | null>(null)[1];
      return stateSetter;
    },
    []
  )();

  return useCallback(
    (error: Error) => {
      setError(() => {
        throw error;
      });
    },
    [setError]
  );
}

// Helper hook for async operations with error boundary integration
export function useAsyncErrorBoundary() {
  const throwError = useAsyncError();

  const runAsync = useCallback(
    async <T,>(asyncFn: () => Promise<T>): Promise<T | null> => {
      try {
        return await asyncFn();
      } catch (error) {
        throwError(error instanceof Error ? error : new Error(String(error)));
        return null;
      }
    },
    [throwError]
  );

  return { runAsync, throwError };
}