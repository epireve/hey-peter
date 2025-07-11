/**
 * Unified Performance Monitoring Service
 * 
 * This service provides a unified interface to all performance monitoring operations
 * while internally using the focused service modules for better maintainability.
 */

import { 
  ServiceDependencies, 
  ServiceContainer, 
  withErrorHandling,
  ServiceError,
  MetricType,
  WebVitalType,
  AlertSeverity,
  PerformanceEntry
} from '../../interfaces/service-interfaces';

import { WebVitalsService } from './web-vitals-service';
import { PerformanceMetricsService } from './performance-metrics-service';
import { PerformanceAlertService } from './performance-alert-service';
import { ResourceMonitoringService } from './resource-monitoring-service';

/**
 * Unified Performance Monitoring Service that delegates to specialized modules
 */
export class PerformanceMonitoringService {
  readonly serviceName = 'PerformanceMonitoringService';
  readonly version = '1.0.0';
  
  private readonly webVitalsService: WebVitalsService;
  private readonly metricsService: PerformanceMetricsService;
  private readonly alertService: PerformanceAlertService;
  private readonly resourceService: ResourceMonitoringService;
  private readonly logger;

  constructor(dependencies?: ServiceDependencies) {
    const deps = dependencies || ServiceContainer.getInstance().getDependencies();
    this.logger = deps.logger;
    
    // Initialize service modules
    this.webVitalsService = new WebVitalsService(deps);
    this.metricsService = new PerformanceMetricsService(deps);
    this.alertService = new PerformanceAlertService(deps);
    this.resourceService = new ResourceMonitoringService(deps);

    // Set up alert callbacks
    this.setupAlertIntegration();
  }

  async isHealthy(): Promise<boolean> {
    try {
      const healthChecks = await Promise.all([
        this.webVitalsService.isHealthy(),
        this.metricsService.isHealthy(),
        this.alertService.isHealthy(),
        this.resourceService.isHealthy()
      ]);

      return healthChecks.every(check => check === true);
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return false;
    }
  }

  // =====================================================================================
  // WEB VITALS (delegated to WebVitalsService)
  // =====================================================================================

  async recordWebVital(type: WebVitalType, value: number, metadata?: Record<string, any>): Promise<void> {
    return this.webVitalsService.recordWebVital(type, value, metadata);
  }

  async getWebVitals(timeRange: { start: Date; end: Date }) {
    return this.webVitalsService.getWebVitals(timeRange);
  }

  async checkWebVitalThresholds() {
    return this.webVitalsService.checkWebVitalThresholds();
  }

  async getWebVitalTrends(timeRange: { start: Date; end: Date }, interval: 'hour' | 'day' = 'hour') {
    return this.webVitalsService.getWebVitalTrends(timeRange, interval);
  }

  // =====================================================================================
  // PERFORMANCE METRICS (delegated to PerformanceMetricsService)
  // =====================================================================================

  async recordMetric(entry: PerformanceEntry): Promise<void> {
    return this.metricsService.recordMetric(entry);
  }

  async getMetrics(filters: {
    type?: MetricType;
    timeRange?: { start: Date; end: Date };
    userId?: string;
    sessionId?: string;
  }): Promise<PerformanceEntry[]> {
    return this.metricsService.getMetrics(filters);
  }

  async getMetricsSummary(timeRange: { start: Date; end: Date }) {
    return this.metricsService.getMetricsSummary(timeRange);
  }

  async getPerformanceTrends(timeRange: { start: Date; end: Date }, interval: 'hour' | 'day' = 'hour') {
    return this.metricsService.getPerformanceTrends(timeRange, interval);
  }

  // Convenience methods for common metrics
  recordRenderTime(componentName: string, duration: number, metadata?: Record<string, any>): void {
    this.metricsService.recordRenderTime(componentName, duration, metadata);
  }

  recordApiCall(endpoint: string, method: string, duration: number, status: number, metadata?: Record<string, any>): void {
    this.metricsService.recordApiCall(endpoint, method, duration, status, metadata);
  }

  recordDatabaseQuery(query: string, duration: number, tableName: string, operation: string, metadata?: Record<string, any>): void {
    this.metricsService.recordDatabaseQuery(query, duration, tableName, operation, metadata);
  }

