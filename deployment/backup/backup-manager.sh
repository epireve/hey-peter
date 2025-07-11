#!/bin/bash

# Backup Manager Script for HeyPeter Academy LMS
# This script manages all backup operations including database, files, and recovery

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
BACKUP_CONFIG="${SCRIPT_DIR}/backup-config.yml"

# Command line arguments
COMMAND=${1}
BACKUP_TYPE=${2}
ENVIRONMENT=${3:-production}
DRY_RUN=${4:-false}

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  HeyPeter Academy Backup Manager${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Command: ${YELLOW}${COMMAND}${NC}"
echo -e "Type: ${YELLOW}${BACKUP_TYPE}${NC}"
echo -e "Environment: ${YELLOW}${ENVIRONMENT}${NC}"
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

# Load configuration
load_config() {
    log "Loading backup configuration..."
    
    if [[ ! -f "${BACKUP_CONFIG}" ]]; then
        error "Backup configuration not found: ${BACKUP_CONFIG}"
    fi
    
    # Load environment variables
    if [[ -f "${DEPLOYMENT_DIR}/environments/.env.${ENVIRONMENT}" ]]; then
        source "${DEPLOYMENT_DIR}/environments/.env.${ENVIRONMENT}"
    else
        error "Environment file not found: ${DEPLOYMENT_DIR}/environments/.env.${ENVIRONMENT}"
    fi
    
    # Set default backup paths
    export BACKUP_ROOT="/backup/heypeter-academy"
    export BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
    export BACKUP_LOG="${SCRIPT_DIR}/logs/backup_${BACKUP_DATE}.log"
    
    # Create backup directories
    mkdir -p "${BACKUP_ROOT}"/{database,application,user_data,configuration,logs}
    mkdir -p "${SCRIPT_DIR}/logs"
    
    log "Configuration loaded successfully"
}

# Database backup function
backup_database() {
    log "Starting database backup..."
    
    local backup_file="${BACKUP_ROOT}/database/db_backup_${BACKUP_DATE}.dump"
    local backup_sql="${BACKUP_ROOT}/database/db_backup_${BACKUP_DATE}.sql"
    
    if [[ "${DRY_RUN}" == "false" ]]; then
        # Create database backup using pg_dump
        log "Creating PostgreSQL dump..."
        
        # Check if we can connect to Supabase
        if ! command -v pg_dump &> /dev/null; then
            error "pg_dump not found. Please install PostgreSQL client."
        fi
        
        # Database connection details
        export PGHOST="${SUPABASE_DB_HOST:-your-supabase-host}"
        export PGPORT="${SUPABASE_DB_PORT:-5432}"
        export PGDATABASE="postgres"
        export PGUSER="postgres"
        export PGPASSWORD="${SUPABASE_DB_PASSWORD}"
        
        # Create custom format backup
        pg_dump \
            --format=custom \
            --compress=9 \
            --verbose \
            --no-owner \
            --no-privileges \
            --exclude-table="audit_logs_old" \
            --exclude-table-pattern="temp_*" \
            --exclude-table-pattern="cache_*" \
            --file="${backup_file}" \
            2>&1 | tee -a "${BACKUP_LOG}"
        
        # Create SQL backup for easy viewing
        pg_dump \
            --format=plain \
            --verbose \
            --no-owner \
            --no-privileges \
            --exclude-table="audit_logs_old" \
            --exclude-table-pattern="temp_*" \
            --exclude-table-pattern="cache_*" \
            --file="${backup_sql}" \
            2>&1 | tee -a "${BACKUP_LOG}"
        
        # Compress SQL backup
        gzip "${backup_sql}"
        
        # Verify backup
        if [[ -f "${backup_file}" && -s "${backup_file}" ]]; then
            log "Database backup created successfully: ${backup_file}"
            
            # Get backup size
            BACKUP_SIZE=$(du -h "${backup_file}" | cut -f1)
            log "Backup size: ${BACKUP_SIZE}"
            
            # Upload to cloud storage if configured
            upload_to_cloud "${backup_file}" "database/"
            
        else
            error "Database backup failed or is empty"
        fi
        
    else
        log "DRY RUN: Would create database backup at ${backup_file}"
    fi
}

# Application files backup
backup_application() {
    log "Starting application files backup..."
    
    local backup_file="${BACKUP_ROOT}/application/app_backup_${BACKUP_DATE}.tar.gz"
    
    if [[ "${DRY_RUN}" == "false" ]]; then
        log "Creating application files archive..."
        
        # Define paths to backup
        local include_paths=(
            "${PROJECT_ROOT}/uploads"
            "${PROJECT_ROOT}/logs"
            "${PROJECT_ROOT}/config"
            "/etc/nginx"
            "/etc/ssl"
        )
        
        # Create tar archive
        tar -czf "${backup_file}" \
            --exclude="*.tmp" \
            --exclude="*.log" \
            --exclude="node_modules/" \
            --exclude=".git/" \
            --exclude="*.cache" \
            "${include_paths[@]}" \
            2>&1 | tee -a "${BACKUP_LOG}"
        
        if [[ -f "${backup_file}" && -s "${backup_file}" ]]; then
            log "Application backup created successfully: ${backup_file}"
            
            # Get backup size
            BACKUP_SIZE=$(du -h "${backup_file}" | cut -f1)
            log "Backup size: ${BACKUP_SIZE}"
            
            # Upload to cloud storage
            upload_to_cloud "${backup_file}" "application/"
            
        else
            error "Application backup failed or is empty"
        fi
        
    else
        log "DRY RUN: Would create application backup at ${backup_file}"
    fi
}

# User data backup (critical tables only)
backup_user_data() {
    log "Starting user data backup..."
    
    local backup_file="${BACKUP_ROOT}/user_data/user_data_${BACKUP_DATE}.dump"
    
    if [[ "${DRY_RUN}" == "false" ]]; then
        log "Creating user data backup..."
        
        # Database connection
        export PGHOST="${SUPABASE_DB_HOST:-your-supabase-host}"
        export PGPORT="${SUPABASE_DB_PORT:-5432}"
        export PGDATABASE="postgres"
        export PGUSER="postgres"
        export PGPASSWORD="${SUPABASE_DB_PASSWORD}"
        
        # Critical tables to backup
        local tables=(
            "profiles"
            "students"
            "teachers"
            "courses"
            "classes"
            "enrollments"
            "student_hours"
            "leave_requests"
        )
        
        # Create backup with only critical tables
        pg_dump \
            --format=custom \
            --compress=9 \
            --verbose \
            --no-owner \
            --no-privileges \
            $(printf -- "--table=%s " "${tables[@]}") \
            --file="${backup_file}" \
            2>&1 | tee -a "${BACKUP_LOG}"
        
        if [[ -f "${backup_file}" && -s "${backup_file}" ]]; then
            log "User data backup created successfully: ${backup_file}"
            
            # Upload to cloud storage
            upload_to_cloud "${backup_file}" "user_data/"
            
        else
            error "User data backup failed or is empty"
        fi
        
    else
        log "DRY RUN: Would create user data backup at ${backup_file}"
    fi
}

# Configuration backup
backup_configuration() {
    log "Starting configuration backup..."
    
    local backup_file="${BACKUP_ROOT}/configuration/config_backup_${BACKUP_DATE}.tar.gz"
    
    if [[ "${DRY_RUN}" == "false" ]]; then
        log "Creating configuration backup..."
        
        # Configuration paths
        local config_paths=(
            "${DEPLOYMENT_DIR}"
            "${PROJECT_ROOT}/docker-compose*.yml"
            "${PROJECT_ROOT}/nginx.conf"
            "${PROJECT_ROOT}/haproxy.cfg"
            "${PROJECT_ROOT}/scripts"
        )
        
        # Create configuration archive
        tar -czf "${backup_file}" \
            --exclude="*.log" \
            --exclude="logs/" \
            --exclude="backup/" \
            "${config_paths[@]}" \
            2>&1 | tee -a "${BACKUP_LOG}"
        
        if [[ -f "${backup_file}" && -s "${backup_file}" ]]; then
            log "Configuration backup created successfully: ${backup_file}"
            
            # Upload to cloud storage
            upload_to_cloud "${backup_file}" "configuration/"
            
        else
            error "Configuration backup failed or is empty"
        fi
        
    else
        log "DRY RUN: Would create configuration backup at ${backup_file}"
    fi
}

# Upload to cloud storage
upload_to_cloud() {
    local file_path="$1"
    local prefix="$2"
    
    log "Uploading backup to cloud storage..."
    
    # Upload to S3 if configured
    if [[ -n "${AWS_ACCESS_KEY_ID}" && -n "${AWS_SECRET_ACCESS_KEY}" ]]; then
        if command -v aws &> /dev/null; then
            local s3_path="s3://heypeter-backups/${prefix}$(basename "${file_path}")"
            
            aws s3 cp "${file_path}" "${s3_path}" \
                --storage-class STANDARD_IA \
                --server-side-encryption AES256 \
                2>&1 | tee -a "${BACKUP_LOG}"
            
            log "Uploaded to S3: ${s3_path}"
        else
            warn "AWS CLI not found, skipping S3 upload"
        fi
    fi
    
    # Upload to GCS if configured
    if [[ -n "${GCS_SERVICE_ACCOUNT_KEY}" ]]; then
        if command -v gsutil &> /dev/null; then
            local gcs_path="gs://heypeter-backups-gcs/${prefix}$(basename "${file_path}")"
            
            gsutil cp "${file_path}" "${gcs_path}" 2>&1 | tee -a "${BACKUP_LOG}"
            
            log "Uploaded to GCS: ${gcs_path}"
        else
            warn "gsutil not found, skipping GCS upload"
        fi
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up old backups..."
    
    local backup_dir="$1"
    local retention_days="$2"
    
    if [[ "${DRY_RUN}" == "false" ]]; then
        # Remove local backups older than retention period
        find "${backup_dir}" -type f -mtime "+${retention_days}" -delete 2>/dev/null || true
        
        log "Cleaned up backups older than ${retention_days} days in ${backup_dir}"
    else
        log "DRY RUN: Would cleanup backups older than ${retention_days} days"
    fi
}

# Restore database from backup
restore_database() {
    local backup_file="$1"
    local target_db="${2:-postgres_restore}"
    
    log "Starting database restore..."
    
    if [[ ! -f "${backup_file}" ]]; then
        error "Backup file not found: ${backup_file}"
    fi
    
    if [[ "${DRY_RUN}" == "false" ]]; then
        # Database connection
        export PGHOST="${SUPABASE_DB_HOST:-your-supabase-host}"
        export PGPORT="${SUPABASE_DB_PORT:-5432}"
        export PGUSER="postgres"
        export PGPASSWORD="${SUPABASE_DB_PASSWORD}"
        
        # Create target database
        createdb "${target_db}" 2>/dev/null || warn "Database ${target_db} may already exist"
        
        # Restore from backup
        pg_restore \
            --verbose \
            --clean \
            --no-owner \
            --no-privileges \
            --dbname="${target_db}" \
            "${backup_file}" \
            2>&1 | tee -a "${BACKUP_LOG}"
        
        log "Database restored to: ${target_db}"
        
        # Verify restoration
        verify_restoration "${target_db}"
        
    else
        log "DRY RUN: Would restore database from ${backup_file} to ${target_db}"
    fi
}

# Verify restoration
verify_restoration() {
    local database="$1"
    
    log "Verifying database restoration..."
    
    # Test queries to verify data integrity
    local test_queries=(
        "SELECT COUNT(*) FROM profiles;"
        "SELECT COUNT(*) FROM students;"
        "SELECT COUNT(*) FROM teachers;"
        "SELECT MAX(created_at) FROM audit_logs;"
    )
    
    for query in "${test_queries[@]}"; do
        local result=$(psql -d "${database}" -t -c "${query}" 2>/dev/null | tr -d ' ' || echo "ERROR")
        log "Query: ${query} -> Result: ${result}"
    done
    
    log "Restoration verification completed"
}

# Send notification
send_notification() {
    local status="$1"
    local message="$2"
    
    log "Sending notification..."
    
    # Email notification
    if [[ -n "${EMAIL_SERVER_HOST}" && -n "${EMAIL_SERVER_USER}" ]]; then
        local subject="HeyPeter Academy Backup ${status}: $(date)"
        
        # Create email content
        cat > /tmp/backup_notification.txt << EOF
HeyPeter Academy Backup Report

Status: ${status}
Environment: ${ENVIRONMENT}
Timestamp: $(date)
Backup Type: ${BACKUP_TYPE}

Message: ${message}

Log file: ${BACKUP_LOG}

--
HeyPeter Academy Backup System
EOF
        
        # Send email (using mail command or similar)
        if command -v mail &> /dev/null; then
            mail -s "${subject}" admin@heypeter-academy.com < /tmp/backup_notification.txt
        else
            log "Mail command not found, notification not sent"
        fi
        
        rm -f /tmp/backup_notification.txt
    fi
    
    # Slack notification (if webhook configured)
    if [[ -n "${SLACK_WEBHOOK_URL}" ]]; then
        local color="good"
        [[ "${status}" == "FAILED" ]] && color="danger"
        [[ "${status}" == "WARNING" ]] && color="warning"
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"Backup ${status}: ${message}\",\"color\":\"${color}\"}" \
            "${SLACK_WEBHOOK_URL}" 2>/dev/null || true
    fi
}

# List available backups
list_backups() {
    log "Available backups:"
    
    for type in database application user_data configuration; do
        echo ""
        echo -e "${YELLOW}${type^^} BACKUPS:${NC}"
        
        local backup_dir="${BACKUP_ROOT}/${type}"
        if [[ -d "${backup_dir}" ]]; then
            ls -lah "${backup_dir}" | tail -n +2
        else
            echo "No backups found in ${backup_dir}"
        fi
    done
}

# Health check
health_check() {
    log "Performing backup system health check..."
    
    local issues=0
    
    # Check backup directories
    for dir in database application user_data configuration logs; do
        if [[ ! -d "${BACKUP_ROOT}/${dir}" ]]; then
            warn "Backup directory missing: ${BACKUP_ROOT}/${dir}"
            ((issues++))
        fi
    done
    
    # Check available disk space
    local available_space=$(df "${BACKUP_ROOT}" | awk 'NR==2 {print $4}')
    local available_gb=$((available_space / 1024 / 1024))
    
    if [[ ${available_gb} -lt 10 ]]; then
        warn "Low disk space: ${available_gb}GB available"
        ((issues++))
    else
        log "Disk space: ${available_gb}GB available"
    fi
    
    # Check database connectivity
    if command -v psql &> /dev/null; then
        export PGHOST="${SUPABASE_DB_HOST:-your-supabase-host}"
        export PGPORT="${SUPABASE_DB_PORT:-5432}"
        export PGDATABASE="postgres"
        export PGUSER="postgres"
        export PGPASSWORD="${SUPABASE_DB_PASSWORD}"
        
        if psql -c "SELECT 1;" &>/dev/null; then
            log "Database connectivity: OK"
        else
            warn "Database connectivity: FAILED"
            ((issues++))
        fi
    fi
    
    # Check cloud storage
    if command -v aws &> /dev/null && [[ -n "${AWS_ACCESS_KEY_ID}" ]]; then
        if aws s3 ls s3://heypeter-backups/ &>/dev/null; then
            log "S3 connectivity: OK"
        else
            warn "S3 connectivity: FAILED"
            ((issues++))
        fi
    fi
    
    if [[ ${issues} -eq 0 ]]; then
        log "Health check passed: No issues found"
        return 0
    else
        warn "Health check completed with ${issues} issues"
        return 1
    fi
}

# Main function
main() {
    case "${COMMAND}" in
        "backup")
            load_config
            case "${BACKUP_TYPE}" in
                "database")
                    backup_database
                    cleanup_old_backups "${BACKUP_ROOT}/database" 7
                    ;;
                "application")
                    backup_application
                    cleanup_old_backups "${BACKUP_ROOT}/application" 3
                    ;;
                "user_data")
                    backup_user_data
                    cleanup_old_backups "${BACKUP_ROOT}/user_data" 14
                    ;;
                "configuration")
                    backup_configuration
                    cleanup_old_backups "${BACKUP_ROOT}/configuration" 30
                    ;;
                "all")
                    backup_database
                    backup_application
                    backup_user_data
                    backup_configuration
                    cleanup_old_backups "${BACKUP_ROOT}/database" 7
                    cleanup_old_backups "${BACKUP_ROOT}/application" 3
                    cleanup_old_backups "${BACKUP_ROOT}/user_data" 14
                    cleanup_old_backups "${BACKUP_ROOT}/configuration" 30
                    ;;
                *)
                    error "Invalid backup type: ${BACKUP_TYPE}. Use: database, application, user_data, configuration, or all"
                    ;;
            esac
            send_notification "SUCCESS" "Backup completed successfully"
            ;;
        "restore")
            load_config
            restore_database "${BACKUP_TYPE}" "${ENVIRONMENT}_restore"
            ;;
        "list")
            load_config
            list_backups
            ;;
        "health")
            load_config
            health_check
            ;;
        "cleanup")
            load_config
            cleanup_old_backups "${BACKUP_ROOT}/${BACKUP_TYPE}" "${ENVIRONMENT}"
            ;;
        *)
            echo "Usage: $0 {backup|restore|list|health|cleanup} [type] [environment] [dry_run]"
            echo ""
            echo "Commands:"
            echo "  backup [database|application|user_data|configuration|all] - Create backup"
            echo "  restore [backup_file] [target_db] - Restore from backup"
            echo "  list - List available backups"
            echo "  health - Check backup system health"
            echo "  cleanup [backup_type] [retention_days] - Cleanup old backups"
            echo ""
            echo "Examples:"
            echo "  $0 backup all production"
            echo "  $0 backup database production"
            echo "  $0 restore /backup/database/db_backup_20250110_020000.dump"
            echo "  $0 list"
            echo "  $0 health"
            exit 1
            ;;
    esac
    
    log "Backup operation completed successfully!"
}

# Handle script interruption
cleanup_on_exit() {
    if [[ $? -ne 0 ]]; then
        error_msg="Backup operation was interrupted or failed"
        log "${error_msg}"
        send_notification "FAILED" "${error_msg}"
    fi
}

trap cleanup_on_exit EXIT

# Run main function
main