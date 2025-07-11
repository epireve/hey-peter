# Zustand Store Usage Examples

This document provides comprehensive examples of how to use the unified Zustand store system.

## Basic Usage

### 1. Authentication

```typescript
import { useAuth, useAuthActions } from '@/lib/stores'

function LoginComponent() {
  const { user, isAuthenticated, isLoading, error } = useAuth()
  const { login, logout, clearError } = useAuthActions()

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div>
      {isAuthenticated ? (
        <div>
          <p>Welcome, {user?.email}</p>
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <button onClick={() => login(userData, 'admin')}>Login</button>
      )}
    </div>
  )
}
```

### 2. UI State Management

```typescript
import { useUI, useNotifications, useModal, useTheme } from '@/lib/stores'

function AppLayout() {
  const { sidebarOpen, toggleSidebar } = useUI()
  const { showSuccess, showError } = useNotifications()
  const { openModal, closeModal, isOpen } = useModal()
  const { theme, toggleTheme } = useTheme()

  const handleSave = async () => {
    try {
      await saveData()
      showSuccess('Data saved successfully')
    } catch (error) {
      showError('Failed to save data', error.message)
    }
  }

  return (
    <div className={`app-layout ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <button onClick={toggleSidebar}>Toggle Sidebar</button>
      <button onClick={toggleTheme}>Toggle Theme</button>
      <button onClick={() => openModal('confirm-modal', { action: 'delete' })}>
        Delete Item
      </button>
      
      {isOpen('confirm-modal') && (
        <ConfirmModal onClose={closeModal} />
      )}
    </div>
  )
}
```

### 3. Student Management

```typescript
import { useStudents, useStudentActions } from '@/lib/stores'

function StudentsPage() {
  const { 
    students, 
    currentStudent, 
    isLoading, 
    error, 
    filters, 
    totalCount 
  } = useStudents()
  
  const { 
    loadStudents, 
    selectStudent, 
    setFilters, 
    resetFilters 
  } = useStudentActions()

  useEffect(() => {
    loadStudents(studentsData, total)
  }, [filters])

  const handleSearch = (search: string) => {
    setFilters({ search, page: 1 })
  }

  const handleFilterChange = (newFilters: Partial<StudentFilters>) => {
    setFilters(newFilters)
  }

  return (
    <div>
      <div className="filters">
        <input 
          type="text" 
          placeholder="Search students..." 
          value={filters.search}
          onChange={(e) => handleSearch(e.target.value)}
        />
        <select 
          value={filters.status || ''} 
          onChange={(e) => handleFilterChange({ status: e.target.value || null })}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button onClick={resetFilters}>Reset Filters</button>
      </div>

      {isLoading && <div>Loading students...</div>}
      {error && <div>Error: {error}</div>}

      <div className="students-list">
        {students.map(student => (
          <div 
            key={student.id} 
            className={`student-card ${currentStudent?.id === student.id ? 'selected' : ''}`}
            onClick={() => selectStudent(student)}
          >
            <h3>{student.name}</h3>
            <p>{student.email}</p>
            <p>Status: {student.status}</p>
          </div>
        ))}
      </div>

      <div className="pagination">
        Showing {students.length} of {totalCount} students
      </div>
    </div>
  )
}
```

### 4. Admin Dashboard

```typescript
import { useAdmin, useAdminActions } from '@/lib/stores'

