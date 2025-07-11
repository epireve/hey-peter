"use client";

import { logger } from '@/lib/services';

import React, { useEffect, useState } from 'react';
import { DashboardContentPresentation } from './DashboardContentPresentation';
import { dashboardService } from '@/lib/services/dashboard-service';
import { useToast } from '@/components/ui/use-toast';
import type { DashboardData, DashboardStats } from '@/types/dashboard';

/**
 * Container component for Dashboard Content
 * Handles all business logic, data fetching, and state management
 */
export const DashboardContentContainer: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    totalCourses: 0,
    studentGrowth: 0,
    newStudentsThisMonth: 0,
  });
  
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    attendanceData: [],
    courseDistributionData: [],
    revenueData: [],
    recentUsers: [],
    activities: [],
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all dashboard data
      const [
        statsData,
        attendance,
        courseDistribution,
        revenue,
        recentUsers,
        activities
      ] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getAttendanceData(),
        dashboardService.getCourseDistribution(),
        dashboardService.getRevenueData(),
        dashboardService.getRecentUsers(),
        dashboardService.getActivities(),
      ]);

      setStats(statsData);
      setDashboardData({
        attendanceData: attendance,
        courseDistributionData: courseDistribution,
        revenueData: revenue,
        recentUsers,
        activities,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard data';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadDashboardData();
  };

  const handleQuickAction = (action: string) => {
    // Handle quick actions
    logger.info('Quick action:', action);
    // Navigate or perform action based on the action type
  };

  const handleChartInteraction = (chartType: string, data: any) => {
    // Handle chart interactions (e.g., drill-down)
    logger.info('Chart interaction:', chartType, data);
  };

  return (
    <DashboardContentPresentation
      stats={stats}
      attendanceData={dashboardData.attendanceData}
      courseDistributionData={dashboardData.courseDistributionData}
      revenueData={dashboardData.revenueData}
      recentUsers={dashboardData.recentUsers}
      activities={dashboardData.activities}
      loading={loading}
      error={error}
      onRefresh={handleRefresh}
      onQuickAction={handleQuickAction}
      onChartInteraction={handleChartInteraction}
    />
  );
};

DashboardContentContainer.displayName = 'DashboardContentContainer';