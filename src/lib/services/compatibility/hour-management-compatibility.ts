/**
 * Hour Management Service Compatibility Layer
 * 
 * This module provides backward compatibility for existing code that uses
 * the original HourManagementService while internally using the new modular services.
 */

import { HourManagementService } from '../hour-management-service';
import { ModularHourManagementService } from '../modules/hour-management-service-modular';

/**
 * Enhanced HourManagementService that extends the original with modular capabilities
 */
export class EnhancedHourManagementService extends HourManagementService {
  private modularService: ModularHourManagementService;

  constructor() {
    super();
    this.modularService = new ModularHourManagementService();
  }

  /**
   * Get service status from both original and modular services
   */
  async getServiceStatus(): Promise<{
    overall: boolean;
    original: boolean;
    modular: {
      overall: boolean;
      modules: {
        purchase: boolean;
        transaction: boolean;
        adjustment: boolean;
        statistics: boolean;
      };
    };
  }> {
    const [originalHealthy, modularStatus] = await Promise.all([
      this.isHealthy(),
      this.modularService.getServiceStatus()
    ]);

    return {
      overall: originalHealthy && modularStatus.overall,
      original: originalHealthy,
      modular: modularStatus
    };
  }

  /**
   * Get comprehensive student overview using modular service
   */
  async getStudentHourOverview(studentId: string) {
    return this.modularService.getStudentHourOverview(studentId);
  }

  /**
   * Complete purchase flow using modular service
   */
  async completePurchaseFlow(request: any) {
    return this.modularService.completePurchaseFlow(request);
  }

  /**
   * Complete class deduction using modular service
   */
  async completeClassDeduction(params: any) {
    return this.modularService.completeClassDeduction(params);
  }

  /**
   * Get predictive insights using modular service
   */
  async getPredictiveInsights(studentId: string) {
    return this.modularService.getPredictiveInsights(studentId);
  }

  /**
   * Get comparative usage statistics using modular service
   */
  async getComparativeUsageStats(studentIds: string[], periodDays: number = 30) {
    return this.modularService.getComparativeUsageStats(studentIds, periodDays);
  }

  /**
   * Get system-wide statistics using modular service
   */
  async getSystemWideStats() {
    return this.modularService.getSystemWideStats();
  }

  /**
   * Generate monthly report using modular service
   */
  async generateMonthlyReport(studentId: string, year: number, month: number) {
    return this.modularService.generateMonthlyReport(studentId, year, month);
  }

  /**
   * Get service information
   */
  getServiceInfo() {
    return {
      name: 'EnhancedHourManagementService',
      version: '2.0.0',
      mode: 'hybrid',
      original: {
        name: 'HourManagementService',
        version: '1.0.0'
      },
      modular: this.modularService.getServiceInfo()
    };
  }

  /**
   * Dispose of all resources
   */
  async dispose(): Promise<void> {
    await Promise.all([
      super.dispose?.(),
      this.modularService.dispose?.()
    ].filter(Boolean));
  }
}

// Create enhanced singleton that maintains backward compatibility
export const enhancedHourManagementService = new EnhancedHourManagementService();

// Export the original service for backward compatibility
export { hourManagementService } from '../hour-management-service';