"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  TrendingUp,
  AlertTriangle,
  Clock,
  Target,
  GraduationCap,
  Activity,
  Brain,
  Award,
  Calendar
} from "lucide-react";

interface EnhancedStudentAnalyticsProps {
  className?: string;
}

export function EnhancedStudentAnalytics({ className }: EnhancedStudentAnalyticsProps) {
  // Static data to avoid complex calculations and API calls
  const metrics = {
    totalStudents: 156,
    activeStudents: 142,
    newEnrollments: 23,
    averageProgress: 78.5,
    attendanceRate: 85.2,
    completionRate: 72.8,
    studentsAtRisk: 8,
    noShowRate: 14.8,
    topPerformers: [
      { name: "Alice Chen", progress: 95.2, attendance: 98, testScore: 92 },
      { name: "Bob Wilson", progress: 93.8, attendance: 95, testScore: 89 },
      { name: "Carol Zhang", progress: 91.4, attendance: 97, testScore: 87 },
      { name: "David Kim", progress: 90.1, attendance: 92, testScore: 88 },
      { name: "Eva Rodriguez", progress: 88.7, attendance: 94, testScore: 86 }
    ]
  };

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 space-y-4 md:space-y-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Student Analytics</h2>
          <p className="text-muted-foreground">
            Comprehensive analysis of student learning progress and engagement
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline">Last 30 days</Badge>
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

      {/* Simplified Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="retention">Retention</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Course Distribution</CardTitle>
                <CardDescription>
                  Students enrolled in different programs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: 'Basic English', count: 45, color: 'bg-blue-500' },
                    { name: 'Everyday A/B', count: 38, color: 'bg-green-500' },
                    { name: 'Speak Up', count: 32, color: 'bg-purple-500' },
                    { name: 'Business English', count: 28, color: 'bg-orange-500' },
                    { name: '1-on-1', count: 13, color: 'bg-pink-500' }
                  ].map((course, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded ${course.color}`} />
                        <span className="text-sm">{course.name}</span>
                      </div>
                      <Badge variant="secondary">{course.count} students</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Trends</CardTitle>
                <CardDescription>
                  Key metrics over the last 6 months
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { month: 'Jan', enrollments: 18, completion: 75 },
                    { month: 'Feb', enrollments: 22, completion: 78 },
                    { month: 'Mar', enrollments: 25, completion: 72 },
                    { month: 'Apr', enrollments: 20, completion: 80 },
                    { month: 'May', enrollments: 28, completion: 76 },
                    { month: 'Jun', enrollments: 23, completion: 82 }
                  ].map((data, index) => (
                    <div key={index} className="flex items-center justify-between py-2">
                      <span className="text-sm font-medium">{data.month}</span>
                      <div className="flex items-center space-x-4">
                        <div className="text-sm text-muted-foreground">
                          {data.enrollments} new
                        </div>
                        <div className="text-sm text-green-600">
                          {data.completion}% completion
                        </div>
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
                <CardTitle>Top Performing Students</CardTitle>
                <CardDescription>
                  Students with exceptional progress and engagement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics.topPerformers.map((student, index) => (
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

            <Card>
              <CardHeader>
                <CardTitle>Test Score Summary</CardTitle>
                <CardDescription>
                  Student performance across assessments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { range: '90-100', count: 23, percentage: 14.7 },
                    { range: '80-89', count: 45, percentage: 28.8 },
                    { range: '70-79', count: 52, percentage: 33.3 },
                    { range: '60-69', count: 28, percentage: 17.9 },
                    { range: 'Below 60', count: 8, percentage: 5.1 }
                  ].map((score, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{score.range}</span>
                          <span className="text-sm text-muted-foreground">{score.count} students</span>
                        </div>
                        <Progress value={score.percentage} className="h-2" />
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
                <CardTitle>Weekly Attendance</CardTitle>
                <CardDescription>
                  Average attendance rates by day of week
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { day: 'Monday', rate: 92, status: 'excellent' },
                    { day: 'Tuesday', rate: 88, status: 'good' },
                    { day: 'Wednesday', rate: 90, status: 'excellent' },
                    { day: 'Thursday', rate: 87, status: 'good' },
                    { day: 'Friday', rate: 85, status: 'good' },
                    { day: 'Saturday', rate: 82, status: 'fair' },
                    { day: 'Sunday', rate: 80, status: 'fair' }
                  ].map((day, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{day.day}</span>
                          <span className="text-sm text-muted-foreground">{day.rate}%</span>
                        </div>
                        <Progress value={day.rate} className="h-2" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Absence Reasons</CardTitle>
                <CardDescription>
                  Common reasons for student absences
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
                          <span className="text-sm text-muted-foreground">{item.count} cases</span>
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

        <TabsContent value="retention" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Retention Milestones</CardTitle>
                <CardDescription>
                  Student retention at different time periods
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { milestone: '1 month', rate: 95, color: 'bg-green-500' },
                    { milestone: '3 months', rate: 88, color: 'bg-blue-500' },
                    { milestone: '6 months', rate: 82, color: 'bg-yellow-500' },
                    { milestone: '12 months', rate: 75, color: 'bg-orange-500' }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded ${item.color}`} />
                        <span className="text-sm font-medium">{item.milestone}</span>
                      </div>
                      <Badge variant="secondary">{item.rate}%</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Retention Strategies</CardTitle>
                <CardDescription>
                  Implemented strategies to improve retention
                </CardDescription>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}