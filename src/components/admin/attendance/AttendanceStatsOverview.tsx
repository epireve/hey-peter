'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  UserCheck, 
  UserX,
  Timer,
  AlertCircle
} from 'lucide-react';

interface AttendanceStatsOverviewProps {
  stats: {
    totalSessions: number;
    attendanceRate: number;
    absenteeismRate: number;
    punctualityRate: number;
    averageHoursDeducted: number;
    totalHoursDeducted: number;
    uniqueStudents: number;
    uniqueClasses: number;
    uniqueTeachers: number;
    statusBreakdown: {
      present: number;
      absent: number;
      late: number;
      excused: number;
    };
  } | null;
  loading: boolean;
}

export function AttendanceStatsOverview({ stats, loading }: AttendanceStatsOverviewProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-7 w-16 mb-1" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-muted-foreground">No attendance data available</p>
        </CardContent>
      </Card>
    );
  }

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Sessions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalSessions.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            {stats.uniqueStudents} students, {stats.uniqueClasses} classes
          </p>
        </CardContent>
      </Card>

      {/* Attendance Rate */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
          <UserCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getAttendanceRateColor(stats.attendanceRate)}`}>
            {formatPercentage(stats.attendanceRate)}
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={`text-xs ${getAttendanceRateBadge(stats.attendanceRate)}`}>
              {stats.attendanceRate >= 90 ? 'Excellent' : 
               stats.attendanceRate >= 75 ? 'Good' : 'Needs Improvement'}
            </Badge>
            {stats.attendanceRate >= 75 ? (
              <TrendingUp className="h-3 w-3 text-green-500" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-500" />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Absenteeism Rate */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Absenteeism Rate</CardTitle>
          <UserX className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${stats.absenteeismRate > 20 ? 'text-red-600' : 'text-gray-900'}`}>
            {formatPercentage(stats.absenteeismRate)}
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.statusBreakdown.absent} absent sessions
          </p>
        </CardContent>
      </Card>

      {/* Punctuality Rate */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Punctuality Rate</CardTitle>
          <Timer className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getAttendanceRateColor(stats.punctualityRate)}`}>
            {formatPercentage(stats.punctualityRate)}
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.statusBreakdown.late} late arrivals
          </p>
        </CardContent>
      </Card>

      {/* Hours Deducted */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Hours Deducted</CardTitle>
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalHoursDeducted.toFixed(1)}</div>
          <p className="text-xs text-muted-foreground">
            Avg: {stats.averageHoursDeducted.toFixed(2)} per session
          </p>
        </CardContent>
      </Card>

      {/* Unique Teachers */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Teachers</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.uniqueTeachers}</div>
          <p className="text-xs text-muted-foreground">
            Teaching {stats.uniqueClasses} classes
          </p>
        </CardContent>
      </Card>

      {/* Present Sessions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Present Sessions</CardTitle>
          <UserCheck className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {stats.statusBreakdown.present.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            {formatPercentage((stats.statusBreakdown.present / stats.totalSessions) * 100)}
          </p>
        </CardContent>
      </Card>

      {/* Excused Sessions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Excused Sessions</CardTitle>
          <AlertCircle className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {stats.statusBreakdown.excused.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            {formatPercentage((stats.statusBreakdown.excused / stats.totalSessions) * 100)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}