#!/bin/bash

# SSL Certificate Setup Script for HeyPeter Academy LMS
# This script manages SSL certificate generation and renewal

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
SSL_DIR="${DEPLOYMENT_DIR}/ssl"

# Environment variables
DOMAIN_NAME=${1}
EMAIL=${2}
METHOD=${3:-letsencrypt}  # letsencrypt, self-signed, or custom
DRY_RUN=${4:-false}

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  HeyPeter Academy SSL Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Domain: ${YELLOW}${DOMAIN_NAME}${NC}"
echo -e "Email: ${YELLOW}${EMAIL}${NC}"
echo -e "Method: ${YELLOW}${METHOD}${NC}"
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

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if domain name is provided
    if [[ -z "${DOMAIN_NAME}" ]]; then
        error "Domain name is required. Usage: $0 [domain_name] [email] [method] [dry_run]"
    fi
    
    # Check method-specific requirements
    case "${METHOD}" in
        "letsencrypt")
            if ! command -v certbot &> /dev/null; then
                error "Certbot is not installed. Please install it first."
            fi
            if [[ -z "${EMAIL}" ]]; then
                error "Email is required for Let's Encrypt certificates"
            fi
            ;;
        "self-signed")
            if ! command -v openssl &> /dev/null; then
                error "OpenSSL is not installed. Please install it first."
            fi
            ;;
        "custom")
            log "Custom certificate method selected"
            ;;
        *)
            error "Invalid method: ${METHOD}. Use 'letsencrypt', 'self-signed', or 'custom'"
            ;;
    esac
    
    log "Prerequisites check passed"
}

# Create SSL directory structure
create_ssl_directories() {
    log "Creating SSL directory structure..."
    
    mkdir -p "${SSL_DIR}"/{certs,private,dhparam,renewal,logs}
    chmod 755 "${SSL_DIR}"
    chmod 700 "${SSL_DIR}/private"
    
    log "SSL directories created"
}

# Generate Diffie-Hellman parameters
generate_dhparam() {
    log "Generating Diffie-Hellman parameters..."
    
    DHPARAM_FILE="${SSL_DIR}/dhparam/dhparam.pem"
    
    if [[ -f "${DHPARAM_FILE}" ]]; then
        warn "DH parameters already exist at ${DHPARAM_FILE}"
        return 0
    fi
    
    if [[ "${DRY_RUN}" == "false" ]]; then
        log "Generating 2048-bit DH parameters (this may take a while)..."
        openssl dhparam -out "${DHPARAM_FILE}" 2048
        chmod 644 "${DHPARAM_FILE}"
        log "DH parameters generated successfully"
    else
        log "DRY RUN: Would generate DH parameters"
    fi
}

# Setup Let's Encrypt certificate
setup_letsencrypt() {
    log "Setting up Let's Encrypt certificate..."
    
    CERT_DIR="${SSL_DIR}/certs/${DOMAIN_NAME}"
    mkdir -p "${CERT_DIR}"
    
    if [[ "${DRY_RUN}" == "false" ]]; then
        # Check if certificate already exists
        if certbot certificates | grep -q "${DOMAIN_NAME}"; then
            warn "Certificate for ${DOMAIN_NAME} already exists"
            return 0
        fi
        
        # Request certificate using DNS challenge (recommended for production)
        log "Requesting Let's Encrypt certificate for ${DOMAIN_NAME}..."
        certbot certonly \
            --manual \
            --preferred-challenges dns \
            --email "${EMAIL}" \
            --agree-tos \
            --no-eff-email \
            --domain "${DOMAIN_NAME}" \
            --domain "www.${DOMAIN_NAME}" \
            --cert-path "${CERT_DIR}/cert.pem" \
            --key-path "${CERT_DIR}/privkey.pem" \
            --fullchain-path "${CERT_DIR}/fullchain.pem" \
            --chain-path "${CERT_DIR}/chain.pem"
        
        # Create symlinks for Nginx
        ln -sf "/etc/letsencrypt/live/${DOMAIN_NAME}/fullchain.pem" "${SSL_DIR}/fullchain.pem"
        ln -sf "/etc/letsencrypt/live/${DOMAIN_NAME}/privkey.pem" "${SSL_DIR}/privkey.pem"
        ln -sf "/etc/letsencrypt/live/${DOMAIN_NAME}/chain.pem" "${SSL_DIR}/chain.pem"
        
        log "Let's Encrypt certificate obtained successfully"
    else
        log "DRY RUN: Would request Let's Encrypt certificate for ${DOMAIN_NAME}"
    fi
}

