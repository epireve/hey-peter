import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

export type ConflictType = 
  | 'teacher_time_conflict'
  | 'student_time_conflict'
  | 'resource_conflict'
  | 'class_capacity_conflict'
  | 'duplicate_enrollment'
  | 'duplicate_class'
  | 'schedule_overlap';

export interface ConflictError {
  type: ConflictType;
  message: string;
  details: {
    conflictingBookingId?: string;
    conflictingClassId?: string;
    conflictingTeacherId?: string;
    conflictingStudentId?: string;
    conflictingTime?: string;
    suggestedAlternatives?: string[];
  };
  severity: 'warning' | 'error' | 'critical';
  canProceed: boolean;
}

export interface ConflictDetectionOptions {
  skipTypes?: ConflictType[];
  includeWarnings?: boolean;
  checkFutureConflicts?: boolean;
}

export interface BookingConflictData {
  studentId: string;
  teacherId: string;
  classId: string;
  scheduledAt: string;
  durationMinutes: number;
  recurringPattern?: 'none' | 'weekly' | 'biweekly' | 'monthly';
  recurringEndDate?: string;
  excludeBookingId?: string; // For rescheduling
}

export interface ClassConflictData {
  teacherId: string;
  scheduledAt: string;
  durationMinutes: number;
  maxStudents: number;
  recurringPattern?: 'none' | 'weekly' | 'biweekly' | 'monthly';
  recurringEndDate?: string;
  excludeClassId?: string; // For updates
}

export class ConflictDetectionService {
  /**
   * Comprehensive conflict detection for new bookings
   */
  async checkBookingConflicts(
    data: BookingConflictData,
    options: ConflictDetectionOptions = {}
  ): Promise<ConflictError[]> {
    const conflicts: ConflictError[] = [];
    const { skipTypes = [], includeWarnings = true } = options;

    // Check teacher time conflicts
    if (!skipTypes.includes('teacher_time_conflict')) {
      const teacherConflicts = await this.checkTeacherTimeConflicts(data);
      conflicts.push(...teacherConflicts);
    }

    // Check student time conflicts
    if (!skipTypes.includes('student_time_conflict')) {
      const studentConflicts = await this.checkStudentTimeConflicts(data);
      conflicts.push(...studentConflicts);
    }

    // Check duplicate enrollment
    if (!skipTypes.includes('duplicate_enrollment')) {
      const duplicateEnrollments = await this.checkDuplicateEnrollment(data);
      conflicts.push(...duplicateEnrollments);
    }

    // Check class capacity conflicts
    if (!skipTypes.includes('class_capacity_conflict')) {
      const capacityConflicts = await this.checkClassCapacityConflicts(data);
      conflicts.push(...capacityConflicts);
    }

    // Check teacher availability blocks
    const availabilityConflicts = await this.checkTeacherAvailabilityBlocks(data);
    conflicts.push(...availabilityConflicts);

    // Filter out warnings if not requested
    if (!includeWarnings) {
      return conflicts.filter(c => c.severity !== 'warning');
    }

    return conflicts;
  }

  /**
   * Check for teacher time conflicts
   */
  private async checkTeacherTimeConflicts(data: BookingConflictData): Promise<ConflictError[]> {
    const conflicts: ConflictError[] = [];
    
    const bookingStart = new Date(data.scheduledAt);
    const bookingEnd = new Date(bookingStart.getTime() + data.durationMinutes * 60000);

    try {
      // Check for overlapping bookings
      const { data: existingBookings, error } = await supabase
        .from('bookings')
        .select('id, scheduled_at, duration_minutes, class:classes(title)')
        .eq('teacher_id', data.teacherId)
        .in('status', ['pending', 'confirmed'])
        .gte('scheduled_at', bookingStart.toISOString())
        .lte('scheduled_at', bookingEnd.toISOString());

      if (error) {
        throw error;
      }

      for (const booking of existingBookings || []) {
        if (data.excludeBookingId && booking.id === data.excludeBookingId) {
          continue;
        }

        const existingStart = new Date(booking.scheduled_at);
        const existingEnd = new Date(existingStart.getTime() + booking.duration_minutes * 60000);

        // Check for overlap
        if (this.isTimeOverlap(bookingStart, bookingEnd, existingStart, existingEnd)) {
          conflicts.push({
            type: 'teacher_time_conflict',
            message: `Teacher is already booked during this time`,
            details: {
              conflictingBookingId: booking.id,
              conflictingTeacherId: data.teacherId,
              conflictingTime: booking.scheduled_at,
              suggestedAlternatives: await this.getSuggestedAlternativeSlots(data.teacherId, data.durationMinutes),
            },
            severity: 'error',
            canProceed: false,
          });
        }
      }

      // Check for recurring conflicts if applicable
      if (data.recurringPattern && data.recurringPattern !== 'none' && data.recurringEndDate) {
        const recurringConflicts = await this.checkRecurringConflicts(data);
        conflicts.push(...recurringConflicts);
      }
    } catch (error) {
      console.error('Error checking teacher conflicts:', error);
      conflicts.push({
        type: 'teacher_time_conflict',
        message: 'Unable to verify teacher availability',
        details: { conflictingTeacherId: data.teacherId },
        severity: 'warning',
        canProceed: true,
      });
    }

    return conflicts;
  }

