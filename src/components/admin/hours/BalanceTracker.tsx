'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, TrendingUp, TrendingDown, Calendar, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { hourUsageAnalyticsService } from '@/lib/services/hour-usage-analytics-service';
import { hourManagementService } from '@/lib/services/hour-management-service';
import type { StudentHourBalance, LowBalanceAlert, BalanceTrend } from '@/types/hours';

interface BalanceTrackerProps {
  studentId: string;
  className?: string;
}

export function BalanceTracker({ studentId, className }: BalanceTrackerProps) {
  const [balance, setBalance] = useState<StudentHourBalance | null>(null);
  const [balanceTrend, setBalanceTrend] = useState<BalanceTrend | null>(null);
  const [lowBalanceAlerts, setLowBalanceAlerts] = useState<LowBalanceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBalanceData();
  }, [studentId]);

  const loadBalanceData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [balanceResult, trendResult, alertsResult] = await Promise.all([
        hourManagementService.getStudentHourBalance(studentId),
        hourUsageAnalyticsService.getBalanceTrend(studentId, 90),
        hourUsageAnalyticsService.generateLowBalanceAlerts(studentId)
      ]);

      if (balanceResult.success) {
        setBalance(balanceResult.data);
      } else {
        throw new Error(balanceResult.error?.message || 'Failed to load balance');
      }

      if (trendResult.success) {
        setBalanceTrend(trendResult.data);
      }

      if (alertsResult.success) {
        setLowBalanceAlerts(alertsResult.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatHours = (hours: number) => {
    return hours.toFixed(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getBalanceStatus = (hours: number) => {
    if (hours <= 2) return { status: 'critical', color: 'text-red-600', bgColor: 'bg-red-50' };
    if (hours <= 5) return { status: 'low', color: 'text-orange-600', bgColor: 'bg-orange-50' };
    if (hours <= 10) return { status: 'medium', color: 'text-yellow-600', bgColor: 'bg-yellow-50' };
    return { status: 'good', color: 'text-green-600', bgColor: 'bg-green-50' };
  };

  const getExpiryStatus = (validUntil: string) => {
    const daysUntilExpiry = Math.ceil((new Date(validUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry <= 7) return { status: 'critical', color: 'text-red-600' };
    if (daysUntilExpiry <= 30) return { status: 'warning', color: 'text-orange-600' };
    return { status: 'good', color: 'text-green-600' };
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Calendar className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading balance data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-600">{error}</p>
          <Button onClick={loadBalanceData} variant="outline" size="sm" className="mt-2">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!balance) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">No balance data available</p>
      </div>
    );
  }

  const balanceStatus = getBalanceStatus(balance.totalHours);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Balance Overview */}
      <Card className={`${balanceStatus.bgColor} border-2`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className={`text-2xl ${balanceStatus.color}`}>
                {formatHours(balance.totalHours)} Hours
              </CardTitle>
              <CardDescription>Current Balance</CardDescription>
            </div>
            <Badge 
              variant={balanceStatus.status === 'critical' ? 'destructive' : 'default'}
              className="capitalize"
            >
              {balanceStatus.status}
            </Badge>
          </div>
        </CardHeader>
        {balanceTrend && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                {getTrendIcon(balanceTrend.trend)}
                <div>
                  <p className="text-sm font-medium">Trend</p>
                  <p className="text-sm text-gray-600 capitalize">{balanceTrend.trend}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium">Daily Usage</p>
                <p className="text-sm text-gray-600">{formatHours(balanceTrend.averageDailyUsage)} hrs/day</p>
              </div>
              <div>
                <p className="text-sm font-medium">Net Change</p>
                <p className={`text-sm ${balanceTrend.netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {balanceTrend.netChange >= 0 ? '+' : ''}{formatHours(balanceTrend.netChange)} hrs
                </p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Critical Alerts */}
      {lowBalanceAlerts.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <CardTitle className="text-red-800">Balance Alerts</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lowBalanceAlerts.map((alert) => (
                <div key={alert.id} className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge className={getSeverityColor(alert.severity)}>
                          {alert.severity.toUpperCase()}
                        </Badge>
                        <span className="text-sm font-medium">
                          {alert.daysRemaining} days remaining
                        </span>
                      </div>
                      <p className="font-medium mb-1">{alert.recommendedAction}</p>
                      <p className="text-sm text-gray-600">
                        Current: {formatHours(alert.currentBalance)} hrs • 
                        Usage rate: {formatHours(alert.recentUsageRate)} hrs/day • 
                        Upcoming classes: {alert.upcomingClasses}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        Recommended: {alert.recommendedPackageSize} hrs
                      </p>
                      <div className="flex items-center space-x-1 mt-1">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <span className="text-xs text-gray-500">
                          Urgency: {alert.urgencyLevel}/10
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Balance Details */}
      <Tabs defaultValue="packages" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="packages">Active Packages</TabsTrigger>
          <TabsTrigger value="trend">Balance Trend</TabsTrigger>
          <TabsTrigger value="transactions">Recent Activity</TabsTrigger>
        </TabsList>

        {/* Active Packages */}
        <TabsContent value="packages">
          <div className="space-y-4">
            {/* Active Packages */}
            <Card>
              <CardHeader>
                <CardTitle>Active Hour Packages</CardTitle>
                <CardDescription>
                  Currently active packages with remaining hours
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {balance.activePackages.map((pkg) => {
                    const expiryStatus = getExpiryStatus(pkg.validUntil);
                    const progressPercentage = (pkg.hoursRemaining / (pkg.hoursRemaining + 10)) * 100; // Approximate
                    
                    return (
                      <div key={pkg.purchaseId} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{pkg.packageName}</h4>
                          <Badge className={expiryStatus.color}>
                            {pkg.daysRemaining} days
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Hours Remaining</span>
                            <span className="font-medium">{formatHours(pkg.hoursRemaining)}</span>
                          </div>
                          <Progress value={progressPercentage} className="h-2" />
                          <div className="flex justify-between text-xs text-gray-600">
                            <span>Expires: {formatDate(pkg.validUntil)}</span>
                            <span>{pkg.daysRemaining} days remaining</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {balance.activePackages.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No active packages
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Expiring Packages */}
            {balance.expiringPackages.length > 0 && (
              <Card className="border-orange-200">
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-orange-500" />
                    <CardTitle className="text-orange-800">Expiring Soon</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {balance.expiringPackages.map((pkg) => (
                      <div key={pkg.purchaseId} className="p-3 bg-orange-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-orange-900">{pkg.packageName}</h4>
                            <p className="text-sm text-orange-700">
                              {formatHours(pkg.hoursRemaining)} hours remaining
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-orange-800">
                              {pkg.daysRemaining} days
                            </p>
                            <p className="text-xs text-orange-600">
                              Expires {formatDate(pkg.validUntil)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Balance Trend */}
        <TabsContent value="trend">
          {balanceTrend && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Balance Trend Analysis</CardTitle>
                  <CardDescription>
                    90-day balance trend with usage patterns
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={balanceTrend.recommendations}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Area 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#3b82f6" 
                          fill="#3b82f6" 
                          fillOpacity={0.3}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Usage Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Hours Used</span>
                        <span className="font-medium">{formatHours(balanceTrend.totalHoursUsed)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Hours Purchased</span>
                        <span className="font-medium">{formatHours(balanceTrend.totalHoursPurchased)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Usage Variability</span>
                        <span className="font-medium">{Math.round(balanceTrend.usageVariability * 100)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Purchase Frequency</span>
                        <span className="font-medium">{formatHours(balanceTrend.purchaseFrequency)}/month</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {balanceTrend.recommendations.map((rec, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant={rec.priority === 'high' ? 'destructive' : 'default'}>
                              {rec.priority}
                            </Badge>
                            <span className="text-xs text-gray-500 capitalize">{rec.type}</span>
                          </div>
                          <p className="text-sm">{rec.message}</p>
                          {rec.actionRequired && (
                            <div className="flex items-center space-x-1 mt-2">
                              <AlertCircle className="h-3 w-3 text-red-500" />
                              <span className="text-xs text-red-600">Action Required</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Recent Transactions */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest hour transactions and balance changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {balance.recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        transaction.hoursAmount > 0 ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-sm text-gray-600">
                          {formatDate(transaction.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${
                        transaction.hoursAmount > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.hoursAmount > 0 ? '+' : ''}{formatHours(transaction.hoursAmount)} hrs
                      </p>
                      <p className="text-sm text-gray-600">
                        Balance: {formatHours(transaction.balanceAfter)} hrs
                      </p>
                    </div>
                  </div>
                ))}
                {balance.recentTransactions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No recent transactions
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}