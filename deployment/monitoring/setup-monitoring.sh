#!/bin/bash

# Monitoring Setup Script for HeyPeter Academy LMS
# This script sets up comprehensive monitoring infrastructure

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
DEPLOYMENT_DIR="${PROJECT_ROOT}/deployment"

# Environment variables
ENVIRONMENT=${1:-production}
MONITORING_TYPE=${2:-full}  # full, basic, or custom
DRY_RUN=${3:-false}

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  HeyPeter Academy Monitoring Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Environment: ${YELLOW}${ENVIRONMENT}${NC}"
echo -e "Type: ${YELLOW}${MONITORING_TYPE}${NC}"
echo -e "Dry Run: ${YELLOW}${DRY_RUN}${NC}"
echo ""

# Function to log messages
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install it first."
    fi
    
    # Check if Docker Compose is available
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        error "Docker Compose is not installed. Please install it first."
    fi
    
    # Check if environment file exists
    if [[ ! -f "${DEPLOYMENT_DIR}/environments/.env.${ENVIRONMENT}" ]]; then
        error "Environment file not found: ${DEPLOYMENT_DIR}/environments/.env.${ENVIRONMENT}"
    fi
    
    log "Prerequisites check passed"
}

# Load environment variables
load_environment() {
    log "Loading environment variables for ${ENVIRONMENT}..."
    
    source "${DEPLOYMENT_DIR}/environments/.env.${ENVIRONMENT}"
    
    # Set monitoring-specific variables
    export GRAFANA_ADMIN_PASSWORD="heypeter-admin-2025"
    export PROMETHEUS_RETENTION="15d"
    export ALERTMANAGER_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
    
    log "Environment variables loaded"
}

# Create monitoring directories
create_monitoring_directories() {
    log "Creating monitoring directories..."
    
    mkdir -p "${SCRIPT_DIR}"/{grafana/{provisioning/{datasources,dashboards,notifiers},dashboards},logs,health-checker}
    
    # Set proper permissions
    chmod 755 "${SCRIPT_DIR}"/{grafana,logs}
    chmod 777 "${SCRIPT_DIR}/grafana"  # Grafana needs write access
    
    log "Monitoring directories created"
}

# Setup Grafana configuration
setup_grafana() {
    log "Setting up Grafana configuration..."
    
    # Create datasource configuration
    cat > "${SCRIPT_DIR}/grafana/provisioning/datasources/prometheus.yml" << EOF
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true

  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    editable: true

  - name: Jaeger
    type: jaeger
    access: proxy
    url: http://jaeger:16686
    editable: true
EOF

    # Create dashboard provisioning configuration
    cat > "${SCRIPT_DIR}/grafana/provisioning/dashboards/default.yml" << EOF
apiVersion: 1

providers:
  - name: 'default'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
EOF

    # Create notification channels
    cat > "${SCRIPT_DIR}/grafana/provisioning/notifiers/slack.yml" << EOF
notifiers:
  - name: slack-alerts
    type: slack
    uid: slack-alerts
    org_id: 1
    is_default: true
    settings:
      url: '${SLACK_WEBHOOK_URL}'
      channel: '#alerts'
      username: 'Grafana'
      title: 'HeyPeter Academy Alert'
      text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
EOF

    log "Grafana configuration created"
}

