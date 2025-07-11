'use client';

// Lazy loading definitions for admin components
import { createLazyAdminComponent, preloadComponent } from '@/lib/utils/lazy-factory';

// Large Admin Components (Heavy components that benefit from code splitting)

// Scheduling Components (Very heavy - AI and complex algorithms)
export const LazyAIRecommendationSystem = createLazyAdminComponent(
  () => import('./scheduling/AIRecommendationSystem'),
  {
    preload: false,
    retry: 3
  }
);

export const LazyBulkSchedulingOperations = createLazyAdminComponent(
  () => import('./scheduling/BulkSchedulingOperations'),
  {
    preload: false,
    retry: 3
  }
);

export const LazySchedulingAnalytics = createLazyAdminComponent(
  () => import('./scheduling/SchedulingAnalytics'),
  {
    preload: false,
    retry: 3
  }
);

export const LazyManualOverrideInterface = createLazyAdminComponent(
  () => import('./scheduling/ManualOverrideInterface'),
  {
    preload: false,
    retry: 3
  }
);

export const LazyAutoSchedulingDashboard = createLazyAdminComponent(
  () => import('./scheduling/AutoSchedulingDashboard'),
  {
    preload: false,
    retry: 3
  }
);

export const LazySchedulingDashboard = createLazyAdminComponent(
  () => import('./scheduling/SchedulingDashboard'),
  {
    preload: false,
    retry: 3
  }
);

export const LazyStudentProgressAnalyzer = createLazyAdminComponent(
  () => import('./scheduling/StudentProgressAnalyzer'),
  {
    preload: false,
    retry: 3
  }
);

// Student Information Management (Large component)
export const LazyStudentInformationManager = createLazyAdminComponent(
  () => import('./StudentInformationManager'),
  {
    preload: false,
    retry: 3
  }
);

export const LazyStudentInformationManagerClient = createLazyAdminComponent(
  () => import('./StudentInformationManagerClient'),
  {
    preload: false,
    retry: 3
  }
);

// Hour Management Components
export const LazyHourManagementDashboard = createLazyAdminComponent(
  () => import('./hours/HourManagementDashboard'),
  {
    preload: false,
    retry: 3
  }
);

export const LazyHourAnalyticsDashboard = createLazyAdminComponent(
  () => import('./hours/HourAnalyticsDashboard'),
  {
    preload: false,
    retry: 3
  }
);

export const LazyHourConsumptionDashboard = createLazyAdminComponent(
  () => import('./hours/HourConsumptionDashboard'),
  {
    preload: false,
    retry: 3
  }
);

export const LazyHourConsumptionComparison = createLazyAdminComponent(
  () => import('./hours/HourConsumptionComparison'),
  {
    preload: false,
    retry: 3
  }
);

export const LazyHourUsageAnalytics = createLazyAdminComponent(
  () => import('./hours/HourUsageAnalytics'),
  {
    preload: false,
    retry: 3
  }
);

export const LazyLeaveRequestsManagement = createLazyAdminComponent(
  () => import('./hours/LeaveRequestsManagement'),
  {
    preload: false,
    retry: 3
  }
);

export const LazyLeaveRulesManagement = createLazyAdminComponent(
  () => import('./hours/LeaveRulesManagement'),
  {
    preload: false,
    retry: 3
  }
);

// Leave Request Approval
export const LazyLeaveRequestApproval = createLazyAdminComponent(
  () => import('./LeaveRequestApproval'),
  {
    preload: false,
    retry: 3
  }
);

// Import/Export Components
export const LazyImportExportDialog = createLazyAdminComponent(
  () => import('./ImportExportDialog'),
  {
    preload: false,
    retry: 3
  }
);

// Export Components
export const LazyExportDashboard = createLazyAdminComponent(
  () => import('./export/ExportDashboard'),
  {
    preload: false,
    retry: 3
  }
);

export const LazyBatchExportDialog = createLazyAdminComponent(
  () => import('./export/BatchExportDialog'),
  {
    preload: false,
    retry: 3
  }
);

export const LazyExportTemplateManager = createLazyAdminComponent(
  () => import('./export/ExportTemplateManager'),
  {
    preload: false,
    retry: 3
  }
);

export const LazyScheduledExportManager = createLazyAdminComponent(
  () => import('./export/ScheduledExportManager'),
  {
    preload: false,
    retry: 3
  }
);

// Email Management
export const LazyEmailManagementDashboard = createLazyAdminComponent(
  () => import('./email/EmailManagementDashboard'),
  {
    preload: false,
    retry: 3
  }
);

export const LazyEmailPreferencesManager = createLazyAdminComponent(
  () => import('./email/EmailPreferencesManager'),
  {
    preload: false,
    retry: 3
  }
);

// Attendance Components
export const LazyAttendanceReportsPage = createLazyAdminComponent(
  () => import('./attendance/AttendanceReportsPage'),
  {
    preload: false,
    retry: 3
  }
);

export const LazyAttendanceComparisonDashboard = createLazyAdminComponent(
  () => import('./attendance/AttendanceComparisonDashboard'),
  {
    preload: false,
    retry: 3
  }
);

export const LazyClassAttendanceAnalyticsDashboard = createLazyAdminComponent(
  () => import('./attendance/ClassAttendanceAnalyticsDashboard'),
  {
    preload: false,
    retry: 3
  }
);

export const LazyAttendancePredictiveAnalytics = createLazyAdminComponent(
  () => import('./attendance/AttendancePredictiveAnalytics'),
  {
    preload: false,
    retry: 3
  }
);

