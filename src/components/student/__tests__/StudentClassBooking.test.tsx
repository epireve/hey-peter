import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudentClassBooking } from '../StudentClassBooking';
import { format, addDays } from 'date-fns';
import '@testing-library/jest-dom';

// Mock the dropdown menu to avoid focus trap issues
jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => 
    asChild ? children : <button data-testid="dropdown-trigger">{children}</button>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => 
    <button data-testid="dropdown-item" onClick={onClick}>{children}</button>,
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="dropdown-label">{children}</div>,
  DropdownMenuSeparator: () => <hr data-testid="dropdown-separator" />,
}));

// Mock the dialog to avoid focus trap issues
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) => 
    open ? <div data-testid="dialog" role="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

// Mock date-fns to have consistent test dates
jest.mock('date-fns', () => ({
  ...jest.requireActual('date-fns'),
  format: jest.fn((date, formatStr) => {
    const actualFormat = jest.requireActual('date-fns').format;
    if (formatStr === 'yyyy-MM-dd') {
      return '2024-03-15'; // Fixed date for testing
    }
    return actualFormat(date, formatStr);
  }),
}));

describe('StudentClassBooking', () => {
  const mockStudentId = 'test-student-123';
  const mockOnBookClass = jest.fn();
  const mockOnCancelBooking = jest.fn();
  const mockOnRescheduleBooking = jest.fn();
  const mockOnAddToWishlist = jest.fn();
  const mockOnRemoveFromWishlist = jest.fn();

  const defaultProps = {
    studentId: mockStudentId,
    isLoading: false,
    onBookClass: mockOnBookClass,
    onCancelBooking: mockOnCancelBooking,
    onRescheduleBooking: mockOnRescheduleBooking,
    onAddToWishlist: mockOnAddToWishlist,
    onRemoveFromWishlist: mockOnRemoveFromWishlist,
    wishlistedClasses: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset successful responses by default
    mockOnBookClass.mockResolvedValue(true);
    mockOnCancelBooking.mockResolvedValue(true);
    mockOnRescheduleBooking.mockResolvedValue(true);
  });

  describe('Component Rendering', () => {
    test('renders component with header and tabs', () => {
      render(<StudentClassBooking {...defaultProps} />);
      
      expect(screen.getByText('Class Booking')).toBeInTheDocument();
      expect(screen.getByText('Book classes and manage your learning schedule')).toBeInTheDocument();
      expect(screen.getByText('Available Classes')).toBeInTheDocument();
      expect(screen.getByText('My Bookings')).toBeInTheDocument();
      expect(screen.getByText('Class History')).toBeInTheDocument();
    });

    test('shows loading state when isLoading is true', () => {
      render(<StudentClassBooking {...defaultProps} isLoading={true} />);
      
      // When loading, the component should not show any class content
      expect(screen.queryByText('Business English Conversation')).not.toBeInTheDocument();
      expect(screen.queryByText('IELTS Speaking Preparation')).not.toBeInTheDocument();
      expect(screen.queryByText('Everyday English for Beginners')).not.toBeInTheDocument();
      
      // But should still show the search and filter UI
      expect(screen.getByPlaceholderText(/search classes/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /level: all/i })).toBeInTheDocument();
    });

    test('displays date selector with current date', () => {
      render(<StudentClassBooking {...defaultProps} />);
      
      const dateInput = screen.getByLabelText(/select date/i);
      expect(dateInput).toBeInTheDocument();
      expect(dateInput).toHaveValue('2024-03-15');
    });
  });

  describe('Available Classes Tab', () => {
    test('displays available classes with correct information', () => {
      render(<StudentClassBooking {...defaultProps} />);
      
      // Check if classes are displayed
      expect(screen.getByText('Business English Conversation')).toBeInTheDocument();
      expect(screen.getByText('IELTS Speaking Preparation')).toBeInTheDocument();
      expect(screen.getByText('Everyday English for Beginners')).toBeInTheDocument();
      
      // Check class details
      expect(screen.getAllByText(/\$45/)).toHaveLength(3); // Price appears multiple times
      expect(screen.getByText('60 min')).toBeInTheDocument();
      expect(screen.getByText('3/6 students')).toBeInTheDocument();
    });

    test('filters classes by search term', async () => {
      const user = userEvent.setup();
      render(<StudentClassBooking {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText(/search classes/i);
      await user.type(searchInput, 'IELTS');
      
      // Should only show IELTS class
      expect(screen.getByText('IELTS Speaking Preparation')).toBeInTheDocument();
      expect(screen.queryByText('Business English Conversation')).not.toBeInTheDocument();
      expect(screen.queryByText('Everyday English for Beginners')).not.toBeInTheDocument();
    });

    test('shows no classes found message when filters return no results', async () => {
      const user = userEvent.setup();
      render(<StudentClassBooking {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText(/search classes/i);
      await user.type(searchInput, 'NonexistentClass');
      
      expect(screen.getByText('No classes found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search or filters')).toBeInTheDocument();
    });

    test('handles wishlist addition', async () => {
      const user = userEvent.setup();
      render(<StudentClassBooking {...defaultProps} />);
      
      // Find the first heart icon (unfilled)
      const wishlistButtons = screen.getAllByRole('button', { name: '' }).filter(
        btn => btn.querySelector('[class*="heart"]')
      );
      
      await user.click(wishlistButtons[0]);
      
      expect(mockOnAddToWishlist).toHaveBeenCalledWith('1');
    });

    test('handles wishlist removal', async () => {
      const user = userEvent.setup();
      render(<StudentClassBooking {...defaultProps} wishlistedClasses={['1']} />);
      
      // Find the filled heart icon
      const wishlistButtons = screen.getAllByRole('button', { name: '' }).filter(
        btn => btn.querySelector('[class*="fill-current"]')
      );
      
      await user.click(wishlistButtons[0]);
      
      expect(mockOnRemoveFromWishlist).toHaveBeenCalledWith('1');
    });
  });

  describe('Class Booking Flow', () => {
    test('opens booking dialog when clicking available time slot', async () => {
      const user = userEvent.setup();
      render(<StudentClassBooking {...defaultProps} />);
      
      // Click on an available time slot
      const timeSlot = screen.getByRole('button', { name: /09:00.*10:00.*\$45/i });
      await user.click(timeSlot);
      
      // Check if dialog opens
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
      expect(screen.getByText('Book Class')).toBeInTheDocument();
      expect(screen.getByText(/confirm your booking for business english conversation/i)).toBeInTheDocument();
    });

    test('handles booking with notes', async () => {
      const user = userEvent.setup();
      render(<StudentClassBooking {...defaultProps} />);
      
      // Open booking dialog
      const timeSlot = screen.getByRole('button', { name: /09:00.*10:00.*\$45/i });
      await user.click(timeSlot);
      
      // Add notes
      const notesTextarea = screen.getByPlaceholderText(/any specific goals/i);
      await user.type(notesTextarea, 'I want to improve my presentation skills');
      
      // Confirm booking
      const confirmButton = screen.getByRole('button', { name: /confirm booking/i });
      await user.click(confirmButton);
      
      await waitFor(() => {
        expect(mockOnBookClass).toHaveBeenCalledWith({
          classId: '1',
          timeSlotId: 'slot1',
          scheduledDate: '2024-03-15T09:00:00',
          notes: 'I want to improve my presentation skills',
          recurringPattern: 'none',
          recurringEndDate: undefined,
        });
      });
    });

    test('disables unavailable time slots', () => {
      render(<StudentClassBooking {...defaultProps} />);
      
      // Find disabled slot (19:00 - 20:00)
      const disabledSlot = screen.getByRole('button', { name: /19:00.*20:00.*booked/i });
      expect(disabledSlot).toBeDisabled();
    });

    test('shows processing state during booking', async () => {
      const user = userEvent.setup();
      
      // Mock delayed response
      mockOnBookClass.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(true), 1000)));
      
      render(<StudentClassBooking {...defaultProps} />);
      
      // Open booking dialog
      const timeSlot = screen.getByRole('button', { name: /09:00.*10:00.*\$45/i });
      await user.click(timeSlot);
      
      // Confirm booking
      const confirmButton = screen.getByRole('button', { name: /confirm booking/i });
      await user.click(confirmButton);
      
      // Should show processing state
      expect(screen.getByText('Booking...')).toBeInTheDocument();
      expect(confirmButton).toBeDisabled();
    });
  });

  describe('My Bookings Tab', () => {
    test('switches to bookings tab and shows booked classes', async () => {
      const user = userEvent.setup();
      render(<StudentClassBooking {...defaultProps} />);
      
      // Switch to My Bookings tab
      const bookingsTab = screen.getByRole('button', { name: 'My Bookings' });
      await user.click(bookingsTab);
      
      // Should show booked class
      expect(screen.getByText('Business English Conversation')).toBeInTheDocument();
      expect(screen.getByText('confirmed')).toBeInTheDocument();
      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
      expect(screen.getByText('Looking forward to improving my presentation skills')).toBeInTheDocument();
    });

    test('shows recurring booking information', async () => {
      const user = userEvent.setup();
      render(<StudentClassBooking {...defaultProps} />);
      
      // Switch to My Bookings tab
      const bookingsTab = screen.getByRole('button', { name: 'My Bookings' });
      await user.click(bookingsTab);
      
      // Check recurring info
      expect(screen.getByText(/recurring weekly until/i)).toBeInTheDocument();
    });
  });

  describe('Class History Tab', () => {
    test('shows empty state for class history', async () => {
      const user = userEvent.setup();
      render(<StudentClassBooking {...defaultProps} />);
      
      // Switch to Class History tab
      const historyTab = screen.getByRole('button', { name: 'Class History' });
      await user.click(historyTab);
      
      // Look for the specific text in the history tab content
      expect(screen.getAllByText('Class History')).toHaveLength(2); // One in tab, one in content
      expect(screen.getByText('Your completed classes will appear here')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('handles booking failure gracefully', async () => {
      const user = userEvent.setup();
      mockOnBookClass.mockResolvedValue(false);
      
      render(<StudentClassBooking {...defaultProps} />);
      
      // Try to book a class
      const timeSlot = screen.getByRole('button', { name: /09:00.*10:00.*\$45/i });
      await user.click(timeSlot);
      
      const confirmButton = screen.getByRole('button', { name: /confirm booking/i });
      await user.click(confirmButton);
      
      // Dialog should remain open on failure
      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels and roles', () => {
      render(<StudentClassBooking {...defaultProps} />);
      
      // Check for proper labeling
      expect(screen.getByLabelText(/select date/i)).toBeInTheDocument();
      // Check that buttons exist
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Integration', () => {
    test('maintains state across tab switches', async () => {
      const user = userEvent.setup();
      render(<StudentClassBooking {...defaultProps} />);
      
      // Apply search filter
      const searchInput = screen.getByPlaceholderText(/search classes/i);
      await user.type(searchInput, 'IELTS');
      
      // Switch tabs
      const bookingsTab = screen.getByRole('button', { name: 'My Bookings' });
      await user.click(bookingsTab);
      
      // Switch back
      const availableTab = screen.getByRole('button', { name: 'Available Classes' });
      await user.click(availableTab);
      
      // Search should still be applied
      expect(searchInput).toHaveValue('IELTS');
      expect(screen.getByText('IELTS Speaking Preparation')).toBeInTheDocument();
      expect(screen.queryByText('Business English Conversation')).not.toBeInTheDocument();
    });

    test('updates UI after successful booking', async () => {
      const user = userEvent.setup();
      render(<StudentClassBooking {...defaultProps} />);
      
      // Book a class
      const timeSlot = screen.getByRole('button', { name: /09:00.*10:00.*\$45/i });
      await user.click(timeSlot);
      
      const confirmButton = screen.getByRole('button', { name: /confirm booking/i });
      await user.click(confirmButton);
      
      // Dialog should close after successful booking
      await waitFor(() => {
        expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
      });
    });
  });
});