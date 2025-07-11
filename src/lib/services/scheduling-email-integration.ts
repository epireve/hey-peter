import { logger } from '@/lib/services';
import { 
  getEmailNotificationService, 
  NotificationTrigger,
  BookingNotificationData,
  ScheduleChangeNotificationData,
  ConflictNotificationData 
} from './email-notification-service';

// Integration service for scheduling system and email notifications
export class SchedulingEmailIntegration {
  private notificationService = getEmailNotificationService();

  // Handle new booking creation
  async handleBookingCreated(bookingData: {
    bookingId: string;
    studentId: string;
    teacherId: string;
    courseId: string;
    classDateTime: Date;
    duration: number;
    location: string;
    isOnline: boolean;
    joinLink?: string;
  }): Promise<void> {
    try {
      // In a real implementation, these would fetch from the database
      const studentData = await this.fetchStudentData(bookingData.studentId);
      const teacherData = await this.fetchTeacherData(bookingData.teacherId);
      const courseData = await this.fetchCourseData(bookingData.courseId);

      const notificationData: BookingNotificationData = {
        bookingId: bookingData.bookingId,
        studentId: bookingData.studentId,
        studentName: studentData.name,
        studentEmail: studentData.email,
        teacherId: bookingData.teacherId,
        teacherName: teacherData.name,
        courseName: courseData.name,
        classDate: bookingData.classDateTime.toDateString(),
        classTime: bookingData.classDateTime.toLocaleTimeString(),
        location: bookingData.isOnline ? 'Online' : bookingData.location,
        joinLink: bookingData.joinLink,
        duration: bookingData.duration
      };

      await this.notificationService.triggerNotification(
        NotificationTrigger.BOOKING_CREATED,
        notificationData
      );
    } catch (error) {
      logger.error('Failed to send booking creation notification:', error);
    }
  }

  // Handle booking cancellation
  async handleBookingCancelled(bookingData: {
    bookingId: string;
    studentId: string;
    teacherId: string;
    courseId: string;
    classDateTime: Date;
    reason: string;
  }): Promise<void> {
    try {
      const studentData = await this.fetchStudentData(bookingData.studentId);
      const teacherData = await this.fetchTeacherData(bookingData.teacherId);
      const courseData = await this.fetchCourseData(bookingData.courseId);

      const notificationData: BookingNotificationData = {
        bookingId: bookingData.bookingId,
        studentId: bookingData.studentId,
        studentName: studentData.name,
        studentEmail: studentData.email,
        teacherId: bookingData.teacherId,
        teacherName: teacherData.name,
        courseName: courseData.name,
        classDate: bookingData.classDateTime.toDateString(),
        classTime: bookingData.classDateTime.toLocaleTimeString(),
        location: '',
        duration: 0
      };

      await this.notificationService.triggerNotification(
        NotificationTrigger.BOOKING_CANCELLED,
        notificationData
      );
    } catch (error) {
      logger.error('Failed to send booking cancellation notification:', error);
    }
  }

  // Handle schedule change
  async handleScheduleChange(changeData: {
    bookingId: string;
    affectedUserId: string;
    originalDateTime: Date;
    newDateTime: Date;
    reason: string;
    courseId: string;
  }): Promise<void> {
    try {
      const userData = await this.fetchUserData(changeData.affectedUserId);
      const courseData = await this.fetchCourseData(changeData.courseId);

      const notificationData: ScheduleChangeNotificationData = {
        affectedUserId: changeData.affectedUserId,
        affectedUserName: userData.name,
        affectedUserEmail: userData.email,
        originalDate: changeData.originalDateTime.toDateString(),
        originalTime: changeData.originalDateTime.toLocaleTimeString(),
        newDate: changeData.newDateTime.toDateString(),
        newTime: changeData.newDateTime.toLocaleTimeString(),
        reason: changeData.reason,
        courseName: courseData.name
      };

      await this.notificationService.triggerNotification(
        NotificationTrigger.BOOKING_MODIFIED,
        notificationData
      );
    } catch (error) {
      logger.error('Failed to send schedule change notification:', error);
    }
  }

  // Handle scheduling conflict
  async handleSchedulingConflict(conflictData: {
    conflictId: string;
    conflictType: 'teacher_double_booking' | 'student_double_booking' | 'room_conflict' | 'resource_conflict';
    conflictDateTime: Date;
    affectedBookings: Array<{
      bookingId: string;
      userId: string;
      userRole: 'student' | 'teacher';
      courseId: string;
    }>;
    recommendedResolution: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }): Promise<void> {
    try {
      const affectedUsers = await Promise.all(
        conflictData.affectedBookings.map(async (booking) => {
          const userData = await this.fetchUserData(booking.userId);
          return {
            userId: booking.userId,
            userName: userData.name,
            userEmail: userData.email,
            userRole: booking.userRole
          };
        })
      );

      const courseNames = await Promise.all(
        conflictData.affectedBookings.map(async (booking) => {
          const courseData = await this.fetchCourseData(booking.courseId);
          return courseData.name;
        })
      );

      const notificationData: ConflictNotificationData = {
        conflictId: conflictData.conflictId,
        conflictType: conflictData.conflictType,
        conflictDateTime: conflictData.conflictDateTime.toLocaleString(),
        affectedClasses: courseNames,
        affectedUsers,
        recommendedAction: conflictData.recommendedResolution,
        severity: conflictData.severity
      };

      await this.notificationService.triggerNotification(
        NotificationTrigger.SCHEDULE_CONFLICT,
        notificationData
      );
    } catch (error) {
      logger.error('Failed to send conflict notification:', error);
    }
  }

