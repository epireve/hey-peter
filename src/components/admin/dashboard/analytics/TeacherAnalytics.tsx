"use client";

import { logger } from '@/lib/services';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
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
  BookOpen
} from "lucide-react";
import { AnalyticsChart } from "../AnalyticsChart";
import { teacherPerformanceAnalytics } from "@/lib/services/teacher-performance-analytics";

interface TeacherAnalyticsProps {
  className?: string;
}

interface TeacherMetrics {
  totalTeachers: number;
  averageRating: number;
  averageUtilization: number;
  totalClassesThisMonth: number;
  performanceDistribution: Array<{ range: string; count: number; percentage: number }>;
  teacherRankings: Array<{
    id: string;
    name: string;
    rating: number;
    classes: number;
    satisfaction: number;
    specialization: string;
  }>;
  performanceTrends: Array<{
    month: string;
    satisfaction: number;
    utilization: number;
    performance: number;
  }>;
  specializationData: Array<{
    specialization: string;
    teachers: number;
    avgRating: number;
    demand: number;
  }>;
  availabilityMetrics: {
    peakHourCoverage: number;
    flexibilityScore: number;
    cancellationRate: number;
    responseTime: number;
  };
  supportNeeded: Array<{
    teacherId: string;
    name: string;
    issues: string[];
    severity: 'low' | 'medium' | 'high';
    recommendations: string[];
  }>;
}

