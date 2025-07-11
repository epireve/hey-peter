"use client";

import { logger } from '@/lib/services';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Calendar,
  Clock,
  Users,
  Star,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Award,
  BookOpen,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  PieChart,
  LineChart,
  Download,
  Eye,
  Edit,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Zap,
  Trophy,
  Crown
} from "lucide-react";
import { AnalyticsChart } from "../AnalyticsChart";
import {
  MetricCard,
  PerformanceRadarChart,
  RecommendationCard,
  TrendIndicator,
  AlertCard,
  PerformanceSummary
} from "./TeacherPerformanceComponents";
import { enhancedTeacherPerformanceAnalytics } from "@/lib/services/teacher-performance-analytics-enhanced";
import {
  TeacherPerformanceMetrics,
  TeacherIndividualDashboard,
  TeacherHourAnalytics,
  StudentFeedbackAnalytics,
  AttendanceAnalytics,
  TeacherPeerComparison,
  PERFORMANCE_LEVEL_COLORS,
  TREND_COLORS
} from "@/types/teacher-performance";

interface TeacherIndividualAnalyticsProps {
  teacherId: string;
  className?: string;
}

export function TeacherIndividualAnalytics({ teacherId, className }: TeacherIndividualAnalyticsProps) {
  const [teacherMetrics, setTeacherMetrics] = useState<TeacherPerformanceMetrics | null>(null);
  const [dashboardData, setDashboardData] = useState<TeacherIndividualDashboard | null>(null);
  const [hourAnalytics, setHourAnalytics] = useState<TeacherHourAnalytics | null>(null);
  const [feedbackAnalytics, setFeedbackAnalytics] = useState<StudentFeedbackAnalytics | null>(null);
  const [attendanceAnalytics, setAttendanceAnalytics] = useState<AttendanceAnalytics | null>(null);
  const [peerComparison, setPeerComparison] = useState<TeacherPeerComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState('90_days');

  useEffect(() => {
    loadTeacherData();
  }, [teacherId, timeframe]);

  const loadTeacherData = async () => {
    try {
      setLoading(true);
      setError(null);

      const endDate = new Date().toISOString();
      const startDate = new Date(
        Date.now() - (timeframe === '30_days' ? 30 : timeframe === '90_days' ? 90 : 365) * 24 * 60 * 60 * 1000
      ).toISOString();

      const [
        metrics,
        dashboard,
        hours,
        feedback,
        attendance,
        comparison
      ] = await Promise.all([
        enhancedTeacherPerformanceAnalytics.getTeacherPerformanceMetrics(teacherId),
        enhancedTeacherPerformanceAnalytics.getTeacherIndividualDashboard(teacherId),
        enhancedTeacherPerformanceAnalytics.getTeacherHourAnalytics(teacherId, startDate, endDate),
        enhancedTeacherPerformanceAnalytics.getStudentFeedbackAnalytics(teacherId, startDate, endDate),
        enhancedTeacherPerformanceAnalytics.getAttendanceAnalytics(teacherId, startDate, endDate),
        enhancedTeacherPerformanceAnalytics.getTeacherPeerComparison(teacherId)
      ]);

      setTeacherMetrics(metrics);
      setDashboardData(dashboard);
      setHourAnalytics(hours);
      setFeedbackAnalytics(feedback);
      setAttendanceAnalytics(attendance);
      setPeerComparison(comparison);
    } catch (err) {
      logger.error('Failed to load teacher data:', err);
      setError('Failed to load teacher data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 4.0) return 'text-blue-600';
    if (rating >= 3.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRankingIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Trophy className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Award className="w-5 h-5 text-orange-500" />;
    return <Target className="w-5 h-5 text-blue-500" />;
  };

  const buildPerformanceRadarData = () => {
    if (!teacherMetrics) return [];

    return [
      {
        metric: 'Teaching Effectiveness',
        value: teacherMetrics.metrics.teachingEffectiveness.studentProgressRate,
        benchmark: 80
      },
      {
        metric: 'Student Satisfaction',
        value: teacherMetrics.metrics.studentSatisfaction.averageRating * 20,
        benchmark: 84
      },
      {
        metric: 'Class Management',
        value: teacherMetrics.metrics.classManagement.punctualityRate,
        benchmark: 90
      },
      {
        metric: 'Availability',
        value: teacherMetrics.metrics.availability.schedulingFlexibility,
        benchmark: 75
      },
      {
        metric: 'Professional Development',
        value: teacherMetrics.metrics.professionalDevelopment.trainingCompletionRate * 100,
        benchmark: 70
      }
    ];
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
        <Button onClick={loadTeacherData} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  if (!teacherMetrics || !dashboardData) {
    return (
      <div className="text-center py-8">
        <p>No teacher data available</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src="/api/placeholder/64/64" />
            <AvatarFallback className="text-xl">
              {teacherMetrics.teacherName.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{teacherMetrics.teacherName}</h1>
            <p className="text-muted-foreground">
              {teacherMetrics.experienceYears} years experience • {teacherMetrics.specializations.join(', ')}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {teacherMetrics.email}
              </Badge>
              <Badge variant="outline" className="text-xs">
                ID: {teacherMetrics.teacherId}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30_days">30 Days</SelectItem>
              <SelectItem value="90_days">90 Days</SelectItem>
              <SelectItem value="1_year">1 Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <MetricCard
          title="Overall Rating"
          value={teacherMetrics.overallRating.toFixed(1)}
          unit="/100"
          trend="up"
          changePercentage={2.5}
          icon={<Star className="h-4 w-4 text-muted-foreground" />}
        />
        
        <MetricCard
          title="Ranking"
          value={`#${peerComparison?.ranking.overall || 'N/A'}`}
          trend="stable"
          changePercentage={0}
          icon={getRankingIcon(peerComparison?.ranking.overall || 999)}
        />
        
        <MetricCard
          title="Student Satisfaction"
          value={teacherMetrics.metrics.studentSatisfaction.averageRating.toFixed(1)}
          unit="/5.0"
          trend="up"
          changePercentage={1.8}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
        
        <MetricCard
          title="Hours Taught"
          value={hourAnalytics?.totalHoursTaught.toFixed(1) || '0'}
          unit="hrs"
          trend="up"
          changePercentage={12.5}
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="hours">Hours</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
          <TabsTrigger value="recommendations">Actions</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Performance Summary */}
            <PerformanceSummary 
              metrics={teacherMetrics} 
              showDetails={true}
            />
            
            {/* Quick Goals */}
            <Card>
              <CardHeader>
                <CardTitle>Current Goals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.goalsAndTargets.map((goal, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{goal.goal}</span>
                        <span className="text-sm text-muted-foreground">
                          {goal.current.toFixed(1)}/{goal.target.toFixed(1)}
                        </span>
                      </div>
                      <Progress value={goal.progress} className="h-2" />
                      <div className="text-xs text-muted-foreground">
                        Due: {new Date(goal.deadline).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Radar */}
          <PerformanceRadarChart
            data={buildPerformanceRadarData()}
            title="Performance Overview"
            height={400}
          />

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData.recentPerformance.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div>
                        <div className="font-medium">{item.metric}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(item.date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{item.value.toFixed(1)}</span>
                      {item.trend === 'up' ? (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      ) : item.trend === 'down' ? (
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      ) : (
                        <Activity className="w-4 h-4 text-gray-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Teaching Effectiveness */}
            <Card>
              <CardHeader>
                <CardTitle>Teaching Effectiveness</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Student Progress Rate</span>
                    <span className="font-bold">{teacherMetrics.metrics.teachingEffectiveness.studentProgressRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={teacherMetrics.metrics.teachingEffectiveness.studentProgressRate} />
                  
                  <div className="flex justify-between items-center">
                    <span>Lesson Completion Rate</span>
                    <span className="font-bold">{teacherMetrics.metrics.teachingEffectiveness.lessonCompletionRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={teacherMetrics.metrics.teachingEffectiveness.lessonCompletionRate} />
                  
                  <div className="flex justify-between items-center">
                    <span>Learning Objectives</span>
                    <span className="font-bold">{teacherMetrics.metrics.teachingEffectiveness.learningObjectiveAchievement.toFixed(1)}%</span>
                  </div>
                  <Progress value={teacherMetrics.metrics.teachingEffectiveness.learningObjectiveAchievement} />
                </div>
              </CardContent>
            </Card>

            {/* Class Management */}
            <Card>
              <CardHeader>
                <CardTitle>Class Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Punctuality Rate</span>
                    <span className="font-bold">{teacherMetrics.metrics.classManagement.punctualityRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={teacherMetrics.metrics.classManagement.punctualityRate} />
                  
                  <div className="flex justify-between items-center">
                    <span>Attendance Rate</span>
                    <span className="font-bold">{teacherMetrics.metrics.classManagement.attendanceRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={teacherMetrics.metrics.classManagement.attendanceRate} />
                  
                  <div className="flex justify-between items-center">
                    <span>Preparation Score</span>
                    <span className="font-bold">{teacherMetrics.metrics.classManagement.classPreparationScore.toFixed(1)}%</span>
                  </div>
                  <Progress value={teacherMetrics.metrics.classManagement.classPreparationScore} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <AnalyticsChart
                title="Monthly Performance Trends"
                data={[
                  { month: 'Jan', satisfaction: 4.1, effectiveness: 82, punctuality: 92 },
                  { month: 'Feb', satisfaction: 4.2, effectiveness: 85, punctuality: 94 },
                  { month: 'Mar', satisfaction: 4.3, effectiveness: 87, punctuality: 95 },
                  { month: 'Apr', satisfaction: 4.2, effectiveness: 84, punctuality: 93 },
                  { month: 'May', satisfaction: 4.4, effectiveness: 88, punctuality: 96 },
                  { month: 'Jun', satisfaction: 4.3, effectiveness: 86, punctuality: 95 }
                ]}
                type="line"
                dataKey={["satisfaction", "effectiveness", "punctuality"]}
                xAxisKey="month"
                height={300}
                colors={["#f59e0b", "#10b981", "#3b82f6"]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feedback Tab */}
        <TabsContent value="feedback" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Feedback Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Feedback Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold">{feedbackAnalytics?.averageRating.toFixed(1) || 'N/A'}</div>
                    <div className="text-sm text-muted-foreground">Average Rating</div>
                    <div className="flex items-center justify-center mt-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < Math.floor(feedbackAnalytics?.averageRating || 0)
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-xl font-bold">{feedbackAnalytics?.totalFeedbackReceived || 0}</div>
                      <div className="text-sm text-muted-foreground">Total Feedback</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold">{((feedbackAnalytics?.responseRate || 0) * 100).toFixed(0)}%</div>
                      <div className="text-sm text-muted-foreground">Response Rate</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Feedback Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Rating Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(teacherMetrics.metrics.studentSatisfaction.ratingDistribution).map(([rating, count]) => (
                    <div key={rating} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{rating} Star{rating !== '1' ? 's' : ''}</span>
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={count} className="w-20" />
                        <span className="text-sm font-medium">{count}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Feedback Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Feedback Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <AnalyticsChart
                title="Monthly Feedback Trends"
                data={feedbackAnalytics?.monthlyFeedbackTrends || []}
                type="line"
                dataKey={["averageRating", "feedbackCount"]}
                xAxisKey="month"
                height={300}
                colors={["#f59e0b", "#3b82f6"]}
              />
            </CardContent>
          </Card>

          {/* Sentiment Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Sentiment Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-medium mb-2">Positive Themes</h4>
                  <div className="space-y-2">
                    {feedbackAnalytics?.sentimentAnalysis.commonPositiveThemes.map((theme, index) => (
                      <Badge key={index} variant="secondary" className="bg-green-100 text-green-800">
                        {theme}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Areas for Improvement</h4>
                  <div className="space-y-2">
                    {feedbackAnalytics?.sentimentAnalysis.commonNegativeThemes.map((theme, index) => (
                      <Badge key={index} variant="secondary" className="bg-orange-100 text-orange-800">
                        {theme}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hours Tab */}
        <TabsContent value="hours" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              title="Total Hours Taught"
              value={hourAnalytics?.totalHoursTaught.toFixed(1) || '0'}
              unit="hrs"
              icon={<Clock className="h-4 w-4 text-muted-foreground" />}
            />
            <MetricCard
              title="Average Weekly Hours"
              value={hourAnalytics?.averageHoursPerWeek.toFixed(1) || '0'}
              unit="hrs/week"
              icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
            />
            <MetricCard
              title="Utilization Rate"
              value={((hourAnalytics?.utilizationRate || 0) * 100).toFixed(1)}
              unit="%"
              icon={<Target className="h-4 w-4 text-muted-foreground" />}
            />
          </div>

          {/* Class Distribution */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Classes by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <AnalyticsChart
                  title=""
                  data={Object.entries(hourAnalytics?.classesByType || {}).map(([type, count]) => ({
                    type,
                    count
                  }))}
                  type="pie"
                  dataKey="count"
                  xAxisKey="type"
                  height={250}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Classes by Level</CardTitle>
              </CardHeader>
              <CardContent>
                <AnalyticsChart
                  title=""
                  data={Object.entries(hourAnalytics?.classesByLevel || {}).map(([level, count]) => ({
                    level,
                    count
                  }))}
                  type="bar"
                  dataKey="count"
                  xAxisKey="level"
                  height={250}
                />
              </CardContent>
            </Card>
          </div>

          {/* Earnings Information */}
          <Card>
            <CardHeader>
              <CardTitle>Earnings & Compensation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    ${hourAnalytics?.totalEarnings.toFixed(0) || '0'}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Earnings</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">
                    ${hourAnalytics?.averageHourlyRate.toFixed(0) || '0'}
                  </div>
                  <div className="text-sm text-muted-foreground">Hourly Rate</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    ${hourAnalytics?.bonusEarnings.toFixed(0) || '0'}
                  </div>
                  <div className="text-sm text-muted-foreground">Bonus Earnings</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">
                    {((hourAnalytics?.teachingEfficiencyScore || 0) * 100).toFixed(0)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Efficiency Score</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <MetricCard
              title="Average Attendance Rate"
              value={attendanceAnalytics?.averageAttendanceRate.toFixed(1) || '0'}
              unit="%"
              icon={<Users className="h-4 w-4 text-muted-foreground" />}
            />
            <MetricCard
              title="Perfect Attendance Classes"
              value={attendanceAnalytics?.classesWithPerfectAttendance.toString() || '0'}
              icon={<CheckCircle className="h-4 w-4 text-muted-foreground" />}
            />
          </div>

          {/* Attendance Patterns */}
          <Card>
            <CardHeader>
              <CardTitle>Attendance Patterns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">By Day of Week</h4>
                  <div className="space-y-2">
                    {Object.entries(attendanceAnalytics?.attendanceByDayOfWeek || {}).map(([day, rate]) => (
                      <div key={day} className="flex items-center justify-between">
                        <span className="text-sm">{day}</span>
                        <div className="flex items-center gap-2">
                          <Progress value={rate} className="w-20" />
                          <span className="text-sm font-medium">{rate.toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">By Time Slot</h4>
                  <div className="space-y-2">
                    {Object.entries(attendanceAnalytics?.attendanceByTimeSlot || {}).map(([slot, rate]) => (
                      <div key={slot} className="flex items-center justify-between">
                        <span className="text-sm">{slot}</span>
                        <div className="flex items-center gap-2">
                          <Progress value={rate} className="w-20" />
                          <span className="text-sm font-medium">{rate.toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comparison Tab */}
        <TabsContent value="comparison" className="space-y-4">
          {peerComparison && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Peer Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold">#{peerComparison.ranking.overall}</div>
                      <div className="text-sm text-muted-foreground">Overall Ranking</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">{peerComparison.ranking.percentile}%</div>
                      <div className="text-sm text-muted-foreground">Percentile</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-lg font-bold">{peerComparison.peerGroup.size}</div>
                      <div className="text-sm text-muted-foreground">Peer Group Size</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Strengths & Improvements</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2 text-green-600">Strengths</h4>
                      <div className="space-y-1">
                        {peerComparison.strengthAreas.map((strength, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-sm">{strength}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2 text-orange-600">Areas for Improvement</h4>
                      <div className="space-y-1">
                        {peerComparison.improvementAreas.map((area, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-orange-600" />
                            <span className="text-sm">{area}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          <div className="grid gap-4">
            {teacherMetrics.recommendations.map((recommendation, index) => (
              <RecommendationCard
                key={index}
                recommendation={recommendation}
                onViewDetails={() => logger.info('View details:', recommendation)}
                onImplement={() => logger.info('Implement:', recommendation)}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}