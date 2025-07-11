# Unified State Management System

This directory contains a comprehensive state management system built with Zustand for the HeyPeter Academy LMS application.

## Overview

The unified state management system provides:

- **Centralized State**: All application state in one place
- **Type Safety**: Full TypeScript support with proper interfaces
- **Persistence**: Important state persisted across sessions
- **DevTools**: Development debugging with Redux DevTools
- **Performance**: Optimized selectors and subscriptions
- **Modularity**: Clear separation of concerns with slices

## Structure

```
src/lib/stores/
├── index.ts                  # Main exports
├── app-store.ts              # Main store configuration
├── types.ts                  # TypeScript interfaces
├── hooks.ts                  # Enhanced hooks with utilities
├── provider.tsx              # React provider component
├── utils.ts                  # Store utilities and debugging
├── slices/                   # Feature-specific slices
│   ├── auth-slice.ts         # Authentication state
│   ├── ui-slice.ts           # UI state management
│   ├── student-slice.ts      # Student management
│   ├── teacher-slice.ts      # Teacher management
│   └── admin-slice.ts        # Admin dashboard state
├── __tests__/                # Test files
│   ├── app-store.test.ts     # Full integration tests
│   └── app-store-simple.test.ts # Simple unit tests
├── MIGRATION_PLAN.md         # Migration strategy
├── USAGE_EXAMPLES.md         # Usage examples
└── README.md                 # This file
```

## Key Features

### 1. Unified Store Interface
- Single store instance with multiple slices
- Consistent API across all features
- Type-safe state access and mutations

### 2. Auth State Management
```typescript
const { user, role, isAdmin, isAuthenticated, setUser, setRole, logout } = useAuth()
```

### 3. UI State Management
```typescript
const { sidebarOpen, toggleSidebar, addNotification, theme, setTheme } = useUI()
```

### 4. Feature-Specific State
```typescript
const { students, setStudents, filters, setFilters } = useStudents()
const { teachers, setTeachers } = useTeachers()
const { dashboardStats, setDashboardStats } = useAdmin()
```

### 5. Persistence
- Automatic persistence of selected state
- Hydration on client-side
- Skip server-side rendering issues

### 6. DevTools Integration
- Redux DevTools extension support
- State change tracking
- Time-travel debugging

## Quick Start

### 1. Basic Usage

```typescript
import { useAuth, useUI, useStudents } from '@/lib/stores'

function MyComponent() {
  const { user, isAuthenticated } = useAuth()
  const { addNotification } = useUI()
  const { students, setStudents } = useStudents()

  // Use state and actions as needed
}
```

### 2. Enhanced Hooks

```typescript
import { useAuthActions, useNotifications } from '@/lib/stores'

function MyComponent() {
  const { login, logout } = useAuthActions()
  const { showSuccess, showError } = useNotifications()

  const handleLogin = async () => {
    try {
      await login(user, role)
      showSuccess('Login successful')
    } catch (error) {
      showError('Login failed', error.message)
    }
  }
}
```

### 3. Store Provider

```typescript
import { StoreProvider } from '@/lib/stores'

function App() {
  return (
    <StoreProvider>
      <YourApp />
    </StoreProvider>
  )
}
```

## Migration from Old Store

### Before (Old Auth Store)
```typescript
import { useAuthStore } from '@/lib/store'

const { user, setUser, role, setRole } = useAuthStore()
```

### After (New Unified Store)
```typescript
import { useAuth } from '@/lib/stores'

const { user, setUser, role, setRole } = useAuth()
```

The API remains the same for auth, but now includes additional features like loading states, error handling, and enhanced type safety.

## State Structure

### Auth State
- `user`: Current user object
- `role`: User role ('admin', 'teacher', 'student')
- `isAdmin`, `isTeacher`, `isStudent`: Computed role flags
- `isAuthenticated`: Authentication status
- `isLoading`: Loading state
- `error`: Error message

### UI State
- `sidebarOpen`: Sidebar visibility
- `sidebarCollapsed`: Sidebar collapsed state
- `activeModal`: Currently active modal
- `notifications`: Notification queue
- `theme`: Theme preference
- `globalLoading`: Global loading state

### Feature States
- Student management state
- Teacher management state
- Admin dashboard state
- Analytics state
- System settings state

## Testing

Run the test suite:
```bash
npm test -- src/lib/stores/__tests__/
```

The tests cover:
- Store initialization
- State mutations
- Action creators
- Selectors
- Persistence
- Error handling

## Development Tools

### 1. Redux DevTools
Install the Redux DevTools extension to inspect state changes in development.

### 2. Store Utilities
```typescript
import { storeUtils } from '@/lib/stores'

// Debug utilities
storeUtils.logState()
storeUtils.getState()
storeUtils.resetAuth()
```

### 3. Performance Monitoring
```typescript
import { performanceUtils } from '@/lib/stores'

// Track state changes
performanceUtils.trackStateChanges()

// Measure render performance
const stopMeasure = performanceUtils.measureRender('ComponentName')
// ... component render
stopMeasure()
```

## Best Practices

1. **Use Typed Selectors**: Always use the provided typed hooks
2. **Avoid Over-Subscription**: Only subscribe to state you need
3. **Handle Loading States**: Always show loading indicators
4. **Error Boundaries**: Implement error boundaries for store errors
5. **Test State Logic**: Write tests for store interactions
6. **Document Custom Hooks**: Document complex state logic

## Performance Considerations

- Use selective subscriptions with `useAppStore(state => state.specificProp)`
- Implement shallow equality checks for object selections
- Use computed selectors for derived state
- Memoize expensive operations

## Future Enhancements

- [ ] Add computed state middleware
- [ ] Implement optimistic updates
- [ ] Add offline state management
- [ ] Real-time state synchronization
- [ ] Advanced caching strategies

## Troubleshooting

### Common Issues

1. **Hydration Mismatch**: Ensure `skipHydration: true` in persist config
2. **Infinite Loops**: Avoid circular dependencies in selectors
3. **Performance**: Use selective subscriptions and memoization
4. **TypeScript Errors**: Ensure proper type imports

### Debug Steps

1. Check Redux DevTools for state changes
2. Use `storeUtils.logState()` for debugging
3. Verify persistence configuration
4. Test with simple unit tests

## Contributing

When adding new state:

1. Update the main store interface
2. Add actions and selectors
3. Write tests
4. Update documentation
5. Consider persistence needs
6. Add migration guide if needed

## License

This state management system is part of the HeyPeter Academy LMS application.