// Content Management
export const LazyContentManagementClient = createLazyAdminComponent(
  () => import('./content/ContentManagementClient'),
  {
    preload: false,
    retry: 3
  }
);

export const LazyContentSynchronizationDashboard = createLazyAdminComponent(
  () => import('./content/ContentSynchronizationDashboard'),
  {
    preload: false,
    retry: 3
  }
);

// Postponement Management
export const LazyPostponementManagement = createLazyAdminComponent(
  () => import('./postponements/PostponementManagement'),
  {
    preload: false,
    retry: 3
  }
);

// Settings Components
export const LazySettingsClient = createLazyAdminComponent(
  () => import('./settings/SettingsClient'),
  {
    preload: false,
    retry: 3
  }
);

// Students, Teachers, Users Management
export const LazyStudentsPageClient = createLazyAdminComponent(
  () => import('./students/StudentsPageClient'),
  {
    preload: false,
    retry: 3
  }
);

export const LazyTeachersPageClient = createLazyAdminComponent(
  () => import('./teachers/TeachersPageClient'),
  {
    preload: false,
    retry: 3
  }
);

export const LazyUserManagementClient = createLazyAdminComponent(
  () => import('./users/UserManagementClient'),
  {
    preload: false,
    retry: 3
  }
);

// Teacher Performance Management
export const LazyTeacherPerformanceManagement = createLazyAdminComponent(
  () => import('./dashboard/TeacherPerformanceManagement'),
  {
    preload: false,
    retry: 3
  }
);

// Preload functions for common admin workflows
export const preloadAdminDashboard = () => {
  preloadComponent(() => import('./dashboard/DashboardContent'), 0);
  preloadComponent(() => import('./dashboard/AnalyticsChart'), 500);
};

export const preloadAdminScheduling = () => {
  preloadComponent(() => import('./scheduling/SchedulingDashboard'), 0);
  preloadComponent(() => import('./scheduling/AIRecommendationSystem'), 1000);
  preloadComponent(() => import('./scheduling/BulkSchedulingOperations'), 2000);
};

export const preloadAdminAnalytics = () => {
  preloadComponent(() => import('./scheduling/SchedulingAnalytics'), 0);
  preloadComponent(() => import('./hours/HourAnalyticsDashboard'), 1000);
  preloadComponent(() => import('./attendance/AttendanceComparisonDashboard'), 2000);
};

export const preloadAdminHourManagement = () => {
  preloadComponent(() => import('./hours/HourManagementDashboard'), 0);
  preloadComponent(() => import('./hours/HourConsumptionDashboard'), 500);
  preloadComponent(() => import('./hours/LeaveRequestsManagement'), 1000);
};

export const preloadAdminUserManagement = () => {
  preloadComponent(() => import('./students/StudentsPageClient'), 0);
  preloadComponent(() => import('./teachers/TeachersPageClient'), 500);
  preloadComponent(() => import('./users/UserManagementClient'), 1000);
};

export const preloadAdminExport = () => {
  preloadComponent(() => import('./export/ExportDashboard'), 0);
  preloadComponent(() => import('./export/BatchExportDialog'), 500);
  preloadComponent(() => import('./ImportExportDialog'), 1000);
};

export const preloadAdminAttendance = () => {
  preloadComponent(() => import('./attendance/AttendanceReportsPage'), 0);
  preloadComponent(() => import('./attendance/ClassAttendanceAnalyticsDashboard'), 500);
  preloadComponent(() => import('./attendance/AttendancePredictiveAnalytics'), 1000);
};

// Export all components for direct use
export default {
  // Scheduling Components
  LazyAIRecommendationSystem,
  LazyBulkSchedulingOperations,
  LazySchedulingAnalytics,
  LazyManualOverrideInterface,
  LazyAutoSchedulingDashboard,
  LazySchedulingDashboard,
  LazyStudentProgressAnalyzer,
  
  // Student Management
  LazyStudentInformationManager,
  LazyStudentInformationManagerClient,
  LazyStudentsPageClient,
  
  // Hour Management
  LazyHourManagementDashboard,
  LazyHourAnalyticsDashboard,
  LazyHourConsumptionDashboard,
  LazyHourConsumptionComparison,
  LazyHourUsageAnalytics,
  LazyLeaveRequestsManagement,
  LazyLeaveRulesManagement,
  LazyLeaveRequestApproval,
  
  // Import/Export
  LazyImportExportDialog,
  LazyExportDashboard,
  LazyBatchExportDialog,
  LazyExportTemplateManager,
  LazyScheduledExportManager,
  
  // Email Management
  LazyEmailManagementDashboard,
  LazyEmailPreferencesManager,
  
  // Attendance
  LazyAttendanceReportsPage,
  LazyAttendanceComparisonDashboard,
  LazyClassAttendanceAnalyticsDashboard,
  LazyAttendancePredictiveAnalytics,
  
  // Content Management
  LazyContentManagementClient,
  LazyContentSynchronizationDashboard,
  
  // User Management
  LazyTeachersPageClient,
  LazyUserManagementClient,
  LazyTeacherPerformanceManagement,
  
  // Settings
  LazySettingsClient,
  
  // Postponements
  LazyPostponementManagement,
  
  // Preload Functions
  preloadAdminDashboard,
  preloadAdminScheduling,
  preloadAdminAnalytics,
  preloadAdminHourManagement,
  preloadAdminUserManagement,
  preloadAdminExport,
  preloadAdminAttendance
};