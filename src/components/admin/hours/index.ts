/**
 * Hour Management and Analytics Components
 * 
 * This module exports all hour-related components for the admin dashboard,
 * including usage analytics, balance tracking, consumption patterns, and alert management.
 */

// Hour Consumption Analytics Components
export { HourConsumptionAnalyticsChart } from './HourConsumptionAnalyticsChart';
export { HourConsumptionDashboard } from './HourConsumptionDashboard';
export { HourConsumptionComparison } from './HourConsumptionComparison';

// Legacy components (if they exist)
export { HourUsageAnalytics } from './HourUsageAnalytics';
export { BalanceTracker } from './BalanceTracker';
export { ConsumptionPatterns } from './ConsumptionPatterns';
export { AlertManager } from './AlertManager';

// Re-export from existing hour management components if they exist
export * from '../dashboard/analytics/EnhancedStudentAnalytics';