-- LMS Core Schema Migration
-- This migration creates all core tables in the correct dependency order
-- Resolves the dependency issue in 20250617221047_initial_schema_combined.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CORE ENTITY TABLES (no dependencies)

-- Users table (references Supabase auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teachers table
CREATE TABLE teachers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    bio TEXT,
    availability JSONB, -- Weekly availability schedule
    hourly_rate DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Students table  
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    student_id VARCHAR(50) UNIQUE, -- Auto-generated student ID
    internal_code VARCHAR(50), -- Coach code + student number (e.g., F7)
    gender VARCHAR(20),
    photo_url VARCHAR(500),
    test_level VARCHAR(50) CHECK (test_level IN ('Basic', 'Everyday A', 'Everyday B', 'Speak Up', 'Business English', '1-on-1')),
    english_proficiency_level INTEGER CHECK (english_proficiency_level >= 1 AND english_proficiency_level <= 10),
    enrollment_date DATE,
    total_course_hours INTEGER DEFAULT 0,
    remaining_hours DECIMAL(4,2) DEFAULT 0,
    materials_purchased BOOLEAN DEFAULT FALSE,
    lead_source VARCHAR(255), -- Referrer information
    sales_representative VARCHAR(255), -- Assistant Teacher who made the sale
    payment_date DATE,
    payment_amount DECIMAL(10,2),
    discount_amount DECIMAL(10,2),
    course_start_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Courses table
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    course_type VARCHAR(50) NOT NULL CHECK (course_type IN ('Basic', 'Everyday A', 'Everyday B', 'Speak Up', 'Business English', '1-on-1')),
    is_online BOOLEAN DEFAULT FALSE,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    max_students INTEGER DEFAULT 9 CHECK (max_students > 0 AND max_students <= 9),
    credit_hours DECIMAL(4,2) NOT NULL CHECK (credit_hours > 0),
    materials_required BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Classes table (depends on courses and teachers)
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
    class_name VARCHAR(255),
    capacity INTEGER NOT NULL CHECK (capacity > 0 AND capacity <= 9),
    current_enrollment INTEGER DEFAULT 0,
    unit_number INTEGER,
    lesson_number INTEGER,
    start_date DATE,
    end_date DATE,
    location VARCHAR(255),
    meeting_link VARCHAR(500), -- For online classes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Schedules table (time slots)
CREATE TABLE schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL CHECK (start_time < end_time),
    location VARCHAR(255),
    is_recurring BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. DEPENDENT TABLES (require core tables)

-- Bookings table (depends on students and classes)
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    booking_date DATE NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER NOT NULL,
    learning_goals TEXT, -- For 1v1 classes
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attendance table (depends on bookings)
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    attendance_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
    hours_deducted DECIMAL(4,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leave requests table (depends on students)
CREATE TABLE leave_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL CHECK (start_date <= end_date),
    reason TEXT,
    hours_affected DECIMAL(4,2),
    advance_notice_hours INTEGER, -- How many hours in advance the request was made
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Materials table (depends on courses)
CREATE TABLE materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    material_type VARCHAR(50) CHECK (material_type IN ('PDF', 'Book', 'Audio', 'Video', 'Other')),
    file_url VARCHAR(500),
    unit_number INTEGER,
    lesson_number INTEGER,
    is_required BOOLEAN DEFAULT TRUE,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Student materials issuance tracking
CREATE TABLE student_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    issued_date DATE NOT NULL,
    return_date DATE,
    status VARCHAR(20) DEFAULT 'issued' CHECK (status IN ('issued', 'returned', 'lost', 'damaged')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, material_id)
);

-- Notifications table (depends on users)
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) CHECK (notification_type IN ('class_reminder', 'booking_confirmation', 'leave_approved', 'leave_rejected', 'low_hours', 'system')),
    is_read BOOLEAN DEFAULT FALSE,
    sent_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feedback table (depends on students and classes)
CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    student_comments TEXT,
    teacher_notes TEXT, -- Teacher's notes on student performance
    lesson_completed BOOLEAN DEFAULT FALSE,
    lesson_unit INTEGER,
    lesson_number INTEGER,
    submitted_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. JUNCTION TABLES (require multiple parent tables)

