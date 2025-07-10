import { attendanceAnalyticsService } from '../attendance-analytics-service';
import { supabase } from '@/lib/supabase';

// Mock Supabase
jest.mock('@/lib/supabase', () => {
  const createMockQueryBuilder = () => ({
    select: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({
      data: mockAttendanceData,
      error: null
    })
  });

  return {
    supabase: {
      from: jest.fn(() => createMockQueryBuilder())
    }
  };
});

const mockAttendanceData = [
  {
    id: '1',
    attendance_time: '2024-01-15T09:00:00Z',
    status: 'present',
    hours_deducted: 0,
    notes: null,
    bookings: {
      id: 'booking-1',
      booking_date: '2024-01-15',
      start_time: '2024-01-15T09:00:00Z',
      end_time: '2024-01-15T10:00:00Z',
      duration_minutes: 60,
      students: {
        id: 'student-1',
        full_name: 'John Doe',
        email: 'john@example.com',
        student_id: 'S001'
      },
      classes: {
        id: 'class-1',
        class_name: 'Basic English A1',
        courses: {
          course_type: 'Basic'
        }
      },
      teachers: {
        id: 'teacher-1',
        full_name: 'Jane Smith',
        email: 'jane@example.com'
      }
    }
  },
  {
    id: '2',
    attendance_time: '2024-01-15T10:00:00Z',
    status: 'absent',
    hours_deducted: 1,
    notes: 'No show',
    bookings: {
      id: 'booking-2',
      booking_date: '2024-01-15',
      start_time: '2024-01-15T10:00:00Z',
      end_time: '2024-01-15T11:00:00Z',
      duration_minutes: 60,
      students: {
        id: 'student-2',
        full_name: 'Alice Johnson',
        email: 'alice@example.com',
        student_id: 'S002'
      },
      classes: {
        id: 'class-1',
        class_name: 'Basic English A1',
        courses: {
          course_type: 'Basic'
        }
      },
      teachers: {
        id: 'teacher-1',
        full_name: 'Jane Smith',
        email: 'jane@example.com'
      }
    }
  },
  {
    id: '3',
    attendance_time: '2024-01-15T11:00:00Z',
    status: 'late',
    hours_deducted: 0.5,
    notes: 'Arrived 15 minutes late',
    bookings: {
      id: 'booking-3',
      booking_date: '2024-01-15',
      start_time: '2024-01-15T11:00:00Z',
      end_time: '2024-01-15T12:00:00Z',
      duration_minutes: 60,
      students: {
        id: 'student-3',
        full_name: 'Bob Wilson',
        email: 'bob@example.com',
        student_id: 'S003'
      },
      classes: {
        id: 'class-2',
        class_name: 'Business English',
        courses: {
          course_type: 'Business English'
        }
      },
      teachers: {
        id: 'teacher-2',
        full_name: 'Mike Brown',
        email: 'mike@example.com'
      }
    }
  }
];

