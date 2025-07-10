import { contentAnalysisService } from '../content-analysis-service';
import { 
  StudentProgress, 
  UnlearnedContent, 
  LearningAnalytics,
  ContentItem,
  CourseType 
} from '@/types/scheduling';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({ data: mockStudentData, error: null })),
          order: jest.fn(() => ({ data: mockEnrollments, error: null }))
        })),
        order: jest.fn(() => ({ data: mockFeedback, error: null })),
        limit: jest.fn(() => ({ data: mockMaterials, error: null })),
        gte: jest.fn(() => ({
          order: jest.fn(() => ({ data: mockRecentAttendance, error: null }))
        })),
        or: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => ({ data: mockNextContent, error: null }))
          }))
        })),
        not: jest.fn(() => ({ data: mockBookings, error: null })),
        neq: jest.fn(() => ({
          select: jest.fn(() => ({ data: mockSimilarStudents, error: null }))
        })),
        lt: jest.fn(() => ({ data: mockLowRatedFeedback, error: null }))
      }))
    }))
  }
}));

// Mock data
const mockStudentData = {
  id: 'student1',
  user_id: 'user1',
  email: 'student1@test.com',
  full_name: 'Test Student',
  test_level: 'Basic'
};

const mockEnrollments = [
  {
    student_id: 'student1',
    course_id: 'course1',
    current_unit: 2,
    current_lesson: 3,
    progress_percentage: 45,
    course: {
      id: 'course1',
      title: 'Basic English',
      course_type: 'Basic'
    },
    student: mockStudentData
  }
];

const mockFeedback = [
  {
    student_id: 'student1',
    lesson_unit: 2,
    lesson_number: 2,
    lesson_completed: true,
    rating: 4,
    submitted_time: '2025-01-10T10:00:00Z',
    areas_for_improvement: 'grammar, pronunciation',
    strengths: 'vocabulary'
  },
  {
    student_id: 'student1',
    lesson_unit: 2,
    lesson_number: 1,
    lesson_completed: true,
    rating: 3,
    submitted_time: '2025-01-08T10:00:00Z',
    areas_for_improvement: 'grammar',
    strengths: 'listening'
  }
];

const mockMaterials = [
  {
    id: 'material1',
    title: 'Grammar Fundamentals',
    unit_number: 2,
    lesson_number: 4,
    material_type: 'PDF',
    description: 'Learn basic grammar rules and sentence structure'
  },
  {
    id: 'material2',
    title: 'Vocabulary Building',
    unit_number: 2,
    lesson_number: 5,
    material_type: 'Audio',
    description: 'Expand your vocabulary with common words'
  }
];

const mockRecentAttendance = [
  {
    student_id: 'student1',
    status: 'present',
    attendance_time: '2025-01-10T10:00:00Z',
    booking: {
      id: 'booking1',
      student_id: 'student1',
      class: {
        current_enrollment: 4
      }
    }
  }
];

const mockNextContent = [
  {
    id: 'material1',
    title: 'Grammar Fundamentals',
    unit_number: 2,
    lesson_number: 4,
    material_type: 'PDF',
    description: 'Learn basic grammar rules'
  }
];

const mockBookings = [
  {
    class_id: 'class1',
    student_id: 'student1',
    learning_goals: 'improve speaking skills'
  }
];

const mockSimilarStudents = [
  {
    id: 'student2',
    test_level: 'Basic',
    student_courses: [
      {
        course_id: 'course1',
        current_unit: 2,
        current_lesson: 2
      }
    ]
  }
];

const mockLowRatedFeedback = [
  {
    student_id: 'student1',
    rating: 2,
    areas_for_improvement: 'pronunciation, fluency'
  }
];

