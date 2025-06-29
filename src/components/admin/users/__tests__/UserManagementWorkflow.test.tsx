import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserManagementWorkflow } from '../UserManagementWorkflow';
import { createClient } from '@/lib/supabase';
import { format } from 'date-fns';

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

const mockUsers = [
  {
    id: '1',
    email: 'active@example.com',
    created_at: '2024-01-01T00:00:00Z',
    last_sign_in_at: '2024-01-15T00:00:00Z',
    email_confirmed_at: '2024-01-01T00:00:00Z',
    user_metadata: {
      full_name: 'Active User',
      role: 'student',
    },
    app_metadata: {},
    banned: false,
  },
  {
    id: '2',
    email: 'pending@example.com',
    created_at: '2024-01-02T00:00:00Z',
    last_sign_in_at: null,
    email_confirmed_at: null,
    user_metadata: {
      full_name: 'Pending User',
      role: 'teacher',
    },
    app_metadata: {},
    banned: false,
  },
  {
    id: '3',
    email: 'banned@example.com',
    created_at: '2024-01-03T00:00:00Z',
    last_sign_in_at: '2024-01-10T00:00:00Z',
    email_confirmed_at: '2024-01-03T00:00:00Z',
    user_metadata: {
      full_name: 'Banned User',
      role: 'student',
    },
    app_metadata: {},
    banned: true,
  },
];

