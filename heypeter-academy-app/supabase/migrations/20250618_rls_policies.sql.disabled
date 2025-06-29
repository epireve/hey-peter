-- Enable Row Level Security (RLS) on tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Policy for users to view their own data
CREATE POLICY "Allow users to view their own data" ON users FOR SELECT USING (auth.uid() = id);

-- Policy for teachers to view their own data
CREATE POLICY "Allow teachers to view their own data" ON teachers FOR SELECT USING (auth.uid() = user_id);

-- Policy for students to view their own data
CREATE POLICY "Allow students to view their own data" ON students FOR SELECT USING (auth.uid() = user_id);

-- Policy for users to insert their own data
CREATE POLICY "Allow users to insert their own data" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- Policy for teachers to insert their own data
CREATE POLICY "Allow teachers to insert their own data" ON teachers FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy for students to insert their own data
CREATE POLICY "Allow students to insert their own data" ON students FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy for users to update their own data
CREATE POLICY "Allow users to update their own data" ON users FOR UPDATE USING (auth.uid() = id);

-- Policy for teachers to update their own data
CREATE POLICY "Allow teachers to update their own data" ON teachers FOR UPDATE USING (auth.uid() = user_id);

-- Policy for students to update their own data
CREATE POLICY "Allow students to update their own data" ON students FOR UPDATE USING (auth.uid() = user_id);

-- Policy for users to delete their own data
CREATE POLICY "Allow users to delete their own data" ON users FOR DELETE USING (auth.uid() = id);

-- Policy for teachers to delete their own data
CREATE POLICY "Allow teachers to delete their own data" ON teachers FOR DELETE USING (auth.uid() = user_id);

-- Policy for students to delete their own data
CREATE POLICY "Allow students to delete their own data" ON students FOR DELETE USING (auth.uid() = user_id);

-- Policies for courses (can be viewed by all authenticated users)
CREATE POLICY "Allow authenticated users to view courses" ON courses FOR SELECT USING (auth.role() = 'authenticated');

-- Policies for classes (can be viewed by all authenticated users)
CREATE POLICY "Allow authenticated users to view classes" ON classes FOR SELECT USING (auth.role() = 'authenticated');

-- Policies for schedules (can be viewed by all authenticated users)
CREATE POLICY "Allow authenticated users to view schedules" ON schedules FOR SELECT USING (auth.role() = 'authenticated');

-- Policies for bookings (students can view and manage their own bookings)
CREATE POLICY "Allow students to view their own bookings" ON bookings FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Allow students to insert their own bookings" ON bookings FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Allow students to update their own bookings" ON bookings FOR UPDATE USING (auth.uid() = student_id);
CREATE POLICY "Allow students to delete their own bookings" ON bookings FOR DELETE USING (auth.uid() = student_id);

-- Policies for attendance (teachers can view and manage attendance for their classes)
CREATE POLICY "Allow teachers to view attendance for their classes" ON attendance FOR SELECT USING (EXISTS (SELECT 1 FROM classes WHERE classes.id = (SELECT class_id FROM bookings WHERE bookings.id = attendance.booking_id) AND classes.teacher_id = auth.uid()));
CREATE POLICY "Allow teachers to insert attendance for their classes" ON attendance FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM classes WHERE classes.id = (SELECT class_id FROM bookings WHERE bookings.id = attendance.booking_id) AND classes.teacher_id = auth.uid()));
CREATE POLICY "Allow teachers to update attendance for their classes" ON attendance FOR UPDATE USING (EXISTS (SELECT 1 FROM classes WHERE classes.id = (SELECT class_id FROM bookings WHERE bookings.id = attendance.booking_id) AND classes.teacher_id = auth.uid()));
CREATE POLICY "Allow teachers to delete attendance for their classes" ON attendance FOR DELETE USING (EXISTS (SELECT 1 FROM classes WHERE classes.id = (SELECT class_id FROM bookings WHERE bookings.id = attendance.booking_id) AND classes.teacher_id = auth.uid()));

-- Policies for leave_requests (students can view and manage their own leave requests)
CREATE POLICY "Allow students to view their own leave requests" ON leave_requests FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Allow students to insert their own leave requests" ON leave_requests FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Allow students to update their own leave requests" ON leave_requests FOR UPDATE USING (auth.uid() = student_id);
CREATE POLICY "Allow students to delete their own leave requests" ON leave_requests FOR DELETE USING (auth.uid() = student_id);

-- Policies for materials (teachers can view and manage materials for their classes)
CREATE POLICY "Allow teachers to view materials for their classes" ON materials FOR SELECT USING (EXISTS (SELECT 1 FROM classes WHERE classes.id = materials.class_id AND classes.teacher_id = auth.uid()));
CREATE POLICY "Allow teachers to insert materials for their classes" ON materials FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM classes WHERE classes.id = materials.class_id AND classes.teacher_id = auth.uid()));
CREATE POLICY "Allow teachers to update materials for their classes" ON materials FOR UPDATE USING (EXISTS (SELECT 1 FROM classes WHERE classes.id = materials.class_id AND classes.teacher_id = auth.uid()));
CREATE POLICY "Allow teachers to delete materials for their classes" ON materials FOR DELETE USING (EXISTS (SELECT 1 FROM classes WHERE classes.id = materials.class_id AND classes.teacher_id = auth.uid()));

-- Policies for notifications (users can view their own notifications)
CREATE POLICY "Allow users to view their own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);

-- Policies for feedback (students can view and manage their own feedback)
CREATE POLICY "Allow students to view their own feedback" ON feedback FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Allow students to insert their own feedback" ON feedback FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Allow students to update their own feedback" ON feedback FOR UPDATE USING (auth.uid() = student_id);
CREATE POLICY "Allow students to delete their own feedback" ON feedback FOR DELETE USING (auth.uid() = student_id);

-- Policies for user_roles (can be viewed by admin)
CREATE POLICY "Allow admin to view user roles" ON user_roles FOR SELECT USING (auth.role() = 'admin');

-- Policies for student_courses (can be viewed by admin and students for their own courses)
CREATE POLICY "Allow admin to view student courses" ON student_courses FOR SELECT USING (auth.role() = 'admin');
CREATE POLICY "Allow students to view their own student courses" ON student_courses FOR SELECT USING (auth.uid() = student_id);

-- Policies for class_schedules (can be viewed by all authenticated users)
CREATE POLICY "Allow authenticated users to view class schedules" ON class_schedules FOR SELECT USING (auth.role() = 'authenticated');

-- Policies for audit_logs (can be viewed by admin)
CREATE POLICY "Allow admin to view audit logs" ON audit_logs FOR SELECT USING (auth.role() = 'admin');

-- Policies for user_sessions (can be viewed by admin and users for their own sessions)
CREATE POLICY "Allow admin to view user sessions" ON user_sessions FOR SELECT USING (auth.role() = 'admin');
CREATE POLICY "Allow users to view their own user sessions" ON user_sessions FOR SELECT USING (auth.uid() = user_id);

-- Policies for system_events (can be viewed by admin)
CREATE POLICY "Allow admin to view system events" ON system_events FOR SELECT USING (auth.role() = 'admin');