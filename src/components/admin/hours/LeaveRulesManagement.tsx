'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Plus, 
  Edit, 
  Trash2, 
  MoreHorizontal, 
  Settings, 
  Calendar,
  AlertTriangle,
  Clock,
  User,
  Shield,
  FileText,
  ArrowUpDown,
  Filter,
  Search
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { leaveRulesService } from '@/lib/services/leave-rules-service';
import type {
  LeaveRule,
  LeaveRuleType,
  LeaveRuleFrequency,
  LeaveRuleRequest
} from '@/types/hours';
import {
  LEAVE_RULE_TYPE_LABELS,
  LEAVE_RULE_FREQUENCY_LABELS
} from '@/types/hours';

const RULE_TYPE_ICONS = {
  monthly_limit: User,
  blackout_dates: Calendar,
  advance_notice: Clock,
  consecutive_days: Calendar,
  minimum_hours: Clock,
  approval_required: Shield,
  cancellation_policy: FileText,
};

interface LeaveRuleFormData {
  name: string;
  description: string;
  ruleType: LeaveRuleType;
  value: string;
  frequency?: LeaveRuleFrequency;
  appliesToCourseTypes: string[];
  appliesToStudentTypes: string[];
  appliesToRegions: string[];
  blackoutDates: Array<{
    startDate: string;
    endDate: string;
    reason: string;
  }>;
  conditions: Array<{
    field: string;
    operator: string;
    value: string;
  }>;
  exceptions: Array<{
    condition: string;
    description: string;
  }>;
  isActive: boolean;
  priority: number;
}

