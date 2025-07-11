"use client";

import { logger } from '@/lib/services';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Download, 
  Package, 
  Clock, 
  FileText, 
  BarChart3, 
  Users, 
  GraduationCap, 
  DollarSign,
  Calendar,
  Settings,
  TrendingUp,
  Activity,
  AlertCircle
} from "lucide-react";
import { ExportDialog } from './ExportDialog';
import { BatchExportDialog } from './BatchExportDialog';
import { ScheduledExportManager } from './ScheduledExportManager';
import { ExportTemplateManager } from './ExportTemplateManager';
import { analyticsExportService } from '@/lib/services/analytics-export-service';
import { format } from 'date-fns';

interface ExportDashboardProps {
  studentData?: any[];
  teacherData?: any[];
  financialData?: any[];
  attendanceData?: any[];
  performanceData?: any[];
}

export function ExportDashboard({ 
  studentData = [], 
  teacherData = [], 
  financialData = [], 
  attendanceData = [], 
  performanceData = [] 
}: ExportDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [batchExportDialogOpen, setBatchExportDialogOpen] = useState(false);
  const [selectedExportType, setSelectedExportType] = useState<string>('');
  const [selectedData, setSelectedData] = useState<any[]>([]);
  const [exportStats, setExportStats] = useState({
    totalExports: 0,
    scheduledExports: 0,
    templatesCreated: 0,
    lastExportDate: null as Date | null
  });

  const availableExports = [
    {
      id: 'student-analytics',
      name: 'Student Analytics',
      type: 'student-analytics',
      description: 'Comprehensive student performance and engagement data',
      data: studentData,
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      id: 'teacher-analytics',
      name: 'Teacher Analytics',
      type: 'teacher-analytics',
      description: 'Teacher performance and class management statistics',
      data: teacherData,
      icon: GraduationCap,
      color: 'bg-green-500'
    },
    {
      id: 'financial-summary',
      name: 'Financial Summary',
      type: 'financial-summary',
      description: 'Revenue, expenses, and financial performance metrics',
      data: financialData,
      icon: DollarSign,
      color: 'bg-yellow-500'
    },
    {
      id: 'attendance-report',
      name: 'Attendance Report',
      type: 'attendance-report',
      description: 'Student attendance patterns and trends',
      data: attendanceData,
      icon: Calendar,
      color: 'bg-purple-500'
    },
    {
      id: 'performance-report',
      name: 'Performance Report',
      type: 'performance-report',
      description: 'Academic performance and assessment results',
      data: performanceData,
      icon: BarChart3,
      color: 'bg-red-500'
    }
  ];

  useEffect(() => {
    loadExportStats();
  }, []);

  const loadExportStats = () => {
    const scheduledExports = analyticsExportService.getAllScheduledExports();
    const templates = analyticsExportService.getAllTemplates();
    
    setExportStats({
      totalExports: 0, // This would come from actual tracking
      scheduledExports: scheduledExports.length,
      templatesCreated: templates.length,
      lastExportDate: null // This would come from actual tracking
    });
  };

  const handleQuickExport = (exportType: string, data: any[]) => {
    setSelectedExportType(exportType);
    setSelectedData(data);
    setExportDialogOpen(true);
  };

  const handleBatchExport = () => {
    setBatchExportDialogOpen(true);
  };

  const handleExportComplete = (success: boolean, message?: string) => {
    if (success) {
      setExportStats(prev => ({
        ...prev,
        totalExports: prev.totalExports + 1,
        lastExportDate: new Date()
      }));
    }
    
    // Show toast notification
    logger.info(success ? 'Export completed successfully' : 'Export failed', message);
  };

  const getTotalRecords = () => {
    return availableExports.reduce((total, exp) => total + exp.data.length, 0);
  };

  const getAvailableColumns = (data: any[]) => {
    if (data.length === 0) return [];
    return Object.keys(data[0]);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Export Dashboard</h2>
          <p className="text-muted-foreground">
            Export your analytics data in multiple formats with advanced customization
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleBatchExport}>
            <Package className="h-4 w-4 mr-2" />
            Batch Export
          </Button>
          <Button onClick={() => setExportDialogOpen(true)}>
            <Download className="h-4 w-4 mr-2" />
            Quick Export
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="quick-export">Quick Export</TabsTrigger>
          <TabsTrigger value="batch-export">Batch Export</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Export Statistics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Exports</CardTitle>
                <Download className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{exportStats.totalExports}</div>
                <p className="text-xs text-muted-foreground">
                  All time exports
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Scheduled Exports</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{exportStats.scheduledExports}</div>
                <p className="text-xs text-muted-foreground">
                  Active schedules
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Templates</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{exportStats.templatesCreated}</div>
                <p className="text-xs text-muted-foreground">
                  Custom templates
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Available Records</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{getTotalRecords()}</div>
                <p className="text-xs text-muted-foreground">
                  Ready to export
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Available Data Sources */}
          <Card>
            <CardHeader>
              <CardTitle>Available Data Sources</CardTitle>
              <CardDescription>
                Data sets ready for export with current record counts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {availableExports.map(exportItem => {
                  const Icon = exportItem.icon;
                  
                  return (
                    <div
                      key={exportItem.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-md ${exportItem.color}`}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <div className="font-medium">{exportItem.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {exportItem.data.length} records
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickExport(exportItem.type, exportItem.data)}
                        disabled={exportItem.data.length === 0}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Export Activity</CardTitle>
              <CardDescription>
                Latest export operations and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {exportStats.lastExportDate ? (
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-full">
                        <Download className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <div className="font-medium">Export completed</div>
                        <div className="text-sm text-muted-foreground">
                          {format(exportStats.lastExportDate, 'MMM dd, yyyy HH:mm')}
                        </div>
                      </div>
                    </div>
                    <Badge variant="default">Success</Badge>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No recent export activity</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quick-export" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Export</CardTitle>
              <CardDescription>
                Select a data source and export format for immediate download
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {availableExports.map(exportItem => {
                  const Icon = exportItem.icon;
                  
                  return (
                    <Card key={exportItem.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-md ${exportItem.color}`}>
                            <Icon className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{exportItem.name}</CardTitle>
                            <CardDescription className="text-sm">
                              {exportItem.data.length} records
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          {exportItem.description}
                        </p>
                        <Button
                          className="w-full"
                          onClick={() => handleQuickExport(exportItem.type, exportItem.data)}
                          disabled={exportItem.data.length === 0}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export Now
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batch-export" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Batch Export</CardTitle>
              <CardDescription>
                Select multiple data sources to export together
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h4 className="text-lg font-medium mb-2">Batch Export Multiple Reports</h4>
                <p className="text-muted-foreground mb-6">
                  Select multiple data sources and export them as separate files or combine into one
                </p>
                <Button onClick={handleBatchExport} size="lg">
                  <Package className="h-5 w-5 mr-2" />
                  Start Batch Export
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-6">
          <ScheduledExportManager onExportScheduled={loadExportStats} />
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <ExportTemplateManager onTemplateCreated={loadExportStats} />
        </TabsContent>
      </Tabs>

      {/* Export Dialog */}
      <ExportDialog
        isOpen={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        data={selectedData}
        defaultTitle={selectedExportType}
        availableColumns={getAvailableColumns(selectedData)}
        onExportComplete={handleExportComplete}
      />

      {/* Batch Export Dialog */}
      <BatchExportDialog
        isOpen={batchExportDialogOpen}
        onClose={() => setBatchExportDialogOpen(false)}
        availableExports={availableExports}
        onExportComplete={handleExportComplete}
      />
    </div>
  );
}