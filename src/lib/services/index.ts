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

export { 
  conflictDetectionService
} from './conflict-detection-service';