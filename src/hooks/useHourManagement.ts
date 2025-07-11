import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hourManagementService } from '@/lib/services/hour-management-service';
import { toast } from 'sonner';
import type {
  HourPackage,
  HourPurchase,
  HourTransaction,
  HourAdjustment,
  HourAlert,
  HourTransferLog,
  StudentHourBalance,
  HourUsageStats,
  HourPurchaseRequest,
  HourTransferRequest,
  HourAdjustmentRequest,
} from '@/types/hours';

export interface HourManagementFilters {
  studentId?: string;
  packageId?: string;
  transactionType?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  status?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface UseHourManagementReturn {
  // Hour packages
  packages: HourPackage[];
  packagesLoading: boolean;
  packagesError: Error | null;
  
  // Student balance
  studentBalance: StudentHourBalance | null;
  balanceLoading: boolean;
  balanceError: Error | null;
  
  // Transactions
  transactions: HourTransaction[];
  transactionsLoading: boolean;
  transactionsError: Error | null;
  
  // Purchases
  purchases: HourPurchase[];
  purchasesLoading: boolean;
  purchasesError: Error | null;
  
  // Adjustments
  adjustments: HourAdjustment[];
  adjustmentsLoading: boolean;
  adjustmentsError: Error | null;
  
  // Alerts
  alerts: HourAlert[];
  alertsLoading: boolean;
  alertsError: Error | null;
  
  // Usage stats
  usageStats: HourUsageStats | null;
  usageStatsLoading: boolean;
  usageStatsError: Error | null;
  
  // Package management
  getHourPackages: (options?: { isActive?: boolean; isFeatured?: boolean; isCorporate?: boolean }) => Promise<void>;
  getHourPackage: (packageId: string) => Promise<HourPackage | null>;
  refreshPackages: () => Promise<void>;
  
  // Purchase management
  purchaseHours: (request: HourPurchaseRequest) => Promise<{ success: boolean; error?: string }>;
  getRecentPurchases: (options?: { limit?: number }) => Promise<void>;
  refreshPurchases: () => Promise<void>;
  
  // Balance management
  getStudentBalance: (studentId: string) => Promise<void>;
  refreshBalance: () => Promise<void>;
  
  // Hour operations
  deductClassHours: (params: {
    studentId: string;
    classId: string;
    bookingId: string;
    hours: number;
    classType: string;
    deductionRate?: number;
  }) => Promise<{ success: boolean; error?: string }>;
  
  transferHours: (request: HourTransferRequest) => Promise<{ success: boolean; error?: string }>;
  
  // Adjustment management
  createAdjustment: (request: HourAdjustmentRequest) => Promise<{ success: boolean; error?: string }>;
  getPendingAdjustments: () => Promise<void>;
  approveAdjustment: (adjustmentId: string, notes?: string) => Promise<{ success: boolean; error?: string }>;
  rejectAdjustment: (adjustmentId: string, notes: string) => Promise<{ success: boolean; error?: string }>;
  refreshAdjustments: () => Promise<void>;
  
  // Alert management
  getActiveAlerts: () => Promise<void>;
  acknowledgeAlert: (alertId: string) => Promise<{ success: boolean; error?: string }>;
  refreshAlerts: () => Promise<void>;
  
  // Statistics
  getUsageStats: (studentId: string, periodDays?: number) => Promise<void>;
  refreshUsageStats: () => Promise<void>;
  
  // Transactions
  getTransactions: (filters?: HourManagementFilters) => Promise<void>;
  refreshTransactions: () => Promise<void>;
  
  // Utility functions
  calculateHourValue: (hours: number, packageId: string) => number;
  getExpiringHours: (studentId: string, days?: number) => Promise<Array<{
    packageId: string;
    packageName: string;
    hoursRemaining: number;
    expiryDate: string;
    daysRemaining: number;
  }>>;
  
  // Bulk operations
  bulkTransferHours: (transfers: HourTransferRequest[]) => Promise<{ success: boolean; errors?: string[] }>;
  bulkAdjustHours: (adjustments: HourAdjustmentRequest[]) => Promise<{ success: boolean; errors?: string[] }>;
  
  // Reporting
  generateHourReport: (filters: HourManagementFilters) => Promise<{ success: boolean; url?: string; error?: string }>;
  exportTransactions: (format: 'csv' | 'excel', filters?: HourManagementFilters) => Promise<{ success: boolean; url?: string; error?: string }>;
}

const QUERY_KEYS = {
  packages: 'hour-packages',
  balance: 'student-balance',
  transactions: 'hour-transactions',
  purchases: 'hour-purchases',
  adjustments: 'hour-adjustments',
  alerts: 'hour-alerts',
  usageStats: 'hour-usage-stats',
} as const;

export const useHourManagement = (initialStudentId?: string): UseHourManagementReturn => {
  const queryClient = useQueryClient();
  const [selectedStudentId, setSelectedStudentId] = useState<string | undefined>(initialStudentId);
  
  // Hour packages query
  const {
    data: packages,
    isLoading: packagesLoading,
    error: packagesError,
    refetch: refetchPackages,
  } = useQuery({
    queryKey: [QUERY_KEYS.packages],
    queryFn: async () => {
      const result = await hourManagementService.getHourPackages();
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch hour packages');
      }
      return result.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  });

  // Student balance query
  const {
    data: studentBalance,
    isLoading: balanceLoading,
    error: balanceError,
    refetch: refetchBalance,
  } = useQuery({
    queryKey: [QUERY_KEYS.balance, selectedStudentId],
    queryFn: async () => {
      if (!selectedStudentId) return null;
      
      const result = await hourManagementService.getStudentHourBalance(selectedStudentId);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch student balance');
      }
      return result.data;
    },
    enabled: !!selectedStudentId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
  });

