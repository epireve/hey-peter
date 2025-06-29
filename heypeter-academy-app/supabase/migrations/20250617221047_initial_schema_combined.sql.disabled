
-- Junction table for user roles
CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    PRIMARY KEY (user_id, role)
);


-- Junction table for student courses
CREATE TABLE student_courses (
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    PRIMARY KEY (student_id, course_id)
);

-- Junction table for class schedules
CREATE TABLE class_schedules (
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    PRIMARY KEY (class_id, schedule_id)
);

-- Create audit_logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    details JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_sessions table
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    login_time TIMESTAMPTZ DEFAULT NOW(),
    logout_time TIMESTAMPTZ,
    ip_address VARCHAR(45),
    user_agent TEXT
);

-- Create system_events table
CREATE TABLE system_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(255) NOT NULL,
    details JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

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
CREATE POLICY "Allow teachers to view their own leave requests" ON leave_requests FOR SELECT USING (auth.uid() = teacher_id);
CREATE POLICY "Allow teachers to insert their own leave requests" ON leave_requests FOR INSERT WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "Allow teachers to update their own leave requests" ON leave_requests FOR UPDATE USING (auth.uid() = teacher_id);
CREATE POLICY "Allow teachers to delete their own leave requests" ON leave_requests FOR DELETE USING (auth.uid() = teacher_id);

-- Policies for materials (teachers can view and manage materials for their classes)
CREATE POLICY "Allow teachers to view materials for their classes" ON materials FOR SELECT USING (EXISTS (SELECT 1 FROM classes WHERE classes.course_id = materials.course_id AND classes.teacher_id = auth.uid()));
CREATE POLICY "Allow teachers to insert materials for their classes" ON materials FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM classes WHERE classes.course_id = materials.course_id AND classes.teacher_id = auth.uid()));
CREATE POLICY "Allow teachers to update materials for their classes" ON materials FOR UPDATE USING (EXISTS (SELECT 1 FROM classes WHERE classes.course_id = materials.course_id AND classes.teacher_id = auth.uid()));
CREATE POLICY "Allow teachers to delete materials for their classes" ON materials FOR DELETE USING (EXISTS (SELECT 1 FROM classes WHERE classes.course_id = materials.course_id AND classes.teacher_id = auth.uid()));

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

-- Create database views for complex queries

-- View to get student course enrollments with course details
CREATE OR REPLACE VIEW student_course_details AS
SELECT
    sc.student_id,
    sc.course_id,
    c.title AS course_name,
    c.description AS course_description
FROM student_courses sc
JOIN courses c ON sc.course_id = c.id;

-- View to get class schedules with class and course details
CREATE OR REPLACE VIEW class_schedule_details AS
SELECT
    cs.class_id,
    cs.schedule_id,
    cl.course_id,
    co.title AS course_name,
    cl.teacher_id,
    t.user_id AS teacher_user_id,
    u.full_name AS teacher_name,
    s.day,
    s.start_time,
    s.end_time,
    s.location
FROM class_schedules cs
JOIN classes cl ON cs.class_id = cl.id
JOIN courses co ON cl.course_id = co.id
JOIN teachers t ON cl.teacher_id = t.id
JOIN users u ON t.user_id = u.id
JOIN schedules s ON cs.schedule_id = s.id;

-- View to get booking details with student, class, and schedule information
CREATE OR REPLACE VIEW booking_details AS
SELECT
    b.id AS booking_id,
    b.student_id,
    st.user_id AS student_user_id,
    us.full_name AS student_name,
    b.class_id,
    cl.course_id,
    co.title AS course_name,
    cl.teacher_id,
    te.user_id AS teacher_user_id,
    ut.full_name AS teacher_name,
    b.start_time as booking_time,
    b.status AS booking_status,
    cs.schedule_id,
    sch.day,
    sch.start_time,
    sch.end_time,
    sch.location
FROM bookings b
JOIN students st ON b.student_id = st.id
JOIN users us ON st.user_id = us.id
JOIN classes cl ON b.class_id = cl.id
JOIN courses co ON cl.course_id = co.id
JOIN teachers te ON cl.teacher_id = te.id
JOIN users ut ON te.user_id = ut.id
JOIN class_schedules cs ON b.class_id = cs.class_id -- Assuming a booking is for a specific class and its schedule
JOIN schedules sch ON cs.schedule_id = sch.id;

-- Implement partitioning strategy

