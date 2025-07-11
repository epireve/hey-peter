'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Users, AlertCircle, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { PAYMENT_STATUS_COLORS, ALERT_TYPE_LABELS } from '@/types/hours';
import type {
  HourPurchase,
  HourAdjustment,
  HourAlert,
  HourManagementDashboard as DashboardData,
  LeaveRequest
} from '@/types/hours';

interface OverviewTabProps {
  dashboardData: DashboardData | null;
  recentPurchases: HourPurchase[];
  pendingAdjustments: HourAdjustment[];
  activeAlerts: HourAlert[];
  pendingLeaveRequests: LeaveRequest[];
  onApproveAdjustment: (adjustmentId: string) => void;
  onRejectAdjustment: (adjustmentId: string, reason: string) => void;
  onNavigateToTab: (tab: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  dashboardData,
  recentPurchases,
  pendingAdjustments,
  activeAlerts,
  pendingLeaveRequests,
  onApproveAdjustment,
  onRejectAdjustment,
  onNavigateToTab,
}) => {
  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Active Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData?.totalActiveHours.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all active students
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Students with Hours</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData?.totalStudentsWithHours || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Active hour balances
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Balance Alerts</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {dashboardData?.lowBalanceAlerts || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Students with &lt;5 hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {dashboardData?.expiringAlerts || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Within 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Recent Purchases */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Purchases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentPurchases.slice(0, 5).map((purchase) => (
                <div key={purchase.id} className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {purchase.hoursPurchased} hours
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(purchase.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={PAYMENT_STATUS_COLORS[purchase.paymentStatus]}>
                      {purchase.paymentStatus}
                    </Badge>
                    <span className="text-sm font-medium">
                      {formatCurrency(purchase.pricePaid, purchase.currency)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pending Adjustments */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Adjustments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingAdjustments.slice(0, 5).map((adjustment) => (
                <div key={adjustment.id} className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {adjustment.adjustmentType === 'add' ? '+' : '-'}
                      {adjustment.hoursAdjusted} hours
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {adjustment.reason}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onApproveAdjustment(adjustment.id)}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onRejectAdjustment(adjustment.id, '')}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pending Leave Requests */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Leave Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingLeaveRequests.slice(0, 5).map((request) => (
                <div key={request.id} className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {request.leaveType} leave
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(request.startDate)} - {formatDate(request.endDate)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {request.totalHoursRequested} hours
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onNavigateToTab('leave-requests')}
                    >
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};