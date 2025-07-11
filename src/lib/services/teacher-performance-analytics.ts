import { logger } from '@/lib/services';
/**
 * HeyPeter Academy - Teacher Performance Analytics Service
 * 
 * This service provides comprehensive teacher performance analysis and metrics
 * calculation for the daily update system. It includes:
 * - Teaching effectiveness metrics
 * - Student satisfaction analysis
 * - Class management performance
 * - Availability and punctuality tracking
 * - Professional development recommendations
 * - Compensation optimization insights
 */

import { supabase } from '@/lib/supabase';
import { teacherPerformanceDbService } from './teacher-performance-db-service';
import {
  TeacherPerformanceMetrics,
  TeacherPeerComparison,
  TeacherCohortAnalysis,
  TeacherPerformanceFilters,
  TeacherPerformanceSort,
  TeacherPerformanceSearchResult,
  TeacherPerformanceDashboard,
  TeacherIndividualDashboard,
  TeacherPerformanceReport,
  PerformanceTrend,
  TeacherRecommendation,
  RecommendationAction,
  RecommendationResource
} from '@/types/teacher-performance';

export interface TeacherPerformanceMetrics {
  teacherId: string;
  teacherName: string;
  overallRating: number;
  metrics: {
    teachingEffectiveness: TeachingEffectivenessMetrics;
    studentSatisfaction: StudentSatisfactionMetrics;
    classManagement: ClassManagementMetrics;
    availability: AvailabilityMetrics;
    professionalDevelopment: ProfessionalDevelopmentMetrics;
  };
  trends: PerformanceTrend[];
  recommendations: TeacherRecommendation[];
  lastUpdated: string;
}

export interface TeachingEffectivenessMetrics {
  studentProgressRate: number;
  lessonCompletionRate: number;
  averageStudentScore: number;
  learningObjectiveAchievement: number;
  adaptabilityScore: number;
  innovationScore: number;
}

export interface StudentSatisfactionMetrics {
  averageRating: number;
  satisfactionTrend: 'improving' | 'stable' | 'declining';
  feedbackCount: number;
  recommendationRate: number;
  retentionRate: number;
  engagementScore: number;
}

export interface ClassManagementMetrics {
  punctualityRate: number;
  attendanceRate: number;
  classPreparationScore: number;
  timeManagementScore: number;
  disciplineEffectiveness: number;
  resourceUtilization: number;
}

export interface AvailabilityMetrics {
  schedulingFlexibility: number;
  cancellationRate: number;
  substituteRequestRate: number;
  peakHourAvailability: number;
  consistencyScore: number;
  responseTime: number; // in hours
}

export interface ProfessionalDevelopmentMetrics {
  trainingCompletionRate: number;
  skillImprovementRate: number;
  certificationStatus: string;
  mentorshipParticipation: number;
  innovationContributions: number;
  leadershipActivities: number;
}

export interface PerformanceTrend {
  metric: string;
  period: string;
  trend: 'improving' | 'stable' | 'declining';
  changeRate: number;
  significance: 'high' | 'medium' | 'low';
  dataPoints: { date: string; value: number }[];
}

export interface TeacherRecommendation {
  type: 'training' | 'schedule_optimization' | 'support' | 'recognition' | 'improvement_plan';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  expectedImpact: number;
  implementationTimeframe: string;
  actions: RecommendationAction[];
  resources: RecommendationResource[];
}

export interface RecommendationAction {
  action: string;
  assignedTo: string;
  deadline: string;
  parameters: Record<string, any>;
  estimatedEffort: number; // in hours
}

export interface RecommendationResource {
  type: 'training_material' | 'documentation' | 'tool' | 'mentor';
  name: string;
  url?: string;
  description: string;
  estimatedTime: number; // in hours
}

export interface TeacherComparisonAnalysis {
  teacherId: string;
  peerGroupAverage: number;
  rankingPercentile: number;
  strengthAreas: string[];
  improvementAreas: string[];
  competitiveAdvantages: string[];
  developmentNeeds: string[];
}

export interface TeacherCohortAnalysis {
  cohortId: string;
  totalTeachers: number;
  averageRating: number;
  performanceDistribution: { range: string; count: number }[];
  topPerformers: { teacherId: string; rating: number }[];
  needsAttention: { teacherId: string; issues: string[] }[];
  commonStrengths: string[];
  commonChallenges: string[];
  recommendations: TeacherRecommendation[];
}

export class TeacherPerformanceAnalytics {
  private cache: Map<string, TeacherPerformanceMetrics> = new Map();
  private cacheTimeout: number = 60 * 60 * 1000; // 1 hour

  /**
   * Get comprehensive performance metrics for a teacher
   */
  public async getTeacherPerformanceMetrics(teacherId: string, forceRefresh: boolean = false): Promise<TeacherPerformanceMetrics> {
    const cacheKey = `teacher-performance-${teacherId}`;
    
    if (!forceRefresh && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      const age = Date.now() - new Date(cached.lastUpdated).getTime();
      
      if (age < this.cacheTimeout) {
        return cached;
      }
    }

    const metrics = await this.calculateTeacherPerformanceMetrics(teacherId);
    this.cache.set(cacheKey, metrics);
    
    return metrics;
  }

