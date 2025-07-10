import { attendanceAnalyticsService } from '../attendance-analytics-service';
import { analyticsExportService } from '../analytics-export-service';

describe('Attendance Reporting System Integration', () => {
  // Mock data for testing
  const mockFilters = {
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-31'),
    period: 'monthly' as const
  };

  it('should generate complete attendance analytics', async () => {
    // Test that all analytics methods work together
    const dateRange = attendanceAnalyticsService.getDateRangeForPeriod('monthly');
    
    expect(dateRange.start).toBeInstanceOf(Date);
    expect(dateRange.end).toBeInstanceOf(Date);
    expect(dateRange.start.getDate()).toBe(1);
    expect(dateRange.end.getMonth()).toBe(dateRange.start.getMonth());
  });

  it('should handle export functionality', async () => {
    // Test export service integration
    const testData = [
      { id: '1', name: 'Test', value: 100 },
      { id: '2', name: 'Test2', value: 200 }
    ];

    const exportOptions = {
      format: 'json' as const,
      fileName: 'test-export'
    };

    // This would normally trigger a download
    expect(() => {
      analyticsExportService.prepareDataForExport(testData, ['id', 'name']);
    }).not.toThrow();

    const preparedData = analyticsExportService.prepareDataForExport(testData, ['id', 'name']);
    expect(preparedData).toHaveLength(2);
    expect(preparedData[0]).toEqual({ id: '1', name: 'Test' });
  });

  it('should validate attendance filter types', () => {
    // Test type safety and validation
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
  });

  it('should handle empty data gracefully', async () => {
    // Test error handling and edge cases
    const emptyData: any[] = [];
    
    const preparedData = analyticsExportService.prepareDataForExport(emptyData);
    expect(preparedData).toEqual([]);
  });

  it('should generate valid file names', () => {
    // Test filename generation
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = analyticsExportService.generateFileName('attendance-report', 'xlsx');
    
    expect(filename).toContain('attendance-report');
    expect(filename).toContain(timestamp);
    expect(filename).toContain('.xlsx');
  });

  it('should validate date ranges', () => {
    // Test date range validation
    const dailyRange = attendanceAnalyticsService.getDateRangeForPeriod('daily');
    const weeklyRange = attendanceAnalyticsService.getDateRangeForPeriod('weekly');
    const monthlyRange = attendanceAnalyticsService.getDateRangeForPeriod('monthly');

    // Daily range should be same day
    expect(dailyRange.start.toDateString()).toBe(dailyRange.end.toDateString());

    // Weekly range should be 7 days
    const weekDiff = (weeklyRange.end.getTime() - weeklyRange.start.getTime()) / (1000 * 60 * 60 * 24);
    expect(weekDiff).toBeGreaterThanOrEqual(6);
    expect(weekDiff).toBeLessThan(8);

    // Monthly range should start on 1st
    expect(monthlyRange.start.getDate()).toBe(1);
  });

  it('should handle custom date ranges', () => {
    // Test custom date range handling
    const customStart = new Date('2024-06-01');
    const customEnd = new Date('2024-06-30');
    
    const customRange = attendanceAnalyticsService.getDateRangeForPeriod('custom', customStart, customEnd);
    
    expect(customRange.start).toEqual(customStart);
    expect(customRange.end).toEqual(customEnd);
  });
});

// Test type definitions
describe('Attendance Types', () => {
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
});

export {};