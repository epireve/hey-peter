/**
 * Performance Alert Service Module
 * 
 * This module handles performance alerting and monitoring including:
 * - Performance threshold monitoring
 * - Alert generation and management
 * - Notification systems
 * - Alert acknowledgment and resolution
 */

import { 
  IPerformanceAlertService, 
  ServiceDependencies, 
  ServiceContainer, 
  withErrorHandling,
  ServiceError,
  MetricType,
  AlertSeverity
} from '../../interfaces/service-interfaces';

export interface PerformanceAlert {
  id: string;
  type: MetricType;
  severity: AlertSeverity;
  message: string;
  threshold: number;
  actualValue: number;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  metadata?: Record<string, any>;
  conditions?: Record<string, any>;
}

export interface AlertRule {
  id: string;
  name: string;
  type: MetricType;
  condition: 'greater_than' | 'less_than' | 'equals' | 'not_equals';
  threshold: number;
  severity: AlertSeverity;
  enabled: boolean;
  description?: string;
  cooldownPeriod?: number; // minutes
  metadata?: Record<string, any>;
}

export class PerformanceAlertService implements IPerformanceAlertService {
  readonly serviceName = 'PerformanceAlertService';
  readonly version = '1.0.0';
  
  private readonly supabase;
  private readonly logger;
  private alerts: PerformanceAlert[] = [];
  private rules: AlertRule[] = [];
  private maxAlerts = 1000;
  private cooldownTracking: Map<string, Date> = new Map();
  private alertCallbacks: Array<(alert: PerformanceAlert) => void> = [];

  // Default alert rules
  private readonly defaultRules: Omit<AlertRule, 'id'>[] = [
    {
      name: 'Slow API Response',
      type: 'api',
      condition: 'greater_than',
      threshold: 2000,
      severity: 'medium',
      enabled: true,
      description: 'API response time exceeds 2 seconds',
      cooldownPeriod: 5
    },
    {
      name: 'Very Slow API Response',
      type: 'api',
      condition: 'greater_than',
      threshold: 5000,
      severity: 'high',
      enabled: true,
      description: 'API response time exceeds 5 seconds',
      cooldownPeriod: 2
    },
    {
      name: 'Slow Database Query',
      type: 'query',
      condition: 'greater_than',
      threshold: 500,
      severity: 'medium',
      enabled: true,
      description: 'Database query takes longer than 500ms',
      cooldownPeriod: 5
    },
    {
      name: 'Slow Component Render',
      type: 'render',
      condition: 'greater_than',
      threshold: 100,
      severity: 'low',
      enabled: true,
      description: 'Component render time exceeds 100ms',
      cooldownPeriod: 10
    },
    {
      name: 'Poor LCP',
      type: 'web_vital',
      condition: 'greater_than',
      threshold: 4000,
      severity: 'high',
      enabled: true,
      description: 'Largest Contentful Paint exceeds 4 seconds',
      cooldownPeriod: 5
    },
    {
      name: 'Poor FID',
      type: 'web_vital',
      condition: 'greater_than',
      threshold: 300,
      severity: 'medium',
      enabled: true,
      description: 'First Input Delay exceeds 300ms',
      cooldownPeriod: 5
    },
    {
      name: 'High Error Rate',
      type: 'error',
      condition: 'greater_than',
      threshold: 10,
      severity: 'critical',
      enabled: true,
      description: 'Error rate exceeds 10%',
      cooldownPeriod: 1
    }
  ];

  constructor(dependencies?: ServiceDependencies) {
    const deps = dependencies || ServiceContainer.getInstance().getDependencies();
    this.supabase = deps.supabase;
    this.logger = deps.logger;
    
    this.initializeDefaultRules();
    this.startPeriodicCleanup();
  }

