# Email Integration System

## Overview

The HeyPeter Academy LMS now includes a comprehensive email notification system built on Mailgun. This system automatically sends notifications for booking confirmations, reminders, schedule changes, and conflict alerts.

## Features

### 🚀 Core Capabilities
- **Mailgun Integration**: Professional email delivery service
- **Template System**: Pre-built templates for all notification types
- **Queue Management**: Reliable delivery with retry logic
- **User Preferences**: Granular notification settings
- **Analytics Dashboard**: Email delivery tracking and metrics
- **Scheduling Integration**: Automatic triggers from booking system

### 📧 Email Types
1. **Booking Confirmations**: Sent when classes are booked
2. **Class Reminders**: Scheduled before class start time
3. **Schedule Changes**: Notifications for time/date modifications
4. **Conflict Alerts**: Urgent notifications for scheduling conflicts
5. **Teacher Availability**: Updates when teacher schedules change
6. **System Alerts**: Maintenance and important announcements

## Architecture

### Service Layer
```
src/lib/services/
├── email-service.ts              # Core Mailgun integration
├── email-queue-service.ts        # Queue management with retry
├── email-notification-service.ts # Notification triggers
└── scheduling-email-integration.ts # Hooks for scheduling system
```

### UI Components
```
src/components/admin/email/
├── EmailPreferencesManager.tsx    # User preference settings
├── EmailManagementDashboard.tsx   # Admin analytics dashboard
└── EmailIntegrationExample.tsx    # Integration examples
```

### Tests
```
src/lib/services/__tests__/
├── email-service-simple.test.ts   # Core service tests
└── email-queue-service.test.ts    # Queue management tests
```

## Setup

### 1. Environment Variables

Add to your `.env.local`:

```env
# Mailgun Configuration (Required)
MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_DOMAIN=your_mailgun_domain
NEXT_PUBLIC_MAILGUN_DOMAIN=your_mailgun_domain
```

### 2. Install Dependencies

For production use with actual Mailgun:
```bash
npm install mailgun.js form-data
```

### 3. Service Initialization

The email services are automatically initialized as singletons:

```typescript
import { getEmailService, getEmailQueueService } from '@/lib/services';

const emailService = getEmailService();
const queueService = getEmailQueueService();
```

## Usage

### Basic Email Sending

```typescript
import { getEmailService, EmailPriority } from '@/lib/services';

const emailService = getEmailService();

await emailService.sendEmail({
  to: [{ email: 'student@example.com', name: 'John Doe' }],
  subject: 'Class Confirmation',
  html: '<p>Your class is confirmed!</p>',
  priority: EmailPriority.HIGH,
  tags: ['booking', 'confirmation']
});
```

### Template-Based Emails

```typescript
import { EmailTemplateType } from '@/lib/services';

await emailService.sendEmail({
  to: [{ email: 'student@example.com', name: 'John Doe' }],
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
```

### Queue Management

```typescript
import { getEmailQueueService } from '@/lib/services';

const queueService = getEmailQueueService();

// Add email to queue with scheduling
const jobId = await queueService.addToQueue(emailMessage, {
  scheduledAt: new Date(Date.now() + 60000), // Send in 1 minute
  priority: EmailPriority.HIGH,
  maxAttempts: 3
});

// Check job status
const job = queueService.getJobStatus(jobId);
console.log('Job status:', job?.status);

// Retry failed job
await queueService.retryJob(jobId);
```

### Scheduling Integration

```typescript
import { schedulingEmailHooks } from '@/lib/services';

// Automatic email on booking creation
await schedulingEmailHooks.onBookingCreated({
  bookingId: 'booking-123',
  studentId: 'student-456',
  teacherId: 'teacher-789',
  courseId: 'course-english-basic',
  classDateTime: new Date(),
  duration: 60,
  location: 'Room 101',
  isOnline: false
});

// Schedule change notification
await schedulingEmailHooks.onScheduleChange({
  bookingId: 'booking-123',
  affectedUserId: 'student-456',
  originalDateTime: new Date(),
  newDateTime: new Date(Date.now() + 86400000),
  reason: 'Teacher availability conflict',
  courseId: 'course-english-basic'
});
```

## Email Templates

### Available Templates

1. **BOOKING_CONFIRMATION**: Class booking confirmations
2. **BOOKING_REMINDER**: Pre-class reminders
3. **BOOKING_CANCELLATION**: Cancellation notifications
4. **SCHEDULE_CHANGE**: Schedule modification alerts
5. **CONFLICT_ALERT**: Scheduling conflict warnings
6. **TEACHER_AVAILABILITY**: Teacher schedule changes
7. **WELCOME**: New user welcome emails
8. **SYSTEM_ALERT**: System-wide announcements

### Custom Templates

```typescript
import { EmailTemplateType } from '@/lib/services';

const customTemplate = {
  id: 'custom-welcome',
  type: EmailTemplateType.WELCOME,
  subject: 'Welcome to {{schoolName}}!',
  htmlContent: `
    <h1>Welcome {{studentName}}!</h1>
    <p>We're excited to have you join {{schoolName}}.</p>
    <p>Your first class is scheduled for {{firstClassDate}}.</p>
  `,
  textContent: `
    Welcome {{studentName}}!
    We're excited to have you join {{schoolName}}.
    Your first class is scheduled for {{firstClassDate}}.
  `
};

emailService.addTemplate(customTemplate);
```

