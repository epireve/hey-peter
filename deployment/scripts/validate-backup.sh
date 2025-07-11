#!/bin/bash

# Backup and Recovery Testing Script for HeyPeter Academy LMS
# Tests backup creation, restoration, and validates backup integrity

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
BACKUP_DIR="$DEPLOYMENT_DIR/backups"
VALIDATION_LOG="$DEPLOYMENT_DIR/reports/backup-validation-$(date +%Y%m%d_%H%M%S).log"
TEST_BACKUP_DIR="$BACKUP_DIR/validation-test-$(date +%Y%m%d_%H%M%S)"

# Create necessary directories
mkdir -p "$DEPLOYMENT_DIR/reports"
mkdir -p "$BACKUP_DIR"
mkdir -p "$TEST_BACKUP_DIR"

# Initialize counters
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Backup configuration
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
DATABASE_BACKUP_FORMAT="${DATABASE_BACKUP_FORMAT:-custom}"
COMPRESSION_ENABLED="${COMPRESSION_ENABLED:-true}"

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

# Backup configuration validation
validate_backup_configuration() {
    log_info "Validating backup configuration..."
    
    local backup_config="$DEPLOYMENT_DIR/backup/backup-config.yml"
    
    if [[ -f "$backup_config" ]]; then
        # Check YAML syntax
        if command -v python3 >/dev/null 2>&1; then
            if python3 -c "import yaml; yaml.safe_load(open('$backup_config'))" 2>/dev/null; then
                log_success "Backup configuration YAML syntax is valid"
            else
                log_error "Backup configuration YAML syntax is invalid"
                return 1
            fi
        else
            log_warning "python3 not available for YAML validation"
        fi
        
        # Check required configuration sections
        check_backup_config_sections "$backup_config"
        
        # Validate backup schedules
        validate_backup_schedules "$backup_config"
        
        # Check storage configuration
        validate_storage_configuration "$backup_config"
        
        # Check retention policies
        validate_retention_policies "$backup_config"
        
    else
        log_warning "Backup configuration file not found: $backup_config"
    fi
    
    # Check backup scripts
    validate_backup_scripts
}

check_backup_config_sections() {
    local config_file="$1"
    
    log_info "Checking backup configuration sections..."
    
    local required_sections=(
        "database:"
        "files:"
        "schedule:"
        "retention:"
        "storage:"
    )
    
    for section in "${required_sections[@]}"; do
        if grep -q "$section" "$config_file"; then
            log_success "Required section found: $section"
        else
            log_error "Required section missing: $section"
        fi
    done
    
    # Check optional sections
    local optional_sections=(
        "notification:"
        "encryption:"
        "compression:"
    )
    
    for section in "${optional_sections[@]}"; do
        if grep -q "$section" "$config_file"; then
            log_success "Optional section found: $section"
        else
            log_info "Optional section not found: $section"
        fi
    done
}

validate_backup_schedules() {
    local config_file="$1"
    
    log_info "Validating backup schedules..."
    
    # Check for cron expressions
    if grep -q "cron:" "$config_file"; then
        log_success "Cron schedule configuration found"
        
        # Extract and validate cron expressions
        local cron_expressions=($(grep -o "cron:.*" "$config_file" | awk '{print $2}' | tr -d '"'))
        
        for cron_expr in "${cron_expressions[@]}"; do
            if validate_cron_expression "$cron_expr"; then
                log_success "Valid cron expression: $cron_expr"
            else
                log_warning "Invalid cron expression: $cron_expr"
            fi
        done
    else
        log_warning "No cron schedule configuration found"
    fi
    
    # Check for interval-based schedules
    if grep -q "interval:" "$config_file"; then
        log_success "Interval-based schedule configuration found"
    fi
}

validate_cron_expression() {
    local cron_expr="$1"
    
    # Basic validation of cron expression format
    local field_count=$(echo "$cron_expr" | awk '{print NF}')
    
    if [[ $field_count -eq 5 ]] || [[ $field_count -eq 6 ]]; then
        return 0
    else
        return 1
    fi
}

