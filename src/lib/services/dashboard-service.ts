import { logger } from '@/lib/services';
/**
 * Dashboard Service
 * Handles all dashboard data fetching and processing
 */
import { supabase } from '@/lib/supabase';
import type { DashboardStats, AttendanceData, CourseDistribution, RevenueData, RecentUser, Activity } from '@/types/dashboard';

export const dashboardService = {
  /**
   * Get dashboard statistics
   */
  async getStats(): Promise<DashboardStats> {
    try {
      // Fetch counts from various tables
      const [studentsResult, teachersResult, classesResult, coursesResult] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }),
        supabase.from('teachers').select('id', { count: 'exact', head: true }),
        supabase.from('classes').select('id', { count: 'exact', head: true }),
        supabase.from('courses').select('id', { count: 'exact', head: true }),
      ]);

      // Calculate new students this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: newStudents } = await supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString());

      const totalStudents = studentsResult.count || 0;
      const lastMonthStudents = totalStudents - (newStudents || 0);
      const studentGrowth = lastMonthStudents > 0 
        ? ((newStudents || 0) / lastMonthStudents) * 100 
        : 0;

      return {
        totalStudents,
        totalTeachers: teachersResult.count || 0,
        totalClasses: classesResult.count || 0,
        totalCourses: coursesResult.count || 0,
        studentGrowth: Math.round(studentGrowth),
        newStudentsThisMonth: newStudents || 0,
      };
    } catch (error) {
      logger.error('Error fetching dashboard stats:', error);
      // Return default values in case of error
      return {
        totalStudents: 0,
        totalTeachers: 0,
        totalClasses: 0,
        totalCourses: 0,
        studentGrowth: 0,
        newStudentsThisMonth: 0,
      };
    }
  },

  /**
   * Get attendance data for the past week
   */
  async getAttendanceData(): Promise<AttendanceData[]> {
    try {
      // Mock data for now - replace with actual Supabase query
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      return days.map(day => ({
        name: day,
        attended: Math.floor(Math.random() * 50) + 30,
        absent: Math.floor(Math.random() * 10) + 5,
      }));
    } catch (error) {
      logger.error('Error fetching attendance data:', error);
      return [];
    }
  },

  /**
   * Get course distribution data
   */
  async getCourseDistribution(): Promise<CourseDistribution[]> {
    try {
      // Mock data for now - replace with actual Supabase query
      return [
        { name: 'Basic English', value: 45, percentage: 30 },
        { name: 'Everyday A/B', value: 38, percentage: 25 },
        { name: 'Speak Up', value: 32, percentage: 21 },
        { name: 'Business English', value: 24, percentage: 16 },
        { name: '1-on-1', value: 12, percentage: 8 },
      ];
    } catch (error) {
      logger.error('Error fetching course distribution:', error);
      return [];
    }
  },

  /**
   * Get revenue data for the past 6 months
   */
  async getRevenueData(): Promise<RevenueData[]> {
    try {
      // Mock data for now - replace with actual Supabase query
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      return months.map(month => ({
        month,
        revenue: Math.floor(Math.random() * 50000) + 30000,
        currency: 'USD',
      }));
    } catch (error) {
      logger.error('Error fetching revenue data:', error);
      return [];
    }
  },

  /**
   * Get recent users
   */
  async getRecentUsers(limit = 5): Promise<RecentUser[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, role, first_name, last_name, created_at, avatar_url')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(user => ({
        id: user.id,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown User',
        email: user.email,
        role: user.role,
        createdAt: user.created_at,
        avatar: user.avatar_url,
      }));
    } catch (error) {
      logger.error('Error fetching recent users:', error);
      return [];
    }
  },

  /**
   * Get recent activities
   */
  async getActivities(limit = 10): Promise<Activity[]> {
    try {
      // Mock data for now - replace with actual activity tracking
      const activities: Activity[] = [
        {
          id: '1',
          type: 'user_joined',
          description: 'New student registered',
          timestamp: new Date().toISOString(),
          user: { name: 'John Doe' },
        },
        {
          id: '2',
          type: 'class_created',
          description: 'New class scheduled',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          user: { name: 'Sarah Teacher' },
        },
        {
          id: '3',
          type: 'course_updated',
          description: 'Course content updated',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          user: { name: 'Admin User' },
        },
        {
          id: '4',
          type: 'payment_received',
          description: 'Payment received',
          timestamp: new Date(Date.now() - 10800000).toISOString(),
          metadata: { amount: 150, currency: 'USD' },
        },
      ];

      return activities.slice(0, limit);
    } catch (error) {
      logger.error('Error fetching activities:', error);
      return [];
    }
  },
};