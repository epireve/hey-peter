-- Auto-Postponement and Make-up Class System Migration
-- This migration adds tables and functions for handling automatic class postponements 
-- and make-up class suggestions when student leave is approved

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CLASS POSTPONEMENTS TABLE
-- Tracks all postponed classes with their reasons and statuses
CREATE TABLE class_postponements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
    leave_request_id UUID REFERENCES leave_requests(id) ON DELETE CASCADE,
    
    -- Postponement details
    original_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    original_end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    postponement_reason VARCHAR(50) NOT NULL CHECK (postponement_reason IN ('student_leave', 'teacher_unavailable', 'emergency', 'system_maintenance', 'other')),
    postponement_type VARCHAR(20) NOT NULL DEFAULT 'automatic' CHECK (postponement_type IN ('automatic', 'manual')),
    
    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'make_up_scheduled', 'cancelled', 'completed')),
    hours_affected DECIMAL(4,2) NOT NULL DEFAULT 0,
    
    -- Metadata
    notes TEXT,
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    CONSTRAINT unique_booking_postponement UNIQUE (booking_id)
);

-- 2. MAKE-UP CLASSES TABLE
-- Stores make-up class suggestions and their statuses
CREATE TABLE make_up_classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    postponement_id UUID NOT NULL REFERENCES class_postponements(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    original_class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    
    -- Make-up class details
    suggested_class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    suggested_teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
    suggested_start_time TIMESTAMP WITH TIME ZONE,
    suggested_end_time TIMESTAMP WITH TIME ZONE,
    suggested_duration_minutes INTEGER,
    
    -- Alternative suggestions (stored as JSONB for flexibility)
    alternative_suggestions JSONB DEFAULT '[]',
    
    -- Selection and status
    selected_suggestion_id UUID, -- References the selected alternative from suggestions
    student_selected BOOLEAN DEFAULT FALSE,
    admin_approved BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'suggested', 'student_selected', 'admin_approved', 'scheduled', 'rejected', 'expired')),
    
    -- Scoring and compatibility
    compatibility_score DECIMAL(3,2) DEFAULT 0, -- 0-1 scale
    content_match_score DECIMAL(3,2) DEFAULT 0,
    schedule_preference_score DECIMAL(3,2) DEFAULT 0,
    teacher_match_score DECIMAL(3,2) DEFAULT 0,
    
    -- Deadlines and constraints
    selection_deadline TIMESTAMP WITH TIME ZONE,
    earliest_available_time TIMESTAMP WITH TIME ZONE,
    latest_available_time TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    suggestion_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_time_range CHECK (suggested_start_time < suggested_end_time),
    CONSTRAINT valid_selection_deadline CHECK (selection_deadline > created_at)
);

