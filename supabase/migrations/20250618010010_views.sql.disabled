-- Create database views for complex queries

-- View to get student course enrollments with course details
CREATE OR REPLACE VIEW student_course_details AS
SELECT
    sc.student_id,
    sc.course_id,
    c.name AS course_name,
    c.description AS course_description,
    c.credit_hours
FROM student_courses sc
JOIN courses c ON sc.course_id = c.id;

-- View to get class schedules with class and course details
CREATE OR REPLACE VIEW class_schedule_details AS
SELECT
    cs.class_id,
    cs.schedule_id,
    cl.course_id,
    co.name AS course_name,
    cl.teacher_id,
    t.user_id AS teacher_user_id,
    u.name AS teacher_name,
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
    us.name AS student_name,
    b.class_id,
    cl.course_id,
    co.name AS course_name,
    cl.teacher_id,
    te.user_id AS teacher_user_id,
    ut.name AS teacher_name,
    b.booking_time,
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