/**
 * Hour Statistics Service Module
 * 
 * This module handles all hour statistics and analytics operations including:
 * - Usage statistics and patterns
 * - Monthly and yearly reports
 * - System-wide analytics
 * - Trending analysis and predictions
 */

import type {
  HourUsageStats,
  HourApiResponse
} from '@/types/hours';
import { 
  IHourStatisticsService, 
  ServiceDependencies, 
  ServiceContainer, 
  withErrorHandling,
  ServiceError 
} from '../interfaces/service-interfaces';

export class HourStatisticsService implements IHourStatisticsService {
  readonly serviceName = 'HourStatisticsService';
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
   * Get comprehensive usage statistics for a student
   */
  async getHourUsageStats(studentId: string, periodDays: number = 90): Promise<HourApiResponse<HourUsageStats>> {
    try {
      this.logger.info('Calculating hour usage statistics', { studentId, periodDays });

      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - periodDays);

      // Get all transactions in the period
      const { data: transactions, error } = await this.supabase
        .from('hour_transactions')
        .select('*')
        .eq('student_id', studentId)
        .gte('created_at', periodStart.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        throw this.createServiceError('FETCH_TRANSACTIONS_ERROR', 'Failed to fetch transactions', error);
      }

      // Calculate statistics
      const stats = this.calculateUsageStats(transactions || [], periodStart);

      this.logger.info('Successfully calculated usage statistics', {
        studentId,
        periodDays,
        totalHoursUsed: stats.totalHoursUsed
      });

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      return this.createErrorResponse(error as ServiceError);
    }
  }

  /**
   * Calculate usage statistics from transaction data
   */
  calculateUsageStats(transactions: any[], periodStart: Date): HourUsageStats {
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

    // Track daily usage for finding most active day
    const dayCount: Record<string, number> = {};
    const dayUsage: Record<string, number> = {};

    // Calculate totals by transaction type
    transactions.forEach(t => {
      const transactionDate = new Date(t.created_at);
      const dayName = transactionDate.toLocaleDateString('en-US', { weekday: 'long' });

      switch (t.transaction_type) {
        case 'deduction':
          const hoursUsed = Math.abs(t.hours_amount);
          stats.totalHoursUsed += hoursUsed;
          
          // Track by class type
          if (t.class_type) {
            stats.usageByClassType[t.class_type] = (stats.usageByClassType[t.class_type] || 0) + hoursUsed;
          }
          
          // Track daily activity
          dayCount[dayName] = (dayCount[dayName] || 0) + 1;
          dayUsage[dayName] = (dayUsage[dayName] || 0) + hoursUsed;
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
    stats.averageUsagePerWeek = weeks > 0 ? stats.totalHoursUsed / weeks : 0;

    // Find most active day
    const sortedDays = Object.entries(dayCount).sort((a, b) => b[1] - a[1]);
    stats.mostActiveDay = sortedDays[0]?.[0] || 'N/A';

    // Find preferred class type
    const sortedClassTypes = Object.entries(stats.usageByClassType).sort((a, b) => b[1] - a[1]);
    stats.preferredClassType = sortedClassTypes[0]?.[0] || 'N/A';

    // Calculate usage by month
    const monthlyUsage: Record<string, number> = {};
    const deductions = transactions.filter(t => t.transaction_type === 'deduction');
    
    deductions.forEach(t => {
      const month = new Date(t.created_at).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      });
      monthlyUsage[month] = (monthlyUsage[month] || 0) + Math.abs(t.hours_amount);
    });

    stats.usageByMonth = Object.entries(monthlyUsage)
      .map(([month, hoursUsed]) => ({ month, hoursUsed }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

    return stats;
  }

  /**
   * Generate detailed monthly report for a student
   */
  async generateMonthlyReport(studentId: string, year: number, month: number): Promise<HourApiResponse<{
    totalHoursUsed: number;
    totalHoursPurchased: number;
    totalHoursExpired: number;
    usageByClassType: Record<string, number>;
    dailyUsage: Array<{ date: string; hours: number }>;
    weeklyTrends: Array<{ week: string; hours: number }>;
  }>> {
    try {
      this.logger.info('Generating monthly report', { studentId, year, month });

      // Calculate date range for the month
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      // Get transactions for the month
      const { data: transactions, error } = await this.supabase
        .from('hour_transactions')
        .select('*')
        .eq('student_id', studentId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        throw this.createServiceError('FETCH_MONTHLY_TRANSACTIONS_ERROR', 'Failed to fetch monthly transactions', error);
      }

      // Calculate monthly statistics
      let totalHoursUsed = 0;
      let totalHoursPurchased = 0;
      let totalHoursExpired = 0;
      const usageByClassType: Record<string, number> = {};
      const dailyUsage: Record<string, number> = {};

      transactions?.forEach(t => {
        const transactionDate = new Date(t.created_at);
        const dateString = transactionDate.toISOString().split('T')[0];

        switch (t.transaction_type) {
          case 'deduction':
            const hoursUsed = Math.abs(t.hours_amount);
            totalHoursUsed += hoursUsed;
            dailyUsage[dateString] = (dailyUsage[dateString] || 0) + hoursUsed;
            
            if (t.class_type) {
              usageByClassType[t.class_type] = (usageByClassType[t.class_type] || 0) + hoursUsed;
            }
            break;
            
          case 'purchase':
            totalHoursPurchased += t.hours_amount;
            break;
            
          case 'expiry':
            totalHoursExpired += Math.abs(t.hours_amount);
            break;
        }
      });

      // Generate daily usage array
      const dailyUsageArray = [];
      const daysInMonth = new Date(year, month, 0).getDate();
      
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dateString = date.toISOString().split('T')[0];
        dailyUsageArray.push({
          date: dateString,
          hours: dailyUsage[dateString] || 0
        });
      }

      // Generate weekly trends
      const weeklyTrends = [];
      let currentWeek = 1;
      let weekStart = 1;
      
      while (weekStart <= daysInMonth) {
        const weekEnd = Math.min(weekStart + 6, daysInMonth);
        let weekHours = 0;
        
        for (let day = weekStart; day <= weekEnd; day++) {
          const date = new Date(year, month - 1, day);
          const dateString = date.toISOString().split('T')[0];
          weekHours += dailyUsage[dateString] || 0;
        }
        
        weeklyTrends.push({
          week: `Week ${currentWeek}`,
          hours: weekHours
        });
        
        weekStart = weekEnd + 1;
        currentWeek++;
      }

      this.logger.info('Successfully generated monthly report', {
        studentId,
        year,
        month,
        totalHoursUsed,
        totalHoursPurchased
      });

      return {
        success: true,
        data: {
          totalHoursUsed,
          totalHoursPurchased,
          totalHoursExpired,
          usageByClassType,
          dailyUsage: dailyUsageArray,
          weeklyTrends
        }
      };
    } catch (error) {
      return this.createErrorResponse(error as ServiceError);
    }
  }

  /**
   * Get system-wide statistics
   */
  async getSystemWideStats(): Promise<HourApiResponse<{
    totalActiveStudents: number;
    totalHoursInSystem: number;
    totalHoursUsedThisMonth: number;
    averageHoursPerStudent: number;
    topClassTypes: Array<{ type: string; hours: number }>;
    monthlyGrowth: number;
  }>> {
    try {
      this.logger.info('Calculating system-wide statistics');

      // Get current month boundaries
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

      // Get total active students (students with active purchases)
      const { data: activeStudents, error: studentsError } = await this.supabase
        .from('hour_purchases')
        .select('student_id')
        .eq('is_active', true)
        .eq('is_expired', false)
        .gt('hours_remaining', 0);

      if (studentsError) {
        throw this.createServiceError('FETCH_STUDENTS_ERROR', 'Failed to fetch active students', studentsError);
      }

      const totalActiveStudents = new Set(activeStudents?.map(s => s.student_id) || []).size;

      // Get total hours in system
      const { data: totalHoursResult, error: totalHoursError } = await this.supabase
        .from('hour_purchases')
        .select('hours_remaining')
        .eq('is_active', true)
        .eq('is_expired', false);

      if (totalHoursError) {
        throw this.createServiceError('FETCH_TOTAL_HOURS_ERROR', 'Failed to fetch total hours', totalHoursError);
      }

      const totalHoursInSystem = totalHoursResult?.reduce((sum, p) => sum + p.hours_remaining, 0) || 0;

      // Get hours used this month
      const { data: thisMonthTransactions, error: thisMonthError } = await this.supabase
        .from('hour_transactions')
        .select('hours_amount')
        .eq('transaction_type', 'deduction')
        .gte('created_at', startOfMonth.toISOString());

      if (thisMonthError) {
        throw this.createServiceError('FETCH_THIS_MONTH_ERROR', 'Failed to fetch this month transactions', thisMonthError);
      }

      const totalHoursUsedThisMonth = thisMonthTransactions?.reduce((sum, t) => sum + Math.abs(t.hours_amount), 0) || 0;

      // Get hours used last month (for growth calculation)
      const { data: lastMonthTransactions, error: lastMonthError } = await this.supabase
        .from('hour_transactions')
        .select('hours_amount')
        .eq('transaction_type', 'deduction')
        .gte('created_at', startOfLastMonth.toISOString())
        .lte('created_at', endOfLastMonth.toISOString());

      if (lastMonthError) {
        throw this.createServiceError('FETCH_LAST_MONTH_ERROR', 'Failed to fetch last month transactions', lastMonthError);
      }

      const totalHoursUsedLastMonth = lastMonthTransactions?.reduce((sum, t) => sum + Math.abs(t.hours_amount), 0) || 0;

      // Calculate growth percentage
      const monthlyGrowth = totalHoursUsedLastMonth > 0 
        ? ((totalHoursUsedThisMonth - totalHoursUsedLastMonth) / totalHoursUsedLastMonth) * 100
        : 0;

      // Get top class types
      const { data: classTypeTransactions, error: classTypeError } = await this.supabase
        .from('hour_transactions')
        .select('class_type, hours_amount')
        .eq('transaction_type', 'deduction')
        .not('class_type', 'is', null)
        .gte('created_at', startOfMonth.toISOString());

      if (classTypeError) {
        throw this.createServiceError('FETCH_CLASS_TYPES_ERROR', 'Failed to fetch class type data', classTypeError);
      }

      const classTypeUsage: Record<string, number> = {};
      classTypeTransactions?.forEach(t => {
        if (t.class_type) {
          classTypeUsage[t.class_type] = (classTypeUsage[t.class_type] || 0) + Math.abs(t.hours_amount);
        }
      });

      const topClassTypes = Object.entries(classTypeUsage)
        .map(([type, hours]) => ({ type, hours }))
        .sort((a, b) => b.hours - a.hours)
        .slice(0, 5);

      // Calculate average hours per student
      const averageHoursPerStudent = totalActiveStudents > 0 ? totalHoursInSystem / totalActiveStudents : 0;

      this.logger.info('Successfully calculated system-wide statistics', {
        totalActiveStudents,
        totalHoursInSystem,
        totalHoursUsedThisMonth,
        monthlyGrowth
      });

      return {
        success: true,
        data: {
          totalActiveStudents,
          totalHoursInSystem,
          totalHoursUsedThisMonth,
          averageHoursPerStudent,
          topClassTypes,
          monthlyGrowth
        }
      };
    } catch (error) {
      return this.createErrorResponse(error as ServiceError);
    }
  }

  /**
   * Get comparative usage statistics between students
   */
  async getComparativeUsageStats(studentIds: string[], periodDays: number = 30): Promise<HourApiResponse<{
    students: Array<{
      studentId: string;
      totalHoursUsed: number;
      averageHoursPerWeek: number;
      mostActiveDay: string;
      preferredClassType: string;
      usageRank: number;
    }>;
    averageUsage: number;
    topPerformers: string[];
    usageTrends: Array<{ date: string; usage: Record<string, number> }>;
  }>> {
    try {
      this.logger.info('Calculating comparative usage statistics', { studentIds, periodDays });

      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - periodDays);

      const studentStats = [];

      // Get stats for each student
      for (const studentId of studentIds) {
        const { data: studentUsage } = await this.getHourUsageStats(studentId, periodDays);
        
        if (studentUsage) {
          studentStats.push({
            studentId,
            totalHoursUsed: studentUsage.totalHoursUsed,
            averageHoursPerWeek: studentUsage.averageUsagePerWeek,
            mostActiveDay: studentUsage.mostActiveDay,
            preferredClassType: studentUsage.preferredClassType,
            usageRank: 0 // Will be calculated below
          });
        }
      }

      // Sort by usage and assign ranks
      studentStats.sort((a, b) => b.totalHoursUsed - a.totalHoursUsed);
      studentStats.forEach((student, index) => {
        student.usageRank = index + 1;
      });

      // Calculate average usage
      const averageUsage = studentStats.length > 0 
        ? studentStats.reduce((sum, s) => sum + s.totalHoursUsed, 0) / studentStats.length
        : 0;

      // Get top performers (top 20% or at least top 3)
      const topPerformerCount = Math.max(3, Math.ceil(studentStats.length * 0.2));
      const topPerformers = studentStats.slice(0, topPerformerCount).map(s => s.studentId);

      // Get usage trends (daily aggregated data)
      const { data: trendTransactions, error: trendError } = await this.supabase
        .from('hour_transactions')
        .select('student_id, hours_amount, created_at')
        .in('student_id', studentIds)
        .eq('transaction_type', 'deduction')
        .gte('created_at', periodStart.toISOString())
        .order('created_at', { ascending: true });

      if (trendError) {
        throw this.createServiceError('FETCH_TREND_DATA_ERROR', 'Failed to fetch trend data', trendError);
      }

      // Aggregate daily usage trends
      const dailyTrends: Record<string, Record<string, number>> = {};
      trendTransactions?.forEach(t => {
        const date = new Date(t.created_at).toISOString().split('T')[0];
        const studentId = t.student_id;
        const hoursUsed = Math.abs(t.hours_amount);
        
        if (!dailyTrends[date]) {
          dailyTrends[date] = {};
        }
        
        dailyTrends[date][studentId] = (dailyTrends[date][studentId] || 0) + hoursUsed;
      });

      const usageTrends = Object.entries(dailyTrends)
        .map(([date, usage]) => ({ date, usage }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      this.logger.info('Successfully calculated comparative usage statistics', {
        studentCount: studentIds.length,
        averageUsage,
        topPerformers: topPerformers.length
      });

      return {
        success: true,
        data: {
          students: studentStats,
          averageUsage,
          topPerformers,
          usageTrends
        }
      };
    } catch (error) {
      return this.createErrorResponse(error as ServiceError);
    }
  }

  /**
   * Get predictive usage insights
   */
  async getPredictiveInsights(studentId: string): Promise<HourApiResponse<{
    predictedMonthlyUsage: number;
    hoursNeededForNextMonth: number;
    recommendedPackage: string | null;
    usageTrend: 'increasing' | 'decreasing' | 'stable';
    riskLevel: 'low' | 'medium' | 'high';
    recommendations: string[];
  }>> {
    try {
      this.logger.info('Calculating predictive insights', { studentId });

      // Get last 3 months of data
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const { data: transactions, error } = await this.supabase
        .from('hour_transactions')
        .select('hours_amount, created_at')
        .eq('student_id', studentId)
        .eq('transaction_type', 'deduction')
        .gte('created_at', threeMonthsAgo.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        throw this.createServiceError('FETCH_PREDICTIVE_DATA_ERROR', 'Failed to fetch predictive data', error);
      }

      if (!transactions || transactions.length === 0) {
        return {
          success: true,
          data: {
            predictedMonthlyUsage: 0,
            hoursNeededForNextMonth: 0,
            recommendedPackage: null,
            usageTrend: 'stable',
            riskLevel: 'low',
            recommendations: ['No usage data available for predictions']
          }
        };
      }

      // Calculate monthly usage for trend analysis
      const monthlyUsage: Record<string, number> = {};
      transactions.forEach(t => {
        const month = new Date(t.created_at).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short' 
        });
        monthlyUsage[month] = (monthlyUsage[month] || 0) + Math.abs(t.hours_amount);
      });

      const months = Object.keys(monthlyUsage).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
      const usageValues = months.map(month => monthlyUsage[month]);

      // Calculate predicted usage (simple linear trend)
      const averageUsage = usageValues.reduce((sum, val) => sum + val, 0) / usageValues.length;
      
      // Simple trend calculation
      let usageTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (usageValues.length >= 2) {
        const lastMonth = usageValues[usageValues.length - 1];
        const secondLastMonth = usageValues[usageValues.length - 2];
        const trendThreshold = averageUsage * 0.1; // 10% threshold
        
        if (lastMonth > secondLastMonth + trendThreshold) {
          usageTrend = 'increasing';
        } else if (lastMonth < secondLastMonth - trendThreshold) {
          usageTrend = 'decreasing';
        }
      }

      // Predict next month usage
      let predictedMonthlyUsage = averageUsage;
      if (usageTrend === 'increasing') {
        predictedMonthlyUsage = averageUsage * 1.15; // 15% increase
      } else if (usageTrend === 'decreasing') {
        predictedMonthlyUsage = averageUsage * 0.85; // 15% decrease
      }

      // Get current balance
      const { data: currentBalance, error: balanceError } = await this.supabase.rpc('calculate_student_hours', {
        p_student_id: studentId
      });

      if (balanceError) {
        throw this.createServiceError('FETCH_BALANCE_ERROR', 'Failed to fetch current balance', balanceError);
      }

      const currentHours = currentBalance || 0;
      const hoursNeededForNextMonth = Math.max(0, predictedMonthlyUsage - currentHours);

      // Calculate risk level
      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      if (currentHours < predictedMonthlyUsage * 0.25) {
        riskLevel = 'high';
      } else if (currentHours < predictedMonthlyUsage * 0.5) {
        riskLevel = 'medium';
      }

      // Generate recommendations
      const recommendations: string[] = [];
      if (riskLevel === 'high') {
        recommendations.push('Urgent: Purchase additional hours to avoid service interruption');
      } else if (riskLevel === 'medium') {
        recommendations.push('Consider purchasing additional hours within the next week');
      }

      if (usageTrend === 'increasing') {
        recommendations.push('Usage is increasing - consider purchasing a larger package');
      } else if (usageTrend === 'decreasing') {
        recommendations.push('Usage is decreasing - smaller packages may be more cost-effective');
      }

      // Get recommended package (simplified logic)
      let recommendedPackage: string | null = null;
      if (hoursNeededForNextMonth > 0) {
        const { data: packages, error: packagesError } = await this.supabase
          .from('hour_packages')
          .select('*')
          .eq('is_active', true)
          .gte('hours_included', hoursNeededForNextMonth)
          .order('hours_included', { ascending: true })
          .limit(1);

        if (!packagesError && packages && packages.length > 0) {
          recommendedPackage = packages[0].name;
        }
      }

      this.logger.info('Successfully calculated predictive insights', {
        studentId,
        predictedMonthlyUsage,
        currentHours,
        riskLevel,
        usageTrend
      });

      return {
        success: true,
        data: {
          predictedMonthlyUsage,
          hoursNeededForNextMonth,
          recommendedPackage,
          usageTrend,
          riskLevel,
          recommendations
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
}

// Create and export singleton instance
export const hourStatisticsService = withErrorHandling(new HourStatisticsService());