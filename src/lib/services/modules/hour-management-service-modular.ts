/**
 * Modular Hour Management Service
 * 
 * This service provides a unified interface to all hour management operations
 * while internally using the focused service modules for better maintainability.
 */

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
  HourTransactionType
} from '@/types/hours';

import { 
  ServiceDependencies, 
  ServiceContainer, 
  withErrorHandling,
  ServiceError 
} from '../interfaces/service-interfaces';

import { HourPurchaseService } from './hour-purchase-service';
import { HourTransactionService } from './hour-transaction-service';
import { HourAdjustmentService } from './hour-adjustment-service';
import { HourStatisticsService } from './hour-statistics-service';

/**
 * Unified Hour Management Service that delegates to specialized modules
 */
export class ModularHourManagementService {
  readonly serviceName = 'ModularHourManagementService';
  readonly version = '1.0.0';
  
  private readonly purchaseService: HourPurchaseService;
  private readonly transactionService: HourTransactionService;
  private readonly adjustmentService: HourAdjustmentService;
  private readonly statisticsService: HourStatisticsService;
  private readonly logger;

  constructor(dependencies?: ServiceDependencies) {
    const deps = dependencies || ServiceContainer.getInstance().getDependencies();
    this.logger = deps.logger;
    
    // Initialize service modules
    this.purchaseService = new HourPurchaseService(deps);
    this.transactionService = new HourTransactionService(deps);
    this.adjustmentService = new HourAdjustmentService(deps);
    this.statisticsService = new HourStatisticsService(deps);
  }

  async isHealthy(): Promise<boolean> {
    try {
      const healthChecks = await Promise.all([
        this.purchaseService.isHealthy(),
        this.transactionService.isHealthy(),
        this.adjustmentService.isHealthy(),
        this.statisticsService.isHealthy()
      ]);

      return healthChecks.every(check => check === true);
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return false;
    }
  }

  // =====================================================================================
  // PACKAGE MANAGEMENT (delegated to HourPurchaseService)
  // =====================================================================================

  async getHourPackages(options?: {
    isActive?: boolean;
    isFeatured?: boolean;
    isCorporate?: boolean;
  }): Promise<HourApiResponse<HourPackage[]>> {
    return this.purchaseService.getHourPackages(options);
  }

  async getHourPackage(packageId: string): Promise<HourApiResponse<HourPackage>> {
    return this.purchaseService.getHourPackage(packageId);
  }

  async purchaseHours(request: HourPurchaseRequest): Promise<HourApiResponse<HourPurchase>> {
    return this.purchaseService.purchaseHours(request);
  }

  async getRecentPurchases(options?: { limit?: number }): Promise<HourApiResponse<HourPurchase[]>> {
    return this.purchaseService.getRecentPurchases(options);
  }

  async getStudentPurchaseHistory(studentId: string, options?: {
    limit?: number;
    offset?: number;
    status?: 'pending' | 'completed' | 'failed';
  }): Promise<HourApiResponse<HourPurchase[]>> {
    return this.purchaseService.getStudentPurchaseHistory(studentId, options);
  }

  async getCorporatePurchaseStats(corporateAccountId: string) {
    return this.purchaseService.getCorporatePurchaseStats(corporateAccountId);
  }

  // =====================================================================================
  // TRANSACTION MANAGEMENT (delegated to HourTransactionService)
  // =====================================================================================

  async deductClassHours(params: {
    studentId: string;
    classId: string;
    bookingId: string;
    hours: number;
    classType: string;
    deductionRate?: number;
  }): Promise<HourApiResponse<HourTransaction>> {
    return this.transactionService.deductClassHours(params);
  }

  async transferHours(request: HourTransferRequest): Promise<HourApiResponse<HourTransferLog>> {
    return this.transactionService.transferHours(request);
  }

  async getStudentHourBalance(studentId: string): Promise<HourApiResponse<StudentHourBalance>> {
    return this.transactionService.getStudentHourBalance(studentId);
  }

