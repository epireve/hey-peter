import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { 
  baseConfig, 
  loadTestStages, 
  sleepDurations 
} from '../config/test-config.js';
import { 
  authenticateUser, 
  getAuthenticatedRequestOptions,
  getRandomUser 
} from '../utils/auth-utils.js';

// Custom metrics for admin scenarios
const adminLoginFailures = new Counter('admin_login_failures');
const userManagementRate = new Rate('user_management_success_rate');
const analyticsLoadTime = new Trend('analytics_load_time');
const reportGenerationTime = new Trend('report_generation_time');
const bulkOperationTime = new Trend('bulk_operation_time');

export let options = {
  stages: loadTestStages,
  thresholds: {
    ...baseConfig.thresholds,
    admin_login_failures: ['count<3'],
    user_management_success_rate: ['rate>0.98'],
    analytics_load_time: ['p(95)<3000'],
    report_generation_time: ['p(95)<5000'],
    bulk_operation_time: ['p(95)<10000'],
  },
  tags: {
    testType: 'admin_load',
    userType: 'admin',
  },
};

export function setup() {
  console.log('Setting up admin load test...');
  console.log(`Base URL: ${baseConfig.baseURL}`);
  console.log(`Max concurrent users: ${baseConfig.maxUsers}`);
  
  // Verify application is accessible
  const healthCheck = http.get(`${baseConfig.baseURL}/api/health`);
  if (!check(healthCheck, { 'application accessible': (r) => r.status === 200 })) {
    throw new Error('Application is not accessible');
  }
  
  return { 
    testStartTime: new Date().toISOString(),
    baseURL: baseConfig.baseURL 
  };
}

