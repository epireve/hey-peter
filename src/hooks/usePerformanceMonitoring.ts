import { logger } from '@/lib/services';
/**
 * React Hooks for Performance Monitoring
 * 
 * Provides React-specific hooks for tracking performance, user journeys,
 * alerts, and insights in components.
 */

import React from 'react';
import {
  enhancedPerformanceMonitor,
  type PerformanceAlert,
  type PerformanceInsight,
  type AlertSeverity,
  type UserJourneyType,
  type MetricType
} from '@/lib/utils/enhanced-performance-monitor';

// =====================================================================================
// PERFORMANCE TRACKING HOOKS
// =====================================================================================

/**
 * Enhanced React hook for tracking render performance
 */
export function useRenderTracking(componentName: string, metadata?: Record<string, any>) {
  const renderStart = React.useRef(performance.now());
  const mountTime = React.useRef(Date.now());
  
  // Track render on every render
  React.useEffect(() => {
    const renderDuration = performance.now() - renderStart.current;
    
    enhancedPerformanceMonitor.trackRender(componentName, () => {
      // This callback is empty since we're measuring the effect itself
    });
    
    // Reset render start time for next render
    renderStart.current = performance.now();
  });
  
  // Track mount time
  React.useEffect(() => {
    const mountDuration = Date.now() - mountTime.current;
    
    enhancedPerformanceMonitor['addEntry']({
      name: `${componentName}_mount`,
      type: 'render',
      duration: mountDuration,
      timestamp: Date.now(),
      sessionId: enhancedPerformanceMonitor['sessionId'],
      userId: enhancedPerformanceMonitor['userId'],
      url: typeof window !== 'undefined' ? window.location.href : '',
      metadata: { ...metadata, phase: 'mount' }
    });
    
    return () => {
      // Track unmount
      enhancedPerformanceMonitor['addEntry']({
        name: `${componentName}_unmount`,
        type: 'render',
        duration: 0,
        timestamp: Date.now(),
        sessionId: enhancedPerformanceMonitor['sessionId'],
        userId: enhancedPerformanceMonitor['userId'],
        url: typeof window !== 'undefined' ? window.location.href : '',
        metadata: { ...metadata, phase: 'unmount' }
      });
    };
  }, [componentName, metadata]);
}

/**
 * Hook for tracking user interactions
 */
export function useInteractionTracking(interactionName: string) {
  const trackInteraction = React.useCallback((metadata?: Record<string, any>) => {
    const start = performance.now();
    
    return {
      finish: (additionalMetadata?: Record<string, any>) => {
        const duration = performance.now() - start;
        
        enhancedPerformanceMonitor['addEntry']({
          name: interactionName,
          type: 'interaction',
          duration,
          timestamp: Date.now(),
          sessionId: enhancedPerformanceMonitor['sessionId'],
          userId: enhancedPerformanceMonitor['userId'],
          url: typeof window !== 'undefined' ? window.location.href : '',
          metadata: { ...metadata, ...additionalMetadata }
        });
      }
    };
  }, [interactionName]);
  
  return trackInteraction;
}

/**
 * Hook for tracking user journeys
 */
