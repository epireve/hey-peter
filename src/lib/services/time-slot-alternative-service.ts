/**
 * HeyPeter Academy - Time Slot Alternative Service
 * 
 * This service generates alternative time slot recommendations when students
 * can't attend their preferred class times. It considers:
 * - Student availability patterns and preferences
 * - Historical performance at different times
 * - Teacher availability and compatibility
 * - Class capacity and scheduling constraints
 * - Peak learning hours and optimal scheduling
 */

import { supabase } from '@/lib/supabase';
import { CRUDService, withRetry } from './crud-service';
import { conflictDetectionService } from './conflict-detection-service';
import type {
  TimeSlot,
  StudentProgress,
  StudentPerformanceMetrics,
  ScheduledClass,
  CourseType,
  ClassCapacityConstraint
} from '@/types/scheduling';

export interface TimeAlternativeRequest {
  /** Student ID requesting alternatives */
  studentId: string;
  /** Preferred time slots that are not available */
  preferredTimeSlots: TimeSlot[];
  /** Course type for filtering relevant classes */
  courseType: CourseType;
  /** Days of week to consider (0=Sunday, 6=Saturday) */
  availableDays?: number[];
  /** Minimum advance booking time in hours */
  minAdvanceHours?: number;
  /** Maximum advance booking time in days */
  maxAdvanceDays?: number;
  /** Include recurring time slot options */
  includeRecurring?: boolean;
}

export interface TimeAlternativeRecommendation {
  /** Recommendation ID */
  id: string;
  /** Alternative time slot */
  timeSlot: TimeSlot;
  /** Available classes in this time slot */
  availableClasses: ScheduledClass[];
  /** Compatibility score with student preferences (0-100) */
  compatibilityScore: number;
  /** Score breakdown */
  scoreBreakdown: TimeSlotScoreBreakdown;
  /** Recommendation reasoning */
  reasoning: string;
  /** Benefits of this time slot */
  benefits: string[];
  /** Potential challenges */
  challenges: string[];
  /** Availability status */
  availability: 'immediate' | 'limited' | 'waitlist';
  /** Performance prediction */
  performancePrediction: StudentPerformancePrediction;
}

export interface TimeSlotScoreBreakdown {
  /** Historical performance score at this time (0-100) */
  historicalPerformance: number;
  /** Attendance likelihood score (0-100) */
  attendanceLikelihood: number;
  /** Learning effectiveness score (0-100) */
  learningEffectiveness: number;
  /** Schedule fit score (0-100) */
  scheduleFit: number;
  /** Teacher availability score (0-100) */
  teacherAvailability: number;
  /** Peer group compatibility score (0-100) */
  peerCompatibility: number;
  /** Optimal learning time score (0-100) */
  optimalLearningTime: number;
  /** Convenience score (0-100) */
  convenience: number;
}

export interface StudentPerformancePrediction {
  /** Predicted attendance rate (0-1) */
  predictedAttendance: number;
  /** Predicted engagement level (1-10) */
  predictedEngagement: number;
  /** Predicted learning outcome score (0-100) */
  predictedOutcome: number;
  /** Confidence in predictions (0-1) */
  confidence: number;
  /** Factors influencing prediction */
  influencingFactors: string[];
}

export interface StudentTimePreferences {
  /** Preferred days of week */
  preferredDays: number[];
  /** Preferred time ranges */
  preferredTimeRanges: Array<{ start: string; end: string }>;
  /** Best performing time slots based on history */
  bestPerformingTimes: TimeSlot[];
  /** Worst performing time slots */
  worstPerformingTimes: TimeSlot[];
  /** Time-based attendance patterns */
  attendancePatterns: Map<string, number>;
  /** Time-based engagement patterns */
  engagementPatterns: Map<string, number>;
}

/**
 * Service for generating time slot alternatives
 */
export class TimeSlotAlternativeService {
  private crudService: CRUDService<any>;

  constructor() {
    this.crudService = new CRUDService({
      table: 'bookings',
      cache: {
        enabled: true,
        ttl: 2 * 60 * 1000, // 2 minutes for dynamic scheduling data
      },
    });
  }