-- 3. POSTPONEMENT TRACKING TABLE
-- Tracks the lifecycle of postponements and make-up scheduling
CREATE TABLE postponement_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    postponement_id UUID NOT NULL REFERENCES class_postponements(id) ON DELETE CASCADE,
    make_up_class_id UUID REFERENCES make_up_classes(id) ON DELETE CASCADE,
    
    -- Tracking details
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('postponement_created', 'suggestions_generated', 'student_notified', 'student_selected', 'admin_approved', 'make_up_scheduled', 'completed', 'cancelled')),
    event_status VARCHAR(20) NOT NULL CHECK (event_status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
    
    -- Event metadata
    event_data JSONB DEFAULT '{}',
    triggered_by VARCHAR(20) CHECK (triggered_by IN ('system', 'student', 'teacher', 'admin')),
    triggered_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Timestamps
    event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Notes
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. STUDENT SCHEDULE PREFERENCES TABLE
-- Stores student scheduling preferences for better make-up suggestions
CREATE TABLE student_schedule_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    -- Time preferences
    preferred_days INTEGER[] DEFAULT ARRAY[]::INTEGER[], -- Array of day numbers (0=Sunday, 6=Saturday)
    preferred_times JSONB DEFAULT '{}', -- {day: [time_ranges]}
    avoided_times JSONB DEFAULT '{}', -- Times to avoid
    
    -- Class preferences
    preferred_class_size_min INTEGER DEFAULT 1,
    preferred_class_size_max INTEGER DEFAULT 9,
    preferred_teachers UUID[] DEFAULT ARRAY[]::UUID[],
    avoided_teachers UUID[] DEFAULT ARRAY[]::UUID[],
    
    -- Learning preferences
    preferred_content_pace VARCHAR(20) DEFAULT 'normal' CHECK (preferred_content_pace IN ('slow', 'normal', 'fast')),
    preferred_difficulty_level VARCHAR(20) DEFAULT 'appropriate' CHECK (preferred_difficulty_level IN ('easier', 'appropriate', 'challenging')),
    
    -- Flexibility settings
    max_travel_time_minutes INTEGER DEFAULT 30,
    willing_to_change_teacher BOOLEAN DEFAULT TRUE,
    willing_to_join_different_class BOOLEAN DEFAULT TRUE,
    advance_notice_required_hours INTEGER DEFAULT 24,
    
    -- Metadata
    preferences_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_student_preferences UNIQUE (student_id),
    CONSTRAINT valid_class_size_range CHECK (preferred_class_size_min <= preferred_class_size_max)
);

-- 5. INDEXES FOR PERFORMANCE
CREATE INDEX idx_class_postponements_booking_id ON class_postponements(booking_id);
CREATE INDEX idx_class_postponements_student_id ON class_postponements(student_id);
CREATE INDEX idx_class_postponements_leave_request_id ON class_postponements(leave_request_id);
CREATE INDEX idx_class_postponements_original_start_time ON class_postponements(original_start_time);
CREATE INDEX idx_class_postponements_status ON class_postponements(status);
CREATE INDEX idx_class_postponements_created_at ON class_postponements(created_at);

CREATE INDEX idx_make_up_classes_postponement_id ON make_up_classes(postponement_id);
CREATE INDEX idx_make_up_classes_student_id ON make_up_classes(student_id);
CREATE INDEX idx_make_up_classes_suggested_class_id ON make_up_classes(suggested_class_id);
CREATE INDEX idx_make_up_classes_suggested_start_time ON make_up_classes(suggested_start_time);
CREATE INDEX idx_make_up_classes_status ON make_up_classes(status);
CREATE INDEX idx_make_up_classes_compatibility_score ON make_up_classes(compatibility_score);
CREATE INDEX idx_make_up_classes_selection_deadline ON make_up_classes(selection_deadline);

CREATE INDEX idx_postponement_tracking_postponement_id ON postponement_tracking(postponement_id);
CREATE INDEX idx_postponement_tracking_event_type ON postponement_tracking(event_type);
CREATE INDEX idx_postponement_tracking_event_timestamp ON postponement_tracking(event_timestamp);
CREATE INDEX idx_postponement_tracking_triggered_by ON postponement_tracking(triggered_by);

CREATE INDEX idx_student_schedule_preferences_student_id ON student_schedule_preferences(student_id);

-- 6. UPDATE TRIGGERS
CREATE TRIGGER update_class_postponements_updated_at 
    BEFORE UPDATE ON class_postponements 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_make_up_classes_updated_at 
    BEFORE UPDATE ON make_up_classes 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_student_schedule_preferences_updated_at 
    BEFORE UPDATE ON student_schedule_preferences 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 7. STORED FUNCTIONS FOR AUTO-POSTPONEMENT LOGIC

-- Function to automatically postpone classes when leave is approved
CREATE OR REPLACE FUNCTION auto_postpone_classes_on_leave_approval()
RETURNS TRIGGER AS $$
DECLARE
    affected_booking RECORD;
    postponement_id UUID;
