import { schedulingRulesEngine } from '../scheduling-rules-engine';
import { contentAnalysisService } from '../content-analysis-service';
import { studentProgressService } from '../student-progress-service';
import { 
  SchedulingRequest, 
  CourseType, 
  SchedulingPriority,
  ClassType,
  StudentProgress,
  UnlearnedContent,
  ContentItem
} from '@/types/scheduling';

// Mock the services
jest.mock('../content-analysis-service');
jest.mock('../student-progress-service');
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({ data: null, error: null })),
          order: jest.fn(() => ({ data: [], error: null })),
          limit: jest.fn(() => ({ data: [], error: null }))
        })),
        order: jest.fn(() => ({ data: [], error: null })),
        limit: jest.fn(() => ({ data: [], error: null })),
        gte: jest.fn(() => ({
          order: jest.fn(() => ({ data: [], error: null }))
        })),
        lt: jest.fn(() => ({ data: [], error: null })),
        or: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => ({ data: [], error: null }))
          }))
        })),
        not: jest.fn(() => ({ data: [], error: null })),
        neq: jest.fn(() => ({
          select: jest.fn(() => ({ data: [], error: null }))
        })),
        in: jest.fn(() => ({ data: [], error: null }))
      }))
    }))
  }
}));

const mockContentAnalysisService = contentAnalysisService as jest.Mocked<typeof contentAnalysisService>;
const mockStudentProgressService = studentProgressService as jest.Mocked<typeof studentProgressService>;

