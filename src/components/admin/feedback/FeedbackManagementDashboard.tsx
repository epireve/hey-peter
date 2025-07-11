'use client';

import { logger } from '@/lib/services';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  Star, MessageSquare, Users, TrendingUp, TrendingDown, Filter, 
  Search, Download, AlertTriangle, CheckCircle, Eye, Reply,
  BarChart3, PieChart, Calendar, Award, Target
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/components/ui/use-toast';
import { feedbackService } from '@/lib/services/feedback-service';
import { 
  StudentFeedbackWithRelations, 
  TeacherFeedbackWithRelations,
  FeedbackAlert, 
  FeedbackAnalytics,
  TeacherRecommendationWithRelations,
  CourseRecommendationWithRelations
} from '@/types/feedback';

interface DashboardStats {
  total_feedback: number;
  average_rating: number;
  positive_feedback_percentage: number;
  response_rate: number;
  alerts_count: number;
  recommendations_count: number;
}

interface FeedbackFilters {
  search: string;
  feedback_type: 'all' | 'student_feedback' | 'teacher_feedback' | 'course_feedback';
  rating_filter: 'all' | 'high' | 'medium' | 'low';
  date_range: 'all' | 'week' | 'month' | 'quarter';
  teacher_id?: string;
  student_id?: string;
}