  async getStudentTotalHours(studentId: string): Promise<number> {
    return this.transactionService.getStudentTotalHours(studentId);
  }

  async getTransactionHistory(studentId: string, options?: {
    limit?: number;
    offset?: number;
    transactionType?: HourTransactionType;
    startDate?: Date;
    endDate?: Date;
  }): Promise<HourApiResponse<HourTransaction[]>> {
    return this.transactionService.getTransactionHistory(studentId, options);
  }

  async reverseTransaction(transactionId: string, reason: string): Promise<HourApiResponse<HourTransaction>> {
    return this.transactionService.reverseTransaction(transactionId, reason);
  }

  // =====================================================================================
  // ADJUSTMENT MANAGEMENT (delegated to HourAdjustmentService)
  // =====================================================================================

  async createHourAdjustment(request: HourAdjustmentRequest): Promise<HourApiResponse<HourAdjustment>> {
    return this.adjustmentService.createHourAdjustment(request);
  }

  async getPendingAdjustments(options?: {
    limit?: number;
    offset?: number;
    studentId?: string;
    requestedBy?: string;
  }): Promise<HourApiResponse<HourAdjustment[]>> {
    return this.adjustmentService.getPendingAdjustments(options);
  }

  async approveAdjustment(adjustmentId: string, params: { 
    approvalNotes?: string 
  }): Promise<HourApiResponse<HourAdjustment>> {
    return this.adjustmentService.approveAdjustment(adjustmentId, params);
  }

  async rejectAdjustment(adjustmentId: string, params: { 
    approvalNotes: string 
  }): Promise<HourApiResponse<HourAdjustment>> {
    return this.adjustmentService.rejectAdjustment(adjustmentId, params);
  }

  async getActiveAlerts(options?: {
    studentId?: string;
    alertType?: string;
    limit?: number;
  }): Promise<HourApiResponse<HourAlert[]>> {
    return this.adjustmentService.getActiveAlerts(options);
  }

  async createHourAlert(params: {
    studentId: string;
    alertType: 'low_balance' | 'expiring_package' | 'expired_hours' | 'negative_balance';
    hoursRemaining?: number;
    expiryDate?: string;
    thresholdValue?: number;
    metadata?: Record<string, any>;
  }): Promise<HourApiResponse<HourAlert>> {
    return this.adjustmentService.createHourAlert(params);
  }

  async acknowledgeAlert(alertId: string): Promise<HourApiResponse<HourAlert>> {
    return this.adjustmentService.acknowledgeAlert(alertId);
  }

  async getAdjustmentHistory(studentId: string, options?: {
    limit?: number;
    offset?: number;
    status?: 'pending' | 'approved' | 'rejected';
  }): Promise<HourApiResponse<HourAdjustment[]>> {
    return this.adjustmentService.getAdjustmentHistory(studentId, options);
  }

  // =====================================================================================
  // STATISTICS AND ANALYTICS (delegated to HourStatisticsService)
  // =====================================================================================

  async getHourUsageStats(studentId: string, periodDays: number = 90): Promise<HourApiResponse<HourUsageStats>> {
    return this.statisticsService.getHourUsageStats(studentId, periodDays);
  }

  async generateMonthlyReport(studentId: string, year: number, month: number) {
    return this.statisticsService.generateMonthlyReport(studentId, year, month);
  }

  async getSystemWideStats() {
    return this.statisticsService.getSystemWideStats();
  }

  async getComparativeUsageStats(studentIds: string[], periodDays: number = 30) {
    return this.statisticsService.getComparativeUsageStats(studentIds, periodDays);
  }

  async getPredictiveInsights(studentId: string) {
    return this.statisticsService.getPredictiveInsights(studentId);
  }

  // =====================================================================================
  // CONVENIENCE METHODS (combining multiple service operations)
  // =====================================================================================

