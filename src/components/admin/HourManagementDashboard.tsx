'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Clock, 
  DollarSign, 
  TrendingUp, 
  Users, 
  AlertTriangle,
  Calendar,
  Award,
  Download,
  Search,
  RefreshCw,
  Settings,
  PieChart
} from 'lucide-react';
import { 
  hourTrackingService,
  teacherHourTrackingService,
  leaveRequestService
} from '@/lib/services';
import { 
  HourAnalytics,
  LeaveRequestAnalytics,
  HourTransactionWithDetails,
  StudentHourSummary
} from '@/types/hour-management';

interface HourManagementDashboardProps {
  onManualAdjustment?: () => void;
  onPolicySettings?: () => void;
}

export function HourManagementDashboard({ 
  onManualAdjustment, 
  onPolicySettings 
}: HourManagementDashboardProps) {
  const [hourAnalytics, setHourAnalytics] = useState<HourAnalytics | null>(null);
  const [leaveAnalytics, setLeaveAnalytics] = useState<LeaveRequestAnalytics | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<HourTransactionWithDetails[]>([]);
  const [lowBalanceStudents, setLowBalanceStudents] = useState<any[]>([]);
  const [expiringHours, setExpiringHours] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [
        hourAnalyticsResponse,
        leaveAnalyticsResponse,
        transactionsResponse,
        warningsResponse
      ] = await Promise.all([
        hourTrackingService.getHourAnalytics(),
        leaveRequestService.getLeaveRequestAnalytics(),
        hourTrackingService.getHourTransactions({}, 1, 50),
        hourTrackingService.processExpirationWarnings()
      ]);
      
      if (hourAnalyticsResponse.success && hourAnalyticsResponse.data) {
        setHourAnalytics(hourAnalyticsResponse.data);
      }
      
      if (leaveAnalyticsResponse.success && leaveAnalyticsResponse.data) {
        setLeaveAnalytics(leaveAnalyticsResponse.data);
      }
      
      if (transactionsResponse.success && transactionsResponse.data) {
        setRecentTransactions(transactionsResponse.data.data);
      }
      
      // Load additional data for low balance and expiring hours
      await loadStudentAlerts();
      
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStudentAlerts = async () => {
    // This would typically come from a dedicated API endpoint
    // For now, we'll simulate this data
    setLowBalanceStudents([
      { id: '1', name: 'John Doe', student_id: 'HPA001', balance: 2.5 },
      { id: '2', name: 'Jane Smith', student_id: 'HPA002', balance: 1.0 },
    ]);
    
    setExpiringHours([
      { id: '1', student_name: 'Mike Johnson', hours: 5.0, expiration_date: '2024-07-15' },
      { id: '2', student_name: 'Sarah Wilson', hours: 3.5, expiration_date: '2024-07-18' },
    ]);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatHours = (hours: number) => {
    return hours.toFixed(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'purchase':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'deduction':
        return <Clock className="h-4 w-4 text-red-500" />;
      case 'refund':
        return <RefreshCw className="h-4 w-4 text-blue-500" />;
      case 'bonus':
        return <Award className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const exportAnalytics = () => {
    if (!hourAnalytics) return;
    
    const data = {
      summary: hourAnalytics,
      leave_analytics: leaveAnalytics,
      export_date: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hour-analytics-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Hour Management Dashboard</h1>
        <div className="flex items-center space-x-2">
          {onPolicySettings && (
            <Button variant="outline" onClick={onPolicySettings}>
              <Settings className="h-4 w-4 mr-2" />
              Policies
            </Button>
          )}
          {onManualAdjustment && (
            <Button variant="outline" onClick={onManualAdjustment}>
              <Settings className="h-4 w-4 mr-2" />
              Manual Adjustment
            </Button>
          )}
          <Button variant="outline" onClick={exportAnalytics}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={loadDashboardData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {hourAnalytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <Users className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Students</p>
                  <p className="text-2xl font-bold">{hourAnalytics.total_students_with_hours}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <Clock className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Hours in Circulation</p>
                  <p className="text-2xl font-bold">{formatHours(hourAnalytics.total_hours_in_circulation)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <DollarSign className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold">{formatCurrency(hourAnalytics.total_revenue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-8 w-8 text-orange-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
                  <p className="text-2xl font-bold">{hourAnalytics.expiring_soon_count}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Low Balance Students */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
              Low Balance Students ({lowBalanceStudents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowBalanceStudents.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No students with low balance</p>
            ) : (
              <div className="space-y-2">
                {lowBalanceStudents.map((student) => (
                  <div key={student.id} className="flex items-center justify-between p-2 bg-orange-50 rounded">
                    <div>
                      <p className="font-medium">{student.name}</p>
                      <p className="text-sm text-gray-600">{student.student_id}</p>
                    </div>
                    <Badge variant="destructive">{formatHours(student.balance)} hrs</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expiring Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-red-500" />
              Hours Expiring Soon ({expiringHours.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expiringHours.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No hours expiring soon</p>
            ) : (
              <div className="space-y-2">
                {expiringHours.map((expiry) => (
                  <div key={expiry.id} className="flex items-center justify-between p-2 bg-red-50 rounded">
                    <div>
                      <p className="font-medium">{expiry.student_name}</p>
                      <p className="text-sm text-gray-600">Expires: {formatDate(expiry.expiration_date)}</p>
                    </div>
                    <Badge variant="destructive">{formatHours(expiry.hours)} hrs</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
          <TabsTrigger value="analytics">Hour Analytics</TabsTrigger>
          <TabsTrigger value="leave">Leave Analytics</TabsTrigger>
        </TabsList>

        {/* Recent Transactions */}
        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Recent Hour Transactions</span>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Search transactions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Balance After</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentTransactions
                      .filter(transaction => 
                        !searchTerm || 
                        transaction.student?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        transaction.description?.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .slice(0, 20)
                      .map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            {formatDate(transaction.created_at)}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{transaction.student?.full_name}</p>
                              <p className="text-sm text-gray-500">{transaction.student?.student_id}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {getTransactionIcon(transaction.transaction_type)}
                              <Badge variant="outline">
                                {transaction.transaction_type}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`font-medium ${
                              ['purchase', 'refund', 'bonus'].includes(transaction.transaction_type)
                                ? 'text-green-600' 
                                : 'text-red-600'
                            }`}>
                              {['purchase', 'refund', 'bonus'].includes(transaction.transaction_type) ? '+' : '-'}
                              {formatHours(transaction.amount)} hrs
                            </span>
                          </TableCell>
                          <TableCell>
                            {formatHours(transaction.balance_after)} hrs
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs">
                              <p className="text-sm">{transaction.description}</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hour Analytics */}
        <TabsContent value="analytics" className="space-y-4">
          {hourAnalytics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <PieChart className="h-5 w-5 mr-2 text-blue-500" />
                    Usage by Course Type
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(hourAnalytics.by_course_type).map(([courseType, stats]) => (
                      <div key={courseType}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{courseType}</span>
                          <span>{formatHours(stats.hours_used)} hrs ({stats.students_count} students)</span>
                        </div>
                        <Progress 
                          value={(stats.hours_used / hourAnalytics.total_hours_in_circulation) * 100} 
                          className="h-2" 
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Monthly Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">
                          {formatHours(hourAnalytics.hours_used_this_month)}
                        </p>
                        <p className="text-sm text-gray-500">Hours Used</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">
                          {formatHours(hourAnalytics.hours_purchased_this_month)}
                        </p>
                        <p className="text-sm text-gray-500">Hours Purchased</p>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-600">
                          {formatHours(hourAnalytics.average_usage_per_student)}
                        </p>
                        <p className="text-sm text-gray-500">Avg Usage per Student</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Leave Analytics */}
        <TabsContent value="leave" className="space-y-4">
          {leaveAnalytics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Leave Request Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{leaveAnalytics.total_requests}</p>
                      <p className="text-sm text-gray-500">Total Requests</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{leaveAnalytics.approved_requests}</p>
                      <p className="text-sm text-gray-500">Approved</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">{leaveAnalytics.rejected_requests}</p>
                      <p className="text-sm text-gray-500">Rejected</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-600">{leaveAnalytics.pending_requests}</p>
                      <p className="text-sm text-gray-500">Pending</p>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-4 border-t">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Approval Rate</span>
                      <span>
                        {leaveAnalytics.total_requests > 0 
                          ? ((leaveAnalytics.approved_requests / leaveAnalytics.total_requests) * 100).toFixed(1)
                          : 0
                        }%
                      </span>
                    </div>
                    <Progress 
                      value={leaveAnalytics.total_requests > 0 
                        ? (leaveAnalytics.approved_requests / leaveAnalytics.total_requests) * 100
                        : 0
                      } 
                      className="h-2" 
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Leave Impact</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-red-600">
                          {formatHours(leaveAnalytics.total_hours_affected)}
                        </p>
                        <p className="text-sm text-gray-500">Hours Affected</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">
                          {formatHours(leaveAnalytics.total_hours_recovered)}
                        </p>
                        <p className="text-sm text-gray-500">Hours Recovered</p>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">
                          {leaveAnalytics.average_processing_time_days.toFixed(1)}
                        </p>
                        <p className="text-sm text-gray-500">Avg Processing Days</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default HourManagementDashboard;