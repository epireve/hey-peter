// Export all services
export { CRUDService, withRetry } from './crud-service';
export { courseService, type Course, type CourseWithStats } from './course-service';
export { studentManagementService } from './student-management-service';
export { studentService } from './student-service';
export { 
  classCapacityService, 
  type ClassCapacityInfo, 
  type WaitingListEntry, 
  type ClassSplitRecommendation,
  type Enrollment 
} from './class-capacity-service';

// Content Synchronization Services
export { 
  contentSynchronizationService, 
  type ClassGroupSyncState,
  type ContentSyncOperation,
  type SyncConflict,
  type ContentProgressAlignment 
} from './content-synchronization-service';

export { 
  contentSyncScheduler,
  type SyncSchedule,
  type SyncJob,
  type SelectiveSyncOptions 
} from './content-sync-scheduler';

export { 
  contentSyncIntegration,
  type SyncIntegrationConfig,
  type SchedulingSyncResult,
  type ClassGroupSync 
} from './content-sync-integration';

// Scheduling and Rules Engine
export { schedulingRulesEngine } from './scheduling-rules-engine';

// 1v1 Booking Services
export { 
  oneOnOneBookingService,
  type OneOnOneBookingRequest,
  type OneOnOneBookingResult,
  type TeacherProfileForBooking,
  type OneOnOneAutoMatchingCriteria
} from './one-on-one-booking-service';

// Conflict detection service has been removed

// Analytics Services
export { 
  analyticsIntegrationService,
  type ComprehensiveAnalytics,
  type AnalyticsTimeframe
} from './analytics-integration-service';

export { 
  classEfficiencyAnalytics,
  type ClassEfficiencyMetrics,
  type UtilizationMetrics,
  type EfficiencyMetrics
} from './class-efficiency-analytics';

export { 
  teacherPerformanceAnalytics,
  type TeacherPerformanceMetrics,
  type TeacherComparisonAnalysis
} from './teacher-performance-analytics';

export { 
  studentProgressAnalytics,
  type StudentProgressAnalysis,
  type StudentCohortAnalysis
} from './student-progress-analytics';

// Hour Management Services
export { 
  hourTrackingService,
  default as hourTrackingServiceDefault 
} from './hour-tracking-service';

export { 
  leaveRequestService,
  default as leaveRequestServiceDefault 
} from './leave-request-service';

export { 
  teacherHourTrackingService,
  default as teacherHourTrackingServiceDefault 
} from './teacher-hour-tracking-service';

export { 
  hourEmailNotificationService,
  default as hourEmailNotificationServiceDefault 
} from './hour-email-notifications';

// Hour Management System
export { 
  hourManagementService,
  HourManagementService
} from './hour-management-service';

export { 
  leaveRulesService,
  LeaveRulesService
} from './leave-rules-service';

// Auto-Postponement and Make-up Class Services
export { 
  autoPostponementService,
  AutoPostponementService,
  type ClassPostponement,
  type MakeUpClass,
  type StudentSchedulePreferences,
  type MakeUpSuggestion,
  type PostponementSummary,
  type MakeUpClassSelectionRequest,
  type MakeUpClassApprovalRequest
} from './auto-postponement-service';

export { 
  makeUpClassSuggestionService,
  MakeUpClassSuggestionService,
  type MakeUpSuggestionRequest,
  type DetailedMakeUpSuggestion,
  type SuggestionAlgorithmConfig,
  type SuggestionConstraints
} from './makeup-class-suggestion-service';