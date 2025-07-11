#!/bin/bash

# Database Deployment Script for HeyPeter Academy LMS
# This script handles database deployment and migration for production

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
SUPABASE_DIR="${PROJECT_ROOT}/supabase"

# Environment variables
ENVIRONMENT=${1:-production}
DRY_RUN=${2:-false}
BACKUP_BEFORE=${3:-true}

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  HeyPeter Academy Database Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Environment: ${YELLOW}${ENVIRONMENT}${NC}"
echo -e "Dry Run: ${YELLOW}${DRY_RUN}${NC}"
echo -e "Backup Before: ${YELLOW}${BACKUP_BEFORE}${NC}"
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
    
    # Check if Supabase CLI is installed
    if ! command -v supabase &> /dev/null; then
        error "Supabase CLI is not installed. Please install it first."
    fi
    
    # Check if environment file exists
    if [[ ! -f "${DEPLOYMENT_DIR}/environments/.env.${ENVIRONMENT}" ]]; then
        error "Environment file .env.${ENVIRONMENT} not found in ${DEPLOYMENT_DIR}/environments/"
    fi
    
    # Check if connected to Supabase project
    if [[ ! -f "${SUPABASE_DIR}/.env" ]]; then
        error "Supabase project not linked. Run 'supabase link' first."
    fi
    
    log "Prerequisites check passed"
}

# Load environment variables
load_environment() {
    log "Loading environment variables for ${ENVIRONMENT}..."
    
    if [[ -f "${DEPLOYMENT_DIR}/environments/.env.${ENVIRONMENT}" ]]; then
        source "${DEPLOYMENT_DIR}/environments/.env.${ENVIRONMENT}"
        log "Environment variables loaded"
    else
        error "Environment file not found: ${DEPLOYMENT_DIR}/environments/.env.${ENVIRONMENT}"
    fi
}

# Create backup
create_backup() {
    if [[ "${BACKUP_BEFORE}" == "true" ]]; then
        log "Creating database backup..."
        
        BACKUP_DIR="${DEPLOYMENT_DIR}/backup"
        mkdir -p "${BACKUP_DIR}"
        
        BACKUP_FILE="${BACKUP_DIR}/backup_$(date +%Y%m%d_%H%M%S).sql"
        
        if [[ "${DRY_RUN}" == "false" ]]; then
            supabase db dump --local > "${BACKUP_FILE}"
            log "Backup created: ${BACKUP_FILE}"
        else
            log "DRY RUN: Would create backup at ${BACKUP_FILE}"
        fi
    else
        log "Skipping backup (BACKUP_BEFORE=false)"
    fi
}

