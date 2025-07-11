/**
 * @jest-environment jsdom
 */

import { FeedbackService } from '../feedback-service';

// Mock Supabase client
jest.mock('@/lib/supabase');

describe('FeedbackService - Simple Tests', () => {
  let feedbackService: FeedbackService;

  beforeEach(() => {
    jest.clearAllMocks();
    feedbackService = new FeedbackService();
  });

  test('should create feedback service instance', () => {
    expect(feedbackService).toBeInstanceOf(FeedbackService);
  });

  test('should have basic methods', () => {
    expect(typeof feedbackService.createStudentFeedback).toBe('function');
    expect(typeof feedbackService.getStudentFeedback).toBe('function');
    expect(typeof feedbackService.updateStudentFeedback).toBe('function');
    expect(typeof feedbackService.deleteStudentFeedback).toBe('function');
  });
});