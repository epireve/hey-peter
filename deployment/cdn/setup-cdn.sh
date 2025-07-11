#!/bin/bash

# CDN Setup Script for HeyPeter Academy LMS
# This script configures CloudFront distribution and S3 buckets for static assets

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

# Environment variables
ENVIRONMENT=${1:-production}
DRY_RUN=${2:-false}
DOMAIN_NAME=${3}
S3_BUCKET_NAME=${4}

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  HeyPeter Academy CDN Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Environment: ${YELLOW}${ENVIRONMENT}${NC}"
echo -e "Dry Run: ${YELLOW}${DRY_RUN}${NC}"
echo -e "Domain: ${YELLOW}${DOMAIN_NAME}${NC}"
echo -e "S3 Bucket: ${YELLOW}${S3_BUCKET_NAME}${NC}"
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

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        error "AWS CLI is not installed. Please install it first."
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials not configured. Run 'aws configure' first."
    fi
    
    # Check if domain name is provided
    if [[ -z "${DOMAIN_NAME}" ]]; then
        error "Domain name is required. Usage: $0 [environment] [dry_run] [domain_name] [s3_bucket_name]"
    fi
    
    # Check if S3 bucket name is provided
    if [[ -z "${S3_BUCKET_NAME}" ]]; then
        error "S3 bucket name is required. Usage: $0 [environment] [dry_run] [domain_name] [s3_bucket_name]"
    fi
    
    log "Prerequisites check passed"
}

# Load environment variables
load_environment() {
    log "Loading environment variables for ${ENVIRONMENT}..."
    
    if [[ -f "${DEPLOYMENT_DIR}/environments/.env.${ENVIRONMENT}" ]]; then
        source "${DEPLOYMENT_DIR}/environments/.env.${ENVIRONMENT}"
        log "Environment variables loaded"
    else
        error "Environment file not found: ${DEPLOYMENT_DIR}/environments/.env.${ENVIRONMENT}"
    fi
}

