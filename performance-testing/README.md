# HeyPeter Academy Performance Testing Suite

Comprehensive performance testing and optimization suite for the HeyPeter Academy Learning Management System.

## Overview

This performance testing suite provides:
- Load testing for different user types (students, teachers, admins)
- Database performance testing under load
- API endpoint performance benchmarking
- Frontend performance testing with real user scenarios
- Memory leak detection and optimization
- Bundle size analysis and optimization
- Performance regression testing
- Scalability testing for concurrent users

## Quick Start

```bash
# Install dependencies
npm install

# Run full performance suite
npm run full-performance-suite

# Generate performance report
npm run generate-report

# Set up performance baselines
npm run baseline-setup
```

## Test Categories

### 1. Load Testing (K6)
- **Student Load Testing**: Simulates student interactions (booking classes, viewing progress)
- **Teacher Load Testing**: Simulates teacher workflows (updating availability, grading)
- **Admin Load Testing**: Simulates admin operations (user management, analytics)
- **Mixed User Load**: Realistic mix of all user types

### 2. Database Performance Testing
- Connection pool stress testing
- Query performance under load
- Transaction throughput testing
- Database lock detection
- Index performance analysis

### 3. API Benchmarking
- Endpoint response time measurement
- Throughput testing
- Error rate monitoring
- Rate limiting validation
- Authentication performance

### 4. Frontend Performance Testing
- Lighthouse performance audits
- Real User Monitoring (RUM) simulation
- Critical rendering path analysis
- JavaScript execution performance
- Resource loading optimization

### 5. Memory Leak Detection
- Node.js heap analysis
- Browser memory profiling
- Memory usage patterns
- Garbage collection optimization
- Long-running process monitoring

### 6. Bundle Analysis
- JavaScript bundle size tracking
- Code splitting effectiveness
- Tree shaking optimization
- Lazy loading impact analysis
- Third-party library audit

### 7. Regression Testing
- Performance baseline comparison
- Automated performance CI/CD checks
- Historical performance tracking
- Alert system for performance degradation

### 8. Scalability Testing
- Concurrent user simulation
- Resource utilization monitoring
- Breaking point identification
- Auto-scaling trigger testing

## Configuration

### Environment Variables
```env
# Application URLs
BASE_URL=http://localhost:3000
API_BASE_URL=http://localhost:3000/api

# Database Connection
DATABASE_URL=postgresql://postgres:password@localhost:5432/postgres

# Test Configuration
MAX_CONCURRENT_USERS=1000
TEST_DURATION=5m
RAMP_UP_TIME=30s

# Monitoring
PROMETHEUS_URL=http://localhost:9090
GRAFANA_URL=http://localhost:3001
```

### Test Parameters
```javascript
// Load testing configuration
export const loadTestConfig = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up
    { duration: '2m', target: 50 },    // Stay at 50 users
    { duration: '1m', target: 100 },   // Ramp to 100 users
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.1'],    // Error rate under 10%
  }
};
```

## Usage Examples

### Running Specific Tests

```bash
# Load test for student scenarios
npm run load-test:students

# Database performance testing
npm run db-performance

# API benchmarking
npm run api-benchmark

# Frontend performance audit
npm run frontend-performance

# Memory leak detection
npm run memory-leak

# Bundle size analysis
npm run bundle-analysis

# Scalability testing
npm run scalability-test
```

### Custom Test Execution

```bash
# Run load test with custom parameters
k6 run --vus 50 --duration 5m tests/load-testing/scenarios/student-load.js

# Database test with specific connection count
DATABASE_CONNECTIONS=100 npm run db-performance

# Frontend test for specific pages
PAGES="dashboard,student-profile,teacher-schedule" npm run frontend-performance
```

## Performance Metrics

### Key Performance Indicators (KPIs)
- **Response Time**: P50, P95, P99 percentiles
- **Throughput**: Requests per second
- **Error Rate**: Percentage of failed requests
- **Resource Utilization**: CPU, Memory, Database connections
- **User Experience**: Time to Interactive, First Contentful Paint

### Performance Thresholds
```javascript
export const performanceThresholds = {
  api: {
    responseTime: {
      p50: 200,  // 50th percentile under 200ms
      p95: 500,  // 95th percentile under 500ms
      p99: 1000  // 99th percentile under 1s
    },
    errorRate: 0.01,  // Error rate under 1%
    throughput: 100   // Minimum 100 RPS
  },
  frontend: {
    fcp: 1.5,    // First Contentful Paint under 1.5s
    lcp: 2.5,    // Largest Contentful Paint under 2.5s
    cls: 0.1,    // Cumulative Layout Shift under 0.1
    fid: 100     // First Input Delay under 100ms
  },
  database: {
    connectionTime: 50,    // Connection under 50ms
    queryTime: 100,        // Query execution under 100ms
    lockWaitTime: 10       // Lock wait time under 10ms
  }
};
```

## Monitoring and Alerting

### Real-time Monitoring
- Performance metrics dashboard
- Real-time alerts for threshold breaches
- Historical performance trends
- Automated performance reports

### Integration with Monitoring Stack
- Prometheus metrics collection
- Grafana dashboards
- AlertManager notifications
- Custom performance webhooks

## CI/CD Integration

### GitHub Actions Workflow
```yaml
name: Performance Testing
on:
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM

jobs:
  performance-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Install dependencies
        run: cd performance-testing && npm install
      - name: Run performance tests
        run: cd performance-testing && npm run full-performance-suite
      - name: Generate report
        run: cd performance-testing && npm run generate-report
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: performance-report
          path: performance-testing/reports/
```

## Best Practices

### Test Environment
- Use production-like data volumes
- Test with realistic network conditions
- Isolate performance testing environment
- Use consistent hardware specifications

### Test Methodology
- Establish performance baselines
- Run tests multiple times for consistency
- Monitor resource utilization during tests
- Document environmental factors

### Performance Optimization
- Profile before optimizing
- Focus on bottlenecks with highest impact
- Measure optimization effectiveness
- Maintain performance regression tests

## Troubleshooting

### Common Issues
1. **High response times**: Check database queries, API endpoints, network latency
2. **Memory leaks**: Review event listeners, closures, global variables
3. **High error rates**: Validate input data, check rate limiting, review error handling
4. **Resource exhaustion**: Monitor database connections, file handles, memory usage

### Debug Commands
```bash
# Verbose K6 output
k6 run --verbose tests/load-testing/scenarios/main.js

# Database connection debugging
DEBUG=pg:* npm run db-performance

# Memory profiling
node --inspect tests/memory-leak/memory-detection.js
```

## Contributing

1. Add new test scenarios in appropriate directories
2. Update performance thresholds based on requirements
3. Document new metrics and KPIs
4. Ensure tests are environment-agnostic
5. Add appropriate error handling and logging

## Support

For questions or issues with the performance testing suite:
- Check the troubleshooting section
- Review test logs in `reports/` directory
- Monitor real-time metrics in Grafana dashboards
- Contact the development team for assistance