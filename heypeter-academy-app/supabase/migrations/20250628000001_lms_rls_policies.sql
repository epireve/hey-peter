-- LMS Row Level Security (RLS) Policies
-- This migration enables RLS and creates security policies for all LMS tables

-- Enable Row Level Security (RLS) on all tables
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
ALTER TABLE student_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_events ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user has admin role
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user has teacher role
CREATE OR REPLACE FUNCTION is_teacher() RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'teacher'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user has student role
CREATE OR REPLACE FUNCTION is_student() RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'student'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- USERS TABLE POLICIES

-- Allow users to view their own data
CREATE POLICY "users_select_own" ON users 
  FOR SELECT USING (auth.uid() = id);

-- Allow admins to view all users
CREATE POLICY "users_select_admin" ON users 
  FOR SELECT USING (is_admin());

-- Allow users to update their own data (except role)
CREATE POLICY "users_update_own" ON users 
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM users WHERE id = auth.uid()));

-- Allow admins to update any user
CREATE POLICY "users_update_admin" ON users 
  FOR UPDATE USING (is_admin());

-- Allow admins to insert users
CREATE POLICY "users_insert_admin" ON users 
  FOR INSERT WITH CHECK (is_admin());

-- Allow admins to delete users
CREATE POLICY "users_delete_admin" ON users 
  FOR DELETE USING (is_admin());

-- TEACHERS TABLE POLICIES

-- Allow teachers to view their own data
CREATE POLICY "teachers_select_own" ON teachers 
  FOR SELECT USING (auth.uid() = user_id);

-- Allow admins to view all teachers
CREATE POLICY "teachers_select_admin" ON teachers 
  FOR SELECT USING (is_admin());

-- Allow authenticated users to view teacher basic info for booking
CREATE POLICY "teachers_select_public" ON teachers 
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow teachers to update their own data
CREATE POLICY "teachers_update_own" ON teachers 
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow admins to update any teacher
CREATE POLICY "teachers_update_admin" ON teachers 
  FOR UPDATE USING (is_admin());

-- Allow admins to insert teachers
CREATE POLICY "teachers_insert_admin" ON teachers 
  FOR INSERT WITH CHECK (is_admin());

-- Allow admins to delete teachers
CREATE POLICY "teachers_delete_admin" ON teachers 
  FOR DELETE USING (is_admin());

-- STUDENTS TABLE POLICIES

-- Allow students to view their own data
CREATE POLICY "students_select_own" ON students 
  FOR SELECT USING (auth.uid() = user_id);

-- Allow admins to view all students
CREATE POLICY "students_select_admin" ON students 
  FOR SELECT USING (is_admin());

-- Allow teachers to view students in their classes
CREATE POLICY "students_select_teacher" ON students 
  FOR SELECT USING (
    is_teacher() AND EXISTS (
      SELECT 1 FROM bookings b 
      JOIN classes c ON b.class_id = c.id 
      WHERE b.student_id = students.id AND c.teacher_id = (
        SELECT id FROM teachers WHERE user_id = auth.uid()
      )
    )
  );

-- Allow students to update their own profile data (limited fields)
CREATE POLICY "students_update_own" ON students 
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow admins to update any student
CREATE POLICY "students_update_admin" ON students 
  FOR UPDATE USING (is_admin());

-- Allow admins to insert students
CREATE POLICY "students_insert_admin" ON students 
  FOR INSERT WITH CHECK (is_admin());

-- Allow admins to delete students
CREATE POLICY "students_delete_admin" ON students 
  FOR DELETE USING (is_admin());

-- COURSES TABLE POLICIES

-- Allow all authenticated users to view courses
CREATE POLICY "courses_select_authenticated" ON courses 
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow admins to manage courses
CREATE POLICY "courses_all_admin" ON courses 
  FOR ALL USING (is_admin());

-- CLASSES TABLE POLICIES

