#!/bin/bash

# Load Balancer Setup Script for HeyPeter Academy LMS
# This script configures and deploys the load balancing infrastructure

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
LB_TYPE=${2:-nginx}  # nginx, haproxy, or both
SCALE=${3:-3}        # Number of app instances
DRY_RUN=${4:-false}

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  HeyPeter Academy Load Balancer Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Environment: ${YELLOW}${ENVIRONMENT}${NC}"
echo -e "Load Balancer: ${YELLOW}${LB_TYPE}${NC}"
echo -e "Scale: ${YELLOW}${SCALE} instances${NC}"
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
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install it first."
    fi
    
    # Check if Docker Compose is available
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        error "Docker Compose is not installed. Please install it first."
    fi
    
    # Check if environment file exists
    if [[ ! -f "${DEPLOYMENT_DIR}/environments/.env.${ENVIRONMENT}" ]]; then
        error "Environment file not found: ${DEPLOYMENT_DIR}/environments/.env.${ENVIRONMENT}"
    fi
    
    # Validate scale parameter
    if [[ ! "${SCALE}" =~ ^[1-9][0-9]*$ ]] || [[ ${SCALE} -gt 10 ]]; then
        error "Scale must be a number between 1 and 10"
    fi
    
    log "Prerequisites check passed"
}

# Load environment variables
load_environment() {
    log "Loading environment variables for ${ENVIRONMENT}..."
    
    source "${DEPLOYMENT_DIR}/environments/.env.${ENVIRONMENT}"
    export $(grep -v '^#' "${DEPLOYMENT_DIR}/environments/.env.${ENVIRONMENT}" | xargs)
    
    log "Environment variables loaded"
}

# Create necessary directories
create_directories() {
    log "Creating load balancer directories..."
    
    mkdir -p "${SCRIPT_DIR}"/{logs,nginx-cache,html,letsencrypt,haproxy-logs}
    
    # Create nginx cache directories
    mkdir -p "${SCRIPT_DIR}/nginx-cache"/{static,api,temp}
    
    # Set proper permissions
    chmod 755 "${SCRIPT_DIR}"/{logs,nginx-cache,html,letsencrypt}
    chmod 777 "${SCRIPT_DIR}/nginx-cache"  # Nginx needs write access
    
    log "Directories created successfully"
}

# Generate dynamic configurations
generate_configurations() {
    log "Generating dynamic configurations..."
    
    # Generate Nginx upstream configuration based on scale
    NGINX_UPSTREAM=""
    for i in $(seq 1 ${SCALE}); do
        NGINX_UPSTREAM+="        server app${i}:3000 weight=3 max_fails=3 fail_timeout=30s;\n"
    done
    
    # Update nginx.conf with dynamic upstream
    if [[ "${DRY_RUN}" == "false" ]]; then
        cp "${SCRIPT_DIR}/nginx.conf" "${SCRIPT_DIR}/nginx.conf.bak"
        
        # Replace static upstream with dynamic one
        sed -i "/# Primary app servers/,/# Backup server/ c\\
        # Primary app servers\\
${NGINX_UPSTREAM}        # Backup server" "${SCRIPT_DIR}/nginx.conf"
        
        log "Nginx configuration updated for ${SCALE} instances"
    else
        log "DRY RUN: Would update Nginx configuration for ${SCALE} instances"
    fi
    
    # Generate HAProxy configuration
    if [[ "${LB_TYPE}" == "haproxy" || "${LB_TYPE}" == "both" ]]; then
        HAPROXY_SERVERS=""
        for i in $(seq 1 ${SCALE}); do
            HAPROXY_SERVERS+="    server app${i} app${i}:3000 check cookie app${i} weight 100 maxconn 500\n"
        done
        
        if [[ "${DRY_RUN}" == "false" ]]; then
            cp "${SCRIPT_DIR}/haproxy.cfg" "${SCRIPT_DIR}/haproxy.cfg.bak"
            
            # Update HAProxy configuration
            sed -i "/# Servers/,/server app-backup/ c\\
    # Servers\\
${HAPROXY_SERVERS}    server app-backup app-backup:3000 check cookie backup weight 50 maxconn 200 backup" "${SCRIPT_DIR}/haproxy.cfg"
            
            log "HAProxy configuration updated for ${SCALE} instances"
        else
            log "DRY RUN: Would update HAProxy configuration for ${SCALE} instances"
        fi
    fi
}

