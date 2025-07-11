import { logger } from '@/lib/services';
/**
 * Feedback-Based Recommendation Engine
 * Generates intelligent recommendations based on feedback patterns and analytics
 */

import { createClient } from '@/lib/supabase';
import { feedbackService } from './feedback-service';
import { 
  TeacherRecommendation, 
  CourseRecommendation, 
  StudentFeedbackWithRelations,
  TeacherFeedbackWithRelations 
} from '@/types/feedback';

interface StudentProfile {
  id: string;
  learning_style?: 'visual' | 'auditory' | 'kinesthetic' | 'mixed';
  preferred_pace?: 'slow' | 'medium' | 'fast';
  skill_level?: number; // 1-10
  strengths: string[];
  weaknesses: string[];
  feedback_history: {
    average_ratings_given: number;
    total_feedback_count: number;
    preferences: string[];
  };
  performance_trends: {
    participation: number;
    comprehension: number;
    progress: number;
  };
}

interface TeacherProfile {
  id: string;
  full_name: string;
  specializations: string[];
  teaching_style?: 'structured' | 'flexible' | 'interactive' | 'traditional';
  average_rating: number;
  feedback_stats: {
    total_feedback: number;
    positive_percentage: number;
    strengths: string[];
    improvement_areas: string[];
  };
  student_performance_stats: {
    average_student_progress: number;
    student_satisfaction: number;
    retention_rate: number;
  };
  availability_score: number; // 0-1 based on schedule flexibility
}

interface CourseProfile {
  id: string;
  title: string;
  course_type: string;
  difficulty_level: number; // 1-10
  average_rating: number;
  feedback_stats: {
    completion_rate: number;
    recommendation_rate: number;
    common_strengths: string[];
    common_weaknesses: string[];
  };
  prerequisites: string[];
  learning_outcomes: string[];
}

interface RecommendationWeights {
  rating_compatibility: number;
  learning_style_match: number;
  skill_level_appropriateness: number;
  feedback_sentiment_alignment: number;
  performance_improvement_potential: number;
  schedule_compatibility: number;
  success_probability: number;
}

export class FeedbackRecommendationEngine {
  private supabase = createClient();
  private defaultWeights: RecommendationWeights = {
    rating_compatibility: 0.25,
    learning_style_match: 0.20,
    skill_level_appropriateness: 0.15,
    feedback_sentiment_alignment: 0.15,
    performance_improvement_potential: 0.10,
    schedule_compatibility: 0.10,
    success_probability: 0.05
  };

  // Main recommendation methods
  async generateTeacherRecommendations(
    studentId: string, 
    limit: number = 5,
    weights?: Partial<RecommendationWeights>
  ): Promise<TeacherRecommendation[]> {
    try {
      const studentProfile = await this.buildStudentProfile(studentId);
      const teacherProfiles = await this.getAllTeacherProfiles();
      const actualWeights = { ...this.defaultWeights, ...weights };

      const recommendations: Array<TeacherRecommendation & { score: number }> = [];

      for (const teacher of teacherProfiles) {
        const compatibility = await this.calculateTeacherCompatibility(
          studentProfile, 
          teacher, 
          actualWeights
        );

        if (compatibility.score > 0.3) { // Minimum threshold
          const recommendation: TeacherRecommendation & { score: number } = {
            student_id: studentId,
            recommended_teacher_id: teacher.id,
            compatibility_score: Math.round(compatibility.score * 100) / 100,
            based_on_ratings: true,
            based_on_learning_style: compatibility.factors.includes('learning_style'),
            based_on_schedule: compatibility.factors.includes('schedule'),
            reason: this.generateTeacherRecommendationReason(compatibility),
            confidence_level: Math.round(compatibility.confidence * 100) / 100,
            status: 'active',
            generated_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
            score: compatibility.score
          };

          recommendations.push(recommendation);
        }
      }

      // Sort by score and take top recommendations
      const sortedRecommendations = recommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(({ score, ...rec }) => rec);

      // Store recommendations in database
      for (const recommendation of sortedRecommendations) {
        await this.saveTeacherRecommendation(recommendation);
      }

      return sortedRecommendations;

    } catch (error) {
      logger.error('Error generating teacher recommendations:', error);
      throw error;
    }
  }

