/**
 * Hour Management Service
 * 
 * This service handles all hour-related operations including purchases,
 * deductions, transfers, and balance calculations.
 */

import { createClient } from '@/lib/supabase';
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

export class HourManagementService {
  private supabase = createClient();

  /**
   * Get available hour packages
   */
  async getHourPackages(options?: {
    isActive?: boolean;
    isFeatured?: boolean;
    isCorporate?: boolean;
  }): Promise<HourApiResponse<HourPackage[]>> {
    try {
      let query = this.supabase
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
  async getHourPackage(packageId: string): Promise<HourApiResponse<HourPackage>> {
    try {
      const { data, error } = await this.supabase
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
  async purchaseHours(request: HourPurchaseRequest): Promise<HourApiResponse<HourPurchase>> {
    try {
      // Start a transaction
      const { data: user } = await this.supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Get package details
      const { data: packageData, error: packageError } = await this.supabase
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
      const { data: purchase, error: purchaseError } = await this.supabase
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
        const { data: updatedPurchase, error: updateError } = await this.supabase
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
        await this.supabase
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
  async getStudentHourBalance(studentId: string): Promise<HourApiResponse<StudentHourBalance>> {
    try {
      // Get total available hours
      const totalHours = await this.getStudentTotalHours(studentId);

      // Get active packages
      const { data: activePurchases, error: activeError } = await this.supabase
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
      const { data: transactions, error: transError } = await this.supabase
        .from('hour_transactions')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (transError) throw transError;

      // Get active alerts
      const { data: alerts, error: alertError } = await this.supabase
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
      const { data, error } = await this.supabase.rpc('deduct_class_hours', {
        p_student_id: params.studentId,
        p_class_id: params.classId,
        p_booking_id: params.bookingId,
        p_hours_to_deduct: params.hours,
        p_class_type: params.classType,
        p_deduction_rate: params.deductionRate || 1.0
      });

      if (error) throw error;

      // Get the created transaction
      const { data: transaction, error: transError } = await this.supabase
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

  /**
   * Transfer hours between students
   */
  async transferHours(request: HourTransferRequest): Promise<HourApiResponse<HourTransferLog>> {
    try {
      const { data: user } = await this.supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Verify students can transfer (family accounts, etc.)
      if (request.isFamilyTransfer) {
        // Additional verification logic here
      }

      // Check source student has enough hours
      const sourceBalance = await this.getStudentTotalHours(request.fromStudentId);
      if (sourceBalance < request.hoursToTransfer) {
        throw new Error('Insufficient hours for transfer');
      }

      // Start transaction
      const balanceBefore = {
        from: sourceBalance,
        to: await this.getStudentTotalHours(request.toStudentId)
      };

      // Create deduction transaction for source
      const { data: fromTransaction } = await this.supabase
        .from('hour_transactions')
        .insert({
          student_id: request.fromStudentId,
          transaction_type: 'transfer',
          hours_amount: -request.hoursToTransfer,
          balance_before: balanceBefore.from,
          balance_after: balanceBefore.from - request.hoursToTransfer,
          transfer_to_student_id: request.toStudentId,
          description: `Transfer to student ${request.toStudentId}`,
          reason: request.reason
        })
        .select()
        .single();

      // Create addition transaction for destination
      const { data: toTransaction } = await this.supabase
        .from('hour_transactions')
        .insert({
          student_id: request.toStudentId,
          transaction_type: 'transfer',
          hours_amount: request.hoursToTransfer,
          balance_before: balanceBefore.to,
          balance_after: balanceBefore.to + request.hoursToTransfer,
          transfer_from_student_id: request.fromStudentId,
          description: `Transfer from student ${request.fromStudentId}`,
          reason: request.reason
        })
        .select()
        .single();

      // Create transfer log
      const { data: transferLog, error: logError } = await this.supabase
        .from('hour_transfer_logs')
        .insert({
          from_student_id: request.fromStudentId,
          to_student_id: request.toStudentId,
          from_purchase_id: await this.getOldestActivePurchase(request.fromStudentId),
          hours_transferred: request.hoursToTransfer,
          transfer_reason: request.reason,
          is_family_transfer: request.isFamilyTransfer,
          family_relationship: request.familyRelationship,
          from_transaction_id: fromTransaction?.id,
          to_transaction_id: toTransaction?.id,
          notes: request.notes,
          created_by: user.user.id
        })
        .select()
        .single();

      if (logError) throw logError;

      return {
        success: true,
        data: this.transformTransferLog(transferLog)
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'TRANSFER_ERROR',
          message: 'Failed to transfer hours',
          details: error
        }
      };
    }
  }

  /**
   * Create hour adjustment
   */
  async createHourAdjustment(request: HourAdjustmentRequest): Promise<HourApiResponse<HourAdjustment>> {
    try {
      const { data: user } = await this.supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const balanceBefore = await this.getStudentTotalHours(request.studentId);
      const hoursAmount = request.adjustmentType === 'subtract' ? -request.hoursToAdjust : request.hoursToAdjust;
      const balanceAfter = balanceBefore + hoursAmount;

      // Create transaction
      const { data: transaction, error: transError } = await this.supabase
        .from('hour_transactions')
        .insert({
          student_id: request.studentId,
          transaction_type: 'adjustment',
          hours_amount: hoursAmount,
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          description: `Manual adjustment: ${request.reason}`,
          reason: request.reason,
          requires_approval: true,
          created_by: user.user.id
        })
        .select()
        .single();

      if (transError) throw transError;

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
          metadata: { notes: request.notes }
        })
        .select()
        .single();

      if (adjError) throw adjError;

      return {
        success: true,
        data: this.transformAdjustment(adjustment)
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ADJUSTMENT_ERROR',
          message: 'Failed to create adjustment',
          details: error
        }
      };
    }
  }

  /**
   * Get hour usage statistics
   */
  async getHourUsageStats(studentId: string, periodDays: number = 90): Promise<HourApiResponse<HourUsageStats>> {
    try {
      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - periodDays);

      // Get all transactions in period
      const { data: transactions, error } = await this.supabase
        .from('hour_transactions')
        .select('*')
        .eq('student_id', studentId)
        .gte('created_at', periodStart.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate statistics
      const stats = this.calculateUsageStats(transactions || [], periodStart);

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'STATS_ERROR',
          message: 'Failed to calculate usage statistics',
          details: error
        }
      };
    }
  }

  /**
   * Get recent purchases
   */
  async getRecentPurchases(options?: { limit?: number }): Promise<HourApiResponse<HourPurchase[]>> {
    try {
      const { data, error } = await this.supabase
        .from('hour_purchases')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(options?.limit || 10);

      if (error) throw error;

      return {
        success: true,
        data: data?.map(p => this.transformPurchase(p)) || []
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FETCH_PURCHASES_ERROR',
          message: 'Failed to fetch recent purchases',
          details: error
        }
      };
    }
  }

  /**
   * Get pending adjustments
   */
  async getPendingAdjustments(): Promise<HourApiResponse<HourAdjustment[]>> {
    try {
      const { data, error } = await this.supabase
        .from('hour_adjustments')
        .select('*')
        .eq('approval_status', 'pending')
        .order('requested_at', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data: data?.map(a => this.transformAdjustment(a)) || []
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FETCH_ADJUSTMENTS_ERROR',
          message: 'Failed to fetch pending adjustments',
          details: error
        }
      };
    }
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(): Promise<HourApiResponse<HourAlert[]>> {
    try {
      const { data, error } = await this.supabase
        .from('hour_alerts')
        .select('*')
        .eq('is_active', true)
        .eq('is_acknowledged', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data: this.transformAlerts(data || [])
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FETCH_ALERTS_ERROR',
          message: 'Failed to fetch active alerts',
          details: error
        }
      };
    }
  }

