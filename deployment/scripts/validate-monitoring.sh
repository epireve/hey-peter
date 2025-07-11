#!/bin/bash

# Monitoring and Alerting System Validation Script for HeyPeter Academy LMS
# Validates Prometheus, Grafana, AlertManager, and monitoring configuration

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
MONITORING_DIR="$DEPLOYMENT_DIR/monitoring"
VALIDATION_LOG="$DEPLOYMENT_DIR/reports/monitoring-validation-$(date +%Y%m%d_%H%M%S).log"

# Create reports directory if it doesn't exist
mkdir -p "$DEPLOYMENT_DIR/reports"

# Initialize counters
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Monitoring endpoints
PROMETHEUS_PORT="${PROMETHEUS_PORT:-9090}"
GRAFANA_PORT="${GRAFANA_PORT:-3001}"
ALERTMANAGER_PORT="${ALERTMANAGER_PORT:-9093}"
NODE_EXPORTER_PORT="${NODE_EXPORTER_PORT:-9100}"

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

# Configuration validation functions
validate_prometheus_config() {
    log_info "Validating Prometheus configuration..."
    
    local prometheus_config="$MONITORING_DIR/prometheus.yml"
    
    if [[ -f "$prometheus_config" ]]; then
        # Check YAML syntax
        if command -v python3 >/dev/null 2>&1; then
            if python3 -c "import yaml; yaml.safe_load(open('$prometheus_config'))" 2>/dev/null; then
                log_success "Prometheus configuration YAML syntax is valid"
            else
                log_error "Prometheus configuration YAML syntax is invalid"
                return 1
            fi
        else
            log_warning "python3 not available for YAML validation"
        fi
        
        # Check required sections
        check_prometheus_sections "$prometheus_config"
        
        # Check scrape configurations
        check_prometheus_scrape_configs "$prometheus_config"
        
        # Check rule files
        check_prometheus_rule_files "$prometheus_config"
        
        # Check global configuration
        check_prometheus_global_config "$prometheus_config"
        
    else
        log_error "Prometheus configuration file not found: $prometheus_config"
        return 1
    fi
}

check_prometheus_sections() {
    local config_file="$1"
    
    log_info "Checking required Prometheus sections..."
    
    local required_sections=(
        "global:"
        "scrape_configs:"
        "rule_files:"
    )
    
    for section in "${required_sections[@]}"; do
        if grep -q "$section" "$config_file"; then
            log_success "Required section found: $section"
        else
            log_error "Required section missing: $section"
        fi
    done
    
    # Check optional but recommended sections
    local optional_sections=(
        "alerting:"
        "remote_write:"
        "remote_read:"
    )
    
    for section in "${optional_sections[@]}"; do
        if grep -q "$section" "$config_file"; then
            log_success "Optional section found: $section"
        else
            log_info "Optional section not found: $section"
        fi
    done
}

check_prometheus_scrape_configs() {
    local config_file="$1"
    
    log_info "Checking Prometheus scrape configurations..."
    
    # Check for essential scrape jobs
    local essential_jobs=(
        "prometheus"
        "node"
        "cadvisor"
        "application"
    )
    
    for job in "${essential_jobs[@]}"; do
        if grep -A5 "job_name.*$job" "$config_file" >/dev/null; then
            log_success "Scrape job configured: $job"
        else
            log_warning "Scrape job not found: $job"
        fi
    done
    
    # Check scrape intervals
    if grep -q "scrape_interval:" "$config_file"; then
        local intervals=$(grep "scrape_interval:" "$config_file" | awk '{print $2}')
        log_info "Scrape intervals configured: $intervals"
    else
        log_warning "No custom scrape intervals configured"
    fi
    
    # Check metrics paths
    if grep -q "metrics_path:" "$config_file"; then
        log_success "Custom metrics paths configured"
    else
        log_info "Using default metrics paths"
    fi
}

