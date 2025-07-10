"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  CalendarDays,
  Brain,
  Settings,
  BarChart3,
  Grid,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  RefreshCw,
  Activity,
  Database,
  Shield,
  Zap
} from 'lucide-react';
import { ManualOverrideInterface } from './ManualOverrideInterface';
import { AIRecommendationSystem } from './AIRecommendationSystem';
import { BulkSchedulingOperations } from './BulkSchedulingOperations';
import { SchedulingAnalytics } from './SchedulingAnalytics';
import { AutoSchedulingDashboard } from './AutoSchedulingDashboard';
import { schedulingService } from '@/lib/services/scheduling-service';
import { manualOverrideService } from '@/lib/services/manual-override-service';
import { 
  SchedulingRequest,
  SchedulingResult,
  SchedulingRecommendation,
  SchedulingConflict,
  SchedulingOverride,
  SchedulingMetrics,
  ScheduledClass
} from '@/types/scheduling';
import { toast } from '@/components/ui/use-toast';

interface SchedulingDashboardProps {
  className?: string;
}

interface DashboardState {
  metrics: SchedulingMetrics | null;
  recommendations: SchedulingRecommendation[];
  conflicts: SchedulingConflict[];
  activeOperations: number;
  systemHealth: 'healthy' | 'degraded' | 'unhealthy';
  lastUpdate: Date;
}