# Generate docker-compose for scaled deployment
generate_docker_compose() {
    log "Generating Docker Compose configuration..."
    
    COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.generated.yml"
    
    # Start with base configuration
    cat > "${COMPOSE_FILE}" << EOF
version: '3.8'

services:
EOF
    
    # Add Nginx if selected
    if [[ "${LB_TYPE}" == "nginx" || "${LB_TYPE}" == "both" ]]; then
        cat >> "${COMPOSE_FILE}" << EOF
  nginx-lb:
    image: nginx:alpine
    container_name: heypeter-nginx-lb
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ../ssl:/etc/nginx/ssl:ro
      - ./nginx-cache:/var/cache/nginx
      - ./logs:/var/log/nginx
      - ./html:/var/www/html
      - ./letsencrypt:/var/www/letsencrypt
    depends_on:
EOF
        
        # Add dependencies for all app instances
        for i in $(seq 1 ${SCALE}); do
            echo "      - app${i}" >> "${COMPOSE_FILE}"
        done
        
        cat >> "${COMPOSE_FILE}" << EOF
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "nginx", "-t"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - app-network
    labels:
      - "service=nginx-lb"
      - "environment=${ENVIRONMENT}"

EOF
    fi
    
    # Add HAProxy if selected
    if [[ "${LB_TYPE}" == "haproxy" || "${LB_TYPE}" == "both" ]]; then
        cat >> "${COMPOSE_FILE}" << EOF
  haproxy:
    image: haproxy:2.8-alpine
    container_name: heypeter-haproxy
    ports:
      - "8080:8080"  # Stats interface
EOF
        
        if [[ "${LB_TYPE}" == "haproxy" ]]; then
            echo "      - \"80:80\"   # HTTP" >> "${COMPOSE_FILE}"
            echo "      - \"443:443\" # HTTPS" >> "${COMPOSE_FILE}"
        else
            echo "      - \"9000:80\"  # Alternative port" >> "${COMPOSE_FILE}"
        fi
        
        cat >> "${COMPOSE_FILE}" << EOF
    volumes:
      - ./haproxy.cfg:/usr/local/etc/haproxy/haproxy.cfg:ro
      - ./haproxy-logs:/var/log/haproxy
    depends_on:
EOF
        
        # Add dependencies for all app instances
        for i in $(seq 1 ${SCALE}); do
            echo "      - app${i}" >> "${COMPOSE_FILE}"
        done
        
        cat >> "${COMPOSE_FILE}" << EOF
    restart: unless-stopped
    networks:
      - app-network
    labels:
      - "service=haproxy"
      - "environment=${ENVIRONMENT}"

EOF
    fi
    
    # Add application instances
    for i in $(seq 1 ${SCALE}); do
        cat >> "${COMPOSE_FILE}" << EOF
  app${i}:
    build:
      context: ../..
      dockerfile: Dockerfile
    container_name: heypeter-app${i}
    environment:
      - NODE_ENV=${ENVIRONMENT}
      - PORT=3000
      - INSTANCE_ID=app${i}
    env_file:
      - ../environments/.env.${ENVIRONMENT}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - app-network
    volumes:
      - app${i}-logs:/app/logs
      - shared-uploads:/app/uploads
    labels:
      - "service=app"
      - "instance=app${i}"
      - "environment=${ENVIRONMENT}"

EOF
    done
    
    # Add backup instance
    cat >> "${COMPOSE_FILE}" << EOF
  app-backup:
    build:
      context: ../..
      dockerfile: Dockerfile
    container_name: heypeter-app-backup
    environment:
      - NODE_ENV=${ENVIRONMENT}
      - PORT=3000
      - INSTANCE_ID=app-backup
    env_file:
      - ../environments/.env.${ENVIRONMENT}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - app-network
    volumes:
      - app-backup-logs:/app/logs
      - shared-uploads:/app/uploads
    labels:
      - "service=app"
      - "instance=backup"
      - "environment=${ENVIRONMENT}"
    deploy:
      replicas: 0  # Backup only

  redis:
    image: redis:7-alpine
    container_name: heypeter-redis
    command: redis-server --requirepass \${REDIS_PASSWORD} --maxmemory 512mb --maxmemory-policy allkeys-lru
    environment:
      - REDIS_PASSWORD=\${REDIS_PASSWORD}
    ports:
      - "127.0.0.1:6379:6379"
    volumes:
      - redis-data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - app-network
    labels:
      - "service=redis"
      - "environment=${ENVIRONMENT}"

networks:
  app-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16

volumes:
EOF
    
    # Add volume definitions for all instances
    for i in $(seq 1 ${SCALE}); do
        echo "  app${i}-logs:" >> "${COMPOSE_FILE}"
    done
    
    cat >> "${COMPOSE_FILE}" << EOF
  app-backup-logs:
  shared-uploads:
  redis-data:
EOF
    
    log "Docker Compose configuration generated: ${COMPOSE_FILE}"
}

