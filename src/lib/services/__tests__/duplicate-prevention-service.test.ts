import { duplicatePreventionService, DuplicatePreventionService, EnrollmentDuplicateData, BookingDuplicateData, ClassDuplicateData } from '../duplicate-prevention-service';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
    })),
  },
}));

describe('DuplicatePreventionService', () => {
  let service: DuplicatePreventionService;

  beforeEach(() => {
    service = new DuplicatePreventionService();
    jest.clearAllMocks();
  });

  describe('checkEnrollmentDuplicates', () => {
    const mockEnrollmentData: EnrollmentDuplicateData = {
      studentId: 'student-1',
      classId: 'class-1',
      courseId: 'course-1',
    };

    it('should detect no duplicates when no existing enrollment exists', async () => {
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.from().select().eq().in.mockResolvedValue({
        data: [],
        error: null,
      });

      const duplicates = await service.checkEnrollmentDuplicates(mockEnrollmentData);

      expect(duplicates).toHaveLength(0);
    });

    it('should detect duplicate enrollment in same class', async () => {
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.from().select().eq().in.mockResolvedValueOnce({
        data: [
          {
            id: 'existing-enrollment',
            status: 'confirmed',
            scheduled_at: '2024-07-15T10:00:00Z',
            class: {
              id: 'class-1',
              title: 'Test Class',
              type: 'group',
            },
          },
        ],
        error: null,
      });

      const duplicates = await service.checkEnrollmentDuplicates(mockEnrollmentData);

      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].type).toBe('duplicate_enrollment');
      expect(duplicates[0].message).toContain('already enrolled');
    });

    it('should check course-level duplicates when courseId provided', async () => {
      const mockSupabase = require('@/lib/supabase').supabase;
      
      // First call for class enrollment - empty
      mockSupabase.from().select().eq().in.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      // Second call for course enrollment - has duplicate
      mockSupabase.from().select().eq().mockResolvedValueOnce({
        data: [
          {
            student_id: 'student-1',
            course_id: 'course-1',
            enrollment_date: '2024-07-01',
            progress_percentage: 25,
          },
        ],
        error: null,
      });

      const duplicates = await service.checkEnrollmentDuplicates(mockEnrollmentData);

      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].type).toBe('duplicate_enrollment');
      expect(duplicates[0].message).toContain('already enrolled in this course');
    });

    it('should check similar class duplicates in strict mode', async () => {
      const mockSupabase = require('@/lib/supabase').supabase;
      
      // Mock class enrollment check - empty
      mockSupabase.from().select().eq().in.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      // Mock target class details
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: {
          id: 'class-1',
          title: 'Business English Conversation',
          type: 'group',
          level: 'intermediate',
          description: 'Learn business English',
        },
        error: null,
      });

      // Mock existing bookings with similar class
      mockSupabase.from().select().eq().in().neq.mockResolvedValueOnce({
        data: [
          {
            id: 'similar-booking',
            status: 'confirmed',
            class: {
              id: 'class-2',
              title: 'Business English Advanced',
              type: 'group',
              level: 'intermediate',
              description: 'Advanced business English',
            },
          },
        ],
        error: null,
      });

      const duplicates = await service.checkEnrollmentDuplicates(
        mockEnrollmentData,
        { strictMode: true }
      );

      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].type).toBe('duplicate_enrollment');
      expect(duplicates[0].message).toContain('similar class');
    });

    it('should allow duplicates when allowDuplicates is true', async () => {
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.from().select().eq().in.mockResolvedValue({
        data: [
          {
            id: 'existing-enrollment',
            status: 'confirmed',
            scheduled_at: '2024-07-15T10:00:00Z',
            class: { id: 'class-1', title: 'Test Class', type: 'group' },
          },
        ],
        error: null,
      });

      const duplicates = await service.checkEnrollmentDuplicates(
        mockEnrollmentData,
        { allowDuplicates: true }
      );

      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].severity).toBe('warning');
      expect(duplicates[0].canProceed).toBe(true);
    });

    it('should skip specified duplicate types', async () => {
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.from().select().eq().in.mockResolvedValue({
        data: [
          {
            id: 'existing-enrollment',
            status: 'confirmed',
            scheduled_at: '2024-07-15T10:00:00Z',
            class: { id: 'class-1', title: 'Test Class', type: 'group' },
          },
        ],
        error: null,
      });

      const duplicates = await service.checkEnrollmentDuplicates(
        mockEnrollmentData,
        { skipTypes: ['duplicate_enrollment'] }
      );

      expect(duplicates).toHaveLength(0);
    });
  });

  describe('checkBookingDuplicates', () => {
    const mockBookingData: BookingDuplicateData = {
      studentId: 'student-1',
      teacherId: 'teacher-1',
      classId: 'class-1',
      scheduledAt: '2024-07-15T10:00:00Z',
      durationMinutes: 60,
    };

    it('should detect exact duplicate booking', async () => {
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.from().select().eq().in.mockResolvedValueOnce({
        data: [
          {
            id: 'duplicate-booking',
            status: 'confirmed',
            scheduled_at: '2024-07-15T10:00:00Z',
            duration_minutes: 60,
          },
        ],
        error: null,
      });

      const duplicates = await service.checkBookingDuplicates(mockBookingData);

      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].type).toBe('duplicate_booking');
      expect(duplicates[0].severity).toBe('error');
      expect(duplicates[0].canProceed).toBe(false);
    });

    it('should detect near-duplicate bookings within time threshold', async () => {
      const mockSupabase = require('@/lib/supabase').supabase;
      
      // First call for exact duplicates - empty
      mockSupabase.from().select().eq().in.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      // Second call for near duplicates - has one within threshold
      mockSupabase.from().select().eq().gte().lte().in.mockResolvedValueOnce({
        data: [
          {
            id: 'near-duplicate',
            scheduled_at: '2024-07-15T10:30:00Z', // 30 minutes later
            duration_minutes: 45,
            class: { title: 'Similar Class' },
          },
        ],
        error: null,
      });

      const duplicates = await service.checkBookingDuplicates(mockBookingData);

      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].type).toBe('duplicate_booking');
      expect(duplicates[0].message).toContain('within');
      expect(duplicates[0].severity).toBe('warning');
    });

    it('should check recurring booking duplicates', async () => {
      const recurringData: BookingDuplicateData = {
        ...mockBookingData,
        recurringPattern: 'weekly',
      };

      const mockSupabase = require('@/lib/supabase').supabase;
      
      // Mock exact duplicate check - empty
      mockSupabase.from().select().eq().in.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      // Mock near duplicate check - empty
      mockSupabase.from().select().eq().gte().lte().in.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      // Mock recurring pattern check - has existing
      mockSupabase.from().select().eq().in.mockResolvedValueOnce({
        data: [
          {
            id: 'recurring-booking',
            recurring_pattern: 'weekly',
            scheduled_at: '2024-07-08T10:00:00Z',
            parent_booking_id: null,
          },
        ],
        error: null,
      });

      const duplicates = await service.checkBookingDuplicates(recurringData);

      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].type).toBe('duplicate_recurring_booking');
      expect(duplicates[0].severity).toBe('error');
    });
  });

  describe('checkClassCreationDuplicates', () => {
    const mockClassData: ClassDuplicateData = {
      teacherId: 'teacher-1',
      title: 'Advanced Business English',
      description: 'Advanced course for business professionals',
      type: 'group',
      level: 'advanced',
      scheduledAt: '2024-07-15T10:00:00Z',
      durationMinutes: 90,
    };

    it('should detect duplicate class title by same teacher', async () => {
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.from().select().eq().mockResolvedValueOnce({
        data: [
          {
            id: 'existing-class',
            title: 'Advanced Business English',
            description: 'Existing description',
            type: 'group',
            level: 'advanced',
            is_active: true,
          },
        ],
        error: null,
      });

      const duplicates = await service.checkClassCreationDuplicates(mockClassData);

      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].type).toBe('duplicate_class_content');
      expect(duplicates[0].message).toContain('identical title');
    });

    it('should detect similar class content in strict mode', async () => {
      const mockSupabase = require('@/lib/supabase').supabase;
      
      // Mock title duplicate check - empty
      mockSupabase.from().select().eq().mockResolvedValueOnce({
        data: [],
        error: null,
      });

      // Mock similar content check
      mockSupabase.from().select().eq().neq.mockResolvedValueOnce({
        data: [
          {
            id: 'similar-class',
            title: 'Business English Advanced Course',
            description: 'Course for business professionals',
            type: 'group',
            level: 'advanced',
          },
        ],
        error: null,
      });

      const duplicates = await service.checkClassCreationDuplicates(
        mockClassData,
        { strictMode: true }
      );

      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].type).toBe('duplicate_class_content');
      expect(duplicates[0].message).toContain('similar class');
    });

    it('should detect schedule time duplicates', async () => {
      const mockSupabase = require('@/lib/supabase').supabase;
      
      // Mock title and content checks - empty
      mockSupabase.from().select().eq().mockResolvedValueOnce({
        data: [],
        error: null,
      });

      // Mock schedule conflict check
      mockSupabase.from().select().eq().gte().lte().in.mockResolvedValueOnce({
        data: [
          {
            id: 'conflicting-booking',
            scheduled_at: '2024-07-15T10:30:00Z',
            duration_minutes: 60,
            class: { title: 'Conflicting Class' },
          },
        ],
        error: null,
      });

      const duplicates = await service.checkClassCreationDuplicates(mockClassData);

      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].type).toBe('duplicate_class_same_time');
      expect(duplicates[0].severity).toBe('error');
    });
  });

  describe('string similarity calculation', () => {
    it('should calculate correct similarity scores', () => {
      const service = new DuplicatePreventionService();
      
      // Access private method through any type
      const calculateSimilarity = (service as any).calculateStringSimilarity;

      // Identical strings
      expect(calculateSimilarity('hello', 'hello')).toBe(1);

      // Completely different strings
      expect(calculateSimilarity('hello', 'world')).toBeLessThan(0.5);

      // Similar strings
      expect(calculateSimilarity('business english', 'english business')).toBeGreaterThan(0.7);

      // Empty strings
      expect(calculateSimilarity('', '')).toBe(1);
      expect(calculateSimilarity('hello', '')).toBeLessThan(1);
    });
  });

  describe('getDuplicateSummary', () => {
    it('should correctly summarize duplicates', () => {
      const duplicates = [
        {
          type: 'duplicate_enrollment' as const,
          message: 'Enrollment duplicate',
          details: { suggestedAction: 'Choose different class' },
          severity: 'error' as const,
          canProceed: false,
        },
        {
          type: 'duplicate_booking' as const,
          message: 'Booking duplicate',
          details: { suggestedAction: 'Reschedule booking' },
          severity: 'warning' as const,
          canProceed: true,
        },
        {
          type: 'duplicate_class_content' as const,
          message: 'Content duplicate',
          details: {},
          severity: 'info' as const,
          canProceed: true,
        },
      ];

      const summary = service.getDuplicateSummary(duplicates);

      expect(summary.hasErrors).toBe(true);
      expect(summary.hasWarnings).toBe(true);
      expect(summary.canProceed).toBe(false); // One item can't proceed
      expect(summary.errorCount).toBe(1);
      expect(summary.warningCount).toBe(1);
      expect(summary.infoCount).toBe(1);
      expect(summary.messages).toHaveLength(3);
      expect(summary.suggestedActions).toHaveLength(2);
    });

    it('should handle empty duplicates array', () => {
      const summary = service.getDuplicateSummary([]);

      expect(summary.hasErrors).toBe(false);
      expect(summary.hasWarnings).toBe(false);
      expect(summary.canProceed).toBe(true);
      expect(summary.errorCount).toBe(0);
      expect(summary.warningCount).toBe(0);
      expect(summary.infoCount).toBe(0);
      expect(summary.messages).toHaveLength(0);
      expect(summary.suggestedActions).toHaveLength(0);
    });
  });

  describe('checkBatchDuplicates', () => {
    it('should check multiple items', async () => {
      const items = ['item1', 'item2', 'item3'];
      const mockCheckFunction = jest.fn().mockResolvedValue([]);

      const results = await service.checkBatchDuplicates(items, mockCheckFunction);

      expect(mockCheckFunction).toHaveBeenCalledTimes(3);
      expect(results.size).toBe(3);
      expect(results.has('item_0')).toBe(true);
      expect(results.has('item_1')).toBe(true);
      expect(results.has('item_2')).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.from().select().eq().in.mockResolvedValue({
        data: null,
        error: new Error('Database connection failed'),
      });

      const duplicates = await service.checkEnrollmentDuplicates({
        studentId: 'student-1',
        classId: 'class-1',
      });

      // Should not throw error, may return empty array or warning
      expect(duplicates).toBeDefined();
    });
  });
});