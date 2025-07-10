import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

export type DuplicateType = 
  | 'duplicate_enrollment'
  | 'duplicate_class_same_time'
  | 'duplicate_booking'
  | 'duplicate_recurring_booking'
  | 'duplicate_class_content'
  | 'duplicate_teacher_assignment';

export interface DuplicateError {
  type: DuplicateType;
  message: string;
  details: {
    existingRecordId?: string;
    duplicateField?: string;
    conflictingValue?: string;
    suggestedAction?: string;
  };
  severity: 'info' | 'warning' | 'error';
  canProceed: boolean;
}

export interface DuplicateCheckOptions {
  skipTypes?: DuplicateType[];
  allowDuplicates?: boolean;
  strictMode?: boolean;
}

export interface EnrollmentDuplicateData {
  studentId: string;
  classId: string;
  courseId?: string;
  startDate?: string;
  endDate?: string;
}

export interface BookingDuplicateData {
  studentId: string;
  teacherId: string;
  classId: string;
  scheduledAt: string;
  durationMinutes: number;
  recurringPattern?: 'none' | 'weekly' | 'biweekly' | 'monthly';
  parentBookingId?: string;
}

export interface ClassDuplicateData {
  teacherId: string;
  title: string;
  description?: string;
  type: 'individual' | 'group';
  level: 'beginner' | 'intermediate' | 'advanced';
  scheduledAt?: string;
  durationMinutes?: number;
}

export class DuplicatePreventionService {
  /**
   * Check for enrollment duplicates
   */
  async checkEnrollmentDuplicates(
    data: EnrollmentDuplicateData,
    options: DuplicateCheckOptions = {}
  ): Promise<DuplicateError[]> {
    const duplicates: DuplicateError[] = [];
    const { skipTypes = [], allowDuplicates = false, strictMode = false } = options;

    if (skipTypes.includes('duplicate_enrollment')) {
      return duplicates;
    }

    try {
      // Check for existing enrollment in the same class
      const { data: existingEnrollments, error } = await supabase
        .from('bookings')
        .select('id, status, scheduled_at, class:classes(id, title, type)')
        .eq('student_id', data.studentId)
        .eq('class_id', data.classId)
        .in('status', ['pending', 'confirmed']);

      if (error) {
        throw error;
      }

      if (existingEnrollments && existingEnrollments.length > 0) {
        const activeEnrollments = existingEnrollments.filter(enrollment => 
          enrollment.status === 'pending' || enrollment.status === 'confirmed'
        );

        if (activeEnrollments.length > 0) {
          const severity = allowDuplicates ? 'warning' : 'error';
          const canProceed = allowDuplicates || !strictMode;

          duplicates.push({
            type: 'duplicate_enrollment',
            message: `Student is already enrolled in this class`,
            details: {
              existingRecordId: activeEnrollments[0].id,
              duplicateField: 'student_class_enrollment',
              conflictingValue: `${data.studentId}:${data.classId}`,
              suggestedAction: canProceed ? 'Allow multiple enrollments' : 'Choose a different class',
            },
            severity,
            canProceed,
          });
        }
      }

      // Check for course-level duplicates if courseId is provided
      if (data.courseId) {
        const courseDuplicates = await this.checkCourseDuplicates(data.studentId, data.courseId, strictMode);
        duplicates.push(...courseDuplicates);
      }

      // Check for similar class type duplicates in strict mode
      if (strictMode) {
        const similarClassDuplicates = await this.checkSimilarClassDuplicates(data);
        duplicates.push(...similarClassDuplicates);
      }

    } catch (error) {
      console.error('Error checking enrollment duplicates:', error);
    }

    return duplicates;
  }

  /**
   * Check for booking duplicates
   */
  async checkBookingDuplicates(
    data: BookingDuplicateData,
    options: DuplicateCheckOptions = {}
  ): Promise<DuplicateError[]> {
    const duplicates: DuplicateError[] = [];
    const { skipTypes = [], allowDuplicates = false, strictMode = false } = options;

    if (skipTypes.includes('duplicate_booking')) {
      return duplicates;
    }

    try {
      // Check for exact duplicate booking
      const { data: existingBookings, error } = await supabase
        .from('bookings')
        .select('id, status, scheduled_at, duration_minutes')
        .eq('student_id', data.studentId)
        .eq('teacher_id', data.teacherId)
        .eq('class_id', data.classId)
        .eq('scheduled_at', data.scheduledAt)
        .in('status', ['pending', 'confirmed']);

      if (error) {
        throw error;
      }

      if (existingBookings && existingBookings.length > 0) {
        duplicates.push({
          type: 'duplicate_booking',
          message: `Identical booking already exists`,
          details: {
            existingRecordId: existingBookings[0].id,
            duplicateField: 'booking_signature',
            conflictingValue: `${data.studentId}:${data.classId}:${data.scheduledAt}`,
            suggestedAction: 'Update existing booking instead of creating new one',
          },
          severity: 'error',
          canProceed: false,
        });
      }

      // Check for near-duplicate bookings (within 1 hour)
      const nearDuplicates = await this.checkNearDuplicateBookings(data);
      duplicates.push(...nearDuplicates);

      // Check for recurring booking duplicates
      if (data.recurringPattern && data.recurringPattern !== 'none') {
        const recurringDuplicates = await this.checkRecurringBookingDuplicates(data);
        duplicates.push(...recurringDuplicates);
      }

    } catch (error) {
      console.error('Error checking booking duplicates:', error);
    }

    return duplicates;
  }

