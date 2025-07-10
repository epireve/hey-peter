"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Clock, 
  Plus, 
  Edit, 
  Trash2, 
  Mail, 
  Calendar, 
  FileText, 
  Play, 
  Pause, 
  Settings,
  AlertCircle,
  CheckCircle,
  X
} from "lucide-react";
import { analyticsExportService, ScheduledExportConfig, ExportFormat } from '@/lib/services/analytics-export-service';
import { format } from 'date-fns';

interface ScheduledExportManagerProps {
  onExportScheduled?: (config: ScheduledExportConfig) => void;
}

export function ScheduledExportManager({ onExportScheduled }: ScheduledExportManagerProps) {
  const [scheduledExports, setScheduledExports] = useState<ScheduledExportConfig[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingExport, setEditingExport] = useState<ScheduledExportConfig | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    frequency: 'daily' as 'daily' | 'weekly' | 'monthly',
    time: '09:00',
    dayOfWeek: 1,
    dayOfMonth: 1,
    exportType: 'student-analytics',
    format: 'excel' as ExportFormat,
    emailEnabled: false,
    emailRecipients: [] as string[],
    emailSubject: '',
    emailTemplate: '',
    storageEnabled: false,
    storagePath: '',
    retentionDays: 30,
    active: true
  });

  useEffect(() => {
    loadScheduledExports();
  }, []);

  const loadScheduledExports = () => {
    const exports = analyticsExportService.getAllScheduledExports();
    setScheduledExports(exports);
  };

  const handleCreateExport = () => {
    setFormData({
      name: '',
      description: '',
      frequency: 'daily',
      time: '09:00',
      dayOfWeek: 1,
      dayOfMonth: 1,
      exportType: 'student-analytics',
      format: 'excel',
      emailEnabled: false,
      emailRecipients: [],
      emailSubject: '',
      emailTemplate: '',
      storageEnabled: false,
      storagePath: '',
      retentionDays: 30,
      active: true
    });
    setEditingExport(null);
    setIsCreateDialogOpen(true);
  };

  const handleEditExport = (exportConfig: ScheduledExportConfig) => {
    setFormData({
      name: exportConfig.name,
      description: exportConfig.description,
      frequency: exportConfig.schedule.frequency,
      time: exportConfig.schedule.time,
      dayOfWeek: exportConfig.schedule.dayOfWeek || 1,
      dayOfMonth: exportConfig.schedule.dayOfMonth || 1,
      exportType: exportConfig.export.type,
      format: exportConfig.export.options.format,
      emailEnabled: exportConfig.delivery.email.enabled,
      emailRecipients: exportConfig.delivery.email.recipients,
      emailSubject: exportConfig.delivery.email.subject,
      emailTemplate: exportConfig.delivery.email.template || '',
      storageEnabled: exportConfig.delivery.storage?.enabled || false,
      storagePath: exportConfig.delivery.storage?.path || '',
      retentionDays: exportConfig.delivery.storage?.retention || 30,
      active: exportConfig.active
    });
    setEditingExport(exportConfig);
    setIsCreateDialogOpen(true);
  };

  const handleSaveExport = () => {
    const config: ScheduledExportConfig = {
      id: editingExport?.id || `scheduled-${Date.now()}`,
      name: formData.name,
      description: formData.description,
      schedule: {
        frequency: formData.frequency,
        time: formData.time,
        dayOfWeek: formData.frequency === 'weekly' ? formData.dayOfWeek : undefined,
        dayOfMonth: formData.frequency === 'monthly' ? formData.dayOfMonth : undefined
      },
      export: {
        type: formData.exportType,
        options: {
          format: formData.format,
          includeHeaders: true,
          includeMetadata: true
        }
      },
      delivery: {
        email: {
          enabled: formData.emailEnabled,
          recipients: formData.emailRecipients,
          subject: formData.emailSubject,
          template: formData.emailTemplate || undefined
        },
        storage: formData.storageEnabled ? {
          enabled: true,
          path: formData.storagePath,
          retention: formData.retentionDays
        } : undefined
      },
      active: formData.active,
      createdAt: editingExport?.createdAt || new Date(),
      updatedAt: new Date()
    };

    if (editingExport) {
      analyticsExportService.updateScheduledExport(config);
    } else {
      analyticsExportService.createScheduledExport(config);
    }

    loadScheduledExports();
    setIsCreateDialogOpen(false);
    onExportScheduled?.(config);
  };

  const handleToggleActive = (id: string) => {
    const exportConfig = scheduledExports.find(exp => exp.id === id);
    if (exportConfig) {
      const updated = { ...exportConfig, active: !exportConfig.active };
      analyticsExportService.updateScheduledExport(updated);
      loadScheduledExports();
    }
  };

  const handleDeleteExport = (id: string) => {
    analyticsExportService.deleteScheduledExport(id);
    loadScheduledExports();
  };

  const handleEmailRecipientAdd = (email: string) => {
    if (email && !formData.emailRecipients.includes(email)) {
      setFormData(prev => ({
        ...prev,
        emailRecipients: [...prev.emailRecipients, email]
      }));
    }
  };

  const handleEmailRecipientRemove = (email: string) => {
    setFormData(prev => ({
      ...prev,
      emailRecipients: prev.emailRecipients.filter(e => e !== email)
    }));
  };

  const getNextRunTime = (schedule: ScheduledExportConfig['schedule']) => {
    const now = new Date();
    const [hours, minutes] = schedule.time.split(':').map(Number);
    
    let nextRun = new Date(now);
    nextRun.setHours(hours, minutes, 0, 0);
    
    switch (schedule.frequency) {
      case 'daily':
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1);
        }
        break;
      case 'weekly':
        if (schedule.dayOfWeek) {
          nextRun.setDate(nextRun.getDate() + (schedule.dayOfWeek - nextRun.getDay() + 7) % 7);
          if (nextRun <= now) {
            nextRun.setDate(nextRun.getDate() + 7);
          }
        }
        break;
      case 'monthly':
        if (schedule.dayOfMonth) {
          nextRun.setDate(schedule.dayOfMonth);
          if (nextRun <= now) {
            nextRun.setMonth(nextRun.getMonth() + 1);
          }
        }
        break;
    }
    
    return nextRun;
  };

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'daily': return 'Daily';
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
      default: return frequency;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Scheduled Exports</h3>
          <p className="text-sm text-muted-foreground">
            Automate your analytics exports with custom schedules
          </p>
        </div>
        <Button onClick={handleCreateExport}>
          <Plus className="h-4 w-4 mr-2" />
          Schedule Export
        </Button>
      </div>

      <div className="grid gap-4">
        {scheduledExports.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h4 className="text-lg font-medium mb-2">No scheduled exports</h4>
                <p className="text-muted-foreground mb-4">
                  Create your first scheduled export to automate your reports
                </p>
                <Button onClick={handleCreateExport}>
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Export
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          scheduledExports.map(exportConfig => (
            <Card key={exportConfig.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base">{exportConfig.name}</CardTitle>
                    <CardDescription>{exportConfig.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={exportConfig.active}
                      onCheckedChange={() => handleToggleActive(exportConfig.id)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditExport(exportConfig)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteExport(exportConfig.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm font-medium mb-1">Schedule</div>
                    <div className="text-sm text-muted-foreground">
                      {getFrequencyLabel(exportConfig.schedule.frequency)} at {exportConfig.schedule.time}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-1">Next Run</div>
                    <div className="text-sm text-muted-foreground">
                      {format(getNextRunTime(exportConfig.schedule), 'MMM dd, yyyy HH:mm')}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-1">Format</div>
                    <Badge variant="outline">{exportConfig.export.options.format.toUpperCase()}</Badge>
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-1">Delivery</div>
                    <div className="flex gap-1">
                      {exportConfig.delivery.email.enabled && (
                        <Badge variant="secondary">
                          <Mail className="h-3 w-3 mr-1" />
                          Email
                        </Badge>
                      )}
                      {exportConfig.delivery.storage?.enabled && (
                        <Badge variant="secondary">
                          <FileText className="h-3 w-3 mr-1" />
                          Storage
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingExport ? 'Edit Scheduled Export' : 'Create Scheduled Export'}
            </DialogTitle>
            <DialogDescription>
              Configure automated export settings and delivery options
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="mt-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="delivery">Delivery</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Export name"
                  />
                </div>
                <div>
                  <Label htmlFor="exportType">Export Type</Label>
                  <Select
                    value={formData.exportType}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, exportType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select export type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student-analytics">Student Analytics</SelectItem>
                      <SelectItem value="teacher-analytics">Teacher Analytics</SelectItem>
                      <SelectItem value="financial-summary">Financial Summary</SelectItem>
                      <SelectItem value="attendance-report">Attendance Report</SelectItem>
                      <SelectItem value="performance-report">Performance Report</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Export description"
                />
              </div>

              <div>
                <Label htmlFor="format">Export Format</Label>
                <Select
                  value={formData.format}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, format: value as ExportFormat }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excel">Excel</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked as boolean }))}
                />
                <Label htmlFor="active">Active</Label>
              </div>
            </TabsContent>

            <TabsContent value="schedule" className="space-y-4">
              <div>
                <Label htmlFor="frequency">Frequency</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, frequency: value as 'daily' | 'weekly' | 'monthly' }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                />
              </div>

              {formData.frequency === 'weekly' && (
                <div>
                  <Label htmlFor="dayOfWeek">Day of Week</Label>
                  <Select
                    value={formData.dayOfWeek.toString()}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, dayOfWeek: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Sunday</SelectItem>
                      <SelectItem value="1">Monday</SelectItem>
                      <SelectItem value="2">Tuesday</SelectItem>
                      <SelectItem value="3">Wednesday</SelectItem>
                      <SelectItem value="4">Thursday</SelectItem>
                      <SelectItem value="5">Friday</SelectItem>
                      <SelectItem value="6">Saturday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.frequency === 'monthly' && (
                <div>
                  <Label htmlFor="dayOfMonth">Day of Month</Label>
                  <Input
                    id="dayOfMonth"
                    type="number"
                    min="1"
                    max="28"
                    value={formData.dayOfMonth}
                    onChange={(e) => setFormData(prev => ({ ...prev, dayOfMonth: parseInt(e.target.value) }))}
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="delivery" className="space-y-4">
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <Checkbox
                    id="emailEnabled"
                    checked={formData.emailEnabled}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, emailEnabled: checked as boolean }))}
                  />
                  <Label htmlFor="emailEnabled">Email Delivery</Label>
                </div>

                {formData.emailEnabled && (
                  <div className="space-y-4 pl-6">
                    <div>
                      <Label>Recipients</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.emailRecipients.map(email => (
                          <Badge key={email} variant="secondary" className="flex items-center gap-1">
                            {email}
                            <X 
                              className="h-3 w-3 cursor-pointer" 
                              onClick={() => handleEmailRecipientRemove(email)}
                            />
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Input
                          placeholder="Enter email address"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleEmailRecipientAdd(e.currentTarget.value);
                              e.currentTarget.value = '';
                            }
                          }}
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                            if (input?.value) {
                              handleEmailRecipientAdd(input.value);
                              input.value = '';
                            }
                          }}
                        >
                          Add
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="emailSubject">Subject</Label>
                      <Input
                        id="emailSubject"
                        value={formData.emailSubject}
                        onChange={(e) => setFormData(prev => ({ ...prev, emailSubject: e.target.value }))}
                        placeholder="Email subject"
                      />
                    </div>

                    <div>
                      <Label htmlFor="emailTemplate">Email Template</Label>
                      <textarea
                        id="emailTemplate"
                        value={formData.emailTemplate}
                        onChange={(e) => setFormData(prev => ({ ...prev, emailTemplate: e.target.value }))}
                        placeholder="Email template (optional)"
                        className="w-full min-h-[100px] p-3 border rounded-md"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <Checkbox
                    id="storageEnabled"
                    checked={formData.storageEnabled}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, storageEnabled: checked as boolean }))}
                  />
                  <Label htmlFor="storageEnabled">Storage Backup</Label>
                </div>

                {formData.storageEnabled && (
                  <div className="space-y-4 pl-6">
                    <div>
                      <Label htmlFor="storagePath">Storage Path</Label>
                      <Input
                        id="storagePath"
                        value={formData.storagePath}
                        onChange={(e) => setFormData(prev => ({ ...prev, storagePath: e.target.value }))}
                        placeholder="/exports/scheduled/"
                      />
                    </div>

                    <div>
                      <Label htmlFor="retentionDays">Retention (Days)</Label>
                      <Input
                        id="retentionDays"
                        type="number"
                        min="1"
                        max="365"
                        value={formData.retentionDays}
                        onChange={(e) => setFormData(prev => ({ ...prev, retentionDays: parseInt(e.target.value) }))}
                      />
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveExport}>
              {editingExport ? 'Update' : 'Create'} Scheduled Export
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}