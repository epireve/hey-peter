import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AttendancePredictiveAnalytics } from '../AttendancePredictiveAnalytics';
import { classAttendanceAnalyticsService } from '@/lib/services/class-attendance-analytics-service';
import { ClassAttendanceAnalytics, AttendancePatternAnalysis } from '@/types/attendance';

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

jest.mock('@/components/ui/charts/AreaChart', () => ({
  AreaChart: ({ data, series }: any) => (
    <div data-testid="area-chart">
      AreaChart with {data?.length || 0} points and {series?.length || 0} series
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
        },
        {
          factor: 'Seasonal Patterns',
          impact: 0.3,
          description: 'Winter attendance patterns observed'
        }
      ],
      riskLevel: 'low'
    },
    {
      metric: 'student_retention',
      predictedValue: 92.0,
      targetDate: '2024-02-15',
      confidence: 0.82,
      factors: [
        {
          factor: 'Retention Trend',
          impact: 0.7,
          description: 'Student retention has been stable'
        }
      ],
      riskLevel: 'medium'
    }
  ],
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

const mockPatternAnalysis: AttendancePatternAnalysis = {
  patterns: [
    {
      type: 'recurring',
      description: 'Consistent weekly attendance pattern',
      confidence: 0.85,
      frequency: 'weekly',
      impact: 'positive'
    },
    {
      type: 'seasonal',
      description: 'Lower attendance during winter months',
      confidence: 0.72,
      frequency: 'monthly',
      impact: 'negative'
    }
  ],
  anomalies: [
    {
      date: '2024-01-20',
      type: 'drop',
      severity: 'high',
      description: 'Unusually low attendance: 45.0%',
      possibleCauses: ['Weather conditions', 'Technical issues']
    },
    {
      date: '2024-01-25',
      type: 'spike',
      severity: 'medium',
      description: 'Unusually high attendance: 98.0%',
      possibleCauses: ['Special event', 'Makeup session']
    }
  ],
  insights: [
    {
      category: 'optimization',
      title: 'Optimal Time Slot Identified',
      description: 'Morning sessions show consistently higher attendance',
      dataPoints: ['Morning: 92% attendance', 'Afternoon: 78% attendance'],
      actionable: true
    },
    {
      category: 'warning',
      title: 'Winter Attendance Decline',
      description: 'Attendance drops by 10% during winter months',
      dataPoints: ['December: 75%', 'January: 72%', 'February: 70%'],
      actionable: true
    },
    {
      category: 'opportunity',
      title: 'High Engagement Potential',
      description: 'Students show strong attendance recovery patterns',
      dataPoints: ['Recovery rate: 85%', 'Average improvement: 15%'],
      actionable: false
    }
  ]
};

