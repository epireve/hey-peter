/**
 * HeyPeter Academy - Alternative Class Recommendation Service
 * 
 * This service provides intelligent recommendations when students can't join their
 * preferred classes due to capacity or scheduling conflicts. It generates alternative
 * class recommendations based on:
 * - Content similarity and learning progression
 * - Time slot alternatives that fit student schedules
 * - Teacher matching based on teaching style and student needs
 * - Course level and difficulty matching
 * - Distance/location optimization for offline classes
 * - Waitlist options and priority booking
 */

import { supabase } from '@/lib/supabase';
import { CRUDService, withRetry } from './crud-service';
import { contentAnalysisService } from './content-analysis-service';
// Conflict detection service has been removed - using placeholder
import type {
  TimeSlot,
  LearningContent,
  StudentProgress,
  ScheduledClass,
  SchedulingRecommendation,
  SchedulingConflict,
  StudentPerformanceMetrics,
  ClassCapacityConstraint,
  CourseType,
  SchedulingPriority
} from '@/types/scheduling';
import type { Tables } from '@/types/database';

/**
 * Alternative class recommendation types
 */
export interface ClassRecommendationRequest {
  /** Student ID requesting the recommendation */
  studentId: string;
  /** Preferred class that is full or has conflicts */
  preferredClassId: string;
  /** Preferred time slots */
  preferredTimeSlots: TimeSlot[];
  /** Course type */
  courseType: CourseType;
  /** Maximum distance for offline classes (km) */
  maxDistance?: number;
  /** Include waitlist options */
  includeWaitlist?: boolean;
  /** Priority level of the request */
  priority: SchedulingPriority;
}

export interface AlternativeClassRecommendation {
  /** Recommendation ID */
  id: string;
  /** Alternative class details */
  alternativeClass: ScheduledClass;
  /** Overall recommendation score (0-100) */
  overallScore: number;
  /** Scoring breakdown */
  scoreBreakdown: RecommendationScoreBreakdown;
  /** Recommendation type */
  type: 'content_similar' | 'time_alternative' | 'teacher_match' | 'waitlist' | 'location_optimized';
  /** Recommendation reasoning */
  reasoning: string;
  /** Benefits of this alternative */
  benefits: string[];
  /** Potential drawbacks */
  drawbacks: string[];
  /** Confidence level (0-1) */
  confidenceLevel: number;
  /** Availability status */
  availability: 'immediate' | 'limited_spots' | 'waitlist' | 'unavailable';
  /** Distance from student (for offline classes) */
  distance?: number;
  /** Estimated wait time if waitlisted */
  estimatedWaitTime?: number;
}

export interface RecommendationScoreBreakdown {
  /** Content similarity score (0-100) */
  contentSimilarity: number;
  /** Schedule compatibility score (0-100) */
  scheduleCompatibility: number;
  /** Teacher compatibility score (0-100) */
  teacherCompatibility: number;
  /** Learning pace match score (0-100) */
  learningPaceMatch: number;
  /** Difficulty level match score (0-100) */
  difficultyMatch: number;
  /** Location convenience score (0-100) */
  locationConvenience: number;
  /** Peer compatibility score (0-100) */
  peerCompatibility: number;
  /** Class size preference score (0-100) */
  classSizePreference: number;
}

export interface RecommendationWeights {
  /** Weight for content similarity (default: 0.25) */
  contentSimilarity: number;
  /** Weight for schedule compatibility (default: 0.20) */
  scheduleCompatibility: number;
  /** Weight for teacher compatibility (default: 0.15) */
  teacherCompatibility: number;
  /** Weight for learning pace match (default: 0.10) */
  learningPaceMatch: number;
  /** Weight for difficulty level match (default: 0.10) */
  difficultyMatch: number;
  /** Weight for location convenience (default: 0.08) */
  locationConvenience: number;
  /** Weight for peer compatibility (default: 0.07) */
  peerCompatibility: number;
  /** Weight for class size preference (default: 0.05) */
  classSizePreference: number;
}