-- User roles junction table
CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, role)
);

-- Student courses junction table
CREATE TABLE student_courses (
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    enrollment_date DATE DEFAULT CURRENT_DATE,
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    current_unit INTEGER DEFAULT 1,
    current_lesson INTEGER DEFAULT 1,
    PRIMARY KEY (student_id, course_id)
);

-- Class schedules junction table
CREATE TABLE class_schedules (
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    effective_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    PRIMARY KEY (class_id, schedule_id)
);

-- 4. AUDIT AND SYSTEM TABLES

-- Audit logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    table_name VARCHAR(100),
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- User sessions table
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    login_time TIMESTAMPTZ DEFAULT NOW(),
    logout_time TIMESTAMPTZ,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- System events table
CREATE TABLE system_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(255) NOT NULL,
    event_category VARCHAR(100), -- 'scheduling', 'user_management', 'system', etc.
    description TEXT,
    metadata JSONB,
    severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 5. PERFORMANCE INDEXES

-- User indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Teacher indexes  
CREATE INDEX idx_teachers_user_id ON teachers(user_id);
CREATE INDEX idx_teachers_email ON teachers(email);

-- Student indexes
CREATE INDEX idx_students_user_id ON students(user_id);
CREATE INDEX idx_students_email ON students(email);
CREATE INDEX idx_students_student_id ON students(student_id);
CREATE INDEX idx_students_internal_code ON students(internal_code);
CREATE INDEX idx_students_test_level ON students(test_level);

-- Course indexes
CREATE INDEX idx_courses_type ON courses(course_type);
CREATE INDEX idx_courses_online ON courses(is_online);

-- Class indexes
CREATE INDEX idx_classes_course_id ON classes(course_id);
CREATE INDEX idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX idx_classes_dates ON classes(start_date, end_date);

-- Schedule indexes
CREATE INDEX idx_schedules_day_time ON schedules(day_of_week, start_time);

-- Booking indexes
CREATE INDEX idx_bookings_student_id ON bookings(student_id);
CREATE INDEX idx_bookings_class_id ON bookings(class_id);
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_bookings_start_time ON bookings(start_time);
CREATE INDEX idx_bookings_status ON bookings(status);

-- Attendance indexes
CREATE INDEX idx_attendance_booking_id ON attendance(booking_id);
CREATE INDEX idx_attendance_time ON attendance(attendance_time);
CREATE INDEX idx_attendance_status ON attendance(status);

-- Leave request indexes
CREATE INDEX idx_leave_requests_student_id ON leave_requests(student_id);
CREATE INDEX idx_leave_requests_dates ON leave_requests(start_date, end_date);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);

-- Material indexes
CREATE INDEX idx_materials_course_id ON materials(course_id);
CREATE INDEX idx_materials_type ON materials(material_type);
CREATE INDEX idx_student_materials_student_id ON student_materials(student_id);

-- Notification indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(notification_type);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_notifications_sent_time ON notifications(sent_time);

-- Feedback indexes
CREATE INDEX idx_feedback_student_id ON feedback(student_id);
CREATE INDEX idx_feedback_class_id ON feedback(class_id);
CREATE INDEX idx_feedback_teacher_id ON feedback(teacher_id);
CREATE INDEX idx_feedback_submitted_time ON feedback(submitted_time);

-- Audit indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);

-- System events indexes
CREATE INDEX idx_system_events_type ON system_events(event_type);
CREATE INDEX idx_system_events_category ON system_events(event_category);
CREATE INDEX idx_system_events_timestamp ON system_events(timestamp);
CREATE INDEX idx_system_events_severity ON system_events(severity);

-- Junction table indexes
CREATE INDEX idx_student_courses_student_id ON student_courses(student_id);
CREATE INDEX idx_student_courses_course_id ON student_courses(course_id);
CREATE INDEX idx_class_schedules_class_id ON class_schedules(class_id);
CREATE INDEX idx_class_schedules_schedule_id ON class_schedules(schedule_id);

