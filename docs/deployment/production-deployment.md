# Production Deployment Guide - HeyPeter Academy LMS

This comprehensive guide covers deploying HeyPeter Academy LMS to production environments with best practices for security, performance, and reliability.

## 📋 Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Infrastructure Setup](#infrastructure-setup)
3. [Security Configuration](#security-configuration)
4. [Database Deployment](#database-deployment)
5. [Application Deployment](#application-deployment)
6. [Load Balancing & Scaling](#load-balancing--scaling)
7. [Monitoring & Alerting](#monitoring--alerting)
8. [Backup & Disaster Recovery](#backup--disaster-recovery)
9. [Performance Optimization](#performance-optimization)
10. [Deployment Verification](#deployment-verification)

## ✅ Pre-Deployment Checklist

### Infrastructure Requirements

- [ ] Domain name registered and DNS configured
- [ ] SSL certificates obtained (Let's Encrypt or commercial)
- [ ] Server infrastructure provisioned (minimum 3 servers)
- [ ] Load balancer configured
- [ ] CDN service setup (Cloudflare/AWS CloudFront)
- [ ] Backup storage configured (S3/equivalent)
- [ ] Monitoring infrastructure ready

### Security Checklist

- [ ] All secrets stored in secure vault
- [ ] SSL/TLS certificates valid and installed
- [ ] Firewall rules configured
- [ ] DDoS protection enabled
- [ ] Security headers configured
- [ ] Rate limiting implemented
- [ ] CORS policies defined
- [ ] Database access restricted

### Application Checklist

- [ ] Production build tested locally
- [ ] All environment variables documented
- [ ] Database migrations tested
- [ ] Performance benchmarks completed
- [ ] Load testing performed
- [ ] Error tracking configured
- [ ] Logging strategy implemented
- [ ] Rollback plan prepared

## 🏗️ Infrastructure Setup

### Recommended Architecture

```
┌─────────────────┐
│   CloudFlare    │
│      (CDN)      │
└────────┬────────┘
         │
┌────────▼────────┐
│  Load Balancer  │
│   (Nginx/ALB)   │
└────────┬────────┘
         │
    ┌────┴────┬────────┬────────┐
    │         │        │        │
┌───▼──┐ ┌───▼──┐ ┌───▼──┐ ┌───▼──┐
│ App1 │ │ App2 │ │ App3 │ │ AppN │
└───┬──┘ └───┬──┘ └───┬──┘ └───┬──┘
    │         │        │        │
    └────┬────┴────────┴────────┘
         │
    ┌────▼────┐     ┌──────────┐
    │  Redis  │     │ Supabase │
    │ Cluster │     │    DB    │
    └─────────┘     └──────────┘
```

### Server Specifications

#### Application Servers (minimum 3)
- **CPU**: 4 vCPUs
- **RAM**: 16 GB
- **Storage**: 100 GB SSD
- **Network**: 1 Gbps
- **OS**: Ubuntu 22.04 LTS

#### Load Balancer
- **CPU**: 2 vCPUs
- **RAM**: 8 GB
- **Storage**: 50 GB SSD
- **Network**: 10 Gbps

#### Redis Cluster
- **Nodes**: 3 (1 master, 2 replicas)
- **RAM**: 8 GB per node
- **Storage**: 50 GB SSD per node

### Infrastructure as Code

```bash
# Using Terraform (example)
terraform init
terraform plan -var-file=production.tfvars
terraform apply -var-file=production.tfvars
```

## 🔐 Security Configuration

### SSL/TLS Setup

```bash
# Generate Let's Encrypt certificates
certbot certonly --nginx -d heypeter-academy.com -d www.heypeter-academy.com

# Auto-renewal
echo "0 0 * * * /usr/bin/certbot renew --quiet" | crontab -
```

### Nginx Security Configuration

```nginx
# /etc/nginx/sites-available/heypeter-academy
server {
    listen 443 ssl http2;
    server_name heypeter-academy.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/heypeter-academy.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/heypeter-academy.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.vercel-insights.com; style-src 'self' 'unsafe-inline';" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    # Proxy Configuration
    location / {
        proxy_pass http://app_cluster;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

# Upstream configuration
upstream app_cluster {
    least_conn;
    server app1:3000 max_fails=3 fail_timeout=30s;
    server app2:3000 max_fails=3 fail_timeout=30s;
    server app3:3000 max_fails=3 fail_timeout=30s;
}
```

### Environment Variables Security

```bash
# Use a secrets manager
# Example with HashiCorp Vault
vault kv put secret/heypeter/production \
    NEXT_PUBLIC_SUPABASE_URL=https://production.supabase.co \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key \
    SUPABASE_SERVICE_ROLE_KEY=your-service-key \
    NEXTAUTH_SECRET=your-secret \
    DATABASE_URL=your-database-url
```

## 🗄️ Database Deployment

### Supabase Production Setup

1. **Create Production Project**
   ```bash
   # Via Supabase CLI
   supabase projects create heypeter-production --org-id your-org-id --plan pro
   ```

2. **Configure Database**
   ```sql
   -- Enable required extensions
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   CREATE EXTENSION IF NOT EXISTS "pgcrypto";
   CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
   
   -- Configure connection pooling
   ALTER SYSTEM SET max_connections = 200;
   ALTER SYSTEM SET shared_buffers = '4GB';
   ALTER SYSTEM SET effective_cache_size = '12GB';
   ALTER SYSTEM SET work_mem = '16MB';
   ```

3. **Deploy Migrations**
   ```bash
   # Set production environment
   export SUPABASE_PROJECT_ID=your-production-project-id
   export SUPABASE_DB_PASSWORD=your-production-password
   
   # Push migrations
   supabase db push --linked
   ```

4. **Setup Read Replicas**
   ```bash
   # Configure streaming replication
   supabase db replica create --region us-west-2
   ```

### Database Security

```sql
-- Revoke unnecessary permissions
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Enable Row Level Security on all tables
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

-- Create backup user
CREATE ROLE backup_user WITH LOGIN PASSWORD 'secure-password';
GRANT CONNECT ON DATABASE postgres TO backup_user;
GRANT USAGE ON SCHEMA public TO backup_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup_user;
```

## 🚀 Application Deployment

### Build Process

```bash
# Production build script
#!/bin/bash
set -euo pipefail

# Load environment variables
source /etc/heypeter/production.env

# Install dependencies
npm ci --production=false

# Run tests
npm test

# Build application
NODE_ENV=production npm run build

# Optimize build
npm run build:analyze

# Create deployment artifact
tar -czf heypeter-build-$(date +%Y%m%d-%H%M%S).tar.gz \
    .next \
    public \
    package.json \
    package-lock.json \
    next.config.mjs
```

### Docker Production Build

```dockerfile
# Multi-stage production Dockerfile
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### Deployment Script

```bash
#!/bin/bash
# deploy-production.sh

set -euo pipefail

# Configuration
DEPLOYMENT_ID=$(date +%Y%m%d-%H%M%S)
DEPLOYMENT_DIR="/opt/heypeter/deployments/${DEPLOYMENT_ID}"
CURRENT_LINK="/opt/heypeter/current"
HEALTH_CHECK_URL="http://localhost:3000/api/health"
ROLLBACK_ON_FAILURE=true

echo "Starting deployment ${DEPLOYMENT_ID}..."

# Create deployment directory
mkdir -p "${DEPLOYMENT_DIR}"

# Extract build artifact
tar -xzf heypeter-build-*.tar.gz -C "${DEPLOYMENT_DIR}"

# Install production dependencies
cd "${DEPLOYMENT_DIR}"
npm ci --production

# Run database migrations
npm run db:migrate:prod

# Start new instance
PORT=3001 npm start &
NEW_PID=$!

# Wait for health check
echo "Waiting for health check..."
for i in {1..30}; do
    if curl -f "${HEALTH_CHECK_URL/:3000/:3001}" &> /dev/null; then
        echo "Health check passed!"
        break
    fi
    sleep 2
done

# Verify deployment
if ! curl -f "${HEALTH_CHECK_URL/:3000/:3001}" &> /dev/null; then
    echo "Health check failed! Rolling back..."
    kill $NEW_PID
    exit 1
fi

# Update symlink
ln -sfn "${DEPLOYMENT_DIR}" "${CURRENT_LINK}"

# Reload nginx
nginx -s reload

# Stop old instance
OLD_PID=$(cat /var/run/heypeter.pid 2>/dev/null || echo "")
if [ -n "$OLD_PID" ]; then
    kill -TERM $OLD_PID || true
fi

# Save new PID
echo $NEW_PID > /var/run/heypeter.pid

echo "Deployment ${DEPLOYMENT_ID} completed successfully!"
```

## ⚖️ Load Balancing & Scaling

### Auto-Scaling Configuration

```yaml
# kubernetes/heypeter-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: heypeter-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: heypeter-app
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Redis Session Management

```javascript
// lib/redis-client.ts
import Redis from 'ioredis';

const redisClient = new Redis({
  sentinels: [
    { host: 'redis-sentinel-1', port: 26379 },
    { host: 'redis-sentinel-2', port: 26379 },
    { host: 'redis-sentinel-3', port: 26379 }
  ],
  name: 'heypeter-master',
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: true
});

export default redisClient;
```

## 📊 Monitoring & Alerting

### Prometheus Configuration

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

rule_files:
  - 'alerts/*.yml'

scrape_configs:
  - job_name: 'heypeter-app'
    static_configs:
      - targets: ['app1:3000', 'app2:3000', 'app3:3000']
    metrics_path: '/api/metrics'
  
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
  
  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx-exporter:9113']
```

### Alert Rules

```yaml
# monitoring/alerts/app-alerts.yml
groups:
  - name: heypeter_alerts
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
          team: backend
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors per second"
      
      - alert: HighMemoryUsage
        expr: process_resident_memory_bytes / 1024 / 1024 > 1500
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value }}MB"
      
      - alert: DatabaseConnectionFailure
        expr: up{job="postgres"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Database connection failed"
          description: "Cannot connect to PostgreSQL database"
```

### Application Metrics

```typescript
// lib/metrics.ts
import { Registry, Counter, Histogram, Gauge } from 'prom-client';

export const register = new Registry();

// Request metrics
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register]
});

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register]
});

// Business metrics
export const activeUsers = new Gauge({
  name: 'active_users_total',
  help: 'Number of active users',
  registers: [register]
});

export const enrollmentsTotal = new Counter({
  name: 'enrollments_total',
  help: 'Total number of course enrollments',
  labelNames: ['course_type'],
  registers: [register]
});
```

## 💾 Backup & Disaster Recovery

### Automated Backup Strategy

```bash
#!/bin/bash
# scripts/backup-production.sh

set -euo pipefail

# Configuration
BACKUP_DIR="/mnt/backups/heypeter"
S3_BUCKET="heypeter-backups"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Database backup
echo "Starting database backup..."
pg_dump $DATABASE_URL | gzip > "${BACKUP_DIR}/db-backup-${TIMESTAMP}.sql.gz"

# Application files backup
echo "Backing up application files..."
tar -czf "${BACKUP_DIR}/app-backup-${TIMESTAMP}.tar.gz" \
    /opt/heypeter/current \
    /etc/heypeter \
    /etc/nginx/sites-available/heypeter-academy

# Upload to S3
echo "Uploading to S3..."
aws s3 cp "${BACKUP_DIR}/db-backup-${TIMESTAMP}.sql.gz" \
    "s3://${S3_BUCKET}/database/" \
    --storage-class GLACIER

aws s3 cp "${BACKUP_DIR}/app-backup-${TIMESTAMP}.tar.gz" \
    "s3://${S3_BUCKET}/application/" \
    --storage-class STANDARD_IA

# Clean old backups
echo "Cleaning old backups..."
find "${BACKUP_DIR}" -name "*.gz" -mtime +${RETENTION_DAYS} -delete
aws s3 ls "s3://${S3_BUCKET}/" --recursive | \
    awk '{print $4}' | \
    while read file; do
        if [[ $(aws s3api head-object --bucket "${S3_BUCKET}" --key "$file" --query "LastModified" --output text | xargs -I {} date -d {} +%s) -lt $(date -d "${RETENTION_DAYS} days ago" +%s) ]]; then
            aws s3 rm "s3://${S3_BUCKET}/${file}"
        fi
    done

echo "Backup completed successfully!"
```

### Disaster Recovery Plan

1. **RTO (Recovery Time Objective)**: 1 hour
2. **RPO (Recovery Point Objective)**: 1 hour

```bash
#!/bin/bash
# scripts/disaster-recovery.sh

# 1. Provision new infrastructure
terraform apply -var-file=disaster-recovery.tfvars

# 2. Restore database
aws s3 cp s3://heypeter-backups/database/latest.sql.gz .
gunzip -c latest.sql.gz | psql $NEW_DATABASE_URL

# 3. Deploy application
./deploy-production.sh --target=disaster-recovery

# 4. Update DNS
./update-dns.sh --target=disaster-recovery

# 5. Verify services
./health-check-all.sh
```

## 🚄 Performance Optimization

### CDN Configuration

```javascript
// next.config.mjs
module.exports = {
  images: {
    domains: ['cdn.heypeter-academy.com'],
    loader: 'cloudinary',
    path: 'https://res.cloudinary.com/heypeter/'
  },
  
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|png|woff|woff2|ttf|ico)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      }
    ];
  }
};
```

### Database Optimization

```sql
-- Create indexes for common queries
CREATE INDEX idx_students_email ON students(email);
CREATE INDEX idx_enrollments_student_course ON enrollments(student_id, course_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_classes_scheduled_at ON classes(scheduled_at);

-- Analyze tables for query optimization
ANALYZE students;
ANALYZE teachers;
ANALYZE courses;
ANALYZE enrollments;
ANALYZE attendance;
ANALYZE classes;

-- Configure autovacuum
ALTER TABLE students SET (autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE attendance SET (autovacuum_vacuum_scale_factor = 0.05);
```

## ✅ Deployment Verification

### Automated Verification Script

```bash
#!/bin/bash
# scripts/verify-production.sh

set -euo pipefail

DOMAIN="https://heypeter-academy.com"
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run test
run_test() {
    local test_name=$1
    local test_command=$2
    
    echo -n "Testing ${test_name}... "
    if eval "${test_command}"; then
        echo "✓ PASSED"
        ((TESTS_PASSED++))
    else
        echo "✗ FAILED"
        ((TESTS_FAILED++))
    fi
}

# Health checks
run_test "API Health" "curl -f ${DOMAIN}/api/health"
run_test "Database Connection" "curl -f ${DOMAIN}/api/health/db"
run_test "Redis Connection" "curl -f ${DOMAIN}/api/health/redis"

# SSL/Security
run_test "SSL Certificate" "echo | openssl s_client -connect heypeter-academy.com:443 2>/dev/null | openssl x509 -noout -dates"
run_test "Security Headers" "curl -s -I ${DOMAIN} | grep -q 'Strict-Transport-Security'"

# Performance
run_test "Page Load Time" "[[ $(curl -o /dev/null -s -w '%{time_total}' ${DOMAIN}) < 2.0 ]]"
run_test "API Response Time" "[[ $(curl -o /dev/null -s -w '%{time_total}' ${DOMAIN}/api/courses) < 0.5 ]]"

# Functionality
run_test "Login Page" "curl -f ${DOMAIN}/login"
run_test "Course Listing" "curl -f ${DOMAIN}/api/courses"
run_test "Static Assets" "curl -f ${DOMAIN}/_next/static/css/*.css"

# Report
echo "========================="
echo "DEPLOYMENT VERIFICATION"
echo "========================="
echo "Tests Passed: ${TESTS_PASSED}"
echo "Tests Failed: ${TESTS_FAILED}"
echo "========================="

if [ ${TESTS_FAILED} -gt 0 ]; then
    echo "DEPLOYMENT VERIFICATION FAILED!"
    exit 1
else
    echo "DEPLOYMENT VERIFICATION PASSED!"
fi
```

### Manual Verification Checklist

- [ ] Access application at https://heypeter-academy.com
- [ ] Login with test account
- [ ] Create a new student
- [ ] Enroll in a course
- [ ] Schedule a class
- [ ] Upload a file
- [ ] Check email notifications
- [ ] Verify payment processing
- [ ] Test video conferencing
- [ ] Check mobile responsiveness
- [ ] Verify all API endpoints
- [ ] Test error pages (404, 500)
- [ ] Check monitoring dashboards
- [ ] Verify backup completion
- [ ] Test failover scenarios

## 📞 Support & Escalation

### Incident Response Plan

1. **P1 - Critical** (Site Down)
   - Response Time: 15 minutes
   - Escalation: DevOps Lead → CTO
   - Action: Immediate rollback if needed

2. **P2 - Major** (Feature Broken)
   - Response Time: 1 hour
   - Escalation: Senior Developer → Tech Lead
   - Action: Hotfix deployment

3. **P3 - Minor** (UI Issues)
   - Response Time: 4 hours
   - Escalation: Developer → Tech Lead
   - Action: Schedule fix for next release

### Contact Information

- **DevOps Team**: devops@heypeter-academy.com
- **On-Call**: +1-XXX-XXX-XXXX
- **Escalation**: escalation@heypeter-academy.com

---

*Last updated: January 2025*