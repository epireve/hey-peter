'use client';

import { logger } from '@/lib/services';

import React, { lazy, ComponentType, LazyExoticComponent } from 'react';
import { LoadingBoundary, DashboardLoader, AnalyticsLoader, TableLoader, FormLoader, SettingsLoader } from '@/components/ui/loading-boundary';
import { ErrorBoundary, DashboardErrorBoundary, AnalyticsErrorBoundary, FormErrorBoundary, TableErrorBoundary } from '@/components/ui/error-boundary';

// Types for different loading contexts
export type LoadingContext = 
  | 'dashboard'
  | 'analytics' 
  | 'table'
  | 'form'
  | 'settings'
  | 'default';

export type ErrorContext = 
  | 'dashboard'
  | 'analytics'
  | 'form'
  | 'table'
  | 'default';

interface LazyOptions {
  loadingContext?: LoadingContext;
  errorContext?: ErrorContext;
  preload?: boolean;
  retry?: number;
  customLoader?: React.ComponentType;
  customErrorBoundary?: React.ComponentType<{ children: React.ReactNode }>;
  resetKeys?: Array<string | number>;
}

interface RetryableImportOptions {
  retry?: number;
  delay?: number;
}

// Utility to create retryable imports for better resilience
const createRetryableImport = <T>(
  importFn: () => Promise<T>,
  options: RetryableImportOptions = {}
): (() => Promise<T>) => {
  const { retry = 3, delay = 1000 } = options;
  
  return async (): Promise<T> => {
    let lastError: Error;
    
    for (let i = 0; i <= retry; i++) {
      try {
        return await importFn();
      } catch (error) {
        lastError = error as Error;
        
        if (i < retry) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
          logger.warn(`Import failed, retrying (${i + 1}/${retry})...`, error);
        }
      }
    }
    
    throw lastError!;
  };
};

// Get appropriate loading component based on context
const getLoadingComponent = (context: LoadingContext): React.ComponentType => {
  switch (context) {
    case 'dashboard':
      return DashboardLoader;
    case 'analytics':
      return AnalyticsLoader;
    case 'table':
      return TableLoader;
    case 'form':
      return FormLoader;
    case 'settings':
      return SettingsLoader;
    default:
      return () => <LoadingBoundary type="spinner" />;
  }
};

// Get appropriate error boundary based on context
const getErrorBoundary = (context: ErrorContext): React.ComponentType<{ children: React.ReactNode }> => {
  switch (context) {
    case 'dashboard':
      return DashboardErrorBoundary;
    case 'analytics':
      return AnalyticsErrorBoundary;
    case 'form':
      return FormErrorBoundary;
    case 'table':
      return TableErrorBoundary;
    default:
      return ({ children }) => <ErrorBoundary>{children}</ErrorBoundary>;
  }
};

// Main lazy factory function
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyOptions = {}
): LazyExoticComponent<T> {
  const {
    loadingContext = 'default',
    errorContext = 'default',
    preload = false,
    retry = 3,
    customLoader,
    customErrorBoundary,
    resetKeys
  } = options;

  // Create retryable import
  const retryableImport = createRetryableImport(importFn, { retry });

  // Create lazy component
  const LazyComponent = lazy(retryableImport);

  // Preload if requested
  if (preload && typeof window !== 'undefined') {
    // Preload after a short delay to not block initial render
    setTimeout(() => {
      retryableImport().catch(error => {
        logger.warn('Preload failed for component:', error);
      });
    }, 100);
  }

  // Get components
  const LoadingComponent = customLoader || getLoadingComponent(loadingContext);
  const ErrorBoundaryComponent = customErrorBoundary || getErrorBoundary(errorContext);

  // Create wrapped component
  const WrappedComponent = React.forwardRef<any, any>((props, ref) => (
    <ErrorBoundaryComponent>
      <LoadingBoundary fallback={<LoadingComponent />}>
        <LazyComponent {...props} ref={ref} />
      </LoadingBoundary>
    </ErrorBoundaryComponent>
  ));

  WrappedComponent.displayName = `Lazy(${LazyComponent.displayName || 'Component'})`;

  return WrappedComponent as LazyExoticComponent<T>;
}

