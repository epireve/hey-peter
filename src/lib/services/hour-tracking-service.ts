/**
 * Hour Tracking Service
 * Comprehensive service for managing student hours, purchases, and deductions
 */

import { supabase } from '@/lib/supabase';
import { 
  HourTransaction, 
  HourPurchase, 
  HourPolicy, 
  HourExpiration,
  HourTransactionWithDetails,
  StudentHourSummary,
  HourAnalytics,
  HourPurchaseForm,
  HourAdjustmentForm,
  HourTransactionFilters,
  PaginatedHourResponse,
  HourManagementResponse
} from '@/types/hour-management';

class HourTrackingService {
  /**
   * Get student hour balance
   */
  async getStudentHourBalance(studentId: string): Promise<HourManagementResponse<number>> {
    try {
      const { data, error } = await supabase
        .rpc('calculate_student_hour_balance', { student_uuid: studentId });

      if (error) throw error;

      return {
        success: true,
        data: data || 0
      };
    } catch (error) {
      console.error('Error getting student hour balance:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get hour balance'
      };
    }
  }

  /**
   * Get student hour summary with detailed information
   */
  async getStudentHourSummary(studentId: string): Promise<HourManagementResponse<StudentHourSummary>> {
    try {
      // Get student basic info
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select(`
          id,
          student_id,
          full_name,
          total_hours_purchased,
          hours_used,
          hour_balance,
          users!inner(full_name)
        `)
        .eq('id', studentId)
        .single();

      if (studentError) throw studentError;

      // Get current balance
      const balanceResponse = await this.getStudentHourBalance(studentId);
      if (!balanceResponse.success) throw new Error(balanceResponse.error);

      // Get expiring hours
      const { data: expiringHours, error: expiringError } = await supabase
        .from('hour_expirations')
        .select('hours_expiring')
        .eq('student_id', studentId)
        .eq('status', 'active')
        .lte('expiration_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()) // Next 30 days
        .order('expiration_date', { ascending: true });

      if (expiringError) throw expiringError;

      // Get last transaction date
      const { data: lastTransaction, error: transactionError } = await supabase
        .from('hour_transactions')
        .select('created_at')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (transactionError) throw transactionError;

      // Get next expiration date
      const { data: nextExpiration, error: nextExpirationError } = await supabase
        .from('hour_expirations')
        .select('expiration_date')
        .eq('student_id', studentId)
        .eq('status', 'active')
        .order('expiration_date', { ascending: true })
        .limit(1);

      if (nextExpirationError) throw nextExpirationError;

      const summary: StudentHourSummary = {
        student_id: studentId,
        student_name: student.users?.full_name || student.full_name || 'Unknown',
        student_code: student.student_id || '',
        total_hours_purchased: student.total_hours_purchased || 0,
        total_hours_used: student.hours_used || 0,
        current_balance: balanceResponse.data || 0,
        hours_expiring_soon: expiringHours?.reduce((sum, h) => sum + h.hours_expiring, 0) || 0,
        last_transaction_date: lastTransaction?.[0]?.created_at,
        next_expiration_date: nextExpiration?.[0]?.expiration_date
      };

      return {
        success: true,
        data: summary
      };
    } catch (error) {
      console.error('Error getting student hour summary:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get hour summary'
      };
    }
  }

  /**
   * Purchase hours for a student
   */
  async purchaseHours(purchaseData: HourPurchaseForm, createdBy?: string): Promise<HourManagementResponse<HourPurchase>> {
    try {
      // First create the purchase record
      const { data: purchase, error: purchaseError } = await supabase
        .from('hour_purchases')
        .insert({
          ...purchaseData,
          created_by: createdBy
        })
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      // Add hours to student balance using the database function
      const { data: addResult, error: addError } = await supabase
        .rpc('add_student_hours', {
          student_uuid: purchaseData.student_id,
          hours_to_add: purchaseData.hours_purchased,
          transaction_type: 'purchase',
          description_text: `Hour purchase: ${purchaseData.package_name}`,
          created_by_uuid: createdBy
        });

      if (addError) throw addError;

      if (!addResult) {
        throw new Error('Failed to add hours to student balance');
      }

      // Create expiration record if expiration date is provided
      if (purchaseData.expiration_date) {
        const { error: expirationError } = await supabase
          .from('hour_expirations')
          .insert({
            student_id: purchaseData.student_id,
            purchase_id: purchase.id,
            hours_expiring: purchaseData.hours_purchased,
            expiration_date: purchaseData.expiration_date,
            status: 'active'
          });

        if (expirationError) {
          console.warn('Failed to create expiration record:', expirationError);
        }
      }

      return {
        success: true,
        data: purchase
      };
    } catch (error) {
      console.error('Error purchasing hours:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to purchase hours'
      };
    }
  }

  /**
   * Deduct hours from student balance
   */
  async deductHours(
    studentId: string, 
    hoursToDeduct: number, 
    bookingId?: string,
    classId?: string,
    teacherId?: string,
    reason?: string,
    createdBy?: string
  ): Promise<HourManagementResponse<boolean>> {
    try {
      const { data: result, error } = await supabase
        .rpc('deduct_student_hours', {
          student_uuid: studentId,
          hours_to_deduct: hoursToDeduct,
          booking_uuid: bookingId,
          class_uuid: classId,
          teacher_uuid: teacherId,
          deduction_reason: reason || 'Hour deduction',
          created_by_uuid: createdBy
        });

      if (error) throw error;

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Error deducting hours:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to deduct hours'
      };
    }
  }

