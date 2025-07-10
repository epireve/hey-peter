"use client";

import { 
  Users, 
  GraduationCap, 
  Calendar, 
  BookOpen 
} from "lucide-react";
import { KPICard } from "./KPICard";
import { AnalyticsChart } from "./AnalyticsChart";
import { RecentUsersTable } from "./RecentUsersTable";
import { QuickActions } from "./QuickActions";
import { ActivityTimeline } from "./ActivityTimeline";

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

export function DashboardContent({
  stats,
  attendanceData,
  courseDistributionData,
  revenueData,
  recentUsers,
  activities
}: DashboardContentProps) {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>
      
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
            />
          )}
        </div>
      </div>

      {/* Revenue Chart */}
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
            />
          )}
        </div>
        <div className="col-span-3">
          <QuickActions />
        </div>
      </div>

      {/* Bottom Row */}
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
    </div>
  );
}