import { supabase } from "@/lib/supabase";
import { withRetry } from "./crud-service";
import { schedulingRulesEngine } from "./scheduling-rules-engine";
import { classCompositionAlgorithm } from "./class-composition-algorithm";
import {
  SchedulingOptimizationResult,
  ScheduledClass,
  SchedulingDecision,
  ClassComposition,
  TeacherAvailability,
  StudentAvailability,
  TimeSlot,
  SchedulingRequest,
  SchedulingResponse,
  PerformanceMetrics,
  CourseType,
  RulesEngineConfig
} from "@/types/scheduling";

export interface OptimizationConstraints {
  max_classes_per_day: number;
  min_break_between_classes: number;
  max_consecutive_classes: number;
  preferred_time_blocks: TimeSlot[];
  blocked_time_slots: TimeSlot[];
  teacher_workload_limits: Map<string, number>; // teacher_id -> max_hours_per_week
  room_capacity_constraints: Map<string, number>; // room_id -> max_students
}

export interface OptimizationMetrics {
  utilization_score: number;
  satisfaction_score: number;
  efficiency_score: number;
  conflict_score: number;
  balance_score: number;
}

export interface SchedulingConflict {
  type: 'time_overlap' | 'teacher_double_booking' | 'student_double_booking' | 'room_conflict' | 'constraint_violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affected_entities: string[];
  suggested_resolution: string;
  auto_resolvable: boolean;
}

export interface OptimizationSolution {
  scheduled_classes: ScheduledClass[];
  unresolved_conflicts: SchedulingConflict[];
  optimization_metrics: OptimizationMetrics;
  alternative_solutions: OptimizationSolution[];
  confidence_score: number;
}

export class SchedulingOptimizationService {
  private defaultConstraints: OptimizationConstraints = {
    max_classes_per_day: 8,
    min_break_between_classes: 15,
    max_consecutive_classes: 3,
    preferred_time_blocks: [],
    blocked_time_slots: [],
    teacher_workload_limits: new Map(),
    room_capacity_constraints: new Map(),
  };

  /**
   * Main optimization method - takes scheduling decisions and optimizes them
   */
  async optimizeSchedule(
    decisions: SchedulingDecision[],
    constraints?: Partial<OptimizationConstraints>,
    config?: Partial<RulesEngineConfig>
  ): Promise<OptimizationSolution> {
    return withRetry(async () => {
      const finalConstraints = { ...this.defaultConstraints, ...constraints };
      
      // Step 1: Detect initial conflicts
      const initialConflicts = await this.detectConflicts(decisions);
      
      // Step 2: Resolve conflicts using different strategies
      const resolvedDecisions = await this.resolveConflicts(decisions, initialConflicts, finalConstraints);
      
      // Step 3: Apply optimization algorithms
      const optimizedSolution = await this.applyOptimizationAlgorithms(resolvedDecisions, finalConstraints);
      
      // Step 4: Validate and score the solution
      const validatedSolution = await this.validateAndScoreSolution(optimizedSolution, finalConstraints);
      
      // Step 5: Generate alternative solutions
      const alternatives = await this.generateAlternativeSolutions(validatedSolution, finalConstraints, 3);
      
      return {
        ...validatedSolution,
        alternative_solutions: alternatives,
      };
    });
  }

