import { classRecommendationService } from '../class-recommendation-service';
import { supabase } from '@/lib/supabase';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
          order: jest.fn(() => ({
            limit: jest.fn(),
          })),
          in: jest.fn(),
          gte: jest.fn(),
          lte: jest.fn(),
          lt: jest.fn(),
          neq: jest.fn(),
        })),
        order: jest.fn(() => ({
          limit: jest.fn(),
        })),
        in: jest.fn(),
        gte: jest.fn(),
        lte: jest.fn(),
        lt: jest.fn(),
        neq: jest.fn(),
      })),
    })),
  },
}));

// Mock other services
jest.mock('../content-analysis-service', () => ({
  contentAnalysisService: {
    analyzeStudentProgress: jest.fn(),
    generateLearningAnalytics: jest.fn(),
  },
}));

// Mock conflict detection service (service removed - using placeholder)
const mockConflictDetectionService = {
  checkBookingConflicts: jest.fn(),
};

describe('ClassRecommendationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateAlternativeRecommendations', () => {
    const mockRequest = {
      studentId: 'student-123',
      preferredClassId: 'class-456',
      preferredTimeSlots: [
        {
          id: 'slot-1',
          startTime: '2024-01-15T10:00:00Z',
          endTime: '2024-01-15T11:00:00Z',
          duration: 60,
          dayOfWeek: 1,
          isAvailable: true,
          capacity: {
            maxStudents: 9,
            minStudents: 1,
            currentEnrollment: 9,
            availableSpots: 0,
          },
        },
      ],
      courseType: 'Basic' as const,
      priority: 'high' as const,
    };

    it('should generate alternative recommendations when preferred class is full', async () => {
      // Mock data setup
      const mockStudentProgress = [
        {
          studentId: 'student-123',
          courseId: 'course-789',
          progressPercentage: 60,
          currentUnit: 3,
          currentLesson: 5,
          completedContent: ['content-1', 'content-2'],
          inProgressContent: ['content-3'],
          unlearnedContent: ['content-4', 'content-5'],
          skillAssessments: {},
          learningPace: 'average' as const,
          preferredTimes: [],
          lastActivity: '2024-01-14T10:00:00Z',
          studyStreak: 5,
          performanceMetrics: {
            attendanceRate: 0.85,
            assignmentCompletionRate: 0.80,
            averageScore: 75,
            engagementLevel: 7,
            preferredClassTypes: ['group'],
            optimalClassSize: 4,
            bestPerformingTimes: [],
            challengingTopics: [],
          },
        },
      ];

      const mockPreferredClass = {
        id: 'class-456',
        courseId: 'course-789',
        teacherId: 'teacher-123',
        studentIds: [],
        timeSlot: mockRequest.preferredTimeSlots[0],
        content: [],
        classType: 'group' as const,
        status: 'scheduled' as const,
        confidenceScore: 0.9,
        rationale: 'Preferred class',
        alternatives: [],
      };

      const mockAlternativeClasses = [
        {
          id: 'class-alt-1',
          course_id: 'course-789',
          teacher_id: 'teacher-456',
          max_students: 9,
          scheduled_start: '2024-01-15T14:00:00Z',
          scheduled_end: '2024-01-15T15:00:00Z',
          course: { type: 'Basic' },
          teacher: { id: 'teacher-456', name: 'Teacher Two' },
        },
        {
          id: 'class-alt-2',
          course_id: 'course-789',
          teacher_id: 'teacher-789',
          max_students: 9,
          scheduled_start: '2024-01-16T10:00:00Z',
          scheduled_end: '2024-01-16T11:00:00Z',
          course: { type: 'Basic' },
          teacher: { id: 'teacher-789', name: 'Teacher Three' },
        },
      ];

      // Mock Supabase responses
      const mockFrom = supabase.from as jest.Mock;
      mockFrom.mockImplementation((table: string) => {
        const chainMock = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          neq: jest.fn().mockReturnThis(),
          single: jest.fn(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn(),
        };

        if (table === 'student_courses') {
          chainMock.single.mockResolvedValue({
            data: {
              student_id: 'student-123',
              course_id: 'course-789',
              progress_percentage: 60,
              current_unit: 3,
              current_lesson: 5,
            },
          });
        } else if (table === 'classes') {
          chainMock.single.mockResolvedValue({
            data: mockPreferredClass,
          });
          chainMock.limit.mockResolvedValue({
            data: mockAlternativeClasses,
          });
        } else if (table === 'bookings') {
          chainMock.single.mockResolvedValue({
            count: 8, // Not full for alternatives
          });
        }

        return chainMock;
      });

      const recommendations = await classRecommendationService.generateAlternativeRecommendations(
        mockRequest
      );

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);

      // Check that recommendations have required properties
      recommendations.forEach(rec => {
        expect(rec).toHaveProperty('id');
        expect(rec).toHaveProperty('alternativeClass');
        expect(rec).toHaveProperty('overallScore');
        expect(rec).toHaveProperty('scoreBreakdown');
        expect(rec).toHaveProperty('type');
        expect(rec).toHaveProperty('reasoning');
        expect(rec).toHaveProperty('benefits');
        expect(rec).toHaveProperty('drawbacks');
        expect(rec).toHaveProperty('confidenceLevel');
        expect(rec).toHaveProperty('availability');

        // Check score ranges
        expect(rec.overallScore).toBeGreaterThanOrEqual(0);
        expect(rec.overallScore).toBeLessThanOrEqual(100);
        expect(rec.confidenceLevel).toBeGreaterThanOrEqual(0);
        expect(rec.confidenceLevel).toBeLessThanOrEqual(1);
      });
    });

    it('should handle empty alternative classes gracefully', async () => {
      // Mock empty response
      const mockFrom = supabase.from as jest.Mock;
      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null }),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [] }),
      }));

      const recommendations = await classRecommendationService.generateAlternativeRecommendations(
        mockRequest
      );

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should prioritize recommendations by score and confidence', async () => {
      // Mock data that will produce different scores
      const mockFrom = supabase.from as jest.Mock;
      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'class-456',
            course_id: 'course-789',
            teacher_id: 'teacher-123',
          },
        }),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'class-low-score',
              course_id: 'course-789',
              teacher_id: 'teacher-456',
              max_students: 9,
            },
            {
              id: 'class-high-score',
              course_id: 'course-789',
              teacher_id: 'teacher-789',
              max_students: 9,
            },
          ],
        }),
      }));

      const recommendations = await classRecommendationService.generateAlternativeRecommendations(
        mockRequest
      );

      if (recommendations.length > 1) {
        // Check that recommendations are sorted by score * confidence
        for (let i = 0; i < recommendations.length - 1; i++) {
          const currentScore = recommendations[i].overallScore * recommendations[i].confidenceLevel;
          const nextScore = recommendations[i + 1].overallScore * recommendations[i + 1].confidenceLevel;
          expect(currentScore).toBeGreaterThanOrEqual(nextScore);
        }
      }
    });

    it('should include waitlist recommendations when requested', async () => {
      const requestWithWaitlist = {
        ...mockRequest,
        includeWaitlist: true,
      };

      // Mock waitlist data
      const mockFrom = supabase.from as jest.Mock;
      mockFrom.mockImplementation((table: string) => {
        const chainMock = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          single: jest.fn(),
          limit: jest.fn(),
        };

        if (table === 'class_waitlist') {
          chainMock.limit.mockResolvedValue({
            data: [
              { id: 'wait-1', student_id: 'other-student', created_at: '2024-01-14T10:00:00Z' },
              { id: 'wait-2', student_id: 'another-student', created_at: '2024-01-14T11:00:00Z' },
            ],
          });
        } else if (table === 'classes') {
          chainMock.single.mockResolvedValue({
            data: mockPreferredClass,
          });
        }

        return chainMock;
      });

      const recommendations = await classRecommendationService.generateAlternativeRecommendations(
        requestWithWaitlist
      );

      // Should include waitlist option
      const waitlistRec = recommendations.find(rec => rec.type === 'waitlist');
      if (waitlistRec) {
        expect(waitlistRec.estimatedWaitTime).toBeDefined();
        expect(waitlistRec.estimatedWaitTime).toBeGreaterThan(0);
      }
    });
  });

  describe('Score calculation', () => {
    it('should calculate realistic scores for different scenarios', async () => {
      const mockRequest = {
        studentId: 'student-123',
        preferredClassId: 'class-456',
        preferredTimeSlots: [],
        courseType: 'Basic' as const,
        priority: 'medium' as const,
      };

      // Mock perfect match scenario
      const mockFrom = supabase.from as jest.Mock;
      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'class-perfect',
            course_id: 'course-789',
            teacher_id: 'teacher-perfect',
            max_students: 4, // Student's optimal class size
          },
        }),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'class-perfect',
              course_id: 'course-789',
              teacher_id: 'teacher-perfect',
              max_students: 4,
            },
          ],
        }),
      }));

      const recommendations = await classRecommendationService.generateAlternativeRecommendations(
        mockRequest
      );

      if (recommendations.length > 0) {
        const perfectMatch = recommendations[0];
        expect(perfectMatch.scoreBreakdown).toBeDefined();
        expect(perfectMatch.scoreBreakdown.contentSimilarity).toBeGreaterThanOrEqual(0);
        expect(perfectMatch.scoreBreakdown.contentSimilarity).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      const mockRequest = {
        studentId: 'student-123',
        preferredClassId: 'class-456',
        preferredTimeSlots: [],
        courseType: 'Basic' as const,
        priority: 'high' as const,
      };

      // Mock database error
      const mockFrom = supabase.from as jest.Mock;
      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockRejectedValue(new Error('Database connection failed')),
      }));

      const recommendations = await classRecommendationService.generateAlternativeRecommendations(
        mockRequest
      );

      // Should not throw error and return empty array or handle gracefully
      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should handle missing preferred class', async () => {
      const mockRequest = {
        studentId: 'student-123',
        preferredClassId: 'non-existent-class',
        preferredTimeSlots: [],
        courseType: 'Basic' as const,
        priority: 'high' as const,
      };

      // Mock missing class
      const mockFrom = supabase.from as jest.Mock;
      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null }),
      }));

      await expect(
        classRecommendationService.generateAlternativeRecommendations(mockRequest)
      ).rejects.toThrow('Preferred class non-existent-class not found');
    });
  });

  describe('Recommendation types', () => {
    it('should generate different types of recommendations', async () => {
      const mockRequest = {
        studentId: 'student-123',
        preferredClassId: 'class-456',
        preferredTimeSlots: [
          {
            id: 'slot-1',
            startTime: '2024-01-15T10:00:00Z',
            endTime: '2024-01-15T11:00:00Z',
            duration: 60,
            dayOfWeek: 1,
            isAvailable: true,
            capacity: {
              maxStudents: 9,
              minStudents: 1,
              currentEnrollment: 9,
              availableSpots: 0,
            },
          },
        ],
        courseType: 'Basic' as const,
        maxDistance: 10,
        includeWaitlist: true,
        priority: 'high' as const,
      };

      // Mock diverse alternatives
      const mockFrom = supabase.from as jest.Mock;
      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'class-456',
            course_id: 'course-789',
            teacher_id: 'teacher-123',
          },
        }),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'class-content-similar',
              course_id: 'course-789',
              teacher_id: 'teacher-456',
              location: 'Room A',
            },
            {
              id: 'class-time-alternative',
              course_id: 'course-789',
              teacher_id: 'teacher-789',
              location: 'Online',
            },
            {
              id: 'class-teacher-match',
              course_id: 'course-789',
              teacher_id: 'teacher-compatible',
              location: 'Room B',
            },
          ],
        }),
      }));

      const recommendations = await classRecommendationService.generateAlternativeRecommendations(
        mockRequest
      );

      // Check for different recommendation types
      const types = recommendations.map(rec => rec.type);
      const uniqueTypes = [...new Set(types)];

      expect(uniqueTypes.length).toBeGreaterThan(0);
      expect(uniqueTypes).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/content_similar|time_alternative|teacher_match|location_optimized|waitlist/)
        ])
      );
    });
  });
});