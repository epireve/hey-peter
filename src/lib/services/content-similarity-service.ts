/**
 * HeyPeter Academy - Content Similarity Analysis Service
 * 
 * This service provides advanced content similarity analysis for class recommendations.
 * It analyzes learning content, prerequisites, skills coverage, and learning objectives
 * to find the most compatible alternative classes for students.
 */

import { supabase } from '@/lib/supabase';
import { CRUDService, withRetry } from './crud-service';
import type {
  LearningContent,
  LearningSkill,
  StudentProgress,
  ScheduledClass,
  CourseType
} from '@/types/scheduling';

export interface ContentSimilarityResult {
  /** Overall similarity score (0-1) */
  overallSimilarity: number;
  /** Skill coverage overlap (0-1) */
  skillOverlap: number;
  /** Learning objective alignment (0-1) */
  objectiveAlignment: number;
  /** Prerequisite compatibility (0-1) */
  prerequisiteCompatibility: number;
  /** Difficulty level match (0-1) */
  difficultyMatch: number;
  /** Content type compatibility (0-1) */
  contentTypeMatch: number;
  /** Detailed breakdown */
  breakdown: ContentSimilarityBreakdown;
}

export interface ContentSimilarityBreakdown {
  /** Matching skills */
  matchingSkills: LearningSkill[];
  /** Missing skills in alternative */
  missingSkills: LearningSkill[];
  /** Additional skills in alternative */
  additionalSkills: LearningSkill[];
  /** Common learning objectives */
  commonObjectives: string[];
  /** Different objectives */
  differentObjectives: string[];
  /** Prerequisites status */
  prerequisitesStatus: {
    satisfied: string[];
    missing: string[];
    additional: string[];
  };
}

export interface ContentRecommendationContext {
  /** Student's current progress */
  studentProgress: StudentProgress[];
  /** Student's unlearned content */
  unlearnedContent: LearningContent[];
  /** Student's mastered skills */
  masteredSkills: LearningSkill[];
  /** Student's struggling areas */
  strugglingAreas: string[];
  /** Preferred learning content types */
  preferredContentTypes: string[];
}

/**
 * Service for analyzing content similarity between classes
 */
export class ContentSimilarityService {
  private crudService: CRUDService<any>;

  constructor() {
    this.crudService = new CRUDService({
      table: 'materials',
      cache: {
        enabled: true,
        ttl: 10 * 60 * 1000, // 10 minutes for content data
      },
    });
  }

  /**
   * Analyze similarity between two classes based on their learning content
   */
  async analyzeClassSimilarity(
    preferredClassId: string,
    alternativeClassId: string,
    context: ContentRecommendationContext
  ): Promise<ContentSimilarityResult> {
    return withRetry(async () => {
      // Get content for both classes
      const preferredContent = await this.getClassContent(preferredClassId);
      const alternativeContent = await this.getClassContent(alternativeClassId);

      if (!preferredContent.length || !alternativeContent.length) {
        return this.getEmptySimilarityResult();
      }

      // Analyze different aspects of similarity
      const skillOverlap = this.calculateSkillOverlap(preferredContent, alternativeContent);
      const objectiveAlignment = this.calculateObjectiveAlignment(preferredContent, alternativeContent);
      const prerequisiteCompatibility = await this.calculatePrerequisiteCompatibility(
        preferredContent,
        alternativeContent,
        context
      );
      const difficultyMatch = this.calculateDifficultyMatch(preferredContent, alternativeContent);
      const contentTypeMatch = this.calculateContentTypeMatch(preferredContent, alternativeContent);

      // Calculate weighted overall similarity
      const overallSimilarity = this.calculateOverallSimilarity({
        skillOverlap,
        objectiveAlignment,
        prerequisiteCompatibility,
        difficultyMatch,
        contentTypeMatch,
      });

      // Generate detailed breakdown
      const breakdown = this.generateSimilarityBreakdown(
        preferredContent,
        alternativeContent,
        context
      );

      return {
        overallSimilarity,
        skillOverlap,
        objectiveAlignment,
        prerequisiteCompatibility,
        difficultyMatch,
        contentTypeMatch,
        breakdown,
      };
    });
  }

