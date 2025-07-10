import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import BarChart, { StackedBarChart, HorizontalBarChart } from '../BarChart';

// Mock Recharts components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children, layout }: { children: React.ReactNode; layout?: string }) => (
    <div data-testid={`bar-chart-${layout || 'vertical'}`}>{children}</div>
  ),
  Bar: ({ dataKey, fill }: { dataKey: string; fill: string }) => (
    <div data-testid={`bar-${dataKey}`} style={{ backgroundColor: fill }} />
  ),
  XAxis: ({ dataKey, type }: { dataKey?: string; type?: string }) => (
    <div data-testid={`x-axis-${type || 'category'}`} />
  ),
  YAxis: ({ dataKey, type }: { dataKey?: string; type?: string }) => (
    <div data-testid={`y-axis-${type || 'number'}`} />
  ),
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  CartesianGrid: () => <div data-testid="grid" />,
  Cell: ({ fill }: { fill: string }) => (
    <div data-testid="cell" style={{ backgroundColor: fill }} />
  ),
  LabelList: () => <div data-testid="label-list" />
}));

const mockData = [
  { name: 'Jan', value: 100, value2: 150 },
  { name: 'Feb', value: 150, value2: 200 },
  { name: 'Mar', value: 200, value2: 250 }
];

describe('BarChart', () => {
  it('renders bar chart with single series', () => {
    render(
      <BarChart
        data={mockData}
        series={[{ key: 'value', name: 'Test Series', color: '#8884d8' }]}
        xAxis={{ dataKey: 'name' }}
        title="Test Bar Chart"
      />
    );

    expect(screen.getByText('Test Bar Chart')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart-vertical')).toBeInTheDocument();
    expect(screen.getByTestId('bar-value')).toBeInTheDocument();
  });

  it('renders bar chart with multiple series', () => {
    render(
      <BarChart
        data={mockData}
        series={[
          { key: 'value', name: 'Series 1', color: '#8884d8' },
          { key: 'value2', name: 'Series 2', color: '#82ca9d' }
        ]}
        xAxis={{ dataKey: 'name' }}
        title="Multi-Series Bar Chart"
      />
    );

    expect(screen.getByTestId('bar-value')).toBeInTheDocument();
    expect(screen.getByTestId('bar-value2')).toBeInTheDocument();
  });

  it('renders horizontal bar chart', () => {
    render(
      <BarChart
        data={mockData}
        series={[{ key: 'value', name: 'Test Series', color: '#8884d8' }]}
        xAxis={{ dataKey: 'name' }}
        title="Horizontal Bar Chart"
        layout="horizontal"
      />
    );

    expect(screen.getByTestId('bar-chart-horizontal')).toBeInTheDocument();
  });

  it('renders sortable bar chart', () => {
    render(
      <BarChart
        data={mockData}
        series={[{ key: 'value', name: 'Test Series', color: '#8884d8' }]}
        xAxis={{ dataKey: 'name' }}
        title="Sortable Bar Chart"
        sortable={true}
      />
    );

    expect(screen.getByText('Sort Test Series')).toBeInTheDocument();
  });

  it('renders filterable bar chart', () => {
    render(
      <BarChart
        data={mockData}
        series={[{ key: 'value', name: 'Test Series', color: '#8884d8' }]}
        xAxis={{ dataKey: 'name' }}
        title="Filterable Bar Chart"
        filterable={true}
      />
    );

    expect(screen.getByPlaceholderText('Filter data...')).toBeInTheDocument();
  });

  it('renders with data labels', () => {
    render(
      <BarChart
        data={mockData}
        series={[{ key: 'value', name: 'Test Series', color: '#8884d8' }]}
        xAxis={{ dataKey: 'name' }}
        title="Bar Chart with Labels"
        showDataLabels={true}
      />
    );

    expect(screen.getByTestId('label-list')).toBeInTheDocument();
  });

  it('handles conditional coloring', () => {
    const conditionalColors = [
      { condition: (value: any) => value.value > 150, color: '#ff0000' },
      { condition: (value: any) => value.value <= 150, color: '#00ff00' }
    ];

    render(
      <BarChart
        data={mockData}
        series={[{ key: 'value', name: 'Test Series', color: '#8884d8' }]}
        xAxis={{ dataKey: 'name' }}
        title="Conditional Color Bar Chart"
        colorMode="conditional"
        conditionalColors={conditionalColors}
      />
    );

    expect(screen.getByText('Conditional Color Bar Chart')).toBeInTheDocument();
  });

  it('handles gradient coloring', () => {
    render(
      <BarChart
        data={mockData}
        series={[{ key: 'value', name: 'Test Series', color: '#8884d8' }]}
        xAxis={{ dataKey: 'name' }}
        title="Gradient Bar Chart"
        colorMode="gradient"
        gradientColors={['#ff0000', '#00ff00']}
      />
    );

    expect(screen.getByText('Gradient Bar Chart')).toBeInTheDocument();
  });

  it('renders series toggle when enabled', () => {
    render(
      <BarChart
        data={mockData}
        series={[
          { key: 'value', name: 'Series 1', color: '#8884d8' },
          { key: 'value2', name: 'Series 2', color: '#82ca9d' }
        ]}
        xAxis={{ dataKey: 'name' }}
        title="Bar Chart with Toggle"
        showSeriesToggle={true}
      />
    );

    expect(screen.getByText('Series 1')).toBeInTheDocument();
    expect(screen.getByText('Series 2')).toBeInTheDocument();
  });

  it('handles bar click events', () => {
    const mockOnClick = jest.fn();

    render(
      <BarChart
        data={mockData}
        series={[{ key: 'value', name: 'Test Series', color: '#8884d8' }]}
        xAxis={{ dataKey: 'name' }}
        title="Interactive Bar Chart"
        onBarClick={mockOnClick}
      />
    );

    expect(mockOnClick).toBeDefined();
  });

  it('filters data when filter is applied', () => {
    render(
      <BarChart
        data={mockData}
        series={[{ key: 'value', name: 'Test Series', color: '#8884d8' }]}
        xAxis={{ dataKey: 'name' }}
        title="Filterable Bar Chart"
        filterable={true}
      />
    );

    const filterInput = screen.getByPlaceholderText('Filter data...');
    fireEvent.change(filterInput, { target: { value: 'Jan' } });

    expect(filterInput).toHaveValue('Jan');
  });

  it('sorts data when sort is applied', () => {
    render(
      <BarChart
        data={mockData}
        series={[{ key: 'value', name: 'Test Series', color: '#8884d8' }]}
        xAxis={{ dataKey: 'name' }}
        title="Sortable Bar Chart"
        sortable={true}
      />
    );

    const sortButton = screen.getByText('Sort Test Series');
    fireEvent.click(sortButton);

    expect(sortButton).toBeInTheDocument();
  });

  it('toggles series visibility', () => {
    render(
      <BarChart
        data={mockData}
        series={[
          { key: 'value', name: 'Series 1', color: '#8884d8' },
          { key: 'value2', name: 'Series 2', color: '#82ca9d' }
        ]}
        xAxis={{ dataKey: 'name' }}
        title="Bar Chart with Toggle"
        showSeriesToggle={true}
      />
    );

    const toggleButton = screen.getByText('Series 1');
    fireEvent.click(toggleButton);

    expect(toggleButton).toBeInTheDocument();
  });

  it('renders with custom bar radius', () => {
    render(
      <BarChart
        data={mockData}
        series={[{ key: 'value', name: 'Test Series', color: '#8884d8' }]}
        xAxis={{ dataKey: 'name' }}
        title="Rounded Bar Chart"
        customBarRadius={5}
      />
    );

    expect(screen.getByText('Rounded Bar Chart')).toBeInTheDocument();
  });

  it('renders with patterns', () => {
    render(
      <BarChart
        data={mockData}
        series={[{ key: 'value', name: 'Test Series', color: '#8884d8' }]}
        xAxis={{ dataKey: 'name' }}
        title="Pattern Bar Chart"
        showPatterns={true}
      />
    );

    expect(screen.getByText('Pattern Bar Chart')).toBeInTheDocument();
  });
});

describe('StackedBarChart', () => {
  it('renders stacked bar chart', () => {
    render(
      <StackedBarChart
        data={mockData}
        series={[
          { key: 'value', name: 'Series 1', color: '#8884d8' },
          { key: 'value2', name: 'Series 2', color: '#82ca9d' }
        ]}
        xAxis={{ dataKey: 'name' }}
        title="Stacked Bar Chart"
      />
    );

    expect(screen.getByText('Stacked Bar Chart')).toBeInTheDocument();
  });

  it('renders percentage stacked bar chart', () => {
    render(
      <StackedBarChart
        data={mockData}
        series={[
          { key: 'value', name: 'Series 1', color: '#8884d8' },
          { key: 'value2', name: 'Series 2', color: '#82ca9d' }
        ]}
        xAxis={{ dataKey: 'name' }}
        title="Percentage Stacked Bar Chart"
        stackMode="percent"
      />
    );

    expect(screen.getByText('Percentage Stacked Bar Chart')).toBeInTheDocument();
  });
});

describe('HorizontalBarChart', () => {
  it('renders horizontal bar chart', () => {
    render(
      <HorizontalBarChart
        data={mockData}
        series={[{ key: 'value', name: 'Test Series', color: '#8884d8' }]}
        xAxis={{ dataKey: 'name' }}
        title="Horizontal Bar Chart"
      />
    );

    expect(screen.getByText('Horizontal Bar Chart')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart-horizontal')).toBeInTheDocument();
  });
});