import { logger } from '@/lib/services';
// Simplified email service for testing and development without Mailgun dependencies

// Email template types
export enum EmailTemplateType {
  BOOKING_CONFIRMATION = 'booking_confirmation',
  BOOKING_REMINDER = 'booking_reminder',
  BOOKING_CANCELLATION = 'booking_cancellation',
  SCHEDULE_CHANGE = 'schedule_change',
  CONFLICT_ALERT = 'conflict_alert',
  TEACHER_AVAILABILITY = 'teacher_availability',
  WELCOME = 'welcome',
  PASSWORD_RESET = 'password_reset',
  SYSTEM_ALERT = 'system_alert'
}

// Email priority levels
export enum EmailPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

// Email status tracking
export enum EmailStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  BOUNCED = 'bounced',
  COMPLAINED = 'complained'
}

// Email data interfaces
export interface EmailRecipient {
  email: string;
  name?: string;
  type?: 'to' | 'cc' | 'bcc';
}

export interface EmailTemplate {
  id: string;
  type: EmailTemplateType;
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables?: Record<string, string>;
}

export interface EmailMessage {
  id?: string;
  to: EmailRecipient[];
  cc?: EmailRecipient[];
  bcc?: EmailRecipient[];
  subject: string;
  html?: string;
  text?: string;
  template?: EmailTemplateType;
  templateData?: Record<string, any>;
  priority?: EmailPriority;
  scheduledAt?: Date;
  tags?: string[];
  trackingEnabled?: boolean;
  customHeaders?: Record<string, string>;
}

export interface EmailResult {
  id: string;
  messageId?: string;
  status: EmailStatus;
  timestamp: Date;
  error?: string;
  deliveryAttempts?: number;
}

export interface EmailMetrics {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  totalBounced: number;
  totalComplaints: number;
  deliveryRate: number;
  bounceRate: number;
  complaintRate: number;
}

// Email service configuration
interface EmailConfig {
  apiKey: string;
  domain: string;
  testMode?: boolean;
}

// Simplified Email service class
export class SimpleEmailService {
  private config: EmailConfig;
  private templates: Map<EmailTemplateType, EmailTemplate> = new Map();
  private sentEmails: EmailResult[] = [];

  constructor(config: EmailConfig) {
    this.config = config;
    this.initializeTemplates();
  }

