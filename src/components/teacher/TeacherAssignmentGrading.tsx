'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { format, addDays, subDays, differenceInDays, isPast } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
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
  Star,
  Plus,
  Edit,
  Trash,
  Copy,
  MoreVertical,
  Send,
  Users,
  BookOpen,
  TrendingUp,
  BarChart3,
  FileDown,
  GraduationCap,
  Target,
  Award,
  Loader2,
  AlertTriangle,
  Mail
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
interface User {
  id: string;
  email: string;
  role: 'admin' | 'teacher' | 'student';
  first_name: string;
  last_name: string;
  phone: string | null;
  avatar_url: string | null;
  timezone: string;
  language: string;
  created_at: string;
  updated_at: string;
  last_sign_in_at: string | null;
  email_verified_at: string | null;
  is_active: boolean;
  metadata: any;
}

interface RubricCriteria {
  name: string;
  points: number;
  description: string;
}

interface Rubric {
  criteria: RubricCriteria[];
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  instructions: string;
  type: 'essay' | 'multiple_choice' | 'file_upload' | 'presentation';
  points: number;
  due_date: string;
  late_penalty: number;
  allow_late_submissions: boolean;
  created_at: string;
  updated_at: string;
  teacher_id: string;
  class_ids: string[];
  student_ids: string[];
  rubric: Rubric | null;
  attachments: Attachment[];
  is_active: boolean;
  plagiarism_check: boolean;
  template_id: string | null;
}

interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size?: number;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url: string | null;
}

interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  content: string;
  attachments: Attachment[];
  submitted_at: string;
  grade: number | null;
  feedback: string | null;
  status: 'submitted' | 'graded' | 'returned';
  plagiarism_score: number;
  created_at: string;
  updated_at: string;
  student: Student;
}

interface Class {
  id: string;
  title: string;
  description: string;
  students: Student[];
}

interface Template {
  id: string;
  name: string;
  description: string;
  instructions: string;
  type: Assignment['type'];
  points: number;
  rubric: Rubric | null;
}

interface TeacherAssignmentGradingProps {
  teacher: User;
  assignments: Assignment[];
  submissions: Submission[];
  classes: Class[];
  templates: Template[];
  isLoading?: boolean;
  error?: string | null;
  onCreateAssignment: (assignment: Partial<Assignment>) => Promise<void>;
  onUpdateAssignment: (id: string, assignment: Partial<Assignment>) => Promise<void>;
  onDeleteAssignment: (id: string) => Promise<void>;
  onGradeSubmission: (id: string, grade: { grade: number; feedback: string; rubric_scores?: Record<string, number> }) => Promise<void>;
  onBulkGrade: (submissionIds: string[], grade: { grade: number; feedback: string }) => Promise<void>;
  onSendFeedback: (submissionIds: string[], message: string) => Promise<void>;
  onExportGrades: (format: 'csv' | 'excel', filters?: any) => Promise<void>;
  onCreateTemplate: (template: Partial<Template>) => Promise<void>;
  onReturnForRevision: (submissionId: string, feedback: { feedback: string }) => Promise<void>;
}

// Mock RichTextEditor component
const RichTextEditor = ({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder?: string }) => (
  <Textarea
    data-testid="rich-text-editor"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    rows={6}
  />
);

