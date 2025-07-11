// Main error boundary components
export { 
  GlobalErrorBoundary,
  AppErrorBoundary,
  PageErrorBoundary,
  SectionErrorBoundary,
  ComponentErrorBoundary,
  default as ErrorBoundary
} from './GlobalErrorBoundary';

import { error as logError } from '@/lib/services';

// Context and providers
export { 
  ErrorBoundaryContext,
  useErrorBoundaryContext,
  useIsInsideErrorBoundary
} from './ErrorBoundaryContext';

export { 
  ErrorRecoveryProvider,
  useErrorRecovery
} from './ErrorRecoveryProvider';

// Fallback components
export { DefaultErrorFallback } from './fallbacks/DefaultErrorFallback';
export { PageErrorFallback } from './fallbacks/PageErrorFallback';
export { SectionErrorFallback } from './fallbacks/SectionErrorFallback';
export { ComponentErrorFallback } from './fallbacks/ComponentErrorFallback';
export { NetworkErrorFallback } from './fallbacks/NetworkErrorFallback';
export { ChunkLoadErrorFallback } from './fallbacks/ChunkLoadErrorFallback';

// Hooks
export { useErrorHandler } from './hooks/useErrorHandler';
export { useAsyncError, useAsyncErrorBoundary } from './hooks/useAsyncError';

// Utilities
export * from './utils/errorReporting';

// Types
export type {
  ErrorBoundaryProps,
  ErrorBoundaryState,
  ErrorFallbackProps,
  ErrorLevel,
  ErrorType,
  ErrorAction,
  ErrorRecoveryStrategy,
  ErrorBoundaryContextValue
} from './types';

// HOC for wrapping components with error boundaries
export function withErrorBoundary<T extends object>(
  Component: React.ComponentType<T>,
  errorBoundaryProps?: Omit<import('./types').ErrorBoundaryProps, 'children'>
) {
  const React = require('react');
  const { GlobalErrorBoundary } = require('./GlobalErrorBoundary');
  
  const WrappedComponent = (props: T) => (
    React.createElement(GlobalErrorBoundary, errorBoundaryProps, 
      React.createElement(Component, props)
    )
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Error boundary decorator for class components
export function errorBoundary(
  options?: Omit<import('./types').ErrorBoundaryProps, 'children'>
) {
  return function<T extends React.ComponentClass<any>>(constructor: T): T {
    const React = require('react');
    const { GlobalErrorBoundary } = require('./GlobalErrorBoundary');
    
    class ErrorBoundaryWrapper extends React.Component<any> {
      static displayName = `ErrorBoundary(${constructor.displayName || constructor.name})`;
      
      render() {
        return (
          React.createElement(GlobalErrorBoundary, options,
            React.createElement(constructor, this.props)
          )
        );
      }
    }
    
    return ErrorBoundaryWrapper as any;
  };
}

// Global error boundary setup function
export function setupGlobalErrorBoundary() {
  // Set up global error handlers
  if (typeof window !== 'undefined') {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      logError('Unhandled promise rejection:', { reason: event.reason });
      // You can dispatch a custom event here to trigger error boundaries
      window.dispatchEvent(new CustomEvent('error-boundary:unhandled-rejection', {
        detail: { error: event.reason }
      }));
    });

    // Handle global errors
    window.addEventListener('error', (event) => {
      logError('Global error:', { error: event.error });
      // You can dispatch a custom event here to trigger error boundaries
      window.dispatchEvent(new CustomEvent('error-boundary:global-error', {
        detail: { error: event.error }
      }));
    });

    // Handle React errors (for development)
    if (process.env.NODE_ENV === 'development') {
      const originalConsoleError = console.error;
      console.error = (...args) => {
        const message = args[0];
        if (typeof message === 'string' && message.includes('Warning:')) {
          // This is a React warning, not an error
          originalConsoleError.apply(console, args);
          return;
        }
        
        // Check if this is an uncaught React error
        if (typeof message === 'string' && 
            (message.includes('React') || message.includes('Error:') || message.includes('Uncaught'))) {
          window.dispatchEvent(new CustomEvent('error-boundary:react-error', {
            detail: { 
              error: new Error(message),
              args: args.slice(1) 
            }
          }));
        }
        
        originalConsoleError.apply(console, args);
      };
    }
  }
}