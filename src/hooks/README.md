# Custom Hooks Documentation

This directory contains custom React hooks that extract business logic from components and provide reusable functionality across the HeyPeter Academy application.

## Overview

The custom hooks are organized into the following categories:

### Authentication Hooks
- `useAuth` - Complete authentication management with user state, login/logout, and role-based access control

### Data Management Hooks
- `useStudentData` - Student management with CRUD operations, filtering, and pagination
- `useTeacherData` - Teacher management with availability, performance tracking, and assignments
- `useHourManagement` - Hour tracking, packages, transfers, and adjustments
- `useAnalytics` - Analytics data aggregation, metrics, and insights

### Form Hooks
- `useForm` - Enhanced form handling with validation, auto-save, and persistence
- Common form patterns for students, teachers, login, etc.

### API Hooks
- `useAPI` - Generic API request handling with caching, retries, and error handling
- `usePaginatedApiQuery` - Paginated API queries
- `useInfiniteApiQuery` - Infinite scroll functionality
- `useDebounceSearch` - Debounced search implementation
- `useRealTimeData` - Real-time data updates

### Pagination Hooks
- `usePagination` - Core pagination logic
- `useAdvancedPagination` - Pagination with search and filters
- `useTablePagination` - Table-specific pagination

## Usage Examples

### Authentication

```typescript
import { useAuth } from '@/hooks';

function MyComponent() {
  const { 
    user, 
    loading, 
    isAuthenticated, 
    login, 
    logout, 
    isRole 
  } = useAuth();

  if (loading) return <div>Loading...</div>;
  
  if (!isAuthenticated) {
    return <LoginForm onLogin={login} />;
  }

  return (
    <div>
      Welcome, {user?.full_name}!
      {isRole('admin') && <AdminPanel />}
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Student Data Management

```typescript
import { useStudentData } from '@/hooks';

function StudentsPage() {
  const {
    students,
    loading,
    error,
    currentPage,
    totalPages,
    createStudent,
    updateStudent,
    deleteStudent,
    setFilters,
    goToPage,
  } = useStudentData({
    page: 1,
    limit: 10,
    filters: { status: 'active' }
  });

  const handleCreateStudent = async (data) => {
    const result = await createStudent(data);
    if (result.success) {
      // Handle success
    }
  };

  return (
    <div>
      <StudentForm onSubmit={handleCreateStudent} />
      <StudentList 
        students={students} 
        onUpdate={updateStudent}
        onDelete={deleteStudent}
      />
      <Pagination 
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={goToPage}
      />
    </div>
  );
}
```

### Form Handling

```typescript
import { useStudentForm } from '@/hooks';

function StudentForm({ onSubmit, initialData }) {
  const form = useStudentForm(initialData);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Input
        {...form.register('email')}
        error={form.getFieldError('email')}
      />
      <Input
        {...form.register('full_name')}
        error={form.getFieldError('full_name')}
      />
      <Button 
        type="submit" 
        disabled={form.isSubmitting}
      >
        {form.isSubmitting ? 'Saving...' : 'Save'}
      </Button>
    </form>
  );
}
```

### API Requests

```typescript
import { useApiQuery, useApiMutation } from '@/hooks';

function DataComponent() {
  const { data, loading, error, refetch } = useApiQuery(
    ['students'], 
    '/api/students'
  );

  const { mutate: createStudent } = useApiMutation(
    '/api/students',
    'POST',
    {
      onSuccess: () => refetch(),
      requestOptions: {
        showSuccessToast: true,
        successMessage: 'Student created successfully!'
      }
    }
  );

  return (
    <div>
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error.message}</div>}
      {data && <StudentList students={data} />}
      <Button onClick={() => createStudent(newStudentData)}>
        Create Student
      </Button>
    </div>
  );
}
```

### Pagination

```typescript
import { usePagination } from '@/hooks';

