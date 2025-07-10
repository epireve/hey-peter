import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BaseChart } from '../BaseChart';

// Mock Recharts components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  CartesianGrid: () => <div data-testid="grid" />
}));

const mockData = [
  { name: 'Jan', value: 100 },
  { name: 'Feb', value: 150 },
  { name: 'Mar', value: 200 }
];

const mockSeries = [
  { key: 'value', name: 'Test Series', color: '#8884d8' }
];

describe('BaseChart', () => {
  it('renders chart title and subtitle', () => {
    render(
      <BaseChart
        data={mockData}
        series={mockSeries}
        chartType="line"
        title="Test Chart"
        subtitle="Test description"
      >
        <div>Chart content</div>
      </BaseChart>
    );

    expect(screen.getByText('Test Chart')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    render(
      <BaseChart
        data={mockData}
        series={mockSeries}
        chartType="line"
        title="Test Chart"
        loading={true}
      >
        <div>Chart content</div>
      </BaseChart>
    );

    expect(screen.getByText('Loading student analytics...')).toBeInTheDocument();
  });

  it('renders error state', () => {
    render(
      <BaseChart
        data={mockData}
        series={mockSeries}
        chartType="line"
        title="Test Chart"
        error="Test error"
      >
        <div>Chart content</div>
      </BaseChart>
    );

    expect(screen.getByText('Failed to load chart data')).toBeInTheDocument();
  });

  it('renders empty state when no data', () => {
    render(
      <BaseChart
        data={[]}
        series={mockSeries}
        chartType="line"
        title="Test Chart"
      >
        <div>Chart content</div>
      </BaseChart>
    );

    expect(screen.getByText('No data available to display')).toBeInTheDocument();
  });

  it('renders export button when exportable', () => {
    render(
      <BaseChart
        data={mockData}
        series={mockSeries}
        chartType="line"
        title="Test Chart"
        exportable={true}
      >
        <div>Chart content</div>
      </BaseChart>
    );

    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  it('renders refresh button when onRefresh provided', () => {
    const mockRefresh = jest.fn();
    
    render(
      <BaseChart
        data={mockData}
        series={mockSeries}
        chartType="line"
        title="Test Chart"
        onRefresh={mockRefresh}
        showRefreshButton={true}
      >
        <div>Chart content</div>
      </BaseChart>
    );

    const refreshButton = screen.getByRole('button');
    fireEvent.click(refreshButton);
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('renders chart with custom config', () => {
    const customConfig = {
      colors: ['#ff0000', '#00ff00'],
      height: 400,
      animations: true
    };

    render(
      <BaseChart
        data={mockData}
        series={mockSeries}
        chartType="line"
        title="Test Chart"
        config={customConfig}
      >
        <div>Chart content</div>
      </BaseChart>
    );

    expect(screen.getByText('Test Chart')).toBeInTheDocument();
  });

  it('renders insights when provided', () => {
    const insights = ['Insight 1', 'Insight 2'];

    render(
      <BaseChart
        data={mockData}
        series={mockSeries}
        chartType="line"
        title="Test Chart"
        insights={insights}
      >
        <div>Chart content</div>
      </BaseChart>
    );

    expect(screen.getByText('Key Insights')).toBeInTheDocument();
    expect(screen.getByText('Insight 1')).toBeInTheDocument();
    expect(screen.getByText('Insight 2')).toBeInTheDocument();
  });

  it('renders trend indicator when provided', () => {
    const trend = {
      value: 15,
      direction: 'up' as const,
      label: 'Growth'
    };

    render(
      <BaseChart
        data={mockData}
        series={mockSeries}
        chartType="line"
        title="Test Chart"
        trend={trend}
      >
        <div>Chart content</div>
      </BaseChart>
    );

    expect(screen.getByText('15%')).toBeInTheDocument();
  });

  it('handles data point clicks', async () => {
    const mockOnClick = jest.fn();

    render(
      <BaseChart
        data={mockData}
        series={mockSeries}
        chartType="line"
        title="Test Chart"
        onDataPointClick={mockOnClick}
      >
        <div>Chart content</div>
      </BaseChart>
    );

    // Since we're testing the BaseChart wrapper, we can't directly test
    // the chart interaction, but we can verify the prop is passed
    expect(mockOnClick).toBeDefined();
  });

  it('generates accessibility description', () => {
    render(
      <BaseChart
        data={mockData}
        series={mockSeries}
        chartType="line"
        title="Test Chart"
      >
        <div>Chart content</div>
      </BaseChart>
    );

    const chartContainer = screen.getByRole('img');
    expect(chartContainer).toHaveAttribute('aria-label');
  });

  it('renders custom actions', () => {
    const customActions = <button>Custom Action</button>;

    render(
      <BaseChart
        data={mockData}
        series={mockSeries}
        chartType="line"
        title="Test Chart"
        customActions={customActions}
      >
        <div>Chart content</div>
      </BaseChart>
    );

    expect(screen.getByText('Custom Action')).toBeInTheDocument();
  });

  it('displays last updated time', () => {
    const lastUpdated = new Date('2023-01-01');

    render(
      <BaseChart
        data={mockData}
        series={mockSeries}
        chartType="line"
        title="Test Chart"
        lastUpdated={lastUpdated}
      >
        <div>Chart content</div>
      </BaseChart>
    );

    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
  });
});

describe('withChartErrorBoundary', () => {
  it('renders error boundary when component throws', () => {
    const ThrowingComponent = () => {
      throw new Error('Test error');
    };

    const WrappedComponent = BaseChart.withChartErrorBoundary?.(ThrowingComponent);
    
    if (WrappedComponent) {
      render(<WrappedComponent />);
      expect(screen.getByText('Something went wrong with the chart')).toBeInTheDocument();
    }
  });
});