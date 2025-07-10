'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Users,
  Clock,
  Target,
  AlertCircle
} from 'lucide-react';
import { 
  hourConsumptionAnalyticsService,
  type ComparativeAnalytics,
  type ClassTypeConsumption,
  type EfficiencyMetrics
} from '@/lib/services';

interface HourConsumptionComparisonProps {
  comparisonType?: 'class_type' | 'time_period' | 'student_segment';
  baseline?: string;
  comparisons?: string[];
}

export function HourConsumptionComparison({
  comparisonType = 'class_type',
  baseline,
  comparisons
}: HourConsumptionComparisonProps) {
  const [comparativeData, setComparativeData] = useState<ComparativeAnalytics | null>(null);
  const [classTypeData, setClassTypeData] = useState<ClassTypeConsumption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedComparison, setSelectedComparison] = useState<string>(comparisonType);

  const loadComparisonData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get class type data for general comparison
      const classTypeResponse = await hourConsumptionAnalyticsService.getClassTypeConsumptionAnalytics({
        periodDays: 90
      });

      if (classTypeResponse.success) {
        setClassTypeData(classTypeResponse.data);
      }

      // Get comparative analytics if specific comparison is requested
      if (baseline || comparisons) {
        const comparativeResponse = await hourConsumptionAnalyticsService.getComparativeAnalytics({
          comparisonType: selectedComparison as any,
          baseline,
          comparisons
        });

        if (comparativeResponse.success) {
          setComparativeData(comparativeResponse.data);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comparison data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComparisonData();
  }, [selectedComparison, baseline, comparisons]);

  const renderClassTypeComparison = () => {
    if (!classTypeData.length) return null;

    const chartData = classTypeData.map(item => ({
      name: item.classType,
      totalHours: item.totalHours,
      efficiency: item.efficiencyScore * 100,
      utilization: item.utilizationRate,
      avgHours: item.averageHoursPerClass,
      students: item.studentCount
    }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Total Hours Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Total Hours by Class Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="totalHours" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Efficiency Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2" />
                Efficiency Scores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="efficiency" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Comparison Table */}
        <Card>
          <CardHeader>
            <CardTitle>Detailed Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Class Type</th>
                    <th className="text-right p-3">Total Hours</th>
                    <th className="text-right p-3">Students</th>
                    <th className="text-right p-3">Avg Hours/Class</th>
                    <th className="text-right p-3">Efficiency</th>
                    <th className="text-right p-3">Utilization</th>
                    <th className="text-right p-3">Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {classTypeData.map((item, index) => {
                    const avgEfficiency = classTypeData.reduce((sum, d) => sum + d.efficiencyScore, 0) / classTypeData.length;
                    const performance = item.efficiencyScore > avgEfficiency * 1.1 ? 'above' :
                                       item.efficiencyScore < avgEfficiency * 0.9 ? 'below' : 'average';
                    
                    return (
                      <tr key={item.classType} className="border-b">
                        <td className="p-3 font-medium">{item.classType}</td>
                        <td className="text-right p-3">{item.totalHours.toLocaleString()}</td>
                        <td className="text-right p-3">{item.studentCount}</td>
                        <td className="text-right p-3">{item.averageHoursPerClass.toFixed(1)}</td>
                        <td className="text-right p-3">
                          <div className="flex items-center justify-end space-x-2">
                            <span>{(item.efficiencyScore * 100).toFixed(1)}%</span>
                            <Progress 
                              value={item.efficiencyScore * 100} 
                              className="w-16 h-2"
                            />
                          </div>
                        </td>
                        <td className="text-right p-3">{item.utilizationRate.toFixed(1)}%</td>
                        <td className="text-right p-3">
                          <div className="flex items-center justify-end">
                            {performance === 'above' ? (
                              <div className="flex items-center text-green-600">
                                <ArrowUpRight className="h-4 w-4 mr-1" />
                                <span className="text-sm">Above</span>
                              </div>
                            ) : performance === 'below' ? (
                              <div className="flex items-center text-red-600">
                                <ArrowDownRight className="h-4 w-4 mr-1" />
                                <span className="text-sm">Below</span>
                              </div>
                            ) : (
                              <div className="flex items-center text-gray-600">
                                <Minus className="h-4 w-4 mr-1" />
                                <span className="text-sm">Average</span>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderPerformanceInsights = () => {
    if (!classTypeData.length) return null;

    const bestPerformer = classTypeData.reduce((best, current) => 
      current.efficiencyScore > best.efficiencyScore ? current : best
    );

    const worstPerformer = classTypeData.reduce((worst, current) => 
      current.efficiencyScore < worst.efficiencyScore ? current : worst
    );

    const avgEfficiency = classTypeData.reduce((sum, d) => sum + d.efficiencyScore, 0) / classTypeData.length;

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <TrendingUp className="h-4 w-4 mr-2 text-green-500" />
              Best Performer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="font-semibold">{bestPerformer.classType}</div>
              <div className="text-sm text-gray-600">
                {(bestPerformer.efficiencyScore * 100).toFixed(1)}% efficiency
              </div>
              <div className="text-sm">
                {bestPerformer.totalHours.toLocaleString()} total hours
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <Target className="h-4 w-4 mr-2 text-blue-500" />
              Average Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="font-semibold">{(avgEfficiency * 100).toFixed(1)}%</div>
              <div className="text-sm text-gray-600">
                Efficiency benchmark
              </div>
              <div className="text-sm">
                {classTypeData.length} class types tracked
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <TrendingDown className="h-4 w-4 mr-2 text-red-500" />
              Needs Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="font-semibold">{worstPerformer.classType}</div>
              <div className="text-sm text-gray-600">
                {(worstPerformer.efficiencyScore * 100).toFixed(1)}% efficiency
              </div>
              <div className="text-sm">
                {((avgEfficiency - worstPerformer.efficiencyScore) * 100).toFixed(1)}% below average
              </div>
            </div>
          </CardContent>
        </Card>
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
        <Button onClick={loadComparisonData} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Hour Consumption Comparison</h2>
          <p className="text-gray-600">Compare efficiency and utilization across class types</p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedComparison} onValueChange={setSelectedComparison}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="class_type">Class Type</SelectItem>
              <SelectItem value="time_period">Time Period</SelectItem>
              <SelectItem value="student_segment">Student Segment</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={loadComparisonData} size="sm">
            Refresh
          </Button>
        </div>
      </div>

      {/* Performance Insights */}
      {renderPerformanceInsights()}

      {/* Detailed Comparison */}
      {renderClassTypeComparison()}
    </div>
  );
}