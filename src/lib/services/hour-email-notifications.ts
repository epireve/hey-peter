import { logger } from '@/lib/services';
/**
 * Hour Management Email Notifications
 * Integrates with the existing email service for hour-related notifications
 */

import { emailService } from './email-service';
import { EmailTemplate, EmailData } from '@/types/types';

interface HourNotificationData {
  studentName: string;
  studentEmail: string;
  hoursRemaining: number;
  hoursExpiring?: number;
  expirationDate?: string;
  purchaseAmount?: number;
  refundAmount?: number;
}

interface LeaveNotificationData {
  studentName: string;
  studentEmail: string;
  teacherName?: string;
  teacherEmail?: string;
  adminName?: string;
  adminEmail?: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason?: string;
  adminNotes?: string;
  hoursAffected?: number;
  hoursRecovered?: number;
}

class HourEmailNotificationService {
  /**
   * Send low balance warning email
   */
  async sendLowBalanceWarning(data: HourNotificationData): Promise<void> {
    const emailData: EmailData = {
      to: data.studentEmail,
      subject: 'Low Hour Balance - Purchase More Hours',
      template: 'hour_low_balance' as EmailTemplate,
      data: {
        student_name: data.studentName,
        hours_remaining: data.hoursRemaining,
        purchase_link: `${process.env.NEXT_PUBLIC_APP_URL}/student/hours/purchase`
      }
    };

    await emailService.sendEmail(emailData);
  }

  /**
   * Send hour expiration warning email
   */
  async sendExpirationWarning(data: HourNotificationData): Promise<void> {
    const emailData: EmailData = {
      to: data.studentEmail,
      subject: 'Hours Expiring Soon - Use Them Before They Expire',
      template: 'hour_expiration_warning' as EmailTemplate,
      data: {
        student_name: data.studentName,
        hours_expiring: data.hoursExpiring,
        expiration_date: data.expirationDate,
        booking_link: `${process.env.NEXT_PUBLIC_APP_URL}/student/booking`
      }
    };

    await emailService.sendEmail(emailData);
  }

  /**
   * Send hour purchase confirmation email
   */
  async sendPurchaseConfirmation(data: HourNotificationData): Promise<void> {
    const emailData: EmailData = {
      to: data.studentEmail,
      subject: 'Hour Purchase Confirmation',
      template: 'hour_purchase_confirmation' as EmailTemplate,
      data: {
        student_name: data.studentName,
        purchase_amount: data.purchaseAmount,
        hours_remaining: data.hoursRemaining,
        account_link: `${process.env.NEXT_PUBLIC_APP_URL}/student/hours`
      }
    };

    await emailService.sendEmail(emailData);
  }

  /**
   * Send leave request submission confirmation
   */
  async sendLeaveRequestSubmitted(data: LeaveNotificationData): Promise<void> {
    // Email to student
    const studentEmailData: EmailData = {
      to: data.studentEmail,
      subject: 'Leave Request Submitted',
      template: 'leave_request_submitted' as EmailTemplate,
      data: {
        student_name: data.studentName,
        leave_type: data.leaveType,
        start_date: data.startDate,
        end_date: data.endDate,
        reason: data.reason,
        status_link: `${process.env.NEXT_PUBLIC_APP_URL}/student/leave-requests`
      }
    };

    await emailService.sendEmail(studentEmailData);

    // Email to teacher if specified
    if (data.teacherEmail && data.teacherName) {
      const teacherEmailData: EmailData = {
        to: data.teacherEmail,
        subject: 'New Leave Request for Review',
        template: 'leave_request_teacher_notification' as EmailTemplate,
        data: {
          teacher_name: data.teacherName,
          student_name: data.studentName,
          leave_type: data.leaveType,
          start_date: data.startDate,
          end_date: data.endDate,
          reason: data.reason,
          hours_affected: data.hoursAffected,
          review_link: `${process.env.NEXT_PUBLIC_APP_URL}/teacher/leave-requests`
        }
      };

      await emailService.sendEmail(teacherEmailData);
    }
  }

