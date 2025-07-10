'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Play, 
  Pause, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Users, 
  BookOpen,
  Settings,
  TrendingUp,
  Activity
} from 'lucide-react';
import { contentSynchronizationService } from '@/lib/services/content-synchronization-service';
import { contentSyncScheduler } from '@/lib/services/content-sync-scheduler';
import { contentSyncIntegration } from '@/lib/services/content-sync-integration';

interface SyncDashboardProps {
  className?: string;
}

interface SyncStats {
  totalGroups: number;
  activeOperations: number;
  pendingConflicts: number;
  completedSyncs: number;
  failedSyncs: number;
  recentSyncs: number;
  integrationHealth: 'healthy' | 'warning' | 'error';
}

interface ActiveOperation {
  id: string;
  type: string;
  sourceGroupId: string;
  targetGroupIds: string[];
  status: string;
  progress: number;
  startedAt: string;
  error?: string;
}

export default function ContentSynchronizationDashboard({ className }: SyncDashboardProps) {
  const [syncStats, setSyncStats] = useState<SyncStats>({
    totalGroups: 0,
    activeOperations: 0,
    pendingConflicts: 0,
    completedSyncs: 0,
    failedSyncs: 0,
    recentSyncs: 0,
    integrationHealth: 'healthy'
  });

  const [activeOperations, setActiveOperations] = useState<ActiveOperation[]>([]);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      // Get synchronization statistics
      const syncServiceStats = contentSynchronizationService.getStatistics();
      const integrationStats = contentSyncIntegration.getIntegrationStats();
      const automationStats = contentSyncScheduler.getAutomationStats();

      const combinedStats: SyncStats = {
        totalGroups: integrationStats.totalClassGroups,
        activeOperations: syncServiceStats.activeOperations,
        pendingConflicts: syncServiceStats.pendingConflicts,
        completedSyncs: syncServiceStats.completedSyncs,
        failedSyncs: syncServiceStats.failedSyncs,
        recentSyncs: integrationStats.recentSyncs,
        integrationHealth: integrationStats.integrationHealth
      };

      setSyncStats(combinedStats);

      // Get active operations
      const operations = contentSynchronizationService.getActiveOperations();
      const formattedOperations: ActiveOperation[] = operations.map(op => ({
        id: op.id,
        type: op.operationType,
        sourceGroupId: op.sourceGroupId,
        targetGroupIds: op.targetGroupIds,
        status: op.status,
        progress: op.status === 'completed' ? 100 : op.status === 'in_progress' ? 50 : 0,
        startedAt: op.scheduledAt,
        error: op.error
      }));

      setActiveOperations(formattedOperations);

      // Get conflicts
      const conflictList = contentSynchronizationService.getConflicts();
      setConflicts(conflictList);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceSync = async (groupId: string) => {
    try {
      await contentSyncIntegration.forceSyncClass(groupId);
      await loadDashboardData();
    } catch (error) {
      console.error('Error forcing sync:', error);
    }
  };

  const getHealthBadge = (health: string) => {
    const variants = {
      healthy: { variant: 'default' as const, text: 'Healthy', icon: CheckCircle },
      warning: { variant: 'secondary' as const, text: 'Warning', icon: AlertTriangle },
      error: { variant: 'destructive' as const, text: 'Error', icon: AlertTriangle }
    };
    
    const config = variants[health as keyof typeof variants] || variants.healthy;
    const IconComponent = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <IconComponent className="h-3 w-3" />
        {config.text}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { variant: 'secondary' as const, text: 'Pending', icon: Clock },
      in_progress: { variant: 'default' as const, text: 'In Progress', icon: RefreshCw },
      completed: { variant: 'default' as const, text: 'Completed', icon: CheckCircle },
      failed: { variant: 'destructive' as const, text: 'Failed', icon: AlertTriangle }
    };
    
    const config = variants[status as keyof typeof variants] || variants.pending;
    const IconComponent = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <IconComponent className="h-3 w-3" />
        {config.text}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overview Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Groups</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{syncStats.totalGroups}</div>
            <p className="text-xs text-muted-foreground">
              Class groups registered for sync
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Operations</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{syncStats.activeOperations}</div>
            <p className="text-xs text-muted-foreground">
              Currently running sync operations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {syncStats.completedSyncs + syncStats.failedSyncs > 0 
                ? Math.round((syncStats.completedSyncs / (syncStats.completedSyncs + syncStats.failedSyncs)) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {syncStats.completedSyncs} of {syncStats.completedSyncs + syncStats.failedSyncs} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {getHealthBadge(syncStats.integrationHealth)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {syncStats.pendingConflicts} pending conflicts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Health Alerts */}
      {syncStats.integrationHealth !== 'healthy' && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {syncStats.integrationHealth === 'error' 
              ? 'Content synchronization system has errors that require attention.'
              : 'Content synchronization system has warnings that should be reviewed.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Sync Activity</CardTitle>
                <CardDescription>Latest synchronization operations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activeOperations.slice(0, 5).map((operation) => (
                    <div key={operation.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {operation.type.charAt(0).toUpperCase() + operation.type.slice(1)} Operation
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {operation.targetGroupIds.length} target group(s)
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(operation.status)}
                      </div>
                    </div>
                  ))}
                  
                  {activeOperations.length === 0 && (
                    <div className="text-center text-muted-foreground py-4">
                      No recent activity
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Sync Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Sync Performance</CardTitle>
                <CardDescription>System performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Successful Operations</span>
                      <span>{syncStats.completedSyncs}</span>
                    </div>
                    <Progress 
                      value={syncStats.completedSyncs + syncStats.failedSyncs > 0 
                        ? (syncStats.completedSyncs / (syncStats.completedSyncs + syncStats.failedSyncs)) * 100 
                        : 0} 
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Recent Syncs (Last Hour)</span>
                      <span>{syncStats.recentSyncs}</span>
                    </div>
                    <Progress value={Math.min((syncStats.recentSyncs / 10) * 100, 100)} className="mt-1" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Conflict Resolution</span>
                      <span>{syncStats.pendingConflicts} pending</span>
                    </div>
                    <Progress 
                      value={syncStats.pendingConflicts > 0 ? 100 : 0} 
                      className="mt-1"
                      variant={syncStats.pendingConflicts > 0 ? "destructive" : "default"}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="operations" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Active Operations</CardTitle>
                <CardDescription>Currently running synchronization operations</CardDescription>
              </div>
              <Button onClick={loadDashboardData} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activeOperations.map((operation) => (
                  <div key={operation.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div>
                          <h4 className="text-sm font-medium">
                            {operation.type.charAt(0).toUpperCase() + operation.type.slice(1)} Operation
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            Source: {operation.sourceGroupId} → {operation.targetGroupIds.length} target(s)
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(operation.status)}
                    </div>
                    
                    {operation.status === 'in_progress' && (
                      <div className="mb-2">
                        <Progress value={operation.progress} className="w-full" />
                        <p className="text-xs text-muted-foreground mt-1">
                          {operation.progress}% complete
                        </p>
                      </div>
                    )}
                    
                    {operation.error && (
                      <Alert className="mt-2">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{operation.error}</AlertDescription>
                      </Alert>
                    )}
                    
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-xs text-muted-foreground">
                        Started: {new Date(operation.startedAt).toLocaleString()}
                      </span>
                      
                      {operation.status === 'failed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleForceSync(operation.sourceGroupId)}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Retry
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                
                {activeOperations.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No active operations</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conflicts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Synchronization Conflicts</CardTitle>
              <CardDescription>Conflicts requiring resolution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {conflicts.map((conflict) => (
                  <div key={conflict.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="text-sm font-medium">{conflict.conflictType}</h4>
                        <p className="text-xs text-muted-foreground">
                          {conflict.sourceGroupId} ↔ {conflict.targetGroupId}
                        </p>
                      </div>
                      <Badge variant={conflict.severity === 'critical' ? 'destructive' : 'secondary'}>
                        {conflict.severity}
                      </Badge>
                    </div>
                    
                    <p className="text-sm mb-3">{conflict.description}</p>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">
                        Suggested: {conflict.suggestedResolution}
                      </span>
                      <div className="space-x-2">
                        <Button size="sm" variant="outline">
                          Review
                        </Button>
                        <Button size="sm">
                          Resolve
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {conflicts.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <p>No conflicts detected</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Synchronization Settings</CardTitle>
              <CardDescription>Configure content synchronization behavior</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium">Auto-sync on Scheduling</h4>
                    <p className="text-xs text-muted-foreground">
                      Automatically sync content when classes are scheduled
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Configure
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium">Real-time Synchronization</h4>
                    <p className="text-xs text-muted-foreground">
                      Enable real-time content updates across groups
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Configure
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium">Conflict Resolution</h4>
                    <p className="text-xs text-muted-foreground">
                      Set automatic conflict resolution strategy
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Configure
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}