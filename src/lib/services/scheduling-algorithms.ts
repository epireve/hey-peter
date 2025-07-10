/**
 * HeyPeter Academy - Scheduling Algorithms
 * 
 * This module contains the core algorithms for intelligent class scheduling:
 * - Content-based scheduling algorithm
 * - Student progress optimization
 * - Teacher workload balancing
 * - Time slot optimization
 * - Conflict resolution algorithms
 * - Performance optimization strategies
 */

import type {
  SchedulingRequest,
  ScheduledClass,
  StudentProgress,
  LearningContent,
  TimeSlot,
  SchedulingConstraints,
  SchedulingScoringWeights,
  SchedulingConflict,
  ConflictResolution,
  ClassCapacityConstraint,
  CourseType,
} from '@/types/scheduling';

/**
 * Content-based scheduling algorithm
 * Schedules classes based on unlearned content and student progress
 */
export class ContentBasedScheduler {
  constructor(
    private constraints: SchedulingConstraints,
    private scoringWeights: SchedulingScoringWeights
  ) {}

  /**
   * Schedule classes based on content progression
   */
  async scheduleByContent(
    studentProgress: StudentProgress[],
    availableContent: LearningContent[],
    availableSlots: TimeSlot[]
  ): Promise<ScheduledClass[]> {
    const scheduledClasses: ScheduledClass[] = [];

    // Group students by similar progress levels
    const studentGroups = this.groupStudentsByProgress(studentProgress);

    for (const group of studentGroups) {
      const nextContent = this.determineNextContent(group, availableContent);
      
      if (nextContent.length > 0) {
        const optimalSlot = this.findOptimalSlotForContent(
          nextContent,
          group,
          availableSlots
        );

        if (optimalSlot) {
          const scheduledClass = this.createScheduledClass(
            group,
            nextContent,
            optimalSlot
          );
          
          scheduledClasses.push(scheduledClass);
          
          // Remove used slot from available slots
          availableSlots = availableSlots.filter(slot => slot.id !== optimalSlot.id);
        }
      }
    }

    return scheduledClasses;
  }

  /**
   * Group students by similar progress levels for efficient class formation
   */
  private groupStudentsByProgress(studentProgress: StudentProgress[]): StudentProgress[][] {
    const groups: StudentProgress[][] = [];
    const maxGroupSize = this.constraints.maxStudentsPerClass;

    // Sort students by current unit and lesson
    const sortedStudents = [...studentProgress].sort((a, b) => {
      if (a.currentUnit !== b.currentUnit) {
        return a.currentUnit - b.currentUnit;
      }
      return a.currentLesson - b.currentLesson;
    });

    let currentGroup: StudentProgress[] = [];
    let lastUnit = -1;
    let lastLesson = -1;

    for (const student of sortedStudents) {
      // Start new group if unit/lesson changed or group is full
      if (
        (lastUnit !== -1 && (student.currentUnit !== lastUnit || student.currentLesson !== lastLesson)) ||
        currentGroup.length >= maxGroupSize
      ) {
        if (currentGroup.length > 0) {
          groups.push(currentGroup);
        }
        currentGroup = [];
      }

      currentGroup.push(student);
      lastUnit = student.currentUnit;
      lastLesson = student.currentLesson;
    }

    // Add the last group
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  }

  /**
   * Determine next content to cover for a group of students
   */
  private determineNextContent(
    studentGroup: StudentProgress[],
    availableContent: LearningContent[]
  ): LearningContent[] {
    if (studentGroup.length === 0) return [];

    // Find common unlearned content
    const commonUnlearnedContent = this.findCommonUnlearnedContent(
      studentGroup,
      availableContent
    );

    // Prioritize content based on learning objectives and difficulty
    return this.prioritizeContent(commonUnlearnedContent, studentGroup);
  }

  /**
   * Find content that is unlearned by all students in the group
   */
  private findCommonUnlearnedContent(
    studentGroup: StudentProgress[],
    availableContent: LearningContent[]
  ): LearningContent[] {
    const commonContent: LearningContent[] = [];

    for (const content of availableContent) {
      const isCommonUnlearned = studentGroup.every(student =>
        student.unlearnedContent.includes(content.id)
      );

      if (isCommonUnlearned) {
        commonContent.push(content);
      }
    }

    return commonContent;
  }

