/**
 * HeyPeter Academy - Scheduling System Types
 * 
 * This file contains comprehensive TypeScript interfaces and types for the
 * AI-powered automatic class scheduling system. These types support:
 * - Max 9 students per class constraint
 * - Automatic scheduling based on unlearned content
 * - Conflict resolution and duplicate detection
 * - Manual override capabilities
 * - Content synchronization for class groups
 * - Alternative class recommendations
 * - Daily data table updates
 */

import type { Tables } from './database';

// =============================================================================
// CORE SCHEDULING TYPES
// =============================================================================

/**
 * Scheduling algorithm status and processing states
 */
export type SchedulingStatus = 
  | 'idle'
  | 'analyzing'
  | 'processing'
  | 'optimizing'
  | 'validating'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Scheduling operation types
 */
export type SchedulingOperationType = 
  | 'auto_schedule'
  | 'reschedule'
  | 'conflict_resolution'
  | 'optimization'
  | 'content_sync'
  | 'manual_override';

/**
 * Class scheduling priority levels
 */
export type SchedulingPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Course types supported by the scheduling system
 */
export type CourseType = 'Basic' | 'Everyday A' | 'Everyday B' | 'Speak Up' | 'Business English' | '1-on-1';

/**
 * Class capacity constraints
 */
export interface ClassCapacityConstraint {
  /** Maximum students allowed per class (hard limit: 9) */
  maxStudents: number;
  /** Minimum students required for class to run */
  minStudents: number;
  /** Current enrollment count */
  currentEnrollment: number;
  /** Available spots remaining */
  availableSpots: number;
}

/**
 * Time slot representation for scheduling
 */
