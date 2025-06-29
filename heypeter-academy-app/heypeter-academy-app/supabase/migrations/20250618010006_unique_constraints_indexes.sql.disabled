-- Define unique constraints and indexes

-- users table
ALTER TABLE users ADD CONSTRAINT unique_users_email UNIQUE (email);

-- teachers table
ALTER TABLE teachers ADD CONSTRAINT unique_teachers_user_id UNIQUE (user_id);

-- students table
ALTER TABLE students ADD CONSTRAINT unique_students_user_id UNIQUE (user_id);

-- courses table
ALTER TABLE courses ADD CONSTRAINT unique_courses_name UNIQUE (name);

-- classes table (no additional unique constraints)

-- schedules table (no additional unique constraints)

-- bookings table (no additional unique constraints)

-- attendance table (no additional unique constraints)

-- leave_requests table (no additional unique constraints)

-- materials table (no additional unique constraints)

-- notifications table (no additional unique constraints)

-- feedback table (no additional unique constraints)

-- user_roles table (no additional unique constraints)

-- student_courses table (no additional unique constraints)

-- class_schedules table (no additional unique constraints)

-- audit_logs table (no additional unique constraints)

-- user_sessions table (no additional unique constraints)

-- system_events table (no additional unique constraints)

-- Indexes for performance (will be covered in a separate subtask, but included here for context)
-- CREATE INDEX idx_users_email ON users (email);
-- CREATE INDEX idx_teachers_user_id ON teachers (user_id);
-- CREATE INDEX idx_students_user_id ON students (user_id);
-- CREATE INDEX idx_courses_name ON courses (name);
-- CREATE INDEX idx_classes_course_id ON classes (course_id);
-- CREATE INDEX idx_classes_teacher_id ON classes (teacher_id);
-- CREATE INDEX idx_bookings_student_id ON bookings (student_id);
-- CREATE INDEX idx_bookings_class_id ON bookings (class_id);
-- CREATE INDEX idx_attendance_booking_id ON attendance (booking_id);
-- CREATE INDEX idx_leave_requests_student_id ON leave_requests (student_id);
-- CREATE INDEX idx_leave_requests_class_id ON leave_requests (class_id);
-- CREATE INDEX idx_materials_class_id ON materials (class_id);
-- CREATE INDEX idx_notifications_user_id ON notifications (user_id);
-- CREATE INDEX idx_feedback_student_id ON feedback (student_id);
-- CREATE INDEX idx_feedback_class_id ON feedback (class_id);
-- CREATE INDEX idx_user_roles_user_id ON user_roles (user_id);
-- CREATE INDEX idx_student_courses_student_id ON student_courses (student_id);
-- CREATE INDEX idx_student_courses_course_id ON student_courses (course_id);
-- CREATE INDEX idx_class_schedules_class_id ON class_schedules (class_id);
-- CREATE INDEX idx_class_schedules_schedule_id ON class_schedules (schedule_id);
-- CREATE INDEX idx_user_sessions_user_id ON user_sessions (user_id);