export interface WaitlistRecommendation {
  /** Class ID for waitlist */
  classId: string;
  /** Current position in waitlist */
  waitlistPosition: number;
  /** Estimated wait time in days */
  estimatedWaitDays: number;
  /** Probability of getting spot (0-1) */
  probabilityOfSpot: number;
  /** Recommended alternative while waiting */
  interimRecommendations: AlternativeClassRecommendation[];
}

/**
 * Main class recommendation service
 */
export class ClassRecommendationService {
  private defaultWeights: RecommendationWeights;
  private crudService: CRUDService<any>;

  constructor() {
    this.defaultWeights = {
      contentSimilarity: 0.25,
      scheduleCompatibility: 0.20,
      teacherCompatibility: 0.15,
      learningPaceMatch: 0.10,
      difficultyMatch: 0.10,
      locationConvenience: 0.08,
      peerCompatibility: 0.07,
      classSizePreference: 0.05,
    };

    this.crudService = new CRUDService({
      table: 'classes',
      cache: {
        enabled: true,
        ttl: 5 * 60 * 1000, // 5 minutes
      },
    });
  }

  /**
   * Generate alternative class recommendations when preferred class is full
   */
  async generateAlternativeRecommendations(
    request: ClassRecommendationRequest,
    customWeights?: Partial<RecommendationWeights>
  ): Promise<AlternativeClassRecommendation[]> {
    return withRetry(async () => {
      const weights = { ...this.defaultWeights, ...customWeights };
      
      // Get student progress and preferences
      const studentProgress = await this.getStudentProgress(request.studentId);
      const studentPreferences = await this.getStudentPreferences(request.studentId);
      
      // Get preferred class details
      const preferredClass = await this.getClassDetails(request.preferredClassId);
      if (!preferredClass) {
        throw new Error(`Preferred class ${request.preferredClassId} not found`);
      }

      // Find alternative classes
      const contentSimilarClasses = await this.findContentSimilarClasses(
        request.studentId,
        preferredClass,
        request.courseType
      );
      
      const timeAlternativeClasses = await this.findTimeAlternatives(
        request.preferredTimeSlots,
        request.courseType,
        request.studentId
      );
      
      const teacherMatchClasses = await this.findTeacherMatches(
        request.studentId,
        studentProgress,
        request.courseType
      );

      // Combine and deduplicate alternatives
      const allAlternatives = this.deduplicateClasses([
        ...contentSimilarClasses,
        ...timeAlternativeClasses,
        ...teacherMatchClasses,
      ]);

      // Score and rank alternatives
      const recommendations: AlternativeClassRecommendation[] = [];
      
      for (const alternativeClass of allAlternatives) {
        // Check availability
        const availability = await this.checkClassAvailability(alternativeClass.id, request.studentId);
        if (availability === 'unavailable') continue;

        // Calculate comprehensive score
        const scoreBreakdown = await this.calculateScoreBreakdown(
          request.studentId,
          alternativeClass,
          preferredClass,
          studentProgress,
          studentPreferences,
          request.maxDistance
        );

        const overallScore = this.calculateOverallScore(scoreBreakdown, weights);
        
        // Determine recommendation type
        const type = this.determineRecommendationType(
          alternativeClass,
          preferredClass,
          scoreBreakdown
        );

        // Generate reasoning and benefits/drawbacks
        const reasoning = this.generateReasoning(
          type,
          scoreBreakdown,
          alternativeClass,
          preferredClass
        );
        
        const { benefits, drawbacks } = this.generateBenefitsDrawbacks(
          type,
          scoreBreakdown,
          alternativeClass,
          preferredClass
        );

        // Calculate confidence level
        const confidenceLevel = this.calculateConfidenceLevel(
          scoreBreakdown,
          overallScore,
          availability
        );

        // Calculate distance if applicable
        const distance = await this.calculateDistance(
          request.studentId,
          alternativeClass,
          request.maxDistance
        );

        recommendations.push({
          id: `rec-${alternativeClass.id}-${Date.now()}`,
          alternativeClass,
          overallScore,
          scoreBreakdown,
          type,
          reasoning,
          benefits,
          drawbacks,
          confidenceLevel,
          availability,
          distance,
        });
      }

      // Sort by overall score and confidence
      recommendations.sort((a, b) => {
        const scoreA = a.overallScore * a.confidenceLevel;
        const scoreB = b.overallScore * b.confidenceLevel;
        return scoreB - scoreA;
      });

      // Add waitlist recommendations if requested
      if (request.includeWaitlist) {
        const waitlistRec = await this.generateWaitlistRecommendation(
          request.preferredClassId,
          request.studentId
        );
        
        if (waitlistRec) {
          // Add waitlist as a special recommendation
          recommendations.unshift({
            id: `waitlist-${request.preferredClassId}`,
            alternativeClass: preferredClass,
            overallScore: 95, // High score for preferred class
            scoreBreakdown: await this.calculateScoreBreakdown(
              request.studentId,
              preferredClass,
              preferredClass,
              studentProgress,
              studentPreferences,
              request.maxDistance
            ),
            type: 'waitlist',
            reasoning: `Join waitlist for your preferred class. Estimated wait time: ${waitlistRec.estimatedWaitDays} days.`,
            benefits: [
              'Original preferred class',
              'Highest content relevance',
              'Preferred teacher and time slot'
            ],
            drawbacks: [
              `Wait time of ${waitlistRec.estimatedWaitDays} days`,
              'No guarantee of spot',
              'May need interim alternatives'
            ],
            confidenceLevel: waitlistRec.probabilityOfSpot,
            availability: 'waitlist',
            estimatedWaitTime: waitlistRec.estimatedWaitDays,
          });
        }
      }

      return recommendations.slice(0, 10); // Return top 10 recommendations
    });
  }