export function SchedulingDashboard({ className }: SchedulingDashboardProps) {
  const [dashboardState, setDashboardState] = useState<DashboardState>({
    metrics: null,
    recommendations: [],
    conflicts: [],
    activeOperations: 0,
    systemHealth: 'healthy',
    lastUpdate: new Date()
  });
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
    
    // Set up periodic refresh
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      // Get system health status
      const healthStatus = schedulingService.getHealthStatus();
      
      // Mock data for dashboard state
      const mockState: DashboardState = {
        metrics: {
          processingTime: 2300,
          studentsProcessed: 156,
          classesScheduled: 45,
          conflictsDetected: 3,
          conflictsResolved: 2,
          successRate: 0.96,
          resourceUtilization: 0.78,
          studentSatisfactionScore: 0.84,
          teacherSatisfactionScore: 0.79,
          iterationsPerformed: 12,
          optimizationImprovements: 8
        },
        recommendations: [
          {
            id: 'rec-001',
            type: 'alternative_time',
            description: 'Consider rescheduling Business English class to 3:00 PM for better attendance',
            confidenceScore: 0.87,
            benefits: ['Higher attendance rate', 'Better student energy levels', 'Improved learning outcomes'],
            drawbacks: ['Conflicts with some student preferences'],
            complexity: 'low',
            action: {
              type: 'modify_schedule',
              parameters: { classId: 'class-001', newTimeSlot: '15:00-16:00' }
            },
            priority: 'medium'
          },
          {
            id: 'rec-002',
            type: 'alternative_teacher',
            description: 'Assign Sarah Johnson to Speak Up class for optimal skill matching',
            confidenceScore: 0.92,
            benefits: ['Better skill alignment', 'Improved student engagement', 'Higher satisfaction scores'],
            drawbacks: ['May require schedule adjustments'],
            complexity: 'medium',
            action: {
              type: 'schedule_class',
              parameters: { classId: 'class-002', teacherId: 'teacher-001' }
            },
            priority: 'high'
          }
        ],
        conflicts: [
          {
            id: 'conflict-001',
            type: 'teacher_unavailable',
            severity: 'medium',
            entityIds: ['teacher-002', 'class-003'],
            description: 'Teacher Michael Chen has a scheduling conflict at 2:00 PM',
            resolutions: [
              {
                id: 'res-001',
                type: 'reassign_teacher',
                description: 'Assign alternative teacher Emma Wilson',
                impact: {
                  affectedStudents: 5,
                  affectedTeachers: 2,
                  scheduleDisruption: 3,
                  resourceUtilization: 0.8,
                  studentSatisfaction: 0.75
                },
                feasibilityScore: 0.9,
                estimatedImplementationTime: 10,
                requiredApprovals: ['academic_coordinator'],
                steps: [
                  {
                    order: 1,
                    description: 'Notify students of teacher change',
                    type: 'notification',
                    parameters: { students: ['student-001', 'student-002'] },
                    estimatedDuration: 5,
                    dependencies: []
                  }
                ]
              }
            ],
            detectedAt: new Date().toISOString()
          }
        ],
        activeOperations: 2,
        systemHealth: healthStatus.status,
        lastUpdate: new Date()
      };

      setDashboardState(mockState);

    } catch (error) {
      toast({
        title: "Error loading dashboard data",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecommendationAction = async (
    recommendationId: string, 
    action: 'approve' | 'reject' | 'defer',
    reason?: string
  ) => {
    try {
      // Update recommendations state
      setDashboardState(prev => ({
        ...prev,
        recommendations: prev.recommendations.filter(rec => rec.id !== recommendationId)
      }));

      toast({
        title: `Recommendation ${action}d`,
        description: `The recommendation has been ${action}d successfully`,
      });
    } catch (error) {
      toast({
        title: "Error processing recommendation",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  };

  const handleBulkRecommendationAction = async (
    recommendationIds: string[], 
    action: 'approve' | 'reject'
  ) => {
    try {
      setDashboardState(prev => ({
        ...prev,
        recommendations: prev.recommendations.filter(rec => !recommendationIds.includes(rec.id))
      }));

      toast({
        title: `Bulk ${action} completed`,
        description: `${recommendationIds.length} recommendations have been ${action}d`,
      });
    } catch (error) {
      toast({
        title: "Error in bulk action",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  };

  const handleRegenerateRecommendations = async () => {
    try {
      setIsLoading(true);
      
      // Mock regeneration delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Reload dashboard data to get new recommendations
      await loadDashboardData();

      toast({
        title: "Recommendations regenerated",
        description: "AI recommendations have been updated based on current data",
      });
    } catch (error) {
      toast({
        title: "Error regenerating recommendations",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkOperation = async (operation: any) => {
    // Mock bulk operation processing
    return {
      operationId: operation.id,
      success: true,
      status: 'running' as const,
      progress: 0,
      processedCount: 0,
      successCount: 0,
      failureCount: 0,
      errors: [],
      metrics: {
        totalProcessingTime: 0,
        averageItemProcessingTime: 0,
        throughputPerMinute: 0,
        resourceUtilization: 0,
        successRate: 0,
        rollbackOperations: 0
      },
      startedAt: new Date().toISOString()
    };
  };

  const getSystemHealthColor = (health: DashboardState['systemHealth']) => {
    switch (health) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'unhealthy': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getSystemHealthIcon = (health: DashboardState['systemHealth']) => {
    switch (health) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'unhealthy': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            {getSystemHealthIcon(dashboardState.systemHealth)}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold capitalize ${getSystemHealthColor(dashboardState.systemHealth)}`}>
              {dashboardState.systemHealth}
            </div>
            <p className="text-xs text-muted-foreground">
              Last updated: {dashboardState.lastUpdate.toLocaleTimeString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Operations</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardState.activeOperations}</div>
            <p className="text-xs text-muted-foreground">
              Bulk operations running
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Recommendations</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardState.recommendations.length}</div>
            <p className="text-xs text-muted-foreground">
              Pending review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Conflicts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardState.conflicts.length}</div>
            <p className="text-xs text-muted-foreground">
              Requiring attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      {dashboardState.metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Scheduling Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Success Rate</span>
                <span className="text-sm text-muted-foreground">
                  {(dashboardState.metrics.successRate * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Processing Time</span>
                <span className="text-sm text-muted-foreground">
                  {(dashboardState.metrics.processingTime / 1000).toFixed(1)}s avg
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Classes Scheduled</span>
                <span className="text-sm text-muted-foreground">
                  {dashboardState.metrics.classesScheduled}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resource Utilization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Utilization</span>
                <span className="text-sm text-muted-foreground">
                  {(dashboardState.metrics.resourceUtilization * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Students Processed</span>
                <span className="text-sm text-muted-foreground">
                  {dashboardState.metrics.studentsProcessed}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Optimizations</span>
                <span className="text-sm text-muted-foreground">
                  {dashboardState.metrics.optimizationImprovements}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Satisfaction Scores</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Student Satisfaction</span>
                <span className="text-sm text-muted-foreground">
                  {(dashboardState.metrics.studentSatisfactionScore * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Teacher Satisfaction</span>
                <span className="text-sm text-muted-foreground">
                  {(dashboardState.metrics.teacherSatisfactionScore * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Conflicts Resolved</span>
                <span className="text-sm text-muted-foreground">
                  {dashboardState.metrics.conflictsResolved}/{dashboardState.metrics.conflictsDetected}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Conflicts Alert */}
      {dashboardState.conflicts.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Active Conflicts Detected</AlertTitle>
          <AlertDescription>
            There are {dashboardState.conflicts.length} scheduling conflicts that require attention. 
            Review them in the Manual Override interface.
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common scheduling tasks and operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2"
              onClick={() => setActiveTab('override')}
            >
              <Shield className="h-6 w-6" />
              <span className="text-sm">Manual Override</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2"
              onClick={() => setActiveTab('recommendations')}
            >
              <Brain className="h-6 w-6" />
              <span className="text-sm">AI Recommendations</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2"
              onClick={() => setActiveTab('bulk')}
            >
              <Grid className="h-6 w-6" />
              <span className="text-sm">Bulk Operations</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2"
              onClick={() => setActiveTab('analytics')}
            >
              <BarChart3 className="h-6 w-6" />
              <span className="text-sm">Analytics</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Scheduling Management</h1>
          <p className="text-muted-foreground">
            Comprehensive scheduling interface with AI recommendations and manual override capabilities
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={dashboardState.systemHealth === 'healthy' ? 'secondary' : 'destructive'}>
            {getSystemHealthIcon(dashboardState.systemHealth)}
            <span className="ml-1 capitalize">{dashboardState.systemHealth}</span>
          </Badge>
          <Button onClick={loadDashboardData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <CalendarDays className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="auto" className="flex items-center space-x-2">
            <Zap className="h-4 w-4" />
            <span>Auto Schedule</span>
          </TabsTrigger>
          <TabsTrigger value="override" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Manual Override</span>
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="flex items-center space-x-2">
            <Brain className="h-4 w-4" />
            <span>AI Recommendations</span>
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center space-x-2">
            <Grid className="h-4 w-4" />
            <span>Bulk Operations</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Analytics</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {renderOverviewTab()}
        </TabsContent>

        <TabsContent value="auto">
          <AutoSchedulingDashboard />
        </TabsContent>

        <TabsContent value="override">
          <ManualOverrideInterface />
        </TabsContent>

        <TabsContent value="recommendations">
          <AIRecommendationSystem
            recommendations={dashboardState.recommendations}
            metrics={dashboardState.metrics}
            onRecommendationAction={handleRecommendationAction}
            onBulkAction={handleBulkRecommendationAction}
            onRegenerateRecommendations={handleRegenerateRecommendations}
          />
        </TabsContent>

        <TabsContent value="bulk">
          <BulkSchedulingOperations onBulkOperation={handleBulkOperation} />
        </TabsContent>

        <TabsContent value="analytics">
          <SchedulingAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}