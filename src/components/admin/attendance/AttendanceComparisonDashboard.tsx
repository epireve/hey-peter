"use client";

import { logger } from '@/lib/services';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { LineChart } from '@/components/ui/charts/LineChart';
import { BarChart } from '@/components/ui/charts/BarChart';
import { ScatterChart } from '@/components/ui/charts/ScatterChart';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  BarChart3,
  Users,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Download,
  Filter,
  ArrowUpDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { classAttendanceAnalyticsService } from '@/lib/services/class-attendance-analytics-service';
import { attendanceAnalyticsService } from '@/lib/services/attendance-analytics-service';
import { 
  ClassAttendanceAnalytics,
  AttendanceClassSummary
} from '@/types/attendance';
import { format } from 'date-fns';

interface ClassComparisonData {
  classId: string;
  className: string;
  courseType: string;
  teacher: string;
  attendanceRate: number;
  consistency: number;
  totalSessions: number;
  improvingStudents: number;
  decliningStudents: number;
  riskStudents: number;
}

interface AttendanceComparisonDashboardProps {
  className?: string;
}

type ComparisonView = 'overview' | 'performance' | 'trends' | 'benchmarks';
type TimeframeOption = '30_days' | '90_days' | '180_days';
type CourseTypeFilter = 'all' | 'Basic' | 'Everyday A' | 'Everyday B' | 'Speak Up' | 'Business English' | '1-on-1';