  /**
   * Calculate comprehensive teacher performance metrics
   */
  private async calculateTeacherPerformanceMetrics(teacherId: string): Promise<TeacherPerformanceMetrics> {
    // Get teacher basic information
    const { data: teacher, error: teacherError } = await supabase
      .from('teachers')
      .select(`
        id,
        user_id,
        users!inner(full_name, email),
        specializations,
        experience_years,
        created_at
      `)
      .eq('id', teacherId)
      .single();

    if (teacherError || !teacher) {
      throw new Error(`Failed to fetch teacher: ${teacherError?.message}`);
    }

    // Calculate individual metric categories
    const teachingEffectiveness = await this.calculateTeachingEffectiveness(teacherId);
    const studentSatisfaction = await this.calculateStudentSatisfaction(teacherId);
    const classManagement = await this.calculateClassManagement(teacherId);
    const availability = await this.calculateAvailability(teacherId);
    const professionalDevelopment = await this.calculateProfessionalDevelopment(teacherId);

    // Calculate overall rating
    const overallRating = this.calculateOverallRating({
      teachingEffectiveness,
      studentSatisfaction,
      classManagement,
      availability,
      professionalDevelopment
    });

    // Calculate trends
    const trends = await this.calculatePerformanceTrends(teacherId);

    // Generate recommendations
    const recommendations = await this.generateTeacherRecommendations(teacherId, {
      teachingEffectiveness,
      studentSatisfaction,
      classManagement,
      availability,
      professionalDevelopment
    });

    return {
      teacherId,
      teacherName: teacher.users.full_name,
      overallRating,
      metrics: {
        teachingEffectiveness,
        studentSatisfaction,
        classManagement,
        availability,
        professionalDevelopment
      },
      trends,
      recommendations,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Calculate teaching effectiveness metrics
   */
  private async calculateTeachingEffectiveness(teacherId: string): Promise<TeachingEffectivenessMetrics> {
    // Get classes taught by this teacher
    const { data: classes, error: classError } = await supabase
      .from('classes')
      .select(`
        id,
        student_ids,
        lesson_content,
        status,
        created_at,
        updated_at
      `)
      .eq('teacher_id', teacherId)
      .eq('status', 'completed')
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

    if (classError) {
      throw new Error(`Failed to fetch classes: ${classError.message}`);
    }

    if (!classes || classes.length === 0) {
      return {
        studentProgressRate: 0,
        lessonCompletionRate: 0,
        averageStudentScore: 0,
        learningObjectiveAchievement: 0,
        adaptabilityScore: 0,
        innovationScore: 0
      };
    }

    // Calculate student progress rate
    const studentProgressRate = await this.calculateStudentProgressRate(teacherId, classes);

    // Calculate lesson completion rate
    const lessonCompletionRate = await this.calculateLessonCompletionRate(classes);

    // Calculate average student score
    const averageStudentScore = await this.calculateAverageStudentScore(teacherId, classes);

    // Calculate learning objective achievement
    const learningObjectiveAchievement = await this.calculateLearningObjectiveAchievement(classes);

    // Calculate adaptability score (based on teaching different levels/types)
    const adaptabilityScore = await this.calculateAdaptabilityScore(teacherId, classes);

    // Calculate innovation score (based on teaching methods and feedback)
    const innovationScore = await this.calculateInnovationScore(teacherId);

    return {
      studentProgressRate,
      lessonCompletionRate,
      averageStudentScore,
      learningObjectiveAchievement,
      adaptabilityScore,
      innovationScore
    };
  }

  /**
   * Calculate student satisfaction metrics
   */
  private async calculateStudentSatisfaction(teacherId: string): Promise<StudentSatisfactionMetrics> {
    // Get feedback data
    const { data: feedback, error: feedbackError } = await supabase
      .from('teacher_feedback')
      .select('rating, comments, created_at')
      .eq('teacher_id', teacherId)
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

    if (feedbackError) {
      throw new Error(`Failed to fetch feedback: ${feedbackError.message}`);
    }

    // Calculate average rating
    const averageRating = feedback && feedback.length > 0
      ? feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length
      : 0;

    // Calculate satisfaction trend
    const satisfactionTrend = await this.calculateSatisfactionTrend(teacherId);

    // Get retention rate
    const retentionRate = await this.calculateStudentRetentionRate(teacherId);

    // Get engagement score
    const engagementScore = await this.calculateEngagementScore(teacherId);

    return {
      averageRating,
      satisfactionTrend,
      feedbackCount: feedback?.length || 0,
      recommendationRate: 0.85, // Would be calculated from survey data
      retentionRate,
      engagementScore
    };
  }

  /**
   * Calculate class management metrics
   */
  private async calculateClassManagement(teacherId: string): Promise<ClassManagementMetrics> {
    // Get class sessions data
    const { data: sessions, error: sessionError } = await supabase
      .from('class_sessions')
      .select(`
        id,
        scheduled_start,
        actual_start,
        actual_end,
        attendance_rate,
        preparation_score,
        created_at
      `)
      .eq('teacher_id', teacherId)
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

    if (sessionError) {
      throw new Error(`Failed to fetch sessions: ${sessionError.message}`);
    }

    if (!sessions || sessions.length === 0) {
      return {
        punctualityRate: 0,
        attendanceRate: 0,
        classPreparationScore: 0,
        timeManagementScore: 0,
        disciplineEffectiveness: 0,
        resourceUtilization: 0
      };
    }

    // Calculate punctuality rate
    const punctualityRate = sessions.filter(s => {
      const scheduled = new Date(s.scheduled_start);
      const actual = new Date(s.actual_start);
      return actual.getTime() <= scheduled.getTime() + 5 * 60 * 1000; // 5 minutes grace period
    }).length / sessions.length;

    // Calculate average attendance rate
    const attendanceRate = sessions.reduce((sum, s) => sum + (s.attendance_rate || 0), 0) / sessions.length;

    // Calculate preparation score
    const classPreparationScore = sessions.reduce((sum, s) => sum + (s.preparation_score || 0), 0) / sessions.length;

    // Calculate time management score
    const timeManagementScore = await this.calculateTimeManagementScore(sessions);

    // Calculate discipline effectiveness (placeholder)
    const disciplineEffectiveness = 0.85; // Would be calculated from discipline incident data

    // Calculate resource utilization (placeholder)
    const resourceUtilization = 0.80; // Would be calculated from resource usage data

    return {
      punctualityRate,
      attendanceRate,
      classPreparationScore,
      timeManagementScore,
      disciplineEffectiveness,
      resourceUtilization
    };
  }

  /**
   * Calculate availability metrics
   */
  private async calculateAvailability(teacherId: string): Promise<AvailabilityMetrics> {
    // Get availability data
    const { data: availability, error: availabilityError } = await supabase
      .from('teacher_availability')
      .select('*')
      .eq('teacher_id', teacherId)
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

    if (availabilityError) {
      throw new Error(`Failed to fetch availability: ${availabilityError.message}`);
    }

    // Get cancellation data
    const { data: cancellations, error: cancellationError } = await supabase
      .from('class_cancellations')
      .select('*')
      .eq('teacher_id', teacherId)
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

    if (cancellationError) {
      throw new Error(`Failed to fetch cancellations: ${cancellationError.message}`);
    }

    // Get total scheduled classes
    const { data: scheduledClasses, error: scheduledError } = await supabase
      .from('classes')
      .select('id')
      .eq('teacher_id', teacherId)
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

    if (scheduledError) {
      throw new Error(`Failed to fetch scheduled classes: ${scheduledError.message}`);
    }

    const totalScheduled = scheduledClasses?.length || 0;
    const totalCancellations = cancellations?.length || 0;

    // Calculate cancellation rate
    const cancellationRate = totalScheduled > 0 ? totalCancellations / totalScheduled : 0;

    // Calculate other metrics
    const schedulingFlexibility = await this.calculateSchedulingFlexibility(teacherId);
    const peakHourAvailability = await this.calculatePeakHourAvailability(teacherId);
    const consistencyScore = await this.calculateConsistencyScore(teacherId);
    const responseTime = await this.calculateResponseTime(teacherId);

    return {
      schedulingFlexibility,
      cancellationRate,
      substituteRequestRate: 0.05, // Would be calculated from substitute data
      peakHourAvailability,
      consistencyScore,
      responseTime
    };
  }

  /**
   * Calculate professional development metrics
   */
  private async calculateProfessionalDevelopment(teacherId: string): Promise<ProfessionalDevelopmentMetrics> {
    // Get training data
    const { data: trainings, error: trainingError } = await supabase
      .from('teacher_training')
      .select('*')
      .eq('teacher_id', teacherId)
      .gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());

    if (trainingError) {
      throw new Error(`Failed to fetch training data: ${trainingError.message}`);
    }

    // Get certification data
    const { data: certifications, error: certificationError } = await supabase
      .from('teacher_certifications')
      .select('*')
      .eq('teacher_id', teacherId)
      .eq('status', 'active');

    if (certificationError) {
      throw new Error(`Failed to fetch certifications: ${certificationError.message}`);
    }

    // Calculate training completion rate
    const requiredTrainings = trainings?.filter(t => t.required) || [];
    const completedTrainings = requiredTrainings.filter(t => t.status === 'completed');
    const trainingCompletionRate = requiredTrainings.length > 0 
      ? completedTrainings.length / requiredTrainings.length 
      : 0;

    // Calculate skill improvement rate
    const skillImprovementRate = await this.calculateSkillImprovementRate(teacherId);

    // Get certification status
    const certificationStatus = certifications && certifications.length > 0 
      ? 'certified' 
      : 'needs_certification';

    return {
      trainingCompletionRate,
      skillImprovementRate,
      certificationStatus,
      mentorshipParticipation: 0.7, // Would be calculated from mentorship data
      innovationContributions: 0.6, // Would be calculated from innovation submissions
      leadershipActivities: 0.5 // Would be calculated from leadership participation
    };
  }

  /**
   * Calculate overall rating from all metrics
   */
  private calculateOverallRating(metrics: {
    teachingEffectiveness: TeachingEffectivenessMetrics;
    studentSatisfaction: StudentSatisfactionMetrics;
    classManagement: ClassManagementMetrics;
    availability: AvailabilityMetrics;
    professionalDevelopment: ProfessionalDevelopmentMetrics;
  }): number {
    // Weight different categories
    const weights = {
      teachingEffectiveness: 0.30,
      studentSatisfaction: 0.25,
      classManagement: 0.20,
      availability: 0.15,
      professionalDevelopment: 0.10
    };

    // Calculate weighted scores
    const teachingScore = (
      metrics.teachingEffectiveness.studentProgressRate * 0.3 +
      metrics.teachingEffectiveness.averageStudentScore * 0.25 +
      metrics.teachingEffectiveness.lessonCompletionRate * 0.2 +
      metrics.teachingEffectiveness.learningObjectiveAchievement * 0.15 +
      metrics.teachingEffectiveness.adaptabilityScore * 0.05 +
      metrics.teachingEffectiveness.innovationScore * 0.05
    ) / 100;

    const satisfactionScore = (
      metrics.studentSatisfaction.averageRating * 0.4 +
      metrics.studentSatisfaction.retentionRate * 0.3 +
      metrics.studentSatisfaction.engagementScore * 0.3
    ) / 100;

    const managementScore = (
      metrics.classManagement.punctualityRate * 0.25 +
      metrics.classManagement.attendanceRate * 0.25 +
      metrics.classManagement.classPreparationScore * 0.2 +
      metrics.classManagement.timeManagementScore * 0.15 +
      metrics.classManagement.disciplineEffectiveness * 0.1 +
      metrics.classManagement.resourceUtilization * 0.05
    ) / 100;

    const availabilityScore = (
      metrics.availability.schedulingFlexibility * 0.3 +
      (1 - metrics.availability.cancellationRate) * 0.25 +
      metrics.availability.peakHourAvailability * 0.2 +
      metrics.availability.consistencyScore * 0.15 +
      (1 - metrics.availability.responseTime / 24) * 0.1 // Normalize response time
    ) / 100;

    const developmentScore = (
      metrics.professionalDevelopment.trainingCompletionRate * 0.3 +
      metrics.professionalDevelopment.skillImprovementRate * 0.25 +
      (metrics.professionalDevelopment.certificationStatus === 'certified' ? 100 : 50) * 0.2 +
      metrics.professionalDevelopment.mentorshipParticipation * 0.15 +
      metrics.professionalDevelopment.innovationContributions * 0.05 +
      metrics.professionalDevelopment.leadershipActivities * 0.05
    ) / 100;

    // Calculate weighted overall rating
    const overallRating = (
      teachingScore * weights.teachingEffectiveness +
      satisfactionScore * weights.studentSatisfaction +
      managementScore * weights.classManagement +
      availabilityScore * weights.availability +
      developmentScore * weights.professionalDevelopment
    ) * 100;

    return Math.round(overallRating * 10) / 10; // Round to 1 decimal place
  }

  /**
   * Calculate performance trends
   */
  private async calculatePerformanceTrends(teacherId: string): Promise<PerformanceTrend[]> {
    const trends: PerformanceTrend[] = [];

    // Get historical performance data
    const { data: historicalData, error } = await supabase
      .from('teacher_performance_history')
      .select('*')
      .eq('teacher_id', teacherId)
      .gte('recorded_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
      .order('recorded_at', { ascending: true });

    if (error) {
      logger.error('Failed to fetch historical data:', error);
      return trends;
    }

    if (!historicalData || historicalData.length < 3) {
      return trends;
    }

    // Calculate trends for key metrics
    const metricTrends = [
      { key: 'overall_rating', name: 'Overall Rating' },
      { key: 'student_satisfaction', name: 'Student Satisfaction' },
      { key: 'teaching_effectiveness', name: 'Teaching Effectiveness' },
      { key: 'class_management', name: 'Class Management' }
    ];

    for (const metric of metricTrends) {
      const dataPoints = historicalData.map(d => ({
        date: d.recorded_at,
        value: d[metric.key] || 0
      }));

      const trend = this.calculateTrendDirection(dataPoints);
      const changeRate = this.calculateChangeRate(dataPoints);

      trends.push({
        metric: metric.name,
        period: '12_months',
        trend,
        changeRate,
        significance: Math.abs(changeRate) > 10 ? 'high' : Math.abs(changeRate) > 5 ? 'medium' : 'low',
        dataPoints
      });
    }

    return trends;
  }

  /**
   * Generate teacher recommendations
   */
  private async generateTeacherRecommendations(
    teacherId: string,
    metrics: {
      teachingEffectiveness: TeachingEffectivenessMetrics;
      studentSatisfaction: StudentSatisfactionMetrics;
      classManagement: ClassManagementMetrics;
      availability: AvailabilityMetrics;
      professionalDevelopment: ProfessionalDevelopmentMetrics;
    }
  ): Promise<TeacherRecommendation[]> {
    const recommendations: TeacherRecommendation[] = [];

    // Teaching effectiveness recommendations
    if (metrics.teachingEffectiveness.studentProgressRate < 0.7) {
      recommendations.push({
        type: 'training',
        priority: 'high',
        title: 'Improve Teaching Effectiveness',
        description: 'Student progress rate is below average. Consider pedagogical training.',
        expectedImpact: 0.8,
        implementationTimeframe: '3-6 months',
        actions: [
          {
            action: 'enroll_in_pedagogy_course',
            assignedTo: 'teacher_development',
            deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            parameters: { teacherId, currentRate: metrics.teachingEffectiveness.studentProgressRate },
            estimatedEffort: 20
          }
        ],
        resources: [
          {
            type: 'training_material',
            name: 'Effective Teaching Strategies',
            url: '/training/effective-teaching',
            description: 'Comprehensive guide to improving student outcomes',
            estimatedTime: 10
          }
        ]
      });
    }

    // Student satisfaction recommendations
    if (metrics.studentSatisfaction.averageRating < 4.0) {
      recommendations.push({
        type: 'support',
        priority: 'high',
        title: 'Improve Student Satisfaction',
        description: 'Student ratings are below target. Focus on engagement and communication.',
        expectedImpact: 0.7,
        implementationTimeframe: '1-3 months',
        actions: [
          {
            action: 'attend_communication_workshop',
            assignedTo: 'teacher_development',
            deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
            parameters: { teacherId, currentRating: metrics.studentSatisfaction.averageRating },
            estimatedEffort: 8
          }
        ],
        resources: [
          {
            type: 'mentor',
            name: 'Senior Teacher Mentor',
            description: 'Pairing with experienced teacher for guidance',
            estimatedTime: 15
          }
        ]
      });
    }

    // Class management recommendations
    if (metrics.classManagement.punctualityRate < 0.9) {
      recommendations.push({
        type: 'improvement_plan',
        priority: 'medium',
        title: 'Improve Punctuality',
        description: 'Punctuality rate needs improvement for better class management.',
        expectedImpact: 0.5,
        implementationTimeframe: '1 month',
        actions: [
          {
            action: 'implement_time_management_system',
            assignedTo: 'teacher',
            deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            parameters: { teacherId, currentRate: metrics.classManagement.punctualityRate },
            estimatedEffort: 2
          }
        ],
        resources: [
          {
            type: 'tool',
            name: 'Time Management App',
            description: 'Digital tool to help with scheduling and reminders',
            estimatedTime: 1
          }
        ]
      });
    }

    // Professional development recommendations
    if (metrics.professionalDevelopment.trainingCompletionRate < 0.8) {
      recommendations.push({
        type: 'training',
        priority: 'medium',
        title: 'Complete Required Training',
        description: 'Several required training modules remain incomplete.',
        expectedImpact: 0.4,
        implementationTimeframe: '2-3 months',
        actions: [
          {
            action: 'schedule_training_sessions',
            assignedTo: 'teacher_development',
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            parameters: { teacherId, completionRate: metrics.professionalDevelopment.trainingCompletionRate },
            estimatedEffort: 15
          }
        ],
        resources: [
          {
            type: 'training_material',
            name: 'Required Training Modules',
            url: '/training/required-modules',
            description: 'Complete remaining required training',
            estimatedTime: 12
          }
        ]
      });
    }

    // Recognition recommendations for high performers
    const overallRating = this.calculateOverallRating(metrics);
    if (overallRating > 85) {
      recommendations.push({
        type: 'recognition',
        priority: 'low',
        title: 'Teacher Excellence Recognition',
        description: 'Outstanding performance deserves recognition and potential leadership opportunities.',
        expectedImpact: 0.3,
        implementationTimeframe: '1 month',
        actions: [
          {
            action: 'nominate_for_excellence_award',
            assignedTo: 'administration',
            deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            parameters: { teacherId, overallRating },
            estimatedEffort: 1
          }
        ],
        resources: [
          {
            type: 'documentation',
            name: 'Leadership Development Program',
            description: 'Opportunities for career advancement',
            estimatedTime: 5
          }
        ]
      });
    }

    return recommendations;
  }

  /**
   * Helper methods for metric calculations
   */
  private async calculateStudentProgressRate(teacherId: string, classes: any[]): Promise<number> {
    // Calculate how much students progress under this teacher
    const studentIds = [...new Set(classes.flatMap(c => c.student_ids || []))];
    
    if (studentIds.length === 0) return 0;

    let totalProgress = 0;
    let studentsWithProgress = 0;

    for (const studentId of studentIds) {
      const { data: progress } = await supabase
        .from('student_progress')
        .select('progress_percentage')
        .eq('student_id', studentId)
        .single();

      if (progress && progress.progress_percentage > 0) {
        totalProgress += progress.progress_percentage;
        studentsWithProgress++;
      }
    }

    return studentsWithProgress > 0 ? totalProgress / studentsWithProgress : 0;
  }

  private async calculateLessonCompletionRate(classes: any[]): Promise<number> {
    // Calculate percentage of lessons completed successfully
    const completedLessons = classes.filter(c => c.status === 'completed').length;
    return classes.length > 0 ? (completedLessons / classes.length) * 100 : 0;
  }

  private async calculateAverageStudentScore(teacherId: string, classes: any[]): Promise<number> {
    // Get average scores from students in this teacher's classes
    const { data: scores } = await supabase
      .from('assessment_scores')
      .select('score')
      .eq('teacher_id', teacherId)
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

    if (!scores || scores.length === 0) return 0;

    const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
    return totalScore / scores.length;
  }

  private async calculateLearningObjectiveAchievement(classes: any[]): Promise<number> {
    // Calculate percentage of learning objectives achieved
    // This would be based on lesson-specific objective tracking
    return 85; // Placeholder
  }

  private async calculateAdaptabilityScore(teacherId: string, classes: any[]): Promise<number> {
    // Calculate adaptability based on teaching different levels/types
    const uniqueLevels = new Set(classes.map(c => c.level || 'default'));
    const uniqueTypes = new Set(classes.map(c => c.type || 'default'));
    
    // Score based on variety of teaching contexts
    const varietyScore = (uniqueLevels.size * 20) + (uniqueTypes.size * 15);
    return Math.min(100, varietyScore);
  }

  private async calculateInnovationScore(teacherId: string): Promise<number> {
    // Calculate innovation based on new teaching methods, tools, feedback
    const { data: innovations } = await supabase
      .from('teacher_innovations')
      .select('id')
      .eq('teacher_id', teacherId)
      .gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());

    return Math.min(100, (innovations?.length || 0) * 25);
  }

  private async calculateSatisfactionTrend(teacherId: string): Promise<'improving' | 'stable' | 'declining'> {
    // Get recent satisfaction ratings
    const { data: ratings } = await supabase
      .from('teacher_feedback')
      .select('rating, created_at')
      .eq('teacher_id', teacherId)
      .gte('created_at', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: true });

    if (!ratings || ratings.length < 3) return 'stable';

    // Compare first half vs second half
    const midPoint = Math.floor(ratings.length / 2);
    const firstHalf = ratings.slice(0, midPoint);
    const secondHalf = ratings.slice(midPoint);

    const firstAvg = firstHalf.reduce((sum, r) => sum + r.rating, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, r) => sum + r.rating, 0) / secondHalf.length;

