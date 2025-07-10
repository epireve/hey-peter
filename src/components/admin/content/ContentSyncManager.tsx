'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Play, 
  Pause, 
  RefreshCw, 
  Settings, 
  Users, 
  BookOpen, 
  Calendar,
  Filter,
  Download,
  Upload,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { contentSynchronizationService } from '@/lib/services/content-synchronization-service';
import { contentSyncScheduler } from '@/lib/services/content-sync-scheduler';
import { contentSyncIntegration } from '@/lib/services/content-sync-integration';

interface ContentSyncManagerProps {
  className?: string;
}

interface ClassGroup {
  id: string;
  name: string;
  courseId: string;
  courseType: string;
  studentCount: number;
  teacherId: string;
  teacherName: string;
  currentUnit: number;
  currentLesson: number;
  syncEnabled: boolean;
  lastSyncTime: string;
  syncStatus: 'up_to_date' | 'pending' | 'outdated' | 'error';
}

interface SyncOperation {
  sourceGroupId: string;
  targetGroupIds: string[];
  contentIds: string[];
  operationType: 'sync' | 'batch_sync' | 'selective_sync';
  filters: any[];
  scheduledTime?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export default function ContentSyncManager({ className }: ContentSyncManagerProps) {
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [syncOperation, setSyncOperation] = useState<SyncOperation>({
    sourceGroupId: '',
    targetGroupIds: [],
    contentIds: [],
    operationType: 'sync',
    filters: [],
    priority: 'medium'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [operationResult, setOperationResult] = useState<any>(null);
  const [filters, setFilters] = useState({
    courseType: '',
    syncStatus: '',
    searchTerm: ''
  });

  useEffect(() => {
    loadClassGroups();
  }, []);

  const loadClassGroups = async () => {
    try {
      setIsLoading(true);
      
      // Mock data - in real implementation, this would fetch from the service
      const mockGroups: ClassGroup[] = [
        {
          id: 'group_1',
          name: 'Business English A1',
          courseId: 'course_1',
          courseType: 'Business English',
          studentCount: 6,
          teacherId: 'teacher_1',
          teacherName: 'Sarah Johnson',
          currentUnit: 3,
          currentLesson: 2,
          syncEnabled: true,
          lastSyncTime: '2024-01-15T10:30:00Z',
          syncStatus: 'up_to_date'
        },
        {
          id: 'group_2',
          name: 'Everyday English B2',
          courseId: 'course_2',
          courseType: 'Everyday B',
          studentCount: 8,
          teacherId: 'teacher_2',
          teacherName: 'Mike Wilson',
          currentUnit: 3,
          currentLesson: 1,
          syncEnabled: true,
          lastSyncTime: '2024-01-14T15:20:00Z',
          syncStatus: 'pending'
        },
        {
          id: 'group_3',
          name: 'Speak Up Intermediate',
          courseId: 'course_3',
          courseType: 'Speak Up',
          studentCount: 4,
          teacherId: 'teacher_3',
          teacherName: 'Anna Davis',
          currentUnit: 2,
          currentLesson: 5,
          syncEnabled: false,
          lastSyncTime: '2024-01-10T09:15:00Z',
          syncStatus: 'outdated'
        }
      ];

      setClassGroups(mockGroups);
    } catch (error) {
      console.error('Error loading class groups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredGroups = classGroups.filter(group => {
    if (filters.courseType && group.courseType !== filters.courseType) return false;
    if (filters.syncStatus && group.syncStatus !== filters.syncStatus) return false;
    if (filters.searchTerm && !group.name.toLowerCase().includes(filters.searchTerm.toLowerCase())) return false;
    return true;
  });

  const handleGroupSelection = (groupId: string, checked: boolean) => {
    if (checked) {
      setSelectedGroups([...selectedGroups, groupId]);
    } else {
      setSelectedGroups(selectedGroups.filter(id => id !== groupId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedGroups(filteredGroups.map(g => g.id));
    } else {
      setSelectedGroups([]);
    }
  };

  const executeSync = async () => {
    try {
      setIsExecuting(true);
      setOperationResult(null);

      const operation = {
        ...syncOperation,
        targetGroupIds: selectedGroups.filter(id => id !== syncOperation.sourceGroupId)
      };

      let result;

      switch (operation.operationType) {
        case 'sync':
          // Single content sync
          if (operation.contentIds.length > 0) {
            result = await contentSynchronizationService.synchronizeContent(
              operation.sourceGroupId,
              operation.contentIds[0],
              operation.targetGroupIds
            );
          }
          break;

        case 'batch_sync':
          // Batch sync
          result = await contentSynchronizationService.batchSynchronize(
            operation.sourceGroupId,
            operation.contentIds,
            operation.targetGroupIds
          );
          break;

        case 'selective_sync':
          // Selective sync
          result = await contentSyncScheduler.selectiveSync(
            operation.sourceGroupId,
            {
              groupIds: operation.targetGroupIds,
              contentTypes: operation.filters.map(f => f.value),
              priorities: [operation.priority]
            }
          );
          break;

        default:
          throw new Error('Invalid operation type');
      }

      setOperationResult(result);
      
      // Reload groups to reflect changes
      await loadClassGroups();

    } catch (error) {
      setOperationResult({
        success: false,
        error: { message: error.message }
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const scheduleSync = async () => {
    try {
      setIsExecuting(true);
      
      const result = await contentSyncScheduler.scheduleBatchSync(
        selectedGroups,
        syncOperation.contentIds,
        syncOperation.scheduledTime || new Date().toISOString()
      );

      setOperationResult(result);
    } catch (error) {
      setOperationResult({
        success: false,
        error: { message: error.message }
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const getSyncStatusBadge = (status: string) => {
    const variants = {
      up_to_date: { variant: 'default' as const, text: 'Up to Date', icon: CheckCircle2 },
      pending: { variant: 'secondary' as const, text: 'Pending', icon: RefreshCw },
      outdated: { variant: 'destructive' as const, text: 'Outdated', icon: AlertCircle },
      error: { variant: 'destructive' as const, text: 'Error', icon: AlertCircle }
    };
    
    const config = variants[status as keyof typeof variants] || variants.up_to_date;
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
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Content Synchronization Manager</h2>
          <p className="text-muted-foreground">Manage content synchronization across class groups</p>
        </div>
        <Button onClick={loadClassGroups} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">Search Groups</Label>
              <Input
                id="search"
                placeholder="Search by group name..."
                value={filters.searchTerm}
                onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="course-type">Course Type</Label>
              <Select value={filters.courseType} onValueChange={(value) => setFilters({ ...filters, courseType: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All course types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All course types</SelectItem>
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
              <Label htmlFor="sync-status">Sync Status</Label>
              <Select value={filters.syncStatus} onValueChange={(value) => setFilters({ ...filters, syncStatus: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="up_to_date">Up to Date</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="outdated">Outdated</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Class Groups List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Class Groups ({filteredGroups.length})
              </CardTitle>
              <CardDescription>Select groups to synchronize</CardDescription>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={selectedGroups.length === filteredGroups.length && filteredGroups.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <Label htmlFor="select-all">Select All</Label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredGroups.map((group) => (
              <div key={group.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                <Checkbox
                  id={group.id}
                  checked={selectedGroups.includes(group.id)}
                  onCheckedChange={(checked) => handleGroupSelection(group.id, checked as boolean)}
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium">{group.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {group.courseType} • {group.studentCount} students • Unit {group.currentUnit}, Lesson {group.currentLesson}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Teacher: {group.teacherName} • Last sync: {new Date(group.lastSyncTime).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {getSyncStatusBadge(group.syncStatus)}
                      <Badge variant={group.syncEnabled ? 'default' : 'secondary'}>
                        {group.syncEnabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {filteredGroups.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No class groups found matching the current filters</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Synchronization Operations */}
      {selectedGroups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Synchronization Operations
            </CardTitle>
            <CardDescription>
              Configure and execute synchronization for {selectedGroups.length} selected group(s)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="source-group">Source Group</Label>
                <Select value={syncOperation.sourceGroupId} onValueChange={(value) => setSyncOperation({ ...syncOperation, sourceGroupId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source group" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedGroups.map((groupId) => {
                      const group = classGroups.find(g => g.id === groupId);
                      return group ? (
                        <SelectItem key={groupId} value={groupId}>
                          {group.name}
                        </SelectItem>
                      ) : null;
                    })}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="operation-type">Operation Type</Label>
                <Select value={syncOperation.operationType} onValueChange={(value: any) => setSyncOperation({ ...syncOperation, operationType: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sync">Single Content Sync</SelectItem>
                    <SelectItem value="batch_sync">Batch Sync</SelectItem>
                    <SelectItem value="selective_sync">Selective Sync</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={syncOperation.priority} onValueChange={(value: any) => setSyncOperation({ ...syncOperation, priority: value })}>
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
              
              <div>
                <Label htmlFor="scheduled-time">Schedule for Later (Optional)</Label>
                <Input
                  id="scheduled-time"
                  type="datetime-local"
                  value={syncOperation.scheduledTime || ''}
                  onChange={(e) => setSyncOperation({ ...syncOperation, scheduledTime: e.target.value })}
                />
              </div>
            </div>
            
            <Separator />
            
            <div className="flex space-x-3">
              <Button 
                onClick={executeSync} 
                disabled={!syncOperation.sourceGroupId || isExecuting}
                className="flex items-center gap-2"
              >
                {isExecuting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Execute Now
              </Button>
              
              {syncOperation.scheduledTime && (
                <Button 
                  onClick={scheduleSync} 
                  variant="outline"
                  disabled={!syncOperation.sourceGroupId || isExecuting}
                  className="flex items-center gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  Schedule
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Operation Result */}
      {operationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {operationResult.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              Operation Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            {operationResult.success ? (
              <div className="space-y-2">
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Synchronization operation completed successfully.
                  </AlertDescription>
                </Alert>
                
                {operationResult.data && Array.isArray(operationResult.data) && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {operationResult.data.length} operation(s) executed
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {operationResult.error?.message || 'Operation failed'}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}