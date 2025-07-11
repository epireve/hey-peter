'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { ErrorBoundary } from '@/components/error-boundary';

// Import services
import { loggingService } from '@/lib/services/logging-service';
import { errorTrackingService } from '@/lib/services/error-tracking-service';
import { performanceTrackingService } from '@/lib/services/performance-tracking-service';
import { userActionTrackingService } from '@/lib/services/user-action-tracking-service';
import { errorAlertingService } from '@/lib/services/error-alerting-service';

interface ErrorTrackingContextType {
  initialized: boolean;
  trackUserAction: (action: string, data?: Record<string, any>) => void;
  trackError: (error: Error, context?: Record<string, any>) => string;
  trackPerformance: (name: string, value: number, unit?: string) => void;
  setUserContext: (user: { id: string; email?: string; username?: string }) => void;
}

const ErrorTrackingContext = createContext<ErrorTrackingContextType | undefined>(undefined);

interface ErrorTrackingProviderProps {
  children: React.ReactNode;
}

export function ErrorTrackingProvider({ children }: ErrorTrackingProviderProps) {
  const [initialized, setInitialized] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    initializeErrorTracking();
  }, []);

  useEffect(() => {
    if (user && initialized) {
      updateUserContext(user);
    }
  }, [user, initialized]);

  const initializeErrorTracking = async () => {
    try {
      // Set up user context if available
      if (user) {
        updateUserContext(user);
      }

      // Set environment context
      errorTrackingService.setExtra('environment', process.env.NODE_ENV || 'development');
      errorTrackingService.setExtra('userAgent', navigator.userAgent);
      errorTrackingService.setExtra('url', window.location.href);

      // Add initial breadcrumb
      errorTrackingService.addBreadcrumb(
        'Application',
        'Error tracking initialized',
        {
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        }
      );

      // Track initial page load performance
      if (typeof window !== 'undefined' && 'performance' in window) {
        window.addEventListener('load', () => {
          setTimeout(() => {
            const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
            if (navigation) {
              const loadTime = navigation.loadEventEnd - navigation.navigationStart;
              performanceTrackingService.recordMetric(
                'page_load_time',
                loadTime,
                performanceTrackingService.PerformanceCategory?.PAGE_LOAD || 'page_load' as any,
                {
                  url: window.location.href,
                  referrer: document.referrer
                }
              );
            }
          }, 0);
        });
      }

      setInitialized(true);
    } catch (error) {
      console.error('Failed to initialize error tracking:', error);
    }
  };

  const updateUserContext = (user: any) => {
    const userInfo = {
      id: user.id,
      email: user.email,
      username: user.user_metadata?.username || user.email?.split('@')[0]
    };

    // Update error tracking context
    errorTrackingService.setUser(userInfo);
    
    // Update user action tracking
    userActionTrackingService.trackCustomEvent('user_context_updated', {
      userId: user.id,
      email: user.email
    });

    // Add breadcrumb
    errorTrackingService.addBreadcrumb(
      'Authentication',
      'User context updated',
      {
        userId: user.id,
        email: user.email
      }
    );
  };

  const trackUserAction = (action: string, data?: Record<string, any>) => {
    if (!initialized) return;
    
    userActionTrackingService.trackCustomEvent(action, data);
    
    // Also add as breadcrumb for error context
    errorTrackingService.addBreadcrumb(
      'User Action',
      action,
      data
    );
  };

  const trackError = (error: Error, context?: Record<string, any>) => {
    if (!initialized) return '';
    
    return errorTrackingService.captureException(error, {
      tags: ['manual'],
      extra: context
    });
  };

  const trackPerformance = (name: string, value: number, unit: string = 'ms') => {
    if (!initialized) return;
    
    performanceTrackingService.trackCustomMetric(name, value, unit);
  };

  const setUserContext = (userInfo: { id: string; email?: string; username?: string }) => {
    if (!initialized) return;
    
    errorTrackingService.setUser(userInfo);
  };

  const contextValue: ErrorTrackingContextType = {
    initialized,
    trackUserAction,
    trackError,
    trackPerformance,
    setUserContext
  };

  return (
    <ErrorTrackingContext.Provider value={contextValue}>
      <ErrorBoundary
        level="page"
        showErrorDetails={process.env.NODE_ENV === 'development'}
        onError={(error, errorInfo) => {
          if (initialized) {
            errorTrackingService.captureException(error, {
              tags: ['react-error-boundary', 'page-level'],
              extra: {
                componentStack: errorInfo.componentStack
              }
            });
          }
        }}
      >
        {children}
      </ErrorBoundary>
    </ErrorTrackingContext.Provider>
  );
}

export function useErrorTracking(): ErrorTrackingContextType {
  const context = useContext(ErrorTrackingContext);
  if (context === undefined) {
    throw new Error('useErrorTracking must be used within an ErrorTrackingProvider');
  }
  return context;
}

// Hook for tracking component mount/unmount
export function useComponentTracking(componentName: string) {
  const { trackUserAction, initialized } = useErrorTracking();

  useEffect(() => {
    if (initialized) {
      trackUserAction('component_mount', { component: componentName });
      
      return () => {
        trackUserAction('component_unmount', { component: componentName });
      };
    }
  }, [componentName, trackUserAction, initialized]);
}

// Hook for tracking API calls
export function useAPITracking() {
  const { trackUserAction, trackError, trackPerformance, initialized } = useErrorTracking();

  const trackAPICall = async <T>(
    apiCall: () => Promise<T>,
    endpoint: string,
    method: string = 'GET'
  ): Promise<T> => {
    if (!initialized) return apiCall();

    const startTime = Date.now();
    
    try {
      trackUserAction('api_call_start', { endpoint, method });
      
      const result = await apiCall();
      const duration = Date.now() - startTime;
      
      trackUserAction('api_call_success', { 
        endpoint, 
        method, 
        duration 
      });
      
      trackPerformance(`api_${method.toLowerCase()}_${endpoint.replace(/\//g, '_')}`, duration);
      
      // Track slow API calls
      if (duration > 2000) {
        trackUserAction('api_call_slow', { 
          endpoint, 
          method, 
          duration 
        });
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      trackError(error as Error, {
        endpoint,
        method,
        duration,
        type: 'api_error'
      });
      
      trackUserAction('api_call_error', { 
        endpoint, 
        method, 
        duration,
        error: (error as Error).message 
      });
      
      throw error;
    }
  };

  return { trackAPICall };
}

// Hook for tracking form submissions
export function useFormTracking(formName: string) {
  const { trackUserAction, trackError, initialized } = useErrorTracking();

  const trackFormStart = () => {
    if (initialized) {
      trackUserAction('form_start', { form: formName });
    }
  };

  const trackFormSubmit = (data?: Record<string, any>) => {
    if (initialized) {
      trackUserAction('form_submit', { 
        form: formName,
        ...data 
      });
    }
  };

  const trackFormError = (error: Error, fieldErrors?: Record<string, string>) => {
    if (initialized) {
      trackError(error, {
        form: formName,
        fieldErrors,
        type: 'form_error'
      });
      
      trackUserAction('form_error', { 
        form: formName,
        error: error.message,
        fieldErrors 
      });
    }
  };

  const trackFormSuccess = (data?: Record<string, any>) => {
    if (initialized) {
      trackUserAction('form_success', { 
        form: formName,
        ...data 
      });
    }
  };

  return {
    trackFormStart,
    trackFormSubmit,
    trackFormError,
    trackFormSuccess
  };
}

export default ErrorTrackingProvider;