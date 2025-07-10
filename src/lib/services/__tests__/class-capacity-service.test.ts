import { classCapacityService, ClassCapacityService } from '../class-capacity-service';
import { supabase } from '@/lib/supabase';
import { 
  CLASS_CAPACITY, 
  COURSE_TYPE_CAPACITY, 
  ENROLLMENT_STATUS 
} from '@/lib/constants';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('ClassCapacityService', () => {
  let service: ClassCapacityService;

  beforeEach(() => {
    service = new ClassCapacityService();
    jest.clearAllMocks();
  });

  describe('getClassCapacity', () => {
    it('should return class capacity information', async () => {
      const mockClass = {
        id: 'class-1',
        type: 'group',
        max_students: 9,
        title: 'Test Class',
        metadata: {},
      };

      const mockEnrollments = [
        { status: ENROLLMENT_STATUS.ENROLLED },
        { status: ENROLLMENT_STATUS.ENROLLED },
        { status: ENROLLMENT_STATUS.ENROLLED },
        { status: ENROLLMENT_STATUS.WAITLISTED },
      ];

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockClass,
              error: null,
            }),
          }),
        }),
      } as any);

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              data: mockEnrollments,
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await service.getClassCapacity('class-1');

      expect(result).toEqual({
        class_id: 'class-1',
        current_enrolled: 3,
        max_capacity: 9,
        waiting_list_count: 1,
        available_spots: 6,
        is_full: false,
        can_accept_waitlist: true,
        course_type: 'group',
        capacity_utilization: 33,
      });
    });

    it('should handle full class scenario', async () => {
      const mockClass = {
        id: 'class-2',
        type: 'group',
        max_students: 9,
        title: 'Full Class',
        metadata: {},
      };

      const mockEnrollments = Array(9).fill({ status: ENROLLMENT_STATUS.ENROLLED });

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockClass,
              error: null,
            }),
          }),
        }),
      } as any);

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              data: mockEnrollments,
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await service.getClassCapacity('class-2');

      expect(result).toEqual({
        class_id: 'class-2',
        current_enrolled: 9,
        max_capacity: 9,
        waiting_list_count: 0,
        available_spots: 0,
        is_full: true,
        can_accept_waitlist: true,
        course_type: 'group',
        capacity_utilization: 100,
      });
    });

    it('should return null for non-existent class', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: new Error('Not found'),
            }),
          }),
        }),
      } as any);

      const result = await service.getClassCapacity('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('enrollStudent', () => {
    it('should enroll student directly when space available', async () => {
      const mockCapacity = {
        class_id: 'class-1',
        current_enrolled: 3,
        max_capacity: 9,
        waiting_list_count: 0,
        available_spots: 6,
        is_full: false,
        can_accept_waitlist: true,
        course_type: 'group',
        capacity_utilization: 33,
      };

      const mockEnrollment = {
        id: 'enrollment-1',
        class_id: 'class-1',
        student_id: 'student-1',
        status: ENROLLMENT_STATUS.ENROLLED,
        enrolled_at: new Date().toISOString(),
      };

      // Mock getClassCapacity
      jest.spyOn(service, 'getClassCapacity').mockResolvedValue(mockCapacity);

      // Mock existing enrollment check
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      } as any);

      // Mock enrollment insertion
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockEnrollment,
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await service.enrollStudent('class-1', 'student-1');

      expect(result.success).toBe(true);
      expect(result.enrollment).toEqual(mockEnrollment);
      expect(result.waitlisted).toBeUndefined();
    });

    it('should add student to waiting list when class is full', async () => {
      const mockCapacity = {
        class_id: 'class-1',
        current_enrolled: 9,
        max_capacity: 9,
        waiting_list_count: 2,
        available_spots: 0,
        is_full: true,
        can_accept_waitlist: true,
        course_type: 'group',
        capacity_utilization: 100,
      };

      const mockEnrollment = {
        id: 'enrollment-2',
        class_id: 'class-1',
        student_id: 'student-2',
        status: ENROLLMENT_STATUS.WAITLISTED,
        waitlisted_at: new Date().toISOString(),
        position_in_waitlist: 3,
      };

      // Mock getClassCapacity
      jest.spyOn(service, 'getClassCapacity').mockResolvedValue(mockCapacity);

      // Mock existing enrollment check
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      } as any);

      // Mock waitlist insertion
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockEnrollment,
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await service.enrollStudent('class-1', 'student-2');

      expect(result.success).toBe(true);
      expect(result.enrollment).toEqual(mockEnrollment);
      expect(result.waitlisted).toBe(true);
      expect(result.position).toBe(3);
    });

    it('should reject enrollment when student already enrolled', async () => {
      const mockCapacity = {
        class_id: 'class-1',
        current_enrolled: 3,
        max_capacity: 9,
        waiting_list_count: 0,
        available_spots: 6,
        is_full: false,
        can_accept_waitlist: true,
        course_type: 'group',
        capacity_utilization: 33,
      };

      const existingEnrollment = {
        id: 'enrollment-existing',
        class_id: 'class-1',
        student_id: 'student-1',
        status: ENROLLMENT_STATUS.ENROLLED,
      };

      // Mock getClassCapacity
      jest.spyOn(service, 'getClassCapacity').mockResolvedValue(mockCapacity);

      // Mock existing enrollment check
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: existingEnrollment,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      } as any);

      const result = await service.enrollStudent('class-1', 'student-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Student already enrolled');
    });
  });

  describe('dropStudent', () => {
    it('should drop student and promote from waitlist', async () => {
      // Mock drop operation
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              error: null,
            }),
          }),
        }),
      } as any);

      // Mock promoteFromWaitlist
      jest.spyOn(service, 'promoteFromWaitlist').mockResolvedValue(true);

      const result = await service.dropStudent('class-1', 'student-1');

      expect(result.success).toBe(true);
      expect(result.promoted_from_waitlist).toBe(true);
    });

    it('should handle drop failure', async () => {
      // Mock drop operation failure
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              error: new Error('Drop failed'),
            }),
          }),
        }),
      } as any);

      const result = await service.dropStudent('class-1', 'student-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Drop failed');
    });
  });

  describe('promoteFromWaitlist', () => {
    it('should promote next student from waitlist', async () => {
      const mockCapacity = {
        class_id: 'class-1',
        current_enrolled: 8,
        max_capacity: 9,
        waiting_list_count: 2,
        available_spots: 1,
        is_full: false,
        can_accept_waitlist: true,
        course_type: 'group',
        capacity_utilization: 89,
      };

      const mockNextStudent = {
        id: 'enrollment-waitlist-1',
        class_id: 'class-1',
        student_id: 'student-waitlist-1',
        status: ENROLLMENT_STATUS.WAITLISTED,
        position_in_waitlist: 1,
      };

      // Mock getClassCapacity
      jest.spyOn(service, 'getClassCapacity').mockResolvedValue(mockCapacity);

      // Mock next student query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockNextStudent,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      } as any);

      // Mock promotion update
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      } as any);

      // Mock updateWaitlistPositions
      jest.spyOn(service as any, 'updateWaitlistPositions').mockResolvedValue(undefined);

      const result = await service.promoteFromWaitlist('class-1');

      expect(result).toBe(true);
    });

    it('should return false when no spots available', async () => {
      const mockCapacity = {
        class_id: 'class-1',
        current_enrolled: 9,
        max_capacity: 9,
        waiting_list_count: 2,
        available_spots: 0,
        is_full: true,
        can_accept_waitlist: true,
        course_type: 'group',
        capacity_utilization: 100,
      };

      // Mock getClassCapacity
      jest.spyOn(service, 'getClassCapacity').mockResolvedValue(mockCapacity);

      const result = await service.promoteFromWaitlist('class-1');

      expect(result).toBe(false);
    });
  });

  describe('validateClassCapacity', () => {
    it('should validate capacity for Basic course type', () => {
      const result = service.validateClassCapacity('Basic', 6);
      expect(result.valid).toBe(true);
    });

    it('should reject capacity below minimum', () => {
      const result = service.validateClassCapacity('Basic', 2);
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Minimum capacity for Basic is 3');
      expect(result.recommended_capacity).toBe(3);
    });

    it('should reject capacity above maximum', () => {
      const result = service.validateClassCapacity('Basic', 15);
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Maximum capacity for Basic is 9');
      expect(result.recommended_capacity).toBe(9);
    });

    it('should handle 1-on-1 course type', () => {
      const result = service.validateClassCapacity('1-on-1', 1);
      expect(result.valid).toBe(true);
    });

    it('should reject multiple students for 1-on-1', () => {
      const result = service.validateClassCapacity('1-on-1', 2);
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Maximum capacity for 1-on-1 is 1');
      expect(result.recommended_capacity).toBe(1);
    });

    it('should handle unknown course type', () => {
      const result = service.validateClassCapacity('Unknown', 5);
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Unknown course type');
      expect(result.recommended_capacity).toBe(CLASS_CAPACITY.GROUP_OPTIMAL);
    });
  });

  describe('createOverflowClass', () => {
    it('should create overflow class successfully', async () => {
      const mockOriginalClass = {
        id: 'class-1',
        title: 'Original Class',
        description: 'Original description',
        type: 'group',
        level: 'intermediate',
        duration_minutes: 60,
        max_students: 9,
        price_per_student: 50,
        currency: 'USD',
        teacher_id: 'teacher-1',
        is_active: true,
        metadata: {},
      };

      const mockNewClass = {
        id: 'class-overflow-1',
        title: 'Original Class (Overflow)',
        description: 'Original description',
        type: 'group',
        level: 'intermediate',
        duration_minutes: 60,
        max_students: 9,
        price_per_student: 50,
        currency: 'USD',
        teacher_id: 'teacher-1',
        is_active: true,
        metadata: {
          overflow_from: 'class-1',
          created_reason: 'capacity_overflow',
        },
      };

      // Mock original class query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockOriginalClass,
              error: null,
            }),
          }),
        }),
      } as any);

      // Mock new class creation
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockNewClass,
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await service.createOverflowClass('class-1');

      expect(result.success).toBe(true);
      expect(result.new_class_id).toBe('class-overflow-1');
    });

    it('should handle original class not found', async () => {
      // Mock original class query failure
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: new Error('Not found'),
            }),
          }),
        }),
      } as any);

      const result = await service.createOverflowClass('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Original class not found');
    });
  });

  describe('getEnrollmentStats', () => {
    it('should calculate enrollment statistics correctly', async () => {
      const mockEnrollments = [
        { status: ENROLLMENT_STATUS.ENROLLED },
        { status: ENROLLMENT_STATUS.ENROLLED },
        { status: ENROLLMENT_STATUS.ENROLLED },
        { status: ENROLLMENT_STATUS.WAITLISTED },
        { status: ENROLLMENT_STATUS.DROPPED },
        { status: ENROLLMENT_STATUS.COMPLETED },
      ];

      const mockCapacity = {
        class_id: 'class-1',
        current_enrolled: 3,
        max_capacity: 9,
        waiting_list_count: 1,
        available_spots: 6,
        is_full: false,
        can_accept_waitlist: true,
        course_type: 'group',
        capacity_utilization: 33,
      };

      // Mock enrollments query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: mockEnrollments,
            error: null,
          }),
        }),
      } as any);

      // Mock getClassCapacity
      jest.spyOn(service, 'getClassCapacity').mockResolvedValue(mockCapacity);

      const result = await service.getEnrollmentStats('class-1');

      expect(result).toEqual({
        total_enrolled: 3,
        total_waitlisted: 1,
        total_dropped: 1,
        total_completed: 1,
        capacity_utilization: 33,
        waitlist_conversion_rate: 75, // 3 enrolled out of 4 total (3 enrolled + 1 waitlisted)
      });
    });
  });
});