# Create S3 bucket for static assets
create_s3_bucket() {
    log "Creating S3 bucket for static assets..."
    
    if [[ "${DRY_RUN}" == "false" ]]; then
        # Check if bucket already exists
        if aws s3 ls "s3://${S3_BUCKET_NAME}" 2>/dev/null; then
            warn "S3 bucket ${S3_BUCKET_NAME} already exists"
        else
            # Create bucket
            log "Creating S3 bucket: ${S3_BUCKET_NAME}"
            aws s3 mb "s3://${S3_BUCKET_NAME}"
            
            # Configure bucket for static website hosting
            aws s3 website "s3://${S3_BUCKET_NAME}" \
                --index-document index.html \
                --error-document error.html
        fi
        
        # Set bucket policy
        log "Setting S3 bucket policy..."
        cat > /tmp/bucket-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::${S3_BUCKET_NAME}/*"
        }
    ]
}
EOF
        
        aws s3api put-bucket-policy \
            --bucket "${S3_BUCKET_NAME}" \
            --policy file:///tmp/bucket-policy.json
        
        # Enable versioning
        aws s3api put-bucket-versioning \
            --bucket "${S3_BUCKET_NAME}" \
            --versioning-configuration Status=Enabled
        
        # Configure CORS
        cat > /tmp/cors-config.json << EOF
{
    "CORSRules": [
        {
            "AllowedHeaders": ["*"],
            "AllowedMethods": ["GET", "HEAD"],
            "AllowedOrigins": ["https://${DOMAIN_NAME}", "https://www.${DOMAIN_NAME}"],
            "ExposeHeaders": ["ETag"],
            "MaxAgeSeconds": 3600
        }
    ]
}
EOF
        
        aws s3api put-bucket-cors \
            --bucket "${S3_BUCKET_NAME}" \
            --cors-configuration file:///tmp/cors-config.json
        
        rm -f /tmp/bucket-policy.json /tmp/cors-config.json
        
        log "S3 bucket configured successfully"
    else
        log "DRY RUN: Would create S3 bucket ${S3_BUCKET_NAME}"
    fi
}

# Request SSL certificate
request_ssl_certificate() {
    log "Requesting SSL certificate..."
    
    if [[ "${DRY_RUN}" == "false" ]]; then
        # Check if certificate already exists
        CERT_ARN=$(aws acm list-certificates \
            --region us-east-1 \
            --query "CertificateSummaryList[?DomainName=='${DOMAIN_NAME}'].CertificateArn" \
            --output text)
        
        if [[ -n "${CERT_ARN}" ]]; then
            warn "SSL certificate already exists: ${CERT_ARN}"
        else
            log "Requesting new SSL certificate for ${DOMAIN_NAME}"
            CERT_ARN=$(aws acm request-certificate \
                --domain-name "${DOMAIN_NAME}" \
                --subject-alternative-names "www.${DOMAIN_NAME}" \
                --validation-method DNS \
                --region us-east-1 \
                --query "CertificateArn" \
                --output text)
            
            log "SSL certificate requested: ${CERT_ARN}"
            log "Please validate the certificate using DNS validation"
        fi
        
        export CERT_ARN
    else
        log "DRY RUN: Would request SSL certificate for ${DOMAIN_NAME}"
        export CERT_ARN="arn:aws:acm:us-east-1:123456789012:certificate/example"
    fi
}

# Create CloudFront distribution
create_cloudfront_distribution() {
    log "Creating CloudFront distribution..."
    
    # Prepare CloudFront configuration
    CLOUDFRONT_CONFIG="/tmp/cloudfront-config.json"
    cp "${SCRIPT_DIR}/cloudfront-config.json" "${CLOUDFRONT_CONFIG}"
    
    # Replace placeholders
    sed -i.bak "s/your-domain.com/${DOMAIN_NAME}/g" "${CLOUDFRONT_CONFIG}"
    sed -i.bak "s/your-s3-bucket/${S3_BUCKET_NAME}/g" "${CLOUDFRONT_CONFIG}"
    sed -i.bak "s|CERTIFICATE-ID|${CERT_ARN}|g" "${CLOUDFRONT_CONFIG}"
    sed -i.bak "s/your-logging-bucket/${S3_BUCKET_NAME}-logs/g" "${CLOUDFRONT_CONFIG}"
    
    if [[ "${DRY_RUN}" == "false" ]]; then
        # Create CloudFront distribution
        log "Creating CloudFront distribution..."
        DISTRIBUTION_ID=$(aws cloudfront create-distribution \
            --distribution-config file://"${CLOUDFRONT_CONFIG}" \
            --query "Distribution.Id" \
            --output text)
        
        log "CloudFront distribution created: ${DISTRIBUTION_ID}"
        
        # Get distribution domain name
        DISTRIBUTION_DOMAIN=$(aws cloudfront get-distribution \
            --id "${DISTRIBUTION_ID}" \
            --query "Distribution.DomainName" \
            --output text)
        
        log "Distribution domain: ${DISTRIBUTION_DOMAIN}"
        
        export DISTRIBUTION_ID DISTRIBUTION_DOMAIN
    else
        log "DRY RUN: Would create CloudFront distribution"
        log "Configuration preview:"
        head -20 "${CLOUDFRONT_CONFIG}"
        export DISTRIBUTION_ID="E1234567890123"
        export DISTRIBUTION_DOMAIN="d123456789.cloudfront.net"
    fi
    
    rm -f "${CLOUDFRONT_CONFIG}" "${CLOUDFRONT_CONFIG}.bak"
}

# Configure cache invalidation
setup_cache_invalidation() {
    log "Setting up cache invalidation..."
    
    # Create invalidation script
    INVALIDATION_SCRIPT="${DEPLOYMENT_DIR}/scripts/invalidate-cache.sh"
    
    cat > "${INVALIDATION_SCRIPT}" << 'EOF'
#!/bin/bash

# Cache Invalidation Script
# Usage: ./invalidate-cache.sh [distribution-id] [paths...]

DISTRIBUTION_ID=${1}
shift
PATHS=("$@")

if [[ -z "${DISTRIBUTION_ID}" ]]; then
    echo "Usage: $0 [distribution-id] [paths...]"
    echo "Example: $0 E1234567890123 '/*' '/api/*'"
    exit 1
fi

if [[ ${#PATHS[@]} -eq 0 ]]; then
    PATHS=("/*")
fi

echo "Creating cache invalidation for distribution: ${DISTRIBUTION_ID}"
echo "Paths: ${PATHS[*]}"

INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id "${DISTRIBUTION_ID}" \
    --paths "${PATHS[@]}" \
    --query "Invalidation.Id" \
    --output text)

echo "Invalidation created: ${INVALIDATION_ID}"
echo "Status: $(aws cloudfront get-invalidation \
    --distribution-id "${DISTRIBUTION_ID}" \
    --id "${INVALIDATION_ID}" \
    --query "Invalidation.Status" \
    --output text)"
EOF
    
    chmod +x "${INVALIDATION_SCRIPT}"
    
    # Replace distribution ID in the script
    if [[ "${DRY_RUN}" == "false" ]]; then
        sed -i.bak "s/E1234567890123/${DISTRIBUTION_ID}/g" "${INVALIDATION_SCRIPT}"
        rm -f "${INVALIDATION_SCRIPT}.bak"
    fi
    
    log "Cache invalidation script created: ${INVALIDATION_SCRIPT}"
}

# Update Next.js configuration for CDN
update_nextjs_config() {
    log "Updating Next.js configuration for CDN..."
    
    NEXTJS_CONFIG="${PROJECT_ROOT}/next.config.mjs"
    
    if [[ "${DRY_RUN}" == "false" ]]; then
        # Backup original config
        cp "${NEXTJS_CONFIG}" "${NEXTJS_CONFIG}.bak"
        
        # Add CDN configuration
        cat >> /tmp/cdn-config.mjs << EOF

// CDN Configuration for Production
const cdnConfig = process.env.NODE_ENV === 'production' ? {
  assetPrefix: 'https://${DISTRIBUTION_DOMAIN}',
  images: {
    domains: ['${DISTRIBUTION_DOMAIN}', '${S3_BUCKET_NAME}.s3.amazonaws.com'],
    loader: 'custom',
    loaderFile: './src/lib/image-loader.js'
  }
} : {};

// Merge with existing configuration
const nextConfig = {
  ...existingConfig,
  ...cdnConfig
};

export default nextConfig;
EOF
        
        log "Next.js configuration updated for CDN"
        log "Please review and integrate the changes in ${NEXTJS_CONFIG}"
    else
        log "DRY RUN: Would update Next.js configuration"
    fi
}

# Create image loader for CDN
create_image_loader() {
    log "Creating image loader for CDN..."
    
    IMAGE_LOADER_FILE="${PROJECT_ROOT}/src/lib/image-loader.js"
    
    if [[ "${DRY_RUN}" == "false" ]]; then
        mkdir -p "$(dirname "${IMAGE_LOADER_FILE}")"
        
        cat > "${IMAGE_LOADER_FILE}" << EOF
// Custom image loader for CDN
export default function cloudinaryLoader({ src, width, quality }) {
  const params = ['f_auto', 'c_limit', \`w_\${width}\`, \`q_\${quality || 'auto'}\`];
  return \`https://${DISTRIBUTION_DOMAIN}/\${src}?\${params.join(',')}\`;
}
EOF
        
        log "Image loader created: ${IMAGE_LOADER_FILE}"
    else
        log "DRY RUN: Would create image loader"
    fi
}

# Setup monitoring for CDN
setup_cdn_monitoring() {
    log "Setting up CDN monitoring..."
    
    if [[ "${DRY_RUN}" == "false" ]]; then
        # Create CloudWatch alarms for CloudFront
        aws cloudwatch put-metric-alarm \
            --alarm-name "CloudFront-HighErrorRate-${ENVIRONMENT}" \
            --alarm-description "High error rate for CloudFront distribution" \
            --metric-name "4xxErrorRate" \
            --namespace "AWS/CloudFront" \
            --statistic "Average" \
            --period 300 \
            --threshold 5.0 \
            --comparison-operator "GreaterThanThreshold" \
            --dimensions "Name=DistributionId,Value=${DISTRIBUTION_ID}" \
            --evaluation-periods 2 \
            --alarm-actions "arn:aws:sns:us-east-1:123456789012:cloudfront-alerts"
        
        log "CDN monitoring alarms created"
    else
        log "DRY RUN: Would setup CDN monitoring"
    fi
}

# Generate CDN report
generate_report() {
    log "Generating CDN setup report..."
    
    REPORT_FILE="${DEPLOYMENT_DIR}/reports/cdn_setup_$(date +%Y%m%d_%H%M%S).md"
    mkdir -p "$(dirname "${REPORT_FILE}")"
    
    cat > "${REPORT_FILE}" << EOF
# CDN Setup Report

**Date:** $(date)
**Environment:** ${ENVIRONMENT}
**Domain:** ${DOMAIN_NAME}
**S3 Bucket:** ${S3_BUCKET_NAME}

## CloudFront Distribution

- **Distribution ID:** ${DISTRIBUTION_ID}
- **Domain Name:** ${DISTRIBUTION_DOMAIN}
- **SSL Certificate:** ${CERT_ARN}

## S3 Configuration

- **Bucket Name:** ${S3_BUCKET_NAME}
- **Region:** ${AWS_REGION}
- **Versioning:** Enabled
- **CORS:** Configured

## DNS Configuration

Add the following CNAME record to your DNS:

\`\`\`
Type: CNAME
Name: ${DOMAIN_NAME}
Value: ${DISTRIBUTION_DOMAIN}
TTL: 300
\`\`\`

For www subdomain:
\`\`\`
Type: CNAME
Name: www.${DOMAIN_NAME}
Value: ${DISTRIBUTION_DOMAIN}
TTL: 300
\`\`\`

## Cache Invalidation

Use the following script to invalidate cache:
\`\`\`bash
./deployment/scripts/invalidate-cache.sh ${DISTRIBUTION_ID} "/*"
\`\`\`

## Next Steps

1. Validate SSL certificate using DNS validation
2. Add DNS records to point domain to CloudFront
3. Test CDN functionality
4. Configure cache invalidation in CI/CD
5. Monitor performance metrics

EOF
    
    log "CDN setup report generated: ${REPORT_FILE}"
}

# Cleanup function
cleanup() {
    log "Performing cleanup..."
    # Remove temporary files
    rm -f /tmp/cloudfront-config.json /tmp/cdn-config.mjs
}

# Trap cleanup on exit
trap cleanup EXIT

# Main execution
main() {
    log "Starting CDN setup process..."
    
    check_prerequisites
    load_environment
    create_s3_bucket
    request_ssl_certificate
    create_cloudfront_distribution
    setup_cache_invalidation
    update_nextjs_config
    create_image_loader
    setup_cdn_monitoring
    generate_report
    
    log "CDN setup completed successfully!"
    
    if [[ "${DRY_RUN}" == "true" ]]; then
        echo ""
        echo -e "${YELLOW}This was a dry run. To actually setup CDN, run:${NC}"
        echo -e "${YELLOW}$0 ${ENVIRONMENT} false ${DOMAIN_NAME} ${S3_BUCKET_NAME}${NC}"
    else
        echo ""
        echo -e "${GREEN}========================================${NC}"
        echo -e "${GREEN}  CDN Setup Completed Successfully!${NC}"
        echo -e "${GREEN}========================================${NC}"
        echo -e "Distribution ID: ${YELLOW}${DISTRIBUTION_ID}${NC}"
        echo -e "Distribution Domain: ${YELLOW}${DISTRIBUTION_DOMAIN}${NC}"
        echo -e "Report: ${YELLOW}${REPORT_FILE}${NC}"
    fi
}

# Show usage
usage() {
    echo "Usage: $0 [environment] [dry_run] [domain_name] [s3_bucket_name]"
    echo ""
    echo "Arguments:"
    echo "  environment      Target environment (production, staging, development) [default: production]"
    echo "  dry_run         Run in dry-run mode (true/false) [default: false]"
    echo "  domain_name     Your domain name (required)"
    echo "  s3_bucket_name  S3 bucket name for static assets (required)"
    echo ""
    echo "Examples:"
    echo "  $0 production false heypeter-academy.com heypeter-static-assets"
    echo "  $0 staging true staging.heypeter-academy.com heypeter-staging-assets"
}

# Handle help flag
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    usage
    exit 0
fi

# Run main function
main