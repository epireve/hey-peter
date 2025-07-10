import { supabase } from '@/lib/supabase';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export type DateRangeType = 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'this_month' | 'last_month' | 'custom';
export type AggregationPeriod = 'day' | 'week' | 'month' | 'quarter' | 'year';

export interface DateRange {
  start: Date;
  end: Date;
  type: DateRangeType;
}

export interface StudentMetrics {
  totalStudents: number;
  activeStudents: number;
  newEnrollments: number;
  completionRate: number;
  averageProgress: number;
  attendanceRate: number;
  noShowRate: number;
  retentionRate: number;
  testScoreAverage: number;
  studentsAtRisk: number;
  topPerformers: {
    studentId: string;
    name: string;
    progress: number;
    attendance: number;
    testScore: number;
  }[];
}

export interface TeacherMetrics {
  totalTeachers: number;
  activeTeachers: number;
  utilizationRate: number;
  averageRating: number;
  totalHoursTaught: number;
  cancellationRate: number;
  performanceScore: number;
  availabilityRate: number;
  teachersNeedingSupport: number;
  topPerformers: {
    teacherId: string;
    name: string;
    rating: number;
    hoursThisMonth: number;
    studentsCount: number;
  }[];
}

export interface OperationalMetrics {
  classUtilizationRate: number;
  peakUsageTimes: {
    hour: number;
    dayOfWeek: number;
    utilizationRate: number;
  }[];
  resourceAllocationEfficiency: number;
  systemUptime: number;
  activeUsersCount: number;
  courseRankings: {
    courseId: string;
    courseName: string;
    enrollmentCount: number;
    completionRate: number;
    satisfaction: number;
  }[];
  capacityAnalysis: {
    currentCapacity: number;
    utilizedCapacity: number;
    availableSlots: number;
  };
}

export interface SystemHealthMetrics {
  apiResponseTime: number;
  errorRate: number;
  activeUsers: number;
  dataIntegrity: {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
  };
  schedulingEfficiency: number;
  notificationDeliveryRate: number;
}

class AnalyticsAggregationService {
  async getStudentMetrics(dateRange: DateRange): Promise<StudentMetrics> {
    try {
      // Get total and active students
      const { data: totalStudentsData, error: totalError } = await supabase
        .from('students')
        .select('id, status, created_at')
        .lte('created_at', dateRange.end.toISOString());

      if (totalError) throw totalError;

      const totalStudents = totalStudentsData?.length || 0;
      const activeStudents = totalStudentsData?.filter(s => s.status === 'active').length || 0;

      // Get new enrollments
      const { data: newEnrollmentsData, error: enrollmentError } = await supabase
        .from('students')
        .select('id')
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());

      if (enrollmentError) throw enrollmentError;

      const newEnrollments = newEnrollmentsData?.length || 0;

      // Get attendance data
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('status, student_id')
        .gte('date', dateRange.start.toISOString())
        .lte('date', dateRange.end.toISOString());

      if (attendanceError) throw attendanceError;

      const totalClasses = attendanceData?.length || 0;
      const attendedClasses = attendanceData?.filter(a => a.status === 'present').length || 0;
      const noShowClasses = attendanceData?.filter(a => a.status === 'no_show').length || 0;

      const attendanceRate = totalClasses > 0 ? (attendedClasses / totalClasses) * 100 : 0;
      const noShowRate = totalClasses > 0 ? (noShowClasses / totalClasses) * 100 : 0;

      // Get progress and completion data
      const { data: progressData, error: progressError } = await supabase
        .from('student_progress')
        .select('student_id, course_id, progress_percentage, completed')
        .gte('updated_at', dateRange.start.toISOString())
        .lte('updated_at', dateRange.end.toISOString());

      if (progressError) throw progressError;

      const averageProgress = progressData?.length > 0
        ? progressData.reduce((sum, p) => sum + p.progress_percentage, 0) / progressData.length
        : 0;

      const completedCourses = progressData?.filter(p => p.completed).length || 0;
      const totalCourseEnrollments = progressData?.length || 0;
      const completionRate = totalCourseEnrollments > 0 
        ? (completedCourses / totalCourseEnrollments) * 100 
        : 0;

      // Get test scores
      const { data: testScores, error: testError } = await supabase
        .from('test_results')
        .select('score')
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());

