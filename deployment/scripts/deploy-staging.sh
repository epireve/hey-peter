#!/bin/bash

# HeyPeter Academy LMS - Staging Deployment Script
# This script handles the complete staging environment deployment

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEPLOYMENT_DIR="$PROJECT_ROOT/deployment"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$DEPLOYMENT_DIR/reports/staging_deployment_${TIMESTAMP}.log"

# Default values
ENVIRONMENT="staging"
DOMAIN="staging.heypeter-academy.com"
S3_BUCKET="heypeter-staging-assets"
ADMIN_EMAIL="admin@heypeter-academy.com"
SKIP_TESTS="false"
DRY_RUN="false"

# Create reports directory if it doesn't exist
mkdir -p "$DEPLOYMENT_DIR/reports"

# Logging function
log() {
    echo -e "${2:-}$1${NC}" | tee -a "$LOG_FILE"
}

# Error handler
error_exit() {
    log "ERROR: $1" "$RED"
    exit 1
}

# Success message
success() {
    log "✓ $1" "$GREEN"
}

# Warning message
warning() {
    log "⚠ $1" "$YELLOW"
}

# Info message
info() {
    log "ℹ $1" "$BLUE"
}

# Usage information
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Options:
    -d, --domain DOMAIN          Staging domain (default: staging.heypeter-academy.com)
    -b, --bucket BUCKET          S3 bucket for assets (default: heypeter-staging-assets)
    -e, --email EMAIL            Admin email (default: admin@heypeter-academy.com)
    -s, --skip-tests             Skip test execution
    -n, --dry-run                Perform dry run without actual deployment
    -h, --help                   Display this help message

Example:
    $0 --domain staging.example.com --bucket my-staging-bucket --email admin@example.com

EOF
    exit 1
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--domain)
            DOMAIN="$2"
            shift 2
            ;;
        -b|--bucket)
            S3_BUCKET="$2"
            shift 2
            ;;
        -e|--email)
            ADMIN_EMAIL="$2"
            shift 2
            ;;
        -s|--skip-tests)
            SKIP_TESTS="true"
            shift
            ;;
        -n|--dry-run)
            DRY_RUN="true"
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            error_exit "Unknown option: $1"
            ;;
    esac
done

# Start deployment
log "=== HeyPeter Academy LMS Staging Deployment ===" "$BLUE"
log "Timestamp: $(date)"
log "Domain: $DOMAIN"
log "S3 Bucket: $S3_BUCKET"
log "Admin Email: $ADMIN_EMAIL"
log "Skip Tests: $SKIP_TESTS"
log "Dry Run: $DRY_RUN"
log "=========================================="

# Step 1: Validate environment
validate_environment() {
    info "Validating deployment environment..."
    
    # Check for required tools
    local required_tools=("docker" "docker-compose" "npm" "git" "aws" "openssl")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            error_exit "Required tool not found: $tool"
        fi
    done
    success "All required tools are installed"
    
    # Check for environment file
    if [[ ! -f "$DEPLOYMENT_DIR/environments/.env.staging" ]]; then
        warning "Staging environment file not found. Creating from template..."
        cp "$DEPLOYMENT_DIR/environments/staging.env.example" "$DEPLOYMENT_DIR/environments/.env.staging"
        error_exit "Please update $DEPLOYMENT_DIR/environments/.env.staging with your values"
    fi
    success "Environment file found"
    
    # Validate environment variables
    source "$DEPLOYMENT_DIR/environments/.env.staging"
    local required_vars=("NEXT_PUBLIC_SUPABASE_URL" "NEXT_PUBLIC_SUPABASE_ANON_KEY" "SUPABASE_SERVICE_ROLE_KEY")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            error_exit "Required environment variable not set: $var"
        fi
    done
    success "Environment variables validated"
}

# Step 2: Setup SSL certificates
setup_ssl() {
    info "Setting up SSL certificates for staging..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        info "DRY RUN: Would setup SSL certificates"
        return
    fi
    
    # Use self-signed certificates for staging
    local ssl_dir="$DEPLOYMENT_DIR/ssl/staging"
    mkdir -p "$ssl_dir"
    
    if [[ ! -f "$ssl_dir/cert.pem" ]]; then
        info "Generating self-signed certificate for staging..."
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "$ssl_dir/key.pem" \
            -out "$ssl_dir/cert.pem" \
            -subj "/C=US/ST=State/L=City/O=HeyPeter Academy/CN=$DOMAIN"
        success "Self-signed certificate generated"
    else
        info "SSL certificate already exists"
    fi
}

# Step 3: Deploy database migrations
deploy_database() {
    info "Deploying database migrations to staging..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        info "DRY RUN: Would deploy database migrations"
        return
    fi
    
    cd "$PROJECT_ROOT"
    
    # Run migrations using Supabase CLI
    info "Running database migrations..."
    if ! npx supabase db push --linked; then
        error_exit "Failed to run database migrations"
    fi
    success "Database migrations completed"
    
    # Seed staging data
    info "Seeding staging data..."
    if [[ -f "$SCRIPT_DIR/seed-staging-data.sh" ]]; then
        "$SCRIPT_DIR/seed-staging-data.sh" || warning "Staging data seeding had issues"
    else
        warning "Staging seed script not found, skipping..."
    fi
}

