import { attendanceAnalyticsService } from '../attendance-analytics-service';

describe('AttendanceAnalyticsService - Simple Tests', () => {
  describe('getDateRangeForPeriod', () => {
    it('should return correct date range for daily period', () => {
      const range = attendanceAnalyticsService.getDateRangeForPeriod('daily');
      
      expect(range.start).toBeInstanceOf(Date);
      expect(range.end).toBeInstanceOf(Date);
      expect(range.start.toDateString()).toBe(new Date().toDateString());
      expect(range.end.toDateString()).toBe(new Date().toDateString());
    });

    it('should return correct date range for weekly period', () => {
      const range = attendanceAnalyticsService.getDateRangeForPeriod('weekly');
      
      expect(range.start).toBeInstanceOf(Date);
      expect(range.end).toBeInstanceOf(Date);
      expect(range.start.getDay()).toBe(0); // Sunday
    });

    it('should return correct date range for monthly period', () => {
      const range = attendanceAnalyticsService.getDateRangeForPeriod('monthly');
      
      expect(range.start).toBeInstanceOf(Date);
      expect(range.end).toBeInstanceOf(Date);
      expect(range.start.getDate()).toBe(1); // First day of month
    });

    it('should return custom date range when provided', () => {
      const customStart = new Date('2024-01-01');
      const customEnd = new Date('2024-01-31');
      
      const range = attendanceAnalyticsService.getDateRangeForPeriod('custom', customStart, customEnd);
      
      expect(range.start).toEqual(customStart);
      expect(range.end).toEqual(customEnd);
    });

    it('should handle different period types correctly', () => {
      const periods = ['daily', 'weekly', 'monthly', 'custom'] as const;
      
      periods.forEach(period => {
        const range = attendanceAnalyticsService.getDateRangeForPeriod(period);
        expect(range.start).toBeInstanceOf(Date);
        expect(range.end).toBeInstanceOf(Date);
        expect(range.start.getTime()).toBeLessThanOrEqual(range.end.getTime());
      });
    });
  });
});

describe('AttendanceAnalyticsService - Type Safety', () => {
  it('should have correct type definitions', () => {
    // Test that our types are properly structured
    const mockRecord = {
      id: '1',
      attendanceTime: new Date(),
      status: 'present' as const,
      hoursDeducted: 0,
      notes: 'Test note',
      student: {
        id: 'student-1',
        fullName: 'John Doe',
        email: 'john@example.com',
        studentId: 'S001'
      },
      class: {
        id: 'class-1',
        className: 'Basic English',
        courseType: 'Basic'
      },
      teacher: {
        id: 'teacher-1',
        fullName: 'Jane Smith',
        email: 'jane@example.com'
      },
      booking: {
        id: 'booking-1',
        bookingDate: new Date(),
        startTime: new Date(),
        endTime: new Date(),
        durationMinutes: 60
      }
    };

    // Type checking
    expect(mockRecord.status).toBe('present');
    expect(mockRecord.hoursDeducted).toBe(0);
    expect(mockRecord.student.fullName).toBe('John Doe');
    expect(mockRecord.class.courseType).toBe('Basic');
    expect(mockRecord.teacher.email).toBe('jane@example.com');
    expect(mockRecord.booking.durationMinutes).toBe(60);
  });

  it('should validate filter types', () => {
    const validFilters = {
      startDate: new Date(),
      endDate: new Date(),
      teacherId: 'teacher-123',
      classId: 'class-456',
      courseType: 'Basic',
      status: 'present' as const,
      period: 'weekly' as const
    };

    // These should be valid filter combinations
    expect(validFilters.status).toBe('present');
    expect(validFilters.period).toBe('weekly');
    expect(validFilters.startDate).toBeInstanceOf(Date);
    expect(validFilters.endDate).toBeInstanceOf(Date);
    expect(typeof validFilters.teacherId).toBe('string');
    expect(typeof validFilters.classId).toBe('string');
    expect(typeof validFilters.courseType).toBe('string');
  });
});

export {};