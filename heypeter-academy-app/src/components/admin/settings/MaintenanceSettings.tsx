'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { 
  Save, 
  Database, 
  Calendar, 
  Clock, 
  AlertCircle,
  Play,
  Pause,
  History
} from 'lucide-react';
import { format } from 'date-fns';

interface MaintenanceTask {
  id: string;
  name: string;
  type: 'backup' | 'cleanup' | 'optimization';
  schedule: string;
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  duration?: number;
}

export function MaintenanceSettings() {
  const [tasks, setTasks] = useState<MaintenanceTask[]>([
    {
      id: '1',
      name: 'Database Backup',
      type: 'backup',
      schedule: '0 2 * * *', // Daily at 2 AM
      enabled: true,
      lastRun: new Date(Date.now() - 86400000).toISOString(),
      nextRun: new Date(Date.now() + 43200000).toISOString(),
      status: 'completed',
      duration: 245,
    },
    {
      id: '2',
      name: 'File Storage Backup',
      type: 'backup',
      schedule: '0 3 * * 0', // Weekly on Sunday at 3 AM
      enabled: true,
      lastRun: new Date(Date.now() - 432000000).toISOString(),
      nextRun: new Date(Date.now() + 172800000).toISOString(),
      status: 'completed',
      duration: 1820,
    },
    {
      id: '3',
      name: 'Clean Temporary Files',
      type: 'cleanup',
      schedule: '0 4 * * *', // Daily at 4 AM
      enabled: true,
      lastRun: new Date(Date.now() - 86400000).toISOString(),
      nextRun: new Date(Date.now() + 50400000).toISOString(),
      status: 'completed',
      duration: 45,
    },
    {
      id: '4',
      name: 'Optimize Database',
      type: 'optimization',
      schedule: '0 5 * * 1', // Weekly on Monday at 5 AM
      enabled: false,
      lastRun: new Date(Date.now() - 604800000).toISOString(),
      status: 'idle',
      duration: 380,
    },
  ]);

  const [backupSettings, setBackupSettings] = useState({
    retention_days: '30',
    storage_location: 's3',
    encryption_enabled: true,
    compression_enabled: true,
    notification_email: 'admin@heypeter.com',
  });

  const scheduleOptions = [
    { value: '0 * * * *', label: 'Every hour' },
    { value: '0 */6 * * *', label: 'Every 6 hours' },
    { value: '0 2 * * *', label: 'Daily at 2 AM' },
    { value: '0 3 * * 0', label: 'Weekly on Sunday at 3 AM' },
    { value: '0 4 1 * *', label: 'Monthly on the 1st at 4 AM' },
  ];

  const handleToggleTask = (taskId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, enabled: !task.enabled } : task
    ));
  };

  const handleRunTask = (taskId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, status: 'running' as const } : task
    ));
    
    // Simulate task completion
    setTimeout(() => {
      setTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { 
              ...task, 
              status: 'completed' as const, 
              lastRun: new Date().toISOString() 
            } 
          : task
      ));
      toast({
        title: 'Task completed',
        description: 'Maintenance task has been executed successfully',
      });
    }, 3000);
  };

  const handleSave = () => {
    toast({
      title: 'Settings saved',
      description: 'Maintenance settings have been updated',
    });
  };

  const getStatusColor = (status: MaintenanceTask['status']) => {
    switch (status) {
      case 'running': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getTypeIcon = (type: MaintenanceTask['type']) => {
    switch (type) {
      case 'backup': return Database;
      case 'cleanup': return History;
      case 'optimization': return AlertCircle;
    }
  };

  return (
    <div className="space-y-6">
      {/* Active Maintenance Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Automatic maintenance runs during low-traffic hours. You can also trigger tasks manually.
        </AlertDescription>
      </Alert>

      {/* Scheduled Tasks */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Scheduled Tasks</h3>
        
        {tasks.map((task) => {
          const TypeIcon = getTypeIcon(task.type);
          
          return (
            <Card key={task.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <TypeIcon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-base">{task.name}</CardTitle>
                      <CardDescription className="text-xs">
                        Schedule: {scheduleOptions.find(opt => opt.value === task.schedule)?.label || task.schedule}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(task.status)} variant="secondary">
                      {task.status}
                    </Badge>
                    <Switch
                      checked={task.enabled}
                      onCheckedChange={() => handleToggleTask(task.id)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Last Run</p>
                    <p className="font-medium">
                      {task.lastRun ? format(new Date(task.lastRun), 'MMM d, h:mm a') : 'Never'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Next Run</p>
                    <p className="font-medium">
                      {task.nextRun && task.enabled 
                        ? format(new Date(task.nextRun), 'MMM d, h:mm a') 
                        : 'Not scheduled'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Duration</p>
                    <p className="font-medium">
                      {task.duration ? `${Math.floor(task.duration / 60)}m ${task.duration % 60}s` : '-'}
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRunTask(task.id)}
                    disabled={task.status === 'running'}
                  >
                    {task.status === 'running' ? (
                      <>
                        <Pause className="mr-2 h-3 w-3" />
                        Running...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-3 w-3" />
                        Run Now
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Backup Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Backup Configuration</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="retention">Retention Period (days)</Label>
            <Input
              id="retention"
              type="number"
              value={backupSettings.retention_days}
              onChange={(e) => setBackupSettings({ ...backupSettings, retention_days: e.target.value })}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="storage">Storage Location</Label>
            <Select 
              value={backupSettings.storage_location} 
              onValueChange={(value) => setBackupSettings({ ...backupSettings, storage_location: value })}
            >
              <SelectTrigger id="storage">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local">Local Storage</SelectItem>
                <SelectItem value="s3">Amazon S3</SelectItem>
                <SelectItem value="gcs">Google Cloud Storage</SelectItem>
                <SelectItem value="azure">Azure Blob Storage</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notification">Notification Email</Label>
            <Input
              id="notification"
              type="email"
              value={backupSettings.notification_email}
              onChange={(e) => setBackupSettings({ ...backupSettings, notification_email: e.target.value })}
            />
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Encryption</Label>
              <p className="text-sm text-muted-foreground">
                Encrypt backup files at rest
              </p>
            </div>
            <Switch
              checked={backupSettings.encryption_enabled}
              onCheckedChange={(checked) => setBackupSettings({ ...backupSettings, encryption_enabled: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Compression</Label>
              <p className="text-sm text-muted-foreground">
                Compress backup files to save storage
              </p>
            </div>
            <Switch
              checked={backupSettings.compression_enabled}
              onCheckedChange={(checked) => setBackupSettings({ ...backupSettings, compression_enabled: checked })}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}