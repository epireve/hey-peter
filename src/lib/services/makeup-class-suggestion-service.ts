/**
 * Make-up Class Suggestion Service
 * 
 * This service implements sophisticated algorithms for suggesting optimal make-up classes
 * based on student preferences, content compatibility, and scheduling constraints.
 */

import { supabase } from '@/lib/supabase';
import { withRetry } from './crud-service';
import { schedulingService } from './scheduling-service';
import { contentSimilarityService } from './content-similarity-service';
import { z } from 'zod';

export interface MakeUpSuggestionRequest {
  student_id: string;
  postponement_id: string;
  original_class_id: string;
  student_preferences?: StudentSchedulePreferences;
  constraints?: SuggestionConstraints;
  max_suggestions?: number;
}

export interface SuggestionConstraints {
  earliest_date?: string;
  latest_date?: string;
  preferred_days?: number[];
  preferred_times?: string[];
  excluded_class_ids?: string[];
  excluded_teacher_ids?: string[];
  min_compatibility_score?: number;
  include_waitlist_options?: boolean;
  max_travel_distance?: number;
  same_teacher_preference?: boolean;
}

export interface DetailedMakeUpSuggestion {
  id: string;
  class_id: string;
  teacher_id: string;
  teacher_name: string;
  teacher_bio?: string;
  teacher_rating?: number;
  class_name: string;
  course_type: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  location?: string;
  is_online: boolean;
  meeting_link?: string;
  current_enrollment: number;
  capacity: number;
  available_spots: number;
  
  // Scoring details
  overall_compatibility_score: number;
  content_compatibility_score: number;
  schedule_preference_score: number;
  teacher_compatibility_score: number;
  class_size_preference_score: number;
  location_preference_score: number;
  timing_preference_score: number;
  
  // Detailed analysis
  content_analysis: {
    similarity_percentage: number;
    matching_topics: string[];
    skill_level_alignment: string;
    prerequisite_compatibility: boolean;
    learning_objectives_overlap: number;
  };
  
  scheduling_analysis: {
    day_preference_match: boolean;
    time_preference_match: boolean;
    advance_notice_compliance: boolean;
    travel_time_acceptable: boolean;
    conflicts_with_existing: boolean;
  };
  
  teacher_analysis: {
    is_preferred_teacher: boolean;
    is_avoided_teacher: boolean;
    teaching_style_match: string;
    subject_expertise_match: number;
    student_history_with_teacher: boolean;
  };
  
  // Benefits and considerations
  benefits: string[];
  considerations: string[];
  recommendation_strength: 'low' | 'medium' | 'high' | 'excellent';
  
  // Booking details
  booking_deadline?: string;
  cancellation_policy?: string;
  make_up_policy?: string;
  
  // Alternative options
  alternative_times?: Array<{
    start_time: string;
    end_time: string;
    availability_score: number;
  }>;
}

export interface SuggestionAlgorithmConfig {
  weights: {
    content_compatibility: number;
    schedule_preference: number;
    teacher_compatibility: number;
    class_size_preference: number;
    location_preference: number;
    timing_preference: number;
    availability_score: number;
  };
  thresholds: {
    min_overall_score: number;
    min_content_score: number;
    min_schedule_score: number;
    excellent_threshold: number;
    high_threshold: number;
    medium_threshold: number;
  };
  preferences: {
    prioritize_same_teacher: boolean;
    prioritize_same_time_slot: boolean;
    prioritize_content_continuity: boolean;
    include_advanced_suggestions: boolean;
    max_suggestions_per_day: number;
    max_suggestions_per_teacher: number;
  };
}

