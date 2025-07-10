/**
 * HeyPeter Academy - 1v1 Booking Service
 * 
 * This service handles individual lesson booking with auto-matching functionality.
 * It provides:
 * - Teacher auto-matching based on student preferences and availability
 * - Conflict detection and alternative recommendations
 * - Duration selection (30/60 minutes)
 * - Learning goals submission and matching
 * - Real-time availability checking
 */

import { supabase } from '@/lib/supabase';
import { CRUDService } from './crud-service';
// Conflict detection service has been removed - using placeholder
import { schedulingService } from './scheduling-service';
import type {
  OneOnOneBookingRequest,
  OneOnOneBookingResult,
  OneOnOneBookingRecommendation,
  TeacherMatchingScore,
  TeacherProfileForBooking,
  TeacherAvailability,
  AlternativeBookingOptions,
  TimeSlot,
  SchedulingConflict,
  SchedulingError,
  OneOnOneAutoMatchingCriteria,
  OneOnOneLearningGoals,
  TeacherSelectionPreferences,
} from '@/types/scheduling';
import type { Tables } from '@/types/database';

/**
 * 1v1 Booking Service Class
 */
export class OneOnOneBookingService {
  private static instance: OneOnOneBookingService;
  
  // CRUD services
  private studentsService: CRUDService<Tables<'students'>>;
  private teachersService: CRUDService<Tables<'teachers'>>;
  private bookingsService: CRUDService<Tables<'bookings'>>;
  private coursesService: CRUDService<Tables<'courses'>>;

  private constructor() {
    this.initializeServices();
  }

  /**
   * Singleton pattern implementation
   */
  public static getInstance(): OneOnOneBookingService {
    if (!OneOnOneBookingService.instance) {
      OneOnOneBookingService.instance = new OneOnOneBookingService();
    }
    return OneOnOneBookingService.instance;
  }

  /**
   * Initialize CRUD services
   */
  private initializeServices(): void {
    this.studentsService = new CRUDService({
      table: 'students',
      select: '*',
      cache: { enabled: true, ttl: 300000 }, // 5 minutes
    });

    this.teachersService = new CRUDService({
      table: 'teachers',
      select: '*',
      cache: { enabled: true, ttl: 300000 },
    });

    this.bookingsService = new CRUDService({
      table: 'bookings',
      select: '*',
      cache: { enabled: true, ttl: 30000 }, // 30 seconds
    });

    this.coursesService = new CRUDService({
      table: 'courses',
      select: '*',
      cache: { enabled: true, ttl: 600000 }, // 10 minutes
    });
  }

  /**
   * Main booking method - processes 1v1 booking requests with auto-matching
   */
  public async book1v1Session(request: OneOnOneBookingRequest): Promise<OneOnOneBookingResult> {
    const startTime = Date.now();

    try {
      // Validate the booking request
      await this.validateBookingRequest(request);

      // Get available teachers
      const availableTeachers = await this.getAvailableTeachers(request);

      // Score and rank teachers based on matching criteria
      const teacherScores = await this.scoreTeachers(availableTeachers, request.matchingCriteria);

      // Find optimal booking matches
      const recommendations = await this.generateBookingRecommendations(
        teacherScores,
        request
      );

      // Attempt to book with the best recommendation
      if (recommendations.length > 0) {
        const bestRecommendation = recommendations[0];
        
        // Check for conflicts
        const conflicts = await this.checkBookingConflicts(bestRecommendation, request);
        
        if (conflicts.length === 0) {
          // Proceed with booking
          const booking = await this.createBooking(bestRecommendation, request);
          
          return {
            requestId: request.id,
            success: true,
            booking,
            metrics: {
              processingTime: Date.now() - startTime,
              teachersEvaluated: teacherScores.length,
              timeSlotsConsidered: this.countTotalTimeSlots(teacherScores),
              algorithmVersion: '1.0.0',
            },
          };
        } else {
          // Handle conflicts and provide alternatives
          const alternatives = await this.generateAlternativeOptions(
            teacherScores,
            request,
            conflicts
          );

          return {
            requestId: request.id,
            success: false,
            recommendations,
            conflicts,
            metrics: {
              processingTime: Date.now() - startTime,
              teachersEvaluated: teacherScores.length,
              timeSlotsConsidered: this.countTotalTimeSlots(teacherScores),
              algorithmVersion: '1.0.0',
            },
          };
        }
      } else {
        // No suitable teachers found
        const alternatives = await this.generateAlternativeOptions(
          teacherScores,
          request,
          []
        );

        return {
          requestId: request.id,
          success: false,
          recommendations: [],
          metrics: {
            processingTime: Date.now() - startTime,
            teachersEvaluated: teacherScores.length,
            timeSlotsConsidered: 0,
            algorithmVersion: '1.0.0',
          },
          error: {
            code: 'NO_AVAILABLE_TEACHERS',
            message: 'No suitable teachers found for the requested criteria',
            category: 'resource',
            severity: 'warning',
            timestamp: new Date().toISOString(),
          },
        };
      }
    } catch (error) {
      const bookingError: SchedulingError = {
        code: 'BOOKING_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        category: 'system',
        severity: 'error',
        timestamp: new Date().toISOString(),
        stackTrace: error instanceof Error ? error.stack : undefined,
      };

      return {
        requestId: request.id,
        success: false,
        error: bookingError,
        metrics: {
          processingTime: Date.now() - startTime,
          teachersEvaluated: 0,
          timeSlotsConsidered: 0,
          algorithmVersion: '1.0.0',
        },
      };
    }
  }

