import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeacherEditForm } from '../TeacherEditForm';
import { updateTeacher } from '@/lib/actions/teacher';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

// Mock dependencies
jest.mock('@/lib/actions/teacher');
jest.mock('next/navigation');
jest.mock('sonner');

const mockUpdateTeacher = updateTeacher as jest.MockedFunction<typeof updateTeacher>;
const mockPush = jest.fn();
const mockRefresh = jest.fn();
const mockToast = toast as jest.Mocked<typeof toast>;

describe('TeacherEditForm', () => {
  const mockTeacher = {
    id: 'teacher-123',
    email: 'teacher@example.com',
    full_name: 'John Doe',
    availability: {
      monday: [{ start: '09:00', end: '17:00' }],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: [],
    },
    hourly_rate: 50,
    compensation: {
      hourly_rate: 50,
      payment_method: 'bank_transfer' as const,
      bank_details: 'Account 123456',
      notes: 'Test notes',
    },
  };

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      refresh: mockRefresh,
    });
    jest.clearAllMocks();
  });

  it('renders the form with teacher data', () => {
    render(<TeacherEditForm teacher={mockTeacher} />);
    
    expect(screen.getByDisplayValue('teacher@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('50')).toBeInTheDocument();
    expect(screen.getByText('Bank Transfer')).toBeInTheDocument();
  });

  it('submits the form with updated data', async () => {
    mockUpdateTeacher.mockResolvedValue({ data: { success: true } });
    const user = userEvent.setup();
    
    render(<TeacherEditForm teacher={mockTeacher} />);
    
    // Update full name
    const fullNameInput = screen.getByLabelText('Full Name');
    await user.clear(fullNameInput);
    await user.type(fullNameInput, 'Jane Smith');
    
    // Update hourly rate
    const hourlyRateInput = screen.getByLabelText('Hourly Rate');
    await user.clear(hourlyRateInput);
    await user.type(hourlyRateInput, '60');
    
    // Submit form
    const submitButton = screen.getByText('Update Teacher');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockUpdateTeacher).toHaveBeenCalledWith('teacher-123', expect.objectContaining({
        email: 'teacher@example.com',
        full_name: 'Jane Smith',
        compensation: expect.objectContaining({
          hourly_rate: 60,
        }),
      }));
    });
    
    expect(mockToast.success).toHaveBeenCalledWith('Teacher updated successfully');
    expect(mockPush).toHaveBeenCalledWith('/admin/teachers');
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('handles update errors', async () => {
    mockUpdateTeacher.mockResolvedValue({ error: 'Update failed' });
    const user = userEvent.setup();
    
    render(<TeacherEditForm teacher={mockTeacher} />);
    
    const submitButton = screen.getByText('Update Teacher');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Update failed');
    });
    
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('shows loading state during submission', async () => {
    mockUpdateTeacher.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    const user = userEvent.setup();
    
    render(<TeacherEditForm teacher={mockTeacher} />);
    
    const submitButton = screen.getByText('Update Teacher');
    await user.click(submitButton);
    
    expect(screen.getByRole('button', { name: /Update Teacher/ })).toBeDisabled();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('navigates back on cancel', async () => {
    const user = userEvent.setup();
    
    render(<TeacherEditForm teacher={mockTeacher} />);
    
    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);
    
    expect(mockPush).toHaveBeenCalledWith('/admin/teachers');
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    
    render(<TeacherEditForm teacher={mockTeacher} />);
    
    // Clear required fields
    const emailInput = screen.getByLabelText('Email Address');
    await user.clear(emailInput);
    
    const fullNameInput = screen.getByLabelText('Full Name');
    await user.clear(fullNameInput);
    
    // Try to submit
    const submitButton = screen.getByText('Update Teacher');
    await user.click(submitButton);
    
    // Check for validation errors
    expect(await screen.findByText('Invalid email address')).toBeInTheDocument();
    expect(await screen.findByText('Full name is required')).toBeInTheDocument();
    
    expect(mockUpdateTeacher).not.toHaveBeenCalled();
  });

  it('handles teacher data with user relation', () => {
    const teacherWithUser = {
      ...mockTeacher,
      user: {
        id: 'user-123',
        email: 'user@example.com',
        full_name: 'User Name',
      },
    };
    
    render(<TeacherEditForm teacher={teacherWithUser} />);
    
    // Should use user data when available
    expect(screen.getByDisplayValue('user@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('User Name')).toBeInTheDocument();
  });
});