export const AttendanceComparisonDashboard: React.FC<AttendanceComparisonDashboardProps> = ({
  className
}) => {
  const [classData, setClassData] = useState<ClassComparisonData[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<TimeframeOption>('90_days');
  const [courseTypeFilter, setCourseTypeFilter] = useState<CourseTypeFilter>('all');
  const [viewMode, setViewMode] = useState<ComparisonView>('overview');
  const [sortBy, setSortBy] = useState<keyof ClassComparisonData>('attendanceRate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Load class comparison data
  const loadComparisonData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all classes with attendance summary
      const classSummaries = await attendanceAnalyticsService.getAttendanceByClass({
        startDate: getStartDate(timeframe),
        endDate: new Date(),
        ...(courseTypeFilter !== 'all' && { courseType: courseTypeFilter })
      });

      // Transform data for comparison
      const comparisonData: ClassComparisonData[] = await Promise.all(
        classSummaries.map(async (summary) => {
          try {
            // Get detailed analytics for consistency score
            const analytics = await classAttendanceAnalyticsService.getClassAttendanceAnalytics(
              summary.classId,
              timeframe
            );

            return {
              classId: summary.classId,
              className: summary.className,
              courseType: summary.courseType,
              teacher: summary.teacher.fullName,
              attendanceRate: summary.attendanceRate,
              consistency: analytics.attendanceMetrics.attendanceConsistency,
              totalSessions: summary.totalSessions,
              improvingStudents: analytics.attendanceMetrics.improvingStudents,
              decliningStudents: analytics.attendanceMetrics.decliningStudents,
              riskStudents: analytics.attendanceMetrics.chronicallyAbsentStudents
            };
          } catch (err) {
            logger.warn(`Failed to get detailed analytics for class ${summary.classId}:`, err);
            
            // Fallback to basic data
            return {
              classId: summary.classId,
              className: summary.className,
              courseType: summary.courseType,
              teacher: summary.teacher.fullName,
              attendanceRate: summary.attendanceRate,
              consistency: 75, // Default value
              totalSessions: summary.totalSessions,
              improvingStudents: 0,
              decliningStudents: 0,
              riskStudents: 0
            };
          }
        })
      );

      setClassData(comparisonData);
      
      // Auto-select top 5 classes if none selected
      if (selectedClasses.length === 0) {
        const topClasses = comparisonData
          .sort((a, b) => b.attendanceRate - a.attendanceRate)
          .slice(0, 5)
          .map(c => c.classId);
        setSelectedClasses(topClasses);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comparison data');
    } finally {
      setLoading(false);
    }
  };

  // Get start date for timeframe
  const getStartDate = (timeframe: TimeframeOption): Date => {
    const now = new Date();
    switch (timeframe) {
      case '30_days':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90_days':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case '180_days':
        return new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    }
  };

  // Sort and filter data
  const sortedAndFilteredData = useMemo(() => {
    let filtered = classData;
    
    if (courseTypeFilter !== 'all') {
      filtered = filtered.filter(c => c.courseType === courseTypeFilter);
    }

    return filtered.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      return sortOrder === 'asc' 
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
  }, [classData, courseTypeFilter, sortBy, sortOrder]);

  // Selected class data for charts
  const selectedClassData = useMemo(() => {
    return sortedAndFilteredData.filter(c => selectedClasses.includes(c.classId));
  }, [sortedAndFilteredData, selectedClasses]);

  // Chart data preparation
  const chartData = useMemo(() => {
    // Bar chart data - attendance rates
    const attendanceData = selectedClassData.map(c => ({
      class: c.className.length > 15 ? c.className.substring(0, 15) + '...' : c.className,
      attendance: c.attendanceRate,
      consistency: c.consistency,
      sessions: c.totalSessions
    }));

    // Scatter plot data - attendance vs consistency
    const scatterData = classData.map(c => ({
      x: c.attendanceRate,
      y: c.consistency,
      class: c.className,
      courseType: c.courseType,
      size: c.totalSessions
    }));

    // Performance comparison data
    const performanceData = selectedClassData.map(c => ({
      class: c.className.length > 12 ? c.className.substring(0, 12) + '...' : c.className,
      improving: c.improvingStudents,
      declining: c.decliningStudents,
      atRisk: c.riskStudents
    }));

    return {
      attendanceData,
      scatterData,
      performanceData
    };
  }, [selectedClassData, classData]);

  // Statistics
  const statistics = useMemo(() => {
    if (classData.length === 0) return null;

    const avgAttendance = classData.reduce((sum, c) => sum + c.attendanceRate, 0) / classData.length;
    const avgConsistency = classData.reduce((sum, c) => sum + c.consistency, 0) / classData.length;
    const totalSessions = classData.reduce((sum, c) => sum + c.totalSessions, 0);
    const totalRiskStudents = classData.reduce((sum, c) => sum + c.riskStudents, 0);

    const topPerformer = classData.reduce((top, current) => 
      current.attendanceRate > top.attendanceRate ? current : top
    );

    const mostConsistent = classData.reduce((top, current) => 
      current.consistency > top.consistency ? current : top
    );

    return {
      avgAttendance,
      avgConsistency,
      totalSessions,
      totalRiskStudents,
      topPerformer,
      mostConsistent,
      totalClasses: classData.length
    };
  }, [classData]);

  // Class selection options
  const classOptions = useMemo(() => {
    return sortedAndFilteredData.map(c => ({
      value: c.classId,
      label: `${c.className} (${c.courseType})`
    }));
  }, [sortedAndFilteredData]);

  // Handle sorting
  const handleSort = (field: keyof ClassComparisonData) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Export data
  const handleExport = () => {
    const dataToExport = {
      timeframe,
      courseTypeFilter,
      generatedAt: new Date().toISOString(),
      statistics,
      classes: selectedClassData
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-comparison-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Load data on mount and when filters change
  useEffect(() => {
    loadComparisonData();
  }, [timeframe, courseTypeFilter]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-6 w-48 bg-muted animate-pulse rounded" />
            <div className="h-4 w-32 bg-muted animate-pulse rounded" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                  <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const getSortIcon = (field: keyof ClassComparisonData) => {
    if (sortBy !== field) return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />;
    return sortOrder === 'asc' ? 
      <TrendingUp className="h-4 w-4" /> : 
      <TrendingDown className="h-4 w-4" />;
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">
            Attendance Comparison Dashboard
          </h2>
          <p className="text-muted-foreground">
            Compare attendance performance across classes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={loadComparisonData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <Select value={timeframe} onValueChange={(value) => setTimeframe(value as TimeframeOption)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30_days">Last 30 days</SelectItem>
            <SelectItem value="90_days">Last 90 days</SelectItem>
            <SelectItem value="180_days">Last 180 days</SelectItem>
          </SelectContent>
        </Select>

        <Select 
          value={courseTypeFilter} 
          onValueChange={(value) => setCourseTypeFilter(value as CourseTypeFilter)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Course Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Course Types</SelectItem>
            <SelectItem value="Basic">Basic</SelectItem>
            <SelectItem value="Everyday A">Everyday A</SelectItem>
            <SelectItem value="Everyday B">Everyday B</SelectItem>
            <SelectItem value="Speak Up">Speak Up</SelectItem>
            <SelectItem value="Business English">Business English</SelectItem>
            <SelectItem value="1-on-1">1-on-1</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1 min-w-[300px]">
          <MultiSelect
            options={classOptions}
            value={selectedClasses}
            onValueChange={setSelectedClasses}
            placeholder="Select classes to compare..."
            variant="default"
            maxCount={10}
          />
        </div>
      </div>

      {/* Overview Statistics */}
      {statistics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Average Attendance
                  </p>
                  <p className="text-2xl font-bold">
                    {statistics.avgAttendance.toFixed(1)}%
                  </p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <Progress value={statistics.avgAttendance} className="mt-3" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Average Consistency
                  </p>
                  <p className="text-2xl font-bold">
                    {statistics.avgConsistency.toFixed(0)}%
                  </p>
                </div>
                <Target className="h-8 w-8 text-muted-foreground" />
              </div>
              <Progress value={statistics.avgConsistency} className="mt-3" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Sessions
                  </p>
                  <p className="text-2xl font-bold">
                    {statistics.totalSessions.toLocaleString()}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                Across {statistics.totalClasses} classes
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    At-Risk Students
                  </p>
                  <p className="text-2xl font-bold">
                    {statistics.totalRiskStudents}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                Require intervention
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Visualization */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Attendance Rate Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Rate Comparison</CardTitle>
            <CardDescription>
              Compare attendance rates across selected classes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart
              data={chartData.attendanceData}
              series={[
                { key: 'attendance', name: 'Attendance Rate', color: '#3b82f6' }
              ]}
              xAxis={{ dataKey: 'class' }}
              yAxis={{ domain: [0, 100] }}
              height={300}
            />
          </CardContent>
        </Card>

        {/* Attendance vs Consistency Scatter Plot */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance vs Consistency</CardTitle>
            <CardDescription>
              Relationship between attendance rate and consistency
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScatterChart
              data={chartData.scatterData}
              xAxis={{ 
                dataKey: 'x', 
                domain: [0, 100],
                label: 'Attendance Rate (%)'
              }}
              yAxis={{ 
                domain: [0, 100],
                label: 'Consistency Score (%)'
              }}
              height={300}
            />
          </CardContent>
        </Card>

        {/* Student Performance Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Student Performance Trends</CardTitle>
            <CardDescription>
              Improving vs declining students by class
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart
              data={chartData.performanceData}
              series={[
                { key: 'improving', name: 'Improving', color: '#22c55e' },
                { key: 'declining', name: 'Declining', color: '#ef4444' },
                { key: 'atRisk', name: 'At Risk', color: '#f59e0b' }
              ]}
              xAxis={{ dataKey: 'class' }}
              height={300}
              stacked
            />
          </CardContent>
        </Card>

        {/* Top Performers */}
        {statistics && (
          <Card>
            <CardHeader>
              <CardTitle>Top Performers</CardTitle>
              <CardDescription>
                Highest performing classes in key metrics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Best Attendance Rate</span>
                  <Badge variant="secondary">
                    {statistics.topPerformer.attendanceRate.toFixed(1)}%
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {statistics.topPerformer.className} • {statistics.topPerformer.courseType}
                </div>
                <Progress value={statistics.topPerformer.attendanceRate} />
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Most Consistent</span>
                  <Badge variant="secondary">
                    {statistics.mostConsistent.consistency.toFixed(0)}%
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {statistics.mostConsistent.className} • {statistics.mostConsistent.courseType}
                </div>
                <Progress value={statistics.mostConsistent.consistency} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detailed Class Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Class Performance</CardTitle>
          <CardDescription>
            Sortable table showing all class metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleSort('className')}
                      className="h-auto p-0 font-medium"
                    >
                      Class Name {getSortIcon('className')}
                    </Button>
                  </th>
                  <th className="text-left p-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleSort('courseType')}
                      className="h-auto p-0 font-medium"
                    >
                      Course Type {getSortIcon('courseType')}
                    </Button>
                  </th>
                  <th className="text-left p-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleSort('attendanceRate')}
                      className="h-auto p-0 font-medium"
                    >
                      Attendance {getSortIcon('attendanceRate')}
                    </Button>
                  </th>
                  <th className="text-left p-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleSort('consistency')}
                      className="h-auto p-0 font-medium"
                    >
                      Consistency {getSortIcon('consistency')}
                    </Button>
                  </th>
                  <th className="text-left p-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleSort('totalSessions')}
                      className="h-auto p-0 font-medium"
                    >
                      Sessions {getSortIcon('totalSessions')}
                    </Button>
                  </th>
                  <th className="text-left p-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleSort('riskStudents')}
                      className="h-auto p-0 font-medium"
                    >
                      At Risk {getSortIcon('riskStudents')}
                    </Button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedAndFilteredData.map((classItem) => (
                  <tr 
                    key={classItem.classId}
                    className={cn(
                      "border-b hover:bg-muted/50",
                      selectedClasses.includes(classItem.classId) && "bg-blue-50"
                    )}
                  >
                    <td className="p-2">
                      <div>
                        <div className="font-medium">{classItem.className}</div>
                        <div className="text-xs text-muted-foreground">{classItem.teacher}</div>
                      </div>
                    </td>
                    <td className="p-2">
                      <Badge variant="outline">{classItem.courseType}</Badge>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{classItem.attendanceRate.toFixed(1)}%</span>
                        <div className="w-12">
                          <Progress value={classItem.attendanceRate} className="h-1" />
                        </div>
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{classItem.consistency.toFixed(0)}%</span>
                        <div className="w-12">
                          <Progress value={classItem.consistency} className="h-1" />
                        </div>
                      </div>
                    </td>
                    <td className="p-2 font-medium">
                      {classItem.totalSessions}
                    </td>
                    <td className="p-2">
                      {classItem.riskStudents > 0 ? (
                        <Badge variant="destructive">{classItem.riskStudents}</Badge>
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};