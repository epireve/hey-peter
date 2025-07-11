/**
 * Hour Usage Analytics Service
 * 
 * This service provides advanced analytics capabilities for hour usage and balance tracking.
 * It builds on the existing hour management system to provide detailed insights,
 * consumption patterns, trend analysis, and predictive alerts.
 */

import { createClient } from '@/lib/supabase';
import { hourManagementService } from './hour-management-service';
import type {
  HourTransaction,
  HourApiResponse,
  HourUsageStats,
  StudentHourBalance,
  HourAlert,
  HourAlertType
} from '@/types/hours';

// Extended types for analytics
export interface HourUsageAnalytics {
  studentId: string;
  analysisDate: string;
  
  // Balance analytics
  currentBalance: number;
  balanceHistory: Array<{
    date: string;
    balance: number;
    change: number;
    changeReason: string;
  }>;
  
  // Usage patterns
  dailyUsagePattern: Array<{
    dayOfWeek: string;
    averageHours: number;
    peakHours: number;
    sessionCount: number;
  }>;
  
  hourlyUsagePattern: Array<{
    hour: number;
    averageHours: number;
    sessionCount: number;
  }>;
  
  // Consumption analysis
  consumptionRate: {
    daily: number;
    weekly: number;
    monthly: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  
  // Class type preferences
  classTypeUsage: Array<{
    classType: string;
    totalHours: number;
    percentage: number;
    averageSessionLength: number;
    frequency: number;
  }>;
  
  // Efficiency metrics
  efficiencyMetrics: {
    hoursPerClass: number;
    utilizationRate: number;
    wastageRate: number;
    renewalPattern: string;
  };
  
  // Predictions
  predictions: {
    runOutDate: string | null;
    recommendedTopUpDate: string | null;
    recommendedPackageSize: number;
    confidenceScore: number;
  };
}

export interface BalanceTrend {
  studentId: string;
  periodStart: string;
  periodEnd: string;
  
  // Trend analysis
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  trendStrength: number; // 0-1 scale
  
  // Balance points
  startingBalance: number;
  endingBalance: number;
  peakBalance: number;
  lowBalance: number;
  
  // Usage statistics
  totalHoursUsed: number;
  totalHoursPurchased: number;
  netChange: number;
  
  // Patterns
  averageDailyUsage: number;
  usageVariability: number;
  purchaseFrequency: number;
  
  // Alerts
  lowBalanceEvents: number;
  nearExpiryEvents: number;
  
  // Recommendations
  recommendations: Array<{
    type: 'purchase' | 'usage_optimization' | 'schedule_adjustment';
    message: string;
    priority: 'low' | 'medium' | 'high';
    actionRequired: boolean;
  }>;
}

export interface ConsumptionPattern {
  patternId: string;
  studentId: string;
  classType: string;
  
  // Pattern characteristics
  frequency: 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'irregular';
  consistency: number; // 0-1 scale
  predictability: number; // 0-1 scale
  
  // Time patterns
  preferredDays: string[];
  preferredHours: number[];
  averageSessionLength: number;
  
  // Usage metrics
  totalSessions: number;
  totalHours: number;
  averageHoursPerSession: number;
  
  // Efficiency
  completionRate: number;
  cancellationRate: number;
  reschedulingRate: number;
  
  // Trends
  usageTrend: 'increasing' | 'decreasing' | 'stable';
  seasonalPattern: boolean;
  
  // Comparison
  benchmarkComparison: {
    vsAverage: number; // percentage above/below average
    percentile: number;
    efficiency: 'high' | 'medium' | 'low';
  };
}

export interface LowBalanceAlert {
  id: string;
  studentId: string;
  alertType: HourAlertType;
  
  // Alert details
  currentBalance: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  // Predictions
  estimatedRunOutDate: string | null;
  daysRemaining: number;
  
  // Context
  recentUsageRate: number;
  upcomingClasses: number;
  
  // Recommendations
  recommendedAction: string;
  recommendedPackageSize: number;
  urgencyLevel: number; // 1-10 scale
  
  // Automation
  autoNotificationSent: boolean;
  lastNotificationDate: string | null;
  nextNotificationDate: string | null;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  acknowledgedAt: string | null;
}

export interface HourUsageReport {
  reportId: string;
  generatedAt: string;
  reportType: 'student' | 'class' | 'overall' | 'predictive';
  
  // Period
  periodStart: string;
  periodEnd: string;
  
  // Summary statistics
  summary: {
    totalStudents: number;
    totalHoursUsed: number;
    totalHoursPurchased: number;
    averageUsagePerStudent: number;
    utilizationRate: number;
  };
  
  // Class type breakdown
  classTypeBreakdown: Array<{
    classType: string;
    totalHours: number;
    studentCount: number;
    averageHoursPerStudent: number;
    popularityRank: number;
  }>;
  
  // Usage patterns
  peakUsageTimes: Array<{
    timeSlot: string;
    hoursUsed: number;
    sessionCount: number;
  }>;
  
  // Student segments
  studentSegments: Array<{
    segment: string;
    count: number;
    totalHours: number;
    averageHours: number;
    characteristics: string[];
  }>;
  
  // Insights
  insights: Array<{
    category: string;
    insight: string;
    impact: 'high' | 'medium' | 'low';
    actionable: boolean;
  }>;
  
