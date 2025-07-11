#!/bin/bash

# Backup System Setup Script for HeyPeter Academy LMS
# This script sets up automated backup system with scheduling and monitoring

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
DEPLOYMENT_DIR="${PROJECT_ROOT}/deployment"

# Environment variables
ENVIRONMENT=${1:-production}
BACKUP_STORAGE=${2:-local}  # local, s3, gcs, or all
DRY_RUN=${3:-false}

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  HeyPeter Academy Backup Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Environment: ${YELLOW}${ENVIRONMENT}${NC}"
echo -e "Storage: ${YELLOW}${BACKUP_STORAGE}${NC}"
echo -e "Dry Run: ${YELLOW}${DRY_RUN}${NC}"
echo ""

# Function to log messages
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if PostgreSQL client is installed
    if ! command -v pg_dump &> /dev/null; then
        error "PostgreSQL client (pg_dump) is not installed. Please install it first."
    fi
    
    # Check if tar and gzip are available
    if ! command -v tar &> /dev/null || ! command -v gzip &> /dev/null; then
        error "tar or gzip not available. Please install them."
    fi
    
    # Check storage-specific requirements
    case "${BACKUP_STORAGE}" in
        "s3"|"all")
            if ! command -v aws &> /dev/null; then
                error "AWS CLI is not installed. Please install it for S3 backup."
            fi
            ;;
        "gcs"|"all")
            if ! command -v gsutil &> /dev/null; then
                error "gsutil is not installed. Please install it for GCS backup."
            fi
            ;;
    esac
    
    # Check if environment file exists
    if [[ ! -f "${DEPLOYMENT_DIR}/environments/.env.${ENVIRONMENT}" ]]; then
        error "Environment file not found: ${DEPLOYMENT_DIR}/environments/.env.${ENVIRONMENT}"
    fi
    
    log "Prerequisites check passed"
}

# Load environment variables
load_environment() {
    log "Loading environment variables for ${ENVIRONMENT}..."
    
    source "${DEPLOYMENT_DIR}/environments/.env.${ENVIRONMENT}"
    
    # Set backup-specific variables
    export BACKUP_ROOT="/backup/heypeter-academy"
    export BACKUP_USER="backup"
    export BACKUP_GROUP="backup"
    
    log "Environment variables loaded"
}

# Create backup user and directories
setup_backup_infrastructure() {
    log "Setting up backup infrastructure..."
    
    if [[ "${DRY_RUN}" == "false" ]]; then
        # Create backup user (if not exists)
        if ! id "${BACKUP_USER}" &>/dev/null; then
            useradd -r -s /bin/bash -d "${BACKUP_ROOT}" "${BACKUP_USER}"
            log "Created backup user: ${BACKUP_USER}"
        fi
        
        # Create backup directories
        mkdir -p "${BACKUP_ROOT}"/{database,application,user_data,configuration,logs,temp}
        mkdir -p "${SCRIPT_DIR}/logs"
        
        # Set proper ownership and permissions
        chown -R "${BACKUP_USER}:${BACKUP_GROUP}" "${BACKUP_ROOT}"
        chmod 750 "${BACKUP_ROOT}"
        chmod 755 "${BACKUP_ROOT}"/{database,application,user_data,configuration}
        chmod 700 "${BACKUP_ROOT}/logs"
        
        # Create encryption key directory
        mkdir -p /etc/backup
        chmod 700 /etc/backup
        
        # Generate encryption key if it doesn't exist
        if [[ ! -f /etc/backup/encryption.key ]]; then
            openssl rand -hex 32 > /etc/backup/encryption.key
            chmod 600 /etc/backup/encryption.key
            chown root:root /etc/backup/encryption.key
            log "Generated encryption key"
        fi
        
        log "Backup infrastructure setup completed"
    else
        log "DRY RUN: Would setup backup infrastructure"
    fi
}

# Configure cloud storage
setup_cloud_storage() {
    log "Setting up cloud storage..."
    
    case "${BACKUP_STORAGE}" in
        "s3"|"all")
            setup_s3_storage
            ;;
        "gcs"|"all")
            setup_gcs_storage
            ;;
        "local")
            log "Using local storage only"
            ;;
    esac
}