check_prometheus_rule_files() {
    local config_file="$1"
    
    log_info "Checking Prometheus rule files..."
    
    # Extract rule file paths
    local rule_files=($(grep -A10 "rule_files:" "$config_file" | grep -o '"[^"]*\.yml"' | tr -d '"' || true))
    
    if [[ ${#rule_files[@]} -gt 0 ]]; then
        log_success "Rule files configured: ${#rule_files[@]}"
        
        for rule_file in "${rule_files[@]}"; do
            local full_path="$MONITORING_DIR/$rule_file"
            if [[ -f "$full_path" ]]; then
                log_success "Rule file exists: $rule_file"
                validate_rule_file "$full_path"
            else
                log_error "Rule file not found: $rule_file"
            fi
        done
    else
        log_warning "No rule files configured"
    fi
}

validate_rule_file() {
    local rule_file="$1"
    local filename=$(basename "$rule_file")
    
    log_info "Validating rule file: $filename"
    
    # Check YAML syntax
    if command -v python3 >/dev/null 2>&1; then
        if python3 -c "import yaml; yaml.safe_load(open('$rule_file'))" 2>/dev/null; then
            log_success "Rule file YAML syntax is valid: $filename"
        else
            log_error "Rule file YAML syntax is invalid: $filename"
            return 1
        fi
    fi
    
    # Check for required structure
    if grep -q "groups:" "$rule_file"; then
        log_success "Rule groups found in: $filename"
        
        # Check for alert rules
        if grep -q "alert:" "$rule_file"; then
            local alert_count=$(grep -c "alert:" "$rule_file")
            log_success "Alert rules found in $filename: $alert_count"
        else
            log_warning "No alert rules found in: $filename"
        fi
        
        # Check for recording rules
        if grep -q "record:" "$rule_file"; then
            local record_count=$(grep -c "record:" "$rule_file")
            log_success "Recording rules found in $filename: $record_count"
        else
            log_info "No recording rules found in: $filename"
        fi
        
    else
        log_error "No rule groups found in: $filename"
    fi
}

check_prometheus_global_config() {
    local config_file="$1"
    
    log_info "Checking Prometheus global configuration..."
    
    # Check scrape interval
    if grep -q "scrape_interval:" "$config_file"; then
        local interval=$(grep "scrape_interval:" "$config_file" | head -1 | awk '{print $2}')
        log_success "Global scrape interval configured: $interval"
    else
        log_warning "No global scrape interval configured"
    fi
    
    # Check evaluation interval
    if grep -q "evaluation_interval:" "$config_file"; then
        local interval=$(grep "evaluation_interval:" "$config_file" | head -1 | awk '{print $2}')
        log_success "Evaluation interval configured: $interval"
    else
        log_warning "No evaluation interval configured"
    fi
    
    # Check external labels
    if grep -q "external_labels:" "$config_file"; then
        log_success "External labels configured"
    else
        log_info "No external labels configured"
    fi
}

validate_grafana_config() {
    log_info "Validating Grafana configuration..."
    
    # Check for Grafana configuration
    local grafana_dir="$MONITORING_DIR/grafana"
    
    if [[ -d "$grafana_dir" ]]; then
        log_success "Grafana configuration directory found"
        
        # Check datasources
        check_grafana_datasources "$grafana_dir"
        
        # Check dashboards
        check_grafana_dashboards "$grafana_dir"
        
        # Check provisioning
        check_grafana_provisioning "$grafana_dir"
        
    else
        log_warning "Grafana configuration directory not found: $grafana_dir"
    fi
}

check_grafana_datasources() {
    local grafana_dir="$1"
    
    log_info "Checking Grafana datasources..."
    
    local datasources_dir="$grafana_dir/datasources"
    
    if [[ -d "$datasources_dir" ]]; then
        local datasource_files=($(find "$datasources_dir" -name "*.yml" -o -name "*.yaml" 2>/dev/null))
        
        if [[ ${#datasource_files[@]} -gt 0 ]]; then
            log_success "Grafana datasource configurations found: ${#datasource_files[@]}"
            
            for datasource_file in "${datasource_files[@]}"; do
                local filename=$(basename "$datasource_file")
                
                # Check for Prometheus datasource
                if grep -q "prometheus" "$datasource_file"; then
                    log_success "Prometheus datasource configured in: $filename"
                fi
                
                # Check datasource URL
                if grep -q "url:" "$datasource_file"; then
                    local url=$(grep "url:" "$datasource_file" | head -1 | awk '{print $2}')
                    log_info "Datasource URL: $url"
                fi
            done
        else
            log_warning "No Grafana datasource configurations found"
        fi
    else
        log_warning "Grafana datasources directory not found"
    fi
}

check_grafana_dashboards() {
    local grafana_dir="$1"
    
    log_info "Checking Grafana dashboards..."
    
    local dashboards_dir="$grafana_dir/dashboards"
    
    if [[ -d "$dashboards_dir" ]]; then
        local dashboard_files=($(find "$dashboards_dir" -name "*.json" 2>/dev/null))
        
        if [[ ${#dashboard_files[@]} -gt 0 ]]; then
            log_success "Grafana dashboard files found: ${#dashboard_files[@]}"
            
            for dashboard_file in "${dashboard_files[@]}"; do
                local filename=$(basename "$dashboard_file")
                
                # Validate JSON syntax
                if command -v jq >/dev/null 2>&1; then
                    if jq empty "$dashboard_file" >/dev/null 2>&1; then
                        log_success "Dashboard JSON syntax valid: $filename"
                    else
                        log_error "Dashboard JSON syntax invalid: $filename"
                    fi
                elif command -v python3 >/dev/null 2>&1; then
                    if python3 -c "import json; json.load(open('$dashboard_file'))" 2>/dev/null; then
                        log_success "Dashboard JSON syntax valid: $filename"
                    else
                        log_error "Dashboard JSON syntax invalid: $filename"
                    fi
                fi
                
                # Check for essential dashboard elements
                if grep -q "\"panels\"" "$dashboard_file"; then
                    log_success "Dashboard has panels: $filename"
                else
                    log_warning "Dashboard has no panels: $filename"
                fi
            done
        else
            log_warning "No Grafana dashboard files found"
        fi
    else
        log_warning "Grafana dashboards directory not found"
    fi
}

check_grafana_provisioning() {
    local grafana_dir="$1"
    
    log_info "Checking Grafana provisioning configuration..."
    
    # Check for provisioning directories
    local provisioning_dirs=(
        "datasources"
        "dashboards"
        "notifiers"
        "plugins"
    )
    
    for dir in "${provisioning_dirs[@]}"; do
        if [[ -d "$grafana_dir/$dir" ]]; then
            log_success "Grafana $dir provisioning directory found"
        else
            log_info "Grafana $dir provisioning directory not found (optional)"
        fi
    done
}

validate_alertmanager_config() {
    log_info "Validating AlertManager configuration..."
    
    local alertmanager_config="$MONITORING_DIR/alertmanager.yml"
    
    if [[ -f "$alertmanager_config" ]]; then
        # Check YAML syntax
        if command -v python3 >/dev/null 2>&1; then
            if python3 -c "import yaml; yaml.safe_load(open('$alertmanager_config'))" 2>/dev/null; then
                log_success "AlertManager configuration YAML syntax is valid"
            else
                log_error "AlertManager configuration YAML syntax is invalid"
                return 1
            fi
        fi
        
        # Check required sections
        check_alertmanager_sections "$alertmanager_config"
        
        # Check routing configuration
        check_alertmanager_routing "$alertmanager_config"
        
        # Check receivers
        check_alertmanager_receivers "$alertmanager_config"
        
        # Check inhibition rules
        check_alertmanager_inhibition "$alertmanager_config"
        
    else
        log_warning "AlertManager configuration file not found: $alertmanager_config"
    fi
}

check_alertmanager_sections() {
    local config_file="$1"
    
    log_info "Checking AlertManager sections..."
    
    local required_sections=(
        "global:"
        "route:"
        "receivers:"
    )
    
    for section in "${required_sections[@]}"; do
        if grep -q "$section" "$config_file"; then
            log_success "Required section found: $section"
        else
            log_error "Required section missing: $section"
        fi
    done
    
    # Check optional sections
    local optional_sections=(
        "inhibit_rules:"
        "templates:"
    )
    
    for section in "${optional_sections[@]}"; do
        if grep -q "$section" "$config_file"; then
            log_success "Optional section found: $section"
        else
            log_info "Optional section not found: $section"
        fi
    done
}

check_alertmanager_routing() {
    local config_file="$1"
    
    log_info "Checking AlertManager routing configuration..."
    
    # Check for default receiver
    if grep -q "receiver:" "$config_file"; then
        local default_receiver=$(grep "receiver:" "$config_file" | head -1 | awk '{print $2}')
        log_success "Default receiver configured: $default_receiver"
    else
        log_error "No default receiver configured"
    fi
    
    # Check for routing tree
    if grep -q "routes:" "$config_file"; then
        log_success "Routing tree configured"
        
        # Check for match conditions
        if grep -q "match:" "$config_file" || grep -q "match_re:" "$config_file"; then
            log_success "Alert matching conditions configured"
        else
            log_warning "No alert matching conditions configured"
        fi
        
    else
        log_warning "No routing tree configured (using defaults)"
    fi
    
    # Check group configuration
    if grep -q "group_by:" "$config_file"; then
        local group_by=$(grep "group_by:" "$config_file" | head -1)
        log_success "Alert grouping configured: $group_by"
    else
        log_warning "No alert grouping configured"
    fi
}

check_alertmanager_receivers() {
    local config_file="$1"
    
    log_info "Checking AlertManager receivers..."
    
    # Count receivers
    local receiver_count=$(grep -c "- name:" "$config_file" || echo "0")
    
    if [[ $receiver_count -gt 0 ]]; then
        log_success "Alert receivers configured: $receiver_count"
        
        # Check for different notification types
        check_notification_types "$config_file"
        
    else
        log_error "No alert receivers configured"
    fi
}

check_notification_types() {
    local config_file="$1"
    
    log_info "Checking notification types..."
    
    local notification_types=(
        "email_configs:"
        "slack_configs:"
        "webhook_configs:"
        "pagerduty_configs:"
        "opsgenie_configs:"
    )
    
    for type in "${notification_types[@]}"; do
        if grep -q "$type" "$config_file"; then
            log_success "Notification type configured: ${type%:}"
        else
            log_info "Notification type not configured: ${type%:}"
        fi
    done
}

check_alertmanager_inhibition() {
    local config_file="$1"
    
    log_info "Checking AlertManager inhibition rules..."
    
    if grep -q "inhibit_rules:" "$config_file"; then
        log_success "Inhibition rules configured"
        
        # Check for source and target matchers
        if grep -q "source_match:" "$config_file" && grep -q "target_match:" "$config_file"; then
            log_success "Inhibition source and target matchers configured"
        else
            log_warning "Incomplete inhibition rule configuration"
        fi
        
    else
        log_info "No inhibition rules configured (optional)"
    fi
}

# Service health validation
validate_monitoring_services() {
    log_info "Validating monitoring services health..."
    
    # Check Prometheus
    check_prometheus_health
    
    # Check Grafana
    check_grafana_health
    
    # Check AlertManager
    check_alertmanager_health
    
    # Check Node Exporter
    check_node_exporter_health
    
    # Check application metrics
    check_application_metrics
}

check_prometheus_health() {
    log_info "Checking Prometheus health..."
    
    local prometheus_url="http://localhost:$PROMETHEUS_PORT"
    
    if command -v curl >/dev/null 2>&1; then
        # Check if Prometheus is accessible
        local response_code
        response_code=$(curl -s -o /dev/null -w "%{http_code}" "$prometheus_url" 2>/dev/null || echo "000")
        
        case "$response_code" in
            200)
                log_success "Prometheus is accessible (HTTP $response_code)"
                
                # Check Prometheus API
                check_prometheus_api "$prometheus_url"
                
                # Check targets
                check_prometheus_targets "$prometheus_url"
                
                # Check rules
                check_prometheus_rules_api "$prometheus_url"
                ;;
            000)
                log_error "Prometheus is not accessible (connection failed)"
                ;;
            *)
                log_warning "Prometheus responded with HTTP $response_code"
                ;;
        esac
    else
        log_warning "curl not available for health checks"
    fi
}

check_prometheus_api() {
    local prometheus_url="$1"
    
    log_info "Checking Prometheus API endpoints..."
    
    local api_endpoints=(
        "/api/v1/query"
        "/api/v1/targets"
        "/api/v1/rules"
        "/api/v1/status/config"
    )
    
    for endpoint in "${api_endpoints[@]}"; do
        local response_code
        response_code=$(curl -s -o /dev/null -w "%{http_code}" "$prometheus_url$endpoint" 2>/dev/null || echo "000")
        
        case "$response_code" in
            200|400)  # 400 is expected for query endpoint without parameters
                log_success "Prometheus API endpoint accessible: $endpoint"
                ;;
            *)
                log_warning "Prometheus API endpoint issue: $endpoint (HTTP $response_code)"
                ;;
        esac
    done
}

check_prometheus_targets() {
    local prometheus_url="$1"
    
    log_info "Checking Prometheus targets..."
    
    local targets_response
    targets_response=$(curl -s "$prometheus_url/api/v1/targets" 2>/dev/null)
    
    if [[ -n "$targets_response" ]]; then
        # Parse targets status (simplified)
        if echo "$targets_response" | grep -q '"health":"up"'; then
            local up_targets=$(echo "$targets_response" | grep -o '"health":"up"' | wc -l)
            log_success "Prometheus targets UP: $up_targets"
        fi
        
        if echo "$targets_response" | grep -q '"health":"down"'; then
            local down_targets=$(echo "$targets_response" | grep -o '"health":"down"' | wc -l)
            log_warning "Prometheus targets DOWN: $down_targets"
        fi
    else
        log_warning "Could not retrieve Prometheus targets information"
    fi
}

check_prometheus_rules_api() {
    local prometheus_url="$1"
    
    log_info "Checking Prometheus rules via API..."
    
    local rules_response
    rules_response=$(curl -s "$prometheus_url/api/v1/rules" 2>/dev/null)
    
    if [[ -n "$rules_response" ]]; then
        if echo "$rules_response" | grep -q '"status":"success"'; then
            log_success "Prometheus rules API accessible"
            
            # Count alert rules
            if echo "$rules_response" | grep -q '"type":"alerting"'; then
                local alert_rules=$(echo "$rules_response" | grep -o '"type":"alerting"' | wc -l)
                log_success "Alert rules loaded: $alert_rules"
            fi
            
            # Count recording rules
            if echo "$rules_response" | grep -q '"type":"recording"'; then
                local recording_rules=$(echo "$rules_response" | grep -o '"type":"recording"' | wc -l)
                log_success "Recording rules loaded: $recording_rules"
            fi
        else
            log_warning "Prometheus rules API returned error"
        fi
    else
        log_warning "Could not retrieve Prometheus rules information"
    fi
}

check_grafana_health() {
    log_info "Checking Grafana health..."
    
    local grafana_url="http://localhost:$GRAFANA_PORT"
    
    if command -v curl >/dev/null 2>&1; then
        local response_code
        response_code=$(curl -s -o /dev/null -w "%{http_code}" "$grafana_url" 2>/dev/null || echo "000")
        
        case "$response_code" in
            200|302)  # 302 is redirect to login
                log_success "Grafana is accessible (HTTP $response_code)"
                
                # Check Grafana API
                check_grafana_api "$grafana_url"
                ;;
            000)
                log_error "Grafana is not accessible (connection failed)"
                ;;
            *)
                log_warning "Grafana responded with HTTP $response_code"
                ;;
        esac
    fi
}

check_grafana_api() {
    local grafana_url="$1"
    
    log_info "Checking Grafana API endpoints..."
    
    # Check health endpoint
    local health_response
    health_response=$(curl -s "$grafana_url/api/health" 2>/dev/null)
    
    if [[ -n "$health_response" ]]; then
        if echo "$health_response" | grep -q '"database":"ok"'; then
            log_success "Grafana database connection OK"
        else
            log_warning "Grafana database connection issue"
        fi
    fi
    
    # Check datasources endpoint
    local datasources_code
    datasources_code=$(curl -s -o /dev/null -w "%{http_code}" "$grafana_url/api/datasources" 2>/dev/null || echo "000")
    
    case "$datasources_code" in
        200|401)  # 401 is expected without authentication
            log_success "Grafana datasources API accessible"
            ;;
        *)
            log_warning "Grafana datasources API issue (HTTP $datasources_code)"
            ;;
    esac
}

