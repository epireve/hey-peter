-- Create performance indexes

-- Indexes for frequently queried columns
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_teachers_user_id ON teachers (user_id);
CREATE INDEX idx_students_user_id ON students (user_id);
CREATE INDEX idx_courses_name ON courses (name);
CREATE INDEX idx_classes_course_id ON classes (course_id);
CREATE INDEX idx_classes_teacher_id ON classes (teacher_id);
CREATE INDEX idx_bookings_student_id ON bookings (student_id);
CREATE INDEX idx_bookings_class_id ON bookings (class_id);
CREATE INDEX idx_attendance_booking_id ON attendance (booking_id);
CREATE INDEX idx_leave_requests_student_id ON leave_requests (student_id);
CREATE INDEX idx_leave_requests_class_id ON leave_requests (class_id);
CREATE INDEX idx_materials_class_id ON materials (class_id);
CREATE INDEX idx_notifications_user_id ON notifications (user_id);
CREATE INDEX idx_feedback_student_id ON feedback (student_id);
CREATE INDEX idx_feedback_class_id ON feedback (class_id);
CREATE INDEX idx_user_roles_user_id ON user_roles (user_id);
CREATE INDEX idx_student_courses_student_id ON student_courses (student_id);
CREATE INDEX idx_student_courses_course_id ON student_courses (course_id);
CREATE INDEX idx_class_schedules_class_id ON class_schedules (class_id);
CREATE INDEX idx_class_schedules_schedule_id ON class_schedules (schedule_id);
CREATE INDEX idx_user_sessions_user_id ON user_sessions (user_id);

-- Indexes for date/timestamp columns for range queries
CREATE INDEX idx_schedules_start_time ON schedules (start_time);
CREATE INDEX idx_schedules_end_time ON schedules (end_time);
CREATE INDEX idx_bookings_booking_time ON bookings (booking_time);
CREATE INDEX idx_attendance_attendance_time ON attendance (attendance_time);
CREATE INDEX idx_leave_requests_start_date ON leave_requests (start_date);
CREATE INDEX idx_leave_requests_end_date ON leave_requests (end_date);
CREATE INDEX idx_notifications_sent_time ON notifications (sent_time);
CREATE INDEX idx_feedback_submitted_time ON feedback (submitted_time);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs (timestamp);
CREATE INDEX idx_user_sessions_login_time ON user_sessions (login_time);
CREATE INDEX idx_user_sessions_logout_time ON user_sessions (logout_time);
CREATE INDEX idx_system_events_timestamp ON system_events (timestamp);