'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Clock, 
  Calendar as CalendarIcon, 
  Filter, 
  Download, 
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  isWithinInterval,
  addWeeks,
  subWeeks,
  startOfToday,
  isToday,
  parseISO
} from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ClassHour {
  id: string;
  date: string;
  class_id: string;
  class_name: string;
  student_name: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  type: 'regular' | 'makeup' | 'one-on-one';
  status: 'completed' | 'scheduled' | 'cancelled';
  attendance_status: 'present' | 'absent' | 'late' | null;
}

interface ClassHourTrackerProps {
  teacherId: string;
  classHours: ClassHour[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

const dateRangeOptions = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'this-week', label: 'This Week' },
  { value: 'last-week', label: 'Last Week' },
  { value: 'this-month', label: 'This Month' },
];

const classTypeOptions = [
  { value: 'all', label: 'All Types' },
  { value: 'regular', label: 'Regular' },
  { value: 'makeup', label: 'Makeup' },
  { value: 'one-on-one', label: '1-on-1' },
];

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'completed', label: 'Completed' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function ClassHourTracker({
  teacherId,
  classHours,
  isLoading = false,
  onRefresh,
}: ClassHourTrackerProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [dateRange, setDateRange] = useState('this-week');
  const [classType, setClassType] = useState('all');
  const [status, setStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });

  // Filter class hours
  const filteredHours = useMemo(() => {
    return classHours.filter((hour) => {
      // Date range filter
      if (dateRange !== 'all') {
        const hourDate = parseISO(hour.date);
        
        switch (dateRange) {
          case 'today':
            if (!isToday(hourDate)) return false;
            break;
          case 'this-week':
            if (!isWithinInterval(hourDate, { start: weekStart, end: weekEnd })) return false;
            break;
          case 'last-week':
            const lastWeekStart = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });
            const lastWeekEnd = endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });
            if (!isWithinInterval(hourDate, { start: lastWeekStart, end: lastWeekEnd })) return false;
            break;
          case 'this-month':
            const now = new Date();
            if (hourDate.getMonth() !== now.getMonth() || hourDate.getFullYear() !== now.getFullYear()) {
              return false;
            }
            break;
        }
      }

      // Class type filter
      if (classType !== 'all' && hour.type !== classType) return false;

      // Status filter
      if (status !== 'all' && hour.status !== status) return false;

      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        if (
          !hour.class_name.toLowerCase().includes(search) &&
          !hour.student_name.toLowerCase().includes(search)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [classHours, dateRange, classType, status, searchTerm, weekStart, weekEnd]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalMinutes = filteredHours.reduce((sum, hour) => sum + hour.duration_minutes, 0);
    const completedMinutes = filteredHours
      .filter((hour) => hour.status === 'completed')
      .reduce((sum, hour) => sum + hour.duration_minutes, 0);
    const scheduledMinutes = filteredHours
      .filter((hour) => hour.status === 'scheduled')
      .reduce((sum, hour) => sum + hour.duration_minutes, 0);

    const completedHours = filteredHours.filter((hour) => hour.status === 'completed');
    const presentCount = completedHours.filter((hour) => hour.attendance_status === 'present').length;
    const absentCount = completedHours.filter((hour) => hour.attendance_status === 'absent').length;
    const attendanceRate = completedHours.length > 0
      ? (presentCount / completedHours.length) * 100
      : 0;

    return {
      totalHours: totalMinutes / 60,
      completedHours: completedMinutes / 60,
      scheduledHours: scheduledMinutes / 60,
      presentCount,
      absentCount,
      attendanceRate,
    };
  }, [filteredHours]);

  const clearFilters = () => {
    setDateRange('this-week');
    setClassType('all');
    setStatus('all');
    setSearchTerm('');
  };

  const hasActiveFilters = dateRange !== 'this-week' || classType !== 'all' || status !== 'all' || searchTerm;

  const getStatusBadge = (hour: ClassHour) => {
    if (hour.status === 'scheduled') {
      return <Badge className="bg-blue-100 text-blue-800">Scheduled</Badge>;
    }
    
    if (hour.status === 'cancelled') {
      return <Badge className="bg-gray-100 text-gray-800">Cancelled</Badge>;
    }

    // For completed classes, show attendance status
    switch (hour.attendance_status) {
      case 'present':
        return <Badge className="bg-green-100 text-green-800">Present</Badge>;
      case 'absent':
        return <Badge className="bg-red-100 text-red-800">Absent</Badge>;
      case 'late':
        return <Badge className="bg-yellow-100 text-yellow-800">Late</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Completed</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'regular':
        return <Badge className="bg-gray-100 text-gray-800">Regular</Badge>;
      case 'makeup':
        return <Badge className="bg-yellow-100 text-yellow-800">Makeup</Badge>;
      case 'one-on-one':
        return <Badge className="bg-purple-100 text-purple-800">1-on-1</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div data-testid="loading-skeleton" className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-32 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with week navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Class Hours</h2>
          <p className="text-muted-foreground">
            {format(weekStart, 'MMMM d')} - {format(weekEnd, 'MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => setCurrentWeek(new Date())}
            aria-label="This week"
          >
            This Week
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div data-testid="hours-summary">
              <div className="text-2xl font-bold">{stats.totalHours.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                <span className="text-green-600">Completed</span>: {stats.completedHours.toFixed(1)} hrs
              </div>
              <div className="text-xs text-muted-foreground">
                <span className="text-blue-600">Scheduled</span>: {stats.scheduledHours.toFixed(1)} hrs
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div data-testid="attendance-stats">
              <div className="text-2xl font-bold">{stats.attendanceRate.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground mt-1">
                <span className="text-green-600">Present</span>: {stats.presentCount}
              </div>
              <div className="text-xs text-muted-foreground">
                <span className="text-red-600">Absent</span>: {stats.absentCount}
              </div>
              <div className="text-xs text-muted-foreground">
                Attendance Rate
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
            <div className="flex gap-2">
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear Filters
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>Export as Excel</DropdownMenuItem>
                  <DropdownMenuItem>Export as PDF</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label htmlFor="date-range" className="text-sm font-medium">
                Date Range
              </label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger id="date-range" aria-label="Date range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dateRangeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor="class-type" className="text-sm font-medium">
                Class Type
              </label>
              <Select value={classType} onValueChange={setClassType}>
                <SelectTrigger id="class-type" aria-label="Class type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {classTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor="status" className="text-sm font-medium">
                Status
              </label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status" aria-label="Status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor="search" className="text-sm font-medium">
                Search
              </label>
              <Input
                id="search"
                placeholder="Search by class or student..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Class Hours Table */}
      <Card>
        <CardHeader>
          <CardTitle>Class Hours ({filteredHours.length} results)</CardTitle>
          <CardDescription>
            Track your teaching hours and student attendance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredHours.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHours.map((hour) => (
                  <TableRow key={hour.id} aria-label={hour.class_name}>
                    <TableCell>{format(parseISO(hour.date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{hour.start_time} - {hour.end_time}</TableCell>
                    <TableCell>{hour.class_name}</TableCell>
                    <TableCell>{hour.student_name}</TableCell>
                    <TableCell>{hour.duration_minutes} min</TableCell>
                    <TableCell>{getTypeBadge(hour.type)}</TableCell>
                    <TableCell>{getStatusBadge(hour)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {hasActiveFilters
                  ? 'No class hours match your filters'
                  : 'No class hours found'}
              </h3>
              <p>
                {hasActiveFilters
                  ? 'Try adjusting your filters to see more results.'
                  : 'Your class hours will appear here once scheduled.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}