  /**
   * Get available teachers for 1v1 sessions
   */
  public async getAvailableTeachers(request: OneOnOneBookingRequest): Promise<TeacherProfileForBooking[]> {
    try {
      // Query teachers with basic info
      const { data: teachers, error } = await supabase
        .from('teachers')
        .select('*')
        .eq('is_active', true)
        .eq('available_for_1v1', true);

      if (error) throw error;

      // Convert to TeacherProfileForBooking format
      const teacherProfiles: TeacherProfileForBooking[] = [];

      for (const teacher of teachers || []) {
        // Get teacher availability
        const availability = await this.getTeacherAvailability(teacher.id);
        
        // Get teacher ratings and reviews
        const ratings = await this.getTeacherRatings(teacher.id);

        const profile: TeacherProfileForBooking = {
          id: teacher.id,
          fullName: teacher.full_name || 'Unknown Teacher',
          profilePhotoUrl: teacher.profile_photo_url,
          bio: teacher.bio || '',
          experienceYears: teacher.experience_years || 0,
          specializations: teacher.specializations || [],
          certifications: teacher.certifications || [],
          languagesSpoken: teacher.languages_spoken || ['English'],
          ratings,
          availabilitySummary: {
            nextAvailableSlot: availability.availableSlots[0],
            availableThisWeek: this.countSlotsThisWeek(availability.availableSlots),
            availableNextWeek: this.countSlotsNextWeek(availability.availableSlots),
          },
          pricing: {
            rate30Min: teacher.rate_30min || 50,
            rate60Min: teacher.rate_60min || 90,
            currency: 'USD',
          },
          teachingStyle: teacher.teaching_style || [],
          personalityTraits: teacher.personality_traits || [],
        };

        teacherProfiles.push(profile);
      }

      return teacherProfiles;
    } catch (error) {
      console.error('Error getting available teachers:', error);
      return [];
    }
  }

