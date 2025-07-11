-- Feedback and Rating System Migration
-- This migration creates a comprehensive feedback and rating system

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Enhanced Feedback Tables

-- Drop existing basic feedback table and recreate with enhanced structure
DROP TABLE IF EXISTS feedback CASCADE;

-- Student feedback for classes and teachers
CREATE TABLE student_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    
    -- Rating categories (1-5 scale)
    overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
    teaching_quality_rating INTEGER CHECK (teaching_quality_rating >= 1 AND teaching_quality_rating <= 5),
    class_content_rating INTEGER CHECK (class_content_rating >= 1 AND class_content_rating <= 5),
    engagement_rating INTEGER CHECK (engagement_rating >= 1 AND engagement_rating <= 5),
    punctuality_rating INTEGER CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
    
    -- Textual feedback
    positive_feedback TEXT,
    improvement_suggestions TEXT,
    learning_objectives_met BOOLEAN,
    would_recommend BOOLEAN,
    
    -- Metadata
    feedback_type VARCHAR(50) DEFAULT 'class_feedback' CHECK (feedback_type IN ('class_feedback', 'teacher_feedback', 'course_feedback')),
    is_anonymous BOOLEAN DEFAULT FALSE,
    submission_method VARCHAR(50) DEFAULT 'manual' CHECK (submission_method IN ('manual', 'automated', 'prompted')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teacher feedback for students
CREATE TABLE teacher_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    
    -- Performance ratings (1-5 scale)
    participation_rating INTEGER CHECK (participation_rating >= 1 AND participation_rating <= 5),
    comprehension_rating INTEGER CHECK (comprehension_rating >= 1 AND comprehension_rating <= 5),
    pronunciation_rating INTEGER CHECK (pronunciation_rating >= 1 AND pronunciation_rating <= 5),
    homework_completion_rating INTEGER CHECK (homework_completion_rating >= 1 AND homework_completion_rating <= 5),
    progress_rating INTEGER CHECK (progress_rating >= 1 AND progress_rating <= 5),
    
    -- Detailed feedback
    strengths TEXT,
    areas_for_improvement TEXT,
    lesson_notes TEXT,
    homework_assigned TEXT,
    next_lesson_goals TEXT,
    
    -- Progress tracking
    unit_completed INTEGER,
    lesson_completed INTEGER,
    lesson_objectives_met BOOLEAN DEFAULT FALSE,
    attendance_quality VARCHAR(20) CHECK (attendance_quality IN ('excellent', 'good', 'fair', 'poor')),
    
    -- Recommendations
    recommended_study_hours DECIMAL(4,2),
    recommended_next_level VARCHAR(50),
    needs_additional_support BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Course and program feedback
CREATE TABLE course_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    
    -- Course ratings
    course_structure_rating INTEGER CHECK (course_structure_rating >= 1 AND course_structure_rating <= 5),
    material_quality_rating INTEGER CHECK (material_quality_rating >= 1 AND material_quality_rating <= 5),
    difficulty_level_rating INTEGER CHECK (difficulty_level_rating >= 1 AND difficulty_level_rating <= 5),
    pace_rating INTEGER CHECK (pace_rating >= 1 AND pace_rating <= 5),
    overall_satisfaction INTEGER CHECK (overall_satisfaction >= 1 AND overall_satisfaction <= 5),
    
    -- Detailed feedback
    most_helpful_aspects TEXT,
    least_helpful_aspects TEXT,
    suggested_improvements TEXT,
    additional_topics_wanted TEXT,
    
    -- Course completion data
    completion_percentage DECIMAL(5,2),
    completion_date DATE,
    would_retake_course BOOLEAN,
    would_recommend_course BOOLEAN,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feedback responses and follow-ups
CREATE TABLE feedback_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_feedback_id UUID NOT NULL,
    original_feedback_type VARCHAR(50) NOT NULL CHECK (original_feedback_type IN ('student_feedback', 'teacher_feedback', 'course_feedback')),
    responder_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    responder_role VARCHAR(50) NOT NULL,
    
    response_text TEXT NOT NULL,
    action_taken TEXT,
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Rating Analytics Tables

-- Aggregated ratings for teachers
CREATE TABLE teacher_rating_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    
    -- Monthly analytics
    analysis_month DATE NOT NULL,
    total_feedback_count INTEGER DEFAULT 0,
    
    -- Average ratings
    avg_overall_rating DECIMAL(3,2),
    avg_teaching_quality DECIMAL(3,2),
    avg_class_content DECIMAL(3,2),
    avg_engagement DECIMAL(3,2),
    avg_punctuality DECIMAL(3,2),
    
    -- Student performance metrics from teacher feedback
    avg_student_participation DECIMAL(3,2),
    avg_student_comprehension DECIMAL(3,2),
    avg_student_progress DECIMAL(3,2),
    
    -- Trend analysis
    rating_trend VARCHAR(20) CHECK (rating_trend IN ('improving', 'stable', 'declining')),
    previous_month_avg DECIMAL(3,2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(teacher_id, analysis_month)
);

-- Aggregated ratings for courses
CREATE TABLE course_rating_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    
    -- Monthly analytics
    analysis_month DATE NOT NULL,
    total_feedback_count INTEGER DEFAULT 0,
    completion_rate DECIMAL(5,2),
    
    -- Average ratings
    avg_course_structure DECIMAL(3,2),
    avg_material_quality DECIMAL(3,2),
    avg_difficulty_level DECIMAL(3,2),
    avg_pace DECIMAL(3,2),
    avg_overall_satisfaction DECIMAL(3,2),
    
    -- Recommendation metrics
    recommendation_rate DECIMAL(5,2), -- Percentage who would recommend
    retake_rate DECIMAL(5,2), -- Percentage who would retake
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(course_id, analysis_month)
);

