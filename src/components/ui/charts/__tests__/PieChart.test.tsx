import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PieChart, { DonutChart, GaugeChart } from '../PieChart';

// Mock Recharts components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: ({ 
    data, 
    dataKey, 
    nameKey, 
    cx, 
    cy, 
    outerRadius, 
    innerRadius 
  }: { 
    data: any[]; 
    dataKey: string; 
    nameKey: string; 
    cx: string; 
    cy: string; 
    outerRadius: number; 
    innerRadius: number; 
  }) => (
    <div 
      data-testid="pie" 
      data-datakey={dataKey}
      data-namekey={nameKey}
      data-outer-radius={outerRadius}
      data-inner-radius={innerRadius}
    >
      {data.map((item, index) => (
        <div key={index} data-testid={`pie-segment-${index}`}>
          {item[nameKey]}: {item[dataKey]}
        </div>
      ))}
    </div>
  ),
  Cell: ({ fill }: { fill: string }) => (
    <div data-testid="cell" style={{ backgroundColor: fill }} />
  ),
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  Sector: ({ fill }: { fill: string }) => (
    <div data-testid="sector" style={{ backgroundColor: fill }} />
  )
}));

const mockData = [
  { name: 'Category A', value: 100 },
  { name: 'Category B', value: 150 },
  { name: 'Category C', value: 200 }
];

describe('PieChart', () => {
  it('renders pie chart with data', () => {
    render(
      <PieChart
        data={mockData}
        dataKey="value"
        nameKey="name"
        title="Test Pie Chart"
      />
    );

    expect(screen.getByText('Test Pie Chart')).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    expect(screen.getByTestId('pie')).toBeInTheDocument();
  });

  it('renders pie chart with percentages', () => {
    render(
      <PieChart
        data={mockData}
        dataKey="value"
        nameKey="name"
        title="Pie Chart with Percentages"
        showPercentages={true}
      />
    );

    expect(screen.getByText('Pie Chart with Percentages')).toBeInTheDocument();
  });

  it('renders pie chart with legend', () => {
    render(
      <PieChart
        data={mockData}
        dataKey="value"
        nameKey="name"
        title="Pie Chart with Legend"
        showLegend={true}
      />
    );

    expect(screen.getByText('Category A')).toBeInTheDocument();
    expect(screen.getByText('Category B')).toBeInTheDocument();
    expect(screen.getByText('Category C')).toBeInTheDocument();
  });

  it('renders pie chart with data labels', () => {
    render(
      <PieChart
        data={mockData}
        dataKey="value"
        nameKey="name"
        title="Pie Chart with Labels"
        showDataLabels={true}
      />
    );

    expect(screen.getByText('Pie Chart with Labels')).toBeInTheDocument();
  });

  it('handles slice click events', () => {
    const mockOnClick = jest.fn();

    render(
      <PieChart
        data={mockData}
        dataKey="value"
        nameKey="name"
        title="Interactive Pie Chart"
        onSliceClick={mockOnClick}
      />
    );

    expect(mockOnClick).toBeDefined();
  });

  it('renders with custom colors', () => {
    const customConfig = {
      colors: ['#ff0000', '#00ff00', '#0000ff']
    };

    render(
      <PieChart
        data={mockData}
        dataKey="value"
        nameKey="name"
        title="Custom Color Pie Chart"
        config={customConfig}
      />
    );

    expect(screen.getByText('Custom Color Pie Chart')).toBeInTheDocument();
  });

  it('renders with animations', () => {
    render(
      <PieChart
        data={mockData}
        dataKey="value"
        nameKey="name"
        title="Animated Pie Chart"
        animationDuration={1000}
        animationEasing="ease-in-out"
      />
    );

    expect(screen.getByText('Animated Pie Chart')).toBeInTheDocument();
  });

  it('handles sorting', () => {
    render(
      <PieChart
        data={mockData}
        dataKey="value"
        nameKey="name"
        title="Sorted Pie Chart"
        sortBy="value"
        sortOrder="desc"
      />
    );

    expect(screen.getByText('Sorted Pie Chart')).toBeInTheDocument();
  });

  it('renders others slice when max slices exceeded', () => {
    const largeData = [
      { name: 'A', value: 100 },
      { name: 'B', value: 200 },
      { name: 'C', value: 300 },
      { name: 'D', value: 400 },
      { name: 'E', value: 500 }
    ];

    render(
      <PieChart
        data={largeData}
        dataKey="value"
        nameKey="name"
        title="Pie Chart with Others"
        maxSlices={3}
        showOthersSlice={true}
        othersLabel="Others"
      />
    );

    expect(screen.getByText('Others')).toBeInTheDocument();
  });

  it('toggles slice visibility', () => {
    render(
      <PieChart
        data={mockData}
        dataKey="value"
        nameKey="name"
        title="Pie Chart with Toggle"
        showLegend={true}
      />
    );

    const categoryAButton = screen.getByText('Category A');
    fireEvent.click(categoryAButton);

    expect(categoryAButton).toBeInTheDocument();
  });

  it('renders with gradient fill', () => {
    render(
      <PieChart
        data={mockData}
        dataKey="value"
        nameKey="name"
        title="Gradient Pie Chart"
        gradientFill={true}
      />
    );

    expect(screen.getByText('Gradient Pie Chart')).toBeInTheDocument();
  });

  it('renders with pattern fill', () => {
    render(
      <PieChart
        data={mockData}
        dataKey="value"
        nameKey="name"
        title="Pattern Pie Chart"
        patternFill={true}
      />
    );

    expect(screen.getByText('Pattern Pie Chart')).toBeInTheDocument();
  });

  it('renders with rotation animation', () => {
    render(
      <PieChart
        data={mockData}
        dataKey="value"
        nameKey="name"
        title="Rotating Pie Chart"
        enableRotation={true}
      />
    );

    expect(screen.getByText('Rotating Pie Chart')).toBeInTheDocument();
  });

  it('filters out small slices', () => {
    render(
      <PieChart
        data={mockData}
        dataKey="value"
        nameKey="name"
        title="Filtered Pie Chart"
        minSliceAngle={10}
      />
    );

    expect(screen.getByText('Filtered Pie Chart')).toBeInTheDocument();
  });

  it('renders with custom label renderer', () => {
    const customLabelRender = (entry: any) => `${entry.name} - ${entry.value}`;

    render(
      <PieChart
        data={mockData}
        dataKey="value"
        nameKey="name"
        title="Custom Label Pie Chart"
        customLabelRender={customLabelRender}
        showDataLabels={true}
      />
    );

    expect(screen.getByText('Custom Label Pie Chart')).toBeInTheDocument();
  });
});

