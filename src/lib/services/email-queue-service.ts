import { EmailMessage, EmailResult, EmailStatus, EmailPriority, getEmailService } from './email-service';

import { logger } from '@/lib/services';
// Queue job interface
export interface EmailQueueJob {
  id: string;
  message: EmailMessage;
  priority: EmailPriority;
  scheduledAt: Date;
  createdAt: Date;
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: Date;
  lastError?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retryDelay: number; // in milliseconds
}

// Queue configuration
interface EmailQueueConfig {
  maxRetries: number;
  retryDelay: number;
  processingInterval: number;
  maxConcurrentJobs: number;
}

export class EmailQueueService {
  private queue: Map<string, EmailQueueJob> = new Map();
  private processing: Set<string> = new Set();
  private config: EmailQueueConfig;
  private processingInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor(config: Partial<EmailQueueConfig> = {}) {
    this.config = {
      maxRetries: 3,
      retryDelay: 5000, // 5 seconds
      processingInterval: 10000, // 10 seconds
      maxConcurrentJobs: 5,
      ...config
    };
  }

  // Add email to queue
  async addToQueue(
    message: EmailMessage,
    options: {
      priority?: EmailPriority;
      scheduledAt?: Date;
      maxAttempts?: number;
      retryDelay?: number;
    } = {}
  ): Promise<string> {
    const jobId = crypto.randomUUID();
    const now = new Date();

    const job: EmailQueueJob = {
      id: jobId,
      message: {
        ...message,
        id: message.id || jobId
      },
      priority: options.priority || message.priority || EmailPriority.NORMAL,
      scheduledAt: options.scheduledAt || now,
      createdAt: now,
      attempts: 0,
      maxAttempts: options.maxAttempts || this.config.maxRetries,
      status: 'pending',
      retryDelay: options.retryDelay || this.config.retryDelay
    };

    this.queue.set(jobId, job);
    
    // Start processing if not running
    if (!this.isRunning) {
      this.startProcessing();
    }

    return jobId;
  }

  // Start queue processing
  startProcessing(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.processingInterval = setInterval(
      () => this.processQueue(),
      this.config.processingInterval
    );
  }