# Generate self-signed certificate
generate_self_signed() {
    log "Generating self-signed certificate..."
    
    CERT_FILE="${SSL_DIR}/certs/${DOMAIN_NAME}/cert.pem"
    KEY_FILE="${SSL_DIR}/private/${DOMAIN_NAME}/privkey.pem"
    
    mkdir -p "$(dirname "${CERT_FILE}")" "$(dirname "${KEY_FILE}")"
    
    if [[ "${DRY_RUN}" == "false" ]]; then
        # Create certificate configuration
        cat > "/tmp/cert.conf" << EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C=US
ST=State
L=City
O=HeyPeter Academy
OU=IT Department
CN=${DOMAIN_NAME}

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = ${DOMAIN_NAME}
DNS.2 = www.${DOMAIN_NAME}
EOF
        
        # Generate private key
        openssl genrsa -out "${KEY_FILE}" 2048
        chmod 600 "${KEY_FILE}"
        
        # Generate certificate
        openssl req -new -x509 -key "${KEY_FILE}" -out "${CERT_FILE}" \
            -days 365 -config "/tmp/cert.conf" -extensions v3_req
        chmod 644 "${CERT_FILE}"
        
        # Create symlinks
        ln -sf "${CERT_FILE}" "${SSL_DIR}/fullchain.pem"
        ln -sf "${KEY_FILE}" "${SSL_DIR}/privkey.pem"
        ln -sf "${CERT_FILE}" "${SSL_DIR}/chain.pem"
        
        rm -f "/tmp/cert.conf"
        
        log "Self-signed certificate generated successfully"
        warn "Self-signed certificates are not trusted by browsers in production"
    else
        log "DRY RUN: Would generate self-signed certificate"
    fi
}

# Setup custom certificate
setup_custom() {
    log "Setting up custom certificate..."
    
    echo ""
    echo "For custom certificates, please:"
    echo "1. Place your certificate file at: ${SSL_DIR}/fullchain.pem"
    echo "2. Place your private key at: ${SSL_DIR}/privkey.pem"
    echo "3. Place your CA chain at: ${SSL_DIR}/chain.pem"
    echo "4. Ensure proper file permissions (cert: 644, key: 600)"
    echo ""
    
    if [[ "${DRY_RUN}" == "false" ]]; then
        read -p "Press Enter when you have placed the certificate files..."
        
        # Verify files exist
        for file in fullchain.pem privkey.pem chain.pem; do
            if [[ ! -f "${SSL_DIR}/${file}" ]]; then
                error "Required file not found: ${SSL_DIR}/${file}"
            fi
        done
        
        # Set proper permissions
        chmod 644 "${SSL_DIR}/fullchain.pem" "${SSL_DIR}/chain.pem"
        chmod 600 "${SSL_DIR}/privkey.pem"
        
        log "Custom certificate files configured"
    else
        log "DRY RUN: Would setup custom certificate"
    fi
}

