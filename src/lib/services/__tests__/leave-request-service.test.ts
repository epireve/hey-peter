import { leaveRequestService } from '../leave-request-service';
import { supabase } from '@/lib/supabase';

// Mock the supabase client
jest.mock('@/lib/supabase');
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('LeaveRequestService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('submitLeaveRequest', () => {
    it('should submit leave request successfully', async () => {
      const requestData = {
        student_id: 'student-1',
        start_date: '2024-07-15',
        end_date: '2024-07-15',
        leave_type: 'personal' as const,
        reason: 'Personal appointment'
      };

      const mockLeaveRequest = {
        id: 'leave-1',
        student_id: 'student-1',
        start_date: '2024-07-15',
        end_date: '2024-07-15',
        leave_type: 'personal',
        reason: 'Personal appointment',
        status: 'pending',
        advance_notice_hours: 48,
        hours_recovered: 0,
        makeup_scheduled: false,
        attachments: [],
        created_at: '2024-07-13T00:00:00Z',
        updated_at: '2024-07-13T00:00:00Z'
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockLeaveRequest,
              error: null
            })
          })
        })
      } as any);

      const result = await leaveRequestService.submitLeaveRequest(requestData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockLeaveRequest);
      expect(mockSupabase.from).toHaveBeenCalledWith('leave_requests');
    });

    it('should calculate advance notice hours correctly', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3); // 3 days from now

      const requestData = {
        student_id: 'student-1',
        start_date: futureDate.toISOString().split('T')[0],
        end_date: futureDate.toISOString().split('T')[0],
        leave_type: 'medical' as const,
        reason: 'Doctor appointment'
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { ...requestData, id: 'leave-1', status: 'pending' },
              error: null
            })
          })
        })
      } as any);

      await leaveRequestService.submitLeaveRequest(requestData);

      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          advance_notice_hours: expect.any(Number)
        })
      );
    });

    it('should handle submission errors', async () => {
      const requestData = {
        student_id: 'student-1',
        start_date: '2024-07-15',
        end_date: '2024-07-15',
        leave_type: 'personal' as const
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: new Error('Submission failed')
            })
          })
        })
      } as any);

      const result = await leaveRequestService.submitLeaveRequest(requestData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Submission failed');
    });
  });

  describe('getLeaveRequests', () => {
    it('should return paginated leave requests with filters', async () => {
      const mockRequests = [
        {
          id: 'leave-1',
          student_id: 'student-1',
          start_date: '2024-07-15',
          end_date: '2024-07-15',
          leave_type: 'personal',
          status: 'pending',
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
            data: mockRequests,
            error: null,
            count: 1
          })
        })
      } as any);

      const result = await leaveRequestService.getLeaveRequests(
        { status: 'pending' },
        1,
        10
      );

      expect(result.success).toBe(true);
      expect(result.data?.data).toEqual(mockRequests);
      expect(result.data?.total).toBe(1);
      expect(result.data?.totalPages).toBe(1);
    });
  });

  describe('approveLeaveRequest', () => {
    it('should approve leave request successfully', async () => {
      const requestId = 'leave-1';
      const approverId = 'admin-1';
      const adminNotes = 'Approved for valid reason';

      mockSupabase.rpc.mockResolvedValue({
        data: true,
        error: null
      });

      const mockUpdatedRequest = {
        id: requestId,
        status: 'approved',
        approved_by: approverId,
        approved_at: '2024-07-13T00:00:00Z',
        admin_notes: adminNotes
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockUpdatedRequest,
              error: null
            })
          })
        })
      } as any);

      const result = await leaveRequestService.approveLeaveRequest(
        requestId,
        approverId,
        adminNotes
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUpdatedRequest);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('process_leave_request', {
        leave_request_uuid: requestId,
        approved_status: 'approved',
        approver_uuid: approverId,
        admin_notes_text: adminNotes
      });
    });

    it('should handle approval errors', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: false,
        error: null
      });

      const result = await leaveRequestService.approveLeaveRequest(
        'leave-1',
        'admin-1'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to process leave request approval');
    });
  });

  describe('rejectLeaveRequest', () => {
    it('should reject leave request successfully', async () => {
      const requestId = 'leave-1';
      const rejectedById = 'admin-1';
      const adminNotes = 'Insufficient advance notice';

      mockSupabase.rpc.mockResolvedValue({
        data: true,
        error: null
      });

      const mockUpdatedRequest = {
        id: requestId,
        status: 'rejected',
        rejected_by: rejectedById,
        rejected_at: '2024-07-13T00:00:00Z',
        admin_notes: adminNotes
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockUpdatedRequest,
              error: null
            })
          })
        })
      } as any);

      const result = await leaveRequestService.rejectLeaveRequest(
        requestId,
        rejectedById,
        adminNotes
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUpdatedRequest);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('process_leave_request', {
        leave_request_uuid: requestId,
        approved_status: 'rejected',
        approver_uuid: rejectedById,
        admin_notes_text: adminNotes
      });
    });
  });

  describe('canSubmitLeaveRequest', () => {
    it('should allow submission when no overlapping requests exist', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            or: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        })
      } as any);

      const result = await leaveRequestService.canSubmitLeaveRequest(
        'student-1',
        '2024-07-15',
        '2024-07-15'
      );

      expect(result.success).toBe(true);
      expect(result.data?.canSubmit).toBe(true);
    });

    it('should prevent submission when overlapping requests exist', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            or: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: [{ id: 'leave-1', status: 'pending' }],
                error: null
              })
            })
          })
        })
      } as any);

      const result = await leaveRequestService.canSubmitLeaveRequest(
        'student-1',
        '2024-07-15',
        '2024-07-15'
      );

      expect(result.success).toBe(true);
      expect(result.data?.canSubmit).toBe(false);
      expect(result.data?.reason).toBe('You already have a leave request for overlapping dates');
    });
  });

  describe('getLeaveRequestAnalytics', () => {
    it('should return comprehensive analytics', async () => {
      // Mock all requests
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({
            data: [
              { id: '1', hours_affected: 2 },
              { id: '2', hours_affected: 3 }
            ],
            error: null
          })
        } as any)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [
                { id: '1', hours_affected: 2, hours_recovered: 2 }
              ],
              error: null
            })
          })
        } as any)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [{ id: '2' }],
              error: null
            })
          })
        } as any)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        } as any)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            or: jest.fn().mockResolvedValue({
              data: [
                { created_at: '2024-07-01T00:00:00Z', approved_at: '2024-07-02T00:00:00Z', rejected_at: null }
              ],
              error: null
            })
          })
        } as any)
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({
            data: [
              { leave_type: 'personal', status: 'approved', hours_affected: 2 },
              { leave_type: 'personal', status: 'rejected', hours_affected: 1 }
            ],
            error: null
          })
        } as any);

      const result = await leaveRequestService.getLeaveRequestAnalytics();

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        total_requests: 2,
        approved_requests: 1,
        rejected_requests: 1,
        pending_requests: 0,
        total_hours_affected: 5,
        total_hours_recovered: 2,
        average_processing_time_days: 1
      });
      expect(result.data?.by_leave_type).toHaveProperty('personal');
    });
  });

  describe('cancelLeaveRequest', () => {
    it('should cancel pending leave request successfully', async () => {
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { status: 'pending' },
                error: null
              })
            })
          })
        } as any)
        .mockReturnValueOnce({
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              error: null
            })
          })
        } as any);

      const result = await leaveRequestService.cancelLeaveRequest('leave-1');

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should prevent canceling processed requests', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { status: 'approved' },
              error: null
            })
          })
        })
      } as any);

      const result = await leaveRequestService.cancelLeaveRequest('leave-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot cancel a leave request that has already been processed');
    });
  });
});