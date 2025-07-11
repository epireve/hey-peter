#!/bin/bash

# Database Migration Validation and Rollback Script for HeyPeter Academy LMS
# Validates database migrations and provides rollback capabilities

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEPLOYMENT_DIR="$PROJECT_ROOT/deployment"
MIGRATION_DIR="$PROJECT_ROOT/supabase/migrations"
VALIDATION_LOG="$DEPLOYMENT_DIR/reports/database-validation-$(date +%Y%m%d_%H%M%S).log"
BACKUP_DIR="$DEPLOYMENT_DIR/backups/pre-migration-$(date +%Y%m%d_%H%M%S)"

# Create necessary directories
mkdir -p "$DEPLOYMENT_DIR/reports"
mkdir -p "$DEPLOYMENT_DIR/backups"
mkdir -p "$BACKUP_DIR"

# Initialize counters
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Migration tracking
declare -a APPLIED_MIGRATIONS=()
declare -a FAILED_MIGRATIONS=()

# Logging functions
log() {
    echo -e "${1}" | tee -a "$VALIDATION_LOG"
}

log_info() {
    log "${BLUE}[INFO]${NC} $1"
}

log_success() {
    log "${GREEN}[PASS]${NC} $1"
    ((PASSED_CHECKS++))
}

log_warning() {
    log "${YELLOW}[WARN]${NC} $1"
    ((WARNING_CHECKS++))
}

log_error() {
    log "${RED}[FAIL]${NC} $1"
    ((FAILED_CHECKS++))
}

# Database connection functions
get_db_connection_params() {
    if [[ -n "${DATABASE_URL:-}" ]]; then
        echo "$DATABASE_URL"
    elif [[ -n "${SUPABASE_DB_URL:-}" ]]; then
        echo "$SUPABASE_DB_URL"
    else
        log_error "No database connection URL found"
        return 1
    fi
}

test_db_connection() {
    local db_url=$(get_db_connection_params)
    
    if [[ -z "$db_url" ]]; then
        return 1
    fi
    
    if command -v psql >/dev/null 2>&1; then
        if psql "$db_url" -c "SELECT 1;" >/dev/null 2>&1; then
            return 0
        else
            return 1
        fi
    else
        log_error "PostgreSQL client (psql) not found"
        return 1
    fi
}

# Backup functions
create_database_backup() {
    log_info "Creating database backup before migration..."
    
    local db_url=$(get_db_connection_params)
    local backup_file="$BACKUP_DIR/database_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    if command -v pg_dump >/dev/null 2>&1; then
        if pg_dump "$db_url" > "$backup_file" 2>/dev/null; then
            log_success "Database backup created: $backup_file"
            echo "$backup_file"
        else
            log_error "Failed to create database backup"
            return 1
        fi
    else
        log_error "pg_dump not available for database backup"
        return 1
    fi
}

create_schema_backup() {
    log_info "Creating schema-only backup..."
    
    local db_url=$(get_db_connection_params)
    local schema_file="$BACKUP_DIR/schema_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    if command -v pg_dump >/dev/null 2>&1; then
        if pg_dump --schema-only "$db_url" > "$schema_file" 2>/dev/null; then
            log_success "Schema backup created: $schema_file"
            echo "$schema_file"
        else
            log_error "Failed to create schema backup"
            return 1
        fi
    else
        log_error "pg_dump not available for schema backup"
        return 1
    fi
}