export function useUserJourney(journeyType: UserJourneyType) {
  const journeyRef = React.useRef<string | null>(null);
  
  const startJourney = React.useCallback((metadata?: Record<string, any>) => {
    journeyRef.current = enhancedPerformanceMonitor.startUserJourney(journeyType, metadata);
    return journeyRef.current;
  }, [journeyType]);
  
  const addStep = React.useCallback((stepName: string, metadata?: Record<string, any>) => {
    if (journeyRef.current) {
      enhancedPerformanceMonitor.addJourneyStep(journeyRef.current, stepName, metadata);
    }
  }, []);
  
  const completeJourney = React.useCallback((metadata?: Record<string, any>) => {
    if (journeyRef.current) {
      enhancedPerformanceMonitor.completeUserJourney(journeyRef.current, metadata);
      journeyRef.current = null;
    }
  }, []);
  
  const abandonJourney = React.useCallback((reason: string) => {
    if (journeyRef.current) {
      enhancedPerformanceMonitor.abandonUserJourney(journeyRef.current, reason);
      journeyRef.current = null;
    }
  }, []);
  
  // Auto-abandon on unmount if not completed
  React.useEffect(() => {
    return () => {
      if (journeyRef.current) {
        enhancedPerformanceMonitor.abandonUserJourney(journeyRef.current, 'component_unmount');
      }
    };
  }, []);
  
  return {\n    startJourney,\n    addStep,\n    completeJourney,\n    abandonJourney,\n    journeyId: journeyRef.current\n  };\n}\n\n/**\n * Hook for subscribing to performance alerts\n */\nexport function usePerformanceAlerts(severity?: AlertSeverity) {\n  const [alerts, setAlerts] = React.useState<PerformanceAlert[]>([]);\n  \n  React.useEffect(() => {\n    const updateAlerts = () => {\n      setAlerts(enhancedPerformanceMonitor.getAlerts(severity));\n    };\n    \n    // Initial load\n    updateAlerts();\n    \n    // Subscribe to new alerts\n    const unsubscribe = enhancedPerformanceMonitor.onAlert((alert) => {\n      if (!severity || alert.severity === severity) {\n        updateAlerts();\n      }\n    });\n    \n    return unsubscribe;\n  }, [severity]);\n  \n  const acknowledgeAlert = React.useCallback((alertId: string) => {\n    enhancedPerformanceMonitor.acknowledgeAlert(alertId);\n    setAlerts(prev => prev.filter(alert => alert.id !== alertId));\n  }, []);\n  \n  return {\n    alerts,\n    acknowledgeAlert\n  };\n}\n\n/**\n * Hook for performance insights\n */\nexport function usePerformanceInsights(category?: PerformanceInsight['category']) {\n  const [insights, setInsights] = React.useState<PerformanceInsight[]>([]);\n  \n  React.useEffect(() => {\n    const updateInsights = () => {\n      setInsights(enhancedPerformanceMonitor.getInsights(category));\n    };\n    \n    // Initial load\n    updateInsights();\n    \n    // Subscribe to new insights\n    const unsubscribe = enhancedPerformanceMonitor.onInsight((insight) => {\n      if (!category || insight.category === category) {\n        updateInsights();\n      }\n    });\n    \n    return unsubscribe;\n  }, [category]);\n  \n  return insights;\n}\n\n/**\n * Hook for overall performance monitoring\n */\nexport function usePerformanceMonitoring() {\n  const [performanceData, setPerformanceData] = React.useState({\n    score: 100,\n    alerts: [] as PerformanceAlert[],\n    insights: [] as PerformanceInsight[],\n    webVitals: {},\n    stats: {},\n    recommendations: [] as string[],\n    riskFactors: [] as Array<{ factor: string; severity: AlertSeverity; description: string }>\n  });\n  \n  React.useEffect(() => {\n    const updatePerformanceData = () => {\n      const analysis = enhancedPerformanceMonitor.analyzePerformance();\n      setPerformanceData({\n        score: analysis.score,\n        alerts: analysis.alerts,\n        insights: analysis.insights,\n        webVitals: analysis.webVitals,\n        stats: enhancedPerformanceMonitor.getStats() || {},\n        recommendations: analysis.recommendations,\n        riskFactors: analysis.riskFactors\n      });\n    };\n    \n    // Initial load\n    updatePerformanceData();\n    \n    // Update every 30 seconds\n    const interval = setInterval(updatePerformanceData, 30000);\n    \n    return () => clearInterval(interval);\n  }, []);\n  \n  return performanceData;\n}\n\n/**\n * Hook for tracking expensive computations\n */\nexport function useTrackedMemo<T>(\n  factory: () => T,\n  deps: React.DependencyList,\n  name: string,\n  metadata?: Record<string, any>\n): T {\n  return React.useMemo(() => {\n    const start = performance.now();\n    let result: T;\n    let error: Error | null = null;\n    \n    try {\n      result = factory();\n    } catch (e) {\n      error = e as Error;\n      throw e;\n    } finally {\n      const duration = performance.now() - start;\n      \n      enhancedPerformanceMonitor['addEntry']({\n        name,\n        type: 'render',\n        duration,\n        timestamp: Date.now(),\n        sessionId: enhancedPerformanceMonitor['sessionId'],\n        userId: enhancedPerformanceMonitor['userId'],\n        url: typeof window !== 'undefined' ? window.location.href : '',\n        metadata: {\n          ...metadata,\n          computationType: 'memo',\n          dependencyCount: deps.length,\n          error: error ? true : false\n        },\n        errorDetails: error ? {\n          message: error.message,\n          stack: error.stack\n        } : undefined\n      });\n      \n      if (duration > 10) {\n        logger.warn(\n          `[Performance] Slow computation in ${name}: ${duration.toFixed(2)}ms`\n        );\n      }\n    }\n\n    return result!;\n  }, deps);\n}\n\n/**\n * Hook for tracking callback performance\n */\nexport function useTrackedCallback<T extends (...args: any[]) => any>(\n  callback: T,\n  deps: React.DependencyList,\n  name: string\n): T {\n  return React.useCallback((...args: Parameters<T>) => {\n    const start = performance.now();\n    let result: ReturnType<T>;\n    let error: Error | null = null;\n    \n    try {\n      result = callback(...args);\n    } catch (e) {\n      error = e as Error;\n      throw e;\n    } finally {\n      const duration = performance.now() - start;\n      \n      enhancedPerformanceMonitor['addEntry']({\n        name,\n        type: 'interaction',\n        duration,\n        timestamp: Date.now(),\n        sessionId: enhancedPerformanceMonitor['sessionId'],\n        userId: enhancedPerformanceMonitor['userId'],\n        url: typeof window !== 'undefined' ? window.location.href : '',\n        metadata: {\n          callbackType: 'useCallback',\n          argumentCount: args.length,\n          error: error ? true : false\n        },\n        errorDetails: error ? {\n          message: error.message,\n          stack: error.stack\n        } : undefined\n      });\n    }\n    \n    return result;\n  }, deps) as T;\n}\n\n/**\n * Hook for tracking effect performance\n */\nexport function useTrackedEffect(\n  effect: React.EffectCallback,\n  deps: React.DependencyList,\n  name: string\n) {\n  React.useEffect(() => {\n    const start = performance.now();\n    let cleanup: void | (() => void);\n    let error: Error | null = null;\n    \n    try {\n      cleanup = effect();\n    } catch (e) {\n      error = e as Error;\n      throw e;\n    } finally {\n      const duration = performance.now() - start;\n      \n      enhancedPerformanceMonitor['addEntry']({\n        name,\n        type: 'render',\n        duration,\n        timestamp: Date.now(),\n        sessionId: enhancedPerformanceMonitor['sessionId'],\n        userId: enhancedPerformanceMonitor['userId'],\n        url: typeof window !== 'undefined' ? window.location.href : '',\n        metadata: {\n          effectType: 'useEffect',\n          dependencyCount: deps.length,\n          hasCleanup: typeof cleanup === 'function',\n          error: error ? true : false\n        },\n        errorDetails: error ? {\n          message: error.message,\n          stack: error.stack\n        } : undefined\n      });\n    }\n    \n    return cleanup;\n  }, deps);\n}\n\n// =====================================================================================\n// HIGHER-ORDER COMPONENTS\n// =====================================================================================\n\n/**\n * Enhanced HOC for tracking component performance\n */\nexport function withPerformanceTracking<P extends object>(\n  Component: React.ComponentType<P>,\n  componentName: string,\n  trackingOptions?: {\n    trackProps?: boolean;\n    trackRenders?: boolean;\n    trackInteractions?: boolean;\n  }\n) {\n  const options = {\n    trackProps: true,\n    trackRenders: true,\n    trackInteractions: false,\n    ...trackingOptions\n  };\n  \n  return React.memo((props: P) => {\n    if (options.trackRenders) {\n      useRenderTracking(componentName, {\n        propsCount: options.trackProps ? Object.keys(props).length : undefined\n      });\n    }\n    \n    // Track prop changes that might affect performance\n    const prevPropsRef = React.useRef<P>();\n    React.useEffect(() => {\n      if (options.trackProps && prevPropsRef.current) {\n        const changedProps = Object.keys(props).filter(\n          key => (props as any)[key] !== (prevPropsRef.current as any)[key]\n        );\n        \n        if (changedProps.length > 0) {\n          enhancedPerformanceMonitor['addEntry']({\n            name: `${componentName}_prop_change`,\n            type: 'render',\n            duration: 0,\n            timestamp: Date.now(),\n            sessionId: enhancedPerformanceMonitor['sessionId'],\n            userId: enhancedPerformanceMonitor['userId'],\n            url: typeof window !== 'undefined' ? window.location.href : '',\n            metadata: {\n              changedProps,\n              propCount: Object.keys(props).length\n            }\n          });\n        }\n      }\n      \n      prevPropsRef.current = props;\n    });\n    \n    return React.createElement(Component, props);\n  });\n}\n\n// =====================================================================================\n// UTILITY HOOKS\n// =====================================================================================\n\n/**\n * Hook for getting current performance score\n */\nexport function usePerformanceScore() {\n  const [score, setScore] = React.useState(100);\n  \n  React.useEffect(() => {\n    const updateScore = () => {\n      setScore(enhancedPerformanceMonitor.getPerformanceScore());\n    };\n    \n    updateScore();\n    const interval = setInterval(updateScore, 10000); // Update every 10 seconds\n    \n    return () => clearInterval(interval);\n  }, []);\n  \n  return score;\n}\n\n/**\n * Hook for getting Web Vitals data\n */\nexport function useWebVitals() {\n  const [webVitals, setWebVitals] = React.useState({});\n  \n  React.useEffect(() => {\n    const updateWebVitals = () => {\n      setWebVitals(enhancedPerformanceMonitor.getWebVitalsStats());\n    };\n    \n    updateWebVitals();\n    const interval = setInterval(updateWebVitals, 30000); // Update every 30 seconds\n    \n    return () => clearInterval(interval);\n  }, []);\n  \n  return webVitals;\n}\n\n/**\n * Hook for getting bundle metrics\n */\nexport function useBundleMetrics() {\n  const [bundleMetrics, setBundleMetrics] = React.useState(null);\n  \n  React.useEffect(() => {\n    const measureBundle = () => {\n      const metrics = enhancedPerformanceMonitor.measureBundleSize();\n      setBundleMetrics(metrics);\n    };\n    \n    // Measure on mount and after load\n    if (document.readyState === 'complete') {\n      measureBundle();\n    } else {\n      window.addEventListener('load', measureBundle);\n      return () => window.removeEventListener('load', measureBundle);\n    }\n  }, []);\n  \n  return bundleMetrics;\n}\n\n/**\n * Hook for real-time performance monitoring with custom thresholds\n */\nexport function usePerformanceThresholds(thresholds: {\n  slowRender?: number;\n  slowAPI?: number;\n  slowQuery?: number;\n  highErrorRate?: number;\n  lowPerformanceScore?: number;\n}) {\n  React.useEffect(() => {\n    enhancedPerformanceMonitor.setThresholds(thresholds);\n  }, [thresholds]);\n}\n\n/**\n * Hook for tracking form performance\n */\nexport function useFormPerformance(formName: string) {\n  const startTime = React.useRef<number | null>(null);\n  const fieldInteractions = React.useRef<Record<string, number>>({});\n  \n  const startForm = React.useCallback(() => {\n    startTime.current = Date.now();\n    fieldInteractions.current = {};\n  }, []);\n  \n  const trackFieldInteraction = React.useCallback((fieldName: string) => {\n    if (!fieldInteractions.current[fieldName]) {\n      fieldInteractions.current[fieldName] = Date.now();\n    }\n  }, []);\n  \n  const submitForm = React.useCallback((success: boolean, metadata?: Record<string, any>) => {\n    if (startTime.current) {\n      const duration = Date.now() - startTime.current;\n      const fieldCount = Object.keys(fieldInteractions.current).length;\n      \n      enhancedPerformanceMonitor['addEntry']({\n        name: `${formName}_submission`,\n        type: 'user_journey',\n        duration,\n        timestamp: Date.now(),\n        sessionId: enhancedPerformanceMonitor['sessionId'],\n        userId: enhancedPerformanceMonitor['userId'],\n        url: typeof window !== 'undefined' ? window.location.href : '',\n        metadata: {\n          ...metadata,\n          success,\n          fieldCount,\n          averageFieldTime: fieldCount > 0 ? duration / fieldCount : 0,\n          fieldInteractions: fieldInteractions.current\n        }\n      });\n      \n      startTime.current = null;\n      fieldInteractions.current = {};\n    }\n  }, [formName]);\n  \n  return {\n    startForm,\n    trackFieldInteraction,\n    submitForm\n  };\n}\n\n// =====================================================================================\n// UTILITY FUNCTIONS\n// =====================================================================================\n\n/**\n * Track a one-off operation\n */\nexport function trackOperation<T>(\n  operationName: string,\n  operation: () => T,\n  metadata?: Record<string, any>\n): T {\n  const start = performance.now();\n  let result: T;\n  let error: Error | null = null;\n  \n  try {\n    result = operation();\n  } catch (e) {\n    error = e as Error;\n    throw e;\n  } finally {\n    const duration = performance.now() - start;\n    \n    enhancedPerformanceMonitor['addEntry']({\n      name: operationName,\n      type: 'render',\n      duration,\n      timestamp: Date.now(),\n      sessionId: enhancedPerformanceMonitor['sessionId'],\n      userId: enhancedPerformanceMonitor['userId'],\n      url: typeof window !== 'undefined' ? window.location.href : '',\n      metadata,\n      errorDetails: error ? {\n        message: error.message,\n        stack: error.stack\n      } : undefined\n    });\n  }\n  \n  return result!;\n}\n\n/**\n * Track an async operation\n */\nexport function trackAsyncOperation<T>(\n  operationName: string,\n  operation: () => Promise<T>,\n  metadata?: Record<string, any>\n): Promise<T> {\n  return enhancedPerformanceMonitor.trackAPI(operationName, operation, metadata);\n}\n\n/**\n * Track a database query\n */\nexport function trackQuery<T>(\n  queryName: string,\n  query: () => Promise<T>,\n  metadata?: Record<string, any>\n): Promise<T> {\n  return enhancedPerformanceMonitor.trackQuery(queryName, query, metadata);\n}\n\n/**\n * Get current performance snapshot\n */\nexport function getPerformanceSnapshot() {\n  return enhancedPerformanceMonitor.export();\n}\n\n/**\n * Force performance analysis\n */\nexport function analyzePerformance() {\n  return enhancedPerformanceMonitor.analyzePerformance();\n}