  /**
   * Complete hour purchase flow including balance update and notifications
   */
  async completePurchaseFlow(request: HourPurchaseRequest): Promise<HourApiResponse<{
    purchase: HourPurchase;
    newBalance: StudentHourBalance;
    alertsCreated: HourAlert[];
  }>> {
    try {
      this.logger.info('Starting complete purchase flow', { studentId: request.studentId });

      // 1. Purchase hours
      const purchaseResult = await this.purchaseService.purchaseHours(request);
      if (!purchaseResult.success) {
        return purchaseResult as any;
      }

      // 2. Get updated balance
      const balanceResult = await this.transactionService.getStudentHourBalance(request.studentId);
      if (!balanceResult.success) {
        return balanceResult as any;
      }

      // 3. Create alerts if needed (for expiring packages, etc.)
      const alertsCreated: HourAlert[] = [];
      if (balanceResult.data.expiringPackages.length > 0) {
        for (const pkg of balanceResult.data.expiringPackages) {
          const alertResult = await this.adjustmentService.createHourAlert({
            studentId: request.studentId,
            alertType: 'expiring_package',
            hoursRemaining: pkg.hoursRemaining,
            expiryDate: pkg.validUntil,
            thresholdValue: pkg.daysRemaining,
            metadata: { packageId: pkg.purchaseId }
          });
          
          if (alertResult.success) {
            alertsCreated.push(alertResult.data);
          }
        }
      }

      this.logger.info('Successfully completed purchase flow', {
        studentId: request.studentId,
        purchaseId: purchaseResult.data.id,
        alertsCreated: alertsCreated.length
      });

      return {
        success: true,
        data: {
          purchase: purchaseResult.data,
          newBalance: balanceResult.data,
          alertsCreated
        }
      };
    } catch (error) {
      this.logger.error('Purchase flow failed', error);
      return {
        success: false,
        error: {
          code: 'PURCHASE_FLOW_ERROR',
          message: 'Failed to complete purchase flow',
          details: error
        }
      };
    }
  }

  /**
   * Complete class hour deduction with balance checks and alerts
   */
  async completeClassDeduction(params: {
    studentId: string;
    classId: string;
    bookingId: string;
    hours: number;
    classType: string;
    deductionRate?: number;
  }): Promise<HourApiResponse<{
    transaction: HourTransaction;
    newBalance: StudentHourBalance;
    alertsCreated: HourAlert[];
  }>> {
    try {
      this.logger.info('Starting complete class deduction', { 
        studentId: params.studentId,
        classId: params.classId,
        hours: params.hours 
      });

      // 1. Deduct hours
      const deductionResult = await this.transactionService.deductClassHours(params);
      if (!deductionResult.success) {
        return deductionResult as any;
      }

      // 2. Get updated balance
      const balanceResult = await this.transactionService.getStudentHourBalance(params.studentId);
      if (!balanceResult.success) {
        return balanceResult as any;
      }

      // 3. Create alerts if balance is low
      const alertsCreated: HourAlert[] = [];
      if (balanceResult.data.totalHours < 5) { // Low balance threshold
        const alertResult = await this.adjustmentService.createHourAlert({
          studentId: params.studentId,
          alertType: 'low_balance',
          hoursRemaining: balanceResult.data.totalHours,
          thresholdValue: 5,
          metadata: { 
            triggeredBy: 'class_deduction',
            classId: params.classId,
            bookingId: params.bookingId 
          }
        });
        
        if (alertResult.success) {
          alertsCreated.push(alertResult.data);
        }
      }

      this.logger.info('Successfully completed class deduction', {
        studentId: params.studentId,
        transactionId: deductionResult.data.id,
        newBalance: balanceResult.data.totalHours,
        alertsCreated: alertsCreated.length
      });

      return {
        success: true,
        data: {
          transaction: deductionResult.data,
          newBalance: balanceResult.data,
          alertsCreated
        }
      };
    } catch (error) {
      this.logger.error('Class deduction failed', error);
      return {
        success: false,
        error: {
          code: 'CLASS_DEDUCTION_ERROR',
          message: 'Failed to complete class deduction',
          details: error
        }
      };
    }
  }

