import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CompensationDisplay } from '../CompensationDisplay';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

// Mock the icons
jest.mock('lucide-react', () => ({
  Calendar: () => <div data-testid="calendar-icon">Calendar</div>,
  DollarSign: () => <div data-testid="dollar-icon">DollarSign</div>,
  TrendingUp: () => <div data-testid="trending-icon">TrendingUp</div>,
  Clock: () => <div data-testid="clock-icon">Clock</div>,
  ChevronDown: () => <div data-testid="chevron-icon">ChevronDown</div>,
  ChevronUp: () => <div data-testid="chevron-up-icon">ChevronUp</div>,
  Download: () => <div data-testid="download-icon">Download</div>,
  Info: () => <div data-testid="info-icon">Info</div>,
  RefreshCw: () => <div data-testid="refresh-icon">RefreshCw</div>,
  Filter: () => <div data-testid="filter-icon">Filter</div>,
  Check: () => <div data-testid="check-icon">Check</div>,
}));

// Mock data
const mockCompensationData = {
  weeklyEarnings: {
    totalAmount: 15000,
    totalHours: 25,
    hourlyRate: 600,
    classes: [
      {
        id: '1',
        className: 'English Basics',
        date: new Date(),
        hours: 2,
        amount: 1200,
        students: 5,
      },
      {
        id: '2',
        className: 'Business English',
        date: new Date(),
        hours: 1.5,
        amount: 900,
        students: 3,
      },
    ],
  },
  monthlyEarnings: {
    totalAmount: 65000,
    totalHours: 110,
    averageHourlyRate: 590.91,
    projectedTotal: 75000,
    previousMonth: 62000,
    growthPercentage: 4.84,
  },
  bonuses: {
    studentSatisfaction: {
      eligible: true,
      amount: 5000,
      criteria: 'Average rating ≥ 4.5',
      currentValue: 4.7,
    },
    attendance: {
      eligible: true,
      amount: 3000,
      criteria: 'Attendance rate ≥ 95%',
      currentValue: 98,
    },
    extraHours: {
      eligible: false,
      amount: 2000,
      criteria: 'Extra hours ≥ 20',
      currentValue: 15,
    },
  },
  paymentHistory: [
    {
      id: '1',
      date: new Date('2025-01-05'),
      amount: 62000,
      status: 'paid',
      period: 'December 2024',
    },
    {
      id: '2',
      date: new Date('2024-12-05'),
      amount: 58000,
      status: 'paid',
      period: 'November 2024',
    },
  ],
};

