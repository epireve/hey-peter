-- HeyPeter Academy Production Data Seeding Script (Fixed)
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

-- Insert Teacher Profiles (Fixed to match actual schema)
INSERT INTO teachers (id, user_id, full_name, email, availability, hourly_rate, bio, created_at, updated_at)
VALUES 
('teacher-001', '10000000-0000-0000-0000-000000000001', 'Emily Rodriguez', 'emily.teacher@heypeter.com', 
'{"monday": [{"start": "09:00", "end": "17:00"}], "tuesday": [{"start": "09:00", "end": "17:00"}], "wednesday": [{"start": "09:00", "end": "17:00"}], "thursday": [{"start": "09:00", "end": "17:00"}], "friday": [{"start": "09:00", "end": "17:00"}]}',
35, 'Experienced ESL teacher with expertise in beginner and intermediate courses. Passionate about creating engaging learning environments.', NOW(), NOW()),

('teacher-002', '10000000-0000-0000-0000-000000000002', 'David Thompson', 'david.teacher@heypeter.com',
'{"monday": [{"start": "13:00", "end": "21:00"}], "tuesday": [{"start": "13:00", "end": "21:00"}], "wednesday": [{"start": "13:00", "end": "21:00"}], "thursday": [{"start": "13:00", "end": "21:00"}], "friday": [{"start": "13:00", "end": "21:00"}]}',
30, 'Dynamic teacher specializing in conversation and speaking skills. Expert in intermediate to advanced courses.', NOW(), NOW()),

('teacher-003', '10000000-0000-0000-0000-000000000003', 'Maria Santos', 'maria.teacher@heypeter.com',
'{"monday": [{"start": "08:00", "end": "16:00"}], "tuesday": [{"start": "08:00", "end": "16:00"}], "wednesday": [{"start": "08:00", "end": "16:00"}], "thursday": [{"start": "08:00", "end": "16:00"}], "friday": [{"start": "08:00", "end": "16:00"}]}',
32, 'Patient and encouraging teacher perfect for nervous beginners. Specializes in building confidence in English speaking.', NOW(), NOW()),

('teacher-004', '10000000-0000-0000-0000-000000000004', 'James Wilson', 'james.teacher@heypeter.com',
'{"monday": [{"start": "10:00", "end": "18:00"}], "tuesday": [{"start": "10:00", "end": "18:00"}], "wednesday": [{"start": "10:00", "end": "18:00"}], "thursday": [{"start": "10:00", "end": "18:00"}], "friday": [{"start": "10:00", "end": "18:00"}], "saturday": [{"start": "09:00", "end": "15:00"}]}',
28, 'Energetic teacher who makes learning fun. Great with mixed-level groups and building student engagement.', NOW(), NOW()),

('teacher-005', '10000000-0000-0000-0000-000000000005', 'Robert Clarke', 'robert.business@heypeter.com',
'{"monday": [{"start": "09:00", "end": "17:00"}], "tuesday": [{"start": "09:00", "end": "17:00"}], "wednesday": [{"start": "09:00", "end": "17:00"}], "thursday": [{"start": "09:00", "end": "17:00"}], "friday": [{"start": "09:00", "end": "17:00"}]}',
45, 'Business English specialist with corporate training background. Expert in professional communication and presentations.', NOW(), NOW()),

('teacher-006', '10000000-0000-0000-0000-000000000006', 'Lisa Anderson', 'lisa.business@heypeter.com',
'{"monday": [{"start": "11:00", "end": "19:00"}], "tuesday": [{"start": "11:00", "end": "19:00"}], "wednesday": [{"start": "11:00", "end": "19:00"}], "thursday": [{"start": "11:00", "end": "19:00"}], "friday": [{"start": "11:00", "end": "19:00"}]}',
42, 'Former corporate executive turned English teacher. Specializes in business vocabulary and professional writing skills.', NOW(), NOW()),

