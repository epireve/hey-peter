import { logger } from '@/lib/services';
/**
 * Teacher Hour Tracking Service
 * Service for managing teacher hours, compensation, and performance tracking
 */

import { supabase } from '@/lib/supabase';
import { 
  TeacherHours, 
  TeacherHoursWithDetails,
  TeacherCompensationRule,
  TeacherHourSummary,
  TeacherCompensationForm,
  TeacherHoursFilters,
  PaginatedHourResponse,
  HourManagementResponse
} from '@/types/hour-management';

class TeacherHourTrackingService {
  /**
   * Get teacher hour summary
   */
  async getTeacherHourSummary(teacherId: string): Promise<HourManagementResponse<TeacherHourSummary>> {
    try {
      // Get teacher basic info
      const { data: teacher, error: teacherError } = await supabase
        .from('teachers')
        .select(`
          id,
          users!inner(full_name),
          hourly_rate
        `)
        .eq('id', teacherId)
        .single();

      if (teacherError) throw teacherError;

      // Get aggregated hour statistics
      const { data: hourStats, error: statsError } = await supabase
        .from('teacher_hours')
        .select('hours_taught, total_compensation, status')
        .eq('teacher_id', teacherId);

      if (statsError) throw statsError;

      // Get this month's statistics
      const currentMonth = new Date();
      currentMonth.setDate(1);
      const nextMonth = new Date(currentMonth);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const { data: monthlyStats, error: monthlyError } = await supabase
        .from('teacher_hours')
        .select('hours_taught, total_compensation')
        .eq('teacher_id', teacherId)
        .gte('teaching_date', currentMonth.toISOString().split('T')[0])
        .lt('teaching_date', nextMonth.toISOString().split('T')[0]);

      if (monthlyError) throw monthlyError;

      const totalHours = hourStats?.reduce((sum, h) => sum + h.hours_taught, 0) || 0;
      const totalCompensation = hourStats?.reduce((sum, h) => sum + h.total_compensation, 0) || 0;
      const pendingCompensation = hourStats?.filter(h => h.status === 'pending').reduce((sum, h) => sum + h.total_compensation, 0) || 0;
      const monthlyHours = monthlyStats?.reduce((sum, h) => sum + h.hours_taught, 0) || 0;
      const monthlyCompensation = monthlyStats?.reduce((sum, h) => sum + h.total_compensation, 0) || 0;

      const summary: TeacherHourSummary = {
        teacher_id: teacherId,
        teacher_name: teacher.users?.full_name || 'Unknown',
        total_hours_taught: totalHours,
        total_compensation_earned: totalCompensation,
        pending_compensation: pendingCompensation,
        average_hourly_rate: totalHours > 0 ? totalCompensation / totalHours : teacher.hourly_rate || 0,
        this_month_hours: monthlyHours,
        this_month_compensation: monthlyCompensation
      };

      return {
        success: true,
        data: summary
      };
    } catch (error) {
      logger.error('Error getting teacher hour summary:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get teacher summary'
      };
    }
  }

