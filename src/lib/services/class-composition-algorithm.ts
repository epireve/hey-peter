import { supabase } from "@/lib/supabase";
import { withRetry } from "./crud-service";
import { contentAnalysisService } from "./content-analysis-service";
import { studentProgressService } from "./student-progress-service";
import {
  ClassComposition,
  StudentProgress,
  UnlearnedContent,
  ContentItem,
  LearningAnalytics,
  CourseType,
  ClassType,
  SchedulingPriority,
  TimeSlot
} from "@/types/scheduling";

export interface CompositionCriteria {
  max_students: number;
  min_students: number;
  max_difficulty_variance: number;
  max_progress_gap: number;
  preferred_learning_styles: string[];
  content_compatibility_threshold: number;
  peer_compatibility_weight: number;
}

export interface CompositionScore {
  total_score: number;
  content_alignment: number;
  difficulty_balance: number;
  progress_compatibility: number;
  social_compatibility: number;
  size_optimization: number;
  breakdown: {
    content_score: number;
    difficulty_score: number;
    progress_score: number;
    social_score: number;
    size_score: number;
  };
}

export interface StudentCompatibility {
  student_a: string;
  student_b: string;
  compatibility_score: number;
  shared_content: ContentItem[];
  learning_style_match: number;
  pace_compatibility: number;
  social_history: number;
}

export interface GroupingOptions {
  strategy: 'homogeneous' | 'heterogeneous' | 'mixed';
  optimize_for: 'content' | 'social' | 'progress' | 'balanced';
  allow_individual_classes: boolean;
  prioritize_struggling_students: boolean;
  max_iterations: number;
  min_confidence_threshold: number;
}

export class ClassCompositionAlgorithm {
  private defaultCriteria: CompositionCriteria = {
    max_students: 9,
    min_students: 2,
    max_difficulty_variance: 3,
    max_progress_gap: 30, // percentage points
    preferred_learning_styles: ['mixed'],
    content_compatibility_threshold: 0.7,
    peer_compatibility_weight: 0.3,
  };

  private defaultOptions: GroupingOptions = {
    strategy: 'mixed',
    optimize_for: 'balanced',
    allow_individual_classes: true,
    prioritize_struggling_students: true,
    max_iterations: 100,
    min_confidence_threshold: 0.6,
  };

  /**
   * Main algorithm to generate optimal class compositions
   */
  async generateClassCompositions(
    studentIds: string[],
    courseType?: CourseType,
    criteria?: Partial<CompositionCriteria>,
    options?: Partial<GroupingOptions>
  ): Promise<ClassComposition[]> {
    return withRetry(async () => {
      const finalCriteria = { ...this.defaultCriteria, ...criteria };
      const finalOptions = { ...this.defaultOptions, ...options };

      // Step 1: Gather comprehensive student data
      const studentData = await this.gatherStudentData(studentIds, courseType);
      
      // Step 2: Analyze content compatibility
      const contentGroups = await this.analyzeContentCompatibility(studentData, finalCriteria);
      
      // Step 3: Calculate student compatibility matrix
      const compatibilityMatrix = await this.calculateCompatibilityMatrix(studentData);
      
      // Step 4: Generate initial groupings using different strategies
      const candidateGroupings = await this.generateCandidateGroupings(
        studentData,
        contentGroups,
        compatibilityMatrix,
        finalCriteria,
        finalOptions
      );
      
      // Step 5: Optimize groupings using iterative improvement
      const optimizedGroupings = await this.optimizeGroupings(
        candidateGroupings,
        studentData,
        compatibilityMatrix,
        finalCriteria,
        finalOptions
      );
      
      // Step 6: Convert to ClassComposition objects
      const compositions = await this.createClassCompositions(
        optimizedGroupings,
        studentData,
        finalCriteria
      );
      
      return compositions;
    });
  }