function PaginatedList({ data, totalCount }) {
  const {
    state,
    actions,
    getTableData,
    getPageInfo,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination({
    initialPage: 1,
    initialLimit: 10,
    totalCount,
  });

  const currentPageData = getTableData(data);

  return (
    <div>
      <div>
        {currentPageData.map(item => (
          <div key={item.id}>{item.name}</div>
        ))}
      </div>
      
      <div className="pagination">
        <span>{getPageInfo()}</span>
        <select 
          value={state.pageSize} 
          onChange={e => handlePageSizeChange(Number(e.target.value))}
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
        
        <button 
          onClick={() => handlePageChange(state.currentPage - 1)}
          disabled={!state.hasPrevPage}
        >
          Previous
        </button>
        
        {state.visiblePages.map(page => (
          <button
            key={page}
            onClick={() => handlePageChange(page)}
            className={page === state.currentPage ? 'active' : ''}
          >
            {page}
          </button>
        ))}
        
        <button 
          onClick={() => handlePageChange(state.currentPage + 1)}
          disabled={!state.hasNextPage}
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

### Analytics

```typescript
import { useAnalytics } from '@/hooks';

function AnalyticsDashboard() {
  const {
    dashboardMetrics,
    loading,
    setDateRange,
    refreshAllMetrics,
    getStudentEnrollmentChart,
    getAttendanceChart,
    exportAnalyticsReport,
  } = useAnalytics();

  const enrollmentChart = getStudentEnrollmentChart('month');
  const attendanceChart = getAttendanceChart('week');

  return (
    <div>
      <div className="metrics">
        <MetricCard 
          title="Total Students" 
          value={dashboardMetrics?.students.totalStudents} 
        />
        <MetricCard 
          title="Active Teachers" 
          value={dashboardMetrics?.teachers.activeTeachers} 
        />
        <MetricCard 
          title="Attendance Rate" 
          value={`${dashboardMetrics?.students.attendanceRate}%`} 
        />
      </div>
      
      <div className="charts">
        <Chart data={enrollmentChart} type="line" title="Student Enrollments" />
        <Chart data={attendanceChart} type="bar" title="Attendance Rate" />
      </div>
      
      <div className="actions">
        <Button onClick={() => setDateRange('last_30_days')}>
          Last 30 Days
        </Button>
        <Button onClick={() => exportAnalyticsReport('pdf')}>
          Export Report
        </Button>
        <Button onClick={refreshAllMetrics}>
          Refresh
        </Button>
      </div>
    </div>
  );
}
```

## Hook Features

### Common Features Across Hooks

1. **TypeScript Support**: All hooks are fully typed with comprehensive TypeScript interfaces
2. **Error Handling**: Consistent error handling with toast notifications
3. **Loading States**: Loading indicators for async operations
4. **Caching**: Intelligent caching with React Query integration
5. **Optimizations**: Memoization and performance optimizations
6. **Flexibility**: Configurable options and extensible patterns

### Error Handling

All hooks provide consistent error handling:

```typescript
const { data, loading, error } = useStudentData();

if (error) {
  return <ErrorComponent error={error} />;
}
```

### Loading States

Loading states are provided for better UX:

```typescript
const { loading, isSubmitting } = useForm();

return (
  <Button disabled={loading || isSubmitting}>
    {loading ? 'Loading...' : 'Submit'}
  </Button>
);
```

## Best Practices

1. **Use the Right Hook**: Choose the appropriate hook for your use case
2. **Handle Loading States**: Always handle loading states in your components
3. **Error Boundaries**: Implement error boundaries for better error handling
4. **Memoization**: Use React.memo for components that use these hooks
5. **Testing**: Mock hooks in tests using the provided mock utilities

## Integration with Components

The hooks are designed to work seamlessly with the existing component architecture:

```typescript
// Before: Component with mixed concerns
function StudentListComponent() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  
  // Complex logic mixed with component...
}

// After: Clean separation of concerns
function StudentListComponent() {
  const { students, loading, error, currentPage, goToPage } = useStudentData();
  
  // Component only handles presentation
  return <StudentList students={students} />;
}
```

## Performance Considerations

1. **React Query**: Hooks use React Query for efficient data fetching and caching
2. **Memoization**: Callbacks and computed values are memoized
3. **Debouncing**: Search and input handlers are debounced
4. **Pagination**: Efficient pagination prevents loading unnecessary data
5. **Optimistic Updates**: Some hooks support optimistic updates for better UX

## Testing

The hooks can be tested using React Testing Library:

```typescript
import { renderHook, act } from '@testing-library/react';
import { useStudentData } from '@/hooks';

test('should handle student creation', async () => {
  const { result } = renderHook(() => useStudentData());
  
  await act(async () => {
    const response = await result.current.createStudent(mockStudentData);
    expect(response.success).toBe(true);
  });
});
```

## Future Enhancements

1. **Real-time Updates**: WebSocket integration for real-time data updates
2. **Offline Support**: Offline-first functionality with service workers
3. **Advanced Caching**: More sophisticated caching strategies
4. **Performance Monitoring**: Built-in performance monitoring and analytics
5. **Accessibility**: Enhanced accessibility features and ARIA support

This hook architecture provides a solid foundation for building scalable, maintainable React applications with clean separation of concerns and reusable business logic.