# Emergency Rollback Procedures

## Overview
This document provides step-by-step procedures for rolling back the HeyPeter Academy LMS in case of critical issues during or after deployment. These procedures are designed to minimize downtime and data loss while restoring service quickly.

## Rollback Decision Matrix

| Scenario | Severity | Rollback Type | Max Decision Time | Authority |
|----------|----------|---------------|-------------------|-----------|
| Complete service outage | Critical | Full rollback | 5 minutes | On-call Engineer |
| Data corruption | Critical | Database rollback | 10 minutes | Tech Lead |
| Performance < 50% baseline | High | Application rollback | 15 minutes | Tech Lead |
| Major feature broken | High | Feature flag disable | 10 minutes | On-call Engineer |
| Payment processing failure | Critical | Service rollback | 5 minutes | Tech Lead |
| Security vulnerability | Critical | Immediate rollback | 0 minutes | Any Engineer |

## Pre-Rollback Checklist

Before initiating any rollback:

1. **Document the Issue**
   ```bash
   # Create incident record
   ./scripts/create-incident.sh \
     --severity=critical \
     --description="Brief description of issue" \
     --affected-systems="list of affected components"
   ```

2. **Notify Stakeholders**
   ```bash
   # Send emergency notification
   ./scripts/notify-emergency.sh \
     --channels="slack,pagerduty,email" \
     --message="Initiating emergency rollback due to [ISSUE]"
   ```

3. **Capture Current State**
   ```bash
   # Take snapshot of current state
   ./scripts/capture-state.sh \
     --output=/var/rollback/state-$(date +%Y%m%d-%H%M%S).tar.gz
   ```

## Rollback Procedures

### 1. Application Rollback (Code Only)

**Time Required**: 5-10 minutes
**Data Loss Risk**: None

#### Step 1: Enable Maintenance Mode
```bash
# Enable maintenance mode
curl -X POST https://app.heypeteracademy.com/api/admin/maintenance \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d '{"enabled": true, "message": "Emergency maintenance - Service will resume shortly"}'

# Verify maintenance mode
curl https://app.heypeteracademy.com/health
```

#### Step 2: Stop Current Application
```bash
# Stop PM2 processes
pm2 stop heypeter-academy

# Verify processes stopped
pm2 status

# Kill any remaining Node processes
pkill -f "node.*heypeter"
```

#### Step 3: Rollback to Previous Version
```bash
# Using Git tags (recommended)
cd /var/www/heypeter-academy
git fetch --tags
git checkout $(git tag | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | sort -V | tail -2 | head -1)

# Or using specific commit
git checkout <previous-commit-hash>

# Install dependencies
npm ci

# Build application
npm run build
```

#### Step 4: Restart Application
```bash
# Start application
pm2 start ecosystem.config.js --env production

# Verify application is running
pm2 status
curl -I https://app.heypeteracademy.com/health
```

#### Step 5: Disable Maintenance Mode
```bash
# Disable maintenance mode
curl -X POST https://app.heypeteracademy.com/api/admin/maintenance \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d '{"enabled": false}'

# Run smoke tests
npm run test:smoke
```

### 2. Database Rollback

**Time Required**: 15-30 minutes
**Data Loss Risk**: High - Loss of data since backup point

#### Step 1: Stop All Connections
```bash
# Enable maintenance mode (as above)

# Stop application servers
pm2 stop all

# Terminate all database connections
psql ${DATABASE_URL} -c "
  SELECT pg_terminate_backend(pg_stat_activity.pid)
  FROM pg_stat_activity
  WHERE pg_stat_activity.datname = 'heypeter_academy'
    AND pid <> pg_backend_pid();
"
```

#### Step 2: Backup Current State
```bash
# Create emergency backup of current state
pg_dump ${DATABASE_URL} \
  --file=/var/backups/emergency/rollback_$(date +%Y%m%d_%H%M%S).sql \
  --verbose

# Compress backup
gzip /var/backups/emergency/rollback_*.sql
```

