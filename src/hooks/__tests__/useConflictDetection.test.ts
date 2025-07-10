import { renderHook, act, waitFor } from '@testing-library/react';
import { useConflictDetection, useBatchConflictDetection } from '../useConflictDetection';
import { conflictDetectionService } from '@/lib/services/conflict-detection-service';
import { duplicatePreventionService } from '@/lib/services/duplicate-prevention-service';

// Mock the services
jest.mock('@/lib/services/conflict-detection-service');
jest.mock('@/lib/services/duplicate-prevention-service');

const mockConflictDetectionService = conflictDetectionService as jest.Mocked<typeof conflictDetectionService>;
const mockDuplicatePreventionService = duplicatePreventionService as jest.Mocked<typeof duplicatePreventionService>;

describe('useConflictDetection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockConflictDetectionService.checkBookingConflicts.mockResolvedValue([]);
    mockConflictDetectionService.getConflictSummary.mockReturnValue({
      hasErrors: false,
      hasWarnings: false,
      canProceed: true,
      errorCount: 0,
      warningCount: 0,
      criticalCount: 0,
      messages: [],
    });

    mockDuplicatePreventionService.checkBookingDuplicates.mockResolvedValue([]);
    mockDuplicatePreventionService.checkEnrollmentDuplicates.mockResolvedValue([]);
    mockDuplicatePreventionService.checkClassCreationDuplicates.mockResolvedValue([]);
    mockDuplicatePreventionService.getDuplicateSummary.mockReturnValue({
      hasErrors: false,
      hasWarnings: false,
      canProceed: true,
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
      messages: [],
      suggestedActions: [],
    });
  });

  describe('initialization', () => {
    it('should initialize with empty state', () => {
      const { result } = renderHook(() => useConflictDetection());

      expect(result.current.isChecking).toBe(false);
      expect(result.current.conflicts).toEqual([]);
      expect(result.current.duplicates).toEqual([]);
      expect(result.current.hasErrors).toBe(false);
      expect(result.current.hasWarnings).toBe(false);
      expect(result.current.canProceed).toBe(true);
      expect(result.current.summary.errorCount).toBe(0);
    });
  });

  describe('checkBookingConflicts', () => {
    it('should check booking conflicts and update state', async () => {
      const mockConflicts = [
        {
          type: 'teacher_time_conflict' as const,
          message: 'Teacher conflict',
          details: {},
          severity: 'error' as const,
          canProceed: false,
        },
      ];

      const mockDuplicates = [
        {
          type: 'duplicate_booking' as const,
          message: 'Duplicate booking',
          details: {},
          severity: 'warning' as const,
          canProceed: true,
        },
      ];

      mockConflictDetectionService.checkBookingConflicts.mockResolvedValue(mockConflicts);
      mockDuplicatePreventionService.checkBookingDuplicates.mockResolvedValue(mockDuplicates);
      
      mockConflictDetectionService.getConflictSummary.mockReturnValue({
        hasErrors: true,
        hasWarnings: false,
        canProceed: false,
        errorCount: 1,
        warningCount: 0,
        criticalCount: 0,
        messages: ['Teacher conflict'],
      });

      mockDuplicatePreventionService.getDuplicateSummary.mockReturnValue({
        hasErrors: false,
        hasWarnings: true,
        canProceed: true,
        errorCount: 0,
        warningCount: 1,
        infoCount: 0,
        messages: ['Duplicate booking'],
        suggestedActions: [],
      });

      const { result } = renderHook(() => useConflictDetection());

      const bookingData = {
        studentId: 'student-1',
        teacherId: 'teacher-1',
        classId: 'class-1',
        scheduledAt: '2024-07-15T10:00:00Z',
        durationMinutes: 60,
      };

      await act(async () => {
        const response = await result.current.checkBookingConflicts(bookingData);
        expect(response.conflicts).toEqual(mockConflicts);
        expect(response.duplicates).toEqual(mockDuplicates);
      });

      await waitFor(() => {
        expect(result.current.isChecking).toBe(false);
        expect(result.current.conflicts).toEqual(mockConflicts);
        expect(result.current.duplicates).toEqual(mockDuplicates);
        expect(result.current.hasErrors).toBe(true);
        expect(result.current.hasWarnings).toBe(true);
        expect(result.current.canProceed).toBe(false);
        expect(result.current.summary.errorCount).toBe(1);
        expect(result.current.summary.warningCount).toBe(1);
      });
    });

    it('should handle errors during conflict checking', async () => {
      const error = new Error('API Error');
      mockConflictDetectionService.checkBookingConflicts.mockRejectedValue(error);

      const { result } = renderHook(() => useConflictDetection());

      const bookingData = {
        studentId: 'student-1',
        teacherId: 'teacher-1',
        classId: 'class-1',
        scheduledAt: '2024-07-15T10:00:00Z',
        durationMinutes: 60,
      };

      await act(async () => {
        await expect(result.current.checkBookingConflicts(bookingData)).rejects.toThrow('API Error');
      });

      expect(result.current.isChecking).toBe(false);
    });
  });

  describe('checkEnrollmentConflicts', () => {
    it('should check enrollment duplicates', async () => {
      const mockDuplicates = [
        {
          type: 'duplicate_enrollment' as const,
          message: 'Already enrolled',
          details: {},
          severity: 'error' as const,
          canProceed: false,
        },
      ];

      mockDuplicatePreventionService.checkEnrollmentDuplicates.mockResolvedValue(mockDuplicates);
      mockDuplicatePreventionService.getDuplicateSummary.mockReturnValue({
        hasErrors: true,
        hasWarnings: false,
        canProceed: false,
        errorCount: 1,
        warningCount: 0,
        infoCount: 0,
        messages: ['Already enrolled'],
        suggestedActions: [],
      });

      const { result } = renderHook(() => useConflictDetection());

      const enrollmentData = {
        studentId: 'student-1',
        classId: 'class-1',
      };

      await act(async () => {
        const response = await result.current.checkEnrollmentConflicts(enrollmentData);
        expect(response.conflicts).toEqual([]);
        expect(response.duplicates).toEqual(mockDuplicates);
      });

      await waitFor(() => {
        expect(result.current.duplicates).toEqual(mockDuplicates);
        expect(result.current.hasErrors).toBe(true);
        expect(result.current.canProceed).toBe(false);
      });
    });
  });

  describe('checkClassConflicts', () => {
    it('should check class creation conflicts and duplicates', async () => {
      const mockConflicts = [
        {
          type: 'schedule_overlap' as const,
          message: 'Schedule overlap',
          details: {},
          severity: 'error' as const,
          canProceed: false,
        },
      ];

      const mockDuplicates = [
        {
          type: 'duplicate_class_content' as const,
          message: 'Similar class exists',
          details: {},
          severity: 'warning' as const,
          canProceed: true,
        },
      ];

      mockConflictDetectionService.checkClassCreationConflicts.mockResolvedValue(mockConflicts);
      mockDuplicatePreventionService.checkClassCreationDuplicates.mockResolvedValue(mockDuplicates);

      mockConflictDetectionService.getConflictSummary.mockReturnValue({
        hasErrors: true,
        hasWarnings: false,
        canProceed: false,
        errorCount: 1,
        warningCount: 0,
        criticalCount: 0,
        messages: ['Schedule overlap'],
      });

      mockDuplicatePreventionService.getDuplicateSummary.mockReturnValue({
        hasErrors: false,
        hasWarnings: true,
        canProceed: true,
        errorCount: 0,
        warningCount: 1,
        infoCount: 0,
        messages: ['Similar class exists'],
        suggestedActions: [],
      });

      const { result } = renderHook(() => useConflictDetection());

      const classData = {
        teacherId: 'teacher-1',
        title: 'Test Class',
        type: 'group' as const,
        level: 'beginner' as const,
        scheduledAt: '2024-07-15T10:00:00Z',
        durationMinutes: 60,
      };

      await act(async () => {
        const response = await result.current.checkClassConflicts(classData);
        expect(response.conflicts).toEqual(mockConflicts);
        expect(response.duplicates).toEqual(mockDuplicates);
      });

      await waitFor(() => {
        expect(result.current.conflicts).toEqual(mockConflicts);
        expect(result.current.duplicates).toEqual(mockDuplicates);
        expect(result.current.hasErrors).toBe(true);
        expect(result.current.hasWarnings).toBe(true);
        expect(result.current.canProceed).toBe(false);
      });
    });
  });

  describe('debouncedBookingCheck', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should debounce multiple calls', async () => {
      const { result } = renderHook(() => useConflictDetection({ debounceMs: 500 }));

      const bookingData = {
        studentId: 'student-1',
        teacherId: 'teacher-1',
        classId: 'class-1',
        scheduledAt: '2024-07-15T10:00:00Z',
        durationMinutes: 60,
      };

      // Make multiple calls quickly
      act(() => {
        result.current.debouncedBookingCheck(bookingData);
        result.current.debouncedBookingCheck(bookingData);
        result.current.debouncedBookingCheck(bookingData);
      });

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Should only call the service once
      expect(mockConflictDetectionService.checkBookingConflicts).toHaveBeenCalledTimes(1);
    });

    it('should not auto-check when autoCheck is false', () => {
      const { result } = renderHook(() => useConflictDetection({ autoCheck: false }));

      const bookingData = {
        studentId: 'student-1',
        teacherId: 'teacher-1',
        classId: 'class-1',
        scheduledAt: '2024-07-15T10:00:00Z',
        durationMinutes: 60,
      };

      act(() => {
        result.current.debouncedBookingCheck(bookingData);
      });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(mockConflictDetectionService.checkBookingConflicts).not.toHaveBeenCalled();
    });
  });

  describe('clearConflicts', () => {
    it('should clear all conflicts and duplicates', async () => {
      const { result } = renderHook(() => useConflictDetection());

      // First set some conflicts
      const mockConflicts = [
        {
          type: 'teacher_time_conflict' as const,
          message: 'Teacher conflict',
          details: {},
          severity: 'error' as const,
          canProceed: false,
        },
      ];

      mockConflictDetectionService.checkBookingConflicts.mockResolvedValue(mockConflicts);
      mockConflictDetectionService.getConflictSummary.mockReturnValue({
        hasErrors: true,
        hasWarnings: false,
        canProceed: false,
        errorCount: 1,
        warningCount: 0,
        criticalCount: 0,
        messages: ['Teacher conflict'],
      });

      await act(async () => {
        await result.current.checkBookingConflicts({
          studentId: 'student-1',
          teacherId: 'teacher-1',
          classId: 'class-1',
          scheduledAt: '2024-07-15T10:00:00Z',
          durationMinutes: 60,
        });
      });

      // Clear conflicts
      act(() => {
        result.current.clearConflicts();
      });

      expect(result.current.conflicts).toEqual([]);
      expect(result.current.duplicates).toEqual([]);
      expect(result.current.hasErrors).toBe(false);
      expect(result.current.hasWarnings).toBe(false);
      expect(result.current.canProceed).toBe(true);
      expect(result.current.summary.errorCount).toBe(0);
    });
  });

  describe('helper functions', () => {
    it('should filter conflicts by type', async () => {
      const mockConflicts = [
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
      ];

      mockConflictDetectionService.checkBookingConflicts.mockResolvedValue(mockConflicts);
      mockConflictDetectionService.getConflictSummary.mockReturnValue({
        hasErrors: true,
        hasWarnings: true,
        canProceed: false,
        errorCount: 1,
        warningCount: 1,
        criticalCount: 0,
        messages: ['Teacher conflict', 'Student conflict'],
      });

      const { result } = renderHook(() => useConflictDetection());

      await act(async () => {
        await result.current.checkBookingConflicts({
          studentId: 'student-1',
          teacherId: 'teacher-1',
          classId: 'class-1',
          scheduledAt: '2024-07-15T10:00:00Z',
          durationMinutes: 60,
        });
      });

      const teacherConflicts = result.current.getConflictsByType('teacher_time_conflict');
      expect(teacherConflicts).toHaveLength(1);
      expect(teacherConflicts[0].type).toBe('teacher_time_conflict');

      const studentConflicts = result.current.getConflictsByType('student_time_conflict');
      expect(studentConflicts).toHaveLength(1);
      expect(studentConflicts[0].type).toBe('student_time_conflict');
    });

    it('should get all errors and warnings', async () => {
      const mockConflicts = [
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
      ];

      const mockDuplicates = [
        {
          type: 'duplicate_booking' as const,
          message: 'Duplicate booking',
          details: {},
          severity: 'error' as const,
          canProceed: false,
        },
      ];

      mockConflictDetectionService.checkBookingConflicts.mockResolvedValue(mockConflicts);
      mockDuplicatePreventionService.checkBookingDuplicates.mockResolvedValue(mockDuplicates);

      mockConflictDetectionService.getConflictSummary.mockReturnValue({
        hasErrors: true,
        hasWarnings: true,
        canProceed: false,
        errorCount: 1,
        warningCount: 1,
        criticalCount: 0,
        messages: ['Teacher conflict', 'Student conflict'],
      });

      mockDuplicatePreventionService.getDuplicateSummary.mockReturnValue({
        hasErrors: true,
        hasWarnings: false,
        canProceed: false,
        errorCount: 1,
        warningCount: 0,
        infoCount: 0,
        messages: ['Duplicate booking'],
        suggestedActions: [],
      });

      const { result } = renderHook(() => useConflictDetection());

      await act(async () => {
        await result.current.checkBookingConflicts({
          studentId: 'student-1',
          teacherId: 'teacher-1',
          classId: 'class-1',
          scheduledAt: '2024-07-15T10:00:00Z',
          durationMinutes: 60,
        });
      });

      const allErrors = result.current.getAllErrors;
      expect(allErrors).toHaveLength(2); // 1 conflict error + 1 duplicate error

      const allWarnings = result.current.getAllWarnings;
      expect(allWarnings).toHaveLength(1); // 1 conflict warning
    });

    it('should get suggested alternatives', async () => {
      const mockConflicts = [
        {
          type: 'teacher_time_conflict' as const,
          message: 'Teacher conflict',
          details: {
            suggestedAlternatives: ['2024-07-15T11:00:00Z', '2024-07-15T14:00:00Z'],
          },
          severity: 'error' as const,
          canProceed: false,
        },
      ];

      mockConflictDetectionService.checkBookingConflicts.mockResolvedValue(mockConflicts);
      mockConflictDetectionService.getConflictSummary.mockReturnValue({
        hasErrors: true,
        hasWarnings: false,
        canProceed: false,
        errorCount: 1,
        warningCount: 0,
        criticalCount: 0,
        messages: ['Teacher conflict'],
      });

      const { result } = renderHook(() => useConflictDetection());

      await act(async () => {
        await result.current.checkBookingConflicts({
          studentId: 'student-1',
          teacherId: 'teacher-1',
          classId: 'class-1',
          scheduledAt: '2024-07-15T10:00:00Z',
          durationMinutes: 60,
        });
      });

      const alternatives = result.current.getSuggestedAlternatives;
      expect(alternatives).toEqual(['2024-07-15T11:00:00Z', '2024-07-15T14:00:00Z']);
    });
  });

  describe('callbacks', () => {
    it('should call onConflictsDetected callback', async () => {
      const onConflictsDetected = jest.fn();
      const onErrorsChanged = jest.fn();

      const mockConflicts = [
        {
          type: 'teacher_time_conflict' as const,
          message: 'Teacher conflict',
          details: {},
          severity: 'error' as const,
          canProceed: false,
        },
      ];

      mockConflictDetectionService.checkBookingConflicts.mockResolvedValue(mockConflicts);
      mockConflictDetectionService.getConflictSummary.mockReturnValue({
        hasErrors: true,
        hasWarnings: false,
        canProceed: false,
        errorCount: 1,
        warningCount: 0,
        criticalCount: 0,
        messages: ['Teacher conflict'],
      });

      const { result } = renderHook(() => 
        useConflictDetection({ onConflictsDetected, onErrorsChanged })
      );

      await act(async () => {
        await result.current.checkBookingConflicts({
          studentId: 'student-1',
          teacherId: 'teacher-1',
          classId: 'class-1',
          scheduledAt: '2024-07-15T10:00:00Z',
          durationMinutes: 60,
        });
      });

      expect(onConflictsDetected).toHaveBeenCalledWith(mockConflicts, []);
      expect(onErrorsChanged).toHaveBeenCalledWith(true);
    });
  });
});

describe('useBatchConflictDetection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockConflictDetectionService.checkBatchBookingConflicts.mockResolvedValue(new Map());
    mockDuplicatePreventionService.checkBookingDuplicates.mockResolvedValue([]);
  });

  it('should check batch bookings', async () => {
    const mockResults = new Map([
      ['booking_0', []],
      ['booking_1', []],
    ]);

    mockConflictDetectionService.checkBatchBookingConflicts.mockResolvedValue(mockResults);

    const { result } = renderHook(() => useBatchConflictDetection());

    const bookings = [
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
        durationMinutes: 45,
      },
    ];

    await act(async () => {
      const batchResults = await result.current.checkBatchBookings(bookings);
      expect(batchResults.size).toBe(2);
    });

    expect(result.current.isChecking).toBe(false);
    expect(result.current.results.size).toBe(2);
  });

  it('should clear batch results', () => {
    const { result } = renderHook(() => useBatchConflictDetection());

    act(() => {
      result.current.clearBatchResults();
    });

    expect(result.current.results.size).toBe(0);
  });
});