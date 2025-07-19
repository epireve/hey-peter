/**
 * Hour Management Service (Simplified)
 * 
 * This service handles all hour-related operations including purchases,
 * deductions, transfers, and balance calculations.
 * 
 * Refactored to use dependency injection without decorators.
 */

import { ServiceBase, BaseServiceFactory, type ServiceDependencies } from './base';
import { supabase } from '@/lib/supabase';
import type {
  HourPackage,
  HourPurchase,
  HourTransaction,
  HourApiResponse,
  HourPurchaseRequest,
  StudentHourBalance
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
  }

  /**
   * Get available hour packages
   */
  async getHourPackages(options?: {
    isActive?: boolean;
    isFeatured?: boolean;
    isCorporate?: boolean;
  }): Promise<HourApiResponse<HourPackage[]>> {
    try {
      return await this.executeOperation('getHourPackages', async () => {
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
      });
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
      return await this.executeOperation('getHourPackage', async () => {
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
      });
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
   * Get student hour balance
   */
  async getStudentHourBalance(studentId: string): Promise<HourApiResponse<StudentHourBalance>> {
    return this.executeOperation('getStudentHourBalance', async () => {
      // Get total available hours
      const totalHours = await this.getStudentTotalHours(studentId);

      const balance: StudentHourBalance = {
        studentId,
        totalHours,
        activePackages: [],
        expiringPackages: [],
        recentTransactions: [],
        alerts: []
      };

      return {
        success: true,
        data: balance
      };
    });
  }

  // Private helper methods
  private async getStudentTotalHours(studentId: string): Promise<number> {
    const { data, error } = await this.supabaseClient!.rpc('calculate_student_hours', {
      p_student_id: studentId
    });

    if (error) throw error;
    return data || 0;
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