-- HeyPeter Academy Production Data Seeding Script (Final)
-- Simplified comprehensive seeding matching actual database schema

-- =============================================================================
-- PHASE 1: USERS 
-- =============================================================================

-- Create Admin Users
INSERT INTO users (id, email, full_name, role)
VALUES 
('00000000-0000-0000-0000-000000000001', 'admin@heypeter.com', 'Peter Wilson', 'admin'),
('00000000-0000-0000-0000-000000000002', 'operations@heypeter.com', 'Sarah Johnson', 'admin'),
('00000000-0000-0000-0000-000000000003', 'support@heypeter.com', 'Mike Chen', 'admin');

-- Create Teacher Users
INSERT INTO users (id, email, full_name, role)
VALUES 
('10000000-0000-0000-0000-000000000001', 'emily.teacher@heypeter.com', 'Emily Rodriguez', 'teacher'),
('10000000-0000-0000-0000-000000000002', 'david.teacher@heypeter.com', 'David Thompson', 'teacher'),
('10000000-0000-0000-0000-000000000003', 'maria.teacher@heypeter.com', 'Maria Santos', 'teacher'),
('10000000-0000-0000-0000-000000000004', 'james.teacher@heypeter.com', 'James Wilson', 'teacher'),
('10000000-0000-0000-0000-000000000005', 'robert.business@heypeter.com', 'Robert Clarke', 'teacher');

-- Insert Teacher Profiles
INSERT INTO teachers (user_id, email, full_name, availability, hourly_rate, bio)
VALUES 
('10000000-0000-0000-0000-000000000001', 'emily.teacher@heypeter.com', 'Emily Rodriguez', 
'{"monday": [{"start": "09:00", "end": "17:00"}], "tuesday": [{"start": "09:00", "end": "17:00"}], "wednesday": [{"start": "09:00", "end": "17:00"}], "thursday": [{"start": "09:00", "end": "17:00"}], "friday": [{"start": "09:00", "end": "17:00"}]}',
35, 'Experienced ESL teacher with expertise in beginner and intermediate courses.'),

('10000000-0000-0000-0000-000000000002', 'david.teacher@heypeter.com', 'David Thompson',
'{"monday": [{"start": "13:00", "end": "21:00"}], "tuesday": [{"start": "13:00", "end": "21:00"}], "wednesday": [{"start": "13:00", "end": "21:00"}], "thursday": [{"start": "13:00", "end": "21:00"}], "friday": [{"start": "13:00", "end": "21:00"}]}',
30, 'Dynamic teacher specializing in conversation and speaking skills.'),

('10000000-0000-0000-0000-000000000003', 'maria.teacher@heypeter.com', 'Maria Santos',
'{"monday": [{"start": "08:00", "end": "16:00"}], "tuesday": [{"start": "08:00", "end": "16:00"}], "wednesday": [{"start": "08:00", "end": "16:00"}], "thursday": [{"start": "08:00", "end": "16:00"}], "friday": [{"start": "08:00", "end": "16:00"}]}',
32, 'Patient and encouraging teacher perfect for nervous beginners.'),

('10000000-0000-0000-0000-000000000004', 'james.teacher@heypeter.com', 'James Wilson',
'{"monday": [{"start": "10:00", "end": "18:00"}], "tuesday": [{"start": "10:00", "end": "18:00"}], "wednesday": [{"start": "10:00", "end": "18:00"}], "thursday": [{"start": "10:00", "end": "18:00"}], "friday": [{"start": "10:00", "end": "18:00"}]}',
28, 'Energetic teacher who makes learning fun.'),

('10000000-0000-0000-0000-000000000005', 'robert.business@heypeter.com', 'Robert Clarke',
'{"monday": [{"start": "09:00", "end": "17:00"}], "tuesday": [{"start": "09:00", "end": "17:00"}], "wednesday": [{"start": "09:00", "end": "17:00"}], "thursday": [{"start": "09:00", "end": "17:00"}], "friday": [{"start": "09:00", "end": "17:00"}]}',
45, 'Business English specialist with corporate training background.');

-- =============================================================================
-- PHASE 2: COURSES AND MATERIALS
-- =============================================================================