  /**
   * Optimize availability utilization for teachers and students
   */
  async optimizeAvailabilityUtilization(
    teacherAvailability: Map<string, TeacherAvailability>,
    studentAvailability: Map<string, StudentAvailability>,
    classCompositions: ClassComposition[]
  ): Promise<{
    optimal_time_slots: Map<string, TimeSlot[]>;
    utilization_scores: Map<string, number>;
    recommendations: string[];
  }> {
    return withRetry(async () => {
      const optimalTimeSlots = new Map<string, TimeSlot[]>();
      const utilizationScores = new Map<string, number>();
      const recommendations: string[] = [];

      // Analyze teacher availability patterns
      for (const [teacherId, availability] of teacherAvailability) {
        const utilization = this.calculateTeacherUtilization(availability, classCompositions);
        utilizationScores.set(teacherId, utilization);
        
        const optimalSlots = this.findOptimalTimeSlots(availability, classCompositions);
        optimalTimeSlots.set(teacherId, optimalSlots);
        
        if (utilization < 60) {
          recommendations.push(`Teacher ${teacherId} is underutilized (${utilization}%). Consider additional classes.`);
        } else if (utilization > 90) {
          recommendations.push(`Teacher ${teacherId} is overutilized (${utilization}%). Consider reducing workload.`);
        }
      }

      // Analyze student availability patterns
      for (const [studentId, availability] of studentAvailability) {
        const studentClasses = classCompositions.filter(comp => comp.student_ids.includes(studentId));
        const utilization = this.calculateStudentUtilization(availability, studentClasses);
        utilizationScores.set(studentId, utilization);
        
        if (utilization < 30) {
          recommendations.push(`Student ${studentId} has low class frequency. Consider more sessions.`);
        }
      }

      return {
        optimal_time_slots: optimalTimeSlots,
        utilization_scores: utilizationScores,
        recommendations,
      };
    });
  }

  /**
   * Optimize class timing based on student performance patterns
   */
  async optimizeClassTiming(
    studentIds: string[],
    performanceData: Map<string, any[]>,
    availableTimeSlots: TimeSlot[]
  ): Promise<{
    optimal_schedule: Map<string, TimeSlot>;
    performance_predictions: Map<string, number>;
    timing_recommendations: string[];
  }> {
    return withRetry(async () => {
      const optimalSchedule = new Map<string, TimeSlot>();
      const performancePredictions = new Map<string, number>();
      const timingRecommendations: string[] = [];

      for (const studentId of studentIds) {
        const studentPerformance = performanceData.get(studentId) || [];
        
        // Analyze historical performance by time of day
        const timePerformanceMap = this.analyzeTimePerformancePatterns(studentPerformance);
        
        // Find best time slots for this student
        const rankedSlots = availableTimeSlots
          .map(slot => ({
            slot,
            score: this.scoreTimeSlotForStudent(slot, timePerformanceMap),
          }))
          .sort((a, b) => b.score - a.score);

        if (rankedSlots.length > 0) {
          optimalSchedule.set(studentId, rankedSlots[0].slot);
          performancePredictions.set(studentId, rankedSlots[0].score);
          
          const bestTime = rankedSlots[0].slot;
          timingRecommendations.push(
            `Student ${studentId} performs best at ${bestTime.start_time} on ${this.getDayName(bestTime.day_of_week)}`
          );
        }
      }

      return {
        optimal_schedule: optimalSchedule,
        performance_predictions: performancePredictions,
        timing_recommendations: timingRecommendations,
      };
    });
  }

  /**
   * Balance workload across teachers
   */
  async balanceTeacherWorkload(
    teachers: string[],
    classCompositions: ClassComposition[],
    teacherConstraints: Map<string, any>
  ): Promise<{
    balanced_assignments: Map<string, ClassComposition[]>;
    workload_distribution: Map<string, number>;
    balance_score: number;
  }> {
    return withRetry(async () => {
      const balancedAssignments = new Map<string, ClassComposition[]>();
      const workloadDistribution = new Map<string, number>();

      // Initialize teacher assignments
      teachers.forEach(teacherId => {
        balancedAssignments.set(teacherId, []);
        workloadDistribution.set(teacherId, 0);
      });

      // Sort compositions by priority and difficulty
      const sortedCompositions = [...classCompositions].sort((a, b) => {
        const priorityWeight = this.getPriorityWeight(a.scheduling_priority) - this.getPriorityWeight(b.scheduling_priority);
        if (priorityWeight !== 0) return priorityWeight;
        return b.difficulty_level - a.difficulty_level;
      });

      // Assign compositions to teachers using load balancing
      for (const composition of sortedCompositions) {
        const suitableTeachers = this.findSuitableTeachers(composition, teachers, teacherConstraints);
        
        if (suitableTeachers.length === 0) continue;

        // Find teacher with lowest current workload
        const selectedTeacher = suitableTeachers.reduce((minTeacher, teacher) => {
          const currentLoad = workloadDistribution.get(teacher) || 0;
          const minLoad = workloadDistribution.get(minTeacher) || 0;
          return currentLoad < minLoad ? teacher : minTeacher;
        });

        // Assign composition to selected teacher
        const currentAssignments = balancedAssignments.get(selectedTeacher) || [];
        currentAssignments.push(composition);
        balancedAssignments.set(selectedTeacher, currentAssignments);

        // Update workload
        const currentWorkload = workloadDistribution.get(selectedTeacher) || 0;
        const newWorkload = currentWorkload + composition.recommended_duration;
        workloadDistribution.set(selectedTeacher, newWorkload);
      }

      // Calculate balance score
      const workloads = Array.from(workloadDistribution.values());
      const balanceScore = this.calculateBalanceScore(workloads);

      return {
        balanced_assignments: balancedAssignments,
        workload_distribution: workloadDistribution,
        balance_score: balanceScore,
      };
    });
  }

