'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Calendar,
  Clock,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Eye,
  X,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { leaveRequestService } from '@/lib/services/leave-request-service';
import type {
  LeaveRequest,
  LeaveRequestStatus,
  LEAVE_REQUEST_TYPE_LABELS,
  LEAVE_REQUEST_STATUS_LABELS,
  LEAVE_REQUEST_STATUS_COLORS
} from '@/types/hours';
import { formatDate, formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface LeaveRequestListProps {
  studentId: string;
  onRequestUpdate?: () => void;
}

export function LeaveRequestList({ studentId, onRequestUpdate }: LeaveRequestListProps) {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [filter, setFilter] = useState<LeaveRequestStatus | 'all'>('all');
  const { toast } = useToast();

  useEffect(() => {
    loadRequests();
  }, [studentId, filter]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const result = await leaveRequestService.getStudentLeaveRequests(
        studentId,
        {
          status: filter === 'all' ? undefined : filter,
          limit: 50
        }
      );

      if (result.success && result.data) {
        setRequests(result.data.items);
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

  const handleViewDetails = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setDetailsDialogOpen(true);
  };

  const handleCancelRequest = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setCancelDialogOpen(true);
  };

  const confirmCancelRequest = async () => {
    if (!selectedRequest) return;

    try {
      setCancelling(true);
      const result = await leaveRequestService.cancelLeaveRequest(selectedRequest.id);

      if (result.success) {
        toast({
          title: 'Request cancelled',
          description: 'Your leave request has been cancelled successfully',
        });
        loadRequests();
        onRequestUpdate?.();
      } else {
        throw new Error(result.error?.message || 'Failed to cancel request');
      }
    } catch (error) {
      toast({
        title: 'Cancellation failed',
        description: error instanceof Error ? error.message : 'Failed to cancel leave request',
        variant: 'destructive',
      });
    } finally {
      setCancelling(false);
      setCancelDialogOpen(false);
      setSelectedRequest(null);
    }
  };

  const getStatusIcon = (status: LeaveRequestStatus) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      case 'cancelled':
        return <X className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getRefundBadge = (request: LeaveRequest) => {
    if (!request.refundProcessed && request.hoursToRefund === 0) {
      return <Badge variant="secondary">No Refund</Badge>;
    }
    
    if (request.refundProcessed) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800">
          {request.refundPercentage}% Refunded
        </Badge>
      );
    }
    
    if (request.status === 'approved' && request.hoursToRefund > 0) {
      return <Badge variant="outline">Refund Pending</Badge>;
    }
    
    if (request.hoursToRefund > 0) {
      return (
        <Badge variant="outline">
          {request.refundPercentage}% Expected
        </Badge>
      );
    }
    
    return null;
  };

  const renderRequestDetails = () => {
    if (!selectedRequest) return null;

    return (
      <div className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-sm text-muted-foreground">Class Date</h4>
            <div className="flex items-center gap-2 mt-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{formatDate(selectedRequest.classDate)}</span>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-sm text-muted-foreground">Class Time</h4>
            <div className="flex items-center gap-2 mt-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{selectedRequest.classTime}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-sm text-muted-foreground">Class Type</h4>
            <p className="mt-1">{selectedRequest.classType}</p>
          </div>
          {selectedRequest.teacherName && (
            <div>
              <h4 className="font-medium text-sm text-muted-foreground">Teacher</h4>
              <p className="mt-1">{selectedRequest.teacherName}</p>
            </div>
          )}
        </div>

        {/* Leave Information */}
        <div className="border-t pt-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <h4 className="font-medium text-sm text-muted-foreground">Leave Type</h4>
              <p className="mt-1">{LEAVE_REQUEST_TYPE_LABELS[selectedRequest.leaveType]}</p>
            </div>
            <div>
              <h4 className="font-medium text-sm text-muted-foreground">Status</h4>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={LEAVE_REQUEST_STATUS_COLORS[selectedRequest.status]}>
                  {getStatusIcon(selectedRequest.status)}
                  <span className="ml-1">{LEAVE_REQUEST_STATUS_LABELS[selectedRequest.status]}</span>
                </Badge>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-sm text-muted-foreground">Reason</h4>
            <p className="mt-1 text-sm leading-relaxed">{selectedRequest.reason}</p>
          </div>

          {selectedRequest.additionalNotes && (
            <div>
              <h4 className="font-medium text-sm text-muted-foreground">Additional Notes</h4>
              <p className="mt-1 text-sm leading-relaxed">{selectedRequest.additionalNotes}</p>
            </div>
          )}
        </div>

        {/* Submission Details */}
        <div className="border-t pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-sm text-muted-foreground">Submitted</h4>
              <p className="mt-1 text-sm">{formatDateTime(selectedRequest.submittedAt)}</p>
            </div>
            <div>
              <h4 className="font-medium text-sm text-muted-foreground">Notice Period</h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm">{selectedRequest.hoursBeforeClass.toFixed(1)} hours</span>
                {selectedRequest.meets48HourRule ? (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    48h Rule Met
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    48h Rule Not Met
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Refund Information */}
        <div className="border-t pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-sm text-muted-foreground">Hours to Refund</h4>
              <p className="mt-1">{selectedRequest.hoursToRefund} hour{selectedRequest.hoursToRefund !== 1 ? 's' : ''}</p>
            </div>
            <div>
              <h4 className="font-medium text-sm text-muted-foreground">Refund Status</h4>
              <div className="mt-1">
                {getRefundBadge(selectedRequest)}
              </div>
            </div>
          </div>
        </div>

        {/* Review Information */}
        {(selectedRequest.reviewedAt || selectedRequest.reviewNotes) && (
          <div className="border-t pt-4">
            {selectedRequest.reviewedAt && (
              <div className="mb-2">
                <h4 className="font-medium text-sm text-muted-foreground">Reviewed</h4>
                <p className="mt-1 text-sm">{formatDateTime(selectedRequest.reviewedAt)}</p>
              </div>
            )}
            {selectedRequest.reviewNotes && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground">Review Notes</h4>
                <p className="mt-1 text-sm leading-relaxed">{selectedRequest.reviewNotes}</p>
              </div>
            )}
          </div>
        )}

        {/* Medical Certificate */}
        {selectedRequest.medicalCertificateUrl && (
          <div className="border-t pt-4">
            <h4 className="font-medium text-sm text-muted-foreground">Medical Certificate</h4>
            <div className="flex items-center gap-2 mt-1">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <a
                href={selectedRequest.medicalCertificateUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                View Certificate
              </a>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leave Requests</CardTitle>
          <CardDescription>Your submitted leave requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Leave Requests</CardTitle>
              <CardDescription>Your submitted leave requests and their status</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={loadRequests}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You haven't submitted any leave requests yet.
              </AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Refund</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{formatDate(request.classDate)}</div>
                          <div className="text-sm text-muted-foreground">{request.classTime}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-sm">{LEAVE_REQUEST_TYPE_LABELS[request.leaveType]}</div>
                        <div className="text-xs text-muted-foreground">{request.classType}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate text-sm" title={request.reason}>
                        {request.reason}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('text-xs', LEAVE_REQUEST_STATUS_COLORS[request.status])}>
                        {getStatusIcon(request.status)}
                        <span className="ml-1">{LEAVE_REQUEST_STATUS_LABELS[request.status]}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {getRefundBadge(request)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(request.submittedAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetails(request)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {request.status === 'pending' && (
                            <DropdownMenuItem 
                              onClick={() => handleCancelRequest(request)}
                              className="text-red-600"
                            >
                              <X className="h-4 w-4 mr-2" />
                              Cancel Request
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Leave Request Details</DialogTitle>
            <DialogDescription>
              Complete information about your leave request
            </DialogDescription>
          </DialogHeader>
          {renderRequestDetails()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Leave Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this leave request? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="py-4">
              <div className="text-sm">
                <strong>Class:</strong> {formatDate(selectedRequest.classDate)} at {selectedRequest.classTime}
              </div>
              <div className="text-sm mt-1">
                <strong>Type:</strong> {LEAVE_REQUEST_TYPE_LABELS[selectedRequest.leaveType]}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              disabled={cancelling}
            >
              Keep Request
            </Button>
            <Button
              variant="destructive"
              onClick={confirmCancelRequest}
              disabled={cancelling}
            >
              {cancelling ? 'Cancelling...' : 'Cancel Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}