"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { 
  BarChart3,
  PieChart,
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  Clock,
  Target,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Download,
  Filter,
  RefreshCw,
  Settings,
  Eye,
  Zap,
  Database,
  Server,
  Cpu,
  Network,
  BookOpen,
  UserCheck,
  Timer,
  MapPin,
  Star,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { 
  SchedulingMetrics,
  SchedulingResult,
  ScheduledClass,
  SchedulingConflict,
  SchedulingRecommendation,
  CourseType
} from '@/types/scheduling';
import { toast } from '@/components/ui/use-toast';

interface SchedulingAnalyticsProps {
  className?: string;
}

interface AnalyticsMetrics {
  overview: {
    totalClasses: number;
    totalStudents: number;
    totalTeachers: number;
    utilizationRate: number;
    satisfactionScore: number;
    conflictRate: number;
  };
  performance: {
    averageProcessingTime: number;
    successRate: number;
    optimizationScore: number;
    resourceEfficiency: number;
    algorithmAccuracy: number;
    systemUptime: number;
  };
  trends: {
    dailyScheduling: DailySchedulingData[];
    weeklyPerformance: WeeklyPerformanceData[];
    monthlyTrends: MonthlyTrendData[];
    courseTypeDistribution: CourseTypeData[];
  };
  insights: {
    peakHours: PeakHourData[];
    teacherUtilization: TeacherUtilizationData[];
    studentEngagement: StudentEngagementData[];
    roomUtilization: RoomUtilizationData[];
  };
  quality: {
    dataCompleteness: number;
    dataAccuracy: number;
    systemReliability: number;
    predictionAccuracy: number;
    userSatisfaction: number;
    errorRate: number;
  };
  recommendations: {
    systemRecommendations: SystemRecommendation[];
    performanceImprovements: PerformanceImprovement[];
    resourceOptimizations: ResourceOptimization[];
  };
}

interface DailySchedulingData {
  date: string;
  classesScheduled: number;
  successRate: number;
  conflicts: number;
  averageProcessingTime: number;
}

interface WeeklyPerformanceData {
  week: string;
  efficiency: number;
  satisfaction: number;
  utilization: number;
  conflicts: number;
}

interface MonthlyTrendData {
  month: string;
  growth: number;
  performance: number;
  optimization: number;
}

interface CourseTypeData {
  courseType: CourseType;
  count: number;
  percentage: number;
  averageSize: number;
  satisfaction: number;
}

interface PeakHourData {
  hour: number;
  demand: number;
  utilization: number;
  efficiency: number;
}

interface TeacherUtilizationData {
  teacherId: string;
  teacherName: string;
  utilization: number;
  classCount: number;
  rating: number;
  availability: number;
}

interface StudentEngagementData {
  metric: string;
  value: number;
  trend: 'up' | 'down' | 'stable';
  target: number;
}

interface RoomUtilizationData {
  roomId: string;
  roomName: string;
  utilization: number;
  capacity: number;
  efficiency: number;
}

interface SystemRecommendation {
  id: string;
  category: 'performance' | 'efficiency' | 'quality' | 'user_experience';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  priority: number;
  estimatedImprovement: number;
}

interface PerformanceImprovement {
  area: string;
  currentScore: number;
  targetScore: number;
  actions: string[];
  timeline: string;
}

interface ResourceOptimization {
  resource: string;
  currentUtilization: number;
  optimalUtilization: number;
  potentialSavings: string;
  implementation: string;
}

interface AnalyticsFilters {
  dateRange: {
    start: Date;
    end: Date;
  };
  courseTypes: CourseType[];
  teachers: string[];
  rooms: string[];
  granularity: 'day' | 'week' | 'month';
}