  // Initialize default email templates
  private initializeTemplates(): void {
    const templates: EmailTemplate[] = [
      {
        id: 'booking_confirmation',
        type: EmailTemplateType.BOOKING_CONFIRMATION,
        subject: 'Class Booking Confirmation - HeyPeter Academy',
        htmlContent: `
          <h2>Class Booking Confirmed</h2>
          <p>Dear {{studentName}},</p>
          <p>Your class booking has been confirmed:</p>
          <ul>
            <li><strong>Course:</strong> {{courseName}}</li>
            <li><strong>Date:</strong> {{classDate}}</li>
            <li><strong>Time:</strong> {{classTime}}</li>
            <li><strong>Teacher:</strong> {{teacherName}}</li>
            <li><strong>Location:</strong> {{location}}</li>
          </ul>
          <p>Please join 5 minutes before the class starts.</p>
          <p>Best regards,<br>HeyPeter Academy</p>
        `,
        textContent: `
          Class Booking Confirmed
          
          Dear {{studentName}},
          
          Your class booking has been confirmed:
          - Course: {{courseName}}
          - Date: {{classDate}}
          - Time: {{classTime}}
          - Teacher: {{teacherName}}
          - Location: {{location}}
          
          Please join 5 minutes before the class starts.
          
          Best regards,
          HeyPeter Academy
        `
      },
      {
        id: 'booking_reminder',
        type: EmailTemplateType.BOOKING_REMINDER,
        subject: 'Class Reminder - Starting Soon',
        htmlContent: `
          <h2>Class Reminder</h2>
          <p>Dear {{studentName}},</p>
          <p>This is a friendly reminder that your class starts in {{timeUntilClass}}:</p>
          <ul>
            <li><strong>Course:</strong> {{courseName}}</li>
            <li><strong>Time:</strong> {{classTime}}</li>
            <li><strong>Teacher:</strong> {{teacherName}}</li>
            <li><strong>Join Link:</strong> <a href="{{joinLink}}">{{joinLink}}</a></li>
          </ul>
          <p>See you in class!</p>
          <p>Best regards,<br>HeyPeter Academy</p>
        `
      },
      {
        id: 'schedule_change',
        type: EmailTemplateType.SCHEDULE_CHANGE,
        subject: 'Schedule Change Notification',
        htmlContent: `
          <h2>Schedule Change</h2>
          <p>Dear {{recipientName}},</p>
          <p>We need to inform you of a schedule change:</p>
          <h3>Original Schedule:</h3>
          <ul>
            <li><strong>Date:</strong> {{originalDate}}</li>
            <li><strong>Time:</strong> {{originalTime}}</li>
          </ul>
          <h3>New Schedule:</h3>
          <ul>
            <li><strong>Date:</strong> {{newDate}}</li>
            <li><strong>Time:</strong> {{newTime}}</li>
          </ul>
          <p><strong>Reason:</strong> {{reason}}</p>
          <p>We apologize for any inconvenience.</p>
          <p>Best regards,<br>HeyPeter Academy</p>
        `
      },
      {
        id: 'conflict_alert',
        type: EmailTemplateType.CONFLICT_ALERT,
        subject: 'Scheduling Conflict Alert',
        htmlContent: `
          <h2>Scheduling Conflict Detected</h2>
          <p>Dear {{recipientName}},</p>
          <p>A scheduling conflict has been detected:</p>
          <ul>
            <li><strong>Conflict Type:</strong> {{conflictType}}</li>
            <li><strong>Date/Time:</strong> {{conflictDateTime}}</li>
            <li><strong>Affected Classes:</strong> {{affectedClasses}}</li>
          </ul>
          <p><strong>Recommended Action:</strong> {{recommendedAction}}</p>
          <p>Please review and resolve this conflict as soon as possible.</p>
          <p>Best regards,<br>HeyPeter Academy</p>
        `
      }
    ];

    templates.forEach(template => {
      this.templates.set(template.type, template);
    });
  }

