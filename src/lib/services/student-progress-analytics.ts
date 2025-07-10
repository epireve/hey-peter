/**
 * HeyPeter Academy - Student Progress Analytics Service
 * 
 * This service provides comprehensive student progress analysis and aggregation
 * capabilities for the daily update system. It includes:
 * - Progress calculation and trend analysis
 * - Performance metrics aggregation
 * - Learning path optimization
 * - Predictive analytics for student outcomes
 * - Risk assessment and intervention recommendations
 */

import { 
  StudentProgress, 
  StudentPerformanceMetrics, 
  LearningContent,
  SchedulingEvent
} from '@/types/scheduling';
import { supabase } from '@/lib/supabase';

export interface StudentProgressAnalysis {
  studentId: string;
  currentProgress: StudentProgress;
  trends: ProgressTrend[];
  predictions: ProgressPrediction[];
  riskFactors: RiskFactor[];
  recommendations: ProgressRecommendation[];
  lastUpdated: string;
}

export interface ProgressTrend {
  metric: string;
  timeframe: string;
  trend: 'increasing' | 'decreasing' | 'stable';
  changeRate: number;
  confidence: number;
  dataPoints: { date: string; value: number }[];
}

export interface ProgressPrediction {
  metric: string;
  predictedValue: number;
  targetDate: string;
  confidence: number;
  factors: string[];
}

export interface RiskFactor {
  type: 'attendance' | 'engagement' | 'performance' | 'completion';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  indicators: string[];
  recommendedActions: string[];
}

export interface ProgressRecommendation {
  type: 'content_adjustment' | 'schedule_change' | 'intervention' | 'support';
  priority: 'low' | 'medium' | 'high';
  description: string;
  expectedImpact: number;
  implementationComplexity: 'low' | 'medium' | 'high';
  actions: RecommendationAction[];
}

export interface RecommendationAction {
  action: string;
  assignedTo: string;
  deadline: string;
  parameters: Record<string, any>;
}

export interface StudentCohortAnalysis {
  cohortId: string;
  totalStudents: number;
  averageProgress: number;
  progressDistribution: { range: string; count: number }[];
  performanceMetrics: {
    averageAttendance: number;
    averageEngagement: number;
    completionRate: number;
    riskStudents: number;
  };
  trends: ProgressTrend[];
  commonChallenges: string[];
  recommendations: ProgressRecommendation[];
}

export class StudentProgressAnalytics {
  private cache: Map<string, StudentProgressAnalysis> = new Map();
  private cacheTimeout: number = 60 * 60 * 1000; // 1 hour

  /**
   * Get comprehensive progress analysis for a student
   */
  public async getStudentProgressAnalysis(studentId: string, forceRefresh: boolean = false): Promise<StudentProgressAnalysis> {
    const cacheKey = `student-progress-${studentId}`;
    
    if (!forceRefresh && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      const age = Date.now() - new Date(cached.lastUpdated).getTime();
      
      if (age < this.cacheTimeout) {
        return cached;
      }
    }

    // Calculate comprehensive progress analysis
    const analysis = await this.calculateStudentProgressAnalysis(studentId);
    
    // Cache the result
    this.cache.set(cacheKey, analysis);
    
    return analysis;
  }

  /**
   * Calculate comprehensive student progress analysis
   */
  private async calculateStudentProgressAnalysis(studentId: string): Promise<StudentProgressAnalysis> {
    // Get student basic information
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select(`
        *,
        users!inner(id, full_name, email)
      `)
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      throw new Error(`Failed to fetch student: ${studentError?.message}`);
    }

    // Calculate current progress
    const currentProgress = await this.calculateCurrentProgress(studentId);
    
    // Calculate trends
    const trends = await this.calculateProgressTrends(studentId);
    
    // Generate predictions
    const predictions = await this.generateProgressPredictions(studentId, trends);
    
    // Assess risk factors
    const riskFactors = await this.assessRiskFactors(studentId, currentProgress);
    
    // Generate recommendations
    const recommendations = await this.generateRecommendations(studentId, currentProgress, riskFactors);

