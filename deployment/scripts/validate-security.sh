#!/bin/bash

# Security and SSL Configuration Validation Script for HeyPeter Academy LMS
# Validates SSL certificates, security headers, and configuration security

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
VALIDATION_LOG="$DEPLOYMENT_DIR/reports/security-validation-$(date +%Y%m%d_%H%M%S).log"

# Create reports directory if it doesn't exist
mkdir -p "$DEPLOYMENT_DIR/reports"

# Initialize counters
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Security configuration
REQUIRED_SECURITY_HEADERS=(
    "Strict-Transport-Security"
    "X-Frame-Options"
    "X-Content-Type-Options"
    "X-XSS-Protection"
    "Content-Security-Policy"
    "Referrer-Policy"
)

SSL_REQUIRED_PROTOCOLS=(
    "TLSv1.2"
    "TLSv1.3"
)

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

# SSL Certificate validation functions
validate_ssl_certificate() {
    local domain="$1"
    log_info "Validating SSL certificate for domain: $domain"
    
    # Check if certificate exists and is valid
    if command -v openssl >/dev/null 2>&1; then
        # Get certificate information
        local cert_info
        if cert_info=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -text 2>/dev/null); then
            log_success "SSL certificate retrieved for $domain"
            
            # Check certificate validity dates
            check_certificate_validity "$domain"
            
            # Check certificate chain
            check_certificate_chain "$domain"
            
            # Check certificate algorithms
            check_certificate_algorithms "$domain"
            
            # Check SAN (Subject Alternative Names)
            check_certificate_san "$domain"
            
        else
            log_error "Failed to retrieve SSL certificate for $domain"
            return 1
        fi
    else
        log_error "OpenSSL not available for certificate validation"
        return 1
    fi
}

check_certificate_validity() {
    local domain="$1"
    
    local not_before not_after current_date
    not_before=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -startdate 2>/dev/null | cut -d= -f2)
    not_after=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
    current_date=$(date)
    
    if [[ -n "$not_before" ]] && [[ -n "$not_after" ]]; then
        local not_before_epoch not_after_epoch current_epoch
        not_before_epoch=$(date -d "$not_before" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$not_before" +%s 2>/dev/null || echo "0")
        not_after_epoch=$(date -d "$not_after" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$not_after" +%s 2>/dev/null || echo "0")
        current_epoch=$(date +%s)
        
        if [[ $current_epoch -ge $not_before_epoch ]] && [[ $current_epoch -le $not_after_epoch ]]; then
            log_success "Certificate is currently valid for $domain"
            
            # Check if certificate expires soon (within 30 days)
            local days_until_expiry=$(( (not_after_epoch - current_epoch) / 86400 ))
            if [[ $days_until_expiry -le 30 ]]; then
                log_warning "Certificate expires soon for $domain: $days_until_expiry days"
            else
                log_success "Certificate has adequate validity period: $days_until_expiry days"
            fi
        else
            log_error "Certificate is not currently valid for $domain"
        fi
    else
        log_warning "Could not determine certificate validity dates for $domain"
    fi
}

check_certificate_chain() {
    local domain="$1"
    
    if echo | openssl s_client -servername "$domain" -connect "$domain:443" -verify_return_error 2>/dev/null >/dev/null; then
        log_success "Certificate chain is valid for $domain"
    else
        log_error "Certificate chain validation failed for $domain"
    fi
}

check_certificate_algorithms() {
    local domain="$1"
    
    local signature_algorithm
    signature_algorithm=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -text 2>/dev/null | grep "Signature Algorithm" | head -1 | awk '{print $3}')
    
    case "$signature_algorithm" in
        "sha256WithRSAEncryption"|"ecdsa-with-SHA256"|"ecdsa-with-SHA384"|"ecdsa-with-SHA512")
            log_success "Certificate uses secure signature algorithm: $signature_algorithm"
            ;;
        "sha1WithRSAEncryption"|"md5WithRSAEncryption")
            log_error "Certificate uses insecure signature algorithm: $signature_algorithm"
            ;;
        *)
            log_warning "Unknown signature algorithm: $signature_algorithm"
            ;;
    esac
    
    # Check key size
    local key_size
    key_size=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -text 2>/dev/null | grep "Public-Key" | grep -o '[0-9]\+' | head -1)
    
    if [[ -n "$key_size" ]]; then
        if [[ $key_size -ge 2048 ]]; then
            log_success "Certificate has adequate key size: $key_size bits"
        else
            log_error "Certificate has insufficient key size: $key_size bits (minimum 2048)"
        fi
    fi
}