-- Create Course Structure
INSERT INTO courses (title, description, course_type, is_online, duration_minutes, max_students, credit_hours)
VALUES 
('Basic English Course', 'Foundation English course for absolute beginners.', 'Basic', true, 60, 9, 1.0),
('Everyday English A', 'Elementary level course focusing on daily communication skills.', 'Everyday A', true, 60, 9, 1.0),
('Everyday English B', 'Intermediate level course building on everyday communication.', 'Everyday B', true, 60, 9, 1.0),
('Speak Up Course', 'Conversation-focused course designed to improve speaking confidence.', 'Speak Up', true, 60, 9, 1.0),
('Business English', 'Professional English course covering business communication.', 'Business English', true, 60, 6, 1.0),
('1-on-1 Personal Tutoring', 'Personalized one-on-one sessions.', '1-on-1', true, 60, 1, 2.0);

-- Create Learning Materials
INSERT INTO materials (course_id, title, description, material_type, file_url, unit_number, lesson_number)
SELECT 
    c.id,
    'Basic English Workbook Unit 1',
    'Introduction to English alphabet and basic pronunciation',
    'PDF',
    'https://example.com/basic-unit1.pdf',
    1,
    1
FROM courses c WHERE c.course_type = 'Basic';

INSERT INTO materials (course_id, title, description, material_type, file_url, unit_number, lesson_number)
SELECT 
    c.id,
    'Everyday English A Workbook',
    'Daily communication scenarios and vocabulary',
    'PDF',
    'https://example.com/everyday-a-unit1.pdf',
    1,
    1
FROM courses c WHERE c.course_type = 'Everyday A';

INSERT INTO materials (course_id, title, description, material_type, file_url, unit_number, lesson_number)
SELECT 
    c.id,
    'Business English Professional Handbook',
    'Corporate communication essentials',
    'PDF',
    'https://example.com/business-handbook.pdf',
    1,
    1
FROM courses c WHERE c.course_type = 'Business English';

-- =============================================================================
-- PHASE 3: STUDENT DATA
-- =============================================================================

-- Create 25 Student Users
DO $$ 
DECLARE
    student_names TEXT[] := ARRAY[
        'Alex Anderson', 'Sam Brown', 'Jordan Davis', 'Taylor Wilson', 'Casey Johnson',
        'Morgan Lee', 'Riley Martinez', 'Avery Thompson', 'Quinn Rodriguez', 'Sage Clark',
        'Dakota Lewis', 'Skylar Walker', 'Phoenix Hall', 'River Allen', 'Rowan Young',
        'Emerson King', 'Finley Wright', 'Hayden Lopez', 'Kendall Hill', 'Lennox Scott',
        'Marley Green', 'Oakley Adams', 'Peyton Baker', 'Quincy Nelson', 'Reese Carter'
    ];
    student_emails TEXT[] := ARRAY[
        'alex.anderson@student.example.com', 'sam.brown@student.example.com', 'jordan.davis@student.example.com',
        'taylor.wilson@student.example.com', 'casey.johnson@student.example.com', 'morgan.lee@student.example.com',
        'riley.martinez@student.example.com', 'avery.thompson@student.example.com', 'quinn.rodriguez@student.example.com',
        'sage.clark@student.example.com', 'dakota.lewis@student.example.com', 'skylar.walker@student.example.com',
        'phoenix.hall@student.example.com', 'river.allen@student.example.com', 'rowan.young@student.example.com',
        'emerson.king@student.example.com', 'finley.wright@student.example.com', 'hayden.lopez@student.example.com',
        'kendall.hill@student.example.com', 'lennox.scott@student.example.com', 'marley.green@student.example.com',
        'oakley.adams@student.example.com', 'peyton.baker@student.example.com', 'quincy.nelson@student.example.com',
        'reese.carter@student.example.com'
    ];
    i INTEGER;
    student_email TEXT;
    student_name TEXT;
    user_uuid UUID;
    student_id TEXT;
    test_level TEXT;
    proficiency_level INTEGER;
    remaining_hours NUMERIC;
    enrollment_date DATE;
    payment_amount NUMERIC;
    gender TEXT;
    genders TEXT[] := ARRAY['Male', 'Female', 'Other'];
    test_levels TEXT[] := ARRAY['Basic', 'Everyday A', 'Everyday B', 'Speak Up', 'Business English'];
