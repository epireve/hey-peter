const autocannon = require('autocannon');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const apiConfig = require('./api-config');

class APIPerformanceSuite {
  constructor() {
    this.authTokens = new Map();
    this.metrics = {
      tests: [],
      summary: {
        totalRequests: 0,
        totalErrors: 0,
        avgResponseTime: 0,
        throughput: 0,
      },
      thresholdViolations: [],
    };
    this.startTime = null;
  }

  async initialize() {
    console.log('Initializing API performance suite...');
    
    // Verify API accessibility
    await this.verifyAPIAccessibility();
    
    // Authenticate test users
    await this.authenticateTestUsers();
    
    console.log('API performance suite initialized successfully');
  }

  async verifyAPIAccessibility() {
    try {
      const response = await fetch(`${apiConfig.baseURL}/api/health`, {
        timeout: 10000,
      });
      
      if (!response.ok) {
        throw new Error(`API health check failed with status: ${response.status}`);
      }
      
      console.log('API accessibility verified');
    } catch (error) {
      throw new Error(`API is not accessible: ${error.message}`);
    }
  }

  async authenticateTestUsers() {
    console.log('Authenticating test users...');
    
    for (const [role, userData] of Object.entries(apiConfig.auth.testUsers)) {
      try {
        const authResponse = await fetch(`${apiConfig.apiBaseURL}${apiConfig.auth.endpoints.login}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: userData.email,
            password: userData.password,
          }),
        });

        if (authResponse.ok) {
          // Extract authentication token/cookies
          const authHeader = authResponse.headers.get('authorization');
          const cookies = authResponse.headers.get('set-cookie');
          
          this.authTokens.set(role, {
            token: authHeader,
            cookies: cookies,
            headers: this.buildAuthHeaders(authHeader, cookies),
          });
          
          console.log(`  ✓ Authenticated ${role} user`);
        } else {
          console.warn(`  ⚠ Failed to authenticate ${role} user: ${authResponse.status}`);
        }
      } catch (error) {
        console.warn(`  ⚠ Authentication error for ${role}: ${error.message}`);
      }
    }
  }

  buildAuthHeaders(token, cookies) {
    const headers = { ...apiConfig.requestConfig.headers };
    
    if (token) {
      headers['Authorization'] = token;
    }
    
    if (cookies) {
      headers['Cookie'] = Array.isArray(cookies) ? cookies.join('; ') : cookies;
    }
    
    return headers;
  }

  async runFullBenchmarkSuite() {
    console.log('Starting API performance benchmark suite...');
    this.startTime = Date.now();

    // Run endpoint-specific benchmarks
    await this.runEndpointBenchmarks();
    
    // Run scenario-based benchmarks
    await this.runScenarioBenchmarks();
    
    // Generate comprehensive report
    const report = this.generateReport();
    
    console.log('API performance benchmark suite completed');
    return report;
  }

  async runEndpointBenchmarks() {
    console.log('Running endpoint-specific benchmarks...');
    
    // Test public endpoints
    await this.benchmarkEndpointGroup('public', apiConfig.endpoints.public);
    
    // Test authenticated endpoints for each role
    for (const role of ['student', 'teacher', 'admin']) {
      if (this.authTokens.has(role)) {
        await this.benchmarkEndpointGroup(role, apiConfig.endpoints[role], role);
      }
    }
  }

  async benchmarkEndpointGroup(groupName, endpoints, authRole = null) {
    console.log(`  Benchmarking ${groupName} endpoints...`);
    
    for (const endpoint of endpoints) {
      await this.benchmarkSingleEndpoint(endpoint, authRole, groupName);
    }
  }

  async benchmarkSingleEndpoint(endpoint, authRole, groupName) {
    console.log(`    Testing: ${endpoint.name}`);
    
    const testConfig = {
      url: `${apiConfig.apiBaseURL}${endpoint.path}`,
      method: endpoint.method,
      duration: apiConfig.testDuration,
      connections: 10,
      headers: authRole ? this.authTokens.get(authRole).headers : apiConfig.requestConfig.headers,
    };

    // Add request body for POST/PUT requests
    if (endpoint.payload && ['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
      testConfig.body = JSON.stringify(this.generateDynamicPayload(endpoint.payload));
    }

    try {
      const result = await autocannon(testConfig);
      
      const testResult = {
        endpoint: endpoint.name,
        group: groupName,
        method: endpoint.method,
        path: endpoint.path,
        authRole: authRole,
        timestamp: new Date().toISOString(),
        metrics: {
          duration: result.duration,
          requests: {
            total: result.requests.total,
            average: result.requests.average,
            mean: result.requests.mean,
            stddev: result.requests.stddev,
            min: result.requests.min,
            max: result.requests.max,
          },
          latency: {
            average: result.latency.average,
            mean: result.latency.mean,
            stddev: result.latency.stddev,
            min: result.latency.min,
            max: result.latency.max,
            p50: result.latency.p50,
            p90: result.latency.p90,
            p95: result.latency.p95,
            p99: result.latency.p99,
          },
          throughput: {
            average: result.throughput.average,
            mean: result.throughput.mean,
            stddev: result.throughput.stddev,
            min: result.throughput.min,
            max: result.throughput.max,
          },
          errors: result.errors,
          statusCodes: result.statusCodeStats,
        },
        thresholds: this.checkThresholds(result, endpoint),
      };

      this.metrics.tests.push(testResult);
      this.updateSummaryMetrics(result);
      
      // Log key metrics
      console.log(`      Avg Response: ${result.latency.average.toFixed(2)}ms`);
      console.log(`      P95 Response: ${result.latency.p95.toFixed(2)}ms`);
      console.log(`      Throughput: ${result.throughput.average.toFixed(2)} req/s`);
      console.log(`      Errors: ${result.errors}`);
      
    } catch (error) {
      console.error(`      Error testing ${endpoint.name}: ${error.message}`);
      
      this.metrics.tests.push({
        endpoint: endpoint.name,
        group: groupName,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  async runScenarioBenchmarks() {
    console.log('Running scenario-based benchmarks...');
    
    for (const [scenarioName, scenarioConfig] of Object.entries(apiConfig.scenarios)) {
      await this.runScenario(scenarioName, scenarioConfig);
    }
  }

  async runScenario(scenarioName, scenarioConfig) {
    console.log(`  Running scenario: ${scenarioName}`);
    
    // Calculate concurrent connections based on user distribution
    const totalConnections = 50; // Base connections for scenario
    const connections = {
      student: Math.floor((totalConnections * scenarioConfig.users.student) / 100),
      teacher: Math.floor((totalConnections * scenarioConfig.users.teacher) / 100),
      admin: Math.floor((totalConnections * scenarioConfig.users.admin) / 100),
    };

    const scenarioPromises = [];

    // Run concurrent tests for each user type
    for (const [role, connectionCount] of Object.entries(connections)) {
      if (connectionCount > 0 && this.authTokens.has(role)) {
        scenarioPromises.push(
          this.runScenarioForRole(scenarioName, role, connectionCount, scenarioConfig)
        );
      }
    }

    const scenarioResults = await Promise.allSettled(scenarioPromises);
    
    // Process scenario results
    const scenarioSummary = {
      name: scenarioName,
      description: scenarioConfig.description,
      duration: scenarioConfig.duration,
      results: scenarioResults.map(result => 
        result.status === 'fulfilled' ? result.value : { error: result.reason.message }
      ),
      timestamp: new Date().toISOString(),
    };

    this.metrics.scenarios = this.metrics.scenarios || [];
    this.metrics.scenarios.push(scenarioSummary);
  }

  async runScenarioForRole(scenarioName, role, connections, scenarioConfig) {
    const endpoints = apiConfig.endpoints[role] || [];
    if (endpoints.length === 0) return null;

    // Select endpoints based on scenario focus
    const selectedEndpoints = this.selectEndpointsForScenario(endpoints, scenarioConfig);
    
    // Create weighted endpoint list
    const weightedEndpoints = [];
    selectedEndpoints.forEach(endpoint => {
      for (let i = 0; i < endpoint.weight; i++) {
        weightedEndpoints.push(endpoint);
      }
    });

    // Run mixed load test
    const testConfig = {
      url: `${apiConfig.apiBaseURL}`, // Base URL, will be modified per request
      method: 'GET', // Default, will be overridden
      duration: scenarioConfig.duration,
      connections: connections,
      headers: this.authTokens.get(role).headers,
      setupClient: (client) => {
        client.setRequests([
          ...weightedEndpoints.map(endpoint => ({
            method: endpoint.method,
            path: endpoint.path,
            headers: endpoint.method === 'POST' || endpoint.method === 'PUT' ? 
              { 'Content-Type': 'application/json' } : {},
            body: endpoint.payload ? 
              JSON.stringify(this.generateDynamicPayload(endpoint.payload)) : undefined,
          }))
        ]);
      },
    };

    try {
      const result = await autocannon(testConfig);
      return {
        role: role,
        connections: connections,
        result: result,
      };
    } catch (error) {
      return {
        role: role,
        connections: connections,
        error: error.message,
      };
    }
  }

  selectEndpointsForScenario(endpoints, scenarioConfig) {
    if (scenarioConfig.focus === 'booking') {
      // Focus on booking-related endpoints
      return endpoints.filter(ep => 
        ep.name.toLowerCase().includes('book') || 
        ep.name.toLowerCase().includes('class') ||
        ep.name.toLowerCase().includes('schedule')
      );
    }
    
    if (scenarioConfig.intensity === 'high') {
      // Focus on high-weight endpoints
      return endpoints.filter(ep => ep.weight >= 8);
    }
    
    // Return all endpoints for normal scenarios
    return endpoints;
  }

  generateDynamicPayload(payload) {
    const generated = {};
    
    for (const [key, value] of Object.entries(payload)) {
      if (value === 'dynamic') {
        // Generate dynamic value based on key name
        if (key.toLowerCase().includes('id')) {
          generated[key] = apiConfig.dataGenerators.classId();
        } else if (key.toLowerCase().includes('date')) {
          generated[key] = apiConfig.dataGenerators.dateTime();
        } else if (key.toLowerCase().includes('rating')) {
          generated[key] = apiConfig.dataGenerators.rating();
        } else {
          generated[key] = `dynamic_${Date.now()}`;
        }
      } else if (typeof value === 'object' && value !== null) {
        generated[key] = this.generateDynamicPayload(value);
      } else {
        generated[key] = value;
      }
    }
    
    return generated;
  }

  checkThresholds(result, endpoint) {
    const violations = [];
    const thresholds = apiConfig.thresholds;
    
    // Check response time thresholds
    if (result.latency.p50 > thresholds.responseTime.p50) {
      violations.push({
        metric: 'P50 Response Time',
        actual: result.latency.p50,
        threshold: thresholds.responseTime.p50,
        severity: 'medium',
      });
    }
    
    if (result.latency.p95 > thresholds.responseTime.p95) {
      violations.push({
        metric: 'P95 Response Time',
        actual: result.latency.p95,
        threshold: thresholds.responseTime.p95,
        severity: 'high',
      });
    }
    
    if (result.latency.p99 > thresholds.responseTime.p99) {
      violations.push({
        metric: 'P99 Response Time',
        actual: result.latency.p99,
        threshold: thresholds.responseTime.p99,
        severity: 'critical',
      });
    }
    
    // Check error rate
    const errorRate = result.errors / result.requests.total;
    if (errorRate > thresholds.errorRate) {
      violations.push({
        metric: 'Error Rate',
        actual: errorRate,
        threshold: thresholds.errorRate,
        severity: 'critical',
      });
    }
    
    // Check throughput
    if (result.throughput.average < thresholds.throughput) {
      violations.push({
        metric: 'Throughput',
        actual: result.throughput.average,
        threshold: thresholds.throughput,
        severity: 'medium',
      });
    }
    
    // Add violations to global list
    violations.forEach(violation => {
      this.metrics.thresholdViolations.push({
        endpoint: endpoint.name,
        ...violation,
      });
    });
    
    return violations;
  }

  updateSummaryMetrics(result) {
    this.metrics.summary.totalRequests += result.requests.total;
    this.metrics.summary.totalErrors += result.errors;
    
    // Update weighted averages
    const testCount = this.metrics.tests.filter(t => !t.error).length;
    this.metrics.summary.avgResponseTime = (
      (this.metrics.summary.avgResponseTime * (testCount - 1) + result.latency.average) / testCount
    );
    this.metrics.summary.throughput = (
      (this.metrics.summary.throughput * (testCount - 1) + result.throughput.average) / testCount
    );
  }

  generateReport() {
    const duration = (Date.now() - this.startTime) / 1000;
    
    const report = {
      testSuite: 'API Performance Benchmark',
      timestamp: new Date().toISOString(),
      duration: duration,
      configuration: {
        baseURL: apiConfig.baseURL,
        testDuration: apiConfig.testDuration,
        thresholds: apiConfig.thresholds,
      },
      summary: {
        ...this.metrics.summary,
        errorRate: (this.metrics.summary.totalErrors / this.metrics.summary.totalRequests) * 100,
        testsExecuted: this.metrics.tests.length,
        thresholdViolations: this.metrics.thresholdViolations.length,
      },
      results: {
        endpointTests: this.metrics.tests,
        scenarioTests: this.metrics.scenarios || [],
        thresholdViolations: this.metrics.thresholdViolations,
      },
      recommendations: this.generateRecommendations(),
      performanceGrade: this.calculatePerformanceGrade(),
    };

    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    const violations = this.metrics.thresholdViolations;
    
    // Group violations by type
    const violationsByType = violations.reduce((acc, violation) => {
      if (!acc[violation.metric]) {
        acc[violation.metric] = [];
      }
      acc[violation.metric].push(violation);
      return acc;
    }, {});

    // Generate recommendations based on violations
    Object.entries(violationsByType).forEach(([metric, metricViolations]) => {
      switch (metric) {
        case 'P95 Response Time':
        case 'P99 Response Time':
          recommendations.push({
            category: 'Performance',
            priority: metricViolations.some(v => v.severity === 'critical') ? 'High' : 'Medium',
            issue: `High response times detected in ${metricViolations.length} endpoints`,
            recommendation: 'Optimize slow endpoints, add caching, or scale infrastructure',
            affectedEndpoints: metricViolations.map(v => v.endpoint),
          });
          break;
          
        case 'Error Rate':
          recommendations.push({
            category: 'Reliability',
            priority: 'Critical',
            issue: `High error rates in ${metricViolations.length} endpoints`,
            recommendation: 'Investigate and fix error causes, improve error handling',
            affectedEndpoints: metricViolations.map(v => v.endpoint),
          });
          break;
          
        case 'Throughput':
          recommendations.push({
            category: 'Scalability',
            priority: 'Medium',
            issue: `Low throughput in ${metricViolations.length} endpoints`,
            recommendation: 'Optimize request processing, consider horizontal scaling',
            affectedEndpoints: metricViolations.map(v => v.endpoint),
          });
          break;
      }
    });

    // Add general recommendations
    if (this.metrics.summary.avgResponseTime > 300) {
      recommendations.push({
        category: 'Performance',
        priority: 'Medium',
        issue: 'Overall average response time is high',
        recommendation: 'Consider implementing response caching and database query optimization',
      });
    }

    return recommendations;
  }

  calculatePerformanceGrade() {
    let score = 100;
    const violations = this.metrics.thresholdViolations;
    
    // Deduct points based on violations
    violations.forEach(violation => {
      switch (violation.severity) {
        case 'critical':
          score -= 15;
          break;
        case 'high':
          score -= 10;
          break;
        case 'medium':
          score -= 5;
          break;
        default:
          score -= 2;
      }
    });

    // Ensure score doesn't go below 0
    score = Math.max(0, score);
    
    // Assign grade
    if (score >= 90) return { score, grade: 'A', description: 'Excellent' };
    if (score >= 80) return { score, grade: 'B', description: 'Good' };
    if (score >= 70) return { score, grade: 'C', description: 'Fair' };
    if (score >= 60) return { score, grade: 'D', description: 'Poor' };
    return { score, grade: 'F', description: 'Failing' };
  }

  async cleanup() {
    console.log('Cleaning up API benchmark suite...');
    this.authTokens.clear();
    console.log('Cleanup completed');
  }
}

// Main execution
async function runAPIPerformanceSuite() {
  const suite = new APIPerformanceSuite();
  
  try {
    await suite.initialize();
    const report = await suite.runFullBenchmarkSuite();
    
    // Save report
    const reportPath = path.join(__dirname, '../../reports', `api-performance-${Date.now()}.json`);
    const reportsDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Display summary
    console.log('\n=== API Performance Test Results ===');
    console.log(`Test Duration: ${report.duration.toFixed(2)}s`);
    console.log(`Total Requests: ${report.summary.totalRequests}`);
    console.log(`Total Errors: ${report.summary.totalErrors}`);
    console.log(`Error Rate: ${report.summary.errorRate.toFixed(2)}%`);
    console.log(`Average Response Time: ${report.summary.avgResponseTime.toFixed(2)}ms`);
    console.log(`Average Throughput: ${report.summary.throughput.toFixed(2)} req/s`);
    console.log(`Performance Grade: ${report.performanceGrade.grade} (${report.performanceGrade.score}/100)`);
    console.log(`Threshold Violations: ${report.summary.thresholdViolations}`);
    
    if (report.recommendations.length > 0) {
      console.log('\n=== Recommendations ===');
      report.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. [${rec.priority}] ${rec.issue}`);
        console.log(`   ${rec.recommendation}`);
        if (rec.affectedEndpoints) {
          console.log(`   Affected: ${rec.affectedEndpoints.join(', ')}`);
        }
        console.log('');
      });
    }
    
    console.log(`\nDetailed report saved to: ${reportPath}`);
    
  } catch (error) {
    console.error(`API performance suite failed: ${error.message}`);
    process.exit(1);
  } finally {
    await suite.cleanup();
  }
}

// Run if called directly
if (require.main === module) {
  runAPIPerformanceSuite().catch(console.error);
}

module.exports = APIPerformanceSuite;