export interface TimeSlot {
  /** Unique identifier for the time slot */
  id: string;
  /** Start time in ISO format */
  startTime: string;
  /** End time in ISO format */
  endTime: string;
  /** Duration in minutes */
  duration: number;
  /** Day of the week (0-6, Sunday=0) */
  dayOfWeek: number;
  /** Whether this slot is available for booking */
  isAvailable: boolean;
  /** Capacity constraints for this slot */
  capacity: ClassCapacityConstraint;
  /** Location or meeting link */
  location?: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Learning content unit for scheduling decisions
 */
export interface LearningContent {
  /** Unique identifier */
  id: string;
  /** Course this content belongs to */
  courseId: string;
  /** Course type */
  courseType: CourseType;
  /** Unit number within the course */
  unitNumber: number;
  /** Lesson number within the unit */
  lessonNumber: number;
  /** Content title */
  title: string;
  /** Content description */
  description?: string;
  /** Estimated duration in minutes */
  estimatedDuration: number;
  /** Prerequisites (other content IDs) */
  prerequisites: string[];
  /** Learning objectives */
  learningObjectives: string[];
  /** Difficulty level (1-10) */
  difficultyLevel: number;
  /** Whether this content is required or optional */
  isRequired: boolean;
  /** Skills covered in this content */
  skills: LearningSkill[];
  /** Content metadata */
  metadata?: Record<string, any>;
}

/**
 * Learning skill categories
 */
export interface LearningSkill {
  /** Skill identifier */
  id: string;
  /** Skill name */
  name: string;
  /** Skill category */
  category: 'speaking' | 'listening' | 'reading' | 'writing' | 'grammar' | 'vocabulary' | 'pronunciation';
  /** Skill level (1-10) */
  level: number;
  /** Skill weight in curriculum */
  weight: number;
}

/**
 * Student progress tracking for scheduling decisions
 */
export interface StudentProgress {
  /** Student ID */
  studentId: string;
  /** Course ID */
  courseId: string;
  /** Overall progress percentage (0-100) */
  progressPercentage: number;
  /** Current unit being studied */
  currentUnit: number;
  /** Current lesson being studied */
  currentLesson: number;
  /** Completed content IDs */
  completedContent: string[];
  /** Content currently in progress */
  inProgressContent: string[];
  /** Unlearned content IDs */
  unlearnedContent: string[];
  /** Skill assessments */
  skillAssessments: Record<string, number>;
  /** Learning pace (lessons per week) */
  learningPace: number;
  /** Preferred learning times */
  preferredTimes: TimeSlot[];
  /** Last activity timestamp */
  lastActivity: string;
  /** Study streak (consecutive days) */
  studyStreak: number;
  /** Performance metrics */
  performanceMetrics: StudentPerformanceMetrics;
}

/**
 * Student performance metrics for scheduling optimization
 */
export interface StudentPerformanceMetrics {
  /** Average attendance rate (0-1) */
  attendanceRate: number;
  /** Average assignment completion rate (0-1) */
  assignmentCompletionRate: number;
  /** Average quiz/test scores (0-100) */
  averageScore: number;
  /** Engagement level (1-10) */
  engagementLevel: number;
  /** Preferred class types */
  preferredClassTypes: ('individual' | 'group')[];
  /** Optimal class size preference */
  optimalClassSize: number;
  /** Best performing time slots */
  bestPerformingTimes: TimeSlot[];
  /** Challenging topics that need more attention */
  challengingTopics: string[];
}

// =============================================================================
// SCHEDULING ALGORITHM TYPES
// =============================================================================

/**
 * Scheduling algorithm configuration
 */
export interface SchedulingAlgorithmConfig {
  /** Algorithm version */
  version: string;
  /** Maximum processing time in milliseconds */
  maxProcessingTime: number;
  /** Enable conflict resolution */
  enableConflictResolution: boolean;
  /** Enable content synchronization */
  enableContentSync: boolean;
  /** Enable performance optimization */
  enablePerformanceOptimization: boolean;
  /** Maximum iterations for optimization */
  maxOptimizationIterations: number;
  /** Scoring weights for different criteria */
  scoringWeights: SchedulingScoringWeights;
  /** Constraints configuration */
  constraints: SchedulingConstraints;
}

/**
 * Scoring weights for scheduling decisions
 */
export interface SchedulingScoringWeights {
  /** Weight for content progression alignment */
  contentProgression: number;
  /** Weight for student availability */
  studentAvailability: number;
  /** Weight for teacher availability */
  teacherAvailability: number;
  /** Weight for class size optimization */
  classSizeOptimization: number;
  /** Weight for learning pace matching */
  learningPaceMatching: number;
  /** Weight for skill level alignment */
  skillLevelAlignment: number;
  /** Weight for schedule continuity */
  scheduleContinuity: number;
  /** Weight for resource utilization */
  resourceUtilization: number;
}

/**
 * Scheduling constraints
 */
export interface SchedulingConstraints {
  /** Maximum students per class (hard limit: 9) */
  maxStudentsPerClass: number;
  /** Minimum students required for group class */
  minStudentsForGroupClass: number;
  /** Maximum concurrent classes per teacher */
  maxConcurrentClassesPerTeacher: number;
  /** Maximum classes per day per student */
  maxClassesPerDayPerStudent: number;
  /** Minimum break time between classes (minutes) */
  minBreakBetweenClasses: number;
  /** Maximum advance booking period (days) */
  maxAdvanceBookingDays: number;
  /** Minimum advance booking period (hours) */
  minAdvanceBookingHours: number;
  /** Working hours constraints */
  workingHours: {
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
  /** Available days of week */
  availableDays: number[]; // 0-6, Sunday=0
  /** Holiday and blocked dates */
  blockedDates: string[]; // ISO date strings
}

/**
 * Scheduling request input
 */
export interface SchedulingRequest {
  /** Request ID */
  id: string;
  /** Request type */
  type: SchedulingOperationType;
  /** Priority level */
  priority: SchedulingPriority;
  /** Student IDs to schedule */
  studentIds: string[];
  /** Course ID */
  courseId: string;
  /** Preferred time slots */
  preferredTimeSlots?: TimeSlot[];
  /** Content to be covered */
  contentToSchedule?: string[];
  /** Constraints specific to this request */
  constraints?: Partial<SchedulingConstraints>;
  /** Manual override flags */
  manualOverrides?: SchedulingOverride[];
  /** Additional context */
  context?: Record<string, any>;
  /** Request timestamp */
  requestedAt: string;
  /** Requested by user ID */
  requestedBy: string;
}

/**
 * Manual override configuration
 */
export interface SchedulingOverride {
  /** Override type */
  type: 'force_schedule' | 'prevent_schedule' | 'preferred_teacher' | 'preferred_time' | 'class_size';
  /** Override parameters */
  parameters: Record<string, any>;
  /** Override reason */
  reason: string;
  /** Override priority */
  priority: SchedulingPriority;
  /** Applied by user ID */
  appliedBy: string;
  /** Applied timestamp */
  appliedAt: string;
}

/**
 * Scheduling result output
 */
export interface SchedulingResult {
  /** Request ID this result corresponds to */
  requestId: string;
  /** Success status */
  success: boolean;
  /** Processing status */
  status: SchedulingStatus;
  /** Scheduled classes */
  scheduledClasses: ScheduledClass[];
  /** Conflicts detected */
  conflicts: SchedulingConflict[];
  /** Recommendations for unscheduled requests */
  recommendations: SchedulingRecommendation[];
  /** Algorithm metrics */
  metrics: SchedulingMetrics;
  /** Error details if failed */
  error?: SchedulingError;
  /** Processing timestamps */
  timestamps: {
    started: string;
    completed: string;
    processingTime: number; // milliseconds
  };
}

/**
 * Scheduled class representation
 */
export interface ScheduledClass {
  /** Unique class ID */
  id: string;
  /** Course ID */
  courseId: string;
  /** Teacher ID */
  teacherId: string;
  /** Student IDs enrolled */
  studentIds: string[];
  /** Time slot */
  timeSlot: TimeSlot;
  /** Content to be covered */
  content: LearningContent[];
  /** Class type */
  classType: 'individual' | 'group';
  /** Status */
  status: 'scheduled' | 'confirmed' | 'cancelled';
  /** Confidence score (0-1) */
  confidenceScore: number;
  /** Scheduling rationale */
  rationale: string;
  /** Alternative options */
  alternatives: ScheduledClass[];
  /** Metadata */
  metadata?: Record<string, any>;
}

/**
 * Scheduling conflict representation
 */
export interface SchedulingConflict {
  /** Conflict ID */
  id: string;
  /** Conflict type */
  type: 'time_overlap' | 'capacity_exceeded' | 'teacher_unavailable' | 'student_unavailable' | 'content_mismatch' | 'resource_conflict';
  /** Severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Conflicting entity IDs */
  entityIds: string[];
  /** Conflict description */
  description: string;
  /** Suggested resolutions */
  resolutions: ConflictResolution[];
  /** Detected timestamp */
  detectedAt: string;
  /** Conflict metadata */
  metadata?: Record<string, any>;
}

/**
 * Conflict resolution options
 */
export interface ConflictResolution {
  /** Resolution ID */
  id: string;
  /** Resolution type */
  type: 'reschedule' | 'reassign_teacher' | 'split_class' | 'merge_classes' | 'cancel_conflicting' | 'manual_intervention';
  /** Resolution description */
  description: string;
  /** Impact assessment */
  impact: ResolutionImpact;
  /** Feasibility score (0-1) */
  feasibilityScore: number;
  /** Estimated implementation time */
  estimatedImplementationTime: number; // minutes
  /** Required approvals */
  requiredApprovals: string[];
  /** Resolution steps */
  steps: ResolutionStep[];
}

/**
 * Resolution impact assessment
 */
export interface ResolutionImpact {
  /** Affected student count */
  affectedStudents: number;
  /** Affected teacher count */
  affectedTeachers: number;
  /** Schedule disruption level (1-10) */
  scheduleDisruption: number;
  /** Resource utilization impact */
  resourceUtilization: number;
  /** Student satisfaction impact */
  studentSatisfaction: number;
  /** Cost implications */
  costImplications?: number;
}

/**
 * Resolution step for implementation
 */
export interface ResolutionStep {
  /** Step order */
  order: number;
  /** Step description */
  description: string;
  /** Step type */
  type: 'notification' | 'database_update' | 'schedule_change' | 'resource_allocation' | 'approval_required';
  /** Step parameters */
  parameters: Record<string, any>;
  /** Estimated duration */
  estimatedDuration: number; // minutes
  /** Dependencies */
  dependencies: string[];
}

/**
 * Scheduling recommendations
 */
export interface SchedulingRecommendation {
  /** Recommendation ID */
  id: string;
  /** Recommendation type */
  type: 'alternative_time' | 'alternative_teacher' | 'content_adjustment' | 'class_format_change' | 'prerequisite_scheduling';
  /** Recommendation description */
  description: string;
  /** Confidence score (0-1) */
  confidenceScore: number;
  /** Potential benefits */
  benefits: string[];
  /** Potential drawbacks */
  drawbacks: string[];
  /** Implementation complexity */
  complexity: 'low' | 'medium' | 'high';
  /** Recommended action */
  action: RecommendedAction;
  /** Priority level */
  priority: SchedulingPriority;
}

/**
 * Recommended action for scheduling
 */
export interface RecommendedAction {
  /** Action type */
  type: 'schedule_class' | 'modify_schedule' | 'notify_stakeholders' | 'request_approval' | 'defer_scheduling';
  /** Action parameters */
  parameters: Record<string, any>;
  /** Deadline for action */
  deadline?: string;
  /** Responsible party */
  assignedTo?: string;
}

/**
 * Scheduling algorithm metrics
 */
export interface SchedulingMetrics {
  /** Total processing time */
  processingTime: number; // milliseconds
  /** Number of students processed */
  studentsProcessed: number;
  /** Number of classes scheduled */
  classesScheduled: number;
  /** Number of conflicts detected */
  conflictsDetected: number;
  /** Number of conflicts resolved */
  conflictsResolved: number;
  /** Overall success rate */
  successRate: number; // 0-1
  /** Resource utilization efficiency */
  resourceUtilization: number; // 0-1
  /** Student satisfaction score */
  studentSatisfactionScore: number; // 0-1
  /** Teacher satisfaction score */
  teacherSatisfactionScore: number; // 0-1
  /** Algorithm iterations performed */
  iterationsPerformed: number;
  /** Optimization improvements */
  optimizationImprovements: number;
}

/**
 * Scheduling error details
 */
export interface SchedulingError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Error category */
  category: 'validation' | 'constraint' | 'resource' | 'algorithm' | 'system';
  /** Error severity */
  severity: 'warning' | 'error' | 'critical';
  /** Error details */
  details?: Record<string, any>;
  /** Error timestamp */
  timestamp: string;
  /** Stack trace for debugging */
  stackTrace?: string;
}

// =============================================================================
// CONTENT SYNCHRONIZATION TYPES
// =============================================================================

/**
 * Content synchronization configuration
 */
export interface ContentSyncConfig {
  /** Enable automatic content synchronization */
  enabled: boolean;
  /** Synchronization frequency */
  syncFrequency: 'real-time' | 'hourly' | 'daily' | 'weekly';
  /** Maximum sync batch size */
  maxBatchSize: number;
  /** Sync priorities */
  priorities: ContentSyncPriority[];
  /** Conflict resolution strategy */
  conflictResolution: 'merge' | 'overwrite' | 'manual';
}

/**
 * Content synchronization priority
 */
export interface ContentSyncPriority {
  /** Content type */
  contentType: string;
  /** Priority level */
  priority: number;
  /** Sync strategy */
  strategy: 'immediate' | 'batched' | 'scheduled';
}

/**
 * Content synchronization status
 */
export interface ContentSyncStatus {
  /** Sync ID */
  id: string;
  /** Sync status */
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  /** Content items synchronized */
  itemsSynced: number;
  /** Total items to sync */
  totalItems: number;
  /** Sync progress percentage */
  progress: number;
  /** Sync started timestamp */
  startedAt: string;
  /** Sync completed timestamp */
  completedAt?: string;
  /** Error details if failed */
  error?: string;
}

// =============================================================================
// DAILY DATA UPDATES TYPES
// =============================================================================

/**
 * Daily data update configuration
 */
export interface DailyDataUpdateConfig {
  /** Update schedule time (HH:MM format) */
  scheduleTime: string;
  /** Timezone for updates */
  timezone: string;
  /** Update components */
  components: DailyUpdateComponent[];
  /** Notification settings */
  notifications: DailyUpdateNotification[];
  /** Retry configuration */
  retryConfig: {
    maxRetries: number;
    retryDelay: number; // milliseconds
    backoffMultiplier: number;
  };
}

/**
 * Daily update component
 */
export interface DailyUpdateComponent {
  /** Component name */
  name: string;
  /** Component type */
  type: 'student_progress' | 'teacher_availability' | 'class_schedules' | 'content_sync' | 'performance_metrics';
  /** Update priority */
  priority: number;
  /** Dependencies */
  dependencies: string[];
  /** Enabled status */
  enabled: boolean;
  /** Update frequency */
  frequency: 'daily' | 'weekly' | 'monthly';
  /** Configuration parameters */
  config: Record<string, any>;
}

/**
 * Daily update notification
 */
export interface DailyUpdateNotification {
  /** Notification type */
  type: 'email' | 'sms' | 'push' | 'in_app';
  /** Notification triggers */
  triggers: ('success' | 'failure' | 'warning')[];
  /** Recipient roles */
  recipients: string[];
  /** Notification template */
  template: string;
  /** Enabled status */
  enabled: boolean;
}

/**
 * Daily update status
 */
export interface DailyUpdateStatus {
  /** Update ID */
  id: string;
  /** Update date */
  date: string;
  /** Overall status */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'partial';
  /** Component statuses */
  components: DailyUpdateComponentStatus[];
  /** Update started timestamp */
  startedAt: string;
  /** Update completed timestamp */
  completedAt?: string;
  /** Total processing time */
  processingTime?: number; // milliseconds
  /** Summary metrics */
  metrics: DailyUpdateMetrics;
}

/**
 * Daily update component status
 */
export interface DailyUpdateComponentStatus {
  /** Component name */
  name: string;
  /** Component status */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  /** Processing time */
  processingTime?: number; // milliseconds
  /** Records processed */
  recordsProcessed?: number;
  /** Error details if failed */
  error?: string;
  /** Component-specific metrics */
  metrics?: Record<string, any>;
}

/**
 * Daily update metrics
 */
export interface DailyUpdateMetrics {
  /** Total records processed */
  totalRecords: number;
  /** Successful updates */
  successfulUpdates: number;
  /** Failed updates */
  failedUpdates: number;
  /** Skipped updates */
  skippedUpdates: number;
  /** Data quality score */
  dataQualityScore: number; // 0-1
  /** Performance improvement */
  performanceImprovement: number; // percentage
  /** System health score */
  systemHealthScore: number; // 0-1
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/**
 * Generic API response wrapper
 */
export interface SchedulingApiResponse<T = any> {
  /** Success status */
  success: boolean;
  /** Response data */
  data?: T;
  /** Error details */
  error?: SchedulingError;
  /** Response metadata */
  metadata?: {
    requestId: string;
    timestamp: string;
    processingTime: number;
    version: string;
  };
}

/**
 * Paginated response for scheduling data
 */
export interface SchedulingPaginatedResponse<T = any> {
  /** Items array */
  items: T[];
  /** Pagination metadata */
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  /** Filters applied */
  filters?: Record<string, any>;
  /** Sorting applied */
  sorting?: {
    field: string;
    direction: 'asc' | 'desc';
  };
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Scheduling service state
 */
export interface SchedulingServiceState {
  /** Current status */
  status: SchedulingStatus;
  /** Active requests */
  activeRequests: SchedulingRequest[];
  /** Processing queue */
  processingQueue: SchedulingRequest[];
  /** Recent results */
  recentResults: SchedulingResult[];
  /** Service configuration */
  config: SchedulingAlgorithmConfig;
  /** Service metrics */
  metrics: SchedulingServiceMetrics;
}

/**
 * Scheduling service metrics
 */
export interface SchedulingServiceMetrics {
  /** Total requests processed */
  totalRequests: number;
  /** Successful requests */
  successfulRequests: number;
  /** Failed requests */
  failedRequests: number;
  /** Average processing time */
  averageProcessingTime: number; // milliseconds
  /** Current queue size */
  currentQueueSize: number;
  /** Peak queue size */
  peakQueueSize: number;
  /** Service uptime */
  uptime: number; // milliseconds
  /** Last update timestamp */
  lastUpdated: string;
}

/**
 * Scheduling cache entry
 */
export interface SchedulingCacheEntry<T = any> {
  /** Cache key */
  key: string;
  /** Cached data */
  data: T;
  /** Cache timestamp */
  timestamp: string;
  /** Time to live */
  ttl: number; // milliseconds
  /** Access count */
  accessCount: number;
  /** Last accessed timestamp */
  lastAccessed: string;
}

/**
 * Scheduling event for logging and monitoring
 */
export interface SchedulingEvent {
  /** Event ID */
  id: string;
  /** Event type */
  type: 'request_received' | 'processing_started' | 'processing_completed' | 'conflict_detected' | 'optimization_applied' | 'error_occurred';
  /** Event timestamp */
  timestamp: string;
  /** Event source */
  source: 'api' | 'scheduler' | 'optimizer' | 'conflict_resolver' | 'sync_service';
  /** Event data */
  data: Record<string, any>;
  /** Event metadata */
  metadata?: Record<string, any>;
}

// =============================================================================
// EXPORT TYPES FOR EXTERNAL USE
// =============================================================================

export type {
  // Database types from existing schema
  Tables,
  // Core scheduling types
  SchedulingStatus,
  SchedulingOperationType,
  SchedulingPriority,
  CourseType,
  ClassCapacityConstraint,
  TimeSlot,
  LearningContent,
  LearningSkill,
  StudentProgress,
  StudentPerformanceMetrics,
  // Algorithm types
  SchedulingAlgorithmConfig,
  SchedulingScoringWeights,
  SchedulingConstraints,
  SchedulingRequest,
  SchedulingOverride,
  SchedulingResult,
  ScheduledClass,
  SchedulingConflict,
  ConflictResolution,
  SchedulingRecommendation,
  RecommendedAction,
  SchedulingMetrics,
  SchedulingError,
  // Content sync types
  ContentSyncConfig,
  ContentSyncStatus,
  // Daily update types
  DailyDataUpdateConfig,
  DailyUpdateStatus,
  DailyUpdateMetrics,
  // API types
  SchedulingApiResponse,
  SchedulingPaginatedResponse,
  // Utility types
  SchedulingServiceState,
  SchedulingServiceMetrics,
  SchedulingCacheEntry,
  SchedulingEvent,
};