  /**
   * Evaluate the quality of a class composition
   */
  async evaluateComposition(
    composition: ClassComposition,
    studentData?: Map<string, any>
  ): Promise<CompositionScore> {
    if (!studentData) {
      studentData = await this.gatherStudentData(composition.student_ids);
    }

    const contentScore = this.calculateContentAlignmentScore(composition, studentData);
    const difficultyScore = this.calculateDifficultyBalanceScore(composition, studentData);
    const progressScore = this.calculateProgressCompatibilityScore(composition, studentData);
    const socialScore = await this.calculateSocialCompatibilityScore(composition, studentData);
    const sizeScore = this.calculateSizeOptimizationScore(composition);

    const weights = {
      content: 0.3,
      difficulty: 0.25,
      progress: 0.2,
      social: 0.15,
      size: 0.1,
    };

    const totalScore = 
      contentScore * weights.content +
      difficultyScore * weights.difficulty +
      progressScore * weights.progress +
      socialScore * weights.social +
      sizeScore * weights.size;

    return {
      total_score: totalScore,
      content_alignment: contentScore,
      difficulty_balance: difficultyScore,
      progress_compatibility: progressScore,
      social_compatibility: socialScore,
      size_optimization: sizeScore,
      breakdown: {
        content_score: contentScore,
        difficulty_score: difficultyScore,
        progress_score: progressScore,
        social_score: socialScore,
        size_score: sizeScore,
      },
    };
  }

  /**
   * Find compatible students for a given student
   */
  async findCompatibleStudents(
    targetStudentId: string,
    candidateStudentIds: string[],
    courseType?: CourseType,
    limit: number = 8
  ): Promise<StudentCompatibility[]> {
    return withRetry(async () => {
      const allStudentIds = [targetStudentId, ...candidateStudentIds];
      const studentData = await this.gatherStudentData(allStudentIds, courseType);
      
      const targetData = studentData.get(targetStudentId);
      if (!targetData) throw new Error("Target student not found");

      const compatibilities: StudentCompatibility[] = [];

      for (const candidateId of candidateStudentIds) {
        const candidateData = studentData.get(candidateId);
        if (!candidateData) continue;

        const compatibility = await this.calculateStudentCompatibility(
          targetData,
          candidateData,
          targetStudentId,
          candidateId
        );

        compatibilities.push(compatibility);
      }

      return compatibilities
        .sort((a, b) => b.compatibility_score - a.compatibility_score)
        .slice(0, limit);
    });
  }

