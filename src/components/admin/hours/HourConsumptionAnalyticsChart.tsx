'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
  Area,
  AreaChart
} from 'recharts';
import { 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Target, 
  AlertCircle,
  Calendar,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import { 
  hourConsumptionAnalyticsService,
  type ClassTypeConsumption,
  type HourConsumptionTrend,
  type EfficiencyMetrics,
  type ConsumptionAnalyticsDashboard
} from '@/lib/services';

// Chart color schemes
const CHART_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#f97316', // orange
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#ec4899', // pink
];

interface HourConsumptionAnalyticsChartProps {
  studentId?: string;
  classType?: string;
  periodDays?: number;
  height?: number;
}

export function HourConsumptionAnalyticsChart({
  studentId,
  classType,
  periodDays = 30,
  height = 400
}: HourConsumptionAnalyticsChartProps) {
  const [analyticsData, setAnalyticsData] = useState<ConsumptionAnalyticsDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<'consumption' | 'efficiency' | 'trends'>('consumption');
  const [timeframe, setTimeframe] = useState<string>(periodDays.toString());

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await hourConsumptionAnalyticsService.getAnalyticsDashboard({
        periodDays: parseInt(timeframe),
        includeAlerts: true
      });

      if (response.success) {
        setAnalyticsData(response.data);
      } else {
        setError(response.error?.message || 'Failed to load analytics');
      }
    } catch (err) {
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [timeframe]);

  const chartData = useMemo(() => {
    if (!analyticsData) return null;

    return {
      classTypeData: analyticsData.classTypeMetrics.map(metric => ({
        name: metric.classType,
        hours: metric.totalHours,
        sessions: metric.sessionCount,
        efficiency: metric.efficiencyScore * 100,
        students: metric.studentCount,
        avgHours: metric.averageHoursPerClass,
        utilization: metric.utilizationRate
      })),
      trendData: analyticsData.consumptionTrends.map(trend => ({
        period: trend.period,
        hours: trend.totalHours,
        avgPerStudent: trend.averagePerStudent,
        utilization: trend.utilizationRate
      }))
    };
  }, [analyticsData]);

  const renderOverviewCards = () => {
    if (!analyticsData) return null;

    const { overview } = analyticsData;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours Consumed</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.totalHoursConsumed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {overview.monthlyGrowthRate > 0 ? (
                <span className="text-green-600 flex items-center">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  {overview.monthlyGrowthRate.toFixed(1)}% from last month
                </span>
              ) : overview.monthlyGrowthRate < 0 ? (
                <span className="text-red-600 flex items-center">
                  <ArrowDownRight className="h-3 w-3 mr-1" />
                  {Math.abs(overview.monthlyGrowthRate).toFixed(1)}% from last month
                </span>
              ) : (
                <span className="text-gray-600 flex items-center">
                  <Minus className="h-3 w-3 mr-1" />
                  No change from last month
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg per Student</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.averageConsumptionPerStudent.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              Hours per student
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Efficiency</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.overallEfficiency.toFixed(1)}%</div>
            <Progress value={overview.overallEfficiency} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Class Type</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.topPerformingClassType}</div>
            <p className="text-xs text-muted-foreground">
              Most consumed class type
            </p>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderClassTypeChart = () => {
    if (!chartData?.classTypeData) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Class Type Consumption</h3>
          <div className="flex items-center space-x-2">
            <Select value={selectedMetric} onValueChange={(value: any) => setSelectedMetric(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="consumption">Hours Consumed</SelectItem>
                <SelectItem value="efficiency">Efficiency Score</SelectItem>
                <SelectItem value="trends">Utilization Rate</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div style={{ height: height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData.classTypeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  typeof value === 'number' ? value.toFixed(1) : value,
                  name
                ]}
              />
              <Bar 
                dataKey={
                  selectedMetric === 'consumption' ? 'hours' :
                  selectedMetric === 'efficiency' ? 'efficiency' :
                  'utilization'
                }
                fill={CHART_COLORS[0]}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Class Type Details Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Class Type</th>
                <th className="text-right p-2">Total Hours</th>
                <th className="text-right p-2">Sessions</th>
                <th className="text-right p-2">Students</th>
                <th className="text-right p-2">Avg Hours/Class</th>
                <th className="text-right p-2">Efficiency</th>
              </tr>
            </thead>
            <tbody>
              {chartData.classTypeData.map((row, index) => (
                <tr key={row.name} className="border-b">
                  <td className="p-2 font-medium">{row.name}</td>
                  <td className="text-right p-2">{row.hours.toLocaleString()}</td>
                  <td className="text-right p-2">{row.sessions}</td>
                  <td className="text-right p-2">{row.students}</td>
                  <td className="text-right p-2">{row.avgHours.toFixed(1)}</td>
                  <td className="text-right p-2">
                    <Badge variant={
                      row.efficiency > 80 ? 'default' :
                      row.efficiency > 60 ? 'secondary' :
                      'destructive'
                    }>
                      {row.efficiency.toFixed(1)}%
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderTrendsChart = () => {
    if (!chartData?.trendData) return null;

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Consumption Trends</h3>
        <div style={{ height: height }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData.trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="period" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  value.toFixed(1),
                  name
                ]}
              />
              <Area 
                type="monotone" 
                dataKey="hours" 
                stackId="1"
                stroke={CHART_COLORS[0]}
                fill={CHART_COLORS[0]}
                fillOpacity={0.6}
                name="Total Hours"
              />
              <Area 
                type="monotone" 
                dataKey="avgPerStudent" 
                stackId="2"
                stroke={CHART_COLORS[1]}
                fill={CHART_COLORS[1]}
                fillOpacity={0.6}
                name="Avg per Student"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderPieChart = () => {
    if (!chartData?.classTypeData) return null;

    const pieData = chartData.classTypeData.map((item, index) => ({
      name: item.name,
      value: item.hours,
      color: CHART_COLORS[index % CHART_COLORS.length]
    }));

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Hour Distribution by Class Type</h3>
        <div style={{ height: height }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Hours']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderAlerts = () => {
    if (!analyticsData?.alerts.length) return null;

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Analytics Alerts</h3>
        <div className="space-y-2">
          {analyticsData.alerts.map((alert, index) => (
            <div 
              key={index}
              className={`p-3 rounded-lg border ${
                alert.severity === 'high' ? 'border-red-200 bg-red-50' :
                alert.severity === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                'border-blue-200 bg-blue-50'
              }`}
            >
              <div className="flex items-start space-x-2">
                <AlertCircle className={`h-5 w-5 mt-0.5 ${
                  alert.severity === 'high' ? 'text-red-500' :
                  alert.severity === 'medium' ? 'text-yellow-500' :
                  'text-blue-500'
                }`} />
                <div>
                  <p className="font-medium">{alert.message}</p>
                  {alert.actionRequired && (
                    <p className="text-sm text-gray-600 mt-1">Action required</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={loadAnalytics} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Hour Consumption Analytics</h2>
        <div className="flex items-center space-x-2">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="180">Last 180 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={loadAnalytics} size="sm">
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      {renderOverviewCards()}

      {/* Charts */}
      <Tabs defaultValue="consumption" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="consumption">Consumption</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>
        
        <TabsContent value="consumption" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              {renderClassTypeChart()}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              {renderTrendsChart()}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="distribution" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              {renderPieChart()}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              {renderAlerts()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}