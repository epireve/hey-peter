# Performance Monitoring and Alerting Setup

## Overview
This document outlines the comprehensive monitoring and alerting strategy for HeyPeter Academy LMS, covering application performance, infrastructure health, user experience, and business metrics.

## Monitoring Stack

### 1. Application Performance Monitoring (APM)

#### Sentry Configuration
```javascript
// sentry.client.config.js
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  debug: false,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  integrations: [
    new Sentry.BrowserTracing({
      tracingOrigins: ["app.heypeteracademy.com", /^\//],
      routingInstrumentation: Sentry.nextRouterInstrumentation,
    }),
    new Sentry.Replay({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
  beforeSend(event, hint) {
    // Filter out non-critical errors
    if (event.level === "warning") {
      return null;
    }
    return event;
  },
});
```

#### Custom Performance Metrics
```typescript
// lib/performance-monitor.ts
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  
  static getInstance(): PerformanceMonitor {
    if (!this.instance) {
      this.instance = new PerformanceMonitor();
    }
    return this.instance;
  }

  // Page load performance
  trackPageLoad(pageName: string) {
    if (typeof window !== 'undefined' && window.performance) {
      const perfData = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      const metrics = {
        page: pageName,
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
        loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
        totalLoadTime: perfData.loadEventEnd - perfData.fetchStart,
        renderTime: perfData.domComplete - perfData.domLoading,
      };

      // Send to monitoring service
      this.sendMetrics('page_load', metrics);
    }
  }

  // API performance tracking
  async trackAPICall(endpoint: string, method: string, fn: () => Promise<any>) {
    const startTime = performance.now();
    let status = 'success';
    
    try {
      const result = await fn();
      return result;
    } catch (error) {
      status = 'error';
      throw error;
    } finally {
      const duration = performance.now() - startTime;
      
      this.sendMetrics('api_call', {
        endpoint,
        method,
        duration,
        status,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Database query performance
  trackDatabaseQuery(query: string, duration: number) {
    this.sendMetrics('database_query', {
      query: this.sanitizeQuery(query),
      duration,
      timestamp: new Date().toISOString(),
    });
  }

  private sanitizeQuery(query: string): string {
    // Remove sensitive data from queries
    return query.replace(/\b\d{4,}\b/g, 'XXXX');
  }

  private sendMetrics(type: string, data: any) {
    // Send to multiple monitoring services
    if (typeof window !== 'undefined') {
      // Send to Google Analytics
      if (window.gtag) {
        window.gtag('event', type, data);
      }

      // Send to custom monitoring endpoint
      fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data }),
      }).catch(console.error);
    }
  }
}
```

### 2. Infrastructure Monitoring

#### Prometheus Configuration
```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

rule_files:
  - "alerts/*.yml"

scrape_configs:
  # Node Exporter
  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']
    
  # Application metrics
  - job_name: 'heypeter-app'
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/metrics'
    
  # PostgreSQL Exporter
  - job_name: 'postgres'
    static_configs:
      - targets: ['localhost:9187']
    
  # Redis Exporter
  - job_name: 'redis'
    static_configs:
      - targets: ['localhost:9121']
      
  # Nginx Exporter
  - job_name: 'nginx'
    static_configs:
      - targets: ['localhost:9113']
```

#### Grafana Dashboards
```json
{
  "dashboard": {
    "title": "HeyPeter Academy - Production Overview",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{route}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])",
            "legendFormat": "5xx errors"
          }
        ]
      },
      {
        "title": "Database Connections",
        "targets": [
          {
            "expr": "pg_stat_activity_count",
            "legendFormat": "Active connections"
          }
        ]
      },
      {
        "title": "Memory Usage",
        "targets": [
          {
            "expr": "node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes * 100",
            "legendFormat": "Available memory %"
          }
        ]
      }
    ]
  }
}
```

### 3. Real User Monitoring (RUM)