  /**
   * Generate comprehensive scheduling report
   */
  async generateOptimizationReport(
    solution: OptimizationSolution,
    originalDecisions: SchedulingDecision[]
  ): Promise<{
    summary: {
      total_classes_scheduled: number;
      total_students_served: number;
      total_teachers_utilized: number;
      optimization_improvement: number;
    };
    metrics: OptimizationMetrics;
    conflicts: SchedulingConflict[];
    recommendations: string[];
    performance_analysis: {
      before_optimization: PerformanceMetrics;
      after_optimization: PerformanceMetrics;
      improvement_areas: string[];
    };
  }> {
    return withRetry(async () => {
      const beforeMetrics = this.calculatePerformanceMetrics(originalDecisions);
      const afterMetrics = this.calculatePerformanceMetrics(solution.scheduled_classes.map(sc => ({
        id: sc.id,
        class_composition: {
          id: sc.id,
          student_ids: sc.student_ids,
          content_focus: sc.content_items,
          class_type: sc.class_type,
          recommended_duration: sc.duration_minutes,
          difficulty_level: 5,
          teacher_requirements: [],
          scheduling_priority: 'medium',
          optimal_class_size: sc.student_ids.length,
          learning_objectives: sc.learning_objectives,
          prerequisite_check: true,
        },
        teacher_id: sc.teacher_id,
        scheduled_time: sc.scheduled_time,
        decision_rationale: '',
        confidence_score: solution.confidence_score,
        alternatives: [],
        constraints_met: [],
        constraints_violated: [],
      })));

      const uniqueStudents = new Set(solution.scheduled_classes.flatMap(sc => sc.student_ids));
      const uniqueTeachers = new Set(solution.scheduled_classes.map(sc => sc.teacher_id).filter(Boolean));

      const optimizationImprovement = this.calculateOptimizationImprovement(beforeMetrics, afterMetrics);
      const improvementAreas = this.identifyImprovementAreas(beforeMetrics, afterMetrics);
      const recommendations = this.generateOptimizationRecommendations(solution, afterMetrics);

      return {
        summary: {
          total_classes_scheduled: solution.scheduled_classes.length,
          total_students_served: uniqueStudents.size,
          total_teachers_utilized: uniqueTeachers.size,
          optimization_improvement: optimizationImprovement,
        },
        metrics: solution.optimization_metrics,
        conflicts: solution.unresolved_conflicts,
        recommendations,
        performance_analysis: {
          before_optimization: beforeMetrics,
          after_optimization: afterMetrics,
          improvement_areas: improvementAreas,
        },
      };
    });
  }

  // Private helper methods

