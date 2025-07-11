# HeyPeter Academy LMS - Staging Deployment Guide

This guide provides detailed instructions for deploying and managing the HeyPeter Academy LMS staging environment.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Detailed Setup](#detailed-setup)
5. [Configuration](#configuration)
6. [Testing](#testing)
7. [Monitoring](#monitoring)
8. [Troubleshooting](#troubleshooting)
9. [Maintenance](#maintenance)

## Overview

The staging environment is a production-like deployment used for final testing before production releases. It includes:

- **Application**: Next.js app running in Docker
- **Database**: Supabase PostgreSQL (staging project)
- **Cache**: Redis for session and data caching
- **Reverse Proxy**: Nginx with SSL termination
- **Monitoring**: Prometheus and Grafana
- **Test Data**: Pre-populated staging data

### Architecture

```
Internet → Nginx (SSL) → Next.js App → Supabase Database
                ↓              ↓
              Redis         Monitoring
```

## Prerequisites

### System Requirements

- Linux server (Ubuntu 20.04+ recommended)
- Minimum 4GB RAM, 2 CPU cores
- 50GB available disk space
- Docker and Docker Compose installed
- Git installed
- Domain with DNS access

### Required Accounts

- Supabase account with staging project
- AWS account (optional, for CDN)
- Email service for testing (e.g., Mailtrap)
- Domain/subdomain for staging (e.g., staging.heypeter-academy.com)

## Quick Start

### 1. One-Command Deployment

```bash
# Clone repository
git clone https://github.com/your-org/hey-peter.git
cd hey-peter

# Run staging deployment
./deployment/scripts/deploy-staging.sh \
  --domain staging.heypeter-academy.com \
  --email admin@heypeter-academy.com
```

### 2. Access Services

After deployment, access:

- **Application**: https://staging.heypeter-academy.com
- **Grafana**: http://staging.heypeter-academy.com:3001
- **Prometheus**: http://staging.heypeter-academy.com:9090

### 3. Test Credentials

```
Admin:    admin@staging.heypeter.com / staging123
Teacher:  teacher1@staging.heypeter.com / staging123
Student:  student1@staging.heypeter.com / staging123
```

## Detailed Setup

### Step 1: Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sudo sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

### Step 2: Environment Configuration

1. Copy the environment template:
```bash
cp deployment/environments/.env.staging.template deployment/environments/.env.staging
```

2. Edit the configuration:
```bash
nano deployment/environments/.env.staging
```

3. Update these required values:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-staging-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-staging-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-staging-service-role-key
SUPABASE_DB_PASSWORD=your-staging-db-password

# Email (using Mailtrap for testing)
EMAIL_SERVER_USER=your-mailtrap-username
EMAIL_SERVER_PASSWORD=your-mailtrap-password

# Security
NEXTAUTH_SECRET=generate-32-character-secret-here
JWT_SECRET=another-secret-key-here
```

### Step 3: SSL Certificate Setup

For staging, we use self-signed certificates:

```bash
# Generate self-signed certificate
cd deployment/ssl
mkdir -p staging
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout staging/key.pem \
  -out staging/cert.pem \
  -subj "/C=US/ST=State/L=City/O=HeyPeter Academy/CN=staging.heypeter-academy.com"
```

### Step 4: Database Setup

1. Create a Supabase staging project
2. Run migrations:
```bash
# Link to Supabase project
npx supabase link --project-ref your-staging-project-ref

# Push migrations
npx supabase db push
```

3. Seed staging data:
```bash
./deployment/scripts/seed-staging-data.sh
```

### Step 5: Deploy Application

```bash
# Build and start containers
docker-compose -f docker-compose.staging.yml up -d --build

# Check container status
docker ps

# View logs
docker-compose -f docker-compose.staging.yml logs -f
```

## Configuration

### Environment Variables

Key environment variables for staging:

| Variable | Description | Example |
|----------|-------------|---------|
| NODE_ENV | Environment mode | staging |
| NEXT_PUBLIC_APP_URL | Application URL | https://staging.heypeter-academy.com |
| NEXT_PUBLIC_SUPABASE_URL | Supabase project URL | https://project.supabase.co |
| EMAIL_SERVER_HOST | SMTP host | smtp.mailtrap.io |
| REDIS_PASSWORD | Redis password | staging-redis-password |
| GRAFANA_ADMIN_PASSWORD | Grafana admin password | secure-password |

### Docker Compose Configuration

The `docker-compose.staging.yml` includes:

- **app**: Next.js application
- **redis**: Redis cache server
- **nginx**: Reverse proxy with SSL
- **prometheus**: Metrics collection
- **grafana**: Metrics visualization

### Nginx Configuration

Located at `nginx/staging.conf`:
- SSL termination with self-signed certificates
- Rate limiting for API endpoints
- Cache headers for static assets
- Security headers
- Monitoring endpoints access control

## Testing

### 1. Health Checks

Run comprehensive health checks:

```bash
./deployment/scripts/staging-health-check.sh
```

### 2. Smoke Tests

Basic functionality tests:

```bash
# Test authentication
curl -X POST https://staging.heypeter-academy.com/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"student1@staging.heypeter.com","password":"staging123"}'

# Test API endpoints
curl https://staging.heypeter-academy.com/api/health
curl https://staging.heypeter-academy.com/api/courses
```

### 3. Load Testing

```bash
# Install Apache Bench
sudo apt install apache2-utils

# Run load test
ab -n 1000 -c 10 https://staging.heypeter-academy.com/
```

### 4. Feature Testing Checklist

- [ ] User registration and login
- [ ] Student enrollment
- [ ] Class booking
- [ ] Teacher availability
- [ ] Hour package management
- [ ] Attendance tracking
- [ ] Email notifications (check Mailtrap)
- [ ] File uploads
- [ ] Export functionality

## Monitoring

### 1. Access Monitoring Tools

- **Grafana**: http://staging.heypeter-academy.com:3001
  - Username: admin
  - Password: (from GRAFANA_ADMIN_PASSWORD env var)

- **Prometheus**: http://staging.heypeter-academy.com:9090

### 2. Key Metrics to Monitor

- Application response times
- Error rates
- Database query performance
- Redis hit rates
- Container resource usage

### 3. Log Monitoring

```bash
# Application logs
docker logs -f heypeter-academy-staging

# Nginx logs
docker logs -f heypeter-nginx-staging

# All containers
docker-compose -f docker-compose.staging.yml logs -f
```

## Troubleshooting

### Common Issues

#### 1. Container Won't Start

```bash
# Check logs
docker logs heypeter-academy-staging

# Check environment variables
docker exec heypeter-academy-staging env | grep SUPABASE

# Restart container
docker-compose -f docker-compose.staging.yml restart app
```

#### 2. Database Connection Issues

```bash
# Test database connection
docker exec heypeter-academy-staging npm run db:test

# Check Supabase status
curl https://your-project.supabase.co/rest/v1/

# Verify credentials
echo $DATABASE_URL
```

#### 3. SSL Certificate Issues

```bash
# Regenerate certificate
cd deployment/ssl/staging
rm -f *.pem
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout key.pem -out cert.pem \
  -subj "/CN=staging.heypeter-academy.com"

# Restart Nginx
docker-compose -f docker-compose.staging.yml restart nginx
```

#### 4. Redis Connection Issues

```bash
# Test Redis
docker exec heypeter-redis-staging redis-cli ping

# Check Redis logs
docker logs heypeter-redis-staging

# Flush Redis cache
docker exec heypeter-redis-staging redis-cli FLUSHALL
```

### Debug Mode

Enable debug logging:

```bash
# Edit .env.staging
ENABLE_DEBUG_LOGGING=true
DEBUG=*

# Restart application
docker-compose -f docker-compose.staging.yml restart app
```

## Maintenance

### Daily Tasks

1. Check health status:
```bash
./deployment/scripts/staging-health-check.sh
```

2. Monitor disk space:
```bash
df -h
docker system df
```

3. Review error logs:
```bash
docker logs heypeter-academy-staging 2>&1 | grep -i error | tail -20
```

### Weekly Tasks

1. Update dependencies:
```bash
cd hey-peter
git pull origin main
npm install
docker-compose -f docker-compose.staging.yml build
docker-compose -f docker-compose.staging.yml up -d
```

2. Clean up old containers and images:
```bash
docker system prune -a --volumes
```

3. Backup database:
```bash
pg_dump $DATABASE_URL > backup_staging_$(date +%Y%m%d).sql
```

### Reset Staging Environment

To completely reset staging:

```bash
# Stop all containers
docker-compose -f docker-compose.staging.yml down -v

# Remove all data
docker volume rm $(docker volume ls -q | grep staging)

# Rebuild and restart
docker-compose -f docker-compose.staging.yml up -d --build

# Re-seed data
./deployment/scripts/seed-staging-data.sh
```

## Security Considerations

### Staging-Specific Security

1. **Access Control**: Limit access to staging environment
2. **Test Data**: Use only anonymized test data
3. **Credentials**: Never use production credentials
4. **Monitoring**: Enable security monitoring
5. **Updates**: Keep staging updated with security patches

### Security Headers

Nginx adds these security headers:
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Content-Security-Policy: default-src 'self'

## Deployment Workflow

### 1. Pre-Deployment

```bash
# Update code
git checkout main
git pull origin main

# Run tests
npm test
npm run build
```

### 2. Deploy to Staging

```bash
./deployment/scripts/deploy-staging.sh
```

### 3. Post-Deployment

```bash
# Run health checks
./deployment/scripts/staging-health-check.sh

# Test critical features
# Monitor for 24 hours
# Proceed to production if stable
```

## Appendix

### Useful Commands

```bash
# View all containers
docker ps -a

# Restart all services
docker-compose -f docker-compose.staging.yml restart

# View resource usage
docker stats

# Execute commands in container
docker exec -it heypeter-academy-staging bash

# View environment variables
docker exec heypeter-academy-staging env

# Tail multiple logs
docker-compose -f docker-compose.staging.yml logs -f app nginx

# Database console
docker exec -it heypeter-academy-staging npm run db:console
```

### Environment Variables Reference

See `deployment/environments/.env.staging.template` for complete list.

### Support

For issues or questions:
- Check logs first
- Review this documentation
- Contact: devops@heypeter-academy.com
- Slack: #staging-support

---

**Last Updated**: January 2025
**Version**: 1.0.0
**Maintainer**: DevOps Team