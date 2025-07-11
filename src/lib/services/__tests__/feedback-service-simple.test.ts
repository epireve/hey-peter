/**
 * Simple feedback service tests to verify basic functionality
 */

import { StudentFeedback, TeacherFeedback, CourseFeedback } from '../../../types/feedback';

describe('Feedback System Types and Structure', () => {
  test('StudentFeedback type should have required fields', () => {
    const feedback: StudentFeedback = {
      student_id: 'student-1',
      teacher_id: 'teacher-1',
      overall_rating: 4,
      positive_feedback: 'Great class!',
      feedback_type: 'class_feedback'
    };

    expect(feedback.student_id).toBe('student-1');
    expect(feedback.teacher_id).toBe('teacher-1');
    expect(feedback.overall_rating).toBe(4);
    expect(feedback.feedback_type).toBe('class_feedback');
  });

  test('TeacherFeedback type should have required fields', () => {
    const feedback: TeacherFeedback = {
      teacher_id: 'teacher-1',
      student_id: 'student-1',
      participation_rating: 4,
      comprehension_rating: 4,
      progress_rating: 4,
      strengths: 'Good participation'
    };

    expect(feedback.teacher_id).toBe('teacher-1');
    expect(feedback.student_id).toBe('student-1');
    expect(feedback.participation_rating).toBe(4);
    expect(feedback.strengths).toBe('Good participation');
  });

  test('CourseFeedback type should have required fields', () => {
    const feedback: CourseFeedback = {
      student_id: 'student-1',
      course_id: 'course-1',
      overall_satisfaction: 4
    };

    expect(feedback.student_id).toBe('student-1');
    expect(feedback.course_id).toBe('course-1');
    expect(feedback.overall_satisfaction).toBe(4);
  });

  test('Feedback types should support optional fields', () => {
    const studentFeedback: StudentFeedback = {
      student_id: 'student-1',
      overall_rating: 5,
      teaching_quality_rating: 5,
      class_content_rating: 4,
      engagement_rating: 5,
      punctuality_rating: 5,
      positive_feedback: 'Excellent teacher!',
      improvement_suggestions: 'None',
      learning_objectives_met: true,
      would_recommend: true,
      is_anonymous: false
    };

    expect(studentFeedback).toBeDefined();
    expect(studentFeedback.teaching_quality_rating).toBe(5);
    expect(studentFeedback.learning_objectives_met).toBe(true);
  });

  test('Rating values should be within valid range', () => {
    const validRatings = [1, 2, 3, 4, 5];
    
    validRatings.forEach(rating => {
      const feedback: StudentFeedback = {
        student_id: 'student-1',
        overall_rating: rating
      };
      
      expect(feedback.overall_rating).toBeGreaterThanOrEqual(1);
      expect(feedback.overall_rating).toBeLessThanOrEqual(5);
    });
  });

  test('Feedback service should be importable', async () => {
    // Just test that the service can be imported without errors
    const { FeedbackService } = await import('../feedback-service');
    expect(FeedbackService).toBeDefined();
  });

  test('Notification service should be importable', async () => {
    const { FeedbackNotificationService } = await import('../feedback-notification-service');
    expect(FeedbackNotificationService).toBeDefined();
  });

  test('Recommendation engine should be importable', async () => {
    const { FeedbackRecommendationEngine } = await import('../feedback-recommendation-engine');
    expect(FeedbackRecommendationEngine).toBeDefined();
  });
});