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
  enhancedTeacherPerformanceAnalytics,
  EnhancedTeacherPerformanceAnalytics
} from './teacher-performance-analytics-enhanced';

export { 
  teacherPerformanceDbService,
  TeacherPerformanceDbService
} from './teacher-performance-db-service';

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
  hourUsageAnalyticsService,
  HourUsageAnalyticsService
} from './hour-usage-analytics-service';

export { 
  leaveRulesService,
  LeaveRulesService
} from './leave-rules-service';

export { 
  hourConsumptionAnalyticsService,
  HourConsumptionAnalyticsService,
  type ClassTypeConsumption,
  type HourConsumptionTrend,
  type EfficiencyMetrics,
  type ConsumptionPattern,
  type PredictiveInsights,
  type ComparativeAnalytics,
  type HourPlanningRecommendations,
  type ConsumptionAnalyticsDashboard
} from './hour-consumption-analytics-service';

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

// Attendance Analytics Services
export { 
  attendanceAnalyticsService,
  type AttendanceFilters,
  type AttendanceRecord,
  type AttendanceClassSummary,
  type AttendanceTeacherSummary,
  type AttendancePeriodSummary,
  type AttendanceTrendData,
  type AttendanceReportPeriod,
  type AttendanceStatus
} from './attendance-analytics-service';

export { 
  classAttendanceAnalyticsService,
  ClassAttendanceAnalyticsService
} from './class-attendance-analytics-service';

// Database Optimization and Performance Services
export { 
  dbConnectionPool,
  DatabaseConnectionPool
} from './database-connection-pool';

export { 
  queryOptimizationService,
  QueryOptimizationService
} from './query-optimization-service';

export { 
  dbPerformanceMonitor,
  DatabasePerformanceMonitor
} from './database-performance-monitor';

export { 
  analyticsAggregationService
} from './analytics-aggregation-service';

export { 
  financialAnalyticsService
} from './financial-analytics-service';

// Feedback and Rating System Services
export { 
  feedbackService,
  FeedbackService,
  type StudentFeedback,
  type TeacherFeedback,
  type CourseFeedback,
  type FeedbackResponse,
  type FeedbackAlert,
  type TeacherRecommendation,
  type CourseRecommendation,
  type FeedbackAnalytics
} from './feedback-service';

export { 
  feedbackNotificationService,
  FeedbackNotificationService
} from './feedback-notification-service';

export { 
  feedbackRecommendationEngine,
  FeedbackRecommendationEngine
} from './feedback-recommendation-engine';

// Error Tracking and Logging Services
export { 
  loggingService,
  LogLevel,
  LogCategory,
  type LogEntry,
  type LogFilter,
  type LogMetrics
} from './logging-service';

export { 
  errorTrackingService,
  type ErrorContext,
  type ErrorBreadcrumb,
  type ErrorReport,
  type ErrorStats
} from './error-tracking-service';

export { 
  performanceTrackingService,
  PerformanceCategory,
  type PerformanceMetric,
  type PerformanceThreshold,
  type PerformanceAlert,
  type PerformanceReport
} from './performance-tracking-service';

export { 
  userActionTrackingService,
  UserActionType,
  type UserAction,
  type UserSession,
  type UserJourney
} from './user-action-tracking-service';

export { 
  errorAlertingService,
  type AlertRule,
  type AlertCondition,
  type AlertAction,
  type Alert,
  type AlertingSummary
} from './error-alerting-service';

// Popup Marketing System Services
export { 
  popupMarketingService,
  PopupMarketingService
} from './popup-marketing-service';

export { 
  PopupTriggerEngine,
  createVisitorSession
} from './popup-trigger-engine';

export { 
  popupEmailIntegrationService,
  PopupEmailIntegrationService
} from './popup-email-integration-service';