  /**
   * Make hour adjustment (bonus, refund, adjustment)
   */
  async adjustHours(adjustmentData: HourAdjustmentForm, createdBy?: string): Promise<HourManagementResponse<HourTransaction>> {
    try {
      let result;

      if (adjustmentData.transaction_type === 'adjustment' && adjustmentData.amount < 0) {
        // For negative adjustments, use deduction function
        result = await this.deductHours(
          adjustmentData.student_id,
          Math.abs(adjustmentData.amount),
          undefined,
          undefined,
          undefined,
          adjustmentData.reason,
          createdBy
        );
      } else {
        // For positive adjustments, bonuses, and refunds
        const { data: addResult, error } = await supabase
          .rpc('add_student_hours', {
            student_uuid: adjustmentData.student_id,
            hours_to_add: adjustmentData.amount,
            transaction_type: adjustmentData.transaction_type,
            description_text: adjustmentData.description || adjustmentData.reason,
            created_by_uuid: createdBy
          });

        if (error) throw error;

        result = { success: addResult, data: addResult };
      }

      if (!result.success) {
        throw new Error('Failed to process hour adjustment');
      }

      // Get the created transaction
      const { data: transaction, error: transactionError } = await supabase
        .from('hour_transactions')
        .select('*')
        .eq('student_id', adjustmentData.student_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (transactionError) throw transactionError;

      return {
        success: true,
        data: transaction
      };
    } catch (error) {
      console.error('Error adjusting hours:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to adjust hours'
      };
    }
  }

  /**
   * Get hour transactions with filters and pagination
   */
  async getHourTransactions(
    filters: HourTransactionFilters = {},
    page: number = 1,
    limit: number = 50
  ): Promise<HourManagementResponse<PaginatedHourResponse<HourTransactionWithDetails>>> {
    try {
      let query = supabase
        .from('hour_transactions')
        .select(`
          *,
          student:students!inner(id, student_id, users!inner(full_name, email)),
          teacher:teachers(users!inner(full_name, email)),
          booking:bookings(id, scheduled_at, duration_minutes),
          class:classes(id, class_name, courses!inner(course_type))
        `, { count: 'exact' });

      // Apply filters
      if (filters.student_id) {
        query = query.eq('student_id', filters.student_id);
      }
      if (filters.transaction_type) {
        query = query.eq('transaction_type', filters.transaction_type);
      }
      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to);
      }
      if (filters.created_by) {
        query = query.eq('created_by', filters.created_by);
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
      console.error('Error getting hour transactions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get transactions'
      };
    }
  }