  /**
   * Suggest optimal class size for given content and students
   */
  async suggestOptimalClassSize(
    studentIds: string[],
    contentItems: ContentItem[],
    courseType?: CourseType
  ): Promise<{
    recommended_size: number;
    min_effective_size: number;
    max_effective_size: number;
    reasoning: string[];
  }> {
    const studentData = await this.gatherStudentData(studentIds, courseType);
    
    // Analyze content complexity
    const avgDifficulty = contentItems.reduce((sum, item) => sum + item.difficulty_level, 0) / contentItems.length;
    const contentTypes = [...new Set(contentItems.map(item => item.content_type))];
    
    // Analyze student needs
    const learningPaces = Array.from(studentData.values())
      .map(data => data.progress?.[0]?.learning_pace)
      .filter(Boolean);
    
    const strugglingStudents = Array.from(studentData.values())
      .filter(data => data.progress?.[0]?.struggling_topics?.length > 2).length;
    
    let recommendedSize = 4; // Default
    let minSize = 2;
    let maxSize = 6;
    const reasoning: string[] = [];

    // Adjust based on content difficulty
    if (avgDifficulty > 8) {
      recommendedSize = Math.min(recommendedSize, 3);
      maxSize = 4;
      reasoning.push("High content difficulty favors smaller classes");
    } else if (avgDifficulty < 4) {
      recommendedSize = Math.max(recommendedSize, 6);
      maxSize = 9;
      reasoning.push("Lower content difficulty allows larger classes");
    }

    // Adjust based on content types
    if (contentTypes.includes('speaking')) {
      recommendedSize = Math.min(recommendedSize, 5);
      reasoning.push("Speaking practice is more effective in smaller groups");
    }

    // Adjust based on student needs
    const strugglingRatio = strugglingStudents / studentIds.length;
    if (strugglingRatio > 0.5) {
      recommendedSize = Math.min(recommendedSize, 3);
      reasoning.push("High proportion of struggling students benefits from smaller classes");
    }

    // Adjust based on learning pace variance
    const paceCounts = learningPaces.reduce((acc, pace) => {
      acc[pace] = (acc[pace] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    if (Object.keys(paceCounts).length > 2) {
      recommendedSize = Math.min(recommendedSize, 4);
      reasoning.push("Mixed learning paces require smaller, more focused groups");
    }

    return {
      recommended_size: Math.min(Math.max(recommendedSize, minSize), maxSize),
      min_effective_size: minSize,
      max_effective_size: maxSize,
      reasoning,
    };
  }

  // Private helper methods

  private async gatherStudentData(
    studentIds: string[],
    courseType?: CourseType
  ): Promise<Map<string, any>> {
    const studentData = new Map<string, any>();

    for (const studentId of studentIds) {
      const [progress, unlearned, analytics] = await Promise.all([
        contentAnalysisService.analyzeStudentProgress(studentId),
        contentAnalysisService.identifyUnlearnedContent(studentId),
        contentAnalysisService.generateLearningAnalytics(studentId),
      ]);

      // Filter by course type if specified
      const filteredProgress = courseType 
        ? progress.filter(p => this.isProgressForCourseType(p, courseType))
        : progress;
      
      const filteredUnlearned = courseType
        ? unlearned.filter(u => this.isContentForCourseType(u, courseType))
        : unlearned;

      studentData.set(studentId, {
        progress: filteredProgress,
        unlearned: filteredUnlearned,
        analytics: analytics,
        student_id: studentId,
      });
    }

    return studentData;
  }

  private async analyzeContentCompatibility(
    studentData: Map<string, any>,
    criteria: CompositionCriteria
  ): Promise<Map<string, string[]>> {
    const contentGroups = new Map<string, string[]>();

    // Group students by similar unlearned content
    for (const [studentId, data] of studentData) {
      for (const unlearnedGroup of data.unlearned) {
        for (const contentItem of unlearnedGroup.content_items) {
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

    // Filter groups by minimum size
    const filteredGroups = new Map<string, string[]>();
    for (const [contentKey, students] of contentGroups) {
      if (students.length >= criteria.min_students) {
        filteredGroups.set(contentKey, students);
      }
    }

    return filteredGroups;
  }

  private async calculateCompatibilityMatrix(
    studentData: Map<string, any>
  ): Promise<Map<string, Map<string, StudentCompatibility>>> {
    const matrix = new Map<string, Map<string, StudentCompatibility>>();
    const studentIds = Array.from(studentData.keys());

    for (let i = 0; i < studentIds.length; i++) {
      const studentA = studentIds[i];
      const dataA = studentData.get(studentA);
      
      if (!matrix.has(studentA)) {
        matrix.set(studentA, new Map());
      }

      for (let j = i + 1; j < studentIds.length; j++) {
        const studentB = studentIds[j];
        const dataB = studentData.get(studentB);

        const compatibility = await this.calculateStudentCompatibility(
          dataA,
          dataB,
          studentA,
          studentB
        );

        matrix.get(studentA)!.set(studentB, compatibility);
        
        if (!matrix.has(studentB)) {
          matrix.set(studentB, new Map());
        }
        matrix.get(studentB)!.set(studentA, compatibility);
      }
    }

    return matrix;
  }

  private async calculateStudentCompatibility(
    dataA: any,
    dataB: any,
    studentA: string,
    studentB: string
  ): Promise<StudentCompatibility> {
    // Calculate shared content
    const sharedContent = this.findSharedContent(dataA.unlearned, dataB.unlearned);
    
    // Calculate learning style compatibility
    const learningStyleMatch = this.calculateLearningStyleMatch(
      dataA.analytics,
      dataB.analytics
    );
    
    // Calculate pace compatibility
    const paceCompatibility = this.calculatePaceCompatibility(
      dataA.progress,
      dataB.progress
    );
    
    // Calculate social history (previous classes together)
    const socialHistory = await this.calculateSocialHistory(studentA, studentB);
    
    // Overall compatibility score
    const compatibilityScore = 
      (sharedContent.length > 0 ? 40 : 0) +
      learningStyleMatch * 25 +
      paceCompatibility * 25 +
      socialHistory * 10;

    return {
      student_a: studentA,
      student_b: studentB,
      compatibility_score: Math.min(100, compatibilityScore),
      shared_content: sharedContent,
      learning_style_match: learningStyleMatch,
      pace_compatibility: paceCompatibility,
      social_history: socialHistory,
    };
  }

  private async generateCandidateGroupings(
    studentData: Map<string, any>,
    contentGroups: Map<string, string[]>,
    compatibilityMatrix: Map<string, Map<string, StudentCompatibility>>,
    criteria: CompositionCriteria,
    options: GroupingOptions
  ): Promise<string[][]> {
    const candidateGroupings: string[][] = [];
    const usedStudents = new Set<string>();

    // Strategy 1: Content-based grouping
    if (options.optimize_for === 'content' || options.optimize_for === 'balanced') {
      for (const [contentKey, students] of contentGroups) {
        const availableStudents = students.filter(s => !usedStudents.has(s));
        
        if (availableStudents.length >= criteria.min_students) {
          const groupSize = Math.min(criteria.max_students, availableStudents.length);
          const group = availableStudents.slice(0, groupSize);
          candidateGroupings.push(group);
          group.forEach(s => usedStudents.add(s));
        }
      }
    }

    // Strategy 2: Social compatibility grouping
    if (options.optimize_for === 'social' || options.optimize_for === 'balanced') {
      const remainingStudents = Array.from(studentData.keys()).filter(s => !usedStudents.has(s));
      const socialGroups = this.generateSocialGroups(
        remainingStudents,
        compatibilityMatrix,
        criteria
      );
      
      candidateGroupings.push(...socialGroups);
      socialGroups.flat().forEach(s => usedStudents.add(s));
    }

    // Strategy 3: Progress-based grouping
    if (options.optimize_for === 'progress' || options.optimize_for === 'balanced') {
      const remainingStudents = Array.from(studentData.keys()).filter(s => !usedStudents.has(s));
      const progressGroups = this.generateProgressGroups(
        remainingStudents,
        studentData,
        criteria,
        options
      );
      
      candidateGroupings.push(...progressGroups);
      progressGroups.flat().forEach(s => usedStudents.add(s));
    }

    // Handle remaining individual students
    if (options.allow_individual_classes) {
      const remainingStudents = Array.from(studentData.keys()).filter(s => !usedStudents.has(s));
      remainingStudents.forEach(studentId => {
        candidateGroupings.push([studentId]);
      });
    }

    return candidateGroupings;
  }

  private async optimizeGroupings(
    candidateGroupings: string[][],
    studentData: Map<string, any>,
    compatibilityMatrix: Map<string, Map<string, StudentCompatibility>>,
    criteria: CompositionCriteria,
    options: GroupingOptions
  ): Promise<string[][]> {
    let currentGroupings = [...candidateGroupings];
    let bestScore = await this.evaluateGroupings(currentGroupings, studentData);
    let iterations = 0;

    while (iterations < options.max_iterations) {
      // Try different optimization techniques
      const variations = [
        ...this.tryStudentSwaps(currentGroupings, compatibilityMatrix),
        ...this.tryGroupMerges(currentGroupings, criteria),
        ...this.tryGroupSplits(currentGroupings, criteria),
      ];

      let improved = false;
      
      for (const variation of variations) {
        const score = await this.evaluateGroupings(variation, studentData);
        
        if (score > bestScore) {
          currentGroupings = variation;
          bestScore = score;
          improved = true;
          break;
        }
      }

      if (!improved) break;
      iterations++;
    }

    return currentGroupings;
  }

  private async createClassCompositions(
    groupings: string[][],
    studentData: Map<string, any>,
    criteria: CompositionCriteria
  ): Promise<ClassComposition[]> {
    const compositions: ClassComposition[] = [];

    for (const group of groupings) {
      if (group.length === 0) continue;

      // Determine shared content for the group
      const sharedContent = this.findGroupSharedContent(group, studentData);
      
      // Calculate group characteristics
      const difficultyLevel = this.calculateGroupDifficultyLevel(group, studentData);
      const schedulingPriority = this.calculateGroupPriority(group, studentData);
      const classType: ClassType = group.length === 1 ? 'individual' : 'group';
      
      // Determine teacher requirements
      const teacherRequirements = this.determineGroupTeacherRequirements(sharedContent);
      
      // Calculate recommended duration
      const recommendedDuration = this.calculateGroupDuration(group, sharedContent);
      
      // Extract learning objectives
      const learningObjectives = sharedContent.flatMap(content => content.learning_objectives);

      const composition: ClassComposition = {
        id: `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        student_ids: group,
        content_focus: sharedContent,
        class_type: classType,
        recommended_duration: recommendedDuration,
        difficulty_level: difficultyLevel,
        teacher_requirements: teacherRequirements,
        scheduling_priority: schedulingPriority,
        optimal_class_size: group.length,
        learning_objectives: learningObjectives,
        prerequisite_check: true,
      };

      compositions.push(composition);
    }

    return compositions;
  }

  // Additional helper methods for optimization and evaluation

  private findSharedContent(unlearnedA: UnlearnedContent[], unlearnedB: UnlearnedContent[]): ContentItem[] {
    const shared: ContentItem[] = [];
    
    for (const groupA of unlearnedA) {
      for (const contentA of groupA.content_items) {
        for (const groupB of unlearnedB) {
          for (const contentB of groupB.content_items) {
            if (contentA.unit_number === contentB.unit_number && 
                Math.abs(contentA.lesson_number - contentB.lesson_number) <= 1) {
              shared.push(contentA);
            }
          }
        }
      }
    }
    
    return shared;
  }

  private calculateLearningStyleMatch(analyticsA: LearningAnalytics, analyticsB: LearningAnalytics): number {
    if (analyticsA.preferred_learning_style === analyticsB.preferred_learning_style) {
      return 1.0;
    }
    if (analyticsA.preferred_learning_style === 'mixed' || analyticsB.preferred_learning_style === 'mixed') {
      return 0.7;
    }
    return 0.3;
  }

  private calculatePaceCompatibility(progressA: StudentProgress[], progressB: StudentProgress[]): number {
    if (progressA.length === 0 || progressB.length === 0) return 0.5;
    
    const paceA = progressA[0].learning_pace;
    const paceB = progressB[0].learning_pace;
    
    if (paceA === paceB) return 1.0;
    if ((paceA === 'average' && paceB !== 'average') || (paceB === 'average' && paceA !== 'average')) return 0.7;
    return 0.3;
  }

  private async calculateSocialHistory(studentA: string, studentB: string): Promise<number> {
    const { data: sharedClasses } = await supabase
      .from("bookings")
      .select("class_id")
      .in("student_id", [studentA, studentB]);

    const classesA = sharedClasses?.filter(b => b.student_id === studentA).map(b => b.class_id) || [];
    const classesB = sharedClasses?.filter(b => b.student_id === studentB).map(b => b.class_id) || [];
    
    const sharedClassCount = classesA.filter(c => classesB.includes(c)).length;
    return Math.min(1.0, sharedClassCount * 0.2);
  }

  private generateSocialGroups(
    students: string[],
    compatibilityMatrix: Map<string, Map<string, StudentCompatibility>>,
    criteria: CompositionCriteria
  ): string[][] {
    const groups: string[][] = [];
    const used = new Set<string>();

    // Sort students by total compatibility score
    const studentScores = students.map(studentId => {
      const totalScore = students.reduce((sum, otherId) => {
        if (studentId === otherId) return sum;
        const compatibility = compatibilityMatrix.get(studentId)?.get(otherId);
        return sum + (compatibility?.compatibility_score || 0);
      }, 0);
      return { studentId, totalScore };
    }).sort((a, b) => b.totalScore - a.totalScore);

    for (const { studentId } of studentScores) {
      if (used.has(studentId)) continue;

      const group = [studentId];
      used.add(studentId);

      // Find compatible students for this group
      const candidates = students
        .filter(id => !used.has(id))
        .map(id => ({
          studentId: id,
          compatibility: compatibilityMatrix.get(studentId)?.get(id)?.compatibility_score || 0
        }))
        .sort((a, b) => b.compatibility - a.compatibility);

      for (const candidate of candidates) {
        if (group.length >= criteria.max_students) break;
        if (candidate.compatibility >= 60) { // Threshold for good compatibility
          group.push(candidate.studentId);
          used.add(candidate.studentId);
        }
      }

      if (group.length >= criteria.min_students) {
        groups.push(group);
      }
    }

    return groups;
  }

  private generateProgressGroups(
    students: string[],
    studentData: Map<string, any>,
    criteria: CompositionCriteria,
    options: GroupingOptions
  ): string[][] {
    const groups: string[][] = [];
    
    // Group by progress level and learning pace
    const progressLevels = new Map<string, string[]>();
    
    for (const studentId of students) {
      const data = studentData.get(studentId);
      if (!data || !data.progress || data.progress.length === 0) continue;
      
      const avgProgress = data.progress.reduce((sum, p) => sum + p.progress_percentage, 0) / data.progress.length;
      const pace = data.progress[0].learning_pace;
      
      const key = `${Math.floor(avgProgress / 25)}-${pace}`; // Group by 25% intervals and pace
      
      if (!progressLevels.has(key)) {
        progressLevels.set(key, []);
      }
      progressLevels.get(key)!.push(studentId);
    }

    // Create groups from progress levels
    for (const [key, studentList] of progressLevels) {
      if (studentList.length >= criteria.min_students) {
        const groupSize = Math.min(criteria.max_students, studentList.length);
        groups.push(studentList.slice(0, groupSize));
      }
    }

    return groups;
  }

  private tryStudentSwaps(
    groupings: string[][],
    compatibilityMatrix: Map<string, Map<string, StudentCompatibility>>
  ): string[][][] {
    const variations: string[][][] = [];
    
    for (let i = 0; i < groupings.length; i++) {
      for (let j = i + 1; j < groupings.length; j++) {
        const groupA = groupings[i];
        const groupB = groupings[j];
        
        if (groupA.length <= 1 || groupB.length <= 1) continue;
        
        // Try swapping one student from each group
        for (const studentA of groupA) {
          for (const studentB of groupB) {
            const newGroupings = [...groupings];
            newGroupings[i] = groupA.filter(s => s !== studentA).concat(studentB);
            newGroupings[j] = groupB.filter(s => s !== studentB).concat(studentA);
            variations.push(newGroupings);
          }
        }
      }
    }
    
    return variations;
  }

  private tryGroupMerges(groupings: string[][], criteria: CompositionCriteria): string[][][] {
    const variations: string[][][] = [];
    
    for (let i = 0; i < groupings.length; i++) {
      for (let j = i + 1; j < groupings.length; j++) {
        const groupA = groupings[i];
        const groupB = groupings[j];
        
        if (groupA.length + groupB.length <= criteria.max_students) {
          const newGroupings = [...groupings];
          newGroupings[i] = groupA.concat(groupB);
          newGroupings.splice(j, 1);
          variations.push(newGroupings);
        }
      }
    }
    
    return variations;
  }

  private tryGroupSplits(groupings: string[][], criteria: CompositionCriteria): string[][][] {
    const variations: string[][][] = [];
    
    for (let i = 0; i < groupings.length; i++) {
      const group = groupings[i];
      
      if (group.length >= criteria.min_students * 2) {
        const midpoint = Math.floor(group.length / 2);
        const groupA = group.slice(0, midpoint);
        const groupB = group.slice(midpoint);
        
        if (groupA.length >= criteria.min_students && groupB.length >= criteria.min_students) {
          const newGroupings = [...groupings];
          newGroupings[i] = groupA;
          newGroupings.splice(i + 1, 0, groupB);
          variations.push(newGroupings);
        }
      }
    }
    
    return variations;
  }

  private async evaluateGroupings(groupings: string[][], studentData: Map<string, any>): Promise<number> {
    let totalScore = 0;
    let totalStudents = 0;
    
    for (const group of groupings) {
      // Create temporary composition for evaluation
      const tempComposition: ClassComposition = {
        id: 'temp',
        student_ids: group,
        content_focus: this.findGroupSharedContent(group, studentData),
        class_type: group.length === 1 ? 'individual' : 'group',
        recommended_duration: 60,
        difficulty_level: 5,
        teacher_requirements: [],
        scheduling_priority: 'medium',
        optimal_class_size: group.length,
        learning_objectives: [],
        prerequisite_check: true,
      };
      
      const score = await this.evaluateComposition(tempComposition, studentData);
      totalScore += score.total_score * group.length;
      totalStudents += group.length;
    }
    
    return totalStudents > 0 ? totalScore / totalStudents : 0;
  }

  private calculateContentAlignmentScore(composition: ClassComposition, studentData: Map<string, any>): number {
    let totalAlignment = 0;
    
    for (const studentId of composition.student_ids) {
      const data = studentData.get(studentId);
      if (!data) continue;
      
      let studentAlignment = 0;
      for (const contentItem of composition.content_focus) {
        const hasContent = data.unlearned.some(unlearned =>
          unlearned.content_items.some(item =>
            item.unit_number === contentItem.unit_number &&
            Math.abs(item.lesson_number - contentItem.lesson_number) <= 1
          )
        );
        if (hasContent) studentAlignment++;
      }
      
      totalAlignment += composition.content_focus.length > 0 ? 
        (studentAlignment / composition.content_focus.length) * 100 : 0;
    }
    
    return composition.student_ids.length > 0 ? totalAlignment / composition.student_ids.length : 0;
  }

  private calculateDifficultyBalanceScore(composition: ClassComposition, studentData: Map<string, any>): number {
    if (composition.content_focus.length === 0) return 50;
    
    const difficulties = composition.content_focus.map(item => item.difficulty_level);
    const avgDifficulty = difficulties.reduce((sum, d) => sum + d, 0) / difficulties.length;
    const variance = difficulties.reduce((sum, d) => sum + Math.pow(d - avgDifficulty, 2), 0) / difficulties.length;
    
    // Lower variance is better (more balanced)
    return Math.max(0, 100 - variance * 10);
  }

  private calculateProgressCompatibilityScore(composition: ClassComposition, studentData: Map<string, any>): number {
    const progressLevels = composition.student_ids
      .map(studentId => {
        const data = studentData.get(studentId);
        if (!data || !data.progress || data.progress.length === 0) return 0;
        return data.progress.reduce((sum, p) => sum + p.progress_percentage, 0) / data.progress.length;
      })
      .filter(level => level > 0);
    
    if (progressLevels.length === 0) return 50;
    
    const avgProgress = progressLevels.reduce((sum, p) => sum + p, 0) / progressLevels.length;
    const variance = progressLevels.reduce((sum, p) => sum + Math.pow(p - avgProgress, 2), 0) / progressLevels.length;
    
    // Lower variance is better
    return Math.max(0, 100 - variance / 10);
  }

  private async calculateSocialCompatibilityScore(composition: ClassComposition, studentData: Map<string, any>): Promise<number> {
    if (composition.student_ids.length === 1) return 100; // Individual classes have perfect social compatibility
    
    let totalCompatibility = 0;
    let pairCount = 0;
    
    for (let i = 0; i < composition.student_ids.length; i++) {
      for (let j = i + 1; j < composition.student_ids.length; j++) {
        const studentA = composition.student_ids[i];
        const studentB = composition.student_ids[j];
        
        const dataA = studentData.get(studentA);
        const dataB = studentData.get(studentB);
        
        if (dataA && dataB) {
          const compatibility = await this.calculateStudentCompatibility(dataA, dataB, studentA, studentB);
          totalCompatibility += compatibility.compatibility_score;
          pairCount++;
        }
      }
    }
    
    return pairCount > 0 ? totalCompatibility / pairCount : 50;
  }

  private calculateSizeOptimizationScore(composition: ClassComposition): number {
    const actualSize = composition.student_ids.length;
    const optimalSize = composition.optimal_class_size;
    
    if (actualSize === optimalSize) return 100;
    
    const deviation = Math.abs(actualSize - optimalSize);
    return Math.max(0, 100 - deviation * 20);
  }

  private findGroupSharedContent(group: string[], studentData: Map<string, any>): ContentItem[] {
    if (group.length === 0) return [];
    
    const firstStudentData = studentData.get(group[0]);
    if (!firstStudentData || !firstStudentData.unlearned) return [];
    
    let sharedContent: ContentItem[] = firstStudentData.unlearned.flatMap(u => u.content_items);
    
    for (let i = 1; i < group.length; i++) {
      const studentData_i = studentData.get(group[i]);
      if (!studentData_i || !studentData_i.unlearned) {
        sharedContent = [];
        break;
      }
      
      const studentContent = studentData_i.unlearned.flatMap(u => u.content_items);
      sharedContent = sharedContent.filter(item =>
        studentContent.some(sItem =>
          sItem.unit_number === item.unit_number &&
          Math.abs(sItem.lesson_number - item.lesson_number) <= 1
        )
      );
    }
    
    return sharedContent.slice(0, 3); // Limit to 3 most relevant items
  }

  private calculateGroupDifficultyLevel(group: string[], studentData: Map<string, any>): number {
    const sharedContent = this.findGroupSharedContent(group, studentData);
    if (sharedContent.length === 0) return 5;
    
    return Math.round(sharedContent.reduce((sum, item) => sum + item.difficulty_level, 0) / sharedContent.length);
  }

  private calculateGroupPriority(group: string[], studentData: Map<string, any>): SchedulingPriority {
    let urgentCount = 0;
    let highCount = 0;
    
    for (const studentId of group) {
      const data = studentData.get(studentId);
      if (!data || !data.unlearned) continue;
      
      for (const unlearned of data.unlearned) {
        if (unlearned.urgency_level === 'urgent') urgentCount++;
        else if (unlearned.urgency_level === 'high') highCount++;
      }
    }
    
    if (urgentCount > 0) return 'urgent';
    if (highCount > 0) return 'high';
    return 'medium';
  }

  private determineGroupTeacherRequirements(sharedContent: ContentItem[]): string[] {
    const requirements: string[] = [];
    
    const maxDifficulty = Math.max(...sharedContent.map(c => c.difficulty_level), 0);
    if (maxDifficulty > 8) requirements.push('advanced_certification');
    else if (maxDifficulty > 6) requirements.push('intermediate_certification');
    
    const contentTypes = [...new Set(sharedContent.map(c => c.content_type))];
    if (contentTypes.includes('speaking')) requirements.push('speaking_specialist');
    if (contentTypes.includes('writing')) requirements.push('writing_specialist');
    
    return requirements;
  }

  private calculateGroupDuration(group: string[], sharedContent: ContentItem[]): number {
    const baseDuration = sharedContent.reduce((sum, item) => sum + item.estimated_duration_minutes, 0);
    const groupFactor = Math.max(1, group.length / 4);
    return Math.min(120, Math.max(45, baseDuration * groupFactor));
  }

  // Utility methods for course type filtering
  private isProgressForCourseType(progress: StudentProgress, courseType: CourseType): boolean {
    // In a real implementation, this would check the course type of the progress
    return true; // Simplified
  }

  private isContentForCourseType(unlearned: UnlearnedContent, courseType: CourseType): boolean {
    // In a real implementation, this would check the course type of the content
    return true; // Simplified
  }
}

// Export singleton instance
export const classCompositionAlgorithm = new ClassCompositionAlgorithm();