check_alertmanager_health() {
    log_info "Checking AlertManager health..."
    
    local alertmanager_url="http://localhost:$ALERTMANAGER_PORT"
    
    if command -v curl >/dev/null 2>&1; then
        local response_code
        response_code=$(curl -s -o /dev/null -w "%{http_code}" "$alertmanager_url" 2>/dev/null || echo "000")
        
        case "$response_code" in
            200)
                log_success "AlertManager is accessible (HTTP $response_code)"
                
                # Check AlertManager API
                check_alertmanager_api "$alertmanager_url"
                ;;
            000)
                log_warning "AlertManager is not accessible (connection failed)"
                ;;
            *)
                log_warning "AlertManager responded with HTTP $response_code"
                ;;
        esac
    fi
}

check_alertmanager_api() {
    local alertmanager_url="$1"
    
    log_info "Checking AlertManager API endpoints..."
    
    local api_endpoints=(
        "/api/v1/status"
        "/api/v1/alerts"
        "/api/v1/silences"
    )
    
    for endpoint in "${api_endpoints[@]}"; do
        local response_code
        response_code=$(curl -s -o /dev/null -w "%{http_code}" "$alertmanager_url$endpoint" 2>/dev/null || echo "000")
        
        case "$response_code" in
            200)
                log_success "AlertManager API endpoint accessible: $endpoint"
                ;;
            *)
                log_warning "AlertManager API endpoint issue: $endpoint (HTTP $response_code)"
                ;;
        esac
    done
}