# Setup S3 storage
setup_s3_storage() {
    log "Configuring S3 storage..."
    
    if [[ "${DRY_RUN}" == "false" ]]; then
        # Check if AWS credentials are configured
        if ! aws sts get-caller-identity &>/dev/null; then
            warn "AWS credentials not configured. Please run 'aws configure'"
            return 1
        fi
        
        # Create S3 bucket if it doesn't exist
        local bucket_name="heypeter-backups"
        
        if ! aws s3 ls "s3://${bucket_name}" &>/dev/null; then
            aws s3 mb "s3://${bucket_name}"
            log "Created S3 bucket: ${bucket_name}"
        fi
        
        # Configure bucket lifecycle policy
        cat > /tmp/s3-lifecycle.json << EOF
{
    "Rules": [
        {
            "ID": "BackupLifecycle",
            "Status": "Enabled",
            "Filter": {"Prefix": ""},
            "Transitions": [
                {
                    "Days": 30,
                    "StorageClass": "STANDARD_IA"
                },
                {
                    "Days": 90,
                    "StorageClass": "GLACIER"
                },
                {
                    "Days": 365,
                    "StorageClass": "DEEP_ARCHIVE"
                }
            ],
            "Expiration": {
                "Days": 2555
            }
        }
    ]
}
EOF
        
        aws s3api put-bucket-lifecycle-configuration \
            --bucket "${bucket_name}" \
            --lifecycle-configuration file:///tmp/s3-lifecycle.json
        
        rm -f /tmp/s3-lifecycle.json
        
        # Configure bucket versioning
        aws s3api put-bucket-versioning \
            --bucket "${bucket_name}" \
            --versioning-configuration Status=Enabled
        
        # Configure server-side encryption
        aws s3api put-bucket-encryption \
            --bucket "${bucket_name}" \
            --server-side-encryption-configuration '{
                "Rules": [
                    {
                        "ApplyServerSideEncryptionByDefault": {
                            "SSEAlgorithm": "AES256"
                        }
                    }
                ]
            }'
        
        log "S3 storage configured successfully"
    else
        log "DRY RUN: Would configure S3 storage"
    fi
}

# Setup GCS storage
setup_gcs_storage() {
    log "Configuring GCS storage..."
    
    if [[ "${DRY_RUN}" == "false" ]]; then
        # Check if GCS credentials are configured
        if ! gsutil ls &>/dev/null; then
            warn "GCS credentials not configured. Please run 'gcloud auth login'"
            return 1
        fi
        
        # Create GCS bucket if it doesn't exist
        local bucket_name="heypeter-backups-gcs"
        
        if ! gsutil ls "gs://${bucket_name}" &>/dev/null; then
            gsutil mb "gs://${bucket_name}"
            log "Created GCS bucket: ${bucket_name}"
        fi
        
        # Configure bucket lifecycle policy
        cat > /tmp/gcs-lifecycle.json << EOF
{
  "rule": [
    {
      "action": {"type": "SetStorageClass", "storageClass": "NEARLINE"},
      "condition": {"age": 30}
    },
    {
      "action": {"type": "SetStorageClass", "storageClass": "COLDLINE"},
      "condition": {"age": 90}
    },
    {
      "action": {"type": "SetStorageClass", "storageClass": "ARCHIVE"},
      "condition": {"age": 365}
    },
    {
      "action": {"type": "Delete"},
      "condition": {"age": 2555}
    }
  ]
}
EOF
        
        gsutil lifecycle set /tmp/gcs-lifecycle.json "gs://${bucket_name}"
        rm -f /tmp/gcs-lifecycle.json
        
        log "GCS storage configured successfully"
    else
        log "DRY RUN: Would configure GCS storage"
    fi
}

# Setup backup schedules
setup_backup_schedules() {
    log "Setting up backup schedules..."
    
    # Create cron jobs for different backup types
    CRON_FILE="/tmp/backup-cron"
    
    cat > "${CRON_FILE}" << EOF
# HeyPeter Academy Backup Schedules
# Environment: ${ENVIRONMENT}

# Database backup - Daily at 2:00 AM
0 2 * * * ${SCRIPT_DIR}/backup-manager.sh backup database ${ENVIRONMENT} >> ${SCRIPT_DIR}/logs/cron.log 2>&1

# User data backup - Daily at 1:00 AM
0 1 * * * ${SCRIPT_DIR}/backup-manager.sh backup user_data ${ENVIRONMENT} >> ${SCRIPT_DIR}/logs/cron.log 2>&1

# Application files backup - Daily at 3:00 AM
0 3 * * * ${SCRIPT_DIR}/backup-manager.sh backup application ${ENVIRONMENT} >> ${SCRIPT_DIR}/logs/cron.log 2>&1

# Configuration backup - Weekly on Sunday at 4:00 AM
0 4 * * 0 ${SCRIPT_DIR}/backup-manager.sh backup configuration ${ENVIRONMENT} >> ${SCRIPT_DIR}/logs/cron.log 2>&1

# Health check - Every 6 hours
0 */6 * * * ${SCRIPT_DIR}/backup-manager.sh health ${ENVIRONMENT} >> ${SCRIPT_DIR}/logs/health.log 2>&1

# Cleanup old backups - Daily at 5:00 AM
0 5 * * * ${SCRIPT_DIR}/cleanup-backups.sh >> ${SCRIPT_DIR}/logs/cleanup.log 2>&1

EOF
    
    if [[ "${DRY_RUN}" == "false" ]]; then
        # Install cron jobs for backup user
        sudo -u "${BACKUP_USER}" crontab "${CRON_FILE}"
        log "Backup schedules installed"
    else
        log "DRY RUN: Would install backup schedules:"
        cat "${CRON_FILE}"
    fi
    
    rm -f "${CRON_FILE}"
}

