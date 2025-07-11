import { logger } from '@/lib/services';
/**
 * Manual Override Service for HeyPeter Academy
 * 
 * This service handles manual overrides for the AI scheduling system,
 * providing capabilities for administrators to intervene in scheduling
 * decisions while maintaining audit trails and justifications.
 */

import { supabase } from '@/lib/supabase';
import { CRUDService } from './crud-service';
import type {
  SchedulingOverride,
  SchedulingRequest,
  SchedulingResult,
  ScheduledClass,
  SchedulingConflict,
  SchedulingRecommendation,
  SchedulingPriority,
  SchedulingOperationType
} from '@/types/scheduling';
import type { Tables } from '@/types/database';

export interface ManualOverrideContext {
  originalRecommendation?: SchedulingRecommendation;
  conflictingClasses?: ScheduledClass[];
  affectedStudents?: string[];
  affectedTeachers?: string[];
  systemJustification?: string;
}

export interface OverrideValidationResult {
  isValid: boolean;
  warnings: OverrideWarning[];
  conflicts: SchedulingConflict[];
  estimatedImpact: OverrideImpact;
}

export interface OverrideWarning {
  type: 'capacity' | 'availability' | 'policy' | 'performance' | 'resource';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  suggestedActions: string[];
}

export interface OverrideImpact {
  studentsAffected: number;
  teachersAffected: number;
  classesAffected: number;
  schedulingScore: number;
  resourceUtilization: number;
  estimatedUserSatisfaction: number;
}

export interface OverrideHistory {
  overrideId: string;
  classId: string;
  overrideType: SchedulingOverride['type'];
  reason: string;
  appliedBy: string;
  appliedAt: string;
  revertedAt?: string;
  revertedBy?: string;
  revertReason?: string;
  impact: OverrideImpact;
  context: ManualOverrideContext;
}

/**
 * Manual Override Service Class
 */
export class ManualOverrideService {
  private static instance: ManualOverrideService;
  private overrideHistoryService: CRUDService<any>; // Would map to override_history table
  private classesService: CRUDService<Tables<'classes'>>;
  private bookingsService: CRUDService<Tables<'bookings'>>;

  private constructor() {
    this.initializeServices();
  }

  public static getInstance(): ManualOverrideService {
    if (!ManualOverrideService.instance) {
      ManualOverrideService.instance = new ManualOverrideService();
    }
    return ManualOverrideService.instance;
  }

  private initializeServices(): void {
    this.classesService = new CRUDService({
      table: 'classes',
      select: '*',
      cache: { enabled: true, ttl: 60000 }
    });

    this.bookingsService = new CRUDService({
      table: 'bookings', 
      select: '*',
      cache: { enabled: true, ttl: 30000 }
    });

    // Mock service for override history
    this.overrideHistoryService = new CRUDService({
      table: 'override_history' as any,
      select: '*',
      cache: { enabled: true, ttl: 300000 }
    });
  }

  /**
   * Validate a manual override before applying it
   */
  public async validateOverride(
    override: SchedulingOverride,
    targetClass: ScheduledClass,
    context?: ManualOverrideContext
  ): Promise<OverrideValidationResult> {
    const warnings: OverrideWarning[] = [];
    const conflicts: SchedulingConflict[] = [];

    try {
      // Validate override type specific rules
      switch (override.type) {
        case 'force_schedule':
          await this.validateForceSchedule(override, targetClass, warnings, conflicts);
          break;
        case 'prevent_schedule':
          await this.validatePreventSchedule(override, targetClass, warnings, conflicts);
          break;
        case 'preferred_teacher':
          await this.validateTeacherPreference(override, targetClass, warnings, conflicts);
          break;
        case 'preferred_time':
          await this.validateTimePreference(override, targetClass, warnings, conflicts);
          break;
        case 'class_size':
          await this.validateClassSizeOverride(override, targetClass, warnings, conflicts);
          break;
      }

      // Calculate estimated impact
      const impact = await this.calculateOverrideImpact(override, targetClass, context);

      // Determine if override is valid based on warnings and conflicts
      const criticalIssues = warnings.filter(w => w.severity === 'critical').length +
                            conflicts.filter(c => c.severity === 'critical').length;

      return {
        isValid: criticalIssues === 0,
        warnings,
        conflicts,
        estimatedImpact: impact
      };

    } catch (error) {
      return {
        isValid: false,
        warnings: [{
          type: 'performance',
          severity: 'critical',
          message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          suggestedActions: ['Contact system administrator', 'Check system logs']
        }],
        conflicts: [],
        estimatedImpact: {
          studentsAffected: 0,
          teachersAffected: 0,
          classesAffected: 0,
          schedulingScore: 0,
          resourceUtilization: 0,
          estimatedUserSatisfaction: 0
        }
      };
    }
  }