  /**
   * Find classes with similar content to the preferred class
   */
  private async findContentSimilarClasses(
    studentId: string,
    preferredClass: ScheduledClass,
    courseType: CourseType
  ): Promise<ScheduledClass[]> {
    const { data: similarClasses } = await supabase
      .from('classes')
      .select(`
        *,
        teacher:teachers(*),
        course:courses(*)
      `)
      .eq('course.type', courseType)
      .eq('is_active', true)
      .neq('id', preferredClass.id);

    if (!similarClasses) return [];

    // Analyze content similarity using the content analysis service
    const studentProgress = await contentAnalysisService.analyzeStudentProgress(studentId);
    const unlearnedContent = await contentAnalysisService.identifyUnlearnedContent(studentId);

    // Filter classes based on content alignment
    const contentSimilar: ScheduledClass[] = [];
    
    for (const cls of similarClasses) {
      // Check if this class covers similar unlearned content
      const contentMatch = await this.analyzeContentMatch(cls, unlearnedContent);
      if (contentMatch > 0.6) { // 60% content similarity threshold
        contentSimilar.push(this.mapToScheduledClass(cls));
      }
    }

    return contentSimilar;
  }

  /**
   * Find alternative time slots that work for the student
   */
  private async findTimeAlternatives(
    preferredSlots: TimeSlot[],
    courseType: CourseType,
    studentId: string
  ): Promise<ScheduledClass[]> {
    const studentAvailability = await this.getStudentAvailability(studentId);
    const alternatives: ScheduledClass[] = [];

    // Find classes in similar time windows
    for (const slot of preferredSlots) {
      const { data: timeAlternatives } = await supabase
        .from('classes')
        .select(`
          *,
          teacher:teachers(*),
          course:courses(*),
          bookings(count)
        `)
        .eq('course.type', courseType)
        .eq('is_active', true)
        .lt('bookings.count', 'max_students'); // Available spots

      if (timeAlternatives) {
        for (const cls of timeAlternatives) {
          // Check if the class time aligns with student availability
          if (await this.isTimeCompatible(cls, studentAvailability)) {
            alternatives.push(this.mapToScheduledClass(cls));
          }
        }
      }
    }

    return alternatives;
  }

