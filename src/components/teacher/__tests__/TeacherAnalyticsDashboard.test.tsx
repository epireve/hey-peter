import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TeacherAnalyticsDashboard } from '../TeacherAnalyticsDashboard';
import { startOfMonth, endOfMonth, format } from 'date-fns';

// Mock the icons
jest.mock('lucide-react', () => ({
  Calendar: () => <div data-testid="calendar-icon">Calendar</div>,
  TrendingUp: () => <div data-testid="trending-up-icon">TrendingUp</div>,
  TrendingDown: () => <div data-testid="trending-down-icon">TrendingDown</div>,
  Users: () => <div data-testid="users-icon">Users</div>,
  Clock: () => <div data-testid="clock-icon">Clock</div>,
  Star: () => <div data-testid="star-icon">Star</div>,
  BookOpen: () => <div data-testid="book-icon">BookOpen</div>,
  Award: () => <div data-testid="award-icon">Award</div>,
  AlertCircle: () => <div data-testid="alert-icon">AlertCircle</div>,
  Download: () => <div data-testid="download-icon">Download</div>,
  RefreshCw: () => <div data-testid="refresh-icon">RefreshCw</div>,
  ChevronDown: () => <div data-testid="chevron-icon">ChevronDown</div>,
  ChevronUp: () => <div data-testid="chevron-up-icon">ChevronUp</div>,
  BarChart: () => <div data-testid="bar-chart-icon">BarChart</div>,
  PieChart: () => <div data-testid="pie-chart-icon">PieChart</div>,
  Filter: () => <div data-testid="filter-icon">Filter</div>,
  Check: () => <div data-testid="check-icon">Check</div>,
}));

// Mock data
const mockAnalyticsData = {
  overview: {
    totalStudents: 45,
    totalHours: 180,
    averageRating: 4.7,
    completionRate: 92.5,
    monthlyGrowth: {
      students: 15.5,
      hours: 22.3,
      rating: 2.1,
    },
  },
  performance: {
    weeklyHours: [
      { week: 'Week 1', hours: 40, target: 35 },
      { week: 'Week 2', hours: 42, target: 35 },
      { week: 'Week 3', hours: 38, target: 35 },
      { week: 'Week 4', hours: 45, target: 35 },
    ],
    studentProgress: [
      { level: 'Beginner', count: 12, avgProgress: 75 },
      { level: 'Intermediate', count: 20, avgProgress: 85 },
      { level: 'Advanced', count: 13, avgProgress: 90 },
    ],
    classRatings: [
      { className: 'English Basics', rating: 4.8, students: 15 },
      { className: 'Business English', rating: 4.6, students: 12 },
      { className: 'Everyday English A', rating: 4.7, students: 10 },
      { className: 'Everyday English B', rating: 4.9, students: 8 },
    ],
  },
  students: {
    activeStudents: 42,
    newStudents: 5,
    completedCourses: 8,
    upcomingGraduations: 3,
    retentionRate: 88.5,
    satisfactionScore: 4.7,
    topPerformers: [
      { id: '1', name: 'John Doe', progress: 95, attendance: 100 },
      { id: '2', name: 'Jane Smith', progress: 92, attendance: 98 },
      { id: '3', name: 'Mike Johnson', progress: 90, attendance: 95 },
    ],
    strugglingStudents: [
      { id: '4', name: 'Tom Brown', progress: 45, attendance: 70, issues: ['Low attendance', 'Missing assignments'] },
      { id: '5', name: 'Sarah Davis', progress: 50, attendance: 75, issues: ['Language barrier'] },
    ],
  },
  trends: {
    hoursTrend: [
      { month: 'Jan', hours: 160 },
      { month: 'Feb', hours: 175 },
      { month: 'Mar', hours: 180 },
    ],
    ratingTrend: [
      { month: 'Jan', rating: 4.5 },
      { month: 'Feb', rating: 4.6 },
      { month: 'Mar', rating: 4.7 },
    ],
    studentCountTrend: [
      { month: 'Jan', count: 35 },
      { month: 'Feb', count: 40 },
      { month: 'Mar', count: 45 },
    ],
  },
};

