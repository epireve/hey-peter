/**
 * Teacher Performance Metrics Types
 * 
 * This file contains TypeScript interfaces and types for the teacher performance
 * metrics system including analytics, comparisons, and dashboard data.
 */

// =====================================================================================
// CORE PERFORMANCE METRICS
// =====================================================================================

export interface TeacherPerformanceMetrics {
  teacherId: string;
  teacherName: string;
  email: string;
  specializations: string[];
  experienceYears: number;
  overallRating: number;
  lastUpdated: string;
  
  // Core metrics categories
  metrics: {
    teachingEffectiveness: TeachingEffectivenessMetrics;
    studentSatisfaction: StudentSatisfactionMetrics;
    classManagement: ClassManagementMetrics;
    availability: AvailabilityMetrics;
    professionalDevelopment: ProfessionalDevelopmentMetrics;
  };
  
  // Performance trends
  trends: PerformanceTrend[];
  
  // Recommendations for improvement
  recommendations: TeacherRecommendation[];
  
  // Comparison with peers
  peerComparison?: TeacherPeerComparison;
}

export interface TeachingEffectivenessMetrics {
  studentProgressRate: number; // Percentage of students showing improvement
  lessonCompletionRate: number; // Percentage of lessons completed successfully
  averageStudentScore: number; // Average score from assessments
  learningObjectiveAchievement: number; // Percentage of learning objectives met
  adaptabilityScore: number; // Ability to teach different levels/types
  innovationScore: number; // Use of innovative teaching methods
  
  // Detailed breakdowns
  progressByLevel: Record<string, number>;
  completionByClassType: Record<string, number>;
  scoresBySubject: Record<string, number>;
}

export interface StudentSatisfactionMetrics {
  averageRating: number; // Overall student rating (1-5)
  satisfactionTrend: 'improving' | 'stable' | 'declining';
  feedbackCount: number; // Number of feedback submissions
  recommendationRate: number; // Percentage of students who would recommend
  retentionRate: number; // Percentage of students who continue with teacher
  engagementScore: number; // Student engagement level
  
  // Detailed feedback analysis
  ratingDistribution: Record<string, number>; // 1-5 star distribution
  feedbackCategories: Record<string, number>; // Positive/negative categories
  monthlyTrends: Array<{
    month: string;
    rating: number;
    feedbackCount: number;
  }>;
}

export interface ClassManagementMetrics {
  punctualityRate: number; // Percentage of on-time class starts
  attendanceRate: number; // Average student attendance in classes
  classPreparationScore: number; // Preparation quality score
  timeManagementScore: number; // Ability to manage class time effectively
  disciplineEffectiveness: number; // Classroom discipline management
  resourceUtilization: number; // Use of teaching resources
  
  // Detailed management data
  punctualityTrends: Array<{
    month: string;
    onTimeRate: number;
    averageDelay: number;
  }>;
  attendanceTrends: Array<{
    month: string;
    attendanceRate: number;
    classCount: number;
  }>;
}

export interface AvailabilityMetrics {
  schedulingFlexibility: number; // Flexibility in scheduling
  cancellationRate: number; // Percentage of cancelled classes
  substituteRequestRate: number; // Frequency of substitute requests
  peakHourAvailability: number; // Availability during peak hours
  consistencyScore: number; // Consistency in availability patterns
  responseTime: number; // Average response time to messages (hours)
  
  // Detailed availability data
  weeklyAvailability: Record<string, number>; // Availability by day of week
  monthlyConsistency: Array<{
    month: string;
    consistencyScore: number;
    totalSlots: number;
  }>;
}

export interface ProfessionalDevelopmentMetrics {
  trainingCompletionRate: number; // Percentage of required training completed
  skillImprovementRate: number; // Rate of skill improvement over time
  certificationStatus: string; // Current certification status
  mentorshipParticipation: number; // Participation in mentorship programs
  innovationContributions: number; // Contributions to teaching innovations
  leadershipActivities: number; // Leadership activities participation
  