#### Step 3: Identify Rollback Point
```bash
# List available backups
aws s3 ls s3://heypeter-academy-backups/daily/ \
  --recursive \
  | grep -E '\.sql\.gz$' \
  | sort -r \
  | head -10

# Or use Supabase point-in-time recovery
supabase db backups list
```

#### Step 4: Restore Database
```bash
# For full backup restore
gunzip -c backup_file.sql.gz | psql ${DATABASE_URL}

# For Supabase point-in-time recovery
supabase db restore --backup-id <backup-id>

# For specific time recovery
supabase db restore --timestamp "2025-01-10 14:00:00"
```

#### Step 5: Validate and Resume
```bash
# Run integrity checks
psql ${DATABASE_URL} < /var/scripts/integrity-check.sql

# Start application
pm2 start ecosystem.config.js --env production

# Disable maintenance mode
curl -X POST https://app.heypeteracademy.com/api/admin/maintenance \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d '{"enabled": false}'
```

### 3. Infrastructure Rollback (Docker)

**Time Required**: 10-15 minutes
**Data Loss Risk**: None

#### Step 1: Identify Previous Image
```bash
# List available images
docker images | grep heypeter-academy

# Get previous deployment tag
PREVIOUS_TAG=$(docker images | grep heypeter-academy | awk '{print $2}' | sort -V | tail -2 | head -1)
echo "Rolling back to: $PREVIOUS_TAG"
```

#### Step 2: Update Docker Compose
```bash
# Backup current compose file
cp docker-compose.yml docker-compose.yml.backup

# Update image tag
sed -i "s/heypeter-academy:.*/heypeter-academy:${PREVIOUS_TAG}/" docker-compose.yml
```

#### Step 3: Rollback Containers
```bash
# Stop current containers
docker-compose down

# Start with previous version
docker-compose up -d

# Verify containers are running
docker-compose ps

# Check logs
docker-compose logs -f --tail=100
```

### 4. Feature Flag Rollback

**Time Required**: < 5 minutes
**Data Loss Risk**: None

#### Using Environment Variables
```bash
# Disable problematic feature
export ENABLE_NEW_FEATURE=false

# Restart application
pm2 restart heypeter-academy --update-env
```

#### Using Database Flags
```sql
-- Disable feature in database
UPDATE feature_flags 
SET enabled = false, 
    updated_at = NOW(),
    updated_by = 'emergency_rollback'
WHERE flag_name = 'problematic_feature';

-- Log the change
INSERT INTO audit_logs (action, details, created_by)
VALUES ('feature_flag_disabled', 
        '{"flag": "problematic_feature", "reason": "emergency_rollback"}',
        'system');
```

### 5. CDN/Static Asset Rollback

**Time Required**: 5-10 minutes
**Data Loss Risk**: None

```bash
# Invalidate CDN cache
aws cloudfront create-invalidation \
  --distribution-id ${CDN_DISTRIBUTION_ID} \
  --paths "/*"

# Rollback S3 static assets
aws s3 sync s3://heypeter-academy-assets/previous/ s3://heypeter-academy-assets/current/ \
  --delete

# Update asset version in application
echo "ASSET_VERSION=${PREVIOUS_VERSION}" >> .env.production
pm2 restart heypeter-academy --update-env
```

## Rollback Verification

### 1. Automated Health Checks
```bash
#!/bin/bash
# scripts/verify-rollback.sh

echo "Running rollback verification..."

# Check application health
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://app.heypeteracademy.com/health)
if [ $HTTP_STATUS -ne 200 ]; then
  echo "❌ Application health check failed: $HTTP_STATUS"
  exit 1
fi

# Check database connectivity
psql ${DATABASE_URL} -c "SELECT 1" > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "❌ Database connection failed"
  exit 1
fi

# Check critical endpoints
ENDPOINTS=(
  "/api/auth/session"
  "/api/students"
  "/api/classes"
  "/api/payments/health"
)

for endpoint in "${ENDPOINTS[@]}"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://app.heypeteracademy.com${endpoint})
  if [ $STATUS -ne 200 ] && [ $STATUS -ne 401 ]; then
    echo "❌ Endpoint check failed: $endpoint returned $STATUS"
    exit 1
  fi
done

echo "✅ All verification checks passed"
```