describe('UserManagementWorkflow', () => {
  const mockSupabase = {
    auth: {
      admin: {
        updateUserById: jest.fn(),
        inviteUserByEmail: jest.fn(),
      },
      resetPasswordForEmail: jest.fn(),
    },
    from: jest.fn(() => ({
      insert: jest.fn().mockResolvedValue({ error: null }),
    })),
  };

  const defaultProps = {
    users: mockUsers,
    onRefresh: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  it('renders users with correct status badges', () => {
    render(<UserManagementWorkflow {...defaultProps} />);

    // Check Active user
    expect(screen.getByText('Active User')).toBeInTheDocument();
    expect(screen.getByText('active@example.com')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();

    // Check Pending user
    expect(screen.getByText('Pending User')).toBeInTheDocument();
    expect(screen.getByText('pending@example.com')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();

    // Check Banned user
    expect(screen.getByText('Banned User')).toBeInTheDocument();
    expect(screen.getByText('banned@example.com')).toBeInTheDocument();
    expect(screen.getByText('Banned')).toBeInTheDocument();
  });

  it('shows role badges for each user', () => {
    render(<UserManagementWorkflow {...defaultProps} />);

    const studentBadges = screen.getAllByText('student');
    expect(studentBadges).toHaveLength(2);
    expect(screen.getByText('teacher')).toBeInTheDocument();
  });

  it('shows created date and last sign in date', () => {
    render(<UserManagementWorkflow {...defaultProps} />);

    expect(screen.getByText(`Created: ${format(new Date('2024-01-01'), 'MMM d, yyyy')}`)).toBeInTheDocument();
    expect(screen.getByText(`Last sign in: ${format(new Date('2024-01-15'), 'MMM d, yyyy')}`)).toBeInTheDocument();
  });

  it('shows resend invite button for pending users', () => {
    render(<UserManagementWorkflow {...defaultProps} />);

    const pendingUserSection = screen.getByText('pending@example.com').closest('div')?.parentElement;
    const resendButton = pendingUserSection?.querySelector('button:has(svg) + span:contains("Resend Invite")');
    
    expect(screen.getByText('Resend Invite')).toBeInTheDocument();
  });

  it('shows activate button for banned users', () => {
    render(<UserManagementWorkflow {...defaultProps} />);

    const bannedUserSection = screen.getByText('banned@example.com').closest('div')?.parentElement;
    expect(screen.getAllByText('Activate')).toHaveLength(1);
  });

  it('shows deactivate button for active users', () => {
    render(<UserManagementWorkflow {...defaultProps} />);

    const activeUserSection = screen.getByText('active@example.com').closest('div')?.parentElement;
    expect(screen.getAllByText('Deactivate')).toHaveLength(2); // Active and Pending users
  });

  describe('User actions', () => {
    it('opens dialog and activates a banned user', async () => {
      const user = userEvent.setup();
      render(<UserManagementWorkflow {...defaultProps} />);

      const activateButtons = screen.getAllByText('Activate');
      await user.click(activateButtons[0]);

      expect(screen.getByText('Activate User')).toBeInTheDocument();
      expect(screen.getByText('User: banned@example.com')).toBeInTheDocument();

      const confirmButton = screen.getByText('Confirm');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockSupabase.auth.admin.updateUserById).toHaveBeenCalledWith('3', {
          ban_duration: 'none',
        });
        expect(defaultProps.onRefresh).toHaveBeenCalled();
      });
    });

    it('opens dialog and deactivates an active user', async () => {
      const user = userEvent.setup();
      render(<UserManagementWorkflow {...defaultProps} />);

      const deactivateButtons = screen.getAllByText('Deactivate');
      await user.click(deactivateButtons[0]);

      expect(screen.getByText('Deactivate User')).toBeInTheDocument();
      expect(screen.getByText('This will prevent the user from accessing the system. They can be reactivated later.')).toBeInTheDocument();

      const notesTextarea = screen.getByPlaceholderText('Add any notes about this action...');
      await user.type(notesTextarea, 'User violated terms of service');

      const confirmButton = screen.getByText('Confirm');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockSupabase.auth.admin.updateUserById).toHaveBeenCalledWith('1', {
          ban_duration: '876600h',
        });
      });
    });

    it('changes user role', async () => {
      const user = userEvent.setup();
      render(<UserManagementWorkflow {...defaultProps} />);

      const changeRoleButtons = screen.getAllByText('Change Role');
      await user.click(changeRoleButtons[0]);

      expect(screen.getByText('Change User Role')).toBeInTheDocument();

      const roleSelect = screen.getByRole('combobox');
      await user.click(roleSelect);
      await user.click(screen.getByText('Admin'));

      const confirmButton = screen.getByText('Confirm');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockSupabase.auth.admin.updateUserById).toHaveBeenCalledWith('1', {
          user_metadata: {
            full_name: 'Active User',
            role: 'admin',
          },
        });
      });
    });

    it('sends password reset email', async () => {
      const user = userEvent.setup();
      render(<UserManagementWorkflow {...defaultProps} />);

      const resetButtons = screen.getAllByText('Reset Password');
      await user.click(resetButtons[0]);

      expect(screen.getByText('Reset Password')).toBeInTheDocument();
      expect(screen.getByText('A password reset email will be sent to the user\'s email address.')).toBeInTheDocument();

      const confirmButton = screen.getByText('Confirm');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
          'active@example.com',
          expect.objectContaining({
            redirectTo: expect.stringContaining('/auth/reset-password'),
          })
        );
      });
    });

    it('resends invitation to pending user', async () => {
      const user = userEvent.setup();
      render(<UserManagementWorkflow {...defaultProps} />);

      const resendButton = screen.getByText('Resend Invite');
      await user.click(resendButton);

      expect(screen.getByText('Resend Invitation')).toBeInTheDocument();

      const confirmButton = screen.getByText('Confirm');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockSupabase.auth.admin.inviteUserByEmail).toHaveBeenCalledWith(
          'pending@example.com',
          {
            data: {
              full_name: 'Pending User',
              role: 'teacher',
            },
          }
        );
      });
    });

    it('logs actions to audit logs', async () => {
      const user = userEvent.setup();
      render(<UserManagementWorkflow {...defaultProps} />);

      const activateButtons = screen.getAllByText('Activate');
      await user.click(activateButtons[0]);

      const notesTextarea = screen.getByPlaceholderText('Add any notes about this action...');
      await user.type(notesTextarea, 'Reactivating user account');

      const confirmButton = screen.getByText('Confirm');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('audit_logs');
        expect(mockSupabase.from().insert).toHaveBeenCalledWith({
          user_id: '3',
          action: 'activate',
          resource_type: 'user',
          resource_id: '3',
          details: {
            email: 'banned@example.com',
            notes: 'Reactivating user account',
          },
        });
      });
    });

    it('cancels action when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<UserManagementWorkflow {...defaultProps} />);

      const deactivateButtons = screen.getAllByText('Deactivate');
      await user.click(deactivateButtons[0]);

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      expect(mockSupabase.auth.admin.updateUserById).not.toHaveBeenCalled();
      expect(screen.queryByText('Deactivate User')).not.toBeInTheDocument();
    });

    it('handles errors gracefully', async () => {
      const user = userEvent.setup();
      mockSupabase.auth.admin.updateUserById.mockRejectedValueOnce(new Error('Network error'));

      render(<UserManagementWorkflow {...defaultProps} />);

      const activateButtons = screen.getAllByText('Activate');
      await user.click(activateButtons[0]);

      const confirmButton = screen.getByText('Confirm');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockSupabase.auth.admin.updateUserById).toHaveBeenCalled();
        expect(defaultProps.onRefresh).not.toHaveBeenCalled();
      });
    });
  });

  it('renders empty state when no users', () => {
    render(<UserManagementWorkflow users={[]} onRefresh={jest.fn()} />);
    
    expect(screen.getByText('User Management Workflow')).toBeInTheDocument();
    expect(screen.getByText('Manage user accounts, roles, and permissions')).toBeInTheDocument();
  });
});