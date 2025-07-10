/**
 * HeyPeter Academy - Class Attendance Analytics Service
 * 
 * This service provides comprehensive class-specific attendance analytics including:
 * - Detailed attendance metrics and patterns
 * - Predictive analytics for attendance trends
 * - Class comparison and benchmarking
 * - Performance impact analysis
 * - Pattern recognition and anomaly detection
 * - Actionable recommendations for improvement
 */

import { supabase } from '@/lib/supabase';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths } from 'date-fns';
import {
  ClassAttendanceAnalytics,
  ClassAttendanceMetrics,
  ClassAttendanceTrend,
  AttendancePrediction,
  ClassComparison,
  PerformanceImpactAnalysis,
  AttendanceRecommendation,
  AttendancePatternAnalysis,
  DayOfWeekAttendance,
  TimeSlotAttendance,
  SeasonalPattern,
  PredictionFactor,
  ImpactFactor,
  AttendancePattern,
  AttendanceAnomaly,
  AttendanceInsight,
  AttendanceFilters,
  AttendanceRecord
} from '@/types/attendance';
import { attendanceAnalyticsService } from './attendance-analytics-service';

export class ClassAttendanceAnalyticsService {
  private cache: Map<string, ClassAttendanceAnalytics> = new Map();
  private cacheTimeout: number = 30 * 60 * 1000; // 30 minutes

  /**
   * Get comprehensive class attendance analytics
   */
  async getClassAttendanceAnalytics(
    classId: string, 
    timeframe: '30_days' | '90_days' | '180_days' = '90_days',
    forceRefresh: boolean = false
  ): Promise<ClassAttendanceAnalytics> {
    const cacheKey = `class-analytics-${classId}-${timeframe}`;
    
    if (!forceRefresh && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      const age = Date.now() - new Date(cached.lastUpdated).getTime();
      
      if (age < this.cacheTimeout) {
        return cached;
      }
    }

    const analytics = await this.calculateClassAttendanceAnalytics(classId, timeframe);
    
    // Cache the result
    this.cache.set(cacheKey, analytics);
    
    return analytics;
  }

