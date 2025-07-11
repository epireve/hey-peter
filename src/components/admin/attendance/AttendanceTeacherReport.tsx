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
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  ChevronRight, 
  GraduationCap, 
  Users, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  Mail,
  BookOpen
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { 
  attendanceAnalyticsService, 
  AttendanceFilters, 
  AttendanceTeacherSummary 
} from '@/lib/services/attendance-analytics-service';

interface AttendanceTeacherReportProps {
  filters: AttendanceFilters;
}

export function AttendanceTeacherReport({ filters }: AttendanceTeacherReportProps) {
  const [loading, setLoading] = useState(false);
  const [teacherReports, setTeacherReports] = useState<AttendanceTeacherSummary[]>([]);
  const [expandedTeachers, setExpandedTeachers] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadTeacherReports();
  }, [filters]);

  const loadTeacherReports = async () => {
    try {
      setLoading(true);
      const reports = await attendanceAnalyticsService.getAttendanceByTeacher(filters);
      setTeacherReports(reports);
    } catch (error) {
      logger.error('Error loading teacher reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTeacherExpansion = (teacherId: string) => {
    setExpandedTeachers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(teacherId)) {
        newSet.delete(teacherId);
      } else {
        newSet.add(teacherId);
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

  if (teacherReports.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-muted-foreground">No teacher attendance data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Attendance by Teacher
          </CardTitle>
          <CardDescription>
            Detailed attendance reports for each teacher, including class-level breakdown
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teacherReports.map((teacherReport) => (
              <Collapsible key={teacherReport.teacherId}>
                <Card>
                  <CollapsibleTrigger 
                    className="w-full"
                    onClick={() => toggleTeacherExpansion(teacherReport.teacherId)}
                  >
                    <CardHeader className="hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {expandedTeachers.has(teacherReport.teacherId) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <div className="text-left">
                            <CardTitle className="text-lg">{teacherReport.teacherName}</CardTitle>
                            <CardDescription className="flex items-center gap-4">
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {teacherReport.email}
                              </span>
                              <span className="flex items-center gap-1">
                                <BookOpen className="h-3 w-3" />
                                {teacherReport.totalClasses} classes
                              </span>
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className={`text-2xl font-bold ${getAttendanceRateColor(teacherReport.overallAttendanceRate)}`}>
                              {formatPercentage(teacherReport.overallAttendanceRate)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {teacherReport.totalSessions} total sessions
                            </div>
                          </div>
                          <Badge className={`${getAttendanceRateBadge(teacherReport.overallAttendanceRate)}`}>
                            {teacherReport.overallAttendanceRate >= 90 ? 'Excellent' : 
                             teacherReport.overallAttendanceRate >= 75 ? 'Good' : 'Poor'}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      {/* Teacher Summary Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="text-center">
                          <div className="text-lg font-semibold text-green-600">
                            {teacherReport.attendanceStats.present}
                          </div>
                          <div className="text-sm text-muted-foreground">Present</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-red-600">
                            {teacherReport.attendanceStats.absent}
                          </div>
                          <div className="text-sm text-muted-foreground">Absent</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-yellow-600">
                            {teacherReport.attendanceStats.late}
                          </div>
                          <div className="text-sm text-muted-foreground">Late</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-blue-600">
                            {teacherReport.attendanceStats.excused}
                          </div>
                          <div className="text-sm text-muted-foreground">Excused</div>
                        </div>
                      </div>

                      {/* Classes Breakdown */}
                      <div>
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Classes Taught ({teacherReport.classes.length} classes)
                        </h4>
                        <div className="space-y-3">
                          {teacherReport.classes.map((classInfo) => (
                            <div key={classInfo.classId} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                              <div>
                                <div className="font-medium">{classInfo.className}</div>
                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {classInfo.courseType}
                                  </Badge>
                                  <span>{classInfo.totalSessions} sessions</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="w-24">
                                  <Progress 
                                    value={classInfo.attendanceRate} 
                                    className="h-2" 
                                  />
                                </div>
                                <div className={`text-sm font-medium ${getAttendanceRateColor(classInfo.attendanceRate)}`}>
                                  {formatPercentage(classInfo.attendanceRate)}
                                </div>
                                <Badge 
                                  variant={classInfo.attendanceRate >= 90 ? 'default' : 
                                          classInfo.attendanceRate >= 75 ? 'secondary' : 'destructive'}
                                  className="text-xs"
                                >
                                  {classInfo.attendanceRate >= 90 ? 'Excellent' : 
                                   classInfo.attendanceRate >= 75 ? 'Good' : 'Poor'}
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

      {/* Teacher Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Teacher Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Teacher</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Classes</TableHead>
                <TableHead>Total Sessions</TableHead>
                <TableHead>Present</TableHead>
                <TableHead>Absent</TableHead>
                <TableHead>Attendance Rate</TableHead>
                <TableHead>Performance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teacherReports.map((teacherReport) => (
                <TableRow key={teacherReport.teacherId}>
                  <TableCell className="font-medium">{teacherReport.teacherName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{teacherReport.email}</TableCell>
                  <TableCell>{teacherReport.totalClasses}</TableCell>
                  <TableCell>{teacherReport.totalSessions}</TableCell>
                  <TableCell>
                    <span className="text-green-600 font-medium">
                      {teacherReport.attendanceStats.present}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-red-600 font-medium">
                      {teacherReport.attendanceStats.absent}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={getAttendanceRateColor(teacherReport.overallAttendanceRate)}>
                        {formatPercentage(teacherReport.overallAttendanceRate)}
                      </span>
                      {teacherReport.overallAttendanceRate >= 75 ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getAttendanceRateBadge(teacherReport.overallAttendanceRate)}`}>
                      {teacherReport.overallAttendanceRate >= 90 ? 'Excellent' : 
                       teacherReport.overallAttendanceRate >= 75 ? 'Good' : 'Poor'}
                    </Badge>
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