const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Import our performance testing modules
const DatabaseStressTest = require('../database-performance/db-stress-test');
const APIPerformanceSuite = require('../api-benchmarking/api-performance-suite');
const LighthousePerformanceSuite = require('../frontend-performance/lighthouse-suite');
const MemoryLeakDetector = require('../memory-leak/memory-detection');
const BundleAnalyzer = require('../bundle-analysis/bundle-analyzer');

class PerformanceRegressionSuite {
  constructor() {
    this.baselineDir = path.join(__dirname, '../../baselines');
    this.reportsDir = path.join(__dirname, '../../reports');
    this.regressionThreshold = 0.1; // 10% regression threshold
    this.currentBaseline = null;
    this.testResults = [];
    this.regressionResults = {
      passed: [],
      failed: [],
      warnings: [],
    };
  }

  async initialize() {
    console.log('Initializing performance regression testing suite...');
    
    // Ensure directories exist
    [this.baselineDir, this.reportsDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    // Load or create baseline
    await this.loadBaseline();
    
    console.log('Performance regression suite initialized');
  }

  async loadBaseline() {
    const baselineFile = path.join(this.baselineDir, 'performance-baseline.json');
    
    if (fs.existsSync(baselineFile)) {
      try {
        this.currentBaseline = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
        console.log(`Loaded baseline from ${this.currentBaseline.timestamp}`);
      } catch (error) {
        console.warn(`Failed to load baseline: ${error.message}`);
        this.currentBaseline = null;
      }
    } else {
      console.log('No baseline found. First run will establish baseline.');
      this.currentBaseline = null;
    }
  }

  async runRegressionTests() {
    console.log('Starting performance regression testing...');
    
    const testSuites = [
      { name: 'Database Performance', runner: this.runDatabaseTests.bind(this) },
      { name: 'API Performance', runner: this.runAPITests.bind(this) },
      { name: 'Frontend Performance', runner: this.runFrontendTests.bind(this) },
      { name: 'Memory Performance', runner: this.runMemoryTests.bind(this) },
      { name: 'Bundle Analysis', runner: this.runBundleTests.bind(this) },
    ];

    for (const suite of testSuites) {
      console.log(`\nRunning ${suite.name} tests...`);
      
      try {
        const result = await suite.runner();
        this.testResults.push({
          suite: suite.name,
          success: true,
          result: result,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error(`${suite.name} failed: ${error.message}`);
        this.testResults.push({
          suite: suite.name,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Perform regression analysis
    const regressionReport = this.analyzeRegressions();
    
    // Update baseline if this is a successful run
    if (this.shouldUpdateBaseline()) {
      await this.updateBaseline();
    }

    console.log('Performance regression testing completed');
    return regressionReport;
  }

  async runDatabaseTests() {
    console.log('  Running database performance tests...');
    
    const dbTest = new DatabaseStressTest();
    await dbTest.initialize();
    
    try {
      const result = await dbTest.runStressTest();
      await dbTest.cleanup();
      
      return {
        type: 'database',
        metrics: {
          totalQueries: result.summary.totalQueries,
          successRate: parseFloat(result.summary.successRate),
          queriesPerSecond: parseFloat(result.summary.queriesPerSecond),
          avgResponseTime: result.performance.responseTime.avg,
          p95ResponseTime: result.performance.responseTime.p95,
          avgConnectionTime: result.performance.connectionTime.avg,
        },
        thresholdViolations: result.thresholds.responseTimeExceeded + result.thresholds.connectionTimeExceeded,
        recommendations: result.recommendations,
      };
    } catch (error) {
      await dbTest.cleanup();
      throw error;
    }
  }

  async runAPITests() {
    console.log('  Running API performance tests...');
    
    const apiSuite = new APIPerformanceSuite();
    await apiSuite.initialize();
    
    try {
      const result = await apiSuite.runFullBenchmarkSuite();
      await apiSuite.cleanup();
      
      return {
        type: 'api',
        metrics: {
          totalRequests: result.summary.totalRequests,
          totalErrors: result.summary.totalErrors,
          errorRate: result.summary.errorRate,
          avgResponseTime: result.summary.avgResponseTime,
          throughput: result.summary.throughput,
          performanceScore: result.performanceGrade.score,
        },
        thresholdViolations: result.summary.thresholdViolations,
        recommendations: result.recommendations,
      };
    } catch (error) {
      await apiSuite.cleanup();
      throw error;
    }
  }

  async runFrontendTests() {
    console.log('  Running frontend performance tests...');
    
    const frontendSuite = new LighthousePerformanceSuite();
    await frontendSuite.initialize();
    
    try {
      const result = await frontendSuite.runFullPerformanceSuite();
      await frontendSuite.cleanup();
      
      return {
        type: 'frontend',
        metrics: {
          performanceScore: result.summary.averageScores.performance,
          accessibilityScore: result.summary.averageScores.accessibility,
          bestPracticesScore: result.summary.averageScores.bestPractices,
          seoScore: result.summary.averageScores.seo,
          thresholdViolations: result.summary.thresholdViolations,
          overallGrade: result.performanceGrade.score,
        },
        recommendations: result.recommendations,
      };
    } catch (error) {
      await frontendSuite.cleanup();
      throw error;
    }
  }

  async runMemoryTests() {
    console.log('  Running memory performance tests...');
    
    const memoryDetector = new MemoryLeakDetector();
    await memoryDetector.initialize();
    
    try {
      const result = await memoryDetector.runMemoryLeakDetection();
      await memoryDetector.cleanup();
      
      return {
        type: 'memory',
        metrics: {
          leaksDetected: result.summary.leaksDetected,
          leakRate: result.summary.leakRate,
          riskScore: result.riskLevel.score,
          riskLevel: result.riskLevel.level,
          severeBugs: result.summary.severityDistribution.severe,
          moderateBugs: result.summary.severityDistribution.moderate,
        },
        recommendations: result.recommendations,
      };
    } catch (error) {
      await memoryDetector.cleanup();
      throw error;
    }
  }

  async runBundleTests() {
    console.log('  Running bundle analysis tests...');
    
    const bundleAnalyzer = new BundleAnalyzer();
    await bundleAnalyzer.initialize();
    
    const result = await bundleAnalyzer.runCompleteBundleAnalysis();
    
    return {
      type: 'bundle',
      metrics: {
        totalBundleSizeMB: result.summary.totalBundleSize / (1024 * 1024),
        totalChunks: result.summary.totalChunks,
        largeChunks: result.summary.largeChunks,
        unusedCodeKB: result.summary.unusedCode / 1024,
        optimizationPotentialMB: result.optimizationPotential.totalPotentialSavingsMB,
      },
      recommendations: result.recommendations,
    };
  }

  analyzeRegressions() {
    console.log('\nAnalyzing performance regressions...');
    
    if (!this.currentBaseline) {
      console.log('No baseline available for comparison. Establishing new baseline.');
      return this.createInitialReport();
    }

    const currentResults = this.extractCurrentMetrics();
    const baselineMetrics = this.currentBaseline.metrics;
    
    // Compare each test suite
    Object.keys(currentResults).forEach(suiteType => {
      if (baselineMetrics[suiteType]) {
        this.compareSuiteMetrics(suiteType, currentResults[suiteType], baselineMetrics[suiteType]);
      } else {
        this.regressionResults.warnings.push({
          suite: suiteType,
          message: 'No baseline data available for comparison',
        });
      }
    });

    return this.generateRegressionReport(currentResults);
  }

  extractCurrentMetrics() {
    const metrics = {};
    
    this.testResults.forEach(result => {
      if (result.success && result.result?.metrics) {
        metrics[result.result.type] = result.result.metrics;
      }
    });
    
    return metrics;
  }

  compareSuiteMetrics(suiteType, currentMetrics, baselineMetrics) {
    const comparisons = this.getMetricComparisons(suiteType);
    
    comparisons.forEach(comparison => {
      const { metric, threshold, direction } = comparison;
      const currentValue = currentMetrics[metric];
      const baselineValue = baselineMetrics[metric];
      
      if (currentValue === undefined || baselineValue === undefined) {
        this.regressionResults.warnings.push({
          suite: suiteType,
          metric: metric,
          message: 'Metric not available in current or baseline results',
        });
        return;
      }

      const change = this.calculatePercentageChange(baselineValue, currentValue);
      const isRegression = this.isRegression(change, direction, threshold);
      
      const comparisonResult = {
        suite: suiteType,
        metric: metric,
        baseline: baselineValue,
        current: currentValue,
        change: change,
        changePercentage: Math.abs(change),
        direction: change > 0 ? 'increased' : 'decreased',
        threshold: threshold,
        isRegression: isRegression,
      };

      if (isRegression) {
        this.regressionResults.failed.push(comparisonResult);
      } else {
        this.regressionResults.passed.push(comparisonResult);
      }
    });
  }

  getMetricComparisons(suiteType) {
    const comparisons = {
      database: [
        { metric: 'avgResponseTime', threshold: this.regressionThreshold, direction: 'lower' },
        { metric: 'p95ResponseTime', threshold: this.regressionThreshold, direction: 'lower' },
        { metric: 'successRate', threshold: 0.05, direction: 'higher' }, // 5% threshold for success rate
        { metric: 'queriesPerSecond', threshold: this.regressionThreshold, direction: 'higher' },
      ],
      api: [
        { metric: 'avgResponseTime', threshold: this.regressionThreshold, direction: 'lower' },
        { metric: 'errorRate', threshold: 0.05, direction: 'lower' },
        { metric: 'throughput', threshold: this.regressionThreshold, direction: 'higher' },
        { metric: 'performanceScore', threshold: 0.05, direction: 'higher' },
      ],
      frontend: [
        { metric: 'performanceScore', threshold: 0.05, direction: 'higher' },
        { metric: 'accessibilityScore', threshold: 0.05, direction: 'higher' },
        { metric: 'bestPracticesScore', threshold: 0.05, direction: 'higher' },
        { metric: 'overallGrade', threshold: 0.05, direction: 'higher' },
      ],
      memory: [
        { metric: 'leakRate', threshold: 0.05, direction: 'lower' },
        { metric: 'riskScore', threshold: this.regressionThreshold, direction: 'lower' },
        { metric: 'severeBugs', threshold: 0, direction: 'lower' }, // No tolerance for severe bugs
      ],
      bundle: [
        { metric: 'totalBundleSizeMB', threshold: this.regressionThreshold, direction: 'lower' },
        { metric: 'largeChunks', threshold: 0.2, direction: 'lower' },
        { metric: 'unusedCodeKB', threshold: 0.2, direction: 'lower' },
      ],
    };

    return comparisons[suiteType] || [];
  }

  calculatePercentageChange(baseline, current) {
    if (baseline === 0) return current === 0 ? 0 : 100;
    return ((current - baseline) / baseline) * 100;
  }

  isRegression(change, direction, threshold) {
    const absoluteChange = Math.abs(change) / 100; // Convert percentage to decimal
    
    if (direction === 'lower') {
      // Metric should be lower (better), so increase is regression
      return change > 0 && absoluteChange > threshold;
    } else {
      // Metric should be higher (better), so decrease is regression
      return change < 0 && absoluteChange > threshold;
    }
  }

  createInitialReport() {
    const currentMetrics = this.extractCurrentMetrics();
    
    return {
      type: 'baseline_establishment',
      timestamp: new Date().toISOString(),
      metrics: currentMetrics,
      message: 'Initial baseline established. Future runs will compare against this baseline.',
      testResults: this.testResults,
    };
  }

  generateRegressionReport(currentMetrics) {
    const totalComparisons = this.regressionResults.passed.length + this.regressionResults.failed.length;
    const regressionRate = totalComparisons > 0 ? (this.regressionResults.failed.length / totalComparisons) * 100 : 0;
    
    const report = {
      type: 'regression_analysis',
      timestamp: new Date().toISOString(),
      baseline: {
        timestamp: this.currentBaseline.timestamp,
        gitCommit: this.currentBaseline.gitCommit,
      },
      current: {
        metrics: currentMetrics,
        gitCommit: this.getCurrentGitCommit(),
      },
      analysis: {
        totalComparisons: totalComparisons,
        passed: this.regressionResults.passed.length,
        failed: this.regressionResults.failed.length,
        warnings: this.regressionResults.warnings.length,
        regressionRate: regressionRate,
        overallStatus: this.regressionResults.failed.length === 0 ? 'PASS' : 'FAIL',
      },
      regressions: this.regressionResults.failed,
      improvements: this.regressionResults.passed.filter(r => this.isImprovement(r)),
      warnings: this.regressionResults.warnings,
      recommendations: this.generateRegressionRecommendations(),
      testResults: this.testResults,
    };

    return report;
  }

  isImprovement(result) {
    const { change, direction } = result;
    
    if (direction === 'lower') {
      // For metrics that should be lower, a decrease is an improvement
      return change < -5; // At least 5% improvement
    } else {
      // For metrics that should be higher, an increase is an improvement
      return change > 5; // At least 5% improvement
    }
  }

  generateRegressionRecommendations() {
    const recommendations = [];
    
    // Group regressions by suite
    const regressionsBySuite = this.regressionResults.failed.reduce((acc, regression) => {
      if (!acc[regression.suite]) {
        acc[regression.suite] = [];
      }
      acc[regression.suite].push(regression);
      return acc;
    }, {});

    Object.entries(regressionsBySuite).forEach(([suite, regressions]) => {
      const majorRegressions = regressions.filter(r => r.changePercentage > 20);
      const minorRegressions = regressions.filter(r => r.changePercentage <= 20);

      if (majorRegressions.length > 0) {
        recommendations.push({
          category: 'Critical Regression',
          priority: 'High',
          suite: suite,
          issue: `Major performance regression detected in ${suite}`,
          recommendation: this.getSuiteSpecificRecommendation(suite, 'major'),
          affectedMetrics: majorRegressions.map(r => r.metric),
        });
      }

      if (minorRegressions.length > 0) {
        recommendations.push({
          category: 'Performance Degradation',
          priority: 'Medium',
          suite: suite,
          issue: `Minor performance degradation in ${suite}`,
          recommendation: this.getSuiteSpecificRecommendation(suite, 'minor'),
          affectedMetrics: minorRegressions.map(r => r.metric),
        });
      }
    });

    // Overall recommendations
    if (this.regressionResults.failed.length > totalComparisons * 0.3) {
      recommendations.push({
        category: 'System Performance',
        priority: 'Critical',
        issue: 'Widespread performance regressions detected',
        recommendation: 'Conduct comprehensive performance review and consider reverting recent changes',
      });
    }

    return recommendations;
  }

  getSuiteSpecificRecommendation(suite, severity) {
    const recommendations = {
      database: {
        major: 'Review recent database schema changes, query optimizations, and connection pool settings',
        minor: 'Monitor database performance trends and consider query optimization',
      },
      api: {
        major: 'Review API endpoint implementations, middleware, and server resource allocation',
        minor: 'Profile slow API endpoints and optimize critical paths',
      },
      frontend: {
        major: 'Review recent frontend changes, bundle size, and rendering performance',
        minor: 'Optimize frontend assets and implement performance best practices',
      },
      memory: {
        major: 'Investigate memory leaks immediately - this could lead to system instability',
        minor: 'Review memory usage patterns and implement proper cleanup',
      },
      bundle: {
        major: 'Review dependency changes and implement aggressive code splitting',
        minor: 'Optimize bundle size through tree shaking and dependency analysis',
      },
    };

    return recommendations[suite]?.[severity] || 'Review recent changes and optimize performance-critical areas';
  }

  shouldUpdateBaseline() {
    // Update baseline if:
    // 1. No current baseline exists
    // 2. All tests passed successfully
    // 3. Regression rate is below 20%
    
    if (!this.currentBaseline) {
      return true;
    }

    const successfulTests = this.testResults.filter(r => r.success).length;
    const totalTests = this.testResults.length;
    const successRate = successfulTests / totalTests;

    if (successRate < 0.8) {
      console.log('Not updating baseline due to test failures');
      return false;
    }

    const regressionRate = this.regressionResults.failed.length / 
      (this.regressionResults.passed.length + this.regressionResults.failed.length);

    if (regressionRate > 0.2) {
      console.log('Not updating baseline due to high regression rate');
      return false;
    }

    return true;
  }

  async updateBaseline() {
    console.log('Updating performance baseline...');
    
    const currentMetrics = this.extractCurrentMetrics();
    const gitCommit = this.getCurrentGitCommit();
    
    const newBaseline = {
      timestamp: new Date().toISOString(),
      gitCommit: gitCommit,
      metrics: currentMetrics,
      testResults: this.testResults,
      version: '1.0.0', // Could be extracted from package.json
    };

    const baselineFile = path.join(this.baselineDir, 'performance-baseline.json');
    
    // Backup current baseline
    if (fs.existsSync(baselineFile)) {
      const backupFile = path.join(this.baselineDir, `performance-baseline-backup-${Date.now()}.json`);
      fs.copyFileSync(baselineFile, backupFile);
    }

    fs.writeFileSync(baselineFile, JSON.stringify(newBaseline, null, 2));
    
    this.currentBaseline = newBaseline;
    console.log('Performance baseline updated successfully');
  }

  getCurrentGitCommit() {
    try {
      return execSync('git rev-parse HEAD', { 
        cwd: this.baselineDir.replace('/performance-testing/baselines', ''),
        encoding: 'utf8' 
      }).trim();
    } catch (error) {
      return 'unknown';
    }
  }

  async generateDetailedReport(regressionReport) {
    const reportPath = path.join(this.reportsDir, `regression-report-${Date.now()}.json`);
    
    // Save detailed JSON report
    fs.writeFileSync(reportPath, JSON.stringify(regressionReport, null, 2));
    
    // Generate summary report
    const summaryPath = path.join(this.reportsDir, `regression-summary-${Date.now()}.txt`);
    const summary = this.generateTextSummary(regressionReport);
    fs.writeFileSync(summaryPath, summary);
    
    return {
      detailedReport: reportPath,
      summaryReport: summaryPath,
    };
  }

  generateTextSummary(report) {
    const lines = [];
    
    lines.push('='.repeat(60));
    lines.push('PERFORMANCE REGRESSION TEST REPORT');
    lines.push('='.repeat(60));
    lines.push(`Timestamp: ${report.timestamp}`);
    lines.push(`Overall Status: ${report.analysis.overallStatus}`);
    lines.push('');
    
    if (report.type === 'baseline_establishment') {
      lines.push('This is the initial baseline run.');
      lines.push('Future regression tests will compare against this baseline.');
      lines.push('');
    } else {
      lines.push('REGRESSION ANALYSIS SUMMARY');
      lines.push('-'.repeat(40));
      lines.push(`Total Comparisons: ${report.analysis.totalComparisons}`);
      lines.push(`Passed: ${report.analysis.passed}`);
      lines.push(`Failed (Regressions): ${report.analysis.failed}`);
      lines.push(`Warnings: ${report.analysis.warnings}`);
      lines.push(`Regression Rate: ${report.analysis.regressionRate.toFixed(1)}%`);
      lines.push('');
      
      if (report.regressions.length > 0) {
        lines.push('PERFORMANCE REGRESSIONS DETECTED');
        lines.push('-'.repeat(40));
        report.regressions.forEach(regression => {
          lines.push(`${regression.suite}.${regression.metric}:`);
          lines.push(`  Baseline: ${regression.baseline}`);
          lines.push(`  Current:  ${regression.current}`);
          lines.push(`  Change:   ${regression.change.toFixed(1)}% (${regression.direction})`);
          lines.push('');
        });
      }
      
      if (report.improvements && report.improvements.length > 0) {
        lines.push('PERFORMANCE IMPROVEMENTS');
        lines.push('-'.repeat(40));
        report.improvements.forEach(improvement => {
          lines.push(`${improvement.suite}.${improvement.metric}: ${improvement.change.toFixed(1)}% improvement`);
        });
        lines.push('');
      }
    }
    
    if (report.recommendations && report.recommendations.length > 0) {
      lines.push('RECOMMENDATIONS');
      lines.push('-'.repeat(40));
      report.recommendations.forEach((rec, index) => {
        lines.push(`${index + 1}. [${rec.priority}] ${rec.issue}`);
        lines.push(`   ${rec.recommendation}`);
        if (rec.affectedMetrics) {
          lines.push(`   Affected: ${rec.affectedMetrics.join(', ')}`);
        }
        lines.push('');
      });
    }
    
    lines.push('='.repeat(60));
    
    return lines.join('\n');
  }
}

// Main execution
async function runPerformanceRegressionTests() {
  const suite = new PerformanceRegressionSuite();
  
  try {
    await suite.initialize();
    const report = await suite.runRegressionTests();
    const reportPaths = await suite.generateDetailedReport(report);
    
    // Display summary
    console.log('\n=== Performance Regression Test Results ===');
    console.log(`Overall Status: ${report.analysis?.overallStatus || 'BASELINE_ESTABLISHED'}`);
    
    if (report.analysis) {
      console.log(`Total Comparisons: ${report.analysis.totalComparisons}`);
      console.log(`Regressions: ${report.analysis.failed}`);
      console.log(`Improvements: ${report.improvements?.length || 0}`);
      console.log(`Regression Rate: ${report.analysis.regressionRate.toFixed(1)}%`);
      
      if (report.regressions && report.regressions.length > 0) {
        console.log('\nCritical Regressions:');
        report.regressions.forEach(regression => {
          console.log(`  ${regression.suite}.${regression.metric}: ${regression.change.toFixed(1)}% worse`);
        });
      }
    }
    
    if (report.recommendations && report.recommendations.length > 0) {
      console.log('\nTop Recommendations:');
      report.recommendations.slice(0, 3).forEach((rec, index) => {
        console.log(`  ${index + 1}. [${rec.priority}] ${rec.issue}`);
      });
    }
    
    console.log(`\nDetailed report: ${reportPaths.detailedReport}`);
    console.log(`Summary report: ${reportPaths.summaryReport}`);
    
    // Exit with appropriate code
    const exitCode = report.analysis?.overallStatus === 'FAIL' ? 1 : 0;
    process.exit(exitCode);
    
  } catch (error) {
    console.error(`Performance regression testing failed: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runPerformanceRegressionTests().catch(console.error);
}

module.exports = PerformanceRegressionSuite;