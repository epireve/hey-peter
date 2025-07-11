// Load testing configuration for HeyPeter Academy
export const baseConfig = {
  // Base URL for the application
  baseURL: __ENV.BASE_URL || 'http://localhost:3000',
  apiBaseURL: __ENV.API_BASE_URL || 'http://localhost:3000/api',
  
  // Test duration and user distribution
  testDuration: __ENV.TEST_DURATION || '5m',
  maxUsers: parseInt(__ENV.MAX_CONCURRENT_USERS) || 100,
  rampUpTime: __ENV.RAMP_UP_TIME || '30s',
  rampDownTime: __ENV.RAMP_DOWN_TIME || '30s',
  
  // User type distribution
  studentPercentage: parseFloat(__ENV.STUDENT_USERS_PERCENTAGE) || 60,
  teacherPercentage: parseFloat(__ENV.TEACHER_USERS_PERCENTAGE) || 30,
  adminPercentage: parseFloat(__ENV.ADMIN_USERS_PERCENTAGE) || 10,
  
  // Performance thresholds
  thresholds: {
    http_req_duration: [`p(95)<${__ENV.API_RESPONSE_TIME_P95 || 500}`],
    http_req_failed: [`rate<${__ENV.API_ERROR_RATE_THRESHOLD || 0.01}`],
    http_reqs: ['rate>10'], // Minimum 10 requests per second
  },
  
  // Request configuration
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'HeyPeter-PerformanceTest/1.0',
  },
  
  // Authentication endpoints
  auth: {
    loginEndpoint: '/api/auth/signin',
    signupEndpoint: '/api/auth/signup',
    logoutEndpoint: '/api/auth/signout',
  },
  
  // Test data
  testUsers: {
    students: generateTestStudents(100),
    teachers: generateTestTeachers(20),
    admins: generateTestAdmins(5),
  }
};

// Load testing stages configuration
export const loadTestStages = [
  { duration: baseConfig.rampUpTime, target: Math.floor(baseConfig.maxUsers * 0.1) },
  { duration: '1m', target: Math.floor(baseConfig.maxUsers * 0.3) },
  { duration: '2m', target: Math.floor(baseConfig.maxUsers * 0.6) },
  { duration: '2m', target: baseConfig.maxUsers },
  { duration: baseConfig.rampDownTime, target: 0 },
];

// Stress testing stages configuration
export const stressTestStages = [
  { duration: '1m', target: baseConfig.maxUsers },
  { duration: '2m', target: baseConfig.maxUsers * 1.5 },
  { duration: '3m', target: baseConfig.maxUsers * 2 },
  { duration: '2m', target: baseConfig.maxUsers * 3 },
  { duration: '1m', target: 0 },
];

// Spike testing stages configuration
export const spikeTestStages = [
  { duration: '30s', target: 10 },
  { duration: '30s', target: baseConfig.maxUsers * 5 }, // Sudden spike
  { duration: '1m', target: baseConfig.maxUsers * 5 },
  { duration: '30s', target: 10 },
  { duration: '30s', target: 0 },
];

// Generate test student data
function generateTestStudents(count) {
  const students = [];
  for (let i = 1; i <= count; i++) {
    students.push({
      email: `student${i}@test.heypeter.com`,
      password: 'TestPassword123!',
      firstName: `Student${i}`,
      lastName: `Test`,
      role: 'student',
      coursePreferences: ['basic', 'everyday_a', 'speak_up'],
    });
  }
  return students;
}

// Generate test teacher data
function generateTestTeachers(count) {
  const teachers = [];
  for (let i = 1; i <= count; i++) {
    teachers.push({
      email: `teacher${i}@test.heypeter.com`,
      password: 'TestPassword123!',
      firstName: `Teacher${i}`,
      lastName: `Test`,
      role: 'teacher',
      specializations: ['basic', 'business', 'conversation'],
      hourlyRate: 25 + (i % 20), // Random rate between $25-45
    });
  }
  return teachers;
}

// Generate test admin data
function generateTestAdmins(count) {
  const admins = [];
  for (let i = 1; i <= count; i++) {
    admins.push({
      email: `admin${i}@test.heypeter.com`,
      password: 'TestPassword123!',
      firstName: `Admin${i}`,
      lastName: `Test`,
      role: 'admin',
      permissions: ['user_management', 'analytics', 'system_settings'],
    });
  }
  return admins;
}

// Common request options
export const requestOptions = {
  timeout: '30s',
  headers: baseConfig.headers,
};

// Sleep durations for realistic user behavior
export const sleepDurations = {
  short: 1, // 1 second - between quick actions
  medium: 3, // 3 seconds - between page views
  long: 5, // 5 seconds - reading content
  thinking: 10, // 10 seconds - user thinking time
};

export default baseConfig;