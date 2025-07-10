import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Lazy load the DashboardContent component
const DashboardContent = dynamic(
  () => import("@/components/admin/dashboard/DashboardContent").then(mod => ({ default: mod.DashboardContent })),
  {
    loading: () => (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    ),
  }
);
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
    <DashboardContent
      stats={stats}
      attendanceData={attendanceResult.data}
      courseDistributionData={courseDistResult.data}
      revenueData={revenueResult.data}
      recentUsers={recentUsersResult.data}
      activities={activitiesResult.data}
    />
  );
}