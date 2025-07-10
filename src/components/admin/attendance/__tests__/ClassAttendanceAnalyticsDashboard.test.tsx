import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ClassAttendanceAnalyticsDashboard } from '../ClassAttendanceAnalyticsDashboard';
import { classAttendanceAnalyticsService } from '@/lib/services/class-attendance-analytics-service';
import { ClassAttendanceAnalytics } from '@/types/attendance';

// Mock the service
jest.mock('@/lib/services/class-attendance-analytics-service');

const mockService = classAttendanceAnalyticsService as jest.Mocked<typeof classAttendanceAnalyticsService>;

// Mock chart components
jest.mock('@/components/ui/charts/LineChart', () => ({
  LineChart: ({ data, series }: any) => (
    <div data-testid="line-chart">
      LineChart with {data?.length || 0} points and {series?.length || 0} series
    </div>
  )
}));

jest.mock('@/components/ui/charts/BarChart', () => ({
  BarChart: ({ data, series }: any) => (
    <div data-testid="bar-chart">
      BarChart with {data?.length || 0} items and {series?.length || 0} series
    </div>
  )
}));

jest.mock('@/components/ui/charts/RadarChart', () => ({
  RadarChart: ({ data, series }: any) => (
    <div data-testid="radar-chart">
      RadarChart with {data?.length || 0} points and {series?.length || 0} series
    </div>
  )
}));

jest.mock('@/components/ui/charts/PieChart', () => ({
  PieChart: ({ data }: any) => (
    <div data-testid="pie-chart">
      PieChart with {data?.length || 0} segments
    </div>
  )
}));

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
    averageAttendanceRate: 85.5,
    attendanceConsistency: 78.2,
    peakAttendanceRate: 95.0,
    lowestAttendanceRate: 65.0,
    attendanceByDayOfWeek: [
      {
        dayOfWeek: 'Monday',
        attendanceRate: 88.0,
        totalSessions: 5,
        averageStudents: 12
      },
      {
        dayOfWeek: 'Wednesday',
        attendanceRate: 92.0,
        totalSessions: 5,
        averageStudents: 13
      },
      {
        dayOfWeek: 'Friday',
        attendanceRate: 78.0,
        totalSessions: 5,
        averageStudents: 11
      }
    ],
    attendanceByTimeSlot: [
      {
        timeSlot: 'Morning (09:00-11:59)',
        attendanceRate: 90.0,
        totalSessions: 10,
        energyLevel: 8.5
      },
      {
        timeSlot: 'Afternoon (14:00-16:59)',
        attendanceRate: 81.0,
        totalSessions: 10,
        energyLevel: 7.2
      }
    ],
    studentRetentionRate: 95.0,
    chronicallyAbsentStudents: 2,
    improvingStudents: 5,
    decliningStudents: 1
  },
  trends: [
    {
      metric: 'attendance_rate',
      timeframe: '90_days',
      trend: 'increasing',
      changeRate: 5.2,
      confidence: 0.85,
      dataPoints: [
        { date: '2024-01-01', value: 80 },
        { date: '2024-01-08', value: 82 },
        { date: '2024-01-15', value: 85 },
        { date: '2024-01-22', value: 88 }
      ]
    }
  ],
  predictions: [
    {
      metric: 'attendance_rate',
      predictedValue: 87.5,
      targetDate: '2024-02-15',
      confidence: 0.78,
      factors: [
        {
          factor: 'Historical Trend',
          impact: 0.6,
          description: 'Consistent upward trend in attendance'
        }
      ],
      riskLevel: 'low'
    }
  ],
  comparisons: [
    {
      comparedWithClass: {
        id: 'class-2',
        name: 'English Basic A2',
        courseType: 'Basic'
      },
      attendanceRateDifference: 3.2,
      significanceLevel: 0.9,
      similarityScore: 0.75,
      keyDifferences: ['Better morning attendance rates'],
      bestPractices: ['Consistent scheduling', 'Engaging morning activities']
    }
  ],
  performanceImpact: {
    correlationWithGrades: 0.72,
    correlationWithEngagement: 0.68,
    correlationWithCompletion: 0.81,
    attendanceThresholds: {
      excellentPerformance: 90,
      averagePerformance: 75,
      atRiskThreshold: 60
    },
    impactFactors: [
      {
        factor: 'Consistent Attendance',
        impact: 'positive',
        strength: 0.8,
        description: 'Regular attendance strongly correlates with performance'
      }
    ]
  },
  recommendations: [
    {
      type: 'engagement_improvement',
      priority: 'medium',
      title: 'Enhance Friday Engagement',
      description: 'Friday sessions show lower attendance rates',
      expectedImpact: 0.6,
      implementationEffort: 'medium',
      actions: [
        {
          action: 'implement_friday_activities',
          assignedTo: 'teacher',
          deadline: '2024-02-01',
          parameters: { classId: 'class-1' }
        }
      ]
    }
  ],
  lastUpdated: '2024-01-15T10:00:00Z'
};

describe('ClassAttendanceAnalyticsDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockService.getClassAttendanceAnalytics.mockResolvedValue(mockAnalyticsData);
  });

  it('renders dashboard with class information', async () => {
    render(<ClassAttendanceAnalyticsDashboard classId="class-1" />);

    await waitFor(() => {
      expect(screen.getByText('English Basic A1 - Attendance Analytics')).toBeInTheDocument();
      expect(screen.getByText(/Basic.*Last updated/)).toBeInTheDocument();
    });
  });

  it('displays key metrics correctly', async () => {
    render(<ClassAttendanceAnalyticsDashboard classId="class-1" />);

    await waitFor(() => {
      expect(screen.getByText('85.5%')).toBeInTheDocument(); // Attendance rate
      expect(screen.getByText('78%')).toBeInTheDocument(); // Consistency score
      expect(screen.getByText('20')).toBeInTheDocument(); // Total sessions
      expect(screen.getByText('2')).toBeInTheDocument(); // At-risk students
    });
  });

  it('renders all chart components in overview tab', async () => {
    render(<ClassAttendanceAnalyticsDashboard classId="class-1" />);

    await waitFor(() => {
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      expect(screen.getByTestId('radar-chart')).toBeInTheDocument();
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });
  });

  it('switches between tabs correctly', async () => {
    render(<ClassAttendanceAnalyticsDashboard classId="class-1" />);

    await waitFor(() => {
      expect(screen.getByText('Attendance by Day of Week')).toBeInTheDocument();
    });

    // Click on trends tab
    fireEvent.click(screen.getByText('Trends'));

    await waitFor(() => {
      expect(screen.getByText('Attendance Trends Over Time')).toBeInTheDocument();
    });

    // Click on predictions tab
    fireEvent.click(screen.getByText('Predictions'));

    await waitFor(() => {
      expect(screen.getByText('ATTENDANCE_RATE')).toBeInTheDocument();
      expect(screen.getByText('87.5%')).toBeInTheDocument();
    });
  });

  it('displays trends with correct trend indicators', async () => {
    render(<ClassAttendanceAnalyticsDashboard classId="class-1" />);

    fireEvent.click(screen.getByText('Trends'));

    await waitFor(() => {
      expect(screen.getByText('Attendance Rate')).toBeInTheDocument();
      expect(screen.getByText('+5.2%')).toBeInTheDocument();
      expect(screen.getByText('Confidence: 85%')).toBeInTheDocument();
    });
  });

  it('shows predictions with risk levels', async () => {
    render(<ClassAttendanceAnalyticsDashboard classId="class-1" />);

    fireEvent.click(screen.getByText('Predictions'));

    await waitFor(() => {
      expect(screen.getByText('87.5%')).toBeInTheDocument();
      expect(screen.getByText('low risk')).toBeInTheDocument();
      expect(screen.getByText('Confidence')).toBeInTheDocument();
      expect(screen.getByText('78%')).toBeInTheDocument();
    });
  });

  it('displays class comparisons', async () => {
    render(<ClassAttendanceAnalyticsDashboard classId="class-1" />);

    fireEvent.click(screen.getByText('Comparisons'));

    await waitFor(() => {
      expect(screen.getByText('Comparison with English Basic A2')).toBeInTheDocument();
      expect(screen.getByText('+3.2%')).toBeInTheDocument();
      expect(screen.getByText('Better morning attendance rates')).toBeInTheDocument();
      expect(screen.getByText('Consistent scheduling')).toBeInTheDocument();
    });
  });

  it('shows recommendations with priority levels', async () => {
    render(<ClassAttendanceAnalyticsDashboard classId="class-1" />);

    fireEvent.click(screen.getByText('Actions'));

    await waitFor(() => {
      expect(screen.getByText('Enhance Friday Engagement')).toBeInTheDocument();
      expect(screen.getByText('engagement improvement')).toBeInTheDocument();
      expect(screen.getByText('Expected Impact:')).toBeInTheDocument();
      expect(screen.getByText('60%')).toBeInTheDocument();
    });
  });

  it('handles timeframe changes', async () => {
    render(<ClassAttendanceAnalyticsDashboard classId="class-1" />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Last 90 days')).toBeInTheDocument();
    });

    // Change timeframe
    const select = screen.getByDisplayValue('Last 90 days');
    fireEvent.click(select);
    fireEvent.click(screen.getByText('Last 30 days'));

    await waitFor(() => {
      expect(mockService.getClassAttendanceAnalytics).toHaveBeenCalledWith(
        'class-1',
        '30_days',
        false
      );
    });
  });

  it('handles refresh action', async () => {
    render(<ClassAttendanceAnalyticsDashboard classId="class-1" />);

    await waitFor(() => {
      expect(screen.getByText('English Basic A1 - Attendance Analytics')).toBeInTheDocument();
    });

    // Click refresh button
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockService.getClassAttendanceAnalytics).toHaveBeenCalledWith(
        'class-1',
        '90_days',
        true
      );
    });
  });

  it('displays loading state', () => {
    mockService.getClassAttendanceAnalytics.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockAnalyticsData), 1000))
    );

    render(<ClassAttendanceAnalyticsDashboard classId="class-1" />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('handles service errors', async () => {
    const errorMessage = 'Failed to load analytics data';
    mockService.getClassAttendanceAnalytics.mockRejectedValue(new Error(errorMessage));

    render(<ClassAttendanceAnalyticsDashboard classId="class-1" />);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('shows performance impact analysis correctly', async () => {
    render(<ClassAttendanceAnalyticsDashboard classId="class-1" />);

    await waitFor(() => {
      expect(screen.getByText('Performance Impact Analysis')).toBeInTheDocument();
      expect(screen.getByText('Correlation with Grades')).toBeInTheDocument();
      expect(screen.getByText('72%')).toBeInTheDocument();
      expect(screen.getByText('Excellent Performance:')).toBeInTheDocument();
      expect(screen.getByText('90%+')).toBeInTheDocument();
    });
  });

  it('renders day of week analysis chart', async () => {
    render(<ClassAttendanceAnalyticsDashboard classId="class-1" />);

    await waitFor(() => {
      const barChart = screen.getByTestId('bar-chart');
      expect(barChart).toBeInTheDocument();
      expect(barChart).toHaveTextContent('BarChart with 3 items and 1 series');
    });
  });

  it('handles empty comparisons gracefully', async () => {
    const dataWithoutComparisons = {
      ...mockAnalyticsData,
      comparisons: []
    };

    mockService.getClassAttendanceAnalytics.mockResolvedValue(dataWithoutComparisons);

    render(<ClassAttendanceAnalyticsDashboard classId="class-1" />);

    fireEvent.click(screen.getByText('Comparisons'));

    await waitFor(() => {
      expect(screen.getByText('No Comparison Data Available')).toBeInTheDocument();
      expect(screen.getByText('No similar classes found for comparison analysis.')).toBeInTheDocument();
    });
  });

  it('handles empty recommendations gracefully', async () => {
    const dataWithoutRecommendations = {
      ...mockAnalyticsData,
      recommendations: []
    };

    mockService.getClassAttendanceAnalytics.mockResolvedValue(dataWithoutRecommendations);

    render(<ClassAttendanceAnalyticsDashboard classId="class-1" />);

    fireEvent.click(screen.getByText('Actions'));

    await waitFor(() => {
      expect(screen.getByText('No Action Items Required')).toBeInTheDocument();
      expect(screen.getByText('Class attendance is performing well. No immediate recommendations.')).toBeInTheDocument();
    });
  });

  it('exports data when export button is clicked', async () => {
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

    render(<ClassAttendanceAnalyticsDashboard classId="class-1" />);

    await waitFor(() => {
      expect(screen.getByText('English Basic A1 - Attendance Analytics')).toBeInTheDocument();
    });

    // Click export button
    const exportButton = screen.getByRole('button', { name: /download/i });
    fireEvent.click(exportButton);

    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockClick).toHaveBeenCalled();
    expect(mockAppendChild).toHaveBeenCalled();
    expect(mockRemoveChild).toHaveBeenCalled();
  });

  it('calculates chart data correctly', async () => {
    render(<ClassAttendanceAnalyticsDashboard classId="class-1" />);

    await waitFor(() => {
      // Check that charts receive the correct data structure
      const barChart = screen.getByTestId('bar-chart');
      const radarChart = screen.getByTestId('radar-chart');
      const pieChart = screen.getByTestId('pie-chart');

      expect(barChart).toHaveTextContent('3 items'); // 3 days of week
      expect(radarChart).toHaveTextContent('2 points'); // 2 time slots
      expect(pieChart).toHaveTextContent('2 segments'); // Present/Absent
    });
  });

  it('shows correct student analytics', async () => {
    render(<ClassAttendanceAnalyticsDashboard classId="class-1" />);

    await waitFor(() => {
      expect(screen.getByText('↗ 5 improving')).toBeInTheDocument();
      expect(screen.getByText('↘ 1 declining')).toBeInTheDocument();
    });
  });

  it('displays peak and low attendance rates', async () => {
    render(<ClassAttendanceAnalyticsDashboard classId="class-1" />);

    await waitFor(() => {
      expect(screen.getByText('Peak: 95.0% • Low: 65.0%')).toBeInTheDocument();
    });
  });

  it('handles different course types in display', async () => {
    const businessEnglishData = {
      ...mockAnalyticsData,
      courseType: 'Business English',
      className: 'Business English Advanced'
    };

    mockService.getClassAttendanceAnalytics.mockResolvedValue(businessEnglishData);

    render(<ClassAttendanceAnalyticsDashboard classId="class-1" />);

    await waitFor(() => {
      expect(screen.getByText('Business English Advanced - Attendance Analytics')).toBeInTheDocument();
      expect(screen.getByText(/Business English.*Last updated/)).toBeInTheDocument();
    });
  });
});