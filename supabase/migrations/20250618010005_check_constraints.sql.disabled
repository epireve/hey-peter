-- Define check constraints and data validation

-- users table
ALTER TABLE users ADD CONSTRAINT check_users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
ALTER TABLE users ADD CONSTRAINT check_users_role_valid CHECK (role IN ('admin', 'teacher', 'student'));

-- teachers table (no additional check constraints)

-- students table (no additional check constraints)

-- courses table
ALTER TABLE courses ADD CONSTRAINT check_courses_credit_hours_positive CHECK (credit_hours > 0);

-- classes table
ALTER TABLE classes ADD CONSTRAINT check_classes_capacity_positive CHECK (capacity > 0);

-- schedules table
ALTER TABLE schedules ADD CONSTRAINT check_schedules_day_valid CHECK (day IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'));
ALTER TABLE schedules ADD CONSTRAINT check_schedules_start_before_end CHECK (start_time < end_time);

-- bookings table
ALTER TABLE bookings ADD CONSTRAINT check_bookings_status_valid CHECK (status IN ('booked', 'cancelled', 'completed'));

-- attendance table
ALTER TABLE attendance ADD CONSTRAINT check_attendance_status_valid CHECK (status IN ('present', 'absent', 'late', 'excused'));

-- leave_requests table
ALTER TABLE leave_requests ADD CONSTRAINT check_leave_requests_status_valid CHECK (status IN ('pending', 'approved', 'rejected'));
ALTER TABLE leave_requests ADD CONSTRAINT check_leave_requests_start_before_end CHECK (start_date <= end_date);

-- materials table (no additional check constraints)

-- notifications table
ALTER TABLE notifications ADD CONSTRAINT check_notifications_status_valid CHECK (status IN ('sent', 'delivered', 'read'));

-- feedback table
ALTER TABLE feedback ADD CONSTRAINT check_feedback_rating_range CHECK (rating >= 1 AND rating <= 5);

-- user_roles table (no additional check constraints)

-- student_courses table (no additional check constraints)

-- class_schedules table (no additional check constraints)

-- audit_logs table (no additional check constraints)

-- user_sessions table (no additional check constraints)

-- system_events table (no additional check constraints)