```javascript
// lib/rum.js
export class RealUserMonitoring {
  constructor() {
    this.initializeWebVitals();
    this.trackUserInteractions();
    this.monitorErrors();
  }

  initializeWebVitals() {
    if (typeof window !== 'undefined') {
      import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
        getCLS(this.sendWebVital);
        getFID(this.sendWebVital);
        getFCP(this.sendWebVital);
        getLCP(this.sendWebVital);
        getTTFB(this.sendWebVital);
      });
    }
  }

  sendWebVital({ name, value, id }) {
    const data = {
      metric: name,
      value: Math.round(name === 'CLS' ? value * 1000 : value),
      id,
      page: window.location.pathname,
      timestamp: new Date().toISOString(),
    };

    // Send to monitoring endpoint
    navigator.sendBeacon('/api/rum/vitals', JSON.stringify(data));
  }

  trackUserInteractions() {
    // Track clicks
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'BUTTON' || target.tagName === 'A') {
        this.trackEvent('click', {
          element: target.tagName,
          text: target.textContent?.substring(0, 50),
          href: (target as HTMLAnchorElement).href,
        });
      }
    });

    // Track form submissions
    document.addEventListener('submit', (e) => {
      const form = e.target as HTMLFormElement;
      this.trackEvent('form_submit', {
        formId: form.id,
        formName: form.name,
      });
    });
  }

  trackEvent(eventType: string, data: any) {
    navigator.sendBeacon('/api/rum/events', JSON.stringify({
      type: eventType,
      data,
      timestamp: new Date().toISOString(),
      sessionId: this.getSessionId(),
    }));
  }

  monitorErrors() {
    window.addEventListener('error', (event) => {
      this.trackEvent('javascript_error', {
        message: event.message,
        source: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: event.error?.stack,
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.trackEvent('unhandled_promise_rejection', {
        reason: event.reason,
      });
    });
  }

  getSessionId() {
    let sessionId = sessionStorage.getItem('rum_session_id');
    if (!sessionId) {
      sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('rum_session_id', sessionId);
    }
    return sessionId;
  }
}
```

## Alert Configuration

### 1. Critical Alerts (P1)

```yaml
# alerts/critical.yml
groups:
  - name: critical_alerts
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 2m
        labels:
          severity: critical
          team: backend
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors per second"
          
      - alert: DatabaseDown
        expr: up{job="postgres"} == 0
        for: 1m
        labels:
          severity: critical
          team: database
        annotations:
          summary: "Database is down"
          description: "PostgreSQL database is not responding"
          
      - alert: HighMemoryUsage
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) > 0.95
        for: 5m
        labels:
          severity: critical
          team: infrastructure
        annotations:
          summary: "Critical memory usage"
          description: "Memory usage is above 95%"
          
      - alert: DiskSpaceCritical
        expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) < 0.1
        for: 5m
        labels:
          severity: critical
          team: infrastructure
        annotations:
          summary: "Disk space critical"
          description: "Less than 10% disk space remaining"
```

### 2. Warning Alerts (P2)

```yaml
# alerts/warning.yml
groups:
  - name: warning_alerts
    interval: 1m
    rules:
      - alert: SlowResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 3
        for: 10m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "Slow response times"
          description: "95th percentile response time is {{ $value }}s"
          
      - alert: HighDatabaseConnections
        expr: pg_stat_activity_count > 80
        for: 5m
        labels:
          severity: warning
          team: database
        annotations:
          summary: "High database connection count"
          description: "{{ $value }} active database connections"
          
      - alert: CacheHitRateLow
        expr: redis_hits_total / (redis_hits_total + redis_misses_total) < 0.8
        for: 15m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "Low cache hit rate"
          description: "Cache hit rate is {{ $value }}"
```

### 3. Business Metrics Alerts

```yaml
# alerts/business.yml
groups:
  - name: business_alerts
    interval: 5m
    rules:
      - alert: LowUserRegistrations
        expr: rate(user_registrations_total[1h]) < 0.5
        for: 2h
        labels:
          severity: warning
          team: product
        annotations:
          summary: "Low user registration rate"
          description: "Less than 30 registrations per hour"
          
      - alert: HighClassCancellationRate
        expr: rate(class_cancellations_total[1h]) / rate(class_bookings_total[1h]) > 0.2
        for: 1h
        labels:
          severity: warning
          team: operations
        annotations:
          summary: "High class cancellation rate"
          description: "Cancellation rate is {{ $value }}"
          
      - alert: PaymentFailureRate
        expr: rate(payment_failures_total[30m]) / rate(payment_attempts_total[30m]) > 0.1
        for: 15m
        labels:
          severity: critical
          team: payments
        annotations:
          summary: "High payment failure rate"
          description: "Payment failure rate is {{ $value }}"
```