const FeedbackManagementDashboard: React.FC = () => {
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    total_feedback: 0,
    average_rating: 0,
    positive_feedback_percentage: 0,
    response_rate: 0,
    alerts_count: 0,
    recommendations_count: 0
  });

  const [studentFeedback, setStudentFeedback] = useState<StudentFeedbackWithRelations[]>([]);
  const [teacherFeedback, setTeacherFeedback] = useState<TeacherFeedbackWithRelations[]>([]);
  const [alerts, setAlerts] = useState<FeedbackAlert[]>([]);
  const [analytics, setAnalytics] = useState<FeedbackAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState<FeedbackFilters>({
    search: '',
    feedback_type: 'all',
    rating_filter: 'all',
    date_range: 'month'
  });

  const [selectedFeedback, setSelectedFeedback] = useState<any>(null);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [isResponding, setIsResponding] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [filters]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadStudentFeedback(),
        loadTeacherFeedback(),
        loadAlerts(),
        loadAnalytics(),
        loadDashboardStats()
      ]);
    } catch (error) {
      logger.error('Error loading dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load feedback dashboard data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStudentFeedback = async () => {
    const dateFilters = getDateRangeFilter(filters.date_range);
    const ratingFilters = getRatingFilter(filters.rating_filter);

    const { data } = await feedbackService.getStudentFeedbackList({
      ...dateFilters,
      ...ratingFilters,
      teacher_id: filters.teacher_id,
      limit: 50
    });

    setStudentFeedback(data);
  };

  const loadTeacherFeedback = async () => {
    const dateFilters = getDateRangeFilter(filters.date_range);
    const ratingFilters = getRatingFilter(filters.rating_filter);

    const { data } = await feedbackService.getTeacherFeedbackList({
      ...dateFilters,
      teacher_id: filters.teacher_id,
      student_id: filters.student_id,
      limit: 50
    });

    setTeacherFeedback(data);
  };

  const loadAlerts = async () => {
    const alertsData = await feedbackService.getFeedbackAlerts('admin-user-id', {
      is_read: false,
      limit: 20
    });
    setAlerts(alertsData);
  };

  const loadAnalytics = async () => {
    // For demo purposes, using mock analytics
    // In production, this would call a real analytics endpoint
    const mockAnalytics: FeedbackAnalytics = {
      period: filters.date_range,
      total_feedback_count: studentFeedback.length + teacherFeedback.length,
      average_rating: 4.2,
      rating_distribution: { 1: 5, 2: 10, 3: 25, 4: 35, 5: 25 },
      sentiment_analysis: { positive: 60, neutral: 30, negative: 10 },
      top_strengths: ['communication', 'engagement', 'clarity', 'punctuality', 'knowledge'],
      common_improvements: ['pace', 'materials', 'homework', 'feedback', 'explanation'],
      trends: {
        rating_trend: 'improving',
        feedback_volume_trend: 'increasing'
      }
    };
    setAnalytics(mockAnalytics);
  };

  const loadDashboardStats = async () => {
    // Calculate stats from loaded data
    const totalFeedback = studentFeedback.length + teacherFeedback.length;
    const totalRatings = studentFeedback.filter(f => f.overall_rating).map(f => f.overall_rating!);
    const averageRating = totalRatings.length > 0 
      ? totalRatings.reduce((sum, rating) => sum + rating, 0) / totalRatings.length 
      : 0;
    const positiveCount = totalRatings.filter(rating => rating >= 4).length;
    const positivePercentage = totalRatings.length > 0 ? (positiveCount / totalRatings.length) * 100 : 0;

    setDashboardStats({
      total_feedback: totalFeedback,
      average_rating: averageRating,
      positive_feedback_percentage: positivePercentage,
      response_rate: 85, // Mock response rate
      alerts_count: alerts.length,
      recommendations_count: 12 // Mock recommendations count
    });
  };

  const getDateRangeFilter = (range: string) => {
    const now = new Date();
    switch (range) {
      case 'week':
        return { date_from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString() };
      case 'month':
        return { date_from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString() };
      case 'quarter':
        return { date_from: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString() };
      default:
        return {};
    }
  };

  const getRatingFilter = (rating: string) => {
    switch (rating) {
      case 'high':
        return { rating_min: 4 };
      case 'medium':
        return { rating_min: 3, rating_max: 4 };
      case 'low':
        return { rating_max: 2 };
      default:
        return {};
    }
  };

  const handleViewFeedback = (feedback: any, type: string) => {
    setSelectedFeedback({ ...feedback, type });
    setShowFeedbackDialog(true);
  };

  const handleRespondToFeedback = async () => {
    if (!selectedFeedback || !responseText.trim()) return;

    setIsResponding(true);
    try {
      await feedbackService.createFeedbackResponse({
        original_feedback_id: selectedFeedback.id,
        original_feedback_type: selectedFeedback.type,
        responder_id: 'admin-user-id', // Should be current admin user ID
        responder_role: 'admin',
        response_text: responseText,
        action_taken: 'Administrative response provided'
      });

      toast({
        title: "Response Sent",
        description: "Your response has been sent successfully.",
      });

      setResponseText('');
      setShowFeedbackDialog(false);
      loadDashboardData(); // Refresh data
    } catch (error) {
      logger.error('Error sending response:', error);
      toast({
        title: "Error",
        description: "Failed to send response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsResponding(false);
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await feedbackService.acknowledgeAlert(alertId, 'Reviewed by admin');
      toast({
        title: "Alert Acknowledged",
        description: "Alert has been marked as acknowledged.",
      });
      loadAlerts();
    } catch (error) {
      logger.error('Error acknowledging alert:', error);
      toast({
        title: "Error",
        description: "Failed to acknowledge alert.",
        variant: "destructive"
      });
    }
  };

  const getRatingBadge = (rating?: number) => {
    if (!rating) return null;
    const variant = rating >= 4 ? 'default' : rating >= 3 ? 'secondary' : 'destructive';
    return <Badge variant={variant}>{rating}/5</Badge>;
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

  const renderStarRating = (rating?: number) => {
    if (!rating) return null;
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
      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Feedback</p>
                <p className="text-2xl font-bold">{dashboardStats.total_feedback}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {filters.date_range} period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average Rating</p>
                <p className="text-2xl font-bold">{dashboardStats.average_rating.toFixed(1)}/5</p>
              </div>
              <Star className="w-8 h-8 text-yellow-500" />
            </div>
            <div className="flex items-center mt-2">
              {getTrendIcon(analytics?.trends.rating_trend || 'stable')}
              <p className="text-xs text-muted-foreground ml-1">
                {analytics?.trends.rating_trend || 'stable'} trend
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Positive Feedback</p>
                <p className="text-2xl font-bold">{dashboardStats.positive_feedback_percentage.toFixed(0)}%</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <Progress value={dashboardStats.positive_feedback_percentage} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Alerts</p>
                <p className="text-2xl font-bold">{dashboardStats.alerts_count}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Require attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Input
              placeholder="Search feedback..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
            
            <Select
              value={filters.feedback_type}
              onValueChange={(value) => setFilters(prev => ({ ...prev, feedback_type: value as any }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Feedback Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="student_feedback">Student Feedback</SelectItem>
                <SelectItem value="teacher_feedback">Teacher Feedback</SelectItem>
                <SelectItem value="course_feedback">Course Feedback</SelectItem>
              </SelectContent>
            </Select>
            
            <Select
              value={filters.rating_filter}
              onValueChange={(value) => setFilters(prev => ({ ...prev, rating_filter: value as any }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="high">High (4-5 stars)</SelectItem>
                <SelectItem value="medium">Medium (3 stars)</SelectItem>
                <SelectItem value="low">Low (1-2 stars)</SelectItem>
              </SelectContent>
            </Select>
            
            <Select
              value={filters.date_range}
              onValueChange={(value) => setFilters(prev => ({ ...prev, date_range: value as any }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="week">Last Week</SelectItem>
                <SelectItem value="month">Last Month</SelectItem>
                <SelectItem value="quarter">Last Quarter</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="feedback" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-fit">
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="alerts">Alerts ({alerts.length})</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        {/* Feedback Tab */}
        <TabsContent value="feedback">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Student Feedback */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Student Feedback
                  <Badge variant="secondary">{studentFeedback.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {studentFeedback.slice(0, 10).map((feedback) => (
                    <div key={feedback.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getRatingBadge(feedback.overall_rating)}
                          <span className="text-sm text-muted-foreground">
                            {feedback.student?.full_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(feedback.created_at!), 'MMM d')}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewFeedback(feedback, 'student_feedback')}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-sm">
                        <p className="font-medium">{feedback.teacher?.full_name}</p>
                        <p className="text-muted-foreground line-clamp-2">
                          {feedback.positive_feedback || feedback.improvement_suggestions}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Teacher Feedback */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Teacher Feedback
                  <Badge variant="secondary">{teacherFeedback.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {teacherFeedback.slice(0, 10).map((feedback) => (
                    <div key={feedback.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getRatingBadge(feedback.progress_rating)}
                          <span className="text-sm text-muted-foreground">
                            {feedback.teacher?.full_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(feedback.created_at!), 'MMM d')}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewFeedback(feedback, 'teacher_feedback')}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-sm">
                        <p className="font-medium">{feedback.student?.full_name}</p>
                        <p className="text-muted-foreground line-clamp-2">
                          {feedback.strengths || feedback.lesson_notes}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Active Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Active Alerts</h3>
                    <p className="text-muted-foreground">All feedback alerts have been addressed.</p>
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <Alert key={alert.id} className={`${
                      alert.severity === 'high' ? 'border-red-200 bg-red-50' :
                      alert.severity === 'medium' ? 'border-orange-200 bg-orange-50' :
                      'border-yellow-200 bg-yellow-50'
                    }`}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{alert.title}</p>
                          <p className="text-sm">{alert.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(alert.created_at!), 'MMM d, yyyy HH:mm')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            alert.severity === 'high' ? 'destructive' :
                            alert.severity === 'medium' ? 'default' : 'secondary'
                          }>
                            {alert.severity}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAcknowledgeAlert(alert.id!)}
                          >
                            Acknowledge
                          </Button>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Rating Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Rating Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics && (
                  <div className="space-y-4">
                    {Object.entries(analytics.rating_distribution).map(([rating, count]) => (
                      <div key={rating} className="flex items-center gap-4">
                        <div className="flex items-center gap-1 w-16">
                          {renderStarRating(parseInt(rating))}
                        </div>
                        <Progress value={(count / analytics.total_feedback_count) * 100} className="flex-1" />
                        <span className="text-sm text-muted-foreground w-12">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sentiment Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Sentiment Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-green-600">Positive</span>
                      <span className="text-sm">{analytics.sentiment_analysis.positive}%</span>
                    </div>
                    <Progress value={analytics.sentiment_analysis.positive} className="bg-green-100" />
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Neutral</span>
                      <span className="text-sm">{analytics.sentiment_analysis.neutral}%</span>
                    </div>
                    <Progress value={analytics.sentiment_analysis.neutral} className="bg-gray-100" />
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-red-600">Negative</span>
                      <span className="text-sm">{analytics.sentiment_analysis.negative}%</span>
                    </div>
                    <Progress value={analytics.sentiment_analysis.negative} className="bg-red-100" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Strengths */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Top Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics && (
                  <div className="space-y-2">
                    {analytics.top_strengths.map((strength, index) => (
                      <div key={strength} className="flex items-center gap-2">
                        <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                          {index + 1}
                        </Badge>
                        <span className="capitalize">{strength}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Common Improvements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Common Improvements
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics && (
                  <div className="space-y-2">
                    {analytics.common_improvements.map((improvement, index) => (
                      <div key={improvement} className="flex items-center gap-2">
                        <Badge variant="secondary" className="w-8 h-8 rounded-full flex items-center justify-center">
                          {index + 1}
                        </Badge>
                        <span className="capitalize">{improvement}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations">
          <Card>
            <CardHeader>
              <CardTitle>Feedback-Based Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Recommendations engine will be displayed here based on feedback analysis.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Feedback Detail Dialog */}
      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Feedback Details</DialogTitle>
          </DialogHeader>
          {selectedFeedback && (
            <div className="space-y-6">
              {/* Feedback Details */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Type:</strong> {selectedFeedback.type?.replace('_', ' ')}
                  </div>
                  <div>
                    <strong>Date:</strong> {format(new Date(selectedFeedback.created_at), 'MMM d, yyyy')}
                  </div>
                  <div>
                    <strong>Rating:</strong> {selectedFeedback.overall_rating || selectedFeedback.progress_rating}/5
                  </div>
                  <div>
                    <strong>Anonymous:</strong> {selectedFeedback.is_anonymous ? 'Yes' : 'No'}
                  </div>
                </div>

                {selectedFeedback.positive_feedback && (
                  <div>
                    <h4 className="font-medium text-green-700 mb-2">Positive Feedback:</h4>
                    <p className="text-sm bg-green-50 p-3 rounded">{selectedFeedback.positive_feedback}</p>
                  </div>
                )}

                {selectedFeedback.improvement_suggestions && (
                  <div>
                    <h4 className="font-medium text-amber-700 mb-2">Improvement Suggestions:</h4>
                    <p className="text-sm bg-amber-50 p-3 rounded">{selectedFeedback.improvement_suggestions}</p>
                  </div>
                )}

                {selectedFeedback.strengths && (
                  <div>
                    <h4 className="font-medium text-green-700 mb-2">Student Strengths:</h4>
                    <p className="text-sm bg-green-50 p-3 rounded">{selectedFeedback.strengths}</p>
                  </div>
                )}

                {selectedFeedback.areas_for_improvement && (
                  <div>
                    <h4 className="font-medium text-amber-700 mb-2">Areas for Improvement:</h4>
                    <p className="text-sm bg-amber-50 p-3 rounded">{selectedFeedback.areas_for_improvement}</p>
                  </div>
                )}
              </div>

              {/* Response Section */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Administrative Response</h4>
                <Textarea
                  placeholder="Provide a response to this feedback..."
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  className="min-h-[100px] mb-3"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowFeedbackDialog(false)}>
                    Close
                  </Button>
                  <Button 
                    onClick={handleRespondToFeedback}
                    disabled={!responseText.trim() || isResponding}
                  >
                    {isResponding ? 'Sending...' : 'Send Response'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FeedbackManagementDashboard;