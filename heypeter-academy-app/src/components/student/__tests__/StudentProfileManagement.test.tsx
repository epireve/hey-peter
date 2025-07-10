import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { StudentProfileManagement } from '../StudentProfileManagement';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

// Mock dependencies
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock file reader for image uploads
global.FileReader = jest.fn().mockImplementation(() => ({
  readAsDataURL: jest.fn(function(this: any) {
    this.onloadend?.({ target: { result: 'data:image/jpeg;base64,mockImageData' } });
  }),
})) as any;

describe('StudentProfileManagement', () => {
  const mockSupabase = {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
    storage: {
      from: jest.fn(),
    },
  };

  const mockRouter = {
    push: jest.fn(),
    refresh: jest.fn(),
  };

  const mockUser = {
    id: 'user-123',
    email: 'john.doe@example.com',
  };

  const mockProfile = {
    id: 'profile-123',
    user_id: 'user-123',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    date_of_birth: '1990-01-01',
    gender: 'male',
    nationality: 'US',
    profile_photo_url: 'https://example.com/photo.jpg',
    emergency_contacts: [
      {
        name: 'Jane Doe',
        relationship: 'spouse',
        phone: '+0987654321',
        email: 'jane.doe@example.com',
      },
    ],
    course_preferences: {
      preferred_class_time: 'morning',
      preferred_teacher_gender: 'no_preference',
      learning_goals: ['conversational', 'business'],
    },
    language_preferences: {
      native_language: 'English',
      target_language: 'Spanish',
      proficiency_level: 'intermediate',
    },
    notification_settings: {
      email_notifications: true,
      sms_notifications: false,
      class_reminders: true,
      promotional_emails: false,
    },
  };

  beforeEach(() => {
    (createClientComponentClient as jest.Mock).mockReturnValue(mockSupabase);
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock responses
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
        }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
      }),
    });
    
    mockSupabase.storage.from.mockReturnValue({
      upload: jest.fn().mockResolvedValue({ data: { path: 'uploads/photo.jpg' }, error: null }),
      getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/new-photo.jpg' } }),
      remove: jest.fn().mockResolvedValue({ error: null }),
    });
  });

  describe('Profile Display', () => {
    it('should display loading state initially', () => {
      render(<StudentProfileManagement />);
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should display student profile information', async () => {
      render(<StudentProfileManagement />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
        expect(screen.getByText('+1234567890')).toBeInTheDocument();
      });
    });

    it('should display profile photo', async () => {
      render(<StudentProfileManagement />);

      await waitFor(() => {
        const profileImage = screen.getByAltText('Profile photo');
        expect(profileImage).toBeInTheDocument();
        expect(profileImage).toHaveAttribute('src', 'https://example.com/photo.jpg');
      });
    });

    it('should display emergency contacts', async () => {
      render(<StudentProfileManagement />);

      await waitFor(() => {
        expect(screen.getByText('Jane Doe')).toBeInTheDocument();
        expect(screen.getByText('spouse')).toBeInTheDocument();
        expect(screen.getByText('+0987654321')).toBeInTheDocument();
      });
    });

    it('should display course preferences', async () => {
      render(<StudentProfileManagement />);

      await waitFor(() => {
        expect(screen.getByText(/morning/i)).toBeInTheDocument();
        expect(screen.getByText(/no preference/i)).toBeInTheDocument();
      });
    });

    it('should display language preferences', async () => {
      render(<StudentProfileManagement />);

      await waitFor(() => {
        expect(screen.getByText('English')).toBeInTheDocument();
        expect(screen.getByText('Spanish')).toBeInTheDocument();
        expect(screen.getByText(/intermediate/i)).toBeInTheDocument();
      });
    });

    it('should display notification settings', async () => {
      render(<StudentProfileManagement />);

      await waitFor(() => {
        const emailToggle = screen.getByRole('switch', { name: /email notifications/i });
        const smsToggle = screen.getByRole('switch', { name: /sms notifications/i });
        
        expect(emailToggle).toBeChecked();
        expect(smsToggle).not.toBeChecked();
      });
    });

    it('should handle profile loading error', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: new Error('Failed to load profile') }),
          }),
        }),
      });

      render(<StudentProfileManagement />);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to load profile');
      });
    });
  });

  describe('Profile Editing', () => {
    it('should enable edit mode when edit button is clicked', async () => {
      render(<StudentProfileManagement />);

      await waitFor(() => {
        const editButton = screen.getByRole('button', { name: /edit profile/i });
        fireEvent.click(editButton);
      });

      expect(screen.getByLabelText(/first name/i)).not.toBeDisabled();
      expect(screen.getByLabelText(/last name/i)).not.toBeDisabled();
      expect(screen.getByLabelText(/phone/i)).not.toBeDisabled();
    });

    it('should update personal information', async () => {
      const user = userEvent.setup();
      render(<StudentProfileManagement />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));
      });

      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const phoneInput = screen.getByLabelText(/phone/i);

      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Jane');
      
      await user.clear(lastNameInput);
      await user.type(lastNameInput, 'Smith');
      
      await user.clear(phoneInput);
      await user.type(phoneInput, '+1112223333');

      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(mockSupabase.from().update).toHaveBeenCalledWith(
          expect.objectContaining({
            first_name: 'Jane',
            last_name: 'Smith',
            phone: '+1112223333',
          })
        );
        expect(toast.success).toHaveBeenCalledWith('Profile updated successfully');
      });
    });

    it('should cancel editing and revert changes', async () => {
      const user = userEvent.setup();
      render(<StudentProfileManagement />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));
      });

      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Jane');

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.queryByDisplayValue('Jane')).not.toBeInTheDocument();
      });
    });
  });

  describe('Profile Photo Upload', () => {
    it('should show upload button when hovering over profile photo', async () => {
      render(<StudentProfileManagement />);

      await waitFor(() => {
        const photoContainer = screen.getByTestId('profile-photo-container');
        fireEvent.mouseEnter(photoContainer);
      });

      expect(screen.getByRole('button', { name: /change photo/i })).toBeInTheDocument();
    });

    it('should upload new profile photo', async () => {
      render(<StudentProfileManagement />);

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      await waitFor(() => {
        const fileInput = screen.getByLabelText(/upload photo/i);
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(mockSupabase.storage.from).toHaveBeenCalledWith('profile-photos');
        expect(mockSupabase.storage.from().upload).toHaveBeenCalledWith(
          expect.stringContaining('user-123'),
          file,
          expect.any(Object)
        );
        expect(toast.success).toHaveBeenCalledWith('Profile photo updated successfully');
      });
    });

    it('should validate file type for photo upload', async () => {
      render(<StudentProfileManagement />);

      const file = new File(['test'], 'test.txt', { type: 'text/plain' });

      await waitFor(() => {
        const fileInput = screen.getByLabelText(/upload photo/i);
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Please select a valid image file (JPEG, PNG, GIF)');
      });
    });

    it('should validate file size for photo upload', async () => {
      render(<StudentProfileManagement />);

      const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });

      await waitFor(() => {
        const fileInput = screen.getByLabelText(/upload photo/i);
        fireEvent.change(fileInput, { target: { files: [largeFile] } });
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('File size must be less than 5MB');
      });
    });

    it('should handle photo upload error', async () => {
      mockSupabase.storage.from.mockReturnValue({
        upload: jest.fn().mockResolvedValue({ data: null, error: new Error('Upload failed') }),
      });

      render(<StudentProfileManagement />);

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      await waitFor(() => {
        const fileInput = screen.getByLabelText(/upload photo/i);
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to upload photo');
      });
    });
  });

  describe('Emergency Contacts', () => {
    it('should add new emergency contact', async () => {
      const user = userEvent.setup();
      render(<StudentProfileManagement />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /add emergency contact/i }));
      });

      const modal = screen.getByRole('dialog');
      const nameInput = within(modal).getByLabelText(/contact name/i);
      const relationshipSelect = within(modal).getByLabelText(/relationship/i);
      const phoneInput = within(modal).getByLabelText(/contact phone/i);
      const emailInput = within(modal).getByLabelText(/contact email/i);

      await user.type(nameInput, 'John Smith');
      await user.selectOptions(relationshipSelect, 'sibling');
      await user.type(phoneInput, '+5551234567');
      await user.type(emailInput, 'john.smith@example.com');

      fireEvent.click(within(modal).getByRole('button', { name: /save contact/i }));

      await waitFor(() => {
        expect(mockSupabase.from().update).toHaveBeenCalledWith(
          expect.objectContaining({
            emergency_contacts: expect.arrayContaining([
              expect.objectContaining({
                name: 'John Smith',
                relationship: 'sibling',
                phone: '+5551234567',
                email: 'john.smith@example.com',
              }),
            ]),
          })
        );
      });
    });

    it('should edit existing emergency contact', async () => {
      const user = userEvent.setup();
      render(<StudentProfileManagement />);

      await waitFor(() => {
        const editButton = screen.getByRole('button', { name: /edit contact/i });
        fireEvent.click(editButton);
      });

      const modal = screen.getByRole('dialog');
      const nameInput = within(modal).getByLabelText(/contact name/i);

      await user.clear(nameInput);
      await user.type(nameInput, 'Janet Doe');

      fireEvent.click(within(modal).getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(mockSupabase.from().update).toHaveBeenCalledWith(
          expect.objectContaining({
            emergency_contacts: expect.arrayContaining([
              expect.objectContaining({
                name: 'Janet Doe',
              }),
            ]),
          })
        );
      });
    });

    it('should delete emergency contact', async () => {
      render(<StudentProfileManagement />);

      await waitFor(() => {
        const deleteButton = screen.getByRole('button', { name: /delete contact/i });
        fireEvent.click(deleteButton);
      });

      const confirmDialog = screen.getByRole('dialog');
      fireEvent.click(within(confirmDialog).getByRole('button', { name: /confirm/i }));

      await waitFor(() => {
        expect(mockSupabase.from().update).toHaveBeenCalledWith(
          expect.objectContaining({
            emergency_contacts: [],
          })
        );
      });
    });

    it('should validate emergency contact form', async () => {
      const user = userEvent.setup();
      render(<StudentProfileManagement />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /add emergency contact/i }));
      });

      const modal = screen.getByRole('dialog');
      fireEvent.click(within(modal).getByRole('button', { name: /save contact/i }));

      await waitFor(() => {
        expect(screen.getByText(/contact name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/relationship is required/i)).toBeInTheDocument();
        expect(screen.getByText(/phone number is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Course Preferences', () => {
    it('should update preferred class time', async () => {
      const user = userEvent.setup();
      render(<StudentProfileManagement />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));
      });

      const classTimeSelect = screen.getByLabelText(/preferred class time/i);
      await user.selectOptions(classTimeSelect, 'evening');

      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(mockSupabase.from().update).toHaveBeenCalledWith(
          expect.objectContaining({
            course_preferences: expect.objectContaining({
              preferred_class_time: 'evening',
            }),
          })
        );
      });
    });

    it('should update learning goals', async () => {
      render(<StudentProfileManagement />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));
      });

      const academicCheckbox = screen.getByRole('checkbox', { name: /academic/i });
      fireEvent.click(academicCheckbox);

      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(mockSupabase.from().update).toHaveBeenCalledWith(
          expect.objectContaining({
            course_preferences: expect.objectContaining({
              learning_goals: expect.arrayContaining(['conversational', 'business', 'academic']),
            }),
          })
        );
      });
    });

    it('should update teacher gender preference', async () => {
      const user = userEvent.setup();
      render(<StudentProfileManagement />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));
      });

      const teacherGenderSelect = screen.getByLabelText(/preferred teacher gender/i);
      await user.selectOptions(teacherGenderSelect, 'female');

      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(mockSupabase.from().update).toHaveBeenCalledWith(
          expect.objectContaining({
            course_preferences: expect.objectContaining({
              preferred_teacher_gender: 'female',
            }),
          })
        );
      });
    });
  });

  describe('Language Preferences', () => {
    it('should update language preferences', async () => {
      const user = userEvent.setup();
      render(<StudentProfileManagement />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));
      });

      const nativeLanguageInput = screen.getByLabelText(/native language/i);
      const targetLanguageInput = screen.getByLabelText(/target language/i);
      const proficiencySelect = screen.getByLabelText(/proficiency level/i);

      await user.clear(nativeLanguageInput);
      await user.type(nativeLanguageInput, 'Portuguese');
      
      await user.clear(targetLanguageInput);
      await user.type(targetLanguageInput, 'English');
      
      await user.selectOptions(proficiencySelect, 'advanced');

      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(mockSupabase.from().update).toHaveBeenCalledWith(
          expect.objectContaining({
            language_preferences: expect.objectContaining({
              native_language: 'Portuguese',
              target_language: 'English',
              proficiency_level: 'advanced',
            }),
          })
        );
      });
    });
  });

  describe('Notification Settings', () => {
    it('should toggle email notifications', async () => {
      render(<StudentProfileManagement />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));
      });

      const emailToggle = screen.getByRole('switch', { name: /email notifications/i });
      fireEvent.click(emailToggle);

      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(mockSupabase.from().update).toHaveBeenCalledWith(
          expect.objectContaining({
            notification_settings: expect.objectContaining({
              email_notifications: false,
            }),
          })
        );
      });
    });

    it('should toggle SMS notifications', async () => {
      render(<StudentProfileManagement />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));
      });

      const smsToggle = screen.getByRole('switch', { name: /sms notifications/i });
      fireEvent.click(smsToggle);

      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(mockSupabase.from().update).toHaveBeenCalledWith(
          expect.objectContaining({
            notification_settings: expect.objectContaining({
              sms_notifications: true,
            }),
          })
        );
      });
    });

    it('should toggle class reminders', async () => {
      render(<StudentProfileManagement />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));
      });

      const reminderToggle = screen.getByRole('switch', { name: /class reminders/i });
      fireEvent.click(reminderToggle);

      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(mockSupabase.from().update).toHaveBeenCalledWith(
          expect.objectContaining({
            notification_settings: expect.objectContaining({
              class_reminders: false,
            }),
          })
        );
      });
    });

    it('should toggle promotional emails', async () => {
      render(<StudentProfileManagement />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));
      });

      const promoToggle = screen.getByRole('switch', { name: /promotional emails/i });
      fireEvent.click(promoToggle);

      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(mockSupabase.from().update).toHaveBeenCalledWith(
          expect.objectContaining({
            notification_settings: expect.objectContaining({
              promotional_emails: true,
            }),
          })
        );
      });
    });
  });

  describe('Form Validation', () => {
    it('should validate required fields', async () => {
      const user = userEvent.setup();
      render(<StudentProfileManagement />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));
      });

      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);

      await user.clear(firstNameInput);
      await user.clear(lastNameInput);

      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
      });
    });

    it('should validate email format', async () => {
      const user = userEvent.setup();
      render(<StudentProfileManagement />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));
      });

      const emailInput = screen.getByLabelText(/email address/i);
      await user.clear(emailInput);
      await user.type(emailInput, 'invalid-email');

      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
      });
    });

    it('should validate phone number format', async () => {
      const user = userEvent.setup();
      render(<StudentProfileManagement />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));
      });

      const phoneInput = screen.getByLabelText(/phone/i);
      await user.clear(phoneInput);
      await user.type(phoneInput, '123');

      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(screen.getByText(/invalid phone number/i)).toBeInTheDocument();
      });
    });

    it('should validate date of birth', async () => {
      const user = userEvent.setup();
      render(<StudentProfileManagement />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));
      });

      const dobInput = screen.getByLabelText(/date of birth/i);
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      
      await user.clear(dobInput);
      await user.type(dobInput, futureDate.toISOString().split('T')[0]);

      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(screen.getByText(/date of birth cannot be in the future/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      render(<StudentProfileManagement />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /student profile/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
        expect(screen.getByLabelText(/upload photo/i)).toBeInTheDocument();
      });
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      render(<StudentProfileManagement />);

      await waitFor(() => {
        screen.getByRole('button', { name: /edit profile/i }).focus();
      });

      await user.keyboard('{Enter}');

      expect(screen.getByLabelText(/first name/i)).not.toBeDisabled();
    });

    it('should announce form errors to screen readers', async () => {
      const user = userEvent.setup();
      render(<StudentProfileManagement />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));
      });

      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.clear(firstNameInput);

      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        const errorMessage = screen.getByText(/first name is required/i);
        expect(errorMessage).toHaveAttribute('role', 'alert');
      });
    });

    it('should have proper focus management', async () => {
      render(<StudentProfileManagement />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /add emergency contact/i }));
      });

      const modal = screen.getByRole('dialog');
      const firstInput = within(modal).getByLabelText(/contact name/i);
      
      expect(document.activeElement).toBe(firstInput);
    });
  });

  describe('Error Handling', () => {
    it('should handle profile update errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: null, error: new Error('Update failed') }),
        }),
      });

      render(<StudentProfileManagement />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));
      });

      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to update profile');
      });
    });

    it('should handle network errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockRejectedValue(new Error('Network error')),
          }),
        }),
      });

      render(<StudentProfileManagement />);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to load profile. Please check your connection.');
      });
    });

    it('should handle authentication errors', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('Not authenticated') });

      render(<StudentProfileManagement />);

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/login');
      });
    });
  });

  describe('Success States', () => {
    it('should show success message after profile update', async () => {
      render(<StudentProfileManagement />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));
      });

      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Profile updated successfully');
        expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
      });
    });

    it('should show success message after photo upload', async () => {
      render(<StudentProfileManagement />);

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      await waitFor(() => {
        const fileInput = screen.getByLabelText(/upload photo/i);
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Profile photo updated successfully');
      });
    });

    it('should refresh profile data after successful update', async () => {
      render(<StudentProfileManagement />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));
      });

      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(mockSupabase.from().select).toHaveBeenCalledTimes(2); // Initial load + refresh
      });
    });
  });
});