  /**
   * Check for student time conflicts
   */
  private async checkStudentTimeConflicts(data: BookingConflictData): Promise<ConflictError[]> {
    const conflicts: ConflictError[] = [];
    
    const bookingStart = new Date(data.scheduledAt);
    const bookingEnd = new Date(bookingStart.getTime() + data.durationMinutes * 60000);

    try {
      const { data: existingBookings, error } = await supabase
        .from('bookings')
        .select('id, scheduled_at, duration_minutes, class:classes(title)')
        .eq('student_id', data.studentId)
        .in('status', ['pending', 'confirmed'])
        .gte('scheduled_at', bookingStart.toISOString())
        .lte('scheduled_at', bookingEnd.toISOString());

      if (error) {
        throw error;
      }

      for (const booking of existingBookings || []) {
        if (data.excludeBookingId && booking.id === data.excludeBookingId) {
          continue;
        }

        const existingStart = new Date(booking.scheduled_at);
        const existingEnd = new Date(existingStart.getTime() + booking.duration_minutes * 60000);

        if (this.isTimeOverlap(bookingStart, bookingEnd, existingStart, existingEnd)) {
          conflicts.push({
            type: 'student_time_conflict',
            message: `Student already has a class booked during this time`,
            details: {
              conflictingBookingId: booking.id,
              conflictingStudentId: data.studentId,
              conflictingTime: booking.scheduled_at,
            },
            severity: 'error',
            canProceed: false,
          });
        }
      }
    } catch (error) {
      console.error('Error checking student conflicts:', error);
      conflicts.push({
        type: 'student_time_conflict',
        message: 'Unable to verify student availability',
        details: { conflictingStudentId: data.studentId },
        severity: 'warning',
        canProceed: true,
      });
    }

    return conflicts;
  }

  /**
   * Check for duplicate enrollment in the same class
   */
  private async checkDuplicateEnrollment(data: BookingConflictData): Promise<ConflictError[]> {
    const conflicts: ConflictError[] = [];

    try {
      const { data: existingBookings, error } = await supabase
        .from('bookings')
        .select('id, status, scheduled_at')
        .eq('student_id', data.studentId)
        .eq('class_id', data.classId)
        .in('status', ['pending', 'confirmed']);

      if (error) {
        throw error;
      }

      const activeBookings = existingBookings?.filter(b => 
        data.excludeBookingId ? b.id !== data.excludeBookingId : true
      ) || [];

      if (activeBookings.length > 0) {
        conflicts.push({
          type: 'duplicate_enrollment',
          message: `Student is already enrolled in this class`,
          details: {
            conflictingBookingId: activeBookings[0].id,
            conflictingClassId: data.classId,
            conflictingStudentId: data.studentId,
          },
          severity: 'warning',
          canProceed: true, // May allow multiple enrollments in some cases
        });
      }
    } catch (error) {
      console.error('Error checking duplicate enrollment:', error);
    }

    return conflicts;
  }

  /**
   * Check for class capacity conflicts
   */
  private async checkClassCapacityConflicts(data: BookingConflictData): Promise<ConflictError[]> {
    const conflicts: ConflictError[] = [];

    try {
      // Get class details
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('id, max_students, title')
        .eq('id', data.classId)
        .single();

      if (classError) {
        throw classError;
      }

      // Count current active bookings for this class
      const { count, error: countError } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('class_id', data.classId)
        .in('status', ['pending', 'confirmed']);

      if (countError) {
        throw countError;
      }

      const currentBookings = count || 0;

      if (currentBookings >= classData.max_students) {
        conflicts.push({
          type: 'class_capacity_conflict',
          message: `Class is at maximum capacity (${classData.max_students} students)`,
          details: {
            conflictingClassId: data.classId,
          },
          severity: 'error',
          canProceed: false,
        });
      } else if (currentBookings === classData.max_students - 1) {
        conflicts.push({
          type: 'class_capacity_conflict',
          message: `This is the last available spot in the class`,
          details: {
            conflictingClassId: data.classId,
          },
          severity: 'warning',
          canProceed: true,
        });
      }
    } catch (error) {
      console.error('Error checking class capacity:', error);
    }

    return conflicts;
  }