  // Send email (simplified version)
  async sendEmail(message: EmailMessage): Promise<EmailResult> {
    try {
      let htmlContent = message.html;
      let textContent = message.text;

      // Process template if specified
      if (message.template && message.templateData) {
        const template = this.templates.get(message.template);
        if (template) {
          htmlContent = this.processTemplate(template.htmlContent, message.templateData);
          textContent = template.textContent 
            ? this.processTemplate(template.textContent, message.templateData)
            : undefined;
        }
      }

      // In test mode, just log the email
      if (this.config.testMode) {
        logger.info('Email would be sent:', {
          to: message.to,
          subject: message.subject,
          html: htmlContent,
          text: textContent
        });
      }

      const result: EmailResult = {
        id: crypto.randomUUID(),
        messageId: `msg-${Date.now()}`,
        status: EmailStatus.SENT,
        timestamp: new Date()
      };

      this.sentEmails.push(result);
      return result;
    } catch (error) {
      logger.error('Email sending failed:', error);
      const result: EmailResult = {
        id: crypto.randomUUID(),
        status: EmailStatus.FAILED,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      this.sentEmails.push(result);
      return result;
    }
  }

  // Process template with data
  private processTemplate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });
  }

  // Send booking confirmation email
  async sendBookingConfirmation(
    studentEmail: string,
    studentName: string,
    bookingData: {
      courseName: string;
      classDate: string;
      classTime: string;
      teacherName: string;
      location: string;
    }
  ): Promise<EmailResult> {
    return this.sendEmail({
      to: [{ email: studentEmail, name: studentName }],
      subject: 'Class Booking Confirmation - HeyPeter Academy',
      template: EmailTemplateType.BOOKING_CONFIRMATION,
      templateData: {
        studentName,
        ...bookingData
      },
      priority: EmailPriority.HIGH,
      tags: ['booking', 'confirmation'],
      trackingEnabled: true
    });
  }

  // Send booking reminder email
  async sendBookingReminder(
    studentEmail: string,
    studentName: string,
    reminderData: {
      courseName: string;
      classTime: string;
      teacherName: string;
      timeUntilClass: string;
      joinLink?: string;
    }
  ): Promise<EmailResult> {
    return this.sendEmail({
      to: [{ email: studentEmail, name: studentName }],
      subject: 'Class Reminder - Starting Soon',
      template: EmailTemplateType.BOOKING_REMINDER,
      templateData: {
        studentName,
        ...reminderData
      },
      priority: EmailPriority.HIGH,
      tags: ['booking', 'reminder'],
      trackingEnabled: true
    });
  }

  // Send schedule change notification
  async sendScheduleChange(
    recipientEmail: string,
    recipientName: string,
    changeData: {
      originalDate: string;
      originalTime: string;
      newDate: string;
      newTime: string;
      reason: string;
    }
  ): Promise<EmailResult> {
    return this.sendEmail({
      to: [{ email: recipientEmail, name: recipientName }],
      subject: 'Schedule Change Notification',
      template: EmailTemplateType.SCHEDULE_CHANGE,
      templateData: {
        recipientName,
        ...changeData
      },
      priority: EmailPriority.HIGH,
      tags: ['schedule', 'change'],
      trackingEnabled: true
    });
  }

  // Send conflict alert email
  async sendConflictAlert(
    recipientEmail: string,
    recipientName: string,
    conflictData: {
      conflictType: string;
      conflictDateTime: string;
      affectedClasses: string;
      recommendedAction: string;
    }
  ): Promise<EmailResult> {
    return this.sendEmail({
      to: [{ email: recipientEmail, name: recipientName }],
      subject: 'Scheduling Conflict Alert',
      template: EmailTemplateType.CONFLICT_ALERT,
      templateData: {
        recipientName,
        ...conflictData
      },
      priority: EmailPriority.URGENT,
      tags: ['conflict', 'alert'],
      trackingEnabled: true
    });
  }

  // Get email metrics (simplified)
  async getEmailMetrics(startDate?: Date, endDate?: Date): Promise<EmailMetrics> {
    const filteredEmails = this.sentEmails.filter(email => {
      if (startDate && email.timestamp < startDate) return false;
      if (endDate && email.timestamp > endDate) return false;
      return true;
    });

    const totalSent = filteredEmails.length;
    const totalDelivered = filteredEmails.filter(e => e.status === EmailStatus.SENT || e.status === EmailStatus.DELIVERED).length;
    const totalFailed = filteredEmails.filter(e => e.status === EmailStatus.FAILED).length;
    const totalBounced = filteredEmails.filter(e => e.status === EmailStatus.BOUNCED).length;
    const totalComplaints = filteredEmails.filter(e => e.status === EmailStatus.COMPLAINED).length;

    return {
      totalSent,
      totalDelivered,
      totalFailed,
      totalBounced,
      totalComplaints,
      deliveryRate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
      bounceRate: totalSent > 0 ? (totalBounced / totalSent) * 100 : 0,
      complaintRate: totalSent > 0 ? (totalComplaints / totalSent) * 100 : 0
    };
  }

  // Add custom template
  addTemplate(template: EmailTemplate): void {
    this.templates.set(template.type, template);
  }

  // Get template
  getTemplate(type: EmailTemplateType): EmailTemplate | undefined {
    return this.templates.get(type);
  }

  // Update template
  updateTemplate(type: EmailTemplateType, updates: Partial<EmailTemplate>): void {
    const existing = this.templates.get(type);
    if (existing) {
      this.templates.set(type, { ...existing, ...updates });
    }
  }

  // Get sent emails (for testing)
  getSentEmails(): EmailResult[] {
    return [...this.sentEmails];
  }

  // Clear sent emails (for testing)
  clearSentEmails(): void {
    this.sentEmails = [];
  }
}

// Singleton instance
let emailService: SimpleEmailService | null = null;

export function getEmailService(): SimpleEmailService {
  if (!emailService) {
    const config: EmailConfig = {
      apiKey: process.env.MAILGUN_API_KEY || 'test-key',
      domain: process.env.MAILGUN_DOMAIN || 'test.example.com',
      testMode: process.env.NODE_ENV !== 'production'
    };

    emailService = new SimpleEmailService(config);
  }

  return emailService;
}

// Export for testing
export { SimpleEmailService as EmailService };
export default SimpleEmailService;