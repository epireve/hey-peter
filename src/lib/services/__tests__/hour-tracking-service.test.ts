import { hourTrackingService } from '../hour-tracking-service';
import { supabase } from '@/lib/supabase';

// Mock the supabase client
jest.mock('@/lib/supabase');
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('HourTrackingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getStudentHourBalance', () => {
    it('should return student hour balance successfully', async () => {
      const mockBalance = 25.5;
      mockSupabase.rpc.mockResolvedValue({
        data: mockBalance,
        error: null
      });

      const result = await hourTrackingService.getStudentHourBalance('student-1');

      expect(result.success).toBe(true);
      expect(result.data).toBe(mockBalance);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('calculate_student_hour_balance', {
        student_uuid: 'student-1'
      });
    });

    it('should handle database errors', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: new Error('Database error')
      });

      const result = await hourTrackingService.getStudentHourBalance('student-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('purchaseHours', () => {
    it('should purchase hours successfully', async () => {
      const purchaseData = {
        student_id: 'student-1',
        package_name: 'Basic Package',
        hours_purchased: 10,
        price_per_hour: 30,
        total_amount: 300,
        payment_method: 'credit_card' as const
      };

      const mockPurchase = {
        id: 'purchase-1',
        ...purchaseData,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      // Mock the purchase insert
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockPurchase,
              error: null
            })
          })
        })
      } as any);

      // Mock the add hours function
      mockSupabase.rpc.mockResolvedValue({
        data: true,
        error: null
      });

      const result = await hourTrackingService.purchaseHours(purchaseData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPurchase);
    });

    it('should handle purchase failure', async () => {
      const purchaseData = {
        student_id: 'student-1',
        package_name: 'Basic Package',
        hours_purchased: 10,
        price_per_hour: 30,
        total_amount: 300,
        payment_method: 'credit_card' as const
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: new Error('Purchase failed')
            })
          })
        })
      } as any);

      const result = await hourTrackingService.purchaseHours(purchaseData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Purchase failed');
    });
  });

  describe('deductHours', () => {
    it('should deduct hours successfully', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: true,
        error: null
      });

      const result = await hourTrackingService.deductHours(
        'student-1',
        2.0,
        'booking-1',
        'class-1',
        'teacher-1',
        'Class completion'
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('deduct_student_hours', {
        student_uuid: 'student-1',
        hours_to_deduct: 2.0,
        booking_uuid: 'booking-1',
        class_uuid: 'class-1',
        teacher_uuid: 'teacher-1',
        deduction_reason: 'Class completion',
        created_by_uuid: undefined
      });
    });

    it('should handle insufficient balance', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: false,
        error: null
      });

      const result = await hourTrackingService.deductHours(
        'student-1',
        10.0
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });
  });

  describe('getHourTransactions', () => {
    it('should return paginated transactions with filters', async () => {
      const mockTransactions = [
        {
          id: 'trans-1',
          student_id: 'student-1',
          transaction_type: 'purchase',
          amount: 10,
          balance_before: 0,
          balance_after: 10,
          created_at: '2024-01-01T00:00:00Z',
          student: {
            id: 'student-1',
            student_id: 'HPA001',
            users: { full_name: 'John Doe', email: 'john@example.com' }
          }
        }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          range: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: mockTransactions,
            error: null,
            count: 1
          })
        })
      } as any);

      const result = await hourTrackingService.getHourTransactions(
        { student_id: 'student-1', date_from: '2024-01-01' },
        1,
        10
      );

      expect(result.success).toBe(true);
      expect(result.data?.data).toEqual(mockTransactions);
      expect(result.data?.total).toBe(1);
      expect(result.data?.totalPages).toBe(1);
    });
  });

  describe('getHourAnalytics', () => {
    it('should return comprehensive analytics', async () => {
      // Mock multiple API calls for analytics
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            gt: jest.fn().mockResolvedValue({
              data: [{ id: '1' }, { id: '2' }],
              error: null
            })
          })
        } as any)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              data: [{ amount: 10 }, { amount: 5 }],
              error: null
            })
          })
        } as any)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [{ hours_expiring: 2 }],
              error: null
            })
          })
        } as any)
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({
            data: [{ total_amount: 300 }, { total_amount: 200 }],
            error: null
          })
        } as any)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockResolvedValue({
                data: [{ amount: 3 }],
                error: null
              })
            })
          })
        } as any)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              gte: jest.fn().mockResolvedValue({
                data: [{ amount: 8 }],
                error: null
              })
            })
          })
        } as any)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              lte: jest.fn().mockResolvedValue({
                data: [{ id: '1' }],
                error: null
              })
            })
          })
        } as any)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [
                { amount: 2, class: { courses: { course_type: 'Basic' } } }
              ],
              error: null
            })
          })
        } as any);

      const result = await hourTrackingService.getHourAnalytics();

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        total_students_with_hours: 2,
        total_hours_in_circulation: 15,
        total_hours_expired: 2,
        total_revenue: 500,
        hours_used_this_month: 3,
        hours_purchased_this_month: 8,
        expiring_soon_count: 1
      });
    });
  });

  describe('adjustHours', () => {
    it('should handle positive adjustments', async () => {
      const adjustmentData = {
        student_id: 'student-1',
        transaction_type: 'bonus' as const,
        amount: 5,
        reason: 'Performance bonus'
      };

      mockSupabase.rpc.mockResolvedValue({
        data: true,
        error: null
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'trans-1',
                    student_id: 'student-1',
                    transaction_type: 'bonus',
                    amount: 5,
                    balance_before: 10,
                    balance_after: 15,
                    created_at: '2024-01-01T00:00:00Z'
                  },
                  error: null
                })
              })
            })
          })
        })
      } as any);

      const result = await hourTrackingService.adjustHours(adjustmentData);

      expect(result.success).toBe(true);
      expect(result.data?.transaction_type).toBe('bonus');
      expect(result.data?.amount).toBe(5);
    });

    it('should handle negative adjustments', async () => {
      const adjustmentData = {
        student_id: 'student-1',
        transaction_type: 'adjustment' as const,
        amount: -2,
        reason: 'Correction'
      };

      // Mock deduct hours call
      jest.spyOn(hourTrackingService, 'deductHours').mockResolvedValue({
        success: true,
        data: true
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'trans-1',
                    student_id: 'student-1',
                    transaction_type: 'deduction',
                    amount: 2,
                    balance_before: 10,
                    balance_after: 8,
                    created_at: '2024-01-01T00:00:00Z'
                  },
                  error: null
                })
              })
            })
          })
        })
      } as any);

      const result = await hourTrackingService.adjustHours(adjustmentData);

      expect(result.success).toBe(true);
      expect(hourTrackingService.deductHours).toHaveBeenCalledWith(
        'student-1',
        2,
        undefined,
        undefined,
        undefined,
        'Correction',
        undefined
      );
    });
  });
});