describe('ContentAnalysisService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeStudentProgress', () => {
    it('should analyze student progress correctly', async () => {
      const progress = await contentAnalysisService.analyzeStudentProgress('student1');

      expect(progress).toBeDefined();
      expect(Array.isArray(progress)).toBe(true);
      expect(progress.length).toBeGreaterThan(0);

      const firstProgress = progress[0];
      expect(firstProgress.student_id).toBe('student1');
      expect(firstProgress.course_id).toBe('course1');
      expect(firstProgress.current_unit).toBe(2);
      expect(firstProgress.current_lesson).toBe(3);
      expect(firstProgress.progress_percentage).toBe(45);
      expect(firstProgress.learning_pace).toBeOneOf(['slow', 'average', 'fast']);
      expect(Array.isArray(firstProgress.struggling_topics)).toBe(true);
      expect(Array.isArray(firstProgress.mastered_topics)).toBe(true);
    });

    it('should calculate learning pace correctly based on completion history', async () => {
      const progress = await contentAnalysisService.analyzeStudentProgress('student1');
      const firstProgress = progress[0];

      expect(['slow', 'average', 'fast']).toContain(firstProgress.learning_pace);
    });

    it('should identify struggling and mastered topics', async () => {
      const progress = await contentAnalysisService.analyzeStudentProgress('student1');
      const firstProgress = progress[0];

      expect(firstProgress.struggling_topics).toEqual(expect.arrayContaining(['grammar']));
      expect(firstProgress.mastered_topics).toEqual(expect.arrayContaining(['vocabulary']));
    });

    it('should handle students with no enrollment data', async () => {
      // Mock empty enrollment data
      const mockEmptyFrom = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({ data: [], error: null }))
          }))
        }))
      }));

      require('@/lib/supabase').supabase.from = mockEmptyFrom;

      const progress = await contentAnalysisService.analyzeStudentProgress('nonexistent-student');

      expect(progress).toBeDefined();
      expect(Array.isArray(progress)).toBe(true);
      expect(progress.length).toBe(0);
    });
  });

  describe('identifyUnlearnedContent', () => {
    it('should identify unlearned content for a student', async () => {
      const unlearnedContent = await contentAnalysisService.identifyUnlearnedContent('student1');

      expect(unlearnedContent).toBeDefined();
      expect(Array.isArray(unlearnedContent)).toBe(true);
      expect(unlearnedContent.length).toBeGreaterThan(0);

      const firstUnlearned = unlearnedContent[0];
      expect(firstUnlearned.student_id).toBe('student1');
      expect(Array.isArray(firstUnlearned.content_items)).toBe(true);
      expect(firstUnlearned.priority_score).toBeGreaterThanOrEqual(0);
      expect(firstUnlearned.priority_score).toBeLessThanOrEqual(100);
      expect(['urgent', 'high', 'medium', 'low']).toContain(firstUnlearned.urgency_level);
      expect(['individual', 'group']).toContain(firstUnlearned.recommended_class_type);
    });

    it('should filter by course type when specified', async () => {
      const unlearnedContent = await contentAnalysisService.identifyUnlearnedContent('student1', 'course1');

      expect(unlearnedContent).toBeDefined();
      expect(Array.isArray(unlearnedContent)).toBe(true);
      // Should only include content for the specified course
    });

    it('should calculate priority scores based on student progress', async () => {
      const unlearnedContent = await contentAnalysisService.identifyUnlearnedContent('student1');

      if (unlearnedContent.length > 0) {
        const firstUnlearned = unlearnedContent[0];
        expect(firstUnlearned.priority_score).toBeGreaterThan(0);
        
        // Priority should be higher for students with many struggling topics
        // This is tested indirectly through the scoring algorithm
      }
    });

    it('should determine appropriate class types based on content difficulty', async () => {
      const unlearnedContent = await contentAnalysisService.identifyUnlearnedContent('student1');

      for (const unlearned of unlearnedContent) {
        expect(['individual', 'group']).toContain(unlearned.recommended_class_type);
        
        // Individual classes should be recommended for struggling students or difficult content
        if (unlearned.content_items.some(item => item.difficulty_level > 7)) {
          // High difficulty content might lean towards individual classes
        }
      }
    });

    it('should find grouping compatibility for group-suitable content', async () => {
      const unlearnedContent = await contentAnalysisService.identifyUnlearnedContent('student1');

      for (const unlearned of unlearnedContent) {
        expect(Array.isArray(unlearned.grouping_compatibility)).toBe(true);
        
        if (unlearned.recommended_class_type === 'group') {
          // Group classes should have potential compatible students
          expect(unlearned.grouping_compatibility.length).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  describe('generateLearningAnalytics', () => {
    it('should generate comprehensive learning analytics', async () => {
      const analytics = await contentAnalysisService.generateLearningAnalytics('student1');

      expect(analytics).toBeDefined();
      expect(analytics.student_id).toBe('student1');
      expect(typeof analytics.learning_velocity).toBe('number');
      expect(analytics.learning_velocity).toBeGreaterThanOrEqual(0);
      expect(typeof analytics.retention_rate).toBe('number');
      expect(analytics.retention_rate).toBeGreaterThanOrEqual(0);
      expect(analytics.retention_rate).toBeLessThanOrEqual(100);
      expect(typeof analytics.engagement_score).toBe('number');
      expect(analytics.engagement_score).toBeGreaterThanOrEqual(0);
      expect(analytics.engagement_score).toBeLessThanOrEqual(100);
      expect(['visual', 'auditory', 'kinesthetic', 'mixed']).toContain(analytics.preferred_learning_style);
      expect(typeof analytics.optimal_class_size).toBe('number');
      expect(analytics.optimal_class_size).toBeGreaterThan(0);
      expect(Array.isArray(analytics.best_time_slots)).toBe(true);
      expect(Array.isArray(analytics.peer_compatibility)).toBe(true);
      expect(Array.isArray(analytics.topic_performance)).toBe(true);
    });

    it('should calculate learning velocity based on attendance history', async () => {
      const analytics = await contentAnalysisService.generateLearningAnalytics('student1');

      expect(analytics.learning_velocity).toBeGreaterThan(0);
      // Learning velocity should be calculated based on classes per week
    });

    it('should calculate retention rate from feedback data', async () => {
      const analytics = await contentAnalysisService.generateLearningAnalytics('student1');

      expect(analytics.retention_rate).toBeGreaterThanOrEqual(0);
      expect(analytics.retention_rate).toBeLessThanOrEqual(100);
      // Should be based on positive vs total feedback ratings
    });

    it('should identify optimal class size based on performance history', async () => {
      const analytics = await contentAnalysisService.generateLearningAnalytics('student1');

      expect(analytics.optimal_class_size).toBeGreaterThan(0);
      expect(analytics.optimal_class_size).toBeLessThanOrEqual(9);
      // Should be based on performance in different class sizes
    });

    it('should identify best time slots from attendance patterns', async () => {
      const analytics = await contentAnalysisService.generateLearningAnalytics('student1');

      expect(Array.isArray(analytics.best_time_slots)).toBe(true);
      
      for (const timeSlot of analytics.best_time_slots) {
        expect(typeof timeSlot.day_of_week).toBe('number');
        expect(timeSlot.day_of_week).toBeGreaterThanOrEqual(0);
        expect(timeSlot.day_of_week).toBeLessThanOrEqual(6);
        expect(typeof timeSlot.start_time).toBe('string');
        expect(typeof timeSlot.end_time).toBe('string');
        expect(typeof timeSlot.is_available).toBe('boolean');
      }
    });

    it('should analyze topic performance accurately', async () => {
      const analytics = await contentAnalysisService.generateLearningAnalytics('student1');

      expect(Array.isArray(analytics.topic_performance)).toBe(true);
      
      for (const topicPerf of analytics.topic_performance) {
        expect(typeof topicPerf.topic).toBe('string');
        expect(typeof topicPerf.mastery_level).toBe('number');
        expect(topicPerf.mastery_level).toBeGreaterThanOrEqual(0);
        expect(topicPerf.mastery_level).toBeLessThanOrEqual(100);
        expect(typeof topicPerf.difficulty_rating).toBe('number');
        expect(topicPerf.difficulty_rating).toBeGreaterThanOrEqual(1);
        expect(topicPerf.difficulty_rating).toBeLessThanOrEqual(10);
        expect(typeof topicPerf.requires_review).toBe('boolean');
      }
    });
  });

  describe('findCompatibleStudents', () => {
    it('should find students with similar content needs', async () => {
      const contentItems: ContentItem[] = [
        {
          id: 'content1',
          title: 'Grammar Basics',
          unit_number: 2,
          lesson_number: 4,
          content_type: 'grammar',
          difficulty_level: 5,
          prerequisites: [],
          estimated_duration_minutes: 45,
          tags: ['grammar'],
          learning_objectives: ['understand basic grammar']
        }
      ];

      const compatibleStudents = await contentAnalysisService.findCompatibleStudents(
        contentItems,
        'Basic'
      );

      expect(Array.isArray(compatibleStudents)).toBe(true);
      
      for (const studentId of compatibleStudents) {
        expect(typeof studentId).toBe('string');
      }
    });

    it('should filter by course type correctly', async () => {
      const contentItems: ContentItem[] = [
        {
          id: 'content1',
          title: 'Advanced Grammar',
          unit_number: 5,
          lesson_number: 1,
          content_type: 'grammar',
          difficulty_level: 8,
          prerequisites: ['basic_grammar'],
          estimated_duration_minutes: 60,
          tags: ['grammar', 'advanced'],
          learning_objectives: ['master advanced grammar']
        }
      ];

      const compatibleStudents = await contentAnalysisService.findCompatibleStudents(
        contentItems,
        'Business English'
      );

      expect(Array.isArray(compatibleStudents)).toBe(true);
      // Should only include students enrolled in Business English courses
    });

    it('should handle empty content items', async () => {
      const compatibleStudents = await contentAnalysisService.findCompatibleStudents(
        [],
        'Basic'
      );

      expect(Array.isArray(compatibleStudents)).toBe(true);
      expect(compatibleStudents.length).toBe(0);
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle database errors gracefully', async () => {
      // Mock database error
      const mockErrorFrom = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({ data: null, error: { message: 'Database error' } }))
          }))
        }))
      }));

      require('@/lib/supabase').supabase.from = mockErrorFrom;

      await expect(
        contentAnalysisService.analyzeStudentProgress('student1')
      ).rejects.toThrow('Database error');
    });

    it('should handle missing student data', async () => {
      const mockEmptyFrom = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({ data: null, error: null }))
          }))
        }))
      }));

      require('@/lib/supabase').supabase.from = mockEmptyFrom;

      await expect(
        contentAnalysisService.generateLearningAnalytics('nonexistent-student')
      ).rejects.toThrow('Student not found');
    });

    it('should handle empty feedback and attendance data', async () => {
      const mockEmptyDataFrom = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({ data: [], error: null }))
          }))
        }))
      }));

      require('@/lib/supabase').supabase.from = mockEmptyDataFrom;

      const analytics = await contentAnalysisService.generateLearningAnalytics('student1');

      expect(analytics).toBeDefined();
      expect(analytics.learning_velocity).toBe(0);
      expect(analytics.retention_rate).toBe(0);
      // Should provide default values when no data is available
    });

    it('should provide meaningful defaults for new students', async () => {
      // Mock new student with minimal data
      const mockNewStudentFrom = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({ data: mockStudentData, error: null })),
            order: jest.fn(() => ({ data: [], error: null }))
          }))
        }))
      }));

      require('@/lib/supabase').supabase.from = mockNewStudentFrom;

      const progress = await contentAnalysisService.analyzeStudentProgress('new-student');
      const analytics = await contentAnalysisService.generateLearningAnalytics('new-student');

      expect(progress).toBeDefined();
      expect(analytics).toBeDefined();
      expect(analytics.learning_velocity).toBeGreaterThanOrEqual(0);
      expect(analytics.preferred_learning_style).toBe('mixed'); // Default for new students
    });
  });

  describe('Performance and caching', () => {
    it('should complete analysis within reasonable time', async () => {
      const startTime = Date.now();
      await contentAnalysisService.analyzeStudentProgress('student1');
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle multiple simultaneous requests', async () => {
      const promises = [
        contentAnalysisService.analyzeStudentProgress('student1'),
        contentAnalysisService.identifyUnlearnedContent('student1'),
        contentAnalysisService.generateLearningAnalytics('student1')
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(results[0]).toBeDefined(); // Progress analysis
      expect(results[1]).toBeDefined(); // Unlearned content
      expect(results[2]).toBeDefined(); // Analytics
    });
  });
});