## Alerting Channels

### 1. PagerDuty Integration
```javascript
// lib/pagerduty.js
const PagerDuty = require('node-pagerduty');

const pd = new PagerDuty({
  serviceKey: process.env.PAGERDUTY_SERVICE_KEY,
});

export async function createIncident(severity, summary, details) {
  const incident = await pd.incidents.createIncident({
    incident: {
      type: 'incident',
      title: summary,
      service: {
        id: process.env.PAGERDUTY_SERVICE_ID,
        type: 'service_reference',
      },
      urgency: severity === 'critical' ? 'high' : 'low',
      body: {
        type: 'incident_body',
        details: JSON.stringify(details),
      },
    },
  });
  
  return incident;
}
```

### 2. Slack Notifications
```javascript
// lib/slack-alerts.js
const { WebClient } = require('@slack/web-api');

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

export async function sendAlert(channel, severity, message, details) {
  const color = {
    critical: 'danger',
    warning: 'warning',
    info: 'good',
  }[severity];

  await slack.chat.postMessage({
    channel,
    attachments: [{
      color,
      title: message,
      fields: Object.entries(details).map(([key, value]) => ({
        title: key,
        value: String(value),
        short: true,
      })),
      footer: 'HeyPeter Monitoring',
      ts: Math.floor(Date.now() / 1000),
    }],
  });
}
```

### 3. Email Notifications
```javascript
// lib/email-alerts.js
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendAlertEmail(recipients, subject, htmlContent) {
  await transporter.sendMail({
    from: 'alerts@heypeteracademy.com',
    to: recipients.join(','),
    subject: `[Alert] ${subject}`,
    html: htmlContent,
  });
}
```

## Monitoring Dashboards

### 1. Executive Dashboard
- Total active users
- Revenue metrics
- Class utilization rate
- Student satisfaction score
- System health status

### 2. Operations Dashboard
- Real-time user activity
- Class schedule status
- Payment processing metrics
- Support ticket volume
- System performance metrics

### 3. Technical Dashboard
- API response times
- Error rates by endpoint
- Database performance
- Cache hit rates
- Infrastructure metrics

### 4. Security Dashboard
- Failed login attempts
- Suspicious activity patterns
- API rate limit violations
- Security scan results
- Compliance metrics

## Performance Benchmarks

### Application Performance
- Page Load Time: < 3 seconds
- API Response Time: < 500ms (p95)
- Database Query Time: < 100ms (p95)
- Time to Interactive: < 5 seconds
- First Contentful Paint: < 1.5 seconds

### Infrastructure Metrics
- CPU Usage: < 70%
- Memory Usage: < 80%
- Disk I/O: < 80% utilization
- Network Latency: < 50ms
- Uptime: > 99.9%

### Business Metrics
- User Registration Rate: > 50/day
- Class Booking Rate: > 200/day
- Payment Success Rate: > 95%
- User Retention: > 80% (monthly)
- Support Response Time: < 2 hours

## Incident Response

### Severity Levels
- **P1 (Critical)**: Complete outage or data loss
- **P2 (High)**: Major feature unavailable
- **P3 (Medium)**: Performance degradation
- **P4 (Low)**: Minor issues

### Response Times
- P1: 15 minutes
- P2: 30 minutes
- P3: 2 hours
- P4: 24 hours

### Escalation Matrix
| Time | P1 | P2 | P3 | P4 |
|------|----|----|----|----|
| 0-15m | On-call Engineer | On-call Engineer | - | - |
| 15-30m | Tech Lead | - | On-call Engineer | - |
| 30-60m | Engineering Manager | Tech Lead | - | - |
| 60m+ | CTO | Engineering Manager | Tech Lead | On-call Engineer |

## Maintenance and Updates

### Regular Maintenance
- Weekly dashboard review
- Monthly alert threshold tuning
- Quarterly performance baseline update
- Annual monitoring strategy review

### Documentation
- Keep runbooks updated
- Document all custom metrics
- Maintain alert contact lists
- Review and update thresholds