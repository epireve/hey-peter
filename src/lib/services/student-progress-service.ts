import { supabase } from "@/lib/supabase";
import { CRUDService, withRetry } from "./crud-service";
import { contentAnalysisService } from "./content-analysis-service";
import { logger } from '@/lib/services';
import {
  StudentProgress,
  LearningAnalytics,
  TopicPerformance,
  ContentItem,
  TimeSlot,
  CourseType
} from "@/types/scheduling";
import { z } from "zod";

// Schema for progress tracking
const progressUpdateSchema = z.object({
  student_id: z.string().uuid(),
  course_id: z.string().uuid(),
  lesson_unit: z.number().int().min(1),
  lesson_number: z.number().int().min(1),
  completion_status: z.enum(['completed', 'in_progress', 'not_started']),
  performance_score: z.number().min(0).max(100).optional(),
  time_spent_minutes: z.number().int().min(0).optional(),
  notes: z.string().optional()
});

const learningGoalSchema = z.object({
  student_id: z.string().uuid(),
  goal_title: z.string().min(1),
  goal_description: z.string().optional(),
  target_completion_date: z.string().datetime().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  related_content_ids: z.array(z.string()).optional()
});

export type ProgressUpdate = z.infer<typeof progressUpdateSchema>;
export type LearningGoal = z.infer<typeof learningGoalSchema>;

export interface LearningPattern {
  student_id: string;
  pattern_type: 'time_preference' | 'learning_style' | 'difficulty_preference' | 'social_preference';
  pattern_data: Record<string, any>;
  confidence_score: number;
  last_updated: string;
}

export interface ProgressPrediction {
  student_id: string;
  predicted_completion_date: string;
  confidence_level: number;
  factors_affecting_progress: string[];
  recommended_adjustments: string[];
}

export interface LearningRecommendation {
  student_id: string;
  recommendation_type: 'content' | 'scheduling' | 'study_method' | 'peer_interaction';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  implementation_timeline: string;
  expected_impact: string;
}

export class StudentProgressService {
  private crudService: CRUDService<any>;

  constructor() {
    this.crudService = new CRUDService({
      table: "student_courses",
      cache: {
        enabled: true,
        ttl: 5 * 60 * 1000, // 5 minutes
      },
    });
  }

  /**
   * Update student progress for a specific lesson
   */
  async updateProgress(update: ProgressUpdate): Promise<{ success: boolean; data?: any; error?: string }> {
    return withRetry(async () => {
      const validatedUpdate = progressUpdateSchema.parse(update);

      // Update the student_courses table
      const { error: courseUpdateError } = await supabase
        .from("student_courses")
        .update({
          current_unit: validatedUpdate.lesson_unit,
          current_lesson: validatedUpdate.lesson_number,
          progress_percentage: await this.calculateProgressPercentage(
            validatedUpdate.student_id,
            validatedUpdate.course_id,
            validatedUpdate.lesson_unit,
            validatedUpdate.lesson_number
          ),
          updated_at: new Date().toISOString()
        })
        .eq("student_id", validatedUpdate.student_id)
        .eq("course_id", validatedUpdate.course_id);

      if (courseUpdateError) {
        throw new Error(`Failed to update course progress: ${courseUpdateError.message}`);
      }

      // Create or update feedback record
      if (validatedUpdate.completion_status === 'completed') {
        const { data: feedbackData, error: feedbackError } = await supabase
          .from("feedback")
          .insert({
            student_id: validatedUpdate.student_id,
            class_id: null, // Will be set when associated with a class
            teacher_id: null, // Will be set when associated with a teacher
            lesson_completed: true,
            lesson_unit: validatedUpdate.lesson_unit,
            lesson_number: validatedUpdate.lesson_number,
            rating: validatedUpdate.performance_score ? Math.round(validatedUpdate.performance_score / 20) : 3,
            teacher_notes: validatedUpdate.notes,
            submitted_time: new Date().toISOString()
          })
          .select()
          .single();

        if (feedbackError && !feedbackError.message.includes('duplicate')) {
          logger.warn('Could not create feedback record:', feedbackError.message);
        }
      }

      // Update learning patterns
      await this.updateLearningPatterns(validatedUpdate);

      // Generate updated analytics
      const analytics = await this.generateProgressAnalytics(validatedUpdate.student_id);

      return { success: true, data: analytics };
    });
  }

