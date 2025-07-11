// Main store exports
export {
  useAppStore,
  useAuth,
  useUI,
  useStudents,
  useTeachers,
  useAdmin,
  hydrateStore,
  resetStore,
} from './app-store'

// Enhanced hooks
export {
  useAuthActions,
  useNotifications,
  useModal,
  useTheme,
  useStudentActions,
  useTeacherActions,
  useAdminActions,
  useStoreHydration,
  useStoreSubscription,
} from './hooks'

// Provider and utilities
export { StoreProvider, useStoreHydration as useStoreHydrationProvider } from './provider'
export { storeUtils, performanceUtils, typeGuards, migrationUtils } from './utils'

// Types
export type {
  AppStore,
  AuthState,
  UIState,
  StudentState,
  TeacherState,
  AdminState,
  Notification,
  StudentFilters,
  TeacherFilters,
  DashboardStats,
  SystemSettings,
} from './types'

// Slice creators (for advanced usage)
export { createAuthSlice } from './slices/auth-slice'
export { createUISlice } from './slices/ui-slice'
export { createStudentSlice } from './slices/student-slice'
export { createTeacherSlice } from './slices/teacher-slice'
export { createAdminSlice } from './slices/admin-slice'