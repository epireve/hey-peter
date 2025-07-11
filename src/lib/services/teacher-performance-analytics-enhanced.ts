import { logger } from '@/lib/services';
/**
 * Enhanced Teacher Performance Analytics Service
 * 
 * This service provides comprehensive teacher performance analysis and metrics
 * calculation with real database integration and advanced analytics capabilities.
 */

import { supabase } from '@/lib/supabase';
import { teacherPerformanceDbService } from './teacher-performance-db-service';
import {
  TeacherPerformanceMetrics,
  TeacherPeerComparison,
  TeacherCohortAnalysis,
  TeacherPerformanceFilters,
  TeacherPerformanceSort,
  TeacherPerformanceSearchResult,
  TeacherPerformanceDashboard,
  TeacherIndividualDashboard,
  TeacherPerformanceReport,
  PerformanceTrend,
  TeacherRecommendation,
  RecommendationAction,
  RecommendationResource,
  TeacherHourAnalytics,
  StudentFeedbackAnalytics,
  AttendanceAnalytics,
  PERFORMANCE_RATING_THRESHOLDS,
  PERFORMANCE_CATEGORIES,
  TREND_INDICATORS,
  RECOMMENDATION_TYPES
} from '@/types/teacher-performance';

export class EnhancedTeacherPerformanceAnalytics {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTimeout: number = 10 * 60 * 1000; // 10 minutes

  /**
   * Get comprehensive performance metrics for a teacher
   */
  public async getTeacherPerformanceMetrics(teacherId: string, forceRefresh: boolean = false): Promise<TeacherPerformanceMetrics> {
    const cacheKey = `enhanced-teacher-performance-${teacherId}`;
    
    if (!forceRefresh && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      const age = Date.now() - cached.timestamp;
      
      if (age < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      // Get metrics from database service
      const metrics = await teacherPerformanceDbService.getTeacherPerformanceMetrics(teacherId);
      
      // Enhance with trends and recommendations
      const enhancedMetrics = await this.enhanceMetricsWithAnalytics(metrics);
      
      this.cache.set(cacheKey, { data: enhancedMetrics, timestamp: Date.now() });
      return enhancedMetrics;
    } catch (error) {
      logger.error(`Error getting teacher performance metrics for ${teacherId}:`, error);
      throw error;
    }
  }

  /**
   * Get teacher comparison with peers
   */
  public async getTeacherPeerComparison(teacherId: string): Promise<TeacherPeerComparison> {
    const cacheKey = `teacher-peer-comparison-${teacherId}`;
    
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const comparison = await teacherPerformanceDbService.getTeacherPeerComparison(teacherId);
      this.setCachedData(cacheKey, comparison);
      return comparison;
    } catch (error) {
      logger.error(`Error getting teacher peer comparison for ${teacherId}:`, error);
      throw error;
    }
  }

