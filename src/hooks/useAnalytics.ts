import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  analyticsAggregationService,
  type DateRange,
  type DateRangeType,
  type StudentMetrics,
  type TeacherMetrics,
  type OperationalMetrics,
  type SystemHealthMetrics,
} from '@/lib/services/analytics-aggregation-service';

export interface AnalyticsFilters {
  dateRange: DateRange;
  studentIds?: string[];
  teacherIds?: string[];
  courseIds?: string[];
  classTypes?: string[];
  includeInactive?: boolean;
}

export interface DashboardMetrics {
  students: StudentMetrics;
  teachers: TeacherMetrics;
  operational: OperationalMetrics;
  systemHealth: SystemHealthMetrics;
}

export interface AnalyticsChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
    fill?: boolean;
  }>;
}

export interface PerformanceInsights {
  trends: {
    studentGrowth: {
      current: number;
      previous: number;
      changePercent: number;
      trend: 'up' | 'down' | 'stable';
    };
    teacherUtilization: {
      current: number;
      previous: number;
      changePercent: number;
      trend: 'up' | 'down' | 'stable';
    };
    classAttendance: {
      current: number;
      previous: number;
      changePercent: number;
      trend: 'up' | 'down' | 'stable';
    };
  };
  recommendations: Array<{
    id: string;
    category: 'students' | 'teachers' | 'operations' | 'system';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    actionItems: string[];
    expectedImpact: string;
  }>;
  alerts: Array<{
    id: string;
    type: 'warning' | 'error' | 'info';
    title: string;
    message: string;
    timestamp: string;
    actionRequired: boolean;
  }>;
}

export interface UseAnalyticsReturn {
  // Data
  dashboardMetrics: DashboardMetrics | null;
  studentMetrics: StudentMetrics | null;
  teacherMetrics: TeacherMetrics | null;
  operationalMetrics: OperationalMetrics | null;
  systemHealthMetrics: SystemHealthMetrics | null;
  performanceInsights: PerformanceInsights | null;
  
  // Loading states
  loading: boolean;
  studentMetricsLoading: boolean;
  teacherMetricsLoading: boolean;
  operationalMetricsLoading: boolean;
  systemHealthLoading: boolean;
  insightsLoading: boolean;
  
  // Error states
  error: Error | null;
  studentMetricsError: Error | null;
  teacherMetricsError: Error | null;
  operationalMetricsError: Error | null;
  systemHealthError: Error | null;
  insightsError: Error | null;
  
  // Filters
  filters: AnalyticsFilters;
  
  // Actions
  setFilters: (filters: AnalyticsFilters) => void;
  setDateRange: (type: DateRangeType, customStart?: Date, customEnd?: Date) => void;
  refreshAllMetrics: () => Promise<void>;
  refreshStudentMetrics: () => Promise<void>;
  refreshTeacherMetrics: () => Promise<void>;
  refreshOperationalMetrics: () => Promise<void>;
  refreshSystemHealth: () => Promise<void>;
  refreshInsights: () => Promise<void>;
  
  // Chart data generators
  getStudentEnrollmentChart: (period: 'week' | 'month' | 'quarter') => AnalyticsChartData;
  getAttendanceChart: (period: 'week' | 'month' | 'quarter') => AnalyticsChartData;
  getTeacherUtilizationChart: () => AnalyticsChartData;
  getClassDistributionChart: () => AnalyticsChartData;
  getRevenueChart: (period: 'week' | 'month' | 'quarter') => AnalyticsChartData;
  getPerformanceComparisonChart: () => AnalyticsChartData;
  
  // Exporters
  exportAnalyticsReport: (format: 'pdf' | 'excel') => Promise<{ success: boolean; url?: string; error?: string }>;
  exportChartData: (chartType: string, format: 'csv' | 'excel') => Promise<{ success: boolean; url?: string; error?: string }>;
  
  // Utilities
  calculateTrend: (current: number, previous: number) => { changePercent: number; trend: 'up' | 'down' | 'stable' };
  formatMetricValue: (value: number, type: 'percentage' | 'currency' | 'number' | 'hours') => string;
  getMetricColor: (value: number, type: 'percentage' | 'rating' | 'utilization') => string;
  
