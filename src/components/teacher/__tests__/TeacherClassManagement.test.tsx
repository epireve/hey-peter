import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeacherClassManagement } from '../TeacherClassManagement';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
    },
  },
}));

// Mock data
const mockClasses = [
  {
    id: '1',
    teacher_id: 'teacher-123',
    name: 'Business English Advanced',
    description: 'Advanced business communication skills',
    level: 'advanced',
    capacity: 8,
    enrolled_count: 5,
    status: 'active',
    type: 'group',
    is_online: true,
    materials: 'Textbook chapters 5-8',
    requirements: 'B2 level or higher',
    created_at: '2024-01-10T10:00:00Z',
    updated_at: '2024-01-10T10:00:00Z',
  },
  {
    id: '2',
    teacher_id: 'teacher-123',
    name: 'Everyday English A',
    description: 'Daily conversation practice',
    level: 'intermediate',
    capacity: 9,
    enrolled_count: 9,
    status: 'active',
    type: 'group',
    is_online: false,
    materials: 'Course handouts',
    requirements: 'Basic English proficiency',
    created_at: '2024-01-08T10:00:00Z',
    updated_at: '2024-01-08T10:00:00Z',
  },
  {
    id: '3',
    teacher_id: 'teacher-123',
    name: 'IELTS Preparation',
    description: 'Comprehensive IELTS exam prep',
    level: 'advanced',
    capacity: 6,
    enrolled_count: 4,
    status: 'cancelled',
    type: 'group',
    is_online: true,
    materials: 'IELTS practice tests',
    requirements: 'Target band 6.0+',
    created_at: '2024-01-05T10:00:00Z',
    updated_at: '2024-01-09T10:00:00Z',
  },
];

const mockSchedules = [
  {
    id: 'schedule-1',
    class_id: '1',
    day_of_week: 1, // Monday
    start_time: '10:00:00',
    end_time: '11:30:00',
    effective_from: '2024-01-15',
    effective_until: null,
  },
  {
    id: 'schedule-2',
    class_id: '1',
    day_of_week: 3, // Wednesday
    start_time: '10:00:00',
    end_time: '11:30:00',
    effective_from: '2024-01-15',
    effective_until: null,
  },
  {
    id: 'schedule-3',
    class_id: '2',
    day_of_week: 2, // Tuesday
    start_time: '14:00:00',
    end_time: '15:30:00',
    effective_from: '2024-01-10',
    effective_until: null,
  },
];

