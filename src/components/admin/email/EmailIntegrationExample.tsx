"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Mail, 
  Send, 
  Calendar, 
  AlertTriangle, 
  CheckCircle,
  Clock 
} from 'lucide-react';

import { 
  schedulingEmailHooks,
  getEmailNotificationService,
  getEmailQueueService,
  NotificationTrigger
} from '@/lib/services';

/**
 * Example component demonstrating email integration with scheduling system
 * This shows how to use the email services with booking and scheduling events
 */
export default function EmailIntegrationExample() {
  const [results, setResults] = useState<Array<{
    type: string;
    message: string;
    status: 'success' | 'error';
    timestamp: Date;
  }>>([]);

  const addResult = (type: string, message: string, status: 'success' | 'error') => {
    setResults(prev => [...prev, { type, message, status, timestamp: new Date() }]);
  };

  // Example 1: Booking Creation
  const handleBookingCreated = async () => {
    try {
      const bookingData = {
        bookingId: 'booking-123',
        studentId: 'student-456',
        teacherId: 'teacher-789',
        courseId: 'course-english-basic',
        classDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        duration: 60,
        location: 'Room 101',
        isOnline: false
      };

      await schedulingEmailHooks.onBookingCreated(bookingData);
      addResult('Booking Created', 'Confirmation email queued successfully', 'success');
    } catch (error) {
      addResult('Booking Created', 'Failed to queue confirmation email', 'error');
    }
  };

  // Example 2: Schedule Change
  const handleScheduleChange = async () => {
    try {
      const changeData = {
        bookingId: 'booking-123',
        affectedUserId: 'student-456',
        originalDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        newDateTime: new Date(Date.now() + 48 * 60 * 60 * 1000),
        reason: 'Teacher availability conflict',
        courseId: 'course-english-basic'
      };

      await schedulingEmailHooks.onScheduleChange(changeData);
      addResult('Schedule Change', 'Change notification email queued successfully', 'success');
    } catch (error) {
      addResult('Schedule Change', 'Failed to queue change notification', 'error');
    }
  };

  // Example 3: Conflict Detection
  const handleConflictDetection = async () => {
    try {
      const conflictData = {
        conflictId: 'conflict-789',
        conflictType: 'teacher_double_booking' as const,
        conflictDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        affectedBookings: [
          {
            bookingId: 'booking-123',
            userId: 'student-456',
            userRole: 'student' as const,
            courseId: 'course-english-basic'
          },
          {
            bookingId: 'booking-124',
            userId: 'student-457',
            userRole: 'student' as const,
            courseId: 'course-english-advanced'
          }
        ],
        recommendedResolution: 'Reschedule one of the conflicting classes',
        severity: 'high' as const
      };

      await schedulingEmailHooks.onConflictDetected(conflictData);
      addResult('Conflict Detection', 'Conflict alert emails queued successfully', 'success');
    } catch (error) {
      addResult('Conflict Detection', 'Failed to queue conflict alerts', 'error');
    }
  };

  // Example 4: Teacher Availability Change
  const handleTeacherAvailabilityChange = async () => {
    try {
      const availabilityData = {
        teacherId: 'teacher-789',
        changedSlots: [
          {
            date: new Date(Date.now() + 24 * 60 * 60 * 1000),
            startTime: '10:00',
            endTime: '11:00',
            oldStatus: 'available' as const,
            newStatus: 'unavailable' as const
          }
        ],
        affectedBookings: [
          {
            bookingId: 'booking-123',
            studentId: 'student-456',
            classDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000)
          }
        ]
      };

      await schedulingEmailHooks.onTeacherAvailabilityChange(availabilityData);
      addResult('Teacher Availability', 'Availability change notifications queued successfully', 'success');
    } catch (error) {
      addResult('Teacher Availability', 'Failed to queue availability notifications', 'error');
    }
  };

  // Example 5: Schedule Class Reminders
  const handleScheduleReminders = async () => {
    try {
      const reminderData = {
        bookingId: 'booking-123',
        studentId: 'student-456',
        teacherId: 'teacher-789',
        courseId: 'course-english-basic',
        classDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        joinLink: 'https://zoom.us/j/123456789',
        reminderMinutes: [15, 60] // 15 minutes and 1 hour before class
      };

      await schedulingEmailHooks.scheduleReminders(reminderData);
      addResult('Class Reminders', 'Reminder emails scheduled successfully', 'success');
    } catch (error) {
      addResult('Class Reminders', 'Failed to schedule reminder emails', 'error');
    }
  };

  // Example 6: Direct Notification Service Usage
  const handleDirectNotification = async () => {
    try {
      const notificationService = getEmailNotificationService();
      
      const jobIds = await notificationService.triggerNotification(
        NotificationTrigger.BOOKING_CREATED,
        {
          bookingId: 'booking-direct-123',
          studentId: 'student-456',
          studentName: 'John Doe',
          studentEmail: 'john.doe@example.com',
          teacherId: 'teacher-789',
          teacherName: 'Jane Smith',
          courseName: 'English Basic',
          classDate: 'Monday, January 15, 2024',
          classTime: '10:00 AM',
          location: 'Room 101',
          duration: 60
        }
      );

      addResult('Direct Notification', `${jobIds.length} notifications queued successfully`, 'success');
    } catch (error) {
      addResult('Direct Notification', 'Failed to trigger notification', 'error');
    }
  };

  // Example 7: Queue Status Check
  const handleQueueStatus = async () => {
    try {
      const queueService = getEmailQueueService();
      const stats = queueService.getQueueStats();
      
      addResult('Queue Status', 
        `Queue: ${stats.total} total, ${stats.pending} pending, ${stats.completed} completed, ${stats.failed} failed`, 
        'success'
      );
    } catch (error) {
      addResult('Queue Status', 'Failed to get queue status', 'error');
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Integration Examples
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            This component demonstrates how to integrate email notifications with the scheduling system.
            Each button below triggers different types of email notifications.
          </p>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              These are demonstration examples. In production, these would be triggered automatically 
              by actual booking and scheduling events, not manual button clicks.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button 
              onClick={handleBookingCreated}
              className="flex items-center gap-2 h-auto p-4"
            >
              <Calendar className="h-4 w-4" />
              <div className="text-left">
                <div className="font-medium">Booking Created</div>
                <div className="text-xs opacity-80">Send confirmation email</div>
              </div>
            </Button>

            <Button 
              onClick={handleScheduleChange}
              className="flex items-center gap-2 h-auto p-4"
              variant="outline"
            >
              <Clock className="h-4 w-4" />
              <div className="text-left">
                <div className="font-medium">Schedule Change</div>
                <div className="text-xs opacity-80">Notify affected users</div>
              </div>
            </Button>

            <Button 
              onClick={handleConflictDetection}
              className="flex items-center gap-2 h-auto p-4"
              variant="destructive"
            >
              <AlertTriangle className="h-4 w-4" />
              <div className="text-left">
                <div className="font-medium">Conflict Alert</div>
                <div className="text-xs opacity-80">Send conflict notifications</div>
              </div>
            </Button>

            <Button 
              onClick={handleTeacherAvailabilityChange}
              className="flex items-center gap-2 h-auto p-4"
              variant="secondary"
            >
              <Send className="h-4 w-4" />
              <div className="text-left">
                <div className="font-medium">Availability Change</div>
                <div className="text-xs opacity-80">Teacher unavailable</div>
              </div>
            </Button>

            <Button 
              onClick={handleScheduleReminders}
              className="flex items-center gap-2 h-auto p-4"
              variant="outline"
            >
              <Clock className="h-4 w-4" />
              <div className="text-left">
                <div className="font-medium">Schedule Reminders</div>
                <div className="text-xs opacity-80">Class starting soon</div>
              </div>
            </Button>

            <Button 
              onClick={handleDirectNotification}
              className="flex items-center gap-2 h-auto p-4"
              variant="secondary"
            >
              <Mail className="h-4 w-4" />
              <div className="text-left">
                <div className="font-medium">Direct Notification</div>
                <div className="text-xs opacity-80">Use service directly</div>
              </div>
            </Button>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={handleQueueStatus} variant="outline" size="sm">
              Check Queue Status
            </Button>
            <Button onClick={clearResults} variant="outline" size="sm">
              Clear Results
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Display */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {results.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant={result.status === 'success' ? 'default' : 'destructive'}>
                      {result.type}
                    </Badge>
                    <span className="text-sm">{result.message}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {result.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Integration Code Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Code Examples</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">1. Automatic Email on Booking Creation</h4>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
{`// In your booking service
import { schedulingEmailHooks } from '@/lib/services';

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
}`}
              </pre>
            </div>

            <div>
              <h4 className="font-medium mb-2">2. Direct Notification Service Usage</h4>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
{`// For custom notification scenarios
import { getEmailNotificationService, NotificationTrigger } from '@/lib/services';

const notificationService = getEmailNotificationService();

await notificationService.triggerNotification(
  NotificationTrigger.BOOKING_CREATED,
  notificationData
);`}
              </pre>
            </div>

            <div>
              <h4 className="font-medium mb-2">3. Queue Management</h4>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
{`// Monitor and manage email queue
import { getEmailQueueService } from '@/lib/services';

const queueService = getEmailQueueService();

// Get queue statistics
const stats = queueService.getQueueStats();

// Retry failed jobs
await queueService.retryJob(jobId);

// Clear completed jobs
queueService.clearCompletedJobs();`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}