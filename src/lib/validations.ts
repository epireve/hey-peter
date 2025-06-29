import { z } from 'zod'

// Auth validation schemas
export const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const resetPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

// Separate schema for password reset (no current password needed)
export const resetPasswordUpdateSchema = z.object({
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Please confirm your new password'),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

// Schema for authenticated users changing password (requires current password)
export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(6, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Please confirm your new password'),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

// User validation schemas
export const createUserSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  role: z.enum(['admin', 'teacher', 'student'], {
    required_error: 'Please select a role',
  }),
  phone: z.string().optional(),
  timezone: z.string().optional(),
})

export const updateUserSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().optional(),
  timezone: z.string().optional(),
  bio: z.string().optional(),
  preferences: z.record(z.any()).optional(),
})

// Class validation schemas
export const createClassSchema = z.object({
  title: z.string().min(2, 'Class title must be at least 2 characters'),
  description: z.string().optional(),
  teacherId: z.string().uuid('Please select a valid teacher'),
  type: z.enum(['individual', 'group'], {
    required_error: 'Please select a class type',
  }),
  level: z.enum(['beginner', 'intermediate', 'advanced'], {
    required_error: 'Please select a level',
  }),
  duration: z.number().min(15, 'Duration must be at least 15 minutes'),
  price: z.number().min(0, 'Price must be positive'),
  maxStudents: z.number().min(1, 'At least 1 student required').optional(),
  tags: z.array(z.string()).optional(),
})

export const updateClassSchema = createClassSchema.partial()

// Booking validation schemas
export const createBookingSchema = z.object({
  classId: z.string().uuid('Please select a valid class'),
  studentId: z.string().uuid('Please select a valid student'),
  scheduledAt: z.date({
    required_error: 'Please select a date and time',
  }),
  notes: z.string().optional(),
  recurringPattern: z.enum(['none', 'weekly', 'biweekly', 'monthly']).default('none'),
  recurringEndDate: z.date().optional(),
}).refine(data => {
  if (data.recurringPattern !== 'none' && !data.recurringEndDate) {
    return false
  }
  return true
}, {
  message: 'End date is required for recurring bookings',
  path: ['recurringEndDate'],
})

export const updateBookingSchema = z.object({
  scheduledAt: z.date().optional(),
  status: z.enum(['confirmed', 'cancelled', 'completed', 'no-show']).optional(),
  notes: z.string().optional(),
  actualStartTime: z.date().optional(),
  actualEndTime: z.date().optional(),
  teacherNotes: z.string().optional(),
})

export const rescheduleBookingSchema = z.object({
  newDateTime: z.date({
    required_error: 'Please select a new date and time',
  }),
  reason: z.string().optional(),
})

// Schedule validation schemas
export const createAvailabilitySchema = z.object({
  teacherId: z.string().uuid('Please select a valid teacher'),
  dayOfWeek: z.number().min(0).max(6, 'Invalid day of week'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  isRecurring: z.boolean().default(true),
  effectiveFrom: z.date().optional(),
  effectiveUntil: z.date().optional(),
}).refine(data => data.startTime < data.endTime, {
  message: 'End time must be after start time',
  path: ['endTime'],
})

export const blockTimeSchema = z.object({
  teacherId: z.string().uuid('Please select a valid teacher'),
  startDateTime: z.date({
    required_error: 'Please select start date and time',
  }),
  endDateTime: z.date({
    required_error: 'Please select end date and time',
  }),
  reason: z.string().min(2, 'Please provide a reason'),
  type: z.enum(['break', 'meeting', 'holiday', 'other']).default('other'),
}).refine(data => data.startDateTime < data.endDateTime, {
  message: 'End time must be after start time',
  path: ['endDateTime'],
})

// Report validation schemas
export const reportFilterSchema = z.object({
  startDate: z.date({
    required_error: 'Please select a start date',
  }),
  endDate: z.date({
    required_error: 'Please select an end date',
  }),
  teacherId: z.string().uuid().optional(),
  studentId: z.string().uuid().optional(),
  classType: z.enum(['individual', 'group']).optional(),
  status: z.enum(['confirmed', 'cancelled', 'completed', 'no-show']).optional(),
}).refine(data => data.startDate <= data.endDate, {
  message: 'End date must be after or equal to start date',
  path: ['endDate'],
})

// Feedback validation schemas
export const createFeedbackSchema = z.object({
  bookingId: z.string().uuid('Please select a valid booking'),
  rating: z.number().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
  comment: z.string().optional(),
  skills: z.object({
    speaking: z.number().min(1).max(5).optional(),
    listening: z.number().min(1).max(5).optional(),
    reading: z.number().min(1).max(5).optional(),
    writing: z.number().min(1).max(5).optional(),
    grammar: z.number().min(1).max(5).optional(),
    vocabulary: z.number().min(1).max(5).optional(),
  }).optional(),
  recommendations: z.string().optional(),
})

// Settings validation schemas
export const updateSettingsSchema = z.object({
  notifications: z.object({
    email: z.boolean().default(true),
    sms: z.boolean().default(false),
    bookingReminders: z.boolean().default(true),
    classUpdates: z.boolean().default(true),
    marketing: z.boolean().default(false),
  }).optional(),
  preferences: z.object({
    timezone: z.string().optional(),
    language: z.string().optional(),
    currency: z.string().optional(),
    dateFormat: z.enum(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']).optional(),
    timeFormat: z.enum(['12', '24']).optional(),
  }).optional(),
  privacy: z.object({
    profileVisibility: z.enum(['public', 'private']).optional(),
    showEmail: z.boolean().optional(),
    showPhone: z.boolean().optional(),
  }).optional(),
})

// Export type definitions
export type SignInInput = z.infer<typeof signInSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type ResetPasswordUpdateInput = z.infer<typeof resetPasswordUpdateSchema>
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>
export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type CreateClassInput = z.infer<typeof createClassSchema>
export type UpdateClassInput = z.infer<typeof updateClassSchema>
export type CreateBookingInput = z.infer<typeof createBookingSchema>
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>
export type RescheduleBookingInput = z.infer<typeof rescheduleBookingSchema>
export type CreateAvailabilityInput = z.infer<typeof createAvailabilitySchema>
export type BlockTimeInput = z.infer<typeof blockTimeSchema>
export type ReportFilterInput = z.infer<typeof reportFilterSchema>
export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>