    return {
      studentId,
      currentProgress,
      trends,
      predictions,
      riskFactors,
      recommendations,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Calculate current progress for a student
   */
  private async calculateCurrentProgress(studentId: string): Promise<StudentProgress> {
    // Get student enrollment and course data
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select(`
        *,
        courses!inner(id, name, course_type, total_lessons)
      `)
      .eq('student_id', studentId)
      .eq('status', 'active')
      .single();

    if (enrollmentError || !enrollment) {
      throw new Error(`Failed to fetch enrollment: ${enrollmentError?.message}`);
    }

    // Get completed lessons
    const { data: completedLessons, error: lessonsError } = await supabase
      .from('lesson_progress')
      .select('lesson_id, completion_date, score')
      .eq('student_id', studentId)
      .eq('status', 'completed');

    if (lessonsError) {
      throw new Error(`Failed to fetch lesson progress: ${lessonsError?.message}`);
    }

    // Get attendance data
    const { data: attendanceData, error: attendanceError } = await supabase
      .from('attendance')
      .select('class_id, attended, date')
      .eq('student_id', studentId)
      .gte('date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()); // Last 90 days

    if (attendanceError) {
      throw new Error(`Failed to fetch attendance: ${attendanceError?.message}`);
    }

    // Calculate progress metrics
    const totalLessons = enrollment.courses.total_lessons || 0;
    const completedCount = completedLessons?.length || 0;
    const progressPercentage = totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0;

    // Calculate attendance rate
    const totalClasses = attendanceData?.length || 0;
    const attendedClasses = attendanceData?.filter(a => a.attended).length || 0;
    const attendanceRate = totalClasses > 0 ? attendedClasses / totalClasses : 0;

    // Calculate performance metrics
    const performanceMetrics = await this.calculatePerformanceMetrics(studentId, attendanceData, completedLessons);

    // Get learning content
    const { data: learningContent } = await supabase
      .from('learning_content')
      .select('*')
      .eq('course_id', enrollment.courses.id);

    const completedContentIds = completedLessons?.map(l => l.lesson_id) || [];
    const unlearnedContent = learningContent?.filter(c => !completedContentIds.includes(c.id)) || [];

    return {
      studentId,
      courseId: enrollment.courses.id,
      progressPercentage,
      currentUnit: Math.floor(completedCount / 10) + 1, // Assuming 10 lessons per unit
      currentLesson: (completedCount % 10) + 1,
      completedContent: completedContentIds,
      inProgressContent: [], // Would be calculated from current active lessons
      unlearnedContent: unlearnedContent.map(c => c.id),
      skillAssessments: {}, // Would be calculated from skill-specific assessments
      learningPace: this.calculateLearningPace(completedLessons),
      preferredTimes: [], // Would be calculated from attendance patterns
      lastActivity: new Date().toISOString(),
      studyStreak: await this.calculateStudyStreak(studentId),
      performanceMetrics
    };
  }

  /**
   * Calculate performance metrics for a student
   */
  private async calculatePerformanceMetrics(
    studentId: string, 
    attendanceData: any[], 
    completedLessons: any[]
  ): Promise<StudentPerformanceMetrics> {
    // Calculate attendance rate
    const attendanceRate = attendanceData.length > 0 
      ? attendanceData.filter(a => a.attended).length / attendanceData.length
      : 0;

    // Calculate assignment completion rate
    const { data: assignments } = await supabase
      .from('assignments')
      .select('id, status')
      .eq('student_id', studentId);

    const assignmentCompletionRate = assignments && assignments.length > 0
      ? assignments.filter(a => a.status === 'completed').length / assignments.length
      : 0;

    // Calculate average score
    const averageScore = completedLessons && completedLessons.length > 0
      ? completedLessons.reduce((sum, l) => sum + (l.score || 0), 0) / completedLessons.length
      : 0;

    // Calculate engagement level (based on various factors)
    const engagementLevel = Math.round(
      (attendanceRate * 0.4 + assignmentCompletionRate * 0.3 + (averageScore / 100) * 0.3) * 10
    );

    return {
      attendanceRate,
      assignmentCompletionRate,
      averageScore,
      engagementLevel,
      preferredClassTypes: ['group'], // Would be calculated from class preferences
      optimalClassSize: 5, // Would be calculated from performance in different class sizes
      bestPerformingTimes: [], // Would be calculated from attendance and performance data
      challengingTopics: [] // Would be calculated from low-scoring lessons
    };
  }

  /**
   * Calculate learning pace (lessons per week)
   */
  private calculateLearningPace(completedLessons: any[]): number {
    if (!completedLessons || completedLessons.length === 0) {
      return 0;
    }

    const sortedLessons = completedLessons.sort((a, b) => 
      new Date(a.completion_date).getTime() - new Date(b.completion_date).getTime()
    );

    const firstDate = new Date(sortedLessons[0].completion_date);
    const lastDate = new Date(sortedLessons[sortedLessons.length - 1].completion_date);
    const weeksDiff = (lastDate.getTime() - firstDate.getTime()) / (7 * 24 * 60 * 60 * 1000);

    return weeksDiff > 0 ? completedLessons.length / weeksDiff : 0;
  }

  /**
   * Calculate study streak
   */
  private async calculateStudyStreak(studentId: string): Promise<number> {
    const { data: recentActivity } = await supabase
      .from('lesson_progress')
      .select('completion_date')
      .eq('student_id', studentId)
      .order('completion_date', { ascending: false })
      .limit(30);

    if (!recentActivity || recentActivity.length === 0) {
      return 0;
    }

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const activity of recentActivity) {
      const activityDate = new Date(activity.completion_date);
      activityDate.setHours(0, 0, 0, 0);

      if (activityDate.getTime() === currentDate.getTime()) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * Calculate progress trends for a student
   */
  private async calculateProgressTrends(studentId: string): Promise<ProgressTrend[]> {
    const trends: ProgressTrend[] = [];

    // Get historical data for the last 90 days
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Progress trend
    const progressTrend = await this.calculateProgressTrend(studentId, startDate, endDate);
    if (progressTrend) {
      trends.push(progressTrend);
    }

    // Attendance trend
    const attendanceTrend = await this.calculateAttendanceTrend(studentId, startDate, endDate);
    if (attendanceTrend) {
      trends.push(attendanceTrend);
    }

    // Performance trend
    const performanceTrend = await this.calculatePerformanceTrend(studentId, startDate, endDate);
    if (performanceTrend) {
      trends.push(performanceTrend);
    }

    return trends;
  }

  /**
   * Calculate progress trend
   */
  private async calculateProgressTrend(
    studentId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<ProgressTrend | null> {
    const { data: progressData } = await supabase
      .from('lesson_progress')
      .select('completion_date')
      .eq('student_id', studentId)
      .gte('completion_date', startDate.toISOString())
      .lte('completion_date', endDate.toISOString())
      .order('completion_date', { ascending: true });

    if (!progressData || progressData.length === 0) {
      return null;
    }

    // Group by week and calculate cumulative progress
    const weeklyProgress = this.groupProgressByWeek(progressData);
    
    // Calculate trend
    const trend = this.calculateTrendDirection(weeklyProgress);
    const changeRate = this.calculateChangeRate(weeklyProgress);

    return {
      metric: 'progress',
      timeframe: '90_days',
      trend,
      changeRate,
      confidence: 0.8, // Would be calculated based on data quality
      dataPoints: weeklyProgress.map(wp => ({
        date: wp.date,
        value: wp.progress
      }))
    };
  }

  /**
   * Calculate attendance trend
   */
  private async calculateAttendanceTrend(
    studentId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<ProgressTrend | null> {
    const { data: attendanceData } = await supabase
      .from('attendance')
      .select('date, attended')
      .eq('student_id', studentId)
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString())
      .order('date', { ascending: true });

    if (!attendanceData || attendanceData.length === 0) {
      return null;
    }

    // Group by week and calculate attendance rate
    const weeklyAttendance = this.groupAttendanceByWeek(attendanceData);
    
    // Calculate trend
    const trend = this.calculateTrendDirection(weeklyAttendance);
    const changeRate = this.calculateChangeRate(weeklyAttendance);

    return {
      metric: 'attendance',
      timeframe: '90_days',
      trend,
      changeRate,
      confidence: 0.9,
      dataPoints: weeklyAttendance.map(wa => ({
        date: wa.date,
        value: wa.rate
      }))
    };
  }

  /**
   * Calculate performance trend
   */
  private async calculatePerformanceTrend(
    studentId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<ProgressTrend | null> {
    const { data: performanceData } = await supabase
      .from('lesson_progress')
      .select('completion_date, score')
      .eq('student_id', studentId)
      .gte('completion_date', startDate.toISOString())
      .lte('completion_date', endDate.toISOString())
      .not('score', 'is', null)
      .order('completion_date', { ascending: true });

    if (!performanceData || performanceData.length === 0) {
      return null;
    }

    // Group by week and calculate average score
    const weeklyPerformance = this.groupPerformanceByWeek(performanceData);
    
    // Calculate trend
    const trend = this.calculateTrendDirection(weeklyPerformance);
    const changeRate = this.calculateChangeRate(weeklyPerformance);

    return {
      metric: 'performance',
      timeframe: '90_days',
      trend,
      changeRate,
      confidence: 0.85,
      dataPoints: weeklyPerformance.map(wp => ({
        date: wp.date,
        value: wp.averageScore
      }))
    };
  }

  /**
   * Group progress data by week
   */
  private groupProgressByWeek(progressData: any[]): { date: string; progress: number }[] {
    const weeks: Map<string, number> = new Map();
    
    progressData.forEach(item => {
      const date = new Date(item.completion_date);
      const weekStart = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      
      weeks.set(weekKey, (weeks.get(weekKey) || 0) + 1);
    });

    return Array.from(weeks.entries())
      .map(([date, count]) => ({ date, progress: count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Group attendance data by week
   */
  private groupAttendanceByWeek(attendanceData: any[]): { date: string; rate: number }[] {
    const weeks: Map<string, { total: number; attended: number }> = new Map();
    
    attendanceData.forEach(item => {
      const date = new Date(item.date);
      const weekStart = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      
      const existing = weeks.get(weekKey) || { total: 0, attended: 0 };
      weeks.set(weekKey, {
        total: existing.total + 1,
        attended: existing.attended + (item.attended ? 1 : 0)
      });
    });

    return Array.from(weeks.entries())
      .map(([date, data]) => ({ 
        date, 
        rate: data.total > 0 ? (data.attended / data.total) * 100 : 0 
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Group performance data by week
   */
  private groupPerformanceByWeek(performanceData: any[]): { date: string; averageScore: number }[] {
    const weeks: Map<string, { total: number; sum: number }> = new Map();
    
    performanceData.forEach(item => {
      const date = new Date(item.completion_date);
      const weekStart = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      
      const existing = weeks.get(weekKey) || { total: 0, sum: 0 };
      weeks.set(weekKey, {
        total: existing.total + 1,
        sum: existing.sum + (item.score || 0)
      });
    });

    return Array.from(weeks.entries())
      .map(([date, data]) => ({ 
        date, 
        averageScore: data.total > 0 ? data.sum / data.total : 0 
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Calculate trend direction
   */
  private calculateTrendDirection(dataPoints: { date: string; [key: string]: any }[]): 'increasing' | 'decreasing' | 'stable' {
    if (dataPoints.length < 2) {
      return 'stable';
    }

    const values = dataPoints.map(dp => Object.values(dp)[1] as number);
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.ceil(values.length / 2));

    const firstHalfAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

    const change = secondHalfAvg - firstHalfAvg;
    const changeThreshold = firstHalfAvg * 0.05; // 5% change threshold

    if (change > changeThreshold) {
      return 'increasing';
    } else if (change < -changeThreshold) {
      return 'decreasing';
    } else {
      return 'stable';
    }
  }

  /**
   * Calculate change rate
   */
  private calculateChangeRate(dataPoints: { date: string; [key: string]: any }[]): number {
    if (dataPoints.length < 2) {
      return 0;
    }

    const values = dataPoints.map(dp => Object.values(dp)[1] as number);
    const firstValue = values[0];
    const lastValue = values[values.length - 1];

    if (firstValue === 0) {
      return 0;
    }

    return ((lastValue - firstValue) / firstValue) * 100;
  }

  /**
   * Generate progress predictions
   */
  private async generateProgressPredictions(
    studentId: string, 
    trends: ProgressTrend[]
  ): Promise<ProgressPrediction[]> {
    const predictions: ProgressPrediction[] = [];

    // Progress completion prediction
    const progressTrend = trends.find(t => t.metric === 'progress');
    if (progressTrend && progressTrend.trend === 'increasing') {
      const currentProgress = await this.getCurrentProgressPercentage(studentId);
      const remainingProgress = 100 - currentProgress;
      const weeklyRate = progressTrend.changeRate / 12; // Convert to weekly rate
      
      if (weeklyRate > 0) {
        const weeksToComplete = remainingProgress / weeklyRate;
        const completionDate = new Date(Date.now() + weeksToComplete * 7 * 24 * 60 * 60 * 1000);
        
        predictions.push({
          metric: 'course_completion',
          predictedValue: 100,
          targetDate: completionDate.toISOString(),
          confidence: Math.min(progressTrend.confidence, 0.8),
          factors: ['current_progress_rate', 'attendance_consistency', 'performance_trend']
        });
      }
    }

    // Attendance prediction
    const attendanceTrend = trends.find(t => t.metric === 'attendance');
    if (attendanceTrend) {
      const nextMonthAttendance = this.extrapolateValue(
        attendanceTrend.dataPoints.map(dp => dp.value),
        4 // 4 weeks ahead
      );
      
      predictions.push({
        metric: 'attendance_rate',
        predictedValue: Math.max(0, Math.min(100, nextMonthAttendance)),
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        confidence: attendanceTrend.confidence,
        factors: ['attendance_trend', 'seasonal_patterns']
      });
    }

    return predictions;
  }

  /**
   * Get current progress percentage for a student
   */
  private async getCurrentProgressPercentage(studentId: string): Promise<number> {
    const { data: student } = await supabase
      .from('students')
      .select('progress_percentage')
      .eq('id', studentId)
      .single();

    return student?.progress_percentage || 0;
  }

  /**
   * Extrapolate value based on trend
   */
  private extrapolateValue(values: number[], periodsAhead: number): number {
    if (values.length < 2) {
      return values[0] || 0;
    }

    // Simple linear extrapolation
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + val * i, 0);
    const sumXX = values.reduce((sum, val, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return slope * (n - 1 + periodsAhead) + intercept;
  }

  /**
   * Assess risk factors for a student
   */
  private async assessRiskFactors(studentId: string, progress: StudentProgress): Promise<RiskFactor[]> {
    const risks: RiskFactor[] = [];

    // Attendance risk
    if (progress.performanceMetrics.attendanceRate < 0.7) {
      risks.push({
        type: 'attendance',
        severity: progress.performanceMetrics.attendanceRate < 0.5 ? 'critical' : 'high',
        description: `Low attendance rate: ${(progress.performanceMetrics.attendanceRate * 100).toFixed(1)}%`,
        indicators: ['frequent_absences', 'irregular_attendance_pattern'],
        recommendedActions: ['schedule_counseling', 'flexible_scheduling', 'parent_meeting']
      });
    }

    // Performance risk
    if (progress.performanceMetrics.averageScore < 60) {
      risks.push({
        type: 'performance',
        severity: progress.performanceMetrics.averageScore < 40 ? 'critical' : 'high',
        description: `Low average score: ${progress.performanceMetrics.averageScore.toFixed(1)}`,
        indicators: ['low_test_scores', 'incomplete_assignments'],
        recommendedActions: ['additional_tutoring', 'review_learning_materials', 'assessment_adjustment']
      });
    }

    // Engagement risk
    if (progress.performanceMetrics.engagementLevel < 5) {
      risks.push({
        type: 'engagement',
        severity: progress.performanceMetrics.engagementLevel < 3 ? 'high' : 'medium',
        description: `Low engagement level: ${progress.performanceMetrics.engagementLevel}/10`,
        indicators: ['low_participation', 'minimal_interaction', 'disinterest_signs'],
        recommendedActions: ['gamification', 'personalized_content', 'mentor_assignment']
      });
    }

    // Completion risk
    if (progress.performanceMetrics.assignmentCompletionRate < 0.8) {
      risks.push({
        type: 'completion',
        severity: progress.performanceMetrics.assignmentCompletionRate < 0.6 ? 'high' : 'medium',
        description: `Low assignment completion rate: ${(progress.performanceMetrics.assignmentCompletionRate * 100).toFixed(1)}%`,
        indicators: ['missed_deadlines', 'incomplete_submissions'],
        recommendedActions: ['deadline_extensions', 'task_breakdown', 'regular_check_ins']
      });
    }

    return risks;
  }

  /**
   * Generate recommendations based on progress and risk factors
   */
  private async generateRecommendations(
    studentId: string, 
    progress: StudentProgress,
    risks: RiskFactor[]
  ): Promise<ProgressRecommendation[]> {
    const recommendations: ProgressRecommendation[] = [];

    // Address high-priority risks first
    const criticalRisks = risks.filter(r => r.severity === 'critical');
    const highRisks = risks.filter(r => r.severity === 'high');

    // Critical interventions
    if (criticalRisks.length > 0) {
      recommendations.push({
        type: 'intervention',
        priority: 'high',
        description: 'Immediate intervention required due to critical risk factors',
        expectedImpact: 0.8,
        implementationComplexity: 'high',
        actions: [
          {
            action: 'schedule_emergency_meeting',
            assignedTo: 'academic_advisor',
            deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            parameters: { studentId, riskFactors: criticalRisks.map(r => r.type) }
          }
        ]
      });
    }

    // Content adjustments
    if (progress.performanceMetrics.averageScore < 70) {
      recommendations.push({
        type: 'content_adjustment',
        priority: 'medium',
        description: 'Adjust learning content difficulty and pacing',
        expectedImpact: 0.6,
        implementationComplexity: 'medium',
        actions: [
          {
            action: 'review_learning_path',
            assignedTo: 'content_specialist',
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            parameters: { studentId, currentScore: progress.performanceMetrics.averageScore }
          }
        ]
      });
    }

    // Schedule optimizations
    if (progress.performanceMetrics.attendanceRate < 0.8) {
      recommendations.push({
        type: 'schedule_change',
        priority: 'medium',
        description: 'Optimize class schedule based on attendance patterns',
        expectedImpact: 0.5,
        implementationComplexity: 'low',
        actions: [
          {
            action: 'analyze_attendance_patterns',
            assignedTo: 'scheduling_system',
            deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            parameters: { studentId, attendanceRate: progress.performanceMetrics.attendanceRate }
          }
        ]
      });
    }

    // Support recommendations
    if (progress.performanceMetrics.engagementLevel < 6) {
      recommendations.push({
        type: 'support',
        priority: 'medium',
        description: 'Provide additional learning support and motivation',
        expectedImpact: 0.4,
        implementationComplexity: 'low',
        actions: [
          {
            action: 'assign_peer_mentor',
            assignedTo: 'student_support',
            deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
            parameters: { studentId, engagementLevel: progress.performanceMetrics.engagementLevel }
          }
        ]
      });
    }

    return recommendations;
  }

  /**
   * Get cohort analysis for a group of students
   */
  public async getCohortAnalysis(cohortId: string): Promise<StudentCohortAnalysis> {
    // Get all students in the cohort
    const { data: students, error } = await supabase
      .from('students')
      .select('id, progress_percentage, attendance_rate')
      .eq('cohort_id', cohortId)
      .eq('status', 'Active');

    if (error) {
      throw new Error(`Failed to fetch cohort students: ${error.message}`);
    }

    if (!students || students.length === 0) {
      throw new Error('No students found in cohort');
    }

    // Calculate cohort metrics
    const totalStudents = students.length;
    const averageProgress = students.reduce((sum, s) => sum + (s.progress_percentage || 0), 0) / totalStudents;
    const averageAttendance = students.reduce((sum, s) => sum + (s.attendance_rate || 0), 0) / totalStudents;

    // Progress distribution
    const progressDistribution = this.calculateProgressDistribution(students);

    // Calculate risk students
    const riskStudents = students.filter(s => 
      (s.progress_percentage || 0) < 50 || (s.attendance_rate || 0) < 70
    ).length;

    // Calculate cohort trends
    const cohortTrends = await this.calculateCohortTrends(cohortId);

    // Generate common challenges
    const commonChallenges = await this.identifyCommonChallenges(cohortId);

    // Generate cohort recommendations
    const recommendations = await this.generateCohortRecommendations(cohortId, {
      averageProgress,
      averageAttendance,
      riskStudents,
      totalStudents
    });

    return {
      cohortId,
      totalStudents,
      averageProgress,
      progressDistribution,
      performanceMetrics: {
        averageAttendance,
        averageEngagement: 7, // Would be calculated from engagement data
        completionRate: 0.85, // Would be calculated from completion data
        riskStudents
      },
      trends: cohortTrends,
      commonChallenges,
      recommendations
    };
  }

  /**
   * Calculate progress distribution for a cohort
   */
  private calculateProgressDistribution(students: any[]): { range: string; count: number }[] {
    const ranges = [
      { range: '0-25%', min: 0, max: 25 },
      { range: '26-50%', min: 26, max: 50 },
      { range: '51-75%', min: 51, max: 75 },
      { range: '76-100%', min: 76, max: 100 }
    ];

    return ranges.map(range => ({
      range: range.range,
      count: students.filter(s => {
        const progress = s.progress_percentage || 0;
        return progress >= range.min && progress <= range.max;
      }).length
    }));
  }

  /**
   * Calculate cohort trends
   */
  private async calculateCohortTrends(cohortId: string): Promise<ProgressTrend[]> {
    // This would calculate aggregate trends for the entire cohort
    // For now, return empty array as placeholder
    return [];
  }

  /**
   * Identify common challenges in a cohort
   */
  private async identifyCommonChallenges(cohortId: string): Promise<string[]> {
    // This would analyze common issues across the cohort
    // For now, return placeholder challenges
    return [
      'Low attendance in morning classes',
      'Difficulty with grammar concepts',
      'Inconsistent assignment completion'
    ];
  }

  /**
   * Generate cohort-level recommendations
   */
  private async generateCohortRecommendations(
    cohortId: string, 
    metrics: any
  ): Promise<ProgressRecommendation[]> {
    const recommendations: ProgressRecommendation[] = [];

    // Low progress recommendation
    if (metrics.averageProgress < 60) {
      recommendations.push({
        type: 'content_adjustment',
        priority: 'high',
        description: 'Cohort showing below-average progress - consider curriculum review',
        expectedImpact: 0.7,
        implementationComplexity: 'high',
        actions: [
          {
            action: 'curriculum_review',
            assignedTo: 'academic_team',
            deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            parameters: { cohortId, averageProgress: metrics.averageProgress }
          }
        ]
      });
    }

    // High risk students recommendation
    if (metrics.riskStudents > metrics.totalStudents * 0.3) {
      recommendations.push({
        type: 'intervention',
        priority: 'high',
        description: 'High number of at-risk students - implement cohort-wide support',
        expectedImpact: 0.8,
        implementationComplexity: 'medium',
        actions: [
          {
            action: 'implement_support_program',
            assignedTo: 'student_support',
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            parameters: { cohortId, riskStudentCount: metrics.riskStudents }
          }
        ]
      });
    }

    return recommendations;
  }

  /**
   * Clear cache for a specific student
   */
  public clearStudentCache(studentId: string): void {
    const cacheKey = `student-progress-${studentId}`;
    this.cache.delete(cacheKey);
  }

  /**
   * Clear all cached data
   */
  public clearAllCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const studentProgressAnalytics = new StudentProgressAnalytics();