  async generateCourseRecommendations(
    studentId: string, 
    limit: number = 5,
    weights?: Partial<RecommendationWeights>
  ): Promise<CourseRecommendation[]> {
    try {
      const studentProfile = await this.buildStudentProfile(studentId);
      const courseProfiles = await this.getAllCourseProfiles();
      const actualWeights = { ...this.defaultWeights, ...weights };

      const recommendations: Array<CourseRecommendation & { score: number }> = [];

      for (const course of courseProfiles) {
        const suitability = await this.calculateCourseSuitability(
          studentProfile, 
          course, 
          actualWeights
        );

        if (suitability.score > 0.4) { // Minimum threshold
          const recommendation: CourseRecommendation & { score: number } = {
            student_id: studentId,
            recommended_course_id: course.id,
            performance_based: suitability.factors.includes('performance'),
            feedback_based: suitability.factors.includes('feedback'),
            progress_based: suitability.factors.includes('progress'),
            readiness_score: Math.round(suitability.readiness * 100) / 100,
            expected_success_rate: Math.round(suitability.success_probability * 100) / 100,
            reason: this.generateCourseRecommendationReason(suitability),
            prerequisites_met: suitability.prerequisites_met,
            status: 'active',
            generated_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days
            score: suitability.score
          };

          recommendations.push(recommendation);
        }
      }

      // Sort by score and take top recommendations
      const sortedRecommendations = recommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(({ score, ...rec }) => rec);

      // Store recommendations in database
      for (const recommendation of sortedRecommendations) {
        await this.saveCourseRecommendation(recommendation);
      }

      return sortedRecommendations;

    } catch (error) {
      logger.error('Error generating course recommendations:', error);
      throw error;
    }
  }

  async generateImprovementRecommendations(studentId: string): Promise<{
    priority_areas: string[];
    recommended_actions: Array<{
      area: string;
      action: string;
      confidence: number;
      expected_impact: string;
    }>;
    recommended_study_hours: number;
    next_milestone: string;
  }> {
    try {
      const studentProfile = await this.buildStudentProfile(studentId);
      const recentTeacherFeedback = await this.getRecentTeacherFeedback(studentId);
      
      const improvements = this.analyzeImprovementOpportunities(
        studentProfile, 
        recentTeacherFeedback
      );

      return improvements;

    } catch (error) {
      logger.error('Error generating improvement recommendations:', error);
      throw error;
    }
  }

  // Profile building methods
  private async buildStudentProfile(studentId: string): Promise<StudentProfile> {
    // Get student basic info
    const { data: student } = await this.supabase
      .from('students')
      .select('*')
      .eq('id', studentId)
      .single();

    if (!student) throw new Error('Student not found');

    // Get student feedback history
    const { data: feedbackHistory } = await feedbackService.getStudentFeedbackList({
      student_id: studentId,
      limit: 50
    });

    // Get teacher feedback about student
    const { data: teacherFeedback } = await feedbackService.getTeacherFeedbackList({
      student_id: studentId,
      limit: 30
    });

    // Analyze feedback patterns
    const strengths = this.extractStrengthsFromFeedback(teacherFeedback.data);
    const weaknesses = this.extractWeaknessesFromFeedback(teacherFeedback.data);
    const preferences = this.extractPreferencesFromFeedback(feedbackHistory.data);
    const performanceTrends = this.calculatePerformanceTrends(teacherFeedback.data);

    return {
      id: studentId,
      learning_style: this.inferLearningStyle(feedbackHistory.data),
      preferred_pace: this.inferPreferredPace(feedbackHistory.data),
      skill_level: this.calculateSkillLevel(teacherFeedback.data),
      strengths,
      weaknesses,
      feedback_history: {
        average_ratings_given: this.calculateAverageRatingsGiven(feedbackHistory.data),
        total_feedback_count: feedbackHistory.count,
        preferences
      },
      performance_trends: performanceTrends
    };
  }

