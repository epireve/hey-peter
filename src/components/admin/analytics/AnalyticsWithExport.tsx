"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExportButton, ExportDashboard } from '@/components/admin/export';
import { EnhancedStudentAnalytics } from '@/components/admin/dashboard/analytics/EnhancedStudentAnalytics';
import { 
  BarChart3, 
  Download, 
  Settings, 
  Users, 
  GraduationCap,
  DollarSign
} from "lucide-react";

interface AnalyticsWithExportProps {
  studentData?: any[];
  teacherData?: any[];
  financialData?: any[];
}

export function AnalyticsWithExport({ 
  studentData = [], 
  teacherData = [], 
  financialData = [] 
}: AnalyticsWithExportProps) {
  const [activeTab, setActiveTab] = useState('analytics');
  const [exportMessage, setExportMessage] = useState<string>('');

  const handleExportComplete = (success: boolean, message?: string) => {
    setExportMessage(message || (success ? 'Export completed successfully' : 'Export failed'));
    setTimeout(() => setExportMessage(''), 5000);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            Comprehensive analytics with advanced export capabilities
          </p>
        </div>
        <div className="flex items-center gap-2">
          {exportMessage && (
            <div className="text-sm text-green-600 bg-green-50 px-3 py-1 rounded">
              {exportMessage}
            </div>
          )}
          <ExportButton
            data={studentData}
            title="Student Analytics"
            onExportComplete={handleExportComplete}
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="export">Export Center</TabsTrigger>
          <TabsTrigger value="quick-actions">Quick Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6">
          <EnhancedStudentAnalytics />
        </TabsContent>

        <TabsContent value="export" className="space-y-6">
          <ExportDashboard
            studentData={studentData}
            teacherData={teacherData}
            financialData={financialData}
          />
        </TabsContent>

        <TabsContent value="quick-actions" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Student Reports
                </CardTitle>
                <CardDescription>
                  Export comprehensive student performance data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ExportButton
                  data={studentData}
                  title="Student Performance Report"
                  fileName="student-performance"
                  variant="outline"
                  size="sm"
                  showDropdown={false}
                  onExportComplete={handleExportComplete}
                />
                <ExportButton
                  data={studentData.filter(s => s.attendance < 80)}
                  title="At-Risk Students"
                  fileName="at-risk-students"
                  variant="outline"
                  size="sm"
                  showDropdown={false}
                  onExportComplete={handleExportComplete}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Teacher Reports
                </CardTitle>
                <CardDescription>
                  Export teacher performance and analytics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ExportButton
                  data={teacherData}
                  title="Teacher Performance Report"
                  fileName="teacher-performance"
                  variant="outline"
                  size="sm"
                  showDropdown={false}
                  onExportComplete={handleExportComplete}
                />
                <ExportButton
                  data={teacherData.filter(t => t.rating > 4.5)}
                  title="Top Performers"
                  fileName="top-performing-teachers"
                  variant="outline"
                  size="sm"
                  showDropdown={false}
                  onExportComplete={handleExportComplete}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Financial Reports
                </CardTitle>
                <CardDescription>
                  Export financial analytics and summaries
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ExportButton
                  data={financialData}
                  title="Financial Summary"
                  fileName="financial-summary"
                  variant="outline"
                  size="sm"
                  showDropdown={false}
                  onExportComplete={handleExportComplete}
                />
                <ExportButton
                  data={financialData.filter(f => f.profit > 0)}
                  title="Profitable Periods"
                  fileName="profitable-periods"
                  variant="outline"
                  size="sm"
                  showDropdown={false}
                  onExportComplete={handleExportComplete}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Export Features</CardTitle>
              <CardDescription>
                Comprehensive export capabilities for all your analytics needs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <h4 className="font-medium">Supported Formats</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Excel (.xlsx) with formatting</li>
                    <li>• CSV for data analysis</li>
                    <li>• JSON for API integration</li>
                    <li>• PDF for sharing and printing</li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium">Advanced Features</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Custom templates and styling</li>
                    <li>• Scheduled automated exports</li>
                    <li>• Batch export capabilities</li>
                    <li>• Email delivery integration</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}