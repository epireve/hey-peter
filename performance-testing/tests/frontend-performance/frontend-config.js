// Frontend performance testing configuration
const dotenv = require('dotenv');
dotenv.config();

const frontendConfig = {
  // Base configuration
  baseURL: process.env.BASE_URL || 'http://localhost:3000',
  
  // Browser configuration
  browser: {
    headless: process.env.BROWSER_HEADLESS === 'true',
    viewport: {
      width: parseInt(process.env.BROWSER_VIEWPORT_WIDTH) || 1920,
      height: parseInt(process.env.BROWSER_VIEWPORT_HEIGHT) || 1080,
    },
    deviceScaleFactor: 1,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    networkConditions: {
      // Simulate different network conditions
      fast3G: {
        offline: false,
        downloadThroughput: 1.5 * 1024 * 1024 / 8, // 1.5 Mbps
        uploadThroughput: 750 * 1024 / 8, // 750 Kbps
        latency: 40, // 40ms
      },
      slow3G: {
        offline: false,
        downloadThroughput: 500 * 1024 / 8, // 500 Kbps
        uploadThroughput: 500 * 1024 / 8, // 500 Kbps
        latency: 400, // 400ms
      },
      wifi: {
        offline: false,
        downloadThroughput: 30 * 1024 * 1024 / 8, // 30 Mbps
        uploadThroughput: 15 * 1024 * 1024 / 8, // 15 Mbps
        latency: 2, // 2ms
      },
    },
  },
  
  // Performance thresholds based on Core Web Vitals
  thresholds: {
    fcp: parseFloat(process.env.FRONTEND_FCP_THRESHOLD) || 1.5, // First Contentful Paint (seconds)
    lcp: parseFloat(process.env.FRONTEND_LCP_THRESHOLD) || 2.5, // Largest Contentful Paint (seconds)
    fid: 100, // First Input Delay (milliseconds)
    cls: 0.1, // Cumulative Layout Shift
    tti: 3.5, // Time to Interactive (seconds)
    tbt: 200, // Total Blocking Time (milliseconds)
    si: 3.0, // Speed Index (seconds)
    // Performance score thresholds
    performanceScore: 90,
    accessibilityScore: 90,
    bestPracticesScore: 90,
    seoScore: 90,
  },
  
  // Test users for authenticated flows
  testUsers: {
    student: {
      email: 'perf.student@test.heypeter.com',
      password: 'TestPassword123!',
      role: 'student',
    },
    teacher: {
      email: 'perf.teacher@test.heypeter.com',
      password: 'TestPassword123!',
      role: 'teacher',
    },
    admin: {
      email: 'perf.admin@test.heypeter.com',
      password: 'TestPassword123!',
      role: 'admin',
    },
  },
  
  // Pages to test with scenarios
  pages: {
    // Public pages
    public: [
      {
        name: 'Homepage',
        url: '/',
        description: 'Landing page performance',
        scenarios: ['initial_load', 'navigation'],
        critical: true,
      },
      {
        name: 'Login Page',
        url: '/login',
        description: 'Authentication page performance',
        scenarios: ['initial_load', 'form_interaction'],
        critical: true,
      },
      {
        name: 'Signup Page',
        url: '/signup',
        description: 'Registration page performance',
        scenarios: ['initial_load', 'form_interaction'],
        critical: false,
      },
    ],
    
    // Student pages
    student: [
      {
        name: 'Student Dashboard',
        url: '/student',
        description: 'Main student interface',
        scenarios: ['initial_load', 'data_loading', 'interaction'],
        critical: true,
        authRequired: true,
        role: 'student',
      },
      {
        name: 'Class Booking',
        url: '/student/booking',
        description: 'Class booking interface',
        scenarios: ['initial_load', 'search_interaction', 'booking_flow'],
        critical: true,
        authRequired: true,
        role: 'student',
      },
      {
        name: 'Student Profile',
        url: '/student/profile',
        description: 'Student profile management',
        scenarios: ['initial_load', 'form_interaction'],
        critical: false,
        authRequired: true,
        role: 'student',
      },
    ],
    
    // Teacher pages
    teacher: [
      {
        name: 'Teacher Dashboard',
        url: '/teacher',
        description: 'Main teacher interface',
        scenarios: ['initial_load', 'data_loading', 'interaction'],
        critical: true,
        authRequired: true,
        role: 'teacher',
      },
      {
        name: 'Teacher Schedule',
        url: '/teacher/schedule',
        description: 'Schedule management interface',
        scenarios: ['initial_load', 'calendar_interaction'],
        critical: true,
        authRequired: true,
        role: 'teacher',
      },
      {
        name: 'Teacher Analytics',
        url: '/teacher/analytics',
        description: 'Teacher performance analytics',
        scenarios: ['initial_load', 'chart_interaction'],
        critical: false,
        authRequired: true,
        role: 'teacher',
      },
    ],
    
    // Admin pages
    admin: [
      {
        name: 'Admin Dashboard',
        url: '/admin',
        description: 'Main admin interface',
        scenarios: ['initial_load', 'data_loading', 'interaction'],
        critical: true,
        authRequired: true,
        role: 'admin',
      },
      {
        name: 'User Management',
        url: '/admin/users',
        description: 'User management interface',
        scenarios: ['initial_load', 'table_interaction', 'bulk_operations'],
        critical: true,
        authRequired: true,
        role: 'admin',
      },
      {
        name: 'System Analytics',
        url: '/admin/analytics',
        description: 'System-wide analytics',
        scenarios: ['initial_load', 'chart_interaction', 'data_export'],
        critical: false,
        authRequired: true,
        role: 'admin',
      },
    ],
  },
  
  // Test scenarios
  scenarios: {
    initial_load: {
      name: 'Initial Page Load',
      description: 'Measure initial page load performance',
      steps: [
        { action: 'navigate', target: 'page_url' },
        { action: 'wait', target: 'networkidle2' },
      ],
    },
    
    navigation: {
      name: 'Navigation Performance',
      description: 'Test navigation between pages',
      steps: [
        { action: 'navigate', target: 'page_url' },
        { action: 'wait', target: 'networkidle2' },
        { action: 'click', target: 'nav_link', wait: 1000 },
        { action: 'wait', target: 'networkidle2' },
      ],
    },
    
    form_interaction: {
      name: 'Form Interaction',
      description: 'Test form filling and submission performance',
      steps: [
        { action: 'navigate', target: 'page_url' },
        { action: 'wait', target: 'networkidle2' },
        { action: 'type', target: 'input[type="email"]', value: 'test@example.com' },
        { action: 'type', target: 'input[type="password"]', value: 'password123' },
        { action: 'click', target: 'button[type="submit"]' },
        { action: 'wait', target: 'networkidle2' },
      ],
    },
    
    data_loading: {
      name: 'Data Loading Performance',
      description: 'Test performance with dynamic data loading',
      steps: [
        { action: 'navigate', target: 'page_url' },
        { action: 'wait', target: 'networkidle2' },
        { action: 'scroll', target: 'bottom' },
        { action: 'wait', target: 1000 },
      ],
    },
    
    interaction: {
      name: 'User Interaction',
      description: 'Test interactive element performance',
      steps: [
        { action: 'navigate', target: 'page_url' },
        { action: 'wait', target: 'networkidle2' },
        { action: 'click', target: 'button, .clickable', wait: 500 },
        { action: 'hover', target: '.hover-element', wait: 300 },
        { action: 'scroll', target: 'bottom' },
      ],
    },
    
    search_interaction: {
      name: 'Search Interaction',
      description: 'Test search functionality performance',
      steps: [
        { action: 'navigate', target: 'page_url' },
        { action: 'wait', target: 'networkidle2' },
        { action: 'type', target: 'input[type="search"], .search-input', value: 'English' },
        { action: 'wait', target: 1000 },
        { action: 'click', target: '.search-result:first-child' },
        { action: 'wait', target: 'networkidle2' },
      ],
    },
    
    booking_flow: {
      name: 'Booking Flow',
      description: 'Test class booking flow performance',
      steps: [
        { action: 'navigate', target: 'page_url' },
        { action: 'wait', target: 'networkidle2' },
        { action: 'click', target: '.available-class:first-child' },
        { action: 'wait', target: 1000 },
        { action: 'click', target: '.confirm-booking' },
        { action: 'wait', target: 'networkidle2' },
      ],
    },
    
    calendar_interaction: {
      name: 'Calendar Interaction',
      description: 'Test calendar widget performance',
      steps: [
        { action: 'navigate', target: 'page_url' },
        { action: 'wait', target: 'networkidle2' },
        { action: 'click', target: '.calendar-day' },
        { action: 'wait', target: 500 },
        { action: 'click', target: '.next-month' },
        { action: 'wait', target: 1000 },
      ],
    },
    
    chart_interaction: {
      name: 'Chart Interaction',
      description: 'Test chart and analytics performance',
      steps: [
        { action: 'navigate', target: 'page_url' },
        { action: 'wait', target: 'networkidle2' },
        { action: 'hover', target: '.chart-element' },
        { action: 'wait', target: 500 },
        { action: 'click', target: '.chart-filter' },
        { action: 'wait', target: 1000 },
      ],
    },
    
    table_interaction: {
      name: 'Table Interaction',
      description: 'Test data table performance',
      steps: [
        { action: 'navigate', target: 'page_url' },
        { action: 'wait', target: 'networkidle2' },
        { action: 'click', target: 'th.sortable:first-child' },
        { action: 'wait', target: 1000 },
        { action: 'type', target: '.filter-input', value: 'test' },
        { action: 'wait', target: 1000 },
      ],
    },
    
    bulk_operations: {
      name: 'Bulk Operations',
      description: 'Test bulk operation performance',
      steps: [
        { action: 'navigate', target: 'page_url' },
        { action: 'wait', target: 'networkidle2' },
        { action: 'click', target: 'input[type=\"checkbox\"]:nth-child(1)' },
        { action: 'click', target: 'input[type=\"checkbox\"]:nth-child(2)' },
        { action: 'click', target: '.bulk-action-button' },
        { action: 'wait', target: 2000 },
      ],
    },
    
    data_export: {
      name: 'Data Export',
      description: 'Test data export performance',
      steps: [
        { action: 'navigate', target: 'page_url' },
        { action: 'wait', target: 'networkidle2' },
        { action: 'click', target: '.export-button' },
        { action: 'wait', target: 3000 },
      ],
    },
  },
  
  // Lighthouse configuration
  lighthouse: {
    extends: 'lighthouse:default',
    settings: {
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      formFactor: 'desktop',
      throttling: {
        rttMs: 40,
        throughputKbps: 10240,
        cpuSlowdownMultiplier: 1,
        requestLatencyMs: 0,
        downloadThroughputKbps: 0,
        uploadThroughputKbps: 0,
      },
      screenEmulation: {
        mobile: false,
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1,
        disabled: false,
      },
      emulatedUserAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  },
  
  // Test execution configuration
  execution: {
    iterations: 3, // Number of times to run each test
    warmupRuns: 1, // Number of warmup runs before actual measurement
    timeout: 60000, // Test timeout in milliseconds
    retries: 2, // Number of retries on failure
    concurrency: 1, // Number of concurrent tests (keep low for accurate measurements)
  },
  
  // Reporting configuration
  reporting: {
    formats: ['html', 'json'],
    includeScreenshots: true,
    includeTraces: false, // Set to true for detailed performance traces
    includeDevtoolsLog: false,
  },
};

module.exports = frontendConfig;