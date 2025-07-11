'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  Users, 
  AlertCircle, 
  Calendar,
  RefreshCw,
  CheckCircle,
  XCircle,
  Plus,
  Edit
} from 'lucide-react';
import { LeaveRulesManagement } from './LeaveRulesManagement';
import { LeaveRequestsManagement } from './LeaveRequestsManagement';
import { OverviewTab } from './components/OverviewTab';
import { PackagesTab } from './components/PackagesTab';
import { TransactionsTab } from './components/TransactionsTab';
import { StudentBalancesTab } from './components/StudentBalancesTab';
import { ManualAdjustmentDialog } from './dialogs/ManualAdjustmentDialog';
import { HourTransferDialog } from './dialogs/HourTransferDialog';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import {
  PAYMENT_STATUS_COLORS,
  TRANSACTION_TYPE_LABELS,
  ALERT_TYPE_LABELS
} from '@/types/hours';
import type {
  HourPackage,
  HourPurchase,
  HourAdjustment,
  HourAlert,
  HourManagementDashboard as DashboardData,
  PaymentStatus,
  LeaveRequest
} from '@/types/hours';

export interface HourManagementPresentationProps {
  activeTab: string;
  loading: boolean;
  dashboardData: DashboardData | null;
  packages: HourPackage[];
  recentPurchases: HourPurchase[];
  pendingAdjustments: HourAdjustment[];
  activeAlerts: HourAlert[];
  pendingLeaveRequests: LeaveRequest[];
  searchTerm: string;
  filterStatus: PaymentStatus | 'all';
  selectedStudent: string;
  adjustmentDialogOpen: boolean;
  transferDialogOpen: boolean;
  onActiveTabChange: (tab: string) => void;
  onSearchTermChange: (search: string) => void;
  onFilterStatusChange: (status: PaymentStatus | 'all') => void;
  onSelectedStudentChange: (student: string) => void;
  onAdjustmentDialogOpenChange: (open: boolean) => void;
  onTransferDialogOpenChange: (open: boolean) => void;
  onRefresh: () => void;
  onApproveAdjustment: (adjustmentId: string) => void;
  onRejectAdjustment: (adjustmentId: string, reason: string) => void;
  onCreatePackage: (packageData: Partial<HourPackage>) => void;
  onUpdatePackage: (packageId: string, packageData: Partial<HourPackage>) => void;
  onManualAdjustment: (adjustmentData: any) => void;
  onHourTransfer: (transferData: any) => void;
}

/**
 * Presentational component for Hour Management Dashboard
 * Handles all UI rendering without any business logic
 */
export const HourManagementPresentation: React.FC<HourManagementPresentationProps> = ({
  activeTab,
  loading,
  dashboardData,
  packages,
  recentPurchases,
  pendingAdjustments,
  activeAlerts,
  pendingLeaveRequests,
  searchTerm,
  filterStatus,
  selectedStudent,
  adjustmentDialogOpen,
  transferDialogOpen,
  onActiveTabChange,
  onSearchTermChange,
  onFilterStatusChange,
  onSelectedStudentChange,
  onAdjustmentDialogOpenChange,
  onTransferDialogOpenChange,
  onRefresh,
  onApproveAdjustment,
  onRejectAdjustment,
  onCreatePackage,
  onUpdatePackage,
  onManualAdjustment,
  onHourTransfer,
}) => {
  if (loading) {
    return <HourManagementSkeleton />;
  }

  return (
    <div className="space-y-6">
      <HourManagementHeader onRefresh={onRefresh} />

      <Tabs value={activeTab} onValueChange={onActiveTabChange}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="packages">Packages</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="balances">Student Balances</TabsTrigger>
          <TabsTrigger value="leave-rules">Leave Rules</TabsTrigger>
          <TabsTrigger value="leave-requests">Leave Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab
            dashboardData={dashboardData}
            recentPurchases={recentPurchases}
            pendingAdjustments={pendingAdjustments}
            activeAlerts={activeAlerts}
            pendingLeaveRequests={pendingLeaveRequests}
            onApproveAdjustment={onApproveAdjustment}
            onRejectAdjustment={onRejectAdjustment}
            onNavigateToTab={onActiveTabChange}
          />
        </TabsContent>

        <TabsContent value="packages" className="mt-6">
          <PackagesTab
            packages={packages}
            onCreatePackage={onCreatePackage}
            onUpdatePackage={onUpdatePackage}
          />
        </TabsContent>

        <TabsContent value="transactions" className="mt-6">
          <TransactionsTab
            searchTerm={searchTerm}
            filterStatus={filterStatus}
            onSearchTermChange={onSearchTermChange}
            onFilterStatusChange={onFilterStatusChange}
          />
        </TabsContent>

        <TabsContent value="balances" className="mt-6">
          <StudentBalancesTab
            selectedStudent={selectedStudent}
            onSelectedStudentChange={onSelectedStudentChange}
            onAdjustmentDialogOpen={() => onAdjustmentDialogOpenChange(true)}
            onTransferDialogOpen={() => onTransferDialogOpenChange(true)}
          />
        </TabsContent>

        <TabsContent value="leave-rules" className="mt-6">
          <LeaveRulesManagement />
        </TabsContent>

        <TabsContent value="leave-requests" className="mt-6">
          <LeaveRequestsManagement />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ManualAdjustmentDialog
        open={adjustmentDialogOpen}
        onOpenChange={onAdjustmentDialogOpenChange}
        selectedStudent={selectedStudent}
        onSubmit={onManualAdjustment}
      />

      <HourTransferDialog
        open={transferDialogOpen}
        onOpenChange={onTransferDialogOpenChange}
        onSubmit={onHourTransfer}
      />
    </div>
  );
};

HourManagementPresentation.displayName = 'HourManagementPresentation';

/**
 * Header Component
 */
const HourManagementHeader: React.FC<{ onRefresh: () => void }> = ({ onRefresh }) => (
  <div className="flex justify-between items-center">
    <div>
      <h2 className="text-3xl font-bold tracking-tight">Hour Management</h2>
      <p className="text-muted-foreground">
        Manage student hour packages, balances, and transactions
      </p>
    </div>
    <Button onClick={onRefresh}>
      <RefreshCw className="h-4 w-4 mr-2" />
      Refresh
    </Button>
  </div>
);

/**
 * Loading Skeleton Component
 */
const HourManagementSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-9 w-24" />
    </div>

    <div className="grid w-full grid-cols-6 gap-2">
      {[...Array(6)].map((_, i) => (
        <Skeleton key={i} className="h-9" />
      ))}
    </div>

    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>

    <div className="grid gap-6 md:grid-cols-3">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="flex items-center justify-between">
                  <div className="flex flex-col space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);