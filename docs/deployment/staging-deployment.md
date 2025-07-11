# Staging Deployment Guide - HeyPeter Academy LMS

This guide covers deploying HeyPeter Academy LMS to a staging environment for testing and quality assurance before production deployment.

## 🎯 Overview

The staging environment is designed to mirror production as closely as possible while providing a safe space for testing new features, updates, and configurations.

### Staging Environment Purpose

- **Feature Testing**: Test new features before production
- **Integration Testing**: Verify third-party integrations
- **Performance Testing**: Load and stress testing
- **Training**: User training and demonstrations
- **Bug Reproduction**: Debug production issues safely

## 📋 Staging Setup Requirements

### Infrastructure

- **Servers**: 1-2 instances (can be smaller than production)
- **Database**: Separate Supabase project or self-hosted instance
- **Domain**: staging.heypeter-academy.com
- **SSL**: Self-signed certificates acceptable
- **Monitoring**: Basic monitoring setup

### Access Control

- Restricted to development team and QA
- Basic authentication for additional security
- Separate credentials from production

## 🚀 Quick Staging Deployment

### One-Command Deployment

```bash
# Deploy to staging with defaults
./deployment/scripts/deploy-staging.sh

# Deploy with custom options
./deployment/scripts/deploy-staging.sh \
  --domain staging.example.com \
  --skip-tests \
  --seed-data
```

### Docker Compose Staging

```bash
# Start staging environment
docker-compose -f docker-compose.staging.yml up -d

# View logs
docker-compose -f docker-compose.staging.yml logs -f

# Stop staging
docker-compose -f docker-compose.staging.yml down
```

## 🔧 Staging Configuration

### Environment Variables

Create `.env.staging`:

```bash
# Node Environment
NODE_ENV=staging

# Supabase Staging Project
NEXT_PUBLIC_SUPABASE_URL=https://staging-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=staging-anon-key
SUPABASE_SERVICE_ROLE_KEY=staging-service-key

# Database
DATABASE_URL=postgresql://postgres:password@db:5432/heypeter_staging
SUPABASE_DB_PASSWORD=staging-db-password

# Authentication
NEXTAUTH_SECRET=staging-secret-key

# Email (Use sandbox/test service)
MAILGUN_API_KEY=test-api-key
MAILGUN_DOMAIN=sandbox.mailgun.org
EMAIL_TEST_MODE=true

# Features Flags
ENABLE_DEBUG_LOGGING=true
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_TEST_ENDPOINTS=true

# External Services (Test/Sandbox)
STRIPE_TEST_MODE=true
STRIPE_TEST_PUBLIC_KEY=pk_test_xxxxx
STRIPE_TEST_SECRET_KEY=sk_test_xxxxx
```

### Docker Compose Configuration

```yaml
# docker-compose.staging.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        NODE_ENV: staging
    container_name: heypeter-staging
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: staging
      NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      DATABASE_URL: ${DATABASE_URL}
    volumes:
      - ./logs:/app/logs
    networks:
      - heypeter-staging
    depends_on:
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    container_name: heypeter-redis-staging
    ports:
      - "6379:6379"
    volumes:
      - redis-staging-data:/data
    networks:
      - heypeter-staging
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    container_name: heypeter-nginx-staging
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/staging.conf:/etc/nginx/nginx.conf:ro
      - ./ssl/staging:/etc/nginx/ssl:ro
    networks:
      - heypeter-staging
    depends_on:
      - app
    restart: unless-stopped

volumes:
  redis-staging-data:

networks:
  heypeter-staging:
    driver: bridge
```

## 🗄️ Database Setup

### Create Staging Database

```bash
# Using Supabase CLI
supabase projects create heypeter-staging --org-id your-org-id

# Link to staging project
supabase link --project-ref your-staging-project-ref

# Push schema
supabase db push
```

### Seed Test Data

```bash
# Run staging seed script
npm run seed:staging

# Or use the dedicated script
./scripts/seed-staging-data.sh
```

### Test Data Script