check_node_exporter_health() {
    log_info "Checking Node Exporter health..."
    
    local node_exporter_url="http://localhost:$NODE_EXPORTER_PORT"
    
    if command -v curl >/dev/null 2>&1; then
        local response_code
        response_code=$(curl -s -o /dev/null -w "%{http_code}" "$node_exporter_url/metrics" 2>/dev/null || echo "000")
        
        case "$response_code" in
            200)
                log_success "Node Exporter is accessible (HTTP $response_code)"
                
                # Check metrics availability
                local metrics_count
                metrics_count=$(curl -s "$node_exporter_url/metrics" 2>/dev/null | grep -c "^node_" || echo "0")
                
                if [[ $metrics_count -gt 0 ]]; then
                    log_success "Node Exporter metrics available: $metrics_count"
                else
                    log_warning "No Node Exporter metrics found"
                fi
                ;;
            000)
                log_warning "Node Exporter is not accessible (connection failed)"
                ;;
            *)
                log_warning "Node Exporter responded with HTTP $response_code"
                ;;
        esac
    fi
}

check_application_metrics() {
    log_info "Checking application metrics endpoints..."
    
    local app_metrics_endpoints=(
        "http://localhost:3000/api/metrics"
        "http://localhost:3000/metrics"
        "http://localhost:3000/api/health"
    )
    
    for endpoint in "${app_metrics_endpoints[@]}"; do
        if command -v curl >/dev/null 2>&1; then
            local response_code
            response_code=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint" 2>/dev/null || echo "000")
            
            case "$response_code" in
                200)
                    log_success "Application metrics endpoint accessible: $endpoint"
                    ;;
                404)
                    log_info "Application metrics endpoint not implemented: $endpoint"
                    ;;
                000)
                    log_info "Application metrics endpoint not accessible: $endpoint"
                    ;;
                *)
                    log_warning "Application metrics endpoint responded with HTTP $response_code: $endpoint"
                    ;;
            esac
        fi
    done
}

