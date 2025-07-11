# Production Environment Configuration & Secrets Management

## Environment Variables

### Application Configuration

```bash
# Next.js Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://app.heypeteracademy.com
NEXT_PUBLIC_API_URL=https://api.heypeteracademy.com

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://rgqcbsjucvpffyajrjrc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[REDACTED - Store in Secret Manager]
SUPABASE_SERVICE_ROLE_KEY=[REDACTED - Store in Secret Manager]
SUPABASE_JWT_SECRET=[REDACTED - Store in Secret Manager]

# Database Configuration
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.rgqcbsjucvpffyajrjrc.supabase.co:5432/postgres
DATABASE_POOL_SIZE=50
DATABASE_MAX_CONNECTIONS=100
DATABASE_IDLE_TIMEOUT=30000
DATABASE_CONNECTION_TIMEOUT=5000

# Redis Configuration (for caching/sessions)
REDIS_URL=redis://:[PASSWORD]@redis-prod.heypeter.com:6379
REDIS_MAX_RETRIES=3
REDIS_RETRY_DELAY=1000

# Email Configuration
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=[REDACTED - Store in Secret Manager]
EMAIL_FROM=noreply@heypeteracademy.com
EMAIL_REPLY_TO=support@heypeteracademy.com

# Storage Configuration
STORAGE_BUCKET=heypeter-academy-prod
STORAGE_REGION=us-east-1
AWS_ACCESS_KEY_ID=[REDACTED - Store in Secret Manager]
AWS_SECRET_ACCESS_KEY=[REDACTED - Store in Secret Manager]

# Monitoring & Analytics
SENTRY_DSN=[REDACTED - Store in Secret Manager]
SENTRY_ENVIRONMENT=production
GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
MIXPANEL_TOKEN=[REDACTED - Store in Secret Manager]

# Feature Flags
ENABLE_AI_SCHEDULING=true
ENABLE_VIDEO_CALLS=true
ENABLE_PAYMENT_GATEWAY=true
ENABLE_NOTIFICATIONS=true
MAINTENANCE_MODE=false

# Security
SESSION_SECRET=[REDACTED - Store in Secret Manager]
ENCRYPTION_KEY=[REDACTED - Store in Secret Manager]
CSRF_SECRET=[REDACTED - Store in Secret Manager]
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=100

# Third-party Integrations
STRIPE_PUBLIC_KEY=pk_live_[REDACTED]
STRIPE_SECRET_KEY=[REDACTED - Store in Secret Manager]
STRIPE_WEBHOOK_SECRET=[REDACTED - Store in Secret Manager]
ZOOM_API_KEY=[REDACTED - Store in Secret Manager]
ZOOM_API_SECRET=[REDACTED - Store in Secret Manager]
TWILIO_ACCOUNT_SID=[REDACTED - Store in Secret Manager]
TWILIO_AUTH_TOKEN=[REDACTED - Store in Secret Manager]
TWILIO_PHONE_NUMBER=+1234567890
```

## Secrets Management Strategy

### 1. Secret Storage Solutions

#### AWS Secrets Manager (Recommended)
```javascript
// Example: Retrieving secrets in Node.js
const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager({
  region: 'us-east-1'
});

async function getSecret(secretName) {
  try {
    const data = await secretsManager.getSecretValue({ 
      SecretId: secretName 
    }).promise();
    
    return JSON.parse(data.SecretString);
  } catch (error) {
    console.error('Error retrieving secret:', error);
    throw error;
  }
}
```

#### HashiCorp Vault (Alternative)
```bash
# Store secret
vault kv put secret/heypeter/prod/supabase \
  anon_key="your-anon-key" \
  service_role_key="your-service-role-key"

# Retrieve secret
vault kv get -format=json secret/heypeter/prod/supabase
```

### 2. Secret Categories

#### Critical Secrets (Highest Protection)
- Database credentials
- Service role keys
- Encryption keys
- Payment gateway keys
- JWT secrets

