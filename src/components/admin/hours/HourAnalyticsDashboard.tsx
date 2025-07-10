'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Clock, 
  AlertTriangle, 
  Target,
  Calendar,
  Activity,
  DollarSign,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { hourUsageAnalyticsService } from '@/lib/services/hour-usage-analytics-service';
import { HourUsageAnalytics } from './HourUsageAnalytics';
import { BalanceTracker } from './BalanceTracker';
import { ConsumptionPatterns } from './ConsumptionPatterns';
import { AlertManager } from './AlertManager';
import type { HourAnalyticsDashboard, HourUsageReport, LowBalanceAlert } from '@/types/hours';

interface HourAnalyticsDashboardProps {
  className?: string;
}

export function HourAnalyticsDashboard({ className }: HourAnalyticsDashboardProps) {
  const [dashboardData, setDashboardData] = useState<HourAnalyticsDashboard | null>(null);
  const [usageReport, setUsageReport] = useState<HourUsageReport | null>(null);
  const [alerts, setAlerts] = useState<LowBalanceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30');
  const [selectedView, setSelectedView] = useState<string>('overview');

  useEffect(() => {
    loadDashboardData();
  }, [selectedPeriod]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const periodDays = parseInt(selectedPeriod);

      // Load dashboard data
      const [reportResult, alertsResult] = await Promise.all([
        hourUsageAnalyticsService.generateUsageReport('overall', periodDays),
        hourUsageAnalyticsService.generateLowBalanceAlerts()
      ]);

      if (reportResult.success) {
        setUsageReport(reportResult.data);
        
        // Generate dashboard data from report
        const dashboard: HourAnalyticsDashboard = {
          generatedAt: new Date().toISOString(),
          overview: {
            totalActiveStudents: reportResult.data.summary.totalStudents,
            totalHoursInCirculation: reportResult.data.summary.totalHoursUsed + reportResult.data.summary.totalHoursPurchased,
            averageBalancePerStudent: reportResult.data.summary.averageUsagePerStudent,
            utilizationRate: reportResult.data.summary.utilizationRate,
            monthlyGrowthRate: 5.2 // Mock data
          },
          alertSummary: {
            criticalAlerts: alertsResult.success ? alertsResult.data.filter(a => a.severity === 'critical').length : 0,
            highPriorityAlerts: alertsResult.success ? alertsResult.data.filter(a => a.severity === 'high').length : 0,
            mediumPriorityAlerts: alertsResult.success ? alertsResult.data.filter(a => a.severity === 'medium').length : 0,
            lowPriorityAlerts: alertsResult.success ? alertsResult.data.filter(a => a.severity === 'low').length : 0
          },
          usageTrends: {
            dailyUsage: generateMockDailyUsage(periodDays),
            weeklyUsage: generateMockWeeklyUsage(),
            monthlyUsage: generateMockMonthlyUsage()
          },
          performanceMetrics: {
            topPerformingClassTypes: reportResult.data.classTypeBreakdown.slice(0, 5).map(ct => ({
              classType: ct.classType,
              totalHours: ct.totalHours,
              averageRating: 4.5 + Math.random() * 0.5,
              completionRate: 85 + Math.random() * 15
            })),
            studentSegmentPerformance: reportResult.data.studentSegments.map(seg => ({
              segment: seg.segment,
              utilizationRate: 70 + Math.random() * 30,
              satisfactionScore: 4.0 + Math.random() * 1.0,
              renewalRate: 60 + Math.random() * 40
            }))
          },
          predictions: {
            nextMonthUsage: reportResult.data.summary.totalHoursUsed * 1.1,
            expectedLowBalanceAlerts: alertsResult.success ? Math.ceil(alertsResult.data.length * 1.2) : 0,
            recommendedPackageAdjustments: [
              { packageId: 'pkg1', recommendation: 'Increase standard package size', impact: 'Reduce frequent top-ups' },
              { packageId: 'pkg2', recommendation: 'Add mid-tier option', impact: 'Better price point coverage' }
            ]
          },
          keyInsights: generateKeyInsights(reportResult.data, alertsResult.data || [])
        };

        setDashboardData(dashboard);
      }

      if (alertsResult.success) {
        setAlerts(alertsResult.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const generateMockDailyUsage = (days: number) => {
    const data = [];
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toISOString().split('T')[0],
        hoursUsed: Math.floor(Math.random() * 100) + 50,
        sessionsCompleted: Math.floor(Math.random() * 20) + 10
      });
    }
    return data;
  };

  const generateMockWeeklyUsage = () => {
    const data = [];
    for (let i = 12; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - (i * 7));
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      data.push({
        week: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
        hoursUsed: Math.floor(Math.random() * 500) + 300,
        activeStudents: Math.floor(Math.random() * 50) + 100
      });
    }
    return data;
  };

  const generateMockMonthlyUsage = () => {
    const data = [];
    for (let i = 12; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      data.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        hoursUsed: Math.floor(Math.random() * 2000) + 1000,
        hoursPurchased: Math.floor(Math.random() * 2500) + 1200,
        netChange: Math.floor(Math.random() * 500) - 250
      });
    }
    return data;
  };

  const generateKeyInsights = (report: HourUsageReport, alerts: LowBalanceAlert[]) => {
    const insights: HourAnalyticsDashboard['keyInsights'] = [];

    // Usage insights
    if (report.summary.utilizationRate > 80) {
      insights.push({
        category: 'usage',
        insight: 'High utilization rate indicates efficient hour consumption',
        trend: 'positive',
        actionRequired: false
      });
    }

    // Alert insights
    if (alerts.filter(a => a.severity === 'critical').length > 0) {
      insights.push({
        category: 'satisfaction',
        insight: 'Critical balance alerts require immediate attention',
        trend: 'negative',
        actionRequired: true
      });
    }

    // Revenue insights
    if (report.summary.totalHoursPurchased > report.summary.totalHoursUsed) {
      insights.push({
        category: 'revenue',
        insight: 'Positive balance growth indicates healthy purchasing behavior',
        trend: 'positive',
        actionRequired: false
      });
    }

    return insights;
  };

  const formatHours = (hours: number) => {
    return hours.toFixed(1);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'positive':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'negative':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  const getInsightColor = (trend: string) => {
    switch (trend) {
      case 'positive':
        return 'bg-green-50 text-green-800 border-green-200';
      case 'negative':
        return 'bg-red-50 text-red-800 border-red-200';
      default:
        return 'bg-blue-50 text-blue-800 border-blue-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading analytics dashboard...</p>
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
          <Button onClick={loadDashboardData} variant="outline" size="sm" className="mt-2">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Hour Analytics Dashboard</h1>
          <p className="text-gray-600">Comprehensive hour usage and balance analytics</p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 Days</SelectItem>
              <SelectItem value="30">30 Days</SelectItem>
              <SelectItem value="90">90 Days</SelectItem>
              <SelectItem value="365">1 Year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={loadDashboardData} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      {dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Students</CardTitle>
              <Users className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.overview.totalActiveStudents}</div>
              <div className="flex items-center space-x-1 text-xs text-gray-600">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span>+{dashboardData.overview.monthlyGrowthRate.toFixed(1)}%</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
              <Clock className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatHours(dashboardData.overview.totalHoursInCirculation)}</div>
              <p className="text-xs text-gray-600">In circulation</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Utilization Rate</CardTitle>
              <Target className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.overview.utilizationRate.toFixed(1)}%</div>
              <p className="text-xs text-gray-600">Usage efficiency</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{dashboardData.alertSummary.criticalAlerts}</div>
              <p className="text-xs text-gray-600">Need attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Balance</CardTitle>
              <BarChart3 className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatHours(dashboardData.overview.averageBalancePerStudent)}</div>
              <p className="text-xs text-gray-600">Per student</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Key Insights */}
      {dashboardData && dashboardData.keyInsights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Key Insights</CardTitle>
            <CardDescription>Important findings from your hour usage data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData.keyInsights.map((insight, index) => (
                <div key={index} className={`p-3 rounded-lg border ${getInsightColor(insight.trend)}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-2">
                      {getTrendIcon(insight.trend)}
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <Badge variant="secondary" className="capitalize text-xs">
                            {insight.category}
                          </Badge>
                          {insight.actionRequired && (
                            <Badge variant="destructive" className="text-xs">
                              Action Required
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium">{insight.insight}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Analytics Tabs */}
      <Tabs value={selectedView} onValueChange={setSelectedView} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="detailed">Detailed</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Usage Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Usage Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dashboardData?.usageTrends.dailyUsage}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="hoursUsed" stroke="#3b82f6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Class Type Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Class Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboardData?.performanceMetrics.topPerformingClassTypes}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="classType" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="totalHours" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alert Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Alert Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {dashboardData?.alertSummary.criticalAlerts}
                  </div>
                  <p className="text-sm text-red-800">Critical</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {dashboardData?.alertSummary.highPriorityAlerts}
                  </div>
                  <p className="text-sm text-orange-800">High Priority</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {dashboardData?.alertSummary.mediumPriorityAlerts}
                  </div>
                  <p className="text-sm text-yellow-800">Medium Priority</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {dashboardData?.alertSummary.lowPriorityAlerts}
                  </div>
                  <p className="text-sm text-blue-800">Low Priority</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Usage Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dashboardData?.usageTrends.weeklyUsage}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="hoursUsed" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Balance Changes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboardData?.usageTrends.monthlyUsage}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="hoursUsed" fill="#ef4444" />
                      <Bar dataKey="hoursPurchased" fill="#22c55e" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Patterns Tab */}
        <TabsContent value="patterns">
          <ConsumptionPatterns reportType="overall" />
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <AlertManager />
        </TabsContent>

        {/* Detailed Tab */}
        <TabsContent value="detailed">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Detailed Analytics</CardTitle>
                <CardDescription>
                  Select a specific student or view overall patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <HourUsageAnalytics />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}