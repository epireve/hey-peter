'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Users, Clock, Star, Award, Target, Calendar } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';

interface TeacherAnalyticsProps {
  teacher: any;
  analyticsData: any[];
  studentRetention: any[];
  performanceMetrics: any[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export function TeacherAnalytics({ 
  teacher, 
  analyticsData, 
  studentRetention, 
  performanceMetrics 
}: TeacherAnalyticsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('6months');

  // Process analytics data
  const analytics = useMemo(() => {
    const now = new Date();
    let startDate = new Date();
    
    switch (selectedPeriod) {
      case '3months':
        startDate = subMonths(now, 3);
        break;
      case '6months':
        startDate = subMonths(now, 6);
        break;
      case '12months':
        startDate = subMonths(now, 12);
        break;
    }

    const filteredData = analyticsData.filter(item => 
      parseISO(item.start_time) >= startDate
    );

    // Calculate key metrics
    const totalClasses = filteredData.length;
    const completedClasses = filteredData.filter(item => 
      item.attendance?.[0]?.status === 'present'
    ).length;
    const cancelledClasses = filteredData.filter(item => 
      item.status === 'cancelled'
    ).length;
    const noShowClasses = filteredData.filter(item => 
      item.attendance?.[0]?.status === 'absent'
    ).length;

    const attendanceRate = totalClasses > 0 ? (completedClasses / totalClasses) * 100 : 0;
    const cancellationRate = totalClasses > 0 ? (cancelledClasses / totalClasses) * 100 : 0;

    // Calculate average rating
    const ratingsData = filteredData.filter(item => item.feedback?.[0]?.rating);
    const averageRating = ratingsData.length > 0 
      ? ratingsData.reduce((sum, item) => sum + item.feedback[0].rating, 0) / ratingsData.length
      : 0;

    // Monthly breakdown
    const months = eachMonthOfInterval({ start: startDate, end: now });
    const monthlyData = months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthClasses = filteredData.filter(item => {
        const itemDate = parseISO(item.start_time);
        return itemDate >= monthStart && itemDate <= monthEnd;
      });

      const monthCompleted = monthClasses.filter(item => 
        item.attendance?.[0]?.status === 'present'
      ).length;

      const monthHours = monthClasses.reduce((sum, item) => 
        sum + ((item.class?.course?.duration_minutes || 60) / 60), 0
      );

      const monthRatings = monthClasses.filter(item => item.feedback?.[0]?.rating);
      const monthAvgRating = monthRatings.length > 0
        ? monthRatings.reduce((sum, item) => sum + item.feedback[0].rating, 0) / monthRatings.length
        : 0;

      return {
        month: format(month, 'MMM yyyy'),
        totalClasses: monthClasses.length,
        completedClasses: monthCompleted,
        attendanceRate: monthClasses.length > 0 ? (monthCompleted / monthClasses.length) * 100 : 0,
        hoursTeaching: monthHours,
        averageRating: monthAvgRating
      };
    });

    // Course type breakdown
    const courseTypeData = filteredData.reduce((acc, item) => {
      const courseType = item.class?.course?.course_type || 'other';
      if (!acc[courseType]) {
        acc[courseType] = { count: 0, completed: 0, hours: 0 };
      }
      acc[courseType].count++;
      if (item.attendance?.[0]?.status === 'present') {
        acc[courseType].completed++;
      }
      acc[courseType].hours += (item.class?.course?.duration_minutes || 60) / 60;
      return acc;
    }, {});

    const courseTypePieData = Object.entries(courseTypeData).map(([type, data]: [string, any]) => ({
      name: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: data.count,
      percentage: totalClasses > 0 ? (data.count / totalClasses) * 100 : 0
    }));

    // Student feedback analysis
    const feedbackData = filteredData.filter(item => item.feedback?.[0]);
    const ratingDistribution = [1, 2, 3, 4, 5].map(rating => ({
      rating,
      count: feedbackData.filter(item => item.feedback[0].rating === rating).length
    }));

    // Time of day analysis
    const timeSlotData = filteredData.reduce((acc, item) => {
      const hour = parseISO(item.start_time).getHours();
      let timeSlot = '';
      
      if (hour >= 6 && hour < 9) timeSlot = 'Morning (6-9 AM)';
      else if (hour >= 9 && hour < 12) timeSlot = 'Late Morning (9-12 PM)';
      else if (hour >= 12 && hour < 15) timeSlot = 'Afternoon (12-3 PM)';
      else if (hour >= 15 && hour < 18) timeSlot = 'Late Afternoon (3-6 PM)';
      else if (hour >= 18 && hour < 21) timeSlot = 'Evening (6-9 PM)';
      else timeSlot = 'Night (9 PM-6 AM)';

      if (!acc[timeSlot]) {
        acc[timeSlot] = { count: 0, completed: 0 };
      }
      acc[timeSlot].count++;
      if (item.attendance?.[0]?.status === 'present') {
        acc[timeSlot].completed++;
      }
      return acc;
    }, {});

    const timeSlotChartData = Object.entries(timeSlotData).map(([slot, data]: [string, any]) => ({
      timeSlot: slot,
      totalClasses: data.count,
      completedClasses: data.completed,
      attendanceRate: data.count > 0 ? (data.completed / data.count) * 100 : 0
    }));

    return {
      totalClasses,
      completedClasses,
      cancelledClasses,
      noShowClasses,
      attendanceRate,
      cancellationRate,
      averageRating,
      totalRatings: ratingsData.length,
      monthlyData,
      courseTypePieData,
      ratingDistribution,
      timeSlotChartData,
      totalHours: filteredData.reduce((sum, item) => 
        sum + ((item.class?.course?.duration_minutes || 60) / 60), 0
      )
    };
  }, [analyticsData, selectedPeriod]);

