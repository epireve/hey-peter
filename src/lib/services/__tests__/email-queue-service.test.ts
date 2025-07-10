import { EmailQueueService, EmailQueueJob } from '../email-queue-service';
import { EmailMessage, EmailPriority, EmailStatus } from '../email-service';

// Mock the crypto global for Node.js compatibility
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-123'
  }
});

// Mock the email service
jest.mock('../email-service', () => ({
  getEmailService: jest.fn(() => ({
    sendEmail: jest.fn()
  })),
  EmailPriority: {
    LOW: 'low',
    NORMAL: 'normal',
    HIGH: 'high',
    URGENT: 'urgent'
  },
  EmailStatus: {
    SENT: 'sent',
    FAILED: 'failed'
  }
}));

describe('EmailQueueService', () => {
  let queueService: EmailQueueService;
  let mockEmailService: any;

  beforeEach(() => {
    queueService = new EmailQueueService({
      maxRetries: 3,
      retryDelay: 100, // Reduced for faster tests
      processingInterval: 50, // Reduced for faster tests
      maxConcurrentJobs: 2
    });

    const { getEmailService } = require('../email-service');
    mockEmailService = getEmailService();
  });

  afterEach(() => {
    queueService.stopProcessing();
    jest.clearAllMocks();
  });

  describe('addToQueue', () => {
    it('should add email to queue', async () => {
      const message: EmailMessage = {
        to: [{ email: 'test@example.com' }],
        subject: 'Test Subject',
        html: '<p>Test content</p>'
      };

      const jobId = await queueService.addToQueue(message);

      expect(jobId).toBeDefined();
      
      const job = queueService.getJobStatus(jobId);
      expect(job).toBeDefined();
      expect(job?.status).toBe('pending');
      expect(job?.message.subject).toBe('Test Subject');
    });

    it('should set job priority correctly', async () => {
      const message: EmailMessage = {
        to: [{ email: 'test@example.com' }],
        subject: 'Test Subject',
        html: '<p>Test content</p>'
      };

      const jobId = await queueService.addToQueue(message, {
        priority: EmailPriority.HIGH
      });

      const job = queueService.getJobStatus(jobId);
      expect(job?.priority).toBe(EmailPriority.HIGH);
    });

    it('should schedule job for future delivery', async () => {
      const message: EmailMessage = {
        to: [{ email: 'test@example.com' }],
        subject: 'Test Subject',
        html: '<p>Test content</p>'
      };

      const futureDate = new Date(Date.now() + 60000); // 1 minute from now
      const jobId = await queueService.addToQueue(message, {
        scheduledAt: futureDate
      });

      const job = queueService.getJobStatus(jobId);
      expect(job?.scheduledAt).toEqual(futureDate);
    });
  });

  describe('processQueue', () => {
    it('should process pending jobs', async () => {
      mockEmailService.sendEmail.mockResolvedValue({
        status: EmailStatus.SENT
      });

      const message: EmailMessage = {
        to: [{ email: 'test@example.com' }],
        subject: 'Test Subject',
        html: '<p>Test content</p>'
      };

      const jobId = await queueService.addToQueue(message);

      // Wait for processing - increase timeout and manually trigger processing
      queueService.startProcessing();
      await new Promise(resolve => setTimeout(resolve, 200));

      const job = queueService.getJobStatus(jobId);
      expect(job?.attempts).toBe(1);
    });

    it('should retry failed jobs', async () => {
      mockEmailService.sendEmail.mockRejectedValue(new Error('Send failed'));

      const message: EmailMessage = {
        to: [{ email: 'test@example.com' }],
        subject: 'Test Subject',
        html: '<p>Test content</p>'
      };

      const jobId = await queueService.addToQueue(message);

      // Wait for processing - increase timeout and manually trigger processing
      queueService.startProcessing();
      await new Promise(resolve => setTimeout(resolve, 200));

      const job = queueService.getJobStatus(jobId);
      expect(job?.attempts).toBe(1);
      expect(job?.status).toBe('pending'); // Should be pending for retry
      expect(job?.lastError).toBe('Send failed');
    });

    it('should mark job as failed after max attempts', async () => {
      mockEmailService.sendEmail.mockRejectedValue(new Error('Send failed'));

      const message: EmailMessage = {
        to: [{ email: 'test@example.com' }],
        subject: 'Test Subject',
        html: '<p>Test content</p>'
      };

      const jobId = await queueService.addToQueue(message, {
        maxAttempts: 1
      });

      // Wait for processing - increase timeout and manually trigger processing
      queueService.startProcessing();
      await new Promise(resolve => setTimeout(resolve, 200));

      const job = queueService.getJobStatus(jobId);
      expect(job?.attempts).toBe(1);
      expect(job?.status).toBe('failed');
    });

    it('should process jobs by priority', async () => {
      mockEmailService.sendEmail.mockResolvedValue({
        status: EmailStatus.SENT
      });

      const processedJobs: string[] = [];
      mockEmailService.sendEmail.mockImplementation(async (message: EmailMessage) => {
        processedJobs.push(message.subject);
        return { status: EmailStatus.SENT };
      });

      // Add jobs with different priorities
      await queueService.addToQueue({
        to: [{ email: 'test@example.com' }],
        subject: 'Low Priority',
        html: '<p>Content</p>'
      }, { priority: EmailPriority.LOW });

      await queueService.addToQueue({
        to: [{ email: 'test@example.com' }],
        subject: 'High Priority',
        html: '<p>Content</p>'
      }, { priority: EmailPriority.HIGH });

      await queueService.addToQueue({
        to: [{ email: 'test@example.com' }],
        subject: 'Urgent Priority',
        html: '<p>Content</p>'
      }, { priority: EmailPriority.URGENT });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));

      // High priority jobs should be processed first
      expect(processedJobs[0]).toBe('Urgent Priority');
      expect(processedJobs[1]).toBe('High Priority');
      expect(processedJobs[2]).toBe('Low Priority');
    });
  });

  describe('queue management', () => {
    it('should get queue statistics', async () => {
      const messages = [
        { to: [{ email: 'test1@example.com' }], subject: 'Test 1', html: '<p>Content</p>' },
        { to: [{ email: 'test2@example.com' }], subject: 'Test 2', html: '<p>Content</p>' },
        { to: [{ email: 'test3@example.com' }], subject: 'Test 3', html: '<p>Content</p>' }
      ];

      for (const message of messages) {
        await queueService.addToQueue(message);
      }

      const stats = queueService.getQueueStats();
      expect(stats.total).toBe(3);
      expect(stats.pending).toBe(3);
      expect(stats.processing).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.failed).toBe(0);
    });

    it('should retry failed job', async () => {
      mockEmailService.sendEmail.mockRejectedValue(new Error('Send failed'));

      const message: EmailMessage = {
        to: [{ email: 'test@example.com' }],
        subject: 'Test Subject',
        html: '<p>Test content</p>'
      };

      const jobId = await queueService.addToQueue(message, {
        maxAttempts: 1
      });

      // Wait for processing to fail
      await new Promise(resolve => setTimeout(resolve, 100));

      // Job should be failed
      let job = queueService.getJobStatus(jobId);
      expect(job?.status).toBe('failed');

      // Retry the job
      const retryResult = await queueService.retryJob(jobId);
      expect(retryResult).toBe(true);

      job = queueService.getJobStatus(jobId);
      expect(job?.status).toBe('pending');
      expect(job?.attempts).toBe(0);
    });

    it('should remove job from queue', async () => {
      const message: EmailMessage = {
        to: [{ email: 'test@example.com' }],
        subject: 'Test Subject',
        html: '<p>Test content</p>'
      };

      const jobId = await queueService.addToQueue(message);
      
      const removed = queueService.removeJob(jobId);
      expect(removed).toBe(true);

      const job = queueService.getJobStatus(jobId);
      expect(job).toBeUndefined();
    });

    it('should clear completed jobs', async () => {
      mockEmailService.sendEmail.mockResolvedValue({
        status: EmailStatus.SENT
      });

      const message: EmailMessage = {
        to: [{ email: 'test@example.com' }],
        subject: 'Test Subject',
        html: '<p>Test content</p>'
      };

      const jobId = await queueService.addToQueue(message);

      // Wait for processing - increase timeout and manually trigger processing
      queueService.startProcessing();
      await new Promise(resolve => setTimeout(resolve, 200));

      // Manually mark as completed for testing
      const job = queueService.getJobStatus(jobId);
      if (job) {
        job.status = 'completed';
      }

      const cleared = queueService.clearCompletedJobs();
      expect(cleared).toBe(1);

      const clearedJob = queueService.getJobStatus(jobId);
      expect(clearedJob).toBeUndefined();
    });

    it('should clear failed jobs', async () => {
      mockEmailService.sendEmail.mockRejectedValue(new Error('Send failed'));

      const message: EmailMessage = {
        to: [{ email: 'test@example.com' }],
        subject: 'Test Subject',
        html: '<p>Test content</p>'
      };

      const jobId = await queueService.addToQueue(message, {
        maxAttempts: 1
      });

      // Wait for processing to fail
      await new Promise(resolve => setTimeout(resolve, 100));

      const cleared = queueService.clearFailedJobs();
      expect(cleared).toBe(1);

      const clearedJob = queueService.getJobStatus(jobId);
      expect(clearedJob).toBeUndefined();
    });

    it('should get jobs by status', async () => {
      const messages = [
        { to: [{ email: 'test1@example.com' }], subject: 'Test 1', html: '<p>Content</p>' },
        { to: [{ email: 'test2@example.com' }], subject: 'Test 2', html: '<p>Content</p>' }
      ];

      for (const message of messages) {
        await queueService.addToQueue(message);
      }

      const pendingJobs = queueService.getJobsByStatus('pending');
      expect(pendingJobs.length).toBe(2);
      expect(pendingJobs[0].status).toBe('pending');
    });
  });

  describe('convenience functions', () => {
    beforeEach(() => {
      mockEmailService.sendEmail.mockResolvedValue({
        status: EmailStatus.SENT
      });
    });

    it('should queue booking confirmation', async () => {
      const { queueBookingConfirmation } = require('../email-queue-service');
      
      const jobId = await queueBookingConfirmation(
        'student@example.com',
        'John Doe',
        {
          courseName: 'English Basic',
          classDate: 'Monday, Jan 15, 2024',
          classTime: '10:00 AM',
          teacherName: 'Teacher Smith',
          location: 'Room 101'
        }
      );

      expect(jobId).toBeDefined();
    });

    it('should queue booking reminder', async () => {
      const { queueBookingReminder } = require('../email-queue-service');
      
      const futureDate = new Date(Date.now() + 60000);
      const jobId = await queueBookingReminder(
        'student@example.com',
        'John Doe',
        {
          courseName: 'English Basic',
          classTime: '10:00 AM',
          teacherName: 'Teacher Smith',
          timeUntilClass: '15 minutes'
        },
        futureDate
      );

      expect(jobId).toBeDefined();
    });

    it('should queue schedule change', async () => {
      const { queueScheduleChange } = require('../email-queue-service');
      
      const jobId = await queueScheduleChange(
        'student@example.com',
        'John Doe',
        {
          originalDate: 'Monday, Jan 15, 2024',
          originalTime: '10:00 AM',
          newDate: 'Tuesday, Jan 16, 2024',
          newTime: '2:00 PM',
          reason: 'Teacher unavailable'
        }
      );

      expect(jobId).toBeDefined();
    });

    it('should queue conflict alert', async () => {
      const { queueConflictAlert } = require('../email-queue-service');
      
      const jobId = await queueConflictAlert(
        'admin@example.com',
        'Admin User',
        {
          conflictType: 'Teacher double booking',
          conflictDateTime: 'Monday, Jan 15, 2024 at 10:00 AM',
          affectedClasses: 'English Basic, Math Advanced',
          recommendedAction: 'Reschedule one of the classes'
        }
      );

      expect(jobId).toBeDefined();
    });
  });
});