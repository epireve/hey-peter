import { supabase } from '@/lib/supabase';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export type AttendanceReportPeriod = 'daily' | 'weekly' | 'monthly' | 'custom';

export interface AttendanceFilters {
  startDate?: Date;
  endDate?: Date;
  teacherId?: string;
  classId?: string;
  courseType?: string;
  status?: AttendanceStatus;
  period?: AttendanceReportPeriod;
}

export interface AttendanceRecord {
  id: string;
  attendanceTime: Date;
  status: AttendanceStatus;
  hoursDeducted: number;
  notes?: string;
  student: {
    id: string;
    fullName: string;
    email: string;
    studentId: string;
  };
  class: {
    id: string;
    className: string;
    courseType: string;
  };
  teacher: {
    id: string;
    fullName: string;
    email: string;
  };
  booking: {
    id: string;
    bookingDate: Date;
    startTime: Date;
    endTime: Date;
    durationMinutes: number;
  };
}

export interface AttendanceClassSummary {
  classId: string;
  className: string;
  courseType: string;
  teacher: {
    id: string;
    fullName: string;
  };
  totalSessions: number;
  attendedSessions: number;
  absentSessions: number;
  lateSessions: number;
  excusedSessions: number;
  attendanceRate: number;
  averageHoursDeducted: number;
  students: {
    studentId: string;
    fullName: string;
    attendanceRate: number;
    totalSessions: number;
    attendedSessions: number;
  }[];
}

export interface AttendanceTeacherSummary {
  teacherId: string;
  teacherName: string;
  email: string;
  totalClasses: number;
  totalSessions: number;
  overallAttendanceRate: number;
  classes: {
    classId: string;
    className: string;
    courseType: string;
    totalSessions: number;
    attendanceRate: number;
  }[];
  attendanceStats: {
    present: number;
    absent: number;
    late: number;
    excused: number;
  };
}

export interface AttendancePeriodSummary {
  period: string;
  totalSessions: number;
  attendedSessions: number;
  absentSessions: number;
  lateSessions: number;
  excusedSessions: number;
  attendanceRate: number;
  hoursDeducted: number;
  uniqueStudents: number;
  uniqueClasses: number;
  topPerformingClasses: {
    classId: string;
    className: string;
    attendanceRate: number;
  }[];
  lowPerformingClasses: {
    classId: string;
    className: string;
    attendanceRate: number;
  }[];
}

export interface AttendanceTrendData {
  date: string;
  period: string;
  totalSessions: number;
  attendedSessions: number;
  attendanceRate: number;
  absentSessions: number;
  lateSessions: number;
  excusedSessions: number;
}

class AttendanceAnalyticsService {
  // Get detailed attendance records with filters
  async getAttendanceRecords(filters: AttendanceFilters = {}): Promise<AttendanceRecord[]> {
    try {
      let query = supabase
        .from('attendance')
        .select(`
          id,
          attendance_time,
          status,
          hours_deducted,
          notes,
          booking_id,
          bookings!inner (
            id,
            booking_date,
            start_time,
            end_time,
            duration_minutes,
            student_id,
            class_id,
            teacher_id,
            students!inner (
              id,
              full_name,
              email,
              student_id
            ),
            classes!inner (
              id,
              class_name,
              courses!inner (
                course_type
              )
            ),
            teachers!inner (
              id,
              full_name,
              email
            )
          )
        `);

      // Apply filters
      if (filters.startDate) {
        query = query.gte('attendance_time', filters.startDate.toISOString());
      }
      if (filters.endDate) {
        query = query.lte('attendance_time', filters.endDate.toISOString());
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.teacherId) {
        query = query.eq('bookings.teacher_id', filters.teacherId);
      }
      if (filters.classId) {
        query = query.eq('bookings.class_id', filters.classId);
      }
      if (filters.courseType) {
        query = query.eq('bookings.classes.courses.course_type', filters.courseType);
      }

      const { data, error } = await query
        .order('attendance_time', { ascending: false });

      if (error) throw error;

      return data?.map((record: any) => ({
        id: record.id,
        attendanceTime: new Date(record.attendance_time),
        status: record.status,
        hoursDeducted: record.hours_deducted || 0,
        notes: record.notes,
        student: {
          id: record.bookings.students.id,
          fullName: record.bookings.students.full_name,
          email: record.bookings.students.email,
          studentId: record.bookings.students.student_id
        },
        class: {
          id: record.bookings.classes.id,
          className: record.bookings.classes.class_name,
          courseType: record.bookings.classes.courses.course_type
        },
        teacher: {
          id: record.bookings.teachers.id,
          fullName: record.bookings.teachers.full_name,
          email: record.bookings.teachers.email
        },
        booking: {
          id: record.bookings.id,
          bookingDate: new Date(record.bookings.booking_date),
          startTime: new Date(record.bookings.start_time),
          endTime: new Date(record.bookings.end_time),
          durationMinutes: record.bookings.duration_minutes
        }
      })) || [];
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      throw error;
    }
  }

