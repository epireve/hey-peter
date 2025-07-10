import { HourConsumptionAnalyticsService } from '../hour-consumption-analytics-service';

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(),
  rpc: jest.fn(),
  auth: {
    getUser: jest.fn()
  }
};

// Mock the Supabase client
jest.mock('../../../lib/supabase', () => ({
  createClient: () => mockSupabase
}));

describe('HourConsumptionAnalyticsService', () => {
  let service: HourConsumptionAnalyticsService;
  let mockSelect: jest.Mock;
  let mockEq: jest.Mock;
  let mockGte: jest.Mock;
  let mockNot: jest.Mock;
  let mockOrder: jest.Mock;

  beforeEach(() => {
    service = new HourConsumptionAnalyticsService();
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup mock chain
    mockSelect = jest.fn();
    mockEq = jest.fn();
    mockGte = jest.fn();
    mockNot = jest.fn();
    mockOrder = jest.fn();
    
    // Chain the methods
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ gte: mockGte });
    mockGte.mockReturnValue({ not: mockNot });
    mockNot.mockReturnValue({ order: mockOrder });
    mockOrder.mockReturnValue({ data: [], error: null });
    
    mockSupabase.from.mockReturnValue({ select: mockSelect });
  });

  describe('getClassTypeConsumptionAnalytics', () => {
    it('should return class type consumption analytics successfully', async () => {
      const mockConsumptionData = [
        {
          class_type: 'Basic',
          hours_amount: -2,
          created_at: '2023-01-01T00:00:00Z',
          class_id: 'class1',
          student_id: 'student1',
          booking_id: 'booking1'
        },
        {
          class_type: 'Business English',
          hours_amount: -1,
          created_at: '2023-01-02T00:00:00Z',
          class_id: 'class2',
          student_id: 'student2',
          booking_id: 'booking2'
        }
      ];

      const mockClassData = [
        {
          id: 'class1',
          course_id: 'course1',
          courses: {
            course_type: 'Basic',
            duration_minutes: 60,
            credit_hours: 1
          }
        }
      ];

      const mockBookingData = [
        {
          id: 'booking1',
          class_id: 'class1',
          student_id: 'student1',
          status: 'completed',
          created_at: '2023-01-01T00:00:00Z',
          duration_minutes: 60
        }
      ];

      // Mock multiple queries
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                not: jest.fn().mockReturnValue({
                  data: mockConsumptionData,
                  error: null
                })
              })
            })
          })
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            data: mockClassData,
            error: null
          })
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              data: mockBookingData,
              error: null
            })
          })
        });

      const result = await service.getClassTypeConsumptionAnalytics();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data![0].classType).toBe('Basic');
      expect(result.data![0].totalHours).toBe(2);
      expect(result.data![1].classType).toBe('Business English');
      expect(result.data![1].totalHours).toBe(1);
    });

    it('should handle database errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              not: jest.fn().mockReturnValue({
                data: null,
                error: new Error('Database error')
              })
            })
          })
        })
      });

      const result = await service.getClassTypeConsumptionAnalytics();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('ANALYTICS_ERROR');
      expect(result.error?.message).toBe('Failed to get class type consumption analytics');
    });

    it('should filter by class types when provided', async () => {
      const mockData = [
        {
          class_type: 'Basic',
          hours_amount: -2,
          created_at: '2023-01-01T00:00:00Z',
          class_id: 'class1',
          student_id: 'student1',
          booking_id: 'booking1'
        }
      ];

      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                not: jest.fn().mockReturnValue({
                  data: mockData,
                  error: null
                })
              })
            })
          })
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            data: [],
            error: null
          })
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              data: [],
              error: null
            })
          })
        });

      const result = await service.getClassTypeConsumptionAnalytics({
        classTypes: ['Basic']
      });

      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('hour_transactions');
    });
  });

  describe('getConsumptionTrends', () => {
    it('should return consumption trends successfully', async () => {
      const mockTrendData = [
        {
          hours_amount: -2,
          class_type: 'Basic',
          student_id: 'student1',
          created_at: '2023-01-01T00:00:00Z'
        },
        {
          hours_amount: -1,
          class_type: 'Basic',
          student_id: 'student2',
          created_at: '2023-01-02T00:00:00Z'
        }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                data: mockTrendData,
                error: null
              })
            })
          })
        })
      });

      const result = await service.getConsumptionTrends({
        granularity: 'daily'
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should handle different granularity options', async () => {
      const mockData = [
        {
          hours_amount: -2,
          class_type: 'Basic',
          student_id: 'student1',
          created_at: '2023-01-01T00:00:00Z'
        }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                data: mockData,
                error: null
              })
            })
          })
        })
      });

      // Test weekly granularity
      const weeklyResult = await service.getConsumptionTrends({
        granularity: 'weekly'
      });

      expect(weeklyResult.success).toBe(true);

      // Test monthly granularity
      const monthlyResult = await service.getConsumptionTrends({
        granularity: 'monthly'
      });

      expect(monthlyResult.success).toBe(true);
    });
  });

  describe('getEfficiencyMetrics', () => {
    it('should calculate efficiency metrics successfully', async () => {
      const mockConsumptionData = [
        {
          hours_amount: -2,
          class_type: 'Basic',
          student_id: 'student1',
          created_at: '2023-01-01T00:00:00Z'
        },
        {
          hours_amount: -1,
          class_type: 'Business English',
          student_id: 'student2',
          created_at: '2023-01-02T00:00:00Z'
        }
      ];

      const mockPurchaseData = [
        {
          student_id: 'student1',
          hours_purchased: 10,
          hours_used: 8,
          created_at: '2023-01-01T00:00:00Z',
          payment_status: 'completed'
        },
        {
          student_id: 'student2',
          hours_purchased: 20,
          hours_used: 15,
          created_at: '2023-01-02T00:00:00Z',
          payment_status: 'completed'
        }
      ];

      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                data: mockConsumptionData,
                error: null
              })
            })
          })
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                data: mockPurchaseData,
                error: null
              })
            })
          })
        });

      const result = await service.getEfficiencyMetrics();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.overallUtilization).toBeGreaterThan(0);
      expect(result.data!.averageHoursPerClass).toBeGreaterThan(0);
      expect(result.data!.mostEfficientClassType).toBeDefined();
    });

    it('should handle empty data gracefully', async () => {
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                data: [],
                error: null
              })
            })
          })
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                data: [],
                error: null
              })
            })
          })
        });

      const result = await service.getEfficiencyMetrics();

      expect(result.success).toBe(true);
      expect(result.data!.overallUtilization).toBe(0);
      expect(result.data!.averageHoursPerClass).toBe(0);
    });
  });

  describe('getPredictiveInsights', () => {
    it('should generate predictive insights successfully', async () => {
      const mockHistoricalData = [
        {
          hours_amount: -2,
          class_type: 'Basic',
          student_id: 'student1',
          created_at: '2023-01-01T00:00:00Z'
        },
        {
          hours_amount: -1,
          class_type: 'Basic',
          student_id: 'student1',
          created_at: '2023-01-02T00:00:00Z'
        }
      ];

      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              data: mockHistoricalData,
              error: null
            })
          })
        })
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await service.getPredictiveInsights({
        studentId: 'student1',
        forecastDays: 30
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.forecastPeriod).toBe('30 days');
      expect(result.data!.projectedConsumption).toBeGreaterThan(0);
      expect(result.data!.trendDirection).toBeDefined();
      expect(result.data!.recommendedActions).toBeDefined();
    });

    it('should handle student-specific insights', async () => {
      const mockData = [
        {
          hours_amount: -2,
          class_type: 'Basic',
          student_id: 'student1',
          created_at: '2023-01-01T00:00:00Z'
        }
      ];

      let mockQueryChain = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              data: mockData,
              error: null
            })
          })
        })
      };

      // Mock the eq call for student filter
      mockQueryChain.select().eq = jest.fn().mockReturnValue({
        gte: jest.fn().mockReturnValue({
          data: mockData,
          error: null
        })
      });

      mockSupabase.from.mockReturnValue(mockQueryChain);

      const result = await service.getPredictiveInsights({
        studentId: 'student1'
      });

      expect(result.success).toBe(true);
      expect(result.data!.projectedConsumption).toBeGreaterThan(0);
    });
  });

  describe('getAnalyticsDashboard', () => {
    it('should return comprehensive dashboard data', async () => {
      // Mock multiple service calls
      const mockService = {
        getClassTypeConsumptionAnalytics: jest.fn().mockResolvedValue({
          success: true,
          data: [
            {
              classType: 'Basic',
              totalHours: 100,
              sessionCount: 50,
              studentCount: 25,
              efficiencyScore: 0.85
            }
          ]
        }),
        getConsumptionTrends: jest.fn().mockResolvedValue({
          success: true,
          data: [
            {
              period: '2023-01',
              totalHours: 100,
              averagePerStudent: 4
            }
          ]
        }),
        getEfficiencyMetrics: jest.fn().mockResolvedValue({
          success: true,
          data: {
            overallUtilization: 85,
            averageHoursPerClass: 2,
            mostEfficientClassType: 'Basic'
          }
        }),
        getPredictiveInsights: jest.fn().mockResolvedValue({
          success: true,
          data: {
            forecastPeriod: '30 days',
            projectedConsumption: 120,
            trendDirection: 'increasing',
            recommendedActions: [],
            riskFactors: []
          }
        })
      };

      // Replace service methods
      Object.assign(service, mockService);

      const result = await service.getAnalyticsDashboard();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.overview).toBeDefined();
      expect(result.data!.classTypeMetrics).toBeDefined();
      expect(result.data!.consumptionTrends).toBeDefined();
      expect(result.data!.efficiencyMetrics).toBeDefined();
      expect(result.data!.predictiveInsights).toBeDefined();
    });

    it('should handle partial failures in dashboard data', async () => {
      const mockService = {
        getClassTypeConsumptionAnalytics: jest.fn().mockResolvedValue({
          success: false,
          error: { code: 'TEST_ERROR', message: 'Test error' }
        }),
        getConsumptionTrends: jest.fn().mockResolvedValue({
          success: true,
          data: []
        }),
        getEfficiencyMetrics: jest.fn().mockResolvedValue({
          success: true,
          data: {}
        }),
        getPredictiveInsights: jest.fn().mockResolvedValue({
          success: true,
          data: {}
        })
      };

      Object.assign(service, mockService);

      const result = await service.getAnalyticsDashboard();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DASHBOARD_ERROR');
    });
  });

  describe('getHourPlanningRecommendations', () => {
    it('should generate hour planning recommendations', async () => {
      const result = await service.getHourPlanningRecommendations({
        studentId: 'student1',
        includeBudgetOptimization: true
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.recommendations).toBeDefined();
      expect(result.data!.budgetOptimization).toBeDefined();
    });

    it('should handle class type specific recommendations', async () => {
      const result = await service.getHourPlanningRecommendations({
        classType: 'Basic'
      });

      expect(result.success).toBe(true);
      expect(result.data!.recommendations).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Network error');
      });

      const result = await service.getClassTypeConsumptionAnalytics();

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Failed to get class type consumption analytics');
    });

    it('should handle invalid data gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              not: jest.fn().mockReturnValue({
                data: null, // Invalid data
                error: null
              })
            })
          })
        })
      });

      const result = await service.getClassTypeConsumptionAnalytics();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });
});