  // Development tracking
  completedTrainings: Array<{
    title: string;
    completedAt: string;
    scoreAchieved: number;
  }>;
  skillAssessments: Array<{
    skillName: string;
    currentLevel: number;
    improvementRate: number;
  }>;
}

// =====================================================================================
// TREND ANALYSIS
// =====================================================================================

export interface PerformanceTrend {
  metric: string;
  period: string;
  trend: 'improving' | 'stable' | 'declining';
  changeRate: number; // Percentage change
  significance: 'high' | 'medium' | 'low';
  dataPoints: Array<{
    date: string;
    value: number;
  }>;
  
  // Trend analysis
  trendAnalysis: {
    duration: string;
    strength: number;
    volatility: number;
    prediction: {
      nextPeriod: number;
      confidence: number;
    };
  };
}

// =====================================================================================
// RECOMMENDATIONS
// =====================================================================================

export interface TeacherRecommendation {
  id: string;
  type: 'training' | 'schedule_optimization' | 'support' | 'recognition' | 'improvement_plan';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  expectedImpact: number; // Expected performance improvement (0-1)
  implementationTimeframe: string;
  
  // Action items
  actions: RecommendationAction[];
  
  // Resources needed
  resources: RecommendationResource[];
  
  // Success metrics
  successMetrics: Array<{
    metric: string;
    targetValue: number;
    currentValue: number;
  }>;
}

export interface RecommendationAction {
  id: string;
  action: string;
  assignedTo: string;
  deadline: string;
  status: 'pending' | 'in_progress' | 'completed';
  parameters: Record<string, any>;
  estimatedEffort: number; // in hours
  dependencies: string[]; // Other action IDs
}

export interface RecommendationResource {
  id: string;
  type: 'training_material' | 'documentation' | 'tool' | 'mentor' | 'budget';
  name: string;
  url?: string;
  description: string;
  estimatedTime: number; // in hours
  cost?: number;
  availability: 'available' | 'limited' | 'not_available';
}

// =====================================================================================
// COMPARISON ANALYTICS
// =====================================================================================

export interface TeacherPeerComparison {
  teacherId: string;
  peerGroup: {
    criteria: string; // How peer group was selected
    size: number;
    averageExperience: number;
    averageRating: number;
  };
  
  // Ranking information
  ranking: {
    overall: number;
    percentile: number;
    outOfTotal: number;
  };
  
  // Performance vs peers
  performanceComparison: {
    teachingEffectiveness: {
      score: number;
      peerAverage: number;
      ranking: number;
    };
    studentSatisfaction: {
      score: number;
      peerAverage: number;
      ranking: number;
    };
    classManagement: {
      score: number;
      peerAverage: number;
      ranking: number;
    };
    availability: {
      score: number;
      peerAverage: number;
      ranking: number;
    };
    professionalDevelopment: {
      score: number;
      peerAverage: number;
      ranking: number;
    };
  };
  
  // Strength and improvement areas
  strengthAreas: string[];
  improvementAreas: string[];
  competitiveAdvantages: string[];
  developmentNeeds: string[];
}

export interface TeacherCohortAnalysis {
  cohortId: string;
  cohortName: string;
  totalTeachers: number;
  
  // Cohort statistics
  statistics: {
    averageRating: number;
    averageExperience: number;
    medianRating: number;
    standardDeviation: number;
  };
  
  // Performance distribution
  performanceDistribution: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
  
  // Top and bottom performers
  topPerformers: Array<{
    teacherId: string;
    teacherName: string;
    rating: number;
    rank: number;
  }>;
  
  needsAttention: Array<{
    teacherId: string;
    teacherName: string;
    rating: number;
    issues: string[];
    urgency: 'high' | 'medium' | 'low';
  }>;
  
  // Cohort insights
  commonStrengths: string[];
  commonChallenges: string[];
  
  // Cohort-wide recommendations
  recommendations: TeacherRecommendation[];
  
