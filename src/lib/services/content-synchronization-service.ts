import { supabase } from "@/lib/supabase";
import { withRetry } from "./crud-service";
import { logger } from '@/lib/services';
import { 
  ContentSyncConfig, 
  ContentSyncStatus, 
  ContentSyncPriority,
  SchedulingEvent,
  SchedulingApiResponse 
} from "@/types/scheduling";
import { Content, ContentVersion } from "@/types/content";
import { z } from "zod";

/**
 * Content Synchronization Service
 * 
 * This service handles content synchronization across class groups to ensure
 * learning progression alignment. It provides:
 * - Real-time synchronization between related class groups
 * - Content progression tracking across groups
 * - Automatic content updates when curriculum changes
 * - Synchronization conflict resolution
 * - Progress alignment for students joining mid-course
 */

// Types specific to content synchronization
export interface ClassGroupSyncState {
  groupId: string;
  courseId: string;
  currentUnit: number;
  currentLesson: number;
  contentIds: string[];
  lastSyncTimestamp: string;
  syncVersion: number;
  studentIds: string[];
  teacherId: string;
  isActive: boolean;
}

export interface ContentSyncOperation {
  id: string;
  operationType: 'sync' | 'rollback' | 'update' | 'merge';
  sourceGroupId: string;
  targetGroupIds: string[];
  contentId: string;
  version: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  scheduledAt: string;
  completedAt?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface SyncConflict {
  id: string;
  conflictType: 'version_mismatch' | 'content_divergence' | 'progression_gap' | 'dependency_violation';
  sourceGroupId: string;
  targetGroupId: string;
  contentId: string;
  sourceVersion: number;
  targetVersion: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestedResolution: 'merge' | 'overwrite' | 'manual_review' | 'skip';
  resolutionStrategy?: SyncResolutionStrategy;
}

export interface SyncResolutionStrategy {
  strategyType: 'automatic' | 'manual' | 'delayed';
  action: 'merge' | 'overwrite' | 'skip' | 'create_branch';
  parameters: Record<string, any>;
  reviewRequired: boolean;
  approvalUsers: string[];
}

export interface ContentProgressAlignment {
  groupId: string;
  expectedProgress: {
    unit: number;
    lesson: number;
    percentage: number;
  };
  actualProgress: {
    unit: number;
    lesson: number;
    percentage: number;
  };
  deviation: number;
  alignmentActions: string[];
}

// Validation schemas
const ClassGroupSyncStateSchema = z.object({
  groupId: z.string().uuid(),
  courseId: z.string().uuid(),
  currentUnit: z.number().min(1),
  currentLesson: z.number().min(1),
  contentIds: z.array(z.string().uuid()),
  lastSyncTimestamp: z.string().datetime(),
  syncVersion: z.number().min(1),
  studentIds: z.array(z.string().uuid()),
  teacherId: z.string().uuid(),
  isActive: z.boolean()
});

const ContentSyncOperationSchema = z.object({
  id: z.string().uuid(),
  operationType: z.enum(['sync', 'rollback', 'update', 'merge']),
  sourceGroupId: z.string().uuid(),
  targetGroupIds: z.array(z.string().uuid()),
  contentId: z.string().uuid(),
  version: z.number().min(1),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed']),
  scheduledAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  error: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

export class ContentSynchronizationService {
  private config: ContentSyncConfig;
  private syncState: Map<string, ClassGroupSyncState> = new Map();
  private activeOperations: Map<string, ContentSyncOperation> = new Map();
  private conflictResolutions: Map<string, SyncConflict> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(config?: Partial<ContentSyncConfig>) {
    this.config = {
      enabled: true,
      syncFrequency: 'real-time',
      maxBatchSize: 50,
      priorities: [
        { contentType: 'lesson', priority: 1, strategy: 'immediate' },
        { contentType: 'assignment', priority: 2, strategy: 'batched' },
        { contentType: 'material', priority: 3, strategy: 'scheduled' }
      ],
      conflictResolution: 'merge',
      ...config
    };

    this.initializeRealtimeSubscriptions();
  }

  /**
   * Initialize real-time subscriptions for content changes
   */
  private initializeRealtimeSubscriptions() {
    if (!this.config.enabled) return;

    // Subscribe to content changes
    supabase
      .channel('content-sync')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'contents'
      }, (payload) => {
        this.handleContentChange(payload);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'class_groups'
      }, (payload) => {
        this.handleClassGroupChange(payload);
      })
      .subscribe();
  }

  /**
   * Register a class group for synchronization
   */
  async registerClassGroup(groupData: Omit<ClassGroupSyncState, 'id' | 'lastSyncTimestamp' | 'syncVersion'>): Promise<SchedulingApiResponse<ClassGroupSyncState>> {
    try {
      const syncState: ClassGroupSyncState = {
        ...groupData,
        lastSyncTimestamp: new Date().toISOString(),
        syncVersion: 1
      };

      // Validate the sync state
      const validatedState = ClassGroupSyncStateSchema.parse(syncState);

      // Store in database
      const { data, error } = await supabase
        .from('class_group_sync_states')
        .insert([validatedState])
        .select()
        .single();

      if (error) throw error;

      // Cache locally
      this.syncState.set(validatedState.groupId, validatedState);

      // Emit event
      this.emitEvent('group_registered', { groupId: validatedState.groupId, syncState: validatedState });

      return {
        success: true,
        data: validatedState,
        metadata: {
          requestId: `register_${Date.now()}`,
          timestamp: new Date().toISOString(),
          processingTime: 0,
          version: '1.0'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'REGISTRATION_FAILED',
          message: `Failed to register class group: ${error.message}`,
          category: 'validation',
          severity: 'error',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Synchronize content across related class groups
   */
  async synchronizeContent(
    sourceGroupId: string,
    contentId: string,
    targetGroupIds?: string[]
  ): Promise<SchedulingApiResponse<ContentSyncOperation[]>> {
    const startTime = Date.now();

    try {
      // Get source group state
      const sourceState = await this.getGroupSyncState(sourceGroupId);
      if (!sourceState) {
        throw new Error(`Source group ${sourceGroupId} not found`);
      }

      // Determine target groups if not specified
      const targets = targetGroupIds || await this.getRelatedGroups(sourceGroupId);

      // Create synchronization operations
      const operations: ContentSyncOperation[] = [];

      for (const targetGroupId of targets) {
        const targetState = await this.getGroupSyncState(targetGroupId);
        if (!targetState) continue;

        // Check for conflicts
        const conflicts = await this.detectSyncConflicts(sourceState, targetState, contentId);
        
        if (conflicts.length > 0) {
          // Handle conflicts based on configuration
          await this.handleSyncConflicts(conflicts);
        }

        // Create sync operation
        const operation: ContentSyncOperation = {
          id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          operationType: 'sync',
          sourceGroupId,
          targetGroupIds: [targetGroupId],
          contentId,
          version: sourceState.syncVersion + 1,
          priority: this.determineSyncPriority(contentId),
          status: 'pending',
          scheduledAt: new Date().toISOString(),
          metadata: {
            sourceVersion: sourceState.syncVersion,
            targetVersion: targetState.syncVersion,
            hasConflicts: conflicts.length > 0
          }
        };

        operations.push(operation);
        this.activeOperations.set(operation.id, operation);
      }

      // Execute operations based on strategy
      const results = await this.executeSyncOperations(operations);

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: results,
        metadata: {
          requestId: `sync_${Date.now()}`,
          timestamp: new Date().toISOString(),
          processingTime,
          version: '1.0'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SYNC_FAILED',
          message: `Content synchronization failed: ${error.message}`,
          category: 'algorithm',
          severity: 'error',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Batch synchronization for multiple content items
   */
  async batchSynchronize(
    sourceGroupId: string,
    contentIds: string[],
    targetGroupIds?: string[]
  ): Promise<SchedulingApiResponse<ContentSyncOperation[]>> {
    const startTime = Date.now();

    try {
      // Validate batch size
      if (contentIds.length > this.config.maxBatchSize) {
        throw new Error(`Batch size ${contentIds.length} exceeds maximum ${this.config.maxBatchSize}`);
      }

      const allOperations: ContentSyncOperation[] = [];

      // Process in batches
      for (let i = 0; i < contentIds.length; i += this.config.maxBatchSize) {
        const batch = contentIds.slice(i, i + this.config.maxBatchSize);
        
        for (const contentId of batch) {
          const result = await this.synchronizeContent(sourceGroupId, contentId, targetGroupIds);
          if (result.success && result.data) {
            allOperations.push(...result.data);
          }
        }
      }

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: allOperations,
        metadata: {
          requestId: `batch_sync_${Date.now()}`,
          timestamp: new Date().toISOString(),
          processingTime,
          version: '1.0'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'BATCH_SYNC_FAILED',
          message: `Batch synchronization failed: ${error.message}`,
          category: 'algorithm',
          severity: 'error',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Align progress for students joining mid-course
   */
  async alignStudentProgress(
    studentId: string,
    targetGroupId: string
  ): Promise<SchedulingApiResponse<ContentProgressAlignment>> {
    try {
      // Get student's current progress
      const { data: studentProgress } = await supabase
        .from('student_progress')
        .select('*')
        .eq('student_id', studentId)
        .single();

      if (!studentProgress) {
        throw new Error(`Student progress not found for ${studentId}`);
      }

      // Get target group's expected progress
      const targetState = await this.getGroupSyncState(targetGroupId);
      if (!targetState) {
        throw new Error(`Target group ${targetGroupId} not found`);
      }

      // Calculate alignment
      const alignment: ContentProgressAlignment = {
        groupId: targetGroupId,
        expectedProgress: {
          unit: targetState.currentUnit,
          lesson: targetState.currentLesson,
          percentage: await this.calculateExpectedProgress(targetState)
        },
        actualProgress: {
          unit: studentProgress.current_unit || 1,
          lesson: studentProgress.current_lesson || 1,
          percentage: studentProgress.progress_percentage || 0
        },
        deviation: 0,
        alignmentActions: []
      };

      // Calculate deviation
      alignment.deviation = Math.abs(
        alignment.expectedProgress.percentage - alignment.actualProgress.percentage
      );

      // Generate alignment actions
      alignment.alignmentActions = await this.generateAlignmentActions(alignment);

      return {
        success: true,
        data: alignment,
        metadata: {
          requestId: `align_${Date.now()}`,
          timestamp: new Date().toISOString(),
          processingTime: 0,
          version: '1.0'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ALIGNMENT_FAILED',
          message: `Progress alignment failed: ${error.message}`,
          category: 'algorithm',
          severity: 'error',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Get synchronization status for a group
   */
  async getSyncStatus(groupId: string): Promise<ContentSyncStatus> {
    const groupState = await this.getGroupSyncState(groupId);
    const activeOps = Array.from(this.activeOperations.values())
      .filter(op => op.sourceGroupId === groupId || op.targetGroupIds.includes(groupId));

    return {
      id: `status_${groupId}`,
      status: activeOps.length > 0 ? 'in_progress' : 'completed',
      itemsSynced: activeOps.filter(op => op.status === 'completed').length,
      totalItems: activeOps.length,
      progress: activeOps.length > 0 ? 
        (activeOps.filter(op => op.status === 'completed').length / activeOps.length) * 100 : 100,
      startedAt: groupState?.lastSyncTimestamp || new Date().toISOString(),
      completedAt: activeOps.every(op => op.status === 'completed') ? new Date().toISOString() : undefined,
      error: activeOps.find(op => op.status === 'failed')?.error
    };
  }

  /**
   * Create content version for rollback capability
   */
  async createContentVersion(
    contentId: string,
    groupId: string,
    changeSummary: string
  ): Promise<SchedulingApiResponse<ContentVersion>> {
    try {
      // Get current content
      const { data: content } = await supabase
        .from('contents')
        .select('*')
        .eq('id', contentId)
        .single();

      if (!content) {
        throw new Error(`Content ${contentId} not found`);
      }

      // Create version
      const version: ContentVersion = {
        id: `version_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content_id: contentId,
        title: content.title,
        content: content.content,
        excerpt: content.excerpt,
        version: (content.version || 1) + 1,
        created_by: groupId, // Using groupId as creator for tracking
        created_at: new Date().toISOString(),
        change_summary: changeSummary
      };

      // Store version
      const { data: savedVersion, error } = await supabase
        .from('content_versions')
        .insert([version])
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: savedVersion,
        metadata: {
          requestId: `version_${Date.now()}`,
          timestamp: new Date().toISOString(),
          processingTime: 0,
          version: '1.0'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'VERSION_CREATION_FAILED',
          message: `Version creation failed: ${error.message}`,
          category: 'system',
          severity: 'error',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Rollback content to previous version
   */
  async rollbackContent(
    contentId: string,
    targetVersion: number,
    groupIds: string[]
  ): Promise<SchedulingApiResponse<ContentSyncOperation[]>> {
    try {
      // Get target version
      const { data: version } = await supabase
        .from('content_versions')
        .select('*')
        .eq('content_id', contentId)
        .eq('version', targetVersion)
        .single();

      if (!version) {
        throw new Error(`Version ${targetVersion} not found for content ${contentId}`);
      }

      // Create rollback operations
      const operations: ContentSyncOperation[] = [];

      for (const groupId of groupIds) {
        const operation: ContentSyncOperation = {
          id: `rollback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          operationType: 'rollback',
          sourceGroupId: groupId,
          targetGroupIds: [groupId],
          contentId,
          version: targetVersion,
          priority: 'high',
          status: 'pending',
          scheduledAt: new Date().toISOString(),
          metadata: {
            targetVersion,
            rollbackReason: 'Manual rollback requested'
          }
        };

        operations.push(operation);
        this.activeOperations.set(operation.id, operation);
      }

      // Execute rollback
      const results = await this.executeSyncOperations(operations);

      return {
        success: true,
        data: results,
        metadata: {
          requestId: `rollback_${Date.now()}`,
          timestamp: new Date().toISOString(),
          processingTime: 0,
          version: '1.0'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ROLLBACK_FAILED',
          message: `Content rollback failed: ${error.message}`,
          category: 'algorithm',
          severity: 'error',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  // Private helper methods

  private async getGroupSyncState(groupId: string): Promise<ClassGroupSyncState | null> {
    // Check cache first
    if (this.syncState.has(groupId)) {
      return this.syncState.get(groupId)!;
    }

    // Fetch from database
    const { data, error } = await supabase
      .from('class_group_sync_states')
      .select('*')
      .eq('group_id', groupId)
      .single();

    if (error || !data) return null;

    // Cache and return
    this.syncState.set(groupId, data);
    return data;
  }

  private async getRelatedGroups(groupId: string): Promise<string[]> {
    const groupState = await this.getGroupSyncState(groupId);
    if (!groupState) return [];

    // Find groups with same course
    const { data: relatedGroups } = await supabase
      .from('class_group_sync_states')
      .select('group_id')
      .eq('course_id', groupState.courseId)
      .neq('group_id', groupId)
      .eq('is_active', true);

    return relatedGroups?.map(g => g.group_id) || [];
  }

  private async detectSyncConflicts(
    sourceState: ClassGroupSyncState,
    targetState: ClassGroupSyncState,
    contentId: string
  ): Promise<SyncConflict[]> {
    const conflicts: SyncConflict[] = [];

    // Version mismatch check
    if (Math.abs(sourceState.syncVersion - targetState.syncVersion) > 1) {
      conflicts.push({
        id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        conflictType: 'version_mismatch',
        sourceGroupId: sourceState.groupId,
        targetGroupId: targetState.groupId,
        contentId,
        sourceVersion: sourceState.syncVersion,
        targetVersion: targetState.syncVersion,
        severity: 'medium',
        description: `Version mismatch detected: source v${sourceState.syncVersion}, target v${targetState.syncVersion}`,
        suggestedResolution: 'merge'
      });
    }

    // Progress gap check
    const progressGap = Math.abs(
      (sourceState.currentUnit * 100 + sourceState.currentLesson) -
      (targetState.currentUnit * 100 + targetState.currentLesson)
    );

    if (progressGap > 200) { // More than 2 lessons difference
      conflicts.push({
        id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        conflictType: 'progression_gap',
        sourceGroupId: sourceState.groupId,
        targetGroupId: targetState.groupId,
        contentId,
        sourceVersion: sourceState.syncVersion,
        targetVersion: targetState.syncVersion,
        severity: 'high',
        description: `Significant progression gap detected: ${progressGap} lesson units`,
        suggestedResolution: 'manual_review'
      });
    }

    return conflicts;
  }

  private async handleSyncConflicts(conflicts: SyncConflict[]): Promise<void> {
    for (const conflict of conflicts) {
      // Store conflict for resolution
      this.conflictResolutions.set(conflict.id, conflict);

      // Apply automatic resolution if configured
      if (this.config.conflictResolution === 'merge' && conflict.severity !== 'critical') {
        await this.applyAutomaticResolution(conflict);
      }

      // Emit conflict event
      this.emitEvent('conflict_detected', { conflict });
    }
  }

  private async applyAutomaticResolution(conflict: SyncConflict): Promise<void> {
    // Apply resolution based on conflict type
    switch (conflict.conflictType) {
      case 'version_mismatch':
        await this.resolveVersionMismatch(conflict);
        break;
      case 'progression_gap':
        await this.resolveProgressionGap(conflict);
        break;
      default:
        // Log for manual review
        logger.warn(`Unhandled conflict type: ${conflict.conflictType}`);
    }
  }

  private async resolveVersionMismatch(conflict: SyncConflict): Promise<void> {
    // Create merge operation
    const mergeOp: ContentSyncOperation = {
      id: `merge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      operationType: 'merge',
      sourceGroupId: conflict.sourceGroupId,
      targetGroupIds: [conflict.targetGroupId],
      contentId: conflict.contentId,
      version: Math.max(conflict.sourceVersion, conflict.targetVersion) + 1,
      priority: 'high',
      status: 'pending',
      scheduledAt: new Date().toISOString(),
      metadata: {
        conflictId: conflict.id,
        resolutionType: 'automatic_merge'
      }
    };

    this.activeOperations.set(mergeOp.id, mergeOp);
    await this.executeSyncOperations([mergeOp]);
  }

  private async resolveProgressionGap(conflict: SyncConflict): Promise<void> {
    // Create alignment recommendations
    const alignmentActions = await this.generateProgressionAlignment(
      conflict.sourceGroupId,
      conflict.targetGroupId
    );

    // Log resolution actions
    logger.info(`Progression gap resolution actions:`, alignmentActions);
  }

  private async generateProgressionAlignment(
    sourceGroupId: string,
    targetGroupId: string
  ): Promise<string[]> {
    const sourceState = await this.getGroupSyncState(sourceGroupId);
    const targetState = await this.getGroupSyncState(targetGroupId);

    if (!sourceState || !targetState) return [];

    const actions: string[] = [];

    if (sourceState.currentUnit > targetState.currentUnit) {
      actions.push(`Accelerate target group to unit ${sourceState.currentUnit}`);
    } else if (sourceState.currentUnit < targetState.currentUnit) {
      actions.push(`Provide catch-up content for source group`);
    }

    return actions;
  }

  private determineSyncPriority(contentId: string): 'low' | 'medium' | 'high' | 'urgent' {
    // Determine priority based on content type
    // This is a simplified version - in practice, you'd query content metadata
    return 'medium';
  }

  private async executeSyncOperations(operations: ContentSyncOperation[]): Promise<ContentSyncOperation[]> {
    const results: ContentSyncOperation[] = [];

    for (const operation of operations) {
      try {
        // Update operation status
        operation.status = 'in_progress';
        this.activeOperations.set(operation.id, operation);

        // Execute the operation
        await this.executeOperation(operation);

        // Mark as completed
        operation.status = 'completed';
        operation.completedAt = new Date().toISOString();
        
        results.push(operation);
      } catch (error) {
        operation.status = 'failed';
        operation.error = error.message;
        results.push(operation);
      }
    }

    return results;
  }

  private async executeOperation(operation: ContentSyncOperation): Promise<void> {
    switch (operation.operationType) {
      case 'sync':
        await this.performSync(operation);
        break;
      case 'rollback':
        await this.performRollback(operation);
        break;
      case 'merge':
        await this.performMerge(operation);
        break;
      case 'update':
        await this.performUpdate(operation);
        break;
      default:
        throw new Error(`Unsupported operation type: ${operation.operationType}`);
    }
  }

  private async performSync(operation: ContentSyncOperation): Promise<void> {
    // Get source content
    const { data: sourceContent } = await supabase
      .from('contents')
      .select('*')
      .eq('id', operation.contentId)
      .single();

    if (!sourceContent) {
      throw new Error(`Source content ${operation.contentId} not found`);
    }

    // Update target groups
    for (const targetGroupId of operation.targetGroupIds) {
      await this.updateGroupContent(targetGroupId, sourceContent);
    }

    // Update sync states
    await this.updateSyncStates(operation.sourceGroupId, operation.targetGroupIds, operation.version);
  }

  private async performRollback(operation: ContentSyncOperation): Promise<void> {
    // Get target version
    const { data: version } = await supabase
      .from('content_versions')
      .select('*')
      .eq('content_id', operation.contentId)
      .eq('version', operation.version)
      .single();

    if (!version) {
      throw new Error(`Version ${operation.version} not found`);
    }

    // Restore content
    await supabase
      .from('contents')
      .update({
        title: version.title,
        content: version.content,
        excerpt: version.excerpt,
        version: version.version,
        updated_at: new Date().toISOString()
      })
      .eq('id', operation.contentId);
  }

  private async performMerge(operation: ContentSyncOperation): Promise<void> {
    // Implement merge logic
    // This would involve sophisticated content merging algorithms
    logger.info(`Performing merge for operation ${operation.id}`);
  }

  private async performUpdate(operation: ContentSyncOperation): Promise<void> {
    // Implement update logic
    logger.info(`Performing update for operation ${operation.id}`);
  }

  private async updateGroupContent(groupId: string, content: any): Promise<void> {
    // Update group's content state
    await supabase
      .from('class_group_contents')
      .upsert({
        group_id: groupId,
        content_id: content.id,
        version: content.version,
        updated_at: new Date().toISOString()
      });
  }

  private async updateSyncStates(sourceGroupId: string, targetGroupIds: string[], version: number): Promise<void> {
    const timestamp = new Date().toISOString();

    // Update source state
    await supabase
      .from('class_group_sync_states')
      .update({
        sync_version: version,
        last_sync_timestamp: timestamp,
        updated_at: timestamp
      })
      .eq('group_id', sourceGroupId);

    // Update target states
    for (const targetGroupId of targetGroupIds) {
      await supabase
        .from('class_group_sync_states')
        .update({
          sync_version: version,
          last_sync_timestamp: timestamp,
          updated_at: timestamp
        })
        .eq('group_id', targetGroupId);
    }

    // Update local cache
    this.syncState.forEach((state, groupId) => {
      if (groupId === sourceGroupId || targetGroupIds.includes(groupId)) {
        state.syncVersion = version;
        state.lastSyncTimestamp = timestamp;
      }
    });
  }

  private async calculateExpectedProgress(targetState: ClassGroupSyncState): Promise<number> {
    // Calculate expected progress percentage based on current unit/lesson
    const totalUnits = 20; // This would be dynamic based on course
    const lessonsPerUnit = 10; // This would be dynamic based on course
    
    const completedLessons = (targetState.currentUnit - 1) * lessonsPerUnit + targetState.currentLesson;
    const totalLessons = totalUnits * lessonsPerUnit;
    
    return Math.min(100, (completedLessons / totalLessons) * 100);
  }

  private async generateAlignmentActions(alignment: ContentProgressAlignment): Promise<string[]> {
    const actions: string[] = [];

    if (alignment.deviation > 20) {
      actions.push('Schedule catch-up sessions');
      actions.push('Provide additional practice materials');
    }

    if (alignment.expectedProgress.unit > alignment.actualProgress.unit) {
      actions.push(`Accelerate to unit ${alignment.expectedProgress.unit}`);
    }

    if (alignment.expectedProgress.lesson > alignment.actualProgress.lesson) {
      actions.push(`Progress to lesson ${alignment.expectedProgress.lesson}`);
    }

    return actions;
  }

  private async handleContentChange(payload: any): Promise<void> {
    // Handle real-time content changes
    const { new: newContent, old: oldContent, eventType } = payload;

    if (eventType === 'UPDATE' && newContent) {
      // Trigger synchronization for all groups using this content
      const relatedGroups = await this.getGroupsUsingContent(newContent.id);
      
      for (const groupId of relatedGroups) {
        await this.synchronizeContent(groupId, newContent.id);
      }
    }
  }

  private async handleClassGroupChange(payload: any): Promise<void> {
    // Handle class group changes
    const { new: newGroup, eventType } = payload;

    if (eventType === 'INSERT' && newGroup) {
      // Auto-register new groups if they meet criteria
      if (newGroup.auto_sync_enabled) {
        await this.registerClassGroup(newGroup);
      }
    }
  }

  private async getGroupsUsingContent(contentId: string): Promise<string[]> {
    const { data: groups } = await supabase
      .from('class_group_contents')
      .select('group_id')
      .eq('content_id', contentId);

    return groups?.map(g => g.group_id) || [];
  }

  private emitEvent(eventType: string, data: any): void {
    const listeners = this.eventListeners.get(eventType) || [];
    listeners.forEach(listener => listener(data));
  }

  /**
   * Add event listener
   */
  addEventListener(eventType: string, listener: Function): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(eventType: string, listener: Function): void {
    const listeners = this.eventListeners.get(eventType) || [];
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  /**
   * Get all active operations
   */
  getActiveOperations(): ContentSyncOperation[] {
    return Array.from(this.activeOperations.values());
  }

  /**
   * Get all conflicts
   */
  getConflicts(): SyncConflict[] {
    return Array.from(this.conflictResolutions.values());
  }

  /**
   * Get service statistics
   */
  getStatistics(): {
    totalGroups: number;
    activeOperations: number;
    pendingConflicts: number;
    completedSyncs: number;
    failedSyncs: number;
  } {
    const operations = this.getActiveOperations();
    
    return {
      totalGroups: this.syncState.size,
      activeOperations: operations.filter(op => op.status === 'in_progress').length,
      pendingConflicts: this.getConflicts().length,
      completedSyncs: operations.filter(op => op.status === 'completed').length,
      failedSyncs: operations.filter(op => op.status === 'failed').length
    };
  }
}

// Export singleton instance
export const contentSynchronizationService = new ContentSynchronizationService();