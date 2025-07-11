'use client';

import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import {
  TrendingUp, TrendingDown, Star, Users, Award, BookOpen,
  Calendar, Filter, Download, BarChart3, LineChart,
  PieChart, Target, AlertTriangle, CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart as RechartsLineChart, Line, BarChart as RechartsBarChart, Bar, 
         PieChart as RechartsPieChart, Cell, XAxis, YAxis, CartesianGrid, 
         Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { toast } from '@/components/ui/use-toast';
import { feedbackService } from '@/lib/services/feedback-service';
import { FeedbackAnalytics } from '@/types/feedback';

interface AnalyticsFilters {
  period: 'week' | 'month' | 'quarter' | 'year';
  dateRange?: { from: Date; to: Date };
  teacherId?: string;
  courseId?: string;
  feedbackType: 'all' | 'student_feedback' | 'teacher_feedback' | 'course_feedback';
}

interface TrendData {
  date: string;
  averageRating: number;
  feedbackCount: number;
  positivePercentage: number;
}

interface TeacherPerformance {
  teacherId: string;
  teacherName: string;
  averageRating: number;
  feedbackCount: number;
  trend: 'improving' | 'stable' | 'declining';
  strengths: string[];
  improvements: string[];
}

interface CoursePerformance {
  courseId: string;
  courseName: string;
  averageRating: number;
  feedbackCount: number;
  completionRate: number;
  recommendationRate: number;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

const FeedbackAnalyticsDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<FeedbackAnalytics | null>(null);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [teacherPerformance, setTeacherPerformance] = useState<TeacherPerformance[]>([]);
  const [coursePerformance, setCoursePerformance] = useState<CoursePerformance[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState<AnalyticsFilters>({
    period: 'month',
    feedbackType: 'all'
  });

  useEffect(() => {
    loadAnalytics();
  }, [filters]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // Load general analytics
      const analyticsData = await loadGeneralAnalytics();
      setAnalytics(analyticsData);

      // Load trend data
      const trendsData = await loadTrendData();
      setTrendData(trendsData);

      // Load teacher performance
      const teachersData = await loadTeacherPerformance();
      setTeacherPerformance(teachersData);

      // Load course performance
      const coursesData = await loadCoursePerformance();
      setCoursePerformance(coursesData);

    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadGeneralAnalytics = async (): Promise<FeedbackAnalytics> => {
    // Mock data - in production, this would fetch from the feedback service
    return {
      period: filters.period,
      total_feedback_count: 245,
      average_rating: 4.2,
      rating_distribution: { 1: 5, 2: 12, 3: 45, 4: 98, 5: 85 },
      sentiment_analysis: { positive: 68, neutral: 25, negative: 7 },
      top_strengths: ['communication', 'engagement', 'knowledge', 'punctuality', 'patience'],
      common_improvements: ['pace', 'materials', 'homework_feedback', 'explanation_clarity', 'interaction'],
      trends: {
        rating_trend: 'improving',
        feedback_volume_trend: 'increasing'
      }
    };
  };

  const loadTrendData = async (): Promise<TrendData[]> => {
    // Mock trend data
    const now = new Date();
    const trends: TrendData[] = [];
    
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(now, i);
      trends.push({
        date: format(date, 'MMM yyyy'),
        averageRating: 3.8 + Math.random() * 0.8,
        feedbackCount: 15 + Math.floor(Math.random() * 25),
        positivePercentage: 60 + Math.random() * 25
      });
    }
    
    return trends;
  };

  const loadTeacherPerformance = async (): Promise<TeacherPerformance[]> => {
    // Mock teacher performance data
    return [
      {
        teacherId: '1',
        teacherName: 'Sarah Johnson',
        averageRating: 4.7,
        feedbackCount: 38,
        trend: 'improving',
        strengths: ['communication', 'engagement', 'patience'],
        improvements: ['pace', 'materials']
      },
      {
        teacherId: '2',
        teacherName: 'Michael Chen',
        averageRating: 4.5,
        feedbackCount: 42,
        trend: 'stable',
        strengths: ['knowledge', 'punctuality', 'feedback'],
        improvements: ['interaction', 'homework']
      },
      {
        teacherId: '3',
        teacherName: 'Emily Rodriguez',
        averageRating: 4.3,
        feedbackCount: 35,
        trend: 'declining',
        strengths: ['creativity', 'energy'],
        improvements: ['clarity', 'pace', 'materials']
      }
    ];
  };

  const loadCoursePerformance = async (): Promise<CoursePerformance[]> => {
    // Mock course performance data
    return [
      {
        courseId: '1',
        courseName: 'Business English',
        averageRating: 4.6,
        feedbackCount: 52,
        completionRate: 85,
        recommendationRate: 92
      },
      {
        courseId: '2',
        courseName: 'Everyday A',
        averageRating: 4.4,
        feedbackCount: 73,
        completionRate: 78,
        recommendationRate: 88
      },
      {
        courseId: '3',
        courseName: 'Speak Up',
        averageRating: 4.2,
        feedbackCount: 41,
        completionRate: 82,
        recommendationRate: 85
      }
    ];
  };

  const exportAnalytics = async () => {
    try {
      // In production, this would call an export service
      toast({
        title: "Export Started",
        description: "Analytics report is being generated and will be downloaded shortly.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export analytics report.",
        variant: "destructive"
      });
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'declining':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <div className="w-4 h-4" />;
    }
  };

  const getTrendBadge = (trend: string) => {
    const variant = trend === 'improving' ? 'default' : trend === 'declining' ? 'destructive' : 'secondary';
    return <Badge variant={variant}>{trend}</Badge>;
  };

  const renderStarRating = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-1 text-sm font-medium">{rating.toFixed(1)}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Feedback Analytics</h1>
          <p className="text-muted-foreground">Comprehensive insights into feedback and rating trends</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select
            value={filters.period}
            onValueChange={(value) => setFilters(prev => ({ ...prev, period: value as any }))}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last Week</SelectItem>
              <SelectItem value="month">Last Month</SelectItem>
              <SelectItem value="quarter">Last Quarter</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          
          <Select
            value={filters.feedbackType}
            onValueChange={(value) => setFilters(prev => ({ ...prev, feedbackType: value as any }))}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Feedback</SelectItem>
              <SelectItem value="student_feedback">Student Feedback</SelectItem>
              <SelectItem value="teacher_feedback">Teacher Feedback</SelectItem>
              <SelectItem value="course_feedback">Course Feedback</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={exportAnalytics} variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Feedback</p>
                <p className="text-2xl font-bold">{analytics?.total_feedback_count}</p>
              </div>
              <Star className="w-8 h-8 text-primary" />
            </div>
            <div className="flex items-center mt-2">
              {getTrendIcon(analytics?.trends.feedback_volume_trend || 'stable')}
              <p className="text-xs text-muted-foreground ml-1">
                {analytics?.trends.feedback_volume_trend} trend
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average Rating</p>
                <p className="text-2xl font-bold">{analytics?.average_rating.toFixed(1)}/5</p>
              </div>
              <Award className="w-8 h-8 text-yellow-500" />
            </div>
            <div className="flex items-center mt-2">
              {getTrendIcon(analytics?.trends.rating_trend || 'stable')}
              <p className="text-xs text-muted-foreground ml-1">
                {analytics?.trends.rating_trend} trend
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Positive Feedback</p>
                <p className="text-2xl font-bold">{analytics?.sentiment_analysis.positive}%</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <Progress value={analytics?.sentiment_analysis.positive} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Response Rate</p>
                <p className="text-2xl font-bold">78%</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
            <Progress value={78} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <Tabs defaultValue="trends" className="space-y-6">
        <TabsList className="grid grid-cols-5 w-fit">
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="teachers">Teachers</TabsTrigger>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        {/* Trends Tab */}
        <TabsContent value="trends">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="w-5 h-5" />
                  Rating Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsLineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 5]} />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="averageRating" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      name="Average Rating"
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Feedback Volume
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsBarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="feedbackCount" fill="#82ca9d" name="Feedback Count" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Distribution Tab */}
        <TabsContent value="distribution">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Rating Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={analytics?.rating_distribution ? Object.entries(analytics.rating_distribution).map(([rating, count]) => ({
                        name: `${rating} Star${rating !== '1' ? 's' : ''}`,
                        value: count,
                        rating: parseInt(rating)
                      })) : []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analytics?.rating_distribution && Object.entries(analytics.rating_distribution).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Sentiment Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-green-600">Positive</span>
                      <span className="text-sm font-bold">{analytics?.sentiment_analysis.positive}%</span>
                    </div>
                    <Progress value={analytics?.sentiment_analysis.positive} className="bg-green-100" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-600">Neutral</span>
                      <span className="text-sm font-bold">{analytics?.sentiment_analysis.neutral}%</span>
                    </div>
                    <Progress value={analytics?.sentiment_analysis.neutral} className="bg-gray-100" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-red-600">Negative</span>
                      <span className="text-sm font-bold">{analytics?.sentiment_analysis.negative}%</span>
                    </div>
                    <Progress value={analytics?.sentiment_analysis.negative} className="bg-red-100" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Teachers Tab */}
        <TabsContent value="teachers">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Teacher Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Feedback Count</TableHead>
                    <TableHead>Trend</TableHead>
                    <TableHead>Top Strengths</TableHead>
                    <TableHead>Improvement Areas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teacherPerformance.map((teacher) => (
                    <TableRow key={teacher.teacherId}>
                      <TableCell className="font-medium">{teacher.teacherName}</TableCell>
                      <TableCell>
                        {renderStarRating(teacher.averageRating)}
                      </TableCell>
                      <TableCell>{teacher.feedbackCount}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTrendIcon(teacher.trend)}
                          {getTrendBadge(teacher.trend)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {teacher.strengths.slice(0, 2).map((strength) => (
                            <Badge key={strength} variant="outline" className="text-xs">
                              {strength}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {teacher.improvements.slice(0, 2).map((improvement) => (
                            <Badge key={improvement} variant="secondary" className="text-xs">
                              {improvement}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Courses Tab */}
        <TabsContent value="courses">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Course Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Feedback Count</TableHead>
                    <TableHead>Completion Rate</TableHead>
                    <TableHead>Recommendation Rate</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coursePerformance.map((course) => (
                    <TableRow key={course.courseId}>
                      <TableCell className="font-medium">{course.courseName}</TableCell>
                      <TableCell>
                        {renderStarRating(course.averageRating)}
                      </TableCell>
                      <TableCell>{course.feedbackCount}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={course.completionRate} className="w-16" />
                          <span className="text-sm">{course.completionRate}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={course.recommendationRate} className="w-16" />
                          <span className="text-sm">{course.recommendationRate}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={course.averageRating >= 4.5 ? 'default' : course.averageRating >= 4.0 ? 'secondary' : 'destructive'}>
                          {course.averageRating >= 4.5 ? 'Excellent' : course.averageRating >= 4.0 ? 'Good' : 'Needs Attention'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Top Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics?.top_strengths.map((strength, index) => (
                    <div key={strength} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                          {index + 1}
                        </Badge>
                        <span className="capitalize font-medium">{strength}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={(5 - index) * 20} className="w-16" />
                        <span className="text-sm text-muted-foreground">
                          {((5 - index) * 20)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Common Improvements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics?.common_improvements.map((improvement, index) => (
                    <div key={improvement} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="w-8 h-8 rounded-full flex items-center justify-center">
                          {index + 1}
                        </Badge>
                        <span className="capitalize font-medium">{improvement}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={(5 - index) * 15} className="w-16 bg-orange-100" />
                        <span className="text-sm text-muted-foreground">
                          {((5 - index) * 15)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FeedbackAnalyticsDashboard;