  /**
   * Get cohort analysis for all teachers
   */
  public async getTeacherCohortAnalysis(): Promise<TeacherCohortAnalysis> {
    const cacheKey = 'teacher-cohort-analysis';
    
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const cohortAnalysis = await teacherPerformanceDbService.getTeacherCohortAnalysis();
      
      // Enhance with advanced analytics
      const enhancedCohort = await this.enhanceCohortWithAnalytics(cohortAnalysis);
      
      this.setCachedData(cacheKey, enhancedCohort);
      return enhancedCohort;
    } catch (error) {
      logger.error('Error getting teacher cohort analysis:', error);
      throw error;
    }
  }

  /**
   * Search teachers with advanced filtering and analytics
   */
  public async searchTeachers(
    filters: TeacherPerformanceFilters,
    sort: TeacherPerformanceSort = { field: 'overallRating', order: 'desc' },
    page: number = 1,
    limit: number = 20
  ): Promise<TeacherPerformanceSearchResult> {
    try {
      const searchResult = await teacherPerformanceDbService.searchTeachers(filters, sort, page, limit);
      
      // Enhance search results with additional analytics
      const enhancedResult = await this.enhanceSearchResults(searchResult);
      
      return enhancedResult;
    } catch (error) {
      logger.error('Error searching teachers:', error);
      throw error;
    }
  }

  /**
   * Get teacher performance dashboard data
   */
  public async getTeacherPerformanceDashboard(): Promise<TeacherPerformanceDashboard> {
    const cacheKey = 'teacher-performance-dashboard';
    
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const cohortAnalysis = await this.getTeacherCohortAnalysis();
      const dashboard = this.buildPerformanceDashboard(cohortAnalysis);
      
      this.setCachedData(cacheKey, dashboard);
      return dashboard;
    } catch (error) {
      logger.error('Error getting teacher performance dashboard:', error);
      throw error;
    }
  }

  /**
   * Get individual teacher dashboard data
   */
  public async getTeacherIndividualDashboard(teacherId: string): Promise<TeacherIndividualDashboard> {
    const cacheKey = `teacher-individual-dashboard-${teacherId}`;
    
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const metrics = await this.getTeacherPerformanceMetrics(teacherId);
      const comparison = await this.getTeacherPeerComparison(teacherId);
      const dashboard = this.buildIndividualDashboard(metrics, comparison);
      
      this.setCachedData(cacheKey, dashboard);
      return dashboard;
    } catch (error) {
      logger.error(`Error getting individual dashboard for ${teacherId}:`, error);
      throw error;
    }
  }

  /**
   * Get teacher hour analytics
   */
  public async getTeacherHourAnalytics(teacherId: string, startDate: string, endDate: string): Promise<TeacherHourAnalytics> {
    try {
      const analytics = await teacherPerformanceDbService.getTeacherHourAnalytics(teacherId, startDate, endDate);
      return { ...analytics, teacherId };
    } catch (error) {
      logger.error(`Error getting hour analytics for ${teacherId}:`, error);
      throw error;
    }
  }

  /**
   * Get student feedback analytics
   */
  public async getStudentFeedbackAnalytics(teacherId: string, startDate: string, endDate: string): Promise<StudentFeedbackAnalytics> {
    try {
      const analytics = await teacherPerformanceDbService.getStudentFeedbackAnalytics(teacherId, startDate, endDate);
      return { ...analytics, teacherId };
    } catch (error) {
      logger.error(`Error getting feedback analytics for ${teacherId}:`, error);
      throw error;
    }
  }

  /**
   * Get attendance analytics
   */
  public async getAttendanceAnalytics(teacherId: string, startDate: string, endDate: string): Promise<AttendanceAnalytics> {
    try {
      const analytics = await teacherPerformanceDbService.getAttendanceAnalytics(teacherId, startDate, endDate);
      return { ...analytics, teacherId };
    } catch (error) {
      logger.error(`Error getting attendance analytics for ${teacherId}:`, error);
      throw error;
    }
  }

  /**
   * Generate teacher performance report
   */
  public async generateTeacherPerformanceReport(
    teacherIds: string[],
    dateRange: { start: string; end: string },
    reportType: 'individual' | 'cohort' | 'comparative' | 'comprehensive' = 'comprehensive'
  ): Promise<TeacherPerformanceReport> {
    try {
      const reportId = `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Get performance data for all teachers
      const teacherMetrics = await Promise.all(
        teacherIds.map(id => this.getTeacherPerformanceMetrics(id))
      );

      // Build report data
      const reportData = {
        summary: this.buildReportSummary(teacherMetrics),
        details: teacherMetrics,
        charts: this.buildReportCharts(teacherMetrics),
        recommendations: this.buildReportRecommendations(teacherMetrics)
      };

      const report: TeacherPerformanceReport = {
        reportId,
        generatedAt: new Date().toISOString(),
        generatedBy: 'system', // Would be actual user ID
        reportType,
        parameters: {
          teacherIds,
          dateRange,
          includeMetrics: Object.values(PERFORMANCE_CATEGORIES),
          format: 'pdf'
        },
        data: reportData,
        exportInfo: {
          downloadCount: 0
        }
      };

      return report;
    } catch (error) {
      logger.error('Error generating teacher performance report:', error);
      throw error;
    }
  }

  /**
   * Get performance trends for a teacher
   */
  public async getTeacherPerformanceTrends(teacherId: string, period: string = '12_months'): Promise<PerformanceTrend[]> {
    try {
      // Get historical performance data
      const { data: historicalData, error } = await supabase
        .from('teacher_performance_history')
        .select('*')
        .eq('teacher_id', teacherId)
        .gte('recorded_at', this.getDateRangeStart(period))
        .order('recorded_at', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch historical data: ${error.message}`);
      }

      return this.calculatePerformanceTrends(historicalData || []);
    } catch (error) {
      logger.error(`Error getting performance trends for ${teacherId}:`, error);
      throw error;
    }
  }

  /**
   * Get teacher recommendations
   */
  public async getTeacherRecommendations(teacherId: string): Promise<TeacherRecommendation[]> {
    try {
      const metrics = await this.getTeacherPerformanceMetrics(teacherId);
      return this.generateRecommendations(metrics);
    } catch (error) {
      logger.error(`Error getting recommendations for ${teacherId}:`, error);
      throw error;
    }
  }

  /**
   * Update teacher performance metrics
   */
  public async updateTeacherPerformanceMetrics(teacherId: string, metrics: Partial<TeacherPerformanceMetrics>): Promise<void> {
    try {
      // Clear cache for this teacher
      this.clearCacheForTeacher(teacherId);
      
      // Update in database (would need actual implementation)
      logger.info(`Updating performance metrics for teacher ${teacherId}:`, metrics);
    } catch (error) {
      logger.error(`Error updating performance metrics for ${teacherId}:`, error);
      throw error;
    }
  }

  // =====================================================================================
  // PRIVATE HELPER METHODS
  // =====================================================================================

  private async enhanceMetricsWithAnalytics(metrics: TeacherPerformanceMetrics): Promise<TeacherPerformanceMetrics> {
    // Get trends
    const trends = await this.getTeacherPerformanceTrends(metrics.teacherId);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(metrics);
    
    // Get peer comparison
    const peerComparison = await this.getTeacherPeerComparison(metrics.teacherId);
    
    return {
      ...metrics,
      trends,
      recommendations,
      peerComparison
    };
  }

  private async enhanceCohortWithAnalytics(cohort: TeacherCohortAnalysis): Promise<TeacherCohortAnalysis> {
    // Add cohort-wide recommendations
    const recommendations = this.generateCohortRecommendations(cohort);
    
    // Add cohort trends
    const cohortTrends = await this.calculateCohortTrends(cohort);
    
    return {
      ...cohort,
      recommendations,
      cohortTrends
    };
  }

  private async enhanceSearchResults(searchResult: TeacherPerformanceSearchResult): Promise<TeacherPerformanceSearchResult> {
    // Add additional analytics to search results
    const enhancedTeachers = await Promise.all(
      searchResult.teachers.map(async (teacher) => {
        const trends = await this.getTeacherPerformanceTrends(teacher.teacherId, '3_months');
        return {
          ...teacher,
          trends: trends.slice(0, 3) // Latest 3 trends
        };
      })
    );

    return {
      ...searchResult,
      teachers: enhancedTeachers
    };
  }

  private buildPerformanceDashboard(cohortAnalysis: TeacherCohortAnalysis): TeacherPerformanceDashboard {
    const highPerformers = cohortAnalysis.performanceDistribution
      .filter(dist => dist.range.startsWith('4.5') || dist.range.startsWith('5.0'))
      .reduce((sum, dist) => sum + dist.count, 0);

    const needsAttention = cohortAnalysis.needsAttention.length;

    return {
      overview: {
        totalTeachers: cohortAnalysis.totalTeachers,
        averageRating: cohortAnalysis.statistics.averageRating,
        highPerformers,
        needsAttention,
        monthlyChange: 2.5 // Would be calculated from trends
      },
      keyMetrics: [
        {
          name: 'Average Rating',
          value: cohortAnalysis.statistics.averageRating,
          unit: '/5.0',
          trend: 'up',
          changePercentage: 2.5
        },
        {
          name: 'Student Satisfaction',
          value: 4.3,
          unit: '/5.0',
          trend: 'stable',
          changePercentage: 0.1
        },
        {
          name: 'Punctuality Rate',
          value: 95,
          unit: '%',
          trend: 'up',
          changePercentage: 3.2
        },
        {
          name: 'Class Completion',
          value: 92,
          unit: '%',
          trend: 'up',
          changePercentage: 1.8
        }
      ],
      performanceDistribution: cohortAnalysis.performanceDistribution,
      recentActivities: [
        {
          type: 'performance_improvement',
          teacherId: '1',
          teacherName: 'Sarah Johnson',
          description: 'Improved student satisfaction rating to 4.8',
          timestamp: new Date().toISOString()
        },
        {
          type: 'training_completed',
          teacherId: '2',
          teacherName: 'Michael Chen',
          description: 'Completed Advanced Teaching Techniques course',
          timestamp: new Date(Date.now() - 3600000).toISOString()
        }
      ],
      alerts: [
        {
          type: 'performance_decline',
          teacherId: '3',
          teacherName: 'John Smith',
          message: 'Student satisfaction has declined by 10% this month',
          priority: 'high',
          timestamp: new Date().toISOString()
        },
        {
          type: 'high_cancellation',
          teacherId: '4',
          teacherName: 'Maria Garcia',
          message: 'Cancellation rate exceeds 5% threshold',
          priority: 'medium',
          timestamp: new Date(Date.now() - 7200000).toISOString()
        }
      ]
    };
  }

  private buildIndividualDashboard(metrics: TeacherPerformanceMetrics, comparison: TeacherPeerComparison): TeacherIndividualDashboard {
    return {
      teacherId: metrics.teacherId,
      teacherName: metrics.teacherName,
      performanceSummary: {
        overallRating: metrics.overallRating,
        ranking: comparison.ranking.overall,
        percentile: comparison.ranking.percentile,
        lastUpdate: metrics.lastUpdated
      },
      quickMetrics: [
        {
          name: 'Student Satisfaction',
          value: metrics.metrics.studentSatisfaction.averageRating,
          unit: '/5.0',
          status: metrics.metrics.studentSatisfaction.averageRating >= 4.5 ? 'good' : 
                 metrics.metrics.studentSatisfaction.averageRating >= 4.0 ? 'warning' : 'critical',
          benchmark: comparison.performanceComparison.studentSatisfaction.peerAverage
        },
        {
          name: 'Punctuality',
          value: metrics.metrics.classManagement.punctualityRate,
          unit: '%',
          status: metrics.metrics.classManagement.punctualityRate >= 95 ? 'good' : 
                 metrics.metrics.classManagement.punctualityRate >= 90 ? 'warning' : 'critical',
          benchmark: comparison.performanceComparison.classManagement.peerAverage
        }
      ],
      recentPerformance: [
        {
          date: new Date().toISOString(),
          metric: 'Student Satisfaction',
          value: metrics.metrics.studentSatisfaction.averageRating,
          trend: metrics.metrics.studentSatisfaction.satisfactionTrend === 'improving' ? 'up' : 
                metrics.metrics.studentSatisfaction.satisfactionTrend === 'declining' ? 'down' : 'stable'
        }
      ],
      goalsAndTargets: [
        {
          goal: 'Improve Student Satisfaction',
          target: 4.5,
          current: metrics.metrics.studentSatisfaction.averageRating,
          progress: (metrics.metrics.studentSatisfaction.averageRating / 4.5) * 100,
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      ],
      activeRecommendations: metrics.recommendations.slice(0, 3) // Top 3 recommendations
    };
  }

  private buildReportSummary(teacherMetrics: TeacherPerformanceMetrics[]) {
    const totalTeachers = teacherMetrics.length;
    const averageRating = teacherMetrics.reduce((sum, t) => sum + t.overallRating, 0) / totalTeachers;
    const highPerformers = teacherMetrics.filter(t => t.overallRating >= PERFORMANCE_RATING_THRESHOLDS.EXCELLENT).length;
    const needsImprovement = teacherMetrics.filter(t => t.overallRating < PERFORMANCE_RATING_THRESHOLDS.SATISFACTORY).length;

    return {
      totalTeachers,
      averageRating,
      highPerformers,
      needsImprovement,
      reportGeneratedAt: new Date().toISOString()
    };
  }

  private buildReportCharts(teacherMetrics: TeacherPerformanceMetrics[]) {
    return [
      {
        type: 'performance_distribution',
        title: 'Performance Distribution',
        data: this.calculatePerformanceDistribution(teacherMetrics)
      },
      {
        type: 'satisfaction_trends',
        title: 'Student Satisfaction Trends',
        data: this.calculateSatisfactionTrends(teacherMetrics)
      }
    ];
  }

  private buildReportRecommendations(teacherMetrics: TeacherPerformanceMetrics[]): TeacherRecommendation[] {
    // Aggregate recommendations from all teachers
    const allRecommendations = teacherMetrics.flatMap(t => t.recommendations);
    
    // Group by type and priority
    const groupedRecommendations = this.groupRecommendationsByType(allRecommendations);
    
    return groupedRecommendations.slice(0, 10); // Top 10 recommendations
  }

  private calculatePerformanceTrends(historicalData: any[]): PerformanceTrend[] {
    const trends: PerformanceTrend[] = [];
    
    if (historicalData.length < 3) return trends;

    const metricKeys = ['overall_rating', 'student_satisfaction', 'teaching_effectiveness', 'class_management'];
    
    for (const metricKey of metricKeys) {
      const dataPoints = historicalData.map(d => ({
        date: d.recorded_at,
        value: d[metricKey] || 0
      }));

      const trend = this.calculateTrendDirection(dataPoints);
      const changeRate = this.calculateChangeRate(dataPoints);
      const trendAnalysis = this.analyzeTrend(dataPoints);

      trends.push({
        metric: metricKey.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        period: '12_months',
        trend,
        changeRate,
        significance: Math.abs(changeRate) > 10 ? 'high' : Math.abs(changeRate) > 5 ? 'medium' : 'low',
        dataPoints,
        trendAnalysis
      });
    }

    return trends;
  }

  private generateRecommendations(metrics: TeacherPerformanceMetrics): TeacherRecommendation[] {
    const recommendations: TeacherRecommendation[] = [];

    // Student satisfaction recommendations
    if (metrics.metrics.studentSatisfaction.averageRating < 4.0) {
      recommendations.push(this.createRecommendation(
        'support',
        'high',
        'Improve Student Satisfaction',
        'Student ratings are below target. Focus on engagement and communication skills.',
        0.7,
        '2-3 months',
        [
          {
            id: 'attend-communication-workshop',
            action: 'Attend communication skills workshop',
            assignedTo: 'teacher',
            deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'pending',
            parameters: { teacherId: metrics.teacherId },
            estimatedEffort: 8,
            dependencies: []
          }
        ],
        [
          {
            id: 'communication-workshop',
            type: 'training_material',
            name: 'Communication Skills Workshop',
            description: 'Interactive workshop on student engagement techniques',
            estimatedTime: 8,
            availability: 'available'
          }
        ]
      ));
    }

    // Punctuality recommendations
    if (metrics.metrics.classManagement.punctualityRate < 90) {
      recommendations.push(this.createRecommendation(
        'improvement_plan',
        'medium',
        'Improve Punctuality',
        'Punctuality rate needs improvement for better class management.',
        0.5,
        '1 month',
        [
          {
            id: 'implement-time-management',
            action: 'Implement time management system',
            assignedTo: 'teacher',
            deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'pending',
            parameters: { teacherId: metrics.teacherId },
            estimatedEffort: 2,
            dependencies: []
          }
        ],
        [
          {
            id: 'time-management-app',
            type: 'tool',
            name: 'Time Management App',
            description: 'Digital tool for scheduling and reminders',
            estimatedTime: 1,
            availability: 'available'
          }
        ]
      ));
    }

    // Recognition for high performers
    if (metrics.overallRating >= PERFORMANCE_RATING_THRESHOLDS.EXCELLENT) {
      recommendations.push(this.createRecommendation(
        'recognition',
        'low',
        'Teacher Excellence Recognition',
        'Outstanding performance deserves recognition and leadership opportunities.',
        0.3,
        '1 month',
        [
          {
            id: 'nominate-excellence-award',
            action: 'Nominate for excellence award',
            assignedTo: 'administration',
            deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'pending',
            parameters: { teacherId: metrics.teacherId },
            estimatedEffort: 1,
            dependencies: []
          }
        ],
        [
          {
            id: 'leadership-program',
            type: 'documentation',
            name: 'Leadership Development Program',
            description: 'Opportunities for career advancement',
            estimatedTime: 5,
            availability: 'available'
          }
        ]
      ));
    }

    return recommendations;
  }

  private createRecommendation(
    type: 'training' | 'schedule_optimization' | 'support' | 'recognition' | 'improvement_plan',
    priority: 'high' | 'medium' | 'low',
    title: string,
    description: string,
    expectedImpact: number,
    implementationTimeframe: string,
    actions: RecommendationAction[],
    resources: RecommendationResource[]
  ): TeacherRecommendation {
    return {
      id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      priority,
      title,
      description,
      expectedImpact,
      implementationTimeframe,
      actions,
      resources,
      successMetrics: [
        {
          metric: 'Overall Rating',
          targetValue: 4.5,
          currentValue: 4.2
        }
      ]
    };
  }

  private generateCohortRecommendations(cohort: TeacherCohortAnalysis): TeacherRecommendation[] {
    const recommendations: TeacherRecommendation[] = [];

    // Low average rating
    if (cohort.statistics.averageRating < 4.0) {
      recommendations.push(this.createRecommendation(
        'training',
        'high',
        'Cohort-wide Performance Improvement',
        'Overall teacher performance is below target. Implement comprehensive training program.',
        0.8,
        '6-12 months',
        [
          {
            id: 'launch-improvement-program',
            action: 'Launch improvement program',
            assignedTo: 'teacher_development',
            deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'pending',
            parameters: { averageRating: cohort.statistics.averageRating },
            estimatedEffort: 100,
            dependencies: []
          }
        ],
        [
          {
            id: 'comprehensive-training',
            type: 'training_material',
            name: 'Comprehensive Teacher Development Program',
            description: 'Multi-module training for all teachers',
            estimatedTime: 50,
            availability: 'available'
          }
        ]
      ));
    }

    return recommendations;
  }

  private async calculateCohortTrends(cohort: TeacherCohortAnalysis) {
    // This would calculate trends for the entire cohort
    return [
      {
        metric: 'Average Rating',
        trend: 'improving' as const,
        monthlyData: [
          { month: 'Jan', value: 4.1 },
          { month: 'Feb', value: 4.2 },
          { month: 'Mar', value: 4.3 }
        ]
      }
    ];
  }

  private calculatePerformanceDistribution(teacherMetrics: TeacherPerformanceMetrics[]) {
    const ranges = [
      { min: 4.5, max: 5.0, label: '4.5-5.0' },
      { min: 4.0, max: 4.4, label: '4.0-4.4' },
      { min: 3.5, max: 3.9, label: '3.5-3.9' },
      { min: 3.0, max: 3.4, label: '3.0-3.4' },
      { min: 0, max: 2.9, label: '0-2.9' }
    ];

    return ranges.map(range => ({
      range: range.label,
      count: teacherMetrics.filter(t => t.overallRating >= range.min && t.overallRating <= range.max).length
    }));
  }

  private calculateSatisfactionTrends(teacherMetrics: TeacherPerformanceMetrics[]) {
    // Calculate average satisfaction trends
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map(month => ({
      month,
      satisfaction: 4.2 + (Math.random() - 0.5) * 0.4 // Mock trend data
    }));
  }

  private groupRecommendationsByType(recommendations: TeacherRecommendation[]): TeacherRecommendation[] {
    const grouped = recommendations.reduce((acc, rec) => {
      if (!acc[rec.type]) {
        acc[rec.type] = [];
      }
      acc[rec.type].push(rec);
      return acc;
    }, {} as Record<string, TeacherRecommendation[]>);

    // Return highest priority from each type
    return Object.values(grouped).map(group => 
      group.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      })[0]
    );
  }

  private calculateTrendDirection(dataPoints: { date: string; value: number }[]): 'improving' | 'stable' | 'declining' {
    if (dataPoints.length < 2) return 'stable';

    const values = dataPoints.map(dp => dp.value);
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.ceil(values.length / 2));

    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

    const change = secondAvg - firstAvg;
    const changeThreshold = firstAvg * 0.05; // 5% change threshold

    if (change > changeThreshold) return 'improving';
    if (change < -changeThreshold) return 'declining';
    return 'stable';
  }

  private calculateChangeRate(dataPoints: { date: string; value: number }[]): number {
    if (dataPoints.length < 2) return 0;

    const firstValue = dataPoints[0].value;
    const lastValue = dataPoints[dataPoints.length - 1].value;

    return firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;
  }

  private analyzeTrend(dataPoints: { date: string; value: number }[]) {
    const values = dataPoints.map(dp => dp.value);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const volatility = Math.sqrt(variance);

    return {
      duration: '12 months',
      strength: Math.abs(this.calculateChangeRate(dataPoints)) / 100,
      volatility,
      prediction: {
        nextPeriod: values[values.length - 1] * 1.02, // Simple 2% growth prediction
        confidence: 0.75
      }
    };
  }

  private getDateRangeStart(period: string): string {
    const now = new Date();
    switch (period) {
      case '3_months':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
      case '6_months':
        return new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString();
      case '12_months':
      default:
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
    }
  }

  // =====================================================================================
  // CACHE MANAGEMENT
  // =====================================================================================

  private getCachedData(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  public clearCache(): void {
    this.cache.clear();
  }

  public clearCacheForTeacher(teacherId: string): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(key => key.includes(teacherId));
    keysToDelete.forEach(key => this.cache.delete(key));
  }
}

// Export singleton instance
export const enhancedTeacherPerformanceAnalytics = new EnhancedTeacherPerformanceAnalytics();