  /**
   * Generate alternative time slot recommendations
   */
  async generateTimeAlternatives(
    request: TimeAlternativeRequest
  ): Promise<TimeAlternativeRecommendation[]> {
    return withRetry(async () => {
      // Get student time preferences and patterns
      const timePreferences = await this.analyzeStudentTimePreferences(request.studentId);
      
      // Get student performance metrics
      const performanceMetrics = await this.getStudentPerformanceMetrics(request.studentId);
      
      // Find available time slots
      const availableTimeSlots = await this.findAvailableTimeSlots(request);
      
      // Generate recommendations for each available slot
      const recommendations: TimeAlternativeRecommendation[] = [];
      
      for (const timeSlot of availableTimeSlots) {
        // Get available classes in this time slot
        const availableClasses = await this.getAvailableClassesInTimeSlot(
          timeSlot,
          request.courseType
        );
        
        if (availableClasses.length === 0) continue;
        
        // Calculate compatibility score
        const scoreBreakdown = await this.calculateTimeSlotScore(
          request.studentId,
          timeSlot,
          timePreferences,
          performanceMetrics
        );
        
        const compatibilityScore = this.calculateOverallTimeScore(scoreBreakdown);
        
        // Generate performance prediction
        const performancePrediction = this.predictStudentPerformance(
          timeSlot,
          timePreferences,
          performanceMetrics
        );
        
        // Determine availability status
        const availability = this.determineTimeSlotAvailability(availableClasses);
        
        // Generate reasoning and benefits/challenges
        const { reasoning, benefits, challenges } = this.generateTimeSlotInsights(
          timeSlot,
          scoreBreakdown,
          performancePrediction,
          request.preferredTimeSlots
        );
        
        recommendations.push({
          id: `time-alt-${timeSlot.id}-${Date.now()}`,
          timeSlot,
          availableClasses,
          compatibilityScore,
          scoreBreakdown,
          reasoning,
          benefits,
          challenges,
          availability,
          performancePrediction,
        });
      }
      
      // Sort by compatibility score and performance prediction
      recommendations.sort((a, b) => {
        const scoreA = a.compatibilityScore * a.performancePrediction.confidence;
        const scoreB = b.compatibilityScore * b.performancePrediction.confidence;
        return scoreB - scoreA;
      });
      
      return recommendations.slice(0, 15); // Return top 15 alternatives
    });
  }

