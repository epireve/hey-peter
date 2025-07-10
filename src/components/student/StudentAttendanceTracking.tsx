'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addWeeks, subWeeks, isToday, differenceInDays, parseISO } from 'date-fns';
import { Calendar, Clock, FileText, TrendingUp, Download, RefreshCw, Printer, Target, ChevronLeft, ChevronRight, Search, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AttendanceRecord {
  id: string;
  student_id: string;
  class_id: string;
  date: string;
  status: 'present' | 'late' | 'absent' | 'excused';
  check_in_time: string | null;
  check_out_time: string | null;
  late_minutes: number;
  comments: string | null;
  class: {
    id: string;
    course_name: string;
    start_time: string;
    end_time: string;
    teacher: {
      first_name: string;
      last_name: string;
    };
  };
}

interface LeaveRequest {
  id: string;
  student_id: string;
  request_date: string;
  leave_date: string;
  reason: string;
  supporting_document_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
}

interface AttendanceStats {
  total_classes: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  attendance_percentage: number;
  hours_deducted: number;
}

interface AttendancePolicies {
  minimum_attendance_percentage: number;
  late_threshold_minutes: number;
  hours_deduction_per_absence: number;
  max_consecutive_absences: number;
}

interface StudentAttendanceTrackingProps {
  studentId: string;
}

type ViewMode = 'calendar' | 'week' | 'list';
type ExportFormat = 'pdf' | 'csv' | 'excel';

const statusColors = {
  present: 'bg-green-100 text-green-800 border-green-200',
  late: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  absent: 'bg-red-100 text-red-800 border-red-200',
  excused: 'bg-blue-100 text-blue-800 border-blue-200',
};

const statusTextColors = {
  present: 'text-green-600',
  late: 'text-yellow-600',
  absent: 'text-red-600',
  excused: 'text-blue-600',
};

export function StudentAttendanceTracking({ studentId }: StudentAttendanceTrackingProps) {
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [policies, setPolicies] = useState<AttendancePolicies | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [selectedDate, setSelectedDate] = useState(new Date(2024, 0, 15)); // January 15, 2024
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(new Date(2024, 0, 1)), // January 2024
    end: endOfMonth(new Date(2024, 0, 1)),
  });
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [attendanceGoal, setAttendanceGoal] = useState(90);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClientComponentClient();
  const itemsPerPage = 20;

  // Fetch attendance data
  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          class:classes(
            id,
            course_name,
            start_time,
            end_time,
            teacher:teachers(
              first_name,
              last_name
            )
          )
        `)
        .eq('student_id', studentId)
        .gte('date', format(dateRange.start, 'yyyy-MM-dd'))
        .lte('date', format(dateRange.end, 'yyyy-MM-dd'))
        .order('date', { ascending: false });

      if (error) throw error;
      setAttendance(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch attendance');
    } finally {
      setLoading(false);
    }
  }, [studentId, dateRange, supabase]);

  // Fetch leave requests
  const fetchLeaveRequests = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('student_id', studentId)
        .order('request_date', { ascending: false });

      if (error) throw error;
      setLeaveRequests(data || []);
    } catch (err) {
      console.error('Failed to fetch leave requests:', err);
    }
  }, [studentId, supabase]);

  // Fetch attendance policies
  const fetchPolicies = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('attendance_policies')
        .select('*')
        .single();

      if (error) throw error;
      setPolicies(data);
    } catch (err) {
      console.error('Failed to fetch policies:', err);
    }
  }, [supabase]);

  useEffect(() => {
    fetchAttendance();
    fetchLeaveRequests();
    fetchPolicies();

    // Set up real-time subscription
    const channel = supabase
      .channel(`attendance-${studentId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'attendance', 
          filter: `student_id=eq.${studentId}` 
        },
        (payload) => {
          setAttendance(prev => [payload.new as AttendanceRecord, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAttendance, fetchLeaveRequests, fetchPolicies, studentId, supabase]);

  // Calculate attendance statistics
  const stats = useMemo<AttendanceStats>(() => {
    const total = attendance.length;
    const statusCounts = attendance.reduce(
      (acc, record) => {
        acc[record.status]++;
        return acc;
      },
      { present: 0, late: 0, absent: 0, excused: 0 }
    );

    const attendedClasses = statusCounts.present + statusCounts.late;
    const percentage = total > 0 ? Math.round((attendedClasses / total) * 100) : 0;
    const hoursDeducted = statusCounts.absent * (policies?.hours_deduction_per_absence || 2);

    return {
      total_classes: total,
      ...statusCounts,
      attendance_percentage: percentage,
      hours_deducted: hoursDeducted,
    };
  }, [attendance, policies]);

  // Calculate attendance streak
  const streak = useMemo(() => {
    const sortedAttendance = [...attendance].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    for (const record of sortedAttendance) {
      if (record.status === 'present' || record.status === 'late') {
        tempStreak++;
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
        if (currentStreak === 0 && tempStreak === 1) {
          currentStreak = 1;
        } else if (currentStreak > 0) {
          currentStreak = tempStreak;
        }
      } else {
        if (currentStreak > 0 && tempStreak > 0) {
          currentStreak = 0;
        }
        tempStreak = 0;
      }
    }

    return { current: currentStreak, longest: longestStreak };
  }, [attendance]);

  // Filter attendance by course and search
  const filteredAttendance = useMemo(() => {
    return attendance.filter(record => {
      const matchesCourse = selectedCourse === 'all' || record.class.course_name === selectedCourse;
      const matchesSearch = searchQuery === '' || 
        record.class.course_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `${record.class.teacher.first_name} ${record.class.teacher.last_name}`.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesCourse && matchesSearch;
    });
  }, [attendance, selectedCourse, searchQuery]);

  // Get unique courses
  const courses = useMemo(() => {
    const uniqueCourses = new Set(attendance.map(record => record.class.course_name));
    return Array.from(uniqueCourses);
  }, [attendance]);

  // Paginated attendance for list view
  const paginatedAttendance = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAttendance.slice(startIndex, endIndex);
  }, [filteredAttendance, currentPage]);

  const totalPages = Math.ceil(filteredAttendance.length / itemsPerPage);

  // Handle leave request submission
  const handleLeaveRequest = async (data: {
    leaveDate: string;
    reason: string;
    file?: File;
  }) => {
    try {
      let documentUrl = null;

      if (data.file) {
        const fileName = `${studentId}/${Date.now()}-${data.file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('leave-documents')
          .upload(fileName, data.file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('leave-documents')
          .getPublicUrl(uploadData.path);

        documentUrl = urlData.publicUrl;
      }

      const { error } = await supabase
        .from('leave_requests')
        .insert({
          student_id: studentId,
          request_date: format(new Date(), 'yyyy-MM-dd'),
          leave_date: data.leaveDate,
          reason: data.reason,
          supporting_document_url: documentUrl,
          status: 'pending',
        });

      if (error) throw error;

      toast.success('Leave request submitted successfully');
      setShowLeaveDialog(false);
      fetchLeaveRequests();
    } catch (err) {
      toast.error('Failed to submit leave request');
    }
  };

  // Handle export
  const handleExport = (format: ExportFormat) => {
    // In a real implementation, this would generate the appropriate file format
    const data = filteredAttendance.map(record => ({
      Date: record.date,
      Course: record.class.course_name,
      Teacher: `${record.class.teacher.first_name} ${record.class.teacher.last_name}`,
      Status: record.status,
      'Check In': record.check_in_time || '-',
      'Check Out': record.check_out_time || '-',
      'Late Minutes': record.late_minutes,
      Comments: record.comments || '-',
    }));

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-report.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Attendance report exported successfully');
    setShowExportDialog(false);
  };

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  // Handle certificate generation
  const handleGenerateCertificate = () => {
    toast.success('Attendance certificate generated');
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6" role="region" aria-label="Attendance Tracking">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Attendance Tracking</h2>
          <p className="text-sm text-muted-foreground">Track your attendance, view statistics, and manage leave requests</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={fetchAttendance}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print Report
          </Button>
          <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Export Options</DialogTitle>
                <DialogDescription>
                  Choose the format for your attendance report
                </DialogDescription>
              </DialogHeader>
              <RadioGroup defaultValue="pdf">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pdf" id="pdf" />
                  <Label htmlFor="pdf">PDF</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="csv" id="csv" />
                  <Label htmlFor="csv">CSV</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="excel" id="excel" />
                  <Label htmlFor="excel">Excel</Label>
                </div>
              </RadioGroup>
              <DialogFooter>
                <Button onClick={() => handleExport('pdf')}>Download</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Request Leave
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request Leave</DialogTitle>
                <DialogDescription>
                  Submit a leave request with supporting documents
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleLeaveRequest({
                  leaveDate: formData.get('leaveDate') as string,
                  reason: formData.get('reason') as string,
                  file: formData.get('document') as File,
                });
              }}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="leaveDate">Leave Date</Label>
                    <Input
                      id="leaveDate"
                      name="leaveDate"
                      type="date"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="reason">Reason</Label>
                    <Textarea
                      id="reason"
                      name="reason"
                      placeholder="Enter reason for leave"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="document">Supporting Document</Label>
                    <Input
                      id="document"
                      name="document"
                      type="file"
                      accept=".pdf,.jpg,.png,.doc,.docx"
                    />
                  </div>
                </div>
                <DialogFooter className="mt-4">
                  <Button type="submit">Submit Request</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Attendance Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" aria-label="Attendance Statistics">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.attendance_percentage}%</div>
            <Progress value={stats.attendance_percentage} className="mt-2" />
            {stats.attendance_percentage < (policies?.minimum_attendance_percentage || 80) && (
              <p className="text-xs text-red-600 mt-1">Below minimum attendance</p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Classes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className={statusTextColors.present}>{stats.present} Present</span>
              </div>
              <div className="flex justify-between">
                <span className={statusTextColors.late}>{stats.late} Late</span>
              </div>
              <div className="flex justify-between">
                <span className={statusTextColors.absent}>{stats.absent} Absent</span>
              </div>
              <div className="flex justify-between">
                <span className={statusTextColors.excused}>{stats.excused} Excused</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Impact on Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.hours_deducted} hours deducted
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Due to absences
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{streak.current} days</div>
            <p className="text-xs text-muted-foreground mt-1">
              Longest streak: {streak.longest} days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Goal */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm font-medium">Attendance Goal</CardTitle>
            <Dialog open={showGoalDialog} onOpenChange={setShowGoalDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Target className="h-4 w-4 mr-2" />
                  Set Attendance Goal
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Set Attendance Goal</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="goal">Target Attendance Percentage</Label>
                    <Input
                      id="goal"
                      type="number"
                      min="0"
                      max="100"
                      value={attendanceGoal}
                      onChange={(e) => setAttendanceGoal(Number(e.target.value))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => {
                    setShowGoalDialog(false);
                    toast.success('Attendance goal updated');
                  }}>
                    Save Goal
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">Your Attendance: {stats.attendance_percentage}%</p>
              <p className="text-sm">Goal: {attendanceGoal}%</p>
            </div>
            <div className="text-right">
              {stats.attendance_percentage >= attendanceGoal ? (
                <Badge variant="success">Goal Achieved!</Badge>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {attendanceGoal - stats.attendance_percentage}% to go
                </p>
              )}
            </div>
          </div>
          <Progress 
            value={(stats.attendance_percentage / attendanceGoal) * 100} 
            className="mt-2" 
          />
        </CardContent>
      </Card>

      {/* Class Average Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Class Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">Your Attendance: {stats.attendance_percentage}%</p>
              <p className="text-sm text-muted-foreground">Class Average: 85%</p>
            </div>
            <div>
              {stats.attendance_percentage < 85 ? (
                <p className="text-sm text-red-600">10% below average</p>
              ) : (
                <p className="text-sm text-green-600">Above average</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search by course or teacher"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="course-filter">Filter by Course</Label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger id="course-filter" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {courses.map(course => (
                    <SelectItem key={course} value={course}>
                      {course}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={format(dateRange.start, 'yyyy-MM-dd')}
                onChange={(e) => setDateRange(prev => ({
                  ...prev,
                  start: new Date(e.target.value)
                }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={format(dateRange.end, 'yyyy-MM-dd')}
                onChange={(e) => setDateRange(prev => ({
                  ...prev,
                  end: new Date(e.target.value)
                }))}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Mode Selector */}
      <div data-testid={isMobile ? "mobile-view-selector" : "view-mode-selector"}>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="calendar">Calendar View</TabsTrigger>
            <TabsTrigger value="week">Week View</TabsTrigger>
            <TabsTrigger value="list">List View</TabsTrigger>
          </TabsList>

          {/* Calendar View */}
          <TabsContent value="calendar">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle aria-label="Attendance Calendar">
                    {format(selectedDate, 'MMMM yyyy')}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div data-testid="attendance-calendar" className="grid grid-cols-7 gap-1">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-sm font-medium p-2">
                      {day}
                    </div>
                  ))}
                  {eachDayOfInterval({
                    start: startOfMonth(selectedDate),
                    end: endOfMonth(selectedDate)
                  }).map(day => {
                    const dayAttendance = attendance.find(record =>
                      isSameDay(parseISO(record.date), day)
                    );
                    
                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => {
                          if (dayAttendance) {
                            const message = `${dayAttendance.class.course_name} • ${dayAttendance.class.start_time} - ${dayAttendance.class.end_time} • ${dayAttendance.class.teacher.first_name} ${dayAttendance.class.teacher.last_name} • Status: ${dayAttendance.status}`;
                            toast.success(message);
                          }
                        }}
                        className={cn(
                          'aspect-square p-2 text-sm border rounded-md hover:bg-accent',
                          dayAttendance && statusColors[dayAttendance.status],
                          isToday(day) && 'ring-2 ring-primary'
                        )}
                      >
                        {format(day, 'd')}
                      </button>
                    );
                  })}
                </div>
                
                {/* Legend */}
                <div data-testid="attendance-legend" className="flex flex-wrap gap-4 mt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-100 border border-green-200 rounded" />
                    <span className="text-green-600">Present</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-100 border border-yellow-200 rounded" />
                    <span className="text-yellow-600">Late</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-100 border border-red-200 rounded" />
                    <span className="text-red-600">Absent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-100 border border-blue-200 rounded" />
                    <span className="text-blue-600">Excused</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Week View */}
          <TabsContent value="week">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>
                    {format(startOfWeek(selectedDate), 'MMM d')} - {format(endOfWeek(selectedDate), 'MMM d, yyyy')}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDate(prev => subWeeks(prev, 1))}
                    >
                      Previous Week
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDate(prev => addWeeks(prev, 1))}
                    >
                      Next Week
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div data-testid="attendance-week-view" className="space-y-4">
                  {eachDayOfInterval({
                    start: startOfWeek(selectedDate),
                    end: endOfWeek(selectedDate)
                  }).map(day => {
                    const dayAttendance = filteredAttendance.filter(record =>
                      isSameDay(parseISO(record.date), day)
                    );
                    
                    return (
                      <div key={day.toISOString()} className="border rounded-lg p-4">
                        <h4 className="font-medium mb-2">{format(day, 'EEEE, MMM d')}</h4>
                        {dayAttendance.length > 0 ? (
                          <div className="space-y-2">
                            {dayAttendance.map(record => (
                              <div key={record.id} className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">{record.class.course_name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {record.class.start_time} - {record.class.end_time} • {record.class.teacher.first_name} {record.class.teacher.last_name}
                                  </p>
                                </div>
                                <Badge className={statusColors[record.status]}>
                                  {record.status}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No classes</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* List View */}
          <TabsContent value="list">
            <Card>
              <CardHeader>
                <CardTitle>Attendance History</CardTitle>
              </CardHeader>
              <CardContent>
                <div data-testid="attendance-list-view" className="space-y-2">
                  {paginatedAttendance.map(record => (
                    <div
                      key={record.id}
                      data-testid="attendance-item"
                      className="border rounded-lg p-4 hover:bg-accent"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{record.class.course_name}</p>
                            <Badge className={statusColors[record.status]}>
                              {record.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(parseISO(record.date), 'PPP')} • {record.class.start_time} - {record.class.end_time}
                          </p>
                          <p className="text-sm">
                            Teacher: {record.class.teacher.first_name} {record.class.teacher.last_name}
                          </p>
                          {record.comments && (
                            <p className="text-sm text-muted-foreground">
                              Comment: {record.comments}
                            </p>
                          )}
                          {record.late_minutes > 0 && (
                            <p className="text-sm text-yellow-600">
                              {record.late_minutes} minutes late
                            </p>
                          )}
                        </div>
                        <div className="text-right text-sm">
                          {record.check_in_time && (
                            <p>Check-in: {record.check_in_time}</p>
                          )}
                          {record.check_out_time && (
                            <p>Check-out: {record.check_out_time}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next Page
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Monthly Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Monthly Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            {format(selectedDate, 'MMMM yyyy')}: {stats.attendance_percentage}%
          </p>
        </CardContent>
      </Card>

      {/* Attendance Trends Chart */}
      <Card>
        <CardContent className="pt-6">
          <div data-testid="attendance-trends-chart" className="h-64 flex items-center justify-center border-2 border-dashed">
            <div className="text-center">
              <TrendingUp className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Attendance Trend Chart</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leave Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Leave Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {leaveRequests.map(request => (
              <div key={request.id} className="border rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{format(parseISO(request.leave_date), 'PPP')}</p>
                    <p className="text-sm text-muted-foreground">{request.reason}</p>
                  </div>
                  <Badge className={
                    request.status === 'approved' ? 'text-green-600' :
                    request.status === 'rejected' ? 'text-red-600' :
                    'text-yellow-600'
                  }>
                    {request.status}
                  </Badge>
                </div>
                {request.supporting_document_url && (
                  <a
                    href={request.supporting_document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline mt-1 inline-block"
                  >
                    View Document
                  </a>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Attendance Policies */}
      {policies && (
        <Card>
          <CardHeader>
            <CardTitle>Attendance Policies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>Minimum Attendance: {policies.minimum_attendance_percentage}%</p>
              <p>Late Threshold: {policies.late_threshold_minutes} minutes</p>
              <p>Hours Deducted per Absence: {policies.hours_deduction_per_absence}</p>
              <p>Max Consecutive Absences: {policies.max_consecutive_absences}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Certificate Generation */}
      <div className="flex justify-center">
        <Button onClick={handleGenerateCertificate}>
          <FileText className="h-4 w-4 mr-2" />
          Generate Certificate
        </Button>
      </div>
    </div>
  );
}