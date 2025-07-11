/**
 * Integration Example: How to use the new unified store in existing components
 * 
 * This file shows practical examples of integrating the new store system
 * with existing components and patterns in the HeyPeter Academy LMS.
 */

import React, { useEffect } from 'react'
import { useAuth, useUI, useStudents, useNotifications } from '@/lib/stores'

// Example 1: Auth Integration
// Replace existing auth logic with unified store
export function LoginForm() {
  const { 
    user, 
    isAuthenticated, 
    isLoading, 
    error, 
    setUser, 
    setRole, 
    clearError 
  } = useAuth()
  
  const { showSuccess, showError } = useNotifications()

  const handleLogin = async (email: string, password: string) => {
    try {
      // Your existing login logic
      const response = await signIn(email, password)
      
      // Update store instead of local state
      setUser(response.user)
      setRole(response.role)
      
      showSuccess('Login successful')
    } catch (error) {
      showError('Login failed', error.message)
    }
  }

  return (
    <form onSubmit={handleLogin}>
      {error && (
        <div className="error" onClick={clearError}>
          {error}
        </div>
      )}
      
      {isLoading && <div>Logging in...</div>}
      
      {/* Your existing form fields */}
    </form>
  )
}

// Example 2: Layout Component Integration
// Replace local sidebar state with global UI state
export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { 
    sidebarOpen, 
    sidebarCollapsed, 
    toggleSidebar, 
    setSidebarCollapsed,
    theme 
  } = useUI()
  
  const { isAdmin } = useAuth()

  useEffect(() => {
    // Apply theme changes
    document.body.className = theme
  }, [theme])

  if (!isAdmin) {
    return <div>Access denied</div>
  }

  return (
    <div className={`admin-layout ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <button onClick={toggleSidebar}>
          {sidebarOpen ? 'Close' : 'Open'} Sidebar
        </button>
        
        <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
          {sidebarCollapsed ? 'Expand' : 'Collapse'}
        </button>
        
        {/* Your existing sidebar content */}
      </aside>
      
      <main className="main-content">
        {children}
      </main>
    </div>
  )
}

// Example 3: Student Management Integration
// Replace local student state with global student state
export function StudentsPage() {
  const { 
    students, 
    currentStudent,
    totalCount,
    isLoading, 
    error, 
    filters,
    setStudents,
    setCurrentStudent,
    setLoading,
    setError,
    setFilters,
    resetFilters
  } = useStudents()
  
  const { showSuccess, showError } = useNotifications()

  // Load students on mount or filter change
  useEffect(() => {
    loadStudents()
  }, [filters])

  const loadStudents = async () => {
    try {
      setLoading(true)
      
      // Your existing API call
      const response = await studentService.getAll(filters)
      
      // Update store instead of local state
      setStudents(response.data)
      
    } catch (error) {
      setError(error.message)
      showError('Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  const handleStudentSelect = (student: any) => {
    setCurrentStudent(student)
  }

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters)
  }

  const handleStudentCreate = async (studentData: any) => {
    try {
      const newStudent = await studentService.create(studentData)
      
      // Update store with new student
      setStudents([...students, newStudent])
      showSuccess('Student created successfully')
      
    } catch (error) {
      showError('Failed to create student')
    }
  }

  return (
    <div className="students-page">
      <div className="filters">
        <input
          type="text"
          placeholder="Search students..."
          value={filters.search}
          onChange={(e) => handleFilterChange({ search: e.target.value })}
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
      {error && <div className="error">{error}</div>}

      <div className="students-grid">
        {students.map(student => (
          <div 
            key={student.id}
            className={`student-card ${currentStudent?.id === student.id ? 'selected' : ''}`}
            onClick={() => handleStudentSelect(student)}
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
      
      <CreateStudentModal onSubmit={handleStudentCreate} />
    </div>
  )
}

// Example 4: Dashboard Integration
// Replace local dashboard state with global admin state
export function AdminDashboard() {
  const { 
    dashboardStats, 
    statsLoading, 
    analyticsData, 
    setDashboardStats,
    setStatsLoading,
    setAnalyticsData
  } = useAdmin()

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setStatsLoading(true)
      
      // Your existing API calls
      const [stats, analytics] = await Promise.all([
        adminService.getDashboardStats(),
        adminService.getAnalytics()
      ])
      
      // Update store
      setDashboardStats(stats)
      setAnalyticsData(analytics)
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setStatsLoading(false)
    }
  }

  if (statsLoading) {
    return <div>Loading dashboard...</div>
  }

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
        <h3>Analytics</h3>
        <AnalyticsChart data={analyticsData} />
      </div>
    </div>
  )
}

// Example 5: Notification System
// Global notification system that can be used anywhere
export function NotificationContainer() {
  const { notifications, removeNotification } = useUI()

  return (
    <div className="notification-container">
      {notifications.map(notification => (
        <div 
          key={notification.id}
          className={`notification ${notification.type}`}
          onClick={() => removeNotification(notification.id)}
        >
          <h4>{notification.title}</h4>
          {notification.message && <p>{notification.message}</p>}
          <small>{notification.timestamp.toLocaleTimeString()}</small>
        </div>
      ))}
    </div>
  )
}

// Example 6: Theme Switcher
// Global theme management
export function ThemeToggle() {
  const { theme, setTheme } = useUI()

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
  }

  return (
    <button onClick={toggleTheme} className="theme-toggle">
      {theme === 'dark' ? '🌞' : '🌙'}
    </button>
  )
}

// Example 7: Modal Management
// Global modal state management
export function ModalManager() {
  const { activeModal, modalData, closeModal } = useUI()

  if (!activeModal) return null

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {activeModal === 'student-details' && (
          <StudentDetailsModal 
            student={modalData} 
            onClose={closeModal} 
          />
        )}
        
        {activeModal === 'confirm-delete' && (
          <ConfirmDeleteModal 
            item={modalData} 
            onClose={closeModal} 
          />
        )}
        
        {/* Add more modal types as needed */}
      </div>
    </div>
  )
}

// Example 8: Custom Hook Integration
// Create domain-specific hooks that use the store
export function useStudentOperations() {
  const { setStudents, setLoading, setError } = useStudents()
  const { showSuccess, showError } = useNotifications()

  const createStudent = async (studentData: any) => {
    try {
      setLoading(true)
      const newStudent = await studentService.create(studentData)
      
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

// Example 9: App Root Integration
// How to integrate the store provider at the app root
export function AppRoot() {
  return (
    <StoreProvider>
      <div className="app">
        <NotificationContainer />
        <ModalManager />
        <ThemeToggle />
        
        <Router>
          <Routes>
            <Route path="/login" element={<LoginForm />} />
            <Route path="/admin" element={
              <AdminLayout>
                <Routes>
                  <Route path="/dashboard" element={<AdminDashboard />} />
                  <Route path="/students" element={<StudentsPage />} />
                </Routes>
              </AdminLayout>
            } />
          </Routes>
        </Router>
      </div>
    </StoreProvider>
  )
}

// Placeholder components for examples
const CreateStudentModal = ({ onSubmit }: { onSubmit: (data: any) => void }) => <div>Create Student Modal</div>
const StudentDetailsModal = ({ student, onClose }: { student: any, onClose: () => void }) => <div>Student Details Modal</div>
const ConfirmDeleteModal = ({ item, onClose }: { item: any, onClose: () => void }) => <div>Confirm Delete Modal</div>
const AnalyticsChart = ({ data }: { data: any }) => <div>Analytics Chart</div>
const StoreProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>
const Router = ({ children }: { children: React.ReactNode }) => <>{children}</>
const Routes = ({ children }: { children: React.ReactNode }) => <>{children}</>
const Route = ({ path, element }: { path: string, element: React.ReactNode }) => <>{element}</>

// Mock services for examples
const signIn = async (email: string, password: string) => ({ user: {}, role: 'admin' })
const studentService = {
  getAll: async (filters: any) => ({ data: [] }),
  create: async (data: any) => ({ id: '1', ...data }),
  update: async (id: string, data: any) => ({ id, ...data }),
  delete: async (id: string) => {},
}
const adminService = {
  getDashboardStats: async () => ({}),
  getAnalytics: async () => ({}),
}