# Create certificate renewal script
create_renewal_script() {
    log "Creating certificate renewal script..."
    
    RENEWAL_SCRIPT="${SSL_DIR}/renewal/renew-ssl.sh"
    
    cat > "${RENEWAL_SCRIPT}" << 'EOF'
#!/bin/bash

# SSL Certificate Renewal Script
# This script handles automatic certificate renewal

set -e

# Configuration
DOMAIN_NAME="DOMAIN_PLACEHOLDER"
METHOD="METHOD_PLACEHOLDER"
SSL_DIR="SSL_DIR_PLACEHOLDER"
LOG_FILE="${SSL_DIR}/logs/renewal.log"

# Logging function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

log "Starting certificate renewal check for ${DOMAIN_NAME}"

case "${METHOD}" in
    "letsencrypt")
        log "Checking Let's Encrypt certificate renewal..."
        if certbot renew --quiet --no-self-upgrade; then
            log "Certificate renewed successfully"
            
            # Reload Nginx
            if command -v nginx &> /dev/null; then
                nginx -t && systemctl reload nginx
                log "Nginx reloaded"
            fi
            
            # Reload Docker containers if needed
            if command -v docker &> /dev/null; then
                docker-compose -f /path/to/docker-compose.yml restart nginx
                log "Docker Nginx container restarted"
            fi
        else
            log "Certificate renewal not needed or failed"
        fi
        ;;
    "self-signed")
        log "Self-signed certificates don't auto-renew"
        ;;
    "custom")
        log "Custom certificate renewal must be handled manually"
        ;;
esac

log "Certificate renewal check completed"
EOF
    
    # Replace placeholders
    sed -i.bak "s/DOMAIN_PLACEHOLDER/${DOMAIN_NAME}/g" "${RENEWAL_SCRIPT}"
    sed -i.bak "s/METHOD_PLACEHOLDER/${METHOD}/g" "${RENEWAL_SCRIPT}"
    sed -i.bak "s|SSL_DIR_PLACEHOLDER|${SSL_DIR}|g" "${RENEWAL_SCRIPT}"
    rm -f "${RENEWAL_SCRIPT}.bak"
    
    chmod +x "${RENEWAL_SCRIPT}"
    
    log "Renewal script created: ${RENEWAL_SCRIPT}"
}

# Setup certificate monitoring
setup_monitoring() {
    log "Setting up certificate monitoring..."
    
    MONITOR_SCRIPT="${SSL_DIR}/renewal/monitor-ssl.sh"
    
    cat > "${MONITOR_SCRIPT}" << 'EOF'
#!/bin/bash

# SSL Certificate Monitoring Script
# This script checks certificate expiry and sends alerts

set -e

# Configuration
DOMAIN_NAME="DOMAIN_PLACEHOLDER"
SSL_DIR="SSL_DIR_PLACEHOLDER"
CERT_FILE="${SSL_DIR}/fullchain.pem"
WARNING_DAYS=30
CRITICAL_DAYS=7

# Check if certificate exists
if [[ ! -f "${CERT_FILE}" ]]; then
    echo "ERROR: Certificate file not found: ${CERT_FILE}"
    exit 1
fi

# Get certificate expiry date
EXPIRY_DATE=$(openssl x509 -in "${CERT_FILE}" -noout -enddate | cut -d= -f2)
EXPIRY_TIMESTAMP=$(date -d "${EXPIRY_DATE}" +%s)
CURRENT_TIMESTAMP=$(date +%s)
DAYS_UNTIL_EXPIRY=$(( (EXPIRY_TIMESTAMP - CURRENT_TIMESTAMP) / 86400 ))

echo "Certificate for ${DOMAIN_NAME}:"
echo "  Expiry Date: ${EXPIRY_DATE}"
echo "  Days Until Expiry: ${DAYS_UNTIL_EXPIRY}"

# Check expiry status
if [[ ${DAYS_UNTIL_EXPIRY} -le ${CRITICAL_DAYS} ]]; then
    echo "CRITICAL: Certificate expires in ${DAYS_UNTIL_EXPIRY} days!"
    exit 2
elif [[ ${DAYS_UNTIL_EXPIRY} -le ${WARNING_DAYS} ]]; then
    echo "WARNING: Certificate expires in ${DAYS_UNTIL_EXPIRY} days"
    exit 1
else
    echo "OK: Certificate is valid for ${DAYS_UNTIL_EXPIRY} more days"
    exit 0
fi
EOF
    
    # Replace placeholders
    sed -i.bak "s/DOMAIN_PLACEHOLDER/${DOMAIN_NAME}/g" "${MONITOR_SCRIPT}"
    sed -i.bak "s|SSL_DIR_PLACEHOLDER|${SSL_DIR}|g" "${MONITOR_SCRIPT}"
    rm -f "${MONITOR_SCRIPT}.bak"
    
    chmod +x "${MONITOR_SCRIPT}"
    
    log "Monitoring script created: ${MONITOR_SCRIPT}"
}

