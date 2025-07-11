'use client';

// Lazy loading definitions for analytics components
import { createLazyAnalyticsComponent, preloadComponent } from '@/lib/utils/lazy-factory';

// Enhanced Student Analytics (1790 lines - largest component)
export const LazyEnhancedStudentAnalytics = createLazyAnalyticsComponent(
  () => import('./EnhancedStudentAnalytics'),
  {
    preload: false, // Load on demand due to size
    retry: 3
  }
);

// Teacher Individual Analytics (806 lines)
export const LazyTeacherIndividualAnalytics = createLazyAnalyticsComponent(
  () => import('./TeacherIndividualAnalytics'),
  {
    preload: false,
    retry: 3
  }
);

// Business Intelligence Component
export const LazyBusinessIntelligence = createLazyAnalyticsComponent(
  () => import('./BusinessIntelligence'),
  {
    preload: false,
    retry: 3
  }
);

// Student Analytics
export const LazyStudentAnalytics = createLazyAnalyticsComponent(
  () => import('./StudentAnalytics'),
  {
    preload: false,
    retry: 3
  }
);

// System Analytics
export const LazySystemAnalytics = createLazyAnalyticsComponent(
  () => import('./SystemAnalytics'),
  {
    preload: false,
    retry: 3
  }
);

// Teacher Analytics
export const LazyTeacherAnalytics = createLazyAnalyticsComponent(
  () => import('./TeacherAnalytics'),
  {
    preload: false,
    retry: 3
  }
);

// Teacher Comparison Analytics
export const LazyTeacherComparisonAnalytics = createLazyAnalyticsComponent(
  () => import('./TeacherComparisonAnalytics'),
  {
    preload: false,
    retry: 3
  }
);

// Teacher Performance Components
export const LazyTeacherPerformanceComponents = createLazyAnalyticsComponent(
  () => import('./TeacherPerformanceComponents'),
  {
    preload: false,
    retry: 3
  }
);

// Teacher Performance Dashboard
export const LazyTeacherPerformanceDashboard = createLazyAnalyticsComponent(
  () => import('./TeacherPerformanceDashboard'),
  {
    preload: false,
    retry: 3
  }
);

// Preload functions for common user flows
export const preloadStudentAnalytics = () => {
  preloadComponent(() => import('./StudentAnalytics'), 1000);
  preloadComponent(() => import('./EnhancedStudentAnalytics'), 2000);
};

export const preloadTeacherAnalytics = () => {
  preloadComponent(() => import('./TeacherAnalytics'), 1000);
  preloadComponent(() => import('./TeacherIndividualAnalytics'), 2000);
  preloadComponent(() => import('./TeacherComparisonAnalytics'), 3000);
};

export const preloadAdvancedAnalytics = () => {
  preloadComponent(() => import('./BusinessIntelligence'), 1000);
  preloadComponent(() => import('./SystemAnalytics'), 2000);
  preloadComponent(() => import('./TeacherPerformanceDashboard'), 3000);
};

// Export all components for direct use
export default {
  LazyEnhancedStudentAnalytics,
  LazyTeacherIndividualAnalytics,
  LazyBusinessIntelligence,
  LazyStudentAnalytics,
  LazySystemAnalytics,
  LazyTeacherAnalytics,
  LazyTeacherComparisonAnalytics,
  LazyTeacherPerformanceComponents,
  LazyTeacherPerformanceDashboard,
  preloadStudentAnalytics,
  preloadTeacherAnalytics,
  preloadAdvancedAnalytics
};