-- 6. UPDATE TRIGGERS

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers to all tables with updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON teachers FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON schedules FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON attendance FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON leave_requests FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON materials FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_student_materials_updated_at BEFORE UPDATE ON student_materials FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_feedback_updated_at BEFORE UPDATE ON feedback FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();-- LMS Row Level Security (RLS) Policies
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
  FOR ALL USING (is_admin());-- LMS Views and Functions
-- This migration creates useful database views and functions for the LMS

-- 1. USEFUL VIEWS

-- View to get student course enrollments with course details
CREATE OR REPLACE VIEW student_course_details AS
SELECT
    sc.student_id,
    sc.course_id,
    s.full_name AS student_name,
    s.email AS student_email,
    s.student_id AS student_code,
    c.title AS course_name,
    c.description AS course_description,
    c.course_type,
    c.duration_minutes,
    sc.enrollment_date,
    sc.progress_percentage,
    sc.current_unit,
    sc.current_lesson
FROM student_courses sc
JOIN students s ON sc.student_id = s.id
JOIN courses c ON sc.course_id = c.id;

-- View to get class schedules with class and course details
CREATE OR REPLACE VIEW class_schedule_details AS
SELECT
    cs.class_id,
    cs.schedule_id,
    cl.course_id,
    co.title AS course_name,
    co.course_type,
    cl.teacher_id,
    t.full_name AS teacher_name,
    t.email AS teacher_email,
    cl.class_name,
    cl.capacity,
    cl.current_enrollment,
    cl.unit_number,
    cl.lesson_number,
    cl.location,
    cl.meeting_link,
    s.day_of_week,
    s.start_time,
    s.end_time,
    cs.effective_date,
    cs.end_date
FROM class_schedules cs
JOIN classes cl ON cs.class_id = cl.id
JOIN courses co ON cl.course_id = co.id
JOIN teachers t ON cl.teacher_id = t.id
JOIN schedules s ON cs.schedule_id = s.id;

-- View to get booking details with student, class, and schedule information
CREATE OR REPLACE VIEW booking_details AS
SELECT
    b.id AS booking_id,
    b.student_id,
    st.full_name AS student_name,
    st.email AS student_email,
    st.student_id AS student_code,
    b.class_id,
    cl.course_id,
    co.title AS course_name,
    co.course_type,
    cl.teacher_id,
    te.full_name AS teacher_name,
    te.email AS teacher_email,
    b.booking_date,
    b.start_time,
    b.end_time,
    b.duration_minutes,
    b.learning_goals,
    b.status AS booking_status,
    cl.location,
    cl.meeting_link,
    cl.unit_number,
    cl.lesson_number
FROM bookings b
JOIN students st ON b.student_id = st.id
JOIN classes cl ON b.class_id = cl.id
JOIN courses co ON cl.course_id = co.id
JOIN teachers te ON cl.teacher_id = te.id;

-- View for teacher dashboard with class and student counts
CREATE OR REPLACE VIEW teacher_dashboard AS
SELECT
    t.id AS teacher_id,
    t.user_id,
    t.full_name,
    t.email,
    COUNT(DISTINCT cl.id) AS total_classes,
    COUNT(DISTINCT b.student_id) AS total_students,
    COUNT(DISTINCT CASE WHEN b.booking_date >= CURRENT_DATE THEN b.id END) AS upcoming_bookings,
    COUNT(DISTINCT CASE WHEN a.status = 'present' THEN a.id END) AS total_attended_classes,
    COALESCE(AVG(f.rating), 0) AS average_rating,
    SUM(CASE WHEN a.status = 'present' THEN b.duration_minutes ELSE 0 END) AS total_teaching_minutes
FROM teachers t
LEFT JOIN classes cl ON t.id = cl.teacher_id
LEFT JOIN bookings b ON cl.id = b.class_id
LEFT JOIN attendance a ON b.id = a.booking_id
LEFT JOIN feedback f ON cl.id = f.class_id AND t.id = f.teacher_id
GROUP BY t.id, t.user_id, t.full_name, t.email;