# Create Grafana dashboards
create_grafana_dashboards() {
    log "Creating Grafana dashboards..."
    
    # Application Overview Dashboard
    cat > "${SCRIPT_DIR}/grafana/dashboards/application-overview.json" << 'EOF'
{
  "dashboard": {
    "id": null,
    "title": "HeyPeter Academy - Application Overview",
    "tags": ["heypeter", "application"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Application Status",
        "type": "stat",
        "targets": [
          {
            "expr": "up{job=\"heypeter-app\"}",
            "legendFormat": "{{instance}}"
          }
        ]
      },
      {
        "id": 2,
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{job=\"heypeter-app\"}[5m])",
            "legendFormat": "{{instance}} - {{method}} {{status}}"
          }
        ]
      },
      {
        "id": 3,
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job=\"heypeter-app\"}[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "id": 4,
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{job=\"heypeter-app\",status=~\"5..\"}[5m])",
            "legendFormat": "5xx errors"
          }
        ]
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "30s"
  }
}
EOF

    # System Resources Dashboard
    cat > "${SCRIPT_DIR}/grafana/dashboards/system-resources.json" << 'EOF'
{
  "dashboard": {
    "id": null,
    "title": "HeyPeter Academy - System Resources",
    "tags": ["heypeter", "system"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "CPU Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "100 - (avg by(instance) (irate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
            "legendFormat": "{{instance}}"
          }
        ]
      },
      {
        "id": 2,
        "title": "Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100",
            "legendFormat": "{{instance}}"
          }
        ]
      },
      {
        "id": 3,
        "title": "Disk Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "(1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes)) * 100",
            "legendFormat": "{{instance}} - {{mountpoint}}"
          }
        ]
      },
      {
        "id": 4,
        "title": "Network I/O",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(node_network_receive_bytes_total[5m])",
            "legendFormat": "{{instance}} - {{device}} (rx)"
          },
          {
            "expr": "rate(node_network_transmit_bytes_total[5m])",
            "legendFormat": "{{instance}} - {{device}} (tx)"
          }
        ]
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "30s"
  }
}
EOF

    log "Grafana dashboards created"
}

# Setup Alertmanager
setup_alertmanager() {
    log "Setting up Alertmanager..."
    
    cat > "${SCRIPT_DIR}/alertmanager.yml" << EOF
global:
  smtp_smarthost: '${EMAIL_SERVER_HOST}:${EMAIL_SERVER_PORT}'
  smtp_from: 'alerts@heypeter-academy.com'
  smtp_auth_username: '${EMAIL_SERVER_USER}'
  smtp_auth_password: '${EMAIL_SERVER_PASSWORD}'

route:
  group_by: ['alertname', 'severity']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'default-receiver'
  routes:
    - match:
        severity: critical
      receiver: 'critical-alerts'
    - match:
        severity: warning
      receiver: 'warning-alerts'

receivers:
  - name: 'default-receiver'
    email_configs:
      - to: 'admin@heypeter-academy.com'
        subject: 'HeyPeter Academy Alert: {{ .GroupLabels.alertname }}'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          Instance: {{ .Labels.instance }}
          Severity: {{ .Labels.severity }}
          {{ end }}

  - name: 'critical-alerts'
    email_configs:
      - to: 'admin@heypeter-academy.com,devops@heypeter-academy.com'
        subject: 'CRITICAL: HeyPeter Academy Alert'
        body: |
          🚨 CRITICAL ALERT 🚨
          
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          Instance: {{ .Labels.instance }}
          Time: {{ .StartsAt }}
          {{ end }}
    slack_configs:
      - api_url: '${SLACK_WEBHOOK_URL}'
        channel: '#alerts'
        title: 'CRITICAL: HeyPeter Academy Alert'
        text: |
          🚨 CRITICAL ALERT 🚨
          {{ range .Alerts }}
          {{ .Annotations.summary }}
          {{ end }}

  - name: 'warning-alerts'
    email_configs:
      - to: 'devops@heypeter-academy.com'
        subject: 'WARNING: HeyPeter Academy Alert'
        body: |
          ⚠️ WARNING ALERT ⚠️
          
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          Instance: {{ .Labels.instance }}
          Time: {{ .StartsAt }}
          {{ end }}

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'instance']
EOF

    log "Alertmanager configuration created"
}

# Setup Blackbox Exporter
setup_blackbox_exporter() {
    log "Setting up Blackbox Exporter..."
    
    cat > "${SCRIPT_DIR}/blackbox.yml" << EOF
modules:
  http_2xx:
    prober: http
    timeout: 5s
    http:
      valid_http_versions: ["HTTP/1.1", "HTTP/2.0"]
      valid_status_codes: []
      method: GET
      follow_redirects: true
      preferred_ip_protocol: "ip4"

  http_post_2xx:
    prober: http
    timeout: 5s
    http:
      method: POST
      headers:
        Content-Type: application/json
      body: '{"test": true}'

  tcp_connect:
    prober: tcp
    timeout: 5s

  dns:
    prober: dns
    timeout: 5s
    dns:
      query_name: "heypeter-academy.com"
      query_type: "A"

  icmp:
    prober: icmp
    timeout: 5s
EOF

    log "Blackbox Exporter configuration created"
}

