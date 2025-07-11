# Installation and Configuration Guide

This comprehensive guide covers everything you need to install, configure, and deploy the HeyPeter Academy Learning Management System.

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Quick Start](#quick-start)
3. [Development Setup](#development-setup)
4. [Production Deployment](#production-deployment)
5. [Database Configuration](#database-configuration)
6. [Environment Variables](#environment-variables)
7. [Docker Setup](#docker-setup)
8. [Security Configuration](#security-configuration)
9. [Performance Optimization](#performance-optimization)
10. [Monitoring & Logging](#monitoring--logging)
11. [Backup & Recovery](#backup--recovery)
12. [Troubleshooting](#troubleshooting)

## System Requirements

### Minimum Requirements
- **Operating System**: Linux (Ubuntu 20.04+), macOS (10.15+), Windows 10+
- **Node.js**: Version 18.0 or higher
- **Memory**: 4GB RAM minimum, 8GB recommended
- **Storage**: 20GB available space minimum
- **Database**: PostgreSQL 13+ (via Supabase)
- **Network**: Stable internet connection for cloud services

### Recommended Requirements
- **CPU**: 4+ cores
- **Memory**: 16GB RAM
- **Storage**: 50GB+ SSD storage
- **Network**: High-speed internet connection (100+ Mbps)
- **Backup**: External storage for data backup

### Software Dependencies
- **Runtime**: Node.js 18+ with npm or pnpm
- **Database**: Supabase (PostgreSQL 13+)
- **Version Control**: Git
- **Package Manager**: npm, pnpm, or yarn
- **Docker**: Docker Desktop or Docker Engine (optional)

## Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/hey-peter.git
cd hey-peter
```

### 2. Install Dependencies
```bash
# Using npm
npm install

# Using pnpm (recommended)
pnpm install

# Using yarn
yarn install
```

### 3. Environment Setup
```bash
# Copy environment template
cp .env.example .env.local

# Edit environment variables
nano .env.local
```

### 4. Database Setup
```bash
# Install Supabase CLI
npm install -g @supabase/cli

# Initialize Supabase
supabase init

# Start local Supabase
supabase start

# Apply migrations
supabase db reset
```

### 5. Start Development Server
```bash
npm run dev
```

Your application should now be running at `http://localhost:3000`.

## Development Setup

### Prerequisites Installation

#### Node.js and npm
**macOS (using Homebrew):**
```bash
brew install node
```

**Ubuntu/Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Windows:**
Download from [nodejs.org](https://nodejs.org/) or use Chocolatey:
```cmd
choco install nodejs
```

#### Package Manager (pnpm recommended)
```bash
npm install -g pnpm
```

#### Supabase CLI
```bash
npm install -g @supabase/cli
```

### Project Setup

#### 1. Repository Setup
```bash
# Clone repository
git clone https://github.com/your-org/hey-peter.git
cd hey-peter

# Install dependencies
pnpm install

# Install git hooks (optional)
pnpm prepare
```

#### 2. Environment Configuration
Create `.env.local` file with required variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database
DATABASE_URL=postgresql://postgres:password@localhost:54322/postgres

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret

# Optional: Third-party Services
RESEND_API_KEY=your-resend-key
STRIPE_SECRET_KEY=your-stripe-key
UPLOADTHING_SECRET=your-uploadthing-secret
```

#### 3. Database Setup
```bash
# Start Supabase locally
supabase start

# Apply database migrations
supabase db reset

# Verify database connection
supabase status
```

#### 4. Development Server
```bash
# Start development server
npm run dev

# Alternative: Use Docker for development
npm run docker:dev
```

### IDE Configuration

#### VS Code Setup
Install recommended extensions:
```bash
# Install VS Code extensions
code --install-extension bradlc.vscode-tailwindcss
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension esbenp.prettier-vscode
code --install-extension ms-vscode.vscode-eslint
```

#### Settings Configuration
Create `.vscode/settings.json`:
```json
{
  "typescript.preferences.importModuleSpecifier": "non-relative",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

## Production Deployment

### Platform Options

#### 1. Vercel Deployment (Recommended)
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to Vercel
vercel --prod
```

**Environment Variables for Vercel:**
Add all environment variables in Vercel dashboard.

#### 2. Netlify Deployment
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy to Netlify
netlify deploy --prod
```

#### 3. Docker Deployment
```bash
# Build production image
docker build -t heypeter-academy .

# Run production container
docker run -p 3000:3000 --env-file .env.production heypeter-academy
```

#### 4. Traditional Server Deployment
```bash
# Build application
npm run build

# Start production server
npm start
```

### Supabase Production Setup

#### 1. Create Supabase Project
1. Visit [supabase.com](https://supabase.com)
2. Create new project
3. Note down project URL and API keys
4. Configure authentication providers

#### 2. Deploy Database Schema
```bash
# Link to production project
supabase link --project-ref your-project-ref

# Push migrations to production
supabase db push
```

#### 3. Configure Production Settings
```bash
# Set production environment variables
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key
```

### CDN and Performance

#### Cloudflare Setup
1. Add domain to Cloudflare
2. Enable CDN and caching
3. Configure SSL/TLS settings
4. Set up security rules

#### Image Optimization
Configure next.config.js for image optimization:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['your-supabase-project.supabase.co'],
    formats: ['image/webp', 'image/avif'],
  },
  experimental: {
    optimizeCss: true,
  },
}

module.exports = nextConfig
```

## Database Configuration

### Supabase Configuration

#### 1. Project Setup
```bash
# Initialize Supabase in your project
supabase init

# Generate TypeScript types
supabase gen types typescript --project-id your-project-id > src/types/database.ts
```

#### 2. Local Development Database
```bash
# Start local Supabase stack
supabase start

# Reset database with fresh data
supabase db reset

# Seed with sample data
supabase db seed
```

#### 3. Migration Management
```bash
# Create new migration
supabase migration new migration_name

# Apply migrations locally
supabase db reset

# Push to production
supabase db push
```

### Database Schema

#### Core Tables Structure
The database includes these main entity tables:
- `users`: Authentication and basic user information
- `students`: Student-specific profiles and academic data
- `teachers`: Teacher profiles and qualifications
- `courses`: Course definitions and requirements
- `classes`: Individual class sessions
- `bookings`: Student class reservations
- `attendance`: Class attendance records
- `hour_packages`: Student hour purchases and balances

#### Row Level Security (RLS)
All tables implement RLS policies for data security:
```sql
-- Example RLS policy for students table
CREATE POLICY "Students can view own data" ON students
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Teachers can view assigned students" ON students
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM classes c
      JOIN teachers t ON c.teacher_id = t.id
      WHERE t.user_id = auth.uid()
    )
  );
```

### Backup Configuration

#### Automated Backups
```bash
# Enable automated backups in Supabase dashboard
# Or use pg_dump for custom backups
pg_dump -h your-host -U postgres -d your-database > backup.sql
```

#### Backup Scripts
Create backup scripts for regular data protection:
```bash
#!/bin/bash
# scripts/backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${DATE}.sql"

pg_dump $DATABASE_URL > $BACKUP_FILE
gzip $BACKUP_FILE

# Upload to cloud storage
aws s3 cp ${BACKUP_FILE}.gz s3://your-backup-bucket/
```

## Environment Variables

### Required Variables

#### Core Application
```env
# Application URL
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Authentication
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-nextauth-secret
```

#### Optional Services
```env
# Email Service (Resend)
RESEND_API_KEY=re_your-api-key

# Payment Processing (Stripe)
STRIPE_PUBLISHABLE_KEY=pk_your-key
STRIPE_SECRET_KEY=sk_your-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# File Upload (UploadThing)
UPLOADTHING_SECRET=sk_your-secret
UPLOADTHING_APP_ID=your-app-id

# Analytics
GOOGLE_ANALYTICS_ID=GA_your-id
POSTHOG_KEY=phc_your-key

# Error Tracking (Sentry)
SENTRY_DSN=https://your-dsn@sentry.io/project-id

# Feature Flags
FEATURE_FLAG_ANALYTICS=true
FEATURE_FLAG_CHAT=false
```

### Environment-Specific Configuration

#### Development (.env.local)
```env
NODE_ENV=development
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
```

#### Staging (.env.staging)
```env
NODE_ENV=staging
NEXT_PUBLIC_SUPABASE_URL=https://staging-project.supabase.co
DATABASE_URL=postgresql://staging-connection-string
```

#### Production (.env.production)
```env
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=https://production-project.supabase.co
DATABASE_URL=postgresql://production-connection-string
```

## Docker Setup

### Development with Docker

#### Docker Compose for Development
```yaml
# docker-compose.dev.yml
version: '3.8'
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
    env_file:
      - .env.local

  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: heypeter
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

#### Development Commands
```bash
# Start development environment
npm run docker:dev

# View logs
npm run docker:logs

# Stop containers
npm run docker:stop

# Rebuild containers
npm run docker:build
```

### Production Docker Setup

#### Production Dockerfile
```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

#### Production Deployment
```bash
# Build production image
docker build -t heypeter-academy:latest .

# Run production container
docker run -d \
  --name heypeter-academy \
  -p 3000:3000 \
  --env-file .env.production \
  heypeter-academy:latest
```

## Security Configuration

### Authentication Security

#### JWT Configuration
```env
# Use strong secrets
NEXTAUTH_SECRET=your-very-long-random-secret-at-least-32-characters
SUPABASE_JWT_SECRET=your-supabase-jwt-secret
```

#### Session Security
```javascript
// lib/auth-config.js
export const authConfig = {
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  cookies: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
  },
}
```

### HTTPS and SSL

#### SSL Certificate Setup
```bash
# Using Certbot for Let's Encrypt
sudo certbot --nginx -d your-domain.com

# Or using Cloudflare for SSL termination
# Configure Cloudflare SSL settings in dashboard
```

#### NGINX Configuration
```nginx
# /etc/nginx/sites-available/heypeter-academy
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

### Security Headers

#### Next.js Security Headers
```javascript
// next.config.js
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  }
]

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}
```

### Rate Limiting

#### API Rate Limiting
```javascript
// middleware.js
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 h'),
})

export async function middleware(request) {
  const ip = request.ip ?? '127.0.0.1'
  const { success } = await ratelimit.limit(ip)

  if (!success) {
    return new Response('Rate limit exceeded', { status: 429 })
  }

  return NextResponse.next()
}
```

## Performance Optimization

### Build Optimization

#### Next.js Configuration
```javascript
// next.config.js
const nextConfig = {
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },
  swcMinify: true,
}
```

#### Bundle Analysis
```bash
# Analyze bundle size
npm run build:analyze

# View bundle analyzer
npm run bundle:analyze
```

### Database Optimization

#### Connection Pooling
```javascript
// lib/db.js
import { createPool } from '@vercel/postgres'

const pool = createPool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})
```

#### Query Optimization
```sql
-- Add indexes for common queries
CREATE INDEX CONCURRENTLY idx_bookings_student_id ON bookings(student_id);
CREATE INDEX CONCURRENTLY idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX CONCURRENTLY idx_attendance_booking_id ON attendance(booking_id);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM bookings WHERE student_id = $1;
```

### Caching Strategy

#### Application Caching
```javascript
// lib/cache.js
import { unstable_cache } from 'next/cache'

export const getCachedUserProfile = unstable_cache(
  async (userId) => {
    return await getUserProfile(userId)
  },
  ['user-profile'],
  {
    revalidate: 3600, // 1 hour
    tags: ['user']
  }
)
```

#### CDN Configuration
```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=300'
          }
        ]
      }
    ]
  }
}
```

## Monitoring & Logging

### Application Monitoring

#### Sentry Integration
```javascript
// sentry.client.config.js
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  debug: false,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  integrations: [
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
})
```

#### Custom Logging
```javascript
// lib/logger.js
import winston from 'winston'

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'heypeter-academy' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
})

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }))
}

export default logger
```

### Health Checks

#### Application Health Endpoint
```javascript
// app/api/health/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = createClient()
    const { error } = await supabase.from('users').select('count').limit(1)
    
    if (error) throw error

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'healthy',
        auth: 'healthy'
      }
    })
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error.message
    }, { status: 500 })
  }
}
```

### Performance Monitoring

#### Web Vitals Tracking
```javascript
// pages/_app.js
export function reportWebVitals(metric) {
  if (process.env.NODE_ENV === 'production') {
    // Send to analytics service
    analytics.track('Web Vitals', {
      name: metric.name,
      value: metric.value,
      id: metric.id,
    })
  }
}
```

## Backup & Recovery

### Database Backup

#### Automated Backup Script
```bash
#!/bin/bash
# scripts/backup-database.sh

set -e

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
BACKUP_FILE="$BACKUP_DIR/heypeter_backup_$DATE.sql"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Create database backup
pg_dump $DATABASE_URL > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Upload to cloud storage (optional)
if [ ! -z "$AWS_S3_BUCKET" ]; then
    aws s3 cp ${BACKUP_FILE}.gz s3://$AWS_S3_BUCKET/backups/
fi

# Keep only last 30 days of backups
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

echo "Backup completed: ${BACKUP_FILE}.gz"
```

#### Scheduled Backups
```bash
# Add to crontab for daily backups at 2 AM
0 2 * * * /path/to/scripts/backup-database.sh
```

### File Backup

#### Application Files Backup
```bash
#!/bin/bash
# scripts/backup-files.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
APP_DIR="/app"

# Create tarball of application files
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=.git \
  $APP_DIR

echo "Application backup completed: app_backup_$DATE.tar.gz"
```

### Recovery Procedures

#### Database Recovery
```bash
# Restore from backup
gunzip backup_file.sql.gz
psql $DATABASE_URL < backup_file.sql

# Or restore specific tables
pg_restore -d $DATABASE_URL -t users backup_file.sql
```

#### Application Recovery
```bash
# Extract application backup
tar -xzf app_backup_20240120_020000.tar.gz

# Restore dependencies
npm install

# Restart application
npm run build
npm start
```

## Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check database connectivity
supabase status

# Test direct connection
psql $DATABASE_URL -c "SELECT version();"

# Check for connection limits
SELECT count(*) FROM pg_stat_activity;
```

#### Build Failures
```bash
# Clear Next.js cache
rm -rf .next

# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for TypeScript errors
npx tsc --noEmit
```

#### Performance Issues
```bash
# Analyze bundle size
npm run build:analyze

# Check for memory leaks
node --inspect-brk server.js

# Monitor process usage
top -p $(pgrep node)
```

### Debugging Tools

#### Development Debugging
```javascript
// Enable verbose logging
DEBUG=* npm run dev

// Use Node.js inspector
node --inspect-brk=0.0.0.0:9229 server.js
```

#### Production Debugging
```javascript
// Enable production debugging (use carefully)
NODE_OPTIONS="--inspect" npm start

// Check application logs
tail -f /var/log/heypeter-academy/app.log
```

### Support Resources

#### Getting Help
- **Documentation**: Check this guide and API documentation
- **GitHub Issues**: Report bugs and request features
- **Community Forum**: Get help from other developers
- **Support Email**: technical-support@heypeter-academy.com

#### Emergency Procedures
1. **Critical Issues**: Contact emergency support
2. **Data Loss**: Follow recovery procedures immediately
3. **Security Incidents**: Follow security incident response plan
4. **Service Outage**: Check status page and implement fallback procedures

---

*This installation guide is regularly updated. Always refer to the latest version for accurate installation procedures.*