describe('AttendancePredictiveAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockService.getClassAttendanceAnalytics.mockResolvedValue(mockAnalyticsData);
    mockService.getAttendancePatternAnalysis.mockResolvedValue(mockPatternAnalysis);
  });

  it('renders dashboard with title and description', async () => {
    render(<AttendancePredictiveAnalytics classId="class-1" />);

    expect(screen.getByText('Predictive Attendance Analytics')).toBeInTheDocument();
    expect(screen.getByText('AI-powered attendance forecasting and pattern analysis')).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    mockService.getClassAttendanceAnalytics.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockAnalyticsData), 1000))
    );

    render(<AttendancePredictiveAnalytics classId="class-1" />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows prediction cards with key metrics', async () => {
    render(<AttendancePredictiveAnalytics classId="class-1" />);

    await waitFor(() => {
      expect(screen.getByText('ATTENDANCE_RATE')).toBeInTheDocument();
      expect(screen.getByText('87.5%')).toBeInTheDocument();
      expect(screen.getByText('STUDENT_RETENTION')).toBeInTheDocument();
      expect(screen.getByText('92.0%')).toBeInTheDocument();
    });
  });

  it('displays risk levels correctly', async () => {
    render(<AttendancePredictiveAnalytics classId="class-1" />);

    await waitFor(() => {
      expect(screen.getByText('low risk')).toBeInTheDocument();
      expect(screen.getByText('medium risk')).toBeInTheDocument();
    });
  });

  it('shows confidence percentages', async () => {
    render(<AttendancePredictiveAnalytics classId="class-1" />);

    await waitFor(() => {
      expect(screen.getByText('78%')).toBeInTheDocument(); // Attendance prediction confidence
      expect(screen.getByText('82%')).toBeInTheDocument(); // Retention prediction confidence
    });
  });

  it('switches between tabs correctly', async () => {
    render(<AttendancePredictiveAnalytics classId="class-1" />);

    await waitFor(() => {
      expect(screen.getByText('Attendance Forecast')).toBeInTheDocument();
    });

    // Click on patterns tab
    fireEvent.click(screen.getByText('Patterns'));

    await waitFor(() => {
      expect(screen.getByText('Recurring Pattern')).toBeInTheDocument();
      expect(screen.getByText('Consistent weekly attendance pattern')).toBeInTheDocument();
    });

    // Click on anomalies tab
    fireEvent.click(screen.getByText('Anomalies'));

    await waitFor(() => {
      expect(screen.getByText('Jan 20, 2024')).toBeInTheDocument();
      expect(screen.getByText('Unusually low attendance: 45.0%')).toBeInTheDocument();
    });

    // Click on insights tab
    fireEvent.click(screen.getByText('Insights'));

    await waitFor(() => {
      expect(screen.getByText('Optimal Time Slot Identified')).toBeInTheDocument();
      expect(screen.getByText('Morning sessions show consistently higher attendance')).toBeInTheDocument();
    });
  });

  it('renders forecast charts', async () => {
    render(<AttendancePredictiveAnalytics classId="class-1" />);

    await waitFor(() => {
      expect(screen.getByTestId('area-chart')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });

  it('displays prediction factors', async () => {
    render(<AttendancePredictiveAnalytics classId="class-1" />);

    await waitFor(() => {
      expect(screen.getByText('Key Prediction Factors')).toBeInTheDocument();
      expect(screen.getByText('Historical Trend')).toBeInTheDocument();
      expect(screen.getByText('60% impact')).toBeInTheDocument();
      expect(screen.getByText('Consistent upward trend in attendance')).toBeInTheDocument();
      expect(screen.getByText('Seasonal Patterns')).toBeInTheDocument();
      expect(screen.getByText('30% impact')).toBeInTheDocument();
    });
  });

  it('handles prediction horizon changes', async () => {
    render(<AttendancePredictiveAnalytics classId="class-1" />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('1 Month')).toBeInTheDocument();
    });

    // Change prediction horizon
    const select = screen.getByDisplayValue('1 Month');
    fireEvent.click(select);
    fireEvent.click(screen.getByText('3 Months'));

    // Should trigger re-calculation of forecast data
    await waitFor(() => {
      expect(screen.getByDisplayValue('3 Months')).toBeInTheDocument();
    });
  });

  it('handles analysis mode changes', async () => {
    render(<AttendancePredictiveAnalytics />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('All Classes')).toBeInTheDocument();
    });

    // Change to single class mode
    const select = screen.getByDisplayValue('All Classes');
    fireEvent.click(select);
    fireEvent.click(screen.getByText('Single Class'));

    await waitFor(() => {
      expect(screen.getByDisplayValue('Single Class')).toBeInTheDocument();
    });
  });

  it('shows patterns with correct styling', async () => {
    render(<AttendancePredictiveAnalytics classId="class-1" />);

    fireEvent.click(screen.getByText('Patterns'));

    await waitFor(() => {
      expect(screen.getByText('Recurring Pattern')).toBeInTheDocument();
      expect(screen.getByText('Seasonal Pattern')).toBeInTheDocument();
      expect(screen.getByText('positive')).toBeInTheDocument();
      expect(screen.getByText('negative')).toBeInTheDocument();
      expect(screen.getByText('weekly')).toBeInTheDocument();
      expect(screen.getByText('monthly')).toBeInTheDocument();
    });
  });

  it('displays anomalies with severity levels', async () => {
    render(<AttendancePredictiveAnalytics classId="class-1" />);

    fireEvent.click(screen.getByText('Anomalies'));

    await waitFor(() => {
      expect(screen.getByText('high severity')).toBeInTheDocument();
      expect(screen.getByText('medium severity')).toBeInTheDocument();
      expect(screen.getByText('Weather conditions')).toBeInTheDocument();
      expect(screen.getByText('Technical issues')).toBeInTheDocument();
      expect(screen.getByText('Special event')).toBeInTheDocument();
      expect(screen.getByText('Makeup session')).toBeInTheDocument();
    });
  });

  it('shows insights with actionable indicators', async () => {
    render(<AttendancePredictiveAnalytics classId="class-1" />);

    fireEvent.click(screen.getByText('Insights'));

    await waitFor(() => {
      expect(screen.getByText('Optimal Time Slot Identified')).toBeInTheDocument();
      expect(screen.getByText('Winter Attendance Decline')).toBeInTheDocument();
      expect(screen.getByText('High Engagement Potential')).toBeInTheDocument();
      
      // Should show actionable badges
      const actionableBadges = screen.getAllByText('Actionable');
      expect(actionableBadges).toHaveLength(2); // Two actionable insights
    });
  });

  it('handles empty patterns gracefully', async () => {
    const emptyPatternAnalysis = {
      patterns: [],
      anomalies: [],
      insights: []
    };

    mockService.getAttendancePatternAnalysis.mockResolvedValue(emptyPatternAnalysis);

    render(<AttendancePredictiveAnalytics classId="class-1" />);

    fireEvent.click(screen.getByText('Patterns'));

    await waitFor(() => {
      expect(screen.getByText('No Patterns Detected')).toBeInTheDocument();
      expect(screen.getByText('Insufficient data to identify attendance patterns.')).toBeInTheDocument();
    });
  });

  it('handles empty anomalies gracefully', async () => {
    const emptyPatternAnalysis = {
      patterns: [],
      anomalies: [],
      insights: []
    };

    mockService.getAttendancePatternAnalysis.mockResolvedValue(emptyPatternAnalysis);

    render(<AttendancePredictiveAnalytics classId="class-1" />);

    fireEvent.click(screen.getByText('Anomalies'));

    await waitFor(() => {
      expect(screen.getByText('No Anomalies Detected')).toBeInTheDocument();
      expect(screen.getByText('Attendance patterns are stable with no unusual variations.')).toBeInTheDocument();
    });
  });

  it('handles empty insights gracefully', async () => {
    const emptyPatternAnalysis = {
      patterns: [],
      anomalies: [],
      insights: []
    };

    mockService.getAttendancePatternAnalysis.mockResolvedValue(emptyPatternAnalysis);

    render(<AttendancePredictiveAnalytics classId="class-1" />);

    fireEvent.click(screen.getByText('Insights'));

    await waitFor(() => {
      expect(screen.getByText('No Insights Available')).toBeInTheDocument();
      expect(screen.getByText('More data is needed to generate meaningful insights.')).toBeInTheDocument();
    });
  });

  it('handles service errors gracefully', async () => {
    const errorMessage = 'Failed to load predictive analytics';
    mockService.getClassAttendanceAnalytics.mockRejectedValue(new Error(errorMessage));

    render(<AttendancePredictiveAnalytics classId="class-1" />);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('handles refresh functionality', async () => {
    render(<AttendancePredictiveAnalytics classId="class-1" />);

    await waitFor(() => {
      expect(screen.getByText('Predictive Attendance Analytics')).toBeInTheDocument();
    });

    // Clear previous calls
    mockService.getClassAttendanceAnalytics.mockClear();
    mockService.getAttendancePatternAnalysis.mockClear();

    // Click refresh button
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockService.getClassAttendanceAnalytics).toHaveBeenCalled();
      expect(mockService.getAttendancePatternAnalysis).toHaveBeenCalled();
    });
  });

  it('shows no data state when no class is selected', async () => {
    render(<AttendancePredictiveAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('No Predictive Data Available')).toBeInTheDocument();
      expect(screen.getByText('Select a class to view predictive analytics.')).toBeInTheDocument();
    });
  });

  it('displays target dates for predictions', async () => {
    render(<AttendancePredictiveAnalytics classId="class-1" />);

    await waitFor(() => {
      expect(screen.getByText('Target: Feb 15, 2024')).toBeInTheDocument();
    });
  });

  it('shows progress bars for prediction confidence', async () => {
    render(<AttendancePredictiveAnalytics classId="class-1" />);

    await waitFor(() => {
      const progressBars = screen.getAllByRole('progressbar');
      expect(progressBars.length).toBeGreaterThan(2); // Should have confidence progress bars
    });
  });

  it('generates forecast data based on prediction horizon', async () => {
    render(<AttendancePredictiveAnalytics classId="class-1" />);

    await waitFor(() => {
      const areaChart = screen.getByTestId('area-chart');
      expect(areaChart).toBeInTheDocument();
      // Should have generated forecast data points
      expect(areaChart.textContent).toMatch(/\d+ points/);
    });
  });

  it('displays prediction accuracy chart', async () => {
    render(<AttendancePredictiveAnalytics classId="class-1" />);

    await waitFor(() => {
      expect(screen.getByText('Prediction Accuracy')).toBeInTheDocument();
      expect(screen.getByText('Historical comparison of predicted vs actual attendance')).toBeInTheDocument();
      
      const lineChart = screen.getByTestId('line-chart');
      expect(lineChart).toBeInTheDocument();
    });
  });

  it('handles different risk level colors', async () => {
    const highRiskData = {
      ...mockAnalyticsData,
      predictions: [
        {
          ...mockAnalyticsData.predictions[0],
          riskLevel: 'high' as const,
          predictedValue: 55.0
        }
      ]
    };

    mockService.getClassAttendanceAnalytics.mockResolvedValue(highRiskData);

    render(<AttendancePredictiveAnalytics classId="class-1" />);

    await waitFor(() => {
      expect(screen.getByText('high risk')).toBeInTheDocument();
      expect(screen.getByText('55.0%')).toBeInTheDocument();
    });
  });
});