  /**
   * Prioritize content based on learning progression and difficulty
   */
  private prioritizeContent(
    content: LearningContent[],
    studentGroup: StudentProgress[]
  ): LearningContent[] {
    return content.sort((a, b) => {
      // Priority factors:
      // 1. Prerequisites met
      // 2. Appropriate difficulty level
      // 3. Learning objectives alignment
      // 4. Estimated duration

      const scoreA = this.calculateContentScore(a, studentGroup);
      const scoreB = this.calculateContentScore(b, studentGroup);

      return scoreB - scoreA; // Higher score first
    });
  }

  /**
   * Calculate content suitability score for a student group
   */
  private calculateContentScore(
    content: LearningContent,
    studentGroup: StudentProgress[]
  ): number {
    let score = 0;

    // Check prerequisites
    const prerequisitesMet = studentGroup.every(student =>
      content.prerequisites.every(prereq => student.completedContent.includes(prereq))
    );
    if (prerequisitesMet) score += 50;

    // Difficulty alignment (prefer content matching average skill level)
    const avgSkillLevel = this.calculateAverageSkillLevel(studentGroup);
    const difficultyAlignment = 1 - Math.abs(content.difficultyLevel - avgSkillLevel) / 10;
    score += difficultyAlignment * 30;

    // Required content gets higher priority
    if (content.isRequired) score += 20;

    // Duration preference (avoid very long or very short sessions)
    const durationScore = this.calculateDurationScore(content.estimatedDuration);
    score += durationScore * 10;

    return score;
  }

  /**
   * Calculate average skill level for a student group
   */
  private calculateAverageSkillLevel(studentGroup: StudentProgress[]): number {
    if (studentGroup.length === 0) return 5;

    const totalSkillLevel = studentGroup.reduce((sum, student) => {
      const skillValues = Object.values(student.skillAssessments);
      const avgSkill = skillValues.length > 0 
        ? skillValues.reduce((a, b) => a + b, 0) / skillValues.length 
        : 5;
      return sum + avgSkill;
    }, 0);

    return totalSkillLevel / studentGroup.length;
  }

  /**
   * Calculate duration score (prefer 45-90 minute sessions)
   */
  private calculateDurationScore(duration: number): number {
    if (duration >= 45 && duration <= 90) return 1.0;
    if (duration >= 30 && duration <= 120) return 0.7;
    return 0.3;
  }

  /**
   * Find optimal time slot for specific content and student group
   */
  private findOptimalSlotForContent(
    content: LearningContent[],
    studentGroup: StudentProgress[],
    availableSlots: TimeSlot[]
  ): TimeSlot | null {
    let bestSlot: TimeSlot | null = null;
    let bestScore = 0;

    for (const slot of availableSlots) {
      if (!slot.isAvailable || slot.capacity.availableSpots < studentGroup.length) {
        continue;
      }

      const score = this.calculateSlotScore(slot, content, studentGroup);
      
      if (score > bestScore) {
        bestScore = score;
        bestSlot = slot;
      }
    }

    return bestSlot;
  }

  /**
   * Calculate time slot suitability score
   */
  private calculateSlotScore(
    slot: TimeSlot,
    content: LearningContent[],
    studentGroup: StudentProgress[]
  ): number {
    let score = 0;

    // Duration matching
    const totalContentDuration = content.reduce((sum, c) => sum + c.estimatedDuration, 0);
    const durationMatch = 1 - Math.abs(slot.duration - totalContentDuration) / Math.max(slot.duration, totalContentDuration);
    score += durationMatch * this.scoringWeights.contentProgression;

    // Student availability preferences
    const availabilityScore = this.calculateStudentAvailabilityScore(slot, studentGroup);
    score += availabilityScore * this.scoringWeights.studentAvailability;

    // Capacity utilization
    const utilizationScore = studentGroup.length / slot.capacity.maxStudents;
    score += utilizationScore * this.scoringWeights.classSizeOptimization;

    // Time of day optimization
    const timeScore = this.calculateTimeOptimizationScore(slot);
    score += timeScore * this.scoringWeights.scheduleContinuity;

    return score;
  }