  /**
   * Check for class creation duplicates
   */
  async checkClassCreationDuplicates(
    data: ClassDuplicateData,
    options: DuplicateCheckOptions = {}
  ): Promise<DuplicateError[]> {
    const duplicates: DuplicateError[] = [];
    const { skipTypes = [], allowDuplicates = false, strictMode = false } = options;

    if (skipTypes.includes('duplicate_class_content')) {
      return duplicates;
    }

    try {
      // Check for identical class title by same teacher
      const { data: existingClasses, error } = await supabase
        .from('classes')
        .select('id, title, description, type, level, is_active')
        .eq('teacher_id', data.teacherId)
        .eq('title', data.title)
        .eq('is_active', true);

      if (error) {
        throw error;
      }

      if (existingClasses && existingClasses.length > 0) {
        const severity = allowDuplicates ? 'warning' : 'error';
        const canProceed = allowDuplicates;

        duplicates.push({
          type: 'duplicate_class_content',
          message: `Class with identical title already exists`,
          details: {
            existingRecordId: existingClasses[0].id,
            duplicateField: 'class_title',
            conflictingValue: data.title,
            suggestedAction: canProceed ? 'Use different title' : 'Update existing class',
          },
          severity,
          canProceed,
        });
      }

      // Check for similar class content in strict mode
      if (strictMode) {
        const similarClassDuplicates = await this.checkSimilarClassContent(data);
        duplicates.push(...similarClassDuplicates);
      }

      // Check for scheduled time conflicts if scheduling data is provided
      if (data.scheduledAt && data.durationMinutes) {
        const scheduleDuplicates = await this.checkScheduleDuplicates(data);
        duplicates.push(...scheduleDuplicates);
      }

    } catch (error) {
      console.error('Error checking class creation duplicates:', error);
    }

    return duplicates;
  }

  /**
   * Check for course-level duplicates
   */
  private async checkCourseDuplicates(
    studentId: string,
    courseId: string,
    strictMode: boolean
  ): Promise<DuplicateError[]> {
    const duplicates: DuplicateError[] = [];

    try {
      // Check if student is already enrolled in this course
      const { data: courseEnrollments, error } = await supabase
        .from('student_courses')
        .select('student_id, course_id, enrollment_date, progress_percentage')
        .eq('student_id', studentId)
        .eq('course_id', courseId);

      if (error) {
        throw error;
      }

      if (courseEnrollments && courseEnrollments.length > 0) {
        const enrollment = courseEnrollments[0];
        const severity = strictMode ? 'error' : 'warning';
        const canProceed = !strictMode;

        duplicates.push({
          type: 'duplicate_enrollment',
          message: `Student is already enrolled in this course`,
          details: {
            existingRecordId: `${enrollment.student_id}:${enrollment.course_id}`,
            duplicateField: 'course_enrollment',
            conflictingValue: courseId,
            suggestedAction: canProceed ? 'Continue with additional class' : 'Choose different course',
          },
          severity,
          canProceed,
        });
      }
    } catch (error) {
      console.error('Error checking course duplicates:', error);
    }

    return duplicates;
  }

