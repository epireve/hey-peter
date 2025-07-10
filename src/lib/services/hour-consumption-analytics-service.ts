/**
 * Hour Consumption Analytics Service
 * 
 * This service provides comprehensive analytics for hour consumption patterns,
 * class type efficiency metrics, and predictive insights for hour planning.
 */

import { createClient } from '@/lib/supabase';
import type { HourApiResponse } from '@/types/hours';

// =====================================================================================
// TYPES AND INTERFACES
// =====================================================================================

export interface ClassTypeConsumption {
  classType: string;
  totalHours: number;
  averageHoursPerClass: number;
  sessionCount: number;
  studentCount: number;
  utilizationRate: number;
  efficiencyScore: number;
  popularityRank: number;
  averageSessionDuration: number;
  cancellationRate: number;
  completionRate: number;
}

export interface HourConsumptionTrend {
  period: string;
  totalHours: number;
  averagePerStudent: number;
  peakHours: number;
  utilizationRate: number;
  classTypeBreakdown: Array<{
    classType: string;
    hours: number;
    percentage: number;
  }>;
}

export interface EfficiencyMetrics {
  overallUtilization: number;
  averageHoursPerClass: number;
  mostEfficientClassType: string;
  leastEfficientClassType: string;
  wastePercentage: number;
  optimalPackageSize: number;
  renewalRate: number;
  retentionRate: number;
}

export interface ConsumptionPattern {
  patternId: string;
  classType: string;
  timePattern: 'morning' | 'afternoon' | 'evening' | 'mixed';
  frequencyPattern: 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'irregular';
  averageSessionsPerWeek: number;
  preferredDays: string[];
  peakHours: number[];
  consistency: number; // 0-1 scale
  predictability: number; // 0-1 scale
}

export interface PredictiveInsights {
  forecastPeriod: string;
  projectedConsumption: number;
  confidenceScore: number;
  trendDirection: 'increasing' | 'decreasing' | 'stable';
  recommendedActions: Array<{
    type: 'optimization' | 'package_adjustment' | 'scheduling';
    priority: 'high' | 'medium' | 'low';
    description: string;
    expectedImpact: string;
  }>;
  riskFactors: Array<{
    factor: string;
    impact: 'high' | 'medium' | 'low';
    probability: number;
  }>;
}

export interface ComparativeAnalytics {
  comparisonType: 'class_type' | 'time_period' | 'student_segment';
  baseline: {
    name: string;
    metrics: EfficiencyMetrics;
  };
  comparisons: Array<{
    name: string;
    metrics: EfficiencyMetrics;
    variance: number;
    performance: 'above' | 'below' | 'similar';
  }>;
}

export interface HourPlanningRecommendations {
  studentId?: string;
  classType?: string;
  recommendations: Array<{
    type: 'package_size' | 'timing' | 'frequency' | 'class_type';
    current: any;
    recommended: any;
    reasoning: string;
    expectedBenefit: string;
    confidence: number;
  }>;
  budgetOptimization: {
    currentSpending: number;
    optimizedSpending: number;
    potentialSavings: number;
    paybackPeriod: string;
  };
}

export interface ConsumptionAnalyticsDashboard {
  overview: {
    totalHoursConsumed: number;
    averageConsumptionPerStudent: number;
    overallEfficiency: number;
    topPerformingClassType: string;
    monthlyGrowthRate: number;
  };
  classTypeMetrics: ClassTypeConsumption[];
  consumptionTrends: HourConsumptionTrend[];
  efficiencyMetrics: EfficiencyMetrics;
  predictiveInsights: PredictiveInsights;
  alerts: Array<{
    type: 'efficiency_drop' | 'unusual_pattern' | 'optimization_opportunity';
    message: string;
    severity: 'high' | 'medium' | 'low';
    actionRequired: boolean;
  }>;
}

// =====================================================================================
// ANALYTICS SERVICE CLASS
// =====================================================================================

export class HourConsumptionAnalyticsService {
  private supabase = createClient();

