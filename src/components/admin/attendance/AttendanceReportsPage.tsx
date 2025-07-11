'use client';

import { logger } from '@/lib/services';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Download, Filter, Calendar, Users, GraduationCap, Clock } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { AttendanceStatsOverview } from './AttendanceStatsOverview';
import { AttendanceClassReport } from './AttendanceClassReport';
import { AttendanceTeacherReport } from './AttendanceTeacherReport';
import { AttendancePeriodReport } from './AttendancePeriodReport';
import { AttendanceTrendsChart } from './AttendanceTrendsChart';
import { AttendanceExportDialog } from './AttendanceExportDialog';
import { 
  attendanceAnalyticsService, 
  AttendanceFilters, 
  AttendanceReportPeriod 
} from '@/lib/services/attendance-analytics-service';

interface AttendanceReportsPageProps {
  className?: string;
}

export function AttendanceReportsPage({ className }: AttendanceReportsPageProps) {
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<AttendanceFilters>({
    period: 'monthly'
  });
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [availableTeachers, setAvailableTeachers] = useState<Array<{ id: string; name: string }>>([]);
  const [availableClasses, setAvailableClasses] = useState<Array<{ id: string; name: string; courseType: string }>>([]);
  const [stats, setStats] = useState<any>(null);

  // Load available teachers and classes for filtering
  useEffect(() => {
    loadFilterOptions();
  }, []);

  // Apply filters when they change
  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      setFilters(prev => ({
        ...prev,
        startDate: dateRange.from,
        endDate: dateRange.to
      }));
    }
  }, [dateRange]);

  const loadFilterOptions = async () => {
    try {
      // This would typically load from your existing teacher/class services
      // For now, we'll use placeholder data
      setAvailableTeachers([
        { id: '1', name: 'John Smith' },
        { id: '2', name: 'Sarah Johnson' },
        { id: '3', name: 'Mike Brown' }
      ]);

      setAvailableClasses([
        { id: '1', name: 'Basic English A1', courseType: 'Basic' },
        { id: '2', name: 'Business English', courseType: 'Business English' },
        { id: '3', name: 'Everyday English A', courseType: 'Everyday A' }
      ]);
    } catch (error) {
      logger.error('Error loading filter options:', error);
    }
  };

  const loadStats = async () => {
    try {
      setLoading(true);
      const statsData = await attendanceAnalyticsService.getAttendanceStats(filters);
      setStats(statsData);
    } catch (error) {
      logger.error('Error loading attendance statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [filters]);

  const handleFilterChange = (key: keyof AttendanceFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handlePeriodChange = (period: AttendanceReportPeriod) => {
    const range = attendanceAnalyticsService.getDateRangeForPeriod(period);
    setFilters(prev => ({
      ...prev,
      period,
      startDate: range.start,
      endDate: range.end
    }));
    setDateRange({ from: range.start, to: range.end });
  };

  const clearFilters = () => {
    setFilters({ period: 'monthly' });
    setDateRange(undefined);
  };

  const exportData = () => {
    setShowExportDialog(true);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance Reports</h1>
          <p className="text-muted-foreground">
            Comprehensive attendance analytics and reporting for classes, teachers, and time periods
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={clearFilters}>
            <Filter className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
          <Button onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Export Reports
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Period</label>
              <Select
                value={filters.period}
                onValueChange={(value) => handlePeriodChange(value as AttendanceReportPeriod)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <DatePickerWithRange
                date={dateRange}
                onDateChange={setDateRange}
                placeholder="Select date range"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Teacher</label>
              <Select
                value={filters.teacherId}
                onValueChange={(value) => handleFilterChange('teacherId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All teachers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All teachers</SelectItem>
                  {availableTeachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Class</label>
              <Select
                value={filters.classId}
                onValueChange={(value) => handleFilterChange('classId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All classes</SelectItem>
                  {availableClasses.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name} ({cls.courseType})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Filters */}
          {(filters.teacherId || filters.classId || filters.status) && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-sm font-medium">Active filters:</span>
              {filters.teacherId && (
                <Badge variant="secondary" className="text-xs">
                  Teacher: {availableTeachers.find(t => t.id === filters.teacherId)?.name}
                </Badge>
              )}
              {filters.classId && (
                <Badge variant="secondary" className="text-xs">
                  Class: {availableClasses.find(c => c.id === filters.classId)?.name}
                </Badge>
              )}
              {filters.status && (
                <Badge variant="secondary" className="text-xs">
                  Status: {filters.status}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics Overview */}
      <AttendanceStatsOverview stats={stats} loading={loading} />

      {/* Reports Tabs */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Trends
          </TabsTrigger>
          <TabsTrigger value="classes" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            By Class
          </TabsTrigger>
          <TabsTrigger value="teachers" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            By Teacher
          </TabsTrigger>
          <TabsTrigger value="periods" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            By Period
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trends">
          <AttendanceTrendsChart filters={filters} />
        </TabsContent>

        <TabsContent value="classes">
          <AttendanceClassReport filters={filters} />
        </TabsContent>

        <TabsContent value="teachers">
          <AttendanceTeacherReport filters={filters} />
        </TabsContent>

        <TabsContent value="periods">
          <AttendancePeriodReport filters={filters} />
        </TabsContent>
      </Tabs>

      {/* Export Dialog */}
      <AttendanceExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        filters={filters}
      />
    </div>
  );
}