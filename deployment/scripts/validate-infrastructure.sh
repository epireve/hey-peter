#!/bin/bash

# Infrastructure Validation Script for HeyPeter Academy LMS
# Validates load balancer, CDN, and infrastructure components

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
VALIDATION_LOG="$DEPLOYMENT_DIR/reports/infrastructure-validation-$(date +%Y%m%d_%H%M%S).log"

# Create reports directory if it doesn't exist
mkdir -p "$DEPLOYMENT_DIR/reports"

# Initialize counters
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# CDN and Load Balancer endpoints for testing
declare -a CDN_ENDPOINTS=()
declare -a LB_ENDPOINTS=()

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

# Load balancer validation functions
validate_load_balancer() {
    log_info "Validating load balancer configuration and health..."
    
    # Validate Nginx load balancer
    validate_nginx_load_balancer
    
    # Validate HAProxy if configured
    validate_haproxy_load_balancer
    
    # Test load balancer endpoints
    test_load_balancer_endpoints
    
    # Check load balancer health
    check_load_balancer_health
}

validate_nginx_load_balancer() {
    log_info "Validating Nginx load balancer configuration..."
    
    local nginx_config="$DEPLOYMENT_DIR/load-balancer/nginx.conf"
    
    if [[ -f "$nginx_config" ]]; then
        # Check configuration syntax
        if command -v nginx >/dev/null 2>&1; then
            if nginx -t -c "$nginx_config" >/dev/null 2>&1; then
                log_success "Nginx configuration syntax is valid"
            else
                log_error "Nginx configuration syntax is invalid"
                return 1
            fi
        else
            log_warning "nginx not available for syntax validation"
        fi
        
        # Check upstream configuration
        check_nginx_upstream_config "$nginx_config"
        
        # Check load balancing method
        check_nginx_load_balancing_method "$nginx_config"
        
        # Check health checks
        check_nginx_health_checks "$nginx_config"
        
        # Check SSL termination
        check_nginx_ssl_termination "$nginx_config"
        
        # Check caching configuration
        check_nginx_caching "$nginx_config"
        
    else
        log_warning "Nginx configuration file not found: $nginx_config"
    fi
}

check_nginx_upstream_config() {
    local config_file="$1"
    
    log_info "Checking Nginx upstream configuration..."
    
    if grep -q "upstream" "$config_file"; then
        log_success "Upstream configuration found"
        
        # Check for multiple backend servers
        local server_count=$(grep -c "server.*:" "$config_file" || echo "0")
        if [[ $server_count -gt 1 ]]; then
            log_success "Multiple backend servers configured: $server_count"
        else
            log_warning "Only $server_count backend server(s) configured"
        fi
        
        # Check for backup servers
        if grep -q "backup" "$config_file"; then
            log_success "Backup servers configured"
        else
            log_warning "No backup servers configured"
        fi
        
        # Check for server weights
        if grep -q "weight=" "$config_file"; then
            log_success "Server weights configured for load balancing"
        else
            log_info "No custom server weights configured (using default)"
        fi
        
    else
        log_error "No upstream configuration found"
    fi
}

check_nginx_load_balancing_method() {
    local config_file="$1"
    
    log_info "Checking load balancing method..."
    
    if grep -q "least_conn" "$config_file"; then
        log_success "Least connections load balancing method configured"
    elif grep -q "ip_hash" "$config_file"; then
        log_success "IP hash load balancing method configured"
    elif grep -q "hash" "$config_file"; then
        log_success "Custom hash load balancing method configured"
    else
        log_info "Using default round-robin load balancing"
    fi
}

