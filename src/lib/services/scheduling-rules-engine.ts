import { supabase } from "@/lib/supabase";
import { withRetry } from "./crud-service";
import { contentAnalysisService } from "./content-analysis-service";
import { logger } from '@/lib/services';
import {
  SchedulingRule,
  RuleCondition,
  RuleAction,
  ClassComposition,
  SchedulingDecision,
  AlternativeScheduling,
  StudentAvailability,
  TeacherAvailability,
  SchedulingOptimizationResult,
  ScheduledClass,
  PerformanceMetrics,
  RulesEngineConfig,
  SchedulingRequest,
  SchedulingResponse,
  CourseType,
  ClassType,
  SchedulingPriority,
  StudentProgress,
  UnlearnedContent,
  ContentItem,
  TimeSlot
} from "@/types/scheduling";
import { z } from "zod";

export class SchedulingRulesEngine {
  private config: RulesEngineConfig;
  private activeRules: SchedulingRule[] = [];

  constructor(config?: Partial<RulesEngineConfig>) {
    this.config = {
      strategy: 'balanced',
      optimization_weight: {
        content_priority: 0.3,
        student_preference: 0.2,
        teacher_availability: 0.2,
        class_size_optimization: 0.15,
        time_efficiency: 0.15,
      },
      constraints: {
        max_students_per_group: 9,
        min_students_per_group: 2,
        max_classes_per_day: 8,
        min_break_between_classes: 15,
        content_difficulty_variance: 2,
      },
      scheduling_horizon_days: 14,
      reoptimization_frequency: 'weekly',
      ...config,
    };
    
    this.initializeDefaultRules();
  }