  private async detectConflicts(decisions: SchedulingDecision[]): Promise<SchedulingConflict[]> {
    const conflicts: SchedulingConflict[] = [];
    const timeSlotMap = new Map<string, SchedulingDecision[]>();
    const teacherSchedule = new Map<string, string[]>();
    const studentSchedule = new Map<string, string[]>();

    // Group decisions by time slot and track schedules
    for (const decision of decisions) {
      if (!decision.scheduled_time || !decision.teacher_id) continue;

      const timeKey = decision.scheduled_time;
      
      // Track time slot usage
      if (!timeSlotMap.has(timeKey)) {
        timeSlotMap.set(timeKey, []);
      }
      timeSlotMap.get(timeKey)!.push(decision);

      // Track teacher schedule
      if (!teacherSchedule.has(decision.teacher_id)) {
        teacherSchedule.set(decision.teacher_id, []);
      }
      teacherSchedule.get(decision.teacher_id)!.push(timeKey);

      // Track student schedules
      for (const studentId of decision.class_composition.student_ids) {
        if (!studentSchedule.has(studentId)) {
          studentSchedule.set(studentId, []);
        }
        studentSchedule.get(studentId)!.push(timeKey);
      }
    }

    // Detect teacher double bookings
    for (const [teacherId, timeSlots] of teacherSchedule) {
      const duplicateSlots = timeSlots.filter((slot, index) => timeSlots.indexOf(slot) !== index);
      for (const slot of [...new Set(duplicateSlots)]) {
        conflicts.push({
          type: 'teacher_double_booking',
          severity: 'critical',
          description: `Teacher ${teacherId} is double-booked at ${slot}`,
          affected_entities: [teacherId],
          suggested_resolution: 'Reschedule one of the conflicting classes',
          auto_resolvable: true,
        });
      }
    }

    // Detect student double bookings
    for (const [studentId, timeSlots] of studentSchedule) {
      const duplicateSlots = timeSlots.filter((slot, index) => timeSlots.indexOf(slot) !== index);
      for (const slot of [...new Set(duplicateSlots)]) {
        conflicts.push({
          type: 'student_double_booking',
          severity: 'critical',
          description: `Student ${studentId} is double-booked at ${slot}`,
          affected_entities: [studentId],
          suggested_resolution: 'Reschedule one of the conflicting classes',
          auto_resolvable: true,
        });
      }
    }

    return conflicts;
  }

  private async resolveConflicts(
    decisions: SchedulingDecision[],
    conflicts: SchedulingConflict[],
    constraints: OptimizationConstraints
  ): Promise<SchedulingDecision[]> {
    let resolvedDecisions = [...decisions];

    for (const conflict of conflicts) {
      if (conflict.auto_resolvable) {
        resolvedDecisions = await this.resolveConflict(resolvedDecisions, conflict, constraints);
      }
    }

    return resolvedDecisions;
  }

  private async resolveConflict(
    decisions: SchedulingDecision[],
    conflict: SchedulingConflict,
    constraints: OptimizationConstraints
  ): Promise<SchedulingDecision[]> {
    // Find affected decisions
    const affectedDecisions = decisions.filter(decision =>
      conflict.affected_entities.some(entity =>
        entity === decision.teacher_id ||
        decision.class_composition.student_ids.includes(entity)
      )
    );

    if (affectedDecisions.length === 0) return decisions;

    // Sort by priority and confidence (reschedule lower priority first)
    const sortedDecisions = affectedDecisions.sort((a, b) => {
      const priorityA = this.getPriorityWeight(a.class_composition.scheduling_priority);
      const priorityB = this.getPriorityWeight(b.class_composition.scheduling_priority);
      if (priorityA !== priorityB) return priorityA - priorityB;
      return a.confidence_score - b.confidence_score;
    });

    // Try to reschedule the lowest priority decision
    const decisionToReschedule = sortedDecisions[0];
    const newTime = await this.findAlternativeTimeSlot(decisionToReschedule, decisions, constraints);

    if (newTime) {
      const updatedDecisions = decisions.map(d =>
        d.id === decisionToReschedule.id
          ? { ...d, scheduled_time: newTime }
          : d
      );
      return updatedDecisions;
    }

    return decisions;
  }

  private async findAlternativeTimeSlot(
    decision: SchedulingDecision,
    allDecisions: SchedulingDecision[],
    constraints: OptimizationConstraints
  ): Promise<string | undefined> {
    // Generate possible time slots
    const possibleSlots = this.generatePossibleTimeSlots(constraints);
    
    // Filter out occupied slots
    const occupiedSlots = new Set(allDecisions.map(d => d.scheduled_time).filter(Boolean));
    const availableSlots = possibleSlots.filter(slot => !occupiedSlots.has(slot));

    // Score and sort available slots
    const scoredSlots = availableSlots.map(slot => ({
      slot,
      score: this.scoreTimeSlotForDecision(decision, slot),
    })).sort((a, b) => b.score - a.score);

    return scoredSlots.length > 0 ? scoredSlots[0].slot : undefined;
  }

