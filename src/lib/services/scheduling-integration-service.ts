import { logger } from '@/lib/services';
/**
 * Scheduling Integration Service
 * 
 * This service integrates the auto-postponement system with the existing scheduling system
 * to ensure seamless handling of postponements and make-up class scheduling.
 */

import { supabase } from '@/lib/supabase';
import { schedulingService } from './scheduling-service';
import { autoPostponementService } from './auto-postponement-service';
import { makeUpClassSuggestionService } from './makeup-class-suggestion-service';
import { withRetry } from './crud-service';
import type { 
  SchedulingRequest, 
  SchedulingResult, 
  ScheduledClass 
} from '@/types/scheduling';

export interface PostponementSchedulingRequest extends SchedulingRequest {
  postponement_id: string;
  original_class_id: string;
  make_up_class_id: string;
  student_preferences?: any;
  priority_level?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface PostponementSchedulingResult extends SchedulingResult {
  postponement_id: string;
  make_up_class_id: string;
  booking_created: boolean;
  booking_id?: string;
  original_class_cancelled: boolean;
  notifications_sent: boolean;
}

export interface SchedulingIntegrationConfig {
  auto_scheduling_enabled: boolean;
  notification_enabled: boolean;
  approval_required: boolean;
  max_suggestions_per_postponement: number;
  suggestion_expiry_hours: number;
  retry_attempts: number;
  integration_endpoints: {
    scheduling_service: string;
    notification_service: string;
    analytics_service: string;
  };
}

export class SchedulingIntegrationService {
  private static instance: SchedulingIntegrationService;
  private config: SchedulingIntegrationConfig;

  private constructor() {
    this.config = {
      auto_scheduling_enabled: true,
      notification_enabled: true,
      approval_required: true,
      max_suggestions_per_postponement: 10,
      suggestion_expiry_hours: 168, // 7 days
      retry_attempts: 3,
      integration_endpoints: {
        scheduling_service: '/api/scheduling',
        notification_service: '/api/notifications',
        analytics_service: '/api/analytics',
      },
    };

    this.setupEventListeners();
  }

  public static getInstance(): SchedulingIntegrationService {
    if (!SchedulingIntegrationService.instance) {
      SchedulingIntegrationService.instance = new SchedulingIntegrationService();
    }
    return SchedulingIntegrationService.instance;
  }

  /**
   * Set up event listeners for postponement events
   */
  private setupEventListeners(): void {
    // Listen for leave approval events
    supabase
      .channel('leave-approval-events')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'leave_requests' },
        (payload) => this.handleLeaveApprovalEvent(payload)
      )
      .subscribe();

