"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { LineChart } from '@/components/ui/charts/LineChart';
import { BarChart } from '@/components/ui/charts/BarChart';
import { RadarChart } from '@/components/ui/charts/RadarChart';
import { PieChart } from '@/components/ui/charts/PieChart';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Users, 
  Clock, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Download,
  Target,
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
  Radar,
  LineChartIcon,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { classAttendanceAnalyticsService } from '@/lib/services/class-attendance-analytics-service';
import { 
  ClassAttendanceAnalytics, 
  ClassAttendanceTrend,
  AttendancePrediction,
  ClassComparison,
  AttendanceRecommendation
} from '@/types/attendance';
import { format } from 'date-fns';

interface ClassAttendanceAnalyticsDashboardProps {
  classId: string;
  className?: string;
}

type ViewMode = 'overview' | 'trends' | 'predictions' | 'comparisons' | 'recommendations';
type TimeframeOption = '30_days' | '90_days' | '180_days';

export const ClassAttendanceAnalyticsDashboard: React.FC<ClassAttendanceAnalyticsDashboardProps> = ({
  classId,
  className
}) => {
  const [analytics, setAnalytics] = useState<ClassAttendanceAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<TimeframeOption>('90_days');
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [refreshing, setRefreshing] = useState(false);

  // Load analytics data
  const loadAnalytics = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await classAttendanceAnalyticsService.getClassAttendanceAnalytics(
        classId, 
        timeframe, 
        forceRefresh
      );
      
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics(true);
    setRefreshing(false);
  };

  // Export data
  const handleExport = () => {
    if (!analytics) return;
    
    const dataToExport = {
      className: analytics.className,
      timeframe,
      generatedAt: new Date().toISOString(),
      metrics: analytics.attendanceMetrics,
      trends: analytics.trends,
      predictions: analytics.predictions,
      recommendations: analytics.recommendations
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${analytics.className}-attendance-analytics-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Load initial data
  useEffect(() => {
    loadAnalytics();
  }, [classId, timeframe]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!analytics) return {};

    // Trends data for line chart
    const trendsData = analytics.trends
      .find(t => t.metric === 'attendance_rate')
      ?.dataPoints.map(point => ({
        date: format(new Date(point.date), 'MMM dd'),
        attendance: point.value,
        target: 85 // Target attendance rate
      })) || [];

    // Day of week data for bar chart
    const dayOfWeekData = analytics.attendanceMetrics.attendanceByDayOfWeek.map(day => ({
      day: day.dayOfWeek.slice(0, 3), // Mon, Tue, etc.
      rate: day.attendanceRate,
      sessions: day.totalSessions
    }));

    // Time slot data for radar chart
    const timeSlotData = analytics.attendanceMetrics.attendanceByTimeSlot.map(slot => ({
      timeSlot: slot.timeSlot.split(' ')[0], // Extract main time label
      attendance: slot.attendanceRate,
      energy: slot.energyLevel * 10 // Scale to 0-100
    }));

    // Status distribution for pie chart
    const totalSessions = analytics.attendanceMetrics.totalSessions;
    const presentSessions = Math.round(totalSessions * analytics.attendanceMetrics.averageAttendanceRate / 100);
    const statusData = [
      { name: 'Present', value: presentSessions, color: '#22c55e' },
      { name: 'Absent', value: totalSessions - presentSessions, color: '#ef4444' }
    ];

    return {
      trendsData,
      dayOfWeekData,
      timeSlotData,
      statusData
    };
  }, [analytics]);

  if (loading && !analytics) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-6 w-48 bg-muted animate-pulse rounded" />
            <div className="h-4 w-32 bg-muted animate-pulse rounded" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                  <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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

  if (!analytics) return null;

  const getTrendIcon = (trend: ClassAttendanceTrend) => {
    switch (trend.trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      default:
        return 'bg-blue-500';
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
        return 'text-red-600 bg-red-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-green-600 bg-green-50';
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">
            {analytics.className} - Attendance Analytics
          </h2>
          <p className="text-muted-foreground">
            {analytics.courseType} • Last updated {format(new Date(analytics.lastUpdated), 'MMM dd, yyyy HH:mm')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeframe} onValueChange={(value) => setTimeframe(value as TimeframeOption)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30_days">Last 30 days</SelectItem>
              <SelectItem value="90_days">Last 90 days</SelectItem>
              <SelectItem value="180_days">Last 180 days</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Attendance Rate
                </p>
                <p className="text-2xl font-bold">
                  {analytics.attendanceMetrics.averageAttendanceRate.toFixed(1)}%
                </p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <Progress 
              value={analytics.attendanceMetrics.averageAttendanceRate} 
              className="mt-3"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Consistency Score
                </p>
                <p className="text-2xl font-bold">
                  {analytics.attendanceMetrics.attendanceConsistency.toFixed(0)}%
                </p>
              </div>
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
            <Progress 
              value={analytics.attendanceMetrics.attendanceConsistency} 
              className="mt-3"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Sessions
                </p>
                <p className="text-2xl font-bold">
                  {analytics.attendanceMetrics.totalSessions}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              Peak: {analytics.attendanceMetrics.peakAttendanceRate.toFixed(1)}% • 
              Low: {analytics.attendanceMetrics.lowestAttendanceRate.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  At-Risk Students
                </p>
                <p className="text-2xl font-bold">
                  {analytics.attendanceMetrics.chronicallyAbsentStudents}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="mt-3 flex gap-2 text-xs">
              <span className="text-green-600">
                ↗ {analytics.attendanceMetrics.improvingStudents} improving
              </span>
              <span className="text-red-600">
                ↘ {analytics.attendanceMetrics.decliningStudents} declining
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="trends">
            <LineChartIcon className="h-4 w-4 mr-2" />
            Trends
          </TabsTrigger>
          <TabsTrigger value="predictions">
            <Activity className="h-4 w-4 mr-2" />
            Predictions
          </TabsTrigger>
          <TabsTrigger value="comparisons">
            <Radar className="h-4 w-4 mr-2" />
            Comparisons
          </TabsTrigger>
          <TabsTrigger value="recommendations">
            <CheckCircle className="h-4 w-4 mr-2" />
            Actions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Day of Week Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Attendance by Day of Week</CardTitle>
                <CardDescription>
                  Weekly attendance patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BarChart
                  data={chartData.dayOfWeekData}
                  series={[
                    { key: 'rate', name: 'Attendance Rate', color: '#3b82f6' }
                  ]}
                  xAxis={{ dataKey: 'day' }}
                  yAxis={{ domain: [0, 100] }}
                  height={300}
                />
              </CardContent>
            </Card>

            {/* Time Slot Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Performance by Time Slot</CardTitle>
                <CardDescription>
                  Attendance and energy levels throughout the day
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadarChart
                  data={chartData.timeSlotData}
                  series={[
                    { key: 'attendance', name: 'Attendance', color: '#22c55e' },
                    { key: 'energy', name: 'Energy Level', color: '#f59e0b' }
                  ]}
                  height={300}
                />
              </CardContent>
            </Card>

            {/* Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Attendance Distribution</CardTitle>
                <CardDescription>
                  Overall session attendance breakdown
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PieChart
                  data={chartData.statusData}
                  height={300}
                />
              </CardContent>
            </Card>

            {/* Performance Impact */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Impact Analysis</CardTitle>
                <CardDescription>
                  How attendance affects student performance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Correlation with Grades</span>
                    <span className="font-medium">
                      {(analytics.performanceImpact.correlationWithGrades * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={analytics.performanceImpact.correlationWithGrades * 100} />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Correlation with Engagement</span>
                    <span className="font-medium">
                      {(analytics.performanceImpact.correlationWithEngagement * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={analytics.performanceImpact.correlationWithEngagement * 100} />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Correlation with Completion</span>
                    <span className="font-medium">
                      {(analytics.performanceImpact.correlationWithCompletion * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={analytics.performanceImpact.correlationWithCompletion * 100} />
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="font-medium">Performance Thresholds</h4>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Excellent Performance:</span>
                      <span>{analytics.performanceImpact.attendanceThresholds.excellentPerformance}%+</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Performance:</span>
                      <span>{analytics.performanceImpact.attendanceThresholds.averagePerformance}%+</span>
                    </div>
                    <div className="flex justify-between">
                      <span>At-Risk Threshold:</span>
                      <span className="text-red-600">
                        {analytics.performanceImpact.attendanceThresholds.atRiskThreshold}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          {/* Attendance Trends Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Attendance Trends Over Time</CardTitle>
              <CardDescription>
                Track attendance patterns and identify seasonal variations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LineChart
                data={chartData.trendsData}
                series={[
                  { key: 'attendance', name: 'Attendance Rate', color: '#3b82f6' },
                  { key: 'target', name: 'Target', color: '#22c55e' }
                ]}
                xAxis={{ dataKey: 'date' }}
                yAxis={{ domain: [0, 100] }}
                height={400}
                showTrendLine
                showBrush
              />
            </CardContent>
          </Card>

          {/* Trend Analysis */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {analytics.trends.map((trend, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium capitalize">
                      {trend.metric.replace('_', ' ')}
                    </div>
                    {getTrendIcon(trend)}
                  </div>
                  <div className="text-2xl font-bold mb-1">
                    {trend.changeRate > 0 ? '+' : ''}{trend.changeRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {trend.timeframe.replace('_', ' ')} • Confidence: {(trend.confidence * 100).toFixed(0)}%
                  </div>
                  {trend.seasonality && (
                    <div className="mt-2 text-xs text-blue-600">
                      {trend.seasonality.description}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {analytics.predictions.map((prediction, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    {prediction.metric.replace('_', ' ').toUpperCase()}
                  </CardTitle>
                  <CardDescription>
                    Predicted for {format(new Date(prediction.targetDate), 'MMM dd, yyyy')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold">
                      {prediction.predictedValue.toFixed(1)}%
                    </span>
                    <Badge className={getRiskColor(prediction.riskLevel)}>
                      {prediction.riskLevel} risk
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Confidence</span>
                      <span>{(prediction.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <Progress value={prediction.confidence * 100} />
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Key Factors</h4>
                    {prediction.factors.map((factor, factorIndex) => (
                      <div key={factorIndex} className="text-sm">
                        <div className="flex justify-between">
                          <span>{factor.factor}</span>
                          <span className="font-medium">
                            {(factor.impact * 100).toFixed(0)}%
                          </span>
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {factor.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="comparisons" className="space-y-6">
          {analytics.comparisons.length > 0 ? (
            <div className="grid gap-4">
              {analytics.comparisons.map((comparison, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle>Comparison with {comparison.comparedWithClass.name}</CardTitle>
                    <CardDescription>
                      {comparison.comparedWithClass.courseType} • 
                      Similarity Score: {(comparison.similarityScore * 100).toFixed(0)}%
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Attendance Rate Difference</span>
                      <div className="flex items-center gap-2">
                        {comparison.attendanceRateDifference > 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                        <span className={cn(
                          "font-medium",
                          comparison.attendanceRateDifference > 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {comparison.attendanceRateDifference > 0 ? '+' : ''}
                          {comparison.attendanceRateDifference.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {comparison.keyDifferences.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm mb-2">Key Differences</h4>
                        <ul className="text-sm space-y-1">
                          {comparison.keyDifferences.map((difference, diffIndex) => (
                            <li key={diffIndex} className="flex items-start gap-2">
                              <Info className="h-3 w-3 mt-0.5 text-muted-foreground flex-shrink-0" />
                              {difference}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {comparison.bestPractices.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm mb-2">Best Practices</h4>
                        <ul className="text-sm space-y-1">
                          {comparison.bestPractices.map((practice, practiceIndex) => (
                            <li key={practiceIndex} className="flex items-start gap-2">
                              <CheckCircle className="h-3 w-3 mt-0.5 text-green-500 flex-shrink-0" />
                              {practice}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <PieChartIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">No Comparison Data Available</h3>
                <p className="text-muted-foreground">
                  No similar classes found for comparison analysis.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          {analytics.recommendations.length > 0 ? (
            <div className="space-y-4">
              {analytics.recommendations.map((recommendation, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <div className={cn(
                          "w-3 h-3 rounded-full",
                          getPriorityColor(recommendation.priority)
                        )} />
                        {recommendation.title}
                      </CardTitle>
                      <Badge variant="outline">
                        {recommendation.type.replace('_', ' ')}
                      </Badge>
                    </div>
                    <CardDescription>{recommendation.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Expected Impact:</span>
                        <div className="font-medium">
                          {(recommendation.expectedImpact * 100).toFixed(0)}%
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Implementation:</span>
                        <div className="font-medium capitalize">
                          {recommendation.implementationEffort}
                        </div>
                      </div>
                    </div>

                    {recommendation.actions.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm mb-3">Action Items</h4>
                        <div className="space-y-2">
                          {recommendation.actions.map((action, actionIndex) => (
                            <div key={actionIndex} className="border rounded-lg p-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-sm">
                                  {action.action.replace('_', ' ')}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {action.assignedTo.replace('_', ' ')}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Due: {format(new Date(action.deadline), 'MMM dd, yyyy')}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="font-medium mb-2">No Action Items Required</h3>
                <p className="text-muted-foreground">
                  Class attendance is performing well. No immediate recommendations.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};