validate_storage_configuration() {
    local config_file="$1"
    
    log_info "Validating storage configuration..."
    
    # Check for local storage
    if grep -q "local:" "$config_file"; then
        log_success "Local storage configuration found"
        
        # Check local path
        if grep -q "path:" "$config_file"; then
            local backup_path=$(grep "path:" "$config_file" | head -1 | awk '{print $2}' | tr -d '"')
            if [[ -d "$backup_path" ]] || mkdir -p "$backup_path" 2>/dev/null; then
                log_success "Local backup path accessible: $backup_path"
            else
                log_error "Local backup path not accessible: $backup_path"
            fi
        fi
    fi
    
    # Check for cloud storage
    if grep -q "s3:" "$config_file" || grep -q "cloud:" "$config_file"; then
        log_success "Cloud storage configuration found"
        
        # Check AWS credentials
        if [[ -n "${AWS_ACCESS_KEY_ID:-}" ]] && [[ -n "${AWS_SECRET_ACCESS_KEY:-}" ]]; then
            log_success "AWS credentials available"
        else
            log_warning "AWS credentials not configured"
        fi
    fi
}

validate_retention_policies() {
    local config_file="$1"
    
    log_info "Validating retention policies..."
    
    # Check retention settings
    if grep -q "daily:" "$config_file"; then
        local daily_retention=$(grep "daily:" "$config_file" | awk '{print $2}')
        log_success "Daily retention configured: $daily_retention"
    fi
    
    if grep -q "weekly:" "$config_file"; then
        local weekly_retention=$(grep "weekly:" "$config_file" | awk '{print $2}')
        log_success "Weekly retention configured: $weekly_retention"
    fi
    
    if grep -q "monthly:" "$config_file"; then
        local monthly_retention=$(grep "monthly:" "$config_file" | awk '{print $2}')
        log_success "Monthly retention configured: $monthly_retention"
    fi
    
    # Check for minimum retention
    if grep -q "minimum:" "$config_file"; then
        local minimum_retention=$(grep "minimum:" "$config_file" | awk '{print $2}')
        log_success "Minimum retention configured: $minimum_retention"
    else
        log_warning "No minimum retention policy configured"
    fi
}

validate_backup_scripts() {
    log_info "Validating backup scripts..."
    
    local backup_scripts=(
        "$DEPLOYMENT_DIR/backup/backup-manager.sh"
        "$DEPLOYMENT_DIR/backup/setup-backup.sh"
    )
    
    for script in "${backup_scripts[@]}"; do
        if [[ -f "$script" ]]; then
            log_success "Backup script found: $(basename "$script")"
            
            # Check execute permissions
            if [[ -x "$script" ]]; then
                log_success "Backup script is executable: $(basename "$script")"
            else
                log_warning "Backup script is not executable: $(basename "$script")"
                chmod +x "$script" 2>/dev/null && log_success "Fixed execute permission" || log_error "Failed to fix permission"
            fi
            
            # Basic script validation
            if bash -n "$script" 2>/dev/null; then
                log_success "Backup script syntax is valid: $(basename "$script")"
            else
                log_error "Backup script syntax error: $(basename "$script")"
            fi
        else
            log_warning "Backup script not found: $(basename "$script")"
        fi
    done
}

# Database backup testing
test_database_backup() {
    log_info "Testing database backup functionality..."
    
    # Get database connection
    local db_url=$(get_database_connection)
    
    if [[ -z "$db_url" ]]; then
        log_error "No database connection available for backup testing"
        return 1
    fi
    
    # Test database connectivity
    if ! test_database_connectivity "$db_url"; then
        log_error "Cannot connect to database for backup testing"
        return 1
    fi
    
    # Create test backup
    create_test_database_backup "$db_url"
    
    # Validate backup integrity
    validate_backup_integrity
    
    # Test backup restoration (to a test database if possible)
    test_backup_restoration
}

get_database_connection() {
    if [[ -n "${DATABASE_URL:-}" ]]; then
        echo "$DATABASE_URL"
    elif [[ -n "${SUPABASE_DB_URL:-}" ]]; then
        echo "$SUPABASE_DB_URL"
    else
        log_warning "No database connection URL found"
        return 1
    fi
}

