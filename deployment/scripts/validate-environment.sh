#!/bin/bash

# Environment Configuration Validation Script for HeyPeter Academy LMS
# This script validates all environment configurations before deployment

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
VALIDATION_LOG="$DEPLOYMENT_DIR/reports/environment-validation-$(date +%Y%m%d_%H%M%S).log"

# Create reports directory if it doesn't exist
mkdir -p "$DEPLOYMENT_DIR/reports"

# Initialize counters
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

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

# Validation functions
check_environment_file() {
    local env_file="$1"
    local env_name="$2"
    
    log_info "Validating $env_name environment file: $env_file"
    
    if [[ ! -f "$env_file" ]]; then
        log_error "Environment file not found: $env_file"
        return 1
    fi
    
    log_success "Environment file exists: $env_file"
    
    # Source the environment file for validation
    set -a
    source "$env_file" 2>/dev/null || {
        log_error "Failed to source environment file: $env_file"
        return 1
    }
    set +a
    
    return 0
}

validate_required_variables() {
    log_info "Validating required environment variables..."
    
    local required_vars=(
        "NODE_ENV"
        "NEXT_PUBLIC_APP_URL"
        "NEXT_PUBLIC_SUPABASE_URL"
        "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        "SUPABASE_SERVICE_ROLE_KEY"
        "DATABASE_URL"
        "NEXTAUTH_SECRET"
        "NEXTAUTH_URL"
    )
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            log_error "Required variable not set: $var"
        else
            log_success "Required variable set: $var"
        fi
    done
}

validate_optional_variables() {
    log_info "Validating optional environment variables..."
    
    local optional_vars=(
        "EMAIL_SERVER_HOST"
        "EMAIL_SERVER_USER"
        "EMAIL_SERVER_PASSWORD"
        "SLACK_WEBHOOK_URL"
        "AWS_ACCESS_KEY_ID"
        "AWS_SECRET_ACCESS_KEY"
        "SENTRY_DSN"
    )
    
    for var in "${optional_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            log_warning "Optional variable not set: $var"
        else
            log_success "Optional variable set: $var"
        fi
    done
}