-- Allow all authenticated users to view classes
CREATE POLICY "classes_select_authenticated" ON classes 
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow teachers to update their own classes
CREATE POLICY "classes_update_teacher" ON classes 
  FOR UPDATE USING (
    teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
  );

-- Allow admins to manage classes
CREATE POLICY "classes_all_admin" ON classes 
  FOR ALL USING (is_admin());

-- SCHEDULES TABLE POLICIES

-- Allow all authenticated users to view schedules
CREATE POLICY "schedules_select_authenticated" ON schedules 
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow admins to manage schedules
CREATE POLICY "schedules_all_admin" ON schedules 
  FOR ALL USING (is_admin());

-- BOOKINGS TABLE POLICIES

-- Allow students to view their own bookings
CREATE POLICY "bookings_select_student" ON bookings 
  FOR SELECT USING (
    student_id = (SELECT id FROM students WHERE user_id = auth.uid())
  );

-- Allow teachers to view bookings for their classes
CREATE POLICY "bookings_select_teacher" ON bookings 
  FOR SELECT USING (
    is_teacher() AND EXISTS (
      SELECT 1 FROM classes c 
      WHERE c.id = bookings.class_id AND c.teacher_id = (
        SELECT id FROM teachers WHERE user_id = auth.uid()
      )
    )
  );

-- Allow admins to view all bookings
CREATE POLICY "bookings_select_admin" ON bookings 
  FOR SELECT USING (is_admin());

-- Allow students to create their own bookings
CREATE POLICY "bookings_insert_student" ON bookings 
  FOR INSERT WITH CHECK (
    student_id = (SELECT id FROM students WHERE user_id = auth.uid())
  );

-- Allow students to update their own bookings (limited)
CREATE POLICY "bookings_update_student" ON bookings 
  FOR UPDATE USING (
    student_id = (SELECT id FROM students WHERE user_id = auth.uid())
  );

-- Allow teachers to update bookings for their classes
CREATE POLICY "bookings_update_teacher" ON bookings 
  FOR UPDATE USING (
    is_teacher() AND EXISTS (
      SELECT 1 FROM classes c 
      WHERE c.id = bookings.class_id AND c.teacher_id = (
        SELECT id FROM teachers WHERE user_id = auth.uid()
      )
    )
  );

-- Allow admins to manage all bookings
CREATE POLICY "bookings_all_admin" ON bookings 
  FOR ALL USING (is_admin());

-- ATTENDANCE TABLE POLICIES

-- Allow students to view their own attendance
CREATE POLICY "attendance_select_student" ON attendance 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings b 
      WHERE b.id = attendance.booking_id AND b.student_id = (
        SELECT id FROM students WHERE user_id = auth.uid()
      )
    )
  );

-- Allow teachers to manage attendance for their classes
CREATE POLICY "attendance_teacher" ON attendance 
  FOR ALL USING (
    is_teacher() AND EXISTS (
      SELECT 1 FROM bookings b 
      JOIN classes c ON b.class_id = c.id 
      WHERE b.id = attendance.booking_id AND c.teacher_id = (
        SELECT id FROM teachers WHERE user_id = auth.uid()
      )
    )
  );

-- Allow admins to manage all attendance
CREATE POLICY "attendance_all_admin" ON attendance 
  FOR ALL USING (is_admin());

-- LEAVE REQUESTS TABLE POLICIES

-- Allow students to manage their own leave requests
CREATE POLICY "leave_requests_student" ON leave_requests 
  FOR ALL USING (
    student_id = (SELECT id FROM students WHERE user_id = auth.uid())
  );

-- Allow teachers to view leave requests for their students
CREATE POLICY "leave_requests_select_teacher" ON leave_requests 
  FOR SELECT USING (
    is_teacher() AND (
      teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid()) OR
      EXISTS (
        SELECT 1 FROM bookings b 
        JOIN classes c ON b.class_id = c.id 
        WHERE b.student_id = leave_requests.student_id AND c.teacher_id = (
          SELECT id FROM teachers WHERE user_id = auth.uid()
        )
      )
    )
  );