  // Get attendance summary by class
  async getAttendanceByClass(filters: AttendanceFilters = {}): Promise<AttendanceClassSummary[]> {
    try {
      const records = await this.getAttendanceRecords(filters);
      
      // Group by class
      const classMap = new Map<string, AttendanceRecord[]>();
      records.forEach(record => {
        const classId = record.class.id;
        if (!classMap.has(classId)) {
          classMap.set(classId, []);
        }
        classMap.get(classId)!.push(record);
      });

      const classSummaries: AttendanceClassSummary[] = [];

      for (const [classId, classRecords] of classMap) {
        const firstRecord = classRecords[0];
        const totalSessions = classRecords.length;
        const attendedSessions = classRecords.filter(r => r.status === 'present').length;
        const absentSessions = classRecords.filter(r => r.status === 'absent').length;
        const lateSessions = classRecords.filter(r => r.status === 'late').length;
        const excusedSessions = classRecords.filter(r => r.status === 'excused').length;
        const attendanceRate = totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 0;
        const averageHoursDeducted = classRecords.reduce((sum, r) => sum + r.hoursDeducted, 0) / totalSessions;

        // Group by student for student-level stats
        const studentMap = new Map<string, AttendanceRecord[]>();
        classRecords.forEach(record => {
          const studentId = record.student.id;
          if (!studentMap.has(studentId)) {
            studentMap.set(studentId, []);
          }
          studentMap.get(studentId)!.push(record);
        });

        const students = Array.from(studentMap).map(([studentId, studentRecords]) => {
          const student = studentRecords[0].student;
          const totalStudentSessions = studentRecords.length;
          const attendedStudentSessions = studentRecords.filter(r => r.status === 'present').length;
          const studentAttendanceRate = totalStudentSessions > 0 ? (attendedStudentSessions / totalStudentSessions) * 100 : 0;

          return {
            studentId,
            fullName: student.fullName,
            attendanceRate: studentAttendanceRate,
            totalSessions: totalStudentSessions,
            attendedSessions: attendedStudentSessions
          };
        });

        classSummaries.push({
          classId,
          className: firstRecord.class.className,
          courseType: firstRecord.class.courseType,
          teacher: {
            id: firstRecord.teacher.id,
            fullName: firstRecord.teacher.fullName
          },
          totalSessions,
          attendedSessions,
          absentSessions,
          lateSessions,
          excusedSessions,
          attendanceRate,
          averageHoursDeducted,
          students: students.sort((a, b) => b.attendanceRate - a.attendanceRate)
        });
      }

      return classSummaries.sort((a, b) => b.attendanceRate - a.attendanceRate);
    } catch (error) {
      console.error('Error generating class attendance summary:', error);
      throw error;
    }
  }

