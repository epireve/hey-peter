/**
 * TypeScript types for the Feedback and Rating System
 */

// Base feedback types
export interface BaseEntity {
  id?: string;
  created_at?: string;
  updated_at?: string;
}

// Student Feedback Types
export interface StudentFeedback extends BaseEntity {
  student_id: string;
  class_id?: string;
  teacher_id?: string;
  booking_id?: string;
  
  // Rating categories (1-5 scale)
  overall_rating?: number;
  teaching_quality_rating?: number;
  class_content_rating?: number;
  engagement_rating?: number;
  punctuality_rating?: number;
  
  // Textual feedback
  positive_feedback?: string;
  improvement_suggestions?: string;
  learning_objectives_met?: boolean;
  would_recommend?: boolean;
  
  // Metadata
  feedback_type?: FeedbackType;
  is_anonymous?: boolean;
  submission_method?: SubmissionMethod;
}

// Teacher Feedback Types
export interface TeacherFeedback extends BaseEntity {
  teacher_id: string;
  student_id: string;
  class_id?: string;
  booking_id?: string;
  
  // Performance ratings (1-5 scale)
  participation_rating?: number;
  comprehension_rating?: number;
  pronunciation_rating?: number;
  homework_completion_rating?: number;
  progress_rating?: number;
  
  // Detailed feedback
  strengths?: string;
  areas_for_improvement?: string;
  lesson_notes?: string;
  homework_assigned?: string;
  next_lesson_goals?: string;
  
  // Progress tracking
  unit_completed?: number;
  lesson_completed?: number;
  lesson_objectives_met?: boolean;
  attendance_quality?: AttendanceQuality;
  
  // Recommendations
  recommended_study_hours?: number;
  recommended_next_level?: string;
  needs_additional_support?: boolean;
}

// Course Feedback Types
export interface CourseFeedback extends BaseEntity {
  student_id: string;
  course_id: string;
  
  // Course ratings (1-5 scale)
  course_structure_rating?: number;
  material_quality_rating?: number;
  difficulty_level_rating?: number;
  pace_rating?: number;
  overall_satisfaction?: number;
  
  // Detailed feedback
  most_helpful_aspects?: string;
  least_helpful_aspects?: string;
  suggested_improvements?: string;
  additional_topics_wanted?: string;
  
  // Course completion data
  completion_percentage?: number;
  completion_date?: string;
  would_retake_course?: boolean;
  would_recommend_course?: boolean;
}

// Feedback Response Types
export interface FeedbackResponse extends BaseEntity {
  original_feedback_id: string;
  original_feedback_type: FeedbackResponseType;
  responder_id: string;
  responder_role: string;
  response_text: string;
  action_taken?: string;
  follow_up_required?: boolean;
  follow_up_date?: string;
}

// Analytics Types
export interface TeacherRatingAnalytics extends BaseEntity {
  teacher_id: string;
  analysis_month: string;
  total_feedback_count: number;
  
  // Average ratings
  avg_overall_rating?: number;
  avg_teaching_quality?: number;
  avg_class_content?: number;
  avg_engagement?: number;
  avg_punctuality?: number;
  
  // Student performance metrics
  avg_student_participation?: number;
  avg_student_comprehension?: number;
  avg_student_progress?: number;
  
  // Trend analysis
  rating_trend?: TrendDirection;
  previous_month_avg?: number;
}

export interface CourseRatingAnalytics extends BaseEntity {
  course_id: string;
  analysis_month: string;
  total_feedback_count: number;
  completion_rate?: number;
  
  // Average ratings
  avg_course_structure?: number;
  avg_material_quality?: number;
  avg_difficulty_level?: number;
  avg_pace?: number;
  avg_overall_satisfaction?: number;
  
  // Recommendation metrics
  recommendation_rate?: number;
  retake_rate?: number;
}

export interface StudentPerformanceAnalytics extends BaseEntity {
  student_id: string;
  analysis_month: string;
  
  // Average ratings received from teachers
  avg_participation?: number;
  avg_comprehension?: number;
  avg_pronunciation?: number;
  avg_homework_completion?: number;
  avg_progress?: number;
  
  // Feedback given
  feedback_given_count: number;
  avg_rating_given?: number;
  
  // Progress indicators
  improvement_trend?: TrendDirection;
  needs_support?: boolean;
}

// Alert Types
export interface FeedbackAlert extends BaseEntity {
  user_id: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  
  // Related entities
  related_feedback_id?: string;
  related_feedback_type?: string;
  related_student_id?: string;
  related_teacher_id?: string;
  related_class_id?: string;
  
  // Status
  is_read?: boolean;
  is_acknowledged?: boolean;
  action_taken?: string;
}

// Notification Settings
export interface FeedbackNotificationSettings extends BaseEntity {
  user_id: string;
  
  // Notification preferences
  email_notifications?: boolean;
  in_app_notifications?: boolean;
  sms_notifications?: boolean;
  