-- Example partitioning for the audit_logs table by range on timestamp
-- This assumes a large volume of audit logs and benefits from partitioning by time.
-- You might need to adjust the partitioning strategy based on expected data volume and query patterns.

-- Create the master table
CREATE TABLE audit_logs_partitioned (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    event_details JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create partitions (example for a few months)
-- You would need to create future partitions as needed.
-- CREATE TABLE audit_logs_y2025m01 PARTITION OF audit_logs_partitioned
--     FOR VALUES FROM ('2025-01-01 00:00:00+00') TO ('2025-02-01 00:00:00+00');
--
-- CREATE TABLE audit_logs_y2025m02 PARTITION OF audit_logs_partitioned
--     FOR VALUES FROM ('2025-02-01 00:00:00+00') TO ('2025-03-01 00:00:00+00');
--
-- CREATE TABLE audit_logs_y2025m03 PARTITION OF audit_logs_partitioned
--     FOR VALUES FROM ('2025-03-01 00:00:00+00') TO ('2025-04-01 00:00:00+00');

-- You would repeat the CREATE TABLE ... PARTITION OF for subsequent months/years.

-- Note: When inserting data into a partitioned table, you insert into the master table,
-- and PostgreSQL automatically routes the data to the correct partition.
-- Queries against the master table will automatically utilize the partitions.

-- Consider partitioning other large tables if necessary, e.g., attendance, bookings.
-- Example for attendance (by range on attendance_time):
-- CREATE TABLE attendance_partitioned (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
--     attendance_time TIMESTAMP WITH TIME ZONE NOT NULL,
--     status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- ) PARTITION BY RANGE (attendance_time);

-- CREATE TABLE attendance_y2025m01 PARTITION OF attendance_partitioned
--     FOR VALUES FROM ('2025-01-01 00:00:00+00') TO ('2025-02-01 00:00:00+00');
-- ... and so on for other partitions.

-- Create database migration scripts

-- This file serves as a placeholder and guide for creating migration scripts.
-- In a real project, you would use a database migration tool (like Supabase CLI, Flyway, Liquibase, etc.)
-- to manage and apply these scripts in a version-controlled manner.

-- Example of how a migration script might look, combining the previous steps:

-- -- Migration: 20250618_initial_schema
-- -- Description: Create core, junction, and audit tables, define primary and foreign keys, check constraints, unique constraints, and indexes.

-- -- Create core entity tables
-- CREATE TABLE users (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     name VARCHAR(255) NOT NULL,
--     email VARCHAR(255) NOT NULL UNIQUE,
--     password_hash VARCHAR(255) NOT NULL,
--     role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- CREATE TABLE teachers (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
--     bio TEXT,
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- CREATE TABLE students (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
--     enrollment_date DATE,
--     major VARCHAR(255),
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- CREATE TABLE courses (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     name VARCHAR(255) NOT NULL UNIQUE,
--     description TEXT,
--     credit_hours INTEGER NOT NULL CHECK (credit_hours > 0),
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- CREATE TABLE classes (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
--     teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
--     name VARCHAR(255),
--     capacity INTEGER NOT NULL CHECK (capacity > 0),
--     start_date DATE,
--     end_date DATE,
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- CREATE TABLE schedules (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     day VARCHAR(20) NOT NULL CHECK (day IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
--     start_time TIME NOT NULL,
--     end_time TIME NOT NULL CHECK (start_time < end_time),
--     location VARCHAR(255),
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- CREATE TABLE bookings (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     student_id UUID REFERENCES students(id) ON DELETE CASCADE,
--     class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
--     booking_time TIMESTAMP WITH TIME ZONE NOT NULL,
--     status VARCHAR(20) NOT NULL CHECK (status IN ('booked', 'cancelled', 'completed')),
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- CREATE TABLE attendance (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
--     attendance_time TIMESTAMP WITH TIME ZONE NOT NULL,
--     status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- CREATE TABLE leave_requests (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     student_id UUID REFERENCES students(id) ON DELETE CASCADE,
--     class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
--     start_date DATE NOT NULL,
--     end_date DATE NOT NULL CHECK (start_date <= end_date),
--     reason TEXT,
--     status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- CREATE TABLE materials (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
--     title VARCHAR(255) NOT NULL,
--     description TEXT,
--     file_url VARCHAR(255),
--     uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- CREATE TABLE notifications (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     user_id UUID REFERENCES users(id) ON DELETE CASCADE,
--     message TEXT NOT NULL,
--     sent_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--     status VARCHAR(20) NOT NULL CHECK (status IN ('sent', 'delivered', 'read')),
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- CREATE TABLE feedback (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     student_id UUID REFERENCES students(id) ON DELETE CASCADE,
--     class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
--     rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
--     comments TEXT,
--     submitted_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- CREATE TABLE user_roles (
--     user_id UUID REFERENCES users(id) ON DELETE CASCADE,
--     role VARCHAR(50) NOT NULL,
--     assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--     PRIMARY KEY (user_id, role)
-- );

-- CREATE TABLE student_courses (
--     student_id UUID REFERENCES students(id) ON DELETE CASCADE,
--     course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
--     enrollment_date DATE,
--     PRIMARY KEY (student_id, course_id)
-- );

-- CREATE TABLE class_schedules (
--     class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
--     schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
--     PRIMARY KEY (class_id, schedule_id)
-- );

-- CREATE TABLE audit_logs (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     user_id UUID REFERENCES users(id) ON DELETE SET NULL,
--     event_type VARCHAR(50) NOT NULL,
--     event_details JSONB,
--     timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- CREATE TABLE user_sessions (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     user_id UUID REFERENCES users(id) ON DELETE CASCADE,
--     login_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--     logout_time TIMESTAMP WITH TIME ZONE
-- );

-- CREATE TABLE system_events (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     event_type VARCHAR(50) NOT NULL,
--     event_details JSONB,
--     timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- -- Enable RLS
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE students ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE student_courses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE class_schedules ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE system_events ENABLE ROW LEVEL SECURITY;

-- -- Create RLS policies (as defined in 20250618_rls_policies.sql)
-- -- ... (policies would be included here)

-- -- Create indexes (as defined in 20250618_performance_indexes.sql)
-- -- ... (indexes would be included here)

-- -- Create functions and triggers (as defined in 20250618_functions_triggers.sql)
-- -- ... (functions and triggers would be included here)

-- -- Implement partitioning (as defined in 20250618_partitioning.sql)
-- -- ... (partitioning setup would be included here)

-- Validate schema performance and security

-- This file serves as a placeholder and guide for validation steps.
-- Actual validation would involve using database tools and performing tests.

-- Performance Validation:
-- 1. Use EXPLAIN and EXPLAIN ANALYZE to analyze query plans for common queries.
--    Example: EXPLAIN ANALYZE SELECT * FROM booking_details WHERE student_id = 'some_student_id';
-- 2. Monitor database performance metrics (CPU, memory, disk I/O, query latency).
-- 3. Use tools like pg_stat_statements to identify slow queries.
-- 4. Ensure appropriate indexes are being used (check query plans).
-- 5. Consider further partitioning or other optimization techniques if needed.

-- Security Validation:
-- 1. Test RLS policies thoroughly for different user roles (admin, teacher, student, anonymous).
--    Ensure users can only access and modify data they are authorized to.
--    Example: SELECT * FROM users WHERE auth.uid() = 'another_user_id'; (should return no rows for non-admin)
-- 2. Test database roles and permissions.
-- 3. Review function and trigger security (SECURITY DEFINER vs SECURITY INVOKER).
--    Ensure functions and triggers do not expose sensitive data or allow unauthorized modifications.
-- 4. Check for SQL injection vulnerabilities (though Supabase/PostgreSQL built-in features help mitigate this).
-- 5. Regularly audit logs (audit_logs table) for suspicious activity.

-- Example SQL for testing RLS (replace with actual user IDs and queries):
-- SET role authenticated;
-- SELECT * FROM users WHERE id = auth.uid();
-- SELECT * FROM teachers WHERE user_id = auth.uid();
-- SELECT * FROM students WHERE user_id = auth.uid();
-- SELECT * FROM bookings WHERE student_id = auth.uid();
-- SELECT * FROM leave_requests WHERE student_id = auth.uid();
-- SELECT * FROM materials WHERE class_id IN (SELECT class_id FROM classes WHERE teacher_id = auth.uid());
-- SELECT * FROM notifications WHERE user_id = auth.uid();
-- SELECT * FROM feedback WHERE student_id = auth.uid();

-- SET role teacher;
-- SELECT * FROM attendance WHERE booking_id IN (SELECT id FROM bookings WHERE class_id IN (SELECT id FROM classes WHERE teacher_id = auth.uid()));

-- SET role admin;
-- SELECT * FROM audit_logs;
-- SELECT * FROM user_roles;
-- SELECT * FROM system_events;

-- RESET role; -- Return to default role