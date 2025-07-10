'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
// Tooltip components not available, using simple titles
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronLeft, ChevronRight, Calendar, List, Grid, Download, Printer, Globe, Users, Clock } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, subDays, isSameDay, parseISO, getHours, getMinutes, differenceInMinutes } from 'date-fns';
import { cn } from '@/lib/utils';

interface Student {
  id: string;
  full_name: string;
}

interface Course {
  title: string;
  course_type: string;
  level: string;
}

interface Class {
  id: string;
  class_name: string;
  course: Course;
  students: Student[];
  start_time: string;
  end_time: string;
  day_of_week: number;
  location: string;
  is_online: boolean;
  status: string;
}

interface WeeklyTimetableProps {
  teacherId: string;
  classes: Class[];
  isLoading?: boolean;
  onClassClick?: (classItem: Class) => void;
  onExport?: (format: string, data: any) => void;
}

type ViewMode = 'week' | 'day' | 'list';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIME_SLOTS = Array.from({ length: 15 }, (_, i) => i + 7); // 7 AM to 9 PM

const getCourseTypeColor = (courseType: string) => {
  switch (courseType) {
    case 'basic':
      return 'bg-blue-100 hover:bg-blue-200 text-blue-900';
    case 'business':
      return 'bg-green-100 hover:bg-green-200 text-green-900';
    case '1-on-1':
      return 'bg-purple-100 hover:bg-purple-200 text-purple-900';
    case 'everyday_a':
    case 'everyday_b':
      return 'bg-orange-100 hover:bg-orange-200 text-orange-900';
    case 'speak_up':
      return 'bg-pink-100 hover:bg-pink-200 text-pink-900';
    default:
      return 'bg-gray-100 hover:bg-gray-200 text-gray-900';
  }
};

const formatTime = (hour: number) => {
  if (hour === 12) return '12:00 PM';
  if (hour > 12) return `${hour - 12}:00 PM`;
  return `${hour}:00 AM`;
};