# Create health check script
create_health_check() {
    log "Creating health check script..."
    
    HEALTH_SCRIPT="${SCRIPT_DIR}/health-check.sh"
    
    cat > "${HEALTH_SCRIPT}" << 'EOF'
#!/bin/bash

# Health Check Script for Load Balancer
# This script checks the health of all services

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.generated.yml"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=== Load Balancer Health Check ==="
echo "Timestamp: $(date)"
echo ""

# Check if services are running
echo "Service Status:"
docker-compose -f "${COMPOSE_FILE}" ps

echo ""
echo "Health Check Results:"

# Check Nginx
if docker-compose -f "${COMPOSE_FILE}" ps nginx-lb | grep -q "Up"; then
    if curl -sf http://localhost/health > /dev/null 2>&1; then
        echo -e "✓ Nginx Load Balancer: ${GREEN}HEALTHY${NC}"
    else
        echo -e "✗ Nginx Load Balancer: ${RED}UNHEALTHY${NC}"
    fi
else
    echo -e "✗ Nginx Load Balancer: ${RED}NOT RUNNING${NC}"
fi

# Check HAProxy (if enabled)
if docker-compose -f "${COMPOSE_FILE}" ps haproxy | grep -q "Up" 2>/dev/null; then
    if curl -sf http://localhost:8080 > /dev/null 2>&1; then
        echo -e "✓ HAProxy: ${GREEN}HEALTHY${NC}"
    else
        echo -e "✗ HAProxy: ${RED}UNHEALTHY${NC}"
    fi
fi

# Check Redis
if docker-compose -f "${COMPOSE_FILE}" ps redis | grep -q "Up"; then
    echo -e "✓ Redis: ${GREEN}HEALTHY${NC}"
else
    echo -e "✗ Redis: ${RED}UNHEALTHY${NC}"
fi

# Check Application Instances
SCALE_VALUE=$(grep -c "app[0-9]*:" "${COMPOSE_FILE}" | head -1)
for i in $(seq 1 ${SCALE_VALUE}); do
    if docker-compose -f "${COMPOSE_FILE}" ps app${i} | grep -q "Up"; then
        echo -e "✓ App Instance ${i}: ${GREEN}HEALTHY${NC}"
    else
        echo -e "✗ App Instance ${i}: ${RED}UNHEALTHY${NC}"
    fi
done

echo ""
echo "=== End Health Check ==="
EOF
    
    chmod +x "${HEALTH_SCRIPT}"
    
    log "Health check script created: ${HEALTH_SCRIPT}"
}

# Deploy load balancer
deploy_load_balancer() {
    log "Deploying load balancer infrastructure..."
    
    if [[ "${DRY_RUN}" == "false" ]]; then
        # Build and start services
        log "Building and starting services..."
        
        cd "${SCRIPT_DIR}"
        
        # Use docker-compose or docker compose based on availability
        if command -v docker-compose &> /dev/null; then
            COMPOSE_CMD="docker-compose"
        else
            COMPOSE_CMD="docker compose"
        fi
        
        # Build services
        ${COMPOSE_CMD} -f docker-compose.generated.yml build
        
        # Start services
        ${COMPOSE_CMD} -f docker-compose.generated.yml up -d
        
        # Wait for services to be healthy
        log "Waiting for services to become healthy..."
        sleep 30
        
        # Run health check
        ./health-check.sh
        
        log "Load balancer deployed successfully"
    else
        log "DRY RUN: Would deploy load balancer with ${SCALE} app instances"
        log "Generated files:"
        log "  - ${SCRIPT_DIR}/docker-compose.generated.yml"
        log "  - ${SCRIPT_DIR}/health-check.sh"
    fi
}