describe('TeacherAnalyticsDashboard', () => {
  const defaultProps = {
    teacherId: 'teacher-123',
    analyticsData: mockAnalyticsData,
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state', () => {
    render(<TeacherAnalyticsDashboard {...defaultProps} isLoading={true} analyticsData={undefined} />);
    
    expect(screen.getByTestId('analytics-loading')).toBeInTheDocument();
  });

  it('should render empty state when no data', () => {
    render(<TeacherAnalyticsDashboard {...defaultProps} analyticsData={undefined} />);
    
    expect(screen.getByText(/no analytics data available/i)).toBeInTheDocument();
  });

  it('should display overview metrics', () => {
    render(<TeacherAnalyticsDashboard {...defaultProps} />);
    
    expect(screen.getByText('Total Students')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('+15.5%')).toBeInTheDocument();
    
    expect(screen.getByText('Teaching Hours')).toBeInTheDocument();
    expect(screen.getByText('180')).toBeInTheDocument();
    expect(screen.getByText('+22.3%')).toBeInTheDocument();
    
    expect(screen.getByText('Average Rating')).toBeInTheDocument();
    expect(screen.getAllByText('4.7')[0]).toBeInTheDocument();
    
    expect(screen.getByText('Completion Rate')).toBeInTheDocument();
    expect(screen.getByText('92.5%')).toBeInTheDocument();
  });

  it('should display performance charts', () => {
    render(<TeacherAnalyticsDashboard {...defaultProps} />);
    
    expect(screen.getByText('Weekly Hours Performance')).toBeInTheDocument();
    expect(screen.getByText('Student Progress by Level')).toBeInTheDocument();
    expect(screen.getByText('Class Ratings')).toBeInTheDocument();
  });

  it('should display student insights', () => {
    render(<TeacherAnalyticsDashboard {...defaultProps} />);
    
    expect(screen.getByText('Student Insights')).toBeInTheDocument();
    expect(screen.getByText('Active Students')).toBeInTheDocument();
    expect(screen.getAllByText('42')[0]).toBeInTheDocument();
    
    expect(screen.getByText('Retention Rate')).toBeInTheDocument();
    expect(screen.getByText('88.5%')).toBeInTheDocument();
    
    expect(screen.getByText('Top Performers')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText(/95% progress/)).toBeInTheDocument();
  });

  it('should display students needing attention', () => {
    render(<TeacherAnalyticsDashboard {...defaultProps} />);
    
    expect(screen.getByText('Students Needing Attention')).toBeInTheDocument();
    expect(screen.getByText('Tom Brown')).toBeInTheDocument();
    expect(screen.getByText('Low attendance')).toBeInTheDocument();
    expect(screen.getByText('Missing assignments')).toBeInTheDocument();
  });

  it('should handle date range selection', async () => {
    const onDateRangeChange = jest.fn();
    render(<TeacherAnalyticsDashboard {...defaultProps} onDateRangeChange={onDateRangeChange} />);
    
    const dateRangeButton = screen.getAllByRole('combobox')[0];
    fireEvent.click(dateRangeButton);
    
    const thisMonthOption = screen.getByRole('option', { name: 'This Month' });
    fireEvent.click(thisMonthOption);
    
    await waitFor(() => {
      expect(onDateRangeChange).toHaveBeenCalledWith({
        from: expect.any(Date),
        to: expect.any(Date),
      });
    });
  });

  it.skip('should toggle between different chart views', async () => {
    render(<TeacherAnalyticsDashboard {...defaultProps} />);
    
    const chartToggle = screen.getByRole('tab', { name: /trends/i });
    fireEvent.click(chartToggle);
    
    await waitFor(() => {
      expect(screen.getByText('Historical Trends')).toBeInTheDocument();
    });
    expect(screen.getByText(/Teaching Hours Trend/)).toBeInTheDocument();
  });

  it('should export analytics report', () => {
    const onExport = jest.fn();
    render(<TeacherAnalyticsDashboard {...defaultProps} onExport={onExport} />);
    
    const exportButton = screen.getByRole('button', { name: /export report/i });
    fireEvent.click(exportButton);
    
    expect(onExport).toHaveBeenCalledWith({
      format: 'pdf',
      data: mockAnalyticsData,
      dateRange: expect.any(Object),
    });
  });

  it('should refresh analytics data', () => {
    const onRefresh = jest.fn();
    render(<TeacherAnalyticsDashboard {...defaultProps} onRefresh={onRefresh} />);
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);
    
    expect(onRefresh).toHaveBeenCalled();
  });

  it('should display trend indicators correctly', () => {
    render(<TeacherAnalyticsDashboard {...defaultProps} />);
    
    // Positive trends
    const upIndicators = screen.getAllByTestId('trending-up-icon');
    expect(upIndicators.length).toBeGreaterThan(0);
    
    // Check for specific trend values
    expect(screen.getByText('+15.5%')).toBeInTheDocument();
    expect(screen.getByText('+22.3%')).toBeInTheDocument();
  });

  it('should handle error state', () => {
    render(<TeacherAnalyticsDashboard {...defaultProps} error="Failed to load analytics" />);
    
    expect(screen.getByText(/failed to load analytics/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('should display class distribution', () => {
    render(<TeacherAnalyticsDashboard {...defaultProps} />);
    
    expect(screen.getByText('English Basics')).toBeInTheDocument();
    expect(screen.getByText('15 students')).toBeInTheDocument();
    expect(screen.getByText('4.8')).toBeInTheDocument();
  });

  it('should show goals and achievements', () => {
    render(<TeacherAnalyticsDashboard {...defaultProps} showGoals={true} />);
    
    expect(screen.getByText('Goals & Achievements')).toBeInTheDocument();
    expect(screen.getByText(/monthly teaching hours goal/i)).toBeInTheDocument();
  });

  it('should filter analytics by class type', () => {
    render(<TeacherAnalyticsDashboard {...defaultProps} />);
    
    const filterButton = screen.getAllByRole('combobox')[1];
    fireEvent.click(filterButton);
    
    const businessOption = screen.getByRole('option', { name: 'Business English' });
    fireEvent.click(businessOption);
    
    // Should update the displayed data
    expect(screen.getAllByText('Business English').length).toBeGreaterThan(0);
  });

  it('should display upcoming graduations alert', () => {
    render(<TeacherAnalyticsDashboard {...defaultProps} />);
    
    expect(screen.getByText(/3 students graduating soon/i)).toBeInTheDocument();
  });

  it('should show performance comparison', () => {
    render(<TeacherAnalyticsDashboard {...defaultProps} showComparison={true} />);
    
    expect(screen.getByText('Performance Comparison')).toBeInTheDocument();
    expect(screen.getByText(/vs. last month/i)).toBeInTheDocument();
  });

  it('should display student feedback summary', () => {
    render(<TeacherAnalyticsDashboard {...defaultProps} showFeedback={true} />);
    
    expect(screen.getByText('Recent Student Feedback')).toBeInTheDocument();
    expect(screen.getByText('Satisfaction Score')).toBeInTheDocument();
    expect(screen.getAllByText('4.7').length).toBeGreaterThan(0);
  });

  it('should handle custom date ranges', async () => {
    const onDateRangeChange = jest.fn();
    render(<TeacherAnalyticsDashboard {...defaultProps} onDateRangeChange={onDateRangeChange} />);
    
    const dateRangeButton = screen.getAllByRole('combobox')[0];
    fireEvent.click(dateRangeButton);
    
    const lastMonthOption = screen.getByRole('option', { name: 'Last Month' });
    fireEvent.click(lastMonthOption);
    
    await waitFor(() => {
      expect(onDateRangeChange).toHaveBeenCalled();
    });
  });
});