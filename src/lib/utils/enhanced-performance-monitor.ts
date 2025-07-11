/**
 * Comprehensive Performance Monitoring System
 * 
 * Tracks component render times, API calls, Core Web Vitals, user journeys,
 * database queries, and provides real-time analytics and alerting.
 */

import React from "react";
import { supabase } from '@/lib/supabase';

// =====================================================================================
// TYPES AND INTERFACES
// =====================================================================================

export type MetricType = 
  | 'render' 
  | 'api' 
  | 'query' 
  | 'web_vital' 
  | 'user_journey' 
  | 'navigation' 
  | 'interaction' 
  | 'bundle_load' 
  | 'error';

export type WebVitalType = 'LCP' | 'FID' | 'CLS' | 'TTFB' | 'FCP' | 'TTI';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export type UserJourneyType = 
  | 'login' 
  | 'class_booking' 
  | 'student_registration' 
  | 'payment_flow' 
  | 'teacher_onboarding' 
  | 'dashboard_load' 
  | 'report_generation';

export interface PerformanceEntry {
  name: string;
  type: MetricType;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  url?: string;
  errorDetails?: {
    message: string;
    stack?: string;
    componentStack?: string;
  };
}

export interface WebVitalEntry {
  id: string;
  name: WebVitalType;
  value: number;
  delta: number;
  timestamp: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  url: string;
  sessionId: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface UserJourneyEntry {
  id: string;
  type: UserJourneyType;
  startTime: number;
  endTime?: number;
  duration?: number;
  steps: Array<{
    name: string;
    timestamp: number;
    duration?: number;
    metadata?: Record<string, any>;
  }>;
  completed: boolean;
  abandoned: boolean;
  abandonmentReason?: string;
  sessionId: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface PerformanceAlert {
  id: string;
  type: string;
  severity: AlertSeverity;
  message: string;
  threshold: number;
  actualValue: number;
  timestamp: number;
  acknowledged: boolean;
  resolvedAt?: number;
  metadata?: Record<string, any>;
}

export interface BundleMetrics {
  bundleSize: number;
  chunkSizes: Record<string, number>;
  loadTime: number;
  cacheHitRate: number;
  compressionRatio: number;
  analysisDate: string;
}

export interface DatabaseQueryMetric {
  queryId: string;
  query: string;
  duration: number;
  timestamp: number;
  tableName: string;
  operation: 'select' | 'insert' | 'update' | 'delete' | 'rpc';
  rowsAffected?: number;
  cacheHit: boolean;
  error?: boolean;
  errorMessage?: string;
  sessionId: string;
  userId?: string;
}

interface PerformanceBenchmark {
  metric: string;
  good: number;
  needsImprovement: number;
  poor: number;
}

export interface PerformanceInsight {
  id: string;
  category: 'performance' | 'user_experience' | 'resource_usage' | 'error_rate';
  type: 'trend' | 'anomaly' | 'threshold_breach' | 'pattern';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  recommendation: string;
  confidence: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

// =====================================================================================
// PERFORMANCE BENCHMARKS
// =====================================================================================

const PERFORMANCE_BENCHMARKS: Record<string, PerformanceBenchmark> = {
  LCP: { metric: 'Largest Contentful Paint', good: 2500, needsImprovement: 4000, poor: Infinity },
  FID: { metric: 'First Input Delay', good: 100, needsImprovement: 300, poor: Infinity },
  CLS: { metric: 'Cumulative Layout Shift', good: 0.1, needsImprovement: 0.25, poor: Infinity },
  TTFB: { metric: 'Time to First Byte', good: 600, needsImprovement: 1500, poor: Infinity },
  FCP: { metric: 'First Contentful Paint', good: 1800, needsImprovement: 3000, poor: Infinity },
  TTI: { metric: 'Time to Interactive', good: 3800, needsImprovement: 7300, poor: Infinity },
  render: { metric: 'Component Render Time', good: 16, needsImprovement: 50, poor: 100 },
  api: { metric: 'API Response Time', good: 500, needsImprovement: 1000, poor: 3000 },
  query: { metric: 'Database Query Time', good: 50, needsImprovement: 100, poor: 500 },
  navigation: { metric: 'Page Navigation Time', good: 1000, needsImprovement: 2000, poor: 5000 },
  interaction: { metric: 'User Interaction Response', good: 100, needsImprovement: 200, poor: 500 }
};

// =====================================================================================
// ENHANCED PERFORMANCE MONITOR CLASS
// =====================================================================================

class EnhancedPerformanceMonitor {
  private entries: PerformanceEntry[] = [];
  private webVitalEntries: WebVitalEntry[] = [];
  private userJourneys: Map<string, UserJourneyEntry> = new Map();
  private alerts: PerformanceAlert[] = [];
  private insights: PerformanceInsight[] = [];
  private dbMetrics: DatabaseQueryMetric[] = [];
  
  private maxEntries = 10000;
  private maxWebVitals = 1000;
  private maxJourneys = 500;
  private maxAlerts = 100;
  private maxDbMetrics = 5000;
  
  private isEnabled = true;
  private shouldSendToServer = process.env.NODE_ENV === 'production';
  private sessionId: string;
  private userId?: string;
  
  private thresholds = {
    slowRender: 16,
    slowAPI: 1000,
    slowQuery: 100,
    highErrorRate: 5,
    lowPerformanceScore: 50
  };
  
  private observers: {
    navigation?: PerformanceObserver;
    paint?: PerformanceObserver;
    measure?: PerformanceObserver;
    longTask?: PerformanceObserver;
  } = {};
  
  private bundleMetrics: BundleMetrics | null = null;
  private alertCallbacks: Array<(alert: PerformanceAlert) => void> = [];
  private insightCallbacks: Array<(insight: PerformanceInsight) => void> = [];

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeWebVitalsTracking();
    this.initializeNavigationTracking();
    this.initializeLongTaskTracking();
    this.initializeErrorTracking();
    this.startPeriodicReporting();
    
    this.initializeUserId();
  }
  
  private generateSessionId(): string {
    return `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private async initializeUserId() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        this.userId = user.id;
      }
    } catch (error) {
      console.debug('Could not get user ID for performance tracking:', error);
    }
  }
  
  // =====================================================================================
  // CORE WEB VITALS TRACKING
  // =====================================================================================
  
  private initializeWebVitalsTracking() {
    if (typeof window === 'undefined') return;
    
    this.trackLCP();
    this.trackFID();
    this.trackCLS();
    this.trackTTFB();
    this.trackFCP();
    this.trackTTI();
  }
  
  private trackLCP() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        
        this.recordWebVital({
          id: this.generateId(),
          name: 'LCP',
          value: lastEntry.startTime,
          delta: lastEntry.startTime,
          timestamp: Date.now(),
          rating: this.getRating('LCP', lastEntry.startTime),
          url: window.location.href,
          sessionId: this.sessionId,
          userId: this.userId
        });
      });
      
      try {
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (error) {
        console.debug('LCP tracking not supported:', error);
      }
    }
  }
  
  private trackFID() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          this.recordWebVital({
            id: this.generateId(),
            name: 'FID',
            value: entry.processingStart - entry.startTime,
            delta: entry.processingStart - entry.startTime,
            timestamp: Date.now(),
            rating: this.getRating('FID', entry.processingStart - entry.startTime),
            url: window.location.href,
            sessionId: this.sessionId,
            userId: this.userId
          });
        });
      });
      
      try {
        observer.observe({ entryTypes: ['first-input'] });
      } catch (error) {
        console.debug('FID tracking not supported:', error);
      }
    }
  }
  
  private trackCLS() {
    if ('PerformanceObserver' in window) {
      let clsValue = 0;
      let clsEntries: any[] = [];
      
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            clsEntries.push(entry);
          }
        });
        
        this.recordWebVital({
          id: this.generateId(),
          name: 'CLS',
          value: clsValue,
          delta: clsValue,
          timestamp: Date.now(),
          rating: this.getRating('CLS', clsValue),
          url: window.location.href,
          sessionId: this.sessionId,
          userId: this.userId,
          metadata: { entries: clsEntries.length }
        });
      });
      
      try {
        observer.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        console.debug('CLS tracking not supported:', error);
      }
    }
  }
  
  private trackTTFB() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (entry.responseStart) {
            this.recordWebVital({
              id: this.generateId(),
              name: 'TTFB',
              value: entry.responseStart,
              delta: entry.responseStart,
              timestamp: Date.now(),
              rating: this.getRating('TTFB', entry.responseStart),
              url: window.location.href,
              sessionId: this.sessionId,
              userId: this.userId
            });
          }
        });
      });
      
      try {
        observer.observe({ entryTypes: ['navigation'] });
      } catch (error) {
        console.debug('TTFB tracking not supported:', error);
      }
    }
  }
  
  private trackFCP() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (entry.name === 'first-contentful-paint') {
            this.recordWebVital({
              id: this.generateId(),
              name: 'FCP',
              value: entry.startTime,
              delta: entry.startTime,
              timestamp: Date.now(),
              rating: this.getRating('FCP', entry.startTime),
              url: window.location.href,
              sessionId: this.sessionId,
              userId: this.userId
            });
          }
        });
      });
      
      try {
        observer.observe({ entryTypes: ['paint'] });
      } catch (error) {
        console.debug('FCP tracking not supported:', error);
      }
    }
  }
  
  private trackTTI() {
    if (document.readyState === 'complete') {
      this.estimateTTI();
    } else {
      window.addEventListener('load', () => this.estimateTTI());
    }
  }
  
  private estimateTTI() {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      const loadTime = navigation.loadEventEnd - navigation.navigationStart;
      if (loadTime > 0) {
        this.recordWebVital({
          id: this.generateId(),
          name: 'TTI',
          value: loadTime,
          delta: loadTime,
          timestamp: Date.now(),
          rating: this.getRating('TTI', loadTime),
          url: window.location.href,
          sessionId: this.sessionId,
          userId: this.userId,
          metadata: { estimated: true }
        });
      }
    }
  }
  
  private getRating(metric: WebVitalType, value: number): 'good' | 'needs-improvement' | 'poor' {
    const benchmark = PERFORMANCE_BENCHMARKS[metric];
    if (!benchmark) return 'good';
    
    if (value <= benchmark.good) return 'good';
    if (value <= benchmark.needsImprovement) return 'needs-improvement';
    return 'poor';
  }
  
  private recordWebVital(vital: WebVitalEntry) {
    this.webVitalEntries.push(vital);
    
    if (this.webVitalEntries.length > this.maxWebVitals) {
      this.webVitalEntries = this.webVitalEntries.slice(-this.maxWebVitals);
    }
    
    this.checkWebVitalThresholds(vital);
    
    if (this.shouldSendToServer) {
      this.sendWebVitalToServer(vital);
    }
  }
  
  private checkWebVitalThresholds(vital: WebVitalEntry) {
    if (vital.rating === 'poor') {
      this.createAlert({
        id: this.generateId(),
        type: `poor_${vital.name.toLowerCase()}`,
        severity: vital.name === 'CLS' ? 'high' : 'medium',
        message: `Poor ${vital.name} detected: ${vital.value.toFixed(2)}ms`,
        threshold: PERFORMANCE_BENCHMARKS[vital.name]?.needsImprovement || 0,
        actualValue: vital.value,
        timestamp: Date.now(),
        acknowledged: false,
        metadata: { webVital: vital }
      });
    }
  }
  
  // =====================================================================================
  // ENHANCED TRACKING METHODS
  // =====================================================================================
  
  trackRender(componentName: string, callback: () => void): void {
    if (!this.isEnabled) {
      callback();
      return;
    }

    const start = performance.now();
    const startMemory = this.getMemoryUsage();
    
    try {
      callback();
    } catch (error) {
      this.trackError(error as Error, { component: componentName, phase: 'render' });
      throw error;
    }
    
    const duration = performance.now() - start;
    const endMemory = this.getMemoryUsage();
    const memoryDelta = endMemory ? endMemory - (startMemory || 0) : undefined;

    this.addEntry({
      name: componentName,
      type: "render",
      duration,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      url: typeof window !== 'undefined' ? window.location.href : '',
      metadata: {
        memoryDelta,
        memoryUsage: endMemory
      }
    });

    if (duration > this.thresholds.slowRender) {
      const severity = duration > 100 ? 'high' : duration > 50 ? 'medium' : 'low';
      
      console.warn(
        `[Performance] Slow render detected in ${componentName}: ${duration.toFixed(2)}ms`
      );
      
      this.createAlert({
        id: this.generateId(),
        type: 'slow_render',
        severity,
        message: `Slow render in ${componentName}: ${duration.toFixed(2)}ms`,
        threshold: this.thresholds.slowRender,
        actualValue: duration,
        timestamp: Date.now(),
        acknowledged: false,
        metadata: { component: componentName, memoryDelta }
      });
    }
  }
  
  async trackAPI<T>(
    apiName: string,
    apiCall: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    if (!this.isEnabled) {
      return apiCall();
    }

    const start = performance.now();
    const startMemory = this.getMemoryUsage();
    let responseSize = 0;
    
    try {
      const result = await apiCall();
      const duration = performance.now() - start;
      const endMemory = this.getMemoryUsage();
      
      try {
        responseSize = new Blob([JSON.stringify(result)]).size;
      } catch {
        // Ignore if we can't serialize
      }

      this.addEntry({
        name: apiName,
        type: "api",
        duration,
        timestamp: Date.now(),
        sessionId: this.sessionId,
        userId: this.userId,
        url: typeof window !== 'undefined' ? window.location.href : '',
        metadata: {
          ...metadata,
          responseSize,
          statusCode: 200,
          memoryDelta: endMemory && startMemory ? endMemory - startMemory : undefined,
          cacheHit: this.detectCacheHit(duration)
        },
      });

      if (duration > this.thresholds.slowAPI) {
        const severity = duration > 5000 ? 'high' : duration > 3000 ? 'medium' : 'low';
        
        console.warn(
          `[Performance] Slow API call detected for ${apiName}: ${duration.toFixed(2)}ms`,
          { ...metadata, responseSize }
        );
        
        this.createAlert({
          id: this.generateId(),
          type: 'slow_api',
          severity,
          message: `Slow API call ${apiName}: ${duration.toFixed(2)}ms`,
          threshold: this.thresholds.slowAPI,
          actualValue: duration,
          timestamp: Date.now(),
          acknowledged: false,
          metadata: { apiName, responseSize, ...metadata }
        });
      }

      return result;
    } catch (error) {
      const duration = performance.now() - start;
      const endMemory = this.getMemoryUsage();
      
      const statusCode = (error as any)?.status || (error as any)?.code || 0;
      
      this.addEntry({
        name: apiName,
        type: "api",
        duration,
        timestamp: Date.now(),
        sessionId: this.sessionId,
        userId: this.userId,
        url: typeof window !== 'undefined' ? window.location.href : '',
        metadata: { 
          ...metadata, 
          error: true,
          statusCode,
          errorMessage: (error as Error).message,
          memoryDelta: endMemory && startMemory ? endMemory - startMemory : undefined
        },
        errorDetails: {
          message: (error as Error).message,
          stack: (error as Error).stack
        }
      });
      
      this.createAlert({
        id: this.generateId(),
        type: 'api_error',
        severity: 'high',
        message: `API error in ${apiName}: ${(error as Error).message}`,
        threshold: 0,
        actualValue: 1,
        timestamp: Date.now(),
        acknowledged: false,
        metadata: { apiName, statusCode, ...metadata }
      });
      
      throw error;
    }
  }
  
  async trackQuery<T>(
    queryName: string,
    query: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    if (!this.isEnabled) {
      return query();
    }

    const start = performance.now();
    const queryId = this.generateId();
    let rowsAffected = 0;
    let tableName = metadata?.table || 'unknown';
    let operation = metadata?.operation || 'select';
    
    try {
      const result = await query();
      const duration = performance.now() - start;
      
      if (Array.isArray(result)) {
        rowsAffected = result.length;
      } else if (result && typeof result === 'object' && 'data' in result) {
        const data = (result as any).data;
        if (Array.isArray(data)) {
          rowsAffected = data.length;
        }
      }
      
      const dbMetric: DatabaseQueryMetric = {
        queryId,
        query: queryName,
        duration,
        timestamp: Date.now(),
        tableName,
        operation: operation as any,
        rowsAffected,
        cacheHit: this.detectCacheHit(duration),
        error: false,
        sessionId: this.sessionId,
        userId: this.userId
      };
      
      this.dbMetrics.push(dbMetric);
      
      if (this.dbMetrics.length > this.maxDbMetrics) {
        this.dbMetrics = this.dbMetrics.slice(-this.maxDbMetrics);
      }

      this.addEntry({
        name: queryName,
        type: "query",
        duration,
        timestamp: Date.now(),
        sessionId: this.sessionId,
        userId: this.userId,
        url: typeof window !== 'undefined' ? window.location.href : '',
        metadata: {
          ...metadata,
          queryId,
          rowsAffected,
          tableName,
          operation,
          cacheHit: dbMetric.cacheHit
        },
      });

      if (duration > this.thresholds.slowQuery) {
        const severity = duration > 1000 ? 'high' : duration > 500 ? 'medium' : 'low';
        
        console.warn(
          `[Performance] Slow query detected for ${queryName}: ${duration.toFixed(2)}ms`,
          { tableName, operation, rowsAffected, ...metadata }
        );
        
        this.createAlert({
          id: this.generateId(),
          type: 'slow_query',
          severity,
          message: `Slow database query ${queryName}: ${duration.toFixed(2)}ms`,
          threshold: this.thresholds.slowQuery,
          actualValue: duration,
          timestamp: Date.now(),
          acknowledged: false,
          metadata: { queryName, tableName, operation, rowsAffected, ...metadata }
        });
      }
      
      if (this.shouldSendToServer) {
        this.sendQueryMetricToServer(dbMetric);
      }

      return result;
    } catch (error) {
      const duration = performance.now() - start;
      
      const dbMetric: DatabaseQueryMetric = {
        queryId,
        query: queryName,
        duration,
        timestamp: Date.now(),
        tableName,
        operation: operation as any,
        cacheHit: false,
        error: true,
        errorMessage: (error as Error).message,
        sessionId: this.sessionId,
        userId: this.userId
      };
      
      this.dbMetrics.push(dbMetric);
      
      this.addEntry({
        name: queryName,
        type: "query",
        duration,
        timestamp: Date.now(),
        sessionId: this.sessionId,
        userId: this.userId,
        url: typeof window !== 'undefined' ? window.location.href : '',
        metadata: { ...metadata, error: true, queryId, tableName, operation },
        errorDetails: {
          message: (error as Error).message,
          stack: (error as Error).stack
        }
      });
      
      this.createAlert({
        id: this.generateId(),
        type: 'query_error',
        severity: 'high',
        message: `Database query error in ${queryName}: ${(error as Error).message}`,
        threshold: 0,
        actualValue: 1,
        timestamp: Date.now(),
        acknowledged: false,
        metadata: { queryName, tableName, operation, ...metadata }
      });
      
      if (this.shouldSendToServer) {
        this.sendQueryMetricToServer(dbMetric);
      }
      
      throw error;
    }
  }
  
  // =====================================================================================
  // USER JOURNEY TRACKING
  // =====================================================================================
  
  startUserJourney(type: UserJourneyType, metadata?: Record<string, any>): string {
    const journeyId = this.generateId();
    
    const journey: UserJourneyEntry = {
      id: journeyId,
      type,
      startTime: Date.now(),
      steps: [{
        name: 'journey_start',
        timestamp: Date.now(),
        metadata
      }],
      completed: false,
      abandoned: false,
      sessionId: this.sessionId,
      userId: this.userId,
      metadata
    };
    
    this.userJourneys.set(journeyId, journey);
    return journeyId;
  }
  
  addJourneyStep(journeyId: string, stepName: string, metadata?: Record<string, any>) {
    const journey = this.userJourneys.get(journeyId);
    if (!journey || journey.completed || journey.abandoned) return;
    
    const stepTimestamp = Date.now();
    const previousStep = journey.steps[journey.steps.length - 1];
    const stepDuration = stepTimestamp - previousStep.timestamp;
    
    journey.steps.push({
      name: stepName,
      timestamp: stepTimestamp,
      duration: stepDuration,
      metadata
    });
    
    if (stepDuration > 300000) {
      this.abandonUserJourney(journeyId, 'timeout');
    }
  }
  
  completeUserJourney(journeyId: string, metadata?: Record<string, any>) {
    const journey = this.userJourneys.get(journeyId);
    if (!journey || journey.completed || journey.abandoned) return;
    
    const endTime = Date.now();
    journey.endTime = endTime;
    journey.duration = endTime - journey.startTime;
    journey.completed = true;
    journey.metadata = { ...journey.metadata, ...metadata };
    
    journey.steps.push({
      name: 'journey_complete',
      timestamp: endTime,
      duration: endTime - journey.steps[journey.steps.length - 1].timestamp,
      metadata
    });
    
    this.analyzeJourneyPerformance(journey);
    
    if (this.shouldSendToServer) {
      this.sendJourneyToServer(journey);
    }
  }
  
  abandonUserJourney(journeyId: string, reason: string) {
    const journey = this.userJourneys.get(journeyId);
    if (!journey || journey.completed || journey.abandoned) return;
    
    journey.abandoned = true;
    journey.abandonmentReason = reason;
    journey.endTime = Date.now();
    journey.duration = journey.endTime - journey.startTime;
    
    if (['login', 'payment_flow', 'class_booking'].includes(journey.type)) {
      this.createAlert({
        id: this.generateId(),
        type: 'journey_abandoned',
        severity: 'medium',
        message: `User abandoned ${journey.type} journey: ${reason}`,
        threshold: 0,
        actualValue: 1,
        timestamp: Date.now(),
        acknowledged: false,
        metadata: { journeyId, journeyType: journey.type, reason }
      });
    }
    
    if (this.shouldSendToServer) {
      this.sendJourneyToServer(journey);
    }
  }
  
  // =====================================================================================
  // UTILITY METHODS
  // =====================================================================================
  
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private getMemoryUsage(): number | undefined {
    if ('memory' in performance) {
      return (performance as any).memory?.usedJSHeapSize;
    }
    return undefined;
  }
  
  private detectCacheHit(duration: number): boolean {
    return duration < 50;
  }
  
  private addEntry(entry: PerformanceEntry) {
    this.entries.push(entry);

    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }
    
    if (this.shouldSendToServer) {
      this.sendEntryToServer(entry);
    }
    
    this.analyzeEntry(entry);
  }
  
  private analyzeEntry(entry: PerformanceEntry) {
    this.detectPerformanceAnomalies(entry);
    this.updatePerformanceInsights(entry);
  }
  
  private detectPerformanceAnomalies(entry: PerformanceEntry) {
    const recentEntries = this.entries
      .filter(e => e.type === entry.type && e.name === entry.name)
      .slice(-10);
    
    if (recentEntries.length < 5) return;
    
    const recentDurations = recentEntries.map(e => e.duration);
    const average = recentDurations.reduce((sum, d) => sum + d, 0) / recentDurations.length;
    const standardDeviation = this.calculateStandardDeviation(recentDurations);
    
    if (entry.duration > average + (2 * standardDeviation)) {
      this.createInsight({
        id: this.generateId(),
        category: 'performance',
        type: 'anomaly',
        title: `Performance anomaly detected in ${entry.name}`,
        description: `${entry.type} operation took ${entry.duration.toFixed(2)}ms, significantly longer than recent average of ${average.toFixed(2)}ms`,
        impact: entry.duration > average + (3 * standardDeviation) ? 'high' : 'medium',
        recommendation: `Investigate the ${entry.name} ${entry.type} operation for potential optimization opportunities`,
        confidence: 0.7,
        timestamp: Date.now(),
        metadata: { 
          entryId: entry.timestamp,
          average,
          standardDeviation,
          deviation: entry.duration - average
        }
      });
    }
  }
  
  private updatePerformanceInsights(entry: PerformanceEntry) {
    const typeEntries = this.entries.filter(e => e.type === entry.type);
    
    if (typeEntries.length % 100 === 0 && typeEntries.length > 0) {
      const trend = this.calculateTrend(typeEntries);
      
      if (trend !== 'stable') {
        this.createInsight({
          id: this.generateId(),
          category: 'performance',
          type: 'trend',
          title: `${entry.type} performance trend: ${trend}`,
          description: `${entry.type} operations are ${trend} over time`,
          impact: trend === 'degrading' ? 'medium' : 'low',
          recommendation: trend === 'degrading' 
            ? `Review and optimize ${entry.type} operations to improve performance`
            : `Continue monitoring ${entry.type} performance to maintain current improvements`,
          confidence: 0.8,
          timestamp: Date.now(),
          metadata: { 
            operationType: entry.type,
            sampleSize: typeEntries.length,
            trend
          }
        });
      }
    }
  }
  
  private calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / squaredDiffs.length;
    return Math.sqrt(avgSquaredDiff);
  }
  
  private calculateTrend(entries: PerformanceEntry[]): 'improving' | 'degrading' | 'stable' {
    if (entries.length < 10) return 'stable';
    
    const sortedEntries = [...entries].sort((a, b) => a.timestamp - b.timestamp);
    const firstHalf = sortedEntries.slice(0, Math.floor(sortedEntries.length / 2));
    const secondHalf = sortedEntries.slice(Math.floor(sortedEntries.length / 2));
    
    const firstHalfAvg = firstHalf.reduce((sum, e) => sum + e.duration, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, e) => sum + e.duration, 0) / secondHalf.length;
    
    const changePercentage = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
    
    if (changePercentage > 10) return 'degrading';
    if (changePercentage < -10) return 'improving';
    return 'stable';
  }
  
  private createAlert(alert: PerformanceAlert) {
    this.alerts.push(alert);
    
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(-this.maxAlerts);
    }
    
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Error in alert callback:', error);
      }
    });
    
    if (this.shouldSendToServer) {
      this.sendAlertToServer(alert);
    }
  }
  
  private createInsight(insight: PerformanceInsight) {
    this.insights.push(insight);
    
    if (this.insights.length > 1000) {
      this.insights = this.insights.slice(-1000);
    }
    
    this.insightCallbacks.forEach(callback => {
      try {
        callback(insight);
      } catch (error) {
        console.error('Error in insight callback:', error);
      }
    });
    
    if (this.shouldSendToServer) {
      this.sendInsightToServer(insight);
    }
  }
  
  private analyzeJourneyPerformance(journey: UserJourneyEntry) {
    const thresholds: Record<UserJourneyType, number> = {
      'login': 10000,
      'class_booking': 30000,
      'student_registration': 120000,
      'payment_flow': 60000,
      'teacher_onboarding': 300000,
      'dashboard_load': 5000,
      'report_generation': 15000
    };
    
    const threshold = thresholds[journey.type] || 30000;
    
    if (journey.duration && journey.duration > threshold) {
      this.createAlert({
        id: this.generateId(),
        type: 'slow_journey',
        severity: journey.duration > threshold * 2 ? 'high' : 'medium',
        message: `Slow ${journey.type} journey: ${(journey.duration / 1000).toFixed(1)}s`,
        threshold,
        actualValue: journey.duration,
        timestamp: Date.now(),
        acknowledged: false,
        metadata: { journeyId: journey.id, journeyType: journey.type }
      });
    }
    
    const slowSteps = journey.steps.filter(step => step.duration && step.duration > 5000);
    if (slowSteps.length > 0) {
      slowSteps.forEach(step => {
        this.createInsight({
          id: this.generateId(),
          category: 'user_experience',
          type: 'bottleneck',
          title: `Bottleneck in ${journey.type} journey`,
          description: `Step '${step.name}' took ${(step.duration! / 1000).toFixed(1)}s`,
          impact: 'medium',
          recommendation: `Optimize the '${step.name}' step to improve user experience`,
          confidence: 0.8,
          timestamp: Date.now(),
          metadata: { journeyId: journey.id, stepName: step.name, stepDuration: step.duration }
        });
      });
    }
  }
  
  // =====================================================================================
  // ERROR TRACKING
  // =====================================================================================
  
  private initializeErrorTracking() {
    if (typeof window === 'undefined') return;
    
    window.addEventListener('error', (event) => {
      this.trackError(event.error, {
        type: 'javascript_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError(new Error(event.reason), {
        type: 'unhandled_promise_rejection',
        reason: event.reason
      });
    });
  }
  
  trackError(error: Error, metadata?: Record<string, any>) {
    const errorEntry: PerformanceEntry = {
      name: error.name || 'Unknown Error',
      type: 'error',
      duration: 0,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      url: typeof window !== 'undefined' ? window.location.href : '',
      metadata,
      errorDetails: {
        message: error.message,
        stack: error.stack
      }
    };
    
    this.addEntry(errorEntry);
    
    this.createAlert({
      id: this.generateId(),
      type: 'error',
      severity: 'high',
      message: `${error.name}: ${error.message}`,
      threshold: 0,
      actualValue: 1,
      timestamp: Date.now(),
      acknowledged: false,
      metadata: { error: error.message, stack: error.stack, ...metadata }
    });
  }
  
  // =====================================================================================
  // NAVIGATION TRACKING
  // =====================================================================================
  
  private initializeNavigationTracking() {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;
    
    try {
      this.observers.navigation = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          this.addEntry({
            name: entry.name || 'page_navigation',
            type: 'navigation',
            duration: entry.duration,
            timestamp: Date.now(),
            sessionId: this.sessionId,
            userId: this.userId,
            url: entry.name,
            metadata: {
              entryType: entry.entryType,
              transferSize: entry.transferSize,
              encodedBodySize: entry.encodedBodySize,
              decodedBodySize: entry.decodedBodySize,
              redirectCount: entry.redirectCount,
              domContentLoadedEventEnd: entry.domContentLoadedEventEnd,
              loadEventEnd: entry.loadEventEnd
            }
          });
        });
      });
      
      this.observers.navigation.observe({ entryTypes: ['navigation'] });
    } catch (error) {
      console.debug('Navigation tracking not supported:', error);
    }
  }
  
  // =====================================================================================
  // LONG TASK TRACKING
  // =====================================================================================
  
  private initializeLongTaskTracking() {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;
    
    try {
      this.observers.longTask = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          this.addEntry({
            name: 'long_task',
            type: 'interaction',
            duration: entry.duration,
            timestamp: Date.now(),
            sessionId: this.sessionId,
            userId: this.userId,
            url: window.location.href,
            metadata: {
              entryType: entry.entryType,
              startTime: entry.startTime
            }
          });
          
          this.createAlert({
            id: this.generateId(),
            type: 'long_task',
            severity: entry.duration > 100 ? 'high' : 'medium',
            message: `Long task detected: ${entry.duration.toFixed(2)}ms`,
            threshold: 50,
            actualValue: entry.duration,
            timestamp: Date.now(),
            acknowledged: false,
            metadata: { duration: entry.duration, startTime: entry.startTime }
          });
        });
      });
      
      this.observers.longTask.observe({ entryTypes: ['longtask'] });
    } catch (error) {
      console.debug('Long task tracking not supported:', error);
    }
  }
  
  // =====================================================================================
  // BUNDLE SIZE MONITORING
  // =====================================================================================
  
  measureBundleSize() {
    if (typeof window === 'undefined') return;
    
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const jsResources = resources.filter(r => r.name.includes('.js'));
    const cssResources = resources.filter(r => r.name.includes('.css'));
    
    const totalJSSize = jsResources.reduce((sum, r) => sum + (r.transferSize || 0), 0);
    const totalCSSSize = cssResources.reduce((sum, r) => sum + (r.transferSize || 0), 0);
    
    const chunkSizes: Record<string, number> = {};
    jsResources.forEach(resource => {
      const name = resource.name.split('/').pop() || 'unknown';
      chunkSizes[name] = resource.transferSize || 0;
    });
    
    const loadTime = Math.max(
      ...jsResources.map(r => r.responseEnd - r.requestStart),
      ...cssResources.map(r => r.responseEnd - r.requestStart)
    );
    
    const cachedResources = resources.filter(r => r.transferSize === 0 && r.decodedBodySize > 0);
    const cacheHitRate = resources.length > 0 ? (cachedResources.length / resources.length) * 100 : 0;
    
    const totalTransferSize = jsResources.reduce((sum, r) => sum + (r.transferSize || 0), 0);
    const totalDecodedSize = jsResources.reduce((sum, r) => sum + (r.decodedBodySize || 0), 0);
    const compressionRatio = totalDecodedSize > 0 ? totalTransferSize / totalDecodedSize : 1;
    
    this.bundleMetrics = {
      bundleSize: totalJSSize + totalCSSSize,
      chunkSizes,
      loadTime,
      cacheHitRate,
      compressionRatio,
      analysisDate: new Date().toISOString()
    };
    
    if (totalJSSize > 1024 * 1024) {
      this.createAlert({
        id: this.generateId(),
        type: 'large_bundle',
        severity: totalJSSize > 2 * 1024 * 1024 ? 'high' : 'medium',
        message: `Large JavaScript bundle detected: ${(totalJSSize / 1024 / 1024).toFixed(2)}MB`,
        threshold: 1024 * 1024,
        actualValue: totalJSSize,
        timestamp: Date.now(),
        acknowledged: false,
        metadata: { bundleSize: totalJSSize, chunkSizes }
      });
    }
    
    return this.bundleMetrics;
  }
  
  // =====================================================================================
  // SERVER COMMUNICATION
  // =====================================================================================
  
  private async sendEntryToServer(entry: PerformanceEntry) {
    try {
      if (this.shouldSendToServer) {
        await supabase
          .from('performance_metrics')
          .insert({
            session_id: entry.sessionId,
            user_id: entry.userId,
            metric_type: entry.type,
            metric_name: entry.name,
            duration: entry.duration,
            timestamp: new Date(entry.timestamp).toISOString(),
            url: entry.url,
            metadata: entry.metadata,
            error_details: entry.errorDetails
          });
      }
    } catch (error) {
      console.debug('Failed to send performance entry to server:', error);
    }
  }
  
  private async sendWebVitalToServer(vital: WebVitalEntry) {
    try {
      if (this.shouldSendToServer) {
        await supabase
          .from('web_vitals')
          .insert({
            session_id: vital.sessionId,
            user_id: vital.userId,
            metric_name: vital.name,
            value: vital.value,
            rating: vital.rating,
            timestamp: new Date(vital.timestamp).toISOString(),
            url: vital.url,
            metadata: vital.metadata
          });
      }
    } catch (error) {
      console.debug('Failed to send web vital to server:', error);
    }
  }
  
  private async sendQueryMetricToServer(metric: DatabaseQueryMetric) {
    try {
      if (this.shouldSendToServer) {
        await supabase
          .from('query_performance')
          .insert({
            session_id: metric.sessionId,
            user_id: metric.userId,
            query_id: metric.queryId,
            query_name: metric.query,
            duration: metric.duration,
            table_name: metric.tableName,
            operation: metric.operation,
            rows_affected: metric.rowsAffected,
            cache_hit: metric.cacheHit,
            error: metric.error,
            error_message: metric.errorMessage,
            timestamp: new Date(metric.timestamp).toISOString()
          });
      }
    } catch (error) {
      console.debug('Failed to send query metric to server:', error);
    }
  }
  
  private async sendJourneyToServer(journey: UserJourneyEntry) {
    try {
      if (this.shouldSendToServer) {
        await supabase
          .from('user_journeys')
          .insert({
            session_id: journey.sessionId,
            user_id: journey.userId,
            journey_id: journey.id,
            journey_type: journey.type,
            start_time: new Date(journey.startTime).toISOString(),
            end_time: journey.endTime ? new Date(journey.endTime).toISOString() : null,
            duration: journey.duration,
            completed: journey.completed,
            abandoned: journey.abandoned,
            abandonment_reason: journey.abandonmentReason,
            steps: journey.steps,
            metadata: journey.metadata
          });
      }
    } catch (error) {
      console.debug('Failed to send user journey to server:', error);
    }
  }
  
  private async sendAlertToServer(alert: PerformanceAlert) {
    try {
      if (this.shouldSendToServer) {
        await supabase
          .from('performance_alerts')
          .insert({
            alert_id: alert.id,
            alert_type: alert.type,
            severity: alert.severity,
            message: alert.message,
            threshold: alert.threshold,
            actual_value: alert.actualValue,
            timestamp: new Date(alert.timestamp).toISOString(),
            acknowledged: alert.acknowledged,
            resolved_at: alert.resolvedAt ? new Date(alert.resolvedAt).toISOString() : null,
            metadata: alert.metadata
          });
      }
    } catch (error) {
      console.debug('Failed to send alert to server:', error);
    }
  }
  
  private async sendInsightToServer(insight: PerformanceInsight) {
    try {
      if (this.shouldSendToServer) {
        await supabase
          .from('performance_insights')
          .insert({
            insight_id: insight.id,
            category: insight.category,
            type: insight.type,
            title: insight.title,
            description: insight.description,
            impact: insight.impact,
            recommendation: insight.recommendation,
            confidence: insight.confidence,
            timestamp: new Date(insight.timestamp).toISOString(),
            metadata: insight.metadata
          });
      }
    } catch (error) {
      console.debug('Failed to send insight to server:', error);
    }
  }
  
  // =====================================================================================
  // PERIODIC REPORTING
  // =====================================================================================
  
  private startPeriodicReporting() {
    if (typeof window === 'undefined') return;
    
    setInterval(() => {
      this.sendPeriodicReport();
    }, 5 * 60 * 1000);
    
    if (document.readyState === 'complete') {
      setTimeout(() => this.measureBundleSize(), 1000);
    } else {
      window.addEventListener('load', () => {
        setTimeout(() => this.measureBundleSize(), 1000);
      });
    }
  }
  
  private async sendPeriodicReport() {
    try {
      const report = this.export();
      
      if (this.shouldSendToServer) {
        await supabase
          .from('performance_reports')
          .insert({
            session_id: this.sessionId,
            user_id: this.userId,
            report_data: report,
            timestamp: new Date().toISOString()
          });
      }
      
      console.debug('Periodic performance report sent', {
        entries: this.entries.length,
        alerts: this.alerts.length,
        insights: this.insights.length,
        overallScore: report.performance.overallScore
      });
    } catch (error) {
      console.debug('Failed to send periodic report:', error);
    }
  }
  
  // =====================================================================================
  // PUBLIC API METHODS
  // =====================================================================================
  
  onAlert(callback: (alert: PerformanceAlert) => void) {
    this.alertCallbacks.push(callback);
    
    return () => {
      const index = this.alertCallbacks.indexOf(callback);
      if (index > -1) {
        this.alertCallbacks.splice(index, 1);
      }
    };
  }
  
  onInsight(callback: (insight: PerformanceInsight) => void) {
    this.insightCallbacks.push(callback);
    
    return () => {
      const index = this.insightCallbacks.indexOf(callback);
      if (index > -1) {
        this.insightCallbacks.splice(index, 1);
      }
    };
  }
  
  getAlerts(severity?: AlertSeverity): PerformanceAlert[] {
    return severity 
      ? this.alerts.filter(alert => alert.severity === severity && !alert.acknowledged)
      : this.alerts.filter(alert => !alert.acknowledged);
  }
  
  acknowledgeAlert(alertId: string) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      
      if (this.shouldSendToServer) {
        supabase
          .from('performance_alerts')
          .update({ acknowledged: true })
          .eq('alert_id', alertId)
          .then(() => console.debug('Alert acknowledged'));
      }
    }
  }
  
  getInsights(category?: PerformanceInsight['category']): PerformanceInsight[] {
    return category 
      ? this.insights.filter(insight => insight.category === category)
      : this.insights;
  }
  
  setThresholds(thresholds: Partial<typeof this.thresholds>) {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }
  
  getPerformanceScore(): number {
    return this.calculateOverallPerformanceScore();
  }
  
  analyzePerformance() {
    return {
      score: this.getPerformanceScore(),
      alerts: this.getAlerts(),
      insights: this.getInsights(),
      recommendations: this.generateRecommendations(),
      riskFactors: this.identifyRiskFactors(),
      webVitals: this.getWebVitalsStats(),
      journeys: this.getUserJourneyStats(),
      queries: this.getQueryStats(),
      bundle: this.bundleMetrics
    };
  }
  
  // =====================================================================================
  // STATISTICS AND ANALYSIS
  // =====================================================================================
  
  getStats(type?: MetricType) {
    const filteredEntries = type
      ? this.entries.filter((e) => e.type === type)
      : this.entries;

    if (filteredEntries.length === 0) {
      return null;
    }

    const durations = filteredEntries.map((e) => e.duration);
    const sorted = [...durations].sort((a, b) => a - b);

    const stats = {
      count: filteredEntries.length,
      total: durations.reduce((sum, d) => sum + d, 0),
      average: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      min: Math.min(...durations),
      max: Math.max(...durations),
      
      standardDeviation: this.calculateStandardDeviation(durations),
      errorRate: this.calculateErrorRate(filteredEntries),
      recentAverage: this.calculateRecentAverage(filteredEntries, 60000),
      trend: this.calculateTrend(filteredEntries),
      performanceScore: this.calculatePerformanceScore(filteredEntries, type)
    };
    
    return stats;
  }
  
  private calculateErrorRate(entries: PerformanceEntry[]): number {
    const errorCount = entries.filter(e => e.errorDetails).length;
    return entries.length > 0 ? (errorCount / entries.length) * 100 : 0;
  }
  
  private calculateRecentAverage(entries: PerformanceEntry[], timeWindow: number): number {
    const now = Date.now();
    const recentEntries = entries.filter(e => now - e.timestamp <= timeWindow);
    
    if (recentEntries.length === 0) return 0;
    
    const recentDurations = recentEntries.map(e => e.duration);
    return recentDurations.reduce((sum, d) => sum + d, 0) / recentDurations.length;
  }
  
  private calculatePerformanceScore(entries: PerformanceEntry[], type?: MetricType): number {
    if (entries.length === 0) return 100;
    
    const benchmark = type ? PERFORMANCE_BENCHMARKS[type] : null;
    if (!benchmark) return 50;
    
    const avgDuration = entries.reduce((sum, e) => sum + e.duration, 0) / entries.length;
    
    if (avgDuration <= benchmark.good) return 90 + (10 * (1 - avgDuration / benchmark.good));
    if (avgDuration <= benchmark.needsImprovement) {
      const ratio = (avgDuration - benchmark.good) / (benchmark.needsImprovement - benchmark.good);
      return 50 + (40 * (1 - ratio));
    }
    
    return Math.max(0, 50 * (1 - (avgDuration - benchmark.needsImprovement) / benchmark.needsImprovement));
  }
  
  getWebVitalsStats() {
    const stats: Record<WebVitalType, any> = {} as any;
    
    ['LCP', 'FID', 'CLS', 'TTFB', 'FCP', 'TTI'].forEach(vital => {
      const vitalEntries = this.webVitalEntries.filter(e => e.name === vital as WebVitalType);
      
      if (vitalEntries.length > 0) {
        const values = vitalEntries.map(e => e.value);
        const ratings = vitalEntries.map(e => e.rating);
        
        stats[vital as WebVitalType] = {
          count: vitalEntries.length,
          latest: vitalEntries[vitalEntries.length - 1],
          average: values.reduce((sum, v) => sum + v, 0) / values.length,
          median: values.sort((a, b) => a - b)[Math.floor(values.length / 2)],
          min: Math.min(...values),
          max: Math.max(...values),
          goodCount: ratings.filter(r => r === 'good').length,
          needsImprovementCount: ratings.filter(r => r === 'needs-improvement').length,
          poorCount: ratings.filter(r => r === 'poor').length,
          trend: this.calculateWebVitalTrend(vitalEntries)
        };
      }
    });
    
    return stats;
  }
  
  private calculateWebVitalTrend(entries: WebVitalEntry[]): 'improving' | 'degrading' | 'stable' {
    if (entries.length < 5) return 'stable';
    
    const sortedEntries = [...entries].sort((a, b) => a.timestamp - b.timestamp);
    const recentEntries = sortedEntries.slice(-5);
    const olderEntries = sortedEntries.slice(-10, -5);
    
    if (olderEntries.length === 0) return 'stable';
    
    const recentAvg = recentEntries.reduce((sum, e) => sum + e.value, 0) / recentEntries.length;
    const olderAvg = olderEntries.reduce((sum, e) => sum + e.value, 0) / olderEntries.length;
    
    const changePercentage = ((recentAvg - olderAvg) / olderAvg) * 100;
    
    if (changePercentage > 10) return 'degrading';
    if (changePercentage < -10) return 'improving';
    return 'stable';
  }
  
  getUserJourneyStats() {
    const journeys = Array.from(this.userJourneys.values());
    const completedJourneys = journeys.filter(j => j.completed);
    const abandonedJourneys = journeys.filter(j => j.abandoned);
    
    const stats: Record<UserJourneyType, any> = {} as any;
    
    (['login', 'class_booking', 'student_registration', 'payment_flow', 'teacher_onboarding', 'dashboard_load', 'report_generation'] as UserJourneyType[]).forEach(journeyType => {
      const typeJourneys = journeys.filter(j => j.type === journeyType);
      const typeCompleted = completedJourneys.filter(j => j.type === journeyType);
      const typeAbandoned = abandonedJourneys.filter(j => j.type === journeyType);
      
      if (typeJourneys.length > 0) {
        const completedDurations = typeCompleted.map(j => j.duration!).filter(d => d > 0);
        
        stats[journeyType] = {
          total: typeJourneys.length,
          completed: typeCompleted.length,
          abandoned: typeAbandoned.length,
          completionRate: (typeCompleted.length / typeJourneys.length) * 100,
          averageDuration: completedDurations.length > 0 
            ? completedDurations.reduce((sum, d) => sum + d, 0) / completedDurations.length 
            : 0,
          medianDuration: completedDurations.length > 0
            ? completedDurations.sort((a, b) => a - b)[Math.floor(completedDurations.length / 2)]
            : 0,
          abandonmentReasons: this.getAbandonmentReasons(typeAbandoned)
        };
      }
    });
    
    return stats;
  }
  
  private getAbandonmentReasons(abandonedJourneys: UserJourneyEntry[]): Record<string, number> {
    const reasons: Record<string, number> = {};
    
    abandonedJourneys.forEach(journey => {
      const reason = journey.abandonmentReason || 'unknown';
      reasons[reason] = (reasons[reason] || 0) + 1;
    });
    
    return reasons;
  }
  
  getQueryStats() {
    if (this.dbMetrics.length === 0) return null;
    
    const totalQueries = this.dbMetrics.length;
    const errorQueries = this.dbMetrics.filter(q => q.error).length;
    const cacheHits = this.dbMetrics.filter(q => q.cacheHit).length;
    
    const durations = this.dbMetrics.map(q => q.duration);
    const sorted = [...durations].sort((a, b) => a - b);
    
    const tableStats: Record<string, any> = {};
    this.dbMetrics.forEach(query => {
      if (!tableStats[query.tableName]) {
        tableStats[query.tableName] = {
          count: 0,
          totalDuration: 0,
          errors: 0,
          cacheHits: 0,
          operations: {} as Record<string, number>
        };
      }
      
      const table = tableStats[query.tableName];
      table.count++;
      table.totalDuration += query.duration;
      if (query.error) table.errors++;
      if (query.cacheHit) table.cacheHits++;
      table.operations[query.operation] = (table.operations[query.operation] || 0) + 1;
    });
    
    Object.keys(tableStats).forEach(tableName => {
      const table = tableStats[tableName];
      table.averageDuration = table.totalDuration / table.count;
      table.errorRate = (table.errors / table.count) * 100;
      table.cacheHitRate = (table.cacheHits / table.count) * 100;
    });
    
    return {
      total: totalQueries,
      errorRate: (errorQueries / totalQueries) * 100,
      cacheHitRate: (cacheHits / totalQueries) * 100,
      averageDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      medianDuration: sorted[Math.floor(sorted.length / 2)],
      p95Duration: sorted[Math.floor(sorted.length * 0.95)],
      slowestQueries: this.dbMetrics
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 10)
        .map(q => ({
          query: q.query,
          duration: q.duration,
          tableName: q.tableName,
          operation: q.operation,
          timestamp: q.timestamp
        })),
      tableStats
    };
  }
  
  private calculateOverallPerformanceScore(): number {
    const scores: number[] = [];
    
    const webVitalScore = this.calculateWebVitalScore();
    if (webVitalScore !== null) scores.push(webVitalScore * 0.4);
    
    const apiStats = this.getStats('api');
    if (apiStats) scores.push(apiStats.performanceScore * 0.2);
    
    const queryStats = this.getStats('query');
    if (queryStats) scores.push(queryStats.performanceScore * 0.2);
    
    const renderStats = this.getStats('render');
    if (renderStats) scores.push(renderStats.performanceScore * 0.15);
    
    const errorRate = this.calculateErrorRate(this.entries);
    const errorScore = Math.max(0, 100 - errorRate * 2) * 0.05;
    scores.push(errorScore);
    
    return scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) : 50;
  }
  
  private calculateWebVitalScore(): number | null {
    const webVitalStats = this.getWebVitalsStats();
    const vitals = ['LCP', 'FID', 'CLS', 'TTFB'] as WebVitalType[];
    
    const scores: number[] = [];
    
    vitals.forEach(vital => {
      const stat = webVitalStats[vital];
      if (stat && stat.count > 0) {
        const goodRatio = stat.goodCount / stat.count;
        const needsImprovementRatio = stat.needsImprovementCount / stat.count;
        
        const score = (goodRatio * 100) + (needsImprovementRatio * 50);
        scores.push(score);
      }
    });
    
    return scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;
  }
  
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    const webVitalStats = this.getWebVitalsStats();
    if (webVitalStats.LCP && webVitalStats.LCP.poorCount > 0) {
      recommendations.push('Optimize Largest Contentful Paint by compressing images and implementing lazy loading');
    }
    if (webVitalStats.FID && webVitalStats.FID.poorCount > 0) {
      recommendations.push('Reduce First Input Delay by minimizing JavaScript execution time');
    }
    if (webVitalStats.CLS && webVitalStats.CLS.poorCount > 0) {
      recommendations.push('Improve Cumulative Layout Shift by specifying image dimensions and avoiding dynamic content insertion');
    }
    
    const apiStats = this.getStats('api');
    if (apiStats && apiStats.average > 1000) {
      recommendations.push('Optimize API response times by implementing caching and database query optimization');
    }
    
    const queryStats = this.getQueryStats();
    if (queryStats && queryStats.averageDuration > 100) {
      recommendations.push('Optimize database queries by adding indexes and reviewing query patterns');
    }
    
    const errorRate = this.calculateErrorRate(this.entries);
    if (errorRate > 5) {
      recommendations.push('Investigate and fix errors to improve application stability');
    }
    
    return recommendations;
  }
  
  private identifyRiskFactors(): Array<{ factor: string; severity: AlertSeverity; description: string }> {
    const risks: Array<{ factor: string; severity: AlertSeverity; description: string }> = [];
    
    const errorRate = this.calculateErrorRate(this.entries);
    if (errorRate > 10) {
      risks.push({
        factor: 'High Error Rate',
        severity: 'high',
        description: `${errorRate.toFixed(1)}% of operations are failing`
      });
    }
    
    const apiStats = this.getStats('api');
    if (apiStats && apiStats.p95 > 3000) {
      risks.push({
        factor: 'Slow API Performance',
        severity: 'medium',
        description: `95% of API calls take more than ${apiStats.p95.toFixed(0)}ms`
      });
    }
    
    const webVitalScore = this.calculateWebVitalScore();
    if (webVitalScore !== null && webVitalScore < 50) {
      risks.push({
        factor: 'Poor Core Web Vitals',
        severity: 'high',
        description: 'Core Web Vitals are below acceptable thresholds, impacting SEO and user experience'
      });
    }
    
    const journeyStats = this.getUserJourneyStats();
    Object.entries(journeyStats).forEach(([journeyType, stats]) => {
      if (stats.completionRate < 70) {
        risks.push({
          factor: 'High Journey Abandonment',
          severity: 'medium',
          description: `${journeyType} journey has ${(100 - stats.completionRate).toFixed(1)}% abandonment rate`
        });
      }
    });
    
    return risks;
  }
  
  export() {
    return {
      metadata: {
        sessionId: this.sessionId,
        userId: this.userId,
        exportTime: new Date().toISOString(),
        url: typeof window !== 'undefined' ? window.location.href : '',
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : ''
      },
      entries: this.entries,
      webVitals: this.webVitalEntries,
      userJourneys: Array.from(this.userJourneys.values()),
      alerts: this.alerts,
      insights: this.insights,
      dbMetrics: this.dbMetrics,
      bundleMetrics: this.bundleMetrics,
      
      stats: {
        all: this.getStats(),
        render: this.getStats("render"),
        api: this.getStats("api"),
        query: this.getStats("query"),
        webVital: this.getStats("web_vital"),
        userJourney: this.getStats("user_journey"),
        navigation: this.getStats("navigation"),
        interaction: this.getStats("interaction")
      },
      
      detailedStats: {
        webVitals: this.getWebVitalsStats(),
        userJourneys: this.getUserJourneyStats(),
        queries: this.getQueryStats()
      },
      
      performance: {
        overallScore: this.calculateOverallPerformanceScore(),
        recommendations: this.generateRecommendations(),
        riskFactors: this.identifyRiskFactors()
      }
    };
  }
  
  clear() {
    this.entries = [];
    this.webVitalEntries = [];
    this.userJourneys.clear();
    this.alerts = [];
    this.insights = [];
    this.dbMetrics = [];
  }
}

// =====================================================================================
// SINGLETON INSTANCE
// =====================================================================================

export const enhancedPerformanceMonitor = new EnhancedPerformanceMonitor();

if (typeof window !== 'undefined') {
  (window as any).__enhancedPerformanceMonitor = enhancedPerformanceMonitor;
}