#!/bin/bash

# Configuration Validation Script for HeyPeter Academy LMS
# Validates Docker Compose, Nginx, and other configuration files

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
VALIDATION_LOG="$DEPLOYMENT_DIR/reports/config-validation-$(date +%Y%m%d_%H%M%S).log"

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
validate_docker_compose() {
    log_info "Validating Docker Compose configurations..."
    
    local compose_files=(
        "$DEPLOYMENT_DIR/environments/docker-compose.production.yml"
        "$DEPLOYMENT_DIR/load-balancer/docker-compose.lb.yml"
        "$DEPLOYMENT_DIR/monitoring/docker-compose.monitoring.yml"
        "$PROJECT_ROOT/docker-compose.yml"
    )
    
    for compose_file in "${compose_files[@]}"; do
        if [[ -f "$compose_file" ]]; then
            log_info "Validating: $compose_file"
            
            # Check YAML syntax
            if command -v docker-compose >/dev/null 2>&1; then
                if docker-compose -f "$compose_file" config >/dev/null 2>&1; then
                    log_success "Valid Docker Compose syntax: $(basename "$compose_file")"
                else
                    log_error "Invalid Docker Compose syntax: $(basename "$compose_file")"
                fi
            else
                log_warning "docker-compose not available, skipping syntax validation"
            fi
            
            # Check for common issues
            validate_compose_security "$compose_file"
            validate_compose_resources "$compose_file"
            
        else
            log_warning "Docker Compose file not found: $compose_file"
        fi
    done
}

validate_compose_security() {
    local compose_file="$1"
    
    # Check for privileged containers
    if grep -q "privileged.*true" "$compose_file"; then
        log_warning "Privileged container found in $(basename "$compose_file")"
    fi
    
    # Check for host network mode
    if grep -q "network_mode.*host" "$compose_file"; then
        log_warning "Host network mode found in $(basename "$compose_file")"
    fi
    
    # Check for volume mounts to sensitive directories
    if grep -q "/etc:" "$compose_file" || grep -q "/var/run/docker.sock" "$compose_file"; then
        log_warning "Sensitive volume mount found in $(basename "$compose_file")"
    fi
}

validate_compose_resources() {
    local compose_file="$1"
    
    # Check for resource limits
    if grep -q "deploy:" "$compose_file" && grep -q "resources:" "$compose_file"; then
        log_success "Resource limits configured in $(basename "$compose_file")"
    else
        log_warning "No resource limits found in $(basename "$compose_file")"
    fi
    
    # Check for restart policies
    if grep -q "restart:" "$compose_file"; then
        log_success "Restart policy configured in $(basename "$compose_file")"
    else
        log_warning "No restart policy found in $(basename "$compose_file")"
    fi
}

validate_nginx_config() {
    log_info "Validating Nginx configurations..."
    
    local nginx_configs=(
        "$DEPLOYMENT_DIR/load-balancer/nginx.conf"
        "$DEPLOYMENT_DIR/ssl/nginx-ssl.conf"
    )
    
    for config_file in "${nginx_configs[@]}"; do
        if [[ -f "$config_file" ]]; then
            log_info "Validating: $config_file"
            
            # Check Nginx syntax
            if command -v nginx >/dev/null 2>&1; then
                if nginx -t -c "$config_file" >/dev/null 2>&1; then
                    log_success "Valid Nginx syntax: $(basename "$config_file")"
                else
                    log_error "Invalid Nginx syntax: $(basename "$config_file")"
                fi
            else
                log_warning "nginx not available, skipping syntax validation"
            fi
            
            # Check for security configurations
            validate_nginx_security "$config_file"
            validate_nginx_performance "$config_file"
            
        else
            log_warning "Nginx config file not found: $config_file"
        fi
    done
}

validate_nginx_security() {
    local config_file="$1"
    
    # Check for SSL configuration
    if grep -q "ssl_certificate" "$config_file"; then
        log_success "SSL configuration found in $(basename "$config_file")"
    else
        log_warning "No SSL configuration found in $(basename "$config_file")"
    fi
    
    # Check for security headers
    local security_headers=(
        "X-Frame-Options"
        "X-Content-Type-Options"
        "X-XSS-Protection"
        "Strict-Transport-Security"
    )
    
    for header in "${security_headers[@]}"; do
        if grep -q "$header" "$config_file"; then
            log_success "Security header '$header' configured in $(basename "$config_file")"
        else
            log_warning "Security header '$header' not found in $(basename "$config_file")"
        fi
    done
    
    # Check for rate limiting
    if grep -q "limit_req" "$config_file"; then
        log_success "Rate limiting configured in $(basename "$config_file")"
    else
        log_warning "No rate limiting found in $(basename "$config_file")"
    fi
}