      if (testError) throw testError;

      const testScoreAverage = testScores?.length > 0
        ? testScores.reduce((sum, t) => sum + t.score, 0) / testScores.length
        : 0;

      // Identify students at risk (low attendance, poor progress, or low test scores)
      const studentsAtRisk = await this.identifyStudentsAtRisk(dateRange);

      // Get top performers
      const topPerformers = await this.getTopPerformingStudents(dateRange);

      // Calculate retention rate (simplified - would need historical data)
      const retentionRate = activeStudents > 0 ? (activeStudents / totalStudents) * 100 : 0;

      return {
        totalStudents,
        activeStudents,
        newEnrollments,
        completionRate,
        averageProgress,
        attendanceRate,
        noShowRate,
        retentionRate,
        testScoreAverage,
        studentsAtRisk,
        topPerformers
      };
    } catch (error) {
      console.error('Error fetching student metrics:', error);
      throw error;
    }
  }

  async getTeacherMetrics(dateRange: DateRange): Promise<TeacherMetrics> {
    try {
      // Get total and active teachers
      const { data: teachersData, error: teachersError } = await supabase
        .from('teachers')
        .select('id, status, created_at')
        .lte('created_at', dateRange.end.toISOString());

      if (teachersError) throw teachersError;

      const totalTeachers = teachersData?.length || 0;
      const activeTeachers = teachersData?.filter(t => t.status === 'active').length || 0;

      // Get teaching hours
      const { data: hoursData, error: hoursError } = await supabase
        .from('class_schedules')
        .select('teacher_id, duration, status')
        .gte('start_time', dateRange.start.toISOString())
        .lte('start_time', dateRange.end.toISOString());

      if (hoursError) throw hoursError;

      const totalHoursTaught = hoursData
        ?.filter(h => h.status === 'completed')
        .reduce((sum, h) => sum + (h.duration || 60), 0) / 60 || 0;

      const totalScheduledHours = hoursData
        ?.reduce((sum, h) => sum + (h.duration || 60), 0) / 60 || 0;

      const utilizationRate = totalScheduledHours > 0 
        ? (totalHoursTaught / totalScheduledHours) * 100 
        : 0;

      // Get cancellation rate
      const cancelledClasses = hoursData?.filter(h => h.status === 'cancelled').length || 0;
      const totalClasses = hoursData?.length || 0;
      const cancellationRate = totalClasses > 0 ? (cancelledClasses / totalClasses) * 100 : 0;

      // Get teacher ratings
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('teacher_ratings')
        .select('teacher_id, rating')
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());

      if (ratingsError) throw ratingsError;

      const averageRating = ratingsData?.length > 0
        ? ratingsData.reduce((sum, r) => sum + r.rating, 0) / ratingsData.length
        : 0;

      // Get availability data
      const { data: availabilityData, error: availError } = await supabase
        .from('teacher_availability')
        .select('teacher_id, day_of_week, start_time, end_time')
        .eq('is_available', true);

      if (availError) throw availError;

      const totalAvailableHours = this.calculateTotalAvailableHours(availabilityData || []);
      const availabilityRate = totalAvailableHours > 0 
        ? (totalHoursTaught / totalAvailableHours) * 100 
        : 0;

      // Calculate performance score
      const performanceScore = this.calculateTeacherPerformanceScore({
        utilizationRate,
        averageRating,
        cancellationRate,
        availabilityRate
      });

      // Identify teachers needing support
      const teachersNeedingSupport = await this.identifyTeachersNeedingSupport(dateRange);

      // Get top performers
      const topPerformers = await this.getTopPerformingTeachers(dateRange);

      return {
        totalTeachers,
        activeTeachers,
        utilizationRate,
        averageRating,
        totalHoursTaught,
        cancellationRate,
        performanceScore,
        availabilityRate,
        teachersNeedingSupport,
        topPerformers
      };
    } catch (error) {
      console.error('Error fetching teacher metrics:', error);
      throw error;
    }
  }

  async getOperationalMetrics(dateRange: DateRange): Promise<OperationalMetrics> {
    try {
      // Get class utilization
      const { data: classData, error: classError } = await supabase
        .from('class_schedules')
        .select('start_time, end_time, max_students, enrolled_students, status')
        .gte('start_time', dateRange.start.toISOString())
        .lte('start_time', dateRange.end.toISOString());

      if (classError) throw classError;

      const totalCapacity = classData?.reduce((sum, c) => sum + (c.max_students || 1), 0) || 0;
      const totalEnrolled = classData?.reduce((sum, c) => sum + (c.enrolled_students || 0), 0) || 0;
      const classUtilizationRate = totalCapacity > 0 ? (totalEnrolled / totalCapacity) * 100 : 0;

      // Get peak usage times
      const peakUsageTimes = this.calculatePeakUsageTimes(classData || []);

      // Get course rankings
      const courseRankings = await this.getCourseRankings(dateRange);

      // Calculate resource allocation efficiency
      const resourceAllocationEfficiency = await this.calculateResourceEfficiency(dateRange);

      // Get system usage stats
      const { data: loginData, error: loginError } = await supabase
        .from('user_sessions')
        .select('user_id, created_at')
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());

      if (loginError) throw loginError;

      const uniqueUsers = new Set(loginData?.map(l => l.user_id) || []);
      const activeUsersCount = uniqueUsers.size;

      // System uptime (simulated - would need actual monitoring)
      const systemUptime = 99.9;

      // Capacity analysis
      const capacityAnalysis = await this.analyzeCapacity(dateRange);

      return {
        classUtilizationRate,
        peakUsageTimes,
        resourceAllocationEfficiency,
        systemUptime,
        activeUsersCount,
        courseRankings,
        capacityAnalysis
      };
    } catch (error) {
      console.error('Error fetching operational metrics:', error);
      throw error;
    }
  }

  async getSystemHealthMetrics(): Promise<SystemHealthMetrics> {
    try {
      // These would typically come from monitoring services
      const apiResponseTime = 145; // ms
      const errorRate = 0.1; // percentage
      const activeUsers = await this.getActiveUserCount();
      
      // Check data integrity
      const dataIntegrity = await this.checkDataIntegrity();
      
      // Calculate scheduling efficiency
      const schedulingEfficiency = await this.calculateSchedulingEfficiency();
      
      // Get notification delivery rate
      const notificationDeliveryRate = await this.getNotificationDeliveryRate();

      return {
        apiResponseTime,
        errorRate,
        activeUsers,
        dataIntegrity,
        schedulingEfficiency,
        notificationDeliveryRate
      };
    } catch (error) {
      console.error('Error fetching system health metrics:', error);
      throw error;
    }
  }

  // Helper methods
  private async identifyStudentsAtRisk(dateRange: DateRange): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          attendance!inner(status),
          student_progress!inner(progress_percentage),
          test_results!inner(score)
        `)
        .eq('status', 'active');

      if (error) throw error;

      // Students are at risk if they have:
      // - Attendance rate < 70%
      // - Progress < 50%
      // - Test scores < 60%
      const atRiskCount = data?.filter(student => {
        const attendance = student.attendance || [];
        const progress = student.student_progress || [];
        const tests = student.test_results || [];

        const attendanceRate = attendance.length > 0
          ? (attendance.filter((a: any) => a.status === 'present').length / attendance.length) * 100
          : 100;

        const avgProgress = progress.length > 0
          ? progress.reduce((sum: number, p: any) => sum + p.progress_percentage, 0) / progress.length
          : 100;

        const avgTestScore = tests.length > 0
          ? tests.reduce((sum: number, t: any) => sum + t.score, 0) / tests.length
          : 100;

        return attendanceRate < 70 || avgProgress < 50 || avgTestScore < 60;
      }).length || 0;

      return atRiskCount;
    } catch (error) {
      console.error('Error identifying at-risk students:', error);
      return 0;
    }
  }

  private async getTopPerformingStudents(dateRange: DateRange): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          first_name,
          last_name,
          attendance!inner(status),
          student_progress!inner(progress_percentage),
          test_results!inner(score)
        `)
        .eq('status', 'active')
        .limit(5);

      if (error) throw error;

      const performanceData = data?.map(student => {
        const attendance = student.attendance || [];
        const progress = student.student_progress || [];
        const tests = student.test_results || [];

        const attendanceRate = attendance.length > 0
          ? (attendance.filter((a: any) => a.status === 'present').length / attendance.length) * 100
          : 0;

        const avgProgress = progress.length > 0
          ? progress.reduce((sum: number, p: any) => sum + p.progress_percentage, 0) / progress.length
          : 0;

        const avgTestScore = tests.length > 0
          ? tests.reduce((sum: number, t: any) => sum + t.score, 0) / tests.length
          : 0;

        return {
          studentId: student.id,
          name: `${student.first_name} ${student.last_name}`,
          progress: avgProgress,
          attendance: attendanceRate,
          testScore: avgTestScore,
          overallScore: (avgProgress + attendanceRate + avgTestScore) / 3
        };
      }) || [];

      return performanceData
        .sort((a, b) => b.overallScore - a.overallScore)
        .slice(0, 5)
        .map(({ overallScore, ...rest }) => rest);
    } catch (error) {
      console.error('Error getting top students:', error);
      return [];
    }
  }

  private calculateTotalAvailableHours(availability: any[]): number {
    let totalHours = 0;
    
    availability.forEach(slot => {
      const start = new Date(`2024-01-01 ${slot.start_time}`);
      const end = new Date(`2024-01-01 ${slot.end_time}`);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      totalHours += hours;
    });

    // Multiply by 4 weeks for monthly total
    return totalHours * 4;
  }

  private calculateTeacherPerformanceScore(metrics: {
    utilizationRate: number;
    averageRating: number;
    cancellationRate: number;
    availabilityRate: number;
  }): number {
    // Weighted performance score
    const weights = {
      utilization: 0.3,
      rating: 0.4,
      cancellation: 0.2,
      availability: 0.1
    };

    const normalizedRating = (metrics.averageRating / 5) * 100;
    const normalizedCancellation = 100 - metrics.cancellationRate;

    const score = 
      (metrics.utilizationRate * weights.utilization) +
      (normalizedRating * weights.rating) +
      (normalizedCancellation * weights.cancellation) +
      (metrics.availabilityRate * weights.availability);

    return Math.min(100, Math.max(0, score));
  }

  private async identifyTeachersNeedingSupport(dateRange: DateRange): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('teachers')
        .select(`
          id,
          class_schedules!inner(status),
          teacher_ratings!inner(rating)
        `)
        .eq('status', 'active');

      if (error) throw error;

      // Teachers need support if they have:
      // - High cancellation rate (> 15%)
      // - Low ratings (< 3.5)
      // - Low utilization (< 50%)
      const needingSupportCount = data?.filter(teacher => {
        const schedules = teacher.class_schedules || [];
        const ratings = teacher.teacher_ratings || [];

        const cancellationRate = schedules.length > 0
          ? (schedules.filter((s: any) => s.status === 'cancelled').length / schedules.length) * 100
          : 0;

        const avgRating = ratings.length > 0
          ? ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.length
          : 5;

        const completedClasses = schedules.filter((s: any) => s.status === 'completed').length;
        const utilizationRate = schedules.length > 0 ? (completedClasses / schedules.length) * 100 : 100;

        return cancellationRate > 15 || avgRating < 3.5 || utilizationRate < 50;
      }).length || 0;

      return needingSupportCount;
    } catch (error) {
      console.error('Error identifying teachers needing support:', error);
      return 0;
    }
  }

  private async getTopPerformingTeachers(dateRange: DateRange): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('teachers')
        .select(`
          id,
          first_name,
          last_name,
          class_schedules!inner(duration, status),
          teacher_ratings!inner(rating)
        `)
        .eq('status', 'active')
        .gte('class_schedules.start_time', dateRange.start.toISOString())
        .lte('class_schedules.start_time', dateRange.end.toISOString())
        .limit(5);

      if (error) throw error;

      const performanceData = data?.map(teacher => {
        const schedules = teacher.class_schedules || [];
        const ratings = teacher.teacher_ratings || [];

        const hoursThisMonth = schedules
          .filter((s: any) => s.status === 'completed')
          .reduce((sum: number, s: any) => sum + (s.duration || 60), 0) / 60;

        const avgRating = ratings.length > 0
          ? ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.length
          : 0;

        const uniqueStudents = new Set(schedules.map((s: any) => s.student_id));

        return {
          teacherId: teacher.id,
          name: `${teacher.first_name} ${teacher.last_name}`,
          rating: avgRating,
          hoursThisMonth,
          studentsCount: uniqueStudents.size
        };
      }) || [];

      return performanceData
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 5);
    } catch (error) {
      console.error('Error getting top teachers:', error);
      return [];
    }
  }

  private calculatePeakUsageTimes(classData: any[]): any[] {
    const usageMap = new Map<string, { count: number; capacity: number }>();

    classData.forEach(cls => {
      const startTime = new Date(cls.start_time);
      const hour = startTime.getHours();
      const dayOfWeek = startTime.getDay();
      const key = `${dayOfWeek}-${hour}`;

      const existing = usageMap.get(key) || { count: 0, capacity: 0 };
      existing.count += cls.enrolled_students || 0;
      existing.capacity += cls.max_students || 1;
      usageMap.set(key, existing);
    });

    const peakTimes = Array.from(usageMap.entries())
      .map(([key, data]) => {
        const [dayOfWeek, hour] = key.split('-').map(Number);
        return {
          hour,
          dayOfWeek,
          utilizationRate: data.capacity > 0 ? (data.count / data.capacity) * 100 : 0
        };
      })
      .sort((a, b) => b.utilizationRate - a.utilizationRate)
      .slice(0, 10);

    return peakTimes;
  }

  private async getCourseRankings(dateRange: DateRange): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          id,
          name,
          student_courses!inner(student_id),
          student_progress!inner(progress_percentage, completed)
        `)
        .eq('status', 'active');

      if (error) throw error;

      const rankings = data?.map(course => {
        const enrollments = course.student_courses || [];
        const progress = course.student_progress || [];

        const completedCount = progress.filter((p: any) => p.completed).length;
        const completionRate = enrollments.length > 0 
          ? (completedCount / enrollments.length) * 100 
          : 0;

        // Simulated satisfaction score (would come from surveys)
        const satisfaction = 85 + Math.random() * 10;

        return {
          courseId: course.id,
          courseName: course.name,
          enrollmentCount: enrollments.length,
          completionRate,
          satisfaction
        };
      }) || [];

      return rankings
        .sort((a, b) => b.enrollmentCount - a.enrollmentCount)
        .slice(0, 10);
    } catch (error) {
      console.error('Error getting course rankings:', error);
      return [];
    }
  }

  private async calculateResourceEfficiency(dateRange: DateRange): Promise<number> {
    try {
      // Calculate how efficiently resources (teachers, classrooms) are being used
      const { data: scheduleData, error } = await supabase
        .from('class_schedules')
        .select('teacher_id, start_time, end_time, enrolled_students, max_students')
        .gte('start_time', dateRange.start.toISOString())
        .lte('start_time', dateRange.end.toISOString())
        .eq('status', 'completed');

      if (error) throw error;

      if (!scheduleData || scheduleData.length === 0) return 0;

      // Calculate teacher utilization
      const teacherHours = new Map<string, number>();
      scheduleData.forEach(schedule => {
        const hours = (new Date(schedule.end_time).getTime() - new Date(schedule.start_time).getTime()) / (1000 * 60 * 60);
        teacherHours.set(schedule.teacher_id, (teacherHours.get(schedule.teacher_id) || 0) + hours);
      });

      // Calculate class fill rate
      const totalCapacity = scheduleData.reduce((sum, s) => sum + (s.max_students || 1), 0);
      const totalEnrolled = scheduleData.reduce((sum, s) => sum + (s.enrolled_students || 0), 0);
      const fillRate = totalCapacity > 0 ? totalEnrolled / totalCapacity : 0;

      // Combine metrics for overall efficiency
      const avgTeacherHours = Array.from(teacherHours.values()).reduce((a, b) => a + b, 0) / teacherHours.size;
      const targetHours = 30; // Target hours per teacher per month

      const teacherEfficiency = Math.min(avgTeacherHours / targetHours, 1);
      const overallEfficiency = (fillRate * 0.6 + teacherEfficiency * 0.4) * 100;

      return overallEfficiency;
    } catch (error) {
      console.error('Error calculating resource efficiency:', error);
      return 0;
    }
  }

  private async analyzeCapacity(dateRange: DateRange): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('class_schedules')
        .select('max_students, enrolled_students')
        .gte('start_time', dateRange.start.toISOString())
        .lte('start_time', dateRange.end.toISOString())
        .in('status', ['scheduled', 'in_progress']);

      if (error) throw error;

      const currentCapacity = data?.reduce((sum, c) => sum + (c.max_students || 1), 0) || 0;
      const utilizedCapacity = data?.reduce((sum, c) => sum + (c.enrolled_students || 0), 0) || 0;
      const availableSlots = currentCapacity - utilizedCapacity;

      return {
        currentCapacity,
        utilizedCapacity,
        availableSlots
      };
    } catch (error) {
      console.error('Error analyzing capacity:', error);
      return {
        currentCapacity: 0,
        utilizedCapacity: 0,
        availableSlots: 0
      };
    }
  }

  private async getActiveUserCount(): Promise<number> {
    try {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      
      const { data, error } = await supabase
        .from('user_sessions')
        .select('user_id')
        .gte('last_activity', fifteenMinutesAgo.toISOString());

      if (error) throw error;

      const uniqueUsers = new Set(data?.map(s => s.user_id) || []);
      return uniqueUsers.size;
    } catch (error) {
      console.error('Error getting active users:', error);
      return 0;
    }
  }

  private async checkDataIntegrity(): Promise<any> {
    const issues: string[] = [];

    try {
      // Check for orphaned records
      const { data: orphanedAttendance, error: attendanceError } = await supabase
        .from('attendance')
        .select('id')
        .is('student_id', null);

      if (attendanceError) throw attendanceError;
      if (orphanedAttendance && orphanedAttendance.length > 0) {
        issues.push(`${orphanedAttendance.length} orphaned attendance records`);
      }

      // Check for scheduling conflicts
      const { data: conflicts, error: conflictError } = await supabase
        .rpc('check_scheduling_conflicts');

      if (conflictError) console.error('Error checking conflicts:', conflictError);
      if (conflicts && conflicts.length > 0) {
        issues.push(`${conflicts.length} scheduling conflicts detected`);
      }

      const status = issues.length === 0 ? 'healthy' : issues.length < 3 ? 'warning' : 'critical';

      return {
        status,
        issues
      };
    } catch (error) {
      console.error('Error checking data integrity:', error);
      return {
        status: 'warning' as const,
        issues: ['Unable to complete data integrity check']
      };
    }
  }

  private async calculateSchedulingEfficiency(): Promise<number> {
    try {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const { data, error } = await supabase
        .from('class_schedules')
        .select('id, status, rescheduled_count')
        .gte('created_at', oneWeekAgo.toISOString());

      if (error) throw error;

      const totalSchedules = data?.length || 0;
      const rescheduled = data?.filter(s => s.rescheduled_count > 0).length || 0;
      const cancelled = data?.filter(s => s.status === 'cancelled').length || 0;

      if (totalSchedules === 0) return 100;

      const efficiency = ((totalSchedules - rescheduled - cancelled) / totalSchedules) * 100;
      return Math.max(0, efficiency);
    } catch (error) {
      console.error('Error calculating scheduling efficiency:', error);
      return 85; // Default value
    }
  }

  private async getNotificationDeliveryRate(): Promise<number> {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const { data, error } = await supabase
        .from('email_notifications')
        .select('status')
        .gte('created_at', oneDayAgo.toISOString());

      if (error) throw error;

      const total = data?.length || 0;
      const delivered = data?.filter(n => n.status === 'sent').length || 0;

      return total > 0 ? (delivered / total) * 100 : 100;
    } catch (error) {
      console.error('Error getting notification delivery rate:', error);
      return 95; // Default value
    }
  }

  // Date range helpers
  getDateRange(type: DateRangeType, customStart?: Date, customEnd?: Date): DateRange {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (type) {
      case 'today':
        start = startOfDay(now);
        end = endOfDay(now);
        break;
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        start = startOfDay(yesterday);
        end = endOfDay(yesterday);
        break;
      case 'last_7_days':
        start = new Date(now);
        start.setDate(start.getDate() - 7);
        start = startOfDay(start);
        end = endOfDay(now);
        break;
      case 'last_30_days':
        start = new Date(now);
        start.setDate(start.getDate() - 30);
        start = startOfDay(start);
        end = endOfDay(now);
        break;
      case 'this_month':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'last_month':
        const lastMonth = new Date(now);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
        break;
      case 'custom':
        start = customStart || startOfDay(now);
        end = customEnd || endOfDay(now);
        break;
    }

    return { start, end, type };
  }
}

export const analyticsAggregationService = new AnalyticsAggregationService();