  /**
   * Check teacher availability blocks (breaks, meetings, holidays)
   */
  private async checkTeacherAvailabilityBlocks(data: BookingConflictData): Promise<ConflictError[]> {
    const conflicts: ConflictError[] = [];
    
    const bookingStart = new Date(data.scheduledAt);
    const bookingEnd = new Date(bookingStart.getTime() + data.durationMinutes * 60000);

    try {
      const { data: blocks, error } = await supabase
        .from('availability_blocks')
        .select('id, start_datetime, end_datetime, type, title')
        .eq('teacher_id', data.teacherId)
        .gte('end_datetime', bookingStart.toISOString())
        .lte('start_datetime', bookingEnd.toISOString());

      if (error) {
        throw error;
      }

      for (const block of blocks || []) {
        const blockStart = new Date(block.start_datetime);
        const blockEnd = new Date(block.end_datetime);

        if (this.isTimeOverlap(bookingStart, bookingEnd, blockStart, blockEnd)) {
          conflicts.push({
            type: 'teacher_time_conflict',
            message: `Teacher has a ${block.type} scheduled: ${block.title}`,
            details: {
              conflictingTeacherId: data.teacherId,
              conflictingTime: block.start_datetime,
              suggestedAlternatives: await this.getSuggestedAlternativeSlots(data.teacherId, data.durationMinutes),
            },
            severity: block.type === 'break' ? 'warning' : 'error',
            canProceed: block.type === 'break',
          });
        }
      }
    } catch (error) {
      console.error('Error checking availability blocks:', error);
    }

    return conflicts;
  }

  /**
   * Check for recurring booking conflicts
   */
  private async checkRecurringConflicts(data: BookingConflictData): Promise<ConflictError[]> {
    const conflicts: ConflictError[] = [];
    
    if (!data.recurringPattern || data.recurringPattern === 'none' || !data.recurringEndDate) {
      return conflicts;
    }

    const recurringDates = this.generateRecurringDates(
      new Date(data.scheduledAt),
      data.recurringPattern,
      new Date(data.recurringEndDate)
    );

    for (const date of recurringDates.slice(1)) { // Skip first date as it's already checked
      const recurringData = {
        ...data,
        scheduledAt: date.toISOString(),
        recurringPattern: 'none' as const, // Avoid infinite recursion
      };

      const dateConflicts = await this.checkBookingConflicts(recurringData, {
        skipTypes: ['duplicate_enrollment'], // Allow same class multiple times in recurring
      });

      conflicts.push(...dateConflicts);
    }

    return conflicts;
  }

  /**
   * Generate suggested alternative time slots
   */
  private async getSuggestedAlternativeSlots(teacherId: string, durationMinutes: number): Promise<string[]> {
    const suggestions: string[] = [];

    try {
      // Get teacher's availability for the next 7 days
      const { data: availability, error } = await supabase
        .from('teacher_availability')
        .select('day_of_week, start_time, end_time')
        .eq('teacher_id', teacherId)
        .eq('is_available', true);

      if (error) {
        throw error;
      }

      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      for (const slot of availability || []) {
        // Find next occurrence of this day
        const nextOccurrence = this.getNextOccurrence(now, slot.day_of_week);
        if (nextOccurrence <= nextWeek) {
          const startTime = new Date(nextOccurrence);
          const [hours, minutes] = slot.start_time.split(':').map(Number);
          startTime.setHours(hours, minutes, 0, 0);

          suggestions.push(startTime.toISOString());
        }
      }
    } catch (error) {
      console.error('Error generating suggestions:', error);
    }

    return suggestions.slice(0, 3); // Limit to 3 suggestions
  }

  /**
   * Helper: Check if two time ranges overlap
   */
  private isTimeOverlap(
    start1: Date,
    end1: Date,
    start2: Date,
    end2: Date
  ): boolean {
    return start1 < end2 && end1 > start2;
  }

  /**
   * Helper: Generate recurring dates
   */
  private generateRecurringDates(
    startDate: Date,
    pattern: 'weekly' | 'biweekly' | 'monthly',
    endDate: Date
  ): Date[] {
    const dates: Date[] = [startDate];
    let currentDate = new Date(startDate);

    while (currentDate < endDate) {
      switch (pattern) {
        case 'weekly':
          currentDate = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case 'biweekly':
          currentDate = new Date(currentDate.getTime() + 14 * 24 * 60 * 60 * 1000);
          break;
        case 'monthly':
          currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDate());
          break;
      }

      if (currentDate <= endDate) {
        dates.push(new Date(currentDate));
      }
    }