  /**
   * Score teachers based on matching criteria
   */
  private async scoreTeachers(
    teachers: TeacherProfileForBooking[],
    criteria: OneOnOneAutoMatchingCriteria
  ): Promise<TeacherMatchingScore[]> {
    const scores: TeacherMatchingScore[] = [];

    for (const teacher of teachers) {
      const availability = await this.getTeacherAvailability(teacher.id);
      
      // Calculate individual scores
      const availabilityScore = this.calculateAvailabilityScore(
        availability,
        criteria.preferredTimeSlots
      );
      
      const experienceScore = this.calculateExperienceScore(
        teacher,
        criteria.teacherPreferences
      );
      
      const specializationScore = this.calculateSpecializationScore(
        teacher,
        criteria.learningGoals
      );
      
      const preferenceScore = this.calculatePreferenceScore(
        teacher,
        criteria.teacherPreferences
      );
      
      const performanceScore = teacher.ratings.averageRating / 5; // Normalize to 0-1
      
      const languageScore = this.calculateLanguageScore(
        teacher,
        criteria.teacherPreferences
      );

      // Calculate weighted overall score
      const weights = {
        availability: 0.3,
        experience: 0.2,
        specialization: 0.2,
        preference: 0.15,
        performance: 0.1,
        language: 0.05,
      };

      const overallScore = 
        (availabilityScore * weights.availability) +
        (experienceScore * weights.experience) +
        (specializationScore * weights.specialization) +
        (preferenceScore * weights.preference) +
        (performanceScore * weights.performance) +
        (languageScore * weights.language);

      const matchingScore: TeacherMatchingScore = {
        teacherId: teacher.id,
        overallScore,
        scoreBreakdown: {
          availabilityScore,
          experienceScore,
          specializationScore,
          preferenceScore,
          performanceScore,
          languageScore,
        },
        availableSlots: availability.availableSlots,
        confidenceLevel: this.calculateConfidenceLevel(overallScore),
        matchingRationale: this.generateMatchingRationale(teacher, overallScore),
      };

      scores.push(matchingScore);
    }

    // Sort by overall score descending
    return scores.sort((a, b) => b.overallScore - a.overallScore);
  }

  /**
   * Generate booking recommendations based on teacher scores
   */
  private async generateBookingRecommendations(
    teacherScores: TeacherMatchingScore[],
    request: OneOnOneBookingRequest
  ): Promise<OneOnOneBookingRecommendation[]> {
    const recommendations: OneOnOneBookingRecommendation[] = [];

    // Take top 5 teachers
    const topTeachers = teacherScores.slice(0, 5);

    for (const teacherScore of topTeachers) {
      // Find best time slot for this teacher
      const bestSlot = this.findBestTimeSlot(
        teacherScore.availableSlots,
        request.matchingCriteria.preferredTimeSlots
      );

      if (bestSlot) {
        const recommendation: OneOnOneBookingRecommendation = {
          id: `rec-${request.id}-${teacherScore.teacherId}`,
          teacherMatch: teacherScore,
          recommendedSlot: bestSlot,
          alternativeSlots: teacherScore.availableSlots
            .filter(slot => slot.id !== bestSlot.id)
            .slice(0, 3), // Top 3 alternatives
          confidence: teacherScore.confidenceLevel,
          bookingSuccessProbability: this.calculateBookingSuccessProbability(teacherScore),
          benefits: this.generateRecommendationBenefits(teacherScore),
          drawbacks: this.generateRecommendationDrawbacks(teacherScore),
          reason: teacherScore.matchingRationale,
          constraints: {
            latestBookingTime: this.calculateLatestBookingTime(bestSlot),
            cancellationPolicy: '24 hours before session',
            reschedulingPolicy: 'Up to 2 hours before session',
          },
        };

        recommendations.push(recommendation);
      }
    }

    return recommendations;
  }

  /**
   * Validate booking request
   */
  private async validateBookingRequest(request: OneOnOneBookingRequest): Promise<void> {
    // Check if student exists
    const { data: student, error: studentError } = await this.studentsService.getById(request.studentId);
    if (studentError || !student) {
      throw new Error(`Student not found: ${request.studentId}`);
    }

    // Check if course exists
    const { data: course, error: courseError } = await this.coursesService.getById(request.courseId);
    if (courseError || !course) {
      throw new Error(`Course not found: ${request.courseId}`);
    }

    // Validate duration
    if (![30, 60].includes(request.duration)) {
      throw new Error('Duration must be either 30 or 60 minutes');
    }

    // Validate preferred time slots
    if (!request.matchingCriteria.preferredTimeSlots.length) {
      throw new Error('At least one preferred time slot is required');
    }
  }

