export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          role: 'admin' | 'teacher' | 'student'
          first_name: string
          last_name: string
          phone: string | null
          avatar_url: string | null
          timezone: string
          language: string
          created_at: string
          updated_at: string
          last_sign_in_at: string | null
          email_verified_at: string | null
          is_active: boolean
          metadata: Json | null
        }
        Insert: {
          id?: string
          email: string
          role?: 'admin' | 'teacher' | 'student'
          first_name: string
          last_name: string
          phone?: string | null
          avatar_url?: string | null
          timezone?: string
          language?: string
          created_at?: string
          updated_at?: string
          last_sign_in_at?: string | null
          email_verified_at?: string | null
          is_active?: boolean
          metadata?: Json | null
        }
        Update: {
          id?: string
          email?: string
          role?: 'admin' | 'teacher' | 'student'
          first_name?: string
          last_name?: string
          phone?: string | null
          avatar_url?: string | null
          timezone?: string
          language?: string
          created_at?: string
          updated_at?: string
          last_sign_in_at?: string | null
          email_verified_at?: string | null
          is_active?: boolean
          metadata?: Json | null
        }
        Relationships: []
      }
      classes: {
        Row: {
          id: string
          title: string
          description: string | null
          type: 'individual' | 'group'
          level: 'beginner' | 'intermediate' | 'advanced'
          duration_minutes: number
          max_students: number
          price_per_student: number
          currency: string
          teacher_id: string
          is_active: boolean
          created_at: string
          updated_at: string
          metadata: Json | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          type?: 'individual' | 'group'
          level?: 'beginner' | 'intermediate' | 'advanced'
          duration_minutes?: number
          max_students?: number
          price_per_student?: number
          currency?: string
          teacher_id: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
          metadata?: Json | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          type?: 'individual' | 'group'
          level?: 'beginner' | 'intermediate' | 'advanced'
          duration_minutes?: number
          max_students?: number
          price_per_student?: number
          currency?: string
          teacher_id?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      bookings: {
        Row: {
          id: string
          class_id: string
          student_id: string
          teacher_id: string
          scheduled_at: string
          duration_minutes: number
          status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no-show' | 'rescheduled'
          total_price: number
          currency: string
          notes: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
          recurring_pattern: 'none' | 'weekly' | 'biweekly' | 'monthly' | null
          recurring_end_date: string | null
          parent_booking_id: string | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          class_id: string
          student_id: string
          teacher_id: string
          scheduled_at: string
          duration_minutes?: number
          status?: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no-show' | 'rescheduled'
          total_price?: number
          currency?: string
          notes?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
          recurring_pattern?: 'none' | 'weekly' | 'biweekly' | 'monthly' | null
          recurring_end_date?: string | null
          parent_booking_id?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          class_id?: string
          student_id?: string
          teacher_id?: string
          scheduled_at?: string
          duration_minutes?: number
          status?: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no-show' | 'rescheduled'
          total_price?: number
          currency?: string
          notes?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
          recurring_pattern?: 'none' | 'weekly' | 'biweekly' | 'monthly' | null
          recurring_end_date?: string | null
          parent_booking_id?: string | null
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_parent_booking_id_fkey"
            columns: ["parent_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          }
        ]
      }
      teacher_availability: {
        Row: {
          id: string
          teacher_id: string
          day_of_week: number
          start_time: string
          end_time: string
          is_available: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          teacher_id: string
          day_of_week: number
          start_time: string
          end_time: string
          is_available?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          teacher_id?: string
          day_of_week?: number
          start_time?: string
          end_time?: string
          is_available?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_availability_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      availability_blocks: {
        Row: {
          id: string
          teacher_id: string
          start_datetime: string
          end_datetime: string
          type: 'break' | 'meeting' | 'holiday' | 'other'
          title: string
          description: string | null
          is_recurring: boolean
          recurring_pattern: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          teacher_id: string
          start_datetime: string
          end_datetime: string
          type?: 'break' | 'meeting' | 'holiday' | 'other'
          title: string
          description?: string | null
          is_recurring?: boolean
          recurring_pattern?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          teacher_id?: string
          start_datetime?: string
          end_datetime?: string
          type?: 'break' | 'meeting' | 'holiday' | 'other'
          title?: string
          description?: string | null
          is_recurring?: boolean
          recurring_pattern?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_blocks_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      feedback: {
        Row: {
          id: string
          booking_id: string
          teacher_id: string
          student_id: string
          overall_rating: number
          skill_ratings: Json
          strengths: string | null
          areas_for_improvement: string | null
          homework_assigned: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          teacher_id: string
          student_id: string
          overall_rating?: number
          skill_ratings?: Json
          strengths?: string | null
          areas_for_improvement?: string | null
          homework_assigned?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          teacher_id?: string
          student_id?: string
          overall_rating?: number
          skill_ratings?: Json
          strengths?: string | null
          areas_for_improvement?: string | null
          homework_assigned?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          message: string
          data: Json | null
          read_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          message: string
          data?: Json | null
          read_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          message?: string
          data?: Json | null
          read_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      system_settings: {
        Row: {
          id: string
          key: string
          value: Json
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value: Json
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: Json
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'admin' | 'teacher' | 'student'
      class_type: 'individual' | 'group'
      class_level: 'beginner' | 'intermediate' | 'advanced'
      booking_status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no-show' | 'rescheduled'
      recurring_pattern: 'none' | 'weekly' | 'biweekly' | 'monthly'
      block_type: 'break' | 'meeting' | 'holiday' | 'other'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for better type inference
export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (
      Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Row: infer R
      }
        ? R
        : never
    )
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"])
  ? (
      Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Row: infer R
      }
        ? R
        : never
    )
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (
      Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Insert: infer I
      }
        ? I
        : never
    )
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"])
  ? (
      Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
        ? I
        : never
    )
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (
      Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Update: infer U
      }
        ? U
        : never
    )
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"])
  ? (
      Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
        ? U
        : never
    )
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof (Database["public"]["Enums"])
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicEnumNameOrOptions["schema"]]["Enums"])
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof (Database["public"]["Enums"])
  ? Database["public"]["Enums"][PublicEnumNameOrOptions]
  : never

// Convenience types for common table operations
export type User = Tables<'users'>
export type UserInsert = TablesInsert<'users'>
export type UserUpdate = TablesUpdate<'users'>

export type Class = Tables<'classes'>
export type ClassInsert = TablesInsert<'classes'>
export type ClassUpdate = TablesUpdate<'classes'>

export type Booking = Tables<'bookings'>
export type BookingInsert = TablesInsert<'bookings'>
export type BookingUpdate = TablesUpdate<'bookings'>

export type TeacherAvailability = Tables<'teacher_availability'>
export type TeacherAvailabilityInsert = TablesInsert<'teacher_availability'>
export type TeacherAvailabilityUpdate = TablesUpdate<'teacher_availability'>

export type AvailabilityBlock = Tables<'availability_blocks'>
export type AvailabilityBlockInsert = TablesInsert<'availability_blocks'>
export type AvailabilityBlockUpdate = TablesUpdate<'availability_blocks'>

export type Feedback = Tables<'feedback'>
export type FeedbackInsert = TablesInsert<'feedback'>
export type FeedbackUpdate = TablesUpdate<'feedback'>

export type Notification = Tables<'notifications'>
export type NotificationInsert = TablesInsert<'notifications'>
export type NotificationUpdate = TablesUpdate<'notifications'>

export type SystemSetting = Tables<'system_settings'>
export type SystemSettingInsert = TablesInsert<'system_settings'>
export type SystemSettingUpdate = TablesUpdate<'system_settings'>

// Enum types
export type UserRole = Enums<'user_role'>
export type ClassType = Enums<'class_type'>
export type ClassLevel = Enums<'class_level'>
export type BookingStatus = Enums<'booking_status'>
export type RecurringPattern = Enums<'recurring_pattern'>
export type BlockType = Enums<'block_type'>

// Extended types with relationships
export type BookingWithDetails = Booking & {
  class: Class
  student: User
  teacher: User
  feedback?: Feedback
}

export type ClassWithTeacher = Class & {
  teacher: User
}

export type UserWithCounts = User & {
  _count?: {
    classes?: number
    bookings?: number
    feedback?: number
  }
}

export type FeedbackWithDetails = Feedback & {
  booking: Booking
  teacher: User
  student: User
}

// Skill ratings structure for feedback
export interface SkillRatings {
  speaking?: number
  listening?: number
  reading?: number
  writing?: number
  grammar?: number
  vocabulary?: number
}

// Notification data structures
export interface BookingNotificationData {
  bookingId: string
  classTitle: string
  scheduledAt: string
  teacherName?: string
  studentName?: string
}

export interface SystemNotificationData {
  version?: string
  features?: string[]
  maintenance?: {
    startTime: string
    endTime: string
    description: string
  }
}

// API response types
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
  meta?: {
    timestamp: string
    requestId: string
  }
}