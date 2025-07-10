"use client";

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  Users, 
  GraduationCap, 
  BookOpen, 
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Download,
  Refresh
} from "lucide-react";
import { AnalyticsChart } from "./AnalyticsChart";
import { KPICard } from "./KPICard";
import { StudentAnalytics, TeacherAnalytics, SystemAnalytics, BusinessIntelligence } from "./analytics";
import { classEfficiencyAnalytics } from "@/lib/services/class-efficiency-analytics";
import { teacherPerformanceAnalytics } from "@/lib/services/teacher-performance-analytics";
import { studentProgressAnalytics } from "@/lib/services/student-progress-analytics";

interface AnalyticsDashboardProps {
  className?: string;
}

interface DashboardSummary {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  systemUtilization: number;
  averageAttendance: number;
  revenueThisMonth: number;
  studentsAtRisk: number;
  teachersNeedingSupport: number;
  trends: {
    studentGrowth: number;
    teacherPerformance: number;
    systemEfficiency: number;
    revenue: number;
  };
}

export function AnalyticsDashboard({ className }: AnalyticsDashboardProps) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    loadAnalyticsSummary();
  }, []);

  const loadAnalyticsSummary = async () => {
    try {
      setLoading(true);
      
      // Get class efficiency metrics
      const efficiencyMetrics = await classEfficiencyAnalytics.getClassEfficiencyMetrics('30_days');
      
      // Calculate summary data from various analytics services
      const summaryData: DashboardSummary = {
        totalStudents: 156, // Would be fetched from actual data
        totalTeachers: 24,
        totalClasses: 342,
        systemUtilization: efficiencyMetrics.utilization.overallUtilization,
        averageAttendance: efficiencyMetrics.efficiency.attendanceEfficiency,
        revenueThisMonth: efficiencyMetrics.revenue.revenuePerHour * 160, // Estimated monthly hours
        studentsAtRisk: 12, // Would be calculated from student analytics
        teachersNeedingSupport: 3, // Would be calculated from teacher analytics
        trends: {
          studentGrowth: 8.5,
          teacherPerformance: 5.2,
          systemEfficiency: efficiencyMetrics.optimization.overallOptimizationScore - 75, // Trend vs baseline
          revenue: 12.3
        }
      };

      setSummary(summaryData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load analytics summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = () => {
    // Export analytics data as CSV/Excel
    console.log('Exporting analytics data...');
  };

  const handleRefresh = () => {
    loadAnalyticsSummary();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
          <p className="mt-2 text-sm text-muted-foreground">Failed to load analytics data</p>
          <Button onClick={handleRefresh} variant="outline" size="sm" className="mt-2">
            <Refresh className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between space-y-2 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into student progress, teacher performance, and system analytics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </Badge>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <Refresh className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleExportData} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <KPICard
          title="Total Students"
          value={summary.totalStudents}
          description={`${summary.studentsAtRisk} at risk`}
          icon={Users}
          trend={{
            value: summary.trends.studentGrowth,
            isPositive: summary.trends.studentGrowth > 0,
          }}
        />
        <KPICard
          title="Total Teachers"
          value={summary.totalTeachers}
          description={`${summary.teachersNeedingSupport} need support`}
          icon={GraduationCap}
          trend={{
            value: summary.trends.teacherPerformance,
            isPositive: summary.trends.teacherPerformance > 0,
          }}
        />
        <KPICard
          title="System Utilization"
          value={`${Math.round(summary.systemUtilization)}%`}
          description="Overall efficiency"
          icon={BarChart3}
          trend={{
            value: summary.trends.systemEfficiency,
            isPositive: summary.trends.systemEfficiency > 0,
          }}
        />
        <KPICard
          title="Monthly Revenue"
          value={`$${summary.revenueThisMonth.toLocaleString()}`}
          description="This month"
          icon={TrendingUp}
          trend={{
            value: summary.trends.revenue,
            isPositive: summary.trends.revenue > 0,
          }}
        />
      </div>

      {/* Quick Insights */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(summary.averageAttendance)}%</div>
            <p className="text-xs text-muted-foreground">
              {summary.averageAttendance > 85 ? '+2.1% from last month' : 'Needs improvement'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Classes This Month</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalClasses}</div>
            <p className="text-xs text-muted-foreground">
              +{Math.round(summary.totalClasses * 0.08)} from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risk Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {summary.studentsAtRisk + summary.teachersNeedingSupport}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.studentsAtRisk} students, {summary.teachersNeedingSupport} teachers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students">Student Analytics</TabsTrigger>
          <TabsTrigger value="teachers">Teacher Analytics</TabsTrigger>
          <TabsTrigger value="system">System Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <BusinessIntelligence />
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <StudentAnalytics />
        </TabsContent>

        <TabsContent value="teachers" className="space-y-4">
          <TeacherAnalytics />
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <SystemAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}