  /**
   * Get comprehensive student hour overview
   */
  async getStudentHourOverview(studentId: string): Promise<HourApiResponse<{
    balance: StudentHourBalance;
    recentStats: HourUsageStats;
    predictiveInsights: any;
    pendingAdjustments: HourAdjustment[];
    activeAlerts: HourAlert[];
  }>> {
    try {
      this.logger.info('Getting comprehensive student hour overview', { studentId });

      // Get all data in parallel
      const [
        balanceResult,
        statsResult,
        insightsResult,
        adjustmentsResult,
        alertsResult
      ] = await Promise.all([
        this.transactionService.getStudentHourBalance(studentId),
        this.statisticsService.getHourUsageStats(studentId, 30),
        this.statisticsService.getPredictiveInsights(studentId),
        this.adjustmentService.getPendingAdjustments({ studentId, limit: 5 }),
        this.adjustmentService.getActiveAlerts({ studentId, limit: 10 })
      ]);

      // Check if any critical operations failed
      if (!balanceResult.success) {
        return balanceResult as any;
      }

      this.logger.info('Successfully compiled student hour overview', {
        studentId,
        totalHours: balanceResult.data.totalHours,
        activeAlerts: alertsResult.success ? alertsResult.data.length : 0,
        pendingAdjustments: adjustmentsResult.success ? adjustmentsResult.data.length : 0
      });

      return {
        success: true,
        data: {
          balance: balanceResult.data,
          recentStats: statsResult.success ? statsResult.data : {} as HourUsageStats,
          predictiveInsights: insightsResult.success ? insightsResult.data : null,
          pendingAdjustments: adjustmentsResult.success ? adjustmentsResult.data : [],
          activeAlerts: alertsResult.success ? alertsResult.data : []
        }
      };
    } catch (error) {
      this.logger.error('Failed to get student hour overview', error);
      return {
        success: false,
        error: {
          code: 'OVERVIEW_ERROR',
          message: 'Failed to get student hour overview',
          details: error
        }
      };
    }
  }

  // =====================================================================================
  // SERVICE MANAGEMENT
  // =====================================================================================

  /**
   * Get status of all service modules
   */
  async getServiceStatus(): Promise<{
    overall: boolean;
    modules: {
      purchase: boolean;
      transaction: boolean;
      adjustment: boolean;
      statistics: boolean;
    };
  }> {
    const [purchase, transaction, adjustment, statistics] = await Promise.all([
      this.purchaseService.isHealthy(),
      this.transactionService.isHealthy(),
      this.adjustmentService.isHealthy(),
      this.statisticsService.isHealthy()
    ]);

    return {
      overall: purchase && transaction && adjustment && statistics,
      modules: {
        purchase,
        transaction,
        adjustment,
        statistics
      }
    };
  }

  /**
   * Get service information
   */
  getServiceInfo(): {
    name: string;
    version: string;
    modules: Array<{
      name: string;
      version: string;
    }>;
  } {
    return {
      name: this.serviceName,
      version: this.version,
      modules: [
        { name: this.purchaseService.serviceName, version: this.purchaseService.version },
        { name: this.transactionService.serviceName, version: this.transactionService.version },
        { name: this.adjustmentService.serviceName, version: this.adjustmentService.version },
        { name: this.statisticsService.serviceName, version: this.statisticsService.version }
      ]
    };
  }

  /**
   * Dispose of all service resources
   */
  async dispose(): Promise<void> {
    this.logger.info('Disposing modular hour management service');
    
    // If services have dispose methods, call them
    const disposePromises = [
      this.purchaseService.dispose?.(),
      this.transactionService.dispose?.(),
      this.adjustmentService.dispose?.(),
      this.statisticsService.dispose?.()
    ].filter(Boolean);

    await Promise.all(disposePromises);
  }
}

// Create and export singleton instance
export const modularHourManagementService = withErrorHandling(new ModularHourManagementService());