  // Get attendance summary by teacher
  async getAttendanceByTeacher(filters: AttendanceFilters = {}): Promise<AttendanceTeacherSummary[]> {
    try {
      const records = await this.getAttendanceRecords(filters);
      
      // Group by teacher
      const teacherMap = new Map<string, AttendanceRecord[]>();
      records.forEach(record => {
        const teacherId = record.teacher.id;
        if (!teacherMap.has(teacherId)) {
          teacherMap.set(teacherId, []);
        }
        teacherMap.get(teacherId)!.push(record);
      });

      const teacherSummaries: AttendanceTeacherSummary[] = [];

      for (const [teacherId, teacherRecords] of teacherMap) {
        const firstRecord = teacherRecords[0];
        const totalSessions = teacherRecords.length;
        const attendedSessions = teacherRecords.filter(r => r.status === 'present').length;
        const overallAttendanceRate = totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 0;

        // Group by class for class-level stats
        const classMap = new Map<string, AttendanceRecord[]>();
        teacherRecords.forEach(record => {
          const classId = record.class.id;
          if (!classMap.has(classId)) {
            classMap.set(classId, []);
          }
          classMap.get(classId)!.push(record);
        });

        const classes = Array.from(classMap).map(([classId, classRecords]) => {
          const classInfo = classRecords[0].class;
          const totalClassSessions = classRecords.length;
          const attendedClassSessions = classRecords.filter(r => r.status === 'present').length;
          const classAttendanceRate = totalClassSessions > 0 ? (attendedClassSessions / totalClassSessions) * 100 : 0;

          return {
            classId,
            className: classInfo.className,
            courseType: classInfo.courseType,
            totalSessions: totalClassSessions,
            attendanceRate: classAttendanceRate
          };
        });

        // Count unique classes
        const uniqueClasses = new Set(teacherRecords.map(r => r.class.id)).size;

        // Calculate attendance statistics
        const attendanceStats = {
          present: teacherRecords.filter(r => r.status === 'present').length,
          absent: teacherRecords.filter(r => r.status === 'absent').length,
          late: teacherRecords.filter(r => r.status === 'late').length,
          excused: teacherRecords.filter(r => r.status === 'excused').length
        };

        teacherSummaries.push({
          teacherId,
          teacherName: firstRecord.teacher.fullName,
          email: firstRecord.teacher.email,
          totalClasses: uniqueClasses,
          totalSessions,
          overallAttendanceRate,
          classes: classes.sort((a, b) => b.attendanceRate - a.attendanceRate),
          attendanceStats
        });
      }

      return teacherSummaries.sort((a, b) => b.overallAttendanceRate - a.overallAttendanceRate);
    } catch (error) {
      console.error('Error generating teacher attendance summary:', error);
      throw error;
    }
  }

  // Get attendance summary by time period
  async getAttendanceByPeriod(filters: AttendanceFilters = {}): Promise<AttendancePeriodSummary[]> {
    try {
      const records = await this.getAttendanceRecords(filters);
      
      // Group by period
      const periodMap = new Map<string, AttendanceRecord[]>();
      
      records.forEach(record => {
        let periodKey: string;
        const date = record.attendanceTime;
        
        switch (filters.period) {
          case 'daily':
            periodKey = format(date, 'yyyy-MM-dd');
            break;
          case 'weekly':
            periodKey = format(startOfWeek(date), 'yyyy-MM-dd');
            break;
          case 'monthly':
            periodKey = format(startOfMonth(date), 'yyyy-MM');
            break;
          default:
            periodKey = format(date, 'yyyy-MM-dd');
        }
        
        if (!periodMap.has(periodKey)) {
          periodMap.set(periodKey, []);
        }
        periodMap.get(periodKey)!.push(record);
      });

      const periodSummaries: AttendancePeriodSummary[] = [];

      for (const [period, periodRecords] of periodMap) {
        const totalSessions = periodRecords.length;
        const attendedSessions = periodRecords.filter(r => r.status === 'present').length;
        const absentSessions = periodRecords.filter(r => r.status === 'absent').length;
        const lateSessions = periodRecords.filter(r => r.status === 'late').length;
        const excusedSessions = periodRecords.filter(r => r.status === 'excused').length;
        const attendanceRate = totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 0;
        const hoursDeducted = periodRecords.reduce((sum, r) => sum + r.hoursDeducted, 0);
        const uniqueStudents = new Set(periodRecords.map(r => r.student.id)).size;
        const uniqueClasses = new Set(periodRecords.map(r => r.class.id)).size;

        // Calculate top and low performing classes
        const classPerformance = new Map<string, { records: AttendanceRecord[], rate: number }>();
        periodRecords.forEach(record => {
          const classId = record.class.id;
          if (!classPerformance.has(classId)) {
            classPerformance.set(classId, { records: [], rate: 0 });
          }
          classPerformance.get(classId)!.records.push(record);
        });

        // Calculate attendance rates for each class
        for (const [classId, classData] of classPerformance) {
          const classTotal = classData.records.length;
          const classAttended = classData.records.filter(r => r.status === 'present').length;
          classData.rate = classTotal > 0 ? (classAttended / classTotal) * 100 : 0;
        }

        const sortedClasses = Array.from(classPerformance.entries())
          .map(([classId, data]) => ({
            classId,
            className: data.records[0].class.className,
            attendanceRate: data.rate
          }))
          .sort((a, b) => b.attendanceRate - a.attendanceRate);

        const topPerformingClasses = sortedClasses.slice(0, 5);
        const lowPerformingClasses = sortedClasses.slice(-5).reverse();

        periodSummaries.push({
          period,
          totalSessions,
          attendedSessions,
          absentSessions,
          lateSessions,
          excusedSessions,
          attendanceRate,
          hoursDeducted,
          uniqueStudents,
          uniqueClasses,
          topPerformingClasses,
          lowPerformingClasses
        });
      }

      return periodSummaries.sort((a, b) => a.period.localeCompare(b.period));
    } catch (error) {
      console.error('Error generating period attendance summary:', error);
      throw error;
    }
  }