  /**
   * Calculate comprehensive class attendance analytics
   */
  private async calculateClassAttendanceAnalytics(
    classId: string, 
    timeframe: string
  ): Promise<ClassAttendanceAnalytics> {
    // Get class information
    const classInfo = await this.getClassInfo(classId);
    
    // Set date range based on timeframe
    const endDate = new Date();
    const startDate = this.getStartDateForTimeframe(timeframe, endDate);

    // Get attendance records for the class
    const filters: AttendanceFilters = {
      classId,
      startDate,
      endDate
    };
    
    const attendanceRecords = await attendanceAnalyticsService.getAttendanceRecords(filters);

    // Calculate comprehensive metrics
    const attendanceMetrics = await this.calculateClassAttendanceMetrics(classId, attendanceRecords);
    
    // Calculate trends
    const trends = await this.calculateClassAttendanceTrends(classId, attendanceRecords, timeframe);
    
    // Generate predictions
    const predictions = await this.generateAttendancePredictions(classId, trends, attendanceRecords);
    
    // Generate class comparisons
    const comparisons = await this.generateClassComparisons(classId, classInfo.courseType);
    
    // Analyze performance impact
    const performanceImpact = await this.analyzePerformanceImpact(classId, attendanceRecords);
    
    // Generate recommendations
    const recommendations = await this.generateAttendanceRecommendations(
      classId, 
      attendanceMetrics, 
      trends, 
      performanceImpact
    );

    return {
      classId,
      className: classInfo.className,
      courseType: classInfo.courseType,
      teacher: classInfo.teacher,
      attendanceMetrics,
      trends,
      predictions,
      comparisons,
      performanceImpact,
      recommendations,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Get class information
   */
  private async getClassInfo(classId: string): Promise<{
    className: string;
    courseType: string;
    teacher: { id: string; fullName: string };
  }> {
    const { data: classData, error } = await supabase
      .from('classes')
      .select(`
        id,
        class_name,
        teacher_id,
        courses!inner (
          course_type
        ),
        teachers!inner (
          id,
          full_name
        )
      `)
      .eq('id', classId)
      .single();

    if (error || !classData) {
      throw new Error(`Failed to fetch class information: ${error?.message}`);
    }

    return {
      className: classData.class_name,
      courseType: classData.courses.course_type,
      teacher: {
        id: classData.teachers.id,
        fullName: classData.teachers.full_name
      }
    };
  }

  /**
   * Calculate comprehensive class attendance metrics
   */
  private async calculateClassAttendanceMetrics(
    classId: string, 
    attendanceRecords: AttendanceRecord[]
  ): Promise<ClassAttendanceMetrics> {
    const totalSessions = attendanceRecords.length;
    const presentSessions = attendanceRecords.filter(r => r.status === 'present').length;
    const averageAttendanceRate = totalSessions > 0 ? (presentSessions / totalSessions) * 100 : 0;

    // Calculate attendance consistency (lower variance = more consistent)
    const sessionRates = this.calculateDailyAttendanceRates(attendanceRecords);
    const attendanceConsistency = this.calculateConsistencyScore(sessionRates);

    // Peak and lowest attendance rates
    const peakAttendanceRate = Math.max(...sessionRates, 0);
    const lowestAttendanceRate = Math.min(...sessionRates, 100);

    // Attendance by day of week
    const attendanceByDayOfWeek = this.calculateAttendanceByDayOfWeek(attendanceRecords);

    // Attendance by time slot
    const attendanceByTimeSlot = this.calculateAttendanceByTimeSlot(attendanceRecords);

    // Student analytics
    const studentAnalytics = await this.calculateStudentAnalytics(classId, attendanceRecords);

    return {
      totalSessions,
      averageAttendanceRate,
      attendanceConsistency,
      peakAttendanceRate,
      lowestAttendanceRate,
      attendanceByDayOfWeek,
      attendanceByTimeSlot,
      studentRetentionRate: studentAnalytics.retentionRate,
      chronicallyAbsentStudents: studentAnalytics.chronicallyAbsent,
      improvingStudents: studentAnalytics.improving,
      decliningStudents: studentAnalytics.declining
    };
  }

  /**
   * Calculate daily attendance rates for consistency analysis
   */
  private calculateDailyAttendanceRates(attendanceRecords: AttendanceRecord[]): number[] {
    const dailyMap = new Map<string, { total: number; present: number }>();
    
    attendanceRecords.forEach(record => {
      const date = format(record.attendanceTime, 'yyyy-MM-dd');
      const existing = dailyMap.get(date) || { total: 0, present: 0 };
      
      dailyMap.set(date, {
        total: existing.total + 1,
        present: existing.present + (record.status === 'present' ? 1 : 0)
      });
    });

    return Array.from(dailyMap.values()).map(day => 
      day.total > 0 ? (day.present / day.total) * 100 : 0
    );
  }

  /**
   * Calculate consistency score (0-100, higher is more consistent)
   */
  private calculateConsistencyScore(rates: number[]): number {
    if (rates.length < 2) return 100;

    const mean = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
    const variance = rates.reduce((sum, rate) => sum + Math.pow(rate - mean, 2), 0) / rates.length;
    const standardDeviation = Math.sqrt(variance);

    // Convert to consistency score (inverse of coefficient of variation)
    const coefficientOfVariation = mean > 0 ? standardDeviation / mean : 0;
    return Math.max(0, 100 - (coefficientOfVariation * 100));
  }

  /**
   * Calculate attendance by day of week
   */
  private calculateAttendanceByDayOfWeek(attendanceRecords: AttendanceRecord[]): DayOfWeekAttendance[] {
    const dayMap = new Map<string, { total: number; present: number; students: Set<string> }>();
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    attendanceRecords.forEach(record => {
      const dayOfWeek = daysOfWeek[record.attendanceTime.getDay()];
      const existing = dayMap.get(dayOfWeek) || { total: 0, present: 0, students: new Set() };
      
      existing.total += 1;
      existing.present += record.status === 'present' ? 1 : 0;
      existing.students.add(record.student.id);
      
      dayMap.set(dayOfWeek, existing);
    });

    return daysOfWeek.map(day => {
      const data = dayMap.get(day) || { total: 0, present: 0, students: new Set() };
      return {
        dayOfWeek: day,
        attendanceRate: data.total > 0 ? (data.present / data.total) * 100 : 0,
        totalSessions: data.total,
        averageStudents: data.students.size
      };
    }).filter(day => day.totalSessions > 0);
  }

  /**
   * Calculate attendance by time slot
   */
  private calculateAttendanceByTimeSlot(attendanceRecords: AttendanceRecord[]): TimeSlotAttendance[] {
    const timeSlotMap = new Map<string, { total: number; present: number; energy: number[] }>();

    attendanceRecords.forEach(record => {
      const hour = record.booking.startTime.getHours();
      const timeSlot = this.getTimeSlotLabel(hour);
      const existing = timeSlotMap.get(timeSlot) || { total: 0, present: 0, energy: [] };
      
      existing.total += 1;
      existing.present += record.status === 'present' ? 1 : 0;
      // Energy level estimation based on time of day and attendance
      existing.energy.push(this.estimateEnergyLevel(hour, record.status === 'present'));
      
      timeSlotMap.set(timeSlot, existing);
    });

    return Array.from(timeSlotMap.entries()).map(([timeSlot, data]) => ({
      timeSlot,
      attendanceRate: data.total > 0 ? (data.present / data.total) * 100 : 0,
      totalSessions: data.total,
      energyLevel: data.energy.length > 0 ? data.energy.reduce((sum, e) => sum + e, 0) / data.energy.length : 0
    })).sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
  }

  /**
   * Get time slot label for hour
   */
  private getTimeSlotLabel(hour: number): string {
    if (hour < 6) return 'Late Night (00:00-05:59)';
    if (hour < 9) return 'Early Morning (06:00-08:59)';
    if (hour < 12) return 'Morning (09:00-11:59)';
    if (hour < 14) return 'Lunch Time (12:00-13:59)';
    if (hour < 17) return 'Afternoon (14:00-16:59)';
    if (hour < 20) return 'Evening (17:00-19:59)';
    return 'Night (20:00-23:59)';
  }

  /**
   * Estimate energy level based on time and attendance
   */
  private estimateEnergyLevel(hour: number, attended: boolean): number {
    // Base energy levels by time of day (0-10 scale)
    const baseEnergy = hour >= 9 && hour <= 11 ? 9 :  // Peak morning
                     hour >= 14 && hour <= 16 ? 8 :  // Good afternoon
                     hour >= 19 && hour <= 21 ? 7 :  // Evening
                     hour >= 7 && hour <= 8 ? 6 :    // Early morning
                     hour >= 12 && hour <= 13 ? 5 :  // Lunch time
                     hour >= 17 && hour <= 18 ? 6 :  // Late afternoon
                     3; // Other times

    // Adjust based on attendance (attended sessions indicate higher engagement)
    return attended ? baseEnergy : Math.max(1, baseEnergy - 2);
  }

  /**
   * Calculate student analytics for the class
   */
  private async calculateStudentAnalytics(
    classId: string, 
    attendanceRecords: AttendanceRecord[]
  ): Promise<{
    retentionRate: number;
    chronicallyAbsent: number;
    improving: number;
    declining: number;
  }> {
    // Group records by student
    const studentMap = new Map<string, AttendanceRecord[]>();
    attendanceRecords.forEach(record => {
      const studentId = record.student.id;
      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, []);
      }
      studentMap.get(studentId)!.push(record);
    });

    let chronicallyAbsent = 0;
    let improving = 0;
    let declining = 0;
    let activeStudents = 0;

    // Get current enrolled students
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('student_id')
      .eq('class_id', classId)
      .eq('status', 'active');

    const currentStudents = new Set(enrollments?.map(e => e.student_id) || []);

    for (const [studentId, records] of studentMap) {
      if (!currentStudents.has(studentId)) continue;
      
      activeStudents++;
      const sortedRecords = records.sort((a, b) => a.attendanceTime.getTime() - b.attendanceTime.getTime());
      
      // Calculate attendance rate
      const presentCount = records.filter(r => r.status === 'present').length;
      const attendanceRate = records.length > 0 ? presentCount / records.length : 0;
      
      // Chronically absent if attendance rate < 60%
      if (attendanceRate < 0.6) {
        chronicallyAbsent++;
      }

      // Check improvement/decline trends
      if (records.length >= 4) {
        const firstHalf = sortedRecords.slice(0, Math.floor(records.length / 2));
        const secondHalf = sortedRecords.slice(Math.ceil(records.length / 2));
        
        const firstHalfRate = firstHalf.filter(r => r.status === 'present').length / firstHalf.length;
        const secondHalfRate = secondHalf.filter(r => r.status === 'present').length / secondHalf.length;
        
        const improvement = secondHalfRate - firstHalfRate;
        
        if (improvement > 0.1) improving++;
        else if (improvement < -0.1) declining++;
      }
    }

    const totalEnrolled = currentStudents.size;
    const retentionRate = totalEnrolled > 0 ? (activeStudents / totalEnrolled) * 100 : 100;

    return {
      retentionRate,
      chronicallyAbsent,
      improving,
      declining
    };
  }

