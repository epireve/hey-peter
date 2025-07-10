import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConflictWarningSystem, ConflictIndicator } from '../conflict-warning-system';
import { ConflictError } from '@/lib/services/conflict-detection-service';
import { DuplicateError } from '@/lib/services/duplicate-prevention-service';

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  AlertTriangle: ({ className, ...props }: any) => <div data-testid="alert-triangle" className={className} {...props} />,
  AlertCircle: ({ className, ...props }: any) => <div data-testid="alert-circle" className={className} {...props} />,
  Info: ({ className, ...props }: any) => <div data-testid="info" className={className} {...props} />,
  X: ({ className, ...props }: any) => <div data-testid="x" className={className} {...props} />,
  CheckCircle: ({ className, ...props }: any) => <div data-testid="check-circle" className={className} {...props} />,
  Clock: ({ className, ...props }: any) => <div data-testid="clock" className={className} {...props} />,
  Users: ({ className, ...props }: any) => <div data-testid="users" className={className} {...props} />,
  Calendar: ({ className, ...props }: any) => <div data-testid="calendar" className={className} {...props} />,
  RefreshCw: ({ className, ...props }: any) => <div data-testid="refresh-cw" className={className} {...props} />,
  Lightbulb: ({ className, ...props }: any) => <div data-testid="lightbulb" className={className} {...props} />,
}));