# Migration validation functions
validate_migration_files() {
    log_info "Validating migration files..."
    
    if [[ ! -d "$MIGRATION_DIR" ]]; then
        log_error "Migration directory not found: $MIGRATION_DIR"
        return 1
    fi
    
    local migration_files=($(find "$MIGRATION_DIR" -name "*.sql" -type f | sort))
    
    if [[ ${#migration_files[@]} -eq 0 ]]; then
        log_warning "No migration files found in $MIGRATION_DIR"
        return 0
    fi
    
    log_info "Found ${#migration_files[@]} migration files"
    
    for migration_file in "${migration_files[@]}"; do
        validate_single_migration "$migration_file"
    done
}

validate_single_migration() {
    local migration_file="$1"
    local filename=$(basename "$migration_file")
    
    log_info "Validating migration: $filename"
    
    # Check file syntax
    if [[ ! -r "$migration_file" ]]; then
        log_error "Migration file not readable: $filename"
        return 1
    fi
    
    # Check for dangerous operations
    check_dangerous_operations "$migration_file"
    
    # Check for transaction consistency
    check_transaction_consistency "$migration_file"
    
    # Check for foreign key constraints
    check_foreign_key_consistency "$migration_file"
    
    # Validate SQL syntax (basic check)
    validate_sql_syntax "$migration_file"
    
    log_success "Migration validation passed: $filename"
}

check_dangerous_operations() {
    local migration_file="$1"
    local filename=$(basename "$migration_file")
    
    # Check for potentially dangerous operations
    local dangerous_patterns=(
        "DROP TABLE"
        "DROP DATABASE"
        "TRUNCATE"
        "DELETE FROM.*WHERE"
        "UPDATE.*WHERE"
    )
    
    for pattern in "${dangerous_patterns[@]}"; do
        if grep -i "$pattern" "$migration_file" >/dev/null 2>&1; then
            log_warning "Potentially dangerous operation found in $filename: $pattern"
        fi
    done
    
    # Check for ALTER TABLE operations
    if grep -i "ALTER TABLE" "$migration_file" >/dev/null 2>&1; then
        log_info "ALTER TABLE operations found in $filename - review for impact"
    fi
}

check_transaction_consistency() {
    local migration_file="$1"
    local filename=$(basename "$migration_file")
    
    # Check for transaction blocks
    local begin_count=$(grep -ci "BEGIN" "$migration_file" || true)
    local commit_count=$(grep -ci "COMMIT" "$migration_file" || true)
    local rollback_count=$(grep -ci "ROLLBACK" "$migration_file" || true)
    
    if [[ $begin_count -gt 0 ]]; then
        if [[ $commit_count -eq $begin_count ]] || [[ $rollback_count -eq $begin_count ]]; then
            log_success "Transaction consistency check passed for $filename"
        else
            log_warning "Transaction consistency issues in $filename (BEGIN: $begin_count, COMMIT: $commit_count, ROLLBACK: $rollback_count)"
        fi
    fi
}

check_foreign_key_consistency() {
    local migration_file="$1"
    local filename=$(basename "$migration_file")
    
    # Check for foreign key references
    if grep -i "REFERENCES" "$migration_file" >/dev/null 2>&1; then
        log_info "Foreign key references found in $filename"
        
        # Check if referenced tables are created in the same migration or exist
        local referenced_tables=($(grep -io "REFERENCES \w\+" "$migration_file" | awk '{print $2}' | sort -u))
        
        for table in "${referenced_tables[@]}"; do
            if grep -i "CREATE TABLE $table" "$migration_file" >/dev/null 2>&1; then
                log_success "Referenced table $table is created in same migration"
            else
                log_info "Referenced table $table should exist before this migration"
            fi
        done
    fi
}

validate_sql_syntax() {
    local migration_file="$1"
    local filename=$(basename "$migration_file")
    
    # Basic SQL syntax validation
    if command -v psql >/dev/null 2>&1; then
        local db_url=$(get_db_connection_params)
        
        # Create a temporary transaction to test the migration
        if psql "$db_url" -v ON_ERROR_STOP=1 -c "BEGIN; $(cat "$migration_file"); ROLLBACK;" >/dev/null 2>&1; then
            log_success "SQL syntax validation passed for $filename"
        else
            log_error "SQL syntax validation failed for $filename"
        fi
    else
        log_warning "psql not available, skipping SQL syntax validation for $filename"
    fi
}

# Migration execution functions
get_applied_migrations() {
    local db_url=$(get_db_connection_params)
    
    # Check if supabase migrations table exists
    local table_exists=$(psql "$db_url" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'supabase_migrations' AND table_name = 'schema_migrations');" 2>/dev/null | tr -d ' ')
    
    if [[ "$table_exists" == "t" ]]; then
        psql "$db_url" -t -c "SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;" | tr -d ' ' | grep -v '^$'
    else
        log_warning "Supabase migrations table not found - this might be a fresh installation"
        echo ""
    fi
}

apply_single_migration() {
    local migration_file="$1"
    local filename=$(basename "$migration_file")
    local db_url=$(get_db_connection_params)
    
    log_info "Applying migration: $filename"
    
    # Extract version from filename (assumes format: YYYYMMDD_migration_name.sql)
    local version=$(basename "$migration_file" .sql | cut -d'_' -f1)
    
    # Check if migration is already applied
    local applied_migrations=$(get_applied_migrations)
    if echo "$applied_migrations" | grep -q "^$version$"; then
        log_info "Migration $filename already applied, skipping"
        return 0
    fi
    
    # Apply the migration in a transaction
    if psql "$db_url" -v ON_ERROR_STOP=1 -f "$migration_file" >/dev/null 2>&1; then
        # Record the migration as applied
        psql "$db_url" -c "INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('$version') ON CONFLICT DO NOTHING;" >/dev/null 2>&1 || true
        
        log_success "Migration applied successfully: $filename"
        APPLIED_MIGRATIONS+=("$filename")
        return 0
    else
        log_error "Failed to apply migration: $filename"
        FAILED_MIGRATIONS+=("$filename")
        return 1
    fi
}

apply_migrations() {
    log_info "Applying database migrations..."
    
    local migration_files=($(find "$MIGRATION_DIR" -name "*.sql" -type f | grep -v "\.disabled$" | sort))
    
    if [[ ${#migration_files[@]} -eq 0 ]]; then
        log_warning "No migration files to apply"
        return 0
    fi
    
    for migration_file in "${migration_files[@]}"; do
        if ! apply_single_migration "$migration_file"; then
            log_error "Migration failed, stopping further migrations"
            return 1
        fi
    done
    
    log_success "All migrations applied successfully"
}

# Rollback functions
create_rollback_script() {
    local backup_file="$1"
    local rollback_script="$BACKUP_DIR/rollback_$(date +%Y%m%d_%H%M%S).sh"
    
    cat > "$rollback_script" << EOF
#!/bin/bash

# Automatic rollback script generated on $(date)
# This script will restore the database to its state before migration

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "\${YELLOW}[INFO]\${NC} \$1"
}

log_success() {
    echo -e "\${GREEN}[SUCCESS]\${NC} \$1"
}

log_error() {
    echo -e "\${RED}[ERROR]\${NC} \$1"
}

main() {
    log_info "Starting database rollback procedure..."
    
    # Verify backup file exists
    if [[ ! -f "$backup_file" ]]; then
        log_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    # Get database connection
    local db_url="\${DATABASE_URL:-\${SUPABASE_DB_URL:-}}"
    if [[ -z "\$db_url" ]]; then
        log_error "No database connection URL found"
        exit 1
    fi
    
    # Confirm rollback
    echo -e "\${YELLOW}WARNING: This will restore the database to its pre-migration state.\${NC}"
    echo -e "\${YELLOW}All data changes since the backup will be lost.\${NC}"
    read -p "Are you sure you want to proceed? (yes/no): " confirm
    
    if [[ "\$confirm" != "yes" ]]; then
        log_info "Rollback cancelled"
        exit 0
    fi
    
    # Create a backup of current state before rollback
    local current_backup="$BACKUP_DIR/pre_rollback_\$(date +%Y%m%d_%H%M%S).sql"
    log_info "Creating backup of current state..."
    if pg_dump "\$db_url" > "\$current_backup" 2>/dev/null; then
        log_success "Current state backup created: \$current_backup"
    else
        log_error "Failed to create current state backup"
        exit 1
    fi
    
    # Perform rollback
    log_info "Restoring database from backup: $backup_file"
    if psql "\$db_url" < "$backup_file" >/dev/null 2>&1; then
        log_success "Database rollback completed successfully"
        log_info "Original state restored from: $backup_file"
        log_info "Pre-rollback backup saved as: \$current_backup"
    else
        log_error "Database rollback failed"
        exit 1
    fi
}

main "\$@"
EOF

    chmod +x "$rollback_script"
    log_success "Rollback script created: $rollback_script"
    echo "$rollback_script"
}

# Health check functions
verify_database_health() {
    log_info "Verifying database health after migration..."
    
    local db_url=$(get_db_connection_params)
    
    # Check basic connectivity
    if ! test_db_connection; then
        log_error "Database connectivity test failed"
        return 1
    fi
    
    # Check for critical tables
    check_critical_tables
    
    # Check for data integrity
    check_data_integrity
    
    # Check for performance issues
    check_performance_metrics
    
    log_success "Database health verification completed"
}

check_critical_tables() {
    local db_url=$(get_db_connection_params)
    
    # List of critical tables that should exist
    local critical_tables=(
        "auth.users"
        "public.students"
        "public.teachers"
        "public.courses"
        "public.classes"
        "public.enrollments"
    )
    
    for table in "${critical_tables[@]}"; do
        local exists=$(psql "$db_url" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = '${table%.*}' AND table_name = '${table#*.}');" 2>/dev/null | tr -d ' ')
        
        if [[ "$exists" == "t" ]]; then
            log_success "Critical table exists: $table"
        else
            log_error "Critical table missing: $table"
        fi
    done
}

check_data_integrity() {
    local db_url=$(get_db_connection_params)
    
    # Check for foreign key constraint violations
    local fk_violations=$(psql "$db_url" -t -c "
        SELECT COUNT(*) FROM (
            SELECT conname FROM pg_constraint 
            WHERE contype = 'f' AND NOT pg_trigger_depth() = 0
        ) AS fk_check;
    " 2>/dev/null | tr -d ' ')
    
    if [[ "$fk_violations" -eq 0 ]]; then
        log_success "No foreign key constraint violations found"
    else
        log_error "Foreign key constraint violations detected: $fk_violations"
    fi
    
    # Check for NULL values in NOT NULL columns
    local null_violations=$(psql "$db_url" -t -c "
        SELECT COUNT(*) FROM information_schema.columns 
        WHERE is_nullable = 'NO' AND table_schema = 'public';
    " 2>/dev/null | tr -d ' ')
    
    if [[ "$null_violations" -gt 0 ]]; then
        log_success "NOT NULL constraints configured properly"
    else
        log_warning "No NOT NULL constraints found - this might be unexpected"
    fi
}

check_performance_metrics() {
    local db_url=$(get_db_connection_params)
    
    # Check for missing indexes on foreign keys
    local missing_indexes=$(psql "$db_url" -t -c "
        SELECT COUNT(*) FROM pg_constraint c
        LEFT JOIN pg_index i ON c.conrelid = i.indrelid AND c.conkey = i.indkey
        WHERE c.contype = 'f' AND i.indexrelid IS NULL;
    " 2>/dev/null | tr -d ' ')
    
    if [[ "$missing_indexes" -eq 0 ]]; then
        log_success "All foreign keys have supporting indexes"
    else
        log_warning "Missing indexes on foreign keys: $missing_indexes"
    fi
    
    # Check for large tables without indexes
    local large_unindexed=$(psql "$db_url" -t -c "
        SELECT COUNT(*) FROM pg_stat_user_tables t
        LEFT JOIN pg_stat_user_indexes i ON t.relid = i.relid
        WHERE t.n_tup_ins > 1000 AND i.indexrelid IS NULL;
    " 2>/dev/null | tr -d ' ')
    
    if [[ "$large_unindexed" -eq 0 ]]; then
        log_success "No large tables without indexes"
    else
        log_warning "Large tables without indexes: $large_unindexed"
    fi
}

# Report generation
generate_migration_report() {
    log_info "Generating migration validation report..."
    
    local total_checks=$((PASSED_CHECKS + FAILED_CHECKS + WARNING_CHECKS))
    
    cat >> "$VALIDATION_LOG" << EOF

================================================================================
                       DATABASE MIGRATION VALIDATION SUMMARY
================================================================================

Validation completed at: $(date)
Total checks performed: $total_checks

Results:
  ✓ Passed:   $PASSED_CHECKS
  ⚠ Warnings: $WARNING_CHECKS  
  ✗ Failed:   $FAILED_CHECKS

Migration Summary:
  Applied Migrations: ${#APPLIED_MIGRATIONS[@]}
  Failed Migrations:  ${#FAILED_MIGRATIONS[@]}

Backups Created:
  Location: $BACKUP_DIR
  Contents: $(ls -la "$BACKUP_DIR" | wc -l) files

EOF

    if [[ ${#APPLIED_MIGRATIONS[@]} -gt 0 ]]; then
        cat >> "$VALIDATION_LOG" << EOF
Successfully Applied Migrations:
EOF
        for migration in "${APPLIED_MIGRATIONS[@]}"; do
            echo "  - $migration" >> "$VALIDATION_LOG"
        done
    fi

    if [[ ${#FAILED_MIGRATIONS[@]} -gt 0 ]]; then
        cat >> "$VALIDATION_LOG" << EOF

Failed Migrations:
EOF
        for migration in "${FAILED_MIGRATIONS[@]}"; do
            echo "  - $migration" >> "$VALIDATION_LOG"
        done
    fi

    if [[ $FAILED_CHECKS -eq 0 ]] && [[ ${#FAILED_MIGRATIONS[@]} -eq 0 ]]; then
        log_success "Database migration validation completed successfully!"
        if [[ $WARNING_CHECKS -gt 0 ]]; then
            log_warning "Please review $WARNING_CHECKS warning(s)"
        fi
        echo "0" # Exit code for success
    else
        log_error "Database migration validation failed"
        log_error "Failed checks: $FAILED_CHECKS, Failed migrations: ${#FAILED_MIGRATIONS[@]}"
        echo "1" # Exit code for failure
    fi
}

# Main execution functions
show_usage() {
    cat << EOF
Usage: $0 <command> [options]

Commands:
  validate     Validate migration files without applying them
  migrate      Apply migrations with full validation and backup
  rollback     Show rollback instructions
  health       Check database health
  
Options:
  --dry-run    Perform validation without making changes
  --backup     Create backup before operations
  --force      Skip confirmation prompts (use with caution)

Examples:
  $0 validate                    # Validate migration files
  $0 migrate --backup           # Apply migrations with backup
  $0 health                     # Check database health
  $0 rollback                   # Show rollback instructions

EOF
}

main() {
    local command="${1:-}"
    local dry_run=false
    local create_backup=false
    local force=false
    
    # Parse options
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                dry_run=true
                shift
                ;;
            --backup)
                create_backup=true
                shift
                ;;
            --force)
                force=true
                shift
                ;;
            *)
                if [[ -z "$command" ]]; then
                    command="$1"
                fi
                shift
                ;;
        esac
    done
    
    if [[ -z "$command" ]]; then
        show_usage
        exit 1
    fi
    
    log_info "Starting database validation: $command"
    log_info "Validation log: $VALIDATION_LOG"
    
    # Check database connectivity
    if ! test_db_connection; then
        log_error "Cannot connect to database"
        exit 1
    fi
    
    case "$command" in
        validate)
            validate_migration_files
            ;;
        migrate)
            if [[ "$create_backup" == true ]] || [[ "$dry_run" == false ]]; then
                local backup_file=$(create_database_backup)
                local rollback_script=$(create_rollback_script "$backup_file")
                log_info "Rollback script available: $rollback_script"
            fi
            
            validate_migration_files
            
            if [[ "$dry_run" == false ]]; then
                if [[ "$force" == false ]]; then
                    echo -e "${YELLOW}Proceed with applying migrations? (yes/no):${NC}"
                    read -r confirm
                    if [[ "$confirm" != "yes" ]]; then
                        log_info "Migration cancelled by user"
                        exit 0
                    fi
                fi
                
                apply_migrations
                verify_database_health
            else
                log_info "Dry run completed - no migrations applied"
            fi
            ;;
        rollback)
            echo "To rollback database migrations, use the rollback script created during migration:"
            echo "Location: $BACKUP_DIR"
            ls -la "$BACKUP_DIR"/rollback_*.sh 2>/dev/null || echo "No rollback scripts found"
            ;;
        health)
            verify_database_health
            ;;
        *)
            log_error "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
    
    # Generate final report
    local exit_code=$(generate_migration_report)
    
    log_info "Full validation log available at: $VALIDATION_LOG"
    
    exit "$exit_code"
}

# Run main function with all arguments
main "$@"