describe('AttendanceAnalyticsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAttendanceRecords', () => {
    it('should fetch attendance records with filters', async () => {
      const filters = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        status: 'present' as const
      };

      const records = await attendanceAnalyticsService.getAttendanceRecords(filters);

      expect(records).toHaveLength(3);
      expect(records[0]).toMatchObject({
        id: '1',
        status: 'present',
        hoursDeducted: 0,
        student: {
          id: 'student-1',
          fullName: 'John Doe',
          email: 'john@example.com',
          studentId: 'S001'
        },
        class: {
          id: 'class-1',
          className: 'Basic English A1',
          courseType: 'Basic'
        },
        teacher: {
          id: 'teacher-1',
          fullName: 'Jane Smith',
          email: 'jane@example.com'
        }
      });
    });

    it('should handle empty results', async () => {
      // Mock empty response
      const mockSupabase = supabase as any;
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  data: [],
                  error: null
                })
              })
            })
          })
        })
      });

      const records = await attendanceAnalyticsService.getAttendanceRecords();
      expect(records).toEqual([]);
    });

    it('should handle database errors', async () => {
      // Mock error response
      const mockSupabase = supabase as any;
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  data: null,
                  error: new Error('Database error')
                })
              })
            })
          })
        })
      });

      await expect(attendanceAnalyticsService.getAttendanceRecords()).rejects.toThrow('Database error');
    });
  });

  describe('getAttendanceStats', () => {
    it('should calculate attendance statistics correctly', async () => {
      const stats = await attendanceAnalyticsService.getAttendanceStats();

      expect(stats).toMatchObject({
        totalSessions: 3,
        attendanceRate: expect.any(Number),
        absenteeismRate: expect.any(Number),
        punctualityRate: expect.any(Number),
        averageHoursDeducted: expect.any(Number),
        totalHoursDeducted: 1.5,
        uniqueStudents: 3,
        uniqueClasses: 2,
        uniqueTeachers: 2,
        statusBreakdown: {
          present: 1,
          absent: 1,
          late: 1,
          excused: 0
        }
      });

      // Verify calculated rates
      expect(stats.attendanceRate).toBeCloseTo(33.33, 1); // 1 out of 3 present
      expect(stats.absenteeismRate).toBeCloseTo(33.33, 1); // 1 out of 3 absent
      expect(stats.averageHoursDeducted).toBeCloseTo(0.5, 1); // 1.5 total / 3 sessions
    });

    it('should handle zero sessions', async () => {
      // Mock empty response
      const mockSupabase = supabase as any;
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  data: [],
                  error: null
                })
              })
            })
          })
        })
      });

      const stats = await attendanceAnalyticsService.getAttendanceStats();

      expect(stats).toMatchObject({
        totalSessions: 0,
        attendanceRate: 0,
        absenteeismRate: 0,
        punctualityRate: 0,
        averageHoursDeducted: 0,
        totalHoursDeducted: 0,
        uniqueStudents: 0,
        uniqueClasses: 0,
        uniqueTeachers: 0,
        statusBreakdown: {
          present: 0,
          absent: 0,
          late: 0,
          excused: 0
        }
      });
    });
  });

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
  });
});

describe('AttendanceAnalyticsService Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should generate complete attendance report', async () => {
    const filters = {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
      period: 'monthly' as const
    };

    // Test all report types
    const [
      records,
      stats,
      classSummaries,
      teacherSummaries,
      periodSummaries,
      trends
    ] = await Promise.all([
      attendanceAnalyticsService.getAttendanceRecords(filters),
      attendanceAnalyticsService.getAttendanceStats(filters),
      attendanceAnalyticsService.getAttendanceByClass(filters),
      attendanceAnalyticsService.getAttendanceByTeacher(filters),
      attendanceAnalyticsService.getAttendanceByPeriod(filters),
      attendanceAnalyticsService.getAttendanceTrends(filters)
    ]);

    // Verify all reports are generated
    expect(records).toBeInstanceOf(Array);
    expect(stats).toHaveProperty('totalSessions');
    expect(classSummaries).toBeInstanceOf(Array);
    expect(teacherSummaries).toBeInstanceOf(Array);
    expect(periodSummaries).toBeInstanceOf(Array);
    expect(trends).toBeInstanceOf(Array);

    // Verify data consistency
    expect(stats.totalSessions).toBe(records.length);
    expect(stats.statusBreakdown.present + stats.statusBreakdown.absent + 
           stats.statusBreakdown.late + stats.statusBreakdown.excused).toBe(stats.totalSessions);
  });

  it('should handle complex filtering scenarios', async () => {
    const complexFilters = {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
      teacherId: 'teacher-1',
      status: 'present' as const,
      period: 'weekly' as const
    };

    const records = await attendanceAnalyticsService.getAttendanceRecords(complexFilters);
    
    // All records should match the filters
    records.forEach(record => {
      expect(record.teacher.id).toBe('teacher-1');
      expect(record.status).toBe('present');
      expect(record.attendanceTime).toBeInstanceOf(Date);
    });
  });
});

export {};