function AdminDashboard() {
  const { 
    dashboardStats, 
    statsLoading, 
    analyticsData, 
    analyticsRange,
    systemSettings 
  } = useAdmin()
  
  const { 
    loadDashboardStats, 
    loadAnalytics, 
    setAnalyticsRange 
  } = useAdminActions()

  useEffect(() => {
    loadDashboardStats()
    loadAnalytics(analyticsRange)
  }, [])

  const handleRangeChange = (newRange: { start: Date; end: Date }) => {
    setAnalyticsRange(newRange)
    loadAnalytics(newRange)
  }

  if (statsLoading) return <div>Loading dashboard...</div>

  return (
    <div className="admin-dashboard">
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Students</h3>
          <p>{dashboardStats?.totalStudents || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Active Students</h3>
          <p>{dashboardStats?.activeStudents || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Total Teachers</h3>
          <p>{dashboardStats?.totalTeachers || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Monthly Revenue</h3>
          <p>${dashboardStats?.revenue.monthly || 0}</p>
        </div>
      </div>

      <div className="analytics-section">
        <DateRangePicker 
          range={analyticsRange}
          onChange={handleRangeChange}
        />
        <AnalyticsChart data={analyticsData} />
      </div>
    </div>
  )
}
```

## Advanced Usage

### 1. Custom Hooks with Store

```typescript
import { useStudents, useNotifications } from '@/lib/stores'
import { studentService } from '@/lib/services'

function useStudentOperations() {
  const { setStudents, setLoading, setError } = useStudents()
  const { showSuccess, showError } = useNotifications()

  const createStudent = async (studentData: any) => {
    try {
      setLoading(true)
      const newStudent = await studentService.create(studentData)
      
      // Update store
      setStudents(prevStudents => [...prevStudents, newStudent])
      showSuccess('Student created successfully')
      
      return newStudent
    } catch (error) {
      setError(error.message)
      showError('Failed to create student')
      throw error
    } finally {
      setLoading(false)
    }
  }

  const updateStudent = async (id: string, updates: any) => {
    try {
      setLoading(true)
      const updatedStudent = await studentService.update(id, updates)
      
      // Update store
      setStudents(prevStudents => 
        prevStudents.map(s => s.id === id ? updatedStudent : s)
      )
      showSuccess('Student updated successfully')
      
      return updatedStudent
    } catch (error) {
      setError(error.message)
      showError('Failed to update student')
      throw error
    } finally {
      setLoading(false)
    }
  }

  const deleteStudent = async (id: string) => {
    try {
      setLoading(true)
      await studentService.delete(id)
      
      // Update store
      setStudents(prevStudents => prevStudents.filter(s => s.id !== id))
      showSuccess('Student deleted successfully')
    } catch (error) {
      setError(error.message)
      showError('Failed to delete student')
      throw error
    } finally {
      setLoading(false)
    }
  }

  return {
    createStudent,
    updateStudent,
    deleteStudent,
  }
}
```

### 2. Store Persistence

```typescript
import { useEffect } from 'react'
import { useStoreHydration } from '@/lib/stores'

function App() {
  const hasHydrated = useStoreHydration()

  // Don't render until store is hydrated
  if (!hasHydrated) {
    return <div>Loading...</div>
  }

  return <AppContent />
}
```

### 3. Store Subscription

```typescript
import { useStoreSubscription } from '@/lib/stores'

function DebugPanel() {
  useStoreSubscription((state) => {
    console.log('Store state changed:', state)
  })

  return <div>Debug panel (check console)</div>
}
```

### 4. Middleware and DevTools

```typescript
// The store is already configured with DevTools in development
// You can see the state changes in Redux DevTools extension

// For custom middleware, you can extend the store:
import { subscribeWithSelector } from 'zustand/middleware'

const useAppStoreWithSelector = create<AppStore>()(
  subscribeWithSelector(
    devtools(
      persist(
        // ... store configuration
      )
    )
  )
)
```

## Migration Examples

### From Old Auth Store

```typescript
// OLD CODE
import { useAuthStore } from '@/lib/store'

function Component() {
  const { user, setUser, role, setRole } = useAuthStore()
  
  // ... component logic
}

// NEW CODE
import { useAuth } from '@/lib/stores'

function Component() {
  const { user, setUser, role, setRole } = useAuth()
  
  // ... component logic (same API)
}
```

### From Local State to Global State

```typescript
// OLD CODE - Local state
function StudentList() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadStudents = async () => {
      setLoading(true)
      try {
        const data = await studentService.getAll()
        setStudents(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadStudents()
  }, [])

  return (
    <div>
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
      {students.map(student => (
        <div key={student.id}>{student.name}</div>
      ))}
    </div>
  )
}

// NEW CODE - Global state
function StudentList() {
  const { students, isLoading, error } = useStudents()
  const { loadStudents } = useStudentActions()

  useEffect(() => {
    loadStudents()
  }, [])

  return (
    <div>
      {isLoading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
      {students.map(student => (
        <div key={student.id}>{student.name}</div>
      ))}
    </div>
  )
}
```

## Performance Optimizations

### 1. Selective Subscriptions

```typescript
// Only subscribe to specific parts of the store
const user = useAppStore(state => state.user)
const isLoading = useAppStore(state => state.isLoading)

// Instead of subscribing to everything
const { user, isLoading } = useAuth() // This is fine for small slices
```

### 2. Shallow Equality

```typescript
import { shallow } from 'zustand/shallow'

const { students, teachers } = useAppStore(
  state => ({ students: state.students, teachers: state.teachers }),
  shallow
)
```

### 3. Computed Values

```typescript
// Create computed selectors
const useActiveStudents = () => 
  useAppStore(state => state.students.filter(s => s.status === 'active'))

const useStudentCount = () => 
  useAppStore(state => state.students.length)
```

## Testing

```typescript
import { renderHook, act } from '@testing-library/react'
import { useAuth } from '@/lib/stores'

test('should update user state', () => {
  const { result } = renderHook(() => useAuth())
  
  act(() => {
    result.current.setUser({ id: '1', email: 'test@example.com' })
  })

  expect(result.current.user?.email).toBe('test@example.com')
  expect(result.current.isAuthenticated).toBe(true)
})
```

## Best Practices

1. **Use Typed Selectors**: Always use the provided typed hooks
2. **Avoid Over-Subscription**: Only subscribe to what you need
3. **Handle Loading States**: Always show loading states for better UX
4. **Error Boundaries**: Implement error boundaries for store errors
5. **Persistence**: Only persist necessary data
6. **Testing**: Test store interactions thoroughly
7. **Documentation**: Document custom hooks and complex state logic