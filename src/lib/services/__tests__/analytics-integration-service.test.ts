import { analyticsIntegrationService, AnalyticsTimeframe } from '../analytics-integration-service';

// Mock the individual analytics services
jest.mock('../class-efficiency-analytics', () => ({
  classEfficiencyAnalytics: {
    getClassEfficiencyMetrics: jest.fn().mockResolvedValue({
      utilization: {
        overallUtilization: 78.5,
        teacherUtilization: 76.8,
      },
      efficiency: {
        attendanceEfficiency: 87.2,
      },
      revenue: {
        revenuePerHour: 125,
        profitMargin: 68.5,
      },
      optimization: {
        overallOptimizationScore: 82.3,
        scheduleOptimizationScore: 85.7,
      },
    }),
  },
}));

jest.mock('../teacher-performance-analytics', () => ({
  teacherPerformanceAnalytics: {},
}));

jest.mock('../student-progress-analytics', () => ({
  studentProgressAnalytics: {},
}));

describe('AnalyticsIntegrationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    analyticsIntegrationService.clearCache();
  });

  describe('getComprehensiveAnalytics', () => {
    it('should return comprehensive analytics data', async () => {
      const timeframe: AnalyticsTimeframe = {
        period: '30_days',
        startDate: new Date('2024-05-01'),
        endDate: new Date('2024-05-31'),
      };

      const result = await analyticsIntegrationService.getComprehensiveAnalytics(timeframe);

      expect(result).toHaveProperty('overview');
      expect(result).toHaveProperty('students');
      expect(result).toHaveProperty('teachers');
      expect(result).toHaveProperty('system');
      expect(result).toHaveProperty('business');
      expect(result).toHaveProperty('alerts');
      expect(result).toHaveProperty('recommendations');
    });

    it('should include correct overview metrics', async () => {
      const result = await analyticsIntegrationService.getComprehensiveAnalytics();

      expect(result.overview).toEqual(
        expect.objectContaining({
          totalStudents: expect.any(Number),
          totalTeachers: expect.any(Number),
          totalClasses: expect.any(Number),
          systemUtilization: 78.5,
          averageAttendance: 87.2,
          revenueThisMonth: expect.any(Number),
          studentsAtRisk: expect.any(Number),
          teachersNeedingSupport: expect.any(Number),
          trends: expect.objectContaining({
            studentGrowth: expect.any(Number),
            teacherPerformance: expect.any(Number),
            systemEfficiency: expect.any(Number),
            revenue: expect.any(Number),
          }),
        })
      );
    });

    it('should include student analytics', async () => {
      const result = await analyticsIntegrationService.getComprehensiveAnalytics();

      expect(result.students).toEqual(
        expect.objectContaining({
          totalStudents: expect.any(Number),
          averageProgress: expect.any(Number),
          averageAttendance: expect.any(Number),
          averageEngagement: expect.any(Number),
          completionRate: expect.any(Number),
          riskStudents: expect.any(Number),
          progressDistribution: expect.any(Array),
          topCourses: expect.any(Array),
        })
      );

      expect(result.students.progressDistribution).toHaveLength(4);
      expect(result.students.topCourses).toHaveLength(3);
    });

    it('should include teacher analytics', async () => {
      const result = await analyticsIntegrationService.getComprehensiveAnalytics();

      expect(result.teachers).toEqual(
        expect.objectContaining({
          totalTeachers: expect.any(Number),
          averageRating: expect.any(Number),
          averageUtilization: 76.8,
          topPerformers: expect.any(Array),
          needingSupport: expect.any(Array),
          specializationCoverage: expect.any(Array),
        })
      );

      expect(result.teachers.topPerformers).toHaveLength(3);
      expect(result.teachers.needingSupport).toHaveLength(2);
      expect(result.teachers.specializationCoverage).toHaveLength(3);
    });

    it('should include system analytics', async () => {
      const result = await analyticsIntegrationService.getComprehensiveAnalytics();

      expect(result.system).toEqual(
        expect.objectContaining({
          uptime: expect.any(Number),
          responseTime: expect.any(Number),
          schedulingSuccessRate: 85.7,
          emailDeliveryRate: expect.any(Number),
          bookingSuccessRate: expect.any(Number),
          errorRate: expect.any(Number),
        })
      );
    });

    it('should include business analytics', async () => {
      const result = await analyticsIntegrationService.getComprehensiveAnalytics();

      expect(result.business).toEqual(
        expect.objectContaining({
          monthlyRevenue: expect.any(Number),
          quarterlyRevenue: expect.any(Number),
          grossMargin: 68.5,
          customerAcquisitionCost: expect.any(Number),
          customerLifetimeValue: expect.any(Number),
          marketShare: expect.any(Number),
          projectedGrowth: expect.any(Number),
        })
      );
    });

    it('should generate appropriate alerts', async () => {
      const result = await analyticsIntegrationService.getComprehensiveAnalytics();

      expect(result.alerts).toBeInstanceOf(Array);
      
      // Check that alerts have proper structure
      result.alerts.forEach(alert => {
        expect(alert).toEqual(
          expect.objectContaining({
            type: expect.stringMatching(/^(student|teacher|system|business)$/),
            severity: expect.stringMatching(/^(low|medium|high|critical)$/),
            message: expect.any(String),
            timestamp: expect.any(String),
          })
        );
      });
    });

    it('should generate recommendations', async () => {
      const result = await analyticsIntegrationService.getComprehensiveAnalytics();

      expect(result.recommendations).toBeInstanceOf(Array);
      
      // Check that recommendations have proper structure
      result.recommendations.forEach(recommendation => {
        expect(recommendation).toEqual(
          expect.objectContaining({
            category: expect.stringMatching(/^(student|teacher|system|business)$/),
            priority: expect.stringMatching(/^(low|medium|high)$/),
            title: expect.any(String),
            description: expect.any(String),
            expectedImpact: expect.any(Number),
            actions: expect.any(Array),
          })
        );
      });
    });

    it('should use cache for repeated requests', async () => {
      const timeframe: AnalyticsTimeframe = {
        period: '30_days',
        startDate: new Date('2024-05-01'),
        endDate: new Date('2024-05-31'),
      };

      // First request
      const result1 = await analyticsIntegrationService.getComprehensiveAnalytics(timeframe);
      
      // Second request (should use cache)
      const result2 = await analyticsIntegrationService.getComprehensiveAnalytics(timeframe);

      expect(result1).toEqual(result2);
    });

    it('should bypass cache when forceRefresh is true', async () => {
      const timeframe: AnalyticsTimeframe = {
        period: '30_days',
        startDate: new Date('2024-05-01'),
        endDate: new Date('2024-05-31'),
      };

      // First request
      await analyticsIntegrationService.getComprehensiveAnalytics(timeframe);
      
      // Second request with force refresh
      const result = await analyticsIntegrationService.getComprehensiveAnalytics(timeframe, true);

      expect(result).toBeDefined();
    });
  });

  describe('exportAnalyticsData', () => {
    it('should export data in JSON format', async () => {
      const timeframe: AnalyticsTimeframe = {
        period: '30_days',
        startDate: new Date('2024-05-01'),
        endDate: new Date('2024-05-31'),
      };

      const result = await analyticsIntegrationService.exportAnalyticsData('json', timeframe);

      expect(() => JSON.parse(result)).not.toThrow();
      
      const parsedData = JSON.parse(result);
      expect(parsedData).toHaveProperty('overview');
      expect(parsedData).toHaveProperty('students');
      expect(parsedData).toHaveProperty('teachers');
    });

    it('should export data in CSV format', async () => {
      const timeframe: AnalyticsTimeframe = {
        period: '30_days',
        startDate: new Date('2024-05-01'),
        endDate: new Date('2024-05-31'),
      };

      const result = await analyticsIntegrationService.exportAnalyticsData('csv', timeframe);

      expect(result).toContain('Category,Metric,Value');
      expect(result).toContain('Overview,Total Students');
      expect(result).toContain('Students,Average Progress');
      expect(result).toContain('Teachers,Average Rating');
      expect(result).toContain('System,Uptime');
    });

    it('should throw error for unsupported format', async () => {
      const timeframe: AnalyticsTimeframe = {
        period: '30_days',
        startDate: new Date('2024-05-01'),
        endDate: new Date('2024-05-31'),
      };

      await expect(
        analyticsIntegrationService.exportAnalyticsData('xml' as any, timeframe)
      ).rejects.toThrow('Unsupported export format: xml');
    });
  });

  describe('cache management', () => {
    it('should clear cache', () => {
      analyticsIntegrationService.clearCache();
      
      const stats = analyticsIntegrationService.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.keys).toEqual([]);
    });

    it('should provide cache statistics', async () => {
      await analyticsIntegrationService.getComprehensiveAnalytics();
      
      const stats = analyticsIntegrationService.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.keys).toBeInstanceOf(Array);
    });
  });

  describe('error handling', () => {
    it('should handle errors gracefully', async () => {
      // Mock an error in the class efficiency service
      const { classEfficiencyAnalytics } = require('../class-efficiency-analytics');
      classEfficiencyAnalytics.getClassEfficiencyMetrics.mockRejectedValueOnce(
        new Error('Service unavailable')
      );

      await expect(
        analyticsIntegrationService.getComprehensiveAnalytics()
      ).rejects.toThrow('Failed to load analytics data');
    });
  });

  describe('different timeframes', () => {
    it('should handle 7 days timeframe', async () => {
      const timeframe: AnalyticsTimeframe = {
        period: '7_days',
        startDate: new Date('2024-05-24'),
        endDate: new Date('2024-05-31'),
      };

      const result = await analyticsIntegrationService.getComprehensiveAnalytics(timeframe);
      expect(result).toBeDefined();
    });

    it('should handle 90 days timeframe', async () => {
      const timeframe: AnalyticsTimeframe = {
        period: '90_days',
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-05-31'),
      };

      const result = await analyticsIntegrationService.getComprehensiveAnalytics(timeframe);
      expect(result).toBeDefined();
    });

    it('should handle 1 year timeframe', async () => {
      const timeframe: AnalyticsTimeframe = {
        period: '1_year',
        startDate: new Date('2023-06-01'),
        endDate: new Date('2024-05-31'),
      };

      const result = await analyticsIntegrationService.getComprehensiveAnalytics(timeframe);
      expect(result).toBeDefined();
    });
  });
});