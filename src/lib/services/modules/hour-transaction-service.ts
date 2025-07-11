/**
 * Hour Transaction Service Module
 * 
 * This module handles all hour transaction-related operations including:
 * - Hour deductions for classes
 * - Balance calculations and tracking
 * - Hour transfers between students
 * - Transaction history and auditing
 */

import type {
  HourTransaction,
  HourTransferLog,
  HourTransferRequest,
  StudentHourBalance,
  HourApiResponse,
  HourTransactionType,
  HourAlert
} from '@/types/hours';
import { 
  IHourTransactionService, 
  ServiceDependencies, 
  ServiceContainer, 
  withErrorHandling,
  ServiceError 
} from '../interfaces/service-interfaces';

export class HourTransactionService implements IHourTransactionService {
  readonly serviceName = 'HourTransactionService';
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
        .from('hour_transactions')
        .select('id')
        .limit(1);
      
      return !error;
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * Deduct hours for a class booking
   */
  async deductClassHours(params: {
    studentId: string;
    classId: string;
    bookingId: string;
    hours: number;
    classType: string;
    deductionRate?: number;
  }): Promise<HourApiResponse<HourTransaction>> {
    try {
      this.logger.info('Deducting class hours', { 
        studentId: params.studentId,
        classId: params.classId,
        hours: params.hours,
        classType: params.classType 
      });

      // Check if student has sufficient hours
      const availableHours = await this.getStudentTotalHours(params.studentId);
      const hoursToDeduct = params.hours * (params.deductionRate || 1.0);
      
      if (availableHours < hoursToDeduct) {
        throw this.createServiceError(
          'INSUFFICIENT_HOURS',
          `Student has ${availableHours} hours but needs ${hoursToDeduct} hours for this class`
        );
      }

      // Call the database function for atomic deduction
      const { data: transactionId, error } = await this.supabase.rpc('deduct_class_hours', {
        p_student_id: params.studentId,
        p_class_id: params.classId,
        p_booking_id: params.bookingId,
        p_hours_to_deduct: hoursToDeduct,
        p_class_type: params.classType,
        p_deduction_rate: params.deductionRate || 1.0
      });

      if (error) {
        throw this.createServiceError('DEDUCTION_ERROR', 'Failed to deduct hours', error);
      }

      // Get the created transaction
      const { data: transaction, error: transError } = await this.supabase
        .from('hour_transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (transError) {
        throw this.createServiceError('TRANSACTION_FETCH_ERROR', 'Failed to fetch transaction', transError);
      }

      this.logger.info('Successfully deducted class hours', { 
        studentId: params.studentId,
        transactionId,
        hoursDeducted: hoursToDeduct 
      });

      return {
        success: true,
        data: this.transformTransaction(transaction)
      };
    } catch (error) {
      return this.createErrorResponse(error as ServiceError);
    }
  }