  /**
   * Calculate class attendance trends
   */
  private async calculateClassAttendanceTrends(
    classId: string, 
    attendanceRecords: AttendanceRecord[], 
    timeframe: string
  ): Promise<ClassAttendanceTrend[]> {
    const trends: ClassAttendanceTrend[] = [];

    // Attendance rate trend
    const attendanceTrend = this.calculateAttendanceTrend(attendanceRecords, timeframe);
    if (attendanceTrend) trends.push(attendanceTrend);

    // Punctuality trend
    const punctualityTrend = this.calculatePunctualityTrend(attendanceRecords, timeframe);
    if (punctualityTrend) trends.push(punctualityTrend);

    // Retention trend
    const retentionTrend = await this.calculateRetentionTrend(classId, timeframe);
    if (retentionTrend) trends.push(retentionTrend);

    return trends;
  }

  /**
   * Calculate attendance rate trend
   */
  private calculateAttendanceTrend(
    attendanceRecords: AttendanceRecord[], 
    timeframe: string
  ): ClassAttendanceTrend | null {
    if (attendanceRecords.length === 0) return null;

    const weeklyData = this.groupRecordsByWeek(attendanceRecords);
    const dataPoints = weeklyData.map(week => ({
      date: week.date,
      value: week.attendanceRate
    }));

    const trend = this.calculateTrendDirection(dataPoints);
    const changeRate = this.calculateChangeRate(dataPoints);
    const seasonality = this.detectSeasonality(dataPoints);

    return {
      metric: 'attendance_rate',
      timeframe: timeframe as any,
      trend,
      changeRate,
      confidence: Math.min(0.9, dataPoints.length / 12), // Higher confidence with more data points
      dataPoints,
      seasonality
    };
  }

  /**
   * Calculate punctuality trend
   */
  private calculatePunctualityTrend(
    attendanceRecords: AttendanceRecord[], 
    timeframe: string
  ): ClassAttendanceTrend | null {
    if (attendanceRecords.length === 0) return null;

    const weeklyData = this.groupRecordsByWeek(attendanceRecords);
    const dataPoints = weeklyData.map(week => ({
      date: week.date,
      value: week.punctualityRate
    }));

    const trend = this.calculateTrendDirection(dataPoints);
    const changeRate = this.calculateChangeRate(dataPoints);

    return {
      metric: 'punctuality',
      timeframe: timeframe as any,
      trend,
      changeRate,
      confidence: Math.min(0.85, dataPoints.length / 12),
      dataPoints
    };
  }

  /**
   * Calculate retention trend
   */
  private async calculateRetentionTrend(
    classId: string, 
    timeframe: string
  ): Promise<ClassAttendanceTrend | null> {
    // Get enrollment history for the class
    const endDate = new Date();
    const startDate = this.getStartDateForTimeframe(timeframe, endDate);

    const { data: enrollmentHistory } = await supabase
      .from('enrollments')
      .select('created_at, status, updated_at')
      .eq('class_id', classId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (!enrollmentHistory || enrollmentHistory.length === 0) return null;

    // Calculate weekly retention rates
    const weeklyRetention = this.calculateWeeklyRetention(enrollmentHistory);
    const dataPoints = weeklyRetention.map(week => ({
      date: week.date,
      value: week.retentionRate
    }));

    const trend = this.calculateTrendDirection(dataPoints);
    const changeRate = this.calculateChangeRate(dataPoints);

    return {
      metric: 'retention',
      timeframe: timeframe as any,
      trend,
      changeRate,
      confidence: Math.min(0.8, dataPoints.length / 8),
      dataPoints
    };
  }

  /**
   * Group attendance records by week
   */
  private groupRecordsByWeek(records: AttendanceRecord[]): Array<{
    date: string;
    attendanceRate: number;
    punctualityRate: number;
  }> {
    const weekMap = new Map<string, AttendanceRecord[]>();
    
    records.forEach(record => {
      const weekStart = startOfWeek(record.attendanceTime);
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      
      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, []);
      }
      weekMap.get(weekKey)!.push(record);
    });

