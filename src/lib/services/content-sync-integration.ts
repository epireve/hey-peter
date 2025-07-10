import { supabase } from "@/lib/supabase";
import { schedulingRulesEngine } from "./scheduling-rules-engine";
import { contentSynchronizationService } from "./content-synchronization-service";
import { contentSyncScheduler } from "./content-sync-scheduler";
import { classCapacityService } from "./class-capacity-service";
import { 
  SchedulingRequest, 
  SchedulingResponse, 
  ScheduledClass,
  ContentSyncConfig,
  SchedulingApiResponse 
} from "@/types/scheduling";

/**
 * Content Synchronization Integration Service
 * 
 * This service integrates content synchronization with the existing
 * scheduling architecture and rules engine. It provides:
 * - Integration with scheduling decisions
 * - Automatic content sync when classes are scheduled
 * - Rules engine integration for sync priorities
 * - Class capacity synchronization
 * - Cross-system event coordination
 */

export interface SyncIntegrationConfig {
  autoSyncOnScheduling: boolean;
  syncOnCapacityChanges: boolean;
  syncOnRuleUpdates: boolean;
  priorityMapping: {
    urgent: string[];
    high: string[];
    medium: string[];
    low: string[];
  };
  integrationPoints: {
    scheduling: boolean;
    capacity: boolean;
    rules: boolean;
    realtime: boolean;
  };
}

export interface SchedulingSyncResult {
  schedulingResult: SchedulingResponse;
  syncOperations: any[];
  integrationSuccess: boolean;
  warnings: string[];
  recommendations: string[];
}

export interface ClassGroupSync {
  classId: string;
  groupId: string;
  courseId: string;
  syncEnabled: boolean;
  syncPriority: 'low' | 'medium' | 'high' | 'urgent';
  lastSyncTime: string;
  contentVersion: number;
  students: string[];
  teacher: string;
}

export class ContentSyncIntegration {
  private config: SyncIntegrationConfig;
  private classGroupMap: Map<string, ClassGroupSync> = new Map();
  private eventQueue: any[] = [];

  constructor(config?: Partial<SyncIntegrationConfig>) {
    this.config = {
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
      },
      ...config
    };

