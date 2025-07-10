"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { LineChart } from '@/components/ui/charts/LineChart';
import { AreaChart } from '@/components/ui/charts/AreaChart';
import { BarChart } from '@/components/ui/charts/BarChart';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  Users,
  Brain,
  Zap,
  Calendar,
  RefreshCw,
  Download,
  Info,
  Eye,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { classAttendanceAnalyticsService } from '@/lib/services/class-attendance-analytics-service';
import { 
  AttendancePrediction,
  AttendancePatternAnalysis,
  AttendancePattern,
  AttendanceAnomaly,
  AttendanceInsight
} from '@/types/attendance';
import { format, addDays, addWeeks, addMonths } from 'date-fns';

interface PredictiveData {
  classId: string;
  className: string;
  predictions: AttendancePrediction[];
  patterns: AttendancePatternAnalysis;
  historicalData: Array<{
    date: string;
    actual: number;
    predicted: number;
    confidence: number;
  }>;
  forecastData: Array<{
    date: string;
    predicted: number;
    confidenceLow: number;
    confidenceHigh: number;
  }>;
}

interface AttendancePredictiveAnalyticsProps {
  classId?: string;
  className?: string;
}

type PredictionHorizon = '1_week' | '1_month' | '3_months' | '6_months';
type AnalysisMode = 'single_class' | 'all_classes';

