"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Download, FileText, Table, BarChart, Mail, Calendar } from "lucide-react";

interface ExportSettings {
  format: "csv" | "excel" | "pdf";
  sections: string[];
  dateRange: "week" | "month" | "quarter" | "year" | "custom";
  includeCharts: boolean;
  includeRawData: boolean;
  emailRecipients: string;
  scheduleFrequency: "none" | "daily" | "weekly" | "monthly";
  customNotes: string;
}

interface AnalyticsExportProps {
  onExport: (settings: ExportSettings) => void;
  availableSections?: string[];
  className?: string;
}

const DEFAULT_SECTIONS = [
  "overview",
  "students",
  "teachers", 
  "courses",
  "financial",
  "operations"
];

const SECTION_LABELS = {
  overview: "Overview & KPIs",
  students: "Student Analytics",
  teachers: "Teacher Performance",
  courses: "Course Analytics",
  financial: "Financial Reports",
  operations: "Operations Metrics"
};

export function AnalyticsExport({ 
  onExport, 
  availableSections = DEFAULT_SECTIONS,
  className 
}: AnalyticsExportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [settings, setSettings] = useState<ExportSettings>({
    format: "excel",
    sections: ["overview"],
    dateRange: "month",
    includeCharts: true,
    includeRawData: false,
    emailRecipients: "",
    scheduleFrequency: "none",
    customNotes: ""
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Simple export implementation without external dependencies
      const exportData = {
        format: settings.format,
        sections: settings.sections,
        dateRange: settings.dateRange,
        timestamp: new Date().toISOString(),
        customNotes: settings.customNotes
      };
      
      // Create a simple JSON download
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      await onExport(settings);
      setIsOpen(false);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSectionChange = (section: string, checked: boolean) => {
    setSettings(prev => ({
      ...prev,
      sections: checked 
        ? [...prev.sections, section]
        : prev.sections.filter(s => s !== section)
    }));
  };

  const formatIcons = {
    csv: Table,
    excel: FileText,
    pdf: BarChart
  };

  const FormatIcon = formatIcons[settings.format];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={className}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export Analytics Report</DialogTitle>
          <DialogDescription>
            Configure your analytics export settings and download options
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Format */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Export Format</Label>
            <RadioGroup
              value={settings.format}
              onValueChange={(value: "csv" | "excel" | "pdf") => 
                setSettings(prev => ({ ...prev, format: value }))
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="flex items-center space-x-2 cursor-pointer">
                  <Table className="h-4 w-4" />
                  <span>CSV</span>
                  <Badge variant="secondary">Raw Data</Badge>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="excel" id="excel" />
                <Label htmlFor="excel" className="flex items-center space-x-2 cursor-pointer">
                  <FileText className="h-4 w-4" />
                  <span>Excel</span>
                  <Badge variant="secondary">Formatted</Badge>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="pdf" />
                <Label htmlFor="pdf" className="flex items-center space-x-2 cursor-pointer">
                  <BarChart className="h-4 w-4" />
                  <span>PDF</span>
                  <Badge variant="secondary">Visual Report</Badge>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Sections to Include */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Sections to Include</Label>
            <div className="grid grid-cols-2 gap-3">
              {availableSections.map(section => (
                <div key={section} className="flex items-center space-x-2">
                  <Checkbox
                    id={section}
                    checked={settings.sections.includes(section)}
                    onCheckedChange={(checked) => 
                      handleSectionChange(section, checked as boolean)
                    }
                  />
                  <Label htmlFor={section} className="cursor-pointer">
                    {SECTION_LABELS[section as keyof typeof SECTION_LABELS] || section}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Date Range</Label>
            <Select
              value={settings.dateRange}
              onValueChange={(value: any) => 
                setSettings(prev => ({ ...prev, dateRange: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Last 7 days</SelectItem>
                <SelectItem value="month">Last 30 days</SelectItem>
                <SelectItem value="quarter">Last 90 days</SelectItem>
                <SelectItem value="year">Last 12 months</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Export Options */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Export Options</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeCharts"
                  checked={settings.includeCharts}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, includeCharts: checked as boolean }))
                  }
                />
                <Label htmlFor="includeCharts" className="cursor-pointer">
                  Include charts and visualizations
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeRawData"
                  checked={settings.includeRawData}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, includeRawData: checked as boolean }))
                  }
                />
                <Label htmlFor="includeRawData" className="cursor-pointer">
                  Include raw data tables
                </Label>
              </div>
            </div>
          </div>

          {/* Email & Scheduling */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Email & Scheduling</Label>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="emailRecipients">Email Recipients (optional)</Label>
                <Textarea
                  id="emailRecipients"
                  placeholder="Enter email addresses separated by commas"
                  value={settings.emailRecipients}
                  onChange={(e) => 
                    setSettings(prev => ({ ...prev, emailRecipients: e.target.value }))
                  }
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Schedule Frequency</Label>
                <Select
                  value={settings.scheduleFrequency}
                  onValueChange={(value: any) => 
                    setSettings(prev => ({ ...prev, scheduleFrequency: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">One-time export</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Custom Notes */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Custom Notes</Label>
            <Textarea
              placeholder="Add any custom notes or comments for this export"
              value={settings.customNotes}
              onChange={(e) => 
                setSettings(prev => ({ ...prev, customNotes: e.target.value }))
              }
              rows={3}
            />
          </div>

          {/* Export Summary */}
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">Export Summary</h4>
            <div className="text-sm space-y-1">
              <div className="flex items-center space-x-2">
                <FormatIcon className="h-4 w-4" />
                <span>Format: {settings.format.toUpperCase()}</span>
              </div>
              <div className="flex items-center space-x-2">
                <BarChart className="h-4 w-4" />
                <span>Sections: {settings.sections.length} selected</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Date Range: {settings.dateRange}</span>
              </div>
              {settings.emailRecipients && (
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4" />
                  <span>Email: {settings.emailRecipients.split(',').length} recipients</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleExport} 
              disabled={isExporting || settings.sections.length === 0}
            >
              {isExporting ? "Exporting..." : "Export Report"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}