import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HourBalanceDisplay } from '../HourBalanceDisplay';
import { hourTrackingService } from '@/lib/services';

// Mock the hour tracking service
jest.mock('@/lib/services', () => ({
  hourTrackingService: {
    getStudentHourSummary: jest.fn()
  }
}));

const mockHourTrackingService = hourTrackingService as jest.Mocked<typeof hourTrackingService>;

describe('HourBalanceDisplay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockSummary = {
    student_id: 'student-1',
    student_name: 'John Doe',
    student_code: 'HPA001',
    total_hours_purchased: 20,
    total_hours_used: 5,
    current_balance: 15,
    hours_expiring_soon: 0,
    last_transaction_date: '2024-07-01T00:00:00Z',
    next_expiration_date: '2024-12-01'
  };

  it('renders hour balance information correctly', async () => {
    mockHourTrackingService.getStudentHourSummary.mockResolvedValue({
      success: true,
      data: mockSummary
    });

    render(<HourBalanceDisplay studentId="student-1" />);

    // Should show loading initially
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('15.0')).toBeInTheDocument();
      expect(screen.getByText('hours remaining')).toBeInTheDocument();
    });

    // Check that purchase and usage stats are displayed
    expect(screen.getByText('20')).toBeInTheDocument(); // Total purchased
    expect(screen.getByText('5')).toBeInTheDocument(); // Total used
  });

  it('displays compact view correctly', async () => {
    mockHourTrackingService.getStudentHourSummary.mockResolvedValue({
      success: true,
      data: mockSummary
    });

    render(<HourBalanceDisplay studentId="student-1" compact={true} />);

    await waitFor(() => {
      expect(screen.getByText('Hour Balance')).toBeInTheDocument();
      expect(screen.getByText('15.0 hours')).toBeInTheDocument();
    });

    // Compact view should not show detailed stats
    expect(screen.queryByText('Hours Used')).not.toBeInTheDocument();
  });

  it('shows low balance warning', async () => {
    const lowBalanceSummary = {
      ...mockSummary,
      current_balance: 3
    };

    mockHourTrackingService.getStudentHourSummary.mockResolvedValue({
      success: true,
      data: lowBalanceSummary
    });

    render(<HourBalanceDisplay studentId="student-1" />);

    await waitFor(() => {
      expect(screen.getByText('Low Balance')).toBeInTheDocument();
      expect(screen.getByText(/low hour balance/i)).toBeInTheDocument();
    });
  });

  it('shows expiring hours warning', async () => {
    const expiringHoursSummary = {
      ...mockSummary,
      hours_expiring_soon: 5,
      next_expiration_date: '2024-07-20'
    };

    mockHourTrackingService.getStudentHourSummary.mockResolvedValue({
      success: true,
      data: expiringHoursSummary
    });

    render(<HourBalanceDisplay studentId="student-1" />);

    await waitFor(() => {
      expect(screen.getByText('5.0 hours expiring soon')).toBeInTheDocument();
    });
  });

  it('shows zero balance state', async () => {
    const zeroBalanceSummary = {
      ...mockSummary,
      current_balance: 0
    };

    mockHourTrackingService.getStudentHourSummary.mockResolvedValue({
      success: true,
      data: zeroBalanceSummary
    });

    render(<HourBalanceDisplay studentId="student-1" />);

    await waitFor(() => {
      expect(screen.getByText('No Hours')).toBeInTheDocument();
      expect(screen.getByText('0.0')).toBeInTheDocument();
    });
  });

  it('handles service errors gracefully', async () => {
    mockHourTrackingService.getStudentHourSummary.mockResolvedValue({
      success: false,
      error: 'Failed to load hour summary'
    });

    render(<HourBalanceDisplay studentId="student-1" />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load hour summary')).toBeInTheDocument();
    });
  });

  it('calls onPurchaseHours callback when purchase button clicked', async () => {
    const onPurchaseHours = jest.fn();

    mockHourTrackingService.getStudentHourSummary.mockResolvedValue({
      success: true,
      data: mockSummary
    });

    render(<HourBalanceDisplay studentId="student-1" onPurchaseHours={onPurchaseHours} />);

    await waitFor(() => {
      const purchaseButton = screen.getByText('Purchase Hours');
      expect(purchaseButton).toBeInTheDocument();
    });

    const purchaseButton = screen.getByText('Purchase Hours');
    purchaseButton.click();

    expect(onPurchaseHours).toHaveBeenCalledTimes(1);
  });

  it('calls onViewHistory callback when history button clicked', async () => {
    const onViewHistory = jest.fn();

    mockHourTrackingService.getStudentHourSummary.mockResolvedValue({
      success: true,
      data: mockSummary
    });

    render(<HourBalanceDisplay studentId="student-1" onViewHistory={onViewHistory} />);

    await waitFor(() => {
      const historyButton = screen.getByText('View History');
      expect(historyButton).toBeInTheDocument();
    });

    const historyButton = screen.getByText('View History');
    historyButton.click();

    expect(onViewHistory).toHaveBeenCalledTimes(1);
  });

  it('calculates usage percentage correctly', async () => {
    const summaryWith25PercentUsage = {
      ...mockSummary,
      total_hours_purchased: 20,
      total_hours_used: 5 // 25% usage
    };

    mockHourTrackingService.getStudentHourSummary.mockResolvedValue({
      success: true,
      data: summaryWith25PercentUsage
    });

    render(<HourBalanceDisplay studentId="student-1" />);

    await waitFor(() => {
      expect(screen.getByText('25.0% of purchased hours used')).toBeInTheDocument();
    });
  });

  it('handles missing optional data gracefully', async () => {
    const minimalSummary = {
      student_id: 'student-1',
      student_name: 'John Doe',
      student_code: 'HPA001',
      total_hours_purchased: 0,
      total_hours_used: 0,
      current_balance: 0,
      hours_expiring_soon: 0
      // Missing optional fields like last_transaction_date and next_expiration_date
    };

    mockHourTrackingService.getStudentHourSummary.mockResolvedValue({
      success: true,
      data: minimalSummary
    });

    render(<HourBalanceDisplay studentId="student-1" />);

    await waitFor(() => {
      expect(screen.getByText('0.0')).toBeInTheDocument();
    });

    // Should not crash with missing optional data
    expect(screen.queryByText('Last activity:')).not.toBeInTheDocument();
  });
});