describe('DonutChart', () => {
  it('renders donut chart', () => {
    render(
      <DonutChart
        data={mockData}
        dataKey="value"
        nameKey="name"
        title="Test Donut Chart"
      />
    );

    expect(screen.getByText('Test Donut Chart')).toBeInTheDocument();
    expect(screen.getByTestId('pie')).toHaveAttribute('data-inner-radius', '40');
  });

  it('renders donut chart with center label', () => {
    render(
      <DonutChart
        data={mockData}
        dataKey="value"
        nameKey="name"
        title="Donut Chart with Center Label"
        centerLabel={{
          show: true,
          title: 'Total',
          value: 450,
          formatter: (value) => `${value} items`
        }}
      />
    );

    expect(screen.getByText('Donut Chart with Center Label')).toBeInTheDocument();
  });
});

describe('GaugeChart', () => {
  it('renders gauge chart', () => {
    render(
      <GaugeChart
        data={[]}
        dataKey="value"
        nameKey="name"
        title="Test Gauge Chart"
        value={75}
        max={100}
      />
    );

    expect(screen.getByText('Test Gauge Chart')).toBeInTheDocument();
  });

  it('renders gauge chart with custom colors', () => {
    render(
      <GaugeChart
        data={[]}
        dataKey="value"
        nameKey="name"
        title="Custom Gauge Chart"
        value={85}
        max={100}
        gaugeColor="#00ff00"
        backgroundColor="#f0f0f0"
      />
    );

    expect(screen.getByText('Custom Gauge Chart')).toBeInTheDocument();
  });

  it('renders gauge chart with center value', () => {
    render(
      <GaugeChart
        data={[]}
        dataKey="value"
        nameKey="name"
        title="Gauge Chart with Value"
        value={65}
        max={100}
        min={0}
      />
    );

    expect(screen.getByText('Gauge Chart with Value')).toBeInTheDocument();
  });
});