validate_nginx_performance() {
    local config_file="$1"
    
    # Check for gzip compression
    if grep -q "gzip" "$config_file"; then
        log_success "Gzip compression configured in $(basename "$config_file")"
    else
        log_warning "No gzip compression found in $(basename "$config_file")"
    fi
    
    # Check for caching
    if grep -q "expires" "$config_file" || grep -q "add_header.*Cache-Control" "$config_file"; then
        log_success "Caching headers configured in $(basename "$config_file")"
    else
        log_warning "No caching configuration found in $(basename "$config_file")"
    fi
}

validate_haproxy_config() {
    log_info "Validating HAProxy configuration..."
    
    local haproxy_config="$DEPLOYMENT_DIR/load-balancer/haproxy.cfg"
    
    if [[ -f "$haproxy_config" ]]; then
        # Check HAProxy syntax
        if command -v haproxy >/dev/null 2>&1; then
            if haproxy -c -f "$haproxy_config" >/dev/null 2>&1; then
                log_success "Valid HAProxy syntax"
            else
                log_error "Invalid HAProxy syntax"
            fi
        else
            log_warning "haproxy not available, skipping syntax validation"
        fi
        
        # Check for health checks
        if grep -q "option httpchk" "$haproxy_config"; then
            log_success "Health checks configured in HAProxy"
        else
            log_warning "No health checks found in HAProxy config"
        fi
        
        # Check for SSL configuration
        if grep -q "bind.*ssl" "$haproxy_config"; then
            log_success "SSL termination configured in HAProxy"
        else
            log_warning "No SSL termination found in HAProxy config"
        fi
        
    else
        log_warning "HAProxy config file not found: $haproxy_config"
    fi
}

validate_prometheus_config() {
    log_info "Validating Prometheus configuration..."
    
    local prometheus_config="$DEPLOYMENT_DIR/monitoring/prometheus.yml"
    
    if [[ -f "$prometheus_config" ]]; then
        # Check YAML syntax
        if command -v python3 >/dev/null 2>&1; then
            if python3 -c "import yaml; yaml.safe_load(open('$prometheus_config'))" 2>/dev/null; then
                log_success "Valid Prometheus YAML syntax"
            else
                log_error "Invalid Prometheus YAML syntax"
            fi
        else
            log_warning "python3 not available, skipping YAML validation"
        fi
        
        # Check for required sections
        local required_sections=(
            "global:"
            "scrape_configs:"
            "rule_files:"
        )
        
        for section in "${required_sections[@]}"; do
            if grep -q "$section" "$prometheus_config"; then
                log_success "Required section found: $section"
            else
                log_warning "Required section missing: $section"
            fi
        done
        
    else
        log_warning "Prometheus config file not found: $prometheus_config"
    fi
}

validate_alert_rules() {
    log_info "Validating Prometheus alert rules..."
    
    local alert_rules_file="$DEPLOYMENT_DIR/monitoring/alert_rules.yml"
    
    if [[ -f "$alert_rules_file" ]]; then
        # Check YAML syntax
        if command -v python3 >/dev/null 2>&1; then
            if python3 -c "import yaml; yaml.safe_load(open('$alert_rules_file'))" 2>/dev/null; then
                log_success "Valid alert rules YAML syntax"
            else
                log_error "Invalid alert rules YAML syntax"
            fi
        fi
        
        # Check for critical alerts
        local critical_alerts=(
            "InstanceDown"
            "HighErrorRate"
            "HighResponseTime"
            "DiskSpaceRunningOut"
        )
        
        for alert in "${critical_alerts[@]}"; do
            if grep -q "$alert" "$alert_rules_file"; then
                log_success "Critical alert rule found: $alert"
            else
                log_warning "Critical alert rule missing: $alert"
            fi
        done
        
    else
        log_warning "Alert rules file not found: $alert_rules_file"
    fi
}

validate_backup_config() {
    log_info "Validating backup configuration..."
    
    local backup_config="$DEPLOYMENT_DIR/backup/backup-config.yml"
    
    if [[ -f "$backup_config" ]]; then
        # Check YAML syntax
        if command -v python3 >/dev/null 2>&1; then
            if python3 -c "import yaml; yaml.safe_load(open('$backup_config'))" 2>/dev/null; then
                log_success "Valid backup config YAML syntax"
            else
                log_error "Invalid backup config YAML syntax"
            fi
        fi
        
        # Check for required backup settings
        local required_settings=(
            "database:"
            "retention:"
            "schedule:"
            "storage:"
        )
        
        for setting in "${required_settings[@]}"; do
            if grep -q "$setting" "$backup_config"; then
                log_success "Required backup setting found: $setting"
            else
                log_warning "Required backup setting missing: $setting"
            fi
        done
        
    else
        log_warning "Backup config file not found: $backup_config"
    fi
}