#### Important Secrets (High Protection)
- API keys for third-party services
- SMTP credentials
- OAuth client secrets
- Webhook secrets

#### Configuration Secrets (Standard Protection)
- Analytics tokens
- CDN keys
- Non-critical API keys

### 3. Secret Rotation Policy

#### Automatic Rotation (30 days)
- Database passwords
- Service account keys
- JWT secrets
- Session secrets

#### Manual Rotation (90 days)
- API keys
- OAuth secrets
- Encryption keys

#### Event-Based Rotation
- On security incidents
- On employee departure
- On vendor changes

### 4. Access Control

#### Development Team
- Read access to development secrets
- No access to production secrets
- Temporary access via approval workflow

#### Operations Team
- Read access to all secrets
- Write access to operational secrets
- Audit trail for all access

#### CI/CD Pipeline
- Read-only access to deployment secrets
- Time-limited tokens
- Specific secret access per environment

## Production Server Configuration

### 1. Web Server (Nginx)

```nginx
# /etc/nginx/sites-available/heypeter-academy
server {
    listen 80;
    server_name app.heypeteracademy.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.heypeteracademy.com;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/heypeter-academy.crt;
    ssl_certificate_key /etc/ssl/private/heypeter-academy.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google-analytics.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://rgqcbsjucvpffyajrjrc.supabase.co wss://rgqcbsjucvpffyajrjrc.supabase.co;" always;

    # Proxy Configuration
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files
    location /_next/static {
        alias /var/www/heypeter-academy/.next/static;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    location /api {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:3000;
    }
}
```

### 2. Process Manager (PM2)

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'heypeter-academy',
    script: 'npm',
    args: 'start',
    instances: 4,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/heypeter/error.log',
    out_file: '/var/log/heypeter/out.log',
    log_file: '/var/log/heypeter/combined.log',
    time: true,
    max_memory_restart: '1G',
    restart_delay: 5000,
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

### 3. Database Connection Pool

```javascript
// lib/db-config.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 50, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: {
    rejectUnauthorized: false
  }
});

// Connection retry logic
pool.on('error', (err, client) => {
  console.error('Unexpected database error:', err);
  // Implement reconnection logic
});
```

### 4. Redis Configuration

```conf
# /etc/redis/redis.conf
bind 127.0.0.1
protected-mode yes
port 6379
tcp-backlog 511
timeout 0
tcp-keepalive 300

# Persistence
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb

# Limits
maxclients 10000
maxmemory 2gb
maxmemory-policy allkeys-lru

# Security
requirepass your-redis-password
```

## Security Best Practices

### 1. Environment Variable Security
- Never commit secrets to version control
- Use `.env.production.local` for local testing
- Rotate secrets regularly
- Use strong, unique passwords

### 2. Network Security
- Use VPC for internal communication
- Implement IP whitelisting
- Enable WAF for DDoS protection
- Use private subnets for databases

### 3. Application Security
- Enable HTTPS everywhere
- Implement CSRF protection
- Use secure session management
- Regular security audits

### 4. Monitoring & Alerting
- Monitor secret access
- Alert on unauthorized access
- Track secret rotation
- Audit trail for all changes

## Deployment Script

```bash
#!/bin/bash
# deploy-production.sh

set -e

echo "Loading production secrets..."
source /opt/secrets/load-secrets.sh

echo "Building application..."
npm run build

echo "Running database migrations..."
npm run migrate:production

echo "Deploying application..."
pm2 reload ecosystem.config.js --env production

echo "Clearing CDN cache..."
aws cloudfront create-invalidation --distribution-id $CDN_DISTRIBUTION_ID --paths "/*"

echo "Deployment complete!"
```

## Emergency Access Procedures

### Break-Glass Access
1. Request approval from 2 senior team members
2. Access granted for maximum 4 hours
3. All actions are logged
4. Automatic secret rotation after access
5. Post-incident review required

### Secret Recovery
1. Backup secrets stored in separate location
2. Recovery requires 2-person authorization
3. Test recovery procedures monthly
4. Document all recovery attempts