check_certificate_san() {
    local domain="$1"
    
    local san_list
    san_list=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -text 2>/dev/null | grep -A1 "Subject Alternative Name" | tail -1)
    
    if [[ -n "$san_list" ]]; then
        if echo "$san_list" | grep -q "$domain"; then
            log_success "Domain $domain is included in SAN list"
        else
            log_warning "Domain $domain not found in SAN list: $san_list"
        fi
    else
        log_warning "No Subject Alternative Names found for $domain"
    fi
}

# SSL configuration validation
validate_ssl_configuration() {
    log_info "Validating SSL/TLS configuration..."
    
    local ssl_config_file="$DEPLOYMENT_DIR/ssl/nginx-ssl.conf"
    
    if [[ -f "$ssl_config_file" ]]; then
        check_ssl_protocols "$ssl_config_file"
        check_ssl_ciphers "$ssl_config_file"
        check_ssl_security_settings "$ssl_config_file"
        check_ssl_performance_settings "$ssl_config_file"
    else
        log_warning "SSL configuration file not found: $ssl_config_file"
    fi
}

check_ssl_protocols() {
    local config_file="$1"
    
    log_info "Checking SSL/TLS protocol configuration..."
    
    # Check for modern protocols
    if grep -q "ssl_protocols.*TLSv1\.3" "$config_file"; then
        log_success "TLS 1.3 is enabled"
    else
        log_warning "TLS 1.3 is not enabled"
    fi
    
    if grep -q "ssl_protocols.*TLSv1\.2" "$config_file"; then
        log_success "TLS 1.2 is enabled"
    else
        log_error "TLS 1.2 is not enabled"
    fi
    
    # Check for insecure protocols
    if grep -q "ssl_protocols.*TLSv1[^\.23]" "$config_file" || grep -q "ssl_protocols.*SSLv" "$config_file"; then
        log_error "Insecure SSL/TLS protocols detected"
    else
        log_success "No insecure SSL/TLS protocols detected"
    fi
}

check_ssl_ciphers() {
    local config_file="$1"
    
    log_info "Checking SSL cipher configuration..."
    
    # Check if cipher configuration exists
    if grep -q "ssl_ciphers" "$config_file"; then
        log_success "SSL ciphers are configured"
        
        # Check for weak ciphers
        if grep -q "ssl_ciphers.*NULL\|ssl_ciphers.*MD5\|ssl_ciphers.*DES" "$config_file"; then
            log_error "Weak ciphers detected in configuration"
        else
            log_success "No weak ciphers detected"
        fi
        
        # Check for modern ciphers
        if grep -q "ssl_ciphers.*ECDHE\|ssl_ciphers.*AES" "$config_file"; then
            log_success "Modern ciphers are configured"
        else
            log_warning "Modern ciphers may not be configured"
        fi
    else
        log_warning "SSL ciphers not explicitly configured"
    fi
    
    # Check cipher preference
    if grep -q "ssl_prefer_server_ciphers.*on" "$config_file"; then
        log_success "Server cipher preference is enabled"
    else
        log_warning "Server cipher preference is not enabled"
    fi
}

check_ssl_security_settings() {
    local config_file="$1"
    
    log_info "Checking SSL security settings..."
    
    # Check OCSP stapling
    if grep -q "ssl_stapling.*on" "$config_file"; then
        log_success "OCSP stapling is enabled"
    else
        log_warning "OCSP stapling is not enabled"
    fi
    
    # Check SSL session settings
    if grep -q "ssl_session_cache" "$config_file"; then
        log_success "SSL session caching is configured"
    else
        log_warning "SSL session caching is not configured"
    fi
    
    if grep -q "ssl_session_timeout" "$config_file"; then
        log_success "SSL session timeout is configured"
    else
        log_warning "SSL session timeout is not configured"
    fi
    
    # Check for SSL buffer size optimization
    if grep -q "ssl_buffer_size" "$config_file"; then
        log_success "SSL buffer size is optimized"
    else
        log_warning "SSL buffer size is not optimized"
    fi
}