export interface StudentSchedulePreferences {
  student_id: string;
  preferred_days: number[];
  preferred_times: Record<string, string[]>;
  avoided_times: Record<string, string[]>;
  preferred_class_size_min: number;
  preferred_class_size_max: number;
  preferred_teachers: string[];
  avoided_teachers: string[];
  preferred_content_pace: 'slow' | 'normal' | 'fast';
  preferred_difficulty_level: 'easier' | 'appropriate' | 'challenging';
  max_travel_time_minutes: number;
  willing_to_change_teacher: boolean;
  willing_to_join_different_class: boolean;
  advance_notice_required_hours: number;
}

export class MakeUpClassSuggestionService {
  private static instance: MakeUpClassSuggestionService;
  private config: SuggestionAlgorithmConfig;

  private constructor() {
    this.config = {
      weights: {
        content_compatibility: 0.30,
        schedule_preference: 0.25,
        teacher_compatibility: 0.20,
        class_size_preference: 0.10,
        location_preference: 0.08,
        timing_preference: 0.05,
        availability_score: 0.02,
      },
      thresholds: {
        min_overall_score: 0.4,
        min_content_score: 0.3,
        min_schedule_score: 0.2,
        excellent_threshold: 0.85,
        high_threshold: 0.70,
        medium_threshold: 0.55,
      },
      preferences: {
        prioritize_same_teacher: true,
        prioritize_same_time_slot: true,
        prioritize_content_continuity: true,
        include_advanced_suggestions: true,
        max_suggestions_per_day: 3,
        max_suggestions_per_teacher: 2,
      },
    };
  }

  public static getInstance(): MakeUpClassSuggestionService {
    if (!MakeUpClassSuggestionService.instance) {
      MakeUpClassSuggestionService.instance = new MakeUpClassSuggestionService();
    }
    return MakeUpClassSuggestionService.instance;
  }

  /**
   * Generate comprehensive make-up class suggestions
   */
  async generateSuggestions(request: MakeUpSuggestionRequest): Promise<DetailedMakeUpSuggestion[]> {
    return withRetry(async () => {
      // Get original class details
      const originalClass = await this.getOriginalClassDetails(request.original_class_id);
      
      // Get student preferences
      const preferences = request.student_preferences || await this.getStudentPreferences(request.student_id);
      
      // Get potential candidate classes
      const candidateClasses = await this.getCandidateClasses(originalClass, preferences, request.constraints);
      
      // Score and rank candidates
      const scoredSuggestions = await this.scoreAndRankCandidates(
        candidateClasses,
        originalClass,
        preferences,
        request.constraints
      );
      
      // Filter by minimum thresholds
      const filteredSuggestions = scoredSuggestions.filter(
        suggestion => 
          suggestion.overall_compatibility_score >= this.config.thresholds.min_overall_score &&
          suggestion.content_compatibility_score >= this.config.thresholds.min_content_score &&
          suggestion.schedule_preference_score >= this.config.thresholds.min_schedule_score
      );
      
      // Apply diversity and limit constraints
      const finalSuggestions = this.applyDiversityConstraints(
        filteredSuggestions,
        request.max_suggestions || 10
      );
      
      // Generate detailed analysis for each suggestion
      const detailedSuggestions = await this.generateDetailedAnalysis(
        finalSuggestions,
        originalClass,
        preferences
      );
      
      return detailedSuggestions;
    });
  }

