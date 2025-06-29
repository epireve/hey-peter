import { 
  Users, 
  GraduationCap, 
  Calendar, 
  BookOpen 
} from "lucide-react";
import { KPICard } from "@/components/admin/dashboard/KPICard";
import { AnalyticsChart } from "@/components/admin/dashboard/AnalyticsChart";
import { RecentUsersTable } from "@/components/admin/dashboard/RecentUsersTable";
import { QuickActions } from "@/components/admin/dashboard/QuickActions";
import { ActivityTimeline } from "@/components/admin/dashboard/ActivityTimeline";
import {
  getDashboardStats,
  getRecentUsers,
  getClassAttendanceData,
  getCourseDistribution,
  getMonthlyRevenue,
  getRecentActivities,
} from "@/lib/actions/dashboard";

export default async function AdminDashboardPage() {
  // Fetch all dashboard data
  const [
    statsResult,
    recentUsersResult,
    attendanceResult,
    courseDistResult,
    revenueResult,
    activitiesResult,
  ] = await Promise.all([
    getDashboardStats(),
    getRecentUsers(5),
    getClassAttendanceData(),
    getCourseDistribution(),
    getMonthlyRevenue(),
    getRecentActivities(5),
  ]);

  const stats = statsResult.data || {
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    totalCourses: 0,
    studentGrowth: 0,
    newStudentsThisMonth: 0,
  };

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
          {attendanceResult.data && (
            <AnalyticsChart
              title="Weekly Attendance"
              description="Student attendance over the past week"
              data={attendanceResult.data}
              type="bar"
              dataKey={["attended", "absent"]}
              xAxisKey="name"
              colors={["#10b981", "#ef4444"]}
            />
          )}
        </div>
        <div className="col-span-3">
          {courseDistResult.data && (
            <AnalyticsChart
              title="Course Distribution"
              description="Students per course type"
              data={courseDistResult.data}
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
          {revenueResult.data && (
            <AnalyticsChart
              title="Monthly Revenue"
              description="Revenue trend over the past 6 months"
              data={revenueResult.data}
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
          {recentUsersResult.data && (
            <RecentUsersTable 
              users={recentUsersResult.data}
              title="Recent Registrations"
              description="Latest user sign-ups"
            />
          )}
        </div>
        <div className="col-span-3">
          {activitiesResult.data && (
            <ActivityTimeline activities={activitiesResult.data} />
          )}
        </div>
      </div>
    </div>
  );
}