test_database_connectivity() {
    local db_url="$1"
    
    log_info "Testing database connectivity..."
    
    if command -v psql >/dev/null 2>&1; then
        if psql "$db_url" -c "SELECT 1;" >/dev/null 2>&1; then
            log_success "Database connectivity test passed"
            return 0
        else
            log_error "Database connectivity test failed"
            return 1
        fi
    else
        log_error "psql not available for database testing"
        return 1
    fi
}

create_test_database_backup() {
    local db_url="$1"
    
    log_info "Creating test database backup..."
    
    local test_backup_file="$TEST_BACKUP_DIR/test_database_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    if command -v pg_dump >/dev/null 2>&1; then
        local start_time=$(date +%s)
        
        if pg_dump "$db_url" > "$test_backup_file" 2>/dev/null; then
            local end_time=$(date +%s)
            local backup_duration=$((end_time - start_time))
            local backup_size=$(du -h "$test_backup_file" | cut -f1)
            
            log_success "Test database backup created successfully"
            log_info "Backup file: $test_backup_file"
            log_info "Backup size: $backup_size"
            log_info "Backup duration: ${backup_duration}s"
            
            # Store backup info for validation
            echo "$test_backup_file" > "$TEST_BACKUP_DIR/last_backup.txt"
            
        else
            log_error "Failed to create test database backup"
            return 1
        fi
    else
        log_error "pg_dump not available for database backup"
        return 1
    fi
}

validate_backup_integrity() {
    log_info "Validating backup integrity..."
    
    local backup_file
    if [[ -f "$TEST_BACKUP_DIR/last_backup.txt" ]]; then
        backup_file=$(cat "$TEST_BACKUP_DIR/last_backup.txt")
    else
        log_error "No backup file reference found"
        return 1
    fi
    
    if [[ ! -f "$backup_file" ]]; then
        log_error "Backup file not found: $backup_file"
        return 1
    fi
    
    # Check file size
    local file_size=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file" 2>/dev/null || echo "0")
    
    if [[ $file_size -gt 0 ]]; then
        log_success "Backup file has valid size: $(du -h "$backup_file" | cut -f1)"
    else
        log_error "Backup file is empty or corrupted"
        return 1
    fi
    
    # Check SQL syntax (basic)
    if head -10 "$backup_file" | grep -q "PostgreSQL database dump"; then
        log_success "Backup file appears to be a valid PostgreSQL dump"
    else
        log_warning "Backup file format could not be verified"
    fi
    
    # Check for critical tables in backup
    check_backup_content "$backup_file"
    
    # Calculate and store checksum
    create_backup_checksum "$backup_file"
}

check_backup_content() {
    local backup_file="$1"
    
    log_info "Checking backup content..."
    
    # List of critical tables to check for
    local critical_tables=(
        "students"
        "teachers"
        "courses"
        "classes"
        "enrollments"
        "users"
    )
    
    local tables_found=0
    
    for table in "${critical_tables[@]}"; do
        if grep -q "CREATE TABLE.*$table\|COPY.*$table" "$backup_file"; then
            log_success "Critical table found in backup: $table"
            ((tables_found++))
        else
            log_warning "Critical table not found in backup: $table"
        fi
    done
    
    if [[ $tables_found -gt 0 ]]; then
        log_success "Backup contains $tables_found critical tables"
    else
        log_error "Backup does not contain any critical tables"
    fi
    
    # Check for data (not just schema)
    local insert_count=$(grep -c "INSERT INTO\|COPY.*FROM" "$backup_file" || echo "0")
    
    if [[ $insert_count -gt 0 ]]; then
        log_success "Backup contains data: $insert_count data operations"
    else
        log_warning "Backup appears to be schema-only"
    fi
}

create_backup_checksum() {
    local backup_file="$1"
    
    log_info "Creating backup checksum..."
    
    local checksum_file="${backup_file}.sha256"
    
    if command -v sha256sum >/dev/null 2>&1; then
        sha256sum "$backup_file" > "$checksum_file"
        log_success "Backup checksum created: $(basename "$checksum_file")"
    elif command -v shasum >/dev/null 2>&1; then
        shasum -a 256 "$backup_file" > "$checksum_file"
        log_success "Backup checksum created: $(basename "$checksum_file")"
    else
        log_warning "No checksum utility available"
    fi
}

