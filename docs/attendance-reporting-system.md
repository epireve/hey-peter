# Attendance Reporting System

A comprehensive attendance analytics and reporting system for the Hey Peter Academy LMS.

## Overview

The Attendance Reporting System provides detailed insights into student attendance patterns across classes, teachers, and time periods. It includes powerful filtering capabilities, visual analytics, and export functionality to help administrators make data-driven decisions.

## Features

### 📊 Comprehensive Analytics
- **Statistical Overview**: Total sessions, attendance rates, absenteeism metrics
- **Class-Level Reports**: Performance by class with student breakdowns
- **Teacher-Level Reports**: Attendance patterns for each teacher's classes
- **Period-Based Analysis**: Trends across different time periods
- **Visual Charts**: Interactive line charts, bar charts, and pie charts

### 🔍 Advanced Filtering
- **Date Range Selection**: Daily, weekly, monthly, or custom ranges
- **Teacher Filtering**: Focus on specific teachers
- **Class Filtering**: Analyze individual classes
- **Status Filtering**: Filter by attendance status (present, absent, late, excused)
- **Course Type Filtering**: Filter by course categories

### 📈 Trend Analysis
- **Attendance Trends**: Track attendance patterns over time
- **Performance Metrics**: Identify top and low-performing classes
- **Student-Level Insights**: Individual student attendance tracking
- **Hours Deduction Tracking**: Monitor hour penalties and patterns

### 📄 Export Capabilities
- **Multiple Formats**: Excel, CSV, JSON, PDF
- **Customizable Reports**: Select specific report types to include
- **Professional Layout**: Well-formatted reports with metadata
- **Batch Export**: Export multiple report types simultaneously

## Architecture

### Services Layer

#### AttendanceAnalyticsService
Main service class that handles all attendance data processing and analysis.

```typescript
// Key methods:
- getAttendanceRecords(filters): Fetch detailed attendance records
- getAttendanceStats(filters): Calculate overall statistics
- getAttendanceByClass(filters): Class-level summaries
- getAttendanceByTeacher(filters): Teacher-level summaries
- getAttendanceByPeriod(filters): Period-based analysis
- getAttendanceTrends(filters): Trend data for charts
```

#### AnalyticsExportService
Handles exporting data in various formats with professional styling.

```typescript
// Key methods:
- exportData(data, options): Export data in specified format
- exportChart(chartData, options): Export chart data
- exportDashboard(dashboardData, options): Export complete dashboard
```

### Component Structure

```
src/components/admin/attendance/
├── AttendanceReportsPage.tsx          # Main container component
├── AttendanceStatsOverview.tsx        # Statistics overview cards
├── AttendanceClassReport.tsx          # Class-level reporting
├── AttendanceTeacherReport.tsx        # Teacher-level reporting
├── AttendancePeriodReport.tsx         # Period-based reporting
├── AttendanceTrendsChart.tsx          # Interactive charts
├── AttendanceExportDialog.tsx         # Export functionality
└── index.ts                           # Component exports
```

### Database Schema

The system uses the existing `attendance` table with relationships to:
- `bookings` (booking details)
- `students` (student information)
- `classes` (class details)
- `teachers` (teacher information)
- `courses` (course types)

## Usage

### Accessing Reports

Navigate to `/admin/attendance/reports` to access the attendance reporting interface.

### Basic Usage

1. **Set Filters**: Choose date range, teacher, class, and other filters
2. **View Statistics**: Review the overview cards showing key metrics
3. **Analyze Reports**: Use the tabs to view different report types
4. **Export Data**: Use the export button to download reports

### Advanced Features

#### Custom Date Ranges
```typescript
// Set custom date range
const filters = {
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
  period: 'custom'
};
```

#### Teacher-Specific Analysis
```typescript
// Filter by specific teacher
const filters = {
  teacherId: 'teacher-123',
  period: 'monthly'
};
```

#### Multi-Format Export
```typescript
// Export multiple report types
const exportConfig = {
  selectedReports: ['overview', 'classes', 'teachers'],
  format: 'excel',
  fileName: 'monthly-attendance-report'
};
```

## API Reference

### AttendanceFilters Interface
```typescript
interface AttendanceFilters {
  startDate?: Date;           // Filter start date
  endDate?: Date;             // Filter end date
  teacherId?: string;         // Specific teacher ID
  classId?: string;           // Specific class ID
  courseType?: string;        // Course type filter
  status?: AttendanceStatus;  // Attendance status filter
  period?: AttendanceReportPeriod; // Report period type
}
```

### AttendanceRecord Interface
```typescript
interface AttendanceRecord {
  id: string;
  attendanceTime: Date;
  status: AttendanceStatus;
  hoursDeducted: number;
  notes?: string;
  student: StudentInfo;
  class: ClassInfo;
  teacher: TeacherInfo;
  booking: BookingInfo;
}
```

## Performance Considerations

### Database Optimization
- Indexed queries on attendance_time, status, and related IDs
- Efficient joins with proper foreign key relationships
- Pagination for large datasets

### Client-Side Optimization
- Lazy loading of report components
- Debounced filter updates
- Memoized calculations for expensive operations

### Export Performance
- Streaming for large datasets
- Background processing for complex reports
- Progressive loading indicators

## Testing

### Unit Tests
```bash
# Run attendance service tests
npm test -- attendance-analytics-service.test.ts

# Run component tests
npm test -- AttendanceReportsPage.test.tsx
```

### Integration Tests
```bash
# Run full integration suite
npm test -- --testNamePattern="Attendance.*Integration"
```

## Configuration

### Environment Variables
```bash
# Database configuration
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...

# Export settings
EXPORT_MAX_RECORDS=10000
EXPORT_TIMEOUT_MS=30000
```

### Feature Flags
```typescript
// Enable/disable features
const config = {
  enableRealTimeUpdates: true,
  enableAdvancedFilters: true,
  enableBulkExport: true,
  maxExportRecords: 10000
};
```

## Troubleshooting

### Common Issues

#### Slow Query Performance
- Check database indexes on attendance table
- Optimize date range queries
- Consider data partitioning for large datasets

#### Export Failures
- Check browser memory limits for large exports
- Verify export format compatibility
- Monitor network timeouts

#### Data Inconsistencies
- Validate foreign key relationships
- Check for orphaned attendance records
- Verify data integrity constraints

### Debug Mode
Enable debug logging to troubleshoot issues:

```typescript
// Enable debug mode
const debugMode = process.env.NODE_ENV === 'development';
if (debugMode) {
  console.log('Attendance filters:', filters);
  console.log('Query execution time:', executionTime);
}
```

## Future Enhancements

### Planned Features
- [ ] Real-time attendance updates
- [ ] Automated report scheduling
- [ ] Advanced predictive analytics
- [ ] Integration with external calendar systems
- [ ] Mobile app support
- [ ] Email report delivery

### Performance Improvements
- [ ] Query result caching
- [ ] Background report generation
- [ ] Incremental data loading
- [ ] WebSocket real-time updates

## Contributing

When contributing to the attendance reporting system:

1. Follow the existing code patterns
2. Add comprehensive tests for new features
3. Update documentation for API changes
4. Consider performance implications
5. Test with large datasets

## License

This attendance reporting system is part of the Hey Peter Academy LMS and follows the same license terms as the main application.