  // Recommendations
  recommendations: Array<{
    target: 'operations' | 'marketing' | 'curriculum' | 'pricing';
    recommendation: string;
    expectedImpact: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

export class HourUsageAnalyticsService {
  private supabase = createClient();
  private hourManagement = hourManagementService;

  /**
   * Get comprehensive usage analytics for a student
   */
  async getStudentUsageAnalytics(
    studentId: string,
    periodDays: number = 90
  ): Promise<HourApiResponse<HourUsageAnalytics>> {
    try {
      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - periodDays);

      // Get current balance
      const balanceResult = await this.hourManagement.getStudentHourBalance(studentId);
      if (!balanceResult.success) throw new Error('Failed to get balance');

      // Get all transactions for the period
      const { data: transactions, error } = await this.supabase
        .from('hour_transactions')
        .select(`
          *,
          hour_purchases!inner(package_id, hour_packages(name, package_type))
        `)
        .eq('student_id', studentId)
        .gte('created_at', periodStart.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get class data for pattern analysis
      const { data: classData } = await this.supabase
        .from('class_bookings')
        .select(`
          *,
          classes(class_type, subject, duration)
        `)
        .eq('student_id', studentId)
        .gte('class_date', periodStart.toISOString())
        .order('class_date', { ascending: true });

      // Analyze the data
      const analytics = await this.analyzeStudentUsage(
        studentId,
        transactions || [],
        classData || [],
        balanceResult.data!,
        periodStart
      );

      return {
        success: true,
        data: analytics
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ANALYTICS_ERROR',
          message: 'Failed to generate usage analytics',
          details: error
        }
      };
    }
  }

  /**
   * Get balance trend analysis
   */
  async getBalanceTrend(
    studentId: string,
    periodDays: number = 90
  ): Promise<HourApiResponse<BalanceTrend>> {
    try {
      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - periodDays);

      // Get balance history
      const balanceHistory = await this.calculateBalanceHistory(studentId, periodStart);
      
      // Get transactions for analysis
      const { data: transactions } = await this.supabase
        .from('hour_transactions')
        .select('*')
        .eq('student_id', studentId)
        .gte('created_at', periodStart.toISOString())
        .order('created_at', { ascending: true });

      // Get alerts for the period
      const { data: alerts } = await this.supabase
        .from('hour_alerts')
        .select('*')
        .eq('student_id', studentId)
        .gte('created_at', periodStart.toISOString());

      const trend = this.analyzeTrend(
        studentId,
        balanceHistory,
        transactions || [],
        alerts || [],
        periodStart
      );

      return {
        success: true,
        data: trend
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'TREND_ERROR',
          message: 'Failed to analyze balance trend',
          details: error
        }
      };
    }
  }

