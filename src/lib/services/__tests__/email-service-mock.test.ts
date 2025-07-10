import { EmailService, EmailTemplateType, EmailPriority, EmailStatus } from '../email-service';

// Mock the crypto global for Node.js compatibility
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-123'
  }
});

describe('EmailService (Mock Implementation)', () => {
  let emailService: EmailService;

  beforeEach(() => {
    // Create email service with test configuration
    emailService = new EmailService({
      apiKey: 'test-api-key',
      domain: 'test.example.com',
      testMode: true
    });

    // Mock the internal mailgun property to avoid actual API calls
    (emailService as any).mailgun = {
      client: jest.fn().mockReturnValue({
        messages: {
          create: jest.fn()
        },
        stats: {
          list: jest.fn()
        }
      })
    };
  });

  describe('template management', () => {
    it('should initialize with default templates', () => {
      const bookingTemplate = emailService.getTemplate(EmailTemplateType.BOOKING_CONFIRMATION);
      expect(bookingTemplate).toBeDefined();
      expect(bookingTemplate?.subject).toContain('Class Booking Confirmation');
    });

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
    it('should process template variables correctly', () => {
      const template = '{{studentName}} has a class with {{teacherName}} at {{classTime}}';
      const data = {
        studentName: 'John Doe',
        teacherName: 'Teacher Smith',
        classTime: '10:00 AM'
      };

      // Access private method for testing
      const processTemplate = (emailService as any).processTemplate.bind(emailService);
      const result = processTemplate(template, data);

      expect(result).toBe('John Doe has a class with Teacher Smith at 10:00 AM');
    });

    it('should handle missing template variables', () => {
      const template = '{{studentName}} has a class with {{teacherName}} at {{classTime}}';
      const data = {
        studentName: 'John Doe'
        // Missing teacherName and classTime
      };

      const processTemplate = (emailService as any).processTemplate.bind(emailService);
      const result = processTemplate(template, data);

      expect(result).toBe('John Doe has a class with {{teacherName}} at {{classTime}}');
    });
  });

  describe('email message construction', () => {
    it('should construct email message with all fields', async () => {
      const mockMailgun = (emailService as any).mailgun.client();
      mockMailgun.messages.create.mockResolvedValue({
        id: 'test-message-id',
        message: 'Queued. Thank you.'
      });

      const result = await emailService.sendEmail({
        to: [{ email: 'test@example.com', name: 'Test User' }],
        cc: [{ email: 'cc@example.com', name: 'CC User' }],
        bcc: [{ email: 'bcc@example.com' }],
        subject: 'Test Subject',
        html: '<p>Test HTML content</p>',
        text: 'Test text content',
        tags: ['test', 'example'],
        trackingEnabled: true,
        customHeaders: { 'X-Custom': 'value' }
      });

      expect(result.status).toBe(EmailStatus.SENT);
      expect(mockMailgun.messages.create).toHaveBeenCalledWith(
        'test.example.com',
        expect.objectContaining({
          from: 'HeyPeter Academy <noreply@test.example.com>',
          to: ['Test User <test@example.com>'],
          cc: ['CC User <cc@example.com>'],
          bcc: ['bcc@example.com'],
          subject: 'Test Subject',
          html: '<p>Test HTML content</p>',
          text: 'Test text content',
          'o:tag': 'test,example',
          'o:tracking': 'yes',
          'o:tracking-clicks': 'yes',
          'o:tracking-opens': 'yes',
          'o:testmode': 'yes',
          'X-Custom': 'value'
        })
      );
    });

    it('should handle email addresses without names', async () => {
      const mockMailgun = (emailService as any).mailgun.client();
      mockMailgun.messages.create.mockResolvedValue({
        id: 'test-message-id'
      });

      await emailService.sendEmail({
        to: [{ email: 'test@example.com' }],
        subject: 'Test Subject',
        html: '<p>Test content</p>'
      });

      expect(mockMailgun.messages.create).toHaveBeenCalledWith(
        'test.example.com',
        expect.objectContaining({
          to: ['test@example.com']
        })
      );
    });
  });

  describe('convenience methods', () => {
    beforeEach(() => {
      const mockMailgun = (emailService as any).mailgun.client();
      mockMailgun.messages.create.mockResolvedValue({
        id: 'test-message-id',
        message: 'Queued. Thank you.'
      });
    });

    it('should send booking confirmation with correct template data', async () => {
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
      
      const mockMailgun = (emailService as any).mailgun.client();
      const callArgs = mockMailgun.messages.create.mock.calls[0][1];
      
      expect(callArgs.subject).toBe('Class Booking Confirmation - HeyPeter Academy');
      expect(callArgs.html).toContain('Dear John Doe');
      expect(callArgs.html).toContain('English Basic');
      expect(callArgs.html).toContain('Monday, Jan 15, 2024');
      expect(callArgs.html).toContain('10:00 AM');
      expect(callArgs.html).toContain('Teacher Smith');
      expect(callArgs.html).toContain('Room 101');
    });

    it('should send booking reminder with join link', async () => {
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
      
      const mockMailgun = (emailService as any).mailgun.client();
      const callArgs = mockMailgun.messages.create.mock.calls[0][1];
      
      expect(callArgs.subject).toBe('Class Reminder - Starting Soon');
      expect(callArgs.html).toContain('Dear John Doe');
      expect(callArgs.html).toContain('https://example.com/join/123');
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
      
      const mockMailgun = (emailService as any).mailgun.client();
      const callArgs = mockMailgun.messages.create.mock.calls[0][1];
      
      expect(callArgs.subject).toBe('Schedule Change Notification');
      expect(callArgs.html).toContain('Dear John Doe');
      expect(callArgs.html).toContain('Monday, Jan 15, 2024');
      expect(callArgs.html).toContain('Tuesday, Jan 16, 2024');
      expect(callArgs.html).toContain('Teacher unavailable');
    });

    it('should send conflict alert with urgency', async () => {
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
      
      const mockMailgun = (emailService as any).mailgun.client();
      const callArgs = mockMailgun.messages.create.mock.calls[0][1];
      
      expect(callArgs.subject).toBe('Scheduling Conflict Alert');
      expect(callArgs.html).toContain('Dear Admin User');
      expect(callArgs.html).toContain('Teacher double booking');
      expect(callArgs.html).toContain('Reschedule one of the classes');
      expect(callArgs['o:tag']).toBe('conflict,alert');
    });
  });

  describe('error handling', () => {
    it('should handle email sending failure gracefully', async () => {
      const mockMailgun = (emailService as any).mailgun.client();
      mockMailgun.messages.create.mockRejectedValue(new Error('API Error'));

      const result = await emailService.sendEmail({
        to: [{ email: 'test@example.com' }],
        subject: 'Test Subject',
        html: '<p>Test content</p>'
      });

      expect(result.status).toBe(EmailStatus.FAILED);
      expect(result.error).toBe('API Error');
      expect(result.id).toBe('test-uuid-123');
    });

    it('should handle unknown errors', async () => {
      const mockMailgun = (emailService as any).mailgun.client();
      mockMailgun.messages.create.mockRejectedValue('Unknown error type');

      const result = await emailService.sendEmail({
        to: [{ email: 'test@example.com' }],
        subject: 'Test Subject',
        html: '<p>Test content</p>'
      });

      expect(result.status).toBe(EmailStatus.FAILED);
      expect(result.error).toBe('Unknown error');
    });
  });

  describe('metrics', () => {
    it('should return email metrics from API', async () => {
      const mockMailgun = (emailService as any).mailgun.client();
      mockMailgun.stats.list.mockResolvedValue({
        total_count: 100,
        delivered_count: 90,
        failed_count: 5,
        bounced_count: 3,
        complained_count: 2
      });

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

    it('should handle metrics API failure', async () => {
      const mockMailgun = (emailService as any).mailgun.client();
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

    it('should handle empty stats response', async () => {
      const mockMailgun = (emailService as any).mailgun.client();
      mockMailgun.stats.list.mockResolvedValue({});

      const metrics = await emailService.getEmailMetrics();

      expect(metrics.totalSent).toBe(0);
      expect(metrics.deliveryRate).toBe(0);
    });
  });
});