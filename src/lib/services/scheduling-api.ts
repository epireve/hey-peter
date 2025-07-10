/**
 * HeyPeter Academy - Scheduling API Layer
 * 
 * This module provides the API interface for the scheduling system.
 * It handles HTTP requests, validation, authentication, and coordinates
 * with the core scheduling service.
 * 
 * Key Features:
 * - RESTful API endpoints for scheduling operations
 * - Request validation and error handling
 * - Authentication and authorization
 * - Real-time updates via WebSocket
 * - Comprehensive logging and monitoring
 */

import { supabase } from '@/lib/supabase';
import { schedulingService } from './scheduling-service';
import type {
  SchedulingRequest,
  SchedulingResult,
  SchedulingApiResponse,
  SchedulingPaginatedResponse,
  SchedulingServiceState,
  SchedulingAlgorithmConfig,
  StudentProgress,
  ScheduledClass,
  SchedulingConflict,
  DailyUpdateStatus,
  ContentSyncStatus,
  SchedulingEvent,
  SchedulingError,
} from '@/types/scheduling';

/**
 * Request validation schemas
 */
export interface CreateSchedulingRequestBody {
  type: 'auto_schedule' | 'reschedule' | 'conflict_resolution' | 'optimization' | 'content_sync' | 'manual_override';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  studentIds: string[];
  courseId: string;
  preferredTimeSlots?: any[];
  contentToSchedule?: string[];
  constraints?: any;
  manualOverrides?: any[];
  context?: Record<string, any>;
}

export interface UpdateSchedulingConfigBody {
  version?: string;
  maxProcessingTime?: number;
  enableConflictResolution?: boolean;
  enableContentSync?: boolean;
  enablePerformanceOptimization?: boolean;
  maxOptimizationIterations?: number;
  scoringWeights?: any;
  constraints?: any;
}

export interface SchedulingQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  courseId?: string;
  studentId?: string;
  teacherId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Main scheduling API service
 */
export class SchedulingAPI {
  private static instance: SchedulingAPI;

  private constructor() {}

  public static getInstance(): SchedulingAPI {
    if (!SchedulingAPI.instance) {
      SchedulingAPI.instance = new SchedulingAPI();
    }
    return SchedulingAPI.instance;
  }

  // =====================================================================================
  // SCHEDULING REQUEST ENDPOINTS
  // =====================================================================================

  /**
   * Create a new scheduling request
   * POST /api/scheduling/requests
   */
  async createSchedulingRequest(
    requestBody: CreateSchedulingRequestBody,
    userId: string
  ): Promise<SchedulingApiResponse<SchedulingResult>> {
    try {
      // Validate request
      this.validateCreateSchedulingRequest(requestBody);

      // Create scheduling request object
      const schedulingRequest: SchedulingRequest = {
        id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: requestBody.type,
        priority: requestBody.priority || 'medium',
        studentIds: requestBody.studentIds,
        courseId: requestBody.courseId,
        preferredTimeSlots: requestBody.preferredTimeSlots,
        contentToSchedule: requestBody.contentToSchedule,
        constraints: requestBody.constraints,
        manualOverrides: requestBody.manualOverrides,
        context: requestBody.context,
        requestedAt: new Date().toISOString(),
        requestedBy: userId,
      };

      // Store request in database
      await this.storeSchedulingRequest(schedulingRequest);

      // Process scheduling request
      const result = await schedulingService.scheduleClasses(schedulingRequest);

      // Store result in database
      await this.storeSchedulingResult(result);

      return {
        success: true,
        data: result,
        metadata: {
          requestId: schedulingRequest.id,
          timestamp: new Date().toISOString(),
          processingTime: result.timestamps.processingTime,
          version: '1.0.0',
        },
      };
    } catch (error) {
      const schedulingError: SchedulingError = {
        code: 'API_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        category: 'system',
        severity: 'error',
        timestamp: new Date().toISOString(),
      };

      return {
        success: false,
        error: schedulingError,
        metadata: {
          requestId: '',
          timestamp: new Date().toISOString(),
          processingTime: 0,
          version: '1.0.0',
        },
      };
    }
  }