export function TeacherAnalytics({ className }: TeacherAnalyticsProps) {
  const [metrics, setMetrics] = useState<TeacherMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('30_days');

  useEffect(() => {
    loadTeacherMetrics();
  }, [timeframe]);

  const loadTeacherMetrics = async () => {
    try {
      setLoading(true);
      
      // Mock data representing teacher analytics
      const mockMetrics: TeacherMetrics = {
        totalTeachers: 24,
        averageRating: 4.3,
        averageUtilization: 78.5,
        totalClassesThisMonth: 342,
        performanceDistribution: [
          { range: '90-100', count: 6, percentage: 25.0 },
          { range: '80-89', count: 12, percentage: 50.0 },
          { range: '70-79', count: 4, percentage: 16.7 },
          { range: '60-69', count: 2, percentage: 8.3 }
        ],
        teacherRankings: [
          {
            id: '1',
            name: 'Sarah Johnson',
            rating: 4.8,
            classes: 28,
            satisfaction: 4.9,
            specialization: 'Business English'
          },
          {
            id: '2',
            name: 'Michael Chen',
            rating: 4.7,
            classes: 32,
            satisfaction: 4.6,
            specialization: 'Conversation'
          },
          {
            id: '3',
            name: 'Emma Wilson',
            rating: 4.6,
            classes: 25,
            satisfaction: 4.7,
            specialization: 'Grammar'
          },
          {
            id: '4',
            name: 'David Rodriguez',
            rating: 4.5,
            classes: 30,
            satisfaction: 4.5,
            specialization: 'Pronunciation'
          },
          {
            id: '5',
            name: 'Lisa Park',
            rating: 4.4,
            classes: 22,
            satisfaction: 4.4,
            specialization: 'IELTS Prep'
          }
        ],
        performanceTrends: [
          { month: 'Jan', satisfaction: 4.1, utilization: 75, performance: 82 },
          { month: 'Feb', satisfaction: 4.2, utilization: 77, performance: 84 },
          { month: 'Mar', satisfaction: 4.3, utilization: 79, performance: 85 },
          { month: 'Apr', satisfaction: 4.2, utilization: 78, performance: 83 },
          { month: 'May', satisfaction: 4.4, utilization: 80, performance: 87 },
          { month: 'Jun', satisfaction: 4.3, utilization: 79, performance: 86 }
        ],
        specializationData: [
          { specialization: 'Business English', teachers: 6, avgRating: 4.5, demand: 85 },
          { specialization: 'Conversation', teachers: 8, avgRating: 4.3, demand: 92 },
          { specialization: 'Grammar', teachers: 5, avgRating: 4.2, demand: 78 },
          { specialization: 'Pronunciation', teachers: 3, avgRating: 4.4, demand: 65 },
          { specialization: 'IELTS Prep', teachers: 2, avgRating: 4.6, demand: 88 }
        ],
        availabilityMetrics: {
          peakHourCoverage: 85.5,
          flexibilityScore: 72.3,
          cancellationRate: 3.2,
          responseTime: 2.1
        },
        supportNeeded: [
          {
            teacherId: '6',
            name: 'John Smith',
            issues: ['Low student satisfaction', 'High cancellation rate'],
            severity: 'high',
            recommendations: ['Pedagogical training', 'Time management support']
          },
          {
            teacherId: '7',
            name: 'Maria Garcia',
            issues: ['Low engagement scores'],
            severity: 'medium',
            recommendations: ['Interactive teaching techniques workshop']
          },
          {
            teacherId: '8',
            name: 'James Wilson',
            issues: ['Punctuality issues'],
            severity: 'low',
            recommendations: ['Schedule optimization']
          }
        ]
      };

      setMetrics(mockMetrics);
    } catch (error) {
      logger.error('Failed to load teacher metrics:', error);
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
        <p>Failed to load teacher analytics</p>
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
          <h2 className="text-2xl font-bold tracking-tight">Teacher Analytics</h2>
          <p className="text-muted-foreground">
            Performance metrics, utilization analysis, and development insights
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
            <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalTeachers}</div>
            <p className="text-xs text-muted-foreground">
              +2 new hires this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.averageRating}/5</div>
            <div className="flex items-center mt-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-3 w-3 ${
                    i < Math.floor(metrics.averageRating)
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
            <CardTitle className="text-sm font-medium">Utilization Rate</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.averageUtilization}%</div>
            <Progress value={metrics.averageUtilization} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Classes This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalClassesThisMonth}</div>
            <p className="text-xs text-green-600">
              <TrendingUp className="w-3 h-3 inline mr-1" />
              +12% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="rankings">Rankings</TabsTrigger>
          <TabsTrigger value="specializations">Specializations</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="support">Support Needed</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Performance Distribution</CardTitle>
                <CardDescription>
                  Teacher performance score distribution
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AnalyticsChart
                  title=""
                  data={metrics.performanceDistribution}
                  type="bar"
                  dataKey="count"
                  xAxisKey="range"
                  height={250}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
                <CardDescription>
                  Monthly trends in key performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AnalyticsChart
                  title=""
                  data={metrics.performanceTrends}
                  type="line"
                  dataKey={["satisfaction", "utilization", "performance"]}
                  xAxisKey="month"
                  height={250}
                  colors={["#f59e0b", "#10b981", "#3b82f6"]}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">85%</div>
                  <div className="text-sm text-muted-foreground">Student Satisfaction</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">92%</div>
                  <div className="text-sm text-muted-foreground">Lesson Completion</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">88%</div>
                  <div className="text-sm text-muted-foreground">Punctuality Rate</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">76%</div>
                  <div className="text-sm text-muted-foreground">Flexibility Score</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rankings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Teachers</CardTitle>
              <CardDescription>
                Rankings based on overall performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.teacherRankings.map((teacher, index) => (
                  <div key={teacher.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{teacher.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {teacher.specialization} • {teacher.classes} classes
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <div className="text-sm font-medium">{teacher.rating}</div>
                        <div className="text-xs text-muted-foreground">Rating</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium">{teacher.satisfaction}</div>
                        <div className="text-xs text-muted-foreground">Satisfaction</div>
                      </div>
                      {index < 3 && (
                        <Award className="h-5 w-5 text-yellow-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="specializations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Specialization Analysis</CardTitle>
              <CardDescription>
                Teacher distribution and performance by specialization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.specializationData.map((spec, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <BookOpen className="h-8 w-8 text-primary" />
                      <div>
                        <div className="font-medium">{spec.specialization}</div>
                        <div className="text-sm text-muted-foreground">
                          {spec.teachers} teachers
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <div className="text-sm font-medium">{spec.avgRating}</div>
                        <div className="text-xs text-muted-foreground">Avg Rating</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium">{spec.demand}%</div>
                        <div className="text-xs text-muted-foreground">Demand</div>
                      </div>
                      <Progress value={spec.demand} className="w-20" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Demand vs Supply</CardTitle>
            </CardHeader>
            <CardContent>
              <AnalyticsChart
                title=""
                data={metrics.specializationData}
                type="bar"
                dataKey={["teachers", "demand"]}
                xAxisKey="specialization"
                height={300}
                colors={["#3b82f6", "#f59e0b"]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="availability" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Peak Hour Coverage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.availabilityMetrics.peakHourCoverage}%</div>
                <Progress value={metrics.availabilityMetrics.peakHourCoverage} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Flexibility Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.availabilityMetrics.flexibilityScore}%</div>
                <Progress value={metrics.availabilityMetrics.flexibilityScore} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Cancellation Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.availabilityMetrics.cancellationRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics.availabilityMetrics.cancellationRate < 5 ? 'Excellent' : 'Needs improvement'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Avg Response Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.availabilityMetrics.responseTime}h</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Response to messages
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Availability Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="font-medium text-blue-800">Peak Hour Analysis</div>
                <div className="text-sm text-blue-600">
                  85% coverage during peak hours (4-9 PM). Consider incentivizing more teachers for evening slots.
                </div>
              </div>
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="font-medium text-green-800">Flexibility Score</div>
                <div className="text-sm text-green-600">
                  Good flexibility overall. Teachers are adapting well to schedule changes.
                </div>
              </div>
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="font-medium text-yellow-800">Cancellation Rate</div>
                <div className="text-sm text-yellow-600">
                  Cancellation rate is within acceptable range but monitor closely.
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="support" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Teachers Needing Support</CardTitle>
              <CardDescription>
                Identified teachers who could benefit from additional support or training
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.supportNeeded.map((teacher, index) => (
                  <div key={teacher.teacherId} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="font-medium">{teacher.name}</div>
                        <Badge variant={getSeverityColor(teacher.severity) as any}>
                          {teacher.severity} priority
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <div className="text-sm font-medium mb-2">Issues Identified:</div>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {teacher.issues.map((issue, idx) => (
                            <li key={idx}>• {issue}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium mb-2">Recommendations:</div>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {teacher.recommendations.map((rec, idx) => (
                            <li key={idx}>• {rec}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Support Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-600">1</div>
                  <div className="text-sm text-red-800">High Priority</div>
                </div>
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                  <div className="text-2xl font-bold text-yellow-600">1</div>
                  <div className="text-sm text-yellow-800">Medium Priority</div>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">1</div>
                  <div className="text-sm text-blue-800">Low Priority</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}