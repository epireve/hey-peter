#!/bin/bash

# Staging Smoke Tests for HeyPeter Academy LMS
# Runs essential tests to verify staging deployment

set -euo pipefail

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
DOMAIN="${STAGING_DOMAIN:-staging.heypeter-academy.com}"
PROTOCOL="${STAGING_PROTOCOL:-https}"
SKIP_SSL="-k"  # Skip SSL verification for self-signed certs

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

# Test credentials
ADMIN_EMAIL="admin@staging.heypeter.com"
TEACHER_EMAIL="teacher1@staging.heypeter.com"
STUDENT_EMAIL="student1@staging.heypeter.com"
TEST_PASSWORD="staging123"

# Helper functions
log_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((TESTS_PASSED++))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((TESTS_FAILED++))
}

# Test functions
test_homepage() {
    log_test "Testing homepage accessibility..."
    
    local response=$(curl -s -o /dev/null -w "%{http_code}" $SKIP_SSL "${PROTOCOL}://${DOMAIN}/")
    
    if [[ "$response" == "200" ]]; then
        log_pass "Homepage loads successfully (HTTP 200)"
    else
        log_fail "Homepage returned HTTP $response"
    fi
}

test_api_health() {
    log_test "Testing API health endpoint..."
    
    local response=$(curl -s $SKIP_SSL "${PROTOCOL}://${DOMAIN}/api/health")
    
    if echo "$response" | grep -q "ok"; then
        log_pass "API health check passed"
    else
        log_fail "API health check failed"
    fi
}

test_authentication() {
    log_test "Testing authentication system..."
    
    # Test login endpoint exists
    local login_response=$(curl -s -o /dev/null -w "%{http_code}" $SKIP_SSL \
        -X POST "${PROTOCOL}://${DOMAIN}/api/auth/signin" \
        -H "Content-Type: application/json" \
        -d "{}")
    
    if [[ "$login_response" == "401" ]] || [[ "$login_response" == "400" ]]; then
        log_pass "Authentication endpoint is active"
    else
        log_fail "Authentication endpoint returned unexpected code: $login_response"
    fi
}

test_database_connectivity() {
    log_test "Testing database connectivity..."
    
    # Check if the application can connect to database
    local db_test=$(docker exec heypeter-academy-staging npm run db:test 2>&1 || echo "FAILED")
    
    if [[ "$db_test" != *"FAILED"* ]]; then
        log_pass "Database connection successful"
    else
        log_fail "Database connection failed"
    fi
}

test_redis_connectivity() {
    log_test "Testing Redis connectivity..."
    
    local redis_ping=$(docker exec heypeter-redis-staging redis-cli ping 2>/dev/null || echo "FAILED")
    
    if [[ "$redis_ping" == "PONG" ]]; then
        log_pass "Redis is responding"
    else
        log_fail "Redis is not responding"
    fi
}

test_static_assets() {
    log_test "Testing static asset serving..."
    
    # Test favicon
    local favicon=$(curl -s -o /dev/null -w "%{http_code}" $SKIP_SSL "${PROTOCOL}://${DOMAIN}/favicon.ico")
    
    if [[ "$favicon" == "200" ]] || [[ "$favicon" == "304" ]]; then
        log_pass "Static assets are being served"
    else
        log_fail "Static assets not accessible (HTTP $favicon)"
    fi
}

test_monitoring_services() {
    log_test "Testing monitoring services..."
    
    # Test Prometheus
    local prometheus=$(curl -s -o /dev/null -w "%{http_code}" "http://${DOMAIN}:9090/-/healthy" 2>/dev/null || echo "000")
    if [[ "$prometheus" == "200" ]]; then
        log_pass "Prometheus is healthy"
    else
        log_fail "Prometheus returned HTTP $prometheus"
    fi
    
    # Test Grafana
    local grafana=$(curl -s -o /dev/null -w "%{http_code}" "http://${DOMAIN}:3001/api/health" 2>/dev/null || echo "000")
    if [[ "$grafana" == "200" ]]; then
        log_pass "Grafana is healthy"
    else
        log_fail "Grafana returned HTTP $grafana"
    fi
}

test_performance() {
    log_test "Testing basic performance..."
    
    # Measure homepage load time
    local start_time=$(date +%s%N)
    curl -s $SKIP_SSL "${PROTOCOL}://${DOMAIN}/" > /dev/null
    local end_time=$(date +%s%N)
    local response_time=$(( (end_time - start_time) / 1000000 ))
    
    if [[ $response_time -lt 2000 ]]; then
        log_pass "Homepage loads in ${response_time}ms (good)"
    elif [[ $response_time -lt 5000 ]]; then
        log_pass "Homepage loads in ${response_time}ms (acceptable)"
    else
        log_fail "Homepage loads in ${response_time}ms (too slow)"
    fi
}

test_security_headers() {
    log_test "Testing security headers..."
    
    local headers=$(curl -s -I $SKIP_SSL "${PROTOCOL}://${DOMAIN}/" 2>/dev/null)
    
    # Check for security headers
    local security_headers=("X-Frame-Options" "X-Content-Type-Options" "X-XSS-Protection")
    local headers_found=0
    
    for header in "${security_headers[@]}"; do
        if echo "$headers" | grep -qi "$header"; then
            ((headers_found++))
        fi
    done
    
    if [[ $headers_found -eq ${#security_headers[@]} ]]; then
        log_pass "All security headers present"
    else
        log_fail "Missing some security headers ($headers_found/${#security_headers[@]})"
    fi
}

test_environment_isolation() {
    log_test "Testing environment isolation..."
    
    # Check for staging environment header
    local env_header=$(curl -s -I $SKIP_SSL "${PROTOCOL}://${DOMAIN}/" | grep -i "X-Environment" || echo "")
    
    if echo "$env_header" | grep -qi "staging"; then
        log_pass "Staging environment properly identified"
    else
        log_fail "Staging environment header not found"
    fi
}

# Main test execution
main() {
    echo -e "${BLUE}=== HeyPeter Academy Staging Smoke Tests ===${NC}"
    echo "Target: ${PROTOCOL}://${DOMAIN}"
    echo "Time: $(date)"
    echo "============================================"
    
    # Run all tests
    test_homepage
    test_api_health
    test_authentication
    test_database_connectivity
    test_redis_connectivity
    test_static_assets
    test_monitoring_services
    test_performance
    test_security_headers
    test_environment_isolation
    
    # Summary
    echo -e "\n${BLUE}=== Test Summary ===${NC}"
    echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
    
    if [[ $TESTS_FAILED -eq 0 ]]; then
        echo -e "\n${GREEN}✓ All smoke tests passed!${NC}"
        echo "The staging environment is ready for testing."
        exit 0
    else
        echo -e "\n${RED}✗ Some tests failed!${NC}"
        echo "Please check the failed tests before proceeding."
        exit 1
    fi
}

# Run tests
main "$@"