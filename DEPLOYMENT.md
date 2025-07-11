# HeyPeter Academy LMS - Deployment Guide

## 📋 Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Deployment Options](#deployment-options)
4. [Environment Setup](#environment-setup)
5. [Production Deployment](#production-deployment)
6. [Staging Deployment](#staging-deployment)
7. [Infrastructure Requirements](#infrastructure-requirements)
8. [Post-Deployment](#post-deployment)
9. [Troubleshooting](#troubleshooting)
10. [Additional Resources](#additional-resources)

## 🎯 Overview

HeyPeter Academy LMS is a comprehensive learning management system built with Next.js 14, Supabase, and modern web technologies. This guide provides complete instructions for deploying the application to various environments.

### Deployment Architecture

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│   Load Balancer     │────▶│   Application       │────▶│   Supabase          │
│   (Nginx/Vercel)    │     │   (Next.js)         │     │   (Database/Auth)   │
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘
           │                           │                           │
           ▼                           ▼                           ▼
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│   CDN/Static        │     │   Redis Cache       │     │   File Storage      │
│   (Vercel/S3)       │     │   (Sessions)        │     │   (Supabase)        │
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm/pnpm
- Docker and Docker Compose (for containerized deployment)
- Supabase account with project created
- Domain name (for production)
- SSL certificates (for production)

### Quick Deploy Commands

```bash
# Clone the repository
git clone https://github.com/your-org/hey-peter.git
cd hey-peter

# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with your values

# Deploy to staging
./deployment/scripts/deploy-staging.sh

# Deploy to production
./deployment/scripts/deploy-full-stack.sh --env production
```

## 🔧 Deployment Options

### 1. Vercel Deployment (Recommended for Production)

**Pros:**
- Zero-configuration deployment
- Automatic SSL and CDN
- Built-in analytics and monitoring
- Seamless GitHub integration

**Deploy Button:**
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-org%2Fhey-peter)

[📖 Detailed Vercel Deployment Guide](docs/deployment/vercel-deployment.md)

### 2. Docker Deployment (Self-Hosted)

**Pros:**
- Full control over infrastructure
- Consistent environments
- Easy horizontal scaling
- Works with any cloud provider

**Quick Start:**
```bash
# Production deployment
docker-compose -f docker-compose.production.yml up -d

# Staging deployment
docker-compose -f docker-compose.staging.yml up -d
```

[📖 Detailed Docker Deployment Guide](docs/deployment/docker-deployment.md)

### 3. Traditional VPS Deployment

**Pros:**
- Direct server control
- Cost-effective for small deployments
- Simple setup process

[📖 Detailed VPS Deployment Guide](docs/deployment/vps-deployment.md)

## 🔐 Environment Setup

### Required Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database Configuration
DATABASE_URL=postgresql://postgres:[password]@[host]:[port]/postgres
SUPABASE_DB_PASSWORD=your-database-password

# Authentication
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32

# Email Service (Mailgun)
MAILGUN_API_KEY=your-mailgun-api-key
MAILGUN_DOMAIN=your-mailgun-domain
NEXT_PUBLIC_MAILGUN_DOMAIN=your-mailgun-domain

# Optional: Monitoring
SENTRY_DSN=your-sentry-dsn
VERCEL_ANALYTICS_ID=your-vercel-analytics-id
```

### Environment-Specific Configurations

- **Development**: `.env.development`
- **Staging**: `.env.staging`
- **Production**: `.env.production`

[📖 Complete Environment Configuration Guide](docs/deployment/environment-configuration.md)

## 🏭 Production Deployment

### Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] SSL certificates obtained
- [ ] Domain DNS configured
- [ ] Database migrations tested
- [ ] Backup strategy defined
- [ ] Monitoring tools configured
- [ ] Load testing completed

### Deployment Steps

1. **Prepare Infrastructure**
   ```bash
   ./deployment/scripts/prepare-infrastructure.sh --env production
   ```

2. **Deploy Database**
   ```bash
   ./deployment/scripts/deploy-database.sh --env production
   ```

3. **Deploy Application**
   ```bash
   ./deployment/scripts/deploy-full-stack.sh --env production
   ```

4. **Verify Deployment**
   ```bash
   ./deployment/scripts/verify-deployment.sh --env production
   ```

[📖 Complete Production Deployment Guide](docs/deployment/production-deployment.md)

## 🧪 Staging Deployment

### Quick Staging Setup

```bash
# Deploy to staging environment
./deployment/scripts/deploy-staging.sh \
  --domain staging.heypeter-academy.com \
  --email admin@heypeter-academy.com
```

### Staging Features

- Self-signed SSL certificates
- Test data seeding
- Debug logging enabled
- Performance monitoring
- Isolated from production

[📖 Complete Staging Deployment Guide](docs/deployment/staging-deployment.md)

## 🏗️ Infrastructure Requirements

### Minimum Requirements

| Component | Development | Staging | Production |
|-----------|------------|---------|------------|
| CPU | 2 cores | 2 cores | 4+ cores |
| RAM | 4 GB | 8 GB | 16+ GB |
| Storage | 20 GB | 50 GB | 100+ GB |
| Database | Shared | Dedicated | Dedicated + Replica |
| Redis | Optional | 512 MB | 2+ GB |

### Recommended Stack

- **Application**: 3+ instances with load balancer
- **Database**: Supabase with read replicas
- **Cache**: Redis cluster
- **CDN**: Cloudflare or AWS CloudFront
- **Monitoring**: Prometheus + Grafana
- **Logs**: ELK stack or cloud solution

[📖 Complete Infrastructure Guide](docs/deployment/infrastructure-requirements.md)

## ✅ Post-Deployment

### Immediate Tasks

1. **Health Checks**
   ```bash
   curl https://your-domain.com/api/health
   ```

2. **Database Verification**
   ```bash
   npm run db:test
   ```

3. **SSL Verification**
   ```bash
   openssl s_client -connect your-domain.com:443
   ```

4. **Performance Testing**
   ```bash
   npm run test:performance
   ```

### Monitoring Setup

- Configure alerts in Grafana
- Set up error tracking in Sentry
- Enable application performance monitoring
- Configure backup verification

[📖 Complete Post-Deployment Checklist](docs/deployment/post-deployment-checklist.md)

## 🔧 Troubleshooting

### Common Issues

#### Application Won't Start
```bash
# Check logs
docker logs heypeter-academy-app

# Verify environment variables
docker exec heypeter-academy-app env | grep SUPABASE

# Test database connection
npm run db:test
```

#### Database Connection Issues
```bash
# Test Supabase connection
npx supabase status

# Check migrations
npx supabase db diff

# Reset database (careful!)
npx supabase db reset
```

#### Performance Issues
```bash
# Check resource usage
docker stats

# Analyze bundle size
npm run bundle:analyze

# Run performance tests
npm run test:performance
```

[📖 Complete Troubleshooting Guide](docs/deployment/troubleshooting.md)

## 📚 Additional Resources

### Documentation
- [Quick Start Guide](docs/deployment/quick-start.md)
- [Environment Configuration](docs/deployment/environment-configuration.md)
- [Production Deployment](docs/deployment/production-deployment.md)
- [Staging Deployment](docs/deployment/staging-deployment.md)
- [Docker Deployment](docs/deployment/docker-deployment.md)
- [Infrastructure Requirements](docs/deployment/infrastructure-requirements.md)
- [Post-Deployment Checklist](docs/deployment/post-deployment-checklist.md)
- [Troubleshooting Guide](docs/deployment/troubleshooting.md)

### External Resources
- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
- [Supabase Self-Hosting Guide](https://supabase.com/docs/guides/self-hosting)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Vercel Documentation](https://vercel.com/docs)

### Support

- **Documentation**: See `/docs` directory
- **Issues**: GitHub Issues
- **Email**: support@heypeter-academy.com
- **Community**: Discord/Slack channel

---

## 🎯 Quick Reference

### Essential Commands

```bash
# Development
npm run dev                     # Start development server
npm run docker:dev             # Start with Docker

# Testing
npm test                       # Run tests
npm run test:e2e              # Run E2E tests

# Building
npm run build                  # Build for production
npm run build:analyze         # Build with bundle analysis

# Deployment
./deploy-staging.sh           # Deploy to staging
./deploy-production.sh        # Deploy to production

# Database
npx supabase db push          # Apply migrations
npx supabase db reset         # Reset database

# Monitoring
docker logs -f app            # View logs
docker stats                  # Monitor resources
```

### Important URLs

- **Production**: https://heypeter-academy.com
- **Staging**: https://staging.heypeter-academy.com
- **Monitoring**: https://heypeter-academy.com:3001
- **API Health**: https://heypeter-academy.com/api/health

---

*Last updated: January 2025*