  /**
   * Approve an adjustment
   */
  async approveAdjustment(adjustmentId: string, params: { approvalNotes?: string }): Promise<HourApiResponse<HourAdjustment>> {
    try {
      const { data: user } = await this.supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data, error } = await this.supabase
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

      if (error) throw error;

      return {
        success: true,
        data: this.transformAdjustment(data)
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'APPROVE_ERROR',
          message: 'Failed to approve adjustment',
          details: error
        }
      };
    }
  }

  /**
   * Reject an adjustment
   */
  async rejectAdjustment(adjustmentId: string, params: { approvalNotes: string }): Promise<HourApiResponse<HourAdjustment>> {
    try {
      const { data: user } = await this.supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data, error } = await this.supabase
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

      if (error) throw error;

      return {
        success: true,
        data: this.transformAdjustment(data)
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'REJECT_ERROR',
          message: 'Failed to reject adjustment',
          details: error
        }
      };
    }
  }

  // Private helper methods

  private async processPayment(purchaseId: string, request: HourPurchaseRequest): Promise<{
    success: boolean;
    reference?: string;
    error?: string;
  }> {
    // Simplified payment processing
    // In production, integrate with actual payment gateway
    return {
      success: true,
      reference: `PAY-${Date.now()}`
    };
  }

  private async getStudentTotalHours(studentId: string): Promise<number> {
    const { data, error } = await this.supabase.rpc('calculate_student_hours', {
      p_student_id: studentId
    });

    if (error) throw error;
    return data || 0;
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

    return data?.id || null;
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

    if (error) throw error;
  }

  private calculateUsageStats(transactions: any[], periodStart: Date): HourUsageStats {
    const now = new Date();
    const stats: HourUsageStats = {
      periodStart: periodStart.toISOString(),
      periodEnd: now.toISOString(),
      totalHoursUsed: 0,
      totalHoursPurchased: 0,
      totalHoursExpired: 0,
      totalHoursTransferred: 0,
      averageUsagePerWeek: 0,
      mostActiveDay: '',
      preferredClassType: '',
      usageByClassType: {},
      usageByMonth: []
    };

    // Calculate totals by transaction type
    transactions.forEach(t => {
      switch (t.transaction_type) {
        case 'deduction':
          stats.totalHoursUsed += Math.abs(t.hours_amount);
          if (t.class_type) {
            stats.usageByClassType[t.class_type] = (stats.usageByClassType[t.class_type] || 0) + Math.abs(t.hours_amount);
          }
          break;
        case 'purchase':
          stats.totalHoursPurchased += t.hours_amount;
          break;
        case 'expiry':
          stats.totalHoursExpired += Math.abs(t.hours_amount);
          break;
        case 'transfer':
          if (t.hours_amount < 0) {
            stats.totalHoursTransferred += Math.abs(t.hours_amount);
          }
          break;
      }
    });

    // Calculate average usage per week
    const weeks = Math.ceil((now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24 * 7));
    stats.averageUsagePerWeek = stats.totalHoursUsed / weeks;

    // Find most active day and preferred class type
    const dayCount: Record<string, number> = {};
    const deductions = transactions.filter(t => t.transaction_type === 'deduction');
    
    deductions.forEach(t => {
      const day = new Date(t.created_at).toLocaleDateString('en-US', { weekday: 'long' });
      dayCount[day] = (dayCount[day] || 0) + 1;
    });

    stats.mostActiveDay = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    stats.preferredClassType = Object.entries(stats.usageByClassType).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    // Calculate usage by month
    const monthlyUsage: Record<string, number> = {};
    deductions.forEach(t => {
      const month = new Date(t.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      monthlyUsage[month] = (monthlyUsage[month] || 0) + Math.abs(t.hours_amount);
    });

    stats.usageByMonth = Object.entries(monthlyUsage).map(([month, hoursUsed]) => ({
      month,
      hoursUsed
    }));

    return stats;
  }

  // Transform methods to convert database records to TypeScript interfaces

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

// Export singleton instance
export const hourManagementService = new HourManagementService();