  /**
   * Get consumption patterns for a student
   */
  async getConsumptionPatterns(
    studentId: string,
    classType?: string
  ): Promise<HourApiResponse<ConsumptionPattern[]>> {
    try {
      // Get transactions and class data
      const { data: transactions } = await this.supabase
        .from('hour_transactions')
        .select(`
          *,
          classes(class_type, subject, duration)
        `)
        .eq('student_id', studentId)
        .eq('transaction_type', 'deduction')
        .order('created_at', { ascending: true });

      if (!transactions) throw new Error('No transaction data found');

      // Group by class type
      const patternsByType = this.groupTransactionsByClassType(transactions);
      
      const patterns: ConsumptionPattern[] = [];
      
      for (const [type, typeTransactions] of Object.entries(patternsByType)) {
        if (classType && type !== classType) continue;
        
        const pattern = await this.analyzeConsumptionPattern(
          studentId,
          type,
          typeTransactions
        );
        patterns.push(pattern);
      }

      return {
        success: true,
        data: patterns
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PATTERN_ERROR',
          message: 'Failed to analyze consumption patterns',
          details: error
        }
      };
    }
  }

  /**
   * Generate low balance alerts with predictions
   */
  async generateLowBalanceAlerts(
    studentId?: string,
    thresholdHours: number = 5
  ): Promise<HourApiResponse<LowBalanceAlert[]>> {
    try {
      let studentsQuery = this.supabase
        .from('students')
        .select('id, first_name, last_name, email');

      if (studentId) {
        studentsQuery = studentsQuery.eq('id', studentId);
      }

      const { data: students } = await studentsQuery;
      if (!students) throw new Error('No students found');

      const alerts: LowBalanceAlert[] = [];

      for (const student of students) {
        const balance = await this.hourManagement.getStudentHourBalance(student.id);
        if (!balance.success) continue;

        if (balance.data!.totalHours <= thresholdHours) {
          const alert = await this.createLowBalanceAlert(student.id, balance.data!);
          alerts.push(alert);
        }
      }

      return {
        success: true,
        data: alerts
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ALERT_ERROR',
          message: 'Failed to generate low balance alerts',
          details: error
        }
      };
    }
  }

  /**
   * Generate comprehensive usage report
   */
  async generateUsageReport(
    reportType: 'student' | 'class' | 'overall' | 'predictive',
    periodDays: number = 30,
    filters?: {
      studentIds?: string[];
      classTypes?: string[];
      courseTypes?: string[];
    }
  ): Promise<HourApiResponse<HourUsageReport>> {
    try {
      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - periodDays);

      const report = await this.generateReport(reportType, periodStart, filters);

      return {
        success: true,
        data: report
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'REPORT_ERROR',
          message: 'Failed to generate usage report',
          details: error
        }
      };
    }
  }

  /**
   * Get usage analytics for multiple students (batch operation)
   */
  async getBatchUsageAnalytics(
    studentIds: string[],
    periodDays: number = 30
  ): Promise<HourApiResponse<Array<{ studentId: string; analytics: HourUsageAnalytics }>>> {
    try {
      const results = await Promise.allSettled(
        studentIds.map(async (studentId) => {
          const result = await this.getStudentUsageAnalytics(studentId, periodDays);
          return { studentId, analytics: result.data! };
        })
      );

      const successful = results
        .filter((result): result is PromiseFulfilledResult<{ studentId: string; analytics: HourUsageAnalytics }> => 
          result.status === 'fulfilled'
        )
        .map(result => result.value);

      return {
        success: true,
        data: successful
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'BATCH_ERROR',
          message: 'Failed to get batch analytics',
          details: error
        }
      };
    }
  }

  /**
   * Get predictive insights for hour usage
   */
  async getPredictiveInsights(
    studentId: string,
    forecastDays: number = 30
  ): Promise<HourApiResponse<{
    runOutPrediction: { date: string | null; confidence: number };
    recommendedTopUp: { date: string; packageSize: number };
    usageOptimization: Array<{ suggestion: string; impact: string }>;
  }>> {
    try {
      const analytics = await this.getStudentUsageAnalytics(studentId, 90);
      if (!analytics.success) throw new Error('Failed to get analytics');

      const predictions = this.generatePredictions(analytics.data!, forecastDays);

      return {
        success: true,
        data: predictions
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PREDICTION_ERROR',
          message: 'Failed to generate predictions',
          details: error
        }
      };
    }
  }

  // Private helper methods

  private async analyzeStudentUsage(
    studentId: string,
    transactions: any[],
    classData: any[],
    balance: StudentHourBalance,
    periodStart: Date
  ): Promise<HourUsageAnalytics> {
    const balanceHistory = await this.calculateBalanceHistory(studentId, periodStart);
    
    // Analyze usage patterns
    const dailyPattern = this.analyzeDailyUsagePattern(transactions, classData);
    const hourlyPattern = this.analyzeHourlyUsagePattern(classData);
    const consumptionRate = this.calculateConsumptionRate(transactions);
    const classTypeUsage = this.analyzeClassTypeUsage(transactions, classData);
    const efficiencyMetrics = this.calculateEfficiencyMetrics(transactions, classData);
    const predictions = this.generateUsagePredictions(transactions, balance);

    return {
      studentId,
      analysisDate: new Date().toISOString(),
      currentBalance: balance.totalHours,
      balanceHistory,
      dailyUsagePattern: dailyPattern,
      hourlyUsagePattern: hourlyPattern,
      consumptionRate,
      classTypeUsage,
      efficiencyMetrics,
      predictions
    };
  }

  private async calculateBalanceHistory(
    studentId: string,
    periodStart: Date
  ): Promise<Array<{ date: string; balance: number; change: number; changeReason: string }>> {
    const { data: transactions } = await this.supabase
      .from('hour_transactions')
      .select('*')
      .eq('student_id', studentId)
      .gte('created_at', periodStart.toISOString())
      .order('created_at', { ascending: true });

    const history: Array<{ date: string; balance: number; change: number; changeReason: string }> = [];
    let currentBalance = 0;

    // Get initial balance
    const initialBalance = transactions?.[0]?.balance_before || 0;
    currentBalance = initialBalance;

    transactions?.forEach(transaction => {
      currentBalance = transaction.balance_after;
      history.push({
        date: transaction.created_at,
        balance: currentBalance,
        change: transaction.hours_amount,
        changeReason: this.getChangeReason(transaction)
      });
    });

    return history;
  }

  private getChangeReason(transaction: any): string {
    switch (transaction.transaction_type) {
      case 'purchase':
        return 'Hour purchase';
      case 'deduction':
        return `Class: ${transaction.class_type || 'Unknown'}`;
      case 'transfer':
        return transaction.hours_amount > 0 ? 'Transfer received' : 'Transfer sent';
      case 'adjustment':
        return 'Manual adjustment';
      case 'refund':
        return 'Refund processed';
      case 'expiry':
        return 'Hours expired';
      default:
        return 'Other';
    }
  }

  private analyzeDailyUsagePattern(transactions: any[], classData: any[]): Array<{
    dayOfWeek: string;
    averageHours: number;
    peakHours: number;
    sessionCount: number;
  }> {
    const dayStats: Record<string, { hours: number[]; sessions: number }> = {};
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Initialize stats
    days.forEach(day => {
      dayStats[day] = { hours: [], sessions: 0 };
    });

    // Analyze transactions
    transactions.forEach(transaction => {
      if (transaction.transaction_type === 'deduction') {
        const date = new Date(transaction.created_at);
        const dayOfWeek = days[date.getDay()];
        dayStats[dayOfWeek].hours.push(Math.abs(transaction.hours_amount));
        dayStats[dayOfWeek].sessions++;
      }
    });

    return days.map(day => {
      const stats = dayStats[day];
      return {
        dayOfWeek: day,
        averageHours: stats.hours.length > 0 ? stats.hours.reduce((a, b) => a + b, 0) / stats.hours.length : 0,
        peakHours: stats.hours.length > 0 ? Math.max(...stats.hours) : 0,
        sessionCount: stats.sessions
      };
    });
  }

  private analyzeHourlyUsagePattern(classData: any[]): Array<{
    hour: number;
    averageHours: number;
    sessionCount: number;
  }> {
    const hourStats: Record<number, { hours: number[]; sessions: number }> = {};

    // Initialize 24-hour stats
    for (let i = 0; i < 24; i++) {
      hourStats[i] = { hours: [], sessions: 0 };
    }

    classData.forEach(classItem => {
      const date = new Date(classItem.class_date);
      const hour = date.getHours();
      const duration = classItem.classes?.duration || 1;
      
      hourStats[hour].hours.push(duration);
      hourStats[hour].sessions++;
    });

    return Object.entries(hourStats).map(([hour, stats]) => ({
      hour: parseInt(hour),
      averageHours: stats.hours.length > 0 ? stats.hours.reduce((a, b) => a + b, 0) / stats.hours.length : 0,
      sessionCount: stats.sessions
    }));
  }

  private calculateConsumptionRate(transactions: any[]): {
    daily: number;
    weekly: number;
    monthly: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  } {
    const deductions = transactions.filter(t => t.transaction_type === 'deduction');
    const totalHours = deductions.reduce((sum, t) => sum + Math.abs(t.hours_amount), 0);
    const totalDays = deductions.length > 0 ? 
      (new Date().getTime() - new Date(deductions[0].created_at).getTime()) / (1000 * 60 * 60 * 24) : 1;

    const daily = totalHours / totalDays;
    const weekly = daily * 7;
    const monthly = daily * 30;

    // Simple trend analysis
    const firstHalf = deductions.slice(0, Math.floor(deductions.length / 2));
    const secondHalf = deductions.slice(Math.floor(deductions.length / 2));
    
    const firstHalfRate = firstHalf.reduce((sum, t) => sum + Math.abs(t.hours_amount), 0) / (firstHalf.length || 1);
    const secondHalfRate = secondHalf.reduce((sum, t) => sum + Math.abs(t.hours_amount), 0) / (secondHalf.length || 1);
    
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    const difference = Math.abs(secondHalfRate - firstHalfRate);
    
    if (difference > 0.1) {
      trend = secondHalfRate > firstHalfRate ? 'increasing' : 'decreasing';
    }

    return { daily, weekly, monthly, trend };
  }

  private analyzeClassTypeUsage(transactions: any[], classData: any[]): Array<{
    classType: string;
    totalHours: number;
    percentage: number;
    averageSessionLength: number;
    frequency: number;
  }> {
    const typeStats: Record<string, { hours: number; sessions: number }> = {};
    
    transactions.forEach(transaction => {
      if (transaction.transaction_type === 'deduction' && transaction.class_type) {
        const type = transaction.class_type;
        if (!typeStats[type]) {
          typeStats[type] = { hours: 0, sessions: 0 };
        }
        typeStats[type].hours += Math.abs(transaction.hours_amount);
        typeStats[type].sessions++;
      }
    });

    const totalHours = Object.values(typeStats).reduce((sum, stats) => sum + stats.hours, 0);

    return Object.entries(typeStats).map(([classType, stats]) => ({
      classType,
      totalHours: stats.hours,
      percentage: totalHours > 0 ? (stats.hours / totalHours) * 100 : 0,
      averageSessionLength: stats.sessions > 0 ? stats.hours / stats.sessions : 0,
      frequency: stats.sessions
    }));
  }

  private calculateEfficiencyMetrics(transactions: any[], classData: any[]): {
    hoursPerClass: number;
    utilizationRate: number;
    wastageRate: number;
    renewalPattern: string;
  } {
    const deductions = transactions.filter(t => t.transaction_type === 'deduction');
    const totalHours = deductions.reduce((sum, t) => sum + Math.abs(t.hours_amount), 0);
    const totalClasses = classData.length;

    const hoursPerClass = totalClasses > 0 ? totalHours / totalClasses : 0;
    
    // Calculate utilization rate (completed classes vs purchased hours)
    const purchases = transactions.filter(t => t.transaction_type === 'purchase');
    const purchasedHours = purchases.reduce((sum, t) => sum + t.hours_amount, 0);
    const utilizationRate = purchasedHours > 0 ? (totalHours / purchasedHours) * 100 : 0;
    
    // Calculate wastage rate (expired hours)
    const expiredHours = transactions
      .filter(t => t.transaction_type === 'expiry')
      .reduce((sum, t) => sum + Math.abs(t.hours_amount), 0);
    const wastageRate = purchasedHours > 0 ? (expiredHours / purchasedHours) * 100 : 0;

    // Analyze renewal pattern
    const renewalPattern = this.analyzeRenewalPattern(purchases);

    return {
      hoursPerClass,
      utilizationRate,
      wastageRate,
      renewalPattern
    };
  }

  private analyzeRenewalPattern(purchases: any[]): string {
    if (purchases.length < 2) return 'insufficient_data';

    const intervals = [];
    for (let i = 1; i < purchases.length; i++) {
      const prev = new Date(purchases[i - 1].created_at);
      const current = new Date(purchases[i].created_at);
      const days = (current.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      intervals.push(days);
    }

    const averageInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;

    if (averageInterval < 30) return 'frequent';
    if (averageInterval < 90) return 'regular';
    if (averageInterval < 180) return 'occasional';
    return 'rare';
  }

  private generateUsagePredictions(transactions: any[], balance: StudentHourBalance): {
    runOutDate: string | null;
    recommendedTopUpDate: string | null;
    recommendedPackageSize: number;
    confidenceScore: number;
  } {
    const deductions = transactions.filter(t => t.transaction_type === 'deduction');
    
    if (deductions.length === 0) {
      return {
        runOutDate: null,
        recommendedTopUpDate: null,
        recommendedPackageSize: 20,
        confidenceScore: 0
      };
    }

    // Calculate average daily usage
    const totalHours = deductions.reduce((sum, t) => sum + Math.abs(t.hours_amount), 0);
    const daysSinceFirst = (new Date().getTime() - new Date(deductions[0].created_at).getTime()) / (1000 * 60 * 60 * 24);
    const dailyUsage = totalHours / daysSinceFirst;

    // Predict run out date
    const daysUntilRunOut = dailyUsage > 0 ? balance.totalHours / dailyUsage : null;
    const runOutDate = daysUntilRunOut ? new Date(Date.now() + daysUntilRunOut * 24 * 60 * 60 * 1000).toISOString() : null;

    // Recommend top-up date (when balance reaches 25% of average usage)
    const topUpThreshold = Math.max(5, dailyUsage * 7); // 1 week buffer
    const daysUntilTopUp = balance.totalHours > topUpThreshold ? 
      (balance.totalHours - topUpThreshold) / dailyUsage : 0;
    const recommendedTopUpDate = new Date(Date.now() + daysUntilTopUp * 24 * 60 * 60 * 1000).toISOString();

    // Recommend package size based on usage pattern
    const monthlyUsage = dailyUsage * 30;
    const recommendedPackageSize = Math.max(20, Math.ceil(monthlyUsage / 10) * 10);

    // Calculate confidence score based on data consistency
    const confidenceScore = Math.min(1, deductions.length / 30); // Higher confidence with more data points

    return {
      runOutDate,
      recommendedTopUpDate,
      recommendedPackageSize,
      confidenceScore
    };
  }

  private analyzeTrend(
    studentId: string,
    balanceHistory: Array<{ date: string; balance: number; change: number; changeReason: string }>,
    transactions: any[],
    alerts: any[],
    periodStart: Date
  ): BalanceTrend {
    const now = new Date();
    
    // Calculate trend
    const balances = balanceHistory.map(h => h.balance);
    const trend = this.calculateTrend(balances);
    
    // Calculate statistics
    const startingBalance = balances[0] || 0;
    const endingBalance = balances[balances.length - 1] || 0;
    const peakBalance = Math.max(...balances, 0);
    const lowBalance = Math.min(...balances, 0);
    
    const purchases = transactions.filter(t => t.transaction_type === 'purchase');
    const deductions = transactions.filter(t => t.transaction_type === 'deduction');
    
    const totalHoursPurchased = purchases.reduce((sum, t) => sum + t.hours_amount, 0);
    const totalHoursUsed = deductions.reduce((sum, t) => sum + Math.abs(t.hours_amount), 0);
    
    // Calculate patterns
    const days = (now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24);
    const averageDailyUsage = totalHoursUsed / days;
    const usageVariability = this.calculateVariability(deductions.map(d => Math.abs(d.hours_amount)));
    const purchaseFrequency = purchases.length / days * 30; // per month
    
    // Count alert events
    const lowBalanceEvents = alerts.filter(a => a.alert_type === 'low_balance').length;
    const nearExpiryEvents = alerts.filter(a => a.alert_type === 'expiring_soon').length;
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(
      trend,
      averageDailyUsage,
      endingBalance,
      lowBalanceEvents
    );

    return {
      studentId,
      periodStart: periodStart.toISOString(),
      periodEnd: now.toISOString(),
      trend: trend.direction,
      trendStrength: trend.strength,
      startingBalance,
      endingBalance,
      peakBalance,
      lowBalance,
      totalHoursUsed,
      totalHoursPurchased,
      netChange: endingBalance - startingBalance,
      averageDailyUsage,
      usageVariability,
      purchaseFrequency,
      lowBalanceEvents,
      nearExpiryEvents,
      recommendations
    };
  }

  private calculateTrend(values: number[]): { direction: 'increasing' | 'decreasing' | 'stable' | 'volatile'; strength: number } {
    if (values.length < 2) return { direction: 'stable', strength: 0 };

    // Simple linear regression
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + i * val, 0);
    const sumX2 = values.reduce((sum, val, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    const direction = Math.abs(slope) < 0.1 ? 'stable' : 
                     slope > 0 ? 'increasing' : 'decreasing';
    
    const strength = Math.min(1, Math.abs(slope) / 10);
    
    return { direction, strength };
  }

  private calculateVariability(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const standardDeviation = Math.sqrt(variance);
    
    return mean > 0 ? standardDeviation / mean : 0; // Coefficient of variation
  }

  private generateRecommendations(
    trend: { direction: string; strength: number },
    averageDailyUsage: number,
    currentBalance: number,
    lowBalanceEvents: number
  ): Array<{
    type: 'purchase' | 'usage_optimization' | 'schedule_adjustment';
    message: string;
    priority: 'low' | 'medium' | 'high';
    actionRequired: boolean;
  }> {
    const recommendations: Array<{
      type: 'purchase' | 'usage_optimization' | 'schedule_adjustment';
      message: string;
      priority: 'low' | 'medium' | 'high';
      actionRequired: boolean;
    }> = [];

    // Low balance recommendations
    if (currentBalance < 10) {
      recommendations.push({
        type: 'purchase',
        message: 'Consider purchasing additional hours to avoid interruption',
        priority: 'high',
        actionRequired: true
      });
    }

    // Usage optimization
    if (averageDailyUsage > 3) {
      recommendations.push({
        type: 'usage_optimization',
        message: 'High usage detected. Consider optimizing class scheduling',
        priority: 'medium',
        actionRequired: false
      });
    }

    // Frequent low balance events
    if (lowBalanceEvents > 2) {
      recommendations.push({
        type: 'purchase',
        message: 'Consider purchasing larger packages to avoid frequent low balance alerts',
        priority: 'medium',
        actionRequired: false
      });
    }

    return recommendations;
  }

  private async createLowBalanceAlert(
    studentId: string,
    balance: StudentHourBalance
  ): Promise<LowBalanceAlert> {
    // Get usage analytics for prediction
    const analytics = await this.getStudentUsageAnalytics(studentId, 30);
    const usageRate = analytics.success ? analytics.data!.consumptionRate.daily : 1;
    
    const daysRemaining = usageRate > 0 ? balance.totalHours / usageRate : 30;
    const estimatedRunOutDate = new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000).toISOString();

    // Get upcoming classes
    const { data: upcomingClasses } = await this.supabase
      .from('class_bookings')
      .select('id')
      .eq('student_id', studentId)
      .gte('class_date', new Date().toISOString())
      .limit(10);

    const severity = balance.totalHours <= 2 ? 'critical' : 
                    balance.totalHours <= 5 ? 'high' : 
                    balance.totalHours <= 10 ? 'medium' : 'low';

    return {
      id: `alert_${studentId}_${Date.now()}`,
      studentId,
      alertType: 'low_balance',
      currentBalance: balance.totalHours,
      threshold: 5,
      severity,
      estimatedRunOutDate,
      daysRemaining: Math.ceil(daysRemaining),
      recentUsageRate: usageRate,
      upcomingClasses: upcomingClasses?.length || 0,
      recommendedAction: severity === 'critical' ? 'Purchase hours immediately' : 
                        severity === 'high' ? 'Purchase hours within 2 days' : 
                        'Consider purchasing hours soon',
      recommendedPackageSize: Math.max(20, Math.ceil(usageRate * 30 / 10) * 10),
      urgencyLevel: severity === 'critical' ? 10 : 
                   severity === 'high' ? 8 : 
                   severity === 'medium' ? 5 : 3,
      autoNotificationSent: false,
      lastNotificationDate: null,
      nextNotificationDate: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      acknowledgedAt: null
    };
  }

  private groupTransactionsByClassType(transactions: any[]): Record<string, any[]> {
    const groups: Record<string, any[]> = {};
    
    transactions.forEach(transaction => {
      const classType = transaction.class_type || 'unknown';
      if (!groups[classType]) {
        groups[classType] = [];
      }
      groups[classType].push(transaction);
    });
    
    return groups;
  }

  private async analyzeConsumptionPattern(
    studentId: string,
    classType: string,
    transactions: any[]
  ): Promise<ConsumptionPattern> {
    // Analyze frequency and consistency
    const sessionDates = transactions.map(t => new Date(t.created_at));
    const intervals = [];
    
    for (let i = 1; i < sessionDates.length; i++) {
      const interval = (sessionDates[i].getTime() - sessionDates[i - 1].getTime()) / (1000 * 60 * 60 * 24);
      intervals.push(interval);
    }

    const averageInterval = intervals.length > 0 ? intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length : 0;
    const frequency = this.categorizeFrequency(averageInterval);
    const consistency = this.calculateConsistency(intervals);

    // Analyze time patterns
    const dayCount: Record<string, number> = {};
    const hourCount: Record<number, number> = {};
    
    sessionDates.forEach(date => {
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
      const hour = date.getHours();
      
      dayCount[dayOfWeek] = (dayCount[dayOfWeek] || 0) + 1;
      hourCount[hour] = (hourCount[hour] || 0) + 1;
    });

    const preferredDays = Object.entries(dayCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([day]) => day);

    const preferredHours = Object.entries(hourCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));

    // Calculate metrics
    const totalHours = transactions.reduce((sum, t) => sum + Math.abs(t.hours_amount), 0);
    const averageHoursPerSession = totalHours / transactions.length;
    const totalSessions = transactions.length;

    // Get benchmark data for comparison
    const benchmarkComparison = await this.getBenchmarkComparison(studentId, classType, averageHoursPerSession);

    return {
      patternId: `pattern_${studentId}_${classType}`,
      studentId,
      classType,
      frequency,
      consistency,
      predictability: consistency * 0.7 + (frequency !== 'irregular' ? 0.3 : 0),
      preferredDays,
      preferredHours,
      averageSessionLength: averageHoursPerSession,
      totalSessions,
      totalHours,
      averageHoursPerSession,
      completionRate: 0.95, // Would need class completion data
      cancellationRate: 0.05, // Would need cancellation data
      reschedulingRate: 0.1, // Would need rescheduling data
      usageTrend: this.calculateUsageTrend(transactions),
      seasonalPattern: this.detectSeasonalPattern(sessionDates),
      benchmarkComparison
    };
  }

  private categorizeFrequency(averageInterval: number): 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'irregular' {
    if (averageInterval <= 2) return 'daily';
    if (averageInterval <= 9) return 'weekly';
    if (averageInterval <= 16) return 'bi-weekly';
    if (averageInterval <= 35) return 'monthly';
    return 'irregular';
  }

  private calculateConsistency(intervals: number[]): number {
    if (intervals.length < 2) return 0;
    
    const mean = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    const variance = intervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / intervals.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Consistency is inverse of coefficient of variation
    const cv = mean > 0 ? standardDeviation / mean : 1;
    return Math.max(0, 1 - cv);
  }

  private calculateUsageTrend(transactions: any[]): 'increasing' | 'decreasing' | 'stable' {
    if (transactions.length < 4) return 'stable';
    
    const firstHalf = transactions.slice(0, Math.floor(transactions.length / 2));
    const secondHalf = transactions.slice(Math.floor(transactions.length / 2));
    
    const firstHalfAvg = firstHalf.reduce((sum, t) => sum + Math.abs(t.hours_amount), 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, t) => sum + Math.abs(t.hours_amount), 0) / secondHalf.length;
    
    const difference = Math.abs(secondHalfAvg - firstHalfAvg);
    if (difference < 0.1) return 'stable';
    
    return secondHalfAvg > firstHalfAvg ? 'increasing' : 'decreasing';
  }

  private detectSeasonalPattern(dates: Date[]): boolean {
    // Simple seasonal pattern detection
    const monthCounts: Record<number, number> = {};
    
    dates.forEach(date => {
      const month = date.getMonth();
      monthCounts[month] = (monthCounts[month] || 0) + 1;
    });
    
    const counts = Object.values(monthCounts);
    const max = Math.max(...counts);
    const min = Math.min(...counts);
    
    // If there's significant variation in monthly usage, consider it seasonal
    return max > 0 && (max - min) / max > 0.3;
  }

  private async getBenchmarkComparison(
    studentId: string,
    classType: string,
    averageHoursPerSession: number
  ): Promise<{ vsAverage: number; percentile: number; efficiency: 'high' | 'medium' | 'low' }> {
    // Get benchmark data from other students
    const { data: benchmarkData } = await this.supabase
      .from('hour_transactions')
      .select('hours_amount')
      .eq('class_type', classType)
      .eq('transaction_type', 'deduction')
      .neq('student_id', studentId);

    if (!benchmarkData || benchmarkData.length === 0) {
      return { vsAverage: 0, percentile: 50, efficiency: 'medium' };
    }

    const benchmarkHours = benchmarkData.map(t => Math.abs(t.hours_amount));
    const benchmarkAverage = benchmarkHours.reduce((sum, h) => sum + h, 0) / benchmarkHours.length;
    
    const vsAverage = benchmarkAverage > 0 ? ((averageHoursPerSession - benchmarkAverage) / benchmarkAverage) * 100 : 0;
    
    // Calculate percentile
    const sorted = benchmarkHours.sort((a, b) => a - b);
    const rank = sorted.filter(h => h <= averageHoursPerSession).length;
    const percentile = (rank / sorted.length) * 100;
    
    // Determine efficiency
    const efficiency = percentile < 33 ? 'high' : percentile < 67 ? 'medium' : 'low';
    
    return { vsAverage, percentile, efficiency };
  }

  private async generateReport(
    reportType: 'student' | 'class' | 'overall' | 'predictive',
    periodStart: Date,
    filters?: {
      studentIds?: string[];
      classTypes?: string[];
      courseTypes?: string[];
    }
  ): Promise<HourUsageReport> {
    const reportId = `report_${Date.now()}`;
    const now = new Date();

    // Get transaction data with filters
    let query = this.supabase
      .from('hour_transactions')
      .select(`
        *,
        students(first_name, last_name),
        classes(class_type, subject, course_type)
      `)
      .gte('created_at', periodStart.toISOString());

    if (filters?.studentIds) {
      query = query.in('student_id', filters.studentIds);
    }

    const { data: transactions } = await query;

    // Calculate summary statistics
    const students = new Set(transactions?.map(t => t.student_id) || []);
    const totalHoursUsed = transactions?.filter(t => t.transaction_type === 'deduction')
      .reduce((sum, t) => sum + Math.abs(t.hours_amount), 0) || 0;
    const totalHoursPurchased = transactions?.filter(t => t.transaction_type === 'purchase')
      .reduce((sum, t) => sum + t.hours_amount, 0) || 0;

    // Generate insights and recommendations based on report type
    const insights = this.generateInsights(transactions || [], reportType);
    const recommendations = this.generateReportRecommendations(transactions || [], reportType);

    return {
      reportId,
      generatedAt: now.toISOString(),
      reportType,
      periodStart: periodStart.toISOString(),
      periodEnd: now.toISOString(),
      summary: {
        totalStudents: students.size,
        totalHoursUsed,
        totalHoursPurchased,
        averageUsagePerStudent: students.size > 0 ? totalHoursUsed / students.size : 0,
        utilizationRate: totalHoursPurchased > 0 ? (totalHoursUsed / totalHoursPurchased) * 100 : 0
      },
      classTypeBreakdown: this.generateClassTypeBreakdown(transactions || []),
      peakUsageTimes: this.generatePeakUsageTimes(transactions || []),
      studentSegments: this.generateStudentSegments(transactions || []),
      insights,
      recommendations
    };
  }

  private generateInsights(transactions: any[], reportType: string): Array<{
    category: string;
    insight: string;
    impact: 'high' | 'medium' | 'low';
    actionable: boolean;
  }> {
    const insights: Array<{
      category: string;
      insight: string;
      impact: 'high' | 'medium' | 'low';
      actionable: boolean;
    }> = [];

    // Usage pattern insights
    const deductions = transactions.filter(t => t.transaction_type === 'deduction');
    const classTypes = [...new Set(deductions.map(t => t.class_type).filter(Boolean))];
    
    if (classTypes.length > 0) {
      const mostPopular = classTypes.reduce((a, b) => 
        deductions.filter(t => t.class_type === a).length > deductions.filter(t => t.class_type === b).length ? a : b
      );
      
      insights.push({
        category: 'Usage Patterns',
        insight: `${mostPopular} classes are most popular, accounting for ${Math.round(deductions.filter(t => t.class_type === mostPopular).length / deductions.length * 100)}% of sessions`,
        impact: 'medium',
        actionable: true
      });
    }

    return insights;
  }

  private generateReportRecommendations(transactions: any[], reportType: string): Array<{
    target: 'operations' | 'marketing' | 'curriculum' | 'pricing';
    recommendation: string;
    expectedImpact: string;
    priority: 'high' | 'medium' | 'low';
  }> {
    const recommendations: Array<{
      target: 'operations' | 'marketing' | 'curriculum' | 'pricing';
      recommendation: string;
      expectedImpact: string;
      priority: 'high' | 'medium' | 'low';
    }> = [];

    // Add sample recommendations
    recommendations.push({
      target: 'operations',
      recommendation: 'Optimize class scheduling during peak usage hours',
      expectedImpact: 'Improved student satisfaction and resource utilization',
      priority: 'medium'
    });

    return recommendations;
  }

  private generateClassTypeBreakdown(transactions: any[]): Array<{
    classType: string;
    totalHours: number;
    studentCount: number;
    averageHoursPerStudent: number;
    popularityRank: number;
  }> {
    const deductions = transactions.filter(t => t.transaction_type === 'deduction');
    const typeStats: Record<string, { hours: number; students: Set<string> }> = {};

    deductions.forEach(transaction => {
      const type = transaction.class_type || 'Unknown';
      if (!typeStats[type]) {
        typeStats[type] = { hours: 0, students: new Set() };
      }
      typeStats[type].hours += Math.abs(transaction.hours_amount);
      typeStats[type].students.add(transaction.student_id);
    });

    const breakdown = Object.entries(typeStats)
      .map(([classType, stats]) => ({
        classType,
        totalHours: stats.hours,
        studentCount: stats.students.size,
        averageHoursPerStudent: stats.students.size > 0 ? stats.hours / stats.students.size : 0,
        popularityRank: 0
      }))
      .sort((a, b) => b.totalHours - a.totalHours);

    // Assign popularity ranks
    breakdown.forEach((item, index) => {
      item.popularityRank = index + 1;
    });

    return breakdown;
  }

  private generatePeakUsageTimes(transactions: any[]): Array<{
    timeSlot: string;
    hoursUsed: number;
    sessionCount: number;
  }> {
    const deductions = transactions.filter(t => t.transaction_type === 'deduction');
    const hourStats: Record<number, { hours: number; sessions: number }> = {};

    deductions.forEach(transaction => {
      const hour = new Date(transaction.created_at).getHours();
      if (!hourStats[hour]) {
        hourStats[hour] = { hours: 0, sessions: 0 };
      }
      hourStats[hour].hours += Math.abs(transaction.hours_amount);
      hourStats[hour].sessions++;
    });

    return Object.entries(hourStats)
      .map(([hour, stats]) => ({
        timeSlot: `${hour}:00-${parseInt(hour) + 1}:00`,
        hoursUsed: stats.hours,
        sessionCount: stats.sessions
      }))
      .sort((a, b) => b.hoursUsed - a.hoursUsed);
  }

  private generateStudentSegments(transactions: any[]): Array<{
    segment: string;
    count: number;
    totalHours: number;
    averageHours: number;
    characteristics: string[];
  }> {
    const studentStats: Record<string, { hours: number; sessions: number }> = {};

    transactions.forEach(transaction => {
      if (transaction.transaction_type === 'deduction') {
        const studentId = transaction.student_id;
        if (!studentStats[studentId]) {
          studentStats[studentId] = { hours: 0, sessions: 0 };
        }
        studentStats[studentId].hours += Math.abs(transaction.hours_amount);
        studentStats[studentId].sessions++;
      }
    });

    const students = Object.entries(studentStats).map(([studentId, stats]) => ({
      studentId,
      hours: stats.hours,
      sessions: stats.sessions,
      averageHours: stats.hours / stats.sessions
    }));

    // Segment by usage level
    const segments: Array<{
      segment: string;
      count: number;
      totalHours: number;
      averageHours: number;
      characteristics: string[];
    }> = [];

    const lightUsers = students.filter(s => s.hours < 20);
    const mediumUsers = students.filter(s => s.hours >= 20 && s.hours < 50);
    const heavyUsers = students.filter(s => s.hours >= 50);

    if (lightUsers.length > 0) {
      segments.push({
        segment: 'Light Users',
        count: lightUsers.length,
        totalHours: lightUsers.reduce((sum, s) => sum + s.hours, 0),
        averageHours: lightUsers.reduce((sum, s) => sum + s.hours, 0) / lightUsers.length,
        characteristics: ['Low usage', 'Occasional learners', 'New students']
      });
    }

    if (mediumUsers.length > 0) {
      segments.push({
        segment: 'Regular Users',
        count: mediumUsers.length,
        totalHours: mediumUsers.reduce((sum, s) => sum + s.hours, 0),
        averageHours: mediumUsers.reduce((sum, s) => sum + s.hours, 0) / mediumUsers.length,
        characteristics: ['Consistent usage', 'Committed learners', 'Stable patterns']
      });
    }

    if (heavyUsers.length > 0) {
      segments.push({
        segment: 'Power Users',
        count: heavyUsers.length,
        totalHours: heavyUsers.reduce((sum, s) => sum + s.hours, 0),
        averageHours: heavyUsers.reduce((sum, s) => sum + s.hours, 0) / heavyUsers.length,
        characteristics: ['High usage', 'Intensive learners', 'Frequent sessions']
      });
    }

    return segments;
  }

  private generatePredictions(
    analytics: HourUsageAnalytics,
    forecastDays: number
  ): {
    runOutPrediction: { date: string | null; confidence: number };
    recommendedTopUp: { date: string; packageSize: number };
    usageOptimization: Array<{ suggestion: string; impact: string }>;
  } {
    const { consumptionRate, currentBalance, predictions } = analytics;
    
    // Enhanced run-out prediction
    const runOutPrediction = {
      date: predictions.runOutDate,
      confidence: predictions.confidenceScore
    };

    // Top-up recommendation
    const recommendedTopUp = {
      date: predictions.recommendedTopUpDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      packageSize: predictions.recommendedPackageSize
    };

    // Usage optimization suggestions
    const usageOptimization = [];
    
    if (consumptionRate.trend === 'increasing') {
      usageOptimization.push({
        suggestion: 'Consider scheduling classes more efficiently to optimize hour usage',
        impact: 'Could reduce daily consumption by 10-15%'
      });
    }

    if (analytics.efficiencyMetrics.wastageRate > 10) {
      usageOptimization.push({
        suggestion: 'Reduce hour wastage by using hours before expiry',
        impact: `Could save ${Math.round(analytics.efficiencyMetrics.wastageRate)}% of purchased hours`
      });
    }

    return {
      runOutPrediction,
      recommendedTopUp,
      usageOptimization
    };
  }
}

// Export singleton instance
export const hourUsageAnalyticsService = new HourUsageAnalyticsService();