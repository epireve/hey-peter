import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AttendanceComparisonDashboard } from '../AttendanceComparisonDashboard';
import { attendanceAnalyticsService } from '@/lib/services/attendance-analytics-service';
import { classAttendanceAnalyticsService } from '@/lib/services/class-attendance-analytics-service';
import { AttendanceClassSummary, ClassAttendanceAnalytics } from '@/types/attendance';

// Mock the services
jest.mock('@/lib/services/attendance-analytics-service');
jest.mock('@/lib/services/class-attendance-analytics-service');

const mockAttendanceService = attendanceAnalyticsService as jest.Mocked<typeof attendanceAnalyticsService>;
const mockClassAnalyticsService = classAttendanceAnalyticsService as jest.Mocked<typeof classAttendanceAnalyticsService>;

// Mock chart components
jest.mock('@/components/ui/charts/BarChart', () => ({
  BarChart: ({ data, series }: any) => (
    <div data-testid="bar-chart">
      BarChart with {data?.length || 0} items and {series?.length || 0} series
    </div>
  )
}));

jest.mock('@/components/ui/charts/ScatterChart', () => ({
  ScatterChart: ({ data }: any) => (
    <div data-testid="scatter-chart">
      ScatterChart with {data?.length || 0} points
    </div>
  )
}));

// Mock MultiSelect component
jest.mock('@/components/ui/multi-select', () => ({
  MultiSelect: ({ options, value, onValueChange, placeholder }: any) => (
    <div data-testid="multi-select">
      <input
        placeholder={placeholder}
        value={value.join(', ')}
        onChange={(e) => onValueChange(e.target.value.split(', ').filter(Boolean))}
      />
      {options.map((option: any) => (
        <div key={option.value} data-testid={`option-${option.value}`}>
          {option.label}
        </div>
      ))}
    </div>
  )
}));

const mockClassSummaries: AttendanceClassSummary[] = [
  {
    classId: 'class-1',
    className: 'English Basic A1',
    courseType: 'Basic',
    teacher: {
      id: 'teacher-1',
      fullName: 'John Doe'
    },
    totalSessions: 20,
    attendedSessions: 17,
    absentSessions: 2,
    lateSessions: 1,
    excusedSessions: 0,
    attendanceRate: 85.0,
    averageHoursDeducted: 0.15,
    students: [
      {
        studentId: 'student-1',
        fullName: 'Alice Smith',
        attendanceRate: 90.0,
        totalSessions: 10,
        attendedSessions: 9
      },
      {
        studentId: 'student-2',
        fullName: 'Bob Johnson',
        attendanceRate: 80.0,
        totalSessions: 10,
        attendedSessions: 8
      }
    ]
  },
  {
    classId: 'class-2',
    className: 'English Basic A2',
    courseType: 'Basic',
    teacher: {
      id: 'teacher-2',
      fullName: 'Jane Smith'
    },
    totalSessions: 18,
    attendedSessions: 15,
    absentSessions: 3,
    lateSessions: 0,
    excusedSessions: 0,
    attendanceRate: 83.3,
    averageHoursDeducted: 0.22,
    students: [
      {
        studentId: 'student-3',
        fullName: 'Carol Davis',
        attendanceRate: 85.0,
        totalSessions: 9,
        attendedSessions: 8
      }
    ]
  },
  {
    classId: 'class-3',
    className: 'Business English B2',
    courseType: 'Business English',
    teacher: {
      id: 'teacher-1',
      fullName: 'John Doe'
    },
    totalSessions: 15,
    attendedSessions: 14,
    absentSessions: 1,
    lateSessions: 0,
    excusedSessions: 0,
    attendanceRate: 93.3,
    averageHoursDeducted: 0.07,
    students: [
      {
        studentId: 'student-4',
        fullName: 'David Wilson',
        attendanceRate: 95.0,
        totalSessions: 8,
        attendedSessions: 8
      }
    ]
  }
];

