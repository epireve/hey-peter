const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class MemoryLeakDetector {
  constructor() {
    this.browser = null;
    this.memorySnapshots = [];
    this.heapSnapshots = [];
    this.performanceMetrics = [];
    this.testDuration = parseInt(process.env.MEMORY_TEST_DURATION) || 300000; // 5 minutes
    this.snapshotInterval = 15000; // 15 seconds
    this.leakThreshold = parseInt(process.env.MEMORY_LEAK_THRESHOLD_MB) || 100; // 100MB
    this.baseURL = process.env.BASE_URL || 'http://localhost:3000';
    this.startTime = null;
  }

  async initialize() {
    console.log('Initializing memory leak detection...');
    
    // Launch browser with memory tracking enabled
    this.browser = await puppeteer.launch({
      headless: false, // Keep visible for memory monitoring
      defaultViewport: { width: 1920, height: 1080 },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--enable-precise-memory-info',
        '--js-flags="--expose-gc --max-old-space-size=4096"',
        '--remote-debugging-port=9223',
      ],
    });

    // Verify application accessibility
    await this.verifyApplication();
    
    console.log('Memory leak detector initialized');
  }

  async verifyApplication() {
    const page = await this.browser.newPage();
    
    try {
      const response = await page.goto(this.baseURL, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      if (!response.ok()) {
        throw new Error(`Application not accessible: ${response.status()}`);
      }
      
      console.log('Application accessibility verified');
    } catch (error) {
      throw new Error(`Failed to access application: ${error.message}`);
    } finally {
      await page.close();
    }
  }

  async runMemoryLeakDetection() {
    console.log('Starting comprehensive memory leak detection...');
    this.startTime = Date.now();

    const detectionPromises = [
      this.detectBrowserMemoryLeaks(),
      this.detectNodeJSMemoryLeaks(),
      this.performLongRunningUserScenarios(),
    ];

    const results = await Promise.allSettled(detectionPromises);
    
    const report = this.generateMemoryReport(results);
    
    console.log('Memory leak detection completed');
    return report;
  }

  async detectBrowserMemoryLeaks() {
    console.log('Detecting browser-side memory leaks...');
    
    const scenarios = [
      { name: 'Dashboard Navigation', path: '/dashboard' },
      { name: 'Student Pages', path: '/student' },
      { name: 'Teacher Pages', path: '/teacher' },
      { name: 'Admin Pages', path: '/admin' },
    ];

    const browserResults = [];

    for (const scenario of scenarios) {
      console.log(`  Testing scenario: ${scenario.name}`);
      
      const scenarioResult = await this.runBrowserMemoryScenario(scenario);
      browserResults.push(scenarioResult);
    }

    return {
      type: 'browser_memory_leaks',
      results: browserResults,
    };
  }

  async runBrowserMemoryScenario(scenario) {
    const page = await this.browser.newPage();
    const metrics = [];
    const heapSnapshots = [];
    
    try {
      // Enable memory tracking
      await page.setCacheEnabled(false);
      
      // Initial navigation
      await page.goto(`${this.baseURL}${scenario.path}`, { 
        waitUntil: 'networkidle2' 
      });

      // Take initial memory snapshot
      let initialMemory = await this.captureMemorySnapshot(page);
      metrics.push({
        timestamp: Date.now(),
        type: 'initial',
        ...initialMemory,
      });

      // Simulate user interactions over time
      const interactionDuration = 60000; // 1 minute per scenario
      const interactionInterval = 5000; // Every 5 seconds
      const iterations = interactionDuration / interactionInterval;

      for (let i = 0; i < iterations; i++) {
        // Simulate user interactions
        await this.simulateUserInteractions(page, scenario);
        
        // Force garbage collection
        await page.evaluate(() => {
          if (window.gc) {
            window.gc();
          }
        });

        // Capture memory snapshot
        const memorySnapshot = await this.captureMemorySnapshot(page);
        metrics.push({
          timestamp: Date.now(),
          iteration: i + 1,
          type: 'interaction',
          ...memorySnapshot,
        });

        // Take heap snapshot every 3rd iteration
        if (i % 3 === 0) {
          try {
            const heapSnapshot = await this.captureHeapSnapshot(page);
            heapSnapshots.push({
              iteration: i + 1,
              timestamp: Date.now(),
              ...heapSnapshot,
            });
          } catch (error) {
            console.warn(`Failed to capture heap snapshot: ${error.message}`);
          }
        }

        await page.waitForTimeout(interactionInterval);
      }

      // Final memory check
      const finalMemory = await this.captureMemorySnapshot(page);
      metrics.push({
        timestamp: Date.now(),
        type: 'final',
        ...finalMemory,
      });

      // Analyze for leaks
      const leakAnalysis = this.analyzeMemoryLeaks(metrics, initialMemory, finalMemory);

      return {
        scenario: scenario.name,
        path: scenario.path,
        duration: interactionDuration,
        iterations: iterations,
        metrics: metrics,
        heapSnapshots: heapSnapshots,
        leakAnalysis: leakAnalysis,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      return {
        scenario: scenario.name,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    } finally {
      await page.close();
    }
  }

  async simulateUserInteractions(page, scenario) {
    try {
      // Random interactions based on page type
      const interactions = [
        // General interactions
        () => page.click('button').catch(() => {}),
        () => page.click('a[href]').catch(() => {}),
        () => page.hover('.hover-element').catch(() => {}),
        () => page.type('input[type="text"]', 'test').catch(() => {}),
        () => page.evaluate(() => window.scrollTo(0, Math.random() * 1000)),
        
        // Specific interactions based on scenario
        ...(scenario.name.includes('Dashboard') ? [
          () => page.click('.dashboard-card').catch(() => {}),
          () => page.click('.nav-item').catch(() => {}),
        ] : []),
        
        ...(scenario.name.includes('Student') ? [
          () => page.click('.book-class').catch(() => {}),
          () => page.click('.view-schedule').catch(() => {}),
        ] : []),
        
        ...(scenario.name.includes('Teacher') ? [
          () => page.click('.update-availability').catch(() => {}),
          () => page.click('.view-students').catch(() => {}),
        ] : []),
        
        ...(scenario.name.includes('Admin') ? [
          () => page.click('.user-management').catch(() => {}),
          () => page.click('.system-analytics').catch(() => {}),
        ] : []),
      ];

      // Execute 3-5 random interactions
      const numInteractions = Math.floor(Math.random() * 3) + 3;
      for (let i = 0; i < numInteractions; i++) {
        const randomInteraction = interactions[Math.floor(Math.random() * interactions.length)];
        await randomInteraction();
        await page.waitForTimeout(200);
      }
      
    } catch (error) {
      // Ignore interaction errors
    }
  }

  async captureMemorySnapshot(page) {
    try {
      const memoryInfo = await page.evaluate(() => {
        const performance = window.performance;
        const memory = performance.memory || {};
        
        return {
          usedJSHeapSize: memory.usedJSHeapSize || 0,
          totalJSHeapSize: memory.totalJSHeapSize || 0,
          jsHeapSizeLimit: memory.jsHeapSizeLimit || 0,
          // Additional metrics
          documentCount: document.getElementsByTagName('*').length,
          eventListenerCount: this.getEventListenerCount?.() || 0,
        };
      });

      // Get browser process memory
      const metrics = await page.metrics();
      
      return {
        browser: {
          JSHeapUsedSize: metrics.JSHeapUsedSize,
          JSHeapTotalSize: metrics.JSHeapTotalSize,
        },
        javascript: memoryInfo,
        timestamp: Date.now(),
      };
      
    } catch (error) {
      console.warn(`Failed to capture memory snapshot: ${error.message}`);
      return {
        error: error.message,
        timestamp: Date.now(),
      };
    }
  }

  async captureHeapSnapshot(page) {
    try {
      // Use CDP to capture heap snapshot
      const client = await page.target().createCDPSession();
      await client.send('HeapProfiler.enable');
      
      const snapshot = await client.send('HeapProfiler.takeHeapSnapshot');
      
      // Analyze heap snapshot
      const analysis = this.analyzeHeapSnapshot(snapshot);
      
      await client.send('HeapProfiler.disable');
      await client.detach();
      
      return analysis;
      
    } catch (error) {
      throw new Error(`Heap snapshot capture failed: ${error.message}`);
    }
  }

  analyzeHeapSnapshot(snapshot) {
    // Basic heap analysis
    // In a real implementation, you'd parse the heap snapshot format
    return {
      size: snapshot ? JSON.stringify(snapshot).length : 0,
      nodeCount: 0, // Would be extracted from actual snapshot
      edgeCount: 0, // Would be extracted from actual snapshot
      detachedDOMNodes: 0, // Would be calculated from snapshot
    };
  }

  analyzeMemoryLeaks(metrics, initialMemory, finalMemory) {
    const analysis = {
      memoryGrowth: {},
      leakDetected: false,
      severity: 'none',
      recommendations: [],
    };

    try {
      // Calculate memory growth
      const initialJS = initialMemory.javascript?.usedJSHeapSize || 0;
      const finalJS = finalMemory.javascript?.usedJSHeapSize || 0;
      const jsGrowth = finalJS - initialJS;

      const initialBrowser = initialMemory.browser?.JSHeapUsedSize || 0;
      const finalBrowser = finalMemory.browser?.JSHeapUsedSize || 0;
      const browserGrowth = finalBrowser - initialBrowser;

      analysis.memoryGrowth = {
        javascript: {
          initial: initialJS,
          final: finalJS,
          growth: jsGrowth,
          growthMB: jsGrowth / (1024 * 1024),
        },
        browser: {
          initial: initialBrowser,
          final: finalBrowser,
          growth: browserGrowth,
          growthMB: browserGrowth / (1024 * 1024),
        },
      };

      // Determine if leak is detected
      const totalGrowthMB = (jsGrowth + browserGrowth) / (1024 * 1024);
      
      if (totalGrowthMB > this.leakThreshold) {
        analysis.leakDetected = true;
        analysis.severity = totalGrowthMB > this.leakThreshold * 2 ? 'severe' : 'moderate';
        
        analysis.recommendations.push({
          issue: 'Significant memory growth detected',
          recommendation: 'Investigate potential memory leaks in JavaScript event listeners, DOM references, or closures',
          priority: analysis.severity === 'severe' ? 'high' : 'medium',
        });
      }

      // Check for memory patterns
      if (metrics.length > 5) {
        const memoryTrend = this.calculateMemoryTrend(metrics);
        if (memoryTrend.increasing && memoryTrend.rate > 5) { // 5MB per iteration
          analysis.recommendations.push({
            issue: 'Continuous memory growth pattern detected',
            recommendation: 'Review memory management in interactive components and ensure proper cleanup',
            priority: 'high',
          });
        }
      }

    } catch (error) {
      analysis.error = error.message;
    }

    return analysis;
  }

  calculateMemoryTrend(metrics) {
    const memoryValues = metrics
      .filter(m => m.javascript?.usedJSHeapSize)
      .map(m => m.javascript.usedJSHeapSize);

    if (memoryValues.length < 3) {
      return { increasing: false, rate: 0 };
    }

    // Simple linear regression to find trend
    const n = memoryValues.length;
    const sumX = (n * (n + 1)) / 2;
    const sumY = memoryValues.reduce((a, b) => a + b, 0);
    const sumXY = memoryValues.reduce((sum, y, i) => sum + (i + 1) * y, 0);
    const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    return {
      increasing: slope > 0,
      rate: Math.abs(slope) / (1024 * 1024), // Convert to MB
    };
  }

  async detectNodeJSMemoryLeaks() {
    console.log('Detecting Node.js memory leaks...');
    
    return new Promise((resolve) => {
      const nodeMetrics = [];
      const startTime = Date.now();
      const monitoringDuration = 120000; // 2 minutes
      
      // Monitor Node.js process memory
      const monitorInterval = setInterval(() => {
        const memUsage = process.memoryUsage();
        nodeMetrics.push({
          timestamp: Date.now(),
          ...memUsage,
        });
        
        if (Date.now() - startTime > monitoringDuration) {
          clearInterval(monitorInterval);
          
          const analysis = this.analyzeNodeMemoryLeaks(nodeMetrics);
          
          resolve({
            type: 'nodejs_memory_leaks',
            duration: monitoringDuration,
            metrics: nodeMetrics,
            analysis: analysis,
          });
        }
      }, 5000); // Every 5 seconds
    });
  }

  analyzeNodeMemoryLeaks(metrics) {
    const analysis = {
      memoryGrowth: {},
      leakDetected: false,
      severity: 'none',
      recommendations: [],
    };

    if (metrics.length < 3) {
      analysis.error = 'Insufficient data for analysis';
      return analysis;
    }

    const initial = metrics[0];
    const final = metrics[metrics.length - 1];
    
    const heapGrowth = final.heapUsed - initial.heapUsed;
    const rssGrowth = final.rss - initial.rss;
    const externalGrowth = final.external - initial.external;

    analysis.memoryGrowth = {
      heap: {
        initial: initial.heapUsed,
        final: final.heapUsed,
        growth: heapGrowth,
        growthMB: heapGrowth / (1024 * 1024),
      },
      rss: {
        initial: initial.rss,
        final: final.rss,
        growth: rssGrowth,
        growthMB: rssGrowth / (1024 * 1024),
      },
      external: {
        initial: initial.external,
        final: final.external,
        growth: externalGrowth,
        growthMB: externalGrowth / (1024 * 1024),
      },
    };

    // Check for leaks
    const totalGrowthMB = (heapGrowth + rssGrowth) / (1024 * 1024);
    
    if (totalGrowthMB > this.leakThreshold) {
      analysis.leakDetected = true;
      analysis.severity = totalGrowthMB > this.leakThreshold * 2 ? 'severe' : 'moderate';
      
      analysis.recommendations.push({
        issue: 'Node.js memory growth detected',
        recommendation: 'Review server-side code for memory leaks in event emitters, timers, or database connections',
        priority: analysis.severity === 'severe' ? 'high' : 'medium',
      });
    }

    return analysis;
  }

  async performLongRunningUserScenarios() {
    console.log('Performing long-running user scenarios...');
    
    const scenarios = [
      {
        name: 'Continuous Dashboard Usage',
        duration: 180000, // 3 minutes
        actions: this.getDashboardActions(),
      },
      {
        name: 'Repetitive Form Interactions',
        duration: 120000, // 2 minutes
        actions: this.getFormActions(),
      },
      {
        name: 'Heavy Data Loading',
        duration: 150000, // 2.5 minutes
        actions: this.getDataLoadingActions(),
      },
    ];

    const scenarioResults = [];

    for (const scenario of scenarios) {
      console.log(`  Running scenario: ${scenario.name}`);
      const result = await this.runLongRunningScenario(scenario);
      scenarioResults.push(result);
    }

    return {
      type: 'long_running_scenarios',
      results: scenarioResults,
    };
  }

  getDashboardActions() {
    return [
      async (page) => {
        await page.goto(`${this.baseURL}/dashboard`, { waitUntil: 'networkidle2' });
      },
      async (page) => {
        await page.click('.nav-item').catch(() => {});
        await page.waitForTimeout(1000);
      },
      async (page) => {
        await page.reload({ waitUntil: 'networkidle2' });
      },
      async (page) => {
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        await page.waitForTimeout(500);
      },
    ];
  }

  getFormActions() {
    return [
      async (page) => {
        await page.goto(`${this.baseURL}/student/profile`, { waitUntil: 'networkidle2' });
      },
      async (page) => {
        await page.type('input[type="text"]', 'test input').catch(() => {});
        await page.waitForTimeout(500);
      },
      async (page) => {
        await page.click('button[type="submit"]').catch(() => {});
        await page.waitForTimeout(1000);
      },
      async (page) => {
        await page.evaluate(() => {
          document.querySelectorAll('input').forEach(input => input.value = '');
        });
      },
    ];
  }

  getDataLoadingActions() {
    return [
      async (page) => {
        await page.goto(`${this.baseURL}/admin/analytics`, { waitUntil: 'networkidle2' });
      },
      async (page) => {
        await page.click('.refresh-data').catch(() => {});
        await page.waitForTimeout(2000);
      },
      async (page) => {
        await page.click('.filter-option').catch(() => {});
        await page.waitForTimeout(1500);
      },
      async (page) => {
        await page.evaluate(() => {
          // Simulate data manipulation
          const charts = document.querySelectorAll('.chart');
          charts.forEach(chart => {
            chart.style.display = chart.style.display === 'none' ? 'block' : 'none';
          });
        });
      },
    ];
  }

  async runLongRunningScenario(scenario) {
    const page = await this.browser.newPage();
    const memoryMetrics = [];
    
    try {
      const startTime = Date.now();
      const actionInterval = 10000; // Every 10 seconds
      
      while (Date.now() - startTime < scenario.duration) {
        // Execute random action
        const randomAction = scenario.actions[Math.floor(Math.random() * scenario.actions.length)];
        await randomAction(page);
        
        // Capture memory snapshot
        const memorySnapshot = await this.captureMemorySnapshot(page);
        memoryMetrics.push(memorySnapshot);
        
        await page.waitForTimeout(actionInterval);
      }

      const analysis = this.analyzeLongRunningScenario(memoryMetrics);

      return {
        scenario: scenario.name,
        duration: scenario.duration,
        iterations: memoryMetrics.length,
        metrics: memoryMetrics,
        analysis: analysis,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      return {
        scenario: scenario.name,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    } finally {
      await page.close();
    }
  }

  analyzeLongRunningScenario(metrics) {
    const validMetrics = metrics.filter(m => !m.error && m.javascript);
    
    if (validMetrics.length < 3) {
      return { error: 'Insufficient data for analysis' };
    }

    const memoryValues = validMetrics.map(m => m.javascript.usedJSHeapSize);
    const trend = this.calculateMemoryTrend(validMetrics);
    
    const analysis = {
      memoryRange: {
        min: Math.min(...memoryValues),
        max: Math.max(...memoryValues),
        average: memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length,
      },
      trend: trend,
      memoryStability: this.calculateMemoryStability(memoryValues),
      recommendations: [],
    };

    // Generate recommendations
    if (trend.increasing && trend.rate > 2) {
      analysis.recommendations.push({
        issue: 'Memory continuously increasing during extended usage',
        recommendation: 'Investigate potential memory leaks in long-running operations',
        priority: 'high',
      });
    }

    if (analysis.memoryStability < 0.8) {
      analysis.recommendations.push({
        issue: 'High memory volatility detected',
        recommendation: 'Review memory allocation patterns and garbage collection efficiency',
        priority: 'medium',
      });
    }

    return analysis;
  }

  calculateMemoryStability(memoryValues) {
    if (memoryValues.length < 3) return 1;
    
    const mean = memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length;
    const variance = memoryValues.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / memoryValues.length;
    const stdDev = Math.sqrt(variance);
    
    // Stability score: 1 - (stdDev / mean)
    // Higher score means more stable memory usage
    return Math.max(0, 1 - (stdDev / mean));
  }

  generateMemoryReport(results) {
    const duration = (Date.now() - this.startTime) / 1000;
    
    const report = {
      testSuite: 'Memory Leak Detection',
      timestamp: new Date().toISOString(),
      duration: duration,
      configuration: {
        testDuration: this.testDuration,
        leakThreshold: this.leakThreshold,
        snapshotInterval: this.snapshotInterval,
      },
      results: results.map(result => 
        result.status === 'fulfilled' ? result.value : { error: result.reason.message }
      ),
      summary: this.generateMemorySummary(results),
      recommendations: this.generateMemoryRecommendations(results),
      riskLevel: this.calculateMemoryRiskLevel(results),
    };

    return report;
  }

  generateMemorySummary(results) {
    const summary = {
      totalTests: 0,
      leaksDetected: 0,
      severityDistribution: { none: 0, moderate: 0, severe: 0 },
      averageMemoryGrowth: 0,
      riskFactors: [],
    };

    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value.results) {
        result.value.results.forEach(test => {
          summary.totalTests++;
          
          if (test.leakAnalysis?.leakDetected || test.analysis?.leakDetected) {
            summary.leaksDetected++;
            const severity = test.leakAnalysis?.severity || test.analysis?.severity || 'none';
            summary.severityDistribution[severity]++;
          }
        });
      }
    });

    summary.leakRate = summary.totalTests > 0 ? 
      (summary.leaksDetected / summary.totalTests) * 100 : 0;

    return summary;
  }

  generateMemoryRecommendations(results) {
    const recommendations = [];
    
    // Collect all recommendations from test results
    const allRecommendations = [];
    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value.results) {
        result.value.results.forEach(test => {
          const testRecs = test.leakAnalysis?.recommendations || 
                          test.analysis?.recommendations || [];
          allRecommendations.push(...testRecs);
        });
      }
    });

    // Group recommendations by issue
    const groupedRecs = allRecommendations.reduce((acc, rec) => {
      if (!acc[rec.issue]) {
        acc[rec.issue] = {
          issue: rec.issue,
          recommendation: rec.recommendation,
          priority: rec.priority,
          occurrences: 0,
        };
      }
      acc[rec.issue].occurrences++;
      return acc;
    }, {});

    // Convert to array and sort by priority and occurrences
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const sortedRecs = Object.values(groupedRecs).sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      return priorityDiff !== 0 ? priorityDiff : b.occurrences - a.occurrences;
    });

    return sortedRecs;
  }

  calculateMemoryRiskLevel(results) {
    let riskScore = 0;
    let totalTests = 0;

    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value.results) {
        result.value.results.forEach(test => {
          totalTests++;
          
          const severity = test.leakAnalysis?.severity || test.analysis?.severity;
          switch (severity) {
            case 'severe':
              riskScore += 10;
              break;
            case 'moderate':
              riskScore += 5;
              break;
            default:
              riskScore += 0;
          }
        });
      }
    });

    const averageRisk = totalTests > 0 ? riskScore / totalTests : 0;
    
    if (averageRisk >= 7) return { level: 'high', score: averageRisk };
    if (averageRisk >= 3) return { level: 'medium', score: averageRisk };
    return { level: 'low', score: averageRisk };
  }

  async cleanup() {
    console.log('Cleaning up memory leak detector...');
    
    if (this.browser) {
      await this.browser.close();
    }
    
    // Clean up temporary files
    const tmpDir = './tmp';
    if (fs.existsSync(tmpDir)) {
      const files = fs.readdirSync(tmpDir);
      files.forEach(file => {
        if (file.startsWith('heap-') || file.startsWith('trace-')) {
          try {
            fs.unlinkSync(path.join(tmpDir, file));
          } catch (error) {
            // Ignore cleanup errors
          }
        }
      });
    }
    
    console.log('Memory leak detector cleanup completed');
  }
}