# Docker Compose monitoring validation
validate_monitoring_compose() {
    log_info "Validating monitoring Docker Compose configuration..."
    
    local monitoring_compose="$MONITORING_DIR/docker-compose.monitoring.yml"
    
    if [[ -f "$monitoring_compose" ]]; then
        # Check Docker Compose syntax
        if command -v docker-compose >/dev/null 2>&1; then
            if docker-compose -f "$monitoring_compose" config >/dev/null 2>&1; then
                log_success "Monitoring Docker Compose syntax is valid"
            else
                log_error "Monitoring Docker Compose syntax is invalid"
                return 1
            fi
        else
            log_warning "docker-compose not available for syntax validation"
        fi
        
        # Check for essential services
        check_monitoring_services_compose "$monitoring_compose"
        
        # Check volumes configuration
        check_monitoring_volumes_compose "$monitoring_compose"
        
        # Check networks configuration
        check_monitoring_networks_compose "$monitoring_compose"
        
    else
        log_warning "Monitoring Docker Compose file not found: $monitoring_compose"
    fi
}

check_monitoring_services_compose() {
    local compose_file="$1"
    
    log_info "Checking monitoring services in Docker Compose..."
    
    local essential_services=(
        "prometheus"
        "grafana"
        "alertmanager"
        "node-exporter"
    )
    
    for service in "${essential_services[@]}"; do
        if grep -q "^  $service:" "$compose_file"; then
            log_success "Monitoring service configured: $service"
        else
            log_warning "Monitoring service not configured: $service"
        fi
    done
    
    # Check for additional services
    local additional_services=(
        "cadvisor"
        "blackbox-exporter"
        "postgres-exporter"
    )
    
    for service in "${additional_services[@]}"; do
        if grep -q "^  $service:" "$compose_file"; then
            log_success "Additional monitoring service configured: $service"
        else
            log_info "Additional monitoring service not configured: $service"
        fi
    done
}