check_nginx_health_checks() {
    local config_file="$1"
    
    log_info "Checking health check configuration..."
    
    # Check for health check endpoints
    if grep -q "health" "$config_file"; then
        log_success "Health check endpoints configured"
    else
        log_warning "No dedicated health check endpoints found"
    fi
    
    # Check for fail timeout
    if grep -q "fail_timeout" "$config_file"; then
        log_success "Fail timeout configured"
    else
        log_warning "No fail timeout configured"
    fi
    
    # Check for max fails
    if grep -q "max_fails" "$config_file"; then
        log_success "Max fails threshold configured"
    else
        log_warning "No max fails threshold configured"
    fi
}

check_nginx_ssl_termination() {
    local config_file="$1"
    
    log_info "Checking SSL termination configuration..."
    
    if grep -q "ssl_certificate" "$config_file"; then
        log_success "SSL termination configured"
        
        # Check for SSL optimization
        if grep -q "ssl_session_cache" "$config_file"; then
            log_success "SSL session caching configured"
        else
            log_warning "SSL session caching not configured"
        fi
        
        if grep -q "ssl_stapling" "$config_file"; then
            log_success "OCSP stapling configured"
        else
            log_warning "OCSP stapling not configured"
        fi
        
    else
        log_warning "SSL termination not configured in load balancer"
    fi
}

check_nginx_caching() {
    local config_file="$1"
    
    log_info "Checking caching configuration..."
    
    if grep -q "proxy_cache" "$config_file"; then
        log_success "Proxy caching configured"
        
        # Check cache zones
        if grep -q "proxy_cache_path" "$config_file"; then
            log_success "Cache storage path configured"
        else
            log_warning "Cache storage path not configured"
        fi
        
        # Check cache validity
        if grep -q "proxy_cache_valid" "$config_file"; then
            log_success "Cache validity periods configured"
        else
            log_warning "Cache validity periods not configured"
        fi
        
    else
        log_warning "No proxy caching configured"
    fi
    
    # Check static asset caching
    if grep -q "expires" "$config_file"; then
        log_success "Static asset caching configured"
    else
        log_warning "Static asset caching not configured"
    fi
}

validate_haproxy_load_balancer() {
    log_info "Validating HAProxy load balancer configuration..."
    
    local haproxy_config="$DEPLOYMENT_DIR/load-balancer/haproxy.cfg"
    
    if [[ -f "$haproxy_config" ]]; then
        # Check configuration syntax
        if command -v haproxy >/dev/null 2>&1; then
            if haproxy -c -f "$haproxy_config" >/dev/null 2>&1; then
                log_success "HAProxy configuration syntax is valid"
            else
                log_error "HAProxy configuration syntax is invalid"
                return 1
            fi
        else
            log_warning "haproxy not available for syntax validation"
        fi
        
        # Check backend configuration
        check_haproxy_backend_config "$haproxy_config"
        
        # Check health checks
        check_haproxy_health_checks "$haproxy_config"
        
        # Check load balancing algorithm
        check_haproxy_load_balancing "$haproxy_config"
        
        # Check SSL configuration
        check_haproxy_ssl_config "$haproxy_config"
        
    else
        log_info "HAProxy configuration file not found (optional): $haproxy_config"
    fi
}

check_haproxy_backend_config() {
    local config_file="$1"
    
    log_info "Checking HAProxy backend configuration..."
    
    if grep -q "backend" "$config_file"; then
        log_success "Backend configuration found"
        
        # Count backend servers
        local server_count=$(grep -c "server.*check" "$config_file" || echo "0")
        if [[ $server_count -gt 1 ]]; then
            log_success "Multiple backend servers configured: $server_count"
        else
            log_warning "Only $server_count backend server(s) configured"
        fi
        
        # Check for backup servers
        if grep -q "backup" "$config_file"; then
            log_success "Backup servers configured"
        else
            log_warning "No backup servers configured"
        fi
        
    else
        log_error "No backend configuration found"
    fi
}