  private async getAllTeacherProfiles(): Promise<TeacherProfile[]> {
    const { data: teachers } = await this.supabase
      .from('teachers')
      .select('*');

    if (!teachers) return [];

    const profiles: TeacherProfile[] = [];

    for (const teacher of teachers) {
      const analytics = await feedbackService.getTeacherFeedbackAnalytics(teacher.id, 'quarter');
      
      const profile: TeacherProfile = {
        id: teacher.id,
        full_name: teacher.full_name,
        specializations: this.inferTeacherSpecializations(teacher),
        teaching_style: this.inferTeachingStyle(teacher),
        average_rating: analytics.average_rating,
        feedback_stats: {
          total_feedback: analytics.total_feedback_count,
          positive_percentage: (analytics.sentiment_analysis.positive / analytics.total_feedback_count) * 100,
          strengths: analytics.top_strengths,
          improvement_areas: analytics.common_improvements
        },
        student_performance_stats: {
          average_student_progress: 0, // Would be calculated from teacher feedback
          student_satisfaction: analytics.average_rating,
          retention_rate: 0.85 // Mock data
        },
        availability_score: this.calculateAvailabilityScore(teacher)
      };

      profiles.push(profile);
    }

    return profiles;
  }

  private async getAllCourseProfiles(): Promise<CourseProfile[]> {
    const { data: courses } = await this.supabase
      .from('courses')
      .select('*');

    if (!courses) return [];

    const profiles: CourseProfile[] = [];

    for (const course of courses) {
      const analytics = await feedbackService.getCourseFeedbackAnalytics(course.id, 'quarter');
      
      const profile: CourseProfile = {
        id: course.id,
        title: course.title,
        course_type: course.course_type,
        difficulty_level: this.mapCourseTypeToDifficulty(course.course_type),
        average_rating: analytics.average_rating,
        feedback_stats: {
          completion_rate: 85, // Mock data
          recommendation_rate: 78, // Mock data
          common_strengths: analytics.top_strengths,
          common_weaknesses: analytics.common_improvements
        },
        prerequisites: this.getCoursePrerequisites(course.course_type),
        learning_outcomes: this.getCourseLearningOutcomes(course.course_type)
      };

      profiles.push(profile);
    }

    return profiles;
  }

  // Compatibility calculation methods
  private async calculateTeacherCompatibility(
    student: StudentProfile, 
    teacher: TeacherProfile, 
    weights: RecommendationWeights
  ): Promise<{
    score: number;
    confidence: number;
    factors: string[];
    breakdown: { [key: string]: number };
  }> {
    const factors: string[] = [];
    const breakdown: { [key: string]: number } = {};

    // Rating compatibility (student's average ratings vs teacher's ratings)
    const ratingCompatibility = this.calculateRatingCompatibility(student, teacher);
    breakdown.rating_compatibility = ratingCompatibility;
    if (ratingCompatibility > 0.7) factors.push('rating');

    // Learning style match
    const learningStyleMatch = this.calculateLearningStyleMatch(student, teacher);
    breakdown.learning_style_match = learningStyleMatch;
    if (learningStyleMatch > 0.6) factors.push('learning_style');

    // Skill level appropriateness
    const skillMatch = this.calculateSkillLevelMatch(student, teacher);
    breakdown.skill_level_appropriateness = skillMatch;
    if (skillMatch > 0.7) factors.push('skill_level');

    // Feedback sentiment alignment
    const sentimentAlignment = this.calculateSentimentAlignment(student, teacher);
    breakdown.feedback_sentiment_alignment = sentimentAlignment;

    // Performance improvement potential
    const improvementPotential = this.calculateImprovementPotential(student, teacher);
    breakdown.performance_improvement_potential = improvementPotential;

    // Schedule compatibility
    const scheduleCompatibility = 0.8; // Mock - would check actual schedules
    breakdown.schedule_compatibility = scheduleCompatibility;
    if (scheduleCompatibility > 0.7) factors.push('schedule');

    // Success probability based on similar student outcomes
    const successProbability = this.calculateSuccessProbability(student, teacher);
    breakdown.success_probability = successProbability;

    // Calculate weighted score
    const score = Object.entries(breakdown).reduce((total, [key, value]) => {
      const weight = weights[key as keyof RecommendationWeights] || 0;
      return total + (value * weight);
    }, 0);

    // Calculate confidence based on data availability and consistency
    const confidence = this.calculateConfidence(breakdown, student.feedback_history.total_feedback_count);

    return {
      score,
      confidence,
      factors,
      breakdown
    };
  }