check_monitoring_volumes_compose() {
    local compose_file="$1"
    
    log_info "Checking monitoring volumes configuration..."
    
    # Check for persistent volumes
    local required_volumes=(
        "prometheus_data"
        "grafana_data"
        "alertmanager_data"
    )
    
    for volume in "${required_volumes[@]}"; do
        if grep -q "$volume" "$compose_file"; then
            log_success "Persistent volume configured: $volume"
        else
            log_warning "Persistent volume not configured: $volume"
        fi
    done
    
    # Check for configuration mounts
    if grep -q "/etc/prometheus" "$compose_file"; then
        log_success "Prometheus configuration mount found"
    else
        log_warning "Prometheus configuration mount not found"
    fi
    
    if grep -q "/etc/grafana" "$compose_file" || grep -q "/var/lib/grafana" "$compose_file"; then
        log_success "Grafana configuration mount found"
    else
        log_warning "Grafana configuration mount not found"
    fi
}

check_monitoring_networks_compose() {
    local compose_file="$1"
    
    log_info "Checking monitoring networks configuration..."
    
    if grep -q "networks:" "$compose_file"; then
        log_success "Networks configuration found"
        
        # Check for monitoring network
        if grep -q "monitoring" "$compose_file"; then
            log_success "Monitoring network configured"
        else
            log_info "No dedicated monitoring network configured"
        fi
    else
        log_info "No custom networks configured (using default)"
    fi
}

