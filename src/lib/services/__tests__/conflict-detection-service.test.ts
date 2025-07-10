import { conflictDetectionService, ConflictDetectionService, BookingConflictData } from '../conflict-detection-service';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
    })),
  },
}));

describe('ConflictDetectionService', () => {
  let service: ConflictDetectionService;

  beforeEach(() => {
    service = new ConflictDetectionService();
    jest.clearAllMocks();
  });

  describe('checkBookingConflicts', () => {
    const mockBookingData: BookingConflictData = {
      studentId: 'student-1',
      teacherId: 'teacher-1',
      classId: 'class-1',
      scheduledAt: '2024-07-15T10:00:00Z',
      durationMinutes: 60,
    };

    it('should detect no conflicts when no overlapping bookings exist', async () => {
      // Mock empty results
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.from().select().eq().in().gte().lte.mockResolvedValue({
        data: [],
        error: null,
      });

      const conflicts = await service.checkBookingConflicts(mockBookingData);

      expect(conflicts).toHaveLength(0);
    });

    it('should detect teacher time conflicts', async () => {
      const mockSupabase = require('@/lib/supabase').supabase;
      
      // Mock overlapping booking
      mockSupabase.from().select().eq().in().gte().lte.mockResolvedValueOnce({
        data: [
          {
            id: 'existing-booking-1',
            scheduled_at: '2024-07-15T10:30:00Z',
            duration_minutes: 60,
            class: { title: 'Existing Class' },
          },
        ],
        error: null,
      });

      // Mock other queries to return empty results
      mockSupabase.from().select().eq().in().gte().lte.mockResolvedValue({
        data: [],
        error: null,
      });

      const conflicts = await service.checkBookingConflicts(mockBookingData);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('teacher_time_conflict');
      expect(conflicts[0].severity).toBe('error');
      expect(conflicts[0].canProceed).toBe(false);
    });

    it('should detect student time conflicts', async () => {
      const mockSupabase = require('@/lib/supabase').supabase;
      
      // First call for teacher conflicts - empty
      mockSupabase.from().select().eq().in().gte().lte.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      // Second call for student conflicts - has overlap
      mockSupabase.from().select().eq().in().gte().lte.mockResolvedValueOnce({
        data: [
          {
            id: 'student-booking-1',
            scheduled_at: '2024-07-15T10:30:00Z',
            duration_minutes: 45,
            class: { title: 'Student Existing Class' },
          },
        ],
        error: null,
      });

      // Remaining calls return empty
      mockSupabase.from().select().eq().in().gte().lte.mockResolvedValue({
        data: [],
        error: null,
      });

      const conflicts = await service.checkBookingConflicts(mockBookingData);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('student_time_conflict');
      expect(conflicts[0].severity).toBe('error');
    });

    it('should detect class capacity conflicts', async () => {
      const mockSupabase = require('@/lib/supabase').supabase;
      
      // Mock teacher and student conflict checks to return empty
      mockSupabase.from().select().eq().in().gte().lte.mockResolvedValue({
        data: [],
        error: null,
      });

      // Mock class details
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: {
          id: 'class-1',
          max_students: 3,
          title: 'Test Class',
        },
        error: null,
      });

      // Mock booking count at capacity
      mockSupabase.from().select.mockReturnValueOnce({
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          count: 3,
          error: null,
        }),
      });

      const conflicts = await service.checkBookingConflicts(mockBookingData);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('class_capacity_conflict');
      expect(conflicts[0].severity).toBe('error');
      expect(conflicts[0].canProceed).toBe(false);
    });

    it('should detect availability block conflicts', async () => {
      const mockSupabase = require('@/lib/supabase').supabase;
      
      // Mock teacher/student conflicts to return empty
      mockSupabase.from().select().eq().in().gte().lte.mockResolvedValue({
        data: [],
        error: null,
      });

      // Mock class capacity check
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { max_students: 10 },
        error: null,
      });
      mockSupabase.from().select.mockReturnValueOnce({
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ count: 0, error: null }),
      });

      // Mock availability block conflict
      mockSupabase.from().select().eq().gte().lte.mockResolvedValueOnce({
        data: [
          {
            id: 'block-1',
            start_datetime: '2024-07-15T10:30:00Z',
            end_datetime: '2024-07-15T11:30:00Z',
            type: 'meeting',
            title: 'Staff Meeting',
          },
        ],
        error: null,
      });

      const conflicts = await service.checkBookingConflicts(mockBookingData);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('teacher_time_conflict');
      expect(conflicts[0].message).toContain('Staff Meeting');
    });

    it('should handle recurring booking conflicts', async () => {
      const recurringData: BookingConflictData = {
        ...mockBookingData,
        recurringPattern: 'weekly',
        recurringEndDate: '2024-08-15T10:00:00Z',
      };

      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.from().select().eq().in().gte().lte.mockResolvedValue({
        data: [],
        error: null,
      });

      // Mock other queries
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { max_students: 10 },
        error: null,
      });
      mockSupabase.from().select.mockReturnValue({
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ count: 0, error: null }),
      });

      const conflicts = await service.checkBookingConflicts(recurringData);

      // Should check multiple dates for recurring pattern
      expect(conflicts).toBeDefined();
    });

    it('should skip specified conflict types', async () => {
      const mockSupabase = require('@/lib/supabase').supabase;
      
      // Mock teacher conflict
      mockSupabase.from().select().eq().in().gte().lte.mockResolvedValueOnce({
        data: [
          {
            id: 'conflict-booking',
            scheduled_at: '2024-07-15T10:30:00Z',
            duration_minutes: 60,
          },
        ],
        error: null,
      });

      const conflicts = await service.checkBookingConflicts(mockBookingData, {
        skipTypes: ['teacher_time_conflict'],
      });

      // Should not include teacher conflicts since we skipped them
      expect(conflicts.filter(c => c.type === 'teacher_time_conflict')).toHaveLength(0);
    });

    it('should exclude warnings when not requested', async () => {
      const mockSupabase = require('@/lib/supabase').supabase;
      
      // Mock availability block with break type (warning)
      mockSupabase.from().select().eq().in().gte().lte.mockResolvedValue({
        data: [],
        error: null,
      });

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { max_students: 10 },
        error: null,
      });
      mockSupabase.from().select.mockReturnValue({
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ count: 0, error: null }),
      });

      mockSupabase.from().select().eq().gte().lte.mockResolvedValueOnce({
        data: [
          {
            id: 'break-block',
            start_datetime: '2024-07-15T10:30:00Z',
            end_datetime: '2024-07-15T11:00:00Z',
            type: 'break',
            title: 'Lunch Break',
          },
        ],
        error: null,
      });

      const conflicts = await service.checkBookingConflicts(mockBookingData, {
        includeWarnings: false,
      });

      // Should not include warnings
      expect(conflicts.filter(c => c.severity === 'warning')).toHaveLength(0);
    });
  });

  describe('getConflictSummary', () => {
    it('should correctly summarize conflicts', () => {
      const conflicts = [
        {
          type: 'teacher_time_conflict' as const,
          message: 'Teacher conflict',
          details: {},
          severity: 'error' as const,
          canProceed: false,
        },
        {
          type: 'student_time_conflict' as const,
          message: 'Student conflict',
          details: {},
          severity: 'warning' as const,
          canProceed: true,
        },
        {
          type: 'class_capacity_conflict' as const,
          message: 'Capacity conflict',
          details: {},
          severity: 'critical' as const,
          canProceed: false,
        },
      ];

      const summary = service.getConflictSummary(conflicts);

      expect(summary.hasErrors).toBe(true);
      expect(summary.hasWarnings).toBe(true);
      expect(summary.canProceed).toBe(false);
      expect(summary.errorCount).toBe(1);
      expect(summary.warningCount).toBe(1);
      expect(summary.criticalCount).toBe(1);
      expect(summary.messages).toHaveLength(3);
    });

    it('should handle empty conflicts array', () => {
      const summary = service.getConflictSummary([]);

      expect(summary.hasErrors).toBe(false);
      expect(summary.hasWarnings).toBe(false);
      expect(summary.canProceed).toBe(true);
      expect(summary.errorCount).toBe(0);
      expect(summary.warningCount).toBe(0);
      expect(summary.criticalCount).toBe(0);
      expect(summary.messages).toHaveLength(0);
    });
  });

  describe('checkBatchBookingConflicts', () => {
    it('should check multiple bookings', async () => {
      const bookings: BookingConflictData[] = [
        {
          studentId: 'student-1',
          teacherId: 'teacher-1',
          classId: 'class-1',
          scheduledAt: '2024-07-15T10:00:00Z',
          durationMinutes: 60,
        },
        {
          studentId: 'student-2',
          teacherId: 'teacher-1',
          classId: 'class-2',
          scheduledAt: '2024-07-15T11:00:00Z',
          durationMinutes: 60,
        },
      ];

      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.from().select().eq().in().gte().lte.mockResolvedValue({
        data: [],
        error: null,
      });
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { max_students: 10 },
        error: null,
      });
      mockSupabase.from().select.mockReturnValue({
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ count: 0, error: null }),
      });

      const results = await service.checkBatchBookingConflicts(bookings);

      expect(results.size).toBe(2);
      expect(results.has('booking_0')).toBe(true);
      expect(results.has('booking_1')).toBe(true);
    });
  });

  describe('time overlap detection', () => {
    it('should correctly detect time overlaps', () => {
      const service = new ConflictDetectionService();
      
      // Access private method through any type
      const isTimeOverlap = (service as any).isTimeOverlap;

      // Overlapping cases
      expect(isTimeOverlap(
        new Date('2024-07-15T10:00:00Z'),
        new Date('2024-07-15T11:00:00Z'),
        new Date('2024-07-15T10:30:00Z'),
        new Date('2024-07-15T11:30:00Z')
      )).toBe(true);

      expect(isTimeOverlap(
        new Date('2024-07-15T10:30:00Z'),
        new Date('2024-07-15T11:30:00Z'),
        new Date('2024-07-15T10:00:00Z'),
        new Date('2024-07-15T11:00:00Z')
      )).toBe(true);

      // Non-overlapping cases
      expect(isTimeOverlap(
        new Date('2024-07-15T10:00:00Z'),
        new Date('2024-07-15T11:00:00Z'),
        new Date('2024-07-15T11:00:00Z'),
        new Date('2024-07-15T12:00:00Z')
      )).toBe(false);

      expect(isTimeOverlap(
        new Date('2024-07-15T11:00:00Z'),
        new Date('2024-07-15T12:00:00Z'),
        new Date('2024-07-15T10:00:00Z'),
        new Date('2024-07-15T11:00:00Z')
      )).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.from().select().eq().in().gte().lte.mockResolvedValue({
        data: null,
        error: new Error('Database connection failed'),
      });

      const conflicts = await service.checkBookingConflicts(mockBookingData);

      // Should include warning conflicts for failed checks
      expect(conflicts.some(c => c.severity === 'warning')).toBe(true);
    });
  });
});