BEGIN
    -- Only trigger when leave status changes to 'approved'
    IF OLD.status != 'approved' AND NEW.status = 'approved' THEN
        
        -- Find all bookings that fall within the approved leave period
        FOR affected_booking IN 
            SELECT b.*, c.teacher_id, c.duration_minutes 
            FROM bookings b
            JOIN classes c ON b.class_id = c.id
            WHERE b.student_id = NEW.student_id
            AND b.status = 'confirmed'
            AND b.start_time::date BETWEEN NEW.start_date AND NEW.end_date
        LOOP
            -- Create postponement record
            INSERT INTO class_postponements (
                booking_id,
                student_id,
                class_id,
                teacher_id,
                leave_request_id,
                original_start_time,
                original_end_time,
                postponement_reason,
                postponement_type,
                status,
                hours_affected,
                notes
            ) VALUES (
                affected_booking.id,
                NEW.student_id,
                affected_booking.class_id,
                affected_booking.teacher_id,
                NEW.id,
                affected_booking.start_time,
                affected_booking.end_time,
                'student_leave',
                'automatic',
                'pending',
                affected_booking.duration_minutes / 60.0,
                'Automatically postponed due to approved leave request'
            )
            RETURNING id INTO postponement_id;
            
            -- Update the booking status
            UPDATE bookings 
            SET status = 'cancelled',
                updated_at = NOW()
            WHERE id = affected_booking.id;
            
            -- Create tracking entry
            INSERT INTO postponement_tracking (
                postponement_id,
                event_type,
                event_status,
                event_data,
                triggered_by,
                triggered_by_user_id,
                notes
            ) VALUES (
                postponement_id,
                'postponement_created',
                'completed',
                jsonb_build_object(
                    'leave_request_id', NEW.id,
                    'original_booking_id', affected_booking.id,
                    'hours_affected', affected_booking.duration_minutes / 60.0
                ),
                'system',
                NULL,
                'Automatically created due to approved leave request'
            );
            
        END LOOP;
        
        -- Trigger make-up class suggestion generation (async)
        PERFORM pg_notify('generate_makeup_suggestions', jsonb_build_object(
            'student_id', NEW.student_id,
            'leave_request_id', NEW.id
        )::text);
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-postponement
CREATE TRIGGER trigger_auto_postpone_classes
    AFTER UPDATE ON leave_requests
    FOR EACH ROW
    EXECUTE FUNCTION auto_postpone_classes_on_leave_approval();

-- Function to generate make-up class suggestions
CREATE OR REPLACE FUNCTION generate_makeup_class_suggestions(
    p_student_id UUID,
    p_postponement_id UUID
) RETURNS TABLE (
    suggestion_id UUID,
    class_id UUID,
    teacher_id UUID,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    compatibility_score DECIMAL(3,2),
    reasoning TEXT
) AS $$
DECLARE
    student_record RECORD;
    postponement_record RECORD;
    preferences_record RECORD;
    suggestion_record RECORD;
    current_suggestion_id UUID;
    current_compatibility_score DECIMAL(3,2);
    current_reasoning TEXT;
