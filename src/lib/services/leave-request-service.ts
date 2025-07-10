/**
 * Leave Request Service
 * Comprehensive service for managing leave requests and approval workflow
 */

import { supabase } from '@/lib/supabase';
import { 
  EnhancedLeaveRequest, 
  LeaveRequestWithDetails,
  LeaveRequestAnalytics,
  LeaveRequestForm,
  LeaveRequestFilters,
  PaginatedHourResponse,
  HourManagementResponse
} from '@/types/hour-management';

class LeaveRequestService {
  /**
   * Submit a new leave request
   */
  async submitLeaveRequest(requestData: LeaveRequestForm): Promise<HourManagementResponse<EnhancedLeaveRequest>> {
    try {
      // Calculate advance notice hours
      const startDate = new Date(requestData.start_date);
      const currentDate = new Date();
      const advanceNoticeHours = Math.floor((startDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60));

      // Calculate hours affected if not provided
      let hoursAffected = requestData.hours_affected;
      if (!hoursAffected && requestData.class_id) {
        // Get class duration from the class/course
        const { data: classData, error: classError } = await supabase
          .from('classes')
          .select(`
            courses(duration_minutes, course_type)
          `)
          .eq('id', requestData.class_id)
          .single();

        if (classError) {
          console.warn('Could not fetch class data for hour calculation:', classError);
        } else if (classData?.courses) {
          const durationHours = classData.courses.duration_minutes / 60;
          
          // Get deduction rate for course type
          const { data: deductionRate } = await supabase
            .rpc('get_hour_deduction_rate', { course_type_param: classData.courses.course_type });
          
          hoursAffected = durationHours * (deductionRate || 1.0);
        }
      }

      // Create leave request
      const { data: leaveRequest, error } = await supabase
        .from('leave_requests')
        .insert({
          student_id: requestData.student_id,
          teacher_id: requestData.teacher_id,
          class_id: requestData.class_id,
          start_date: requestData.start_date,
          end_date: requestData.end_date,
          leave_type: requestData.leave_type,
          reason: requestData.reason,
          hours_affected: hoursAffected,
          advance_notice_hours: advanceNoticeHours,
          status: 'pending',
          hours_recovered: 0,
          makeup_scheduled: false,
          attachments: []
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: leaveRequest
      };
    } catch (error) {
      console.error('Error submitting leave request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit leave request'
      };
    }
  }

  /**
   * Get leave requests with filters and pagination
   */
  async getLeaveRequests(
    filters: LeaveRequestFilters = {},
    page: number = 1,
    limit: number = 50
  ): Promise<HourManagementResponse<PaginatedHourResponse<LeaveRequestWithDetails>>> {
    try {
      let query = supabase
        .from('leave_requests')
        .select(`
          *,
          student:students!inner(id, student_id, users!inner(full_name, email)),
          teacher:teachers(users!inner(full_name, email)),
          class:classes(id, class_name, courses!inner(course_type)),
          approved_by_user:users!leave_requests_approved_by_fkey(full_name, email),
          rejected_by_user:users!leave_requests_rejected_by_fkey(full_name, email)
        `, { count: 'exact' });

      // Apply filters
      if (filters.student_id) {
        query = query.eq('student_id', filters.student_id);
      }
      if (filters.teacher_id) {
        query = query.eq('teacher_id', filters.teacher_id);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.leave_type) {
        query = query.eq('leave_type', filters.leave_type);
      }
      if (filters.date_from) {
        query = query.gte('start_date', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('end_date', filters.date_to);
      }

      // Apply pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);
      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;

      const totalPages = Math.ceil((count || 0) / limit);

      return {
        success: true,
        data: {
          data: data || [],
          total: count || 0,
          page,
          limit,
          totalPages
        }
      };
    } catch (error) {
      console.error('Error getting leave requests:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get leave requests'
      };
    }
  }

  /**
   * Get pending leave requests for approval
   */
  async getPendingLeaveRequests(): Promise<HourManagementResponse<LeaveRequestWithDetails[]>> {
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .select(`
          *,
          student:students!inner(id, student_id, users!inner(full_name, email)),
          teacher:teachers(users!inner(full_name, email)),
          class:classes(id, class_name, courses!inner(course_type))
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('Error getting pending leave requests:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get pending requests'
      };
    }
  }

  /**
   * Approve a leave request
   */
  async approveLeaveRequest(
    requestId: string, 
    approverId: string, 
    adminNotes?: string
  ): Promise<HourManagementResponse<EnhancedLeaveRequest>> {
    try {
      // Use the database function to process approval
      const { data: result, error } = await supabase
        .rpc('process_leave_request', {
          leave_request_uuid: requestId,
          approved_status: 'approved',
          approver_uuid: approverId,
          admin_notes_text: adminNotes
        });

      if (error) throw error;

      if (!result) {
        throw new Error('Failed to process leave request approval');
      }

      // Get the updated leave request
      const { data: updatedRequest, error: fetchError } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError) throw fetchError;

      return {
        success: true,
        data: updatedRequest
      };
    } catch (error) {
      console.error('Error approving leave request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to approve leave request'
      };
    }
  }

  /**
   * Reject a leave request
   */
  async rejectLeaveRequest(
    requestId: string, 
    rejectedById: string, 
    adminNotes?: string
  ): Promise<HourManagementResponse<EnhancedLeaveRequest>> {
    try {
      // Use the database function to process rejection
      const { data: result, error } = await supabase
        .rpc('process_leave_request', {
          leave_request_uuid: requestId,
          approved_status: 'rejected',
          approver_uuid: rejectedById,
          admin_notes_text: adminNotes
        });

      if (error) throw error;

      if (!result) {
        throw new Error('Failed to process leave request rejection');
      }

      // Get the updated leave request
      const { data: updatedRequest, error: fetchError } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError) throw fetchError;

      return {
        success: true,
        data: updatedRequest
      };
    } catch (error) {
      console.error('Error rejecting leave request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reject leave request'
      };
    }
  }

  /**
   * Get leave request by ID with full details
   */
  async getLeaveRequestById(requestId: string): Promise<HourManagementResponse<LeaveRequestWithDetails>> {
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .select(`
          *,
          student:students!inner(id, student_id, users!inner(full_name, email)),
          teacher:teachers(users!inner(full_name, email)),
          class:classes(id, class_name, courses!inner(course_type)),
          approved_by_user:users!leave_requests_approved_by_fkey(full_name, email),
          rejected_by_user:users!leave_requests_rejected_by_fkey(full_name, email)
        `)
        .eq('id', requestId)
        .single();

      if (error) throw error;

      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Error getting leave request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get leave request'
      };
    }
  }

  /**
   * Get leave requests for a specific student
   */
  async getStudentLeaveRequests(studentId: string): Promise<HourManagementResponse<LeaveRequestWithDetails[]>> {
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .select(`
          *,
          student:students!inner(id, student_id, users!inner(full_name, email)),
          teacher:teachers(users!inner(full_name, email)),
          class:classes(id, class_name, courses!inner(course_type)),
          approved_by_user:users!leave_requests_approved_by_fkey(full_name, email),
          rejected_by_user:users!leave_requests_rejected_by_fkey(full_name, email)
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('Error getting student leave requests:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get student leave requests'
      };
    }
  }

  /**
   * Get leave requests for a specific teacher (for approval)
   */
  async getTeacherLeaveRequests(teacherId: string): Promise<HourManagementResponse<LeaveRequestWithDetails[]>> {
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .select(`
          *,
          student:students!inner(id, student_id, users!inner(full_name, email)),
          teacher:teachers(users!inner(full_name, email)),
          class:classes(id, class_name, courses!inner(course_type)),
          approved_by_user:users!leave_requests_approved_by_fkey(full_name, email),
          rejected_by_user:users!leave_requests_rejected_by_fkey(full_name, email)
        `)
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('Error getting teacher leave requests:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get teacher leave requests'
      };
    }
  }

  /**
   * Update makeup scheduling for leave request
   */
  async updateMakeupScheduling(
    requestId: string,
    makeupScheduled: boolean,
    makeupDeadline?: string
  ): Promise<HourManagementResponse<EnhancedLeaveRequest>> {
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .update({
          makeup_scheduled: makeupScheduled,
          makeup_deadline: makeupDeadline
        })
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Error updating makeup scheduling:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update makeup scheduling'
      };
    }
  }

  /**
   * Cancel a leave request (only if pending)
   */
  async cancelLeaveRequest(requestId: string): Promise<HourManagementResponse<boolean>> {
    try {
      // Check if request is still pending
      const { data: request, error: fetchError } = await supabase
        .from('leave_requests')
        .select('status')
        .eq('id', requestId)
        .single();

      if (fetchError) throw fetchError;

      if (request.status !== 'pending') {
        throw new Error('Cannot cancel a leave request that has already been processed');
      }

      // Delete the request
      const { error: deleteError } = await supabase
        .from('leave_requests')
        .delete()
        .eq('id', requestId);

      if (deleteError) throw deleteError;

      return {
        success: true,
        data: true
      };
    } catch (error) {
      console.error('Error canceling leave request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel leave request'
      };
    }
  }

  /**
   * Get leave request analytics
   */
  async getLeaveRequestAnalytics(): Promise<HourManagementResponse<LeaveRequestAnalytics>> {
    try {
      // Get basic statistics
      const [
        { data: allRequests },
        { data: approvedRequests },
        { data: rejectedRequests },
        { data: pendingRequests }
      ] = await Promise.all([
        supabase.from('leave_requests').select('id, hours_affected'),
        supabase.from('leave_requests').select('id, hours_affected, hours_recovered').eq('status', 'approved'),
        supabase.from('leave_requests').select('id').eq('status', 'rejected'),
        supabase.from('leave_requests').select('id').eq('status', 'pending')
      ]);

      // Get processing time for approved/rejected requests
      const { data: processedRequests } = await supabase
        .from('leave_requests')
        .select('created_at, approved_at, rejected_at')
        .or('status.eq.approved,status.eq.rejected');

      // Calculate average processing time
      let totalProcessingDays = 0;
      let processedCount = 0;

      if (processedRequests) {
        processedRequests.forEach(request => {
          const processedAt = request.approved_at || request.rejected_at;
          if (processedAt) {
            const createdDate = new Date(request.created_at);
            const processedDate = new Date(processedAt);
            const daysDiff = (processedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
            totalProcessingDays += daysDiff;
            processedCount++;
          }
        });
      }

      // Get statistics by leave type
      const { data: byLeaveType } = await supabase
        .from('leave_requests')
        .select('leave_type, status, hours_affected');

      const leaveTypeStats: Record<string, { count: number; approval_rate: number; average_hours_affected: number }> = {};

      if (byLeaveType) {
        const typeGroups: Record<string, { total: number; approved: number; hours: number[] }> = {};

        byLeaveType.forEach(request => {
          const type = request.leave_type;
          if (!typeGroups[type]) {
            typeGroups[type] = { total: 0, approved: 0, hours: [] };
          }
          typeGroups[type].total++;
          if (request.status === 'approved') {
            typeGroups[type].approved++;
          }
          if (request.hours_affected) {
            typeGroups[type].hours.push(request.hours_affected);
          }
        });

        Object.entries(typeGroups).forEach(([type, stats]) => {
          leaveTypeStats[type] = {
            count: stats.total,
            approval_rate: stats.total > 0 ? (stats.approved / stats.total) * 100 : 0,
            average_hours_affected: stats.hours.length > 0 
              ? stats.hours.reduce((sum, h) => sum + h, 0) / stats.hours.length 
              : 0
          };
        });
      }

      const analytics: LeaveRequestAnalytics = {
        total_requests: allRequests?.length || 0,
        approved_requests: approvedRequests?.length || 0,
        rejected_requests: rejectedRequests?.length || 0,
        pending_requests: pendingRequests?.length || 0,
        total_hours_affected: allRequests?.reduce((sum, r) => sum + (r.hours_affected || 0), 0) || 0,
        total_hours_recovered: approvedRequests?.reduce((sum, r) => sum + (r.hours_recovered || 0), 0) || 0,
        average_processing_time_days: processedCount > 0 ? totalProcessingDays / processedCount : 0,
        by_leave_type: leaveTypeStats
      };

      return {
        success: true,
        data: analytics
      };
    } catch (error) {
      console.error('Error getting leave request analytics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get analytics'
      };
    }
  }

  /**
   * Check if student can submit leave request for specific dates
   */
  async canSubmitLeaveRequest(
    studentId: string, 
    startDate: string, 
    endDate: string
  ): Promise<HourManagementResponse<{ canSubmit: boolean; reason?: string }>> {
    try {
      // Check for overlapping leave requests
      const { data: overlappingRequests, error } = await supabase
        .from('leave_requests')
        .select('id, status')
        .eq('student_id', studentId)
        .or(`
          and(start_date.lte.${startDate},end_date.gte.${startDate}),
          and(start_date.lte.${endDate},end_date.gte.${endDate}),
          and(start_date.gte.${startDate},end_date.lte.${endDate})
        `)
        .in('status', ['pending', 'approved']);

      if (error) throw error;

      if (overlappingRequests && overlappingRequests.length > 0) {
        return {
          success: true,
          data: {
            canSubmit: false,
            reason: 'You already have a leave request for overlapping dates'
          }
        };
      }

      return {
        success: true,
        data: { canSubmit: true }
      };
    } catch (error) {
      console.error('Error checking leave request eligibility:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check eligibility'
      };
    }
  }
}

export const leaveRequestService = new LeaveRequestService();
export default leaveRequestService;