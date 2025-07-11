"use client";

import React from "react";
import { DashboardContentPresentation } from "./DashboardContentPresentation";

interface DashboardContentProps {
  stats: {
    totalStudents: number;
    totalTeachers: number;
    totalClasses: number;
    totalCourses: number;
    studentGrowth: number;
    newStudentsThisMonth: number;
  };
  attendanceData?: any[];
  courseDistributionData?: any[];
  revenueData?: any[];
  recentUsers?: any[];
  activities?: any[];
}

/**
 * Legacy component wrapper for backwards compatibility
 * @deprecated Use DashboardContentContainer for new implementations
 */
export const DashboardContent = React.memo(({
  stats,
  attendanceData,
  courseDistributionData,
  revenueData,
  recentUsers,
  activities
}: DashboardContentProps) => {
  return (
    <DashboardContentPresentation
      stats={stats}
      attendanceData={attendanceData}
      courseDistributionData={courseDistributionData}
      revenueData={revenueData}
      recentUsers={recentUsers}
      activities={activities}
    />
  );
});

DashboardContent.displayName = "DashboardContent";

// Export the new container component as the default
export { DashboardContentContainer } from "./DashboardContentContainer";
export { DashboardContentPresentation } from "./DashboardContentPresentation";
export type { DashboardContentPresentationProps } from "./DashboardContentPresentation";