  /**
   * Find classes with compatible teachers based on student needs
   */
  private async findTeacherMatches(
    studentId: string,
    studentProgress: StudentProgress[],
    courseType: CourseType
  ): Promise<ScheduledClass[]> {
    const studentPreferences = await this.getStudentPreferences(studentId);
    const teacherMatches: ScheduledClass[] = [];

    // Get teacher compatibility scores
    const { data: teachers } = await supabase
      .from('teachers')
      .select(`
        *,
        classes(
          *,
          course:courses(*)
        )
      `)
      .eq('is_active', true);

    if (!teachers) return [];

    for (const teacher of teachers) {
      const compatibilityScore = await this.calculateTeacherCompatibility(
        teacher,
        studentProgress,
        studentPreferences
      );

      if (compatibilityScore > 0.7) { // 70% compatibility threshold
        const teacherClasses = teacher.classes
          ?.filter(cls => cls.course?.type === courseType && cls.is_active)
          ?.map(cls => this.mapToScheduledClass(cls)) || [];
        
        teacherMatches.push(...teacherClasses);
      }
    }

    return teacherMatches;
  }

  /**
   * Calculate comprehensive score breakdown for a class alternative
   */
  private async calculateScoreBreakdown(
    studentId: string,
    alternativeClass: ScheduledClass,
    preferredClass: ScheduledClass,
    studentProgress: StudentProgress[],
    studentPreferences: any,
    maxDistance?: number
  ): Promise<RecommendationScoreBreakdown> {
    const contentSimilarity = await this.calculateContentSimilarityScore(
      alternativeClass,
      preferredClass,
      studentProgress
    );

    const scheduleCompatibility = await this.calculateScheduleCompatibilityScore(
      studentId,
      alternativeClass
    );

    const teacherCompatibility = await this.calculateTeacherCompatibilityScore(
      studentId,
      alternativeClass.teacherId,
      studentProgress,
      studentPreferences
    );

    const learningPaceMatch = await this.calculateLearningPaceMatchScore(
      studentProgress,
      alternativeClass
    );

    const difficultyMatch = await this.calculateDifficultyMatchScore(
      studentProgress,
      alternativeClass
    );

    const locationConvenience = await this.calculateLocationConvenienceScore(
      studentId,
      alternativeClass,
      maxDistance
    );

    const peerCompatibility = await this.calculatePeerCompatibilityScore(
      studentId,
      alternativeClass
    );

    const classSizePreference = await this.calculateClassSizePreferenceScore(
      studentPreferences,
      alternativeClass
    );

    return {
      contentSimilarity,
      scheduleCompatibility,
      teacherCompatibility,
      learningPaceMatch,
      difficultyMatch,
      locationConvenience,
      peerCompatibility,
      classSizePreference,
    };
  }

  /**
   * Calculate overall recommendation score using weighted factors
   */
  private calculateOverallScore(
    scoreBreakdown: RecommendationScoreBreakdown,
    weights: RecommendationWeights
  ): number {
    const weightedScore = 
      scoreBreakdown.contentSimilarity * weights.contentSimilarity +
      scoreBreakdown.scheduleCompatibility * weights.scheduleCompatibility +
      scoreBreakdown.teacherCompatibility * weights.teacherCompatibility +
      scoreBreakdown.learningPaceMatch * weights.learningPaceMatch +
      scoreBreakdown.difficultyMatch * weights.difficultyMatch +
      scoreBreakdown.locationConvenience * weights.locationConvenience +
      scoreBreakdown.peerCompatibility * weights.peerCompatibility +
      scoreBreakdown.classSizePreference * weights.classSizePreference;

    return Math.round(Math.min(100, Math.max(0, weightedScore)));
  }

  /**
   * Generate waitlist recommendation for preferred class
   */
  private async generateWaitlistRecommendation(
    classId: string,
    studentId: string
  ): Promise<WaitlistRecommendation | null> {
    const { data: waitlistData } = await supabase
      .from('class_waitlist')
      .select('*')
      .eq('class_id', classId)
      .order('created_at', { ascending: true });

    if (!waitlistData) return null;

    const currentPosition = waitlistData.length + 1;
    const historicalData = await this.getWaitlistHistoricalData(classId);
    
    // Calculate estimated wait time based on historical data
    const estimatedWaitDays = this.calculateEstimatedWaitTime(
      currentPosition,
      historicalData
    );

    // Calculate probability of getting a spot
    const probabilityOfSpot = this.calculateSpotProbability(
      currentPosition,
      historicalData
    );

    return {
      classId,
      waitlistPosition: currentPosition,
      estimatedWaitDays,
      probabilityOfSpot,
      interimRecommendations: [], // Would be populated with short-term alternatives
    };
  }