  // Comparisons
  compareMetrics: (current: StudentMetrics | TeacherMetrics, previous: StudentMetrics | TeacherMetrics) => any;
  getHistoricalData: (metric: string, period: 'week' | 'month' | 'quarter' | 'year') => Promise<Array<{ date: string; value: number }>>;
  
  // Real-time updates
  subscribeToUpdates: (callback: (metrics: DashboardMetrics) => void) => () => void;
  enableRealTimeUpdates: () => void;
  disableRealTimeUpdates: () => void;
}

const QUERY_KEYS = {
  dashboardMetrics: 'dashboard-metrics',
  studentMetrics: 'student-metrics',
  teacherMetrics: 'teacher-metrics',
  operationalMetrics: 'operational-metrics',
  systemHealth: 'system-health',
  insights: 'performance-insights',
} as const;

export const useAnalytics = (initialFilters?: Partial<AnalyticsFilters>): UseAnalyticsReturn => {
  const queryClient = useQueryClient();
  
  // State
  const [filters, setFiltersState] = useState<AnalyticsFilters>({
    dateRange: analyticsAggregationService.getDateRange('last_30_days'),
    studentIds: initialFilters?.studentIds,
    teacherIds: initialFilters?.teacherIds,
    courseIds: initialFilters?.courseIds,
    classTypes: initialFilters?.classTypes,
    includeInactive: initialFilters?.includeInactive || false,
  });

  // Student metrics query
  const {
    data: studentMetrics,
    isLoading: studentMetricsLoading,
    error: studentMetricsError,
    refetch: refetchStudentMetrics,
  } = useQuery({
    queryKey: [QUERY_KEYS.studentMetrics, filters],
    queryFn: async () => {
      return await analyticsAggregationService.getStudentMetrics(filters.dateRange);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  // Teacher metrics query
  const {
    data: teacherMetrics,
    isLoading: teacherMetricsLoading,
    error: teacherMetricsError,
    refetch: refetchTeacherMetrics,
  } = useQuery({
    queryKey: [QUERY_KEYS.teacherMetrics, filters],
    queryFn: async () => {
      return await analyticsAggregationService.getTeacherMetrics(filters.dateRange);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  // Operational metrics query
  const {
    data: operationalMetrics,
    isLoading: operationalMetricsLoading,
    error: operationalMetricsError,
    refetch: refetchOperationalMetrics,
  } = useQuery({
    queryKey: [QUERY_KEYS.operationalMetrics, filters],
    queryFn: async () => {
      return await analyticsAggregationService.getOperationalMetrics(filters.dateRange);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  // System health query
  const {
    data: systemHealthMetrics,
    isLoading: systemHealthLoading,
    error: systemHealthError,
    refetch: refetchSystemHealth,
  } = useQuery({
    queryKey: [QUERY_KEYS.systemHealth],
    queryFn: async () => {
      return await analyticsAggregationService.getSystemHealthMetrics();
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    cacheTime: 3 * 60 * 1000, // 3 minutes
  });

  // Performance insights query
  const {
    data: performanceInsights,
    isLoading: insightsLoading,
    error: insightsError,
    refetch: refetchInsights,
  } = useQuery({
    queryKey: [QUERY_KEYS.insights, filters],
    queryFn: async () => {
      return await generatePerformanceInsights(
        studentMetrics,
        teacherMetrics,
        operationalMetrics,
        systemHealthMetrics
      );
    },
    enabled: !!(studentMetrics && teacherMetrics && operationalMetrics && systemHealthMetrics),
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  });

  // Derived state
  const dashboardMetrics: DashboardMetrics | null = 
    studentMetrics && teacherMetrics && operationalMetrics && systemHealthMetrics
      ? {
          students: studentMetrics,
          teachers: teacherMetrics,
          operational: operationalMetrics,
          systemHealth: systemHealthMetrics,
        }
      : null;

  const loading = studentMetricsLoading || teacherMetricsLoading || operationalMetricsLoading || systemHealthLoading;
  const error = studentMetricsError || teacherMetricsError || operationalMetricsError || systemHealthError;

  // Actions
  const setFilters = useCallback((newFilters: AnalyticsFilters) => {
    setFiltersState(newFilters);
  }, []);

  const setDateRange = useCallback((type: DateRangeType, customStart?: Date, customEnd?: Date) => {
    const dateRange = analyticsAggregationService.getDateRange(type, customStart, customEnd);
    setFiltersState(prev => ({ ...prev, dateRange }));
  }, []);

  const refreshAllMetrics = useCallback(async () => {
    await Promise.all([
      refetchStudentMetrics(),
      refetchTeacherMetrics(),
      refetchOperationalMetrics(),
      refetchSystemHealth(),
    ]);
  }, [refetchStudentMetrics, refetchTeacherMetrics, refetchOperationalMetrics, refetchSystemHealth]);

  const refreshStudentMetrics = useCallback(async () => {
    await refetchStudentMetrics();
  }, [refetchStudentMetrics]);

  const refreshTeacherMetrics = useCallback(async () => {
    await refetchTeacherMetrics();
  }, [refetchTeacherMetrics]);

  const refreshOperationalMetrics = useCallback(async () => {
    await refetchOperationalMetrics();
  }, [refetchOperationalMetrics]);

  const refreshSystemHealth = useCallback(async () => {
    await refetchSystemHealth();
  }, [refetchSystemHealth]);

  const refreshInsights = useCallback(async () => {
    await refetchInsights();
  }, [refetchInsights]);

  // Chart data generators
  const getStudentEnrollmentChart = useCallback((period: 'week' | 'month' | 'quarter'): AnalyticsChartData => {
    if (!studentMetrics) return { labels: [], datasets: [] };
    
    // Generate mock data - in real implementation, this would use historical data
    const labels = generatePeriodLabels(period);
    const data = generateMockTimeSeriesData(labels.length, studentMetrics.newEnrollments);
    
    return {
      labels,
      datasets: [{
        label: 'Student Enrollments',
        data,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
        fill: true,
      }]
    };
  }, [studentMetrics]);

  const getAttendanceChart = useCallback((period: 'week' | 'month' | 'quarter'): AnalyticsChartData => {
    if (!studentMetrics) return { labels: [], datasets: [] };
    
    const labels = generatePeriodLabels(period);
    const attendanceData = generateMockTimeSeriesData(labels.length, studentMetrics.attendanceRate);
    const noShowData = generateMockTimeSeriesData(labels.length, studentMetrics.noShowRate);
    
    return {
      labels,
      datasets: [
        {
          label: 'Attendance Rate',
          data: attendanceData,
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderColor: 'rgba(34, 197, 94, 1)',
          borderWidth: 1,
        },
        {
          label: 'No Show Rate',
          data: noShowData,
          backgroundColor: 'rgba(239, 68, 68, 0.8)',
          borderColor: 'rgba(239, 68, 68, 1)',
          borderWidth: 1,
        }
      ]
    };
  }, [studentMetrics]);

  const getTeacherUtilizationChart = useCallback((): AnalyticsChartData => {
    if (!teacherMetrics) return { labels: [], datasets: [] };
    
    const topTeachers = teacherMetrics.topPerformers || [];
    const labels = topTeachers.map(teacher => teacher.name);
    const utilizationData = topTeachers.map(teacher => teacher.hoursThisMonth);
    
    return {
      labels,
      datasets: [{
        label: 'Hours This Month',
        data: utilizationData,
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 205, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
        ],
        borderWidth: 1,
      }]
    };
  }, [teacherMetrics]);

  const getClassDistributionChart = useCallback((): AnalyticsChartData => {
    if (!operationalMetrics) return { labels: [], datasets: [] };
    
    const courses = operationalMetrics.courseRankings || [];
    const labels = courses.map(course => course.courseName);
    const enrollmentData = courses.map(course => course.enrollmentCount);
    
    return {
      labels,
      datasets: [{
        label: 'Enrollments',
        data: enrollmentData,
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 205, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
        ],
        borderWidth: 1,
      }]
    };
  }, [operationalMetrics]);

  const getRevenueChart = useCallback((period: 'week' | 'month' | 'quarter'): AnalyticsChartData => {
    // Mock revenue data - in real implementation, this would come from payment data
    const labels = generatePeriodLabels(period);
    const revenueData = generateMockTimeSeriesData(labels.length, 10000, 50000);
    
    return {
      labels,
      datasets: [{
        label: 'Revenue',
        data: revenueData,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 2,
        fill: true,
      }]
    };
  }, []);

  const getPerformanceComparisonChart = useCallback((): AnalyticsChartData => {
    if (!studentMetrics || !teacherMetrics) return { labels: [], datasets: [] };
    
    return {
      labels: ['Attendance', 'Completion', 'Satisfaction', 'Utilization'],
      datasets: [{
        label: 'Performance Metrics',
        data: [
          studentMetrics.attendanceRate,
          studentMetrics.completionRate,
          85, // Mock satisfaction rate
          teacherMetrics.utilizationRate,
        ],
        backgroundColor: 'rgba(139, 92, 246, 0.8)',
        borderColor: 'rgba(139, 92, 246, 1)',
        borderWidth: 1,
      }]
    };
  }, [studentMetrics, teacherMetrics]);

  // Exporters
  const exportAnalyticsReport = useCallback(async (format: 'pdf' | 'excel') => {
    try {
      // Mock export - in real implementation, this would generate actual reports
      const filename = `analytics-report-${new Date().toISOString().split('T')[0]}.${format}`;
      return { success: true, url: `/exports/${filename}` };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Export failed' };
    }
  }, []);

  const exportChartData = useCallback(async (chartType: string, format: 'csv' | 'excel') => {
    try {
      // Mock export - in real implementation, this would export chart data
      const filename = `${chartType}-data-${new Date().toISOString().split('T')[0]}.${format}`;
      return { success: true, url: `/exports/${filename}` };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Export failed' };
    }
  }, []);

  // Utilities
  const calculateTrend = useCallback((current: number, previous: number) => {
    const changePercent = previous === 0 ? 0 : ((current - previous) / previous) * 100;
    const trend = Math.abs(changePercent) < 1 ? 'stable' : changePercent > 0 ? 'up' : 'down';
    return { changePercent, trend };
  }, []);

  const formatMetricValue = useCallback((value: number, type: 'percentage' | 'currency' | 'number' | 'hours') => {
    switch (type) {
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'currency':
        return `$${value.toLocaleString()}`;
      case 'hours':
        return `${value.toFixed(1)}h`;
      case 'number':
      default:
        return value.toLocaleString();
    }
  }, []);

  const getMetricColor = useCallback((value: number, type: 'percentage' | 'rating' | 'utilization') => {
    switch (type) {
      case 'percentage':
        return value >= 80 ? 'green' : value >= 60 ? 'yellow' : 'red';
      case 'rating':
        return value >= 4.5 ? 'green' : value >= 3.5 ? 'yellow' : 'red';
      case 'utilization':
        return value >= 85 ? 'green' : value >= 70 ? 'yellow' : 'red';
      default:
        return 'gray';
    }
  }, []);

  // Comparisons
  const compareMetrics = useCallback((current: any, previous: any) => {
    if (!current || !previous) return null;
    
    const comparison: any = {};
    
    Object.keys(current).forEach(key => {
      if (typeof current[key] === 'number' && typeof previous[key] === 'number') {
        comparison[key] = calculateTrend(current[key], previous[key]);
      }
    });
    
    return comparison;
  }, [calculateTrend]);

  const getHistoricalData = useCallback(async (metric: string, period: 'week' | 'month' | 'quarter' | 'year') => {
    try {
      // Mock historical data - in real implementation, this would fetch from database
      const labels = generatePeriodLabels(period);
      const data = generateMockTimeSeriesData(labels.length, 100);
      
      return labels.map((label, index) => ({
        date: label,
        value: data[index]
      }));
    } catch (error) {
      console.error('Error fetching historical data:', error);
      return [];
    }
  }, []);

  // Real-time updates
  const subscribeToUpdates = useCallback((callback: (metrics: DashboardMetrics) => void) => {
    // Mock subscription - in real implementation, this would use WebSocket or Server-Sent Events
    const interval = setInterval(() => {
      if (dashboardMetrics) {
        callback(dashboardMetrics);
      }
    }, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, [dashboardMetrics]);

  const enableRealTimeUpdates = useCallback(() => {
    console.log('Real-time updates enabled');
  }, []);

  const disableRealTimeUpdates = useCallback(() => {
    console.log('Real-time updates disabled');
  }, []);

  return {
    // Data
    dashboardMetrics,
    studentMetrics,
    teacherMetrics,
    operationalMetrics,
    systemHealthMetrics,
    performanceInsights,
    
    // Loading states
    loading,
    studentMetricsLoading,
    teacherMetricsLoading,
    operationalMetricsLoading,
    systemHealthLoading,
    insightsLoading,
    
    // Error states
    error: error as Error | null,
    studentMetricsError: studentMetricsError as Error | null,
    teacherMetricsError: teacherMetricsError as Error | null,
    operationalMetricsError: operationalMetricsError as Error | null,
    systemHealthError: systemHealthError as Error | null,
    insightsError: insightsError as Error | null,
    
    // Filters
    filters,
    
    // Actions
    setFilters,
    setDateRange,
    refreshAllMetrics,
    refreshStudentMetrics,
    refreshTeacherMetrics,
    refreshOperationalMetrics,
    refreshSystemHealth,
    refreshInsights,
    
    // Chart data generators
    getStudentEnrollmentChart,
    getAttendanceChart,
    getTeacherUtilizationChart,
    getClassDistributionChart,
    getRevenueChart,
    getPerformanceComparisonChart,
    
    // Exporters
    exportAnalyticsReport,
    exportChartData,
    
    // Utilities
    calculateTrend,
    formatMetricValue,
    getMetricColor,
    
    // Comparisons
    compareMetrics,
    getHistoricalData,
    
    // Real-time updates
    subscribeToUpdates,
    enableRealTimeUpdates,
    disableRealTimeUpdates,
  };
};

// Helper functions
function generatePeriodLabels(period: 'week' | 'month' | 'quarter'): string[] {
  const now = new Date();
  const labels: string[] = [];
  
  switch (period) {
    case 'week':
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
      }
      break;
    case 'month':
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      }
      break;
    case 'quarter':
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now);
        date.setMonth(date.getMonth() - i);
        labels.push(date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
      }
      break;
  }
  
  return labels;
}

function generateMockTimeSeriesData(length: number, baseValue: number, variance: number = baseValue * 0.2): number[] {
  const data: number[] = [];
  for (let i = 0; i < length; i++) {
    const randomVariation = (Math.random() - 0.5) * variance;
    data.push(Math.max(0, baseValue + randomVariation));
  }
  return data;
}

async function generatePerformanceInsights(
  studentMetrics: StudentMetrics | null,
  teacherMetrics: TeacherMetrics | null,
  operationalMetrics: OperationalMetrics | null,
  systemHealthMetrics: SystemHealthMetrics | null
): Promise<PerformanceInsights> {
  // Mock implementation - in real app, this would be more sophisticated
  const insights: PerformanceInsights = {
    trends: {
      studentGrowth: {
        current: studentMetrics?.newEnrollments || 0,
        previous: Math.floor((studentMetrics?.newEnrollments || 0) * 0.9),
        changePercent: 10,
        trend: 'up'
      },
      teacherUtilization: {
        current: teacherMetrics?.utilizationRate || 0,
        previous: Math.floor((teacherMetrics?.utilizationRate || 0) * 0.95),
        changePercent: 5,
        trend: 'up'
      },
      classAttendance: {
        current: studentMetrics?.attendanceRate || 0,
        previous: Math.floor((studentMetrics?.attendanceRate || 0) * 1.02),
        changePercent: -2,
        trend: 'down'
      }
    },
    recommendations: [
      {
        id: '1',
        category: 'students',
        priority: 'high',
        title: 'Improve Student Retention',
        description: 'Student retention rate is below target. Consider implementing engagement programs.',
        actionItems: [
          'Implement weekly check-ins with at-risk students',
          'Create peer mentoring program',
          'Offer additional support resources'
        ],
        expectedImpact: 'Increase retention by 15%'
      },
      {
        id: '2',
        category: 'teachers',
        priority: 'medium',
        title: 'Optimize Teacher Scheduling',
        description: 'Some teachers are under-utilized while others are overbooked.',
        actionItems: [
          'Review teacher availability preferences',
          'Implement automated scheduling optimization',
          'Provide scheduling training to admin staff'
        ],
        expectedImpact: 'Increase teacher utilization by 10%'
      }
    ],
    alerts: [
      {
        id: '1',
        type: 'warning',
        title: 'Low Attendance Rate',
        message: 'Student attendance has dropped below 80% this week',
        timestamp: new Date().toISOString(),
        actionRequired: true
      }
    ]
  };
  
  return insights;
}