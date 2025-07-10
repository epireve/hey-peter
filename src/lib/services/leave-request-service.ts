/**
 * Leave Request Service
 * 
 * This service handles all leave request operations including submission,
 * validation, approval, and refund processing with 48-hour rule enforcement.
 */

import { createClient } from '@/lib/supabase/client';
import { leaveRulesService } from './leave-rules-service';
import type {
  LeaveRequest,
  LeaveRequestSubmission,
  LeaveRequestValidation,
  LeaveRequestStatus,
  LeaveRequestType,
  HourApiResponse,
  HourPaginatedResponse,
  LEAVE_REQUEST_REFUND_PERCENTAGES
} from '@/types/hours';

export class LeaveRequestService {
  private supabase = createClient();

  /**
   * Validate a leave request before submission
   */
  async validateLeaveRequest(
    studentId: string,
    classDate: string,
    leaveType: LeaveRequestType = 'sick',
    affectedClasses?: any[]
  ): Promise<HourApiResponse<LeaveRequestValidation>> {
    try {
      const now = new Date();
      const classDateTime = new Date(classDate);
      
      // Calculate hours before class
      const hoursBeforeClass = (classDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      // Check if class is in the past
      if (hoursBeforeClass <= 0) {
        return {
          success: true,
          data: {
            isValid: false,
            hoursBeforeClass,
            meets48HourRule: false,
            expectedRefundPercentage: 0,
            expectedHoursRefund: 0,
            autoApproval: false,
            warnings: [],
            errors: ['Cannot submit leave request for past classes']
          }
        };
      }

      // Use the new rules-based validation
      const rulesValidation = await leaveRulesService.validateLeaveRequest(
        studentId,
        classDate,
        classDate, // Same date for single class
        leaveType,
        affectedClasses || []
      );

      if (!rulesValidation.success) {
        throw new Error(rulesValidation.error?.message || 'Rules validation failed');
      }

      // Determine refund percentage and approval status based on 48-hour rule
      let expectedRefundPercentage = 0;
      let autoApproval = false;
      const warnings: string[] = [];
      const errors: string[] = [];

      // Add rule validation errors and warnings
      if (rulesValidation.data?.errors) {
        errors.push(...rulesValidation.data.errors.map(e => e.message));
      }
      if (rulesValidation.data?.warnings) {
        warnings.push(...rulesValidation.data.warnings.map(w => w.message));
      }

      // Traditional 48-hour rule validation
      if (hoursBeforeClass >= 48) {
        expectedRefundPercentage = LEAVE_REQUEST_REFUND_PERCENTAGES.FULL;
        autoApproval = true;
      } else if (hoursBeforeClass >= 24) {
        expectedRefundPercentage = LEAVE_REQUEST_REFUND_PERCENTAGES.PARTIAL;
      } else if (hoursBeforeClass >= 2) {
        expectedRefundPercentage = LEAVE_REQUEST_REFUND_PERCENTAGES.LIMITED;
        warnings.push('Limited refund available for requests within 24 hours');
      } else {
        expectedRefundPercentage = LEAVE_REQUEST_REFUND_PERCENTAGES.NONE;
        warnings.push('No refund available for requests within 2 hours of class');
      }

      // Special handling for medical emergencies
      if (leaveType === 'emergency' || leaveType === 'sick') {
        if (hoursBeforeClass < 48 && hoursBeforeClass >= 2) {
          expectedRefundPercentage = LEAVE_REQUEST_REFUND_PERCENTAGES.MEDICAL_EMERGENCY;
          warnings.push('Medical certificate may be required for enhanced refund');
        }
      }

      // Check if meets 48-hour rule
      const meets48HourRule = hoursBeforeClass >= 48;
      
      if (!meets48HourRule) {
        warnings.push('Request does not meet 48-hour advance notice requirement');
      }

      // Override auto-approval if rules validation requires approval
      if (rulesValidation.data?.summary.requiresApproval) {
        autoApproval = false;
      }

      const validation: LeaveRequestValidation = {
        isValid: rulesValidation.data?.isValid && errors.length === 0,
        hoursBeforeClass,
        meets48HourRule,
        expectedRefundPercentage,
        expectedHoursRefund: 1, // Assuming 1 hour per class
        autoApproval,
        warnings,
        errors
      };

      return {
        success: true,
        data: validation
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
   * Submit a leave request
   */
  async submitLeaveRequest(request: LeaveRequestSubmission): Promise<HourApiResponse<LeaveRequest>> {
    try {
      const { data: user } = await this.supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Validate the request first
      const validation = await this.validateLeaveRequest(
        request.studentId,
        request.classDate,
        request.leaveType,
        [{
          classId: request.classId,
          className: request.classType,
          classDate: request.classDate,
          hoursToRefund: 1
        }]
      );
      if (!validation.success || !validation.data?.isValid) {
        throw new Error(validation.data?.errors[0] || 'Invalid leave request');
      }

      // Call the database function to submit the request
      const { data, error } = await this.supabase.rpc('submit_leave_request', {
        p_student_id: request.studentId,
        p_class_id: request.classId,
        p_booking_id: request.bookingId,
        p_class_date: request.classDate,
        p_class_time: request.classTime,
        p_class_type: request.classType,
        p_teacher_id: request.teacherId,
        p_teacher_name: request.teacherName,
        p_reason: request.reason,
        p_leave_type: request.leaveType,
        p_medical_certificate_url: request.medicalCertificateUrl,
        p_additional_notes: request.additionalNotes
      });

      if (error) throw error;

      // Get the created leave request
      const { data: leaveRequest, error: fetchError } = await this.supabase
        .from('leave_requests')
        .select('*')
        .eq('id', data)
        .single();

      if (fetchError) throw fetchError;

      return {
        success: true,
        data: this.transformLeaveRequest(leaveRequest)
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SUBMISSION_ERROR',
          message: 'Failed to submit leave request',
          details: error
        }
      };
    }
  }

  /**
   * Get leave requests for a student
   */
  async getStudentLeaveRequests(
    studentId: string,
    options?: {
      status?: LeaveRequestStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<HourApiResponse<HourPaginatedResponse<LeaveRequest>>> {
    try {
      let query = this.supabase
        .from('leave_requests')
        .select('*', { count: 'exact' })
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (options?.status) {
        query = query.eq('status', options.status);
      }

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
      const totalPages = Math.ceil((count || 0) / limit);

      return {
        success: true,
        data: {
          items: data?.map(lr => this.transformLeaveRequest(lr)) || [],
          pagination: {
            page: Math.floor(offset / limit) + 1,
            limit,
            total: count || 0,
            totalPages,
            hasNext: offset + limit < (count || 0),
            hasPrevious: offset > 0
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FETCH_ERROR',
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
          code: 'FETCH_ERROR',
          message: 'Failed to fetch leave request',
          details: error
        }
      };
    }
  }

  /**
   * Cancel a leave request (only if pending)
   */
  async cancelLeaveRequest(requestId: string): Promise<HourApiResponse<LeaveRequest>> {
    try {
      const { data: user } = await this.supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data, error } = await this.supabase
        .from('leave_requests')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .eq('status', 'pending') // Only allow cancellation of pending requests
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
          code: 'CANCEL_ERROR',
          message: 'Failed to cancel leave request',
          details: error
        }
      };
    }
  }

  /**
   * Get pending leave requests for review (admin/teacher)
   */
  async getPendingLeaveRequests(options?: {
    limit?: number;
    offset?: number;
  }): Promise<HourApiResponse<HourPaginatedResponse<LeaveRequest>>> {
    try {
      let query = this.supabase
        .from('leave_requests')
        .select('*', { count: 'exact' })
        .eq('status', 'pending')
        .order('submitted_at', { ascending: true });

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
      const totalPages = Math.ceil((count || 0) / limit);

      return {
        success: true,
        data: {
          items: data?.map(lr => this.transformLeaveRequest(lr)) || [],
          pagination: {
            page: Math.floor(offset / limit) + 1,
            limit,
            total: count || 0,
            totalPages,
            hasNext: offset + limit < (count || 0),
            hasPrevious: offset > 0
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch pending leave requests',
          details: error
        }
      };
    }
  }

  /**
   * Approve a leave request (admin/teacher)
   */
  async approveLeaveRequest(
    requestId: string,
    reviewNotes?: string
  ): Promise<HourApiResponse<LeaveRequest>> {
    try {
      const { data: user } = await this.supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data, error } = await this.supabase
        .from('leave_requests')
        .update({
          status: 'approved',
          reviewed_by: user.user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .eq('status', 'pending')
        .select()
        .single();

      if (error) throw error;

      // Process refund if approved
      if (data && data.hours_to_refund > 0 && !data.refund_processed) {
        await this.supabase.rpc('process_leave_refund', {
          p_leave_request_id: requestId
        });
      }

      return {
        success: true,
        data: this.transformLeaveRequest(data)
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'APPROVE_ERROR',
          message: 'Failed to approve leave request',
          details: error
        }
      };
    }
  }

  /**
   * Reject a leave request (admin/teacher)
   */
  async rejectLeaveRequest(
    requestId: string,
    reviewNotes: string
  ): Promise<HourApiResponse<LeaveRequest>> {
    try {
      const { data: user } = await this.supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data, error } = await this.supabase
        .from('leave_requests')
        .update({
          status: 'rejected',
          reviewed_by: user.user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .eq('status', 'pending')
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
          code: 'REJECT_ERROR',
          message: 'Failed to reject leave request',
          details: error
        }
      };
    }
  }

  /**
   * Get leave request statistics for a student
   */
  async getLeaveRequestStats(
    studentId: string,
    periodDays: number = 30
  ): Promise<HourApiResponse<{
    totalRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
    pendingRequests: number;
    totalHoursRefunded: number;
    averageRefundPercentage: number;
    requestsByType: Record<LeaveRequestType, number>;
  }>> {
    try {
      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - periodDays);

      const { data, error } = await this.supabase
        .from('leave_requests')
        .select('*')
        .eq('student_id', studentId)
        .gte('created_at', periodStart.toISOString());

      if (error) throw error;

      const stats = {
        totalRequests: data?.length || 0,
        approvedRequests: data?.filter(lr => lr.status === 'approved').length || 0,
        rejectedRequests: data?.filter(lr => lr.status === 'rejected').length || 0,
        pendingRequests: data?.filter(lr => lr.status === 'pending').length || 0,
        totalHoursRefunded: data?.reduce((sum, lr) => sum + (lr.refund_processed ? lr.hours_to_refund : 0), 0) || 0,
        averageRefundPercentage: 0,
        requestsByType: {} as Record<LeaveRequestType, number>
      };

      // Calculate average refund percentage
      const refundedRequests = data?.filter(lr => lr.refund_processed) || [];
      if (refundedRequests.length > 0) {
        stats.averageRefundPercentage = refundedRequests.reduce((sum, lr) => sum + lr.refund_percentage, 0) / refundedRequests.length;
      }

      // Count requests by type
      const leaveTypes: LeaveRequestType[] = ['sick', 'emergency', 'personal', 'work', 'family', 'travel', 'other'];
      leaveTypes.forEach(type => {
        stats.requestsByType[type] = data?.filter(lr => lr.leave_type === type).length || 0;
      });

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'STATS_ERROR',
          message: 'Failed to calculate leave request statistics',
          details: error
        }
      };
    }
  }

