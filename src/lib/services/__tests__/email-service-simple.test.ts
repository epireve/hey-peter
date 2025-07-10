import { SimpleEmailService, EmailTemplateType, EmailPriority, EmailStatus } from '../email-service-simple';

// Mock the crypto global for Node.js compatibility
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-123'
  }
});

describe('SimpleEmailService', () => {
  let emailService: SimpleEmailService;

  beforeEach(() => {
    emailService = new SimpleEmailService({
      apiKey: 'test-api-key',
      domain: 'test.example.com',
      testMode: true
    });
    
    // Clear any previous emails
    emailService.clearSentEmails();
    
    // Mock console.log to avoid test output
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('template management', () => {
    it('should initialize with default templates', () => {
      const bookingTemplate = emailService.getTemplate(EmailTemplateType.BOOKING_CONFIRMATION);
      expect(bookingTemplate).toBeDefined();
      expect(bookingTemplate?.subject).toContain('Class Booking Confirmation');
      expect(bookingTemplate?.htmlContent).toContain('{{studentName}}');
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
      // Access private method for testing
      const processTemplate = (emailService as any).processTemplate.bind(emailService);
      const template = '{{studentName}} has a class with {{teacherName}} at {{classTime}}';
      const data = {
        studentName: 'John Doe',
        teacherName: 'Teacher Smith',
        classTime: '10:00 AM'
      };

      const result = processTemplate(template, data);

      expect(result).toBe('John Doe has a class with Teacher Smith at 10:00 AM');
    });

    it('should handle missing template variables', () => {
      const processTemplate = (emailService as any).processTemplate.bind(emailService);
      const template = '{{studentName}} has a class with {{teacherName}} at {{classTime}}';
      const data = {
        studentName: 'John Doe'
        // Missing teacherName and classTime
      };

      const result = processTemplate(template, data);

      expect(result).toBe('John Doe has a class with {{teacherName}} at {{classTime}}');
    });
  });

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      const result = await emailService.sendEmail({
        to: [{ email: 'test@example.com', name: 'Test User' }],
        subject: 'Test Subject',
        html: '<p>Test HTML content</p>',
        text: 'Test text content'
      });

      expect(result.status).toBe(EmailStatus.SENT);
      expect(result.messageId).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);
      
      const sentEmails = emailService.getSentEmails();
      expect(sentEmails).toHaveLength(1);
    });

    it('should process email template with data', async () => {
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
      
      // Check that console.log was called with processed template
      expect(console.log).toHaveBeenCalledWith(
        'Email would be sent:',
        expect.objectContaining({
          to: [{ email: 'student@example.com', name: 'John Doe' }],
          subject: 'Test Subject',
          html: expect.stringContaining('Dear John Doe'),
          html: expect.stringContaining('English Basic'),
          html: expect.stringContaining('Monday, Jan 15, 2024')
        })
      );
    });

    it('should handle multiple recipients', async () => {
      const result = await emailService.sendEmail({
        to: [
          { email: 'student1@example.com', name: 'Student One' },
          { email: 'student2@example.com', name: 'Student Two' }
        ],
        cc: [{ email: 'teacher@example.com', name: 'Teacher' }],
        subject: 'Test Subject',
        html: '<p>Test content</p>',
        tags: ['test', 'multiple'],
        trackingEnabled: true
      });

      expect(result.status).toBe(EmailStatus.SENT);
      expect(console.log).toHaveBeenCalledWith(
        'Email would be sent:',
        expect.objectContaining({
          to: [
            { email: 'student1@example.com', name: 'Student One' },
            { email: 'student2@example.com', name: 'Student Two' }
          ]
        })
      );
    });
  });

  describe('convenience methods', () => {
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
      
      const sentEmails = emailService.getSentEmails();
      expect(sentEmails).toHaveLength(1);
      
      expect(console.log).toHaveBeenCalledWith(
        'Email would be sent:',
        expect.objectContaining({
          subject: 'Class Booking Confirmation - HeyPeter Academy',
          html: expect.stringContaining('Dear John Doe'),
          html: expect.stringContaining('English Basic'),
          html: expect.stringContaining('Monday, Jan 15, 2024'),
          html: expect.stringContaining('10:00 AM'),
          html: expect.stringContaining('Teacher Smith'),
          html: expect.stringContaining('Room 101')
        })
      );
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
      
      expect(console.log).toHaveBeenCalledWith(
        'Email would be sent:',
        expect.objectContaining({
          subject: 'Class Reminder - Starting Soon',
          html: expect.stringContaining('Dear John Doe'),
          html: expect.stringContaining('https://example.com/join/123')
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
      
      expect(console.log).toHaveBeenCalledWith(
        'Email would be sent:',
        expect.objectContaining({
          subject: 'Schedule Change Notification',
          html: expect.stringContaining('Dear John Doe'),
          html: expect.stringContaining('Monday, Jan 15, 2024'),
          html: expect.stringContaining('Tuesday, Jan 16, 2024'),
          html: expect.stringContaining('Teacher unavailable')
        })
      );
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
      
      expect(console.log).toHaveBeenCalledWith(
        'Email would be sent:',
        expect.objectContaining({
          subject: 'Scheduling Conflict Alert',
          html: expect.stringContaining('Dear Admin User'),
          html: expect.stringContaining('Teacher double booking'),
          html: expect.stringContaining('Reschedule one of the classes')
        })
      );
    });
  });

  describe('metrics', () => {
    it('should return email metrics', async () => {
      // Send some test emails
      await emailService.sendEmail({
        to: [{ email: 'test1@example.com' }],
        subject: 'Test 1',
        html: '<p>Content 1</p>'
      });
      
      await emailService.sendEmail({
        to: [{ email: 'test2@example.com' }],
        subject: 'Test 2',
        html: '<p>Content 2</p>'
      });

      const metrics = await emailService.getEmailMetrics();

      expect(metrics).toEqual({
        totalSent: 2,
        totalDelivered: 2,
        totalFailed: 0,
        totalBounced: 0,
        totalComplaints: 0,
        deliveryRate: 100,
        bounceRate: 0,
        complaintRate: 0
      });
    });

    it('should filter metrics by date range', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await emailService.sendEmail({
        to: [{ email: 'test@example.com' }],
        subject: 'Test',
        html: '<p>Content</p>'
      });

      // Should include today's email
      const todayMetrics = await emailService.getEmailMetrics(yesterday, tomorrow);
      expect(todayMetrics.totalSent).toBe(1);

      // Should exclude today's email
      const futureMetrics = await emailService.getEmailMetrics(tomorrow);
      expect(futureMetrics.totalSent).toBe(0);
    });

    it('should handle empty metrics', async () => {
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

  describe('error handling', () => {
    it('should handle processing errors gracefully', async () => {
      // Force an error by providing invalid template data
      const originalProcessTemplate = (emailService as any).processTemplate;
      (emailService as any).processTemplate = jest.fn().mockImplementation(() => {
        throw new Error('Template processing failed');
      });

      const result = await emailService.sendEmail({
        to: [{ email: 'test@example.com' }],
        subject: 'Test Subject',
        template: EmailTemplateType.BOOKING_CONFIRMATION,
        templateData: { studentName: 'John' }
      });

      expect(result.status).toBe(EmailStatus.FAILED);
      expect(result.error).toBe('Template processing failed');

      // Restore original method
      (emailService as any).processTemplate = originalProcessTemplate;
    });
  });

  describe('test utilities', () => {
    it('should track sent emails', async () => {
      await emailService.sendEmail({
        to: [{ email: 'test1@example.com' }],
        subject: 'Test 1',
        html: '<p>Content 1</p>'
      });

      await emailService.sendEmail({
        to: [{ email: 'test2@example.com' }],
        subject: 'Test 2',
        html: '<p>Content 2</p>'
      });

      const sentEmails = emailService.getSentEmails();
      expect(sentEmails).toHaveLength(2);
      expect(sentEmails[0].status).toBe(EmailStatus.SENT);
      expect(sentEmails[1].status).toBe(EmailStatus.SENT);
    });

    it('should clear sent emails', async () => {
      await emailService.sendEmail({
        to: [{ email: 'test@example.com' }],
        subject: 'Test',
        html: '<p>Content</p>'
      });

      expect(emailService.getSentEmails()).toHaveLength(1);

      emailService.clearSentEmails();
      expect(emailService.getSentEmails()).toHaveLength(0);
    });
  });
});