    return Array.from(weekMap.entries()).map(([date, weekRecords]) => {
      const total = weekRecords.length;
      const present = weekRecords.filter(r => r.status === 'present').length;
      const onTime = weekRecords.filter(r => r.status === 'present' || r.status === 'excused').length;
      
      return {
        date,
        attendanceRate: total > 0 ? (present / total) * 100 : 0,
        punctualityRate: total > 0 ? (onTime / total) * 100 : 0
      };
    }).sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Calculate weekly retention rates
   */
  private calculateWeeklyRetention(enrollmentHistory: any[]): Array<{
    date: string;
    retentionRate: number;
  }> {
    const weekMap = new Map<string, { active: number; total: number }>();
    
    enrollmentHistory.forEach(enrollment => {
      const weekStart = startOfWeek(new Date(enrollment.created_at));
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      
      const existing = weekMap.get(weekKey) || { active: 0, total: 0 };
      existing.total += 1;
      if (enrollment.status === 'active') {
        existing.active += 1;
      }
      weekMap.set(weekKey, existing);
    });

    return Array.from(weekMap.entries()).map(([date, data]) => ({
      date,
      retentionRate: data.total > 0 ? (data.active / data.total) * 100 : 100
    })).sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Calculate trend direction from data points
   */
  private calculateTrendDirection(
    dataPoints: { date: string; value: number }[]
  ): 'increasing' | 'decreasing' | 'stable' {
    if (dataPoints.length < 2) return 'stable';

    const values = dataPoints.map(dp => dp.value);
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.ceil(values.length / 2));

    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

    const change = secondAvg - firstAvg;
    const threshold = firstAvg * 0.05; // 5% threshold

    if (change > threshold) return 'increasing';
    if (change < -threshold) return 'decreasing';
    return 'stable';
  }

  /**
   * Calculate change rate between first and last values
   */
  private calculateChangeRate(dataPoints: { date: string; value: number }[]): number {
    if (dataPoints.length < 2) return 0;

    const firstValue = dataPoints[0].value;
    const lastValue = dataPoints[dataPoints.length - 1].value;

    if (firstValue === 0) return 0;
    return ((lastValue - firstValue) / firstValue) * 100;
  }

  /**
   * Detect seasonal patterns in data
   */
  private detectSeasonality(dataPoints: { date: string; value: number }[]): SeasonalPattern | undefined {
    if (dataPoints.length < 4) return undefined;

    // Simple seasonality detection - would be enhanced with more sophisticated analysis
    const values = dataPoints.map(dp => dp.value);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;

    if (variance > mean * 0.2) { // High variance indicates potential seasonality
      return {
        pattern: 'weekly',
        description: 'Weekly attendance patterns detected',
        impact: variance / mean
      };
    }

    return undefined;
  }

  /**
   * Generate attendance predictions
   */
  private async generateAttendancePredictions(
    classId: string,
    trends: ClassAttendanceTrend[],
    attendanceRecords: AttendanceRecord[]
  ): Promise<AttendancePrediction[]> {
    const predictions: AttendancePrediction[] = [];

    // Next month attendance prediction
    const attendanceTrend = trends.find(t => t.metric === 'attendance_rate');
    if (attendanceTrend && attendanceTrend.dataPoints.length >= 4) {
      const currentRate = attendanceTrend.dataPoints[attendanceTrend.dataPoints.length - 1].value;
      const predictedRate = this.extrapolateValue(
        attendanceTrend.dataPoints.map(dp => dp.value),
        4 // 4 weeks ahead
      );

      const factors: PredictionFactor[] = [
        {
          factor: 'Historical Trend',
          impact: Math.abs(attendanceTrend.changeRate) / 100,
          description: `Attendance has been ${attendanceTrend.trend} by ${Math.abs(attendanceTrend.changeRate).toFixed(1)}%`
        },
        {
          factor: 'Seasonal Patterns',
          impact: attendanceTrend.seasonality ? attendanceTrend.seasonality.impact : 0.1,
          description: attendanceTrend.seasonality ? attendanceTrend.seasonality.description : 'No strong seasonal patterns'
        }
      ];

      predictions.push({
        metric: 'attendance_rate',
        predictedValue: Math.max(0, Math.min(100, predictedRate)),
        targetDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        confidence: attendanceTrend.confidence,
        factors,
        riskLevel: predictedRate < 70 ? 'high' : predictedRate < 85 ? 'medium' : 'low'
      });
    }

    // Student dropout risk prediction
    const retentionTrend = trends.find(t => t.metric === 'retention');
    if (retentionTrend) {
      const currentRetention = retentionTrend.dataPoints[retentionTrend.dataPoints.length - 1].value;
      const predictedRetention = this.extrapolateValue(
        retentionTrend.dataPoints.map(dp => dp.value),
        4
      );

      predictions.push({
        metric: 'student_retention',
        predictedValue: Math.max(0, Math.min(100, predictedRetention)),
        targetDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        confidence: retentionTrend.confidence,
        factors: [
          {
            factor: 'Retention Trend',
            impact: Math.abs(retentionTrend.changeRate) / 100,
            description: `Student retention has been ${retentionTrend.trend}`
          }
        ],
        riskLevel: predictedRetention < 80 ? 'high' : predictedRetention < 90 ? 'medium' : 'low'
      });
    }

    return predictions;
  }