# Step 4: Build and deploy application
deploy_application() {
    info "Building and deploying application..."
    
    cd "$PROJECT_ROOT"
    
    # Build application
    if [[ "$DRY_RUN" == "false" ]]; then
        info "Building Next.js application..."
        npm ci --production=false
        npm run build
        success "Application built successfully"
    else
        info "DRY RUN: Would build application"
    fi
    
    # Deploy with Docker Compose
    info "Deploying with Docker Compose..."
    if [[ "$DRY_RUN" == "false" ]]; then
        docker-compose -f docker-compose.staging.yml down
        docker-compose -f docker-compose.staging.yml build
        docker-compose -f docker-compose.staging.yml up -d
        success "Application deployed with Docker Compose"
    else
        info "DRY RUN: Would deploy with Docker Compose"
    fi
}

# Step 5: Setup monitoring
setup_monitoring() {
    info "Setting up monitoring for staging..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        info "DRY RUN: Would setup monitoring"
        return
    fi
    
    # Wait for services to be ready
    info "Waiting for services to start..."
    sleep 30
    
    # Configure Prometheus
    if docker ps | grep -q "heypeter-prometheus-staging"; then
        success "Prometheus is running"
    else
        warning "Prometheus is not running"
    fi
    
    # Configure Grafana
    if docker ps | grep -q "heypeter-grafana-staging"; then
        success "Grafana is running"
        info "Grafana URL: http://$DOMAIN:3001"
        info "Default credentials: admin / ${GRAFANA_ADMIN_PASSWORD:-admin}"
    else
        warning "Grafana is not running"
    fi
}

# Step 6: Configure CDN (optional for staging)
setup_cdn() {
    info "Setting up CDN for staging (optional)..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        info "DRY RUN: Would setup CDN"
        return
    fi
    
    # For staging, we might skip CDN or use a simplified setup
    warning "CDN setup skipped for staging environment"
}

# Step 7: Run tests
run_tests() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        warning "Skipping tests as requested"
        return
    fi
    
    info "Running deployment tests..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        info "DRY RUN: Would run tests"
        return
    fi
    
    # Health check
    info "Testing application health endpoint..."
    if curl -f -k "https://$DOMAIN/api/health" &> /dev/null; then
        success "Health check passed"
    else
        error_exit "Health check failed"
    fi
    
    # Basic functionality tests
    info "Running basic functionality tests..."
    cd "$PROJECT_ROOT"
    npm run test:e2e:staging || warning "Some E2E tests failed"
}

# Step 8: Generate deployment report
generate_report() {
    info "Generating deployment report..."
    
    local report_file="$DEPLOYMENT_DIR/reports/staging_deployment_report_${TIMESTAMP}.txt"
    
    cat > "$report_file" << EOF
HEYPETER ACADEMY LMS - STAGING DEPLOYMENT REPORT
================================================

Deployment Date: $(date)
Environment: Staging
Domain: $DOMAIN
S3 Bucket: $S3_BUCKET

DEPLOYMENT STATUS
-----------------
$(docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep heypeter)

SERVICE URLS
------------
Application: https://$DOMAIN
Prometheus: http://$DOMAIN:9090
Grafana: http://$DOMAIN:3001
Redis Commander: http://$DOMAIN:8081

HEALTH CHECK RESULTS
--------------------
Application: $(curl -s -o /dev/null -w "%{http_code}" -k https://$DOMAIN/api/health || echo "Failed")
Database: $(docker exec heypeter-academy-staging npm run db:test &> /dev/null && echo "Connected" || echo "Failed")

NEXT STEPS
----------
1. Access the application at https://$DOMAIN
2. Login with test credentials
3. Verify all features are working
4. Monitor logs: docker logs -f heypeter-academy-staging
5. View metrics in Grafana

TROUBLESHOOTING
---------------
- Check logs: docker logs [container-name]
- Restart services: docker-compose -f docker-compose.staging.yml restart
- View all containers: docker ps -a
- Check environment: docker exec heypeter-academy-staging env

EOF
    
    success "Deployment report generated: $report_file"
    cat "$report_file"
}

# Main deployment flow
main() {
    # Create log directory
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Execute deployment steps
    validate_environment
    setup_ssl
    deploy_database
    deploy_application
    setup_monitoring
    setup_cdn
    run_tests
    generate_report
    
    # Final summary
    log ""
    log "=== STAGING DEPLOYMENT COMPLETED ===" "$GREEN"
    log "Application URL: https://$DOMAIN"
    log "Monitoring: http://$DOMAIN:3001"
    log "Logs: $LOG_FILE"
    log "===================================="
}

# Run main function
main "$@"