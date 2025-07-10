/**
 * Leave Rules Management Service
 * 
 * This service handles all leave rule operations including rule management,
 * validation, and leave request processing.
 */

import { createClient } from '@/lib/supabase/client';
import type {
  LeaveRule,
  LeaveRequest,
  LeaveRequestValidation,
  LeaveRuleRequest,
  LeaveRequestRequest,
  HourApiResponse,
  HourPaginatedResponse,
  ApprovalStatus
} from '@/types/hours';

export class LeaveRulesService {
  private supabase = createClient();

  /**
   * Get all leave rules
   */
  async getLeaveRules(options?: {
    isActive?: boolean;
    ruleType?: string;
    priority?: 'asc' | 'desc';
  }): Promise<HourApiResponse<LeaveRule[]>> {
    try {
      let query = this.supabase
        .from('leave_rules')
        .select('*');

      if (options?.isActive !== undefined) {
        query = query.eq('is_active', options.isActive);
      }

      if (options?.ruleType) {
        query = query.eq('rule_type', options.ruleType);
      }

      const orderDirection = options?.priority === 'asc' ? { ascending: true } : { ascending: false };
      query = query.order('priority', orderDirection);

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        data: this.transformLeaveRules(data || [])
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FETCH_RULES_ERROR',
          message: 'Failed to fetch leave rules',
          details: error
        }
      };
    }
  }

  /**
   * Get a specific leave rule
   */
  async getLeaveRule(ruleId: string): Promise<HourApiResponse<LeaveRule>> {
    try {
      const { data, error } = await this.supabase
        .from('leave_rules')
        .select('*')
        .eq('id', ruleId)
        .single();

      if (error) throw error;

      return {
        success: true,
        data: this.transformLeaveRule(data)
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FETCH_RULE_ERROR',
          message: 'Failed to fetch leave rule',
          details: error
        }
      };
    }
  }

  /**
   * Create a new leave rule
   */
  async createLeaveRule(request: LeaveRuleRequest): Promise<HourApiResponse<LeaveRule>> {
    try {
      const { data: user } = await this.supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data, error } = await this.supabase
        .from('leave_rules')
        .insert({
          name: request.name,
          description: request.description,
          rule_type: request.ruleType,
          value: request.value,
          frequency: request.frequency,
          applies_to_course_types: request.appliesToCourseTypes || [],
          applies_to_student_types: request.appliesToStudentTypes || [],
          applies_to_regions: request.appliesToRegions || [],
          blackout_dates: request.blackoutDates || [],
          conditions: request.conditions || [],
          exceptions: request.exceptions || [],
          is_active: request.isActive,
          priority: request.priority,
          metadata: request.metadata || {},
          created_by: user.user.id
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: this.transformLeaveRule(data)
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CREATE_RULE_ERROR',
          message: 'Failed to create leave rule',
          details: error
        }
      };
    }
  }

  /**
   * Update an existing leave rule
   */
  async updateLeaveRule(ruleId: string, request: Partial<LeaveRuleRequest>): Promise<HourApiResponse<LeaveRule>> {
    try {
      const { data: user } = await this.supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const updateData: any = {
        updated_by: user.user.id,
        updated_at: new Date().toISOString()
      };

      if (request.name) updateData.name = request.name;
      if (request.description !== undefined) updateData.description = request.description;
      if (request.ruleType) updateData.rule_type = request.ruleType;
      if (request.value !== undefined) updateData.value = request.value;
      if (request.frequency !== undefined) updateData.frequency = request.frequency;
      if (request.appliesToCourseTypes !== undefined) updateData.applies_to_course_types = request.appliesToCourseTypes;
      if (request.appliesToStudentTypes !== undefined) updateData.applies_to_student_types = request.appliesToStudentTypes;
      if (request.appliesToRegions !== undefined) updateData.applies_to_regions = request.appliesToRegions;
      if (request.blackoutDates !== undefined) updateData.blackout_dates = request.blackoutDates;
      if (request.conditions !== undefined) updateData.conditions = request.conditions;
      if (request.exceptions !== undefined) updateData.exceptions = request.exceptions;
      if (request.isActive !== undefined) updateData.is_active = request.isActive;
      if (request.priority !== undefined) updateData.priority = request.priority;
      if (request.metadata !== undefined) updateData.metadata = request.metadata;

      const { data, error } = await this.supabase
        .from('leave_rules')
        .update(updateData)
        .eq('id', ruleId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: this.transformLeaveRule(data)
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UPDATE_RULE_ERROR',
          message: 'Failed to update leave rule',
          details: error
        }
      };
    }
  }

  /**
   * Delete a leave rule
   */
  async deleteLeaveRule(ruleId: string): Promise<HourApiResponse<boolean>> {
    try {
      const { error } = await this.supabase
        .from('leave_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;

      return {
        success: true,
        data: true
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DELETE_RULE_ERROR',
          message: 'Failed to delete leave rule',
          details: error
        }
      };
    }
  }

  /**
   * Validate a leave request against all rules
   */
  async validateLeaveRequest(
    studentId: string,
    startDate: string,
    endDate: string,
    leaveType: string,
    affectedClasses: any[] = []
  ): Promise<HourApiResponse<LeaveRequestValidation>> {
    try {
      const { data, error } = await this.supabase.rpc('validate_leave_request', {
        p_student_id: studentId,
        p_start_date: startDate,
        p_end_date: endDate,
        p_leave_type: leaveType,
        p_affected_classes: affectedClasses
      });

      if (error) throw error;

      return {
        success: true,
        data: data as LeaveRequestValidation
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Failed to validate leave request',
          details: error
        }
      };
    }
  }

  /**
   * Create a leave request
   */
  async createLeaveRequest(request: LeaveRequestRequest): Promise<HourApiResponse<LeaveRequest>> {
    try {
      const { data: user } = await this.supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Calculate total hours from affected classes
      const totalHours = request.affectedClasses.reduce(
        (sum, cls) => sum + (cls.hoursToRefund || 0), 0
      );

      const { data, error } = await this.supabase
        .from('leave_requests')
        .insert({
          student_id: request.studentId,
          start_date: request.startDate,
          end_date: request.endDate,
          reason: request.reason,
          leave_type: request.leaveType,
          affected_classes: request.affectedClasses,
          supporting_documents: request.supportingDocuments || [],
          total_hours_requested: totalHours,
          notes: request.notes,
          created_by: user.user.id
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: this.transformLeaveRequest(data)
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CREATE_REQUEST_ERROR',
          message: 'Failed to create leave request',
          details: error
        }
      };
    }
  }

  /**
   * Get leave requests
   */
  async getLeaveRequests(options?: {
    studentId?: string;
    status?: ApprovalStatus;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<HourApiResponse<HourPaginatedResponse<LeaveRequest>>> {
    try {
      let query = this.supabase
        .from('leave_requests')
        .select('*', { count: 'exact' });

      if (options?.studentId) {
        query = query.eq('student_id', options.studentId);
      }

      if (options?.status) {
        query = query.eq('approval_status', options.status);
      }

      if (options?.startDate) {
        query = query.gte('start_date', options.startDate);
      }

      if (options?.endDate) {
        query = query.lte('end_date', options.endDate);
      }

      query = query.order('created_at', { ascending: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, (options.offset + (options.limit || 10)) - 1);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      const limit = options?.limit || 10;
      const offset = options?.offset || 0;

      return {
        success: true,
        data: {
          items: this.transformLeaveRequests(data || []),
          pagination: {
            page: Math.floor(offset / limit) + 1,
            limit,
            total: count || 0,
            totalPages: Math.ceil((count || 0) / limit),
            hasNext: offset + limit < (count || 0),
            hasPrevious: offset > 0
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FETCH_REQUESTS_ERROR',
          message: 'Failed to fetch leave requests',
          details: error
        }
      };
    }
  }

  /**
   * Get a specific leave request
   */
  async getLeaveRequest(requestId: string): Promise<HourApiResponse<LeaveRequest>> {
    try {
      const { data, error } = await this.supabase
        .from('leave_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (error) throw error;

      return {
        success: true,
        data: this.transformLeaveRequest(data)
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FETCH_REQUEST_ERROR',
          message: 'Failed to fetch leave request',
          details: error
        }
      };
    }
  }

  /**
   * Approve a leave request
   */
  async approveLeaveRequest(
    requestId: string,
    params: { 
      approvalNotes?: string;
      hoursApproved?: number;
    }
  ): Promise<HourApiResponse<LeaveRequest>> {
    try {
      const { data: user } = await this.supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data, error } = await this.supabase
        .from('leave_requests')
        .update({
          approval_status: 'approved',
          approved_by: user.user.id,
          approved_at: new Date().toISOString(),
          approval_notes: params.approvalNotes,
          total_hours_approved: params.hoursApproved
        })
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: this.transformLeaveRequest(data)
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'APPROVE_REQUEST_ERROR',
          message: 'Failed to approve leave request',
          details: error
        }
      };
    }
  }

  /**
   * Reject a leave request
   */
  async rejectLeaveRequest(
    requestId: string,
    params: { approvalNotes: string }
  ): Promise<HourApiResponse<LeaveRequest>> {
    try {
      const { data: user } = await this.supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data, error } = await this.supabase
        .from('leave_requests')
        .update({
          approval_status: 'rejected',
          approved_by: user.user.id,
          approved_at: new Date().toISOString(),
          approval_notes: params.approvalNotes
        })
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: this.transformLeaveRequest(data)
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'REJECT_REQUEST_ERROR',
          message: 'Failed to reject leave request',
          details: error
        }
      };
    }
  }

  /**
   * Get student leave statistics
   */
  async getStudentLeaveStatistics(
    studentId: string,
    year: number = new Date().getFullYear()
  ): Promise<HourApiResponse<any>> {
    try {
      const { data, error } = await this.supabase.rpc('get_student_leave_statistics', {
        p_student_id: studentId,
        p_year: year
      });

      if (error) throw error;

      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'STATS_ERROR',
          message: 'Failed to get leave statistics',
          details: error
        }
      };
    }
  }

  /**
   * Get pending leave requests for admin dashboard
   */
  async getPendingLeaveRequests(limit: number = 10): Promise<HourApiResponse<LeaveRequest[]>> {
    try {
      const { data, error } = await this.supabase
        .from('leave_requests')
        .select('*')
        .eq('approval_status', 'pending')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return {
        success: true,
        data: this.transformLeaveRequests(data || [])
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FETCH_PENDING_ERROR',
          message: 'Failed to fetch pending leave requests',
          details: error
        }
      };
    }
  }

  /**
   * Get rule violations for a leave request
   */
  async getLeaveRequestViolations(requestId: string): Promise<HourApiResponse<any[]>> {
    try {
      const { data, error } = await this.supabase
        .from('leave_rule_violations')
        .select(`
          *,
          leave_rules (name, description)
        `)
        .eq('leave_request_id', requestId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FETCH_VIOLATIONS_ERROR',
          message: 'Failed to fetch rule violations',
          details: error
        }
      };
    }
  }

  // Private transformation methods

  private transformLeaveRules(rules: any[]): LeaveRule[] {
    return rules.map(rule => this.transformLeaveRule(rule));
  }

  private transformLeaveRule(rule: any): LeaveRule {
    return {
      id: rule.id,
      name: rule.name,
      description: rule.description,
      ruleType: rule.rule_type,
      value: rule.value,
      frequency: rule.frequency,
      appliesToCourseTypes: rule.applies_to_course_types || [],
      appliesToStudentTypes: rule.applies_to_student_types || [],
      appliesToRegions: rule.applies_to_regions || [],
      blackoutDates: rule.blackout_dates || [],
      conditions: rule.conditions || [],
      exceptions: rule.exceptions || [],
      isActive: rule.is_active,
      priority: rule.priority,
      metadata: rule.metadata || {},
      createdAt: rule.created_at,
      updatedAt: rule.updated_at,
      createdBy: rule.created_by,
      updatedBy: rule.updated_by
    };
  }

  private transformLeaveRequests(requests: any[]): LeaveRequest[] {
    return requests.map(request => this.transformLeaveRequest(request));
  }

  private transformLeaveRequest(request: any): LeaveRequest {
    return {
      id: request.id,
      studentId: request.student_id,
      startDate: request.start_date,
      endDate: request.end_date,
      reason: request.reason,
      leaveType: request.leave_type,
      affectedClasses: request.affected_classes || [],
      approvalStatus: request.approval_status,
      approvedBy: request.approved_by,
      approvedAt: request.approved_at,
      approvalNotes: request.approval_notes,
      ruleValidationResults: request.rule_validation_results || [],
      supportingDocuments: request.supporting_documents || [],
      totalHoursRequested: request.total_hours_requested,
      totalHoursApproved: request.total_hours_approved,
      hoursProcessed: request.hours_processed,
      processedAt: request.processed_at,
      notes: request.notes,
      metadata: request.metadata || {},
      createdAt: request.created_at,
      updatedAt: request.updated_at,
      createdBy: request.created_by
    };
  }
}

// Export singleton instance
export const leaveRulesService = new LeaveRulesService();