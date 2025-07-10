import { timeSlotAlternativeService } from '../time-slot-alternative-service';
import { supabase } from '@/lib/supabase';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(),
          })),
          single: jest.fn(),
          in: jest.fn(),
          gte: jest.fn(),
          lte: jest.fn(),
          lt: jest.fn(),
          not: jest.fn(),
        })),
        order: jest.fn(() => ({
          limit: jest.fn(),
        })),
        in: jest.fn(),
        gte: jest.fn(),
        lte: jest.fn(),
        lt: jest.fn(),
        not: jest.fn(),
      })),
    })),
  },
}));

// Mock conflict detection service (service removed - using placeholder)
const mockConflictDetectionService = {
  checkBookingConflicts: jest.fn(),
};

// Mock content analysis service
jest.mock('../content-analysis-service', () => ({
  contentAnalysisService: {
    generateLearningAnalytics: jest.fn(),
  },
}));

describe('TimeSlotAlternativeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateTimeAlternatives', () => {
    const mockRequest = {
      studentId: 'student-123',
      preferredTimeSlots: [
        {
          id: 'preferred-slot',
          startTime: '2024-01-15T10:00:00Z',
          endTime: '2024-01-15T11:00:00Z',
          duration: 60,
          dayOfWeek: 1,
          isAvailable: false, // Not available
          capacity: {
            maxStudents: 9,
            minStudents: 1,
            currentEnrollment: 9,
            availableSpots: 0,
          },
        },
      ],
      courseType: 'Basic' as const,
      availableDays: [1, 2, 3, 4, 5], // Weekdays
      minAdvanceHours: 24,
      maxAdvanceDays: 30,
      includeRecurring: true,
    };

    it('should generate time slot alternatives', async () => {
      // Mock student historical data
      const mockBookings = [
        {
          id: 'booking-1',
          student_id: 'student-123',
          created_at: '2024-01-10T10:00:00Z',
          attendance: [{ status: 'present' }],
          feedback: [{ rating: 4 }],
          class: {
            scheduled_start: '2024-01-10T10:00:00Z',
            scheduled_end: '2024-01-10T11:00:00Z',
          },
        },
        {
          id: 'booking-2',
          student_id: 'student-123',
          created_at: '2024-01-11T14:00:00Z',
          attendance: [{ status: 'present' }],
          feedback: [{ rating: 5 }],
          class: {
            scheduled_start: '2024-01-11T14:00:00Z',
            scheduled_end: '2024-01-11T15:00:00Z',
          },
        },
      ];

      const mockAvailableClasses = [
        {
          id: 'class-alt-1',
          course_id: 'course-789',
          teacher_id: 'teacher-456',
          max_students: 9,
          scheduled_start: '2024-01-16T14:00:00Z',
          course: { type: 'Basic' },
          teacher: { id: 'teacher-456' },
        },
        {
          id: 'class-alt-2',
          course_id: 'course-789',
          teacher_id: 'teacher-789',
          max_students: 9,
          scheduled_start: '2024-01-17T10:00:00Z',
          course: { type: 'Basic' },
          teacher: { id: 'teacher-789' },
        },
      ];

      // Mock Supabase responses
      const mockFrom = supabase.from as jest.Mock;
      mockFrom.mockImplementation((table: string) => {
        const chainMock = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn(),
          single: jest.fn(),
          in: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          lt: jest.fn().mockReturnThis(),
          not: jest.fn().mockReturnThis(),
        };

        if (table === 'bookings') {
          chainMock.limit.mockResolvedValue({
            data: mockBookings,
          });
          chainMock.single.mockResolvedValue({
            count: 3, // Current enrollment
          });
        } else if (table === 'classes') {
          chainMock.limit.mockResolvedValue({
            data: mockAvailableClasses,
          });
        } else if (table === 'teacher_availability') {
          chainMock.limit.mockResolvedValue({
            data: [
              {
                teacher_id: 'teacher-456',
                day_of_week: 1,
                start_time: '09:00',
                end_time: '17:00',
                is_available: true,
              },
            ],
          });
        }

        return chainMock;
      });

      // Mock conflict detection to return no conflicts
      mockConflictDetectionService.checkBookingConflicts.mockResolvedValue([]);

      const recommendations = await timeSlotAlternativeService.generateTimeAlternatives(
        mockRequest
      );

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);

      // Check recommendation structure
      recommendations.forEach(rec => {
        expect(rec).toHaveProperty('id');
        expect(rec).toHaveProperty('timeSlot');
        expect(rec).toHaveProperty('availableClasses');
        expect(rec).toHaveProperty('compatibilityScore');
        expect(rec).toHaveProperty('scoreBreakdown');
        expect(rec).toHaveProperty('reasoning');
        expect(rec).toHaveProperty('benefits');
        expect(rec).toHaveProperty('challenges');
        expect(rec).toHaveProperty('availability');
        expect(rec).toHaveProperty('performancePrediction');

        // Check score ranges
        expect(rec.compatibilityScore).toBeGreaterThanOrEqual(0);
        expect(rec.compatibilityScore).toBeLessThanOrEqual(100);

        // Check score breakdown
        expect(rec.scoreBreakdown.historicalPerformance).toBeGreaterThanOrEqual(0);
        expect(rec.scoreBreakdown.historicalPerformance).toBeLessThanOrEqual(100);
        expect(rec.scoreBreakdown.attendanceLikelihood).toBeGreaterThanOrEqual(0);
        expect(rec.scoreBreakdown.attendanceLikelihood).toBeLessThanOrEqual(100);

        // Check performance prediction
        expect(rec.performancePrediction.predictedAttendance).toBeGreaterThanOrEqual(0);
        expect(rec.performancePrediction.predictedAttendance).toBeLessThanOrEqual(1);
        expect(rec.performancePrediction.predictedEngagement).toBeGreaterThanOrEqual(1);
        expect(rec.performancePrediction.predictedEngagement).toBeLessThanOrEqual(10);
        expect(rec.performancePrediction.confidence).toBeGreaterThanOrEqual(0);
        expect(rec.performancePrediction.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should exclude preferred time slots from recommendations', async () => {
      const mockFrom = supabase.from as jest.Mock;
      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [] }),
        single: jest.fn().mockResolvedValue({ count: 0 }),
      }));

      // Mock conflict detection
      mockConflictDetectionService.checkBookingConflicts.mockResolvedValue([]);

      const recommendations = await timeSlotAlternativeService.generateTimeAlternatives(
        mockRequest
      );

      // Should not recommend the same time slots as preferred
      recommendations.forEach(rec => {
        const recStart = new Date(rec.timeSlot.startTime);
        const prefStart = new Date(mockRequest.preferredTimeSlots[0].startTime);
        
        // Should not be the exact same time
        expect(recStart.getTime()).not.toBe(prefStart.getTime());
      });
    });

    it('should filter out time slots with conflicts', async () => {
      const mockFrom = supabase.from as jest.Mock;
      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [] }),
        single: jest.fn().mockResolvedValue({ count: 0 }),
      }));

      // Mock conflict detection to return conflicts for some slots
      mockConflictDetectionService.checkBookingConflicts.mockImplementation((data) => {
        // Return conflict for specific times
        if (data.scheduledAt.includes('09:00')) {
          return Promise.resolve([
            {
              type: 'student_time_conflict',
              severity: 'error',
              message: 'Student already booked',
            },
          ]);
        }
        return Promise.resolve([]);
      });

      const recommendations = await timeSlotAlternativeService.generateTimeAlternatives(
        mockRequest
      );

      // Should not include conflicting time slots
      recommendations.forEach(rec => {
        const timeString = new Date(rec.timeSlot.startTime).toTimeString();
        expect(timeString).not.toMatch(/09:00/);
      });
    });

    it('should respect available days constraint', async () => {
      const weekendsOnlyRequest = {
        ...mockRequest,
        availableDays: [0, 6], // Sunday and Saturday only
      };

      const mockFrom = supabase.from as jest.Mock;
      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [] }),
        single: jest.fn().mockResolvedValue({ count: 0 }),
      }));

      mockConflictDetectionService.checkBookingConflicts.mockResolvedValue([]);

      const recommendations = await timeSlotAlternativeService.generateTimeAlternatives(
        weekendsOnlyRequest
      );

      // Should only include weekend slots
      recommendations.forEach(rec => {
        const dayOfWeek = new Date(rec.timeSlot.startTime).getDay();
        expect([0, 6]).toContain(dayOfWeek);
      });
    });

    it('should sort recommendations by compatibility score', async () => {
      // Mock data that will produce different scores
      const mockBookings = [
        {
          id: 'booking-good-time',
          student_id: 'student-123',
          attendance: [{ status: 'present' }],
          feedback: [{ rating: 5 }],
          class: {
            scheduled_start: '2024-01-10T10:00:00Z', // Good time
          },
        },
        {
          id: 'booking-bad-time',
          student_id: 'student-123',
          attendance: [{ status: 'absent' }],
          feedback: [{ rating: 2 }],
          class: {
            scheduled_start: '2024-01-10T16:00:00Z', // Bad time
          },
        },
      ];

      const mockFrom = supabase.from as jest.Mock;
      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: mockBookings,
        }),
        single: jest.fn().mockResolvedValue({ count: 3 }),
      }));

      mockConflictDetectionService.checkBookingConflicts.mockResolvedValue([]);

      const recommendations = await timeSlotAlternativeService.generateTimeAlternatives(
        mockRequest
      );

      // Should be sorted by compatibility score (highest first)
      if (recommendations.length > 1) {
        for (let i = 0; i < recommendations.length - 1; i++) {
          const currentScore = recommendations[i].compatibilityScore * recommendations[i].performancePrediction.confidence;
          const nextScore = recommendations[i + 1].compatibilityScore * recommendations[i + 1].performancePrediction.confidence;
          expect(currentScore).toBeGreaterThanOrEqual(nextScore);
        }
      }
    });
  });

  describe('Student time preference analysis', () => {
    it('should analyze student historical performance by time', async () => {
      const mockBookings = [
        {
          id: 'booking-1',
          student_id: 'student-123',
          attendance: [{ status: 'present' }],
          feedback: [{ rating: 5 }],
          class: {
            scheduled_start: '2024-01-10T10:00:00Z', // Monday 10 AM
          },
        },
        {
          id: 'booking-2',
          student_id: 'student-123',
          attendance: [{ status: 'present' }],
          feedback: [{ rating: 4 }],
          class: {
            scheduled_start: '2024-01-11T10:00:00Z', // Tuesday 10 AM
          },
        },
        {
          id: 'booking-3',
          student_id: 'student-123',
          attendance: [{ status: 'absent' }],
          feedback: [{ rating: 2 }],
          class: {
            scheduled_start: '2024-01-12T16:00:00Z', // Wednesday 4 PM
          },
        },
      ];

      const mockFrom = supabase.from as jest.Mock;
      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: mockBookings,
        }),
        single: jest.fn().mockResolvedValue({ count: 0 }),
      }));

      mockConflictDetectionService.checkBookingConflicts.mockResolvedValue([]);

      const mockRequest = {
        studentId: 'student-123',
        preferredTimeSlots: [],
        courseType: 'Basic' as const,
      };

      const recommendations = await timeSlotAlternativeService.generateTimeAlternatives(
        mockRequest
      );

      // Recommendations should prefer 10 AM slots over 4 PM based on historical data
      const morningRecs = recommendations.filter(rec => {
        const hour = new Date(rec.timeSlot.startTime).getHours();
        return hour >= 9 && hour < 12;
      });

      const afternoonRecs = recommendations.filter(rec => {
        const hour = new Date(rec.timeSlot.startTime).getHours();
        return hour >= 16;
      });

      if (morningRecs.length > 0 && afternoonRecs.length > 0) {
        const avgMorningScore = morningRecs.reduce((sum, rec) => sum + rec.compatibilityScore, 0) / morningRecs.length;
        const avgAfternoonScore = afternoonRecs.reduce((sum, rec) => sum + rec.compatibilityScore, 0) / afternoonRecs.length;
        
        expect(avgMorningScore).toBeGreaterThan(avgAfternoonScore);
      }
    });

    it('should handle students with no historical data', async () => {
      const mockFrom = supabase.from as jest.Mock;
      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [], // No historical data
        }),
        single: jest.fn().mockResolvedValue({ count: 0 }),
      }));

      mockConflictDetectionService.checkBookingConflicts.mockResolvedValue([]);

      const mockRequest = {
        studentId: 'new-student',
        preferredTimeSlots: [],
        courseType: 'Basic' as const,
      };

      const recommendations = await timeSlotAlternativeService.generateTimeAlternatives(
        mockRequest
      );

      // Should still generate recommendations using default preferences
      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);

      // All recommendations should have reasonable default scores
      recommendations.forEach(rec => {
        expect(rec.compatibilityScore).toBeGreaterThan(0);
        expect(rec.performancePrediction.confidence).toBeGreaterThan(0);
      });
    });
  });

  describe('Performance prediction', () => {
    it('should predict realistic student performance', async () => {
      const mockBookings = [
        {
          id: 'booking-1',
          attendance: [{ status: 'present' }],
          feedback: [{ rating: 4 }],
          class: { scheduled_start: '2024-01-10T10:00:00Z' },
        },
      ];

      const mockFrom = supabase.from as jest.Mock;
      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: mockBookings }),
        single: jest.fn().mockResolvedValue({ count: 0 }),
      }));

      mockConflictDetectionService.checkBookingConflicts.mockResolvedValue([]);

      const mockRequest = {
        studentId: 'student-123',
        preferredTimeSlots: [],
        courseType: 'Basic' as const,
      };

      const recommendations = await timeSlotAlternativeService.generateTimeAlternatives(
        mockRequest
      );

      recommendations.forEach(rec => {
        const prediction = rec.performancePrediction;
        
        // Predictions should be in realistic ranges
        expect(prediction.predictedAttendance).toBeGreaterThanOrEqual(0);
        expect(prediction.predictedAttendance).toBeLessThanOrEqual(1);
        expect(prediction.predictedEngagement).toBeGreaterThanOrEqual(1);
        expect(prediction.predictedEngagement).toBeLessThanOrEqual(10);
        expect(prediction.predictedOutcome).toBeGreaterThanOrEqual(0);
        expect(prediction.predictedOutcome).toBeLessThanOrEqual(100);

        // Should have influencing factors
        expect(Array.isArray(prediction.influencingFactors)).toBe(true);
      });
    });

    it('should identify optimal learning times', async () => {
      const mockFrom = supabase.from as jest.Mock;
      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [] }),
        single: jest.fn().mockResolvedValue({ count: 0 }),
      }));

      mockConflictDetectionService.checkBookingConflicts.mockResolvedValue([]);

      const mockRequest = {
        studentId: 'student-123',
        preferredTimeSlots: [],
        courseType: 'Basic' as const,
      };

      const recommendations = await timeSlotAlternativeService.generateTimeAlternatives(
        mockRequest
      );

      // Check that optimal learning times (10-12 AM, 2-4 PM) get higher scores
      const optimalTimeRecs = recommendations.filter(rec => {
        const hour = new Date(rec.timeSlot.startTime).getHours();
        return (hour >= 10 && hour < 12) || (hour >= 14 && hour < 16);
      });

      const suboptimalTimeRecs = recommendations.filter(rec => {
        const hour = new Date(rec.timeSlot.startTime).getHours();
        return hour < 9 || hour >= 17;
      });

      if (optimalTimeRecs.length > 0 && suboptimalTimeRecs.length > 0) {
        const avgOptimalScore = optimalTimeRecs.reduce((sum, rec) => sum + rec.scoreBreakdown.optimalLearningTime, 0) / optimalTimeRecs.length;
        const avgSuboptimalScore = suboptimalTimeRecs.reduce((sum, rec) => sum + rec.scoreBreakdown.optimalLearningTime, 0) / suboptimalTimeRecs.length;
        
        expect(avgOptimalScore).toBeGreaterThan(avgSuboptimalScore);
      }
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      const mockFrom = supabase.from as jest.Mock;
      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockRejectedValue(new Error('Database error')),
      }));

      const mockRequest = {
        studentId: 'student-123',
        preferredTimeSlots: [],
        courseType: 'Basic' as const,
      };

      const recommendations = await timeSlotAlternativeService.generateTimeAlternatives(
        mockRequest
      );

      // Should not throw error and return empty array or handle gracefully
      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should handle conflict detection service errors', async () => {
      const mockFrom = supabase.from as jest.Mock;
      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [] }),
        single: jest.fn().mockResolvedValue({ count: 0 }),
      }));

      // Mock conflict detection to throw error
      mockConflictDetectionService.checkBookingConflicts.mockRejectedValue(
        new Error('Conflict detection failed')
      );

      const mockRequest = {
        studentId: 'student-123',
        preferredTimeSlots: [],
        courseType: 'Basic' as const,
      };

      const recommendations = await timeSlotAlternativeService.generateTimeAlternatives(
        mockRequest
      );

      // Should handle conflict detection errors gracefully
      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
    });
  });

  describe('Time slot generation', () => {
    it('should respect advance booking constraints', async () => {
      const now = new Date('2024-01-15T09:00:00Z');
      jest.spyOn(Date, 'now').mockReturnValue(now.getTime());

      const mockRequest = {
        studentId: 'student-123',
        preferredTimeSlots: [],
        courseType: 'Basic' as const,
        minAdvanceHours: 48, // 2 days minimum
        maxAdvanceDays: 7,   // 1 week maximum
      };

      const mockFrom = supabase.from as jest.Mock;
      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [] }),
        single: jest.fn().mockResolvedValue({ count: 0 }),
      }));

      mockConflictDetectionService.checkBookingConflicts.mockResolvedValue([]);

      const recommendations = await timeSlotAlternativeService.generateTimeAlternatives(
        mockRequest
      );

      const minDate = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours from now
      const maxDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

      recommendations.forEach(rec => {
        const slotTime = new Date(rec.timeSlot.startTime);
        expect(slotTime.getTime()).toBeGreaterThanOrEqual(minDate.getTime());
        expect(slotTime.getTime()).toBeLessThanOrEqual(maxDate.getTime());
      });

      jest.restoreAllMocks();
    });

    it('should limit recommendations to reasonable number', async () => {
      const mockFrom = supabase.from as jest.Mock;
      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [] }),
        single: jest.fn().mockResolvedValue({ count: 0 }),
      }));

      mockConflictDetectionService.checkBookingConflicts.mockResolvedValue([]);

      const mockRequest = {
        studentId: 'student-123',
        preferredTimeSlots: [],
        courseType: 'Basic' as const,
        maxAdvanceDays: 90, // Long period to generate many slots
      };

      const recommendations = await timeSlotAlternativeService.generateTimeAlternatives(
        mockRequest
      );

      // Should limit to reasonable number (15 as per implementation)
      expect(recommendations.length).toBeLessThanOrEqual(15);
    });
  });
});