BEGIN
    FOR i IN 1..25 LOOP
        student_name := student_names[i];
        student_email := student_emails[i];
        user_uuid := ('20000000-0000-0000-0000-' || LPAD(i::TEXT, 12, '0'))::UUID;
        student_id := 'STU-' || LPAD(i::TEXT, 4, '0');
        
        -- Distribute students across levels
        test_level := test_levels[1 + (i % 5)];
        proficiency_level := 1 + (i % 8); -- 1-8
        remaining_hours := 10 + (i % 30); -- 10-40 hours
        payment_amount := 300 + (i % 400); -- $300-700
        gender := genders[1 + (i % 3)];
        enrollment_date := CURRENT_DATE - INTERVAL '1 month' * (i % 6);
        
        -- Insert user first
        INSERT INTO users (id, email, full_name, role)
        VALUES (user_uuid, student_email, student_name, 'student');
        
        -- Insert student profile
        INSERT INTO students (
            user_id, email, full_name, student_id, internal_code, gender, 
            test_level, english_proficiency_level, enrollment_date, 
            total_course_hours, remaining_hours, payment_date, payment_amount
        )
        VALUES (
            user_uuid,
            student_email,
            student_name,
            student_id,
            'INT-' || LPAD(i::TEXT, 4, '0'),
            gender,
            test_level,
            proficiency_level,
            enrollment_date,
            40 + (i % 60), -- 40-100 hours total
            remaining_hours,
            enrollment_date,
            payment_amount
        );
        
    END LOOP;
    
    RAISE NOTICE 'Created 25 students with varied profiles';
END $$;

-- =============================================================================
-- PHASE 4: CLASSES AND SCHEDULES
-- =============================================================================

-- Create classes for the next 2 weeks
DO $$
DECLARE
    start_date DATE;
    end_date DATE;
    teacher_ids UUID[];
    course_ids UUID[];
    class_count INTEGER := 0;
    teacher_id UUID;
    course_id UUID;
    class_id UUID;
    max_students INTEGER;
    current_enrollment INTEGER;
    i INTEGER;
    day_of_week INTEGER;
    date_iter DATE;
BEGIN
    -- Get teacher and course IDs
    SELECT ARRAY_AGG(id) INTO teacher_ids FROM teachers ORDER BY created_at;
    SELECT ARRAY_AGG(id) INTO course_ids FROM courses ORDER BY created_at;
    
    start_date := CURRENT_DATE;
    end_date := start_date + INTERVAL '2 weeks';
    date_iter := start_date;
    
    -- Create classes for each weekday
    WHILE date_iter <= end_date LOOP
        day_of_week := EXTRACT(DOW FROM date_iter);
        
        -- Skip Sundays
        IF day_of_week != 0 THEN
            -- Create 3-5 classes per day
            FOR i IN 1..(3 + (day_of_week % 3)) LOOP
                class_count := class_count + 1;
                
                teacher_id := teacher_ids[1 + (class_count % array_length(teacher_ids, 1))];
                course_id := course_ids[1 + (class_count % array_length(course_ids, 1))];
                class_id := gen_random_uuid();
                
                -- Set capacity based on course type
                SELECT max_students INTO max_students FROM courses WHERE id = course_id;
                current_enrollment := 1 + (class_count % max_students);
                
                -- Insert class
                INSERT INTO classes (
                    id, course_id, teacher_id, class_name, capacity, current_enrollment,
                    unit_number, lesson_number, start_date, end_date, meeting_link
                )
                VALUES (
                    class_id,
                    course_id,
                    teacher_id,
                    'Class ' || class_count || ' - ' || (SELECT title FROM courses WHERE id = course_id),
                    max_students,
                    current_enrollment,
                    1,
                    class_count % 10 + 1,
                    date_iter,
                    date_iter + INTERVAL '1 day',
                    'https://meet.google.com/class-' || LOWER(SUBSTRING(class_id::TEXT, 1, 8))
                );
                
            END LOOP;
        END IF;
        
        date_iter := date_iter + INTERVAL '1 day';
    END LOOP;
    
    RAISE NOTICE 'Created % classes for 2 weeks', class_count;
END $$;

-- =============================================================================
-- PHASE 5: BOOKINGS
-- =============================================================================

-- Create bookings for classes
DO $$
DECLARE
    class_record RECORD;
    student_ids UUID[];
    booking_id UUID;
    booking_date TIMESTAMP;
    i INTEGER;
    random_student_id UUID;
BEGIN
    -- Get all student IDs
    SELECT ARRAY_AGG(id) INTO student_ids FROM students;
    
    -- Create bookings for each class
    FOR class_record IN 
        SELECT id, current_enrollment, start_date
        FROM classes 
        WHERE current_enrollment > 0
        ORDER BY start_date
    LOOP
        -- Create bookings for the enrolled students
        FOR i IN 1..class_record.current_enrollment LOOP
            booking_id := gen_random_uuid();
            random_student_id := student_ids[1 + (random() * (array_length(student_ids, 1) - 1))::INTEGER];
            
            -- Set booking timestamp
            booking_date := class_record.start_date + '10:00:00'::TIME;
            
            INSERT INTO bookings (
                id, student_id, class_id, booking_date, start_time, end_time,
                duration_minutes, learning_goals, status
            )
            VALUES (
                booking_id,
                random_student_id,
                class_record.id,
                class_record.start_date,
                booking_date,
                booking_date + INTERVAL '1 hour',
                60,
                'Improve English conversation skills',
                CASE 
                    WHEN class_record.start_date > CURRENT_DATE THEN 'confirmed'
                    ELSE 'completed'
                END
            );
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Created bookings for all classes';
END $$;