```sql
-- scripts/seed-staging-data.sql

-- Test Admin User
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'admin@staging.heypeter.com',
    crypt('staging123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW()
);

-- Test Students
INSERT INTO students (user_id, first_name, last_name, email, phone, status)
VALUES 
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Test', 'Student1', 'student1@test.com', '+1234567890', 'active'),
    (gen_random_uuid(), 'Test', 'Student2', 'student2@test.com', '+1234567891', 'active'),
    (gen_random_uuid(), 'Test', 'Student3', 'student3@test.com', '+1234567892', 'active');

-- Test Teachers
INSERT INTO teachers (user_id, first_name, last_name, email, specialization, status)
VALUES 
    (gen_random_uuid(), 'Test', 'Teacher1', 'teacher1@test.com', 'English', 'active'),
    (gen_random_uuid(), 'Test', 'Teacher2', 'teacher2@test.com', 'Business', 'active');

-- Test Courses
INSERT INTO courses (code, name, type, duration_hours, max_students, status)
VALUES 
    ('TEST-001', 'Test Basic Course', 'basic', 30, 9, 'active'),
    ('TEST-002', 'Test Business Course', 'business', 40, 6, 'active');
```

## 🔐 Security Configuration

### Basic Authentication

```nginx
# nginx/staging.conf
server {
    listen 443 ssl;
    server_name staging.heypeter-academy.com;

    # Basic Auth
    auth_basic "Staging Environment";
    auth_basic_user_file /etc/nginx/.htpasswd;

    # Self-signed SSL
    ssl_certificate /etc/nginx/ssl/staging.crt;
    ssl_certificate_key /etc/nginx/ssl/staging.key;

    location / {
        proxy_pass http://app:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Generate Credentials

```bash
# Create htpasswd file
htpasswd -c /etc/nginx/.htpasswd staginguser

# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/staging.key \
    -out /etc/nginx/ssl/staging.crt \
    -subj "/C=US/ST=State/L=City/O=HeyPeter/CN=staging.heypeter-academy.com"
```

## 🧪 Testing in Staging

### Automated Test Suite

```bash
# Run E2E tests against staging
npm run test:e2e:staging

# Run performance tests
npm run test:performance:staging

# Run security tests
npm run test:security:staging
```

### Test Configuration

```javascript
// tests/e2e/staging.config.js
module.exports = {
  baseURL: 'https://staging.heypeter-academy.com',
  use: {
    // Ignore HTTPS errors for self-signed certs
    ignoreHTTPSErrors: true,
    
    // Basic auth
    httpCredentials: {
      username: 'staginguser',
      password: process.env.STAGING_PASSWORD
    },
    
    // Test viewport
    viewport: { width: 1280, height: 720 },
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  }
};
```

### Load Testing

```javascript
// tests/load/staging-load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5m', target: 100 },  // Ramp up
    { duration: '10m', target: 100 }, // Stay at 100 users
    { duration: '5m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.1'],    // Error rate under 10%
  },
};

export default function () {
  const response = http.get('https://staging.heypeter-academy.com', {
    auth: 'basic',
    username: 'staginguser',
    password: __ENV.STAGING_PASSWORD,
  });
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'page loaded': (r) => r.body.includes('HeyPeter Academy'),
  });
  
  sleep(1);
}
```

## 📊 Monitoring

### Basic Monitoring Setup

```yaml
# docker-compose.staging.yml (additional services)
services:
  prometheus:
    image: prom/prometheus:latest
    container_name: heypeter-prometheus-staging
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus-staging.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-staging-data:/prometheus
    networks:
      - heypeter-staging
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: heypeter-grafana-staging
    ports:
      - "3001:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: staging-admin
      GF_USERS_ALLOW_SIGN_UP: false
    volumes:
      - grafana-staging-data:/var/lib/grafana
    networks:
      - heypeter-staging
    restart: unless-stopped
```

### Staging-Specific Dashboards

```json
// monitoring/dashboards/staging-overview.json
{
  "dashboard": {
    "title": "HeyPeter Staging Overview",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])"
          }
        ]
      },
      {
        "title": "Response Time",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
          }
        ]
      }
    ]
  }
}
```

## 🔄 Deployment Pipeline

### CI/CD for Staging

```yaml
# .github/workflows/deploy-staging.yml
name: Deploy to Staging

