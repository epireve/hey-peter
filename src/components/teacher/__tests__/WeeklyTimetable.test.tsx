import React from 'react';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WeeklyTimetable } from '../WeeklyTimetableEnhanced';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays } from 'date-fns';

// Set a fixed date for consistent testing
const MOCK_DATE = new Date('2024-01-15T10:00:00'); // Monday

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

describe('WeeklyTimetable', () => {
  const mockClasses = [
    {
      id: '1',
      class_name: 'English Conversation',
      course: {
        title: 'Basic English',
        course_type: 'basic',
        level: 'beginner',
      },
      students: [
        { id: 's1', full_name: 'John Doe' },
        { id: 's2', full_name: 'Jane Smith' },
      ],
      start_time: '2024-01-15T09:00:00',
      end_time: '2024-01-15T10:00:00',
      day_of_week: 1,
      location: 'Room 101',
      is_online: false,
      status: 'scheduled',
    },
    {
      id: '2',
      class_name: 'Business English',
      course: {
        title: 'Business English Advanced',
        course_type: 'business',
        level: 'advanced',
      },
      students: [
        { id: 's3', full_name: 'Bob Johnson' },
      ],
      start_time: '2024-01-15T14:00:00',
      end_time: '2024-01-15T15:30:00',
      day_of_week: 1,
      location: 'Online',
      is_online: true,
      status: 'scheduled',
    },
    {
      id: '3',
      class_name: 'TOEFL Preparation',
      course: {
        title: 'TOEFL Prep',
        course_type: '1-on-1',
        level: 'intermediate',
      },
      students: [
        { id: 's4', full_name: 'Alice Brown' },
      ],
      start_time: '2024-01-17T10:00:00',
      end_time: '2024-01-17T11:00:00',
      day_of_week: 3,
      location: 'Room 201',
      is_online: false,
      status: 'scheduled',
    },
    {
      id: '4',
      class_name: 'Everyday English A',
      course: {
        title: 'Everyday English A',
        course_type: 'everyday_a',
        level: 'intermediate',
      },
      students: [
        { id: 's5', full_name: 'Charlie Wilson' },
        { id: 's6', full_name: 'Diana Martinez' },
        { id: 's7', full_name: 'Eve Davis' },
      ],
      start_time: '2024-01-19T13:00:00',
      end_time: '2024-01-19T14:30:00',
      day_of_week: 5,
      location: 'Room 303',
      is_online: false,
      status: 'scheduled',
    },
  ];

  const defaultProps = {
    teacherId: 'teacher-123',
    classes: mockClasses,
    isLoading: false,
    onClassClick: jest.fn(),
    onExport: jest.fn(),
  };

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Display and Layout', () => {
    it('should display the component title', () => {
      render(<WeeklyTimetable {...defaultProps} />);
      
      expect(screen.getByText('Weekly Timetable')).toBeInTheDocument();
    });

    it('should display the current week range', () => {
      render(<WeeklyTimetable {...defaultProps} />);
      
      const weekStart = startOfWeek(MOCK_DATE, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(MOCK_DATE, { weekStartsOn: 1 });
      const expectedText = `${format(weekStart, 'MMMM d')} - ${format(weekEnd, 'MMMM d, yyyy')}`;
      
      expect(screen.getByText(expectedText)).toBeInTheDocument();
    });

    it('should display all days of the week', () => {
      render(<WeeklyTimetable {...defaultProps} />);
      
      daysOfWeek.forEach(day => {
        expect(screen.getByText(day)).toBeInTheDocument();
      });
    });

    it('should display time slots from 7 AM to 9 PM', () => {
      render(<WeeklyTimetable {...defaultProps} />);
      
      const timeSlots = ['7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', 
                        '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', 
                        '7:00 PM', '8:00 PM', '9:00 PM'];
      
      timeSlots.forEach(time => {
        expect(screen.getByText(time)).toBeInTheDocument();
      });
    });
  });

  describe('Class Display', () => {
    it('should display classes in their correct time slots', () => {
      render(<WeeklyTimetable {...defaultProps} />);
      
      // Monday 9 AM class
      expect(screen.getByText('English Conversation')).toBeInTheDocument();
      expect(screen.getByText('Room 101')).toBeInTheDocument();
      
      // Monday 2 PM class
      expect(screen.getByText('Business English')).toBeInTheDocument();
      expect(screen.getByText('Online')).toBeInTheDocument();
      
      // Wednesday 10 AM class
      expect(screen.getByText('TOEFL Preparation')).toBeInTheDocument();
      expect(screen.getByText('Room 201')).toBeInTheDocument();
      
      // Friday 1 PM class
      expect(screen.getByText('Everyday English A')).toBeInTheDocument();
      expect(screen.getByText('Room 303')).toBeInTheDocument();
    });

    it('should show student count for each class', () => {
      render(<WeeklyTimetable {...defaultProps} />);
      
      const englishClass = screen.getByText('English Conversation').closest('[data-testid*="class-"]');
      expect(within(englishClass!).getByText('2 students')).toBeInTheDocument();
      
      const businessClass = screen.getByText('Business English').closest('[data-testid*="class-"]');
      expect(within(businessClass!).getByText('1 student')).toBeInTheDocument();
      
      const everydayClass = screen.getByText('Everyday English A').closest('[data-testid*="class-"]');
      expect(within(everydayClass!).getByText('3 students')).toBeInTheDocument();
    });

    it('should indicate online classes', () => {
      render(<WeeklyTimetable {...defaultProps} />);
      
      const onlineClass = screen.getByText('Business English').closest('[data-testid*="class-"]');
      expect(within(onlineClass!).getByTestId('online-indicator')).toBeInTheDocument();
    });

    it('should apply different styles for different course types', () => {
      render(<WeeklyTimetable {...defaultProps} />);
      
      const basicClass = screen.getByText('English Conversation').closest('[data-testid*="class-"]');
      expect(basicClass).toHaveClass('bg-blue-100');
      
      const businessClass = screen.getByText('Business English').closest('[data-testid*="class-"]');
      expect(businessClass).toHaveClass('bg-green-100');
      
      const oneOnOneClass = screen.getByText('TOEFL Preparation').closest('[data-testid*="class-"]');
      expect(oneOnOneClass).toHaveClass('bg-purple-100');
      
      const everydayClass = screen.getByText('Everyday English A').closest('[data-testid*="class-"]');
      expect(everydayClass).toHaveClass('bg-orange-100');
    });
  });

  describe('Interactions', () => {
    it('should call onClassClick when a class is clicked', async () => {
      const user = userEvent.setup();
      const mockOnClassClick = jest.fn();
      render(<WeeklyTimetable {...defaultProps} onClassClick={mockOnClassClick} />);
      
      const englishClass = screen.getByText('English Conversation').closest('[data-testid*="class-"]');
      await user.click(englishClass!);
      
      expect(mockOnClassClick).toHaveBeenCalledWith(mockClasses[0]);
    });

    it('should show class details tooltip on hover', () => {
      render(<WeeklyTimetable {...defaultProps} />);
      
      const englishClass = screen.getByText('English Conversation').closest('[data-testid*="class-"]');
      expect(englishClass).toHaveAttribute('title');
      const title = englishClass!.getAttribute('title');
      expect(title).toContain('Basic English');
      expect(title).toContain('Level: beginner');
      expect(title).toContain('Students: John Doe, Jane Smith');
    });
  });

  describe('Navigation', () => {
    it('should allow navigation to previous and next weeks', async () => {
      const user = userEvent.setup();
      render(<WeeklyTimetable {...defaultProps} />);
      
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
      render(<WeeklyTimetable {...defaultProps} />);
      
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

  describe('View Options', () => {
    it('should have view toggle buttons', () => {
      render(<WeeklyTimetable {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /week view/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /day view/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /list view/i })).toBeInTheDocument();
    });

    it('should switch to day view when clicked', async () => {
      const user = userEvent.setup();
      render(<WeeklyTimetable {...defaultProps} />);
      
      const dayViewButton = screen.getByRole('button', { name: /day view/i });
      await user.click(dayViewButton);
      
      // Should show only today's date
      expect(screen.getByText(format(MOCK_DATE, 'EEEE, MMMM d, yyyy'))).toBeInTheDocument();
      
      // Should only show classes for today (Monday)
      expect(screen.getByText('English Conversation')).toBeInTheDocument();
      expect(screen.getByText('Business English')).toBeInTheDocument();
      expect(screen.queryByText('TOEFL Preparation')).not.toBeInTheDocument(); // Wednesday
      expect(screen.queryByText('Everyday English A')).not.toBeInTheDocument(); // Friday
    });

    it('should switch to list view when clicked', async () => {
      const user = userEvent.setup();
      render(<WeeklyTimetable {...defaultProps} />);
      
      const listViewButton = screen.getByRole('button', { name: /list view/i });
      await user.click(listViewButton);
      
      // Should show all classes in a list format
      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByText('Date')).toBeInTheDocument();
      expect(screen.getByText('Time')).toBeInTheDocument();
      expect(screen.getByText('Class')).toBeInTheDocument();
      expect(screen.getByText('Students')).toBeInTheDocument();
      expect(screen.getByText('Location')).toBeInTheDocument();
    });
  });

  describe('Export Functionality', () => {
    it('should have export button', () => {
      render(<WeeklyTimetable {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    });

    it('should show export options when clicked', async () => {
      const user = userEvent.setup();
      render(<WeeklyTimetable {...defaultProps} />);
      
      const exportButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportButton);
      
      expect(screen.getByText('Export as PDF')).toBeInTheDocument();
      expect(screen.getByText('Export as Image')).toBeInTheDocument();
      expect(screen.getByText('Export as Excel')).toBeInTheDocument();
    });

    it('should call onExport with format when export option is selected', async () => {
      const user = userEvent.setup();
      const mockOnExport = jest.fn();
      render(<WeeklyTimetable {...defaultProps} onExport={mockOnExport} />);
      
      const exportButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportButton);
      
      const pdfOption = screen.getByText('Export as PDF');
      await user.click(pdfOption);
      
      expect(mockOnExport).toHaveBeenCalledWith('pdf', expect.any(Object));
    });
  });

  describe('Empty States', () => {
    it('should show empty state when no classes', () => {
      render(<WeeklyTimetable {...defaultProps} classes={[]} />);
      
      expect(screen.getByText(/no classes scheduled/i)).toBeInTheDocument();
      expect(screen.getByText(/your scheduled classes will appear here/i)).toBeInTheDocument();
    });

    it('should show empty state for specific day in day view', async () => {
      const user = userEvent.setup();
      // Classes only on Mon, Wed, Fri
      render(<WeeklyTimetable {...defaultProps} />);
      
      // Switch to day view
      const dayViewButton = screen.getByRole('button', { name: /day view/i });
      await user.click(dayViewButton);
      
      // Navigate to Tuesday
      const nextDayButton = screen.getByRole('button', { name: /next day/i });
      await user.click(nextDayButton);
      
      expect(screen.getByText(/no classes scheduled for this day/i)).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loading skeleton when data is loading', () => {
      render(<WeeklyTimetable {...defaultProps} isLoading={true} />);
      
      expect(screen.getByTestId('timetable-skeleton')).toBeInTheDocument();
      expect(screen.queryByText('English Conversation')).not.toBeInTheDocument();
    });
  });

  describe('Print Functionality', () => {
    it('should have print button', () => {
      render(<WeeklyTimetable {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /print/i })).toBeInTheDocument();
    });

    it('should trigger print when clicked', async () => {
      const user = userEvent.setup();
      const mockPrint = jest.fn();
      global.window.print = mockPrint;
      
      render(<WeeklyTimetable {...defaultProps} />);
      
      const printButton = screen.getByRole('button', { name: /print/i });
      await user.click(printButton);
      
      expect(mockPrint).toHaveBeenCalled();
    });
  });

  describe('Summary Statistics', () => {
    it('should display weekly summary statistics', () => {
      render(<WeeklyTimetable {...defaultProps} />);
      
      const summarySection = screen.getByTestId('weekly-summary');
      
      expect(within(summarySection).getByText('Total Classes')).toBeInTheDocument();
      expect(within(summarySection).getByText('4')).toBeInTheDocument();
      
      expect(within(summarySection).getByText('Total Hours')).toBeInTheDocument();
      expect(within(summarySection).getByText('5.0')).toBeInTheDocument(); // 1 + 1.5 + 1 + 1.5
      
      expect(within(summarySection).getByText('Total Students')).toBeInTheDocument();
      expect(within(summarySection).getByText('7')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<WeeklyTimetable {...defaultProps} />);
      
      expect(screen.getByRole('region', { name: /weekly timetable/i })).toBeInTheDocument();
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      render(<WeeklyTimetable {...defaultProps} />);
      
      // Tab through interactive elements
      await user.tab();
      expect(screen.getByRole('button', { name: /previous week/i })).toHaveFocus();
      
      await user.tab();
      expect(screen.getByRole('button', { name: /this week/i })).toHaveFocus();
      
      await user.tab();
      expect(screen.getByRole('button', { name: /next week/i })).toHaveFocus();
    });

    it('should announce view changes to screen readers', async () => {
      const user = userEvent.setup();
      render(<WeeklyTimetable {...defaultProps} />);
      
      const dayViewButton = screen.getByRole('button', { name: /day view/i });
      await user.click(dayViewButton);
      
      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toHaveTextContent(/switched to day view/i);
    });
  });
});