"use client";

import React, { useState, useEffect, useCallback } from 'react';
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Calendar,
  Users,
  Clock,
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Grid,
  Move,
  Eye,
  Edit,
  Trash2,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  BarChart3,
  PieChart,
  Target,
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Shield,
  Lock,
  Key,
  UserCheck,
  CalendarDays,
  Clock4,
  MapPin
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, parseISO } from 'date-fns';
import { schedulingService } from '@/lib/services/scheduling-service';
import { 
  SchedulingRequest, 
  SchedulingResult, 
  ScheduledClass,
  SchedulingConflict,
  SchedulingRecommendation,
  SchedulingOverride,
  SchedulingOperationType,
  SchedulingPriority,
  TimeSlot,
  SchedulingMetrics
} from '@/types/scheduling';
import { toast } from '@/components/ui/use-toast';

interface ManualOverrideInterfaceProps {
  className?: string;
}

interface SchedulingViewMode {
  type: 'grid' | 'list' | 'calendar' | 'timeline';
  granularity: 'day' | 'week' | 'month';
}

interface OverrideFormData {
  type: 'force_schedule' | 'prevent_schedule' | 'preferred_teacher' | 'preferred_time' | 'class_size';
  reason: string;
  priority: SchedulingPriority;
  parameters: Record<string, any>;
}

interface ClassScheduleGridItem {
  id: string;
  scheduledClass: ScheduledClass;
  position: { x: number; y: number };
  conflicts: SchedulingConflict[];
  recommendations: SchedulingRecommendation[];
  isManualOverride: boolean;
  overrideHistory: SchedulingOverride[];
}