  /**
   * Check for similar class duplicates
   */
  private async checkSimilarClassDuplicates(data: EnrollmentDuplicateData): Promise<DuplicateError[]> {
    const duplicates: DuplicateError[] = [];

    try {
      // Get the target class details
      const { data: targetClass, error: classError } = await supabase
        .from('classes')
        .select('id, title, type, level, description')
        .eq('id', data.classId)
        .single();

      if (classError) {
        throw classError;
      }

      // Find similar classes the student is enrolled in
      const { data: existingBookings, error } = await supabase
        .from('bookings')
        .select(`
          id, 
          status, 
          class:classes(id, title, type, level, description)
        `)
        .eq('student_id', data.studentId)
        .in('status', ['pending', 'confirmed'])
        .neq('class_id', data.classId);

      if (error) {
        throw error;
      }

      for (const booking of existingBookings || []) {
        const existingClass = booking.class;
        
        // Check for similar type and level
        if (existingClass.type === targetClass.type && 
            existingClass.level === targetClass.level) {
          
          // Check for similar title (basic similarity check)
          const similarity = this.calculateStringSimilarity(
            targetClass.title.toLowerCase(),
            existingClass.title.toLowerCase()
          );

          if (similarity > 0.7) { // 70% similarity threshold
            duplicates.push({
              type: 'duplicate_enrollment',
              message: `Student is enrolled in a similar class: "${existingClass.title}"`,
              details: {
                existingRecordId: booking.id,
                duplicateField: 'class_similarity',
                conflictingValue: `${Math.round(similarity * 100)}% similar`,
                suggestedAction: 'Consider if both classes are necessary',
              },
              severity: 'warning',
              canProceed: true,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error checking similar class duplicates:', error);
    }

    return duplicates;
  }

  /**
   * Check for near-duplicate bookings (within time threshold)
   */
  private async checkNearDuplicateBookings(data: BookingDuplicateData): Promise<DuplicateError[]> {
    const duplicates: DuplicateError[] = [];
    const timeThreshold = 60; // 1 hour in minutes

    try {
      const scheduledTime = new Date(data.scheduledAt);
      const startWindow = new Date(scheduledTime.getTime() - timeThreshold * 60000);
      const endWindow = new Date(scheduledTime.getTime() + timeThreshold * 60000);

      const { data: nearBookings, error } = await supabase
        .from('bookings')
        .select('id, scheduled_at, duration_minutes, class:classes(title)')
        .eq('student_id', data.studentId)
        .eq('teacher_id', data.teacherId)
        .gte('scheduled_at', startWindow.toISOString())
        .lte('scheduled_at', endWindow.toISOString())
        .in('status', ['pending', 'confirmed']);

      if (error) {
        throw error;
      }

      for (const booking of nearBookings || []) {
        const existingTime = new Date(booking.scheduled_at);
        const timeDiff = Math.abs(existingTime.getTime() - scheduledTime.getTime()) / 60000; // in minutes

        if (timeDiff > 0 && timeDiff <= timeThreshold) {
          duplicates.push({
            type: 'duplicate_booking',
            message: `Similar booking exists within ${Math.round(timeDiff)} minutes`,
            details: {
              existingRecordId: booking.id,
              duplicateField: 'booking_time_proximity',
              conflictingValue: `${Math.round(timeDiff)} minutes apart`,
              suggestedAction: 'Consider rescheduling or combining sessions',
            },
            severity: 'warning',
            canProceed: true,
          });
        }
      }
    } catch (error) {
      console.error('Error checking near-duplicate bookings:', error);
    }

    return duplicates;
  }

  /**
   * Check for recurring booking duplicates
   */
  private async checkRecurringBookingDuplicates(data: BookingDuplicateData): Promise<DuplicateError[]> {
    const duplicates: DuplicateError[] = [];

    try {
      // Check for existing recurring bookings with same pattern
      const { data: existingRecurring, error } = await supabase
        .from('bookings')
        .select('id, recurring_pattern, scheduled_at, parent_booking_id')
        .eq('student_id', data.studentId)
        .eq('teacher_id', data.teacherId)
        .eq('class_id', data.classId)
        .eq('recurring_pattern', data.recurringPattern)
        .in('status', ['pending', 'confirmed']);

      if (error) {
        throw error;
      }

      if (existingRecurring && existingRecurring.length > 0) {
        const hasParentBooking = existingRecurring.some(booking => 
          booking.parent_booking_id === null // This is a parent booking
        );

        if (hasParentBooking) {
          duplicates.push({
            type: 'duplicate_recurring_booking',
            message: `Recurring booking with same pattern already exists`,
            details: {
              existingRecordId: existingRecurring[0].id,
              duplicateField: 'recurring_pattern',
              conflictingValue: data.recurringPattern,
              suggestedAction: 'Modify existing recurring booking or choose different pattern',
            },
            severity: 'error',
            canProceed: false,
          });
        }
      }
    } catch (error) {
      console.error('Error checking recurring booking duplicates:', error);
    }

    return duplicates;
  }

  /**
   * Check for similar class content
   */
  private async checkSimilarClassContent(data: ClassDuplicateData): Promise<DuplicateError[]> {
    const duplicates: DuplicateError[] = [];

    try {
      const { data: existingClasses, error } = await supabase
        .from('classes')
        .select('id, title, description, type, level')
        .eq('teacher_id', data.teacherId)
        .eq('type', data.type)
        .eq('level', data.level)
        .eq('is_active', true)
        .neq('title', data.title);

      if (error) {
        throw error;
      }

      for (const existingClass of existingClasses || []) {
        // Check title similarity
        const titleSimilarity = this.calculateStringSimilarity(
          data.title.toLowerCase(),
          existingClass.title.toLowerCase()
        );

        let descriptionSimilarity = 0;
        if (data.description && existingClass.description) {
          descriptionSimilarity = this.calculateStringSimilarity(
            data.description.toLowerCase(),
            existingClass.description.toLowerCase()
          );
        }

        const overallSimilarity = (titleSimilarity + descriptionSimilarity) / 2;

        if (overallSimilarity > 0.8) { // 80% similarity threshold
          duplicates.push({
            type: 'duplicate_class_content',
            message: `Very similar class already exists: "${existingClass.title}"`,
            details: {
              existingRecordId: existingClass.id,
              duplicateField: 'class_content_similarity',
              conflictingValue: `${Math.round(overallSimilarity * 100)}% similar`,
              suggestedAction: 'Consider updating existing class or making content more distinct',
            },
            severity: 'warning',
            canProceed: true,
          });
        }
      }
    } catch (error) {
      console.error('Error checking similar class content:', error);
    }

    return duplicates;
  }

  /**
   * Check for schedule duplicates
   */
  private async checkScheduleDuplicates(data: ClassDuplicateData): Promise<DuplicateError[]> {
    const duplicates: DuplicateError[] = [];

    if (!data.scheduledAt || !data.durationMinutes) {
      return duplicates;
    }

    try {
      const scheduledTime = new Date(data.scheduledAt);
      const endTime = new Date(scheduledTime.getTime() + data.durationMinutes * 60000);

      // Check for overlapping classes by the same teacher
      const { data: overlappingClasses, error } = await supabase
        .from('bookings')
        .select('id, scheduled_at, duration_minutes, class:classes(title)')
        .eq('teacher_id', data.teacherId)
        .gte('scheduled_at', scheduledTime.toISOString())
        .lte('scheduled_at', endTime.toISOString())
        .in('status', ['pending', 'confirmed']);

      if (error) {
        throw error;
      }

      for (const booking of overlappingClasses || []) {
        const existingStart = new Date(booking.scheduled_at);
        const existingEnd = new Date(existingStart.getTime() + booking.duration_minutes * 60000);

        // Check for time overlap
        if (scheduledTime < existingEnd && endTime > existingStart) {
          duplicates.push({
            type: 'duplicate_class_same_time',
            message: `Teacher already has a class scheduled at this time`,
            details: {
              existingRecordId: booking.id,
              duplicateField: 'class_schedule_overlap',
              conflictingValue: booking.scheduled_at,
              suggestedAction: 'Choose a different time slot',
            },
            severity: 'error',
            canProceed: false,
          });
        }
      }
    } catch (error) {
      console.error('Error checking schedule duplicates:', error);
    }

    return duplicates;
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(null));

    for (let i = 0; i <= len1; i++) {
      matrix[i][0] = i;
    }

    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    const maxLength = Math.max(len1, len2);
    return maxLength === 0 ? 1 : (maxLength - matrix[len1][len2]) / maxLength;
  }

  /**
   * Batch duplicate checking
   */
  async checkBatchDuplicates<T>(
    items: T[],
    checkFunction: (item: T) => Promise<DuplicateError[]>
  ): Promise<Map<string, DuplicateError[]>> {
    const results = new Map<string, DuplicateError[]>();

    for (const [index, item] of items.entries()) {
      const key = `item_${index}`;
      const duplicates = await checkFunction(item);
      results.set(key, duplicates);
    }

    return results;
  }

  /**
   * Get duplicate prevention summary
   */
  getDuplicateSummary(duplicates: DuplicateError[]): {
    hasErrors: boolean;
    hasWarnings: boolean;
    canProceed: boolean;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    messages: string[];
    suggestedActions: string[];
  } {
    const errorCount = duplicates.filter(d => d.severity === 'error').length;
    const warningCount = duplicates.filter(d => d.severity === 'warning').length;
    const infoCount = duplicates.filter(d => d.severity === 'info').length;

    return {
      hasErrors: errorCount > 0,
      hasWarnings: warningCount > 0,
      canProceed: duplicates.every(d => d.canProceed),
      errorCount,
      warningCount,
      infoCount,
      messages: duplicates.map(d => d.message),
      suggestedActions: duplicates
        .map(d => d.details.suggestedAction)
        .filter(Boolean) as string[],
    };
  }
}

export const duplicatePreventionService = new DuplicatePreventionService();