('teacher-007', '10000000-0000-0000-0000-000000000007', 'Anna Kim', 'anna.tutor@heypeter.com',
'{"monday": [{"start": "14:00", "end": "22:00"}], "tuesday": [{"start": "14:00", "end": "22:00"}], "wednesday": [{"start": "14:00", "end": "22:00"}], "thursday": [{"start": "14:00", "end": "22:00"}], "friday": [{"start": "14:00", "end": "22:00"}], "saturday": [{"start": "10:00", "end": "18:00"}], "sunday": [{"start": "10:00", "end": "18:00"}]}',
38, 'Dedicated 1-on-1 tutor with personalized learning approach. Expert in identifying and addressing individual learning needs.', NOW(), NOW()),

('teacher-008', '10000000-0000-0000-0000-000000000008', 'Michael Davis', 'michael.tutor@heypeter.com',
'{"monday": [{"start": "16:00", "end": "22:00"}], "tuesday": [{"start": "16:00", "end": "22:00"}], "wednesday": [{"start": "16:00", "end": "22:00"}], "thursday": [{"start": "16:00", "end": "22:00"}], "friday": [{"start": "16:00", "end": "22:00"}], "saturday": [{"start": "09:00", "end": "17:00"}], "sunday": [{"start": "09:00", "end": "17:00"}]}',
40, 'Patient and methodical 1-on-1 instructor. Excellent at helping students overcome specific challenges and achieve targeted goals.', NOW(), NOW()),

('teacher-009', '10000000-0000-0000-0000-000000000009', 'Sophie Brown', 'sophie.parttime@heypeter.com',
'{"tuesday": [{"start": "18:00", "end": "22:00"}], "thursday": [{"start": "18:00", "end": "22:00"}], "saturday": [{"start": "09:00", "end": "17:00"}], "sunday": [{"start": "09:00", "end": "17:00"}]}',
25, 'Part-time teacher and graduate student. Brings fresh energy and modern teaching techniques to beginner classes.', NOW(), NOW()),

('teacher-010', '10000000-0000-0000-0000-000000000010', 'Carlos Rodriguez', 'carlos.weekend@heypeter.com',
'{"friday": [{"start": "17:00", "end": "22:00"}], "saturday": [{"start": "08:00", "end": "18:00"}], "sunday": [{"start": "08:00", "end": "18:00"}]}',
30, 'Weekend specialist perfect for working professionals. Flexible scheduling and understanding of adult learner needs.', NOW(), NOW());

-- Create Course Structure (Fixed to match actual schema)
INSERT INTO courses (id, title, description, course_type, is_online, duration_minutes, max_students, credit_hours, materials_required, created_at, updated_at)
VALUES 
('course-basic', 'Basic English Course', 'Foundation English course for absolute beginners. Covers basic vocabulary, grammar, and simple conversations.', 'Basic', true, 60, 9, 1.0, false, NOW(), NOW()),
('course-everyday-a', 'Everyday English A', 'Elementary level course focusing on daily communication skills and practical English usage.', 'Everyday A', true, 60, 9, 1.0, false, NOW(), NOW()),
('course-everyday-b', 'Everyday English B', 'Intermediate level course building on everyday communication with more complex grammar and vocabulary.', 'Everyday B', true, 60, 9, 1.0, false, NOW(), NOW()),
('course-speak-up', 'Speak Up Course', 'Conversation-focused course designed to improve speaking confidence and fluency.', 'Speak Up', true, 60, 9, 1.0, false, NOW(), NOW()),
('course-business', 'Business English', 'Professional English course covering business communication, presentations, and corporate vocabulary.', 'Business English', true, 60, 6, 1.0, false, NOW(), NOW()),
('course-1on1', '1-on-1 Personal Tutoring', 'Personalized one-on-one sessions tailored to individual learning goals and needs.', '1-on-1', true, 60, 1, 2.0, false, NOW(), NOW());

-- Create Learning Materials (Fixed to match actual schema)
INSERT INTO materials (id, course_id, title, description, material_type, file_url, unit_number, lesson_number, is_required, uploaded_at, updated_at)
VALUES 
-- Basic Course Materials
('material-basic-1', 'course-basic', 'Basic English Workbook Unit 1', 'Introduction to English alphabet and basic pronunciation', 'PDF', 'https://example.com/basic-unit1.pdf', 1, 1, true, NOW(), NOW()),
('material-basic-2', 'course-basic', 'Basic Vocabulary Flash Cards', 'Essential 100 words for beginners', 'PDF', 'https://example.com/basic-vocab.pdf', 1, 2, true, NOW(), NOW()),
('material-basic-3', 'course-basic', 'Basic Grammar Guide', 'Simple present tense and basic sentence structure', 'PDF', 'https://example.com/basic-grammar.pdf', 1, 3, true, NOW(), NOW()),
('material-basic-4', 'course-basic', 'Basic Conversation Audio', 'Listening exercises for beginners', 'Audio', 'https://example.com/basic-audio.mp3', 1, 4, true, NOW(), NOW()),
('material-basic-5', 'course-basic', 'Basic English Video Lessons', 'Introduction to English speaking', 'Video', 'https://example.com/basic-video.mp4', 1, 5, true, NOW(), NOW()),