  async isHealthy(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('performance_alerts')
        .select('id')
        .limit(1);
      
      return !error;
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * Create a performance alert
   */
  async createAlert(params: {
    type: MetricType;
    threshold: number;
    severity: AlertSeverity;
    message: string;
    conditions?: Record<string, any>;
  }): Promise<void> {
    try {
      const alert: PerformanceAlert = {
        id: this.generateId(),
        type: params.type,
        severity: params.severity,
        message: params.message,
        threshold: params.threshold,
        actualValue: 0, // Will be set when triggered
        timestamp: new Date(),
        acknowledged: false,
        metadata: {},
        conditions: params.conditions
      };

      this.alerts.push(alert);
      
      // Maintain max alerts limit
      if (this.alerts.length > this.maxAlerts) {
        this.alerts = this.alerts.slice(-this.maxAlerts);
      }

      // Store in database
      await this.storeAlert(alert);

      // Notify callbacks
      this.notifyAlertCallbacks(alert);

      this.logger.info('Performance alert created', {
        id: alert.id,
        type: alert.type,
        severity: alert.severity,
        message: alert.message
      });
    } catch (error) {
      this.logger.error('Failed to create performance alert', { params, error });
    }
  }

  /**
   * Check performance metrics against alert rules
   */
  async checkAlerts(): Promise<Array<{
    id: string;
    type: MetricType;
    severity: AlertSeverity;
    message: string;
    triggeredAt: Date;
    value: number;
    threshold: number;
  }>> {
    try {
      this.logger.debug('Checking performance alerts');

      const triggeredAlerts: Array<{
        id: string;
        type: MetricType;
        severity: AlertSeverity;
        message: string;
        triggeredAt: Date;
        value: number;
        threshold: number;
      }> = [];

      // Get recent performance data
      const recentData = await this.getRecentPerformanceData();

      // Check each rule
      for (const rule of this.rules) {
        if (!rule.enabled) continue;

        // Check cooldown period
        if (this.isInCooldown(rule.id)) continue;

        // Get relevant metrics for this rule
        const relevantMetrics = recentData.filter(m => m.type === rule.type);
        
        for (const metric of relevantMetrics) {
          if (this.evaluateRule(rule, metric.value)) {
            // Create alert
            const alert: PerformanceAlert = {
              id: this.generateId(),
              type: rule.type,
              severity: rule.severity,
              message: `${rule.name}: ${metric.name} (${metric.value}${this.getUnit(rule.type)})`,
              threshold: rule.threshold,
              actualValue: metric.value,
              timestamp: new Date(),
              acknowledged: false,
              metadata: {
                ruleId: rule.id,
                ruleName: rule.name,
                metricName: metric.name,
                ...metric.metadata
              }
            };

            this.alerts.push(alert);
            await this.storeAlert(alert);

            triggeredAlerts.push({
              id: alert.id,
              type: alert.type,
              severity: alert.severity,
              message: alert.message,
              triggeredAt: alert.timestamp,
              value: alert.actualValue,
              threshold: alert.threshold
            });

            // Set cooldown
            this.setCooldown(rule.id, rule.cooldownPeriod || 5);

            // Notify callbacks
            this.notifyAlertCallbacks(alert);

            this.logger.warn('Performance alert triggered', {
              ruleId: rule.id,
              ruleName: rule.name,
              alertId: alert.id,
              value: metric.value,
              threshold: rule.threshold
            });
          }
        }
      }

      return triggeredAlerts;
    } catch (error) {
      this.logger.error('Failed to check performance alerts', { error });
      return [];
    }
  }

  /**
   * Acknowledge a performance alert
   */
  async acknowledgeAlert(alertId: string): Promise<void> {
    try {
      this.logger.info('Acknowledging performance alert', { alertId });

      const { data: user } = await this.supabase.auth.getUser();
      const userId = user.user?.id;

      // Update local alert
      const alert = this.alerts.find(a => a.id === alertId);
      if (alert) {
        alert.acknowledged = true;
        alert.acknowledgedAt = new Date();
        alert.acknowledgedBy = userId;
      }

      // Update in database
      const { error } = await this.supabase
        .from('performance_alerts')
        .update({
          acknowledged: true,
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: userId
        })
        .eq('id', alertId);

      if (error) {
        throw this.createServiceError('ACKNOWLEDGE_ALERT_ERROR', 'Failed to acknowledge alert', error);
      }

      this.logger.info('Performance alert acknowledged', { alertId, userId });
    } catch (error) {
      this.logger.error('Failed to acknowledge performance alert', { alertId, error });
      throw error;
    }
  }

  /**
   * Get active (unacknowledged) alerts
   */
  async getActiveAlerts(): Promise<Array<{
    id: string;
    type: MetricType;
    severity: AlertSeverity;
    message: string;
    triggeredAt: Date;
    acknowledged: boolean;
  }>> {
    try {
      this.logger.debug('Fetching active performance alerts');

      const { data, error } = await this.supabase
        .from('performance_alerts')
        .select('*')
        .eq('acknowledged', false)
        .is('resolved_at', null)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) {
        throw this.createServiceError('FETCH_ALERTS_ERROR', 'Failed to fetch alerts', error);
      }

      const alerts = data?.map(alert => ({
        id: alert.id,
        type: alert.type as MetricType,
        severity: alert.severity as AlertSeverity,
        message: alert.message,
        triggeredAt: new Date(alert.timestamp),
        acknowledged: alert.acknowledged
      })) || [];

      this.logger.debug('Successfully fetched active alerts', { count: alerts.length });

      return alerts;
    } catch (error) {
      this.logger.error('Failed to get active alerts', { error });
      throw error;
    }
  }