  /**
   * Calculate student availability score for a time slot
   */
  private calculateStudentAvailabilityScore(
    slot: TimeSlot,
    studentGroup: StudentProgress[]
  ): number {
    let totalScore = 0;

    for (const student of studentGroup) {
      // Check if slot matches student's preferred times
      const preferenceMatch = student.preferredTimes.some(prefSlot =>
        prefSlot.dayOfWeek === slot.dayOfWeek &&
        this.timeOverlaps(prefSlot, slot)
      );

      // Check performance history for this time
      const performanceScore = this.getPerformanceScoreForTime(student, slot);

      const studentScore = preferenceMatch ? 1.0 : 0.5 + performanceScore * 0.5;
      totalScore += studentScore;
    }

    return studentGroup.length > 0 ? totalScore / studentGroup.length : 0;
  }

  /**
   * Check if two time slots overlap
   */
  private timeOverlaps(slot1: TimeSlot, slot2: TimeSlot): boolean {
    const start1 = this.timeToMinutes(slot1.startTime);
    const end1 = this.timeToMinutes(slot1.endTime);
    const start2 = this.timeToMinutes(slot2.startTime);
    const end2 = this.timeToMinutes(slot2.endTime);

    return start1 < end2 && start2 < end1;
  }

  /**
   * Convert time string to minutes since midnight
   */
  private timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Get performance score for student at specific time
   */
  private getPerformanceScoreForTime(student: StudentProgress, slot: TimeSlot): number {
    // Check if this time appears in best performing times
    const bestTimeMatch = student.performanceMetrics.bestPerformingTimes.some(bestSlot =>
      bestSlot.dayOfWeek === slot.dayOfWeek &&
      this.timeOverlaps(bestSlot, slot)
    );

    return bestTimeMatch ? 1.0 : 0.6; // Default to moderate score if no data
  }

  /**
   * Calculate time optimization score based on learning research
   */
  private calculateTimeOptimizationScore(slot: TimeSlot): number {
    const hour = this.timeToMinutes(slot.startTime) / 60;

    // Research suggests peak learning times:
    // Morning: 9-11 AM (score: 1.0)
    // Late morning: 11 AM - 1 PM (score: 0.9)
    // Afternoon: 2-4 PM (score: 0.8)
    // Early evening: 4-6 PM (score: 0.7)
    // Other times: lower scores

    if (hour >= 9 && hour < 11) return 1.0;
    if (hour >= 11 && hour < 13) return 0.9;
    if (hour >= 14 && hour < 16) return 0.8;
    if (hour >= 16 && hour < 18) return 0.7;
    if (hour >= 8 && hour < 9) return 0.6;
    if (hour >= 18 && hour < 20) return 0.5;
    return 0.3;
  }