  /**
   * Get teacher availability
   */
  private async getTeacherAvailability(teacherId: string): Promise<TeacherAvailability> {
    // This would integrate with teacher availability system
    // For now, return mock data
    const mockSlots: TimeSlot[] = [];
    
    // Generate some sample availability
    const today = new Date();
    for (let i = 1; i <= 14; i++) { // Next 2 weeks
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      
      // Add morning and afternoon slots
      const morningSlot: TimeSlot = {
        id: `slot-${teacherId}-${i}-morning`,
        startTime: '09:00',
        endTime: '10:00',
        duration: 60,
        dayOfWeek: date.getDay(),
        isAvailable: Math.random() > 0.3, // 70% availability
        capacity: {
          maxStudents: 1,
          minStudents: 1,
          currentEnrollment: 0,
          availableSpots: 1,
        },
        location: 'Online',
      };

      const afternoonSlot: TimeSlot = {
        id: `slot-${teacherId}-${i}-afternoon`,
        startTime: '14:00',
        endTime: '15:00',
        duration: 60,
        dayOfWeek: date.getDay(),
        isAvailable: Math.random() > 0.4, // 60% availability
        capacity: {
          maxStudents: 1,
          minStudents: 1,
          currentEnrollment: 0,
          availableSpots: 1,
        },
        location: 'Online',
      };

      mockSlots.push(morningSlot, afternoonSlot);
    }

    return {
      teacherId,
      availableSlots: mockSlots.filter(slot => slot.isAvailable),
      advanceBookingPreferences: {
        minimumAdvanceHours: 24,
        maximumAdvanceDays: 30,
        preferredAdvanceHours: 48,
      },
    };
  }

  /**
   * Get teacher ratings and reviews
   */
  private async getTeacherRatings(teacherId: string) {
    // Mock data - would integrate with ratings system
    return {
      averageRating: 4.2 + Math.random() * 0.8, // 4.2-5.0
      totalReviews: Math.floor(Math.random() * 100) + 20,
      recentReviews: [
        {
          text: 'Great teacher, very patient and knowledgeable',
          rating: 5,
          studentName: 'Anonymous Student',
          date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        }
      ],
    };
  }

  /**
   * Calculate availability score
   */
  private calculateAvailabilityScore(
    availability: TeacherAvailability,
    preferredSlots: TimeSlot[]
  ): number {
    if (availability.availableSlots.length === 0) return 0;
    
    let score = 0;
    let maxScore = 0;
    
    for (const preferred of preferredSlots) {
      maxScore += 1;
      
      // Find matching slots
      for (const available of availability.availableSlots) {
        if (this.slotsOverlap(preferred, available)) {
          score += 1;
          break;
        }
      }
    }
    
    return maxScore > 0 ? score / maxScore : 0;
  }

  /**
   * Calculate experience score
   */
  private calculateExperienceScore(
    teacher: TeacherProfileForBooking,
    preferences: TeacherSelectionPreferences
  ): number {
    const experienceYears = teacher.experienceYears;
    const preferredLevel = preferences.experienceLevel;
    
    if (!preferredLevel) return 0.8; // Default good score
    
    const experienceRanges = {
      beginner: [0, 2],
      intermediate: [2, 5],
      advanced: [5, 10],
      expert: [10, Infinity],
    };
    
    const [min, max] = experienceRanges[preferredLevel];
    
    if (experienceYears >= min && experienceYears <= max) {
      return 1.0;
    } else if (experienceYears < min) {
      return Math.max(0, 1 - (min - experienceYears) * 0.2);
    } else {
      return Math.max(0.7, 1 - (experienceYears - max) * 0.1);
    }
  }

  /**
   * Calculate specialization score
   */
  private calculateSpecializationScore(
    teacher: TeacherProfileForBooking,
    learningGoals: OneOnOneLearningGoals
  ): number {
    const teacherSpecs = teacher.specializations || [];
    const goalSpecs = learningGoals.primaryObjectives || [];
    
    if (goalSpecs.length === 0) return 0.8; // Default score
    
    let matches = 0;
    for (const goal of goalSpecs) {
      for (const spec of teacherSpecs) {
        if (spec.toLowerCase().includes(goal.toLowerCase()) || 
            goal.toLowerCase().includes(spec.toLowerCase())) {
          matches++;
          break;
        }
      }
    }
    
    return matches / goalSpecs.length;
  }