    return dates;
  }

  /**
   * Helper: Get next occurrence of a day of week
   */
  private getNextOccurrence(fromDate: Date, dayOfWeek: number): Date {
    const date = new Date(fromDate);
    const days = (dayOfWeek - date.getDay() + 7) % 7;
    date.setDate(date.getDate() + days);
    return date;
  }

  /**
   * Batch conflict checking for multiple bookings
   */
  async checkBatchBookingConflicts(
    bookings: BookingConflictData[],
    options: ConflictDetectionOptions = {}
  ): Promise<Map<string, ConflictError[]>> {
    const results = new Map<string, ConflictError[]>();

    for (const [index, booking] of bookings.entries()) {
      const key = `booking_${index}`;
      const conflicts = await this.checkBookingConflicts(booking, options);
      results.set(key, conflicts);
    }

    return results;
  }

  /**
   * Check for class creation conflicts
   */
  async checkClassCreationConflicts(
    data: ClassConflictData,
    options: ConflictDetectionOptions = {}
  ): Promise<ConflictError[]> {
    const conflicts: ConflictError[] = [];

    // Check for duplicate class at same time
    const duplicateConflicts = await this.checkDuplicateClassConflicts(data);
    conflicts.push(...duplicateConflicts);

    // Check teacher availability
    const teacherConflicts = await this.checkTeacherScheduleConflicts(data);
    conflicts.push(...teacherConflicts);

    return conflicts;
  }

  /**
   * Check for duplicate class conflicts
   */
  private async checkDuplicateClassConflicts(data: ClassConflictData): Promise<ConflictError[]> {
    const conflicts: ConflictError[] = [];

    try {
      const { data: existingClasses, error } = await supabase
        .from('classes')
        .select('id, title')
        .eq('teacher_id', data.teacherId)
        .eq('is_active', true);

      if (error) {
        throw error;
      }

      // Check for bookings of existing classes at the same time
      for (const existingClass of existingClasses || []) {
        if (data.excludeClassId && existingClass.id === data.excludeClassId) {
          continue;
        }

        const { data: conflictingBookings, error: bookingError } = await supabase
          .from('bookings')
          .select('id, scheduled_at, duration_minutes')
          .eq('class_id', existingClass.id)
          .in('status', ['pending', 'confirmed']);

        if (bookingError) {
          continue;
        }

        const bookingStart = new Date(data.scheduledAt);
        const bookingEnd = new Date(bookingStart.getTime() + data.durationMinutes * 60000);

        for (const booking of conflictingBookings || []) {
          const existingStart = new Date(booking.scheduled_at);
          const existingEnd = new Date(existingStart.getTime() + booking.duration_minutes * 60000);

          if (this.isTimeOverlap(bookingStart, bookingEnd, existingStart, existingEnd)) {
            conflicts.push({
              type: 'duplicate_class',
              message: `Teacher already has a class scheduled at this time`,
              details: {
                conflictingClassId: existingClass.id,
                conflictingTime: booking.scheduled_at,
              },
              severity: 'error',
              canProceed: false,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error checking duplicate class conflicts:', error);
    }

    return conflicts;
  }

  /**
   * Check teacher schedule conflicts for class creation
   */
  private async checkTeacherScheduleConflicts(data: ClassConflictData): Promise<ConflictError[]> {
    const conflicts: ConflictError[] = [];

    // This would implement similar logic to checkTeacherTimeConflicts
    // but for class creation instead of booking creation
    
    return conflicts;
  }

  /**
   * Get comprehensive conflict summary
   */
  getConflictSummary(conflicts: ConflictError[]): {
    hasErrors: boolean;
    hasWarnings: boolean;
    canProceed: boolean;
    errorCount: number;
    warningCount: number;
    criticalCount: number;
    messages: string[];
  } {
    const errorCount = conflicts.filter(c => c.severity === 'error').length;
    const warningCount = conflicts.filter(c => c.severity === 'warning').length;
    const criticalCount = conflicts.filter(c => c.severity === 'critical').length;

    return {
      hasErrors: errorCount > 0 || criticalCount > 0,
      hasWarnings: warningCount > 0,
      canProceed: conflicts.every(c => c.canProceed),
      errorCount,
      warningCount,
      criticalCount,
      messages: conflicts.map(c => c.message),
    };
  }
}

export const conflictDetectionService = new ConflictDetectionService();