  private async applyOptimizationAlgorithms(
    decisions: SchedulingDecision[],
    constraints: OptimizationConstraints
  ): Promise<OptimizationSolution> {
    // Convert decisions to scheduled classes
    const scheduledClasses: ScheduledClass[] = decisions
      .filter(d => d.teacher_id && d.scheduled_time)
      .map(decision => ({
        id: decision.id,
        student_ids: decision.class_composition.student_ids,
        teacher_id: decision.teacher_id!,
        content_items: decision.class_composition.content_focus,
        scheduled_time: decision.scheduled_time!,
        duration_minutes: decision.class_composition.recommended_duration,
        class_type: decision.class_composition.class_type,
        room_or_link: '', // Will be assigned later
        preparation_notes: decision.decision_rationale,
        learning_objectives: decision.class_composition.learning_objectives,
        success_criteria: [],
      }));

    // Apply time slot optimization
    const timeOptimizedClasses = await this.optimizeTimeSlots(scheduledClasses, constraints);
    
    // Apply resource optimization
    const resourceOptimizedClasses = await this.optimizeResourceAllocation(timeOptimizedClasses, constraints);

    // Calculate metrics
    const metrics = this.calculateOptimizationMetrics(resourceOptimizedClasses, constraints);
    
    // Detect remaining conflicts
    const remainingConflicts = await this.detectConflicts(
      resourceOptimizedClasses.map(sc => ({
        id: sc.id,
        class_composition: {
          id: sc.id,
          student_ids: sc.student_ids,
          content_focus: sc.content_items,
          class_type: sc.class_type,
          recommended_duration: sc.duration_minutes,
          difficulty_level: 5,
          teacher_requirements: [],
          scheduling_priority: 'medium',
          optimal_class_size: sc.student_ids.length,
          learning_objectives: sc.learning_objectives,
          prerequisite_check: true,
        },
        teacher_id: sc.teacher_id,
        scheduled_time: sc.scheduled_time,
        decision_rationale: '',
        confidence_score: 75,
        alternatives: [],
        constraints_met: [],
        constraints_violated: [],
      }))
    );

    return {
      scheduled_classes: resourceOptimizedClasses,
      unresolved_conflicts: remainingConflicts,
      optimization_metrics: metrics,
      alternative_solutions: [],
      confidence_score: this.calculateSolutionConfidence(resourceOptimizedClasses, remainingConflicts, metrics),
    };
  }

  private async optimizeTimeSlots(
    classes: ScheduledClass[],
    constraints: OptimizationConstraints
  ): Promise<ScheduledClass[]> {
    // Implement time slot optimization logic
    // For now, return classes as-is
    return classes;
  }

  private async optimizeResourceAllocation(
    classes: ScheduledClass[],
    constraints: OptimizationConstraints
  ): Promise<ScheduledClass[]> {
    // Assign rooms or online links based on class type and capacity
    return classes.map(cls => ({
      ...cls,
      room_or_link: cls.class_type === 'individual' || cls.student_ids.length <= 2
        ? `https://zoom.us/j/${Math.random().toString().substr(2, 10)}`
        : `Room ${Math.floor(Math.random() * 20) + 1}`,
    }));
  }

  private calculateOptimizationMetrics(
    classes: ScheduledClass[],
    constraints: OptimizationConstraints
  ): OptimizationMetrics {
    // Calculate various optimization metrics
    const utilizationScore = this.calculateUtilizationScore(classes);
    const satisfactionScore = this.calculateSatisfactionScore(classes);
    const efficiencyScore = this.calculateEfficiencyScore(classes, constraints);
    const conflictScore = this.calculateConflictScore(classes);
    const balanceScore = this.calculateResourceBalanceScore(classes);

    return {
      utilization_score: utilizationScore,
      satisfaction_score: satisfactionScore,
      efficiency_score: efficiencyScore,
      conflict_score: conflictScore,
      balance_score: balanceScore,
    };
  }

