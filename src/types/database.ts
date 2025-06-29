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
  ? (Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName])
  : PublicEnumNameOrOptions extends keyof (Database["public"]["Enums"])
  ? (Database["public"]["Enums"][PublicEnumNameOrOptions])
  : never

// Custom composite types
export type Booking = Tables<'bookings'>
export type User = Tables<'users'>
export type Class = Tables<'classes'>
export type Feedback = Tables<'feedback'>

export type BookingWithDetails = Booking & {
  student: User
  teacher: User
  class: Class
}

export type ClassWithTeacher = Class & {
  teacher: User
}

export type UserWithCounts = User & {
  booking_count: number
  class_count: number
}

export type FeedbackWithDetails = Feedback & {
  booking: Booking
  student: User
  teacher: User
}

// JSON type for skill ratings in feedback
export interface SkillRatings {
  speaking: number
  listening: number
  reading: number
  writing: number
  grammar: number
  vocabulary: number
}

// JSON type for notification data
export interface BookingNotificationData {
  bookingId: string
  classTitle: string
  scheduledAt: string
}

export interface SystemNotificationData {
  title: string
  message: string
  link?: string
}

// Generic paginated response for API calls
export interface PaginatedResponse<T> {
  data: T[]
  page: number
  limit: number
  total: number
  totalPages: number
}

// Generic API response structure
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: {
    code: string
    message: string
    details?: unknown
  }
}