check_haproxy_health_checks() {
    local config_file="$1"
    
    log_info "Checking HAProxy health checks..."
    
    if grep -q "option httpchk" "$config_file"; then
        log_success "HTTP health checks configured"
        
        # Check health check method
        local check_method=$(grep "option httpchk" "$config_file" | head -1 | awk '{print $3}')
        if [[ -n "$check_method" ]]; then
            log_success "Health check method: $check_method"
        fi
        
    else
        log_warning "No HTTP health checks configured"
    fi
    
    # Check for check intervals
    if grep -q "inter.*[0-9]" "$config_file"; then
        log_success "Health check intervals configured"
    else
        log_warning "No custom health check intervals configured"
    fi
}

check_haproxy_load_balancing() {
    local config_file="$1"
    
    log_info "Checking HAProxy load balancing algorithm..."
    
    if grep -q "balance" "$config_file"; then
        local balance_method=$(grep "balance" "$config_file" | head -1 | awk '{print $2}')
        log_success "Load balancing method: $balance_method"
        
        case "$balance_method" in
            "roundrobin")
                log_success "Round-robin balancing configured"
                ;;
            "leastconn")
                log_success "Least connections balancing configured"
                ;;
            "source")
                log_success "Source IP balancing configured"
                ;;
            *)
                log_info "Custom balancing method: $balance_method"
                ;;
        esac
    else
        log_info "Using default load balancing algorithm"
    fi
}

check_haproxy_ssl_config() {
    local config_file="$1"
    
    log_info "Checking HAProxy SSL configuration..."
    
    if grep -q "bind.*ssl" "$config_file"; then
        log_success "SSL termination configured"
        
        # Check for SSL certificate
        if grep -q "crt" "$config_file"; then
            log_success "SSL certificate configured"
        else
            log_warning "SSL certificate path not specified"
        fi
        
        # Check for SSL security
        if grep -q "ssl-min-ver" "$config_file"; then
            log_success "Minimum SSL version configured"
        else
            log_warning "Minimum SSL version not specified"
        fi
        
    else
        log_warning "SSL termination not configured in HAProxy"
    fi
}

test_load_balancer_endpoints() {
    log_info "Testing load balancer endpoints..."
    
    local domain="${1:-localhost}"
    local endpoints=(
        "http://$domain"
        "https://$domain"
        "http://$domain/health"
        "https://$domain/health"
        "http://$domain/api/health"
        "https://$domain/api/health"
    )
    
    for endpoint in "${endpoints[@]}"; do
        test_endpoint_availability "$endpoint"
    done
}

test_endpoint_availability() {
    local endpoint="$1"
    
    if command -v curl >/dev/null 2>&1; then
        local response_code
        response_code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 "$endpoint" 2>/dev/null || echo "000")
        
        case "$response_code" in
            200|301|302)
                log_success "Endpoint accessible: $endpoint (HTTP $response_code)"
                ;;
            000)
                log_warning "Endpoint not accessible: $endpoint (connection failed)"
                ;;
            *)
                log_warning "Endpoint responded with HTTP $response_code: $endpoint"
                ;;
        esac
    else
        log_warning "curl not available for endpoint testing"
    fi
}

check_load_balancer_health() {
    log_info "Checking load balancer health and performance..."
    
    # Check if load balancer processes are running
    check_running_processes
    
    # Check resource usage
    check_resource_usage
    
    # Test load distribution
    test_load_distribution
}

check_running_processes() {
    log_info "Checking running processes..."
    
    # Check Nginx
    if pgrep nginx >/dev/null 2>&1; then
        local nginx_count=$(pgrep nginx | wc -l)
        log_success "Nginx is running ($nginx_count processes)"
    else
        log_warning "Nginx is not running"
    fi
    
    # Check HAProxy
    if pgrep haproxy >/dev/null 2>&1; then
        local haproxy_count=$(pgrep haproxy | wc -l)
        log_success "HAProxy is running ($haproxy_count processes)"
    else
        log_info "HAProxy is not running (optional)"
    fi
}