  /**
   * Get scheduling request by ID
   * GET /api/scheduling/requests/:id
   */
  async getSchedulingRequest(requestId: string): Promise<SchedulingApiResponse<SchedulingRequest>> {
    try {
      const { data: request, error } = await supabase
        .from('scheduling_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (error || !request) {
        throw new Error('Scheduling request not found');
      }

      return {
        success: true,
        data: this.mapDatabaseToSchedulingRequest(request),
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          processingTime: 0,
          version: '1.0.0',
        },
      };
    } catch (error) {
      return this.createErrorResponse(error, 'GET_REQUEST_ERROR');
    }
  }

  /**
   * Get all scheduling requests with pagination
   * GET /api/scheduling/requests
   */
  async getSchedulingRequests(
    queryParams: SchedulingQueryParams
  ): Promise<SchedulingPaginatedResponse<SchedulingRequest>> {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        type,
        courseId,
        studentId,
        dateFrom,
        dateTo,
        sortBy = 'created_at',
        sortOrder = 'desc',
      } = queryParams;

      let query = supabase
        .from('scheduling_requests')
        .select('*', { count: 'exact' });

      // Apply filters
      if (status) query = query.eq('status', status);
      if (type) query = query.eq('request_type', type);
      if (courseId) query = query.eq('course_id', courseId);
      if (studentId) query = query.contains('student_ids', [studentId]);
      if (dateFrom) query = query.gte('created_at', dateFrom);
      if (dateTo) query = query.lte('created_at', dateTo);

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const start = (page - 1) * limit;
      const end = start + limit - 1;
      query = query.range(start, end);

      const { data: requests, error, count } = await query;

      if (error) {
        throw new Error('Failed to fetch scheduling requests');
      }

      const mappedRequests = requests?.map(this.mapDatabaseToSchedulingRequest) || [];

      return {
        items: mappedRequests,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
          hasNext: (count || 0) > end + 1,
          hasPrevious: page > 1,
        },
        filters: queryParams,
        sorting: { field: sortBy, direction: sortOrder },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Cancel a scheduling request
   * DELETE /api/scheduling/requests/:id
   */
  async cancelSchedulingRequest(
    requestId: string,
    userId: string
  ): Promise<SchedulingApiResponse<{ cancelled: boolean }>> {
    try {
      const { error } = await supabase
        .from('scheduling_requests')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .eq('requested_by', userId); // Ensure user can only cancel their own requests

      if (error) {
        throw new Error('Failed to cancel scheduling request');
      }

      return {
        success: true,
        data: { cancelled: true },
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          processingTime: 0,
          version: '1.0.0',
        },
      };
    } catch (error) {
      return this.createErrorResponse(error, 'CANCEL_REQUEST_ERROR');
    }
  }

  // =====================================================================================
  // SCHEDULED CLASSES ENDPOINTS
  // =====================================================================================

  /**
   * Get scheduled classes with filters
   * GET /api/scheduling/classes
   */
  async getScheduledClasses(
    queryParams: SchedulingQueryParams
  ): Promise<SchedulingPaginatedResponse<ScheduledClass>> {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        courseId,
        studentId,
        teacherId,
        dateFrom,
        dateTo,
        sortBy = 'scheduled_date',
        sortOrder = 'asc',
      } = queryParams;

      let query = supabase
        .from('scheduled_classes_detailed') // Use the view for detailed data
        .select('*', { count: 'exact' });

      // Apply filters
      if (status) query = query.eq('status', status);
      if (courseId) query = query.eq('course_id', courseId);
      if (teacherId) query = query.eq('teacher_id', teacherId);
      if (dateFrom) query = query.gte('scheduled_date', dateFrom);
      if (dateTo) query = query.lte('scheduled_date', dateTo);

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const start = (page - 1) * limit;
      const end = start + limit - 1;
      query = query.range(start, end);

      const { data: classes, error, count } = await query;

      if (error) {
        throw new Error('Failed to fetch scheduled classes');
      }

      const mappedClasses = classes?.map(this.mapDatabaseToScheduledClass) || [];

      return {
        items: mappedClasses,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
          hasNext: (count || 0) > end + 1,
          hasPrevious: page > 1,
        },
        filters: queryParams,
        sorting: { field: sortBy, direction: sortOrder },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get scheduled class by ID
   * GET /api/scheduling/classes/:id
   */
  async getScheduledClass(classId: string): Promise<SchedulingApiResponse<ScheduledClass>> {
    try {
      const { data: scheduledClass, error } = await supabase
        .from('scheduled_classes_detailed')
        .select('*')
        .eq('id', classId)
        .single();

      if (error || !scheduledClass) {
        throw new Error('Scheduled class not found');
      }

      return {
        success: true,
        data: this.mapDatabaseToScheduledClass(scheduledClass),
        metadata: {
          requestId: classId,
          timestamp: new Date().toISOString(),
          processingTime: 0,
          version: '1.0.0',
        },
      };
    } catch (error) {
      return this.createErrorResponse(error, 'GET_CLASS_ERROR');
    }
  }

  /**
   * Update scheduled class
   * PUT /api/scheduling/classes/:id
   */
  async updateScheduledClass(
    classId: string,
    updates: Partial<ScheduledClass>,
    userId: string
  ): Promise<SchedulingApiResponse<ScheduledClass>> {
    try {
      // Validate permissions
      await this.validateClassUpdatePermissions(classId, userId);

      const { data: updatedClass, error } = await supabase
        .from('scheduled_classes')
        .update({
          ...this.mapScheduledClassToDatabase(updates),
          updated_at: new Date().toISOString(),
        })
        .eq('id', classId)
        .select()
        .single();

      if (error || !updatedClass) {
        throw new Error('Failed to update scheduled class');
      }

      return {
        success: true,
        data: this.mapDatabaseToScheduledClass(updatedClass),
        metadata: {
          requestId: classId,
          timestamp: new Date().toISOString(),
          processingTime: 0,
          version: '1.0.0',
        },
      };
    } catch (error) {
      return this.createErrorResponse(error, 'UPDATE_CLASS_ERROR');
    }
  }

  // =====================================================================================
  // CONFLICT MANAGEMENT ENDPOINTS
  // =====================================================================================

  /**
   * Get scheduling conflicts
   * GET /api/scheduling/conflicts
   */
  async getSchedulingConflicts(
    queryParams: SchedulingQueryParams
  ): Promise<SchedulingPaginatedResponse<SchedulingConflict>> {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        sortBy = 'detected_at',
        sortOrder = 'desc',
      } = queryParams;

      let query = supabase
        .from('scheduling_conflicts')
        .select('*', { count: 'exact' });

      // Apply filters
      if (status) query = query.eq('resolution_status', status);

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const start = (page - 1) * limit;
      const end = start + limit - 1;
      query = query.range(start, end);

      const { data: conflicts, error, count } = await query;

      if (error) {
        throw new Error('Failed to fetch scheduling conflicts');
      }

      const mappedConflicts = conflicts?.map(this.mapDatabaseToSchedulingConflict) || [];

      return {
        items: mappedConflicts,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
          hasNext: (count || 0) > end + 1,
          hasPrevious: page > 1,
        },
        filters: queryParams,
        sorting: { field: sortBy, direction: sortOrder },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Resolve a scheduling conflict
   * POST /api/scheduling/conflicts/:id/resolve
   */
  async resolveSchedulingConflict(
    conflictId: string,
    resolutionType: string,
    userId: string
  ): Promise<SchedulingApiResponse<{ resolved: boolean }>> {
    try {
      // Update conflict status
      const { error } = await supabase
        .from('scheduling_conflicts')
        .update({
          resolution_status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolution_method: resolutionType,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conflictId);

      if (error) {
        throw new Error('Failed to resolve scheduling conflict');
      }

      // Log resolution event
      await this.logSchedulingEvent('conflict_resolved', 'api', 'conflict', conflictId, {
        resolutionType,
        resolvedBy: userId,
      });

      return {
        success: true,
        data: { resolved: true },
        metadata: {
          requestId: conflictId,
          timestamp: new Date().toISOString(),
          processingTime: 0,
          version: '1.0.0',
        },
      };
    } catch (error) {
      return this.createErrorResponse(error, 'RESOLVE_CONFLICT_ERROR');
    }
  }

  // =====================================================================================
  // SYSTEM CONFIGURATION ENDPOINTS
  // =====================================================================================

  /**
   * Get current scheduling configuration
   * GET /api/scheduling/config
   */
  async getSchedulingConfig(): Promise<SchedulingApiResponse<SchedulingAlgorithmConfig>> {
    try {
      const { data: config, error } = await supabase
        .from('scheduling_config')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error || !config) {
        throw new Error('No active scheduling configuration found');
      }

      return {
        success: true,
        data: config.config_data as SchedulingAlgorithmConfig,
        metadata: {
          requestId: config.id,
          timestamp: new Date().toISOString(),
          processingTime: 0,
          version: '1.0.0',
        },
      };
    } catch (error) {
      return this.createErrorResponse(error, 'GET_CONFIG_ERROR');
    }
  }

  /**
   * Update scheduling configuration
   * PUT /api/scheduling/config
   */
  async updateSchedulingConfig(
    updates: UpdateSchedulingConfigBody,
    userId: string
  ): Promise<SchedulingApiResponse<SchedulingAlgorithmConfig>> {
    try {
      // Get current config
      const { data: currentConfig } = await this.getSchedulingConfig();
      if (!currentConfig.success) {
        throw new Error('Failed to get current configuration');
      }

      // Merge updates with current config
      const newConfig = { ...currentConfig.data, ...updates };

      // Deactivate current config
      await supabase
        .from('scheduling_config')
        .update({ is_active: false })
        .eq('is_active', true);

      // Create new config
      const { data: savedConfig, error } = await supabase
        .from('scheduling_config')
        .insert({
          version: newConfig.version,
          is_active: true,
          config_data: newConfig,
          created_by: userId,
          activated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw new Error('Failed to save new configuration');
      }

      // Update scheduling service configuration
      schedulingService.updateConfiguration(newConfig);

      return {
        success: true,
        data: newConfig,
        metadata: {
          requestId: savedConfig.id,
          timestamp: new Date().toISOString(),
          processingTime: 0,
          version: '1.0.0',
        },
      };
    } catch (error) {
      return this.createErrorResponse(error, 'UPDATE_CONFIG_ERROR');
    }
  }

  /**
   * Get system status and health
   * GET /api/scheduling/status
   */
  async getSystemStatus(): Promise<SchedulingApiResponse<any>> {
    try {
      const healthStatus = schedulingService.getHealthStatus();
      const serviceState = schedulingService.getState();

      return {
        success: true,
        data: {
          health: healthStatus,
          state: serviceState,
          lastUpdate: new Date().toISOString(),
        },
        metadata: {
          requestId: 'system-status',
          timestamp: new Date().toISOString(),
          processingTime: 0,
          version: '1.0.0',
        },
      };
    } catch (error) {
      return this.createErrorResponse(error, 'GET_STATUS_ERROR');
    }
  }

  // =====================================================================================
  // ANALYTICS AND REPORTING ENDPOINTS
  // =====================================================================================

  /**
   * Get scheduling analytics
   * GET /api/scheduling/analytics
   */
  async getSchedulingAnalytics(
    dateFrom?: string,
    dateTo?: string
  ): Promise<SchedulingApiResponse<any>> {
    try {
      let query = supabase
        .from('scheduling_analytics')
        .select('*')
        .order('snapshot_date', { ascending: false });

      if (dateFrom) query = query.gte('snapshot_date', dateFrom);
      if (dateTo) query = query.lte('snapshot_date', dateTo);

      const { data: analytics, error } = await query.limit(30);

      if (error) {
        throw new Error('Failed to fetch scheduling analytics');
      }

      return {
        success: true,
        data: analytics,
        metadata: {
          requestId: 'analytics',
          timestamp: new Date().toISOString(),
          processingTime: 0,
          version: '1.0.0',
        },
      };
    } catch (error) {
      return this.createErrorResponse(error, 'GET_ANALYTICS_ERROR');
    }
  }

  // =====================================================================================
  // UTILITY METHODS
  // =====================================================================================

  /**
   * Validate create scheduling request
   */
  private validateCreateSchedulingRequest(request: CreateSchedulingRequestBody): void {
    if (!request.studentIds || request.studentIds.length === 0) {
      throw new Error('At least one student ID is required');
    }

    if (!request.courseId) {
      throw new Error('Course ID is required');
    }

    if (request.studentIds.length > 9) {
      throw new Error('Cannot schedule more than 9 students per class');
    }

    const validTypes = ['auto_schedule', 'reschedule', 'conflict_resolution', 'optimization', 'content_sync', 'manual_override'];
    if (!validTypes.includes(request.type)) {
      throw new Error(`Invalid request type. Must be one of: ${validTypes.join(', ')}`);
    }
  }

  /**
   * Store scheduling request in database
   */
  private async storeSchedulingRequest(request: SchedulingRequest): Promise<void> {
    const { error } = await supabase
      .from('scheduling_requests')
      .insert({
        id: request.id,
        request_type: request.type,
        priority: request.priority,
        student_ids: request.studentIds,
        course_id: request.courseId,
        preferred_time_slots: request.preferredTimeSlots,
        content_to_schedule: request.contentToSchedule,
        constraints_override: request.constraints,
        manual_overrides: request.manualOverrides,
        context_data: request.context,
        status: 'processing',
        requested_by: request.requestedBy,
        created_at: request.requestedAt,
      });

    if (error) {
      throw new Error('Failed to store scheduling request');
    }
  }

  /**
   * Store scheduling result in database
   */
  private async storeSchedulingResult(result: SchedulingResult): Promise<void> {
    const { error } = await supabase
      .from('scheduling_results')
      .insert({
        request_id: result.requestId,
        success: result.success,
        scheduled_classes: result.scheduledClasses,
        conflicts_detected: result.conflicts,
        recommendations: result.recommendations,
        metrics: result.metrics,
        processing_time: result.timestamps.processingTime,
        algorithm_version: '1.0.0',
      });

    if (error) {
      throw new Error('Failed to store scheduling result');
    }

    // Update request status
    await supabase
      .from('scheduling_requests')
      .update({
        status: result.success ? 'completed' : 'failed',
        processed_at: result.timestamps.completed,
        processing_time: result.timestamps.processingTime,
        error_details: result.error,
      })
      .eq('id', result.requestId);
  }

  /**
   * Validate class update permissions
   */
  private async validateClassUpdatePermissions(classId: string, userId: string): Promise<void> {
    // Check if user has permission to update this class
    // This would implement role-based access control
    const { data: user, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw new Error('User not found');
    }

    if (!['admin', 'teacher'].includes(user.role)) {
      throw new Error('Insufficient permissions to update scheduled class');
    }
  }

  /**
   * Log scheduling event
   */
  private async logSchedulingEvent(
    eventType: string,
    source: string,
    entityType: string,
    entityId: string,
    data: Record<string, any>
  ): Promise<void> {
    await supabase
      .from('scheduling_events')
      .insert({
        event_type: eventType,
        event_source: source,
        entity_type: entityType,
        entity_id: entityId,
        event_data: data,
        timestamp: new Date().toISOString(),
      });
  }

  /**
   * Create error response
   */
  private createErrorResponse(error: any, code: string): SchedulingApiResponse<any> {
    const schedulingError: SchedulingError = {
      code,
      message: error instanceof Error ? error.message : 'Unknown error',
      category: 'system',
      severity: 'error',
      timestamp: new Date().toISOString(),
    };

    return {
      success: false,
      error: schedulingError,
      metadata: {
        requestId: '',
        timestamp: new Date().toISOString(),
        processingTime: 0,
        version: '1.0.0',
      },
    };
  }

  /**
   * Map database record to SchedulingRequest
   */
  private mapDatabaseToSchedulingRequest(record: any): SchedulingRequest {
    return {
      id: record.id,
      type: record.request_type,
      priority: record.priority,
      studentIds: record.student_ids,
      courseId: record.course_id,
      preferredTimeSlots: record.preferred_time_slots,
      contentToSchedule: record.content_to_schedule,
      constraints: record.constraints_override,
      manualOverrides: record.manual_overrides,
      context: record.context_data,
      requestedAt: record.created_at,
      requestedBy: record.requested_by,
    };
  }

  /**
   * Map database record to ScheduledClass
   */
  private mapDatabaseToScheduledClass(record: any): ScheduledClass {
    return {
      id: record.id,
      courseId: record.course_id,
      teacherId: record.teacher_id,
      studentIds: [], // Would be populated from enrollments
      timeSlot: {
        id: record.id,
        startTime: record.start_time,
        endTime: record.end_time,
        duration: record.duration_minutes,
        dayOfWeek: new Date(record.scheduled_date).getDay(),
        isAvailable: record.status === 'scheduled',
        capacity: {
          maxStudents: record.max_capacity,
          minStudents: 1,
          currentEnrollment: record.current_enrollment,
          availableSpots: record.max_capacity - record.current_enrollment,
        },
        location: record.location,
      },
      content: [], // Would be populated from content IDs
      classType: record.class_type,
      status: record.status,
      confidenceScore: record.confidence_score || 0,
      rationale: record.scheduling_rationale || '',
      alternatives: [],
    };
  }

  /**
   * Map ScheduledClass to database record
   */
  private mapScheduledClassToDatabase(scheduledClass: Partial<ScheduledClass>): any {
    return {
      course_id: scheduledClass.courseId,
      teacher_id: scheduledClass.teacherId,
      class_type: scheduledClass.classType,
      scheduled_date: scheduledClass.timeSlot ? new Date(scheduledClass.timeSlot.startTime).toISOString().split('T')[0] : undefined,
      start_time: scheduledClass.timeSlot?.startTime,
      end_time: scheduledClass.timeSlot?.endTime,
      duration_minutes: scheduledClass.timeSlot?.duration,
      max_capacity: scheduledClass.timeSlot?.capacity.maxStudents,
      location: scheduledClass.timeSlot?.location,
      status: scheduledClass.status,
      confidence_score: scheduledClass.confidenceScore,
      scheduling_rationale: scheduledClass.rationale,
    };
  }

  /**
   * Map database record to SchedulingConflict
   */
  private mapDatabaseToSchedulingConflict(record: any): SchedulingConflict {
    return {
      id: record.id,
      type: record.conflict_type,
      severity: record.severity,
      entityIds: record.entity_ids,
      description: record.description,
      resolutions: [], // Would be populated from resolutions table
      detectedAt: record.detected_at,
      metadata: record.metadata,
    };
  }
}

// Export singleton instance
export const schedulingAPI = SchedulingAPI.getInstance();

// Export types for external use
export type {
  CreateSchedulingRequestBody,
  UpdateSchedulingConfigBody,
  SchedulingQueryParams,
};