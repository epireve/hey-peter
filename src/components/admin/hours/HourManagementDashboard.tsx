'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Package, 
  Users, 
  Clock, 
  AlertCircle, 
  TrendingUp,
  Download,
  Plus,
  Edit,
  MoreHorizontal,
  Search,
  Filter,
  Calendar,
  DollarSign,
  RefreshCw,
  ArrowUpDown,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { hourManagementService } from '@/lib/services/hour-management-service';
import { leaveRulesService } from '@/lib/services/leave-rules-service';
import { LeaveRulesManagement } from './LeaveRulesManagement';
import { LeaveRequestsManagement } from './LeaveRequestsManagement';
import type {
  HourPackage,
  HourPurchase,
  HourTransaction,
  HourAdjustment,
  HourAlert,
  StudentHourBalance,
  HourManagementDashboard as DashboardData,
  PaymentStatus,
  ApprovalStatus,
  LeaveRequest
} from '@/types/hours';
import {
  PAYMENT_STATUS_COLORS,
  TRANSACTION_TYPE_LABELS,
  ALERT_TYPE_LABELS
} from '@/types/hours';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';

export function HourManagementDashboard() {
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

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load hour packages
      const packagesResult = await hourManagementService.getHourPackages({ isActive: true });
      if (packagesResult.success && packagesResult.data) {
        setPackages(packagesResult.data);
      }

      // Load recent purchases
      const purchasesResult = await hourManagementService.getRecentPurchases({ limit: 10 });
      if (purchasesResult.success && purchasesResult.data) {
        setRecentPurchases(purchasesResult.data);
      }

      // Load pending adjustments
      const adjustmentsResult = await hourManagementService.getPendingAdjustments();
      if (adjustmentsResult.success && adjustmentsResult.data) {
        setPendingAdjustments(adjustmentsResult.data);
      }

      // Load active alerts
      const alertsResult = await hourManagementService.getActiveAlerts();
      if (alertsResult.success && alertsResult.data) {
        setActiveAlerts(alertsResult.data);
      }

      // Load pending leave requests
      const leaveRequestsResult = await leaveRulesService.getPendingLeaveRequests(5);
      if (leaveRequestsResult.success && leaveRequestsResult.data) {
        setPendingLeaveRequests(leaveRequestsResult.data);
      }

      // Calculate dashboard metrics
      calculateDashboardMetrics();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateDashboardMetrics = () => {
    // This would aggregate data from various sources
    const metrics: DashboardData = {
      totalActiveHours: 0,
      totalStudentsWithHours: 0,
      lowBalanceAlerts: activeAlerts.filter(a => a.alertType === 'low_balance').length,
      expiringAlerts: activeAlerts.filter(a => a.alertType === 'expiring_soon').length,
      recentPurchases: [],
      recentAdjustments: [],
      packageStats: [],
      revenueByMonth: []
    };

    setDashboardData(metrics);
  };

  const handleApproveAdjustment = async (adjustmentId: string) => {
    try {
      const result = await hourManagementService.approveAdjustment(adjustmentId, {
        approvalNotes: 'Approved by admin'
      });

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Adjustment approved successfully',
        });
        loadDashboardData();
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
  };

  const handleRejectAdjustment = async (adjustmentId: string, reason: string) => {
    try {
      const result = await hourManagementService.rejectAdjustment(adjustmentId, {
        approvalNotes: reason
      });

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Adjustment rejected',
        });
        loadDashboardData();
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
  };

  const renderOverviewTab = () => (
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
            <CardDescription>Latest hour package purchases</CardDescription>
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
            <CardDescription>Awaiting approval</CardDescription>
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
                      onClick={() => handleApproveAdjustment(adjustment.id)}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        // Open rejection dialog
                      }}
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
            <CardDescription>Awaiting approval</CardDescription>
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
                      onClick={() => setActiveTab('leave-requests')}
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

      {/* Active Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Active Alerts</CardTitle>
          <CardDescription>Student hour balance alerts requiring attention</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Alert Type</TableHead>
                <TableHead>Hours Remaining</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeAlerts.map((alert) => (
                <TableRow key={alert.id}>
                  <TableCell className="font-medium">
                    Student {alert.studentId.slice(0, 8)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {ALERT_TYPE_LABELS[alert.alertType]}
                    </Badge>
                  </TableCell>
                  <TableCell>{alert.hoursRemaining || 0}</TableCell>
                  <TableCell>
                    {alert.expiryDate ? formatDate(alert.expiryDate) : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline">
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderPackagesTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Hour Packages</h3>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Package
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {packages.map((pkg) => (
          <Card key={pkg.id} className={pkg.isFeatured ? 'border-primary' : ''}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{pkg.name}</CardTitle>
                  <CardDescription>{pkg.description}</CardDescription>
                </div>
                {pkg.isFeatured && (
                  <Badge variant="secondary">Featured</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold">{pkg.hoursIncluded} hours</span>
                  <span className="text-xl font-semibold">
                    {formatCurrency(pkg.price, pkg.currency)}
                  </span>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  Valid for {pkg.validityDays} days
                </div>

                {pkg.features.length > 0 && (
                  <ul className="text-sm space-y-1">
                    {pkg.features.slice(0, 3).map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <CheckCircle className="h-3 w-3 mr-2 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      // Toggle active status
                    }}
                  >
                    {pkg.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderTransactionsTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Hour Transactions</h3>
        <div className="flex gap-2">
          <Input
            placeholder="Search by student..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
          <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Transaction rows would be mapped here */}
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  No transactions found
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderStudentBalancesTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Student Hour Balances</h3>
        <div className="flex gap-2">
          <Input
            placeholder="Search students..."
            className="w-64"
          />
          <Button onClick={() => setAdjustmentDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Manual Adjustment
          </Button>
          <Button variant="outline" onClick={() => setTransferDialogOpen(true)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Transfer Hours
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Total Hours</TableHead>
                <TableHead>Active Packages</TableHead>
                <TableHead>Next Expiry</TableHead>
                <TableHead>Alerts</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Student balance rows would be mapped here */}
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No student balances found
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Hour Management</h2>
          <p className="text-muted-foreground">
            Manage student hour packages, balances, and transactions
          </p>
        </div>
        <Button onClick={loadDashboardData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="packages">Packages</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="balances">Student Balances</TabsTrigger>
          <TabsTrigger value="leave-rules">Leave Rules</TabsTrigger>
          <TabsTrigger value="leave-requests">Leave Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          {renderOverviewTab()}
        </TabsContent>

        <TabsContent value="packages" className="mt-6">
          {renderPackagesTab()}
        </TabsContent>

        <TabsContent value="transactions" className="mt-6">
          {renderTransactionsTab()}
        </TabsContent>

        <TabsContent value="balances" className="mt-6">
          {renderStudentBalancesTab()}
        </TabsContent>

        <TabsContent value="leave-rules" className="mt-6">
          <LeaveRulesManagement />
        </TabsContent>

        <TabsContent value="leave-requests" className="mt-6">
          <LeaveRequestsManagement />
        </TabsContent>
      </Tabs>

      {/* Manual Adjustment Dialog */}
      <Dialog open={adjustmentDialogOpen} onOpenChange={setAdjustmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manual Hour Adjustment</DialogTitle>
            <DialogDescription>
              Add or subtract hours from a student's balance with a reason
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Student</Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a student" />
                </SelectTrigger>
                <SelectContent>
                  {/* Student options would be mapped here */}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Adjustment Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">Add Hours</SelectItem>
                    <SelectItem value="subtract">Subtract Hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Hours</Label>
                <Input type="number" placeholder="0" min="1" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                placeholder="Provide a detailed reason for this adjustment..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustmentDialogOpen(false)}>
              Cancel
            </Button>
            <Button>Submit Adjustment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Hours Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Hours</DialogTitle>
            <DialogDescription>
              Transfer hours between students (family accounts)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From Student</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Student options */}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>To Student</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Student options */}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Hours to Transfer</Label>
              <Input type="number" placeholder="0" min="1" />
            </div>
            <div className="space-y-2">
              <Label>Relationship</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="parent-child">Parent-Child</SelectItem>
                  <SelectItem value="siblings">Siblings</SelectItem>
                  <SelectItem value="spouse">Spouse</SelectItem>
                  <SelectItem value="other">Other Family</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                placeholder="Reason for transfer..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>
              Cancel
            </Button>
            <Button>Transfer Hours</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}