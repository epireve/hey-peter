// Hour Management Types
export interface HourTransaction {
  id: string;
  student_id: string;
  transaction_type: 'purchase' | 'deduction' | 'refund' | 'bonus' | 'adjustment' | 'makeup';
  amount: number;
  booking_id?: string;
  class_id?: string;
  teacher_id?: string;
  description?: string;
  reason?: string;
  balance_before: number;
  balance_after: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface HourPurchase {
  id: string;
  student_id: string;
  package_name: string;
  hours_purchased: number;
  price_per_hour: number;
  total_amount: number;
  currency: string;
  payment_method: 'credit_card' | 'bank_transfer' | 'cash' | 'voucher' | 'other';
  payment_reference?: string;
  expiration_date?: string;
  purchase_date: string;
  created_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface HourPolicy {
  id: string;
  course_type: 'Basic' | 'Everyday A' | 'Everyday B' | 'Speak Up' | 'Business English' | '1-on-1';
  deduction_rate: number;
  makeup_allowed: boolean;
  makeup_deadline_days: number;
  late_cancellation_penalty: number;
  no_show_penalty: number;
  minimum_advance_notice_hours: number;
  created_at: string;
  updated_at: string;
}

export interface EnhancedLeaveRequest {
  id: string;
  student_id: string;
  teacher_id?: string;
  class_id?: string;
  start_date: string;
  end_date: string;
  leave_type: 'personal' | 'medical' | 'emergency' | 'vacation' | 'other';
  reason?: string;
  hours_affected?: number;
  hours_recovered: number;
  advance_notice_hours?: number;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string;
  approved_by?: string;
  approved_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  makeup_scheduled: boolean;
  makeup_deadline?: string;
  attachments: string[];
  created_at: string;
  updated_at: string;
}

export interface TeacherHours {
  id: string;
  teacher_id: string;
  booking_id?: string;
  class_id?: string;
  teaching_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  hours_taught: number;
  hourly_rate: number;
  base_compensation: number;
  bonus_amount: number;
  total_compensation: number;
  compensation_type: 'standard' | 'overtime' | 'holiday' | 'substitute' | 'bonus';
  status: 'pending' | 'approved' | 'paid' | 'disputed';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TeacherCompensationRule {
  id: string;
  teacher_id: string;
  course_type: 'Basic' | 'Everyday A' | 'Everyday B' | 'Speak Up' | 'Business English' | '1-on-1';
  base_rate: number;
  overtime_rate?: number;
  holiday_rate?: number;
  substitute_rate?: number;
  bonus_thresholds: Record<string, number>;
  effective_date: string;
  end_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HourExpiration {
  id: string;
  student_id: string;
  purchase_id?: string;
  hours_expiring: number;
  expiration_date: string;
  warning_sent: boolean;
  warning_sent_at?: string;
  status: 'active' | 'warned' | 'expired' | 'extended';
  created_at: string;
  updated_at: string;
}

// Extended types with relationships
export interface HourTransactionWithDetails extends HourTransaction {
  student?: {
    id: string;
    student_id: string;
    full_name: string;
    email: string;
  };
  teacher?: {
    id: string;
    full_name: string;
    email: string;
  };
  booking?: {
    id: string;
    scheduled_at: string;
    duration_minutes: number;
  };
  class?: {
    id: string;
    class_name: string;
    course_type: string;
  };
}

export interface LeaveRequestWithDetails extends EnhancedLeaveRequest {
  student: {
    id: string;
    student_id: string;
    full_name: string;
    email: string;
  };
  teacher?: {
    id: string;
    full_name: string;
    email: string;
  };
  class?: {
    id: string;
    class_name: string;
    course_type: string;
  };
  approved_by_user?: {
    id: string;
    full_name: string;
    email: string;
  };
  rejected_by_user?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface TeacherHoursWithDetails extends TeacherHours {
  teacher: {
    id: string;
    full_name: string;
    email: string;
  };
  booking?: {
    id: string;
    scheduled_at: string;
    student_id: string;
    student: {
      id: string;
      full_name: string;
      student_id: string;
    };
  };
  class?: {
    id: string;
    class_name: string;
    course_type: string;
  };
}

export interface StudentHourSummary {
  student_id: string;
  student_name: string;
  student_code: string;
  total_hours_purchased: number;
  total_hours_used: number;
  current_balance: number;
  hours_expiring_soon: number;
  last_transaction_date?: string;
  next_expiration_date?: string;
}

export interface TeacherHourSummary {
  teacher_id: string;
  teacher_name: string;
  total_hours_taught: number;
  total_compensation_earned: number;
  pending_compensation: number;
  average_hourly_rate: number;
  this_month_hours: number;
  this_month_compensation: number;
}

export interface HourPackage {
  id: string;
  name: string;
  hours: number;
  price: number;
  price_per_hour: number;
  expiration_months: number;
  course_types: string[];
  description?: string;
  is_active: boolean;
  popular?: boolean;
}

export interface HourAnalytics {
  total_students_with_hours: number;
  total_hours_in_circulation: number;
  total_hours_expired: number;
  total_revenue: number;
  hours_used_this_month: number;
  hours_purchased_this_month: number;
  average_usage_per_student: number;
  expiring_soon_count: number;
  by_course_type: Record<string, {
    hours_used: number;
    students_count: number;
    average_deduction_rate: number;
  }>;
}

export interface LeaveRequestAnalytics {
  total_requests: number;
  approved_requests: number;
  rejected_requests: number;
  pending_requests: number;
  total_hours_affected: number;
  total_hours_recovered: number;
  average_processing_time_days: number;
  by_leave_type: Record<string, {
    count: number;
    approval_rate: number;
    average_hours_affected: number;
  }>;
}

// Form types
export interface HourPurchaseForm {
  student_id: string;
  package_name: string;
  hours_purchased: number;
  price_per_hour: number;
  total_amount: number;
  payment_method: 'credit_card' | 'bank_transfer' | 'cash' | 'voucher' | 'other';
  payment_reference?: string;
  expiration_date?: string;
  notes?: string;
}

export interface LeaveRequestForm {
  student_id: string;
  teacher_id?: string;
  class_id?: string;
  start_date: string;
  end_date: string;
  leave_type: 'personal' | 'medical' | 'emergency' | 'vacation' | 'other';
  reason?: string;
  hours_affected?: number;
  attachments?: File[];
}

export interface HourAdjustmentForm {
  student_id: string;
  transaction_type: 'adjustment' | 'bonus' | 'refund';
  amount: number;
  reason: string;
  description?: string;
}

export interface TeacherCompensationForm {
  teacher_id: string;
  course_type: string;
  base_rate: number;
  overtime_rate?: number;
  holiday_rate?: number;
  substitute_rate?: number;
  bonus_thresholds?: Record<string, number>;
  effective_date: string;
  end_date?: string;
}

// API Response types
export interface HourManagementResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedHourResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Filter types
export interface HourTransactionFilters {
  student_id?: string;
  transaction_type?: string;
  date_from?: string;
  date_to?: string;
  created_by?: string;
}

export interface LeaveRequestFilters {
  student_id?: string;
  teacher_id?: string;
  status?: string;
  leave_type?: string;
  date_from?: string;
  date_to?: string;
}

export interface TeacherHoursFilters {
  teacher_id?: string;
  date_from?: string;
  date_to?: string;
  status?: string;
  compensation_type?: string;
}