  // Trends
  cohortTrends: Array<{
    metric: string;
    trend: 'improving' | 'stable' | 'declining';
    monthlyData: Array<{
      month: string;
      value: number;
    }>;
  }>;
}

// =====================================================================================
// DETAILED ANALYTICS
// =====================================================================================

export interface TeacherHourAnalytics {
  teacherId: string;
  period: {
    start: string;
    end: string;
  };
  
  // Hour tracking
  totalHoursTaught: number;
  averageHoursPerWeek: number;
  peakTeachingHours: string; // Time of day
  
  // Class distribution
  classesByType: Record<string, number>;
  classesByLevel: Record<string, number>;
  studentCapacityUtilization: number;
  
  // Compensation analytics
  totalEarnings: number;
  averageHourlyRate: number;
  bonusEarnings: number;
  
  // Efficiency metrics
  preparationTimeRatio: number;
  teachingEfficiencyScore: number;
  utilizationRate: number;
}

export interface StudentFeedbackAnalytics {
  teacherId: string;
  period: {
    start: string;
    end: string;
  };
  
  // Feedback overview
  totalFeedbackReceived: number;
  averageRating: number;
  responseRate: number;
  
  // Detailed feedback analysis
  feedbackByCategory: Record<string, {
    averageScore: number;
    count: number;
    trend: 'improving' | 'stable' | 'declining';
  }>;
  
  // Sentiment analysis
  sentimentAnalysis: {
    positive: number;
    neutral: number;
    negative: number;
    commonPositiveThemes: string[];
    commonNegativeThemes: string[];
  };
  
  // Feedback trends
  monthlyFeedbackTrends: Array<{
    month: string;
    averageRating: number;
    feedbackCount: number;
    positivePercentage: number;
  }>;
}

export interface AttendanceAnalytics {
  teacherId: string;
  period: {
    start: string;
    end: string;
  };
  
  // Attendance metrics
  averageAttendanceRate: number;
  classesWithPerfectAttendance: number;
  classesWithLowAttendance: number;
  
  // Attendance patterns
  attendanceByDayOfWeek: Record<string, number>;
  attendanceByTimeSlot: Record<string, number>;
  attendanceByClassType: Record<string, number>;
  
  // Impact on student outcomes
  attendanceImpactOnProgress: number;
  attendanceRetentionCorrelation: number;
}

// =====================================================================================
// DASHBOARD DATA
// =====================================================================================

export interface TeacherPerformanceDashboard {
  overview: {
    totalTeachers: number;
    averageRating: number;
    highPerformers: number;
    needsAttention: number;
    monthlyChange: number;
  };
  
  // Key metrics
  keyMetrics: Array<{
    name: string;
    value: number;
    unit: string;
    trend: 'up' | 'down' | 'stable';
    changePercentage: number;
  }>;
  
  // Performance distribution
  performanceDistribution: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
  
  // Recent activities
  recentActivities: Array<{
    type: string;
    teacherId: string;
    teacherName: string;
    description: string;
    timestamp: string;
  }>;
  
  // Alerts and notifications
  alerts: Array<{
    type: 'performance_decline' | 'missed_training' | 'high_cancellation' | 'positive_feedback';
    teacherId: string;
    teacherName: string;
    message: string;
    priority: 'high' | 'medium' | 'low';
    timestamp: string;
  }>;
}

export interface TeacherIndividualDashboard {
  teacherId: string;
  teacherName: string;
  
  // Performance summary
  performanceSummary: {
    overallRating: number;
    ranking: number;
    percentile: number;
    lastUpdate: string;
  };
  
  // Quick metrics
  quickMetrics: Array<{
    name: string;
    value: number;
    unit: string;
    status: 'good' | 'warning' | 'critical';
    benchmark: number;
  }>;
  