test_backup_restoration() {
    log_info "Testing backup restoration..."
    
    local backup_file
    if [[ -f "$TEST_BACKUP_DIR/last_backup.txt" ]]; then
        backup_file=$(cat "$TEST_BACKUP_DIR/last_backup.txt")
    else
        log_error "No backup file reference found for restoration test"
        return 1
    fi
    
    # Create a test database for restoration
    local test_db_name="heypeter_backup_test_$(date +%s)"
    local db_url=$(get_database_connection)
    
    if [[ -z "$db_url" ]]; then
        log_error "No database connection for restoration test"
        return 1
    fi
    
    # Extract connection parameters
    local base_db_url=$(echo "$db_url" | sed 's|/[^/]*$|/postgres|')
    
    log_info "Creating test database for restoration: $test_db_name"
    
    if command -v psql >/dev/null 2>&1; then
        # Create test database
        if psql "$base_db_url" -c "CREATE DATABASE $test_db_name;" >/dev/null 2>&1; then
            log_success "Test database created: $test_db_name"
            
            # Construct test database URL
            local test_db_url=$(echo "$db_url" | sed "s|/[^/]*$|/$test_db_name|")
            
            # Attempt restoration
            local start_time=$(date +%s)
            
            if psql "$test_db_url" < "$backup_file" >/dev/null 2>&1; then
                local end_time=$(date +%s)
                local restore_duration=$((end_time - start_time))
                
                log_success "Backup restoration completed successfully"
                log_info "Restoration duration: ${restore_duration}s"
                
                # Verify restored data
                verify_restored_data "$test_db_url"
                
            else
                log_error "Backup restoration failed"
            fi
            
            # Cleanup test database
            log_info "Cleaning up test database: $test_db_name"
            psql "$base_db_url" -c "DROP DATABASE $test_db_name;" >/dev/null 2>&1 || log_warning "Failed to cleanup test database"
            
        else
            log_error "Failed to create test database for restoration"
        fi
    else
        log_error "psql not available for restoration testing"
    fi
}