  // Frequency settings
  immediate_feedback_alerts?: boolean;
  weekly_summary?: boolean;
  monthly_analytics?: boolean;
  
  // Threshold settings
  low_rating_threshold?: number;
  alert_on_negative_feedback?: boolean;
  alert_on_improvement_needed?: boolean;
}

// Recommendation Types
export interface TeacherRecommendation extends BaseEntity {
  student_id: string;
  recommended_teacher_id: string;
  compatibility_score?: number;
  based_on_ratings?: boolean;
  based_on_learning_style?: boolean;
  based_on_schedule?: boolean;
  reason?: string;
  confidence_level?: number;
  status?: RecommendationStatus;
  generated_at?: string;
  expires_at?: string;
}

export interface CourseRecommendation extends BaseEntity {
  student_id: string;
  recommended_course_id: string;
  performance_based?: boolean;
  feedback_based?: boolean;
  progress_based?: boolean;
  readiness_score?: number;
  expected_success_rate?: number;
  reason?: string;
  prerequisites_met?: boolean;
  status?: RecommendationStatus;
  generated_at?: string;
  expires_at?: string;
}

// Template Types
export interface FeedbackTemplate extends BaseEntity {
  template_name: string;
  template_type: FeedbackType;
  questions: FeedbackQuestion[];
  rating_categories?: RatingCategory;
  is_active?: boolean;
  is_default?: boolean;
  target_user_role?: string;
}

export interface FeedbackPrompt extends BaseEntity {
  prompt_name: string;
  trigger_event: string;
  delay_minutes?: number;
  expiry_days?: number;
  max_reminders?: number;
  reminder_interval_days?: number;
  target_user_role: string;
  template_id?: string;
  conditions?: Record<string, any>;
  is_active?: boolean;
}

// Question and Rating Types
export interface FeedbackQuestion {
  id: string;
  type: 'rating' | 'text' | 'boolean' | 'multiple_choice';
  question: string;
  required: boolean;
  options?: string[];
  min_rating?: number;
  max_rating?: number;
}

export interface RatingCategory {
  [key: string]: string;
}

// Analytics and Reporting Types
export interface FeedbackAnalytics {
  period: string;
  total_feedback_count: number;
  average_rating: number;
  rating_distribution: RatingDistribution;
  sentiment_analysis: SentimentAnalysis;
  top_strengths: string[];
  common_improvements: string[];
  trends: FeedbackTrends;
}

export interface RatingDistribution {
  [rating: number]: number;
}

export interface SentimentAnalysis {
  positive: number;
  neutral: number;
  negative: number;
}

export interface FeedbackTrends {
  rating_trend: TrendDirection;
  feedback_volume_trend: VolumeDirection;
}

export interface StudentProgressSummary {
  avg_ratings_received: { [category: string]: number };
  improvement_trend: TrendDirection;
  strengths: string[];
  areas_for_improvement: string[];
  teacher_recommendations: string[];
}

// Extended Types with Relations
export interface StudentFeedbackWithRelations extends StudentFeedback {
  student?: {
    id: string;
    full_name: string;
    email: string;
    student_id?: string;
  };
  teacher?: {
    id: string;
    full_name: string;
    email: string;
  };
  class?: {
    id: string;
    class_name: string;
    course?: {
      id: string;
      title: string;
      course_type: string;
    };
  };
  booking?: {
    id: string;
    booking_date: string;
    start_time: string;
    end_time: string;
  };
  responses?: FeedbackResponse[];
}

export interface TeacherFeedbackWithRelations extends TeacherFeedback {
  teacher?: {
    id: string;
    full_name: string;
    email: string;
  };
  student?: {
    id: string;
    full_name: string;
    email: string;
    student_id: string;
  };
  class?: {
    id: string;
    class_name: string;
    course?: {
      id: string;
      title: string;
    };
  };
}

export interface CourseFeedbackWithRelations extends CourseFeedback {
  student?: {
    id: string;
    full_name: string;
    email: string;
  };
  course?: {
    id: string;
    title: string;
    course_type: string;
    description?: string;
  };
}

export interface TeacherRecommendationWithRelations extends TeacherRecommendation {
  recommended_teacher?: {
    id: string;
    full_name: string;
    email: string;
    bio?: string;
    hourly_rate?: number;
  };
}

export interface CourseRecommendationWithRelations extends CourseRecommendation {
  recommended_course?: {
    id: string;
    title: string;
    description?: string;
    course_type: string;
    duration_minutes: number;
  };
}

// Filter Types
export interface StudentFeedbackFilters {
  student_id?: string;
  teacher_id?: string;
  class_id?: string;
  feedback_type?: FeedbackType;
  rating_min?: number;
  rating_max?: number;
  date_from?: string;
  date_to?: string;
  is_anonymous?: boolean;
  submission_method?: SubmissionMethod;
  limit?: number;
  offset?: number;
}

