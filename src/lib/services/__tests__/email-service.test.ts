import { EmailService, EmailTemplateType, EmailPriority, EmailStatus } from '../email-service';

// Mock Mailgun
jest.mock('mailgun.js', () => {
  return jest.fn().mockImplementation(() => ({
    client: jest.fn().mockReturnValue({
      messages: {
        create: jest.fn()
      },
      stats: {
        list: jest.fn()
      }
    })
  }));
});

jest.mock('form-data', () => {
  return jest.fn().mockImplementation(() => ({}));
});

describe('EmailService', () => {
  let emailService: EmailService;
  let mockMailgun: any;

  beforeEach(() => {
    // Mock environment variables
    process.env.MAILGUN_API_KEY = 'test-api-key';
    process.env.MAILGUN_DOMAIN = 'test.example.com';
    process.env.NODE_ENV = 'test';

    emailService = new EmailService({
      apiKey: 'test-api-key',
      domain: 'test.example.com',
      testMode: true
    });

    // Get the mocked mailgun instance
    const Mailgun = require('mailgun.js');
    mockMailgun = {
      messages: {
        create: jest.fn()
      },
      stats: {
        list: jest.fn()
      }
    };
    
    // Mock the client method to return our mock
    Mailgun.prototype.client = jest.fn().mockReturnValue(mockMailgun);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      const mockResponse = {
        id: 'test-message-id',
        message: 'Queued. Thank you.'
      };

      mockMailgun.messages.create.mockResolvedValue(mockResponse);

      const result = await emailService.sendEmail({
        to: [{ email: 'test@example.com', name: 'Test User' }],
        subject: 'Test Subject',
        html: '<p>Test HTML content</p>',
        text: 'Test text content'
      });

      expect(result.status).toBe(EmailStatus.SENT);
      expect(result.messageId).toBe('test-message-id');
      expect(mockMailgun.messages.create).toHaveBeenCalledWith(
        'test.example.com',
        expect.objectContaining({
          from: 'HeyPeter Academy <noreply@test.example.com>',
          to: ['Test User <test@example.com>'],
          subject: 'Test Subject',
          html: '<p>Test HTML content</p>',
          text: 'Test text content',
          'o:testmode': 'yes'
        })
      );
    });

    it('should handle email sending failure', async () => {
      const mockError = new Error('Failed to send email');
      mockMailgun.messages.create.mockRejectedValue(mockError);

      const result = await emailService.sendEmail({
        to: [{ email: 'test@example.com' }],
        subject: 'Test Subject',
        html: '<p>Test content</p>'
      });

      expect(result.status).toBe(EmailStatus.FAILED);
      expect(result.error).toBe('Failed to send email');
    });

    it('should process email template with data', async () => {
      const mockResponse = {
        id: 'test-message-id',
        message: 'Queued. Thank you.'
      };

      mockMailgun.messages.create.mockResolvedValue(mockResponse);

      const result = await emailService.sendEmail({
        to: [{ email: 'student@example.com', name: 'John Doe' }],
        subject: 'Test Subject',
        template: EmailTemplateType.BOOKING_CONFIRMATION,
        templateData: {
          studentName: 'John Doe',
          courseName: 'English Basic',
          classDate: 'Monday, Jan 15, 2024',
          classTime: '10:00 AM',
          teacherName: 'Teacher Smith',
          location: 'Room 101'
        }
      });

      expect(result.status).toBe(EmailStatus.SENT);
      expect(mockMailgun.messages.create).toHaveBeenCalledWith(
        'test.example.com',
        expect.objectContaining({
          html: expect.stringContaining('Dear John Doe'),
          html: expect.stringContaining('English Basic'),
          html: expect.stringContaining('Monday, Jan 15, 2024'),
          html: expect.stringContaining('10:00 AM'),
          html: expect.stringContaining('Teacher Smith'),
          html: expect.stringContaining('Room 101')
        })
      );
    });

    it('should handle multiple recipients', async () => {
      const mockResponse = {
        id: 'test-message-id',
        message: 'Queued. Thank you.'
      };

      mockMailgun.messages.create.mockResolvedValue(mockResponse);

      const result = await emailService.sendEmail({
        to: [
          { email: 'student1@example.com', name: 'Student One' },
          { email: 'student2@example.com', name: 'Student Two' }
        ],
        cc: [{ email: 'teacher@example.com', name: 'Teacher' }],
        subject: 'Test Subject',
        html: '<p>Test content</p>'
      });

      expect(result.status).toBe(EmailStatus.SENT);
      expect(mockMailgun.messages.create).toHaveBeenCalledWith(
        'test.example.com',
        expect.objectContaining({
          to: ['Student One <student1@example.com>', 'Student Two <student2@example.com>'],
          cc: ['Teacher <teacher@example.com>']
        })
      );
    });

    it('should include tracking and tags', async () => {
      const mockResponse = {
        id: 'test-message-id',
        message: 'Queued. Thank you.'
      };

      mockMailgun.messages.create.mockResolvedValue(mockResponse);

      const result = await emailService.sendEmail({
        to: [{ email: 'test@example.com' }],
        subject: 'Test Subject',
        html: '<p>Test content</p>',
        tags: ['booking', 'confirmation'],
        trackingEnabled: true
      });

      expect(result.status).toBe(EmailStatus.SENT);
      expect(mockMailgun.messages.create).toHaveBeenCalledWith(
        'test.example.com',
        expect.objectContaining({
          'o:tag': 'booking,confirmation',
          'o:tracking': 'yes',
          'o:tracking-clicks': 'yes',
          'o:tracking-opens': 'yes'
        })
      );
    });
  });

  describe('convenience methods', () => {
    beforeEach(() => {
      const mockResponse = {
        id: 'test-message-id',
        message: 'Queued. Thank you.'
      };
      mockMailgun.messages.create.mockResolvedValue(mockResponse);
    });

    it('should send booking confirmation', async () => {
      const result = await emailService.sendBookingConfirmation(
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

      expect(result.status).toBe(EmailStatus.SENT);
      expect(mockMailgun.messages.create).toHaveBeenCalledWith(
        'test.example.com',
        expect.objectContaining({
          subject: 'Class Booking Confirmation - HeyPeter Academy',
          'o:tag': 'booking,confirmation'
        })
      );
    });

    it('should send booking reminder', async () => {
      const result = await emailService.sendBookingReminder(
        'student@example.com',
        'John Doe',
        {
          courseName: 'English Basic',
          classTime: '10:00 AM',
          teacherName: 'Teacher Smith',
          timeUntilClass: '15 minutes',
          joinLink: 'https://example.com/join/123'
        }
      );

      expect(result.status).toBe(EmailStatus.SENT);
      expect(mockMailgun.messages.create).toHaveBeenCalledWith(
        'test.example.com',
        expect.objectContaining({
          subject: 'Class Reminder - Starting Soon',
          'o:tag': 'booking,reminder'
        })
      );
    });

    it('should send schedule change notification', async () => {
      const result = await emailService.sendScheduleChange(
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

      expect(result.status).toBe(EmailStatus.SENT);
      expect(mockMailgun.messages.create).toHaveBeenCalledWith(
        'test.example.com',
        expect.objectContaining({
          subject: 'Schedule Change Notification',
          'o:tag': 'schedule,change'
        })
      );
    });

    it('should send conflict alert', async () => {
      const result = await emailService.sendConflictAlert(
        'admin@example.com',
        'Admin User',
        {
          conflictType: 'Teacher double booking',
          conflictDateTime: 'Monday, Jan 15, 2024 at 10:00 AM',
          affectedClasses: 'English Basic, Math Advanced',
          recommendedAction: 'Reschedule one of the classes'
        }
      );

      expect(result.status).toBe(EmailStatus.SENT);
      expect(mockMailgun.messages.create).toHaveBeenCalledWith(
        'test.example.com',
        expect.objectContaining({
          subject: 'Scheduling Conflict Alert',
          'o:tag': 'conflict,alert'
        })
      );
    });
  });

  describe('getEmailMetrics', () => {
    it('should return email metrics', async () => {
      const mockStats = {
        total_count: 100,
        delivered_count: 90,
        failed_count: 5,
        bounced_count: 3,
        complained_count: 2
      };

      mockMailgun.stats.list.mockResolvedValue(mockStats);

      const metrics = await emailService.getEmailMetrics();

      expect(metrics).toEqual({
        totalSent: 100,
        totalDelivered: 90,
        totalFailed: 5,
        totalBounced: 3,
        totalComplaints: 2,
        deliveryRate: 90,
        bounceRate: 3,
        complaintRate: 2
      });
    });

    it('should handle metrics retrieval failure', async () => {
      mockMailgun.stats.list.mockRejectedValue(new Error('Stats unavailable'));

      const metrics = await emailService.getEmailMetrics();

      expect(metrics).toEqual({
        totalSent: 0,
        totalDelivered: 0,
        totalFailed: 0,
        totalBounced: 0,
        totalComplaints: 0,
        deliveryRate: 0,
        bounceRate: 0,
        complaintRate: 0
      });
    });
  });

  describe('template management', () => {
    it('should add custom template', () => {
      const customTemplate = {
        id: 'custom-template',
        type: EmailTemplateType.WELCOME,
        subject: 'Welcome to HeyPeter Academy',
        htmlContent: '<h1>Welcome {{name}}!</h1>',
        textContent: 'Welcome {{name}}!'
      };

      emailService.addTemplate(customTemplate);
      const retrieved = emailService.getTemplate(EmailTemplateType.WELCOME);

      expect(retrieved).toEqual(customTemplate);
    });

    it('should update existing template', () => {
      const updates = {
        subject: 'Updated Subject',
        htmlContent: '<h1>Updated Content</h1>'
      };

      emailService.updateTemplate(EmailTemplateType.BOOKING_CONFIRMATION, updates);
      const updated = emailService.getTemplate(EmailTemplateType.BOOKING_CONFIRMATION);

      expect(updated?.subject).toBe('Updated Subject');
      expect(updated?.htmlContent).toBe('<h1>Updated Content</h1>');
    });
  });

  describe('template processing', () => {
    it('should process template variables correctly', async () => {
      const mockResponse = {
        id: 'test-message-id',
        message: 'Queued. Thank you.'
      };

      mockMailgun.messages.create.mockResolvedValue(mockResponse);

      await emailService.sendEmail({
        to: [{ email: 'test@example.com' }],
        subject: 'Test Subject',
        template: EmailTemplateType.BOOKING_CONFIRMATION,
        templateData: {
          studentName: 'John Doe',
          courseName: 'English Basic',
          classDate: 'Monday, Jan 15, 2024',
          classTime: '10:00 AM',
          teacherName: 'Teacher Smith',
          location: 'Room 101'
        }
      });

      const callArgs = mockMailgun.messages.create.mock.calls[0][1];
      expect(callArgs.html).toContain('Dear John Doe');
      expect(callArgs.html).toContain('English Basic');
      expect(callArgs.html).toContain('Monday, Jan 15, 2024');
      expect(callArgs.html).toContain('10:00 AM');
      expect(callArgs.html).toContain('Teacher Smith');
      expect(callArgs.html).toContain('Room 101');
    });

    it('should handle missing template variables', async () => {
      const mockResponse = {
        id: 'test-message-id',
        message: 'Queued. Thank you.'
      };

      mockMailgun.messages.create.mockResolvedValue(mockResponse);

      await emailService.sendEmail({
        to: [{ email: 'test@example.com' }],
        subject: 'Test Subject',
        template: EmailTemplateType.BOOKING_CONFIRMATION,
        templateData: {
          studentName: 'John Doe',
          courseName: 'English Basic'
          // Missing other variables
        }
      });

      const callArgs = mockMailgun.messages.create.mock.calls[0][1];
      expect(callArgs.html).toContain('Dear John Doe');
      expect(callArgs.html).toContain('English Basic');
      expect(callArgs.html).toContain('{{classDate}}'); // Should remain as placeholder
      expect(callArgs.html).toContain('{{classTime}}'); // Should remain as placeholder
    });
  });
});