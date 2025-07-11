// Authentication hooks
export * from './useAuth';

// Data management hooks
export * from './useStudentData';
export * from './useTeacherData';
export * from './useHourManagement';
export * from './useAnalytics';

// Form hooks
export * from './useForm';

// API hooks
export * from './useAPI';

// Pagination hooks
export * from './usePagination';

// Re-export commonly used hooks from existing files
export { useBulkSelection } from './useBulkSelection';
export { useAdvancedCache } from './useAdvancedCache';
export { useConflictDetection } from './useConflictDetection';
export { useOptimizedQuery } from './useOptimizedQuery';
export { usePerformanceMonitoring } from './usePerformanceMonitoring';
export { useRealtimeSubscription } from './useRealtimeSubscription';

// Common hook combinations
export const useCommonHooks = () => {
  return {
    // You can add commonly used hook combinations here
  };
};

// Types
export type {
  // Auth types
  UserRole,
  AuthUser,
  AuthState,
  LoginCredentials,
  SignupCredentials,
  ResetPasswordData,
  UpdatePasswordData,
  UpdateProfileData,
  UseAuthReturn,
} from './useAuth';

export type {
  // Student types
  StudentFilters,
  StudentSortOptions,
  StudentListOptions,
  StudentStats,
  UseStudentDataReturn,
} from './useStudentData';

export type {
  // Teacher types
  Teacher,
  CreateTeacherData,
  TeacherFilters,
  TeacherSortOptions,
  TeacherListOptions,
  TeacherStats,
  TeacherAvailability,
  TeacherPerformance,
  UseTeacherDataReturn,
} from './useTeacherData';

export type {
  // Hour management types
  HourManagementFilters,
  UseHourManagementReturn,
} from './useHourManagement';

export type {
  // Analytics types
  AnalyticsFilters,
  DashboardMetrics,
  AnalyticsChartData,
  PerformanceInsights,
  UseAnalyticsReturn,
} from './useAnalytics';

export type {
  // Form types
  FormConfig,
  FormOptions,
  UseFormReturn,
} from './useForm';

export type {
  // API types
  APIResponse,
  PaginatedResponse,
  RequestOptions,
  UseApiQueryOptions,
  UseApiMutationOptions,
  UseApiReturn,
  UseApiMutationReturn,
  UsePaginatedApiReturn,
} from './useAPI';

export type {
  // Pagination types
  PaginationConfig,
  PaginationState,
  PaginationActions,
  UsePaginationReturn,
  AdvancedPaginationConfig,
  AdvancedPaginationReturn,
  TablePaginationConfig,
  TablePaginationReturn,
} from './usePagination';