  /**
   * Track learning patterns and preferences
   */
  async updateLearningPatterns(update: ProgressUpdate): Promise<void> {
    return withRetry(async () => {
      const patterns = await this.analyzeLearningPatterns(update.student_id);
      
      // Update time preferences based on when the lesson was completed
      const timePattern = this.extractTimePattern(update);
      if (timePattern) {
        await this.storeLearningPattern({
          student_id: update.student_id,
          pattern_type: 'time_preference',
          pattern_data: timePattern,
          confidence_score: 0.7,
          last_updated: new Date().toISOString()
        });
      }

      // Update difficulty preferences
      const difficultyPattern = await this.extractDifficultyPattern(update);
      if (difficultyPattern) {
        await this.storeLearningPattern({
          student_id: update.student_id,
          pattern_type: 'difficulty_preference',
          pattern_data: difficultyPattern,
          confidence_score: 0.8,
          last_updated: new Date().toISOString()
        });
      }
    });
  }

  /**
   * Generate comprehensive progress analytics for a student
   */
  async generateProgressAnalytics(studentId: string): Promise<LearningAnalytics> {
    return withRetry(async () => {
      const baseAnalytics = await contentAnalysisService.generateLearningAnalytics(studentId);
      
      // Enhance with additional progress-specific metrics
      const learningPatterns = await this.getLearningPatterns(studentId);
      const progressPredictions = await this.generateProgressPredictions(studentId);
      const recommendations = await this.generateLearningRecommendations(studentId);

      // Calculate advanced metrics
      const consistencyScore = await this.calculateConsistencyScore(studentId);
      const adaptabilityScore = await this.calculateAdaptabilityScore(studentId);
      const motivationLevel = await this.assessMotivationLevel(studentId);

      return {
        ...baseAnalytics,
        // Additional analytics-specific fields
        consistency_score: consistencyScore,
        adaptability_score: adaptabilityScore,
        motivation_level: motivationLevel,
        learning_patterns: learningPatterns,
        progress_predictions: progressPredictions,
        recommendations: recommendations
      } as any; // Extended LearningAnalytics
    });
  }

  /**
   * Predict future progress and completion dates
   */
  async generateProgressPredictions(studentId: string): Promise<ProgressPrediction[]> {
    return withRetry(async () => {
      const progressHistory = await this.getProgressHistory(studentId);
      const currentProgress = await contentAnalysisService.analyzeStudentProgress(studentId);
      
      const predictions: ProgressPrediction[] = [];

      for (const progress of currentProgress) {
        const completionRate = this.calculateCompletionRate(progressHistory, progress.course_id);
        const remainingContent = 100 - progress.progress_percentage;
        
        let estimatedDays = 0;
        if (completionRate > 0) {
          estimatedDays = Math.ceil(remainingContent / completionRate);
        } else {
          estimatedDays = Math.ceil(remainingContent / 2); // Default 2% per day
        }

        const predictedDate = new Date();
        predictedDate.setDate(predictedDate.getDate() + estimatedDays);

        const factors = this.identifyProgressFactors(progressHistory, progress);
        const adjustments = this.generateProgressAdjustments(progress, factors);

        predictions.push({
          student_id: studentId,
          predicted_completion_date: predictedDate.toISOString(),
          confidence_level: this.calculatePredictionConfidence(progressHistory, progress),
          factors_affecting_progress: factors,
          recommended_adjustments: adjustments
        });
      }

      return predictions;
    });
  }

  /**
   * Generate personalized learning recommendations
   */
  async generateLearningRecommendations(studentId: string): Promise<LearningRecommendation[]> {
    return withRetry(async () => {
      const analytics = await contentAnalysisService.generateLearningAnalytics(studentId);
      const progressData = await contentAnalysisService.analyzeStudentProgress(studentId);
      const unlearnedContent = await contentAnalysisService.identifyUnlearnedContent(studentId);
      
      const recommendations: LearningRecommendation[] = [];

      // Content-based recommendations
      for (const unlearned of unlearnedContent) {
        if (unlearned.urgency_level === 'urgent' || unlearned.urgency_level === 'high') {
          recommendations.push({
            student_id: studentId,
            recommendation_type: 'content',
            title: `Focus on ${unlearned.content_items[0]?.title || 'priority content'}`,
            description: `Complete ${unlearned.content_items.length} high-priority lessons to improve progress`,
            priority: unlearned.urgency_level as any,
            implementation_timeline: 'Next 1-2 weeks',
            expected_impact: 'Significant improvement in course progress'
          });
        }
      }

      // Scheduling recommendations
      if (analytics.best_time_slots.length > 0) {
        recommendations.push({
          student_id: studentId,
          recommendation_type: 'scheduling',
          title: 'Optimize class scheduling',
          description: `Schedule classes during your most productive times: ${this.formatTimeSlots(analytics.best_time_slots)}`,
          priority: 'medium',
          implementation_timeline: 'Next scheduling period',
          expected_impact: 'Improved attendance and engagement'
        });
      }

      // Study method recommendations
      if (analytics.learning_velocity < 1) {
        recommendations.push({
          student_id: studentId,
          recommendation_type: 'study_method',
          title: 'Increase study frequency',
          description: 'Consider scheduling more frequent, shorter study sessions to improve learning velocity',
          priority: 'high',
          implementation_timeline: 'Immediate',
          expected_impact: 'Faster progress and better retention'
        });
      }

      // Peer interaction recommendations
      if (analytics.peer_compatibility.length > 0 && analytics.optimal_class_size > 1) {
        recommendations.push({
          student_id: studentId,
          recommendation_type: 'peer_interaction',
          title: 'Join group classes',
          description: `You learn well with peers. Consider joining group classes with compatible students`,
          priority: 'medium',
          implementation_timeline: 'Next 2-3 weeks',
          expected_impact: 'Enhanced learning through collaboration'
        });
      }

      return recommendations.slice(0, 5); // Limit to top 5 recommendations
    });
  }