    // Listen for postponement events
    supabase
      .channel('postponement-events')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'class_postponements' },
        (payload) => this.handlePostponementCreated(payload)
      )
      .subscribe();

    // Listen for make-up class selection events
    supabase
      .channel('makeup-selection-events')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'make_up_classes' },
        (payload) => this.handleMakeUpClassSelection(payload)
      )
      .subscribe();
  }

  /**
   * Handle leave approval event
   */
  private async handleLeaveApprovalEvent(payload: any): Promise<void> {
    try {
      const { old: oldRecord, new: newRecord } = payload;
      
      // Check if leave status changed to approved
      if (oldRecord.status !== 'approved' && newRecord.status === 'approved') {
        logger.info('Leave approved, triggering auto-postponement:', newRecord.id);
        
        // Wait for auto-postponement to complete
        await this.waitForPostponementCreation(newRecord.id);
        
        // Generate make-up suggestions
        await this.generateMakeUpSuggestionsForLeave(newRecord);
      }
    } catch (error) {
      logger.error('Error handling leave approval event:', error);
      await this.logIntegrationError('leave_approval_handling', error);
    }
  }

  /**
   * Handle postponement created event
   */
  private async handlePostponementCreated(payload: any): Promise<void> {
    try {
      const postponement = payload.new;
      
      if (postponement.postponement_type === 'automatic') {
        logger.info('Auto-postponement created, generating suggestions:', postponement.id);
        
        // Generate make-up class suggestions
        await this.generateMakeUpSuggestionsForPostponement(postponement);
        
        // Send notifications
        if (this.config.notification_enabled) {
          await this.sendPostponementNotifications(postponement);
        }
      }
    } catch (error) {
      logger.error('Error handling postponement created event:', error);
      await this.logIntegrationError('postponement_creation_handling', error);
    }
  }

  /**
   * Handle make-up class selection event
   */
  private async handleMakeUpClassSelection(payload: any): Promise<void> {
    try {
      const { old: oldRecord, new: newRecord } = payload;
      
      // Check if student selected a make-up class
      if (!oldRecord.student_selected && newRecord.student_selected) {
        logger.info('Student selected make-up class:', newRecord.id);
        
        // Send notification to admin for approval
        if (this.config.notification_enabled) {
          await this.sendMakeUpSelectionNotification(newRecord);
        }
      }
      
      // Check if admin approved the make-up class
      if (!oldRecord.admin_approved && newRecord.admin_approved) {
        logger.info('Admin approved make-up class:', newRecord.id);
        
        // Schedule the make-up class
        await this.scheduleMakeUpClass(newRecord);
      }
    } catch (error) {
      logger.error('Error handling make-up class selection event:', error);
      await this.logIntegrationError('makeup_selection_handling', error);
    }
  }

  /**
   * Wait for postponement creation to complete
   */
  private async waitForPostponementCreation(leaveRequestId: string): Promise<void> {
    let attempts = 0;
    const maxAttempts = 10;
    const delayMs = 1000;

    while (attempts < maxAttempts) {
      try {
        const { data: postponements, error } = await supabase
          .from('class_postponements')
          .select('*')
          .eq('leave_request_id', leaveRequestId);

        if (error) throw error;

        if (postponements && postponements.length > 0) {
          logger.info(`Found ${postponements.length} postponements for leave request ${leaveRequestId}`);
          return;
        }

        await new Promise(resolve => setTimeout(resolve, delayMs));
        attempts++;
      } catch (error) {
        logger.error(`Attempt ${attempts + 1} failed:`, error);
        attempts++;
      }
    }

    throw new Error(`Postponements not found after ${maxAttempts} attempts for leave request ${leaveRequestId}`);
  }

  /**
   * Generate make-up suggestions for a leave request
   */
  private async generateMakeUpSuggestionsForLeave(leaveRequest: any): Promise<void> {
    try {
      // Get postponements for this leave request
      const { data: postponements, error } = await supabase
        .from('class_postponements')
        .select('*')
        .eq('leave_request_id', leaveRequest.id);

      if (error) throw error;

      if (!postponements || postponements.length === 0) {
        logger.info('No postponements found for leave request:', leaveRequest.id);
        return;
      }

      // Generate suggestions for each postponement
      for (const postponement of postponements) {
        await this.generateMakeUpSuggestionsForPostponement(postponement);
      }
    } catch (error) {
      logger.error('Error generating make-up suggestions for leave:', error);
      throw error;
    }
  }

  /**
   * Generate make-up suggestions for a postponement
   */
  private async generateMakeUpSuggestionsForPostponement(postponement: any): Promise<void> {
    return withRetry(async () => {
      try {
        logger.info('Generating make-up suggestions for postponement:', postponement.id);
        
        // Generate suggestions using the make-up class suggestion service
        const suggestions = await makeUpClassSuggestionService.generateSuggestions({
          student_id: postponement.student_id,
          postponement_id: postponement.id,
          original_class_id: postponement.class_id,
          max_suggestions: this.config.max_suggestions_per_postponement,
        });

        logger.info(`Generated ${suggestions.length} suggestions for postponement ${postponement.id}`);

        // Update postponement status
        await supabase
          .from('class_postponements')
          .update({ 
            status: 'confirmed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', postponement.id);

        return suggestions;
      } catch (error) {
        logger.error('Error generating make-up suggestions for postponement:', error);
        throw error;
      }
    }, {
      maxRetries: this.config.retry_attempts,
      onRetry: (error, attempt) => {
        logger.info(`Retry attempt ${attempt} for postponement ${postponement.id}:`, error);
      },
    });
  }

  /**
   * Schedule a make-up class
   */
  private async scheduleMakeUpClass(makeUpClass: any): Promise<PostponementSchedulingResult> {
    return withRetry(async () => {
      try {
        logger.info('Scheduling make-up class:', makeUpClass.id);

        // Get the selected suggestion
        const selectedSuggestion = makeUpClass.alternative_suggestions.find(
          (s: any) => s.id === makeUpClass.selected_suggestion_id
        );

        if (!selectedSuggestion) {
          throw new Error('Selected suggestion not found');
        }

        // Create a scheduling request
        const schedulingRequest: PostponementSchedulingRequest = {
          id: `makeup-${makeUpClass.id}`,
          type: 'make_up_class',
          priority: 'high',
          studentIds: [makeUpClass.student_id],
          courseId: selectedSuggestion.course_id || makeUpClass.original_class_id,
          postponement_id: makeUpClass.postponement_id,
          original_class_id: makeUpClass.original_class_id,
          make_up_class_id: makeUpClass.id,
          preferredTimeSlots: [{
            startTime: selectedSuggestion.start_time,
            endTime: selectedSuggestion.end_time,
            dayOfWeek: new Date(selectedSuggestion.start_time).getDay(),
          }],
          constraints: {
            maxStudentsPerClass: 9,
            minStudentsForGroupClass: 1,
            workingHours: { start: '09:00', end: '18:00' },
          },
          context: {
            source: 'auto_postponement',
            makeUpClassId: makeUpClass.id,
            originalClassId: makeUpClass.original_class_id,
          },
        };

        // Use the scheduling service to create the actual booking
        const schedulingResult = await schedulingService.scheduleClasses(schedulingRequest);

        // Create the booking record
        let bookingId: string | undefined;
        let bookingCreated = false;

        if (schedulingResult.success && schedulingResult.scheduledClasses.length > 0) {
          const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .insert({
              student_id: makeUpClass.student_id,
              class_id: selectedSuggestion.class_id,
              booking_date: new Date(selectedSuggestion.start_time).toISOString().split('T')[0],
              start_time: selectedSuggestion.start_time,
              end_time: selectedSuggestion.end_time,
              duration_minutes: selectedSuggestion.duration_minutes,
              status: 'confirmed',
              notes: 'Make-up class booking - automatically scheduled',
            })
            .select()
            .single();

          if (bookingError) {
            logger.error('Error creating booking:', bookingError);
          } else {
            bookingId = booking.id;
            bookingCreated = true;
          }
        }

        // Update make-up class status
        await supabase
          .from('make_up_classes')
          .update({
            status: 'scheduled',
            updated_at: new Date().toISOString(),
          })
          .eq('id', makeUpClass.id);

        // Update postponement status
        await supabase
          .from('class_postponements')
          .update({
            status: 'make_up_scheduled',
            updated_at: new Date().toISOString(),
          })
          .eq('id', makeUpClass.postponement_id);

        // Send notifications
        const notificationsSent = await this.sendMakeUpScheduledNotifications(makeUpClass, bookingId);

        const result: PostponementSchedulingResult = {
          ...schedulingResult,
          postponement_id: makeUpClass.postponement_id,
          make_up_class_id: makeUpClass.id,
          booking_created: bookingCreated,
          booking_id: bookingId,
          original_class_cancelled: true,
          notifications_sent: notificationsSent,
        };

        logger.info('Make-up class scheduled successfully:', result);
        return result;
      } catch (error) {
        logger.error('Error scheduling make-up class:', error);
        throw error;
      }
    }, {
      maxRetries: this.config.retry_attempts,
      onRetry: (error, attempt) => {
        logger.info(`Retry attempt ${attempt} for make-up class ${makeUpClass.id}:`, error);
      },
    });
  }

  /**
   * Send postponement notifications
   */
  private async sendPostponementNotifications(postponement: any): Promise<boolean> {
    try {
      // Get student details
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('*, user:users(*)')
        .eq('id', postponement.student_id)
        .single();

      if (studentError || !student) {
        logger.error('Error fetching student for notification:', studentError);
        return false;
      }

      // Create notification
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: student.user.id,
          title: 'Class Postponed',
          message: `Your class has been postponed due to approved leave. Make-up class suggestions will be available shortly.`,
          notification_type: 'class_postponement',
          sent_time: new Date().toISOString(),
        });

      if (notificationError) {
        logger.error('Error creating notification:', notificationError);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error sending postponement notifications:', error);
      return false;
    }
  }

  /**
   * Send make-up selection notification to admin
   */
  private async sendMakeUpSelectionNotification(makeUpClass: any): Promise<boolean> {
    try {
      // Get admin users
      const { data: admins, error: adminError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'admin');

      if (adminError || !admins || admins.length === 0) {
        logger.error('Error fetching admins for notification:', adminError);
        return false;
      }

      // Create notifications for all admins
      const notifications = admins.map(admin => ({
        user_id: admin.id,
        title: 'Make-up Class Selection Pending',
        message: `A student has selected a make-up class option. Please review and approve.`,
        notification_type: 'admin_approval_required',
        sent_time: new Date().toISOString(),
      }));

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notificationError) {
        logger.error('Error creating admin notifications:', notificationError);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error sending make-up selection notifications:', error);
      return false;
    }
  }

  /**
   * Send make-up scheduled notifications
   */
  private async sendMakeUpScheduledNotifications(makeUpClass: any, bookingId?: string): Promise<boolean> {
    try {
      // Get student details
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('*, user:users(*)')
        .eq('id', makeUpClass.student_id)
        .single();

      if (studentError || !student) {
        logger.error('Error fetching student for notification:', studentError);
        return false;
      }

      // Create notification
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: student.user.id,
          title: 'Make-up Class Scheduled',
          message: `Your make-up class has been scheduled successfully. Check your calendar for details.`,
          notification_type: 'make_up_scheduled',
          sent_time: new Date().toISOString(),
        });

      if (notificationError) {
        logger.error('Error creating notification:', notificationError);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error sending make-up scheduled notifications:', error);
      return false;
    }
  }

  /**
   * Log integration error
   */
  private async logIntegrationError(operation: string, error: any): Promise<void> {
    try {
      await supabase
        .from('system_events')
        .insert({
          event_type: 'integration_error',
          event_category: 'auto_postponement',
          description: `Error in ${operation}: ${error.message}`,
          metadata: {
            operation,
            error: error.message,
            stack: error.stack,
          },
          severity: 'error',
        });
    } catch (logError) {
      logger.error('Error logging integration error:', logError);
    }
  }

  /**
   * Update configuration
   */
  updateConfiguration(newConfig: Partial<SchedulingIntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfiguration(): SchedulingIntegrationConfig {
    return { ...this.config };
  }

  /**
   * Get integration health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, boolean>;
    last_check: string;
  }> {
    const services = {
      database: false,
      scheduling_service: false,
      notification_service: false,
    };

    try {
      // Check database connection
      const { error: dbError } = await supabase.from('class_postponements').select('count').limit(1);
      services.database = !dbError;

      // Check other services would go here
      services.scheduling_service = true; // Assume healthy for now
      services.notification_service = true; // Assume healthy for now

      const healthyCount = Object.values(services).filter(Boolean).length;
      const totalCount = Object.values(services).length;

      let status: 'healthy' | 'degraded' | 'unhealthy';
      if (healthyCount === totalCount) {
        status = 'healthy';
      } else if (healthyCount >= totalCount * 0.5) {
        status = 'degraded';
      } else {
        status = 'unhealthy';
      }

      return {
        status,
        services,
        last_check: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Error checking health status:', error);
      return {
        status: 'unhealthy',
        services,
        last_check: new Date().toISOString(),
      };
    }
  }
}

// Export singleton instance
export const schedulingIntegrationService = SchedulingIntegrationService.getInstance();