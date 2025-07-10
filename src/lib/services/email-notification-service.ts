import { 
  getEmailQueueService, 
  queueBookingConfirmation, 
  queueBookingReminder, 
  queueScheduleChange, 
  queueConflictAlert 
} from './email-queue-service';
import { EmailPriority } from './email-service';

// Notification trigger types
export enum NotificationTrigger {
  BOOKING_CREATED = 'booking_created',
  BOOKING_CANCELLED = 'booking_cancelled',
  BOOKING_MODIFIED = 'booking_modified',
  SCHEDULE_CONFLICT = 'schedule_conflict',
  TEACHER_AVAILABILITY_CHANGED = 'teacher_availability_changed',
  CLASS_REMINDER = 'class_reminder',
  SYSTEM_MAINTENANCE = 'system_maintenance',
  STUDENT_PROGRESS_UPDATE = 'student_progress_update'
}

// Notification preferences
export interface NotificationPreferences {
  userId: string;
  emailNotifications: boolean;
  bookingConfirmations: boolean;
  bookingReminders: boolean;
  scheduleChanges: boolean;
  conflictAlerts: boolean;
  systemAlerts: boolean;
  reminderTiming: number; // minutes before class
}

// Notification data interfaces
export interface BookingNotificationData {
  bookingId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  teacherId: string;
  teacherName: string;
  courseName: string;
  classDate: string;
  classTime: string;
  location: string;
  joinLink?: string;
  duration: number;
}

export interface ScheduleChangeNotificationData {
  affectedUserId: string;
  affectedUserName: string;
  affectedUserEmail: string;
  originalDate: string;
  originalTime: string;
  newDate: string;
  newTime: string;
  reason: string;
  courseName: string;
}

export interface ConflictNotificationData {
  conflictId: string;
  conflictType: string;
  conflictDateTime: string;
  affectedClasses: string[];
  affectedUsers: Array<{
    userId: string;
    userName: string;
    userEmail: string;
    userRole: 'student' | 'teacher';
  }>;
  recommendedAction: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface TeacherAvailabilityNotificationData {
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  availabilityChanges: Array<{
    date: string;
    timeSlot: string;
    oldStatus: 'available' | 'unavailable';
    newStatus: 'available' | 'unavailable';
  }>;
  affectedBookings: Array<{
    bookingId: string;
    studentName: string;
    studentEmail: string;
    classTime: string;
  }>;
}

export class EmailNotificationService {
  private queueService = getEmailQueueService();
  private preferences: Map<string, NotificationPreferences> = new Map();

  constructor() {
    // Start the queue processing
    this.queueService.startProcessing();
  }

  // Load user notification preferences
  async loadUserPreferences(userId: string): Promise<NotificationPreferences> {
    // In a real implementation, this would load from database
    const defaultPreferences: NotificationPreferences = {
      userId,
      emailNotifications: true,
      bookingConfirmations: true,
      bookingReminders: true,
      scheduleChanges: true,
      conflictAlerts: true,
      systemAlerts: true,
      reminderTiming: 15 // 15 minutes before class
    };

    this.preferences.set(userId, defaultPreferences);
    return defaultPreferences;
  }

  // Update user notification preferences
  async updateUserPreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<void> {
    const existing = this.preferences.get(userId) || await this.loadUserPreferences(userId);
    const updated = { ...existing, ...preferences };
    this.preferences.set(userId, updated);
    
    // In a real implementation, this would save to database
    console.log(`Updated notification preferences for user ${userId}:`, updated);
  }

  // Get user notification preferences
  async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    return this.preferences.get(userId) || await this.loadUserPreferences(userId);
  }