  /**
   * Create a scheduled class from components
   */
  private createScheduledClass(
    studentGroup: StudentProgress[],
    content: LearningContent[],
    timeSlot: TimeSlot
  ): ScheduledClass {
    const classType = studentGroup.length === 1 ? 'individual' : 'group';
    const confidenceScore = this.calculateConfidenceScore(studentGroup, content, timeSlot);

    return {
      id: `class-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      courseId: studentGroup[0]?.courseId || '',
      teacherId: '', // Will be assigned by teacher allocation algorithm
      studentIds: studentGroup.map(s => s.studentId),
      timeSlot,
      content,
      classType,
      status: 'scheduled',
      confidenceScore,
      rationale: this.generateSchedulingRationale(studentGroup, content, timeSlot),
      alternatives: [],
    };
  }

  /**
   * Calculate confidence score for the scheduling decision
   */
  private calculateConfidenceScore(
    studentGroup: StudentProgress[],
    content: LearningContent[],
    timeSlot: TimeSlot
  ): number {
    let score = 0;

    // Content alignment score
    const contentScore = this.calculateContentAlignmentScore(studentGroup, content);
    score += contentScore * 0.4;

    // Time slot optimality score
    const timeScore = this.calculateSlotScore(timeSlot, content, studentGroup);
    score += timeScore * 0.3;

    // Group cohesion score
    const cohesionScore = this.calculateGroupCohesionScore(studentGroup);
    score += cohesionScore * 0.2;

    // Capacity utilization score
    const utilizationScore = studentGroup.length / timeSlot.capacity.maxStudents;
    score += utilizationScore * 0.1;

    return Math.min(1.0, Math.max(0.0, score));
  }

  /**
   * Calculate content alignment score
   */
  private calculateContentAlignmentScore(
    studentGroup: StudentProgress[],
    content: LearningContent[]
  ): number {
    if (studentGroup.length === 0 || content.length === 0) return 0;

    let totalScore = 0;

    for (const student of studentGroup) {
      let studentScore = 0;

      for (const contentItem of content) {
        // Check if content is in student's unlearned list
        if (student.unlearnedContent.includes(contentItem.id)) {
          studentScore += 1;
        }

        // Check prerequisite alignment
        const prerequisitesMet = contentItem.prerequisites.every(prereq =>
          student.completedContent.includes(prereq)
        );
        if (prerequisitesMet) {
          studentScore += 0.5;
        }

        // Check difficulty alignment
        const avgSkill = this.getStudentAverageSkill(student);
        const difficultyAlignment = 1 - Math.abs(contentItem.difficultyLevel - avgSkill) / 10;
        studentScore += difficultyAlignment * 0.3;
      }

      totalScore += studentScore / content.length;
    }

    return totalScore / studentGroup.length;
  }

  /**
   * Get student's average skill level
   */
  private getStudentAverageSkill(student: StudentProgress): number {
    const skills = Object.values(student.skillAssessments);
    return skills.length > 0 ? skills.reduce((a, b) => a + b, 0) / skills.length : 5;
  }

  /**
   * Calculate group cohesion score
   */
  private calculateGroupCohesionScore(studentGroup: StudentProgress[]): number {
    if (studentGroup.length <= 1) return 1.0;

    // Calculate variance in progress levels
    const progressLevels = studentGroup.map(s => s.progressPercentage);
    const avgProgress = progressLevels.reduce((a, b) => a + b, 0) / progressLevels.length;
    const variance = progressLevels.reduce((sum, progress) => 
      sum + Math.pow(progress - avgProgress, 2), 0) / progressLevels.length;

    // Lower variance = higher cohesion
    const maxVariance = 2500; // Assume max variance of 50^2
    const cohesionScore = 1 - Math.min(variance / maxVariance, 1);

    return cohesionScore;
  }

  /**
   * Generate human-readable rationale for scheduling decision
   */
  private generateSchedulingRationale(
    studentGroup: StudentProgress[],
    content: LearningContent[],
    timeSlot: TimeSlot
  ): string {
    const reasons: string[] = [];

    // Group composition
    if (studentGroup.length === 1) {
      reasons.push('Individual session for personalized learning');
    } else {
      const avgProgress = studentGroup.reduce((sum, s) => sum + s.progressPercentage, 0) / studentGroup.length;
      reasons.push(`Group of ${studentGroup.length} students with similar progress (avg ${avgProgress.toFixed(1)}%)`);
    }

    // Content selection
    if (content.length > 0) {
      const contentTitles = content.map(c => c.title).join(', ');
      reasons.push(`Covering next required content: ${contentTitles}`);
    }

    // Time selection
    const hour = this.timeToMinutes(timeSlot.startTime) / 60;
    if (hour >= 9 && hour < 12) {
      reasons.push('Scheduled during peak learning hours');
    } else if (hour >= 14 && hour < 17) {
      reasons.push('Scheduled during optimal afternoon learning period');
    }

    return reasons.join('. ');
  }
}

/**
 * Teacher workload balancing algorithm
 */
export class TeacherWorkloadBalancer {
  constructor(
    private constraints: SchedulingConstraints,
    private scoringWeights: SchedulingScoringWeights
  ) {}

  /**
   * Assign teachers to scheduled classes while balancing workload
   */
  async assignTeachers(
    scheduledClasses: ScheduledClass[],
    availableTeachers: any[] // Would be proper teacher type
  ): Promise<ScheduledClass[]> {
    const updatedClasses = [...scheduledClasses];

    for (const scheduledClass of updatedClasses) {
      const optimalTeacher = this.findOptimalTeacher(
        scheduledClass,
        availableTeachers,
        updatedClasses
      );

      if (optimalTeacher) {
        scheduledClass.teacherId = optimalTeacher.id;
      }
    }

    return updatedClasses;
  }

  /**
   * Find optimal teacher for a specific class
   */
  private findOptimalTeacher(
    scheduledClass: ScheduledClass,
    availableTeachers: any[],
    allClasses: ScheduledClass[]
  ): any | null {
    let bestTeacher: any = null;
    let bestScore = 0;

    for (const teacher of availableTeachers) {
      const score = this.calculateTeacherScore(teacher, scheduledClass, allClasses);
      
      if (score > bestScore) {
        bestScore = score;
        bestTeacher = teacher;
      }
    }

    return bestTeacher;
  }

  /**
   * Calculate teacher suitability score
   */
  private calculateTeacherScore(
    teacher: any,
    scheduledClass: ScheduledClass,
    allClasses: ScheduledClass[]
  ): number {
    let score = 0;

    // Check availability for this time slot
    if (!this.isTeacherAvailable(teacher, scheduledClass.timeSlot, allClasses)) {
      return 0; // Cannot assign if not available
    }

    // Workload balance (prefer teachers with lighter current load)
    const currentWorkload = this.calculateTeacherWorkload(teacher.id, allClasses);
    const workloadScore = 1 - (currentWorkload / this.constraints.maxConcurrentClassesPerTeacher);
    score += workloadScore * 0.4;

    // Subject expertise (would be calculated based on teacher qualifications)
    const expertiseScore = this.calculateExpertiseScore(teacher, scheduledClass);
    score += expertiseScore * 0.3;

    // Class type preference
    const classTypeScore = this.calculateClassTypePreference(teacher, scheduledClass);
    score += classTypeScore * 0.2;

    // Previous student feedback
    const feedbackScore = this.calculateFeedbackScore(teacher);
    score += feedbackScore * 0.1;

    return score;
  }

  /**
   * Check if teacher is available for the time slot
   */
  private isTeacherAvailable(
    teacher: any,
    timeSlot: TimeSlot,
    allClasses: ScheduledClass[]
  ): boolean {
    // Check for conflicts with already assigned classes
    const conflicts = allClasses.filter(cls =>
      cls.teacherId === teacher.id &&
      cls.timeSlot.dayOfWeek === timeSlot.dayOfWeek &&
      this.timeOverlaps(cls.timeSlot, timeSlot)
    );

    return conflicts.length === 0;
  }

  /**
   * Check if two time slots overlap
   */
  private timeOverlaps(slot1: TimeSlot, slot2: TimeSlot): boolean {
    const start1 = this.timeToMinutes(slot1.startTime);
    const end1 = this.timeToMinutes(slot1.endTime);
    const start2 = this.timeToMinutes(slot2.startTime);
    const end2 = this.timeToMinutes(slot2.endTime);

    return start1 < end2 && start2 < end1;
  }

  /**
   * Convert time string to minutes since midnight
   */
  private timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Calculate teacher's current workload
   */
  private calculateTeacherWorkload(teacherId: string, allClasses: ScheduledClass[]): number {
    return allClasses.filter(cls => cls.teacherId === teacherId).length;
  }

  /**
   * Calculate teacher's expertise score for the class content
   */
  private calculateExpertiseScore(teacher: any, scheduledClass: ScheduledClass): number {
    // This would be based on teacher qualifications, certifications, and experience
    // For now, return a default score
    return 0.8;
  }

  /**
   * Calculate teacher's preference for class type
   */
  private calculateClassTypePreference(teacher: any, scheduledClass: ScheduledClass): number {
    // This would be based on teacher preferences and performance data
    // For now, return a default score
    return 0.7;
  }

  /**
   * Calculate teacher's feedback score
   */
  private calculateFeedbackScore(teacher: any): number {
    // This would be based on student feedback and performance ratings
    // For now, return a default score
    return 0.85;
  }
}

/**
 * Conflict detection and resolution algorithms
 */
export class ConflictDetector {
  constructor(private constraints: SchedulingConstraints) {}

  /**
   * Detect all types of scheduling conflicts
   */
  detectConflicts(scheduledClasses: ScheduledClass[]): SchedulingConflict[] {
    const conflicts: SchedulingConflict[] = [];

    conflicts.push(...this.detectTimeConflicts(scheduledClasses));
    conflicts.push(...this.detectCapacityConflicts(scheduledClasses));
    conflicts.push(...this.detectTeacherConflicts(scheduledClasses));
    conflicts.push(...this.detectResourceConflicts(scheduledClasses));

    return conflicts;
  }

  /**
   * Detect time overlap conflicts
   */
  private detectTimeConflicts(scheduledClasses: ScheduledClass[]): SchedulingConflict[] {
    const conflicts: SchedulingConflict[] = [];

    for (let i = 0; i < scheduledClasses.length; i++) {
      for (let j = i + 1; j < scheduledClasses.length; j++) {
        const class1 = scheduledClasses[i];
        const class2 = scheduledClasses[j];

        // Check for student conflicts
        const commonStudents = class1.studentIds.filter(id => 
          class2.studentIds.includes(id)
        );

        if (commonStudents.length > 0 && this.timeSlotsOverlap(class1.timeSlot, class2.timeSlot)) {
          conflicts.push({
            id: `time-conflict-${Date.now()}-${i}-${j}`,
            type: 'time_overlap',
            severity: 'high',
            entityIds: [class1.id, class2.id],
            description: `Students ${commonStudents.join(', ')} have overlapping classes`,
            resolutions: this.generateTimeConflictResolutions(class1, class2),
            detectedAt: new Date().toISOString(),
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Detect capacity exceeded conflicts
   */
  private detectCapacityConflicts(scheduledClasses: ScheduledClass[]): SchedulingConflict[] {
    const conflicts: SchedulingConflict[] = [];

    for (const scheduledClass of scheduledClasses) {
      if (scheduledClass.studentIds.length > scheduledClass.timeSlot.capacity.maxStudents) {
        conflicts.push({
          id: `capacity-conflict-${scheduledClass.id}`,
          type: 'capacity_exceeded',
          severity: 'critical',
          entityIds: [scheduledClass.id],
          description: `Class ${scheduledClass.id} has ${scheduledClass.studentIds.length} students but capacity is ${scheduledClass.timeSlot.capacity.maxStudents}`,
          resolutions: this.generateCapacityConflictResolutions(scheduledClass),
          detectedAt: new Date().toISOString(),
        });
      }
    }

    return conflicts;
  }

  /**
   * Detect teacher availability conflicts
   */
  private detectTeacherConflicts(scheduledClasses: ScheduledClass[]): SchedulingConflict[] {
    const conflicts: SchedulingConflict[] = [];
    const teacherSchedules = new Map<string, ScheduledClass[]>();

    // Group classes by teacher
    for (const scheduledClass of scheduledClasses) {
      if (scheduledClass.teacherId) {
        if (!teacherSchedules.has(scheduledClass.teacherId)) {
          teacherSchedules.set(scheduledClass.teacherId, []);
        }
        teacherSchedules.get(scheduledClass.teacherId)!.push(scheduledClass);
      }
    }

    // Check for teacher conflicts
    for (const [teacherId, classes] of teacherSchedules) {
      for (let i = 0; i < classes.length; i++) {
        for (let j = i + 1; j < classes.length; j++) {
          const class1 = classes[i];
          const class2 = classes[j];

          if (this.timeSlotsOverlap(class1.timeSlot, class2.timeSlot)) {
            conflicts.push({
              id: `teacher-conflict-${teacherId}-${i}-${j}`,
              type: 'teacher_unavailable',
              severity: 'high',
              entityIds: [class1.id, class2.id],
              description: `Teacher ${teacherId} has overlapping classes`,
              resolutions: this.generateTeacherConflictResolutions(class1, class2),
              detectedAt: new Date().toISOString(),
            });
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * Detect resource conflicts (rooms, equipment, etc.)
   */
  private detectResourceConflicts(scheduledClasses: ScheduledClass[]): SchedulingConflict[] {
    const conflicts: SchedulingConflict[] = [];
    const locationSchedules = new Map<string, ScheduledClass[]>();

    // Group classes by location
    for (const scheduledClass of scheduledClasses) {
      const location = scheduledClass.timeSlot.location || 'default';
      if (!locationSchedules.has(location)) {
        locationSchedules.set(location, []);
      }
      locationSchedules.get(location)!.push(scheduledClass);
    }

    // Check for location conflicts
    for (const [location, classes] of locationSchedules) {
      for (let i = 0; i < classes.length; i++) {
        for (let j = i + 1; j < classes.length; j++) {
          const class1 = classes[i];
          const class2 = classes[j];

          if (this.timeSlotsOverlap(class1.timeSlot, class2.timeSlot)) {
            conflicts.push({
              id: `resource-conflict-${location}-${i}-${j}`,
              type: 'resource_conflict',
              severity: 'medium',
              entityIds: [class1.id, class2.id],
              description: `Location ${location} is double-booked`,
              resolutions: this.generateResourceConflictResolutions(class1, class2),
              detectedAt: new Date().toISOString(),
            });
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * Check if two time slots overlap
   */
  private timeSlotsOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
    if (slot1.dayOfWeek !== slot2.dayOfWeek) return false;

    const start1 = this.timeToMinutes(slot1.startTime);
    const end1 = this.timeToMinutes(slot1.endTime);
    const start2 = this.timeToMinutes(slot2.startTime);
    const end2 = this.timeToMinutes(slot2.endTime);

    return start1 < end2 && start2 < end1;
  }

  /**
   * Convert time string to minutes since midnight
   */
  private timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Generate resolutions for time conflicts
   */
  private generateTimeConflictResolutions(
    class1: ScheduledClass,
    class2: ScheduledClass
  ): ConflictResolution[] {
    return [
      {
        id: `resolution-${Date.now()}-reschedule-1`,
        type: 'reschedule',
        description: `Reschedule ${class1.id} to a different time slot`,
        impact: {
          affectedStudents: class1.studentIds.length,
          affectedTeachers: 1,
          scheduleDisruption: 3,
          resourceUtilization: 0,
          studentSatisfaction: -0.1,
        },
        feasibilityScore: 0.8,
        estimatedImplementationTime: 15,
        requiredApprovals: ['teacher', 'students'],
        steps: [
          {
            order: 1,
            description: 'Find alternative time slot',
            type: 'schedule_change',
            parameters: { classId: class1.id },
            estimatedDuration: 5,
            dependencies: [],
          },
          {
            order: 2,
            description: 'Notify affected parties',
            type: 'notification',
            parameters: { recipients: class1.studentIds },
            estimatedDuration: 10,
            dependencies: ['step-1'],
          },
        ],
      },
    ];
  }

  /**
   * Generate resolutions for capacity conflicts
   */
  private generateCapacityConflictResolutions(
    scheduledClass: ScheduledClass
  ): ConflictResolution[] {
    return [
      {
        id: `resolution-${Date.now()}-split-class`,
        type: 'split_class',
        description: `Split class ${scheduledClass.id} into multiple smaller classes`,
        impact: {
          affectedStudents: scheduledClass.studentIds.length,
          affectedTeachers: 2,
          scheduleDisruption: 5,
          resourceUtilization: 0.2,
          studentSatisfaction: 0.1,
        },
        feasibilityScore: 0.9,
        estimatedImplementationTime: 30,
        requiredApprovals: ['admin'],
        steps: [],
      },
    ];
  }

  /**
   * Generate resolutions for teacher conflicts
   */
  private generateTeacherConflictResolutions(
    class1: ScheduledClass,
    class2: ScheduledClass
  ): ConflictResolution[] {
    return [
      {
        id: `resolution-${Date.now()}-reassign-teacher`,
        type: 'reassign_teacher',
        description: `Assign different teacher to one of the conflicting classes`,
        impact: {
          affectedStudents: Math.min(class1.studentIds.length, class2.studentIds.length),
          affectedTeachers: 2,
          scheduleDisruption: 2,
          resourceUtilization: 0,
          studentSatisfaction: -0.05,
        },
        feasibilityScore: 0.7,
        estimatedImplementationTime: 20,
        requiredApprovals: ['teacher'],
        steps: [],
      },
    ];
  }

  /**
   * Generate resolutions for resource conflicts
   */
  private generateResourceConflictResolutions(
    class1: ScheduledClass,
    class2: ScheduledClass
  ): ConflictResolution[] {
    return [
      {
        id: `resolution-${Date.now()}-change-location`,
        type: 'reschedule',
        description: `Move one class to a different location`,
        impact: {
          affectedStudents: Math.min(class1.studentIds.length, class2.studentIds.length),
          affectedTeachers: 1,
          scheduleDisruption: 1,
          resourceUtilization: 0,
          studentSatisfaction: -0.02,
        },
        feasibilityScore: 0.9,
        estimatedImplementationTime: 10,
        requiredApprovals: [],
        steps: [],
      },
    ];
  }
}

// Export all algorithms
export {
  ContentBasedScheduler,
  TeacherWorkloadBalancer,
  ConflictDetector,
};