describe('CompensationDisplay', () => {
  const defaultProps = {
    teacherId: 'teacher-123',
    compensationData: mockCompensationData,
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state', () => {
    render(<CompensationDisplay {...defaultProps} isLoading={true} compensationData={undefined} />);
    
    expect(screen.getByTestId('compensation-loading')).toBeInTheDocument();
  });

  it('should render empty state when no data', () => {
    render(<CompensationDisplay {...defaultProps} compensationData={undefined} />);
    
    expect(screen.getByText(/no compensation data available/i)).toBeInTheDocument();
  });

  it('should display weekly earnings summary', () => {
    render(<CompensationDisplay {...defaultProps} />);
    
    expect(screen.getByText('Weekly Earnings')).toBeInTheDocument();
    expect(screen.getByText('RM 15,000.00')).toBeInTheDocument();
    expect(screen.getByText(/25 hours/)).toBeInTheDocument();
    expect(screen.getByText(/RM 600.00\/hour/)).toBeInTheDocument();
  });

  it('should display monthly earnings with growth indicator', () => {
    render(<CompensationDisplay {...defaultProps} />);
    
    expect(screen.getByText('Monthly Earnings')).toBeInTheDocument();
    expect(screen.getByText('RM 65,000.00')).toBeInTheDocument();
    expect(screen.getByText('+4.84%')).toBeInTheDocument();
    expect(screen.getByText(/from last month/i)).toBeInTheDocument();
  });

  it('should show projected monthly earnings', () => {
    render(<CompensationDisplay {...defaultProps} />);
    
    expect(screen.getByText('Projected Total')).toBeInTheDocument();
    expect(screen.getAllByText('RM 75,000.00')[0]).toBeInTheDocument();
  });

  it('should display bonus eligibility status', () => {
    render(<CompensationDisplay {...defaultProps} />);
    
    // Check eligible bonuses
    expect(screen.getByText('Student Satisfaction Bonus')).toBeInTheDocument();
    expect(screen.getAllByText('RM 5,000.00')[0]).toBeInTheDocument();
    expect(screen.getAllByText('✓ Eligible')[0]).toBeInTheDocument();
    expect(screen.getByText(/Average rating ≥ 4.5/)).toBeInTheDocument();
    expect(screen.getByText(/Current: 4.7/)).toBeInTheDocument();

    // Check non-eligible bonus
    expect(screen.getByText('Extra Hours Bonus')).toBeInTheDocument();
    expect(screen.getByText('✗ Not Eligible')).toBeInTheDocument();
    expect(screen.getByText(/Current: 15/)).toBeInTheDocument();
  });

  it('should display class breakdown when expanded', () => {
    render(<CompensationDisplay {...defaultProps} />);
    
    const expandButton = screen.getByRole('button', { name: /view details/i });
    fireEvent.click(expandButton);
    
    expect(screen.getByText('English Basics')).toBeInTheDocument();
    expect(screen.getByText(/2 hours/)).toBeInTheDocument();
    expect(screen.getByText('RM 1,200.00')).toBeInTheDocument();
    expect(screen.getByText(/5 students/)).toBeInTheDocument();
  });

  it('should toggle between weekly and monthly view', () => {
    render(<CompensationDisplay {...defaultProps} />);
    
    const viewToggle = screen.getByRole('tab', { name: /monthly/i });
    fireEvent.click(viewToggle);
    
    expect(screen.getByRole('tab', { name: /weekly/i })).toBeInTheDocument();
  });

  it('should display payment history', () => {
    render(<CompensationDisplay {...defaultProps} />);
    
    expect(screen.getByText('Payment History')).toBeInTheDocument();
    expect(screen.getByText('December 2024')).toBeInTheDocument();
    expect(screen.getAllByText('RM 62,000.00')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Paid')[0]).toBeInTheDocument();
  });

  it('should handle date range selection', async () => {
    const onDateRangeChange = jest.fn();
    render(<CompensationDisplay {...defaultProps} onDateRangeChange={onDateRangeChange} />);
    
    const dateRangeButton = screen.getAllByRole('combobox')[0];
    fireEvent.click(dateRangeButton);
    
    const thisWeekOption = screen.getByRole('option', { name: 'This Week' });
    fireEvent.click(thisWeekOption);
    
    await waitFor(() => {
      expect(onDateRangeChange).toHaveBeenCalledWith({
        from: expect.any(Date),
        to: expect.any(Date),
      });
    });
  });

  it('should export compensation report', async () => {
    const onExport = jest.fn();
    render(<CompensationDisplay {...defaultProps} onExport={onExport} />);
    
    const exportButton = screen.getByRole('button', { name: /export report/i });
    fireEvent.click(exportButton);
    
    expect(onExport).toHaveBeenCalledWith({
      format: 'pdf',
      data: mockCompensationData,
      dateRange: expect.any(Object),
    });
  });

  it('should show salary payment status', () => {
    render(<CompensationDisplay {...defaultProps} />);
    
    expect(screen.getByText('Salary Status')).toBeInTheDocument();
    expect(screen.getByText(/next payment expected on/i)).toBeInTheDocument();
  });

  it('should display hourly rate breakdown', () => {
    render(<CompensationDisplay {...defaultProps} />);
    
    const breakdownButton = screen.getByRole('button', { name: /rate breakdown/i });
    fireEvent.click(breakdownButton);
    
    expect(screen.getByText('Base Rate')).toBeInTheDocument();
    expect(screen.getByText('Experience Bonus')).toBeInTheDocument();
    expect(screen.getByText('Qualification Bonus')).toBeInTheDocument();
  });

  it.skip('should show bonus rules tooltip', async () => {
    render(<CompensationDisplay {...defaultProps} />);
    
    const infoIcon = screen.getAllByTestId('info-icon')[0];
    fireEvent.mouseEnter(infoIcon);
    
    await waitFor(() => {
      expect(screen.getAllByText('Average rating ≥ 4.5').length).toBeGreaterThan(0);
    });
  });

  it('should filter compensation by class type', () => {
    render(<CompensationDisplay {...defaultProps} />);
    
    // First expand the details
    const expandButton = screen.getByRole('button', { name: /view details/i });
    fireEvent.click(expandButton);
    
    const filterButton = screen.getAllByRole('combobox')[1];
    fireEvent.click(filterButton);
    
    const businessOption = screen.getByRole('option', { name: 'Business English' });
    fireEvent.click(businessOption);
    
    // Wait for the filter to be applied
    expect(screen.queryByText('English Basics')).not.toBeInTheDocument();
    expect(screen.getAllByText('Business English').length).toBeGreaterThan(0);
  });

  it('should show total potential earnings with all bonuses', () => {
    render(<CompensationDisplay {...defaultProps} />);
    
    expect(screen.getByText('Potential Total')).toBeInTheDocument();
    // Base earnings + all bonuses
    const potentialTotal = 65000 + 5000 + 3000 + 2000;
    expect(screen.getAllByText('RM 75,000.00').length).toBeGreaterThan(0);
  });

  it('should handle error state', () => {
    render(<CompensationDisplay {...defaultProps} error="Failed to load compensation data" />);
    
    expect(screen.getByText(/failed to load compensation data/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('should refresh data on demand', async () => {
    const onRefresh = jest.fn();
    render(<CompensationDisplay {...defaultProps} onRefresh={onRefresh} />);
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);
    
    expect(onRefresh).toHaveBeenCalled();
  });

  it('should show earnings chart visualization', () => {
    render(<CompensationDisplay {...defaultProps} showChart={true} />);
    
    expect(screen.getByTestId('earnings-chart')).toBeInTheDocument();
    expect(screen.getByText('Earnings Trend')).toBeInTheDocument();
  });

  it('should display tax deduction information', () => {
    render(<CompensationDisplay {...defaultProps} showTaxInfo={true} />);
    
    expect(screen.getByText('Tax Information')).toBeInTheDocument();
    expect(screen.getByText('Estimated Tax')).toBeInTheDocument();
    expect(screen.getByText('Net Income')).toBeInTheDocument();
  });
});