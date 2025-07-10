'use client';

import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  FileJson, 
  Printer,
  LoaderIcon
} from 'lucide-react';
import { 
  attendanceAnalyticsService, 
  AttendanceFilters 
} from '@/lib/services/attendance-analytics-service';
// import { 
//   analyticsExportService, 
//   ExportFormat 
// } from '@/lib/services/analytics-export-service';
import { format } from 'date-fns';

interface AttendanceExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: AttendanceFilters;
}

export function AttendanceExportDialog({ open, onOpenChange, filters }: AttendanceExportDialogProps) {
  const [selectedReports, setSelectedReports] = useState<string[]>(['overview']);
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel' | 'json' | 'pdf'>('excel');
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);

  const reportOptions = [
    { 
      id: 'overview', 
      name: 'Statistical Overview', 
      description: 'Overall attendance statistics and metrics' 
    },
    { 
      id: 'records', 
      name: 'Detailed Records', 
      description: 'Complete attendance records with all details' 
    },
    { 
      id: 'classes', 
      name: 'Class Reports', 
      description: 'Attendance summary by class' 
    },
    { 
      id: 'teachers', 
      name: 'Teacher Reports', 
      description: 'Attendance summary by teacher' 
    },
    { 
      id: 'periods', 
      name: 'Period Reports', 
      description: 'Attendance summary by time period' 
    },
    { 
      id: 'trends', 
      name: 'Trend Analysis', 
      description: 'Attendance trends over time' 
    }
  ];

  const formatOptions = [
    { 
      value: 'excel' as const, 
      label: 'Excel (.xlsx)', 
      icon: FileSpreadsheet,
      description: 'Comprehensive report with multiple sheets'
    },
    { 
      value: 'csv' as const, 
      label: 'CSV (.csv)', 
      icon: FileText,
      description: 'Simple tabular data format'
    },
    { 
      value: 'json' as const, 
      label: 'JSON (.json)', 
      icon: FileJson,
      description: 'Structured data format'
    },
    { 
      value: 'pdf' as const, 
      label: 'PDF (.pdf)', 
      icon: Printer,
      description: 'Print-ready report format'
    }
  ];

  const handleReportToggle = (reportId: string) => {
    setSelectedReports(prev => 
      prev.includes(reportId) 
        ? prev.filter(id => id !== reportId)
        : [...prev, reportId]
    );
  };

  const generateFileName = () => {
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    const periodStr = filters.period || 'custom';
    return `attendance-report-${periodStr}-${dateStr}`;
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      
      const exportData: any = {
        metadata: {
          title: 'Attendance Report',
          generatedAt: new Date().toISOString(),
          filters: filters,
          reportTypes: selectedReports
        }
      };

      // Collect data for selected reports
      const promises = selectedReports.map(async (reportType) => {
        switch (reportType) {
          case 'overview':
            return {
              type: 'overview',
              data: await attendanceAnalyticsService.getAttendanceStats(filters)
            };
          case 'records':
            return {
              type: 'records',
              data: await attendanceAnalyticsService.getAttendanceRecords(filters)
            };
          case 'classes':
            return {
              type: 'classes',
              data: await attendanceAnalyticsService.getAttendanceByClass(filters)
            };
          case 'teachers':
            return {
              type: 'teachers',
              data: await attendanceAnalyticsService.getAttendanceByTeacher(filters)
            };
          case 'periods':
            return {
              type: 'periods',
              data: await attendanceAnalyticsService.getAttendanceByPeriod(filters)
            };
          case 'trends':
            return {
              type: 'trends',
              data: await attendanceAnalyticsService.getAttendanceTrends(filters)
            };
          default:
            return null;
        }
      });

      const results = await Promise.all(promises);
      const validResults = results.filter(r => r !== null);

      if (exportFormat === 'excel') {
        await exportToExcel(validResults);
      } else {
        // For other formats, combine all data
        const combinedData = validResults.reduce((acc, result) => {
          if (result) {
            acc[result.type] = result.data;
          }
          return acc;
        }, {} as any);

        // TODO: Implement export without external dependencies
        console.log('Export data:', combinedData);
        
        // Simple JSON download fallback
        const jsonString = JSON.stringify(combinedData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName || generateFileName()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async (results: any[]) => {
    const XLSX = await import('xlsx');
    const workbook = XLSX.utils.book_new();

    // Add metadata sheet
    const metadata = {
      'Report Title': 'Attendance Report',
      'Generated At': format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
      'Period': filters.period || 'Custom',
      'Date Range': filters.startDate && filters.endDate 
        ? `${format(filters.startDate, 'yyyy-MM-dd')} to ${format(filters.endDate, 'yyyy-MM-dd')}`
        : 'All time',
      'Teacher Filter': filters.teacherId || 'All teachers',
      'Class Filter': filters.classId || 'All classes',
      'Status Filter': filters.status || 'All statuses'
    };

    const metadataSheet = XLSX.utils.json_to_sheet(
      Object.entries(metadata).map(([key, value]) => ({ Property: key, Value: value }))
    );
    XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Report Info');

    // Add sheets for each report type
    results.forEach((result) => {
      if (result && result.data) {
        let sheetName = result.type.charAt(0).toUpperCase() + result.type.slice(1);
        let sheetData = result.data;

        // Transform data for Excel format
        if (result.type === 'overview') {
          sheetData = [
            { Metric: 'Total Sessions', Value: result.data.totalSessions },
            { Metric: 'Attendance Rate', Value: `${result.data.attendanceRate.toFixed(1)}%` },
            { Metric: 'Absenteeism Rate', Value: `${result.data.absenteeismRate.toFixed(1)}%` },
            { Metric: 'Present Sessions', Value: result.data.statusBreakdown.present },
            { Metric: 'Absent Sessions', Value: result.data.statusBreakdown.absent },
            { Metric: 'Late Sessions', Value: result.data.statusBreakdown.late },
            { Metric: 'Excused Sessions', Value: result.data.statusBreakdown.excused },
            { Metric: 'Total Hours Deducted', Value: result.data.totalHoursDeducted },
            { Metric: 'Unique Students', Value: result.data.uniqueStudents },
            { Metric: 'Unique Classes', Value: result.data.uniqueClasses },
            { Metric: 'Unique Teachers', Value: result.data.uniqueTeachers }
          ];
        } else if (result.type === 'records') {
          sheetData = result.data.map((record: any) => ({
            'Date': format(new Date(record.attendanceTime), 'yyyy-MM-dd'),
            'Time': format(new Date(record.attendanceTime), 'HH:mm'),
            'Student': record.student.fullName,
            'Student ID': record.student.studentId,
            'Class': record.class.className,
            'Course Type': record.class.courseType,
            'Teacher': record.teacher.fullName,
            'Status': record.status,
            'Hours Deducted': record.hoursDeducted,
            'Notes': record.notes || ''
          }));
        } else if (result.type === 'classes') {
          sheetData = result.data.map((cls: any) => ({
            'Class Name': cls.className,
            'Course Type': cls.courseType,
            'Teacher': cls.teacher.fullName,
            'Total Sessions': cls.totalSessions,
            'Attended Sessions': cls.attendedSessions,
            'Absent Sessions': cls.absentSessions,
            'Late Sessions': cls.lateSessions,
            'Excused Sessions': cls.excusedSessions,
            'Attendance Rate': `${cls.attendanceRate.toFixed(1)}%`,
            'Avg Hours Deducted': cls.averageHoursDeducted.toFixed(2),
            'Number of Students': cls.students.length
          }));
        } else if (result.type === 'teachers') {
          sheetData = result.data.map((teacher: any) => ({
            'Teacher Name': teacher.teacherName,
            'Email': teacher.email,
            'Total Classes': teacher.totalClasses,
            'Total Sessions': teacher.totalSessions,
            'Present Sessions': teacher.attendanceStats.present,
            'Absent Sessions': teacher.attendanceStats.absent,
            'Late Sessions': teacher.attendanceStats.late,
            'Excused Sessions': teacher.attendanceStats.excused,
            'Overall Attendance Rate': `${teacher.overallAttendanceRate.toFixed(1)}%`
          }));
        } else if (result.type === 'periods') {
          sheetData = result.data.map((period: any) => ({
            'Period': period.period,
            'Total Sessions': period.totalSessions,
            'Attended Sessions': period.attendedSessions,
            'Absent Sessions': period.absentSessions,
            'Late Sessions': period.lateSessions,
            'Excused Sessions': period.excusedSessions,
            'Attendance Rate': `${period.attendanceRate.toFixed(1)}%`,
            'Hours Deducted': period.hoursDeducted.toFixed(1),
            'Unique Students': period.uniqueStudents,
            'Unique Classes': period.uniqueClasses
          }));
        } else if (result.type === 'trends') {
          sheetData = result.data.map((trend: any) => ({
            'Date': trend.date,
            'Period': trend.period,
            'Total Sessions': trend.totalSessions,
            'Attended Sessions': trend.attendedSessions,
            'Absent Sessions': trend.absentSessions,
            'Late Sessions': trend.lateSessions,
            'Excused Sessions': trend.excusedSessions,
            'Attendance Rate': `${trend.attendanceRate.toFixed(1)}%`
          }));
        }

        const worksheet = XLSX.utils.json_to_sheet(sheetData);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      }
    });

    // Export the workbook
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName || generateFileName()}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export Attendance Reports</DialogTitle>
          <DialogDescription>
            Select the reports and format you want to export
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Report Selection */}
          <div>
            <Label className="text-base font-medium">Select Reports to Export</Label>
            <div className="mt-2 space-y-2">
              {reportOptions.map((report) => (
                <div key={report.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={report.id}
                    checked={selectedReports.includes(report.id)}
                    onCheckedChange={() => handleReportToggle(report.id)}
                  />
                  <div className="flex-1">
                    <Label htmlFor={report.id} className="font-medium cursor-pointer">
                      {report.name}
                    </Label>
                    <p className="text-sm text-muted-foreground">{report.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Export Format */}
          <div>
            <Label className="text-base font-medium">Export Format</Label>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {formatOptions.map((format) => (
                <Card 
                  key={format.value}
                  className={`cursor-pointer transition-colors ${
                    exportFormat === format.value ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setExportFormat(format.value)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <format.icon className="h-4 w-4" />
                      <span className="font-medium">{format.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{format.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* File Name */}
          <div>
            <Label htmlFor="fileName" className="text-base font-medium">
              File Name (optional)
            </Label>
            <Input
              id="fileName"
              placeholder={generateFileName()}
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Export Button */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleExport} 
              disabled={selectedReports.length === 0 || loading}
            >
              {loading ? (
                <>
                  <LoaderIcon className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export Reports
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}