  // Helper methods for scoring calculations

  private async calculateContentSimilarityScore(
    alternativeClass: ScheduledClass,
    preferredClass: ScheduledClass,
    studentProgress: StudentProgress[]
  ): Promise<number> {
    // Compare learning content, unit progression, and skill coverage
    const similarity = await this.compareClassContent(alternativeClass, preferredClass);
    const progressAlignment = this.calculateProgressAlignment(alternativeClass, studentProgress);
    
    return (similarity * 0.7 + progressAlignment * 0.3) * 100;
  }

  private async calculateScheduleCompatibilityScore(
    studentId: string,
    alternativeClass: ScheduledClass
  ): Promise<number> {
    // Conflict detection service has been removed - returning no conflicts
    const conflicts = [];
    /*
    const conflicts = await conflictDetectionService.checkBookingConflicts({
      studentId,
      teacherId: alternativeClass.teacherId,
      classId: alternativeClass.id,
      scheduledAt: alternativeClass.timeSlot.startTime,
      durationMinutes: alternativeClass.timeSlot.duration,
    });
    */

    // Score based on absence of conflicts and student availability
    const hasConflicts = conflicts.some(c => c.severity === 'error' || c.severity === 'critical');
    const baseScore = hasConflicts ? 0 : 80;
    
    // Bonus for preferred time slots
    const timePreferenceBonus = await this.calculateTimePreferenceBonus(
      studentId,
      alternativeClass.timeSlot
    );

    return Math.min(100, baseScore + timePreferenceBonus);
  }

  private async calculateTeacherCompatibilityScore(
    studentId: string,
    teacherId: string,
    studentProgress: StudentProgress[],
    studentPreferences: any
  ): Promise<number> {
    const { data: teacher } = await supabase
      .from('teachers')
      .select('*')
      .eq('id', teacherId)
      .single();

    if (!teacher) return 0;

    // Check past student-teacher interactions
    const { data: pastClasses } = await supabase
      .from('bookings')
      .select(`
        *,
        feedback(*),
        class:classes(teacher_id)
      `)
      .eq('student_id', studentId)
      .eq('class.teacher_id', teacherId);

    let compatibilityScore = 50; // Base score

    if (pastClasses && pastClasses.length > 0) {
      // Use historical feedback
      const avgRating = pastClasses
        .filter(b => b.feedback?.length > 0)
        .reduce((sum, b) => sum + (b.feedback[0]?.rating || 3), 0) / pastClasses.length;
      
      compatibilityScore = (avgRating / 5) * 100;
    } else {
      // Use teacher profile matching
      compatibilityScore = await this.calculateTeacherProfileMatch(
        teacher,
        studentProgress,
        studentPreferences
      );
    }

    return Math.round(compatibilityScore);
  }

  private async calculateLearningPaceMatchScore(
    studentProgress: StudentProgress[],
    alternativeClass: ScheduledClass
  ): Promise<number> {
    if (studentProgress.length === 0) return 50;

    const avgStudentPace = studentProgress.reduce((sum, p) => {
      const paceScore = p.learning_pace === 'fast' ? 3 : p.learning_pace === 'average' ? 2 : 1;
      return sum + paceScore;
    }, 0) / studentProgress.length;

    // Get class pace from historical data
    const classPace = await this.getClassPace(alternativeClass.id);
    const paceMatch = 1 - Math.abs(avgStudentPace - classPace) / 2;

    return Math.round(paceMatch * 100);
  }