  // Handle booking creation notification
  async handleBookingCreated(data: BookingNotificationData): Promise<string[]> {
    const jobIds: string[] = [];

    // Check student preferences
    const studentPrefs = await this.getUserPreferences(data.studentId);
    if (studentPrefs.emailNotifications && studentPrefs.bookingConfirmations) {
      const confirmationJobId = await queueBookingConfirmation(
        data.studentEmail,
        data.studentName,
        {
          courseName: data.courseName,
          classDate: data.classDate,
          classTime: data.classTime,
          teacherName: data.teacherName,
          location: data.location
        }
      );
      jobIds.push(confirmationJobId);
    }

    // Schedule reminder email
    if (studentPrefs.emailNotifications && studentPrefs.bookingReminders) {
      const reminderTime = new Date(data.classDate);
      reminderTime.setMinutes(reminderTime.getMinutes() - studentPrefs.reminderTiming);

      if (reminderTime > new Date()) {
        const reminderJobId = await queueBookingReminder(
          data.studentEmail,
          data.studentName,
          {
            courseName: data.courseName,
            classTime: data.classTime,
            teacherName: data.teacherName,
            timeUntilClass: `${studentPrefs.reminderTiming} minutes`,
            joinLink: data.joinLink
          },
          reminderTime
        );
        jobIds.push(reminderJobId);
      }
    }

    return jobIds;
  }

  // Handle booking cancellation notification
  async handleBookingCancelled(data: BookingNotificationData): Promise<string[]> {
    const jobIds: string[] = [];

    // Notify student
    const studentPrefs = await this.getUserPreferences(data.studentId);
    if (studentPrefs.emailNotifications && studentPrefs.bookingConfirmations) {
      const message = {
        to: [{ email: data.studentEmail, name: data.studentName }],
        subject: 'Class Booking Cancelled',
        html: `
          <h2>Class Booking Cancelled</h2>
          <p>Dear ${data.studentName},</p>
          <p>Your class booking has been cancelled:</p>
          <ul>
            <li><strong>Course:</strong> ${data.courseName}</li>
            <li><strong>Date:</strong> ${data.classDate}</li>
            <li><strong>Time:</strong> ${data.classTime}</li>
            <li><strong>Teacher:</strong> ${data.teacherName}</li>
          </ul>
          <p>If you have any questions, please contact us.</p>
          <p>Best regards,<br>HeyPeter Academy</p>
        `,
        priority: EmailPriority.HIGH,
        tags: ['booking', 'cancellation'],
        trackingEnabled: true
      };

      const jobId = await this.queueService.addToQueue(message, {
        priority: EmailPriority.HIGH
      });
      jobIds.push(jobId);
    }

    return jobIds;
  }

  // Handle schedule change notification
  async handleScheduleChange(data: ScheduleChangeNotificationData): Promise<string> {
    const userPrefs = await this.getUserPreferences(data.affectedUserId);
    
    if (!userPrefs.emailNotifications || !userPrefs.scheduleChanges) {
      return '';
    }

    return queueScheduleChange(
      data.affectedUserEmail,
      data.affectedUserName,
      {
        originalDate: data.originalDate,
        originalTime: data.originalTime,
        newDate: data.newDate,
        newTime: data.newTime,
        reason: data.reason
      }
    );
  }

  // Handle conflict alert notification
  async handleConflictAlert(data: ConflictNotificationData): Promise<string[]> {
    const jobIds: string[] = [];

    for (const user of data.affectedUsers) {
      const userPrefs = await this.getUserPreferences(user.userId);
      
      if (userPrefs.emailNotifications && userPrefs.conflictAlerts) {
        const jobId = await queueConflictAlert(
          user.userEmail,
          user.userName,
          {
            conflictType: data.conflictType,
            conflictDateTime: data.conflictDateTime,
            affectedClasses: data.affectedClasses.join(', '),
            recommendedAction: data.recommendedAction
          }
        );
        jobIds.push(jobId);
      }
    }

    return jobIds;
  }

