'use client';

// ========================================
// Popup Form Builder
// Dynamic form builder for popup lead capture
// ========================================

import React, { useState } from 'react';
import { Plus, Trash2, Edit, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { FormField } from '@/types/popup-marketing';

interface PopupFormBuilderProps {
  fields: FormField[];
  onChange: (fields: FormField[]) => void;
  disabled?: boolean;
}

interface FieldTemplate {
  type: FormField['type'];
  label: string;
  defaultProps: Partial<FormField>;
}

const FIELD_TEMPLATES: FieldTemplate[] = [
  {
    type: 'email',
    label: 'Email Address',
    defaultProps: {
      name: 'email',
      label: 'Email Address',
      placeholder: 'Enter your email',
      required: true,
      validation: {
        pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'
      }
    }
  },
  {
    type: 'text',
    label: 'First Name',
    defaultProps: {
      name: 'first_name',
      label: 'First Name',
      placeholder: 'Enter your first name',
      required: true
    }
  },
  {
    type: 'text',
    label: 'Last Name',
    defaultProps: {
      name: 'last_name',
      label: 'Last Name',
      placeholder: 'Enter your last name',
      required: false
    }
  },
  {
    type: 'tel',
    label: 'Phone Number',
    defaultProps: {
      name: 'phone',
      label: 'Phone Number',
      placeholder: '+1 (555) 123-4567',
      required: false
    }
  },
  {
    type: 'text',
    label: 'Company',
    defaultProps: {
      name: 'company',
      label: 'Company',
      placeholder: 'Enter your company name',
      required: false
    }
  },
  {
    type: 'select',
    label: 'Course Interest',
    defaultProps: {
      name: 'course_preferences',
      label: 'Which course interests you?',
      required: true,
      options: [
        { value: 'basic', label: 'Basic English' },
        { value: 'everyday_a', label: 'Everyday English A' },
        { value: 'everyday_b', label: 'Everyday English B' },
        { value: 'speak_up', label: 'Speak Up!' },
        { value: 'business', label: 'Business English' },
        { value: 'one_on_one', label: '1-on-1 Classes' }
      ]
    }
  },
  {
    type: 'checkbox',
    label: 'Marketing Consent',
    defaultProps: {
      name: 'marketing_consent',
      label: 'I agree to receive marketing communications',
      required: true,
      description: 'We will use your information to send you relevant course updates and promotional materials. You can unsubscribe at any time.'
    }
  },
  {
    type: 'textarea',
    label: 'Message',
    defaultProps: {
      name: 'message',
      label: 'Additional Message',
      placeholder: 'Tell us more about your learning goals...',
      required: false
    }
  }
];

export function PopupFormBuilder({ fields, onChange, disabled = false }: PopupFormBuilderProps) {
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const addField = (template: FieldTemplate) => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: template.type,
      name: template.defaultProps.name || '',
      label: template.defaultProps.label || '',
      placeholder: template.defaultProps.placeholder,
      required: template.defaultProps.required || false,
      validation: template.defaultProps.validation,
      options: template.defaultProps.options,
      defaultValue: template.defaultProps.defaultValue,
      description: template.defaultProps.description
    };

    onChange([...fields, newField]);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const updatedFields = [...fields];
    updatedFields[index] = { ...updatedFields[index], ...updates };
    onChange(updatedFields);
  };

  const removeField = (index: number) => {
    const updatedFields = fields.filter((_, i) => i !== index);
    onChange(updatedFields);
  };

  const moveField = (fromIndex: number, toIndex: number) => {
    const updatedFields = [...fields];
    const [movedField] = updatedFields.splice(fromIndex, 1);
    updatedFields.splice(toIndex, 0, movedField);
    onChange(updatedFields);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      moveField(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
  };

  const renderFieldEditor = (field: FormField, index: number) => {
    return (
      <Card key={field.id} className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div
                className="cursor-grab hover:cursor-grabbing"
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
              >
                <GripVertical className="h-4 w-4 text-gray-400" />
              </div>
              <CardTitle className="text-sm">{field.label}</CardTitle>
              <Badge variant="outline" className="text-xs">
                {field.type}
              </Badge>
              {field.required && (
                <Badge variant="secondary" className="text-xs">
                  Required
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditingField(field)}
                disabled={disabled}
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeField(index)}
                disabled={disabled}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent
          className="pt-0"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, index)}
        >
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500">Name:</span> {field.name}
              </div>
              <div>
                <span className="text-gray-500">Type:</span> {field.type}
              </div>
            </div>
            {field.placeholder && (
              <div className="text-xs">
                <span className="text-gray-500">Placeholder:</span> {field.placeholder}
              </div>
            )}
            {field.description && (
              <div className="text-xs">
                <span className="text-gray-500">Description:</span> {field.description}
              </div>
            )}
            {field.options && field.options.length > 0 && (
              <div className="text-xs">
                <span className="text-gray-500">Options:</span>{' '}
                {field.options.map(opt => opt.label).join(', ')}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderFieldDetailEditor = () => {
    if (!editingField) return null;

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Edit Field: {editingField.label}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="field-name">Field Name</Label>
              <Input
                id="field-name"
                value={editingField.name}
                onChange={(e) => setEditingField({ ...editingField, name: e.target.value })}
                placeholder="field_name"
              />
            </div>
            <div>
              <Label htmlFor="field-label">Display Label</Label>
              <Input
                id="field-label"
                value={editingField.label}
                onChange={(e) => setEditingField({ ...editingField, label: e.target.value })}
                placeholder="Field Label"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="field-placeholder">Placeholder Text</Label>
            <Input
              id="field-placeholder"
              value={editingField.placeholder || ''}
              onChange={(e) => setEditingField({ ...editingField, placeholder: e.target.value })}
              placeholder="Enter placeholder text..."
            />
          </div>

          <div>
            <Label htmlFor="field-description">Help Text</Label>
            <Textarea
              id="field-description"
              value={editingField.description || ''}
              onChange={(e) => setEditingField({ ...editingField, description: e.target.value })}
              placeholder="Additional help text for this field..."
              rows={2}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="field-required"
              checked={editingField.required}
              onCheckedChange={(checked) => 
                setEditingField({ ...editingField, required: checked as boolean })
              }
            />
            <Label htmlFor="field-required">Required field</Label>
          </div>

          {(editingField.type === 'select' || editingField.type === 'radio') && (
            <div>
              <Label>Options</Label>
              <div className="space-y-2">
                {editingField.options?.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      value={option.value}
                      onChange={(e) => {
                        const newOptions = [...(editingField.options || [])];
                        newOptions[index] = { ...option, value: e.target.value };
                        setEditingField({ ...editingField, options: newOptions });
                      }}
                      placeholder="Value"
                      className="flex-1"
                    />
                    <Input
                      value={option.label}
                      onChange={(e) => {
                        const newOptions = [...(editingField.options || [])];
                        newOptions[index] = { ...option, label: e.target.value };
                        setEditingField({ ...editingField, options: newOptions });
                      }}
                      placeholder="Label"
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const newOptions = editingField.options?.filter((_, i) => i !== index) || [];
                        setEditingField({ ...editingField, options: newOptions });
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const newOptions = [
                      ...(editingField.options || []),
                      { value: '', label: '' }
                    ];
                    setEditingField({ ...editingField, options: newOptions });
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Option
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setEditingField(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                const fieldIndex = fields.findIndex(f => f.id === editingField.id);
                if (fieldIndex !== -1) {
                  updateField(fieldIndex, editingField);
                }
                setEditingField(null);
              }}
            >
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Field Detail Editor */}
      {renderFieldDetailEditor()}

      {/* Form Builder */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Field Templates */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Available Fields</h3>
          <div className="space-y-2">
            {FIELD_TEMPLATES.map((template, index) => (
              <Button
                key={index}
                variant="outline"
                className="w-full justify-start h-auto p-3"
                onClick={() => addField(template)}
                disabled={disabled}
              >
                <div>
                  <div className="font-medium">{template.label}</div>
                  <div className="text-xs text-gray-500">{template.type}</div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Form Preview */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Form Fields ({fields.length})</h3>
            {fields.length > 0 && (
              <Badge variant="outline">
                {fields.filter(f => f.required).length} required fields
              </Badge>
            )}
          </div>

          {fields.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="text-gray-500 mb-4">
                  <Plus className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No fields added yet</p>
                  <p className="text-sm">Add fields from the left panel to build your form</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div>
              {fields.map((field, index) => renderFieldEditor(field, index))}
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Form Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Form Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Total Fields</span>
              <div className="font-medium">{fields.length}</div>
            </div>
            <div>
              <span className="text-gray-500">Required Fields</span>
              <div className="font-medium">{fields.filter(f => f.required).length}</div>
            </div>
            <div>
              <span className="text-gray-500">Optional Fields</span>
              <div className="font-medium">{fields.filter(f => !f.required).length}</div>
            </div>
            <div>
              <span className="text-gray-500">Field Types</span>
              <div className="font-medium">
                {Array.from(new Set(fields.map(f => f.type))).length}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default PopupFormBuilder;