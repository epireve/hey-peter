'use client';

import { logger } from '@/lib/services';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Calendar, 
  TrendingUp, 
  TrendingDown,
  Users,
  Clock,
  Award,
  AlertTriangle
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { 
  attendanceAnalyticsService, 
  AttendanceFilters, 
  AttendancePeriodSummary 
} from '@/lib/services/attendance-analytics-service';
import { format, parseISO } from 'date-fns';

interface AttendancePeriodReportProps {
  filters: AttendanceFilters;
}

export function AttendancePeriodReport({ filters }: AttendancePeriodReportProps) {
  const [loading, setLoading] = useState(false);
  const [periodReports, setPeriodReports] = useState<AttendancePeriodSummary[]>([]);

  useEffect(() => {
    loadPeriodReports();
  }, [filters]);

  const loadPeriodReports = async () => {
    try {
      setLoading(true);
      const reports = await attendanceAnalyticsService.getAttendanceByPeriod(filters);
      setPeriodReports(reports);
    } catch (error) {
      logger.error('Error loading period reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceRateColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAttendanceRateBadge = (rate: number) => {
    if (rate >= 90) return 'bg-green-100 text-green-800';
    if (rate >= 75) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  const formatPeriodDate = (period: string) => {
    try {
      // Handle different period formats
      if (period.includes('-') && period.length === 10) {
        // Daily format: YYYY-MM-DD
        return format(parseISO(period), 'MMM dd, yyyy');
      } else if (period.includes('-') && period.length === 7) {
        // Monthly format: YYYY-MM
        return format(parseISO(period + '-01'), 'MMM yyyy');
      } else {
        // Weekly format or other
        return period;
      }
    } catch (error) {
      return period;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (periodReports.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-muted-foreground">No period attendance data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Attendance by Time Period
          </CardTitle>
          <CardDescription>
            Attendance trends and performance across different time periods
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {periodReports.map((periodReport) => (
              <Card key={periodReport.period}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{formatPeriodDate(periodReport.period)}</CardTitle>
                      <CardDescription className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {periodReport.uniqueStudents} students
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {periodReport.totalSessions} sessions
                        </span>
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${getAttendanceRateColor(periodReport.attendanceRate)}`}>
                        {formatPercentage(periodReport.attendanceRate)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {periodReport.attendedSessions}/{periodReport.totalSessions} attended
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Period Summary Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-green-600">
                        {periodReport.attendedSessions}
                      </div>
                      <div className="text-sm text-muted-foreground">Present</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-red-600">
                        {periodReport.absentSessions}
                      </div>
                      <div className="text-sm text-muted-foreground">Absent</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-yellow-600">
                        {periodReport.lateSessions}
                      </div>
                      <div className="text-sm text-muted-foreground">Late</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-blue-600">
                        {periodReport.excusedSessions}
                      </div>
                      <div className="text-sm text-muted-foreground">Excused</div>
                    </div>
                  </div>

                  {/* Hours Deducted */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Total Hours Deducted</span>
                      <span className="text-sm font-bold text-red-600">
                        {periodReport.hoursDeducted.toFixed(1)} hrs
                      </span>
                    </div>
                  </div>

                  {/* Top and Low Performing Classes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Top Performing Classes */}
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Award className="h-4 w-4 text-green-600" />
                        Top Performing Classes
                      </h4>
                      <div className="space-y-2">
                        {periodReport.topPerformingClasses.slice(0, 3).map((classInfo) => (
                          <div key={classInfo.classId} className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                            <div>
                              <div className="font-medium text-sm">{classInfo.className}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-16">
                                <Progress 
                                  value={classInfo.attendanceRate} 
                                  className="h-2" 
                                />
                              </div>
                              <div className="text-sm font-medium text-green-600">
                                {formatPercentage(classInfo.attendanceRate)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Low Performing Classes */}
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        Classes Needing Attention
                      </h4>
                      <div className="space-y-2">
                        {periodReport.lowPerformingClasses.slice(0, 3).map((classInfo) => (
                          <div key={classInfo.classId} className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                            <div>
                              <div className="font-medium text-sm">{classInfo.className}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-16">
                                <Progress 
                                  value={classInfo.attendanceRate} 
                                  className="h-2" 
                                />
                              </div>
                              <div className="text-sm font-medium text-red-600">
                                {formatPercentage(classInfo.attendanceRate)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Period Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>Period Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Sessions</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Classes</TableHead>
                <TableHead>Present</TableHead>
                <TableHead>Absent</TableHead>
                <TableHead>Late</TableHead>
                <TableHead>Attendance Rate</TableHead>
                <TableHead>Hours Deducted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {periodReports.map((periodReport) => (
                <TableRow key={periodReport.period}>
                  <TableCell className="font-medium">
                    {formatPeriodDate(periodReport.period)}
                  </TableCell>
                  <TableCell>{periodReport.totalSessions}</TableCell>
                  <TableCell>{periodReport.uniqueStudents}</TableCell>
                  <TableCell>{periodReport.uniqueClasses}</TableCell>
                  <TableCell>
                    <span className="text-green-600 font-medium">
                      {periodReport.attendedSessions}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-red-600 font-medium">
                      {periodReport.absentSessions}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-yellow-600 font-medium">
                      {periodReport.lateSessions}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={getAttendanceRateColor(periodReport.attendanceRate)}>
                        {formatPercentage(periodReport.attendanceRate)}
                      </span>
                      {periodReport.attendanceRate >= 75 ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-red-600 font-medium">
                      {periodReport.hoursDeducted.toFixed(1)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}