# Validate migrations
validate_migrations() {
    log "Validating migrations..."
    
    # Check if migrations directory exists
    if [[ ! -d "${SUPABASE_DIR}/migrations" ]]; then
        error "Migrations directory not found: ${SUPABASE_DIR}/migrations"
    fi
    
    # Count migration files
    MIGRATION_COUNT=$(find "${SUPABASE_DIR}/migrations" -name "*.sql" -not -name "*.disabled" | wc -l)
    log "Found ${MIGRATION_COUNT} migration files"
    
    if [[ ${MIGRATION_COUNT} -eq 0 ]]; then
        warn "No migration files found"
        return 0
    fi
    
    # Validate migration syntax (basic check)
    for migration in "${SUPABASE_DIR}/migrations"/*.sql; do
        if [[ -f "$migration" && ! "$migration" =~ \.disabled$ ]]; then
            log "Validating migration: $(basename "$migration")"
            
            # Basic SQL syntax validation
            if ! grep -q ";" "$migration"; then
                warn "Migration ${migration} might be missing semicolons"
            fi
        fi
    done
    
    log "Migration validation completed"
}

# Apply migrations
apply_migrations() {
    log "Applying database migrations..."
    
    if [[ "${DRY_RUN}" == "false" ]]; then
        # Apply migrations to remote database
        if [[ "${ENVIRONMENT}" == "production" ]]; then
            log "Applying migrations to production database..."
            supabase db push --password "${SUPABASE_DB_PASSWORD}"
        else
            log "Applying migrations to ${ENVIRONMENT} database..."
            supabase db push
        fi
        
        log "Migrations applied successfully"
    else
        log "DRY RUN: Would apply migrations to ${ENVIRONMENT} database"
        supabase db diff --local
    fi
}

# Verify deployment
verify_deployment() {
    log "Verifying database deployment..."
    
    if [[ "${DRY_RUN}" == "false" ]]; then
        # Check database connection
        log "Testing database connection..."
        
        # Run a simple query to verify connection
        if supabase db psql -c "SELECT version();" > /dev/null 2>&1; then
            log "Database connection verified"
        else
            error "Failed to connect to database"
        fi
        
        # Check if critical tables exist
        log "Checking critical tables..."
        TABLES=("profiles" "students" "teachers" "courses" "classes" "enrollments")
        
        for table in "${TABLES[@]}"; do
            if supabase db psql -c "SELECT 1 FROM information_schema.tables WHERE table_name = '${table}';" | grep -q "1"; then
                log "Table '${table}' exists"
            else
                error "Critical table '${table}' not found"
            fi
        done
        
        log "Database verification completed successfully"
    else
        log "DRY RUN: Would verify database deployment"
    fi
}

# Generate migration report
generate_report() {
    log "Generating deployment report..."
    
    REPORT_FILE="${DEPLOYMENT_DIR}/reports/deployment_$(date +%Y%m%d_%H%M%S).md"
    mkdir -p "$(dirname "${REPORT_FILE}")"
    
    cat > "${REPORT_FILE}" << EOF
# Database Deployment Report

**Date:** $(date)
**Environment:** ${ENVIRONMENT}
**Dry Run:** ${DRY_RUN}
**Backup Created:** ${BACKUP_BEFORE}

## Migration Summary

- Total migrations: $(find "${SUPABASE_DIR}/migrations" -name "*.sql" -not -name "*.disabled" | wc -l)
- Deployment status: $(if [[ "${DRY_RUN}" == "false" ]]; then echo "SUCCESS"; else echo "DRY RUN COMPLETED"; fi)

## Applied Migrations

EOF
    
    # List applied migrations
    for migration in "${SUPABASE_DIR}/migrations"/*.sql; do
        if [[ -f "$migration" && ! "$migration" =~ \.disabled$ ]]; then
            echo "- $(basename "$migration")" >> "${REPORT_FILE}"
        fi
    done
    
    echo "" >> "${REPORT_FILE}"
    echo "## Database Schema" >> "${REPORT_FILE}"
    
    if [[ "${DRY_RUN}" == "false" ]]; then
        echo '```sql' >> "${REPORT_FILE}"
        supabase db dump --local --schema-only >> "${REPORT_FILE}" 2>/dev/null || echo "Schema dump not available" >> "${REPORT_FILE}"
        echo '```' >> "${REPORT_FILE}"
    else
        echo "Schema dump not available (dry run mode)" >> "${REPORT_FILE}"
    fi
    
    log "Deployment report generated: ${REPORT_FILE}"
}

# Cleanup function
cleanup() {
    log "Performing cleanup..."
    # Remove temporary files if any
}

# Trap cleanup on exit
trap cleanup EXIT

# Main execution
main() {
    log "Starting database deployment process..."
    
    check_prerequisites
    load_environment
    create_backup
    validate_migrations
    apply_migrations
    verify_deployment
    generate_report
    
    log "Database deployment completed successfully!"
    
    if [[ "${DRY_RUN}" == "true" ]]; then
        echo ""
        echo -e "${YELLOW}This was a dry run. To actually deploy, run:${NC}"
        echo -e "${YELLOW}$0 ${ENVIRONMENT} false${NC}"
    fi
}

# Show usage
usage() {
    echo "Usage: $0 [environment] [dry_run] [backup_before]"
    echo ""
    echo "Arguments:"
    echo "  environment   Target environment (production, staging, development) [default: production]"
    echo "  dry_run       Run in dry-run mode (true/false) [default: false]"
    echo "  backup_before Create backup before deployment (true/false) [default: true]"
    echo ""
    echo "Examples:"
    echo "  $0                           # Deploy to production with backup"
    echo "  $0 staging                   # Deploy to staging with backup"
    echo "  $0 production true           # Dry run for production"
    echo "  $0 production false false    # Deploy to production without backup"
}

# Handle help flag
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    usage
    exit 0
fi

# Run main function
main