describe('ConflictWarningSystem', () => {
  const mockConflicts: ConflictError[] = [
    {
      type: 'teacher_time_conflict',
      message: 'Teacher is already booked during this time',
      details: {
        conflictingTeacherId: 'teacher-1',
        conflictingTime: '2024-07-15T10:00:00Z',
        suggestedAlternatives: ['2024-07-15T11:00:00Z', '2024-07-15T14:00:00Z'],
      },
      severity: 'error',
      canProceed: false,
    },
    {
      type: 'student_time_conflict',
      message: 'Student already has a class booked during this time',
      details: {
        conflictingStudentId: 'student-1',
        conflictingTime: '2024-07-15T10:30:00Z',
      },
      severity: 'warning',
      canProceed: true,
    },
  ];

  const mockDuplicates: DuplicateError[] = [
    {
      type: 'duplicate_enrollment',
      message: 'Student is already enrolled in this class',
      details: {
        existingRecordId: 'enrollment-1',
        suggestedAction: 'Choose a different class',
      },
      severity: 'warning',
      canProceed: true,
    },
  ];

  describe('rendering', () => {
    it('should display no conflicts message when no issues exist', () => {
      render(<ConflictWarningSystem conflicts={[]} duplicates={[]} />);
      
      expect(screen.getByText('No conflicts detected')).toBeInTheDocument();
      expect(screen.getByTestId('check-circle')).toBeInTheDocument();
    });

    it('should display conflict summary with correct counts', () => {
      render(
        <ConflictWarningSystem 
          conflicts={mockConflicts} 
          duplicates={mockDuplicates} 
        />
      );
      
      expect(screen.getByText('Conflict Detection Summary')).toBeInTheDocument();
      expect(screen.getByText('1 Error')).toBeInTheDocument();
      expect(screen.getByText('2 Warnings')).toBeInTheDocument();
      expect(screen.getByText('3 Total Issues')).toBeInTheDocument();
    });

    it('should display individual conflict cards', () => {
      render(
        <ConflictWarningSystem 
          conflicts={mockConflicts} 
          duplicates={mockDuplicates} 
        />
      );
      
      expect(screen.getByText('Teacher is already booked during this time')).toBeInTheDocument();
      expect(screen.getByText('Student already has a class booked during this time')).toBeInTheDocument();
      expect(screen.getByText('Student is already enrolled in this class')).toBeInTheDocument();
    });

    it('should show correct severity badges', () => {
      render(
        <ConflictWarningSystem 
          conflicts={mockConflicts} 
          duplicates={mockDuplicates} 
        />
      );
      
      expect(screen.getByText('error')).toBeInTheDocument();
      expect(screen.getAllByText('warning')).toHaveLength(2);
    });

    it('should show "Blocks Proceed" badge for non-proceedable conflicts', () => {
      render(
        <ConflictWarningSystem 
          conflicts={mockConflicts} 
          duplicates={mockDuplicates} 
        />
      );
      
      expect(screen.getByText('Blocks Proceed')).toBeInTheDocument();
    });
  });

  describe('expansion and interaction', () => {
    it('should expand/collapse issue cards when clicked', async () => {
      render(
        <ConflictWarningSystem 
          conflicts={mockConflicts} 
          duplicates={[]} 
        />
      );
      
      const conflictCard = screen.getByText('Teacher is already booked during this time').closest('[role="button"]');
      expect(conflictCard).toBeInTheDocument();
      
      // Initially collapsed - details should not be visible
      expect(screen.queryByText('Conflicting teacher id:')).not.toBeInTheDocument();
      
      // Click to expand
      fireEvent.click(conflictCard!);
      
      await waitFor(() => {
        expect(screen.getByText('Conflicting teacher id:')).toBeInTheDocument();
      });
    });

    it('should show suggested alternatives when expanded', async () => {
      render(
        <ConflictWarningSystem 
          conflicts={mockConflicts} 
          duplicates={[]} 
        />
      );
      
      const conflictCard = screen.getByText('Teacher is already booked during this time').closest('[role="button"]');
      fireEvent.click(conflictCard!);
      
      await waitFor(() => {
        expect(screen.getByText('Suggested Alternative Times:')).toBeInTheDocument();
        // Should show formatted dates for alternatives
        expect(screen.getByText(/7\/15\/2024/)).toBeInTheDocument();
      });
    });

    it('should call onAcceptSuggestion when alternative is clicked', async () => {
      const onAcceptSuggestion = jest.fn();
      
      render(
        <ConflictWarningSystem 
          conflicts={mockConflicts} 
          duplicates={[]} 
          onAcceptSuggestion={onAcceptSuggestion}
        />
      );
      
      const conflictCard = screen.getByText('Teacher is already booked during this time').closest('[role="button"]');
      fireEvent.click(conflictCard!);
      
      await waitFor(() => {
        const alternativeButton = screen.getAllByRole('button').find(button => 
          button.textContent?.includes('7/15/2024')
        );
        expect(alternativeButton).toBeInTheDocument();
        
        fireEvent.click(alternativeButton!);
        expect(onAcceptSuggestion).toHaveBeenCalledWith('2024-07-15T11:00:00Z');
      });
    });

    it('should show suggested action alert when available', async () => {
      render(
        <ConflictWarningSystem 
          conflicts={[]} 
          duplicates={mockDuplicates} 
        />
      );
      
      const duplicateCard = screen.getByText('Student is already enrolled in this class').closest('[role="button"]');
      fireEvent.click(duplicateCard!);
      
      await waitFor(() => {
        expect(screen.getByText('Suggested Action:')).toBeInTheDocument();
        expect(screen.getByText('Choose a different class')).toBeInTheDocument();
      });
    });
  });

  describe('resolution actions', () => {
    it('should show resolution buttons for non-proceedable conflicts', async () => {
      const onResolveConflict = jest.fn();
      
      render(
        <ConflictWarningSystem 
          conflicts={[mockConflicts[0]]} // Error conflict
          duplicates={[]} 
          onResolveConflict={onResolveConflict}
        />
      );
      
      const conflictCard = screen.getByText('Teacher is already booked during this time').closest('[role="button"]');
      fireEvent.click(conflictCard!);
      
      await waitFor(() => {
        expect(screen.getByText('Reschedule')).toBeInTheDocument();
        expect(screen.getByText('Modify')).toBeInTheDocument();
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });
    });

    it('should call onResolveConflict with correct resolution type', async () => {
      const onResolveConflict = jest.fn();
      
      render(
        <ConflictWarningSystem 
          conflicts={[mockConflicts[0]]} 
          duplicates={[]} 
          onResolveConflict={onResolveConflict}
        />
      );
      
      const conflictCard = screen.getByText('Teacher is already booked during this time').closest('[role="button"]');
      fireEvent.click(conflictCard!);
      
      await waitFor(() => {
        const rescheduleButton = screen.getByText('Reschedule');
        fireEvent.click(rescheduleButton);
        
        expect(onResolveConflict).toHaveBeenCalledWith('conflict_0', { type: 'reschedule' });
      });
    });

    it('should show override button for warning conflicts', async () => {
      const onResolveConflict = jest.fn();
      const warningConflict = {
        ...mockConflicts[0],
        severity: 'warning' as const,
        canProceed: true,
      };
      
      render(
        <ConflictWarningSystem 
          conflicts={[warningConflict]} 
          duplicates={[]} 
          onResolveConflict={onResolveConflict}
        />
      );
      
      const conflictCard = screen.getByText('Teacher is already booked during this time').closest('[role="button"]');
      fireEvent.click(conflictCard!);
      
      await waitFor(() => {
        expect(screen.getByText('Override')).toBeInTheDocument();
      });
    });

    it('should show acknowledge button for proceedable warnings', async () => {
      const onDismissWarning = jest.fn();
      
      render(
        <ConflictWarningSystem 
          conflicts={[mockConflicts[1]]} // Warning conflict
          duplicates={[]} 
          onDismissWarning={onDismissWarning}
        />
      );
      
      const conflictCard = screen.getByText('Student already has a class booked during this time').closest('[role="button"]');
      fireEvent.click(conflictCard!);
      
      await waitFor(() => {
        const acknowledgeButton = screen.getByText('Acknowledge & Proceed');
        fireEvent.click(acknowledgeButton);
        
        expect(onDismissWarning).toHaveBeenCalledWith('conflict_1');
      });
    });
  });

  describe('dismissal functionality', () => {
    it('should show dismiss button for warnings', () => {
      render(
        <ConflictWarningSystem 
          conflicts={[mockConflicts[1]]} // Warning conflict
          duplicates={[]} 
        />
      );
      
      expect(screen.getByTestId('x')).toBeInTheDocument();
    });

    it('should call onDismissWarning when dismiss button is clicked', () => {
      const onDismissWarning = jest.fn();
      
      render(
        <ConflictWarningSystem 
          conflicts={[mockConflicts[1]]} 
          duplicates={[]} 
          onDismissWarning={onDismissWarning}
        />
      );
      
      const dismissButton = screen.getByTestId('x').closest('button');
      fireEvent.click(dismissButton!);
      
      expect(onDismissWarning).toHaveBeenCalledWith('conflict_1');
    });

    it('should hide dismissed warnings by default', () => {
      const { rerender } = render(
        <ConflictWarningSystem 
          conflicts={[mockConflicts[1]]} 
          duplicates={[]} 
        />
      );
      
      expect(screen.getByText('Student already has a class booked during this time')).toBeInTheDocument();
      
      // Simulate dismissal by clicking dismiss button
      const dismissButton = screen.getByTestId('x').closest('button');
      fireEvent.click(dismissButton!);
      
      // Re-render to simulate state change (this would normally happen in parent component)
      rerender(
        <ConflictWarningSystem 
          conflicts={[]} 
          duplicates={[]} 
        />
      );
      
      expect(screen.getByText('No conflicts detected')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper button roles for clickable elements', () => {
      render(
        <ConflictWarningSystem 
          conflicts={mockConflicts} 
          duplicates={[]} 
        />
      );
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should have proper aria labels or accessible names', () => {
      render(
        <ConflictWarningSystem 
          conflicts={mockConflicts} 
          duplicates={[]} 
        />
      );
      
      // Check that important elements have text content that would be read by screen readers
      expect(screen.getByText('Conflict Detection Summary')).toBeInTheDocument();
      expect(screen.getByText('1 Error')).toBeInTheDocument();
    });
  });
});

describe('ConflictIndicator', () => {
  describe('no conflicts state', () => {
    it('should show check circle when no conflicts exist', () => {
      render(<ConflictIndicator conflicts={[]} duplicates={[]} />);
      expect(screen.getByTestId('check-circle')).toBeInTheDocument();
    });

    it('should show "No conflicts" text when showDetails is true', () => {
      render(<ConflictIndicator conflicts={[]} duplicates={[]} showDetails />);
      expect(screen.getByText('No conflicts')).toBeInTheDocument();
    });
  });

  describe('with conflicts', () => {
    it('should show error indicator for errors', () => {
      const conflicts = [
        {
          type: 'teacher_time_conflict' as const,
          message: 'Error message',
          details: {},
          severity: 'error' as const,
          canProceed: false,
        },
      ];
      
      render(<ConflictIndicator conflicts={conflicts} duplicates={[]} />);
      expect(screen.getByTestId('alert-circle')).toBeInTheDocument();
    });

    it('should show warning indicator for warnings', () => {
      const conflicts = [
        {
          type: 'student_time_conflict' as const,
          message: 'Warning message',
          details: {},
          severity: 'warning' as const,
          canProceed: true,
        },
      ];
      
      render(<ConflictIndicator conflicts={conflicts} duplicates={[]} />);
      expect(screen.getByTestId('alert-triangle')).toBeInTheDocument();
    });

    it('should show error and warning counts when showDetails is true', () => {
      const conflicts = [
        {
          type: 'teacher_time_conflict' as const,
          message: 'Error message',
          details: {},
          severity: 'error' as const,
          canProceed: false,
        },
      ];
      
      const duplicates = [
        {
          type: 'duplicate_enrollment' as const,
          message: 'Warning message',
          details: {},
          severity: 'warning' as const,
          canProceed: true,
        },
      ];
      
      render(
        <ConflictIndicator 
          conflicts={conflicts} 
          duplicates={duplicates} 
          showDetails 
        />
      );
      
      expect(screen.getByText('1 Error')).toBeInTheDocument();
      expect(screen.getByText('1 Warning')).toBeInTheDocument();
    });

    it('should handle different sizes', () => {
      const conflicts = [
        {
          type: 'teacher_time_conflict' as const,
          message: 'Error message',
          details: {},
          severity: 'error' as const,
          canProceed: false,
        },
      ];
      
      const { rerender } = render(
        <ConflictIndicator conflicts={conflicts} duplicates={[]} size="sm" />
      );
      
      expect(screen.getByTestId('alert-circle')).toHaveClass('h-3', 'w-3');
      
      rerender(
        <ConflictIndicator conflicts={conflicts} duplicates={[]} size="lg" />
      );
      
      expect(screen.getByTestId('alert-circle')).toHaveClass('h-5', 'w-5');
    });
  });

  describe('mixed severity levels', () => {
    it('should show both error and warning indicators when both exist', () => {
      const conflicts = [
        {
          type: 'teacher_time_conflict' as const,
          message: 'Error message',
          details: {},
          severity: 'error' as const,
          canProceed: false,
        },
        {
          type: 'student_time_conflict' as const,
          message: 'Warning message',
          details: {},
          severity: 'warning' as const,
          canProceed: true,
        },
      ];
      
      render(<ConflictIndicator conflicts={conflicts} duplicates={[]} />);
      
      expect(screen.getByTestId('alert-circle')).toBeInTheDocument();
      expect(screen.getByTestId('alert-triangle')).toBeInTheDocument();
    });
  });
});