check_resource_usage() {
    log_info "Checking load balancer resource usage..."
    
    # Check memory usage
    if command -v free >/dev/null 2>&1; then
        local memory_usage=$(free | awk 'NR==2{printf "%.1f%%", $3*100/$2}')
        log_info "Memory usage: $memory_usage"
        
        if [[ $(echo "$memory_usage" | cut -d'%' -f1 | cut -d'.' -f1) -gt 80 ]]; then
            log_warning "High memory usage: $memory_usage"
        else
            log_success "Memory usage is acceptable: $memory_usage"
        fi
    fi
    
    # Check CPU usage
    if command -v top >/dev/null 2>&1; then
        local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
        if [[ -n "$cpu_usage" ]]; then
            log_info "CPU usage: ${cpu_usage}%"
            
            if [[ $(echo "$cpu_usage" | cut -d'.' -f1) -gt 80 ]]; then
                log_warning "High CPU usage: ${cpu_usage}%"
            else
                log_success "CPU usage is acceptable: ${cpu_usage}%"
            fi
        fi
    fi
}

test_load_distribution() {
    log_info "Testing load distribution..."
    
    local domain="${1:-localhost}"
    local test_endpoint="http://$domain/health"
    
    if command -v curl >/dev/null 2>&1; then
        log_info "Testing multiple requests to verify load distribution..."
        
        local successful_requests=0
        local total_requests=10
        
        for i in $(seq 1 $total_requests); do
            local response_code
            response_code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$test_endpoint" 2>/dev/null || echo "000")
            
            if [[ "$response_code" =~ ^[23] ]]; then
                ((successful_requests++))
            fi
        done
        
        local success_rate=$((successful_requests * 100 / total_requests))
        
        if [[ $success_rate -ge 90 ]]; then
            log_success "Load balancer reliability: $success_rate% ($successful_requests/$total_requests)"
        elif [[ $success_rate -ge 70 ]]; then
            log_warning "Load balancer reliability: $success_rate% ($successful_requests/$total_requests)"
        else
            log_error "Load balancer reliability: $success_rate% ($successful_requests/$total_requests)"
        fi
    fi
}

# CDN validation functions
validate_cdn() {
    log_info "Validating CDN configuration and performance..."
    
    # Validate CloudFront configuration
    validate_cloudfront_config
    
    # Test CDN endpoints
    test_cdn_endpoints
    
    # Check CDN caching
    check_cdn_caching
    
    # Check CDN performance
    check_cdn_performance
}

validate_cloudfront_config() {
    log_info "Validating CloudFront CDN configuration..."
    
    local cloudfront_config="$DEPLOYMENT_DIR/cdn/cloudfront-config.json"
    
    if [[ -f "$cloudfront_config" ]]; then
        # Validate JSON syntax
        if command -v jq >/dev/null 2>&1; then
            if jq empty "$cloudfront_config" >/dev/null 2>&1; then
                log_success "CloudFront configuration JSON is valid"
            else
                log_error "CloudFront configuration JSON is invalid"
                return 1
            fi
        elif command -v python3 >/dev/null 2>&1; then
            if python3 -c "import json; json.load(open('$cloudfront_config'))" 2>/dev/null; then
                log_success "CloudFront configuration JSON is valid"
            else
                log_error "CloudFront configuration JSON is invalid"
                return 1
            fi
        else
            log_warning "Cannot validate JSON syntax (jq or python3 not available)"
        fi
        
        # Check for required configuration
        check_cloudfront_settings "$cloudfront_config"
        
    else
        log_warning "CloudFront configuration file not found: $cloudfront_config"
    fi
}

