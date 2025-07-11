# Export Functionality Documentation

## Overview

The comprehensive export functionality provides professional-grade data export capabilities for all analytics reports in the Hey Peter Academy system. It supports multiple formats, advanced customization, scheduled exports, and email delivery.

## Features

### 1. Multi-Format Export Support
- **Excel (.xlsx)**: Full formatting, styling, and multiple sheets
- **CSV**: Standard comma-separated values for data analysis
- **JSON**: Structured data for API integration
- **PDF**: Print-ready reports with professional formatting

### 2. Export Components

#### ExportButton
A versatile button component that can be integrated into any analytics view.

```tsx
import { ExportButton } from '@/components/admin/export';

<ExportButton
  data={analyticsData}
  title="Student Analytics"
  fileName="student-report"
  availableColumns={['name', 'progress', 'attendance']}
  onExportComplete={(success, message) => {
    console.log(success ? 'Success' : 'Failed', message);
  }}
/>
```

**Props:**
- `data`: Array of objects to export
- `title`: Display title for the export
- `fileName`: Base filename (optional)
- `variant`: Button variant ('default', 'outline', 'secondary', 'ghost')
- `size`: Button size ('sm', 'default', 'lg')
- `showDropdown`: Whether to show format selection dropdown
- `availableColumns`: Array of column names to filter
- `onExportComplete`: Callback for export completion

#### ExportDialog
Full-featured export dialog with advanced options.

```tsx
import { ExportDialog } from '@/components/admin/export';

<ExportDialog
  isOpen={dialogOpen}
  onClose={() => setDialogOpen(false)}
  data={data}
  defaultTitle="Analytics Export"
  availableColumns={columns}
  onExportComplete={handleComplete}
/>
```

#### BatchExportDialog
Export multiple reports simultaneously.

```tsx
import { BatchExportDialog } from '@/components/admin/export';

<BatchExportDialog
  isOpen={batchDialogOpen}
  onClose={() => setBatchDialogOpen(false)}
  availableExports={[
    { id: 'students', name: 'Student Data', data: studentData },
    { id: 'teachers', name: 'Teacher Data', data: teacherData }
  ]}
  onExportComplete={handleComplete}
/>
```

#### ExportDashboard
Complete export management dashboard.

```tsx
import { ExportDashboard } from '@/components/admin/export';

<ExportDashboard
  studentData={studentData}
  teacherData={teacherData}
  financialData={financialData}
  attendanceData={attendanceData}
  performanceData={performanceData}
/>
```

### 3. Template System

Create reusable export templates with custom formatting:

```tsx
import { analyticsExportService } from '@/lib/services/analytics-export-service';

// Create a template
const template = {
  id: 'student-performance',
  name: 'Student Performance Report',
  description: 'Comprehensive student analytics',
  format: 'excel',
  columns: ['name', 'progress', 'attendance', 'testScore'],
  styling: {
    headerStyle: {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '4A90E2' } }
    },
    brandingColors: ['#4A90E2', '#50C878', '#FFD700', '#FF6B6B']
  }
};

analyticsExportService.createTemplate(template);

// Use template for export
await analyticsExportService.exportWithTemplate(data, 'student-performance');
```

### 4. Scheduled Exports

Set up automated exports with email delivery:

```tsx
const scheduledConfig = {
  id: 'weekly-student-report',
  name: 'Weekly Student Report',
  description: 'Automated weekly student performance report',
  schedule: {
    frequency: 'weekly',
    time: '09:00',
    dayOfWeek: 1 // Monday
  },
  export: {
    type: 'student-analytics',
    options: {
      format: 'excel',
      includeHeaders: true,
      includeMetadata: true
    }
  },
  delivery: {
    email: {
      enabled: true,
      recipients: ['admin@academy.com', 'reports@academy.com'],
      subject: 'Weekly Student Performance Report',
      template: 'Please find attached the weekly student report.'
    }
  },
  active: true,
  createdAt: new Date(),
  updatedAt: new Date()
};

analyticsExportService.createScheduledExport(scheduledConfig);
```

### 5. Email Delivery

Send exports directly via email:

```tsx
await analyticsExportService.sendExportByEmail(
  data,
  { format: 'excel', fileName: 'report' },
  ['recipient@example.com'],
  'Analytics Report',
  'Please find the attached report.'
);
```

### 6. Batch Export

Export multiple datasets simultaneously:

```tsx
const batchRequest = {
  exports: [
    {
      type: 'students',
      data: studentData,
      options: { format: 'excel', fileName: 'students' }
    },
    {
      type: 'teachers',
      data: teacherData,
      options: { format: 'excel', fileName: 'teachers' }
    }
  ],
  batchOptions: {
    combinedFile: true,
    includeTimestamp: true,
    compression: false
  }
};

await analyticsExportService.exportBatch(batchRequest);
```