# Create cron jobs for renewal and monitoring
setup_cron_jobs() {
    log "Setting up cron jobs..."
    
    CRON_FILE="/tmp/ssl-cron"
    
    cat > "${CRON_FILE}" << EOF
# SSL Certificate Management Cron Jobs for ${DOMAIN_NAME}

# Check certificate renewal daily at 2:30 AM
30 2 * * * ${SSL_DIR}/renewal/renew-ssl.sh

# Monitor certificate expiry daily at 9:00 AM
0 9 * * * ${SSL_DIR}/renewal/monitor-ssl.sh

EOF
    
    if [[ "${DRY_RUN}" == "false" ]]; then
        # Install cron jobs
        crontab -l 2>/dev/null | cat - "${CRON_FILE}" | crontab -
        log "Cron jobs installed"
    else
        log "DRY RUN: Would install cron jobs:"
        cat "${CRON_FILE}"
    fi
    
    rm -f "${CRON_FILE}"
}

# Verify SSL configuration
verify_ssl() {
    log "Verifying SSL configuration..."
    
    if [[ "${DRY_RUN}" == "false" ]]; then
        # Check certificate files
        for file in fullchain.pem privkey.pem chain.pem; do
            if [[ -f "${SSL_DIR}/${file}" ]]; then
                log "✓ ${file} exists"
            else
                error "✗ ${file} missing"
            fi
        done
        
        # Verify certificate
        if openssl x509 -in "${SSL_DIR}/fullchain.pem" -text -noout > /dev/null 2>&1; then
            log "✓ Certificate is valid"
            
            # Show certificate details
            SUBJECT=$(openssl x509 -in "${SSL_DIR}/fullchain.pem" -noout -subject | cut -d= -f2-)
            ISSUER=$(openssl x509 -in "${SSL_DIR}/fullchain.pem" -noout -issuer | cut -d= -f2-)
            EXPIRY=$(openssl x509 -in "${SSL_DIR}/fullchain.pem" -noout -enddate | cut -d= -f2)
            
            log "Certificate Subject: ${SUBJECT}"
            log "Certificate Issuer: ${ISSUER}"
            log "Certificate Expiry: ${EXPIRY}"
        else
            error "✗ Certificate is invalid"
        fi
        
        # Test private key
        if openssl rsa -in "${SSL_DIR}/privkey.pem" -check -noout > /dev/null 2>&1; then
            log "✓ Private key is valid"
        else
            error "✗ Private key is invalid"
        fi
        
        # Check if certificate and key match
        CERT_HASH=$(openssl x509 -in "${SSL_DIR}/fullchain.pem" -pubkey -noout | openssl md5)
        KEY_HASH=$(openssl rsa -in "${SSL_DIR}/privkey.pem" -pubout | openssl md5)
        
        if [[ "${CERT_HASH}" == "${KEY_HASH}" ]]; then
            log "✓ Certificate and private key match"
        else
            error "✗ Certificate and private key don't match"
        fi
        
        log "SSL verification completed successfully"
    else
        log "DRY RUN: Would verify SSL configuration"
    fi
}