  recordNavigation(pageName: string, duration: number, metadata?: Record<string, any>): void {
    this.metricsService.recordNavigation(pageName, duration, metadata);
  }

  recordInteraction(interactionType: string, elementType: string, duration: number, metadata?: Record<string, any>): void {
    this.metricsService.recordInteraction(interactionType, elementType, duration, metadata);
  }

  // =====================================================================================
  // PERFORMANCE ALERTS (delegated to PerformanceAlertService)
  // =====================================================================================

  async createAlert(params: {
    type: MetricType;
    threshold: number;
    severity: AlertSeverity;
    message: string;
    conditions?: Record<string, any>;
  }): Promise<void> {
    return this.alertService.createAlert(params);
  }

  async checkAlerts() {
    return this.alertService.checkAlerts();
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    return this.alertService.acknowledgeAlert(alertId);
  }

  async getActiveAlerts() {
    return this.alertService.getActiveAlerts();
  }

  async getAlertStats(timeRange: { start: Date; end: Date }) {
    return this.alertService.getAlertStats(timeRange);
  }

  addAlertCallback(callback: (alert: any) => void): void {
    this.alertService.addAlertCallback(callback);
  }

  removeAlertCallback(callback: (alert: any) => void): void {
    this.alertService.removeAlertCallback(callback);
  }

  // =====================================================================================
  // RESOURCE MONITORING (delegated to ResourceMonitoringService)
  // =====================================================================================

  async recordResourceUsage(params: {
    memoryUsage: number;
    cpuUsage: number;
    networkRequests: number;
    timestamp: Date;
  }): Promise<void> {
    return this.resourceService.recordResourceUsage(params);
  }

  async getResourceTrends(timeRange: { start: Date; end: Date }) {
    return this.resourceService.getResourceTrends(timeRange);
  }

  async detectResourceLeaks() {
    return this.resourceService.detectResourceLeaks();
  }

  async getCurrentResourceUsage() {
    return this.resourceService.getCurrentResourceUsage();
  }

  async getResourceStats(timeRange: { start: Date; end: Date }) {
    return this.resourceService.getResourceStats(timeRange);
  }

  async identifyBottlenecks() {
    return this.resourceService.identifyBottlenecks();
  }

  // =====================================================================================
  // COMPREHENSIVE PERFORMANCE REPORTS
  // =====================================================================================

  /**
   * Generate a comprehensive performance report
   */
  async generatePerformanceReport(timeRange: { start: Date; end: Date }): Promise<{
    summary: {
      overallScore: number;
      webVitalsScore: number;
      performanceScore: number;
      resourceScore: number;
      alertScore: number;
    };
    webVitals: any;
    metrics: any;
    resources: any;
    alerts: any;
    recommendations: Array<{
      category: string;
      priority: 'low' | 'medium' | 'high';
      title: string;
      description: string;
      impact: string;
    }>;
  }> {
    try {
      this.logger.info('Generating comprehensive performance report', { timeRange });

      // Get data from all services in parallel
      const [
        webVitals,
        metricsSummary,
        performanceTrends,
        resourceStats,
        alertStats,
        bottlenecks
      ] = await Promise.all([
        this.webVitalsService.getWebVitals(timeRange),
        this.metricsService.getMetricsSummary(timeRange),
        this.metricsService.getPerformanceTrends(timeRange),
        this.resourceService.getResourceStats(timeRange),
        this.alertService.getAlertStats(timeRange),
        this.resourceService.identifyBottlenecks()
      ]);

      // Calculate scores
      const webVitalsScore = this.calculateWebVitalsScore(webVitals);
      const performanceScore = this.calculatePerformanceScore(metricsSummary);
      const resourceScore = this.calculateResourceScore(resourceStats);
      const alertScore = this.calculateAlertScore(alertStats);
      const overallScore = Math.round((webVitalsScore + performanceScore + resourceScore + alertScore) / 4);

      // Generate recommendations
      const recommendations = this.generateRecommendations({
        webVitals,
        metricsSummary,
        resourceStats,
        alertStats,
        bottlenecks
      });

      const report = {
        summary: {
          overallScore,
          webVitalsScore,
          performanceScore,
          resourceScore,
          alertScore
        },
        webVitals,
        metrics: {
          summary: metricsSummary,
          trends: performanceTrends
        },
        resources: {
          stats: resourceStats,
          bottlenecks
        },
        alerts: alertStats,
        recommendations
      };

      this.logger.info('Performance report generated successfully', {
        timeRange,
        overallScore,
        recommendationCount: recommendations.length
      });

      return report;
    } catch (error) {
      this.logger.error('Failed to generate performance report', { timeRange, error });
      throw error;
    }
  }

