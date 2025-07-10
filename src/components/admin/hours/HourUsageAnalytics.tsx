'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, TrendingUp, TrendingDown, Clock, Users, Calendar, Target, BarChart3, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { hourUsageAnalyticsService } from '@/lib/services/hour-usage-analytics-service';
import type { HourUsageAnalytics, BalanceTrend, ConsumptionPattern, LowBalanceAlert, HourUsageReport } from '@/types/hours';

interface HourUsageAnalyticsProps {
  studentId?: string;
  className?: string;
}

export function HourUsageAnalytics({ studentId, className }: HourUsageAnalyticsProps) {
  const [analytics, setAnalytics] = useState<HourUsageAnalytics | null>(null);
  const [balanceTrend, setBalanceTrend] = useState<BalanceTrend | null>(null);
  const [consumptionPatterns, setConsumptionPatterns] = useState<ConsumptionPattern[]>([]);
  const [lowBalanceAlerts, setLowBalanceAlerts] = useState<LowBalanceAlert[]>([]);
  const [usageReport, setUsageReport] = useState<HourUsageReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('90');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(studentId || '');

  useEffect(() => {
    if (selectedStudentId) {
      loadAnalytics();
    }
  }, [selectedStudentId, selectedPeriod]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const periodDays = parseInt(selectedPeriod);

      // Load all analytics data
      const [
        analyticsResult,
        trendResult,
        patternsResult,
        alertsResult,
        reportResult
      ] = await Promise.all([
        hourUsageAnalyticsService.getStudentUsageAnalytics(selectedStudentId, periodDays),
        hourUsageAnalyticsService.getBalanceTrend(selectedStudentId, periodDays),
        hourUsageAnalyticsService.getConsumptionPatterns(selectedStudentId),
        hourUsageAnalyticsService.generateLowBalanceAlerts(selectedStudentId),
        hourUsageAnalyticsService.generateUsageReport('student', periodDays, { studentIds: [selectedStudentId] })
      ]);

      if (analyticsResult.success) {
        setAnalytics(analyticsResult.data);
      } else {
        throw new Error(analyticsResult.error?.message || 'Failed to load analytics');
      }

      if (trendResult.success) {
        setBalanceTrend(trendResult.data);
      }

      if (patternsResult.success) {
        setConsumptionPatterns(patternsResult.data);
      }

      if (alertsResult.success) {
        setLowBalanceAlerts(alertsResult.data);
      }

      if (reportResult.success) {
        setUsageReport(reportResult.data);
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

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <BarChart3 className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading analytics...</p>
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
          <Button onClick={loadAnalytics} variant="outline" size="sm" className="mt-2">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="space-y-4">
            <Label htmlFor="student-select">Select Student</Label>
            <Input
              id="student-select"
              placeholder="Enter student ID"
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
            />
            <Button onClick={loadAnalytics} disabled={!selectedStudentId}>
              Load Analytics
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Hour Usage Analytics</h1>
          <p className="text-gray-600">Student ID: {analytics.studentId}</p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 Days</SelectItem>
              <SelectItem value="90">90 Days</SelectItem>
              <SelectItem value="180">6 Months</SelectItem>
              <SelectItem value="365">1 Year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={loadAnalytics} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      </div>

      {/* Critical Alerts */}
      {lowBalanceAlerts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <CardTitle className="text-red-800">Critical Alerts</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowBalanceAlerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Badge className={getSeverityColor(alert.severity)}>
                      {alert.severity.toUpperCase()}
                    </Badge>
                    <div>
                      <p className="font-medium">{alert.recommendedAction}</p>
                      <p className="text-sm text-gray-600">
                        {alert.currentBalance} hours remaining • {alert.daysRemaining} days
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">Recommended: {alert.recommendedPackageSize} hours</p>
                    <p className="text-xs text-gray-500">Urgency: {alert.urgencyLevel}/10</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatHours(analytics.currentBalance)} hrs</div>
            <div className="flex items-center space-x-1 text-xs text-gray-600">
              {getTrendIcon(analytics.consumptionRate.trend)}
              <span>{analytics.consumptionRate.trend}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Usage</CardTitle>
            <BarChart3 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatHours(analytics.consumptionRate.daily)} hrs</div>
            <p className="text-xs text-gray-600">
              {formatHours(analytics.consumptionRate.weekly)} hrs/week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Efficiency</CardTitle>
            <Target className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatHours(analytics.efficiencyMetrics.utilizationRate)}%</div>
            <p className="text-xs text-gray-600">
              {formatHours(analytics.efficiencyMetrics.hoursPerClass)} hrs/class
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Predictions</CardTitle>
            <Calendar className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.predictions.runOutDate ? 
                Math.ceil((new Date(analytics.predictions.runOutDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 
                '--'
              } days
            </div>
            <p className="text-xs text-gray-600">
              Confidence: {Math.round(analytics.predictions.confidenceScore * 100)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="balance" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="balance">Balance Trend</TabsTrigger>
          <TabsTrigger value="patterns">Usage Patterns</TabsTrigger>
          <TabsTrigger value="consumption">Consumption</TabsTrigger>
          <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
        </TabsList>

        {/* Balance Trend Tab */}
        <TabsContent value="balance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Balance History</CardTitle>
              <CardDescription>
                Hour balance over time with trend analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.balanceHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      formatter={(value: number) => [`${value} hours`, 'Balance']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="balance" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {balanceTrend && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Trend Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Trend Direction</span>
                      <div className="flex items-center space-x-1">
                        {getTrendIcon(balanceTrend.trend)}
                        <span className="text-sm font-medium">{balanceTrend.trend}</span>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Trend Strength</span>
                      <span className="text-sm font-medium">{Math.round(balanceTrend.trendStrength * 100)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Peak Balance</span>
                      <span className="text-sm font-medium">{formatHours(balanceTrend.peakBalance)} hrs</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Low Balance</span>
                      <span className="text-sm font-medium">{formatHours(balanceTrend.lowBalance)} hrs</span>
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
                          <Badge variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'secondary'}>
                            {rec.priority}
                          </Badge>
                          <span className="text-xs text-gray-500">{rec.type}</span>
                        </div>
                        <p className="text-sm">{rec.message}</p>
                        {rec.actionRequired && (
                          <p className="text-xs text-red-600 mt-1">Action Required</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Usage Patterns Tab */}
        <TabsContent value="patterns" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Daily Usage Pattern */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Usage Pattern</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.dailyUsagePattern}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="dayOfWeek" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => [`${value} hours`, 'Average Usage']} />
                      <Bar dataKey="averageHours" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Hourly Usage Pattern */}
            <Card>
              <CardHeader>
                <CardTitle>Hourly Usage Pattern</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.hourlyUsagePattern}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => [`${value} sessions`, 'Sessions']} />
                      <Area 
                        type="monotone" 
                        dataKey="sessionCount" 
                        stroke="#8b5cf6" 
                        fill="#8b5cf6" 
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Consumption Tab */}
        <TabsContent value="consumption" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Class Type Usage */}
            <Card>
              <CardHeader>
                <CardTitle>Class Type Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.classTypeUsage}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ classType, percentage }) => `${classType} (${percentage.toFixed(1)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="totalHours"
                      >
                        {analytics.classTypeUsage.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 60%)`} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`${value} hours`, 'Total Hours']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Consumption Patterns */}
            <Card>
              <CardHeader>
                <CardTitle>Consumption Patterns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {consumptionPatterns.map((pattern, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{pattern.classType}</h4>
                        <Badge variant={pattern.consistency > 0.7 ? 'default' : 'secondary'}>
                          {pattern.frequency}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Consistency</p>
                          <p className="font-medium">{Math.round(pattern.consistency * 100)}%</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Predictability</p>
                          <p className="font-medium">{Math.round(pattern.predictability * 100)}%</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Total Sessions</p>
                          <p className="font-medium">{pattern.totalSessions}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Avg Hours/Session</p>
                          <p className="font-medium">{formatHours(pattern.averageHoursPerSession)}</p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <p className="text-xs text-gray-600">Preferred Days</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {pattern.preferredDays.map((day, i) => (
                            <Badge key={i} variant="outline" className="text-xs">{day}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Efficiency Tab */}
        <TabsContent value="efficiency" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Utilization Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-center">
                  {formatHours(analytics.efficiencyMetrics.utilizationRate)}%
                </div>
                <p className="text-sm text-gray-600 text-center mt-2">
                  Hours used vs purchased
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Wastage Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-center">
                  {formatHours(analytics.efficiencyMetrics.wastageRate)}%
                </div>
                <p className="text-sm text-gray-600 text-center mt-2">
                  Hours expired unused
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Renewal Pattern</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-center capitalize">
                  {analytics.efficiencyMetrics.renewalPattern}
                </div>
                <p className="text-sm text-gray-600 text-center mt-2">
                  {formatHours(analytics.efficiencyMetrics.hoursPerClass)} hrs/class
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Predictions Tab */}
        <TabsContent value="predictions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usage Predictions</CardTitle>
              <CardDescription>
                AI-powered predictions based on usage patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900">Run Out Prediction</h4>
                    <p className="text-2xl font-bold text-blue-800">
                      {analytics.predictions.runOutDate ? 
                        formatDate(analytics.predictions.runOutDate) : 
                        'No prediction available'
                      }
                    </p>
                    <p className="text-sm text-blue-700">
                      Confidence: {Math.round(analytics.predictions.confidenceScore * 100)}%
                    </p>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-900">Recommended Top-up</h4>
                    <p className="text-2xl font-bold text-green-800">
                      {analytics.predictions.recommendedTopUpDate ? 
                        formatDate(analytics.predictions.recommendedTopUpDate) : 
                        'No recommendation'
                      }
                    </p>
                    <p className="text-sm text-green-700">
                      Suggested package: {analytics.predictions.recommendedPackageSize} hours
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Optimization Opportunities</h4>
                  <div className="space-y-3">
                    {analytics.consumptionRate.trend === 'increasing' && (
                      <div className="p-3 bg-yellow-50 rounded-lg">
                        <p className="text-sm font-medium text-yellow-800">
                          Usage Increasing
                        </p>
                        <p className="text-sm text-yellow-700">
                          Consider larger packages for better value
                        </p>
                      </div>
                    )}
                    {analytics.efficiencyMetrics.wastageRate > 10 && (
                      <div className="p-3 bg-red-50 rounded-lg">
                        <p className="text-sm font-medium text-red-800">
                          High Wastage Rate
                        </p>
                        <p className="text-sm text-red-700">
                          Focus on using hours before expiry
                        </p>
                      </div>
                    )}
                    {analytics.efficiencyMetrics.utilizationRate > 80 && (
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="text-sm font-medium text-green-800">
                          High Utilization
                        </p>
                        <p className="text-sm text-green-700">
                          Excellent hour usage efficiency
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}