  /**
   * Get original class details for comparison
   */
  private async getOriginalClassDetails(classId: string): Promise<any> {
    const { data, error } = await supabase
      .from('classes')
      .select(`
        *,
        course:courses(*),
        teacher:teachers(*),
        class_schedules(
          schedule:schedules(*)
        )
      `)
      .eq('id', classId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch original class details: ${error.message}`);
    }

    return data;
  }

  /**
   * Get student preferences with defaults
   */
  private async getStudentPreferences(studentId: string): Promise<StudentSchedulePreferences> {
    const { data, error } = await supabase
      .from('student_schedule_preferences')
      .select('*')
      .eq('student_id', studentId)
      .single();

    if (error || !data) {
      // Return default preferences
      return {
        student_id: studentId,
        preferred_days: [1, 2, 3, 4, 5],
        preferred_times: {
          '1': ['09:00-12:00', '14:00-17:00'],
          '2': ['09:00-12:00', '14:00-17:00'],
          '3': ['09:00-12:00', '14:00-17:00'],
          '4': ['09:00-12:00', '14:00-17:00'],
          '5': ['09:00-12:00', '14:00-17:00'],
        },
        avoided_times: {},
        preferred_class_size_min: 1,
        preferred_class_size_max: 9,
        preferred_teachers: [],
        avoided_teachers: [],
        preferred_content_pace: 'normal',
        preferred_difficulty_level: 'appropriate',
        max_travel_time_minutes: 30,
        willing_to_change_teacher: true,
        willing_to_join_different_class: true,
        advance_notice_required_hours: 24,
      };
    }

    return data;
  }

  /**
   * Get candidate classes that could serve as make-up options
   */
  private async getCandidateClasses(
    originalClass: any,
    preferences: StudentSchedulePreferences,
    constraints?: SuggestionConstraints
  ): Promise<any[]> {
    let query = supabase
      .from('classes')
      .select(`
        *,
        course:courses(*),
        teacher:teachers(*),
        class_schedules(
          schedule:schedules(*)
        )
      `)
      .eq('course.course_type', originalClass.course.course_type)
      .neq('id', originalClass.id)
      .lt('current_enrollment', 'capacity')
      .gt('capacity', 0);

    // Apply constraints
    if (constraints?.excluded_class_ids?.length) {
      query = query.not('id', 'in', `(${constraints.excluded_class_ids.join(',')})`);
    }

    if (constraints?.excluded_teacher_ids?.length) {
      query = query.not('teacher_id', 'in', `(${constraints.excluded_teacher_ids.join(',')})`);
    }

    const { data, error } = await query.limit(50);

    if (error) {
      throw new Error(`Failed to fetch candidate classes: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Score and rank candidate classes
   */
  private async scoreAndRankCandidates(
    candidates: any[],
    originalClass: any,
    preferences: StudentSchedulePreferences,
    constraints?: SuggestionConstraints
  ): Promise<DetailedMakeUpSuggestion[]> {
    const suggestions: DetailedMakeUpSuggestion[] = [];

    for (const candidate of candidates) {
      const suggestion = await this.scoreSingleCandidate(
        candidate,
        originalClass,
        preferences,
        constraints
      );

      if (suggestion) {
        suggestions.push(suggestion);
      }
    }

    // Sort by overall compatibility score
    return suggestions.sort((a, b) => b.overall_compatibility_score - a.overall_compatibility_score);
  }

  /**
   * Score a single candidate class
   */
  private async scoreSingleCandidate(
    candidate: any,
    originalClass: any,
    preferences: StudentSchedulePreferences,
    constraints?: SuggestionConstraints
  ): Promise<DetailedMakeUpSuggestion | null> {
    try {
      // Calculate individual scores
      const contentScore = await this.calculateContentCompatibilityScore(candidate, originalClass);
      const scheduleScore = this.calculateSchedulePreferenceScore(candidate, preferences);
      const teacherScore = this.calculateTeacherCompatibilityScore(candidate, originalClass, preferences);
      const classSizeScore = this.calculateClassSizePreferenceScore(candidate, preferences);
      const locationScore = this.calculateLocationPreferenceScore(candidate, preferences);
      const timingScore = this.calculateTimingPreferenceScore(candidate, preferences);
      const availabilityScore = this.calculateAvailabilityScore(candidate);

      // Calculate overall weighted score
      const overallScore = 
        (contentScore * this.config.weights.content_compatibility) +
        (scheduleScore * this.config.weights.schedule_preference) +
        (teacherScore * this.config.weights.teacher_compatibility) +
        (classSizeScore * this.config.weights.class_size_preference) +
        (locationScore * this.config.weights.location_preference) +
        (timingScore * this.config.weights.timing_preference) +
        (availabilityScore * this.config.weights.availability_score);

      // Determine recommendation strength
      let recommendationStrength: 'low' | 'medium' | 'high' | 'excellent';
      if (overallScore >= this.config.thresholds.excellent_threshold) {
        recommendationStrength = 'excellent';
      } else if (overallScore >= this.config.thresholds.high_threshold) {
        recommendationStrength = 'high';
      } else if (overallScore >= this.config.thresholds.medium_threshold) {
        recommendationStrength = 'medium';
      } else {
        recommendationStrength = 'low';
      }

      // Generate next available time slot
      const nextAvailableTime = this.calculateNextAvailableTime(candidate);

      const suggestion: DetailedMakeUpSuggestion = {
        id: `suggestion-${candidate.id}`,
        class_id: candidate.id,
        teacher_id: candidate.teacher_id,
        teacher_name: candidate.teacher?.full_name || 'TBD',
        teacher_bio: candidate.teacher?.bio,
        teacher_rating: candidate.teacher?.rating,
        class_name: candidate.class_name || candidate.course?.title || 'Unnamed Class',
        course_type: candidate.course?.course_type || 'Basic',
        start_time: nextAvailableTime.start_time,
        end_time: nextAvailableTime.end_time,
        duration_minutes: candidate.course?.duration_minutes || 60,
        location: candidate.location,
        is_online: candidate.course?.is_online || false,
        meeting_link: candidate.meeting_link,
        current_enrollment: candidate.current_enrollment || 0,
        capacity: candidate.capacity || 9,
        available_spots: (candidate.capacity || 9) - (candidate.current_enrollment || 0),
        
        // Scores
        overall_compatibility_score: overallScore,
        content_compatibility_score: contentScore,
        schedule_preference_score: scheduleScore,
        teacher_compatibility_score: teacherScore,
        class_size_preference_score: classSizeScore,
        location_preference_score: locationScore,
        timing_preference_score: timingScore,
        
        // Detailed analysis (will be populated later)
        content_analysis: {
          similarity_percentage: contentScore * 100,
          matching_topics: [],
          skill_level_alignment: 'appropriate',
          prerequisite_compatibility: true,
          learning_objectives_overlap: contentScore,
        },
        
        scheduling_analysis: {
          day_preference_match: scheduleScore > 0.5,
          time_preference_match: timingScore > 0.5,
          advance_notice_compliance: true,
          travel_time_acceptable: locationScore > 0.5,
          conflicts_with_existing: false,
        },
        
        teacher_analysis: {
          is_preferred_teacher: preferences.preferred_teachers.includes(candidate.teacher_id),
          is_avoided_teacher: preferences.avoided_teachers.includes(candidate.teacher_id),
          teaching_style_match: teacherScore > 0.7 ? 'excellent' : teacherScore > 0.5 ? 'good' : 'fair',
          subject_expertise_match: teacherScore,
          student_history_with_teacher: false,
        },
        
        benefits: this.generateBenefits(candidate, originalClass, preferences, {
          contentScore,
          scheduleScore,
          teacherScore,
          classSizeScore,
          locationScore,
          timingScore,
        }),
        
        considerations: this.generateConsiderations(candidate, originalClass, preferences, {
          contentScore,
          scheduleScore,
          teacherScore,
          classSizeScore,
          locationScore,
          timingScore,
        }),
        
        recommendation_strength: recommendationStrength,
        
        // Additional details
        booking_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        cancellation_policy: 'Standard 24-hour cancellation policy applies',
        make_up_policy: 'Make-up classes available with 24-hour notice',
      };

      return suggestion;
    } catch (error) {
      console.error('Error scoring candidate:', error);
      return null;
    }
  }

  /**
   * Calculate content compatibility score
   */
  private async calculateContentCompatibilityScore(candidate: any, originalClass: any): Promise<number> {
    // If same course type, high compatibility
    if (candidate.course?.course_type === originalClass.course?.course_type) {
      return 0.9;
    }

    // Use content similarity service if available
    try {
      const similarity = await contentSimilarityService.calculateSimilarity(
        originalClass.course_id,
        candidate.course_id
      );
      return similarity?.overallSimilarity || 0.5;
    } catch (error) {
      console.error('Content similarity calculation failed:', error);
      return 0.5; // Default moderate compatibility
    }
  }

  /**
   * Calculate schedule preference score
   */
  private calculateSchedulePreferenceScore(candidate: any, preferences: StudentSchedulePreferences): number {
    let score = 0;

    // Check if any class schedule matches preferred days
    if (candidate.class_schedules?.length > 0) {
      for (const classSchedule of candidate.class_schedules) {
        const schedule = classSchedule.schedule;
        if (schedule && preferences.preferred_days.includes(schedule.day_of_week)) {
          score = Math.max(score, 0.8);
        }
      }
    }

    // If no specific schedule info, assume moderate compatibility
    if (score === 0) {
      score = 0.6;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Calculate teacher compatibility score
   */
  private calculateTeacherCompatibilityScore(
    candidate: any,
    originalClass: any,
    preferences: StudentSchedulePreferences
  ): number {
    // Same teacher as original class
    if (candidate.teacher_id === originalClass.teacher_id) {
      return 1.0;
    }

    // Preferred teacher
    if (preferences.preferred_teachers.includes(candidate.teacher_id)) {
      return 0.9;
    }

    // Avoided teacher
    if (preferences.avoided_teachers.includes(candidate.teacher_id)) {
      return 0.2;
    }

    // Unknown teacher but willing to change
    if (preferences.willing_to_change_teacher) {
      return 0.7;
    }

    // Unknown teacher and not willing to change
    return 0.4;
  }

  /**
   * Calculate class size preference score
   */
  private calculateClassSizePreferenceScore(candidate: any, preferences: StudentSchedulePreferences): number {
    const currentEnrollment = candidate.current_enrollment || 0;
    const capacity = candidate.capacity || 9;

    // Check if current enrollment is within preferred range
    if (currentEnrollment >= preferences.preferred_class_size_min && 
        currentEnrollment <= preferences.preferred_class_size_max) {
      return 1.0;
    }

    // Calculate how far from preferred range
    const minDiff = Math.max(0, preferences.preferred_class_size_min - currentEnrollment);
    const maxDiff = Math.max(0, currentEnrollment - preferences.preferred_class_size_max);
    const totalDiff = minDiff + maxDiff;

    // Normalize to 0-1 scale
    const maxPossibleDiff = Math.max(preferences.preferred_class_size_max, capacity);
    const score = 1 - (totalDiff / maxPossibleDiff);

    return Math.max(0.1, Math.min(1.0, score));
  }

  /**
   * Calculate location preference score
   */
  private calculateLocationPreferenceScore(candidate: any, preferences: StudentSchedulePreferences): number {
    // If online class, generally good unless student prefers offline
    if (candidate.course?.is_online) {
      return 0.8;
    }

    // For offline classes, assume moderate score unless we have location preferences
    // This would be enhanced with actual location data and preferences
    return 0.7;
  }

  /**
   * Calculate timing preference score
   */
  private calculateTimingPreferenceScore(candidate: any, preferences: StudentSchedulePreferences): number {
    // This would be enhanced with actual schedule timing analysis
    // For now, return moderate score
    return 0.7;
  }

  /**
   * Calculate availability score
   */
  private calculateAvailabilityScore(candidate: any): number {
    const currentEnrollment = candidate.current_enrollment || 0;
    const capacity = candidate.capacity || 9;
    const availableSpots = capacity - currentEnrollment;

    // Higher score for more available spots
    return Math.min(1.0, availableSpots / capacity);
  }

  /**
   * Calculate next available time for a class
   */
  private calculateNextAvailableTime(candidate: any): { start_time: string; end_time: string } {
    // This would integrate with actual scheduling data
    // For now, return a default next available time
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const endTime = new Date(tomorrow);
    endTime.setHours(11, 0, 0, 0);

    return {
      start_time: tomorrow.toISOString(),
      end_time: endTime.toISOString(),
    };
  }

  /**
   * Generate benefits list based on scores
   */
  private generateBenefits(
    candidate: any,
    originalClass: any,
    preferences: StudentSchedulePreferences,
    scores: Record<string, number>
  ): string[] {
    const benefits: string[] = [];

    if (scores.contentScore > 0.8) {
      benefits.push('Excellent content match with your original class');
    }

    if (scores.scheduleScore > 0.8) {
      benefits.push('Matches your preferred schedule');
    }

    if (scores.teacherScore > 0.8) {
      benefits.push('Taught by your preferred teacher');
    }

    if (scores.classSizeScore > 0.8) {
      benefits.push('Ideal class size for your learning style');
    }

    if (candidate.course?.is_online) {
      benefits.push('Online format - no travel required');
    }

    if (candidate.available_spots > 3) {
      benefits.push('Plenty of available spots');
    }

    if (benefits.length === 0) {
      benefits.push('Good alternative option available');
    }

    return benefits;
  }

  /**
   * Generate considerations list based on scores
   */
  private generateConsiderations(
    candidate: any,
    originalClass: any,
    preferences: StudentSchedulePreferences,
    scores: Record<string, number>
  ): string[] {
    const considerations: string[] = [];

    if (scores.contentScore < 0.6) {
      considerations.push('Content may differ from your original class');
    }

    if (scores.scheduleScore < 0.6) {
      considerations.push('Schedule may not match your preferred times');
    }

    if (scores.teacherScore < 0.6) {
      considerations.push('Different teacher than preferred');
    }

    if (candidate.available_spots === 1) {
      considerations.push('Limited availability - book soon');
    }

    if (!candidate.course?.is_online && candidate.location) {
      considerations.push('In-person class - consider travel time');
    }

    return considerations;
  }

  /**
   * Apply diversity constraints to ensure variety in suggestions
   */
  private applyDiversityConstraints(
    suggestions: DetailedMakeUpSuggestion[],
    maxSuggestions: number
  ): DetailedMakeUpSuggestion[] {
    const finalSuggestions: DetailedMakeUpSuggestion[] = [];
    const teacherCount: Record<string, number> = {};
    const dayCount: Record<string, number> = {};

    for (const suggestion of suggestions) {
      if (finalSuggestions.length >= maxSuggestions) break;

      const teacherId = suggestion.teacher_id;
      const day = new Date(suggestion.start_time).getDay().toString();

      // Apply teacher diversity constraint
      if ((teacherCount[teacherId] || 0) >= this.config.preferences.max_suggestions_per_teacher) {
        continue;
      }

      // Apply day diversity constraint
      if ((dayCount[day] || 0) >= this.config.preferences.max_suggestions_per_day) {
        continue;
      }

      finalSuggestions.push(suggestion);
      teacherCount[teacherId] = (teacherCount[teacherId] || 0) + 1;
      dayCount[day] = (dayCount[day] || 0) + 1;
    }

    return finalSuggestions;
  }

  /**
   * Generate detailed analysis for final suggestions
   */
  private async generateDetailedAnalysis(
    suggestions: DetailedMakeUpSuggestion[],
    originalClass: any,
    preferences: StudentSchedulePreferences
  ): Promise<DetailedMakeUpSuggestion[]> {
    // For now, return suggestions as-is
    // This would be enhanced with more detailed analysis
    return suggestions;
  }

  /**
   * Update algorithm configuration
   */
  updateConfiguration(newConfig: Partial<SuggestionAlgorithmConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current algorithm configuration
   */
  getConfiguration(): SuggestionAlgorithmConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const makeUpClassSuggestionService = MakeUpClassSuggestionService.getInstance();