-- Everyday A Materials
('material-everyday-a-1', 'course-everyday-a', 'Everyday English A Workbook', 'Daily communication scenarios and vocabulary', 'PDF', 'https://example.com/everyday-a-unit1.pdf', 1, 1, true, NOW(), NOW()),
('material-everyday-a-2', 'course-everyday-a', 'Shopping and Dining Vocabulary', 'Essential phrases for daily activities', 'PDF', 'https://example.com/everyday-a-vocab.pdf', 1, 2, true, NOW(), NOW()),
('material-everyday-a-3', 'course-everyday-a', 'Present Tense Mastery', 'Grammar exercises for everyday situations', 'PDF', 'https://example.com/everyday-a-grammar.pdf', 1, 3, true, NOW(), NOW()),
('material-everyday-a-4', 'course-everyday-a', 'Everyday Conversations Audio', 'Real-life dialogue practice', 'Audio', 'https://example.com/everyday-a-audio.mp3', 1, 4, true, NOW(), NOW()),
('material-everyday-a-5', 'course-everyday-a', 'Daily Life Video Scenarios', 'Visual learning for everyday English', 'Video', 'https://example.com/everyday-a-video.mp4', 1, 5, true, NOW(), NOW()),

-- Everyday B Materials
('material-everyday-b-1', 'course-everyday-b', 'Everyday English B Advanced Workbook', 'Complex daily communication and social situations', 'PDF', 'https://example.com/everyday-b-unit1.pdf', 1, 1, true, NOW(), NOW()),
('material-everyday-b-2', 'course-everyday-b', 'Travel and Transportation Guide', 'Vocabulary and phrases for traveling', 'PDF', 'https://example.com/everyday-b-travel.pdf', 1, 2, true, NOW(), NOW()),
('material-everyday-b-3', 'course-everyday-b', 'Intermediate Grammar Workbook', 'Past tense and future tense mastery', 'PDF', 'https://example.com/everyday-b-grammar.pdf', 1, 3, true, NOW(), NOW()),
('material-everyday-b-4', 'course-everyday-b', 'Social Situations Audio', 'Listening comprehension for social contexts', 'Audio', 'https://example.com/everyday-b-audio.mp3', 1, 4, true, NOW(), NOW()),
('material-everyday-b-5', 'course-everyday-b', 'Cultural Communication Videos', 'Understanding cultural contexts in English', 'Video', 'https://example.com/everyday-b-video.mp4', 1, 5, true, NOW(), NOW()),

-- Speak Up Materials
('material-speak-up-1', 'course-speak-up', 'Speak Up Confidence Builder', 'Techniques for overcoming speaking anxiety', 'PDF', 'https://example.com/speak-up-confidence.pdf', 1, 1, true, NOW(), NOW()),
('material-speak-up-2', 'course-speak-up', 'Pronunciation Practice Guide', 'Phonetic exercises and tongue twisters', 'PDF', 'https://example.com/speak-up-pronunciation.pdf', 1, 2, true, NOW(), NOW()),
('material-speak-up-3', 'course-speak-up', 'Debate and Discussion Topics', 'Structured speaking practice scenarios', 'PDF', 'https://example.com/speak-up-debates.pdf', 1, 3, true, NOW(), NOW()),
('material-speak-up-4', 'course-speak-up', 'Fluency Building Audio Exercises', 'Speed and accuracy training', 'Audio', 'https://example.com/speak-up-fluency.mp3', 1, 4, true, NOW(), NOW()),
('material-speak-up-5', 'course-speak-up', 'Public Speaking Video Workshop', 'Advanced presentation skills', 'Video', 'https://example.com/speak-up-public.mp4', 1, 5, true, NOW(), NOW()),

