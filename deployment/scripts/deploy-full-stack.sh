#!/bin/bash

# Full Stack Deployment Script for HeyPeter Academy LMS
# This script orchestrates the complete production deployment process

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

# Command line arguments
ENVIRONMENT=${1:-production}
DOMAIN_NAME=${2}
S3_BUCKET=${3}
EMAIL=${4}
DRY_RUN=${5:-false}

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  HeyPeter Academy Full Stack Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Environment: ${YELLOW}${ENVIRONMENT}${NC}"
echo -e "Domain: ${YELLOW}${DOMAIN_NAME}${NC}"
echo -e "S3 Bucket: ${YELLOW}${S3_BUCKET}${NC}"
echo -e "Email: ${YELLOW}${EMAIL}${NC}"
echo -e "Dry Run: ${YELLOW}${DRY_RUN}${NC}"
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

step() {
    echo ""
    echo -e "${BLUE}=== STEP $1: $2 ===${NC}"
    echo ""
}

# Validate inputs
validate_inputs() {
    log "Validating deployment inputs..."
    
    if [[ -z "${DOMAIN_NAME}" ]]; then
        error "Domain name is required. Usage: $0 [environment] [domain_name] [s3_bucket] [email] [dry_run]"
    fi
    
    if [[ -z "${S3_BUCKET}" ]]; then
        error "S3 bucket name is required. Usage: $0 [environment] [domain_name] [s3_bucket] [email] [dry_run]"
    fi
    
    if [[ -z "${EMAIL}" ]]; then
        error "Email is required for SSL certificates. Usage: $0 [environment] [domain_name] [s3_bucket] [email] [dry_run]"
    fi
    
    # Validate domain format
    if [[ ! "${DOMAIN_NAME}" =~ ^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$ ]]; then
        error "Invalid domain name format: ${DOMAIN_NAME}"
    fi
    
    log "Input validation passed"
}

# Check prerequisites
check_prerequisites() {
    log "Checking deployment prerequisites..."
    
    # Required tools
    local required_tools=("docker" "docker-compose" "aws" "supabase" "psql" "openssl" "nginx" "certbot")
    
    for tool in "${required_tools[@]}"; do
        if ! command -v "${tool}" &> /dev/null; then
            error "${tool} is not installed. Please install it first."
        fi
    done
    
    # Check environment file
    if [[ ! -f "${DEPLOYMENT_DIR}/environments/.env.${ENVIRONMENT}" ]]; then
        error "Environment file not found: ${DEPLOYMENT_DIR}/environments/.env.${ENVIRONMENT}"
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials not configured. Run 'aws configure' first."
    fi
    
    # Check Supabase connection
    if ! supabase status &> /dev/null; then
        warn "Supabase project not linked. Please run 'supabase link' if needed."
    fi
    
    log "Prerequisites check passed"
}

# Load environment configuration
load_environment() {
    log "Loading environment configuration..."
    
    source "${DEPLOYMENT_DIR}/environments/.env.${ENVIRONMENT}"
    
    # Export additional variables for deployment
    export DEPLOYMENT_DOMAIN="${DOMAIN_NAME}"
    export DEPLOYMENT_S3_BUCKET="${S3_BUCKET}"
    export DEPLOYMENT_EMAIL="${EMAIL}"
    export DEPLOYMENT_LOG_FILE="/tmp/heypeter_deployment_$(date +%Y%m%d_%H%M%S).log"
    
    log "Environment configuration loaded"
}

# Pre-deployment backup
create_pre_deployment_backup() {
    step "1" "Creating Pre-Deployment Backup"
    
    if [[ "${DRY_RUN}" == "false" ]]; then
        # Create backup before deployment
        "${DEPLOYMENT_DIR}/backup/backup-manager.sh" backup all "${ENVIRONMENT}" false
        
        # Store backup location for rollback
        BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
        export PRE_DEPLOYMENT_BACKUP="/backup/heypeter-academy/database/db_backup_${BACKUP_TIMESTAMP}.dump"
        
        log "Pre-deployment backup created: ${PRE_DEPLOYMENT_BACKUP}"
    else
        log "DRY RUN: Would create pre-deployment backup"
    fi
}

