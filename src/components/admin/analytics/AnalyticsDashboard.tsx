"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/admin/dashboard/KPICard";
import { AnalyticsChart } from "@/components/admin/dashboard/AnalyticsChart";
import { MetricCard } from "./MetricCard";
import { AnalyticsFilter } from "./AnalyticsFilter";
import { AnalyticsExport } from "./AnalyticsExport";
import { AnalyticsGrid, AnalyticsSection } from "./AnalyticsLayout";
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  DollarSign, 
  BookOpen, 
  Calendar,
  Target,
  Award,
  Download,
  Filter,
  Settings,
  AlertCircle
} from "lucide-react";

export function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [filters, setFilters] = useState({});

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
    // In a real implementation, this would trigger data refetch
    console.log("Filters changed:", newFilters);
  };

  const handleExport = async (exportSettings: any) => {
    // In a real implementation, this would trigger the export
    console.log("Export settings:", exportSettings);
    // Simulate export delay
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  // Mock data - in real implementation, this would come from API
  const overviewMetrics = {
    totalRevenue: 125000,
    totalStudents: 450,
    totalTeachers: 28,
    totalClasses: 1250,
    monthlyGrowth: 12.5,
    retentionRate: 87.3,
    averageClassSize: 6.2,
    completionRate: 82.5
  };

  const revenueData = [
    { month: "Jan", revenue: 18000, costs: 12000, profit: 6000 },
    { month: "Feb", revenue: 22000, costs: 14000, profit: 8000 },
    { month: "Mar", revenue: 25000, costs: 15000, profit: 10000 },
    { month: "Apr", revenue: 28000, costs: 16000, profit: 12000 },
    { month: "May", revenue: 32000, costs: 18000, profit: 14000 },
    { month: "Jun", revenue: 35000, costs: 20000, profit: 15000 },
  ];

  const studentGrowthData = [
    { month: "Jan", newStudents: 25, activeStudents: 380, churnRate: 5 },
    { month: "Feb", newStudents: 35, activeStudents: 410, churnRate: 4 },
    { month: "Mar", newStudents: 28, activeStudents: 430, churnRate: 3 },
    { month: "Apr", newStudents: 32, activeStudents: 450, churnRate: 4 },
    { month: "May", newStudents: 40, activeStudents: 480, churnRate: 3 },
    { month: "Jun", newStudents: 45, activeStudents: 520, churnRate: 2 },
  ];

  const coursePerformanceData = [
    { course: "Basic English", students: 120, completion: 88, satisfaction: 4.5 },
    { course: "Everyday A/B", students: 98, completion: 82, satisfaction: 4.3 },
    { course: "Speak Up", students: 85, completion: 79, satisfaction: 4.2 },
    { course: "Business English", students: 76, completion: 91, satisfaction: 4.6 },
    { course: "1-on-1 Sessions", students: 45, completion: 95, satisfaction: 4.8 },
  ];

  const teacherMetrics = [
    { name: "Sarah Johnson", students: 32, rating: 4.9, hours: 120, revenue: 4800 },
    { name: "Michael Chen", students: 28, rating: 4.8, hours: 110, revenue: 4400 },
    { name: "Emma Davis", students: 25, rating: 4.7, hours: 95, revenue: 3800 },
    { name: "David Wilson", students: 30, rating: 4.6, hours: 125, revenue: 5000 },
    { name: "Lisa Rodriguez", students: 22, rating: 4.8, hours: 88, revenue: 3520 },
  ];

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            Comprehensive insights into academy performance and growth
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <AnalyticsFilter onFilterChange={handleFilterChange} />
          <AnalyticsExport onExport={handleExport} />
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="teachers">Teachers</TabsTrigger>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Overview KPIs */}
          <AnalyticsGrid columns={4}>
            <KPICard
              title="Total Revenue"
              value={`$${overviewMetrics.totalRevenue.toLocaleString()}`}
              description="Monthly recurring revenue"
              icon={DollarSign}
              trend={{
                value: overviewMetrics.monthlyGrowth,
                isPositive: true,
              }}
            />
            <KPICard
              title="Active Students"
              value={overviewMetrics.totalStudents}
              description="Currently enrolled"
              icon={Users}
              trend={{
                value: 8.5,
                isPositive: true,
              }}
            />
            <KPICard
              title="Completion Rate"
              value={`${overviewMetrics.completionRate}%`}
              description="Course completion rate"
              icon={Award}
              trend={{
                value: 3.2,
                isPositive: true,
              }}
            />
            <KPICard
              title="Retention Rate"
              value={`${overviewMetrics.retentionRate}%`}
              description="Student retention"
              icon={Target}
              trend={{
                value: 2.1,
                isPositive: true,
              }}
            />
          </AnalyticsGrid>

          {/* Overview Charts */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <div className="col-span-4">
              <AnalyticsChart
                title="Revenue & Profitability"
                description="Monthly revenue, costs, and profit analysis"
                data={revenueData}
                type="bar"
                dataKey={["revenue", "costs", "profit"]}
                xAxisKey="month"
                colors={["#10b981", "#ef4444", "#3b82f6"]}
                height={350}
              />
            </div>
            <div className="col-span-3">
              <AnalyticsChart
                title="Student Growth"
                description="New vs. active students"
                data={studentGrowthData}
                type="line"
                dataKey={["newStudents", "activeStudents"]}
                xAxisKey="month"
                colors={["#8b5cf6", "#10b981"]}
                height={350}
              />
            </div>
          </div>

          {/* Performance Summary */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Top Performing Course</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">Business English</p>
                    <p className="text-sm text-muted-foreground">91% completion rate</p>
                  </div>
                  <Badge variant="secondary">4.6★</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Teacher of the Month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">Sarah Johnson</p>
                    <p className="text-sm text-muted-foreground">32 students, 4.9★ rating</p>
                  </div>
                  <Badge variant="secondary">Top</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Key Alert</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-amber-600">12</p>
                    <p className="text-sm text-muted-foreground">Students at risk</p>
                  </div>
                  <AlertCircle className="h-6 w-6 text-amber-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          {/* Student Analytics - Placeholder for enhanced component */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KPICard
              title="Total Students"
              value="450"
              description="All enrolled students"
              icon={Users}
            />
            <KPICard
              title="New This Month"
              value="45"
              description="Fresh enrollments"
              icon={TrendingUp}
            />
            <KPICard
              title="Average Progress"
              value="67%"
              description="Course completion"
              icon={Target}
            />
            <KPICard
              title="At Risk"
              value="12"
              description="Need attention"
              icon={AlertCircle}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Student Analytics</CardTitle>
              <CardDescription>
                Detailed student performance and engagement metrics will be displayed here
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Enhanced student analytics component will be integrated here
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teachers" className="space-y-4">
          {/* Teacher Analytics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KPICard
              title="Total Teachers"
              value="28"
              description="Active teaching staff"
              icon={Users}
            />
            <KPICard
              title="Avg Rating"
              value="4.7★"
              description="Student satisfaction"
              icon={Award}
            />
            <KPICard
              title="Total Hours"
              value="1,250"
              description="Monthly teaching hours"
              icon={Calendar}
            />
            <KPICard
              title="Revenue/Teacher"
              value="$4,464"
              description="Average monthly"
              icon={DollarSign}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Teacher Performance</CardTitle>
              <CardDescription>Top performing teachers this month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teacherMetrics.map((teacher, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{teacher.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {teacher.students} students • {teacher.hours} hours
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Badge variant="secondary">{teacher.rating}★</Badge>
                      <div className="text-right">
                        <div className="font-medium">${teacher.revenue}</div>
                        <div className="text-sm text-muted-foreground">Revenue</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="courses" className="space-y-4">
          {/* Course Analytics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KPICard
              title="Total Courses"
              value="5"
              description="Available programs"
              icon={BookOpen}
            />
            <KPICard
              title="Avg Completion"
              value="85%"
              description="Course completion"
              icon={Target}
            />
            <KPICard
              title="Satisfaction"
              value="4.5★"
              description="Student feedback"
              icon={Award}
            />
            <KPICard
              title="Most Popular"
              value="Basic English"
              description="120 students"
              icon={TrendingUp}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Course Performance Analysis</CardTitle>
              <CardDescription>Performance metrics for all courses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {coursePerformanceData.map((course, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium">{course.course}</div>
                        <div className="text-sm text-muted-foreground">
                          {course.students} students enrolled
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <div className="font-medium">{course.completion}%</div>
                        <div className="text-sm text-muted-foreground">Completion</div>
                      </div>
                      <Badge variant="secondary">{course.satisfaction}★</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          {/* Financial Analytics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KPICard
              title="Monthly Revenue"
              value="$35,000"
              description="Current month"
              icon={DollarSign}
              trend={{
                value: 12.5,
                isPositive: true,
              }}
            />
            <KPICard
              title="Profit Margin"
              value="42.8%"
              description="Revenue - costs"
              icon={TrendingUp}
              trend={{
                value: 3.2,
                isPositive: true,
              }}
            />
            <KPICard
              title="ARPU"
              value="$77.78"
              description="Average revenue per user"
              icon={Target}
            />
            <KPICard
              title="LTV"
              value="$890"
              description="Customer lifetime value"
              icon={Award}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <AnalyticsChart
              title="Revenue Breakdown"
              description="Monthly revenue by course type"
              data={[
                { name: "Basic English", value: 12000 },
                { name: "Business English", value: 8500 },
                { name: "Everyday A/B", value: 7200 },
                { name: "Speak Up", value: 4800 },
                { name: "1-on-1", value: 2500 },
              ]}
              type="pie"
              dataKey="value"
              height={350}
            />
            <AnalyticsChart
              title="Profit Trend"
              description="Monthly profit over time"
              data={revenueData}
              type="area"
              dataKey="profit"
              xAxisKey="month"
              colors={["#10b981"]}
              height={350}
            />
          </div>
        </TabsContent>

        <TabsContent value="operations" className="space-y-4">
          {/* Operations Analytics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KPICard
              title="Total Classes"
              value="1,250"
              description="This month"
              icon={Calendar}
            />
            <KPICard
              title="Attendance Rate"
              value="87.5%"
              description="Students present"
              icon={Target}
            />
            <KPICard
              title="Utilization"
              value="78%"
              description="Teacher capacity"
              icon={BarChart3}
            />
            <KPICard
              title="No-Show Rate"
              value="8.5%"
              description="Missed classes"
              icon={AlertCircle}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Class Schedule Efficiency</CardTitle>
                <CardDescription>Utilization by day of week</CardDescription>
              </CardHeader>
              <CardContent>
                <AnalyticsChart
                  title=""
                  data={[
                    { day: "Mon", utilization: 85 },
                    { day: "Tue", utilization: 92 },
                    { day: "Wed", utilization: 78 },
                    { day: "Thu", utilization: 88 },
                    { day: "Fri", utilization: 75 },
                    { day: "Sat", utilization: 68 },
                    { day: "Sun", utilization: 45 },
                  ]}
                  type="bar"
                  dataKey="utilization"
                  xAxisKey="day"
                  colors={["#3b82f6"]}
                  height={300}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Peak Hours Analysis</CardTitle>
                <CardDescription>Class distribution by hour</CardDescription>
              </CardHeader>
              <CardContent>
                <AnalyticsChart
                  title=""
                  data={[
                    { hour: "8AM", classes: 12 },
                    { hour: "10AM", classes: 25 },
                    { hour: "12PM", classes: 35 },
                    { hour: "2PM", classes: 42 },
                    { hour: "4PM", classes: 38 },
                    { hour: "6PM", classes: 48 },
                    { hour: "8PM", classes: 32 },
                  ]}
                  type="line"
                  dataKey="classes"
                  xAxisKey="hour"
                  colors={["#8b5cf6"]}
                  height={300}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}