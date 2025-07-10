'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  Clock,
  FileText,
  MoreHorizontal,
  Search,
  Filter,
  Download,
  User,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { leaveRulesService } from '@/lib/services/leave-rules-service';
import type {
  LeaveRequest,
  LeaveRequestValidation,
  ApprovalStatus
} from '@/types/hours';
import { formatDate, formatDateTime } from '@/lib/utils';

interface LeaveRequestDetailsProps {
  request: LeaveRequest;
  onClose: () => void;
  onApprove: (requestId: string, notes?: string, hoursApproved?: number) => void;
  onReject: (requestId: string, notes: string) => void;
}

function LeaveRequestDetails({ request, onClose, onApprove, onReject }: LeaveRequestDetailsProps) {
  const [approvalNotes, setApprovalNotes] = useState('');
  const [hoursApproved, setHoursApproved] = useState(request.totalHoursRequested);
  const [violations, setViolations] = useState<any[]>([]);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);

  useEffect(() => {
    loadViolations();
  }, [request.id]);

  const loadViolations = async () => {
    try {
      const result = await leaveRulesService.getLeaveRequestViolations(request.id);
      if (result.success) {
        setViolations(result.data || []);
      }
    } catch (error) {
      console.error('Failed to load violations:', error);
    }
  };

  const validation = request.ruleValidationResults as LeaveRequestValidation | undefined;

  const handleApprove = () => {
    onApprove(request.id, approvalNotes, hoursApproved);
    setShowApprovalDialog(false);
    onClose();
  };

  const handleReject = () => {
    if (!approvalNotes.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    onReject(request.id, approvalNotes);
    setShowRejectionDialog(false);
    onClose();
  };

  const getStatusColor = (status: ApprovalStatus) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getLeaveTypeColor = (type: string) => {
    switch (type) {
      case 'medical':
        return 'bg-blue-100 text-blue-800';
      case 'vacation':
        return 'bg-green-100 text-green-800';
      case 'emergency':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold">Leave Request Details</h3>
          <p className="text-sm text-muted-foreground">
            Submitted {formatDateTime(request.createdAt)}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge className={getStatusColor(request.approvalStatus)}>
            {request.approvalStatus}
          </Badge>
          <Badge className={getLeaveTypeColor(request.leaveType)}>
            {request.leaveType}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Request Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <Label className="font-medium">Student ID</Label>
                <p>{request.studentId}</p>
              </div>
              <div>
                <Label className="font-medium">Leave Type</Label>
                <p className="capitalize">{request.leaveType}</p>
              </div>
              <div>
                <Label className="font-medium">Start Date</Label>
                <p>{formatDate(request.startDate)}</p>
              </div>
              <div>
                <Label className="font-medium">End Date</Label>
                <p>{formatDate(request.endDate)}</p>
              </div>
              <div>
                <Label className="font-medium">Total Hours</Label>
                <p>{request.totalHoursRequested}</p>
              </div>
              <div>
                <Label className="font-medium">Duration</Label>
                <p>{Math.ceil((new Date(request.endDate).getTime() - new Date(request.startDate).getTime()) / (1000 * 60 * 60 * 24))} days</p>
              </div>
            </div>
            <div>
              <Label className="font-medium">Reason</Label>
              <p className="text-sm mt-1">{request.reason}</p>
            </div>
            {request.notes && (
              <div>
                <Label className="font-medium">Additional Notes</Label>
                <p className="text-sm mt-1">{request.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Affected Classes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {request.affectedClasses.map((cls, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium text-sm">{cls.className}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(cls.classDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{cls.hoursToRefund}h</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {validation && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Rule Validation Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <p className="font-medium">Rules Checked</p>
                  <p className="text-2xl font-bold">{validation.summary.totalRulesChecked}</p>
                </div>
                <div className="text-center">
                  <p className="font-medium">Violations</p>
                  <p className="text-2xl font-bold text-red-600">{validation.summary.rulesViolated}</p>
                </div>
                <div className="text-center">
                  <p className="font-medium">Can Proceed</p>
                  <p className="text-2xl font-bold text-green-600">{validation.summary.canProceed ? 'Yes' : 'No'}</p>
                </div>
                <div className="text-center">
                  <p className="font-medium">Requires Approval</p>
                  <p className="text-2xl font-bold text-yellow-600">{validation.summary.requiresApproval ? 'Yes' : 'No'}</p>
                </div>
              </div>

              {validation.errors.length > 0 && (
                <div>
                  <h4 className="font-medium text-red-600 mb-2">Rule Violations</h4>
                  <div className="space-y-2">
                    {validation.errors.map((error, index) => (
                      <div key={index} className="flex items-start gap-2 p-2 bg-red-50 rounded">
                        <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-sm">{error.ruleName}</p>
                          <p className="text-sm text-red-700">{error.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {validation.warnings.length > 0 && (
                <div>
                  <h4 className="font-medium text-yellow-600 mb-2">Warnings</h4>
                  <div className="space-y-2">
                    {validation.warnings.map((warning, index) => (
                      <div key={index} className="flex items-start gap-2 p-2 bg-yellow-50 rounded">
                        <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-sm">{warning.ruleName}</p>
                          <p className="text-sm text-yellow-700">{warning.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {request.approvalStatus === 'pending' && (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setShowRejectionDialog(true)}
            className="text-red-600 hover:text-red-700"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Reject Request
          </Button>
          <Button
            onClick={() => setShowApprovalDialog(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Approve Request
          </Button>
        </div>
      )}

      {request.approvalStatus === 'approved' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-green-600">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Approved by:</span>
                <span>{request.approvedBy}</span>
              </div>
              <div className="flex justify-between">
                <span>Approved at:</span>
                <span>{request.approvedAt ? formatDateTime(request.approvedAt) : 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span>Hours approved:</span>
                <span>{request.totalHoursApproved || request.totalHoursRequested}</span>
              </div>
              {request.approvalNotes && (
                <div>
                  <Label className="font-medium">Approval Notes</Label>
                  <p className="mt-1">{request.approvalNotes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {request.approvalStatus === 'rejected' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-red-600">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Rejected by:</span>
                <span>{request.approvedBy}</span>
              </div>
              <div className="flex justify-between">
                <span>Rejected at:</span>
                <span>{request.approvedAt ? formatDateTime(request.approvedAt) : 'N/A'}</span>
              </div>
              {request.approvalNotes && (
                <div>
                  <Label className="font-medium">Rejection Reason</Label>
                  <p className="mt-1">{request.approvalNotes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Leave Request</DialogTitle>
            <DialogDescription>
              Review and approve this leave request
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Hours to Approve</Label>
              <Input
                type="number"
                value={hoursApproved}
                onChange={(e) => setHoursApproved(parseFloat(e.target.value) || 0)}
                max={request.totalHoursRequested}
                min={0}
              />
              <p className="text-sm text-muted-foreground">
                Requested: {request.totalHoursRequested} hours
              </p>
            </div>
            <div className="space-y-2">
              <Label>Approval Notes (Optional)</Label>
              <Textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Add any notes about this approval..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
              Approve Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this leave request
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Rejection Reason</Label>
              <Textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Explain why this request is being rejected..."
                rows={4}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleReject} variant="destructive">
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function LeaveRequestsManagement() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<ApprovalStatus | 'all'>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    loadRequests();
  }, [pagination.page, filterStatus, filterType]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const result = await leaveRulesService.getLeaveRequests({
        status: filterStatus === 'all' ? undefined : filterStatus,
        limit: pagination.limit,
        offset: (pagination.page - 1) * pagination.limit
      });
      
      if (result.success && result.data) {
        setRequests(result.data.items);
        setPagination(prev => ({
          ...prev,
          total: result.data.pagination.total,
          totalPages: result.data.pagination.totalPages
        }));
      } else {
        throw new Error(result.error?.message || 'Failed to load requests');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load leave requests',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (requestId: string, notes?: string, hoursApproved?: number) => {
    try {
      const result = await leaveRulesService.approveLeaveRequest(requestId, {
        approvalNotes: notes,
        hoursApproved
      });
      
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Leave request approved successfully',
        });
        loadRequests();
      } else {
        throw new Error(result.error?.message || 'Failed to approve request');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to approve request',
        variant: 'destructive',
      });
    }
  };

  const handleRejectRequest = async (requestId: string, notes: string) => {
    try {
      const result = await leaveRulesService.rejectLeaveRequest(requestId, {
        approvalNotes: notes
      });
      
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Leave request rejected',
        });
        loadRequests();
      } else {
        throw new Error(result.error?.message || 'Failed to reject request');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reject request',
        variant: 'destructive',
      });
    }
  };

  const openDetailsDialog = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setShowDetailsDialog(true);
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = request.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.studentId.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getStatusColor = (status: ApprovalStatus) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getLeaveTypeColor = (type: string) => {
    switch (type) {
      case 'medical':
        return 'bg-blue-100 text-blue-800';
      case 'vacation':
        return 'bg-green-100 text-green-800';
      case 'emergency':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

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
          <h3 className="text-lg font-semibold">Leave Requests</h3>
          <p className="text-sm text-muted-foreground">
            Review and manage student leave requests
          </p>
        </div>
        <Button onClick={loadRequests}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="flex gap-4 items-center">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search requests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
        </div>
        <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="medical">Medical</SelectItem>
            <SelectItem value="vacation">Vacation</SelectItem>
            <SelectItem value="emergency">Emergency</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{request.studentId.slice(0, 8)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getLeaveTypeColor(request.leaveType)}>
                      {request.leaveType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{formatDate(request.startDate)}</div>
                      <div className="text-muted-foreground">to {formatDate(request.endDate)}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{request.totalHoursRequested}h requested</div>
                      {request.totalHoursApproved && (
                        <div className="text-muted-foreground">{request.totalHoursApproved}h approved</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(request.approvalStatus)}>
                      {request.approvalStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatDate(request.createdAt)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDetailsDialog(request)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      {request.approvalStatus === 'pending' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleApproveRequest(request.id)}>
                              <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                              Quick Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRejectRequest(request.id, 'Rejected by admin')}>
                              <XCircle className="h-4 w-4 mr-2 text-red-600" />
                              Quick Reject
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} requests
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
            disabled={pagination.page === 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
            disabled={pagination.page === pagination.totalPages}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedRequest && (
            <LeaveRequestDetails
              request={selectedRequest}
              onClose={() => setShowDetailsDialog(false)}
              onApprove={handleApproveRequest}
              onReject={handleRejectRequest}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}