export function WeeklyTimetable({
  teacherId,
  classes,
  isLoading = false,
  onClassClick,
  onExport,
}: WeeklyTimetableProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [viewStatus, setViewStatus] = useState('');

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  // Filter classes for current week/day
  const filteredClasses = useMemo(() => {
    if (viewMode === 'day') {
      const dayOfWeek = currentDate.getDay() === 0 ? 7 : currentDate.getDay();
      return classes.filter(cls => {
        const classDate = parseISO(cls.start_time);
        return isSameDay(classDate, currentDate) || cls.day_of_week === dayOfWeek;
      });
    }
    
    return classes;
  }, [classes, currentDate, viewMode]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    const totalClasses = filteredClasses.length;
    const totalHours = filteredClasses.reduce((sum, cls) => {
      const duration = differenceInMinutes(parseISO(cls.end_time), parseISO(cls.start_time)) / 60;
      return sum + duration;
    }, 0);
    const totalStudents = filteredClasses.reduce((sum, cls) => sum + cls.students.length, 0);

    return { totalClasses, totalHours, totalStudents };
  }, [filteredClasses]);

  const handlePreviousWeek = () => {
    setCurrentDate(prev => subWeeks(prev, 1));
  };

  const handleNextWeek = () => {
    setCurrentDate(prev => addWeeks(prev, 1));
  };

  const handlePreviousDay = () => {
    setCurrentDate(prev => subDays(prev, 1));
  };

  const handleNextDay = () => {
    setCurrentDate(prev => addDays(prev, 1));
  };

  const handleThisWeek = () => {
    setCurrentDate(new Date());
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    setViewStatus(`Switched to ${mode} view`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = (format: string) => {
    if (onExport) {
      onExport(format, {
        classes: filteredClasses,
        startDate: weekStart,
        endDate: weekEnd,
        summary,
      });
    }
  };

  const renderClassBlock = (cls: Class) => {
    const startTime = parseISO(cls.start_time);
    const endTime = parseISO(cls.end_time);
    const startHour = getHours(startTime);
    const startMinute = getMinutes(startTime);
    const duration = differenceInMinutes(endTime, startTime);
    const height = (duration / 60) * 60; // 60px per hour
    const top = (startMinute / 60) * 60;

    const tooltipText = `${cls.course.title} - Level: ${cls.course.level} - Students: ${cls.students.map(s => s.full_name).join(', ')} - ${format(startTime, 'HH:mm')} - ${format(endTime, 'HH:mm')}`;

    return (
      <div
        key={cls.id}
        data-testid={`class-${cls.id}`}
        className={cn(
          'absolute left-0 right-0 p-2 m-1 rounded cursor-pointer transition-all',
          getCourseTypeColor(cls.course.course_type)
        )}
        style={{
          top: `${top}px`,
          height: `${height - 8}px`,
          minHeight: '40px',
        }}
        title={tooltipText}
        onClick={() => onClassClick?.(cls)}
      >
        <div className="text-xs font-medium">{cls.class_name}</div>
        <div className="text-xs opacity-75">{cls.location}</div>
        <div className="text-xs opacity-75">
          {cls.students.length} {cls.students.length === 1 ? 'student' : 'students'}
        </div>
        {cls.is_online && (
          <Globe className="h-3 w-3 mt-1" data-testid="online-indicator" />
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div data-testid="timetable-skeleton" className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6" role="region" aria-label="Weekly Timetable">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Weekly Timetable</CardTitle>
              <CardDescription>
                {viewMode === 'week' && `${format(weekStart, 'MMMM d')} - ${format(weekEnd, 'MMMM d, yyyy')}`}
                {viewMode === 'day' && format(currentDate, 'EEEE, MMMM d, yyyy')}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* Navigation */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={viewMode === 'week' ? handlePreviousWeek : handlePreviousDay}
                  aria-label={viewMode === 'week' ? 'Previous week' : 'Previous day'}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleThisWeek}
                >
                  This Week
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={viewMode === 'week' ? handleNextWeek : handleNextDay}
                  aria-label={viewMode === 'week' ? 'Next week' : 'Next day'}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-1">
                <Button
                  variant={viewMode === 'week' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleViewModeChange('week')}
                >
                  <Calendar className="h-4 w-4 mr-1" />
                  Week View
                </Button>
                <Button
                  variant={viewMode === 'day' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleViewModeChange('day')}
                >
                  <Grid className="h-4 w-4 mr-1" />
                  Day View
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleViewModeChange('list')}
                >
                  <List className="h-4 w-4 mr-1" />
                  List View
                </Button>
              </div>

              {/* Actions */}
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
              >
                <Printer className="h-4 w-4 mr-1" />
                Print
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleExport('pdf')}>
                    Export as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('image')}>
                    Export as Image
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('excel')}>
                    Export as Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Statistics */}
      <div className="grid gap-4 md:grid-cols-3" data-testid="weekly-summary">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalClasses}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalHours.toFixed(1)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalStudents}</div>
          </CardContent>
        </Card>
      </div>

      {/* Timetable Views */}
      {viewMode === 'week' && (
        <Card>
          <CardContent className="p-0">
            {filteredClasses.length > 0 ? (
              <div className="overflow-x-auto">
                <div className="min-w-[800px]" role="grid">
                {/* Header */}
                <div className="grid grid-cols-8 border-b">
                  <div className="p-4 text-sm font-medium text-muted-foreground">Time</div>
                  {DAYS_OF_WEEK.map((day, index) => (
                    <div key={day} className="p-4 text-sm font-medium text-center border-l">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Time Slots */}
                {TIME_SLOTS.map(hour => {
                  const daySlots = DAYS_OF_WEEK.map((_, dayIndex) => {
                    const dayClasses = filteredClasses.filter(cls => {
                      const classHour = getHours(parseISO(cls.start_time));
                      const classDayOfWeek = cls.day_of_week === 0 ? 7 : cls.day_of_week;
                      return classHour === hour && classDayOfWeek === dayIndex + 1;
                    });
                    return dayClasses;
                  });

                  return (
                    <div key={hour} className="grid grid-cols-8 border-b">
                      <div className="p-4 text-sm text-muted-foreground">
                        {formatTime(hour)}
                      </div>
                      {daySlots.map((classes, dayIndex) => (
                        <div key={`${hour}-${dayIndex}`} className="relative border-l h-16">
                          {classes.map(cls => renderClassBlock(cls))}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium">No classes scheduled</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Your scheduled classes will appear here
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {viewMode === 'day' && (
        <Card>
          <CardContent className="p-0">
            {filteredClasses.length > 0 ? (
              <div className="overflow-x-auto">
                <div className="min-w-[400px]" role="grid">
                  {/* Header */}
                  <div className="grid grid-cols-2 border-b">
                    <div className="p-4 text-sm font-medium text-muted-foreground">Time</div>
                    <div className="p-4 text-sm font-medium text-center border-l">
                      {format(currentDate, 'EEEE')}
                    </div>
                  </div>

                  {/* Time Slots */}
                  {TIME_SLOTS.map(hour => {
                    const hourClasses = filteredClasses.filter(cls => {
                      const classHour = getHours(parseISO(cls.start_time));
                      return classHour === hour;
                    });

                    return (
                      <div key={hour} className="grid grid-cols-2 border-b">
                        <div className="p-4 text-sm text-muted-foreground">
                          {formatTime(hour)}
                        </div>
                        <div className="relative border-l h-16">
                          {hourClasses.map(cls => renderClassBlock(cls))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium">No classes scheduled for this day</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Try navigating to a different day
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {viewMode === 'list' && (
        <Card>
          <CardContent>
            {filteredClasses.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClasses
                    .sort((a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime())
                    .map(cls => (
                      <TableRow
                        key={cls.id}
                        className="cursor-pointer hover:bg-accent"
                        onClick={() => onClassClick?.(cls)}
                      >
                        <TableCell>{format(parseISO(cls.start_time), 'MMM d, yyyy')}</TableCell>
                        <TableCell>
                          {format(parseISO(cls.start_time), 'HH:mm')} - {format(parseISO(cls.end_time), 'HH:mm')}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{cls.class_name}</div>
                            <div className="text-sm text-muted-foreground">{cls.course.title}</div>
                          </div>
                        </TableCell>
                        <TableCell>{cls.students.length}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {cls.location}
                            {cls.is_online && <Globe className="h-4 w-4" />}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium">No classes scheduled</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Your scheduled classes will appear here
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Status message for screen readers */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {viewStatus}
      </div>
    </div>
  );
}