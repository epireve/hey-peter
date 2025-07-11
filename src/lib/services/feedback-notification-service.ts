/**
 * Feedback Notification Service
 * Handles notification delivery for feedback-related events
 */

import { createClient } from '@/lib/supabase';
import { FeedbackAlert, FeedbackNotificationSettings } from '@/types/feedback';

interface NotificationTemplate {
  subject: string;
  body: string;
  type: 'email' | 'sms' | 'in_app';
}

interface NotificationContext {
  user_name?: string;
  student_name?: string;
  teacher_name?: string;
  class_name?: string;
  course_name?: string;
  rating?: number;
  feedback_text?: string;
  alert_type?: string;
  threshold?: number;
  [key: string]: any;
}

interface EmailNotification {
  to: string;
  subject: string;
  body: string;
  priority: 'low' | 'medium' | 'high';
  template_name: string;
  context: NotificationContext;
}

interface SMSNotification {
  phone: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
}

interface InAppNotification {
  user_id: string;
  title: string;
  message: string;
  type: string;
  data: any;
  priority: 'low' | 'medium' | 'high';
}

export class FeedbackNotificationService {
  private supabase = createClient();
  private emailQueue: EmailNotification[] = [];
  private smsQueue: SMSNotification[] = [];
  private inAppQueue: InAppNotification[] = [];
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeProcessing();
  }

  private initializeProcessing() {
    // Process notification queues every 30 seconds
    this.processingInterval = setInterval(() => {
      this.processQueues();
    }, 30000);
  }

  // Main notification methods
  async sendFeedbackReceivedNotification(feedbackData: {
    feedback_id: string;
    feedback_type: string;
    recipient_id: string;
    recipient_email: string;
    recipient_phone?: string;
    student_name: string;
    teacher_name: string;
    rating?: number;
    feedback_text?: string;
  }): Promise<void> {
    const settings = await this.getUserNotificationSettings(feedbackData.recipient_id);
    const context: NotificationContext = {
      user_name: feedbackData.teacher_name,
      student_name: feedbackData.student_name,
      rating: feedbackData.rating,
      feedback_text: feedbackData.feedback_text
    };

    if (settings.immediate_feedback_alerts) {
      if (settings.email_notifications) {
        await this.queueEmailNotification({
          to: feedbackData.recipient_email,
          subject: this.getTemplate('feedback_received_email', context).subject,
          body: this.getTemplate('feedback_received_email', context).body,
          priority: 'medium',
          template_name: 'feedback_received',
          context
        });
      }

      if (settings.in_app_notifications) {
        await this.queueInAppNotification({
          user_id: feedbackData.recipient_id,
          title: 'New Feedback Received',
          message: `You received new feedback from ${feedbackData.student_name}`,
          type: 'feedback_received',
          data: { feedback_id: feedbackData.feedback_id, rating: feedbackData.rating },
          priority: 'medium'
        });
      }

      if (settings.sms_notifications && feedbackData.recipient_phone) {
        await this.queueSMSNotification({
          phone: feedbackData.recipient_phone,
          message: `New feedback received from ${feedbackData.student_name}. Rating: ${feedbackData.rating}/5`,
          priority: 'low'
        });
      }
    }
  }

  async sendLowRatingAlert(alertData: {
    user_id: string;
    user_email: string;
    user_phone?: string;
    student_name: string;
    rating: number;
    threshold: number;
    feedback_text?: string;
    class_name?: string;
  }): Promise<void> {
    const settings = await this.getUserNotificationSettings(alertData.user_id);
    
    if (settings.alert_on_negative_feedback) {
      const context: NotificationContext = {
        student_name: alertData.student_name,
        rating: alertData.rating,
        threshold: alertData.threshold,
        feedback_text: alertData.feedback_text,
        class_name: alertData.class_name
      };

      const priority: 'low' | 'medium' | 'high' = alertData.rating <= 2 ? 'high' : 'medium';

      if (settings.email_notifications) {
        await this.queueEmailNotification({
          to: alertData.user_email,
          subject: this.getTemplate('low_rating_alert_email', context).subject,
          body: this.getTemplate('low_rating_alert_email', context).body,
          priority,
          template_name: 'low_rating_alert',
          context
        });
      }

      if (settings.in_app_notifications) {
        await this.queueInAppNotification({
          user_id: alertData.user_id,
          title: 'Low Rating Alert',
          message: `You received a ${alertData.rating}/5 rating from ${alertData.student_name}`,
          type: 'low_rating_alert',
          data: { rating: alertData.rating, student_name: alertData.student_name },
          priority
        });
      }

      if (settings.sms_notifications && alertData.user_phone && priority === 'high') {
        await this.queueSMSNotification({
          phone: alertData.user_phone,
          message: `ALERT: Low rating (${alertData.rating}/5) from ${alertData.student_name}. Please review feedback.`,
          priority
        });
      }
    }
  }

  async sendWeeklySummary(userId: string): Promise<void> {
    const settings = await this.getUserNotificationSettings(userId);
    
    if (!settings.weekly_summary) return;

    const summaryData = await this.generateWeeklySummary(userId);
    const context: NotificationContext = {
      ...summaryData,
      user_name: summaryData.teacher_name
    };

    if (settings.email_notifications) {
      await this.queueEmailNotification({
        to: summaryData.email,
        subject: this.getTemplate('weekly_summary_email', context).subject,
        body: this.getTemplate('weekly_summary_email', context).body,
        priority: 'low',
        template_name: 'weekly_summary',
        context
      });
    }

    if (settings.in_app_notifications) {
      await this.queueInAppNotification({
        user_id: userId,
        title: 'Weekly Feedback Summary',
        message: `Your weekly summary is ready: ${summaryData.total_feedback} feedback received`,
        type: 'weekly_summary',
        data: summaryData,
        priority: 'low'
      });
    }
  }

  async sendMonthlySummary(userId: string): Promise<void> {
    const settings = await this.getUserNotificationSettings(userId);
    
    if (!settings.monthly_analytics) return;

    const summaryData = await this.generateMonthlySummary(userId);
    const context: NotificationContext = {
      ...summaryData,
      user_name: summaryData.teacher_name
    };

    if (settings.email_notifications) {
      await this.queueEmailNotification({
        to: summaryData.email,
        subject: this.getTemplate('monthly_summary_email', context).subject,
        body: this.getTemplate('monthly_summary_email', context).body,
        priority: 'low',
        template_name: 'monthly_summary',
        context
      });
    }
  }

  async sendFeedbackResponseNotification(responseData: {
    original_feedback_id: string;
    recipient_id: string;
    recipient_email: string;
    responder_name: string;
    response_text: string;
    feedback_type: string;
  }): Promise<void> {
    const settings = await this.getUserNotificationSettings(responseData.recipient_id);
    const context: NotificationContext = {
      responder_name: responseData.responder_name,
      response_text: responseData.response_text,
      feedback_type: responseData.feedback_type
    };

    if (settings.email_notifications) {
      await this.queueEmailNotification({
        to: responseData.recipient_email,
        subject: this.getTemplate('feedback_response_email', context).subject,
        body: this.getTemplate('feedback_response_email', context).body,
        priority: 'medium',
        template_name: 'feedback_response',
        context
      });
    }

    if (settings.in_app_notifications) {
      await this.queueInAppNotification({
        user_id: responseData.recipient_id,
        title: 'Response to Your Feedback',
        message: `${responseData.responder_name} responded to your feedback`,
        type: 'feedback_response',
        data: { original_feedback_id: responseData.original_feedback_id },
        priority: 'medium'
      });
    }
  }

  async sendRecommendationNotification(recommendationData: {
    student_id: string;
    student_email: string;
    recommendation_type: 'teacher' | 'course';
    recommended_name: string;
    reason: string;
    confidence_level: number;
  }): Promise<void> {
    const settings = await this.getUserNotificationSettings(recommendationData.student_id);
    const context: NotificationContext = {
      recommendation_type: recommendationData.recommendation_type,
      recommended_name: recommendationData.recommended_name,
      reason: recommendationData.reason,
      confidence_level: recommendationData.confidence_level
    };

    if (settings.email_notifications) {
      await this.queueEmailNotification({
        to: recommendationData.student_email,
        subject: this.getTemplate('recommendation_email', context).subject,
        body: this.getTemplate('recommendation_email', context).body,
        priority: 'low',
        template_name: 'recommendation',
        context
      });
    }

    if (settings.in_app_notifications) {
      await this.queueInAppNotification({
        user_id: recommendationData.student_id,
        title: `New ${recommendationData.recommendation_type} Recommendation`,
        message: `We recommend ${recommendationData.recommended_name} based on your feedback`,
        type: 'recommendation',
        data: recommendationData,
        priority: 'low'
      });
    }
  }

  // Notification settings management
  async getUserNotificationSettings(userId: string): Promise<FeedbackNotificationSettings> {
    const { data, error } = await this.supabase
      .from('feedback_notification_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      // Return default settings if none exist
      return {
        user_id: userId,
        email_notifications: true,
        in_app_notifications: true,
        sms_notifications: false,
        immediate_feedback_alerts: true,
        weekly_summary: true,
        monthly_analytics: true,
        low_rating_threshold: 3.0,
        alert_on_negative_feedback: true,
        alert_on_improvement_needed: true
      };
    }

    return data;
  }

  async updateNotificationSettings(userId: string, settings: Partial<FeedbackNotificationSettings>): Promise<void> {
    const { error } = await this.supabase
      .from('feedback_notification_settings')
      .upsert({
        user_id: userId,
        ...settings,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
  }

  // Queue management
  private async queueEmailNotification(notification: EmailNotification): Promise<void> {
    this.emailQueue.push(notification);
  }

  private async queueSMSNotification(notification: SMSNotification): Promise<void> {
    this.smsQueue.push(notification);
  }

  private async queueInAppNotification(notification: InAppNotification): Promise<void> {
    this.inAppQueue.push(notification);
    
    // Process in-app notifications immediately
    await this.processInAppNotification(notification);
  }

  private async processQueues(): Promise<void> {
    try {
      // Process email queue
      while (this.emailQueue.length > 0) {
        const notification = this.emailQueue.shift();
        if (notification) {
          await this.processEmailNotification(notification);
        }
      }

      // Process SMS queue
      while (this.smsQueue.length > 0) {
        const notification = this.smsQueue.shift();
        if (notification) {
          await this.processSMSNotification(notification);
        }
      }

      // In-app notifications are processed immediately
    } catch (error) {
      console.error('Error processing notification queues:', error);
    }
  }

  private async processEmailNotification(notification: EmailNotification): Promise<void> {
    try {
      // In a real implementation, this would integrate with an email service like SendGrid, AWS SES, etc.
      console.log('Sending email notification:', {
        to: notification.to,
        subject: notification.subject,
        priority: notification.priority
      });

      // Store notification record
      await this.supabase
        .from('notification_logs')
        .insert({
          type: 'email',
          recipient: notification.to,
          subject: notification.subject,
          template_name: notification.template_name,
          status: 'sent',
          sent_at: new Date().toISOString()
        });

    } catch (error) {
      console.error('Failed to send email notification:', error);
      
      // Store failed notification
      await this.supabase
        .from('notification_logs')
        .insert({
          type: 'email',
          recipient: notification.to,
          subject: notification.subject,
          template_name: notification.template_name,
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          sent_at: new Date().toISOString()
        });
    }
  }

  private async processSMSNotification(notification: SMSNotification): Promise<void> {
    try {
      // In a real implementation, this would integrate with an SMS service like Twilio
      console.log('Sending SMS notification:', {
        phone: notification.phone,
        message: notification.message.substring(0, 50) + '...',
        priority: notification.priority
      });

      await this.supabase
        .from('notification_logs')
        .insert({
          type: 'sms',
          recipient: notification.phone,
          message: notification.message,
          status: 'sent',
          sent_at: new Date().toISOString()
        });

    } catch (error) {
      console.error('Failed to send SMS notification:', error);
      
      await this.supabase
        .from('notification_logs')
        .insert({
          type: 'sms',
          recipient: notification.phone,
          message: notification.message,
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          sent_at: new Date().toISOString()
        });
    }
  }

  private async processInAppNotification(notification: InAppNotification): Promise<void> {
    try {
      await this.supabase
        .from('notifications')
        .insert({
          user_id: notification.user_id,
          title: notification.title,
          message: notification.message,
          notification_type: notification.type,
          is_read: false,
          sent_time: new Date().toISOString()
        });

    } catch (error) {
      console.error('Failed to create in-app notification:', error);
    }
  }

  // Template management
  private getTemplate(templateName: string, context: NotificationContext): NotificationTemplate {
    const templates: { [key: string]: NotificationTemplate } = {
      feedback_received_email: {
        subject: `New Feedback Received - Rating: ${context.rating}/5`,
        body: `Dear ${context.user_name},

You have received new feedback from ${context.student_name}.

Rating: ${context.rating}/5

${context.feedback_text ? `Feedback: ${context.feedback_text}` : ''}

You can view the complete feedback details in your dashboard.

Best regards,
HeyPeter Academy Team`,
        type: 'email'
      },
      
      low_rating_alert_email: {
        subject: `Alert: Low Rating Received (${context.rating}/5)`,
        body: `Dear Teacher,

This is an alert notification that you have received a rating of ${context.rating}/5 from ${context.student_name}, which is below your threshold of ${context.threshold}/5.

${context.class_name ? `Class: ${context.class_name}` : ''}
${context.feedback_text ? `Student Comments: ${context.feedback_text}` : ''}

Please review this feedback and consider reaching out to the student to address any concerns.

Best regards,
HeyPeter Academy Team`,
        type: 'email'
      },
      
      weekly_summary_email: {
        subject: 'Your Weekly Feedback Summary',
        body: `Dear ${context.user_name},

Here's your weekly feedback summary:

• Total Feedback Received: ${context.total_feedback}
• Average Rating: ${context.average_rating}/5
• Positive Feedback: ${context.positive_percentage}%

${context.top_strength ? `Top Strength: ${context.top_strength}` : ''}
${context.improvement_area ? `Area for Improvement: ${context.improvement_area}` : ''}

Keep up the great work!

Best regards,
HeyPeter Academy Team`,
        type: 'email'
      },
      
      monthly_summary_email: {
        subject: 'Monthly Analytics Report',
        body: `Dear ${context.user_name},

Your monthly feedback analytics are ready:

• Total Feedback: ${context.total_feedback}
• Average Rating: ${context.average_rating}/5
• Rating Trend: ${context.trend}
• Student Satisfaction: ${context.satisfaction_rate}%

View your complete analytics dashboard for detailed insights.

Best regards,
HeyPeter Academy Team`,
        type: 'email'
      },
      
      feedback_response_email: {
        subject: 'Response to Your Feedback',
        body: `Dear Student,

${context.responder_name} has responded to your ${context.feedback_type}:

"${context.response_text}"

Thank you for providing feedback - it helps us improve our teaching quality.

Best regards,
HeyPeter Academy Team`,
        type: 'email'
      },
      
      recommendation_email: {
        subject: `New ${context.recommendation_type} Recommendation`,
        body: `Dear Student,

Based on your feedback and learning progress, we recommend:

${context.recommendation_type}: ${context.recommended_name}

Reason: ${context.reason}
Confidence Level: ${context.confidence_level}%

You can view this recommendation in your dashboard.

Best regards,
HeyPeter Academy Team`,
        type: 'email'
      }
    };

    return templates[templateName] || {
      subject: 'Notification from HeyPeter Academy',
      body: 'You have a new notification.',
      type: 'email'
    };
  }

  // Summary generation
  private async generateWeeklySummary(userId: string): Promise<any> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Mock implementation - in production, this would query actual feedback data
    return {
      teacher_name: 'Teacher Name',
      email: 'teacher@example.com',
      total_feedback: 12,
      average_rating: 4.3,
      positive_percentage: 85,
      top_strength: 'Communication',
      improvement_area: 'Pace'
    };
  }

  private async generateMonthlySummary(userId: string): Promise<any> {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    // Mock implementation
    return {
      teacher_name: 'Teacher Name',
      email: 'teacher@example.com',
      total_feedback: 45,
      average_rating: 4.4,
      trend: 'improving',
      satisfaction_rate: 88
    };
  }

  // Cleanup
  destroy(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
  }
}

export const feedbackNotificationService = new FeedbackNotificationService();