const mockAnalyticsData: ClassAttendanceAnalytics = {
  classId: 'class-1',
  className: 'English Basic A1',
  courseType: 'Basic',
  teacher: {
    id: 'teacher-1',
    fullName: 'John Doe'
  },
  attendanceMetrics: {
    totalSessions: 20,
    averageAttendanceRate: 85.0,
    attendanceConsistency: 75.0,
    peakAttendanceRate: 95.0,
    lowestAttendanceRate: 65.0,
    attendanceByDayOfWeek: [],
    attendanceByTimeSlot: [],
    studentRetentionRate: 95.0,
    chronicallyAbsentStudents: 2,
    improvingStudents: 5,
    decliningStudents: 1
  },
  trends: [],
  predictions: [],
  comparisons: [],
  performanceImpact: {
    correlationWithGrades: 0.7,
    correlationWithEngagement: 0.6,
    correlationWithCompletion: 0.8,
    attendanceThresholds: {
      excellentPerformance: 90,
      averagePerformance: 75,
      atRiskThreshold: 60
    },
    impactFactors: []
  },
  recommendations: [],
  lastUpdated: '2024-01-15T10:00:00Z'
};

describe('AttendanceComparisonDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAttendanceService.getAttendanceByClass.mockResolvedValue(mockClassSummaries);
    mockClassAnalyticsService.getClassAttendanceAnalytics.mockResolvedValue(mockAnalyticsData);
  });

  it('renders dashboard with title and controls', async () => {
    render(<AttendanceComparisonDashboard />);

    expect(screen.getByText('Attendance Comparison Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Compare attendance performance across classes')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('Last 90 days')).toBeInTheDocument();
      expect(screen.getByDisplayValue('All Course Types')).toBeInTheDocument();
    });
  });

  it('displays loading state initially', () => {
    // Mock pending promise
    mockAttendanceService.getAttendanceByClass.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockClassSummaries), 1000))
    );

    render(<AttendanceComparisonDashboard />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('loads and displays class data', async () => {
    render(<AttendanceComparisonDashboard />);

    await waitFor(() => {
      expect(screen.getByText('87.2%')).toBeInTheDocument(); // Average attendance
      expect(screen.getByText('53')).toBeInTheDocument(); // Total sessions
      expect(screen.getByText('3')).toBeInTheDocument(); // Total classes
    });
  });

  it('displays overview statistics correctly', async () => {
    render(<AttendanceComparisonDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Average Attendance')).toBeInTheDocument();
      expect(screen.getByText('Average Consistency')).toBeInTheDocument();
      expect(screen.getByText('Total Sessions')).toBeInTheDocument();
      expect(screen.getByText('At-Risk Students')).toBeInTheDocument();
    });
  });

  it('renders chart components', async () => {
    render(<AttendanceComparisonDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      expect(screen.getByTestId('scatter-chart')).toBeInTheDocument();
    });
  });

  it('displays detailed class table', async () => {
    render(<AttendanceComparisonDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Detailed Class Performance')).toBeInTheDocument();
      expect(screen.getByText('English Basic A1')).toBeInTheDocument();
      expect(screen.getByText('English Basic A2')).toBeInTheDocument();
      expect(screen.getByText('Business English B2')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('handles timeframe filter changes', async () => {
    render(<AttendanceComparisonDashboard />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Last 90 days')).toBeInTheDocument();
    });

    // Change timeframe
    const select = screen.getByDisplayValue('Last 90 days');
    fireEvent.click(select);
    fireEvent.click(screen.getByText('Last 30 days'));

    await waitFor(() => {
      expect(mockAttendanceService.getAttendanceByClass).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date)
        })
      );
    });
  });

  it('handles course type filter changes', async () => {
    render(<AttendanceComparisonDashboard />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('All Course Types')).toBeInTheDocument();
    });

    // Change course type filter
    const select = screen.getByDisplayValue('All Course Types');
    fireEvent.click(select);
    fireEvent.click(screen.getByText('Basic'));

    await waitFor(() => {
      expect(mockAttendanceService.getAttendanceByClass).toHaveBeenCalledWith(
        expect.objectContaining({
          courseType: 'Basic'
        })
      );
    });
  });

  it('handles class selection via MultiSelect', async () => {
    render(<AttendanceComparisonDashboard />);

    await waitFor(() => {
      const multiSelect = screen.getByTestId('multi-select');
      expect(multiSelect).toBeInTheDocument();
    });

    // Check that class options are available
    expect(screen.getByTestId('option-class-1')).toBeInTheDocument();
    expect(screen.getByTestId('option-class-2')).toBeInTheDocument();
    expect(screen.getByTestId('option-class-3')).toBeInTheDocument();
  });

  it('sorts table data correctly', async () => {
    render(<AttendanceComparisonDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Detailed Class Performance')).toBeInTheDocument();
    });

    // Click on attendance column header to sort
    const attendanceHeader = screen.getByText('Attendance');
    fireEvent.click(attendanceHeader);

    // Should trigger re-sorting (Business English B2 should be first with 93.3%)
    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      // Business English B2 has highest attendance (93.3%)
      expect(rows[1]).toHaveTextContent('Business English B2');
    });
  });

  it('displays top performers correctly', async () => {
    render(<AttendanceComparisonDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Top Performers')).toBeInTheDocument();
      expect(screen.getByText('Best Attendance Rate')).toBeInTheDocument();
      expect(screen.getByText('Most Consistent')).toBeInTheDocument();
      expect(screen.getByText('93.3%')).toBeInTheDocument(); // Business English B2 rate
    });
  });

  it('handles export functionality', async () => {
    // Mock URL.createObjectURL and document.createElement
    const mockCreateObjectURL = jest.fn(() => 'blob:url');
    const mockClick = jest.fn();
    const mockAppendChild = jest.fn();
    const mockRemoveChild = jest.fn();
    
    global.URL.createObjectURL = mockCreateObjectURL;
    
    const mockAnchor = {
      href: '',
      download: '',
      click: mockClick
    };
    
    jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);
    jest.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild);
    jest.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild);

    render(<AttendanceComparisonDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Attendance Comparison Dashboard')).toBeInTheDocument();
    });

    // Click export button
    const exportButton = screen.getByRole('button', { name: /download/i });
    fireEvent.click(exportButton);

    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockClick).toHaveBeenCalled();
  });

  it('handles refresh functionality', async () => {
    render(<AttendanceComparisonDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Attendance Comparison Dashboard')).toBeInTheDocument();
    });

    // Clear previous calls
    mockAttendanceService.getAttendanceByClass.mockClear();

    // Click refresh button
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockAttendanceService.getAttendanceByClass).toHaveBeenCalled();
    });
  });

  it('displays progress bars for attendance rates', async () => {
    render(<AttendanceComparisonDashboard />);

    await waitFor(() => {
      const progressBars = screen.getAllByRole('progressbar');
      // Should have progress bars for overview statistics and table rows
      expect(progressBars.length).toBeGreaterThan(4);
    });
  });

  it('shows badges for course types', async () => {
    render(<AttendanceComparisonDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Basic')).toBeInTheDocument();
      expect(screen.getByText('Business English')).toBeInTheDocument();
    });
  });

  it('highlights selected classes in table', async () => {
    render(<AttendanceComparisonDashboard />);

    await waitFor(() => {
      // Auto-selected top 5 classes should be highlighted
      const tableRows = screen.getAllByRole('row');
      // Check that some rows have the selected class styling
      expect(tableRows.length).toBeGreaterThan(1);
    });
  });

  it('handles at-risk students display', async () => {
    render(<AttendanceComparisonDashboard />);

    await waitFor(() => {
      // Should show check marks or risk badges based on student data
      const checkIcons = screen.getAllByTestId(/check-circle|badge/);
      expect(checkIcons.length).toBeGreaterThan(0);
    });
  });

  it('filters by course type correctly', async () => {
    render(<AttendanceComparisonDashboard />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('English Basic A1')).toBeInTheDocument();
    });

    // Filter by Business English
    const courseTypeSelect = screen.getByDisplayValue('All Course Types');
    fireEvent.click(courseTypeSelect);
    fireEvent.click(screen.getByText('Business English'));

    await waitFor(() => {
      expect(mockAttendanceService.getAttendanceByClass).toHaveBeenCalledWith(
        expect.objectContaining({
          courseType: 'Business English'
        })
      );
    });
  });

  it('calculates average metrics correctly', async () => {
    render(<AttendanceComparisonDashboard />);

    await waitFor(() => {
      // Average of 85.0, 83.3, 93.3 = 87.2%
      expect(screen.getByText('87.2%')).toBeInTheDocument();
      
      // Total sessions: 20 + 18 + 15 = 53
      expect(screen.getByText('53')).toBeInTheDocument();
    });
  });

  it('handles service errors gracefully', async () => {
    const errorMessage = 'Failed to load comparison data';
    mockAttendanceService.getAttendanceByClass.mockRejectedValue(new Error(errorMessage));

    render(<AttendanceComparisonDashboard />);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('handles empty data gracefully', async () => {
    mockAttendanceService.getAttendanceByClass.mockResolvedValue([]);

    render(<AttendanceComparisonDashboard />);

    await waitFor(() => {
      // Should handle empty state without crashing
      expect(screen.getByText('Attendance Comparison Dashboard')).toBeInTheDocument();
    });
  });

  it('shows attendance vs consistency scatter plot data', async () => {
    render(<AttendanceComparisonDashboard />);

    await waitFor(() => {
      const scatterChart = screen.getByTestId('scatter-chart');
      expect(scatterChart).toBeInTheDocument();
      // Should have data points for all classes
      expect(scatterChart).toHaveTextContent('ScatterChart with 3 points');
    });
  });

  it('displays student performance trends chart', async () => {
    render(<AttendanceComparisonDashboard />);

    await waitFor(() => {
      // Should have a bar chart for student performance trends
      const barCharts = screen.getAllByTestId('bar-chart');
      expect(barCharts.length).toBeGreaterThan(1); // Multiple bar charts expected
    });
  });

  it('handles class analytics service failures gracefully', async () => {
    // Make one class analytics call fail
    mockClassAnalyticsService.getClassAttendanceAnalytics
      .mockResolvedValueOnce(mockAnalyticsData)
      .mockRejectedValueOnce(new Error('Analytics service error'))
      .mockResolvedValueOnce(mockAnalyticsData);

    render(<AttendanceComparisonDashboard />);

    await waitFor(() => {
      // Should still display data for classes that succeeded
      expect(screen.getByText('English Basic A1')).toBeInTheDocument();
      // Should use fallback data for failed analytics
      expect(screen.getByText('Attendance Comparison Dashboard')).toBeInTheDocument();
    });
  });

  describe('sorting functionality', () => {
    it('sorts by class name', async () => {
      render(<AttendanceComparisonDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Detailed Class Performance')).toBeInTheDocument();
      });

      const classNameHeader = screen.getByText('Class Name');
      fireEvent.click(classNameHeader);

      // Should sort alphabetically
      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        expect(rows[1]).toHaveTextContent('Business English B2'); // First alphabetically
      });
    });

    it('sorts by total sessions', async () => {
      render(<AttendanceComparisonDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Detailed Class Performance')).toBeInTheDocument();
      });

      const sessionsHeader = screen.getByText('Sessions');
      fireEvent.click(sessionsHeader);

      // Should sort by session count (descending by default)
      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        expect(rows[1]).toHaveTextContent('English Basic A1'); // Has 20 sessions (highest)
      });
    });
  });
});