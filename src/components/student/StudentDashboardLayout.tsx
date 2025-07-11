"use client";

import React from 'react';
import { StudentDashboardLayoutContainer } from './StudentDashboardLayoutContainer';
import { StudentDashboardLayoutPresentation } from './StudentDashboardLayoutPresentation';

interface Student {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  course?: string;
  level?: string;
  nextClass?: string;
  progress?: number;
  notifications?: number;
  upcomingAssignments?: number;
}

interface StudentDashboardLayoutProps {
  student: Student | null;
  children: React.ReactNode;
  isLoading?: boolean;
  breadcrumbs?: string[];
  onLogout?: () => void;
  onNotificationClick?: () => void;
  onThemeToggle?: () => void;
  onSearch?: (query: string) => void;
}

/**
 * Legacy component wrapper for backwards compatibility
 * @deprecated Use StudentDashboardLayoutContainer for new implementations
 */
export function StudentDashboardLayout({
  student,
  children,
  isLoading = false,
  breadcrumbs = [],
  onLogout,
  onNotificationClick,
  onThemeToggle,
  onSearch,
}: StudentDashboardLayoutProps) {
  // For backwards compatibility, we'll use the presentation component directly
  return (
    <StudentDashboardLayoutPresentation
      student={student}
      children={children}
      isLoading={isLoading}
      breadcrumbs={breadcrumbs}
      onLogout={onLogout}
      onNotificationClick={onNotificationClick}
      onThemeToggle={onThemeToggle}
      onSearch={onSearch}
    />
  );
}

// Export the new components
export { StudentDashboardLayoutContainer } from './StudentDashboardLayoutContainer';
export { StudentDashboardLayoutPresentation } from './StudentDashboardLayoutPresentation';
export type { StudentDashboardLayoutPresentationProps } from './StudentDashboardLayoutPresentation';