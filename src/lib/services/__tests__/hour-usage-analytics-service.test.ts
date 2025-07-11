/**
 * Hour Usage Analytics Service Tests
 * 
 * Tests for the hour usage analytics service functionality
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { HourUsageAnalyticsService } from '../hour-usage-analytics-service';
import { createClient } from '@/lib/supabase';

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          gte: jest.fn(() => ({
            order: jest.fn(() => ({
              data: [],
              error: null
            }))
          }))
        }))
      }))
    })),
    rpc: jest.fn(() => ({
      data: 0,
      error: null
    })),
    auth: {
      getUser: jest.fn(() => ({
        data: { user: { id: 'test-user' } },
        error: null
      }))
    }
  }))
}));

// Mock hour management service
jest.mock('../hour-management-service', () => ({
  hourManagementService: {
    getStudentHourBalance: jest.fn(() => ({
      success: true,
      data: {
        studentId: 'test-student',
        totalHours: 10,
        activePackages: [],
        expiringPackages: [],
        recentTransactions: [],
        alerts: []
      }
    }))
  }
}));

describe('HourUsageAnalyticsService', () => {
  let service: HourUsageAnalyticsService;
  let mockSupabase: any;

  beforeEach(() => {
    service = new HourUsageAnalyticsService();
    mockSupabase = (createClient as jest.Mock).mockReturnValue({
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              order: jest.fn(() => ({
                data: [],
                error: null
              }))
            }))
          }))
        }))
      })),
      rpc: jest.fn(() => ({
        data: 0,
        error: null
      })),
      auth: {
        getUser: jest.fn(() => ({
          data: { user: { id: 'test-user' } },
          error: null
        }))
      }
    });
  });

  describe('getStudentUsageAnalytics', () => {
    it('should return usage analytics for a student', async () => {
      const result = await service.getStudentUsageAnalytics('test-student', 30);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.studentId).toBe('test-student');
      expect(result.data?.currentBalance).toBe(10);
      expect(result.data?.balanceHistory).toBeDefined();
      expect(result.data?.dailyUsagePattern).toBeDefined();
      expect(result.data?.predictions).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              order: jest.fn(() => ({
                data: null,
                error: new Error('Database error')
              }))
            }))
          }))
        }))
      });

      const result = await service.getStudentUsageAnalytics('test-student', 30);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('ANALYTICS_ERROR');
    });
  });

  describe('getBalanceTrend', () => {
    it('should return balance trend analysis', async () => {
      const result = await service.getBalanceTrend('test-student', 90);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.studentId).toBe('test-student');
      expect(result.data?.trend).toBeDefined();
      expect(result.data?.trendStrength).toBeDefined();
      expect(result.data?.recommendations).toBeDefined();
    });
  });

  describe('getConsumptionPatterns', () => {
    it('should return consumption patterns', async () => {
      const result = await service.getConsumptionPatterns('test-student');
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should filter by class type when specified', async () => {
      const result = await service.getConsumptionPatterns('test-student', '1-on-1');
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('generateLowBalanceAlerts', () => {
    it('should generate low balance alerts', async () => {
      const result = await service.generateLowBalanceAlerts('test-student', 5);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should handle multiple students when no specific student ID provided', async () => {
      const result = await service.generateLowBalanceAlerts(undefined, 5);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('generateUsageReport', () => {
    it('should generate a usage report', async () => {
      const result = await service.generateUsageReport('overall', 30);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.reportType).toBe('overall');
      expect(result.data?.summary).toBeDefined();
      expect(result.data?.classTypeBreakdown).toBeDefined();
      expect(result.data?.insights).toBeDefined();
      expect(result.data?.recommendations).toBeDefined();
    });

    it('should handle different report types', async () => {
      const types = ['student', 'class', 'overall', 'predictive'] as const;
      
      for (const type of types) {
        const result = await service.generateUsageReport(type, 30);
        expect(result.success).toBe(true);
        expect(result.data?.reportType).toBe(type);
      }
    });
  });

  describe('getBatchUsageAnalytics', () => {
    it('should return analytics for multiple students', async () => {
      const studentIds = ['student1', 'student2', 'student3'];
      const result = await service.getBatchUsageAnalytics(studentIds, 30);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should handle empty student list', async () => {
      const result = await service.getBatchUsageAnalytics([], 30);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.length).toBe(0);
    });
  });

  describe('getPredictiveInsights', () => {
    it('should return predictive insights', async () => {
      const result = await service.getPredictiveInsights('test-student', 30);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.runOutPrediction).toBeDefined();
      expect(result.data?.recommendedTopUp).toBeDefined();
      expect(result.data?.usageOptimization).toBeDefined();
    });
  });

  describe('private helper methods', () => {
    it('should calculate consumption rate correctly', () => {
      const mockTransactions = [
        { transaction_type: 'deduction', hours_amount: -2, created_at: '2024-01-01' },
        { transaction_type: 'deduction', hours_amount: -1.5, created_at: '2024-01-02' },
        { transaction_type: 'purchase', hours_amount: 10, created_at: '2024-01-03' }
      ];

      // Access private method for testing (in real implementation, this would be tested through public methods)
      const result = (service as any).calculateConsumptionRate(mockTransactions);
      
      expect(result.daily).toBeGreaterThan(0);
      expect(result.weekly).toBeGreaterThan(0);
      expect(result.monthly).toBeGreaterThan(0);
      expect(['increasing', 'decreasing', 'stable']).toContain(result.trend);
    });

    it('should analyze daily usage patterns', () => {
      const mockTransactions = [
        { transaction_type: 'deduction', hours_amount: -2, created_at: '2024-01-01T10:00:00Z' },
        { transaction_type: 'deduction', hours_amount: -1.5, created_at: '2024-01-02T14:00:00Z' }
      ];
      const mockClassData = [
        { class_date: '2024-01-01T10:00:00Z', classes: { duration: 2 } },
        { class_date: '2024-01-02T14:00:00Z', classes: { duration: 1.5 } }
      ];

      const result = (service as any).analyzeDailyUsagePattern(mockTransactions, mockClassData);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(7); // 7 days of the week
      expect(result[0]).toHaveProperty('dayOfWeek');
      expect(result[0]).toHaveProperty('averageHours');
      expect(result[0]).toHaveProperty('sessionCount');
    });
  });
});

describe('HourUsageAnalyticsService Edge Cases', () => {
  let service: HourUsageAnalyticsService;

  beforeEach(() => {
    service = new HourUsageAnalyticsService();
  });

  it('should handle empty transaction data gracefully', async () => {
    const mockSupabase = (createClient as jest.Mock).mockReturnValue({
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              order: jest.fn(() => ({
                data: [],
                error: null
              }))
            }))
          }))
        }))
      })),
      auth: {
        getUser: jest.fn(() => ({
          data: { user: { id: 'test-user' } },
          error: null
        }))
      }
    });

    const result = await service.getStudentUsageAnalytics('test-student', 30);
    
    expect(result.success).toBe(true);
    expect(result.data?.dailyUsagePattern).toBeDefined();
    expect(result.data?.classTypeUsage).toBeDefined();
  });

  it('should handle network errors', async () => {
    const mockSupabase = (createClient as jest.Mock).mockReturnValue({
      from: jest.fn(() => {
        throw new Error('Network error');
      }),
      auth: {
        getUser: jest.fn(() => ({
          data: { user: { id: 'test-user' } },
          error: null
        }))
      }
    });

    const result = await service.getStudentUsageAnalytics('test-student', 30);
    
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('ANALYTICS_ERROR');
  });

  it('should handle missing student data', async () => {
    const result = await service.generateLowBalanceAlerts('nonexistent-student', 5);
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });
});