  private async calculateCourseSuitability(
    student: StudentProfile, 
    course: CourseProfile, 
    weights: RecommendationWeights
  ): Promise<{
    score: number;
    readiness: number;
    success_probability: number;
    prerequisites_met: boolean;
    factors: string[];
  }> {
    const factors: string[] = [];

    // Check prerequisites
    const prerequisitesMet = this.checkPrerequisites(student, course);

    // Skill level appropriateness
    const skillAppropriate = this.isSkillLevelAppropriate(student.skill_level || 5, course.difficulty_level);
    if (skillAppropriate) factors.push('skill_level');

    // Learning style compatibility
    const learningStyleFit = this.courseLearningStyleFit(student, course);
    if (learningStyleFit > 0.6) factors.push('learning_style');

    // Performance-based suitability
    const performanceFit = this.calculatePerformanceBasedFit(student, course);
    if (performanceFit > 0.7) factors.push('performance');

    // Feedback-based suitability
    const feedbackFit = this.calculateFeedbackBasedFit(student, course);
    if (feedbackFit > 0.6) factors.push('feedback');

    // Progress-based readiness
    const progressReadiness = this.calculateProgressReadiness(student, course);
    if (progressReadiness > 0.7) factors.push('progress');

    // Calculate overall scores
    const readiness = (skillAppropriate ? 0.4 : 0) + (learningStyleFit * 0.3) + (progressReadiness * 0.3);
    const success_probability = (performanceFit * 0.4) + (feedbackFit * 0.3) + (readiness * 0.3);
    const score = prerequisitesMet ? (readiness * 0.5 + success_probability * 0.5) : success_probability * 0.3;

    return {
      score,
      readiness,
      success_probability,
      prerequisites_met: prerequisitesMet,
      factors
    };
  }

  // Analysis and extraction methods
  private extractStrengthsFromFeedback(feedback: TeacherFeedbackWithRelations[]): string[] {
    const strengths: string[] = [];
    
    feedback.forEach(f => {
      if (f.strengths) {
        // Simple keyword extraction - in production would use NLP
        const words = f.strengths.toLowerCase().split(/\W+/)
          .filter(word => word.length > 3)
          .filter(word => !['that', 'this', 'with', 'from', 'very', 'good', 'well'].includes(word));
        strengths.push(...words);
      }
    });

    // Count frequency and return top strengths
    const strengthCounts: { [key: string]: number } = {};
    strengths.forEach(strength => {
      strengthCounts[strength] = (strengthCounts[strength] || 0) + 1;
    });

    return Object.entries(strengthCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([strength]) => strength);
  }

  private extractWeaknessesFromFeedback(feedback: TeacherFeedbackWithRelations[]): string[] {
    const weaknesses: string[] = [];
    
    feedback.forEach(f => {
      if (f.areas_for_improvement) {
        const words = f.areas_for_improvement.toLowerCase().split(/\W+/)
          .filter(word => word.length > 3);
        weaknesses.push(...words);
      }
    });

    const weaknessCounts: { [key: string]: number } = {};
    weaknesses.forEach(weakness => {
      weaknessCounts[weakness] = (weaknessCounts[weakness] || 0) + 1;
    });

    return Object.entries(weaknessCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([weakness]) => weakness);
  }

