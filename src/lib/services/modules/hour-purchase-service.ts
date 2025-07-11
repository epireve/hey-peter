/**
 * Hour Purchase Service Module
 * 
 * This module handles all hour package-related operations including:
 * - Package management and retrieval
 * - Hour purchases and payment processing
 * - Purchase history and tracking
 * - Corporate purchase handling
 */

import type {
  HourPackage,
  HourPurchase,
  HourPurchaseRequest,
  HourApiResponse,
  PaymentStatus
} from '@/types/hours';
import { 
  IHourPurchaseService, 
  ServiceDependencies, 
  ServiceContainer, 
  withErrorHandling,
  ServiceError 
} from '../interfaces/service-interfaces';

export class HourPurchaseService implements IHourPurchaseService {
  readonly serviceName = 'HourPurchaseService';
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
        .from('hour_packages')
        .select('id')
        .limit(1);
      
      return !error;
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * Get available hour packages with optional filtering
   */
  async getHourPackages(options?: {
    isActive?: boolean;
    isFeatured?: boolean;
    isCorporate?: boolean;
  }): Promise<HourApiResponse<HourPackage[]>> {
    try {
      this.logger.info('Fetching hour packages', { options });
      
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

      if (error) {
        throw this.createServiceError('FETCH_PACKAGES_ERROR', 'Failed to fetch hour packages', error);
      }

      this.logger.info('Successfully fetched hour packages', { count: data?.length || 0 });
      
      return {
        success: true,
        data: this.transformPackages(data || [])
      };
    } catch (error) {
      return this.createErrorResponse(error as ServiceError);
    }
  }

  /**
   * Get a specific hour package by ID
   */
  async getHourPackage(packageId: string): Promise<HourApiResponse<HourPackage>> {
    try {
      this.logger.info('Fetching hour package', { packageId });
      
      const { data, error } = await this.supabase
        .from('hour_packages')
        .select('*')
        .eq('id', packageId)
        .single();

      if (error) {
        throw this.createServiceError('FETCH_PACKAGE_ERROR', 'Failed to fetch hour package', error);
      }

      this.logger.info('Successfully fetched hour package', { packageId, packageName: data.name });
      
      return {
        success: true,
        data: this.transformPackage(data)
      };
    } catch (error) {
      return this.createErrorResponse(error as ServiceError);
    }
  }