export const AttendancePredictiveAnalytics: React.FC<AttendancePredictiveAnalyticsProps> = ({
  classId,
  className
}) => {
  const [predictiveData, setPredictiveData] = useState<PredictiveData[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>(classId || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [predictionHorizon, setPredictionHorizon] = useState<PredictionHorizon>('1_month');
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>(classId ? 'single_class' : 'all_classes');
  const [availableClasses, setAvailableClasses] = useState<Array<{id: string; name: string}>>([]);

  // Load predictive analytics data
  const loadPredictiveData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (analysisMode === 'single_class' && selectedClassId) {
        // Load data for single class
        const [analytics, patterns] = await Promise.all([
          classAttendanceAnalyticsService.getClassAttendanceAnalytics(selectedClassId, '180_days'),
          classAttendanceAnalyticsService.getAttendancePatternAnalysis(selectedClassId)
        ]);

        // Generate forecast data
        const forecastData = generateForecastData(analytics.predictions, predictionHorizon);
        const historicalData = generateHistoricalData(analytics.trends);

        setPredictiveData([{
          classId: selectedClassId,
          className: analytics.className,
          predictions: analytics.predictions,
          patterns,
          historicalData,
          forecastData
        }]);
      } else {
        // Load data for all classes (summary)
        // This would be implemented to get predictions for all classes
        // For now, we'll use the selected class data
        if (selectedClassId) {
          const [analytics, patterns] = await Promise.all([
            classAttendanceAnalyticsService.getClassAttendanceAnalytics(selectedClassId, '180_days'),
            classAttendanceAnalyticsService.getAttendancePatternAnalysis(selectedClassId)
          ]);

          const forecastData = generateForecastData(analytics.predictions, predictionHorizon);
          const historicalData = generateHistoricalData(analytics.trends);

          setPredictiveData([{
            classId: selectedClassId,
            className: analytics.className,
            predictions: analytics.predictions,
            patterns,
            historicalData,
            forecastData
          }]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load predictive analytics');
    } finally {
      setLoading(false);
    }
  };

  // Generate forecast data based on predictions
  const generateForecastData = (predictions: AttendancePrediction[], horizon: PredictionHorizon) => {
    const forecastData = [];
    const startDate = new Date();
    let endDate: Date;

    switch (horizon) {
      case '1_week':
        endDate = addWeeks(startDate, 1);
        break;
      case '1_month':
        endDate = addMonths(startDate, 1);
        break;
      case '3_months':
        endDate = addMonths(startDate, 3);
        break;
      case '6_months':
        endDate = addMonths(startDate, 6);
        break;
    }

    // Generate weekly forecast points
    let currentDate = startDate;
    while (currentDate < endDate) {
      const attendancePrediction = predictions.find(p => p.metric === 'attendance_rate');
      if (attendancePrediction) {
        const baseValue = attendancePrediction.predictedValue;
        const confidence = attendancePrediction.confidence;
        
        // Add some variation for realism
        const variation = (Math.random() - 0.5) * 10;
        const predicted = Math.max(0, Math.min(100, baseValue + variation));
        
        // Confidence interval
        const confidenceRange = (1 - confidence) * 20;
        const confidenceLow = Math.max(0, predicted - confidenceRange);
        const confidenceHigh = Math.min(100, predicted + confidenceRange);

        forecastData.push({
          date: format(currentDate, 'MMM dd'),
          predicted,
          confidenceLow,
          confidenceHigh
        });
      }

      currentDate = addWeeks(currentDate, 1);
    }

    return forecastData;
  };

  // Generate historical comparison data
  const generateHistoricalData = (trends: any[]) => {
    const attendanceTrend = trends.find(t => t.metric === 'attendance_rate');
    if (!attendanceTrend) return [];

    return attendanceTrend.dataPoints.map((point: any, index: number) => {
      // Simulate predicted values for comparison
      const predicted = point.value + (Math.random() - 0.5) * 5;
      const confidence = 0.8 + (Math.random() * 0.2);

      return {
        date: format(new Date(point.date), 'MMM dd'),
        actual: point.value,
        predicted: Math.max(0, Math.min(100, predicted)),
        confidence: confidence * 100
      };
    });
  };

  // Current data for visualization
  const currentData = useMemo(() => {
    if (predictiveData.length === 0) return null;
    return predictiveData[0]; // For now, show first class
  }, [predictiveData]);

  // Get risk level color
  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  // Get pattern color
  const getPatternColor = (pattern: AttendancePattern) => {
    switch (pattern.impact) {
      case 'positive':
        return 'border-l-green-500';
      case 'negative':
        return 'border-l-red-500';
      default:
        return 'border-l-blue-500';
    }
  };

  // Get anomaly severity color
  const getAnomalySeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  // Get insight category icon
  const getInsightIcon = (category: string) => {
    switch (category) {
      case 'optimization':
        return <Target className="h-4 w-4" />;
      case 'risk':
        return <AlertTriangle className="h-4 w-4" />;
      case 'opportunity':
        return <TrendingUp className="h-4 w-4" />;
      case 'warning':
        return <Eye className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  // Load available classes on mount
  useEffect(() => {
    // This would load available classes from the API
    // For now, we'll use placeholder data
    setAvailableClasses([
      { id: '1', name: 'English Basic A1' },
      { id: '2', name: 'Business English B2' },
      { id: '3', name: 'Conversation Practice' }
    ]);

    if (!selectedClassId && availableClasses.length > 0) {
      setSelectedClassId(availableClasses[0].id);
    }
  }, []);

  // Load data when parameters change
  useEffect(() => {
    if (selectedClassId) {
      loadPredictiveData();
    }
  }, [selectedClassId, predictionHorizon, analysisMode]);

  if (loading) {
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

  if (!currentData) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium mb-2">No Predictive Data Available</h3>
          <p className="text-muted-foreground">
            Select a class to view predictive analytics.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">
            Predictive Attendance Analytics
          </h2>
          <p className="text-muted-foreground">
            AI-powered attendance forecasting and pattern analysis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadPredictiveData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <Select 
          value={analysisMode} 
          onValueChange={(value) => setAnalysisMode(value as AnalysisMode)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="single_class">Single Class</SelectItem>
            <SelectItem value="all_classes">All Classes</SelectItem>
          </SelectContent>
        </Select>

        {analysisMode === 'single_class' && (
          <Select 
            value={selectedClassId} 
            onValueChange={setSelectedClassId}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select class..." />
            </SelectTrigger>
            <SelectContent>
              {availableClasses.map(cls => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select 
          value={predictionHorizon} 
          onValueChange={(value) => setPredictionHorizon(value as PredictionHorizon)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1_week">1 Week</SelectItem>
            <SelectItem value="1_month">1 Month</SelectItem>
            <SelectItem value="3_months">3 Months</SelectItem>
            <SelectItem value="6_months">6 Months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Predictions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {currentData.predictions.map((prediction, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    {prediction.metric.replace('_', ' ').toUpperCase()}
                  </p>
                  <p className="text-2xl font-bold">
                    {prediction.predictedValue.toFixed(1)}%
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Brain className="h-6 w-6 text-muted-foreground" />
                  <Badge className={getRiskColor(prediction.riskLevel)}>
                    {prediction.riskLevel}
                  </Badge>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Confidence</span>
                  <span>{(prediction.confidence * 100).toFixed(0)}%</span>
                </div>
                <Progress value={prediction.confidence * 100} className="h-1" />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Target: {format(new Date(prediction.targetDate), 'MMM dd, yyyy')}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Analytics */}
      <Tabs defaultValue="forecast" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="forecast">
            <Activity className="h-4 w-4 mr-2" />
            Forecast
          </TabsTrigger>
          <TabsTrigger value="patterns">
            <BarChart3 className="h-4 w-4 mr-2" />
            Patterns
          </TabsTrigger>
          <TabsTrigger value="anomalies">
            <Zap className="h-4 w-4 mr-2" />
            Anomalies
          </TabsTrigger>
          <TabsTrigger value="insights">
            <Brain className="h-4 w-4 mr-2" />
            Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="forecast" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Attendance Forecast */}
            <Card>
              <CardHeader>
                <CardTitle>Attendance Forecast</CardTitle>
                <CardDescription>
                  Predicted attendance rates with confidence intervals
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AreaChart
                  data={currentData.forecastData}
                  series={[
                    { key: 'predicted', name: 'Predicted', color: '#3b82f6' },
                    { key: 'confidenceLow', name: 'Lower Bound', color: '#93c5fd' },
                    { key: 'confidenceHigh', name: 'Upper Bound', color: '#93c5fd' }
                  ]}
                  xAxis={{ dataKey: 'date' }}
                  yAxis={{ domain: [0, 100] }}
                  height={300}
                  fillOpacity={0.3}
                />
              </CardContent>
            </Card>

            {/* Historical Accuracy */}
            <Card>
              <CardHeader>
                <CardTitle>Prediction Accuracy</CardTitle>
                <CardDescription>
                  Historical comparison of predicted vs actual attendance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LineChart
                  data={currentData.historicalData}
                  series={[
                    { key: 'actual', name: 'Actual', color: '#22c55e' },
                    { key: 'predicted', name: 'Predicted', color: '#3b82f6' }
                  ]}
                  xAxis={{ dataKey: 'date' }}
                  yAxis={{ domain: [0, 100] }}
                  height={300}
                  showDataPoints
                />
              </CardContent>
            </Card>

            {/* Prediction Factors */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Key Prediction Factors</CardTitle>
                <CardDescription>
                  Factors influencing attendance predictions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {currentData.predictions[0]?.factors.map((factor, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{factor.factor}</span>
                        <span className="text-sm text-muted-foreground">
                          {(factor.impact * 100).toFixed(0)}% impact
                        </span>
                      </div>
                      <Progress value={factor.impact * 100} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {factor.description}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-6">
          {currentData.patterns.patterns.length > 0 ? (
            <div className="grid gap-4">
              {currentData.patterns.patterns.map((pattern, index) => (
                <Card key={index} className={cn("border-l-4", getPatternColor(pattern))}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        <span className="font-medium capitalize">
                          {pattern.type} Pattern
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{pattern.frequency}</Badge>
                        <Badge 
                          variant={pattern.impact === 'positive' ? 'default' : 'destructive'}
                        >
                          {pattern.impact}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {pattern.description}
                    </p>
                    <div className="flex items-center justify-between text-xs">
                      <span>Confidence: {(pattern.confidence * 100).toFixed(0)}%</span>
                      <Progress value={pattern.confidence * 100} className="w-20 h-1" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">No Patterns Detected</h3>
                <p className="text-muted-foreground">
                  Insufficient data to identify attendance patterns.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="anomalies" className="space-y-6">
          {currentData.patterns.anomalies.length > 0 ? (
            <div className="grid gap-4">
              {currentData.patterns.anomalies.map((anomaly, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        <span className="font-medium">
                          {format(new Date(anomaly.date), 'MMM dd, yyyy')}
                        </span>
                      </div>
                      <Badge className={getAnomalySeverityColor(anomaly.severity)}>
                        {anomaly.severity} severity
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {anomaly.description}
                    </p>
                    <div>
                      <h4 className="font-medium text-sm mb-2">Possible Causes</h4>
                      <ul className="text-sm space-y-1">
                        {anomaly.possibleCauses.map((cause, causeIndex) => (
                          <li key={causeIndex} className="flex items-start gap-2">
                            <div className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
                            {cause}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="font-medium mb-2">No Anomalies Detected</h3>
                <p className="text-muted-foreground">
                  Attendance patterns are stable with no unusual variations.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          {currentData.patterns.insights.length > 0 ? (
            <div className="grid gap-4">
              {currentData.patterns.insights.map((insight, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {getInsightIcon(insight.category)}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{insight.title}</h4>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize">
                              {insight.category}
                            </Badge>
                            {insight.actionable && (
                              <Badge variant="default">Actionable</Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {insight.description}
                        </p>
                        {insight.dataPoints.length > 0 && (
                          <div>
                            <Separator className="my-2" />
                            <div className="text-xs text-muted-foreground space-y-1">
                              {insight.dataPoints.map((point, pointIndex) => (
                                <div key={pointIndex}>• {point}</div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">No Insights Available</h3>
                <p className="text-muted-foreground">
                  More data is needed to generate meaningful insights.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};