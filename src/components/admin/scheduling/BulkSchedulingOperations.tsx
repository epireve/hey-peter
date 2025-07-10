"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Grid,
  Calendar,
  Users,
  Clock,
  Settings,
  Upload,
  Download,
  FileText,
  RefreshCw,
  Play,
  Pause,
  Square,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Trash2,
  Plus,
  Edit,
  Copy,
  Filter,
  Search,
  BarChart3,
  PieChart,
  Target,
  Zap,
  Database,
  Server,
  Activity,
  Timer,
  ListChecks,
  ArrowRight,
  ArrowDown,
  Loader2
} from 'lucide-react';
import { format, parseISO, addDays } from 'date-fns';
import { 
  SchedulingRequest,
  SchedulingResult,
  ScheduledClass,
  SchedulingOperationType,
  SchedulingPriority,
  CourseType,
  SchedulingMetrics
} from '@/types/scheduling';
import { toast } from '@/components/ui/use-toast';

interface BulkSchedulingOperationsProps {
  className?: string;
  onBulkOperation: (operation: BulkOperation) => Promise<BulkOperationResult>;
}

interface BulkOperation {
  id: string;
  type: 'schedule_multiple' | 'reschedule_range' | 'cancel_batch' | 'reassign_teacher' | 'modify_capacity' | 'import_schedule';
  name: string;
  description: string;
  parameters: Record<string, any>;
  targetCount: number;
  priority: SchedulingPriority;
  scheduledFor?: string;
  createdBy: string;
  createdAt: string;
}

interface BulkOperationResult {
  operationId: string;
  success: boolean;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  processedCount: number;
  successCount: number;
  failureCount: number;
  errors: BulkOperationError[];
  metrics: BulkOperationMetrics;
  startedAt: string;
  completedAt?: string;
  estimatedTimeRemaining?: number;
}

interface BulkOperationError {
  id: string;
  type: 'validation' | 'conflict' | 'resource' | 'permission' | 'system';
  message: string;
  context: Record<string, any>;
  severity: 'warning' | 'error' | 'critical';
  affectedItems: string[];
  suggestedResolution?: string;
}

interface BulkOperationMetrics {
  totalProcessingTime: number;
  averageItemProcessingTime: number;
  throughputPerMinute: number;
  resourceUtilization: number;
  successRate: number;
  rollbackOperations: number;
}

interface OperationTemplate {
  id: string;
  name: string;
  type: BulkOperation['type'];
  description: string;
  parameters: Record<string, any>;
  defaultPriority: SchedulingPriority;
  estimatedDuration: number;
  complexity: 'low' | 'medium' | 'high';
  permissions: string[];
}

interface BatchSchedulingRequest {
  courseType: CourseType;
  studentGroups: StudentGroup[];
  timeRange: {
    startDate: string;
    endDate: string;
  };
  preferences: {
    preferredTimes: string[];
    avoidTimes: string[];
    maxClassesPerDay: number;
    minStudentsPerClass: number;
    maxStudentsPerClass: number;
  };
  constraints: {
    teacherAvailability: boolean;
    roomAvailability: boolean;
    contentSequencing: boolean;
    studentConflicts: boolean;
  };
}

interface StudentGroup {
  id: string;
  name: string;
  studentIds: string[];
  level: string;
  preferredTeacher?: string;
  notes?: string;
}

