'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Activity,
  AlertCircle,
  BarChart3,
  Users,
  CheckCircle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar,
  LineChart,
  Line,
  ScatterChart,
  Scatter
} from 'recharts';
import { hourUsageAnalyticsService } from '@/lib/services/hour-usage-analytics-service';
import type { ConsumptionPattern, HourUsageReport } from '@/types/hours';

interface ConsumptionPatternsProps {
  studentId?: string;
  classType?: string;
  reportType?: 'student' | 'class' | 'overall';
  className?: string;
}

export function ConsumptionPatterns({ 
  studentId, 
  classType, 
  reportType = 'student', 
  className 
}: ConsumptionPatternsProps) {
  const [patterns, setPatterns] = useState<ConsumptionPattern[]>([]);
  const [report, setReport] = useState<HourUsageReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPattern, setSelectedPattern] = useState<ConsumptionPattern | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(studentId || '');
  const [selectedClassType, setSelectedClassType] = useState<string>(classType || 'all');
  const [viewMode, setViewMode] = useState<'patterns' | 'comparison' | 'analysis'>('patterns');

  useEffect(() => {
    if (reportType === 'student' && selectedStudentId) {
      loadStudentPatterns();
    } else if (reportType !== 'student') {
      loadOverallReport();
    }
  }, [selectedStudentId, selectedClassType, reportType]);

  const loadStudentPatterns = async () => {
    try {
      setLoading(true);
      setError(null);

      const patternsResult = await hourUsageAnalyticsService.getConsumptionPatterns(
        selectedStudentId,
        selectedClassType === 'all' ? undefined : selectedClassType
      );

      if (patternsResult.success) {
        setPatterns(patternsResult.data);
        if (patternsResult.data.length > 0) {
          setSelectedPattern(patternsResult.data[0]);
        }
      } else {
        throw new Error(patternsResult.error?.message || 'Failed to load patterns');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const loadOverallReport = async () => {
    try {
      setLoading(true);
      setError(null);

      const reportResult = await hourUsageAnalyticsService.generateUsageReport(
        reportType,
        90,
        selectedClassType === 'all' ? {} : { classTypes: [selectedClassType] }
      );

      if (reportResult.success) {
        setReport(reportResult.data);
      } else {
        throw new Error(reportResult.error?.message || 'Failed to load report');
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

  const getFrequencyColor = (frequency: string) => {
    switch (frequency) {
      case 'daily':
        return 'bg-green-100 text-green-800';
      case 'weekly':
        return 'bg-blue-100 text-blue-800';
      case 'bi-weekly':
        return 'bg-purple-100 text-purple-800';
      case 'monthly':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getConsistencyColor = (consistency: number) => {
    if (consistency >= 0.8) return 'text-green-600';
    if (consistency >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getEfficiencyBadge = (efficiency: string) => {
    switch (efficiency) {
      case 'high':
        return <Badge className="bg-green-100 text-green-800">High Efficiency</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800">Medium Efficiency</Badge>;
      case 'low':
        return <Badge className="bg-red-100 text-red-800">Low Efficiency</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  const generateRadarData = (pattern: ConsumptionPattern) => {
    return [
      { metric: 'Consistency', value: pattern.consistency * 100 },
      { metric: 'Predictability', value: pattern.predictability * 100 },
      { metric: 'Completion Rate', value: pattern.completionRate * 100 },
      { metric: 'Efficiency', value: pattern.benchmarkComparison.percentile },
      { metric: 'Frequency', value: pattern.frequency === 'daily' ? 100 : pattern.frequency === 'weekly' ? 80 : 60 }
    ];
  };

  const generateTimeDistributionData = (pattern: ConsumptionPattern) => {
    return pattern.preferredHours.map(hour => ({
      hour: `${hour}:00`,
      sessions: Math.floor(Math.random() * 10) + 1 // Would be real data
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading consumption patterns...</p>
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
          <Button onClick={reportType === 'student' ? loadStudentPatterns : loadOverallReport} variant="outline" size="sm" className="mt-2">
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
          <h1 className="text-2xl font-bold">Consumption Patterns</h1>
          <p className="text-gray-600">
            {reportType === 'student' ? `Student-specific analysis` : 'Overall usage patterns'}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {reportType === 'student' && (
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student1">Student 1</SelectItem>
                <SelectItem value="student2">Student 2</SelectItem>
                {/* Add more students dynamically */}
              </SelectContent>
            </Select>
          )}
          <Select value={selectedClassType} onValueChange={setSelectedClassType}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="1-on-1">1-on-1</SelectItem>
              <SelectItem value="group">Group</SelectItem>
              <SelectItem value="business">Business</SelectItem>
            </SelectContent>
          </Select>
          <Select value={viewMode} onValueChange={setViewMode}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="patterns">Patterns</SelectItem>
              <SelectItem value="comparison">Comparison</SelectItem>
              <SelectItem value="analysis">Analysis</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Pattern Overview */}
      {reportType === 'student' && patterns.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Patterns</CardTitle>
              <BarChart3 className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{patterns.length}</div>
              <p className="text-xs text-gray-600">Class types analyzed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Consistency</CardTitle>
              <Target className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(patterns.reduce((sum, p) => sum + p.consistency, 0) / patterns.length * 100)}%
              </div>
              <p className="text-xs text-gray-600">Pattern consistency</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <Users className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {patterns.reduce((sum, p) => sum + p.totalSessions, 0)}
              </div>
              <p className="text-xs text-gray-600">All class types</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Efficiency</CardTitle>
              <CheckCircle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(patterns.reduce((sum, p) => sum + p.benchmarkComparison.percentile, 0) / patterns.length)}%
              </div>
              <p className="text-xs text-gray-600">Vs benchmark</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={viewMode} onValueChange={setViewMode} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="patterns">Pattern Details</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>

        {/* Pattern Details */}
        <TabsContent value="patterns" className="space-y-4">
          {reportType === 'student' && patterns.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pattern List */}
              <Card>
                <CardHeader>
                  <CardTitle>Pattern Overview</CardTitle>
                  <CardDescription>
                    Click on a pattern to see detailed analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {patterns.map((pattern) => (
                      <div
                        key={pattern.patternId}
                        className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                          selectedPattern?.patternId === pattern.patternId
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedPattern(pattern)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{pattern.classType}</h4>
                          <div className="flex items-center space-x-2">
                            <Badge className={getFrequencyColor(pattern.frequency)}>
                              {pattern.frequency}
                            </Badge>
                            {getEfficiencyBadge(pattern.benchmarkComparison.efficiency)}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Sessions:</span>
                            <span className="font-medium ml-1">{pattern.totalSessions}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Hours:</span>
                            <span className="font-medium ml-1">{formatHours(pattern.totalHours)}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Consistency:</span>
                            <span className={`font-medium ml-1 ${getConsistencyColor(pattern.consistency)}`}>
                              {Math.round(pattern.consistency * 100)}%
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Trend:</span>
                            <span className="ml-1 flex items-center">
                              {getTrendIcon(pattern.usageTrend)}
                              <span className="ml-1 text-sm">{pattern.usageTrend}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Selected Pattern Details */}
              {selectedPattern && (
                <Card>
                  <CardHeader>
                    <CardTitle>Pattern Analysis: {selectedPattern.classType}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Metrics Radar */}
                      <div>
                        <h4 className="font-medium mb-3">Performance Metrics</h4>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={generateRadarData(selectedPattern)}>
                              <PolarGrid />
                              <PolarAngleAxis dataKey="metric" />
                              <PolarRadiusAxis />
                              <Radar
                                name="Performance"
                                dataKey="value"
                                stroke="#3b82f6"
                                fill="#3b82f6"
                                fillOpacity={0.3}
                              />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Key Insights */}
                      <div>
                        <h4 className="font-medium mb-3">Key Insights</h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="text-sm">Average Session Length</span>
                            <span className="font-medium">{formatHours(selectedPattern.averageSessionLength)} hrs</span>
                          </div>
                          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="text-sm">Completion Rate</span>
                            <span className="font-medium">{Math.round(selectedPattern.completionRate * 100)}%</span>
                          </div>
                          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="text-sm">Cancellation Rate</span>
                            <span className="font-medium">{Math.round(selectedPattern.cancellationRate * 100)}%</span>
                          </div>
                          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="text-sm">Seasonal Pattern</span>
                            <span className="font-medium">{selectedPattern.seasonalPattern ? 'Yes' : 'No'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Preferred Times */}
                      <div>
                        <h4 className="font-medium mb-3">Preferred Schedule</h4>
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm text-gray-600 mb-2">Preferred Days</p>
                            <div className="flex flex-wrap gap-1">
                              {selectedPattern.preferredDays.map((day) => (
                                <Badge key={day} variant="outline">{day}</Badge>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 mb-2">Preferred Hours</p>
                            <div className="flex flex-wrap gap-1">
                              {selectedPattern.preferredHours.map((hour) => (
                                <Badge key={hour} variant="outline">{hour}:00</Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Benchmark Comparison */}
                      <div>
                        <h4 className="font-medium mb-3">Benchmark Comparison</h4>
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Percentile Ranking</span>
                              <span>{selectedPattern.benchmarkComparison.percentile}%</span>
                            </div>
                            <Progress value={selectedPattern.benchmarkComparison.percentile} className="h-2" />
                          </div>
                          <div className="p-3 bg-gray-50 rounded">
                            <p className="text-sm">
                              <span className="font-medium">vs Average:</span>{' '}
                              <span className={selectedPattern.benchmarkComparison.vsAverage >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {selectedPattern.benchmarkComparison.vsAverage >= 0 ? '+' : ''}
                                {selectedPattern.benchmarkComparison.vsAverage.toFixed(1)}%
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Overall Report View */}
          {reportType !== 'student' && report && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Class Type Usage Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={report.classTypeBreakdown}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="classType" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="totalHours" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Peak Usage Times</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={report.peakUsageTimes}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="timeSlot" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="hoursUsed" fill="#8b5cf6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Comparison View */}
        <TabsContent value="comparison" className="space-y-4">
          {reportType === 'student' && patterns.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Pattern Comparison</CardTitle>
                <CardDescription>
                  Compare patterns across different class types
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Comparison Chart */}
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="consistency" name="Consistency" />
                        <YAxis dataKey="efficiency" name="Efficiency" />
                        <Tooltip />
                        <Scatter
                          name="Class Types"
                          data={patterns.map(p => ({
                            consistency: p.consistency * 100,
                            efficiency: p.benchmarkComparison.percentile,
                            classType: p.classType
                          }))}
                          fill="#3b82f6"
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Comparison Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Class Type</th>
                          <th className="text-left p-2">Consistency</th>
                          <th className="text-left p-2">Efficiency</th>
                          <th className="text-left p-2">Sessions</th>
                          <th className="text-left p-2">Hours</th>
                          <th className="text-left p-2">Trend</th>
                        </tr>
                      </thead>
                      <tbody>
                        {patterns.map((pattern) => (
                          <tr key={pattern.patternId} className="border-b">
                            <td className="p-2 font-medium">{pattern.classType}</td>
                            <td className="p-2">
                              <span className={getConsistencyColor(pattern.consistency)}>
                                {Math.round(pattern.consistency * 100)}%
                              </span>
                            </td>
                            <td className="p-2">
                              {getEfficiencyBadge(pattern.benchmarkComparison.efficiency)}
                            </td>
                            <td className="p-2">{pattern.totalSessions}</td>
                            <td className="p-2">{formatHours(pattern.totalHours)}</td>
                            <td className="p-2">
                              <div className="flex items-center">
                                {getTrendIcon(pattern.usageTrend)}
                                <span className="ml-1 text-xs">{pattern.usageTrend}</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Analysis View */}
        <TabsContent value="analysis" className="space-y-4">
          {reportType === 'student' && patterns.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Pattern Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {patterns.map((pattern) => (
                      <div key={pattern.patternId} className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium mb-2">{pattern.classType}</h4>
                        <div className="space-y-2 text-sm">
                          {pattern.consistency > 0.8 && (
                            <div className="flex items-center text-green-600">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              <span>Highly consistent pattern</span>
                            </div>
                          )}
                          {pattern.benchmarkComparison.efficiency === 'high' && (
                            <div className="flex items-center text-green-600">
                              <Target className="h-4 w-4 mr-1" />
                              <span>Above average efficiency</span>
                            </div>
                          )}
                          {pattern.seasonalPattern && (
                            <div className="flex items-center text-blue-600">
                              <Calendar className="h-4 w-4 mr-1" />
                              <span>Seasonal usage pattern detected</span>
                            </div>
                          )}
                          {pattern.usageTrend === 'increasing' && (
                            <div className="flex items-center text-green-600">
                              <TrendingUp className="h-4 w-4 mr-1" />
                              <span>Usage trending upward</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {patterns.some(p => p.consistency < 0.5) && (
                      <div className="p-3 bg-yellow-50 rounded-lg">
                        <p className="text-sm font-medium text-yellow-800">
                          Improve Schedule Consistency
                        </p>
                        <p className="text-sm text-yellow-700">
                          Some patterns show low consistency. Consider more regular scheduling.
                        </p>
                      </div>
                    )}
                    {patterns.some(p => p.benchmarkComparison.efficiency === 'low') && (
                      <div className="p-3 bg-red-50 rounded-lg">
                        <p className="text-sm font-medium text-red-800">
                          Focus on Efficiency
                        </p>
                        <p className="text-sm text-red-700">
                          Some class types show below-average efficiency. Consider optimization.
                        </p>
                      </div>
                    )}
                    {patterns.some(p => p.usageTrend === 'increasing') && (
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="text-sm font-medium text-green-800">
                          Positive Trend
                        </p>
                        <p className="text-sm text-green-700">
                          Usage is increasing. Consider planning for higher hour needs.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Overall Report Analysis */}
          {reportType !== 'student' && report && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Key Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {report.insights.map((insight, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{insight.category}</span>
                          <Badge variant={insight.impact === 'high' ? 'destructive' : 'default'}>
                            {insight.impact} impact
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700">{insight.insight}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {report.recommendations.map((rec, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium capitalize">{rec.target}</span>
                          <Badge variant={rec.priority === 'high' ? 'destructive' : 'default'}>
                            {rec.priority} priority
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700 mb-1">{rec.recommendation}</p>
                        <p className="text-xs text-gray-600">{rec.expectedImpact}</p>
                      </div>
                    ))}
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