# Alert testing
test_alert_rules() {
    log_info "Testing alert rules configuration..."
    
    local prometheus_url="http://localhost:$PROMETHEUS_PORT"
    
    if command -v curl >/dev/null 2>&1; then
        # Test alert rules syntax via Prometheus API
        local rules_response
        rules_response=$(curl -s "$prometheus_url/api/v1/rules" 2>/dev/null)
        
        if [[ -n "$rules_response" ]]; then
            # Check for firing alerts
            if echo "$rules_response" | grep -q '"state":"firing"'; then
                local firing_alerts=$(echo "$rules_response" | grep -o '"state":"firing"' | wc -l)
                log_warning "Firing alerts detected: $firing_alerts"
            else
                log_success "No firing alerts (system is healthy)"
            fi
            
            # Check for pending alerts
            if echo "$rules_response" | grep -q '"state":"pending"'; then
                local pending_alerts=$(echo "$rules_response" | grep -o '"state":"pending"' | wc -l)
                log_info "Pending alerts: $pending_alerts"
            fi
            
            # Check for inactive alerts
            if echo "$rules_response" | grep -q '"state":"inactive"'; then
                local inactive_alerts=$(echo "$rules_response" | grep -o '"state":"inactive"' | wc -l)
                log_success "Inactive alert rules: $inactive_alerts"
            fi
        else
            log_warning "Could not retrieve alert rules status"
        fi
    fi
}