  /**
   * Get hour purchases for a student
   */
  async getStudentHourPurchases(studentId: string): Promise<HourManagementResponse<HourPurchase[]>> {
    try {
      const { data, error } = await supabase
        .from('hour_purchases')
        .select('*')
        .eq('student_id', studentId)
        .order('purchase_date', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('Error getting hour purchases:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get purchases'
      };
    }
  }

  /**
   * Get hour policies
   */
  async getHourPolicies(): Promise<HourManagementResponse<HourPolicy[]>> {
    try {
      const { data, error } = await supabase
        .from('hour_policies')
        .select('*')
        .order('course_type');

      if (error) throw error;

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('Error getting hour policies:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get policies'
      };
    }
  }

  /**
   * Update hour policy
   */
  async updateHourPolicy(policyId: string, updates: Partial<HourPolicy>): Promise<HourManagementResponse<HourPolicy>> {
    try {
      const { data, error } = await supabase
        .from('hour_policies')
        .update(updates)
        .eq('id', policyId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Error updating hour policy:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update policy'
      };
    }
  }

  /**
   * Get hour deduction rate for course type
   */
  async getHourDeductionRate(courseType: string): Promise<HourManagementResponse<number>> {
    try {
      const { data, error } = await supabase
        .rpc('get_hour_deduction_rate', { course_type_param: courseType });

      if (error) throw error;

      return {
        success: true,
        data: data || 1.0
      };
    } catch (error) {
      console.error('Error getting deduction rate:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get deduction rate'
      };
    }
  }

  /**
   * Get hour expirations for a student
   */
  async getStudentHourExpirations(studentId: string): Promise<HourManagementResponse<HourExpiration[]>> {
    try {
      const { data, error } = await supabase
        .from('hour_expirations')
        .select('*')
        .eq('student_id', studentId)
        .in('status', ['active', 'warned'])
        .order('expiration_date', { ascending: true });

      if (error) throw error;

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('Error getting hour expirations:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get expirations'
      };
    }
  }

  /**
   * Get hour analytics
   */
  async getHourAnalytics(): Promise<HourManagementResponse<HourAnalytics>> {
    try {
      // Get basic statistics
      const [
        { data: studentsWithHours },
        { data: totalHours },
        { data: expiredHours },
        { data: revenue },
        { data: monthlyUsage },
        { data: monthlyPurchases },
        { data: expiringCount },
        { data: courseTypeStats }
      ] = await Promise.all([
        supabase.from('students').select('id').gt('hour_balance', 0),
        supabase.from('hour_transactions').select('amount').in('transaction_type', ['purchase', 'bonus', 'refund']),
        supabase.from('hour_expirations').select('hours_expiring').eq('status', 'expired'),
        supabase.from('hour_purchases').select('total_amount'),
        supabase.from('hour_transactions').select('amount').eq('transaction_type', 'deduction').gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
        supabase.from('hour_transactions').select('amount').in('transaction_type', ['purchase', 'bonus']).gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
        supabase.from('hour_expirations').select('id').eq('status', 'active').lte('expiration_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('hour_transactions').select('amount, class:classes(courses(course_type))').eq('transaction_type', 'deduction')
      ]);

      const analytics: HourAnalytics = {
        total_students_with_hours: studentsWithHours?.length || 0,
        total_hours_in_circulation: totalHours?.reduce((sum, t) => sum + t.amount, 0) || 0,
        total_hours_expired: expiredHours?.reduce((sum, e) => sum + e.hours_expiring, 0) || 0,
        total_revenue: revenue?.reduce((sum, p) => sum + p.total_amount, 0) || 0,
        hours_used_this_month: monthlyUsage?.reduce((sum, t) => sum + t.amount, 0) || 0,
        hours_purchased_this_month: monthlyPurchases?.reduce((sum, t) => sum + t.amount, 0) || 0,
        average_usage_per_student: studentsWithHours?.length ? (totalHours?.reduce((sum, t) => sum + t.amount, 0) || 0) / studentsWithHours.length : 0,
        expiring_soon_count: expiringCount?.length || 0,
        by_course_type: {}
      };

      // Process course type statistics
      if (courseTypeStats) {
        const courseTypeMap: Record<string, { hours_used: number; students_count: number; average_deduction_rate: number }> = {};
        
        courseTypeStats.forEach(transaction => {
          const courseType = transaction.class?.courses?.course_type;
          if (courseType) {
            if (!courseTypeMap[courseType]) {
              courseTypeMap[courseType] = { hours_used: 0, students_count: 0, average_deduction_rate: 1.0 };
            }
            courseTypeMap[courseType].hours_used += transaction.amount;
          }
        });

        analytics.by_course_type = courseTypeMap;
      }

      return {
        success: true,
        data: analytics
      };
    } catch (error) {
      console.error('Error getting hour analytics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get analytics'
      };
    }
  }

  /**
   * Process hour expiration warnings
   */
  async processExpirationWarnings(): Promise<HourManagementResponse<number>> {
    try {
      // Get hours expiring in the next 7 days that haven't been warned
      const { data: expiringHours, error: fetchError } = await supabase
        .from('hour_expirations')
        .select('*')
        .eq('status', 'active')
        .eq('warning_sent', false)
        .lte('expiration_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());

      if (fetchError) throw fetchError;

      if (!expiringHours || expiringHours.length === 0) {
        return { success: true, data: 0 };
      }

      // Update warning status
      const { error: updateError } = await supabase
        .from('hour_expirations')
        .update({ 
          warning_sent: true, 
          warning_sent_at: new Date().toISOString(),
          status: 'warned'
        })
        .in('id', expiringHours.map(h => h.id));

      if (updateError) throw updateError;

      // Here you would integrate with email service to send warnings
      // For now, we'll just return the count

      return {
        success: true,
        data: expiringHours.length
      };
    } catch (error) {
      console.error('Error processing expiration warnings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process warnings'
      };
    }
  }
}

export const hourTrackingService = new HourTrackingService();
export default hourTrackingService;