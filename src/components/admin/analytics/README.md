# Analytics Dashboard Components

This directory contains the comprehensive Analytics Dashboard implementation for the HeyPeter Academy admin portal.

## Components Overview

### Main Components

1. **AnalyticsDashboard** - Main dashboard component with tabbed interface
2. **MetricCard** - Enhanced KPI card with trends and progress indicators
3. **AnalyticsFilter** - Advanced filtering component with date ranges and multi-select
4. **AnalyticsExport** - Export functionality with multiple formats (CSV, Excel, PDF)
5. **ResponsiveChart** - Chart component with fullscreen and mobile support
6. **MobileAnalyticsCard** - Mobile-optimized metric cards
7. **EnhancedStudentAnalytics** - Detailed student analytics with comprehensive metrics

### Layout Components

1. **AnalyticsLayout** - Main layout wrapper with sidebar and header support
2. **AnalyticsGrid** - Responsive grid system for analytics cards
3. **AnalyticsSection** - Sectioned content with titles and descriptions
4. **ResponsiveChartContainer** - Chart container with overflow handling

## Features

### Dashboard Tabs
- **Overview** - Key metrics and performance indicators
- **Students** - Student enrollment, progress, and engagement analytics
- **Teachers** - Teacher performance and utilization metrics
- **Courses** - Course popularity and completion rates
- **Financial** - Revenue, profit margins, and financial KPIs
- **Operations** - Class scheduling, attendance, and operational metrics

### Key Features
- **Responsive Design** - Works on desktop, tablet, and mobile devices
- **Interactive Charts** - Built with Recharts for rich data visualization
- **Advanced Filtering** - Date ranges, course types, teachers, and custom filters
- **Export Capabilities** - CSV, Excel, and PDF export with customizable sections
- **Real-time Updates** - Mock data structure ready for real-time data integration
- **Mobile Optimization** - Touch-friendly interfaces and simplified navigation

## Usage

### Basic Implementation

```tsx
import { AnalyticsDashboard } from '@/components/admin/analytics';

export default function AnalyticsPage() {
  return <AnalyticsDashboard />;
}
```

### Custom Metric Cards

```tsx
import { MetricCard } from '@/components/admin/analytics';

<MetricCard
  title="Active Students"
  value={450}
  description="Currently enrolled"
  icon={Users}
  trend={{ value: 12.5, isPositive: true }}
  progress={{ value: 78, max: 100 }}
  badge={{ text: "New", variant: "secondary" }}
/>
```

### Responsive Charts

```tsx
import { ResponsiveChart } from '@/components/admin/analytics';

<ResponsiveChart
  title="Student Growth"
  description="Monthly enrollment trends"
  data={chartData}
  type="line"
  dataKey="students"
  xAxisKey="month"
  colors={["#3b82f6"]}
  showFullscreen
  showDownload
/>
```

### Mobile Analytics

```tsx
import { MobileAnalyticsCard } from '@/components/admin/analytics';

<MobileAnalyticsCard
  title="Total Revenue"
  value="$35,000"
  description="Monthly earnings"
  icon={DollarSign}
  trend={{ value: 8.3, isPositive: true }}
  actions={[
    { label: "View Details", onClick: () => {} }
  ]}
/>
```

## Integration with Admin Portal

### 1. Add to Navigation

Update `src/app/admin/layout.tsx`:

```tsx
const navItems = [
  // ... existing items
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
];
```

### 2. Create Analytics Page

Create `src/app/admin/analytics/page.tsx`:

```tsx
import { AnalyticsDashboard } from "@/components/admin/analytics";

export default function AnalyticsPage() {
  return <AnalyticsDashboard />;
}
```

### 3. Configure Data Sources

The dashboard is designed to work with:
- Supabase database for real-time data
- API endpoints for aggregated metrics
- WebSocket connections for live updates

## Demo

Access the demo at: `/admin/analytics/demo`

The demo showcases:
- Desktop vs Mobile layouts
- Interactive components
- Sample data visualization
- Integration examples

## Customization

### Theme Integration

All components use the existing shadcn/ui theme system:
- CSS variables for colors
- Responsive breakpoints
- Dark/light mode support

### Data Integration

Components expect data in specific formats:

```tsx
// KPI Data
interface KPIData {
  title: string;
  value: string | number;
  description?: string;
  trend?: { value: number; isPositive: boolean };
  progress?: { value: number; max?: number };
}

// Chart Data
interface ChartData {
  [key: string]: any;
  name?: string; // For x-axis labels
}
```

## Dependencies

- React 18+
- Next.js 14+
- Recharts for charts
- Radix UI components
- Tailwind CSS
- date-fns for date formatting

## Performance Considerations

- Charts are lazy-loaded for better performance
- Mobile components use optimized rendering
- Export functionality is debounced
- Data fetching uses React Query patterns (when integrated)

## Future Enhancements

1. Real-time data integration
2. Advanced filtering with saved presets
3. Custom dashboard builder
4. Automated report scheduling
5. AI-powered insights
6. Advanced export templates
7. Integration with external analytics tools