  /**
   * Get teacher hours with filters and pagination
   */
  async getTeacherHours(
    filters: TeacherHoursFilters = {},
    page: number = 1,
    limit: number = 50
  ): Promise<HourManagementResponse<PaginatedHourResponse<TeacherHoursWithDetails>>> {
    try {
      let query = supabase
        .from('teacher_hours')
        .select(`
          *,
          teacher:teachers!inner(users!inner(full_name, email)),
          booking:bookings(id, scheduled_at, student_id, students!inner(id, student_id, users!inner(full_name))),
          class:classes(id, class_name, courses!inner(course_type))
        `, { count: 'exact' });

      // Apply filters
      if (filters.teacher_id) {
        query = query.eq('teacher_id', filters.teacher_id);
      }
      if (filters.date_from) {
        query = query.gte('teaching_date', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('teaching_date', filters.date_to);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.compensation_type) {
        query = query.eq('compensation_type', filters.compensation_type);
      }

      // Apply pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);
      query = query.order('teaching_date', { ascending: false });

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
      logger.error('Error getting teacher hours:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get teacher hours'
      };
    }
  }

  /**
   * Create manual teacher hour entry
   */
  async createTeacherHourEntry(hourData: {
    teacher_id: string;
    teaching_date: string;
    start_time: string;
    end_time: string;
    duration_minutes: number;
    hours_taught: number;
    course_type?: string;
    compensation_type?: 'standard' | 'overtime' | 'holiday' | 'substitute' | 'bonus';
    notes?: string;
  }): Promise<HourManagementResponse<TeacherHours>> {
    try {
      // Get teacher's hourly rate
      const { data: teacher, error: teacherError } = await supabase
        .from('teachers')
        .select('hourly_rate')
        .eq('id', hourData.teacher_id)
        .single();

      if (teacherError) throw teacherError;

      // Calculate compensation
      const { data: compensation, error: compensationError } = await supabase
        .rpc('calculate_teacher_compensation', {
          teacher_uuid: hourData.teacher_id,
          course_type_param: hourData.course_type || 'Basic',
          hours_taught: hourData.hours_taught,
          teaching_date: hourData.teaching_date,
          compensation_type_param: hourData.compensation_type || 'standard'
        });

      if (compensationError) throw compensationError;

      // Create hour entry
      const { data: hourEntry, error } = await supabase
        .from('teacher_hours')
        .insert({
          teacher_id: hourData.teacher_id,
          teaching_date: hourData.teaching_date,
          start_time: hourData.start_time,
          end_time: hourData.end_time,
          duration_minutes: hourData.duration_minutes,
          hours_taught: hourData.hours_taught,
          hourly_rate: teacher.hourly_rate || 0,
          base_compensation: compensation || 0,
          bonus_amount: 0,
          total_compensation: compensation || 0,
          compensation_type: hourData.compensation_type || 'standard',
          status: 'pending',
          notes: hourData.notes
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: hourEntry
      };
    } catch (error) {
      logger.error('Error creating teacher hour entry:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create hour entry'
      };
    }
  }

  /**
   * Update teacher hour entry status
   */
  async updateTeacherHourStatus(
    hourId: string,
    status: 'pending' | 'approved' | 'paid' | 'disputed',
    notes?: string
  ): Promise<HourManagementResponse<TeacherHours>> {
    try {
      const updateData: any = { status };
      if (notes) {
        updateData.notes = notes;
      }

      const { data, error } = await supabase
        .from('teacher_hours')
        .update(updateData)
        .eq('id', hourId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data
      };
    } catch (error) {
      logger.error('Error updating teacher hour status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update status'
      };
    }
  }

  /**
   * Add bonus to teacher hour entry
   */
  async addBonusToTeacherHour(
    hourId: string,
    bonusAmount: number,
    reason?: string
  ): Promise<HourManagementResponse<TeacherHours>> {
    try {
      // Get current hour entry
      const { data: currentEntry, error: fetchError } = await supabase
        .from('teacher_hours')
        .select('bonus_amount, base_compensation')
        .eq('id', hourId)
        .single();

      if (fetchError) throw fetchError;

      const newBonusAmount = (currentEntry.bonus_amount || 0) + bonusAmount;
      const newTotalCompensation = currentEntry.base_compensation + newBonusAmount;

      const { data, error } = await supabase
        .from('teacher_hours')
        .update({
          bonus_amount: newBonusAmount,
          total_compensation: newTotalCompensation,
          notes: reason ? `${currentEntry.notes || ''}\nBonus added: ${reason}` : currentEntry.notes
        })
        .eq('id', hourId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data
      };
    } catch (error) {
      logger.error('Error adding bonus to teacher hour:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add bonus'
      };
    }
  }

  /**
   * Get teacher compensation rules
   */
  async getTeacherCompensationRules(teacherId: string): Promise<HourManagementResponse<TeacherCompensationRule[]>> {
    try {
      const { data, error } = await supabase
        .from('teacher_compensation_rules')
        .select('*')
        .eq('teacher_id', teacherId)
        .eq('is_active', true)
        .order('effective_date', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      logger.error('Error getting compensation rules:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get compensation rules'
      };
    }
  }

  /**
   * Create or update teacher compensation rule
   */
  async setTeacherCompensationRule(ruleData: TeacherCompensationForm): Promise<HourManagementResponse<TeacherCompensationRule>> {
    try {
      // Deactivate existing rules for this teacher and course type
      const { error: deactivateError } = await supabase
        .from('teacher_compensation_rules')
        .update({ is_active: false, end_date: ruleData.effective_date })
        .eq('teacher_id', ruleData.teacher_id)
        .eq('course_type', ruleData.course_type)
        .eq('is_active', true);

      if (deactivateError) throw deactivateError;

      // Create new rule
      const { data: newRule, error } = await supabase
        .from('teacher_compensation_rules')
        .insert({
          teacher_id: ruleData.teacher_id,
          course_type: ruleData.course_type as any,
          base_rate: ruleData.base_rate,
          overtime_rate: ruleData.overtime_rate,
          holiday_rate: ruleData.holiday_rate,
          substitute_rate: ruleData.substitute_rate,
          bonus_thresholds: ruleData.bonus_thresholds || {},
          effective_date: ruleData.effective_date,
          end_date: ruleData.end_date,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: newRule
      };
    } catch (error) {
      logger.error('Error setting compensation rule:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set compensation rule'
      };
    }
  }

  /**
   * Calculate teacher compensation for specific period
   */
  async calculateTeacherCompensation(
    teacherId: string,
    courseType: string,
    hoursTaught: number,
    teachingDate?: string,
    compensationType?: string
  ): Promise<HourManagementResponse<number>> {
    try {
      const { data, error } = await supabase
        .rpc('calculate_teacher_compensation', {
          teacher_uuid: teacherId,
          course_type_param: courseType,
          hours_taught: hoursTaught,
          teaching_date: teachingDate || new Date().toISOString().split('T')[0],
          compensation_type_param: compensationType || 'standard'
        });

      if (error) throw error;

      return {
        success: true,
        data: data || 0
      };
    } catch (error) {
      logger.error('Error calculating compensation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate compensation'
      };
    }
  }

  /**
   * Get teacher performance analytics
   */
  async getTeacherPerformanceAnalytics(
    teacherId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<HourManagementResponse<any>> {
    try {
      let query = supabase
        .from('teacher_hours')
        .select(`
          teaching_date,
          hours_taught,
          total_compensation,
          compensation_type,
          status,
          class:classes(courses(course_type))
        `)
        .eq('teacher_id', teacherId);

      if (dateFrom) {
        query = query.gte('teaching_date', dateFrom);
      }
      if (dateTo) {
        query = query.lte('teaching_date', dateTo);
      }

      const { data: hourData, error } = await query.order('teaching_date');

      if (error) throw error;

      // Process analytics
      const analytics = {
        total_hours: hourData?.reduce((sum, h) => sum + h.hours_taught, 0) || 0,
        total_compensation: hourData?.reduce((sum, h) => sum + h.total_compensation, 0) || 0,
        average_hours_per_day: 0,
        compensation_by_course_type: {} as Record<string, number>,
        hours_by_month: {} as Record<string, number>,
        compensation_by_month: {} as Record<string, number>,
        performance_trends: [] as any[]
      };

      if (hourData && hourData.length > 0) {
        // Calculate averages and breakdowns
        const uniqueDays = new Set(hourData.map(h => h.teaching_date)).size;
        analytics.average_hours_per_day = analytics.total_hours / uniqueDays;

        // Group by course type
        hourData.forEach(hour => {
          const courseType = hour.class?.courses?.course_type || 'Unknown';
          if (!analytics.compensation_by_course_type[courseType]) {
            analytics.compensation_by_course_type[courseType] = 0;
          }
          analytics.compensation_by_course_type[courseType] += hour.total_compensation;
        });

        // Group by month
        hourData.forEach(hour => {
          const month = hour.teaching_date.substring(0, 7); // YYYY-MM
          if (!analytics.hours_by_month[month]) {
            analytics.hours_by_month[month] = 0;
            analytics.compensation_by_month[month] = 0;
          }
          analytics.hours_by_month[month] += hour.hours_taught;
          analytics.compensation_by_month[month] += hour.total_compensation;
        });
      }

      return {
        success: true,
        data: analytics
      };
    } catch (error) {
      logger.error('Error getting performance analytics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get analytics'
      };
    }
  }

  /**
   * Get pending compensation for teacher
   */
  async getPendingCompensation(teacherId: string): Promise<HourManagementResponse<TeacherHoursWithDetails[]>> {
    try {
      const { data, error } = await supabase
        .from('teacher_hours')
        .select(`
          *,
          teacher:teachers!inner(users!inner(full_name, email)),
          booking:bookings(id, scheduled_at, student_id, students!inner(id, student_id, users!inner(full_name))),
          class:classes(id, class_name, courses!inner(course_type))
        `)
        .eq('teacher_id', teacherId)
        .eq('status', 'pending')
        .order('teaching_date', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      logger.error('Error getting pending compensation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get pending compensation'
      };
    }
  }

  /**
   * Bulk approve teacher hours
   */
  async bulkApproveTeacherHours(hourIds: string[]): Promise<HourManagementResponse<number>> {
    try {
      const { error, count } = await supabase
        .from('teacher_hours')
        .update({ status: 'approved' })
        .in('id', hourIds);

      if (error) throw error;

      return {
        success: true,
        data: count || 0
      };
    } catch (error) {
      logger.error('Error bulk approving teacher hours:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to approve hours'
      };
    }
  }

  /**
   * Export teacher hours for payroll
   */
  async exportTeacherHoursForPayroll(
    teacherId?: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<HourManagementResponse<any[]>> {
    try {
      let query = supabase
        .from('teacher_hours')
        .select(`
          teaching_date,
          hours_taught,
          total_compensation,
          compensation_type,
          status,
          teacher:teachers!inner(users!inner(full_name, email)),
          class:classes(courses(course_type))
        `)
        .eq('status', 'approved');

      if (teacherId) {
        query = query.eq('teacher_id', teacherId);
      }
      if (dateFrom) {
        query = query.gte('teaching_date', dateFrom);
      }
      if (dateTo) {
        query = query.lte('teaching_date', dateTo);
      }

      const { data, error } = await query.order('teaching_date');

      if (error) throw error;

      // Format for payroll export
      const payrollData = data?.map(hour => ({
        teacher_name: hour.teacher?.users?.full_name,
        teacher_email: hour.teacher?.users?.email,
        teaching_date: hour.teaching_date,
        hours_taught: hour.hours_taught,
        compensation_amount: hour.total_compensation,
        compensation_type: hour.compensation_type,
        course_type: hour.class?.courses?.course_type
      })) || [];

      return {
        success: true,
        data: payrollData
      };
    } catch (error) {
      logger.error('Error exporting teacher hours for payroll:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export payroll data'
      };
    }
  }
}

export const teacherHourTrackingService = new TeacherHourTrackingService();
export default teacherHourTrackingService;