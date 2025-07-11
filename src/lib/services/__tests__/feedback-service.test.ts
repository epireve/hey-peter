/**
 * @jest-environment jsdom
 */

import { feedbackService } from '../feedback-service';
import { createClient } from '../../supabase';
import { StudentFeedback, TeacherFeedback, CourseFeedback } from '../../../types/feedback';

// Mock Supabase client
jest.mock('../../supabase', () => ({
  createClient: jest.fn()
}));

const mockSupabase = {
  from: jest.fn(),
  rpc: jest.fn()
};

const mockQuery = {
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  range: jest.fn().mockReturnThis(),
  single: jest.fn()
};

describe('FeedbackService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    mockSupabase.from.mockReturnValue(mockQuery);
    
    // Reset all query mock methods to return themselves for chaining
    Object.keys(mockQuery).forEach(key => {
      if (key !== 'single') {
        mockQuery[key].mockReturnValue(mockQuery);
      }
    });
  });

  describe('Student Feedback', () => {
    const mockStudentFeedback: StudentFeedback = {
      id: 'test-feedback-1',
      student_id: 'student-1',
      teacher_id: 'teacher-1',
      class_id: 'class-1',
      overall_rating: 4,
      teaching_quality_rating: 5,
      class_content_rating: 4,
      engagement_rating: 4,
      punctuality_rating: 5,
      positive_feedback: 'Great class, very engaging!',
      improvement_suggestions: 'Could slow down a bit',
      learning_objectives_met: true,
      would_recommend: true,
      feedback_type: 'class_feedback',
      is_anonymous: false,
      submission_method: 'manual'
    };

    test('should create student feedback successfully', async () => {
      const mockResponse = { data: mockStudentFeedback, error: null };
      mockQuery.single.mockResolvedValue(mockResponse);

      const result = await feedbackService.createStudentFeedback(mockStudentFeedback);

      expect(mockSupabase.from).toHaveBeenCalledWith('student_feedback');
      expect(mockQuery.insert).toHaveBeenCalledWith(mockStudentFeedback);
      expect(mockQuery.select).toHaveBeenCalled();
      expect(result).toEqual(mockStudentFeedback);
    });

    test('should handle errors when creating student feedback', async () => {
      const mockError = new Error('Database error');
      mockQuery.single.mockResolvedValue({ data: null, error: mockError });

      await expect(feedbackService.createStudentFeedback(mockStudentFeedback))
        .rejects.toThrow('Database error');
    });

    test('should retrieve student feedback by ID', async () => {
      const mockResponse = { 
        data: {
          ...mockStudentFeedback,
          student: { id: 'student-1', full_name: 'John Doe', email: 'john@example.com' },
          teacher: { id: 'teacher-1', full_name: 'Jane Smith', email: 'jane@example.com' }
        }, 
        error: null 
      };
      mockQuery.single.mockResolvedValue(mockResponse);

      const result = await feedbackService.getStudentFeedback('test-feedback-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('student_feedback');
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'test-feedback-1');
      expect(result).toEqual(mockResponse.data);
    });

    test('should update student feedback', async () => {
      const updates = { overall_rating: 5, positive_feedback: 'Updated feedback' };
      const updatedFeedback = { ...mockStudentFeedback, ...updates };
      const mockResponse = { data: updatedFeedback, error: null };
      mockQuery.single.mockResolvedValue(mockResponse);

      const result = await feedbackService.updateStudentFeedback('test-feedback-1', updates);

      expect(mockQuery.update).toHaveBeenCalledWith(updates);
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'test-feedback-1');
      expect(result).toEqual(updatedFeedback);
    });

    test('should delete student feedback', async () => {
      mockQuery.single.mockResolvedValue({ data: null, error: null });

      await feedbackService.deleteStudentFeedback('test-feedback-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('student_feedback');
      expect(mockQuery.delete).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'test-feedback-1');
    });

    test('should get student feedback list with filters', async () => {
      const mockFeedbackList = [mockStudentFeedback];
      const mockResponse = { data: mockFeedbackList, error: null, count: 1 };
      mockQuery.single.mockResolvedValue(mockResponse);

      const filters = {
        student_id: 'student-1',
        teacher_id: 'teacher-1',
        rating_min: 4,
        limit: 10,
        offset: 0
      };

      const result = await feedbackService.getStudentFeedbackList(filters);

      expect(mockQuery.eq).toHaveBeenCalledWith('student_id', 'student-1');
      expect(mockQuery.eq).toHaveBeenCalledWith('teacher_id', 'teacher-1');
      expect(mockQuery.gte).toHaveBeenCalledWith('overall_rating', 4);
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
      expect(result.data).toEqual(mockFeedbackList);
      expect(result.count).toBe(1);
    });
  });

  describe('Teacher Feedback', () => {
    const mockTeacherFeedback: TeacherFeedback = {
      id: 'teacher-feedback-1',
      teacher_id: 'teacher-1',
      student_id: 'student-1',
      class_id: 'class-1',
      participation_rating: 4,
      comprehension_rating: 4,
      pronunciation_rating: 3,
      homework_completion_rating: 5,
      progress_rating: 4,
      strengths: 'Good participation and enthusiasm',
      areas_for_improvement: 'Needs work on pronunciation',
      lesson_notes: 'Student showed great improvement today',
      homework_assigned: 'Practice pronunciation exercises',
      next_lesson_goals: 'Focus on speaking fluency',
      unit_completed: 2,
      lesson_completed: 5,
      lesson_objectives_met: true,
      attendance_quality: 'good',
      recommended_study_hours: 3,
      needs_additional_support: false
    };

    test('should create teacher feedback successfully', async () => {
      const mockResponse = { data: mockTeacherFeedback, error: null };
      mockQuery.single.mockResolvedValue(mockResponse);

      const result = await feedbackService.createTeacherFeedback(mockTeacherFeedback);

      expect(mockSupabase.from).toHaveBeenCalledWith('teacher_feedback');
      expect(mockQuery.insert).toHaveBeenCalledWith(mockTeacherFeedback);
      expect(result).toEqual(mockTeacherFeedback);
    });

    test('should retrieve teacher feedback by ID', async () => {
      const mockResponse = { 
        data: {
          ...mockTeacherFeedback,
          teacher: { id: 'teacher-1', full_name: 'Jane Smith', email: 'jane@example.com' },
          student: { id: 'student-1', full_name: 'John Doe', email: 'john@example.com', student_id: 'STU001' }
        }, 
        error: null 
      };
      mockQuery.single.mockResolvedValue(mockResponse);

      const result = await feedbackService.getTeacherFeedback('teacher-feedback-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('teacher_feedback');
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'teacher-feedback-1');
      expect(result).toEqual(mockResponse.data);
    });

    test('should get teacher feedback list with filters', async () => {
      const mockFeedbackList = [mockTeacherFeedback];
      const mockResponse = { data: mockFeedbackList, error: null, count: 1 };
      mockQuery.single.mockResolvedValue(mockResponse);

      const filters = {
        teacher_id: 'teacher-1',
        student_id: 'student-1',
        rating_min: 3,
        limit: 20
      };

      const result = await feedbackService.getTeacherFeedbackList(filters);

      expect(mockQuery.eq).toHaveBeenCalledWith('teacher_id', 'teacher-1');
      expect(mockQuery.eq).toHaveBeenCalledWith('student_id', 'student-1');
      expect(mockQuery.gte).toHaveBeenCalledWith('progress_rating', 3);
      expect(result.data).toEqual(mockFeedbackList);
    });
  });

  describe('Course Feedback', () => {
    const mockCourseFeedback: CourseFeedback = {
      id: 'course-feedback-1',
      student_id: 'student-1',
      course_id: 'course-1',
      course_structure_rating: 4,
      material_quality_rating: 5,
      difficulty_level_rating: 4,
      pace_rating: 3,
      overall_satisfaction: 4,
      most_helpful_aspects: 'Interactive exercises and real-world examples',
      least_helpful_aspects: 'Some topics were rushed',
      suggested_improvements: 'More time for practice',
      completion_percentage: 85,
      would_retake_course: true,
      would_recommend_course: true
    };

    test('should create course feedback successfully', async () => {
      const mockResponse = { data: mockCourseFeedback, error: null };
      mockQuery.single.mockResolvedValue(mockResponse);

      const result = await feedbackService.createCourseFeedback(mockCourseFeedback);

      expect(mockSupabase.from).toHaveBeenCalledWith('course_feedback');
      expect(mockQuery.insert).toHaveBeenCalledWith(mockCourseFeedback);
      expect(result).toEqual(mockCourseFeedback);
    });

    test('should retrieve course feedback by ID', async () => {
      const mockResponse = { 
        data: {
          ...mockCourseFeedback,
          student: { id: 'student-1', full_name: 'John Doe', email: 'john@example.com' },
          course: { id: 'course-1', title: 'Business English', course_type: 'Business English' }
        }, 
        error: null 
      };
      mockQuery.single.mockResolvedValue(mockResponse);

      const result = await feedbackService.getCourseFeedback('course-feedback-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('course_feedback');
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'course-feedback-1');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('Feedback Analytics', () => {
    test('should get teacher feedback analytics', async () => {
      const mockAnalytics = {
        period: 'month',
        total_feedback_count: 25,
        average_rating: 4.2,
        rating_distribution: { 1: 0, 2: 1, 3: 4, 4: 12, 5: 8 },
        sentiment_analysis: { positive: 80, neutral: 15, negative: 5 },
        top_strengths: ['communication', 'engagement', 'knowledge'],
        common_improvements: ['pace', 'materials'],
        trends: {
          rating_trend: 'improving' as const,
          feedback_volume_trend: 'stable' as const
        }
      };

      const mockResponse = { data: [
        { overall_rating: 4, positive_feedback: 'Great teacher', created_at: '2023-01-01' },
        { overall_rating: 5, positive_feedback: 'Excellent', created_at: '2023-01-02' }
      ], error: null };
      mockQuery.single.mockResolvedValue(mockResponse);

      const result = await feedbackService.getTeacherFeedbackAnalytics('teacher-1', 'month');

      expect(mockSupabase.from).toHaveBeenCalledWith('student_feedback');
      expect(mockQuery.eq).toHaveBeenCalledWith('teacher_id', 'teacher-1');
      expect(result).toHaveProperty('total_feedback_count');
      expect(result).toHaveProperty('average_rating');
    });

    test('should get student progress analytics', async () => {
      const mockFeedback = [
        { participation_rating: 4, comprehension_rating: 4, progress_rating: 5 },
        { participation_rating: 5, comprehension_rating: 4, progress_rating: 4 }
      ];
      const mockResponse = { data: mockFeedback, error: null };
      mockQuery.single.mockResolvedValue(mockResponse);

      const result = await feedbackService.getStudentProgressAnalytics('student-1');

      expect(result).toHaveProperty('avg_ratings_received');
      expect(result).toHaveProperty('improvement_trend');
      expect(result.avg_ratings_received.participation).toBeCloseTo(4.5);
    });
  });

  describe('Alert Management', () => {
    test('should create feedback alert', async () => {
      const mockAlert = {
        user_id: 'teacher-1',
        alert_type: 'low_rating' as const,
        severity: 'medium' as const,
        title: 'Low Rating Alert',
        message: 'You received a rating of 2/5',
        related_feedback_id: 'feedback-1'
      };

      const mockResponse = { data: { ...mockAlert, id: 'alert-1' }, error: null };
      mockQuery.single.mockResolvedValue(mockResponse);

      const result = await feedbackService.createFeedbackAlert(mockAlert);

      expect(mockSupabase.from).toHaveBeenCalledWith('feedback_alerts');
      expect(mockQuery.insert).toHaveBeenCalledWith(mockAlert);
      expect(result.id).toBe('alert-1');
    });

    test('should get feedback alerts for user', async () => {
      const mockAlerts = [
        { id: 'alert-1', alert_type: 'low_rating', severity: 'medium', is_read: false },
        { id: 'alert-2', alert_type: 'positive_feedback', severity: 'low', is_read: true }
      ];
      const mockResponse = { data: mockAlerts, error: null };
      mockQuery.single.mockResolvedValue(mockResponse);

      const result = await feedbackService.getFeedbackAlerts('teacher-1', { is_read: false });

      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'teacher-1');
      expect(mockQuery.eq).toHaveBeenCalledWith('is_read', false);
      expect(result).toEqual(mockAlerts);
    });

    test('should mark alert as read', async () => {
      mockQuery.single.mockResolvedValue({ error: null });

      await feedbackService.markAlertAsRead('alert-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('feedback_alerts');
      expect(mockQuery.update).toHaveBeenCalledWith({ is_read: true });
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'alert-1');
    });
  });

  describe('Recommendations', () => {
    test('should get teacher recommendations for student', async () => {
      const mockRecommendations = [
        {
          id: 'rec-1',
          student_id: 'student-1',
          recommended_teacher_id: 'teacher-1',
          compatibility_score: 0.85,
          confidence_level: 0.9,
          reason: 'High compatibility based on ratings',
          status: 'active'
        }
      ];
      const mockResponse = { data: mockRecommendations, error: null };
      mockQuery.single.mockResolvedValue(mockResponse);

      const result = await feedbackService.getTeacherRecommendations('student-1', 5);

      expect(mockSupabase.from).toHaveBeenCalledWith('teacher_recommendations');
      expect(mockQuery.eq).toHaveBeenCalledWith('student_id', 'student-1');
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'active');
      expect(result).toEqual(mockRecommendations);
    });

    test('should accept teacher recommendation', async () => {
      mockQuery.single.mockResolvedValue({ error: null });

      await feedbackService.acceptTeacherRecommendation('rec-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('teacher_recommendations');
      expect(mockQuery.update).toHaveBeenCalledWith({ status: 'accepted' });
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'rec-1');
    });
  });

  describe('Error Handling', () => {
    test('should handle Supabase errors gracefully', async () => {
      const mockError = new Error('Connection failed');
      mockQuery.single.mockResolvedValue({ data: null, error: mockError });

      await expect(feedbackService.getStudentFeedback('invalid-id'))
        .rejects.toThrow('Connection failed');
    });

    test('should handle missing data gracefully', async () => {
      mockQuery.single.mockResolvedValue({ data: null, error: null });

      const result = await feedbackService.getStudentFeedback('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('Utility Methods', () => {
    test('should calculate average correctly', async () => {
      // Test through the analytics method which uses the private calculateAverage method
      const mockFeedback = [
        { overall_rating: 3, created_at: '2023-01-01' },
        { overall_rating: 4, created_at: '2023-01-02' },
        { overall_rating: 5, created_at: '2023-01-03' }
      ];
      const mockResponse = { data: mockFeedback, error: null };
      mockQuery.single.mockResolvedValue(mockResponse);

      const result = await feedbackService.getTeacherFeedbackAnalytics('teacher-1', 'month');

      expect(result.average_rating).toBeCloseTo(4.0);
    });

    test('should extract common themes from text', async () => {
      const mockFeedback = [
        { strengths: 'great communication and excellent teaching style', created_at: '2023-01-01' },
        { strengths: 'amazing communication skills and clear explanations', created_at: '2023-01-02' }
      ];
      const mockResponse = { data: mockFeedback, error: null };
      mockQuery.single.mockResolvedValue(mockResponse);

      const result = await feedbackService.getStudentProgressAnalytics('student-1');

      // The extractCommonThemes method should identify 'communication' as a common theme
      expect(result.strengths).toContain('communication');
    });
  });
});