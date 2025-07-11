'use client';

import { logger } from '@/lib/services';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DataTable } from '@/components/ui/data-table';
import { 
  Clock, 
  Calendar, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  User,
  BookOpen,
  MoreHorizontal,
  Filter,
  Download,
  RefreshCw,
  Eye,
  Edit,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { autoPostponementService, type PostponementSummary } from '@/lib/services/auto-postponement-service';
import { useToast } from '@/hooks/use-toast';

interface PostponementManagementProps {
  userId: string;
}

export function PostponementManagement({ userId }: PostponementManagementProps) {
  const [postponements, setPostponements] = useState<PostponementSummary[]>([]);
  const [pendingMakeUps, setPendingMakeUps] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPostponement, setSelectedPostponement] = useState<PostponementSummary | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    reason: '',
    dateRange: '7d',
  });
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [postponementsData, pendingData, analyticsData] = await Promise.all([
        autoPostponementService.getPostponementSummary(100),
        autoPostponementService.getPendingMakeUpClasses(50),
        autoPostponementService.getPostponementAnalytics(getDateRange())
      ]);

      setPostponements(postponementsData);
      setPendingMakeUps(pendingData);
      setAnalytics(analyticsData);
    } catch (error) {
      logger.error('Error loading data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = () => {
    const end = new Date().toISOString();
    const start = new Date();
    
    switch (filters.dateRange) {
      case '7d':
        start.setDate(start.getDate() - 7);
        break;
      case '30d':
        start.setDate(start.getDate() - 30);
        break;
      case '90d':
        start.setDate(start.getDate() - 90);
        break;
      default:
        start.setDate(start.getDate() - 7);
    }

    return { start: start.toISOString(), end };
  };

  const handleApproveMakeUp = async (makeUpClassId: string) => {
    try {
      const success = await autoPostponementService.approveMakeUpClass({
        make_up_class_id: makeUpClassId,
        admin_user_id: userId,
      });

      if (success) {
        toast({
          title: "Make-up Class Approved",
          description: "The make-up class has been approved and scheduled.",
        });
        loadData();
      }
    } catch (error) {
      logger.error('Error approving make-up class:', error);
      toast({
        title: "Approval Failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const postponementColumns = [
    {
      accessorKey: 'student_name',
      header: 'Student',
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-gray-500" />
          <div>
            <p className="font-medium">{row.original.student_name}</p>
            <p className="text-sm text-gray-500">{row.original.student_email}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'original_class_name',
      header: 'Class',
      cell: ({ row }: any) => (
        <div>
          <p className="font-medium">{row.original.original_class_name}</p>
          <p className="text-sm text-gray-500">{row.original.teacher_name}</p>
        </div>
      ),
    },
    {
      accessorKey: 'original_start_time',
      header: 'Original Time',
      cell: ({ row }: any) => (
        <div className="text-sm">
          {new Date(row.original.original_start_time).toLocaleString()}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: any) => (
        <Badge variant="outline" className={getStatusColor(row.original.status)}>
          {row.original.status.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      accessorKey: 'hours_affected',
      header: 'Hours',
      cell: ({ row }: any) => (
        <span className="font-medium">{row.original.hours_affected}</span>
      ),
    },
    {
      accessorKey: 'leave_reason',
      header: 'Reason',
      cell: ({ row }: any) => (
        <span className="text-sm">{row.original.leave_reason}</span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedPostponement(row.original)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {/* Handle edit */}}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const makeUpColumns = [
    {
      accessorKey: 'student_name',
      header: 'Student',
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-gray-500" />
          <div>
            <p className="font-medium">{row.original.student_name}</p>
            <p className="text-sm text-gray-500">{row.original.student_email}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'original_class_name',
      header: 'Original Class',
      cell: ({ row }: any) => (
        <div>
          <p className="font-medium">{row.original.original_class_name}</p>
          <p className="text-sm text-gray-500">
            {new Date(row.original.original_start_time).toLocaleString()}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'suggested_class_name',
      header: 'Suggested Class',
      cell: ({ row }: any) => (
        <div>
          <p className="font-medium">{row.original.suggested_class_name}</p>
          <p className="text-sm text-gray-500">{row.original.suggested_teacher_name}</p>
        </div>
      ),
    },
    {
      accessorKey: 'compatibility_score',
      header: 'Compatibility',
      cell: ({ row }: any) => (
        <div className="text-center">
          <div className="font-medium">
            {Math.round((row.original.compatibility_score || 0) * 100)}%
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
            <div 
              className="bg-blue-600 h-2 rounded-full" 
              style={{ width: `${(row.original.compatibility_score || 0) * 100}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: any) => (
        <Badge variant="outline" className={getMakeUpStatusColor(row.original.status)}>
          {row.original.status.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          {row.original.status === 'student_selected' && (
            <Button
              size="sm"
              onClick={() => handleApproveMakeUp(row.original.id)}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Approve
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {/* Handle view details */}}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'make_up_scheduled':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getMakeUpStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'suggested':
        return 'bg-blue-100 text-blue-800';
      case 'student_selected':
        return 'bg-purple-100 text-purple-800';
      case 'admin_approved':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading postponement data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Postponement Management</h2>
          <p className="text-gray-600 mt-1">
            Manage class postponements and make-up class approvals
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Analytics Overview */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Postponements</p>
                  <p className="text-2xl font-bold">{analytics.total_postponements}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Hours Affected</p>
                  <p className="text-2xl font-bold">{analytics.total_hours_affected}</p>
                </div>
                <Calendar className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Make-ups</p>
                  <p className="text-2xl font-bold">{pendingMakeUps.length}</p>
                </div>
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Hours/Case</p>
                  <p className="text-2xl font-bold">{analytics.average_hours_per_postponement.toFixed(1)}</p>
                </div>
                <BookOpen className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
              <Label htmlFor="status">Status</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="make_up_scheduled">Make-up Scheduled</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="reason">Reason</Label>
              <Select value={filters.reason} onValueChange={(value) => setFilters({...filters, reason: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="All reasons" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All reasons</SelectItem>
                  <SelectItem value="student_leave">Student Leave</SelectItem>
                  <SelectItem value="teacher_unavailable">Teacher Unavailable</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="system_maintenance">System Maintenance</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="dateRange">Date Range</Label>
              <Select value={filters.dateRange} onValueChange={(value) => setFilters({...filters, dateRange: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="postponements" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="postponements">
            Postponements ({postponements.length})
          </TabsTrigger>
          <TabsTrigger value="makeups">
            Make-up Approvals ({pendingMakeUps.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="postponements">
          <Card>
            <CardHeader>
              <CardTitle>Class Postponements</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={postponementColumns}
                data={postponements}
                searchable
                searchPlaceholder="Search postponements..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="makeups">
          <Card>
            <CardHeader>
              <CardTitle>Make-up Class Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={makeUpColumns}
                data={pendingMakeUps}
                searchable
                searchPlaceholder="Search make-up classes..."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Postponement Details Dialog */}
      <Dialog open={!!selectedPostponement} onOpenChange={() => setSelectedPostponement(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Postponement Details</DialogTitle>
          </DialogHeader>
          {selectedPostponement && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Student</Label>
                  <p className="font-medium">{selectedPostponement.student_name}</p>
                  <p className="text-sm text-gray-500">{selectedPostponement.student_email}</p>
                </div>
                <div>
                  <Label>Class</Label>
                  <p className="font-medium">{selectedPostponement.original_class_name}</p>
                  <p className="text-sm text-gray-500">{selectedPostponement.teacher_name}</p>
                </div>
                <div>
                  <Label>Original Time</Label>
                  <p>{new Date(selectedPostponement.original_start_time).toLocaleString()}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge variant="outline" className={getStatusColor(selectedPostponement.status)}>
                    {selectedPostponement.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <Label>Hours Affected</Label>
                  <p>{selectedPostponement.hours_affected}</p>
                </div>
                <div>
                  <Label>Reason</Label>
                  <p>{selectedPostponement.leave_reason}</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSelectedPostponement(null)}>
                  Close
                </Button>
                <Button>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Contact Student
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}