# Report generation
generate_monitoring_report() {
    log_info "Generating monitoring validation report..."
    
    local total_checks=$((PASSED_CHECKS + FAILED_CHECKS + WARNING_CHECKS))
    
    cat >> "$VALIDATION_LOG" << EOF

================================================================================
                       MONITORING VALIDATION SUMMARY
================================================================================

Validation completed at: $(date)
Total checks performed: $total_checks

Results:
  ✓ Passed:   $PASSED_CHECKS
  ⚠ Warnings: $WARNING_CHECKS  
  ✗ Failed:   $FAILED_CHECKS

Monitoring Components Validated:
  - Prometheus Configuration
  - Grafana Configuration
  - AlertManager Configuration
  - Service Health Checks
  - Docker Compose Configuration
  - Alert Rules Testing

EOF

    # Monitoring recommendations
    if [[ $FAILED_CHECKS -gt 0 ]] || [[ $WARNING_CHECKS -gt 0 ]]; then
        cat >> "$VALIDATION_LOG" << EOF

MONITORING RECOMMENDATIONS:
- Address all failed monitoring checks before deployment
- Review warnings and implement missing configurations
- Ensure all monitoring services are accessible
- Test alert notification channels
- Set up appropriate data retention policies
- Configure backup for monitoring data
- Implement monitoring for the monitoring stack itself

Monitoring Access URLs (assuming default ports):
- Prometheus: http://localhost:$PROMETHEUS_PORT
- Grafana: http://localhost:$GRAFANA_PORT
- AlertManager: http://localhost:$ALERTMANAGER_PORT

EOF
    fi

    if [[ $FAILED_CHECKS -eq 0 ]]; then
        log_success "Monitoring validation completed successfully!"
        if [[ $WARNING_CHECKS -gt 0 ]]; then
            log_warning "Please review $WARNING_CHECKS warning(s) for optimal monitoring setup"
        fi
        echo "0" # Exit code for success
    else
        log_error "Monitoring validation failed with $FAILED_CHECKS critical issue(s)"
        log_error "Please address all failed checks before proceeding with deployment"
        echo "1" # Exit code for failure
    fi
}

# Main execution
show_usage() {
    cat << EOF
Usage: $0 [options]

Options:
  --config     Only validate configuration files
  --services   Only validate service health
  --compose    Only validate Docker Compose configuration
  --alerts     Only test alert rules
  --all        Run all monitoring validations (default)

Examples:
  $0                    # Run all monitoring validations
  $0 --config          # Only validate configuration files
  $0 --services        # Only check service health

EOF
}

main() {
    local config_only=false
    local services_only=false
    local compose_only=false
    local alerts_only=false
    local run_all=true
    
    # Parse options
    while [[ $# -gt 0 ]]; do
        case $1 in
            --config)
                config_only=true
                run_all=false
                shift
                ;;
            --services)
                services_only=true
                run_all=false
                shift
                ;;
            --compose)
                compose_only=true
                run_all=false
                shift
                ;;
            --alerts)
                alerts_only=true
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
    
    log_info "Starting monitoring system validation"
    log_info "Validation log: $VALIDATION_LOG"
    
    # Run selected validations
    if [[ "$config_only" == true ]] || [[ "$run_all" == true ]]; then
        validate_prometheus_config
        validate_grafana_config
        validate_alertmanager_config
    fi
    
    if [[ "$services_only" == true ]] || [[ "$run_all" == true ]]; then
        validate_monitoring_services
    fi
    
    if [[ "$compose_only" == true ]] || [[ "$run_all" == true ]]; then
        validate_monitoring_compose
    fi
    
    if [[ "$alerts_only" == true ]] || [[ "$run_all" == true ]]; then
        test_alert_rules
    fi
    
    # Generate final report
    local exit_code=$(generate_monitoring_report)
    
    log_info "Full validation log available at: $VALIDATION_LOG"
    
    exit "$exit_code"
}

# Run main function with all arguments
main "$@"