  // Stop queue processing
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    this.isRunning = false;
  }

  // Process queue
  private async processQueue(): Promise<void> {
    if (this.processing.size >= this.config.maxConcurrentJobs) {
      return;
    }

    const readyJobs = this.getReadyJobs();
    const availableSlots = this.config.maxConcurrentJobs - this.processing.size;
    const jobsToProcess = readyJobs.slice(0, availableSlots);

    await Promise.all(
      jobsToProcess.map(job => this.processJob(job))
    );
  }

  // Get jobs ready for processing
  private getReadyJobs(): EmailQueueJob[] {
    const now = new Date();
    
    return Array.from(this.queue.values())
      .filter(job => 
        job.status === 'pending' &&
        !this.processing.has(job.id) &&
        job.scheduledAt <= now &&
        job.attempts < job.maxAttempts
      )
      .sort((a, b) => {
        // Sort by priority, then by scheduled time
        const priorityOrder = {
          [EmailPriority.URGENT]: 4,
          [EmailPriority.HIGH]: 3,
          [EmailPriority.NORMAL]: 2,
          [EmailPriority.LOW]: 1
        };

        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;

        return a.scheduledAt.getTime() - b.scheduledAt.getTime();
      });
  }

  // Process individual job
  private async processJob(job: EmailQueueJob): Promise<void> {
    this.processing.add(job.id);
    job.status = 'processing';
    job.attempts++;
    job.lastAttemptAt = new Date();

    try {
      const emailService = getEmailService();
      const result = await emailService.sendEmail(job.message);

      if (result.status === EmailStatus.SENT) {
        job.status = 'completed';
        // Keep completed jobs for a while for tracking
        setTimeout(() => this.queue.delete(job.id), 24 * 60 * 60 * 1000); // 24 hours
      } else {
        throw new Error(result.error || 'Email sending failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      job.lastError = errorMessage;

      if (job.attempts >= job.maxAttempts) {
        job.status = 'failed';
        logger.error(`Email job ${job.id} failed after ${job.attempts} attempts:`, errorMessage);
      } else {
        job.status = 'pending';
        job.scheduledAt = new Date(Date.now() + job.retryDelay * job.attempts);
        logger.warn(`Email job ${job.id} failed, retrying in ${job.retryDelay * job.attempts}ms:`, errorMessage);
      }
    } finally {
      this.processing.delete(job.id);
      this.queue.set(job.id, job);
    }
  }

  // Get job status
  getJobStatus(jobId: string): EmailQueueJob | undefined {
    return this.queue.get(jobId);
  }

  // Get queue statistics
  getQueueStats(): {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  } {
    const jobs = Array.from(this.queue.values());
    
    return {
      total: jobs.length,
      pending: jobs.filter(job => job.status === 'pending').length,
      processing: jobs.filter(job => job.status === 'processing').length,
      completed: jobs.filter(job => job.status === 'completed').length,
      failed: jobs.filter(job => job.status === 'failed').length
    };
  }

  // Retry failed job
  async retryJob(jobId: string): Promise<boolean> {
    const job = this.queue.get(jobId);
    if (!job || job.status !== 'failed') {
      return false;
    }

    job.status = 'pending';
    job.attempts = 0;
    job.scheduledAt = new Date();
    job.lastError = undefined;

    this.queue.set(jobId, job);
    return true;
  }

  // Remove job from queue
  removeJob(jobId: string): boolean {
    if (this.processing.has(jobId)) {
      return false; // Cannot remove processing job
    }
    
    return this.queue.delete(jobId);
  }

  // Clear completed jobs
  clearCompletedJobs(): number {
    const completed = Array.from(this.queue.entries())
      .filter(([_, job]) => job.status === 'completed')
      .map(([id]) => id);
    
    completed.forEach(id => this.queue.delete(id));
    return completed.length;
  }

  // Clear failed jobs
  clearFailedJobs(): number {
    const failed = Array.from(this.queue.entries())
      .filter(([_, job]) => job.status === 'failed')
      .map(([id]) => id);
    
    failed.forEach(id => this.queue.delete(id));
    return failed.length;
  }

  // Get jobs by status
  getJobsByStatus(status: EmailQueueJob['status']): EmailQueueJob[] {
    return Array.from(this.queue.values())
      .filter(job => job.status === status)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Schedule recurring email
  scheduleRecurringEmail(
    message: EmailMessage,
    cronExpression: string,
    options: {
      priority?: EmailPriority;
      maxAttempts?: number;
    } = {}
  ): string {
    // This would integrate with a cron job scheduler
    // For now, we'll just add it to the queue
    return this.addToQueue(message, options);
  }
}

// Singleton instance
let emailQueueService: EmailQueueService | null = null;

export function getEmailQueueService(): EmailQueueService {
  if (!emailQueueService) {
    emailQueueService = new EmailQueueService();
  }
  return emailQueueService;
}

// Convenience functions for common email operations
export async function queueBookingConfirmation(
  studentEmail: string,
  studentName: string,
  bookingData: {
    courseName: string;
    classDate: string;
    classTime: string;
    teacherName: string;
    location: string;
  }
): Promise<string> {
  const emailService = getEmailService();
  const queueService = getEmailQueueService();

  const message: EmailMessage = {
    to: [{ email: studentEmail, name: studentName }],
    subject: 'Class Booking Confirmation - HeyPeter Academy',
    template: 'booking_confirmation' as any,
    templateData: {
      studentName,
      ...bookingData
    },
    priority: EmailPriority.HIGH,
    tags: ['booking', 'confirmation'],
    trackingEnabled: true
  };

  return queueService.addToQueue(message, {
    priority: EmailPriority.HIGH,
    maxAttempts: 3
  });
}

export async function queueBookingReminder(
  studentEmail: string,
  studentName: string,
  reminderData: {
    courseName: string;
    classTime: string;
    teacherName: string;
    timeUntilClass: string;
    joinLink?: string;
  },
  scheduledAt: Date
): Promise<string> {
  const queueService = getEmailQueueService();

  const message: EmailMessage = {
    to: [{ email: studentEmail, name: studentName }],
    subject: 'Class Reminder - Starting Soon',
    template: 'booking_reminder' as any,
    templateData: {
      studentName,
      ...reminderData
    },
    priority: EmailPriority.HIGH,
    tags: ['booking', 'reminder'],
    trackingEnabled: true
  };

  return queueService.addToQueue(message, {
    priority: EmailPriority.HIGH,
    scheduledAt,
    maxAttempts: 2
  });
}

export async function queueScheduleChange(
  recipientEmail: string,
  recipientName: string,
  changeData: {
    originalDate: string;
    originalTime: string;
    newDate: string;
    newTime: string;
    reason: string;
  }
): Promise<string> {
  const queueService = getEmailQueueService();

  const message: EmailMessage = {
    to: [{ email: recipientEmail, name: recipientName }],
    subject: 'Schedule Change Notification',
    template: 'schedule_change' as any,
    templateData: {
      recipientName,
      ...changeData
    },
    priority: EmailPriority.HIGH,
    tags: ['schedule', 'change'],
    trackingEnabled: true
  };

  return queueService.addToQueue(message, {
    priority: EmailPriority.HIGH,
    maxAttempts: 3
  });
}

export async function queueConflictAlert(
  recipientEmail: string,
  recipientName: string,
  conflictData: {
    conflictType: string;
    conflictDateTime: string;
    affectedClasses: string;
    recommendedAction: string;
  }
): Promise<string> {
  const queueService = getEmailQueueService();

  const message: EmailMessage = {
    to: [{ email: recipientEmail, name: recipientName }],
    subject: 'Scheduling Conflict Alert',
    template: 'conflict_alert' as any,
    templateData: {
      recipientName,
      ...conflictData
    },
    priority: EmailPriority.URGENT,
    tags: ['conflict', 'alert'],
    trackingEnabled: true
  };

  return queueService.addToQueue(message, {
    priority: EmailPriority.URGENT,
    maxAttempts: 5
  });
}

export default EmailQueueService;