  /**
   * Extrapolate future values using linear regression
   */
  private extrapolateValue(values: number[], periodsAhead: number): number {
    if (values.length < 2) return values[0] || 0;

    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + val * i, 0);
    const sumXX = values.reduce((sum, val, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return slope * (n - 1 + periodsAhead) + intercept;
  }

  /**
   * Generate class comparisons
   */
  private async generateClassComparisons(
    classId: string,
    courseType: string
  ): Promise<ClassComparison[]> {
    // Get similar classes for comparison
    const { data: similarClasses } = await supabase
      .from('classes')
      .select(`
        id,
        class_name,
        courses!inner (
          course_type
        )
      `)
      .eq('courses.course_type', courseType)
      .neq('id', classId)
      .limit(5);

    if (!similarClasses || similarClasses.length === 0) {
      return [];
    }

    const comparisons: ClassComparison[] = [];

    for (const similarClass of similarClasses) {
      try {
        const comparison = await this.compareClasses(classId, similarClass.id);
        if (comparison) {
          comparisons.push({
            comparedWithClass: {
              id: similarClass.id,
              name: similarClass.class_name,
              courseType: similarClass.courses.course_type
            },
            ...comparison
          });
        }
      } catch (error) {
        console.warn(`Failed to compare with class ${similarClass.id}:`, error);
      }
    }

    return comparisons;
  }

  /**
   * Compare two classes
   */
  private async compareClasses(
    classId1: string,
    classId2: string
  ): Promise<{
    attendanceRateDifference: number;
    significanceLevel: number;
    similarityScore: number;
    keyDifferences: string[];
    bestPractices: string[];
  } | null> {
    const endDate = new Date();
    const startDate = subMonths(endDate, 3); // Last 3 months

    // Get attendance data for both classes
    const [records1, records2] = await Promise.all([
      attendanceAnalyticsService.getAttendanceRecords({ classId: classId1, startDate, endDate }),
      attendanceAnalyticsService.getAttendanceRecords({ classId: classId2, startDate, endDate })
    ]);

    if (records1.length === 0 || records2.length === 0) {
      return null;
    }

    // Calculate attendance rates
    const rate1 = (records1.filter(r => r.status === 'present').length / records1.length) * 100;
    const rate2 = (records2.filter(r => r.status === 'present').length / records2.length) * 100;

    const attendanceRateDifference = rate1 - rate2;

    // Calculate statistical significance (simplified)
    const significanceLevel = this.calculateSignificance(records1, records2);

    // Calculate similarity score based on various factors
    const similarityScore = this.calculateSimilarityScore(records1, records2);

    // Identify key differences
    const keyDifferences = this.identifyKeyDifferences(records1, records2);

    // Extract best practices from better performing class
    const bestPractices = this.extractBestPractices(rate1 > rate2 ? records1 : records2);

    return {
      attendanceRateDifference,
      significanceLevel,
      similarityScore,
      keyDifferences,
      bestPractices
    };
  }

  /**
   * Calculate statistical significance of difference
   */
  private calculateSignificance(records1: AttendanceRecord[], records2: AttendanceRecord[]): number {
    // Simplified significance calculation
    const minSampleSize = Math.min(records1.length, records2.length);
    if (minSampleSize < 10) return 0.1; // Low confidence
    if (minSampleSize < 30) return 0.7; // Medium confidence
    return 0.9; // High confidence
  }

  /**
   * Calculate similarity score between classes
   */
  private calculateSimilarityScore(records1: AttendanceRecord[], records2: AttendanceRecord[]): number {
    // Calculate similarity based on attendance patterns
    const pattern1 = this.getAttendancePattern(records1);
    const pattern2 = this.getAttendancePattern(records2);

    // Simple similarity calculation (can be enhanced)
    const timeSimilarity = Math.abs(pattern1.averageTime - pattern2.averageTime) < 2 ? 0.3 : 0;
    const rateSimilarity = Math.abs(pattern1.attendanceRate - pattern2.attendanceRate) < 10 ? 0.4 : 0;
    const consistencySimilarity = Math.abs(pattern1.consistency - pattern2.consistency) < 0.2 ? 0.3 : 0;

    return timeSimilarity + rateSimilarity + consistencySimilarity;
  }

  /**
   * Get attendance pattern for a class
   */
  private getAttendancePattern(records: AttendanceRecord[]): {
    attendanceRate: number;
    averageTime: number;
    consistency: number;
  } {
    const presentRecords = records.filter(r => r.status === 'present');
    const attendanceRate = records.length > 0 ? (presentRecords.length / records.length) * 100 : 0;
    
    const times = records.map(r => r.booking.startTime.getHours());
    const averageTime = times.length > 0 ? times.reduce((sum, time) => sum + time, 0) / times.length : 12;
    
    const dailyRates = this.calculateDailyAttendanceRates(records);
    const consistency = this.calculateConsistencyScore(dailyRates) / 100;

    return { attendanceRate, averageTime, consistency };
  }

  /**
   * Identify key differences between classes
   */
  private identifyKeyDifferences(records1: AttendanceRecord[], records2: AttendanceRecord[]): string[] {
    const differences: string[] = [];

    const pattern1 = this.getAttendancePattern(records1);
    const pattern2 = this.getAttendancePattern(records2);

    if (Math.abs(pattern1.attendanceRate - pattern2.attendanceRate) > 15) {
      differences.push(`Significant attendance rate difference: ${Math.abs(pattern1.attendanceRate - pattern2.attendanceRate).toFixed(1)}%`);
    }

    if (Math.abs(pattern1.averageTime - pattern2.averageTime) > 3) {
      differences.push(`Different class times: ${Math.abs(pattern1.averageTime - pattern2.averageTime).toFixed(1)} hour difference`);
    }

    if (Math.abs(pattern1.consistency - pattern2.consistency) > 0.3) {
      differences.push(`Different attendance consistency patterns`);
    }

    return differences;
  }

  /**
   * Extract best practices from high-performing class
   */
  private extractBestPractices(records: AttendanceRecord[]): string[] {
    const practices: string[] = [];
    
    const dayAnalysis = this.calculateAttendanceByDayOfWeek(records);
    const bestDay = dayAnalysis.reduce((best, day) => 
      day.attendanceRate > best.attendanceRate ? day : best
    );

    const timeAnalysis = this.calculateAttendanceByTimeSlot(records);
    const bestTime = timeAnalysis.reduce((best, time) => 
      time.attendanceRate > best.attendanceRate ? time : best
    );

    if (bestDay.attendanceRate > 85) {
      practices.push(`Excellent ${bestDay.dayOfWeek} attendance (${bestDay.attendanceRate.toFixed(1)}%)`);
    }

    if (bestTime.attendanceRate > 90) {
      practices.push(`Optimal timing: ${bestTime.timeSlot} shows highest attendance`);
    }

    const pattern = this.getAttendancePattern(records);
    if (pattern.consistency > 0.8) {
      practices.push('Highly consistent attendance patterns');
    }

    return practices;
  }

  /**
   * Analyze performance impact of attendance
   */
  private async analyzePerformanceImpact(
    classId: string,
    attendanceRecords: AttendanceRecord[]
  ): Promise<PerformanceImpactAnalysis> {
    // Get student performance data
    const studentIds = [...new Set(attendanceRecords.map(r => r.student.id))];
    
    const { data: performanceData } = await supabase
      .from('lesson_progress')
      .select('student_id, score, completion_date')
      .in('student_id', studentIds)
      .not('score', 'is', null);

    // Calculate correlations (simplified)
    const correlations = this.calculatePerformanceCorrelations(attendanceRecords, performanceData || []);

    // Define attendance thresholds based on performance analysis
    const thresholds = this.calculateAttendanceThresholds(attendanceRecords, performanceData || []);

    // Identify impact factors
    const impactFactors = this.identifyImpactFactors(attendanceRecords, performanceData || []);

    return {
      correlationWithGrades: correlations.grades,
      correlationWithEngagement: correlations.engagement,
      correlationWithCompletion: correlations.completion,
      attendanceThresholds: thresholds,
      impactFactors
    };
  }

  /**
   * Calculate performance correlations
   */
  private calculatePerformanceCorrelations(
    attendanceRecords: AttendanceRecord[],
    performanceData: any[]
  ): {
    grades: number;
    engagement: number;
    completion: number;
  } {
    // Group by student
    const studentMap = new Map<string, { attendance: number; performance: number[] }>();
    
    attendanceRecords.forEach(record => {
      const studentId = record.student.id;
      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, { attendance: 0, performance: [] });
      }
      const student = studentMap.get(studentId)!;
      student.attendance += record.status === 'present' ? 1 : 0;
    });

