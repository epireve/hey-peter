"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  GraduationCap,
  Star,
  Clock,
  Users,
  TrendingUp,
  TrendingDown,
  Award,
  AlertTriangle,
  Calendar,
  BookOpen,
  Search,
  Filter,
  Download,
  Eye,
  BarChart3,
  PieChart,
  LineChart,
  Activity,
  Target,
  AlertCircle,
  CheckCircle,
  XCircle,
  ChevronRight,
  MessageSquare,
  UserCheck,
  TimerIcon,
  Zap
} from "lucide-react";
import { AnalyticsChart } from "../AnalyticsChart";
import { enhancedTeacherPerformanceAnalytics } from "@/lib/services/teacher-performance-analytics-enhanced";
import {
  TeacherPerformanceDashboard as DashboardData,
  TeacherPerformanceMetrics,
  TeacherCohortAnalysis,
  TeacherPerformanceFilters,
  TeacherPerformanceSort,
  PERFORMANCE_LEVEL_COLORS,
  TREND_COLORS,
  RECOMMENDATION_TYPE_COLORS
} from "@/types/teacher-performance";

interface TeacherPerformanceDashboardProps {
  className?: string;
}

export function TeacherPerformanceDashboard({ className }: TeacherPerformanceDashboardProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [cohortAnalysis, setCohortAnalysis] = useState<TeacherCohortAnalysis | null>(null);
  const [teacherMetrics, setTeacherMetrics] = useState<TeacherPerformanceMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState('30_days');
  const [filters, setFilters] = useState<TeacherPerformanceFilters>({});
  const [sortBy, setSortBy] = useState<TeacherPerformanceSort>({ field: 'overallRating', order: 'desc' });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedView, setSelectedView] = useState('overview');

  useEffect(() => {
    loadDashboardData();
  }, [timeframe, filters, sortBy]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load dashboard data
      const [dashboard, cohort, searchResults] = await Promise.all([
        enhancedTeacherPerformanceAnalytics.getTeacherPerformanceDashboard(),
        enhancedTeacherPerformanceAnalytics.getTeacherCohortAnalysis(),
        enhancedTeacherPerformanceAnalytics.searchTeachers(filters, sortBy, 1, 20)
      ]);

      setDashboardData(dashboard);
      setCohortAnalysis(cohort);
      setTeacherMetrics(searchResults.teachers);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to load teacher performance data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof TeacherPerformanceFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleExportReport = async () => {
    try {
      const teacherIds = teacherMetrics.map(t => t.teacherId);
      const report = await enhancedTeacherPerformanceAnalytics.generateTeacherPerformanceReport(
        teacherIds,
        {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString()
        }
      );
      
      // In a real app, this would trigger a download
      console.log('Generated report:', report);
    } catch (err) {
      console.error('Failed to generate report:', err);
    }
  };

  const getPerformanceColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 4.0) return 'text-blue-600';
    if (rating >= 3.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceLevel = (rating: number): 'high' | 'medium' | 'low' => {
    if (rating >= 4.5) return 'high';
    if (rating >= 3.5) return 'medium';
    return 'low';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'declining':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'performance_decline':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'high_cancellation':
        return <XCircle className="w-4 h-4 text-yellow-600" />;
      case 'positive_feedback':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-blue-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
        <p className="text-destructive">{error}</p>
        <Button onClick={loadDashboardData} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  if (!dashboardData || !cohortAnalysis) {
    return (
      <div className="text-center py-8">
        <p>No data available</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teacher Performance Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive analytics and insights for teacher performance management
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7_days">7 Days</SelectItem>
              <SelectItem value="30_days">30 Days</SelectItem>
              <SelectItem value="90_days">90 Days</SelectItem>
              <SelectItem value="1_year">1 Year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExportReport} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.overview.totalTeachers}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="w-3 h-3 mr-1" />
              +{dashboardData.overview.monthlyChange}% from last month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center">
              {dashboardData.overview.averageRating.toFixed(1)}
              <span className="text-sm text-muted-foreground ml-1">/5.0</span>
            </div>
            <div className="flex items-center mt-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-3 w-3 ${
                    i < Math.floor(dashboardData.overview.averageRating)
                      ? 'text-yellow-400 fill-current'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Performers</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{dashboardData.overview.highPerformers}</div>
            <p className="text-xs text-muted-foreground">
              {((dashboardData.overview.highPerformers / dashboardData.overview.totalTeachers) * 100).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Attention</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{dashboardData.overview.needsAttention}</div>
            <p className="text-xs text-muted-foreground">
              Requires immediate support
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="teachers">Teachers</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Performance Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Performance Distribution
                </CardTitle>
                <CardDescription>
                  Distribution of teacher performance ratings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AnalyticsChart
                  title=""
                  data={dashboardData.performanceDistribution}
                  type="pie"
                  dataKey="count"
                  xAxisKey="range"
                  height={250}
                />
              </CardContent>
            </Card>

            {/* Key Metrics Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="w-5 h-5" />
                  Key Metrics Trends
                </CardTitle>
                <CardDescription>
                  Monthly trends in key performance indicators
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.keyMetrics.map((metric, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`text-2xl font-bold ${TREND_COLORS[metric.trend]}`}>
                          {metric.value.toFixed(1)}
                        </div>
                        <div>
                          <div className="font-medium">{metric.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {metric.trend === 'up' ? '+' : metric.trend === 'down' ? '-' : ''}
                            {Math.abs(metric.changePercentage).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        {getTrendIcon(metric.trend)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Recent Activities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData.recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div>
                        <div className="font-medium">{activity.teacherName}</div>
                        <div className="text-sm text-muted-foreground">{activity.description}</div>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Student Satisfaction</span>
                    <span className="font-bold">4.3/5.0</span>
                  </div>
                  <Progress value={86} className="h-2" />
                  
                  <div className="flex justify-between items-center">
                    <span>Class Completion Rate</span>
                    <span className="font-bold">92%</span>
                  </div>
                  <Progress value={92} className="h-2" />
                  
                  <div className="flex justify-between items-center">
                    <span>Punctuality Rate</span>
                    <span className="font-bold">95%</span>
                  </div>
                  <Progress value={95} className="h-2" />
                  
                  <div className="flex justify-between items-center">
                    <span>Student Progress</span>
                    <span className="font-bold">88%</span>
                  </div>
                  <Progress value={88} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Cohort Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Cohort Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{cohortAnalysis.statistics.averageRating.toFixed(1)}</div>
                    <div className="text-sm text-muted-foreground">Average Rating</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold">{cohortAnalysis.statistics.averageExperience.toFixed(1)}</div>
                    <div className="text-sm text-muted-foreground">Avg Experience (years)</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold">{cohortAnalysis.statistics.standardDeviation.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">Standard Deviation</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Performers */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {cohortAnalysis.topPerformers.slice(0, 5).map((teacher, index) => (
                    <div key={teacher.teacherId} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-yellow-100 text-yellow-800 rounded-full flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <div className="font-medium">{teacher.teacherName}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="font-bold">{teacher.rating.toFixed(1)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Trends Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <AnalyticsChart
                title="Monthly Performance Trends"
                data={[
                  { month: 'Jan', satisfaction: 4.1, completion: 88, punctuality: 92 },
                  { month: 'Feb', satisfaction: 4.2, completion: 90, punctuality: 94 },
                  { month: 'Mar', satisfaction: 4.3, completion: 92, punctuality: 95 },
                  { month: 'Apr', satisfaction: 4.2, completion: 91, punctuality: 93 },
                  { month: 'May', satisfaction: 4.4, completion: 93, punctuality: 96 },
                  { month: 'Jun', satisfaction: 4.3, completion: 92, punctuality: 95 }
                ]}
                type="line"
                dataKey={["satisfaction", "completion", "punctuality"]}
                xAxisKey="month"
                height={300}
                colors={["#f59e0b", "#10b981", "#3b82f6"]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Teachers Tab */}
        <TabsContent value="teachers" className="space-y-4">
          {/* Search and Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Search & Filter Teachers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search teachers..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={sortBy.field} onValueChange={(value) => setSortBy(prev => ({ ...prev, field: value }))}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="overallRating">Overall Rating</SelectItem>
                    <SelectItem value="teacherName">Name</SelectItem>
                    <SelectItem value="experienceYears">Experience</SelectItem>
                    <SelectItem value="studentSatisfaction">Student Satisfaction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Teachers List */}
          <Card>
            <CardHeader>
              <CardTitle>Teachers Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teacherMetrics.map((teacher, index) => (
                  <div key={teacher.teacherId} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage src={`/api/placeholder/40/40`} />
                        <AvatarFallback>
                          {teacher.teacherName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{teacher.teacherName}</div>
                        <div className="text-sm text-muted-foreground">
                          {teacher.experienceYears} years experience • {teacher.specializations.join(', ')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className={`text-lg font-bold ${getPerformanceColor(teacher.overallRating)}`}>
                          {teacher.overallRating.toFixed(1)}
                        </div>
                        <div className="text-xs text-muted-foreground">Rating</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold">
                          {teacher.metrics.studentSatisfaction.averageRating.toFixed(1)}
                        </div>
                        <div className="text-xs text-muted-foreground">Satisfaction</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold">
                          {teacher.metrics.classManagement.punctualityRate.toFixed(0)}%
                        </div>
                        <div className="text-xs text-muted-foreground">Punctuality</div>
                      </div>
                      <Badge variant="outline" className={PERFORMANCE_LEVEL_COLORS[getPerformanceLevel(teacher.overallRating)]}>
                        {getPerformanceLevel(teacher.overallRating)}
                      </Badge>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Specialization Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Specialization Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {cohortAnalysis.commonStrengths.map((strength, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="font-medium">{strength}</span>
                      </div>
                      <Badge variant="secondary">Strength</Badge>
                    </div>
                  ))}
                  {cohortAnalysis.commonChallenges.map((challenge, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-600" />
                        <span className="font-medium">{challenge}</span>
                      </div>
                      <Badge variant="outline">Challenge</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Performance Heatmap */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Heatmap</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: 25 }, (_, i) => (
                    <div
                      key={i}
                      className={`h-8 w-8 rounded ${
                        i % 3 === 0 ? 'bg-green-200' : 
                        i % 3 === 1 ? 'bg-yellow-200' : 'bg-red-200'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex justify-between mt-4 text-sm text-muted-foreground">
                  <span>Low Performance</span>
                  <span>High Performance</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Analytics */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Performance Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <AnalyticsChart
                title="Multi-Dimensional Performance Analysis"
                data={teacherMetrics.slice(0, 10).map(t => ({
                  name: t.teacherName,
                  satisfaction: t.metrics.studentSatisfaction.averageRating * 20,
                  punctuality: t.metrics.classManagement.punctualityRate,
                  effectiveness: t.metrics.teachingEffectiveness.studentProgressRate,
                  availability: t.metrics.availability.schedulingFlexibility
                }))}
                type="radar"
                dataKey={["satisfaction", "punctuality", "effectiveness", "availability"]}
                xAxisKey="name"
                height={400}
                colors={["#f59e0b", "#10b981", "#3b82f6", "#8b5cf6"]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Active Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData.alerts.map((alert, index) => (
                  <div key={index} className={`p-4 border rounded-lg ${
                    alert.priority === 'high' ? 'border-red-200 bg-red-50' :
                    alert.priority === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                    'border-blue-200 bg-blue-50'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {getAlertIcon(alert.type)}
                        <div>
                          <div className="font-medium">{alert.teacherName}</div>
                          <div className="text-sm text-muted-foreground">{alert.message}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={alert.priority === 'high' ? 'destructive' : 
                                      alert.priority === 'medium' ? 'default' : 'secondary'}>
                          {alert.priority}
                        </Badge>
                        <Button variant="outline" size="sm">
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <Button onClick={handleExportReport} className="flex-col h-24">
                  <Download className="w-6 h-6 mb-2" />
                  <span>Export Full Report</span>
                </Button>
                <Button variant="outline" className="flex-col h-24">
                  <BarChart3 className="w-6 h-6 mb-2" />
                  <span>Performance Analysis</span>
                </Button>
                <Button variant="outline" className="flex-col h-24">
                  <Users className="w-6 h-6 mb-2" />
                  <span>Teacher Comparison</span>
                </Button>
                <Button variant="outline" className="flex-col h-24">
                  <TrendingUp className="w-6 h-6 mb-2" />
                  <span>Trend Analysis</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}