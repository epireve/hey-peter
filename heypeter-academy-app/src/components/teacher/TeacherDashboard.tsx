'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, BookOpen, TrendingUp, DollarSign } from 'lucide-react';

interface TeacherDashboardProps {
  teacher: any;
  upcomingBookings: any[];
  recentAttendance: any[];
}

export function TeacherDashboard({ teacher, upcomingBookings, recentAttendance }: TeacherDashboardProps) {
  // Calculate dashboard metrics
  const totalClasses = teacher.classes?.length || 0;
  const totalEnrolledStudents = teacher.classes?.reduce((sum: number, cls: any) => sum + (cls.current_enrollment || 0), 0) || 0;
  const attendanceRate = recentAttendance.length > 0 
    ? Math.round((recentAttendance.filter((a: any) => a.status === 'present').length / recentAttendance.length) * 100)
    : 0;

  // Calculate total teaching hours this week
  const weeklyHours = upcomingBookings.reduce((sum: number, booking: any) => {
    const duration = booking.class?.course?.duration_minutes || 60;
    return sum + (duration / 60);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold">Welcome back, {teacher.full_name}!</h1>
        <p className="text-blue-100 mt-2">
          Here's what's happening in your classes today
        </p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Classes</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClasses}</div>
            <p className="text-xs text-muted-foreground">
              Classes you're teaching
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEnrolledStudents}</div>
            <p className="text-xs text-muted-foreground">
              Enrolled across all classes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week's Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{weeklyHours.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              Teaching hours scheduled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceRate}%</div>
            <p className="text-xs text-muted-foreground">
              Recent class attendance
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Upcoming Classes */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Classes</CardTitle>
            <CardDescription>
              Your next {upcomingBookings.length} scheduled classes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingBookings.length > 0 ? (
                upcomingBookings.map((booking: any) => (
                  <div key={booking.id} className="flex items-center space-x-4 p-3 rounded-lg border">
                    <div className="flex-shrink-0">
                      <Calendar className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {booking.class?.class_name || booking.class?.course?.title}
                      </p>
                      <p className="text-sm text-gray-500">
                        {booking.student?.full_name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(booking.start_time).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <Badge variant="outline">
                        {booking.class?.course?.course_type}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No upcoming classes scheduled</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest attendance records from your classes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentAttendance.length > 0 ? (
                recentAttendance.slice(0, 5).map((attendance: any) => (
                  <div key={attendance.id} className="flex items-center space-x-4 p-3 rounded-lg border">
                    <div className="flex-shrink-0">
                      <div className={`h-3 w-3 rounded-full ${
                        attendance.status === 'present' ? 'bg-green-500' :
                        attendance.status === 'absent' ? 'bg-red-500' :
                        attendance.status === 'late' ? 'bg-yellow-500' :
                        'bg-gray-500'
                      }`} />
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {attendance.booking?.student?.full_name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {attendance.booking?.class?.class_name || attendance.booking?.class?.course?.title}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(attendance.attendance_time).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <Badge 
                        variant={attendance.status === 'present' ? 'default' : 'destructive'}
                      >
                        {attendance.status}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No recent attendance records</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* My Classes Overview */}
      <Card>
        <CardHeader>
          <CardTitle>My Classes</CardTitle>
          <CardDescription>
            Overview of all classes you're currently teaching
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {teacher.classes && teacher.classes.length > 0 ? (
              teacher.classes.map((cls: any) => (
                <div key={cls.id} className="p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">
                      {cls.class_name || cls.course?.title}
                    </h3>
                    <Badge variant="outline">
                      {cls.course?.course_type}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>
                      <span className="font-medium">Students:</span> {cls.current_enrollment}/{cls.capacity}
                    </p>
                    <p>
                      <span className="font-medium">Duration:</span> {cls.course?.duration_minutes || 60} minutes
                    </p>
                  </div>
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(cls.current_enrollment / cls.capacity) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {Math.round((cls.current_enrollment / cls.capacity) * 100)}% full
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-8 text-gray-500">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Classes Yet</h3>
                <p>You haven't been assigned to any classes yet. Contact admin for class assignments.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks for managing your classes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <a
              href="/teacher/schedule"
              className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Calendar className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h3 className="font-medium text-gray-900">View Schedule</h3>
                <p className="text-sm text-gray-600">See your weekly timetable</p>
              </div>
            </a>
            
            <a
              href="/teacher/availability"
              className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <Clock className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <h3 className="font-medium text-gray-900">Set Availability</h3>
                <p className="text-sm text-gray-600">Update your time slots</p>
              </div>
            </a>
            
            <a
              href="/teacher/students"
              className="flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <Users className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <h3 className="font-medium text-gray-900">My Students</h3>
                <p className="text-sm text-gray-600">View student progress</p>
              </div>
            </a>
            
            <a
              href="/teacher/compensation"
              className="flex items-center p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
            >
              <DollarSign className="h-8 w-8 text-yellow-600 mr-3" />
              <div>
                <h3 className="font-medium text-gray-900">Compensation</h3>
                <p className="text-sm text-gray-600">View earnings & payments</p>
              </div>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}