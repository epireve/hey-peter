-- Create database roles
CREATE ROLE admin;
CREATE ROLE teacher;
CREATE ROLE student;

-- Grant permissions to roles

-- Admin role: full access to all tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO admin;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO admin;

-- Teacher role: limited access
-- Can view users, teachers, students, courses, classes, schedules, bookings, attendance, leave_requests, materials, notifications, feedback
GRANT SELECT ON users TO teacher;
GRANT SELECT ON teachers TO teacher;
GRANT SELECT ON students TO teacher;
GRANT SELECT ON courses TO teacher;
GRANT SELECT ON classes TO teacher;
GRANT SELECT ON schedules TO teacher;
GRANT SELECT ON bookings TO teacher;
GRANT SELECT ON attendance TO teacher;
GRANT SELECT ON leave_requests TO teacher;
GRANT SELECT ON materials TO teacher;
GRANT SELECT ON notifications TO teacher;
GRANT SELECT ON feedback TO teacher;

-- Can insert, update, delete attendance and materials for their classes (handled by RLS)
GRANT INSERT, UPDATE, DELETE ON attendance TO teacher;
GRANT INSERT, UPDATE, DELETE ON materials TO teacher;

-- Student role: limited access
-- Can view users, teachers, students, courses, classes, schedules, materials, notifications, feedback
GRANT SELECT ON users TO student;
GRANT SELECT ON teachers TO student;
GRANT SELECT ON students TO student;
GRANT SELECT ON courses TO student;
GRANT SELECT ON classes TO student;
GRANT SELECT ON schedules TO student;
GRANT SELECT ON materials TO student;
GRANT SELECT ON notifications TO student;
GRANT SELECT ON feedback TO student;

-- Can view and manage their own bookings and leave_requests (handled by RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON bookings TO student;
GRANT SELECT, INSERT, UPDATE, DELETE ON leave_requests TO student;

-- Grant usage on sequences for tables with serial primary keys
GRANT USAGE ON SEQUENCE users_id_seq TO admin, teacher, student;
GRANT USAGE ON SEQUENCE teachers_id_seq TO admin, teacher, student;
GRANT USAGE ON SEQUENCE students_id_seq TO admin, teacher, student;
GRANT USAGE ON SEQUENCE courses_id_seq TO admin, teacher, student;
GRANT USAGE ON SEQUENCE classes_id_seq TO admin, teacher, student;
GRANT USAGE ON SEQUENCE schedules_id_seq TO admin, teacher, student;
GRANT USAGE ON SEQUENCE bookings_id_seq TO admin, teacher, student;
GRANT USAGE ON SEQUENCE attendance_id_seq TO admin, teacher, student;
GRANT USAGE ON SEQUENCE leave_requests_id_seq TO admin, teacher, student;
GRANT USAGE ON SEQUENCE materials_id_seq TO admin, teacher, student;
GRANT USAGE ON SEQUENCE notifications_id_seq TO admin, teacher, student;
GRANT USAGE ON SEQUENCE feedback_id_seq TO admin, teacher, student;
GRANT USAGE ON SEQUENCE audit_logs_id_seq TO admin;
GRANT USAGE ON SEQUENCE user_sessions_id_seq TO admin, teacher, student;
GRANT USAGE ON SEQUENCE system_events_id_seq TO admin;

-- Grant execute on functions (will be defined later)
-- GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;