  // Handle teacher availability change notification
  async handleTeacherAvailabilityChange(data: TeacherAvailabilityNotificationData): Promise<string[]> {
    const jobIds: string[] = [];

    // Notify affected students about their bookings
    for (const booking of data.affectedBookings) {
      const message = {
        to: [{ email: booking.studentEmail, name: booking.studentName }],
        subject: 'Teacher Availability Change - Class Update',
        html: `
          <h2>Teacher Availability Change</h2>
          <p>Dear ${booking.studentName},</p>
          <p>We need to inform you about a change in your teacher's availability:</p>
          <ul>
            <li><strong>Teacher:</strong> ${data.teacherName}</li>
            <li><strong>Affected Class:</strong> ${booking.classTime}</li>
            <li><strong>Booking ID:</strong> ${booking.bookingId}</li>
          </ul>
          <p>We will contact you soon to reschedule your class.</p>
          <p>We apologize for any inconvenience.</p>
          <p>Best regards,<br>HeyPeter Academy</p>
        `,
        priority: EmailPriority.HIGH,
        tags: ['teacher', 'availability', 'change'],
        trackingEnabled: true
      };

      const jobId = await this.queueService.addToQueue(message, {
        priority: EmailPriority.HIGH
      });
      jobIds.push(jobId);
    }

    return jobIds;
  }

  // Handle system maintenance notification
  async handleSystemMaintenance(
    maintenanceData: {
      startTime: string;
      endTime: string;
      description: string;
      affectedServices: string[];
    },
    recipients: Array<{
      userId: string;
      userName: string;
      userEmail: string;
    }>
  ): Promise<string[]> {
    const jobIds: string[] = [];

    for (const recipient of recipients) {
      const userPrefs = await this.getUserPreferences(recipient.userId);
      
      if (userPrefs.emailNotifications && userPrefs.systemAlerts) {
        const message = {
          to: [{ email: recipient.userEmail, name: recipient.userName }],
          subject: 'Scheduled System Maintenance',
          html: `
            <h2>Scheduled System Maintenance</h2>
            <p>Dear ${recipient.userName},</p>
            <p>We will be performing scheduled maintenance on our systems:</p>
            <ul>
              <li><strong>Start Time:</strong> ${maintenanceData.startTime}</li>
              <li><strong>End Time:</strong> ${maintenanceData.endTime}</li>
              <li><strong>Affected Services:</strong> ${maintenanceData.affectedServices.join(', ')}</li>
            </ul>
            <p><strong>Description:</strong> ${maintenanceData.description}</p>
            <p>During this time, some services may be unavailable. We apologize for any inconvenience.</p>
            <p>Best regards,<br>HeyPeter Academy</p>
          `,
          priority: EmailPriority.NORMAL,
          tags: ['system', 'maintenance'],
          trackingEnabled: true
        };

        const jobId = await this.queueService.addToQueue(message, {
          priority: EmailPriority.NORMAL
        });
        jobIds.push(jobId);
      }
    }

    return jobIds;
  }

  // Trigger notification based on type
  async triggerNotification(
    trigger: NotificationTrigger,
    data: any
  ): Promise<string[]> {
    switch (trigger) {
      case NotificationTrigger.BOOKING_CREATED:
        return this.handleBookingCreated(data as BookingNotificationData);
        
      case NotificationTrigger.BOOKING_CANCELLED:
        return this.handleBookingCancelled(data as BookingNotificationData);
        
      case NotificationTrigger.BOOKING_MODIFIED:
        return this.handleScheduleChange(data as ScheduleChangeNotificationData);
        
      case NotificationTrigger.SCHEDULE_CONFLICT:
        return this.handleConflictAlert(data as ConflictNotificationData);
        
      case NotificationTrigger.TEACHER_AVAILABILITY_CHANGED:
        return this.handleTeacherAvailabilityChange(data as TeacherAvailabilityNotificationData);
        
      default:
        console.warn(`Unknown notification trigger: ${trigger}`);
        return [];
    }
  }

  // Get notification statistics
  getNotificationStats() {
    return this.queueService.getQueueStats();
  }

  // Get failed notifications
  getFailedNotifications() {
    return this.queueService.getJobsByStatus('failed');
  }

  // Retry failed notification
  async retryFailedNotification(jobId: string): Promise<boolean> {
    return this.queueService.retryJob(jobId);
  }
}

// Singleton instance
let emailNotificationService: EmailNotificationService | null = null;

export function getEmailNotificationService(): EmailNotificationService {
  if (!emailNotificationService) {
    emailNotificationService = new EmailNotificationService();
  }
  return emailNotificationService;
}

export default EmailNotificationService;