/**
 * Dashboard type definitions
 */

export interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalCourses: number;
  studentGrowth: number;
  newStudentsThisMonth: number;
}

export interface DashboardData {
  attendanceData: AttendanceData[];
  courseDistributionData: CourseDistribution[];
  revenueData: RevenueData[];
  recentUsers: RecentUser[];
  activities: Activity[];
}

export interface AttendanceData {
  name: string;
  attended: number;
  absent: number;
}

export interface CourseDistribution {
  name: string;
  value: number;
  percentage?: number;
}

export interface RevenueData {
  month: string;
  revenue: number;
  currency?: string;
}

export interface RecentUser {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  createdAt: string;
  avatar?: string;
}

export interface Activity {
  id: string;
  type: 'user_joined' | 'class_created' | 'course_updated' | 'payment_received';
  description: string;
  timestamp: string;
  user?: {
    name: string;
    avatar?: string;
  };
  metadata?: Record<string, any>;
}

export interface ChartInteraction {
  chartType: string;
  data: any;
  event: MouseEvent;
}