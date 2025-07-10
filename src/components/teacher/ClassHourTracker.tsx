'use client';

// Export the enhanced version
export { ClassHourTracker } from './ClassHourTrackerEnhanced';

// Keep the old implementation as ClassHourTrackerLegacy for backward compatibility

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, Calendar as CalendarIcon, Filter, Download, TrendingUp } from 'lucide-react';
import { format, parseISO, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';

interface ClassHourTrackerProps {
  teacher: any;
  classHours: any[];
  availability: any[];
}

export function ClassHourTrackerLegacy({ teacher, classHours, availability }: ClassHourTrackerProps) {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCourse, setFilterCourse] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: startOfWeek(new Date()),
    to: endOfWeek(new Date()),
  });
  const [searchStudent, setSearchStudent] = useState('');

  // Filter and process class hours
  const filteredHours = useMemo(() => {
    return classHours.filter(hour => {
      // Status filter
      if (filterStatus !== 'all') {
        const status = hour.attendance?.[0]?.status || 'scheduled';
        if (status !== filterStatus) return false;
      }

      // Course filter
      if (filterCourse !== 'all') {
        if (hour.class?.course?.course_type !== filterCourse) return false;
      }

      // Date range filter
      if (dateRange.from && dateRange.to) {
        const hourDate = parseISO(hour.start_time);
        if (!isWithinInterval(hourDate, { start: dateRange.from, end: dateRange.to })) {
          return false;
        }
      }

      // Student search filter
      if (searchStudent) {
        const studentName = hour.student?.full_name?.toLowerCase() || '';
        if (!studentName.includes(searchStudent.toLowerCase())) return false;
      }

      return true;
    });
  }, [classHours, filterStatus, filterCourse, dateRange, searchStudent]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalHours = filteredHours.reduce((sum, hour) => {
      const duration = hour.class?.course?.duration_minutes || 60;
      return sum + (duration / 60);
    }, 0);

    const completedHours = filteredHours
      .filter(hour => hour.attendance?.[0]?.status === 'present')
      .reduce((sum, hour) => {
        const duration = hour.class?.course?.duration_minutes || 60;
        return sum + (duration / 60);
      }, 0);

    const cancelledHours = filteredHours
      .filter(hour => hour.status === 'cancelled')
      .reduce((sum, hour) => {
        const duration = hour.class?.course?.duration_minutes || 60;
        return sum + (duration / 60);
      }, 0);

    const upcomingHours = filteredHours
      .filter(hour => new Date(hour.start_time) > new Date())
      .reduce((sum, hour) => {
        const duration = hour.class?.course?.duration_minutes || 60;
        return sum + (duration / 60);
      }, 0);

    return {
      total: totalHours,
      completed: completedHours,
      cancelled: cancelledHours,
      upcoming: upcomingHours,
      attendanceRate: totalHours > 0 ? Math.round((completedHours / totalHours) * 100) : 0,
    };
  }, [filteredHours]);

  // Get unique course types for filter
  const courseTypes = useMemo(() => {
    const types = new Set(classHours.map(hour => hour.class?.course?.course_type).filter(Boolean));
    return Array.from(types);
  }, [classHours]);

  const getStatusBadge = (hour: any) => {
    const status = hour.attendance?.[0]?.status || 'scheduled';
    const isUpcoming = new Date(hour.start_time) > new Date();
    
    if (hour.status === 'cancelled') {
      return <Badge variant="destructive">Cancelled</Badge>;
    }
    
    if (isUpcoming) {
      return <Badge variant="outline">Upcoming</Badge>;
    }
    
    switch (status) {
      case 'present':
        return <Badge variant="default">Completed</Badge>;
      case 'absent':
        return <Badge variant="destructive">Absent</Badge>;
      case 'late':
        return <Badge variant="secondary">Late</Badge>;
      default:
        return <Badge variant="outline">Scheduled</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">
              In selected period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">
              Teaching completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcoming.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">
              Scheduled ahead
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.attendanceRate}%</div>
            <p className="text-xs text-muted-foreground">
              Student attendance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Student Search</label>
              <Input
                placeholder="Search by student name..."
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="present">Completed</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Course Type</label>
              <Select value={filterCourse} onValueChange={setFilterCourse}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {courseTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd")} -{" "}
                          {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      "Pick a date range"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilterStatus('all');
                setFilterCourse('all');
                setSearchStudent('');
                setDateRange({
                  from: startOfWeek(new Date()),
                  to: endOfWeek(new Date()),
                });
              }}
            >
              Clear Filters
            </Button>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Class Hours List */}
      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Hours List</TabsTrigger>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Class Hours ({filteredHours.length} results)</CardTitle>
              <CardDescription>
                Detailed view of your teaching hours with attendance tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredHours.length > 0 ? (
                  filteredHours.map((hour) => (
                    <div key={hour.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-grow">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium">
                            {hour.class?.class_name || hour.class?.course?.title}
                          </h3>
                          <Badge variant="outline">
                            {hour.class?.course?.course_type}
                          </Badge>
                          {getStatusBadge(hour)}
                        </div>
                        
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p><strong>Student:</strong> {hour.student?.full_name}</p>
                          <p><strong>Date & Time:</strong> {format(parseISO(hour.start_time), 'PPP p')}</p>
                          <p><strong>Duration:</strong> {hour.class?.course?.duration_minutes || 60} minutes</p>
                          {hour.attendance?.[0] && (
                            <p><strong>Attendance:</strong> {hour.attendance[0].status} 
                              {hour.attendance[0].attendance_time && 
                                ` at ${format(parseISO(hour.attendance[0].attendance_time), 'p')}`
                              }
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-lg font-semibold">
                          {((hour.class?.course?.duration_minutes || 60) / 60).toFixed(1)}h
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {hour.class?.course?.course_type}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No class hours found</h3>
                    <p>Try adjusting your filters or date range to see more results.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Calendar View</CardTitle>
              <CardDescription>
                Visual calendar showing your class schedule and hours
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-foreground mb-2">Calendar View Coming Soon</h3>
                <p>Interactive calendar view with drag-and-drop functionality will be available in the next update.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}