  /**
   * Get real-time performance dashboard data
   */
  async getPerformanceDashboard(): Promise<{
    currentMetrics: {
      webVitals: any;
      resources: any;
      alerts: any;
    };
    trends: {
      performance: any;
      resources: any;
    };
    healthStatus: {
      overall: boolean;
      webVitals: boolean;
      performance: boolean;
      resources: boolean;
      alerts: boolean;
    };
  }> {
    try {
      this.logger.info('Getting performance dashboard data');

      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Get current data
      const [
        webVitals,
        currentResources,
        activeAlerts,
        performanceTrends,
        resourceTrends,
        healthStatus
      ] = await Promise.all([
        this.webVitalsService.getWebVitals({ start: oneHourAgo, end: now }),
        this.resourceService.getCurrentResourceUsage(),
        this.alertService.getActiveAlerts(),
        this.metricsService.getPerformanceTrends({ start: oneDayAgo, end: now }, 'hour'),
        this.resourceService.getResourceTrends({ start: oneDayAgo, end: now }),
        this.getServiceStatus()
      ]);

      const dashboard = {
        currentMetrics: {
          webVitals,
          resources: currentResources,
          alerts: activeAlerts
        },
        trends: {
          performance: performanceTrends,
          resources: resourceTrends
        },
        healthStatus
      };

      this.logger.info('Performance dashboard data retrieved successfully', {
        activeAlerts: activeAlerts.length,
        healthStatus: healthStatus.overall
      });

      return dashboard;
    } catch (error) {
      this.logger.error('Failed to get performance dashboard data', { error });
      throw error;
    }
  }

  // =====================================================================================
  // SERVICE MANAGEMENT
  // =====================================================================================

  /**
   * Get status of all service modules
   */
  async getServiceStatus(): Promise<{
    overall: boolean;
    modules: {
      webVitals: boolean;
      metrics: boolean;
      alerts: boolean;
      resources: boolean;
    };
  }> {
    const [webVitals, metrics, alerts, resources] = await Promise.all([
      this.webVitalsService.isHealthy(),
      this.metricsService.isHealthy(),
      this.alertService.isHealthy(),
      this.resourceService.isHealthy()
    ]);

    return {
      overall: webVitals && metrics && alerts && resources,
      modules: {
        webVitals,
        metrics,
        alerts,
        resources
      }
    };
  }

  /**
   * Get service information
   */
  getServiceInfo(): {
    name: string;
    version: string;
    modules: Array<{
      name: string;
      version: string;
    }>;
  } {
    return {
      name: this.serviceName,
      version: this.version,
      modules: [
        { name: this.webVitalsService.serviceName, version: this.webVitalsService.version },
        { name: this.metricsService.serviceName, version: this.metricsService.version },
        { name: this.alertService.serviceName, version: this.alertService.version },
        { name: this.resourceService.serviceName, version: this.resourceService.version }
      ]
    };
  }

  // Private helper methods

  private setupAlertIntegration(): void {
    // Set up automatic alert checking based on metrics
    this.alertService.addAlertCallback((alert) => {
      this.logger.warn('Performance alert triggered', {
        id: alert.id,
        type: alert.type,
        severity: alert.severity,
        message: alert.message
      });
    });
  }

  private calculateWebVitalsScore(webVitals: any): number {
    if (!webVitals) return 0;

    let score = 100;
    
    // Penalize poor web vitals
    if (webVitals.LCP?.p75 > 4000) score -= 20;
    else if (webVitals.LCP?.p75 > 2500) score -= 10;
    
    if (webVitals.FID?.p75 > 300) score -= 20;
    else if (webVitals.FID?.p75 > 100) score -= 10;
    
    if (webVitals.CLS?.p75 > 0.25) score -= 20;
    else if (webVitals.CLS?.p75 > 0.1) score -= 10;

    return Math.max(0, score);
  }

