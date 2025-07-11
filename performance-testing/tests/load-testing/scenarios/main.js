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

// Import individual scenario functions
import studentLoadTest from './student-load.js';
import teacherLoadTest from './teacher-load.js';
import adminLoadTest from './admin-load.js';

// Custom metrics for mixed load testing
const totalRequests = new Counter('total_requests');
const authenticationFailures = new Counter('authentication_failures');
const overallSuccessRate = new Rate('overall_success_rate');
const crossUserInteractions = new Trend('cross_user_interactions');

export let options = {
  stages: loadTestStages,
  thresholds: {
    ...baseConfig.thresholds,
    total_requests: ['count>1000'],
    authentication_failures: ['count<20'],
    overall_success_rate: ['rate>0.95'],
    cross_user_interactions: ['p(95)<3000'],
  },
  tags: {
    testType: 'mixed_load',
    userType: 'mixed',
  },
};

export function setup() {
  console.log('Setting up mixed user load test...');
  console.log(`Base URL: ${baseConfig.baseURL}`);
  console.log(`Max concurrent users: ${baseConfig.maxUsers}`);
  console.log(`Student percentage: ${baseConfig.studentPercentage}%`);
  console.log(`Teacher percentage: ${baseConfig.teacherPercentage}%`);
  console.log(`Admin percentage: ${baseConfig.adminPercentage}%`);
  
  // Verify application is accessible
  const healthCheck = http.get(`${baseConfig.baseURL}/api/health`);
  if (!check(healthCheck, { 'application accessible': (r) => r.status === 200 })) {
    throw new Error('Application is not accessible');
  }
  
  // Verify API endpoints are accessible
  const apiHealthCheck = http.get(`${baseConfig.apiBaseURL}/health`);
  check(apiHealthCheck, { 'API accessible': (r) => r.status === 200 });
  
  return { 
    testStartTime: new Date().toISOString(),
    baseURL: baseConfig.baseURL,
    userDistribution: {
      student: baseConfig.studentPercentage,
      teacher: baseConfig.teacherPercentage,
      admin: baseConfig.adminPercentage,
    }
  };
}

export default function mixedUserLoadTest(data) {
  // Determine user type based on configured percentages
  const userType = determineUserType();
  
  try {
    switch (userType) {
      case 'student':
        executeStudentScenario();
        break;
      case 'teacher':
        executeTeacherScenario();
        break;
      case 'admin':
        executeAdminScenario();
        break;
      default:
        executeStudentScenario(); // Default to student
    }
    
    totalRequests.add(1);
    overallSuccessRate.add(1);
    
  } catch (error) {
    console.error(`Error in mixed load test: ${error.message}`);
    authenticationFailures.add(1);
    overallSuccessRate.add(0);
  }
}

function determineUserType() {
  const random = Math.random() * 100;
  
  if (random < baseConfig.studentPercentage) {
    return 'student';
  } else if (random < baseConfig.studentPercentage + baseConfig.teacherPercentage) {
    return 'teacher';
  } else {
    return 'admin';
  }
}

function executeStudentScenario() {
  const user = getRandomUser('student');
  const sessionData = authenticateUser(user);
  
  if (!sessionData) {
    authenticationFailures.add(1);
    return;
  }
  
  const authOptions = getAuthenticatedRequestOptions(sessionData);
  
  // Core student activities
  performStudentDashboardFlow(authOptions);
  
  // Random additional activities
  if (Math.random() < 0.4) {
    performClassBookingFlow(authOptions);
  }
  
  if (Math.random() < 0.3) {
    performProgressCheckFlow(authOptions);
  }
}

function executeTeacherScenario() {
  const user = getRandomUser('teacher');
  const sessionData = authenticateUser(user);
  
  if (!sessionData) {
    authenticationFailures.add(1);
    return;
  }
  
  const authOptions = getAuthenticatedRequestOptions(sessionData);
  
  // Core teacher activities
  performTeacherDashboardFlow(authOptions);
  
  // Random additional activities
  if (Math.random() < 0.3) {
    performAvailabilityUpdateFlow(authOptions);
  }
  
  if (Math.random() < 0.2) {
    performClassGradingFlow(authOptions);
  }
}

function executeAdminScenario() {
  const user = getRandomUser('admin');
  const sessionData = authenticateUser(user);
  
  if (!sessionData) {
    authenticationFailures.add(1);
    return;
  }
  
  const authOptions = getAuthenticatedRequestOptions(sessionData);
  
  // Core admin activities
  performAdminDashboardFlow(authOptions);
  
  // Random additional activities
  if (Math.random() < 0.3) {
    performUserManagementFlow(authOptions);
  }
  
  if (Math.random() < 0.2) {
    performAnalyticsFlow(authOptions);
  }
}

function performStudentDashboardFlow(authOptions) {
  // Load dashboard
  const dashboardResponse = http.get(`${baseConfig.baseURL}/student`, authOptions);
  check(dashboardResponse, {
    'student dashboard loaded': (r) => r.status === 200,
  });
  sleep(sleepDurations.medium);
  
  // Check hour balance
  const balanceResponse = http.get(`${baseConfig.apiBaseURL}/students/hours/balance`, authOptions);
  check(balanceResponse, {
    'hour balance loaded': (r) => r.status === 200,
  });
  sleep(sleepDurations.short);
}

