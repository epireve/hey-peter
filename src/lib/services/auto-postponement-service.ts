/**
 * Auto-Postponement Service
 * 
 * This service handles the automatic postponement of classes when student leave is approved
 * and manages the make-up class suggestion and scheduling process.
 */

import { supabase } from '@/lib/supabase';
import { CRUDService, withRetry } from './crud-service';
import { z } from 'zod';

// Type definitions for postponement system
export const postponementSchema = z.object({
  id: z.string().uuid().optional(),
  booking_id: z.string().uuid(),
  student_id: z.string().uuid(),
  class_id: z.string().uuid(),
  teacher_id: z.string().uuid().optional(),
  leave_request_id: z.string().uuid(),
  original_start_time: z.string().datetime(),
  original_end_time: z.string().datetime(),
  postponement_reason: z.enum(['student_leave', 'teacher_unavailable', 'emergency', 'system_maintenance', 'other']),
  postponement_type: z.enum(['automatic', 'manual']),
  status: z.enum(['pending', 'confirmed', 'make_up_scheduled', 'cancelled', 'completed']),
  hours_affected: z.number().default(0),
  notes: z.string().optional(),
  admin_notes: z.string().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export const makeUpClassSchema = z.object({
  id: z.string().uuid().optional(),
  postponement_id: z.string().uuid(),
  student_id: z.string().uuid(),
  original_class_id: z.string().uuid(),
  suggested_class_id: z.string().uuid().optional(),
  suggested_teacher_id: z.string().uuid().optional(),
  suggested_start_time: z.string().datetime().optional(),
  suggested_end_time: z.string().datetime().optional(),
  suggested_duration_minutes: z.number().optional(),
  alternative_suggestions: z.array(z.any()).default([]),
  selected_suggestion_id: z.string().uuid().optional(),
  student_selected: z.boolean().default(false),
  admin_approved: z.boolean().default(false),
  status: z.enum(['pending', 'suggested', 'student_selected', 'admin_approved', 'scheduled', 'rejected', 'expired']),
  compatibility_score: z.number().min(0).max(1).default(0),
  content_match_score: z.number().min(0).max(1).default(0),
  schedule_preference_score: z.number().min(0).max(1).default(0),
  teacher_match_score: z.number().min(0).max(1).default(0),
  selection_deadline: z.string().datetime().optional(),
  earliest_available_time: z.string().datetime().optional(),
  latest_available_time: z.string().datetime().optional(),
  suggestion_reason: z.string().optional(),
  notes: z.string().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export const studentSchedulePreferencesSchema = z.object({
  id: z.string().uuid().optional(),
  student_id: z.string().uuid(),
  preferred_days: z.array(z.number().min(0).max(6)).default([1, 2, 3, 4, 5]),
  preferred_times: z.record(z.array(z.string())).default({}),
  avoided_times: z.record(z.array(z.string())).default({}),
  preferred_class_size_min: z.number().min(1).default(1),
  preferred_class_size_max: z.number().max(9).default(9),
  preferred_teachers: z.array(z.string().uuid()).default([]),
  avoided_teachers: z.array(z.string().uuid()).default([]),
  preferred_content_pace: z.enum(['slow', 'normal', 'fast']).default('normal'),
  preferred_difficulty_level: z.enum(['easier', 'appropriate', 'challenging']).default('appropriate'),
  max_travel_time_minutes: z.number().default(30),
  willing_to_change_teacher: z.boolean().default(true),
  willing_to_join_different_class: z.boolean().default(true),
  advance_notice_required_hours: z.number().default(24),
  preferences_updated_at: z.string().datetime().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export type ClassPostponement = z.infer<typeof postponementSchema>;
export type MakeUpClass = z.infer<typeof makeUpClassSchema>;
export type StudentSchedulePreferences = z.infer<typeof studentSchedulePreferencesSchema>;

export interface MakeUpSuggestion {
  id: string;
  class_id: string;
  teacher_id: string;
  teacher_name: string;
  class_name: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  current_enrollment: number;
  capacity: number;
  compatibility_score: number;
  content_match_score: number;
  schedule_preference_score: number;
  teacher_match_score: number;
  reasoning: string;
  benefits: string[];
  drawbacks: string[];
  location?: string;
  is_online?: boolean;
  course_type: string;
}

export interface PostponementSummary {
  postponement_id: string;
  student_name: string;
  student_email: string;
  original_class_name: string;
  original_start_time: string;
  teacher_name: string;
  hours_affected: number;
  status: string;
  make_up_suggestions_count: number;
  leave_reason: string;
  created_at: string;
}

export interface MakeUpClassSelectionRequest {
  make_up_class_id: string;
  student_id: string;
  selected_suggestion_id: string;
  notes?: string;
}

export interface MakeUpClassApprovalRequest {
  make_up_class_id: string;
  admin_user_id: string;
  admin_notes?: string;
}

export class AutoPostponementService {
  private static instance: AutoPostponementService;
  private postponementService: CRUDService<ClassPostponement>;
  private makeUpClassService: CRUDService<MakeUpClass>;
  private preferencesService: CRUDService<StudentSchedulePreferences>;

  private constructor() {
    this.postponementService = new CRUDService({
      table: 'class_postponements',
      select: '*',
      cache: { enabled: true, ttl: 60000 }, // 1 minute
    });

    this.makeUpClassService = new CRUDService({
      table: 'make_up_classes',
      select: '*',
      cache: { enabled: true, ttl: 60000 }, // 1 minute
    });

    this.preferencesService = new CRUDService({
      table: 'student_schedule_preferences',
      select: '*',
      cache: { enabled: true, ttl: 300000 }, // 5 minutes
    });
  }

  public static getInstance(): AutoPostponementService {
    if (!AutoPostponementService.instance) {
      AutoPostponementService.instance = new AutoPostponementService();
    }
    return AutoPostponementService.instance;
  }

  /**
   * Get all postponements for a student
   */
  async getStudentPostponements(studentId: string): Promise<ClassPostponement[]> {
    const { data, error } = await this.postponementService.getAll({
      filters: [{ column: 'student_id', operator: 'eq', value: studentId }],
      orderBy: { column: 'created_at', ascending: false },
    });

    if (error) {
      throw new Error(`Failed to fetch postponements: ${error.message}`);
    }

    return data;
  }

  /**
   * Get postponement summary with enriched data
   */
  async getPostponementSummary(limit: number = 50): Promise<PostponementSummary[]> {
    const { data, error } = await supabase
      .from('v_active_postponements')
      .select('*')
      .limit(limit)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch postponement summary: ${error.message}`);
    }

    return data.map(item => ({
      postponement_id: item.id,
      student_name: item.student_name,
      student_email: item.student_email,
      original_class_name: item.class_name,
      original_start_time: item.original_start_time,
      teacher_name: item.teacher_name,
      hours_affected: item.hours_affected,
      status: item.status,
      make_up_suggestions_count: 0, // Will be populated separately
      leave_reason: item.leave_reason,
      created_at: item.created_at,
    }));
  }

  /**
   * Generate make-up class suggestions for a postponed class
   */
  async generateMakeUpSuggestions(
    studentId: string,
    postponementId: string,
    maxSuggestions: number = 10
  ): Promise<MakeUpSuggestion[]> {
    return withRetry(async () => {
      // Call the database function to generate suggestions
      const { data, error } = await supabase
        .rpc('generate_makeup_class_suggestions', {
          p_student_id: studentId,
          p_postponement_id: postponementId,
        });

      if (error) {
        throw new Error(`Failed to generate make-up suggestions: ${error.message}`);
      }

      // Transform the results into MakeUpSuggestion format
      const suggestions: MakeUpSuggestion[] = data.map((item: any) => ({
        id: item.suggestion_id,
        class_id: item.class_id,
        teacher_id: item.teacher_id,
        teacher_name: '', // Will be populated by enrichment
        class_name: '', // Will be populated by enrichment
        start_time: item.start_time,
        end_time: item.end_time,
        duration_minutes: 60, // Default, will be updated
        current_enrollment: 0, // Will be populated by enrichment
        capacity: 0, // Will be populated by enrichment
        compatibility_score: item.compatibility_score,
        content_match_score: item.compatibility_score * 0.3,
        schedule_preference_score: item.compatibility_score * 0.4,
        teacher_match_score: item.compatibility_score * 0.3,
        reasoning: item.reasoning,
        benefits: this.extractBenefits(item.reasoning),
        drawbacks: this.extractDrawbacks(item.reasoning),
        course_type: 'Basic', // Will be populated by enrichment
      }));

      // Enrich suggestions with additional data
      const enrichedSuggestions = await this.enrichSuggestions(suggestions);

      // Store suggestions in make_up_classes table
      await this.storeMakeUpSuggestions(studentId, postponementId, enrichedSuggestions);

      return enrichedSuggestions.slice(0, maxSuggestions);
    });
  }

  /**
   * Enrich suggestions with additional data from database
   */
  private async enrichSuggestions(suggestions: MakeUpSuggestion[]): Promise<MakeUpSuggestion[]> {
    const enrichedSuggestions: MakeUpSuggestion[] = [];

    for (const suggestion of suggestions) {
      // Get class details
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select(`
          *,
          course:courses(
            title,
            course_type,
            duration_minutes,
            is_online
          ),
          teacher:teachers(
            full_name
          )
        `)
        .eq('id', suggestion.class_id)
        .single();

      if (classError) {
        console.error('Error fetching class data:', classError);
        continue;
      }

      enrichedSuggestions.push({
        ...suggestion,
        teacher_name: classData.teacher?.full_name || 'TBD',
        class_name: classData.class_name || classData.course?.title || 'Unnamed Class',
        duration_minutes: classData.course?.duration_minutes || 60,
        current_enrollment: classData.current_enrollment || 0,
        capacity: classData.capacity || 9,
        is_online: classData.course?.is_online || false,
        course_type: classData.course?.course_type || 'Basic',
      });
    }

    return enrichedSuggestions;
  }

  /**
   * Store make-up suggestions in the database
   */
  private async storeMakeUpSuggestions(
    studentId: string,
    postponementId: string,
    suggestions: MakeUpSuggestion[]
  ): Promise<void> {
    // Check if suggestions already exist
    const { data: existingSuggestions } = await this.makeUpClassService.getAll({
      filters: [
        { column: 'postponement_id', operator: 'eq', value: postponementId },
        { column: 'student_id', operator: 'eq', value: studentId },
      ],
    });

    if (existingSuggestions && existingSuggestions.length > 0) {
      // Update existing record
      const existingSuggestion = existingSuggestions[0];
      await this.makeUpClassService.update(existingSuggestion.id!, {
        alternative_suggestions: suggestions,
        status: 'suggested',
        updated_at: new Date().toISOString(),
      });
    } else {
      // Create new record
      const makeUpClass: Partial<MakeUpClass> = {
        postponement_id: postponementId,
        student_id: studentId,
        original_class_id: '', // Will be populated from postponement
        alternative_suggestions: suggestions,
        status: 'suggested',
        selection_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        created_at: new Date().toISOString(),
      };

      await this.makeUpClassService.create(makeUpClass);
    }
  }

  /**
   * Handle student's selection of a make-up class
   */
  async selectMakeUpClass(request: MakeUpClassSelectionRequest): Promise<boolean> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .rpc('select_makeup_class', {
          p_make_up_class_id: request.make_up_class_id,
          p_student_id: request.student_id,
          p_selected_suggestion_id: request.selected_suggestion_id,
        });

      if (error) {
        throw new Error(`Failed to select make-up class: ${error.message}`);
      }

      return data === true;
    });
  }

  /**
   * Handle admin approval of a make-up class
   */
  async approveMakeUpClass(request: MakeUpClassApprovalRequest): Promise<boolean> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .rpc('approve_makeup_class', {
          p_make_up_class_id: request.make_up_class_id,
          p_admin_user_id: request.admin_user_id,
        });

      if (error) {
        throw new Error(`Failed to approve make-up class: ${error.message}`);
      }

      return data === true;
    });
  }

  /**
   * Get make-up classes for a student
   */
  async getStudentMakeUpClasses(studentId: string): Promise<MakeUpClass[]> {
    const { data, error } = await this.makeUpClassService.getAll({
      filters: [{ column: 'student_id', operator: 'eq', value: studentId }],
      orderBy: { column: 'created_at', ascending: false },
    });

    if (error) {
      throw new Error(`Failed to fetch make-up classes: ${error.message}`);
    }

    return data;
  }

  /**
   * Get pending make-up classes for admin review
   */
  async getPendingMakeUpClasses(limit: number = 50): Promise<any[]> {
    const { data, error } = await supabase
      .from('v_pending_makeup_classes')
      .select('*')
      .limit(limit)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch pending make-up classes: ${error.message}`);
    }

    return data;
  }

  /**
   * Get or create student schedule preferences
   */
  async getStudentPreferences(studentId: string): Promise<StudentSchedulePreferences> {
    const { data, error } = await this.preferencesService.getAll({
      filters: [{ column: 'student_id', operator: 'eq', value: studentId }],
    });

    if (error) {
      throw new Error(`Failed to fetch student preferences: ${error.message}`);
    }

    if (data && data.length > 0) {
      return data[0];
    }

    // Create default preferences
    const defaultPreferences: Partial<StudentSchedulePreferences> = {
      student_id: studentId,
      preferred_days: [1, 2, 3, 4, 5], // Monday to Friday
      preferred_times: {
        '1': ['09:00-12:00', '14:00-17:00'],
        '2': ['09:00-12:00', '14:00-17:00'],
        '3': ['09:00-12:00', '14:00-17:00'],
        '4': ['09:00-12:00', '14:00-17:00'],
        '5': ['09:00-12:00', '14:00-17:00'],
      },
      avoided_times: {},
      preferred_class_size_min: 1,
      preferred_class_size_max: 9,
      preferred_teachers: [],
      avoided_teachers: [],
      preferred_content_pace: 'normal',
      preferred_difficulty_level: 'appropriate',
      max_travel_time_minutes: 30,
      willing_to_change_teacher: true,
      willing_to_join_different_class: true,
      advance_notice_required_hours: 24,
      created_at: new Date().toISOString(),
    };

    const { data: createdPreferences, error: createError } = await this.preferencesService.create(defaultPreferences);

    if (createError) {
      throw new Error(`Failed to create student preferences: ${createError.message}`);
    }

    return createdPreferences;
  }

  /**
   * Update student schedule preferences
   */
  async updateStudentPreferences(
    studentId: string,
    preferences: Partial<StudentSchedulePreferences>
  ): Promise<StudentSchedulePreferences> {
    const existingPreferences = await this.getStudentPreferences(studentId);
    
    const { data, error } = await this.preferencesService.update(existingPreferences.id!, {
      ...preferences,
      preferences_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(`Failed to update student preferences: ${error.message}`);
    }

    return data;
  }

  /**
   * Get postponement analytics
   */
  async getPostponementAnalytics(dateRange?: { start: string; end: string }): Promise<any> {
    let query = supabase
      .from('class_postponements')
      .select('*', { count: 'exact' });

    if (dateRange) {
      query = query
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch postponement analytics: ${error.message}`);
    }

    const analytics = {
      total_postponements: count || 0,
      by_reason: {} as Record<string, number>,
      by_status: {} as Record<string, number>,
      total_hours_affected: 0,
      average_hours_per_postponement: 0,
    };

    if (data) {
      data.forEach(postponement => {
        // Count by reason
        analytics.by_reason[postponement.postponement_reason] = 
          (analytics.by_reason[postponement.postponement_reason] || 0) + 1;

        // Count by status
        analytics.by_status[postponement.status] = 
          (analytics.by_status[postponement.status] || 0) + 1;

        // Sum hours affected
        analytics.total_hours_affected += postponement.hours_affected || 0;
      });

      analytics.average_hours_per_postponement = 
        analytics.total_postponements > 0 
          ? analytics.total_hours_affected / analytics.total_postponements 
          : 0;
    }

    return analytics;
  }

  /**
   * Utility function to extract benefits from reasoning text
   */
  private extractBenefits(reasoning: string): string[] {
    const benefits: string[] = [];
    
    if (reasoning.includes('preferred day')) {
      benefits.push('Matches your preferred day');
    }
    if (reasoning.includes('preferred teacher')) {
      benefits.push('With your preferred teacher');
    }
    if (reasoning.includes('optimal class size')) {
      benefits.push('Ideal class size for learning');
    }
    if (reasoning.includes('good time slot')) {
      benefits.push('Convenient time slot');
    }
    if (reasoning.includes('high availability')) {
      benefits.push('Plenty of available spots');
    }

    return benefits.length > 0 ? benefits : ['Good alternative option'];
  }

  /**
   * Utility function to extract drawbacks from reasoning text
   */
  private extractDrawbacks(reasoning: string): string[] {
    const drawbacks: string[] = [];
    
    if (reasoning.includes('avoided teacher')) {
      drawbacks.push('Different teacher than preferred');
    }
    if (reasoning.includes('limited availability')) {
      drawbacks.push('Limited available spots');
    }
    if (reasoning.includes('acceptable class size')) {
      drawbacks.push('Class size not ideal but acceptable');
    }
    if (reasoning.includes('neutral teacher')) {
      drawbacks.push('Unfamiliar teacher');
    }

    return drawbacks;
  }

  /**
   * Set up real-time subscription for postponement events
   */
  subscribeToPostponementEvents(
    callback: (event: any) => void,
    studentId?: string
  ): () => void {
    const channel = supabase
      .channel('postponement-events')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'class_postponements',
          filter: studentId ? `student_id=eq.${studentId}` : undefined,
        },
        callback
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'make_up_classes',
          filter: studentId ? `student_id=eq.${studentId}` : undefined,
        },
        callback
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}

// Export singleton instance
export const autoPostponementService = AutoPostponementService.getInstance();