export function ManualOverrideInterface({ className }: ManualOverrideInterfaceProps) {
  // State management
  const [viewMode, setViewMode] = useState<SchedulingViewMode>({ type: 'grid', granularity: 'week' });
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [schedulingGrid, setSchedulingGrid] = useState<ClassScheduleGridItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassScheduleGridItem | null>(null);
  const [recommendations, setRecommendations] = useState<SchedulingRecommendation[]>([]);
  const [activeOverrides, setActiveOverrides] = useState<SchedulingOverride[]>([]);
  const [conflicts, setConflicts] = useState<SchedulingConflict[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [metrics, setMetrics] = useState<SchedulingMetrics | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [overrideFormData, setOverrideFormData] = useState<OverrideFormData>({
    type: 'force_schedule',
    reason: '',
    priority: 'medium',
    parameters: {}
  });

  // Dialog states
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [showBulkOperationsDialog, setShowBulkOperationsDialog] = useState(false);
  const [showAnalyticsDialog, setShowAnalyticsDialog] = useState(false);
  const [showRecommendationsDialog, setShowRecommendationsDialog] = useState(false);

  // Load scheduling data
  useEffect(() => {
    loadSchedulingData();
  }, [selectedDate, viewMode]);

  const loadSchedulingData = async () => {
    try {
      setIsProcessing(true);
      
      // Get date range based on view mode
      const dateRange = getDateRange(selectedDate, viewMode.granularity);
      
      // Mock data for demonstration - in real implementation would fetch from API
      const mockGridData: ClassScheduleGridItem[] = [
        {
          id: 'class-1',
          scheduledClass: {
            id: 'class-1',
            courseId: 'course-basic-001',
            teacherId: 'teacher-001',
            studentIds: ['student-001', 'student-002', 'student-003'],
            timeSlot: {
              id: 'slot-1',
              startTime: '09:00',
              endTime: '10:00',
              duration: 60,
              dayOfWeek: 1,
              isAvailable: true,
              capacity: { maxStudents: 9, minStudents: 2, currentEnrollment: 3, availableSpots: 6 },
              location: 'Room 101'
            },
            content: [],
            classType: 'group',
            status: 'scheduled',
            confidenceScore: 0.85,
            rationale: 'Optimal timing based on student preferences',
            alternatives: []
          },
          position: { x: 1, y: 9 }, // Monday 9 AM
          conflicts: [],
          recommendations: [],
          isManualOverride: false,
          overrideHistory: []
        },
        {
          id: 'class-2',
          scheduledClass: {
            id: 'class-2',
            courseId: 'course-speakup-001',
            teacherId: 'teacher-002',
            studentIds: ['student-004', 'student-005'],
            timeSlot: {
              id: 'slot-2',
              startTime: '14:00',
              endTime: '15:00',
              duration: 60,
              dayOfWeek: 2,
              isAvailable: true,
              capacity: { maxStudents: 9, minStudents: 2, currentEnrollment: 2, availableSpots: 7 },
              location: 'Room 102'
            },
            content: [],
            classType: 'group',
            status: 'scheduled',
            confidenceScore: 0.75,
            rationale: 'Content-based grouping with intermediate students',
            alternatives: []
          },
          position: { x: 2, y: 14 }, // Tuesday 2 PM
          conflicts: [
            {
              id: 'conflict-1',
              type: 'teacher_unavailable',
              severity: 'medium',
              entityIds: ['teacher-002'],
              description: 'Teacher has another commitment at this time',
              resolutions: [],
              detectedAt: new Date().toISOString()
            }
          ],
          recommendations: [
            {
              id: 'rec-1',
              type: 'alternative_time',
              description: 'Consider moving to 15:00-16:00 slot',
              confidenceScore: 0.8,
              benefits: ['Resolves teacher conflict', 'Better student availability'],
              drawbacks: ['Slightly less optimal for content progression'],
              complexity: 'low',
              action: { type: 'modify_schedule', parameters: { newTimeSlot: '15:00-16:00' } },
              priority: 'medium'
            }
          ],
          isManualOverride: false,
          overrideHistory: []
        }
      ];

      setSchedulingGrid(mockGridData);
      
      // Extract conflicts and recommendations
      const allConflicts = mockGridData.flatMap(item => item.conflicts);
      const allRecommendations = mockGridData.flatMap(item => item.recommendations);
      
      setConflicts(allConflicts);
      setRecommendations(allRecommendations);
      
      // Mock metrics
      setMetrics({
        processingTime: 1500,
        studentsProcessed: 5,
        classesScheduled: 2,
        conflictsDetected: 1,
        conflictsResolved: 0,
        successRate: 0.85,
        resourceUtilization: 0.65,
        studentSatisfactionScore: 0.8,
        teacherSatisfactionScore: 0.75,
        iterationsPerformed: 2,
        optimizationImprovements: 3
      });
      
    } catch (error) {
      toast({
        title: "Error loading scheduling data",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getDateRange = (date: Date, granularity: 'day' | 'week' | 'month') => {
    switch (granularity) {
      case 'day':
        return { start: date, end: date };
      case 'week':
        return { start: startOfWeek(date), end: endOfWeek(date) };
      case 'month':
        return { 
          start: new Date(date.getFullYear(), date.getMonth(), 1),
          end: new Date(date.getFullYear(), date.getMonth() + 1, 0)
        };
      default:
        return { start: date, end: date };
    }
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) return;

    const newGrid = Array.from(schedulingGrid);
    const [reorderedItem] = newGrid.splice(sourceIndex, 1);
    newGrid.splice(destinationIndex, 0, reorderedItem);

    setSchedulingGrid(newGrid);
    
    // Log the move action
    toast({
      title: "Class moved",
      description: `Class ${reorderedItem.scheduledClass.id} has been moved`,
    });
  };

  const handleOverrideSubmit = async () => {
    if (!selectedClass || !overrideFormData.reason.trim()) {
      toast({
        title: "Invalid override data",
        description: "Please select a class and provide a reason for the override",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsProcessing(true);

      const override: SchedulingOverride = {
        type: overrideFormData.type,
        parameters: overrideFormData.parameters,
        reason: overrideFormData.reason,
        priority: overrideFormData.priority,
        appliedBy: 'admin-user', // Would come from auth context
        appliedAt: new Date().toISOString()
      };

      // Update the selected class with the override
      const updatedGrid = schedulingGrid.map(item => 
        item.id === selectedClass.id 
          ? { 
              ...item, 
              isManualOverride: true,
              overrideHistory: [...item.overrideHistory, override]
            }
          : item
      );

      setSchedulingGrid(updatedGrid);
      setActiveOverrides(prev => [...prev, override]);
      setShowOverrideDialog(false);

      toast({
        title: "Override applied",
        description: `Manual override has been applied to class ${selectedClass.scheduledClass.id}`,
      });

    } catch (error) {
      toast({
        title: "Error applying override",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRecommendationApproval = async (recommendation: SchedulingRecommendation, approved: boolean) => {
    try {
      setIsProcessing(true);

      if (approved) {
        // Apply the recommendation
        const updatedRecommendations = recommendations.map(rec => 
          rec.id === recommendation.id 
            ? { ...rec, status: 'approved' as any }
            : rec
        );
        setRecommendations(updatedRecommendations);

        toast({
          title: "Recommendation approved",
          description: `Recommendation "${recommendation.description}" has been approved and will be applied`,
        });
      } else {
        // Reject the recommendation
        const updatedRecommendations = recommendations.filter(rec => rec.id !== recommendation.id);
        setRecommendations(updatedRecommendations);

        toast({
          title: "Recommendation rejected",
          description: `Recommendation "${recommendation.description}" has been rejected`,
        });
      }

    } catch (error) {
      toast({
        title: "Error processing recommendation",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const renderSchedulingGrid = () => {
    const timeSlots = Array.from({ length: 9 }, (_, i) => i + 9); // 9 AM to 5 PM
    const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    return (
      <div className="overflow-x-auto">
        <div className="grid grid-cols-6 gap-2 min-w-[800px]">
          {/* Header row */}
          <div className="p-2 font-semibold text-center">Time</div>
          {weekDays.map(day => (
            <div key={day} className="p-2 font-semibold text-center">{day}</div>
          ))}

          {/* Time slots */}
          {timeSlots.map(hour => (
            <React.Fragment key={hour}>
              <div className="p-2 text-center text-sm text-muted-foreground">
                {hour}:00
              </div>
              {weekDays.map((day, dayIndex) => {
                const classItem = schedulingGrid.find(item => 
                  item.position.x === dayIndex + 1 && item.position.y === hour
                );

                return (
                  <div
                    key={`${day}-${hour}`}
                    className={`p-2 border rounded-md h-16 ${
                      classItem ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                    } hover:bg-gray-100 cursor-pointer transition-colors`}
                    onClick={() => classItem && setSelectedClass(classItem)}
                  >
                    {classItem && (
                      <div className="h-full flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <Badge variant={classItem.isManualOverride ? "destructive" : "default"} className="text-xs">
                            {classItem.scheduledClass.classType}
                          </Badge>
                          {classItem.conflicts.length > 0 && (
                            <AlertTriangle className="h-3 w-3 text-amber-500" />
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {classItem.scheduledClass.studentIds.length} students
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  const renderClassDetails = () => {
    if (!selectedClass) return null;

    const { scheduledClass, conflicts, recommendations, isManualOverride, overrideHistory } = selectedClass;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Class Details</span>
            <div className="flex items-center space-x-2">
              {isManualOverride && (
                <Badge variant="destructive">Manual Override</Badge>
              )}
              {conflicts.length > 0 && (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {conflicts.length} Conflicts
                </Badge>
              )}
              {recommendations.length > 0 && (
                <Badge variant="default">
                  <Lightbulb className="h-3 w-3 mr-1" />
                  {recommendations.length} Recommendations
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Class ID</Label>
              <p className="text-sm text-muted-foreground">{scheduledClass.id}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Class Type</Label>
              <p className="text-sm text-muted-foreground">{scheduledClass.classType}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Teacher</Label>
              <p className="text-sm text-muted-foreground">{scheduledClass.teacherId}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Students</Label>
              <p className="text-sm text-muted-foreground">{scheduledClass.studentIds.length} enrolled</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Time</Label>
              <p className="text-sm text-muted-foreground">
                {scheduledClass.timeSlot.startTime} - {scheduledClass.timeSlot.endTime}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Location</Label>
              <p className="text-sm text-muted-foreground">{scheduledClass.timeSlot.location}</p>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Confidence Score</Label>
            <div className="flex items-center space-x-2 mt-1">
              <Progress value={scheduledClass.confidenceScore * 100} className="flex-1" />
              <span className="text-sm text-muted-foreground">
                {(scheduledClass.confidenceScore * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Rationale</Label>
            <p className="text-sm text-muted-foreground">{scheduledClass.rationale}</p>
          </div>

          {conflicts.length > 0 && (
            <div>
              <Label className="text-sm font-medium">Conflicts</Label>
              <div className="space-y-2 mt-2">
                {conflicts.map(conflict => (
                  <Alert key={conflict.id} variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>{conflict.type.replace('_', ' ')}</AlertTitle>
                    <AlertDescription>{conflict.description}</AlertDescription>
                  </Alert>
                ))}
              </div>
            </div>
          )}

          {recommendations.length > 0 && (
            <div>
              <Label className="text-sm font-medium">AI Recommendations</Label>
              <div className="space-y-2 mt-2">
                {recommendations.map(rec => (
                  <Alert key={rec.id}>
                    <Lightbulb className="h-4 w-4" />
                    <AlertTitle>{rec.type.replace('_', ' ')}</AlertTitle>
                    <AlertDescription>{rec.description}</AlertDescription>
                    <div className="flex items-center space-x-2 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRecommendationApproval(rec, true)}
                        disabled={isProcessing}
                      >
                        <ThumbsUp className="h-3 w-3 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRecommendationApproval(rec, false)}
                        disabled={isProcessing}
                      >
                        <ThumbsDown className="h-3 w-3 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </Alert>
                ))}
              </div>
            </div>
          )}

          {overrideHistory.length > 0 && (
            <div>
              <Label className="text-sm font-medium">Override History</Label>
              <div className="space-y-2 mt-2">
                {overrideHistory.map((override, index) => (
                  <div key={index} className="border rounded-md p-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{override.type}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(parseISO(override.appliedAt), 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{override.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex space-x-2">
            <Button 
              variant="outline"
              onClick={() => setShowOverrideDialog(true)}
              disabled={isProcessing}
            >
              <Settings className="h-4 w-4 mr-2" />
              Apply Override
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                // Handle edit class
                toast({
                  title: "Edit class",
                  description: "Class editing interface would open here",
                });
              }}
              disabled={isProcessing}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Class
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderOverrideDialog = () => (
    <Dialog open={showOverrideDialog} onOpenChange={setShowOverrideDialog}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Apply Manual Override</DialogTitle>
          <DialogDescription>
            Apply a manual override to the selected class. This will bypass AI recommendations.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="override-type">Override Type</Label>
            <Select
              value={overrideFormData.type}
              onValueChange={(value: any) => setOverrideFormData(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select override type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="force_schedule">Force Schedule</SelectItem>
                <SelectItem value="prevent_schedule">Prevent Schedule</SelectItem>
                <SelectItem value="preferred_teacher">Preferred Teacher</SelectItem>
                <SelectItem value="preferred_time">Preferred Time</SelectItem>
                <SelectItem value="class_size">Class Size Override</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="override-priority">Priority</Label>
            <Select
              value={overrideFormData.priority}
              onValueChange={(value: any) => setOverrideFormData(prev => ({ ...prev, priority: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="override-reason">Reason for Override</Label>
            <Textarea
              id="override-reason"
              placeholder="Provide a detailed reason for this manual override..."
              value={overrideFormData.reason}
              onChange={(e) => setOverrideFormData(prev => ({ ...prev, reason: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowOverrideDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleOverrideSubmit}
              disabled={isProcessing || !overrideFormData.reason.trim()}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Apply Override
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manual Override & AI Recommendations</h1>
          <p className="text-muted-foreground">
            Manage scheduling decisions, apply overrides, and review AI recommendations
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setShowBulkOperationsDialog(true)}
          >
            <Grid className="h-4 w-4 mr-2" />
            Bulk Operations
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowAnalyticsDialog(true)}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
          <Button onClick={loadSchedulingData} disabled={isProcessing}>
            {isProcessing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Classes Scheduled</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.classesScheduled}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.studentsProcessed} students served
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Conflicts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{conflicts.length}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.conflictsResolved} resolved
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Recommendations</CardTitle>
              <Lightbulb className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{recommendations.length}</div>
              <p className="text-xs text-muted-foreground">
                Pending review
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Manual Overrides</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeOverrides.length}</div>
              <p className="text-xs text-muted-foreground">
                Active overrides
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scheduling Grid */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Scheduling Grid</CardTitle>
              <CardDescription>
                Drag and drop classes to reschedule, or click to view details
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderSchedulingGrid()}
            </CardContent>
          </Card>
        </div>

        {/* Class Details */}
        <div className="lg:col-span-1">
          {selectedClass ? renderClassDetails() : (
            <Card>
              <CardHeader>
                <CardTitle>Class Details</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Select a class from the grid to view details
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialogs */}
      {renderOverrideDialog()}
    </div>
  );
}