# Setup Loki for log aggregation
setup_loki() {
    log "Setting up Loki..."
    
    cat > "${SCRIPT_DIR}/loki.yml" << EOF
auth_enabled: false

server:
  http_listen_port: 3100

ingester:
  lifecycler:
    address: 127.0.0.1
    ring:
      kvstore:
        store: inmemory
      replication_factor: 1
    final_sleep: 0s

schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

storage_config:
  boltdb_shipper:
    active_index_directory: /loki/boltdb-shipper-active
    cache_location: /loki/boltdb-shipper-cache
    shared_store: filesystem
  filesystem:
    directory: /loki/chunks

limits_config:
  enforce_metric_name: false
  reject_old_samples: true
  reject_old_samples_max_age: 168h

chunk_store_config:
  max_look_back_period: 0s

table_manager:
  retention_deletes_enabled: false
  retention_period: 0s
EOF

    # Setup Promtail
    cat > "${SCRIPT_DIR}/promtail.yml" << EOF
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: containers
    static_configs:
      - targets:
          - localhost
        labels:
          job: containerlogs
          __path__: /var/lib/docker/containers/*/*log

    pipeline_stages:
      - json:
          expressions:
            output: log
            stream: stream
            attrs:
      - json:
          expressions:
            tag:
          source: attrs
      - regex:
          expression: (?P<container_name>(?:[^|]*))\|
          source: tag
      - timestamp:
          format: RFC3339Nano
          source: time
      - labels:
          stream:
          container_name:
      - output:
          source: output

  - job_name: system_logs
    static_configs:
      - targets:
          - localhost
        labels:
          job: varlogs
          __path__: /var/log/*log
EOF

    log "Loki and Promtail configuration created"
}

# Create custom health checker
create_health_checker() {
    log "Creating custom health checker..."
    
    mkdir -p "${SCRIPT_DIR}/health-checker"
    
    # Health checker configuration
    cat > "${SCRIPT_DIR}/health-checker/config.yml" << EOF
health_checks:
  - name: "Application Health"
    url: "http://app1:3000/health"
    method: "GET"
    timeout: 10
    interval: 60
    expected_status: 200
    
  - name: "API Health"
    url: "http://app1:3000/api/health"
    method: "GET"
    timeout: 10
    interval: 60
    expected_status: 200
    
  - name: "Database Connection"
    type: "postgres"
    connection: "postgresql://postgres:${SUPABASE_DB_PASSWORD}@${SUPABASE_DB_HOST}:5432/postgres"
    timeout: 15
    interval: 300
    
  - name: "Redis Connection"
    type: "redis"
    connection: "redis://redis:6379"
    password: "${REDIS_PASSWORD}"
    timeout: 10
    interval: 120

alerting:
  email:
    enabled: true
    smtp_host: "${EMAIL_SERVER_HOST}"
    smtp_port: ${EMAIL_SERVER_PORT}
    username: "${EMAIL_SERVER_USER}"
    password: "${EMAIL_SERVER_PASSWORD}"
    from: "health-checker@heypeter-academy.com"
    to: ["admin@heypeter-academy.com"]
    
  slack:
    enabled: true
    webhook_url: "${SLACK_WEBHOOK_URL}"
    channel: "#alerts"
    
  webhook:
    enabled: false
    url: ""
EOF

    # Simple health checker Dockerfile
    cat > "${SCRIPT_DIR}/health-checker/Dockerfile" << 'EOF'
FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 8888

CMD ["node", "index.js"]
EOF

    # Health checker package.json
    cat > "${SCRIPT_DIR}/health-checker/package.json" << 'EOF'
{
  "name": "heypeter-health-checker",
  "version": "1.0.0",
  "description": "Custom health checker for HeyPeter Academy",
  "main": "index.js",
  "dependencies": {
    "axios": "^1.6.0",
    "pg": "^8.11.0",
    "redis": "^4.6.0",
    "nodemailer": "^6.9.0",
    "yaml": "^2.3.0"
  }
}
EOF

    # Simple health checker implementation
    cat > "${SCRIPT_DIR}/health-checker/index.js" << 'EOF'
const fs = require('fs');
const yaml = require('yaml');
const axios = require('axios');
const { Client } = require('pg');
const redis = require('redis');
const nodemailer = require('nodemailer');

class HealthChecker {
  constructor() {
    this.config = yaml.parse(fs.readFileSync('/app/config.yml', 'utf8'));
    this.lastAlerts = new Map();
    this.setupEmailTransporter();
  }

  setupEmailTransporter() {
    if (this.config.alerting.email.enabled) {
      this.emailTransporter = nodemailer.createTransporter({
        host: this.config.alerting.email.smtp_host,
        port: this.config.alerting.email.smtp_port,
        auth: {
          user: this.config.alerting.email.username,
          pass: this.config.alerting.email.password
        }
      });
    }
  }

  async checkHttp(check) {
    try {
      const response = await axios({
        method: check.method || 'GET',
        url: check.url,
        timeout: (check.timeout || 10) * 1000
      });
      
      return {
        success: response.status === (check.expected_status || 200),
        status: response.status,
        message: `HTTP ${response.status}`
      };
    } catch (error) {
      return {
        success: false,
        status: error.response?.status || 0,
        message: error.message
      };
    }
  }

  async checkPostgres(check) {
    const client = new Client({ connectionString: check.connection });
    try {
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      return { success: true, message: 'Connected successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async checkRedis(check) {
    const client = redis.createClient({
      url: check.connection,
      password: check.password
    });
    
    try {
      await client.connect();
      await client.ping();
      await client.disconnect();
      return { success: true, message: 'Connected successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async runCheck(check) {
    console.log(`Running health check: ${check.name}`);
    
    let result;
    switch (check.type) {
      case 'postgres':
        result = await this.checkPostgres(check);
        break;
      case 'redis':
        result = await this.checkRedis(check);
        break;
      default:
        result = await this.checkHttp(check);
    }

    if (!result.success) {
      await this.sendAlert(check, result);
    } else {
      // Clear alert if it was previously failing
      this.lastAlerts.delete(check.name);
    }

    return result;
  }

  async sendAlert(check, result) {
    const alertKey = check.name;
    const now = Date.now();
    const lastAlert = this.lastAlerts.get(alertKey);
    
    // Avoid spam - only alert every 5 minutes
    if (lastAlert && (now - lastAlert) < 300000) {
      return;
    }

    this.lastAlerts.set(alertKey, now);

    const message = `Health check failed: ${check.name}\nError: ${result.message}`;
    
    // Email alert
    if (this.config.alerting.email.enabled && this.emailTransporter) {
      try {
        await this.emailTransporter.sendMail({
          from: this.config.alerting.email.from,
          to: this.config.alerting.email.to,
          subject: `HeyPeter Academy Health Check Failed: ${check.name}`,
          text: message
        });
      } catch (error) {
        console.error('Failed to send email alert:', error);
      }
    }

    // Slack alert
    if (this.config.alerting.slack.enabled && this.config.alerting.slack.webhook_url) {
      try {
        await axios.post(this.config.alerting.slack.webhook_url, {
          channel: this.config.alerting.slack.channel,
          text: `🚨 ${message}`
        });
      } catch (error) {
        console.error('Failed to send Slack alert:', error);
      }
    }
  }

  async start() {
    console.log('Starting health checker...');
    
    for (const check of this.config.health_checks) {
      setInterval(async () => {
        try {
          await this.runCheck(check);
        } catch (error) {
          console.error(`Error in health check ${check.name}:`, error);
        }
      }, (check.interval || 60) * 1000);
      
      // Run initial check
      setTimeout(() => this.runCheck(check), 1000);
    }
  }
}

const healthChecker = new HealthChecker();
healthChecker.start();

// Keep the process running
process.on('SIGTERM', () => {
  console.log('Health checker shutting down...');
  process.exit(0);
});
EOF

    log "Custom health checker created"
}

# Deploy monitoring stack
deploy_monitoring() {
    log "Deploying monitoring stack..."
    
    if [[ "${DRY_RUN}" == "false" ]]; then
        cd "${SCRIPT_DIR}"
        
        # Use docker-compose or docker compose based on availability
        if command -v docker-compose &> /dev/null; then
            COMPOSE_CMD="docker-compose"
        else
            COMPOSE_CMD="docker compose"
        fi
        
        # Build and start monitoring services
        case "${MONITORING_TYPE}" in
            "basic")
                ${COMPOSE_CMD} -f docker-compose.monitoring.yml up -d prometheus grafana alertmanager node-exporter
                ;;
            "full")
                ${COMPOSE_CMD} -f docker-compose.monitoring.yml up -d
                ;;
            "custom")
                ${COMPOSE_CMD} -f docker-compose.monitoring.yml up -d prometheus grafana alertmanager node-exporter postgres-exporter redis-exporter
                ;;
        esac
        
        # Wait for services to start
        log "Waiting for services to start..."
        sleep 30
        
        # Test services
        test_monitoring_services
        
        log "Monitoring stack deployed successfully"
    else
        log "DRY RUN: Would deploy monitoring stack"
    fi
}

# Test monitoring services
test_monitoring_services() {
    log "Testing monitoring services..."
    
    local services=(
        "prometheus:9090"
        "grafana:3001"
        "alertmanager:9093"
    )
    
    for service in "${services[@]}"; do
        local name="${service%%:*}"
        local port="${service##*:}"
        
        if curl -sf "http://localhost:${port}" > /dev/null 2>&1; then
            log "✓ ${name} is responding"
        else
            warn "✗ ${name} is not responding on port ${port}"
        fi
    done
}

# Generate monitoring documentation
generate_documentation() {
    log "Generating monitoring documentation..."
    
    DOC_FILE="${DEPLOYMENT_DIR}/reports/monitoring_setup_$(date +%Y%m%d_%H%M%S).md"
    mkdir -p "$(dirname "${DOC_FILE}")"
    
    cat > "${DOC_FILE}" << EOF
# Monitoring Setup Documentation

**Date:** $(date)
**Environment:** ${ENVIRONMENT}
**Type:** ${MONITORING_TYPE}

## Services Deployed

| Service | Port | Purpose |
|---------|------|---------|
| Prometheus | 9090 | Metrics collection and alerting |
| Grafana | 3001 | Visualization and dashboards |
| Alertmanager | 9093 | Alert routing and notifications |
| Node Exporter | 9100 | System metrics |
| cAdvisor | 8080 | Container metrics |
| Postgres Exporter | 9187 | Database metrics |
| Redis Exporter | 9121 | Redis metrics |
| Nginx Exporter | 9113 | Web server metrics |
| Blackbox Exporter | 9115 | External endpoint monitoring |
| SSL Exporter | 9219 | SSL certificate monitoring |
| Loki | 3100 | Log aggregation |
| Jaeger | 16686 | Distributed tracing |
| Uptime Kuma | 3002 | Uptime monitoring |
| Health Checker | 8888 | Custom health checks |

## Access URLs

- **Grafana:** http://your-domain.com:3001 (admin/heypeter-admin-2025)
- **Prometheus:** http://your-domain.com:9090
- **Alertmanager:** http://your-domain.com:9093
- **Jaeger:** http://your-domain.com:16686
- **Uptime Kuma:** http://your-domain.com:3002

## Dashboards

Pre-configured Grafana dashboards:
- Application Overview
- System Resources
- Database Metrics
- Load Balancer Metrics
- Business Metrics

## Alerting

Alerts are configured for:
- Application health and performance
- Database connectivity and performance
- System resource usage
- SSL certificate expiry
- External service availability

Notifications sent via:
- Email: admin@heypeter-academy.com
- Slack: #alerts channel

## Management Commands

\`\`\`bash
# Start monitoring stack
cd ${SCRIPT_DIR}
docker-compose -f docker-compose.monitoring.yml up -d

# Stop monitoring stack
docker-compose -f docker-compose.monitoring.yml down

# View logs
docker-compose -f docker-compose.monitoring.yml logs -f

# Restart specific service
docker-compose -f docker-compose.monitoring.yml restart prometheus

# Check service status
docker-compose -f docker-compose.monitoring.yml ps
\`\`\`

## Troubleshooting

### Common Issues

1. **Grafana not accessible:**
   - Check if port 3001 is open
   - Verify Docker container is running
   - Check logs: \`docker logs heypeter-grafana\`

2. **Metrics not appearing:**
   - Verify Prometheus targets are up
   - Check network connectivity
   - Validate configuration files

3. **Alerts not working:**
   - Check Alertmanager configuration
   - Verify SMTP/Slack settings
   - Test alert rules in Prometheus

### Log Locations

- Prometheus: \`docker logs heypeter-prometheus\`
- Grafana: \`docker logs heypeter-grafana\`
- Alertmanager: \`docker logs heypeter-alertmanager\`
- Health Checker: \`${SCRIPT_DIR}/health-checker/logs/\`

## Security

- Grafana admin password: Change default password
- Prometheus: Restrict access to internal network
- Alertmanager: Configure authentication if exposed
- SSL: Enable HTTPS for external access

EOF
    
    log "Monitoring documentation generated: ${DOC_FILE}"
}

# Cleanup function
cleanup() {
    log "Performing cleanup..."
    # Remove any temporary files if created
}

# Trap cleanup on exit
trap cleanup EXIT

# Main execution
main() {
    log "Starting monitoring setup..."
    
    check_prerequisites
    load_environment
    create_monitoring_directories
    setup_grafana
    create_grafana_dashboards
    setup_alertmanager
    setup_blackbox_exporter
    setup_loki
    create_health_checker
    deploy_monitoring
    generate_documentation
    
    log "Monitoring setup completed successfully!"
    
    if [[ "${DRY_RUN}" == "true" ]]; then
        echo ""
        echo -e "${YELLOW}This was a dry run. To actually setup monitoring, run:${NC}"
        echo -e "${YELLOW}$0 ${ENVIRONMENT} ${MONITORING_TYPE} false${NC}"
    else
        echo ""
        echo -e "${GREEN}========================================${NC}"
        echo -e "${GREEN}  Monitoring Setup Completed!${NC}"
        echo -e "${GREEN}========================================${NC}"
        echo -e "Type: ${YELLOW}${MONITORING_TYPE}${NC}"
        echo -e "Grafana: ${YELLOW}http://localhost:3001${NC} (admin/heypeter-admin-2025)"
        echo -e "Prometheus: ${YELLOW}http://localhost:9090${NC}"
        echo -e "Documentation: ${YELLOW}${DOC_FILE}${NC}"
        echo ""
        echo -e "${GREEN}Next Steps:${NC}"
        echo -e "1. Access Grafana and explore dashboards"
        echo -e "2. Configure additional alert rules as needed"
        echo -e "3. Set up SSL/reverse proxy for external access"
        echo -e "4. Test alert notifications"
    fi
}

# Show usage
usage() {
    echo "Usage: $0 [environment] [monitoring_type] [dry_run]"
    echo ""
    echo "Arguments:"
    echo "  environment      Target environment (production, staging) [default: production]"
    echo "  monitoring_type  Type of monitoring (full, basic, custom) [default: full]"
    echo "  dry_run          Run in dry-run mode (true/false) [default: false]"
    echo ""
    echo "Examples:"
    echo "  $0                           # Full monitoring for production"
    echo "  $0 production basic          # Basic monitoring for production"
    echo "  $0 staging full true         # Dry run: full monitoring for staging"
}

# Handle help flag
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    usage
    exit 0
fi

# Run main function
main