-- Student progress analytics
CREATE TABLE student_performance_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    -- Monthly analytics
    analysis_month DATE NOT NULL,
    
    -- Average ratings received from teachers
    avg_participation DECIMAL(3,2),
    avg_comprehension DECIMAL(3,2),
    avg_pronunciation DECIMAL(3,2),
    avg_homework_completion DECIMAL(3,2),
    avg_progress DECIMAL(3,2),
    
    -- Feedback given
    feedback_given_count INTEGER DEFAULT 0,
    avg_rating_given DECIMAL(3,2),
    
    -- Progress indicators
    improvement_trend VARCHAR(20) CHECK (improvement_trend IN ('improving', 'stable', 'declining')),
    needs_support BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(student_id, analysis_month)
);

-- 3. Feedback Notifications and Alerts

-- Feedback notification settings
CREATE TABLE feedback_notification_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Notification preferences
    email_notifications BOOLEAN DEFAULT TRUE,
    in_app_notifications BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT FALSE,
    
    -- Frequency settings
    immediate_feedback_alerts BOOLEAN DEFAULT TRUE,
    weekly_summary BOOLEAN DEFAULT TRUE,
    monthly_analytics BOOLEAN DEFAULT TRUE,
    
    -- Threshold settings
    low_rating_threshold DECIMAL(3,2) DEFAULT 3.0,
    alert_on_negative_feedback BOOLEAN DEFAULT TRUE,
    alert_on_improvement_needed BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Feedback alerts
CREATE TABLE feedback_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('low_rating', 'negative_feedback', 'improvement_needed', 'positive_feedback', 'milestone_reached')),
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    -- Related entities
    related_feedback_id UUID,
    related_feedback_type VARCHAR(50),
    related_student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    related_teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
    related_class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    
    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    is_acknowledged BOOLEAN DEFAULT FALSE,
    action_taken TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Feedback-based Recommendations

-- Teacher recommendations
CREATE TABLE teacher_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    recommended_teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    
    -- Recommendation basis
    compatibility_score DECIMAL(5,2),
    based_on_ratings BOOLEAN DEFAULT TRUE,
    based_on_learning_style BOOLEAN DEFAULT FALSE,
    based_on_schedule BOOLEAN DEFAULT FALSE,
    
    -- Recommendation details
    reason TEXT,
    confidence_level DECIMAL(3,2), -- 0.0 to 1.0
    
    -- Recommendation status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'accepted', 'declined', 'expired')),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Course recommendations
