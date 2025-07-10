'use client';

import React, { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
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
import { 
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Upload,
  FileText,
  Info
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { leaveRequestService } from '@/lib/services/leave-request-service';
import type {
  LeaveRequestSubmission,
  LeaveRequestValidation,
  LeaveRequestType,
  LEAVE_REQUEST_TYPE_LABELS
} from '@/types/hours';
import { formatDate, formatDateTime } from '@/lib/utils';

const leaveRequestSchema = z.object({
  classId: z.string().min(1, 'Class is required'),
  bookingId: z.string().optional(),
  classDate: z.string().min(1, 'Class date is required'),
  classTime: z.string().min(1, 'Class time is required'),
  classType: z.string().min(1, 'Class type is required'),
  teacherId: z.string().optional(),
  teacherName: z.string().optional(),
  reason: z.string().min(10, 'Please provide a detailed reason (minimum 10 characters)'),
  leaveType: z.enum(['sick', 'emergency', 'personal', 'work', 'family', 'travel', 'other']),
  medicalCertificateUrl: z.string().optional(),
  additionalNotes: z.string().optional(),
});

type LeaveRequestFormData = z.infer<typeof leaveRequestSchema>;

interface LeaveRequestFormProps {
  studentId: string;
  classInfo?: {
    classId: string;
    bookingId?: string;
    classDate: string;
    classTime: string;
    classType: string;
    teacherId?: string;
    teacherName?: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function LeaveRequestForm({
  studentId,
  classInfo,
  open,
  onOpenChange,
  onSuccess
}: LeaveRequestFormProps) {
  const [loading, setLoading] = useState(false);
  const [validation, setValidation] = useState<LeaveRequestValidation | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [uploadingCertificate, setUploadingCertificate] = useState(false);
  const { toast } = useToast();

  const form = useForm<LeaveRequestFormData>({
    resolver: zodResolver(leaveRequestSchema),
    defaultValues: {
      classId: classInfo?.classId || '',
      bookingId: classInfo?.bookingId || '',
      classDate: classInfo?.classDate || '',
      classTime: classInfo?.classTime || '',
      classType: classInfo?.classType || '',
      teacherId: classInfo?.teacherId || '',
      teacherName: classInfo?.teacherName || '',
      reason: '',
      leaveType: 'sick',
      medicalCertificateUrl: '',
      additionalNotes: '',
    },
  });

  const watchedClassDate = form.watch('classDate');
  const watchedLeaveType = form.watch('leaveType');

  // Auto-validate when class date or leave type changes
  useEffect(() => {
    if (watchedClassDate && watchedLeaveType) {
      validateRequest();
    }
  }, [watchedClassDate, watchedLeaveType]);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open && classInfo) {
      form.reset({
        classId: classInfo.classId,
        bookingId: classInfo.bookingId || '',
        classDate: classInfo.classDate,
        classTime: classInfo.classTime,
        classType: classInfo.classType,
        teacherId: classInfo.teacherId || '',
        teacherName: classInfo.teacherName || '',
        reason: '',
        leaveType: 'sick',
        medicalCertificateUrl: '',
        additionalNotes: '',
      });
      setValidation(null);
      setShowValidation(false);
    }
  }, [open, classInfo, form]);

  const validateRequest = async () => {
    try {
      const classDate = form.getValues('classDate');
      const leaveType = form.getValues('leaveType');
      
      if (!classDate || !leaveType) return;

      const result = await leaveRequestService.validateLeaveRequest(classDate, leaveType);
      if (result.success && result.data) {
        setValidation(result.data);
        setShowValidation(true);
      }
    } catch (error) {
      console.error('Validation error:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a JPEG, PNG, or PDF file',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload a file smaller than 5MB',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUploadingCertificate(true);
      
      // In a real app, you would upload to your storage service
      // For now, we'll just simulate the upload
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockUrl = `https://example.com/certificates/${file.name}`;
      form.setValue('medicalCertificateUrl', mockUrl);
      
      toast({
        title: 'Certificate uploaded',
        description: 'Medical certificate has been uploaded successfully',
      });
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: 'Failed to upload medical certificate',
        variant: 'destructive',
      });
    } finally {
      setUploadingCertificate(false);
    }
  };

  const onSubmit = async (data: LeaveRequestFormData) => {
    try {
      setLoading(true);

      const submission: LeaveRequestSubmission = {
        studentId,
        classId: data.classId,
        bookingId: data.bookingId,
        classDate: data.classDate,
        classTime: data.classTime,
        classType: data.classType,
        teacherId: data.teacherId,
        teacherName: data.teacherName,
        reason: data.reason,
        leaveType: data.leaveType,
        medicalCertificateUrl: data.medicalCertificateUrl,
        additionalNotes: data.additionalNotes,
      };

      const result = await leaveRequestService.submitLeaveRequest(submission);

      if (result.success) {
        toast({
          title: 'Leave request submitted',
          description: validation?.autoApproval 
            ? 'Your request has been automatically approved and refund processed'
            : 'Your request has been submitted for review',
        });
        onSuccess();
        onOpenChange(false);
      } else {
        throw new Error(result.error?.message || 'Failed to submit request');
      }
    } catch (error) {
      toast({
        title: 'Submission failed',
        description: error instanceof Error ? error.message : 'Failed to submit leave request',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderValidationSummary = () => {
    if (!validation || !showValidation) return null;

    const getStatusColor = () => {
      if (validation.meets48HourRule) return 'bg-green-100 text-green-800';
      if (validation.expectedRefundPercentage > 0) return 'bg-yellow-100 text-yellow-800';
      return 'bg-red-100 text-red-800';
    };

    const getStatusIcon = () => {
      if (validation.meets48HourRule) return <CheckCircle className="h-4 w-4" />;
      if (validation.expectedRefundPercentage > 0) return <AlertCircle className="h-4 w-4" />;
      return <XCircle className="h-4 w-4" />;
    };

    return (
      <Alert className="mb-4">
        <Info className="h-4 w-4" />
        <AlertTitle>Request Validation</AlertTitle>
        <AlertDescription>
          <div className="space-y-2 mt-2">
            <div className="flex items-center justify-between">
              <span>Advance notice:</span>
              <Badge variant="outline">
                {validation.hoursBeforeClass.toFixed(1)} hours
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span>48-hour rule:</span>
              <Badge className={getStatusColor()}>
                {getStatusIcon()}
                <span className="ml-1">
                  {validation.meets48HourRule ? 'Met' : 'Not met'}
                </span>
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span>Expected refund:</span>
              <Badge variant="outline">
                {validation.expectedRefundPercentage}% ({validation.expectedHoursRefund} hour{validation.expectedHoursRefund !== 1 ? 's' : ''})
              </Badge>
            </div>
            
            {validation.autoApproval && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Will be automatically approved</span>
              </div>
            )}
            
            {validation.warnings.length > 0 && (
              <div className="space-y-1">
                {validation.warnings.map((warning, index) => (
                  <div key={index} className="text-sm text-yellow-600 flex items-start gap-2">
                    <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>{warning}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submit Leave Request</DialogTitle>
          <DialogDescription>
            Request leave for your upcoming class. Please provide a detailed reason for your absence.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Class Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Class Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(form.getValues('classDate'))}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{form.getValues('classTime')}</span>
                  </div>
                </div>
                <div className="text-sm">
                  <span className="font-medium">Type:</span> {form.getValues('classType')}
                  {form.getValues('teacherName') && (
                    <span className="ml-4">
                      <span className="font-medium">Teacher:</span> {form.getValues('teacherName')}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Validation Summary */}
            {renderValidationSummary()}

            {/* Leave Type */}
            <FormField
              control={form.control}
              name="leaveType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Leave Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select leave type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(LEAVE_REQUEST_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose the most appropriate reason for your leave request
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Reason */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Leave</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Please provide a detailed explanation for your leave request..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Provide specific details about why you need to miss this class
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Medical Certificate Upload */}
            {(form.watch('leaveType') === 'sick' || form.watch('leaveType') === 'emergency') && (
              <FormField
                control={form.control}
                name="medicalCertificateUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Medical Certificate (Optional)</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Input
                            type="file"
                            accept=".jpg,.jpeg,.png,.pdf"
                            onChange={handleFileUpload}
                            disabled={uploadingCertificate}
                            className="hidden"
                            id="medical-certificate"
                          />
                          <label
                            htmlFor="medical-certificate"
                            className="flex items-center gap-2 px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md cursor-pointer"
                          >
                            <Upload className="h-4 w-4" />
                            {uploadingCertificate ? 'Uploading...' : 'Upload Certificate'}
                          </label>
                          {field.value && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <FileText className="h-4 w-4" />
                              <span>Certificate uploaded</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Upload medical certificate for sick leave or emergency. May improve refund eligibility.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Additional Notes */}
            <FormField
              control={form.control}
              name="additionalNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional information you'd like to provide..."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Include any other relevant information
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !validation?.isValid}>
                {loading ? 'Submitting...' : 'Submit Request'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}