  /**
   * Find classes with similar content to what a student needs to learn
   */
  async findSimilarContentClasses(
    studentId: string,
    courseType: CourseType,
    targetContent: LearningContent[],
    excludeClassIds: string[] = []
  ): Promise<Array<{ classId: string; similarity: ContentSimilarityResult }>> {
    return withRetry(async () => {
      // Get context for this student
      const context = await this.buildRecommendationContext(studentId);

      // Get all available classes of the same course type
      const { data: availableClasses } = await supabase
        .from('classes')
        .select(`
          id,
          course_id,
          course:courses(type, title)
        `)
        .eq('course.type', courseType)
        .eq('is_active', true)
        .not('id', 'in', `(${excludeClassIds.join(',')})`);

      if (!availableClasses?.length) return [];

      const similarities: Array<{ classId: string; similarity: ContentSimilarityResult }> = [];

      for (const cls of availableClasses) {
        // Analyze how well this class content matches target content
        const similarity = await this.analyzeContentMatch(
          cls.id,
          targetContent,
          context
        );

        // Only include classes with reasonable similarity
        if (similarity.overallSimilarity > 0.3) {
          similarities.push({
            classId: cls.id,
            similarity,
          });
        }
      }

      // Sort by similarity score
      similarities.sort((a, b) => b.similarity.overallSimilarity - a.similarity.overallSimilarity);

      return similarities;
    });
  }

  /**
   * Analyze how well a class content matches target learning content
   */
  private async analyzeContentMatch(
    classId: string,
    targetContent: LearningContent[],
    context: ContentRecommendationContext
  ): Promise<ContentSimilarityResult> {
    const classContent = await this.getClassContent(classId);

    if (!classContent.length) {
      return this.getEmptySimilarityResult();
    }

    // Create virtual "preferred content" from target content
    const targetSkills = this.extractSkillsFromContent(targetContent);
    const targetObjectives = this.extractObjectivesFromContent(targetContent);
    const targetDifficultyRange = this.calculateDifficultyRange(targetContent);

    // Extract actual class content features
    const classSkills = this.extractSkillsFromContent(classContent);
    const classObjectives = this.extractObjectivesFromContent(classContent);
    const classDifficultyRange = this.calculateDifficultyRange(classContent);

    // Calculate similarities
    const skillOverlap = this.calculateSkillSetOverlap(targetSkills, classSkills);
    const objectiveAlignment = this.calculateObjectiveSetAlignment(targetObjectives, classObjectives);
    const difficultyMatch = this.calculateDifficultyRangeMatch(targetDifficultyRange, classDifficultyRange);
    
    // Check prerequisite compatibility
    const prerequisiteCompatibility = await this.checkPrerequisiteCompatibilityForContent(
      targetContent,
      classContent,
      context
    );

    // Content type matching
    const contentTypeMatch = this.calculateContentTypeCompatibility(targetContent, classContent);

    const overallSimilarity = this.calculateOverallSimilarity({
      skillOverlap,
      objectiveAlignment,
      prerequisiteCompatibility,
      difficultyMatch,
      contentTypeMatch,
    });

    const breakdown = this.generateContentMatchBreakdown(
      targetContent,
      classContent,
      context
    );

    return {
      overallSimilarity,
      skillOverlap,
      objectiveAlignment,
      prerequisiteCompatibility,
      difficultyMatch,
      contentTypeMatch,
      breakdown,
    };
  }

  /**
   * Get learning content for a specific class
   */
  private async getClassContent(classId: string): Promise<LearningContent[]> {
    // Get class details
    const { data: classData } = await supabase
      .from('classes')
      .select(`
        id,
        course_id,
        description,
        learning_objectives,
        course:courses(*)
      `)
      .eq('id', classId)
      .single();

    if (!classData) return [];

    // Get materials for this course
    const { data: materials } = await supabase
      .from('materials')
      .select('*')
      .eq('course_id', classData.course_id)
      .order('unit_number', { ascending: true })
      .order('lesson_number', { ascending: true });

    if (!materials?.length) return [];

    // Convert to LearningContent format
    return materials.map(material => this.mapMaterialToLearningContent(material, classData));
  }