validate_url_format() {
    log_info "Validating URL formats..."
    
    local url_vars=(
        "NEXT_PUBLIC_APP_URL"
        "NEXT_PUBLIC_SUPABASE_URL"
        "NEXTAUTH_URL"
        "DATABASE_URL"
    )
    
    for var in "${url_vars[@]}"; do
        local url="${!var:-}"
        if [[ -n "$url" ]]; then
            if [[ "$url" =~ ^https?:// ]]; then
                log_success "Valid URL format for $var: $url"
            else
                log_error "Invalid URL format for $var: $url"
            fi
        fi
    done
}

validate_production_settings() {
    log_info "Validating production-specific settings..."
    
    # Check NODE_ENV
    if [[ "${NODE_ENV:-}" == "production" ]]; then
        log_success "NODE_ENV set to production"
    else
        log_error "NODE_ENV must be set to 'production' for production deployment"
    fi
    
    # Check HTTPS URLs in production
    if [[ "${NEXT_PUBLIC_APP_URL:-}" =~ ^https:// ]]; then
        log_success "Application URL uses HTTPS"
    else
        log_error "Application URL must use HTTPS in production"
    fi
    
    # Check for debug settings
    if [[ "${DEBUG:-}" == "true" ]]; then
        log_warning "DEBUG mode is enabled - consider disabling for production"
    else
        log_success "DEBUG mode disabled or not set"
    fi
}

validate_security_settings() {
    log_info "Validating security settings..."
    
    # Check NEXTAUTH_SECRET length
    if [[ -n "${NEXTAUTH_SECRET:-}" ]]; then
        if [[ ${#NEXTAUTH_SECRET} -ge 32 ]]; then
            log_success "NEXTAUTH_SECRET has adequate length"
        else
            log_error "NEXTAUTH_SECRET should be at least 32 characters long"
        fi
    fi
    
    # Check for default/weak passwords
    local weak_patterns=(
        "password"
        "123456"
        "admin"
        "test"
        "default"
    )
    
    for pattern in "${weak_patterns[@]}"; do
        if [[ "${SUPABASE_SERVICE_ROLE_KEY:-}" == *"$pattern"* ]] || 
           [[ "${EMAIL_SERVER_PASSWORD:-}" == *"$pattern"* ]]; then
            log_warning "Potential weak password detected containing: $pattern"
        fi
    done
}

test_database_connectivity() {
    log_info "Testing database connectivity..."
    
    if [[ -n "${DATABASE_URL:-}" ]]; then
        # Extract connection details from DATABASE_URL
        if command -v psql >/dev/null 2>&1; then
            if psql "$DATABASE_URL" -c "SELECT 1;" >/dev/null 2>&1; then
                log_success "Database connection successful"
            else
                log_error "Database connection failed"
            fi
        else
            log_warning "psql not available, skipping database connectivity test"
        fi
    else
        log_error "DATABASE_URL not set, cannot test connectivity"
    fi
}

test_supabase_connectivity() {
    log_info "Testing Supabase API connectivity..."
    
    if [[ -n "${NEXT_PUBLIC_SUPABASE_URL:-}" ]] && [[ -n "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}" ]]; then
        local supabase_health_url="${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/"
        
        if command -v curl >/dev/null 2>&1; then
            local response_code=$(curl -s -o /dev/null -w "%{http_code}" \
                -H "apikey: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
                "$supabase_health_url")
            
            if [[ "$response_code" -eq 200 ]]; then
                log_success "Supabase API connectivity successful"
            else
                log_error "Supabase API connectivity failed (HTTP $response_code)"
            fi
        else
            log_warning "curl not available, skipping Supabase connectivity test"
        fi
    else
        log_error "Supabase configuration incomplete, cannot test connectivity"
    fi
}

test_email_configuration() {
    log_info "Testing email configuration..."
    
    if [[ -n "${EMAIL_SERVER_HOST:-}" ]] && [[ -n "${EMAIL_SERVER_USER:-}" ]]; then
        local email_host="${EMAIL_SERVER_HOST}"
        local email_port="${EMAIL_SERVER_PORT:-587}"
        
        if command -v nc >/dev/null 2>&1; then
            if nc -z "$email_host" "$email_port" 2>/dev/null; then
                log_success "Email server connectivity successful"
            else
                log_error "Email server connectivity failed"
            fi
        else
            log_warning "nc (netcat) not available, skipping email connectivity test"
        fi
    else
        log_warning "Email configuration incomplete, skipping test"
    fi
}

validate_ssl_configuration() {
    log_info "Validating SSL configuration..."
    
    if [[ -n "${NEXT_PUBLIC_APP_URL:-}" ]]; then
        local domain=$(echo "$NEXT_PUBLIC_APP_URL" | sed 's|https\?://||' | sed 's|/.*||')
        
        if command -v openssl >/dev/null 2>&1; then
            # Check if SSL certificate is valid
            if openssl s_client -connect "$domain:443" -servername "$domain" </dev/null 2>/dev/null | openssl x509 -noout -dates 2>/dev/null; then
                log_success "SSL certificate is valid for $domain"
            else
                log_warning "SSL certificate validation failed or not yet installed for $domain"
            fi
        else
            log_warning "openssl not available, skipping SSL validation"
        fi
    fi
}

check_system_dependencies() {
    log_info "Checking system dependencies..."
    
    local required_commands=(
        "docker"
        "docker-compose"
        "nginx"
        "git"
    )
    
    for cmd in "${required_commands[@]}"; do
        if command -v "$cmd" >/dev/null 2>&1; then
            local version=$(command -v "$cmd" && $cmd --version 2>/dev/null | head -n1 || echo "Version unknown")
            log_success "Command available: $cmd ($version)"
        else
            log_error "Required command not found: $cmd"
        fi
    done
}

check_docker_configuration() {
    log_info "Checking Docker configuration..."
    
    if command -v docker >/dev/null 2>&1; then
        if docker info >/dev/null 2>&1; then
            log_success "Docker daemon is running"
            
            # Check Docker Compose
            if command -v docker-compose >/dev/null 2>&1; then
                log_success "Docker Compose is available"
            else
                log_error "Docker Compose not found"
            fi
        else
            log_error "Docker daemon is not running or accessible"
        fi
    else
        log_error "Docker is not installed"
    fi
}

validate_file_permissions() {
    log_info "Validating file permissions..."
    
    local executable_files=(
        "$DEPLOYMENT_DIR/scripts/deploy-full-stack.sh"
        "$DEPLOYMENT_DIR/scripts/deploy-database.sh"
        "$DEPLOYMENT_DIR/ssl/setup-ssl.sh"
        "$DEPLOYMENT_DIR/monitoring/setup-monitoring.sh"
    )
    
    for file in "${executable_files[@]}"; do
        if [[ -f "$file" ]]; then
            if [[ -x "$file" ]]; then
                log_success "Executable permission set: $file"
            else
                log_warning "Executable permission missing: $file"
                chmod +x "$file" 2>/dev/null && log_success "Fixed executable permission: $file" || log_error "Failed to fix permission: $file"
            fi
        else
            log_warning "File not found: $file"
        fi
    done
}

generate_validation_report() {
    log_info "Generating validation report..."
    
    local total_checks=$((PASSED_CHECKS + FAILED_CHECKS + WARNING_CHECKS))
    
    cat >> "$VALIDATION_LOG" << EOF

================================================================================
                         ENVIRONMENT VALIDATION SUMMARY
================================================================================

Validation completed at: $(date)
Total checks performed: $total_checks

Results:
  ✓ Passed:   $PASSED_CHECKS
  ⚠ Warnings: $WARNING_CHECKS  
  ✗ Failed:   $FAILED_CHECKS

EOF

    if [[ $FAILED_CHECKS -eq 0 ]]; then
        log_success "Environment validation completed successfully!"
        if [[ $WARNING_CHECKS -gt 0 ]]; then
            log_warning "Please review $WARNING_CHECKS warning(s) before deployment"
        fi
        echo "0" # Exit code for success
    else
        log_error "Environment validation failed with $FAILED_CHECKS error(s)"
        log_error "Please address all failed checks before proceeding with deployment"
        echo "1" # Exit code for failure
    fi
}

# Main execution
main() {
    local env_type="${1:-production}"
    local env_file="$DEPLOYMENT_DIR/environments/.env.$env_type"
    
    log_info "Starting environment validation for: $env_type"
    log_info "Validation log: $VALIDATION_LOG"
    
    # Check if environment file exists and source it
    if check_environment_file "$env_file" "$env_type"; then
        validate_required_variables
        validate_optional_variables
        validate_url_format
        validate_production_settings
        validate_security_settings
    fi
    
    # System and connectivity checks
    check_system_dependencies
    check_docker_configuration
    validate_file_permissions
    
    # Network connectivity tests
    test_database_connectivity
    test_supabase_connectivity
    test_email_configuration
    validate_ssl_configuration
    
    # Generate final report
    local exit_code=$(generate_validation_report)
    
    log_info "Full validation log available at: $VALIDATION_LOG"
    
    exit "$exit_code"
}

# Show usage if no environment specified
if [[ $# -eq 0 ]]; then
    echo "Usage: $0 <environment>"
    echo "Example: $0 production"
    echo "         $0 staging"
    exit 1
fi

# Run main function
main "$@"