# Create cleanup script
create_cleanup_script() {
    log "Creating backup cleanup script..."
    
    CLEANUP_SCRIPT="${SCRIPT_DIR}/cleanup-backups.sh"
    
    cat > "${CLEANUP_SCRIPT}" << 'EOF'
#!/bin/bash

# Backup Cleanup Script
# This script removes old backups based on retention policies

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_ROOT="/backup/heypeter-academy"
LOG_FILE="${SCRIPT_DIR}/logs/cleanup.log"

# Logging function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

log "Starting backup cleanup..."

# Cleanup local backups
cleanup_local() {
    local backup_type="$1"
    local retention_days="$2"
    
    log "Cleaning up ${backup_type} backups older than ${retention_days} days"
    
    local backup_dir="${BACKUP_ROOT}/${backup_type}"
    if [[ -d "${backup_dir}" ]]; then
        local count=$(find "${backup_dir}" -type f -mtime "+${retention_days}" | wc -l)
        if [[ ${count} -gt 0 ]]; then
            find "${backup_dir}" -type f -mtime "+${retention_days}" -delete
            log "Removed ${count} old ${backup_type} backup files"
        else
            log "No old ${backup_type} backup files to remove"
        fi
    fi
}

# Cleanup cloud backups
cleanup_cloud() {
    # S3 cleanup is handled by lifecycle policies
    # GCS cleanup is handled by lifecycle policies
    log "Cloud backup cleanup is handled by lifecycle policies"
}

# Main cleanup
cleanup_local "database" 7
cleanup_local "application" 3
cleanup_local "user_data" 14
cleanup_local "configuration" 30
cleanup_local "logs" 30

cleanup_cloud

log "Backup cleanup completed"
EOF
    
    chmod +x "${CLEANUP_SCRIPT}"
    
    log "Cleanup script created: ${CLEANUP_SCRIPT}"
}