## User Preferences

### Setting Preferences

```typescript
import { getEmailNotificationService } from '@/lib/services';

const notificationService = getEmailNotificationService();

await notificationService.updateUserPreferences('user-123', {
  emailNotifications: true,
  bookingConfirmations: true,
  bookingReminders: true,
  scheduleChanges: true,
  conflictAlerts: true,
  systemAlerts: false,
  reminderTiming: 15 // 15 minutes before class
});
```

### UI Component

```tsx
import EmailPreferencesManager from '@/components/admin/email/EmailPreferencesManager';

<EmailPreferencesManager
  userId="user-123"
  userRole="student"
  onPreferencesUpdate={(prefs) => console.log('Updated:', prefs)}
/>
```

## Dashboard & Analytics

### Admin Dashboard

```tsx
import EmailManagementDashboard from '@/components/admin/email/EmailManagementDashboard';

<EmailManagementDashboard />
```

### Getting Metrics

```typescript
import { getEmailService } from '@/lib/services';

const emailService = getEmailService();
const metrics = await emailService.getEmailMetrics();

console.log('Delivery rate:', metrics.deliveryRate);
console.log('Bounce rate:', metrics.bounceRate);
console.log('Total sent:', metrics.totalSent);
```

## Development & Testing

### Test Mode

In development, the email service runs in test mode and logs emails to console instead of sending them:

```typescript
// Automatically enabled when NODE_ENV !== 'production'
const emailService = new EmailService({
  apiKey: 'test-key',
  domain: 'test.example.com',
  testMode: true
});
```

### Running Tests

```bash
# Run all email tests
npm test -- --testPathPatterns="email.*test"

# Run specific test file
npm test -- --testPathPatterns="email-service-simple.test"
```

### Mock Service

For testing without Mailgun dependencies:

```typescript
import { SimpleEmailService } from '@/lib/services/email-service-simple';

const mockEmailService = new SimpleEmailService({
  apiKey: 'test',
  domain: 'test.com',
  testMode: true
});
```

## Integration Examples

### Booking System Integration

```typescript
// In your booking service
async function createBooking(bookingData) {
  const booking = await database.createBooking(bookingData);
  
  // Automatically send confirmation email
  await schedulingEmailHooks.onBookingCreated({
    bookingId: booking.id,
    studentId: booking.studentId,
    teacherId: booking.teacherId,
    courseId: booking.courseId,
    classDateTime: booking.scheduledAt,
    duration: booking.duration,
    location: booking.location,
    isOnline: booking.isOnline,
    joinLink: booking.joinLink
  });
  
  return booking;
}
```

### Conflict Detection Integration

```typescript
// In your scheduling service
async function detectConflicts() {
  const conflicts = await findSchedulingConflicts();
  
  for (const conflict of conflicts) {
    await schedulingEmailHooks.onConflictDetected({
      conflictId: conflict.id,
      conflictType: conflict.type,
      conflictDateTime: conflict.dateTime,
      affectedBookings: conflict.bookings,
      recommendedResolution: conflict.resolution,
      severity: conflict.severity
    });
  }
}
```

## Monitoring & Maintenance

### Queue Health

```typescript
import { getEmailQueueService } from '@/lib/services';

const queueService = getEmailQueueService();
const stats = queueService.getQueueStats();

if (stats.failed > 10) {
  console.warn('High failure rate in email queue');
}
```

### Failed Email Recovery

```typescript
// Retry all failed emails
const failedJobs = queueService.getJobsByStatus('failed');
for (const job of failedJobs) {
  await queueService.retryJob(job.id);
}

// Clear old completed jobs
queueService.clearCompletedJobs();
```

## Security Considerations

1. **API Keys**: Store Mailgun API keys securely in environment variables
2. **Rate Limiting**: Queue system prevents API rate limit violations
3. **Data Privacy**: No sensitive user data stored in email logs
4. **Template Validation**: All template variables are sanitized
5. **Tracking**: Email tracking can be disabled per user preference

## Troubleshooting

### Common Issues

1. **Emails not sending**: Check Mailgun API key and domain configuration
2. **Queue not processing**: Ensure queue service is started
3. **Template errors**: Verify template variables match data provided
4. **High failure rate**: Check Mailgun account status and limits

### Debug Mode

```typescript
// Enable detailed logging
process.env.EMAIL_DEBUG = 'true';
```

### Support

For issues with the email system:
1. Check service logs for error messages
2. Verify Mailgun account status
3. Test with simplified email service
4. Review queue statistics in dashboard

## Future Enhancements

- **Rich Text Editor**: Visual template editing
- **A/B Testing**: Template performance comparison
- **Advanced Analytics**: Open rates, click tracking
- **SMS Integration**: Multi-channel notifications
- **Webhook Support**: Real-time delivery status updates
- **Template Versioning**: Track template changes over time