-- Business English Materials
('material-business-1', 'course-business', 'Business English Professional Handbook', 'Corporate communication essentials', 'PDF', 'https://example.com/business-handbook.pdf', 1, 1, true, NOW(), NOW()),
('material-business-2', 'course-business', 'Email Writing Mastery', 'Professional email templates and etiquette', 'PDF', 'https://example.com/business-emails.pdf', 1, 2, true, NOW(), NOW()),
('material-business-3', 'course-business', 'Presentation Skills Guide', 'Creating and delivering business presentations', 'PDF', 'https://example.com/business-presentations.pdf', 1, 3, true, NOW(), NOW()),
('material-business-4', 'course-business', 'Meeting and Conference Audio', 'Real business meeting scenarios', 'Audio', 'https://example.com/business-meetings.mp3', 1, 4, true, NOW(), NOW()),
('material-business-5', 'course-business', 'Corporate Culture Videos', 'Understanding workplace dynamics', 'Video', 'https://example.com/business-culture.mp4', 1, 5, true, NOW(), NOW()),

-- 1-on-1 Materials
('material-1on1-1', 'course-1on1', '1-on-1 Assessment Guide', 'Individual learning needs assessment', 'PDF', 'https://example.com/1on1-assessment.pdf', 1, 1, true, NOW(), NOW()),
('material-1on1-2', 'course-1on1', 'Personalized Learning Plan Template', 'Customizable curriculum framework', 'PDF', 'https://example.com/1on1-plan.pdf', 1, 2, true, NOW(), NOW()),
('material-1on1-3', 'course-1on1', 'Progress Tracking Workbook', 'Individual milestone tracking', 'PDF', 'https://example.com/1on1-progress.pdf', 1, 3, true, NOW(), NOW()),
('material-1on1-4', 'course-1on1', 'Adaptive Learning Audio Resources', 'Flexible listening exercises', 'Audio', 'https://example.com/1on1-adaptive.mp3', 1, 4, true, NOW(), NOW()),
('material-1on1-5', 'course-1on1', 'Personal Goal Setting Videos', 'Motivation and goal achievement strategies', 'Video', 'https://example.com/1on1-goals.mp4', 1, 5, true, NOW(), NOW());

-- =============================================================================
-- PHASE 2: STUDENT DATA AND ENROLLMENTS
-- =============================================================================

-- Create Student Users (50 students with varied profiles)
DO $$ 
DECLARE
    student_names TEXT[] := ARRAY[
        'Alex Anderson', 'Sam Brown', 'Jordan Davis', 'Taylor Wilson', 'Casey Johnson',
        'Morgan Lee', 'Riley Martinez', 'Avery Thompson', 'Quinn Rodriguez', 'Sage Clark',
        'Dakota Lewis', 'Skylar Walker', 'Phoenix Hall', 'River Allen', 'Rowan Young',
        'Emerson King', 'Finley Wright', 'Hayden Lopez', 'Kendall Hill', 'Lennox Scott',
        'Marley Green', 'Oakley Adams', 'Peyton Baker', 'Quincy Nelson', 'Reese Carter',
        'Sloane Mitchell', 'Tatum Perez', 'Vega Roberts', 'Wren Turner', 'Zara Phillips',
        'Blake Campbell', 'Drew Parker', 'Ellis Evans', 'Frankie Edwards', 'Gray Collins',
        'Harley Stewart', 'Jules Sanchez', 'Kai Morris', 'Lane Rogers', 'Max Reed',
        'Nova Cook', 'Orion Bailey', 'Parker Rivera', 'Remy Cooper', 'Sage Richardson',
        'Tate Cox', 'Uma Howard', 'Vale Ward', 'West Torres', 'Yuki Peterson'
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
        'reese.carter@student.example.com', 'sloane.mitchell@student.example.com', 'tatum.perez@student.example.com',
        'vega.roberts@student.example.com', 'wren.turner@student.example.com', 'zara.phillips@student.example.com',
        'blake.campbell@student.example.com', 'drew.parker@student.example.com', 'ellis.evans@student.example.com',
        'frankie.edwards@student.example.com', 'gray.collins@student.example.com', 'harley.stewart@student.example.com',
        'jules.sanchez@student.example.com', 'kai.morris@student.example.com', 'lane.rogers@student.example.com',
        'max.reed@student.example.com', 'nova.cook@student.example.com', 'orion.bailey@student.example.com',
        'parker.rivera@student.example.com', 'remy.cooper@student.example.com', 'sage.richardson@student.example.com',
        'tate.cox@student.example.com', 'uma.howard@student.example.com', 'vale.ward@student.example.com',
        'west.torres@student.example.com', 'yuki.peterson@student.example.com'
    ];
    i INTEGER;
    student_email TEXT;
    student_name TEXT;
    user_uuid UUID;
    student_id TEXT;
    test_level TEXT;
    proficiency_level INTEGER;
    course_type TEXT;
    remaining_hours NUMERIC;
    enrollment_date DATE;
    course_start_date DATE;
    payment_amount NUMERIC;
    gender TEXT;
    genders TEXT[] := ARRAY['Male', 'Female', 'Other'];
    test_levels TEXT[] := ARRAY['Basic', 'Everyday A', 'Everyday B', 'Speak Up', 'Business English', '1-on-1'];
    lead_sources TEXT[] := ARRAY['Google Ads', 'Facebook', 'Instagram', 'Referral', 'Website', 'Walk-in'];
    sales_reps TEXT[] := ARRAY['John Smith', 'Mary Johnson', 'David Wilson', 'Sarah Brown', 'Michael Davis'];
