import { loggingService, LogCategory, LogLevel } from './logging-service';
import { errorTrackingService } from './error-tracking-service';

import { logger } from '@/lib/services';
export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: AlertCondition[];
  actions: AlertAction[];
  cooldownPeriod: number; // minutes
  severity: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  updatedAt: string;
}

export interface AlertCondition {
  type: 'error_rate' | 'error_count' | 'performance' | 'log_pattern' | 'custom';
  metric: string;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'contains' | 'not_contains';
  value: number | string;
  timeWindow: number; // minutes
  filters?: Record<string, any>;
}

export interface AlertAction {
  type: 'email' | 'webhook' | 'slack' | 'teams' | 'database' | 'custom';
  config: Record<string, any>;
  template?: string;
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'firing' | 'resolved' | 'suppressed';
  triggeredAt: string;
  resolvedAt?: string;
  message: string;
  details: Record<string, any>;
  context: {
    errorCount?: number;
    errorRate?: number;
    affectedUsers?: number;
    timeWindow: string;
    query?: string;
  };
  actions: Array<{
    type: string;
    status: 'pending' | 'sent' | 'failed';
    timestamp: string;
    error?: string;
  }>;
}

export interface AlertingSummary {
  activeAlerts: number;
  totalAlerts: number;
  alertsByRule: Record<string, number>;
  alertsBySeverity: Record<string, number>;
  recentAlerts: Alert[];
  mttr: number; // Mean Time To Resolution in minutes
  alertTrends: Array<{
    timestamp: string;
    count: number;
    severity: string;
  }>;
}

class ErrorAlertingService {
  private rules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private alertCooldowns: Map<string, number> = new Map();
  private checkInterval = 60000; // 1 minute
  private checkTimer?: NodeJS.Timeout;

  constructor() {
    this.initializeDefaultRules();
    this.startPeriodicChecks();
  }