### 2. Manual Verification Checklist
- [ ] Login functionality working
- [ ] Student dashboard accessible
- [ ] Teacher portal functional
- [ ] Admin panel accessible
- [ ] Class booking working
- [ ] Payment processing active
- [ ] Email notifications sending
- [ ] File uploads working
- [ ] Real-time features active

## Post-Rollback Actions

### 1. Immediate Actions (0-1 hour)
```bash
# Monitor error rates
watch -n 5 'tail -20 /var/log/heypeter/error.log'

# Check system metrics
./scripts/check-metrics.sh --duration=1h

# Monitor user reports
./scripts/monitor-support-tickets.sh --priority=high
```

### 2. Short-term Actions (1-24 hours)
- Conduct root cause analysis
- Document timeline of events
- Update rollback procedures if needed
- Communicate with affected users
- Plan fix for rolled-back issue

### 3. Long-term Actions (1-7 days)
- Complete incident report
- Hold blameless post-mortem
- Update monitoring alerts
- Improve deployment procedures
- Train team on lessons learned

## Rollback Communication Templates

### Internal Communication
```
Subject: [URGENT] Production Rollback Initiated

Team,

We have initiated an emergency rollback due to [ISSUE DESCRIPTION].

Status: [In Progress/Complete]
Impact: [Description of user impact]
ETA: [Estimated resolution time]

Actions Required:
- [List any immediate actions needed from team]

Incident Commander: [Name]
War Room: [Link/Location]

Updates will be posted every 15 minutes in #incident-response
```

### Customer Communication
```
Subject: Service Interruption Notice

Dear HeyPeter Academy Users,

We are currently experiencing technical difficulties with our platform. 
Our team is actively working to resolve the issue.

Current Status: Under maintenance
Estimated Resolution: [Time]

What you can expect:
- Your data is safe and secure
- Classes scheduled during this time will be automatically rescheduled
- No charges will be processed during the maintenance window

We apologize for any inconvenience and appreciate your patience.

For urgent matters, please contact: emergency@heypeteracademy.com

Thank you,
HeyPeter Academy Team
```

## Emergency Contacts

### Technical Team
| Role | Name | Phone | Email | Availability |
|------|------|-------|-------|-------------|
| Tech Lead | [Name] | [Phone] | [Email] | 24/7 |
| DevOps Lead | [Name] | [Phone] | [Email] | 24/7 |
| Database Admin | [Name] | [Phone] | [Email] | Business hours |
| Security Lead | [Name] | [Phone] | [Email] | 24/7 |

### Vendor Support
| Service | Contact | Phone | Priority Line |
|---------|---------|-------|---------------|
| Supabase | support@supabase.io | - | [Priority number] |
| AWS | - | 1-800-xxx-xxxx | [Account number] |
| Cloudflare | enterprise@cloudflare.com | - | [Account number] |

### Business Contacts
| Role | Name | Phone | Email |
|------|------|-------|-------|
| CEO | [Name] | [Phone] | [Email] |
| CTO | [Name] | [Phone] | [Email] |
| VP Operations | [Name] | [Phone] | [Email] |

## Appendix: Quick Commands

```bash
# Full application rollback
./scripts/emergency-rollback.sh --type=application --version=previous

# Database point-in-time recovery
./scripts/emergency-rollback.sh --type=database --timestamp="2025-01-10 14:00:00"

# Feature flag disable
./scripts/emergency-rollback.sh --type=feature --flag=problematic_feature

# Check rollback status
./scripts/rollback-status.sh

# Generate incident report
./scripts/generate-incident-report.sh --incident-id=INC-001
```