describe('SchedulingRulesEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockContentAnalysisService.analyzeStudentProgress.mockResolvedValue([]);
    mockContentAnalysisService.identifyUnlearnedContent.mockResolvedValue([]);
    mockContentAnalysisService.findCompatibleStudents.mockResolvedValue([]);
    mockContentAnalysisService.generateLearningAnalytics.mockResolvedValue({
      student_id: 'test-student',
      learning_velocity: 2.5,
      retention_rate: 85,
      engagement_score: 80,
      preferred_learning_style: 'mixed',
      optimal_class_size: 4,
      best_time_slots: [],
      peer_compatibility: [],
      topic_performance: []
    });
  });

  describe('scheduleClasses', () => {
    it('should successfully schedule classes for basic course type', async () => {
      const request: SchedulingRequest = {
        student_ids: ['student1', 'student2', 'student3'],
        course_type: 'Basic',
        time_range: {
          start_date: '2025-01-15T00:00:00Z',
          end_date: '2025-01-29T00:00:00Z'
        },
        optimization_goals: ['content_coverage', 'student_satisfaction']
      };

      // Mock student progress data
      const mockProgress: StudentProgress = {
        student_id: 'student1',
        course_id: 'course1',
        current_unit: 2,
        current_lesson: 3,
        progress_percentage: 35,
        last_completed_lesson: 2,
        last_class_date: '2025-01-10T10:00:00Z',
        learning_pace: 'average',
        struggling_topics: ['grammar', 'vocabulary'],
        mastered_topics: ['pronunciation'],
        learning_goals: ['improve speaking'],
        next_priority_content: []
      };

      const mockUnlearned: UnlearnedContent = {
        student_id: 'student1',
        content_items: [
          {
            id: 'content1',
            title: 'Unit 2 - Grammar Basics',
            unit_number: 2,
            lesson_number: 4,
            content_type: 'grammar',
            difficulty_level: 5,
            prerequisites: [],
            estimated_duration_minutes: 45,
            tags: ['grammar', 'basics'],
            learning_objectives: ['understand present tense']
          }
        ],
        priority_score: 75,
        urgency_level: 'high',
        recommended_class_type: 'group',
        estimated_learning_time: 45,
        grouping_compatibility: ['student2', 'student3']
      };

      mockContentAnalysisService.analyzeStudentProgress.mockResolvedValue([mockProgress]);
      mockContentAnalysisService.identifyUnlearnedContent.mockResolvedValue([mockUnlearned]);

      const response = await schedulingRulesEngine.scheduleClasses(request);

      expect(response.success).toBe(true);
      expect(response.result).toBeDefined();
      expect(response.result?.scheduled_classes).toBeDefined();
      expect(response.processing_time_ms).toBeGreaterThan(0);
      expect(mockContentAnalysisService.analyzeStudentProgress).toHaveBeenCalledTimes(3);
      expect(mockContentAnalysisService.identifyUnlearnedContent).toHaveBeenCalledTimes(3);
    });

    it('should handle empty student list gracefully', async () => {
      const request: SchedulingRequest = {
        student_ids: [],
        time_range: {
          start_date: '2025-01-15T00:00:00Z',
          end_date: '2025-01-29T00:00:00Z'
        },
        optimization_goals: []
      };

      const response = await schedulingRulesEngine.scheduleClasses(request);

      expect(response.success).toBe(true);
      expect(response.result?.scheduled_classes).toHaveLength(0);
    });

    it('should handle errors gracefully', async () => {
      const request: SchedulingRequest = {
        student_ids: ['student1'],
        time_range: {
          start_date: '2025-01-15T00:00:00Z',
          end_date: '2025-01-29T00:00:00Z'
        },
        optimization_goals: []
      };

      mockContentAnalysisService.analyzeStudentProgress.mockRejectedValue(new Error('Analysis failed'));

      const response = await schedulingRulesEngine.scheduleClasses(request);

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });

    it('should prioritize urgent content for struggling students', async () => {
      const request: SchedulingRequest = {
        student_ids: ['struggling-student'],
        course_type: 'Basic',
        time_range: {
          start_date: '2025-01-15T00:00:00Z',
          end_date: '2025-01-29T00:00:00Z'
        },
        optimization_goals: ['urgent_content_first']
      };

      const strugglingProgress: StudentProgress = {
        student_id: 'struggling-student',
        course_id: 'course1',
        current_unit: 1,
        current_lesson: 2,
        progress_percentage: 15,
        last_completed_lesson: 1,
        learning_pace: 'slow',
        struggling_topics: ['grammar', 'vocabulary', 'pronunciation'],
        mastered_topics: [],
        learning_goals: ['catch up with class'],
        next_priority_content: []
      };

      const urgentContent: UnlearnedContent = {
        student_id: 'struggling-student',
        content_items: [
          {
            id: 'urgent-content',
            title: 'Basic Grammar Review',
            unit_number: 1,
            lesson_number: 3,
            content_type: 'grammar',
            difficulty_level: 3,
            prerequisites: [],
            estimated_duration_minutes: 60,
            tags: ['grammar', 'review'],
            learning_objectives: ['master basic grammar']
          }
        ],
        priority_score: 95,
        urgency_level: 'urgent',
        recommended_class_type: 'individual',
        estimated_learning_time: 60,
        grouping_compatibility: []
      };

      mockContentAnalysisService.analyzeStudentProgress.mockResolvedValue([strugglingProgress]);
      mockContentAnalysisService.identifyUnlearnedContent.mockResolvedValue([urgentContent]);

      const response = await schedulingRulesEngine.scheduleClasses(request);

      expect(response.success).toBe(true);
      expect(response.result?.scheduled_classes.some(cls => 
        cls.class_type === 'individual' && 
        cls.student_ids.includes('struggling-student')
      )).toBe(true);
    });

    it('should create group classes for compatible students', async () => {
      const request: SchedulingRequest = {
        student_ids: ['student1', 'student2', 'student3', 'student4'],
        course_type: 'Everyday A',
        time_range: {
          start_date: '2025-01-15T00:00:00Z',
          end_date: '2025-01-29T00:00:00Z'
        },
        optimization_goals: ['maximize_group_learning']
      };

      const compatibleProgress: StudentProgress = {
        student_id: 'student1',
        course_id: 'course2',
        current_unit: 3,
        current_lesson: 1,
        progress_percentage: 60,
        last_completed_lesson: 3,
        learning_pace: 'average',
        struggling_topics: [],
        mastered_topics: ['basic_grammar'],
        learning_goals: ['improve speaking'],
        next_priority_content: []
      };

      const compatibleContent: UnlearnedContent = {
        student_id: 'student1',
        content_items: [
          {
            id: 'shared-content',
            title: 'Everyday Conversations',
            unit_number: 3,
            lesson_number: 2,
            content_type: 'speaking',
            difficulty_level: 6,
            prerequisites: [],
            estimated_duration_minutes: 50,
            tags: ['speaking', 'conversation'],
            learning_objectives: ['hold basic conversations']
          }
        ],
        priority_score: 70,
        urgency_level: 'medium',
        recommended_class_type: 'group',
        estimated_learning_time: 50,
        grouping_compatibility: ['student2', 'student3', 'student4']
      };

      mockContentAnalysisService.analyzeStudentProgress.mockResolvedValue([compatibleProgress]);
      mockContentAnalysisService.identifyUnlearnedContent.mockResolvedValue([compatibleContent]);

      const response = await schedulingRulesEngine.scheduleClasses(request);

      expect(response.success).toBe(true);
      expect(response.result?.scheduled_classes.some(cls => 
        cls.class_type === 'group' && 
        cls.student_ids.length > 1
      )).toBe(true);
    });

    it('should respect course type constraints', async () => {
      const request: SchedulingRequest = {
        student_ids: ['student1'],
        course_type: '1-on-1',
        time_range: {
          start_date: '2025-01-15T00:00:00Z',
          end_date: '2025-01-29T00:00:00Z'
        },
        optimization_goals: ['personalized_learning']
      };

      const oneOnOneProgress: StudentProgress = {
        student_id: 'student1',
        course_id: 'course3',
        current_unit: 5,
        current_lesson: 2,
        progress_percentage: 80,
        last_completed_lesson: 5,
        learning_pace: 'fast',
        struggling_topics: ['advanced_grammar'],
        mastered_topics: ['basic_conversation', 'vocabulary'],
        learning_goals: ['business english proficiency'],
        next_priority_content: []
      };

      const advancedContent: UnlearnedContent = {
        student_id: 'student1',
        content_items: [
          {
            id: 'advanced-content',
            title: 'Advanced Business Grammar',
            unit_number: 5,
            lesson_number: 3,
            content_type: 'grammar',
            difficulty_level: 9,
            prerequisites: ['basic_grammar'],
            estimated_duration_minutes: 60,
            tags: ['grammar', 'business', 'advanced'],
            learning_objectives: ['master complex grammatical structures']
          }
        ],
        priority_score: 85,
        urgency_level: 'high',
        recommended_class_type: 'individual',
        estimated_learning_time: 60,
        grouping_compatibility: []
      };

      mockContentAnalysisService.analyzeStudentProgress.mockResolvedValue([oneOnOneProgress]);
      mockContentAnalysisService.identifyUnlearnedContent.mockResolvedValue([advancedContent]);

      const response = await schedulingRulesEngine.scheduleClasses(request);

      expect(response.success).toBe(true);
      expect(response.result?.scheduled_classes.every(cls => 
        cls.class_type === 'individual'
      )).toBe(true);
    });

    it('should apply configuration overrides', async () => {
      const request: SchedulingRequest = {
        student_ids: ['student1', 'student2'],
        time_range: {
          start_date: '2025-01-15T00:00:00Z',
          end_date: '2025-01-29T00:00:00Z'
        },
        optimization_goals: [],
        config_override: {
          strategy: 'content_based',
          constraints: {
            max_students_per_group: 2,
            min_students_per_group: 1
          }
        }
      };

      const response = await schedulingRulesEngine.scheduleClasses(request);

      expect(response.success).toBe(true);
      // The configuration override should be applied
      expect(response.result?.scheduled_classes.every(cls => 
        cls.student_ids.length <= 2
      )).toBe(true);
    });
  });

  describe('Content-based grouping logic', () => {
    it('should group students with similar unlearned content', async () => {
      const similarContent: ContentItem = {
        id: 'shared-lesson',
        title: 'Present Perfect Tense',
        unit_number: 4,
        lesson_number: 1,
        content_type: 'grammar',
        difficulty_level: 6,
        prerequisites: ['present_tense'],
        estimated_duration_minutes: 45,
        tags: ['grammar', 'tense'],
        learning_objectives: ['use present perfect correctly']
      };

      const student1Unlearned: UnlearnedContent = {
        student_id: 'student1',
        content_items: [similarContent],
        priority_score: 70,
        urgency_level: 'medium',
        recommended_class_type: 'group',
        estimated_learning_time: 45,
        grouping_compatibility: ['student2']
      };

      const student2Unlearned: UnlearnedContent = {
        student_id: 'student2',
        content_items: [similarContent],
        priority_score: 72,
        urgency_level: 'medium',
        recommended_class_type: 'group',
        estimated_learning_time: 45,
        grouping_compatibility: ['student1']
      };

      mockContentAnalysisService.identifyUnlearnedContent
        .mockResolvedValueOnce([student1Unlearned])
        .mockResolvedValueOnce([student2Unlearned]);

      const request: SchedulingRequest = {
        student_ids: ['student1', 'student2'],
        course_type: 'Basic',
        time_range: {
          start_date: '2025-01-15T00:00:00Z',
          end_date: '2025-01-29T00:00:00Z'
        },
        optimization_goals: ['content_alignment']
      };

      const response = await schedulingRulesEngine.scheduleClasses(request);

      expect(response.success).toBe(true);
      expect(response.result?.scheduled_classes.some(cls => 
        cls.student_ids.includes('student1') && 
        cls.student_ids.includes('student2') &&
        cls.content_items.some(item => item.title === 'Present Perfect Tense')
      )).toBe(true);
    });

    it('should handle different difficulty levels appropriately', async () => {
      const easyContent: ContentItem = {
        id: 'easy-content',
        title: 'Basic Vocabulary',
        unit_number: 1,
        lesson_number: 1,
        content_type: 'vocabulary',
        difficulty_level: 2,
        prerequisites: [],
        estimated_duration_minutes: 30,
        tags: ['vocabulary', 'basic'],
        learning_objectives: ['learn basic words']
      };

      const hardContent: ContentItem = {
        id: 'hard-content',
        title: 'Advanced Syntax',
        unit_number: 8,
        lesson_number: 5,
        content_type: 'grammar',
        difficulty_level: 9,
        prerequisites: ['intermediate_grammar'],
        estimated_duration_minutes: 90,
        tags: ['grammar', 'advanced'],
        learning_objectives: ['master complex syntax']
      };

      const beginnerUnlearned: UnlearnedContent = {
        student_id: 'beginner',
        content_items: [easyContent],
        priority_score: 80,
        urgency_level: 'high',
        recommended_class_type: 'group',
        estimated_learning_time: 30,
        grouping_compatibility: []
      };

      const advancedUnlearned: UnlearnedContent = {
        student_id: 'advanced',
        content_items: [hardContent],
        priority_score: 75,
        urgency_level: 'medium',
        recommended_class_type: 'individual',
        estimated_learning_time: 90,
        grouping_compatibility: []
      };

      mockContentAnalysisService.identifyUnlearnedContent
        .mockResolvedValueOnce([beginnerUnlearned])
        .mockResolvedValueOnce([advancedUnlearned]);

      const request: SchedulingRequest = {
        student_ids: ['beginner', 'advanced'],
        time_range: {
          start_date: '2025-01-15T00:00:00Z',
          end_date: '2025-01-29T00:00:00Z'
        },
        optimization_goals: ['difficulty_appropriate_grouping']
      };

      const response = await schedulingRulesEngine.scheduleClasses(request);

      expect(response.success).toBe(true);
      
      // Should create separate classes due to difficulty mismatch
      const beginnerClass = response.result?.scheduled_classes.find(cls => 
        cls.student_ids.includes('beginner')
      );
      const advancedClass = response.result?.scheduled_classes.find(cls => 
        cls.student_ids.includes('advanced')
      );

      expect(beginnerClass?.student_ids).not.toContain('advanced');
      expect(advancedClass?.student_ids).not.toContain('beginner');
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle missing student data gracefully', async () => {
      mockContentAnalysisService.analyzeStudentProgress.mockResolvedValue([]);
      mockContentAnalysisService.identifyUnlearnedContent.mockResolvedValue([]);

      const request: SchedulingRequest = {
        student_ids: ['nonexistent-student'],
        time_range: {
          start_date: '2025-01-15T00:00:00Z',
          end_date: '2025-01-29T00:00:00Z'
        },
        optimization_goals: []
      };

      const response = await schedulingRulesEngine.scheduleClasses(request);

      expect(response.success).toBe(true);
      expect(response.result?.scheduled_classes).toHaveLength(0);
      expect(response.result?.unscheduled_students).toContain('nonexistent-student');
    });

    it('should handle invalid time ranges', async () => {
      const request: SchedulingRequest = {
        student_ids: ['student1'],
        time_range: {
          start_date: '2025-01-29T00:00:00Z',
          end_date: '2025-01-15T00:00:00Z' // End before start
        },
        optimization_goals: []
      };

      const response = await schedulingRulesEngine.scheduleClasses(request);

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });

    it('should provide meaningful recommendations when optimization fails', async () => {
      const request: SchedulingRequest = {
        student_ids: ['student1', 'student2', 'student3'],
        time_range: {
          start_date: '2025-01-15T00:00:00Z',
          end_date: '2025-01-16T00:00:00Z' // Very short time range
        },
        optimization_goals: ['impossible_goal']
      };

      const response = await schedulingRulesEngine.scheduleClasses(request);

      expect(response.recommendations).toBeDefined();
      expect(response.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Performance and optimization', () => {
    it('should complete scheduling within reasonable time for large student groups', async () => {
      const largeStudentList = Array.from({ length: 50 }, (_, i) => `student${i + 1}`);
      
      const request: SchedulingRequest = {
        student_ids: largeStudentList,
        course_type: 'Basic',
        time_range: {
          start_date: '2025-01-15T00:00:00Z',
          end_date: '2025-01-29T00:00:00Z'
        },
        optimization_goals: ['efficiency']
      };

      const startTime = Date.now();
      const response = await schedulingRulesEngine.scheduleClasses(request);
      const endTime = Date.now();

      expect(response.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(response.processing_time_ms).toBeLessThan(10000);
    });

    it('should provide optimization metrics', async () => {
      const request: SchedulingRequest = {
        student_ids: ['student1', 'student2'],
        time_range: {
          start_date: '2025-01-15T00:00:00Z',
          end_date: '2025-01-29T00:00:00Z'
        },
        optimization_goals: ['metrics_tracking']
      };

      const response = await schedulingRulesEngine.scheduleClasses(request);

      expect(response.success).toBe(true);
      expect(response.result?.performance_metrics).toBeDefined();
      expect(response.result?.performance_metrics.total_classes_created).toBeGreaterThanOrEqual(0);
      expect(response.result?.optimization_score).toBeGreaterThanOrEqual(0);
    });
  });
});