-- Allow admins to manage all leave requests
CREATE POLICY "leave_requests_all_admin" ON leave_requests 
  FOR ALL USING (is_admin());

-- MATERIALS TABLE POLICIES

-- Allow all authenticated users to view materials
CREATE POLICY "materials_select_authenticated" ON materials 
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow teachers to manage materials for their courses
CREATE POLICY "materials_teacher" ON materials 
  FOR ALL USING (
    is_teacher() AND EXISTS (
      SELECT 1 FROM classes c 
      WHERE c.course_id = materials.course_id AND c.teacher_id = (
        SELECT id FROM teachers WHERE user_id = auth.uid()
      )
    )
  );

-- Allow admins to manage all materials
CREATE POLICY "materials_all_admin" ON materials 
  FOR ALL USING (is_admin());

-- STUDENT MATERIALS TABLE POLICIES

-- Allow students to view their own material assignments
CREATE POLICY "student_materials_select_student" ON student_materials 
  FOR SELECT USING (
    student_id = (SELECT id FROM students WHERE user_id = auth.uid())
  );

-- Allow admins and teachers to manage student materials
CREATE POLICY "student_materials_admin_teacher" ON student_materials 
  FOR ALL USING (is_admin() OR is_teacher());

-- NOTIFICATIONS TABLE POLICIES

-- Allow users to view their own notifications
CREATE POLICY "notifications_select_own" ON notifications 
  FOR SELECT USING (auth.uid() = user_id);

-- Allow users to update their own notifications (mark as read)
CREATE POLICY "notifications_update_own" ON notifications 
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow system/admin to create notifications
CREATE POLICY "notifications_insert_system" ON notifications 
  FOR INSERT WITH CHECK (is_admin());

-- Allow admins to manage all notifications
CREATE POLICY "notifications_all_admin" ON notifications 
  FOR ALL USING (is_admin());

-- FEEDBACK TABLE POLICIES

-- Allow students to view and create their own feedback
CREATE POLICY "feedback_student" ON feedback 
  FOR ALL USING (
    student_id = (SELECT id FROM students WHERE user_id = auth.uid())
  );

-- Allow teachers to view and update feedback for their classes
CREATE POLICY "feedback_teacher" ON feedback 
  FOR ALL USING (
    teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
  );

-- Allow admins to manage all feedback
CREATE POLICY "feedback_all_admin" ON feedback 
  FOR ALL USING (is_admin());

-- JUNCTION TABLES POLICIES

-- User roles - admin only
CREATE POLICY "user_roles_admin" ON user_roles 
  FOR ALL USING (is_admin());

-- Student courses - students can view their own, admins can manage all
CREATE POLICY "student_courses_select_student" ON student_courses 
  FOR SELECT USING (
    student_id = (SELECT id FROM students WHERE user_id = auth.uid())
  );

CREATE POLICY "student_courses_admin" ON student_courses 
  FOR ALL USING (is_admin());

-- Class schedules - all authenticated can view, admins can manage
CREATE POLICY "class_schedules_select_authenticated" ON class_schedules 
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "class_schedules_admin" ON class_schedules 
  FOR ALL USING (is_admin());

-- AUDIT AND SYSTEM TABLES POLICIES

-- Audit logs - admin only
CREATE POLICY "audit_logs_admin" ON audit_logs 
  FOR ALL USING (is_admin());

-- User sessions - users can view their own, admins can view all
CREATE POLICY "user_sessions_select_own" ON user_sessions 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_sessions_admin" ON user_sessions 
  FOR ALL USING (is_admin());

-- System events - admin only
CREATE POLICY "system_events_admin" ON system_events 
  FOR ALL USING (is_admin());