  /**
   * Map database material to LearningContent interface
   */
  private mapMaterialToLearningContent(material: any, classData: any): LearningContent {
    return {
      id: material.id,
      courseId: material.course_id,
      courseType: classData.course?.type || 'Basic',
      unitNumber: material.unit_number || 1,
      lessonNumber: material.lesson_number || 1,
      title: material.title || 'Untitled',
      description: material.description,
      estimatedDuration: this.estimateDurationFromType(material.material_type),
      prerequisites: [], // Would be populated from relationships
      learningObjectives: this.extractObjectivesFromDescription(material.description || ''),
      difficultyLevel: this.calculateDifficultyFromUnit(material.unit_number, material.lesson_number),
      isRequired: true,
      skills: this.inferSkillsFromMaterial(material),
      metadata: {
        materialType: material.material_type,
        originalDescription: material.description,
      },
    };
  }

  /**
   * Calculate skill overlap between two content sets
   */
  private calculateSkillOverlap(content1: LearningContent[], content2: LearningContent[]): number {
    const skills1 = this.extractSkillsFromContent(content1);
    const skills2 = this.extractSkillsFromContent(content2);

    return this.calculateSkillSetOverlap(skills1, skills2);
  }

  /**
   * Calculate skill set overlap
   */
  private calculateSkillSetOverlap(skills1: LearningSkill[], skills2: LearningSkill[]): number {
    if (!skills1.length || !skills2.length) return 0;

    const skillIds1 = new Set(skills1.map(s => s.id));
    const skillIds2 = new Set(skills2.map(s => s.id));

    const intersection = new Set([...skillIds1].filter(x => skillIds2.has(x)));
    const union = new Set([...skillIds1, ...skillIds2]);

    return intersection.size / union.size;
  }

  /**
   * Calculate learning objective alignment
   */
  private calculateObjectiveAlignment(content1: LearningContent[], content2: LearningContent[]): number {
    const objectives1 = this.extractObjectivesFromContent(content1);
    const objectives2 = this.extractObjectivesFromContent(content2);

    return this.calculateObjectiveSetAlignment(objectives1, objectives2);
  }

