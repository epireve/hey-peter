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

// Custom metrics for teacher scenarios
const teacherLoginFailures = new Counter('teacher_login_failures');
const availabilityUpdateRate = new Rate('availability_update_success_rate');
const teacherDashboardLoadTime = new Trend('teacher_dashboard_load_time');
const classGradingTime = new Trend('class_grading_time');
const scheduleViewTime = new Trend('schedule_view_time');

export let options = {
  stages: loadTestStages,
  thresholds: {
    ...baseConfig.thresholds,
    teacher_login_failures: ['count<5'],
    availability_update_success_rate: ['rate>0.95'],
    teacher_dashboard_load_time: ['p(95)<2000'],
    class_grading_time: ['p(95)<3000'],
    schedule_view_time: ['p(95)<1000'],
  },
  tags: {
    testType: 'teacher_load',
    userType: 'teacher',
  },
};

export function setup() {
  console.log('Setting up teacher load test...');
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

export default function teacherLoadTest(data) {
  const user = getRandomUser('teacher');
  let sessionData = null;

  try {
    // 1. Authenticate as teacher
    sessionData = authenticateUser(user);
    if (!sessionData) {
      teacherLoginFailures.add(1);
      return;
    }

    const authOptions = getAuthenticatedRequestOptions(sessionData);

    // 2. Load teacher dashboard
    const dashboardStart = Date.now();
    const dashboardResponse = http.get(
      `${baseConfig.baseURL}/teacher`,
      authOptions
    );
    
    const dashboardSuccess = check(dashboardResponse, {
      'teacher dashboard loaded': (r) => r.status === 200,
      'dashboard content present': (r) => r.body.includes('teacher') || r.body.includes('dashboard'),
    });
    
    if (dashboardSuccess) {
      teacherDashboardLoadTime.add(Date.now() - dashboardStart);
    }
    
    sleep(sleepDurations.medium);

    // 3. View teaching schedule
    const scheduleStart = Date.now();
    const scheduleResponse = http.get(
      `${baseConfig.apiBaseURL}/teachers/schedule`,
      authOptions
    );
    
    const scheduleSuccess = check(scheduleResponse, {
      'schedule loaded': (r) => r.status === 200,
      'schedule data present': (r) => {
        try {
          const data = JSON.parse(r.body);
          return Array.isArray(data) || (data && data.schedule);
        } catch {
          return false;
        }
      },
    });
    
    if (scheduleSuccess) {
      scheduleViewTime.add(Date.now() - scheduleStart);
    }
    
    sleep(sleepDurations.short);

    // 4. Update availability (40% probability)
    if (Math.random() < 0.4) {
      const availabilityPayload = {
        weeklyAvailability: {
          monday: ['09:00-12:00', '14:00-18:00'],
          tuesday: ['09:00-12:00', '14:00-18:00'],
          wednesday: ['09:00-12:00', '14:00-18:00'],
          thursday: ['09:00-12:00', '14:00-18:00'],
          friday: ['09:00-12:00', '14:00-18:00'],
        },
        timezone: 'UTC',
        maxConsecutiveHours: 4,
      };
      
      const availabilityResponse = http.put(
        `${baseConfig.apiBaseURL}/teachers/availability`,
        JSON.stringify(availabilityPayload),
        authOptions
      );
      
      const availabilitySuccess = check(availabilityResponse, {
        'availability update successful': (r) => r.status === 200,
        'availability update response time < 2s': (r) => r.timings.duration < 2000,
      });
      
      availabilityUpdateRate.add(availabilitySuccess ? 1 : 0);
      sleep(sleepDurations.medium);
    }

    // 5. View assigned classes
    const assignedClassesResponse = http.get(
      `${baseConfig.apiBaseURL}/teachers/classes/assigned`,
      authOptions
    );
    
    check(assignedClassesResponse, {
      'assigned classes loaded': (r) => r.status === 200,
      'assigned classes response time < 1s': (r) => r.timings.duration < 1000,
    });
    
    sleep(sleepDurations.short);

    // 6. View upcoming classes
    const upcomingClassesResponse = http.get(
      `${baseConfig.apiBaseURL}/teachers/classes/upcoming`,
      authOptions
    );
    
    check(upcomingClassesResponse, {
      'upcoming classes loaded': (r) => r.status === 200,
      'upcoming classes response time < 800ms': (r) => r.timings.duration < 800,
    });
    
    sleep(sleepDurations.medium);

    // 7. Grade a class (25% probability)
    if (Math.random() < 0.25) {
      const gradingStart = Date.now();
      const gradingPayload = {
        classId: `class_${Math.floor(Math.random() * 100)}`,
        studentId: `student_${Math.floor(Math.random() * 50)}`,
        rating: Math.floor(Math.random() * 5) + 1,
        feedback: 'Great participation and improvement in speaking skills.',
        homeworkAssigned: true,
        nextTopics: ['conversation_practice', 'grammar_review'],
      };
      
      const gradingResponse = http.post(
        `${baseConfig.apiBaseURL}/teachers/classes/grade`,
        JSON.stringify(gradingPayload),
        authOptions
      );
      
      const gradingSuccess = check(gradingResponse, {
        'class grading successful': (r) => r.status === 201 || r.status === 200,
        'grading response time < 3s': (r) => r.timings.duration < 3000,
      });
      
      if (gradingSuccess) {
        classGradingTime.add(Date.now() - gradingStart);
      }
      
      sleep(sleepDurations.long);
    }

    // 8. View hour tracking and compensation
    const hoursResponse = http.get(
      `${baseConfig.apiBaseURL}/teachers/hours`,
      authOptions
    );
    
    check(hoursResponse, {
      'hours tracking loaded': (r) => r.status === 200,
      'hours data valid': (r) => {
        try {
          const data = JSON.parse(r.body);
          return typeof data.totalHours === 'number';
        } catch {
          return false;
        }
      },
    });
    
    sleep(sleepDurations.short);

    // 9. View teacher analytics
    const analyticsResponse = http.get(
      `${baseConfig.apiBaseURL}/teachers/analytics`,
      authOptions
    );
    
    check(analyticsResponse, {
      'analytics loaded': (r) => r.status === 200,
      'analytics response time < 1.5s': (r) => r.timings.duration < 1500,
    });
    
    sleep(sleepDurations.medium);

    // 10. Update teacher profile (15% probability)
    if (Math.random() < 0.15) {
      const profileUpdatePayload = {
        bio: 'Experienced English teacher with 5+ years of teaching experience.',
        specializations: ['business_english', 'conversation', 'grammar'],
        certifications: ['TEFL', 'TESOL'],
        hourlyRate: 30,
      };
      
      const profileUpdateResponse = http.put(
        `${baseConfig.apiBaseURL}/teachers/profile`,
        JSON.stringify(profileUpdatePayload),
        authOptions
      );
      
      check(profileUpdateResponse, {
        'profile update successful': (r) => r.status === 200,
        'profile update response time < 2s': (r) => r.timings.duration < 2000,
      });
      
      sleep(sleepDurations.medium);
    }

    // 11. View student feedback
    const feedbackResponse = http.get(
      `${baseConfig.apiBaseURL}/teachers/feedback`,
      authOptions
    );
    
    check(feedbackResponse, {
      'feedback loaded': (r) => r.status === 200,
      'feedback response time < 1s': (r) => r.timings.duration < 1000,
    });
    
    sleep(sleepDurations.short);

    // 12. Check compensation details
    const compensationResponse = http.get(
      `${baseConfig.apiBaseURL}/teachers/compensation`,
      authOptions
    );
    
    check(compensationResponse, {
      'compensation loaded': (r) => r.status === 200,
      'compensation response time < 800ms': (r) => r.timings.duration < 800,
    });
    
    sleep(sleepDurations.thinking);

  } catch (error) {
    console.error(`Error in teacher load test: ${error.message}`);
    teacherLoginFailures.add(1);
  }
}

export function teardown(data) {
  console.log('Teacher load test completed');
  console.log(`Test started at: ${data.testStartTime}`);
  console.log(`Test completed at: ${new Date().toISOString()}`);
}