"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Settings, 
  Mail, 
  Bell, 
  Clock, 
  AlertCircle, 
  Save,
  User,
  Calendar,
  MessageCircle
} from 'lucide-react';
import { NotificationPreferences, getEmailNotificationService } from '@/lib/services/email-notification-service';

interface EmailPreferencesManagerProps {
  userId: string;
  userRole: 'student' | 'teacher' | 'admin';
  onPreferencesUpdate?: (preferences: NotificationPreferences) => void;
}

export default function EmailPreferencesManager({ 
  userId, 
  userRole, 
  onPreferencesUpdate 
}: EmailPreferencesManagerProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const emailNotificationService = getEmailNotificationService();

  // Load user preferences
  useEffect(() => {
    loadPreferences();
  }, [userId]);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const userPrefs = await emailNotificationService.getUserPreferences(userId);
      setPreferences(userPrefs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const handlePreferenceChange = (key: keyof NotificationPreferences, value: any) => {
    if (!preferences) return;
    
    setPreferences(prev => ({
      ...prev!,
      [key]: value
    }));
  };

  const handleSave = async () => {
    if (!preferences) return;
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      await emailNotificationService.updateUserPreferences(userId, preferences);
      setSuccess('Preferences updated successfully');
      onPreferencesUpdate?.(preferences);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    loadPreferences();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Email Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!preferences) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Email Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load email preferences. Please try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Email Preferences
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Manage your email notification preferences
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* General Email Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold">General Settings</h3>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive email notifications for important updates
              </p>
            </div>
            <Switch
              checked={preferences.emailNotifications}
              onCheckedChange={(checked) => handlePreferenceChange('emailNotifications', checked)}
            />
          </div>
        </div>

        <Separator />

        {/* Booking Notifications */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold">Booking Notifications</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Booking Confirmations</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when bookings are confirmed or cancelled
                </p>
              </div>
              <Switch
                checked={preferences.bookingConfirmations}
                onCheckedChange={(checked) => handlePreferenceChange('bookingConfirmations', checked)}
                disabled={!preferences.emailNotifications}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Class Reminders</Label>
                <p className="text-sm text-muted-foreground">
                  Receive reminders before your classes start
                </p>
              </div>
              <Switch
                checked={preferences.bookingReminders}
                onCheckedChange={(checked) => handlePreferenceChange('bookingReminders', checked)}
                disabled={!preferences.emailNotifications}
              />
            </div>

            {preferences.bookingReminders && (
              <div className="ml-4 space-y-2">
                <Label className="text-sm">Reminder Timing</Label>
                <Select
                  value={preferences.reminderTiming.toString()}
                  onValueChange={(value) => handlePreferenceChange('reminderTiming', parseInt(value))}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 minutes before</SelectItem>
                    <SelectItem value="10">10 minutes before</SelectItem>
                    <SelectItem value="15">15 minutes before</SelectItem>
                    <SelectItem value="30">30 minutes before</SelectItem>
                    <SelectItem value="60">1 hour before</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Schedule Notifications */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-600" />
            <h3 className="text-lg font-semibold">Schedule Notifications</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Schedule Changes</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when class schedules are modified
                </p>
              </div>
              <Switch
                checked={preferences.scheduleChanges}
                onCheckedChange={(checked) => handlePreferenceChange('scheduleChanges', checked)}
                disabled={!preferences.emailNotifications}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Conflict Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Receive alerts when scheduling conflicts are detected
                </p>
              </div>
              <Switch
                checked={preferences.conflictAlerts}
                onCheckedChange={(checked) => handlePreferenceChange('conflictAlerts', checked)}
                disabled={!preferences.emailNotifications}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* System Notifications */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-semibold">System Notifications</h3>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">System Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Important system updates and maintenance notifications
              </p>
            </div>
            <Switch
              checked={preferences.systemAlerts}
              onCheckedChange={(checked) => handlePreferenceChange('systemAlerts', checked)}
              disabled={!preferences.emailNotifications}
            />
          </div>
        </div>

        <Separator />

        {/* Role-specific Settings */}
        {userRole === 'teacher' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-indigo-600" />
              <h3 className="text-lg font-semibold">Teacher Settings</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Student Booking Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when students book your classes
                  </p>
                </div>
                <Switch
                  checked={preferences.bookingConfirmations}
                  onCheckedChange={(checked) => handlePreferenceChange('bookingConfirmations', checked)}
                  disabled={!preferences.emailNotifications}
                />
              </div>
            </div>
          </div>
        )}

        {userRole === 'admin' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-red-600" />
              <h3 className="text-lg font-semibold">Admin Settings</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">All System Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive all system notifications and alerts
                  </p>
                </div>
                <Switch
                  checked={preferences.systemAlerts}
                  onCheckedChange={(checked) => handlePreferenceChange('systemAlerts', checked)}
                  disabled={!preferences.emailNotifications}
                />
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={saving}
          >
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Preferences
          </Button>
        </div>

        {/* Preferences Summary */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">Current Settings Summary</h4>
          <div className="flex flex-wrap gap-2">
            <Badge variant={preferences.emailNotifications ? "default" : "secondary"}>
              Email: {preferences.emailNotifications ? "ON" : "OFF"}
            </Badge>
            <Badge variant={preferences.bookingConfirmations ? "default" : "secondary"}>
              Bookings: {preferences.bookingConfirmations ? "ON" : "OFF"}
            </Badge>
            <Badge variant={preferences.bookingReminders ? "default" : "secondary"}>
              Reminders: {preferences.bookingReminders ? "ON" : "OFF"}
            </Badge>
            <Badge variant={preferences.scheduleChanges ? "default" : "secondary"}>
              Schedule: {preferences.scheduleChanges ? "ON" : "OFF"}
            </Badge>
            <Badge variant={preferences.conflictAlerts ? "default" : "secondary"}>
              Conflicts: {preferences.conflictAlerts ? "ON" : "OFF"}
            </Badge>
            <Badge variant={preferences.systemAlerts ? "default" : "secondary"}>
              System: {preferences.systemAlerts ? "ON" : "OFF"}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}