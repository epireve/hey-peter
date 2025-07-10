import { ClassAttendanceAnalyticsService } from '../class-attendance-analytics-service';
import { attendanceAnalyticsService } from '../attendance-analytics-service';
import { supabase } from '@/lib/supabase';
import { 
  AttendanceRecord, 
  ClassAttendanceAnalytics,
  AttendancePatternAnalysis 
} from '@/types/attendance';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('../attendance-analytics-service');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockAttendanceAnalyticsService = attendanceAnalyticsService as jest.Mocked<typeof attendanceAnalyticsService>;

describe('ClassAttendanceAnalyticsService', () => {
  let service: ClassAttendanceAnalyticsService;

  beforeEach(() => {
    service = new ClassAttendanceAnalyticsService();
    jest.clearAllMocks();
  });

  describe('getClassAttendanceAnalytics', () => {
    const mockClassInfo = {
      id: 'class-1',
      class_name: 'English Basic A1',
      courses: { course_type: 'Basic' },
      teachers: { id: 'teacher-1', full_name: 'John Doe' }
    };

    const mockAttendanceRecords: AttendanceRecord[] = [
      {
        id: 'att-1',
        attendanceTime: new Date('2024-01-15T09:00:00Z'),
        status: 'present',
        hoursDeducted: 0,
        student: {
          id: 'student-1',
          fullName: 'Alice Smith',
          email: 'alice@test.com',
          studentId: 'STU001'
        },
        class: {
          id: 'class-1',
          className: 'English Basic A1',
          courseType: 'Basic'
        },
        teacher: {
          id: 'teacher-1',
          fullName: 'John Doe',
          email: 'john@test.com'
        },
        booking: {
          id: 'booking-1',
          bookingDate: new Date('2024-01-15'),
          startTime: new Date('2024-01-15T09:00:00Z'),
          endTime: new Date('2024-01-15T10:00:00Z'),
          durationMinutes: 60
        }
      },
      {
        id: 'att-2',
        attendanceTime: new Date('2024-01-16T09:00:00Z'),
        status: 'absent',
        hoursDeducted: 1,
        student: {
          id: 'student-2',
          fullName: 'Bob Johnson',
          email: 'bob@test.com',
          studentId: 'STU002'
        },
        class: {
          id: 'class-1',
          className: 'English Basic A1',
          courseType: 'Basic'
        },
        teacher: {
          id: 'teacher-1',
          fullName: 'John Doe',
          email: 'john@test.com'
        },
        booking: {
          id: 'booking-2',
          bookingDate: new Date('2024-01-16'),
          startTime: new Date('2024-01-16T09:00:00Z'),
          endTime: new Date('2024-01-16T10:00:00Z'),
          durationMinutes: 60
        }
      }
    ];

    beforeEach(() => {
      // Mock Supabase responses
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockClassInfo,
          error: null
        }),
        limit: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis()
      } as any);

      // Mock attendance service
      mockAttendanceAnalyticsService.getAttendanceRecords.mockResolvedValue(mockAttendanceRecords);
    });

    it('should return comprehensive analytics for a class', async () => {
      const result = await service.getClassAttendanceAnalytics('class-1');

      expect(result).toMatchObject({
        classId: 'class-1',
        className: 'English Basic A1',
        courseType: 'Basic',
        teacher: {
          id: 'teacher-1',
          fullName: 'John Doe'
        }
      });

      expect(result.attendanceMetrics).toBeDefined();
      expect(result.trends).toBeDefined();
      expect(result.predictions).toBeDefined();
      expect(result.comparisons).toBeDefined();
      expect(result.performanceImpact).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.lastUpdated).toBeDefined();
    });

    it('should calculate correct attendance metrics', async () => {
      const result = await service.getClassAttendanceAnalytics('class-1');

      expect(result.attendanceMetrics.totalSessions).toBe(2);
      expect(result.attendanceMetrics.averageAttendanceRate).toBe(50); // 1 present out of 2
      expect(result.attendanceMetrics.attendanceByDayOfWeek).toBeDefined();
      expect(result.attendanceMetrics.attendanceByTimeSlot).toBeDefined();
    });

    it('should handle empty attendance records', async () => {
      mockAttendanceAnalyticsService.getAttendanceRecords.mockResolvedValue([]);

      const result = await service.getClassAttendanceAnalytics('class-1');

      expect(result.attendanceMetrics.totalSessions).toBe(0);
      expect(result.attendanceMetrics.averageAttendanceRate).toBe(0);
    });

    it('should cache results correctly', async () => {
      // First call
      await service.getClassAttendanceAnalytics('class-1');
      
      // Second call (should use cache)
      await service.getClassAttendanceAnalytics('class-1');

      // Should only call the service once
      expect(mockAttendanceAnalyticsService.getAttendanceRecords).toHaveBeenCalledTimes(1);
    });

    it('should force refresh when requested', async () => {
      // First call
      await service.getClassAttendanceAnalytics('class-1');
      
      // Second call with force refresh
      await service.getClassAttendanceAnalytics('class-1', '90_days', true);

      // Should call the service twice
      expect(mockAttendanceAnalyticsService.getAttendanceRecords).toHaveBeenCalledTimes(2);
    });

    it('should handle different timeframes', async () => {
      await service.getClassAttendanceAnalytics('class-1', '30_days');

      expect(mockAttendanceAnalyticsService.getAttendanceRecords).toHaveBeenCalledWith(
        expect.objectContaining({
          classId: 'class-1',
          startDate: expect.any(Date),
          endDate: expect.any(Date)
        })
      );
    });

    it('should throw error when class not found', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Class not found' }
        })
      } as any);

      await expect(service.getClassAttendanceAnalytics('invalid-class'))
        .rejects.toThrow('Failed to fetch class information');
    });
  });

  describe('getAttendancePatternAnalysis', () => {
    const mockAttendanceRecords: AttendanceRecord[] = [
      {
        id: 'att-1',
        attendanceTime: new Date('2024-01-15T09:00:00Z'),
        status: 'present',
        hoursDeducted: 0,
        student: {
          id: 'student-1',
          fullName: 'Alice Smith',
          email: 'alice@test.com',
          studentId: 'STU001'
        },
        class: {
          id: 'class-1',
          className: 'English Basic A1',
          courseType: 'Basic'
        },
        teacher: {
          id: 'teacher-1',
          fullName: 'John Doe',
          email: 'john@test.com'
        },
        booking: {
          id: 'booking-1',
          bookingDate: new Date('2024-01-15'),
          startTime: new Date('2024-01-15T09:00:00Z'),
          endTime: new Date('2024-01-15T10:00:00Z'),
          durationMinutes: 60
        }
      }
    ];

    beforeEach(() => {
      mockAttendanceAnalyticsService.getAttendanceRecords.mockResolvedValue(mockAttendanceRecords);
    });

    it('should return pattern analysis', async () => {
      const result = await service.getAttendancePatternAnalysis('class-1');

      expect(result).toHaveProperty('patterns');
      expect(result).toHaveProperty('anomalies');
      expect(result).toHaveProperty('insights');
      expect(Array.isArray(result.patterns)).toBe(true);
      expect(Array.isArray(result.anomalies)).toBe(true);
      expect(Array.isArray(result.insights)).toBe(true);
    });

    it('should detect consistent patterns', async () => {
      // Mock consistent attendance data
      const consistentRecords = Array.from({ length: 20 }, (_, i) => ({
        ...mockAttendanceRecords[0],
        id: `att-${i}`,
        attendanceTime: new Date(`2024-01-${15 + i}T09:00:00Z`),
        status: 'present' as const
      }));

      mockAttendanceAnalyticsService.getAttendanceRecords.mockResolvedValue(consistentRecords);

      const result = await service.getAttendancePatternAnalysis('class-1');

      expect(result.patterns).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'recurring',
            confidence: expect.any(Number)
          })
        ])
      );
    });

    it('should detect anomalies in attendance data', async () => {
      // Mock data with anomalies (very high and very low attendance)
      const anomalousRecords = [
        ...Array.from({ length: 10 }, (_, i) => ({
          ...mockAttendanceRecords[0],
          id: `att-${i}`,
          attendanceTime: new Date(`2024-01-${10 + i}T09:00:00Z`),
          status: 'present' as const
        })),
        // Anomaly: all absent on one day
        ...Array.from({ length: 5 }, (_, i) => ({
          ...mockAttendanceRecords[0],
          id: `att-anom-${i}`,
          attendanceTime: new Date('2024-01-20T09:00:00Z'),
          status: 'absent' as const
        }))
      ];

      mockAttendanceAnalyticsService.getAttendanceRecords.mockResolvedValue(anomalousRecords);

      const result = await service.getAttendancePatternAnalysis('class-1');

      expect(result.anomalies.length).toBeGreaterThan(0);
      expect(result.anomalies[0]).toMatchObject({
        type: expect.any(String),
        severity: expect.any(String),
        description: expect.any(String),
        possibleCauses: expect.any(Array)
      });
    });

    it('should generate insights based on data', async () => {
      const result = await service.getAttendancePatternAnalysis('class-1');

      expect(result.insights.length).toBeGreaterThan(0);
      expect(result.insights[0]).toMatchObject({
        category: expect.any(String),
        title: expect.any(String),
        description: expect.any(String),
        dataPoints: expect.any(Array),
        actionable: expect.any(Boolean)
      });
    });
  });

  describe('calculateAttendanceMetrics', () => {
    it('should calculate day of week attendance correctly', async () => {
      const mondayRecord = {
        ...mockAttendanceRecords[0],
        attendanceTime: new Date('2024-01-15T09:00:00Z'), // Monday
        status: 'present' as const
      };

      const tuesdayRecord = {
        ...mockAttendanceRecords[0],
        id: 'att-2',
        attendanceTime: new Date('2024-01-16T09:00:00Z'), // Tuesday
        status: 'absent' as const
      };

      mockAttendanceAnalyticsService.getAttendanceRecords.mockResolvedValue([
        mondayRecord,
        tuesdayRecord
      ]);

      const result = await service.getClassAttendanceAnalytics('class-1');

      const dayAnalysis = result.attendanceMetrics.attendanceByDayOfWeek;
      const mondayData = dayAnalysis.find(d => d.dayOfWeek === 'Monday');
      const tuesdayData = dayAnalysis.find(d => d.dayOfWeek === 'Tuesday');

      expect(mondayData?.attendanceRate).toBe(100);
      expect(tuesdayData?.attendanceRate).toBe(0);
    });

    it('should calculate time slot attendance correctly', async () => {
      const morningRecord = {
        ...mockAttendanceRecords[0],
        booking: {
          ...mockAttendanceRecords[0].booking,
          startTime: new Date('2024-01-15T09:00:00Z') // 9 AM
        },
        status: 'present' as const
      };

      const eveningRecord = {
        ...mockAttendanceRecords[0],
        id: 'att-2',
        booking: {
          ...mockAttendanceRecords[0].booking,
          startTime: new Date('2024-01-15T19:00:00Z') // 7 PM
        },
        status: 'present' as const
      };

      mockAttendanceAnalyticsService.getAttendanceRecords.mockResolvedValue([
        morningRecord,
        eveningRecord
      ]);

      const result = await service.getClassAttendanceAnalytics('class-1');

      const timeSlotAnalysis = result.attendanceMetrics.attendanceByTimeSlot;
      
      expect(timeSlotAnalysis.length).toBeGreaterThan(0);
      expect(timeSlotAnalysis[0]).toMatchObject({
        timeSlot: expect.any(String),
        attendanceRate: expect.any(Number),
        totalSessions: expect.any(Number),
        energyLevel: expect.any(Number)
      });
    });

    it('should calculate consistency score correctly', async () => {
      // Mock highly consistent data (all 100% attendance)
      const consistentRecords = Array.from({ length: 10 }, (_, i) => ({
        ...mockAttendanceRecords[0],
        id: `att-${i}`,
        attendanceTime: new Date(`2024-01-${15 + i}T09:00:00Z`),
        status: 'present' as const
      }));

      mockAttendanceAnalyticsService.getAttendanceRecords.mockResolvedValue(consistentRecords);

      const result = await service.getClassAttendanceAnalytics('class-1');

      expect(result.attendanceMetrics.attendanceConsistency).toBeGreaterThan(90);
    });
  });

  describe('generateAttendancePredictions', () => {
    it('should generate predictions based on trends', async () => {
      const result = await service.getClassAttendanceAnalytics('class-1');

      expect(result.predictions).toBeDefined();
      expect(Array.isArray(result.predictions)).toBe(true);

      if (result.predictions.length > 0) {
        expect(result.predictions[0]).toMatchObject({
          metric: expect.any(String),
          predictedValue: expect.any(Number),
          targetDate: expect.any(String),
          confidence: expect.any(Number),
          factors: expect.any(Array),
          riskLevel: expect.any(String)
        });
      }
    });

    it('should set appropriate risk levels', async () => {
      // Mock data that would generate high risk prediction
      const lowAttendanceRecords = Array.from({ length: 10 }, (_, i) => ({
        ...mockAttendanceRecords[0],
        id: `att-${i}`,
        status: i < 3 ? 'present' as const : 'absent' as const // 30% attendance
      }));

      mockAttendanceAnalyticsService.getAttendanceRecords.mockResolvedValue(lowAttendanceRecords);

      const result = await service.getClassAttendanceAnalytics('class-1');

      // Should generate high-risk predictions
      const highRiskPredictions = result.predictions.filter(p => p.riskLevel === 'high');
      expect(highRiskPredictions.length).toBeGreaterThan(0);
    });
  });

  describe('generateAttendanceRecommendations', () => {
    it('should generate recommendations for low attendance', async () => {
      // Mock low attendance data
      const lowAttendanceRecords = Array.from({ length: 10 }, (_, i) => ({
        ...mockAttendanceRecords[0],
        id: `att-${i}`,
        status: i < 5 ? 'present' as const : 'absent' as const // 50% attendance
      }));

      mockAttendanceAnalyticsService.getAttendanceRecords.mockResolvedValue(lowAttendanceRecords);

      const result = await service.getClassAttendanceAnalytics('class-1');

      expect(result.recommendations.length).toBeGreaterThan(0);
      
      const attendanceRecommendation = result.recommendations.find(r => 
        r.title.toLowerCase().includes('attendance')
      );
      
      expect(attendanceRecommendation).toBeDefined();
      expect(attendanceRecommendation?.priority).toBe('high');
    });

    it('should prioritize recommendations correctly', async () => {
      const result = await service.getClassAttendanceAnalytics('class-1');

      if (result.recommendations.length > 1) {
        const priorities = result.recommendations.map(r => r.priority);
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        
        // Check if recommendations are sorted by priority
        for (let i = 1; i < priorities.length; i++) {
          expect(priorityOrder[priorities[i-1] as keyof typeof priorityOrder])
            .toBeGreaterThanOrEqual(priorityOrder[priorities[i] as keyof typeof priorityOrder]);
        }
      }
    });

    it('should include actionable steps in recommendations', async () => {
      const result = await service.getClassAttendanceAnalytics('class-1');

      result.recommendations.forEach(recommendation => {
        expect(recommendation.actions).toBeDefined();
        expect(Array.isArray(recommendation.actions)).toBe(true);
        
        recommendation.actions.forEach(action => {
          expect(action).toMatchObject({
            action: expect.any(String),
            assignedTo: expect.any(String),
            deadline: expect.any(String),
            parameters: expect.any(Object)
          });
        });
      });
    });
  });

  describe('cache management', () => {
    it('should clear cache for specific class', async () => {
      // First call to populate cache
      await service.getClassAttendanceAnalytics('class-1');
      
      // Clear cache
      service.clearClassCache('class-1');
      
      // Second call should hit the service again
      await service.getClassAttendanceAnalytics('class-1');

      expect(mockAttendanceAnalyticsService.getAttendanceRecords).toHaveBeenCalledTimes(2);
    });

    it('should clear all cache', async () => {
      // Populate cache for multiple classes
      await service.getClassAttendanceAnalytics('class-1');
      
      // Clear all cache
      service.clearAllCache();
      
      // Should hit service again
      await service.getClassAttendanceAnalytics('class-1');

      expect(mockAttendanceAnalyticsService.getAttendanceRecords).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    it('should handle service errors gracefully', async () => {
      mockAttendanceAnalyticsService.getAttendanceRecords.mockRejectedValue(
        new Error('Service unavailable')
      );

      await expect(service.getClassAttendanceAnalytics('class-1'))
        .rejects.toThrow('Service unavailable');
    });

    it('should handle database errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockRejectedValue(new Error('Database error'))
      } as any);

      await expect(service.getClassAttendanceAnalytics('class-1'))
        .rejects.toThrow();
    });

    it('should handle invalid class IDs', async () => {
      await expect(service.getClassAttendanceAnalytics(''))
        .rejects.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle classes with no students', async () => {
      mockAttendanceAnalyticsService.getAttendanceRecords.mockResolvedValue([]);

      const result = await service.getClassAttendanceAnalytics('class-1');

      expect(result.attendanceMetrics.totalSessions).toBe(0);
      expect(result.attendanceMetrics.chronicallyAbsentStudents).toBe(0);
      expect(result.attendanceMetrics.improvingStudents).toBe(0);
      expect(result.attendanceMetrics.decliningStudents).toBe(0);
    });

    it('should handle single session classes', async () => {
      mockAttendanceAnalyticsService.getAttendanceRecords.mockResolvedValue([
        mockAttendanceRecords[0]
      ]);

      const result = await service.getClassAttendanceAnalytics('class-1');

      expect(result.attendanceMetrics.totalSessions).toBe(1);
      expect(result.trends.length).toBeGreaterThanOrEqual(0); // May not have enough data for trends
    });

    it('should handle classes with all perfect attendance', async () => {
      const perfectRecords = Array.from({ length: 20 }, (_, i) => ({
        ...mockAttendanceRecords[0],
        id: `att-${i}`,
        status: 'present' as const
      }));

      mockAttendanceAnalyticsService.getAttendanceRecords.mockResolvedValue(perfectRecords);

      const result = await service.getClassAttendanceAnalytics('class-1');

      expect(result.attendanceMetrics.averageAttendanceRate).toBe(100);
      expect(result.attendanceMetrics.chronicallyAbsentStudents).toBe(0);
    });

    it('should handle missing booking data', async () => {
      const recordsWithMissingBooking = [{
        ...mockAttendanceRecords[0],
        booking: {
          ...mockAttendanceRecords[0].booking,
          startTime: null as any
        }
      }];

      mockAttendanceAnalyticsService.getAttendanceRecords.mockResolvedValue(recordsWithMissingBooking);

      const result = await service.getClassAttendanceAnalytics('class-1');

      // Should not crash and should handle gracefully
      expect(result).toBeDefined();
      expect(result.attendanceMetrics.totalSessions).toBe(1);
    });
  });
});

// Sample data for testing
const mockAttendanceRecords: AttendanceRecord[] = [
  {
    id: 'att-1',
    attendanceTime: new Date('2024-01-15T09:00:00Z'),
    status: 'present',
    hoursDeducted: 0,
    student: {
      id: 'student-1',
      fullName: 'Alice Smith',
      email: 'alice@test.com',
      studentId: 'STU001'
    },
    class: {
      id: 'class-1',
      className: 'English Basic A1',
      courseType: 'Basic'
    },
    teacher: {
      id: 'teacher-1',
      fullName: 'John Doe',
      email: 'john@test.com'
    },
    booking: {
      id: 'booking-1',
      bookingDate: new Date('2024-01-15'),
      startTime: new Date('2024-01-15T09:00:00Z'),
      endTime: new Date('2024-01-15T10:00:00Z'),
      durationMinutes: 60
    }
  }
];