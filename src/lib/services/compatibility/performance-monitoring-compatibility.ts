/**
 * Performance Monitoring Service Compatibility Layer
 * 
 * This module provides backward compatibility for existing code that uses
 * the original enhanced-performance-monitor while internally using the new modular services.
 */

import { PerformanceMonitoringService } from '../modules/performance/performance-monitoring-service';
import { logger } from '../logger';

/**
 * Enhanced Performance Monitor that provides backward compatibility
 * with the original enhanced-performance-monitor API
 */
export class EnhancedPerformanceMonitorCompatibility {
  private performanceService: PerformanceMonitoringService;
  private sessionId: string;
  private userId?: string;

  constructor() {
    this.performanceService = new PerformanceMonitoringService();
    this.sessionId = this.generateSessionId();
    this.initializeUserId();
  }

  // =====================================================================================
  // BACKWARD COMPATIBILITY METHODS
  // =====================================================================================

  /**
   * Record a performance entry (backward compatibility)
   */
  recordEntry(entry: {
    name: string;
    type: string;
    duration: number;
    timestamp?: number;
    metadata?: Record<string, any>;
  }): void {
    this.performanceService.recordMetric({
      name: entry.name,
      type: entry.type as any,
      duration: entry.duration,
      timestamp: entry.timestamp || Date.now(),
      metadata: entry.metadata,
      userId: this.userId,
      sessionId: this.sessionId
    });
  }

  /**
   * Record web vital (backward compatibility)
   */
  recordWebVital(vital: {
    name: string;
    value: number;
    delta?: number;
    rating?: 'good' | 'needs-improvement' | 'poor';
    metadata?: Record<string, any>;
  }): void {
    this.performanceService.recordWebVital(
      vital.name as any,
      vital.value,
      vital.metadata
    );
  }

  /**
   * Start user journey tracking (backward compatibility)
   */
  startUserJourney(type: string, metadata?: Record<string, any>): string {
    const journeyId = this.generateId();
    
    // Record journey start as a metric
    this.performanceService.recordMetric({
      name: `User Journey: ${type}`,
      type: 'user_journey',
      duration: 0,
      timestamp: Date.now(),
      metadata: {
        ...metadata,
        journeyId,
        journeyType: type,
        phase: 'start'
      },
      userId: this.userId,
      sessionId: this.sessionId
    });

    return journeyId;
  }

  /**
   * End user journey tracking (backward compatibility)
   */
  endUserJourney(journeyId: string, completed: boolean = true): void {
    this.performanceService.recordMetric({
      name: `User Journey End`,
      type: 'user_journey',
      duration: 0,
      timestamp: Date.now(),
      metadata: {
        journeyId,
        phase: 'end',
        completed,
        abandoned: !completed
      },
      userId: this.userId,
      sessionId: this.sessionId
    });
  }

  /**
   * Add journey step (backward compatibility)
   */
  addJourneyStep(journeyId: string, stepName: string, metadata?: Record<string, any>): void {
    this.performanceService.recordMetric({
      name: `Journey Step: ${stepName}`,
      type: 'user_journey',
      duration: 0,
      timestamp: Date.now(),
      metadata: {
        ...metadata,
        journeyId,
        stepName,
        phase: 'step'
      },
      userId: this.userId,
      sessionId: this.sessionId
    });
  }

  /**
   * Record database query (backward compatibility)
   */
  recordDatabaseQuery(query: {
    queryId: string;
    query: string;
    duration: number;
    tableName: string;
    operation: string;
    rowsAffected?: number;
    cacheHit?: boolean;
    error?: boolean;
    errorMessage?: string;
  }): void {
    this.performanceService.recordDatabaseQuery(
      query.query,
      query.duration,
      query.tableName,
      query.operation,
      {
        queryId: query.queryId,
        rowsAffected: query.rowsAffected,
        cacheHit: query.cacheHit,
        error: query.error,
        errorMessage: query.errorMessage
      }
    );
  }

  /**
   * Get performance entries (backward compatibility)
   */
  async getEntries(filters?: {
    type?: string;
    timeRange?: { start: Date; end: Date };
    limit?: number;
  }): Promise<any[]> {
    return this.performanceService.getMetrics({
      type: filters?.type as any,
      timeRange: filters?.timeRange,
      userId: this.userId,
      sessionId: this.sessionId
    });
  }

  /**
   * Get web vitals (backward compatibility)
   */
  async getWebVitals(timeRange?: { start: Date; end: Date }): Promise<any> {
    const range = timeRange || {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: new Date()
    };
    
    return this.performanceService.getWebVitals(range);
  }