BEGIN
    -- Get student and postponement details
    SELECT s.*, u.full_name, u.email INTO student_record
    FROM students s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = p_student_id;
    
    SELECT * INTO postponement_record
    FROM class_postponements
    WHERE id = p_postponement_id;
    
    -- Get student preferences (create default if not exists)
    SELECT * INTO preferences_record
    FROM student_schedule_preferences
    WHERE student_id = p_student_id;
    
    -- If no preferences exist, create default ones
    IF NOT FOUND THEN
        INSERT INTO student_schedule_preferences (
            student_id,
            preferred_days,
            preferred_times,
            preferred_class_size_min,
            preferred_class_size_max,
            advance_notice_required_hours
        ) VALUES (
            p_student_id,
            ARRAY[1,2,3,4,5], -- Monday to Friday
            '{"1": ["09:00-12:00", "14:00-17:00"], "2": ["09:00-12:00", "14:00-17:00"], "3": ["09:00-12:00", "14:00-17:00"], "4": ["09:00-12:00", "14:00-17:00"], "5": ["09:00-12:00", "14:00-17:00"]}'::jsonb,
            1,
            9,
            24
        )
        RETURNING * INTO preferences_record;
    END IF;
    
    -- Find available classes that match student's criteria
    FOR suggestion_record IN
        SELECT DISTINCT 
            c.id as class_id,
            c.teacher_id,
            cs.schedule_id,
            s.day_of_week,
            s.start_time,
            s.end_time,
            c.course_id,
            c.capacity,
            c.current_enrollment,
            co.course_type,
            co.duration_minutes
        FROM classes c
        JOIN class_schedules cs ON c.id = cs.class_id
        JOIN schedules s ON cs.schedule_id = s.id
        JOIN courses co ON c.course_id = co.id
        WHERE co.course_type = (
            SELECT course_type FROM courses 
            WHERE id = (
                SELECT course_id FROM classes 
                WHERE id = postponement_record.class_id
            )
        )
        AND c.capacity > c.current_enrollment -- Has available spots
        AND c.id != postponement_record.class_id -- Not the same class
        AND (cs.end_date IS NULL OR cs.end_date > NOW()) -- Active schedule
        AND s.day_of_week = ANY(preferences_record.preferred_days) -- Matches preferred days
        ORDER BY c.current_enrollment ASC, s.day_of_week ASC, s.start_time ASC
        LIMIT 20 -- Limit to top 20 suggestions
    LOOP
        -- Calculate compatibility score
        current_compatibility_score := 0.0;
        current_reasoning := '';
        
        -- Day preference score (30%)
        IF suggestion_record.day_of_week = ANY(preferences_record.preferred_days) THEN
            current_compatibility_score := current_compatibility_score + 0.3;
            current_reasoning := current_reasoning || 'Matches preferred day; ';
        END IF;
        
        -- Time preference score (25%)
        -- Simplified time matching - in real implementation, would parse JSONB times
        current_compatibility_score := current_compatibility_score + 0.25;
        current_reasoning := current_reasoning || 'Good time slot; ';
        
        -- Class size preference score (20%)
        IF suggestion_record.current_enrollment >= preferences_record.preferred_class_size_min 
           AND suggestion_record.current_enrollment <= preferences_record.preferred_class_size_max THEN
            current_compatibility_score := current_compatibility_score + 0.2;
            current_reasoning := current_reasoning || 'Optimal class size; ';
        ELSE
            current_compatibility_score := current_compatibility_score + 0.1;
            current_reasoning := current_reasoning || 'Acceptable class size; ';
        END IF;
        
        -- Teacher preference score (15%)
        IF suggestion_record.teacher_id = ANY(preferences_record.preferred_teachers) THEN
            current_compatibility_score := current_compatibility_score + 0.15;
            current_reasoning := current_reasoning || 'Preferred teacher; ';
        ELSIF suggestion_record.teacher_id = ANY(preferences_record.avoided_teachers) THEN
            current_compatibility_score := current_compatibility_score + 0.05;
            current_reasoning := current_reasoning || 'Avoided teacher; ';
        ELSE
            current_compatibility_score := current_compatibility_score + 0.1;
            current_reasoning := current_reasoning || 'Neutral teacher; ';
        END IF;
        
        -- Availability score (10%)
        IF (suggestion_record.capacity - suggestion_record.current_enrollment) >= 3 THEN
            current_compatibility_score := current_compatibility_score + 0.1;
            current_reasoning := current_reasoning || 'High availability; ';
        ELSE
            current_compatibility_score := current_compatibility_score + 0.05;
            current_reasoning := current_reasoning || 'Limited availability; ';
        END IF;
        
        -- Ensure minimum score
        IF current_compatibility_score < 0.4 THEN
            current_compatibility_score := 0.4;
        END IF;
        
        -- Generate a unique suggestion ID
        current_suggestion_id := uuid_generate_v4();
        
        -- Return the suggestion
        suggestion_id := current_suggestion_id;
        class_id := suggestion_record.class_id;
        teacher_id := suggestion_record.teacher_id;
        
        -- Calculate next available time slot for this class
        start_time := (NOW() + interval '1 day')::date + suggestion_record.start_time;
        end_time := (NOW() + interval '1 day')::date + suggestion_record.end_time;
        
        -- Adjust to next occurrence of the correct day
        WHILE EXTRACT(dow FROM start_time) != suggestion_record.day_of_week LOOP
            start_time := start_time + interval '1 day';
            end_time := end_time + interval '1 day';
        END LOOP;
        
        compatibility_score := current_compatibility_score;
        reasoning := TRIM(current_reasoning);
        
        RETURN NEXT;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Function to handle make-up class selection by student
