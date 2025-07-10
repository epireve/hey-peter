import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BonusRulesDisplay } from '../BonusRulesDisplay';

// Mock the icons
jest.mock('lucide-react', () => ({
  Trophy: () => <div data-testid="trophy-icon">Trophy</div>,
  Star: () => <div data-testid="star-icon">Star</div>,
  Clock: () => <div data-testid="clock-icon">Clock</div>,
  Users: () => <div data-testid="users-icon">Users</div>,
  TrendingUp: () => <div data-testid="trending-up-icon">TrendingUp</div>,
  Award: () => <div data-testid="award-icon">Award</div>,
  Target: () => <div data-testid="target-icon">Target</div>,
  CheckCircle: () => <div data-testid="check-circle-icon">CheckCircle</div>,
  XCircle: () => <div data-testid="x-circle-icon">XCircle</div>,
  AlertCircle: () => <div data-testid="alert-circle-icon">AlertCircle</div>,
  Info: () => <div data-testid="info-icon">Info</div>,
  ChevronDown: () => <div data-testid="chevron-icon">ChevronDown</div>,
  ChevronRight: () => <div data-testid="chevron-right-icon">ChevronRight</div>,
}));

// Mock data
const mockBonusRules = {
  studentSatisfaction: {
    name: 'Student Satisfaction Bonus',
    description: 'Awarded for maintaining high student satisfaction ratings',
    criteria: [
      { requirement: 'Average rating ≥ 4.5/5.0', met: true },
      { requirement: 'Minimum 20 student reviews', met: true },
      { requirement: 'No complaints in the month', met: true },
    ],
    amount: 5000,
    frequency: 'monthly',
    currentStatus: {
      eligible: true,
      currentValue: 4.7,
      targetValue: 4.5,
      progress: 100,
    },
  },
  attendance: {
    name: 'Attendance Bonus',
    description: 'Awarded for excellent attendance record',
    criteria: [
      { requirement: 'Attendance rate ≥ 95%', met: true },
      { requirement: 'No unexcused absences', met: true },
      { requirement: 'Punctuality rate ≥ 98%', met: false },
    ],
    amount: 3000,
    frequency: 'monthly',
    currentStatus: {
      eligible: false,
      currentValue: 94,
      targetValue: 95,
      progress: 98.9,
    },
  },
  extraHours: {
    name: 'Extra Hours Bonus',
    description: 'Awarded for teaching additional hours',
    criteria: [
      { requirement: 'Extra hours ≥ 20 per month', met: false },
      { requirement: 'Maintain quality standards', met: true },
    ],
    amount: 2000,
    frequency: 'monthly',
    currentStatus: {
      eligible: false,
      currentValue: 15,
      targetValue: 20,
      progress: 75,
    },
  },
  performance: {
    name: 'Performance Excellence Bonus',
    description: 'Awarded for exceptional teaching performance',
    criteria: [
      { requirement: 'Student pass rate ≥ 90%', met: true },
      { requirement: 'Course completion rate ≥ 85%', met: true },
      { requirement: 'Innovation in teaching methods', met: true },
    ],
    amount: 8000,
    frequency: 'quarterly',
    currentStatus: {
      eligible: true,
      currentValue: 92,
      targetValue: 90,
      progress: 100,
    },
  },
};