  private extractPreferencesFromFeedback(feedback: StudentFeedbackWithRelations[]): string[] {
    const preferences: string[] = [];
    
    feedback.forEach(f => {
      if (f.positive_feedback) {
        // Extract what students like
        const words = f.positive_feedback.toLowerCase().split(/\W+/)
          .filter(word => word.length > 4);
        preferences.push(...words);
      }
    });

    const prefCounts: { [key: string]: number } = {};
    preferences.forEach(pref => {
      prefCounts[pref] = (prefCounts[pref] || 0) + 1;
    });

    return Object.entries(prefCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([pref]) => pref);
  }

  private calculatePerformanceTrends(feedback: TeacherFeedbackWithRelations[]): {
    participation: number;
    comprehension: number;
    progress: number;
  } {
    if (feedback.length === 0) {
      return { participation: 3, comprehension: 3, progress: 3 };
    }

    const participation = feedback
      .filter(f => f.participation_rating)
      .reduce((sum, f) => sum + f.participation_rating!, 0) / feedback.filter(f => f.participation_rating).length || 3;

    const comprehension = feedback
      .filter(f => f.comprehension_rating)
      .reduce((sum, f) => sum + f.comprehension_rating!, 0) / feedback.filter(f => f.comprehension_rating).length || 3;

    const progress = feedback
      .filter(f => f.progress_rating)
      .reduce((sum, f) => sum + f.progress_rating!, 0) / feedback.filter(f => f.progress_rating).length || 3;

    return { participation, comprehension, progress };
  }

  // Inference methods
  private inferLearningStyle(feedback: StudentFeedbackWithRelations[]): 'visual' | 'auditory' | 'kinesthetic' | 'mixed' {
    // Analyze feedback for learning style indicators
    // This is a simplified implementation
    return 'mixed';
  }

  private inferPreferredPace(feedback: StudentFeedbackWithRelations[]): 'slow' | 'medium' | 'fast' {
    // Analyze feedback mentions of pace
    const paceComplaints = feedback.filter(f => 
      f.improvement_suggestions?.toLowerCase().includes('pace') ||
      f.improvement_suggestions?.toLowerCase().includes('slow') ||
      f.improvement_suggestions?.toLowerCase().includes('fast')
    );

    if (paceComplaints.length > feedback.length * 0.3) {
      return 'medium'; // Needs adjustment
    }

    return 'medium'; // Default
  }

  private calculateSkillLevel(feedback: TeacherFeedbackWithRelations[]): number {
    if (feedback.length === 0) return 5;

    const avgComprehension = feedback
      .filter(f => f.comprehension_rating)
      .reduce((sum, f) => sum + f.comprehension_rating!, 0) / feedback.filter(f => f.comprehension_rating).length || 3;

    const avgProgress = feedback
      .filter(f => f.progress_rating)
      .reduce((sum, f) => sum + f.progress_rating!, 0) / feedback.filter(f => f.progress_rating).length || 3;

    // Convert 1-5 rating to 1-10 skill level
    return Math.round(((avgComprehension + avgProgress) / 2) * 2);
  }

  private calculateAverageRatingsGiven(feedback: StudentFeedbackWithRelations[]): number {
    if (feedback.length === 0) return 0;

    const ratings = feedback
      .filter(f => f.overall_rating)
      .map(f => f.overall_rating!);

    return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
  }

  // Compatibility calculation helpers
  private calculateRatingCompatibility(student: StudentProfile, teacher: TeacherProfile): number {
    // Students who give higher ratings are more compatible with higher-rated teachers
    const studentRatingTendency = student.feedback_history.average_ratings_given;
    const teacherRating = teacher.average_rating;

    // Normalize to 0-1 scale
    const studentNorm = (studentRatingTendency - 1) / 4; // 1-5 scale to 0-1
    const teacherNorm = (teacherRating - 1) / 4; // 1-5 scale to 0-1

    // Calculate compatibility (closer values = higher compatibility)
    return 1 - Math.abs(studentNorm - teacherNorm);
  }

  private calculateLearningStyleMatch(student: StudentProfile, teacher: TeacherProfile): number {
    // Mock implementation - would match learning and teaching styles
    return 0.75;
  }

