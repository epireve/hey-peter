#!/bin/bash

# Performance Baseline Measurement and Validation Script for HeyPeter Academy LMS
# Establishes performance baselines and validates system performance

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
VALIDATION_LOG="$DEPLOYMENT_DIR/reports/performance-validation-$(date +%Y%m%d_%H%M%S).log"
BASELINE_DIR="$DEPLOYMENT_DIR/performance-baselines"

# Create necessary directories
mkdir -p "$DEPLOYMENT_DIR/reports"
mkdir -p "$BASELINE_DIR"

# Initialize counters
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Performance thresholds
MAX_RESPONSE_TIME="2000"  # milliseconds
MIN_REQUESTS_PER_SECOND="50"
MAX_CPU_USAGE="80"        # percentage
MAX_MEMORY_USAGE="80"     # percentage
MAX_DISK_USAGE="85"       # percentage

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

# System resource baseline functions
establish_system_baseline() {
    log_info "Establishing system resource baseline..."
    
    # CPU baseline
    measure_cpu_baseline
    
    # Memory baseline
    measure_memory_baseline
    
    # Disk I/O baseline
    measure_disk_baseline
    
    # Network baseline
    measure_network_baseline
    
    # Process baseline
    measure_process_baseline
}

measure_cpu_baseline() {
    log_info "Measuring CPU baseline..."
    
    local cpu_baseline_file="$BASELINE_DIR/cpu_baseline.txt"
    
    # Measure CPU usage over time
    local cpu_samples=()
    local sample_count=10
    local sample_interval=2
    
    log_info "Collecting CPU samples (${sample_count} samples, ${sample_interval}s intervals)..."
    
    for i in $(seq 1 $sample_count); do
        local cpu_usage
        
        if command -v top >/dev/null 2>&1; then
            # Get CPU usage from top (Linux/macOS compatible)
            cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1 2>/dev/null || \
                       top -l1 -n0 | grep "CPU usage" | awk '{print $3}' | cut -d'%' -f1 2>/dev/null || \
                       echo "0")
        else
            cpu_usage="0"
        fi
        
        if [[ -n "$cpu_usage" ]] && [[ "$cpu_usage" != "0" ]]; then
            cpu_samples+=("$cpu_usage")
        fi
        
        sleep $sample_interval
    done
    
    if [[ ${#cpu_samples[@]} -gt 0 ]]; then
        # Calculate statistics
        local total_cpu=0
        local max_cpu=0
        local min_cpu=100
        
        for sample in "${cpu_samples[@]}"; do
            total_cpu=$(echo "$total_cpu + $sample" | bc 2>/dev/null || echo "$total_cpu")
            
            if (( $(echo "$sample > $max_cpu" | bc -l 2>/dev/null || echo 0) )); then
                max_cpu="$sample"
            fi
            
            if (( $(echo "$sample < $min_cpu" | bc -l 2>/dev/null || echo 0) )); then
                min_cpu="$sample"
            fi
        done
        
        local avg_cpu=$(echo "scale=2; $total_cpu / ${#cpu_samples[@]}" | bc 2>/dev/null || echo "0")
        
        # Save baseline
        cat > "$cpu_baseline_file" << EOF
timestamp=$(date +%s)
date=$(date)
avg_cpu_usage=${avg_cpu}
max_cpu_usage=${max_cpu}
min_cpu_usage=${min_cpu}
sample_count=${#cpu_samples[@]}
samples=${cpu_samples[*]}
EOF
        
        log_success "CPU baseline established: Avg=${avg_cpu}%, Max=${max_cpu}%, Min=${min_cpu}%"
        
        # Validate against thresholds
        if (( $(echo "$avg_cpu > $MAX_CPU_USAGE" | bc -l 2>/dev/null || echo 0) )); then
            log_warning "Average CPU usage exceeds threshold: ${avg_cpu}% > ${MAX_CPU_USAGE}%"
        else
            log_success "Average CPU usage within acceptable range: ${avg_cpu}%"
        fi
    else
        log_warning "Could not collect CPU samples"
    fi
}

measure_memory_baseline() {
    log_info "Measuring memory baseline..."
    
    local memory_baseline_file="$BASELINE_DIR/memory_baseline.txt"
    
    if command -v free >/dev/null 2>&1; then
        # Linux memory measurement
        local memory_info=$(free -m)
        local total_memory=$(echo "$memory_info" | awk '/^Mem:/ {print $2}')
        local used_memory=$(echo "$memory_info" | awk '/^Mem:/ {print $3}')
        local available_memory=$(echo "$memory_info" | awk '/^Mem:/ {print $7}' || echo "$memory_info" | awk '/^Mem:/ {print $4}')
        
        local memory_usage_percent=$(echo "scale=2; ($used_memory * 100) / $total_memory" | bc 2>/dev/null || echo "0")
        
        # Save baseline
        cat > "$memory_baseline_file" << EOF
timestamp=$(date +%s)
date=$(date)
total_memory_mb=${total_memory}
used_memory_mb=${used_memory}
available_memory_mb=${available_memory}
memory_usage_percent=${memory_usage_percent}
EOF
        
        log_success "Memory baseline established: ${memory_usage_percent}% used (${used_memory}MB/${total_memory}MB)"
        
        # Validate against thresholds
        if (( $(echo "$memory_usage_percent > $MAX_MEMORY_USAGE" | bc -l 2>/dev/null || echo 0) )); then
            log_warning "Memory usage exceeds threshold: ${memory_usage_percent}% > ${MAX_MEMORY_USAGE}%"
        else
            log_success "Memory usage within acceptable range: ${memory_usage_percent}%"
        fi
        
    elif command -v vm_stat >/dev/null 2>&1; then
        # macOS memory measurement
        local vm_info=$(vm_stat)
        local page_size=$(vm_stat | grep "page size" | awk '{print $8}' || echo "4096")
        
        # Simple memory baseline for macOS
        cat > "$memory_baseline_file" << EOF
timestamp=$(date +%s)
date=$(date)
vm_stat_output="$vm_info"
page_size=${page_size}
EOF
        
        log_success "Memory baseline established (macOS vm_stat)"
    else
        log_warning "No memory measurement tools available"
    fi
}

measure_disk_baseline() {
    log_info "Measuring disk I/O baseline..."
    
    local disk_baseline_file="$BASELINE_DIR/disk_baseline.txt"
    
    # Disk usage
    if command -v df >/dev/null 2>&1; then
        local disk_usage=$(df -h / | tail -1)
        local disk_used_percent=$(echo "$disk_usage" | awk '{print $5}' | sed 's/%//')
        local disk_available=$(echo "$disk_usage" | awk '{print $4}')
        local disk_total=$(echo "$disk_usage" | awk '{print $2}')
        
        log_success "Disk usage: ${disk_used_percent}% used (${disk_available} available of ${disk_total})"
        
        # Validate disk usage
        if [[ $disk_used_percent -gt $MAX_DISK_USAGE ]]; then
            log_warning "Disk usage exceeds threshold: ${disk_used_percent}% > ${MAX_DISK_USAGE}%"
        else
            log_success "Disk usage within acceptable range: ${disk_used_percent}%"
        fi
    fi
    
    # Disk I/O performance
    local io_test_file="/tmp/io_test_$(date +%s).dat"
    local write_speed=""
    local read_speed=""
    
    if command -v dd >/dev/null 2>&1; then
        log_info "Performing disk I/O test..."
        
        # Test write speed
        local write_start=$(date +%s.%N 2>/dev/null || date +%s)
        if dd if=/dev/zero of="$io_test_file" bs=1M count=100 2>/dev/null; then
            local write_end=$(date +%s.%N 2>/dev/null || date +%s)
            local write_duration=$(echo "$write_end - $write_start" | bc 2>/dev/null || echo "1")
            write_speed=$(echo "scale=2; 100 / $write_duration" | bc 2>/dev/null || echo "0")
            log_info "Disk write speed: ${write_speed} MB/s"
        fi
        
        # Test read speed
        if [[ -f "$io_test_file" ]]; then
            local read_start=$(date +%s.%N 2>/dev/null || date +%s)
            if dd if="$io_test_file" of=/dev/null bs=1M 2>/dev/null; then
                local read_end=$(date +%s.%N 2>/dev/null || date +%s)
                local read_duration=$(echo "$read_end - $read_start" | bc 2>/dev/null || echo "1")
                read_speed=$(echo "scale=2; 100 / $read_duration" | bc 2>/dev/null || echo "0")
                log_info "Disk read speed: ${read_speed} MB/s"
            fi
            
            # Cleanup
            rm -f "$io_test_file"
        fi
    fi
    
    # Save baseline
    cat > "$disk_baseline_file" << EOF
timestamp=$(date +%s)
date=$(date)
disk_usage_percent=${disk_used_percent:-0}
disk_available=${disk_available:-unknown}
disk_total=${disk_total:-unknown}
write_speed_mbps=${write_speed:-0}
read_speed_mbps=${read_speed:-0}
EOF
    
    log_success "Disk baseline established"
}

measure_network_baseline() {
    log_info "Measuring network baseline..."
    
    local network_baseline_file="$BASELINE_DIR/network_baseline.txt"
    
    # Network interface statistics
    local network_stats=""
    
    if command -v ip >/dev/null 2>&1; then
        network_stats=$(ip -s link show)
    elif command -v ifconfig >/dev/null 2>&1; then
        network_stats=$(ifconfig)
    fi
    
    # Network connectivity test
    local ping_results=""
    local dns_resolution_time=""
    
    if command -v ping >/dev/null 2>&1; then
        log_info "Testing network connectivity..."
        
        # Test ping to Google DNS
        local ping_output=$(ping -c 5 8.8.8.8 2>/dev/null || echo "")
        if [[ -n "$ping_output" ]]; then
            ping_results=$(echo "$ping_output" | grep "avg" | awk '{print $4}' | cut -d'/' -f2)
            log_info "Average ping time to 8.8.8.8: ${ping_results}ms"
        fi
    fi
    
    # DNS resolution test
    if command -v nslookup >/dev/null 2>&1; then
        local dns_start=$(date +%s.%N 2>/dev/null || date +%s)
        if nslookup google.com >/dev/null 2>&1; then
            local dns_end=$(date +%s.%N 2>/dev/null || date +%s)
            dns_resolution_time=$(echo "scale=0; ($dns_end - $dns_start) * 1000" | bc 2>/dev/null || echo "0")
            log_info "DNS resolution time: ${dns_resolution_time}ms"
        fi
    fi
    
    # Save baseline
    cat > "$network_baseline_file" << EOF
timestamp=$(date +%s)
date=$(date)
ping_avg_ms=${ping_results:-0}
dns_resolution_ms=${dns_resolution_time:-0}
network_stats="$network_stats"
EOF
    
    log_success "Network baseline established"
}

measure_process_baseline() {
    log_info "Measuring process baseline..."
    
    local process_baseline_file="$BASELINE_DIR/process_baseline.txt"
    
    # Process count
    local total_processes=$(ps aux | wc -l)
    
    # Load average
    local load_average=""
    if command -v uptime >/dev/null 2>&1; then
        load_average=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    fi
    
    # Top processes by CPU
    local top_cpu_processes=""
    if command -v ps >/dev/null 2>&1; then
        top_cpu_processes=$(ps aux --sort=-%cpu | head -10 2>/dev/null || ps aux | head -10)
    fi
    
    # Top processes by memory
    local top_memory_processes=""
    if command -v ps >/dev/null 2>&1; then
        top_memory_processes=$(ps aux --sort=-%mem | head -10 2>/dev/null || ps aux | head -10)
    fi
    
    # Save baseline
    cat > "$process_baseline_file" << EOF
timestamp=$(date +%s)
date=$(date)
total_processes=${total_processes}
load_average=${load_average:-0}
top_cpu_processes="$top_cpu_processes"
top_memory_processes="$top_memory_processes"
EOF
    
    log_success "Process baseline established: ${total_processes} processes, load average: ${load_average:-unknown}"
}

# Application performance baseline functions
establish_application_baseline() {
    log_info "Establishing application performance baseline..."
    
    local domain="${1:-localhost:3000}"
    
    # Application response time baseline
    measure_response_time_baseline "$domain"
    
    # Application throughput baseline
    measure_throughput_baseline "$domain"
    
    # Application resource usage baseline
    measure_application_resources
    
    # Database performance baseline
    measure_database_baseline
    
    # API endpoint performance baseline
    measure_api_performance "$domain"
}

measure_response_time_baseline() {
    local domain="$1"
    
    log_info "Measuring application response time baseline..."
    
    local response_baseline_file="$BASELINE_DIR/response_time_baseline.txt"
    
    # Test endpoints
    local endpoints=(
        "http://$domain"
        "http://$domain/api/health"
        "http://$domain/login"
        "http://$domain/dashboard"
    )
    
    local endpoint_results=()
    
    for endpoint in "${endpoints[@]}"; do
        if command -v curl >/dev/null 2>&1; then
            log_info "Testing response time for: $endpoint"
            
            local response_times=()
            local successful_requests=0
            local total_requests=5
            
            for i in $(seq 1 $total_requests); do
                local response_time=$(curl -s -o /dev/null -w "%{time_total}" --connect-timeout 10 "$endpoint" 2>/dev/null)
                local response_code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 "$endpoint" 2>/dev/null)
                
                if [[ "$response_code" =~ ^[23] ]]; then
                    response_times+=("$response_time")
                    ((successful_requests++))
                fi
                
                sleep 1
            done
            
            if [[ ${#response_times[@]} -gt 0 ]]; then
                # Calculate statistics
                local total_time=0
                local max_time=0
                local min_time=999
                
                for time in "${response_times[@]}"; do
                    total_time=$(echo "$total_time + $time" | bc 2>/dev/null || echo "$total_time")
                    
                    if (( $(echo "$time > $max_time" | bc -l 2>/dev/null || echo 0) )); then
                        max_time="$time"
                    fi
                    
                    if (( $(echo "$time < $min_time" | bc -l 2>/dev/null || echo 0) )); then
                        min_time="$time"
                    fi
                done
                
                local avg_time=$(echo "scale=3; $total_time / ${#response_times[@]}" | bc 2>/dev/null || echo "0")
                local avg_time_ms=$(echo "scale=0; $avg_time * 1000" | bc 2>/dev/null || echo "0")
                local success_rate=$(echo "scale=2; ($successful_requests * 100) / $total_requests" | bc 2>/dev/null || echo "0")
                
                endpoint_results+=("$endpoint:$avg_time_ms:$max_time:$min_time:$success_rate")
                
                log_info "  Avg: ${avg_time_ms}ms, Max: $(echo "$max_time * 1000" | bc 2>/dev/null || echo 0)ms, Success: ${success_rate}%"
                
                # Validate response time
                if [[ $avg_time_ms -gt $MAX_RESPONSE_TIME ]]; then
                    log_warning "Response time exceeds threshold for $endpoint: ${avg_time_ms}ms > ${MAX_RESPONSE_TIME}ms"
                else
                    log_success "Response time within acceptable range for $endpoint: ${avg_time_ms}ms"
                fi
            else
                log_warning "No successful responses from: $endpoint"
                endpoint_results+=("$endpoint:0:0:0:0")
            fi
        fi
    done
    
    # Save baseline
    cat > "$response_baseline_file" << EOF
timestamp=$(date +%s)
date=$(date)
domain=${domain}
EOF
    
    for result in "${endpoint_results[@]}"; do
        IFS=':' read -r endpoint avg_time max_time min_time success_rate <<< "$result"
        cat >> "$response_baseline_file" << EOF
endpoint=${endpoint}
avg_response_time_ms=${avg_time}
max_response_time_ms=${max_time}
min_response_time_ms=${min_time}
success_rate_percent=${success_rate}
---
EOF
    done
    
    log_success "Response time baseline established"
}

measure_throughput_baseline() {
    local domain="$1"
    
    log_info "Measuring application throughput baseline..."
    
    local throughput_baseline_file="$BASELINE_DIR/throughput_baseline.txt"
    
    # Simple throughput test
    local test_endpoint="http://$domain/api/health"
    
    if command -v curl >/dev/null 2>&1; then
        log_info "Performing throughput test on: $test_endpoint"
        
        local concurrent_users=5
        local test_duration=30  # seconds
        local request_count=0
        local start_time=$(date +%s)
        local end_time=$((start_time + test_duration))
        
        # Run concurrent requests
        local pids=()
        for i in $(seq 1 $concurrent_users); do
            (
                while [[ $(date +%s) -lt $end_time ]]; do
                    curl -s -o /dev/null "$test_endpoint" >/dev/null 2>&1
                    echo "1" >> "/tmp/throughput_test_$$"
                done
            ) &
            pids+=($!)
        done
        
        # Wait for test completion
        sleep $test_duration
        
        # Kill background processes
        for pid in "${pids[@]}"; do
            kill $pid 2>/dev/null || true
        done
        
        # Count requests
        if [[ -f "/tmp/throughput_test_$$" ]]; then
            request_count=$(wc -l < "/tmp/throughput_test_$$")
            rm -f "/tmp/throughput_test_$$"
        fi
        
        local requests_per_second=$(echo "scale=2; $request_count / $test_duration" | bc 2>/dev/null || echo "0")
        
        log_info "Throughput test results: $request_count requests in ${test_duration}s = ${requests_per_second} req/s"
        
        # Save baseline
        cat > "$throughput_baseline_file" << EOF
timestamp=$(date +%s)
date=$(date)
test_endpoint=${test_endpoint}
test_duration_seconds=${test_duration}
concurrent_users=${concurrent_users}
total_requests=${request_count}
requests_per_second=${requests_per_second}
EOF
        
        # Validate throughput
        if (( $(echo "$requests_per_second < $MIN_REQUESTS_PER_SECOND" | bc -l 2>/dev/null || echo 0) )); then
            log_warning "Throughput below minimum threshold: ${requests_per_second} < ${MIN_REQUESTS_PER_SECOND} req/s"
        else
            log_success "Throughput meets minimum requirements: ${requests_per_second} req/s"
        fi
        
        log_success "Throughput baseline established"
    else
        log_warning "curl not available for throughput testing"
    fi
}

measure_application_resources() {
    log_info "Measuring application resource usage baseline..."
    
    local app_resources_file="$BASELINE_DIR/application_resources_baseline.txt"
    
    # Find application processes
    local app_processes=()
    
    # Look for Node.js processes (Next.js application)
    if pgrep -f "node.*next" >/dev/null 2>&1; then
        app_processes+=($(pgrep -f "node.*next"))
    fi
    
    # Look for general Node.js processes
    if pgrep node >/dev/null 2>&1; then
        app_processes+=($(pgrep node))
    fi
    
    # Look for Docker containers running the application
    if command -v docker >/dev/null 2>&1; then
        local container_ids=($(docker ps --format "table {{.ID}}" --filter "name=hey-peter" 2>/dev/null | tail -n +2 || true))
        
        if [[ ${#container_ids[@]} -gt 0 ]]; then
            log_info "Found application containers: ${#container_ids[@]}"
            
            for container_id in "${container_ids[@]}"; do
                local container_stats=$(docker stats --no-stream --format "table {{.CPUPerc}}\t{{.MemUsage}}" "$container_id" 2>/dev/null | tail -1)
                log_info "Container $container_id stats: $container_stats"
            done
        fi
    fi
    
    if [[ ${#app_processes[@]} -gt 0 ]]; then
        log_success "Found ${#app_processes[@]} application processes"
        
        local total_cpu=0
        local total_memory=0
        
        for pid in "${app_processes[@]}"; do
            if ps -p "$pid" >/dev/null 2>&1; then
                local process_info=$(ps -p "$pid" -o pid,pcpu,pmem,comm --no-headers 2>/dev/null || true)
                if [[ -n "$process_info" ]]; then
                    local cpu_usage=$(echo "$process_info" | awk '{print $2}')
                    local mem_usage=$(echo "$process_info" | awk '{print $3}')
                    
                    total_cpu=$(echo "$total_cpu + $cpu_usage" | bc 2>/dev/null || echo "$total_cpu")
                    total_memory=$(echo "$total_memory + $mem_usage" | bc 2>/dev/null || echo "$total_memory")
                    
                    log_info "Process $pid: CPU=${cpu_usage}%, Memory=${mem_usage}%"
                fi
            fi
        done
        
        # Save baseline
        cat > "$app_resources_file" << EOF
timestamp=$(date +%s)
date=$(date)
process_count=${#app_processes[@]}
total_cpu_usage=${total_cpu}
total_memory_usage=${total_memory}
process_ids=${app_processes[*]}
EOF
        
        log_success "Application resource baseline established: CPU=${total_cpu}%, Memory=${total_memory}%"
    else
        log_warning "No application processes found"
    fi
}

measure_database_baseline() {
    log_info "Measuring database performance baseline..."
    
    local db_baseline_file="$BASELINE_DIR/database_baseline.txt"
    
    # Get database connection
    local db_url=""
    if [[ -n "${DATABASE_URL:-}" ]]; then
        db_url="$DATABASE_URL"
    elif [[ -n "${SUPABASE_DB_URL:-}" ]]; then
        db_url="$SUPABASE_DB_URL"
    else
        log_warning "No database connection URL found"
        return 0
    fi
    
    if command -v psql >/dev/null 2>&1; then
        log_info "Testing database connectivity and performance..."
        
        # Test basic connectivity
        local connect_start=$(date +%s.%N 2>/dev/null || date +%s)
        if psql "$db_url" -c "SELECT 1;" >/dev/null 2>&1; then
            local connect_end=$(date +%s.%N 2>/dev/null || date +%s)
            local connect_time=$(echo "scale=0; ($connect_end - $connect_start) * 1000" | bc 2>/dev/null || echo "0")
            
            log_success "Database connection successful (${connect_time}ms)"
            
            # Test simple query performance
            local query_start=$(date +%s.%N 2>/dev/null || date +%s)
            local table_count=$(psql "$db_url" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
            local query_end=$(date +%s.%N 2>/dev/null || date +%s)
            local query_time=$(echo "scale=0; ($query_end - $query_start) * 1000" | bc 2>/dev/null || echo "0")
            
            log_info "Database query performance: ${query_time}ms for table count query"
            log_info "Database contains $table_count public tables"
            
            # Get database size
            local db_size=$(psql "$db_url" -t -c "SELECT pg_size_pretty(pg_database_size(current_database()));" 2>/dev/null | tr -d ' ')
            log_info "Database size: $db_size"
            
            # Save baseline
            cat > "$db_baseline_file" << EOF
timestamp=$(date +%s)
date=$(date)
connection_time_ms=${connect_time}
query_time_ms=${query_time}
table_count=${table_count}
database_size=${db_size}
EOF
            
            log_success "Database baseline established"
        else
            log_error "Database connection failed"
        fi
    else
        log_warning "psql not available for database testing"
    fi
}

measure_api_performance() {
    local domain="$1"
    
    log_info "Measuring API endpoint performance baseline..."
    
    local api_baseline_file="$BASELINE_DIR/api_baseline.txt"
    
    # Test various API endpoints
    local api_endpoints=(
        "/api/health"
        "/api/metrics"
        "/api/auth/session"
    )
    
    local api_results=()
    
    for endpoint in "${api_endpoints[@]}"; do
        local full_url="http://$domain$endpoint"
        
        if command -v curl >/dev/null 2>&1; then
            log_info "Testing API endpoint: $endpoint"
            
            local start_time=$(date +%s.%N 2>/dev/null || date +%s)
            local response_code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 "$full_url" 2>/dev/null)
            local end_time=$(date +%s.%N 2>/dev/null || date +%s)
            
            local response_time=$(echo "scale=0; ($end_time - $start_time) * 1000" | bc 2>/dev/null || echo "0")
            
            api_results+=("$endpoint:$response_code:$response_time")
            
            case "$response_code" in
                200)
                    log_success "API endpoint $endpoint: ${response_time}ms (HTTP $response_code)"
                    ;;
                404)
                    log_info "API endpoint $endpoint: Not implemented (HTTP $response_code)"
                    ;;
                *)
                    log_warning "API endpoint $endpoint: ${response_time}ms (HTTP $response_code)"
                    ;;
            esac
        fi
    done
    
    # Save baseline
    cat > "$api_baseline_file" << EOF
timestamp=$(date +%s)
date=$(date)
domain=${domain}
EOF
    
    for result in "${api_results[@]}"; do
        IFS=':' read -r endpoint response_code response_time <<< "$result"
        cat >> "$api_baseline_file" << EOF
api_endpoint=${endpoint}
response_code=${response_code}
response_time_ms=${response_time}
---
EOF
    done
    
    log_success "API performance baseline established"
}

# Load testing functions
run_load_tests() {
    log_info "Running load tests to establish performance under stress..."
    
    local domain="${1:-localhost:3000}"
    
    # Basic load test
    run_basic_load_test "$domain"
    
    # Spike test
    run_spike_test "$domain"
    
    # Endurance test (simplified)
    run_endurance_test "$domain"
}

run_basic_load_test() {
    local domain="$1"
    
    log_info "Running basic load test..."
    
    local load_test_file="$BASELINE_DIR/load_test_baseline.txt"
    local test_endpoint="http://$domain"
    
    if command -v curl >/dev/null 2>&1; then
        local concurrent_users=10
        local test_duration=60  # seconds
        local request_count=0
        local error_count=0
        local response_times=()
        
        log_info "Load test: $concurrent_users users for ${test_duration}s on $test_endpoint"
        
        local start_time=$(date +%s)
        local end_time=$((start_time + test_duration))
        
        # Run concurrent requests
        local pids=()
        for i in $(seq 1 $concurrent_users); do
            (
                while [[ $(date +%s) -lt $end_time ]]; do
                    local req_start=$(date +%s.%N 2>/dev/null || date +%s)
                    local response_code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$test_endpoint" 2>/dev/null)
                    local req_end=$(date +%s.%N 2>/dev/null || date +%s)
                    local req_time=$(echo "scale=0; ($req_end - $req_start) * 1000" | bc 2>/dev/null || echo "0")
                    
                    echo "1" >> "/tmp/load_test_requests_$$"
                    echo "$req_time" >> "/tmp/load_test_times_$$"
                    
                    if [[ "$response_code" =~ ^[45] ]]; then
                        echo "1" >> "/tmp/load_test_errors_$$"
                    fi
                    
                    sleep 0.1
                done
            ) &
            pids+=($!)
        done
        
        # Wait for test completion
        sleep $test_duration
        
        # Kill background processes
        for pid in "${pids[@]}"; do
            kill $pid 2>/dev/null || true
        done
        
        # Collect results
        if [[ -f "/tmp/load_test_requests_$$" ]]; then
            request_count=$(wc -l < "/tmp/load_test_requests_$$")
            rm -f "/tmp/load_test_requests_$$"
        fi
        
        if [[ -f "/tmp/load_test_errors_$$" ]]; then
            error_count=$(wc -l < "/tmp/load_test_errors_$$")
            rm -f "/tmp/load_test_errors_$$"
        fi
        
        if [[ -f "/tmp/load_test_times_$$" ]]; then
            local total_time=0
            local max_time=0
            local count=0
            
            while read -r time; do
                total_time=$(echo "$total_time + $time" | bc 2>/dev/null || echo "$total_time")
                if (( $(echo "$time > $max_time" | bc -l 2>/dev/null || echo 0) )); then
                    max_time="$time"
                fi
                ((count++))
            done < "/tmp/load_test_times_$$"
            
            local avg_time=$(echo "scale=2; $total_time / $count" | bc 2>/dev/null || echo "0")
            
            rm -f "/tmp/load_test_times_$$"
        fi
        
        local requests_per_second=$(echo "scale=2; $request_count / $test_duration" | bc 2>/dev/null || echo "0")
        local error_rate=$(echo "scale=2; ($error_count * 100) / $request_count" | bc 2>/dev/null || echo "0")
        
        # Save results
        cat > "$load_test_file" << EOF
timestamp=$(date +%s)
date=$(date)
test_type=basic_load
concurrent_users=${concurrent_users}
test_duration_seconds=${test_duration}
total_requests=${request_count}
error_count=${error_count}
requests_per_second=${requests_per_second}
error_rate_percent=${error_rate}
avg_response_time_ms=${avg_time:-0}
max_response_time_ms=${max_time:-0}
EOF
        
        log_success "Load test completed: ${requests_per_second} req/s, ${error_rate}% error rate"
        
        # Validate results
        if (( $(echo "$error_rate > 5" | bc -l 2>/dev/null || echo 0) )); then
            log_warning "High error rate during load test: ${error_rate}%"
        else
            log_success "Error rate within acceptable range: ${error_rate}%"
        fi
        
    else
        log_warning "curl not available for load testing"
    fi
}

run_spike_test() {
    local domain="$1"
    
    log_info "Running spike test..."
    
    local spike_test_file="$BASELINE_DIR/spike_test_baseline.txt"
    local test_endpoint="http://$domain/api/health"
    
    if command -v curl >/dev/null 2>&1; then
        # Sudden spike in traffic
        local spike_users=20
        local spike_duration=10  # seconds
        
        log_info "Spike test: $spike_users users for ${spike_duration}s"
        
        local start_time=$(date +%s)
        local end_time=$((start_time + spike_duration))
        local request_count=0
        local error_count=0
        
        # Create sudden load
        local pids=()
        for i in $(seq 1 $spike_users); do
            (
                while [[ $(date +%s) -lt $end_time ]]; do
                    local response_code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 "$test_endpoint" 2>/dev/null)
                    echo "1" >> "/tmp/spike_test_requests_$$"
                    
                    if [[ "$response_code" =~ ^[45] ]]; then
                        echo "1" >> "/tmp/spike_test_errors_$$"
                    fi
                done
            ) &
            pids+=($!)
        done
        
        # Wait for spike completion
        sleep $spike_duration
        
        # Kill processes
        for pid in "${pids[@]}"; do
            kill $pid 2>/dev/null || true
        done
        
        # Collect results
        if [[ -f "/tmp/spike_test_requests_$$" ]]; then
            request_count=$(wc -l < "/tmp/spike_test_requests_$$")
            rm -f "/tmp/spike_test_requests_$$"
        fi
        
        if [[ -f "/tmp/spike_test_errors_$$" ]]; then
            error_count=$(wc -l < "/tmp/spike_test_errors_$$")
            rm -f "/tmp/spike_test_errors_$$"
        fi
        
        local requests_per_second=$(echo "scale=2; $request_count / $spike_duration" | bc 2>/dev/null || echo "0")
        local error_rate=$(echo "scale=2; ($error_count * 100) / $request_count" | bc 2>/dev/null || echo "0")
        
        # Save results
        cat > "$spike_test_file" << EOF
timestamp=$(date +%s)
date=$(date)
test_type=spike
concurrent_users=${spike_users}
test_duration_seconds=${spike_duration}
total_requests=${request_count}
error_count=${error_count}
requests_per_second=${requests_per_second}
error_rate_percent=${error_rate}
EOF
        
        log_success "Spike test completed: ${requests_per_second} req/s, ${error_rate}% error rate"
    fi
}

run_endurance_test() {
    local domain="$1"
    
    log_info "Running endurance test (simplified)..."
    
    local endurance_test_file="$BASELINE_DIR/endurance_test_baseline.txt"
    local test_endpoint="http://$domain/api/health"
    
    # Simplified endurance test (shorter duration for validation)
    local endurance_users=5
    local endurance_duration=120  # 2 minutes instead of hours
    
    if command -v curl >/dev/null 2>&1; then
        log_info "Endurance test: $endurance_users users for ${endurance_duration}s"
        
        local start_time=$(date +%s)
        local end_time=$((start_time + endurance_duration))
        local request_count=0
        local error_count=0
        
        # Sustained load
        local pids=()
        for i in $(seq 1 $endurance_users); do
            (
                while [[ $(date +%s) -lt $end_time ]]; do
                    local response_code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$test_endpoint" 2>/dev/null)
                    echo "1" >> "/tmp/endurance_test_requests_$$"
                    
                    if [[ "$response_code" =~ ^[45] ]]; then
                        echo "1" >> "/tmp/endurance_test_errors_$$"
                    fi
                    
                    sleep 1  # Sustained but not aggressive load
                done
            ) &
            pids+=($!)
        done
        
        # Wait for endurance test completion
        sleep $endurance_duration
        
        # Kill processes
        for pid in "${pids[@]}"; do
            kill $pid 2>/dev/null || true
        done
        
        # Collect results
        if [[ -f "/tmp/endurance_test_requests_$$" ]]; then
            request_count=$(wc -l < "/tmp/endurance_test_requests_$$")
            rm -f "/tmp/endurance_test_requests_$$"
        fi
        
        if [[ -f "/tmp/endurance_test_errors_$$" ]]; then
            error_count=$(wc -l < "/tmp/endurance_test_errors_$$")
            rm -f "/tmp/endurance_test_errors_$$"
        fi
        
        local requests_per_second=$(echo "scale=2; $request_count / $endurance_duration" | bc 2>/dev/null || echo "0")
        local error_rate=$(echo "scale=2; ($error_count * 100) / $request_count" | bc 2>/dev/null || echo "0")
        
        # Save results
        cat > "$endurance_test_file" << EOF
timestamp=$(date +%s)
date=$(date)
test_type=endurance
concurrent_users=${endurance_users}
test_duration_seconds=${endurance_duration}
total_requests=${request_count}
error_count=${error_count}
requests_per_second=${requests_per_second}
error_rate_percent=${error_rate}
EOF
        
        log_success "Endurance test completed: ${requests_per_second} req/s, ${error_rate}% error rate"
    fi
}

# Baseline comparison functions
compare_with_previous_baseline() {
    log_info "Comparing with previous baselines..."
    
    # Find previous baseline files
    local previous_baselines=($(find "$BASELINE_DIR" -name "*_baseline.txt" -type f 2>/dev/null | sort))
    
    if [[ ${#previous_baselines[@]} -gt 0 ]]; then
        log_info "Found ${#previous_baselines[@]} baseline files for comparison"
        
        for baseline_file in "${previous_baselines[@]}"; do
            local baseline_name=$(basename "$baseline_file" _baseline.txt)
            log_info "Baseline available: $baseline_name"
        done
    else
        log_info "No previous baselines found - this will be the initial baseline"
    fi
}

# Report generation
generate_performance_report() {
    log_info "Generating performance validation report..."
    
    local total_checks=$((PASSED_CHECKS + FAILED_CHECKS + WARNING_CHECKS))
    
    cat >> "$VALIDATION_LOG" << EOF

================================================================================
                       PERFORMANCE VALIDATION SUMMARY
================================================================================

Validation completed at: $(date)
Total checks performed: $total_checks

Results:
  ✓ Passed:   $PASSED_CHECKS
  ⚠ Warnings: $WARNING_CHECKS  
  ✗ Failed:   $FAILED_CHECKS

Performance Baselines Established:
  - System Resource Usage
  - Application Response Times
  - Application Throughput
  - Database Performance
  - API Endpoint Performance
  - Load Test Results

Baseline files saved to: $BASELINE_DIR

EOF

    # Performance recommendations
    if [[ $FAILED_CHECKS -gt 0 ]] || [[ $WARNING_CHECKS -gt 0 ]]; then
        cat >> "$VALIDATION_LOG" << EOF

PERFORMANCE RECOMMENDATIONS:
- Address all failed performance checks before deployment
- Review warnings and optimize configurations where possible
- Monitor performance metrics continuously in production
- Set up alerting for performance degradation
- Implement performance budgets for key metrics
- Regular load testing to ensure performance stability
- Database query optimization and indexing
- CDN implementation for static assets
- Application-level caching strategies

PERFORMANCE THRESHOLDS USED:
- Max Response Time: ${MAX_RESPONSE_TIME}ms
- Min Requests/Second: ${MIN_REQUESTS_PER_SECOND}
- Max CPU Usage: ${MAX_CPU_USAGE}%
- Max Memory Usage: ${MAX_MEMORY_USAGE}%
- Max Disk Usage: ${MAX_DISK_USAGE}%

EOF
    fi

    # List baseline files
    local baseline_files=($(find "$BASELINE_DIR" -name "*.txt" -type f 2>/dev/null))
    if [[ ${#baseline_files[@]} -gt 0 ]]; then
        cat >> "$VALIDATION_LOG" << EOF

BASELINE FILES CREATED:
EOF
        for file in "${baseline_files[@]}"; do
            local file_size=$(du -h "$file" | cut -f1)
            echo "  - $(basename "$file") ($file_size)" >> "$VALIDATION_LOG"
        done
    fi

    if [[ $FAILED_CHECKS -eq 0 ]]; then
        log_success "Performance validation completed successfully!"
        if [[ $WARNING_CHECKS -gt 0 ]]; then
            log_warning "Please review $WARNING_CHECKS warning(s) for optimal performance"
        fi
        echo "0" # Exit code for success
    else
        log_error "Performance validation failed with $FAILED_CHECKS critical issue(s)"
        log_error "Please address all failed checks before proceeding with deployment"
        echo "1" # Exit code for failure
    fi
}

# Main execution
show_usage() {
    cat << EOF
Usage: $0 [domain] [options]

Arguments:
  domain       Domain/URL to test (default: localhost:3000)

Options:
  --system     Only establish system resource baseline
  --app        Only establish application performance baseline
  --load       Only run load tests
  --compare    Only compare with previous baselines
  --all        Run all performance tests (default)

Examples:
  $0                                    # Test localhost:3000
  $0 heypeter-academy.com              # Test production domain
  $0 localhost:3000 --system          # Only system baseline
  $0 production.example.com --load     # Only load tests

EOF
}

main() {
    local domain="${1:-localhost:3000}"
    local system_only=false
    local app_only=false
    local load_only=false
    local compare_only=false
    local run_all=true
    
    # Parse options
    shift 2>/dev/null || true
    while [[ $# -gt 0 ]]; do
        case $1 in
            --system)
                system_only=true
                run_all=false
                shift
                ;;
            --app)
                app_only=true
                run_all=false
                shift
                ;;
            --load)
                load_only=true
                run_all=false
                shift
                ;;
            --compare)
                compare_only=true
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
    
    log_info "Starting performance validation for: $domain"
    log_info "Validation log: $VALIDATION_LOG"
    log_info "Baseline directory: $BASELINE_DIR"
    
    # Run selected validations
    if [[ "$system_only" == true ]] || [[ "$run_all" == true ]]; then
        establish_system_baseline
    fi
    
    if [[ "$app_only" == true ]] || [[ "$run_all" == true ]]; then
        establish_application_baseline "$domain"
    fi
    
    if [[ "$load_only" == true ]] || [[ "$run_all" == true ]]; then
        run_load_tests "$domain"
    fi
    
    if [[ "$compare_only" == true ]] || [[ "$run_all" == true ]]; then
        compare_with_previous_baseline
    fi
    
    # Generate final report
    local exit_code=$(generate_performance_report)
    
    log_info "Full validation log available at: $VALIDATION_LOG"
    log_info "Performance baselines saved to: $BASELINE_DIR"
    
    exit "$exit_code"
}

# Run main function with all arguments
main "$@"