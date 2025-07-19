import { supabase } from '@/lib/supabase';
import { HourManagementService } from '../hour-management-service';
import type { 
  HourPackage, 
  HourPurchaseRequest,
  HourTransferRequest,
  HourAdjustmentRequest
} from '@/types/hours';

// Mock Supabase client is already handled by global mock

describe('HourManagementService', () => {
  let service: HourManagementService;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new HourManagementService();
    mockSupabase = supabase;
  });

  describe('getHourPackages', () => {
    it('should fetch active hour packages', async () => {
      const mockPackages = [
        {
          id: '1',
          package_type: 'standard_10',
          name: 'Starter Package',
          hours_included: 10,
          validity_days: 90,
          price: 149.99,
          currency: 'USD',
          is_active: true,
          is_featured: false,
          display_order: 1,
          features: ['10 hours', 'Valid for 90 days']
        }
      ];

      // Reset the mock and set up the response
      jest.clearAllMocks();
      
      // Configure the query builder chain to return the mock data
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation((resolve) => {
          const result = { data: mockPackages, error: null };
          resolve(result);
          return Promise.resolve(result);
        })
      };
      
      mockSupabase.from.mockReturnValue(queryBuilder);

      const result = await service.getHourPackages({ isActive: true });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].name).toBe('Starter Package');
      expect(mockSupabase.from).toHaveBeenCalledWith('hour_packages');
    });

    it('should handle errors when fetching packages', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: null,
            error: new Error('Database error')
          })
        })
      });

      const result = await service.getHourPackages();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('FETCH_PACKAGES_ERROR');
    });
  });

  describe('purchaseHours', () => {
    it('should successfully purchase hours', async () => {
      const mockPackage = {
        id: 'pkg-1',
        hours_included: 10,
        validity_days: 90,
        price: 149.99,
        currency: 'USD'
      };

      const mockPurchase = {
        id: 'purchase-1',
        student_id: 'student-1',
        package_id: 'pkg-1',
        hours_purchased: 10,
        price_paid: 149.99,
        payment_status: 'pending'
      };

      const purchaseRequest: HourPurchaseRequest = {
        studentId: 'student-1',
        packageId: 'pkg-1',
        paymentMethod: 'credit_card',
        notes: 'Test purchase'
      };

      // Mock package fetch
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockPackage,
              error: null
            })
          })
        })
      });

      // Mock purchase insert
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockPurchase,
              error: null
            })
          })
        })
      });

      // Mock payment update
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { ...mockPurchase, payment_status: 'completed' },
                error: null
              })
            })
          })
        })
      });

      // Mock RPC calls
      mockSupabase.rpc.mockResolvedValue({ data: 0, error: null });

      // Mock transaction insert
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null })
      });

      const result = await service.purchaseHours(purchaseRequest);

      expect(result.success).toBe(true);
      expect(result.data?.paymentStatus).toBe('completed');
    });

    it('should handle invalid package ID', async () => {
      const purchaseRequest: HourPurchaseRequest = {
        studentId: 'student-1',
        packageId: 'invalid-pkg',
        paymentMethod: 'credit_card'
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: new Error('Package not found')
            })
          })
        })
      });

      const result = await service.purchaseHours(purchaseRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PURCHASE_ERROR');
    });
  });

  describe('getStudentHourBalance', () => {
    it('should fetch student hour balance', async () => {
      const studentId = 'student-1';

      // Mock calculate_student_hours RPC
      mockSupabase.rpc.mockResolvedValueOnce({ 
        data: 25, 
        error: null 
      });

      // Mock active purchases
      const mockPurchases = [
        {
          id: 'purchase-1',
          hours_remaining: 15,
          valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          hour_packages: { name: 'Standard Package' }
        },
        {
          id: 'purchase-2',
          hours_remaining: 10,
          valid_until: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          hour_packages: { name: 'Premium Package' }
        }
      ];

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  gt: jest.fn().mockReturnValue({
                    order: jest.fn().mockResolvedValue({
                      data: mockPurchases,
                      error: null
                    })
                  })
                })
              })
            })
          })
        })
      });

      // Mock transactions
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        })
      });

      // Mock alerts
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        })
      });

      const result = await service.getStudentHourBalance(studentId);

      expect(result.success).toBe(true);
      expect(result.data?.totalHours).toBe(25);
      expect(result.data?.activePackages).toHaveLength(2);
      expect(result.data?.expiringPackages).toHaveLength(1); // One package within 30 days
    });
  });

  describe('deductClassHours', () => {
    it('should deduct hours for a class', async () => {
      const params = {
        studentId: 'student-1',
        classId: 'class-1',
        bookingId: 'booking-1',
        hours: 1,
        classType: 'individual',
        deductionRate: 1.0
      };

      const mockTransactionId = 'trans-1';
      const mockTransaction = {
        id: mockTransactionId,
        student_id: params.studentId,
        transaction_type: 'deduction',
        hours_amount: -1,
        balance_before: 10,
        balance_after: 9
      };

      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockTransactionId,
        error: null
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockTransaction,
              error: null
            })
          })
        })
      });

      const result = await service.deductClassHours(params);

      expect(result.success).toBe(true);
      expect(result.data?.hoursAmount).toBe(-1);
      expect(result.data?.transactionType).toBe('deduction');
      expect(mockSupabase.rpc).toHaveBeenCalledWith('deduct_class_hours', {
        p_student_id: params.studentId,
        p_class_id: params.classId,
        p_booking_id: params.bookingId,
        p_hours_to_deduct: params.hours,
        p_class_type: params.classType,
        p_deduction_rate: params.deductionRate
      });
    });

    it('should handle insufficient hours error', async () => {
      const params = {
        studentId: 'student-1',
        classId: 'class-1',
        bookingId: 'booking-1',
        hours: 10,
        classType: 'individual'
      };

      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: new Error('Insufficient hours')
      });

      const result = await service.deductClassHours(params);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DEDUCTION_ERROR');
    });
  });

  describe('transferHours', () => {
    it('should transfer hours between students', async () => {
      const transferRequest: HourTransferRequest = {
        fromStudentId: 'student-1',
        toStudentId: 'student-2',
        hoursToTransfer: 5,
        reason: 'Family transfer',
        isFamilyTransfer: true,
        familyRelationship: 'siblings'
      };

      // Mock balance checks
      mockSupabase.rpc
        .mockResolvedValueOnce({ data: 10, error: null }) // From student balance
        .mockResolvedValueOnce({ data: 5, error: null })  // To student balance
        .mockResolvedValueOnce({ data: 10, error: null }); // Repeated call

      // Mock oldest purchase
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gt: jest.fn().mockReturnValue({
                  order: jest.fn().mockReturnValue({
                    limit: jest.fn().mockReturnValue({
                      single: jest.fn().mockResolvedValue({
                        data: { id: 'purchase-1' },
                        error: null
                      })
                    })
                  })
                })
              })
            })
          })
        })
      });

      // Mock transaction inserts
      mockSupabase.from
        .mockReturnValueOnce({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'trans-from' },
                error: null
              })
            })
          })
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'trans-to' },
                error: null
              })
            })
          })
        });

      // Mock transfer log insert
      const mockTransferLog = {
        id: 'transfer-1',
        from_student_id: transferRequest.fromStudentId,
        to_student_id: transferRequest.toStudentId,
        hours_transferred: transferRequest.hoursToTransfer,
        transfer_reason: transferRequest.reason
      };

      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockTransferLog,
              error: null
            })
          })
        })
      });

      const result = await service.transferHours(transferRequest);

      expect(result.success).toBe(true);
      expect(result.data?.hoursTransferred).toBe(5);
      expect(result.data?.isFamilyTransfer).toBe(true);
    });

    it('should prevent transfer with insufficient hours', async () => {
      const transferRequest: HourTransferRequest = {
        fromStudentId: 'student-1',
        toStudentId: 'student-2',
        hoursToTransfer: 15,
        reason: 'Transfer',
        isFamilyTransfer: false
      };

      // Mock insufficient balance
      mockSupabase.rpc.mockResolvedValueOnce({ data: 10, error: null });

      const result = await service.transferHours(transferRequest);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Failed to transfer hours');
    });
  });

  describe('createHourAdjustment', () => {
    it('should create hour adjustment request', async () => {
      const adjustmentRequest: HourAdjustmentRequest = {
        studentId: 'student-1',
        adjustmentType: 'add',
        hoursToAdjust: 5,
        reason: 'Compensation for technical issues',
        notes: 'System was down during scheduled class'
      };

      // Mock balance check
      mockSupabase.rpc.mockResolvedValueOnce({ data: 10, error: null });

      // Mock transaction insert
      const mockTransaction = {
        id: 'trans-1',
        student_id: adjustmentRequest.studentId,
        transaction_type: 'adjustment',
        hours_amount: 5
      };

      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockTransaction,
              error: null
            })
          })
        })
      });

      // Mock adjustment insert
      const mockAdjustment = {
        id: 'adj-1',
        student_id: adjustmentRequest.studentId,
        transaction_id: mockTransaction.id,
        adjustment_type: adjustmentRequest.adjustmentType,
        hours_adjusted: adjustmentRequest.hoursToAdjust,
        reason: adjustmentRequest.reason,
        approval_status: 'pending'
      };

      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockAdjustment,
              error: null
            })
          })
        })
      });

      const result = await service.createHourAdjustment(adjustmentRequest);

      expect(result.success).toBe(true);
      expect(result.data?.adjustmentType).toBe('add');
      expect(result.data?.hoursAdjusted).toBe(5);
      expect(result.data?.approvalStatus).toBe('pending');
    });
  });

  describe('getHourUsageStats', () => {
    it('should calculate hour usage statistics', async () => {
      const studentId = 'student-1';
      const mockTransactions = [
        {
          transaction_type: 'deduction',
          hours_amount: -2,
          class_type: 'individual',
          created_at: new Date().toISOString()
        },
        {
          transaction_type: 'purchase',
          hours_amount: 20,
          created_at: new Date().toISOString()
        },
        {
          transaction_type: 'deduction',
          hours_amount: -1,
          class_type: 'group',
          created_at: new Date().toISOString()
        }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockTransactions,
                error: null
              })
            })
          })
        })
      });

      const result = await service.getHourUsageStats(studentId, 90);

      expect(result.success).toBe(true);
      expect(result.data?.totalHoursUsed).toBe(3);
      expect(result.data?.totalHoursPurchased).toBe(20);
      expect(result.data?.usageByClassType['individual']).toBe(2);
      expect(result.data?.usageByClassType['group']).toBe(1);
    });
  });
});