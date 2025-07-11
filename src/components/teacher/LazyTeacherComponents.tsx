'use client';

// Lazy loading definitions for teacher components
import { createLazyTeacherComponent, preloadComponent } from '@/lib/utils/lazy-factory';

// Large Teacher Components (Heavy components that benefit from code splitting)

// Teacher Assignment Grading (1790 lines - largest component)
export const LazyTeacherAssignmentGrading = createLazyTeacherComponent(
  () => import('./TeacherAssignmentGrading'),
  {
    loadingContext: 'form',
    errorContext: 'form',
    preload: false,
    retry: 3
  }
);

// Teacher Class Management (1280 lines)
export const LazyTeacherClassManagement = createLazyTeacherComponent(
  () => import('./TeacherClassManagement'),
  {
    loadingContext: 'table',
    errorContext: 'table',
    preload: false,
    retry: 3
  }
);

// Teacher Dashboard Layout
export const LazyTeacherDashboardLayout = createLazyTeacherComponent(
  () => import('./TeacherDashboardLayout'),
  {
    loadingContext: 'dashboard',
    errorContext: 'dashboard',
    preload: true, // Core layout component
    retry: 3
  }
);

// Teacher Dashboard
export const LazyTeacherDashboard = createLazyTeacherComponent(
  () => import('./TeacherDashboard'),
  {
    loadingContext: 'dashboard',
    errorContext: 'dashboard',
    preload: false,
    retry: 3
  }
);

// Teacher Hour Dashboard
export const LazyTeacherHourDashboard = createLazyTeacherComponent(
  () => import('./TeacherHourDashboard'),
  {
    loadingContext: 'dashboard',
    errorContext: 'dashboard',
    preload: false,
    retry: 3
  }
);

// Scheduling Components
export const LazyAvailabilityScheduler = createLazyTeacherComponent(
  () => import('./AvailabilityScheduler'),
  {
    loadingContext: 'form',
    errorContext: 'form',
    preload: false,
    retry: 3
  }
);

export const LazyAvailabilitySchedulerEnhanced = createLazyTeacherComponent(
  () => import('./AvailabilitySchedulerEnhanced'),
  {
    loadingContext: 'form',
    errorContext: 'form',
    preload: false,
    retry: 3
  }
);

export const LazyWeeklyTimetable = createLazyTeacherComponent(
  () => import('./WeeklyTimetable'),
  {
    loadingContext: 'table',
    errorContext: 'table',
    preload: false,
    retry: 3
  }
);

export const LazyWeeklyTimetableEnhanced = createLazyTeacherComponent(
  () => import('./WeeklyTimetableEnhanced'),
  {
    loadingContext: 'table',
    errorContext: 'table',
    preload: false,
    retry: 3
  }
);

// Hour Tracking and Compensation
export const LazyClassHourTracker = createLazyTeacherComponent(
  () => import('./ClassHourTracker'),
  {
    loadingContext: 'table',
    errorContext: 'table',
    preload: false,
    retry: 3
  }
);

export const LazyClassHourTrackerEnhanced = createLazyTeacherComponent(
  () => import('./ClassHourTrackerEnhanced'),
  {
    loadingContext: 'table',
    errorContext: 'table',
    preload: false,
    retry: 3
  }
);

export const LazyCompensationDisplay = createLazyTeacherComponent(
  () => import('./CompensationDisplay'),
  {
    loadingContext: 'default',
    errorContext: 'default',
    preload: false,
    retry: 3
  }
);

export const LazyBonusRulesDisplay = createLazyTeacherComponent(
  () => import('./BonusRulesDisplay'),
  {
    loadingContext: 'default',
    errorContext: 'default',
    preload: false,
    retry: 3
  }
);

// Analytics Components
export const LazyTeacherAnalytics = createLazyTeacherComponent(
  () => import('./TeacherAnalytics'),
  {
    loadingContext: 'analytics',
    errorContext: 'analytics',
    preload: false,
    retry: 3
  }
);

export const LazyTeacherAnalyticsDashboard = createLazyTeacherComponent(
  () => import('./TeacherAnalyticsDashboard'),
  {
    loadingContext: 'analytics',
    errorContext: 'analytics',
    preload: false,
    retry: 3
  }
);

// Class Management and Capacity
export const LazyClassCapacityManagement = createLazyTeacherComponent(
  () => import('./ClassCapacityManagement'),
  {
    loadingContext: 'form',
    errorContext: 'form',
    preload: false,
    retry: 3
  }
);

// Export and Reporting
export const LazyExportFunctionality = createLazyTeacherComponent(
  () => import('./ExportFunctionality'),
  {
    loadingContext: 'default',
    errorContext: 'default',
    preload: false,
    retry: 3
  }
);

// Preload functions for common teacher workflows
export const preloadTeacherDashboard = () => {
  preloadComponent(() => import('./TeacherDashboardLayout'), 0);
  preloadComponent(() => import('./TeacherDashboard'), 500);
  preloadComponent(() => import('./CompensationDisplay'), 1000);
};

export const preloadTeacherScheduling = () => {
  preloadComponent(() => import('./AvailabilityScheduler'), 0);
  preloadComponent(() => import('./WeeklyTimetable'), 500);
  preloadComponent(() => import('./ClassCapacityManagement'), 1000);
};

export const preloadTeacherClassManagement = () => {
  preloadComponent(() => import('./TeacherClassManagement'), 0);
  preloadComponent(() => import('./ClassHourTracker'), 500);
  preloadComponent(() => import('./TeacherAssignmentGrading'), 1000);
};

export const preloadTeacherAnalytics = () => {
  preloadComponent(() => import('./TeacherAnalytics'), 0);
  preloadComponent(() => import('./TeacherAnalyticsDashboard'), 500);
};

export const preloadTeacherHours = () => {
  preloadComponent(() => import('./TeacherHourDashboard'), 0);
  preloadComponent(() => import('./ClassHourTrackerEnhanced'), 500);
  preloadComponent(() => import('./BonusRulesDisplay'), 1000);
};

export const preloadTeacherEnhanced = () => {
  preloadComponent(() => import('./AvailabilitySchedulerEnhanced'), 0);
  preloadComponent(() => import('./WeeklyTimetableEnhanced'), 500);
  preloadComponent(() => import('./ClassHourTrackerEnhanced'), 1000);
};

// Export all components for direct use
export default {
  // Core Components
  LazyTeacherDashboardLayout,
  LazyTeacherDashboard,
  LazyTeacherHourDashboard,
  LazyTeacherAssignmentGrading,
  LazyTeacherClassManagement,
  
  // Scheduling Components
  LazyAvailabilityScheduler,
  LazyAvailabilitySchedulerEnhanced,
  LazyWeeklyTimetable,
  LazyWeeklyTimetableEnhanced,
  
  // Hour Tracking
  LazyClassHourTracker,
  LazyClassHourTrackerEnhanced,
  LazyCompensationDisplay,
  LazyBonusRulesDisplay,
  
  // Analytics
  LazyTeacherAnalytics,
  LazyTeacherAnalyticsDashboard,
  
  // Class Management
  LazyClassCapacityManagement,
  
  // Export
  LazyExportFunctionality,
  
  // Preload Functions
  preloadTeacherDashboard,
  preloadTeacherScheduling,
  preloadTeacherClassManagement,
  preloadTeacherAnalytics,
  preloadTeacherHours,
  preloadTeacherEnhanced
};