// Specialized factories for different component types

// Admin dashboard components
export const createLazyAdminComponent = <T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: Omit<LazyOptions, 'loadingContext' | 'errorContext'> = {}
) => createLazyComponent(importFn, {
  ...options,
  loadingContext: 'dashboard',
  errorContext: 'dashboard'
});

// Analytics components
export const createLazyAnalyticsComponent = <T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: Omit<LazyOptions, 'loadingContext' | 'errorContext'> = {}
) => createLazyComponent(importFn, {
  ...options,
  loadingContext: 'analytics',
  errorContext: 'analytics'
});

// Table components
export const createLazyTableComponent = <T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: Omit<LazyOptions, 'loadingContext' | 'errorContext'> = {}
) => createLazyComponent(importFn, {
  ...options,
  loadingContext: 'table',
  errorContext: 'table'
});

// Form components
export const createLazyFormComponent = <T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: Omit<LazyOptions, 'loadingContext' | 'errorContext'> = {}
) => createLazyComponent(importFn, {
  ...options,
  loadingContext: 'form',
  errorContext: 'form'
});

// Student components
export const createLazyStudentComponent = <T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyOptions = {}
) => createLazyComponent(importFn, {
  ...options,
  loadingContext: options.loadingContext || 'default',
  errorContext: options.errorContext || 'default'
});

// Teacher components
export const createLazyTeacherComponent = <T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyOptions = {}
) => createLazyComponent(importFn, {
  ...options,
  loadingContext: options.loadingContext || 'default',
  errorContext: options.errorContext || 'default'
});

// Heavy library imports with dynamic loading
export const createLazyLibraryImport = <T>(
  importFn: () => Promise<T>,
  options: RetryableImportOptions = {}
) => {
  return createRetryableImport(importFn, options);
};

// Utility to preload components based on route or user interaction
export const preloadComponent = (
  importFn: () => Promise<any>,
  delay: number = 0
): void => {
  if (typeof window === 'undefined') return;

  setTimeout(() => {
    importFn().catch(error => {
      logger.warn('Component preload failed:', error);
    });
  }, delay);
};

// Intersection Observer based preloading
export const useIntersectionPreload = (
  importFn: () => Promise<any>,
  threshold: number = 0.1
) => {
  const ref = React.useRef<HTMLElement>(null);
  const [hasPreloaded, setHasPreloaded] = React.useState(false);

  React.useEffect(() => {
    const element = ref.current;
    if (!element || hasPreloaded) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !hasPreloaded) {
          setHasPreloaded(true);
          importFn().catch(error => {
            logger.warn('Intersection preload failed:', error);
          });
        }
      },
      { threshold }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [importFn, threshold, hasPreloaded]);

  return ref;
};

// Hook for component preloading based on user actions
export const useHoverPreload = (importFn: () => Promise<any>) => {
  const [hasPreloaded, setHasPreloaded] = React.useState(false);

  const handleMouseEnter = React.useCallback(() => {
    if (!hasPreloaded) {
      setHasPreloaded(true);
      importFn().catch(error => {
        logger.warn('Hover preload failed:', error);
      });
    }
  }, [importFn, hasPreloaded]);

  return { onMouseEnter: handleMouseEnter };
};

// Bundle analyzer helper for development
export const logChunkInfo = (componentName: string) => {
  if (process.env.NODE_ENV === 'development') {
    logger.info(`Loading chunk for: ${componentName}`);
  }
};

// Export utilities
export {
  createRetryableImport,
  getLoadingComponent,
  getErrorBoundary
};

export default createLazyComponent;