-- View for student dashboard with course progress and hour tracking
CREATE OR REPLACE VIEW student_dashboard AS
SELECT
    s.id AS student_id,
    s.user_id,
    s.full_name,
    s.email,
    s.student_id AS student_code,
    s.total_course_hours,
    s.remaining_hours,
    COUNT(DISTINCT sc.course_id) AS enrolled_courses,
    COUNT(DISTINCT b.id) AS total_bookings,
    COUNT(DISTINCT CASE WHEN b.booking_date >= CURRENT_DATE THEN b.id END) AS upcoming_bookings,
    COUNT(DISTINCT CASE WHEN a.status = 'present' THEN a.id END) AS attended_classes,
    COUNT(DISTINCT CASE WHEN a.status = 'absent' THEN a.id END) AS missed_classes,
    COALESCE(AVG(sc.progress_percentage), 0) AS average_progress,
    SUM(CASE WHEN a.status = 'present' THEN a.hours_deducted ELSE 0 END) AS total_hours_used
FROM students s
LEFT JOIN student_courses sc ON s.id = sc.student_id
LEFT JOIN bookings b ON s.id = b.student_id
LEFT JOIN attendance a ON b.id = a.booking_id
GROUP BY s.id, s.user_id, s.full_name, s.email, s.student_id, s.total_course_hours, s.remaining_hours;

-- View for admin analytics
CREATE OR REPLACE VIEW admin_analytics AS
SELECT
    'total_students' AS metric,
    COUNT(*)::TEXT AS value,
    'Students enrolled in the system' AS description
FROM students
UNION ALL
SELECT
    'total_teachers' AS metric,
    COUNT(*)::TEXT AS value,
    'Teachers in the system' AS description
FROM teachers
UNION ALL
SELECT
    'total_courses' AS metric,
    COUNT(*)::TEXT AS value,
    'Courses available' AS description
FROM courses
UNION ALL
SELECT
    'total_classes' AS metric,
    COUNT(*)::TEXT AS value,
    'Classes created' AS description
FROM classes
UNION ALL
SELECT
    'total_bookings' AS metric,
    COUNT(*)::TEXT AS value,
    'Total bookings made' AS description
FROM bookings
UNION ALL
SELECT
    'upcoming_bookings' AS metric,
    COUNT(*)::TEXT AS value,
    'Bookings scheduled for future' AS description
FROM bookings
WHERE booking_date >= CURRENT_DATE
UNION ALL
SELECT
    'attendance_rate' AS metric,
    ROUND(
        (COUNT(CASE WHEN status = 'present' THEN 1 END) * 100.0 / 
         NULLIF(COUNT(*), 0)), 2
    )::TEXT || '%' AS value,
    'Overall attendance percentage' AS description
FROM attendance;

-- 2. USEFUL FUNCTIONS

-- Function to generate unique student ID
CREATE OR REPLACE FUNCTION generate_student_id()
RETURNS TEXT AS $$
DECLARE
    new_id TEXT;
    counter INT := 1;
BEGIN
    LOOP
        new_id := 'STD' || LPAD(counter::TEXT, 6, '0');
        
        -- Check if this ID already exists
        IF NOT EXISTS (SELECT 1 FROM students WHERE student_id = new_id) THEN
            RETURN new_id;
        END IF;
        
        counter := counter + 1;
        
        -- Safety check to prevent infinite loop
        IF counter > 999999 THEN
            RAISE EXCEPTION 'Unable to generate unique student ID';
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate remaining hours for a student
CREATE OR REPLACE FUNCTION calculate_remaining_hours(student_uuid UUID)
RETURNS DECIMAL(4,2) AS $$
DECLARE
    total_hours DECIMAL(4,2);
    used_hours DECIMAL(4,2);
