// API benchmarking configuration
const dotenv = require('dotenv');
dotenv.config();

const apiConfig = {
  // Base configuration
  baseURL: process.env.BASE_URL || 'http://localhost:3000',
  apiBaseURL: process.env.API_BASE_URL || 'http://localhost:3000/api',
  
  // Test configuration
  testDuration: parseInt(process.env.API_TEST_DURATION) || 60, // seconds
  warmupDuration: 10, // seconds
  cooldownDuration: 5, // seconds
  
  // Load configuration
  connections: [1, 5, 10, 25, 50, 100],
  rateTargets: [10, 50, 100, 200, 500], // requests per second
  
  // Performance thresholds
  thresholds: {
    responseTime: {
      p50: 200, // 50th percentile under 200ms
      p95: 500, // 95th percentile under 500ms
      p99: 1000, // 99th percentile under 1s
    },
    errorRate: 0.01, // Error rate under 1%
    throughput: 10, // Minimum 10 RPS
  },
  
  // Authentication configuration
  auth: {
    endpoints: {
      login: '/auth/signin',
      signup: '/auth/signup',
      refresh: '/auth/refresh',
      logout: '/auth/signout',
    },
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
  },
  
  // API endpoints to benchmark
  endpoints: {
    // Public endpoints (no auth required)
    public: [
      {
        name: 'Health Check',
        method: 'GET',
        path: '/health',
        expectedStatus: 200,
        weight: 1,
      },
      {
        name: 'API Health',
        method: 'GET',
        path: '/api/health',
        expectedStatus: 200,
        weight: 1,
      },
    ],
    
    // Student endpoints
    student: [
      {
        name: 'Student Dashboard',
        method: 'GET',
        path: '/api/students/dashboard',
        expectedStatus: 200,
        weight: 10,
      },
      {
        name: 'Student Profile',
        method: 'GET',
        path: '/api/students/profile',
        expectedStatus: 200,
        weight: 5,
      },
      {
        name: 'Student Hour Balance',
        method: 'GET',
        path: '/api/students/hours/balance',
        expectedStatus: 200,
        weight: 8,
      },
      {
        name: 'Available Classes',
        method: 'GET',
        path: '/api/classes/available',
        expectedStatus: 200,
        weight: 15,
      },
      {
        name: 'Student Schedule',
        method: 'GET',
        path: '/api/students/schedule',
        expectedStatus: 200,
        weight: 12,
      },
      {
        name: 'Book Class',
        method: 'POST',
        path: '/api/bookings',
        expectedStatus: [200, 201, 409], // 409 for conflicts
        weight: 3,
        payload: {
          classId: 'dynamic',
          dateTime: 'dynamic',
          type: 'one_on_one',
        },
      },
      {
        name: 'Student Progress',
        method: 'GET',
        path: '/api/students/progress',
        expectedStatus: 200,
        weight: 6,
      },
      {
        name: 'Upcoming Classes',
        method: 'GET',
        path: '/api/students/classes/upcoming',
        expectedStatus: 200,
        weight: 8,
      },
    ],
    
    // Teacher endpoints
    teacher: [
      {
        name: 'Teacher Dashboard',
        method: 'GET',
        path: '/api/teachers/dashboard',
        expectedStatus: 200,
        weight: 10,
      },
      {
        name: 'Teacher Schedule',
        method: 'GET',
        path: '/api/teachers/schedule',
        expectedStatus: 200,
        weight: 12,
      },
      {
        name: 'Teacher Availability',
        method: 'GET',
        path: '/api/teachers/availability',
        expectedStatus: 200,
        weight: 8,
      },
      {
        name: 'Update Availability',
        method: 'PUT',
        path: '/api/teachers/availability',
        expectedStatus: 200,
        weight: 2,
        payload: {
          weeklyAvailability: {
            monday: ['09:00-12:00', '14:00-18:00'],
            tuesday: ['09:00-12:00', '14:00-18:00'],
            wednesday: ['09:00-12:00'],
          },
          timezone: 'UTC',
        },
      },
      {
        name: 'Assigned Classes',
        method: 'GET',
        path: '/api/teachers/classes/assigned',
        expectedStatus: 200,
        weight: 10,
      },
      {
        name: 'Teacher Hours',
        method: 'GET',
        path: '/api/teachers/hours',
        expectedStatus: 200,
        weight: 6,
      },
      {
        name: 'Teacher Analytics',
        method: 'GET',
        path: '/api/teachers/analytics',
        expectedStatus: 200,
        weight: 4,
      },
      {
        name: 'Grade Class',
        method: 'POST',
        path: '/api/teachers/classes/grade',
        expectedStatus: [200, 201],
        weight: 2,
        payload: {
          classId: 'dynamic',
          studentId: 'dynamic',
          rating: 'dynamic',
          feedback: 'Great progress in conversation skills.',
        },
      },
    ],
    
    // Admin endpoints
    admin: [
      {
        name: 'Admin Dashboard',
        method: 'GET',
        path: '/api/admin/dashboard',
        expectedStatus: 200,
        weight: 10,
      },
      {
        name: 'System Analytics',
        method: 'GET',
        path: '/api/admin/analytics',
        expectedStatus: 200,
        weight: 8,
      },
      {
        name: 'User List',
        method: 'GET',
        path: '/api/admin/users?page=1&limit=50',
        expectedStatus: 200,
        weight: 12,
      },
      {
        name: 'System Metrics',
        method: 'GET',
        path: '/api/admin/metrics',
        expectedStatus: 200,
        weight: 6,
      },
      {
        name: 'Class Management',
        method: 'GET',
        path: '/api/admin/classes?page=1&limit=25',
        expectedStatus: 200,
        weight: 8,
      },
      {
        name: 'User Management',
        method: 'PUT',
        path: '/api/admin/users/manage',
        expectedStatus: [200, 404],
        weight: 2,
        payload: {
          userId: 'dynamic',
          action: 'update_status',
          status: 'active',
        },
      },
      {
        name: 'Generate Report',
        method: 'POST',
        path: '/api/admin/reports/generate',
        expectedStatus: [200, 202],
        weight: 1,
        payload: {
          reportType: 'performance',
          dateRange: {
            start: 'dynamic',
            end: 'dynamic',
          },
        },
      },
      {
        name: 'System Health',
        method: 'GET',
        path: '/api/admin/system/health',
        expectedStatus: 200,
        weight: 4,
      },
    ],
  },
  
  // Scenarios for mixed load testing
  scenarios: {
    realistic_load: {
      description: 'Realistic user distribution and behavior',
      users: {
        student: 60, // 60% students
        teacher: 30, // 30% teachers
        admin: 10,   // 10% admins
      },
      duration: 300, // 5 minutes
    },
    
    peak_load: {
      description: 'Peak usage simulation',
      users: {
        student: 70,
        teacher: 25,
        admin: 5,
      },
      duration: 180, // 3 minutes
      intensity: 'high',
    },
    
    admin_heavy: {
      description: 'Admin-heavy load for analytics and reporting',
      users: {
        student: 30,
        teacher: 20,
        admin: 50,
      },
      duration: 240, // 4 minutes
    },
    
    student_rush: {
      description: 'Class booking rush simulation',
      users: {
        student: 90,
        teacher: 8,
        admin: 2,
      },
      duration: 120, // 2 minutes
      focus: 'booking',
    },
  },
  
  // Request configuration
  requestConfig: {
    timeout: 30000, // 30 seconds
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'HeyPeter-API-Benchmark/1.0',
    },
    retries: 0, // No retries for performance testing
    followRedirects: false,
  },
  
  // Data generators for dynamic payloads
  dataGenerators: {
    classId: () => `class_${Math.floor(Math.random() * 100) + 1}`,
    studentId: () => `student_${Math.floor(Math.random() * 50) + 1}`,
    teacherId: () => `teacher_${Math.floor(Math.random() * 20) + 1}`,
    userId: () => `user_${Math.floor(Math.random() * 100) + 1}`,
    rating: () => Math.floor(Math.random() * 5) + 1,
    dateTime: () => new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    pastDate: () => new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    futureDate: () => new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
};

module.exports = apiConfig;