check_ssl_performance_settings() {
    local config_file="$1"
    
    log_info "Checking SSL performance settings..."
    
    # Check for session resumption
    if grep -q "ssl_session_tickets.*off" "$config_file"; then
        log_success "SSL session tickets are disabled (more secure)"
    elif grep -q "ssl_session_tickets.*on" "$config_file"; then
        log_warning "SSL session tickets are enabled (performance vs security trade-off)"
    else
        log_warning "SSL session tickets configuration not found"
    fi
}

# Security headers validation
validate_security_headers() {
    local domain="$1"
    log_info "Validating security headers for domain: $domain"
    
    if command -v curl >/dev/null 2>&1; then
        local headers
        headers=$(curl -s -I "https://$domain" 2>/dev/null || curl -s -I "http://$domain" 2>/dev/null)
        
        if [[ -n "$headers" ]]; then
            for header in "${REQUIRED_SECURITY_HEADERS[@]}"; do
                check_security_header "$header" "$headers" "$domain"
            done
            
            # Check for additional security configurations
            check_additional_security_headers "$headers" "$domain"
        else
            log_error "Failed to retrieve headers from $domain"
        fi
    else
        log_error "curl not available for header validation"
    fi
}

check_security_header() {
    local header="$1"
    local headers="$2"
    local domain="$3"
    
    if echo "$headers" | grep -qi "^$header:"; then
        local header_value=$(echo "$headers" | grep -i "^$header:" | cut -d: -f2- | tr -d '\r\n' | sed 's/^ *//')
        log_success "Security header '$header' is present: $header_value"
        
        # Validate specific header values
        validate_header_value "$header" "$header_value"
    else
        log_error "Security header '$header' is missing for $domain"
    fi
}

validate_header_value() {
    local header="$1"
    local value="$2"
    
    case "$header" in
        "Strict-Transport-Security")
            if echo "$value" | grep -q "max-age=[0-9]\+"; then
                local max_age=$(echo "$value" | grep -o "max-age=[0-9]\+" | cut -d= -f2)
                if [[ $max_age -ge 31536000 ]]; then
                    log_success "HSTS max-age is adequate: $max_age seconds"
                else
                    log_warning "HSTS max-age should be at least 1 year: $max_age seconds"
                fi
            else
                log_warning "HSTS max-age not specified"
            fi
            
            if echo "$value" | grep -q "includeSubDomains"; then
                log_success "HSTS includes subdomains"
            else
                log_warning "HSTS does not include subdomains"
            fi
            ;;
            
        "X-Frame-Options")
            case "$value" in
                "DENY"|"SAMEORIGIN")
                    log_success "X-Frame-Options has secure value: $value"
                    ;;
                *)
                    log_warning "X-Frame-Options may not be optimal: $value"
                    ;;
            esac
            ;;
            
        "X-Content-Type-Options")
            if [[ "$value" == "nosniff" ]]; then
                log_success "X-Content-Type-Options is properly configured"
            else
                log_warning "X-Content-Type-Options should be 'nosniff': $value"
            fi
            ;;
            
        "Content-Security-Policy")
            if echo "$value" | grep -q "default-src"; then
                log_success "CSP has default-src directive"
            else
                log_warning "CSP should include default-src directive"
            fi
            
            if echo "$value" | grep -q "'unsafe-eval'\|'unsafe-inline'"; then
                log_warning "CSP contains potentially unsafe directives"
            else
                log_success "CSP does not contain unsafe directives"
            fi
            ;;
    esac
}

check_additional_security_headers() {
    local headers="$1"
    local domain="$2"
    
    # Check for additional recommended headers
    local additional_headers=(
        "X-Permitted-Cross-Domain-Policies"
        "Feature-Policy"
        "Permissions-Policy"
        "Cross-Origin-Embedder-Policy"
        "Cross-Origin-Opener-Policy"
        "Cross-Origin-Resource-Policy"
    )
    
    for header in "${additional_headers[@]}"; do
        if echo "$headers" | grep -qi "^$header:"; then
            log_success "Additional security header present: $header"
        else
            log_info "Optional security header not present: $header"
        fi
    done
}

# Application security validation
validate_application_security() {
    log_info "Validating application security configuration..."
    
    # Check environment variables for security
    check_environment_security
    
    # Check for secure defaults
    check_secure_defaults
    
    # Check authentication configuration
    check_authentication_security
    
    # Check CORS configuration
    check_cors_configuration
}

