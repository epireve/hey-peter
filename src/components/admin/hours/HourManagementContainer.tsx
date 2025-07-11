'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { HourManagementPresentation } from './HourManagementPresentation';
import { hourManagementService } from '@/lib/services/hour-management-service';
import { leaveRulesService } from '@/lib/services/leave-rules-service';
import { useToast } from '@/components/ui/use-toast';
import type {
  HourPackage,
  HourPurchase,
  HourAdjustment,
  HourAlert,
  HourManagementDashboard as DashboardData,
  PaymentStatus,
  LeaveRequest
} from '@/types/hours';

/**
 * Container component for Hour Management Dashboard
 * Handles all business logic, data fetching, and state management
 */
export const HourManagementContainer: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [packages, setPackages] = useState<HourPackage[]>([]);
  const [recentPurchases, setRecentPurchases] = useState<HourPurchase[]>([]);
  const [pendingAdjustments, setPendingAdjustments] = useState<HourAdjustment[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<HourAlert[]>([]);
  const [pendingLeaveRequests, setPendingLeaveRequests] = useState<LeaveRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<PaymentStatus | 'all'>('all');
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load all dashboard data in parallel
      const [
        packagesResult,
        purchasesResult,
        adjustmentsResult,
        alertsResult,
        leaveRequestsResult
      ] = await Promise.all([
        hourManagementService.getHourPackages({ isActive: true }),
        hourManagementService.getRecentPurchases({ limit: 10 }),
        hourManagementService.getPendingAdjustments(),
        hourManagementService.getActiveAlerts(),
        leaveRulesService.getPendingLeaveRequests(5)
      ]);

      // Update state with results
      if (packagesResult.success && packagesResult.data) {
        setPackages(packagesResult.data);
      }

      if (purchasesResult.success && purchasesResult.data) {
        setRecentPurchases(purchasesResult.data);
      }

      if (adjustmentsResult.success && adjustmentsResult.data) {
        setPendingAdjustments(adjustmentsResult.data);
      }

      if (alertsResult.success && alertsResult.data) {
        setActiveAlerts(alertsResult.data);
      }

      if (leaveRequestsResult.success && leaveRequestsResult.data) {
        setPendingLeaveRequests(leaveRequestsResult.data);
      }

      // Calculate dashboard metrics
      const metrics = calculateDashboardMetrics();
      setDashboardData(metrics);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const calculateDashboardMetrics = useCallback((): DashboardData => {
    return {
      totalActiveHours: 0,
      totalStudentsWithHours: 0,
      lowBalanceAlerts: activeAlerts.filter(a => a.alertType === 'low_balance').length,
      expiringAlerts: activeAlerts.filter(a => a.alertType === 'expiring_soon').length,
      recentPurchases: [],
      recentAdjustments: [],
      packageStats: [],
      revenueByMonth: []
    };
  }, [activeAlerts]);

  const handleApproveAdjustment = useCallback(async (adjustmentId: string) => {
    try {
      const result = await hourManagementService.approveAdjustment(adjustmentId, {
        approvalNotes: 'Approved by admin'
      });

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Adjustment approved successfully',
        });
        await loadDashboardData();
      } else {
        throw new Error(result.error?.message);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to approve adjustment',
        variant: 'destructive',
      });
    }
  }, [toast, loadDashboardData]);

  const handleRejectAdjustment = useCallback(async (adjustmentId: string, reason: string) => {
    try {
      const result = await hourManagementService.rejectAdjustment(adjustmentId, {
        approvalNotes: reason
      });

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Adjustment rejected',
        });
        await loadDashboardData();
      } else {
        throw new Error(result.error?.message);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reject adjustment',
        variant: 'destructive',
      });
    }
  }, [toast, loadDashboardData]);

  const handleCreatePackage = useCallback(async (packageData: Partial<HourPackage>) => {
    try {
      const result = await hourManagementService.createHourPackage(packageData);
      
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Package created successfully',
        });
        await loadDashboardData();
      } else {
        throw new Error(result.error?.message);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create package',
        variant: 'destructive',
      });
    }
  }, [toast, loadDashboardData]);

  const handleUpdatePackage = useCallback(async (packageId: string, packageData: Partial<HourPackage>) => {
    try {
      const result = await hourManagementService.updateHourPackage(packageId, packageData);
      
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Package updated successfully',
        });
        await loadDashboardData();
      } else {
        throw new Error(result.error?.message);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update package',
        variant: 'destructive',
      });
    }
  }, [toast, loadDashboardData]);

  const handleManualAdjustment = useCallback(async (adjustmentData: any) => {
    try {
      const result = await hourManagementService.createAdjustment(adjustmentData);
      
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Adjustment created successfully',
        });
        setAdjustmentDialogOpen(false);
        await loadDashboardData();
      } else {
        throw new Error(result.error?.message);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create adjustment',
        variant: 'destructive',
      });
    }
  }, [toast, loadDashboardData]);

  const handleHourTransfer = useCallback(async (transferData: any) => {
    try {
      const result = await hourManagementService.transferHours(transferData);
      
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Hours transferred successfully',
        });
        setTransferDialogOpen(false);
        await loadDashboardData();
      } else {
        throw new Error(result.error?.message);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to transfer hours',
        variant: 'destructive',
      });
    }
  }, [toast, loadDashboardData]);

  return (
    <HourManagementPresentation
      activeTab={activeTab}
      loading={loading}
      dashboardData={dashboardData}
      packages={packages}
      recentPurchases={recentPurchases}
      pendingAdjustments={pendingAdjustments}
      activeAlerts={activeAlerts}
      pendingLeaveRequests={pendingLeaveRequests}
      searchTerm={searchTerm}
      filterStatus={filterStatus}
      selectedStudent={selectedStudent}
      adjustmentDialogOpen={adjustmentDialogOpen}
      transferDialogOpen={transferDialogOpen}
      onActiveTabChange={setActiveTab}
      onSearchTermChange={setSearchTerm}
      onFilterStatusChange={setFilterStatus}
      onSelectedStudentChange={setSelectedStudent}
      onAdjustmentDialogOpenChange={setAdjustmentDialogOpen}
      onTransferDialogOpenChange={setTransferDialogOpen}
      onRefresh={loadDashboardData}
      onApproveAdjustment={handleApproveAdjustment}
      onRejectAdjustment={handleRejectAdjustment}
      onCreatePackage={handleCreatePackage}
      onUpdatePackage={handleUpdatePackage}
      onManualAdjustment={handleManualAdjustment}
      onHourTransfer={handleHourTransfer}
    />
  );
};

HourManagementContainer.displayName = 'HourManagementContainer';