function performClassBookingFlow(authOptions) {
  const interactionStart = Date.now();
  
  // View available classes
  const availableResponse = http.get(`${baseConfig.apiBaseURL}/classes/available`, authOptions);
  check(availableResponse, {
    'available classes loaded': (r) => r.status === 200,
  });
  sleep(sleepDurations.medium);
  
  // Attempt booking
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
  
  check(bookingResponse, {
    'booking attempted': (r) => r.status === 201 || r.status === 200 || r.status === 409,
  });
  
  crossUserInteractions.add(Date.now() - interactionStart);
  sleep(sleepDurations.long);
}

function performProgressCheckFlow(authOptions) {
  // View progress
  const progressResponse = http.get(`${baseConfig.apiBaseURL}/students/progress`, authOptions);
  check(progressResponse, {
    'progress loaded': (r) => r.status === 200,
  });
  sleep(sleepDurations.medium);
  
  // View upcoming classes
  const upcomingResponse = http.get(`${baseConfig.apiBaseURL}/students/classes/upcoming`, authOptions);
  check(upcomingResponse, {
    'upcoming classes loaded': (r) => r.status === 200,
  });
  sleep(sleepDurations.short);
}

function performTeacherDashboardFlow(authOptions) {
  // Load dashboard
  const dashboardResponse = http.get(`${baseConfig.baseURL}/teacher`, authOptions);
  check(dashboardResponse, {
    'teacher dashboard loaded': (r) => r.status === 200,
  });
  sleep(sleepDurations.medium);
  
  // View schedule
  const scheduleResponse = http.get(`${baseConfig.apiBaseURL}/teachers/schedule`, authOptions);
  check(scheduleResponse, {
    'teacher schedule loaded': (r) => r.status === 200,
  });
  sleep(sleepDurations.short);
}

function performAvailabilityUpdateFlow(authOptions) {
  const interactionStart = Date.now();
  
  const availabilityPayload = {
    weeklyAvailability: {
      monday: ['09:00-12:00', '14:00-18:00'],
      tuesday: ['09:00-12:00', '14:00-18:00'],
      wednesday: ['09:00-12:00'],
    },
    timezone: 'UTC',
  };
  
  const availabilityResponse = http.put(
    `${baseConfig.apiBaseURL}/teachers/availability`,
    JSON.stringify(availabilityPayload),
    authOptions
  );
  
  check(availabilityResponse, {
    'availability updated': (r) => r.status === 200,
  });
  
  crossUserInteractions.add(Date.now() - interactionStart);
  sleep(sleepDurations.medium);
}

function performClassGradingFlow(authOptions) {
  const interactionStart = Date.now();
  
  const gradingPayload = {
    classId: `class_${Math.floor(Math.random() * 100)}`,
    studentId: `student_${Math.floor(Math.random() * 50)}`,
    rating: Math.floor(Math.random() * 5) + 1,
    feedback: 'Good progress in conversation skills.',
  };
  
  const gradingResponse = http.post(
    `${baseConfig.apiBaseURL}/teachers/classes/grade`,
    JSON.stringify(gradingPayload),
    authOptions
  );
  
  check(gradingResponse, {
    'grading completed': (r) => r.status === 201 || r.status === 200 || r.status === 404,
  });
  
  crossUserInteractions.add(Date.now() - interactionStart);
  sleep(sleepDurations.long);
}

function performAdminDashboardFlow(authOptions) {
  // Load dashboard
  const dashboardResponse = http.get(`${baseConfig.baseURL}/admin`, authOptions);
  check(dashboardResponse, {
    'admin dashboard loaded': (r) => r.status === 200,
  });
  sleep(sleepDurations.medium);
  
  // View metrics
  const metricsResponse = http.get(`${baseConfig.apiBaseURL}/admin/metrics`, authOptions);
  check(metricsResponse, {
    'admin metrics loaded': (r) => r.status === 200,
  });
  sleep(sleepDurations.short);
}

function performUserManagementFlow(authOptions) {
  const interactionStart = Date.now();
  
  // View users
  const usersResponse = http.get(`${baseConfig.apiBaseURL}/admin/users?page=1&limit=50`, authOptions);
  check(usersResponse, {
    'users list loaded': (r) => r.status === 200,
  });
  
  crossUserInteractions.add(Date.now() - interactionStart);
  sleep(sleepDurations.medium);
}

function performAnalyticsFlow(authOptions) {
  const interactionStart = Date.now();
  
  // Load analytics
  const analyticsResponse = http.get(`${baseConfig.apiBaseURL}/admin/analytics`, authOptions);
  check(analyticsResponse, {
    'analytics loaded': (r) => r.status === 200,
  });
  
  crossUserInteractions.add(Date.now() - interactionStart);
  sleep(sleepDurations.long);
}

export function teardown(data) {
  console.log('Mixed user load test completed');
  console.log(`Test started at: ${data.testStartTime}`);
  console.log(`Test completed at: ${new Date().toISOString()}`);
  console.log(`User distribution: ${JSON.stringify(data.userDistribution)}`);
}