  private calculateSkillLevelMatch(student: StudentProfile, teacher: TeacherProfile): number {
    // Teachers are more compatible with students at appropriate skill levels
    const studentSkill = student.skill_level || 5;
    
    // Assume teachers are most effective with students in 4-7 range
    if (studentSkill >= 4 && studentSkill <= 7) return 0.9;
    if (studentSkill >= 3 && studentSkill <= 8) return 0.7;
    return 0.5;
  }

  private calculateSentimentAlignment(student: StudentProfile, teacher: TeacherProfile): number {
    // Match students who appreciate teacher's strengths
    const studentPrefs = student.feedback_history.preferences;
    const teacherStrengths = teacher.feedback_stats.strengths;

    const commonElements = studentPrefs.filter(pref => 
      teacherStrengths.some(strength => 
        strength.toLowerCase().includes(pref.toLowerCase()) ||
        pref.toLowerCase().includes(strength.toLowerCase())
      )
    );

    return Math.min(1, commonElements.length / Math.max(1, studentPrefs.length));
  }

  private calculateImprovementPotential(student: StudentProfile, teacher: TeacherProfile): number {
    // Match student weaknesses with teacher strengths
    const studentWeaknesses = student.weaknesses;
    const teacherStrengths = teacher.feedback_stats.strengths;

    const matchingAreas = studentWeaknesses.filter(weakness =>
      teacherStrengths.some(strength =>
        strength.toLowerCase().includes(weakness.toLowerCase()) ||
        weakness.toLowerCase().includes(strength.toLowerCase())
      )
    );

    return Math.min(1, matchingAreas.length / Math.max(1, studentWeaknesses.length));
  }

  private calculateSuccessProbability(student: StudentProfile, teacher: TeacherProfile): number {
    // Based on teacher's track record with similar students
    // Mock implementation
    return teacher.student_performance_stats.average_student_progress;
  }

  private calculateConfidence(breakdown: { [key: string]: number }, feedbackCount: number): number {
    // Higher confidence with more data and consistent scores
    const scoreVariance = Object.values(breakdown).reduce((sum, score, _, arr) => {
      const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
      return sum + Math.pow(score - mean, 2);
    }, 0) / Object.values(breakdown).length;

    const consistencyScore = 1 - Math.min(1, scoreVariance);
    const dataQualityScore = Math.min(1, feedbackCount / 10); // More confident with more feedback

    return (consistencyScore + dataQualityScore) / 2;
  }

  // Course suitability helpers
  private checkPrerequisites(student: StudentProfile, course: CourseProfile): boolean {
    // Mock implementation - would check actual prerequisites
    const skillLevel = student.skill_level || 5;
    const courseLevel = course.difficulty_level;

    return skillLevel >= (courseLevel - 2); // Allow some flexibility
  }

  private isSkillLevelAppropriate(studentLevel: number, courseLevel: number): boolean {
    return Math.abs(studentLevel - courseLevel) <= 2;
  }

  private courseLearningStyleFit(student: StudentProfile, course: CourseProfile): number {
    // Mock implementation
    return 0.7;
  }

  private calculatePerformanceBasedFit(student: StudentProfile, course: CourseProfile): number {
    const trends = student.performance_trends;
    const avgPerformance = (trends.participation + trends.comprehension + trends.progress) / 3;
    
    // Normalize to 0-1 scale
    return (avgPerformance - 1) / 4;
  }

  private calculateFeedbackBasedFit(student: StudentProfile, course: CourseProfile): number {
    // Match student preferences with course strengths
    const studentPrefs = student.feedback_history.preferences;
    const courseStrengths = course.feedback_stats.common_strengths;

    const matches = studentPrefs.filter(pref =>
      courseStrengths.some(strength =>
        strength.toLowerCase().includes(pref.toLowerCase())
      )
    );

    return matches.length / Math.max(1, studentPrefs.length);
  }

  private calculateProgressReadiness(student: StudentProfile, course: CourseProfile): number {
    const progressTrend = student.performance_trends.progress;
    return (progressTrend - 1) / 4; // Normalize 1-5 to 0-1
  }