  // Handle teacher availability change
  async handleTeacherAvailabilityChange(availabilityData: {
    teacherId: string;
    changedSlots: Array<{
      date: Date;
      startTime: string;
      endTime: string;
      oldStatus: 'available' | 'unavailable';
      newStatus: 'available' | 'unavailable';
    }>;
    affectedBookings: Array<{
      bookingId: string;
      studentId: string;
      classDateTime: Date;
    }>;
  }): Promise<void> {
    try {
      const teacherData = await this.fetchTeacherData(availabilityData.teacherId);
      
      const affectedBookings = await Promise.all(
        availabilityData.affectedBookings.map(async (booking) => {
          const studentData = await this.fetchStudentData(booking.studentId);
          return {
            bookingId: booking.bookingId,
            studentName: studentData.name,
            studentEmail: studentData.email,
            classTime: booking.classDateTime.toLocaleString()
          };
        })
      );

      const availabilityChanges = availabilityData.changedSlots.map(slot => ({
        date: slot.date.toDateString(),
        timeSlot: `${slot.startTime} - ${slot.endTime}`,
        oldStatus: slot.oldStatus,
        newStatus: slot.newStatus
      }));

      await this.notificationService.handleTeacherAvailabilityChange({
        teacherId: availabilityData.teacherId,
        teacherName: teacherData.name,
        teacherEmail: teacherData.email,
        availabilityChanges,
        affectedBookings
      });
    } catch (error) {
      logger.error('Failed to send teacher availability change notification:', error);
    }
  }

  // Schedule class reminders
  async scheduleClassReminders(reminderData: {
    bookingId: string;
    studentId: string;
    teacherId: string;
    courseId: string;
    classDateTime: Date;
    joinLink?: string;
    reminderMinutes: number[];
  }): Promise<void> {
    try {
      const studentData = await this.fetchStudentData(reminderData.studentId);
      const teacherData = await this.fetchTeacherData(reminderData.teacherId);
      const courseData = await this.fetchCourseData(reminderData.courseId);

      // Schedule multiple reminders at different intervals
      for (const minutes of reminderData.reminderMinutes) {
        const reminderTime = new Date(reminderData.classDateTime);
        reminderTime.setMinutes(reminderTime.getMinutes() - minutes);

        // Only schedule if reminder time is in the future
        if (reminderTime > new Date()) {
          await this.notificationService.queueBookingReminder(
            studentData.email,
            studentData.name,
            {
              courseName: courseData.name,
              classTime: reminderData.classDateTime.toLocaleTimeString(),
              teacherName: teacherData.name,
              timeUntilClass: `${minutes} minutes`,
              joinLink: reminderData.joinLink
            },
            reminderTime
          );
        }
      }
    } catch (error) {
      logger.error('Failed to schedule class reminders:', error);
    }
  }

  // Mock data fetching functions (replace with actual database calls)
  private async fetchStudentData(studentId: string) {
    // In a real implementation, this would query the database
    return {
      id: studentId,
      name: `Student ${studentId}`,
      email: `student${studentId}@example.com`
    };
  }

  private async fetchTeacherData(teacherId: string) {
    // In a real implementation, this would query the database
    return {
      id: teacherId,
      name: `Teacher ${teacherId}`,
      email: `teacher${teacherId}@example.com`
    };
  }

  private async fetchCourseData(courseId: string) {
    // In a real implementation, this would query the database
    return {
      id: courseId,
      name: `Course ${courseId}`,
      type: 'general'
    };
  }

  private async fetchUserData(userId: string) {
    // In a real implementation, this would query the database
    return {
      id: userId,
      name: `User ${userId}`,
      email: `user${userId}@example.com`
    };
  }
}

// Singleton instance
let schedulingEmailIntegration: SchedulingEmailIntegration | null = null;

export function getSchedulingEmailIntegration(): SchedulingEmailIntegration {
  if (!schedulingEmailIntegration) {
    schedulingEmailIntegration = new SchedulingEmailIntegration();
  }
  return schedulingEmailIntegration;
}

// Integration hooks for scheduling system
export class SchedulingEmailHooks {
  private integration = getSchedulingEmailIntegration();

  // Hook for when a booking is created
  async onBookingCreated(bookingData: any): Promise<void> {
    await this.integration.handleBookingCreated(bookingData);
  }

  // Hook for when a booking is cancelled
  async onBookingCancelled(bookingData: any): Promise<void> {
    await this.integration.handleBookingCancelled(bookingData);
  }

  // Hook for when a schedule changes
  async onScheduleChange(changeData: any): Promise<void> {
    await this.integration.handleScheduleChange(changeData);
  }

  // Hook for when a conflict is detected
  async onConflictDetected(conflictData: any): Promise<void> {
    await this.integration.handleSchedulingConflict(conflictData);
  }

  // Hook for when teacher availability changes
  async onTeacherAvailabilityChange(availabilityData: any): Promise<void> {
    await this.integration.handleTeacherAvailabilityChange(availabilityData);
  }

  // Hook for scheduling reminders
  async scheduleReminders(reminderData: any): Promise<void> {
    await this.integration.scheduleClassReminders(reminderData);
  }
}

// Export hooks instance
export const schedulingEmailHooks = new SchedulingEmailHooks();

export default SchedulingEmailIntegration;