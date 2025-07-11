// Admin Components

// Student Management
export { StudentInformationManager } from './StudentInformationManager';
export { StudentInformationManagerClient } from './StudentInformationManagerClient';
export { ImportExportDialog } from './ImportExportDialog';

// Dashboard and Analytics
export { DashboardContent } from './dashboard/DashboardContent';
export { DashboardShell } from './dashboard/DashboardShell';
export { KPICard } from './dashboard/KPICard';
export { ActivityTimeline } from './dashboard/ActivityTimeline';
export { AnalyticsChart } from './dashboard/AnalyticsChart';
export { QuickActions } from './dashboard/QuickActions';
export { RecentUsersTable } from './dashboard/RecentUsersTable';

// Analytics Components
export { AnalyticsDashboard } from './analytics/AnalyticsDashboard';
export { MetricCard } from './analytics/MetricCard';
export { AnalyticsFilter } from './analytics/AnalyticsFilter';
export { AnalyticsExport } from './analytics/AnalyticsExport';
export { 
  AnalyticsLayout, 
  AnalyticsGrid, 
  AnalyticsCardGrid, 
  AnalyticsSection,
  ResponsiveChartContainer 
} from './analytics/AnalyticsLayout';
export { EnhancedStudentAnalytics } from './dashboard/analytics/EnhancedStudentAnalytics';
export { MobileAnalyticsCard, MobileAnalyticsGrid } from './analytics/MobileAnalyticsCard';
export { ResponsiveChart, ChartGrid, MobileChart } from './analytics/ResponsiveChart';

// Content Management
export { ContentManagementClient } from './content/ContentManagementClient';
export { ContentSyncManager } from './content/ContentSyncManager';
export { ContentSynchronizationDashboard } from './content/ContentSynchronizationDashboard';
export { ContentListItem } from './content/ContentListItem';
export { ContentWorkflowDialog } from './content/ContentWorkflowDialog';

// Course Management
export { CourseForm } from './courses/CourseForm';
export { CourseListWithBulk } from './courses/CourseListWithBulk';

// Scheduling
export { SchedulingDashboard } from './scheduling/SchedulingDashboard';
export { AutoSchedulingDashboard } from './scheduling/AutoSchedulingDashboard';
export { AIRecommendationSystem } from './scheduling/AIRecommendationSystem';
export { BulkSchedulingOperations } from './scheduling/BulkSchedulingOperations';
export { ManualOverrideInterface } from './scheduling/ManualOverrideInterface';
export { SchedulingAnalytics } from './scheduling/SchedulingAnalytics';
export { StudentProgressAnalyzer } from './scheduling/StudentProgressAnalyzer';

// Settings
export { SettingsClient } from './settings/SettingsClient';
export { GeneralSettings } from './settings/GeneralSettings';
export { SecuritySettings } from './settings/SecuritySettings';
export { NotificationSettings } from './settings/NotificationSettings';
export { FeatureFlags } from './settings/FeatureFlags';
export { MaintenanceSettings } from './settings/MaintenanceSettings';

// Student Management
export { StudentForm } from './students/StudentForm';
export { StudentListWithBulk } from './students/StudentListWithBulk';
export { StudentsPageClient } from './students/StudentsPageClient';

// Teacher Management
export { TeacherForm } from './teachers/TeacherForm';
export { TeacherFormEnhanced } from './teachers/TeacherFormEnhanced';
export { TeachersPageClient } from './teachers/TeachersPageClient';
export { AvailabilityScheduler } from './teachers/AvailabilityScheduler';

// Teacher Performance Analytics
export { TeacherPerformanceDashboard } from './dashboard/analytics/TeacherPerformanceDashboard';
export { TeacherComparisonAnalytics } from './dashboard/analytics/TeacherComparisonAnalytics';
export { TeacherIndividualAnalytics } from './dashboard/analytics/TeacherIndividualAnalytics';
export { TeacherPerformanceManagement } from './dashboard/TeacherPerformanceManagement';
export { 
  MetricCard,
  TeacherProfileCard,
  PerformanceRadarChart,
  RankingList,
  RecommendationCard,
  TrendIndicator,
  AlertCard,
  PerformanceSummary
} from './dashboard/analytics/TeacherPerformanceComponents';

// User Management
export { UserManagementClient } from './users/UserManagementClient';
export { UserManagementWorkflow } from './users/UserManagementWorkflow';

// Email Management
export { EmailIntegrationExample } from './email/EmailIntegrationExample';
export { EmailManagementDashboard } from './email/EmailManagementDashboard';
export { EmailPreferencesManager } from './email/EmailPreferencesManager';

// Hour Management
export { HourManagementDashboard as LegacyHourManagementDashboard } from './HourManagementDashboard';
export { LeaveRequestApproval } from './LeaveRequestApproval';
export { 
  HourUsageAnalytics,
  BalanceTracker,
  ConsumptionPatterns,
  AlertManager,
  HourAnalyticsDashboard,
  HourConsumptionAnalyticsChart,
  HourConsumptionDashboard,
  HourConsumptionComparison
} from './hours';

// Postponement Management
export { PostponementManagement } from './postponements/PostponementManagement';