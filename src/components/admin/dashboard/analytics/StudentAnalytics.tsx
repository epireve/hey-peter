"use client";

import { logger } from '@/lib/services';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  BookOpen,
  Clock,
  Target,
  Star,
  ChevronRight
} from "lucide-react";
import { AnalyticsChart } from "../AnalyticsChart";
import { studentProgressAnalytics } from "@/lib/services/student-progress-analytics";

interface StudentAnalyticsProps {
  className?: string;
}

interface StudentMetrics {
  totalStudents: number;
  averageProgress: number;
  averageAttendance: number;
  averageEngagement: number;
  completionRate: number;
  riskStudents: number;
  progressDistribution: Array<{ range: string; count: number; percentage: number }>;
  performanceData: Array<{ month: string; progress: number; attendance: number; engagement: number }>;
  coursePopularity: Array<{ course: string; students: number; satisfaction: number }>;
  learningPace: Array<{ pace: string; students: number; percentage: number }>;
  atRiskReasons: Array<{ reason: string; count: number; severity: 'low' | 'medium' | 'high' }>;
}

export function StudentAnalytics({ className }: StudentAnalyticsProps) {
  const [metrics, setMetrics] = useState<StudentMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('30_days');

  useEffect(() => {
    loadStudentMetrics();
  }, [timeframe]);

  const loadStudentMetrics = async () => {
    try {
      setLoading(true);
      
      // In a real implementation, this would fetch from the analytics service
      // For now, we'll use mock data that represents the service structure
      const mockMetrics: StudentMetrics = {
        totalStudents: 156,
        averageProgress: 73.5,
        averageAttendance: 87.2,
        averageEngagement: 8.1,
        completionRate: 92.5,
        riskStudents: 12,
        progressDistribution: [
          { range: '0-25%', count: 8, percentage: 5.1 },
          { range: '26-50%', count: 18, percentage: 11.5 },
          { range: '51-75%', count: 67, percentage: 42.9 },
          { range: '76-100%', count: 63, percentage: 40.4 }
        ],
        performanceData: [
          { month: 'Jan', progress: 68, attendance: 85, engagement: 7.8 },
          { month: 'Feb', progress: 71, attendance: 88, engagement: 8.0 },
          { month: 'Mar', progress: 73, attendance: 86, engagement: 8.2 },
          { month: 'Apr', progress: 75, attendance: 89, engagement: 8.1 },
          { month: 'May', progress: 78, attendance: 91, engagement: 8.3 },
          { month: 'Jun', progress: 74, attendance: 87, engagement: 8.1 }
        ],
        coursePopularity: [
          { course: 'Basic English', students: 45, satisfaction: 4.2 },
          { course: 'Everyday A', students: 38, satisfaction: 4.5 },
          { course: 'Speak Up', students: 32, satisfaction: 4.3 },
          { course: 'Business English', students: 28, satisfaction: 4.1 },
          { course: '1-on-1', students: 13, satisfaction: 4.7 }
        ],
        learningPace: [
          { pace: 'Fast (4+ lessons/week)', students: 28, percentage: 17.9 },
          { pace: 'Normal (2-3 lessons/week)', students: 89, percentage: 57.1 },
          { pace: 'Slow (1-2 lessons/week)', students: 32, percentage: 20.5 },
          { pace: 'Very Slow (<1 lesson/week)', students: 7, percentage: 4.5 }
        ],
        atRiskReasons: [
          { reason: 'Low Attendance (<70%)', count: 7, severity: 'high' },
          { reason: 'Poor Performance (<60%)', count: 4, severity: 'high' },
          { reason: 'Low Engagement (<5/10)', count: 3, severity: 'medium' },
          { reason: 'Missed Assignments', count: 5, severity: 'medium' },
          { reason: 'No Recent Activity', count: 2, severity: 'low' }
        ]
      };

      setMetrics(mockMetrics);
    } catch (error) {
      logger.error('Failed to load student metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Student Analytics</h2>
          <p className="text-muted-foreground">
            Comprehensive analysis of student learning progress and engagement
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant={timeframe === '7_days' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeframe('7_days')}
          >
            7 Days
          </Button>
          <Button
            variant={timeframe === '30_days' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeframe('30_days')}
          >
            30 Days
          </Button>
          <Button
            variant={timeframe === '90_days' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeframe('90_days')}
          >
            90 Days
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              +8.3% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Progress</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.averageProgress}%</div>
            <Progress value={metrics.averageProgress} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.averageAttendance}%</div>
            <p className="text-xs text-green-600">
              <TrendingUp className="w-3 h-3 inline mr-1" />
              +2.1% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Students at Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{metrics.riskStudents}</div>
            <p className="text-xs text-muted-foreground">
              {((metrics.riskStudents / metrics.totalStudents) * 100).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="progress" className="space-y-4">
        <TabsList>
          <TabsTrigger value="progress">Progress Analysis</TabsTrigger>
          <TabsTrigger value="performance">Performance Trends</TabsTrigger>
          <TabsTrigger value="courses">Course Analytics</TabsTrigger>
          <TabsTrigger value="risk">Risk Assessment</TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Progress Distribution</CardTitle>
                <CardDescription>
                  How students are distributed across progress levels
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AnalyticsChart
                  title=""
                  data={metrics.progressDistribution}
                  type="pie"
                  dataKey="count"
                  height={250}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Learning Pace Analysis</CardTitle>
                <CardDescription>
                  Student distribution by learning speed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {metrics.learningPace.map((pace, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium">{pace.pace}</div>
                      <div className="text-xs text-muted-foreground">
                        {pace.students} students ({pace.percentage}%)
                      </div>
                    </div>
                    <Progress value={pace.percentage} className="w-20" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Progress Details by Range</CardTitle>
              <CardDescription>
                Detailed breakdown of student progress distribution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                {metrics.progressDistribution.map((range, index) => (
                  <div key={index} className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{range.count}</div>
                    <div className="text-sm text-muted-foreground">{range.range}</div>
                    <div className="text-xs text-muted-foreground">
                      {range.percentage}% of students
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends Over Time</CardTitle>
              <CardDescription>
                Progress, attendance, and engagement trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AnalyticsChart
                title=""
                data={metrics.performanceData}
                type="line"
                dataKey={["progress", "attendance", "engagement"]}
                xAxisKey="month"
                height={350}
                colors={["#3b82f6", "#10b981", "#f59e0b"]}
              />
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Engagement Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{metrics.averageEngagement}/10</div>
                <Progress value={metrics.averageEngagement * 10} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  Based on participation, interaction, and satisfaction
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Completion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{metrics.completionRate}%</div>
                <Progress value={metrics.completionRate} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  Percentage of enrolled students who complete courses
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Retention Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">94.2%</div>
                <Progress value={94.2} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  Students continuing their studies
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="courses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Course Popularity & Satisfaction</CardTitle>
              <CardDescription>
                Student enrollment and satisfaction by course type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.coursePopularity.map((course, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <BookOpen className="h-8 w-8 text-primary" />
                      <div>
                        <div className="font-medium">{course.course}</div>
                        <div className="text-sm text-muted-foreground">
                          {course.students} students enrolled
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-500 mr-1" />
                          <span className="font-medium">{course.satisfaction}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">satisfaction</div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Course Enrollment Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <AnalyticsChart
                title=""
                data={metrics.coursePopularity}
                type="bar"
                dataKey="students"
                xAxisKey="course"
                height={300}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Students at Risk Analysis</CardTitle>
              <CardDescription>
                Identification and categorization of at-risk students
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.atRiskReasons.map((risk, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Badge variant={getSeverityColor(risk.severity) as any}>
                          {risk.severity}
                        </Badge>
                        <span className="font-medium">{risk.reason}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{risk.count}</div>
                      <div className="text-xs text-muted-foreground">students</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Risk Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <AnalyticsChart
                  title=""
                  data={metrics.atRiskReasons}
                  type="pie"
                  dataKey="count"
                  height={250}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Intervention Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="font-medium text-red-800">High Priority (7 students)</div>
                  <div className="text-sm text-red-600">Immediate intervention required</div>
                </div>
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="font-medium text-yellow-800">Medium Priority (8 students)</div>
                  <div className="text-sm text-yellow-600">Additional support needed</div>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="font-medium text-blue-800">Low Priority (2 students)</div>
                  <div className="text-sm text-blue-600">Monitor closely</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}