  // Get attendance trends over time
  async getAttendanceTrends(filters: AttendanceFilters = {}): Promise<AttendanceTrendData[]> {
    try {
      const records = await this.getAttendanceRecords(filters);
      
      // Group by date
      const dateMap = new Map<string, AttendanceRecord[]>();
      
      records.forEach(record => {
        const dateKey = format(record.attendanceTime, 'yyyy-MM-dd');
        if (!dateMap.has(dateKey)) {
          dateMap.set(dateKey, []);
        }
        dateMap.get(dateKey)!.push(record);
      });

      const trendData: AttendanceTrendData[] = [];

      for (const [date, dayRecords] of dateMap) {
        const totalSessions = dayRecords.length;
        const attendedSessions = dayRecords.filter(r => r.status === 'present').length;
        const absentSessions = dayRecords.filter(r => r.status === 'absent').length;
        const lateSessions = dayRecords.filter(r => r.status === 'late').length;
        const excusedSessions = dayRecords.filter(r => r.status === 'excused').length;
        const attendanceRate = totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 0;

        // Determine period label
        const parsedDate = new Date(date);
        let period: string;
        
        switch (filters.period) {
          case 'weekly':
            period = `Week of ${format(startOfWeek(parsedDate), 'MMM dd')}`;
            break;
          case 'monthly':
            period = format(parsedDate, 'MMM yyyy');
            break;
          default:
            period = format(parsedDate, 'MMM dd');
        }

        trendData.push({
          date,
          period,
          totalSessions,
          attendedSessions,
          attendanceRate,
          absentSessions,
          lateSessions,
          excusedSessions
        });
      }

      return trendData.sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      console.error('Error generating attendance trends:', error);
      throw error;
    }
  }

  // Get attendance statistics
  async getAttendanceStats(filters: AttendanceFilters = {}): Promise<{
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
  }> {
    try {
      const records = await this.getAttendanceRecords(filters);
      
      const totalSessions = records.length;
      const attendedSessions = records.filter(r => r.status === 'present').length;
      const absentSessions = records.filter(r => r.status === 'absent').length;
      const lateSessions = records.filter(r => r.status === 'late').length;
      const excusedSessions = records.filter(r => r.status === 'excused').length;
      
      const attendanceRate = totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 0;
      const absenteeismRate = totalSessions > 0 ? (absentSessions / totalSessions) * 100 : 0;
      const punctualityRate = totalSessions > 0 ? ((attendedSessions) / totalSessions) * 100 : 0;
      
      const totalHoursDeducted = records.reduce((sum, r) => sum + r.hoursDeducted, 0);
      const averageHoursDeducted = totalSessions > 0 ? totalHoursDeducted / totalSessions : 0;
      
      const uniqueStudents = new Set(records.map(r => r.student.id)).size;
      const uniqueClasses = new Set(records.map(r => r.class.id)).size;
      const uniqueTeachers = new Set(records.map(r => r.teacher.id)).size;

      return {
        totalSessions,
        attendanceRate,
        absenteeismRate,
        punctualityRate,
        averageHoursDeducted,
        totalHoursDeducted,
        uniqueStudents,
        uniqueClasses,
        uniqueTeachers,
        statusBreakdown: {
          present: attendedSessions,
          absent: absentSessions,
          late: lateSessions,
          excused: excusedSessions
        }
      };
    } catch (error) {
      console.error('Error generating attendance statistics:', error);
      throw error;
    }
  }

  // Helper method to get date range based on period
  getDateRangeForPeriod(period: AttendanceReportPeriod, customStart?: Date, customEnd?: Date): { start: Date; end: Date } {
    const now = new Date();
    
    switch (period) {
      case 'daily':
        return {
          start: startOfDay(now),
          end: endOfDay(now)
        };
      case 'weekly':
        return {
          start: startOfWeek(now),
          end: endOfWeek(now)
        };
      case 'monthly':
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        };
      case 'custom':
        return {
          start: customStart || startOfDay(now),
          end: customEnd || endOfDay(now)
        };
      default:
        return {
          start: startOfDay(now),
          end: endOfDay(now)
        };
    }
  }
}

export const attendanceAnalyticsService = new AttendanceAnalyticsService();