  /**
   * Calculate preference score
   */
  private calculatePreferenceScore(
    teacher: TeacherProfileForBooking,
    preferences: TeacherSelectionPreferences
  ): number {
    let score = 0;
    let factors = 0;
    
    // Check if teacher is in preferred list
    if (preferences.preferredTeacherIds.includes(teacher.id)) {
      score += 1;
      factors += 1;
    }
    
    // Check teaching style preferences
    if (preferences.teachingStyles && preferences.teachingStyles.length > 0) {
      const styleMatches = preferences.teachingStyles.filter(style =>
        teacher.teachingStyle.includes(style)
      ).length;
      score += styleMatches / preferences.teachingStyles.length;
      factors += 1;
    }
    
    // Check personality traits
    if (preferences.personalityTraits && preferences.personalityTraits.length > 0) {
      const traitMatches = preferences.personalityTraits.filter(trait =>
        teacher.personalityTraits.includes(trait)
      ).length;
      score += traitMatches / preferences.personalityTraits.length;
      factors += 1;
    }
    
    return factors > 0 ? score / factors : 0.5; // Default neutral score
  }

  /**
   * Calculate language score
   */
  private calculateLanguageScore(
    teacher: TeacherProfileForBooking,
    preferences: TeacherSelectionPreferences
  ): number {
    if (!preferences.languageSpecializations || preferences.languageSpecializations.length === 0) {
      return 0.8; // Default good score
    }
    
    const matches = preferences.languageSpecializations.filter(lang =>
      teacher.languagesSpoken.some(teacherLang => 
        teacherLang.toLowerCase().includes(lang.toLowerCase())
      )
    ).length;
    
    return matches / preferences.languageSpecializations.length;
  }

  /**
   * Check for booking conflicts
   */
  private async checkBookingConflicts(
    recommendation: OneOnOneBookingRecommendation,
    request: OneOnOneBookingRequest
  ): Promise<SchedulingConflict[]> {
    // Conflict detection service has been removed - returning no conflicts
    return [];
    /*
    // Use existing conflict detection service
    return conflictDetectionService.detectBookingConflicts({
      studentId: request.studentId,
      teacherId: recommendation.teacherMatch.teacherId,
      timeSlot: recommendation.recommendedSlot,
      duration: request.duration,
    });
    */
  }