  private async validateAndScoreSolution(
    solution: OptimizationSolution,
    constraints: OptimizationConstraints
  ): Promise<OptimizationSolution> {
    // Validate solution against constraints
    const validationResults = this.validateSolutionConstraints(solution, constraints);
    
    // Update confidence score based on validation
    const adjustedConfidence = solution.confidence_score * (validationResults.compliance_score / 100);

    return {
      ...solution,
      confidence_score: adjustedConfidence,
    };
  }

  private async generateAlternativeSolutions(
    baseSolution: OptimizationSolution,
    constraints: OptimizationConstraints,
    count: number
  ): Promise<OptimizationSolution[]> {
    const alternatives: OptimizationSolution[] = [];
    
    // Generate variations of the base solution
    for (let i = 0; i < count; i++) {
      const variation = await this.createSolutionVariation(baseSolution, constraints, i);
      if (variation) {
        alternatives.push(variation);
      }
    }

    return alternatives.sort((a, b) => b.confidence_score - a.confidence_score);
  }

  private async createSolutionVariation(
    baseSolution: OptimizationSolution,
    constraints: OptimizationConstraints,
    variationIndex: number
  ): Promise<OptimizationSolution | null> {
    // Create a variation by applying different optimization strategies
    const variationStrategy = ['time_focused', 'resource_focused', 'balance_focused'][variationIndex % 3];
    
    // Apply strategy-specific modifications
    const modifiedClasses = this.applyVariationStrategy(baseSolution.scheduled_classes, variationStrategy);
    
    // Recalculate metrics
    const metrics = this.calculateOptimizationMetrics(modifiedClasses, constraints);
    const conflicts = await this.detectConflicts(modifiedClasses.map(sc => ({
      id: sc.id,
      class_composition: {
        id: sc.id,
        student_ids: sc.student_ids,
        content_focus: sc.content_items,
        class_type: sc.class_type,
        recommended_duration: sc.duration_minutes,
        difficulty_level: 5,
        teacher_requirements: [],
        scheduling_priority: 'medium',
        optimal_class_size: sc.student_ids.length,
        learning_objectives: sc.learning_objectives,
        prerequisite_check: true,
      },
      teacher_id: sc.teacher_id,
      scheduled_time: sc.scheduled_time,
      decision_rationale: '',
      confidence_score: 75,
      alternatives: [],
      constraints_met: [],
      constraints_violated: [],
    })));

    return {
      scheduled_classes: modifiedClasses,
      unresolved_conflicts: conflicts,
      optimization_metrics: metrics,
      alternative_solutions: [],
      confidence_score: this.calculateSolutionConfidence(modifiedClasses, conflicts, metrics),
    };
  }

  // Additional utility methods

  private calculateTeacherUtilization(
    availability: TeacherAvailability,
    compositions: ClassComposition[]
  ): number {
    const totalAvailableHours = availability.weekly_schedule
      .filter(slot => slot.is_available)
      .reduce((sum, slot) => {
        const start = this.parseTime(slot.start_time);
        const end = this.parseTime(slot.end_time);
        return sum + (end - start) / 60; // Convert to hours
      }, 0);

    const assignedHours = compositions
      .filter(comp => comp.teacher_requirements.length === 0) // Simplified check
      .reduce((sum, comp) => sum + comp.recommended_duration / 60, 0);

    return totalAvailableHours > 0 ? (assignedHours / totalAvailableHours) * 100 : 0;
  }

  private calculateStudentUtilization(
    availability: StudentAvailability,
    compositions: ClassComposition[]
  ): number {
    const studentCompositions = compositions.filter(comp => 
      comp.student_ids.includes(availability.student_id)
    );

    const totalClassHours = studentCompositions.reduce(
      (sum, comp) => sum + comp.recommended_duration / 60, 0
    );

    // Assume optimal utilization is around 4-6 hours per week
    const optimalHours = 5;
    return Math.min(100, (totalClassHours / optimalHours) * 100);
  }

