import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { supabase } from '@/lib/supabase';
import { 
  ContentSynchronizationService,
  ClassGroupSyncState,
  ContentSyncOperation,
  SyncConflict,
  ContentProgressAlignment
} from '../content-synchronization-service';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn()
    }))
  }
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('ContentSynchronizationService', () => {
  let service: ContentSynchronizationService;
  let mockFrom: jest.MockedFunction<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup Supabase mock
    mockFrom = jest.fn();
    mockSupabase.from.mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      upsert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis()
    } as any);
    
    mockSupabase.from.mockReturnValue(mockFrom);
    
    service = new ContentSynchronizationService({
      enabled: true,
      syncFrequency: 'real-time',
      maxBatchSize: 10,
      conflictResolution: 'merge'
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('registerClassGroup', () => {
    it('should successfully register a new class group', async () => {
      const groupData = {
        groupId: 'group-1',
        courseId: 'course-1',
        currentUnit: 1,
        currentLesson: 1,
        contentIds: ['content-1', 'content-2'],
        studentIds: ['student-1', 'student-2'],
        teacherId: 'teacher-1',
        isActive: true
      };

      // Mock successful database insertion
      mockFrom.single.mockResolvedValue({
        data: { ...groupData, lastSyncTimestamp: expect.any(String), syncVersion: 1 },
        error: null
      });

      const result = await service.registerClassGroup(groupData);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        ...groupData,
        syncVersion: 1
      });
      expect(mockSupabase.from).toHaveBeenCalledWith('class_group_sync_states');
    });

    it('should handle registration failure', async () => {
      const groupData = {
        groupId: 'group-1',
        courseId: 'course-1',
        currentUnit: 1,
        currentLesson: 1,
        contentIds: ['content-1'],
        studentIds: ['student-1'],
        teacherId: 'teacher-1',
        isActive: true
      };

      // Mock database error
      mockFrom.single.mockResolvedValue({
        data: null,
        error: new Error('Database error')
      });

      const result = await service.registerClassGroup(groupData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('REGISTRATION_FAILED');
    });

    it('should validate input data', async () => {
      const invalidGroupData = {
        groupId: 'invalid-uuid',
        courseId: '',
        currentUnit: 0,
        currentLesson: 0,
        contentIds: [],
        studentIds: [],
        teacherId: '',
        isActive: true
      };

      const result = await service.registerClassGroup(invalidGroupData as any);

      expect(result.success).toBe(false);
      expect(result.error?.category).toBe('validation');
    });
  });

  describe('synchronizeContent', () => {
    beforeEach(async () => {
      // Setup mock group state
      mockFrom.single.mockResolvedValue({
        data: {
          groupId: 'source-group',
          courseId: 'course-1',
          syncVersion: 1,
          isActive: true
        },
        error: null
      });
    });

    it('should synchronize content between groups successfully', async () => {
      // Mock related groups
      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            groupId: 'target-group',
            courseId: 'course-1',
            syncVersion: 1
          },
          error: null
        })
      }));

      const result = await service.synchronizeContent('source-group', 'content-1', ['target-group']);

      expect(result.success).toBe(true);
      expect(result.data).toBeInstanceOf(Array);
    });

    it('should handle source group not found', async () => {
      mockFrom.single.mockResolvedValue({
        data: null,
        error: null
      });

      const result = await service.synchronizeContent('non-existent-group', 'content-1');

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Source group non-existent-group not found');
    });

    it('should detect and handle sync conflicts', async () => {
      // Mock source group with higher version
      mockFrom.single
        .mockResolvedValueOnce({
          data: {
            groupId: 'source-group',
            courseId: 'course-1',
            syncVersion: 5,
            currentUnit: 3,
            currentLesson: 2
          },
          error: null
        })
        .mockResolvedValueOnce({
          data: {
            groupId: 'target-group',
            courseId: 'course-1',
            syncVersion: 2,
            currentUnit: 1,
            currentLesson: 1
          },
          error: null
        });

      const result = await service.synchronizeContent('source-group', 'content-1', ['target-group']);

      expect(result.success).toBe(true);
      // Should still proceed but with conflict handling
      expect(result.data).toBeInstanceOf(Array);
    });
  });

  describe('batchSynchronize', () => {
    it('should handle batch synchronization within limits', async () => {
      mockFrom.single.mockResolvedValue({
        data: {
          groupId: 'source-group',
          courseId: 'course-1',
          syncVersion: 1
        },
        error: null
      });

      const contentIds = ['content-1', 'content-2', 'content-3'];
      const result = await service.batchSynchronize('source-group', contentIds, ['target-group']);

      expect(result.success).toBe(true);
      expect(result.data).toBeInstanceOf(Array);
    });

    it('should reject batch sizes exceeding limits', async () => {
      const contentIds = Array.from({ length: 20 }, (_, i) => `content-${i + 1}`);
      
      const result = await service.batchSynchronize('source-group', contentIds, ['target-group']);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('exceeds maximum');
    });

    it('should process batches in chunks', async () => {
      // Mock service with smaller batch size
      const smallBatchService = new ContentSynchronizationService({
        maxBatchSize: 2
      });

      mockFrom.single.mockResolvedValue({
        data: {
          groupId: 'source-group',
          courseId: 'course-1',
          syncVersion: 1
        },
        error: null
      });

      const contentIds = ['content-1', 'content-2', 'content-3'];
      const result = await smallBatchService.batchSynchronize('source-group', contentIds, ['target-group']);

      expect(result.success).toBe(true);
      // Should process in multiple batches
    });
  });

  describe('alignStudentProgress', () => {
    it('should calculate progress alignment correctly', async () => {
      // Mock student progress
      mockFrom.single
        .mockResolvedValueOnce({
          data: {
            student_id: 'student-1',
            current_unit: 2,
            current_lesson: 3,
            progress_percentage: 45
          },
          error: null
        })
        .mockResolvedValueOnce({
          data: {
            groupId: 'target-group',
            currentUnit: 3,
            currentLesson: 1
          },
          error: null
        });

      const result = await service.alignStudentProgress('student-1', 'target-group');

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        groupId: 'target-group',
        expectedProgress: expect.any(Object),
        actualProgress: expect.any(Object),
        deviation: expect.any(Number),
        alignmentActions: expect.any(Array)
      });
    });

    it('should handle missing student progress', async () => {
      mockFrom.single.mockResolvedValue({
        data: null,
        error: null
      });

      const result = await service.alignStudentProgress('non-existent-student', 'target-group');

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Student progress not found');
    });

    it('should generate appropriate alignment actions', async () => {
      mockFrom.single
        .mockResolvedValueOnce({
          data: {
            student_id: 'student-1',
            current_unit: 1,
            current_lesson: 1,
            progress_percentage: 10
          },
          error: null
        })
        .mockResolvedValueOnce({
          data: {
            groupId: 'target-group',
            currentUnit: 3,
            currentLesson: 5
          },
          error: null
        });

      const result = await service.alignStudentProgress('student-1', 'target-group');

      expect(result.success).toBe(true);
      expect(result.data?.alignmentActions).toContain('Accelerate target group to unit 3');
    });
  });

  describe('createContentVersion', () => {
    it('should create content version successfully', async () => {
      // Mock content data
      mockFrom.single
        .mockResolvedValueOnce({
          data: {
            id: 'content-1',
            title: 'Test Content',
            content: 'Content body',
            excerpt: 'Test excerpt',
            version: 1
          },
          error: null
        })
        .mockResolvedValueOnce({
          data: {
            id: 'version-1',
            content_id: 'content-1',
            version: 2,
            created_at: expect.any(String)
          },
          error: null
        });

      const result = await service.createContentVersion('content-1', 'group-1', 'Updated content');

      expect(result.success).toBe(true);
      expect(result.data?.version).toBe(2);
      expect(mockSupabase.from).toHaveBeenCalledWith('content_versions');
    });

    it('should handle missing content', async () => {
      mockFrom.single.mockResolvedValue({
        data: null,
        error: null
      });

      const result = await service.createContentVersion('non-existent-content', 'group-1', 'Update');

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Content non-existent-content not found');
    });
  });

  describe('rollbackContent', () => {
    it('should rollback content to specified version', async () => {
      // Mock version data
      mockFrom.single
        .mockResolvedValueOnce({
          data: {
            id: 'version-1',
            content_id: 'content-1',
            title: 'Previous Title',
            content: 'Previous content',
            version: 1
          },
          error: null
        });

      const result = await service.rollbackContent('content-1', 1, ['group-1']);

      expect(result.success).toBe(true);
      expect(result.data).toBeInstanceOf(Array);
      expect(result.data?.[0]?.operationType).toBe('rollback');
    });

    it('should handle missing version', async () => {
      mockFrom.single.mockResolvedValue({
        data: null,
        error: null
      });

      const result = await service.rollbackContent('content-1', 999, ['group-1']);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Version 999 not found');
    });
  });

  describe('getSyncStatus', () => {
    it('should return accurate sync status', async () => {
      // Mock group state in cache
      const service = new ContentSynchronizationService();
      const mockGroupState: ClassGroupSyncState = {
        groupId: 'group-1',
        courseId: 'course-1',
        currentUnit: 1,
        currentLesson: 1,
        contentIds: ['content-1'],
        lastSyncTimestamp: '2024-01-15T10:00:00Z',
        syncVersion: 1,
        studentIds: ['student-1'],
        teacherId: 'teacher-1',
        isActive: true
      };

      // Access private property for testing
      (service as any).syncState.set('group-1', mockGroupState);

      const status = await service.getSyncStatus('group-1');

      expect(status.id).toBe('status_group-1');
      expect(status.status).toBe('completed');
      expect(status.progress).toBe(100);
    });
  });

  describe('statistics and monitoring', () => {
    it('should provide accurate statistics', () => {
      const service = new ContentSynchronizationService();
      
      // Add some mock operations
      const mockOperation: ContentSyncOperation = {
        id: 'op-1',
        operationType: 'sync',
        sourceGroupId: 'group-1',
        targetGroupIds: ['group-2'],
        contentId: 'content-1',
        version: 1,
        priority: 'medium',
        status: 'completed',
        scheduledAt: '2024-01-15T10:00:00Z',
        completedAt: '2024-01-15T10:05:00Z'
      };

      (service as any).activeOperations.set('op-1', mockOperation);

      const stats = service.getStatistics();

      expect(stats.totalGroups).toBe(0);
      expect(stats.completedSyncs).toBe(1);
      expect(stats.failedSyncs).toBe(0);
    });

    it('should track conflicts correctly', () => {
      const service = new ContentSynchronizationService();
      
      const mockConflict: SyncConflict = {
        id: 'conflict-1',
        conflictType: 'version_mismatch',
        sourceGroupId: 'group-1',
        targetGroupId: 'group-2',
        contentId: 'content-1',
        sourceVersion: 2,
        targetVersion: 1,
        severity: 'medium',
        description: 'Version mismatch detected',
        suggestedResolution: 'merge'
      };

      (service as any).conflictResolutions.set('conflict-1', mockConflict);

      const conflicts = service.getConflicts();
      const stats = service.getStatistics();

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].conflictType).toBe('version_mismatch');
      expect(stats.pendingConflicts).toBe(1);
    });
  });

  describe('event handling', () => {
    it('should register and remove event listeners', () => {
      const service = new ContentSynchronizationService();
      const mockListener = jest.fn();

      service.addEventListener('test_event', mockListener);
      
      // Trigger event
      (service as any).emitEvent('test_event', { data: 'test' });

      expect(mockListener).toHaveBeenCalledWith({ data: 'test' });

      // Remove listener
      service.removeEventListener('test_event', mockListener);
      
      // Trigger again
      (service as any).emitEvent('test_event', { data: 'test2' });

      // Should only have been called once
      expect(mockListener).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle network errors gracefully', async () => {
      mockFrom.single.mockRejectedValue(new Error('Network error'));

      const result = await service.synchronizeContent('source-group', 'content-1');

      expect(result.success).toBe(false);
      expect(result.error?.category).toBe('algorithm');
    });

    it('should handle malformed data', async () => {
      mockFrom.single.mockResolvedValue({
        data: { malformed: 'data' },
        error: null
      });

      const result = await service.synchronizeContent('source-group', 'content-1');

      expect(result.success).toBe(false);
    });

    it('should validate UUID formats', async () => {
      const invalidData = {
        groupId: 'not-a-uuid',
        courseId: 'also-not-a-uuid',
        currentUnit: 1,
        currentLesson: 1,
        contentIds: ['invalid-uuid'],
        studentIds: ['invalid-uuid'],
        teacherId: 'invalid-uuid',
        isActive: true
      };

      const result = await service.registerClassGroup(invalidData as any);

      expect(result.success).toBe(false);
      expect(result.error?.category).toBe('validation');
    });
  });
});