export function SchedulingAnalytics({ className }: SchedulingAnalyticsProps) {
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [filters, setFilters] = useState<AnalyticsFilters>({
    dateRange: {
      start: subDays(new Date(), 30),
      end: new Date()
    },
    courseTypes: [],
    teachers: [],
    rooms: [],
    granularity: 'day'
  });
  const [selectedMetric, setSelectedMetric] = useState<string>('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Load analytics data
  useEffect(() => {
    loadAnalyticsData();
  }, [filters]);

  const loadAnalyticsData = async () => {
    try {
      setIsLoading(true);
      
      // Mock analytics data for demonstration
      const mockMetrics: AnalyticsMetrics = {
        overview: {
          totalClasses: 1247,
          totalStudents: 856,
          totalTeachers: 34,
          utilizationRate: 0.78,
          satisfactionScore: 4.2,
          conflictRate: 0.03
        },
        performance: {
          averageProcessingTime: 2.3,
          successRate: 0.96,
          optimizationScore: 0.84,
          resourceEfficiency: 0.82,
          algorithmAccuracy: 0.91,
          systemUptime: 0.998
        },
        trends: {
          dailyScheduling: Array.from({ length: 30 }, (_, i) => ({
            date: format(subDays(new Date(), 29 - i), 'yyyy-MM-dd'),
            classesScheduled: Math.floor(Math.random() * 50) + 30,
            successRate: 0.92 + Math.random() * 0.08,
            conflicts: Math.floor(Math.random() * 5),
            averageProcessingTime: 2 + Math.random() * 2
          })),
          weeklyPerformance: Array.from({ length: 12 }, (_, i) => ({
            week: `Week ${i + 1}`,
            efficiency: 0.75 + Math.random() * 0.2,
            satisfaction: 4.0 + Math.random() * 0.5,
            utilization: 0.7 + Math.random() * 0.25,
            conflicts: Math.floor(Math.random() * 10)
          })),
          monthlyTrends: Array.from({ length: 6 }, (_, i) => ({
            month: format(subDays(new Date(), i * 30), 'MMM yyyy'),
            growth: Math.random() * 20 - 5,
            performance: 0.8 + Math.random() * 0.15,
            optimization: 0.75 + Math.random() * 0.2
          })),
          courseTypeDistribution: [
            { courseType: 'Basic', count: 456, percentage: 36.6, averageSize: 5.2, satisfaction: 4.1 },
            { courseType: 'Everyday A', count: 289, percentage: 23.2, averageSize: 4.8, satisfaction: 4.3 },
            { courseType: 'Everyday B', count: 234, percentage: 18.8, averageSize: 4.5, satisfaction: 4.2 },
            { courseType: 'Speak Up', count: 145, percentage: 11.6, averageSize: 3.9, satisfaction: 4.4 },
            { courseType: 'Business English', count: 89, percentage: 7.1, averageSize: 3.2, satisfaction: 4.5 },
            { courseType: '1-on-1', count: 34, percentage: 2.7, averageSize: 1.0, satisfaction: 4.6 }
          ]
        },
        insights: {
          peakHours: Array.from({ length: 24 }, (_, i) => ({
            hour: i,
            demand: i >= 9 && i <= 17 ? Math.random() * 100 : Math.random() * 20,
            utilization: i >= 9 && i <= 17 ? 0.6 + Math.random() * 0.35 : Math.random() * 0.3,
            efficiency: i >= 10 && i <= 16 ? 0.8 + Math.random() * 0.2 : 0.5 + Math.random() * 0.3
          })),
          teacherUtilization: [
            { teacherId: 'teacher-001', teacherName: 'Sarah Johnson', utilization: 0.89, classCount: 23, rating: 4.7, availability: 0.92 },
            { teacherId: 'teacher-002', teacherName: 'Michael Chen', utilization: 0.76, classCount: 19, rating: 4.5, availability: 0.88 },
            { teacherId: 'teacher-003', teacherName: 'Emma Wilson', utilization: 0.82, classCount: 21, rating: 4.6, availability: 0.85 },
            { teacherId: 'teacher-004', teacherName: 'David Brown', utilization: 0.71, classCount: 18, rating: 4.4, availability: 0.90 }
          ],
          studentEngagement: [
            { metric: 'Attendance Rate', value: 94.2, trend: 'up', target: 95 },
            { metric: 'Assignment Completion', value: 87.8, trend: 'stable', target: 90 },
            { metric: 'Class Participation', value: 78.5, trend: 'up', target: 80 },
            { metric: 'Satisfaction Score', value: 4.2, trend: 'up', target: 4.5 }
          ],
          roomUtilization: [
            { roomId: 'room-101', roomName: 'Room 101', utilization: 0.85, capacity: 12, efficiency: 0.78 },
            { roomId: 'room-102', roomName: 'Room 102', utilization: 0.72, capacity: 8, efficiency: 0.82 },
            { roomId: 'room-103', roomName: 'Room 103', utilization: 0.68, capacity: 15, efficiency: 0.75 },
            { roomId: 'online', roomName: 'Online Platform', utilization: 0.91, capacity: 100, efficiency: 0.95 }
          ]
        },
        quality: {
          dataCompleteness: 0.94,
          dataAccuracy: 0.97,
          systemReliability: 0.998,
          predictionAccuracy: 0.89,
          userSatisfaction: 0.84,
          errorRate: 0.02
        },
        recommendations: {
          systemRecommendations: [
            {
              id: 'rec-001',
              category: 'performance',
              title: 'Optimize Peak Hour Scheduling',
              description: 'Implement load balancing during 2-4 PM peak hours to reduce processing time',
              impact: 'high',
              effort: 'medium',
              priority: 1,
              estimatedImprovement: 15
            },
            {
              id: 'rec-002',
              category: 'efficiency',
              title: 'Improve Room Utilization',
              description: 'Better distribute classes across available rooms to increase efficiency',
              impact: 'medium',
              effort: 'low',
              priority: 2,
              estimatedImprovement: 8
            },
            {
              id: 'rec-003',
              category: 'quality',
              title: 'Enhanced Data Validation',
              description: 'Implement stricter data validation rules to improve accuracy',
              impact: 'medium',
              effort: 'medium',
              priority: 3,
              estimatedImprovement: 12
            }
          ],
          performanceImprovements: [
            {
              area: 'Processing Speed',
              currentScore: 84,
              targetScore: 95,
              actions: ['Optimize database queries', 'Implement caching', 'Upgrade hardware'],
              timeline: '2 weeks'
            },
            {
              area: 'Success Rate',
              currentScore: 96,
              targetScore: 98,
              actions: ['Improve conflict detection', 'Better data validation', 'Enhanced algorithms'],
              timeline: '1 month'
            }
          ],
          resourceOptimizations: [
            {
              resource: 'Teachers',
              currentUtilization: 78,
              optimalUtilization: 85,
              potentialSavings: '7% efficiency gain',
              implementation: 'Adjust schedules and availability'
            },
            {
              resource: 'Classrooms',
              currentUtilization: 72,
              optimalUtilization: 80,
              potentialSavings: '8% capacity increase',
              implementation: 'Optimize room assignments'
            }
          ]
        }
      };

      setMetrics(mockMetrics);
    } catch (error) {
      toast({
        title: "Error loading analytics",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportReport = async () => {
    try {
      // Mock export functionality
      toast({
        title: "Export started",
        description: "Analytics report is being generated and will be available for download shortly",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  };

  const getMetricTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'stable': return <Target className="h-4 w-4 text-blue-500" />;
    }
  };

  const getImpactColor = (impact: 'low' | 'medium' | 'high') => {
    switch (impact) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
    }
  };

  const renderOverviewCards = () => {
    if (!metrics) return null;

    const { overview, performance } = metrics;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.totalClasses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {performance.successRate * 100}% success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Students Served</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.totalStudents.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Avg satisfaction: {overview.satisfactionScore}/5
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Teachers</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.totalTeachers}</div>
            <p className="text-xs text-muted-foreground">
              {(overview.utilizationRate * 100).toFixed(1)}% utilization
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing Speed</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performance.averageProcessingTime}s</div>
            <p className="text-xs text-muted-foreground">
              Average processing time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(performance.systemUptime * 100).toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conflict Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(overview.conflictRate * 100).toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {overview.conflictRate < 0.05 ? 'Low' : overview.conflictRate < 0.1 ? 'Medium' : 'High'} conflict rate
            </p>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderPerformanceMetrics = () => {
    if (!metrics) return null;

    const { performance, quality } = metrics;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Algorithm Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Cpu className="h-4 w-4" />
                <span>Algorithm Performance</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>Success Rate</span>
                  <span>{(performance.successRate * 100).toFixed(1)}%</span>
                </div>
                <Progress value={performance.successRate * 100} />
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>Optimization Score</span>
                  <span>{(performance.optimizationScore * 100).toFixed(1)}%</span>
                </div>
                <Progress value={performance.optimizationScore * 100} />
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>Accuracy</span>
                  <span>{(performance.algorithmAccuracy * 100).toFixed(1)}%</span>
                </div>
                <Progress value={performance.algorithmAccuracy * 100} />
              </div>
            </CardContent>
          </Card>

          {/* System Health */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Server className="h-4 w-4" />
                <span>System Health</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>Uptime</span>
                  <span>{(performance.systemUptime * 100).toFixed(2)}%</span>
                </div>
                <Progress value={performance.systemUptime * 100} />
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>Reliability</span>
                  <span>{(quality.systemReliability * 100).toFixed(2)}%</span>
                </div>
                <Progress value={quality.systemReliability * 100} />
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>Error Rate</span>
                  <span>{(quality.errorRate * 100).toFixed(2)}%</span>
                </div>
                <Progress value={100 - (quality.errorRate * 100)} />
              </div>
            </CardContent>
          </Card>

          {/* Data Quality */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-4 w-4" />
                <span>Data Quality</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>Completeness</span>
                  <span>{(quality.dataCompleteness * 100).toFixed(1)}%</span>
                </div>
                <Progress value={quality.dataCompleteness * 100} />
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>Accuracy</span>
                  <span>{(quality.dataAccuracy * 100).toFixed(1)}%</span>
                </div>
                <Progress value={quality.dataAccuracy * 100} />
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>Prediction Accuracy</span>
                  <span>{(quality.predictionAccuracy * 100).toFixed(1)}%</span>
                </div>
                <Progress value={quality.predictionAccuracy * 100} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderInsights = () => {
    if (!metrics) return null;

    const { insights } = metrics;

    return (
      <div className="space-y-6">
        {/* Student Engagement */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Star className="h-4 w-4" />
              <span>Student Engagement Metrics</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {insights.studentEngagement.map((metric, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">{metric.metric}</h4>
                    {getMetricTrendIcon(metric.trend)}
                  </div>
                  <div className="text-2xl font-bold mb-1">
                    {typeof metric.value === 'number' && metric.value < 10 
                      ? metric.value.toFixed(1) 
                      : Math.round(metric.value)}
                    {metric.metric.includes('Rate') || metric.metric.includes('Completion') ? '%' : ''}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Target: {metric.target}{metric.metric.includes('Rate') || metric.metric.includes('Completion') ? '%' : ''}
                  </div>
                  <Progress 
                    value={(metric.value / metric.target) * 100} 
                    className="mt-2" 
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Teacher Utilization */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserCheck className="h-4 w-4" />
              <span>Teacher Utilization</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.teacherUtilization.map((teacher, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{teacher.teacherName}</h4>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                      <span>{teacher.classCount} classes</span>
                      <span>{teacher.rating}/5 rating</span>
                      <span>{(teacher.availability * 100).toFixed(0)}% available</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold">
                      {(teacher.utilization * 100).toFixed(0)}%
                    </div>
                    <Progress value={teacher.utilization * 100} className="w-24 mt-1" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Room Utilization */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="h-4 w-4" />
              <span>Room Utilization</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.roomUtilization.map((room, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{room.roomName}</h4>
                    <Badge variant="outline">Cap: {room.capacity}</Badge>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>Utilization</span>
                        <span>{(room.utilization * 100).toFixed(0)}%</span>
                      </div>
                      <Progress value={room.utilization * 100} />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>Efficiency</span>
                        <span>{(room.efficiency * 100).toFixed(0)}%</span>
                      </div>
                      <Progress value={room.efficiency * 100} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderRecommendations = () => {
    if (!metrics) return null;

    const { recommendations } = metrics;

    return (
      <div className="space-y-6">
        {/* System Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-4 w-4" />
              <span>System Recommendations</span>
            </CardTitle>
            <CardDescription>
              AI-generated recommendations to improve scheduling performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recommendations.systemRecommendations.map((rec, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium">{rec.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={getImpactColor(rec.impact)}>{rec.impact} impact</Badge>
                      <Badge variant="outline">{rec.effort} effort</Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">Priority {rec.priority}</Badge>
                    <span className="text-sm text-green-600 font-medium">
                      +{rec.estimatedImprovement}% improvement
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance Improvements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Improvements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recommendations.performanceImprovements.map((improvement, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{improvement.area}</h4>
                      <span className="text-sm text-muted-foreground">{improvement.timeline}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Progress value={(improvement.currentScore / improvement.targetScore) * 100} className="flex-1" />
                      <span className="text-sm whitespace-nowrap">
                        {improvement.currentScore}% → {improvement.targetScore}%
                      </span>
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {improvement.actions.map((action, actionIndex) => (
                        <li key={actionIndex}>• {action}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resource Optimizations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recommendations.resourceOptimizations.map((optimization, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{optimization.resource}</h4>
                      <Badge variant="outline">{optimization.potentialSavings}</Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Progress value={(optimization.currentUtilization / optimization.optimalUtilization) * 100} className="flex-1" />
                      <span className="text-sm whitespace-nowrap">
                        {optimization.currentUtilization}% → {optimization.optimalUtilization}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Implementation: {optimization.implementation}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  if (isLoading || !metrics) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Scheduling Analytics</h2>
          <p className="text-muted-foreground">
            Comprehensive performance metrics and insights
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button
            variant="outline"
            onClick={handleExportReport}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={loadAnalyticsData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      {renderOverviewCards()}

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          {renderPerformanceMetrics()}
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          {renderInsights()}
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          {renderRecommendations()}
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trend Analysis</CardTitle>
              <CardDescription>
                Historical trends and patterns in scheduling performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Coming Soon</AlertTitle>
                <AlertDescription>
                  Advanced trend analysis with interactive charts will be available in the next update.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}