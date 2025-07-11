'use client';

import { createContext, useContext } from 'react';
import type { ErrorBoundaryContextValue } from './types';

export const ErrorBoundaryContext = createContext<ErrorBoundaryContextValue | null>(null);

export function useErrorBoundaryContext() {
  const context = useContext(ErrorBoundaryContext);
  if (!context) {
    throw new Error('useErrorBoundaryContext must be used within an ErrorBoundary');
  }
  return context;
}

// Hook to check if we're inside an error boundary
export function useIsInsideErrorBoundary() {
  const context = useContext(ErrorBoundaryContext);
  return context !== null;
}