  // Recent performance
  recentPerformance: Array<{
    date: string;
    metric: string;
    value: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  
  // Goals and targets
  goalsAndTargets: Array<{
    goal: string;
    target: number;
    current: number;
    progress: number;
    deadline: string;
  }>;
  
  // Recommendations
  activeRecommendations: TeacherRecommendation[];
}

// =====================================================================================
// FILTERING AND SEARCH
// =====================================================================================

export interface TeacherPerformanceFilters {
  // Basic filters
  teacherIds?: string[];
  specializations?: string[];
  experienceRange?: {
    min: number;
    max: number;
  };
  ratingRange?: {
    min: number;
    max: number;
  };
  
  // Performance filters
  performanceLevel?: 'high' | 'medium' | 'low';
  needsAttention?: boolean;
  hasActiveRecommendations?: boolean;
  
  // Time filters
  dateRange?: {
    start: string;
    end: string;
  };
  
  // Status filters
  certificationStatus?: string[];
  trainingStatus?: 'completed' | 'in_progress' | 'overdue';
  
  // Location and availability
  location?: string[];
  availabilityLevel?: 'high' | 'medium' | 'low';
}

export interface TeacherPerformanceSort {
  field: string;
  order: 'asc' | 'desc';
}

export interface TeacherPerformanceSearchResult {
  teachers: TeacherPerformanceMetrics[];
  totalCount: number;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  aggregations: {
    averageRating: number;
    totalHoursTaught: number;
    topSpecializations: Array<{
      specialization: string;
      count: number;
    }>;
  };
}

// =====================================================================================
// EXPORT AND REPORTING
// =====================================================================================

export interface TeacherPerformanceReport {
  reportId: string;
  generatedAt: string;
  generatedBy: string;
  reportType: 'individual' | 'cohort' | 'comparative' | 'comprehensive';
  
  // Report parameters
  parameters: {
    teacherIds: string[];
    dateRange: {
      start: string;
      end: string;
    };
    includeMetrics: string[];
    format: 'pdf' | 'excel' | 'csv';
  };
  
  // Report data
  data: {
    summary: Record<string, any>;
    details: TeacherPerformanceMetrics[];
    charts: Array<{
      type: string;
      title: string;
      data: any[];
    }>;
    recommendations: TeacherRecommendation[];
  };
  
  // Export information
  exportInfo: {
    fileUrl?: string;
    fileSize?: number;
    expiresAt?: string;
    downloadCount: number;
  };
}

// =====================================================================================
// UTILITIES AND CONSTANTS
// =====================================================================================

export const PERFORMANCE_RATING_THRESHOLDS = {
  EXCELLENT: 90,
  GOOD: 80,
  SATISFACTORY: 70,
  NEEDS_IMPROVEMENT: 60,
  UNSATISFACTORY: 50
} as const;

export const PERFORMANCE_CATEGORIES = {
  TEACHING_EFFECTIVENESS: 'Teaching Effectiveness',
  STUDENT_SATISFACTION: 'Student Satisfaction',
  CLASS_MANAGEMENT: 'Class Management',
  AVAILABILITY: 'Availability',
  PROFESSIONAL_DEVELOPMENT: 'Professional Development'
} as const;

export const TREND_INDICATORS = {
  IMPROVING: 'improving',
  STABLE: 'stable',
  DECLINING: 'declining'
} as const;

export const RECOMMENDATION_TYPES = {
  TRAINING: 'training',
  SCHEDULE_OPTIMIZATION: 'schedule_optimization',
  SUPPORT: 'support',
  RECOGNITION: 'recognition',
  IMPROVEMENT_PLAN: 'improvement_plan'
} as const;

export const PRIORITY_LEVELS = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
} as const;

export const PERFORMANCE_LEVEL_COLORS = {
  high: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-red-100 text-red-800'
} as const;

export const TREND_COLORS = {
  improving: 'text-green-600',
  stable: 'text-gray-600',
  declining: 'text-red-600'
} as const;

export const RECOMMENDATION_TYPE_COLORS = {
  training: 'bg-blue-100 text-blue-800',
  schedule_optimization: 'bg-purple-100 text-purple-800',
  support: 'bg-orange-100 text-orange-800',
  recognition: 'bg-green-100 text-green-800',
  improvement_plan: 'bg-red-100 text-red-800'
} as const;