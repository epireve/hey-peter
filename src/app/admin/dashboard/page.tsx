import { DashboardContent } from "@/components/admin/dashboard/DashboardContent";
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