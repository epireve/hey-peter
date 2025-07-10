import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StudentProgressTracking } from '../StudentProgressTracking';

// Mock the icons
jest.mock('lucide-react', () => ({
  BookOpen: () => <div data-testid="book-open-icon">BookOpen</div>,
  Calendar: () => <div data-testid="calendar-icon">Calendar</div>,
  TrendingUp: () => <div data-testid="trending-up-icon">TrendingUp</div>,
  Target: () => <div data-testid="target-icon">Target</div>,
  Award: () => <div data-testid="award-icon">Award</div>,
  Clock: () => <div data-testid="clock-icon">Clock</div>,
  CheckCircle: () => <div data-testid="check-circle-icon">CheckCircle</div>,
  CircleProgress: () => <div data-testid="circle-progress-icon">CircleProgress</div>,
  BarChart: () => <div data-testid="bar-chart-icon">BarChart</div>,
  PieChart: () => <div data-testid="pie-chart-icon">PieChart</div>,
  Star: () => <div data-testid="star-icon">Star</div>,
  User: () => <div data-testid="user-icon">User</div>,
  Filter: () => <div data-testid="filter-icon">Filter</div>,
  Download: () => <div data-testid="download-icon">Download</div>,
  Eye: () => <div data-testid="eye-icon">Eye</div>,
  ChevronDown: () => <div data-testid="chevron-down-icon">ChevronDown</div>,
  ChevronUp: () => <div data-testid="chevron-up-icon">ChevronUp</div>,
}));

// Mock progress data
const mockProgressData = {
  student: {
    id: 'student-123',
    name: 'John Doe',
    email: 'john.doe@example.com',
    course: 'Business English',
    level: 'Intermediate',
    enrollmentDate: '2024-01-15',
    targetGraduationDate: '2024-06-15',
  },
  overallProgress: {
    percentage: 75,
    completedLessons: 45,
    totalLessons: 60,
    completedAssignments: 18,
    totalAssignments: 24,
    attendanceRate: 92,
    averageScore: 85,
  },
  courseProgress: [
    {
      id: 'module-1',
      title: 'Business Communication Fundamentals',
      percentage: 100,
      completedLessons: 12,
      totalLessons: 12,
      status: 'completed',
      grade: 'A',
      lastActivity: '2024-02-15',
    },
    {
      id: 'module-2',
      title: 'Email Writing and Correspondence',
      percentage: 85,
      completedLessons: 8,
      totalLessons: 10,
      status: 'in_progress',
      grade: 'B+',
      lastActivity: '2024-03-10',
    },
    {
      id: 'module-3',
      title: 'Presentation Skills',
      percentage: 60,
      completedLessons: 6,
      totalLessons: 10,
      status: 'in_progress',
      grade: 'B',
      lastActivity: '2024-03-12',
    },
    {
      id: 'module-4',
      title: 'Advanced Business Writing',
      percentage: 0,
      completedLessons: 0,
      totalLessons: 8,
      status: 'not_started',
      grade: null,
      lastActivity: null,
    },
  ],
  skillsProgress: [
    {
      skill: 'Speaking',
      current: 82,
      target: 90,
      improvement: 15,
      color: 'blue',
    },
    {
      skill: 'Listening',
      current: 78,
      target: 85,
      improvement: 12,
      color: 'green',
    },
    {
      skill: 'Reading',
      current: 88,
      target: 92,
      improvement: 8,
      color: 'orange',
    },
    {
      skill: 'Writing',
      current: 85,
      target: 88,
      improvement: 10,
      color: 'purple',
    },
  ],
  recentActivity: [
    {
      id: 'activity-1',
      type: 'lesson',
      title: 'Completed: Presentation Techniques',
      date: '2024-03-12',
      score: 92,
      status: 'completed',
    },
    {
      id: 'activity-2',
      type: 'assignment',
      title: 'Submitted: Email Template Design',
      date: '2024-03-10',
      score: 88,
      status: 'completed',
    },
    {
      id: 'activity-3',
      type: 'quiz',
      title: 'Quiz: Business Vocabulary',
      date: '2024-03-08',
      score: 95,
      status: 'completed',
    },
  ],
  upcomingTasks: [
    {
      id: 'task-1',
      title: 'Complete Module 3 Final Project',
      dueDate: '2024-03-20',
      priority: 'high',
      type: 'assignment',
    },
    {
      id: 'task-2',
      title: 'Attend Speaking Practice Session',
      dueDate: '2024-03-15',
      priority: 'medium',
      type: 'class',
    },
    {
      id: 'task-3',
      title: 'Review Grammar Exercise Set 4',
      dueDate: '2024-03-18',
      priority: 'low',
      type: 'homework',
    },
  ],
};