# Setup monitoring and alerting
setup_monitoring() {
    log "Setting up backup monitoring..."
    
    MONITOR_SCRIPT="${SCRIPT_DIR}/monitor-backups.sh"
    
    cat > "${MONITOR_SCRIPT}" << 'EOF'
#!/bin/bash

# Backup Monitoring Script
# This script monitors backup health and sends alerts

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_ROOT="/backup/heypeter-academy"
LOG_FILE="${SCRIPT_DIR}/logs/monitoring.log"

# Load environment
source "$(dirname "${SCRIPT_DIR}")/environments/.env.production"

# Logging function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

# Send alert function
send_alert() {
    local subject="$1"
    local message="$2"
    
    log "ALERT: ${subject}"
    
    # Email alert
    if [[ -n "${EMAIL_SERVER_HOST}" ]]; then
        echo "${message}" | mail -s "HeyPeter Backup Alert: ${subject}" admin@heypeter-academy.com
    fi
    
    # Slack alert
    if [[ -n "${SLACK_WEBHOOK_URL}" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚨 HeyPeter Backup Alert: ${subject}\\n${message}\"}" \
            "${SLACK_WEBHOOK_URL}" 2>/dev/null || true
    fi
}

# Check backup age
check_backup_age() {
    local backup_type="$1"
    local max_age_hours="$2"
    
    local backup_dir="${BACKUP_ROOT}/${backup_type}"
    
    if [[ -d "${backup_dir}" ]]; then
        local latest_backup=$(find "${backup_dir}" -type f -name "*.dump" -o -name "*.tar.gz" | head -1)
        
        if [[ -n "${latest_backup}" ]]; then
            local age_hours=$(( ($(date +%s) - $(stat -c %Y "${latest_backup}")) / 3600 ))
            
            if [[ ${age_hours} -gt ${max_age_hours} ]]; then
                send_alert "Old ${backup_type} backup" "Latest ${backup_type} backup is ${age_hours} hours old (max: ${max_age_hours})"
                return 1
            else
                log "${backup_type} backup age: ${age_hours} hours (OK)"
            fi
        else
            send_alert "Missing ${backup_type} backup" "No ${backup_type} backup files found"
            return 1
        fi
    else
        send_alert "Missing backup directory" "${backup_type} backup directory not found"
        return 1
    fi
    
    return 0
}

# Check disk space
check_disk_space() {
    local usage_percent=$(df "${BACKUP_ROOT}" | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [[ ${usage_percent} -gt 85 ]]; then
        send_alert "High disk usage" "Backup disk usage is ${usage_percent}% (threshold: 85%)"
        return 1
    else
        log "Disk usage: ${usage_percent}% (OK)"
    fi
    
    return 0
}

# Main monitoring
log "Starting backup monitoring..."

issues=0

# Check backup ages
check_backup_age "database" 26 || ((issues++))
check_backup_age "user_data" 26 || ((issues++))
check_backup_age "application" 26 || ((issues++))

# Check disk space
check_disk_space || ((issues++))

# Check backup system health
"${SCRIPT_DIR}/backup-manager.sh" health production &>/dev/null || {
    send_alert "Backup system health check failed" "The backup system health check returned errors"
    ((issues++))
}

if [[ ${issues} -eq 0 ]]; then
    log "All backup monitoring checks passed"
else
    log "Backup monitoring found ${issues} issues"
fi

log "Backup monitoring completed"
EOF
    
    chmod +x "${MONITOR_SCRIPT}"
    
    log "Monitoring script created: ${MONITOR_SCRIPT}"
}

# Test backup system
test_backup_system() {
    log "Testing backup system..."
    
    if [[ "${DRY_RUN}" == "false" ]]; then
        # Test database backup
        log "Testing database backup..."
        "${SCRIPT_DIR}/backup-manager.sh" backup database "${ENVIRONMENT}" true
        
        # Test health check
        log "Testing health check..."
        if "${SCRIPT_DIR}/backup-manager.sh" health "${ENVIRONMENT}"; then
            log "Health check passed"
        else
            warn "Health check failed"
        fi
        
        # Test monitoring
        log "Testing monitoring..."
        "${MONITOR_SCRIPT}"
        
        log "Backup system test completed"
    else
        log "DRY RUN: Would test backup system"
    fi
}

# Generate backup documentation
generate_documentation() {
    log "Generating backup documentation..."
    
    DOC_FILE="${DEPLOYMENT_DIR}/reports/backup_setup_$(date +%Y%m%d_%H%M%S).md"
    mkdir -p "$(dirname "${DOC_FILE}")"
    
    cat > "${DOC_FILE}" << EOF
# Backup System Setup Documentation

**Date:** $(date)
**Environment:** ${ENVIRONMENT}
**Storage:** ${BACKUP_STORAGE}

## Backup Configuration

- **Backup Root:** ${BACKUP_ROOT}
- **Backup User:** ${BACKUP_USER}
- **Encryption:** Enabled (AES256)
- **Compression:** Enabled (gzip level 9)

## Backup Schedules

| Type | Schedule | Retention |
|------|----------|-----------|
| Database | Daily 2:00 AM | 7 days |
| User Data | Daily 1:00 AM | 14 days |
| Application | Daily 3:00 AM | 3 days |
| Configuration | Weekly Sunday 4:00 AM | 30 days |

## Storage Configuration

EOF
    
    case "${BACKUP_STORAGE}" in
        "local")
            echo "- **Local Storage:** ${BACKUP_ROOT}" >> "${DOC_FILE}"
            ;;
        "s3"|"all")
            cat >> "${DOC_FILE}" << EOF
- **S3 Bucket:** heypeter-backups
- **Lifecycle:** 30 days → IA, 90 days → Glacier, 365 days → Deep Archive
- **Retention:** 7 years total
EOF
            ;;
        "gcs"|"all")
            cat >> "${DOC_FILE}" << EOF
- **GCS Bucket:** heypeter-backups-gcs
- **Lifecycle:** 30 days → Nearline, 90 days → Coldline, 365 days → Archive
- **Retention:** 7 years total
EOF
            ;;
    esac
    
    cat >> "${DOC_FILE}" << EOF

## Management Commands

\`\`\`bash
# Manual backup
${SCRIPT_DIR}/backup-manager.sh backup all ${ENVIRONMENT}

# Health check
${SCRIPT_DIR}/backup-manager.sh health ${ENVIRONMENT}

# List backups
${SCRIPT_DIR}/backup-manager.sh list

# Restore database
${SCRIPT_DIR}/backup-manager.sh restore /backup/database/backup_file.dump

# Monitor backups
${SCRIPT_DIR}/monitor-backups.sh

# Cleanup old backups
${SCRIPT_DIR}/cleanup-backups.sh
\`\`\`

## Recovery Procedures

### Database Recovery

1. **Point-in-time Recovery:**
   \`\`\`bash
   ${SCRIPT_DIR}/backup-manager.sh restore /backup/database/latest_backup.dump staging_restore
   \`\`\`

2. **Full System Recovery:**
   - Restore database from latest backup
   - Restore application files
   - Restore configuration files
   - Restart services

### Testing Recovery

- Automated recovery testing runs weekly on Sunday 6:00 AM
- Test database: heypeter_staging_restore
- Verification queries confirm data integrity

## Monitoring and Alerts

- **Health checks:** Every 6 hours
- **Backup age monitoring:** 26 hours threshold
- **Disk space monitoring:** 85% threshold
- **Notifications:** Email and Slack alerts

## Troubleshooting

### Common Issues

1. **Backup fails with permission error:**
   \`\`\`bash
   chown -R ${BACKUP_USER}:${BACKUP_GROUP} ${BACKUP_ROOT}
   \`\`\`

2. **Database connection fails:**
   - Check Supabase credentials
   - Verify network connectivity
   - Check firewall rules

3. **Cloud storage upload fails:**
   - Verify AWS/GCS credentials
   - Check bucket permissions
   - Verify network connectivity

### Log Files

- Backup logs: \`${SCRIPT_DIR}/logs/backup_*.log\`
- Cron logs: \`${SCRIPT_DIR}/logs/cron.log\`
- Health check logs: \`${SCRIPT_DIR}/logs/health.log\`
- Monitoring logs: \`${SCRIPT_DIR}/logs/monitoring.log\`

## Security

- Encryption key: \`/etc/backup/encryption.key\`
- Backup user permissions: Limited to backup operations only
- Cloud storage: Server-side encryption enabled
- Access logging: All backup operations are logged

EOF
    
    log "Backup documentation generated: ${DOC_FILE}"
}

# Cleanup function
cleanup() {
    log "Performing cleanup..."
    rm -f /tmp/s3-lifecycle.json /tmp/gcs-lifecycle.json /tmp/backup-cron
}

# Trap cleanup on exit
trap cleanup EXIT

# Main execution
main() {
    log "Starting backup system setup..."
    
    check_prerequisites
    load_environment
    setup_backup_infrastructure
    setup_cloud_storage
    create_cleanup_script
    setup_monitoring
    setup_backup_schedules
    test_backup_system
    generate_documentation
    
    log "Backup system setup completed successfully!"
    
    if [[ "${DRY_RUN}" == "true" ]]; then
        echo ""
        echo -e "${YELLOW}This was a dry run. To actually setup backups, run:${NC}"
        echo -e "${YELLOW}$0 ${ENVIRONMENT} ${BACKUP_STORAGE} false${NC}"
    else
        echo ""
        echo -e "${GREEN}========================================${NC}"
        echo -e "${GREEN}  Backup System Setup Completed!${NC}"
        echo -e "${GREEN}========================================${NC}"
        echo -e "Backup Root: ${YELLOW}${BACKUP_ROOT}${NC}"
        echo -e "Storage: ${YELLOW}${BACKUP_STORAGE}${NC}"
        echo -e "Documentation: ${YELLOW}${DOC_FILE}${NC}"
        echo ""
        echo -e "${GREEN}Next Steps:${NC}"
        echo -e "1. Test backup system: ${YELLOW}${SCRIPT_DIR}/backup-manager.sh backup database ${ENVIRONMENT}${NC}"
        echo -e "2. Verify monitoring: ${YELLOW}${SCRIPT_DIR}/monitor-backups.sh${NC}"
        echo -e "3. Test recovery: ${YELLOW}${SCRIPT_DIR}/backup-manager.sh restore [backup_file]${NC}"
    fi
}

# Show usage
usage() {
    echo "Usage: $0 [environment] [backup_storage] [dry_run]"
    echo ""
    echo "Arguments:"
    echo "  environment     Target environment (production, staging) [default: production]"
    echo "  backup_storage  Storage type (local, s3, gcs, all) [default: local]"
    echo "  dry_run         Run in dry-run mode (true/false) [default: false]"
    echo ""
    echo "Examples:"
    echo "  $0                          # Setup local backup for production"
    echo "  $0 production s3            # Setup S3 backup for production"
    echo "  $0 staging all true         # Dry run: setup all storage types for staging"
}

# Handle help flag
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    usage
    exit 0
fi

# Run main function
main