  /**
   * Send leave request approval notification
   */
  async sendLeaveRequestApproved(data: LeaveNotificationData): Promise<void> {
    const emailData: EmailData = {
      to: data.studentEmail,
      subject: 'Leave Request Approved',
      template: 'leave_request_approved' as EmailTemplate,
      data: {
        student_name: data.studentName,
        leave_type: data.leaveType,
        start_date: data.startDate,
        end_date: data.endDate,
        admin_name: data.adminName,
        admin_notes: data.adminNotes,
        hours_recovered: data.hoursRecovered,
        account_link: `${process.env.NEXT_PUBLIC_APP_URL}/student/hours`
      }
    };

    await emailService.sendEmail(emailData);
  }

  /**
   * Send leave request rejection notification
   */
  async sendLeaveRequestRejected(data: LeaveNotificationData): Promise<void> {
    const emailData: EmailData = {
      to: data.studentEmail,
      subject: 'Leave Request Not Approved',
      template: 'leave_request_rejected' as EmailTemplate,
      data: {
        student_name: data.studentName,
        leave_type: data.leaveType,
        start_date: data.startDate,
        end_date: data.endDate,
        admin_name: data.adminName,
        admin_notes: data.adminNotes,
        new_request_link: `${process.env.NEXT_PUBLIC_APP_URL}/student/leave-request`
      }
    };

    await emailService.sendEmail(emailData);
  }

  /**
   * Send hour refund notification (for approved leave requests)
   */
  async sendHourRefundNotification(data: HourNotificationData): Promise<void> {
    const emailData: EmailData = {
      to: data.studentEmail,
      subject: 'Hours Refunded to Your Account',
      template: 'hour_refund_notification' as EmailTemplate,
      data: {
        student_name: data.studentName,
        refund_amount: data.refundAmount,
        hours_remaining: data.hoursRemaining,
        account_link: `${process.env.NEXT_PUBLIC_APP_URL}/student/hours`
      }
    };

    await emailService.sendEmail(emailData);
  }

  /**
   * Send automated hour deduction notification
   */
  async sendHourDeductionNotification(data: HourNotificationData & {
    className: string;
    teacherName: string;
    sessionDate: string;
    hoursDeducted: number;
  }): Promise<void> {
    const emailData: EmailData = {
      to: data.studentEmail,
      subject: 'Class Completed - Hours Deducted',
      template: 'hour_deduction_notification' as EmailTemplate,
      data: {
        student_name: data.studentName,
        class_name: data.className,
        teacher_name: data.teacherName,
        session_date: data.sessionDate,
        hours_deducted: data.hoursDeducted,
        hours_remaining: data.hoursRemaining,
        account_link: `${process.env.NEXT_PUBLIC_APP_URL}/student/hours`
      }
    };

    await emailService.sendEmail(emailData);
  }

  /**
   * Send bulk expiration warning (admin tool)
   */
  async sendBulkExpirationWarnings(
    students: Array<{ email: string; name: string; hoursExpiring: number; expirationDate: string }>
  ): Promise<number> {
    let sentCount = 0;
    
    for (const student of students) {
      try {
        await this.sendExpirationWarning({
          studentName: student.name,
          studentEmail: student.email,
          hoursRemaining: 0, // Not needed for expiration warning
          hoursExpiring: student.hoursExpiring,
          expirationDate: student.expirationDate
        });
        sentCount++;
      } catch (error) {
        logger.error(`Failed to send expiration warning to ${student.email}:`, error);
      }
    }
    
    return sentCount;
  }

  /**
   * Send weekly summary to admins
   */
  async sendWeeklySummaryToAdmins(data: {
    adminEmails: string[];
    totalStudents: number;
    lowBalanceStudents: number;
    expiringHours: number;
    totalRevenue: number;
    pendingLeaveRequests: number;
  }): Promise<void> {
    for (const adminEmail of data.adminEmails) {
      const emailData: EmailData = {
        to: adminEmail,
        subject: 'Weekly Hour Management Summary',
        template: 'weekly_hour_summary' as EmailTemplate,
        data: {
          total_students: data.totalStudents,
          low_balance_students: data.lowBalanceStudents,
          expiring_hours: data.expiringHours,
          total_revenue: data.totalRevenue,
          pending_leave_requests: data.pendingLeaveRequests,
          dashboard_link: `${process.env.NEXT_PUBLIC_APP_URL}/admin/hour-management`
        }
      };

      await emailService.sendEmail(emailData);
    }
  }
}

export const hourEmailNotificationService = new HourEmailNotificationService();
export default hourEmailNotificationService;