"use client";

import { logger } from '@/lib/services';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Calendar,
  Users,
  BookOpen,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  Settings,
  Play,
  Pause,
  RefreshCw
} from 'lucide-react';
import { schedulingRulesEngine } from '@/lib/services/scheduling-rules-engine';
import { 
  SchedulingRequest, 
  SchedulingResponse, 
  ScheduledClass,
  PerformanceMetrics,
  CourseType
} from '@/types/scheduling';

interface AutoSchedulingDashboardProps {
  className?: string;
}

export function AutoSchedulingDashboard({ className }: AutoSchedulingDashboardProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [lastOptimization, setLastOptimization] = useState<Date | null>(null);
  const [schedulingResult, setSchedulingResult] = useState<SchedulingResponse | null>(null);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [selectedCourseType, setSelectedCourseType] = useState<CourseType>('Basic');
  const [optimizationProgress, setOptimizationProgress] = useState(0);

  useEffect(() => {
    // Load last optimization data on component mount
    loadLastOptimizationData();
  }, []);

  const loadLastOptimizationData = async () => {
    try {
      // In a real implementation, this would load from localStorage or API
      const savedData = localStorage.getItem('lastSchedulingResult');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setSchedulingResult(parsed.result);
        setMetrics(parsed.metrics);
        setLastOptimization(new Date(parsed.timestamp));
      }
    } catch (error) {
      logger.error('Failed to load last optimization data:', error);
    }
  };

  const runAutoScheduling = async () => {
    setIsRunning(true);
    setOptimizationProgress(0);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setOptimizationProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const request: SchedulingRequest = {
        course_type: selectedCourseType,
        time_range: {
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // Next 2 weeks
        },
        optimization_goals: [
          'content_priority',
          'student_satisfaction',
          'teacher_utilization',
          'class_size_optimization'
        ]
      };

      const response = await schedulingRulesEngine.scheduleClasses(request);
      
      clearInterval(progressInterval);
      setOptimizationProgress(100);

      if (response.success) {
        setSchedulingResult(response);
        setMetrics(response.result?.performance_metrics || null);
        setLastOptimization(new Date());

        // Save to localStorage
        localStorage.setItem('lastSchedulingResult', JSON.stringify({
          result: response,
          metrics: response.result?.performance_metrics,
          timestamp: new Date().toISOString()
        }));
      } else {
        throw new Error(response.error || 'Scheduling failed');
      }
    } catch (error) {
      logger.error('Auto-scheduling failed:', error);
      setOptimizationProgress(0);
    } finally {
      setIsRunning(false);
    }
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getPriorityColor = (priority: string): string => {
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
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Auto-Scheduling Dashboard</h1>
          <p className="text-muted-foreground">
            Intelligent content-based class scheduling powered by AI
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={selectedCourseType}
            onChange={(e) => setSelectedCourseType(e.target.value as CourseType)}
            className="px-3 py-2 border rounded-md"
            disabled={isRunning}
          >
            <option value="Basic">Basic</option>
            <option value="Everyday A">Everyday A</option>
            <option value="Everyday B">Everyday B</option>
            <option value="Speak Up">Speak Up</option>
            <option value="Business English">Business English</option>
            <option value="1-on-1">1-on-1</option>
          </select>
          <Button 
            onClick={runAutoScheduling} 
            disabled={isRunning}
            className="min-w-32"
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run Optimization
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Progress Indicator */}
      {isRunning && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Optimization Progress</span>
                <span className="text-sm text-muted-foreground">{optimizationProgress}%</span>
              </div>
              <Progress value={optimizationProgress} className="w-full" />
              <p className="text-xs text-muted-foreground">
                Analyzing student progress and creating optimal class compositions...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Classes Scheduled</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {schedulingResult?.result?.scheduled_classes.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {lastOptimization ? `Last updated ${lastOptimization.toLocaleDateString()}` : 'No data'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Students Served</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.total_students_scheduled || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all scheduled classes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Optimization Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {schedulingResult?.result?.optimization_score?.toFixed(1) || '0.0'}%
            </div>
            <p className="text-xs text-muted-foreground">
              Overall scheduling efficiency
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Teacher Utilization</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.teacher_utilization?.toFixed(1) || '0.0'}%
            </div>
            <p className="text-xs text-muted-foreground">
              Average across all teachers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="classes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="classes">Scheduled Classes</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="classes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Classes</CardTitle>
              <CardDescription>
                Classes automatically scheduled based on student progress and content needs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {schedulingResult?.result?.scheduled_classes.length ? (
                <div className="space-y-4">
                  {schedulingResult.result.scheduled_classes.map((scheduledClass) => (
                    <ClassCard key={scheduledClass.id} scheduledClass={scheduledClass} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No classes scheduled yet. Run optimization to generate schedule.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                {metrics ? (
                  <div className="space-y-4">
                    <MetricRow 
                      label="Content Coverage" 
                      value={metrics.content_coverage_percentage} 
                      unit="%" 
                    />
                    <MetricRow 
                      label="Student Satisfaction" 
                      value={metrics.student_preference_satisfaction} 
                      unit="%" 
                    />
                    <MetricRow 
                      label="Class Utilization" 
                      value={metrics.average_class_utilization} 
                      unit="" 
                    />
                    <MetricRow 
                      label="Scheduling Efficiency" 
                      value={metrics.scheduling_efficiency} 
                      unit="%" 
                    />
                  </div>
                ) : (
                  <p className="text-muted-foreground">No metrics available</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Unscheduled Students</CardTitle>
              </CardHeader>
              <CardContent>
                {schedulingResult?.result?.unscheduled_students.length ? (
                  <div className="space-y-2">
                    {schedulingResult.result.unscheduled_students.map((studentId) => (
                      <div key={studentId} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">{studentId}</span>
                        <Badge variant="outline">Unscheduled</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">All students successfully scheduled</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Recommendations</CardTitle>
              <CardDescription>
                AI-generated suggestions to improve scheduling effectiveness
              </CardDescription>
            </CardHeader>
            <CardContent>
              {schedulingResult?.recommendations?.length ? (
                <div className="space-y-3">
                  {schedulingResult.recommendations.map((recommendation, index) => (
                    <Alert key={index}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Recommendation {index + 1}</AlertTitle>
                      <AlertDescription>{recommendation}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No recommendations available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scheduling Settings</CardTitle>
              <CardDescription>
                Configure auto-scheduling parameters and rules
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Optimization Strategy</label>
                  <select className="w-full mt-1 px-3 py-2 border rounded-md">
                    <option value="balanced">Balanced</option>
                    <option value="content_based">Content-Based</option>
                    <option value="availability_based">Availability-Based</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Max Students per Group</label>
                  <input 
                    type="number" 
                    min="2" 
                    max="9" 
                    defaultValue="6"
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Scheduling Horizon (days)</label>
                  <input 
                    type="number" 
                    min="7" 
                    max="30" 
                    defaultValue="14"
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                  />
                </div>

                <Button className="w-full">Save Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface ClassCardProps {
  scheduledClass: ScheduledClass;
}

function ClassCard({ scheduledClass }: ClassCardProps) {
  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const { date, time } = formatDateTime(scheduledClass.scheduled_time);

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Badge variant={scheduledClass.class_type === 'individual' ? 'secondary' : 'default'}>
                {scheduledClass.class_type}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {scheduledClass.student_ids.length} student{scheduledClass.student_ids.length !== 1 ? 's' : ''}
              </span>
            </div>
            <h3 className="font-semibold">
              {scheduledClass.content_items.map(item => item.title).join(', ') || 'Class Session'}
            </h3>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>{date}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>{time} ({scheduledClass.duration_minutes}min)</span>
              </div>
              <div className="flex items-center space-x-1">
                <BookOpen className="w-4 h-4" />
                <span>{scheduledClass.room_or_link}</span>
              </div>
            </div>
            {scheduledClass.learning_objectives.length > 0 && (
              <div className="text-xs text-muted-foreground">
                <strong>Objectives:</strong> {scheduledClass.learning_objectives.join(', ')}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end space-y-2">
            <Badge variant="outline">Scheduled</Badge>
            {scheduledClass.teacher_id && (
              <span className="text-xs text-muted-foreground">
                Teacher: {scheduledClass.teacher_id}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface MetricRowProps {
  label: string;
  value: number;
  unit: string;
}

function MetricRow({ label, value, unit }: MetricRowProps) {
  const percentage = unit === '%' ? value : (value / 10) * 100; // Normalize for progress bar

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm text-muted-foreground">
          {value.toFixed(1)}{unit}
        </span>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  );
}