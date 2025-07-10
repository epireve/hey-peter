import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { supabase } from '@/lib/supabase';
import { 
  ContentSyncIntegration,
  SyncIntegrationConfig,
  SchedulingSyncResult,
  ClassGroupSync
} from '../content-sync-integration';
import { SchedulingRequest, SchedulingResponse, ScheduledClass } from '@/types/scheduling';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('../scheduling-rules-engine');
jest.mock('../content-synchronization-service');
jest.mock('../content-sync-scheduler');
jest.mock('../class-capacity-service');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('ContentSyncIntegration', () => {
  let integration: ContentSyncIntegration;
  let mockFrom: jest.MockedFunction<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup Supabase mock
    mockFrom = jest.fn();
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      upsert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis()
    } as any);
    
    const config: Partial<SyncIntegrationConfig> = {
      autoSyncOnScheduling: true,
      syncOnCapacityChanges: true,
      syncOnRuleUpdates: true,
      priorityMapping: {
        urgent: ['Business English', '1-on-1'],
        high: ['Speak Up'],
        medium: ['Everyday A', 'Everyday B'],
        low: ['Basic']
      },
      integrationPoints: {
        scheduling: true,
        capacity: true,
        rules: true,
        realtime: true
      }
    };

    integration = new ContentSyncIntegration(config);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('scheduleWithContentSync', () => {
    it('should integrate scheduling with content synchronization', async () => {
      const mockSchedulingRequest: SchedulingRequest = {
        id: 'request-1',
        type: 'auto_schedule',
        priority: 'high',
        studentIds: ['student-1', 'student-2'],
        courseId: 'course-1',
        course_type: 'Business English',
        requestedAt: '2024-01-15T10:00:00Z',
        requestedBy: 'admin-1'
      };

      const mockScheduledClass: ScheduledClass = {
        id: 'class-1',
        student_ids: ['student-1', 'student-2'],
        teacher_id: 'teacher-1',
        content_items: [
          { id: 'content-1', title: 'Business Vocabulary', unit_number: 1, lesson_number: 1, difficulty_level: 5 }
        ],
        scheduled_time: '2024-01-16T09:00:00Z',
        duration_minutes: 90,
        class_type: 'group',
        room_or_link: 'Room 101',
        preparation_notes: 'Focus on business vocabulary',
        learning_objectives: ['Learn business terms', 'Practice presentations'],
        success_criteria: ['Complete vocabulary exercise', 'Give 2-minute presentation']
      };

      const mockSchedulingResponse: SchedulingResponse = {
        success: true,
        result: {
          scheduled_classes: [mockScheduledClass],
          unscheduled_students: [],
          optimization_score: 85,
          performance_metrics: {
            total_students_scheduled: 2,
            total_classes_created: 1,
            average_class_utilization: 2,
            content_coverage_percentage: 90,
            student_preference_satisfaction: 80,
            teacher_utilization: 75,
            scheduling_efficiency: 85
          },
          recommendations: [],
          next_optimization_date: '2024-01-23T10:00:00Z'
        },
        processing_time_ms: 1500,
        recommendations: []
      };

      // Mock the scheduling rules engine response
      const mockSchedulingRulesEngine = {
        scheduleClasses: jest.fn().mockResolvedValue(mockSchedulingResponse)
      };
      
      // Mock content synchronization service responses
      const mockContentSyncService = {
        registerClassGroup: jest.fn().mockResolvedValue({
          success: true,
          data: { groupId: 'group-1' }
        }),
        batchSynchronize: jest.fn().mockResolvedValue({
          success: true,
          data: [{ id: 'sync-op-1', status: 'completed' }]
        })
      };

      // Mock content fetching
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [{ id: 'content-1' }, { id: 'content-2' }]
        })
      });

      // Replace the dependencies in the integration instance
      (integration as any).schedulingRulesEngine = mockSchedulingRulesEngine;
      (integration as any).contentSynchronizationService = mockContentSyncService;

      const result = await integration.scheduleWithContentSync(mockSchedulingRequest);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.schedulingResult).toEqual(mockSchedulingResponse);
      expect(result.data?.syncOperations).toHaveLength(1);
      expect(result.data?.integrationSuccess).toBe(true);
      
      expect(mockSchedulingRulesEngine.scheduleClasses).toHaveBeenCalledWith(mockSchedulingRequest);
      expect(mockContentSyncService.registerClassGroup).toHaveBeenCalled();
      expect(mockContentSyncService.batchSynchronize).toHaveBeenCalled();
    });

    it('should handle scheduling failure gracefully', async () => {
      const mockSchedulingRequest: SchedulingRequest = {
        id: 'request-1',
        type: 'auto_schedule',
        priority: 'high',
        studentIds: ['student-1'],
        courseId: 'course-1',
        requestedAt: '2024-01-15T10:00:00Z',
        requestedBy: 'admin-1'
      };

      const mockFailedResponse: SchedulingResponse = {
        success: false,
        error: 'No available teachers',
        processing_time_ms: 500,
        recommendations: ['Hire more teachers']
      };

      const mockSchedulingRulesEngine = {
        scheduleClasses: jest.fn().mockResolvedValue(mockFailedResponse)
      };

      (integration as any).schedulingRulesEngine = mockSchedulingRulesEngine;

      const result = await integration.scheduleWithContentSync(mockSchedulingRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SCHEDULING_FAILED');
    });

    it('should handle sync failures with warnings', async () => {
      const mockSchedulingRequest: SchedulingRequest = {
        id: 'request-1',
        type: 'auto_schedule',
        priority: 'medium',
        studentIds: ['student-1'],
        courseId: 'course-1',
        requestedAt: '2024-01-15T10:00:00Z',
        requestedBy: 'admin-1'
      };

      const mockScheduledClass: ScheduledClass = {
        id: 'class-1',
        student_ids: ['student-1'],
        teacher_id: 'teacher-1',
        content_items: [{ id: 'content-1', title: 'Basic Grammar', unit_number: 1, lesson_number: 1, difficulty_level: 3 }],
        scheduled_time: '2024-01-16T09:00:00Z',
        duration_minutes: 60,
        class_type: 'individual',
        room_or_link: 'Online',
        preparation_notes: 'Basic grammar review',
        learning_objectives: ['Review grammar rules'],
        success_criteria: ['Complete grammar exercises']
      };

      const mockSchedulingResponse: SchedulingResponse = {
        success: true,
        result: {
          scheduled_classes: [mockScheduledClass],
          unscheduled_students: [],
          optimization_score: 80,
          performance_metrics: {
            total_students_scheduled: 1,
            total_classes_created: 1,
            average_class_utilization: 1,
            content_coverage_percentage: 85,
            student_preference_satisfaction: 90,
            teacher_utilization: 60,
            scheduling_efficiency: 80
          },
          recommendations: [],
          next_optimization_date: '2024-01-23T10:00:00Z'
        },
        processing_time_ms: 1000,
        recommendations: []
      };

      const mockSchedulingRulesEngine = {
        scheduleClasses: jest.fn().mockResolvedValue(mockSchedulingResponse)
      };

      const mockContentSyncService = {
        registerClassGroup: jest.fn().mockResolvedValue({
          success: false,
          error: { message: 'Registration failed' }
        }),
        batchSynchronize: jest.fn()
      };

      (integration as any).schedulingRulesEngine = mockSchedulingRulesEngine;
      (integration as any).contentSynchronizationService = mockContentSyncService;

      const result = await integration.scheduleWithContentSync(mockSchedulingRequest);

      expect(result.success).toBe(true);
      expect(result.data?.integrationSuccess).toBe(false);
      expect(result.data?.warnings).toContain('Failed to register class class-1 for content sync');
    });
  });

  describe('handleCapacityChange', () => {
    it('should handle capacity increase with new student alignment', async () => {
      // Setup mock class group
      const mockClassGroup: ClassGroupSync = {
        classId: 'class-1',
        groupId: 'group-1',
        courseId: 'course-1',
        syncEnabled: true,
        syncPriority: 'medium',
        lastSyncTime: '2024-01-15T10:00:00Z',
        contentVersion: 1,
        students: ['student-1'],
        teacher: 'teacher-1'
      };

      (integration as any).classGroupMap.set('class-1', mockClassGroup);

      // Mock current enrollment
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        mockResolvedValue: jest.fn().mockResolvedValue({
          data: [
            { student_id: 'student-1' },
            { student_id: 'student-2' }
          ]
        })
      });

      // Mock content sync service alignment
      const mockContentSyncService = {
        alignStudentProgress: jest.fn().mockResolvedValue({
          success: true,
          data: {
            groupId: 'group-1',
            alignmentActions: ['Provide catch-up materials', 'Schedule review session']
          }
        })
      };

      (integration as any).contentSynchronizationService = mockContentSyncService;

      await integration.handleCapacityChange('class-1', 1, 2, ['student-2']);

      expect(mockContentSyncService.alignStudentProgress).toHaveBeenCalledWith('student-2', 'group-1');
      expect(mockClassGroup.students).toContain('student-2');
    });

    it('should update content based on capacity changes', async () => {
      const mockClassGroup: ClassGroupSync = {
        classId: 'class-1',
        groupId: 'group-1',
        courseId: 'course-1',
        syncEnabled: true,
        syncPriority: 'high',
        lastSyncTime: '2024-01-15T10:00:00Z',
        contentVersion: 1,
        students: ['student-1', 'student-2'],
        teacher: 'teacher-1'
      };

      (integration as any).classGroupMap.set('class-1', mockClassGroup);

      // Mock individual class scenario (capacity = 1)
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        mockResolvedValue: jest.fn().mockResolvedValue({
          data: [{ student_id: 'student-1' }]
        })
      });

      await integration.handleCapacityChange('class-1', 2, 1, ['student-2']);

      // Should trigger individual content scheduling
      expect(mockClassGroup.students).toHaveLength(1);
    });
  });

  describe('handleRulesUpdate', () => {
    it('should trigger re-synchronization for affected classes', async () => {
      const mockClassGroup: ClassGroupSync = {
        classId: 'class-1',
        groupId: 'group-1',
        courseId: 'course-1',
        syncEnabled: true,
        syncPriority: 'high',
        lastSyncTime: '2024-01-15T10:00:00Z',
        contentVersion: 1,
        students: ['student-1', 'student-2'],
        teacher: 'teacher-1'
      };

      (integration as any).classGroupMap.set('class-1', mockClassGroup);

      const mockContentSyncScheduler = {
        selectiveSync: jest.fn().mockResolvedValue({
          success: true,
          data: { id: 'sync-job-1' }
        })
      };

      (integration as any).contentSyncScheduler = mockContentSyncScheduler;

      await integration.handleRulesUpdate('rule-1', 'content_priority', ['class-1']);

      expect(mockContentSyncScheduler.selectiveSync).toHaveBeenCalledWith('group-1', {
        groupIds: ['group-1'],
        priorities: ['high'],
        dryRun: false
      });
    });

    it('should skip non-impactful rule types', async () => {
      const mockContentSyncScheduler = {
        selectiveSync: jest.fn()
      };

      (integration as any).contentSyncScheduler = mockContentSyncScheduler;

      await integration.handleRulesUpdate('rule-1', 'non_impactful_rule', ['class-1']);

      expect(mockContentSyncScheduler.selectiveSync).not.toHaveBeenCalled();
    });
  });

  describe('getClassSyncStatus', () => {
    it('should return comprehensive sync status', async () => {
      const mockClassGroup: ClassGroupSync = {
        classId: 'class-1',
        groupId: 'group-1',
        courseId: 'course-1',
        syncEnabled: true,
        syncPriority: 'medium',
        lastSyncTime: '2024-01-15T10:00:00Z',
        contentVersion: 2,
        students: ['student-1'],
        teacher: 'teacher-1'
      };

      (integration as any).classGroupMap.set('class-1', mockClassGroup);

      const mockContentSyncService = {
        getSyncStatus: jest.fn().mockResolvedValue({
          id: 'status-1',
          status: 'completed',
          progress: 100
        })
      };

      (integration as any).contentSynchronizationService = mockContentSyncService;

      const status = await integration.getClassSyncStatus('class-1');

      expect(status.synchronized).toBe(true);
      expect(status.lastSync).toBe('2024-01-15T10:00:00Z');
      expect(status.syncVersion).toBe(2);
      expect(status.groupId).toBe('group-1');
    });

    it('should handle non-existent class', async () => {
      const status = await integration.getClassSyncStatus('non-existent-class');

      expect(status.synchronized).toBe(false);
      expect(status.error).toBe('Class not found in sync registry');
    });
  });

  describe('forceSyncClass', () => {
    it('should execute forced synchronization', async () => {
      const mockClassGroup: ClassGroupSync = {
        classId: 'class-1',
        groupId: 'group-1',
        courseId: 'course-1',
        syncEnabled: true,
        syncPriority: 'urgent',
        lastSyncTime: '2024-01-15T10:00:00Z',
        contentVersion: 1,
        students: ['student-1'],
        teacher: 'teacher-1'
      };

      (integration as any).classGroupMap.set('class-1', mockClassGroup);

      // Mock course type lookup
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { course_type: 'Business English' }
        })
      });

      const mockContentSyncService = {
        batchSynchronize: jest.fn().mockResolvedValue({
          success: true,
          data: [{ id: 'sync-op-1', status: 'completed' }]
        })
      };

      (integration as any).contentSynchronizationService = mockContentSyncService;

      const result = await integration.forceSyncClass('class-1', ['content-1', 'content-2']);

      expect(result.success).toBe(true);
      expect(mockContentSyncService.batchSynchronize).toHaveBeenCalledWith(
        'group-1',
        ['content-1', 'content-2']
      );
      expect(mockClassGroup.contentVersion).toBe(2);
    });

    it('should handle forced sync failure', async () => {
      const result = await integration.forceSyncClass('non-existent-class');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('FORCE_SYNC_FAILED');
    });
  });

  describe('getIntegrationStats', () => {
    it('should provide comprehensive integration statistics', () => {
      // Setup mock class groups
      const classGroups = [
        {
          classId: 'class-1',
          groupId: 'group-1',
          courseId: 'course-1',
          syncEnabled: true,
          syncPriority: 'high' as const,
          lastSyncTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
          contentVersion: 1,
          students: ['student-1'],
          teacher: 'teacher-1'
        },
        {
          classId: 'class-2',
          groupId: 'group-2',
          courseId: 'course-2',
          syncEnabled: false,
          syncPriority: 'medium' as const,
          lastSyncTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          contentVersion: 1,
          students: ['student-2'],
          teacher: 'teacher-2'
        }
      ];

      classGroups.forEach(group => {
        (integration as any).classGroupMap.set(group.classId, group);
      });

      // Mock content sync service stats
      const mockContentSyncService = {
        getStatistics: jest.fn().mockReturnValue({
          activeOperations: 2,
          pendingConflicts: 1,
          completedSyncs: 10,
          failedSyncs: 1
        })
      };

      (integration as any).contentSynchronizationService = mockContentSyncService;

      const stats = integration.getIntegrationStats();

      expect(stats.totalClassGroups).toBe(2);
      expect(stats.syncEnabledGroups).toBe(1);
      expect(stats.recentSyncs).toBe(1); // Only class-1 synced within last hour
      expect(stats.pendingOperations).toBe(2);
      expect(stats.integrationHealth).toBe('warning'); // Due to pending conflicts
    });

    it('should calculate health status correctly', () => {
      // Mock high failure rate scenario
      const mockContentSyncService = {
        getStatistics: jest.fn().mockReturnValue({
          activeOperations: 0,
          pendingConflicts: 0,
          completedSyncs: 5,
          failedSyncs: 10 // High failure rate
        })
      };

      (integration as any).contentSynchronizationService = mockContentSyncService;

      const stats = integration.getIntegrationStats();

      expect(stats.integrationHealth).toBe('error');
    });
  });

  describe('priority determination', () => {
    it('should correctly map course types to priorities', () => {
      const businessEnglishPriority = (integration as any).determineSyncPriority('Business English Course');
      const basicPriority = (integration as any).determineSyncPriority('Basic Course');
      const speakUpPriority = (integration as any).determineSyncPriority('Speak Up Course');

      expect(businessEnglishPriority).toBe('urgent');
      expect(basicPriority).toBe('low');
      expect(speakUpPriority).toBe('high');
    });

    it('should default to medium priority for unknown types', () => {
      const unknownPriority = (integration as any).determineSyncPriority('Unknown Course Type');

      expect(unknownPriority).toBe('medium');
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle database connection errors', async () => {
      mockFrom.mockRejectedValue(new Error('Database connection failed'));

      const request: SchedulingRequest = {
        id: 'request-1',
        type: 'auto_schedule',
        priority: 'high',
        studentIds: ['student-1'],
        courseId: 'course-1',
        requestedAt: '2024-01-15T10:00:00Z',
        requestedBy: 'admin-1'
      };

      const result = await integration.scheduleWithContentSync(request);

      expect(result.success).toBe(false);
      expect(result.error?.category).toBe('system');
    });

    it('should handle malformed class group data', async () => {
      // Test with malformed data in the class group map
      const malformedGroup = {
        classId: 'class-1',
        // Missing required fields
      };

      (integration as any).classGroupMap.set('class-1', malformedGroup);

      await integration.handleCapacityChange('class-1', 1, 2, ['student-1']);

      // Should not throw error, but handle gracefully
    });

    it('should handle concurrent synchronization operations', async () => {
      const request: SchedulingRequest = {
        id: 'request-1',
        type: 'auto_schedule',
        priority: 'high',
        studentIds: ['student-1', 'student-2'],
        courseId: 'course-1',
        requestedAt: '2024-01-15T10:00:00Z',
        requestedBy: 'admin-1'
      };

      // Mock multiple concurrent calls
      const promises = [
        integration.scheduleWithContentSync(request),
        integration.scheduleWithContentSync(request),
        integration.scheduleWithContentSync(request)
      ];

      const results = await Promise.all(promises);

      // All should complete without errors
      results.forEach(result => {
        expect(typeof result.success).toBe('boolean');
      });
    });
  });
});