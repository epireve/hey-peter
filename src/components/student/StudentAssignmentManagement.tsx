'use client';

import React, { useState, useMemo } from 'react';
import { format, formatDistanceToNow, differenceInDays, differenceInHours, isPast } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Upload, 
  Calendar, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  Download,
  Paperclip,
  Star
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
}

interface Submission {
  id: string;
  text: string;
  attachments: Attachment[];
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  courseId: string;
  courseName: string;
  dueDate: Date;
  points: number;
  status: 'upcoming' | 'submitted' | 'graded' | 'overdue';
  attachments: Attachment[];
  submittedAt: Date | null;
  grade: number | null;
  feedback: string | null;
  submission: Submission | null;
}

interface StudentAssignmentManagementProps {
  assignments: Assignment[];
  isLoading?: boolean;
  error?: string;
  onSubmit: (assignmentId: string, submission: { text: string; attachments: Attachment[] }) => void;
  onFileUpload: (file: File) => void;
}

const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function StudentAssignmentManagement({
  assignments,
  isLoading = false,
  error,
  onSubmit,
  onFileUpload
}: StudentAssignmentManagementProps) {
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submissionText, setSubmissionText] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<Attachment[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  
  // Filters and sorting
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('dueDate');

  // Get unique courses
  const courses = useMemo(() => {
    const uniqueCourses = new Set(assignments.map(a => a.courseName));
    return Array.from(uniqueCourses);
  }, [assignments]);

  // Filter and sort assignments
  const filteredAssignments = useMemo(() => {
    let filtered = [...assignments];

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(a => a.status === statusFilter);
    }

    // Apply course filter
    if (courseFilter !== 'all') {
      filtered = filtered.filter(a => a.courseName === courseFilter);
    }

    // Sort assignments
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'dueDate':
          return a.dueDate.getTime() - b.dueDate.getTime();
        case 'points':
          return b.points - a.points;
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    return filtered;
  }, [assignments, statusFilter, courseFilter, sortBy]);

  // Calculate statistics
  const statistics = useMemo(() => {
    const total = assignments.length;
    const completed = assignments.filter(a => a.status === 'submitted' || a.status === 'graded').length;
    const graded = assignments.filter(a => a.status === 'graded');
    
    const averageGrade = graded.length > 0
      ? graded.reduce((sum, a) => sum + (a.grade! / a.points) * 100, 0) / graded.length
      : 0;

    return {
      total,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
      averageGrade
    };
  }, [assignments]);

  const getStatusBadgeVariant = (status: Assignment['status']) => {
    switch (status) {
      case 'upcoming':
        return 'default';
      case 'submitted':
        return 'secondary';
      case 'graded':
        return 'success';
      case 'overdue':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const getTimeRemaining = (dueDate: Date) => {
    const now = new Date();
    const days = differenceInDays(dueDate, now);
    const hours = differenceInHours(dueDate, now);

    if (days > 1) {
      return `${days} days remaining`;
    } else if (days === 1) {
      return '1 day remaining';
    } else if (hours > 1) {
      return `${hours} hours remaining`;
    } else if (hours === 1) {
      return '1 hour remaining';
    } else {
      return 'Due soon';
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    setFileError(null);

    for (const file of Array.from(files)) {
      // Validate file type
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        setFileError('Invalid file type. Allowed types: PDF, DOC, DOCX, JPG, PNG');
        return;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        setFileError('File size exceeds 10MB limit');
        return;
      }

      // Upload file
      onFileUpload(file);

      // Add to uploaded files (simulated)
      const newAttachment: Attachment = {
        id: `upload-${Date.now()}-${Math.random()}`,
        name: file.name,
        url: URL.createObjectURL(file),
        type: file.type
      };
      setUploadedFiles(prev => [...prev, newAttachment]);
    }
  };

  const handleSubmit = () => {
    setValidationError(null);

    if (!submissionText.trim() && uploadedFiles.length === 0) {
      setValidationError('Please enter submission text or upload files');
      return;
    }

    setShowConfirmDialog(true);
  };

  const confirmSubmit = () => {
    if (selectedAssignment) {
      onSubmit(selectedAssignment.id, {
        text: submissionText,
        attachments: uploadedFiles
      });
      setShowConfirmDialog(false);
      setSelectedAssignment(null);
      setSubmissionText('');
      setUploadedFiles([]);
    }
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setCourseFilter('all');
    setSortBy('dueDate');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading assignments...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Assignments</h1>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No assignments found</p>
          <p className="text-sm text-muted-foreground">Check back later for new assignments</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Assignments</h1>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            <Calendar className="h-3 w-3 mr-1" />
            {statistics.total} Total
          </Badge>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{statistics.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{statistics.completionRate.toFixed(0)}%</p>
            <Progress value={statistics.completionRate} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Grade</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{statistics.averageGrade.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status-filter" aria-label="status">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="graded">Graded</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="course-filter">Course</Label>
              <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger id="course-filter" aria-label="course">
                  <SelectValue placeholder="All Courses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {courses.map(course => (
                    <SelectItem key={course} value={course}>{course}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="sort-by">Sort By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger id="sort-by" aria-label="sort">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dueDate">Due Date (Earliest First)</SelectItem>
                  <SelectItem value="points">Points (High to Low)</SelectItem>
                  <SelectItem value="title">Title (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assignments List */}
      <div className="grid gap-4">
        {filteredAssignments.map(assignment => (
          <Card 
            key={assignment.id} 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setSelectedAssignment(assignment)}
            data-testid="assignment-card"
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg" data-testid="assignment-title">
                    {assignment.title}
                  </CardTitle>
                  <CardDescription>{assignment.courseName}</CardDescription>
                </div>
                <Badge variant={getStatusBadgeVariant(assignment.status)}>
                  {assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Due: {format(assignment.dueDate, 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Star className="h-4 w-4" />
                    <span>{assignment.points} points</span>
                  </div>
                </div>
                {(assignment.status === 'upcoming' || assignment.status === 'overdue') && (
                  <div className="flex items-center gap-1 text-primary">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">{getTimeRemaining(assignment.dueDate)}</span>
                  </div>
                )}
                {assignment.grade !== null && (
                  <Badge variant="success">
                    Grade: {assignment.grade}/{assignment.points}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Assignment Details Dialog */}
      <Dialog open={!!selectedAssignment} onOpenChange={(open) => !open && setSelectedAssignment(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedAssignment && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedAssignment.title}</DialogTitle>
                <DialogDescription>{selectedAssignment.courseName}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Assignment Info */}
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{selectedAssignment.description}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Due: {format(selectedAssignment.dueDate, 'MMM d, yyyy h:mm a')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4" />
                      <span>{selectedAssignment.points} points</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Assignment Attachments */}
                {selectedAssignment.attachments.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Assignment Files</h4>
                    <div className="space-y-2">
                      {selectedAssignment.attachments.map(attachment => (
                        <a
                          key={attachment.id}
                          href={attachment.url}
                          download
                          className="flex items-center gap-2 p-2 rounded-md hover:bg-muted"
                        >
                          <Paperclip className="h-4 w-4" />
                          <span className="text-sm">{attachment.name}</span>
                          <Download className="h-4 w-4 ml-auto" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Submission Section */}
                {selectedAssignment.status === 'graded' && (
                  <div className="space-y-4">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Grade: {selectedAssignment.grade}/{selectedAssignment.points}</h4>
                      {selectedAssignment.feedback && (
                        <p className="text-sm text-muted-foreground">{selectedAssignment.feedback}</p>
                      )}
                    </div>
                  </div>
                )}

                {selectedAssignment.status === 'submitted' && selectedAssignment.submittedAt && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm">
                      Submitted on: {format(selectedAssignment.submittedAt, 'MMM d, yyyy h:mm a')}
                    </p>
                    {selectedAssignment.submission && (
                      <div className="mt-2 space-y-2">
                        <p className="text-sm">{selectedAssignment.submission.text}</p>
                        {selectedAssignment.submission.attachments.map(attachment => (
                          <div key={attachment.id} className="flex items-center gap-2">
                            <Paperclip className="h-4 w-4" />
                            <span className="text-sm">{attachment.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {(selectedAssignment.status === 'upcoming' || selectedAssignment.status === 'overdue') && (
                  <div className="space-y-4">
                    {selectedAssignment.status === 'overdue' && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          This assignment is overdue. Late submissions may receive reduced credit.
                        </AlertDescription>
                      </Alert>
                    )}

                    <div>
                      <Label htmlFor="submission-text">Submission Text</Label>
                      <Textarea
                        id="submission-text"
                        placeholder="Enter your submission text..."
                        value={submissionText}
                        onChange={(e) => setSubmissionText(e.target.value)}
                        rows={6}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="file-upload">Upload files</Label>
                      <Input
                        id="file-upload"
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={handleFileUpload}
                        className="mt-2"
                      />
                      {fileError && (
                        <p className="text-sm text-red-500 mt-1">{fileError}</p>
                      )}
                    </div>

                    {uploadedFiles.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Uploaded Files</h4>
                        {uploadedFiles.map(file => (
                          <div key={file.id} className="flex items-center gap-2">
                            <Paperclip className="h-4 w-4" />
                            <span className="text-sm">{file.name}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {validationError && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{validationError}</AlertDescription>
                      </Alert>
                    )}

                    <Button onClick={handleSubmit} className="w-full">
                      Submit Assignment
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Submission</DialogTitle>
            <DialogDescription>
              Are you sure you want to submit this assignment? You won't be able to make changes after submission.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmSubmit}>
              Confirm Submission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}