export function BulkSchedulingOperations({ className, onBulkOperation }: BulkSchedulingOperationsProps) {
  const [activeOperations, setActiveOperations] = useState<BulkOperationResult[]>([]);
  const [operationHistory, setOperationHistory] = useState<BulkOperationResult[]>([]);
  const [selectedOperation, setSelectedOperation] = useState<BulkOperationResult | null>(null);
  const [operationTemplates] = useState<OperationTemplate[]>([
    {
      id: 'template-1',
      name: 'Weekly Batch Scheduling',
      type: 'schedule_multiple',
      description: 'Schedule multiple classes for a week based on student progress',
      parameters: { batchSize: 50, timeframe: 'week', priority: 'medium' },
      defaultPriority: 'medium',
      estimatedDuration: 30,
      complexity: 'medium',
      permissions: ['schedule_write', 'bulk_operations']
    },
    {
      id: 'template-2',
      name: 'Teacher Reassignment',
      type: 'reassign_teacher',
      description: 'Bulk reassign classes from one teacher to another',
      parameters: { validateAvailability: true, notifyStudents: true },
      defaultPriority: 'high',
      estimatedDuration: 15,
      complexity: 'low',
      permissions: ['teacher_management', 'bulk_operations']
    },
    {
      id: 'template-3',
      name: 'Emergency Rescheduling',
      type: 'reschedule_range',
      description: 'Reschedule classes in a date range due to emergency',
      parameters: { reason: 'emergency', autoApprove: false },
      defaultPriority: 'urgent',
      estimatedDuration: 45,
      complexity: 'high',
      permissions: ['emergency_operations', 'bulk_operations']
    }
  ]);

  // Operation form state
  const [showOperationDialog, setShowOperationDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<OperationTemplate | null>(null);
  const [operationForm, setOperationForm] = useState<Partial<BulkOperation>>({
    type: 'schedule_multiple',
    priority: 'medium',
    parameters: {}
  });

  // Batch scheduling form state
  const [showBatchSchedulingDialog, setShowBatchSchedulingDialog] = useState(false);
  const [batchRequest, setBatchRequest] = useState<BatchSchedulingRequest>({
    courseType: 'Basic',
    studentGroups: [],
    timeRange: {
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(addDays(new Date(), 7), 'yyyy-MM-dd')
    },
    preferences: {
      preferredTimes: [],
      avoidTimes: [],
      maxClassesPerDay: 3,
      minStudentsPerClass: 2,
      maxStudentsPerClass: 9
    },
    constraints: {
      teacherAvailability: true,
      roomAvailability: true,
      contentSequencing: true,
      studentConflicts: true
    }
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);

  // Load active operations and history
  useEffect(() => {
    loadOperations();
    startPolling();
    
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, []);

  const loadOperations = async () => {
    // Mock data for demonstration
    const mockActiveOperations: BulkOperationResult[] = [
      {
        operationId: 'op-001',
        success: true,
        status: 'running',
        progress: 65,
        processedCount: 32,
        successCount: 30,
        failureCount: 2,
        errors: [
          {
            id: 'err-001',
            type: 'conflict',
            message: 'Teacher unavailable for requested time slot',
            context: { teacherId: 'teacher-001', timeSlot: '14:00-15:00' },
            severity: 'warning',
            affectedItems: ['class-001', 'class-002'],
            suggestedResolution: 'Use alternative teacher or reschedule to available slot'
          }
        ],
        metrics: {
          totalProcessingTime: 12000,
          averageItemProcessingTime: 375,
          throughputPerMinute: 2.7,
          resourceUtilization: 0.75,
          successRate: 0.94,
          rollbackOperations: 0
        },
        startedAt: new Date(Date.now() - 12000).toISOString(),
        estimatedTimeRemaining: 8000
      }
    ];

    const mockHistory: BulkOperationResult[] = [
      {
        operationId: 'op-002',
        success: true,
        status: 'completed',
        progress: 100,
        processedCount: 45,
        successCount: 45,
        failureCount: 0,
        errors: [],
        metrics: {
          totalProcessingTime: 18000,
          averageItemProcessingTime: 400,
          throughputPerMinute: 2.5,
          resourceUtilization: 0.8,
          successRate: 1.0,
          rollbackOperations: 0
        },
        startedAt: new Date(Date.now() - 86400000).toISOString(),
        completedAt: new Date(Date.now() - 86400000 + 18000).toISOString()
      }
    ];

    setActiveOperations(mockActiveOperations);
    setOperationHistory(mockHistory);
  };

  const startPolling = () => {
    const interval = setInterval(() => {
      updateActiveOperations();
    }, 2000);
    setPollInterval(interval);
  };

  const updateActiveOperations = async () => {
    // Mock progress updates
    setActiveOperations(prev => prev.map(op => {
      if (op.status === 'running' && op.progress < 100) {
        const newProgress = Math.min(op.progress + Math.random() * 5, 100);
        const isCompleted = newProgress >= 100;
        
        return {
          ...op,
          progress: newProgress,
          status: isCompleted ? 'completed' : op.status,
          processedCount: Math.floor((newProgress / 100) * 50),
          completedAt: isCompleted ? new Date().toISOString() : op.completedAt,
          estimatedTimeRemaining: isCompleted ? 0 : Math.max(0, (op.estimatedTimeRemaining || 0) - 2000)
        };
      }
      return op;
    }));
  };

  const handleStartOperation = async (template: OperationTemplate) => {
    try {
      setIsProcessing(true);

      const operation: BulkOperation = {
        id: `op-${Date.now()}`,
        type: template.type,
        name: template.name,
        description: template.description,
        parameters: { ...template.parameters, ...operationForm.parameters },
        targetCount: 50, // Mock target count
        priority: operationForm.priority || template.defaultPriority,
        createdBy: 'admin-user',
        createdAt: new Date().toISOString()
      };

      const result = await onBulkOperation(operation);
      
      setActiveOperations(prev => [...prev, result]);
      setShowOperationDialog(false);

      toast({
        title: "Bulk operation started",
        description: `${operation.name} has been initiated with ${operation.targetCount} target items`,
      });

    } catch (error) {
      toast({
        title: "Error starting operation",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelOperation = async (operationId: string) => {
    try {
      setActiveOperations(prev => prev.map(op => 
        op.operationId === operationId 
          ? { ...op, status: 'cancelled' as const }
          : op
      ));

      toast({
        title: "Operation cancelled",
        description: "The bulk operation has been cancelled",
      });
    } catch (error) {
      toast({
        title: "Error cancelling operation",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  };

  const handleBatchScheduling = async () => {
    try {
      setIsProcessing(true);

      const operation: BulkOperation = {
        id: `batch-${Date.now()}`,
        type: 'schedule_multiple',
        name: 'Batch Scheduling Operation',
        description: `Schedule classes for ${batchRequest.studentGroups.length} groups`,
        parameters: { batchRequest },
        targetCount: batchRequest.studentGroups.reduce((sum, group) => sum + group.studentIds.length, 0),
        priority: 'medium',
        createdBy: 'admin-user',
        createdAt: new Date().toISOString()
      };

      const result = await onBulkOperation(operation);
      
      setActiveOperations(prev => [...prev, result]);
      setShowBatchSchedulingDialog(false);

      toast({
        title: "Batch scheduling started",
        description: `Batch scheduling operation initiated for ${operation.targetCount} students`,
      });

    } catch (error) {
      toast({
        title: "Error starting batch scheduling",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusIcon = (status: BulkOperationResult['status']) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'running': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled': return <Square className="h-4 w-4 text-gray-500" />;
      default: return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: BulkOperationResult['status']) => {
    switch (status) {
      case 'pending': return 'default';
      case 'running': return 'default';
      case 'completed': return 'secondary';
      case 'failed': return 'destructive';
      case 'cancelled': return 'outline';
      default: return 'outline';
    }
  };

  const formatDuration = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const renderOperationCard = (operation: BulkOperationResult) => (
    <Card key={operation.operationId} className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setSelectedOperation(operation)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon(operation.status)}
            <CardTitle className="text-lg">Operation {operation.operationId}</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={getStatusColor(operation.status)}>
              {operation.status}
            </Badge>
            {operation.status === 'running' && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancelOperation(operation.operationId);
                }}
              >
                <Square className="h-3 w-3 mr-1" />
                Cancel
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Progress */}
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span>Progress</span>
              <span>{operation.progress.toFixed(1)}%</span>
            </div>
            <Progress value={operation.progress} className="w-full" />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="font-medium">{operation.processedCount}</div>
              <div className="text-muted-foreground">Processed</div>
            </div>
            <div>
              <div className="font-medium">{operation.successCount}</div>
              <div className="text-muted-foreground">Successful</div>
            </div>
            <div>
              <div className="font-medium">{operation.failureCount}</div>
              <div className="text-muted-foreground">Failed</div>
            </div>
          </div>

          {/* Timing */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Started: {format(parseISO(operation.startedAt), 'MMM dd, HH:mm')}</span>
            {operation.estimatedTimeRemaining && operation.estimatedTimeRemaining > 0 && (
              <span>ETA: {formatDuration(operation.estimatedTimeRemaining)}</span>
            )}
          </div>

          {/* Errors */}
          {operation.errors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Issues Detected</AlertTitle>
              <AlertDescription>
                {operation.errors.length} error{operation.errors.length !== 1 ? 's' : ''} encountered
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderOperationDetails = () => {
    if (!selectedOperation) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {getStatusIcon(selectedOperation.status)}
            <span>Operation {selectedOperation.operationId}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status and Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Progress</Label>
              <Badge variant={getStatusColor(selectedOperation.status)}>
                {selectedOperation.status}
              </Badge>
            </div>
            <Progress value={selectedOperation.progress} className="w-full" />
            <div className="text-sm text-muted-foreground mt-1">
              {selectedOperation.processedCount} of {selectedOperation.processedCount + (100 - selectedOperation.progress)} items processed
            </div>
          </div>

          {/* Metrics */}
          <div>
            <Label className="text-base font-medium">Performance Metrics</Label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <Label className="text-sm">Success Rate</Label>
                <div className="text-2xl font-bold">
                  {(selectedOperation.metrics.successRate * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <Label className="text-sm">Throughput</Label>
                <div className="text-2xl font-bold">
                  {selectedOperation.metrics.throughputPerMinute.toFixed(1)}/min
                </div>
              </div>
              <div>
                <Label className="text-sm">Avg. Processing Time</Label>
                <div className="text-lg font-semibold">
                  {(selectedOperation.metrics.averageItemProcessingTime / 1000).toFixed(1)}s
                </div>
              </div>
              <div>
                <Label className="text-sm">Resource Utilization</Label>
                <div className="text-lg font-semibold">
                  {(selectedOperation.metrics.resourceUtilization * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          </div>

          {/* Errors */}
          {selectedOperation.errors.length > 0 && (
            <div>
              <Label className="text-base font-medium">Errors & Issues</Label>
              <div className="space-y-2 mt-2">
                {selectedOperation.errors.map((error, index) => (
                  <Alert key={index} variant={error.severity === 'critical' ? 'destructive' : 'default'}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>{error.type} Error</AlertTitle>
                    <AlertDescription>
                      <div className="space-y-1">
                        <p>{error.message}</p>
                        <p className="text-xs">Affected items: {error.affectedItems.join(', ')}</p>
                        {error.suggestedResolution && (
                          <p className="text-xs font-medium">
                            Suggested resolution: {error.suggestedResolution}
                          </p>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div>
            <Label className="text-base font-medium">Timeline</Label>
            <div className="space-y-2 mt-2">
              <div className="flex items-center justify-between text-sm">
                <span>Started</span>
                <span>{format(parseISO(selectedOperation.startedAt), 'MMM dd, yyyy HH:mm:ss')}</span>
              </div>
              {selectedOperation.completedAt && (
                <div className="flex items-center justify-between text-sm">
                  <span>Completed</span>
                  <span>{format(parseISO(selectedOperation.completedAt), 'MMM dd, yyyy HH:mm:ss')}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span>Duration</span>
                <span>
                  {formatDuration(
                    selectedOperation.completedAt 
                      ? parseISO(selectedOperation.completedAt).getTime() - parseISO(selectedOperation.startedAt).getTime()
                      : Date.now() - parseISO(selectedOperation.startedAt).getTime()
                  )}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderOperationDialog = () => (
    <Dialog open={showOperationDialog} onOpenChange={setShowOperationDialog}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Start Bulk Operation</DialogTitle>
          <DialogDescription>
            Select an operation template and configure parameters
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Operation Template</Label>
            <div className="grid grid-cols-1 gap-2 mt-2">
              {operationTemplates.map(template => (
                <Card 
                  key={template.id} 
                  className={`cursor-pointer ${selectedTemplate?.id === template.id ? 'ring-2 ring-blue-500' : ''}`}
                  onClick={() => setSelectedTemplate(template)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{template.name}</h4>
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{template.complexity}</Badge>
                        <Badge variant={getPriorityColor(template.defaultPriority)}>
                          {template.defaultPriority}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {selectedTemplate && (
            <div>
              <Label>Priority</Label>
              <Select
                value={operationForm.priority || selectedTemplate.defaultPriority}
                onValueChange={(value: any) => setOperationForm(prev => ({ ...prev, priority: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowOperationDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => selectedTemplate && handleStartOperation(selectedTemplate)}
              disabled={!selectedTemplate || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start Operation
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  const renderBatchSchedulingDialog = () => (
    <Dialog open={showBatchSchedulingDialog} onOpenChange={setShowBatchSchedulingDialog}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Batch Scheduling</DialogTitle>
          <DialogDescription>
            Configure and schedule multiple classes in batch
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          {/* Course Type and Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Course Type</Label>
              <Select
                value={batchRequest.courseType}
                onValueChange={(value: CourseType) => setBatchRequest(prev => ({ ...prev, courseType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Basic">Basic</SelectItem>
                  <SelectItem value="Everyday A">Everyday A</SelectItem>
                  <SelectItem value="Everyday B">Everyday B</SelectItem>
                  <SelectItem value="Speak Up">Speak Up</SelectItem>
                  <SelectItem value="Business English">Business English</SelectItem>
                  <SelectItem value="1-on-1">1-on-1</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={batchRequest.timeRange.startDate}
                onChange={(e) => setBatchRequest(prev => ({
                  ...prev,
                  timeRange: { ...prev.timeRange, startDate: e.target.value }
                }))}
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={batchRequest.timeRange.endDate}
                onChange={(e) => setBatchRequest(prev => ({
                  ...prev,
                  timeRange: { ...prev.timeRange, endDate: e.target.value }
                }))}
              />
            </div>
          </div>

          {/* Preferences */}
          <div>
            <Label className="text-base font-medium">Scheduling Preferences</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
              <div>
                <Label>Max Classes per Day</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={batchRequest.preferences.maxClassesPerDay}
                  onChange={(e) => setBatchRequest(prev => ({
                    ...prev,
                    preferences: { ...prev.preferences, maxClassesPerDay: parseInt(e.target.value) || 3 }
                  }))}
                />
              </div>
              <div>
                <Label>Min Students per Class</Label>
                <Input
                  type="number"
                  min="1"
                  max="9"
                  value={batchRequest.preferences.minStudentsPerClass}
                  onChange={(e) => setBatchRequest(prev => ({
                    ...prev,
                    preferences: { ...prev.preferences, minStudentsPerClass: parseInt(e.target.value) || 2 }
                  }))}
                />
              </div>
              <div>
                <Label>Max Students per Class</Label>
                <Input
                  type="number"
                  min="1"
                  max="9"
                  value={batchRequest.preferences.maxStudentsPerClass}
                  onChange={(e) => setBatchRequest(prev => ({
                    ...prev,
                    preferences: { ...prev.preferences, maxStudentsPerClass: parseInt(e.target.value) || 9 }
                  }))}
                />
              </div>
            </div>
          </div>

          {/* Constraints */}
          <div>
            <Label className="text-base font-medium">Scheduling Constraints</Label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              {Object.entries(batchRequest.constraints).map(([key, value]) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    checked={value}
                    onCheckedChange={(checked) => setBatchRequest(prev => ({
                      ...prev,
                      constraints: { ...prev.constraints, [key]: checked === true }
                    }))}
                  />
                  <Label className="capitalize">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowBatchSchedulingDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBatchScheduling} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Start Batch Scheduling
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Bulk Operations</h2>
          <p className="text-muted-foreground">
            Manage large-scale scheduling operations and batch processing
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setShowBatchSchedulingDialog(true)}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Batch Schedule
          </Button>
          <Button onClick={() => setShowOperationDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Operation
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Operations</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeOperations.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeOperations.filter(op => op.status === 'running').length} running
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeOperations.length > 0 
                ? ((activeOperations.reduce((sum, op) => sum + op.metrics.successRate, 0) / activeOperations.length) * 100).toFixed(1)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Average across all operations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Processed</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {[...activeOperations, ...operationHistory].reduce((sum, op) => sum + op.processedCount, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Items processed today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Throughput</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeOperations.length > 0 
                ? (activeOperations.reduce((sum, op) => sum + op.metrics.throughputPerMinute, 0) / activeOperations.length).toFixed(1)
                : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Items per minute
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Operations List */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="active" className="space-y-4">
            <TabsList>
              <TabsTrigger value="active">Active Operations</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
              {activeOperations.length > 0 ? (
                activeOperations.map(op => renderOperationCard(op))
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No active operations</h3>
                    <p className="text-muted-foreground">
                      Start a new bulk operation to see it here
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              {operationHistory.length > 0 ? (
                operationHistory.map(op => renderOperationCard(op))
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No operation history</h3>
                    <p className="text-muted-foreground">
                      Completed operations will appear here
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Operation Details */}
        <div className="lg:col-span-1">
          {selectedOperation ? renderOperationDetails() : (
            <Card>
              <CardHeader>
                <CardTitle>Operation Details</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Select an operation to view detailed information
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialogs */}
      {renderOperationDialog()}
      {renderBatchSchedulingDialog()}
    </div>
  );
}