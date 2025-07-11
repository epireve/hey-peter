"use client";

import React from "react";
import { 
  Users, 
  GraduationCap, 
  Calendar, 
  BookOpen,
  Clock,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import { KPICard } from "./KPICard";
import { AnalyticsChart } from "./AnalyticsChart";
import { RecentUsersTable } from "./RecentUsersTable";
import { QuickActions } from "./QuickActions";
import { ActivityTimeline } from "./ActivityTimeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";

/**
 * Props for the DashboardContentPresentation component
 */
export interface DashboardContentPresentationProps {
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
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onQuickAction?: (action: string) => void;
  onChartInteraction?: (chartType: string, data: any) => void;
}

/**
 * Presentational component for Dashboard Content
 * Handles all UI rendering without any business logic
 */
export const DashboardContentPresentation = React.memo(({
  stats,
  attendanceData,
  courseDistributionData,
  revenueData,
  recentUsers,
  activities,
  loading = false,
  error = null,
  onRefresh,
  onQuickAction,
  onChartInteraction
}: DashboardContentPresentationProps) => {
  
  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button 
              variant="link" 
              size="sm" 
              onClick={onRefresh}
              className="ml-2"
            >
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <DashboardHeader onRefresh={onRefresh} />
      
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Students"
          value={stats.totalStudents}
          description={`${stats.newStudentsThisMonth} new this month`}
          icon={Users}
          trend={{
            value: stats.studentGrowth,
            isPositive: stats.studentGrowth > 0,
          }}
        />
        <KPICard
          title="Total Teachers"
          value={stats.totalTeachers}
          description="Active teaching staff"
          icon={GraduationCap}
        />
        <KPICard
          title="Total Classes"
          value={stats.totalClasses}
          description="Scheduled classes"
          icon={Calendar}
        />
        <KPICard
          title="Total Courses"
          value={stats.totalCourses}
          description="Available courses"
          icon={BookOpen}
        />
      </div>

      {/* Charts Row */}
      <ChartsSection 
        attendanceData={attendanceData}
        courseDistributionData={courseDistributionData}
        onChartInteraction={onChartInteraction}
      />

      {/* Revenue and Quick Actions */}
      <RevenueSection 
        revenueData={revenueData}
        onQuickAction={onQuickAction}
        onChartInteraction={onChartInteraction}
      />

      {/* Bottom Row */}
      <BottomSection 
        recentUsers={recentUsers}
        activities={activities}
      />
    </div>
  );
});

DashboardContentPresentation.displayName = "DashboardContentPresentation";

/**
 * Dashboard Header Component
 */
const DashboardHeader: React.FC<{ onRefresh?: () => void }> = ({ onRefresh }) => (
  <div className="flex items-center justify-between space-y-2">
    <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
    {onRefresh && (
      <Button variant="outline" size="sm" onClick={onRefresh}>
        <RefreshCw className="h-4 w-4 mr-2" />
        Refresh
      </Button>
    )}
  </div>
);

/**
 * Charts Section Component
 */
const ChartsSection: React.FC<{
  attendanceData?: any[];
  courseDistributionData?: any[];
  onChartInteraction?: (chartType: string, data: any) => void;
}> = ({ attendanceData, courseDistributionData, onChartInteraction }) => (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
    <div className="col-span-4">
      {attendanceData && (
        <AnalyticsChart
          title="Weekly Attendance"
          description="Student attendance over the past week"
          data={attendanceData}
          type="bar"
          dataKey={["attended", "absent"]}
          xAxisKey="name"
          colors={["#10b981", "#ef4444"]}
          onClick={(data) => onChartInteraction?.('attendance', data)}
        />
      )}
    </div>
    <div className="col-span-3">
      {courseDistributionData && (
        <AnalyticsChart
          title="Course Distribution"
          description="Students per course type"
          data={courseDistributionData}
          type="pie"
          dataKey="value"
          height={300}
          onClick={(data) => onChartInteraction?.('courseDistribution', data)}
        />
      )}
    </div>
  </div>
);

/**
 * Revenue Section Component
 */
const RevenueSection: React.FC<{
  revenueData?: any[];
  onQuickAction?: (action: string) => void;
  onChartInteraction?: (chartType: string, data: any) => void;
}> = ({ revenueData, onQuickAction, onChartInteraction }) => (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
    <div className="col-span-4">
      {revenueData && (
        <AnalyticsChart
          title="Monthly Revenue"
          description="Revenue trend over the past 6 months"
          data={revenueData}
          type="area"
          dataKey="revenue"
          xAxisKey="month"
          colors={["#3b82f6"]}
          onClick={(data) => onChartInteraction?.('revenue', data)}
        />
      )}
    </div>
    <div className="col-span-3">
      <div className="space-y-4">
        <QuickActions onAction={onQuickAction} />
        <HourAnalyticsCard />
      </div>
    </div>
  </div>
);

/**
 * Hour Analytics Card Component
 */
const HourAnalyticsCard: React.FC = () => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center">
        <Clock className="h-5 w-5 mr-2" />
        Hour Analytics
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          View detailed hour consumption analytics and class efficiency metrics
        </p>
        <div className="flex flex-col space-y-2">
          <Link href="/admin/hours/consumption-analytics">
            <Button variant="outline" className="w-full justify-start">
              Consumption Analytics
            </Button>
          </Link>
          <Link href="/admin/hours/comparison">
            <Button variant="outline" className="w-full justify-start">
              Class Type Comparison
            </Button>
          </Link>
        </div>
      </div>
    </CardContent>
  </Card>
);

/**
 * Bottom Section Component
 */
const BottomSection: React.FC<{
  recentUsers?: any[];
  activities?: any[];
}> = ({ recentUsers, activities }) => (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
    <div className="col-span-4">
      {recentUsers && (
        <RecentUsersTable 
          users={recentUsers}
          title="Recent Registrations"
          description="Latest user sign-ups"
        />
      )}
    </div>
    <div className="col-span-3">
      {activities && (
        <ActivityTimeline activities={activities} />
      )}
    </div>
  </div>
);

/**
 * Loading Skeleton Component
 */
const DashboardSkeleton: React.FC = () => (
  <div className="flex-1 space-y-4 p-8 pt-6">
    <div className="flex items-center justify-between space-y-2">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-9 w-24" />
    </div>
    
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>

    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
      <Card className="col-span-4">
        <CardHeader>
          <Skeleton className="h-5 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
      <Card className="col-span-3">
        <CardHeader>
          <Skeleton className="h-5 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  </div>
);