BEGIN
    FOR i IN 1..50 LOOP
        -- Generate student data
        student_name := student_names[i];
        student_email := student_emails[i];
        user_uuid := ('20000000-0000-0000-0000-' || LPAD(i::TEXT, 12, '0'))::UUID;
        student_id := 'STU-' || LPAD(i::TEXT, 4, '0');
        
        -- Distribute students across levels realistically
        IF i <= 15 THEN
            -- Beginners (30%)
            test_level := test_levels[1 + (i % 2)]; -- Basic or Everyday A
            proficiency_level := 1 + (i % 3); -- 1-3
            remaining_hours := 15 + (i % 20); -- 15-35 hours
            payment_amount := 300 + (i % 200); -- $300-500
        ELSIF i <= 40 THEN
            -- Intermediate (50%)
            test_level := test_levels[2 + (i % 2)]; -- Everyday A or Everyday B
            proficiency_level := 3 + (i % 4); -- 3-6
            remaining_hours := 20 + (i % 25); -- 20-45 hours
            payment_amount := 500 + (i % 300); -- $500-800
        ELSE
            -- Advanced (20%)
            test_level := test_levels[4 + (i % 2)]; -- Speak Up or Business English
            proficiency_level := 6 + (i % 4); -- 6-10
            remaining_hours := 25 + (i % 30); -- 25-55 hours
            payment_amount := 700 + (i % 500); -- $700-1200
        END IF;
        
        gender := genders[1 + (i % 3)];
        enrollment_date := CURRENT_DATE - INTERVAL '1 month' * (i % 12);
        course_start_date := enrollment_date + INTERVAL '1 week';
        
        -- Insert auth user
        INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at)
        VALUES (
            user_uuid,
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            student_email,
            crypt('student123', gen_salt('bf')),
            NOW(),
            '',
            NOW(),
            '',
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            '{"name": "' || student_name || '", "role": "student"}',
            false,
            NOW(),
            NOW()
        );
        
        -- Insert student profile (Using actual schema columns)
        INSERT INTO students (
            id, user_id, email, full_name, student_id, internal_code, gender, 
            test_level, english_proficiency_level, enrollment_date, 
            total_course_hours, remaining_hours, materials_purchased, 
            lead_source, sales_representative, payment_date, payment_amount, 
            discount_amount, course_start_date, created_at, updated_at
        )
        VALUES (
            ('student-' || LPAD(i::TEXT, 3, '0'))::UUID,
            user_uuid,
            student_email,
            student_name,
            student_id,
            'INT-' || LPAD(i::TEXT, 4, '0'),
            gender,
            test_level,
            proficiency_level,
            enrollment_date,
            CASE 
                WHEN i <= 15 THEN 40 + (i % 20)  -- Beginners: 40-60 hours
                WHEN i <= 40 THEN 60 + (i % 40)  -- Intermediate: 60-100 hours
                ELSE 80 + (i % 60)               -- Advanced: 80-140 hours
            END,
            remaining_hours,
            (i % 3) = 0, -- Every third student has materials
            lead_sources[1 + (i % 6)],
            sales_reps[1 + (i % 5)],
            enrollment_date,
            payment_amount,
            CASE WHEN i % 5 = 0 THEN 50 ELSE 0 END, -- 20% get discount
            course_start_date,
            NOW(),
            NOW()
        );
        
    END LOOP;
