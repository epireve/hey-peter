/**
 * Feedback Service
 * Comprehensive service for managing all types of feedback and ratings
 */

import { createClient } from '@/lib/supabase';

// Types
export interface StudentFeedback {
  id?: string;
  student_id: string;
  class_id?: string;
  teacher_id?: string;
  booking_id?: string;
  overall_rating?: number;
  teaching_quality_rating?: number;
  class_content_rating?: number;
  engagement_rating?: number;
  punctuality_rating?: number;
  positive_feedback?: string;
  improvement_suggestions?: string;
  learning_objectives_met?: boolean;
  would_recommend?: boolean;
  feedback_type?: 'class_feedback' | 'teacher_feedback' | 'course_feedback';
  is_anonymous?: boolean;
  submission_method?: 'manual' | 'automated' | 'prompted';
  created_at?: string;
  updated_at?: string;
}

export interface TeacherFeedback {
  id?: string;
  teacher_id: string;
  student_id: string;
  class_id?: string;
  booking_id?: string;
  participation_rating?: number;
  comprehension_rating?: number;
  pronunciation_rating?: number;
  homework_completion_rating?: number;
  progress_rating?: number;
  strengths?: string;
  areas_for_improvement?: string;
  lesson_notes?: string;
  homework_assigned?: string;
  next_lesson_goals?: string;
  unit_completed?: number;
  lesson_completed?: number;
  lesson_objectives_met?: boolean;
  attendance_quality?: 'excellent' | 'good' | 'fair' | 'poor';
  recommended_study_hours?: number;
  recommended_next_level?: string;
  needs_additional_support?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CourseFeedback {
  id?: string;
  student_id: string;
  course_id: string;
  course_structure_rating?: number;
  material_quality_rating?: number;
  difficulty_level_rating?: number;
  pace_rating?: number;
  overall_satisfaction?: number;
  most_helpful_aspects?: string;
  least_helpful_aspects?: string;
  suggested_improvements?: string;
  additional_topics_wanted?: string;
  completion_percentage?: number;
  completion_date?: string;
  would_retake_course?: boolean;
  would_recommend_course?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface FeedbackResponse {
  id?: string;
  original_feedback_id: string;
  original_feedback_type: 'student_feedback' | 'teacher_feedback' | 'course_feedback';
  responder_id: string;
  responder_role: string;
  response_text: string;
  action_taken?: string;
  follow_up_required?: boolean;
  follow_up_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FeedbackAlert {
  id?: string;
  user_id: string;
  alert_type: 'low_rating' | 'negative_feedback' | 'improvement_needed' | 'positive_feedback' | 'milestone_reached';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  related_feedback_id?: string;
  related_feedback_type?: string;
  related_student_id?: string;
  related_teacher_id?: string;
  related_class_id?: string;
  is_read?: boolean;
  is_acknowledged?: boolean;
  action_taken?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TeacherRecommendation {
  id?: string;
  student_id: string;
  recommended_teacher_id: string;
  compatibility_score?: number;
  based_on_ratings?: boolean;
  based_on_learning_style?: boolean;
  based_on_schedule?: boolean;
  reason?: string;
  confidence_level?: number;
  status?: 'active' | 'accepted' | 'declined' | 'expired';
  generated_at?: string;
  expires_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CourseRecommendation {
  id?: string;
  student_id: string;
  recommended_course_id: string;
  performance_based?: boolean;
  feedback_based?: boolean;
  progress_based?: boolean;
  readiness_score?: number;
  expected_success_rate?: number;
  reason?: string;
  prerequisites_met?: boolean;
  status?: 'active' | 'enrolled' | 'declined' | 'expired';
  generated_at?: string;
  expires_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FeedbackAnalytics {
  period: string;
  total_feedback_count: number;
  average_rating: number;
  rating_distribution: { [key: number]: number };
  sentiment_analysis: {
    positive: number;
    neutral: number;
    negative: number;
  };
  top_strengths: string[];
  common_improvements: string[];
  trends: {
    rating_trend: 'improving' | 'stable' | 'declining';
    feedback_volume_trend: 'increasing' | 'stable' | 'decreasing';
  };
}

export class FeedbackService {
  private supabase = createClient();

  // Student Feedback Methods
  async createStudentFeedback(feedback: StudentFeedback): Promise<StudentFeedback> {
    const { data, error } = await this.supabase
      .from('student_feedback')
      .insert(feedback)
      .select()
      .single();

    if (error) throw error;

    // Trigger analytics update and alert generation
    await this.triggerAnalyticsUpdate('student_feedback', data.id);
    await this.checkForAlerts(data);

    return data;
  }

  async getStudentFeedback(id: string): Promise<StudentFeedback | null> {
    const { data, error } = await this.supabase
      .from('student_feedback')
      .select(`
        *,
        student:students(id, full_name, email),
        teacher:teachers(id, full_name, email),
        class:classes(id, class_name, course:courses(title)),
        booking:bookings(id, booking_date, start_time)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async updateStudentFeedback(id: string, updates: Partial<StudentFeedback>): Promise<StudentFeedback> {
    const { data, error } = await this.supabase
      .from('student_feedback')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteStudentFeedback(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('student_feedback')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async getStudentFeedbackList(filters: {
    student_id?: string;
    teacher_id?: string;
    class_id?: string;
    feedback_type?: string;
    rating_min?: number;
    rating_max?: number;
    date_from?: string;
    date_to?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ data: StudentFeedback[]; count: number }> {
    let query = this.supabase
      .from('student_feedback')
      .select(`
        *,
        student:students(id, full_name, email),
        teacher:teachers(id, full_name, email),
        class:classes(id, class_name, course:courses(title))
      `, { count: 'exact' });

    if (filters.student_id) query = query.eq('student_id', filters.student_id);
    if (filters.teacher_id) query = query.eq('teacher_id', filters.teacher_id);
    if (filters.class_id) query = query.eq('class_id', filters.class_id);
    if (filters.feedback_type) query = query.eq('feedback_type', filters.feedback_type);
    if (filters.rating_min) query = query.gte('overall_rating', filters.rating_min);
    if (filters.rating_max) query = query.lte('overall_rating', filters.rating_max);
    if (filters.date_from) query = query.gte('created_at', filters.date_from);
    if (filters.date_to) query = query.lte('created_at', filters.date_to);

    query = query.order('created_at', { ascending: false });

    if (filters.limit) query = query.limit(filters.limit);
    if (filters.offset) query = query.range(filters.offset, (filters.offset + (filters.limit || 10)) - 1);

    const { data, error, count } = await query;

    if (error) throw error;
    return { data: data || [], count: count || 0 };
  }

  // Teacher Feedback Methods
  async createTeacherFeedback(feedback: TeacherFeedback): Promise<TeacherFeedback> {
    const { data, error } = await this.supabase
      .from('teacher_feedback')
      .insert(feedback)
      .select()
      .single();

    if (error) throw error;

    await this.triggerAnalyticsUpdate('teacher_feedback', data.id);
    return data;
  }

  async getTeacherFeedback(id: string): Promise<TeacherFeedback | null> {
    const { data, error } = await this.supabase
      .from('teacher_feedback')
      .select(`
        *,
        teacher:teachers(id, full_name, email),
        student:students(id, full_name, email, student_id),
        class:classes(id, class_name, course:courses(title))
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async updateTeacherFeedback(id: string, updates: Partial<TeacherFeedback>): Promise<TeacherFeedback> {
    const { data, error } = await this.supabase
      .from('teacher_feedback')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getTeacherFeedbackList(filters: {
    teacher_id?: string;
    student_id?: string;
    class_id?: string;
    rating_min?: number;
    date_from?: string;
    date_to?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ data: TeacherFeedback[]; count: number }> {
    let query = this.supabase
      .from('teacher_feedback')
      .select(`
        *,
        teacher:teachers(id, full_name, email),
        student:students(id, full_name, email, student_id),
        class:classes(id, class_name)
      `, { count: 'exact' });

    if (filters.teacher_id) query = query.eq('teacher_id', filters.teacher_id);
    if (filters.student_id) query = query.eq('student_id', filters.student_id);
    if (filters.class_id) query = query.eq('class_id', filters.class_id);
    if (filters.rating_min) query = query.gte('progress_rating', filters.rating_min);
    if (filters.date_from) query = query.gte('created_at', filters.date_from);
    if (filters.date_to) query = query.lte('created_at', filters.date_to);

    query = query.order('created_at', { ascending: false });

    if (filters.limit) query = query.limit(filters.limit);
    if (filters.offset) query = query.range(filters.offset, (filters.offset + (filters.limit || 10)) - 1);

    const { data, error, count } = await query;

    if (error) throw error;
    return { data: data || [], count: count || 0 };
  }

  // Course Feedback Methods
  async createCourseFeedback(feedback: CourseFeedback): Promise<CourseFeedback> {
    const { data, error } = await this.supabase
      .from('course_feedback')
      .insert(feedback)
      .select()
      .single();

    if (error) throw error;
    await this.triggerAnalyticsUpdate('course_feedback', data.id);
    return data;
  }

  async getCourseFeedback(id: string): Promise<CourseFeedback | null> {
    const { data, error } = await this.supabase
      .from('course_feedback')
      .select(`
        *,
        student:students(id, full_name, email),
        course:courses(id, title, course_type)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async getCourseFeedbackList(filters: {
    student_id?: string;
    course_id?: string;
    rating_min?: number;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ data: CourseFeedback[]; count: number }> {
    let query = this.supabase
      .from('course_feedback')
      .select(`
        *,
        student:students(id, full_name, email),
        course:courses(id, title, course_type)
      `, { count: 'exact' });

    if (filters.student_id) query = query.eq('student_id', filters.student_id);
    if (filters.course_id) query = query.eq('course_id', filters.course_id);
    if (filters.rating_min) query = query.gte('overall_satisfaction', filters.rating_min);

    query = query.order('created_at', { ascending: false });

    if (filters.limit) query = query.limit(filters.limit);
    if (filters.offset) query = query.range(filters.offset, (filters.offset + (filters.limit || 10)) - 1);

    const { data, error, count } = await query;

    if (error) throw error;
    return { data: data || [], count: count || 0 };
  }

  // Feedback Response Methods
  async createFeedbackResponse(response: FeedbackResponse): Promise<FeedbackResponse> {
    const { data, error } = await this.supabase
      .from('feedback_responses')
      .insert(response)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getFeedbackResponses(feedbackId: string, feedbackType: string): Promise<FeedbackResponse[]> {
    const { data, error } = await this.supabase
      .from('feedback_responses')
      .select(`
        *,
        responder:users(id, full_name, role)
      `)
      .eq('original_feedback_id', feedbackId)
      .eq('original_feedback_type', feedbackType)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  // Alert Methods
  async createFeedbackAlert(alert: FeedbackAlert): Promise<FeedbackAlert> {
    const { data, error } = await this.supabase
      .from('feedback_alerts')
      .insert(alert)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getFeedbackAlerts(userId: string, filters: {
    is_read?: boolean;
    alert_type?: string;
    severity?: string;
    limit?: number;
  } = {}): Promise<FeedbackAlert[]> {
    let query = this.supabase
      .from('feedback_alerts')
      .select('*')
      .eq('user_id', userId);

    if (filters.is_read !== undefined) query = query.eq('is_read', filters.is_read);
    if (filters.alert_type) query = query.eq('alert_type', filters.alert_type);
    if (filters.severity) query = query.eq('severity', filters.severity);

    query = query.order('created_at', { ascending: false });

    if (filters.limit) query = query.limit(filters.limit);

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  async markAlertAsRead(alertId: string): Promise<void> {
    const { error } = await this.supabase
      .from('feedback_alerts')
      .update({ is_read: true })
      .eq('id', alertId);

    if (error) throw error;
  }

  async acknowledgeAlert(alertId: string, actionTaken?: string): Promise<void> {
    const { error } = await this.supabase
      .from('feedback_alerts')
      .update({ 
        is_acknowledged: true,
        action_taken: actionTaken
      })
      .eq('id', alertId);

    if (error) throw error;
  }

  // Recommendation Methods
  async getTeacherRecommendations(studentId: string, limit: number = 5): Promise<TeacherRecommendation[]> {
    const { data, error } = await this.supabase
      .from('teacher_recommendations')
      .select(`
        *,
        recommended_teacher:teachers(id, full_name, email, bio, hourly_rate)
      `)
      .eq('student_id', studentId)
      .eq('status', 'active')
      .order('compatibility_score', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async getCourseRecommendations(studentId: string, limit: number = 5): Promise<CourseRecommendation[]> {
    const { data, error } = await this.supabase
      .from('course_recommendations')
      .select(`
        *,
        recommended_course:courses(id, title, description, course_type, duration_minutes)
      `)
      .eq('student_id', studentId)
      .eq('status', 'active')
      .order('readiness_score', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async acceptTeacherRecommendation(recommendationId: string): Promise<void> {
    const { error } = await this.supabase
      .from('teacher_recommendations')
      .update({ status: 'accepted' })
      .eq('id', recommendationId);

    if (error) throw error;
  }

  async declineRecommendation(recommendationId: string, type: 'teacher' | 'course'): Promise<void> {
    const table = type === 'teacher' ? 'teacher_recommendations' : 'course_recommendations';
    const { error } = await this.supabase
      .from(table)
      .update({ status: 'declined' })
      .eq('id', recommendationId);

    if (error) throw error;
  }

  // Analytics Methods
  async getTeacherFeedbackAnalytics(teacherId: string, period: 'month' | 'quarter' | 'year' = 'month'): Promise<FeedbackAnalytics> {
    const dateFilter = this.getPeriodFilter(period);
    
    const { data: feedbackData, error } = await this.supabase
      .from('student_feedback')
      .select('overall_rating, positive_feedback, improvement_suggestions, created_at')
      .eq('teacher_id', teacherId)
      .gte('created_at', dateFilter);

    if (error) throw error;

    return this.processFeedbackAnalytics(feedbackData || [], period);
  }

  async getCourseFeedbackAnalytics(courseId: string, period: 'month' | 'quarter' | 'year' = 'month'): Promise<FeedbackAnalytics> {
    const dateFilter = this.getPeriodFilter(period);
    
    const { data: feedbackData, error } = await this.supabase
      .from('course_feedback')
      .select('overall_satisfaction, most_helpful_aspects, least_helpful_aspects, created_at')
      .eq('course_id', courseId)
      .gte('created_at', dateFilter);

    if (error) throw error;

    return this.processFeedbackAnalytics(feedbackData || [], period);
  }

  async getStudentProgressAnalytics(studentId: string): Promise<{
    avg_ratings_received: { [key: string]: number };
    improvement_trend: string;
    strengths: string[];
    areas_for_improvement: string[];
    teacher_recommendations: string[];
  }> {
    const { data: teacherFeedback, error } = await this.supabase
      .from('teacher_feedback')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    const feedback = teacherFeedback || [];
    const ratings = {
      participation: this.calculateAverage(feedback.map(f => f.participation_rating)),
      comprehension: this.calculateAverage(feedback.map(f => f.comprehension_rating)),
      pronunciation: this.calculateAverage(feedback.map(f => f.pronunciation_rating)),
      progress: this.calculateAverage(feedback.map(f => f.progress_rating))
    };

    const strengths = this.extractCommonThemes(feedback.map(f => f.strengths).filter(Boolean));
    const improvements = this.extractCommonThemes(feedback.map(f => f.areas_for_improvement).filter(Boolean));
    const recommendations = this.extractCommonThemes(feedback.map(f => f.next_lesson_goals).filter(Boolean));

    return {
      avg_ratings_received: ratings,
      improvement_trend: this.calculateTrend(feedback.map(f => f.progress_rating)),
      strengths,
      areas_for_improvement: improvements,
      teacher_recommendations: recommendations
    };
  }

  // Utility Methods
  private async triggerAnalyticsUpdate(feedbackType: string, feedbackId: string): Promise<void> {
    // Call database function to update analytics
    await this.supabase.rpc('calculate_teacher_rating_trends');
    
    // Additional analytics updates can be added here
    if (feedbackType === 'student_feedback') {
      await this.supabase.rpc('generate_feedback_alerts');
    }
  }

  private async checkForAlerts(feedback: StudentFeedback): Promise<void> {
    if (!feedback.overall_rating || !feedback.teacher_id) return;

    // Check if rating is below threshold
    if (feedback.overall_rating <= 3) {
      await this.createFeedbackAlert({
        user_id: feedback.teacher_id,
        alert_type: 'low_rating',
        severity: feedback.overall_rating <= 2 ? 'high' : 'medium',
        title: 'Low Rating Alert',
        message: `You received a rating of ${feedback.overall_rating}/5 from a student.`,
        related_feedback_id: feedback.id,
        related_feedback_type: 'student_feedback',
        related_student_id: feedback.student_id,
        related_teacher_id: feedback.teacher_id,
        related_class_id: feedback.class_id
      });
    }

    // Check for negative feedback patterns
    if (feedback.improvement_suggestions && 
        feedback.improvement_suggestions.length > 100 && 
        feedback.overall_rating && feedback.overall_rating <= 3) {
      await this.createFeedbackAlert({
        user_id: feedback.teacher_id,
        alert_type: 'improvement_needed',
        severity: 'medium',
        title: 'Improvement Feedback',
        message: 'A student provided detailed improvement suggestions.',
        related_feedback_id: feedback.id,
        related_feedback_type: 'student_feedback',
        related_student_id: feedback.student_id,
        related_teacher_id: feedback.teacher_id
      });
    }
  }

  private getPeriodFilter(period: 'month' | 'quarter' | 'year'): string {
    const now = new Date();
    switch (period) {
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        return new Date(now.getFullYear(), quarter * 3, 1).toISOString();
      case 'year':
        return new Date(now.getFullYear(), 0, 1).toISOString();
      default:
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    }
  }

  private processFeedbackAnalytics(feedback: any[], period: string): FeedbackAnalytics {
    const ratings = feedback.map(f => f.overall_rating || f.overall_satisfaction).filter(r => r !== null);
    const averageRating = this.calculateAverage(ratings);
    
    const distribution: { [key: number]: number } = {};
    for (let i = 1; i <= 5; i++) {
      distribution[i] = ratings.filter(r => r === i).length;
    }

    const positiveTexts = feedback.map(f => f.positive_feedback || f.most_helpful_aspects).filter(Boolean);
    const negativeTexts = feedback.map(f => f.improvement_suggestions || f.least_helpful_aspects).filter(Boolean);

    return {
      period,
      total_feedback_count: feedback.length,
      average_rating: averageRating,
      rating_distribution: distribution,
      sentiment_analysis: {
        positive: ratings.filter(r => r >= 4).length,
        neutral: ratings.filter(r => r === 3).length,
        negative: ratings.filter(r => r <= 2).length
      },
      top_strengths: this.extractCommonThemes(positiveTexts),
      common_improvements: this.extractCommonThemes(negativeTexts),
      trends: {
        rating_trend: this.calculateRatingTrend(feedback),
        feedback_volume_trend: 'stable' // Would need historical data for accurate calculation
      }
    };
  }

  private calculateAverage(values: (number | null | undefined)[]): number {
    const validValues = values.filter(v => v !== null && v !== undefined) as number[];
    if (validValues.length === 0) return 0;
    return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
  }

  private calculateTrend(values: (number | null | undefined)[]): string {
    const validValues = values.filter(v => v !== null && v !== undefined) as number[];
    if (validValues.length < 2) return 'stable';
    
    const recent = validValues.slice(0, Math.ceil(validValues.length / 2));
    const older = validValues.slice(Math.ceil(validValues.length / 2));
    
    const recentAvg = this.calculateAverage(recent);
    const olderAvg = this.calculateAverage(older);
    
    if (recentAvg > olderAvg + 0.2) return 'improving';
    if (recentAvg < olderAvg - 0.2) return 'declining';
    return 'stable';
  }

  private calculateRatingTrend(feedback: any[]): 'improving' | 'stable' | 'declining' {
    if (feedback.length < 4) return 'stable';
    
    const sortedFeedback = feedback.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const firstHalf = sortedFeedback.slice(0, Math.floor(sortedFeedback.length / 2));
    const secondHalf = sortedFeedback.slice(Math.floor(sortedFeedback.length / 2));
    
    const firstAvg = this.calculateAverage(firstHalf.map(f => f.overall_rating || f.overall_satisfaction));
    const secondAvg = this.calculateAverage(secondHalf.map(f => f.overall_rating || f.overall_satisfaction));
    
    if (secondAvg > firstAvg + 0.2) return 'improving';
    if (secondAvg < firstAvg - 0.2) return 'declining';
    return 'stable';
  }

  private extractCommonThemes(texts: string[]): string[] {
    if (texts.length === 0) return [];
    
    // Simple keyword extraction - in production, would use NLP
    const words = texts.join(' ').toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 3)
      .filter(word => !['that', 'this', 'with', 'from', 'they', 'were', 'been', 'have', 'will', 'more', 'very', 'what', 'when', 'where', 'how'].includes(word));
    
    const wordCount: { [key: string]: number } = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  }
}

export const feedbackService = new FeedbackService();