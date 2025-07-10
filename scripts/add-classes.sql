-- Add classes and bookings to complete the seeding

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
    SELECT ARRAY_AGG(id) INTO teacher_ids FROM teachers;
    SELECT ARRAY_AGG(id) INTO course_ids FROM courses;
    
    start_date := CURRENT_DATE;
    end_date := start_date + INTERVAL '2 weeks';
    date_iter := start_date;
    
    -- Create classes for each weekday
    WHILE date_iter <= end_date LOOP
        day_of_week := EXTRACT(DOW FROM date_iter);
        
        -- Skip Sundays
        IF day_of_week <> 0 THEN
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

-- Final summary
DO $$
DECLARE
    class_count INTEGER;
    booking_count INTEGER;
    feedback_count INTEGER;
    avg_rating NUMERIC;
BEGIN
    SELECT COUNT(*) INTO class_count FROM classes;
    SELECT COUNT(*) INTO booking_count FROM bookings;
    SELECT COUNT(*) INTO feedback_count FROM feedback;
    SELECT AVG(rating) INTO avg_rating FROM feedback;
    
    RAISE NOTICE '=== SEEDING UPDATE COMPLETE ===';
    RAISE NOTICE 'Classes scheduled: %', class_count;
    RAISE NOTICE 'Bookings created: %', booking_count;
    RAISE NOTICE 'Feedback records: %', feedback_count;
    RAISE NOTICE 'Average rating: %', COALESCE(ROUND(avg_rating, 2), 0);
END $$;