check_cloudfront_settings() {
    local config_file="$1"
    
    log_info "Checking CloudFront settings..."
    
    # Check for origins
    if grep -q "Origins" "$config_file"; then
        log_success "Origin configuration found"
    else
        log_error "No origin configuration found"
    fi
    
    # Check for caching behavior
    if grep -q "CacheBehaviors" "$config_file" || grep -q "DefaultCacheBehavior" "$config_file"; then
        log_success "Cache behavior configuration found"
    else
        log_warning "No cache behavior configuration found"
    fi
    
    # Check for SSL configuration
    if grep -q "ViewerCertificate" "$config_file"; then
        log_success "SSL certificate configuration found"
    else
        log_warning "No SSL certificate configuration found"
    fi
    
    # Check for compression
    if grep -q "Compress.*true" "$config_file"; then
        log_success "Compression is enabled"
    else
        log_warning "Compression is not enabled"
    fi
}

test_cdn_endpoints() {
    log_info "Testing CDN endpoints..."
    
    local domain="${1:-}"
    if [[ -z "$domain" ]]; then
        log_warning "No domain provided for CDN testing"
        return 0
    fi
    
    # Test common CDN endpoints
    local cdn_endpoints=(
        "https://$domain"
        "https://$domain/static/css/"
        "https://$domain/static/js/"
        "https://$domain/static/images/"
        "https://$domain/_next/static/"
    )
    
    for endpoint in "${cdn_endpoints[@]}"; do
        test_cdn_endpoint "$endpoint"
    done
}

test_cdn_endpoint() {
    local endpoint="$1"
    
    if command -v curl >/dev/null 2>&1; then
        local response_headers
        response_headers=$(curl -s -I "$endpoint" 2>/dev/null)
        
        if [[ -n "$response_headers" ]]; then
            # Check for CDN headers
            if echo "$response_headers" | grep -qi "cloudfront\|cdn\|cache"; then
                log_success "CDN headers detected for: $endpoint"
            else
                log_warning "No CDN headers detected for: $endpoint"
            fi
            
            # Check response code
            local response_code=$(echo "$response_headers" | head -1 | awk '{print $2}')
            case "$response_code" in
                200|301|302|304)
                    log_success "CDN endpoint accessible: $endpoint (HTTP $response_code)"
                    ;;
                *)
                    log_warning "CDN endpoint responded with HTTP $response_code: $endpoint"
                    ;;
            esac
        else
            log_warning "No response from CDN endpoint: $endpoint"
        fi
    fi
}

check_cdn_caching() {
    log_info "Checking CDN caching behavior..."
    
    local domain="${1:-}"
    if [[ -z "$domain" ]]; then
        log_warning "No domain provided for CDN caching test"
        return 0
    fi
    
    local test_endpoint="https://$domain"
    
    if command -v curl >/dev/null 2>&1; then
        local cache_headers
        cache_headers=$(curl -s -I "$test_endpoint" 2>/dev/null | grep -i "cache\|expires\|etag")
        
        if [[ -n "$cache_headers" ]]; then
            log_success "Cache headers found"
            echo "$cache_headers" | while read -r header; do
                log_info "  Cache header: $header"
            done
        else
            log_warning "No cache headers found"
        fi
        
        # Test cache hit/miss
        local first_request=$(curl -s -I "$test_endpoint" 2>/dev/null | grep -i "x-cache\|cf-cache-status")
        sleep 1
        local second_request=$(curl -s -I "$test_endpoint" 2>/dev/null | grep -i "x-cache\|cf-cache-status")
        
        if [[ -n "$first_request" ]] && [[ -n "$second_request" ]]; then
            log_success "CDN cache status headers detected"
        else
            log_warning "No CDN cache status headers detected"
        fi
    fi
}

