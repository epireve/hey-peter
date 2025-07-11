'use client';

import { logger } from '@/lib/services';

import React, { useState, useEffect } from 'react';
import { Bell, Mail, MessageSquare, Smartphone, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/components/ui/use-toast';
import { feedbackNotificationService } from '@/lib/services/feedback-notification-service';
import { FeedbackNotificationSettings as NotificationSettings } from '@/types/feedback';

interface FeedbackNotificationSettingsProps {
  userId: string;
  userRole: 'student' | 'teacher' | 'admin';
  className?: string;
}

const FeedbackNotificationSettings: React.FC<FeedbackNotificationSettingsProps> = ({
  userId,
  userRole,
  className
}) => {
  const [settings, setSettings] = useState<NotificationSettings>({
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
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [userId]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const userSettings = await feedbackNotificationService.getUserNotificationSettings(userId);
      setSettings(userSettings);
    } catch (error) {
      logger.error('Error loading notification settings:', error);
      toast({
        title: "Error",
        description: "Failed to load notification settings.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key: keyof NotificationSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await feedbackNotificationService.updateNotificationSettings(userId, settings);
      setHasChanges(false);
      toast({
        title: "Settings Saved",
        description: "Your notification preferences have been updated successfully.",
      });
    } catch (error) {
      logger.error('Error saving notification settings:', error);
      toast({
        title: "Error",
        description: "Failed to save notification settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    setSettings({
      user_id: userId,
      email_notifications: true,
      in_app_notifications: true,
      sms_notifications: false,
      immediate_feedback_alerts: true,
      weekly_summary: true,
      monthly_analytics: userRole === 'teacher' || userRole === 'admin',
      low_rating_threshold: 3.0,
      alert_on_negative_feedback: userRole === 'teacher' || userRole === 'admin',
      alert_on_improvement_needed: userRole === 'teacher' || userRole === 'admin'
    });
    setHasChanges(true);
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getSettingDescription = (key: string): string => {
    const descriptions: { [key: string]: string } = {
      email_notifications: "Receive notifications via email",
      in_app_notifications: "Show notifications in the application",
      sms_notifications: "Receive important alerts via SMS",
      immediate_feedback_alerts: "Get notified immediately when feedback is received",
      weekly_summary: "Receive a weekly summary of your feedback",
      monthly_analytics: "Receive monthly analytics and insights",
      alert_on_negative_feedback: "Get alerts for feedback that needs attention",
      alert_on_improvement_needed: "Receive alerts when improvement areas are identified"
    };

    return descriptions[key] || "";
  };

  const getRecommendedBadge = (key: string): boolean => {
    const recommended = ['email_notifications', 'in_app_notifications', 'immediate_feedback_alerts'];
    return recommended.includes(key);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Feedback Notification Settings
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Manage how and when you receive feedback-related notifications
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Notification Channels */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Notification Channels
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-blue-500" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Label className="text-base font-medium">Email Notifications</Label>
                    {getRecommendedBadge('email_notifications') && (
                      <Badge variant="secondary" className="text-xs">Recommended</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {getSettingDescription('email_notifications')}
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.email_notifications}
                onCheckedChange={(value) => handleSettingChange('email_notifications', value)}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-green-500" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Label className="text-base font-medium">In-App Notifications</Label>
                    {getRecommendedBadge('in_app_notifications') && (
                      <Badge variant="secondary" className="text-xs">Recommended</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {getSettingDescription('in_app_notifications')}
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.in_app_notifications}
                onCheckedChange={(value) => handleSettingChange('in_app_notifications', value)}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-purple-500" />
                <div className="space-y-1">
                  <Label className="text-base font-medium">SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    {getSettingDescription('sms_notifications')} (High priority only)
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.sms_notifications}
                onCheckedChange={(value) => handleSettingChange('sms_notifications', value)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Notification Frequency */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Notification Frequency
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Label className="text-base font-medium">Immediate Alerts</Label>
                  {getRecommendedBadge('immediate_feedback_alerts') && (
                    <Badge variant="secondary" className="text-xs">Recommended</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {getSettingDescription('immediate_feedback_alerts')}
                </p>
              </div>
              <Switch
                checked={settings.immediate_feedback_alerts}
                onCheckedChange={(value) => handleSettingChange('immediate_feedback_alerts', value)}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <Label className="text-base font-medium">Weekly Summary</Label>
                <p className="text-sm text-muted-foreground">
                  {getSettingDescription('weekly_summary')}
                </p>
              </div>
              <Switch
                checked={settings.weekly_summary}
                onCheckedChange={(value) => handleSettingChange('weekly_summary', value)}
              />
            </div>

            {(userRole === 'teacher' || userRole === 'admin') && (
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label className="text-base font-medium">Monthly Analytics</Label>
                  <p className="text-sm text-muted-foreground">
                    {getSettingDescription('monthly_analytics')}
                  </p>
                </div>
                <Switch
                  checked={settings.monthly_analytics}
                  onCheckedChange={(value) => handleSettingChange('monthly_analytics', value)}
                />
              </div>
            )}
          </div>
        </div>

        {(userRole === 'teacher' || userRole === 'admin') && (
          <>
            <Separator />

            {/* Alert Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Alert Settings
              </h3>
              
              <div className="space-y-4">
                <div className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-base font-medium">Low Rating Threshold</Label>
                      <p className="text-sm text-muted-foreground">
                        Get alerts when ratings fall below this threshold
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        max="5"
                        step="0.1"
                        value={settings.low_rating_threshold}
                        onChange={(e) => handleSettingChange('low_rating_threshold', parseFloat(e.target.value))}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">/5</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-base font-medium">Negative Feedback Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      {getSettingDescription('alert_on_negative_feedback')}
                    </p>
                  </div>
                  <Switch
                    checked={settings.alert_on_negative_feedback}
                    onCheckedChange={(value) => handleSettingChange('alert_on_negative_feedback', value)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-base font-medium">Improvement Needed Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      {getSettingDescription('alert_on_improvement_needed')}
                    </p>
                  </div>
                  <Switch
                    checked={settings.alert_on_improvement_needed}
                    onCheckedChange={(value) => handleSettingChange('alert_on_improvement_needed', value)}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Information Alert */}
        <Alert>
          <Bell className="h-4 w-4" />
          <AlertDescription>
            Your notification preferences apply to all feedback-related communications. 
            Critical system notifications will always be delivered regardless of these settings.
          </AlertDescription>
        </Alert>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4">
          <Button
            variant="outline"
            onClick={resetToDefaults}
            disabled={saving}
          >
            Reset to Defaults
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={loadSettings}
              disabled={saving || loading}
            >
              Cancel
            </Button>
            <Button
              onClick={saveSettings}
              disabled={!hasChanges || saving}
              className="min-w-[100px]"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </div>

        {hasChanges && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You have unsaved changes. Click "Save Changes" to apply your notification preferences.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default FeedbackNotificationSettings;