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

// Custom metrics for student scenarios
const studentLoginFailures = new Counter('student_login_failures');
const classBookingRate = new Rate('class_booking_success_rate');
const dashboardLoadTime = new Trend('dashboard_load_time');
const profileUpdateTime = new Trend('profile_update_time');

export let options = {
  stages: loadTestStages,
  thresholds: {
    ...baseConfig.thresholds,
    student_login_failures: ['count<10'],
    class_booking_success_rate: ['rate>0.95'],
    dashboard_load_time: ['p(95)<2000'],
    profile_update_time: ['p(95)<1500'],
  },
  tags: {
    testType: 'student_load',
    userType: 'student',
  },
};

export function setup() {
  console.log('Setting up student load test...');
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

export default function studentLoadTest(data) {
  const user = getRandomUser('student');
  let sessionData = null;

  try {
    // 1. Authenticate as student
    sessionData = authenticateUser(user);
    if (!sessionData) {
      studentLoginFailures.add(1);
      return;
    }

    const authOptions = getAuthenticatedRequestOptions(sessionData);

    // 2. Load student dashboard
    const dashboardStart = Date.now();
    const dashboardResponse = http.get(
      `${baseConfig.baseURL}/student`,
      authOptions
    );
    
    const dashboardSuccess = check(dashboardResponse, {
      'dashboard loaded': (r) => r.status === 200,
      'dashboard content present': (r) => r.body.includes('dashboard') || r.body.includes('student'),
    });
    
    if (dashboardSuccess) {
      dashboardLoadTime.add(Date.now() - dashboardStart);
    }
    
    sleep(sleepDurations.medium);

    // 3. View class schedule
    const scheduleResponse = http.get(
      `${baseConfig.apiBaseURL}/classes/schedule`,
      authOptions
    );
    
    check(scheduleResponse, {
      'schedule loaded': (r) => r.status === 200,
      'schedule response time < 1s': (r) => r.timings.duration < 1000,
    });
    
    sleep(sleepDurations.short);

    // 4. View available classes for booking
    const availableClassesResponse = http.get(
      `${baseConfig.apiBaseURL}/classes/available`,
      authOptions
    );
    
    check(availableClassesResponse, {
      'available classes loaded': (r) => r.status === 200,
      'classes data present': (r) => {
        try {
          const data = JSON.parse(r.body);
          return Array.isArray(data) || (data && data.classes);
        } catch {
          return false;
        }
      },
    });
    
    sleep(sleepDurations.medium);

    // 5. Book a class (30% probability)
    if (Math.random() < 0.3) {
      const bookingPayload = {
        classId: `class_${Math.floor(Math.random() * 100)}`,
        dateTime: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        type: 'one_on_one',
      };
      
      const bookingResponse = http.post(
        `${baseConfig.apiBaseURL}/bookings`,
        JSON.stringify(bookingPayload),
        authOptions
      );
      
      const bookingSuccess = check(bookingResponse, {
        'booking successful': (r) => r.status === 201 || r.status === 200,
        'booking response time < 2s': (r) => r.timings.duration < 2000,
      });
      
      classBookingRate.add(bookingSuccess ? 1 : 0);
      sleep(sleepDurations.long);
    }

    // 6. Check hour balance
    const hourBalanceResponse = http.get(
      `${baseConfig.apiBaseURL}/students/hours/balance`,
      authOptions
    );
    
    check(hourBalanceResponse, {
      'hour balance loaded': (r) => r.status === 200,
      'balance data valid': (r) => {
        try {
          const data = JSON.parse(r.body);
          return typeof data.balance === 'number';
        } catch {
          return false;
        }
      },
    });
    
    sleep(sleepDurations.short);

    // 7. View learning progress
    const progressResponse = http.get(
      `${baseConfig.apiBaseURL}/students/progress`,
      authOptions
    );
    
    check(progressResponse, {
      'progress loaded': (r) => r.status === 200,
      'progress response time < 1s': (r) => r.timings.duration < 1000,
    });
    
    sleep(sleepDurations.medium);

    // 8. Update profile (20% probability)
    if (Math.random() < 0.2) {
      const profileStart = Date.now();
      const profileUpdatePayload = {
        learningGoals: ['improve_speaking', 'business_english'],
        preferredSchedule: 'evening',
        timezone: 'UTC',
      };
      
      const profileUpdateResponse = http.put(
        `${baseConfig.apiBaseURL}/students/profile`,
        JSON.stringify(profileUpdatePayload),
        authOptions
      );
      
      const profileUpdateSuccess = check(profileUpdateResponse, {
        'profile update successful': (r) => r.status === 200,
        'profile update response time < 2s': (r) => r.timings.duration < 2000,
      });
      
      if (profileUpdateSuccess) {
        profileUpdateTime.add(Date.now() - profileStart);
      }
      
      sleep(sleepDurations.medium);
    }

    // 9. View upcoming classes
    const upcomingClassesResponse = http.get(
      `${baseConfig.apiBaseURL}/students/classes/upcoming`,
      authOptions
    );
    
    check(upcomingClassesResponse, {
      'upcoming classes loaded': (r) => r.status === 200,
      'upcoming classes response time < 800ms': (r) => r.timings.duration < 800,
    });
    
    sleep(sleepDurations.short);

    // 10. Check notifications
    const notificationsResponse = http.get(
      `${baseConfig.apiBaseURL}/notifications`,
      authOptions
    );
    
    check(notificationsResponse, {
      'notifications loaded': (r) => r.status === 200,
      'notifications response time < 500ms': (r) => r.timings.duration < 500,
    });
    
    sleep(sleepDurations.thinking);

  } catch (error) {
    console.error(`Error in student load test: ${error.message}`);
    studentLoginFailures.add(1);
  }
}

export function teardown(data) {
  console.log('Student load test completed');
  console.log(`Test started at: ${data.testStartTime}`);
  console.log(`Test completed at: ${new Date().toISOString()}`);
}