check_cdn_performance() {
    log_info "Checking CDN performance..."
    
    local domain="${1:-}"
    if [[ -z "$domain" ]]; then
        log_warning "No domain provided for CDN performance test"
        return 0
    fi
    
    local test_endpoint="https://$domain"
    
    if command -v curl >/dev/null 2>&1; then
        # Test response times
        local response_time
        response_time=$(curl -s -o /dev/null -w "%{time_total}" "$test_endpoint" 2>/dev/null)
        
        if [[ -n "$response_time" ]]; then
            local response_ms=$(echo "$response_time * 1000" | bc 2>/dev/null || echo "unknown")
            
            if [[ "$response_ms" != "unknown" ]]; then
                log_info "CDN response time: ${response_ms}ms"
                
                if (( $(echo "$response_time < 1.0" | bc -l 2>/dev/null || echo 0) )); then
                    log_success "CDN response time is excellent: ${response_ms}ms"
                elif (( $(echo "$response_time < 3.0" | bc -l 2>/dev/null || echo 0) )); then
                    log_success "CDN response time is good: ${response_ms}ms"
                else
                    log_warning "CDN response time is slow: ${response_ms}ms"
                fi
            fi
        fi
        
        # Test compression
        local content_encoding
        content_encoding=$(curl -s -I -H "Accept-Encoding: gzip,deflate" "$test_endpoint" 2>/dev/null | grep -i "content-encoding")
        
        if echo "$content_encoding" | grep -qi "gzip\|deflate\|br"; then
            log_success "Content compression is enabled: $content_encoding"
        else
            log_warning "Content compression is not detected"
        fi
    fi
}

# Docker infrastructure validation
validate_docker_infrastructure() {
    log_info "Validating Docker infrastructure..."
    
    # Check Docker daemon
    check_docker_daemon
    
    # Check Docker Compose services
    check_docker_compose_services
    
    # Check container health
    check_container_health
    
    # Check resource usage
    check_docker_resource_usage
}

check_docker_daemon() {
    log_info "Checking Docker daemon..."
    
    if command -v docker >/dev/null 2>&1; then
        if docker info >/dev/null 2>&1; then
            log_success "Docker daemon is running"
            
            # Check Docker version
            local docker_version=$(docker --version | awk '{print $3}' | sed 's/,//')
            log_info "Docker version: $docker_version"
            
        else
            log_error "Docker daemon is not accessible"
            return 1
        fi
    else
        log_error "Docker is not installed"
        return 1
    fi
}

check_docker_compose_services() {
    log_info "Checking Docker Compose services..."
    
    if command -v docker-compose >/dev/null 2>&1; then
        # Check for running services
        local running_services
        running_services=$(docker-compose ps --services --filter status=running 2>/dev/null || echo "")
        
        if [[ -n "$running_services" ]]; then
            log_success "Docker Compose services are running:"
            echo "$running_services" | while read -r service; do
                log_info "  - $service"
            done
        else
            log_warning "No Docker Compose services are running"
        fi
        
        # Check for unhealthy services
        local unhealthy_services
        unhealthy_services=$(docker-compose ps --filter status=unhealthy 2>/dev/null || echo "")
        
        if [[ -n "$unhealthy_services" ]]; then
            log_error "Unhealthy Docker Compose services detected"
        else
            log_success "No unhealthy services detected"
        fi
        
    else
        log_warning "docker-compose not available"
    fi
}

check_container_health() {
    log_info "Checking container health..."
    
    if command -v docker >/dev/null 2>&1; then
        # Check for unhealthy containers
        local unhealthy_containers
        unhealthy_containers=$(docker ps --filter health=unhealthy --format "table {{.Names}}" 2>/dev/null | tail -n +2)
        
        if [[ -n "$unhealthy_containers" ]]; then
            log_error "Unhealthy containers detected:"
            echo "$unhealthy_containers" | while read -r container; do
                log_error "  - $container"
            done
        else
            log_success "No unhealthy containers detected"
        fi
        
        # Check container restarts
        local restarting_containers
        restarting_containers=$(docker ps --filter status=restarting --format "table {{.Names}}" 2>/dev/null | tail -n +2)
        
        if [[ -n "$restarting_containers" ]]; then
            log_warning "Containers in restart loop detected:"
            echo "$restarting_containers" | while read -r container; do
                log_warning "  - $container"
            done
        else
            log_success "No containers in restart loop"
        fi
    fi
}