export interface TeacherFeedbackFilters {
  teacher_id?: string;
  student_id?: string;
  class_id?: string;
  rating_min?: number;
  date_from?: string;
  date_to?: string;
  attendance_quality?: AttendanceQuality;
  needs_support?: boolean;
  limit?: number;
  offset?: number;
}

export interface CourseFeedbackFilters {
  student_id?: string;
  course_id?: string;
  rating_min?: number;
  completion_percentage_min?: number;
  date_from?: string;
  date_to?: string;
  would_recommend?: boolean;
  limit?: number;
  offset?: number;
}

export interface FeedbackAlertFilters {
  user_id?: string;
  alert_type?: AlertType;
  severity?: AlertSeverity;
  is_read?: boolean;
  is_acknowledged?: boolean;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

// API Response Types
export interface FeedbackListResponse<T> {
  data: T[];
  count: number;
  page?: number;
  total_pages?: number;
}

export interface FeedbackSubmissionResponse {
  success: boolean;
  feedback_id: string;
  message?: string;
  recommendations_generated?: boolean;
  alerts_created?: boolean;
}

export interface AnalyticsResponse {
  analytics: FeedbackAnalytics;
  comparisons?: {
    previous_period: FeedbackAnalytics;
    department_average?: number;
    institution_average?: number;
  };
}

// Enum Types
export type FeedbackType = 'class_feedback' | 'teacher_feedback' | 'course_feedback';
export type FeedbackResponseType = 'student_feedback' | 'teacher_feedback' | 'course_feedback';
export type SubmissionMethod = 'manual' | 'automated' | 'prompted';
export type AttendanceQuality = 'excellent' | 'good' | 'fair' | 'poor';
export type TrendDirection = 'improving' | 'stable' | 'declining';
export type VolumeDirection = 'increasing' | 'stable' | 'decreasing';
export type RecommendationStatus = 'active' | 'accepted' | 'declined' | 'expired';
export type AlertType = 'low_rating' | 'negative_feedback' | 'improvement_needed' | 'positive_feedback' | 'milestone_reached';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

// Form Validation Types
export interface FeedbackFormData {
  ratings: { [key: string]: number };
  text_fields: { [key: string]: string };
  boolean_fields: { [key: string]: boolean };
  multiple_choice: { [key: string]: string };
}

export interface FeedbackValidationError {
  field: string;
  message: string;
  code: string;
}

export interface FeedbackSubmissionRequest {
  feedback_type: FeedbackType;
  template_id?: string;
  form_data: FeedbackFormData;
  metadata?: {
    class_id?: string;
    teacher_id?: string;
    student_id?: string;
    course_id?: string;
    booking_id?: string;
    is_anonymous?: boolean;
  };
}

// Dashboard Types
export interface FeedbackDashboardData {
  summary: {
    total_feedback: number;
    average_rating: number;
    positive_feedback_percentage: number;
    response_rate: number;
  };
  recent_feedback: StudentFeedbackWithRelations[];
  alerts: FeedbackAlert[];
  analytics: FeedbackAnalytics;
  recommendations: {
    teachers: TeacherRecommendationWithRelations[];
    courses: CourseRecommendationWithRelations[];
  };
  trends: {
    rating_trend: TrendDirection;
    volume_trend: VolumeDirection;
    improvement_areas: string[];
  };
}

// Chart Data Types
export interface RatingChartData {
  period: string;
  average_rating: number;
  feedback_count: number;
  rating_distribution: { rating: number; count: number }[];
}

export interface TrendChartData {
  date: string;
  rating: number;
  volume: number;
}

export interface ComparisonChartData {
  category: string;
  current_period: number;
  previous_period: number;
  department_average?: number;
}

// Export Types
export interface FeedbackExportOptions {
  format: 'csv' | 'excel' | 'pdf';
  date_range: {
    start: string;
    end: string;
  };
  filters: {
    feedback_types: FeedbackType[];
    rating_range?: { min: number; max: number };
    include_anonymous?: boolean;
    include_responses?: boolean;
  };
  columns: string[];
  group_by?: 'teacher' | 'course' | 'student' | 'date';
}

export interface FeedbackReport {
  title: string;
  generated_at: string;
  period: string;
  summary: FeedbackAnalytics;
  detailed_data: any[];
  charts: {
    [chart_name: string]: any;
  };
  recommendations: string[];
}

// Notification Types
export interface FeedbackNotification {
  id: string;
  type: 'feedback_received' | 'feedback_response' | 'alert_generated' | 'recommendation_available';
  title: string;
  message: string;
  data: any;
  read: boolean;
  created_at: string;
}

// Real-time Update Types
export interface FeedbackRealtimeUpdate {
  event: 'feedback_created' | 'feedback_updated' | 'alert_generated' | 'recommendation_generated';
  data: any;
  timestamp: string;
  user_id?: string;
}