END $$;

-- =============================================================================
-- PHASE 3: CLASSES AND SCHEDULING
-- =============================================================================

-- Create realistic class schedules for the next 4 weeks
DO $$
DECLARE
    class_count INTEGER := 0;
    current_date DATE;
    end_date DATE;
    teacher_ids UUID[] := ARRAY[
        'teacher-001'::UUID, 'teacher-002'::UUID, 'teacher-003'::UUID, 'teacher-004'::UUID, 'teacher-005'::UUID,
        'teacher-006'::UUID, 'teacher-007'::UUID, 'teacher-008'::UUID, 'teacher-009'::UUID, 'teacher-010'::UUID
    ];
    course_ids UUID[] := ARRAY[
        'course-basic'::UUID, 'course-everyday-a'::UUID, 'course-everyday-b'::UUID, 
        'course-speak-up'::UUID, 'course-business'::UUID, 'course-1on1'::UUID
    ];
    time_slots TEXT[] := ARRAY[
        '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
    ];
    teacher_id UUID;
    course_id UUID;
    class_time TEXT;
    class_datetime TIMESTAMP;
    class_id UUID;
    max_students INTEGER;
    current_enrollment INTEGER;
    i INTEGER;
    j INTEGER;
    day_of_week INTEGER;
BEGIN
    current_date := CURRENT_DATE;
    end_date := current_date + INTERVAL '4 weeks';
    
    -- Create classes for each day in the next 4 weeks
    WHILE current_date <= end_date LOOP
        day_of_week := EXTRACT(DOW FROM current_date);
        
        -- Skip Sundays for group classes
        IF day_of_week != 0 THEN
            -- Create 5-8 classes per day
            FOR i IN 1..(5 + (EXTRACT(DOW FROM current_date)::INTEGER % 4)) LOOP
                class_count := class_count + 1;
                
                -- Select teacher and course
                teacher_id := teacher_ids[1 + (class_count % 10)];
                course_id := course_ids[1 + (class_count % 6)];
                class_time := time_slots[1 + (class_count % 11)];
                
                -- Create class datetime
                class_datetime := current_date + (class_time || ':00')::TIME;
                
                -- Skip if in the past
                IF class_datetime > NOW() THEN
                    class_id := gen_random_uuid();
                    
                    -- Determine class capacity
                    IF course_id = 'course-1on1'::UUID THEN
                        max_students := 1;
                        current_enrollment := 1;
                    ELSIF course_id = 'course-business'::UUID THEN
                        max_students := 6;
                        current_enrollment := 2 + (class_count % 5); -- 2-6 students
                    ELSE
                        max_students := 9;
                        current_enrollment := 3 + (class_count % 7); -- 3-9 students
                    END IF;
                    
                    -- Ensure we don't exceed capacity
                    IF current_enrollment > max_students THEN
                        current_enrollment := max_students;
                    END IF;
                    
                    -- Insert class
                    INSERT INTO classes (
                        id, course_id, teacher_id, class_date, start_time, end_time,
                        max_capacity, current_enrollment, status, is_online, meeting_link,
                        created_at, updated_at
                    )
                    VALUES (
                        class_id,
                        course_id,
                        teacher_id,
                        current_date,
                        class_time::TIME,
                        (class_time::TIME + INTERVAL '1 hour')::TIME,
                        max_students,
                        current_enrollment,
                        CASE 
                            WHEN class_datetime > NOW() + INTERVAL '1 day' THEN 'scheduled'
                            WHEN class_datetime > NOW() THEN 'confirmed'
                            ELSE 'completed'
                        END,
                        true,
                        'https://meet.google.com/class-' || LOWER(SUBSTRING(class_id::TEXT, 1, 8)),
                        NOW(),
                        NOW()
                    );
                    
                END IF;
            END LOOP;
        END IF;
        
        current_date := current_date + INTERVAL '1 day';
    END LOOP;
    
    RAISE NOTICE 'Created % classes for 4 weeks', class_count;
