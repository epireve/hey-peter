# Database Backup and Recovery Procedures

## Overview
This document outlines the comprehensive backup and recovery procedures for the HeyPeter Academy LMS database. These procedures ensure data integrity, minimize downtime, and provide multiple recovery options.

## Backup Strategy

### 1. Backup Types

#### Continuous Replication (Real-time)
- **Technology**: Supabase built-in replication
- **RPO**: Near zero (seconds)
- **RTO**: < 5 minutes
- **Status**: Active by default in Supabase

#### Automated Daily Backups
- **Schedule**: 2:00 AM UTC daily
- **Retention**: 30 days
- **Storage**: Supabase backup storage + S3
- **Type**: Full database dump

#### Weekly Full Backups
- **Schedule**: Sunday 3:00 AM UTC
- **Retention**: 12 weeks
- **Storage**: S3 with lifecycle policies
- **Type**: Complete database export

#### Monthly Archive Backups
- **Schedule**: 1st of each month
- **Retention**: 1 year
- **Storage**: S3 Glacier
- **Type**: Compressed full backup

### 2. Backup Automation Scripts

#### Daily Backup Script
```bash
#!/bin/bash
# /opt/scripts/daily-backup.sh

set -e

# Configuration
DB_URL="${DATABASE_URL}"
BACKUP_DIR="/var/backups/postgres/daily"
S3_BUCKET="heypeter-academy-backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="heypeter_academy_${DATE}.sql"

# Create backup directory
mkdir -p ${BACKUP_DIR}

echo "[$(date)] Starting daily backup..."

# Perform backup
pg_dump ${DB_URL} \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  --schema=public \
  --exclude-schema=supabase_functions \
  --file=${BACKUP_DIR}/${BACKUP_FILE}

# Compress backup
gzip ${BACKUP_DIR}/${BACKUP_FILE}
COMPRESSED_FILE="${BACKUP_FILE}.gz"

# Calculate checksum
CHECKSUM=$(sha256sum ${BACKUP_DIR}/${COMPRESSED_FILE} | awk '{print $1}')
echo ${CHECKSUM} > ${BACKUP_DIR}/${COMPRESSED_FILE}.sha256

# Upload to S3
aws s3 cp ${BACKUP_DIR}/${COMPRESSED_FILE} s3://${S3_BUCKET}/daily/${COMPRESSED_FILE}
aws s3 cp ${BACKUP_DIR}/${COMPRESSED_FILE}.sha256 s3://${S3_BUCKET}/daily/${COMPRESSED_FILE}.sha256

# Clean up old local backups (keep 7 days)
find ${BACKUP_DIR} -name "*.gz" -mtime +7 -delete
find ${BACKUP_DIR} -name "*.sha256" -mtime +7 -delete

# Log success
echo "[$(date)] Daily backup completed: ${COMPRESSED_FILE}"

# Send notification
curl -X POST ${SLACK_WEBHOOK} \
  -H 'Content-Type: application/json' \
  -d "{\"text\":\"✅ Daily backup completed: ${COMPRESSED_FILE}\"}"
```

#### Point-in-Time Backup Script
```bash
#!/bin/bash
# /opt/scripts/pit-backup.sh

set -e

# Check if timestamp is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <timestamp>"
  echo "Example: $0 '2025-01-10 14:30:00'"
  exit 1
fi

TIMESTAMP="$1"
BACKUP_NAME="pit_backup_$(date -d "${TIMESTAMP}" +%Y%m%d_%H%M%S)"

echo "Creating point-in-time backup for: ${TIMESTAMP}"

# Use Supabase API for PIT backup
curl -X POST https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_ID}/database/backups \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"point-in-time\",
    \"timestamp\": \"${TIMESTAMP}\",
    \"name\": \"${BACKUP_NAME}\"
  }"

echo "Point-in-time backup initiated: ${BACKUP_NAME}"
```

### 3. Backup Verification

