# Environment Configuration Guide - HeyPeter Academy LMS

This guide provides comprehensive documentation for configuring environment variables and settings across different deployment environments.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Environment Variables Reference](#environment-variables-reference)
3. [Environment-Specific Configurations](#environment-specific-configurations)
4. [Secrets Management](#secrets-management)
5. [Configuration Best Practices](#configuration-best-practices)
6. [Validation & Testing](#validation--testing)
7. [Troubleshooting](#troubleshooting)

## 🎯 Overview

HeyPeter Academy LMS uses environment variables to manage configuration across different deployment environments. This approach provides:

- **Security**: Sensitive data kept out of code
- **Flexibility**: Easy configuration changes
- **Portability**: Same code runs everywhere
- **Clarity**: Clear separation of concerns

### Configuration Hierarchy

```
1. Default values (in code)
2. .env files (local development)
3. Environment variables (deployment)
4. Runtime configuration (dynamic)
```

## 🔧 Environment Variables Reference

### Core Configuration

#### Application Settings

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `NODE_ENV` | Application environment | Yes | development | `production` |
| `PORT` | Server port | No | 3000 | `3000` |
| `HOSTNAME` | Server hostname | No | localhost | `0.0.0.0` |
| `NEXT_PUBLIC_APP_URL` | Public application URL | Yes | - | `https://heypeter-academy.com` |
| `NEXTAUTH_URL` | NextAuth callback URL | Yes | - | `https://heypeter-academy.com` |
| `NEXTAUTH_SECRET` | NextAuth encryption secret | Yes | - | `generate-with-openssl` |

#### Supabase Configuration

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes | - | `https://abc.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes | - | `eyJhbGc...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes | - | `eyJhbGc...` |
| `DATABASE_URL` | PostgreSQL connection string | Yes | - | `postgresql://...` |
| `SUPABASE_DB_PASSWORD` | Database password | Yes | - | `secure-password` |

#### Email Configuration

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `MAILGUN_API_KEY` | Mailgun API key | Yes | - | `key-abc123...` |
| `MAILGUN_DOMAIN` | Mailgun domain | Yes | - | `mg.heypeter.com` |
| `NEXT_PUBLIC_MAILGUN_DOMAIN` | Public Mailgun domain | Yes | - | `mg.heypeter.com` |
| `EMAIL_FROM` | Default from address | No | noreply@heypeter.com | `hello@heypeter.com` |
| `EMAIL_TEST_MODE` | Test mode flag | No | false | `true` |

### Feature Flags

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `ENABLE_ANALYTICS` | Enable analytics tracking | No | true | `false` |
| `ENABLE_DEBUG_LOGGING` | Enable debug logs | No | false | `true` |
| `ENABLE_MAINTENANCE_MODE` | Enable maintenance mode | No | false | `true` |
| `ENABLE_BETA_FEATURES` | Enable beta features | No | false | `true` |
| `ENABLE_RATE_LIMITING` | Enable API rate limiting | No | true | `false` |

### External Services

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `STRIPE_PUBLIC_KEY` | Stripe publishable key | No | - | `pk_live_...` |
| `STRIPE_SECRET_KEY` | Stripe secret key | No | - | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | No | - | `whsec_...` |
| `SENTRY_DSN` | Sentry error tracking DSN | No | - | `https://...@sentry.io/...` |
| `VERCEL_ANALYTICS_ID` | Vercel Analytics ID | No | - | `abc123` |
| `GOOGLE_ANALYTICS_ID` | Google Analytics ID | No | - | `G-XXXXXXX` |

### Performance & Scaling

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `REDIS_URL` | Redis connection URL | No | - | `redis://localhost:6379` |
| `REDIS_PASSWORD` | Redis password | No | - | `secure-password` |
| `CACHE_TTL` | Cache time-to-live (seconds) | No | 3600 | `7200` |
| `MAX_CONNECTIONS` | Max database connections | No | 20 | `50` |
| `RATE_LIMIT_MAX` | Max requests per window | No | 100 | `50` |
| `RATE_LIMIT_WINDOW` | Rate limit window (ms) | No | 900000 | `60000` |

### Security Configuration

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `SESSION_TIMEOUT` | Session timeout (minutes) | No | 30 | `60` |
| `JWT_EXPIRY` | JWT token expiry | No | 7d | `30d` |
| `ALLOWED_ORIGINS` | CORS allowed origins | No | * | `https://heypeter.com` |
| `CSP_DIRECTIVES` | Content Security Policy | No | - | `default-src 'self'` |
| `ENABLE_HTTPS_REDIRECT` | Force HTTPS redirect | No | true | `false` |

## 🌍 Environment-Specific Configurations

### Development Environment

```bash
# .env.development
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Use local Supabase
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...local
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres

# Development features
ENABLE_DEBUG_LOGGING=true
ENABLE_BETA_FEATURES=true
EMAIL_TEST_MODE=true

# Disable production features
ENABLE_RATE_LIMITING=false
ENABLE_HTTPS_REDIRECT=false
```

### Staging Environment

```bash
# .env.staging
NODE_ENV=staging
NEXT_PUBLIC_APP_URL=https://staging.heypeter-academy.com

# Staging Supabase project
NEXT_PUBLIC_SUPABASE_URL=https://staging-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...staging
DATABASE_URL=postgresql://postgres:password@db:5432/heypeter_staging

# Staging features
ENABLE_DEBUG_LOGGING=true
ENABLE_MAINTENANCE_MODE=false
EMAIL_TEST_MODE=true

# Test payment providers
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

### Production Environment

```bash
# .env.production
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://heypeter-academy.com

# Production Supabase project
NEXT_PUBLIC_SUPABASE_URL=https://production-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...prod
DATABASE_URL=postgresql://postgres:secure-password@db:5432/heypeter_prod

# Production features
ENABLE_DEBUG_LOGGING=false
ENABLE_ANALYTICS=true
EMAIL_TEST_MODE=false

# Live payment providers
STRIPE_PUBLIC_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...

# Performance
REDIS_URL=redis://redis-cluster:6379
CACHE_TTL=7200
MAX_CONNECTIONS=100
```

## 🔐 Secrets Management

### Using Environment Files

```bash
# Create environment file
cp .env.example .env.local

# Set permissions (important!)
chmod 600 .env.local

# Add to .gitignore
echo ".env.local" >> .gitignore
```

### Using Secret Managers

#### AWS Secrets Manager

```bash
# Store secrets
aws secretsmanager create-secret \
  --name heypeter/production \
  --secret-string file://secrets.json

# Retrieve secrets
aws secretsmanager get-secret-value \
  --secret-id heypeter/production \
  --query SecretString \
  --output text
```

#### HashiCorp Vault

```bash
# Store secrets
vault kv put secret/heypeter/production \
  SUPABASE_SERVICE_ROLE_KEY=xxx \
  DATABASE_PASSWORD=yyy

# Retrieve secrets
vault kv get -format=json secret/heypeter/production
```

#### Kubernetes Secrets

```yaml
# k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: heypeter-secrets
type: Opaque
stringData:
  NEXT_PUBLIC_SUPABASE_URL: https://xxx.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY: eyJhbGc...
  SUPABASE_SERVICE_ROLE_KEY: eyJhbGc...
```

### Vercel Environment Variables

```bash
# Add via CLI
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production

# Import from file
vercel env pull .env.production

# List all variables
vercel env ls
```

## 📏 Configuration Best Practices

### 1. Naming Conventions

```bash
# Public variables (exposed to client)
NEXT_PUBLIC_APP_NAME=HeyPeter Academy
NEXT_PUBLIC_API_URL=https://api.heypeter.com

# Server-only variables
DATABASE_URL=postgresql://...
API_SECRET_KEY=secret-key

# Feature flags
ENABLE_FEATURE_NAME=true
DISABLE_LEGACY_API=false
```

### 2. Validation

```typescript
// lib/config.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().url(),
  PORT: z.string().regex(/^\d+$/).transform(Number).optional(),
});

export const config = envSchema.parse(process.env);
```

### 3. Type Safety

```typescript
// types/env.d.ts
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'staging' | 'production';
      NEXT_PUBLIC_SUPABASE_URL: string;
      NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
      SUPABASE_SERVICE_ROLE_KEY: string;
      DATABASE_URL: string;
      PORT?: string;
    }
  }
}

export {};
```

### 4. Default Values

```typescript
// lib/constants.ts
export const config = {
  port: process.env.PORT || 3000,
  cacheTime: process.env.CACHE_TTL || 3600,
  rateLimitMax: process.env.RATE_LIMIT_MAX || 100,
  sessionTimeout: process.env.SESSION_TIMEOUT || 30,
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  isTest: process.env.NODE_ENV === 'test',
};
```

### 5. Configuration Loading

```typescript
// lib/load-config.ts
export async function loadConfig() {
  // Load from environment
  const config = { ...process.env };
  
  // Load from secrets manager (if configured)
  if (process.env.USE_SECRETS_MANAGER) {
    const secrets = await loadFromSecretsManager();
    Object.assign(config, secrets);
  }
  
  // Validate configuration
  validateConfig(config);
  
  return config;
}
```

## ✅ Validation & Testing

### Environment Validation Script

```bash
#!/bin/bash
# scripts/validate-env.sh

set -euo pipefail

# Required variables
REQUIRED_VARS=(
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
  "DATABASE_URL"
  "NEXTAUTH_SECRET"
)

# Check each variable
echo "Validating environment variables..."
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var:-}" ]; then
    MISSING_VARS+=("$var")
    echo "❌ $var is not set"
  else
    echo "✅ $var is set"
  fi