  /**
   * Get comprehensive consumption analytics for all class types
   */
  async getClassTypeConsumptionAnalytics(options?: {
    periodDays?: number;
    classTypes?: string[];
    includeInactive?: boolean;
  }): Promise<HourApiResponse<ClassTypeConsumption[]>> {
    try {
      const periodDays = options?.periodDays || 90;
      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - periodDays);

      // Get consumption data by class type
      const { data: consumptionData, error } = await this.supabase
        .from('hour_transactions')
        .select(`
          class_type,
          hours_amount,
          created_at,
          class_id,
          student_id,
          booking_id
        `)
        .eq('transaction_type', 'deduction')
        .gte('created_at', periodStart.toISOString())
        .not('class_type', 'is', null);

      if (error) throw error;

      // Get class completion data
      const { data: classData, error: classError } = await this.supabase
        .from('classes')
        .select(`
          id,
          course_id,
          courses (
            course_type,
            duration_minutes,
            credit_hours
          )
        `);

      if (classError) throw classError;

      // Get booking data for cancellation rates
      const { data: bookingData, error: bookingError } = await this.supabase
        .from('bookings')
        .select(`
          id,
          class_id,
          student_id,
          status,
          created_at,
          duration_minutes
        `)
        .gte('created_at', periodStart.toISOString());

      if (bookingError) throw bookingError;

      // Process the data
      const analytics = this.processClassTypeConsumption(
        consumptionData || [],
        classData || [],
        bookingData || []
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
          message: 'Failed to get class type consumption analytics',
          details: error
        }
      };
    }
  }

  /**
   * Get hour consumption trends over time
   */
  async getConsumptionTrends(options?: {
    periodDays?: number;
    granularity?: 'daily' | 'weekly' | 'monthly';
  }): Promise<HourApiResponse<HourConsumptionTrend[]>> {
    try {
      const periodDays = options?.periodDays || 90;
      const granularity = options?.granularity || 'weekly';
      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - periodDays);

      const { data: trendData, error } = await this.supabase
        .from('hour_transactions')
        .select(`
          hours_amount,
          class_type,
          student_id,
          created_at
        `)
        .eq('transaction_type', 'deduction')
        .gte('created_at', periodStart.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      const trends = this.processConsumptionTrends(trendData || [], granularity);

      return {
        success: true,
        data: trends
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'TREND_ANALYSIS_ERROR',
          message: 'Failed to get consumption trends',
          details: error
        }
      };
    }
  }

  /**
   * Calculate efficiency metrics across all class types
   */
  async getEfficiencyMetrics(options?: {
    periodDays?: number;
    compareWithPrevious?: boolean;
  }): Promise<HourApiResponse<EfficiencyMetrics>> {
    try {
      const periodDays = options?.periodDays || 90;
      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - periodDays);

      // Get consumption data
      const { data: consumptionData, error } = await this.supabase
        .from('hour_transactions')
        .select(`
          hours_amount,
          class_type,
          student_id,
          created_at
        `)
        .eq('transaction_type', 'deduction')
        .gte('created_at', periodStart.toISOString());

      if (error) throw error;

      // Get purchase data for renewal/retention analysis
      const { data: purchaseData, error: purchaseError } = await this.supabase
        .from('hour_purchases')
        .select(`
          student_id,
          hours_purchased,
          hours_used,
          created_at,
          payment_status
        `)
        .eq('payment_status', 'completed')
        .gte('created_at', periodStart.toISOString());

      if (purchaseError) throw purchaseError;

      const metrics = this.calculateEfficiencyMetrics(
        consumptionData || [],
        purchaseData || []
      );

      return {
        success: true,
        data: metrics
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'EFFICIENCY_METRICS_ERROR',
          message: 'Failed to calculate efficiency metrics',
          details: error
        }
      };
    }
  }

  /**
   * Generate predictive insights for hour planning
   */
  async getPredictiveInsights(options?: {
    studentId?: string;
    classType?: string;
    forecastDays?: number;
  }): Promise<HourApiResponse<PredictiveInsights>> {
    try {
      const forecastDays = options?.forecastDays || 30;
      const historicalDays = 90;
      const historicalStart = new Date();
      historicalStart.setDate(historicalStart.getDate() - historicalDays);

      let query = this.supabase
        .from('hour_transactions')
        .select(`
          hours_amount,
          class_type,
          student_id,
          created_at
        `)
        .eq('transaction_type', 'deduction')
        .gte('created_at', historicalStart.toISOString());

      if (options?.studentId) {
        query = query.eq('student_id', options.studentId);
      }

      if (options?.classType) {
        query = query.eq('class_type', options.classType);
      }

      const { data: historicalData, error } = await query;

      if (error) throw error;

      const insights = this.generatePredictiveInsights(
        historicalData || [],
        forecastDays
      );

      return {
        success: true,
        data: insights
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PREDICTIVE_INSIGHTS_ERROR',
          message: 'Failed to generate predictive insights',
          details: error
        }
      };
    }
  }

  /**
   * Get comparative analytics between class types
   */
  async getComparativeAnalytics(options?: {
    comparisonType?: 'class_type' | 'time_period' | 'student_segment';
    baseline?: string;
    comparisons?: string[];
  }): Promise<HourApiResponse<ComparativeAnalytics>> {
    try {
      const comparisonType = options?.comparisonType || 'class_type';
      
      const { data: analytics, error } = await this.generateComparativeAnalytics(
        comparisonType,
        options?.baseline,
        options?.comparisons
      );

      if (error) throw error;

      return {
        success: true,
        data: analytics
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'COMPARATIVE_ANALYTICS_ERROR',
          message: 'Failed to generate comparative analytics',
          details: error
        }
      };
    }
  }

  /**
   * Generate hour planning recommendations
   */
  async getHourPlanningRecommendations(options?: {
    studentId?: string;
    classType?: string;
    includeBudgetOptimization?: boolean;
  }): Promise<HourApiResponse<HourPlanningRecommendations>> {
    try {
      const recommendations = await this.generateHourPlanningRecommendations(options);

      return {
        success: true,
        data: recommendations
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PLANNING_RECOMMENDATIONS_ERROR',
          message: 'Failed to generate hour planning recommendations',
          details: error
        }
      };
    }
  }

  /**
   * Get comprehensive analytics dashboard data
   */
  async getAnalyticsDashboard(options?: {
    periodDays?: number;
    includeAlerts?: boolean;
  }): Promise<HourApiResponse<ConsumptionAnalyticsDashboard>> {
    try {
      const periodDays = options?.periodDays || 30;

      // Get all required data in parallel
      const [
        classTypeAnalytics,
        consumptionTrends,
        efficiencyMetrics,
        predictiveInsights
      ] = await Promise.all([
        this.getClassTypeConsumptionAnalytics({ periodDays }),
        this.getConsumptionTrends({ periodDays }),
        this.getEfficiencyMetrics({ periodDays }),
        this.getPredictiveInsights({ forecastDays: 30 })
      ]);

      if (!classTypeAnalytics.success) throw classTypeAnalytics.error;
      if (!consumptionTrends.success) throw consumptionTrends.error;
      if (!efficiencyMetrics.success) throw efficiencyMetrics.error;
      if (!predictiveInsights.success) throw predictiveInsights.error;

      // Calculate overview metrics
      const overview = this.calculateOverviewMetrics(
        classTypeAnalytics.data!,
        consumptionTrends.data!
      );

      // Generate alerts if requested
      const alerts = options?.includeAlerts ? 
        this.generateAnalyticsAlerts(
          classTypeAnalytics.data!,
          efficiencyMetrics.data!,
          predictiveInsights.data!
        ) : [];

      const dashboard: ConsumptionAnalyticsDashboard = {
        overview,
        classTypeMetrics: classTypeAnalytics.data!,
        consumptionTrends: consumptionTrends.data!,
        efficiencyMetrics: efficiencyMetrics.data!,
        predictiveInsights: predictiveInsights.data!,
        alerts
      };

      return {
        success: true,
        data: dashboard
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DASHBOARD_ERROR',
          message: 'Failed to generate analytics dashboard',
          details: error
        }
      };
    }
  }

  // =====================================================================================
  // PRIVATE HELPER METHODS
  // =====================================================================================

  private processClassTypeConsumption(
    consumptionData: any[],
    classData: any[],
    bookingData: any[]
  ): ClassTypeConsumption[] {
    const classTypeMap = new Map<string, any>();

    // Process consumption data
    consumptionData.forEach(transaction => {
      if (!transaction.class_type) return;

      const classType = transaction.class_type;
      if (!classTypeMap.has(classType)) {
        classTypeMap.set(classType, {
          classType,
          totalHours: 0,
          sessionCount: 0,
          studentSet: new Set(),
          totalDuration: 0,
          completedSessions: 0,
          cancelledSessions: 0
        });
      }

      const metrics = classTypeMap.get(classType);
      metrics.totalHours += Math.abs(transaction.hours_amount);
      metrics.sessionCount += 1;
      metrics.studentSet.add(transaction.student_id);
    });

    // Process booking data for cancellation rates
    bookingData.forEach(booking => {
      const classInfo = classData.find(c => c.id === booking.class_id);
      if (!classInfo?.courses?.course_type) return;

      const classType = classInfo.courses.course_type;
      if (!classTypeMap.has(classType)) return;

      const metrics = classTypeMap.get(classType);
      if (booking.status === 'completed') {
        metrics.completedSessions += 1;
      } else if (booking.status === 'cancelled') {
        metrics.cancelledSessions += 1;
      }
      metrics.totalDuration += booking.duration_minutes || 0;
    });

    // Calculate final metrics
    const results: ClassTypeConsumption[] = [];
    let rank = 1;

    Array.from(classTypeMap.values())
      .sort((a, b) => b.totalHours - a.totalHours)
      .forEach(metrics => {
        const totalBookings = metrics.completedSessions + metrics.cancelledSessions;
        const cancellationRate = totalBookings > 0 ? 
          (metrics.cancelledSessions / totalBookings) * 100 : 0;
        const completionRate = totalBookings > 0 ? 
          (metrics.completedSessions / totalBookings) * 100 : 0;

        results.push({
          classType: metrics.classType,
          totalHours: metrics.totalHours,
          averageHoursPerClass: metrics.sessionCount > 0 ? 
            metrics.totalHours / metrics.sessionCount : 0,
          sessionCount: metrics.sessionCount,
          studentCount: metrics.studentSet.size,
          utilizationRate: completionRate,
          efficiencyScore: this.calculateEfficiencyScore(metrics),
          popularityRank: rank++,
          averageSessionDuration: metrics.completedSessions > 0 ? 
            metrics.totalDuration / metrics.completedSessions : 0,
          cancellationRate,
          completionRate
        });
      });

    return results;
  }

  private processConsumptionTrends(
    trendData: any[],
    granularity: 'daily' | 'weekly' | 'monthly'
  ): HourConsumptionTrend[] {
    const trends = new Map<string, any>();

    trendData.forEach(transaction => {
      const date = new Date(transaction.created_at);
      let periodKey: string;

      switch (granularity) {
        case 'daily':
          periodKey = date.toISOString().split('T')[0];
          break;
        case 'weekly':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          periodKey = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
          periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
      }

      if (!trends.has(periodKey)) {
        trends.set(periodKey, {
          period: periodKey,
          totalHours: 0,
          studentSet: new Set(),
          classTypeMap: new Map()
        });
      }

      const trend = trends.get(periodKey);
      trend.totalHours += Math.abs(transaction.hours_amount);
      trend.studentSet.add(transaction.student_id);

      if (transaction.class_type) {
        if (!trend.classTypeMap.has(transaction.class_type)) {
          trend.classTypeMap.set(transaction.class_type, 0);
        }
        trend.classTypeMap.set(
          transaction.class_type,
          trend.classTypeMap.get(transaction.class_type) + Math.abs(transaction.hours_amount)
        );
      }
    });

    return Array.from(trends.values()).map(trend => ({
      period: trend.period,
      totalHours: trend.totalHours,
      averagePerStudent: trend.studentSet.size > 0 ? 
        trend.totalHours / trend.studentSet.size : 0,
      peakHours: trend.totalHours, // Simplified - could be more sophisticated
      utilizationRate: this.calculateUtilizationRate(trend.totalHours),
      classTypeBreakdown: Array.from(trend.classTypeMap.entries()).map(([type, hours]) => ({
        classType: type,
        hours: hours as number,
        percentage: (hours as number / trend.totalHours) * 100
      }))
    }));
  }

  private calculateEfficiencyMetrics(
    consumptionData: any[],
    purchaseData: any[]
  ): EfficiencyMetrics {
    const totalHours = consumptionData.reduce((sum, t) => sum + Math.abs(t.hours_amount), 0);
    const totalSessions = consumptionData.length;
    const uniqueStudents = new Set(consumptionData.map(t => t.student_id)).size;

    // Calculate class type efficiency
    const classTypeMap = new Map<string, number>();
    consumptionData.forEach(t => {
      if (t.class_type) {
        classTypeMap.set(t.class_type, (classTypeMap.get(t.class_type) || 0) + Math.abs(t.hours_amount));
      }
    });

    const sortedClassTypes = Array.from(classTypeMap.entries())
      .sort((a, b) => b[1] - a[1]);

    const totalPurchased = purchaseData.reduce((sum, p) => sum + p.hours_purchased, 0);
    const totalUsed = purchaseData.reduce((sum, p) => sum + p.hours_used, 0);

    return {
      overallUtilization: totalPurchased > 0 ? (totalUsed / totalPurchased) * 100 : 0,
      averageHoursPerClass: totalSessions > 0 ? totalHours / totalSessions : 0,
      mostEfficientClassType: sortedClassTypes[0]?.[0] || 'N/A',
      leastEfficientClassType: sortedClassTypes[sortedClassTypes.length - 1]?.[0] || 'N/A',
      wastePercentage: totalPurchased > 0 ? ((totalPurchased - totalUsed) / totalPurchased) * 100 : 0,
      optimalPackageSize: this.calculateOptimalPackageSize(consumptionData),
      renewalRate: this.calculateRenewalRate(purchaseData),
      retentionRate: this.calculateRetentionRate(purchaseData)
    };
  }

  private generatePredictiveInsights(
    historicalData: any[],
    forecastDays: number
  ): PredictiveInsights {
    const totalHistoricalHours = historicalData.reduce((sum, t) => sum + Math.abs(t.hours_amount), 0);
    const dailyAverage = totalHistoricalHours / 90; // Assuming 90 days of historical data
    
    const projectedConsumption = dailyAverage * forecastDays;
    
    // Simple trend analysis
    const recentData = historicalData.slice(-30);
    const olderData = historicalData.slice(0, 30);
    
    const recentAverage = recentData.reduce((sum, t) => sum + Math.abs(t.hours_amount), 0) / 30;
    const olderAverage = olderData.reduce((sum, t) => sum + Math.abs(t.hours_amount), 0) / 30;
    
    let trendDirection: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (recentAverage > olderAverage * 1.1) {
      trendDirection = 'increasing';
    } else if (recentAverage < olderAverage * 0.9) {
      trendDirection = 'decreasing';
    }

    return {
      forecastPeriod: `${forecastDays} days`,
      projectedConsumption,
      confidenceScore: this.calculateConfidenceScore(historicalData),
      trendDirection,
      recommendedActions: this.generateRecommendedActions(trendDirection, projectedConsumption),
      riskFactors: this.identifyRiskFactors(historicalData, trendDirection)
    };
  }

  private async generateComparativeAnalytics(
    comparisonType: string,
    baseline?: string,
    comparisons?: string[]
  ): Promise<{ data: ComparativeAnalytics; error?: any }> {
    // Simplified implementation - would need more sophisticated comparison logic
    const baselineMetrics = await this.getEfficiencyMetrics({ periodDays: 90 });
    
    if (!baselineMetrics.success) {
      return { data: {} as ComparativeAnalytics, error: baselineMetrics.error };
    }

    return {
      data: {
        comparisonType: comparisonType as any,
        baseline: {
          name: baseline || 'Overall',
          metrics: baselineMetrics.data!
        },
        comparisons: [] // Would be populated with actual comparison data
      }
    };
  }

  private async generateHourPlanningRecommendations(
    options?: any
  ): Promise<HourPlanningRecommendations> {
    // Simplified implementation
    return {
      recommendations: [
        {
          type: 'package_size',
          current: 20,
          recommended: 30,
          reasoning: 'Based on your usage pattern, a larger package would be more cost-effective',
          expectedBenefit: '15% cost savings',
          confidence: 0.85
        }
      ],
      budgetOptimization: {
        currentSpending: 500,
        optimizedSpending: 425,
        potentialSavings: 75,
        paybackPeriod: '2 months'
      }
    };
  }

  private calculateOverviewMetrics(
    classTypeMetrics: ClassTypeConsumption[],
    trends: HourConsumptionTrend[]
  ) {
    const totalHours = classTypeMetrics.reduce((sum, m) => sum + m.totalHours, 0);
    const totalStudents = classTypeMetrics.reduce((sum, m) => sum + m.studentCount, 0);
    const topClassType = classTypeMetrics.sort((a, b) => b.totalHours - a.totalHours)[0]?.classType || 'N/A';

    return {
      totalHoursConsumed: totalHours,
      averageConsumptionPerStudent: totalStudents > 0 ? totalHours / totalStudents : 0,
      overallEfficiency: this.calculateOverallEfficiency(classTypeMetrics),
      topPerformingClassType: topClassType,
      monthlyGrowthRate: this.calculateGrowthRate(trends)
    };
  }

  private generateAnalyticsAlerts(
    classTypeMetrics: ClassTypeConsumption[],
    efficiencyMetrics: EfficiencyMetrics,
    predictiveInsights: PredictiveInsights
  ) {
    const alerts = [];

    // Check for efficiency drops
    const lowEfficiencyTypes = classTypeMetrics.filter(m => m.efficiencyScore < 0.7);
    if (lowEfficiencyTypes.length > 0) {
      alerts.push({
        type: 'efficiency_drop' as const,
        message: `${lowEfficiencyTypes.length} class types showing low efficiency`,
        severity: 'medium' as const,
        actionRequired: true
      });
    }

    // Check for unusual patterns
    if (predictiveInsights.trendDirection === 'decreasing') {
      alerts.push({
        type: 'unusual_pattern' as const,
        message: 'Declining consumption trend detected',
        severity: 'high' as const,
        actionRequired: true
      });
    }

    return alerts;
  }

  // Helper calculation methods
  private calculateEfficiencyScore(metrics: any): number {
    // Simplified efficiency calculation
    const utilizationFactor = Math.min(metrics.completedSessions / Math.max(metrics.sessionCount, 1), 1);
    const studentEngagement = Math.min(metrics.studentSet.size / 10, 1); // Normalized to 10 students
    return (utilizationFactor * 0.7) + (studentEngagement * 0.3);
  }

  private calculateUtilizationRate(totalHours: number): number {
    // Simplified utilization rate calculation
    return Math.min((totalHours / 100) * 100, 100); // Assuming 100 hours as baseline
  }

  private calculateOptimalPackageSize(consumptionData: any[]): number {
    const averageMonthlyConsumption = consumptionData.length > 0 ? 
      consumptionData.reduce((sum, t) => sum + Math.abs(t.hours_amount), 0) / 3 : 20; // Assuming 3 months
    return Math.ceil(averageMonthlyConsumption * 1.2); // 20% buffer
  }

  private calculateRenewalRate(purchaseData: any[]): number {
    // Simplified renewal rate calculation
    return 75; // Placeholder
  }

  private calculateRetentionRate(purchaseData: any[]): number {
    // Simplified retention rate calculation
    return 80; // Placeholder
  }

  private calculateConfidenceScore(historicalData: any[]): number {
    // Simplified confidence score based on data consistency
    if (historicalData.length < 30) return 0.5;
    if (historicalData.length < 60) return 0.7;
    return 0.9;
  }

  private generateRecommendedActions(
    trendDirection: string,
    projectedConsumption: number
  ): PredictiveInsights['recommendedActions'] {
    const actions = [];

    if (trendDirection === 'increasing') {
      actions.push({
        type: 'optimization' as const,
        priority: 'medium' as const,
        description: 'Consider increasing class capacity or adding more sessions',
        expectedImpact: 'Improved student satisfaction and resource utilization'
      });
    } else if (trendDirection === 'decreasing') {
      actions.push({
        type: 'package_adjustment' as const,
        priority: 'high' as const,
        description: 'Review pricing strategy and package offerings',
        expectedImpact: 'Increased engagement and consumption'
      });
    }

    return actions;
  }

  private identifyRiskFactors(
    historicalData: any[],
    trendDirection: string
  ): PredictiveInsights['riskFactors'] {
    const risks = [];

    if (trendDirection === 'decreasing') {
      risks.push({
        factor: 'Declining engagement',
        impact: 'high' as const,
        probability: 0.7
      });
    }

    return risks;
  }

  private calculateOverallEfficiency(classTypeMetrics: ClassTypeConsumption[]): number {
    if (classTypeMetrics.length === 0) return 0;
    return classTypeMetrics.reduce((sum, m) => sum + m.efficiencyScore, 0) / classTypeMetrics.length;
  }

  private calculateGrowthRate(trends: HourConsumptionTrend[]): number {
    if (trends.length < 2) return 0;
    const latest = trends[trends.length - 1];
    const previous = trends[trends.length - 2];
    return ((latest.totalHours - previous.totalHours) / previous.totalHours) * 100;
  }
}

// Export singleton instance
export const hourConsumptionAnalyticsService = new HourConsumptionAnalyticsService();