  /**
   * Get alert statistics
   */
  async getAlertStats(timeRange: { start: Date; end: Date }): Promise<{
    totalAlerts: number;
    alertsBySeverity: Record<AlertSeverity, number>;
    alertsByType: Record<MetricType, number>;
    averageResolutionTime: number;
    topAlertMessages: Array<{ message: string; count: number }>;
  }> {
    try {
      this.logger.info('Calculating alert statistics', { timeRange });

      const { data, error } = await this.supabase
        .from('performance_alerts')
        .select('*')
        .gte('timestamp', timeRange.start.toISOString())
        .lte('timestamp', timeRange.end.toISOString());

      if (error) {
        throw this.createServiceError('FETCH_ALERT_STATS_ERROR', 'Failed to fetch alert stats', error);
      }

      const alerts = data || [];

      const stats = {
        totalAlerts: alerts.length,
        alertsBySeverity: {
          low: 0,
          medium: 0,
          high: 0,
          critical: 0
        } as Record<AlertSeverity, number>,
        alertsByType: {} as Record<MetricType, number>,
        averageResolutionTime: 0,
        topAlertMessages: [] as Array<{ message: string; count: number }>
      };

      // Calculate statistics
      let totalResolutionTime = 0;
      let resolvedCount = 0;
      const messageCounts: Record<string, number> = {};

      alerts.forEach(alert => {
        // Count by severity
        if (alert.severity in stats.alertsBySeverity) {
          stats.alertsBySeverity[alert.severity as AlertSeverity]++;
        }

        // Count by type
        if (!stats.alertsByType[alert.type as MetricType]) {
          stats.alertsByType[alert.type as MetricType] = 0;
        }
        stats.alertsByType[alert.type as MetricType]++;

        // Calculate resolution time
        if (alert.resolved_at) {
          const resolutionTime = new Date(alert.resolved_at).getTime() - new Date(alert.timestamp).getTime();
          totalResolutionTime += resolutionTime;
          resolvedCount++;
        }

        // Count messages
        messageCounts[alert.message] = (messageCounts[alert.message] || 0) + 1;
      });

      // Calculate average resolution time (in minutes)
      stats.averageResolutionTime = resolvedCount > 0 ? totalResolutionTime / resolvedCount / 60000 : 0;

      // Get top alert messages
      stats.topAlertMessages = Object.entries(messageCounts)
        .map(([message, count]) => ({ message, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      this.logger.info('Successfully calculated alert statistics', {
        timeRange,
        totalAlerts: stats.totalAlerts,
        averageResolutionTime: stats.averageResolutionTime
      });

      return stats;
    } catch (error) {
      this.logger.error('Failed to calculate alert stats', { timeRange, error });
      throw error;
    }
  }

  /**
   * Add alert callback
   */
  addAlertCallback(callback: (alert: PerformanceAlert) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Remove alert callback
   */
  removeAlertCallback(callback: (alert: PerformanceAlert) => void): void {
    const index = this.alertCallbacks.indexOf(callback);
    if (index > -1) {
      this.alertCallbacks.splice(index, 1);
    }
  }

  /**
   * Create or update alert rule
   */
  async createOrUpdateAlertRule(rule: Omit<AlertRule, 'id'> & { id?: string }): Promise<AlertRule> {
    try {
      const ruleId = rule.id || this.generateId();
      
      const alertRule: AlertRule = {
        ...rule,
        id: ruleId
      };

      // Update local rules
      const existingIndex = this.rules.findIndex(r => r.id === ruleId);
      if (existingIndex > -1) {
        this.rules[existingIndex] = alertRule;
      } else {
        this.rules.push(alertRule);
      }

      // Store in database
      const { error } = await this.supabase
        .from('performance_alert_rules')
        .upsert({
          id: alertRule.id,
          name: alertRule.name,
          type: alertRule.type,
          condition: alertRule.condition,
          threshold: alertRule.threshold,
          severity: alertRule.severity,
          enabled: alertRule.enabled,
          description: alertRule.description,
          cooldown_period: alertRule.cooldownPeriod,
          metadata: alertRule.metadata
        });

      if (error) {
        throw this.createServiceError('UPSERT_RULE_ERROR', 'Failed to create/update rule', error);
      }

      this.logger.info('Alert rule created/updated', {
        id: alertRule.id,
        name: alertRule.name,
        type: alertRule.type
      });

      return alertRule;
    } catch (error) {
      this.logger.error('Failed to create/update alert rule', { rule, error });
      throw error;
    }
  }

  // Private helper methods

  private generateId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeDefaultRules(): void {
    this.defaultRules.forEach(rule => {
      this.rules.push({
        ...rule,
        id: this.generateId()
      });
    });
  }

  private startPeriodicCleanup(): void {
    // Clean up old alerts every hour
    setInterval(() => {
      this.cleanupOldAlerts();
    }, 60 * 60 * 1000);
  }

  private cleanupOldAlerts(): void {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // Remove old alerts from memory
    this.alerts = this.alerts.filter(alert => alert.timestamp > oneWeekAgo);
    
    // Clean up cooldown tracking
    this.cooldownTracking.forEach((timestamp, ruleId) => {
      if (timestamp < oneWeekAgo) {
        this.cooldownTracking.delete(ruleId);
      }
    });
  }

  private isInCooldown(ruleId: string): boolean {
    const cooldownEnd = this.cooldownTracking.get(ruleId);
    if (!cooldownEnd) return false;
    
    return new Date() < cooldownEnd;
  }

  private setCooldown(ruleId: string, minutes: number): void {
    const cooldownEnd = new Date(Date.now() + minutes * 60 * 1000);
    this.cooldownTracking.set(ruleId, cooldownEnd);
  }

  private evaluateRule(rule: AlertRule, value: number): boolean {
    switch (rule.condition) {
      case 'greater_than':
        return value > rule.threshold;
      case 'less_than':
        return value < rule.threshold;
      case 'equals':
        return value === rule.threshold;
      case 'not_equals':
        return value !== rule.threshold;
      default:
        return false;
    }
  }

  private getUnit(type: MetricType): string {
    switch (type) {
      case 'render':
      case 'api':
      case 'query':
      case 'navigation':
      case 'interaction':
      case 'web_vital':
        return 'ms';
      case 'error':
        return '%';
      default:
        return '';
    }
  }

  private async getRecentPerformanceData(): Promise<Array<{
    type: MetricType;
    name: string;
    value: number;
    timestamp: Date;
    metadata?: Record<string, any>;
  }>> {
    try {
      // Get data from the last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      const { data, error } = await this.supabase
        .from('performance_metrics')
        .select('*')
        .gte('timestamp', fiveMinutesAgo.getTime())
        .order('timestamp', { ascending: false })
        .limit(1000);

      if (error) {
        this.logger.error('Failed to fetch recent performance data:', error);
        return [];
      }

      return data?.map(metric => ({
        type: metric.type as MetricType,
        name: metric.name,
        value: metric.duration,
        timestamp: new Date(metric.timestamp),
        metadata: metric.metadata
      })) || [];
    } catch (error) {
      this.logger.error('Failed to get recent performance data:', error);
      return [];
    }
  }

  private notifyAlertCallbacks(alert: PerformanceAlert): void {
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        this.logger.error('Alert callback failed:', error);
      }
    });
  }

  private async storeAlert(alert: PerformanceAlert): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('performance_alerts')
        .insert({
          id: alert.id,
          type: alert.type,
          severity: alert.severity,
          message: alert.message,
          threshold: alert.threshold,
          actual_value: alert.actualValue,
          timestamp: alert.timestamp.toISOString(),
          acknowledged: alert.acknowledged,
          acknowledged_at: alert.acknowledgedAt?.toISOString(),
          acknowledged_by: alert.acknowledgedBy,
          resolved_at: alert.resolvedAt?.toISOString(),
          resolved_by: alert.resolvedBy,
          metadata: alert.metadata,
          conditions: alert.conditions
        });

      if (error) {
        this.logger.error('Failed to store performance alert:', error);
      }
    } catch (error) {
      this.logger.error('Failed to store performance alert:', error);
    }
  }

  private createServiceError(code: string, message: string, details?: any): ServiceError {
    return {
      code,
      message,
      details,
      timestamp: new Date(),
      service: this.serviceName
    };
  }

  async dispose(): Promise<void> {
    this.logger.info('Disposing performance alert service');
    
    this.alerts = [];
    this.rules = [];
    this.cooldownTracking.clear();
    this.alertCallbacks = [];
  }
}

// Create and export singleton instance
export const performanceAlertService = withErrorHandling(new PerformanceAlertService());