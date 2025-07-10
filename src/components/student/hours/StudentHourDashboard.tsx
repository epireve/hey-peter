'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LeaveRequestForm } from './LeaveRequestForm';
import { LeaveRequestList } from './LeaveRequestList';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Clock, 
  Calendar,
  TrendingDown,
  AlertCircle,
  Package,
  ShoppingCart,
  History,
  ChevronRight,
  Info,
  CheckCircle,
  XCircle,
  FileText,
  Plus
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { hourManagementService } from '@/lib/services/hour-management-service';
import type {
  StudentHourBalance,
  HourPackage,
  HourTransaction,
  HourUsageStats,
  HourAlert
} from '@/types/hours';
import {
  TRANSACTION_TYPE_LABELS,
  HOUR_PACKAGE_LABELS,
  ALERT_TYPE_LABELS
} from '@/types/hours';
import { formatDate, formatDateTime, formatCurrency } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface StudentHourDashboardProps {
  studentId: string;
}

export function StudentHourDashboard({ studentId }: StudentHourDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<StudentHourBalance | null>(null);
  const [packages, setPackages] = useState<HourPackage[]>([]);
  const [usageStats, setUsageStats] = useState<HourUsageStats | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<HourPackage | null>(null);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [leaveRequestDialogOpen, setLeaveRequestDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, [studentId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load hour balance
      const balanceResult = await hourManagementService.getStudentHourBalance(studentId);
      if (balanceResult.success && balanceResult.data) {
        setBalance(balanceResult.data);
      }

      // Load available packages
      const packagesResult = await hourManagementService.getHourPackages({ 
        isActive: true,
        isCorporate: false 
      });
      if (packagesResult.success && packagesResult.data) {
        setPackages(packagesResult.data);
      }

      // Load usage statistics
      const statsResult = await hourManagementService.getHourUsageStats(studentId, 90);
      if (statsResult.success && statsResult.data) {
        setUsageStats(statsResult.data);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load hour data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePurchasePackage = (pkg: HourPackage) => {
    setSelectedPackage(pkg);
    setPurchaseDialogOpen(true);
  };

  const confirmPurchase = async () => {
    if (!selectedPackage) return;

    try {
      // In a real app, this would redirect to payment gateway
      router.push(`/purchase/hours/${selectedPackage.id}`);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to initiate purchase',
        variant: 'destructive',
      });
    }
  };

  const handleLeaveRequestSuccess = () => {
    // Reload data to reflect any changes from leave request refunds
    loadData();
  };

  const renderAlerts = () => {
    if (!balance || balance.alerts.length === 0) return null;

    return (
      <div className="space-y-3">
        {balance.alerts.map((alert) => (
          <Alert key={alert.id} variant={alert.alertType === 'no_hours' ? 'destructive' : 'default'}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{ALERT_TYPE_LABELS[alert.alertType]}</AlertTitle>
            <AlertDescription>
              {alert.alertType === 'low_balance' && (
                <>You have only {alert.hoursRemaining} hours remaining. Consider purchasing more hours.</>
              )}
              {alert.alertType === 'expiring_soon' && (
                <>You have {alert.hoursRemaining} hours expiring on {formatDate(alert.expiryDate!)}.</>
              )}
              {alert.alertType === 'no_hours' && (
                <>You have no hours remaining. Purchase a package to continue booking classes.</>
              )}
            </AlertDescription>
          </Alert>
        ))}
      </div>
    );
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Alerts */}
      {renderAlerts()}

      {/* Hour Balance Card */}
      <Card>
        <CardHeader>
          <CardTitle>Your Hour Balance</CardTitle>
          <CardDescription>Total available hours across all packages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <div>
                <div className="text-3xl font-bold">{balance?.totalHours || 0} hours</div>
                <p className="text-sm text-muted-foreground">Available for booking</p>
              </div>
            </div>
            <Button onClick={() => setActiveTab('packages')}>
              <ShoppingCart className="h-4 w-4 mr-2" />
              Buy More Hours
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Packages */}
      <Card>
        <CardHeader>
          <CardTitle>Active Packages</CardTitle>
          <CardDescription>Your current hour packages and their validity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {balance?.activePackages.map((pkg) => (
              <div key={pkg.purchaseId} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium">{pkg.packageName}</h4>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span>{pkg.hoursRemaining} hours remaining</span>
                    <span>•</span>
                    <span>Valid until {formatDate(pkg.validUntil)}</span>
                  </div>
                </div>
                <div className="text-right">
                  {pkg.daysRemaining <= 30 && (
                    <Badge variant={pkg.daysRemaining <= 7 ? 'destructive' : 'secondary'}>
                      {pkg.daysRemaining} days left
                    </Badge>
                  )}
                </div>
              </div>
            ))}
            {(!balance?.activePackages || balance.activePackages.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No active packages</p>
                <Button variant="link" onClick={() => setActiveTab('packages')}>
                  Browse available packages
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Usage Summary */}
      {usageStats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hours Used This Month</CardTitle>
              <History className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {usageStats.usageByMonth[0]?.hoursUsed || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {usageStats.averageUsagePerWeek.toFixed(1)} hours/week average
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Most Active Day</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usageStats.mostActiveDay}</div>
              <p className="text-xs text-muted-foreground">
                Schedule preference
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Preferred Class</CardTitle>
              <Info className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usageStats.preferredClassType}</div>
              <p className="text-xs text-muted-foreground">
                Most booked type
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );

  const renderPackagesTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Available Packages</h3>
          <p className="text-sm text-muted-foreground">Choose a package that suits your learning needs</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {packages.map((pkg) => (
          <Card key={pkg.id} className={pkg.isFeatured ? 'border-primary shadow-lg' : ''}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{pkg.name}</CardTitle>
                  <CardDescription>{pkg.description}</CardDescription>
                </div>
                {pkg.isFeatured && (
                  <Badge variant="default">Popular</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center py-4">
                  <div className="text-3xl font-bold">{pkg.hoursIncluded} hours</div>
                  <div className="text-2xl font-semibold text-primary">
                    {formatCurrency(pkg.price, pkg.currency)}
                  </div>
                  {pkg.discountPercentage && pkg.discountPercentage > 0 && (
                    <Badge variant="secondary" className="mt-2">
                      Save {pkg.discountPercentage}%
                    </Badge>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-muted-foreground">
                    <Calendar className="h-4 w-4 mr-2" />
                    Valid for {pkg.validityDays} days
                  </div>
                  {pkg.features.slice(0, 3).map((feature, index) => (
                    <div key={index} className="flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      {feature}
                    </div>
                  ))}
                </div>

                <Button 
                  className="w-full" 
                  onClick={() => handlePurchasePackage(pkg)}
                >
                  Purchase Package
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderHistoryTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Your hour purchases and usage history</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {balance?.recentTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{formatDateTime(transaction.createdAt)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {TRANSACTION_TYPE_LABELS[transaction.transactionType]}
                    </Badge>
                  </TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell className={`text-right font-medium ${
                    transaction.hoursAmount > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.hoursAmount > 0 ? '+' : ''}{transaction.hoursAmount}
                  </TableCell>
                  <TableCell className="text-right">{transaction.balanceAfter}</TableCell>
                </TableRow>
              ))}
              {(!balance?.recentTransactions || balance.recentTransactions.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No transactions yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Usage Statistics */}
      {usageStats && (
        <Card>
          <CardHeader>
            <CardTitle>Usage Statistics</CardTitle>
            <CardDescription>Your learning patterns over the last 90 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Total Hours Used</span>
                  <span className="text-sm font-bold">{usageStats.totalHoursUsed}</span>
                </div>
                <Progress value={(usageStats.totalHoursUsed / usageStats.totalHoursPurchased) * 100} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-2">Usage by Class Type</p>
                  <div className="space-y-2">
                    {Object.entries(usageStats.usageByClassType).map(([type, hours]) => (
                      <div key={type} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{type}</span>
                        <span className="font-medium">{hours} hours</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Monthly Trend</p>
                  <div className="space-y-2">
                    {usageStats.usageByMonth.slice(0, 3).map((month) => (
                      <div key={month.month} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{month.month}</span>
                        <span className="font-medium">{month.hoursUsed} hours</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
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
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Hour Management</h2>
        <p className="text-muted-foreground">
          Track your hour balance, purchase packages, and view usage history
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="packages">Buy Hours</TabsTrigger>
          <TabsTrigger value="leaves">Leave Requests</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          {renderOverviewTab()}
        </TabsContent>

        <TabsContent value="packages" className="mt-6">
          {renderPackagesTab()}
        </TabsContent>

        <TabsContent value="leaves" className="mt-6">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Leave Requests</h3>
                <p className="text-sm text-muted-foreground">Manage your class leave requests and view refund status</p>
              </div>
              <Button onClick={() => setLeaveRequestDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Request Leave
              </Button>
            </div>
            
            <LeaveRequestList 
              studentId={studentId}
              onRequestUpdate={handleLeaveRequestSuccess}
            />
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          {renderHistoryTab()}
        </TabsContent>
      </Tabs>

      {/* Purchase Confirmation Dialog */}
      <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Purchase</DialogTitle>
            <DialogDescription>
              You are about to purchase the following package:
            </DialogDescription>
          </DialogHeader>
          {selectedPackage && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold">{selectedPackage.name}</h4>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Hours included:</span>
                    <span className="font-medium">{selectedPackage.hoursIncluded} hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Validity:</span>
                    <span className="font-medium">{selectedPackage.validityDays} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Price:</span>
                    <span className="font-medium">
                      {formatCurrency(selectedPackage.price, selectedPackage.currency)}
                    </span>
                  </div>
                </div>
              </div>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  You will be redirected to the payment page to complete your purchase.
                </AlertDescription>
              </Alert>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurchaseDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmPurchase}>
              Proceed to Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave Request Form Dialog */}
      <LeaveRequestForm
        studentId={studentId}
        open={leaveRequestDialogOpen}
        onOpenChange={setLeaveRequestDialogOpen}
        onSuccess={handleLeaveRequestSuccess}
      />
    </div>
  );
}