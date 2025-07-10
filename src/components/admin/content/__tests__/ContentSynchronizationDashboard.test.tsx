import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import ContentSynchronizationDashboard from '../ContentSynchronizationDashboard';

// Mock the service modules
jest.mock('@/lib/services/content-synchronization-service', () => ({
  contentSynchronizationService: {
    getStatistics: jest.fn(),
    getActiveOperations: jest.fn(),
    getConflicts: jest.fn()
  }
}));

jest.mock('@/lib/services/content-sync-scheduler', () => ({
  contentSyncScheduler: {
    getAutomationStats: jest.fn()
  }
}));

jest.mock('@/lib/services/content-sync-integration', () => ({
  contentSyncIntegration: {
    getIntegrationStats: jest.fn(),
    forceSyncClass: jest.fn()
  }
}));

// Mock the services
const mockContentSynchronizationService = {
  getStatistics: jest.fn(),
  getActiveOperations: jest.fn(),
  getConflicts: jest.fn()
};

const mockContentSyncScheduler = {
  getAutomationStats: jest.fn()
};

const mockContentSyncIntegration = {
  getIntegrationStats: jest.fn(),
  forceSyncClass: jest.fn()
};

describe('ContentSynchronizationDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock returns
    mockContentSynchronizationService.getStatistics.mockReturnValue({
      totalGroups: 5,
      activeOperations: 2,
      pendingConflicts: 1,
      completedSyncs: 15,
      failedSyncs: 2
    });

    mockContentSyncIntegration.getIntegrationStats.mockReturnValue({
      totalClassGroups: 5,
      syncEnabledGroups: 4,
      recentSyncs: 3,
      pendingOperations: 2,
      integrationHealth: 'healthy'
    });

    mockContentSyncScheduler.getAutomationStats.mockReturnValue({
      totalSchedules: 3,
      activeSchedules: 2,
      totalJobs: 10,
      completedJobs: 8,
      failedJobs: 1,
      averageJobDuration: 1500
    });

    mockContentSynchronizationService.getActiveOperations.mockReturnValue([
      {
        id: 'op-1',
        operationType: 'sync',
        sourceGroupId: 'group-1',
        targetGroupIds: ['group-2'],
        status: 'in_progress',
        scheduledAt: '2024-01-15T10:00:00Z'
      },
      {
        id: 'op-2',
        operationType: 'batch_sync',
        sourceGroupId: 'group-3',
        targetGroupIds: ['group-4', 'group-5'],
        status: 'completed',
        scheduledAt: '2024-01-15T09:30:00Z'
      }
    ]);

    mockContentSynchronizationService.getConflicts.mockReturnValue([
      {
        id: 'conflict-1',
        conflictType: 'version_mismatch',
        sourceGroupId: 'group-1',
        targetGroupId: 'group-2',
        severity: 'medium',
        description: 'Version mismatch between groups',
        suggestedResolution: 'merge'
      }
    ]);

    // Replace the actual services with mocks
    require('@/lib/services/content-synchronization-service').contentSynchronizationService = mockContentSynchronizationService;
    require('@/lib/services/content-sync-scheduler').contentSyncScheduler = mockContentSyncScheduler;
    require('@/lib/services/content-sync-integration').contentSyncIntegration = mockContentSyncIntegration;
  });

  describe('Rendering and Initial Load', () => {
    it('should render loading state initially', () => {
      render(<ContentSynchronizationDashboard />);
      
      // Should show loading skeletons
      expect(screen.getAllByRole('generic')).toHaveLength(4); // 4 skeleton cards
    });

    it('should render dashboard with statistics after loading', async () => {
      render(<ContentSynchronizationDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Total Groups')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument(); // totalGroups value
        expect(screen.getByText('Active Operations')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument(); // activeOperations value
      });
    });

    it('should calculate and display success rate correctly', async () => {
      render(<ContentSynchronizationDashboard />);

      await waitFor(() => {
        // Success rate should be 15/(15+2) = 88% (rounded)
        expect(screen.getByText('88%')).toBeInTheDocument();
        expect(screen.getByText('15 of 17 completed')).toBeInTheDocument();
      });
    });

    it('should display system health status', async () => {
      render(<ContentSynchronizationDashboard />);

      await waitFor(() => {
        expect(screen.getByText('System Health')).toBeInTheDocument();
        expect(screen.getByText('Healthy')).toBeInTheDocument();
      });
    });
  });

  describe('Health Alerts', () => {
    it('should show warning alert when integration health is warning', async () => {
      mockContentSyncIntegration.getIntegrationStats.mockReturnValue({
        totalClassGroups: 5,
        syncEnabledGroups: 4,
        recentSyncs: 3,
        pendingOperations: 2,
        integrationHealth: 'warning'
      });

      render(<ContentSynchronizationDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/warnings that should be reviewed/)).toBeInTheDocument();
      });
    });

    it('should show error alert when integration health is error', async () => {
      mockContentSyncIntegration.getIntegrationStats.mockReturnValue({
        totalClassGroups: 5,
        syncEnabledGroups: 4,
        recentSyncs: 3,
        pendingOperations: 2,
        integrationHealth: 'error'
      });

      render(<ContentSynchronizationDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/errors that require attention/)).toBeInTheDocument();
      });
    });

    it('should not show alerts when health is healthy', async () => {
      render(<ContentSynchronizationDashboard />);

      await waitFor(() => {
        expect(screen.queryByText(/warnings/)).not.toBeInTheDocument();
        expect(screen.queryByText(/errors/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Tab Navigation', () => {
    it('should render all tab options', async () => {
      render(<ContentSynchronizationDashboard />);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Operations' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Conflicts' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Settings' })).toBeInTheDocument();
      });
    });

    it('should switch to operations tab when clicked', async () => {
      render(<ContentSynchronizationDashboard />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('tab', { name: 'Operations' }));
      });

      expect(screen.getByText('Active Operations')).toBeInTheDocument();
      expect(screen.getByText('Currently running synchronization operations')).toBeInTheDocument();
    });

    it('should switch to conflicts tab when clicked', async () => {
      render(<ContentSynchronizationDashboard />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('tab', { name: 'Conflicts' }));
      });

      expect(screen.getByText('Synchronization Conflicts')).toBeInTheDocument();
      expect(screen.getByText('Conflicts requiring resolution')).toBeInTheDocument();
    });
  });

  describe('Overview Tab', () => {
    it('should display recent sync activity', async () => {
      render(<ContentSynchronizationDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Recent Sync Activity')).toBeInTheDocument();
        expect(screen.getByText('Sync Operation')).toBeInTheDocument();
        expect(screen.getByText('Batch_sync Operation')).toBeInTheDocument();
      });
    });

    it('should display sync performance metrics', async () => {
      render(<ContentSynchronizationDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Sync Performance')).toBeInTheDocument();
        expect(screen.getByText('Successful Operations')).toBeInTheDocument();
        expect(screen.getByText('Recent Syncs (Last Hour)')).toBeInTheDocument();
        expect(screen.getByText('Conflict Resolution')).toBeInTheDocument();
      });
    });

    it('should show empty state when no recent activity', async () => {
      mockContentSynchronizationService.getActiveOperations.mockReturnValue([]);

      render(<ContentSynchronizationDashboard />);

      await waitFor(() => {
        expect(screen.getByText('No recent activity')).toBeInTheDocument();
      });
    });
  });

  describe('Operations Tab', () => {
    it('should display active operations with details', async () => {
      render(<ContentSynchronizationDashboard />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('tab', { name: 'Operations' }));
      });

      expect(screen.getByText('Sync Operation')).toBeInTheDocument();
      expect(screen.getByText('Source: group-1 → 1 target(s)')).toBeInTheDocument();
      expect(screen.getByText('Batch_sync Operation')).toBeInTheDocument();
      expect(screen.getByText('Source: group-3 → 2 target(s)')).toBeInTheDocument();
    });

    it('should show empty state when no active operations', async () => {
      mockContentSynchronizationService.getActiveOperations.mockReturnValue([]);

      render(<ContentSynchronizationDashboard />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('tab', { name: 'Operations' }));
      });

      expect(screen.getByText('No active operations')).toBeInTheDocument();
    });

    it('should display retry button for failed operations', async () => {
      mockContentSynchronizationService.getActiveOperations.mockReturnValue([
        {
          id: 'op-failed',
          operationType: 'sync',
          sourceGroupId: 'group-1',
          targetGroupIds: ['group-2'],
          status: 'failed',
          scheduledAt: '2024-01-15T10:00:00Z',
          error: 'Network timeout'
        }
      ]);

      render(<ContentSynchronizationDashboard />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('tab', { name: 'Operations' }));
      });

      expect(screen.getByText('Retry')).toBeInTheDocument();
      expect(screen.getByText('Network timeout')).toBeInTheDocument();
    });
  });

  describe('Conflicts Tab', () => {
    it('should display conflicts with resolution options', async () => {
      render(<ContentSynchronizationDashboard />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('tab', { name: 'Conflicts' }));
      });

      expect(screen.getByText('version_mismatch')).toBeInTheDocument();
      expect(screen.getByText('group-1 ↔ group-2')).toBeInTheDocument();
      expect(screen.getByText('Version mismatch between groups')).toBeInTheDocument();
      expect(screen.getByText('Suggested: merge')).toBeInTheDocument();
      expect(screen.getByText('Review')).toBeInTheDocument();
      expect(screen.getByText('Resolve')).toBeInTheDocument();
    });

    it('should show no conflicts message when conflicts list is empty', async () => {
      mockContentSynchronizationService.getConflicts.mockReturnValue([]);

      render(<ContentSynchronizationDashboard />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('tab', { name: 'Conflicts' }));
      });

      expect(screen.getByText('No conflicts detected')).toBeInTheDocument();
    });
  });

  describe('Settings Tab', () => {
    it('should display configuration options', async () => {
      render(<ContentSynchronizationDashboard />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('tab', { name: 'Settings' }));
      });

      expect(screen.getByText('Synchronization Settings')).toBeInTheDocument();
      expect(screen.getByText('Auto-sync on Scheduling')).toBeInTheDocument();
      expect(screen.getByText('Real-time Synchronization')).toBeInTheDocument();
      expect(screen.getByText('Conflict Resolution')).toBeInTheDocument();
      expect(screen.getAllByText('Configure')).toHaveLength(3);
    });
  });

  describe('Interactive Features', () => {
    it('should handle refresh button click', async () => {
      render(<ContentSynchronizationDashboard />);

      await waitFor(() => {
        const refreshButton = screen.getByRole('button', { name: /refresh/i });
        fireEvent.click(refreshButton);
      });

      // Should call the service methods again
      expect(mockContentSynchronizationService.getStatistics).toHaveBeenCalledTimes(2);
      expect(mockContentSyncIntegration.getIntegrationStats).toHaveBeenCalledTimes(2);
    });

    it('should handle retry button click for failed operations', async () => {
      mockContentSynchronizationService.getActiveOperations.mockReturnValue([
        {
          id: 'op-failed',
          operationType: 'sync',
          sourceGroupId: 'group-1',
          targetGroupIds: ['group-2'],
          status: 'failed',
          scheduledAt: '2024-01-15T10:00:00Z',
          error: 'Network timeout'
        }
      ]);

      render(<ContentSynchronizationDashboard />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('tab', { name: 'Operations' }));
      });

      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);

      expect(mockContentSyncIntegration.forceSyncClass).toHaveBeenCalledWith('group-1');
    });

    it('should handle operations tab refresh', async () => {
      render(<ContentSynchronizationDashboard />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('tab', { name: 'Operations' }));
      });

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(refreshButton);

      expect(mockContentSynchronizationService.getActiveOperations).toHaveBeenCalledTimes(2);
    });
  });

  describe('Status Badges', () => {
    it('should render correct status badges for different states', async () => {
      mockContentSynchronizationService.getActiveOperations.mockReturnValue([
        {
          id: 'op-1',
          operationType: 'sync',
          sourceGroupId: 'group-1',
          targetGroupIds: ['group-2'],
          status: 'pending',
          scheduledAt: '2024-01-15T10:00:00Z'
        },
        {
          id: 'op-2',
          operationType: 'sync',
          sourceGroupId: 'group-3',
          targetGroupIds: ['group-4'],
          status: 'in_progress',
          scheduledAt: '2024-01-15T09:30:00Z'
        },
        {
          id: 'op-3',
          operationType: 'sync',
          sourceGroupId: 'group-5',
          targetGroupIds: ['group-6'],
          status: 'completed',
          scheduledAt: '2024-01-15T09:00:00Z'
        },
        {
          id: 'op-4',
          operationType: 'sync',
          sourceGroupId: 'group-7',
          targetGroupIds: ['group-8'],
          status: 'failed',
          scheduledAt: '2024-01-15T08:30:00Z'
        }
      ]);

      render(<ContentSynchronizationDashboard />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('tab', { name: 'Operations' }));
      });

      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });

    it('should render correct health badges for different states', async () => {
      // Test different health states
      const healthStates = ['healthy', 'warning', 'error'];
      
      for (const health of healthStates) {
        mockContentSyncIntegration.getIntegrationStats.mockReturnValue({
          totalClassGroups: 5,
          syncEnabledGroups: 4,
          recentSyncs: 3,
          pendingOperations: 2,
          integrationHealth: health
        });

        const { unmount } = render(<ContentSynchronizationDashboard />);

        await waitFor(() => {
          const expectedText = health.charAt(0).toUpperCase() + health.slice(1);
          expect(screen.getByText(expectedText)).toBeInTheDocument();
        });

        unmount();
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      mockContentSynchronizationService.getStatistics.mockImplementation(() => {
        throw new Error('Service error');
      });

      // Should not crash
      render(<ContentSynchronizationDashboard />);

      await waitFor(() => {
        // Should show some default state or error handling
        expect(screen.getByText('Total Groups')).toBeInTheDocument();
      });
    });

    it('should handle force sync errors', async () => {
      mockContentSyncIntegration.forceSyncClass.mockRejectedValue(new Error('Sync failed'));

      mockContentSynchronizationService.getActiveOperations.mockReturnValue([
        {
          id: 'op-failed',
          operationType: 'sync',
          sourceGroupId: 'group-1',
          targetGroupIds: ['group-2'],
          status: 'failed',
          scheduledAt: '2024-01-15T10:00:00Z'
        }
      ]);

      render(<ContentSynchronizationDashboard />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('tab', { name: 'Operations' }));
      });

      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);

      // Should handle the error gracefully
      await waitFor(() => {
        expect(mockContentSyncIntegration.forceSyncClass).toHaveBeenCalled();
      });
    });
  });

  describe('Progress Indicators', () => {
    it('should display progress bars for in-progress operations', async () => {
      mockContentSynchronizationService.getActiveOperations.mockReturnValue([
        {
          id: 'op-1',
          operationType: 'sync',
          sourceGroupId: 'group-1',
          targetGroupIds: ['group-2'],
          status: 'in_progress',
          progress: 75,
          scheduledAt: '2024-01-15T10:00:00Z'
        }
      ]);

      render(<ContentSynchronizationDashboard />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('tab', { name: 'Operations' }));
      });

      expect(screen.getByText('75% complete')).toBeInTheDocument();
    });

    it('should display performance metrics with progress bars', async () => {
      render(<ContentSynchronizationDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Successful Operations')).toBeInTheDocument();
        expect(screen.getByText('Recent Syncs (Last Hour)')).toBeInTheDocument();
        expect(screen.getByText('Conflict Resolution')).toBeInTheDocument();
      });

      // Should have progress bars for each metric
      const progressElements = screen.getAllByRole('progressbar');
      expect(progressElements.length).toBeGreaterThan(0);
    });
  });
});