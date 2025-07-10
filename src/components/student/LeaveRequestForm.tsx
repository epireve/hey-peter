'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Clock, 
  AlertTriangle, 
  Info, 
  CheckCircle,
  FileText,
  User,
  BookOpen,
  Send
} from 'lucide-react';
import { leaveRequestService } from '@/lib/services';
import { LeaveRequestForm as LeaveRequestFormType, LeaveRequestWithDetails } from '@/types/hour-management';

interface LeaveRequestFormProps {
  studentId: string;
  onSuccess?: () => void;
  className?: string;
}

export function LeaveRequestForm({ 
  studentId, 
  onSuccess,
  className = '' 
}: LeaveRequestFormProps) {
  const [formData, setFormData] = useState<Partial<LeaveRequestFormType>>({
    student_id: studentId,
    leave_type: 'personal'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [eligibilityCheck, setEligibilityCheck] = useState<{
    canSubmit: boolean;
    reason?: string;
  } | null>(null);
  const [recentRequests, setRecentRequests] = useState<LeaveRequestWithDetails[]>([]);

  useEffect(() => {
    loadRecentRequests();
  }, [studentId]);

  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      checkEligibility();
    }
  }, [formData.start_date, formData.end_date]);

  const loadRecentRequests = async () => {
    try {
      const response = await leaveRequestService.getStudentLeaveRequests(studentId);
      if (response.success && response.data) {
        // Show only recent requests (last 30 days or pending/approved)
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 30);
        
        const filtered = response.data.filter(request => 
          new Date(request.created_at) >= cutoffDate || 
          ['pending', 'approved'].includes(request.status)
        );
        
        setRecentRequests(filtered);
      }
    } catch (err) {
      console.error('Error loading recent requests:', err);
    }
  };

  const checkEligibility = async () => {
    if (!formData.start_date || !formData.end_date) return;
    
    try {
      const response = await leaveRequestService.canSubmitLeaveRequest(
        studentId,
        formData.start_date,
        formData.end_date
      );
      
      if (response.success && response.data) {
        setEligibilityCheck(response.data);
      }
    } catch (err) {
      console.error('Error checking eligibility:', err);
    }
  };

  const handleInputChange = (field: keyof LeaveRequestFormType, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const validateForm = (): string | null => {
    if (!formData.start_date) return 'Start date is required';
    if (!formData.end_date) return 'End date is required';
    if (!formData.leave_type) return 'Leave type is required';
    
    const startDate = new Date(formData.start_date);
    const endDate = new Date(formData.end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (startDate < today) return 'Start date cannot be in the past';
    if (endDate < startDate) return 'End date must be after start date';
    
    // Check advance notice (at least 24 hours for most leave types)
    const advanceHours = (startDate.getTime() - new Date().getTime()) / (1000 * 60 * 60);
    const minAdvanceHours = formData.leave_type === 'emergency' ? 0 : 24;
    
    if (advanceHours < minAdvanceHours && formData.leave_type !== 'emergency') {
      return `Leave requests must be submitted at least ${minAdvanceHours} hours in advance`;
    }
    
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (eligibilityCheck && !eligibilityCheck.canSubmit) {
      setError(eligibilityCheck.reason || 'Cannot submit leave request');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await leaveRequestService.submitLeaveRequest(
        formData as LeaveRequestFormType
      );
      
      if (response.success) {
        setSuccess(true);
        setFormData({
          student_id: studentId,
          leave_type: 'personal'
        });
        setTimeout(() => {
          setSuccess(false);
          onSuccess?.();
          loadRecentRequests();
        }, 3000);
      } else {
        setError(response.error || 'Failed to submit leave request');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Error submitting leave request:', err);
    } finally {
      setLoading(false);
    }
  };

  const getAdvanceNoticeInfo = () => {
    if (!formData.start_date) return null;
    
    const startDate = new Date(formData.start_date);
    const now = new Date();
    const advanceHours = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (advanceHours < 0) return { type: 'error', message: 'Date is in the past' };
    if (advanceHours < 24) return { type: 'warning', message: `Only ${Math.floor(advanceHours)} hours advance notice` };
    if (advanceHours < 72) return { type: 'info', message: `${Math.floor(advanceHours)} hours advance notice` };
    
    return { type: 'good', message: `Good advance notice (${Math.floor(advanceHours / 24)} days)` };
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

  const advanceNoticeInfo = getAdvanceNoticeInfo();

  if (success) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-green-900 mb-2">
            Leave Request Submitted!
          </h3>
          <p className="text-green-700 mb-4">
            Your leave request has been submitted successfully and is pending approval.
          </p>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-green-800">
              You will receive an email notification when your request is reviewed.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Submit New Request */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-blue-500" />
            Submit Leave Request
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Leave Type */}
          <div className="space-y-2">
            <Label htmlFor="leave_type">Leave Type</Label>
            <Select
              value={formData.leave_type || ''}
              onValueChange={(value) => handleInputChange('leave_type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select leave type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">👤 Personal</SelectItem>
                <SelectItem value="medical">🏥 Medical</SelectItem>
                <SelectItem value="emergency">🚨 Emergency</SelectItem>
                <SelectItem value="vacation">🏖️ Vacation</SelectItem>
                <SelectItem value="other">📄 Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date || ''}
                onChange={(e) => handleInputChange('start_date', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date || ''}
                onChange={(e) => handleInputChange('end_date', e.target.value)}
                min={formData.start_date || new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          {/* Advance Notice Info */}
          {advanceNoticeInfo && (
            <Alert variant={advanceNoticeInfo.type === 'error' ? 'destructive' : 'default'}>
              <Clock className="h-4 w-4" />
              <AlertDescription>{advanceNoticeInfo.message}</AlertDescription>
            </Alert>
          )}

          {/* Eligibility Check */}
          {eligibilityCheck && !eligibilityCheck.canSubmit && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{eligibilityCheck.reason}</AlertDescription>
            </Alert>
          )}

          {/* Optional Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="teacher_id">Specific Teacher (Optional)</Label>
              <Input
                id="teacher_id"
                value={formData.teacher_id || ''}
                onChange={(e) => handleInputChange('teacher_id', e.target.value)}
                placeholder="Teacher ID if requesting leave from specific teacher"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="class_id">Specific Class (Optional)</Label>
              <Input
                id="class_id"
                value={formData.class_id || ''}
                onChange={(e) => handleInputChange('class_id', e.target.value)}
                placeholder="Class ID if requesting leave from specific class"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                value={formData.reason || ''}
                onChange={(e) => handleInputChange('reason', e.target.value)}
                placeholder="Please provide a brief explanation for your leave request..."
                rows={3}
              />
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button 
            onClick={handleSubmit} 
            disabled={loading || (eligibilityCheck && !eligibilityCheck.canSubmit)}
            className="w-full"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit Leave Request
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Recent Requests */}
      {recentRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2 text-gray-500" />
              Recent Leave Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentRequests.map((request) => (
                <div 
                  key={request.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{getLeaveTypeIcon(request.leave_type)}</span>
                    <div>
                      <p className="font-medium">
                        {request.leave_type.charAt(0).toUpperCase() + request.leave_type.slice(1)} Leave
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                      </p>
                      {request.reason && (
                        <p className="text-xs text-gray-500 mt-1">
                          {request.reason.length > 50 
                            ? `${request.reason.substring(0, 50)}...` 
                            : request.reason
                          }
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(request.status)}
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(request.created_at).toLocaleDateString()}
                    </p>
                    {request.hours_affected && (
                      <p className="text-xs text-blue-600 mt-1">
                        {request.hours_affected} hours affected
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leave Policy Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-500 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-medium text-blue-900">Leave Request Policy</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Submit requests at least 24 hours in advance (except emergencies)</li>
                <li>• Medical leaves may require documentation</li>
                <li>• Approved leaves may result in hour refunds depending on the policy</li>
                <li>• You'll receive email notifications about request status</li>
                <li>• Makeup classes may be available for approved leaves</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default LeaveRequestForm;