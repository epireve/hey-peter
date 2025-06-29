-- LMS Views and Functions
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
    FOR EACH ROW EXECUTE FUNCTION auto_generate_student_codes();