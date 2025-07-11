# HeyPeter Academy LMS - Production Deployment Guide

This comprehensive guide covers the complete production deployment process for the HeyPeter Academy Learning Management System.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Infrastructure Setup](#infrastructure-setup)
4. [Security Configuration](#security-configuration)
5. [Database Deployment](#database-deployment)
6. [Application Deployment](#application-deployment)
7. [Load Balancer Setup](#load-balancer-setup)
8. [CDN Configuration](#cdn-configuration)
9. [Monitoring Setup](#monitoring-setup)
10. [Backup Configuration](#backup-configuration)
11. [Testing and Validation](#testing-and-validation)
12. [Go-Live Checklist](#go-live-checklist)
13. [Post-Deployment](#post-deployment)
14. [Troubleshooting](#troubleshooting)

## Overview

The HeyPeter Academy LMS production deployment consists of:

- **Application Layer**: Next.js application running in Docker containers
- **Database Layer**: Supabase PostgreSQL with Row Level Security
- **Load Balancer**: Nginx with HAProxy for high availability
- **CDN**: CloudFront for static asset delivery
- **Monitoring**: Prometheus, Grafana, and custom health checks
- **Backup System**: Automated database and file backups
- **Security**: SSL/TLS encryption, firewall, and security headers

### Architecture Diagram

```
Internet → CloudFront CDN → Load Balancer (Nginx/HAProxy) → Application Instances → Supabase Database
                                    ↓
                            Monitoring & Alerting
                                    ↓
                            Backup & Recovery System
```

## Prerequisites

### Required Tools

```bash
# Install required tools
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# AWS CLI (for CDN and storage)
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Supabase CLI
npm install -g @supabase/cli

# Other tools
sudo apt-get update
sudo apt-get install -y postgresql-client nginx certbot
```

### Environment Requirements

- **Server**: Linux (Ubuntu 20.04+ recommended)
- **Memory**: Minimum 8GB RAM (16GB recommended)
- **Storage**: Minimum 100GB SSD
- **Network**: Static IP address, firewall access
- **Domain**: Registered domain with DNS access

### Accounts and Services

- [x] Supabase account and project
- [x] AWS account (for CloudFront CDN)
- [x] Domain registrar access
- [x] Email service (SMTP)
- [x] Slack workspace (for alerts)

## Infrastructure Setup

### 1. Server Preparation

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Create deployment user
sudo useradd -m -s /bin/bash deploy
sudo usermod -aG docker deploy
sudo usermod -aG sudo deploy

# Setup SSH key authentication
sudo mkdir -p /home/deploy/.ssh
sudo cp ~/.ssh/authorized_keys /home/deploy/.ssh/
sudo chown -R deploy:deploy /home/deploy/.ssh
sudo chmod 700 /home/deploy/.ssh
sudo chmod 600 /home/deploy/.ssh/authorized_keys
```

### 2. Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH
sudo ufw allow ssh

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow monitoring (restrict to monitoring network)
sudo ufw allow from 172.20.0.0/16 to any port 9090
sudo ufw allow from 172.20.0.0/16 to any port 3001

# Enable firewall
sudo ufw enable
```

### 3. Clone Repository

```bash
# Switch to deploy user
sudo su - deploy

# Clone repository
git clone https://github.com/your-org/hey-peter.git
cd hey-peter

# Checkout production branch
git checkout main
```

## Security Configuration

### 1. SSL Certificate Setup

```bash
# Generate SSL certificates
cd deployment/ssl
./setup-ssl.sh heypeter-academy.com admin@heypeter-academy.com letsencrypt

# Verify certificate installation
openssl x509 -in /etc/ssl/heypeter-academy.com/fullchain.pem -text -noout
```

### 2. Environment Variables

```bash
# Copy environment template
cp deployment/environments/production.env.example deployment/environments/.env.production

# Edit with your actual values
nano deployment/environments/.env.production
```

**Required Environment Variables:**

```bash
# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://heypeter-academy.com
NEXTAUTH_SECRET=your-32-character-secret-key

# Database
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DB_PASSWORD=your-database-password

# Email
EMAIL_SERVER_HOST=smtp.your-provider.com
EMAIL_SERVER_USER=your-smtp-username
EMAIL_SERVER_PASSWORD=your-smtp-password

# Monitoring
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your-webhook
```

### 3. Secrets Management

```bash
# Set proper permissions
chmod 600 deployment/environments/.env.production
chown deploy:deploy deployment/environments/.env.production

# Generate encryption keys
sudo mkdir -p /etc/heypeter
sudo openssl rand -hex 32 > /etc/heypeter/app.key
sudo chmod 600 /etc/heypeter/app.key
sudo chown deploy:deploy /etc/heypeter/app.key
```

## Database Deployment

### 1. Database Migration

```bash
# Run database deployment script
cd deployment/scripts
./deploy-database.sh production false true

# Verify database schema
supabase db dump --local --schema-only > /tmp/schema.sql
```

### 2. Production Data Seeding

```bash
# Seed production data
./seed-production-data.sh production false

# Verify data integrity
./deploy-database.sh production true  # Dry run verification
```

### 3. Database Security

```bash
# Enable Row Level Security
supabase db psql -c "
  ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE students ENABLE ROW LEVEL SECURITY;
  ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
  ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
"

# Create security policies (see migrations for full policies)
```

## Application Deployment

### 1. Build Application

```bash
# Install dependencies
npm install --frozen-lockfile

# Build for production
npm run build

# Verify build
npm run start &
curl http://localhost:3000/health
kill %1
```

### 2. Docker Deployment

```bash
# Build Docker images
docker build -t heypeter-academy:latest .

# Tag for registry (if using)
docker tag heypeter-academy:latest your-registry/heypeter-academy:v1.0.0
```

### 3. Health Checks

```bash
# Test application health endpoints
curl http://localhost:3000/health
curl http://localhost:3000/api/health
```

## Load Balancer Setup

### 1. Configure Load Balancer

```bash
# Setup load balancer
cd deployment/load-balancer
./setup-lb.sh production nginx 3 false

# Test load balancer
./health-check.sh
```

### 2. SSL Configuration

```bash
# Configure Nginx SSL
sudo cp deployment/ssl/nginx-ssl.conf /etc/nginx/conf.d/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. High Availability Setup

```bash
# For HA setup with multiple servers
./setup-lb.sh production both 5 false
```

## CDN Configuration

### 1. Setup CloudFront CDN

```bash
# Configure CDN
cd deployment/cdn
./setup-cdn.sh production false heypeter-academy.com heypeter-static-assets

# Update DNS records
# Add CNAME: heypeter-academy.com → d123456789.cloudfront.net
```

### 2. Cache Optimization

```bash
# Setup cache invalidation
./invalidate-cache.sh E1234567890123 "/*"
```

## Monitoring Setup

### 1. Deploy Monitoring Stack

```bash
# Setup monitoring
cd deployment/monitoring
./setup-monitoring.sh production full false

# Access monitoring services
# Grafana: http://your-server:3001 (admin/heypeter-admin-2025)
# Prometheus: http://your-server:9090
```

### 2. Configure Alerts

```bash
# Test alert notifications
curl -X POST http://localhost:9093/api/v1/alerts \
  -H "Content-Type: application/json" \
  -d '[{
    "labels": {
      "alertname": "TestAlert",
      "severity": "warning"
    },
    "annotations": {
      "summary": "Test alert for deployment"
    }
  }]'
```

### 3. Setup Custom Health Checks

```bash
# Health checker will run automatically
# Check logs
docker logs heypeter-health-checker
```

## Backup Configuration

### 1. Setup Backup System

```bash
# Configure backups
cd deployment/backup
./setup-backup.sh production s3 false

# Test backup
./backup-manager.sh backup database production
```

### 2. Verify Backup Integrity

```bash
# Test restore process
./backup-manager.sh restore /backup/database/latest_backup.dump test_restore
```

### 3. Schedule Automated Backups

```bash
# Backup schedules are automatically configured via cron
# Verify cron jobs
sudo crontab -u backup -l
```

## Testing and Validation

### 1. Functional Testing

```bash
# Test application endpoints
curl -I https://heypeter-academy.com
curl https://heypeter-academy.com/health
curl https://heypeter-academy.com/api/health

# Test authentication
curl -X POST https://heypeter-academy.com/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass"}'
```

### 2. Performance Testing

```bash
# Load testing with basic tools
ab -n 1000 -c 10 https://heypeter-academy.com/
```

### 3. Security Testing

```bash
# SSL testing
openssl s_client -connect heypeter-academy.com:443 -servername heypeter-academy.com

# Security headers check
curl -I https://heypeter-academy.com/
```

### 4. Database Testing

```bash
# Connection test
psql -h your-supabase-host -U postgres -d postgres -c "SELECT version();"

# Performance test
psql -h your-supabase-host -U postgres -d postgres -c "SELECT COUNT(*) FROM profiles;"
```

## Go-Live Checklist

### Pre-Launch (T-24 hours)

- [ ] All environments configured and tested
- [ ] SSL certificates installed and validated
- [ ] Database migrations applied successfully
- [ ] Application builds and deploys correctly
- [ ] Load balancer routing traffic properly
- [ ] CDN configured and caching correctly
- [ ] Monitoring and alerting functional
- [ ] Backup system tested and working
- [ ] DNS records prepared for cutover
- [ ] Team notifications sent

### Launch Day (T-0)

- [ ] Final backup of current system
- [ ] Switch DNS to new infrastructure
- [ ] Verify all services running
- [ ] Test critical user flows
- [ ] Monitor system metrics
- [ ] Check error logs
- [ ] Validate external integrations
- [ ] Confirm monitoring alerts working
- [ ] Test backup and restore procedures
- [ ] Update status page

### Post-Launch (T+2 hours)

- [ ] All services stable
- [ ] No critical errors in logs
- [ ] Performance metrics normal
- [ ] User feedback positive
- [ ] Monitoring dashboards green
- [ ] Backup completed successfully
- [ ] Documentation updated
- [ ] Team debriefing scheduled

## Post-Deployment

### 1. Monitoring and Maintenance

```bash
# Daily health checks
./deployment/monitoring/health-check.sh

# Weekly performance review
./deployment/scripts/performance-report.sh

# Monthly security updates
./deployment/scripts/security-update.sh
```

### 2. Scaling Considerations

```bash
# Scale application instances
docker-compose -f deployment/load-balancer/docker-compose.generated.yml scale app1=2

# Add new application instances
./deployment/load-balancer/setup-lb.sh production nginx 5 false
```

### 3. Regular Maintenance

- **Daily**: Monitor system health, check error logs
- **Weekly**: Review performance metrics, test backups
- **Monthly**: Security updates, capacity planning
- **Quarterly**: Disaster recovery testing, security audit

## Troubleshooting

### Common Issues

#### 1. Application Won't Start

```bash
# Check logs
docker logs heypeter-app1

# Check environment variables
docker exec heypeter-app1 env | grep -E "(NODE_ENV|SUPABASE|DATABASE)"

# Test database connection
docker exec heypeter-app1 npm run db:test
```

#### 2. Load Balancer Issues

```bash
# Check Nginx status
sudo nginx -t
sudo systemctl status nginx

# Check upstream servers
curl -H "Host: heypeter-academy.com" http://localhost/health

# View access logs
tail -f /var/log/nginx/access.log
```

#### 3. Database Connection Problems

```bash
# Test connection
psql -h your-supabase-host -U postgres -d postgres

# Check firewall rules
sudo ufw status

# Verify SSL settings
openssl s_client -connect your-supabase-host:5432
```

#### 4. SSL Certificate Issues

```bash
# Check certificate validity
openssl x509 -in /etc/ssl/heypeter-academy.com/fullchain.pem -text -noout

# Renew certificate
certbot renew --dry-run

# Test SSL configuration
curl -I https://heypeter-academy.com/
```

#### 5. Performance Issues

```bash
# Check resource usage
htop
df -h
free -m

# Database performance
psql -h your-supabase-host -U postgres -d postgres -c "
  SELECT query, mean_time, calls 
  FROM pg_stat_statements 
  ORDER BY mean_time DESC 
  LIMIT 10;
"

# Application metrics
curl http://localhost:3000/api/metrics
```

### Emergency Procedures

#### 1. Rollback Deployment

```bash
# Stop current deployment
docker-compose -f deployment/environments/docker-compose.production.yml down

# Restore from backup
./deployment/backup/backup-manager.sh restore /backup/database/pre_deployment_backup.dump

# Deploy previous version
git checkout previous-stable-tag
docker build -t heypeter-academy:rollback .
# Update docker-compose to use rollback image
docker-compose -f deployment/environments/docker-compose.production.yml up -d
```

#### 2. Database Recovery

```bash
# Stop application
docker-compose -f deployment/environments/docker-compose.production.yml stop

# Restore database
./deployment/backup/backup-manager.sh restore /backup/database/latest_backup.dump

# Verify data integrity
./deployment/scripts/verify-data-integrity.sh

# Restart application
docker-compose -f deployment/environments/docker-compose.production.yml start
```

#### 3. Security Incident Response

```bash
# Immediate actions
1. Isolate affected systems
2. Preserve evidence
3. Assess impact
4. Notify stakeholders

# Check for unauthorized access
grep "Failed password" /var/log/auth.log
grep "Invalid user" /var/log/auth.log

# Review application logs
grep -i "error\|exception\|unauthorized" /var/log/nginx/access.log

# Change credentials
./deployment/scripts/rotate-credentials.sh
```

### Support Contacts

- **Technical Lead**: tech-lead@heypeter-academy.com
- **DevOps Team**: devops@heypeter-academy.com
- **Emergency Hotline**: +1-xxx-xxx-xxxx
- **Slack Channel**: #production-support

### Additional Resources

- [Application Documentation](../README.md)
- [API Documentation](../docs/api.md)
- [Database Schema](../docs/database-schema.md)
- [Security Guidelines](../docs/security.md)
- [Performance Optimization](../docs/performance.md)

---

## Deployment Summary

This guide provides comprehensive instructions for deploying the HeyPeter Academy LMS to production. Key components include:

- **Scalable Architecture**: Load-balanced application instances
- **High Availability**: Multiple redundancy layers
- **Security**: SSL/TLS, firewall, RLS policies
- **Monitoring**: Real-time metrics and alerting
- **Backup**: Automated backup and recovery
- **Performance**: CDN and caching optimization

For additional support or questions, contact the DevOps team or refer to the troubleshooting section above.

**Last Updated**: $(date)
**Version**: 1.0.0
**Environment**: Production