END $$;

-- =============================================================================
-- PHASE 4: BOOKINGS AND ATTENDANCE
-- =============================================================================

-- Create realistic booking and attendance data
DO $$
DECLARE
    class_record RECORD;
    student_ids UUID[];
    selected_students UUID[];
    booking_id UUID;
    attendance_status TEXT;
    attendance_statuses TEXT[] := ARRAY['present', 'absent', 'late', 'excused'];
    attendance_weights INTEGER[] := ARRAY[75, 10, 10, 5]; -- 75% present, 10% absent, 10% late, 5% excused
    i INTEGER;
    random_weight INTEGER;
    status_index INTEGER;
    booking_date DATE;
    hour_cost NUMERIC;
BEGIN
    -- Get all student IDs for random selection
    SELECT ARRAY_AGG(id) INTO student_ids FROM students;
    
    -- Create bookings for each class
    FOR class_record IN 
        SELECT id, current_enrollment, course_id, class_date, start_time, teacher_id, max_capacity
        FROM classes 
        WHERE current_enrollment > 0
        ORDER BY class_date, start_time
    LOOP
        -- Select random students for this class
        selected_students := ARRAY[]::UUID[];
        
        FOR i IN 1..class_record.current_enrollment LOOP
            -- Add a random student (allowing duplicates for simplicity)
            selected_students := selected_students || student_ids[1 + (random() * (array_length(student_ids, 1) - 1))::INTEGER];
        END LOOP;
        
        -- Create bookings for selected students
        FOR i IN 1..array_length(selected_students, 1) LOOP
            booking_id := gen_random_uuid();
            booking_date := class_record.class_date - INTERVAL '1 day' * (1 + (random() * 7)::INTEGER);
            
            -- Determine hour cost based on course type
            SELECT credit_hours INTO hour_cost FROM courses WHERE id = class_record.course_id;
            
            -- Generate weighted random attendance status
            random_weight := (random() * 100)::INTEGER;
            IF random_weight < 75 THEN
                attendance_status := 'present';
            ELSIF random_weight < 85 THEN
                attendance_status := 'absent';
            ELSIF random_weight < 95 THEN
                attendance_status := 'late';
            ELSE
                attendance_status := 'excused';
            END IF;
            
            -- Insert booking
            INSERT INTO bookings (
                id, student_id, class_id, booking_date, status, 
                attendance_status, hour_cost, notes, created_at, updated_at
            )
            VALUES (
                booking_id,
                selected_students[i],
                class_record.id,
                booking_date,
                CASE 
                    WHEN class_record.class_date > CURRENT_DATE THEN 'confirmed'
                    ELSE 'completed'
                END,
                CASE 
                    WHEN class_record.class_date > CURRENT_DATE THEN NULL
                    ELSE attendance_status
                END,
                hour_cost,
                CASE 
                    WHEN attendance_status = 'absent' THEN 'Student was absent without notice'
                    WHEN attendance_status = 'late' THEN 'Student arrived 10 minutes late'
                    WHEN attendance_status = 'excused' THEN 'Student had prior family commitment'
                    ELSE NULL
                END,
                booking_date,
                NOW()
            );
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Created bookings for all classes with realistic attendance patterns';
END $$;

-- =============================================================================
-- PHASE 5: FEEDBACK AND ASSESSMENTS
-- =============================================================================

