import { CRUDService, withRetry } from "./crud-service";
import { supabase } from "@/lib/supabase";
import { z } from "zod";
import { logger } from '@/lib/services';
import { 
  CLASS_CAPACITY, 
  COURSE_TYPE_CAPACITY, 
  ENROLLMENT_STATUS, 
  CLASS_SPLIT_REASONS 
} from "@/lib/constants";

// Enrollment schema
export const enrollmentSchema = z.object({
  id: z.string().uuid().optional(),
  class_id: z.string().uuid(),
  student_id: z.string().uuid(),
  status: z.enum(['enrolled', 'waitlisted', 'dropped', 'completed']).default('enrolled'),
  enrolled_at: z.string().datetime().optional(),
  waitlisted_at: z.string().datetime().optional(),
  position_in_waitlist: z.number().int().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export type Enrollment = z.infer<typeof enrollmentSchema>;

// Class capacity information
export interface ClassCapacityInfo {
  class_id: string;
  current_enrolled: number;
  max_capacity: number;
  waiting_list_count: number;
  available_spots: number;
  is_full: boolean;
  can_accept_waitlist: boolean;
  course_type: string;
  capacity_utilization: number; // percentage
}

// Waiting list entry
export interface WaitingListEntry {
  id: string;
  student_id: string;
  class_id: string;
  position: number;
  enrolled_at: string;
  student_name: string;
  student_email: string;
}

// Class split recommendation
export interface ClassSplitRecommendation {
  class_id: string;
  current_enrollment: number;
  recommended_action: 'split' | 'create_new' | 'increase_capacity';
  reason: string;
  suggested_splits: Array<{
    students: string[];
    teacher_id?: string;
    time_slot?: string;
  }>;
  priority: 'high' | 'medium' | 'low';
}

export class ClassCapacityService extends CRUDService<Enrollment> {
  constructor() {
    super({
      table: "class_enrollments",
      select: `
        *,
        student:users!class_enrollments_student_id_fkey(id, first_name, last_name, email),
        class:classes!class_enrollments_class_id_fkey(id, title, type, max_students, teacher_id)
      `,
      cache: {
        enabled: true,
        ttl: 5 * 60 * 1000, // 5 minutes
      },
    });
  }

  /**
   * Get class capacity information
   */
  async getClassCapacity(classId: string): Promise<ClassCapacityInfo | null> {
    try {
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('id, type, max_students, title, metadata')
        .eq('id', classId)
        .single();

      if (classError || !classData) {
        throw new Error('Class not found');
      }

      const { data: enrollments, error: enrollmentError } = await supabase
        .from('class_enrollments')
        .select('status')
        .eq('class_id', classId)
        .in('status', [ENROLLMENT_STATUS.ENROLLED, ENROLLMENT_STATUS.WAITLISTED]);

      if (enrollmentError) {
        throw new Error('Failed to fetch enrollments');
      }

      const enrolled = enrollments?.filter(e => e.status === ENROLLMENT_STATUS.ENROLLED) || [];
      const waitlisted = enrollments?.filter(e => e.status === ENROLLMENT_STATUS.WAITLISTED) || [];

      const maxCapacity = classData.max_students || 
        (classData.type === 'individual' ? CLASS_CAPACITY.INDIVIDUAL : CLASS_CAPACITY.GROUP_MAX);

      const availableSpots = Math.max(0, maxCapacity - enrolled.length);
      const capacityUtilization = (enrolled.length / maxCapacity) * 100;

      return {
        class_id: classId,
        current_enrolled: enrolled.length,
        max_capacity: maxCapacity,
        waiting_list_count: waitlisted.length,
        available_spots: availableSpots,
        is_full: enrolled.length >= maxCapacity,
        can_accept_waitlist: waitlisted.length < CLASS_CAPACITY.WAITING_LIST_MAX,
        course_type: classData.type,
        capacity_utilization: Math.round(capacityUtilization),
      };
    } catch (error) {
      logger.error('Error getting class capacity:', error);
      return null;
    }
  }

  /**
   * Enroll a student in a class
   */
  async enrollStudent(classId: string, studentId: string): Promise<{
    success: boolean;
    enrollment?: Enrollment;
    waitlisted?: boolean;
    position?: number;
    error?: string;
  }> {
    try {
      const capacity = await this.getClassCapacity(classId);
      if (!capacity) {
        return { success: false, error: 'Class not found' };
      }

      // Check if student is already enrolled or waitlisted
      const { data: existing } = await supabase
        .from('class_enrollments')
        .select('*')
        .eq('class_id', classId)
        .eq('student_id', studentId)
        .in('status', [ENROLLMENT_STATUS.ENROLLED, ENROLLMENT_STATUS.WAITLISTED])
        .single();

      if (existing) {
        return { 
          success: false, 
          error: existing.status === ENROLLMENT_STATUS.ENROLLED ? 'Student already enrolled' : 'Student already waitlisted' 
        };
      }

      // Direct enrollment if space available
      if (capacity.available_spots > 0) {
        const { data: enrollment, error } = await supabase
          .from('class_enrollments')
          .insert({
            class_id: classId,
            student_id: studentId,
            status: ENROLLMENT_STATUS.ENROLLED,
            enrolled_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) {
          return { success: false, error: error.message };
        }

        return { success: true, enrollment: enrollment as Enrollment };
      }

      // Add to waiting list if no space but waitlist available
      if (capacity.can_accept_waitlist) {
        const position = capacity.waiting_list_count + 1;
        
        const { data: enrollment, error } = await supabase
          .from('class_enrollments')
          .insert({
            class_id: classId,
            student_id: studentId,
            status: ENROLLMENT_STATUS.WAITLISTED,
            waitlisted_at: new Date().toISOString(),
            position_in_waitlist: position,
          })
          .select()
          .single();

        if (error) {
          return { success: false, error: error.message };
        }

        return { 
          success: true, 
          enrollment: enrollment as Enrollment, 
          waitlisted: true, 
          position 
        };
      }

      return { success: false, error: 'Class is full and waiting list is at capacity' };
    } catch (error) {
      logger.error('Error enrolling student:', error);
      return { success: false, error: 'Failed to enroll student' };
    }
  }

  /**
   * Drop a student from a class
   */
  async dropStudent(classId: string, studentId: string): Promise<{
    success: boolean;
    promoted_from_waitlist?: boolean;
    error?: string;
  }> {
    try {
      // Update enrollment status to dropped
      const { error: updateError } = await supabase
        .from('class_enrollments')
        .update({ 
          status: ENROLLMENT_STATUS.DROPPED,
          updated_at: new Date().toISOString(),
        })
        .eq('class_id', classId)
        .eq('student_id', studentId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      // Check if we can promote someone from waitlist
      const promoted = await this.promoteFromWaitlist(classId);

      return { success: true, promoted_from_waitlist: promoted };
    } catch (error) {
      logger.error('Error dropping student:', error);
      return { success: false, error: 'Failed to drop student' };
    }
  }

  /**
   * Promote the next student from waiting list
   */
  async promoteFromWaitlist(classId: string): Promise<boolean> {
    try {
      const capacity = await this.getClassCapacity(classId);
      if (!capacity || capacity.available_spots === 0) {
        return false;
      }

      // Get the next student in line
      const { data: nextStudent, error } = await supabase
        .from('class_enrollments')
        .select('*')
        .eq('class_id', classId)
        .eq('status', ENROLLMENT_STATUS.WAITLISTED)
        .order('position_in_waitlist', { ascending: true })
        .limit(1)
        .single();

      if (error || !nextStudent) {
        return false;
      }

      // Promote to enrolled
      const { error: promotionError } = await supabase
        .from('class_enrollments')
        .update({
          status: ENROLLMENT_STATUS.ENROLLED,
          enrolled_at: new Date().toISOString(),
          position_in_waitlist: null,
        })
        .eq('id', nextStudent.id);

      if (promotionError) {
        return false;
      }

      // Update positions for remaining waitlisted students
      await this.updateWaitlistPositions(classId);

      return true;
    } catch (error) {
      logger.error('Error promoting from waitlist:', error);
      return false;
    }
  }

  /**
   * Update waiting list positions after a change
   */
  private async updateWaitlistPositions(classId: string): Promise<void> {
    const { data: waitlisted } = await supabase
      .from('class_enrollments')
      .select('id')
      .eq('class_id', classId)
      .eq('status', ENROLLMENT_STATUS.WAITLISTED)
      .order('waitlisted_at', { ascending: true });

    if (waitlisted) {
      const updates = waitlisted.map((entry, index) => ({
        id: entry.id,
        position_in_waitlist: index + 1,
      }));

      for (const update of updates) {
        await supabase
          .from('class_enrollments')
          .update({ position_in_waitlist: update.position_in_waitlist })
          .eq('id', update.id);
      }
    }
  }

  /**
   * Get waiting list for a class
   */
  async getWaitingList(classId: string): Promise<WaitingListEntry[]> {
    try {
      const { data, error } = await supabase
        .from('class_enrollments')
        .select(`
          id,
          student_id,
          class_id,
          position_in_waitlist,
          waitlisted_at,
          student:users!class_enrollments_student_id_fkey(first_name, last_name, email)
        `)
        .eq('class_id', classId)
        .eq('status', ENROLLMENT_STATUS.WAITLISTED)
        .order('position_in_waitlist', { ascending: true });

      if (error) {
        throw error;
      }

      return (data || []).map(entry => ({
        id: entry.id,
        student_id: entry.student_id,
        class_id: entry.class_id,
        position: entry.position_in_waitlist || 0,
        enrolled_at: entry.waitlisted_at,
        student_name: `${entry.student.first_name} ${entry.student.last_name}`,
        student_email: entry.student.email,
      }));
    } catch (error) {
      logger.error('Error getting waiting list:', error);
      return [];
    }
  }

  /**
   * Get classes that need attention (over capacity, split recommendations, etc.)
   */
  async getClassesThatNeedAttention(): Promise<ClassSplitRecommendation[]> {
    try {
      const { data: classes, error } = await supabase
        .from('classes')
        .select(`
          id,
          title,
          type,
          max_students,
          teacher_id,
          metadata,
          class_enrollments!inner(status)
        `)
        .eq('is_active', true);

      if (error) {
        throw error;
      }

      const recommendations: ClassSplitRecommendation[] = [];

      for (const classData of classes || []) {
        const enrolled = classData.class_enrollments?.filter(
          e => e.status === ENROLLMENT_STATUS.ENROLLED
        ) || [];

        const maxCapacity = classData.max_students || CLASS_CAPACITY.GROUP_MAX;
        const enrollmentCount = enrolled.length;
        const utilization = (enrollmentCount / maxCapacity) * 100;

        // Check if class needs attention
        if (utilization > 85) { // Over 85% capacity
          let recommendedAction: 'split' | 'create_new' | 'increase_capacity' = 'increase_capacity';
          let reason = 'High capacity utilization';
          let priority: 'high' | 'medium' | 'low' = 'medium';

          if (enrollmentCount >= maxCapacity) {
            recommendedAction = 'split';
            reason = 'Class at maximum capacity';
            priority = 'high';
          } else if (utilization > 90) {
            recommendedAction = 'create_new';
            reason = 'Near maximum capacity';
            priority = 'high';
          }

          recommendations.push({
            class_id: classData.id,
            current_enrollment: enrollmentCount,
            recommended_action: recommendedAction,
            reason,
            suggested_splits: [], // TODO: Implement split logic
            priority,
          });
        }
      }

      return recommendations;
    } catch (error) {
      logger.error('Error getting classes that need attention:', error);
      return [];
    }
  }

  /**
   * Create a new class instance when capacity is reached
   */
  async createOverflowClass(originalClassId: string): Promise<{
    success: boolean;
    new_class_id?: string;
    error?: string;
  }> {
    try {
      const { data: originalClass, error: classError } = await supabase
        .from('classes')
        .select('*')
        .eq('id', originalClassId)
        .single();

      if (classError || !originalClass) {
        return { success: false, error: 'Original class not found' };
      }

      // Create new class with similar properties
      const { data: newClass, error: createError } = await supabase
        .from('classes')
        .insert({
          title: `${originalClass.title} (Overflow)`,
          description: originalClass.description,
          type: originalClass.type,
          level: originalClass.level,
          duration_minutes: originalClass.duration_minutes,
          max_students: originalClass.max_students,
          price_per_student: originalClass.price_per_student,
          currency: originalClass.currency,
          teacher_id: originalClass.teacher_id,
          is_active: true,
          metadata: {
            ...originalClass.metadata,
            overflow_from: originalClassId,
            created_reason: 'capacity_overflow',
          },
        })
        .select()
        .single();

      if (createError) {
        return { success: false, error: createError.message };
      }

      return { success: true, new_class_id: newClass.id };
    } catch (error) {
      logger.error('Error creating overflow class:', error);
      return { success: false, error: 'Failed to create overflow class' };
    }
  }

  /**
   * Get enrollment statistics for a class
   */
  async getEnrollmentStats(classId: string): Promise<{
    total_enrolled: number;
    total_waitlisted: number;
    total_dropped: number;
    total_completed: number;
    capacity_utilization: number;
    waitlist_conversion_rate: number;
  }> {
    try {
      const { data: enrollments, error } = await supabase
        .from('class_enrollments')
        .select('status')
        .eq('class_id', classId);

      if (error) {
        throw error;
      }

      const stats = {
        total_enrolled: 0,
        total_waitlisted: 0,
        total_dropped: 0,
        total_completed: 0,
        capacity_utilization: 0,
        waitlist_conversion_rate: 0,
      };

      const capacity = await this.getClassCapacity(classId);
      if (!capacity) {
        return stats;
      }

      enrollments?.forEach(enrollment => {
        switch (enrollment.status) {
          case ENROLLMENT_STATUS.ENROLLED:
            stats.total_enrolled++;
            break;
          case ENROLLMENT_STATUS.WAITLISTED:
            stats.total_waitlisted++;
            break;
          case ENROLLMENT_STATUS.DROPPED:
            stats.total_dropped++;
            break;
          case ENROLLMENT_STATUS.COMPLETED:
            stats.total_completed++;
            break;
        }
      });

      stats.capacity_utilization = Math.round((stats.total_enrolled / capacity.max_capacity) * 100);
      
      // Calculate waitlist conversion rate
      const totalWaitlisted = stats.total_waitlisted + stats.total_enrolled;
      if (totalWaitlisted > 0) {
        stats.waitlist_conversion_rate = Math.round((stats.total_enrolled / totalWaitlisted) * 100);
      }

      return stats;
    } catch (error) {
      logger.error('Error getting enrollment stats:', error);
      return {
        total_enrolled: 0,
        total_waitlisted: 0,
        total_dropped: 0,
        total_completed: 0,
        capacity_utilization: 0,
        waitlist_conversion_rate: 0,
      };
    }
  }

  /**
   * Validate class capacity based on course type
   */
  validateClassCapacity(courseType: string, requestedCapacity: number): {
    valid: boolean;
    message?: string;
    recommended_capacity?: number;
  } {
    const capacityRules = COURSE_TYPE_CAPACITY[courseType as keyof typeof COURSE_TYPE_CAPACITY];
    
    if (!capacityRules) {
      return {
        valid: false,
        message: 'Unknown course type',
        recommended_capacity: CLASS_CAPACITY.GROUP_OPTIMAL,
      };
    }

    if (requestedCapacity < capacityRules.min) {
      return {
        valid: false,
        message: `Minimum capacity for ${courseType} is ${capacityRules.min}`,
        recommended_capacity: capacityRules.min,
      };
    }

    if (requestedCapacity > capacityRules.max) {
      return {
        valid: false,
        message: `Maximum capacity for ${courseType} is ${capacityRules.max}`,
        recommended_capacity: capacityRules.max,
      };
    }

    return { valid: true };
  }
}

// Export singleton instance
export const classCapacityService = new ClassCapacityService();