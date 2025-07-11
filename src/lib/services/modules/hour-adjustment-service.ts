/**
 * Hour Adjustment Service Module
 * 
 * This module handles all hour adjustment-related operations including:
 * - Manual hour adjustments (add/subtract)
 * - Adjustment approval workflows
 * - Hour alerts and notifications
 * - Adjustment history and auditing
 */

import type {
  HourAdjustment,
  HourAdjustmentRequest,
  HourAlert,
  HourApiResponse,
  HourTransactionType
} from '@/types/hours';
import { 
  IHourAdjustmentService, 
  ServiceDependencies, 
  ServiceContainer, 
  withErrorHandling,
  ServiceError 
} from '../interfaces/service-interfaces';

export class HourAdjustmentService implements IHourAdjustmentService {
  readonly serviceName = 'HourAdjustmentService';
  readonly version = '1.0.0';
  
  private readonly supabase;
  private readonly logger;

  constructor(dependencies?: ServiceDependencies) {
    const deps = dependencies || ServiceContainer.getInstance().getDependencies();
    this.supabase = deps.supabase;
    this.logger = deps.logger;
  }

  async isHealthy(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('hour_adjustments')
        .select('id')
        .limit(1);
      
      return !error;
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * Create a new hour adjustment request
   */
  async createHourAdjustment(request: HourAdjustmentRequest): Promise<HourApiResponse<HourAdjustment>> {
    try {
      this.logger.info('Creating hour adjustment', {
        studentId: request.studentId,
        type: request.adjustmentType,
        hours: request.hoursToAdjust,
        reason: request.reason
      });

      // Validate authentication
      const { data: user } = await this.supabase.auth.getUser();
      if (!user.user) {
        throw this.createServiceError('AUTH_ERROR', 'User not authenticated');
      }

      // Get current balance
      const currentBalance = await this.getStudentTotalHours(request.studentId);
      const hoursAmount = request.adjustmentType === 'subtract' ? -request.hoursToAdjust : request.hoursToAdjust;
      const balanceAfter = currentBalance + hoursAmount;

      // Validate the adjustment won't result in negative balance
      if (balanceAfter < 0) {
        throw this.createServiceError(
          'NEGATIVE_BALANCE',
          `Adjustment would result in negative balance: ${balanceAfter} hours`
        );
      }

      // Create transaction record
      const { data: transaction, error: transError } = await this.supabase
        .from('hour_transactions')
        .insert({
          student_id: request.studentId,
          transaction_type: 'adjustment',
          hours_amount: hoursAmount,
          balance_before: currentBalance,
          balance_after: balanceAfter,
          description: `Manual adjustment: ${request.reason}`,
          reason: request.reason,
          requires_approval: true,
          created_by: user.user.id
        })
        .select()
        .single();

      if (transError) {
        throw this.createServiceError('TRANSACTION_ERROR', 'Failed to create transaction', transError);
      }

      // Create adjustment record
      const { data: adjustment, error: adjError } = await this.supabase
        .from('hour_adjustments')
        .insert({
          student_id: request.studentId,
          transaction_id: transaction.id,
          adjustment_type: request.adjustmentType,
          hours_adjusted: request.hoursToAdjust,
          reason: request.reason,
          supporting_documents: request.supportingDocuments || [],
          requested_by: user.user.id,
          affected_classes: request.affectedClasses,
          affected_bookings: request.affectedBookings,
          metadata: { 
            notes: request.notes,
            original_balance: currentBalance,
            new_balance: balanceAfter
          }
        })
        .select()
        .single();

      if (adjError) {
        throw this.createServiceError('ADJUSTMENT_ERROR', 'Failed to create adjustment', adjError);
      }

      this.logger.info('Successfully created hour adjustment', {
        adjustmentId: adjustment.id,
        studentId: request.studentId,
        transactionId: transaction.id
      });

      return {
        success: true,
        data: this.transformAdjustment(adjustment)
      };
    } catch (error) {
      return this.createErrorResponse(error as ServiceError);
    }
  }

  /**
   * Get pending adjustments awaiting approval
   */
  async getPendingAdjustments(options?: {
    limit?: number;
    offset?: number;
    studentId?: string;
    requestedBy?: string;
  }): Promise<HourApiResponse<HourAdjustment[]>> {
    try {
      this.logger.info('Fetching pending adjustments', { options });

      let query = this.supabase
        .from('hour_adjustments')
        .select(`
          *,
          students!hour_adjustments_student_id_fkey (
            name,
            email
          ),
          profiles!hour_adjustments_requested_by_fkey (
            name,
            email
          )
        `)
        .eq('approval_status', 'pending')
        .order('requested_at', { ascending: false });

      if (options?.studentId) {
        query = query.eq('student_id', options.studentId);
      }

      if (options?.requestedBy) {
        query = query.eq('requested_by', options.requestedBy);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) {
        throw this.createServiceError('FETCH_PENDING_ERROR', 'Failed to fetch pending adjustments', error);
      }

      this.logger.info('Successfully fetched pending adjustments', { count: data?.length || 0 });

      return {
        success: true,
        data: data?.map(a => this.transformAdjustment(a)) || []
      };
    } catch (error) {
      return this.createErrorResponse(error as ServiceError);
    }
  }

  /**
   * Approve an hour adjustment
   */
  async approveAdjustment(adjustmentId: string, params: { 
    approvalNotes?: string 
  }): Promise<HourApiResponse<HourAdjustment>> {
    try {
      this.logger.info('Approving adjustment', { adjustmentId, notes: params.approvalNotes });

      // Validate authentication
      const { data: user } = await this.supabase.auth.getUser();
      if (!user.user) {
        throw this.createServiceError('AUTH_ERROR', 'User not authenticated');
      }

      // Get the adjustment details
      const { data: adjustment, error: fetchError } = await this.supabase
        .from('hour_adjustments')
        .select('*')
        .eq('id', adjustmentId)
        .single();

      if (fetchError) {
        throw this.createServiceError('FETCH_ADJUSTMENT_ERROR', 'Failed to fetch adjustment', fetchError);
      }

      if (adjustment.approval_status !== 'pending') {
        throw this.createServiceError('ALREADY_PROCESSED', 'Adjustment has already been processed');
      }

      // Update adjustment status
      const { data: updatedAdjustment, error: updateError } = await this.supabase
        .from('hour_adjustments')
        .update({
          approval_status: 'approved',
          approved_by: user.user.id,
          approved_at: new Date().toISOString(),
          approval_notes: params.approvalNotes
        })
        .eq('id', adjustmentId)
        .select()
        .single();

      if (updateError) {
        throw this.createServiceError('UPDATE_ADJUSTMENT_ERROR', 'Failed to update adjustment', updateError);
      }

      // Update the associated transaction
      const { error: transactionError } = await this.supabase
        .from('hour_transactions')
        .update({
          requires_approval: false,
          approved_by: user.user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', adjustment.transaction_id);

      if (transactionError) {
        throw this.createServiceError('UPDATE_TRANSACTION_ERROR', 'Failed to update transaction', transactionError);
      }

      // Create approval notification
      await this.createApprovalNotification(adjustment.student_id, adjustmentId, 'approved');

      this.logger.info('Successfully approved adjustment', {
        adjustmentId,
        approvedBy: user.user.id
      });

      return {
        success: true,
        data: this.transformAdjustment(updatedAdjustment)
      };
    } catch (error) {
      return this.createErrorResponse(error as ServiceError);
    }
  }

  /**
   * Reject an hour adjustment
   */
  async rejectAdjustment(adjustmentId: string, params: { 
    approvalNotes: string 
  }): Promise<HourApiResponse<HourAdjustment>> {
    try {
      this.logger.info('Rejecting adjustment', { adjustmentId, notes: params.approvalNotes });

      // Validate authentication
      const { data: user } = await this.supabase.auth.getUser();
      if (!user.user) {
        throw this.createServiceError('AUTH_ERROR', 'User not authenticated');
      }

      // Get the adjustment details
      const { data: adjustment, error: fetchError } = await this.supabase
        .from('hour_adjustments')
        .select('*')
        .eq('id', adjustmentId)
        .single();

      if (fetchError) {
        throw this.createServiceError('FETCH_ADJUSTMENT_ERROR', 'Failed to fetch adjustment', fetchError);
      }

      if (adjustment.approval_status !== 'pending') {
        throw this.createServiceError('ALREADY_PROCESSED', 'Adjustment has already been processed');
      }

      // Update adjustment status
      const { data: updatedAdjustment, error: updateError } = await this.supabase
        .from('hour_adjustments')
        .update({
          approval_status: 'rejected',
          approved_by: user.user.id,
          approved_at: new Date().toISOString(),
          approval_notes: params.approvalNotes
        })
        .eq('id', adjustmentId)
        .select()
        .single();

      if (updateError) {
        throw this.createServiceError('UPDATE_ADJUSTMENT_ERROR', 'Failed to update adjustment', updateError);
      }

      // Mark the associated transaction as rejected
      const { error: transactionError } = await this.supabase
        .from('hour_transactions')
        .update({
          requires_approval: false,
          approved_by: user.user.id,
          approved_at: new Date().toISOString(),
          is_rejected: true
        })
        .eq('id', adjustment.transaction_id);

      if (transactionError) {
        throw this.createServiceError('UPDATE_TRANSACTION_ERROR', 'Failed to update transaction', transactionError);
      }

      // Create rejection notification
      await this.createApprovalNotification(adjustment.student_id, adjustmentId, 'rejected');

      this.logger.info('Successfully rejected adjustment', {
        adjustmentId,
        rejectedBy: user.user.id
      });

      return {
        success: true,
        data: this.transformAdjustment(updatedAdjustment)
      };
    } catch (error) {
      return this.createErrorResponse(error as ServiceError);
    }
  }

  /**
   * Get active alerts for low hours, expiring packages, etc.
   */
  async getActiveAlerts(options?: {
    studentId?: string;
    alertType?: string;
    limit?: number;
  }): Promise<HourApiResponse<HourAlert[]>> {
    try {
      this.logger.info('Fetching active alerts', { options });

      let query = this.supabase
        .from('hour_alerts')
        .select(`
          *,
          students!hour_alerts_student_id_fkey (
            name,
            email
          )
        `)
        .eq('is_active', true)
        .eq('is_acknowledged', false)
        .order('created_at', { ascending: false });

      if (options?.studentId) {
        query = query.eq('student_id', options.studentId);
      }

      if (options?.alertType) {
        query = query.eq('alert_type', options.alertType);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        throw this.createServiceError('FETCH_ALERTS_ERROR', 'Failed to fetch active alerts', error);
      }

      this.logger.info('Successfully fetched active alerts', { count: data?.length || 0 });

      return {
        success: true,
        data: this.transformAlerts(data || [])
      };
    } catch (error) {
      return this.createErrorResponse(error as ServiceError);
    }
  }

  /**
   * Create hour alerts for low balances, expiring packages, etc.
   */
  async createHourAlert(params: {
    studentId: string;
    alertType: 'low_balance' | 'expiring_package' | 'expired_hours' | 'negative_balance';
    hoursRemaining?: number;
    expiryDate?: string;
    thresholdValue?: number;
    metadata?: Record<string, any>;
  }): Promise<HourApiResponse<HourAlert>> {
    try {
      this.logger.info('Creating hour alert', {
        studentId: params.studentId,
        alertType: params.alertType
      });

      // Check if similar alert already exists
      const { data: existingAlert, error: checkError } = await this.supabase
        .from('hour_alerts')
        .select('id')
        .eq('student_id', params.studentId)
        .eq('alert_type', params.alertType)
        .eq('is_active', true)
        .eq('is_acknowledged', false)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found"
        throw this.createServiceError('CHECK_ALERT_ERROR', 'Failed to check existing alerts', checkError);
      }

      if (existingAlert) {
        this.logger.info('Similar alert already exists', { alertId: existingAlert.id });
        return {
          success: true,
          data: await this.getAlert(existingAlert.id)
        };
      }

      // Create new alert
      const { data: alert, error: createError } = await this.supabase
        .from('hour_alerts')
        .insert({
          student_id: params.studentId,
          alert_type: params.alertType,
          hours_remaining: params.hoursRemaining,
          expiry_date: params.expiryDate,
          threshold_value: params.thresholdValue,
          metadata: params.metadata,
          is_active: true,
          is_acknowledged: false
        })
        .select()
        .single();

      if (createError) {
        throw this.createServiceError('CREATE_ALERT_ERROR', 'Failed to create alert', createError);
      }

      this.logger.info('Successfully created hour alert', {
        alertId: alert.id,
        studentId: params.studentId,
        alertType: params.alertType
      });

      return {
        success: true,
        data: this.transformAlert(alert)
      };
    } catch (error) {
      return this.createErrorResponse(error as ServiceError);
    }
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string): Promise<HourApiResponse<HourAlert>> {
    try {
      this.logger.info('Acknowledging alert', { alertId });

      const { data: user } = await this.supabase.auth.getUser();
      if (!user.user) {
        throw this.createServiceError('AUTH_ERROR', 'User not authenticated');
      }

      const { data: alert, error } = await this.supabase
        .from('hour_alerts')
        .update({
          is_acknowledged: true,
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: user.user.id
        })
        .eq('id', alertId)
        .select()
        .single();

      if (error) {
        throw this.createServiceError('ACKNOWLEDGE_ALERT_ERROR', 'Failed to acknowledge alert', error);
      }

      this.logger.info('Successfully acknowledged alert', { alertId });

      return {
        success: true,
        data: this.transformAlert(alert)
      };
    } catch (error) {
      return this.createErrorResponse(error as ServiceError);
    }
  }

  /**
   * Get adjustment history for a student
   */
  async getAdjustmentHistory(studentId: string, options?: {
    limit?: number;
    offset?: number;
    status?: 'pending' | 'approved' | 'rejected';
  }): Promise<HourApiResponse<HourAdjustment[]>> {
    try {
      this.logger.info('Fetching adjustment history', { studentId, options });

      let query = this.supabase
        .from('hour_adjustments')
        .select(`
          *,
          profiles!hour_adjustments_requested_by_fkey (
            name,
            email
          ),
          approver:profiles!hour_adjustments_approved_by_fkey (
            name,
            email
          )
        `)
        .eq('student_id', studentId)
        .order('requested_at', { ascending: false });

      if (options?.status) {
        query = query.eq('approval_status', options.status);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) {
        throw this.createServiceError('FETCH_HISTORY_ERROR', 'Failed to fetch adjustment history', error);
      }

      this.logger.info('Successfully fetched adjustment history', { 
        studentId,
        count: data?.length || 0 
      });

      return {
        success: true,
        data: data?.map(a => this.transformAdjustment(a)) || []
      };
    } catch (error) {
      return this.createErrorResponse(error as ServiceError);
    }
  }

  // Private helper methods

  private async getStudentTotalHours(studentId: string): Promise<number> {
    const { data, error } = await this.supabase.rpc('calculate_student_hours', {
      p_student_id: studentId
    });

    if (error) {
      throw this.createServiceError('CALCULATE_HOURS_ERROR', 'Failed to calculate student hours', error);
    }

    return data || 0;
  }

  private async getAlert(alertId: string): Promise<HourAlert> {
    const { data, error } = await this.supabase
      .from('hour_alerts')
      .select('*')
      .eq('id', alertId)
      .single();

    if (error) {
      throw this.createServiceError('FETCH_ALERT_ERROR', 'Failed to fetch alert', error);
    }

    return this.transformAlert(data);
  }

  private async createApprovalNotification(
    studentId: string, 
    adjustmentId: string, 
    status: 'approved' | 'rejected'
  ): Promise<void> {
    try {
      // In a real implementation, this would send emails, push notifications, etc.
      this.logger.info('Creating approval notification', {
        studentId,
        adjustmentId,
        status
      });

      // For now, just create a system alert
      await this.createHourAlert({
        studentId,
        alertType: status === 'approved' ? 'low_balance' : 'negative_balance',
        metadata: {
          adjustmentId,
          status,
          message: `Hour adjustment ${status}`
        }
      });
    } catch (error) {
      this.logger.error('Failed to create approval notification', { error });
      // Don't throw - this is a non-critical operation
    }
  }

  private createServiceError(code: string, message: string, details?: any): ServiceError {
    return {
      code,
      message,
      details,
      timestamp: new Date(),
      service: this.serviceName
    };
  }

  private createErrorResponse<T>(error: ServiceError): HourApiResponse<T> {
    this.logger.error('Service error occurred', error);
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    };
  }

  private transformAdjustment(a: any): HourAdjustment {
    return {
      id: a.id,
      studentId: a.student_id,
      transactionId: a.transaction_id,
      adjustmentType: a.adjustment_type,
      hoursAdjusted: a.hours_adjusted,
      reason: a.reason,
      supportingDocuments: a.supporting_documents,
      requestedBy: a.requested_by,
      requestedAt: a.requested_at,
      approvedBy: a.approved_by,
      approvedAt: a.approved_at,
      approvalStatus: a.approval_status,
      approvalNotes: a.approval_notes,
      affectedClasses: a.affected_classes,
      affectedBookings: a.affected_bookings,
      metadata: a.metadata,
      createdAt: a.created_at,
      updatedAt: a.updated_at
    };
  }

  private transformAlerts(alerts: any[]): HourAlert[] {
    return alerts.map(a => this.transformAlert(a));
  }

  private transformAlert(a: any): HourAlert {
    return {
      id: a.id,
      studentId: a.student_id,
      alertType: a.alert_type,
      hoursRemaining: a.hours_remaining,
      expiryDate: a.expiry_date,
      thresholdValue: a.threshold_value,
      isActive: a.is_active,
      isAcknowledged: a.is_acknowledged,
      acknowledgedAt: a.acknowledged_at,
      acknowledgedBy: a.acknowledged_by,
      notificationsSent: a.notifications_sent,
      lastNotificationAt: a.last_notification_at,
      nextNotificationAt: a.next_notification_at,
      actionTaken: a.action_taken,
      actionTakenAt: a.action_taken_at,
      actionTakenBy: a.action_taken_by,
      metadata: a.metadata,
      createdAt: a.created_at,
      updatedAt: a.updated_at
    };
  }
}

// Create and export singleton instance
export const hourAdjustmentService = withErrorHandling(new HourAdjustmentService());