    this.initializeIntegration();
  }

  /**
   * Initialize integration with existing systems
   */
  private initializeIntegration(): void {
    // Register event listeners with existing services
    this.registerSchedulingIntegration();
    this.registerCapacityIntegration();
    this.registerRulesIntegration();
    this.loadExistingClassGroups();
  }

  /**
   * Enhanced scheduling with automatic content synchronization
   */
  async scheduleWithContentSync(
    request: SchedulingRequest
  ): Promise<SchedulingApiResponse<SchedulingSyncResult>> {
    const startTime = Date.now();

    try {
      // Step 1: Perform regular scheduling
      const schedulingResult = await schedulingRulesEngine.scheduleClasses(request);
      
      if (!schedulingResult.success) {
        return {
          success: false,
          error: {
            code: 'SCHEDULING_FAILED',
            message: `Scheduling failed: ${schedulingResult.error}`,
            category: 'algorithm',
            severity: 'error',
            timestamp: new Date().toISOString()
          }
        };
      }

      const syncOperations: any[] = [];
      const warnings: string[] = [];
      const recommendations: string[] = [];

      // Step 2: Process content synchronization for scheduled classes
      if (this.config.autoSyncOnScheduling && schedulingResult.result?.scheduled_classes) {
        for (const scheduledClass of schedulingResult.result.scheduled_classes) {
          try {
            // Create or update class group sync
            const classGroup = await this.createClassGroupSync(scheduledClass, request.course_type);
            
            // Register with content sync service
            const registrationResult = await contentSynchronizationService.registerClassGroup(classGroup);
            
            if (registrationResult.success) {
              // Perform initial content synchronization
              const contentIds = await this.getRelevantContentIds(scheduledClass, request.course_type);
              
              if (contentIds.length > 0) {
                const syncResult = await contentSynchronizationService.batchSynchronize(
                  classGroup.groupId,
                  contentIds
                );
                
                if (syncResult.success && syncResult.data) {
                  syncOperations.push(...syncResult.data);
                } else {
                  warnings.push(`Content sync failed for class ${scheduledClass.id}`);
                }
              }
            } else {
              warnings.push(`Failed to register class ${scheduledClass.id} for content sync`);
            }
          } catch (error) {
            warnings.push(`Error processing class ${scheduledClass.id}: ${error.message}`);
          }
        }
      }

      // Step 3: Generate integration recommendations
      recommendations.push(...this.generateIntegrationRecommendations(
        schedulingResult,
        syncOperations,
        warnings
      ));

      const result: SchedulingSyncResult = {
        schedulingResult,
        syncOperations,
        integrationSuccess: warnings.length === 0,
        warnings,
        recommendations
      };

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: result,
        metadata: {
          requestId: `integrated_schedule_${Date.now()}`,
          timestamp: new Date().toISOString(),
          processingTime,
          version: '1.0'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INTEGRATION_FAILED',
          message: `Integrated scheduling failed: ${error.message}`,
          category: 'system',
          severity: 'error',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Synchronize content when class capacity changes
   */
  async handleCapacityChange(
    classId: string,
    oldCapacity: number,
    newCapacity: number,
    enrollmentChanges: string[]
  ): Promise<void> {
    if (!this.config.syncOnCapacityChanges) return;

    try {
      const classGroup = this.classGroupMap.get(classId);
      if (!classGroup) return;

      // Update class group with new enrollment
      classGroup.students = await this.getCurrentEnrollment(classId);
      classGroup.lastSyncTime = new Date().toISOString();

      // Trigger content alignment for new students
      for (const studentId of enrollmentChanges) {
        const alignmentResult = await contentSynchronizationService.alignStudentProgress(
          studentId,
          classGroup.groupId
        );

        if (alignmentResult.success && alignmentResult.data) {
          // Apply alignment actions
          await this.applyAlignmentActions(alignmentResult.data);
        }
      }

      // Update capacity-related content if needed
      await this.updateCapacityBasedContent(classGroup, newCapacity);

    } catch (error) {
      console.error(`Error handling capacity change for class ${classId}:`, error);
    }
  }

  /**
   * Handle rules engine updates
   */
  async handleRulesUpdate(
    ruleId: string,
    ruleType: string,
    affectedClasses: string[]
  ): Promise<void> {
    if (!this.config.syncOnRuleUpdates) return;

    try {
      // Get affected class groups
      const affectedGroups = affectedClasses
        .map(classId => this.classGroupMap.get(classId))
        .filter(group => group !== undefined);

      // Trigger re-synchronization based on rule changes
      for (const group of affectedGroups) {
        if (!group) continue;

        // Determine if content needs to be re-synchronized
        const needsSync = await this.evaluateRuleImpactOnContent(group, ruleType);
        
        if (needsSync) {
          // Schedule content re-synchronization
          await contentSyncScheduler.selectiveSync(group.groupId, {
            groupIds: [group.groupId],
            priorities: [group.syncPriority],
            dryRun: false
          });
        }
      }
    } catch (error) {
      console.error(`Error handling rules update ${ruleId}:`, error);
    }
  }

  /**
   * Get content synchronization status for a class
   */
  async getClassSyncStatus(classId: string): Promise<any> {
    const classGroup = this.classGroupMap.get(classId);
    if (!classGroup) {
      return { synchronized: false, error: 'Class not found in sync registry' };
    }

    const syncStatus = await contentSynchronizationService.getSyncStatus(classGroup.groupId);
    
    return {
      synchronized: syncStatus.status === 'completed',
      lastSync: classGroup.lastSyncTime,
      syncVersion: classGroup.contentVersion,
      groupId: classGroup.groupId,
      syncStatus
    };
  }

  /**
   * Force synchronization for a specific class
   */
  async forceSyncClass(
    classId: string,
    contentIds?: string[]
  ): Promise<SchedulingApiResponse<any[]>> {
    try {
      const classGroup = this.classGroupMap.get(classId);
      if (!classGroup) {
        throw new Error(`Class ${classId} not found in sync registry`);
      }

      // Get content IDs if not provided
      const targetContentIds = contentIds || await this.getRelevantContentIds(
        { id: classId } as ScheduledClass,
        await this.getCourseType(classGroup.courseId)
      );

      // Perform synchronization
      const result = await contentSynchronizationService.batchSynchronize(
        classGroup.groupId,
        targetContentIds
      );

      if (result.success) {
        // Update class group sync time
        classGroup.lastSyncTime = new Date().toISOString();
        classGroup.contentVersion++;
        
        await this.updateClassGroupInDatabase(classGroup);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FORCE_SYNC_FAILED',
          message: `Force sync failed: ${error.message}`,
          category: 'system',
          severity: 'error',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Get integration statistics
   */
  getIntegrationStats(): {
    totalClassGroups: number;
    syncEnabledGroups: number;
    recentSyncs: number;
    pendingOperations: number;
    integrationHealth: 'healthy' | 'warning' | 'error';
  } {
    const classGroups = Array.from(this.classGroupMap.values());
    const syncEnabledGroups = classGroups.filter(g => g.syncEnabled);
    const recentSyncs = classGroups.filter(g => {
      const lastSync = new Date(g.lastSyncTime);
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      return lastSync > hourAgo;
    });

    const syncStats = contentSynchronizationService.getStatistics();
    
    let integrationHealth: 'healthy' | 'warning' | 'error' = 'healthy';
    if (syncStats.failedSyncs > syncStats.completedSyncs * 0.1) {
      integrationHealth = 'error';
    } else if (syncStats.pendingConflicts > 5) {
      integrationHealth = 'warning';
    }

    return {
      totalClassGroups: classGroups.length,
      syncEnabledGroups: syncEnabledGroups.length,
      recentSyncs: recentSyncs.length,
      pendingOperations: syncStats.activeOperations,
      integrationHealth
    };
  }

  // Private helper methods

  private registerSchedulingIntegration(): void {
    if (!this.config.integrationPoints.scheduling) return;

    // This would ideally use event listeners from the scheduling service
    // For now, we'll simulate the integration
    console.log('Scheduling integration registered');
  }

  private registerCapacityIntegration(): void {
    if (!this.config.integrationPoints.capacity) return;

    // Register with capacity service events
    // This would use the actual event system when available
    console.log('Capacity integration registered');
  }

  private registerRulesIntegration(): void {
    if (!this.config.integrationPoints.rules) return;

    // Register with rules engine events
    console.log('Rules integration registered');
  }

  private async loadExistingClassGroups(): Promise<void> {
    const { data: classGroups } = await supabase
      .from('class_group_sync_states')
      .select('*')
      .eq('is_active', true);

    if (classGroups) {
      for (const group of classGroups) {
        const classSync: ClassGroupSync = {
          classId: group.class_id,
          groupId: group.group_id,
          courseId: group.course_id,
          syncEnabled: true,
          syncPriority: this.determineSyncPriority(group.course_id),
          lastSyncTime: group.last_sync_timestamp,
          contentVersion: group.sync_version,
          students: group.student_ids || [],
          teacher: group.teacher_id
        };

        this.classGroupMap.set(group.class_id, classSync);
      }
    }
  }

  private async createClassGroupSync(
    scheduledClass: ScheduledClass,
    courseType?: string
  ): Promise<any> {
    const syncPriority = this.determineSyncPriority(scheduledClass.content_items?.[0]?.id || '');
    
    const classGroup: ClassGroupSync = {
      classId: scheduledClass.id,
      groupId: `group_${scheduledClass.id}`,
      courseId: scheduledClass.id, // Simplified
      syncEnabled: true,
      syncPriority,
      lastSyncTime: new Date().toISOString(),
      contentVersion: 1,
      students: scheduledClass.student_ids,
      teacher: scheduledClass.teacher_id
    };

    // Store in map
    this.classGroupMap.set(scheduledClass.id, classGroup);

    // Return in format expected by content sync service
    return {
      groupId: classGroup.groupId,
      courseId: classGroup.courseId,
      currentUnit: 1,
      currentLesson: 1,
      contentIds: scheduledClass.content_items?.map(c => c.id) || [],
      studentIds: scheduledClass.student_ids,
      teacherId: scheduledClass.teacher_id,
      isActive: true
    };
  }

  private determineSyncPriority(contentOrCourseId: string): 'low' | 'medium' | 'high' | 'urgent' {
    // Simplified priority determination
    // In practice, this would check course types, content difficulty, etc.
    
    for (const [priority, items] of Object.entries(this.config.priorityMapping)) {
      if (items.some(item => contentOrCourseId.includes(item))) {
        return priority as 'low' | 'medium' | 'high' | 'urgent';
      }
    }

    return 'medium';
  }

  private async getRelevantContentIds(
    scheduledClass: ScheduledClass,
    courseType?: string
  ): Promise<string[]> {
    // Get content IDs based on class content items or course type
    if (scheduledClass.content_items) {
      return scheduledClass.content_items.map(c => c.id);
    }

    // Fallback to querying by course type
    const { data: contents } = await supabase
      .from('contents')
      .select('id')
      .eq('category', courseType || 'Basic')
      .limit(10);

    return contents?.map(c => c.id) || [];
  }

  private generateIntegrationRecommendations(
    schedulingResult: SchedulingResponse,
    syncOperations: any[],
    warnings: string[]
  ): string[] {
    const recommendations: string[] = [];

    // Check sync success rate
    const successfulSyncs = syncOperations.filter(op => op.status === 'completed').length;
    const totalSyncs = syncOperations.length;
    
    if (totalSyncs > 0 && successfulSyncs / totalSyncs < 0.8) {
      recommendations.push('Content sync success rate is low. Review sync configuration and content availability.');
    }

    // Check for unscheduled students
    if (schedulingResult.result?.unscheduled_students?.length > 0) {
      recommendations.push('Some students could not be scheduled. Consider enabling content alignment to help with grouping.');
    }

    // Check warnings
    if (warnings.length > 0) {
      recommendations.push('Integration warnings detected. Review sync service configuration and content dependencies.');
    }

    return recommendations;
  }

  private async getCurrentEnrollment(classId: string): Promise<string[]> {
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('student_id')
      .eq('class_id', classId)
      .eq('status', 'active');

    return enrollments?.map(e => e.student_id) || [];
  }

  private async applyAlignmentActions(alignment: any): Promise<void> {
    // Apply the alignment actions generated by the content sync service
    for (const action of alignment.alignmentActions) {
      console.log(`Applying alignment action: ${action}`);
      // Implementation would depend on the specific action type
    }
  }

  private async updateCapacityBasedContent(
    classGroup: ClassGroupSync,
    newCapacity: number
  ): Promise<void> {
    // Update content based on new capacity
    // For example, adjust group activities vs individual activities
    if (newCapacity === 1) {
      // Switch to individual-focused content
      await this.scheduleIndividualContent(classGroup);
    } else {
      // Switch to group-focused content
      await this.scheduleGroupContent(classGroup);
    }
  }

  private async evaluateRuleImpactOnContent(
    group: ClassGroupSync,
    ruleType: string
  ): Promise<boolean> {
    // Evaluate if rule changes require content re-synchronization
    const impactfulRuleTypes = ['content_priority', 'student_grouping', 'teacher_preference'];
    return impactfulRuleTypes.includes(ruleType);
  }

  private async scheduleIndividualContent(classGroup: ClassGroupSync): Promise<void> {
    // Schedule individual-focused content
    console.log(`Scheduling individual content for group ${classGroup.groupId}`);
  }

  private async scheduleGroupContent(classGroup: ClassGroupSync): Promise<void> {
    // Schedule group-focused content
    console.log(`Scheduling group content for group ${classGroup.groupId}`);
  }

  private async getCourseType(courseId: string): Promise<string> {
    const { data: course } = await supabase
      .from('courses')
      .select('course_type')
      .eq('id', courseId)
      .single();

    return course?.course_type || 'Basic';
  }

  private async updateClassGroupInDatabase(classGroup: ClassGroupSync): Promise<void> {
    await supabase
      .from('class_group_sync_states')
      .upsert({
        class_id: classGroup.classId,
        group_id: classGroup.groupId,
        course_id: classGroup.courseId,
        sync_enabled: classGroup.syncEnabled,
        sync_priority: classGroup.syncPriority,
        last_sync_timestamp: classGroup.lastSyncTime,
        sync_version: classGroup.contentVersion,
        student_ids: classGroup.students,
        teacher_id: classGroup.teacher,
        updated_at: new Date().toISOString()
      });
  }
}

// Export singleton instance
export const contentSyncIntegration = new ContentSyncIntegration();