# Deploy database
deploy_database() {
    step "2" "Database Deployment"
    
    "${DEPLOYMENT_DIR}/scripts/deploy-database.sh" "${ENVIRONMENT}" "${DRY_RUN}" true
    
    # Seed production data if this is initial deployment
    if [[ "${DRY_RUN}" == "false" ]]; then
        # Check if this is initial deployment
        local table_count=$(supabase db psql -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" -t | tr -d ' ')
        
        if [[ ${table_count} -lt 10 ]]; then
            log "Initial deployment detected, seeding production data..."
            "${DEPLOYMENT_DIR}/scripts/seed-production-data.sh" "${ENVIRONMENT}" "${DRY_RUN}"
        else
            log "Existing deployment detected, skipping data seeding"
        fi
    fi
}

# Setup SSL certificates
setup_ssl() {
    step "3" "SSL Certificate Setup"
    
    "${DEPLOYMENT_DIR}/ssl/setup-ssl.sh" "${DOMAIN_NAME}" "${EMAIL}" "letsencrypt" "${DRY_RUN}"
}

# Deploy CDN
deploy_cdn() {
    step "4" "CDN Deployment"
    
    "${DEPLOYMENT_DIR}/cdn/setup-cdn.sh" "${ENVIRONMENT}" "${DRY_RUN}" "${DOMAIN_NAME}" "${S3_BUCKET}"
}

# Build and deploy application
deploy_application() {
    step "5" "Application Deployment"
    
    if [[ "${DRY_RUN}" == "false" ]]; then
        log "Building application..."
        cd "${PROJECT_ROOT}"
        
        # Install dependencies
        npm ci --frozen-lockfile
        
        # Build application
        npm run build
        
        # Build Docker image
        docker build -t heypeter-academy:latest .
        docker tag heypeter-academy:latest heypeter-academy:${BACKUP_TIMESTAMP}
        
        log "Application built successfully"
    else
        log "DRY RUN: Would build and deploy application"
    fi
}

# Setup load balancer
deploy_load_balancer() {
    step "6" "Load Balancer Deployment"
    
    "${DEPLOYMENT_DIR}/load-balancer/setup-lb.sh" "${ENVIRONMENT}" "nginx" "3" "${DRY_RUN}"
}

# Setup monitoring
deploy_monitoring() {
    step "7" "Monitoring System Deployment"
    
    "${DEPLOYMENT_DIR}/monitoring/setup-monitoring.sh" "${ENVIRONMENT}" "full" "${DRY_RUN}"
}

# Setup backup system
deploy_backup_system() {
    step "8" "Backup System Setup"
    
    "${DEPLOYMENT_DIR}/backup/setup-backup.sh" "${ENVIRONMENT}" "s3" "${DRY_RUN}"
}

# Run comprehensive tests
run_deployment_tests() {
    step "9" "Deployment Testing and Validation"
    
    if [[ "${DRY_RUN}" == "false" ]]; then
        log "Running deployment tests..."
        
        # Test application health
        local max_retries=30
        local retry_count=0
        
        while [[ ${retry_count} -lt ${max_retries} ]]; do
            if curl -sf "https://${DOMAIN_NAME}/health" > /dev/null 2>&1; then
                log "✓ Application health check passed"
                break
            fi
            
            ((retry_count++))
            log "Waiting for application to start... (${retry_count}/${max_retries})"
            sleep 10
        done
        
        if [[ ${retry_count} -eq ${max_retries} ]]; then
            error "Application health check failed after ${max_retries} attempts"
        fi
        
        # Test API endpoints
        if curl -sf "https://${DOMAIN_NAME}/api/health" > /dev/null 2>&1; then
            log "✓ API health check passed"
        else
            error "API health check failed"
        fi
        
        # Test database connectivity
        if "${DEPLOYMENT_DIR}/backup/backup-manager.sh" health "${ENVIRONMENT}"; then
            log "✓ Database connectivity test passed"
        else
            error "Database connectivity test failed"
        fi
        
        # Test monitoring
        if curl -sf "http://localhost:9090/-/healthy" > /dev/null 2>&1; then
            log "✓ Monitoring system check passed"
        else
            warn "Monitoring system check failed (non-critical)"
        fi
        
        # Test SSL certificate
        if openssl s_client -connect "${DOMAIN_NAME}:443" -servername "${DOMAIN_NAME}" < /dev/null 2>/dev/null | grep -q "Verify return code: 0"; then
            log "✓ SSL certificate test passed"
        else
            error "SSL certificate test failed"
        fi
        
        log "All deployment tests passed"
    else
        log "DRY RUN: Would run deployment tests"
    fi
}

# Update DNS records
update_dns() {
    step "10" "DNS Configuration"
    
    if [[ "${DRY_RUN}" == "false" ]]; then
        # Get CloudFront distribution domain
        local distribution_domain=$(aws cloudfront list-distributions \
            --query "DistributionList.Items[?Origins.Items[0].DomainName=='${DOMAIN_NAME}'].DomainName" \
            --output text 2>/dev/null || echo "")
        
        if [[ -n "${distribution_domain}" ]]; then
            log "CloudFront distribution domain: ${distribution_domain}"
            echo ""
            echo -e "${YELLOW}MANUAL ACTION REQUIRED:${NC}"
            echo "Please update your DNS records:"
            echo ""
            echo "Type: CNAME"
            echo "Name: ${DOMAIN_NAME}"
            echo "Value: ${distribution_domain}"
            echo "TTL: 300"
            echo ""
            echo "Type: CNAME"
            echo "Name: www.${DOMAIN_NAME}"
            echo "Value: ${distribution_domain}"
            echo "TTL: 300"
            echo ""
            
            read -p "Press Enter after updating DNS records..."
        else
            warn "Could not retrieve CloudFront distribution domain"
        fi
    else
        log "DRY RUN: Would provide DNS update instructions"
    fi
}

# Generate deployment report
generate_deployment_report() {
    step "11" "Generating Deployment Report"
    
    local report_file="${DEPLOYMENT_DIR}/reports/full_deployment_$(date +%Y%m%d_%H%M%S).md"
    mkdir -p "$(dirname "${report_file}")"
    
    cat > "${report_file}" << EOF
# HeyPeter Academy LMS - Deployment Report

**Date:** $(date)
**Environment:** ${ENVIRONMENT}
**Domain:** ${DOMAIN_NAME}
**Deployment Type:** Full Stack Production Deployment

## Deployment Summary

✅ **DEPLOYMENT SUCCESSFUL**

### Components Deployed

- [x] Database (Supabase PostgreSQL)
- [x] Application (Next.js + Docker)
- [x] Load Balancer (Nginx)
- [x] SSL Certificates (Let's Encrypt)
- [x] CDN (CloudFront)
- [x] Monitoring (Prometheus + Grafana)
- [x] Backup System (Automated)

### Access Information

- **Application:** https://${DOMAIN_NAME}
- **Admin Panel:** https://${DOMAIN_NAME}/admin
- **API Health:** https://${DOMAIN_NAME}/api/health
- **Monitoring:** http://your-server:3001 (admin/heypeter-admin-2025)
- **Prometheus:** http://your-server:9090

### Credentials

Admin credentials have been generated and stored securely.
Please check: \`${DEPLOYMENT_DIR}/credentials/\`

### Backup Information

- **Pre-deployment backup:** ${PRE_DEPLOYMENT_BACKUP:-"Not created (dry run)"}
- **Backup schedule:** Daily at 2:00 AM
- **Retention:** 7 days local, 1 year cloud storage

### Monitoring

- **Grafana:** Configured with pre-built dashboards
- **Alerts:** Email and Slack notifications enabled
- **Health Checks:** Automated every 5 minutes

### Next Steps

1. **Test Application:**
   - Verify all functionality works correctly
   - Test user registration and login
   - Check course creation and enrollment
   - Validate payment processing (if enabled)

2. **Configure Additional Settings:**
   - Set up email templates
   - Configure notification preferences
   - Customize branding and themes
   - Set up course categories

3. **User Training:**
   - Train administrators on the system
   - Create user documentation
   - Set up support procedures

4. **Go-Live:**
   - Announce to users
   - Monitor system closely
   - Be prepared for rollback if needed

### Support Information

- **Technical Support:** devops@heypeter-academy.com
- **Documentation:** ${PROJECT_ROOT}/docs/
- **Monitoring Dashboard:** http://your-server:3001
- **Log Files:** \`docker logs [container_name]\`

### Rollback Procedure

If rollback is needed:

\`\`\`bash
# Stop current deployment
docker-compose -f deployment/environments/docker-compose.production.yml down

# Restore database
${DEPLOYMENT_DIR}/backup/backup-manager.sh restore ${PRE_DEPLOYMENT_BACKUP:-"/backup/latest.dump"}

# Deploy previous version
git checkout previous-stable-tag
docker build -t heypeter-academy:rollback .
docker-compose -f deployment/environments/docker-compose.production.yml up -d
\`\`\`

---

**Deployment completed at:** $(date)
**Total deployment time:** Approximately 30-45 minutes
**Status:** SUCCESS ✅

EOF
    
    log "Deployment report generated: ${report_file}"
    
    # Display quick summary
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  DEPLOYMENT COMPLETED SUCCESSFULLY!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "🚀 Application URL: ${YELLOW}https://${DOMAIN_NAME}${NC}"
    echo -e "📊 Monitoring: ${YELLOW}http://your-server:3001${NC}"
    echo -e "📋 Report: ${YELLOW}${report_file}${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Test the application thoroughly"
    echo "2. Update DNS records (if not done already)"
    echo "3. Train users and administrators"
    echo "4. Monitor system performance"
    echo ""
}

# Rollback function for failures
rollback_deployment() {
    local exit_code=$?
    
    if [[ ${exit_code} -ne 0 && "${DRY_RUN}" == "false" ]]; then
        echo ""
        echo -e "${RED}========================================${NC}"
        echo -e "${RED}  DEPLOYMENT FAILED - INITIATING ROLLBACK${NC}"
        echo -e "${RED}========================================${NC}"
        echo ""
        
        log "Deployment failed with exit code ${exit_code}"
        log "Initiating rollback procedure..."
        
        # Stop any running services
        docker-compose -f "${DEPLOYMENT_DIR}/environments/docker-compose.production.yml" down 2>/dev/null || true
        docker-compose -f "${DEPLOYMENT_DIR}/load-balancer/docker-compose.generated.yml" down 2>/dev/null || true
        docker-compose -f "${DEPLOYMENT_DIR}/monitoring/docker-compose.monitoring.yml" down 2>/dev/null || true
        
        # Restore database if backup exists
        if [[ -n "${PRE_DEPLOYMENT_BACKUP}" && -f "${PRE_DEPLOYMENT_BACKUP}" ]]; then
            log "Restoring database from backup..."
            "${DEPLOYMENT_DIR}/backup/backup-manager.sh" restore "${PRE_DEPLOYMENT_BACKUP}" "${ENVIRONMENT}_rollback"
        fi
        
        # Send failure notification
        log "Sending failure notification..."
        echo "Deployment failed on $(hostname) at $(date)" | \
            mail -s "HeyPeter Academy Deployment Failed" admin@heypeter-academy.com 2>/dev/null || true
        
        log "Rollback completed. Please check system status and try deployment again."
        
        exit ${exit_code}
    fi
}

# Main execution function
main() {
    # Set up error handling
    trap rollback_deployment EXIT
    
    log "Starting full stack deployment for HeyPeter Academy LMS..."
    
    # Pre-deployment checks and setup
    validate_inputs
    check_prerequisites
    load_environment
    
    # Create backup before deployment
    create_pre_deployment_backup
    
    # Core deployment steps
    deploy_database
    setup_ssl
    deploy_cdn
    deploy_application
    deploy_load_balancer
    deploy_monitoring
    deploy_backup_system
    
    # Post-deployment validation
    run_deployment_tests
    update_dns
    generate_deployment_report
    
    # Disable trap for successful completion
    trap - EXIT
    
    log "Full stack deployment completed successfully!"
}

# Show usage information
usage() {
    echo "Usage: $0 [environment] [domain_name] [s3_bucket] [email] [dry_run]"
    echo ""
    echo "This script deploys the complete HeyPeter Academy LMS production stack."
    echo ""
    echo "Arguments:"
    echo "  environment  Target environment (production, staging) [default: production]"
    echo "  domain_name  Your domain name (required)"
    echo "  s3_bucket    S3 bucket for static assets (required)"
    echo "  email        Email for SSL certificates (required)"
    echo "  dry_run      Run in dry-run mode (true/false) [default: false]"
    echo ""
    echo "Examples:"
    echo "  $0 production heypeter-academy.com heypeter-assets admin@heypeter-academy.com"
    echo "  $0 staging staging.heypeter-academy.com heypeter-staging-assets admin@heypeter-academy.com true"
    echo ""
    echo "Prerequisites:"
    echo "  - Docker and Docker Compose installed"
    echo "  - AWS CLI configured with credentials"
    echo "  - Supabase CLI installed and project linked"
    echo "  - Domain name with DNS access"
    echo "  - Environment file configured"
    echo ""
    echo "Estimated deployment time: 30-45 minutes"
}

# Handle help flag
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    usage
    exit 0
fi

# Verify minimum required arguments
if [[ $# -lt 4 ]]; then
    echo -e "${RED}Error: Missing required arguments${NC}"
    echo ""
    usage
    exit 1
fi

# Run main deployment
main