# Generate SSL report
generate_report() {
    log "Generating SSL setup report..."
    
    REPORT_FILE="${DEPLOYMENT_DIR}/reports/ssl_setup_$(date +%Y%m%d_%H%M%S).md"
    mkdir -p "$(dirname "${REPORT_FILE}")"
    
    cat > "${REPORT_FILE}" << EOF
# SSL Certificate Setup Report

**Date:** $(date)
**Domain:** ${DOMAIN_NAME}
**Method:** ${METHOD}
**Email:** ${EMAIL}

## Certificate Information

EOF
    
    if [[ "${DRY_RUN}" == "false" && -f "${SSL_DIR}/fullchain.pem" ]]; then
        cat >> "${REPORT_FILE}" << EOF
\`\`\`
$(openssl x509 -in "${SSL_DIR}/fullchain.pem" -text -noout | head -20)
\`\`\`

## Files Created

- Certificate: \`${SSL_DIR}/fullchain.pem\`
- Private Key: \`${SSL_DIR}/privkey.pem\`
- CA Chain: \`${SSL_DIR}/chain.pem\`
- DH Parameters: \`${SSL_DIR}/dhparam/dhparam.pem\`

## Renewal Configuration

- Renewal Script: \`${SSL_DIR}/renewal/renew-ssl.sh\`
- Monitoring Script: \`${SSL_DIR}/renewal/monitor-ssl.sh\`
- Cron Jobs: Installed for daily renewal check and monitoring

## Next Steps

1. Configure Nginx to use the SSL certificates
2. Test HTTPS connectivity
3. Verify certificate installation with SSL checker tools
4. Set up monitoring alerts for certificate expiry
5. Test automatic renewal process

EOF
    else
        cat >> "${REPORT_FILE}" << EOF
This was a dry run - no actual certificates were generated.

## Next Steps

1. Run the script without dry-run flag to generate certificates
2. Configure web server to use SSL certificates
3. Test HTTPS connectivity

EOF
    fi
    
    log "SSL setup report generated: ${REPORT_FILE}"
}

# Cleanup function
cleanup() {
    log "Performing cleanup..."
    # Remove temporary files
    rm -f /tmp/cert.conf /tmp/ssl-cron
}

# Trap cleanup on exit
trap cleanup EXIT

# Main execution
main() {
    log "Starting SSL certificate setup..."
    
    check_prerequisites
    create_ssl_directories
    generate_dhparam
    
    case "${METHOD}" in
        "letsencrypt")
            setup_letsencrypt
            ;;
        "self-signed")
            generate_self_signed
            ;;
        "custom")
            setup_custom
            ;;
    esac
    
    create_renewal_script
    setup_monitoring
    setup_cron_jobs
    verify_ssl
    generate_report
    
    log "SSL certificate setup completed successfully!"
    
    if [[ "${DRY_RUN}" == "true" ]]; then
        echo ""
        echo -e "${YELLOW}This was a dry run. To actually setup SSL, run:${NC}"
        echo -e "${YELLOW}$0 ${DOMAIN_NAME} ${EMAIL} ${METHOD} false${NC}"
    else
        echo ""
        echo -e "${GREEN}========================================${NC}"
        echo -e "${GREEN}  SSL Setup Completed Successfully!${NC}"
        echo -e "${GREEN}========================================${NC}"
        echo -e "Certificate files are located in: ${YELLOW}${SSL_DIR}${NC}"
        echo -e "Report generated: ${YELLOW}${REPORT_FILE}${NC}"
    fi
}

# Show usage
usage() {
    echo "Usage: $0 [domain_name] [email] [method] [dry_run]"
    echo ""
    echo "Arguments:"
    echo "  domain_name  Your domain name (required)"
    echo "  email        Email for Let's Encrypt notifications (required for letsencrypt)"
    echo "  method       Certificate method: letsencrypt, self-signed, custom [default: letsencrypt]"
    echo "  dry_run      Run in dry-run mode (true/false) [default: false]"
    echo ""
    echo "Examples:"
    echo "  $0 heypeter-academy.com admin@heypeter-academy.com letsencrypt"
    echo "  $0 localhost admin@example.com self-signed"
    echo "  $0 heypeter-academy.com '' custom"
}

# Handle help flag
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    usage
    exit 0
fi

# Run main function
main