  // Student retention analysis
  const retentionAnalysis = useMemo(() => {
    const activeStudents = studentRetention.filter(enrollment => 
      enrollment.status === 'active'
    ).length;

    const completedStudents = studentRetention.filter(enrollment => 
      enrollment.status === 'completed'
    ).length;

    const droppedStudents = studentRetention.filter(enrollment => 
      enrollment.status === 'dropped'
    ).length;

    const retentionRate = studentRetention.length > 0 
      ? ((activeStudents + completedStudents) / studentRetention.length) * 100 
      : 0;

    return {
      activeStudents,
      completedStudents,
      droppedStudents,
      totalStudents: studentRetention.length,
      retentionRate
    };
  }, [studentRetention]);

  const MetricCard = ({ title, value, subtitle, icon: Icon, trend, trendValue }: any) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
        {trend && (
          <div className={`flex items-center text-xs ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {trend === 'up' ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
            {trendValue}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Period Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Analytics Overview</CardTitle>
              <CardDescription>Your teaching performance insights</CardDescription>
            </div>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3months">Last 3 Months</SelectItem>
                <SelectItem value="6months">Last 6 Months</SelectItem>
                <SelectItem value="12months">Last 12 Months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Classes"
          value={analytics.totalClasses}
          subtitle={`${analytics.totalHours.toFixed(1)} hours taught`}
          icon={Calendar}
        />
        <MetricCard
          title="Attendance Rate"
          value={`${analytics.attendanceRate.toFixed(1)}%`}
          subtitle={`${analytics.completedClasses} completed`}
          icon={Users}
          trend={analytics.attendanceRate >= 80 ? 'up' : 'down'}
          trendValue={`${analytics.attendanceRate >= 80 ? 'Great' : 'Needs improvement'}`}
        />
        <MetricCard
          title="Average Rating"
          value={analytics.averageRating.toFixed(1)}
          subtitle={`Based on ${analytics.totalRatings} reviews`}
          icon={Star}
          trend={analytics.averageRating >= 4 ? 'up' : 'down'}
          trendValue={`${analytics.averageRating >= 4 ? 'Excellent' : 'Good'}`}
        />
        <MetricCard
          title="Student Retention"
          value={`${retentionAnalysis.retentionRate.toFixed(1)}%`}
          subtitle={`${retentionAnalysis.activeStudents} active students`}
          icon={Target}
          trend={retentionAnalysis.retentionRate >= 80 ? 'up' : 'down'}
          trendValue={`${retentionAnalysis.retentionRate >= 80 ? 'High retention' : 'Focus needed'}`}
        />
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="courses">Course Analysis</TabsTrigger>
          <TabsTrigger value="feedback">Student Feedback</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Teaching Hours</CardTitle>
                <CardDescription>Hours taught per month</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="hoursTeaching" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Attendance Rate Trend</CardTitle>
                <CardDescription>Monthly attendance rate percentage</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value) => [`${value}%`, 'Attendance Rate']} />
                    <Line type="monotone" dataKey="attendanceRate" stroke="#00C49F" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Classes by Time Slot</CardTitle>
              <CardDescription>Attendance rates across different time periods</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.timeSlotChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timeSlot" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="totalClasses" fill="#8884d8" name="Total Classes" />
                  <Bar dataKey="completedClasses" fill="#00C49F" name="Completed Classes" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="courses" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Course Type Distribution</CardTitle>
                <CardDescription>Classes by course type</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.courseTypePieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name} (${percentage.toFixed(1)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analytics.courseTypePieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Course Performance</CardTitle>
                <CardDescription>Success rates by course type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.courseTypePieData.map((course, index) => (
                    <div key={course.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{course.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {course.value} classes
                        </span>
                      </div>
                      <Progress value={course.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="feedback" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Rating Distribution</CardTitle>
                <CardDescription>Student feedback ratings breakdown</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.ratingDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="rating" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#FFD700" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rating Summary</CardTitle>
                <CardDescription>Overall feedback statistics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Average Rating</span>
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-lg font-bold">{analytics.averageRating.toFixed(1)}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Reviews</span>
                  <span className="text-lg font-bold">{analytics.totalRatings}</span>
                </div>

                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map(rating => {
                    const count = analytics.ratingDistribution.find(r => r.rating === rating)?.count || 0;
                    const percentage = analytics.totalRatings > 0 ? (count / analytics.totalRatings) * 100 : 0;
                    
                    return (
                      <div key={rating} className="flex items-center gap-2">
                        <span className="text-xs w-8">{rating}★</span>
                        <Progress value={percentage} className="flex-1 h-2" />
                        <span className="text-xs w-8 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Class Completion</CardTitle>
                <CardDescription>Overall completion statistics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Completed</span>
                    <span className="text-sm font-medium">{analytics.completedClasses}</span>
                  </div>
                  <Progress value={(analytics.completedClasses / analytics.totalClasses) * 100} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Cancelled</span>
                    <span className="text-sm font-medium">{analytics.cancelledClasses}</span>
                  </div>
                  <Progress value={(analytics.cancelledClasses / analytics.totalClasses) * 100} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">No Show</span>
                    <span className="text-sm font-medium">{analytics.noShowClasses}</span>
                  </div>
                  <Progress value={(analytics.noShowClasses / analytics.totalClasses) * 100} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Student Retention</CardTitle>
                <CardDescription>Student enrollment status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Active</span>
                    <span className="text-sm font-medium">{retentionAnalysis.activeStudents}</span>
                  </div>
                  <Progress value={(retentionAnalysis.activeStudents / retentionAnalysis.totalStudents) * 100} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Completed</span>
                    <span className="text-sm font-medium">{retentionAnalysis.completedStudents}</span>
                  </div>
                  <Progress value={(retentionAnalysis.completedStudents / retentionAnalysis.totalStudents) * 100} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Dropped</span>
                    <span className="text-sm font-medium">{retentionAnalysis.droppedStudents}</span>
                  </div>
                  <Progress value={(retentionAnalysis.droppedStudents / retentionAnalysis.totalStudents) * 100} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Score</CardTitle>
                <CardDescription>Based on key metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {Math.round((analytics.attendanceRate + analytics.averageRating * 20 + retentionAnalysis.retentionRate) / 3)}
                  </div>
                  <div className="text-sm text-muted-foreground">Overall Score</div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    <span className="text-sm">Teaching Excellence</span>
                    <Badge variant={analytics.averageRating >= 4.5 ? 'default' : 'secondary'}>
                      {analytics.averageRating >= 4.5 ? 'Excellent' : 'Good'}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">Student Engagement</span>
                    <Badge variant={analytics.attendanceRate >= 85 ? 'default' : 'secondary'}>
                      {analytics.attendanceRate >= 85 ? 'High' : 'Moderate'}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    <span className="text-sm">Retention Rate</span>
                    <Badge variant={retentionAnalysis.retentionRate >= 80 ? 'default' : 'secondary'}>
                      {retentionAnalysis.retentionRate >= 80 ? 'Strong' : 'Needs Focus'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}