### 7. Advanced Export Options

Apply filters, sorting, and aggregations:

```tsx
await analyticsExportService.exportWithAdvancedOptions(data, {
  format: 'excel',
  fileName: 'filtered-report',
  filters: { status: 'active' },
  sorting: [{ column: 'score', direction: 'desc' }],
  grouping: ['course'],
  aggregations: {
    score: 'avg',
    attendance: 'avg',
    count: 'count'
  }
});
```

## Integration Examples

### 1. Basic Integration

```tsx
import { ExportButton } from '@/components/admin/export';

function MyAnalyticsComponent() {
  const [data, setData] = useState([]);
  
  return (
    <div>
      <div className="flex justify-between items-center">
        <h2>Analytics Report</h2>
        <ExportButton
          data={data}
          title="Analytics Report"
          onExportComplete={(success, message) => {
            if (success) {
              toast.success(message);
            } else {
              toast.error(message);
            }
          }}
        />
      </div>
      {/* Your analytics content */}
    </div>
  );
}
```

### 2. Enhanced Analytics with Export

```tsx
import { AnalyticsWithExport } from '@/components/admin/analytics/AnalyticsWithExport';

function DashboardPage() {
  const [studentData, setStudentData] = useState([]);
  const [teacherData, setTeacherData] = useState([]);
  const [financialData, setFinancialData] = useState([]);

  return (
    <AnalyticsWithExport
      studentData={studentData}
      teacherData={teacherData}
      financialData={financialData}
    />
  );
}
```

### 3. Custom Export Page

```tsx
import { ExportDashboard } from '@/components/admin/export';

export default function ExportPage() {
  const [data, setData] = useState({
    studentData: [],
    teacherData: [],
    financialData: [],
    attendanceData: [],
    performanceData: []
  });

  return (
    <div className="container mx-auto p-6">
      <ExportDashboard {...data} />
    </div>
  );
}
```

## Configuration

### Default Templates

The system comes with pre-configured templates:

1. **Student Performance Report**: Excel format with student analytics
2. **Teacher Analytics Report**: Excel format with teacher metrics
3. **Financial Summary Report**: Excel format with financial data

### Styling Options

Templates support comprehensive styling:

```tsx
const styling = {
  headerStyle: {
    font: { bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '4A90E2' } },
    alignment: { horizontal: 'center' }
  },
  cellStyle: {
    font: { size: 11 },
    alignment: { horizontal: 'left' }
  },
  brandingColors: ['#4A90E2', '#50C878', '#FFD700', '#FF6B6B']
};
```

## API Reference

### analyticsExportService

Main service class for export operations.

#### Methods

- `exportData(data, options, metadata)`: Export data in specified format
- `exportChart(chartData, options)`: Export chart data
- `exportDashboard(dashboardData, options)`: Export complete dashboard
- `exportBatch(batchRequest)`: Export multiple datasets
- `exportWithTemplate(data, templateId, options)`: Use template for export
- `sendExportByEmail(data, options, recipients, subject, message)`: Email delivery
- `createTemplate(template)`: Create export template
- `getTemplate(id)`: Retrieve template
- `getAllTemplates()`: Get all templates
- `createScheduledExport(config)`: Schedule automated export
- `getAllScheduledExports()`: Get scheduled exports

### Export Options

```typescript
interface ExportOptions {
  format: 'csv' | 'excel' | 'json' | 'pdf';
  fileName?: string;
  includeHeaders?: boolean;
  dateFormat?: string;
  includeMetadata?: boolean;
  customTemplate?: string;
  emailDelivery?: {
    enabled: boolean;
    recipients: string[];
    subject?: string;
    message?: string;
  };
}
```

## Testing

The export functionality includes comprehensive tests:

```bash
# Run export-specific tests
npm test -- src/components/admin/export/__tests__
npm test -- src/lib/services/__tests__/analytics-export-service.test.ts

# Run all tests
npm run test
```

## Troubleshooting

### Common Issues

1. **Export fails with large datasets**: Consider using batch export with smaller chunks
2. **Excel formatting not applied**: Ensure template styling is properly configured
3. **Email delivery fails**: Check email service configuration
4. **PDF export quality issues**: Use smaller datasets or increase timeout

### Performance Considerations

- Large datasets (>1000 records) should use streaming or chunked export
- Excel exports with complex styling may take longer to generate
- PDF exports are best for smaller datasets due to rendering constraints

## Browser Compatibility

- **Chrome/Edge**: Full support for all formats
- **Firefox**: Full support for all formats
- **Safari**: Full support for all formats
- **Mobile browsers**: Limited PDF support, full support for other formats

## Security

- All exports are processed client-side
- No sensitive data is transmitted to external servers
- Email delivery uses configured email service (not included)
- Template storage is local to the application instance