check_docker_resource_usage() {
    log_info "Checking Docker resource usage..."
    
    if command -v docker >/dev/null 2>&1; then
        # Check container resource usage
        local container_stats
        container_stats=$(docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" 2>/dev/null | tail -n +2)
        
        if [[ -n "$container_stats" ]]; then
            log_info "Container resource usage:"
            echo "$container_stats" | while read -r line; do
                log_info "  $line"
            done
        fi
        
        # Check for high resource usage
        local high_cpu_containers
        high_cpu_containers=$(docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}" 2>/dev/null | tail -n +2 | awk '$2 > 80.0 {print $1}')
        
        if [[ -n "$high_cpu_containers" ]]; then
            log_warning "Containers with high CPU usage detected:"
            echo "$high_cpu_containers" | while read -r container; do
                log_warning "  - $container"
            done
        else
            log_success "No containers with high CPU usage"
        fi
    fi
}

# Network connectivity validation
validate_network_connectivity() {
    log_info "Validating network connectivity..."
    
    local domain="${1:-localhost}"
    
    # Test external connectivity
    test_external_connectivity
    
    # Test internal service connectivity
    test_internal_connectivity "$domain"
    
    # Check DNS resolution
    check_dns_resolution "$domain"
}

test_external_connectivity() {
    log_info "Testing external connectivity..."
    
    local external_services=(
        "8.8.8.8"              # Google DNS
        "1.1.1.1"              # Cloudflare DNS
        "github.com"           # GitHub
        "registry-1.docker.io" # Docker Hub
    )
    
    for service in "${external_services[@]}"; do
        if command -v ping >/dev/null 2>&1; then
            if ping -c 1 -W 5 "$service" >/dev/null 2>&1; then
                log_success "External connectivity to $service: OK"
            else
                log_warning "External connectivity to $service: FAILED"
            fi
        else
            log_warning "ping not available for connectivity testing"
            break
        fi
    done
}

test_internal_connectivity() {
    local domain="$1"
    
    log_info "Testing internal service connectivity..."
    
    # Test application ports
    local internal_ports=(
        "3000"  # Next.js application
        "80"    # HTTP
        "443"   # HTTPS
    )
    
    for port in "${internal_ports[@]}"; do
        if command -v nc >/dev/null 2>&1; then
            if nc -z "$domain" "$port" 2>/dev/null; then
                log_success "Internal connectivity to $domain:$port: OK"
            else
                log_warning "Internal connectivity to $domain:$port: FAILED"
            fi
        else
            log_warning "nc (netcat) not available for port testing"
            break
        fi
    done
}

check_dns_resolution() {
    local domain="$1"
    
    log_info "Checking DNS resolution for $domain..."
    
    if command -v nslookup >/dev/null 2>&1; then
        if nslookup "$domain" >/dev/null 2>&1; then
            log_success "DNS resolution for $domain: OK"
            
            # Get IP addresses
            local ip_addresses
            ip_addresses=$(nslookup "$domain" 2>/dev/null | grep "Address:" | tail -n +2 | awk '{print $2}')
            
            if [[ -n "$ip_addresses" ]]; then
                log_info "Resolved IP addresses:"
                echo "$ip_addresses" | while read -r ip; do
                    log_info "  - $ip"
                done
            fi
        else
            log_error "DNS resolution for $domain: FAILED"
        fi
    elif command -v dig >/dev/null 2>&1; then
        if dig "$domain" +short >/dev/null 2>&1; then
            log_success "DNS resolution for $domain: OK"
        else
            log_error "DNS resolution for $domain: FAILED"
        fi
    else
        log_warning "No DNS lookup tools available"
    fi
}

# Report generation
generate_infrastructure_report() {
    log_info "Generating infrastructure validation report..."
    
    local total_checks=$((PASSED_CHECKS + FAILED_CHECKS + WARNING_CHECKS))
    
    cat >> "$VALIDATION_LOG" << EOF

================================================================================
                      INFRASTRUCTURE VALIDATION SUMMARY
================================================================================

Validation completed at: $(date)
Total checks performed: $total_checks

Results:
  ✓ Passed:   $PASSED_CHECKS
  ⚠ Warnings: $WARNING_CHECKS  
  ✗ Failed:   $FAILED_CHECKS

Infrastructure Components Validated:
  - Load Balancer (Nginx/HAProxy)
  - CDN Configuration (CloudFront)
  - Docker Infrastructure
  - Network Connectivity

EOF

    # Infrastructure recommendations
    if [[ $FAILED_CHECKS -gt 0 ]] || [[ $WARNING_CHECKS -gt 0 ]]; then
        cat >> "$VALIDATION_LOG" << EOF

INFRASTRUCTURE RECOMMENDATIONS:
- Address all failed infrastructure checks before deployment
- Review warnings and optimize configurations where possible
- Ensure load balancer health checks are properly configured
- Verify CDN caching policies are optimized for your application
- Monitor container resource usage and scale as needed
- Test failover scenarios for high availability

EOF
    fi

    if [[ $FAILED_CHECKS -eq 0 ]]; then
        log_success "Infrastructure validation completed successfully!"
        if [[ $WARNING_CHECKS -gt 0 ]]; then
            log_warning "Please review $WARNING_CHECKS warning(s) for optimal performance"
        fi
        echo "0" # Exit code for success
    else
        log_error "Infrastructure validation failed with $FAILED_CHECKS critical issue(s)"
        log_error "Please address all failed checks before proceeding with deployment"
        echo "1" # Exit code for failure
    fi
}

# Main execution
show_usage() {
    cat << EOF
Usage: $0 [domain] [options]

Arguments:
  domain       Domain name to validate (optional, defaults to localhost)

Options:
  --lb         Only validate load balancer
  --cdn        Only validate CDN
  --docker     Only validate Docker infrastructure
  --network    Only validate network connectivity
  --all        Run all infrastructure validations (default)

Examples:
  $0                                    # Validate all with localhost
  $0 heypeter-academy.com              # Validate all for domain
  $0 heypeter-academy.com --lb         # Only validate load balancer
  $0 heypeter-academy.com --cdn        # Only validate CDN

EOF
}

main() {
    local domain="${1:-localhost}"
    local lb_only=false
    local cdn_only=false
    local docker_only=false
    local network_only=false
    local run_all=true
    
    # Parse options
    shift 2>/dev/null || true
    while [[ $# -gt 0 ]]; do
        case $1 in
            --lb)
                lb_only=true
                run_all=false
                shift
                ;;
            --cdn)
                cdn_only=true
                run_all=false
                shift
                ;;
            --docker)
                docker_only=true
                run_all=false
                shift
                ;;
            --network)
                network_only=true
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
    
    log_info "Starting infrastructure validation for domain: $domain"
    log_info "Validation log: $VALIDATION_LOG"
    
    # Run selected validations
    if [[ "$lb_only" == true ]] || [[ "$run_all" == true ]]; then
        validate_load_balancer "$domain"
    fi
    
    if [[ "$cdn_only" == true ]] || [[ "$run_all" == true ]]; then
        validate_cdn "$domain"
    fi
    
    if [[ "$docker_only" == true ]] || [[ "$run_all" == true ]]; then
        validate_docker_infrastructure
    fi
    
    if [[ "$network_only" == true ]] || [[ "$run_all" == true ]]; then
        validate_network_connectivity "$domain"
    fi
    
    # Generate final report
    local exit_code=$(generate_infrastructure_report)
    
    log_info "Full validation log available at: $VALIDATION_LOG"
    
    exit "$exit_code"
}

# Run main function with all arguments
main "$@"