  private async calculateDifficultyMatchScore(
    studentProgress: StudentProgress[],
    alternativeClass: ScheduledClass
  ): Promise<number> {
    if (studentProgress.length === 0) return 50;

    const avgProgressPercentage = studentProgress.reduce(
      (sum, p) => sum + p.progress_percentage, 0
    ) / studentProgress.length;

    // Get class difficulty level
    const classDifficulty = await this.getClassDifficultyLevel(alternativeClass.id);
    
    // Calculate match based on student progress and class difficulty
    const expectedDifficulty = Math.floor(avgProgressPercentage / 20) + 1; // 1-5 scale
    const difficultyMatch = 1 - Math.abs(expectedDifficulty - classDifficulty) / 4;

    return Math.round(difficultyMatch * 100);
  }

  private async calculateLocationConvenienceScore(
    studentId: string,
    alternativeClass: ScheduledClass,
    maxDistance?: number
  ): Promise<number> {
    // For online classes, return high score
    if (alternativeClass.timeSlot.location?.includes('online') || 
        alternativeClass.timeSlot.location?.includes('zoom')) {
      return 100;
    }

    if (!maxDistance) return 75; // Default score for offline classes

    const distance = await this.calculateDistance(studentId, alternativeClass, maxDistance);
    if (distance === undefined) return 75;

    // Score based on distance (closer is better)
    const distanceScore = Math.max(0, 100 - (distance / maxDistance) * 100);
    return Math.round(distanceScore);
  }

  private async calculatePeerCompatibilityScore(
    studentId: string,
    alternativeClass: ScheduledClass
  ): Promise<number> {
    const { data: classmates } = await supabase
      .from('bookings')
      .select(`
        student_id,
        student:students(*)
      `)
      .eq('class_id', alternativeClass.id)
      .eq('status', 'confirmed');

    if (!classmates || classmates.length === 0) return 75; // Neutral score for empty class

    // Get student's learning analytics for peer matching
    const studentAnalytics = await contentAnalysisService.generateLearningAnalytics(studentId);
    let compatibilitySum = 0;

    for (const classmate of classmates) {
      if (classmate.student_id === studentId) continue;
      
      const classmateAnalytics = await contentAnalysisService.generateLearningAnalytics(
        classmate.student_id
      );
      
      // Calculate compatibility based on learning pace, engagement, etc.
      const compatibility = this.calculatePeerCompatibility(
        studentAnalytics,
        classmateAnalytics
      );
      compatibilitySum += compatibility;
    }

    const avgCompatibility = compatibilitySum / classmates.length;
    return Math.round(avgCompatibility * 100);
  }

  private async calculateClassSizePreferenceScore(
    studentPreferences: any,
    alternativeClass: ScheduledClass
  ): Promise<number> {
    const { data: currentEnrollment } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('class_id', alternativeClass.id)
      .eq('status', 'confirmed');

    const classSize = currentEnrollment || 1;
    const preferredSize = studentPreferences?.optimalClassSize || 4;

    // Score based on how close the class size is to preferred size
    const sizeDifference = Math.abs(classSize - preferredSize);
    const maxDifference = 8; // Max class size is 9
    const sizeScore = Math.max(0, 100 - (sizeDifference / maxDifference) * 100);

    return Math.round(sizeScore);
  }

  // Additional helper methods would be implemented here...
  // These include methods for:
  // - getStudentProgress()
  // - getStudentPreferences()
  // - getClassDetails()
  // - checkClassAvailability()
  // - analyzeContentMatch()
  // - mapToScheduledClass()
  // - determineRecommendationType()
  // - generateReasoning()
  // - generateBenefitsDrawbacks()
  // - calculateConfidenceLevel()
  // - calculateDistance()
  // - deduplicateClasses()
  // - and many more...

  /**
   * Get student progress data
   */
  private async getStudentProgress(studentId: string): Promise<StudentProgress[]> {
    // This would integrate with the existing content analysis service
    return await contentAnalysisService.analyzeStudentProgress(studentId);
  }

  /**
   * Get student preferences and learning analytics
   */
  private async getStudentPreferences(studentId: string): Promise<any> {
    const analytics = await contentAnalysisService.generateLearningAnalytics(studentId);
    return {
      optimalClassSize: analytics.optimal_class_size,
      preferredLearningStyle: analytics.preferred_learning_style,
      bestTimeSlots: analytics.best_time_slots,
      peerCompatibility: analytics.peer_compatibility,
    };
  }