  private findOptimalTimeSlots(
    availability: TeacherAvailability,
    compositions: ClassComposition[]
  ): TimeSlot[] {
    return availability.weekly_schedule
      .filter(slot => slot.is_available)
      .sort((a, b) => {
        // Prefer time slots that match teacher preferences
        const scoreA = this.scoreTimeSlotForTeacher(a, availability);
        const scoreB = this.scoreTimeSlotForTeacher(b, availability);
        return scoreB - scoreA;
      })
      .slice(0, 10); // Return top 10 slots
  }

  private analyzeTimePerformancePatterns(performanceData: any[]): Map<string, number> {
    const timePerformanceMap = new Map<string, number>();
    
    for (const data of performanceData) {
      if (data.scheduled_time && data.rating) {
        const time = new Date(data.scheduled_time);
        const timeKey = `${time.getDay()}-${time.getHours()}`;
        
        if (!timePerformanceMap.has(timeKey)) {
          timePerformanceMap.set(timeKey, []);
        }
        timePerformanceMap.get(timeKey)!.push(data.rating);
      }
    }

    // Calculate average ratings for each time slot
    const avgPerformanceMap = new Map<string, number>();
    for (const [timeKey, ratings] of timePerformanceMap) {
      const avgRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
      avgPerformanceMap.set(timeKey, avgRating);
    }

    return avgPerformanceMap;
  }

  private scoreTimeSlotForStudent(slot: TimeSlot, performanceMap: Map<string, number>): number {
    const timeKey = `${slot.day_of_week}-${this.parseTime(slot.start_time) / 60}`;
    return performanceMap.get(timeKey) || 3; // Default score
  }

  private scoreTimeSlotForTeacher(slot: TimeSlot, availability: TeacherAvailability): number {
    // Prefer slots during preferred class types and times
    let score = 50; // Base score
    
    // Higher score for preferred time blocks (simplified)
    if (slot.day_of_week >= 1 && slot.day_of_week <= 5) score += 20; // Weekdays
    
    const hour = this.parseTime(slot.start_time) / 60;
    if (hour >= 9 && hour <= 17) score += 20; // Business hours
    
    return score;
  }

  private scoreTimeSlotForDecision(decision: SchedulingDecision, timeSlot: string): number {
    // Score based on student preferences, teacher availability, etc.
    // Simplified implementation
    return 50 + Math.random() * 50;
  }

  private getPriorityWeight(priority: string): number {
    const weights = { urgent: 4, high: 3, medium: 2, low: 1 };
    return weights[priority] || 2;
  }

  private findSuitableTeachers(
    composition: ClassComposition,
    teachers: string[],
    constraints: Map<string, any>
  ): string[] {
    return teachers.filter(teacherId => {
      const teacherConstraints = constraints.get(teacherId);
      if (!teacherConstraints) return true;
      
      // Check if teacher can handle the class size
      if (teacherConstraints.max_class_size && composition.student_ids.length > teacherConstraints.max_class_size) {
        return false;
      }
      
      // Check specialization requirements
      if (composition.teacher_requirements.length > 0) {
        const hasRequiredSkills = composition.teacher_requirements.every(req =>
          teacherConstraints.specializations?.includes(req)
        );
        if (!hasRequiredSkills) return false;
      }
      
      return true;
    });
  }

  private calculateBalanceScore(workloads: number[]): number {
    if (workloads.length === 0) return 100;
    
    const mean = workloads.reduce((sum, w) => sum + w, 0) / workloads.length;
    const variance = workloads.reduce((sum, w) => sum + Math.pow(w - mean, 2), 0) / workloads.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Lower standard deviation indicates better balance
    const normalizedStdDev = mean > 0 ? standardDeviation / mean : 0;
    return Math.max(0, 100 - normalizedStdDev * 100);
  }

  private generatePossibleTimeSlots(constraints: OptimizationConstraints): string[] {
    const slots: string[] = [];
    const startDate = new Date();
    
    for (let day = 0; day < 14; day++) { // Next 2 weeks
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + day);
      
      for (let hour = 9; hour <= 17; hour++) { // 9 AM to 5 PM
        const timeSlot = new Date(currentDate);
        timeSlot.setHours(hour, 0, 0, 0);
        slots.push(timeSlot.toISOString());
      }
    }
    