verify_restored_data() {
    local test_db_url="$1"
    
    log_info "Verifying restored data..."
    
    # Check table count
    local table_count
    table_count=$(psql "$test_db_url" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
    
    if [[ -n "$table_count" ]] && [[ $table_count -gt 0 ]]; then
        log_success "Restored database contains $table_count tables"
    else
        log_error "Restored database contains no tables"
        return 1
    fi
    
    # Check for specific tables
    local critical_tables=(
        "students"
        "teachers"
        "courses"
    )
    
    for table in "${critical_tables[@]}"; do
        local exists
        exists=$(psql "$test_db_url" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table');" 2>/dev/null | tr -d ' ')
        
        if [[ "$exists" == "t" ]]; then
            log_success "Restored table exists: $table"
            
            # Check row count
            local row_count
            row_count=$(psql "$test_db_url" -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | tr -d ' ')
            
            if [[ -n "$row_count" ]]; then
                log_info "Table $table has $row_count rows"
            fi
        else
            log_warning "Restored table missing: $table"
        fi
    done
}

# File backup testing
test_file_backup() {
    log_info "Testing file backup functionality..."
    
    # Create test files for backup
    create_test_files
    
    # Test file backup creation
    create_test_file_backup
    
    # Test file backup restoration
    test_file_backup_restoration
    
    # Test backup compression
    test_backup_compression
}

create_test_files() {
    log_info "Creating test files for backup testing..."
    
    local test_files_dir="$TEST_BACKUP_DIR/test_files"
    mkdir -p "$test_files_dir"
    
    # Create various test files
    echo "Test configuration file" > "$test_files_dir/config.txt"
    echo "Test log entry $(date)" > "$test_files_dir/application.log"
    
    # Create a directory structure
    mkdir -p "$test_files_dir/uploads/images"
    echo "Test image data" > "$test_files_dir/uploads/images/test.jpg"
    
    # Create some larger files
    dd if=/dev/zero of="$test_files_dir/large_file.dat" bs=1M count=1 2>/dev/null || echo "Large test file" > "$test_files_dir/large_file.dat"
    
    log_success "Test files created in: $test_files_dir"
}

create_test_file_backup() {
    log_info "Creating test file backup..."
    
    local test_files_dir="$TEST_BACKUP_DIR/test_files"
    local backup_archive="$TEST_BACKUP_DIR/files_backup_$(date +%Y%m%d_%H%M%S).tar.gz"
    
    if command -v tar >/dev/null 2>&1; then
        local start_time=$(date +%s)
        
        if tar -czf "$backup_archive" -C "$TEST_BACKUP_DIR" test_files 2>/dev/null; then
            local end_time=$(date +%s)
            local backup_duration=$((end_time - start_time))
            local backup_size=$(du -h "$backup_archive" | cut -f1)
            
            log_success "File backup created successfully"
            log_info "Backup archive: $backup_archive"
            log_info "Backup size: $backup_size"
            log_info "Backup duration: ${backup_duration}s"
            
            # Store backup info
            echo "$backup_archive" > "$TEST_BACKUP_DIR/last_file_backup.txt"
            
        else
            log_error "Failed to create file backup"
            return 1
        fi
    else
        log_error "tar not available for file backup"
        return 1
    fi
}

test_file_backup_restoration() {
    log_info "Testing file backup restoration..."
    
    local backup_archive
    if [[ -f "$TEST_BACKUP_DIR/last_file_backup.txt" ]]; then
        backup_archive=$(cat "$TEST_BACKUP_DIR/last_file_backup.txt")
    else
        log_error "No file backup reference found"
        return 1
    fi
    
    local restore_dir="$TEST_BACKUP_DIR/restore_test"
    mkdir -p "$restore_dir"
    
    if command -v tar >/dev/null 2>&1; then
        local start_time=$(date +%s)
        
        if tar -xzf "$backup_archive" -C "$restore_dir" 2>/dev/null; then
            local end_time=$(date +%s)
            local restore_duration=$((end_time - start_time))
            
            log_success "File backup restoration completed"
            log_info "Restoration duration: ${restore_duration}s"
            
            # Verify restored files
            verify_restored_files "$restore_dir"
            
        else
            log_error "File backup restoration failed"
        fi
    else
        log_error "tar not available for file restoration"
    fi
}

verify_restored_files() {
    local restore_dir="$1"
    
    log_info "Verifying restored files..."
    
    local expected_files=(
        "test_files/config.txt"
        "test_files/application.log"
        "test_files/uploads/images/test.jpg"
        "test_files/large_file.dat"
    )
    
    local files_found=0
    
    for file in "${expected_files[@]}"; do
        if [[ -f "$restore_dir/$file" ]]; then
            log_success "Restored file found: $file"
            ((files_found++))
        else
            log_error "Restored file missing: $file"
        fi
    done
    
    if [[ $files_found -eq ${#expected_files[@]} ]]; then
        log_success "All expected files were restored successfully"
    else
        log_error "File restoration incomplete: $files_found/${#expected_files[@]} files"
    fi
}

test_backup_compression() {
    log_info "Testing backup compression..."
    
    local test_files_dir="$TEST_BACKUP_DIR/test_files"
    
    if [[ ! -d "$test_files_dir" ]]; then
        log_warning "No test files directory found for compression testing"
        return 0
    fi
    
    # Create uncompressed backup
    local uncompressed_backup="$TEST_BACKUP_DIR/uncompressed_backup.tar"
    local compressed_backup="$TEST_BACKUP_DIR/compressed_backup.tar.gz"
    
    if command -v tar >/dev/null 2>&1; then
        # Create uncompressed backup
        if tar -cf "$uncompressed_backup" -C "$TEST_BACKUP_DIR" test_files 2>/dev/null; then
            local uncompressed_size=$(stat -f%z "$uncompressed_backup" 2>/dev/null || stat -c%s "$uncompressed_backup" 2>/dev/null || echo "0")
            
            # Create compressed backup
            if tar -czf "$compressed_backup" -C "$TEST_BACKUP_DIR" test_files 2>/dev/null; then
                local compressed_size=$(stat -f%z "$compressed_backup" 2>/dev/null || stat -c%s "$compressed_backup" 2>/dev/null || echo "0")
                
                if [[ $uncompressed_size -gt 0 ]] && [[ $compressed_size -gt 0 ]]; then
                    local compression_ratio=$((100 - (compressed_size * 100 / uncompressed_size)))
                    
                    log_success "Compression test completed"
                    log_info "Uncompressed size: $(du -h "$uncompressed_backup" | cut -f1)"
                    log_info "Compressed size: $(du -h "$compressed_backup" | cut -f1)"
                    log_info "Compression ratio: ${compression_ratio}%"
                    
                    if [[ $compression_ratio -gt 10 ]]; then
                        log_success "Good compression ratio achieved: ${compression_ratio}%"
                    else
                        log_warning "Low compression ratio: ${compression_ratio}%"
                    fi
                else
                    log_error "Failed to calculate compression ratio"
                fi
            else
                log_error "Failed to create compressed backup"
            fi
        else
            log_error "Failed to create uncompressed backup"
        fi
    fi
}

# Backup automation testing
test_backup_automation() {
    log_info "Testing backup automation..."
    
    # Check cron service
    check_cron_service
    
    # Validate cron jobs
    validate_backup_cron_jobs
    
    # Test backup script execution
    test_backup_script_execution
    
    # Check backup monitoring
    check_backup_monitoring
}

check_cron_service() {
    log_info "Checking cron service..."
    
    if command -v systemctl >/dev/null 2>&1; then
        if systemctl is-active cron >/dev/null 2>&1 || systemctl is-active crond >/dev/null 2>&1; then
            log_success "Cron service is running"
        else
            log_error "Cron service is not running"
        fi
    elif command -v service >/dev/null 2>&1; then
        if service cron status >/dev/null 2>&1 || service crond status >/dev/null 2>&1; then
            log_success "Cron service is running"
        else
            log_error "Cron service is not running"
        fi
    else
        log_warning "Cannot check cron service status"
    fi
}

validate_backup_cron_jobs() {
    log_info "Validating backup cron jobs..."
    
    # Check if backup cron jobs are installed
    if crontab -l 2>/dev/null | grep -q "backup"; then
        log_success "Backup cron jobs found"
        
        # List backup-related cron jobs
        local backup_jobs
        backup_jobs=$(crontab -l 2>/dev/null | grep "backup" || echo "")
        
        if [[ -n "$backup_jobs" ]]; then
            log_info "Backup cron jobs:"
            echo "$backup_jobs" | while read -r job; do
                log_info "  $job"
            done
        fi
    else
        log_warning "No backup cron jobs found"
    fi
}

test_backup_script_execution() {
    log_info "Testing backup script execution..."
    
    local backup_script="$DEPLOYMENT_DIR/backup/backup-manager.sh"
    
    if [[ -f "$backup_script" ]] && [[ -x "$backup_script" ]]; then
        log_info "Testing backup script: $(basename "$backup_script")"
        
        # Test dry run if supported
        if "$backup_script" --help 2>/dev/null | grep -q "dry-run\|test"; then
            if "$backup_script" --dry-run >/dev/null 2>&1 || "$backup_script" --test >/dev/null 2>&1; then
                log_success "Backup script dry run completed successfully"
            else
                log_warning "Backup script dry run failed or not supported"
            fi
        else
            log_info "Backup script does not support dry run testing"
        fi
    else
        log_warning "Backup script not found or not executable"
    fi
}

check_backup_monitoring() {
    log_info "Checking backup monitoring..."
    
    # Check for backup log files
    local log_locations=(
        "/var/log/backup.log"
        "$BACKUP_DIR/backup.log"
        "$DEPLOYMENT_DIR/logs/backup.log"
    )
    
    local log_found=false
    
    for log_location in "${log_locations[@]}"; do
        if [[ -f "$log_location" ]]; then
            log_success "Backup log file found: $log_location"
            log_found=true
            
            # Check log file size and recent entries
            local log_size=$(du -h "$log_location" | cut -f1)
            log_info "Log file size: $log_size"
            
            # Check for recent log entries (last 24 hours)
            if find "$log_location" -mtime -1 -type f >/dev/null 2>&1; then
                log_success "Backup log has recent entries"
            else
                log_warning "Backup log has no recent entries"
            fi
        fi
    done
    
    if [[ "$log_found" == false ]]; then
        log_warning "No backup log files found"
    fi
    
    # Check for backup monitoring alerts
    if [[ -f "$DEPLOYMENT_DIR/monitoring/alert_rules.yml" ]]; then
        if grep -q "backup" "$DEPLOYMENT_DIR/monitoring/alert_rules.yml"; then
            log_success "Backup monitoring alerts configured"
        else
            log_warning "No backup monitoring alerts found"
        fi
    fi
}

# Recovery testing
test_disaster_recovery() {
    log_info "Testing disaster recovery procedures..."
    
    # Test recovery documentation
    validate_recovery_documentation
    
    # Test recovery procedures
    test_recovery_procedures
    
    # Calculate recovery metrics
    calculate_recovery_metrics
}

validate_recovery_documentation() {
    log_info "Validating recovery documentation..."
    
    local recovery_docs=(
        "$DEPLOYMENT_DIR/backup/RECOVERY.md"
        "$DEPLOYMENT_DIR/DISASTER_RECOVERY.md"
        "$PROJECT_ROOT/docs/disaster-recovery.md"
    )
    
    local docs_found=false
    
    for doc in "${recovery_docs[@]}"; do
        if [[ -f "$doc" ]]; then
            log_success "Recovery documentation found: $(basename "$doc")"
            docs_found=true
            
            # Check document content
            if grep -q "RTO\|RPO\|Recovery Time\|Recovery Point" "$doc"; then
                log_success "Document contains RTO/RPO information"
            else
                log_warning "Document missing RTO/RPO information"
            fi
            
            if grep -q "step\|procedure\|instruction" "$doc"; then
                log_success "Document contains recovery procedures"
            else
                log_warning "Document missing recovery procedures"
            fi
        fi
    done
    
    if [[ "$docs_found" == false ]]; then
        log_warning "No recovery documentation found"
    fi
}

test_recovery_procedures() {
    log_info "Testing recovery procedures..."
    
    # This would typically involve:
    # 1. Simulating various failure scenarios
    # 2. Following recovery procedures
    # 3. Measuring recovery times
    
    # For this validation, we'll check if recovery scripts exist
    local recovery_scripts=(
        "$DEPLOYMENT_DIR/backup/restore-database.sh"
        "$DEPLOYMENT_DIR/backup/restore-files.sh"
        "$DEPLOYMENT_DIR/scripts/disaster-recovery.sh"
    )
    
    for script in "${recovery_scripts[@]}"; do
        if [[ -f "$script" ]]; then
            log_success "Recovery script found: $(basename "$script")"
            
            if [[ -x "$script" ]]; then
                log_success "Recovery script is executable"
            else
                log_warning "Recovery script is not executable"
            fi
            
            # Check script syntax
            if bash -n "$script" 2>/dev/null; then
                log_success "Recovery script syntax is valid"
            else
                log_error "Recovery script has syntax errors"
            fi
        else
            log_warning "Recovery script not found: $(basename "$script")"
        fi
    done
}

calculate_recovery_metrics() {
    log_info "Calculating recovery metrics..."
    
    # Estimate Recovery Time Objective (RTO)
    local estimated_rto="4 hours"  # Based on typical restoration times
    log_info "Estimated RTO: $estimated_rto"
    
    # Estimate Recovery Point Objective (RPO)
    local backup_frequency="24 hours"  # Based on daily backups
    log_info "Estimated RPO: $backup_frequency"
    
    # Check if metrics are documented
    if [[ -f "$DEPLOYMENT_DIR/backup/backup-config.yml" ]]; then
        if grep -q "rto\|RTO" "$DEPLOYMENT_DIR/backup/backup-config.yml"; then
            log_success "RTO is documented in configuration"
        else
            log_warning "RTO not documented in configuration"
        fi
        
        if grep -q "rpo\|RPO" "$DEPLOYMENT_DIR/backup/backup-config.yml"; then
            log_success "RPO is documented in configuration"
        else
            log_warning "RPO not documented in configuration"
        fi
    fi
}

# Cleanup function
cleanup_test_environment() {
    log_info "Cleaning up test environment..."
    
    # Remove test backup directory
    if [[ -d "$TEST_BACKUP_DIR" ]]; then
        rm -rf "$TEST_BACKUP_DIR" 2>/dev/null || log_warning "Failed to remove test backup directory"
        log_success "Test backup directory cleaned up"
    fi
}

# Report generation
generate_backup_report() {
    log_info "Generating backup validation report..."
    
    local total_checks=$((PASSED_CHECKS + FAILED_CHECKS + WARNING_CHECKS))
    
    cat >> "$VALIDATION_LOG" << EOF

================================================================================
                        BACKUP VALIDATION SUMMARY
================================================================================

Validation completed at: $(date)
Total checks performed: $total_checks

Results:
  ✓ Passed:   $PASSED_CHECKS
  ⚠ Warnings: $WARNING_CHECKS  
  ✗ Failed:   $FAILED_CHECKS

Backup Components Tested:
  - Backup Configuration
  - Database Backup/Restore
  - File Backup/Restore
  - Backup Automation
  - Disaster Recovery

EOF

    # Backup recommendations
    if [[ $FAILED_CHECKS -gt 0 ]] || [[ $WARNING_CHECKS -gt 0 ]]; then
        cat >> "$VALIDATION_LOG" << EOF

BACKUP RECOMMENDATIONS:
- Address all failed backup checks before deployment
- Review warnings and implement missing configurations
- Test backup restoration procedures regularly
- Implement monitoring for backup processes
- Document recovery procedures and RTO/RPO targets
- Consider offsite backup storage for disaster recovery
- Automate backup integrity checks
- Train team members on recovery procedures

BACKUP BEST PRACTICES:
- Maintain multiple backup copies (3-2-1 rule)
- Test backups regularly through restoration
- Monitor backup success/failure rates
- Implement backup encryption for sensitive data
- Document and practice disaster recovery procedures
- Keep backup software and procedures updated

EOF
    fi

    if [[ $FAILED_CHECKS -eq 0 ]]; then
        log_success "Backup validation completed successfully!"
        if [[ $WARNING_CHECKS -gt 0 ]]; then
            log_warning "Please review $WARNING_CHECKS warning(s) for optimal backup setup"
        fi
        echo "0" # Exit code for success
    else
        log_error "Backup validation failed with $FAILED_CHECKS critical issue(s)"
        log_error "Please address all failed checks before proceeding with deployment"
        echo "1" # Exit code for failure
    fi
}

# Main execution
show_usage() {
    cat << EOF
Usage: $0 [options]

Options:
  --config     Only validate backup configuration
  --database   Only test database backup/restore
  --files      Only test file backup/restore
  --automation Only test backup automation
  --recovery   Only test disaster recovery
  --all        Run all backup tests (default)

Examples:
  $0                    # Run all backup validations
  $0 --database        # Only test database backup
  $0 --config          # Only validate configuration

EOF
}

main() {
    local config_only=false
    local database_only=false
    local files_only=false
    local automation_only=false
    local recovery_only=false
    local run_all=true
    
    # Parse options
    while [[ $# -gt 0 ]]; do
        case $1 in
            --config)
                config_only=true
                run_all=false
                shift
                ;;
            --database)
                database_only=true
                run_all=false
                shift
                ;;
            --files)
                files_only=true
                run_all=false
                shift
                ;;
            --automation)
                automation_only=true
                run_all=false
                shift
                ;;
            --recovery)
                recovery_only=true
                run_all=false
                shift
                ;;
            --all)
                run_all=true
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    log_info "Starting backup and recovery validation"
    log_info "Validation log: $VALIDATION_LOG"
    log_info "Test backup directory: $TEST_BACKUP_DIR"
    
    # Run selected validations
    if [[ "$config_only" == true ]] || [[ "$run_all" == true ]]; then
        validate_backup_configuration
    fi
    
    if [[ "$database_only" == true ]] || [[ "$run_all" == true ]]; then
        test_database_backup
    fi
    
    if [[ "$files_only" == true ]] || [[ "$run_all" == true ]]; then
        test_file_backup
    fi
    
    if [[ "$automation_only" == true ]] || [[ "$run_all" == true ]]; then
        test_backup_automation
    fi
    
    if [[ "$recovery_only" == true ]] || [[ "$run_all" == true ]]; then
        test_disaster_recovery
    fi
    
    # Cleanup test environment
    cleanup_test_environment
    
    # Generate final report
    local exit_code=$(generate_backup_report)
    
    log_info "Full validation log available at: $VALIDATION_LOG"
    
    exit "$exit_code"
}

# Run main function with all arguments
main "$@"