-- Create feedback data for completed classes
DO $$
DECLARE
    booking_record RECORD;
    feedback_id UUID;
    teacher_rating INTEGER;
    student_rating INTEGER;
    ratings INTEGER[] := ARRAY[3, 3, 4, 4, 4, 5, 5, 5, 5, 5]; -- Weighted toward positive
    feedback_texts TEXT[] := ARRAY[
        'Great class! Very engaging and helpful.',
        'Teacher was patient and explained concepts clearly.',
        'Excellent lesson structure and materials.',
        'Would recommend this teacher to others.',
        'Class was well-organized and interactive.',
        'Good pace and covered a lot of material.',
        'Teacher provided useful feedback.',
        'Enjoyed the conversational practice.',
        'Class helped improve my confidence.',
        'Looking forward to the next session.'
    ];
    teacher_feedback_texts TEXT[] := ARRAY[
        'Student showed great progress and engagement.',
        'Active participation throughout the class.',
        'Good understanding of the material covered.',
        'Student asked thoughtful questions.',
        'Excellent homework completion.',
        'Shows strong motivation to learn.',
        'Needs more practice with pronunciation.',
        'Great improvement in speaking confidence.',
        'Student is well-prepared for next level.',
        'Demonstrates good listening skills.'
    ];
BEGIN
    -- Create feedback for 80% of completed bookings
    FOR booking_record IN 
        SELECT b.id, b.student_id, b.class_id, c.teacher_id, b.booking_date
        FROM bookings b
        JOIN classes c ON b.class_id = c.id
        WHERE b.status = 'completed' 
        AND b.attendance_status = 'present'
        AND random() < 0.8  -- 80% feedback completion rate
        ORDER BY b.booking_date DESC
    LOOP
        feedback_id := gen_random_uuid();
        teacher_rating := ratings[1 + (random() * (array_length(ratings, 1) - 1))::INTEGER];
        student_rating := ratings[1 + (random() * (array_length(ratings, 1) - 1))::INTEGER];
        
        INSERT INTO feedback (
            id, student_id, teacher_id, class_id, booking_id,
            teacher_rating, student_rating, teacher_feedback, student_feedback,
            submitted_at, created_at, updated_at
        )
        VALUES (
            feedback_id,
            booking_record.student_id,
            booking_record.teacher_id,
            booking_record.class_id,
            booking_record.id,
            teacher_rating,
            student_rating,
            teacher_feedback_texts[1 + (random() * (array_length(teacher_feedback_texts, 1) - 1))::INTEGER],
            feedback_texts[1 + (random() * (array_length(feedback_texts, 1) - 1))::INTEGER],
            booking_record.booking_date + INTERVAL '1 hour',
            NOW(),
            NOW()
        );
    END LOOP;
    
    RAISE NOTICE 'Created feedback records for 80% of completed classes';
END $$;

-- =============================================================================
-- PHASE 6: FINAL DATA SUMMARY
-- =============================================================================

-- Display comprehensive data summary
DO $$
DECLARE
    student_count INTEGER;
    teacher_count INTEGER;
    course_count INTEGER;
    material_count INTEGER;
    class_count INTEGER;
    booking_count INTEGER;
    feedback_count INTEGER;
    total_hours NUMERIC;
    avg_rating NUMERIC;
BEGIN
    SELECT COUNT(*) INTO student_count FROM students;
    SELECT COUNT(*) INTO teacher_count FROM teachers;
    SELECT COUNT(*) INTO course_count FROM courses;
    SELECT COUNT(*) INTO material_count FROM materials;
    SELECT COUNT(*) INTO class_count FROM classes;
    SELECT COUNT(*) INTO booking_count FROM bookings;
    SELECT COUNT(*) INTO feedback_count FROM feedback;
    SELECT SUM(remaining_hours) INTO total_hours FROM students;
    SELECT AVG(teacher_rating) INTO avg_rating FROM feedback;
    
    RAISE NOTICE '=== HEYPETER ACADEMY DATA SEEDING COMPLETE ===';
    RAISE NOTICE 'Students created: %', student_count;
    RAISE NOTICE 'Teachers created: %', teacher_count;
    RAISE NOTICE 'Courses created: %', course_count;
    RAISE NOTICE 'Materials created: %', material_count;
    RAISE NOTICE 'Classes scheduled: %', class_count;
    RAISE NOTICE 'Bookings created: %', booking_count;
    RAISE NOTICE 'Feedback records: %', feedback_count;
    RAISE NOTICE 'Total student hours: %', total_hours;
    RAISE NOTICE 'Average teacher rating: %', ROUND(avg_rating, 2);
    RAISE NOTICE '=== PRODUCTION DATA READY FOR TESTING ===';
END $$;