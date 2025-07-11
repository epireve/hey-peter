#!/bin/bash

# Staging Environment Health Check Script
# Performs comprehensive health checks on the staging deployment

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
DOMAIN="${STAGING_DOMAIN:-staging.heypeter-academy.com}"
PROTOCOL="${STAGING_PROTOCOL:-https}"
SKIP_SSL_VERIFY="-k"  # Skip SSL verification for self-signed certs

# Results tracking
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNINGS=0

# Log functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED_CHECKS++))
    ((TOTAL_CHECKS++))
}

log_failure() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAILED_CHECKS++))
    ((TOTAL_CHECKS++))
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    ((WARNINGS++))
}

# Health check functions
check_service() {
    local service_name=$1
    local url=$2
    local expected_code=${3:-200}
    
    log_info "Checking $service_name..."
    
    local response_code=$(curl -s -o /dev/null -w "%{http_code}" $SKIP_SSL_VERIFY "$url" || echo "000")
    
    if [[ "$response_code" == "$expected_code" ]]; then
        log_success "$service_name is accessible (HTTP $response_code)"
        return 0
    else
        log_failure "$service_name returned HTTP $response_code (expected $expected_code)"
        return 1
    fi
}

check_docker_container() {
    local container_name=$1
    
    log_info "Checking Docker container: $container_name"
    
    if docker ps --format "{{.Names}}" | grep -q "^${container_name}$"; then
        local status=$(docker inspect -f '{{.State.Status}}' "$container_name" 2>/dev/null || echo "unknown")
        if [[ "$status" == "running" ]]; then
            log_success "Container $container_name is running"
            
            # Check container health if available
            local health=$(docker inspect -f '{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "none")
            if [[ "$health" == "healthy" ]]; then
                log_success "Container $container_name is healthy"
            elif [[ "$health" == "unhealthy" ]]; then
                log_failure "Container $container_name is unhealthy"
            fi
        else
            log_failure "Container $container_name is $status"
        fi
    else
        log_failure "Container $container_name not found"
    fi
}

check_api_endpoint() {
    local endpoint=$1
    local description=$2
    
    log_info "Testing API endpoint: $description"
    
    local url="${PROTOCOL}://${DOMAIN}${endpoint}"
    local response=$(curl -s $SKIP_SSL_VERIFY "$url" || echo "{}")
    
    if echo "$response" | jq . >/dev/null 2>&1; then
        log_success "$description returns valid JSON"
        return 0
    else
        log_failure "$description does not return valid JSON"
        return 1
    fi
}

check_database_connection() {
    log_info "Checking database connection..."
    
    if docker exec heypeter-academy-staging npm run db:test &>/dev/null; then
        log_success "Database connection successful"
    else
        log_failure "Database connection failed"
    fi
}

check_redis_connection() {
    log_info "Checking Redis connection..."
    
    if docker exec heypeter-redis-staging redis-cli ping | grep -q "PONG"; then
        log_success "Redis is responding"
    else
        log_failure "Redis is not responding"
    fi
}

# Main health check execution
main() {
    echo -e "${BLUE}=== HeyPeter Academy Staging Health Check ===${NC}"
    echo "Domain: $DOMAIN"
    echo "Time: $(date)"
    echo "=========================================="
    
    # Check Docker containers
    echo -e "\n${BLUE}Docker Container Status:${NC}"
    check_docker_container "heypeter-academy-staging"
    check_docker_container "heypeter-redis-staging"
    check_docker_container "heypeter-nginx-staging"
    check_docker_container "heypeter-prometheus-staging"
    check_docker_container "heypeter-grafana-staging"
    
    # Check main application
    echo -e "\n${BLUE}Application Health:${NC}"
    check_service "Main Application" "${PROTOCOL}://${DOMAIN}/" 200
    check_service "Health Endpoint" "${PROTOCOL}://${DOMAIN}/health" 200
    check_service "API Health" "${PROTOCOL}://${DOMAIN}/api/health" 200
    
    # Check API endpoints
    echo -e "\n${BLUE}API Endpoints:${NC}"
    check_api_endpoint "/api/health" "Health API"
    
    # Check monitoring services
    echo -e "\n${BLUE}Monitoring Services:${NC}"
    check_service "Prometheus" "http://${DOMAIN}:9090/-/healthy" 200
    check_service "Grafana" "http://${DOMAIN}:3001/api/health" 200
    
    # Check backend services
    echo -e "\n${BLUE}Backend Services:${NC}"
    check_database_connection
    check_redis_connection
    
    # Performance checks
    echo -e "\n${BLUE}Performance Metrics:${NC}"
    log_info "Checking response times..."
    
    local start_time=$(date +%s%N)
    curl -s $SKIP_SSL_VERIFY "${PROTOCOL}://${DOMAIN}/" > /dev/null
    local end_time=$(date +%s%N)
    local response_time=$(( (end_time - start_time) / 1000000 ))
    
    if [[ $response_time -lt 1000 ]]; then
        log_success "Homepage loads in ${response_time}ms"
    elif [[ $response_time -lt 3000 ]]; then
        log_warning "Homepage loads in ${response_time}ms (slow)"
    else
        log_failure "Homepage loads in ${response_time}ms (very slow)"
    fi
    
    # Summary
    echo -e "\n${BLUE}=== Health Check Summary ===${NC}"
    echo "Total Checks: $TOTAL_CHECKS"
    echo -e "Passed: ${GREEN}$PASSED_CHECKS${NC}"
    echo -e "Failed: ${RED}$FAILED_CHECKS${NC}"
    echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
    
    if [[ $FAILED_CHECKS -eq 0 ]]; then
        echo -e "\n${GREEN}✓ All health checks passed!${NC}"
        exit 0
    else
        echo -e "\n${RED}✗ Some health checks failed!${NC}"
        exit 1
    fi
}

# Run main function
main "$@"