"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Server,
  Activity,
  Zap,
  Mail,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  Database,
  Globe
} from "lucide-react";
import { AnalyticsChart } from "../AnalyticsChart";
import { classEfficiencyAnalytics } from "@/lib/services/class-efficiency-analytics";

interface SystemAnalyticsProps {
  className?: string;
}

interface SystemMetrics {
  schedulingPerformance: {
    successRate: number;
    avgProcessingTime: number;
    conflictResolutionRate: number;
    autoSchedulingUtilization: number;
  };
  bookingMetrics: {
    totalBookings: number;
    successfulBookings: number;
    cancelledBookings: number;
    averageBookingTime: number;
  };
  emailDelivery: {
    sentEmails: number;
    deliveredEmails: number;
    openRate: number;
    clickRate: number;
    bounceRate: number;
  };
  platformUsage: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    averageSessionDuration: number;
  };
  systemHealth: {
    uptime: number;
    responseTime: number;
    errorRate: number;
    databasePerformance: number;
  };
  performanceTrends: Array<{
    date: string;
    scheduling: number;
    booking: number;
    email: number;
    overall: number;
  }>;
  resourceUtilization: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkUsage: number;
  };
  alerts: Array<{
    id: string;
    type: 'error' | 'warning' | 'info';
    message: string;
    timestamp: string;
    resolved: boolean;
  }>;
}