check_environment_security() {
    log_info "Checking environment security..."
    
    # Check for production environment
    if [[ "${NODE_ENV:-}" == "production" ]]; then
        log_success "NODE_ENV is set to production"
    else
        log_error "NODE_ENV is not set to production"
    fi
    
    # Check for debug settings
    if [[ "${DEBUG:-}" == "true" ]] || [[ "${NODE_DEBUG:-}" == "true" ]]; then
        log_error "Debug mode is enabled in production"
    else
        log_success "Debug mode is disabled"
    fi
    
    # Check for secure session configuration
    if [[ -n "${NEXTAUTH_SECRET:-}" ]]; then
        if [[ ${#NEXTAUTH_SECRET} -ge 32 ]]; then
            log_success "NEXTAUTH_SECRET has adequate length"
        else
            log_error "NEXTAUTH_SECRET should be at least 32 characters"
        fi
    else
        log_error "NEXTAUTH_SECRET is not set"
    fi
}

check_secure_defaults() {
    log_info "Checking secure defaults..."
    
    # Check Next.js configuration
    local next_config="$PROJECT_ROOT/next.config.mjs"
    if [[ -f "$next_config" ]]; then
        # Check for security headers in Next.js config
        if grep -q "headers" "$next_config"; then
            log_success "Custom headers configured in Next.js"
        else
            log_warning "No custom headers configured in Next.js"
        fi
        
        # Check for CSP configuration
        if grep -q "contentSecurityPolicy" "$next_config"; then
            log_success "Content Security Policy configured"
        else
            log_warning "Content Security Policy not configured"
        fi
    else
        log_warning "Next.js configuration file not found"
    fi
}

check_authentication_security() {
    log_info "Checking authentication security..."
    
    # Check for HTTPS requirement
    if [[ "${NEXTAUTH_URL:-}" =~ ^https:// ]]; then
        log_success "Authentication URL uses HTTPS"
    else
        log_error "Authentication URL should use HTTPS"
    fi
    
    # Check for secure cookie settings
    if [[ "${NEXTAUTH_URL:-}" =~ ^https:// ]]; then
        log_success "Secure cookies will be used (HTTPS)"
    else
        log_warning "Cookies may not be secure without HTTPS"
    fi
}

check_cors_configuration() {
    log_info "Checking CORS configuration..."
    
    # Look for CORS configuration in API routes
    local api_routes=($(find "$PROJECT_ROOT/src/app/api" -name "*.ts" -o -name "*.js" 2>/dev/null || true))
    
    local cors_found=false
    for route in "${api_routes[@]}"; do
        if grep -q "cors\|Access-Control-Allow" "$route" 2>/dev/null; then
            cors_found=true
            log_success "CORS configuration found in API routes"
            break
        fi
    done
    
    if [[ "$cors_found" == false ]]; then
        log_warning "No explicit CORS configuration found"
    fi
}

# Network security validation
validate_network_security() {
    log_info "Validating network security configuration..."
    
    # Check firewall configuration
    check_firewall_configuration
    
    # Check for open ports
    check_open_ports
    
    # Check for rate limiting
    check_rate_limiting
}

check_firewall_configuration() {
    log_info "Checking firewall configuration..."
    
    if command -v ufw >/dev/null 2>&1; then
        local ufw_status=$(ufw status 2>/dev/null | head -1)
        if echo "$ufw_status" | grep -q "Status: active"; then
            log_success "UFW firewall is active"
            
            # Check for necessary ports
            local required_ports=("22/tcp" "80/tcp" "443/tcp")
            for port in "${required_ports[@]}"; do
                if ufw status 2>/dev/null | grep -q "$port.*ALLOW"; then
                    log_success "Required port is allowed: $port"
                else
                    log_warning "Required port may not be allowed: $port"
                fi
            done
        else
            log_warning "UFW firewall is not active"
        fi
    elif command -v iptables >/dev/null 2>&1; then
        if iptables -L >/dev/null 2>&1; then
            log_success "iptables is available"
            log_info "Manual review of iptables rules recommended"
        else
            log_warning "Cannot access iptables rules"
        fi
    else
        log_warning "No firewall management tool found"
    fi
}

check_open_ports() {
    log_info "Checking for open ports..."
    
    if command -v ss >/dev/null 2>&1; then
        local listening_ports=$(ss -tlnp 2>/dev/null | awk 'NR>1 {print $4}' | cut -d: -f2 | sort -u)
        
        log_info "Listening ports detected:"
        for port in $listening_ports; do
            case "$port" in
                22)
                    log_success "SSH port open: $port"
                    ;;
                80|443)
                    log_success "HTTP/HTTPS port open: $port"
                    ;;
                3000|8080|8000)
                    log_info "Application port open: $port"
                    ;;
                *)
                    log_warning "Unexpected port open: $port"
                    ;;
            esac
        done
    elif command -v netstat >/dev/null 2>&1; then
        local listening_ports=$(netstat -tlnp 2>/dev/null | awk 'NR>2 && $1=="tcp" {print $4}' | cut -d: -f2 | sort -u)
        log_info "Listening ports (netstat): $listening_ports"
    else
        log_warning "No network scanning tools available"
    fi
}

check_rate_limiting() {
    log_info "Checking rate limiting configuration..."
    
    # Check Nginx rate limiting
    local nginx_configs=(
        "$DEPLOYMENT_DIR/load-balancer/nginx.conf"
        "$DEPLOYMENT_DIR/ssl/nginx-ssl.conf"
    )
    
    local rate_limiting_found=false
    for config in "${nginx_configs[@]}"; do
        if [[ -f "$config" ]] && grep -q "limit_req" "$config"; then
            rate_limiting_found=true
            log_success "Rate limiting configured in $(basename "$config")"
        fi
    done
    
    if [[ "$rate_limiting_found" == false ]]; then
        log_warning "No rate limiting configuration found"
    fi
}

# Vulnerability scanning
scan_for_vulnerabilities() {
    log_info "Scanning for common vulnerabilities..."
    
    # Check for known vulnerable packages
    check_package_vulnerabilities
    
    # Check for common misconfigurations
    check_common_misconfigurations
    
    # Check for exposed sensitive files
    check_exposed_files
}

check_package_vulnerabilities() {
    log_info "Checking for package vulnerabilities..."
    
    if [[ -f "$PROJECT_ROOT/package.json" ]]; then
        if command -v npm >/dev/null 2>&1; then
            local audit_output
            if audit_output=$(npm audit --json 2>/dev/null); then
                local high_vulns=$(echo "$audit_output" | grep -o '"high":[0-9]*' | cut -d: -f2 | head -1)
                local critical_vulns=$(echo "$audit_output" | grep -o '"critical":[0-9]*' | cut -d: -f2 | head -1)
                
                if [[ "${critical_vulns:-0}" -gt 0 ]]; then
                    log_error "Critical vulnerabilities found: $critical_vulns"
                elif [[ "${high_vulns:-0}" -gt 0 ]]; then
                    log_warning "High vulnerabilities found: $high_vulns"
                else
                    log_success "No high or critical vulnerabilities found"
                fi
            else
                log_warning "Could not run npm audit"
            fi
        else
            log_warning "npm not available for vulnerability scanning"
        fi
    fi
}

check_common_misconfigurations() {
    log_info "Checking for common misconfigurations..."
    
    # Check for default credentials
    local config_files=(
        "$DEPLOYMENT_DIR/environments/.env.production"
        "$DEPLOYMENT_DIR/environments/production.env.example"
    )
    
    for config_file in "${config_files[@]}"; do
        if [[ -f "$config_file" ]]; then
            if grep -q "password.*=.*admin\|password.*=.*password\|password.*=.*123" "$config_file"; then
                log_error "Default or weak passwords detected in $config_file"
            else
                log_success "No obvious default passwords in $config_file"
            fi
        fi
    done
    
    # Check for exposed secrets in git
    if command -v git >/dev/null 2>&1; then
        local exposed_secrets=$(git log --all --full-history -S password -S secret -S key --oneline 2>/dev/null | wc -l)
        if [[ $exposed_secrets -gt 0 ]]; then
            log_warning "Potential secrets found in git history: $exposed_secrets commits"
        else
            log_success "No obvious secrets in git history"
        fi
    fi
}

check_exposed_files() {
    log_info "Checking for exposed sensitive files..."
    
    local sensitive_patterns=(
        ".env"
        ".env.local"
        ".env.production"
        "config.json"
        "database.yml"
        "secrets.json"
        "private_key"
        "id_rsa"
    )
    
    for pattern in "${sensitive_patterns[@]}"; do
        local found_files=$(find "$PROJECT_ROOT" -name "*$pattern*" -type f 2>/dev/null | grep -v node_modules | grep -v .git || true)
        
        if [[ -n "$found_files" ]]; then
            log_warning "Potentially sensitive files found: $pattern"
            echo "$found_files" | while read -r file; do
                log_warning "  - $file"
            done
        fi
    done
}

# Report generation
generate_security_report() {
    log_info "Generating security validation report..."
    
    local total_checks=$((PASSED_CHECKS + FAILED_CHECKS + WARNING_CHECKS))
    
    cat >> "$VALIDATION_LOG" << EOF

================================================================================
                         SECURITY VALIDATION SUMMARY
================================================================================

Validation completed at: $(date)
Total checks performed: $total_checks

Results:
  ✓ Passed:   $PASSED_CHECKS
  ⚠ Warnings: $WARNING_CHECKS  
  ✗ Failed:   $FAILED_CHECKS

Security Areas Validated:
  - SSL/TLS Certificate configuration
  - Security headers
  - Application security settings
  - Network security configuration
  - Vulnerability scanning

EOF

    # Security recommendations
    if [[ $FAILED_CHECKS -gt 0 ]] || [[ $WARNING_CHECKS -gt 0 ]]; then
        cat >> "$VALIDATION_LOG" << EOF

SECURITY RECOMMENDATIONS:
- Address all failed security checks before deployment
- Review warnings and implement fixes where possible
- Consider implementing additional security headers
- Regular security audits and vulnerability scanning
- Keep all dependencies updated
- Monitor security advisories for used technologies

EOF
    fi

    if [[ $FAILED_CHECKS -eq 0 ]]; then
        log_success "Security validation completed successfully!"
        if [[ $WARNING_CHECKS -gt 0 ]]; then
            log_warning "Please review $WARNING_CHECKS warning(s) for optimal security"
        fi
        echo "0" # Exit code for success
    else
        log_error "Security validation failed with $FAILED_CHECKS critical issue(s)"
        log_error "Please address all failed checks before proceeding with deployment"
        echo "1" # Exit code for failure
    fi
}

# Main execution
show_usage() {
    cat << EOF
Usage: $0 <domain> [options]

Arguments:
  domain       Domain name to validate (e.g., example.com)

Options:
  --ssl-only   Only validate SSL certificate and configuration
  --headers    Only validate security headers
  --app        Only validate application security
  --network    Only validate network security
  --scan       Only run vulnerability scan
  --all        Run all security validations (default)

Examples:
  $0 heypeter-academy.com
  $0 heypeter-academy.com --ssl-only
  $0 heypeter-academy.com --headers

EOF
}

main() {
    local domain="$1"
    local ssl_only=false
    local headers_only=false
    local app_only=false
    local network_only=false
    local scan_only=false
    local run_all=true
    
    if [[ -z "$domain" ]]; then
        show_usage
        exit 1
    fi
    
    # Parse options
    shift
    while [[ $# -gt 0 ]]; do
        case $1 in
            --ssl-only)
                ssl_only=true
                run_all=false
                shift
                ;;
            --headers)
                headers_only=true
                run_all=false
                shift
                ;;
            --app)
                app_only=true
                run_all=false
                shift
                ;;
            --network)
                network_only=true
                run_all=false
                shift
                ;;
            --scan)
                scan_only=true
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
    
    log_info "Starting security validation for domain: $domain"
    log_info "Validation log: $VALIDATION_LOG"
    
    # Run selected validations
    if [[ "$ssl_only" == true ]] || [[ "$run_all" == true ]]; then
        validate_ssl_certificate "$domain"
        validate_ssl_configuration
    fi
    
    if [[ "$headers_only" == true ]] || [[ "$run_all" == true ]]; then
        validate_security_headers "$domain"
    fi
    
    if [[ "$app_only" == true ]] || [[ "$run_all" == true ]]; then
        validate_application_security
    fi
    
    if [[ "$network_only" == true ]] || [[ "$run_all" == true ]]; then
        validate_network_security
    fi
    
    if [[ "$scan_only" == true ]] || [[ "$run_all" == true ]]; then
        scan_for_vulnerabilities
    fi
    
    # Generate final report
    local exit_code=$(generate_security_report)
    
    log_info "Full validation log available at: $VALIDATION_LOG"
    
    exit "$exit_code"
}

# Check if domain argument is provided
if [[ $# -eq 0 ]]; then
    show_usage
    exit 1
fi

# Run main function with all arguments
main "$@"