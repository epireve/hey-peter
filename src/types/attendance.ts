export interface AttendanceRecord {
  id: string;
  attendanceTime: Date;
  status: 'present' | 'absent' | 'late' | 'excused';
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

export interface AttendanceFilters {
  startDate?: Date;
  endDate?: Date;
  teacherId?: string;
  classId?: string;
  courseType?: string;
  status?: 'present' | 'absent' | 'late' | 'excused';
  period?: 'daily' | 'weekly' | 'monthly' | 'custom';
}

export interface AttendanceStats {
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

// Enhanced types for Class Attendance Analytics
export interface ClassAttendanceAnalytics {
  classId: string;
  className: string;
  courseType: string;
  teacher: {
    id: string;
    fullName: string;
  };
  attendanceMetrics: ClassAttendanceMetrics;
  trends: ClassAttendanceTrend[];
  predictions: AttendancePrediction[];
  comparisons: ClassComparison[];
  performanceImpact: PerformanceImpactAnalysis;
  recommendations: AttendanceRecommendation[];
  lastUpdated: string;
}

export interface ClassAttendanceMetrics {
  totalSessions: number;
  averageAttendanceRate: number;
  attendanceConsistency: number; // Variance in attendance rates
  peakAttendanceRate: number;
  lowestAttendanceRate: number;
  attendanceByDayOfWeek: DayOfWeekAttendance[];
  attendanceByTimeSlot: TimeSlotAttendance[];
  studentRetentionRate: number;
  chronicallyAbsentStudents: number;
  improvingStudents: number;
  decliningStudents: number;
}

export interface DayOfWeekAttendance {
  dayOfWeek: string;
  attendanceRate: number;
  totalSessions: number;
  averageStudents: number;
}

export interface TimeSlotAttendance {
  timeSlot: string;
  attendanceRate: number;
  totalSessions: number;
  energyLevel: number; // Based on participation
}

export interface ClassAttendanceTrend {
  metric: 'attendance_rate' | 'punctuality' | 'engagement' | 'retention';
  timeframe: '7_days' | '30_days' | '90_days';
  trend: 'increasing' | 'decreasing' | 'stable';
  changeRate: number;
  confidence: number;
  dataPoints: { date: string; value: number }[];
  seasonality?: SeasonalPattern;
}

export interface SeasonalPattern {
  pattern: 'weekly' | 'monthly' | 'holiday_effect';
  description: string;
  impact: number;
}

export interface AttendancePrediction {
  metric: string;
  predictedValue: number;
  targetDate: string;
  confidence: number;
  factors: PredictionFactor[];
  riskLevel: 'low' | 'medium' | 'high';
}

export interface PredictionFactor {
  factor: string;
  impact: number;
  description: string;
}

export interface ClassComparison {
  comparedWithClass: {
    id: string;
    name: string;
    courseType: string;
  };
  attendanceRateDifference: number;
  significanceLevel: number;
  similarityScore: number;
  keyDifferences: string[];
  bestPractices: string[];
}

export interface PerformanceImpactAnalysis {
  correlationWithGrades: number;
  correlationWithEngagement: number;
  correlationWithCompletion: number;
  attendanceThresholds: {
    excellentPerformance: number; // Attendance rate for excellent performance
    averagePerformance: number;
    atRiskThreshold: number;
  };
  impactFactors: ImpactFactor[];
}

export interface ImpactFactor {
  factor: string;
  impact: 'positive' | 'negative';
  strength: number;
  description: string;
}

export interface AttendanceRecommendation {
  type: 'schedule_optimization' | 'engagement_improvement' | 'intervention' | 'policy_change';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  expectedImpact: number;
  implementationEffort: 'low' | 'medium' | 'high';
  targetStudents?: string[];
  actions: RecommendationAction[];
}

export interface RecommendationAction {
  action: string;
  assignedTo: string;
  deadline: string;
  parameters: Record<string, any>;
}

export interface AttendancePatternAnalysis {
  patterns: AttendancePattern[];
  anomalies: AttendanceAnomaly[];
  insights: AttendanceInsight[];
}

export interface AttendancePattern {
  type: 'recurring' | 'seasonal' | 'trend' | 'cyclical';
  description: string;
  confidence: number;
  frequency: string;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface AttendanceAnomaly {
  date: string;
  type: 'spike' | 'drop' | 'unusual_pattern';
  severity: 'low' | 'medium' | 'high';
  description: string;
  possibleCauses: string[];
}

export interface AttendanceInsight {
  category: 'optimization' | 'risk' | 'opportunity' | 'warning';
  title: string;
  description: string;
  dataPoints: string[];
  actionable: boolean;
}