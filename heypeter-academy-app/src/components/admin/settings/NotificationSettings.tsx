'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Save, Mail, MessageSquare, Bell, Smartphone } from 'lucide-react';

interface NotificationChannel {
  id: string;
  type: 'email' | 'sms' | 'push' | 'in_app';
  name: string;
  enabled: boolean;
  events: {
    [key: string]: {
      enabled: boolean;
      template?: string;
    };
  };
}

const notificationEvents = {
  student: [
    { key: 'class_reminder', label: 'Class Reminder', description: '30 minutes before class' },
    { key: 'class_cancelled', label: 'Class Cancelled', description: 'When a class is cancelled' },
    { key: 'homework_assigned', label: 'Homework Assigned', description: 'New homework available' },
    { key: 'grade_posted', label: 'Grade Posted', description: 'New grade or feedback' },
  ],
  teacher: [
    { key: 'new_student', label: 'New Student Assigned', description: 'Student enrolled in class' },
    { key: 'class_reminder', label: 'Class Reminder', description: '1 hour before class' },
    { key: 'leave_request', label: 'Leave Request', description: 'Student requested leave' },
    { key: 'schedule_change', label: 'Schedule Change', description: 'Class time changed' },
  ],
  admin: [
    { key: 'new_registration', label: 'New Registration', description: 'New user registered' },
    { key: 'payment_received', label: 'Payment Received', description: 'Payment processed' },
    { key: 'system_alert', label: 'System Alert', description: 'System issues detected' },
    { key: 'backup_complete', label: 'Backup Complete', description: 'Backup finished' },
  ],
};

export function NotificationSettings() {
  const [channels, setChannels] = useState<NotificationChannel[]>([
    {
      id: '1',
      type: 'email',
      name: 'Email Notifications',
      enabled: true,
      events: Object.keys({
        ...notificationEvents.student,
        ...notificationEvents.teacher,
        ...notificationEvents.admin,
      }).reduce((acc, event) => {
        acc[event] = { enabled: true };
        return acc;
      }, {} as any),
    },
    {
      id: '2',
      type: 'sms',
      name: 'SMS Notifications',
      enabled: false,
      events: {
        class_reminder: { enabled: true },
        class_cancelled: { enabled: true },
      },
    },
    {
      id: '3',
      type: 'push',
      name: 'Push Notifications',
      enabled: true,
      events: {
        class_reminder: { enabled: true },
        homework_assigned: { enabled: true },
        grade_posted: { enabled: true },
      },
    },
    {
      id: '4',
      type: 'in_app',
      name: 'In-App Notifications',
      enabled: true,
      events: Object.keys({
        ...notificationEvents.student,
        ...notificationEvents.teacher,
        ...notificationEvents.admin,
      }).reduce((acc, event) => {
        acc[event] = { enabled: true };
        return acc;
      }, {} as any),
    },
  ]);

  const [emailSettings, setEmailSettings] = useState({
    smtp_host: 'smtp.mailgun.org',
    smtp_port: '587',
    smtp_username: 'postmaster@heypeter.com',
    smtp_password: '********',
    from_email: 'noreply@heypeter.com',
    from_name: 'HeyPeter Academy',
  });

  const channelIcons = {
    email: Mail,
    sms: MessageSquare,
    push: Smartphone,
    in_app: Bell,
  };

  const handleChannelToggle = (channelId: string) => {
    setChannels(prev => prev.map(channel => 
      channel.id === channelId ? { ...channel, enabled: !channel.enabled } : channel
    ));
  };

  const handleEventToggle = (channelId: string, eventKey: string) => {
    setChannels(prev => prev.map(channel => 
      channel.id === channelId 
        ? {
            ...channel,
            events: {
              ...channel.events,
              [eventKey]: {
                ...channel.events[eventKey],
                enabled: !channel.events[eventKey]?.enabled,
              },
            },
          }
        : channel
    ));
  };

  const handleSave = () => {
    toast({
      title: 'Settings saved',
      description: 'Notification settings have been updated',
    });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="channels" className="space-y-4">
        <TabsList>
          <TabsTrigger value="channels">Notification Channels</TabsTrigger>
          <TabsTrigger value="events">Event Settings</TabsTrigger>
          <TabsTrigger value="email">Email Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="channels" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Enable or disable notification channels
          </p>
          
          {channels.map((channel) => {
            const Icon = channelIcons[channel.type];
            return (
              <Card key={channel.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <h4 className="font-medium">{channel.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {Object.values(channel.events).filter(e => e.enabled).length} events enabled
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={channel.enabled}
                    onCheckedChange={() => handleChannelToggle(channel.id)}
                  />
                </div>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure which events trigger notifications
          </p>

          <Tabs defaultValue="student" className="space-y-4">
            <TabsList>
              <TabsTrigger value="student">Student Events</TabsTrigger>
              <TabsTrigger value="teacher">Teacher Events</TabsTrigger>
              <TabsTrigger value="admin">Admin Events</TabsTrigger>
            </TabsList>

            {Object.entries(notificationEvents).map(([role, events]) => (
              <TabsContent key={role} value={role} className="space-y-4">
                {events.map((event) => (
                  <Card key={event.key} className="p-4">
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium">{event.label}</h4>
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {channels.map((channel) => (
                          <div key={channel.id} className="flex items-center gap-2">
                            <Switch
                              checked={channel.events[event.key]?.enabled || false}
                              onCheckedChange={() => handleEventToggle(channel.id, event.key)}
                              disabled={!channel.enabled}
                            />
                            <Label className="text-sm">
                              {channel.type.toUpperCase()}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                ))}
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>

        <TabsContent value="email" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure email server settings
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="smtp-host">SMTP Host</Label>
                <Input
                  id="smtp-host"
                  value={emailSettings.smtp_host}
                  onChange={(e) => setEmailSettings({ ...emailSettings, smtp_host: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-port">SMTP Port</Label>
                <Input
                  id="smtp-port"
                  value={emailSettings.smtp_port}
                  onChange={(e) => setEmailSettings({ ...emailSettings, smtp_port: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-username">SMTP Username</Label>
                <Input
                  id="smtp-username"
                  value={emailSettings.smtp_username}
                  onChange={(e) => setEmailSettings({ ...emailSettings, smtp_username: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-password">SMTP Password</Label>
                <Input
                  id="smtp-password"
                  type="password"
                  value={emailSettings.smtp_password}
                  onChange={(e) => setEmailSettings({ ...emailSettings, smtp_password: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="from-email">From Email</Label>
                <Input
                  id="from-email"
                  type="email"
                  value={emailSettings.from_email}
                  onChange={(e) => setEmailSettings({ ...emailSettings, from_email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="from-name">From Name</Label>
                <Input
                  id="from-name"
                  value={emailSettings.from_name}
                  onChange={(e) => setEmailSettings({ ...emailSettings, from_name: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline">Test Connection</Button>
              <Button variant="outline">Send Test Email</Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}