  private calculatePerformanceScore(metrics: any): number {
    if (!metrics) return 0;

    let score = 100;
    
    // Penalize slow response times
    if (metrics.averageResponseTime > 2000) score -= 30;
    else if (metrics.averageResponseTime > 1000) score -= 15;
    
    // Penalize high error rates
    if (metrics.errorRate > 10) score -= 40;
    else if (metrics.errorRate > 5) score -= 20;
    else if (metrics.errorRate > 1) score -= 10;

    return Math.max(0, score);
  }

  private calculateResourceScore(resources: any): number {
    if (!resources) return 0;

    let score = 100;
    
    // Penalize high resource usage
    if (resources.avgMemoryUsage > 500) score -= 20;
    else if (resources.avgMemoryUsage > 200) score -= 10;
    
    if (resources.avgCpuUsage > 80) score -= 20;
    else if (resources.avgCpuUsage > 50) score -= 10;
    
    // Reward high cache hit rate
    if (resources.avgCacheHitRate > 80) score += 5;
    
    return Math.max(0, Math.min(100, score));
  }

  private calculateAlertScore(alerts: any): number {
    if (!alerts) return 100;

    let score = 100;
    
    // Penalize based on alert severity
    score -= alerts.alertsBySeverity.critical * 10;
    score -= alerts.alertsBySeverity.high * 5;
    score -= alerts.alertsBySeverity.medium * 2;
    score -= alerts.alertsBySeverity.low * 1;

    return Math.max(0, score);
  }

  private generateRecommendations(data: {
    webVitals: any;
    metricsSummary: any;
    resourceStats: any;
    alertStats: any;
    bottlenecks: any;
  }): Array<{
    category: string;
    priority: 'low' | 'medium' | 'high';
    title: string;
    description: string;
    impact: string;
  }> {
    const recommendations = [];

    // Web Vitals recommendations
    if (data.webVitals?.LCP?.p75 > 4000) {
      recommendations.push({
        category: 'Web Vitals',
        priority: 'high' as const,
        title: 'Optimize Largest Contentful Paint',
        description: 'LCP is over 4 seconds, which significantly impacts user experience.',
        impact: 'Faster page loads will improve user satisfaction and SEO rankings.'
      });
    }

    // Performance recommendations
    if (data.metricsSummary?.averageResponseTime > 2000) {
      recommendations.push({
        category: 'API Performance',
        priority: 'high' as const,
        title: 'Optimize API Response Times',
        description: 'Average API response time exceeds 2 seconds.',
        impact: 'Faster API responses will improve user experience and reduce bounce rates.'
      });
    }

    // Resource recommendations
    if (data.resourceStats?.avgMemoryUsage > 500) {
      recommendations.push({
        category: 'Memory Usage',
        priority: 'medium' as const,
        title: 'Optimize Memory Usage',
        description: 'High memory usage detected, which may cause performance issues.',
        impact: 'Lower memory usage will improve performance and prevent crashes.'
      });
    }

    // Alert recommendations
    if (data.alertStats?.alertsBySeverity?.critical > 0) {
      recommendations.push({
        category: 'Alerts',
        priority: 'high' as const,
        title: 'Address Critical Alerts',
        description: 'Critical performance alerts need immediate attention.',
        impact: 'Resolving critical alerts will prevent system failures and improve reliability.'
      });
    }

    // Bottleneck recommendations
    if (data.bottlenecks?.length > 0) {
      data.bottlenecks.forEach((bottleneck: any) => {
        recommendations.push({
          category: 'Bottlenecks',
          priority: bottleneck.impact === 'high' ? 'high' : 'medium' as const,
          title: `Optimize ${bottleneck.component}`,
          description: bottleneck.description,
          impact: `Resolving this bottleneck will improve ${bottleneck.affectedOperations.join(', ')}.`
        });
      });
    }

    return recommendations;
  }

  async dispose(): Promise<void> {
    this.logger.info('Disposing performance monitoring service');
    
    await Promise.all([
      this.webVitalsService.dispose?.(),
      this.metricsService.dispose?.(),
      this.alertService.dispose?.(),
      this.resourceService.dispose?.()
    ].filter(Boolean));
  }
}

// Create and export singleton instance
export const performanceMonitoringService = withErrorHandling(new PerformanceMonitoringService());