-- =============================================================================
-- PHASE 6: FEEDBACK
-- =============================================================================

-- Create feedback for completed bookings
DO $$
DECLARE
    booking_record RECORD;
    feedback_id UUID;
    rating INTEGER;
    ratings INTEGER[] := ARRAY[3, 4, 4, 5, 5, 5]; -- Weighted toward positive
BEGIN
    -- Create feedback for completed bookings
    FOR booking_record IN 
        SELECT b.id as booking_id, b.student_id, b.class_id, c.teacher_id
        FROM bookings b
        JOIN classes c ON b.class_id = c.id
        WHERE b.status = 'completed' 
        AND random() < 0.7  -- 70% feedback completion rate
        ORDER BY b.booking_date DESC
        LIMIT 50
    LOOP
        feedback_id := gen_random_uuid();
        rating := ratings[1 + (random() * (array_length(ratings, 1) - 1))::INTEGER];
        
        INSERT INTO feedback (
            id, student_id, teacher_id, class_id, rating,
            student_comments, teacher_notes, lesson_completed,
            lesson_unit, lesson_number
        )
        VALUES (
            feedback_id,
            booking_record.student_id,
            booking_record.teacher_id,
            booking_record.class_id,
            rating,
            CASE rating
                WHEN 5 THEN 'Excellent class! Very engaging and helpful.'
                WHEN 4 THEN 'Good lesson with clear explanations.'
                WHEN 3 THEN 'Average class, could be improved.'
                ELSE 'Needs improvement.'
            END,
            'Student showed good engagement and progress.',
            true,
            1,
            1
        );
    END LOOP;
    
    RAISE NOTICE 'Created feedback records for completed classes';
END $$;

-- =============================================================================
-- FINAL SUMMARY
-- =============================================================================

-- Display data summary
DO $$
DECLARE
    user_count INTEGER;
    student_count INTEGER;
    teacher_count INTEGER;
    course_count INTEGER;
    material_count INTEGER;
    class_count INTEGER;
    booking_count INTEGER;
    feedback_count INTEGER;
    avg_rating NUMERIC;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO student_count FROM students;
    SELECT COUNT(*) INTO teacher_count FROM teachers;
    SELECT COUNT(*) INTO course_count FROM courses;
    SELECT COUNT(*) INTO material_count FROM materials;
    SELECT COUNT(*) INTO class_count FROM classes;
    SELECT COUNT(*) INTO booking_count FROM bookings;
    SELECT COUNT(*) INTO feedback_count FROM feedback;
    SELECT AVG(rating) INTO avg_rating FROM feedback;
    
    RAISE NOTICE '=== HEYPETER ACADEMY DATA SEEDING COMPLETE ===';
    RAISE NOTICE 'Total users: %', user_count;
    RAISE NOTICE 'Students created: %', student_count;
    RAISE NOTICE 'Teachers created: %', teacher_count;
    RAISE NOTICE 'Courses created: %', course_count;
    RAISE NOTICE 'Materials created: %', material_count;
    RAISE NOTICE 'Classes scheduled: %', class_count;
    RAISE NOTICE 'Bookings created: %', booking_count;
    RAISE NOTICE 'Feedback records: %', feedback_count;
    RAISE NOTICE 'Average rating: %', COALESCE(ROUND(avg_rating, 2), 0);
    RAISE NOTICE '';
    RAISE NOTICE '=== TEST ACCOUNT CREDENTIALS ===';
    RAISE NOTICE 'Admin: admin@heypeter.com / operations@heypeter.com / support@heypeter.com';
    RAISE NOTICE 'Teachers: emily.teacher@heypeter.com, david.teacher@heypeter.com, etc.';
    RAISE NOTICE 'Students: alex.anderson@student.example.com, sam.brown@student.example.com, etc.';
    RAISE NOTICE 'Password for all accounts: Use the auth system to set passwords';
    RAISE NOTICE '';
    RAISE NOTICE '=== PRODUCTION DATA READY FOR TESTING ===';
END $$;