// Main execution
async function runMemoryLeakDetection() {
  const detector = new MemoryLeakDetector();
  
  try {
    await detector.initialize();
    const report = await detector.runMemoryLeakDetection();
    
    // Save report
    const reportPath = path.join(__dirname, '../../reports', `memory-leak-${Date.now()}.json`);
    const reportsDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Display summary
    console.log('\n=== Memory Leak Detection Results ===');
    console.log(`Test Duration: ${report.duration.toFixed(2)}s`);
    console.log(`Total Tests: ${report.summary.totalTests}`);
    console.log(`Leaks Detected: ${report.summary.leaksDetected}`);
    console.log(`Leak Rate: ${report.summary.leakRate.toFixed(1)}%`);
    console.log(`Risk Level: ${report.riskLevel.level} (${report.riskLevel.score.toFixed(1)})`);
    console.log('Severity Distribution:');
    console.log(`  Severe: ${report.summary.severityDistribution.severe}`);
    console.log(`  Moderate: ${report.summary.severityDistribution.moderate}`);
    console.log(`  None: ${report.summary.severityDistribution.none}`);
    
    if (report.recommendations.length > 0) {
      console.log('\n=== Recommendations ===');
      report.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. [${rec.priority}] ${rec.issue}`);
        console.log(`   ${rec.recommendation}`);
        console.log(`   Occurrences: ${rec.occurrences}\n`);
      });
    }
    
    console.log(`\nDetailed report saved to: ${reportPath}`);
    
  } catch (error) {
    console.error(`Memory leak detection failed: ${error.message}`);
    process.exit(1);
  } finally {
    await detector.cleanup();
  }
}

// Run if called directly
if (require.main === module) {
  runMemoryLeakDetection().catch(console.error);
}

module.exports = MemoryLeakDetector;