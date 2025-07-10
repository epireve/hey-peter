-- HeyPeter Academy Production Data Seeding Script
-- This script creates realistic dummy data for comprehensive testing
-- of all implemented systems: AI scheduling, 1v1 booking, email, analytics

-- =============================================================================
-- PHASE 1: FOUNDATION DATA (Dependencies First)
-- =============================================================================

-- Create Admin Users
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at)
VALUES 
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@heypeter.com', crypt('admin123', gen_salt('bf')), NOW(), '', NOW(), '', NOW(), '{"provider": "email", "providers": ["email"]}', '{"name": "Peter Wilson", "role": "admin"}', false, NOW(), NOW()),
('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'operations@heypeter.com', crypt('ops123', gen_salt('bf')), NOW(), '', NOW(), '', NOW(), '{"provider": "email", "providers": ["email"]}', '{"name": "Sarah Johnson", "role": "admin"}', false, NOW(), NOW()),
('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'support@heypeter.com', crypt('support123', gen_salt('bf')), NOW(), '', NOW(), '', NOW(), '{"provider": "email", "providers": ["email"]}', '{"name": "Mike Chen", "role": "admin"}', false, NOW(), NOW());

-- Create Teacher Users
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at)
VALUES 
-- Experienced Teachers
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'emily.teacher@heypeter.com', crypt('teacher123', gen_salt('bf')), NOW(), '', NOW(), '', NOW(), '{"provider": "email", "providers": ["email"]}', '{"name": "Emily Rodriguez", "role": "teacher"}', false, NOW(), NOW()),
('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'david.teacher@heypeter.com', crypt('teacher123', gen_salt('bf')), NOW(), '', NOW(), '', NOW(), '{"provider": "email", "providers": ["email"]}', '{"name": "David Thompson", "role": "teacher"}', false, NOW(), NOW()),
('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'maria.teacher@heypeter.com', crypt('teacher123', gen_salt('bf')), NOW(), '', NOW(), '', NOW(), '{"provider": "email", "providers": ["email"]}', '{"name": "Maria Santos", "role": "teacher"}', false, NOW(), NOW()),
('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'james.teacher@heypeter.com', crypt('teacher123', gen_salt('bf')), NOW(), '', NOW(), '', NOW(), '{"provider": "email", "providers": ["email"]}', '{"name": "James Wilson", "role": "teacher"}', false, NOW(), NOW()),
-- Business English Specialists
('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'robert.business@heypeter.com', crypt('teacher123', gen_salt('bf')), NOW(), '', NOW(), '', NOW(), '{"provider": "email", "providers": ["email"]}', '{"name": "Robert Clarke", "role": "teacher"}', false, NOW(), NOW()),
('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'lisa.business@heypeter.com', crypt('teacher123', gen_salt('bf')), NOW(), '', NOW(), '', NOW(), '{"provider": "email", "providers": ["email"]}', '{"name": "Lisa Anderson", "role": "teacher"}', false, NOW(), NOW()),
-- 1-on-1 Specialists
('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'anna.tutor@heypeter.com', crypt('teacher123', gen_salt('bf')), NOW(), '', NOW(), '', NOW(), '{"provider": "email", "providers": ["email"]}', '{"name": "Anna Kim", "role": "teacher"}', false, NOW(), NOW()),
('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'michael.tutor@heypeter.com', crypt('teacher123', gen_salt('bf')), NOW(), '', NOW(), '', NOW(), '{"provider": "email", "providers": ["email"]}', '{"name": "Michael Davis", "role": "teacher"}', false, NOW(), NOW()),
-- Part-time Teachers
('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sophie.parttime@heypeter.com', crypt('teacher123', gen_salt('bf')), NOW(), '', NOW(), '', NOW(), '{"provider": "email", "providers": ["email"]}', '{"name": "Sophie Brown", "role": "teacher"}', false, NOW(), NOW()),
('10000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'carlos.weekend@heypeter.com', crypt('teacher123', gen_salt('bf')), NOW(), '', NOW(), '', NOW(), '{"provider": "email", "providers": ["email"]}', '{"name": "Carlos Rodriguez", "role": "teacher"}', false, NOW(), NOW());

-- Insert Teacher Profiles
INSERT INTO teachers (id, user_id, internal_code, full_name, email, availability, hourly_rate, experience_years, specializations, bio, rating, total_classes_taught, total_hours_taught, phone, address, emergency_contact, created_at, updated_at)
VALUES 
('teacher-001', '10000000-0000-0000-0000-000000000001', 'F-001', 'Emily Rodriguez', 'emily.teacher@heypeter.com', 
'{"monday": [{"start": "09:00", "end": "17:00"}], "tuesday": [{"start": "09:00", "end": "17:00"}], "wednesday": [{"start": "09:00", "end": "17:00"}], "thursday": [{"start": "09:00", "end": "17:00"}], "friday": [{"start": "09:00", "end": "17:00"}]}',
35, 8, '["Basic", "Everyday A", "Everyday B"]', 'Experienced ESL teacher with expertise in beginner and intermediate courses. Passionate about creating engaging learning environments.', 4.8, 1250, 2100, '+1-555-0101', '123 Teacher St, Education City', 'Jane Rodriguez: +1-555-0102', NOW(), NOW()),

('teacher-002', '10000000-0000-0000-0000-000000000002', 'F-002', 'David Thompson', 'david.teacher@heypeter.com',
'{"monday": [{"start": "13:00", "end": "21:00"}], "tuesday": [{"start": "13:00", "end": "21:00"}], "wednesday": [{"start": "13:00", "end": "21:00"}], "thursday": [{"start": "13:00", "end": "21:00"}], "friday": [{"start": "13:00", "end": "21:00"}]}',
30, 5, '["Everyday A", "Everyday B", "Speak Up"]', 'Dynamic teacher specializing in conversation and speaking skills. Expert in intermediate to advanced courses.', 4.6, 850, 1420, '+1-555-0201', '456 Language Ave, Speaking District', 'Mary Thompson: +1-555-0202', NOW(), NOW()),

('teacher-003', '10000000-0000-0000-0000-000000000003', 'F-003', 'Maria Santos', 'maria.teacher@heypeter.com',
'{"monday": [{"start": "08:00", "end": "16:00"}], "tuesday": [{"start": "08:00", "end": "16:00"}], "wednesday": [{"start": "08:00", "end": "16:00"}], "thursday": [{"start": "08:00", "end": "16:00"}], "friday": [{"start": "08:00", "end": "16:00"}]}',
32, 6, '["Basic", "Everyday A", "Speak Up"]', 'Patient and encouraging teacher perfect for nervous beginners. Specializes in building confidence in English speaking.', 4.9, 1100, 1850, '+1-555-0301', '789 Learning Blvd, Education Hub', 'Carlos Santos: +1-555-0302', NOW(), NOW()),

('teacher-004', '10000000-0000-0000-0000-000000000004', 'F-004', 'James Wilson', 'james.teacher@heypeter.com',
'{"monday": [{"start": "10:00", "end": "18:00"}], "tuesday": [{"start": "10:00", "end": "18:00"}], "wednesday": [{"start": "10:00", "end": "18:00"}], "thursday": [{"start": "10:00", "end": "18:00"}], "friday": [{"start": "10:00", "end": "18:00"}], "saturday": [{"start": "09:00", "end": "15:00"}]}',
28, 4, '["Basic", "Everyday B", "Speak Up"]', 'Energetic teacher who makes learning fun. Great with mixed-level groups and building student engagement.', 4.5, 720, 1200, '+1-555-0401', '321 Academy Road, Teacher Town', 'Lisa Wilson: +1-555-0402', NOW(), NOW()),

('teacher-005', '10000000-0000-0000-0000-000000000005', 'F-005', 'Robert Clarke', 'robert.business@heypeter.com',
'{"monday": [{"start": "09:00", "end": "17:00"}], "tuesday": [{"start": "09:00", "end": "17:00"}], "wednesday": [{"start": "09:00", "end": "17:00"}], "thursday": [{"start": "09:00", "end": "17:00"}], "friday": [{"start": "09:00", "end": "17:00"}]}',
45, 12, '["Business English", "1-on-1"]', 'Business English specialist with corporate training background. Expert in professional communication and presentations.', 4.9, 980, 1650, '+1-555-0501', '654 Corporate Lane, Business District', 'Helen Clarke: +1-555-0502', NOW(), NOW()),

('teacher-006', '10000000-0000-0000-0000-000000000006', 'F-006', 'Lisa Anderson', 'lisa.business@heypeter.com',
'{"monday": [{"start": "11:00", "end": "19:00"}], "tuesday": [{"start": "11:00", "end": "19:00"}], "wednesday": [{"start": "11:00", "end": "19:00"}], "thursday": [{"start": "11:00", "end": "19:00"}], "friday": [{"start": "11:00", "end": "19:00"}]}',
42, 10, '["Business English", "1-on-1"]', 'Former corporate executive turned English teacher. Specializes in business vocabulary and professional writing skills.', 4.7, 750, 1260, '+1-555-0601', '987 Professional Plaza, Executive Center', 'John Anderson: +1-555-0602', NOW(), NOW()),

('teacher-007', '10000000-0000-0000-0000-000000000007', 'F-007', 'Anna Kim', 'anna.tutor@heypeter.com',
'{"monday": [{"start": "14:00", "end": "22:00"}], "tuesday": [{"start": "14:00", "end": "22:00"}], "wednesday": [{"start": "14:00", "end": "22:00"}], "thursday": [{"start": "14:00", "end": "22:00"}], "friday": [{"start": "14:00", "end": "22:00"}], "saturday": [{"start": "10:00", "end": "18:00"}], "sunday": [{"start": "10:00", "end": "18:00"}]}',
38, 7, '["1-on-1", "Basic", "Everyday A"]', 'Dedicated 1-on-1 tutor with personalized learning approach. Expert in identifying and addressing individual learning needs.', 4.8, 1420, 2380, '+1-555-0701', '147 Tutor Street, Learning Zone', 'David Kim: +1-555-0702', NOW(), NOW()),

('teacher-008', '10000000-0000-0000-0000-000000000008', 'F-008', 'Michael Davis', 'michael.tutor@heypeter.com',
'{"monday": [{"start": "16:00", "end": "22:00"}], "tuesday": [{"start": "16:00", "end": "22:00"}], "wednesday": [{"start": "16:00", "end": "22:00"}], "thursday": [{"start": "16:00", "end": "22:00"}], "friday": [{"start": "16:00", "end": "22:00"}], "saturday": [{"start": "09:00", "end": "17:00"}], "sunday": [{"start": "09:00", "end": "17:00"}]}',
40, 9, '["1-on-1", "Business English", "Speak Up"]', 'Patient and methodical 1-on-1 instructor. Excellent at helping students overcome specific challenges and achieve targeted goals.', 4.6, 890, 1490, '+1-555-0801', '258 Personal Coach Ave, Individual Learning District', 'Sarah Davis: +1-555-0802', NOW(), NOW()),

('teacher-009', '10000000-0000-0000-0000-000000000009', 'F-009', 'Sophie Brown', 'sophie.parttime@heypeter.com',
'{"tuesday": [{"start": "18:00", "end": "22:00"}], "thursday": [{"start": "18:00", "end": "22:00"}], "saturday": [{"start": "09:00", "end": "17:00"}], "sunday": [{"start": "09:00", "end": "17:00"}]}',
25, 3, '["Basic", "Everyday A"]', 'Part-time teacher and graduate student. Brings fresh energy and modern teaching techniques to beginner classes.', 4.4, 320, 540, '+1-555-0901', '369 Student Housing, University Area', 'Tom Brown: +1-555-0902', NOW(), NOW()),

('teacher-010', '10000000-0000-0000-0000-000000000010', 'F-010', 'Carlos Rodriguez', 'carlos.weekend@heypeter.com',
'{"friday": [{"start": "17:00", "end": "22:00"}], "saturday": [{"start": "08:00", "end": "18:00"}], "sunday": [{"start": "08:00", "end": "18:00"}]}',
30, 5, '["Everyday B", "Speak Up", "1-on-1"]', 'Weekend specialist perfect for working professionals. Flexible scheduling and understanding of adult learner needs.', 4.7, 560, 940, '+1-555-1001', '741 Weekend Way, Flexible Schedule District', 'Maria Rodriguez: +1-555-1002', NOW(), NOW());

-- Create Course Structure
INSERT INTO courses (id, title, description, course_type, level, duration_weeks, max_students, min_students, price_per_hour, is_active, created_at, updated_at)
VALUES 
('course-basic', 'Basic English Course', 'Foundation English course for absolute beginners. Covers basic vocabulary, grammar, and simple conversations.', 'Basic', 1, 24, 9, 3, 20, true, NOW(), NOW()),
('course-everyday-a', 'Everyday English A', 'Elementary level course focusing on daily communication skills and practical English usage.', 'Everyday A', 3, 20, 9, 3, 22, true, NOW(), NOW()),
('course-everyday-b', 'Everyday English B', 'Intermediate level course building on everyday communication with more complex grammar and vocabulary.', 'Everyday B', 5, 20, 9, 3, 24, true, NOW(), NOW()),
('course-speak-up', 'Speak Up Course', 'Conversation-focused course designed to improve speaking confidence and fluency.', 'Speak Up', 6, 16, 9, 3, 26, true, NOW(), NOW()),
('course-business', 'Business English', 'Professional English course covering business communication, presentations, and corporate vocabulary.', 'Business English', 7, 12, 6, 2, 35, true, NOW(), NOW()),
('course-1on1', '1-on-1 Personal Tutoring', 'Personalized one-on-one sessions tailored to individual learning goals and needs.', '1-on-1', 0, 0, 1, 1, 45, true, NOW(), NOW());

-- =============================================================================
-- PHASE 2: STUDENT DATA AND ENROLLMENTS
-- =============================================================================

-- Create Student Users (50 students with varied profiles)
-- Generating representative student data with realistic email patterns
DO $$ 
DECLARE
    i INTEGER;
    student_email TEXT;
    student_name TEXT;
    user_uuid UUID;
    student_id TEXT;
    test_level INTEGER;
    course_to_enroll TEXT;
    course_ids TEXT[] := ARRAY['course-basic', 'course-everyday-a', 'course-everyday-b', 'course-speak-up', 'course-business'];
    first_names TEXT[] := ARRAY['Alex', 'Sam', 'Jordan', 'Taylor', 'Casey', 'Morgan', 'Riley', 'Avery', 'Quinn', 'Sage', 'Blake', 'Drew', 'Emery', 'Finley', 'Harper', 'Hayden', 'Jamie', 'Kai', 'Lane', 'Logan', 'Mason', 'Noah', 'Parker', 'Peyton', 'Reese', 'River', 'Rowan', 'Skylar', 'Sydney', 'Tatum', 'Cameron', 'Dallas', 'Eden', 'Ellis', 'Frankie', 'Gray', 'Harley', 'Indigo', 'Jules', 'Kendall', 'Lennox', 'Marley', 'Ocean', 'Phoenix', 'Raven', 'Robin', 'Salem', 'Sloan', 'Story', 'True'];
    last_names TEXT[] := ARRAY['Anderson', 'Brown', 'Davis', 'Garcia', 'Johnson', 'Jones', 'Miller', 'Rodriguez', 'Smith', 'Williams', 'Wilson', 'Lee', 'Martinez', 'Taylor', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Moore', 'Young', 'Allen', 'King', 'Wright', 'Lopez', 'Hill', 'Scott', 'Green', 'Adams', 'Baker', 'Gonzalez', 'Nelson', 'Carter', 'Mitchell', 'Perez', 'Roberts', 'Turner', 'Phillips', 'Campbell', 'Parker', 'Evans', 'Edwards', 'Collins', 'Stewart', 'Sanchez', 'Morris', 'Rogers', 'Reed', 'Cook'];
BEGIN
    FOR i IN 1..50 LOOP
        -- Generate student details
        student_name := first_names[1 + (random() * array_length(first_names, 1))::INTEGER] || ' ' || 
                       last_names[1 + (random() * array_length(last_names, 1))::INTEGER];
        student_email := lower(replace(student_name, ' ', '.')) || '@student.example.com';
        user_uuid := ('20000000-0000-0000-0000-' || lpad(i::TEXT, 12, '0'))::UUID;
        student_id := 'HPA' || lpad(i::TEXT, 3, '0');
        
        -- Distribute test levels realistically
        CASE 
            WHEN i <= 15 THEN test_level := 1 + (random() * 2)::INTEGER; -- Beginners (1-3)
            WHEN i <= 35 THEN test_level := 3 + (random() * 3)::INTEGER; -- Intermediate (3-6)
            ELSE test_level := 6 + (random() * 4)::INTEGER; -- Advanced (6-10)
        END CASE;
        
        -- Create auth user
        INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at)
        VALUES (user_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', student_email, crypt('student123', gen_salt('bf')), NOW(), '', NOW(), '', NOW(), '{"provider": "email", "providers": ["email"]}', format('{"name": "%s", "role": "student"}', student_name), false, NOW(), NOW());
        
        -- Create student profile
        INSERT INTO students (id, user_id, student_id, full_name, email, test_level, phone, address, emergency_contact, date_of_birth, enrollment_date, payment_status, hour_balance, created_at, updated_at)
        VALUES (
            'student-' || lpad(i::TEXT, 3, '0'),
            user_uuid,
            student_id,
            student_name,
            student_email,
            test_level,
            '+1-555-' || lpad((1000 + i)::TEXT, 4, '0'),
            (i * 10) || ' Student Lane, Learning City',
            'Emergency Contact: +1-555-' || lpad((2000 + i)::TEXT, 4, '0'),
            DATE '1990-01-01' + (random() * 365 * 20)::INTEGER,
            NOW() - (random() * 365)::INTEGER * INTERVAL '1 day',
            CASE WHEN random() < 0.85 THEN 'paid' ELSE 'pending' END,
            10 + (random() * 50)::INTEGER, -- 10-60 hours
            NOW(),
            NOW()
        );
        
        -- Enroll students in appropriate courses
        CASE 
            WHEN test_level <= 2 THEN course_to_enroll := 'course-basic';
            WHEN test_level <= 4 THEN course_to_enroll := 'course-everyday-a';
            WHEN test_level <= 6 THEN course_to_enroll := 'course-everyday-b';
            WHEN test_level <= 8 THEN course_to_enroll := 'course-speak-up';
            ELSE course_to_enroll := 'course-business';
        END CASE;
        
        INSERT INTO student_courses (student_id, course_id, enrollment_date, status, progress_percentage, current_unit, current_lesson, created_at, updated_at)
        VALUES (
            'student-' || lpad(i::TEXT, 3, '0'),
            course_to_enroll,
            NOW() - (random() * 180)::INTEGER * INTERVAL '1 day',
            'active',
            (random() * 80)::INTEGER, -- 0-80% progress
            1 + (random() * 5)::INTEGER, -- Units 1-6
            1 + (random() * 4)::INTEGER, -- Lessons 1-5
            NOW(),
            NOW()
        );
        
    END LOOP;
END $$;

-- =============================================================================
-- PHASE 3: LEARNING MATERIALS AND CONTENT
-- =============================================================================

-- Insert comprehensive learning materials for each course
INSERT INTO materials (id, course_id, title, description, material_type, unit_number, lesson_number, file_path, is_required, created_at, updated_at)
VALUES 
-- Basic Course Materials (12 units, 4 lessons each = 48 materials)
('basic-u1-l1', 'course-basic', 'Introduction to English', 'Basic greetings and introductions', 'PDF', 1, 1, '/materials/basic/unit1/lesson1.pdf', true, NOW(), NOW()),
('basic-u1-l2', 'course-basic', 'Alphabet and Numbers', 'Learning the English alphabet and basic numbers', 'Audio', 1, 2, '/materials/basic/unit1/lesson2.mp3', true, NOW(), NOW()),
('basic-u1-l3', 'course-basic', 'Common Phrases', 'Everyday phrases for beginners', 'Video', 1, 3, '/materials/basic/unit1/lesson3.mp4', true, NOW(), NOW()),
('basic-u1-l4', 'course-basic', 'Practice Conversations', 'Simple conversation practice', 'PDF', 1, 4, '/materials/basic/unit1/lesson4.pdf', true, NOW(), NOW()),

('basic-u2-l1', 'course-basic', 'Family and Friends', 'Vocabulary about family relationships', 'PDF', 2, 1, '/materials/basic/unit2/lesson1.pdf', true, NOW(), NOW()),
('basic-u2-l2', 'course-basic', 'Describing People', 'Physical descriptions and personality', 'Audio', 2, 2, '/materials/basic/unit2/lesson2.mp3', true, NOW(), NOW()),
('basic-u2-l3', 'course-basic', 'House and Home', 'Rooms and furniture vocabulary', 'Video', 2, 3, '/materials/basic/unit2/lesson3.mp4', true, NOW(), NOW()),
('basic-u2-l4', 'course-basic', 'Daily Routines', 'Talking about daily activities', 'PDF', 2, 4, '/materials/basic/unit2/lesson4.pdf', true, NOW(), NOW()),

-- Everyday A Materials (15 units, 5 lessons each - showing first 2 units)
('everyday-a-u1-l1', 'course-everyday-a', 'Making Small Talk', 'Weather and casual conversation', 'PDF', 1, 1, '/materials/everyday-a/unit1/lesson1.pdf', true, NOW(), NOW()),
('everyday-a-u1-l2', 'course-everyday-a', 'Shopping Essentials', 'Basic shopping vocabulary and phrases', 'Audio', 1, 2, '/materials/everyday-a/unit1/lesson2.mp3', true, NOW(), NOW()),
('everyday-a-u1-l3', 'course-everyday-a', 'At the Restaurant', 'Ordering food and drinks', 'Video', 1, 3, '/materials/everyday-a/unit1/lesson3.mp4', true, NOW(), NOW()),
('everyday-a-u1-l4', 'course-everyday-a', 'Transportation', 'Getting around the city', 'PDF', 1, 4, '/materials/everyday-a/unit1/lesson4.pdf', true, NOW(), NOW()),
('everyday-a-u1-l5', 'course-everyday-a', 'Time and Schedules', 'Talking about time and appointments', 'Other', 1, 5, '/materials/everyday-a/unit1/lesson5.doc', true, NOW(), NOW()),

-- Business English Materials (8 units, 8 lessons each - showing first unit)
('business-u1-l1', 'course-business', 'Professional Introductions', 'Networking and business card exchanges', 'PDF', 1, 1, '/materials/business/unit1/lesson1.pdf', true, NOW(), NOW()),
('business-u1-l2', 'course-business', 'Email Communication', 'Writing professional emails', 'PDF', 1, 2, '/materials/business/unit1/lesson2.pdf', true, NOW(), NOW()),
('business-u1-l3', 'course-business', 'Meeting Basics', 'Participating in business meetings', 'Video', 1, 3, '/materials/business/unit1/lesson3.mp4', true, NOW(), NOW()),
('business-u1-l4', 'course-business', 'Phone Etiquette', 'Professional phone conversations', 'Audio', 1, 4, '/materials/business/unit1/lesson4.mp3', true, NOW(), NOW()),
('business-u1-l5', 'course-business', 'Presentation Skills', 'Basic presentation techniques', 'PDF', 1, 5, '/materials/business/unit1/lesson5.pdf', true, NOW(), NOW()),
('business-u1-l6', 'course-business', 'Office Vocabulary', 'Workplace terminology and phrases', 'Other', 1, 6, '/materials/business/unit1/lesson6.doc', true, NOW(), NOW()),
('business-u1-l7', 'course-business', 'Cultural Awareness', 'Business culture and customs', 'Video', 1, 7, '/materials/business/unit1/lesson7.mp4', true, NOW(), NOW()),
('business-u1-l8', 'course-business', 'Practice Session', 'Role-playing business scenarios', 'PDF', 1, 8, '/materials/business/unit1/lesson8.pdf', true, NOW(), NOW());

-- =============================================================================
-- PHASE 4: SCHEDULING DATA AND CLASS INSTANCES
-- =============================================================================

-- Create class schedules for different time slots
INSERT INTO schedules (id, day_of_week, start_time, end_time, duration_minutes, class_type, max_capacity, is_recurring, created_at, updated_at)
VALUES 
-- Monday Schedules
('schedule-mon-0900', 1, '09:00:00', '10:00:00', 60, 'group', 9, true, NOW(), NOW()),
('schedule-mon-1000', 1, '10:00:00', '11:00:00', 60, 'group', 9, true, NOW(), NOW()),
('schedule-mon-1100', 1, '11:00:00', '12:00:00', 60, 'group', 9, true, NOW(), NOW()),
('schedule-mon-1400', 1, '14:00:00', '15:00:00', 60, 'group', 9, true, NOW(), NOW()),
('schedule-mon-1500', 1, '15:00:00', '16:00:00', 60, 'group', 9, true, NOW(), NOW()),
('schedule-mon-1600', 1, '16:00:00', '17:00:00', 60, 'group', 9, true, NOW(), NOW()),
('schedule-mon-1900', 1, '19:00:00', '20:00:00', 60, 'group', 9, true, NOW(), NOW()),
('schedule-mon-2000', 1, '20:00:00', '21:00:00', 60, 'group', 9, true, NOW(), NOW()),

-- Tuesday Schedules
('schedule-tue-0900', 2, '09:00:00', '10:00:00', 60, 'group', 9, true, NOW(), NOW()),
('schedule-tue-1000', 2, '10:00:00', '11:00:00', 60, 'group', 9, true, NOW(), NOW()),
('schedule-tue-1100', 2, '11:00:00', '12:00:00', 60, 'group', 9, true, NOW(), NOW()),
('schedule-tue-1400', 2, '14:00:00', '15:00:00', 60, 'group', 9, true, NOW(), NOW()),
('schedule-tue-1500', 2, '15:00:00', '16:00:00', 60, 'group', 9, true, NOW(), NOW()),
('schedule-tue-1600', 2, '16:00:00', '17:00:00', 60, 'group', 9, true, NOW(), NOW()),
('schedule-tue-1900', 2, '19:00:00', '20:00:00', 60, 'group', 9, true, NOW(), NOW()),
('schedule-tue-2000', 2, '20:00:00', '21:00:00', 60, 'group', 9, true, NOW(), NOW()),

-- Wednesday through Friday (similar pattern)
('schedule-wed-0900', 3, '09:00:00', '10:00:00', 60, 'group', 9, true, NOW(), NOW()),
('schedule-wed-1400', 3, '14:00:00', '15:00:00', 60, 'group', 9, true, NOW(), NOW()),
('schedule-wed-1900', 3, '19:00:00', '20:00:00', 60, 'group', 9, true, NOW(), NOW()),

('schedule-thu-0900', 4, '09:00:00', '10:00:00', 60, 'group', 9, true, NOW(), NOW()),
('schedule-thu-1400', 4, '14:00:00', '15:00:00', 60, 'group', 9, true, NOW(), NOW()),
('schedule-thu-1900', 4, '19:00:00', '20:00:00', 60, 'group', 9, true, NOW(), NOW()),

('schedule-fri-0900', 5, '09:00:00', '10:00:00', 60, 'group', 9, true, NOW(), NOW()),
('schedule-fri-1400', 5, '14:00:00', '15:00:00', 60, 'group', 9, true, NOW(), NOW()),
('schedule-fri-1900', 5, '19:00:00', '20:00:00', 60, 'group', 9, true, NOW(), NOW()),

-- Weekend schedules (more 1-on-1 focused)
('schedule-sat-1000', 6, '10:00:00', '11:00:00', 60, 'individual', 1, true, NOW(), NOW()),
('schedule-sat-1100', 6, '11:00:00', '12:00:00', 60, 'individual', 1, true, NOW(), NOW()),
('schedule-sat-1400', 6, '14:00:00', '15:00:00', 60, 'individual', 1, true, NOW(), NOW()),
('schedule-sat-1500', 6, '15:00:00', '16:00:00', 60, 'individual', 1, true, NOW(), NOW()),

('schedule-sun-1000', 0, '10:00:00', '11:00:00', 60, 'individual', 1, true, NOW(), NOW()),
('schedule-sun-1400', 0, '14:00:00', '15:00:00', 60, 'individual', 1, true, NOW(), NOW());

-- Insert realistic class instances for the next 4 weeks
DO $$
DECLARE
    class_counter INTEGER := 1;
    week_offset INTEGER;
    current_date DATE;
    schedule_rec RECORD;
    teacher_id TEXT;
    course_id TEXT;
    teacher_ids TEXT[] := ARRAY['teacher-001', 'teacher-002', 'teacher-003', 'teacher-004', 'teacher-005', 'teacher-006', 'teacher-007', 'teacher-008', 'teacher-009', 'teacher-010'];
    course_ids TEXT[] := ARRAY['course-basic', 'course-everyday-a', 'course-everyday-b', 'course-speak-up', 'course-business'];
BEGIN
    -- Create classes for next 4 weeks
    FOR week_offset IN 0..3 LOOP
        FOR schedule_rec IN 
            SELECT * FROM schedules WHERE is_recurring = true
        LOOP
            current_date := date_trunc('week', CURRENT_DATE) + (week_offset * INTERVAL '7 days') + (schedule_rec.day_of_week * INTERVAL '1 day');
            
            -- Skip weekends for most group classes
            IF schedule_rec.day_of_week IN (0, 6) AND schedule_rec.class_type = 'group' THEN
                CONTINUE;
            END IF;
            
            -- Randomly assign teacher and course
            teacher_id := teacher_ids[1 + (random() * array_length(teacher_ids, 1))::INTEGER];
            course_id := course_ids[1 + (random() * array_length(course_ids, 1))::INTEGER];
            
            -- Adjust course selection based on schedule type
            IF schedule_rec.class_type = 'individual' THEN
                course_id := CASE WHEN random() < 0.5 THEN 'course-1on1' ELSE course_id END;
            END IF;
            
            INSERT INTO classes (
                id, course_id, teacher_id, schedule_id, class_date, start_time, end_time,
                max_capacity, current_enrollment, status, class_type, location, 
                zoom_link, materials_covered, created_at, updated_at
            ) VALUES (
                'class-' || lpad(class_counter::TEXT, 4, '0'),
                course_id,
                teacher_id,
                schedule_rec.id,
                current_date,
                schedule_rec.start_time,
                schedule_rec.end_time,
                schedule_rec.max_capacity,
                0, -- Will be updated when we add bookings
                'scheduled',
                schedule_rec.class_type,
                CASE WHEN random() < 0.3 THEN 'Room ' || (1 + (random() * 10)::INTEGER) ELSE 'Online' END,
                CASE WHEN random() < 0.7 THEN 'https://zoom.us/j/' || (1000000 + random() * 9000000)::INTEGER ELSE NULL END,
                '[]'::jsonb,
                NOW(),
                NOW()
            );
            
            class_counter := class_counter + 1;
        END LOOP;
    END LOOP;
END $$;

-- =============================================================================
-- PHASE 5: BOOKING DATA AND HOUR TRANSACTIONS
-- =============================================================================

-- Create realistic booking data
DO $$
DECLARE
    student_rec RECORD;
    class_rec RECORD;
    booking_counter INTEGER := 1;
    students_per_class INTEGER;
    booking_date TIMESTAMP;
    should_attend BOOLEAN;
    hour_cost INTEGER;
BEGIN
    -- Book students into classes
    FOR class_rec IN 
        SELECT c.*, co.price_per_hour FROM classes c 
        JOIN courses co ON c.course_id = co.id 
        WHERE c.class_date >= CURRENT_DATE - INTERVAL '30 days'
        ORDER BY c.class_date, c.start_time
    LOOP
        -- Determine how many students to book (realistic capacity usage)
        students_per_class := CASE 
            WHEN class_rec.class_type = 'individual' THEN 1
            WHEN class_rec.max_capacity <= 3 THEN 1 + (random() * class_rec.max_capacity)::INTEGER
            ELSE GREATEST(2, (random() * (class_rec.max_capacity - 1))::INTEGER) -- Usually not full capacity
        END;
        
        -- Book random students into this class
        FOR student_rec IN 
            SELECT s.* FROM students s 
            JOIN student_courses sc ON s.id = sc.student_id 
            WHERE sc.course_id = class_rec.course_id 
            AND sc.status = 'active'
            ORDER BY random() 
            LIMIT students_per_class
        LOOP
            booking_date := class_rec.class_date - (1 + random() * 7)::INTEGER * INTERVAL '1 day';
            should_attend := random() < 0.85; -- 85% attendance rate
            hour_cost := CASE 
                WHEN class_rec.class_type = 'individual' THEN 2 -- 1-on-1 classes cost more hours
                ELSE 1 -- Group classes cost 1 hour
            END;
            
            -- Create booking
            INSERT INTO bookings (
                id, student_id, class_id, booking_date, status, attendance_status,
                hour_cost, learning_goals, special_requests, created_at, updated_at
            ) VALUES (
                'booking-' || lpad(booking_counter::TEXT, 5, '0'),
                student_rec.id,
                class_rec.id,
                booking_date,
                CASE 
                    WHEN class_rec.class_date < CURRENT_DATE THEN 'completed'
                    WHEN class_rec.class_date = CURRENT_DATE THEN 'confirmed'
                    ELSE 'confirmed'
                END,
                CASE 
                    WHEN class_rec.class_date < CURRENT_DATE THEN 
                        CASE WHEN should_attend THEN 'present' ELSE 'absent' END
                    ELSE 'pending'
                END,
                hour_cost,
                CASE 
                    WHEN class_rec.class_type = 'individual' THEN 
                        '["Improve speaking confidence", "Focus on pronunciation", "Practice business vocabulary"]'::jsonb
                    ELSE '["Participate actively in group discussions", "Complete all exercises"]'::jsonb
                END,
                CASE WHEN random() < 0.2 THEN 'Please speak slowly, I am a beginner' ELSE NULL END,
                booking_date,
                NOW()
            );
            
            -- Create hour transaction for completed classes
            IF class_rec.class_date < CURRENT_DATE AND should_attend THEN
                INSERT INTO hour_transactions (
                    id, student_id, transaction_type, amount, balance_after, 
                    description, booking_id, created_at
                ) VALUES (
                    'transaction-' || lpad(booking_counter::TEXT, 5, '0'),
                    student_rec.id,
                    'deduction',
                    hour_cost,
                    GREATEST(0, student_rec.hour_balance - hour_cost),
                    'Class attendance: ' || class_rec.id,
                    'booking-' || lpad(booking_counter::TEXT, 5, '0'),
                    class_rec.class_date + class_rec.start_time::TIME
                );
                
                -- Update student hour balance
                UPDATE students 
                SET hour_balance = GREATEST(0, hour_balance - hour_cost)
                WHERE id = student_rec.id;
            END IF;
            
            booking_counter := booking_counter + 1;
        END LOOP;
        
        -- Update class enrollment count
        UPDATE classes 
        SET current_enrollment = (
            SELECT COUNT(*) FROM bookings 
            WHERE class_id = class_rec.id AND status != 'cancelled'
        )
        WHERE id = class_rec.id;
    END LOOP;
END $$;

-- =============================================================================
-- PHASE 6: FEEDBACK AND ASSESSMENT DATA
-- =============================================================================

-- Generate feedback for completed classes
DO $$
DECLARE
    booking_rec RECORD;
    feedback_counter INTEGER := 1;
    rating INTEGER;
    feedback_text TEXT[];
    improvement_areas TEXT[];
    strengths TEXT[];
BEGIN
    feedback_text := ARRAY[
        'Great class! Very interactive and helpful.',
        'The teacher explained everything clearly.',
        'I learned a lot today, thank you!',
        'Good practice session, need more speaking time.',
        'Excellent materials and teaching style.',
        'The pace was perfect for my level.',
        'Very patient teacher, helped me a lot.',
        'Good class but would like more conversation practice.',
        'Clear explanations and good examples.',
        'Enjoyed the group activities.',
        'Teacher was well-prepared and organized.',
        'Would recommend this class to others.'
    ];
    
    improvement_areas := ARRAY[
        'pronunciation',
        'grammar',
        'vocabulary',
        'listening skills',
        'speaking confidence',
        'writing skills',
        'reading comprehension',
        'conversation flow'
    ];
    
    strengths := ARRAY[
        'good participation',
        'quick understanding',
        'excellent pronunciation',
        'strong vocabulary',
        'active listening',
        'confident speaking',
        'good grammar knowledge',
        'creative thinking'
    ];
    
    -- Generate feedback for completed bookings (80% feedback rate)
    FOR booking_rec IN 
        SELECT b.*, c.class_date + c.start_time::TIME as class_datetime
        FROM bookings b 
        JOIN classes c ON b.class_id = c.id 
        WHERE b.attendance_status = 'present' 
        AND c.class_date < CURRENT_DATE 
        AND random() < 0.8 -- 80% of students provide feedback
        ORDER BY c.class_date DESC
        LIMIT 200 -- Limit to recent feedback
    LOOP
        rating := 3 + (random() * 2)::INTEGER; -- Ratings between 3-5 (realistic positive bias)
        
        INSERT INTO feedback (
            id, student_id, teacher_id, booking_id, rating, comments,
            areas_for_improvement, strengths, lesson_unit, lesson_number,
            lesson_completed, submitted_time, created_at, updated_at
        ) VALUES (
            'feedback-' || lpad(feedback_counter::TEXT, 4, '0'),
            booking_rec.student_id,
            (SELECT teacher_id FROM classes WHERE id = booking_rec.class_id),
            booking_rec.id,
            rating,
            feedback_text[1 + (random() * array_length(feedback_text, 1))::INTEGER],
            CASE WHEN rating < 5 THEN 
                improvement_areas[1 + (random() * array_length(improvement_areas, 1))::INTEGER]
            ELSE NULL END,
            strengths[1 + (random() * array_length(strengths, 1))::INTEGER],
            1 + (random() * 5)::INTEGER, -- Unit 1-6
            1 + (random() * 4)::INTEGER, -- Lesson 1-5
            true,
            booking_rec.class_datetime + INTERVAL '2 hours', -- Feedback submitted after class
            NOW(),
            NOW()
        );
        
        feedback_counter := feedback_counter + 1;
    END LOOP;
END $$;

-- =============================================================================
-- PHASE 7: HOUR PURCHASE TRANSACTIONS
-- =============================================================================

-- Generate realistic hour purchase history
DO $$
DECLARE
    student_rec RECORD;
    purchase_counter INTEGER := 1;
    purchase_packages INTEGER[] := ARRAY[10, 20, 30, 50]; -- Common hour packages
    package_size INTEGER;
    purchase_date TIMESTAMP;
    transaction_id TEXT;
BEGIN
    -- Generate purchase history for each student
    FOR student_rec IN SELECT * FROM students ORDER BY enrollment_date LOOP
        -- Most students purchase 1-3 packages over time
        FOR i IN 1..(1 + (random() * 2)::INTEGER) LOOP
            package_size := purchase_packages[1 + (random() * array_length(purchase_packages, 1))::INTEGER];
            purchase_date := student_rec.enrollment_date + (random() * 180)::INTEGER * INTERVAL '1 day';
            transaction_id := 'purchase-' || lpad(purchase_counter::TEXT, 4, '0');
            
            -- Skip if purchase date is in the future
            IF purchase_date > NOW() THEN
                CONTINUE;
            END IF;
            
            INSERT INTO hour_transactions (
                id, student_id, transaction_type, amount, balance_after,
                description, payment_method, payment_id, created_at
            ) VALUES (
                transaction_id,
                student_rec.id,
                'purchase',
                package_size,
                package_size, -- Will be updated later with cumulative balance
                format('%s hour package purchase', package_size),
                CASE WHEN random() < 0.7 THEN 'credit_card' ELSE 'bank_transfer' END,
                'pay_' || generate_random_uuid(),
                purchase_date
            );
            
            purchase_counter := purchase_counter + 1;
        END LOOP;
    END LOOP;
    
    -- Update balances based on transaction history
    UPDATE students 
    SET hour_balance = (
        SELECT COALESCE(SUM(
            CASE 
                WHEN ht.transaction_type = 'purchase' THEN ht.amount
                WHEN ht.transaction_type = 'deduction' THEN -ht.amount
                WHEN ht.transaction_type = 'refund' THEN ht.amount
                ELSE 0
            END
        ), 0)
        FROM hour_transactions ht 
        WHERE ht.student_id = students.id
    );
END $$;

-- =============================================================================
-- FINAL DATA VALIDATION AND CLEANUP
-- =============================================================================

-- Update class enrollment counts
UPDATE classes 
SET current_enrollment = (
    SELECT COUNT(*) FROM bookings 
    WHERE class_id = classes.id AND status != 'cancelled'
);

-- Update teacher statistics
UPDATE teachers 
SET 
    total_classes_taught = (
        SELECT COUNT(*) FROM classes c
        JOIN bookings b ON c.id = b.class_id
        WHERE c.teacher_id = teachers.id 
        AND c.class_date < CURRENT_DATE
        AND b.attendance_status = 'present'
    ),
    total_hours_taught = (
        SELECT COUNT(*) FROM classes c
        JOIN bookings b ON c.id = b.class_id
        WHERE c.teacher_id = teachers.id 
        AND c.class_date < CURRENT_DATE
        AND b.attendance_status = 'present'
    ),
    rating = (
        SELECT COALESCE(AVG(f.rating), 4.5) FROM feedback f
        WHERE f.teacher_id = teachers.id
    );

-- Create system notifications for testing
INSERT INTO notifications (id, user_id, title, message, type, status, created_at, updated_at)
SELECT 
    'notif-' || generate_random_uuid(),
    s.user_id,
    'Welcome to HeyPeter Academy!',
    'Your account has been set up successfully. Start learning with our expert teachers.',
    'info',
    'unread',
    s.created_at + INTERVAL '1 hour',
    NOW()
FROM students s
WHERE s.enrollment_date >= CURRENT_DATE - INTERVAL '7 days';

-- Insert some leave requests for testing
INSERT INTO leave_requests (id, student_id, start_date, end_date, reason, status, teacher_approval, admin_approval, hours_to_recover, created_at, updated_at)
VALUES 
('leave-001', 'student-001', CURRENT_DATE + INTERVAL '7 days', CURRENT_DATE + INTERVAL '14 days', 'Family vacation', 'pending', null, null, 0, NOW(), NOW()),
('leave-002', 'student-015', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE - INTERVAL '5 days', 'Medical appointment', 'approved', true, true, 2, NOW() - INTERVAL '12 days', NOW()),
('leave-003', 'student-025', CURRENT_DATE + INTERVAL '3 days', CURRENT_DATE + INTERVAL '5 days', 'Business trip', 'pending', null, null, 0, NOW(), NOW());

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

DO $$
DECLARE
    student_count INTEGER;
    teacher_count INTEGER;
    class_count INTEGER;
    booking_count INTEGER;
    feedback_count INTEGER;
    hour_transaction_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO student_count FROM students;
    SELECT COUNT(*) INTO teacher_count FROM teachers;
    SELECT COUNT(*) INTO class_count FROM classes;
    SELECT COUNT(*) INTO booking_count FROM bookings;
    SELECT COUNT(*) INTO feedback_count FROM feedback;
    SELECT COUNT(*) INTO hour_transaction_count FROM hour_transactions;
    
    RAISE NOTICE 'HeyPeter Academy Production Data Seeding Complete!';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Data Summary:';
    RAISE NOTICE '- Students: %', student_count;
    RAISE NOTICE '- Teachers: %', teacher_count;
    RAISE NOTICE '- Classes: %', class_count;
    RAISE NOTICE '- Bookings: %', booking_count;
    RAISE NOTICE '- Feedback Records: %', feedback_count;
    RAISE NOTICE '- Hour Transactions: %', hour_transaction_count;
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Systems Ready for Testing:';
    RAISE NOTICE '✓ AI-powered scheduling system';
    RAISE NOTICE '✓ 1v1 booking system with teacher matching';
    RAISE NOTICE '✓ Email notification system';
    RAISE NOTICE '✓ Hour management and tracking';
    RAISE NOTICE '✓ Student progress analytics';
    RAISE NOTICE '✓ Teacher performance metrics';
    RAISE NOTICE '✓ Class capacity management';
    RAISE NOTICE '✓ Feedback and assessment system';
    RAISE NOTICE '================================================';
END $$;