  /**
   * Set and track learning goals
   */
  async setLearningGoal(goal: LearningGoal): Promise<{ success: boolean; data?: any; error?: string }> {
    return withRetry(async () => {
      const validatedGoal = learningGoalSchema.parse(goal);

      // Store in a learning goals table (would need to be created)
      // For now, we'll store as metadata in the student record
      const { data: student } = await supabase
        .from("students")
        .select("*")
        .eq("id", validatedGoal.student_id)
        .single();

      if (!student) {
        throw new Error("Student not found");
      }

      // Update student metadata with goals
      const currentGoals = student.metadata?.learning_goals || [];
      const updatedGoals = [...currentGoals, {
        ...validatedGoal,
        id: `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString(),
        status: 'active'
      }];

      const { error } = await supabase
        .from("students")
        .update({
          metadata: {
            ...student.metadata,
            learning_goals: updatedGoals
          }
        })
        .eq("id", validatedGoal.student_id);

      if (error) {
        throw new Error(`Failed to set learning goal: ${error.message}`);
      }

      return { success: true, data: updatedGoals[updatedGoals.length - 1] };
    });
  }

  /**
   * Get comprehensive progress report for a student
   */
  async getProgressReport(studentId: string, timeRange?: { start: string; end: string }): Promise<{
    summary: StudentProgress[];
    analytics: LearningAnalytics;
    predictions: ProgressPrediction[];
    recommendations: LearningRecommendation[];
    goals: LearningGoal[];
  }> {
    return withRetry(async () => {
      const [summary, analytics, predictions, recommendations] = await Promise.all([
        contentAnalysisService.analyzeStudentProgress(studentId),
        this.generateProgressAnalytics(studentId),
        this.generateProgressPredictions(studentId),
        this.generateLearningRecommendations(studentId)
      ]);

      const goals = await this.getLearningGoals(studentId);

      return {
        summary,
        analytics,
        predictions,
        recommendations,
        goals
      };
    });
  }

  /**
   * Compare student progress with peer group
   */
  async comparePeerProgress(studentId: string, courseType: CourseType): Promise<{
    student_percentile: number;
    peer_average_progress: number;
    peer_average_velocity: number;
    areas_ahead: string[];
    areas_behind: string[];
  }> {
    return withRetry(async () => {
      const studentProgress = await contentAnalysisService.analyzeStudentProgress(studentId);
      const studentAnalytics = await contentAnalysisService.generateLearningAnalytics(studentId);

      // Get peer group data
      const { data: peers } = await supabase
        .from("students")
        .select(`
          id,
          student_courses(*)
        `)
        .eq("test_level", courseType)
        .neq("id", studentId);

      if (!peers || peers.length === 0) {
        return {
          student_percentile: 50,
          peer_average_progress: 0,
          peer_average_velocity: 0,
          areas_ahead: [],
          areas_behind: []
        };
      }

      // Calculate peer metrics
      const peerProgressData: number[] = [];
      const peerVelocityData: number[] = [];

      for (const peer of peers) {
        const peerAnalytics = await contentAnalysisService.generateLearningAnalytics(peer.id);
        const peerProgress = await contentAnalysisService.analyzeStudentProgress(peer.id);
        
        if (peerProgress.length > 0) {
          const avgProgress = peerProgress.reduce((sum, p) => sum + p.progress_percentage, 0) / peerProgress.length;
          peerProgressData.push(avgProgress);
          peerVelocityData.push(peerAnalytics.learning_velocity);
        }
      }

      const studentAvgProgress = studentProgress.reduce((sum, p) => sum + p.progress_percentage, 0) / studentProgress.length;
      
      // Calculate percentile
      const lowerCount = peerProgressData.filter(p => p < studentAvgProgress).length;
      const percentile = Math.round((lowerCount / peerProgressData.length) * 100);

      // Calculate averages
      const peerAvgProgress = peerProgressData.reduce((sum, p) => sum + p, 0) / peerProgressData.length;
      const peerAvgVelocity = peerVelocityData.reduce((sum, v) => sum + v, 0) / peerVelocityData.length;

      // Identify areas ahead/behind
      const areasAhead: string[] = [];
      const areasBehind: string[] = [];

      if (studentAnalytics.learning_velocity > peerAvgVelocity) {
        areasAhead.push('Learning velocity');
      } else {
        areasBehind.push('Learning velocity');
      }

      if (studentAvgProgress > peerAvgProgress) {
        areasAhead.push('Overall progress');
      } else {
        areasBehind.push('Overall progress');
      }

      return {
        student_percentile: percentile,
        peer_average_progress: peerAvgProgress,
        peer_average_velocity: peerAvgVelocity,
        areas_ahead: areasAhead,
        areas_behind: areasBehind
      };
    });
  }

  // Private helper methods
  private async calculateProgressPercentage(
    studentId: string,
    courseId: string,
    currentUnit: number,
    currentLesson: number
  ): Promise<number> {
    const { data: totalLessons } = await supabase
      .from("materials")
      .select("unit_number, lesson_number")
      .eq("course_id", courseId);

    if (!totalLessons || totalLessons.length === 0) return 0;

    const maxUnit = Math.max(...totalLessons.map(l => l.unit_number));
    const maxLessonInMaxUnit = Math.max(...totalLessons
      .filter(l => l.unit_number === maxUnit)
      .map(l => l.lesson_number));

    const totalPossibleLessons = totalLessons.length;
    const completedLessons = totalLessons.filter(l => 
      l.unit_number < currentUnit || 
      (l.unit_number === currentUnit && l.lesson_number <= currentLesson)
    ).length;

    return Math.min(100, Math.round((completedLessons / totalPossibleLessons) * 100));
  }

  private async analyzeLearningPatterns(studentId: string): Promise<LearningPattern[]> {
    // Retrieve stored patterns from metadata or dedicated table
    const { data: student } = await supabase
      .from("students")
      .select("metadata")
      .eq("id", studentId)
      .single();

    return student?.metadata?.learning_patterns || [];
  }

  private extractTimePattern(update: ProgressUpdate): any {
    const currentTime = new Date();
    return {
      preferred_hour: currentTime.getHours(),
      preferred_day: currentTime.getDay(),
      completion_time: currentTime.toISOString(),
      performance_score: update.performance_score
    };
  }

  private async extractDifficultyPattern(update: ProgressUpdate): Promise<any> {
    const { data: material } = await supabase
      .from("materials")
      .select("*")
      .eq("unit_number", update.lesson_unit)
      .eq("lesson_number", update.lesson_number)
      .single();

    if (!material) return null;

    const difficultyLevel = Math.min(10, Math.floor(update.lesson_unit * 1.5 + update.lesson_number * 0.3));
    
    return {
      difficulty_level: difficultyLevel,
      performance_score: update.performance_score,
      time_spent: update.time_spent_minutes,
      completion_status: update.completion_status
    };
  }

  private async storeLearningPattern(pattern: LearningPattern): Promise<void> {
    const { data: student } = await supabase
      .from("students")
      .select("metadata")
      .eq("id", pattern.student_id)
      .single();

    const currentPatterns = student?.metadata?.learning_patterns || [];
    const existingPatternIndex = currentPatterns.findIndex(p => p.pattern_type === pattern.pattern_type);

    if (existingPatternIndex >= 0) {
      currentPatterns[existingPatternIndex] = pattern;
    } else {
      currentPatterns.push(pattern);
    }

    await supabase
      .from("students")
      .update({
        metadata: {
          ...student?.metadata,
          learning_patterns: currentPatterns
        }
      })
      .eq("id", pattern.student_id);
  }

  private async getLearningPatterns(studentId: string): Promise<LearningPattern[]> {
    const { data: student } = await supabase
      .from("students")
      .select("metadata")
      .eq("id", studentId)
      .single();

    return student?.metadata?.learning_patterns || [];
  }

  private async getProgressHistory(studentId: string): Promise<any[]> {
    const { data: feedback } = await supabase
      .from("feedback")
      .select("*")
      .eq("student_id", studentId)
      .order("submitted_time", { ascending: true });

    return feedback || [];
  }

  private calculateCompletionRate(progressHistory: any[], courseId: string): number {
    const courseHistory = progressHistory.filter(h => h.course_id === courseId);
    if (courseHistory.length < 2) return 2; // Default rate

    const firstEntry = new Date(courseHistory[0].submitted_time);
    const lastEntry = new Date(courseHistory[courseHistory.length - 1].submitted_time);
    const daysDiff = Math.max(1, (lastEntry.getTime() - firstEntry.getTime()) / (1000 * 60 * 60 * 24));
    
    return (courseHistory.length / daysDiff) * 100; // Percentage per day
  }

  private identifyProgressFactors(progressHistory: any[], progress: StudentProgress): string[] {
    const factors: string[] = [];

    if (progress.learning_pace === 'slow') factors.push('Below average learning pace');
    if (progress.struggling_topics.length > 2) factors.push('Multiple challenging topics');
    if (progress.progress_percentage < 50) factors.push('Low overall progress');
    
    const recentProgress = progressHistory.slice(-5);
    const avgRating = recentProgress.reduce((sum, p) => sum + (p.rating || 3), 0) / recentProgress.length;
    if (avgRating < 3) factors.push('Recent low performance ratings');

    return factors;
  }

  private generateProgressAdjustments(progress: StudentProgress, factors: string[]): string[] {
    const adjustments: string[] = [];

    if (factors.includes('Below average learning pace')) {
      adjustments.push('Schedule more frequent study sessions');
      adjustments.push('Consider individual tutoring');
    }

    if (factors.includes('Multiple challenging topics')) {
      adjustments.push('Focus on one topic at a time');
      adjustments.push('Provide additional practice materials');
    }

    if (factors.includes('Low overall progress')) {
      adjustments.push('Review and reinforce previous lessons');
      adjustments.push('Adjust learning goals to be more achievable');
    }

    return adjustments;
  }

  private calculatePredictionConfidence(progressHistory: any[], progress: StudentProgress): number {
    let confidence = 50; // Base confidence

    if (progressHistory.length > 10) confidence += 20;
    if (progress.learning_pace === 'average') confidence += 15;
    if (progress.struggling_topics.length < 2) confidence += 10;
    if (progress.progress_percentage > 25) confidence += 5;

    return Math.min(100, confidence);
  }

  private async calculateConsistencyScore(studentId: string): Promise<number> {
    const { data: attendance } = await supabase
      .from("attendance")
      .select("status, attendance_time")
      .eq("booking.student_id", studentId)
      .order("attendance_time", { ascending: false })
      .limit(20);

    if (!attendance || attendance.length === 0) return 50;

    const presentCount = attendance.filter(a => a.status === 'present').length;
    return Math.round((presentCount / attendance.length) * 100);
  }

  private async calculateAdaptabilityScore(studentId: string): Promise<number> {
    // Analyze how well student adapts to different content types and difficulties
    const { data: feedback } = await supabase
      .from("feedback")
      .select("rating, lesson_unit, lesson_number")
      .eq("student_id", studentId)
      .order("submitted_time", { ascending: false })
      .limit(15);

    if (!feedback || feedback.length === 0) return 50;

    // Calculate variance in performance across different difficulty levels
    const ratingVariance = this.calculateVariance(feedback.map(f => f.rating || 3));
    const adaptabilityScore = Math.max(0, 100 - (ratingVariance * 20));

    return Math.round(adaptabilityScore);
  }

  private async assessMotivationLevel(studentId: string): Promise<number> {
    const { data: recentAttendance } = await supabase
      .from("attendance")
      .select("status")
      .eq("booking.student_id", studentId)
      .gte("attendance_time", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order("attendance_time", { ascending: false });

    if (!recentAttendance || recentAttendance.length === 0) return 50;

    const attendanceRate = recentAttendance.filter(a => a.status === 'present').length / recentAttendance.length;
    return Math.round(attendanceRate * 100);
  }

  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    
    const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
    return squaredDiffs.reduce((sum, sq) => sum + sq, 0) / numbers.length;
  }

  private formatTimeSlots(timeSlots: TimeSlot[]): string {
    return timeSlots
      .map(slot => `${this.getDayName(slot.day_of_week)} ${slot.start_time}`)
      .join(', ');
  }

  private getDayName(dayOfWeek: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek] || 'Unknown';
  }

  private async getLearningGoals(studentId: string): Promise<LearningGoal[]> {
    const { data: student } = await supabase
      .from("students")
      .select("metadata")
      .eq("id", studentId)
      .single();

    return student?.metadata?.learning_goals || [];
  }
}

// Export singleton instance
export const studentProgressService = new StudentProgressService();