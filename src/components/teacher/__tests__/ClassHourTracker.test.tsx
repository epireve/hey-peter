import React from 'react';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClassHourTracker } from '../ClassHourTracker';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';

// Set a fixed date for consistent testing
const MOCK_DATE = new Date('2024-01-15T10:00:00');

// Mock the Date constructor
const RealDate = Date;
global.Date = class extends RealDate {
  constructor(...args: any[]) {
    if (args.length === 0) {
      super(MOCK_DATE);
    } else {
      // @ts-ignore
      super(...args);
    }
  }
  static now() {
    return MOCK_DATE.getTime();
  }
} as any;

describe('ClassHourTracker', () => {
  const mockClassHours = [
    {
      id: '1',
      date: '2024-01-15',
      class_id: 'class-1',
      class_name: 'English Conversation',
      student_name: 'John Doe',
      start_time: '09:00',
      end_time: '10:00',
      duration_minutes: 60,
      type: 'regular',
      status: 'completed',
      attendance_status: 'present',
    },
    {
      id: '2',
      date: '2024-01-15',
      class_id: 'class-2',
      class_name: 'Business English',
      student_name: 'Jane Smith',
      start_time: '10:30',
      end_time: '11:30',
      duration_minutes: 60,
      type: 'makeup',
      status: 'completed',
      attendance_status: 'present',
    },
    {
      id: '3',
      date: '2024-01-16',
      class_id: 'class-3',
      class_name: 'TOEFL Preparation',
      student_name: 'Bob Johnson',
      start_time: '14:00',
      end_time: '15:30',
      duration_minutes: 90,
      type: 'one-on-one',
      status: 'scheduled',
      attendance_status: null,
    },
    {
      id: '4',
      date: '2024-01-14',
      class_id: 'class-4',
      class_name: 'Grammar Basics',
      student_name: 'Alice Brown',
      start_time: '13:00',
      end_time: '14:00',
      duration_minutes: 60,
      type: 'regular',
      status: 'completed',
      attendance_status: 'absent',
    },
  ];

  const defaultProps = {
    teacherId: 'teacher-123',
    classHours: mockClassHours,
    isLoading: false,
    onRefresh: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Header and Summary', () => {
    it('should display the component title and date range', () => {
      render(<ClassHourTracker {...defaultProps} />);
      
      expect(screen.getByText('Class Hours')).toBeInTheDocument();
      // Check for the date range text - week starts on Monday
      const weekStart = startOfWeek(MOCK_DATE, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(MOCK_DATE, { weekStartsOn: 1 });
      const expectedText = `${format(weekStart, 'MMMM d')} - ${format(weekEnd, 'MMMM d, yyyy')}`;
      expect(screen.getByText(expectedText)).toBeInTheDocument();
    });

    it('should display total hours summary', () => {
      render(<ClassHourTracker {...defaultProps} />);
      
      const summarySection = screen.getByTestId('hours-summary');
      expect(within(summarySection).getByText('4.5')).toBeInTheDocument(); // 60 + 60 + 90 + 60 = 270 minutes = 4.5 hours
    });

    it('should display completed vs scheduled hours breakdown', () => {
      render(<ClassHourTracker {...defaultProps} />);
      
      const summarySection = screen.getByTestId('hours-summary');
      expect(within(summarySection).getByText('Completed')).toBeInTheDocument();
      expect(within(summarySection).getByText('3.0 hrs')).toBeInTheDocument(); // 3 completed classes
      
      expect(within(summarySection).getByText('Scheduled')).toBeInTheDocument();
      expect(within(summarySection).getByText('1.5 hrs')).toBeInTheDocument(); // 1 scheduled class
    });

    it('should display attendance statistics', () => {
      render(<ClassHourTracker {...defaultProps} />);
      
      const statsSection = screen.getByTestId('attendance-stats');
      expect(within(statsSection).getByText('Present')).toBeInTheDocument();
      expect(within(statsSection).getByText('2')).toBeInTheDocument();
      
      expect(within(statsSection).getByText('Absent')).toBeInTheDocument();
      expect(within(statsSection).getByText('1')).toBeInTheDocument();
      
      expect(within(statsSection).getByText('Attendance Rate')).toBeInTheDocument();
      expect(within(statsSection).getByText('66.7%')).toBeInTheDocument(); // 2/3 = 66.7%
    });
  });

  describe('Filtering', () => {
    it('should render filter controls', () => {
      render(<ClassHourTracker {...defaultProps} />);
      
      expect(screen.getByLabelText(/date range/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/class type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/search by class or student/i)).toBeInTheDocument();
    });

    it('should filter by date range', async () => {
      const user = userEvent.setup();
      render(<ClassHourTracker {...defaultProps} />);
      
      const dateRangeSelect = screen.getByLabelText(/date range/i);
      await user.click(dateRangeSelect);
      await user.click(screen.getByRole('option', { name: 'Today' }));
      
      // Should only show classes from today (Jan 15) - they appear in table rows
      const rows = screen.getAllByRole('row');
      const classNames = rows.map(row => row.textContent);
      
      expect(classNames.some(text => text?.includes('English Conversation'))).toBe(true);
      expect(classNames.some(text => text?.includes('Business English'))).toBe(true);
      expect(classNames.some(text => text?.includes('Grammar Basics'))).toBe(false); // Jan 14
      expect(classNames.some(text => text?.includes('TOEFL Preparation'))).toBe(false); // Jan 16
    });

    it('should filter by class type', async () => {
      const user = userEvent.setup();
      render(<ClassHourTracker {...defaultProps} />);
      
      const typeSelect = screen.getByLabelText(/class type/i);
      await user.click(typeSelect);
      await user.click(screen.getByRole('option', { name: '1-on-1' }));
      
      // Should only show one-on-one classes
      const rows = screen.getAllByRole('row');
      const classNames = rows.map(row => row.textContent);
      
      expect(classNames.some(text => text?.includes('TOEFL Preparation'))).toBe(true);
      expect(classNames.some(text => text?.includes('English Conversation'))).toBe(false);
      expect(classNames.some(text => text?.includes('Business English'))).toBe(false);
      expect(classNames.some(text => text?.includes('Grammar Basics'))).toBe(false);
    });

    it('should filter by status', async () => {
      const user = userEvent.setup();
      render(<ClassHourTracker {...defaultProps} />);
      
      const statusSelect = screen.getByLabelText(/status/i);
      await user.click(statusSelect);
      await user.click(screen.getByRole('option', { name: 'Scheduled' }));
      
      // Should only show scheduled classes
      const rows = screen.getAllByRole('row');
      const classNames = rows.map(row => row.textContent);
      
      expect(classNames.some(text => text?.includes('TOEFL Preparation'))).toBe(true);
      expect(classNames.some(text => text?.includes('English Conversation'))).toBe(false);
      expect(classNames.some(text => text?.includes('Business English'))).toBe(false);
      expect(classNames.some(text => text?.includes('Grammar Basics'))).toBe(false);
    });

    it('should filter by search term', async () => {
      const user = userEvent.setup();
      render(<ClassHourTracker {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText(/search by class or student/i);
      await user.type(searchInput, 'English');
      
      // Should show classes with "English" in the name
      expect(screen.getByText('English Conversation')).toBeInTheDocument();
      expect(screen.getByText('Business English')).toBeInTheDocument();
      expect(screen.queryByText('TOEFL Preparation')).not.toBeInTheDocument();
      expect(screen.queryByText('Grammar Basics')).not.toBeInTheDocument();
    });

    it('should clear filters when clear button is clicked', async () => {
      const user = userEvent.setup();
      render(<ClassHourTracker {...defaultProps} />);
      
      // Apply some filters
      const typeSelect = screen.getByLabelText(/class type/i);
      await user.click(typeSelect);
      await user.click(screen.getByRole('option', { name: 'Regular' }));
      
      // Clear filters
      const clearButton = screen.getByRole('button', { name: /clear filters/i });
      await user.click(clearButton);
      
      // All classes should be visible again in the table
      const rows = screen.getAllByRole('row');
      const classNames = rows.map(row => row.textContent);
      
      expect(classNames.some(text => text?.includes('English Conversation'))).toBe(true);
      expect(classNames.some(text => text?.includes('Business English'))).toBe(true);
      expect(classNames.some(text => text?.includes('TOEFL Preparation'))).toBe(true);
      expect(classNames.some(text => text?.includes('Grammar Basics'))).toBe(true);
    });
  });

  describe('Class Hours Table', () => {
    it('should display class hours in a table', () => {
      render(<ClassHourTracker {...defaultProps} />);
      
      // Check table headers
      expect(screen.getByText('Date')).toBeInTheDocument();
      expect(screen.getByText('Time')).toBeInTheDocument();
      expect(screen.getByText('Class')).toBeInTheDocument();
      expect(screen.getByText('Student')).toBeInTheDocument();
      expect(screen.getByText('Duration')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
    });

    it('should display class hour details correctly', () => {
      render(<ClassHourTracker {...defaultProps} />);
      
      const firstRow = screen.getByRole('row', { name: /english conversation/i });
      
      expect(within(firstRow).getByText('Jan 15, 2024')).toBeInTheDocument();
      expect(within(firstRow).getByText('09:00 - 10:00')).toBeInTheDocument();
      expect(within(firstRow).getByText('English Conversation')).toBeInTheDocument();
      expect(within(firstRow).getByText('John Doe')).toBeInTheDocument();
      expect(within(firstRow).getByText('60 min')).toBeInTheDocument();
      expect(within(firstRow).getByText('Regular')).toBeInTheDocument();
    });

    it('should show appropriate badges for different statuses', () => {
      render(<ClassHourTracker {...defaultProps} />);
      
      // Find badges in the table
      const badges = screen.getAllByRole('generic').filter(el => 
        el.className.includes('badge') || el.className.includes('bg-')
      );
      
      // Check that we have status badges
      expect(screen.getByText('Present')).toBeInTheDocument();
      expect(screen.getByText('Absent')).toBeInTheDocument();
      expect(screen.getByText('Scheduled')).toBeInTheDocument();
      
      // Check badge styles
      const presentBadge = screen.getByText('Present');
      expect(presentBadge.className).toMatch(/bg-green/);
      
      const absentBadge = screen.getByText('Absent');
      expect(absentBadge.className).toMatch(/bg-red/);
      
      const scheduledBadge = screen.getByText('Scheduled');
      expect(scheduledBadge.className).toMatch(/bg-blue/);
    });

    it('should show appropriate badges for class types', () => {
      render(<ClassHourTracker {...defaultProps} />);
      
      // Regular class
      const regularRow = screen.getByRole('row', { name: /english conversation/i });
      const regularBadge = within(regularRow).getByText('Regular');
      expect(regularBadge).toHaveClass('bg-gray-100');
      
      // Makeup class
      const makeupRow = screen.getByRole('row', { name: /business english/i });
      const makeupBadge = within(makeupRow).getByText('Makeup');
      expect(makeupBadge).toHaveClass('bg-yellow-100');
      
      // One-on-one class
      const oneOnOneRow = screen.getByRole('row', { name: /toefl preparation/i });
      const oneOnOneBadge = within(oneOnOneRow).getByText('1-on-1');
      expect(oneOnOneBadge).toHaveClass('bg-purple-100');
    });
  });

  describe('Refresh and Export', () => {
    it('should show refresh button and call onRefresh when clicked', async () => {
      const user = userEvent.setup();
      const mockRefresh = jest.fn();
      render(<ClassHourTracker {...defaultProps} onRefresh={mockRefresh} />);
      
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toBeInTheDocument();
      
      await user.click(refreshButton);
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it('should show export button with options', async () => {
      const user = userEvent.setup();
      render(<ClassHourTracker {...defaultProps} />);
      
      const exportButton = screen.getByRole('button', { name: /export/i });
      expect(exportButton).toBeInTheDocument();
      
      await user.click(exportButton);
      
      expect(screen.getByText('Export as Excel')).toBeInTheDocument();
      expect(screen.getByText('Export as PDF')).toBeInTheDocument();
    });
  });

  describe('Loading and Empty States', () => {
    it('should show loading state', () => {
      render(<ClassHourTracker {...defaultProps} isLoading={true} />);
      
      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
      expect(screen.queryByText('English Conversation')).not.toBeInTheDocument();
    });

    it('should show empty state when no class hours', () => {
      render(<ClassHourTracker {...defaultProps} classHours={[]} />);
      
      expect(screen.getByText(/no class hours found/i)).toBeInTheDocument();
      expect(screen.getByText(/your class hours will appear here/i)).toBeInTheDocument();
    });

    it('should show filtered empty state when filters are applied', async () => {
      const user = userEvent.setup();
      render(<ClassHourTracker {...defaultProps} classHours={mockClassHours} />);
      
      // Apply a filter that matches nothing
      const searchInput = screen.getByPlaceholderText(/search by class or student/i);
      await user.type(searchInput, 'NonExistentClass');
      
      expect(screen.getByText(/no class hours match your filters/i)).toBeInTheDocument();
    });
  });

  describe('Weekly Navigation', () => {
    it('should allow navigation to previous and next weeks', async () => {
      const user = userEvent.setup();
      render(<ClassHourTracker {...defaultProps} />);
      
      const prevButton = screen.getByRole('button', { name: /previous week/i });
      const nextButton = screen.getByRole('button', { name: /next week/i });
      
      expect(prevButton).toBeInTheDocument();
      expect(nextButton).toBeInTheDocument();
      
      // Navigate to previous week
      await user.click(prevButton);
      const prevWeekStart = startOfWeek(subWeeks(MOCK_DATE, 1), { weekStartsOn: 1 });
      const prevWeekEnd = endOfWeek(subWeeks(MOCK_DATE, 1), { weekStartsOn: 1 });
      expect(screen.getByText(`${format(prevWeekStart, 'MMMM d')} - ${format(prevWeekEnd, 'MMMM d, yyyy')}`)).toBeInTheDocument();
      
      // Navigate to next week (back to current, then forward)
      await user.click(nextButton);
      await user.click(nextButton);
      const nextWeekStart = startOfWeek(addWeeks(MOCK_DATE, 1), { weekStartsOn: 1 });
      const nextWeekEnd = endOfWeek(addWeeks(MOCK_DATE, 1), { weekStartsOn: 1 });
      expect(screen.getByText(`${format(nextWeekStart, 'MMMM d')} - ${format(nextWeekEnd, 'MMMM d, yyyy')}`)).toBeInTheDocument();
    });

    it('should have a "This Week" button to return to current week', async () => {
      const user = userEvent.setup();
      render(<ClassHourTracker {...defaultProps} />);
      
      // Navigate away from current week
      const prevButton = screen.getByRole('button', { name: /previous week/i });
      await user.click(prevButton);
      
      // Click "This Week" to return
      const thisWeekButton = screen.getByRole('button', { name: /this week/i });
      await user.click(thisWeekButton);
      
      const currentWeekStart = startOfWeek(MOCK_DATE, { weekStartsOn: 1 });
      const currentWeekEnd = endOfWeek(MOCK_DATE, { weekStartsOn: 1 });
      expect(screen.getByText(`${format(currentWeekStart, 'MMMM d')} - ${format(currentWeekEnd, 'MMMM d, yyyy')}`)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<ClassHourTracker {...defaultProps} />);
      
      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByLabelText(/date range/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/class type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      render(<ClassHourTracker {...defaultProps} />);
      
      // Tab through interactive elements
      await user.tab();
      expect(screen.getByLabelText(/date range/i)).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText(/class type/i)).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText(/status/i)).toHaveFocus();
      
      await user.tab();
      expect(screen.getByPlaceholderText(/search by class or student/i)).toHaveFocus();
    });
  });
});