  /**
   * Calculate objective set alignment using semantic similarity
   */
  private calculateObjectiveSetAlignment(objectives1: string[], objectives2: string[]): number {
    if (!objectives1.length || !objectives2.length) return 0;

    let totalSimilarity = 0;
    let comparisons = 0;

    for (const obj1 of objectives1) {
      for (const obj2 of objectives2) {
        totalSimilarity += this.calculateTextSimilarity(obj1, obj2);
        comparisons++;
      }
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }

  /**
   * Calculate prerequisite compatibility
   */
  private async calculatePrerequisiteCompatibility(
    preferredContent: LearningContent[],
    alternativeContent: LearningContent[],
    context: ContentRecommendationContext
  ): Promise<number> {
    // Check if student has the prerequisites for alternative content
    const alternativePrereqs = this.extractPrerequisites(alternativeContent);
    const studentMasteredContent = context.studentProgress.flatMap(p => p.completedContent);

    let satisfiedPrereqs = 0;
    let totalPrereqs = alternativePrereqs.length;

    if (totalPrereqs === 0) return 1.0; // No prerequisites required

    for (const prereq of alternativePrereqs) {
      if (studentMasteredContent.includes(prereq)) {
        satisfiedPrereqs++;
      }
    }

    return satisfiedPrereqs / totalPrereqs;
  }

  /**
   * Calculate difficulty level match
   */
  private calculateDifficultyMatch(content1: LearningContent[], content2: LearningContent[]): number {
    const avgDifficulty1 = this.calculateAverageDifficulty(content1);
    const avgDifficulty2 = this.calculateAverageDifficulty(content2);

    const maxDifference = 10; // Assuming 1-10 difficulty scale
    const difference = Math.abs(avgDifficulty1 - avgDifficulty2);

    return Math.max(0, 1 - (difference / maxDifference));
  }

  /**
   * Calculate content type compatibility
   */
  private calculateContentTypeMatch(content1: LearningContent[], content2: LearningContent[]): number {
    const types1 = this.extractContentTypes(content1);
    const types2 = this.extractContentTypes(content2);

    if (!types1.length || !types2.length) return 0.5;

    const commonTypes = types1.filter(type => types2.includes(type));
    const allTypes = [...new Set([...types1, ...types2])];

    return commonTypes.length / allTypes.length;
  }

  /**
   * Calculate overall similarity with weighted factors
   */
  private calculateOverallSimilarity(scores: {
    skillOverlap: number;
    objectiveAlignment: number;
    prerequisiteCompatibility: number;
    difficultyMatch: number;
    contentTypeMatch: number;
  }): number {
    const weights = {
      skillOverlap: 0.3,
      objectiveAlignment: 0.25,
      prerequisiteCompatibility: 0.2,
      difficultyMatch: 0.15,
      contentTypeMatch: 0.1,
    };

    return (
      scores.skillOverlap * weights.skillOverlap +
      scores.objectiveAlignment * weights.objectiveAlignment +
      scores.prerequisiteCompatibility * weights.prerequisiteCompatibility +
      scores.difficultyMatch * weights.difficultyMatch +
      scores.contentTypeMatch * weights.contentTypeMatch
    );
  }

  /**
   * Build recommendation context for a student
   */
  private async buildRecommendationContext(studentId: string): Promise<ContentRecommendationContext> {
    const { data: student } = await supabase
      .from('students')
      .select('*')
      .eq('id', studentId)
      .single();

    if (!student) {
      throw new Error(`Student ${studentId} not found`);
    }

    // Get student progress
    const { data: progress } = await supabase
      .from('student_courses')
      .select(`
        *,
        course:courses(*)
      `)
      .eq('student_id', studentId);

    const studentProgress: StudentProgress[] = progress?.map(p => ({
      studentId: p.student_id,
      courseId: p.course_id,
      progressPercentage: p.progress_percentage || 0,
      currentUnit: p.current_unit || 1,
      currentLesson: p.current_lesson || 1,
      completedContent: [], // Would be populated from feedback
      inProgressContent: [],
      unlearnedContent: [],
      skillAssessments: {},
      learningPace: 'average',
      preferredTimes: [],
      lastActivity: new Date().toISOString(),
      studyStreak: 0,
      performanceMetrics: {
        attendanceRate: 0.9,
        assignmentCompletionRate: 0.85,
        averageScore: 75,
        engagementLevel: 7,
        preferredClassTypes: ['group'],
        optimalClassSize: 4,
        bestPerformingTimes: [],
        challengingTopics: [],
      },
    })) || [];

    return {
      studentProgress,
      unlearnedContent: [], // Would be populated from content analysis service
      masteredSkills: [],
      strugglingAreas: [],
      preferredContentTypes: ['reading', 'listening', 'speaking'],
    };
  }

  // Helper methods for content analysis

  private extractSkillsFromContent(content: LearningContent[]): LearningSkill[] {
    return content.flatMap(c => c.skills || []);
  }

  private extractObjectivesFromContent(content: LearningContent[]): string[] {
    return content.flatMap(c => c.learningObjectives || []);
  }

  private extractPrerequisites(content: LearningContent[]): string[] {
    return content.flatMap(c => c.prerequisites || []);
  }

  private extractContentTypes(content: LearningContent[]): string[] {
    return [...new Set(content.map(c => c.metadata?.materialType || 'unknown'))];
  }

  private calculateAverageDifficulty(content: LearningContent[]): number {
    if (!content.length) return 1;
    return content.reduce((sum, c) => sum + c.difficultyLevel, 0) / content.length;
  }

  private calculateDifficultyRange(content: LearningContent[]): { min: number; max: number; avg: number } {
    if (!content.length) return { min: 1, max: 1, avg: 1 };
    
    const difficulties = content.map(c => c.difficultyLevel);
    return {
      min: Math.min(...difficulties),
      max: Math.max(...difficulties),
      avg: difficulties.reduce((sum, d) => sum + d, 0) / difficulties.length,
    };
  }

  private calculateDifficultyRangeMatch(range1: any, range2: any): number {
    const avgDiff = Math.abs(range1.avg - range2.avg);
    const maxDiff = 10; // Assuming 1-10 scale
    return Math.max(0, 1 - (avgDiff / maxDiff));
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    // Simple word overlap similarity
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private estimateDurationFromType(materialType: string): number {
    const durationMap: Record<string, number> = {
      'PDF': 45,
      'Audio': 60,
      'Video': 60,
      'Book': 90,
      'Other': 45,
    };
    return durationMap[materialType] || 60;
  }

  private extractObjectivesFromDescription(description: string): string[] {
    // Simple extraction - in practice would use NLP
    return description.split('.').filter(s => s.trim().length > 10).slice(0, 3);
  }

  private calculateDifficultyFromUnit(unitNumber: number, lessonNumber: number): number {
    return Math.min(10, Math.floor(unitNumber * 1.5 + lessonNumber * 0.3));
  }

  private inferSkillsFromMaterial(material: any): LearningSkill[] {
    // Simple inference based on material type and description
    const skills: LearningSkill[] = [];
    
    if (material.material_type === 'Audio' || material.material_type === 'Video') {
      skills.push({
        id: 'listening',
        name: 'Listening Comprehension',
        category: 'listening',
        level: this.calculateDifficultyFromUnit(material.unit_number, material.lesson_number),
        weight: 1.0,
      });
    }
    
    if (material.material_type === 'PDF' || material.material_type === 'Book') {
      skills.push({
        id: 'reading',
        name: 'Reading Comprehension',
        category: 'reading',
        level: this.calculateDifficultyFromUnit(material.unit_number, material.lesson_number),
        weight: 1.0,
      });
    }
    
    return skills;
  }

  private calculateContentTypeCompatibility(content1: LearningContent[], content2: LearningContent[]): number {
    const types1 = this.extractContentTypes(content1);
    const types2 = this.extractContentTypes(content2);
    
    if (!types1.length || !types2.length) return 0.5;
    
    const commonTypes = types1.filter(type => types2.includes(type));
    return commonTypes.length / Math.max(types1.length, types2.length);
  }

  private async checkPrerequisiteCompatibilityForContent(
    targetContent: LearningContent[],
    classContent: LearningContent[],
    context: ContentRecommendationContext
  ): Promise<number> {
    const prereqs = this.extractPrerequisites(classContent);
    const masteredContent = context.studentProgress.flatMap(p => p.completedContent);
    
    if (prereqs.length === 0) return 1.0;
    
    const satisfied = prereqs.filter(p => masteredContent.includes(p)).length;
    return satisfied / prereqs.length;
  }

  private generateSimilarityBreakdown(
    preferredContent: LearningContent[],
    alternativeContent: LearningContent[],
    context: ContentRecommendationContext
  ): ContentSimilarityBreakdown {
    const preferredSkills = this.extractSkillsFromContent(preferredContent);
    const alternativeSkills = this.extractSkillsFromContent(alternativeContent);
    
    const matchingSkills = preferredSkills.filter(ps => 
      alternativeSkills.some(as => as.id === ps.id)
    );
    
    const missingSkills = preferredSkills.filter(ps => 
      !alternativeSkills.some(as => as.id === ps.id)
    );
    
    const additionalSkills = alternativeSkills.filter(as => 
      !preferredSkills.some(ps => ps.id === as.id)
    );

    const preferredObjectives = this.extractObjectivesFromContent(preferredContent);
    const alternativeObjectives = this.extractObjectivesFromContent(alternativeContent);
    
    const commonObjectives = preferredObjectives.filter(po => 
      alternativeObjectives.some(ao => this.calculateTextSimilarity(po, ao) > 0.7)
    );
    
    const differentObjectives = preferredObjectives.filter(po => 
      !alternativeObjectives.some(ao => this.calculateTextSimilarity(po, ao) > 0.7)
    );

    return {
      matchingSkills,
      missingSkills,
      additionalSkills,
      commonObjectives,
      differentObjectives,
      prerequisitesStatus: {
        satisfied: [],
        missing: [],
        additional: [],
      },
    };
  }

  private generateContentMatchBreakdown(
    targetContent: LearningContent[],
    classContent: LearningContent[],
    context: ContentRecommendationContext
  ): ContentSimilarityBreakdown {
    return this.generateSimilarityBreakdown(targetContent, classContent, context);
  }

  private getEmptySimilarityResult(): ContentSimilarityResult {
    return {
      overallSimilarity: 0,
      skillOverlap: 0,
      objectiveAlignment: 0,
      prerequisiteCompatibility: 0,
      difficultyMatch: 0,
      contentTypeMatch: 0,
      breakdown: {
        matchingSkills: [],
        missingSkills: [],
        additionalSkills: [],
        commonObjectives: [],
        differentObjectives: [],
        prerequisitesStatus: {
          satisfied: [],
          missing: [],
          additional: [],
        },
      },
    };
  }
}

// Export singleton instance
export const contentSimilarityService = new ContentSimilarityService();