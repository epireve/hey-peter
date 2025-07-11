import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserForm } from '../UserForm';
import { updateUser } from '@/lib/actions/user';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

// Mock dependencies
jest.mock('@/lib/actions/user');
jest.mock('next/navigation');
jest.mock('sonner');

const mockUpdateUser = updateUser as jest.MockedFunction<typeof updateUser>;
const mockPush = jest.fn();
const mockRefresh = jest.fn();
const mockToast = toast as jest.Mocked<typeof toast>;

describe('UserForm', () => {
  const mockUser = {
    id: 'user-123',
    email: 'user@example.com',
    full_name: 'John Doe',
    role: 'teacher' as const,
  };

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      refresh: mockRefresh,
    });
    jest.clearAllMocks();
  });

  describe('Edit Mode', () => {
    it('renders the form with user data in edit mode', () => {
      render(<UserForm user={mockUser} mode="edit" />);
      
      expect(screen.getByDisplayValue('user@example.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Teacher')).toBeInTheDocument();
      expect(screen.getByText('Update User')).toBeInTheDocument();
    });

    it('submits the form with updated data', async () => {
      mockUpdateUser.mockResolvedValue({ data: { success: true } });
      const user = userEvent.setup();
      
      render(<UserForm user={mockUser} mode="edit" />);
      
      // Update full name
      const fullNameInput = screen.getByLabelText('Full Name');
      await user.clear(fullNameInput);
      await user.type(fullNameInput, 'Jane Smith');
      
      // Update role
      const roleSelect = screen.getByRole('combobox');
      await user.click(roleSelect);
      await user.click(screen.getByText('Admin'));
      
      // Submit form
      const submitButton = screen.getByText('Update User');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockUpdateUser).toHaveBeenCalledWith('user-123', {
          email: 'user@example.com',
          full_name: 'Jane Smith',
          role: 'admin',
        });
      });
      
      expect(mockToast.success).toHaveBeenCalledWith('User updated successfully');
      expect(mockPush).toHaveBeenCalledWith('/admin/users');
      expect(mockRefresh).toHaveBeenCalled();
    });

    it('handles update errors', async () => {
      mockUpdateUser.mockResolvedValue({ error: 'Update failed' });
      const user = userEvent.setup();
      
      render(<UserForm user={mockUser} mode="edit" />);
      
      const submitButton = screen.getByText('Update User');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Update failed');
      });
      
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('shows loading state during submission', async () => {
      mockUpdateUser.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      const user = userEvent.setup();
      
      render(<UserForm user={mockUser} mode="edit" />);
      
      const submitButton = screen.getByText('Update User');
      await user.click(submitButton);
      
      expect(screen.getByRole('button', { name: /Update User/ })).toBeDisabled();
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });
  });

  describe('Create Mode', () => {
    it('renders empty form in create mode', () => {
      render(<UserForm mode="create" />);
      
      expect(screen.getByLabelText('Email')).toHaveValue('');
      expect(screen.getByLabelText('Full Name')).toHaveValue('');
      expect(screen.getByText('Student')).toBeInTheDocument(); // Default role
      expect(screen.getByText('Create User')).toBeInTheDocument();
    });

    it('shows not implemented message for create mode', async () => {
      const user = userEvent.setup();
      
      render(<UserForm mode="create" />);
      
      // Fill form
      await user.type(screen.getByLabelText('Email'), 'new@example.com');
      await user.type(screen.getByLabelText('Full Name'), 'New User');
      
      // Submit
      const submitButton = screen.getByText('Create User');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Create user functionality not implemented in this component');
      });
    });
  });

  describe('Form Validation', () => {
    it('validates email format', async () => {
      const user = userEvent.setup();
      
      render(<UserForm user={mockUser} mode="edit" />);
      
      const emailInput = screen.getByLabelText('Email');
      await user.clear(emailInput);
      await user.type(emailInput, 'invalid-email');
      
      const submitButton = screen.getByText('Update User');
      await user.click(submitButton);
      
      expect(await screen.findByText('Invalid email address')).toBeInTheDocument();
      expect(mockUpdateUser).not.toHaveBeenCalled();
    });

    it('validates full name length', async () => {
      const user = userEvent.setup();
      
      render(<UserForm user={mockUser} mode="edit" />);
      
      const fullNameInput = screen.getByLabelText('Full Name');
      await user.clear(fullNameInput);
      await user.type(fullNameInput, 'A');
      
      const submitButton = screen.getByText('Update User');
      await user.click(submitButton);
      
      expect(await screen.findByText('Full name must be at least 2 characters')).toBeInTheDocument();
      expect(mockUpdateUser).not.toHaveBeenCalled();
    });
  });

  describe('Navigation', () => {
    it('navigates back on cancel', async () => {
      const user = userEvent.setup();
      
      render(<UserForm user={mockUser} mode="edit" />);
      
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);
      
      expect(mockPush).toHaveBeenCalledWith('/admin/users');
    });
  });

  describe('Role Selection', () => {
    it('allows changing user role', async () => {
      const user = userEvent.setup();
      
      render(<UserForm user={mockUser} mode="edit" />);
      
      const roleSelect = screen.getByRole('combobox');
      await user.click(roleSelect);
      
      // All roles should be available
      expect(screen.getByText('Student')).toBeInTheDocument();
      expect(screen.getByText('Teacher')).toBeInTheDocument();
      expect(screen.getByText('Admin')).toBeInTheDocument();
      
      await user.click(screen.getByText('Student'));
      
      // Submit and verify role change
      mockUpdateUser.mockResolvedValue({ data: { success: true } });
      await user.click(screen.getByText('Update User'));
      
      await waitFor(() => {
        expect(mockUpdateUser).toHaveBeenCalledWith('user-123', expect.objectContaining({
          role: 'student',
        }));
      });
    });
  });
});