  // Helper methods
  private inferTeacherSpecializations(teacher: any): string[] {
    // Mock implementation
    return ['conversation', 'grammar', 'pronunciation'];
  }

  private inferTeachingStyle(teacher: any): 'structured' | 'flexible' | 'interactive' | 'traditional' {
    // Mock implementation
    return 'interactive';
  }

  private calculateAvailabilityScore(teacher: any): number {
    // Mock implementation
    return 0.8;
  }

  private mapCourseTypeToDifficulty(courseType: string): number {
    const difficultyMap: { [key: string]: number } = {
      'Basic': 3,
      'Everyday A': 4,
      'Everyday B': 5,
      'Speak Up': 6,
      'Business English': 7,
      '1-on-1': 5
    };

    return difficultyMap[courseType] || 5;
  }

  private getCoursePrerequisites(courseType: string): string[] {
    const prerequisiteMap: { [key: string]: string[] } = {
      'Basic': [],
      'Everyday A': ['Basic'],
      'Everyday B': ['Everyday A'],
      'Speak Up': ['Everyday A'],
      'Business English': ['Everyday B'],
      '1-on-1': []
    };

    return prerequisiteMap[courseType] || [];
  }

  private getCourseLearningOutcomes(courseType: string): string[] {
    // Mock implementation
    return ['improved communication', 'better grammar', 'increased confidence'];
  }

  private async getRecentTeacherFeedback(studentId: string): Promise<TeacherFeedbackWithRelations[]> {
    const { data } = await feedbackService.getTeacherFeedbackList({
      student_id: studentId,
      limit: 10
    });

    return data;
  }

  private analyzeImprovementOpportunities(
    student: StudentProfile, 
    recentFeedback: TeacherFeedbackWithRelations[]
  ): any {
    // Mock implementation
    return {
      priority_areas: student.weaknesses.slice(0, 3),
      recommended_actions: [
        {
          area: 'pronunciation',
          action: 'Practice daily with pronunciation exercises',
          confidence: 0.8,
          expected_impact: 'Significant improvement in speaking clarity'
        }
      ],
      recommended_study_hours: 5,
      next_milestone: 'Complete current unit with 85% comprehension'
    };
  }

  // Reason generation
  private generateTeacherRecommendationReason(compatibility: any): string {
    const factors = compatibility.factors;
    const breakdown = compatibility.breakdown;

    let reason = "Recommended based on ";
    const reasons: string[] = [];

    if (factors.includes('rating')) {
      reasons.push("compatible rating preferences");
    }
    if (factors.includes('learning_style')) {
      reasons.push("matching learning style");
    }
    if (factors.includes('skill_level')) {
      reasons.push("appropriate skill level match");
    }
    if (factors.includes('schedule')) {
      reasons.push("schedule compatibility");
    }

    reason += reasons.join(", ");
    
    if (breakdown.performance_improvement_potential > 0.7) {
      reason += ". Strong potential for performance improvement.";
    }

    return reason;
  }

  private generateCourseRecommendationReason(suitability: any): string {
    const factors = suitability.factors;
    
    let reason = "Recommended based on ";
    const reasons: string[] = [];

    if (factors.includes('skill_level')) {
      reasons.push("appropriate difficulty level");
    }
    if (factors.includes('performance')) {
      reasons.push("your performance history");
    }
    if (factors.includes('feedback')) {
      reasons.push("positive feedback patterns");
    }
    if (factors.includes('progress')) {
      reasons.push("your learning progress");
    }

    reason += reasons.join(", ");
    
    return reason;
  }

  // Database operations
  private async saveTeacherRecommendation(recommendation: TeacherRecommendation): Promise<void> {
    const { error } = await this.supabase
      .from('teacher_recommendations')
      .upsert(recommendation);

    if (error) throw error;
  }

  private async saveCourseRecommendation(recommendation: CourseRecommendation): Promise<void> {
    const { error } = await this.supabase
      .from('course_recommendations')
      .upsert(recommendation);

    if (error) throw error;
  }
}

export const feedbackRecommendationEngine = new FeedbackRecommendationEngine();