const mockEnrollments = [
  {
    id: 'enroll-1',
    class_id: '1',
    student_id: 'student-1',
    enrolled_at: '2024-01-10T09:00:00Z',
    status: 'active',
    student: {
      id: 'student-1',
      full_name: 'John Doe',
      email: 'john@example.com',
    },
  },
  {
    id: 'enroll-2',
    class_id: '1',
    student_id: 'student-2',
    enrolled_at: '2024-01-11T10:00:00Z',
    status: 'active',
    student: {
      id: 'student-2',
      full_name: 'Jane Smith',
      email: 'jane@example.com',
    },
  },
];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('TeacherClassManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'teacher-123' } },
      error: null,
    });
  });

  describe('Class List Display', () => {
    it('should display list of teacher classes', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockClasses, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      render(<TeacherClassManagement />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Business English Advanced')).toBeInTheDocument();
        expect(screen.getByText('Everyday English A')).toBeInTheDocument();
        expect(screen.getByText('IELTS Preparation')).toBeInTheDocument();
      });
    });

    it('should display class details including level and capacity', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockClasses, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      render(<TeacherClassManagement />, { wrapper: createWrapper() });

      await waitFor(() => {
        const advancedElements = screen.getAllByText('Advanced');
        expect(advancedElements.length).toBeGreaterThan(0);
        expect(screen.getByText('5/8 enrolled')).toBeInTheDocument();
        expect(screen.getByText('9/9 enrolled')).toBeInTheDocument();
      });
    });

    it('should show class status badges', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockClasses, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      render(<TeacherClassManagement />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getAllByText('Active')).toHaveLength(2);
        expect(screen.getByText('Cancelled')).toBeInTheDocument();
      });
    });

    it('should filter classes by status', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockClasses, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      render(<TeacherClassManagement />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Business English Advanced')).toBeInTheDocument();
      });

      // Click on status filter
      const statusFilter = screen.getByRole('combobox', { name: /filter by status/i });
      fireEvent.click(statusFilter);
      fireEvent.click(screen.getByRole('option', { name: /cancelled/i }));

      await waitFor(() => {
        expect(screen.queryByText('Business English Advanced')).not.toBeInTheDocument();
        expect(screen.getByText('IELTS Preparation')).toBeInTheDocument();
      });
    });

    it('should search classes by name', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockClasses, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      render(<TeacherClassManagement />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Business English Advanced')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search classes/i);
      await userEvent.type(searchInput, 'business');

      await waitFor(() => {
        expect(screen.getByText('Business English Advanced')).toBeInTheDocument();
        expect(screen.queryByText('Everyday English A')).not.toBeInTheDocument();
      });
    });
  });

  describe('Create New Class', () => {
    it('should open create class dialog when clicking new class button', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      render(<TeacherClassManagement />, { wrapper: createWrapper() });

      const newClassButton = screen.getByRole('button', { name: /new class/i });
      fireEvent.click(newClassButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Create New Class')).toBeInTheDocument();
      });
    });

    it('should create new class with all required fields', async () => {
      const mockFrom = jest.fn().mockReturnThis();
      const mockInsert = jest.fn().mockReturnThis();
      const mockSelectInsert = jest.fn().mockResolvedValue({
        data: { id: '4', ...mockClasses[0] },
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        insert: mockInsert,
        single: mockSelectInsert,
      });

      mockInsert.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        single: mockSelectInsert,
      });

      render(<TeacherClassManagement />, { wrapper: createWrapper() });

      const newClassButton = screen.getByRole('button', { name: /new class/i });
      fireEvent.click(newClassButton);

      // Fill form
      await userEvent.type(screen.getByLabelText(/class name/i), 'Grammar Fundamentals');
      await userEvent.type(screen.getByLabelText(/description/i), 'Basic grammar rules and practice');
      
      const levelSelect = screen.getByLabelText(/level/i);
      fireEvent.click(levelSelect);
      fireEvent.click(screen.getByRole('option', { name: /beginner/i }));

      await userEvent.clear(screen.getByLabelText(/capacity/i));
      await userEvent.type(screen.getByLabelText(/capacity/i), '6');

      const typeSelect = screen.getByLabelText(/class type/i);
      fireEvent.click(typeSelect);
      fireEvent.click(screen.getByRole('option', { name: /group/i }));

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create class/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith({
          teacher_id: 'teacher-123',
          name: 'Grammar Fundamentals',
          description: 'Basic grammar rules and practice',
          level: 'beginner',
          capacity: 6,
          type: 'group',
          status: 'active',
          is_online: false,
          materials: '',
          requirements: '',
        });
      });
    });

    it('should validate required fields', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      render(<TeacherClassManagement />, { wrapper: createWrapper() });

      const newClassButton = screen.getByRole('button', { name: /new class/i });
      fireEvent.click(newClassButton);

      // Try to submit without filling required fields
      const submitButton = screen.getByRole('button', { name: /create class/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/class name is required/i)).toBeInTheDocument();
      });
    });

    it('should set online/offline mode', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      render(<TeacherClassManagement />, { wrapper: createWrapper() });

      const newClassButton = screen.getByRole('button', { name: /new class/i });
      fireEvent.click(newClassButton);

      const onlineToggle = screen.getByRole('switch', { name: /online class/i });
      expect(onlineToggle).not.toBeChecked();

      fireEvent.click(onlineToggle);
      expect(onlineToggle).toBeChecked();
    });
  });

  describe('Edit Class', () => {
    it('should open edit dialog with pre-filled data', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockClasses, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      render(<TeacherClassManagement />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Business English Advanced')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Business English Advanced')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Advanced business communication skills')).toBeInTheDocument();
      });
    });

    it('should update class information', async () => {
      const mockFrom = jest.fn().mockReturnThis();
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({ data: mockClasses[0], error: null });

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockClasses, error: null }),
        update: mockUpdate,
      });

      mockUpdate.mockReturnValue({
        eq: mockEq,
      });

      render(<TeacherClassManagement />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Business English Advanced')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      fireEvent.click(editButtons[0]);

      // Update name
      const nameInput = screen.getByLabelText(/class name/i);
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Business English Pro');

      // Submit
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
          name: 'Business English Pro',
        }));
      });
    });
  });

  describe('Class Schedules', () => {
    it('should display class schedules', async () => {
      const mockFrom = jest.fn();
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockClasses, error: null }),
      });

      (supabase.from as jest.Mock).mockImplementation((table) => {
        if (table === 'classes') {
          return mockFrom();
        }
        if (table === 'class_schedules') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: mockSchedules.filter(s => s.class_id === '1'), error: null }),
          };
        }
        return mockFrom();
      });

      render(<TeacherClassManagement />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Business English Advanced')).toBeInTheDocument();
      });

      // Click on view details
      const viewButtons = screen.getAllByRole('button', { name: /view details/i });
      fireEvent.click(viewButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/monday/i)).toBeInTheDocument();
        expect(screen.getByText(/10:00 - 11:30/i)).toBeInTheDocument();
        expect(screen.getByText(/wednesday/i)).toBeInTheDocument();
      });
    });

    it('should add new schedule slot', async () => {
      const mockFrom = jest.fn();
      const mockInsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockResolvedValue({
        data: { id: 'schedule-4', ...mockSchedules[0] },
        error: null,
      });

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockClasses, error: null }),
      });

      (supabase.from as jest.Mock).mockImplementation((table) => {
        if (table === 'classes') {
          return mockFrom();
        }
        if (table === 'class_schedules') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: [], error: null }),
            insert: mockInsert,
          };
        }
        return mockFrom();
      });

      mockInsert.mockReturnValue({
        select: mockSelect,
      });

      render(<TeacherClassManagement />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Business English Advanced')).toBeInTheDocument();
      });

      // Open schedule management
      const viewButtons = screen.getAllByRole('button', { name: /view details/i });
      fireEvent.click(viewButtons[0]);

      // Add schedule
      const addScheduleButton = await screen.findByRole('button', { name: /add schedule/i });
      fireEvent.click(addScheduleButton);

      // Fill schedule form
      const daySelect = screen.getByLabelText(/day of week/i);
      fireEvent.click(daySelect);
      fireEvent.click(screen.getByRole('option', { name: /friday/i }));

      await userEvent.type(screen.getByLabelText(/start time/i), '14:00');
      await userEvent.type(screen.getByLabelText(/end time/i), '15:30');

      const saveButton = screen.getByRole('button', { name: /add schedule/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
          class_id: '1',
          day_of_week: 5,
          start_time: '14:00:00',
          end_time: '15:30:00',
        }));
      });
    });

    it('should delete schedule slot', async () => {
      const mockFrom = jest.fn();
      const mockDelete = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({ data: null, error: null });

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockClasses, error: null }),
      });

      (supabase.from as jest.Mock).mockImplementation((table) => {
        if (table === 'classes') {
          return mockFrom();
        }
        if (table === 'class_schedules') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: mockSchedules.filter(s => s.class_id === '1'), error: null }),
            delete: mockDelete,
          };
        }
        return mockFrom();
      });

      mockDelete.mockReturnValue({
        eq: mockEq,
      });

      render(<TeacherClassManagement />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Business English Advanced')).toBeInTheDocument();
      });

      // Open schedule management
      const viewButtons = screen.getAllByRole('button', { name: /view details/i });
      fireEvent.click(viewButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/monday/i)).toBeInTheDocument();
      });

      // Delete schedule
      const deleteButtons = screen.getAllByRole('button', { name: /delete schedule/i });
      fireEvent.click(deleteButtons[0]);

      // Confirm deletion
      const confirmButton = await screen.findByRole('button', { name: /confirm/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockDelete).toHaveBeenCalled();
        expect(mockEq).toHaveBeenCalledWith('id', 'schedule-1');
      });
    });
  });

  describe('Student Roster', () => {
    it('should display enrolled students', async () => {
      const mockFrom = jest.fn();
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockClasses, error: null }),
      });

      (supabase.from as jest.Mock).mockImplementation((table) => {
        if (table === 'classes') {
          return mockFrom();
        }
        if (table === 'class_enrollments') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: mockEnrollments, error: null }),
          };
        }
        return mockFrom();
      });

      render(<TeacherClassManagement />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Business English Advanced')).toBeInTheDocument();
      });

      // Open student roster
      const viewButtons = screen.getAllByRole('button', { name: /view details/i });
      fireEvent.click(viewButtons[0]);

      const rosterTab = screen.getByRole('tab', { name: /students/i });
      fireEvent.click(rosterTab);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    it('should remove student from class', async () => {
      const mockFrom = jest.fn();
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({ data: null, error: null });

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockClasses, error: null }),
      });

      (supabase.from as jest.Mock).mockImplementation((table) => {
        if (table === 'classes') {
          return mockFrom();
        }
        if (table === 'class_enrollments') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: mockEnrollments, error: null }),
            update: mockUpdate,
          };
        }
        return mockFrom();
      });

      mockUpdate.mockReturnValue({
        eq: mockEq,
      });

      render(<TeacherClassManagement />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Business English Advanced')).toBeInTheDocument();
      });

      // Open student roster
      const viewButtons = screen.getAllByRole('button', { name: /view details/i });
      fireEvent.click(viewButtons[0]);

      const rosterTab = screen.getByRole('tab', { name: /students/i });
      fireEvent.click(rosterTab);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Remove student
      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      fireEvent.click(removeButtons[0]);

      // Confirm
      const confirmButton = await screen.findByRole('button', { name: /confirm/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith({ status: 'cancelled' });
        expect(mockEq).toHaveBeenCalledWith('id', 'enroll-1');
      });
    });
  });

  describe('Cancel and Reschedule', () => {
    it('should cancel a class', async () => {
      const mockFrom = jest.fn();
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({ data: null, error: null });

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockClasses, error: null }),
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockClasses, error: null }),
        update: mockUpdate,
      });

      mockUpdate.mockReturnValue({
        eq: mockEq,
      });

      render(<TeacherClassManagement />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Business English Advanced')).toBeInTheDocument();
      });

      // Cancel class
      const moreButtons = screen.getAllByRole('button', { name: /more options/i });
      fireEvent.click(moreButtons[0]);

      const cancelOption = screen.getByRole('menuitem', { name: /cancel class/i });
      fireEvent.click(cancelOption);

      // Confirm cancellation
      const confirmButton = await screen.findByRole('button', { name: /confirm cancel/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith({ status: 'cancelled' });
        expect(mockEq).toHaveBeenCalledWith('id', '1');
      });
    });

    it('should reschedule a class session', async () => {
      const mockFrom = jest.fn();
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockClasses, error: null }),
      });

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      render(<TeacherClassManagement />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Business English Advanced')).toBeInTheDocument();
      });

      // Open reschedule dialog
      const moreButtons = screen.getAllByRole('button', { name: /more options/i });
      fireEvent.click(moreButtons[0]);

      const rescheduleOption = screen.getByRole('menuitem', { name: /reschedule/i });
      fireEvent.click(rescheduleOption);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/reschedule class/i)).toBeInTheDocument();
      });
    });
  });

  describe('Clone Class', () => {
    it('should clone existing class', async () => {
      const mockFrom = jest.fn();
      const mockInsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockResolvedValue({
        data: { id: '4', ...mockClasses[0], name: 'Business English Advanced (Copy)' },
        error: null,
      });

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockClasses, error: null }),
      });

      (supabase.from as jest.Mock).mockImplementation((table) => {
        if (table === 'classes') {
          return {
            ...mockFrom(),
            insert: mockInsert,
          };
        }
        return mockFrom();
      });

      mockInsert.mockReturnValue({
        select: mockSelect,
      });

      render(<TeacherClassManagement />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Business English Advanced')).toBeInTheDocument();
      });

      // Clone class
      const moreButtons = screen.getAllByRole('button', { name: /more options/i });
      fireEvent.click(moreButtons[0]);

      const cloneOption = screen.getByRole('menuitem', { name: /clone class/i });
      fireEvent.click(cloneOption);

      // Confirm clone
      const confirmButton = await screen.findByRole('button', { name: /clone/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
          name: 'Business English Advanced (Copy)',
          teacher_id: 'teacher-123',
          level: 'advanced',
          capacity: 8,
        }));
      });
    });

    it('should allow editing cloned class name', async () => {
      const mockFrom = jest.fn();
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockClasses, error: null }),
      });

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      render(<TeacherClassManagement />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Business English Advanced')).toBeInTheDocument();
      });

      // Clone class
      const moreButtons = screen.getAllByRole('button', { name: /more options/i });
      fireEvent.click(moreButtons[0]);

      const cloneOption = screen.getByRole('menuitem', { name: /clone class/i });
      fireEvent.click(cloneOption);

      // Edit name
      const nameInput = screen.getByLabelText(/new class name/i);
      expect(nameInput).toHaveValue('Business English Advanced (Copy)');

      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Business English Weekend');

      expect(nameInput).toHaveValue('Business English Weekend');
    });
  });

  describe('Materials and Requirements', () => {
    it('should display class materials and requirements', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockClasses, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      render(<TeacherClassManagement />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Business English Advanced')).toBeInTheDocument();
      });

      // View details
      const viewButtons = screen.getAllByRole('button', { name: /view details/i });
      fireEvent.click(viewButtons[0]);

      const materialsTab = screen.getByRole('tab', { name: /materials/i });
      fireEvent.click(materialsTab);

      await waitFor(() => {
        expect(screen.getByText('Textbook chapters 5-8')).toBeInTheDocument();
        expect(screen.getByText('B2 level or higher')).toBeInTheDocument();
      });
    });

    it('should update class materials', async () => {
      const mockFrom = jest.fn();
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({ data: null, error: null });

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockClasses, error: null }),
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockClasses, error: null }),
        update: mockUpdate,
      });

      mockUpdate.mockReturnValue({
        eq: mockEq,
      });

      render(<TeacherClassManagement />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Business English Advanced')).toBeInTheDocument();
      });

      // View details
      const viewButtons = screen.getAllByRole('button', { name: /view details/i });
      fireEvent.click(viewButtons[0]);

      const materialsTab = screen.getByRole('tab', { name: /materials/i });
      fireEvent.click(materialsTab);

      // Edit materials
      const editMaterialsButton = screen.getByRole('button', { name: /edit materials/i });
      fireEvent.click(editMaterialsButton);

      const materialsInput = screen.getByLabelText(/class materials/i);
      await userEvent.clear(materialsInput);
      await userEvent.type(materialsInput, 'Updated textbook and online resources');

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith({
          materials: 'Updated textbook and online resources',
        });
      });
    });
  });

  describe('Batch Operations', () => {
    it('should select multiple classes for batch operations', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockClasses, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      render(<TeacherClassManagement />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Business English Advanced')).toBeInTheDocument();
      });

      // Select classes
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]); // First class
      fireEvent.click(checkboxes[2]); // Second class

      // Batch actions should appear
      expect(screen.getByText('2 selected')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /batch actions/i })).toBeInTheDocument();
    });

    it('should perform batch status update', async () => {
      const mockFrom = jest.fn();
      const mockUpdate = jest.fn().mockReturnThis();
      const mockIn = jest.fn().mockResolvedValue({ data: null, error: null });

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockClasses, error: null }),
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockClasses, error: null }),
        update: mockUpdate,
      });

      mockUpdate.mockReturnValue({
        in: mockIn,
      });

      render(<TeacherClassManagement />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Business English Advanced')).toBeInTheDocument();
      });

      // Select classes
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]);
      fireEvent.click(checkboxes[2]);

      // Open batch actions
      const batchButton = screen.getByRole('button', { name: /batch actions/i });
      fireEvent.click(batchButton);

      const pauseOption = screen.getByRole('menuitem', { name: /pause selected/i });
      fireEvent.click(pauseOption);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith({ status: 'paused' });
        expect(mockIn).toHaveBeenCalledWith('id', ['1', '2']);
      });
    });

    it('should select all classes', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockClasses, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      render(<TeacherClassManagement />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Business English Advanced')).toBeInTheDocument();
      });

      // Select all
      const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
      fireEvent.click(selectAllCheckbox);

      expect(screen.getByText('3 selected')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for interactive elements', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockClasses, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      render(<TeacherClassManagement />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /new class/i })).toBeInTheDocument();
        expect(screen.getByRole('combobox', { name: /filter by status/i })).toBeInTheDocument();
        expect(screen.getByRole('searchbox', { name: /search classes/i })).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockClasses, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      render(<TeacherClassManagement />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Business English Advanced')).toBeInTheDocument();
      });

      // Tab through elements
      const newClassButton = screen.getByRole('button', { name: /new class/i });
      newClassButton.focus();
      expect(document.activeElement).toBe(newClassButton);

      // Tab to search
      await userEvent.tab();
      const searchInput = screen.getByRole('searchbox');
      expect(document.activeElement).toBe(searchInput);
    });

    it('should announce status changes to screen readers', async () => {
      const mockFrom = jest.fn();
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({ data: null, error: null });

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockClasses, error: null }),
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockClasses, error: null }),
        update: mockUpdate,
      });

      mockUpdate.mockReturnValue({
        eq: mockEq,
      });

      render(<TeacherClassManagement />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Business English Advanced')).toBeInTheDocument();
      });

      // Cancel class
      const moreButtons = screen.getAllByRole('button', { name: /more options/i });
      fireEvent.click(moreButtons[0]);

      const cancelOption = screen.getByRole('menuitem', { name: /cancel class/i });
      fireEvent.click(cancelOption);

      const confirmButton = await screen.findByRole('button', { name: /confirm cancel/i });
      fireEvent.click(confirmButton);

      // Check for status message
      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent(/class cancelled successfully/i);
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error message when class creation fails', async () => {
      const mockFrom = jest.fn();
      const mockInsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Failed to create class' },
      });

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      });

      (supabase.from as jest.Mock).mockReturnValue({
        ...mockFrom(),
        insert: mockInsert,
      });

      mockInsert.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        single: mockSelect,
      });

      render(<TeacherClassManagement />, { wrapper: createWrapper() });

      const newClassButton = screen.getByRole('button', { name: /new class/i });
      fireEvent.click(newClassButton);

      // Fill minimal form
      await userEvent.type(screen.getByLabelText(/class name/i), 'Test Class');
      
      const submitButton = screen.getByRole('button', { name: /create class/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/failed to create class/i);
      });
    });

    it('should handle loading states appropriately', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnValue(promise),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      render(<TeacherClassManagement />, { wrapper: createWrapper() });

      // Should show loading state
      expect(screen.getByText(/loading classes/i)).toBeInTheDocument();

      // Resolve the promise
      resolvePromise!({ data: mockClasses, error: null });

      await waitFor(() => {
        expect(screen.queryByText(/loading classes/i)).not.toBeInTheDocument();
        expect(screen.getByText('Business English Advanced')).toBeInTheDocument();
      });
    });
  });
});