  /**
   * Main scheduling method - orchestrates the entire process
   */
  async scheduleClasses(request: SchedulingRequest): Promise<SchedulingResponse> {
    const startTime = Date.now();
    
    try {
      // Override config if provided
      if (request.config_override) {
        this.config = { ...this.config, ...request.config_override };
      }

      // Step 1: Analyze student progress and unlearned content
      const studentsToSchedule = await this.identifyStudentsToSchedule(request);
      const studentProgressData = await this.gatherStudentProgress(studentsToSchedule);
      const unlearnedContentData = await this.gatherUnlearnedContent(studentsToSchedule);

      // Step 2: Apply content-based rules to create class compositions
      const classCompositions = await this.createClassCompositions(
        studentProgressData,
        unlearnedContentData,
        request.course_type
      );

      // Step 3: Apply scheduling rules to assign times and teachers
      const schedulingDecisions = await this.applySchedulingRules(
        classCompositions,
        request.time_range
      );

      // Step 4: Optimize the schedule
      const optimizedSchedule = await this.optimizeSchedule(
        schedulingDecisions,
        request.optimization_goals
      );

      // Step 5: Generate performance metrics
      const performanceMetrics = this.calculatePerformanceMetrics(
        optimizedSchedule,
        studentsToSchedule
      );

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        result: {
          scheduled_classes: optimizedSchedule.scheduled_classes,
          unscheduled_students: optimizedSchedule.unscheduled_students,
          optimization_score: optimizedSchedule.optimization_score,
          performance_metrics: performanceMetrics,
          recommendations: this.generateRecommendations(optimizedSchedule, performanceMetrics),
          next_optimization_date: this.calculateNextOptimizationDate()
        },
        processing_time_ms: processingTime,
        recommendations: this.generateRecommendations(optimizedSchedule, performanceMetrics)
      };

    } catch (error) {
      logger.error('Scheduling error:', error);
      return {
        success: false,
        error: error.message,
        processing_time_ms: Date.now() - startTime,
        recommendations: ['Check system logs for detailed error information']
      };
    }
  }

  /**
   * Create class compositions based on unlearned content analysis
   */
  private async createClassCompositions(
    studentProgressData: Map<string, StudentProgress[]>,
    unlearnedContentData: Map<string, UnlearnedContent[]>,
    courseType?: CourseType
  ): Promise<ClassComposition[]> {
    const compositions: ClassComposition[] = [];
    const processedStudents = new Set<string>();

    // Group students by similar unlearned content
    const contentGroups = this.groupStudentsByContent(unlearnedContentData, courseType);

    for (const [contentKey, studentIds] of contentGroups) {
      const students = studentIds.filter(id => !processedStudents.has(id));
      if (students.length === 0) continue;

      const [unitNumber, lessonNumber] = contentKey.split('-').map(Number);
      const contentItems = await this.getContentItems(unitNumber, lessonNumber, courseType);
      
      if (contentItems.length === 0) continue;

      // Apply content-based rules
      const applicableRules = this.getApplicableRules('content_priority', { 
        contentItems,
        studentCount: students.length,
        courseType 
      });

      // Determine optimal class size and type
      const optimalSize = this.calculateOptimalClassSize(students, contentItems);
      const classType = this.determineClassType(students, contentItems);

      // Create compositions for this content group
      const groupCompositions = await this.createCompositionsForGroup(
        students,
        contentItems,
        optimalSize,
        classType,
        studentProgressData,
        applicableRules
      );

      compositions.push(...groupCompositions);
      students.forEach(id => processedStudents.add(id));
    }

    // Handle remaining students who couldn't be grouped
    const remainingStudents = Array.from(studentProgressData.keys())
      .filter(id => !processedStudents.has(id));

    if (remainingStudents.length > 0) {
      const individualCompositions = await this.createIndividualCompositions(
        remainingStudents,
        unlearnedContentData,
        studentProgressData
      );
      compositions.push(...individualCompositions);
    }

    return compositions;
  }

  /**
   * Apply scheduling rules to assign times and teachers
   */
  private async applySchedulingRules(
    classCompositions: ClassComposition[],
    timeRange: { start_date: string; end_date: string }
  ): Promise<SchedulingDecision[]> {
    const decisions: SchedulingDecision[] = [];
    
    // Get availability data
    const studentAvailability = await this.getStudentAvailability(
      classCompositions.flatMap(c => c.student_ids)
    );
    const teacherAvailability = await this.getTeacherAvailability();

    for (const composition of classCompositions) {
      const decision = await this.createSchedulingDecision(
        composition,
        studentAvailability,
        teacherAvailability,
        timeRange
      );
      decisions.push(decision);
    }

    return decisions;
  }

  /**
   * Optimize the schedule using weighted scoring
   */
  private async optimizeSchedule(
    decisions: SchedulingDecision[],
    optimizationGoals: string[]
  ): Promise<SchedulingOptimizationResult> {
    const scheduledClasses: ScheduledClass[] = [];
    const unscheduledStudents: string[] = [];
    
    // Sort decisions by confidence score and priority
    const sortedDecisions = decisions.sort((a, b) => {
      const scoreA = this.calculateOptimizationScore(a, optimizationGoals);
      const scoreB = this.calculateOptimizationScore(b, optimizationGoals);
      return scoreB - scoreA;
    });

    const scheduledTimeSlots = new Map<string, string[]>(); // teacher_id -> time slots
    const scheduledStudentSlots = new Map<string, string[]>(); // student_id -> time slots

    for (const decision of sortedDecisions) {
      const canSchedule = this.checkSchedulingConstraints(
        decision,
        scheduledTimeSlots,
        scheduledStudentSlots
      );

      if (canSchedule && decision.teacher_id && decision.scheduled_time) {
        const scheduledClass: ScheduledClass = {
          id: `class_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          student_ids: decision.class_composition.student_ids,
          teacher_id: decision.teacher_id,
          content_items: decision.class_composition.content_focus,
          scheduled_time: decision.scheduled_time,
          duration_minutes: decision.class_composition.recommended_duration,
          class_type: decision.class_composition.class_type,
          room_or_link: await this.assignRoomOrLink(decision.class_composition.class_type),
          preparation_notes: this.generatePreparationNotes(decision.class_composition),
          learning_objectives: decision.class_composition.learning_objectives,
          success_criteria: this.generateSuccessCriteria(decision.class_composition)
        };

        scheduledClasses.push(scheduledClass);
        
        // Update scheduled slots
        if (!scheduledTimeSlots.has(decision.teacher_id)) {
          scheduledTimeSlots.set(decision.teacher_id, []);
        }
        scheduledTimeSlots.get(decision.teacher_id)!.push(decision.scheduled_time);

        for (const studentId of decision.class_composition.student_ids) {
          if (!scheduledStudentSlots.has(studentId)) {
            scheduledStudentSlots.set(studentId, []);
          }
          scheduledStudentSlots.get(studentId)!.push(decision.scheduled_time);
        }
      } else {
        unscheduledStudents.push(...decision.class_composition.student_ids);
      }
    }

    const optimizationScore = this.calculateOverallOptimizationScore(
      scheduledClasses,
      unscheduledStudents,
      decisions
    );

    return {
      scheduled_classes: scheduledClasses,
      unscheduled_students: [...new Set(unscheduledStudents)],
      optimization_score: optimizationScore,
      performance_metrics: this.calculatePerformanceMetrics(
        { scheduled_classes: scheduledClasses, unscheduled_students: [...new Set(unscheduledStudents)] } as any,
        []
      ),
      recommendations: [],
      next_optimization_date: this.calculateNextOptimizationDate()
    };
  }

  /**
   * Group students by similar content needs
   */
  private groupStudentsByContent(
    unlearnedContentData: Map<string, UnlearnedContent[]>,
    courseType?: CourseType
  ): Map<string, string[]> {
    const contentGroups = new Map<string, string[]>();

    for (const [studentId, unlearnedContentList] of unlearnedContentData) {
      for (const unlearnedContent of unlearnedContentList) {
        for (const contentItem of unlearnedContent.content_items) {
          if (courseType && !this.isContentCompatibleWithCourse(contentItem, courseType)) {
            continue;
          }

          const contentKey = `${contentItem.unit_number}-${contentItem.lesson_number}`;
          
          if (!contentGroups.has(contentKey)) {
            contentGroups.set(contentKey, []);
          }
          
          if (!contentGroups.get(contentKey)!.includes(studentId)) {
            contentGroups.get(contentKey)!.push(studentId);
          }
        }
      }
    }

    // Filter groups that have enough students
    const filteredGroups = new Map<string, string[]>();
    for (const [contentKey, studentIds] of contentGroups) {
      if (studentIds.length >= this.config.constraints.min_students_per_group) {
        filteredGroups.set(contentKey, studentIds);
      }
    }

    return filteredGroups;
  }

  /**
   * Initialize default scheduling rules
   */
  private initializeDefaultRules(): void {
    this.activeRules = [
      {
        id: 'content_priority_urgent',
        name: 'Urgent Content Priority',
        description: 'Prioritize students with urgent unlearned content',
        rule_type: 'content_priority',
        priority: 1,
        conditions: [
          {
            type: 'progress_gap',
            operator: 'gte',
            value: 0.5,
            weight: 0.8
          }
        ],
        actions: [
          {
            type: 'set_priority',
            parameters: { priority: 'urgent' }
          }
        ],
        is_active: true,
        course_types: ['Basic', 'Everyday A', 'Everyday B', 'Speak Up', 'Business English', '1-on-1']
      },
      {
        id: 'group_size_optimization',
        name: 'Optimal Group Size',
        description: 'Maintain optimal group sizes for effective learning',
        rule_type: 'student_grouping',
        priority: 2,
        conditions: [
          {
            type: 'student_count',
            operator: 'gte',
            value: 2,
            weight: 0.6
          },
          {
            type: 'student_count',
            operator: 'lte',
            value: 9,
            weight: 0.6
          }
        ],
        actions: [
          {
            type: 'group_students',
            parameters: { min_size: 2, max_size: 9 }
          }
        ],
        is_active: true,
        course_types: ['Basic', 'Everyday A', 'Everyday B', 'Speak Up', 'Business English']
      },
      {
        id: 'individual_class_struggling',
        name: 'Individual Classes for Struggling Students',
        description: 'Assign individual classes to students who are struggling',
        rule_type: 'student_grouping',
        priority: 3,
        conditions: [
          {
            type: 'learning_pace',
            operator: 'eq',
            value: 'slow',
            weight: 0.7
          }
        ],
        actions: [
          {
            type: 'schedule_class',
            parameters: { class_type: 'individual' }
          }
        ],
        is_active: true,
        course_types: ['Basic', 'Everyday A', 'Everyday B', 'Speak Up', 'Business English', '1-on-1']
      },
      {
        id: 'teacher_specialization',
        name: 'Teacher Specialization Match',
        description: 'Match teachers with their specialization areas',
        rule_type: 'teacher_preference',
        priority: 4,
        conditions: [
          {
            type: 'content_difficulty',
            operator: 'gte',
            value: 7,
            weight: 0.5
          }
        ],
        actions: [
          {
            type: 'assign_teacher',
            parameters: { match_specialization: true }
          }
        ],
        is_active: true,
        course_types: ['Speak Up', 'Business English', '1-on-1']
      }
    ];
  }

  // Helper methods
  private async identifyStudentsToSchedule(request: SchedulingRequest): Promise<string[]> {
    if (request.student_ids && request.student_ids.length > 0) {
      return request.student_ids;
    }

    const { data: students } = await supabase
      .from("students")
      .select("id")
      .eq("test_level", request.course_type || "Basic");

    return students?.map(s => s.id) || [];
  }

  private async gatherStudentProgress(studentIds: string[]): Promise<Map<string, StudentProgress[]>> {
    const progressMap = new Map<string, StudentProgress[]>();

    for (const studentId of studentIds) {
      const progress = await contentAnalysisService.analyzeStudentProgress(studentId);
      progressMap.set(studentId, progress);
    }

    return progressMap;
  }

  private async gatherUnlearnedContent(studentIds: string[]): Promise<Map<string, UnlearnedContent[]>> {
    const contentMap = new Map<string, UnlearnedContent[]>();

    for (const studentId of studentIds) {
      const unlearnedContent = await contentAnalysisService.identifyUnlearnedContent(studentId);
      contentMap.set(studentId, unlearnedContent);
    }

    return contentMap;
  }

  private async getContentItems(unitNumber: number, lessonNumber: number, courseType?: CourseType): Promise<ContentItem[]> {
    const { data: materials } = await supabase
      .from("materials")
      .select("*")
      .eq("unit_number", unitNumber)
      .eq("lesson_number", lessonNumber);

    return materials?.map(material => ({
      id: material.id,
      title: material.title,
      unit_number: material.unit_number,
      lesson_number: material.lesson_number,
      content_type: this.inferContentType(material.material_type),
      difficulty_level: this.calculateDifficultyLevel(material.unit_number, material.lesson_number),
      prerequisites: [],
      estimated_duration_minutes: this.estimateDuration(material.material_type),
      tags: [],
      learning_objectives: []
    })) || [];
  }

  private calculateOptimalClassSize(students: string[], contentItems: ContentItem[]): number {
    const maxDifficulty = Math.max(...contentItems.map(c => c.difficulty_level));
    
    if (maxDifficulty > 7) return Math.min(4, students.length);
    if (maxDifficulty > 5) return Math.min(6, students.length);
    return Math.min(this.config.constraints.max_students_per_group, students.length);
  }

  private determineClassType(students: string[], contentItems: ContentItem[]): ClassType {
    if (students.length === 1) return 'individual';
    
    const avgDifficulty = contentItems.reduce((sum, c) => sum + c.difficulty_level, 0) / contentItems.length;
    if (avgDifficulty > 8) return 'individual';
    
    return 'group';
  }

  private async createCompositionsForGroup(
    students: string[],
    contentItems: ContentItem[],
    optimalSize: number,
    classType: ClassType,
    studentProgressData: Map<string, StudentProgress[]>,
    rules: SchedulingRule[]
  ): Promise<ClassComposition[]> {
    const compositions: ClassComposition[] = [];
    
    // Split students into groups of optimal size
    for (let i = 0; i < students.length; i += optimalSize) {
      const groupStudents = students.slice(i, i + optimalSize);
      
      const composition: ClassComposition = {
        id: `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        student_ids: groupStudents,
        content_focus: contentItems,
        class_type: classType,
        recommended_duration: this.calculateRecommendedDuration(contentItems, groupStudents.length),
        difficulty_level: Math.max(...contentItems.map(c => c.difficulty_level)),
        teacher_requirements: this.determineTeacherRequirements(contentItems),
        scheduling_priority: this.calculateSchedulingPriority(groupStudents, contentItems, studentProgressData),
        optimal_class_size: optimalSize,
        learning_objectives: contentItems.flatMap(c => c.learning_objectives),
        prerequisite_check: true
      };

      compositions.push(composition);
    }

    return compositions;
  }

  private async createIndividualCompositions(
    students: string[],
    unlearnedContentData: Map<string, UnlearnedContent[]>,
    studentProgressData: Map<string, StudentProgress[]>
  ): Promise<ClassComposition[]> {
    const compositions: ClassComposition[] = [];

    for (const studentId of students) {
      const unlearnedContent = unlearnedContentData.get(studentId) || [];
      const progress = studentProgressData.get(studentId) || [];
      
      if (unlearnedContent.length === 0) continue;

      const priorityContent = unlearnedContent.find(uc => uc.urgency_level === 'urgent') || unlearnedContent[0];
      
      const composition: ClassComposition = {
        id: `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        student_ids: [studentId],
        content_focus: priorityContent.content_items.slice(0, 3),
        class_type: 'individual',
        recommended_duration: Math.min(90, priorityContent.estimated_learning_time),
        difficulty_level: Math.max(...priorityContent.content_items.map(c => c.difficulty_level)),
        teacher_requirements: this.determineTeacherRequirements(priorityContent.content_items),
        scheduling_priority: priorityContent.urgency_level,
        optimal_class_size: 1,
        learning_objectives: priorityContent.content_items.flatMap(c => c.learning_objectives),
        prerequisite_check: true
      };

      compositions.push(composition);
    }

    return compositions;
  }

  private async getStudentAvailability(studentIds: string[]): Promise<Map<string, StudentAvailability>> {
    const availabilityMap = new Map<string, StudentAvailability>();
    
    for (const studentId of studentIds) {
      // In a real implementation, this would query a student availability table
      // For now, we'll generate basic availability
      const availability: StudentAvailability = {
        student_id: studentId,
        weekly_schedule: this.generateDefaultWeeklySchedule(),
        preferred_times: [],
        timezone: 'UTC',
        constraints: []
      };
      
      availabilityMap.set(studentId, availability);
    }

    return availabilityMap;
  }

  private async getTeacherAvailability(): Promise<Map<string, TeacherAvailability>> {
    const { data: teachers } = await supabase
      .from("teachers")
      .select("*");

    const availabilityMap = new Map<string, TeacherAvailability>();
    
    for (const teacher of teachers || []) {
      const availability: TeacherAvailability = {
        teacher_id: teacher.id,
        weekly_schedule: this.parseTeacherAvailability(teacher.availability),
        specializations: ['Basic', 'Everyday A', 'Everyday B'],
        max_students_per_class: 9,
        preferred_class_types: ['group'],
        teaching_constraints: []
      };
      
      availabilityMap.set(teacher.id, availability);
    }

    return availabilityMap;
  }

  private async createSchedulingDecision(
    composition: ClassComposition,
    studentAvailability: Map<string, StudentAvailability>,
    teacherAvailability: Map<string, TeacherAvailability>,
    timeRange: { start_date: string; end_date: string }
  ): Promise<SchedulingDecision> {
    const availableTeachers = Array.from(teacherAvailability.values()).filter(ta =>
      ta.specializations.includes('Basic') && // Simplified
      ta.max_students_per_class >= composition.student_ids.length
    );

    const bestTeacher = availableTeachers[0]; // Simplified selection
    const bestTime = this.findBestTimeSlot(composition, studentAvailability, bestTeacher);

    return {
      id: `decision_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      class_composition: composition,
      teacher_id: bestTeacher?.teacher_id,
      scheduled_time: bestTime,
      decision_rationale: this.generateDecisionRationale(composition, bestTeacher, bestTime),
      confidence_score: this.calculateConfidenceScore(composition, bestTeacher, bestTime),
      alternatives: [],
      constraints_met: [],
      constraints_violated: []
    };
  }

  private getApplicableRules(ruleType: string, context: any): SchedulingRule[] {
    return this.activeRules.filter(rule => 
      rule.rule_type === ruleType && 
      rule.is_active &&
      this.evaluateRuleConditions(rule, context)
    );
  }

  private evaluateRuleConditions(rule: SchedulingRule, context: any): boolean {
    // Simplified rule evaluation
    return rule.conditions.every(condition => {
      switch (condition.type) {
        case 'student_count':
          return this.evaluateCondition(context.studentCount, condition.operator, condition.value);
        case 'content_difficulty':
          const avgDifficulty = context.contentItems?.reduce((sum, c) => sum + c.difficulty_level, 0) / context.contentItems?.length || 0;
          return this.evaluateCondition(avgDifficulty, condition.operator, condition.value);
        default:
          return true;
      }
    });
  }

  private evaluateCondition(actual: any, operator: string, expected: any): boolean {
    switch (operator) {
      case 'eq': return actual === expected;
      case 'gt': return actual > expected;
      case 'lt': return actual < expected;
      case 'gte': return actual >= expected;
      case 'lte': return actual <= expected;
      case 'in': return expected.includes(actual);
      default: return true;
    }
  }

  private calculateOptimizationScore(decision: SchedulingDecision, goals: string[]): number {
    let score = 0;
    
    // Content priority weight
    score += decision.class_composition.scheduling_priority === 'urgent' ? 30 : 
             decision.class_composition.scheduling_priority === 'high' ? 20 : 10;
    
    // Class size optimization
    const optimalSize = decision.class_composition.optimal_class_size;
    const actualSize = decision.class_composition.student_ids.length;
    const sizeScore = Math.max(0, 20 - Math.abs(optimalSize - actualSize) * 5);
    score += sizeScore;
    
    // Teacher availability
    if (decision.teacher_id) score += 20;
    
    // Time slot assignment
    if (decision.scheduled_time) score += 15;
    
    // Confidence score
    score += decision.confidence_score * 0.15;
    
    return Math.min(100, score);
  }

  private checkSchedulingConstraints(
    decision: SchedulingDecision,
    scheduledTimeSlots: Map<string, string[]>,
    scheduledStudentSlots: Map<string, string[]>
  ): boolean {
    if (!decision.teacher_id || !decision.scheduled_time) return false;
    
    // Check teacher availability
    const teacherSlots = scheduledTimeSlots.get(decision.teacher_id) || [];
    if (teacherSlots.includes(decision.scheduled_time)) return false;
    
    // Check student availability
    for (const studentId of decision.class_composition.student_ids) {
      const studentSlots = scheduledStudentSlots.get(studentId) || [];
      if (studentSlots.includes(decision.scheduled_time)) return false;
    }
    
    return true;
  }

  private calculateOverallOptimizationScore(
    scheduledClasses: ScheduledClass[],
    unscheduledStudents: string[],
    allDecisions: SchedulingDecision[]
  ): number {
    const scheduledCount = scheduledClasses.length;
    const totalPossible = allDecisions.length;
    const schedulingRate = totalPossible > 0 ? scheduledCount / totalPossible : 0;
    
    return schedulingRate * 100;
  }

  private calculatePerformanceMetrics(
    result: { scheduled_classes: ScheduledClass[]; unscheduled_students: string[] },
    allStudents: string[]
  ): PerformanceMetrics {
    const totalStudentsInScheduledClasses = result.scheduled_classes.reduce(
      (sum, cls) => sum + cls.student_ids.length, 0
    );
    
    return {
      total_students_scheduled: totalStudentsInScheduledClasses,
      total_classes_created: result.scheduled_classes.length,
      average_class_utilization: result.scheduled_classes.length > 0 ? 
        totalStudentsInScheduledClasses / result.scheduled_classes.length : 0,
      content_coverage_percentage: 85, // Placeholder
      student_preference_satisfaction: 80, // Placeholder
      teacher_utilization: 75, // Placeholder
      scheduling_efficiency: 90 // Placeholder
    };
  }

  private generateRecommendations(
    result: SchedulingOptimizationResult,
    metrics: PerformanceMetrics
  ): string[] {
    const recommendations: string[] = [];
    
    if (result.unscheduled_students.length > 0) {
      recommendations.push(`${result.unscheduled_students.length} students could not be scheduled. Consider additional time slots or teachers.`);
    }
    
    if (metrics.average_class_utilization < 5) {
      recommendations.push("Class sizes are smaller than optimal. Consider consolidating classes or adjusting grouping rules.");
    }
    
    if (metrics.teacher_utilization < 60) {
      recommendations.push("Teacher utilization is low. Consider scheduling more classes or reducing teacher capacity.");
    }
    
    return recommendations;
  }

  private calculateNextOptimizationDate(): string {
    const now = new Date();
    const nextDate = new Date(now);
    
    switch (this.config.reoptimization_frequency) {
      case 'daily':
        nextDate.setDate(now.getDate() + 1);
        break;
      case 'weekly':
        nextDate.setDate(now.getDate() + 7);
        break;
      default:
        nextDate.setDate(now.getDate() + 7);
    }
    
    return nextDate.toISOString();
  }

  // Additional helper methods
  private isContentCompatibleWithCourse(content: ContentItem, courseType: CourseType): boolean {
    // Simplified compatibility check
    return true;
  }

  private inferContentType(materialType: string): any {
    const typeMap = {
      'PDF': 'reading',
      'Audio': 'listening',
      'Video': 'listening',
      'Book': 'reading',
      'Other': 'speaking'
    };
    return typeMap[materialType] || 'speaking';
  }

  private calculateDifficultyLevel(unitNumber: number, lessonNumber: number): number {
    return Math.min(10, Math.floor(unitNumber * 1.5 + lessonNumber * 0.3));
  }

  private estimateDuration(materialType: string): number {
    const durationMap = {
      'PDF': 45,
      'Audio': 60,
      'Video': 60,
      'Book': 90,
      'Other': 45
    };
    return durationMap[materialType] || 45;
  }

  private calculateRecommendedDuration(contentItems: ContentItem[], studentCount: number): number {
    const baseDuration = contentItems.reduce((sum, item) => sum + item.estimated_duration_minutes, 0);
    const groupFactor = Math.max(1, studentCount / 4);
    return Math.min(120, Math.max(45, baseDuration * groupFactor));
  }

  private determineTeacherRequirements(contentItems: ContentItem[]): string[] {
    const requirements = [];
    const maxDifficulty = Math.max(...contentItems.map(c => c.difficulty_level));
    
    if (maxDifficulty > 8) requirements.push('advanced_certification');
    if (maxDifficulty > 6) requirements.push('intermediate_certification');
    if (contentItems.some(c => c.content_type === 'speaking')) requirements.push('speaking_specialist');
    
    return requirements;
  }

  private calculateSchedulingPriority(
    students: string[],
    contentItems: ContentItem[],
    progressData: Map<string, StudentProgress[]>
  ): SchedulingPriority {
    let priorityScore = 0;
    
    for (const studentId of students) {
      const progress = progressData.get(studentId) || [];
      for (const p of progress) {
        if (p.struggling_topics.length > 2) priorityScore += 20;
        if (p.progress_percentage < 50) priorityScore += 15;
        if (p.learning_pace === 'slow') priorityScore += 10;
      }
    }
    
    const avgDifficulty = contentItems.reduce((sum, c) => sum + c.difficulty_level, 0) / contentItems.length;
    if (avgDifficulty > 8) priorityScore += 15;
    
    if (priorityScore >= 60) return 'urgent';
    if (priorityScore >= 40) return 'high';
    if (priorityScore >= 20) return 'medium';
    return 'low';
  }

  private generateDefaultWeeklySchedule(): TimeSlot[] {
    const schedule: TimeSlot[] = [];
    
    // Generate weekday availability (Monday-Friday, 9 AM - 5 PM)
    for (let day = 1; day <= 5; day++) {
      for (let hour = 9; hour <= 16; hour++) {
        schedule.push({
          day_of_week: day,
          start_time: `${hour.toString().padStart(2, '0')}:00`,
          end_time: `${(hour + 1).toString().padStart(2, '0')}:00`,
          is_available: true,
          recurring: true
        });
      }
    }
    
    return schedule;
  }

  private parseTeacherAvailability(availability: any): TimeSlot[] {
    if (!availability || typeof availability !== 'object') {
      return this.generateDefaultWeeklySchedule();
    }
    
    // Parse the JSONB availability data
    return this.generateDefaultWeeklySchedule(); // Simplified
  }

  private findBestTimeSlot(
    composition: ClassComposition,
    studentAvailability: Map<string, StudentAvailability>,
    teacher?: TeacherAvailability
  ): string | undefined {
    if (!teacher) return undefined;
    
    // Find overlapping availability
    const teacherSlots = teacher.weekly_schedule.filter(slot => slot.is_available);
    if (teacherSlots.length === 0) return undefined;
    
    // For simplicity, return the first available slot
    const slot = teacherSlots[0];
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + slot.day_of_week);
    
    return `${targetDate.toISOString().split('T')[0]}T${slot.start_time}:00.000Z`;
  }

  private generateDecisionRationale(
    composition: ClassComposition,
    teacher?: TeacherAvailability,
    time?: string
  ): string {
    const reasons = [];
    
    reasons.push(`Group of ${composition.student_ids.length} students`);
    reasons.push(`Content difficulty level: ${composition.difficulty_level}`);
    reasons.push(`Priority: ${composition.scheduling_priority}`);
    
    if (teacher) reasons.push(`Teacher assigned based on availability`);
    if (time) reasons.push(`Time slot optimized for student availability`);
    
    return reasons.join('; ');
  }

  private calculateConfidenceScore(
    composition: ClassComposition,
    teacher?: TeacherAvailability,
    time?: string
  ): number {
    let score = 50; // Base score
    
    if (teacher) score += 20;
    if (time) score += 15;
    if (composition.prerequisite_check) score += 10;
    if (composition.class_type === 'individual' && composition.student_ids.length === 1) score += 5;
    
    return Math.min(100, score);
  }

  private async assignRoomOrLink(classType: ClassType): Promise<string> {
    if (classType === 'individual') {
      return `https://zoom.us/j/${Math.random().toString().substr(2, 10)}`;
    }
    return `Room ${Math.floor(Math.random() * 20) + 1}`;
  }

  private generatePreparationNotes(composition: ClassComposition): string {
    const notes = [];
    
    notes.push(`Class size: ${composition.student_ids.length} students`);
    notes.push(`Duration: ${composition.recommended_duration} minutes`);
    notes.push(`Content focus: ${composition.content_focus.map(c => c.title).join(', ')}`);
    notes.push(`Difficulty level: ${composition.difficulty_level}/10`);
    
    if (composition.teacher_requirements.length > 0) {
      notes.push(`Requirements: ${composition.teacher_requirements.join(', ')}`);
    }
    
    return notes.join('\n');
  }

  private generateSuccessCriteria(composition: ClassComposition): string[] {
    const criteria = [];
    
    criteria.push(`Students complete ${composition.content_focus.length} content items`);
    criteria.push(`Minimum 80% participation rate`);
    criteria.push(`Achieve learning objectives for difficulty level ${composition.difficulty_level}`);
    
    if (composition.class_type === 'group') {
      criteria.push('Effective group interaction and collaboration');
    }
    
    return criteria;
  }
}

// Export singleton instance
export const schedulingRulesEngine = new SchedulingRulesEngine();