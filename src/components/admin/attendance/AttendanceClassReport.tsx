'use client';

import { logger } from '@/lib/services';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  ChevronRight, 
  Users, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  User,
  GraduationCap
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { 
  attendanceAnalyticsService, 
  AttendanceFilters, 
  AttendanceClassSummary 
} from '@/lib/services/attendance-analytics-service';

interface AttendanceClassReportProps {
  filters: AttendanceFilters;
}

export function AttendanceClassReport({ filters }: AttendanceClassReportProps) {
  const [loading, setLoading] = useState(false);
  const [classReports, setClassReports] = useState<AttendanceClassSummary[]>([]);
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadClassReports();
  }, [filters]);

  const loadClassReports = async () => {
    try {
      setLoading(true);
      const reports = await attendanceAnalyticsService.getAttendanceByClass(filters);
      setClassReports(reports);
    } catch (error) {
      logger.error('Error loading class reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleClassExpansion = (classId: string) => {
    setExpandedClasses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(classId)) {
        newSet.delete(classId);
      } else {
        newSet.add(classId);
      }
      return newSet;
    });
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

  if (classReports.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-muted-foreground">No class attendance data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Attendance by Class
          </CardTitle>
          <CardDescription>
            Detailed attendance reports for each class, including student-level breakdown
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {classReports.map((classReport) => (
              <Collapsible key={classReport.classId}>
                <Card>
                  <CollapsibleTrigger 
                    className="w-full"
                    onClick={() => toggleClassExpansion(classReport.classId)}
                  >
                    <CardHeader className="hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {expandedClasses.has(classReport.classId) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <div className="text-left">
                            <CardTitle className="text-lg">{classReport.className}</CardTitle>
                            <CardDescription className="flex items-center gap-4">
                              <Badge variant="secondary">{classReport.courseType}</Badge>
                              <span className="flex items-center gap-1">
                                <GraduationCap className="h-3 w-3" />
                                {classReport.teacher.fullName}
                              </span>
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className={`text-2xl font-bold ${getAttendanceRateColor(classReport.attendanceRate)}`}>
                              {formatPercentage(classReport.attendanceRate)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {classReport.attendedSessions}/{classReport.totalSessions} sessions
                            </div>
                          </div>
                          <Badge className={`${getAttendanceRateBadge(classReport.attendanceRate)}`}>
                            {classReport.attendanceRate >= 90 ? 'Excellent' : 
                             classReport.attendanceRate >= 75 ? 'Good' : 'Poor'}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      {/* Class Summary Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="text-center">
                          <div className="text-lg font-semibold text-green-600">
                            {classReport.attendedSessions}
                          </div>
                          <div className="text-sm text-muted-foreground">Present</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-red-600">
                            {classReport.absentSessions}
                          </div>
                          <div className="text-sm text-muted-foreground">Absent</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-yellow-600">
                            {classReport.lateSessions}
                          </div>
                          <div className="text-sm text-muted-foreground">Late</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-blue-600">
                            {classReport.excusedSessions}
                          </div>
                          <div className="text-sm text-muted-foreground">Excused</div>
                        </div>
                      </div>

                      {/* Average Hours Deducted */}
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Average Hours Deducted</span>
                          <span className="text-sm font-bold">
                            {classReport.averageHoursDeducted.toFixed(2)} hrs
                          </span>
                        </div>
                      </div>

                      {/* Student Breakdown */}
                      <div>
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Student Attendance ({classReport.students.length} students)
                        </h4>
                        <div className="space-y-3">
                          {classReport.students.map((student) => (
                            <div key={student.studentId} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                              <div>
                                <div className="font-medium">{student.fullName}</div>
                                <div className="text-sm text-muted-foreground">
                                  {student.attendedSessions}/{student.totalSessions} sessions attended
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="w-24">
                                  <Progress 
                                    value={student.attendanceRate} 
                                    className="h-2" 
                                  />
                                </div>
                                <div className={`text-sm font-medium ${getAttendanceRateColor(student.attendanceRate)}`}>
                                  {formatPercentage(student.attendanceRate)}
                                </div>
                                <Badge 
                                  variant={student.attendanceRate >= 90 ? 'default' : 
                                          student.attendanceRate >= 75 ? 'secondary' : 'destructive'}
                                  className="text-xs"
                                >
                                  {student.attendanceRate >= 90 ? 'Excellent' : 
                                   student.attendanceRate >= 75 ? 'Good' : 'Poor'}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Class Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Class Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead>Course Type</TableHead>
                <TableHead>Teacher</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Sessions</TableHead>
                <TableHead>Attendance Rate</TableHead>
                <TableHead>Avg Hours Deducted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classReports.map((classReport) => (
                <TableRow key={classReport.classId}>
                  <TableCell className="font-medium">{classReport.className}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{classReport.courseType}</Badge>
                  </TableCell>
                  <TableCell>{classReport.teacher.fullName}</TableCell>
                  <TableCell>{classReport.students.length}</TableCell>
                  <TableCell>{classReport.totalSessions}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={getAttendanceRateColor(classReport.attendanceRate)}>
                        {formatPercentage(classReport.attendanceRate)}
                      </span>
                      {classReport.attendanceRate >= 75 ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{classReport.averageHoursDeducted.toFixed(2)} hrs</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}