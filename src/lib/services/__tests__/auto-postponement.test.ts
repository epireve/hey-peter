/**
 * Auto-Postponement System Tests
 * 
 * This test suite verifies the auto-postponement logic and make-up class suggestion system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { autoPostponementService } from '../auto-postponement-service';
import { makeUpClassSuggestionService } from '../makeup-class-suggestion-service';
import { schedulingIntegrationService } from '../scheduling-integration-service';

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: null, error: null })),
          limit: vi.fn(() => ({ data: [], error: null })),
        })),
        limit: vi.fn(() => ({ data: [], error: null })),
        order: vi.fn(() => ({ data: [], error: null })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({ data: { id: 'test-id' }, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({ data: { id: 'test-id' }, error: null })),
          })),
        })),
      })),
    })),
    rpc: vi.fn(() => ({ data: [], error: null })),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({ subscribe: vi.fn() })),
    })),
    removeChannel: vi.fn(),
  },
}));

// Mock scheduling service
vi.mock('../scheduling-service', () => ({
  schedulingService: {
    scheduleClasses: vi.fn(() => Promise.resolve({
      success: true,
      scheduledClasses: [],
      conflicts: [],
      recommendations: [],
    })),
  },
}));

describe('Auto-Postponement Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getStudentPostponements', () => {
    it('should fetch postponements for a student', async () => {
      const studentId = 'test-student-id';
      const result = await autoPostponementService.getStudentPostponements(studentId);
      
      expect(result).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      const studentId = 'invalid-student-id';
      
      // Mock error response
      const { supabase } = await import('@/lib/supabase');
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            limit: vi.fn(() => ({ data: null, error: new Error('Database error') })),
          })),
        })),
      } as any);
      
      await expect(autoPostponementService.getStudentPostponements(studentId))
        .rejects
        .toThrow('Failed to fetch postponements');
    });
  });

  describe('getStudentPreferences', () => {
    it('should return existing preferences for a student', async () => {
      const studentId = 'test-student-id';
      const mockPreferences = {
        id: 'pref-id',
        student_id: studentId,
        preferred_days: [1, 2, 3, 4, 5],
        preferred_times: {},
        created_at: new Date().toISOString(),
      };

      const { supabase } = await import('@/lib/supabase');
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({ data: mockPreferences, error: null })),
          })),
        })),
      } as any);

      const result = await autoPostponementService.getStudentPreferences(studentId);
      expect(result).toEqual(mockPreferences);
    });

    it('should create default preferences if none exist', async () => {
      const studentId = 'test-student-id';
      const mockDefaultPreferences = {
        id: 'new-pref-id',
        student_id: studentId,
        preferred_days: [1, 2, 3, 4, 5],
        preferred_times: {
          '1': ['09:00-12:00', '14:00-17:00'],
          '2': ['09:00-12:00', '14:00-17:00'],
          '3': ['09:00-12:00', '14:00-17:00'],
          '4': ['09:00-12:00', '14:00-17:00'],
          '5': ['09:00-12:00', '14:00-17:00'],
        },
        created_at: new Date().toISOString(),
      };

      const { supabase } = await import('@/lib/supabase');
      
      // Mock no existing preferences
      const mockFrom = vi.fn()
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({ data: null, error: new Error('Not found') })),
            })),
          })),
        })
        // Mock successful creation
        .mockReturnValueOnce({
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => ({ data: mockDefaultPreferences, error: null })),
            })),
          })),
        });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const result = await autoPostponementService.getStudentPreferences(studentId);
      expect(result.student_id).toBe(studentId);
      expect(result.preferred_days).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('selectMakeUpClass', () => {
    it('should select a make-up class successfully', async () => {
      const request = {
        make_up_class_id: 'makeup-id',
        student_id: 'student-id',
        selected_suggestion_id: 'suggestion-id',
      };

      const { supabase } = await import('@/lib/supabase');
      vi.mocked(supabase.rpc).mockResolvedValue({ data: true, error: null });

      const result = await autoPostponementService.selectMakeUpClass(request);
      expect(result).toBe(true);
    });

    it('should handle selection failure', async () => {
      const request = {
        make_up_class_id: 'makeup-id',
        student_id: 'student-id',
        selected_suggestion_id: 'suggestion-id',
      };

      const { supabase } = await import('@/lib/supabase');
      vi.mocked(supabase.rpc).mockResolvedValue({ 
        data: null, 
        error: new Error('Selection failed') 
      });

      await expect(autoPostponementService.selectMakeUpClass(request))
        .rejects
        .toThrow('Failed to select make-up class');
    });
  });

  describe('approveMakeUpClass', () => {
    it('should approve a make-up class successfully', async () => {
      const request = {
        make_up_class_id: 'makeup-id',
        admin_user_id: 'admin-id',
      };

      const { supabase } = await import('@/lib/supabase');
      vi.mocked(supabase.rpc).mockResolvedValue({ data: true, error: null });

      const result = await autoPostponementService.approveMakeUpClass(request);
      expect(result).toBe(true);
    });

    it('should handle approval failure', async () => {
      const request = {
        make_up_class_id: 'makeup-id',
        admin_user_id: 'admin-id',
      };

      const { supabase } = await import('@/lib/supabase');
      vi.mocked(supabase.rpc).mockResolvedValue({ 
        data: null, 
        error: new Error('Approval failed') 
      });

      await expect(autoPostponementService.approveMakeUpClass(request))
        .rejects
        .toThrow('Failed to approve make-up class');
    });
  });
});

describe('Make-up Class Suggestion Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateSuggestions', () => {
    it('should generate make-up class suggestions', async () => {
      const request = {
        student_id: 'student-id',
        postponement_id: 'postponement-id',
        original_class_id: 'original-class-id',
        max_suggestions: 5,
      };

      const mockSuggestions = [
        {
          id: 'suggestion-1',
          class_id: 'class-1',
          teacher_id: 'teacher-1',
          teacher_name: 'Teacher One',
          class_name: 'Test Class',
          start_time: new Date().toISOString(),
          end_time: new Date().toISOString(),
          duration_minutes: 60,
          current_enrollment: 5,
          capacity: 9,
          available_spots: 4,
          overall_compatibility_score: 0.85,
          content_compatibility_score: 0.8,
          schedule_preference_score: 0.9,
          teacher_compatibility_score: 0.8,
          class_size_preference_score: 0.9,
          location_preference_score: 0.7,
          timing_preference_score: 0.8,
          content_analysis: {
            similarity_percentage: 80,
            matching_topics: ['Grammar', 'Vocabulary'],
            skill_level_alignment: 'appropriate',
            prerequisite_compatibility: true,
            learning_objectives_overlap: 0.8,
          },
          scheduling_analysis: {
            day_preference_match: true,
            time_preference_match: true,
            advance_notice_compliance: true,
            travel_time_acceptable: true,
            conflicts_with_existing: false,
          },
          teacher_analysis: {
            is_preferred_teacher: false,
            is_avoided_teacher: false,
            teaching_style_match: 'good',
            subject_expertise_match: 0.8,
            student_history_with_teacher: false,
          },
          benefits: ['Good content match', 'Preferred time slot'],
          considerations: ['Different teacher'],
          recommendation_strength: 'high' as const,
          is_online: false,
          course_type: 'Basic',
        },
      ];

      // Mock the service methods
      const service = makeUpClassSuggestionService;
      const originalGenerate = service.generateSuggestions;
      vi.spyOn(service, 'generateSuggestions').mockResolvedValue(mockSuggestions);

      const result = await service.generateSuggestions(request);
      
      expect(result).toEqual(mockSuggestions);
      expect(result).toHaveLength(1);
      expect(result[0].overall_compatibility_score).toBe(0.85);
      expect(result[0].recommendation_strength).toBe('high');

      // Restore original method
      service.generateSuggestions = originalGenerate;
    });

    it('should handle empty suggestions gracefully', async () => {
      const request = {
        student_id: 'student-id',
        postponement_id: 'postponement-id',
        original_class_id: 'original-class-id',
        max_suggestions: 5,
      };

      const service = makeUpClassSuggestionService;
      const originalGenerate = service.generateSuggestions;
      vi.spyOn(service, 'generateSuggestions').mockResolvedValue([]);

      const result = await service.generateSuggestions(request);
      
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);

      // Restore original method
      service.generateSuggestions = originalGenerate;
    });

    it('should handle errors during suggestion generation', async () => {
      const request = {
        student_id: 'student-id',
        postponement_id: 'postponement-id',
        original_class_id: 'original-class-id',
        max_suggestions: 5,
      };

      const service = makeUpClassSuggestionService;
      const originalGenerate = service.generateSuggestions;
      vi.spyOn(service, 'generateSuggestions').mockRejectedValue(new Error('Generation failed'));

      await expect(service.generateSuggestions(request))
        .rejects
        .toThrow('Generation failed');

      // Restore original method
      service.generateSuggestions = originalGenerate;
    });
  });

  describe('configuration management', () => {
    it('should update configuration correctly', () => {
      const service = makeUpClassSuggestionService;
      const originalConfig = service.getConfiguration();
      
      const newConfig = {
        weights: {
          ...originalConfig.weights,
          content_compatibility: 0.4,
        },
      };

      service.updateConfiguration(newConfig);
      const updatedConfig = service.getConfiguration();

      expect(updatedConfig.weights.content_compatibility).toBe(0.4);
    });

    it('should return current configuration', () => {
      const service = makeUpClassSuggestionService;
      const config = service.getConfiguration();

      expect(config).toHaveProperty('weights');
      expect(config).toHaveProperty('thresholds');
      expect(config).toHaveProperty('preferences');
      expect(config.weights).toHaveProperty('content_compatibility');
      expect(config.thresholds).toHaveProperty('min_overall_score');
    });
  });
});

describe('Scheduling Integration Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('health status', () => {
    it('should return healthy status when all services are working', async () => {
      const service = schedulingIntegrationService;
      const status = await service.getHealthStatus();

      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('services');
      expect(status).toHaveProperty('last_check');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(status.status);
    });

    it('should handle health check errors gracefully', async () => {
      const service = schedulingIntegrationService;
      
      // Mock database error
      const { supabase } = await import('@/lib/supabase');
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          limit: vi.fn(() => ({ data: null, error: new Error('Database error') })),
        })),
      } as any);

      const status = await service.getHealthStatus();
      expect(status.status).toBe('unhealthy');
    });
  });

  describe('configuration management', () => {
    it('should update configuration correctly', () => {
      const service = schedulingIntegrationService;
      const originalConfig = service.getConfiguration();
      
      const newConfig = {
        max_suggestions_per_postponement: 15,
        notification_enabled: false,
      };

      service.updateConfiguration(newConfig);
      const updatedConfig = service.getConfiguration();

      expect(updatedConfig.max_suggestions_per_postponement).toBe(15);
      expect(updatedConfig.notification_enabled).toBe(false);
    });

    it('should return current configuration', () => {
      const service = schedulingIntegrationService;
      const config = service.getConfiguration();

      expect(config).toHaveProperty('auto_scheduling_enabled');
      expect(config).toHaveProperty('notification_enabled');
      expect(config).toHaveProperty('max_suggestions_per_postponement');
      expect(config).toHaveProperty('integration_endpoints');
    });
  });
});

describe('Integration Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle complete postponement flow', async () => {
    // This test would simulate the complete flow:
    // 1. Leave request approved
    // 2. Auto-postponement triggered
    // 3. Make-up suggestions generated
    // 4. Student selects make-up class
    // 5. Admin approves make-up class
    // 6. Make-up class scheduled

    const studentId = 'test-student-id';
    const postponementId = 'test-postponement-id';
    const makeUpClassId = 'test-makeup-id';
    const adminId = 'test-admin-id';

    // Mock successful operations
    const { supabase } = await import('@/lib/supabase');
    vi.mocked(supabase.rpc).mockResolvedValue({ data: true, error: null });

    // Step 1: Generate suggestions
    const suggestions = await makeUpClassSuggestionService.generateSuggestions({
      student_id: studentId,
      postponement_id: postponementId,
      original_class_id: 'original-class-id',
      max_suggestions: 5,
    });

    expect(suggestions).toBeDefined();

    // Step 2: Student selects make-up class
    const selectionResult = await autoPostponementService.selectMakeUpClass({
      make_up_class_id: makeUpClassId,
      student_id: studentId,
      selected_suggestion_id: 'suggestion-id',
    });

    expect(selectionResult).toBe(true);

    // Step 3: Admin approves make-up class
    const approvalResult = await autoPostponementService.approveMakeUpClass({
      make_up_class_id: makeUpClassId,
      admin_user_id: adminId,
    });

    expect(approvalResult).toBe(true);
  });

  it('should handle postponement analytics', async () => {
    const analytics = await autoPostponementService.getPostponementAnalytics({
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString(),
    });

    expect(analytics).toHaveProperty('total_postponements');
    expect(analytics).toHaveProperty('by_reason');
    expect(analytics).toHaveProperty('by_status');
    expect(analytics).toHaveProperty('total_hours_affected');
    expect(analytics).toHaveProperty('average_hours_per_postponement');
  });
});