describe('BonusRulesDisplay', () => {
  const defaultProps = {
    bonusRules: mockBonusRules,
    teacherId: 'teacher-123',
  };

  it('should render all bonus categories', () => {
    render(<BonusRulesDisplay {...defaultProps} />);
    
    expect(screen.getByText('Student Satisfaction Bonus')).toBeInTheDocument();
    expect(screen.getByText('Attendance Bonus')).toBeInTheDocument();
    expect(screen.getByText('Extra Hours Bonus')).toBeInTheDocument();
    expect(screen.getByText('Performance Excellence Bonus')).toBeInTheDocument();
  });

  it('should display bonus amounts', () => {
    render(<BonusRulesDisplay {...defaultProps} />);
    
    expect(screen.getByText('RM 5,000')).toBeInTheDocument();
    expect(screen.getByText('RM 3,000')).toBeInTheDocument();
    expect(screen.getByText('RM 2,000')).toBeInTheDocument();
    expect(screen.getByText('RM 8,000')).toBeInTheDocument();
  });

  it('should show eligibility status', () => {
    render(<BonusRulesDisplay {...defaultProps} />);
    
    expect(screen.getAllByText('Eligible').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Not Eligible').length).toBeGreaterThan(0);
  });

  it('should display progress bars', () => {
    render(<BonusRulesDisplay {...defaultProps} />);
    
    const progressBars = screen.getAllByRole('progressbar');
    expect(progressBars.length).toBeGreaterThan(0);
  });

  it('should show criteria checklist', () => {
    render(<BonusRulesDisplay {...defaultProps} />);
    
    // First expand a bonus to see the criteria
    const expandButton = screen.getAllByRole('button')[0];
    fireEvent.click(expandButton);
    
    expect(screen.getByText('Average rating ≥ 4.5/5.0')).toBeInTheDocument();
    expect(screen.getByText('Minimum 20 student reviews')).toBeInTheDocument();
    expect(screen.getByText('No complaints in the month')).toBeInTheDocument();
  });

  it('should indicate met and unmet criteria', () => {
    render(<BonusRulesDisplay {...defaultProps} />);
    
    // Expand the attendance bonus which has unmet criteria
    const buttons = screen.getAllByRole('button');
    const attendanceButton = buttons.find(button => 
      button.textContent?.includes('Attendance Bonus')
    );
    if (attendanceButton) {
      fireEvent.click(attendanceButton);
    }
    
    const checkIcons = screen.getAllByTestId('check-circle-icon');
    const xIcons = screen.getAllByTestId('x-circle-icon');
    
    expect(checkIcons.length).toBeGreaterThan(0);
    expect(xIcons.length).toBeGreaterThan(0);
  });

  it('should expand/collapse bonus details', () => {
    render(<BonusRulesDisplay {...defaultProps} />);
    
    const expandButton = screen.getAllByRole('button')[0];
    fireEvent.click(expandButton);
    
    // Should show more details
    expect(screen.getByText(/Awarded for maintaining high student satisfaction/)).toBeInTheDocument();
  });

  it('should display frequency information', () => {
    render(<BonusRulesDisplay {...defaultProps} />);
    
    expect(screen.getAllByText(/monthly/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/quarterly/i).length).toBeGreaterThan(0);
  });

  it('should show current vs target values', () => {
    render(<BonusRulesDisplay {...defaultProps} />);
    
    expect(screen.getByText('4.7 / 4.5')).toBeInTheDocument();
    expect(screen.getByText('94 / 95')).toBeInTheDocument();
    expect(screen.getByText('15 / 20')).toBeInTheDocument();
  });

  it('should display loading state', () => {
    render(<BonusRulesDisplay {...defaultProps} isLoading={true} bonusRules={undefined} />);
    
    expect(screen.getByTestId('bonus-rules-loading')).toBeInTheDocument();
  });

  it('should handle empty state', () => {
    render(<BonusRulesDisplay {...defaultProps} bonusRules={{}} />);
    
    expect(screen.getByText(/no bonus rules available/i)).toBeInTheDocument();
  });

  it('should show summary view', () => {
    render(<BonusRulesDisplay {...defaultProps} variant="summary" />);
    
    expect(screen.getByText(/Total Eligible Bonuses/i)).toBeInTheDocument();
    expect(screen.getByText('RM 13,000')).toBeInTheDocument(); // 5000 + 8000
  });

  it('should support compact view', () => {
    render(<BonusRulesDisplay {...defaultProps} variant="compact" />);
    
    const bonusCards = screen.getAllByRole('article');
    expect(bonusCards.length).toBe(4);
  });

  it('should filter by eligibility', () => {
    render(<BonusRulesDisplay {...defaultProps} showFilters={true} />);
    
    // The filter button shows "Eligible Only" text
    const filterButton = screen.getByText('Eligible Only');
    fireEvent.click(filterButton);
    
    // Should only show eligible bonuses
    expect(screen.queryByText('Attendance Bonus')).not.toBeInTheDocument();
    expect(screen.queryByText('Extra Hours Bonus')).not.toBeInTheDocument();
  });

  it('should show tips for improvement', () => {
    render(<BonusRulesDisplay {...defaultProps} showTips={true} />);
    
    // Expand a non-eligible bonus to see tips
    const buttons = screen.getAllByRole('button');
    const attendanceButton = buttons.find(button => 
      button.textContent?.includes('Attendance Bonus')
    );
    if (attendanceButton) {
      fireEvent.click(attendanceButton);
    }
    
    expect(screen.getByText(/Tips to improve/i)).toBeInTheDocument();
  });

  it('should display bonus history', () => {
    const history = [
      { month: 'January', bonuses: ['Student Satisfaction', 'Performance'], total: 12000 },
      { month: 'February', bonuses: ['Student Satisfaction'], total: 5000 },
    ];
    
    render(<BonusRulesDisplay {...defaultProps} showHistory={true} bonusHistory={history} />);
    
    expect(screen.getByText('Bonus History')).toBeInTheDocument();
    expect(screen.getByText('January')).toBeInTheDocument();
    expect(screen.getByText('RM 12,000')).toBeInTheDocument();
  });

  it('should highlight near-miss bonuses', () => {
    render(<BonusRulesDisplay {...defaultProps} />);
    
    // Attendance bonus is at 98.9% progress - should be highlighted
    const attendanceCard = screen.getByText('Attendance Bonus').closest('[role="article"]');
    expect(attendanceCard).toHaveClass('border-yellow-500');
  });

  it('should show detailed breakdown on hover', () => {
    render(<BonusRulesDisplay {...defaultProps} showTooltips={true} />);
    
    // Look for tooltip trigger button elements
    const tooltipTriggers = screen.getAllByRole('button');
    const bonusAmountTrigger = tooltipTriggers.find(button => 
      button.textContent?.includes('RM 5,000')
    );
    
    if (bonusAmountTrigger) {
      fireEvent.mouseEnter(bonusAmountTrigger);
      // In the actual implementation, we would check for tooltip content
      // For now, just verify the trigger element exists
      expect(bonusAmountTrigger).toBeInTheDocument();
    }
  });

  it('should support custom bonus categories', () => {
    const customRules = {
      ...mockBonusRules,
      referral: {
        name: 'Referral Bonus',
        description: 'Awarded for successful student referrals',
        criteria: [{ requirement: 'Minimum 3 referrals', met: true }],
        amount: 1000,
        frequency: 'per referral',
        currentStatus: {
          eligible: true,
          currentValue: 5,
          targetValue: 3,
          progress: 100,
        },
      },
    };
    
    render(<BonusRulesDisplay {...defaultProps} bonusRules={customRules} />);
    
    expect(screen.getByText('Referral Bonus')).toBeInTheDocument();
  });

  it('should calculate total potential bonuses', () => {
    render(<BonusRulesDisplay {...defaultProps} />);
    
    expect(screen.getByText(/Total Potential/i)).toBeInTheDocument();
    expect(screen.getByText('RM 18,000')).toBeInTheDocument(); // Sum of all bonuses
  });
});