export function SystemAnalytics({ className }: SystemAnalyticsProps) {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('24_hours');

  useEffect(() => {
    loadSystemMetrics();
  }, [timeframe]);

  const loadSystemMetrics = async () => {
    try {
      setLoading(true);
      
      // Mock data representing system analytics
      const mockMetrics: SystemMetrics = {
        schedulingPerformance: {
          successRate: 94.2,
          avgProcessingTime: 2.3,
          conflictResolutionRate: 89.7,
          autoSchedulingUtilization: 76.8
        },
        bookingMetrics: {
          totalBookings: 1247,
          successfulBookings: 1189,
          cancelledBookings: 58,
          averageBookingTime: 4.2
        },
        emailDelivery: {
          sentEmails: 2856,
          deliveredEmails: 2798,
          openRate: 68.4,
          clickRate: 24.7,
          bounceRate: 2.1
        },
        platformUsage: {
          dailyActiveUsers: 312,
          weeklyActiveUsers: 891,
          monthlyActiveUsers: 1456,
          averageSessionDuration: 24.5
        },
        systemHealth: {
          uptime: 99.8,
          responseTime: 245,
          errorRate: 0.3,
          databasePerformance: 92.5
        },
        performanceTrends: [
          { date: '2024-06-01', scheduling: 93, booking: 95, email: 97, overall: 95 },
          { date: '2024-06-02', scheduling: 94, booking: 93, email: 96, overall: 94 },
          { date: '2024-06-03', scheduling: 95, booking: 96, email: 98, overall: 96 },
          { date: '2024-06-04', scheduling: 92, booking: 94, email: 95, overall: 94 },
          { date: '2024-06-05', scheduling: 96, booking: 97, email: 99, overall: 97 },
          { date: '2024-06-06', scheduling: 94, booking: 95, email: 97, overall: 95 },
          { date: '2024-06-07', scheduling: 95, booking: 96, email: 98, overall: 96 }
        ],
        resourceUtilization: {
          cpuUsage: 68.5,
          memoryUsage: 72.3,
          diskUsage: 45.7,
          networkUsage: 34.2
        },
        alerts: [
          {
            id: '1',
            type: 'warning',
            message: 'High memory usage detected on server-02',
            timestamp: '2024-06-07T14:30:00Z',
            resolved: false
          },
          {
            id: '2',
            type: 'info',
            message: 'Scheduled maintenance completed successfully',
            timestamp: '2024-06-07T09:00:00Z',
            resolved: true
          },
          {
            id: '3',
            type: 'error',
            message: 'Email delivery failure for batch job #1247',
            timestamp: '2024-06-07T11:45:00Z',
            resolved: true
          }
        ]
      };

      setMetrics(mockMetrics);
    } catch (error) {
      console.error('Failed to load system metrics:', error);
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
        <p>Failed to load system analytics</p>
      </div>
    );
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info': return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default: return <CheckCircle className="h-4 w-4" />;
    }
  };

  const getAlertBadgeVariant = (type: string) => {
    switch (type) {
      case 'error': return 'destructive';
      case 'warning': return 'default';
      case 'info': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">System Analytics</h2>
          <p className="text-muted-foreground">
            Platform performance, infrastructure monitoring, and operational metrics
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant={timeframe === '24_hours' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeframe('24_hours')}
          >
            24 Hours
          </Button>
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
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.systemHealth.uptime}%</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.systemHealth.responseTime}ms</div>
            <p className="text-xs text-green-600">
              <TrendingUp className="w-3 h-3 inline mr-1" />
              15% faster than last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.systemHealth.errorRate}%</div>
            <p className="text-xs text-muted-foreground">
              Well below 1% target
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">DB Performance</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.systemHealth.databasePerformance}%</div>
            <Progress value={metrics.systemHealth.databasePerformance} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="scheduling">Scheduling</TabsTrigger>
          <TabsTrigger value="email">Email Analytics</TabsTrigger>
          <TabsTrigger value="usage">Platform Usage</TabsTrigger>
          <TabsTrigger value="infrastructure">Infrastructure</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Overall System Performance</CardTitle>
              <CardDescription>
                Performance trends across all system components
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AnalyticsChart
                title=""
                data={metrics.performanceTrends}
                type="line"
                dataKey={["scheduling", "booking", "email", "overall"]}
                xAxisKey="date"
                height={350}
                colors={["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"]}
              />
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Scheduling Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Success Rate</span>
                    <span className="font-medium">{metrics.schedulingPerformance.successRate}%</span>
                  </div>
                  <Progress value={metrics.schedulingPerformance.successRate} />
                  
                  <div className="flex justify-between">
                    <span className="text-sm">Avg Processing Time</span>
                    <span className="font-medium">{metrics.schedulingPerformance.avgProcessingTime}s</span>
                  </div>
                  <Progress value={(5 - metrics.schedulingPerformance.avgProcessingTime) * 20} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Booking Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{metrics.bookingMetrics.successfulBookings}</div>
                    <div className="text-sm text-muted-foreground">Successful Bookings</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg text-red-600">{metrics.bookingMetrics.cancelledBookings}</div>
                    <div className="text-sm text-muted-foreground">Cancelled</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Email Delivery</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Delivery Rate</span>
                    <span className="font-medium">
                      {((metrics.emailDelivery.deliveredEmails / metrics.emailDelivery.sentEmails) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={(metrics.emailDelivery.deliveredEmails / metrics.emailDelivery.sentEmails) * 100} />
                  
                  <div className="flex justify-between">
                    <span className="text-sm">Open Rate</span>
                    <span className="font-medium">{metrics.emailDelivery.openRate}%</span>
                  </div>
                  <Progress value={metrics.emailDelivery.openRate} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="scheduling" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Success Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.schedulingPerformance.successRate}%</div>
                <Progress value={metrics.schedulingPerformance.successRate} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Processing Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.schedulingPerformance.avgProcessingTime}s</div>
                <p className="text-xs text-muted-foreground mt-1">Average</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Conflict Resolution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.schedulingPerformance.conflictResolutionRate}%</div>
                <Progress value={metrics.schedulingPerformance.conflictResolutionRate} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Auto-Scheduling</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.schedulingPerformance.autoSchedulingUtilization}%</div>
                <p className="text-xs text-muted-foreground mt-1">Utilization</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Scheduling Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="font-medium text-green-800">High Success Rate</div>
                <div className="text-sm text-green-600">
                  94.2% scheduling success rate indicates excellent algorithm performance.
                </div>
              </div>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="font-medium text-blue-800">Fast Processing</div>
                <div className="text-sm text-blue-600">
                  Average processing time of 2.3 seconds ensures smooth user experience.
                </div>
              </div>
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="font-medium text-yellow-800">Conflict Resolution</div>
                <div className="text-sm text-yellow-600">
                  89.7% conflict resolution rate. Consider optimizing for remaining edge cases.
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Sent Emails</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.emailDelivery.sentEmails}</div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Delivery Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {((metrics.emailDelivery.deliveredEmails / metrics.emailDelivery.sentEmails) * 100).toFixed(1)}%
                </div>
                <Progress value={(metrics.emailDelivery.deliveredEmails / metrics.emailDelivery.sentEmails) * 100} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Open Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.emailDelivery.openRate}%</div>
                <Progress value={metrics.emailDelivery.openRate} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Click Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.emailDelivery.clickRate}%</div>
                <Progress value={metrics.emailDelivery.clickRate} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Bounce Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{metrics.emailDelivery.bounceRate}%</div>
                <p className="text-xs text-muted-foreground">Low is good</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Email Performance Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <h4 className="font-medium">Performance Indicators</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Delivery Rate</span>
                      <span className="text-sm font-medium text-green-600">Excellent (97.9%)</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Open Rate</span>
                      <span className="text-sm font-medium text-green-600">Above Average (68.4%)</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Click Rate</span>
                      <span className="text-sm font-medium text-yellow-600">Good (24.7%)</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Bounce Rate</span>
                      <span className="text-sm font-medium text-green-600">Excellent (2.1%)</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-medium">Email Statistics</h4>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{metrics.emailDelivery.deliveredEmails}</div>
                    <div className="text-sm text-muted-foreground">Successfully Delivered</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Daily Active Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.platformUsage.dailyActiveUsers}</div>
                <p className="text-xs text-green-600">+5.2% from yesterday</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Weekly Active Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.platformUsage.weeklyActiveUsers}</div>
                <p className="text-xs text-green-600">+8.7% from last week</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Monthly Active Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.platformUsage.monthlyActiveUsers}</div>
                <p className="text-xs text-green-600">+12.3% from last month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Avg Session Duration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.platformUsage.averageSessionDuration}m</div>
                <p className="text-xs text-muted-foreground">Per session</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Usage Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="font-medium text-green-800">Growing User Base</div>
                <div className="text-sm text-green-600">
                  Consistent growth across all user activity metrics indicates healthy platform adoption.
                </div>
              </div>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="font-medium text-blue-800">Strong Engagement</div>
                <div className="text-sm text-blue-600">
                  24.5-minute average session duration shows high user engagement.
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="infrastructure" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">CPU Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.resourceUtilization.cpuUsage}%</div>
                <Progress value={metrics.resourceUtilization.cpuUsage} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Memory Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.resourceUtilization.memoryUsage}%</div>
                <Progress value={metrics.resourceUtilization.memoryUsage} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Disk Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.resourceUtilization.diskUsage}%</div>
                <Progress value={metrics.resourceUtilization.diskUsage} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Network Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.resourceUtilization.networkUsage}%</div>
                <Progress value={metrics.resourceUtilization.networkUsage} className="mt-2" />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>System Alerts</CardTitle>
              <CardDescription>
                Recent system alerts and notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics.alerts.map((alert) => (
                  <div key={alert.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                    {getAlertIcon(alert.type)}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Badge variant={getAlertBadgeVariant(alert.type) as any}>
                          {alert.type}
                        </Badge>
                        {alert.resolved && (
                          <Badge variant="outline" className="text-green-600">
                            Resolved
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm font-medium mt-1">{alert.message}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(alert.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}