BEGIN
    -- Get total course hours for the student
    SELECT COALESCE(total_course_hours, 0) INTO total_hours
    FROM students WHERE id = student_uuid;
    
    -- Calculate total hours used (from attendance records)
    SELECT COALESCE(SUM(hours_deducted), 0) INTO used_hours
    FROM attendance a
    JOIN bookings b ON a.booking_id = b.id
    WHERE b.student_id = student_uuid;
    
    RETURN GREATEST(total_hours - used_hours, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to update student remaining hours
CREATE OR REPLACE FUNCTION update_student_remaining_hours()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE students 
        SET remaining_hours = calculate_remaining_hours(
            (SELECT student_id FROM bookings WHERE id = NEW.booking_id)
        )
        WHERE id = (SELECT student_id FROM bookings WHERE id = NEW.booking_id);
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        UPDATE students 
        SET remaining_hours = calculate_remaining_hours(
            (SELECT student_id FROM bookings WHERE id = OLD.booking_id)
        )
        WHERE id = (SELECT student_id FROM bookings WHERE id = OLD.booking_id);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update remaining hours when attendance is recorded
CREATE TRIGGER update_remaining_hours_on_attendance
    AFTER INSERT OR UPDATE OR DELETE ON attendance
    FOR EACH ROW EXECUTE FUNCTION update_student_remaining_hours();

-- Function to auto-generate internal code (Coach Code + Student Number)
CREATE OR REPLACE FUNCTION generate_internal_code(coach_code TEXT DEFAULT 'A')
RETURNS TEXT AS $$
DECLARE
    student_count INT;
    new_code TEXT;
BEGIN
    -- Count existing students with this coach code
    SELECT COUNT(*) INTO student_count
    FROM students 
    WHERE internal_code LIKE coach_code || '%';
    
    -- Generate new code
    new_code := coach_code || (student_count + 1)::TEXT;
    
    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM students WHERE internal_code = new_code) LOOP
        student_count := student_count + 1;
        new_code := coach_code || student_count::TEXT;
    END LOOP;
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Function to check if student can book a class (has enough hours)
CREATE OR REPLACE FUNCTION can_student_book_class(
    student_uuid UUID, 
    class_uuid UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    remaining_hours DECIMAL(4,2);
    class_duration INT;
    required_hours DECIMAL(4,2);
BEGIN
    -- Get student's remaining hours
    SELECT calculate_remaining_hours(student_uuid) INTO remaining_hours;
    
    -- Get class duration in hours
    SELECT duration_minutes / 60.0 INTO required_hours
    FROM courses c
    JOIN classes cl ON c.id = cl.course_id
    WHERE cl.id = class_uuid;
    
    RETURN remaining_hours >= required_hours;
END;
$$ LANGUAGE plpgsql;

-- Function to get available time slots for a teacher
CREATE OR REPLACE FUNCTION get_teacher_available_slots(
    teacher_uuid UUID,
    target_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    day_of_week INT,
    start_time TIME,
    end_time TIME,
    is_booked BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.day_of_week,
        s.start_time,
        s.end_time,
        EXISTS(
            SELECT 1 FROM bookings b
            JOIN classes c ON b.class_id = c.id
            WHERE c.teacher_id = teacher_uuid
            AND b.booking_date = target_date
            AND b.start_time::TIME BETWEEN s.start_time AND s.end_time
            AND b.status != 'cancelled'
        ) AS is_booked
    FROM schedules s
    JOIN class_schedules cs ON s.id = cs.schedule_id
    JOIN classes c ON cs.class_id = c.id
    WHERE c.teacher_id = teacher_uuid
    AND (cs.end_date IS NULL OR cs.end_date >= target_date)
    AND cs.effective_date <= target_date
    ORDER BY s.day_of_week, s.start_time;
END;
$$ LANGUAGE plpgsql;

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION create_audit_log(
    p_action TEXT,
    p_table_name TEXT,
    p_record_id UUID,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    audit_id UUID;
BEGIN
    INSERT INTO audit_logs (
        user_id, action, table_name, record_id, 
        old_values, new_values
    ) VALUES (
        auth.uid(), p_action, p_table_name, p_record_id,
        p_old_values, p_new_values
    ) RETURNING id INTO audit_id;
    
    RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log system events
CREATE OR REPLACE FUNCTION log_system_event(
    p_event_type TEXT,
    p_category TEXT DEFAULT 'system',
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL,
    p_severity TEXT DEFAULT 'info'
)
RETURNS UUID AS $$
DECLARE
    event_id UUID;
BEGIN
    INSERT INTO system_events (
        event_type, event_category, description, metadata, severity
    ) VALUES (
        p_event_type, p_category, p_description, p_metadata, p_severity
    ) RETURNING id INTO event_id;
    
    RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. AUTOMATIC STUDENT ID AND INTERNAL CODE GENERATION

-- Trigger function to auto-generate student ID and internal code
CREATE OR REPLACE FUNCTION auto_generate_student_codes()
RETURNS TRIGGER AS $$
BEGIN
    -- Generate student ID if not provided
    IF NEW.student_id IS NULL OR NEW.student_id = '' THEN
        NEW.student_id := generate_student_id();
    END IF;
    
    -- Generate internal code if not provided
    IF NEW.internal_code IS NULL OR NEW.internal_code = '' THEN
        NEW.internal_code := generate_internal_code('F'); -- Default coach code 'F'
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to students table
CREATE TRIGGER auto_generate_codes_trigger
    BEFORE INSERT ON students
    FOR EACH ROW EXECUTE FUNCTION auto_generate_student_codes();-- MySakinah Studio Database Schema
-- This migration creates tables for the AI marketing asset generation system

-- 1. STUDIO CORE TABLES

-- Templates table for Canva template management
CREATE TABLE studio_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canva_template_id VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- e.g., 'social_media', 'blog_header', 'advertisement'
    thumbnail_url VARCHAR(500),
    frame_coordinates JSONB, -- Store frame position data for image injection
    canvas_width INTEGER,
    canvas_height INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generation jobs table for tracking asset creation workflow
CREATE TABLE studio_generation_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id VARCHAR(100) UNIQUE NOT NULL, -- External job identifier
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    prompt_text TEXT NOT NULL,
    template_id UUID NOT NULL REFERENCES studio_templates(id) ON DELETE CASCADE,
    
    -- Job status and workflow
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'generating_image', 'composing_asset', 'uploading', 'completed', 'failed')
    ),
    
    -- AI Image generation details
    openai_image_url VARCHAR(500),
    openai_image_prompt TEXT,
    image_style VARCHAR(100), -- e.g., 'photorealistic', 'digital_art', 'cartoon'
    image_resolution VARCHAR(20) DEFAULT '1024x1024',
    
    -- Canva composition details
    canva_design_id VARCHAR(255),
    canva_export_url VARCHAR(500),
    
    -- Final asset details
    preview_url VARCHAR(500),
    drive_file_id VARCHAR(255),
    drive_share_url VARCHAR(500),
    final_asset_url VARCHAR(500),
    
    -- Metadata and timing
    generation_start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    generation_end_time TIMESTAMP WITH TIME ZONE,
    total_generation_seconds INTEGER,
    
    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Drive assets table for tracking uploaded files
CREATE TABLE studio_drive_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    generation_job_id UUID NOT NULL REFERENCES studio_generation_jobs(id) ON DELETE CASCADE,
    drive_file_id VARCHAR(255) NOT NULL UNIQUE,
    drive_share_url VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    is_public BOOLEAN DEFAULT TRUE,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API usage tracking for monitoring and billing
CREATE TABLE studio_api_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    generation_job_id UUID REFERENCES studio_generation_jobs(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- API service tracking
    service_name VARCHAR(50) NOT NULL, -- 'openai', 'canva', 'google_drive'
    api_endpoint VARCHAR(255),
    request_method VARCHAR(10),
    
    -- Usage metrics
    request_count INTEGER DEFAULT 1,
    tokens_used INTEGER, -- For OpenAI API
    credits_consumed DECIMAL(10,2), -- For Canva API
    bytes_transferred BIGINT, -- For Google Drive API
    
    -- Cost tracking
    estimated_cost_usd DECIMAL(10,4),
    
    -- Response details
    response_status INTEGER,
    response_time_ms INTEGER,
    
    -- Metadata
    request_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Studio analytics for performance monitoring
CREATE TABLE studio_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    metric_unit VARCHAR(50), -- 'seconds', 'percentage', 'count', 'bytes'
    
    -- Dimensions for filtering
    time_period VARCHAR(20), -- 'hourly', 'daily', 'weekly', 'monthly'
    template_id UUID REFERENCES studio_templates(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Metadata
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Studio user preferences
CREATE TABLE studio_user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Default generation settings
    default_image_style VARCHAR(100) DEFAULT 'photorealistic',
    default_image_resolution VARCHAR(20) DEFAULT '1024x1024',
    preferred_template_categories TEXT[], -- Array of category preferences
    
    -- Notification preferences
    email_on_completion BOOLEAN DEFAULT TRUE,
    email_on_failure BOOLEAN DEFAULT TRUE,
    
    -- UI preferences
    auto_preview BOOLEAN DEFAULT TRUE,
    auto_upload_to_drive BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- 2. INDEXES FOR PERFORMANCE

-- Generation jobs indexes
CREATE INDEX idx_studio_generation_jobs_user_id ON studio_generation_jobs(user_id);
CREATE INDEX idx_studio_generation_jobs_status ON studio_generation_jobs(status);
CREATE INDEX idx_studio_generation_jobs_template_id ON studio_generation_jobs(template_id);
CREATE INDEX idx_studio_generation_jobs_created_at ON studio_generation_jobs(created_at);
CREATE INDEX idx_studio_generation_jobs_job_id ON studio_generation_jobs(job_id);

-- Templates indexes
CREATE INDEX idx_studio_templates_category ON studio_templates(category);
CREATE INDEX idx_studio_templates_is_active ON studio_templates(is_active);
CREATE INDEX idx_studio_templates_usage_count ON studio_templates(usage_count DESC);
CREATE INDEX idx_studio_templates_canva_id ON studio_templates(canva_template_id);

-- Drive assets indexes
CREATE INDEX idx_studio_drive_assets_generation_job ON studio_drive_assets(generation_job_id);
CREATE INDEX idx_studio_drive_assets_drive_file_id ON studio_drive_assets(drive_file_id);
CREATE INDEX idx_studio_drive_assets_created_at ON studio_drive_assets(created_at);

-- API usage indexes
CREATE INDEX idx_studio_api_usage_service ON studio_api_usage(service_name);
CREATE INDEX idx_studio_api_usage_user_id ON studio_api_usage(user_id);
CREATE INDEX idx_studio_api_usage_timestamp ON studio_api_usage(request_timestamp);
CREATE INDEX idx_studio_api_usage_generation_job ON studio_api_usage(generation_job_id);

-- Analytics indexes
CREATE INDEX idx_studio_analytics_metric_name ON studio_analytics(metric_name);
CREATE INDEX idx_studio_analytics_time_period ON studio_analytics(time_period);
CREATE INDEX idx_studio_analytics_recorded_at ON studio_analytics(recorded_at);
CREATE INDEX idx_studio_analytics_template_id ON studio_analytics(template_id);

-- 3. TRIGGERS FOR AUTOMATIC UPDATES

-- Update generation job timing
CREATE OR REPLACE FUNCTION update_generation_timing()
RETURNS TRIGGER AS $$
BEGIN
    -- When status changes to 'completed' or 'failed', set end time and calculate duration
    IF NEW.status IN ('completed', 'failed') AND OLD.status != NEW.status THEN
        NEW.generation_end_time = NOW();
        NEW.total_generation_seconds = EXTRACT(EPOCH FROM (NOW() - NEW.generation_start_time))::INTEGER;
    END IF;
    
    -- Update template usage count when job completes successfully
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE studio_templates 
        SET usage_count = usage_count + 1 
        WHERE id = NEW.template_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_generation_timing_trigger
    BEFORE UPDATE ON studio_generation_jobs
    FOR EACH ROW EXECUTE FUNCTION update_generation_timing();

-- Update download count when drive asset is accessed
CREATE OR REPLACE FUNCTION increment_download_count()
RETURNS TRIGGER AS $$
BEGIN
    -- This would be called when download count needs to be updated
    -- Can be triggered by application logic
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to studio tables
CREATE TRIGGER update_studio_templates_updated_at 
    BEFORE UPDATE ON studio_templates 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_studio_generation_jobs_updated_at 
    BEFORE UPDATE ON studio_generation_jobs 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_studio_drive_assets_updated_at 
    BEFORE UPDATE ON studio_drive_assets 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_studio_user_preferences_updated_at 
    BEFORE UPDATE ON studio_user_preferences 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 4. USEFUL FUNCTIONS

-- Function to generate unique job ID
CREATE OR REPLACE FUNCTION generate_studio_job_id()
RETURNS TEXT AS $$
DECLARE
    new_id TEXT;
    counter INT := 1;
BEGIN
    LOOP
        new_id := 'STUDIO_' || TO_CHAR(NOW(), 'YYYYMMDD') || '_' || LPAD(counter::TEXT, 6, '0');
        
        -- Check if this ID already exists
        IF NOT EXISTS (SELECT 1 FROM studio_generation_jobs WHERE job_id = new_id) THEN
            RETURN new_id;
        END IF;
        
        counter := counter + 1;
        
        -- Safety check to prevent infinite loop
        IF counter > 999999 THEN
            RAISE EXCEPTION 'Unable to generate unique studio job ID';
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to log API usage
CREATE OR REPLACE FUNCTION log_studio_api_usage(
    p_generation_job_id UUID,
    p_service_name TEXT,
    p_api_endpoint TEXT,
    p_request_method TEXT DEFAULT 'POST',
    p_tokens_used INTEGER DEFAULT NULL,
    p_credits_consumed DECIMAL DEFAULT NULL,
    p_bytes_transferred BIGINT DEFAULT NULL,
    p_estimated_cost_usd DECIMAL DEFAULT NULL,
    p_response_status INTEGER DEFAULT 200,
    p_response_time_ms INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    usage_id UUID;
    job_user_id UUID;
BEGIN
    -- Get user ID from generation job
    SELECT user_id INTO job_user_id 
    FROM studio_generation_jobs 
    WHERE id = p_generation_job_id;
    
    INSERT INTO studio_api_usage (
        generation_job_id, user_id, service_name, api_endpoint, request_method,
        tokens_used, credits_consumed, bytes_transferred, estimated_cost_usd,
        response_status, response_time_ms
    ) VALUES (
        p_generation_job_id, job_user_id, p_service_name, p_api_endpoint, p_request_method,
        p_tokens_used, p_credits_consumed, p_bytes_transferred, p_estimated_cost_usd,
        p_response_status, p_response_time_ms
    ) RETURNING id INTO usage_id;
    
    RETURN usage_id;
END;
$$ LANGUAGE plpgsql;

-- Function to record analytics metric
CREATE OR REPLACE FUNCTION record_studio_metric(
    p_metric_name TEXT,
    p_metric_value DECIMAL,
    p_metric_unit TEXT DEFAULT 'count',
    p_time_period TEXT DEFAULT 'daily',
    p_template_id UUID DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    metric_id UUID;
BEGIN
    INSERT INTO studio_analytics (
        metric_name, metric_value, metric_unit, time_period,
        template_id, user_id
    ) VALUES (
        p_metric_name, p_metric_value, p_metric_unit, p_time_period,
        p_template_id, p_user_id
    ) RETURNING id INTO metric_id;
    
    RETURN metric_id;
END;
$$ LANGUAGE plpgsql;

-- 5. SAMPLE DATA INSERTION

-- Insert some sample templates for testing
INSERT INTO studio_templates (canva_template_id, name, description, category, canvas_width, canvas_height) VALUES
    ('CANVA_SOCIAL_001', 'Instagram Post - Modern Minimal', 'Clean and modern Instagram post template', 'social_media', 1080, 1080),
    ('CANVA_BLOG_001', 'Blog Header - Professional', 'Professional blog header template', 'blog_header', 1200, 400),
    ('CANVA_AD_001', 'Facebook Ad - Sale Promotion', 'Eye-catching Facebook advertisement template', 'advertisement', 1200, 628),
    ('CANVA_STORY_001', 'Instagram Story - Product Showcase', 'Product showcase template for Instagram stories', 'social_media', 1080, 1920),
    ('CANVA_BANNER_001', 'Website Banner - Tech Startup', 'Modern website banner for tech companies', 'web_banner', 1920, 600);

-- Create a log entry for system initialization
SELECT log_system_event(
    'studio_schema_initialized',
    'studio',
    'MySakinah Studio database schema has been initialized with core tables and functions',
    '{"tables_created": 6, "functions_created": 4, "sample_templates": 5}'::jsonb,
    'info'
);