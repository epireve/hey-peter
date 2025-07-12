import { DashboardContent } from "@/components/admin/dashboard/DashboardContent";

export default async function AdminDashboardPage() {
  // Mock data for now to avoid server action issues
  const stats = {
    totalStudents: 150,
    totalTeachers: 12,
    totalClasses: 45,
    totalCourses: 8,
    studentGrowth: 15,
    newStudentsThisMonth: 23,
  };

  const mockAttendanceData = [
    { name: 'Mon', attended: 120, absent: 30 },
    { name: 'Tue', attended: 135, absent: 15 },
    { name: 'Wed', attended: 128, absent: 22 },
    { name: 'Thu', attended: 142, absent: 8 },
    { name: 'Fri', attended: 138, absent: 12 },
  ];

  const mockCourseData = [
    { name: 'Basic English', value: 45 },
    { name: 'Business English', value: 30 },
    { name: 'Speak Up', value: 35 },
    { name: '1-on-1', value: 40 },
  ];

  const mockRevenueData = [
    { month: 'Jan', revenue: 12000 },
    { month: 'Feb', revenue: 15000 },
    { month: 'Mar', revenue: 18000 },
    { month: 'Apr', revenue: 16000 },
    { month: 'May', revenue: 20000 },
    { month: 'Jun', revenue: 22000 },
  ];

  return (
    <DashboardContent
      stats={stats}
      attendanceData={mockAttendanceData}
      courseDistributionData={mockCourseData}
      revenueData={mockRevenueData}
      recentUsers={[]}
      activities={[]}
    />
  );
}