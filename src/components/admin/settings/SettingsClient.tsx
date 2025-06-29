'use client';

import React, { useState } from 'react';
import { 
  Settings, 
  ToggleLeft, 
  Bell, 
  Database, 
  Shield, 
  Globe,
  Mail,
  Clock,
  Zap
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GeneralSettings } from './GeneralSettings';
import { FeatureFlags } from './FeatureFlags';
import { NotificationSettings } from './NotificationSettings';
import { MaintenanceSettings } from './MaintenanceSettings';
import { SecuritySettings } from './SecuritySettings';

const settingsTabs = [
  { 
    value: 'general', 
    label: 'General', 
    icon: Settings,
    description: 'Basic system configuration and preferences'
  },
  { 
    value: 'features', 
    label: 'Feature Flags', 
    icon: ToggleLeft,
    description: 'Enable or disable features across the platform'
  },
  { 
    value: 'notifications', 
    label: 'Notifications', 
    icon: Bell,
    description: 'Configure email, SMS, and push notifications'
  },
  { 
    value: 'maintenance', 
    label: 'Maintenance', 
    icon: Database,
    description: 'Schedule backups and maintenance windows'
  },
  { 
    value: 'security', 
    label: 'Security', 
    icon: Shield,
    description: 'Security settings and access controls'
  },
];

export function SettingsClient() {
  const [activeTab, setActiveTab] = useState('general');

  return (
    <div className="container mx-auto py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Settings</h1>
          <p className="text-muted-foreground">Configure and manage your academy settings</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Features</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">3 experimental</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notifications</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">channels configured</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Backup</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2h ago</div>
            <p className="text-xs text-muted-foreground">Next in 4 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Rate Limit</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1000</div>
            <p className="text-xs text-muted-foreground">requests/hour</p>
          </CardContent>
        </Card>
      </div>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full">
          {settingsTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-2">
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {settingsTabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <tab.icon className="h-5 w-5" />
                  <CardTitle>{tab.label}</CardTitle>
                </div>
                <CardDescription>{tab.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {tab.value === 'general' && <GeneralSettings />}
                {tab.value === 'features' && <FeatureFlags />}
                {tab.value === 'notifications' && <NotificationSettings />}
                {tab.value === 'maintenance' && <MaintenanceSettings />}
                {tab.value === 'security' && <SecuritySettings />}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}