  /**
   * Purchase hours for a student
   */
  async purchaseHours(request: HourPurchaseRequest): Promise<HourApiResponse<HourPurchase>> {
    try {
      this.logger.info('Processing hour purchase', { 
        studentId: request.studentId,
        packageId: request.packageId,
        paymentMethod: request.paymentMethod 
      });

      // Validate authentication
      const { data: user } = await this.supabase.auth.getUser();
      if (!user.user) {
        throw this.createServiceError('AUTH_ERROR', 'User not authenticated');
      }

      // Get package details
      const packageResult = await this.getHourPackage(request.packageId);
      if (!packageResult.success || !packageResult.data) {
        throw this.createServiceError('INVALID_PACKAGE', 'Invalid package ID');
      }

      const packageData = packageResult.data;

      // Calculate validity period
      const validFrom = new Date();
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + packageData.validityDays);

      // Create purchase record
      const purchaseData = {
        student_id: request.studentId,
        package_id: request.packageId,
        hours_purchased: packageData.hoursIncluded,
        price_paid: packageData.price,
        currency: packageData.currency,
        payment_status: 'pending' as PaymentStatus,
        payment_method: request.paymentMethod,
        valid_from: validFrom.toISOString(),
        valid_until: validUntil.toISOString(),
        is_corporate_purchase: request.isCorporatePurchase || false,
        corporate_account_id: request.corporateAccountId,
        invoice_number: request.invoiceNumber,
        notes: request.notes,
        metadata: request.paymentDetails
      };

      const { data: purchase, error: purchaseError } = await this.supabase
        .from('hour_purchases')
        .insert(purchaseData)
        .select()
        .single();

      if (purchaseError) {
        throw this.createServiceError('PURCHASE_CREATE_ERROR', 'Failed to create purchase record', purchaseError);
      }

      this.logger.info('Created purchase record', { purchaseId: purchase.id });

      // Process payment
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

        if (updateError) {
          throw this.createServiceError('PAYMENT_UPDATE_ERROR', 'Failed to update payment status', updateError);
        }

        this.logger.info('Successfully processed hour purchase', { 
          purchaseId: purchase.id,
          paymentReference: paymentResult.reference 
        });

        return {
          success: true,
          data: this.transformPurchase(updatedPurchase)
        };
      } else {
        // Payment failed - update status
        await this.supabase
          .from('hour_purchases')
          .update({ payment_status: 'failed' })
          .eq('id', purchase.id);

        throw this.createServiceError('PAYMENT_FAILED', 'Payment processing failed', paymentResult.error);
      }
    } catch (error) {
      return this.createErrorResponse(error as ServiceError);
    }
  }

  /**
   * Get recent purchases with optional limit
   */
  async getRecentPurchases(options?: { limit?: number }): Promise<HourApiResponse<HourPurchase[]>> {
    try {
      this.logger.info('Fetching recent purchases', { limit: options?.limit });
      
      const { data, error } = await this.supabase
        .from('hour_purchases')
        .select(`
          *,
          hour_packages (name, package_type)
        `)
        .order('created_at', { ascending: false })
        .limit(options?.limit || 10);

      if (error) {
        throw this.createServiceError('FETCH_PURCHASES_ERROR', 'Failed to fetch recent purchases', error);
      }

      this.logger.info('Successfully fetched recent purchases', { count: data?.length || 0 });
      
      return {
        success: true,
        data: data?.map(p => this.transformPurchase(p)) || []
      };
    } catch (error) {
      return this.createErrorResponse(error as ServiceError);
    }
  }

  /**
   * Process payment for a purchase
   * In production, this would integrate with actual payment gateways
   */
  async processPayment(purchaseId: string, request: HourPurchaseRequest): Promise<{
    success: boolean;
    reference?: string;
    error?: string;
  }> {
    try {
      this.logger.info('Processing payment', { purchaseId, paymentMethod: request.paymentMethod });
      
      // Simulate payment processing
      // In production, integrate with Stripe, PayPal, etc.
      
      // For development/testing, simulate different payment outcomes
      const isTestMode = process.env.NODE_ENV === 'development';
      
      if (isTestMode && request.paymentMethod === 'test_fail') {
        return {
          success: false,
          error: 'Test payment failure'
        };
      }

      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      const paymentReference = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      this.logger.info('Payment processed successfully', { 
        purchaseId, 
        paymentReference 
      });

      return {
        success: true,
        reference: paymentReference
      };
    } catch (error) {
      this.logger.error('Payment processing failed', { purchaseId, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment processing failed'
      };
    }
  }

  /**
   * Get purchase history for a student
   */
  async getStudentPurchaseHistory(studentId: string, options?: {
    limit?: number;
    offset?: number;
    status?: PaymentStatus;
  }): Promise<HourApiResponse<HourPurchase[]>> {
    try {
      this.logger.info('Fetching student purchase history', { studentId, options });
      
      let query = this.supabase
        .from('hour_purchases')
        .select(`
          *,
          hour_packages (name, package_type)
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (options?.status) {
        query = query.eq('payment_status', options.status);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) {
        throw this.createServiceError('FETCH_STUDENT_PURCHASES_ERROR', 'Failed to fetch student purchases', error);
      }

      this.logger.info('Successfully fetched student purchase history', { 
        studentId, 
        count: data?.length || 0 
      });
      
      return {
        success: true,
        data: data?.map(p => this.transformPurchase(p)) || []
      };
    } catch (error) {
      return this.createErrorResponse(error as ServiceError);
    }
  }

  /**
   * Get corporate purchase statistics
   */
  async getCorporatePurchaseStats(corporateAccountId: string): Promise<HourApiResponse<{
    totalPurchases: number;
    totalHoursPurchased: number;
    totalAmountSpent: number;
    averagePurchaseValue: number;
    mostPopularPackage: { name: string; count: number } | null;
    monthlyTrends: Array<{ month: string; purchases: number; hours: number; amount: number }>;
  }>> {
    try {
      this.logger.info('Fetching corporate purchase stats', { corporateAccountId });
      
      const { data, error } = await this.supabase
        .from('hour_purchases')
        .select(`
          *,
          hour_packages (name, package_type)
        `)
        .eq('corporate_account_id', corporateAccountId)
        .eq('payment_status', 'completed');

      if (error) {
        throw this.createServiceError('FETCH_CORPORATE_STATS_ERROR', 'Failed to fetch corporate stats', error);
      }

      const purchases = data || [];
      
      // Calculate statistics
      const totalPurchases = purchases.length;
      const totalHoursPurchased = purchases.reduce((sum, p) => sum + p.hours_purchased, 0);
      const totalAmountSpent = purchases.reduce((sum, p) => sum + p.price_paid, 0);
      const averagePurchaseValue = totalPurchases > 0 ? totalAmountSpent / totalPurchases : 0;

      // Find most popular package
      const packageCounts: Record<string, number> = {};
      purchases.forEach(p => {
        const packageName = p.hour_packages?.name || 'Unknown';
        packageCounts[packageName] = (packageCounts[packageName] || 0) + 1;
      });

      const mostPopularPackage = Object.entries(packageCounts)
        .sort(([, a], [, b]) => b - a)[0];

      // Calculate monthly trends
      const monthlyData: Record<string, { purchases: number; hours: number; amount: number }> = {};
      purchases.forEach(p => {
        const month = new Date(p.created_at).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short' 
        });
        
        if (!monthlyData[month]) {
          monthlyData[month] = { purchases: 0, hours: 0, amount: 0 };
        }
        
        monthlyData[month].purchases++;
        monthlyData[month].hours += p.hours_purchased;
        monthlyData[month].amount += p.price_paid;
      });

      const monthlyTrends = Object.entries(monthlyData)
        .map(([month, data]) => ({ month, ...data }))
        .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

      this.logger.info('Successfully calculated corporate purchase stats', { 
        corporateAccountId,
        totalPurchases,
        totalHoursPurchased 
      });

      return {
        success: true,
        data: {
          totalPurchases,
          totalHoursPurchased,
          totalAmountSpent,
          averagePurchaseValue,
          mostPopularPackage: mostPopularPackage ? 
            { name: mostPopularPackage[0], count: mostPopularPackage[1] } : null,
          monthlyTrends
        }
      };
    } catch (error) {
      return this.createErrorResponse(error as ServiceError);
    }
  }

  // Private helper methods

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
}

// Create and export singleton instance
export const hourPurchaseService = withErrorHandling(new HourPurchaseService());