export default function adminLoadTest(data) {
  const user = getRandomUser('admin');
  let sessionData = null;

  try {
    // 1. Authenticate as admin
    sessionData = authenticateUser(user);
    if (!sessionData) {
      adminLoginFailures.add(1);
      return;
    }

    const authOptions = getAuthenticatedRequestOptions(sessionData);

    // 2. Load admin dashboard
    const dashboardResponse = http.get(
      `${baseConfig.baseURL}/admin`,
      authOptions
    );
    
    check(dashboardResponse, {
      'admin dashboard loaded': (r) => r.status === 200,
      'dashboard content present': (r) => r.body.includes('admin') || r.body.includes('dashboard'),
      'dashboard response time < 2s': (r) => r.timings.duration < 2000,
    });
    
    sleep(sleepDurations.medium);

    // 3. Load system analytics
    const analyticsStart = Date.now();
    const analyticsResponse = http.get(
      `${baseConfig.apiBaseURL}/admin/analytics`,
      authOptions
    );
    
    const analyticsSuccess = check(analyticsResponse, {
      'analytics loaded': (r) => r.status === 200,
      'analytics data present': (r) => {
        try {
          const data = JSON.parse(r.body);
          return data && (data.users || data.metrics);
        } catch {
          return false;
        }
      },
    });
    
    if (analyticsSuccess) {
      analyticsLoadTime.add(Date.now() - analyticsStart);
    }
    
    sleep(sleepDurations.long);

    // 4. Manage users - view user list
    const usersResponse = http.get(
      `${baseConfig.apiBaseURL}/admin/users?page=1&limit=50`,
      authOptions
    );
    
    check(usersResponse, {
      'users list loaded': (r) => r.status === 200,
      'users data present': (r) => {
        try {
          const data = JSON.parse(r.body);
          return Array.isArray(data) || (data && data.users);
        } catch {
          return false;
        }
      },
      'users response time < 1s': (r) => r.timings.duration < 1000,
    });
    
    sleep(sleepDurations.short);

    // 5. View specific user details (30% probability)
    if (Math.random() < 0.3) {
      const userId = `user_${Math.floor(Math.random() * 100)}`;
      const userDetailResponse = http.get(
        `${baseConfig.apiBaseURL}/admin/users/${userId}`,
        authOptions
      );
      
      check(userDetailResponse, {
        'user detail loaded': (r) => r.status === 200 || r.status === 404,
        'user detail response time < 800ms': (r) => r.timings.duration < 800,
      });
      
      sleep(sleepDurations.medium);
    }

    // 6. Perform user management operation (20% probability)
    if (Math.random() < 0.2) {
      const userManagementPayload = {
        userId: `user_${Math.floor(Math.random() * 100)}`,
        action: 'update_status',
        status: Math.random() > 0.5 ? 'active' : 'inactive',
        reason: 'Administrative action',
      };
      
      const userManagementResponse = http.put(
        `${baseConfig.apiBaseURL}/admin/users/manage`,
        JSON.stringify(userManagementPayload),
        authOptions
      );
      
      const userManagementSuccess = check(userManagementResponse, {
        'user management successful': (r) => r.status === 200 || r.status === 404,
        'user management response time < 2s': (r) => r.timings.duration < 2000,
      });
      
      userManagementRate.add(userManagementSuccess ? 1 : 0);
      sleep(sleepDurations.medium);
    }

    // 7. View system metrics
    const metricsResponse = http.get(
      `${baseConfig.apiBaseURL}/admin/metrics`,
      authOptions
    );
    
    check(metricsResponse, {
      'metrics loaded': (r) => r.status === 200,
      'metrics response time < 1s': (r) => r.timings.duration < 1000,
    });
    
    sleep(sleepDurations.short);

    // 8. Generate performance report (15% probability)
    if (Math.random() < 0.15) {
      const reportStart = Date.now();
      const reportPayload = {
        reportType: 'performance',
        dateRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString(),
        },
        includeDetails: true,
      };
      
      const reportResponse = http.post(
        `${baseConfig.apiBaseURL}/admin/reports/generate`,
        JSON.stringify(reportPayload),
        authOptions
      );
      
      const reportSuccess = check(reportResponse, {
        'report generation initiated': (r) => r.status === 202 || r.status === 200,
        'report generation response time < 5s': (r) => r.timings.duration < 5000,
      });
      
      if (reportSuccess) {
        reportGenerationTime.add(Date.now() - reportStart);
      }
      
      sleep(sleepDurations.long);
    }

    // 9. View class management
    const classManagementResponse = http.get(
      `${baseConfig.apiBaseURL}/admin/classes?page=1&limit=25`,
      authOptions
    );
    
    check(classManagementResponse, {
      'class management loaded': (r) => r.status === 200,
      'class management response time < 1.5s': (r) => r.timings.duration < 1500,
    });
    
    sleep(sleepDurations.medium);

    // 10. Perform bulk operation (10% probability)
    if (Math.random() < 0.1) {
      const bulkStart = Date.now();
      const bulkOperationPayload = {
        operation: 'update_user_roles',
        filters: {
          role: 'student',
          status: 'active',
        },
        updates: {
          emailNotifications: true,
        },
        limit: 50,
      };
      
      const bulkOperationResponse = http.post(
        `${baseConfig.apiBaseURL}/admin/bulk-operations`,
        JSON.stringify(bulkOperationPayload),
        authOptions
      );
      
      const bulkOperationSuccess = check(bulkOperationResponse, {
        'bulk operation initiated': (r) => r.status === 202 || r.status === 200,
        'bulk operation response time < 10s': (r) => r.timings.duration < 10000,
      });
      
      if (bulkOperationSuccess) {
        bulkOperationTime.add(Date.now() - bulkStart);
      }
      
      sleep(sleepDurations.long);
    }

    // 11. View system settings
    const settingsResponse = http.get(
      `${baseConfig.apiBaseURL}/admin/settings`,
      authOptions
    );
    
    check(settingsResponse, {
      'settings loaded': (r) => r.status === 200,
      'settings response time < 800ms': (r) => r.timings.duration < 800,
    });
    
    sleep(sleepDurations.short);

    // 12. Check system health and logs
    const systemHealthResponse = http.get(
      `${baseConfig.apiBaseURL}/admin/system/health`,
      authOptions
    );
    
    check(systemHealthResponse, {
      'system health loaded': (r) => r.status === 200,
      'system health response time < 500ms': (r) => r.timings.duration < 500,
    });
    
    sleep(sleepDurations.short);

    // 13. View audit logs
    const auditLogsResponse = http.get(
      `${baseConfig.apiBaseURL}/admin/audit-logs?page=1&limit=20`,
      authOptions
    );
    
    check(auditLogsResponse, {
      'audit logs loaded': (r) => r.status === 200,
      'audit logs response time < 1s': (r) => r.timings.duration < 1000,
    });
    
    sleep(sleepDurations.thinking);

  } catch (error) {
    console.error(`Error in admin load test: ${error.message}`);
    adminLoginFailures.add(1);
  }
}

export function teardown(data) {
  console.log('Admin load test completed');
  console.log(`Test started at: ${data.testStartTime}`);
  console.log(`Test completed at: ${new Date().toISOString()}`);
}