done

# Check variable formats
if [[ -n "${DATABASE_URL:-}" ]]; then
  if [[ ! "$DATABASE_URL" =~ ^postgresql:// ]]; then
    echo "❌ DATABASE_URL must start with postgresql://"
    exit 1
  fi
fi

if [[ -n "${NEXT_PUBLIC_SUPABASE_URL:-}" ]]; then
  if [[ ! "$NEXT_PUBLIC_SUPABASE_URL" =~ ^https?:// ]]; then
    echo "❌ NEXT_PUBLIC_SUPABASE_URL must be a valid URL"
    exit 1
  fi
fi

# Summary
if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  echo ""
  echo "❌ Missing required environment variables:"
  printf '%s\n' "${MISSING_VARS[@]}"
  exit 1
else
  echo ""
  echo "✅ All required environment variables are set!"
fi
```

### Testing Configuration

```typescript
// tests/config.test.ts
describe('Configuration', () => {
  it('should load all required environment variables', () => {
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeDefined();
    expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeDefined();
    expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBeDefined();
  });
  
  it('should have valid URLs', () => {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
    expect(url.protocol).toMatch(/^https?:$/);
  });
  
  it('should set appropriate defaults', () => {
    expect(config.port).toBe(3000);
    expect(config.cacheTime).toBe(3600);
  });
});
```

## 🔧 Troubleshooting

### Common Issues

#### Environment Variables Not Loading

```bash
# Check if .env file exists
ls -la .env*

# Check file permissions
chmod 600 .env.local

# Debug loading
node -e "console.log(require('dotenv').config())"

# Check current environment
env | grep NEXT_PUBLIC
```

#### Variable Not Available in Browser

```javascript
// Only NEXT_PUBLIC_ variables are exposed to browser
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL); // ✅ Works
console.log(process.env.DATABASE_URL); // ❌ Undefined
```

#### Build-Time vs Runtime

```javascript
// Build-time (replaced during build)
const url = process.env.NEXT_PUBLIC_API_URL;

// Runtime (use publicRuntimeConfig)
// next.config.js
module.exports = {
  publicRuntimeConfig: {
    apiUrl: process.env.API_URL
  }
};

// Usage
import getConfig from 'next/config';
const { publicRuntimeConfig } = getConfig();
const apiUrl = publicRuntimeConfig.apiUrl;
```

### Debug Commands

```bash
# Print all environment variables
env | sort

# Check specific variable
echo $NEXT_PUBLIC_SUPABASE_URL

# Test database connection
psql $DATABASE_URL -c "SELECT 1"

# Test Supabase connection
curl -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  $NEXT_PUBLIC_SUPABASE_URL/rest/v1/

# Validate configuration
npm run validate:env
```

## 📚 Configuration Templates

### Minimal Configuration

```bash
# Absolute minimum to run the application
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
NEXTAUTH_SECRET=xxx
```

### Standard Configuration

```bash
# Recommended for most deployments
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://heypeter-academy.com

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
DATABASE_URL=postgresql://xxx

# Authentication
NEXTAUTH_SECRET=xxx
NEXTAUTH_URL=https://heypeter-academy.com

# Email
MAILGUN_API_KEY=xxx
MAILGUN_DOMAIN=mg.heypeter.com
EMAIL_FROM=hello@heypeter.com

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
```

### Full Configuration

See `.env.example` for complete configuration template with all available options.

## 🔗 Related Documentation

- [Quick Start Guide](quick-start.md)
- [Production Deployment](production-deployment.md)
- [Secrets Management](../security/secrets-management.md)
- [Monitoring Setup](../monitoring/setup.md)

---

*Last updated: January 2025*