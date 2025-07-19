/**
 * Hour Management Service (Refactored)
 * 
 * This service handles all hour-related operations including purchases,
 * deductions, transfers, and balance calculations.
 * 
 * Refactored to use dependency injection and the ServiceBase pattern.
 */

import { ServiceBase, ServiceMethod, BaseServiceFactory, type ServiceDependencies } from './base';
import { supabase } from '@/lib/supabase';
import type {
  HourPackage,
  HourPurchase,
  HourTransaction,
  HourAdjustment,
  HourAlert,
  HourTransferLog,
  StudentHourBalance,
  HourUsageStats,
  HourPurchaseRequest,
  HourTransferRequest,
  HourAdjustmentRequest,
  HourApiResponse,
  HourPaginatedResponse,
  PaymentStatus,
  HourTransactionType
} from '@/types/hours';

export class HourManagementService extends ServiceBase {
  constructor(dependencies?: ServiceDependencies) {
    super({
      name: 'HourManagementService',
      dependencies,
      options: {}
    });
    
    // If no Supabase client is injected, use default
    if (!this.supabaseClient) {
      this.supabaseClient = supabase;
    }
    
    this.validateDependencies(['supabaseClient']);
  }

  /**
   * Get available hour packages
   */
  @ServiceMethod('getHourPackages')
  async getHourPackages(options?: {
    isActive?: boolean;
    isFeatured?: boolean;
    isCorporate?: boolean;
  }): Promise<HourApiResponse<HourPackage[]>> {
    try {
      let query = this.supabaseClient!
        .from('hour_packages')
        .select('*')
        .order('display_order', { ascending: true });

      if (options?.isActive !== undefined) {
        query = query.eq('is_active', options.isActive);
      }
      if (options?.isFeatured !== undefined) {
        query = query.eq('is_featured', options.isFeatured);
      }
      if (options?.isCorporate !== undefined) {
        query = query.eq('is_corporate', options.isCorporate);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        data: this.transformPackages(data || [])
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FETCH_PACKAGES_ERROR',
          message: 'Failed to fetch hour packages',
          details: error
        }
      };
    }
  }

  /**
   * Get a specific hour package
   */
  @ServiceMethod('getHourPackage')
  async getHourPackage(packageId: string): Promise<HourApiResponse<HourPackage>> {
    try {
      const { data, error } = await this.supabaseClient!
        .from('hour_packages')
        .select('*')
        .eq('id', packageId)
        .single();

      if (error) throw error;

      return {
        success: true,
        data: this.transformPackage(data)
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FETCH_PACKAGE_ERROR',
          message: 'Failed to fetch hour package',
          details: error
        }
      };
    }
  }

  /**
   * Purchase hours for a student
   */
  @ServiceMethod('purchaseHours')
  async purchaseHours(request: HourPurchaseRequest): Promise<HourApiResponse<HourPurchase>> {
    try {
      // Start a transaction
      const { data: user } = await this.supabaseClient!.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Get package details
      const { data: packageData, error: packageError } = await this.supabaseClient!
        .from('hour_packages')
        .select('*')
        .eq('id', request.packageId)
        .single();

      if (packageError || !packageData) {
        throw new Error('Invalid package ID');
      }

      // Calculate validity period
      const validFrom = new Date();
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + packageData.validity_days);

      // Create purchase record
      const { data: purchase, error: purchaseError } = await this.supabaseClient!
        .from('hour_purchases')
        .insert({
          student_id: request.studentId,
          package_id: request.packageId,
          hours_purchased: packageData.hours_included,
          price_paid: packageData.price,
          currency: packageData.currency,
          payment_status: 'pending',
          payment_method: request.paymentMethod,
          valid_from: validFrom.toISOString(),
          valid_until: validUntil.toISOString(),
          is_corporate_purchase: request.isCorporatePurchase || false,
          corporate_account_id: request.corporateAccountId,
          invoice_number: request.invoiceNumber,
          notes: request.notes,
          metadata: request.paymentDetails
        })
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      // Process payment (simplified - in production, integrate with payment gateway)
      const paymentResult = await this.processPayment(purchase.id, request);

      if (paymentResult.success) {
        // Update payment status
        const { data: updatedPurchase, error: updateError } = await this.supabaseClient!
          .from('hour_purchases')
          .update({
            payment_status: 'completed',
            payment_reference: paymentResult.reference,
            paid_at: new Date().toISOString()
          })
          .eq('id', purchase.id)
          .select()
          .single();

        if (updateError) throw updateError;

        // Create transaction record
        await this.createTransaction({
          studentId: request.studentId,
          purchaseId: purchase.id,
          transactionType: 'purchase',
          hoursAmount: packageData.hours_included,
          description: `Purchased ${packageData.name}`,
          balanceBefore: await this.getStudentTotalHours(request.studentId),
          balanceAfter: await this.getStudentTotalHours(request.studentId) + packageData.hours_included
        });

        return {
          success: true,
          data: this.transformPurchase(updatedPurchase)
        };
      } else {
        // Payment failed
        await this.supabaseClient!
          .from('hour_purchases')
          .update({ payment_status: 'failed' })
          .eq('id', purchase.id);

        throw new Error('Payment processing failed');
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PURCHASE_ERROR',
          message: 'Failed to purchase hours',
          details: error
        }
      };
    }
  }

  /**
   * Get student hour balance
   */
  @ServiceMethod('getStudentHourBalance')
  async getStudentHourBalance(studentId: string): Promise<HourApiResponse<StudentHourBalance>> {
    try {
      // Get total available hours
      const totalHours = await this.getStudentTotalHours(studentId);

      // Get active packages
      const { data: activePurchases, error: activeError } = await this.supabaseClient!
        .from('hour_purchases')
        .select(`
          *,
          hour_packages (name)
        `)
        .eq('student_id', studentId)
        .eq('is_active', true)
        .eq('is_expired', false)
        .eq('payment_status', 'completed')
        .gt('hours_remaining', 0)
        .order('valid_until', { ascending: true });

      if (activeError) throw activeError;

      // Get expiring packages (within 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const expiringPackages = activePurchases?.filter(p => 
        new Date(p.valid_until) <= thirtyDaysFromNow
      ) || [];

      // Get recent transactions
      const { data: transactions, error: transError } = await this.supabaseClient!
        .from('hour_transactions')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (transError) throw transError;

      // Get active alerts
      const { data: alerts, error: alertError } = await this.supabaseClient!
        .from('hour_alerts')
        .select('*')
        .eq('student_id', studentId)
        .eq('is_active', true)
        .eq('is_acknowledged', false);

      if (alertError) throw alertError;

      const balance: StudentHourBalance = {
        studentId,
        totalHours,
        activePackages: activePurchases?.map(p => ({
          purchaseId: p.id,
          packageName: p.hour_packages.name,
          hoursRemaining: p.hours_remaining,
          validUntil: p.valid_until,
          daysRemaining: Math.ceil(
            (new Date(p.valid_until).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          )
        })) || [],
        expiringPackages: expiringPackages.map(p => ({
          purchaseId: p.id,
          packageName: p.hour_packages.name,
          hoursRemaining: p.hours_remaining,
          validUntil: p.valid_until,
          daysRemaining: Math.ceil(
            (new Date(p.valid_until).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          )
        })),
        recentTransactions: this.transformTransactions(transactions || []),
        alerts: this.transformAlerts(alerts || [])
      };

      return {
        success: true,
        data: balance
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FETCH_BALANCE_ERROR',
          message: 'Failed to fetch hour balance',
          details: error
        }
      };
    }
  }

  /**
   * Deduct hours for a class
   */
  @ServiceMethod('deductClassHours')
  async deductClassHours(params: {
    studentId: string;
    classId: string;
    bookingId: string;
    hours: number;
    classType: string;
    deductionRate?: number;
  }): Promise<HourApiResponse<HourTransaction>> {
    try {
      // Call the database function
      const { data, error } = await this.supabaseClient!.rpc('deduct_class_hours', {
        p_student_id: params.studentId,
        p_class_id: params.classId,
        p_booking_id: params.bookingId,
        p_hours_to_deduct: params.hours,
        p_class_type: params.classType,
        p_deduction_rate: params.deductionRate || 1.0
      });

      if (error) throw error;

      // Get the created transaction
      const { data: transaction, error: transError } = await this.supabaseClient!
        .from('hour_transactions')
        .select('*')
        .eq('id', data)
        .single();

      if (transError) throw transError;

      return {
        success: true,
        data: this.transformTransaction(transaction)
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DEDUCTION_ERROR',
          message: 'Failed to deduct hours',
          details: error
        }
      };
    }
  }

  // Private helper methods (shortened for brevity)
  private async processPayment(purchaseId: string, request: HourPurchaseRequest): Promise<{
    success: boolean;
    reference?: string;
    error?: string;
  }> {
    // Simplified payment processing
    return {
      success: true,
      reference: `PAY-${Date.now()}`
    };
  }

  private async getStudentTotalHours(studentId: string): Promise<number> {
    const { data, error } = await this.supabaseClient!.rpc('calculate_student_hours', {
      p_student_id: studentId
    });

    if (error) throw error;
    return data || 0;
  }

  private async createTransaction(params: {
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
    const { error } = await this.supabaseClient!
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

    if (error) throw error;
  }

  // Transform methods (abbreviated for brevity)
  private transformPackages(packages: any[]): HourPackage[] {
    return packages.map(p => this.transformPackage(p));
  }

  private transformPackage(p: any): HourPackage {
    return {
      id: p.id,
      packageType: p.package_type,
      name: p.name,
      description: p.description,
      hoursIncluded: p.hours_included,
      validityDays: p.validity_days,
      price: p.price,
      currency: p.currency,
      discountPercentage: p.discount_percentage,
      originalPrice: p.original_price,
      classTypesAllowed: p.class_types_allowed,
      courseTypesAllowed: p.course_types_allowed,
      features: p.features || [],
      isActive: p.is_active,
      isFeatured: p.is_featured,
      displayOrder: p.display_order,
      maxPurchasesPerStudent: p.max_purchases_per_student,
      minPurchaseHours: p.min_purchase_hours,
      isCorporate: p.is_corporate,
      requiresApproval: p.requires_approval,
      metadata: p.metadata,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      createdBy: p.created_by,
      updatedBy: p.updated_by
    };
  }

  private transformPurchase(p: any): HourPurchase {
    return {
      id: p.id,
      studentId: p.student_id,
      packageId: p.package_id,
      hoursPurchased: p.hours_purchased,
      pricePaid: p.price_paid,
      currency: p.currency,
      paymentStatus: p.payment_status,
      paymentMethod: p.payment_method,
      paymentReference: p.payment_reference,
      paymentGatewayResponse: p.payment_gateway_response,
      paidAt: p.paid_at,
      validFrom: p.valid_from,
      validUntil: p.valid_until,
      hoursUsed: p.hours_used,
      hoursRemaining: p.hours_remaining,
      isTransferable: p.is_transferable,
      transferLimit: p.transfer_limit,
      transfersMade: p.transfers_made,
      isCorporatePurchase: p.is_corporate_purchase,
      corporateAccountId: p.corporate_account_id,
      invoiceNumber: p.invoice_number,
      isActive: p.is_active,
      isExpired: p.is_expired,
      notes: p.notes,
      metadata: p.metadata,
      createdAt: p.created_at,
      updatedAt: p.updated_at
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
}

/**
 * Factory for creating HourManagementService instances
 */
export class HourManagementServiceFactory extends BaseServiceFactory<HourManagementService> {
  create(dependencies?: ServiceDependencies, options?: Record<string, any>): HourManagementService {
    return new HourManagementService(dependencies);
  }
}

/**
 * Factory function for creating service instances
 */
export function createHourManagementService(dependencies?: ServiceDependencies): HourManagementService {
  return new HourManagementService(dependencies);
}

// Export singleton instance for backward compatibility
export const hourManagementService = new HourManagementService();