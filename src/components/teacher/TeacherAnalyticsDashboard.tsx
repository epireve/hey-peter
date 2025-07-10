"use client";

import React, { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  Star,
  BookOpen,
  Award,
  AlertCircle,
  Download,
  RefreshCw,
  BarChart,
  PieChart,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';

interface OverviewMetrics {
  totalStudents: number;
  totalHours: number;
  averageRating: number;
  completionRate: number;
  monthlyGrowth: {
    students: number;
    hours: number;
    rating: number;
  };
}

interface WeeklyHoursData {
  week: string;
  hours: number;
  target: number;
}

interface StudentProgressData {
  level: string;
  count: number;
  avgProgress: number;
}

interface ClassRatingData {
  className: string;
  rating: number;
  students: number;
}

interface StudentInfo {
  id: string;
  name: string;
  progress: number;
  attendance: number;
  issues?: string[];
}

interface TrendData {
  month: string;
  hours?: number;
  rating?: number;
  count?: number;
}

interface AnalyticsData {
  overview: OverviewMetrics;
  performance: {
    weeklyHours: WeeklyHoursData[];
    studentProgress: StudentProgressData[];
    classRatings: ClassRatingData[];
  };
  students: {
    activeStudents: number;
    newStudents: number;
    completedCourses: number;
    upcomingGraduations: number;
    retentionRate: number;
    satisfactionScore: number;
    topPerformers: StudentInfo[];
    strugglingStudents: StudentInfo[];
  };
  trends: {
    hoursTrend: TrendData[];
    ratingTrend: TrendData[];
    studentCountTrend: TrendData[];
  };
}

interface TeacherAnalyticsDashboardProps {
  teacherId: string;
  analyticsData?: AnalyticsData;
  isLoading?: boolean;
  error?: string;
  showGoals?: boolean;
  showComparison?: boolean;
  showFeedback?: boolean;
  onDateRangeChange?: (range: { from: Date; to: Date }) => void;
  onExport?: (options: { format: string; data: any; dateRange: any }) => void;
  onRefresh?: () => void;
}

export function TeacherAnalyticsDashboard({
  teacherId,
  analyticsData,
  isLoading = false,
  error,
  showGoals = false,
  showComparison = false,
  showFeedback = false,
  onDateRangeChange,
  onExport,
  onRefresh,
}: TeacherAnalyticsDashboardProps) {
  const [selectedView, setSelectedView] = useState<'overview' | 'trends'>('overview');
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [classFilter, setClassFilter] = useState<string>('all');

  const handleDateRangeSelect = (range: string) => {
    let from: Date, to: Date;
    const now = new Date();

    switch (range) {
      case 'thisMonth':
        from = startOfMonth(now);
        to = endOfMonth(now);
        break;
      case 'lastMonth':
        from = startOfMonth(subMonths(now, 1));
        to = endOfMonth(subMonths(now, 1));
        break;
      default:
        return;
    }

    setDateRange({ from, to });
    onDateRangeChange?.({ from, to });
  };

  const formatTrend = (value: number) => {
    const prefix = value > 0 ? '+' : '';
    return `${prefix}${value}%`;
  };

  const getTrendIcon = (value: number) => {
    return value > 0 ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : value < 0 ? (
      <TrendingDown className="h-4 w-4 text-red-600" />
    ) : null;
  };

  if (isLoading) {
    return (
      <div data-testid="analytics-loading" className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!analyticsData) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">No analytics data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold">Teaching Analytics</h2>
        <div className="flex gap-2">
          <Select onValueChange={handleDateRangeSelect}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="thisMonth">This Month</SelectItem>
              <SelectItem value="lastMonth">Last Month</SelectItem>
            </SelectContent>
          </Select>
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              <SelectItem value="business">Business English</SelectItem>
              <SelectItem value="basics">English Basics</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
            <span className="sr-only">Refresh</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => onExport?.({
              format: 'pdf',
              data: analyticsData,
              dateRange,
            })}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Upcoming Graduations Alert */}
      {analyticsData.students.upcomingGraduations > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Upcoming Graduations</AlertTitle>
          <AlertDescription>
            {analyticsData.students.upcomingGraduations} students graduating soon
          </AlertDescription>
        </Alert>
      )}

      {/* Overview Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.overview.totalStudents}</div>
            <div className="flex items-center text-xs">
              {getTrendIcon(analyticsData.overview.monthlyGrowth.students)}
              <span className={analyticsData.overview.monthlyGrowth.students > 0 ? 'text-green-600' : 'text-red-600'}>
                {formatTrend(analyticsData.overview.monthlyGrowth.students)}
              </span>
              <span className="text-muted-foreground ml-1">from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Teaching Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.overview.totalHours}</div>
            <div className="flex items-center text-xs">
              {getTrendIcon(analyticsData.overview.monthlyGrowth.hours)}
              <span className={analyticsData.overview.monthlyGrowth.hours > 0 ? 'text-green-600' : 'text-red-600'}>
                {formatTrend(analyticsData.overview.monthlyGrowth.hours)}
              </span>
              <span className="text-muted-foreground ml-1">from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.overview.averageRating}</div>
            <div className="flex items-center text-xs">
              {getTrendIcon(analyticsData.overview.monthlyGrowth.rating)}
              <span className={analyticsData.overview.monthlyGrowth.rating > 0 ? 'text-green-600' : 'text-red-600'}>
                {formatTrend(analyticsData.overview.monthlyGrowth.rating)}
              </span>
              <span className="text-muted-foreground ml-1">from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.overview.completionRate}%</div>
            <p className="text-xs text-muted-foreground">of students completing courses</p>
          </CardContent>
        </Card>
      </div>

      {/* View Toggle */}
      <Tabs value={selectedView} onValueChange={(v) => setSelectedView(v as 'overview' | 'trends')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Performance Charts */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Hours Performance</CardTitle>
                <CardDescription>Your teaching hours vs target</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData.performance.weeklyHours.map((week) => (
                    <div key={week.week} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{week.week}</span>
                        <span className="font-medium">{week.hours} / {week.target} hours</span>
                      </div>
                      <Progress value={(week.hours / week.target) * 100} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Student Progress by Level</CardTitle>
                <CardDescription>Average progress per level</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData.performance.studentProgress.map((level) => (
                    <div key={level.level} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{level.level} ({level.count} students)</span>
                        <span className="font-medium">{level.avgProgress}%</span>
                      </div>
                      <Progress value={level.avgProgress} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Class Ratings */}
          <Card>
            <CardHeader>
              <CardTitle>Class Ratings</CardTitle>
              <CardDescription>Rating per class type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analyticsData.performance.classRatings.map((classData) => (
                  <div key={classData.className} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{classData.className}</p>
                      <p className="text-sm text-muted-foreground">{classData.students} students</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="font-semibold">{classData.rating}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Student Insights */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Student Insights</CardTitle>
                <CardDescription>Key student metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Active Students</span>
                    <span className="font-semibold">{analyticsData.students.activeStudents}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>New Students</span>
                    <span className="font-semibold">{analyticsData.students.newStudents}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Completed Courses</span>
                    <span className="font-semibold">{analyticsData.students.completedCourses}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Retention Rate</span>
                    <span className="font-semibold">{analyticsData.students.retentionRate}%</span>
                  </div>
                  {showFeedback && (
                    <>
                      <div className="pt-3 border-t">
                        <p className="text-sm font-medium mb-2">Recent Student Feedback</p>
                        <div className="flex justify-between">
                          <span>Satisfaction Score</span>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500" />
                            <span className="font-semibold">{analyticsData.students.satisfactionScore}</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Performers</CardTitle>
                <CardDescription>Students excelling in their courses</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-3">
                    {analyticsData.students.topPerformers.map((student) => (
                      <div key={student.id} className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{student.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {student.progress}% progress • {student.attendance}% attendance
                          </p>
                        </div>
                        <Badge>Excellent</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Students Needing Attention */}
          <Card>
            <CardHeader>
              <CardTitle>Students Needing Attention</CardTitle>
              <CardDescription>Students who may need extra support</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analyticsData.students.strugglingStudents.map((student) => (
                  <div key={student.id} className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{student.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {student.progress}% progress • {student.attendance}% attendance
                      </p>
                      <div className="flex gap-2 mt-1">
                        {student.issues?.map((issue, idx) => (
                          <Badge key={idx} variant="secondary">{issue}</Badge>
                        ))}
                      </div>
                    </div>
                    <Button size="sm" variant="outline">Contact</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historical Trends</CardTitle>
              <CardDescription>Your performance over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium mb-3">Teaching Hours Trend</h4>
                  <div className="h-48 flex items-center justify-center border-2 border-dashed">
                    <p className="text-muted-foreground">Hours trend chart visualization</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-3">Rating Trend</h4>
                  <div className="h-48 flex items-center justify-center border-2 border-dashed">
                    <p className="text-muted-foreground">Rating trend chart visualization</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-3">Student Count Trend</h4>
                  <div className="h-48 flex items-center justify-center border-2 border-dashed">
                    <p className="text-muted-foreground">Student count trend chart visualization</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Goals & Achievements */}
      {showGoals && (
        <Card>
          <CardHeader>
            <CardTitle>Goals & Achievements</CardTitle>
            <CardDescription>Track your teaching milestones</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span>Monthly Teaching Hours Goal</span>
                <div className="flex items-center gap-2">
                  <Progress value={90} className="w-24" />
                  <span className="text-sm font-medium">90%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>Student Satisfaction Target</span>
                <div className="flex items-center gap-2">
                  <Progress value={100} className="w-24" />
                  <span className="text-sm font-medium">Achieved</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Comparison */}
      {showComparison && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Comparison</CardTitle>
            <CardDescription>Your performance vs. last month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Teaching Hours</span>
                <span className="font-semibold text-green-600">+22.3%</span>
              </div>
              <div className="flex justify-between">
                <span>Student Count</span>
                <span className="font-semibold text-green-600">+15.5%</span>
              </div>
              <div className="flex justify-between">
                <span>Average Rating</span>
                <span className="font-semibold text-green-600">+2.1%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}