  /**
   * Transform database record to LeaveRequest interface
   */
  private transformLeaveRequest(lr: any): LeaveRequest {
    return {
      id: lr.id,
      studentId: lr.student_id,
      classId: lr.class_id,
      bookingId: lr.booking_id,
      classDate: lr.class_date,
      classTime: lr.class_time,
      classType: lr.class_type,
      teacherId: lr.teacher_id,
      teacherName: lr.teacher_name,
      reason: lr.reason,
      leaveType: lr.leave_type,
      medicalCertificateUrl: lr.medical_certificate_url,
      submittedAt: lr.submitted_at,
      hoursBeforeClass: lr.hours_before_class,
      meets48HourRule: lr.meets_48_hour_rule,
      status: lr.status,
      reviewedBy: lr.reviewed_by,
      reviewedAt: lr.reviewed_at,
      reviewNotes: lr.review_notes,
      hoursToRefund: lr.hours_to_refund,
      refundPercentage: lr.refund_percentage,
      refundProcessed: lr.refund_processed,
      refundTransactionId: lr.refund_transaction_id,
      autoApproved: lr.auto_approved,
      additionalNotes: lr.additional_notes,
      metadata: lr.metadata,
      createdAt: lr.created_at,
      updatedAt: lr.updated_at
    };
  }
}

// Export singleton instance
export const leaveRequestService = new LeaveRequestService();