/**
 * Test Utilities for Mocking
 * 
 * Provides standardized mocking utilities for services and components
 */

// Mock service response generator
export const createMockServiceResponse = (data = null, error = null) => ({
  success: !error,
  data,
  error: error ? {
    code: 'TEST_ERROR',
    message: error.message || 'Test error',
    details: error
  } : undefined
});

// Mock paginated response generator
export const createMockPaginatedResponse = (data = [], total = 0, page = 1, pageSize = 10) => ({
  success: true,
  data,
  pagination: {
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    hasNext: page * pageSize < total,
    hasPrev: page > 1
  }
});

// Mock Supabase query builder
export const createMockSupabaseQuery = (mockResponse = { data: [], error: null }) => {
  const builder = {
    // Make builder thenable
    then: jest.fn().mockImplementation((resolve) => resolve(mockResponse)),
    catch: jest.fn().mockReturnThis(),
    finally: jest.fn().mockReturnThis(),
    
    // Mock response configuration
    mockResolvedValue: jest.fn().mockReturnValue(builder),
    mockResolvedValueOnce: jest.fn().mockReturnValue(builder),
    mockRejectedValue: jest.fn().mockReturnValue(builder),
    mockRejectedValueOnce: jest.fn().mockReturnValue(builder),
    
    // Set the mock response
    setMockResponse: (response) => {
      builder.then.mockImplementation((resolve) => resolve(response));
      return builder;
    }
  };
  
  // Chain methods
  const chainMethods = [
    'select', 'insert', 'update', 'upsert', 'delete',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike',
    'is', 'in', 'contains', 'containedBy', 'overlaps',
    'filter', 'not', 'or', 'and', 'order', 'limit', 'range',
    'single', 'maybeSingle'
  ];
  
  chainMethods.forEach(method => {
    builder[method] = jest.fn().mockReturnValue(builder);
  });
  
  return builder;
};

// Mock performance entry
export const createMockPerformanceEntry = (overrides = {}) => ({
  name: 'test-entry',
  entryType: 'navigation',
  startTime: 0,
  duration: 100,
  ...overrides
});

// Mock student data
export const createMockStudent = (overrides = {}) => ({
  id: 'student-123',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@example.com',
  phone: '+1234567890',
  date_of_birth: '2000-01-01',
  emergency_contact_name: 'Jane Doe',
  emergency_contact_phone: '+1234567891',
  profile_picture_url: null,
  bio: 'Test student bio',
  timezone: 'UTC',
  language_level: 'intermediate',
  learning_goals: ['conversation', 'business'],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_active: true,
  ...overrides
});

// Mock teacher data
export const createMockTeacher = (overrides = {}) => ({
  id: 'teacher-123',
  first_name: 'Sarah',
  last_name: 'Smith',
  email: 'sarah.smith@example.com',
  phone: '+1234567892',
  date_of_birth: '1985-01-01',
  bio: 'Experienced English teacher',
  profile_picture_url: null,
  timezone: 'UTC',
  hourly_rate: 25.00,
  certifications: ['TEFL', 'TESOL'],
  specializations: ['business', 'conversation'],
  languages_spoken: ['English', 'Spanish'],
  years_of_experience: 5,
  education_background: 'Bachelor of Arts in English',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_active: true,
  ...overrides
});

// Mock class data
export const createMockClass = (overrides = {}) => ({
  id: 'class-123',
  title: 'English Conversation',
  description: 'Practice your English conversation skills',
  teacher_id: 'teacher-123',
  course_id: 'course-123',
  class_type: 'conversation',
  max_students: 6,
  duration_minutes: 60,
  scheduled_start: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  scheduled_end: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
  timezone: 'UTC',
  meeting_url: 'https://zoom.us/j/123456789',
  status: 'scheduled',
  is_recurring: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
});

