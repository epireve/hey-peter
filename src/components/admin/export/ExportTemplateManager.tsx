"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Copy,
  FileText, 
  FileSpreadsheet, 
  FileJson, 
  FileImage,
  Palette,
  Settings,
  Eye,
  Download
} from "lucide-react";
import { analyticsExportService, ExportTemplate, ExportFormat } from '@/lib/services/analytics-export-service';

interface ExportTemplateManagerProps {
  onTemplateCreated?: (template: ExportTemplate) => void;
}

export function ExportTemplateManager({ onTemplateCreated }: ExportTemplateManagerProps) {
  const [templates, setTemplates] = useState<ExportTemplate[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ExportTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    format: 'excel' as ExportFormat,
    columns: [] as string[],
    headerStyle: {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '4A90E2' } },
      alignment: { horizontal: 'center' }
    },
    cellStyle: {
      font: { size: 11 },
      alignment: { horizontal: 'left' }
    },
    brandingColors: ['#4A90E2', '#50C878', '#FFD700', '#FF6B6B']
  });

  const [availableColumns] = useState([
    'name', 'email', 'phone', 'course', 'enrollment_date', 'progress', 'attendance', 
    'test_score', 'performance_score', 'status', 'created_at', 'updated_at',
    'teacher_name', 'classes_taught', 'student_satisfaction', 'revenue', 'expenses'
  ]);

  const formatIcons = {
    csv: FileText,
    excel: FileSpreadsheet,
    json: FileJson,
    pdf: FileImage
  };

  const predefinedColors = [
    '#4A90E2', '#50C878', '#FFD700', '#FF6B6B', '#9B59B6', '#3498DB',
    '#E74C3C', '#2ECC71', '#F39C12', '#34495E', '#1ABC9C', '#E67E22'
  ];

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = () => {
    const allTemplates = analyticsExportService.getAllTemplates();
    setTemplates(allTemplates);
  };

  const handleCreateTemplate = () => {
    setFormData({
      name: '',
      description: '',
      format: 'excel',
      columns: [],
      headerStyle: {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '4A90E2' } },
        alignment: { horizontal: 'center' }
      },
      cellStyle: {
        font: { size: 11 },
        alignment: { horizontal: 'left' }
      },
      brandingColors: ['#4A90E2', '#50C878', '#FFD700', '#FF6B6B']
    });
    setEditingTemplate(null);
    setIsCreateDialogOpen(true);
  };

  const handleEditTemplate = (template: ExportTemplate) => {
    setFormData({
      name: template.name,
      description: template.description,
      format: template.format,
      columns: template.columns,
      headerStyle: template.styling?.headerStyle || {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '4A90E2' } },
        alignment: { horizontal: 'center' }
      },
      cellStyle: template.styling?.cellStyle || {
        font: { size: 11 },
        alignment: { horizontal: 'left' }
      },
      brandingColors: template.styling?.brandingColors || ['#4A90E2', '#50C878', '#FFD700', '#FF6B6B']
    });
    setEditingTemplate(template);
    setIsCreateDialogOpen(true);
  };

  const handleDuplicateTemplate = (template: ExportTemplate) => {
    const duplicatedTemplate: ExportTemplate = {
      ...template,
      id: `${template.id}-copy-${Date.now()}`,
      name: `${template.name} (Copy)`,
      description: `Copy of ${template.description}`
    };
    
    analyticsExportService.createTemplate(duplicatedTemplate);
    loadTemplates();
    onTemplateCreated?.(duplicatedTemplate);
  };

  const handleDeleteTemplate = (id: string) => {
    analyticsExportService.deleteTemplate(id);
    loadTemplates();
  };

  const handleSaveTemplate = () => {
    const template: ExportTemplate = {
      id: editingTemplate?.id || `template-${Date.now()}`,
      name: formData.name,
      description: formData.description,
      format: formData.format,
      columns: formData.columns,
      styling: {
        headerStyle: formData.headerStyle,
        cellStyle: formData.cellStyle,
        brandingColors: formData.brandingColors
      }
    };

    if (editingTemplate) {
      analyticsExportService.updateTemplate(template);
    } else {
      analyticsExportService.createTemplate(template);
    }

    loadTemplates();
    setIsCreateDialogOpen(false);
    onTemplateCreated?.(template);
  };

  const handleColumnToggle = (column: string) => {
    setFormData(prev => ({
      ...prev,
      columns: prev.columns.includes(column)
        ? prev.columns.filter(col => col !== column)
        : [...prev.columns, column]
    }));
  };

  const handleColorChange = (index: number, color: string) => {
    setFormData(prev => ({
      ...prev,
      brandingColors: prev.brandingColors.map((c, i) => i === index ? color : c)
    }));
  };

  const handlePreviewTemplate = (template: ExportTemplate) => {
    // This would open a preview dialog or generate a sample export
    console.log('Preview template:', template);
  };

  const handleTestExport = async (template: ExportTemplate) => {
    try {
      // Generate sample data for testing
      const sampleData = generateSampleData(template.columns);
      
      await analyticsExportService.exportWithTemplate(
        sampleData,
        template.id,
        { fileName: `${template.name.toLowerCase().replace(/\s+/g, '-')}-sample` }
      );
    } catch (error) {
      console.error('Test export failed:', error);
    }
  };

  const generateSampleData = (columns: string[]): any[] => {
    const sampleData: any[] = [];
    
    for (let i = 0; i < 5; i++) {
      const row: any = {};
      columns.forEach(column => {
        switch (column) {
          case 'name':
            row[column] = `Sample User ${i + 1}`;
            break;
          case 'email':
            row[column] = `user${i + 1}@example.com`;
            break;
          case 'course':
            row[column] = ['Basic English', 'Everyday A/B', 'Speak Up'][i % 3];
            break;
          case 'progress':
            row[column] = Math.floor(Math.random() * 100);
            break;
          case 'attendance':
            row[column] = Math.floor(Math.random() * 100);
            break;
          case 'test_score':
            row[column] = Math.floor(Math.random() * 100);
            break;
          case 'enrollment_date':
            row[column] = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000);
            break;
          default:
            row[column] = `Sample ${column}`;
        }
      });
      sampleData.push(row);
    }
    
    return sampleData;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Export Templates</h3>
          <p className="text-sm text-muted-foreground">
            Create and manage reusable export templates with custom formatting
          </p>
        </div>
        <Button onClick={handleCreateTemplate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map(template => {
          const Icon = formatIcons[template.format];
          
          return (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {template.description}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePreviewTemplate(template)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditTemplate(template)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDuplicateTemplate(template)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTemplate(template.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Format</div>
                    <Badge variant="outline">{template.format.toUpperCase()}</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Columns</div>
                    <Badge variant="secondary">{template.columns.length}</Badge>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium mb-2">Brand Colors</div>
                    <div className="flex gap-1">
                      {template.styling?.brandingColors?.map((color, index) => (
                        <div
                          key={index}
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestExport(template)}
                      className="flex-1"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Test
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Template' : 'Create Export Template'}
            </DialogTitle>
            <DialogDescription>
              Configure your export template with custom formatting and styling
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="mt-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="columns">Columns</TabsTrigger>
              <TabsTrigger value="styling">Styling</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="templateName">Template Name</Label>
                  <Input
                    id="templateName"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter template name"
                  />
                </div>
                <div>
                  <Label htmlFor="templateFormat">Format</Label>
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
              </div>

              <div>
                <Label htmlFor="templateDescription">Description</Label>
                <Input
                  id="templateDescription"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter template description"
                />
              </div>
            </TabsContent>

            <TabsContent value="columns" className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <Label>Available Columns</Label>
                  <div className="text-sm text-muted-foreground">
                    {formData.columns.length} of {availableColumns.length} selected
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                  {availableColumns.map(column => (
                    <div key={column} className="flex items-center space-x-2">
                      <Checkbox
                        id={column}
                        checked={formData.columns.includes(column)}
                        onCheckedChange={() => handleColumnToggle(column)}
                      />
                      <Label htmlFor={column} className="text-sm font-normal capitalize">
                        {column.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="styling" className="space-y-4">
              <div>
                <Label>Brand Colors</Label>
                <div className="grid grid-cols-4 gap-3 mt-2">
                  {formData.brandingColors.map((color, index) => (
                    <div key={index} className="space-y-2">
                      <div
                        className="w-full h-8 rounded border cursor-pointer"
                        style={{ backgroundColor: color }}
                        onClick={() => {
                          // In a real implementation, this would open a color picker
                          const colors = predefinedColors;
                          const currentIndex = colors.indexOf(color);
                          const nextIndex = (currentIndex + 1) % colors.length;
                          handleColorChange(index, colors[nextIndex]);
                        }}
                      />
                      <Input
                        value={color}
                        onChange={(e) => handleColorChange(index, e.target.value)}
                        className="h-6 text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Header Style</Label>
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="headerBold"
                        checked={formData.headerStyle.font.bold}
                        onCheckedChange={(checked) => 
                          setFormData(prev => ({
                            ...prev,
                            headerStyle: {
                              ...prev.headerStyle,
                              font: { ...prev.headerStyle.font, bold: checked as boolean }
                            }
                          }))
                        }
                      />
                      <Label htmlFor="headerBold" className="text-sm">Bold</Label>
                    </div>
                    <div>
                      <Label className="text-sm">Background Color</Label>
                      <Input
                        value={formData.headerStyle.fill.fgColor.rgb}
                        onChange={(e) => 
                          setFormData(prev => ({
                            ...prev,
                            headerStyle: {
                              ...prev.headerStyle,
                              fill: { fgColor: { rgb: e.target.value } }
                            }
                          }))
                        }
                        className="h-6 text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Cell Style</Label>
                  <div className="space-y-2 mt-2">
                    <div>
                      <Label className="text-sm">Font Size</Label>
                      <Input
                        type="number"
                        value={formData.cellStyle.font.size}
                        onChange={(e) => 
                          setFormData(prev => ({
                            ...prev,
                            cellStyle: {
                              ...prev.cellStyle,
                              font: { ...prev.cellStyle.font, size: parseInt(e.target.value) }
                            }
                          }))
                        }
                        className="h-6 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Alignment</Label>
                      <Select
                        value={formData.cellStyle.alignment.horizontal}
                        onValueChange={(value) => 
                          setFormData(prev => ({
                            ...prev,
                            cellStyle: {
                              ...prev.cellStyle,
                              alignment: { horizontal: value }
                            }
                          }))
                        }
                      >
                        <SelectTrigger className="h-6 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate}>
              {editingTemplate ? 'Update' : 'Create'} Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}