on:
  push:
    branches: [develop, staging]
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run lint

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker image
        run: |
          docker build -t heypeter-staging:${{ github.sha }} .
          docker tag heypeter-staging:${{ github.sha }} heypeter-staging:latest
      
      - name: Deploy to staging
        env:
          STAGING_HOST: ${{ secrets.STAGING_HOST }}
          STAGING_USER: ${{ secrets.STAGING_USER }}
          STAGING_KEY: ${{ secrets.STAGING_SSH_KEY }}
        run: |
          echo "$STAGING_KEY" > staging_key
          chmod 600 staging_key
          ssh -i staging_key -o StrictHostKeyChecking=no $STAGING_USER@$STAGING_HOST '
            cd /opt/heypeter-staging
            docker-compose pull
            docker-compose up -d
            docker-compose logs --tail=50
          '
      
      - name: Run smoke tests
        run: |
          npm run test:smoke:staging
```

## 🧹 Maintenance

### Regular Tasks

```bash
# Daily database refresh from production (anonymized)
./scripts/refresh-staging-db.sh

# Weekly cleanup of test data
./scripts/cleanup-staging.sh

# Update staging with latest develop branch
git checkout develop
git pull
./deployment/scripts/deploy-staging.sh
```

### Database Refresh Script

```bash
#!/bin/bash
# scripts/refresh-staging-db.sh

set -euo pipefail

echo "Refreshing staging database..."

# Backup current staging
pg_dump $STAGING_DATABASE_URL > staging-backup-$(date +%Y%m%d).sql

# Dump production structure (no data)
pg_dump $PRODUCTION_DATABASE_URL --schema-only > prod-structure.sql

# Dump production data (anonymized)
psql $PRODUCTION_DATABASE_URL << EOF > prod-data.sql
COPY (
  SELECT 
    id,
    'user' || id::text || '@staging.test' as email,
    'Test' as first_name,
    'User' || id::text as last_name,
    '+1555000' || (random() * 9999)::int as phone,
    created_at,
    updated_at,
    status
  FROM students
) TO STDOUT WITH CSV;
EOF

# Reset staging database
psql $STAGING_DATABASE_URL < prod-structure.sql
psql $STAGING_DATABASE_URL < prod-data.sql

# Run post-refresh tasks
npm run db:migrate:staging
npm run db:seed:staging

echo "Staging database refreshed!"
```

## 🚨 Troubleshooting

### Common Issues

#### SSL Certificate Errors
```bash
# Regenerate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout staging.key -out staging.crt \
  -subj "/CN=staging.heypeter-academy.com"

# Update nginx
docker-compose -f docker-compose.staging.yml restart nginx
```

#### Database Connection Issues
```bash
# Check database status
docker-compose -f docker-compose.staging.yml exec app \
  npx supabase status

# Reset database connection
docker-compose -f docker-compose.staging.yml restart app
```

#### Memory Issues
```bash
# Check memory usage
docker stats

# Increase memory limits in docker-compose.yml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 2G
```

### Debug Mode

```bash
# Enable debug logging
export DEBUG=*
export LOG_LEVEL=debug

# Start with verbose logging
docker-compose -f docker-compose.staging.yml up

# Check application logs
docker logs -f heypeter-staging --tail 100
```

## 📋 Staging Checklist

### Pre-Deployment
- [ ] Code merged to staging branch
- [ ] Environment variables updated
- [ ] Database migrations ready
- [ ] Test data prepared

### Deployment
- [ ] Deploy application
- [ ] Run database migrations
- [ ] Seed test data
- [ ] Verify health checks

### Post-Deployment
- [ ] Run automated tests
- [ ] Check monitoring dashboards
- [ ] Verify email sending (test mode)
- [ ] Test critical user flows
- [ ] Document any issues

### Sign-off
- [ ] QA team approval
- [ ] Product owner review
- [ ] Performance acceptable
- [ ] Ready for production

## 🔗 Access Information

### URLs
- **Application**: https://staging.heypeter-academy.com
- **Monitoring**: https://staging.heypeter-academy.com:3001
- **API Docs**: https://staging.heypeter-academy.com/api-docs

### Credentials
- **Basic Auth**: staginguser / (check 1Password)
- **Admin Login**: admin@staging.heypeter.com / staging123
- **Grafana**: admin / staging-admin

### Support
- **Staging Issues**: staging@heypeter-academy.com
- **Slack Channel**: #heypeter-staging
- **Wiki**: https://wiki.heypeter-academy.com/staging

---

*Last updated: January 2025*