  /**
   * Transfer hours between students
   */
  async transferHours(request: HourTransferRequest): Promise<HourApiResponse<HourTransferLog>> {
    try {
      this.logger.info('Transferring hours between students', {
        fromStudentId: request.fromStudentId,
        toStudentId: request.toStudentId,
        hours: request.hoursToTransfer
      });

      // Validate authentication
      const { data: user } = await this.supabase.auth.getUser();
      if (!user.user) {
        throw this.createServiceError('AUTH_ERROR', 'User not authenticated');
      }

      // Verify source student has enough hours
      const sourceBalance = await this.getStudentTotalHours(request.fromStudentId);
      if (sourceBalance < request.hoursToTransfer) {
        throw this.createServiceError(
          'INSUFFICIENT_HOURS',
          `Source student has ${sourceBalance} hours but transfer requires ${request.hoursToTransfer} hours`
        );
      }

      // Verify family transfer eligibility if applicable
      if (request.isFamilyTransfer) {
        const isEligible = await this.verifyFamilyTransferEligibility(
          request.fromStudentId,
          request.toStudentId,
          request.familyRelationship
        );
        
        if (!isEligible) {
          throw this.createServiceError(
            'FAMILY_TRANSFER_NOT_ELIGIBLE',
            'Students are not eligible for family transfers'
          );
        }
      }

      // Get current balances
      const balanceBefore = {
        from: sourceBalance,
        to: await this.getStudentTotalHours(request.toStudentId)
      };

      // Create deduction transaction for source student
      const { data: fromTransaction, error: fromError } = await this.supabase
        .from('hour_transactions')
        .insert({
          student_id: request.fromStudentId,
          transaction_type: 'transfer',
          hours_amount: -request.hoursToTransfer,
          balance_before: balanceBefore.from,
          balance_after: balanceBefore.from - request.hoursToTransfer,
          transfer_to_student_id: request.toStudentId,
          description: `Transfer ${request.hoursToTransfer} hours to student ${request.toStudentId}`,
          reason: request.reason,
          created_by: user.user.id
        })
        .select()
        .single();

      if (fromError) {
        throw this.createServiceError('FROM_TRANSACTION_ERROR', 'Failed to create from transaction', fromError);
      }

      // Create addition transaction for destination student
      const { data: toTransaction, error: toError } = await this.supabase
        .from('hour_transactions')
        .insert({
          student_id: request.toStudentId,
          transaction_type: 'transfer',
          hours_amount: request.hoursToTransfer,
          balance_before: balanceBefore.to,
          balance_after: balanceBefore.to + request.hoursToTransfer,
          transfer_from_student_id: request.fromStudentId,
          description: `Received ${request.hoursToTransfer} hours from student ${request.fromStudentId}`,
          reason: request.reason,
          created_by: user.user.id
        })
        .select()
        .single();

      if (toError) {
        throw this.createServiceError('TO_TRANSACTION_ERROR', 'Failed to create to transaction', toError);
      }

      // Get the oldest active purchase for the from student
      const fromPurchaseId = await this.getOldestActivePurchase(request.fromStudentId);

      // Create transfer log
      const { data: transferLog, error: logError } = await this.supabase
        .from('hour_transfer_logs')
        .insert({
          from_student_id: request.fromStudentId,
          to_student_id: request.toStudentId,
          from_purchase_id: fromPurchaseId,
          hours_transferred: request.hoursToTransfer,
          transfer_reason: request.reason,
          is_family_transfer: request.isFamilyTransfer,
          family_relationship: request.familyRelationship,
          from_transaction_id: fromTransaction.id,
          to_transaction_id: toTransaction.id,
          notes: request.notes,
          created_by: user.user.id
        })
        .select()
        .single();

      if (logError) {
        throw this.createServiceError('TRANSFER_LOG_ERROR', 'Failed to create transfer log', logError);
      }

      this.logger.info('Successfully transferred hours', {
        fromStudentId: request.fromStudentId,
        toStudentId: request.toStudentId,
        hours: request.hoursToTransfer,
        transferId: transferLog.id
      });

      return {
        success: true,
        data: this.transformTransferLog(transferLog)
      };
    } catch (error) {
      return this.createErrorResponse(error as ServiceError);
    }
  }

