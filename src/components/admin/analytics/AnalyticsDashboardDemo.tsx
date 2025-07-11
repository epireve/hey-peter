"use client";

import { logger } from '@/lib/services';

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MobileAnalyticsCard, MobileAnalyticsGrid } from "./MobileAnalyticsCard";
import { ResponsiveChart, ChartGrid } from "./ResponsiveChart";
import { AnalyticsGrid, AnalyticsSection } from "./AnalyticsLayout";
import { KPICard } from "@/components/admin/dashboard/KPICard";
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  BookOpen, 
  Calendar,
  Target,
  Award,
  AlertCircle,
  Monitor,
  Smartphone
} from "lucide-react";

export function AnalyticsDashboardDemo() {
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");

  // Mock data
  const kpiData = [
    {
      title: "Total Students",
      value: 450,
      description: "Active enrolled students",
      icon: Users,
      trend: { value: 12.5, isPositive: true },
      badge: { text: "New", variant: "secondary" as const }
    },
    {
      title: "Monthly Revenue",
      value: "$35,000",
      description: "Current month earnings",
      icon: DollarSign,
      trend: { value: 8.3, isPositive: true },
      progress: { value: 78, max: 100 }
    },
    {
      title: "Completion Rate",
      value: "87%",
      description: "Course completion rate",
      icon: Award,
      trend: { value: 3.2, isPositive: true }
    },
    {
      title: "At Risk Students",
      value: 12,
      description: "Need immediate attention",
      icon: AlertCircle,
      trend: { value: 2.1, isPositive: false },
      badge: { text: "Alert", variant: "destructive" as const }
    }
  ];

  const chartData = [
    { month: "Jan", students: 380, revenue: 28000, completion: 82 },
    { month: "Feb", students: 420, revenue: 32000, completion: 85 },
    { month: "Mar", students: 450, revenue: 35000, completion: 87 },
    { month: "Apr", students: 480, revenue: 38000, completion: 89 },
    { month: "May", students: 510, revenue: 42000, completion: 91 },
    { month: "Jun", students: 540, revenue: 45000, completion: 93 }
  ];

  const courseData = [
    { name: "Basic English", students: 120, satisfaction: 4.5 },
    { name: "Business English", students: 95, satisfaction: 4.8 },
    { name: "Everyday A/B", students: 85, satisfaction: 4.3 },
    { name: "Speak Up", students: 70, satisfaction: 4.2 },
    { name: "1-on-1", students: 45, satisfaction: 4.9 }
  ];

  const renderDesktopView = () => (
    <div className="space-y-6">
      <AnalyticsSection
        title="Key Performance Indicators"
        description="Overview of academy performance metrics"
      >
        <AnalyticsGrid columns={4}>
          {kpiData.map((kpi, index) => (
            <KPICard
              key={index}
              title={kpi.title}
              value={kpi.value}
              description={kpi.description}
              icon={kpi.icon}
              trend={kpi.trend}
            />
          ))}
        </AnalyticsGrid>
      </AnalyticsSection>

      <AnalyticsSection
        title="Performance Charts"
        description="Visual representation of key metrics"
      >
        <ChartGrid>
          <ResponsiveChart
            title="Student Growth"
            description="Monthly student enrollment trends"
            data={chartData}
            type="line"
            dataKey="students"
            xAxisKey="month"
            colors={["#3b82f6"]}
            showFullscreen
            showDownload
          />
          <ResponsiveChart
            title="Revenue Trend"
            description="Monthly revenue performance"
            data={chartData}
            type="area"
            dataKey="revenue"
            xAxisKey="month"
            colors={["#10b981"]}
            showFullscreen
            showDownload
          />
        </ChartGrid>
      </AnalyticsSection>

      <AnalyticsSection
        title="Course Performance"
        description="Individual course metrics and satisfaction"
      >
        <ResponsiveChart
          title="Course Enrollment"
          description="Students enrolled by course type"
          data={courseData}
          type="bar"
          dataKey="students"
          xAxisKey="name"
          colors={["#8b5cf6"]}
          showFullscreen
          showDownload
        />
      </AnalyticsSection>
    </div>
  );

  const renderMobileView = () => (
    <div className="space-y-4">
      <AnalyticsSection
        title="Key Metrics"
        description="Quick overview of performance"
      >
        <MobileAnalyticsGrid columns={2}>
          {kpiData.map((kpi, index) => (
            <MobileAnalyticsCard
              key={index}
              title={kpi.title}
              value={kpi.value}
              description={kpi.description}
              icon={kpi.icon}
              trend={kpi.trend}
              badge={kpi.badge}
              progress={kpi.progress}
              actions={[
                { label: "View Details", onClick: () => logger.info("View details") }
              ]}
            />
          ))}
        </MobileAnalyticsGrid>
      </AnalyticsSection>

      <AnalyticsSection
        title="Charts"
        description="Visual data representation"
      >
        <div className="space-y-4">
          <ResponsiveChart
            title="Student Growth"
            description="Monthly trends"
            data={chartData}
            type="line"
            dataKey="students"
            xAxisKey="month"
            colors={["#3b82f6"]}
            className="w-full"
          />
          <ResponsiveChart
            title="Revenue"
            description="Monthly performance"
            data={chartData}
            type="bar"
            dataKey="revenue"
            xAxisKey="month"
            colors={["#10b981"]}
            className="w-full"
          />
        </div>
      </AnalyticsSection>

      <AnalyticsSection
        title="Course Stats"
        description="Performance by course"
      >
        <MobileAnalyticsGrid columns={1}>
          {courseData.map((course, index) => (
            <MobileAnalyticsCard
              key={index}
              title={course.name}
              value={course.students}
              description={`${course.students} students enrolled`}
              icon={BookOpen}
              badge={{ text: `${course.satisfaction}★`, variant: "secondary" }}
              compact
            />
          ))}
        </MobileAnalyticsGrid>
      </AnalyticsSection>
    </div>
  );

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Analytics Dashboard Demo
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Responsive analytics dashboard with mobile and desktop views
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="text-xs">
            {viewMode === "desktop" ? "Desktop View" : "Mobile View"}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === "desktop" ? "mobile" : "desktop")}
          >
            {viewMode === "desktop" ? (
              <>
                <Smartphone className="h-4 w-4 mr-2" />
                Mobile View
              </>
            ) : (
              <>
                <Monitor className="h-4 w-4 mr-2" />
                Desktop View
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Demo Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {viewMode === "desktop" ? (
              <Monitor className="h-5 w-5" />
            ) : (
              <Smartphone className="h-5 w-5" />
            )}
            <span>{viewMode === "desktop" ? "Desktop" : "Mobile"} Layout</span>
          </CardTitle>
          <CardDescription>
            {viewMode === "desktop" 
              ? "Full-featured desktop analytics dashboard with comprehensive charts and metrics"
              : "Mobile-optimized analytics with touch-friendly interfaces and simplified navigation"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {viewMode === "desktop" ? renderDesktopView() : renderMobileView()}
        </CardContent>
      </Card>

      {/* Integration Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Guide</CardTitle>
          <CardDescription>
            How to integrate the analytics dashboard into your admin portal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">1. Import Components</h4>
              <div className="bg-muted p-3 rounded-lg text-sm font-mono">
                {`import { AnalyticsDashboard } from '@/components/admin/analytics';`}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">2. Add to Admin Navigation</h4>
              <div className="bg-muted p-3 rounded-lg text-sm font-mono">
                {`{ href: "/admin/analytics", label: "Analytics", icon: BarChart3 }`}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">3. Create Analytics Page</h4>
              <div className="bg-muted p-3 rounded-lg text-sm font-mono">
                {`// src/app/admin/analytics/page.tsx
export default function AnalyticsPage() {
  return <AnalyticsDashboard />;
}`}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}