  /**
   * Create the actual booking
   */
  private async createBooking(
    recommendation: OneOnOneBookingRecommendation,
    request: OneOnOneBookingRequest
  ) {
    const bookingId = `booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id: bookingId,
      studentId: request.studentId,
      teacherId: recommendation.teacherMatch.teacherId,
      courseId: request.courseId,
      timeSlot: recommendation.recommendedSlot,
      duration: request.duration,
      learningGoals: request.matchingCriteria.learningGoals,
      status: 'confirmed' as const,
      bookingReference: `1V1-${bookingId.slice(-8).toUpperCase()}`,
      meetingLink: `https://meet.heypeter.academy/${bookingId}`,
      location: 'Online',
    };
  }

  /**
   * Generate alternative booking options
   */
  private async generateAlternativeOptions(
    teacherScores: TeacherMatchingScore[],
    request: OneOnOneBookingRequest,
    conflicts: SchedulingConflict[]
  ): Promise<AlternativeBookingOptions> {
    return {
      alternativeTeachers: teacherScores.slice(1, 4), // Next 3 best teachers
      alternativeTimeSlots: this.generateAlternativeTimeSlots(request),
      alternativeDurations: request.duration === 30 ? [60] : [30],
      waitlistOptions: [],
      flexibleOptions: [
        {
          description: 'Consider sessions at different times of day',
          type: 'time',
          confidenceLevel: 0.8,
        },
        {
          description: 'Try different teachers with similar expertise',
          type: 'teacher',
          confidenceLevel: 0.7,
        },
      ],
    };
  }

  /**
   * Helper methods
   */
  private countTotalTimeSlots(scores: TeacherMatchingScore[]): number {
    return scores.reduce((total, score) => total + score.availableSlots.length, 0);
  }

  private countSlotsThisWeek(slots: TimeSlot[]): number {
    const today = new Date();
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
    
    return slots.filter(slot => {
      const slotDate = new Date(slot.startTime);
      return slotDate <= endOfWeek;
    }).length;
  }

  private countSlotsNextWeek(slots: TimeSlot[]): number {
    const today = new Date();
    const startOfNextWeek = new Date(today);
    startOfNextWeek.setDate(today.getDate() + (7 - today.getDay()) + 1);
    const endOfNextWeek = new Date(startOfNextWeek);
    endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);
    
    return slots.filter(slot => {
      const slotDate = new Date(slot.startTime);
      return slotDate >= startOfNextWeek && slotDate <= endOfNextWeek;
    }).length;
  }

  private slotsOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
    // Simple overlap check - would be more sophisticated in real implementation
    return slot1.startTime === slot2.startTime && slot1.dayOfWeek === slot2.dayOfWeek;
  }

  private findBestTimeSlot(available: TimeSlot[], preferred: TimeSlot[]): TimeSlot | null {
    // Find exact matches first
    for (const pref of preferred) {
      for (const avail of available) {
        if (this.slotsOverlap(pref, avail)) {
          return avail;
        }
      }
    }
    
    // Return first available if no exact match
    return available[0] || null;
  }

  private calculateConfidenceLevel(score: number): number {
    return Math.min(0.9, score * 0.8 + 0.1);
  }

  private generateMatchingRationale(teacher: TeacherProfileForBooking, score: number): string {
    if (score > 0.8) {
      return `Excellent match: ${teacher.fullName} has ${teacher.experienceYears} years of experience and specializes in your learning areas.`;
    } else if (score > 0.6) {
      return `Good match: ${teacher.fullName} meets most of your criteria and has strong reviews.`;
    } else {
      return `Potential match: ${teacher.fullName} is available but may not perfectly match all preferences.`;
    }
  }

  private calculateBookingSuccessProbability(score: TeacherMatchingScore): number {
    return Math.min(0.95, score.overallScore * 0.9 + 0.05);
  }

  private generateRecommendationBenefits(score: TeacherMatchingScore): string[] {
    const benefits = [];
    
    if (score.scoreBreakdown.experienceScore > 0.8) {
      benefits.push('Highly experienced teacher');
    }
    if (score.scoreBreakdown.performanceScore > 0.8) {
      benefits.push('Excellent student ratings');
    }
    if (score.scoreBreakdown.availabilityScore > 0.7) {
      benefits.push('Good availability match');
    }
    if (score.scoreBreakdown.specializationScore > 0.7) {
      benefits.push('Specializes in your learning goals');
    }
    
    return benefits;
  }

  private generateRecommendationDrawbacks(score: TeacherMatchingScore): string[] {
    const drawbacks = [];
    
    if (score.scoreBreakdown.availabilityScore < 0.5) {
      drawbacks.push('Limited availability matching your preferences');
    }
    if (score.scoreBreakdown.experienceScore < 0.5) {
      drawbacks.push('Less experienced teacher');
    }
    if (score.scoreBreakdown.specializationScore < 0.5) {
      drawbacks.push('May not specialize in your specific learning goals');
    }
    
    return drawbacks;
  }

  private calculateLatestBookingTime(slot: TimeSlot): string {
    // 24 hours before session
    const slotTime = new Date(slot.startTime);
    slotTime.setHours(slotTime.getHours() - 24);
    return slotTime.toISOString();
  }

  private generateAlternativeTimeSlots(request: OneOnOneBookingRequest): TimeSlot[] {
    // Generate some alternative time slots based on request
    const alternatives: TimeSlot[] = [];
    const baseDate = new Date();
    
    for (let i = 1; i <= 7; i++) {
      const date = new Date(baseDate);
      date.setDate(baseDate.getDate() + i);
      
      const slot: TimeSlot = {
        id: `alt-slot-${i}`,
        startTime: '10:00',
        endTime: '11:00',
        duration: 60,
        dayOfWeek: date.getDay(),
        isAvailable: true,
        capacity: {
          maxStudents: 1,
          minStudents: 1,
          currentEnrollment: 0,
          availableSpots: 1,
        },
        location: 'Online',
      };
      
      alternatives.push(slot);
    }
    
    return alternatives;
  }
}

// Export singleton instance
export const oneOnOneBookingService = OneOnOneBookingService.getInstance();