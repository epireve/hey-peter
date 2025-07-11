'use client';

// Lazy loading definitions for student components
import { createLazyStudentComponent, preloadComponent } from '@/lib/utils/lazy-factory';

// Large Student Components (Heavy components that benefit from code splitting)

// Student Profile Management (1605 lines)
export const LazyStudentProfileManagement = createLazyStudentComponent(
  () => import('./StudentProfileManagement'),
  {
    loadingContext: 'form',
    errorContext: 'form',
    preload: false,
    retry: 3
  }
);

// Student Messaging (1406 lines)
export const LazyStudentMessaging = createLazyStudentComponent(
  () => import('./StudentMessaging'),
  {
    loadingContext: 'default',
    errorContext: 'default',
    preload: false,
    retry: 3
  }
);

// Student Learning Materials (1222 lines)
export const LazyStudentLearningMaterials = createLazyStudentComponent(
  () => import('./StudentLearningMaterials'),
  {
    loadingContext: 'default',
    errorContext: 'default',
    preload: false,
    retry: 3
  }
);

// Student Attendance Tracking (1047 lines)
export const LazyStudentAttendanceTracking = createLazyStudentComponent(
  () => import('./StudentAttendanceTracking'),
  {
    loadingContext: 'table',
    errorContext: 'table',
    preload: false,
    retry: 3
  }
);

// Student Class Booking (933 lines)
export const LazyStudentClassBooking = createLazyStudentComponent(
  () => import('./StudentClassBooking'),
  {
    loadingContext: 'form',
    errorContext: 'form',
    preload: false,
    retry: 3
  }
);

// Enhanced Student Class Booking
export const LazyEnhancedStudentClassBooking = createLazyStudentComponent(
  () => import('./EnhancedStudentClassBooking'),
  {
    loadingContext: 'form',
    errorContext: 'form',
    preload: false,
    retry: 3
  }
);

// Student Assignment Management
export const LazyStudentAssignmentManagement = createLazyStudentComponent(
  () => import('./StudentAssignmentManagement'),
  {
    loadingContext: 'table',
    errorContext: 'table',
    preload: false,
    retry: 3
  }
);

// Student Course Enrollment
export const LazyStudentCourseEnrollment = createLazyStudentComponent(
  () => import('./StudentCourseEnrollment'),
  {
    loadingContext: 'form',
    errorContext: 'form',
    preload: false,
    retry: 3
  }
);

// Student Dashboard Layout
export const LazyStudentDashboardLayout = createLazyStudentComponent(
  () => import('./StudentDashboardLayout'),
  {
    loadingContext: 'dashboard',
    errorContext: 'dashboard',
    preload: true, // Core layout component
    retry: 3
  }
);

// Student Progress Tracking
export const LazyStudentProgressTracking = createLazyStudentComponent(
  () => import('./StudentProgressTracking'),
  {
    loadingContext: 'analytics',
    errorContext: 'analytics',
    preload: false,
    retry: 3
  }
);

// Booking and Scheduling Components
export const LazyBookingRecommendations = createLazyStudentComponent(
  () => import('./BookingRecommendations'),
  {
    loadingContext: 'default',
    errorContext: 'default',
    preload: false,
    retry: 3
  }
);

export const LazyDurationSelector = createLazyStudentComponent(
  () => import('./DurationSelector'),
  {
    loadingContext: 'form',
    errorContext: 'form',
    preload: false,
    retry: 3
  }
);

export const LazyOneOnOneBooking = createLazyStudentComponent(
  () => import('./OneOnOneBooking'),
  {
    loadingContext: 'form',
    errorContext: 'form',
    preload: false,
    retry: 3
  }
);

export const LazyTeacherSelectionInterface = createLazyStudentComponent(
  () => import('./TeacherSelectionInterface'),
  {
    loadingContext: 'default',
    errorContext: 'default',
    preload: false,
    retry: 3
  }
);

// Hour Management Components
export const LazyHourBalanceDisplay = createLazyStudentComponent(
  () => import('./HourBalanceDisplay'),
  {
    loadingContext: 'default',
    errorContext: 'default',
    preload: false,
    retry: 3
  }
);

export const LazyHourPurchaseDialog = createLazyStudentComponent(
  () => import('./HourPurchaseDialog'),
  {
    loadingContext: 'form',
    errorContext: 'form',
    preload: false,
    retry: 3
  }
);