#### Automated Verification Script
```bash
#!/bin/bash
# /opt/scripts/verify-backup.sh

set -e

BACKUP_FILE="$1"
TEMP_DB="verify_$(date +%s)"

echo "Verifying backup: ${BACKUP_FILE}"

# Create temporary database
createdb ${TEMP_DB}

# Restore backup to temporary database
gunzip -c ${BACKUP_FILE} | psql ${TEMP_DB} > /dev/null 2>&1

# Run verification queries
TABLES_COUNT=$(psql ${TEMP_DB} -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'")
USERS_COUNT=$(psql ${TEMP_DB} -t -c "SELECT COUNT(*) FROM auth.users")
INTEGRITY_CHECK=$(psql ${TEMP_DB} -t -c "SELECT COUNT(*) FROM public.students WHERE created_at IS NOT NULL")

# Clean up
dropdb ${TEMP_DB}

# Validate results
if [ ${TABLES_COUNT} -gt 0 ] && [ ${USERS_COUNT} -gt 0 ] && [ ${INTEGRITY_CHECK} -gt 0 ]; then
  echo "✅ Backup verification successful"
  exit 0
else
  echo "❌ Backup verification failed"
  exit 1
fi
```

## Recovery Procedures

### 1. Recovery Scenarios

#### Scenario A: Application Error Recovery
**Use Case**: Application bug corrupted data
**Recovery Method**: Point-in-time recovery
**Estimated Time**: 5-15 minutes

```bash
# Step 1: Identify corruption time
psql ${DATABASE_URL} -c "SELECT * FROM audit_logs WHERE action LIKE '%error%' ORDER BY created_at DESC LIMIT 10"

# Step 2: Create point-in-time backup before corruption
./pit-backup.sh "2025-01-10 14:00:00"

# Step 3: Restore specific tables
pg_restore --data-only --table=affected_table backup_file.sql
```

#### Scenario B: Complete Database Loss
**Use Case**: Catastrophic failure
**Recovery Method**: Latest full backup
**Estimated Time**: 30-60 minutes

```bash
# Step 1: Create new database
createdb heypeter_academy_restored

# Step 2: Download latest backup
aws s3 cp s3://heypeter-academy-backups/daily/latest.sql.gz .

# Step 3: Restore database
gunzip -c latest.sql.gz | psql heypeter_academy_restored

# Step 4: Update connection strings
./update-connection-strings.sh heypeter_academy_restored
```

#### Scenario C: Accidental Data Deletion
**Use Case**: User or admin error
**Recovery Method**: Selective table restore
**Estimated Time**: 10-20 minutes

```bash
# Step 1: Create temporary restore database
createdb temp_restore

# Step 2: Restore backup to temporary database
gunzip -c backup.sql.gz | psql temp_restore

# Step 3: Extract deleted data
pg_dump temp_restore \
  --table=students \
  --data-only \
  --where="id IN (1,2,3)" \
  > deleted_records.sql

# Step 4: Restore to production
psql ${DATABASE_URL} < deleted_records.sql

# Step 5: Clean up
dropdb temp_restore
```

### 2. Recovery Runbook

#### Pre-Recovery Checklist
- [ ] Identify exact issue and scope
- [ ] Notify stakeholders
- [ ] Enable maintenance mode
- [ ] Take current snapshot
- [ ] Identify recovery point
- [ ] Prepare recovery environment

#### Recovery Steps

##### Step 1: Assessment (5 minutes)
```bash
# Check database status
psql ${DATABASE_URL} -c "\l"
psql ${DATABASE_URL} -c "SELECT COUNT(*) FROM information_schema.tables"

# Check recent errors
tail -n 100 /var/log/postgresql/postgresql.log

# Document current state
pg_dump --schema-only ${DATABASE_URL} > current_schema_backup.sql
```

##### Step 2: Preparation (10 minutes)
```bash
# Enable maintenance mode
curl -X POST ${API_URL}/api/admin/maintenance \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d '{"enabled": true, "message": "System maintenance in progress"}'

# Stop application connections
pm2 stop heypeter-academy

# Terminate active connections
psql ${DATABASE_URL} -c "
  SELECT pg_terminate_backend(pid) 
  FROM pg_stat_activity 
  WHERE datname = 'postgres' AND pid <> pg_backend_pid()
"
```

##### Step 3: Recovery Execution (15-45 minutes)
```bash
# For full recovery
./restore-full-backup.sh

# For point-in-time recovery
./restore-pit.sh "2025-01-10 14:00:00"

# For table-specific recovery
./restore-table.sh students backup_file.sql
```