export function LeaveRulesManagement() {
  const [rules, setRules] = useState<LeaveRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState<LeaveRule | null>(null);
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState<LeaveRuleFormData>({
    name: '',
    description: '',
    ruleType: 'monthly_limit',
    value: '',
    frequency: undefined,
    appliesToCourseTypes: [],
    appliesToStudentTypes: [],
    appliesToRegions: [],
    blackoutDates: [],
    conditions: [],
    exceptions: [],
    isActive: true,
    priority: 0,
  });

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      setLoading(true);
      const result = await leaveRulesService.getLeaveRules();
      
      if (result.success && result.data) {
        setRules(result.data);
      } else {
        throw new Error(result.error?.message || 'Failed to load rules');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load leave rules',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      ruleType: 'monthly_limit',
      value: '',
      frequency: undefined,
      appliesToCourseTypes: [],
      appliesToStudentTypes: [],
      appliesToRegions: [],
      blackoutDates: [],
      conditions: [],
      exceptions: [],
      isActive: true,
      priority: 0,
    });
  };

  const openCreateDialog = () => {
    resetForm();
    setEditingRule(null);
    setShowRuleDialog(true);
  };

  const openEditDialog = (rule: LeaveRule) => {
    setFormData({
      name: rule.name,
      description: rule.description || '',
      ruleType: rule.ruleType,
      value: typeof rule.value === 'string' ? rule.value : rule.value.toString(),
      frequency: rule.frequency,
      appliesToCourseTypes: rule.appliesToCourseTypes || [],
      appliesToStudentTypes: rule.appliesToStudentTypes || [],
      appliesToRegions: rule.appliesToRegions || [],
      blackoutDates: rule.blackoutDates || [],
      conditions: rule.conditions || [],
      exceptions: rule.exceptions || [],
      isActive: rule.isActive,
      priority: rule.priority,
    });
    setEditingRule(rule);
    setShowRuleDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const request: LeaveRuleRequest = {
        name: formData.name,
        description: formData.description,
        ruleType: formData.ruleType,
        value: parseValue(formData.value, formData.ruleType),
        frequency: formData.frequency,
        appliesToCourseTypes: formData.appliesToCourseTypes,
        appliesToStudentTypes: formData.appliesToStudentTypes,
        appliesToRegions: formData.appliesToRegions,
        blackoutDates: formData.blackoutDates,
        conditions: formData.conditions,
        exceptions: formData.exceptions,
        isActive: formData.isActive,
        priority: formData.priority,
      };

      let result;
      if (editingRule) {
        result = await leaveRulesService.updateLeaveRule(editingRule.id, request);
      } else {
        result = await leaveRulesService.createLeaveRule(request);
      }

      if (result.success) {
        toast({
          title: 'Success',
          description: `Leave rule ${editingRule ? 'updated' : 'created'} successfully`,
        });
        setShowRuleDialog(false);
        loadRules();
      } else {
        throw new Error(result.error?.message || 'Failed to save rule');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save rule',
        variant: 'destructive',
      });
    }
  };

  const parseValue = (value: string, ruleType: LeaveRuleType): number | string | boolean => {
    switch (ruleType) {
      case 'monthly_limit':
      case 'advance_notice':
      case 'consecutive_days':
      case 'minimum_hours':
        return parseInt(value, 10);
      case 'approval_required':
        return value === 'true';
      case 'blackout_dates':
      case 'cancellation_policy':
        return value;
      default:
        return value;
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;

    try {
      const result = await leaveRulesService.deleteLeaveRule(ruleId);
      
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Leave rule deleted successfully',
        });
        loadRules();
      } else {
        throw new Error(result.error?.message || 'Failed to delete rule');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete rule',
        variant: 'destructive',
      });
    }
  };

  const toggleRuleActive = async (rule: LeaveRule) => {
    try {
      const result = await leaveRulesService.updateLeaveRule(rule.id, {
        isActive: !rule.isActive
      });
      
      if (result.success) {
        toast({
          title: 'Success',
          description: `Rule ${rule.isActive ? 'deactivated' : 'activated'} successfully`,
        });
        loadRules();
      } else {
        throw new Error(result.error?.message || 'Failed to update rule');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update rule',
        variant: 'destructive',
      });
    }
  };

  const addBlackoutDate = () => {
    setFormData(prev => ({
      ...prev,
      blackoutDates: [
        ...prev.blackoutDates,
        { startDate: '', endDate: '', reason: '' }
      ]
    }));
  };

  const removeBlackoutDate = (index: number) => {
    setFormData(prev => ({
      ...prev,
      blackoutDates: prev.blackoutDates.filter((_, i) => i !== index)
    }));
  };

  const updateBlackoutDate = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      blackoutDates: prev.blackoutDates.map((date, i) =>
        i === index ? { ...date, [field]: value } : date
      )
    }));
  };

  const filteredRules = rules.filter(rule => {
    const matchesSearch = rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rule.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || rule.ruleType === filterType;
    const matchesActive = filterActive === null || rule.isActive === filterActive;
    
    return matchesSearch && matchesType && matchesActive;
  });

  const renderRuleValue = (rule: LeaveRule) => {
    switch (rule.ruleType) {
      case 'monthly_limit':
        return `${rule.value} leaves per month`;
      case 'advance_notice':
        return `${rule.value} days advance notice`;
      case 'consecutive_days':
        return `Max ${rule.value} consecutive days`;
      case 'minimum_hours':
        return `Min ${rule.value} hours`;
      case 'approval_required':
        return rule.value ? 'Approval required' : 'No approval required';
      case 'blackout_dates':
        return `${rule.blackoutDates?.length || 0} blackout periods`;
      case 'cancellation_policy':
        return 'Custom policy';
      default:
        return rule.value?.toString() || 'N/A';
    }
  };

  const renderRuleForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Rule Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter rule name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ruleType">Rule Type</Label>
          <Select
            value={formData.ruleType}
            onValueChange={(value: LeaveRuleType) => 
              setFormData(prev => ({ ...prev, ruleType: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select rule type" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(LEAVE_RULE_TYPE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Describe what this rule does..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="value">Rule Value</Label>
          {formData.ruleType === 'approval_required' ? (
            <Select
              value={formData.value}
              onValueChange={(value) => setFormData(prev => ({ ...prev, value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select value" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Required</SelectItem>
                <SelectItem value="false">Not Required</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="value"
              value={formData.value}
              onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
              placeholder="Enter rule value"
              type={['monthly_limit', 'advance_notice', 'consecutive_days', 'minimum_hours'].includes(formData.ruleType) ? 'number' : 'text'}
            />
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Input
            id="priority"
            type="number"
            value={formData.priority}
            onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
            placeholder="0"
          />
        </div>
      </div>

      {formData.ruleType === 'blackout_dates' && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label>Blackout Dates</Label>
            <Button type="button" variant="outline" size="sm" onClick={addBlackoutDate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Date Range
            </Button>
          </div>
          <div className="space-y-3">
            {formData.blackoutDates.map((date, index) => (
              <div key={index} className="grid grid-cols-3 gap-2 p-3 border rounded">
                <div className="space-y-1">
                  <Label className="text-xs">Start Date</Label>
                  <Input
                    type="date"
                    value={date.startDate}
                    onChange={(e) => updateBlackoutDate(index, 'startDate', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">End Date</Label>
                  <Input
                    type="date"
                    value={date.endDate}
                    onChange={(e) => updateBlackoutDate(index, 'endDate', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Reason</Label>
                  <div className="flex gap-2">
                    <Input
                      value={date.reason}
                      onChange={(e) => updateBlackoutDate(index, 'reason', e.target.value)}
                      placeholder="Holiday, etc."
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeBlackoutDate(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center space-x-2">
        <Switch
          id="isActive"
          checked={formData.isActive}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
        />
        <Label htmlFor="isActive">Active</Label>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Leave Rules Configuration</h3>
          <p className="text-sm text-muted-foreground">
            Manage automated leave request validation rules
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Rule
        </Button>
      </div>

      <div className="flex gap-4 items-center">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search rules..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(LEAVE_RULE_TYPE_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterActive?.toString() || 'all'} onValueChange={(value) => 
          setFilterActive(value === 'all' ? null : value === 'true')
        }>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rule</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRules.map((rule) => {
                const IconComponent = RULE_TYPE_ICONS[rule.ruleType];
                return (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <IconComponent className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{rule.name}</div>
                          {rule.description && (
                            <div className="text-sm text-muted-foreground">
                              {rule.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {LEAVE_RULE_TYPE_LABELS[rule.ruleType]}
                      </Badge>
                    </TableCell>
                    <TableCell>{renderRuleValue(rule)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{rule.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={rule.isActive ? 'default' : 'secondary'}>
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => openEditDialog(rule)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleRuleActive(rule)}>
                            <Settings className="h-4 w-4 mr-2" />
                            {rule.isActive ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteRule(rule.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? 'Edit Leave Rule' : 'Create Leave Rule'}
            </DialogTitle>
            <DialogDescription>
              Configure automated validation rules for leave requests
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            {renderRuleForm()}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowRuleDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingRule ? 'Update Rule' : 'Create Rule'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}