describe('ContentSynchronizationService Integration', () => {
  let service: ContentSynchronizationService;

  beforeEach(() => {
    service = new ContentSynchronizationService({
      enabled: true,
      syncFrequency: 'real-time',
      maxBatchSize: 50,
      conflictResolution: 'merge'
    });
  });

  it('should handle complex synchronization workflow', async () => {
    // This test would simulate a complete workflow from registration to sync
    // In a real test environment, this would use a test database
    
    const groupData = {
      groupId: 'integration-group-1',
      courseId: 'integration-course-1',
      currentUnit: 1,
      currentLesson: 1,
      contentIds: ['content-1', 'content-2'],
      studentIds: ['student-1', 'student-2'],
      teacherId: 'teacher-1',
      isActive: true
    };

    // Mock successful responses for the workflow
    mockFrom.single
      .mockResolvedValueOnce({ data: { ...groupData, syncVersion: 1 }, error: null })
      .mockResolvedValueOnce({ data: { ...groupData, groupId: 'integration-group-2', syncVersion: 1 }, error: null });

    // 1. Register groups
    const registrationResult = await service.registerClassGroup(groupData);
    expect(registrationResult.success).toBe(true);

    // 2. Perform synchronization
    const syncResult = await service.synchronizeContent(
      'integration-group-1', 
      'content-1', 
      ['integration-group-2']
    );
    expect(syncResult.success).toBe(true);

    // 3. Check status
    const status = await service.getSyncStatus('integration-group-1');
    expect(status).toBeDefined();
  });
});