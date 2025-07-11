const { Pool } = require('pg');
const dbConfig = require('./db-config');
const fs = require('fs');
const path = require('path');

class DatabaseStressTest {
  constructor() {
    this.pools = new Map();
    this.metrics = {
      totalQueries: 0,
      successfulQueries: 0,
      failedQueries: 0,
      responseTimes: [],
      connectionTimes: [],
      lockWaitTimes: [],
      errors: [],
      memoryUsage: [],
    };
    this.startTime = null;
    this.testRunning = false;
  }

  async initialize() {
    console.log('Initializing database stress test...');
    
    // Create connection pools for different scenarios
    for (const connections of dbConfig.performance.concurrentConnections) {
      const pool = new Pool({
        ...dbConfig.connection,
        max: connections,
        min: Math.floor(connections / 4),
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      this.pools.set(connections, pool);
    }

    // Verify database connectivity
    await this.verifyConnectivity();
    
    // Set up test data if needed
    await this.setupTestData();
    
    console.log('Database stress test initialized successfully');
  }

  async verifyConnectivity() {
    const testPool = new Pool({
      ...dbConfig.connection,
      max: 1,
    });

    try {
      const client = await testPool.connect();
      const result = await client.query('SELECT NOW() as current_time');
      console.log(`Database connected successfully at: ${result.rows[0].current_time}`);
      client.release();
    } catch (error) {
      throw new Error(`Database connectivity failed: ${error.message}`);
    } finally {
      await testPool.end();
    }
  }

  async setupTestData() {
    console.log('Setting up test data...');
    
    const setupPool = new Pool({
      ...dbConfig.connection,
      max: 5,
    });

    try {
      const client = await setupPool.connect();
      
      // Create indexes for performance testing if they don't exist
      const indexQueries = [
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role ON users(role)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_classes_teacher_date ON classes(teacher_id, date)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_student_status ON bookings(student_id, status)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_class_student ON attendance(class_id, student_id)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_hours_student_id ON student_hours(student_id)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)',
      ];

      for (const query of indexQueries) {
        try {
          await client.query(query);
        } catch (error) {
          // Ignore errors for existing indexes
          if (!error.message.includes('already exists')) {
            console.warn(`Index creation warning: ${error.message}`);
          }
        }
      }

      client.release();
      console.log('Test data setup completed');
    } catch (error) {
      console.error(`Test data setup failed: ${error.message}`);
    } finally {
      await setupPool.end();
    }
  }

  async runStressTest() {
    console.log('Starting database stress test...');
    this.startTime = Date.now();
    this.testRunning = true;

    // Start memory monitoring
    this.startMemoryMonitoring();

    const testPromises = [];

    // Run tests for different connection pool sizes
    for (const [connections, pool] of this.pools) {
      console.log(`Testing with ${connections} concurrent connections...`);
      
      // Test different scenarios
      for (const [scenarioName, scenarioConfig] of Object.entries(dbConfig.performance.scenarios)) {
        testPromises.push(
          this.runScenario(pool, connections, scenarioName, scenarioConfig)
        );
      }
    }

    // Wait for all tests to complete
    await Promise.allSettled(testPromises);

    this.testRunning = false;
    console.log('Database stress test completed');
    
    return this.generateReport();
  }

  async runScenario(pool, connections, scenarioName, scenarioConfig) {
    console.log(`  Running scenario: ${scenarioName} with ${connections} connections`);
    
    const scenarioStartTime = Date.now();
    const workers = [];

    // Create worker promises for concurrent execution
    for (let i = 0; i < connections; i++) {
      workers.push(this.workerLoop(pool, scenarioConfig, scenarioName));
    }

    // Run workers for the test duration
    const timeout = new Promise(resolve => 
      setTimeout(resolve, dbConfig.performance.testDuration)
    );

    await Promise.race([Promise.allSettled(workers), timeout]);

    const scenarioEndTime = Date.now();
    const duration = (scenarioEndTime - scenarioStartTime) / 1000;
    
    console.log(`  Scenario ${scenarioName} completed in ${duration}s`);
  }

  async workerLoop(pool, scenarioConfig, scenarioName) {
    const startTime = Date.now();
    
    while (this.testRunning && (Date.now() - startTime) < dbConfig.performance.testDuration) {
      try {
        await this.executeRandomQuery(pool, scenarioConfig, scenarioName);
        
        // Small delay to simulate realistic load
        await this.sleep(Math.random() * 100);
      } catch (error) {
        this.metrics.errors.push({
          scenario: scenarioName,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
        this.metrics.failedQueries++;
      }
    }
  }

  async executeRandomQuery(pool, scenarioConfig, scenarioName) {
    const queryType = this.selectQueryType(scenarioConfig);
    const queries = dbConfig.queries[queryType];
    const query = queries[Math.floor(Math.random() * queries.length)];
    
    const connectionStartTime = Date.now();
    const client = await pool.connect();
    const connectionTime = Date.now() - connectionStartTime;
    
    this.metrics.connectionTimes.push(connectionTime);

    try {
      const queryStartTime = Date.now();
      const params = this.generateQueryParams(query, queryType);
      
      await client.query(query, params);
      
      const responseTime = Date.now() - queryStartTime;
      this.metrics.responseTimes.push(responseTime);
      this.metrics.successfulQueries++;
      
      // Check for performance thresholds
      if (responseTime > dbConfig.performance.thresholds.maxResponseTime) {
        console.warn(`Slow query detected: ${responseTime}ms for ${queryType} in ${scenarioName}`);
      }
      
    } finally {
      client.release();
    }
    
    this.metrics.totalQueries++;
  }

  selectQueryType(scenarioConfig) {
    const random = Math.random() * 100;
    
    if (random < scenarioConfig.readQueries) {
      return 'reads';
    } else if (random < scenarioConfig.readQueries + scenarioConfig.writeQueries) {
      return 'writes';
    } else {
      return 'complex';
    }
  }

  generateQueryParams(query, queryType) {
    const paramCount = (query.match(/\$/g) || []).length;
    const params = [];

    for (let i = 0; i < paramCount; i++) {
      switch (queryType) {
        case 'reads':
          params.push(this.generateReadParam(i));
          break;
        case 'writes':
          params.push(this.generateWriteParam(i));
          break;
        case 'complex':
          // Complex queries typically don't need parameters or use constants
          break;
      }
    }

    return params;
  }

  generateReadParam(index) {
    switch (index) {
      case 0: // Usually an ID
        return Math.floor(Math.random() * 1000) + 1;
      case 1: // Usually a status or secondary field
        return ['active', 'inactive', 'pending', 'confirmed'][Math.floor(Math.random() * 4)];
      default:
        return Math.floor(Math.random() * 100) + 1;
    }
  }

  generateWriteParam(index) {
    switch (index) {
      case 0: // Usually an ID
        return Math.floor(Math.random() * 1000) + 1;
      case 1: // Secondary ID
        return Math.floor(Math.random() * 500) + 1;
      case 2: // Date/timestamp
        return new Date();
      case 3: // Status or string
        return ['active', 'pending', 'completed'][Math.floor(Math.random() * 3)];
      default:
        return `test_value_${Math.random().toString(36).substring(7)}`;
    }
  }

  startMemoryMonitoring() {
    const monitor = () => {
      if (!this.testRunning) return;
      
      const usage = process.memoryUsage();
      this.metrics.memoryUsage.push({
        timestamp: Date.now(),
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
        external: usage.external,
        rss: usage.rss,
      });
      
      setTimeout(monitor, 5000); // Check every 5 seconds
    };
    
    monitor();
  }

  generateReport() {
    const duration = (Date.now() - this.startTime) / 1000;
    const successRate = (this.metrics.successfulQueries / this.metrics.totalQueries) * 100;
    
    const report = {
      testDuration: duration,
      summary: {
        totalQueries: this.metrics.totalQueries,
        successfulQueries: this.metrics.successfulQueries,
        failedQueries: this.metrics.failedQueries,
        successRate: successRate.toFixed(2) + '%',
        queriesPerSecond: (this.metrics.totalQueries / duration).toFixed(2),
      },
      performance: {
        responseTime: {
          min: Math.min(...this.metrics.responseTimes),
          max: Math.max(...this.metrics.responseTimes),
          avg: this.average(this.metrics.responseTimes),
          p50: this.percentile(this.metrics.responseTimes, 50),
          p95: this.percentile(this.metrics.responseTimes, 95),
          p99: this.percentile(this.metrics.responseTimes, 99),
        },
        connectionTime: {
          min: Math.min(...this.metrics.connectionTimes),
          max: Math.max(...this.metrics.connectionTimes),
          avg: this.average(this.metrics.connectionTimes),
          p95: this.percentile(this.metrics.connectionTimes, 95),
        },
        memoryUsage: {
          peak: Math.max(...this.metrics.memoryUsage.map(m => m.heapUsed)),
          average: this.average(this.metrics.memoryUsage.map(m => m.heapUsed)),
        },
      },
      thresholds: {
        responseTimeExceeded: this.metrics.responseTimes.filter(
          t => t > dbConfig.performance.thresholds.maxResponseTime
        ).length,
        connectionTimeExceeded: this.metrics.connectionTimes.filter(
          t => t > dbConfig.performance.thresholds.maxConnectionTime
        ).length,
        memoryLeakDetected: this.detectMemoryLeak(),
      },
      errors: this.metrics.errors,
      recommendations: this.generateRecommendations(),
    };

    return report;
  }

  average(arr) {
    return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  }

  percentile(arr, p) {
    const sorted = arr.slice().sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  detectMemoryLeak() {
    if (this.metrics.memoryUsage.length < 10) return false;
    
    const firstHalf = this.metrics.memoryUsage.slice(0, Math.floor(this.metrics.memoryUsage.length / 2));
    const secondHalf = this.metrics.memoryUsage.slice(Math.floor(this.metrics.memoryUsage.length / 2));
    
    const firstAvg = this.average(firstHalf.map(m => m.heapUsed));
    const secondAvg = this.average(secondHalf.map(m => m.heapUsed));
    
    const increase = secondAvg - firstAvg;
    return increase > dbConfig.performance.thresholds.memoryLeakThreshold;
  }

  generateRecommendations() {
    const recommendations = [];
    const perf = this.metrics;
    
    // Response time recommendations
    const avgResponseTime = this.average(perf.responseTimes);
    if (avgResponseTime > 500) {
      recommendations.push({
        category: 'Performance',
        priority: 'High',
        issue: 'High average response time',
        recommendation: 'Consider optimizing slow queries, adding indexes, or scaling database resources',
        metric: `Average response time: ${avgResponseTime.toFixed(2)}ms`,
      });
    }
    
    // Connection time recommendations
    const avgConnectionTime = this.average(perf.connectionTimes);
    if (avgConnectionTime > 50) {
      recommendations.push({
        category: 'Connection Pool',
        priority: 'Medium',
        issue: 'Slow database connections',
        recommendation: 'Optimize connection pool settings or check network latency',
        metric: `Average connection time: ${avgConnectionTime.toFixed(2)}ms`,
      });
    }
    
    // Error rate recommendations
    const errorRate = (perf.failedQueries / perf.totalQueries) * 100;
    if (errorRate > 1) {
      recommendations.push({
        category: 'Reliability',
        priority: 'High',
        issue: 'High error rate',
        recommendation: 'Investigate database errors and improve error handling',
        metric: `Error rate: ${errorRate.toFixed(2)}%`,
      });
    }
    
    // Memory recommendations
    if (this.detectMemoryLeak()) {
      recommendations.push({
        category: 'Memory',
        priority: 'High',
        issue: 'Potential memory leak detected',
        recommendation: 'Review connection pooling and ensure proper connection cleanup',
        metric: 'Memory usage increasing over time',
      });
    }
    
    return recommendations;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async cleanup() {
    console.log('Cleaning up database connections...');
    
    for (const [connections, pool] of this.pools) {
      try {
        await pool.end();
        console.log(`Closed connection pool with ${connections} connections`);
      } catch (error) {
        console.error(`Error closing pool: ${error.message}`);
      }
    }
    
    this.pools.clear();
    console.log('Database cleanup completed');
  }
}

// Main execution
async function runDatabaseStressTest() {
  const test = new DatabaseStressTest();
  
  try {
    await test.initialize();
    const report = await test.runStressTest();
    
    // Save report
    const reportPath = path.join(__dirname, '../../reports', `db-performance-${Date.now()}.json`);
    const reportsDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Display summary
    console.log('\n=== Database Performance Test Results ===');
    console.log(`Test Duration: ${report.testDuration.toFixed(2)}s`);
    console.log(`Total Queries: ${report.summary.totalQueries}`);
    console.log(`Success Rate: ${report.summary.successRate}`);
    console.log(`Queries/Second: ${report.summary.queriesPerSecond}`);
    console.log(`Average Response Time: ${report.performance.responseTime.avg.toFixed(2)}ms`);
    console.log(`95th Percentile Response Time: ${report.performance.responseTime.p95.toFixed(2)}ms`);
    
    if (report.recommendations.length > 0) {
      console.log('\n=== Recommendations ===');
      report.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. [${rec.priority}] ${rec.issue}`);
        console.log(`   ${rec.recommendation}`);
        console.log(`   Metric: ${rec.metric}\n`);
      });
    }
    
    console.log(`\nDetailed report saved to: ${reportPath}`);
    
  } catch (error) {
    console.error(`Database stress test failed: ${error.message}`);
    process.exit(1);
  } finally {
    await test.cleanup();
  }
}

// Run if called directly
if (require.main === module) {
  runDatabaseStressTest().catch(console.error);
}

module.exports = DatabaseStressTest;