##### Step 4: Validation (10 minutes)
```bash
# Run integrity checks
./verify-database-integrity.sh

# Check critical tables
psql ${DATABASE_URL} -c "SELECT COUNT(*) FROM auth.users"
psql ${DATABASE_URL} -c "SELECT COUNT(*) FROM public.students"
psql ${DATABASE_URL} -c "SELECT COUNT(*) FROM public.classes"

# Test authentication
curl -X POST ${API_URL}/api/auth/health
```

##### Step 5: Resume Operations (5 minutes)
```bash
# Start application
pm2 start heypeter-academy

# Disable maintenance mode
curl -X POST ${API_URL}/api/admin/maintenance \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d '{"enabled": false}'

# Monitor logs
pm2 logs heypeter-academy --lines 100
```

### 3. Disaster Recovery Plan

#### RPO and RTO Targets
- **RPO (Recovery Point Objective)**: < 1 hour
- **RTO (Recovery Time Objective)**: < 2 hours

#### DR Infrastructure
```yaml
Primary Region: us-east-1
  - Main database
  - Application servers
  - Real-time replication

Secondary Region: us-west-2
  - Standby database (read replica)
  - Backup application servers
  - Cross-region replication

Backup Storage:
  - S3 cross-region replication
  - Multi-region backup copies
  - Glacier for long-term storage
```

#### Failover Procedure
```bash
#!/bin/bash
# /opt/scripts/disaster-recovery-failover.sh

echo "Initiating disaster recovery failover..."

# Step 1: Promote read replica
aws rds promote-read-replica \
  --db-instance-identifier heypeter-academy-replica \
  --backup-retention-period 7

# Step 2: Update DNS
aws route53 change-resource-record-sets \
  --hosted-zone-id ${HOSTED_ZONE_ID} \
  --change-batch file://dns-failover.json

# Step 3: Update application configuration
aws ssm put-parameter \
  --name /heypeter/prod/database_url \
  --value ${DR_DATABASE_URL} \
  --overwrite

# Step 4: Deploy to DR region
./deploy-dr-region.sh

echo "Failover completed"
```

## Monitoring and Alerts

### Backup Monitoring
```yaml
Metrics:
  - Backup completion status
  - Backup size trends
  - Backup duration
  - Verification status

Alerts:
  - Backup failure
  - Backup size anomaly (>20% change)
  - Verification failure
  - Storage capacity < 20%
```

### Alert Configuration
```javascript
// monitoring/backup-alerts.js
const alerts = {
  backupFailed: {
    condition: 'backup_status != "success"',
    severity: 'critical',
    notify: ['ops-team', 'db-admin'],
    escalation: '15 minutes'
  },
  backupDelayed: {
    condition: 'backup_duration > 3600',
    severity: 'warning',
    notify: ['ops-team'],
    escalation: '30 minutes'
  },
  storagelow: {
    condition: 'storage_free_percent < 20',
    severity: 'warning',
    notify: ['ops-team'],
    escalation: '1 hour'
  }
};
```

## Testing Procedures

### Monthly DR Drill
1. Schedule maintenance window
2. Failover to DR site
3. Run full test suite
4. Validate data integrity
5. Failback to primary
6. Document results

### Quarterly Recovery Test
1. Restore random backup to test environment
2. Run data validation scripts
3. Test application functionality
4. Measure recovery time
5. Update procedures based on findings

## Documentation and Training

### Required Documentation
- [ ] This recovery guide
- [ ] Network topology diagram
- [ ] Contact list (24/7)
- [ ] Vendor support contracts
- [ ] Historical incident reports

### Team Training
- Monthly backup procedure review
- Quarterly recovery drill participation
- Annual DR scenario simulation
- New team member onboarding

## Compliance and Audit

### Audit Requirements
- Backup logs retention: 1 year
- Recovery test results: 2 years
- Access logs: 90 days
- Compliance reports: 7 years

### Compliance Checklist
- [ ] GDPR data retention compliance
- [ ] SOC 2 backup requirements
- [ ] Industry-specific regulations
- [ ] Data residency requirements