    performanceData.forEach(performance => {
      if (studentMap.has(performance.student_id)) {
        studentMap.get(performance.student_id)!.performance.push(performance.score);
      }
    });

    // Calculate correlations (simplified Pearson correlation)
    const correlations = this.calculatePearsonCorrelation(
      Array.from(studentMap.values()).map(s => s.attendance),
      Array.from(studentMap.values()).map(s => s.performance.length > 0 ? 
        s.performance.reduce((sum, score) => sum + score, 0) / s.performance.length : 0
      )
    );

    return {
      grades: correlations,
      engagement: correlations * 0.8, // Estimated based on attendance-engagement correlation
      completion: correlations * 0.9   // Estimated based on attendance-completion correlation
    };
  }

  /**
   * Calculate Pearson correlation coefficient
   */
  private calculatePearsonCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;

    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    const sumYY = y.reduce((sum, val) => sum + val * val, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Calculate attendance thresholds for different performance levels
   */
  private calculateAttendanceThresholds(
    attendanceRecords: AttendanceRecord[],
    performanceData: any[]
  ): {
    excellentPerformance: number;
    averagePerformance: number;
    atRiskThreshold: number;
  } {
    // Analyze attendance patterns of high performers
    // This is a simplified calculation - would be enhanced with more sophisticated analysis
    
    return {
      excellentPerformance: 90, // 90%+ attendance for excellent performance
      averagePerformance: 75,   // 75%+ attendance for average performance
      atRiskThreshold: 60       // Below 60% attendance indicates at-risk
    };
  }

  /**
   * Identify impact factors
   */
  private identifyImpactFactors(
    attendanceRecords: AttendanceRecord[],
    performanceData: any[]
  ): ImpactFactor[] {
    const factors: ImpactFactor[] = [];

    // Consistency factor
    const dailyRates = this.calculateDailyAttendanceRates(attendanceRecords);
    const consistency = this.calculateConsistencyScore(dailyRates);
    
    factors.push({
      factor: 'Attendance Consistency',
      impact: consistency > 70 ? 'positive' : 'negative',
      strength: Math.abs(consistency - 50) / 50,
      description: `${consistency > 70 ? 'High' : 'Low'} consistency in attendance patterns`
    });

    // Timing factor
    const timeAnalysis = this.calculateAttendanceByTimeSlot(attendanceRecords);
    const bestTimeSlot = timeAnalysis.reduce((best, slot) => 
      slot.attendanceRate > best.attendanceRate ? slot : best
    );

    if (bestTimeSlot.attendanceRate > 85) {
      factors.push({
        factor: 'Optimal Timing',
        impact: 'positive',
        strength: (bestTimeSlot.attendanceRate - 50) / 50,
        description: `Strong performance during ${bestTimeSlot.timeSlot}`
      });
    }

    return factors;
  }

  /**
   * Generate attendance recommendations
   */
  private async generateAttendanceRecommendations(
    classId: string,
    metrics: ClassAttendanceMetrics,
    trends: ClassAttendanceTrend[],
    performanceImpact: PerformanceImpactAnalysis
  ): Promise<AttendanceRecommendation[]> {
    const recommendations: AttendanceRecommendation[] = [];

    // Low attendance rate recommendation
    if (metrics.averageAttendanceRate < 75) {
      recommendations.push({
        type: 'intervention',
        priority: metrics.averageAttendanceRate < 60 ? 'critical' : 'high',
        title: 'Improve Class Attendance Rate',
        description: `Current attendance rate of ${metrics.averageAttendanceRate.toFixed(1)}% is below target. Immediate intervention required.`,
        expectedImpact: 0.8,
        implementationEffort: 'medium',
        actions: [
          {
            action: 'analyze_attendance_barriers',
            assignedTo: 'teacher',
            deadline: format(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
            parameters: { classId, attendanceRate: metrics.averageAttendanceRate }
          },
          {
            action: 'implement_attendance_incentives',
            assignedTo: 'academic_coordinator',
            deadline: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
            parameters: { classId }
          }
        ]
      });
    }

    // Schedule optimization recommendation
    const lowAttendanceDays = metrics.attendanceByDayOfWeek
      .filter(day => day.attendanceRate < 70)
      .map(day => day.dayOfWeek);

    if (lowAttendanceDays.length > 0) {
      recommendations.push({
        type: 'schedule_optimization',
        priority: 'medium',
        title: 'Optimize Class Schedule',
        description: `Poor attendance on ${lowAttendanceDays.join(', ')}. Consider schedule adjustments.`,
        expectedImpact: 0.6,
        implementationEffort: 'high',
        actions: [
          {
            action: 'analyze_schedule_preferences',
            assignedTo: 'scheduling_team',
            deadline: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
            parameters: { classId, problematicDays: lowAttendanceDays }
          }
        ]
      });
    }

    // Consistency improvement recommendation
    if (metrics.attendanceConsistency < 60) {
      recommendations.push({
        type: 'engagement_improvement',
        priority: 'medium',
        title: 'Improve Attendance Consistency',
        description: 'Irregular attendance patterns detected. Focus on engagement and motivation.',
        expectedImpact: 0.5,
        implementationEffort: 'medium',
        actions: [
          {
            action: 'implement_engagement_strategies',
            assignedTo: 'teacher',
            deadline: format(new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
            parameters: { classId, consistencyScore: metrics.attendanceConsistency }
          }
        ]
      });
    }

    // Chronic absenteeism intervention
    if (metrics.chronicallyAbsentStudents > 0) {
      recommendations.push({
        type: 'intervention',
        priority: 'high',
        title: 'Address Chronic Absenteeism',
        description: `${metrics.chronicallyAbsentStudents} students with chronic attendance issues require intervention.`,
        expectedImpact: 0.7,
        implementationEffort: 'high',
        actions: [
          {
            action: 'individual_student_meetings',
            assignedTo: 'academic_advisor',
            deadline: format(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
            parameters: { classId, chronicAbsentCount: metrics.chronicallyAbsentStudents }
          }
        ]
      });
    }

    // Declining trend warning
    const attendanceTrend = trends.find(t => t.metric === 'attendance_rate');
    if (attendanceTrend && attendanceTrend.trend === 'decreasing' && attendanceTrend.changeRate < -10) {
      recommendations.push({
        type: 'intervention',
        priority: 'high',
        title: 'Address Declining Attendance Trend',
        description: `Attendance has declined by ${Math.abs(attendanceTrend.changeRate).toFixed(1)}% recently. Immediate action needed.`,
        expectedImpact: 0.8,
        implementationEffort: 'medium',
        actions: [
          {
            action: 'trend_analysis_meeting',
            assignedTo: 'department_head',
            deadline: format(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
            parameters: { classId, declineRate: attendanceTrend.changeRate }
          }
        ]
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Get start date for timeframe
   */
  private getStartDateForTimeframe(timeframe: string, endDate: Date): Date {
    switch (timeframe) {
      case '30_days':
        return subDays(endDate, 30);
      case '90_days':
        return subDays(endDate, 90);
      case '180_days':
        return subDays(endDate, 180);
      default:
        return subDays(endDate, 90);
    }
  }

  /**
   * Get attendance pattern analysis
   */
  async getAttendancePatternAnalysis(classId: string): Promise<AttendancePatternAnalysis> {
    const endDate = new Date();
    const startDate = subMonths(endDate, 6); // 6 months of data

    const attendanceRecords = await attendanceAnalyticsService.getAttendanceRecords({
      classId,
      startDate,
      endDate
    });

    const patterns = this.detectAttendancePatterns(attendanceRecords);
    const anomalies = this.detectAttendanceAnomalies(attendanceRecords);
    const insights = this.generateAttendanceInsights(attendanceRecords, patterns, anomalies);

    return { patterns, anomalies, insights };
  }

  /**
   * Detect attendance patterns
   */
  private detectAttendancePatterns(records: AttendanceRecord[]): AttendancePattern[] {
    const patterns: AttendancePattern[] = [];

    // Weekly pattern analysis
    const weeklyData = this.groupRecordsByWeek(records);
    if (weeklyData.length >= 4) {
      const weeklyVariance = this.calculateVariance(weeklyData.map(w => w.attendanceRate));
      if (weeklyVariance < 100) { // Low variance indicates pattern
        patterns.push({
          type: 'recurring',
          description: 'Consistent weekly attendance pattern',
          confidence: Math.max(0.6, 1 - (weeklyVariance / 100)),
          frequency: 'weekly',
          impact: 'positive'
        });
      }
    }

    // Day of week pattern
    const dayAnalysis = this.calculateAttendanceByDayOfWeek(records);
    const dayVariance = this.calculateVariance(dayAnalysis.map(d => d.attendanceRate));
    if (dayVariance > 200) { // High variance indicates strong day preferences
      patterns.push({
        type: 'cyclical',
        description: 'Strong day-of-week attendance preferences',
        confidence: Math.min(0.9, dayVariance / 300),
        frequency: 'daily',
        impact: dayAnalysis.some(d => d.attendanceRate > 85) ? 'positive' : 'negative'
      });
    }

    return patterns;
  }

  /**
   * Detect attendance anomalies
   */
  private detectAttendanceAnomalies(records: AttendanceRecord[]): AttendanceAnomaly[] {
    const anomalies: AttendanceAnomaly[] = [];
    const dailyRates = this.calculateDailyAttendanceRates(records);
    
    if (dailyRates.length < 7) return anomalies; // Need sufficient data

    const mean = dailyRates.reduce((sum, rate) => sum + rate, 0) / dailyRates.length;
    const stdDev = Math.sqrt(this.calculateVariance(dailyRates));

    // Detect outliers (more than 2 standard deviations from mean)
    const dailyData = this.groupRecordsByDay(records);
    
    dailyData.forEach(day => {
      const deviation = Math.abs(day.attendanceRate - mean);
      if (deviation > 2 * stdDev) {
        const type = day.attendanceRate > mean ? 'spike' : 'drop';
        const severity = deviation > 3 * stdDev ? 'high' : 'medium';
        
        anomalies.push({
          date: day.date,
          type,
          severity,
          description: `${type === 'spike' ? 'Unusually high' : 'Unusually low'} attendance: ${day.attendanceRate.toFixed(1)}%`,
          possibleCauses: this.suggestAnomalyCauses(type, day.date)
        });
      }
    });

    return anomalies;
  }

  /**
   * Group records by day
   */
  private groupRecordsByDay(records: AttendanceRecord[]): Array<{
    date: string;
    attendanceRate: number;
  }> {
    const dayMap = new Map<string, { total: number; present: number }>();
    
    records.forEach(record => {
      const date = format(record.attendanceTime, 'yyyy-MM-dd');
      const existing = dayMap.get(date) || { total: 0, present: 0 };
      
      existing.total += 1;
      existing.present += record.status === 'present' ? 1 : 0;
      
      dayMap.set(date, existing);
    });

    return Array.from(dayMap.entries()).map(([date, data]) => ({
      date,
      attendanceRate: data.total > 0 ? (data.present / data.total) * 100 : 0
    })).sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Calculate variance of an array
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  /**
   * Suggest possible causes for anomalies
   */
  private suggestAnomalyCauses(type: 'spike' | 'drop', date: string): string[] {
    const causes: string[] = [];
    const parsedDate = new Date(date);
    const dayOfWeek = parsedDate.getDay();
    
    if (type === 'drop') {
      causes.push('Weather conditions');
      causes.push('Competing events');
      causes.push('Technical issues');
      if (dayOfWeek === 1) causes.push('Monday blues effect');
      if (dayOfWeek === 5) causes.push('Friday early departure');
    } else {
      causes.push('Special event or assignment');
      causes.push('Makeup session');
      causes.push('Improved engagement');
    }

    return causes;
  }

  /**
   * Generate attendance insights
   */
  private generateAttendanceInsights(
    records: AttendanceRecord[],
    patterns: AttendancePattern[],
    anomalies: AttendanceAnomaly[]
  ): AttendanceInsight[] {
    const insights: AttendanceInsight[] = [];

    // Overall attendance insight
    const overallRate = records.length > 0 ? 
      (records.filter(r => r.status === 'present').length / records.length) * 100 : 0;

    if (overallRate > 85) {
      insights.push({
        category: 'opportunity',
        title: 'Excellent Attendance Performance',
        description: `Class maintains excellent attendance rate of ${overallRate.toFixed(1)}%`,
        dataPoints: [`${records.filter(r => r.status === 'present').length} present out of ${records.length} sessions`],
        actionable: false
      });
    } else if (overallRate < 70) {
      insights.push({
        category: 'warning',
        title: 'Below Target Attendance',
        description: `Attendance rate of ${overallRate.toFixed(1)}% requires immediate attention`,
        dataPoints: [`Target: 85%+`, `Current: ${overallRate.toFixed(1)}%`],
        actionable: true
      });
    }

    // Pattern insights
    const consistentPattern = patterns.find(p => p.type === 'recurring');
    if (consistentPattern) {
      insights.push({
        category: 'optimization',
        title: 'Consistent Attendance Pattern Detected',
        description: 'Students show predictable attendance behavior, enabling better planning',
        dataPoints: [`Pattern confidence: ${(consistentPattern.confidence * 100).toFixed(1)}%`],
        actionable: true
      });
    }

    // Anomaly insights
    const highSeverityAnomalies = anomalies.filter(a => a.severity === 'high');
    if (highSeverityAnomalies.length > 0) {
      insights.push({
        category: 'risk',
        title: 'Attendance Volatility Detected',
        description: `${highSeverityAnomalies.length} high-impact attendance anomalies identified`,
        dataPoints: highSeverityAnomalies.map(a => `${a.date}: ${a.description}`),
        actionable: true
      });
    }

    // Time-based insights
    const timeAnalysis = this.calculateAttendanceByTimeSlot(records);
    const bestTime = timeAnalysis.reduce((best, slot) => 
      slot.attendanceRate > best.attendanceRate ? slot : best
    );

    if (bestTime.attendanceRate > 90) {
      insights.push({
        category: 'optimization',
        title: 'Optimal Time Slot Identified',
        description: `${bestTime.timeSlot} shows exceptional attendance (${bestTime.attendanceRate.toFixed(1)}%)`,
        dataPoints: [`Best performing time: ${bestTime.timeSlot}`, `Attendance rate: ${bestTime.attendanceRate.toFixed(1)}%`],
        actionable: true
      });
    }

    return insights;
  }

  /**
   * Clear cache for a specific class
   */
  clearClassCache(classId: string): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(key => key.includes(classId));
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Clear all cached data
   */
  clearAllCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const classAttendanceAnalyticsService = new ClassAttendanceAnalyticsService();