CREATE TABLE course_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    recommended_course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    
    -- Recommendation basis
    performance_based BOOLEAN DEFAULT TRUE,
    feedback_based BOOLEAN DEFAULT TRUE,
    progress_based BOOLEAN DEFAULT TRUE,
    
    -- Recommendation details
    readiness_score DECIMAL(5,2),
    expected_success_rate DECIMAL(5,2),
    reason TEXT,
    prerequisites_met BOOLEAN DEFAULT TRUE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'enrolled', 'declined', 'expired')),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Feedback Templates and Prompts

-- Feedback templates for consistency
CREATE TABLE feedback_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_name VARCHAR(255) NOT NULL,
    template_type VARCHAR(50) NOT NULL CHECK (template_type IN ('student_feedback', 'teacher_feedback', 'course_feedback')),
    
    -- Template content
    questions JSONB NOT NULL, -- Array of questions with types and options
    rating_categories JSONB, -- Categories and their descriptions
    
    -- Usage settings
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    target_user_role VARCHAR(50),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feedback prompts for automated collection
CREATE TABLE feedback_prompts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prompt_name VARCHAR(255) NOT NULL,
    trigger_event VARCHAR(100) NOT NULL, -- 'class_completed', 'course_completed', 'weekly', etc.
    
    -- Timing settings
    delay_minutes INTEGER DEFAULT 0,
    expiry_days INTEGER DEFAULT 7,
    max_reminders INTEGER DEFAULT 3,
    reminder_interval_days INTEGER DEFAULT 2,
    
    -- Target settings
    target_user_role VARCHAR(50) NOT NULL,
    template_id UUID REFERENCES feedback_templates(id) ON DELETE SET NULL,
    
    -- Conditions
    conditions JSONB, -- JSON conditions for when to trigger
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Performance Indexes

-- Student feedback indexes
CREATE INDEX idx_student_feedback_student_id ON student_feedback(student_id);
CREATE INDEX idx_student_feedback_teacher_id ON student_feedback(teacher_id);
CREATE INDEX idx_student_feedback_class_id ON student_feedback(class_id);
CREATE INDEX idx_student_feedback_created_at ON student_feedback(created_at);
CREATE INDEX idx_student_feedback_overall_rating ON student_feedback(overall_rating);
CREATE INDEX idx_student_feedback_type ON student_feedback(feedback_type);

-- Teacher feedback indexes
CREATE INDEX idx_teacher_feedback_teacher_id ON teacher_feedback(teacher_id);
CREATE INDEX idx_teacher_feedback_student_id ON teacher_feedback(student_id);
CREATE INDEX idx_teacher_feedback_class_id ON teacher_feedback(class_id);
CREATE INDEX idx_teacher_feedback_created_at ON teacher_feedback(created_at);
CREATE INDEX idx_teacher_feedback_progress_rating ON teacher_feedback(progress_rating);

-- Course feedback indexes
CREATE INDEX idx_course_feedback_student_id ON course_feedback(student_id);
CREATE INDEX idx_course_feedback_course_id ON course_feedback(course_id);
CREATE INDEX idx_course_feedback_created_at ON course_feedback(created_at);
CREATE INDEX idx_course_feedback_satisfaction ON course_feedback(overall_satisfaction);

-- Analytics indexes
CREATE INDEX idx_teacher_analytics_teacher_month ON teacher_rating_analytics(teacher_id, analysis_month);
CREATE INDEX idx_course_analytics_course_month ON course_rating_analytics(course_id, analysis_month);
CREATE INDEX idx_student_analytics_student_month ON student_performance_analytics(student_id, analysis_month);

-- Alert indexes
CREATE INDEX idx_feedback_alerts_user_id ON feedback_alerts(user_id);
CREATE INDEX idx_feedback_alerts_type ON feedback_alerts(alert_type);
CREATE INDEX idx_feedback_alerts_severity ON feedback_alerts(severity);
CREATE INDEX idx_feedback_alerts_read ON feedback_alerts(is_read);
CREATE INDEX idx_feedback_alerts_created_at ON feedback_alerts(created_at);

