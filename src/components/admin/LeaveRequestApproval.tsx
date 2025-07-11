'use client';

import { logger } from '@/lib/services';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Calendar, 
  Clock, 
  User, 
  BookOpen, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  MessageSquare,
  Eye,
  Filter,
  RefreshCw
} from 'lucide-react';
import { leaveRequestService } from '@/lib/services';
import { LeaveRequestWithDetails, LeaveRequestFilters } from '@/types/hour-management';

interface LeaveRequestApprovalProps {
  userRole: 'admin' | 'teacher';
  currentUserId: string;
  teacherId?: string; // For teacher view, show only their students' requests
}

export function LeaveRequestApproval({ 
  userRole, 
  currentUserId, 
  teacherId 
}: LeaveRequestApprovalProps) {
  const [requests, setRequests] = useState<LeaveRequestWithDetails[]>([]);
  const [pendingRequests, setPendingRequests] = useState<LeaveRequestWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequestWithDetails | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');

  useEffect(() => {
    loadRequests();
  }, [currentUserId, teacherId]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let pendingResponse;
      let allResponse;
      
      if (userRole === 'teacher' && teacherId) {
        // Teacher view: show requests from their students
        const teacherRequests = await leaveRequestService.getTeacherLeaveRequests(teacherId);
        if (teacherRequests.success && teacherRequests.data) {
          const pending = teacherRequests.data.filter(req => req.status === 'pending');
          setPendingRequests(pending);
          setRequests(teacherRequests.data);
        }
      } else {
        // Admin view: show all requests
        pendingResponse = await leaveRequestService.getPendingLeaveRequests();
        allResponse = await leaveRequestService.getLeaveRequests({}, 1, 100);
        
        if (pendingResponse.success && pendingResponse.data) {
          setPendingRequests(pendingResponse.data);
        }
        
        if (allResponse.success && allResponse.data) {
          setRequests(allResponse.data.data);
        }
      }
      
    } catch (err) {
      setError('Failed to load leave requests');
      logger.error('Error loading requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalAction = async () => {
    if (!selectedRequest) return;

    try {
      setProcessing(true);
      
      let response;
      if (approvalAction === 'approve') {
        response = await leaveRequestService.approveLeaveRequest(
          selectedRequest.id,
          currentUserId,
          adminNotes
        );
      } else {
        response = await leaveRequestService.rejectLeaveRequest(
          selectedRequest.id,
          currentUserId,
          adminNotes
        );
      }
      
      if (response.success) {
        setShowApprovalDialog(false);
        setSelectedRequest(null);
        setAdminNotes('');
        await loadRequests(); // Reload the data
      } else {
        setError(response.error || 'Failed to process request');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      logger.error('Error processing request:', err);
    } finally {
      setProcessing(false);
    }
  };

  const openApprovalDialog = (request: LeaveRequestWithDetails, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setApprovalAction(action);
    setAdminNotes('');
    setShowApprovalDialog(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getLeaveTypeIcon = (type: string) => {
    switch (type) {
      case 'medical':
        return '🏥';
      case 'emergency':
        return '🚨';
      case 'vacation':
        return '🏖️';
      case 'personal':
        return '👤';
      default:
        return '📄';
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary' as const,
      approved: 'default' as const,
      rejected: 'destructive' as const
    };
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getAdvanceNoticeInfo = (request: LeaveRequestWithDetails) => {
    const advanceHours = request.advance_notice_hours || 0;
    
    if (advanceHours < 24) {
      return { type: 'warning', text: `${advanceHours}h notice`, color: 'text-orange-600' };
    } else if (advanceHours < 72) {
      return { type: 'ok', text: `${advanceHours}h notice`, color: 'text-blue-600' };
    } else {
      return { type: 'good', text: `${Math.floor(advanceHours / 24)}d notice`, color: 'text-green-600' };
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentRequests = activeTab === 'pending' ? pendingRequests : requests;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Clock className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold">{pendingRequests.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold">
                  {requests.filter(r => r.status === 'approved').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <XCircle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-2xl font-bold">
                  {requests.filter(r => r.status === 'rejected').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-blue-500" />
              Leave Requests {userRole === 'teacher' ? '(Your Students)' : ''}
            </span>
            <div className="flex items-center space-x-2">
              <Button
                variant={activeTab === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('pending')}
              >
                Pending ({pendingRequests.length})
              </Button>
              <Button
                variant={activeTab === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('all')}
              >
                All Requests
              </Button>
              <Button variant="outline" size="sm" onClick={loadRequests}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentRequests.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {activeTab === 'pending' ? 'No pending leave requests' : 'No leave requests found'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Notice</TableHead>
                    <TableHead>Hours Affected</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentRequests.map((request) => {
                    const noticeInfo = getAdvanceNoticeInfo(request);
                    
                    return (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <User className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="font-medium">{request.student.full_name}</p>
                              <p className="text-sm text-gray-500">{request.student.student_id}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{getLeaveTypeIcon(request.leave_type)}</span>
                            <span className="capitalize">{request.leave_type}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {formatDate(request.start_date)} - {formatDate(request.end_date)}
                            </p>
                            <p className="text-sm text-gray-500">
                              {new Date(request.end_date).getTime() - new Date(request.start_date).getTime() === 0 
                                ? 'Single day'
                                : `${Math.ceil((new Date(request.end_date).getTime() - new Date(request.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1} days`
                              }
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`text-sm font-medium ${noticeInfo.color}`}>
                            {noticeInfo.text}
                          </span>
                        </TableCell>
                        <TableCell>
                          {request.hours_affected ? (
                            <div>
                              <p className="font-medium">{request.hours_affected} hrs</p>
                              {request.hours_recovered > 0 && (
                                <p className="text-sm text-green-600">
                                  {request.hours_recovered} hrs recovered
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedRequest(request)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            {request.status === 'pending' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openApprovalDialog(request, 'approve')}
                                  className="text-green-600 hover:text-green-700"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openApprovalDialog(request, 'reject')}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Details Dialog */}
      {selectedRequest && !showApprovalDialog && (
        <Dialog open={true} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <span className="text-lg mr-2">{getLeaveTypeIcon(selectedRequest.leave_type)}</span>
                Leave Request Details
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Student</label>
                  <p className="font-medium">{selectedRequest.student.full_name}</p>
                  <p className="text-sm text-gray-500">{selectedRequest.student.student_id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Leave Type</label>
                  <p className="capitalize">{selectedRequest.leave_type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Date Range</label>
                  <p>{formatDate(selectedRequest.start_date)} - {formatDate(selectedRequest.end_date)}</p>
                </div>
              </div>
              
              {selectedRequest.reason && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Reason</label>
                  <p className="mt-1 p-3 bg-gray-50 rounded-lg">{selectedRequest.reason}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Hours Affected</label>
                  <p>{selectedRequest.hours_affected || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Advance Notice</label>
                  <p>{selectedRequest.advance_notice_hours ? `${selectedRequest.advance_notice_hours} hours` : 'Not calculated'}</p>
                </div>
              </div>
              
              {selectedRequest.admin_notes && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Admin Notes</label>
                  <p className="mt-1 p-3 bg-blue-50 rounded-lg">{selectedRequest.admin_notes}</p>
                </div>
              )}
              
              <div className="pt-4 border-t text-sm text-gray-500">
                <p>Submitted: {formatDate(selectedRequest.created_at)}</p>
                {selectedRequest.approved_at && selectedRequest.approved_by_user && (
                  <p>Approved: {formatDate(selectedRequest.approved_at)} by {selectedRequest.approved_by_user.full_name}</p>
                )}
                {selectedRequest.rejected_at && selectedRequest.rejected_by_user && (
                  <p>Rejected: {formatDate(selectedRequest.rejected_at)} by {selectedRequest.rejected_by_user.full_name}</p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Approval/Rejection Dialog */}
      {showApprovalDialog && selectedRequest && (
        <Dialog open={true} onOpenChange={() => setShowApprovalDialog(false)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {approvalAction === 'approve' ? 'Approve' : 'Reject'} Leave Request
              </DialogTitle>
              <DialogDescription>
                {approvalAction === 'approve' 
                  ? 'Approving this request will refund any affected hours to the student.'
                  : 'Rejecting this request will not refund any hours.'
                }
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium">{selectedRequest.student.full_name}</p>
                <p className="text-sm text-gray-600">
                  {selectedRequest.leave_type.charAt(0).toUpperCase() + selectedRequest.leave_type.slice(1)} leave
                  from {formatDate(selectedRequest.start_date)} to {formatDate(selectedRequest.end_date)}
                </p>
                {selectedRequest.hours_affected && (
                  <p className="text-sm text-blue-600 mt-1">
                    {selectedRequest.hours_affected} hours affected
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Admin Notes {approvalAction === 'reject' && '(Required)'}
                </label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder={
                    approvalAction === 'approve' 
                      ? 'Optional notes about the approval...'
                      : 'Please provide a reason for rejection...'
                  }
                  rows={3}
                />
              </div>
              
              {approvalAction === 'reject' && !adminNotes.trim() && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Please provide a reason for rejecting this request.
                  </AlertDescription>
                </Alert>
              )}
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowApprovalDialog(false)}
                disabled={processing}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleApprovalAction}
                disabled={processing || (approvalAction === 'reject' && !adminNotes.trim())}
                variant={approvalAction === 'approve' ? 'default' : 'destructive'}
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    {approvalAction === 'approve' ? (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    {approvalAction === 'approve' ? 'Approve Request' : 'Reject Request'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default LeaveRequestApproval;