  /**
   * Apply a validated manual override
   */
  public async applyOverride(
    override: SchedulingOverride,
    targetClass: ScheduledClass,
    context?: ManualOverrideContext
  ): Promise<{
    success: boolean;
    updatedClass?: ScheduledClass;
    overrideHistory?: OverrideHistory;
    error?: string;
  }> {
    try {
      // Validate override first
      const validation = await this.validateOverride(override, targetClass, context);
      
      if (!validation.isValid) {
        const criticalErrors = validation.warnings
          .filter(w => w.severity === 'critical')
          .map(w => w.message)
          .join('; ');
        
        return {
          success: false,
          error: `Override validation failed: ${criticalErrors}`
        };
      }

      // Apply the override based on type
      let updatedClass: ScheduledClass;

      switch (override.type) {
        case 'force_schedule':
          updatedClass = await this.applyForceSchedule(override, targetClass);
          break;
        case 'prevent_schedule':
          updatedClass = await this.applyPreventSchedule(override, targetClass);
          break;
        case 'preferred_teacher':
          updatedClass = await this.applyTeacherPreference(override, targetClass);
          break;
        case 'preferred_time':
          updatedClass = await this.applyTimePreference(override, targetClass);
          break;
        case 'class_size':
          updatedClass = await this.applyClassSizeOverride(override, targetClass);
          break;
        default:
          throw new Error(`Unsupported override type: ${override.type}`);
      }

      // Record override in history
      const overrideHistory: OverrideHistory = {
        overrideId: `override-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        classId: targetClass.id,
        overrideType: override.type,
        reason: override.reason,
        appliedBy: override.appliedBy,
        appliedAt: override.appliedAt,
        impact: validation.estimatedImpact,
        context: context || {}
      };

      // Save to database (in real implementation)
      // await this.overrideHistoryService.create(overrideHistory);

      return {
        success: true,
        updatedClass,
        overrideHistory
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Revert a manual override
   */
  public async revertOverride(
    overrideId: string,
    revertedBy: string,
    revertReason: string
  ): Promise<{
    success: boolean;
    originalClass?: ScheduledClass;
    error?: string;
  }> {
    try {
      // Get override history
      const { data: overrideHistory, error } = await this.overrideHistoryService.getById(overrideId);
      
      if (error || !overrideHistory) {
        return {
          success: false,
          error: 'Override history not found'
        };
      }

      // Get current class state
      const { data: currentClass, error: classError } = await this.classesService.getById(overrideHistory.classId);
      
      if (classError || !currentClass) {
        return {
          success: false,
          error: 'Class not found'
        };
      }

      // Revert the override by applying inverse operation
      const originalClass = await this.revertOverrideChanges(overrideHistory, currentClass as any);

      // Update override history with revert information
      await this.overrideHistoryService.update(overrideId, {
        revertedAt: new Date().toISOString(),
        revertedBy,
        revertReason
      });

      return {
        success: true,
        originalClass
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get override history for a class or user
   */
  public async getOverrideHistory(filters: {
    classId?: string;
    userId?: string;
    dateRange?: { start: string; end: string };
    overrideType?: SchedulingOverride['type'];
  }): Promise<OverrideHistory[]> {
    try {
      // In real implementation, would query override_history table with filters
      // For now, return mock data
      const mockHistory: OverrideHistory[] = [
        {
          overrideId: 'override-001',
          classId: 'class-001',
          overrideType: 'force_schedule',
          reason: 'Emergency scheduling due to teacher illness',
          appliedBy: 'admin-001',
          appliedAt: new Date().toISOString(),
          impact: {
            studentsAffected: 5,
            teachersAffected: 2,
            classesAffected: 1,
            schedulingScore: 0.75,
            resourceUtilization: 0.82,
            estimatedUserSatisfaction: 0.7
          },
          context: {
            systemJustification: 'Original teacher unavailable due to illness',
            affectedStudents: ['student-001', 'student-002', 'student-003'],
            affectedTeachers: ['teacher-002']
          }
        }
      ];

      // Apply filters
      let filtered = mockHistory;

      if (filters.classId) {
        filtered = filtered.filter(h => h.classId === filters.classId);
      }

      if (filters.userId) {
        filtered = filtered.filter(h => h.appliedBy === filters.userId);
      }

      if (filters.overrideType) {
        filtered = filtered.filter(h => h.overrideType === filters.overrideType);
      }

      return filtered;

    } catch (error) {
      logger.error('Error getting override history:', error);
      return [];
    }
  }

  /**
   * Generate override suggestions based on current conflicts
   */
  public async generateOverrideSuggestions(
    conflicts: SchedulingConflict[],
    targetClass: ScheduledClass
  ): Promise<SchedulingOverride[]> {
    const suggestions: SchedulingOverride[] = [];

    for (const conflict of conflicts) {
      switch (conflict.type) {
        case 'teacher_unavailable':
          suggestions.push({
            type: 'preferred_teacher',
            parameters: { 
              alternativeTeacher: 'teacher-backup',
              reason: 'Original teacher unavailable' 
            },
            reason: `Resolve teacher conflict: ${conflict.description}`,
            priority: conflict.severity === 'high' ? 'urgent' : 'high',
            appliedBy: 'system',
            appliedAt: new Date().toISOString()
          });
          break;

        case 'capacity_exceeded':
          suggestions.push({
            type: 'class_size',
            parameters: { 
              maxCapacity: 9,
              splitClass: true 
            },
            reason: `Resolve capacity conflict: ${conflict.description}`,
            priority: 'high',
            appliedBy: 'system',
            appliedAt: new Date().toISOString()
          });
          break;

        case 'time_overlap':
          suggestions.push({
            type: 'preferred_time',
            parameters: { 
              alternativeTimeSlot: 'next_available',
              maintainDuration: true 
            },
            reason: `Resolve time conflict: ${conflict.description}`,
            priority: 'medium',
            appliedBy: 'system',
            appliedAt: new Date().toISOString()
          });
          break;
      }
    }

    return suggestions;
  }

  // Private validation methods
  private async validateForceSchedule(
    override: SchedulingOverride,
    targetClass: ScheduledClass,
    warnings: OverrideWarning[],
    conflicts: SchedulingConflict[]
  ): Promise<void> {
    // Check if force scheduling violates critical constraints
    if (targetClass.studentIds.length > 9) {
      warnings.push({
        type: 'capacity',
        severity: 'critical',
        message: 'Force scheduling exceeds maximum class capacity of 9 students',
        suggestedActions: ['Split class into multiple sessions', 'Reduce student count']
      });
    }

    // Check teacher availability
    const teacherAvailable = await this.checkTeacherAvailability(
      targetClass.teacherId,
      targetClass.timeSlot
    );

    if (!teacherAvailable) {
      warnings.push({
        type: 'availability',
        severity: 'high',
        message: 'Teacher is not available at the scheduled time',
        suggestedActions: ['Assign different teacher', 'Reschedule to available time']
      });
    }
  }

  private async validatePreventSchedule(
    override: SchedulingOverride,
    targetClass: ScheduledClass,
    warnings: OverrideWarning[],
    conflicts: SchedulingConflict[]
  ): Promise<void> {
    // Check if preventing schedule affects student progress
    warnings.push({
      type: 'performance',
      severity: 'medium',
      message: 'Preventing schedule may impact student learning progression',
      suggestedActions: ['Provide alternative learning resources', 'Schedule makeup session']
    });
  }

  private async validateTeacherPreference(
    override: SchedulingOverride,
    targetClass: ScheduledClass,
    warnings: OverrideWarning[],
    conflicts: SchedulingConflict[]
  ): Promise<void> {
    const preferredTeacher = override.parameters.preferredTeacher;
    
    if (preferredTeacher) {
      const isAvailable = await this.checkTeacherAvailability(preferredTeacher, targetClass.timeSlot);
      
      if (!isAvailable) {
        warnings.push({
          type: 'availability',
          severity: 'high',
          message: 'Preferred teacher is not available at the scheduled time',
          suggestedActions: ['Choose different teacher', 'Reschedule class']
        });
      }
    }
  }

  private async validateTimePreference(
    override: SchedulingOverride,
    targetClass: ScheduledClass,
    warnings: OverrideWarning[],
    conflicts: SchedulingConflict[]
  ): Promise<void> {
    // Validate new time slot doesn't conflict with existing bookings
    const timeSlot = override.parameters.preferredTimeSlot;
    
    if (timeSlot) {
      const hasConflicts = await this.checkTimeSlotConflicts(timeSlot, targetClass.studentIds);
      
      if (hasConflicts) {
        conflicts.push({
          id: `conflict-${Date.now()}`,
          type: 'time_overlap',
          severity: 'medium',
          entityIds: targetClass.studentIds,
          description: 'Preferred time slot conflicts with existing student bookings',
          resolutions: [],
          detectedAt: new Date().toISOString()
        });
      }
    }
  }

  private async validateClassSizeOverride(
    override: SchedulingOverride,
    targetClass: ScheduledClass,
    warnings: OverrideWarning[],
    conflicts: SchedulingConflict[]
  ): Promise<void> {
    const newCapacity = override.parameters.maxCapacity;
    
    if (newCapacity > 9) {
      warnings.push({
        type: 'policy',
        severity: 'critical',
        message: 'Class size cannot exceed system maximum of 9 students',
        suggestedActions: ['Split into multiple classes', 'Reduce enrollment']
      });
    }
  }

  // Private implementation methods
  private async calculateOverrideImpact(
    override: SchedulingOverride,
    targetClass: ScheduledClass,
    context?: ManualOverrideContext
  ): Promise<OverrideImpact> {
    return {
      studentsAffected: targetClass.studentIds.length,
      teachersAffected: 1,
      classesAffected: 1,
      schedulingScore: 0.75, // Mock score
      resourceUtilization: 0.8,
      estimatedUserSatisfaction: 0.7
    };
  }

  private async applyForceSchedule(
    override: SchedulingOverride,
    targetClass: ScheduledClass
  ): Promise<ScheduledClass> {
    return {
      ...targetClass,
      status: 'scheduled',
      rationale: `Force scheduled: ${override.reason}`,
      metadata: {
        ...targetClass.metadata,
        manualOverride: true,
        overrideType: override.type,
        overrideReason: override.reason
      }
    };
  }

  private async applyPreventSchedule(
    override: SchedulingOverride,
    targetClass: ScheduledClass
  ): Promise<ScheduledClass> {
    return {
      ...targetClass,
      status: 'cancelled',
      rationale: `Prevented: ${override.reason}`,
      metadata: {
        ...targetClass.metadata,
        manualOverride: true,
        overrideType: override.type,
        overrideReason: override.reason
      }
    };
  }

  private async applyTeacherPreference(
    override: SchedulingOverride,
    targetClass: ScheduledClass
  ): Promise<ScheduledClass> {
    return {
      ...targetClass,
      teacherId: override.parameters.preferredTeacher || targetClass.teacherId,
      rationale: `Teacher override: ${override.reason}`,
      metadata: {
        ...targetClass.metadata,
        manualOverride: true,
        overrideType: override.type,
        overrideReason: override.reason,
        originalTeacher: targetClass.teacherId
      }
    };
  }

  private async applyTimePreference(
    override: SchedulingOverride,
    targetClass: ScheduledClass
  ): Promise<ScheduledClass> {
    const newTimeSlot = override.parameters.preferredTimeSlot || targetClass.timeSlot;
    
    return {
      ...targetClass,
      timeSlot: newTimeSlot,
      rationale: `Time override: ${override.reason}`,
      metadata: {
        ...targetClass.metadata,
        manualOverride: true,
        overrideType: override.type,
        overrideReason: override.reason,
        originalTimeSlot: targetClass.timeSlot
      }
    };
  }

  private async applyClassSizeOverride(
    override: SchedulingOverride,
    targetClass: ScheduledClass
  ): Promise<ScheduledClass> {
    const newCapacity = override.parameters.maxCapacity;
    
    return {
      ...targetClass,
      timeSlot: {
        ...targetClass.timeSlot,
        capacity: {
          ...targetClass.timeSlot.capacity,
          maxStudents: newCapacity
        }
      },
      rationale: `Capacity override: ${override.reason}`,
      metadata: {
        ...targetClass.metadata,
        manualOverride: true,
        overrideType: override.type,
        overrideReason: override.reason,
        originalCapacity: targetClass.timeSlot.capacity.maxStudents
      }
    };
  }

  private async revertOverrideChanges(
    overrideHistory: OverrideHistory,
    currentClass: ScheduledClass
  ): Promise<ScheduledClass> {
    // Revert changes based on override type and stored metadata
    const metadata = currentClass.metadata || {};
    
    switch (overrideHistory.overrideType) {
      case 'preferred_teacher':
        return {
          ...currentClass,
          teacherId: metadata.originalTeacher || currentClass.teacherId,
          metadata: { ...metadata, manualOverride: false }
        };
        
      case 'preferred_time':
        return {
          ...currentClass,
          timeSlot: metadata.originalTimeSlot || currentClass.timeSlot,
          metadata: { ...metadata, manualOverride: false }
        };
        
      case 'class_size':
        return {
          ...currentClass,
          timeSlot: {
            ...currentClass.timeSlot,
            capacity: {
              ...currentClass.timeSlot.capacity,
              maxStudents: metadata.originalCapacity || 9
            }
          },
          metadata: { ...metadata, manualOverride: false }
        };
        
      default:
        return currentClass;
    }
  }

  // Helper methods
  private async checkTeacherAvailability(teacherId: string, timeSlot: any): Promise<boolean> {
    // Mock availability check
    return Math.random() > 0.3; // 70% chance teacher is available
  }

  private async checkTimeSlotConflicts(timeSlot: any, studentIds: string[]): Promise<boolean> {
    // Mock conflict check
    return Math.random() > 0.8; // 20% chance of conflicts
  }
}

// Export singleton instance
export const manualOverrideService = ManualOverrideService.getInstance();