-- Recommendation indexes
CREATE INDEX idx_teacher_recommendations_student_id ON teacher_recommendations(student_id);
CREATE INDEX idx_teacher_recommendations_teacher_id ON teacher_recommendations(recommended_teacher_id);
CREATE INDEX idx_teacher_recommendations_status ON teacher_recommendations(status);
CREATE INDEX idx_course_recommendations_student_id ON course_recommendations(student_id);
CREATE INDEX idx_course_recommendations_course_id ON course_recommendations(recommended_course_id);

-- 7. Update Triggers

-- Apply update triggers to new tables
CREATE TRIGGER update_student_feedback_updated_at BEFORE UPDATE ON student_feedback FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_teacher_feedback_updated_at BEFORE UPDATE ON teacher_feedback FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_course_feedback_updated_at BEFORE UPDATE ON course_feedback FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_feedback_responses_updated_at BEFORE UPDATE ON feedback_responses FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_teacher_rating_analytics_updated_at BEFORE UPDATE ON teacher_rating_analytics FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_course_rating_analytics_updated_at BEFORE UPDATE ON course_rating_analytics FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_student_performance_analytics_updated_at BEFORE UPDATE ON student_performance_analytics FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_feedback_notification_settings_updated_at BEFORE UPDATE ON feedback_notification_settings FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_feedback_alerts_updated_at BEFORE UPDATE ON feedback_alerts FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_teacher_recommendations_updated_at BEFORE UPDATE ON teacher_recommendations FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_course_recommendations_updated_at BEFORE UPDATE ON course_recommendations FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_feedback_templates_updated_at BEFORE UPDATE ON feedback_templates FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_feedback_prompts_updated_at BEFORE UPDATE ON feedback_prompts FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 8. Functions for Analytics

-- Function to calculate teacher rating trends
CREATE OR REPLACE FUNCTION calculate_teacher_rating_trends()
RETURNS VOID AS $$
DECLARE
    teacher_record RECORD;
    current_avg DECIMAL(3,2);
    previous_avg DECIMAL(3,2);
    trend VARCHAR(20);
BEGIN
    FOR teacher_record IN SELECT id FROM teachers LOOP
        -- Get current month average
        SELECT AVG(overall_rating) INTO current_avg
        FROM student_feedback 
        WHERE teacher_id = teacher_record.id 
        AND created_at >= date_trunc('month', CURRENT_DATE);
        
        -- Get previous month average
        SELECT AVG(overall_rating) INTO previous_avg
        FROM student_feedback 
        WHERE teacher_id = teacher_record.id 
        AND created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
        AND created_at < date_trunc('month', CURRENT_DATE);
        
        -- Determine trend
        IF current_avg IS NULL THEN
            trend := 'stable';
        ELSIF previous_avg IS NULL THEN
            trend := 'stable';
        ELSIF current_avg > previous_avg + 0.2 THEN
            trend := 'improving';
        ELSIF current_avg < previous_avg - 0.2 THEN
            trend := 'declining';
        ELSE
            trend := 'stable';
        END IF;
        
        -- Update analytics
        INSERT INTO teacher_rating_analytics (
            teacher_id, analysis_month, avg_overall_rating, 
            previous_month_avg, rating_trend
        ) VALUES (
            teacher_record.id, date_trunc('month', CURRENT_DATE),
            current_avg, previous_avg, trend
        ) ON CONFLICT (teacher_id, analysis_month) 
        DO UPDATE SET 
            avg_overall_rating = EXCLUDED.avg_overall_rating,
            previous_month_avg = EXCLUDED.previous_month_avg,
            rating_trend = EXCLUDED.rating_trend,
            updated_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to generate feedback alerts
CREATE OR REPLACE FUNCTION generate_feedback_alerts()
RETURNS VOID AS $$
DECLARE
    feedback_record RECORD;
    teacher_record RECORD;
    threshold DECIMAL(3,2);