describe('StudentProgressTracking', () => {
  const defaultProps = {
    studentId: 'student-123',
    progressData: mockProgressData,
  };

  it('should render student progress tracking component', () => {
    render(<StudentProgressTracking {...defaultProps} />);
    
    expect(screen.getByText('Progress Overview')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText(/Business English/)).toBeInTheDocument();
  });

  it('should display overall progress metrics', () => {
    render(<StudentProgressTracking {...defaultProps} />);
    
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('45/60')).toBeInTheDocument();
    expect(screen.getByText('18/24')).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument();
  });

  it('should show course progress modules', () => {
    render(<StudentProgressTracking {...defaultProps} />);
    
    expect(screen.getByText('Business Communication Fundamentals')).toBeInTheDocument();
    expect(screen.getByText('Email Writing and Correspondence')).toBeInTheDocument();
    expect(screen.getByText('Presentation Skills')).toBeInTheDocument();
    expect(screen.getByText('Advanced Business Writing')).toBeInTheDocument();
  });

  it('should display module completion status', () => {
    render(<StudentProgressTracking {...defaultProps} />);
    
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getAllByText('In Progress').length).toBeGreaterThan(0);
    expect(screen.getByText('Not Started')).toBeInTheDocument();
  });

  it('should show module grades', () => {
    render(<StudentProgressTracking {...defaultProps} />);
    
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B+')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('should display skills progress', () => {
    render(<StudentProgressTracking {...defaultProps} />);
    
    expect(screen.getByText('Speaking')).toBeInTheDocument();
    expect(screen.getByText('Listening')).toBeInTheDocument();
    expect(screen.getByText('Reading')).toBeInTheDocument();
    expect(screen.getByText('Writing')).toBeInTheDocument();
  });

  it('should show skill scores and targets', () => {
    render(<StudentProgressTracking {...defaultProps} />);
    
    expect(screen.getByText('82/90')).toBeInTheDocument();
    expect(screen.getByText('78/85')).toBeInTheDocument();
    expect(screen.getByText('88/92')).toBeInTheDocument();
    expect(screen.getByText('85/88')).toBeInTheDocument();
  });

  it('should display recent activity', () => {
    render(<StudentProgressTracking {...defaultProps} />);
    
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(screen.getByText('Completed: Presentation Techniques')).toBeInTheDocument();
    expect(screen.getByText('Submitted: Email Template Design')).toBeInTheDocument();
    expect(screen.getByText('Quiz: Business Vocabulary')).toBeInTheDocument();
  });

  it('should show activity scores', () => {
    render(<StudentProgressTracking {...defaultProps} />);
    
    expect(screen.getByText('92')).toBeInTheDocument();
    expect(screen.getByText('88')).toBeInTheDocument();
    expect(screen.getByText('95')).toBeInTheDocument();
  });

  it('should display upcoming tasks', () => {
    render(<StudentProgressTracking {...defaultProps} />);
    
    expect(screen.getByText('Upcoming Tasks')).toBeInTheDocument();
    expect(screen.getByText('Complete Module 3 Final Project')).toBeInTheDocument();
    expect(screen.getByText('Attend Speaking Practice Session')).toBeInTheDocument();
    expect(screen.getByText('Review Grammar Exercise Set 4')).toBeInTheDocument();
  });

  it('should show task priorities', () => {
    render(<StudentProgressTracking {...defaultProps} />);
    
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
  });

  it('should display task due dates', () => {
    render(<StudentProgressTracking {...defaultProps} />);
    
    expect(screen.getByText(/Mar 20, 2024/)).toBeInTheDocument();
    expect(screen.getByText(/Mar 15, 2024/)).toBeInTheDocument();
    expect(screen.getByText(/Mar 18, 2024/)).toBeInTheDocument();
  });

  it('should handle loading state', () => {
    render(<StudentProgressTracking {...defaultProps} isLoading={true} />);
    
    expect(screen.getByTestId('progress-loading')).toBeInTheDocument();
  });

  it('should handle empty progress data', () => {
    const emptyProps = {
      studentId: 'student-123',
      progressData: null,
    };
    
    render(<StudentProgressTracking {...emptyProps} />);
    
    expect(screen.getByText(/no progress data available/i)).toBeInTheDocument();
  });

  it('should display enrollment information', () => {
    render(<StudentProgressTracking {...defaultProps} />);
    
    expect(screen.getByText(/enrolled/i)).toBeInTheDocument();
    expect(screen.getByText(/Jan 15, 2024/)).toBeInTheDocument();
  });

  it('should show target graduation date', () => {
    render(<StudentProgressTracking {...defaultProps} />);
    
    expect(screen.getByText(/graduation/i)).toBeInTheDocument();
    expect(screen.getByText(/Jun 15, 2024/)).toBeInTheDocument();
  });

  it('should handle module details expansion', () => {
    render(<StudentProgressTracking {...defaultProps} />);
    
    const expandButton = screen.getAllByTestId('expand-module')[0];
    fireEvent.click(expandButton);
    
    expect(screen.getByText(/last activity/i)).toBeInTheDocument();
  });

  it('should support progress export', () => {
    const mockOnExport = jest.fn();
    render(<StudentProgressTracking {...defaultProps} onExport={mockOnExport} />);
    
    const exportButton = screen.getByText(/export/i);
    fireEvent.click(exportButton);
    
    expect(mockOnExport).toHaveBeenCalledWith('student-123', 'progress');
  });

  it('should handle progress filtering', () => {
    render(<StudentProgressTracking {...defaultProps} />);
    
    const filterButton = screen.getByRole('button', { name: /filter/i });
    expect(filterButton).toBeInTheDocument();
    
    // Should be able to click the filter button
    fireEvent.click(filterButton);
    
    // Check that all course modules are displayed by default
    expect(screen.getByText('Business Communication Fundamentals')).toBeInTheDocument();
    expect(screen.getByText('Email Writing and Correspondence')).toBeInTheDocument();
  });

  it('should display progress charts', () => {
    render(<StudentProgressTracking {...defaultProps} showCharts={true} />);
    
    expect(screen.getByTestId('progress-chart')).toBeInTheDocument();
    expect(screen.getByTestId('skills-chart')).toBeInTheDocument();
  });

  it('should show attendance tracking', () => {
    render(<StudentProgressTracking {...defaultProps} />);
    
    expect(screen.getByText('Attendance')).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument();
  });

  it('should display average score', () => {
    render(<StudentProgressTracking {...defaultProps} />);
    
    expect(screen.getByText(/average score/i)).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument();
  });

  it('should handle skill improvement indicators', () => {
    render(<StudentProgressTracking {...defaultProps} />);
    
    expect(screen.getByText('+15')).toBeInTheDocument();
    expect(screen.getByText('+12')).toBeInTheDocument();
    expect(screen.getByText('+8')).toBeInTheDocument();
    expect(screen.getByText('+10')).toBeInTheDocument();
  });

  it('should show progress notifications', () => {
    const progressWithNotifications = {
      ...mockProgressData,
      notifications: [
        {
          id: 'notif-1',
          type: 'achievement',
          message: 'Congratulations! You completed Module 1 with an A grade.',
          date: '2024-02-15',
        },
      ],
    };
    
    render(<StudentProgressTracking {...defaultProps} progressData={progressWithNotifications} />);
    
    expect(screen.getByText(/congratulations/i)).toBeInTheDocument();
  });

  it('should display course timeline', () => {
    render(<StudentProgressTracking {...defaultProps} showTimeline={true} />);
    
    expect(screen.getByTestId('course-timeline')).toBeInTheDocument();
  });

  it('should handle goal setting', () => {
    const mockOnGoalSet = jest.fn();
    render(<StudentProgressTracking {...defaultProps} onGoalSet={mockOnGoalSet} />);
    
    const setGoalButton = screen.getAllByText('Set Goal')[0];
    fireEvent.click(setGoalButton);
    
    expect(mockOnGoalSet).toHaveBeenCalled();
  });

  it('should show progress comparison', () => {
    render(<StudentProgressTracking {...defaultProps} showComparison={true} />);
    
    expect(screen.getByText(/class average/i)).toBeInTheDocument();
  });

  it('should display study recommendations', () => {
    render(<StudentProgressTracking {...defaultProps} />);
    
    expect(screen.getByText(/recommendations/i)).toBeInTheDocument();
  });

  it('should handle responsive layout', () => {
    render(<StudentProgressTracking {...defaultProps} />);
    
    const progressContainer = screen.getByTestId('progress-container');
    expect(progressContainer).toHaveClass('responsive-layout');
  });

  it('should support date range filtering', () => {
    const mockOnDateRangeChange = jest.fn();
    render(<StudentProgressTracking {...defaultProps} onDateRangeChange={mockOnDateRangeChange} />);
    
    const dateRangeButton = screen.getByText(/date range/i);
    fireEvent.click(dateRangeButton);
    
    expect(mockOnDateRangeChange).toHaveBeenCalled();
  });

  it('should display progress badges', () => {
    render(<StudentProgressTracking {...defaultProps} />);
    
    expect(screen.getByText(/progress badges/i)).toBeInTheDocument();
  });

  it('should show detailed module information', () => {
    render(<StudentProgressTracking {...defaultProps} />);
    
    const expandButton = screen.getAllByTestId('expand-module')[0];
    fireEvent.click(expandButton);
    
    expect(screen.getByText('Module Details')).toBeInTheDocument();
  });

  it('should handle progress milestone indicators', () => {
    render(<StudentProgressTracking {...defaultProps} />);
    
    expect(screen.getByText('Milestone Progress')).toBeInTheDocument();
  });

  it('should display interactive progress bars', () => {
    render(<StudentProgressTracking {...defaultProps} />);
    
    const progressBars = screen.getAllByTestId('progress-bar');
    expect(progressBars.length).toBeGreaterThan(0);
  });
});