  private initializeDefaultRules(): void {
    // High error rate rule
    this.addRule({
      id: 'high_error_rate',
      name: 'High Error Rate',
      description: 'Triggers when error rate exceeds 5% in 5 minutes',
      enabled: true,
      conditions: [{
        type: 'error_rate',
        metric: 'error_percentage',
        operator: 'gt',
        value: 5,
        timeWindow: 5
      }],
      actions: [{
        type: 'email',
        config: { recipients: ['admin@heypeter.com'] }
      }],
      cooldownPeriod: 15,
      severity: 'high',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Critical error spike rule
    this.addRule({
      id: 'critical_error_spike',
      name: 'Critical Error Spike',
      description: 'Triggers when more than 10 critical errors occur in 5 minutes',
      enabled: true,
      conditions: [{
        type: 'error_count',
        metric: 'fatal_errors',
        operator: 'gt',
        value: 10,
        timeWindow: 5,
        filters: { level: 'fatal' }
      }],
      actions: [
        { type: 'email', config: { recipients: ['admin@heypeter.com'], priority: 'high' } },
        { type: 'webhook', config: { url: process.env.ALERT_WEBHOOK_URL } }
      ],
      cooldownPeriod: 5,
      severity: 'critical',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Performance degradation rule
    this.addRule({
      id: 'performance_degradation',
      name: 'Performance Degradation',
      description: 'Triggers when average response time exceeds 2 seconds',
      enabled: true,
      conditions: [{
        type: 'performance',
        metric: 'avg_response_time',
        operator: 'gt',
        value: 2000,
        timeWindow: 10
      }],
      actions: [{
        type: 'email',
        config: { recipients: ['admin@heypeter.com'] }
      }],
      cooldownPeriod: 30,
      severity: 'medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Database error pattern rule
    this.addRule({
      id: 'database_errors',
      name: 'Database Connection Errors',
      description: 'Triggers on database connection failures',
      enabled: true,
      conditions: [{
        type: 'log_pattern',
        metric: 'log_message',
        operator: 'contains',
        value: 'database connection',
        timeWindow: 5,
        filters: { category: 'database', level: 'error' }
      }],
      actions: [{
        type: 'email',
        config: { recipients: ['admin@heypeter.com'] }
      }],
      cooldownPeriod: 10,
      severity: 'high',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  private startPeriodicChecks(): void {
    this.checkTimer = setInterval(() => {
      this.evaluateRules();
    }, this.checkInterval);
  }

  private async evaluateRules(): Promise<void> {
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      try {
        await this.evaluateRule(rule);
      } catch (error) {
        loggingService.error(
          LogCategory.SYSTEM,
          `Failed to evaluate alert rule: ${rule.name}`,
          { ruleId: rule.id, error: error.message },
          error as Error
        );
      }
    }
  }

  private async evaluateRule(rule: AlertRule): Promise<void> {
    // Check cooldown
    const lastAlert = this.alertCooldowns.get(rule.id);
    if (lastAlert && Date.now() - lastAlert < rule.cooldownPeriod * 60 * 1000) {
      return;
    }

    let triggered = false;
    const context: Alert['context'] = { timeWindow: `${Math.max(...rule.conditions.map(c => c.timeWindow))} minutes` };

    for (const condition of rule.conditions) {
      const result = await this.evaluateCondition(condition);
      if (result.triggered) {
        triggered = true;
        Object.assign(context, result.context);
        break; // OR logic - any condition triggers the alert
      }
    }

    if (triggered) {
      await this.triggerAlert(rule, context);
    }
  }

  private async evaluateCondition(condition: AlertCondition): Promise<{ triggered: boolean; context: Record<string, any> }> {
    const timeWindow = condition.timeWindow;
    const startTime = new Date(Date.now() - timeWindow * 60 * 1000);
    
    try {
      switch (condition.type) {
        case 'error_rate':
          return await this.evaluateErrorRate(condition, startTime);
        case 'error_count':
          return await this.evaluateErrorCount(condition, startTime);
        case 'performance':
          return await this.evaluatePerformance(condition, startTime);
        case 'log_pattern':
          return await this.evaluateLogPattern(condition, startTime);
        default:
          return { triggered: false, context: {} };
      }
    } catch (error) {
      loggingService.error(
        LogCategory.SYSTEM,
        `Failed to evaluate condition: ${condition.type}`,
        { condition, error: error.message },
        error as Error
      );
      return { triggered: false, context: {} };
    }
  }

  private async evaluateErrorRate(condition: AlertCondition, startTime: Date): Promise<{ triggered: boolean; context: Record<string, any> }> {
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();

    // Get total logs and error logs in the time window
    const { data: totalLogs } = await supabase
      .from('system_logs')
      .select('id', { count: 'exact' })
      .gte('timestamp', startTime.toISOString());

    const { data: errorLogs } = await supabase
      .from('system_logs')
      .select('id', { count: 'exact' })
      .gte('timestamp', startTime.toISOString())
      .in('level', ['error', 'fatal']);

    const totalCount = totalLogs?.length || 0;
    const errorCount = errorLogs?.length || 0;
    const errorRate = totalCount > 0 ? (errorCount / totalCount) * 100 : 0;

    const triggered = this.compareValues(errorRate, condition.operator, condition.value as number);

    return {
      triggered,
      context: {
        errorRate: Math.round(errorRate * 100) / 100,
        errorCount,
        totalLogs: totalCount
      }
    };
  }

  private async evaluateErrorCount(condition: AlertCondition, startTime: Date): Promise<{ triggered: boolean; context: Record<string, any> }> {
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();

    let query = supabase
      .from('system_logs')
      .select('id', { count: 'exact' })
      .gte('timestamp', startTime.toISOString());

    // Apply filters
    if (condition.filters) {
      Object.entries(condition.filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    const { data: logs } = await query;
    const count = logs?.length || 0;

    const triggered = this.compareValues(count, condition.operator, condition.value as number);

    return {
      triggered,
      context: {
        errorCount: count
      }
    };
  }

  private async evaluatePerformance(condition: AlertCondition, startTime: Date): Promise<{ triggered: boolean; context: Record<string, any> }> {
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();

    const { data: metrics } = await supabase
      .from('performance_metrics')
      .select('value')
      .eq('name', condition.metric)
      .gte('timestamp', startTime.toISOString());

    if (!metrics || metrics.length === 0) {
      return { triggered: false, context: {} };
    }

    const avgValue = metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
    const triggered = this.compareValues(avgValue, condition.operator, condition.value as number);

    return {
      triggered,
      context: {
        avgValue: Math.round(avgValue * 100) / 100,
        sampleCount: metrics.length
      }
    };
  }

  private async evaluateLogPattern(condition: AlertCondition, startTime: Date): Promise<{ triggered: boolean; context: Record<string, any> }> {
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();

    let query = supabase
      .from('system_logs')
      .select('*')
      .gte('timestamp', startTime.toISOString());

    // Apply filters
    if (condition.filters) {
      Object.entries(condition.filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    const { data: logs } = await query;

    if (!logs || logs.length === 0) {
      return { triggered: false, context: {} };
    }

    let matchCount = 0;
    const pattern = condition.value as string;

    logs.forEach(log => {
      if (condition.operator === 'contains' && log.message.toLowerCase().includes(pattern.toLowerCase())) {
        matchCount++;
      } else if (condition.operator === 'not_contains' && !log.message.toLowerCase().includes(pattern.toLowerCase())) {
        matchCount++;
      }
    });

    const triggered = matchCount > 0;

    return {
      triggered,
      context: {
        matchCount,
        pattern,
        totalLogs: logs.length
      }
    };
  }

  private compareValues(actual: number, operator: AlertCondition['operator'], expected: number): boolean {
    switch (operator) {
      case 'gt': return actual > expected;
      case 'gte': return actual >= expected;
      case 'lt': return actual < expected;
      case 'lte': return actual <= expected;
      case 'eq': return actual === expected;
      default: return false;
    }
  }

  private async triggerAlert(rule: AlertRule, context: Alert['context']): Promise<void> {
    const alertId = this.generateAlertId();
    const timestamp = new Date().toISOString();

    const alert: Alert = {
      id: alertId,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      status: 'firing',
      triggeredAt: timestamp,
      message: this.generateAlertMessage(rule, context),
      details: {
        rule: rule.description,
        conditions: rule.conditions
      },
      context,
      actions: []
    };

    this.activeAlerts.set(alertId, alert);
    this.alertCooldowns.set(rule.id, Date.now());

    // Log the alert
    loggingService.error(
      LogCategory.SYSTEM,
      `Alert triggered: ${rule.name}`,
      {
        alertId,
        ruleId: rule.id,
        severity: rule.severity,
        context
      }
    );

    // Execute alert actions
    await this.executeAlertActions(alert, rule.actions);

    // Store alert in database
    await this.storeAlert(alert);
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAlertMessage(rule: AlertRule, context: Alert['context']): string {
    let message = `${rule.name}: ${rule.description}`;
    
    if (context.errorRate !== undefined) {
      message += ` (Error rate: ${context.errorRate}%)`;
    }
    if (context.errorCount !== undefined) {
      message += ` (Error count: ${context.errorCount})`;
    }
    if (context.avgValue !== undefined) {
      message += ` (Average: ${context.avgValue})`;
    }
    
    return message;
  }

  private async executeAlertActions(alert: Alert, actions: AlertAction[]): Promise<void> {
    for (const action of actions) {
      const actionStatus = {
        type: action.type,
        status: 'pending' as const,
        timestamp: new Date().toISOString()
      };

      alert.actions.push(actionStatus);

      try {
        await this.executeAction(alert, action);
        actionStatus.status = 'sent';
      } catch (error) {
        actionStatus.status = 'failed';
        actionStatus.error = error.message;
        
        loggingService.error(
          LogCategory.SYSTEM,
          `Alert action failed: ${action.type}`,
          {
            alertId: alert.id,
            actionType: action.type,
            error: error.message
          },
          error as Error
        );
      }
    }
  }

  private async executeAction(alert: Alert, action: AlertAction): Promise<void> {
    switch (action.type) {
      case 'email':
        await this.sendEmailAlert(alert, action.config);
        break;
      case 'webhook':
        await this.sendWebhookAlert(alert, action.config);
        break;
      case 'slack':
        await this.sendSlackAlert(alert, action.config);
        break;
      case 'database':
        await this.logAlertToDatabase(alert, action.config);
        break;
      default:
        throw new Error(`Unsupported action type: ${action.type}`);
    }
  }

  private async sendEmailAlert(alert: Alert, config: Record<string, any>): Promise<void> {
    // This would integrate with your email service
    const emailData = {
      to: config.recipients,
      subject: `[${alert.severity.toUpperCase()}] ${alert.ruleName}`,
      body: this.generateEmailBody(alert),
      priority: config.priority || 'normal'
    };

    loggingService.info(
      LogCategory.SYSTEM,
      'Email alert sent',
      { alertId: alert.id, recipients: config.recipients }
    );

    // Email service integration would go here
    // For now, log to monitoring service
    loggingService.debug(
      LogCategory.SYSTEM,
      'Email alert queued',
      emailData
    );
  }

  private async sendWebhookAlert(alert: Alert, config: Record<string, any>): Promise<void> {
    if (!config.url) {
      throw new Error('Webhook URL not configured');
    }

    const payload = {
      alert,
      timestamp: new Date().toISOString(),
      service: 'HeyPeter LMS'
    };

    const response = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.headers || {})
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Webhook failed with status ${response.status}`);
    }

    loggingService.info(
      LogCategory.SYSTEM,
      'Webhook alert sent',
      { alertId: alert.id, url: config.url, status: response.status }
    );
  }

  private async sendSlackAlert(alert: Alert, config: Record<string, any>): Promise<void> {
    // This would integrate with Slack API
    const slackMessage = {
      text: `🚨 ${alert.ruleName}`,
      attachments: [{
        color: this.getSeverityColor(alert.severity),
        fields: [
          { title: 'Severity', value: alert.severity, short: true },
          { title: 'Time', value: alert.triggeredAt, short: true },
          { title: 'Message', value: alert.message, short: false }
        ]
      }]
    };

    loggingService.info(
      LogCategory.SYSTEM,
      'Slack alert sent',
      { alertId: alert.id, channel: config.channel }
    );

    // Slack API integration would go here
    // For now, log to monitoring service
    loggingService.debug(
      LogCategory.SYSTEM,
      'Slack alert queued',
      slackMessage
    );
  }

  private async logAlertToDatabase(alert: Alert, config: Record<string, any>): Promise<void> {
    loggingService.error(
      LogCategory.SYSTEM,
      `Database alert: ${alert.message}`,
      {
        alertId: alert.id,
        severity: alert.severity,
        context: alert.context
      }
    );
  }

  private generateEmailBody(alert: Alert): string {
    return `
Alert: ${alert.ruleName}
Severity: ${alert.severity.toUpperCase()}
Time: ${alert.triggeredAt}

Message: ${alert.message}

Context:
${Object.entries(alert.context).map(([key, value]) => `  ${key}: ${value}`).join('\n')}

Details:
${JSON.stringify(alert.details, null, 2)}
`;
  }

  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical': return 'danger';
      case 'high': return 'warning';
      case 'medium': return '#ff9500';
      case 'low': return 'good';
      default: return '#808080';
    }
  }

  private async storeAlert(alert: Alert): Promise<void> {
    try {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();

      await supabase
        .from('error_alerts')
        .insert({
          id: alert.id,
          rule_id: alert.ruleId,
          rule_name: alert.ruleName,
          severity: alert.severity,
          status: alert.status,
          triggered_at: alert.triggeredAt,
          resolved_at: alert.resolvedAt,
          message: alert.message,
          details: alert.details,
          context: alert.context,
          actions: alert.actions
        });
    } catch (error) {
      logger.error('Failed to store alert:', error);
    }
  }

  // Public methods
  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
    loggingService.info(
      LogCategory.SYSTEM,
      `Alert rule added: ${rule.name}`,
      { ruleId: rule.id }
    );
  }

  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
    loggingService.info(
      LogCategory.SYSTEM,
      `Alert rule removed: ${ruleId}`
    );
  }

  updateRule(rule: AlertRule): void {
    rule.updatedAt = new Date().toISOString();
    this.rules.set(rule.id, rule);
    loggingService.info(
      LogCategory.SYSTEM,
      `Alert rule updated: ${rule.name}`,
      { ruleId: rule.id }
    );
  }

  enableRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = true;
      rule.updatedAt = new Date().toISOString();
    }
  }

  disableRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = false;
      rule.updatedAt = new Date().toISOString();
    }
  }

  async resolveAlert(alertId: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.status = 'resolved';
      alert.resolvedAt = new Date().toISOString();
      
      // Update in database
      try {
        const { createClient } = await import('@/lib/supabase');
        const supabase = createClient();

        await supabase
          .from('error_alerts')
          .update({
            status: 'resolved',
            resolved_at: alert.resolvedAt
          })
          .eq('id', alertId);
      } catch (error) {
        logger.error('Failed to update alert status:', error);
      }

      loggingService.info(
        LogCategory.SYSTEM,
        `Alert resolved: ${alert.ruleName}`,
        { alertId }
      );
    }
  }

  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values()).filter(alert => alert.status === 'firing');
  }

  getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  async getAlertingSummary(): Promise<AlertingSummary> {
    try {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();

      const { data: alerts } = await supabase
        .from('error_alerts')
        .select('*')
        .order('triggered_at', { ascending: false });

      if (!alerts) return this.getEmptyAlertingSummary();

      const activeAlerts = alerts.filter(a => a.status === 'firing').length;
      const totalAlerts = alerts.length;

      const alertsByRule: Record<string, number> = {};
      const alertsBySeverity: Record<string, number> = {};

      alerts.forEach(alert => {
        alertsByRule[alert.rule_name] = (alertsByRule[alert.rule_name] || 0) + 1;
        alertsBySeverity[alert.severity] = (alertsBySeverity[alert.severity] || 0) + 1;
      });

      const recentAlerts = alerts.slice(0, 10).map(this.mapDatabaseAlert);

      // Calculate MTTR
      const resolvedAlerts = alerts.filter(a => a.resolved_at);
      const mttr = resolvedAlerts.length > 0 
        ? resolvedAlerts.reduce((sum, alert) => {
            const resolution = new Date(alert.resolved_at).getTime() - new Date(alert.triggered_at).getTime();
            return sum + (resolution / 1000 / 60); // Convert to minutes
          }, 0) / resolvedAlerts.length
        : 0;

      const alertTrends = this.generateAlertTrends(alerts);

      return {
        activeAlerts,
        totalAlerts,
        alertsByRule,
        alertsBySeverity,
        recentAlerts,
        mttr: Math.round(mttr),
        alertTrends
      };
    } catch (error) {
      logger.error('Failed to get alerting summary:', error);
      return this.getEmptyAlertingSummary();
    }
  }

  private mapDatabaseAlert(dbAlert: any): Alert {
    return {
      id: dbAlert.id,
      ruleId: dbAlert.rule_id,
      ruleName: dbAlert.rule_name,
      severity: dbAlert.severity,
      status: dbAlert.status,
      triggeredAt: dbAlert.triggered_at,
      resolvedAt: dbAlert.resolved_at,
      message: dbAlert.message,
      details: dbAlert.details,
      context: dbAlert.context,
      actions: dbAlert.actions || []
    };
  }

  private generateAlertTrends(alerts: any[]): Array<{ timestamp: string; count: number; severity: string }> {
    const trends: Array<{ timestamp: string; count: number; severity: string }> = [];
    const now = new Date();

    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourStart = new Date(hour);
      hourStart.setMinutes(0, 0, 0);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);

      ['low', 'medium', 'high', 'critical'].forEach(severity => {
        const count = alerts.filter(alert => {
          const alertTime = new Date(alert.triggered_at);
          return alertTime >= hourStart && alertTime < hourEnd && alert.severity === severity;
        }).length;

        if (count > 0) {
          trends.push({
            timestamp: hourStart.toISOString(),
            count,
            severity
          });
        }
      });
    }

    return trends;
  }

  private getEmptyAlertingSummary(): AlertingSummary {
    return {
      activeAlerts: 0,
      totalAlerts: 0,
      alertsByRule: {},
      alertsBySeverity: {},
      recentAlerts: [],
      mttr: 0,
      alertTrends: []
    };
  }

  // Cleanup
  destroy(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
    }
  }
}

// Export singleton instance
export const errorAlertingService = new ErrorAlertingService();
export default errorAlertingService;