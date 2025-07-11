const lighthouse = require('lighthouse');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const frontendConfig = require('./frontend-config');

class LighthousePerformanceSuite {
  constructor() {
    this.browser = null;
    this.results = [];
    this.authSessions = new Map();
    this.startTime = null;
  }

  async initialize() {
    console.log('Initializing Lighthouse performance suite...');
    
    // Launch browser
    this.browser = await puppeteer.launch({
      headless: frontendConfig.browser.headless,
      defaultViewport: frontendConfig.browser.viewport,
      userDataDir: './tmp/chrome-user-data',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-background-networking',
        '--disable-background-media-suspend',
        '--disable-backgrounding-occluded-windows',
        '--disable-backgrounding-occluded-windows',
        '--remote-debugging-port=9222',
      ],
    });

    // Verify application accessibility
    await this.verifyApplicationAccessibility();
    
    // Authenticate test users
    await this.authenticateTestUsers();
    
    console.log('Lighthouse suite initialized successfully');
  }

  async verifyApplicationAccessibility() {
    const page = await this.browser.newPage();
    
    try {
      console.log('Verifying application accessibility...');
      const response = await page.goto(frontendConfig.baseURL, { 
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

  async authenticateTestUsers() {
    console.log('Authenticating test users...');
    
    for (const [role, userData] of Object.entries(frontendConfig.testUsers)) {
      try {
        const page = await this.browser.newPage();
        
        // Navigate to login page
        await page.goto(`${frontendConfig.baseURL}/login`, { 
          waitUntil: 'networkidle2' 
        });
        
        // Fill login form
        await page.type('input[type="email"], input[name="email"]', userData.email);
        await page.type('input[type="password"], input[name="password"]', userData.password);
        
        // Submit form
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle2' }),
          page.click('button[type="submit"], .submit-button, .login-button'),
        ]);
        
        // Store session
        const cookies = await page.cookies();
        this.authSessions.set(role, cookies);
        
        console.log(`  ✓ Authenticated ${role} user`);
        await page.close();
        
      } catch (error) {
        console.warn(`  ⚠ Failed to authenticate ${role}: ${error.message}`);
      }
    }
  }

  async runFullPerformanceSuite() {
    console.log('Starting comprehensive frontend performance testing...');
    this.startTime = Date.now();

    // Test all page categories
    const pageCategories = Object.keys(frontendConfig.pages);
    
    for (const category of pageCategories) {
      console.log(`\nTesting ${category} pages...`);
      await this.testPageCategory(category);
    }

    // Run network condition tests
    await this.runNetworkConditionTests();
    
    // Generate comprehensive report
    const report = this.generateReport();
    
    console.log('Frontend performance testing completed');
    return report;
  }

  async testPageCategory(category) {
    const pages = frontendConfig.pages[category];
    
    for (const pageConfig of pages) {
      console.log(`  Testing: ${pageConfig.name}`);
      
      // Run each scenario for the page
      for (const scenarioName of pageConfig.scenarios) {
        await this.runPageScenario(pageConfig, scenarioName, category);
      }
    }
  }

  async runPageScenario(pageConfig, scenarioName, category) {
    const scenario = frontendConfig.scenarios[scenarioName];
    if (!scenario) {
      console.warn(`    ⚠ Scenario '${scenarioName}' not found`);
      return;
    }

    console.log(`    Running scenario: ${scenario.name}`);
    
    const testResults = [];
    
    // Run multiple iterations for consistency
    for (let iteration = 0; iteration < frontendConfig.execution.iterations; iteration++) {
      try {
        const result = await this.runSingleTest(pageConfig, scenario, category, iteration);
        testResults.push(result);
      } catch (error) {
        console.error(`      Error in iteration ${iteration + 1}: ${error.message}`);
        testResults.push({
          iteration: iteration + 1,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Calculate averages and store results
    const aggregatedResult = this.aggregateTestResults(testResults, pageConfig, scenario);
    this.results.push(aggregatedResult);
  }

  async runSingleTest(pageConfig, scenario, category, iteration) {
    const page = await this.browser.newPage();
    
    try {
      // Set up authentication if required
      if (pageConfig.authRequired && this.authSessions.has(pageConfig.role)) {
        const cookies = this.authSessions.get(pageConfig.role);
        await page.setCookie(...cookies);
      }

      // Set up performance monitoring
      await page.setCacheEnabled(false);
      
      // Start performance measurement
      const performanceMetrics = await this.measurePagePerformance(
        page, 
        pageConfig, 
        scenario
      );

      // Run Lighthouse audit
      const lighthouseResults = await this.runLighthouseAudit(
        `${frontendConfig.baseURL}${pageConfig.url}`,
        pageConfig.authRequired ? pageConfig.role : null
      );

      return {
        iteration: iteration + 1,
        timestamp: new Date().toISOString(),
        pageConfig: pageConfig,
        scenario: scenario.name,
        performance: performanceMetrics,
        lighthouse: lighthouseResults,
      };
      
    } finally {
      await page.close();
    }
  }

  async measurePagePerformance(page, pageConfig, scenario) {
    const metrics = {
      navigation: {},
      userTiming: {},
      runtime: {},
      memory: {},
    };

    // Enable performance monitoring
    await page.tracing.start({ 
      path: `./tmp/trace-${Date.now()}.json`,
      screenshots: true 
    });

    const startTime = Date.now();
    
    try {
      // Execute scenario steps
      for (const step of scenario.steps) {
        await this.executeScenarioStep(page, step, pageConfig);
      }

      // Collect performance metrics
      const navigationMetrics = await page.metrics();
      const performanceEntries = await page.evaluate(() => {
        return {
          navigation: performance.getEntriesByType('navigation')[0],
          paint: performance.getEntriesByType('paint'),
          measure: performance.getEntriesByType('measure'),
          resource: performance.getEntriesByType('resource').length,
        };
      });

      metrics.navigation = {
        ...navigationMetrics,
        loadTime: Date.now() - startTime,
      };

      metrics.userTiming = performanceEntries;

      // Get Core Web Vitals
      const webVitals = await page.evaluate(() => {
        return new Promise((resolve) => {
          const vitals = {};
          
          // FCP - First Contentful Paint
          const fcpEntry = performance.getEntriesByType('paint')
            .find(entry => entry.name === 'first-contentful-paint');
          if (fcpEntry) vitals.fcp = fcpEntry.startTime;

          // LCP - Largest Contentful Paint
          if ('PerformanceObserver' in window) {
            new PerformanceObserver((list) => {
              const entries = list.getEntries();
              if (entries.length > 0) {
                vitals.lcp = entries[entries.length - 1].startTime;
              }
            }).observe({ entryTypes: ['largest-contentful-paint'] });
          }

          // CLS - Cumulative Layout Shift
          let clsScore = 0;
          if ('PerformanceObserver' in window) {
            new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                if (!entry.hadRecentInput) {
                  clsScore += entry.value;
                }
              }
              vitals.cls = clsScore;
            }).observe({ entryTypes: ['layout-shift'] });
          }

          // FID - First Input Delay (simulated)
          vitals.fid = 0; // Would be measured with real user interaction

          setTimeout(() => resolve(vitals), 1000);
        });
      });

      metrics.webVitals = webVitals;

      // Memory usage
      const memoryInfo = await page.evaluate(() => {
        if ('memory' in performance) {
          return {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
          };
        }
        return {};
      });

      metrics.memory = memoryInfo;

    } finally {
      await page.tracing.stop();
    }

    return metrics;
  }

  async executeScenarioStep(page, step, pageConfig) {
    const { action, target, value, wait } = step;
    
    try {
      switch (action) {
        case 'navigate':
          const url = target === 'page_url' ? 
            `${frontendConfig.baseURL}${pageConfig.url}` : 
            target;
          await page.goto(url, { waitUntil: 'networkidle2' });
          break;
          
        case 'wait':
          if (typeof target === 'number') {
            await page.waitForTimeout(target);
          } else {
            await page.waitForLoadState(target);
          }
          break;
          
        case 'click':
          await page.click(target);
          if (wait) await page.waitForTimeout(wait);
          break;
          
        case 'type':
          await page.type(target, value);
          if (wait) await page.waitForTimeout(wait);
          break;
          
        case 'hover':
          await page.hover(target);
          if (wait) await page.waitForTimeout(wait);
          break;
          
        case 'scroll':
          if (target === 'bottom') {
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          } else {
            await page.evaluate((selector) => {
              document.querySelector(selector)?.scrollIntoView();
            }, target);
          }
          if (wait) await page.waitForTimeout(wait);
          break;
          
        default:
          console.warn(`Unknown action: ${action}`);
      }
    } catch (error) {
      console.warn(`Step execution warning: ${error.message}`);
    }
  }

  async runLighthouseAudit(url, authRole = null) {
    try {
      const options = {
        logLevel: 'error',
        output: 'json',
        onlyCategories: frontendConfig.lighthouse.settings.onlyCategories,
        settings: frontendConfig.lighthouse.settings,
        port: 9222,
      };

      // Add authentication if required
      if (authRole && this.authSessions.has(authRole)) {
        const cookies = this.authSessions.get(authRole);
        options.extraHeaders = {
          Cookie: cookies.map(c => `${c.name}=${c.value}`).join('; ')
        };
      }

      const result = await lighthouse(url, options);
      
      return {
        url: url,
        scores: {
          performance: result.lhr.categories.performance.score * 100,
          accessibility: result.lhr.categories.accessibility.score * 100,
          bestPractices: result.lhr.categories['best-practices'].score * 100,
          seo: result.lhr.categories.seo.score * 100,
        },
        metrics: {
          fcp: result.lhr.audits['first-contentful-paint'].numericValue,
          lcp: result.lhr.audits['largest-contentful-paint'].numericValue,
          tti: result.lhr.audits['interactive'].numericValue,
          tbt: result.lhr.audits['total-blocking-time'].numericValue,
          cls: result.lhr.audits['cumulative-layout-shift'].numericValue,
          si: result.lhr.audits['speed-index'].numericValue,
        },
        diagnostics: this.extractDiagnostics(result.lhr),
      };
      
    } catch (error) {
      console.error(`Lighthouse audit failed for ${url}: ${error.message}`);
      return {
        url: url,
        error: error.message,
      };
    }
  }

  extractDiagnostics(lhr) {
    const diagnostics = {};
    
    // Extract key diagnostic information
    const diagnosticAudits = [
      'unused-javascript',
      'unused-css-rules',
      'render-blocking-resources',
      'eliminate-render-blocking-resources',
      'reduce-unused-javascript',
      'reduce-unused-css',
      'efficient-animated-content',
      'offscreen-images',
      'unminified-css',
      'unminified-javascript',
    ];

    diagnosticAudits.forEach(auditId => {
      const audit = lhr.audits[auditId];
      if (audit && audit.details) {
        diagnostics[auditId] = {
          score: audit.score,
          savings: audit.details.overallSavingsMs || audit.details.overallSavingsBytes,
          items: audit.details.items?.slice(0, 5), // Top 5 items
        };
      }
    });

    return diagnostics;
  }

  async runNetworkConditionTests() {
    console.log('\nTesting under different network conditions...');
    
    const networkConditions = Object.keys(frontendConfig.browser.networkConditions);
    const criticalPages = this.getCriticalPages();
    
    for (const condition of networkConditions) {
      console.log(`  Testing with ${condition} network...`);
      
      for (const pageConfig of criticalPages) {
        await this.testPageWithNetworkCondition(pageConfig, condition);
      }
    }
  }

  getCriticalPages() {
    const criticalPages = [];
    
    Object.values(frontendConfig.pages).forEach(pageArray => {
      pageArray.forEach(page => {
        if (page.critical) {
          criticalPages.push(page);
        }
      });
    });
    
    return criticalPages;
  }

  async testPageWithNetworkCondition(pageConfig, networkCondition) {
    const page = await this.browser.newPage();
    
    try {
      // Set network conditions
      const cdp = await page.target().createCDPSession();
      await cdp.send('Network.enable');
      await cdp.send('Network.emulateNetworkConditions', 
        frontendConfig.browser.networkConditions[networkCondition]
      );

      // Set up authentication if required
      if (pageConfig.authRequired && this.authSessions.has(pageConfig.role)) {
        const cookies = this.authSessions.get(pageConfig.role);
        await page.setCookie(...cookies);
      }

      const startTime = Date.now();
      
      // Navigate and measure
      await page.goto(`${frontendConfig.baseURL}${pageConfig.url}`, { 
        waitUntil: 'networkidle2',
        timeout: 60000 
      });
      
      const loadTime = Date.now() - startTime;
      
      // Get basic metrics
      const metrics = await page.metrics();
      
      const networkTestResult = {
        page: pageConfig.name,
        networkCondition: networkCondition,
        loadTime: loadTime,
        metrics: metrics,
        timestamp: new Date().toISOString(),
      };

      this.results.push({
        type: 'network_condition_test',
        ...networkTestResult,
      });
      
      console.log(`    ${pageConfig.name}: ${loadTime}ms`);
      
    } catch (error) {
      console.error(`    Error testing ${pageConfig.name} with ${networkCondition}: ${error.message}`);
    } finally {
      await page.close();
    }
  }

  aggregateTestResults(testResults, pageConfig, scenario) {
    const validResults = testResults.filter(r => !r.error);
    
    if (validResults.length === 0) {
      return {
        page: pageConfig.name,
        scenario: scenario.name,
        error: 'All test iterations failed',
        results: testResults,
      };
    }

    // Calculate averages
    const avgMetrics = this.calculateAverageMetrics(validResults);
    
    // Check thresholds
    const thresholdViolations = this.checkPerformanceThresholds(avgMetrics);
    
    return {
      page: pageConfig.name,
      url: pageConfig.url,
      scenario: scenario.name,
      description: scenario.description,
      critical: pageConfig.critical,
      authRequired: pageConfig.authRequired,
      iterations: validResults.length,
      totalIterations: testResults.length,
      averages: avgMetrics,
      thresholdViolations: thresholdViolations,
      rawResults: testResults,
      timestamp: new Date().toISOString(),
    };
  }

  calculateAverageMetrics(results) {
    const metrics = {
      lighthouse: {
        scores: { performance: 0, accessibility: 0, bestPractices: 0, seo: 0 },
        metrics: { fcp: 0, lcp: 0, tti: 0, tbt: 0, cls: 0, si: 0 },
      },
      webVitals: { fcp: 0, lcp: 0, cls: 0, fid: 0 },
      navigation: { loadTime: 0 },
    };

    results.forEach(result => {
      if (result.lighthouse && !result.lighthouse.error) {
        Object.keys(metrics.lighthouse.scores).forEach(key => {
          metrics.lighthouse.scores[key] += result.lighthouse.scores[key] || 0;
        });
        
        Object.keys(metrics.lighthouse.metrics).forEach(key => {
          metrics.lighthouse.metrics[key] += result.lighthouse.metrics[key] || 0;
        });
      }

      if (result.performance?.webVitals) {
        Object.keys(metrics.webVitals).forEach(key => {
          metrics.webVitals[key] += result.performance.webVitals[key] || 0;
        });
      }

      if (result.performance?.navigation) {
        metrics.navigation.loadTime += result.performance.navigation.loadTime || 0;
      }
    });

    // Calculate averages
    const count = results.length;
    Object.keys(metrics.lighthouse.scores).forEach(key => {
      metrics.lighthouse.scores[key] = metrics.lighthouse.scores[key] / count;
    });
    
    Object.keys(metrics.lighthouse.metrics).forEach(key => {
      metrics.lighthouse.metrics[key] = metrics.lighthouse.metrics[key] / count;
    });
    
    Object.keys(metrics.webVitals).forEach(key => {
      metrics.webVitals[key] = metrics.webVitals[key] / count;
    });
    
    metrics.navigation.loadTime = metrics.navigation.loadTime / count;

    return metrics;
  }

  checkPerformanceThresholds(metrics) {
    const violations = [];
    const thresholds = frontendConfig.thresholds;
    
    // Check Lighthouse scores
    if (metrics.lighthouse.scores.performance < thresholds.performanceScore) {
      violations.push({
        metric: 'Performance Score',
        actual: metrics.lighthouse.scores.performance,
        threshold: thresholds.performanceScore,
        severity: 'high',
      });
    }

    // Check Core Web Vitals
    if (metrics.lighthouse.metrics.fcp / 1000 > thresholds.fcp) {
      violations.push({
        metric: 'First Contentful Paint',
        actual: metrics.lighthouse.metrics.fcp / 1000,
        threshold: thresholds.fcp,
        severity: 'medium',
      });
    }

    if (metrics.lighthouse.metrics.lcp / 1000 > thresholds.lcp) {
      violations.push({
        metric: 'Largest Contentful Paint',
        actual: metrics.lighthouse.metrics.lcp / 1000,
        threshold: thresholds.lcp,
        severity: 'high',
      });
    }

    if (metrics.lighthouse.metrics.tti / 1000 > thresholds.tti) {
      violations.push({
        metric: 'Time to Interactive',
        actual: metrics.lighthouse.metrics.tti / 1000,
        threshold: thresholds.tti,
        severity: 'high',
      });
    }

    if (metrics.lighthouse.metrics.cls > thresholds.cls) {
      violations.push({
        metric: 'Cumulative Layout Shift',
        actual: metrics.lighthouse.metrics.cls,
        threshold: thresholds.cls,
        severity: 'medium',
      });
    }

    return violations;
  }

  generateReport() {
    const duration = (Date.now() - this.startTime) / 1000;
    
    const pageTests = this.results.filter(r => r.type !== 'network_condition_test');
    const networkTests = this.results.filter(r => r.type === 'network_condition_test');
    
    const report = {
      testSuite: 'Frontend Performance Testing',
      timestamp: new Date().toISOString(),
      duration: duration,
      configuration: {
        baseURL: frontendConfig.baseURL,
        iterations: frontendConfig.execution.iterations,
        thresholds: frontendConfig.thresholds,
      },
      summary: this.generateSummary(pageTests),
      results: {
        pageTests: pageTests,
        networkTests: networkTests,
      },
      recommendations: this.generateRecommendations(pageTests),
      performanceGrade: this.calculatePerformanceGrade(pageTests),
    };

    return report;
  }

  generateSummary(pageTests) {
    const validTests = pageTests.filter(t => !t.error);
    const criticalTests = validTests.filter(t => t.critical);
    
    const summary = {
      totalTests: pageTests.length,
      successfulTests: validTests.length,
      criticalTests: criticalTests.length,
      thresholdViolations: 0,
      averageScores: {
        performance: 0,
        accessibility: 0,
        bestPractices: 0,
        seo: 0,
      },
    };

    validTests.forEach(test => {
      summary.thresholdViolations += test.thresholdViolations?.length || 0;
      
      if (test.averages?.lighthouse?.scores) {
        Object.keys(summary.averageScores).forEach(key => {
          summary.averageScores[key] += test.averages.lighthouse.scores[key] || 0;
        });
      }
    });

    // Calculate averages
    if (validTests.length > 0) {
      Object.keys(summary.averageScores).forEach(key => {
        summary.averageScores[key] = summary.averageScores[key] / validTests.length;
      });
    }

    return summary;
  }

  generateRecommendations(pageTests) {
    const recommendations = [];
    const allViolations = [];
    
    pageTests.forEach(test => {
      if (test.thresholdViolations) {
        test.thresholdViolations.forEach(violation => {
          allViolations.push({
            page: test.page,
            ...violation,
          });
        });
      }
    });

    // Group violations by metric
    const violationsByMetric = allViolations.reduce((acc, violation) => {
      if (!acc[violation.metric]) {
        acc[violation.metric] = [];
      }
      acc[violation.metric].push(violation);
      return acc;
    }, {});

    // Generate recommendations
    Object.entries(violationsByMetric).forEach(([metric, violations]) => {
      switch (metric) {
        case 'Performance Score':
          recommendations.push({
            category: 'Performance',
            priority: 'High',
            issue: `Performance scores below threshold in ${violations.length} pages`,
            recommendation: 'Optimize JavaScript bundles, images, and critical rendering path',
            affectedPages: violations.map(v => v.page),
          });
          break;
          
        case 'First Contentful Paint':
          recommendations.push({
            category: 'Loading',
            priority: 'Medium',
            issue: `Slow First Contentful Paint in ${violations.length} pages`,
            recommendation: 'Optimize critical resources and implement resource preloading',
            affectedPages: violations.map(v => v.page),
          });
          break;
          
        case 'Largest Contentful Paint':
          recommendations.push({
            category: 'Loading',
            priority: 'High',
            issue: `Slow Largest Contentful Paint in ${violations.length} pages`,
            recommendation: 'Optimize images, fonts, and above-the-fold content',
            affectedPages: violations.map(v => v.page),
          });
          break;
          
        case 'Cumulative Layout Shift':
          recommendations.push({
            category: 'Stability',
            priority: 'Medium',
            issue: `Layout instability detected in ${violations.length} pages`,
            recommendation: 'Add size attributes to images and reserve space for dynamic content',
            affectedPages: violations.map(v => v.page),
          });
          break;
      }
    });

    return recommendations;
  }

  calculatePerformanceGrade(pageTests) {
    const validTests = pageTests.filter(t => !t.error && t.averages?.lighthouse?.scores);
    
    if (validTests.length === 0) {
      return { score: 0, grade: 'F', description: 'No valid test results' };
    }

    const totalScore = validTests.reduce((sum, test) => {
      return sum + test.averages.lighthouse.scores.performance;
    }, 0);
    
    const avgScore = totalScore / validTests.length;
    
    if (avgScore >= 90) return { score: avgScore, grade: 'A', description: 'Excellent' };
    if (avgScore >= 80) return { score: avgScore, grade: 'B', description: 'Good' };
    if (avgScore >= 70) return { score: avgScore, grade: 'C', description: 'Fair' };
    if (avgScore >= 60) return { score: avgScore, grade: 'D', description: 'Poor' };
    return { score: avgScore, grade: 'F', description: 'Failing' };
  }

  async cleanup() {
    console.log('Cleaning up frontend performance suite...');
    
    if (this.browser) {
      await this.browser.close();
    }
    
    // Clean up temporary files
    const tmpDir = './tmp';
    if (fs.existsSync(tmpDir)) {
      const files = fs.readdirSync(tmpDir);
      files.forEach(file => {
        if (file.startsWith('trace-') || file.startsWith('chrome-user-data')) {
          try {
            fs.unlinkSync(path.join(tmpDir, file));
          } catch (error) {
            // Ignore cleanup errors
          }
        }
      });
    }
    
    console.log('Cleanup completed');
  }
}

// Main execution
async function runLighthousePerformanceSuite() {
  const suite = new LighthousePerformanceSuite();
  
  try {
    await suite.initialize();
    const report = await suite.runFullPerformanceSuite();
    
    // Save report
    const reportPath = path.join(__dirname, '../../reports', `frontend-performance-${Date.now()}.json`);
    const reportsDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Display summary
    console.log('\n=== Frontend Performance Test Results ===');
    console.log(`Test Duration: ${report.duration.toFixed(2)}s`);
    console.log(`Total Tests: ${report.summary.totalTests}`);
    console.log(`Successful Tests: ${report.summary.successfulTests}`);
    console.log(`Threshold Violations: ${report.summary.thresholdViolations}`);
    console.log(`Performance Grade: ${report.performanceGrade.grade} (${report.performanceGrade.score.toFixed(1)}/100)`);
    console.log('Average Scores:');
    console.log(`  Performance: ${report.summary.averageScores.performance.toFixed(1)}`);
    console.log(`  Accessibility: ${report.summary.averageScores.accessibility.toFixed(1)}`);
    console.log(`  Best Practices: ${report.summary.averageScores.bestPractices.toFixed(1)}`);
    console.log(`  SEO: ${report.summary.averageScores.seo.toFixed(1)}`);
    
    if (report.recommendations.length > 0) {
      console.log('\n=== Recommendations ===');
      report.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. [${rec.priority}] ${rec.issue}`);
        console.log(`   ${rec.recommendation}`);
        if (rec.affectedPages) {
          console.log(`   Affected: ${rec.affectedPages.join(', ')}`);
        }
        console.log('');
      });
    }
    
    console.log(`\nDetailed report saved to: ${reportPath}`);
    
  } catch (error) {
    console.error(`Frontend performance suite failed: ${error.message}`);
    process.exit(1);
  } finally {
    await suite.cleanup();
  }
}

// Run if called directly
if (require.main === module) {
  runLighthousePerformanceSuite().catch(console.error);
}

module.exports = LighthousePerformanceSuite;