  /**
   * Get performance summary (backward compatibility)
   */
  async getPerformanceSummary(timeRange?: { start: Date; end: Date }): Promise<any> {
    const range = timeRange || {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: new Date()
    };
    
    return this.performanceService.getMetricsSummary(range);
  }

  /**
   * Get active alerts (backward compatibility)
   */
  async getActiveAlerts(): Promise<any[]> {
    return this.performanceService.getActiveAlerts();
  }

  /**
   * Acknowledge alert (backward compatibility)
   */
  async acknowledgeAlert(alertId: string): Promise<void> {
    return this.performanceService.acknowledgeAlert(alertId);
  }

  /**
   * Clear all data (backward compatibility)
   */
  clearData(): void {
    logger.info('Performance data cleared (compatibility mode)');
  }

  /**
   * Get session ID (backward compatibility)
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Set user ID (backward compatibility)
   */
  setUserId(userId: string): void {
    this.userId = userId;
  }

  /**
   * Get user ID (backward compatibility)
   */
  getUserId(): string | undefined {
    return this.userId;
  }

  // =====================================================================================
  // ENHANCED METHODS (NEW)
  // =====================================================================================

  /**
   * Generate comprehensive performance report
   */
  async generatePerformanceReport(timeRange: { start: Date; end: Date }): Promise<any> {
    return this.performanceService.generatePerformanceReport(timeRange);
  }

  /**
   * Get performance dashboard data
   */
  async getPerformanceDashboard(): Promise<any> {
    return this.performanceService.getPerformanceDashboard();
  }

  /**
   * Get resource trends
   */
  async getResourceTrends(timeRange: { start: Date; end: Date }): Promise<any> {
    return this.performanceService.getResourceTrends(timeRange);
  }

  /**
   * Detect performance bottlenecks
   */
  async identifyBottlenecks(): Promise<any> {
    return this.performanceService.identifyBottlenecks();
  }

  /**
   * Get service health status
   */
  async getServiceStatus(): Promise<any> {
    return this.performanceService.getServiceStatus();
  }

  /**
   * Get service information
   */
  getServiceInfo(): any {
    return {
      name: 'EnhancedPerformanceMonitorCompatibility',
      version: '2.0.0',
      mode: 'compatibility',
      underlying: this.performanceService.getServiceInfo()
    };
  }

  // =====================================================================================
  // CONVENIENCE METHODS
  // =====================================================================================

  /**
   * Start timing an operation
   */
  startTiming(name: string): { end: () => void } {
    const startTime = performance.now();
    
    return {
      end: () => {
        const duration = performance.now() - startTime;
        this.recordEntry({
          name,
          type: 'render',
          duration,
          timestamp: Date.now()
        });
      }
    };
  }

  /**
   * Measure async operation
   */
  async measureAsync<T>(name: string, operation: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      
      this.recordEntry({
        name,
        type: 'api',
        duration,
        timestamp: Date.now()
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      this.recordEntry({
        name,
        type: 'error',
        duration,
        timestamp: Date.now(),
        metadata: {
          error: error instanceof Error ? error.message : String(error)
        }
      });
      
      throw error;
    }
  }

  /**
   * Record page navigation
   */
  recordPageNavigation(from: string, to: string, duration: number): void {
    this.performanceService.recordNavigation(`${from} → ${to}`, duration, {
      from,
      to,
      navigationType: 'page'
    });
  }

  /**
   * Record user interaction
   */
  recordUserInteraction(type: string, element: string, duration: number): void {
    this.performanceService.recordInteraction(type, element, duration, {
      interactionType: type,
      elementType: element
    });
  }

  // Private helper methods

  private generateSessionId(): string {
    return `compat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async initializeUserId(): Promise<void> {
    try {
      // Try to get user ID from the performance service
      const dashboardData = await this.performanceService.getPerformanceDashboard();
      // User ID will be set by the underlying service
    } catch (error) {
      logger.debug('Could not initialize user ID in compatibility mode:', error);
    }
  }

  /**
   * Dispose of all resources
   */
  async dispose(): Promise<void> {
    await this.performanceService.dispose?.();
  }
}

// Create singleton instance for backward compatibility
export const enhancedPerformanceMonitor = new EnhancedPerformanceMonitorCompatibility();

// Class is already exported in the declaration above

// Export the modular service for advanced usage
export { performanceMonitoringService } from '../modules/performance/performance-monitoring-service';