BEGIN
    -- Check for low ratings in recent feedback
    FOR feedback_record IN 
        SELECT sf.*, t.user_id as teacher_user_id
        FROM student_feedback sf
        JOIN teachers t ON sf.teacher_id = t.id
        WHERE sf.created_at >= CURRENT_DATE - INTERVAL '7 days'
        AND sf.overall_rating <= 3
    LOOP
        -- Get teacher's threshold setting
        SELECT COALESCE(low_rating_threshold, 3.0) INTO threshold
        FROM feedback_notification_settings
        WHERE user_id = feedback_record.teacher_user_id;
        
        IF feedback_record.overall_rating <= threshold THEN
            INSERT INTO feedback_alerts (
                user_id, alert_type, severity, title, message,
                related_feedback_id, related_feedback_type,
                related_student_id, related_teacher_id, related_class_id
            ) VALUES (
                feedback_record.teacher_user_id,
                'low_rating',
                CASE WHEN feedback_record.overall_rating <= 2 THEN 'high' ELSE 'medium' END,
                'Low Rating Alert',
                'You received a rating of ' || feedback_record.overall_rating || '/5 from a student.',
                feedback_record.id,
                'student_feedback',
                feedback_record.student_id,
                feedback_record.teacher_id,
                feedback_record.class_id
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 9. Default Data

-- Insert default feedback templates
INSERT INTO feedback_templates (template_name, template_type, questions, rating_categories, is_default, target_user_role) VALUES 
(
    'Standard Class Feedback',
    'student_feedback',
    '[
        {"id": "overall", "type": "rating", "question": "How would you rate this class overall?", "required": true},
        {"id": "teaching_quality", "type": "rating", "question": "How would you rate the teaching quality?", "required": true},
        {"id": "content", "type": "rating", "question": "How would you rate the class content?", "required": true},
        {"id": "engagement", "type": "rating", "question": "How engaging was the class?", "required": true},
        {"id": "positive", "type": "text", "question": "What did you like most about this class?", "required": false},
        {"id": "improvement", "type": "text", "question": "What could be improved?", "required": false}
    ]',
    '{
        "overall_rating": "Overall experience with the class",
        "teaching_quality_rating": "Teacher''s ability to explain concepts clearly",
        "class_content_rating": "Relevance and quality of material covered",
        "engagement_rating": "How well the class kept your attention"
    }',
    true,
    'student'
),
(
    'Student Performance Assessment',
    'teacher_feedback',
    '[
        {"id": "participation", "type": "rating", "question": "How would you rate the student''s participation?", "required": true},
        {"id": "comprehension", "type": "rating", "question": "How well did the student understand the material?", "required": true},
        {"id": "progress", "type": "rating", "question": "How would you rate the student''s progress?", "required": true},
        {"id": "strengths", "type": "text", "question": "What are the student''s main strengths?", "required": false},
        {"id": "improvements", "type": "text", "question": "What areas need improvement?", "required": false},
        {"id": "goals", "type": "text", "question": "Goals for next lesson", "required": false}
    ]',
    '{
        "participation_rating": "Student''s active involvement in class",
        "comprehension_rating": "Understanding of lesson content",
        "pronunciation_rating": "Clarity and accuracy of speech",
        "progress_rating": "Overall improvement and development"
    }',
    true,
    'teacher'
);

-- Insert default notification settings for existing users
INSERT INTO feedback_notification_settings (user_id, email_notifications, in_app_notifications)
SELECT id, true, true FROM users
ON CONFLICT (user_id) DO NOTHING;

-- Insert default feedback prompts
INSERT INTO feedback_prompts (prompt_name, trigger_event, delay_minutes, target_user_role, template_id, conditions) VALUES
(
    'Post-Class Feedback',
    'class_completed',
    30,
    'student',
    (SELECT id FROM feedback_templates WHERE template_name = 'Standard Class Feedback' LIMIT 1),
    '{"min_class_duration": 30, "class_types": ["all"]}'
),
(
    'Student Performance Review',
    'class_completed',
    60,
    'teacher',
    (SELECT id FROM feedback_templates WHERE template_name = 'Student Performance Assessment' LIMIT 1),
    '{"class_types": ["all"], "require_attendance": true}'
);