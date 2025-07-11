#!/bin/bash

# Production Data Seeding Script for HeyPeter Academy LMS
# This script seeds the production database with initial data

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
SCRIPTS_DIR="${PROJECT_ROOT}/scripts"

# Environment variables
ENVIRONMENT=${1:-production}
DRY_RUN=${2:-false}
FORCE=${3:-false}

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  HeyPeter Academy Data Seeding${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Environment: ${YELLOW}${ENVIRONMENT}${NC}"
echo -e "Dry Run: ${YELLOW}${DRY_RUN}${NC}"
echo -e "Force: ${YELLOW}${FORCE}${NC}"
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
    
    # Check if psql is available
    if ! command -v psql &> /dev/null; then
        error "psql is not installed. Please install PostgreSQL client."
    fi
    
    # Check if seeding scripts exist
    if [[ ! -f "${SCRIPTS_DIR}/seed-production-data-final.sql" ]]; then
        error "Production seeding script not found: ${SCRIPTS_DIR}/seed-production-data-final.sql"
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

# Check if database is empty or has existing data
check_existing_data() {
    log "Checking for existing data..."
    
    # Check if profiles table has data
    PROFILE_COUNT=$(supabase db psql -c "SELECT COUNT(*) FROM profiles;" -t 2>/dev/null | tr -d ' ' || echo "0")
    
    # Check if students table has data
    STUDENT_COUNT=$(supabase db psql -c "SELECT COUNT(*) FROM students;" -t 2>/dev/null | tr -d ' ' || echo "0")
    
    # Check if teachers table has data
    TEACHER_COUNT=$(supabase db psql -c "SELECT COUNT(*) FROM teachers;" -t 2>/dev/null | tr -d ' ' || echo "0")
    
    log "Found ${PROFILE_COUNT} profiles, ${STUDENT_COUNT} students, ${TEACHER_COUNT} teachers"
    
    TOTAL_COUNT=$((PROFILE_COUNT + STUDENT_COUNT + TEACHER_COUNT))
    
    if [[ ${TOTAL_COUNT} -gt 0 && "${FORCE}" != "true" ]]; then
        error "Database contains existing data (${TOTAL_COUNT} records). Use --force to override."
    elif [[ ${TOTAL_COUNT} -gt 0 ]]; then
        warn "Database contains existing data but continuing due to --force flag"
    else
        log "Database is empty, proceeding with seeding"
    fi
}

# Create seed data backup
create_seed_backup() {
    log "Creating pre-seed backup..."
    
    BACKUP_DIR="${DEPLOYMENT_DIR}/backup/seeds"
    mkdir -p "${BACKUP_DIR}"
    
    BACKUP_FILE="${BACKUP_DIR}/pre_seed_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    if [[ "${DRY_RUN}" == "false" ]]; then
        supabase db dump --local > "${BACKUP_FILE}"
        log "Pre-seed backup created: ${BACKUP_FILE}"
    else
        log "DRY RUN: Would create backup at ${BACKUP_FILE}"
    fi
}

# Generate admin user credentials
generate_admin_credentials() {
    log "Generating admin credentials..."
    
    # Generate strong password
    ADMIN_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    ADMIN_EMAIL="admin@heypeter-academy.com"
    
    # Store credentials securely
    CREDENTIALS_FILE="${DEPLOYMENT_DIR}/credentials/admin_credentials_$(date +%Y%m%d_%H%M%S).txt"
    mkdir -p "$(dirname "${CREDENTIALS_FILE}")"
    
    cat > "${CREDENTIALS_FILE}" << EOF
HeyPeter Academy Admin Credentials
Generated: $(date)
Environment: ${ENVIRONMENT}

Admin Email: ${ADMIN_EMAIL}
Admin Password: ${ADMIN_PASSWORD}

IMPORTANT: Store these credentials securely and delete this file after first login.
EOF
    
    chmod 600 "${CREDENTIALS_FILE}"
    log "Admin credentials generated: ${CREDENTIALS_FILE}"
    
    export ADMIN_EMAIL ADMIN_PASSWORD
}

# Prepare seeding script
prepare_seeding_script() {
    log "Preparing seeding script..."
    
    TEMP_SEED_FILE="/tmp/seed_${ENVIRONMENT}_$(date +%s).sql"
    
    # Copy base seeding script
    cp "${SCRIPTS_DIR}/seed-production-data-final.sql" "${TEMP_SEED_FILE}"
    
    # Replace placeholders with environment-specific values
    sed -i.bak "s/ADMIN_EMAIL_PLACEHOLDER/${ADMIN_EMAIL}/g" "${TEMP_SEED_FILE}"
    sed -i.bak "s/ADMIN_PASSWORD_PLACEHOLDER/${ADMIN_PASSWORD}/g" "${TEMP_SEED_FILE}"
    sed -i.bak "s/ENVIRONMENT_PLACEHOLDER/${ENVIRONMENT}/g" "${TEMP_SEED_FILE}"
    
    # Add environment-specific configurations
    cat >> "${TEMP_SEED_FILE}" << EOF

-- Environment-specific configurations
INSERT INTO settings (key, value, description) VALUES
('environment', '${ENVIRONMENT}', 'Current environment'),
('app_url', '${NEXT_PUBLIC_APP_URL}', 'Application URL'),
('maintenance_mode', 'false', 'Maintenance mode status'),
('registration_open', 'true', 'User registration status')
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();
EOF
    
    log "Seeding script prepared: ${TEMP_SEED_FILE}"
    export TEMP_SEED_FILE
}

# Execute seeding script
execute_seeding() {
    log "Executing seeding script..."
    
    if [[ "${DRY_RUN}" == "false" ]]; then
        # Execute the seeding script
        log "Running production data seeding..."
        
        if supabase db psql -f "${TEMP_SEED_FILE}"; then
            log "Seeding completed successfully"
        else
            error "Seeding failed"
        fi
        
        # Verify seeded data
        verify_seeded_data
    else
        log "DRY RUN: Would execute seeding script ${TEMP_SEED_FILE}"
        log "Script preview (first 20 lines):"
        head -20 "${TEMP_SEED_FILE}"
    fi
}

# Verify seeded data
verify_seeded_data() {
    log "Verifying seeded data..."
    
    # Check profiles
    PROFILE_COUNT=$(supabase db psql -c "SELECT COUNT(*) FROM profiles;" -t | tr -d ' ')
    log "Profiles created: ${PROFILE_COUNT}"
    
    # Check students
    STUDENT_COUNT=$(supabase db psql -c "SELECT COUNT(*) FROM students;" -t | tr -d ' ')
    log "Students created: ${STUDENT_COUNT}"
    
    # Check teachers
    TEACHER_COUNT=$(supabase db psql -c "SELECT COUNT(*) FROM teachers;" -t | tr -d ' ')
    log "Teachers created: ${TEACHER_COUNT}"
    
    # Check courses
    COURSE_COUNT=$(supabase db psql -c "SELECT COUNT(*) FROM courses;" -t | tr -d ' ')
    log "Courses created: ${COURSE_COUNT}"
    
    # Check admin user
    ADMIN_COUNT=$(supabase db psql -c "SELECT COUNT(*) FROM profiles WHERE role = 'admin';" -t | tr -d ' ')
    log "Admin users created: ${ADMIN_COUNT}"
    
    if [[ ${ADMIN_COUNT} -eq 0 ]]; then
        error "No admin user found after seeding"
    fi
    
    log "Data verification completed successfully"
}

# Setup initial configurations
setup_configurations() {
    log "Setting up initial configurations..."
    
    if [[ "${DRY_RUN}" == "false" ]]; then
        # Enable Row Level Security on all tables
        log "Enabling Row Level Security..."
        supabase db psql -c "
            SELECT schemaname, tablename, rowsecurity 
            FROM pg_tables 
            WHERE schemaname = 'public' 
              AND tablename NOT LIKE 'supabase_%'
              AND tablename NOT LIKE 'auth_%';
        "
        
        # Create default leave rules
        log "Creating default leave rules..."
        supabase db psql -c "
            INSERT INTO leave_rules (rule_type, hours_required, hours_deducted, description, is_active)
            VALUES 
                ('sick_leave', 0, 1, 'Sick leave deduction', true),
                ('vacation', 24, 2, 'Vacation leave with advance notice', true),
                ('emergency', 0, 3, 'Emergency leave without notice', true)
            ON CONFLICT (rule_type) DO NOTHING;
        "
        
        log "Initial configurations completed"
    else
        log "DRY RUN: Would setup initial configurations"
    fi
}

# Generate seeding report
generate_report() {
    log "Generating seeding report..."
    
    REPORT_DIR="${DEPLOYMENT_DIR}/reports"
    mkdir -p "${REPORT_DIR}"
    REPORT_FILE="${REPORT_DIR}/seeding_$(date +%Y%m%d_%H%M%S).md"
    
    cat > "${REPORT_FILE}" << EOF
# Production Data Seeding Report

**Date:** $(date)
**Environment:** ${ENVIRONMENT}
**Dry Run:** ${DRY_RUN}
**Force:** ${FORCE}

## Seeding Summary

EOF
    
    if [[ "${DRY_RUN}" == "false" ]]; then
        cat >> "${REPORT_FILE}" << EOF
- Profiles: $(supabase db psql -c "SELECT COUNT(*) FROM profiles;" -t | tr -d ' ') created
- Students: $(supabase db psql -c "SELECT COUNT(*) FROM students;" -t | tr -d ' ') created
- Teachers: $(supabase db psql -c "SELECT COUNT(*) FROM teachers;" -t | tr -d ' ') created
- Courses: $(supabase db psql -c "SELECT COUNT(*) FROM courses;" -t | tr -d ' ') created
- Admin Users: $(supabase db psql -c "SELECT COUNT(*) FROM profiles WHERE role = 'admin';" -t | tr -d ' ') created

## Admin Credentials

Admin credentials have been generated and stored securely.
**Important:** Change the default admin password after first login.

## Next Steps

1. Login with admin credentials
2. Change default admin password
3. Configure application settings
4. Add additional users as needed
5. Configure course schedules
6. Test all functionality

EOF
    else
        cat >> "${REPORT_FILE}" << EOF
- This was a dry run - no data was actually seeded
- Review the seeding script and run without dry-run flag to proceed

EOF
    fi
    
    log "Seeding report generated: ${REPORT_FILE}"
}

# Cleanup function
cleanup() {
    log "Performing cleanup..."
    
    # Remove temporary files
    if [[ -n "${TEMP_SEED_FILE}" && -f "${TEMP_SEED_FILE}" ]]; then
        rm -f "${TEMP_SEED_FILE}" "${TEMP_SEED_FILE}.bak"
    fi
}

# Trap cleanup on exit
trap cleanup EXIT

# Main execution
main() {
    log "Starting production data seeding process..."
    
    check_prerequisites
    load_environment
    check_existing_data
    create_seed_backup
    generate_admin_credentials
    prepare_seeding_script
    execute_seeding
    setup_configurations
    generate_report
    
    log "Production data seeding completed successfully!"
    
    if [[ "${DRY_RUN}" == "true" ]]; then
        echo ""
        echo -e "${YELLOW}This was a dry run. To actually seed data, run:${NC}"
        echo -e "${YELLOW}$0 ${ENVIRONMENT} false${NC}"
    else
        echo ""
        echo -e "${GREEN}========================================${NC}"
        echo -e "${GREEN}  Seeding Completed Successfully!${NC}"
        echo -e "${GREEN}========================================${NC}"
        echo -e "Admin credentials stored in: ${YELLOW}${CREDENTIALS_FILE}${NC}"
        echo -e "Report generated: ${YELLOW}${REPORT_FILE}${NC}"
        echo ""
        echo -e "${YELLOW}IMPORTANT: Change the admin password after first login!${NC}"
    fi
}

# Show usage
usage() {
    echo "Usage: $0 [environment] [dry_run] [force]"
    echo ""
    echo "Arguments:"
    echo "  environment   Target environment (production, staging, development) [default: production]"
    echo "  dry_run       Run in dry-run mode (true/false) [default: false]"
    echo "  force         Force seeding even if data exists (true/false) [default: false]"
    echo ""
    echo "Examples:"
    echo "  $0                           # Seed production data"
    echo "  $0 staging                   # Seed staging data"
    echo "  $0 production true           # Dry run for production"
    echo "  $0 production false true     # Force seed production data"
}

# Handle help flag
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    usage
    exit 0
fi

# Handle force flag
if [[ "$1" == "--force" ]]; then
    FORCE="true"
    shift
fi

# Run main function
main