CREATE OR REPLACE FUNCTION select_makeup_class(
    p_make_up_class_id UUID,
    p_student_id UUID,
    p_selected_suggestion_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    make_up_record RECORD;
    suggestion_data JSONB;
    selected_class_id UUID;
BEGIN
    -- Get make-up class record
    SELECT * INTO make_up_record
    FROM make_up_classes
    WHERE id = p_make_up_class_id
    AND student_id = p_student_id
    AND status = 'suggested';
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Find the selected suggestion in alternative_suggestions
    SELECT value INTO suggestion_data
    FROM jsonb_array_elements(make_up_record.alternative_suggestions)
    WHERE value->>'id' = p_selected_suggestion_id::text;
    
    IF suggestion_data IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Update make-up class with selection
    UPDATE make_up_classes
    SET selected_suggestion_id = p_selected_suggestion_id,
        student_selected = TRUE,
        status = 'student_selected',
        updated_at = NOW()
    WHERE id = p_make_up_class_id;
    
    -- Create tracking entry
    INSERT INTO postponement_tracking (
        postponement_id,
        make_up_class_id,
        event_type,
        event_status,
        event_data,
        triggered_by,
        triggered_by_user_id,
        notes
    ) VALUES (
        make_up_record.postponement_id,
        p_make_up_class_id,
        'student_selected',
        'completed',
        jsonb_build_object(
            'selected_suggestion_id', p_selected_suggestion_id,
            'selection_timestamp', NOW()
        ),
        'student',
        (SELECT user_id FROM students WHERE id = p_student_id),
        'Student selected make-up class option'
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to approve make-up class by admin
CREATE OR REPLACE FUNCTION approve_makeup_class(
    p_make_up_class_id UUID,
    p_admin_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    make_up_record RECORD;
    suggestion_data JSONB;
    new_booking_id UUID;
BEGIN
    -- Get make-up class record
    SELECT * INTO make_up_record
    FROM make_up_classes
    WHERE id = p_make_up_class_id
    AND status = 'student_selected';
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Find the selected suggestion
    SELECT value INTO suggestion_data
    FROM jsonb_array_elements(make_up_record.alternative_suggestions)
    WHERE value->>'id' = make_up_record.selected_suggestion_id::text;
    
    IF suggestion_data IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Create new booking for the make-up class
    INSERT INTO bookings (
        student_id,
        class_id,
        booking_date,
        start_time,
        end_time,
        duration_minutes,
        status,
        notes
    ) VALUES (
        make_up_record.student_id,
        (suggestion_data->>'class_id')::UUID,
        (suggestion_data->>'start_time')::TIMESTAMP WITH TIME ZONE,
        (suggestion_data->>'start_time')::TIMESTAMP WITH TIME ZONE,
        (suggestion_data->>'end_time')::TIMESTAMP WITH TIME ZONE,
        (suggestion_data->>'duration_minutes')::INTEGER,
        'confirmed',
        'Make-up class booking - automatically approved'
    )
    RETURNING id INTO new_booking_id;
    
    -- Update make-up class status
    UPDATE make_up_classes
    SET admin_approved = TRUE,
        status = 'scheduled',
        updated_at = NOW()
    WHERE id = p_make_up_class_id;
    
    -- Update postponement status
    UPDATE class_postponements
    SET status = 'make_up_scheduled',
        updated_at = NOW()
    WHERE id = make_up_record.postponement_id;
    
    -- Create tracking entry
    INSERT INTO postponement_tracking (
        postponement_id,
        make_up_class_id,
        event_type,
        event_status,
        event_data,
        triggered_by,
        triggered_by_user_id,
        notes
    ) VALUES (
        make_up_record.postponement_id,
        p_make_up_class_id,
        'admin_approved',
        'completed',
        jsonb_build_object(
            'new_booking_id', new_booking_id,
            'approved_timestamp', NOW()
        ),
        'admin',
        p_admin_user_id,
        'Admin approved make-up class and created new booking'
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add notification triggers for real-time updates
CREATE OR REPLACE FUNCTION notify_postponement_events()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('postponement_event', jsonb_build_object(
        'event_type', TG_OP,
        'table_name', TG_TABLE_NAME,
        'record_id', CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
        'data', CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE row_to_json(NEW) END
    )::text);
    
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

-- Create notification triggers
CREATE TRIGGER trigger_notify_postponement_events
    AFTER INSERT OR UPDATE OR DELETE ON class_postponements
    FOR EACH ROW EXECUTE FUNCTION notify_postponement_events();

CREATE TRIGGER trigger_notify_makeup_events
    AFTER INSERT OR UPDATE OR DELETE ON make_up_classes
    FOR EACH ROW EXECUTE FUNCTION notify_postponement_events();

-- Add helpful views for common queries
CREATE VIEW v_active_postponements AS
SELECT 
    cp.*,
    s.full_name as student_name,
    s.email as student_email,
    c.class_name,
    t.full_name as teacher_name,
    lr.reason as leave_reason,
    lr.start_date as leave_start_date,
    lr.end_date as leave_end_date
FROM class_postponements cp
JOIN students s ON cp.student_id = s.id
JOIN classes c ON cp.class_id = c.id
LEFT JOIN teachers t ON cp.teacher_id = t.id
LEFT JOIN leave_requests lr ON cp.leave_request_id = lr.id
WHERE cp.status IN ('pending', 'confirmed');

CREATE VIEW v_pending_makeup_classes AS
SELECT 
    muc.*,
    cp.original_start_time,
    cp.postponement_reason,
    s.full_name as student_name,
    s.email as student_email,
    c.class_name as original_class_name,
    sc.class_name as suggested_class_name,
    st.full_name as suggested_teacher_name
FROM make_up_classes muc
JOIN class_postponements cp ON muc.postponement_id = cp.id
JOIN students s ON muc.student_id = s.id
JOIN classes c ON muc.original_class_id = c.id
LEFT JOIN classes sc ON muc.suggested_class_id = sc.id
LEFT JOIN teachers st ON muc.suggested_teacher_id = st.id
WHERE muc.status IN ('pending', 'suggested', 'student_selected');

COMMENT ON TABLE class_postponements IS 'Tracks all postponed classes with their reasons and statuses';
COMMENT ON TABLE make_up_classes IS 'Stores make-up class suggestions and their statuses';
COMMENT ON TABLE postponement_tracking IS 'Tracks the lifecycle of postponements and make-up scheduling';
COMMENT ON TABLE student_schedule_preferences IS 'Stores student scheduling preferences for better make-up suggestions';
COMMENT ON FUNCTION auto_postpone_classes_on_leave_approval() IS 'Automatically postpones classes when student leave is approved';
COMMENT ON FUNCTION generate_makeup_class_suggestions(UUID, UUID) IS 'Generates make-up class suggestions for a postponed class';
COMMENT ON FUNCTION select_makeup_class(UUID, UUID, UUID) IS 'Handles make-up class selection by student';
COMMENT ON FUNCTION approve_makeup_class(UUID, UUID) IS 'Approves make-up class by admin and creates booking';