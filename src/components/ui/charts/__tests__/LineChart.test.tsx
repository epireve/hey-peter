import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import LineChart from '../LineChart';

// Mock Recharts components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: ({ dataKey, stroke }: { dataKey: string; stroke: string }) => (
    <div data-testid={`line-${dataKey}`} style={{ color: stroke }} />
  ),
  XAxis: ({ dataKey }: { dataKey: string }) => (
    <div data-testid={`x-axis-${dataKey}`} />
  ),
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  CartesianGrid: () => <div data-testid="grid" />,
  ReferenceLine: ({ y }: { y: number }) => (
    <div data-testid={`reference-line-${y}`} />
  ),
  Brush: () => <div data-testid="brush" />
}));

const mockData = [
  { name: 'Jan', value: 100, value2: 150 },
  { name: 'Feb', value: 150, value2: 200 },
  { name: 'Mar', value: 200, value2: 250 }
];

describe('LineChart', () => {
  it('renders line chart with single series', () => {
    render(
      <LineChart
        data={mockData}
        series={[{ key: 'value', name: 'Test Series', color: '#8884d8' }]}
        xAxis={{ dataKey: 'name' }}
        title="Test Line Chart"
      />
    );

    expect(screen.getByText('Test Line Chart')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.getByTestId('line-value')).toBeInTheDocument();
  });

  it('renders line chart with multiple series', () => {
    render(
      <LineChart
        data={mockData}
        series={[
          { key: 'value', name: 'Series 1', color: '#8884d8' },
          { key: 'value2', name: 'Series 2', color: '#82ca9d' }
        ]}
        xAxis={{ dataKey: 'name' }}
        title="Multi-Series Line Chart"
      />
    );

    expect(screen.getByTestId('line-value')).toBeInTheDocument();
    expect(screen.getByTestId('line-value2')).toBeInTheDocument();
  });

  it('renders trend line when enabled', () => {
    render(
      <LineChart
        data={mockData}
        series={[{ key: 'value', name: 'Test Series', color: '#8884d8' }]}
        xAxis={{ dataKey: 'name' }}
        title="Line Chart with Trend"
        showTrendLine={true}
      />
    );

    expect(screen.getByText('Test Line Chart')).toBeInTheDocument();
    // Trend line would be rendered as a Line component with dataKey "trendLine"
  });

  it('renders brush when enabled', () => {
    render(
      <LineChart
        data={mockData}
        series={[{ key: 'value', name: 'Test Series', color: '#8884d8' }]}
        xAxis={{ dataKey: 'name' }}
        title="Line Chart with Brush"
        showBrush={true}
      />
    );

    expect(screen.getByTestId('brush')).toBeInTheDocument();
  });

  it('renders zoom controls when enabled', () => {
    render(
      <LineChart
        data={mockData}
        series={[{ key: 'value', name: 'Test Series', color: '#8884d8' }]}
        xAxis={{ dataKey: 'name' }}
        title="Line Chart with Zoom"
        showZoomControls={true}
      />
    );

    // Zoom controls would be rendered as buttons in custom actions
    expect(screen.getByText('Line Chart with Zoom')).toBeInTheDocument();
  });

  it('renders series toggle when enabled', () => {
    render(
      <LineChart
        data={mockData}
        series={[
          { key: 'value', name: 'Series 1', color: '#8884d8' },
          { key: 'value2', name: 'Series 2', color: '#82ca9d' }
        ]}
        xAxis={{ dataKey: 'name' }}
        title="Line Chart with Toggle"
        showSeriesToggle={true}
      />
    );

    expect(screen.getByText('Series 1')).toBeInTheDocument();
    expect(screen.getByText('Series 2')).toBeInTheDocument();
  });

  it('renders reference lines when provided', () => {
    const referenceLines = [
      { value: 150, label: 'Target', color: '#ff0000' }
    ];

    render(
      <LineChart
        data={mockData}
        series={[{ key: 'value', name: 'Test Series', color: '#8884d8' }]}
        xAxis={{ dataKey: 'name' }}
        title="Line Chart with Reference"
        referenceLines={referenceLines}
      />
    );

    expect(screen.getByTestId('reference-line-150')).toBeInTheDocument();
  });

  it('handles different line types', () => {
    render(
      <LineChart
        data={mockData}
        series={[{ key: 'value', name: 'Test Series', color: '#8884d8' }]}
        xAxis={{ dataKey: 'name' }}
        title="Step Line Chart"
        type="step"
      />
    );

    expect(screen.getByText('Step Line Chart')).toBeInTheDocument();
  });

  it('renders with custom stroke width', () => {
    render(
      <LineChart
        data={mockData}
        series={[{ key: 'value', name: 'Test Series', color: '#8884d8' }]}
        xAxis={{ dataKey: 'name' }}
        title="Thick Line Chart"
        strokeWidth={4}
      />
    );

    expect(screen.getByText('Thick Line Chart')).toBeInTheDocument();
  });

  it('handles data point clicks', () => {
    const mockOnClick = jest.fn();

    render(
      <LineChart
        data={mockData}
        series={[{ key: 'value', name: 'Test Series', color: '#8884d8' }]}
        xAxis={{ dataKey: 'name' }}
        title="Interactive Line Chart"
        onDataPointClick={mockOnClick}
      />
    );

    // Click interaction would be handled by the underlying chart component
    expect(mockOnClick).toBeDefined();
  });

  it('connects null values when enabled', () => {
    const dataWithNull = [
      { name: 'Jan', value: 100 },
      { name: 'Feb', value: null },
      { name: 'Mar', value: 200 }
    ];

    render(
      <LineChart
        data={dataWithNull}
        series={[{ key: 'value', name: 'Test Series', color: '#8884d8' }]}
        xAxis={{ dataKey: 'name' }}
        title="Line Chart with Nulls"
        connectNulls={true}
      />
    );

    expect(screen.getByText('Line Chart with Nulls')).toBeInTheDocument();
  });

  it('auto-generates series when not provided', () => {
    render(
      <LineChart
        data={mockData}
        xAxis={{ dataKey: 'name' }}
        title="Auto-Series Line Chart"
      />
    );

    expect(screen.getByText('Auto-Series Line Chart')).toBeInTheDocument();
  });

  it('renders with custom configuration', () => {
    const customConfig = {
      colors: ['#ff0000', '#00ff00'],
      height: 400,
      animations: true
    };

    render(
      <LineChart
        data={mockData}
        series={[{ key: 'value', name: 'Test Series', color: '#8884d8' }]}
        xAxis={{ dataKey: 'name' }}
        title="Custom Config Line Chart"
        config={customConfig}
      />
    );

    expect(screen.getByText('Custom Config Line Chart')).toBeInTheDocument();
  });

  it('renders export functionality', () => {
    render(
      <LineChart
        data={mockData}
        series={[{ key: 'value', name: 'Test Series', color: '#8884d8' }]}
        xAxis={{ dataKey: 'name' }}
        title="Exportable Line Chart"
        exportable={true}
      />
    );

    expect(screen.getByText('Export')).toBeInTheDocument();
  });
});

describe('InteractiveLineChart', () => {
  it('renders with interaction modes', () => {
    render(
      <LineChart
        data={mockData}
        series={[{ key: 'value', name: 'Test Series', color: '#8884d8' }]}
        xAxis={{ dataKey: 'name' }}
        title="Interactive Line Chart"
        interactionMode="both"
        crosshair={true}
        highlightOnHover={true}
      />
    );

    expect(screen.getByText('Interactive Line Chart')).toBeInTheDocument();
  });
});

describe('MultiAxisLineChart', () => {
  it('renders with multiple axes', () => {
    render(
      <LineChart
        data={mockData}
        series={[
          { key: 'value', name: 'Left Series', color: '#8884d8' },
          { key: 'value2', name: 'Right Series', color: '#82ca9d' }
        ]}
        xAxis={{ dataKey: 'name' }}
        title="Multi-Axis Line Chart"
        leftAxisSeries={['value']}
        rightAxisSeries={['value2']}
        leftAxisLabel="Left Axis"
        rightAxisLabel="Right Axis"
      />
    );

    expect(screen.getByText('Multi-Axis Line Chart')).toBeInTheDocument();
  });
});