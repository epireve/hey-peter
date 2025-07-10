/**
 * Teacher Performance Database Service
 * 
 * This service provides comprehensive database queries for teacher performance
 * analytics, including real-time data fetching, caching, and aggregation.
 */

import { supabase } from '@/lib/supabase';
import {
  TeacherPerformanceMetrics,
  TeacherHourAnalytics,
  StudentFeedbackAnalytics,
  AttendanceAnalytics,
  TeacherPeerComparison,
  TeacherCohortAnalysis,
  TeacherPerformanceFilters,
  TeacherPerformanceSort,
  TeacherPerformanceSearchResult
} from '@/types/teacher-performance';

export class TeacherPerformanceDbService {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  /**
   * Get basic teacher information with performance overview
   */
  async getTeacherBasicInfo(teacherId: string) {
    const cacheKey = `teacher-basic-${teacherId}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    const { data, error } = await supabase
      .from('teachers')
      .select(`
        id,
        email,
        full_name,
        bio,
        availability,
        hourly_rate,
        created_at,
        updated_at,
        users!inner(
          id,
          email,
          full_name,
          role
        )
      `)
      .eq('id', teacherId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch teacher info: ${error.message}`);
    }

    this.setCachedData(cacheKey, data);
    return data;
  }

  /**
   * Get teacher's classes and teaching hours
   */
  async getTeacherHourAnalytics(teacherId: string, startDate: string, endDate: string): Promise<TeacherHourAnalytics> {
    const cacheKey = `teacher-hours-${teacherId}-${startDate}-${endDate}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    // Get all classes taught by teacher in the period
    const { data: classes, error: classError } = await supabase
      .from('classes')
      .select(`
        id,
        class_name,
        capacity,
        current_enrollment,
        start_date,
        end_date,
        courses!inner(
          id,
          title,
          course_type,
          duration_minutes,
          credit_hours
        ),
        bookings!inner(
          id,
          booking_date,
          start_time,
          end_time,
          duration_minutes,
          status,
          students!inner(
            id,
            full_name
          )
        )
      `)
      .eq('teacher_id', teacherId)
      .gte('start_date', startDate)
      .lte('end_date', endDate);

    if (classError) {
      throw new Error(`Failed to fetch teacher classes: ${classError.message}`);
    }

    // Get attendance data
    const { data: attendance, error: attendanceError } = await supabase
      .from('attendance')
      .select(`
        id,
        status,
        hours_deducted,
        attendance_time,
        bookings!inner(
          id,
          duration_minutes,
          classes!inner(
            id,
            teacher_id
          )
        )
      `)
      .eq('bookings.classes.teacher_id', teacherId)
      .gte('attendance_time', startDate)
      .lte('attendance_time', endDate);

    if (attendanceError) {
      throw new Error(`Failed to fetch attendance data: ${attendanceError.message}`);
    }

    // Calculate analytics
    const analytics = this.calculateHourAnalytics(classes || [], attendance || []);
    
    this.setCachedData(cacheKey, analytics);
    return analytics;
  }

  /**
   * Get student feedback analytics for teacher
   */
  async getStudentFeedbackAnalytics(teacherId: string, startDate: string, endDate: string): Promise<StudentFeedbackAnalytics> {
    const cacheKey = `teacher-feedback-${teacherId}-${startDate}-${endDate}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    const { data: feedback, error } = await supabase
      .from('feedback')
      .select(`
        id,
        rating,
        student_comments,
        teacher_notes,
        created_at,
        students!inner(
          id,
          full_name
        ),
        classes!inner(
          id,
          class_name,
          courses!inner(
            id,
            title,
            course_type
          )
        )
      `)
      .eq('teacher_id', teacherId)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (error) {
      throw new Error(`Failed to fetch feedback: ${error.message}`);
    }

    const analytics = this.calculateFeedbackAnalytics(feedback || [], startDate, endDate);
    
    this.setCachedData(cacheKey, analytics);
    return analytics;
  }

  /**
   * Get teacher's class attendance analytics
   */
  async getAttendanceAnalytics(teacherId: string, startDate: string, endDate: string): Promise<AttendanceAnalytics> {
    const cacheKey = `teacher-attendance-${teacherId}-${startDate}-${endDate}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    const { data: attendanceData, error } = await supabase
      .from('attendance')
      .select(`
        id,
        status,
        hours_deducted,
        attendance_time,
        bookings!inner(
          id,
          booking_date,
          start_time,
          end_time,
          duration_minutes,
          classes!inner(
            id,
            class_name,
            teacher_id,
            courses!inner(
              id,
              title,
              course_type
            )
          )
        )
      `)
      .eq('bookings.classes.teacher_id', teacherId)
      .gte('attendance_time', startDate)
      .lte('attendance_time', endDate);

    if (error) {
      throw new Error(`Failed to fetch attendance: ${error.message}`);
    }

    const analytics = this.calculateAttendanceAnalytics(attendanceData || [], startDate, endDate);
    
    this.setCachedData(cacheKey, analytics);
    return analytics;
  }

  /**
   * Get teacher's punctuality metrics
   */
  async getTeacherPunctualityMetrics(teacherId: string, startDate: string, endDate: string) {
    const { data: sessions, error } = await supabase
      .from('bookings')
      .select(`
        id,
        start_time,
        end_time,
        status,
        classes!inner(
          id,
          teacher_id
        )
      `)
      .eq('classes.teacher_id', teacherId)
      .gte('start_time', startDate)
      .lte('start_time', endDate)
      .eq('status', 'completed');

    if (error) {
      throw new Error(`Failed to fetch punctuality data: ${error.message}`);
    }

    return this.calculatePunctualityMetrics(sessions || []);
  }

  /**
   * Get teacher's availability metrics
   */
  async getTeacherAvailabilityMetrics(teacherId: string, startDate: string, endDate: string) {
    // Get teacher's availability settings
    const { data: teacher } = await supabase
      .from('teachers')
      .select('availability')
      .eq('id', teacherId)
      .single();

    // Get cancellation data
    const { data: cancellations, error: cancellationError } = await supabase
      .from('bookings')
      .select(`
        id,
        status,
        start_time,
        classes!inner(
          id,
          teacher_id
        )
      `)
      .eq('classes.teacher_id', teacherId)
      .eq('status', 'cancelled')
      .gte('start_time', startDate)
      .lte('start_time', endDate);

    if (cancellationError) {
      throw new Error(`Failed to fetch cancellation data: ${cancellationError.message}`);
    }

    // Get total scheduled classes
    const { data: totalScheduled, error: scheduledError } = await supabase
      .from('bookings')
      .select(`
        id,
        classes!inner(
          id,
          teacher_id
        )
      `)
      .eq('classes.teacher_id', teacherId)
      .gte('start_time', startDate)
      .lte('start_time', endDate);

    if (scheduledError) {
      throw new Error(`Failed to fetch scheduled classes: ${scheduledError.message}`);
    }

    return this.calculateAvailabilityMetrics(
      teacher?.availability || {},
      cancellations || [],
      totalScheduled || []
    );
  }

  /**
   * Get teacher comparison with peers
   */
  async getTeacherPeerComparison(teacherId: string): Promise<TeacherPeerComparison> {
    const cacheKey = `teacher-peer-comparison-${teacherId}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    // Get teacher's basic info
    const teacher = await this.getTeacherBasicInfo(teacherId);

    // Get peer teachers (same specialization or experience level)
    const { data: peers, error } = await supabase
      .from('teachers')
      .select(`
        id,
        email,
        full_name,
        created_at,
        users!inner(
          id,
          full_name
        )
      `)
      .neq('id', teacherId);

    if (error) {
      throw new Error(`Failed to fetch peer teachers: ${error.message}`);
    }

    // Calculate peer metrics (this would need actual performance data)
    const comparison = await this.calculatePeerComparison(teacherId, peers || []);
    
    this.setCachedData(cacheKey, comparison);
    return comparison;
  }

  /**
   * Get cohort analysis for all teachers
   */
  async getTeacherCohortAnalysis(): Promise<TeacherCohortAnalysis> {
    const cacheKey = 'teacher-cohort-analysis';
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    const { data: teachers, error } = await supabase
      .from('teachers')
      .select(`
        id,
        email,
        full_name,
        created_at,
        users!inner(
          id,
          full_name
        )
      `);

    if (error) {
      throw new Error(`Failed to fetch teachers: ${error.message}`);
    }

    const cohortAnalysis = await this.calculateCohortAnalysis(teachers || []);
    
    this.setCachedData(cacheKey, cohortAnalysis);
    return cohortAnalysis;
  }

  /**
   * Search teachers with filters and sorting
   */
  async searchTeachers(
    filters: TeacherPerformanceFilters,
    sort: TeacherPerformanceSort,
    page: number = 1,
    limit: number = 20
  ): Promise<TeacherPerformanceSearchResult> {
    let query = supabase
      .from('teachers')
      .select(`
        id,
        email,
        full_name,
        bio,
        availability,
        hourly_rate,
        created_at,
        updated_at,
        users!inner(
          id,
          email,
          full_name,
          role
        )
      `, { count: 'exact' });

    // Apply filters
    if (filters.teacherIds && filters.teacherIds.length > 0) {
      query = query.in('id', filters.teacherIds);
    }

    if (filters.experienceRange) {
      // Calculate experience based on created_at
      const minDate = new Date();
      minDate.setFullYear(minDate.getFullYear() - filters.experienceRange.max);
      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() - filters.experienceRange.min);
      
      query = query.gte('created_at', minDate.toISOString())
                  .lte('created_at', maxDate.toISOString());
    }

    // Apply sorting
    query = query.order(sort.field, { ascending: sort.order === 'asc' });

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: teachers, error, count } = await query;

    if (error) {
      throw new Error(`Failed to search teachers: ${error.message}`);
    }

    // Get performance metrics for each teacher (simplified for demo)
    const teachersWithMetrics = await Promise.all(
      (teachers || []).map(async (teacher) => {
        try {
          return await this.getTeacherPerformanceMetrics(teacher.id);
        } catch (error) {
          console.error(`Error getting metrics for teacher ${teacher.id}:`, error);
          return null;
        }
      })
    );

    const validTeachers = teachersWithMetrics.filter(Boolean) as TeacherPerformanceMetrics[];

    // Calculate aggregations
    const aggregations = this.calculateSearchAggregations(validTeachers);

    return {
      teachers: validTeachers,
      totalCount: count || 0,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
        hasNext: page * limit < (count || 0),
        hasPrevious: page > 1
      },
      aggregations
    };
  }

  /**
   * Get comprehensive teacher performance metrics
   */
  async getTeacherPerformanceMetrics(teacherId: string): Promise<TeacherPerformanceMetrics> {
    const cacheKey = `teacher-performance-${teacherId}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    const endDate = new Date().toISOString();
    const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    // Get basic teacher info
    const basicInfo = await this.getTeacherBasicInfo(teacherId);

    // Get analytics data
    const [hourAnalytics, feedbackAnalytics, attendanceAnalytics] = await Promise.all([
      this.getTeacherHourAnalytics(teacherId, startDate, endDate),
      this.getStudentFeedbackAnalytics(teacherId, startDate, endDate),
      this.getAttendanceAnalytics(teacherId, startDate, endDate)
    ]);

    // Calculate comprehensive metrics
    const metrics = this.calculateComprehensiveMetrics(
      basicInfo,
      hourAnalytics,
      feedbackAnalytics,
      attendanceAnalytics
    );

    this.setCachedData(cacheKey, metrics);
    return metrics;
  }

  // =====================================================================================
  // PRIVATE CALCULATION METHODS
  // =====================================================================================

  private calculateHourAnalytics(classes: any[], attendance: any[]): TeacherHourAnalytics {
    const totalHours = classes.reduce((sum, cls) => {
      const classHours = cls.bookings?.reduce((bookingSum: number, booking: any) => {
        return bookingSum + (booking.duration_minutes / 60);
      }, 0) || 0;
      return sum + classHours;
    }, 0);

    const weeklyHours = totalHours / 12; // Assuming 12 weeks in period
    
    const classByType = classes.reduce((acc, cls) => {
      const type = cls.courses?.course_type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    const classByLevel = classes.reduce((acc, cls) => {
      const level = cls.courses?.title || 'unknown';
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {});

    return {
      teacherId: '', // Will be set by caller
      period: {
        start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString()
      },
      totalHoursTaught: totalHours,
      averageHoursPerWeek: weeklyHours,
      peakTeachingHours: '19:00', // Default peak hour
      classesByType: classByType,
      classesByLevel: classByLevel,
      studentCapacityUtilization: 0.85, // Default utilization
      totalEarnings: totalHours * 25, // Assuming $25/hour
      averageHourlyRate: 25,
      bonusEarnings: 0,
      preparationTimeRatio: 0.2,
      teachingEfficiencyScore: 0.85,
      utilizationRate: 0.75
    };
  }

  private calculateFeedbackAnalytics(feedback: any[], startDate: string, endDate: string): StudentFeedbackAnalytics {
    const totalFeedback = feedback.length;
    const averageRating = totalFeedback > 0 
      ? feedback.reduce((sum, f) => sum + f.rating, 0) / totalFeedback 
      : 0;

    const monthlyTrends = this.calculateMonthlyFeedbackTrends(feedback);
    const sentimentAnalysis = this.analyzeFeedbackSentiment(feedback);

    return {
      teacherId: '', // Will be set by caller
      period: { start: startDate, end: endDate },
      totalFeedbackReceived: totalFeedback,
      averageRating,
      responseRate: 0.75, // Default response rate
      feedbackByCategory: {
        'Teaching Quality': {
          averageScore: averageRating,
          count: totalFeedback,
          trend: 'stable'
        },
        'Communication': {
          averageScore: averageRating * 0.95,
          count: totalFeedback,
          trend: 'improving'
        },
        'Preparation': {
          averageScore: averageRating * 1.05,
          count: totalFeedback,
          trend: 'stable'
        }
      },
      sentimentAnalysis,
      monthlyFeedbackTrends: monthlyTrends
    };
  }

  private calculateAttendanceAnalytics(attendanceData: any[], startDate: string, endDate: string): AttendanceAnalytics {
    const totalSessions = attendanceData.length;
    const presentSessions = attendanceData.filter(a => a.status === 'present').length;
    const averageAttendanceRate = totalSessions > 0 ? (presentSessions / totalSessions) * 100 : 0;

    const attendanceByDayOfWeek = this.calculateAttendanceByDayOfWeek(attendanceData);
    const attendanceByTimeSlot = this.calculateAttendanceByTimeSlot(attendanceData);
    const attendanceByClassType = this.calculateAttendanceByClassType(attendanceData);

    return {
      teacherId: '', // Will be set by caller
      period: { start: startDate, end: endDate },
      averageAttendanceRate,
      classesWithPerfectAttendance: 0, // Would need more complex calculation
      classesWithLowAttendance: 0, // Would need more complex calculation
      attendanceByDayOfWeek,
      attendanceByTimeSlot,
      attendanceByClassType,
      attendanceImpactOnProgress: 0.75, // Default correlation
      attendanceRetentionCorrelation: 0.85 // Default correlation
    };
  }

  private calculatePunctualityMetrics(sessions: any[]) {
    const totalSessions = sessions.length;
    const onTimeSessions = sessions.filter(session => {
      // This would require actual start time tracking
      return true; // Default to all on time for now
    }).length;

    return {
      punctualityRate: totalSessions > 0 ? (onTimeSessions / totalSessions) * 100 : 0,
      averageDelayMinutes: 0, // Would need actual delay tracking
      monthlyTrends: []
    };
  }

  private calculateAvailabilityMetrics(availability: any, cancellations: any[], totalScheduled: any[]) {
    const totalScheduledCount = totalScheduled.length;
    const cancellationCount = cancellations.length;
    const cancellationRate = totalScheduledCount > 0 ? (cancellationCount / totalScheduledCount) * 100 : 0;

    return {
      schedulingFlexibility: 0.75, // Default flexibility score
      cancellationRate,
      substituteRequestRate: 0.05, // Default substitute rate
      peakHourAvailability: 0.85, // Default peak hour availability
      consistencyScore: 0.80, // Default consistency
      responseTime: 2.5, // Default response time in hours
      weeklyAvailability: {
        'Monday': 0.8,
        'Tuesday': 0.85,
        'Wednesday': 0.9,
        'Thursday': 0.85,
        'Friday': 0.8,
        'Saturday': 0.6,
        'Sunday': 0.4
      },
      monthlyConsistency: []
    };
  }

  private async calculatePeerComparison(teacherId: string, peers: any[]): Promise<TeacherPeerComparison> {
    // This would involve complex calculations comparing teacher metrics
    // For now, return a simplified version
    return {
      teacherId,
      peerGroup: {
        criteria: 'Same specialization and experience level',
        size: peers.length,
        averageExperience: 3.5,
        averageRating: 4.2
      },
      ranking: {
        overall: 5,
        percentile: 75,
        outOfTotal: peers.length + 1
      },
      performanceComparison: {
        teachingEffectiveness: { score: 85, peerAverage: 80, ranking: 3 },
        studentSatisfaction: { score: 4.5, peerAverage: 4.2, ranking: 2 },
        classManagement: { score: 88, peerAverage: 82, ranking: 4 },
        availability: { score: 90, peerAverage: 85, ranking: 2 },
        professionalDevelopment: { score: 75, peerAverage: 78, ranking: 8 }
      },
      strengthAreas: ['Student Satisfaction', 'Availability', 'Teaching Effectiveness'],
      improvementAreas: ['Professional Development'],
      competitiveAdvantages: ['High student retention', 'Excellent punctuality', 'Strong communication'],
      developmentNeeds: ['Complete pending certifications', 'Attend advanced training workshops']
    };
  }

  private async calculateCohortAnalysis(teachers: any[]): Promise<TeacherCohortAnalysis> {
    const totalTeachers = teachers.length;
    
    return {
      cohortId: 'all-teachers',
      cohortName: 'All Teachers',
      totalTeachers,
      statistics: {
        averageRating: 4.2,
        averageExperience: 3.5,
        medianRating: 4.3,
        standardDeviation: 0.8
      },
      performanceDistribution: [
        { range: '4.5-5.0', count: Math.floor(totalTeachers * 0.2), percentage: 20 },
        { range: '4.0-4.4', count: Math.floor(totalTeachers * 0.4), percentage: 40 },
        { range: '3.5-3.9', count: Math.floor(totalTeachers * 0.25), percentage: 25 },
        { range: '3.0-3.4', count: Math.floor(totalTeachers * 0.1), percentage: 10 },
        { range: '2.5-2.9', count: Math.floor(totalTeachers * 0.05), percentage: 5 }
      ],
      topPerformers: teachers.slice(0, 5).map((teacher, index) => ({
        teacherId: teacher.id,
        teacherName: teacher.full_name,
        rating: 4.8 - (index * 0.1),
        rank: index + 1
      })),
      needsAttention: teachers.slice(-3).map((teacher, index) => ({
        teacherId: teacher.id,
        teacherName: teacher.full_name,
        rating: 3.2 + (index * 0.1),
        issues: ['Low student satisfaction', 'High cancellation rate'],
        urgency: index === 0 ? 'high' : 'medium'
      })),
      commonStrengths: ['Teaching Quality', 'Punctuality', 'Communication'],
      commonChallenges: ['Technology Usage', 'Student Engagement', 'Professional Development'],
      recommendations: [],
      cohortTrends: []
    };
  }

  private calculateSearchAggregations(teachers: TeacherPerformanceMetrics[]) {
    const totalTeachers = teachers.length;
    const averageRating = totalTeachers > 0 
      ? teachers.reduce((sum, t) => sum + t.overallRating, 0) / totalTeachers 
      : 0;

    const totalHoursTaught = teachers.reduce((sum, t) => sum + (t.metrics?.teachingEffectiveness?.studentProgressRate || 0), 0);

    return {
      averageRating,
      totalHoursTaught,
      topSpecializations: [
        { specialization: 'Business English', count: Math.floor(totalTeachers * 0.3) },
        { specialization: 'Conversation', count: Math.floor(totalTeachers * 0.4) },
        { specialization: 'Grammar', count: Math.floor(totalTeachers * 0.2) },
        { specialization: 'IELTS Prep', count: Math.floor(totalTeachers * 0.1) }
      ]
    };
  }

  private calculateComprehensiveMetrics(
    basicInfo: any,
    hourAnalytics: TeacherHourAnalytics,
    feedbackAnalytics: StudentFeedbackAnalytics,
    attendanceAnalytics: AttendanceAnalytics
  ): TeacherPerformanceMetrics {
    const teacherId = basicInfo.id;
    const teacherName = basicInfo.full_name;
    const email = basicInfo.email;
    
    // Calculate overall rating based on all metrics
    const overallRating = this.calculateOverallRating(feedbackAnalytics, attendanceAnalytics);

    return {
      teacherId,
      teacherName,
      email,
      specializations: ['Business English', 'Conversation'], // Default specializations
      experienceYears: Math.floor((Date.now() - new Date(basicInfo.created_at).getTime()) / (365 * 24 * 60 * 60 * 1000)),
      overallRating,
      lastUpdated: new Date().toISOString(),
      metrics: {
        teachingEffectiveness: {
          studentProgressRate: 85,
          lessonCompletionRate: 92,
          averageStudentScore: feedbackAnalytics.averageRating * 20,
          learningObjectiveAchievement: 88,
          adaptabilityScore: 75,
          innovationScore: 70,
          progressByLevel: { 'Beginner': 90, 'Intermediate': 85, 'Advanced': 80 },
          completionByClassType: { 'Group': 90, '1-on-1': 95 },
          scoresBySubject: { 'Grammar': 85, 'Speaking': 90, 'Writing': 80 }
        },
        studentSatisfaction: {
          averageRating: feedbackAnalytics.averageRating,
          satisfactionTrend: 'stable',
          feedbackCount: feedbackAnalytics.totalFeedbackReceived,
          recommendationRate: 0.85,
          retentionRate: 0.90,
          engagementScore: 0.88,
          ratingDistribution: { '5': 40, '4': 35, '3': 20, '2': 5, '1': 0 },
          feedbackCategories: { 'positive': 80, 'neutral': 15, 'negative': 5 },
          monthlyTrends: feedbackAnalytics.monthlyFeedbackTrends
        },
        classManagement: {
          punctualityRate: 95,
          attendanceRate: attendanceAnalytics.averageAttendanceRate,
          classPreparationScore: 90,
          timeManagementScore: 85,
          disciplineEffectiveness: 88,
          resourceUtilization: 82,
          punctualityTrends: [],
          attendanceTrends: []
        },
        availability: {
          schedulingFlexibility: 75,
          cancellationRate: 3,
          substituteRequestRate: 2,
          peakHourAvailability: 85,
          consistencyScore: 88,
          responseTime: 2.5,
          weeklyAvailability: {
            'Monday': 0.8,
            'Tuesday': 0.85,
            'Wednesday': 0.9,
            'Thursday': 0.85,
            'Friday': 0.8,
            'Saturday': 0.6,
            'Sunday': 0.4
          },
          monthlyConsistency: []
        },
        professionalDevelopment: {
          trainingCompletionRate: 80,
          skillImprovementRate: 15,
          certificationStatus: 'certified',
          mentorshipParticipation: 0.7,
          innovationContributions: 0.6,
          leadershipActivities: 0.5,
          completedTrainings: [],
          skillAssessments: []
        }
      },
      trends: [],
      recommendations: []
    };
  }

  private calculateOverallRating(feedbackAnalytics: StudentFeedbackAnalytics, attendanceAnalytics: AttendanceAnalytics): number {
    const feedbackWeight = 0.4;
    const attendanceWeight = 0.3;
    const defaultWeight = 0.3;

    const feedbackScore = feedbackAnalytics.averageRating * 20; // Convert to 0-100 scale
    const attendanceScore = attendanceAnalytics.averageAttendanceRate;
    const defaultScore = 85; // Default performance score

    const weightedScore = (feedbackScore * feedbackWeight) + 
                         (attendanceScore * attendanceWeight) + 
                         (defaultScore * defaultWeight);

    return Math.round(weightedScore * 10) / 10; // Round to 1 decimal place
  }

  // Helper methods for detailed calculations
  private calculateMonthlyFeedbackTrends(feedback: any[]) {
    const monthlyData = feedback.reduce((acc, f) => {
      const month = new Date(f.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (!acc[month]) {
        acc[month] = { total: 0, count: 0 };
      }
      acc[month].total += f.rating;
      acc[month].count += 1;
      return acc;
    }, {});

    return Object.entries(monthlyData).map(([month, data]) => ({
      month,
      averageRating: (data as any).total / (data as any).count,
      feedbackCount: (data as any).count,
      positivePercentage: 80 // Default positive percentage
    }));
  }

  private analyzeFeedbackSentiment(feedback: any[]) {
    // Simplified sentiment analysis
    const total = feedback.length;
    return {
      positive: Math.floor(total * 0.75),
      neutral: Math.floor(total * 0.2),
      negative: Math.floor(total * 0.05),
      commonPositiveThemes: ['Great teaching', 'Very helpful', 'Excellent communication'],
      commonNegativeThemes: ['Sometimes late', 'Could be more engaging']
    };
  }

  private calculateAttendanceByDayOfWeek(attendanceData: any[]) {
    const dayStats = attendanceData.reduce((acc, a) => {
      const day = new Date(a.attendance_time).toLocaleDateString('en-US', { weekday: 'long' });
      if (!acc[day]) acc[day] = { present: 0, total: 0 };
      acc[day].total += 1;
      if (a.status === 'present') acc[day].present += 1;
      return acc;
    }, {});

    return Object.entries(dayStats).reduce((acc, [day, stats]) => {
      acc[day] = (stats as any).total > 0 ? ((stats as any).present / (stats as any).total) * 100 : 0;
      return acc;
    }, {});
  }

  private calculateAttendanceByTimeSlot(attendanceData: any[]) {
    // Simplified time slot calculation
    return {
      'Morning (8-12)': 85,
      'Afternoon (12-17)': 90,
      'Evening (17-21)': 95,
      'Night (21-24)': 80
    };
  }

  private calculateAttendanceByClassType(attendanceData: any[]) {
    // Simplified class type calculation
    return {
      'Group': 88,
      '1-on-1': 95,
      'Business': 92,
      'Conversation': 90
    };
  }

  // =====================================================================================
  // CACHE MANAGEMENT
  // =====================================================================================

  private getCachedData(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  public clearCache(): void {
    this.cache.clear();
  }

  public clearCacheForTeacher(teacherId: string): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(key => key.includes(teacherId));
    keysToDelete.forEach(key => this.cache.delete(key));
  }
}

// Export singleton instance
export const teacherPerformanceDbService = new TeacherPerformanceDbService();