    const difference = secondAvg - firstAvg;
    
    if (difference > 0.3) return 'improving';
    if (difference < -0.3) return 'declining';
    return 'stable';
  }

  private async calculateStudentRetentionRate(teacherId: string): Promise<number> {
    // Calculate how many students continue with this teacher
    const { data: enrollments } = await supabase
      .from('teacher_student_assignments')
      .select('student_id, start_date, end_date')
      .eq('teacher_id', teacherId)
      .gte('start_date', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString());

    if (!enrollments || enrollments.length === 0) return 0;

    const retainedStudents = enrollments.filter(e => !e.end_date || 
      new Date(e.end_date).getTime() > Date.now()).length;

    return (retainedStudents / enrollments.length) * 100;
  }

  private async calculateEngagementScore(teacherId: string): Promise<number> {
    // Calculate engagement based on student participation, interaction
    const { data: engagement } = await supabase
      .from('class_engagement_metrics')
      .select('engagement_score')
      .eq('teacher_id', teacherId)
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

    if (!engagement || engagement.length === 0) return 0;

    const totalScore = engagement.reduce((sum, e) => sum + e.engagement_score, 0);
    return totalScore / engagement.length;
  }

  private async calculateTimeManagementScore(sessions: any[]): Promise<number> {
    // Calculate time management based on session duration vs planned
    const onTimeEndingSessions = sessions.filter(s => {
      if (!s.actual_end || !s.scheduled_end) return false;
      
      const scheduled = new Date(s.scheduled_end);
      const actual = new Date(s.actual_end);
      const difference = Math.abs(actual.getTime() - scheduled.getTime());
      
      return difference <= 10 * 60 * 1000; // 10 minutes tolerance
    });

    return sessions.length > 0 ? (onTimeEndingSessions.length / sessions.length) * 100 : 0;
  }

  private async calculateSchedulingFlexibility(teacherId: string): Promise<number> {
    // Calculate flexibility based on available time slots
    const { data: availability } = await supabase
      .from('teacher_availability')
      .select('available_slots')
      .eq('teacher_id', teacherId)
      .single();

    if (!availability || !availability.available_slots) return 0;

    const totalSlots = 7 * 24; // 7 days * 24 hours
    const availableSlots = availability.available_slots.length;
    
    return (availableSlots / totalSlots) * 100;
  }

  private async calculatePeakHourAvailability(teacherId: string): Promise<number> {
    // Calculate availability during peak hours (typically 4-9 PM)
    const { data: availability } = await supabase
      .from('teacher_availability')
      .select('available_slots')
      .eq('teacher_id', teacherId)
      .single();

    if (!availability || !availability.available_slots) return 0;

    const peakHours = [16, 17, 18, 19, 20]; // 4 PM to 8 PM
    const peakSlots = availability.available_slots.filter((slot: any) => {
      const hour = new Date(slot.start_time).getHours();
      return peakHours.includes(hour);
    });

    const totalPeakSlots = peakHours.length * 7; // 5 hours * 7 days
    return (peakSlots.length / totalPeakSlots) * 100;
  }

  private async calculateConsistencyScore(teacherId: string): Promise<number> {
    // Calculate consistency in availability patterns
    const { data: availabilityHistory } = await supabase
      .from('teacher_availability_history')
      .select('available_slots, created_at')
      .eq('teacher_id', teacherId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: true });

    if (!availabilityHistory || availabilityHistory.length < 2) return 100;

    // Calculate consistency based on variation in availability
    const consistencyScore = 85; // Placeholder calculation
    return consistencyScore;
  }

  private async calculateResponseTime(teacherId: string): Promise<number> {
    // Calculate average response time to messages/requests
    const { data: communications } = await supabase
      .from('teacher_communications')
      .select('sent_at, responded_at')
      .eq('teacher_id', teacherId)
      .not('responded_at', 'is', null)
      .gte('sent_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (!communications || communications.length === 0) return 24; // Default 24 hours

    const responseTimes = communications.map(c => {
      const sent = new Date(c.sent_at);
      const responded = new Date(c.responded_at);
      return (responded.getTime() - sent.getTime()) / (60 * 60 * 1000); // Convert to hours
    });

    return responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
  }

  private async calculateSkillImprovementRate(teacherId: string): Promise<number> {
    // Calculate improvement in teaching skills over time
    const { data: skillAssessments } = await supabase
      .from('teacher_skill_assessments')
      .select('skill_scores, assessment_date')
      .eq('teacher_id', teacherId)
      .gte('assessment_date', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
      .order('assessment_date', { ascending: true });

    if (!skillAssessments || skillAssessments.length < 2) return 0;

    // Calculate improvement rate
    const firstAssessment = skillAssessments[0];
    const lastAssessment = skillAssessments[skillAssessments.length - 1];

    const firstScore = Object.values(firstAssessment.skill_scores).reduce((sum: number, score: any) => sum + score, 0);
    const lastScore = Object.values(lastAssessment.skill_scores).reduce((sum: number, score: any) => sum + score, 0);

    return firstScore > 0 ? ((lastScore - firstScore) / firstScore) * 100 : 0;
  }

  /**
   * Utility methods
   */
  private calculateTrendDirection(dataPoints: { date: string; value: number }[]): 'improving' | 'stable' | 'declining' {
    if (dataPoints.length < 2) return 'stable';

    const values = dataPoints.map(dp => dp.value);
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.ceil(values.length / 2));

    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

    const change = secondAvg - firstAvg;
    const changeThreshold = firstAvg * 0.05; // 5% change threshold

    if (change > changeThreshold) return 'improving';
    if (change < -changeThreshold) return 'declining';
    return 'stable';
  }

  private calculateChangeRate(dataPoints: { date: string; value: number }[]): number {
    if (dataPoints.length < 2) return 0;

    const firstValue = dataPoints[0].value;
    const lastValue = dataPoints[dataPoints.length - 1].value;

    return firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;
  }

  /**
   * Get teacher comparison analysis
   */
  public async getTeacherComparison(teacherId: string): Promise<TeacherComparisonAnalysis> {
    const teacherMetrics = await this.getTeacherPerformanceMetrics(teacherId);
    
    // Get peer group (teachers with similar experience/specialization)
    const { data: peerGroup } = await supabase
      .from('teacher_performance_metrics')
      .select('overall_rating, teacher_id')
      .neq('teacher_id', teacherId)
      .gte('overall_rating', 0);

    const peerRatings = peerGroup?.map(p => p.overall_rating) || [];
    const peerGroupAverage = peerRatings.length > 0 
      ? peerRatings.reduce((sum, rating) => sum + rating, 0) / peerRatings.length 
      : 0;

    // Calculate ranking percentile
    const higherRated = peerRatings.filter(rating => rating > teacherMetrics.overallRating).length;
    const rankingPercentile = peerRatings.length > 0 
      ? ((peerRatings.length - higherRated) / peerRatings.length) * 100 
      : 50;

    // Analyze strengths and improvement areas
    const { strengthAreas, improvementAreas } = this.analyzePerformanceAreas(teacherMetrics);

    return {
      teacherId,
      peerGroupAverage,
      rankingPercentile,
      strengthAreas,
      improvementAreas,
      competitiveAdvantages: strengthAreas.slice(0, 3),
      developmentNeeds: improvementAreas.slice(0, 3)
    };
  }

  private analyzePerformanceAreas(metrics: TeacherPerformanceMetrics): { 
    strengthAreas: string[], 
    improvementAreas: string[] 
  } {
    const areas = [
      { name: 'Student Progress', score: metrics.metrics.teachingEffectiveness.studentProgressRate },
      { name: 'Student Satisfaction', score: metrics.metrics.studentSatisfaction.averageRating * 20 },
      { name: 'Punctuality', score: metrics.metrics.classManagement.punctualityRate * 100 },
      { name: 'Attendance Management', score: metrics.metrics.classManagement.attendanceRate },
      { name: 'Scheduling Flexibility', score: metrics.metrics.availability.schedulingFlexibility },
      { name: 'Professional Development', score: metrics.metrics.professionalDevelopment.trainingCompletionRate * 100 }
    ];

    const strengthAreas = areas.filter(area => area.score > 80).map(area => area.name);
    const improvementAreas = areas.filter(area => area.score < 60).map(area => area.name);

    return { strengthAreas, improvementAreas };
  }

  /**
   * Get cohort analysis for all teachers
   */
  public async getTeacherCohortAnalysis(): Promise<TeacherCohortAnalysis> {
    // Get all teachers
    const { data: teachers } = await supabase
      .from('teachers')
      .select('id, users!inner(full_name)');

    if (!teachers || teachers.length === 0) {
      throw new Error('No teachers found');
    }

    // Get performance metrics for all teachers
    const teacherMetrics = await Promise.all(
      teachers.map(async (teacher) => {
        try {
          const metrics = await this.getTeacherPerformanceMetrics(teacher.id);
          return { teacherId: teacher.id, name: teacher.users.full_name, metrics };
        } catch (error) {
          logger.error(`Error getting metrics for teacher ${teacher.id}:`, error);
          return null;
        }
      })
    );

    const validMetrics = teacherMetrics.filter(m => m !== null);
    
    if (validMetrics.length === 0) {
      throw new Error('No valid teacher metrics found');
    }

    // Calculate cohort statistics
    const totalTeachers = validMetrics.length;
    const averageRating = validMetrics.reduce((sum, m) => sum + m!.metrics.overallRating, 0) / totalTeachers;

    // Performance distribution
    const performanceDistribution = this.calculatePerformanceDistribution(validMetrics);

    // Top performers
    const topPerformers = validMetrics
      .sort((a, b) => b!.metrics.overallRating - a!.metrics.overallRating)
      .slice(0, 5)
      .map(m => ({ teacherId: m!.teacherId, rating: m!.metrics.overallRating }));

    // Teachers needing attention
    const needsAttention = validMetrics
      .filter(m => m!.metrics.overallRating < 60)
      .map(m => ({ teacherId: m!.teacherId, issues: this.identifyIssues(m!.metrics) }));

    // Common strengths and challenges
    const { commonStrengths, commonChallenges } = this.analyzeCommonPatterns(validMetrics);

    // Generate cohort recommendations
    const recommendations = this.generateCohortRecommendations(validMetrics, {
      averageRating,
      lowPerformers: needsAttention.length
    });

    return {
      cohortId: 'all-teachers',
      totalTeachers,
      averageRating,
      performanceDistribution,
      topPerformers,
      needsAttention,
      commonStrengths,
      commonChallenges,
      recommendations
    };
  }

  private calculatePerformanceDistribution(metrics: any[]): { range: string; count: number }[] {
    const ranges = [
      { range: '0-40', min: 0, max: 40 },
      { range: '41-60', min: 41, max: 60 },
      { range: '61-80', min: 61, max: 80 },
      { range: '81-100', min: 81, max: 100 }
    ];

    return ranges.map(range => ({
      range: range.range,
      count: metrics.filter(m => {
        const rating = m.metrics.overallRating;
        return rating >= range.min && rating <= range.max;
      }).length
    }));
  }

  private identifyIssues(metrics: TeacherPerformanceMetrics): string[] {
    const issues: string[] = [];

    if (metrics.metrics.teachingEffectiveness.studentProgressRate < 0.6) {
      issues.push('Low student progress rate');
    }

    if (metrics.metrics.studentSatisfaction.averageRating < 3.5) {
      issues.push('Low student satisfaction');
    }

    if (metrics.metrics.classManagement.punctualityRate < 0.8) {
      issues.push('Punctuality issues');
    }

    if (metrics.metrics.availability.cancellationRate > 0.1) {
      issues.push('High cancellation rate');
    }

    if (metrics.metrics.professionalDevelopment.trainingCompletionRate < 0.7) {
      issues.push('Incomplete training');
    }

    return issues;
  }

  private analyzeCommonPatterns(metrics: any[]): { commonStrengths: string[], commonChallenges: string[] } {
    // Analyze common patterns across all teachers
    const allStrengths = metrics.flatMap(m => this.analyzePerformanceAreas(m.metrics).strengthAreas);
    const allChallenges = metrics.flatMap(m => this.analyzePerformanceAreas(m.metrics).improvementAreas);

    // Find most common
    const strengthCounts = this.countOccurrences(allStrengths);
    const challengeCounts = this.countOccurrences(allChallenges);

    const commonStrengths = Object.entries(strengthCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([strength]) => strength);

    const commonChallenges = Object.entries(challengeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([challenge]) => challenge);

    return { commonStrengths, commonChallenges };
  }

  private countOccurrences(items: string[]): Record<string, number> {
    return items.reduce((counts, item) => {
      counts[item] = (counts[item] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
  }

  private generateCohortRecommendations(metrics: any[], stats: { averageRating: number, lowPerformers: number }): TeacherRecommendation[] {
    const recommendations: TeacherRecommendation[] = [];

    // Low average rating
    if (stats.averageRating < 70) {
      recommendations.push({
        type: 'training',
        priority: 'high',
        title: 'Cohort-wide Performance Improvement',
        description: 'Overall teacher performance is below target. Implement comprehensive training program.',
        expectedImpact: 0.8,
        implementationTimeframe: '6-12 months',
        actions: [
          {
            action: 'launch_improvement_program',
            assignedTo: 'teacher_development',
            deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            parameters: { averageRating: stats.averageRating },
            estimatedEffort: 100
          }
        ],
        resources: [
          {
            type: 'training_material',
            name: 'Comprehensive Teacher Development Program',
            description: 'Multi-module training for all teachers',
            estimatedTime: 50
          }
        ]
      });
    }

    // High number of low performers
    if (stats.lowPerformers > metrics.length * 0.2) {
      recommendations.push({
        type: 'support',
        priority: 'high',
        title: 'Support Program for Struggling Teachers',
        description: 'High number of teachers need additional support and mentoring.',
        expectedImpact: 0.7,
        implementationTimeframe: '3-6 months',
        actions: [
          {
            action: 'implement_mentorship_program',
            assignedTo: 'teacher_development',
            deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
            parameters: { lowPerformerCount: stats.lowPerformers },
            estimatedEffort: 50
          }
        ],
        resources: [
          {
            type: 'mentor',
            name: 'Senior Teacher Mentors',
            description: 'Experienced teachers to mentor struggling colleagues',
            estimatedTime: 30
          }
        ]
      });
    }

    return recommendations;
  }

  /**
   * Clear cache for a specific teacher
   */
  public clearTeacherCache(teacherId: string): void {
    const cacheKey = `teacher-performance-${teacherId}`;
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
export const teacherPerformanceAnalytics = new TeacherPerformanceAnalytics();