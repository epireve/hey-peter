/**
 * Student type definitions
 */

export interface Student {
  id: string;
  email: string;
  full_name: string;
  status?: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at?: string;
  profile_data?: StudentProfileData;
  user?: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  };
  // Relations
  enrollments?: Enrollment[];
  attendance_records?: AttendanceRecord[];
  hour_balance?: HourBalance;
}

export interface StudentProfileData {
  phone_number?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  address?: string;
  emergency_contact?: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
  medical_info?: {
    allergies?: string[];
    conditions?: string[];
    medications?: string[];
    notes?: string;
  };
  preferences?: {
    preferred_teachers?: string[];
    preferred_class_times?: string[];
    learning_goals?: string[];
  };
  notes?: string;
  custom_fields?: Record<string, any>;
}

export interface StudentFormData {
  email: string;
  full_name: string;
  password?: string;
  status?: 'active' | 'inactive' | 'suspended';
  profile_data?: StudentProfileData;
}

export interface Enrollment {
  id: string;
  student_id: string;
  course_id: string;
  enrolled_at: string;
  completed_at?: string;
  progress: number;
  status: 'active' | 'completed' | 'dropped' | 'paused';
  course?: {
    id: string;
    name: string;
    level: string;
    duration_weeks: number;
  };
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  class_id: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  check_in_time?: string;
  check_out_time?: string;
  notes?: string;
  class?: {
    id: string;
    title: string;
    scheduled_at: string;
  };
}

export interface HourBalance {
  student_id: string;
  total_hours: number;
  used_hours: number;
  remaining_hours: number;
  expiring_hours?: {
    hours: number;
    expires_at: string;
  }[];
  last_purchase_date?: string;
  next_expiry_date?: string;
}

export interface StudentFilter {
  status?: 'active' | 'inactive' | 'suspended' | 'all';
  search?: string;
  course_id?: string;
  teacher_id?: string;
  created_after?: string;
  created_before?: string;
  has_hours?: boolean;
  order_by?: 'name' | 'created_at' | 'last_active' | 'hours_remaining';
  order_direction?: 'asc' | 'desc';
}

export interface StudentStats {
  total_students: number;
  active_students: number;
  new_this_month: number;
  average_attendance_rate: number;
  average_progress: number;
  total_hours_consumed: number;
  students_at_risk: number;
}