  /**
   * Map database class to ScheduledClass interface
   */
  private mapToScheduledClass(dbClass: any): ScheduledClass {
    return {
      id: dbClass.id,
      courseId: dbClass.course_id,
      teacherId: dbClass.teacher_id,
      studentIds: [], // Would be populated from bookings
      timeSlot: {
        id: `slot-${dbClass.id}`,
        startTime: dbClass.scheduled_start || '09:00',
        endTime: dbClass.scheduled_end || '10:00',
        duration: 60,
        dayOfWeek: new Date().getDay(),
        isAvailable: true,
        capacity: {
          maxStudents: dbClass.max_students || 9,
          minStudents: 1,
          currentEnrollment: 0,
          availableSpots: dbClass.max_students || 9,
        },
        location: dbClass.location || 'Online',
      },
      content: [], // Would be populated from materials
      classType: dbClass.class_type || 'group',
      status: 'scheduled',
      confidenceScore: 0.8,
      rationale: 'Alternative recommendation',
      alternatives: [],
    };
  }

  // Placeholder implementations for complex helper methods
  private async analyzeContentMatch(cls: any, unlearnedContent: any[]): Promise<number> {
    // Implementation would analyze content overlap
    return 0.8; // Placeholder
  }

  private async getStudentAvailability(studentId: string): Promise<any> {
    // Implementation would get student's availability preferences
    return {};
  }

  private async isTimeCompatible(cls: any, availability: any): Promise<boolean> {
    // Implementation would check time compatibility
    return true; // Placeholder
  }

  private async calculateTeacherCompatibility(teacher: any, progress: any[], preferences: any): Promise<number> {
    // Implementation would calculate teacher-student compatibility
    return 0.8; // Placeholder
  }

  private async getClassDetails(classId: string): Promise<ScheduledClass | null> {
    const { data: cls } = await supabase
      .from('classes')
      .select('*')
      .eq('id', classId)
      .single();

    return cls ? this.mapToScheduledClass(cls) : null;
  }

  private async checkClassAvailability(classId: string, studentId: string): Promise<'immediate' | 'limited_spots' | 'waitlist' | 'unavailable'> {
    const { data: cls } = await supabase
      .from('classes')
      .select('max_students')
      .eq('id', classId)
      .single();

    const { count } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('class_id', classId)
      .in('status', ['confirmed', 'pending']);

    const currentEnrollment = count || 0;
    const maxStudents = cls?.max_students || 9;

    if (currentEnrollment < maxStudents - 2) return 'immediate';
    if (currentEnrollment < maxStudents) return 'limited_spots';
    if (currentEnrollment >= maxStudents) return 'waitlist';
    return 'unavailable';
  }

  private deduplicateClasses(classes: ScheduledClass[]): ScheduledClass[] {
    const seen = new Set<string>();
    return classes.filter(cls => {
      if (seen.has(cls.id)) return false;
      seen.add(cls.id);
      return true;
    });
  }

  private determineRecommendationType(
    alternative: ScheduledClass,
    preferred: ScheduledClass,
    scores: RecommendationScoreBreakdown
  ): AlternativeClassRecommendation['type'] {
    if (scores.contentSimilarity > 80) return 'content_similar';
    if (scores.scheduleCompatibility > 80) return 'time_alternative';
    if (scores.teacherCompatibility > 80) return 'teacher_match';
    if (scores.locationConvenience > 90) return 'location_optimized';
    return 'content_similar';
  }

  private generateReasoning(
    type: AlternativeClassRecommendation['type'],
    scores: RecommendationScoreBreakdown,
    alternative: ScheduledClass,
    preferred: ScheduledClass
  ): string {
    switch (type) {
      case 'content_similar':
        return `This class covers similar learning content (${scores.contentSimilarity}% match) and aligns well with your current progress.`;
      case 'time_alternative':
        return `This class fits perfectly with your schedule (${scores.scheduleCompatibility}% compatibility) and has immediate availability.`;
      case 'teacher_match':
        return `This teacher is highly compatible with your learning style (${scores.teacherCompatibility}% match) based on your preferences.`;
      case 'location_optimized':
        return `This class is conveniently located (${scores.locationConvenience}% convenience score) and easily accessible.`;
      case 'waitlist':
        return `Join the waitlist for your preferred class while exploring these interim alternatives.`;
      default:
        return `This class is a good alternative based on multiple compatibility factors.`;
    }
  }

