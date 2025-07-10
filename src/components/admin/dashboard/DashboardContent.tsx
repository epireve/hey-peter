"use client";

import React from "react";
import { 
  Users, 
  GraduationCap, 
  Calendar, 
  BookOpen,
  Clock
} from "lucide-react";
import { KPICard } from "./KPICard";
import { AnalyticsChart } from "./AnalyticsChart";
import { RecentUsersTable } from "./RecentUsersTable";
import { QuickActions } from "./QuickActions";
import { ActivityTimeline } from "./ActivityTimeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

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

export const DashboardContent = React.memo(({
  stats,
  attendanceData,
  courseDistributionData,
  revenueData,
  recentUsers,
  activities
}: DashboardContentProps) => {
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
          <div className="space-y-4">
            <QuickActions />
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
          </div>
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
});

DashboardContent.displayName = "DashboardContent";