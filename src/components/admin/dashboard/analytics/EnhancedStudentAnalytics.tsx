"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-picker";
import {
  Users,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  BookOpen,
  Clock,
  Target,
  Star,
  ChevronRight,
  Download,
  Calendar,
  GraduationCap,
  Activity,
  Brain,
  Award
} from "lucide-react";
import { 
  LineChart, BarChart, PieChart, AreaChart, RadarChart,
  ChartPresets, createChart, CommonConfigs
} from '@/components/ui/charts';
import { analyticsAggregationService } from '@/lib/services/analytics-aggregation-service';
import { analyticsExportService } from '@/lib/services/analytics-export-service';
import { ExportButton } from '@/components/admin/export';
import { format } from 'date-fns';

interface EnhancedStudentAnalyticsProps {
  className?: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#FF6B6B', '#4ECDC4', '#45B7D1'];

export function EnhancedStudentAnalytics({ className }: EnhancedStudentAnalyticsProps) {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<any>({
    start: new Date(new Date().setDate(new Date().getDate() - 30)),
    end: new Date()
  });
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    loadStudentMetrics();
  }, [dateRange]);

  const loadStudentMetrics = async () => {
    try {
      setLoading(true);
      
      const range = analyticsAggregationService.getDateRange('custom', dateRange.start, dateRange.end);
      const studentMetrics = await analyticsAggregationService.getStudentMetrics(range);
      
      // Fetch additional enrollment trend data
      const enrollmentTrend = await getEnrollmentTrends();
      const testScoreAnalytics = await getTestScoreAnalytics();
      const retentionAnalytics = await getRetentionAnalytics();
      
      setMetrics({
        ...studentMetrics,
        enrollmentTrend,
        testScoreAnalytics,
        retentionAnalytics
      });
    } catch (error) {
      console.error('Failed to load student metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEnrollmentTrends = async () => {
    // Simulated enrollment trends - would come from actual data
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      last6Months.push({
        month: format(date, 'MMM'),
        enrollments: Math.floor(Math.random() * 20) + 10,
        dropouts: Math.floor(Math.random() * 5),
        active: Math.floor(Math.random() * 100) + 100
      });
    }
    return last6Months;
  };

  const getTestScoreAnalytics = async () => {
    // Simulated test score distribution
    return [
      { range: '90-100', count: 23, percentage: 14.7 },
      { range: '80-89', count: 45, percentage: 28.8 },
      { range: '70-79', count: 52, percentage: 33.3 },
      { range: '60-69', count: 28, percentage: 17.9 },
      { range: 'Below 60', count: 8, percentage: 5.1 }
    ];
  };

  const getRetentionAnalytics = async () => {
    // Simulated retention data
    return {
      monthly: [
        { month: '1 month', rate: 95 },
        { month: '3 months', rate: 88 },
        { month: '6 months', rate: 82 },
        { month: '12 months', rate: 75 }
      ],
      byProgram: [
        { program: 'Basic English', retention: 85 },
        { program: 'Everyday A/B', retention: 88 },
        { program: 'Speak Up', retention: 82 },
        { program: 'Business English', retention: 90 },
        { program: '1-on-1', retention: 95 }
      ]
    };
  };

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    try {
      setExportLoading(true);
      
      const exportData = {
        summary: {
          'Total Students': metrics.totalStudents,
          'Active Students': metrics.activeStudents,
          'New Enrollments': metrics.newEnrollments,
          'Average Progress': `${metrics.averageProgress.toFixed(1)}%`,
          'Attendance Rate': `${metrics.attendanceRate.toFixed(1)}%`,
          'Students at Risk': metrics.studentsAtRisk
        },
        charts: [
          {
            title: 'Enrollment Trends',
            type: 'line' as const,
            data: metrics.enrollmentTrend
          },
          {
            title: 'Test Score Distribution',
            type: 'bar' as const,
            data: metrics.testScoreAnalytics
          }
        ],
        tables: [
          {
            name: 'Top Performing Students',
            data: metrics.topPerformers
          }
        ]
      };

      await analyticsExportService.exportDashboard(exportData, {
        format,
        fileName: `student-analytics-${format(new Date(), 'yyyy-MM-dd')}`
      });
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading student analytics...</p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
        <p>Failed to load student analytics</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header with Date Range and Export */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 space-y-4 md:space-y-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Student Analytics</h2>
          <p className="text-muted-foreground">
            Comprehensive analysis of student learning progress and engagement
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
          />
          <ExportButton
            data={metrics ? [
              {
                'Total Students': metrics.totalStudents,
                'Active Students': metrics.activeStudents,
                'New Enrollments': metrics.newEnrollments,
                'Average Progress': `${metrics.averageProgress.toFixed(1)}%`,
                'Attendance Rate': `${metrics.attendanceRate.toFixed(1)}%`,
                'Completion Rate': `${metrics.completionRate.toFixed(1)}%`,
                'Students at Risk': metrics.studentsAtRisk
              },
              ...metrics.topPerformers,
              ...metrics.enrollmentTrend,
              ...metrics.testScoreAnalytics
            ] : []}
            title="Student Analytics"
            fileName={`student-analytics-${format(new Date(), 'yyyy-MM-dd')}`}
            availableColumns={[
              'Total Students', 'Active Students', 'New Enrollments', 'Average Progress',
              'Attendance Rate', 'Completion Rate', 'Students at Risk', 'name', 'progress',
              'attendance', 'testScore', 'month', 'enrollments', 'dropouts', 'active',
              'range', 'count', 'percentage'
            ]}
            onExportComplete={(success, message) => {
              if (success) {
                console.log('Export completed successfully:', message);
              } else {
                console.error('Export failed:', message);
              }
            }}
          />
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.activeStudents} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Enrollments</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.newEnrollments}</div>
            <p className="text-xs text-green-600">
              +{((metrics.newEnrollments / metrics.totalStudents) * 100).toFixed(1)}% growth
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Progress</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.averageProgress.toFixed(1)}%</div>
            <Progress value={metrics.averageProgress} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.attendanceRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics.noShowRate.toFixed(1)}% no-show
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.completionRate.toFixed(1)}%</div>
            <Progress value={metrics.completionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{metrics.studentsAtRisk}</div>
            <p className="text-xs text-muted-foreground">
              Need intervention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="enrollment" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="enrollment">Enrollment</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="retention">Retention</TabsTrigger>
        </TabsList>

        <TabsContent value="enrollment" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Enrollment Trends</CardTitle>
                <CardDescription>
                  New enrollments, dropouts, and active students over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LineChart
                  data={metrics.enrollmentTrend}
                  config={CommonConfigs.dashboard}
                  series={[
                    { key: 'enrollments', name: 'New Enrollments', color: '#10b981' },
                    { key: 'active', name: 'Active Students', color: '#3b82f6' },
                    { key: 'dropouts', name: 'Dropouts', color: '#ef4444' }
                  ]}
                  xAxis={{ dataKey: 'month' }}
                  showTrendLine={true}
                  showDots={false}
                  showActiveDots={true}
                  strokeWidth={2}
                  type="monotone"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Enrollment by Course Type</CardTitle>
                <CardDescription>
                  Distribution of students across different programs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PieChart
                  data={[
                    { name: 'Basic English', value: 45 },
                    { name: 'Everyday A/B', value: 38 },
                    { name: 'Speak Up', value: 32 },
                    { name: 'Business English', value: 28 },
                    { name: '1-on-1', value: 13 }
                  ]}
                  dataKey="value"
                  nameKey="name"
                  config={CommonConfigs.dashboard}
                  showPercentages={true}
                  showLegend={true}
                  showDataLabels={true}
                  variant="pie"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Learning Progress Distribution</CardTitle>
                <CardDescription>
                  How students progress through their courses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AreaChart
                  data={[
                    { week: 'Week 1', beginners: 40, intermediate: 30, advanced: 10 },
                    { week: 'Week 2', beginners: 35, intermediate: 35, advanced: 15 },
                    { week: 'Week 3', beginners: 30, intermediate: 40, advanced: 20 },
                    { week: 'Week 4', beginners: 25, intermediate: 45, advanced: 25 },
                    { week: 'Week 5', beginners: 20, intermediate: 50, advanced: 30 },
                    { week: 'Week 6', beginners: 15, intermediate: 45, advanced: 40 }
                  ]}
                  config={CommonConfigs.dashboard}
                  series={[
                    { key: 'beginners', name: 'Beginners', color: '#ffc658' },
                    { key: 'intermediate', name: 'Intermediate', color: '#8884d8' },
                    { key: 'advanced', name: 'Advanced', color: '#82ca9d' }
                  ]}
                  xAxis={{ dataKey: 'week' }}
                  stackMode="normal"
                  showGradient={true}
                  fillOpacity={0.6}
                  type="monotone"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Performing Students</CardTitle>
                <CardDescription>
                  Students with exceptional progress and engagement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics.topPerformers.map((student: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{student.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Progress: {student.progress.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <Badge variant="secondary">
                          <Activity className="w-3 h-3 mr-1" />
                          {student.attendance.toFixed(0)}%
                        </Badge>
                        <Badge variant="secondary">
                          <Brain className="w-3 h-3 mr-1" />
                          {student.testScore.toFixed(0)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Attendance Patterns</CardTitle>
                <CardDescription>
                  Daily attendance rates and patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BarChart
                  data={[
                    { day: 'Mon', attendance: 92, noShow: 5, cancelled: 3 },
                    { day: 'Tue', attendance: 88, noShow: 8, cancelled: 4 },
                    { day: 'Wed', attendance: 90, noShow: 6, cancelled: 4 },
                    { day: 'Thu', attendance: 87, noShow: 9, cancelled: 4 },
                    { day: 'Fri', attendance: 85, noShow: 10, cancelled: 5 },
                    { day: 'Sat', attendance: 82, noShow: 12, cancelled: 6 },
                    { day: 'Sun', attendance: 80, noShow: 15, cancelled: 5 }
                  ]}
                  config={CommonConfigs.dashboard}
                  series={[
                    { key: 'attendance', name: 'Present', color: '#10b981' },
                    { key: 'noShow', name: 'No Show', color: '#f59e0b' },
                    { key: 'cancelled', name: 'Cancelled', color: '#ef4444' }
                  ]}
                  xAxis={{ dataKey: 'day' }}
                  layout="vertical"
                  showValues={false}
                  showDataLabels={false}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>No-Show Analysis</CardTitle>
                <CardDescription>
                  Reasons for student absences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { reason: 'Work Conflict', count: 45, percentage: 35 },
                    { reason: 'Health Issues', count: 32, percentage: 25 },
                    { reason: 'Transportation', count: 26, percentage: 20 },
                    { reason: 'Family Emergency', count: 19, percentage: 15 },
                    { reason: 'Other', count: 6, percentage: 5 }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{item.reason}</span>
                          <span className="text-sm text-muted-foreground">{item.count} students</span>
                        </div>
                        <Progress value={item.percentage} className="h-2" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Test Score Distribution</CardTitle>
                <CardDescription>
                  Student performance across assessments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BarChart
                  data={metrics.testScoreAnalytics}
                  config={CommonConfigs.dashboard}
                  series={[
                    { key: 'count', name: 'Students', color: '#3b82f6' }
                  ]}
                  xAxis={{ dataKey: 'range' }}
                  showValues={true}
                  showDataLabels={true}
                  layout="vertical"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Learning Outcomes</CardTitle>
                <CardDescription>
                  Skills mastery across different areas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadarChart
                  data={[
                    { skill: 'Speaking', score: 78 },
                    { skill: 'Listening', score: 85 },
                    { skill: 'Reading', score: 82 },
                    { skill: 'Writing', score: 75 },
                    { skill: 'Grammar', score: 88 },
                    { skill: 'Vocabulary', score: 80 }
                  ]}
                  config={CommonConfigs.dashboard}
                  series={[
                    { key: 'score', name: 'Average Score', color: '#8884d8' }
                  ]}
                  polarAngleAxis={{ dataKey: 'skill' }}
                  showDots={true}
                  showValues={false}
                  gradientFill={true}
                  fillOpacity={0.6}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
              <CardDescription>
                Average test scores over time by course type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LineChart
                data={[
                  { month: 'Jan', basic: 72, everyday: 75, speakUp: 78, business: 82, oneOnOne: 88 },
                  { month: 'Feb', basic: 74, everyday: 77, speakUp: 79, business: 83, oneOnOne: 89 },
                  { month: 'Mar', basic: 75, everyday: 78, speakUp: 81, business: 84, oneOnOne: 90 },
                  { month: 'Apr', basic: 77, everyday: 80, speakUp: 82, business: 85, oneOnOne: 91 },
                  { month: 'May', basic: 78, everyday: 81, speakUp: 83, business: 86, oneOnOne: 92 },
                  { month: 'Jun', basic: 80, everyday: 82, speakUp: 84, business: 87, oneOnOne: 93 }
                ]}
                config={CommonConfigs.dashboard}
                series={[
                  { key: 'basic', name: 'Basic', color: '#ff6b6b' },
                  { key: 'everyday', name: 'Everyday', color: '#4ecdc4' },
                  { key: 'speakUp', name: 'Speak Up', color: '#45b7d1' },
                  { key: 'business', name: 'Business', color: '#96ceb4' },
                  { key: 'oneOnOne', name: '1-on-1', color: '#feca57' }
                ]}
                xAxis={{ dataKey: 'month' }}
                showTrendLine={true}
                showDots={true}
                type="monotone"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="retention" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Retention Rates Over Time</CardTitle>
                <CardDescription>
                  Student retention at different milestones
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AreaChart
                  data={metrics.retentionAnalytics.monthly}
                  config={CommonConfigs.dashboard}
                  series={[
                    { key: 'rate', name: 'Retention %', color: '#10b981' }
                  ]}
                  xAxis={{ dataKey: 'month' }}
                  stackMode="normal"
                  showGradient={true}
                  fillOpacity={0.6}
                  type="monotone"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Retention by Program</CardTitle>
                <CardDescription>
                  How well different programs retain students
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BarChart
                  data={metrics.retentionAnalytics.byProgram}
                  config={CommonConfigs.dashboard}
                  series={[
                    { key: 'retention', name: 'Retention %', color: '#3b82f6' }
                  ]}
                  xAxis={{ dataKey: 'program' }}
                  layout="horizontal"
                  showValues={true}
                  showDataLabels={true}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Risk Factors Analysis</CardTitle>
              <CardDescription>
                Common reasons for student dropouts and preventive measures
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-medium mb-3">Dropout Reasons</h4>
                  <div className="space-y-3">
                    {[
                      { reason: 'Financial Constraints', percentage: 30, color: 'bg-red-500' },
                      { reason: 'Time Conflicts', percentage: 25, color: 'bg-orange-500' },
                      { reason: 'Lack of Progress', percentage: 20, color: 'bg-yellow-500' },
                      { reason: 'Personal Issues', percentage: 15, color: 'bg-blue-500' },
                      { reason: 'Other', percentage: 10, color: 'bg-gray-500' }
                    ].map((item, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${item.color}`} />
                        <div className="flex-1">
                          <div className="flex justify-between text-sm">
                            <span>{item.reason}</span>
                            <span className="font-medium">{item.percentage}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-3">Retention Strategies</h4>
                  <div className="space-y-2">
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Award className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-800">Flexible payment plans</span>
                      </div>
                    </div>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-blue-800">Schedule flexibility options</span>
                      </div>
                    </div>
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Brain className="w-4 h-4 text-purple-600" />
                        <span className="text-sm text-purple-800">Personalized learning paths</span>
                      </div>
                    </div>
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-amber-600" />
                        <span className="text-sm text-amber-800">Regular check-ins</span>
                      </div>
                    </div>
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