export const LazyHourTransactionHistory = createLazyStudentComponent(
  () => import('./HourTransactionHistory'),
  {
    loadingContext: 'table',
    errorContext: 'table',
    preload: false,
    retry: 3
  }
);

// Learning and Assessment Components
export const LazyLearningGoalsForm = createLazyStudentComponent(
  () => import('./LearningGoalsForm'),
  {
    loadingContext: 'form',
    errorContext: 'form',
    preload: false,
    retry: 3
  }
);

export const LazyLeaveRequestForm = createLazyStudentComponent(
  () => import('./LeaveRequestForm'),
  {
    loadingContext: 'form',
    errorContext: 'form',
    preload: false,
    retry: 3
  }
);

// Hour Management Module (separate from main components)
export const LazyStudentHourDashboard = createLazyStudentComponent(
  () => import('./hours/StudentHourDashboard'),
  {
    loadingContext: 'dashboard',
    errorContext: 'dashboard',
    preload: false,
    retry: 3
  }
);

export const LazyLeaveRequestList = createLazyStudentComponent(
  () => import('./hours/LeaveRequestList'),
  {
    loadingContext: 'table',
    errorContext: 'table',
    preload: false,
    retry: 3
  }
);

// Makeup Classes Module
export const LazyMakeUpClassSelector = createLazyStudentComponent(
  () => import('./makeup-classes/MakeUpClassSelector'),
  {
    loadingContext: 'form',
    errorContext: 'form',
    preload: false,
    retry: 3
  }
);

export const LazyPostponementStatus = createLazyStudentComponent(
  () => import('./makeup-classes/PostponementStatus'),
  {
    loadingContext: 'default',
    errorContext: 'default',
    preload: false,
    retry: 3
  }
);

// Preload functions for common student workflows
export const preloadStudentDashboard = () => {
  preloadComponent(() => import('./StudentDashboardLayout'), 0);
  preloadComponent(() => import('./HourBalanceDisplay'), 500);
  preloadComponent(() => import('./StudentProgressTracking'), 1000);
};

export const preloadStudentBooking = () => {
  preloadComponent(() => import('./StudentClassBooking'), 0);
  preloadComponent(() => import('./BookingRecommendations'), 500);
  preloadComponent(() => import('./TeacherSelectionInterface'), 1000);
  preloadComponent(() => import('./DurationSelector'), 1500);
};

export const preloadStudentProfile = () => {
  preloadComponent(() => import('./StudentProfileManagement'), 0);
  preloadComponent(() => import('./LearningGoalsForm'), 500);
};

export const preloadStudentLearning = () => {
  preloadComponent(() => import('./StudentLearningMaterials'), 0);
  preloadComponent(() => import('./StudentAssignmentManagement'), 500);
  preloadComponent(() => import('./StudentAttendanceTracking'), 1000);
};

export const preloadStudentCommunication = () => {
  preloadComponent(() => import('./StudentMessaging'), 0);
};

export const preloadStudentHours = () => {
  preloadComponent(() => import('./hours/StudentHourDashboard'), 0);
  preloadComponent(() => import('./HourPurchaseDialog'), 500);
  preloadComponent(() => import('./HourTransactionHistory'), 1000);
  preloadComponent(() => import('./hours/LeaveRequestList'), 1500);
};

// Export all components for direct use
export default {
  // Core Components
  LazyStudentDashboardLayout,
  LazyStudentProfileManagement,
  LazyStudentMessaging,
  LazyStudentLearningMaterials,
  LazyStudentAttendanceTracking,
  LazyStudentClassBooking,
  LazyEnhancedStudentClassBooking,
  LazyStudentAssignmentManagement,
  LazyStudentCourseEnrollment,
  LazyStudentProgressTracking,
  
  // Booking Components
  LazyBookingRecommendations,
  LazyDurationSelector,
  LazyOneOnOneBooking,
  LazyTeacherSelectionInterface,
  
  // Hour Management
  LazyHourBalanceDisplay,
  LazyHourPurchaseDialog,
  LazyHourTransactionHistory,
  LazyStudentHourDashboard,
  LazyLeaveRequestList,
  
  // Learning Components
  LazyLearningGoalsForm,
  LazyLeaveRequestForm,
  
  // Makeup Classes
  LazyMakeUpClassSelector,
  LazyPostponementStatus,
  
  // Preload Functions
  preloadStudentDashboard,
  preloadStudentBooking,
  preloadStudentProfile,
  preloadStudentLearning,
  preloadStudentCommunication,
  preloadStudentHours
};