# Setup monitoring
setup_monitoring() {
    log "Setting up load balancer monitoring..."
    
    MONITOR_SCRIPT="${SCRIPT_DIR}/monitor-lb.sh"
    
    cat > "${MONITOR_SCRIPT}" << 'EOF'
#!/bin/bash

# Load Balancer Monitoring Script
# This script monitors load balancer metrics and performance

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.generated.yml"
LOG_FILE="${SCRIPT_DIR}/logs/monitoring.log"

# Create log directory
mkdir -p "$(dirname "${LOG_FILE}")"

# Function to log with timestamp
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

# Monitor Nginx metrics
monitor_nginx() {
    log "=== Nginx Metrics ==="
    
    # Get connection count
    if command -v docker &> /dev/null; then
        CONNECTIONS=$(docker exec heypeter-nginx-lb sh -c "netstat -an | grep :80 | wc -l" 2>/dev/null || echo "N/A")
        log "Active connections: ${CONNECTIONS}"
    fi
    
    # Check response time
    RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' http://localhost/health 2>/dev/null || echo "N/A")
    log "Response time: ${RESPONSE_TIME}s"
    
    # Check error rate from logs
    ERROR_COUNT=$(tail -100 "${SCRIPT_DIR}/logs/error.log" 2>/dev/null | grep "$(date '+%Y/%m/%d %H:%M')" | wc -l || echo "0")
    log "Recent errors: ${ERROR_COUNT}"
}

# Monitor application instances
monitor_apps() {
    log "=== Application Instance Metrics ==="
    
    # Check each app instance
    for container in $(docker ps --filter "label=service=app" --format "{{.Names}}" 2>/dev/null); do
        # CPU and Memory usage
        STATS=$(docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" "${container}" 2>/dev/null | tail -n 1)
        log "Instance ${container}: ${STATS}"
        
        # Health check
        HEALTH=$(docker inspect "${container}" --format='{{.State.Health.Status}}' 2>/dev/null || echo "unknown")
        log "Health ${container}: ${HEALTH}"
    done
}

# Main monitoring function
main() {
    log "Starting load balancer monitoring..."
    monitor_nginx
    monitor_apps
    log "Monitoring completed"
    echo ""
}

# Run monitoring
main
EOF
    
    chmod +x "${MONITOR_SCRIPT}"
    
    # Create cron job for monitoring
    CRON_ENTRY="*/5 * * * * ${MONITOR_SCRIPT}"
    
    if [[ "${DRY_RUN}" == "false" ]]; then
        # Add to crontab
        (crontab -l 2>/dev/null; echo "${CRON_ENTRY}") | crontab -
        log "Monitoring cron job installed"
    else
        log "DRY RUN: Would install monitoring cron job: ${CRON_ENTRY}"
    fi
    
    log "Monitoring setup completed: ${MONITOR_SCRIPT}"
}

# Generate deployment report
generate_report() {
    log "Generating load balancer deployment report..."
    
    REPORT_FILE="${DEPLOYMENT_DIR}/reports/lb_deployment_$(date +%Y%m%d_%H%M%S).md"
    mkdir -p "$(dirname "${REPORT_FILE}")"
    
    cat > "${REPORT_FILE}" << EOF
# Load Balancer Deployment Report

**Date:** $(date)
**Environment:** ${ENVIRONMENT}
**Load Balancer Type:** ${LB_TYPE}
**Scale:** ${SCALE} application instances

## Deployment Summary

- Load balancer type: ${LB_TYPE}
- Application instances: ${SCALE}
- Redis caching: Enabled
- Health monitoring: Enabled

## Configuration Files

- Nginx config: \`${SCRIPT_DIR}/nginx.conf\`
- HAProxy config: \`${SCRIPT_DIR}/haproxy.cfg\`
- Docker Compose: \`${SCRIPT_DIR}/docker-compose.generated.yml\`
- Health check: \`${SCRIPT_DIR}/health-check.sh\`
- Monitoring: \`${SCRIPT_DIR}/monitor-lb.sh\`

## Access URLs

EOF
    
    if [[ "${LB_TYPE}" == "nginx" || "${LB_TYPE}" == "both" ]]; then
        cat >> "${REPORT_FILE}" << EOF
- **Application:** https://your-domain.com
- **Health Check:** https://your-domain.com/health

EOF
    fi
    
    if [[ "${LB_TYPE}" == "haproxy" || "${LB_TYPE}" == "both" ]]; then
        cat >> "${REPORT_FILE}" << EOF
- **HAProxy Stats:** http://your-domain.com:8080/haproxy-stats
- **HAProxy Admin:** http://your-domain.com:8080/ (admin/heypeter-stats-2025)

EOF
    fi
    
    cat >> "${REPORT_FILE}" << EOF
## Management Commands

\`\`\`bash
# Start services
cd ${SCRIPT_DIR}
docker-compose -f docker-compose.generated.yml up -d

# Stop services
docker-compose -f docker-compose.generated.yml down

# View logs
docker-compose -f docker-compose.generated.yml logs -f

# Health check
./health-check.sh

# Monitor performance
./monitor-lb.sh

# Scale application instances
docker-compose -f docker-compose.generated.yml up -d --scale app1=2
\`\`\`

## Next Steps

1. Configure DNS to point to load balancer
2. Set up SSL certificates
3. Configure monitoring alerts
4. Test failover scenarios
5. Optimize performance based on metrics

EOF
    
    log "Load balancer deployment report generated: ${REPORT_FILE}"
}

# Cleanup function
cleanup() {
    log "Performing cleanup..."
    # Restore backup configurations if they exist
    if [[ -f "${SCRIPT_DIR}/nginx.conf.bak" ]]; then
        mv "${SCRIPT_DIR}/nginx.conf.bak" "${SCRIPT_DIR}/nginx.conf"
    fi
    if [[ -f "${SCRIPT_DIR}/haproxy.cfg.bak" ]]; then
        mv "${SCRIPT_DIR}/haproxy.cfg.bak" "${SCRIPT_DIR}/haproxy.cfg"
    fi
}

# Trap cleanup on exit
trap cleanup EXIT

# Main execution
main() {
    log "Starting load balancer setup..."
    
    check_prerequisites
    load_environment
    create_directories
    generate_configurations
    generate_docker_compose
    create_health_check
    deploy_load_balancer
    setup_monitoring
    generate_report
    
    log "Load balancer setup completed successfully!"
    
    if [[ "${DRY_RUN}" == "true" ]]; then
        echo ""
        echo -e "${YELLOW}This was a dry run. To actually deploy, run:${NC}"
        echo -e "${YELLOW}$0 ${ENVIRONMENT} ${LB_TYPE} ${SCALE} false${NC}"
    else
        echo ""
        echo -e "${GREEN}========================================${NC}"
        echo -e "${GREEN}  Load Balancer Deployed Successfully!${NC}"
        echo -e "${GREEN}========================================${NC}"
        echo -e "Type: ${YELLOW}${LB_TYPE}${NC}"
        echo -e "Scale: ${YELLOW}${SCALE} instances${NC}"
        echo -e "Health Check: ${YELLOW}${SCRIPT_DIR}/health-check.sh${NC}"
        echo -e "Report: ${YELLOW}${REPORT_FILE}${NC}"
    fi
}

# Show usage
usage() {
    echo "Usage: $0 [environment] [lb_type] [scale] [dry_run]"
    echo ""
    echo "Arguments:"
    echo "  environment  Target environment (production, staging) [default: production]"
    echo "  lb_type      Load balancer type (nginx, haproxy, both) [default: nginx]"
    echo "  scale        Number of app instances (1-10) [default: 3]"
    echo "  dry_run      Run in dry-run mode (true/false) [default: false]"
    echo ""
    echo "Examples:"
    echo "  $0                           # Deploy nginx LB with 3 app instances"
    echo "  $0 production haproxy 5      # Deploy HAProxy with 5 instances"
    echo "  $0 staging both 2 true       # Dry run: both LBs with 2 instances"
}

# Handle help flag
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    usage
    exit 0
fi

# Run main function
main