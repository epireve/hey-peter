'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  Minus,
  BarChart3,
  PieChart,
  LineChart,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react';
import { 
  hourConsumptionAnalyticsService,
  type ClassTypeConsumption,
  type HourConsumptionTrend,
  type EfficiencyMetrics,
  type ConsumptionAnalyticsDashboard,
  type PredictiveInsights,
  type HourPlanningRecommendations
} from '@/lib/services';
import { HourConsumptionAnalyticsChart } from './HourConsumptionAnalyticsChart';

interface HourConsumptionDashboardProps {
  studentId?: string;
  classType?: string;
}

export function HourConsumptionDashboard({ 
  studentId, 
  classType 
}: HourConsumptionDashboardProps) {
  const [dashboardData, setDashboardData] = useState<ConsumptionAnalyticsDashboard | null>(null);
  const [predictiveInsights, setPredictiveInsights] = useState<PredictiveInsights | null>(null);
  const [recommendations, setRecommendations] = useState<HourPlanningRecommendations | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<'7' | '30' | '90' | '180' | '365'>('30');
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'insights' | 'recommendations'>('overview');

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load dashboard data
      const dashboardResponse = await hourConsumptionAnalyticsService.getAnalyticsDashboard({
        periodDays: parseInt(timeframe),
        includeAlerts: true
      });

      if (dashboardResponse.success) {
        setDashboardData(dashboardResponse.data);
      } else {
        throw new Error(dashboardResponse.error?.message || 'Failed to load dashboard data');
      }

      // Load predictive insights
      const insightsResponse = await hourConsumptionAnalyticsService.getPredictiveInsights({
        studentId,
        classType,
        forecastDays: 30
      });

      if (insightsResponse.success) {
        setPredictiveInsights(insightsResponse.data);
      }

      // Load recommendations
      const recommendationsResponse = await hourConsumptionAnalyticsService.getHourPlanningRecommendations({
        studentId,
        classType,
        includeBudgetOptimization: true
      });

      if (recommendationsResponse.success) {
        setRecommendations(recommendationsResponse.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [timeframe, studentId, classType]);

  const handleExportData = async () => {
    if (!dashboardData) return;

    const exportData = {
      overview: dashboardData.overview,
      classTypeMetrics: dashboardData.classTypeMetrics,
      consumptionTrends: dashboardData.consumptionTrends,
      efficiencyMetrics: dashboardData.efficiencyMetrics,
      predictiveInsights,
      recommendations,
      exportDate: new Date().toISOString(),
      timeframe
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hour-consumption-analytics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderEfficiencyMetrics = () => {
    if (!dashboardData?.efficiencyMetrics) return null;

    const metrics = dashboardData.efficiencyMetrics;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Utilization</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.overallUtilization.toFixed(1)}%</div>
            <Progress value={metrics.overallUtilization} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Hours/Class</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.averageHoursPerClass.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              Per class session
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Waste Percentage</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.wastePercentage.toFixed(1)}%</div>
            <Progress value={metrics.wastePercentage} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retention Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.retentionRate.toFixed(1)}%</div>
            <Progress value={metrics.retentionRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderClassTypeComparison = () => {
    if (!dashboardData?.classTypeMetrics) return null;

    const sortedMetrics = [...dashboardData.classTypeMetrics]
      .sort((a, b) => b.totalHours - a.totalHours);

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Class Type Performance Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedMetrics.map((metric, index) => (
              <div key={metric.classType} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                    <span className="text-sm font-bold text-blue-600">{index + 1}</span>
                  </div>
                  <div>
                    <div className="font-medium">{metric.classType}</div>
                    <div className="text-sm text-gray-500">
                      {metric.sessionCount} sessions • {metric.studentCount} students
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{metric.totalHours.toLocaleString()} hrs</div>
                  <div className="text-sm">
                    <Badge variant={
                      metric.efficiencyScore > 0.8 ? 'default' :
                      metric.efficiencyScore > 0.6 ? 'secondary' :
                      'destructive'
                    }>
                      {(metric.efficiencyScore * 100).toFixed(1)}% efficient
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderPredictiveInsights = () => {
    if (!predictiveInsights) return null;

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Predictive Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">Projected Consumption</div>
                  <div className="text-sm text-gray-600">{predictiveInsights.forecastPeriod}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{predictiveInsights.projectedConsumption.toFixed(1)}</div>
                  <div className="text-sm text-gray-600">
                    {predictiveInsights.confidenceScore > 0.8 ? 'High' :
                     predictiveInsights.confidenceScore > 0.6 ? 'Medium' : 'Low'} confidence
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  {predictiveInsights.trendDirection === 'increasing' ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : predictiveInsights.trendDirection === 'decreasing' ? (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  ) : (
                    <Minus className="h-4 w-4 text-gray-500" />
                  )}
                  <span className="text-sm capitalize">{predictiveInsights.trendDirection} trend</span>
                </div>
                <Badge variant="outline">
                  {(predictiveInsights.confidenceScore * 100).toFixed(0)}% confidence
                </Badge>
              </div>

              {predictiveInsights.recommendedActions.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Recommended Actions</h4>
                  <div className="space-y-2">
                    {predictiveInsights.recommendedActions.map((action, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <Badge variant={
                          action.priority === 'high' ? 'destructive' :
                          action.priority === 'medium' ? 'default' :
                          'secondary'
                        }>
                          {action.priority}
                        </Badge>
                        <div>
                          <div className="text-sm font-medium">{action.description}</div>
                          <div className="text-xs text-gray-600">{action.expectedImpact}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {predictiveInsights.riskFactors.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Risk Factors</h4>
                  <div className="space-y-2">
                    {predictiveInsights.riskFactors.map((risk, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-red-50 rounded">
                        <div>
                          <div className="text-sm font-medium">{risk.factor}</div>
                          <div className="text-xs text-gray-600">
                            {(risk.probability * 100).toFixed(0)}% probability
                          </div>
                        </div>
                        <Badge variant={
                          risk.impact === 'high' ? 'destructive' :
                          risk.impact === 'medium' ? 'default' :
                          'secondary'
                        }>
                          {risk.impact} impact
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderRecommendations = () => {
    if (!recommendations) return null;

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2" />
              Hour Planning Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recommendations.recommendations.map((rec, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge variant="outline">{rec.type.replace('_', ' ')}</Badge>
                        <Badge variant={
                          rec.confidence > 0.8 ? 'default' :
                          rec.confidence > 0.6 ? 'secondary' :
                          'destructive'
                        }>
                          {(rec.confidence * 100).toFixed(0)}% confidence
                        </Badge>
                      </div>
                      <div className="text-sm font-medium mb-1">{rec.reasoning}</div>
                      <div className="text-xs text-gray-600">{rec.expectedBenefit}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">
                        <span className="text-gray-500">Current:</span> {rec.current}
                      </div>
                      <div className="text-sm font-medium">
                        <span className="text-gray-500">Recommended:</span> {rec.recommended}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Budget Optimization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">
                  ${recommendations.budgetOptimization.currentSpending.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Current Spending</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  ${recommendations.budgetOptimization.optimizedSpending.toLocaleString()}
                </div>
                <div className="text-sm text-green-600">Optimized Spending</div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="text-center">
                <div className="text-xl font-bold text-blue-600">
                  ${recommendations.budgetOptimization.potentialSavings.toLocaleString()}
                </div>
                <div className="text-sm text-blue-600">Potential Savings</div>
                <div className="text-xs text-gray-600 mt-1">
                  Payback period: {recommendations.budgetOptimization.paybackPeriod}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderAlerts = () => {
    if (!dashboardData?.alerts.length) return null;

    return (
      <div className="space-y-2">
        {dashboardData.alerts.map((alert, index) => (
          <Alert key={index} variant={
            alert.severity === 'high' ? 'destructive' : 'default'
          }>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {alert.message}
              {alert.actionRequired && (
                <span className="ml-2 text-sm font-medium">• Action required</span>
              )}
            </AlertDescription>
          </Alert>
        ))}
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
        <Button onClick={loadDashboardData} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Hour Consumption Analytics</h1>
          <p className="text-gray-600">
            Comprehensive insights into hour usage patterns and efficiency metrics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={timeframe} onValueChange={(value: any) => setTimeframe(value)}>
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
          <Button onClick={handleExportData} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={loadDashboardData} size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {dashboardData?.alerts.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium">Alerts</h3>
          {renderAlerts()}
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Efficiency Metrics */}
          {renderEfficiencyMetrics()}
          
          {/* Class Type Comparison */}
          {renderClassTypeComparison()}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <HourConsumptionAnalyticsChart 
            studentId={studentId}
            classType={classType}
            periodDays={parseInt(timeframe)}
          />
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          {renderPredictiveInsights()}
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          {renderRecommendations()}
        </TabsContent>
      </Tabs>
    </div>
  );
}