    return slots;
  }

  private calculateOptimizationImprovement(
    before: PerformanceMetrics,
    after: PerformanceMetrics
  ): number {
    const improvements = [
      after.scheduling_efficiency - before.scheduling_efficiency,
      after.teacher_utilization - before.teacher_utilization,
      after.student_preference_satisfaction - before.student_preference_satisfaction,
    ];
    
    return improvements.reduce((sum, imp) => sum + imp, 0) / improvements.length;
  }

  private identifyImprovementAreas(
    before: PerformanceMetrics,
    after: PerformanceMetrics
  ): string[] {
    const areas: string[] = [];
    
    if (after.scheduling_efficiency > before.scheduling_efficiency) {
      areas.push('Scheduling efficiency improved');
    }
    if (after.teacher_utilization > before.teacher_utilization) {
      areas.push('Teacher utilization improved');
    }
    if (after.student_preference_satisfaction > before.student_preference_satisfaction) {
      areas.push('Student satisfaction improved');
    }
    
    return areas;
  }

  private generateOptimizationRecommendations(
    solution: OptimizationSolution,
    metrics: PerformanceMetrics
  ): string[] {
    const recommendations: string[] = [];
    
    if (metrics.teacher_utilization < 70) {
      recommendations.push('Consider increasing teacher utilization by scheduling more classes');
    }
    
    if (solution.unresolved_conflicts.length > 0) {
      recommendations.push(`Resolve ${solution.unresolved_conflicts.length} remaining scheduling conflicts`);
    }
    
    if (metrics.scheduling_efficiency < 80) {
      recommendations.push('Review class groupings and time slot assignments to improve efficiency');
    }
    
    return recommendations;
  }

  // Additional utility methods for calculations

  private calculatePerformanceMetrics(data: any[]): PerformanceMetrics {
    return {
      total_students_scheduled: 0,
      total_classes_created: data.length,
      average_class_utilization: 0,
      content_coverage_percentage: 80,
      student_preference_satisfaction: 75,
      teacher_utilization: 70,
      scheduling_efficiency: 85,
    };
  }

  private calculateUtilizationScore(classes: ScheduledClass[]): number {
    // Calculate resource utilization score
    return 80; // Placeholder
  }

  private calculateSatisfactionScore(classes: ScheduledClass[]): number {
    // Calculate student/teacher satisfaction score
    return 75; // Placeholder
  }

  private calculateEfficiencyScore(classes: ScheduledClass[], constraints: OptimizationConstraints): number {
    // Calculate scheduling efficiency score
    return 85; // Placeholder
  }

  private calculateConflictScore(classes: ScheduledClass[]): number {
    // Calculate conflict resolution score (higher is better)
    return 90; // Placeholder
  }

  private calculateResourceBalanceScore(classes: ScheduledClass[]): number {
    // Calculate resource balance score
    return 80; // Placeholder
  }

  private validateSolutionConstraints(
    solution: OptimizationSolution,
    constraints: OptimizationConstraints
  ): { compliance_score: number; violations: string[] } {
    return {
      compliance_score: 95,
      violations: [],
    };
  }

  private calculateSolutionConfidence(
    classes: ScheduledClass[],
    conflicts: SchedulingConflict[],
    metrics: OptimizationMetrics
  ): number {
    let confidence = 70; // Base confidence
    
    if (conflicts.length === 0) confidence += 20;
    if (metrics.utilization_score > 80) confidence += 5;
    if (metrics.satisfaction_score > 80) confidence += 5;
    
    return Math.min(100, confidence);
  }

  private applyVariationStrategy(classes: ScheduledClass[], strategy: string): ScheduledClass[] {
    // Apply different optimization strategies to create variations
    return classes; // Simplified
  }

  private parseTime(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private getDayName(dayOfWeek: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek] || 'Unknown';
  }
}

// Export singleton instance
export const schedulingOptimizationService = new SchedulingOptimizationService();