  /**
   * Analyze student's time preferences and patterns
   */
  private async analyzeStudentTimePreferences(studentId: string): Promise<StudentTimePreferences> {
    // Get historical booking and attendance data
    const { data: bookings } = await supabase
      .from('bookings')
      .select(`
        *,
        attendance(*),
        feedback(*),
        class:classes(scheduled_start, scheduled_end)
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!bookings?.length) {
      return this.getDefaultTimePreferences();
    }

    // Analyze attendance patterns by time
    const attendancePatterns = new Map<string, number>();
    const engagementPatterns = new Map<string, number>();
    const timePerformance = new Map<string, { attendance: number; engagement: number; count: number }>();

    for (const booking of bookings) {
      if (!booking.class?.scheduled_start) continue;

      const scheduledTime = new Date(booking.class.scheduled_start);
      const dayOfWeek = scheduledTime.getDay();
      const hour = scheduledTime.getHours();
      const timeKey = `${dayOfWeek}-${hour}`;

      // Initialize if not exists
      if (!timePerformance.has(timeKey)) {
        timePerformance.set(timeKey, { attendance: 0, engagement: 0, count: 0 });
      }

      const performance = timePerformance.get(timeKey)!;
      performance.count++;

      // Check attendance
      const attended = booking.attendance?.some(a => a.status === 'present');
      if (attended) performance.attendance++;

      // Check engagement from feedback
      const feedback = booking.feedback?.[0];
      if (feedback?.rating) {
        performance.engagement += feedback.rating;
      }
    }

    // Calculate patterns
    for (const [timeKey, performance] of timePerformance) {
      const attendanceRate = performance.attendance / performance.count;
      const avgEngagement = performance.engagement / performance.count;

      attendancePatterns.set(timeKey, attendanceRate);
      engagementPatterns.set(timeKey, avgEngagement);
    }

    // Identify best and worst performing times
    const bestPerformingTimes = this.identifyBestPerformingTimes(timePerformance);
    const worstPerformingTimes = this.identifyWorstPerformingTimes(timePerformance);

    // Extract preferred days and time ranges
    const preferredDays = this.extractPreferredDays(attendancePatterns);
    const preferredTimeRanges = this.extractPreferredTimeRanges(attendancePatterns);

    return {
      preferredDays,
      preferredTimeRanges,
      bestPerformingTimes,
      worstPerformingTimes,
      attendancePatterns,
      engagementPatterns,
    };
  }

  /**
   * Find available time slots based on constraints
   */
  private async findAvailableTimeSlots(request: TimeAlternativeRequest): Promise<TimeSlot[]> {
    const now = new Date();
    const minDate = new Date(now.getTime() + (request.minAdvanceHours || 24) * 60 * 60 * 1000);
    const maxDate = new Date(now.getTime() + (request.maxAdvanceDays || 30) * 24 * 60 * 60 * 1000);

    const availableSlots: TimeSlot[] = [];
    const availableDays = request.availableDays || [1, 2, 3, 4, 5]; // Monday to Friday

    // Generate time slots for each day in the range
    const currentDate = new Date(minDate);
    while (currentDate <= maxDate) {
      const dayOfWeek = currentDate.getDay();
      
      if (availableDays.includes(dayOfWeek)) {
        // Generate hourly slots for business hours
        for (let hour = 9; hour < 18; hour++) {
          const slotStart = new Date(currentDate);
          slotStart.setHours(hour, 0, 0, 0);
          
          const slotEnd = new Date(slotStart);
          slotEnd.setHours(hour + 1, 0, 0, 0);

          // Check if this slot conflicts with preferred slots (don't recommend same times)
          const conflictsWithPreferred = request.preferredTimeSlots.some(preferred => {
            const prefStart = new Date(preferred.startTime);
            const prefEnd = new Date(preferred.endTime);
            return this.timeRangesOverlap(slotStart, slotEnd, prefStart, prefEnd);
          });

          if (!conflictsWithPreferred) {
            // Check for existing conflicts
            const hasConflicts = await this.checkTimeSlotConflicts(
              request.studentId,
              slotStart.toISOString(),
              60
            );

            if (!hasConflicts) {
              availableSlots.push({
                id: `slot-${slotStart.getTime()}`,
                startTime: slotStart.toISOString(),
                endTime: slotEnd.toISOString(),
                duration: 60,
                dayOfWeek,
                isAvailable: true,
                capacity: {
                  maxStudents: 9,
                  minStudents: 1,
                  currentEnrollment: 0,
                  availableSpots: 9,
                },
                location: 'TBD',
              });
            }
          }
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return availableSlots;
  }

  /**
   * Get available classes in a specific time slot
   */
  private async getAvailableClassesInTimeSlot(
    timeSlot: TimeSlot,
    courseType: CourseType
  ): Promise<ScheduledClass[]> {
    const slotStart = new Date(timeSlot.startTime);
    const slotEnd = new Date(timeSlot.endTime);

    // Find classes that start within this time window
    const { data: classes } = await supabase
      .from('classes')
      .select(`
        *,
        teacher:teachers(*),
        course:courses(*),
        bookings(count)
      `)
      .eq('course.type', courseType)
      .eq('is_active', true)
      .gte('scheduled_start', slotStart.toISOString())
      .lt('scheduled_start', slotEnd.toISOString());

    if (!classes?.length) return [];

    // Filter classes that have available spots
    const availableClasses: ScheduledClass[] = [];

    for (const cls of classes) {
      const { count: currentBookings } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', cls.id)
        .in('status', ['confirmed', 'pending']);

      const enrollmentCount = currentBookings || 0;
      const maxStudents = cls.max_students || 9;

      if (enrollmentCount < maxStudents) {
        availableClasses.push({
          id: cls.id,
          courseId: cls.course_id,
          teacherId: cls.teacher_id,
          studentIds: [], // Would be populated from bookings
          timeSlot: {
            ...timeSlot,
            capacity: {
              maxStudents,
              minStudents: 1,
              currentEnrollment: enrollmentCount,
              availableSpots: maxStudents - enrollmentCount,
            },
          },
          content: [], // Would be populated from materials
          classType: cls.class_type || 'group',
          status: 'scheduled',
          confidenceScore: 0.8,
          rationale: 'Available alternative time slot',
          alternatives: [],
        });
      }
    }

    return availableClasses;
  }

  /**
   * Calculate time slot compatibility score
   */
  private async calculateTimeSlotScore(
    studentId: string,
    timeSlot: TimeSlot,
    preferences: StudentTimePreferences,
    performanceMetrics: StudentPerformanceMetrics
  ): Promise<TimeSlotScoreBreakdown> {
    const slotTime = new Date(timeSlot.startTime);
    const dayOfWeek = slotTime.getDay();
    const hour = slotTime.getHours();
    const timeKey = `${dayOfWeek}-${hour}`;

    // Historical performance at this time
    const historicalPerformance = this.calculateHistoricalPerformanceScore(
      timeKey,
      preferences
    );

    // Attendance likelihood
    const attendanceLikelihood = this.calculateAttendanceLikelihood(
      timeKey,
      preferences,
      performanceMetrics
    );

    // Learning effectiveness based on optimal learning times
    const learningEffectiveness = this.calculateLearningEffectivenessScore(
      hour,
      dayOfWeek,
      performanceMetrics
    );

    // Schedule fit with student preferences
    const scheduleFit = this.calculateScheduleFitScore(
      timeSlot,
      preferences
    );

    // Teacher availability (simplified)
    const teacherAvailability = await this.calculateTeacherAvailabilityScore(timeSlot);

    // Peer group compatibility (future enhancement)
    const peerCompatibility = 75; // Placeholder

    // Optimal learning time based on research
    const optimalLearningTime = this.calculateOptimalLearningTimeScore(hour, dayOfWeek);

    // Convenience score
    const convenience = this.calculateConvenienceScore(timeSlot, preferences);

    return {
      historicalPerformance,
      attendanceLikelihood,
      learningEffectiveness,
      scheduleFit,
      teacherAvailability,
      peerCompatibility,
      optimalLearningTime,
      convenience,
    };
  }

  /**
   * Calculate overall time compatibility score
   */
  private calculateOverallTimeScore(scoreBreakdown: TimeSlotScoreBreakdown): number {
    const weights = {
      historicalPerformance: 0.20,
      attendanceLikelihood: 0.18,
      learningEffectiveness: 0.15,
      scheduleFit: 0.15,
      teacherAvailability: 0.12,
      peerCompatibility: 0.08,
      optimalLearningTime: 0.07,
      convenience: 0.05,
    };

    return Math.round(
      scoreBreakdown.historicalPerformance * weights.historicalPerformance +
      scoreBreakdown.attendanceLikelihood * weights.attendanceLikelihood +
      scoreBreakdown.learningEffectiveness * weights.learningEffectiveness +
      scoreBreakdown.scheduleFit * weights.scheduleFit +
      scoreBreakdown.teacherAvailability * weights.teacherAvailability +
      scoreBreakdown.peerCompatibility * weights.peerCompatibility +
      scoreBreakdown.optimalLearningTime * weights.optimalLearningTime +
      scoreBreakdown.convenience * weights.convenience
    );
  }

  /**
   * Predict student performance at a given time slot
   */
  private predictStudentPerformance(
    timeSlot: TimeSlot,
    preferences: StudentTimePreferences,
    performanceMetrics: StudentPerformanceMetrics
  ): StudentPerformancePrediction {
    const slotTime = new Date(timeSlot.startTime);
    const timeKey = `${slotTime.getDay()}-${slotTime.getHours()}`;

    // Base predictions on historical data
    const historicalAttendance = preferences.attendancePatterns.get(timeKey) || 0.85;
    const historicalEngagement = preferences.engagementPatterns.get(timeKey) || 7;

    // Adjust based on overall performance metrics
    const predictedAttendance = Math.min(1.0, 
      historicalAttendance * (performanceMetrics.attendanceRate / 0.85)
    );

    const predictedEngagement = Math.min(10, 
      historicalEngagement * (performanceMetrics.engagementLevel / 7)
    );

    // Predict learning outcome based on engagement and attendance
    const predictedOutcome = Math.round(
      (predictedAttendance * 0.4 + predictedEngagement / 10 * 0.6) * 100
    );

    // Calculate confidence based on data availability
    const confidence = Math.min(1.0, 
      preferences.attendancePatterns.size / 20 // More data points = higher confidence
    );

    const influencingFactors = this.identifyInfluencingFactors(
      timeSlot,
      preferences,
      performanceMetrics
    );

    return {
      predictedAttendance,
      predictedEngagement,
      predictedOutcome,
      confidence,
      influencingFactors,
    };
  }

  // Helper methods for calculations

  private calculateHistoricalPerformanceScore(
    timeKey: string,
    preferences: StudentTimePreferences
  ): number {
    const attendanceRate = preferences.attendancePatterns.get(timeKey) || 0.5;
    const engagementLevel = preferences.engagementPatterns.get(timeKey) || 5;

    return Math.round((attendanceRate * 50) + (engagementLevel / 10 * 50));
  }

  private calculateAttendanceLikelihood(
    timeKey: string,
    preferences: StudentTimePreferences,
    performanceMetrics: StudentPerformanceMetrics
  ): number {
    const historicalRate = preferences.attendancePatterns.get(timeKey) || performanceMetrics.attendanceRate;
    return Math.round(historicalRate * 100);
  }

  private calculateLearningEffectivenessScore(
    hour: number,
    dayOfWeek: number,
    performanceMetrics: StudentPerformanceMetrics
  ): number {
    // Research-based optimal learning times
    let baseScore = 50;

    // Morning boost (9-11 AM)
    if (hour >= 9 && hour < 11) baseScore += 20;
    // Afternoon focus (2-4 PM)
    else if (hour >= 14 && hour < 16) baseScore += 15;
    // Good times (11 AM - 2 PM, 4-6 PM)
    else if ((hour >= 11 && hour < 14) || (hour >= 16 && hour < 18)) baseScore += 10;

    // Weekday bonus
    if (dayOfWeek >= 1 && dayOfWeek <= 5) baseScore += 10;

    // Adjust based on student's best performing times
    const bestTimeBonus = performanceMetrics.bestPerformingTimes.some(slot => {
      const slotTime = new Date(slot.start_time);
      return slotTime.getHours() === hour && slotTime.getDay() === dayOfWeek;
    }) ? 15 : 0;

    return Math.min(100, baseScore + bestTimeBonus);
  }

  private calculateScheduleFitScore(
    timeSlot: TimeSlot,
    preferences: StudentTimePreferences
  ): number {
    const slotTime = new Date(timeSlot.startTime);
    const dayOfWeek = slotTime.getDay();
    const hour = slotTime.getHours();

    let score = 0;

    // Day preference
    if (preferences.preferredDays.includes(dayOfWeek)) {
      score += 40;
    }

    // Time range preference
    const timeString = `${hour.toString().padStart(2, '0')}:00`;
    const fitsTimeRange = preferences.preferredTimeRanges.some(range => 
      timeString >= range.start && timeString <= range.end
    );
    
    if (fitsTimeRange) {
      score += 60;
    }

    return Math.min(100, score);
  }

  private async calculateTeacherAvailabilityScore(timeSlot: TimeSlot): Promise<number> {
    // Check how many teachers are available at this time
    const { data: availableTeachers } = await supabase
      .from('teacher_availability')
      .select('teacher_id')
      .eq('day_of_week', new Date(timeSlot.startTime).getDay())
      .lte('start_time', new Date(timeSlot.startTime).toTimeString().slice(0, 5))
      .gte('end_time', new Date(timeSlot.endTime).toTimeString().slice(0, 5))
      .eq('is_available', true);

    const teacherCount = availableTeachers?.length || 0;
    
    // Score based on teacher availability (more teachers = better score)
    return Math.min(100, teacherCount * 20);
  }

  private calculateOptimalLearningTimeScore(hour: number, dayOfWeek: number): number {
    // Based on educational research on optimal learning times
    let score = 40; // Base score

    // Peak cognitive performance times
    if (hour >= 10 && hour < 12) score = 100; // Late morning peak
    else if (hour >= 14 && hour < 16) score = 90; // Early afternoon
    else if (hour >= 9 && hour < 10) score = 85; // Early morning
    else if (hour >= 16 && hour < 18) score = 75; // Late afternoon
    else if (hour >= 12 && hour < 14) score = 60; // Post-lunch dip

    // Weekday adjustment
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      score += 10;
    }

    return Math.min(100, score);
  }

  private calculateConvenienceScore(
    timeSlot: TimeSlot,
    preferences: StudentTimePreferences
  ): number {
    // This could include factors like:
    // - Distance from other commitments
    // - Transportation availability
    // - Personal schedule conflicts
    
    // For now, return a basic score based on common convenient times
    const hour = new Date(timeSlot.startTime).getHours();
    
    if (hour >= 10 && hour < 16) return 90; // Convenient daytime hours
    if (hour >= 16 && hour < 18) return 80; // After school/work
    if (hour >= 9 && hour < 10) return 70; // Early but manageable
    
    return 60; // Other times
  }

  // Additional helper methods

  private getDefaultTimePreferences(): StudentTimePreferences {
    return {
      preferredDays: [1, 2, 3, 4, 5], // Weekdays
      preferredTimeRanges: [
        { start: '09:00', end: '12:00' },
        { start: '14:00', end: '17:00' },
      ],
      bestPerformingTimes: [],
      worstPerformingTimes: [],
      attendancePatterns: new Map(),
      engagementPatterns: new Map(),
    };
  }

  private async getStudentPerformanceMetrics(studentId: string): Promise<StudentPerformanceMetrics> {
    // This would integrate with the content analysis service
    // For now, return default metrics
    return {
      attendanceRate: 0.85,
      assignmentCompletionRate: 0.80,
      averageScore: 75,
      engagementLevel: 7,
      preferredClassTypes: ['group'],
      optimalClassSize: 4,
      bestPerformingTimes: [],
      challengingTopics: [],
    };
  }

  private identifyBestPerformingTimes(
    timePerformance: Map<string, { attendance: number; engagement: number; count: number }>
  ): TimeSlot[] {
    const sortedTimes = Array.from(timePerformance.entries())
      .sort((a, b) => {
        const scoreA = (a[1].attendance / a[1].count) + (a[1].engagement / a[1].count / 5);
        const scoreB = (b[1].attendance / b[1].count) + (b[1].engagement / b[1].count / 5);
        return scoreB - scoreA;
      })
      .slice(0, 5);

    return sortedTimes.map(([timeKey]) => {
      const [day, hour] = timeKey.split('-').map(Number);
      return {
        id: `best-${timeKey}`,
        startTime: `${hour.toString().padStart(2, '0')}:00`,
        endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
        duration: 60,
        dayOfWeek: day,
        isAvailable: true,
        capacity: {
          maxStudents: 9,
          minStudents: 1,
          currentEnrollment: 0,
          availableSpots: 9,
        },
      };
    });
  }

  private identifyWorstPerformingTimes(
    timePerformance: Map<string, { attendance: number; engagement: number; count: number }>
  ): TimeSlot[] {
    // Similar to best performing but sorted in reverse
    return [];
  }

  private extractPreferredDays(attendancePatterns: Map<string, number>): number[] {
    const dayScores = new Map<number, number>();
    
    for (const [timeKey, rate] of attendancePatterns) {
      const day = parseInt(timeKey.split('-')[0]);
      const currentScore = dayScores.get(day) || 0;
      dayScores.set(day, currentScore + rate);
    }
    
    return Array.from(dayScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([day]) => day);
  }

  private extractPreferredTimeRanges(attendancePatterns: Map<string, number>): Array<{ start: string; end: string }> {
    // Simplified implementation
    return [
      { start: '09:00', end: '12:00' },
      { start: '14:00', end: '17:00' },
    ];
  }

  private async checkTimeSlotConflicts(
    studentId: string,
    scheduledAt: string,
    durationMinutes: number
  ): Promise<boolean> {
    const conflicts = await conflictDetectionService.checkBookingConflicts({
      studentId,
      teacherId: 'temp', // We don't know teacher yet
      classId: 'temp',
      scheduledAt,
      durationMinutes,
    });

    return conflicts.some(c => c.severity === 'error' || c.severity === 'critical');
  }

  private timeRangesOverlap(
    start1: Date,
    end1: Date,
    start2: Date,
    end2: Date
  ): boolean {
    return start1 < end2 && end1 > start2;
  }

  private determineTimeSlotAvailability(availableClasses: ScheduledClass[]): 'immediate' | 'limited' | 'waitlist' {
    if (availableClasses.length === 0) return 'waitlist';
    
    const totalSpots = availableClasses.reduce(
      (sum, cls) => sum + cls.timeSlot.capacity.availableSpots, 0
    );
    
    if (totalSpots > 5) return 'immediate';
    if (totalSpots > 0) return 'limited';
    return 'waitlist';
  }

  private generateTimeSlotInsights(
    timeSlot: TimeSlot,
    scoreBreakdown: TimeSlotScoreBreakdown,
    performancePrediction: StudentPerformancePrediction,
    preferredSlots: TimeSlot[]
  ): { reasoning: string; benefits: string[]; challenges: string[] } {
    const slotTime = new Date(timeSlot.startTime);
    const hour = slotTime.getHours();
    const dayName = slotTime.toLocaleDateString('en-US', { weekday: 'long' });
    const timeString = slotTime.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });

    const reasoning = `This ${dayName} ${timeString} slot shows strong compatibility with your schedule and learning patterns (${Math.round(scoreBreakdown.historicalPerformance)}% historical performance).`;

    const benefits: string[] = [];
    const challenges: string[] = [];

    // Add benefits based on high scores
    if (scoreBreakdown.historicalPerformance > 80) {
      benefits.push('Excellent historical performance at this time');
    }
    if (scoreBreakdown.attendanceLikelihood > 80) {
      benefits.push('High attendance likelihood');
    }
    if (scoreBreakdown.learningEffectiveness > 80) {
      benefits.push('Optimal learning time based on research');
    }
    if (scoreBreakdown.scheduleFit > 80) {
      benefits.push('Perfect fit with your schedule preferences');
    }

    // Add challenges based on low scores
    if (scoreBreakdown.historicalPerformance < 60) {
      challenges.push('Limited historical data for this time slot');
    }
    if (scoreBreakdown.attendanceLikelihood < 60) {
      challenges.push('May conflict with other commitments');
    }
    if (scoreBreakdown.teacherAvailability < 60) {
      challenges.push('Limited teacher availability');
    }

    return { reasoning, benefits, challenges };
  }

  private identifyInfluencingFactors(
    timeSlot: TimeSlot,
    preferences: StudentTimePreferences,
    performanceMetrics: StudentPerformanceMetrics
  ): string[] {
    const factors: string[] = [];
    
    const hour = new Date(timeSlot.startTime).getHours();
    
    if (hour >= 10 && hour < 12) {
      factors.push('Peak cognitive performance hours');
    }
    
    if (preferences.preferredDays.includes(new Date(timeSlot.startTime).getDay())) {
      factors.push('Preferred day of week');
    }
    
    if (performanceMetrics.attendanceRate > 0.9) {
      factors.push('High overall attendance rate');
    }
    
    return factors;
  }
}

// Export singleton instance
export const timeSlotAlternativeService = new TimeSlotAlternativeService();