// Mock hour package data
export const createMockHourPackage = (overrides = {}) => ({
  id: 'package-123',
  package_type: 'standard',
  name: '10 Hour Package',
  description: 'Perfect for regular learning',
  hours_included: 10,
  validity_days: 90,
  price: 250.00,
  currency: 'USD',
  discount_percentage: 0,
  original_price: 250.00,
  class_types_allowed: ['conversation', 'grammar'],
  course_types_allowed: ['everyday-a', 'everyday-b'],
  features: ['1-on-1 classes', 'Group classes', 'Homework support'],
  is_active: true,
  is_featured: false,
  display_order: 1,
  max_purchases_per_student: null,
  min_purchase_hours: null,
  is_corporate: false,
  requires_approval: false,
  metadata: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  created_by: 'admin-123',
  updated_by: 'admin-123',
  ...overrides
});

// Mock performance metric
export const createMockPerformanceMetric = (overrides = {}) => ({
  id: 'metric-123',
  name: 'api_response_time',
  value: 150,
  unit: 'ms',
  timestamp: new Date().toISOString(),
  context: { endpoint: '/api/test' },
  threshold: 1000,
  category: 'api_response',
  severity: 'low',
  tags: ['test'],
  ...overrides
});

// Mock form data helper
export const createMockFormData = (data = {}) => {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      formData.append(key, value);
    }
  });
  return formData;
};

// Mock file for upload tests
export const createMockFile = (name = 'test.jpg', type = 'image/jpeg', size = 1024) => {
  const file = new File(['test content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

// Mock error helpers
export const createMockDatabaseError = (message = 'Database connection failed') => ({
  code: '23505',
  message,
  details: 'Mock database error for testing'
});

export const createMockValidationError = (field = 'email', message = 'Invalid format') => ({
  code: 'VALIDATION_ERROR',
  message: `Validation failed for ${field}`,
  details: { field, message }
});

// Mock date helpers for consistent testing
export const createMockDate = (offset = 0) => {
  const now = new Date();
  return new Date(now.getTime() + offset);
};

export const createMockDateRange = (startOffset = 0, endOffset = 24 * 60 * 60 * 1000) => ({
  start: createMockDate(startOffset),
  end: createMockDate(endOffset)
});

// Mock React Hook Form controller
export const createMockFormController = (defaultValues = {}) => ({
  control: {
    _formState: {
      errors: {},
      isValid: true,
      isDirty: false,
      isSubmitting: false,
      isSubmitted: false,
      touchedFields: {},
      dirtyFields: {}
    },
    _defaultValues: defaultValues,
    register: jest.fn(),
    unregister: jest.fn(),
    getFieldState: jest.fn(() => ({ error: undefined, isDirty: false, isTouched: false })),
    _subjects: {
      values: { next: jest.fn() },
      array: { next: jest.fn() },
      state: { next: jest.fn() }
    }
  },
  handleSubmit: jest.fn((fn) => (e) => {
    e?.preventDefault?.();
    return fn(defaultValues);
  }),
  reset: jest.fn(),
  setValue: jest.fn(),
  getValue: jest.fn((name) => defaultValues[name]),
  getValues: jest.fn(() => defaultValues),
  watch: jest.fn((name) => name ? defaultValues[name] : defaultValues),
  formState: {
    errors: {},
    isValid: true,
    isDirty: false,
    isSubmitting: false,
    isSubmitted: false,
    touchedFields: {},
    dirtyFields: {}
  }
});

// Mock environment variables for testing
export const mockEnvironmentVariables = (vars = {}) => {
  const original = process.env;
  process.env = {
    ...original,
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    ...vars
  };
  
  return () => {
    process.env = original;
  };
};

// Async helper for testing promises
export const flushPromises = () => new Promise(resolve => setImmediate(resolve));

// Mock timer helpers
export const createMockTimers = () => {
  jest.useFakeTimers();
  return {
    advance: (ms) => jest.advanceTimersByTime(ms),
    runAllTimers: () => jest.runAllTimers(),
    runOnlyPendingTimers: () => jest.runOnlyPendingTimers(),
    restore: () => jest.useRealTimers()
  };
};