  /**
   * Get comprehensive student hour balance
   */
  async getStudentHourBalance(studentId: string): Promise<HourApiResponse<StudentHourBalance>> {
    try {
      this.logger.info('Fetching student hour balance', { studentId });

      // Get total available hours
      const totalHours = await this.getStudentTotalHours(studentId);

      // Get active packages
      const { data: activePurchases, error: activeError } = await this.supabase
        .from('hour_purchases')
        .select(`
          *,
          hour_packages (name, package_type)
        `)
        .eq('student_id', studentId)
        .eq('is_active', true)
        .eq('is_expired', false)
        .eq('payment_status', 'completed')
        .gt('hours_remaining', 0)
        .order('valid_until', { ascending: true });

      if (activeError) {
        throw this.createServiceError('ACTIVE_PACKAGES_ERROR', 'Failed to fetch active packages', activeError);
      }

      // Get expiring packages (within 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const expiringPackages = activePurchases?.filter(p => 
        new Date(p.valid_until) <= thirtyDaysFromNow
      ) || [];

      // Get recent transactions
      const { data: transactions, error: transError } = await this.supabase
        .from('hour_transactions')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (transError) {
        throw this.createServiceError('TRANSACTIONS_ERROR', 'Failed to fetch transactions', transError);
      }

      // Get active alerts
      const { data: alerts, error: alertError } = await this.supabase
        .from('hour_alerts')
        .select('*')
        .eq('student_id', studentId)
        .eq('is_active', true)
        .eq('is_acknowledged', false);

      if (alertError) {
        throw this.createServiceError('ALERTS_ERROR', 'Failed to fetch alerts', alertError);
      }

      const balance: StudentHourBalance = {
        studentId,
        totalHours,
        activePackages: activePurchases?.map(p => ({
          purchaseId: p.id,
          packageName: p.hour_packages?.name || 'Unknown Package',
          hoursRemaining: p.hours_remaining,
          validUntil: p.valid_until,
          daysRemaining: Math.ceil(
            (new Date(p.valid_until).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          )
        })) || [],
        expiringPackages: expiringPackages.map(p => ({
          purchaseId: p.id,
          packageName: p.hour_packages?.name || 'Unknown Package',
          hoursRemaining: p.hours_remaining,
          validUntil: p.valid_until,
          daysRemaining: Math.ceil(
            (new Date(p.valid_until).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          )
        })),
        recentTransactions: this.transformTransactions(transactions || []),
        alerts: this.transformAlerts(alerts || [])
      };

      this.logger.info('Successfully fetched student hour balance', { 
        studentId,
        totalHours,
        activePackages: balance.activePackages.length
      });

      return {
        success: true,
        data: balance
      };
    } catch (error) {
      return this.createErrorResponse(error as ServiceError);
    }
  }

  /**
   * Get student's total available hours
   */
  async getStudentTotalHours(studentId: string): Promise<number> {
    try {
      const { data, error } = await this.supabase.rpc('calculate_student_hours', {
        p_student_id: studentId
      });

      if (error) {
        throw this.createServiceError('CALCULATE_HOURS_ERROR', 'Failed to calculate student hours', error);
      }

      return data || 0;
    } catch (error) {
      this.logger.error('Failed to get student total hours', { studentId, error });
      throw error;
    }
  }

  /**
   * Create a new transaction record
   */
  async createTransaction(params: {
    studentId: string;
    purchaseId?: string;
    transactionType: HourTransactionType;
    hoursAmount: number;
    description: string;
    balanceBefore: number;
    balanceAfter: number;
    classId?: string;
    bookingId?: string;
  }): Promise<void> {
    try {
      this.logger.info('Creating transaction', {
        studentId: params.studentId,
        type: params.transactionType,
        hours: params.hoursAmount
      });

      const { error } = await this.supabase
        .from('hour_transactions')
        .insert({
          student_id: params.studentId,
          purchase_id: params.purchaseId,
          transaction_type: params.transactionType,
          hours_amount: params.hoursAmount,
          balance_before: params.balanceBefore,
          balance_after: params.balanceAfter,
          description: params.description,
          class_id: params.classId,
          booking_id: params.bookingId
        });

      if (error) {
        throw this.createServiceError('CREATE_TRANSACTION_ERROR', 'Failed to create transaction', error);
      }

      this.logger.info('Transaction created successfully', {
        studentId: params.studentId,
        type: params.transactionType
      });
    } catch (error) {
      this.logger.error('Failed to create transaction', { params, error });
      throw error;
    }
  }

  /**
   * Get transaction history for a student
   */
  async getTransactionHistory(studentId: string, options?: {
    limit?: number;
    offset?: number;
    transactionType?: HourTransactionType;
    startDate?: Date;
    endDate?: Date;
  }): Promise<HourApiResponse<HourTransaction[]>> {
    try {
      this.logger.info('Fetching transaction history', { studentId, options });

      let query = this.supabase
        .from('hour_transactions')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (options?.transactionType) {
        query = query.eq('transaction_type', options.transactionType);
      }

      if (options?.startDate) {
        query = query.gte('created_at', options.startDate.toISOString());
      }

      if (options?.endDate) {
        query = query.lte('created_at', options.endDate.toISOString());
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) {
        throw this.createServiceError('FETCH_TRANSACTIONS_ERROR', 'Failed to fetch transactions', error);
      }

      this.logger.info('Successfully fetched transaction history', { 
        studentId,
        count: data?.length || 0
      });

      return {
        success: true,
        data: this.transformTransactions(data || [])
      };
    } catch (error) {
      return this.createErrorResponse(error as ServiceError);
    }
  }

  /**
   * Reverse a transaction (for corrections)
   */
  async reverseTransaction(transactionId: string, reason: string): Promise<HourApiResponse<HourTransaction>> {
    try {
      this.logger.info('Reversing transaction', { transactionId, reason });

      const { data: user } = await this.supabase.auth.getUser();
      if (!user.user) {
        throw this.createServiceError('AUTH_ERROR', 'User not authenticated');
      }

      // Get the original transaction
      const { data: originalTransaction, error: fetchError } = await this.supabase
        .from('hour_transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (fetchError) {
        throw this.createServiceError('FETCH_TRANSACTION_ERROR', 'Failed to fetch transaction', fetchError);
      }

      if (originalTransaction.is_reversed) {
        throw this.createServiceError('ALREADY_REVERSED', 'Transaction has already been reversed');
      }

      // Create reversal transaction
      const currentBalance = await this.getStudentTotalHours(originalTransaction.student_id);
      const reversalAmount = -originalTransaction.hours_amount;

      const { data: reversalTransaction, error: reversalError } = await this.supabase
        .from('hour_transactions')
        .insert({
          student_id: originalTransaction.student_id,
          transaction_type: 'reversal',
          hours_amount: reversalAmount,
          balance_before: currentBalance,
          balance_after: currentBalance + reversalAmount,
          description: `Reversal of transaction ${transactionId}: ${reason}`,
          reason: reason,
          original_transaction_id: transactionId,
          created_by: user.user.id
        })
        .select()
        .single();

      if (reversalError) {
        throw this.createServiceError('CREATE_REVERSAL_ERROR', 'Failed to create reversal transaction', reversalError);
      }

      // Mark original transaction as reversed
      const { error: updateError } = await this.supabase
        .from('hour_transactions')
        .update({
          is_reversed: true,
          reversed_by: user.user.id,
          reversed_at: new Date().toISOString(),
          reversal_reason: reason
        })
        .eq('id', transactionId);

      if (updateError) {
        throw this.createServiceError('UPDATE_ORIGINAL_ERROR', 'Failed to update original transaction', updateError);
      }

      this.logger.info('Successfully reversed transaction', {
        originalTransactionId: transactionId,
        reversalTransactionId: reversalTransaction.id
      });

      return {
        success: true,
        data: this.transformTransaction(reversalTransaction)
      };
    } catch (error) {
      return this.createErrorResponse(error as ServiceError);
    }
  }

  // Private helper methods

  private async verifyFamilyTransferEligibility(
    fromStudentId: string, 
    toStudentId: string, 
    relationship?: string
  ): Promise<boolean> {
    // In a real implementation, this would check family account relationships
    // For now, we'll return true for any family transfer
    return true;
  }

  private async getOldestActivePurchase(studentId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('hour_purchases')
      .select('id')
      .eq('student_id', studentId)
      .eq('is_active', true)
      .eq('is_expired', false)
      .gt('hours_remaining', 0)
      .order('valid_until', { ascending: true })
      .limit(1)
      .single();

    if (error) {
      this.logger.warn('Failed to get oldest active purchase', { studentId, error });
      return null;
    }

    return data?.id || null;
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

  private transformTransactions(transactions: any[]): HourTransaction[] {
    return transactions.map(t => this.transformTransaction(t));
  }

  private transformTransaction(t: any): HourTransaction {
    return {
      id: t.id,
      studentId: t.student_id,
      purchaseId: t.purchase_id,
      transactionType: t.transaction_type,
      hoursAmount: t.hours_amount,
      balanceBefore: t.balance_before,
      balanceAfter: t.balance_after,
      classId: t.class_id,
      bookingId: t.booking_id,
      transferToStudentId: t.transfer_to_student_id,
      transferFromStudentId: t.transfer_from_student_id,
      classType: t.class_type,
      deductionRate: t.deduction_rate,
      description: t.description,
      reason: t.reason,
      requiresApproval: t.requires_approval,
      approvedBy: t.approved_by,
      approvedAt: t.approved_at,
      isReversed: t.is_reversed,
      reversedBy: t.reversed_by,
      reversedAt: t.reversed_at,
      reversalReason: t.reversal_reason,
      originalTransactionId: t.original_transaction_id,
      metadata: t.metadata,
      createdAt: t.created_at,
      createdBy: t.created_by
    };
  }

  private transformAlerts(alerts: any[]): HourAlert[] {
    return alerts.map(a => ({
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
    }));
  }

  private transformTransferLog(t: any): HourTransferLog {
    return {
      id: t.id,
      fromStudentId: t.from_student_id,
      toStudentId: t.to_student_id,
      fromPurchaseId: t.from_purchase_id,
      hoursTransferred: t.hours_transferred,
      transferReason: t.transfer_reason,
      isFamilyTransfer: t.is_family_transfer,
      familyRelationship: t.family_relationship,
      requiresApproval: t.requires_approval,
      approvedBy: t.approved_by,
      approvedAt: t.approved_at,
      approvalStatus: t.approval_status,
      fromTransactionId: t.from_transaction_id,
      toTransactionId: t.to_transaction_id,
      notes: t.notes,
      metadata: t.metadata,
      createdAt: t.created_at,
      createdBy: t.created_by
    };
  }
}

// Create and export singleton instance
export const hourTransactionService = withErrorHandling(new HourTransactionService());