export function TeacherAssignmentGrading({
  teacher,
  assignments,
  submissions,
  classes,
  templates,
  isLoading = false,
  error,
  onCreateAssignment,
  onUpdateAssignment,
  onDeleteAssignment,
  onGradeSubmission,
  onBulkGrade,
  onSendFeedback,
  onExportGrades,
  onCreateTemplate,
  onReturnForRevision
}: TeacherAssignmentGradingProps) {
  const { toast } = useToast();
  
  // State management
  const [activeTab, setActiveTab] = useState<string>('assignments');
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [selectedSubmissions, setSelectedSubmissions] = useState<string[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showGradeDialog, setShowGradeDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBulkGradeDialog, setShowBulkGradeDialog] = useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  
  // Filters and sorting
  const [assignmentTypeFilter, setAssignmentTypeFilter] = useState<string>('all');
  const [assignmentSortBy, setAssignmentSortBy] = useState<string>('due_date');
  const [submissionStatusFilter, setSubmissionStatusFilter] = useState<string>('all');
  const [submissionSortBy, setSubmissionSortBy] = useState<string>('submitted_at');
  
  // Form states
  const [assignmentForm, setAssignmentForm] = useState<Partial<Assignment>>({
    title: '',
    description: '',
    instructions: '',
    type: 'essay',
    points: 100,
    due_date: addDays(new Date(), 7).toISOString(),
    late_penalty: 0,
    allow_late_submissions: false,
    class_ids: [],
    student_ids: [],
    plagiarism_check: false,
  });
  
  const [rubricForm, setRubricForm] = useState<RubricCriteria[]>([]);
  const [gradeForm, setGradeForm] = useState({
    grade: 0,
    feedback: '',
    rubric_scores: {} as Record<string, number>,
  });
  const [bulkGradeForm, setBulkGradeForm] = useState({
    grade: 0,
    feedback: '',
  });
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
  });
  
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Statistics
  const statistics = useMemo(() => {
    const totalAssignments = assignments.length;
    const totalSubmissions = submissions.length;
    const gradedSubmissions = submissions.filter(s => s.status === 'graded');
    const gradedPercentage = totalSubmissions > 0 ? (gradedSubmissions.length / totalSubmissions) * 100 : 0;
    
    const averageGrade = gradedSubmissions.length > 0
      ? gradedSubmissions.reduce((sum, s) => sum + (s.grade || 0), 0) / gradedSubmissions.length
      : 0;
    
    // Calculate completion rates per assignment
    const completionRates = assignments.map(assignment => {
      const assignmentSubmissions = submissions.filter(s => s.assignment_id === assignment.id);
      const totalStudents = assignment.class_ids.reduce((total, classId) => {
        const classObj = classes.find(c => c.id === classId);
        return total + (classObj?.students.length || 0);
      }, 0) + assignment.student_ids.length;
      
      return {
        assignmentId: assignment.id,
        assignmentTitle: assignment.title,
        completionRate: totalStudents > 0 ? (assignmentSubmissions.length / totalStudents) * 100 : 0,
      };
    });
    
    return {
      totalAssignments,
      totalSubmissions,
      gradedPercentage,
      averageGrade,
      completionRates,
    };
  }, [assignments, submissions, classes]);

  // Filtered and sorted data
  const filteredAssignments = useMemo(() => {
    let filtered = [...assignments];
    
    if (assignmentTypeFilter !== 'all') {
      filtered = filtered.filter(a => a.type === assignmentTypeFilter);
    }
    
    filtered.sort((a, b) => {
      switch (assignmentSortBy) {
        case 'due_date':
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        case 'points':
          return b.points - a.points;
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [assignments, assignmentTypeFilter, assignmentSortBy]);

  const filteredSubmissions = useMemo(() => {
    let filtered = [...submissions];
    
    if (submissionStatusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === submissionStatusFilter);
    }
    
    filtered.sort((a, b) => {
      switch (submissionSortBy) {
        case 'submitted_at':
          return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
        case 'student_name':
          return `${a.student.first_name} ${a.student.last_name}`.localeCompare(
            `${b.student.first_name} ${b.student.last_name}`
          );
        case 'grade':
          return (b.grade || 0) - (a.grade || 0);
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [submissions, submissionStatusFilter, submissionSortBy]);

  // Helper functions
  const getAssignmentStatus = (assignment: Assignment) => {
    const now = new Date();
    const dueDate = new Date(assignment.due_date);
    
    if (isPast(dueDate)) {
      return 'overdue';
    }
    return 'active';
  };

  const getSubmissionCount = (assignmentId: string) => {
    return submissions.filter(s => s.assignment_id === assignmentId).length;
  };

  const getAllStudents = () => {
    const studentMap = new Map<string, Student>();
    classes.forEach(cls => {
      cls.students.forEach(student => {
        studentMap.set(student.id, student);
      });
    });
    return Array.from(studentMap.values());
  };

  const resetForms = () => {
    setAssignmentForm({
      title: '',
      description: '',
      instructions: '',
      type: 'essay',
      points: 100,
      due_date: addDays(new Date(), 7).toISOString(),
      late_penalty: 0,
      allow_late_submissions: false,
      class_ids: [],
      student_ids: [],
      plagiarism_check: false,
    });
    setRubricForm([]);
    setGradeForm({ grade: 0, feedback: '', rubric_scores: {} });
    setBulkGradeForm({ grade: 0, feedback: '' });
    setFeedbackMessage('');
    setTemplateForm({ name: '', description: '' });
    setValidationErrors({});
  };

  const validateAssignmentForm = () => {
    const errors: Record<string, string> = {};
    
    if (!assignmentForm.title?.trim()) {
      errors.title = 'Title is required';
    }
    if (!assignmentForm.instructions?.trim()) {
      errors.instructions = 'Instructions are required';
    }
    if (!assignmentForm.points || assignmentForm.points <= 0) {
      errors.points = 'Points must be greater than 0';
    }
    if (!assignmentForm.due_date) {
      errors.due_date = 'Due date is required';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Event handlers
  const handleCreateAssignment = async () => {
    if (!validateAssignmentForm()) return;
    
    try {
      const newAssignment = {
        ...assignmentForm,
        teacher_id: teacher.id,
        rubric: rubricForm.length > 0 ? { criteria: rubricForm } : null,
      };
      
      await onCreateAssignment(newAssignment);
      toast({
        title: 'Success',
        description: 'Assignment created successfully',
      });
      setShowCreateDialog(false);
      resetForms();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create assignment',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateAssignment = async () => {
    if (!selectedAssignment || !validateAssignmentForm()) return;
    
    try {
      await onUpdateAssignment(selectedAssignment.id, {
        ...assignmentForm,
        rubric: rubricForm.length > 0 ? { criteria: rubricForm } : null,
      });
      toast({
        title: 'Success',
        description: 'Assignment updated successfully',
      });
      setShowEditDialog(false);
      setSelectedAssignment(null);
      resetForms();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update assignment',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAssignment = async () => {
    if (!selectedAssignment) return;
    
    try {
      await onDeleteAssignment(selectedAssignment.id);
      toast({
        title: 'Success',
        description: 'Assignment deleted successfully',
      });
      setShowDeleteDialog(false);
      setSelectedAssignment(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete assignment',
        variant: 'destructive',
      });
    }
  };

  const handleDuplicateAssignment = async (assignment: Assignment) => {
    try {
      const duplicatedAssignment = {
        title: `${assignment.title} (Copy)`,
        description: assignment.description,
        instructions: assignment.instructions,
        type: assignment.type,
        points: assignment.points,
        due_date: addDays(new Date(), 7).toISOString(),
        late_penalty: assignment.late_penalty,
        allow_late_submissions: assignment.allow_late_submissions,
        class_ids: [],
        student_ids: [],
        rubric: assignment.rubric,
        plagiarism_check: assignment.plagiarism_check,
        teacher_id: teacher.id,
      };
      
      await onCreateAssignment(duplicatedAssignment);
      toast({
        title: 'Success',
        description: 'Assignment duplicated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to duplicate assignment',
        variant: 'destructive',
      });
    }
  };

  const handleGradeSubmission = async () => {
    if (!selectedSubmission) return;
    
    try {
      await onGradeSubmission(selectedSubmission.id, gradeForm);
      toast({
        title: 'Success',
        description: 'Grade saved successfully',
      });
      setShowGradeDialog(false);
      setSelectedSubmission(null);
      resetForms();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save grade',
        variant: 'destructive',
      });
    }
  };

  const handleBulkGrade = async () => {
    if (selectedSubmissions.length === 0) return;
    
    try {
      await onBulkGrade(selectedSubmissions, bulkGradeForm);
      toast({
        title: 'Success',
        description: `Graded ${selectedSubmissions.length} submissions`,
      });
      setShowBulkGradeDialog(false);
      setSelectedSubmissions([]);
      resetForms();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to bulk grade submissions',
        variant: 'destructive',
      });
    }
  };

  const handleSendFeedback = async () => {
    if (selectedSubmissions.length === 0 || !feedbackMessage.trim()) return;
    
    try {
      await onSendFeedback(selectedSubmissions, feedbackMessage);
      toast({
        title: 'Success',
        description: `Feedback sent to ${selectedSubmissions.length} students`,
      });
      setShowFeedbackDialog(false);
      setSelectedSubmissions([]);
      setFeedbackMessage('');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send feedback',
        variant: 'destructive',
      });
    }
  };

  const handleReturnForRevision = async () => {
    if (!selectedSubmission || !gradeForm.feedback.trim()) return;
    
    try {
      await onReturnForRevision(selectedSubmission.id, { feedback: gradeForm.feedback });
      toast({
        title: 'Success',
        description: 'Submission returned for revision',
      });
      setShowGradeDialog(false);
      setSelectedSubmission(null);
      resetForms();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to return submission',
        variant: 'destructive',
      });
    }
  };

  const handleSaveAsTemplate = async (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setTemplateForm({
      name: assignment.title,
      description: assignment.description,
    });
    setShowSaveTemplateDialog(true);
  };

  const handleCreateTemplate = async () => {
    if (!selectedAssignment || !templateForm.name.trim()) return;
    
    try {
      await onCreateTemplate({
        name: templateForm.name,
        description: templateForm.description,
        instructions: selectedAssignment.instructions,
        type: selectedAssignment.type,
        points: selectedAssignment.points,
        rubric: selectedAssignment.rubric,
      });
      toast({
        title: 'Success',
        description: 'Template saved successfully',
      });
      setShowSaveTemplateDialog(false);
      setSelectedAssignment(null);
      resetForms();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save template',
        variant: 'destructive',
      });
    }
  };

  const handleUseTemplate = (template: Template) => {
    setAssignmentForm({
      title: template.name,
      description: template.description,
      instructions: template.instructions,
      type: template.type,
      points: template.points,
      due_date: addDays(new Date(), 7).toISOString(),
      late_penalty: 0,
      allow_late_submissions: false,
      class_ids: [],
      student_ids: [],
      plagiarism_check: false,
    });
    if (template.rubric) {
      setRubricForm(template.rubric.criteria);
    }
    setShowCreateDialog(true);
    setShowTemplateDialog(false);
  };

  const handleExportGrades = async (format: 'csv' | 'excel') => {
    try {
      const filters = submissionStatusFilter !== 'all' ? { status: submissionStatusFilter } : undefined;
      await onExportGrades(format, filters);
      toast({
        title: 'Success',
        description: `Grades exported to ${format.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export grades',
        variant: 'destructive',
      });
    }
  };

  const addRubricCriteria = () => {
    setRubricForm([...rubricForm, { name: '', points: 0, description: '' }]);
  };

  const updateRubricCriteria = (index: number, field: keyof RubricCriteria, value: string | number) => {
    const updated = [...rubricForm];
    updated[index] = { ...updated[index], [field]: value };
    setRubricForm(updated);
  };

  const removeRubricCriteria = (index: number) => {
    setRubricForm(rubricForm.filter((_, i) => i !== index));
  };

  const calculateTotalRubricScore = () => {
    return Object.values(gradeForm.rubric_scores).reduce((sum, score) => sum + score, 0);
  };

  const openEditDialog = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setAssignmentForm({
      title: assignment.title,
      description: assignment.description,
      instructions: assignment.instructions,
      type: assignment.type,
      points: assignment.points,
      due_date: assignment.due_date,
      late_penalty: assignment.late_penalty,
      allow_late_submissions: assignment.allow_late_submissions,
      class_ids: assignment.class_ids,
      student_ids: assignment.student_ids,
      plagiarism_check: assignment.plagiarism_check,
    });
    if (assignment.rubric) {
      setRubricForm(assignment.rubric.criteria);
    }
    setShowEditDialog(true);
  };

  const openGradeDialog = (submission: Submission) => {
    setSelectedSubmission(submission);
    const assignment = assignments.find(a => a.id === submission.assignment_id);
    
    if (assignment?.rubric) {
      const initialScores: Record<string, number> = {};
      assignment.rubric.criteria.forEach(criteria => {
        initialScores[criteria.name] = 0;
      });
      setGradeForm({
        grade: submission.grade || 0,
        feedback: submission.feedback || '',
        rubric_scores: initialScores,
      });
    } else {
      setGradeForm({
        grade: submission.grade || 0,
        feedback: submission.feedback || '',
        rubric_scores: {},
      });
    }
    setShowGradeDialog(true);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div data-testid="loading-skeleton" className="space-y-4 w-full max-w-md">
          <div className="animate-pulse bg-muted h-8 rounded"></div>
          <div className="animate-pulse bg-muted h-32 rounded"></div>
          <div className="animate-pulse bg-muted h-8 rounded"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // Empty state
  if (assignments.length === 0 && submissions.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
          <GraduationCap className="h-16 w-16 text-muted-foreground" />
          <h2 className="text-2xl font-semibold">No assignments found</h2>
          <p className="text-muted-foreground">Get started by creating your first assignment</p>
          <Button onClick={() => setShowCreateDialog(true)}>
            Create Your First Assignment
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Assignment Management</h1>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <FileDown className="h-4 w-4 mr-2" />
                Export Grades
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExportGrades('csv')}>
                Export to CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportGrades('excel')}>
                Export to Excel
              </DropdownMenuItem>
              {submissionStatusFilter !== 'all' && (
                <DropdownMenuItem onClick={() => handleExportGrades('csv')}>
                  Export Filtered
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Assignment
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{statistics.totalAssignments}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{statistics.totalSubmissions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Graded</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{Math.round(statistics.gradedPercentage)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Grade</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{Math.round(statistics.averageGrade)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        {/* Assignments Tab */}
        <TabsContent value="assignments" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label>Type</Label>
                  <Select value={assignmentTypeFilter} onValueChange={setAssignmentTypeFilter}>
                    <SelectTrigger aria-label="filter by type">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="essay">Essay</SelectItem>
                      <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                      <SelectItem value="file_upload">File Upload</SelectItem>
                      <SelectItem value="presentation">Presentation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label>Sort By</Label>
                  <Select value={assignmentSortBy} onValueChange={setAssignmentSortBy}>
                    <SelectTrigger aria-label="sort by">
                      <SelectValue placeholder="Sort By" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="due_date">Due Date</SelectItem>
                      <SelectItem value="title">Title</SelectItem>
                      <SelectItem value="points">Points</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assignments List */}
          <div className="grid gap-4">
            {filteredAssignments.map(assignment => (
              <Card 
                key={assignment.id}
                data-testid={`assignment-card-${assignment.id}`}
                className="cursor-pointer hover:shadow-md transition-shadow"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{assignment.title}</CardTitle>
                      <CardDescription>{assignment.description}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getAssignmentStatus(assignment) === 'overdue' ? 'destructive' : 'default'}>
                        {getAssignmentStatus(assignment) === 'overdue' ? 'Overdue' : 'Active'}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {assignment.type.replace('_', ' ')}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">More options</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => openEditDialog(assignment)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicateAssignment(assignment)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSaveAsTemplate(assignment)}>
                            <BookOpen className="h-4 w-4 mr-2" />
                            Save as Template
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedAssignment(assignment);
                              setShowDeleteDialog(true);
                            }}
                            className="text-destructive"
                          >
                            <Trash className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Due: {format(new Date(assignment.due_date), 'MMM d, yyyy')}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Star className="h-4 w-4" />
                        <span>{assignment.points} points</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        <span>{getSubmissionCount(assignment.id)} submission{getSubmissionCount(assignment.id) !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Submissions Tab */}
        <TabsContent value="submissions" className="space-y-4">
          {/* Filters and Actions */}
          <div className="flex items-center justify-between">
            <div className="flex gap-4">
              <div>
                <Label>Status</Label>
                <Select value={submissionStatusFilter} onValueChange={setSubmissionStatusFilter}>
                  <SelectTrigger aria-label="filter by status" className="w-40">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="graded">Graded</SelectItem>
                    <SelectItem value="returned">Returned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sort By</Label>
                <Select value={submissionSortBy} onValueChange={setSubmissionSortBy}>
                  <SelectTrigger aria-label="sort by" className="w-40">
                    <SelectValue placeholder="Sort By" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="submitted_at">Submission Date</SelectItem>
                    <SelectItem value="student_name">Student Name</SelectItem>
                    <SelectItem value="grade">Grade</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {selectedSubmissions.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedSubmissions.length} selected
                </span>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setShowBulkGradeDialog(true)}
                >
                  Bulk Grade
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setShowFeedbackDialog(true)}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Feedback
                </Button>
              </div>
            )}
          </div>

          {/* High Plagiarism Alert */}
          {filteredSubmissions.some(s => s.plagiarism_score > 70) && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                High plagiarism score detected in some submissions. Please review carefully.
              </AlertDescription>
            </Alert>
          )}

          {/* Submissions List */}
          <div className="grid gap-4">
            {filteredSubmissions.map(submission => {
              const assignment = assignments.find(a => a.id === submission.assignment_id);
              return (
                <Card 
                  key={submission.id}
                  data-testid={`submission-card-${submission.id}`}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => openGradeDialog(submission)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedSubmissions.includes(submission.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedSubmissions([...selectedSubmissions, submission.id]);
                            } else {
                              setSelectedSubmissions(selectedSubmissions.filter(id => id !== submission.id));
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div>
                          <CardTitle className="text-lg">
                            {submission.student.first_name} {submission.student.last_name}
                          </CardTitle>
                          <CardDescription>{assignment?.title}</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          submission.status === 'graded' ? 'default' :
                          submission.status === 'returned' ? 'secondary' : 'outline'
                        }>
                          {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                        </Badge>
                        {submission.plagiarism_score > 70 && (
                          <Badge variant="destructive">
                            High Plagiarism
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>Submitted: {format(new Date(submission.submitted_at), 'MMM d, yyyy h:mm a')}</span>
                        </div>
                        {submission.grade !== null && (
                          <div className="flex items-center gap-1">
                            <Award className="h-4 w-4" />
                            <span>Grade: {submission.grade}/{assignment?.points}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Completion Rate */}
            <Card>
              <CardHeader>
                <CardTitle>Completion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                {statistics.completionRates.map(rate => (
                  <div key={rate.assignmentId} className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span>{rate.assignmentTitle}</span>
                      <span>{Math.round(rate.completionRate)}%</span>
                    </div>
                    <Progress value={rate.completionRate} />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Grade Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Grade Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div data-testid="grade-distribution-chart" className="h-64 flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                    <p>Grade distribution chart would be rendered here</p>
                    <p className="text-sm">Average Grade: {Math.round(statistics.averageGrade)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowTemplateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </div>

          <div className="grid gap-4">
            {templates.map(template => (
              <Card 
                key={template.id}
                data-testid={`template-card-${template.id}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription>{template.description}</CardDescription>
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => handleUseTemplate(template)}
                    >
                      Use Template
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="capitalize">{template.type.replace('_', ' ')}</span>
                    <span>{template.points} points</span>
                    {template.rubric && (
                      <span>{template.rubric.criteria.length} criteria</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Assignment Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Assignment</DialogTitle>
            <DialogDescription>
              Create a new assignment for your students
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={assignmentForm.title}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                  placeholder="Enter assignment title"
                />
                {validationErrors.title && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors.title}</p>
                )}
              </div>
              <div>
                <Label htmlFor="assignment-type">Assignment Type</Label>
                <Select 
                  value={assignmentForm.type} 
                  onValueChange={(value: Assignment['type']) => setAssignmentForm({ ...assignmentForm, type: value })}
                >
                  <SelectTrigger id="assignment-type" aria-label="assignment type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="essay">Essay</SelectItem>
                    <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                    <SelectItem value="file_upload">File Upload</SelectItem>
                    <SelectItem value="presentation">Presentation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={assignmentForm.description}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, description: e.target.value })}
                placeholder="Brief description"
              />
            </div>

            <div>
              <Label htmlFor="instructions">Instructions</Label>
              <RichTextEditor
                value={assignmentForm.instructions || ''}
                onChange={(value) => setAssignmentForm({ ...assignmentForm, instructions: value })}
                placeholder="Enter detailed instructions..."
              />
              {validationErrors.instructions && (
                <p className="text-sm text-red-500 mt-1">{validationErrors.instructions}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="points">Points</Label>
                <Input
                  id="points"
                  type="number"
                  value={assignmentForm.points}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, points: Number(e.target.value) })}
                  placeholder="100"
                />
                {validationErrors.points && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors.points}</p>
                )}
              </div>
              <div>
                <Label htmlFor="due-date">Due Date</Label>
                <Input
                  id="due-date"
                  type="datetime-local"
                  value={assignmentForm.due_date ? format(new Date(assignmentForm.due_date), "yyyy-MM-dd'T'HH:mm") : ''}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, due_date: new Date(e.target.value).toISOString() })}
                />
                {validationErrors.due_date && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors.due_date}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="assign-classes">Assign to Classes</Label>
                <MultiSelect
                  options={classes.map(cls => ({ value: cls.id, label: cls.title }))}
                  value={assignmentForm.class_ids || []}
                  onChange={(value) => setAssignmentForm({ ...assignmentForm, class_ids: value })}
                  placeholder="Select classes..."
                  aria-label="assign to classes"
                />
              </div>
              <div>
                <Label htmlFor="assign-students">Assign to Students</Label>
                <MultiSelect
                  options={getAllStudents().map(student => ({ 
                    value: student.id, 
                    label: `${student.first_name} ${student.last_name}` 
                  }))}
                  value={assignmentForm.student_ids || []}
                  onChange={(value) => setAssignmentForm({ ...assignmentForm, student_ids: value })}
                  placeholder="Select students..."
                  aria-label="assign to students"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="allow-late"
                  checked={assignmentForm.allow_late_submissions}
                  onCheckedChange={(checked) => setAssignmentForm({ ...assignmentForm, allow_late_submissions: checked })}
                />
                <Label htmlFor="allow-late">Allow Late Submissions</Label>
              </div>

              {assignmentForm.allow_late_submissions && (
                <div>
                  <Label htmlFor="late-penalty">Late Penalty (%)</Label>
                  <Input
                    id="late-penalty"
                    type="number"
                    value={assignmentForm.late_penalty}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, late_penalty: Number(e.target.value) })}
                    placeholder="10"
                  />
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="plagiarism-check"
                  checked={assignmentForm.plagiarism_check}
                  onCheckedChange={(checked) => setAssignmentForm({ ...assignmentForm, plagiarism_check: checked })}
                />
                <Label htmlFor="plagiarism-check">Enable Plagiarism Detection</Label>
              </div>
            </div>

            {/* Rubric Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-medium">Rubric</h4>
                <Button type="button" variant="outline" size="sm" onClick={addRubricCriteria}>
                  Add Rubric
                </Button>
              </div>

              {rubricForm.map((criteria, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-2">
                  <div className="flex justify-between items-start">
                    <h5 className="font-medium">Criteria {index + 1}</h5>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRubricCriteria(index)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label htmlFor={`criteria-name-${index}`}>Criteria Name</Label>
                      <Input
                        id={`criteria-name-${index}`}
                        value={criteria.name}
                        onChange={(e) => updateRubricCriteria(index, 'name', e.target.value)}
                        placeholder="e.g., Content"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`criteria-points-${index}`}>Points</Label>
                      <Input
                        id={`criteria-points-${index}`}
                        type="number"
                        value={criteria.points}
                        onChange={(e) => updateRubricCriteria(index, 'points', Number(e.target.value))}
                        placeholder="25"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`criteria-description-${index}`}>Description</Label>
                      <Input
                        id={`criteria-description-${index}`}
                        value={criteria.description}
                        onChange={(e) => updateRubricCriteria(index, 'description', e.target.value)}
                        placeholder="Describe the criteria"
                      />
                    </div>
                  </div>
                  {criteria.name && criteria.points > 0 && (
                    <div className="text-sm text-muted-foreground">
                      {criteria.name} ({criteria.points} points)
                    </div>
                  )}
                </div>
              ))}

              {rubricForm.length > 0 && (
                <Button type="button" variant="outline" size="sm" onClick={addRubricCriteria}>
                  Add Criteria
                </Button>
              )}
            </div>

            <div>
              <Label htmlFor="attachment">Attachment</Label>
              <Input
                id="attachment"
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => {
                  // Handle file upload
                  const files = e.target.files;
                  if (files) {
                    for (const file of Array.from(files)) {
                      // Validate file type
                      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
                      if (!allowedTypes.includes(file.type)) {
                        toast({
                          title: 'Error',
                          description: 'Invalid file type. Allowed types: PDF, DOC, DOCX, JPG, PNG',
                          variant: 'destructive',
                        });
                        return;
                      }
                      
                      // Validate file size (10MB limit)
                      if (file.size > 10 * 1024 * 1024) {
                        toast({
                          title: 'Error',
                          description: 'File size exceeds 10MB limit',
                          variant: 'destructive',
                        });
                        return;
                      }
                    }
                  }
                }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAssignment}>
              Create Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Assignment Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Assignment</DialogTitle>
            <DialogDescription>
              Update assignment details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Same form fields as create dialog */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={assignmentForm.title}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                  placeholder="Enter assignment title"
                />
              </div>
              <div>
                <Label htmlFor="edit-type">Assignment Type</Label>
                <Select 
                  value={assignmentForm.type} 
                  onValueChange={(value: Assignment['type']) => setAssignmentForm({ ...assignmentForm, type: value })}
                >
                  <SelectTrigger id="edit-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="essay">Essay</SelectItem>
                    <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                    <SelectItem value="file_upload">File Upload</SelectItem>
                    <SelectItem value="presentation">Presentation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Add other form fields... */}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateAssignment}>
              Update Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Grade Submission Dialog */}
      <Dialog open={showGradeDialog} onOpenChange={setShowGradeDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Grade Submission</DialogTitle>
            <DialogDescription>
              {selectedSubmission && 
                `Grading submission from ${selectedSubmission.student.first_name} ${selectedSubmission.student.last_name}`
              }
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-6">
              {/* Submission Content */}
              <div>
                <h4 className="font-medium mb-2">Submission</h4>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm">{selectedSubmission.content}</p>
                </div>
              </div>

              {/* Plagiarism Alert */}
              {selectedSubmission.plagiarism_score > 70 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    High plagiarism score detected: {selectedSubmission.plagiarism_score}%
                  </AlertDescription>
                </Alert>
              )}

              {/* Grading Tabs */}
              <Tabs defaultValue="rubric" className="w-full">
                <TabsList>
                  <TabsTrigger value="rubric">Rubric Grading</TabsTrigger>
                  <TabsTrigger value="overall">Overall Grade</TabsTrigger>
                </TabsList>
                
                <TabsContent value="rubric">
                  {(() => {
                    const assignment = assignments.find(a => a.id === selectedSubmission.assignment_id);
                    if (!assignment?.rubric) {
                      return <p className="text-muted-foreground">No rubric available for this assignment</p>;
                    }
                    
                    return (
                      <div className="space-y-4">
                        {assignment.rubric.criteria.map((criteria, index) => (
                          <div key={index} className="space-y-2">
                            <div className="flex justify-between">
                              <Label htmlFor={`${criteria.name.toLowerCase()}-score`}>
                                {criteria.name} Score (0-{criteria.points})
                              </Label>
                              <span className="text-sm font-medium">
                                {gradeForm.rubric_scores[criteria.name] || 0} / {criteria.points}
                              </span>
                            </div>
                            <Slider
                              id={`${criteria.name.toLowerCase()}-score`}
                              min={0}
                              max={criteria.points}
                              step={1}
                              value={[gradeForm.rubric_scores[criteria.name] || 0]}
                              onValueChange={(value) => setGradeForm({
                                ...gradeForm,
                                rubric_scores: {
                                  ...gradeForm.rubric_scores,
                                  [criteria.name]: value[0]
                                }
                              })}
                              aria-label={`${criteria.name.toLowerCase()} score`}
                            />
                            <p className="text-sm text-muted-foreground">{criteria.description}</p>
                          </div>
                        ))}
                        
                        <div className="mt-4 p-4 bg-muted rounded-lg">
                          <p className="font-medium">
                            Total Score: {calculateTotalRubricScore()} / {assignment.points}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </TabsContent>
                
                <TabsContent value="overall">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="points-earned">Points Earned</Label>
                      <Input
                        id="points-earned"
                        type="number"
                        value={gradeForm.grade}
                        onChange={(e) => setGradeForm({ ...gradeForm, grade: Number(e.target.value) })}
                        placeholder="Enter points earned"
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Feedback */}
              <div>
                <Label htmlFor="feedback">Feedback</Label>
                <Textarea
                  id="feedback"
                  value={gradeForm.feedback}
                  onChange={(e) => setGradeForm({ ...gradeForm, feedback: e.target.value })}
                  placeholder="Enter feedback for the student..."
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGradeDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="outline" 
              onClick={handleReturnForRevision}
              disabled={!gradeForm.feedback.trim()}
            >
              Return for Revision
            </Button>
            <Button onClick={handleGradeSubmission}>
              Save Grade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Assignment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this assignment? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAssignment}>
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Grade Dialog */}
      <Dialog open={showBulkGradeDialog} onOpenChange={setShowBulkGradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Grade Submissions</DialogTitle>
            <DialogDescription>
              Apply the same grade and feedback to {selectedSubmissions.length} submissions
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="bulk-grade">Grade for All</Label>
              <Input
                id="bulk-grade"
                type="number"
                value={bulkGradeForm.grade}
                onChange={(e) => setBulkGradeForm({ ...bulkGradeForm, grade: Number(e.target.value) })}
                placeholder="Enter grade"
              />
            </div>
            <div>
              <Label htmlFor="bulk-feedback">Feedback for All</Label>
              <Textarea
                id="bulk-feedback"
                value={bulkGradeForm.feedback}
                onChange={(e) => setBulkGradeForm({ ...bulkGradeForm, feedback: e.target.value })}
                placeholder="Enter feedback..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkGradeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkGrade}>
              Apply to Selected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Feedback Dialog */}
      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Feedback Notification</DialogTitle>
            <DialogDescription>
              Send a notification to {selectedSubmissions.length} students
            </DialogDescription>
          </DialogHeader>
          
          <div>
            <Label htmlFor="notification-message">Message</Label>
            <Textarea
              id="notification-message"
              value={feedbackMessage}
              onChange={(e) => setFeedbackMessage(e.target.value)}
              placeholder="Enter your message..."
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFeedbackDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendFeedback} disabled={!feedbackMessage.trim()}>
              <Mail className="h-4 w-4 mr-2" />
              Send Notification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Template Dialog */}
      <Dialog open={showSaveTemplateDialog} onOpenChange={setShowSaveTemplateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
            <DialogDescription>
              Save this assignment as a reusable template
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                value={templateForm.name}
                onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                placeholder="Enter template name"
              />
            </div>
            <div>
              <Label htmlFor="template-description">Description</Label>
              <Textarea
                id="template-description"
                value={templateForm.description}
                onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                placeholder="Enter template description..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveTemplateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTemplate} disabled={!templateForm.name.trim()}>
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}