validate_ssl_config() {
    log_info "Validating SSL configuration files..."
    
    local ssl_config="$DEPLOYMENT_DIR/ssl/nginx-ssl.conf"
    
    if [[ -f "$ssl_config" ]]; then
        # Check for modern SSL configuration
        local ssl_requirements=(
            "ssl_protocols TLSv1.2 TLSv1.3"
            "ssl_ciphers"
            "ssl_prefer_server_ciphers"
            "ssl_session_cache"
        )
        
        for requirement in "${ssl_requirements[@]}"; do
            if grep -q "$requirement" "$ssl_config"; then
                log_success "SSL requirement found: $requirement"
            else
                log_warning "SSL requirement missing: $requirement"
            fi
        done
        
        # Check for OCSP stapling
        if grep -q "ssl_stapling" "$ssl_config"; then
            log_success "OCSP stapling configured"
        else
            log_warning "OCSP stapling not configured"
        fi
        
    else
        log_warning "SSL config file not found: $ssl_config"
    fi
}

validate_dockerfile() {
    log_info "Validating Dockerfile configurations..."
    
    local dockerfiles=(
        "$PROJECT_ROOT/Dockerfile"
        "$PROJECT_ROOT/Dockerfile.dev"
    )
    
    for dockerfile in "${dockerfiles[@]}"; do
        if [[ -f "$dockerfile" ]]; then
            log_info "Validating: $(basename "$dockerfile")"
            
            # Check for multi-stage build
            if grep -q "FROM.*AS" "$dockerfile"; then
                log_success "Multi-stage build found in $(basename "$dockerfile")"
            else
                log_warning "No multi-stage build in $(basename "$dockerfile")"
            fi
            
            # Check for non-root user
            if grep -q "USER" "$dockerfile"; then
                log_success "Non-root user configured in $(basename "$dockerfile")"
            else
                log_warning "No non-root user in $(basename "$dockerfile")"
            fi
            
            # Check for health check
            if grep -q "HEALTHCHECK" "$dockerfile"; then
                log_success "Health check configured in $(basename "$dockerfile")"
            else
                log_warning "No health check in $(basename "$dockerfile")"
            fi
            
            # Check for .dockerignore
            local dockerignore="$(dirname "$dockerfile")/.dockerignore"
            if [[ -f "$dockerignore" ]]; then
                log_success "Dockerignore file found for $(basename "$dockerfile")"
            else
                log_warning "No dockerignore file found for $(basename "$dockerfile")"
            fi
            
        else
            log_warning "Dockerfile not found: $dockerfile"
        fi
    done
}

validate_package_json() {
    log_info "Validating package.json configuration..."
    
    local package_json="$PROJECT_ROOT/package.json"
    
    if [[ -f "$package_json" ]]; then
        # Check for required scripts
        local required_scripts=(
            "build"
            "start"
            "test"
            "lint"
        )
        
        for script in "${required_scripts[@]}"; do
            if grep -q "\"$script\":" "$package_json"; then
                log_success "Required script found: $script"
            else
                log_warning "Required script missing: $script"
            fi
        done
        
        # Check for security audit
        if grep -q "audit" "$package_json"; then
            log_success "Security audit script configured"
        else
            log_warning "No security audit script found"
        fi
        
    else
        log_error "package.json not found in project root"
    fi
}

generate_config_report() {
    log_info "Generating configuration validation report..."
    
    local total_checks=$((PASSED_CHECKS + FAILED_CHECKS + WARNING_CHECKS))
    
    cat >> "$VALIDATION_LOG" << EOF

================================================================================
                       CONFIGURATION VALIDATION SUMMARY
================================================================================

Validation completed at: $(date)
Total checks performed: $total_checks

Results:
  ✓ Passed:   $PASSED_CHECKS
  ⚠ Warnings: $WARNING_CHECKS  
  ✗ Failed:   $FAILED_CHECKS

Configuration Files Validated:
  - Docker Compose files
  - Nginx configurations
  - HAProxy configuration
  - Prometheus configuration
  - Alert rules
  - Backup configuration
  - SSL configuration
  - Dockerfile configurations
  - Package.json

EOF

    if [[ $FAILED_CHECKS -eq 0 ]]; then
        log_success "Configuration validation completed successfully!"
        if [[ $WARNING_CHECKS -gt 0 ]]; then
            log_warning "Please review $WARNING_CHECKS warning(s) before deployment"
        fi
        echo "0" # Exit code for success
    else
        log_error "Configuration validation failed with $FAILED_CHECKS error(s)"
        log_error "Please address all failed checks before proceeding with deployment"
        echo "1" # Exit code for failure
    fi
}

# Main execution
main() {
    log_info "Starting configuration validation"
    log_info "Validation log: $VALIDATION_LOG"
    
    # Validate all configuration types
    validate_docker_compose
    validate_nginx_config
    validate_haproxy_config
    validate_prometheus_config
    validate_alert_rules
    validate_backup_config
    validate_ssl_config
    validate_dockerfile
    validate_package_json
    
    # Generate final report
    local exit_code=$(generate_config_report)
    
    log_info "Full validation log available at: $VALIDATION_LOG"
    
    exit "$exit_code"
}

# Run main function
main "$@"