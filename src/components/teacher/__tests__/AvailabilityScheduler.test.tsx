import React from 'react';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AvailabilityScheduler } from '../AvailabilitySchedulerEnhanced';
import { format, addDays, setHours, setMinutes } from 'date-fns';

describe('AvailabilityScheduler', () => {
  const mockAvailability = [
    {
      id: '1',
      day_of_week: 1, // Monday
      start_time: '09:00',
      end_time: '12:00',
      is_available: true,
      timezone: 'Asia/Singapore',
    },
    {
      id: '2',
      day_of_week: 1, // Monday
      start_time: '14:00',
      end_time: '17:00',
      is_available: true,
      timezone: 'Asia/Singapore',
    },
    {
      id: '3',
      day_of_week: 3, // Wednesday
      start_time: '10:00',
      end_time: '15:00',
      is_available: true,
      timezone: 'Asia/Singapore',
    },
    {
      id: '4',
      day_of_week: 5, // Friday
      start_time: '09:00',
      end_time: '11:00',
      is_available: true,
      timezone: 'Asia/Singapore',
    },
  ];

  const defaultProps = {
    teacherId: 'teacher-123',
    availability: mockAvailability,
    onSave: jest.fn().mockResolvedValue(undefined),
    isLoading: false,
  };

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Display and Layout', () => {
    it('should display the component title and description', () => {
      render(<AvailabilityScheduler {...defaultProps} />);
      
      expect(screen.getByText('Availability Schedule')).toBeInTheDocument();
      expect(screen.getByText(/set your weekly teaching availability/i)).toBeInTheDocument();
    });

    it('should display all days of the week', () => {
      render(<AvailabilityScheduler {...defaultProps} />);
      
      daysOfWeek.forEach(day => {
        expect(screen.getByText(day)).toBeInTheDocument();
      });
    });

    it('should display time zone selector', () => {
      render(<AvailabilityScheduler {...defaultProps} />);
      
      expect(screen.getByLabelText(/time zone/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('Asia/Singapore')).toBeInTheDocument();
    });

    it('should display existing availability slots', () => {
      render(<AvailabilityScheduler {...defaultProps} />);
      
      // Monday slots
      expect(screen.getByText('09:00 - 12:00')).toBeInTheDocument();
      expect(screen.getByText('14:00 - 17:00')).toBeInTheDocument();
      
      // Wednesday slot
      expect(screen.getByText('10:00 - 15:00')).toBeInTheDocument();
      
      // Friday slot
      expect(screen.getByText('09:00 - 11:00')).toBeInTheDocument();
    });
  });

  describe('Adding Availability', () => {
    it('should show add slot button for each day', () => {
      render(<AvailabilityScheduler {...defaultProps} />);
      
      const addButtons = screen.getAllByRole('button', { name: /add time slot/i });
      expect(addButtons).toHaveLength(7); // One for each day
    });

    it('should open time slot modal when add button is clicked', async () => {
      const user = userEvent.setup();
      render(<AvailabilityScheduler {...defaultProps} />);
      
      const tuesdaySection = screen.getByTestId('day-2');
      const addButton = within(tuesdaySection).getByRole('button', { name: /add time slot/i });
      
      await user.click(addButton);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/add availability for tuesday/i)).toBeInTheDocument();
    });

    it('should allow entering start and end times', async () => {
      const user = userEvent.setup();
      render(<AvailabilityScheduler {...defaultProps} />);
      
      // Open modal for Tuesday
      const tuesdaySection = screen.getByTestId('day-2');
      const addButton = within(tuesdaySection).getByRole('button', { name: /add time slot/i });
      await user.click(addButton);
      
      const startTimeInput = screen.getByLabelText(/start time/i);
      const endTimeInput = screen.getByLabelText(/end time/i);
      
      await user.clear(startTimeInput);
      await user.type(startTimeInput, '13:00');
      
      await user.clear(endTimeInput);
      await user.type(endTimeInput, '16:00');
      
      expect(startTimeInput).toHaveValue('13:00');
      expect(endTimeInput).toHaveValue('16:00');
    });

    it('should validate time slots (end time after start time)', async () => {
      const user = userEvent.setup();
      render(<AvailabilityScheduler {...defaultProps} />);
      
      // Open modal
      const addButton = screen.getAllByRole('button', { name: /add time slot/i })[0];
      await user.click(addButton);
      
      const startTimeInput = screen.getByLabelText(/start time/i);
      const endTimeInput = screen.getByLabelText(/end time/i);
      const saveButton = screen.getByRole('button', { name: /save/i });
      
      // Enter invalid times (end before start)
      await user.clear(startTimeInput);
      await user.type(startTimeInput, '16:00');
      await user.clear(endTimeInput);
      await user.type(endTimeInput, '14:00');
      
      await user.click(saveButton);
      
      expect(screen.getByText(/end time must be after start time/i)).toBeInTheDocument();
    });

    it('should check for overlapping time slots', async () => {
      const user = userEvent.setup();
      render(<AvailabilityScheduler {...defaultProps} />);
      
      // Try to add overlapping slot on Monday
      const mondaySection = screen.getByTestId('day-1');
      const addButton = within(mondaySection).getByRole('button', { name: /add time slot/i });
      await user.click(addButton);
      
      const startTimeInput = screen.getByLabelText(/start time/i);
      const endTimeInput = screen.getByLabelText(/end time/i);
      const saveButton = screen.getByRole('button', { name: /save/i });
      
      // Enter overlapping times with existing 09:00-12:00 slot
      await user.clear(startTimeInput);
      await user.type(startTimeInput, '10:00');
      await user.clear(endTimeInput);
      await user.type(endTimeInput, '13:00');
      
      await user.click(saveButton);
      
      expect(screen.getByText(/overlaps with existing time slot/i)).toBeInTheDocument();
    });

    it('should add new time slot when valid', async () => {
      const user = userEvent.setup();
      render(<AvailabilityScheduler {...defaultProps} />);
      
      // Add slot for Tuesday
      const tuesdaySection = screen.getByTestId('day-2');
      const addButton = within(tuesdaySection).getByRole('button', { name: /add time slot/i });
      await user.click(addButton);
      
      const startTimeInput = screen.getByLabelText(/start time/i);
      const endTimeInput = screen.getByLabelText(/end time/i);
      const saveButton = screen.getByRole('button', { name: /save/i });
      
      await user.clear(startTimeInput);
      await user.type(startTimeInput, '13:00');
      await user.clear(endTimeInput);
      await user.type(endTimeInput, '16:00');
      
      await user.click(saveButton);
      
      // Modal should close
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      
      // New slot should appear
      expect(within(tuesdaySection).getByText('13:00 - 16:00')).toBeInTheDocument();
    });
  });

  describe('Editing Availability', () => {
    it('should allow editing existing time slots', async () => {
      const user = userEvent.setup();
      render(<AvailabilityScheduler {...defaultProps} />);
      
      // Click on existing Monday slot
      const mondaySlot = screen.getByText('09:00 - 12:00');
      await user.click(mondaySlot);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/edit availability for monday/i)).toBeInTheDocument();
      
      const startTimeInput = screen.getByLabelText(/start time/i);
      expect(startTimeInput).toHaveValue('09:00');
    });

    it('should update time slot when edited', async () => {
      const user = userEvent.setup();
      render(<AvailabilityScheduler {...defaultProps} />);
      
      // Click on existing slot
      const mondaySlot = screen.getByText('09:00 - 12:00');
      await user.click(mondaySlot);
      
      const endTimeInput = screen.getByLabelText(/end time/i);
      const saveButton = screen.getByRole('button', { name: /save/i });
      
      await user.clear(endTimeInput);
      await user.type(endTimeInput, '13:00');
      await user.click(saveButton);
      
      // Check updated time
      expect(screen.getByText('09:00 - 13:00')).toBeInTheDocument();
      expect(screen.queryByText('09:00 - 12:00')).not.toBeInTheDocument();
    });
  });

  describe('Deleting Availability', () => {
    it('should show delete button for each time slot', () => {
      render(<AvailabilityScheduler {...defaultProps} />);
      
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      expect(deleteButtons).toHaveLength(4); // One for each existing slot
    });

    it('should show confirmation dialog when delete is clicked', async () => {
      const user = userEvent.setup();
      render(<AvailabilityScheduler {...defaultProps} />);
      
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);
      
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      expect(screen.getByText(/are you sure you want to delete this time slot/i)).toBeInTheDocument();
    });

    it('should delete time slot when confirmed', async () => {
      const user = userEvent.setup();
      render(<AvailabilityScheduler {...defaultProps} />);
      
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);
      
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);
      
      // First Monday slot should be removed
      expect(screen.queryByText('09:00 - 12:00')).not.toBeInTheDocument();
      // Second Monday slot should still exist
      expect(screen.getByText('14:00 - 17:00')).toBeInTheDocument();
    });
  });

  describe('Bulk Actions', () => {
    it('should allow copying schedule to other days', async () => {
      const user = userEvent.setup();
      render(<AvailabilityScheduler {...defaultProps} />);
      
      const mondaySection = screen.getByTestId('day-1');
      const copyButton = within(mondaySection).getByRole('button', { name: /copy to other days/i });
      
      await user.click(copyButton);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/copy monday schedule to/i)).toBeInTheDocument();
      
      // Should show checkboxes for other days
      expect(screen.getByLabelText('Tuesday')).toBeInTheDocument();
      expect(screen.getByLabelText('Wednesday')).toBeInTheDocument();
    });

    it('should copy time slots to selected days', async () => {
      const user = userEvent.setup();
      render(<AvailabilityScheduler {...defaultProps} />);
      
      const mondaySection = screen.getByTestId('day-1');
      const copyButton = within(mondaySection).getByRole('button', { name: /copy to other days/i });
      
      await user.click(copyButton);
      
      // Select Tuesday and Thursday
      await user.click(screen.getByLabelText('Tuesday'));
      await user.click(screen.getByLabelText('Thursday'));
      
      const confirmButton = screen.getByRole('button', { name: /copy schedule/i });
      await user.click(confirmButton);
      
      // Check that Monday's schedule is copied to Tuesday
      const tuesdaySection = screen.getByTestId('day-2');
      expect(within(tuesdaySection).getByText('09:00 - 12:00')).toBeInTheDocument();
      expect(within(tuesdaySection).getByText('14:00 - 17:00')).toBeInTheDocument();
    });

    it('should have clear all availability button', async () => {
      const user = userEvent.setup();
      render(<AvailabilityScheduler {...defaultProps} />);
      
      const clearAllButton = screen.getByRole('button', { name: /clear all/i });
      expect(clearAllButton).toBeInTheDocument();
      
      await user.click(clearAllButton);
      
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      expect(screen.getByText(/are you sure you want to clear all availability/i)).toBeInTheDocument();
    });
  });

  describe('Saving Changes', () => {
    it('should show save changes button', () => {
      render(<AvailabilityScheduler {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });

    it('should call onSave with updated availability', async () => {
      const user = userEvent.setup();
      const mockOnSave = jest.fn().mockResolvedValue(undefined);
      render(<AvailabilityScheduler {...defaultProps} onSave={mockOnSave} />);
      
      // Add a new slot
      const tuesdaySection = screen.getByTestId('day-2');
      const addButton = within(tuesdaySection).getByRole('button', { name: /add time slot/i });
      await user.click(addButton);
      
      const startTimeInput = screen.getByLabelText(/start time/i);
      const endTimeInput = screen.getByLabelText(/end time/i);
      const saveSlotButton = screen.getByRole('button', { name: /save/i });
      
      await user.clear(startTimeInput);
      await user.type(startTimeInput, '13:00');
      await user.clear(endTimeInput);
      await user.type(endTimeInput, '16:00');
      await user.click(saveSlotButton);
      
      // Save all changes
      const saveChangesButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveChangesButton);
      
      expect(mockOnSave).toHaveBeenCalledWith(expect.arrayContaining([
        ...mockAvailability,
        expect.objectContaining({
          day_of_week: 2,
          start_time: '13:00',
          end_time: '16:00',
          is_available: true,
          timezone: 'Asia/Singapore',
        }),
      ]));
    });

    it('should show loading state while saving', async () => {
      const user = userEvent.setup();
      const mockOnSave = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(<AvailabilityScheduler {...defaultProps} onSave={mockOnSave} />);
      
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);
      
      expect(screen.getByRole('button', { name: /saving/i })).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /saving/i })).not.toBeInTheDocument();
      });
    });

    it('should show success message after saving', async () => {
      const user = userEvent.setup();
      render(<AvailabilityScheduler {...defaultProps} />);
      
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText(/availability saved successfully/i)).toBeInTheDocument();
      });
    });

    it('should show error message if save fails', async () => {
      const user = userEvent.setup();
      const mockOnSave = jest.fn().mockRejectedValue(new Error('Save failed'));
      render(<AvailabilityScheduler {...defaultProps} onSave={mockOnSave} />);
      
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText(/failed to save availability/i)).toBeInTheDocument();
      });
    });
  });

  describe('Time Zone Support', () => {
    it('should allow changing time zone', async () => {
      const user = userEvent.setup();
      render(<AvailabilityScheduler {...defaultProps} />);
      
      const timeZoneSelect = screen.getByLabelText(/time zone/i);
      await user.selectOptions(timeZoneSelect, 'America/New_York');
      
      expect(timeZoneSelect).toHaveValue('America/New_York');
    });

    it('should apply time zone to all slots', async () => {
      const user = userEvent.setup();
      const mockOnSave = jest.fn().mockResolvedValue(undefined);
      render(<AvailabilityScheduler {...defaultProps} onSave={mockOnSave} />);
      
      const timeZoneSelect = screen.getByLabelText(/time zone/i);
      await user.selectOptions(timeZoneSelect, 'Europe/London');
      
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);
      
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ timezone: 'Europe/London' }),
        ])
      );
    });
  });

  describe('Visual Indicators', () => {
    it('should highlight days with availability', () => {
      render(<AvailabilityScheduler {...defaultProps} />);
      
      const mondaySection = screen.getByTestId('day-1');
      const wednesdaySection = screen.getByTestId('day-3');
      const fridaySection = screen.getByTestId('day-5');
      
      expect(mondaySection).toHaveClass('has-availability');
      expect(wednesdaySection).toHaveClass('has-availability');
      expect(fridaySection).toHaveClass('has-availability');
    });

    it('should show total hours per day', () => {
      render(<AvailabilityScheduler {...defaultProps} />);
      
      const mondaySection = screen.getByTestId('day-1');
      expect(within(mondaySection).getByText('6 hours')).toBeInTheDocument(); // 3 + 3 hours
      
      const wednesdaySection = screen.getByTestId('day-3');
      expect(within(wednesdaySection).getByText('5 hours')).toBeInTheDocument();
      
      const fridaySection = screen.getByTestId('day-5');
      expect(within(fridaySection).getByText('2 hours')).toBeInTheDocument();
    });

    it('should show weekly total hours', () => {
      render(<AvailabilityScheduler {...defaultProps} />);
      
      expect(screen.getByText(/total weekly hours: 13/i)).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loading skeleton when data is loading', () => {
      render(<AvailabilityScheduler {...defaultProps} isLoading={true} />);
      
      expect(screen.getByTestId('availability-skeleton')).toBeInTheDocument();
      expect(screen.queryByText('09:00 - 12:00')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<AvailabilityScheduler {...defaultProps} />);
      
      expect(screen.getByRole('region', { name: /availability schedule/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/time zone/i)).toBeInTheDocument();
    });

    it('should announce changes to screen readers', async () => {
      const user = userEvent.setup();
      render(<AvailabilityScheduler {...defaultProps} />);
      
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);
      
      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toHaveTextContent(/availability saved successfully/i);
      });
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      render(<AvailabilityScheduler {...defaultProps} />);
      
      // Tab through interactive elements
      await user.tab();
      expect(screen.getByLabelText(/time zone/i)).toHaveFocus();
      
      await user.tab();
      expect(screen.getByRole('button', { name: /clear all/i })).toHaveFocus();
      
      // Tab to the first interactive element in Monday's card (which has availability)
      await user.tab();
      // Since Monday has existing slots, it will have a "Copy to other days" button
      const copyButton = screen.getAllByRole('button', { name: /copy to other days/i })[0];
      expect(copyButton).toHaveFocus();
    });
  });
});