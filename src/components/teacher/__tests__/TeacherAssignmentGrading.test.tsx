import React from 'react';
import { render, screen, within, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { format, addDays, subDays } from 'date-fns';
import { TeacherAssignmentGrading } from '../TeacherAssignmentGrading';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

// Mock react-query
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useQueryClient: () => ({
    invalidateQueries: jest.fn(),
  }),
}));

// Mock file upload and CSV export
jest.mock('@/lib/export-utils', () => ({
  exportToCSV: jest.fn(),
  exportToExcel: jest.fn(),
}));

// Rich text editor is simulated in the component itself

// Mock toast
const mockToast = jest.fn();
jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

describe('TeacherAssignmentGrading', () => {
  const mockTeacher = {
    id: 'teacher-1',
    email: 'teacher@example.com',
    role: 'teacher' as const,
    first_name: 'John',
    last_name: 'Doe',
    phone: null,
    avatar_url: null,
    timezone: 'UTC',
    language: 'en',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    last_sign_in_at: null,
    email_verified_at: null,
    is_active: true,
    metadata: null,
  };

  const mockAssignment = {
    id: 'assignment-1',
    title: 'Essay on Shakespeare',
    description: 'Write a 500-word essay about Shakespeare',
    instructions: '<p>Please analyze Hamlet Act 1</p>',
    type: 'essay' as const,
    points: 100,
    due_date: addDays(new Date(), 7).toISOString(),
    late_penalty: 10,
    allow_late_submissions: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    teacher_id: 'teacher-1',
    class_ids: ['class-1'],
    student_ids: [],
    rubric: {
      criteria: [
        { name: 'Content', points: 40, description: 'Quality of content' },
        { name: 'Grammar', points: 30, description: 'Grammar and spelling' },
        { name: 'Structure', points: 30, description: 'Essay structure' },
      ],
    },
    attachments: [],
    is_active: true,
    plagiarism_check: true,
    template_id: null,
  };

  const mockSubmission = {
    id: 'submission-1',
    assignment_id: 'assignment-1',
    student_id: 'student-1',
    content: 'This is my essay about Hamlet...',
    attachments: [],
    submitted_at: new Date().toISOString(),
    grade: null,
    feedback: null,
    status: 'submitted' as const,
    plagiarism_score: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    student: {
      id: 'student-1',
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane@example.com',
      avatar_url: null,
    },
  };

  const mockClass = {
    id: 'class-1',
    title: 'English Literature 101',
    description: 'Introduction to English Literature',
    students: [
      {
        id: 'student-1',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane@example.com',
      },
      {
        id: 'student-2',
        first_name: 'Bob',
        last_name: 'Johnson',
        email: 'bob@example.com',
      },
    ],
  };

  const mockTemplate = {
    id: 'template-1',
    name: 'Essay Template',
    description: 'Standard essay assignment template',
    instructions: '<p>Write an essay</p>',
    type: 'essay' as const,
    points: 100,
    rubric: {
      criteria: [
        { name: 'Content', points: 50, description: 'Content quality' },
        { name: 'Grammar', points: 50, description: 'Grammar and style' },
      ],
    },
  };

  const defaultProps = {
    teacher: mockTeacher,
    assignments: [mockAssignment],
    submissions: [mockSubmission],
    classes: [mockClass],
    templates: [mockTemplate],
    isLoading: false,
    error: null,
    onCreateAssignment: jest.fn(),
    onUpdateAssignment: jest.fn(),
    onDeleteAssignment: jest.fn(),
    onGradeSubmission: jest.fn(),
    onBulkGrade: jest.fn(),
    onSendFeedback: jest.fn(),
    onExportGrades: jest.fn(),
    onCreateTemplate: jest.fn(),
    onReturnForRevision: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockToast.mockClear();
  });

  describe('Component Rendering', () => {
    it('should render the main interface with all sections', () => {
      render(<TeacherAssignmentGrading {...defaultProps} />);
      
      expect(screen.getByRole('heading', { name: /assignment management/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /assignments/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /submissions/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /analytics/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /templates/i })).toBeInTheDocument();
    });

    it('should display assignment statistics correctly', () => {
      render(<TeacherAssignmentGrading {...defaultProps} />);
      
      // Check that statistics section has all required cards
      expect(screen.getByText('Total Assignments')).toBeInTheDocument();
      expect(screen.getByText('Total Submissions')).toBeInTheDocument();
      expect(screen.getByText('Graded')).toBeInTheDocument();
      expect(screen.getByText('Average Grade')).toBeInTheDocument();
      
      // Use getAllByText to handle multiple elements with same text
      const oneElements = screen.getAllByText('1');
      expect(oneElements.length).toBeGreaterThanOrEqual(2); // Total assignments and submissions
      
      const zeroPercentElements = screen.getAllByText('0%');
      expect(zeroPercentElements.length).toBeGreaterThanOrEqual(1); // Graded percentage and average grade
    });

    it('should handle loading state', () => {
      const loadingProps = { ...defaultProps, isLoading: true };
      render(<TeacherAssignmentGrading {...loadingProps} />);
      
      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /assignment management/i })).not.toBeInTheDocument();
    });

    it('should handle error state', () => {
      const errorProps = { ...defaultProps, error: 'Failed to load assignments' };
      render(<TeacherAssignmentGrading {...errorProps} />);
      
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/failed to load assignments/i)).toBeInTheDocument();
    });

    it('should handle empty state', () => {
      const emptyProps = { 
        ...defaultProps, 
        assignments: [], 
        submissions: [] 
      };
      render(<TeacherAssignmentGrading {...emptyProps} />);
      
      expect(screen.getByText(/no assignments found/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create your first assignment/i })).toBeInTheDocument();
    });
  });

  describe('Assignment List Display', () => {
    it('should display list of assignments with correct information', () => {
      render(<TeacherAssignmentGrading {...defaultProps} />);
      
      const assignmentCard = screen.getByTestId(`assignment-card-${mockAssignment.id}`);
      expect(assignmentCard).toBeInTheDocument();
      
      // Check for assignment title
      expect(within(assignmentCard).getByText(mockAssignment.title)).toBeInTheDocument();
      
      // Check for assignment type - use more specific selectors
      expect(within(assignmentCard).getByText('essay')).toBeInTheDocument();
      
      // Check for points
      expect(within(assignmentCard).getByText(`${mockAssignment.points} points`)).toBeInTheDocument();
      
      // Check for due date
      expect(within(assignmentCard).getByText(/due:/i)).toBeInTheDocument();
    });

    it('should show assignment status badges correctly', () => {
      const overdueAssignment = {
        ...mockAssignment,
        id: 'assignment-2',
        due_date: subDays(new Date(), 1).toISOString(),
      };
      
      const props = {
        ...defaultProps,
        assignments: [mockAssignment, overdueAssignment],
      };
      
      render(<TeacherAssignmentGrading {...props} />);
      
      expect(screen.getByText(/active/i)).toBeInTheDocument();
      expect(screen.getByText(/overdue/i)).toBeInTheDocument();
    });

    it('should display submission count for each assignment', () => {
      render(<TeacherAssignmentGrading {...defaultProps} />);
      
      const assignmentCard = screen.getByTestId(`assignment-card-${mockAssignment.id}`);
      expect(within(assignmentCard).getByText('1 submission')).toBeInTheDocument();
    });

    it('should filter assignments by type', async () => {
      const user = userEvent.setup();
      const multipleChoiceAssignment = {
        ...mockAssignment,
        id: 'assignment-2',
        title: 'Math Quiz',
        type: 'multiple_choice' as const,
      };
      
      const props = {
        ...defaultProps,
        assignments: [mockAssignment, multipleChoiceAssignment],
      };
      
      render(<TeacherAssignmentGrading {...props} />);
      
      const typeFilter = screen.getByRole('combobox', { name: /filter by type/i });
      await user.click(typeFilter);
      await user.click(screen.getByRole('option', { name: /essay/i }));
      
      expect(screen.getByTestId(`assignment-card-${mockAssignment.id}`)).toBeInTheDocument();
      expect(screen.queryByTestId(`assignment-card-${multipleChoiceAssignment.id}`)).not.toBeInTheDocument();
    });

    it('should sort assignments by due date', async () => {
      const user = userEvent.setup();
      const futureAssignment = {
        ...mockAssignment,
        id: 'assignment-2',
        title: 'Future Assignment',
        due_date: addDays(new Date(), 14).toISOString(),
      };
      
      const props = {
        ...defaultProps,
        assignments: [futureAssignment, mockAssignment],
      };
      
      render(<TeacherAssignmentGrading {...props} />);
      
      const sortSelect = screen.getByRole('combobox', { name: /sort by/i });
      await user.click(sortSelect);
      await user.click(screen.getByRole('option', { name: /due date/i }));
      
      const assignmentCards = screen.getAllByTestId(/assignment-card-/);
      expect(assignmentCards[0]).toHaveAttribute('data-testid', `assignment-card-${mockAssignment.id}`);
      expect(assignmentCards[1]).toHaveAttribute('data-testid', `assignment-card-${futureAssignment.id}`);
    });
  });

  describe('Assignment Creation', () => {
    it('should open create assignment dialog', async () => {
      const user = userEvent.setup();
      render(<TeacherAssignmentGrading {...defaultProps} />);
      
      const createButton = screen.getByRole('button', { name: /create assignment/i });
      await user.click(createButton);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /create new assignment/i })).toBeInTheDocument();
    });

    it('should create assignment with basic information', async () => {
      const user = userEvent.setup();
      render(<TeacherAssignmentGrading {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { name: /create assignment/i }));
      
      await user.type(screen.getByLabelText(/title/i), 'New Assignment');
      await user.type(screen.getByTestId('rich-text-editor'), 'Assignment instructions');
      
      const typeSelect = screen.getByRole('combobox', { name: /assignment type/i });
      await user.click(typeSelect);
      await user.click(screen.getByRole('option', { name: /essay/i }));
      
      await user.type(screen.getByLabelText(/points/i), '50');
      
      const dueDateInput = screen.getByLabelText(/due date/i);
      await user.type(dueDateInput, format(addDays(new Date(), 7), 'yyyy-MM-dd'));
      
      await user.click(screen.getByRole('button', { name: /create assignment/i }));
      
      expect(defaultProps.onCreateAssignment).toHaveBeenCalledWith({
        title: 'New Assignment',
        instructions: 'Assignment instructions',
        type: 'essay',
        points: 50,
        due_date: expect.any(String),
        teacher_id: mockTeacher.id,
        class_ids: [],
        student_ids: [],
        late_penalty: 0,
        allow_late_submissions: false,
        plagiarism_check: false,
      });
    });

    it('should assign to specific classes', async () => {
      const user = userEvent.setup();
      render(<TeacherAssignmentGrading {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { name: /create assignment/i }));
      
      const classSelect = screen.getByRole('combobox', { name: /assign to classes/i });
      await user.click(classSelect);
      await user.click(screen.getByRole('option', { name: mockClass.title }));
      
      await user.type(screen.getByLabelText(/title/i), 'Class Assignment');
      await user.click(screen.getByRole('button', { name: /create assignment/i }));
      
      expect(defaultProps.onCreateAssignment).toHaveBeenCalledWith(
        expect.objectContaining({
          class_ids: [mockClass.id],
        })
      );
    });

    it('should assign to individual students', async () => {
      const user = userEvent.setup();
      render(<TeacherAssignmentGrading {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { name: /create assignment/i }));
      
      const studentSelect = screen.getByRole('combobox', { name: /assign to students/i });
      await user.click(studentSelect);
      await user.click(screen.getByRole('option', { name: /jane smith/i }));
      
      await user.type(screen.getByLabelText(/title/i), 'Individual Assignment');
      await user.click(screen.getByRole('button', { name: /create assignment/i }));
      
      expect(defaultProps.onCreateAssignment).toHaveBeenCalledWith(
        expect.objectContaining({
          student_ids: ['student-1'],
        })
      );
    });

    it('should create custom rubric', async () => {
      const user = userEvent.setup();
      render(<TeacherAssignmentGrading {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { name: /create assignment/i }));
      await user.click(screen.getByRole('button', { name: /add rubric/i }));
      
      await user.type(screen.getByLabelText(/criteria name/i), 'Content');
      await user.type(screen.getByLabelText(/points/i), '40');
      await user.type(screen.getByLabelText(/description/i), 'Quality of content');
      
      await user.click(screen.getByRole('button', { name: /add criteria/i }));
      
      expect(screen.getByText('Content (40 points)')).toBeInTheDocument();
    });

    it('should set late submission policy', async () => {
      const user = userEvent.setup();
      render(<TeacherAssignmentGrading {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { name: /create assignment/i }));
      
      await user.click(screen.getByLabelText(/allow late submissions/i));
      await user.type(screen.getByLabelText(/late penalty/i), '15');
      
      await user.type(screen.getByLabelText(/title/i), 'Assignment with late policy');
      await user.click(screen.getByRole('button', { name: /create assignment/i }));
      
      expect(defaultProps.onCreateAssignment).toHaveBeenCalledWith(
        expect.objectContaining({
          allow_late_submissions: true,
          late_penalty: 15,
        })
      );
    });

    it('should validate required fields', async () => {
      const user = userEvent.setup();
      render(<TeacherAssignmentGrading {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { name: /create assignment/i }));
      await user.click(screen.getByRole('button', { name: /create assignment/i }));
      
      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
      expect(screen.getByText(/instructions are required/i)).toBeInTheDocument();
      expect(defaultProps.onCreateAssignment).not.toHaveBeenCalled();
    });
  });

  describe('Assignment Templates', () => {
    it('should display available templates', async () => {
      const user = userEvent.setup();
      render(<TeacherAssignmentGrading {...defaultProps} />);
      
      await user.click(screen.getByRole('tab', { name: /templates/i }));
      
      expect(screen.getByText(mockTemplate.name)).toBeInTheDocument();
      expect(screen.getByText(mockTemplate.description)).toBeInTheDocument();
    });

    it('should create assignment from template', async () => {
      const user = userEvent.setup();
      render(<TeacherAssignmentGrading {...defaultProps} />);
      
      await user.click(screen.getByRole('tab', { name: /templates/i }));
      
      const templateCard = screen.getByTestId(`template-card-${mockTemplate.id}`);
      const useTemplateButton = within(templateCard).getByRole('button', { name: /use template/i });
      await user.click(useTemplateButton);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByDisplayValue(mockTemplate.name)).toBeInTheDocument();
    });

    it('should save assignment as template', async () => {
      const user = userEvent.setup();
      render(<TeacherAssignmentGrading {...defaultProps} />);
      
      const assignmentCard = screen.getByTestId(`assignment-card-${mockAssignment.id}`);
      const moreButton = within(assignmentCard).getByRole('button', { name: /more options/i });
      await user.click(moreButton);
      
      await user.click(screen.getByRole('menuitem', { name: /save as template/i }));
      
      await user.type(screen.getByLabelText(/template name/i), 'My Essay Template');
      await user.click(screen.getByRole('button', { name: /save template/i }));
      
      expect(defaultProps.onCreateTemplate).toHaveBeenCalledWith({
        name: 'My Essay Template',
        description: '',
        instructions: mockAssignment.instructions,
        type: mockAssignment.type,
        points: mockAssignment.points,
        rubric: mockAssignment.rubric,
      });
    });
  });

  describe('Submission Viewing and Grading', () => {
    it('should display list of submissions', async () => {
      const user = userEvent.setup();
      render(<TeacherAssignmentGrading {...defaultProps} />);
      
      await user.click(screen.getByRole('tab', { name: /submissions/i }));
      
      const submissionCard = screen.getByTestId(`submission-card-${mockSubmission.id}`);
      expect(submissionCard).toBeInTheDocument();
      
      within(submissionCard).getByText('Jane Smith');
      within(submissionCard).getByText(mockAssignment.title);
      within(submissionCard).getByText(/submitted/i);
    });

    it('should open submission for grading', async () => {
      const user = userEvent.setup();
      render(<TeacherAssignmentGrading {...defaultProps} />);
      
      await user.click(screen.getByRole('tab', { name: /submissions/i }));
      
      const submissionCard = screen.getByTestId(`submission-card-${mockSubmission.id}`);
      await user.click(submissionCard);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /grade submission/i })).toBeInTheDocument();
      expect(screen.getByText(mockSubmission.content)).toBeInTheDocument();
    });

    it('should grade submission with rubric', async () => {
      const user = userEvent.setup();
      render(<TeacherAssignmentGrading {...defaultProps} />);
      
      await user.click(screen.getByRole('tab', { name: /submissions/i }));
      await user.click(screen.getByTestId(`submission-card-${mockSubmission.id}`));
      
      // Grade using rubric
      const contentSlider = screen.getByLabelText(/content score/i);
      fireEvent.change(contentSlider, { target: { value: '35' } });
      
      const grammarSlider = screen.getByLabelText(/grammar score/i);
      fireEvent.change(grammarSlider, { target: { value: '25' } });
      
      const structureSlider = screen.getByLabelText(/structure score/i);
      fireEvent.change(structureSlider, { target: { value: '28' } });
      
      await user.type(screen.getByLabelText(/feedback/i), 'Good work overall!');
      
      await user.click(screen.getByRole('button', { name: /save grade/i }));
      
      expect(defaultProps.onGradeSubmission).toHaveBeenCalledWith(mockSubmission.id, {
        grade: 88, // 35 + 25 + 28
        feedback: 'Good work overall!',
        rubric_scores: {
          Content: 35,
          Grammar: 25,
          Structure: 28,
        },
      });
    });

    it('should grade submission with overall score', async () => {
      const user = userEvent.setup();
      render(<TeacherAssignmentGrading {...defaultProps} />);
      
      await user.click(screen.getByRole('tab', { name: /submissions/i }));
      await user.click(screen.getByTestId(`submission-card-${mockSubmission.id}`));
      
      await user.click(screen.getByRole('tab', { name: /overall grade/i }));
      
      await user.type(screen.getByLabelText(/points earned/i), '85');
      await user.type(screen.getByLabelText(/feedback/i), 'Excellent work!');
      
      await user.click(screen.getByRole('button', { name: /save grade/i }));
      
      expect(defaultProps.onGradeSubmission).toHaveBeenCalledWith(mockSubmission.id, {
        grade: 85,
        feedback: 'Excellent work!',
      });
    });

    it('should return submission for revision', async () => {
      const user = userEvent.setup();
      render(<TeacherAssignmentGrading {...defaultProps} />);
      
      await user.click(screen.getByRole('tab', { name: /submissions/i }));
      await user.click(screen.getByTestId(`submission-card-${mockSubmission.id}`));
      
      await user.type(screen.getByLabelText(/feedback/i), 'Please revise and resubmit');
      await user.click(screen.getByRole('button', { name: /return for revision/i }));
      
      expect(defaultProps.onReturnForRevision).toHaveBeenCalledWith(mockSubmission.id, {
        feedback: 'Please revise and resubmit',
      });
    });

    it('should show plagiarism detection alerts', async () => {
      const user = userEvent.setup();
      const highPlagiarismSubmission = {
        ...mockSubmission,
        plagiarism_score: 85,
      };
      
      const props = {
        ...defaultProps,
        submissions: [highPlagiarismSubmission],
      };
      
      render(<TeacherAssignmentGrading {...props} />);
      
      await user.click(screen.getByRole('tab', { name: /submissions/i }));
      
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/high plagiarism score/i)).toBeInTheDocument();
    });
  });

  describe('Bulk Operations', () => {
    const multipleSubmissions = [
      mockSubmission,
      {
        ...mockSubmission,
        id: 'submission-2',
        student_id: 'student-2',
        student: {
          id: 'student-2',
          first_name: 'Bob',
          last_name: 'Johnson',
          email: 'bob@example.com',
          avatar_url: null,
        },
      },
    ];

    it('should select multiple submissions for bulk grading', async () => {
      const user = userEvent.setup();
      const props = {
        ...defaultProps,
        submissions: multipleSubmissions,
      };
      
      render(<TeacherAssignmentGrading {...props} />);
      
      await user.click(screen.getByRole('tab', { name: /submissions/i }));
      
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]); // Select first submission
      await user.click(checkboxes[1]); // Select second submission
      
      expect(screen.getByText('2 selected')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /bulk grade/i })).toBeInTheDocument();
    });

    it('should perform bulk grading', async () => {
      const user = userEvent.setup();
      const props = {
        ...defaultProps,
        submissions: multipleSubmissions,
      };
      
      render(<TeacherAssignmentGrading {...props} />);
      
      await user.click(screen.getByRole('tab', { name: /submissions/i }));
      
      // Select submissions
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);
      await user.click(checkboxes[1]);
      
      await user.click(screen.getByRole('button', { name: /bulk grade/i }));
      
      await user.type(screen.getByLabelText(/grade for all/i), '80');
      await user.type(screen.getByLabelText(/feedback for all/i), 'Good work everyone!');
      
      await user.click(screen.getByRole('button', { name: /apply to selected/i }));
      
      expect(defaultProps.onBulkGrade).toHaveBeenCalledWith(
        ['submission-1', 'submission-2'],
        {
          grade: 80,
          feedback: 'Good work everyone!',
        }
      );
    });

    it('should send feedback notifications to multiple students', async () => {
      const user = userEvent.setup();
      const props = {
        ...defaultProps,
        submissions: multipleSubmissions,
      };
      
      render(<TeacherAssignmentGrading {...props} />);
      
      await user.click(screen.getByRole('tab', { name: /submissions/i }));
      
      // Select submissions
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);
      await user.click(checkboxes[1]);
      
      await user.click(screen.getByRole('button', { name: /send feedback/i }));
      
      await user.type(screen.getByLabelText(/message/i), 'Your grades are now available');
      await user.click(screen.getByRole('button', { name: /send notification/i }));
      
      expect(defaultProps.onSendFeedback).toHaveBeenCalledWith(
        ['submission-1', 'submission-2'],
        'Your grades are now available'
      );
    });
  });

  describe('Export Functionality', () => {
    it('should export grades to CSV', async () => {
      const user = userEvent.setup();
      render(<TeacherAssignmentGrading {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { name: /export grades/i }));
      await user.click(screen.getByRole('menuitem', { name: /export to csv/i }));
      
      expect(defaultProps.onExportGrades).toHaveBeenCalledWith('csv');
    });

    it('should export grades to Excel', async () => {
      const user = userEvent.setup();
      render(<TeacherAssignmentGrading {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { name: /export grades/i }));
      await user.click(screen.getByRole('menuitem', { name: /export to excel/i }));
      
      expect(defaultProps.onExportGrades).toHaveBeenCalledWith('excel');
    });

    it('should export filtered results', async () => {
      const user = userEvent.setup();
      render(<TeacherAssignmentGrading {...defaultProps} />);
      
      // Apply filter first
      await user.click(screen.getByRole('tab', { name: /submissions/i }));
      const statusFilter = screen.getByRole('combobox', { name: /filter by status/i });
      await user.click(statusFilter);
      await user.click(screen.getByRole('option', { name: /submitted/i }));
      
      await user.click(screen.getByRole('button', { name: /export grades/i }));
      await user.click(screen.getByRole('menuitem', { name: /export filtered/i }));
      
      expect(defaultProps.onExportGrades).toHaveBeenCalledWith('csv', { status: 'submitted' });
    });
  });

  describe('Analytics and Completion Tracking', () => {
    it('should display assignment completion rates', async () => {
      const user = userEvent.setup();
      render(<TeacherAssignmentGrading {...defaultProps} />);
      
      await user.click(screen.getByRole('tab', { name: /analytics/i }));
      
      expect(screen.getByText(/completion rate/i)).toBeInTheDocument();
      expect(screen.getByText(/50%/i)).toBeInTheDocument(); // 1 submission out of 2 students
    });

    it('should show grade distribution chart', async () => {
      const user = userEvent.setup();
      const gradedSubmissions = [
        { ...mockSubmission, grade: 85, status: 'graded' as const },
        { 
          ...mockSubmission, 
          id: 'submission-2', 
          grade: 92, 
          status: 'graded' as const,
          student_id: 'student-2',
        },
      ];
      
      const props = {
        ...defaultProps,
        submissions: gradedSubmissions,
      };
      
      render(<TeacherAssignmentGrading {...props} />);
      
      await user.click(screen.getByRole('tab', { name: /analytics/i }));
      
      expect(screen.getByText(/grade distribution/i)).toBeInTheDocument();
      expect(screen.getByTestId('grade-distribution-chart')).toBeInTheDocument();
    });

    it('should calculate average grades correctly', async () => {
      const user = userEvent.setup();
      const gradedSubmissions = [
        { ...mockSubmission, grade: 80, status: 'graded' as const },
        { 
          ...mockSubmission, 
          id: 'submission-2', 
          grade: 90, 
          status: 'graded' as const,
          student_id: 'student-2',
        },
      ];
      
      const props = {
        ...defaultProps,
        submissions: gradedSubmissions,
      };
      
      render(<TeacherAssignmentGrading {...props} />);
      
      await user.click(screen.getByRole('tab', { name: /analytics/i }));
      
      expect(screen.getByText(/average grade/i)).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument(); // (80 + 90) / 2
    });
  });

  describe('Assignment Management', () => {
    it('should edit existing assignment', async () => {
      const user = userEvent.setup();
      render(<TeacherAssignmentGrading {...defaultProps} />);
      
      const assignmentCard = screen.getByTestId(`assignment-card-${mockAssignment.id}`);
      const editButton = within(assignmentCard).getByRole('button', { name: /edit/i });
      await user.click(editButton);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByDisplayValue(mockAssignment.title)).toBeInTheDocument();
      
      await user.clear(screen.getByLabelText(/title/i));
      await user.type(screen.getByLabelText(/title/i), 'Updated Assignment Title');
      
      await user.click(screen.getByRole('button', { name: /update assignment/i }));
      
      expect(defaultProps.onUpdateAssignment).toHaveBeenCalledWith(
        mockAssignment.id,
        expect.objectContaining({
          title: 'Updated Assignment Title',
        })
      );
    });

    it('should delete assignment with confirmation', async () => {
      const user = userEvent.setup();
      render(<TeacherAssignmentGrading {...defaultProps} />);
      
      const assignmentCard = screen.getByTestId(`assignment-card-${mockAssignment.id}`);
      const moreButton = within(assignmentCard).getByRole('button', { name: /more options/i });
      await user.click(moreButton);
      
      await user.click(screen.getByRole('menuitem', { name: /delete/i }));
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      
      await user.click(screen.getByRole('button', { name: /confirm delete/i }));
      
      expect(defaultProps.onDeleteAssignment).toHaveBeenCalledWith(mockAssignment.id);
    });

    it('should duplicate assignment', async () => {
      const user = userEvent.setup();
      render(<TeacherAssignmentGrading {...defaultProps} />);
      
      const assignmentCard = screen.getByTestId(`assignment-card-${mockAssignment.id}`);
      const moreButton = within(assignmentCard).getByRole('button', { name: /more options/i });
      await user.click(moreButton);
      
      await user.click(screen.getByRole('menuitem', { name: /duplicate/i }));
      
      expect(defaultProps.onCreateAssignment).toHaveBeenCalledWith(
        expect.objectContaining({
          title: `${mockAssignment.title} (Copy)`,
          description: mockAssignment.description,
          instructions: mockAssignment.instructions,
          type: mockAssignment.type,
          points: mockAssignment.points,
        })
      );
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<TeacherAssignmentGrading {...defaultProps} />);
      
      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getAllByRole('tab')).toHaveLength(4);
      expect(screen.getByRole('button', { name: /create assignment/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<TeacherAssignmentGrading {...defaultProps} />);
      
      const firstTab = screen.getByRole('tab', { name: /assignments/i });
      const secondTab = screen.getByRole('tab', { name: /submissions/i });
      
      firstTab.focus();
      expect(firstTab).toHaveFocus();
      
      await user.tab();
      expect(secondTab).toHaveFocus();
    });

    it('should announce state changes to screen readers', async () => {
      const user = userEvent.setup();
      render(<TeacherAssignmentGrading {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { name: /create assignment/i }));
      
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-describedby');
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby');
    });
  });

  describe('Error Handling', () => {
    it('should handle assignment creation errors', async () => {
      const user = userEvent.setup();
      const failingProps = {
        ...defaultProps,
        onCreateAssignment: jest.fn().mockRejectedValue(new Error('Creation failed')),
      };
      
      render(<TeacherAssignmentGrading {...failingProps} />);
      
      await user.click(screen.getByRole('button', { name: /create assignment/i }));
      await user.type(screen.getByLabelText(/title/i), 'Test Assignment');
      await user.click(screen.getByRole('button', { name: /create assignment/i }));
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Failed to create assignment',
          variant: 'destructive',
        });
      });
    });

    it('should handle grading errors gracefully', async () => {
      const user = userEvent.setup();
      const failingProps = {
        ...defaultProps,
        onGradeSubmission: jest.fn().mockRejectedValue(new Error('Grading failed')),
      };
      
      render(<TeacherAssignmentGrading {...failingProps} />);
      
      await user.click(screen.getByRole('tab', { name: /submissions/i }));
      await user.click(screen.getByTestId(`submission-card-${mockSubmission.id}`));
      
      await user.type(screen.getByLabelText(/points earned/i), '85');
      await user.click(screen.getByRole('button', { name: /save grade/i }));
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Failed to save grade',
          variant: 'destructive',
        });
      });
    });

    it('should validate file uploads', async () => {
      const user = userEvent.setup();
      render(<TeacherAssignmentGrading {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { name: /create assignment/i }));
      
      const fileInput = screen.getByLabelText(/attachment/i);
      const invalidFile = new File(['content'], 'test.exe', { type: 'application/x-executable' });
      
      await user.upload(fileInput, invalidFile);
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Invalid file type. Allowed types: PDF, DOC, DOCX, JPG, PNG',
          variant: 'destructive',
        });
      });
    });
  });
});