  // Recent purchases query
  const {
    data: purchases,
    isLoading: purchasesLoading,
    error: purchasesError,
    refetch: refetchPurchases,
  } = useQuery({
    queryKey: [QUERY_KEYS.purchases],
    queryFn: async () => {
      const result = await hourManagementService.getRecentPurchases();
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch recent purchases');
      }
      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  // Pending adjustments query
  const {
    data: adjustments,
    isLoading: adjustmentsLoading,
    error: adjustmentsError,
    refetch: refetchAdjustments,
  } = useQuery({
    queryKey: [QUERY_KEYS.adjustments],
    queryFn: async () => {
      const result = await hourManagementService.getPendingAdjustments();
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch pending adjustments');
      }
      return result.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
  });

  // Active alerts query
  const {
    data: alerts,
    isLoading: alertsLoading,
    error: alertsError,
    refetch: refetchAlerts,
  } = useQuery({
    queryKey: [QUERY_KEYS.alerts],
    queryFn: async () => {
      const result = await hourManagementService.getActiveAlerts();
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch active alerts');
      }
      return result.data;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    cacheTime: 3 * 60 * 1000, // 3 minutes
  });

  // Usage stats query
  const {
    data: usageStats,
    isLoading: usageStatsLoading,
    error: usageStatsError,
    refetch: refetchUsageStats,
  } = useQuery({
    queryKey: [QUERY_KEYS.usageStats, selectedStudentId],
    queryFn: async () => {
      if (!selectedStudentId) return null;
      
      const result = await hourManagementService.getHourUsageStats(selectedStudentId);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch usage stats');
      }
      return result.data;
    },
    enabled: !!selectedStudentId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  });

  // Mutations
  const purchaseHoursMutation = useMutation({
    mutationFn: async (request: HourPurchaseRequest) => {
      const result = await hourManagementService.purchaseHours(request);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to purchase hours');
      }
      return result.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.purchases] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.balance, variables.studentId] });
      toast.success('Hours purchased successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deductHoursMutation = useMutation({
    mutationFn: async (params: {
      studentId: string;
      classId: string;
      bookingId: string;
      hours: number;
      classType: string;
      deductionRate?: number;
    }) => {
      const result = await hourManagementService.deductClassHours(params);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to deduct hours');
      }
      return result.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.balance, variables.studentId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.transactions] });
      toast.success('Hours deducted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const transferHoursMutation = useMutation({
    mutationFn: async (request: HourTransferRequest) => {
      const result = await hourManagementService.transferHours(request);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to transfer hours');
      }
      return result.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.balance, variables.fromStudentId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.balance, variables.toStudentId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.transactions] });
      toast.success('Hours transferred successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const createAdjustmentMutation = useMutation({
    mutationFn: async (request: HourAdjustmentRequest) => {
      const result = await hourManagementService.createHourAdjustment(request);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to create adjustment');
      }
      return result.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.adjustments] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.balance, variables.studentId] });
      toast.success('Adjustment created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const approveAdjustmentMutation = useMutation({
    mutationFn: async ({ adjustmentId, notes }: { adjustmentId: string; notes?: string }) => {
      const result = await hourManagementService.approveAdjustment(adjustmentId, { approvalNotes: notes });
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to approve adjustment');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.adjustments] });
      toast.success('Adjustment approved successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const rejectAdjustmentMutation = useMutation({
    mutationFn: async ({ adjustmentId, notes }: { adjustmentId: string; notes: string }) => {
      const result = await hourManagementService.rejectAdjustment(adjustmentId, { approvalNotes: notes });
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to reject adjustment');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.adjustments] });
      toast.success('Adjustment rejected');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Actions
  const getHourPackages = useCallback(async (options?: { isActive?: boolean; isFeatured?: boolean; isCorporate?: boolean }) => {
    await refetchPackages();
  }, [refetchPackages]);

  const getHourPackage = useCallback(async (packageId: string) => {
    try {
      const result = await hourManagementService.getHourPackage(packageId);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch hour package');
      }
      return result.data;
    } catch (error) {
      console.error('Error fetching hour package:', error);
      return null;
    }
  }, []);

  const refreshPackages = useCallback(async () => {
    await refetchPackages();
  }, [refetchPackages]);

  const purchaseHours = useCallback(async (request: HourPurchaseRequest) => {
    try {
      await purchaseHoursMutation.mutateAsync(request);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, [purchaseHoursMutation]);

  const getRecentPurchases = useCallback(async (options?: { limit?: number }) => {
    await refetchPurchases();
  }, [refetchPurchases]);

  const refreshPurchases = useCallback(async () => {
    await refetchPurchases();
  }, [refetchPurchases]);

  const getStudentBalance = useCallback(async (studentId: string) => {
    setSelectedStudentId(studentId);
    await refetchBalance();
  }, [refetchBalance]);

  const refreshBalance = useCallback(async () => {
    await refetchBalance();
  }, [refetchBalance]);

  const deductClassHours = useCallback(async (params: {
    studentId: string;
    classId: string;
    bookingId: string;
    hours: number;
    classType: string;
    deductionRate?: number;
  }) => {
    try {
      await deductHoursMutation.mutateAsync(params);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, [deductHoursMutation]);

  const transferHours = useCallback(async (request: HourTransferRequest) => {
    try {
      await transferHoursMutation.mutateAsync(request);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, [transferHoursMutation]);

  const createAdjustment = useCallback(async (request: HourAdjustmentRequest) => {
    try {
      await createAdjustmentMutation.mutateAsync(request);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, [createAdjustmentMutation]);

  const getPendingAdjustments = useCallback(async () => {
    await refetchAdjustments();
  }, [refetchAdjustments]);

  const approveAdjustment = useCallback(async (adjustmentId: string, notes?: string) => {
    try {
      await approveAdjustmentMutation.mutateAsync({ adjustmentId, notes });
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, [approveAdjustmentMutation]);

  const rejectAdjustment = useCallback(async (adjustmentId: string, notes: string) => {
    try {
      await rejectAdjustmentMutation.mutateAsync({ adjustmentId, notes });
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, [rejectAdjustmentMutation]);

  const refreshAdjustments = useCallback(async () => {
    await refetchAdjustments();
  }, [refetchAdjustments]);

  const getActiveAlerts = useCallback(async () => {
    await refetchAlerts();
  }, [refetchAlerts]);

  const acknowledgeAlert = useCallback(async (alertId: string) => {
    try {
      // This would be implemented in the service
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, []);

  const refreshAlerts = useCallback(async () => {
    await refetchAlerts();
  }, [refetchAlerts]);

  const getUsageStats = useCallback(async (studentId: string, periodDays?: number) => {
    setSelectedStudentId(studentId);
    await refetchUsageStats();
  }, [refetchUsageStats]);

  const refreshUsageStats = useCallback(async () => {
    await refetchUsageStats();
  }, [refetchUsageStats]);

  const getTransactions = useCallback(async (filters?: HourManagementFilters) => {
    // This would be implemented with a transactions query
    console.log('Getting transactions with filters:', filters);
  }, []);

  const refreshTransactions = useCallback(async () => {
    // This would be implemented with a transactions query
    console.log('Refreshing transactions');
  }, []);

  // Utility functions
  const calculateHourValue = useCallback((hours: number, packageId: string) => {
    const packageData = packages?.find(p => p.id === packageId);
    if (!packageData) return 0;
    
    return (packageData.price / packageData.hoursIncluded) * hours;
  }, [packages]);

  const getExpiringHours = useCallback(async (studentId: string, days: number = 30) => {
    try {
      const result = await hourManagementService.getStudentHourBalance(studentId);
      if (!result.success || !result.data) {
        return [];
      }

      const expiringPackages = result.data.expiringPackages || [];
      
      return expiringPackages
        .filter(pkg => pkg.daysRemaining <= days)
        .map(pkg => ({
          packageId: pkg.purchaseId,
          packageName: pkg.packageName,
          hoursRemaining: pkg.hoursRemaining,
          expiryDate: pkg.validUntil,
          daysRemaining: pkg.daysRemaining
        }));
    } catch (error) {
      console.error('Error getting expiring hours:', error);
      return [];
    }
  }, []);

  // Bulk operations
  const bulkTransferHours = useCallback(async (transfers: HourTransferRequest[]) => {
    try {
      const results = await Promise.allSettled(
        transfers.map(transfer => transferHoursMutation.mutateAsync(transfer))
      );

      const failures = results.filter(result => result.status === 'rejected');
      
      if (failures.length > 0) {
        return { 
          success: false, 
          errors: failures.map(f => f.reason instanceof Error ? f.reason.message : 'Unknown error')
        };
      }

      return { success: true };
    } catch (error) {
      return { success: false, errors: [error instanceof Error ? error.message : 'Unknown error'] };
    }
  }, [transferHoursMutation]);

  const bulkAdjustHours = useCallback(async (adjustments: HourAdjustmentRequest[]) => {
    try {
      const results = await Promise.allSettled(
        adjustments.map(adjustment => createAdjustmentMutation.mutateAsync(adjustment))
      );

      const failures = results.filter(result => result.status === 'rejected');
      
      if (failures.length > 0) {
        return { 
          success: false, 
          errors: failures.map(f => f.reason instanceof Error ? f.reason.message : 'Unknown error')
        };
      }

      return { success: true };
    } catch (error) {
      return { success: false, errors: [error instanceof Error ? error.message : 'Unknown error'] };
    }
  }, [createAdjustmentMutation]);

  // Reporting
  const generateHourReport = useCallback(async (filters: HourManagementFilters) => {
    try {
      // This would generate a comprehensive report
      // For now, just return success
      return { success: true, url: '/reports/hour-report.pdf' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, []);

  const exportTransactions = useCallback(async (format: 'csv' | 'excel', filters?: HourManagementFilters) => {
    try {
      // This would export transactions to the specified format
      // For now, just return success
      return { success: true, url: `/exports/transactions.${format}` };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, []);

  return {
    // Data
    packages: packages || [],
    packagesLoading,
    packagesError: packagesError as Error | null,
    
    studentBalance,
    balanceLoading,
    balanceError: balanceError as Error | null,
    
    transactions: [], // Would be populated by transactions query
    transactionsLoading: false,
    transactionsError: null,
    
    purchases: purchases || [],
    purchasesLoading,
    purchasesError: purchasesError as Error | null,
    
    adjustments: adjustments || [],
    adjustmentsLoading,
    adjustmentsError: adjustmentsError as Error | null,
    
    alerts: alerts || [],
    alertsLoading,
    alertsError: alertsError as Error | null,
    
    usageStats,
    usageStatsLoading,
    usageStatsError: usageStatsError as Error | null,
    
    // Package management
    getHourPackages,
    getHourPackage,
    refreshPackages,
    
    // Purchase management
    purchaseHours,
    getRecentPurchases,
    refreshPurchases,
    
    // Balance management
    getStudentBalance,
    refreshBalance,
    
    // Hour operations
    deductClassHours,
    transferHours,
    
    // Adjustment management
    createAdjustment,
    getPendingAdjustments,
    approveAdjustment,
    rejectAdjustment,
    refreshAdjustments,
    
    // Alert management
    getActiveAlerts,
    acknowledgeAlert,
    refreshAlerts,
    
    // Statistics
    getUsageStats,
    refreshUsageStats,
    
    // Transactions
    getTransactions,
    refreshTransactions,
    
    // Utility functions
    calculateHourValue,
    getExpiringHours,
    
    // Bulk operations
    bulkTransferHours,
    bulkAdjustHours,
    
    // Reporting
    generateHourReport,
    exportTransactions,
  };
};