  private generateBenefitsDrawbacks(
    type: AlternativeClassRecommendation['type'],
    scores: RecommendationScoreBreakdown,
    alternative: ScheduledClass,
    preferred: ScheduledClass
  ): { benefits: string[]; drawbacks: string[] } {
    const benefits: string[] = [];
    const drawbacks: string[] = [];

    // Add benefits based on high scores
    if (scores.contentSimilarity > 80) benefits.push('Highly relevant content');
    if (scores.scheduleCompatibility > 80) benefits.push('Perfect timing');
    if (scores.teacherCompatibility > 80) benefits.push('Compatible teaching style');
    if (scores.locationConvenience > 80) benefits.push('Convenient location');

    // Add drawbacks based on low scores
    if (scores.contentSimilarity < 60) drawbacks.push('Different content focus');
    if (scores.scheduleCompatibility < 60) drawbacks.push('Less ideal timing');
    if (scores.teacherCompatibility < 60) drawbacks.push('Different teaching approach');
    if (scores.locationConvenience < 60) drawbacks.push('Less convenient location');

    return { benefits, drawbacks };
  }

  private calculateConfidenceLevel(
    scores: RecommendationScoreBreakdown,
    overallScore: number,
    availability: AlternativeClassRecommendation['availability']
  ): number {
    let confidence = overallScore / 100;

    // Adjust based on availability
    switch (availability) {
      case 'immediate':
        confidence *= 1.0;
        break;
      case 'limited_spots':
        confidence *= 0.9;
        break;
      case 'waitlist':
        confidence *= 0.7;
        break;
      case 'unavailable':
        confidence *= 0.3;
        break;
    }

    // Boost confidence for high content similarity
    if (scores.contentSimilarity > 85) {
      confidence *= 1.1;
    }

    return Math.min(1.0, Math.max(0.1, confidence));
  }

  private async calculateDistance(
    studentId: string,
    alternativeClass: ScheduledClass,
    maxDistance?: number
  ): Promise<number | undefined> {
    // For online classes, return undefined
    if (alternativeClass.timeSlot.location?.toLowerCase().includes('online')) {
      return undefined;
    }

    // This would implement actual distance calculation
    // For now, return a placeholder
    return Math.random() * (maxDistance || 10);
  }

  // Additional placeholder methods for complex calculations
  private async compareClassContent(alt: ScheduledClass, pref: ScheduledClass): Promise<number> {
    return 0.8; // Placeholder
  }

  private calculateProgressAlignment(cls: ScheduledClass, progress: StudentProgress[]): number {
    return 0.75; // Placeholder
  }

  private async calculateTimePreferenceBonus(studentId: string, timeSlot: TimeSlot): Promise<number> {
    return 20; // Placeholder
  }

  private async calculateTeacherProfileMatch(teacher: any, progress: StudentProgress[], prefs: any): Promise<number> {
    return 75; // Placeholder
  }

  private async getClassPace(classId: string): Promise<number> {
    return 2; // Placeholder (1=slow, 2=average, 3=fast)
  }

  private async getClassDifficultyLevel(classId: string): Promise<number> {
    return 3; // Placeholder (1-5 scale)
  }

  private calculatePeerCompatibility(analytics1: any, analytics2: any): number {
    return 0.8; // Placeholder
  }

  private async getWaitlistHistoricalData(classId: string): Promise<any> {
    return {}; // Placeholder
  }

  private calculateEstimatedWaitTime(position: number, historicalData: any): number {
    return Math.ceil(position * 2); // Placeholder: 2 days per position
  }

  private calculateSpotProbability(position: number, historicalData: any): number {
    return Math.max(0.1, 1 - (position * 0.1)); // Decreasing probability
  }
}

// Export singleton instance
export const classRecommendationService = new ClassRecommendationService();